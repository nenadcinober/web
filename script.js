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

    // Hajduk Split Schedule
    const HAJDUK_SCHEDULE = [
        { date: '2026-07-09T20:00:00+02:00', opponent: 'MSK Zilina', type: 'Europa League Q1', home: true },
        { date: '2026-07-16T20:30:00+02:00', opponent: 'MSK Zilina', type: 'Europa League Q1', home: false },
        { date: '2026-08-01T17:00:00+02:00', opponent: 'NK Varazdin', type: 'League', home: false },
        { date: '2026-08-08T17:00:00+02:00', opponent: 'NK Istra 1961', type: 'League', home: true },
        { date: '2026-08-15T17:00:00+02:00', opponent: 'HNK Gorica', type: 'League', home: false },
        { date: '2026-08-22T17:00:00+02:00', opponent: 'Osijek', type: 'League', home: true },
        { date: '2026-08-29T17:00:00+02:00', opponent: 'Lokomotiva', type: 'League', home: false },
        { date: '2026-09-05T17:00:00+02:00', opponent: 'Rudes', type: 'League', home: false },
        { date: '2026-09-12T17:00:00+02:00', opponent: 'Slaven Belupo', type: 'League', home: true },
        { date: '2026-09-19T17:00:00+02:00', opponent: 'Rijeka', type: 'League', home: false },
        { date: '2026-10-10T17:00:00+02:00', opponent: 'Dinamo Zagreb', type: 'League', home: true },
        { date: '2026-10-17T17:00:00+02:00', opponent: 'NK Varazdin', type: 'League', home: true },
        { date: '2026-10-24T17:00:00+02:00', opponent: 'NK Istra 1961', type: 'League', home: false },
        { date: '2026-10-31T17:00:00+01:00', opponent: 'HNK Gorica', type: 'League', home: true },
        { date: '2026-11-07T17:00:00+01:00', opponent: 'Osijek', type: 'League', home: false },
        { date: '2026-11-21T17:00:00+01:00', opponent: 'Lokomotiva', type: 'League', home: true },
        { date: '2026-11-28T17:00:00+01:00', opponent: 'Rudes', type: 'League', home: true },
        { date: '2026-12-05T17:00:00+01:00', opponent: 'Slaven Belupo', type: 'League', home: false },
        { date: '2026-12-12T17:00:00+01:00', opponent: 'Rijeka', type: 'League', home: true },
        { date: '2026-12-19T17:00:00+01:00', opponent: 'Dinamo Zagreb', type: 'League', home: false }
    ];

    function updateHajdukCountdown() {
        const now = new Date();

        // Find next game
        const nextGame = HAJDUK_SCHEDULE.find(game => new Date(game.date) > now);

        if (!nextGame) {
            setTile('hajduk-opponent', 'hajduk-countdown', 'TBD', '');
            return;
        }

        const gameDate = new Date(nextGame.date);
        const diff = gameDate - now;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        let timeString = '';
        if (days > 0) timeString += `${days}d `;
        if (hours > 0) timeString += `${hours}h `;
        timeString += `${minutes}m`;

        const kickoff = nextGame.date.slice(11, 16); // local Croatian time from the schedule string
        setTile('hajduk-opponent', 'hajduk-countdown', `${nextGame.home ? 'vs' : '@'} ${nextGame.opponent}`, `in ${timeString} · ${kickoff} · ${nextGame.type} · ${nextGame.home ? 'home' : 'away'}`);
    }

    updateHajdukCountdown();
    setInterval(updateHajdukCountdown, 60000); // Update every minute

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
