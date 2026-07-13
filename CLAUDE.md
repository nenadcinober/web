# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal static website (cinober.com, CNAME → www.cinober.com) styled as a Linux terminal. No build system, no package.json, no tests, no framework — plain HTML/CSS/JS. To preview locally, open `index.html` or serve the directory with any static server (note: the Cloudflare Worker's CORS allows `localhost` origins, so API calls work from a local server but not from a `file://` page).

## Deployment

- **The site deploys from the `gh-pages` branch via GitHub Pages.** That is the working branch — commit and push there to publish. `master` is stale (only the initial commit) despite being the nominal default branch.
- **`worker.js` is gitignored** — it is the source of the Cloudflare Worker at `https://worker1.nenad-c1f.workers.dev` and exists only locally. It is deployed separately to Cloudflare (e.g. via the dashboard or wrangler), not through this repo. It requires a `GEMINI_API_KEY` secret in the Worker environment. Never assume changes to `worker.js` take effect by pushing to git.

## Architecture

Two halves that must stay contract-compatible:

1. **Frontend** (`index.html` + `script.js` + `styles.css`): renders a terminal prompt (`ai@cinober:~$`). Whatever the user types is sent as a free-text query to the Worker (`?source=<text>`), which answers via Gemini. Above the prompt are three live status lines:
   - S&P 500 price + 5-day change — fetched through the Worker (`?cmd=sp500`, `?cmd=sp500history`) to avoid CORS/rate limits.
   - Bitcoin price + 5-day change — fetched directly from the Binance public API (no proxy needed).
   - Hajduk Split next-match countdown — driven by the hardcoded `HAJDUK_SCHEDULE` array in `script.js`, which is updated manually each season/round.
   - UFC next-event countdown — fetched through the Worker (`?cmd=ufc`), which scrapes ufc.com/events (edge-cached 1 h) and returns `{ event, fight, timestamp, location }` for the next upcoming main card.
   - On page load, the site auto-runs a "Hajduk" query (latest news), cached 30 min in `localStorage` and at the Worker edge (`&cached=1`).

2. **Cloudflare Worker** (`worker.js`): routes on query params. `cmd=sp500`/`cmd=sp500history` proxy Cboe delayed quotes (Yahoo Finance as fallback) with edge caching. Everything else goes to the Gemini API with the `google_search` grounding tool enabled — single-word queries are expanded to "zadnje vijesti o <word>" (Croatian: "latest news about"). Model fallback chain: `gemini-3.5-flash` → `gemini-2.5-flash`; never drop grounding as a fallback (ungrounded = stale news). CORS is restricted to the cinober.com origins and localhost.

Contract coupling to watch: `script.js` reads `history[5].close` as the close 5 trading days back, so the Worker must keep returning history newest-first; the prompt HTML string is duplicated in three places in `script.js`.

## Unrelated content in the repo

- `data.js` + `images/` — a Podravina food/calorie database left over from an earlier version of the site (what README.md describes, in Croatian). Not referenced by `index.html`.
- `double-dragon/` — a standalone Phaser 3 game served as a subpage; independent of the terminal site.
