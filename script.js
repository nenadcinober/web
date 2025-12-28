document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');
    const cursor = document.getElementById('cursor');
    const mirror = document.getElementById('cursor-mirror');

    // Focus input when clicking anywhere in the terminal
    terminal.addEventListener('click', () => {
        input.focus();
    });

    // Mirror logic for cursor positioning
    function updateCursor() {
        const value = input.value;
        const selectionStart = input.selectionStart;

        // Sync mirror content
        // We separate the text into "text before cursor" and "rest"
        // But to get cursor position, we only need text before cursor inside a span?
        // Actually, we copy everything to mirror, but insert a marker at cursor pos.
        const textBefore = value.substring(0, selectionStart);
        const textAfter = value.substring(selectionStart);

        mirror.textContent = textBefore;
        const cursorSpan = document.createElement('span');
        cursorSpan.textContent = textAfter.charAt(0) || '|'; // Use a char to hold height/width if empty
        // Wait, if we use textContent, whitespace logic must match textarea (pre-wrap)
        // We append a marker element to find coordinates
        mirror.innerHTML = '';
        const preCursorNode = document.createTextNode(textBefore);
        mirror.appendChild(preCursorNode);

        const marker = document.createElement('span');
        // The marker should be invisible but take up space? 
        // No, we want the POSITION of the next char.
        // If at end of line, marker wraps.
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

        // Scroll terminal to keep cursor in view?
        // terminal.scrollTop = terminal.scrollHeight;
    }

    // Measure and update
    function triggerUpdate() {
        requestAnimationFrame(updateCursor);
    }

    ['input', 'click', 'keyup', 'keydown', 'focus', 'blur', 'scroll', 'resize'].forEach(event => {
        input.addEventListener(event, triggerUpdate);
        window.addEventListener(event, triggerUpdate);
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
    setInterval(fetchBTCPrice, 10000); // 10s

    // Initial update
    triggerUpdate();
});
