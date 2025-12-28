document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');

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
});
