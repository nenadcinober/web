document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ask-form');
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');

    // Helper to escape HTML in user input to prevent XSS in the query echo
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Status bar clock
    const clock = document.getElementById('clock');
    function updateClock() {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 30000);

    // scroll=true positions the element at the top of the viewport — used for
    // user-typed queries so the answer unfolds below. The on-load news must NOT
    // scroll, or the tiles get pushed out of view before the user sees them.
    function addOutput(html, className = '', scroll = false) {
        const div = document.createElement('div');
        div.innerHTML = html;
        if (className) {
            div.classList.add(className);
        }
        output.appendChild(div);
        if (scroll) div.scrollIntoView({ block: 'start' });
        return div;
    }

    // The WP sliding-dots progress indicator
    function addLoading() {
        const div = document.createElement('div');
        div.className = 'progress';
        div.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
        output.appendChild(div);
        return div;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const command = input.value;
        input.value = '';

        if (command.trim() === '') return;

        if (command.trim().toLowerCase() === 'clear') {
            output.innerHTML = '';
            return;
        }

        // Each query replaces the previous output (on-load news or earlier answer)
        output.innerHTML = '';

        // Echo the query, metro-style: lowercase, accent color
        addOutput(escapeHtml(command.toLowerCase()), 'query', true);
        await processCommand(command);
    });

    async function processCommand(command) {
        const loadingEl = addLoading();

        try {
            const response = await fetch(`https://worker1.nenad-c1f.workers.dev/?source=${encodeURIComponent(command)}`);

            loadingEl.remove();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            addOutput(text, 'response');
        } catch (error) {
            if (loadingEl.parentNode) loadingEl.remove();
            addOutput(`error: ${error.message}`, 'response');
        }
    }

    function formatPct5d(pct) {
        if (pct === null || Number.isNaN(pct)) return '';
        const sign = pct >= 0 ? '+' : '';
        return `${sign}${pct.toFixed(2)}% in 5 days`;
    }

    async function fetchGoogleSP500() {
        // Use your Cloudflare Worker as a proxy for stock data
        // The worker will fetch from Yahoo Finance without CORS issues
        const url = 'https://worker1.nenad-c1f.workers.dev/?cmd=sp500';

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Worker error');
            const data = await response.json();
            const price = parseFloat(data.price || data.regularMarketPrice);
            if (!price || isNaN(price)) throw new Error('Invalid price');
            return price;
        } catch (error) {
            console.error('Failed to fetch S&P 500:', error.message);
            throw error;
        }
    }

    async function fetchSP500Historical() {
        // Get historical data from worker
        const url = 'https://worker1.nenad-c1f.workers.dev/?cmd=sp500history';

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Worker history error');
            const data = await response.json();
            return data.history || [];
        } catch (error) {
            return [];
        }
    }

    function formatCountdown(diffMs) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let timeString = '';
        if (days > 0) timeString += `${days}d `;
        if (hours > 0) timeString += `${hours}h `;
        return timeString + `${minutes}m`;
    }

    function setTile(valueId, changeId, value, change) {
        document.getElementById(valueId).textContent = value;
        document.getElementById(changeId).textContent = change;
    }

    async function fetchMarketQuotes() {
        await Promise.all([
            (async () => {
                try {
                    const [btcTickerRes, btcKlinesRes] = await Promise.all([
                        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
                        fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=8')
                    ]);

                    if (!btcTickerRes.ok) throw new Error('BTC ticker');
                    if (!btcKlinesRes.ok) throw new Error('BTC klines');

                    const btcTicker = await btcTickerRes.json();
                    const btcKlines = await btcKlinesRes.json();
                    const btcNow = parseFloat(btcTicker.price);
                    let btcPct5d = null;
                    if (Array.isArray(btcKlines) && btcKlines.length >= 6) {
                        const close5dBack = parseFloat(btcKlines[btcKlines.length - 6][4]);
                        if (close5dBack > 0) {
                            btcPct5d = ((btcNow - close5dBack) / close5dBack) * 100;
                        }
                    }
                    const btcPriceStr = btcNow.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });
                    setTile('btc-value', 'btc-change', btcPriceStr, formatPct5d(btcPct5d));
                } catch (error) {
                    setTile('btc-value', 'btc-change', '—', 'unavailable');
                }
            })(),
            (async () => {
                try {
                    const currentSp = await fetchGoogleSP500();
                    let spPct5d = null;

                    // Try to get historical data for 5-day change
                    const history = await fetchSP500Historical();
                    if (Array.isArray(history) && history.length >= 6) {
                        const close5dBack = parseFloat(history[5].close);
                        if (close5dBack > 0) {
                            spPct5d = ((currentSp - close5dBack) / close5dBack) * 100;
                        }
                    }

                    if (!currentSp) {
                        setTile('sp500-value', 'sp500-change', '—', 'unavailable');
                    } else {
                        const spStr = currentSp.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                        setTile('sp500-value', 'sp500-change', spStr, formatPct5d(spPct5d));
                    }
                } catch (error) {
                    setTile('sp500-value', 'sp500-change', '—', 'unavailable');
                }
            })()
        ]);
    }

    fetchMarketQuotes();
    setInterval(fetchMarketQuotes, 10000);

    // Hajduk next match — the Worker proxies TheSportsDB (?cmd=hajduk, edge-cached
    // 1h) and returns { opponent, timestamp, home, type, kickoff }. Fetched once
    // per page load; only the countdown re-renders every minute.
    let hajdukGame = null;

    function renderHajdukTile() {
        if (!hajdukGame) return;
        const start = new Date(hajdukGame.timestamp * 1000);
        const diff = start - new Date();
        const detail = [
            diff > 0 ? `in ${formatCountdown(diff)}` : 'live now',
            hajdukGame.kickoff,
            hajdukGame.type,
            hajdukGame.home ? 'home' : 'away'
        ].filter(Boolean).join(' · ');
        setTile('hajduk-opponent', 'hajduk-countdown', `${hajdukGame.home ? 'vs' : '@'} ${hajdukGame.opponent}`, detail);
    }

    async function initHajdukTile() {
        try {
            const response = await fetch('https://worker1.nenad-c1f.workers.dev/?cmd=hajduk');
            if (!response.ok) throw new Error('Worker error');
            const data = await response.json();
            if (!data || !data.timestamp || !data.opponent) throw new Error('No upcoming game');
            hajdukGame = data;
            renderHajdukTile();
            setInterval(renderHajdukTile, 60000);
        } catch (error) {
            setTile('hajduk-opponent', 'hajduk-countdown', 'TBD', '');
        }
    }

    initHajdukTile();

    // UFC next event — the Worker scrapes ufc.com/events (?cmd=ufc, edge-cached
    // 1h) and returns { event, fight, timestamp, location }. Fetched once per
    // page load; only the countdown re-renders every minute.
    let ufcEvent = null;

    function renderUfcTile() {
        if (!ufcEvent) return;
        const start = new Date(ufcEvent.timestamp * 1000);
        const diff = start - new Date();
        const when = start.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        const detail = [
            diff > 0 ? `in ${formatCountdown(diff)}` : 'live now',
            when,
            ufcEvent.event,
            ufcEvent.location
        ].filter(Boolean).join(' · ');
        setTile('ufc-fight', 'ufc-countdown', ufcEvent.fight, detail);
    }

    async function initUfcTile() {
        try {
            const response = await fetch('https://worker1.nenad-c1f.workers.dev/?cmd=ufc');
            if (!response.ok) throw new Error('Worker error');
            const data = await response.json();
            if (!data || !data.timestamp || !data.fight) throw new Error('No upcoming event');
            ufcEvent = data;
            renderUfcTile();
            setInterval(renderUfcTile, 60000);
        } catch (error) {
            setTile('ufc-fight', 'ufc-countdown', '—', 'unavailable');
        }
    }

    initUfcTile();

    // On page load, show Hajduk news as if the user typed "hajduk".
    // Cached in localStorage for 30 min; the worker also caches the Gemini
    // answer at the edge, so a cold load is still cheap and fast.
    const HAJDUK_NEWS_CACHE_KEY = 'hajduk-news';
    const HAJDUK_NEWS_TTL = 30 * 60 * 1000;

    async function showHajdukNewsOnLoad() {
        addOutput('hajduk', 'query');

        try {
            const cached = JSON.parse(localStorage.getItem(HAJDUK_NEWS_CACHE_KEY));
            if (cached && cached.text && Date.now() - cached.time < HAJDUK_NEWS_TTL) {
                addOutput(cached.text, 'response');
                return;
            }
        } catch (_) { /* corrupt/missing cache, fall through to fetch */ }

        const loadingEl = addLoading();

        try {
            const response = await fetch('https://worker1.nenad-c1f.workers.dev/?source=Hajduk&cached=1');
            loadingEl.remove();
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            addOutput(text, 'response');
            try {
                localStorage.setItem(HAJDUK_NEWS_CACHE_KEY, JSON.stringify({ time: Date.now(), text }));
            } catch (_) { /* storage full/disabled — still displayed */ }
        } catch (error) {
            if (loadingEl.parentNode) loadingEl.remove();
            addOutput(`error: ${error.message}`, 'response');
        }
    }

    showHajdukNewsOnLoad();
});
