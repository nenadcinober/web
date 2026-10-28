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
   - Hajduk Split next-match countdown — fetched through the Worker (`?cmd=hajduk`), which proxies TheSportsDB's free `eventsnext` API (team 134019, edge-cached 1 h) and returns `{ opponent, timestamp, home, type, kickoff }` for the next upcoming game.
   - UFC next-event countdown — fetched through the Worker (`?cmd=ufc`), which scrapes ufc.com/events (edge-cached 1 h) and returns `{ event, fight, timestamp, location }` for the next upcoming main card.
   - On page load, the site auto-runs a "Hajduk" query (latest news), cached 30 min in `localStorage` and at the Worker edge (`&cached=1`).

2. **Cloudflare Worker** (`worker.js`): routes on query params. `cmd=sp500`/`cmd=sp500history` proxy Cboe delayed quotes (Yahoo Finance as fallback) with edge caching. Everything else goes to the Gemini API — single-word queries are expanded to "zadnje vijesti o <word>" (Croatian: "latest news about"). Gemini 3.x models get no `google_search` grounding on a free-tier key (429), so the Worker grounds them by hand: it fetches Google News RSS for the raw query (edge-cached 15 min) and puts the headlines in the prompt, trying `gemini-3.8-flash` → `3.7-flash` → `3.6-flash` → `3.5-flash` → `3.5-flash-lite`. If no headlines come back or all of those fail, it falls back to `gemini-2.5-flash` → `2.5-flash-lite` with the built-in `google_search` tool (free, 500/day). Never send an ungrounded request as a fallback (ungrounded = stale news). The model that answered is in the `X-Model` response header. CORS is restricted to the cinober.com origins and localhost.

Contract coupling to watch: `script.js` reads `history[5].close` as the close 5 trading days back, so the Worker must keep returning history newest-first; the prompt HTML string is duplicated in three places in `script.js`.

## Unrelated content in the repo

- `data.js` + `images/` — a Podravina food/calorie database left over from an earlier version of the site (what README.md describes, in Croatian). Not referenced by `index.html`.
- `double-dragon/` — a standalone Phaser 3 game served as a subpage; independent of the terminal site.
- `monkey/` — "Tajna Gruntovečke Ade", a Monkey Island-style point-and-click adventure (Phaser 3, 1024x768) starring Draž. `engine.js` is the SCUMM-like engine (nine verbs, inventory, dialogue, the insult-duel "zafrkancija"); `data.js` holds all rooms, hotspots and story scripts, which drive the engine through the global `G`. All art is procedural (`art.js`, `backgrounds.js`). Progress autosaves to `localStorage` (`monkey.save.v1`).
- `volley/` — "Bubble Volley", a Phaser 3 blob-volleyball game (vs CPU, local 2P, online). Online play is peer-to-peer WebRTC via PeerJS and its free public signaling server (no backend of ours): everyone tries to claim one well-known lobby peer id, the holder hosts and runs the authoritative `Sim` (`sim.js`), the guest sends inputs and smooths host snapshots. `?room=<code>` makes a private lobby.
