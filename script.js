document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');
    const cursor = document.getElementById('cursor');
    const mirror = document.getElementById('cursor-mirror');
    const promptEl = document.querySelector('.prompt');

    // Helper to escape HTML in user input to prevent XSS in the command echo
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Update Text Indent based on prompt width
    function updateLayout() {
        const promptWidth = promptEl.getBoundingClientRect().width;
        // Add a small gap (e.g. 10px from CSS margin-right which we removed, so add strictly here)
        const indent = promptWidth + 10;

        input.style.textIndent = `${indent}px`;
        mirror.style.textIndent = `${indent}px`;

        // Update char width
        charWidth = getCharWidth();
        updateCursor();
    }

    // Helper to measure character width
    let charWidth = 0;
    function getCharWidth() {
        const span = document.createElement('span');
        span.textContent = 'M';
        span.style.fontFamily = getComputedStyle(input).fontFamily;
        span.style.fontSize = getComputedStyle(input).fontSize;
        span.style.fontWeight = getComputedStyle(input).fontWeight;
        span.style.position = 'absolute';
        span.style.visibility = 'hidden';
        document.body.appendChild(span);
        const width = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        return width;
    }

    // Mirror logic for cursor positioning
    function updateCursor() {
        const value = input.value;
        const selectionStart = input.selectionStart;

        // Sync mirror content
        const textBefore = value.substring(0, selectionStart);
        const textAfter = value.substring(selectionStart);

        mirror.textContent = textBefore;

        // We need to exactly mimic how the browser renders the caret position
        mirror.innerHTML = '';
        const preCursorNode = document.createTextNode(textBefore);
        mirror.appendChild(preCursorNode);

        const marker = document.createElement('span');
        marker.textContent = '|';
        mirror.appendChild(marker);

        // Position
        const rect = marker.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        // Calculate relative position
        const top = rect.top - mirrorRect.top;
        const left = rect.left - mirrorRect.left;

        cursor.style.transform = `translate(${left}px, ${top}px)`;

        // Auto-expand height
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';

        // Ensure cursor size matches char
        // We can measure marker width
        const charW = rect.width;
        cursor.style.width = charW + 'px';
    }

    // Measure and update
    function triggerUpdate() {
        requestAnimationFrame(updateCursor);
    }

    ['input', 'click', 'keyup', 'keydown', 'focus', 'blur', 'scroll', 'resize'].forEach(event => {
        input.addEventListener(event, triggerUpdate);
        window.addEventListener(event, triggerUpdate);
    });

    // Resize observer/event for layout
    window.addEventListener('resize', updateLayout);
    // Initial layout
    // Delay slightly to ensure fonts loaded
    setTimeout(updateLayout, 100);

    // Focus input when clicking anywhere in the terminal
    terminal.addEventListener('click', () => {
        input.focus();
    });


    // Helper to scroll to bottom strongly
    function scrollToBottom() {
        terminal.scrollTop = terminal.scrollHeight;
        // Double check after a delay for mobile layouts that resize/keyboard shifts
        setTimeout(() => {
            terminal.scrollTop = terminal.scrollHeight;
        }, 50);
    }

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Allow newlines if shift+enter? Or just prevent default if we want single-line cmd?
                // Terminal usually executes on Enter.
                // We should prevent default default new line and execute.
                // For textarea, Shift+Enter usually inserts a newline.
                // If we want to allow newlines in the command, we don't preventDefault here.
                // If we want Shift+Enter to also execute, we'd need different logic.
                // For now, let's assume Enter executes, Shift+Enter inserts newline.
                // The instruction implies Enter executes, so we prevent default for Enter.
                // If Shift+Enter is pressed, we let the default behavior (newline) happen.
                // The provided code block for Shift+Enter is identical to Enter, suggesting
                // Shift+Enter should also execute. Let's make them both execute.
                e.preventDefault();
                const command = input.value;
                input.value = '';
                input.style.height = 'auto'; // Reset height

                // Add command to output with colored prompt
                const promptHTML = `<span class="prompt"><span class="user">ai@cinober</span><span class="white">:</span><span class="blue">~</span><span class="white">$</span></span>`;
                addOutput(`${promptHTML} <span class="command">${escapeHtml(command)}</span>`, 'command-line');

                if (command.trim() !== '') {
                    await processCommand(command);
                }

                triggerUpdate();
                scrollToBottom();

            } else {
                e.preventDefault();
                const command = input.value;
                input.value = '';
                input.style.height = 'auto'; // Reset height

                // Add command to output with colored prompt
                const promptHTML = `<span class="prompt"><span class="user">ai@cinober</span><span class="white">:</span><span class="blue">~</span><span class="white">$</span></span>`;
                addOutput(`${promptHTML} <span class="command">${escapeHtml(command)}</span>`, 'command-line');

                if (command.trim() !== '') {
                    await processCommand(command);
                }

                triggerUpdate();
                scrollToBottom();
            }
        }
    });

    function addOutput(html, className = '') {
        const div = document.createElement('div');
        div.innerHTML = html;
        if (className) {
            div.classList.add(className);
        }
        output.appendChild(div);
        scrollToBottom();
    }



    async function processCommand(command) {
        if (command.toLowerCase() === 'clear') {
            output.innerHTML = '';
            return;
        }

        // Show processing indicator
        const loadingId = 'loading-' + Date.now();
        addOutput('<span class="loading">Processing...</span>', 'loading-line');
        const loadingEl = output.lastElementChild;

        try {
            const response = await fetch(`https://worker1.nenad-c1f.workers.dev/?source=${encodeURIComponent(command)}`);

            if (loadingEl) loadingEl.remove();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            addOutput(text, 'response');
        } catch (error) {
            if (loadingEl && loadingEl.parentNode) loadingEl.remove();
            addOutput(`Error: ${error.message}`, 'response');
        }
    }

    function formatPct5d(pct) {
        if (pct === null || Number.isNaN(pct)) return '';
        const sign = pct >= 0 ? '+' : '';
        return ` (${sign}${pct.toFixed(2)}% vs 5d ago)`;
    }

    async function fetchGoogleSP500() {
        // Use Yahoo Finance API with proper headers for browser requests
        const url = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/^GSPC?modules=price';
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok) throw new Error('Yahoo Finance');
            const data = await response.json();
            const price = data.quoteSummary.result[0].price.regularMarketPrice.raw;
            return parseFloat(price);
        } catch (error) {
            console.error('Failed to fetch S&P 500:', error.message);
            throw error;
        }
    }

    async function fetchSP500Historical() {
        // Get historical data for 5-day change using Yahoo Finance
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^GSPC?interval=1d&range=1mo';
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok) throw new Error('Yahoo Finance history');
            const data = await response.json();
            const closes = data.chart.result[0].indicators.quote[0].close;
            // Convert to expected format with close property
            return closes.map(close => ({ close })).reverse();
        } catch (error) {
            // Silent fail - we can still show current price
            return [];
        }
    }

    async function fetchMarketQuotes() {
        const sp500Display = document.getElementById('sp500-display');
        const btcDisplay = document.getElementById('btc-display');

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
                        minimumFractionDigits: 2
                    });
                    btcDisplay.textContent = `Bitcoin Price: ${btcPriceStr}${formatPct5d(btcPct5d)}`;
                } catch (error) {
                    btcDisplay.textContent = 'Bitcoin Price: Unavailable';
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
                        sp500Display.textContent = 'S&P 500: Unavailable';
                    } else {
                        const spStr = currentSp.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                        sp500Display.textContent = `S&P 500: ${spStr}${formatPct5d(spPct5d)}`;
                    }
                } catch (error) {
                    sp500Display.textContent = 'S&P 500: Unavailable';
                }
            })()
        ]);
    }

    fetchMarketQuotes();
    setInterval(fetchMarketQuotes, 10000);

    // Hajduk Split Schedule
    const HAJDUK_SCHEDULE = [
        { date: '2026-01-11T13:00:00Z', opponent: 'NK Croatia Zmijavci', type: 'Friendly' },
        { date: '2026-01-14T15:00:00+01:00', opponent: 'NK Posusje', type: 'Friendly' },
        { date: '2026-01-17T15:00:00+01:00', opponent: 'NK Siroki Brijeg', type: 'Friendly' },
        { date: '2026-01-25T15:00:00+01:00', opponent: 'NK Istra 1961', type: 'League' },
        { date: '2026-01-31T15:00:00+01:00', opponent: 'HNK Gorica', type: 'League' },
        { date: '2026-02-07T17:00:00+01:00', opponent: 'Slaven Belupo', type: 'League' },
        { date: '2026-02-15T17:00:00+01:00', opponent: 'Osijek', type: 'League' },
        { date: '2026-02-22T17:00:00+01:00', opponent: 'Rijeka', type: 'League' },
        { date: '2026-02-28T17:00:00+01:00', opponent: 'NK Varazdin', type: 'League' },
        { date: '2026-03-04T17:00:00+01:00', opponent: 'HNK Rijeka', type: 'Cup' },
        { date: '2026-03-08T17:00:00+01:00', opponent: 'Dinamo Zagreb', type: 'League' },
        { date: '2026-03-15T17:00:00+01:00', opponent: 'Lokomotiva', type: 'League' },
        { date: '2026-03-21T17:00:00+01:00', opponent: 'Vukovar 1991', type: 'League' },
        { date: '2026-04-07T17:00:00+02:00', opponent: 'NK Istra 1961', type: 'League' },
        { date: '2026-04-12T17:30:00+02:00', opponent: 'HNK Gorica', type: 'League' },
        { date: '2026-04-17T16:45:00+02:00', opponent: 'Slaven Belupo', type: 'League' },
        { date: '2026-04-21T17:45:00+02:00', opponent: 'Osijek', type: 'League' },
        { date: '2026-04-26T15:00:00+02:00', opponent: 'Rijeka', type: 'League' },
        { date: '2026-05-02T17:00:00+02:00', opponent: 'NK Varazdin', type: 'League' },
        { date: '2026-05-09T17:00:00+02:00', opponent: 'Dinamo Zagreb', type: 'League' },
        { date: '2026-05-16T17:00:00+02:00', opponent: 'Lokomotiva', type: 'League' },
        { date: '2026-05-23T17:00:00+02:00', opponent: 'Vukovar 1991', type: 'League' }
    ];

    function updateHajdukCountdown() {
        const display = document.getElementById('hajduk-display');
        const now = new Date();

        // Find next game
        const nextGame = HAJDUK_SCHEDULE.find(game => new Date(game.date) > now);

        if (!nextGame) {
            display.textContent = 'Next Hajduk Match: TBD';
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

        display.textContent = `Next Match: Hajduk vs ${nextGame.opponent} (${timeString})`;
    }

    updateHajdukCountdown();
    setInterval(updateHajdukCountdown, 60000); // Update every minute

    // Initial update
    triggerUpdate();
});
