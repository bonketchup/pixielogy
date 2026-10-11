# Pixielogy 🪄

Runs as a Cloudflare Worker: the app lives in `public/`, Mochi's AI endpoint in `src/worker.js`.

```
public/index.html   the app
src/worker.js       serves the app + /api/ai (keeps your Gemini key secret)
wrangler.jsonc      tells Cloudflare how to deploy it
```

## Setup
1. Replace everything in your GitHub repo with these files (delete the old root `index.html` and `functions` folder).
2. Cloudflare redeploys automatically from GitHub.
3. Settings > Variables and Secrets: add `GEMINI_API_KEY` as a **Secret**.
4. Optional daily limit: create a KV namespace, paste its ID into `wrangler.jsonc` (see the comment there), commit.

Change model: add a variable `GEMINI_MODEL`. Default is `gemini-flash-latest`.
Free-tier note: Google may use free-tier inputs to improve its models.
