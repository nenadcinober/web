document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');
    const cursor = document.getElementById('cursor');

    // Helper to measure character width
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

    let charWidth = getCharWidth(); // Initial measure

    // Update cursor position
    function updateCursor() {
        const textWidth = input.selectionStart * charWidth;
        // Adjust for scrollLeft if input scrolls
        const leftPos = textWidth - input.scrollLeft;

        cursor.style.transform = `translateX(${leftPos}px)`;
        cursor.style.width = `${charWidth}px`;
        cursor.style.height = getComputedStyle(input).height;
        cursor.style.top = '0';

        // Hide cursor if it's scrolled out of view (simple check)
        // Ideally we want to clip it, but overflow:hidden on container handles that.
    }

    // Update char width on resize
    window.addEventListener('resize', () => {
        charWidth = getCharWidth();
        updateCursor();
    });

    // Events to trigger cursor update
    ['input', 'click', 'keyup', 'keydown', 'focus', 'blur', 'scroll'].forEach(event => {
        input.addEventListener(event, () => {
            // Defer slightly to ensure selectionStart is updated
            requestAnimationFrame(updateCursor);
        });
    });

    // Also update when we manually set value
    const originalsetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    Object.defineProperty(input, 'value', {
        set: function (val) {
            originalsetter.call(this, val);
            requestAnimationFrame(updateCursor);
        }
    });

    // Focus input when clicking anywhere in the terminal
    terminal.addEventListener('click', () => {
        input.focus();
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const command = input.value;
            input.value = '';

            // Add command to output with colored prompt
            const promptHTML = `<span class="prompt"><span class="user">ai@cinober</span><span class="white">:</span><span class="blue">~</span><span class="white">$</span></span>`;
            addOutput(`${promptHTML} <span class="command">${escapeHtml(command)}</span>`, 'command-line');

            if (command.trim() !== '') {
                await processCommand(command);
            }

            // Scroll to bottom
            terminal.scrollTop = terminal.scrollHeight;
        }
    });

    function addOutput(html, className = '') {
        const div = document.createElement('div');
        div.innerHTML = html;
        if (className) {
            div.classList.add(className);
        }
        output.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
    }

    // Helper to escape HTML in user input to prevent XSS in the command echo
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

            // Remove processing indicator
            if (loadingEl) {
                loadingEl.remove();
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();

            // We assume the response might contain HTML or markdown we want to render roughly as is, 
            // but usually terminal responses are text. If the worker returns HTML, we might need to sanitize.
            // For now, let's treat it as text but allow rendering if it's safe, 
            // OR escape it if we want strict text. 
            // The prompt implied "response should be displayed", let's dump it as textContent mostly,
            // but the previous code used innerHTML. Let's use innerHTML for flexibility if the worker returns formatted HTML.
            addOutput(text, 'response');
        } catch (error) {
            // Remove processing indicator if still there
            if (loadingEl && loadingEl.parentNode) {
                loadingEl.remove();
            }
            addOutput(`Error: ${error.message}`, 'response');
        }
    }

    // BTC Price Fetcher
    async function fetchBTCPrice() {
        const btcDisplay = document.getElementById('btc-display');
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
            if (!response.ok) throw new Error('Failed to fetch price');
            const data = await response.json();
            const price = parseFloat(data.price).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            });
            btcDisplay.textContent = `Bitcoin Price: ${price}`;
        } catch (error) {
            btcDisplay.textContent = 'Bitcoin Price: Unavailable';
        }
    }

    // Initial fetch and interval
    fetchBTCPrice();
    setInterval(fetchBTCPrice, 10000); // Update every 10s
});
