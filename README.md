# Pixielogy 🪄

Your birth chart, read by tiny magical animals. Mochi (the wizard hamster) is powered by Google Gemini.

## What's in here

```
index.html            the whole app
functions/api/ai.js   tiny backend that keeps your Gemini key secret
```

Keep this exact folder structure. Cloudflare looks for the `functions` folder to create the `/api/ai` endpoint.

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com and sign in with your Google account.
2. Click **Get API key**, then create a key.
3. Copy it somewhere safe. **Never paste it into index.html or commit it to GitHub.**

## 2. Put the code on GitHub

1. Create a new repository, e.g. `pixielogy`.
2. Upload `index.html`, `README.md`, `.gitignore` and the `functions` folder (with `api/ai.js` inside).

## 3. Deploy on Cloudflare Pages

1. In Cloudflare, go to **Workers & Pages**, create a new **Pages** project and connect it to your GitHub repo.
2. Build settings: no framework, leave the build command empty, output directory `/`.
3. Deploy.

## 4. Add your secret key

1. Open your Pages project, then **Settings → Variables and Secrets**.
2. Add `GEMINI_API_KEY` as a **Secret** and paste your key.
3. Redeploy (Deployments → retry the latest one) so the key is picked up.

Mochi should now work on your `*.pages.dev` link.

## 5. (Recommended) Daily limit per visitor

This stops one person from burning through your free quota.

1. In Cloudflare, go to **Storage & Databases → KV** and create a namespace, e.g. `pixielogy-rate`.
2. In your Pages project, under **Settings → Bindings**, add a KV binding named `RATE` pointing to it.
3. Optional: add a variable `DAILY_LIMIT` (default is 40 AI requests per visitor per day).
4. Redeploy.

## 6. (Optional) Your own domain

In your Pages project, go to **Custom domains** and add e.g. `pixielogy.com`.

## Changing the model

The default is `gemini-flash-latest`, which always points at Google's current Flash model. To pin a specific model, add a variable `GEMINI_MODEL` (e.g. `gemini-3-flash-preview`) and redeploy.

## Good to know

- **Free tier limits:** Google caps free requests per minute and per day. When the cap is hit, Mochi says she needs a breather.
- **Privacy:** on Gemini's free tier, Google may use what's sent to improve its models. Charts and chats go to Google when someone uses Mochi. Switching to a paid Gemini plan changes this.
- **Saved charts** live in each visitor's browser (no account needed). Clearing browser data deletes them.

## Testing locally (optional)

```
npm install -g wrangler
echo "GEMINI_API_KEY=your-key-here" > .dev.vars
wrangler pages dev .
```

Then open the local link it prints. `.dev.vars` is in `.gitignore` so your key never gets committed.
