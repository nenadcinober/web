---
name: verify
description: How to run and verify the cinober.com static site locally with a headless browser.
---

# Verifying changes to the cinober.com site

Static site, no build step. The Cloudflare Worker backend
(`worker1.nenad-c1f.workers.dev`) allows any `localhost` origin in CORS, so all
API calls work from a local server — but NOT from a `file://` page.

## Serve

```bash
python -m http.server 8123   # run in background from repo root
```

## Drive

No Playwright in the repo. Install it in the scratchpad (~1 min):

```bash
mkdir pw && cd pw && npm init -y && npm install playwright && npx playwright install chromium
```

Then drive `http://localhost:8123/` with a Playwright script. Flows worth checking:

- Live tiles populate: `#sp500-value`, `#btc-value`, `#hajduk-opponent` (worker + Binance).
- On page load a "hajduk" query auto-runs; wait up to 60s for `#output .response`
  (Gemini can be slow on a cold edge cache; localStorage caches it 30 min per browser profile).
- Type a query in `#command-input` + Enter → `.query` echo (HTML-escaped), `.progress`
  dots while loading, then a `.response`.
- `clear` empties the output; empty submit is a no-op.
- Screenshot at ~400px (phone) and ~1280px (desktop) widths.

Gotcha: each Playwright context has fresh localStorage, so the on-load news always
hits the worker — the worker's edge cache makes repeat runs fast.
