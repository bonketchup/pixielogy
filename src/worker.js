// Pixielogy Worker: serves the app from /public and runs Mochi's AI endpoint at /api/ai.
// Secrets/variables (Cloudflare > Workers & Pages > pixielogy > Settings > Variables and Secrets):
//   GEMINI_API_KEY  (required, add as a Secret)
//   GEMINI_MODEL    (optional, default "gemini-flash-latest")
//   DAILY_LIMIT     (optional, default 40; only used if the RATE KV binding is set in wrangler.jsonc)
const MAX_CHARS = 120000;   // total characters a single request may send
const MAX_TURNS = 40;       // chat turns kept per request

const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

async function handleAI({ request, env }) {
  if (!env.GEMINI_API_KEY) return json({ code: 'not_configured' }, 500);

  // Only accept calls from this site
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ code: 'forbidden' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ code: 'invalid_request' }, 400); }
  let msgs = Array.isArray(body?.messages) ? body.messages : null;
  if (!msgs || !msgs.length) return json({ code: 'invalid_request' }, 400);
  msgs = msgs.filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'));
  // keep the first message (instructions + chart) and the most recent turns
  if (msgs.length > MAX_TURNS) msgs = [msgs[0], ...msgs.slice(-(MAX_TURNS - 1))];
  const total = msgs.reduce((n, m) => n + m.content.length, 0);
  if (total > MAX_CHARS) return json({ code: 'prompt_too_large' }, 413);

  // Per-visitor daily limit (only if a KV namespace is bound as RATE)
  if (env.RATE) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const key = `${ip}:${new Date().toISOString().slice(0, 10)}`;
    const used = parseInt((await env.RATE.get(key)) || '0', 10);
    const limit = parseInt(env.DAILY_LIMIT || '40', 10);
    if (used >= limit) return json({ code: 'daily_limit' }, 429);
    await env.RATE.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 });
  }

  // Gemini wants alternating user/model turns, so merge any back-to-back same-role messages
  const contents = [];
  for (const m of msgs) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += '\n\n' + m.content;
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  if (contents[contents.length - 1].role !== 'user') return json({ code: 'invalid_request' }, 400);

  const model = env.GEMINI_MODEL || 'gemini-flash-latest';
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.9, maxOutputTokens: 4096 } })
  });
  if (!upstream.ok) {
    const code = upstream.status === 429 ? 'rate_limited' : upstream.status === 400 ? 'invalid_request' : 'upstream_error';
    console.log('Gemini error', upstream.status, (await upstream.text()).slice(0, 500));
    return json({ code }, upstream.status === 429 ? 429 : 502);
  }

  // Turn Gemini's SSE stream into a plain text stream
  const enc = new TextEncoder(), dec = new TextDecoder();
  let buf = '';
  const stream = upstream.body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
          const evt = JSON.parse(line.slice(5));
          const parts = evt?.candidates?.[0]?.content?.parts || [];
          const text = parts.filter(p => !p.thought).map(p => p.text || '').join('');
          if (text) ctl.enqueue(enc.encode(text));
        } catch { /* ignore partial lines */ }
      }
    }
  }));
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ai') {
      if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405);
      return handleAI({ request, env });
    }
    return env.ASSETS.fetch(request);
  }
};
