// Synthesised sound effects and a small procedural music loop (WebAudio, no files).
const Sfx = (() => {
    let ctx = null, master = null, musicGain = null, musicTimer = null;
    let enabled = true, musicOn = true;
    try { enabled = localStorage.getItem('heroes_sfx') !== '0'; musicOn = localStorage.getItem('heroes_music') !== '0'; } catch (e) { }
    function ensure() {
        if (ctx) return ctx;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
            musicGain = ctx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(ctx.destination);
        } catch (e) { ctx = null; }
        return ctx;
    }
    function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0, out) {
        if (!ensure()) return;
        const t = ctx.currentTime + delay;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol = 0.3, delay = 0, hp = 800) {
        if (!ensure()) return;
        const t = ctx.currentTime + delay;
        const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = hp;
        s.buffer = buf; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }
    const sounds = {
        click: () => tone(660, 0.05, 'square', 0.12),
        coin: () => { tone(988, 0.08, 'square', 0.15); tone(1319, 0.2, 'square', 0.15, 0, 0.07); },
        pickup: () => { tone(523, 0.08, 'triangle', 0.3); tone(659, 0.08, 'triangle', 0.3, 0, 0.07); tone(784, 0.18, 'triangle', 0.3, 0, 0.14); },
        build: () => { noise(0.08, 0.3, 0, 400); noise(0.08, 0.3, 0.15, 400); tone(392, 0.25, 'triangle', 0.25, 0, 0.3); tone(523, 0.35, 'triangle', 0.25, 0, 0.42); },
        step: () => noise(0.04, 0.06, 0, 1800),
        hit: () => { noise(0.12, 0.35, 0, 600); tone(140, 0.12, 'sawtooth', 0.2, -60); },
        shoot: () => { noise(0.15, 0.2, 0, 3000); tone(900, 0.12, 'triangle', 0.1, -500); },
        death: () => { tone(220, 0.4, 'sawtooth', 0.2, -150); noise(0.25, 0.15, 0.05, 300); },
        spell: () => { for (let i = 0; i < 6; i++) tone(600 + i * 140, 0.18, 'sine', 0.15, 300, i * 0.04); },
        fire: () => { noise(0.5, 0.4, 0, 200); tone(120, 0.5, 'sawtooth', 0.15, -60); },
        levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.3, 0, i * 0.1)),
        victory: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.3, 0, i * 0.13)),
        defeat: () => [392, 370, 349, 262].forEach((f, i) => tone(f, 0.5, 'triangle', 0.3, 0, i * 0.25)),
        week: () => [523, 523, 784, 659, 784].forEach((f, i) => tone(f, 0.22, 'square', 0.15, 0, i * 0.12)),
        error: () => tone(160, 0.2, 'square', 0.2),
        turn: () => { tone(440, 0.12, 'triangle', 0.2); tone(660, 0.2, 'triangle', 0.2, 0, 0.1); },
    };
    // A slow modal progression with an arpeggio, played forever while music is on.
    const scale = [0, 2, 3, 5, 7, 8, 10];
    function musicLoop() {
        if (!musicOn || !ensure()) return;
        const prog = [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]];
        let bar = 0;
        const play = () => {
            if (!musicOn) return;
            const chord = prog[bar % prog.length];
            const base = 196;
            const f = deg => base * Math.pow(2, (scale[deg % 7] + 12 * Math.floor(deg / 7)) / 12);
            tone(f(chord[0]) / 2, 2.2, 'triangle', 0.35, 0, 0, musicGain);
            for (let i = 0; i < 8; i++) {
                const deg = chord[i % 3] + (i >= 3 && i < 6 ? 7 : 0);
                tone(f(deg), 0.5, 'triangle', 0.18, 0, i * 0.28, musicGain);
            }
            if (bar % 2 === 1) tone(f(chord[1] + 14), 1.0, 'sine', 0.15, 0, 1.2, musicGain);
            bar++;
        };
        play();
        musicTimer = setInterval(play, 2240);
    }
    return {
        play(name) { if (enabled && sounds[name]) try { sounds[name](); } catch (e) { } },
        unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); if (musicOn && !musicTimer) musicLoop(); },
        get enabled() { return enabled; }, get music() { return musicOn; },
        toggle() { enabled = !enabled; try { localStorage.setItem('heroes_sfx', enabled ? '1' : '0'); } catch (e) { } return enabled; },
        toggleMusic() {
            musicOn = !musicOn;
            try { localStorage.setItem('heroes_music', musicOn ? '1' : '0'); } catch (e) { }
            if (!musicOn && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
            else if (musicOn) musicLoop();
            return musicOn;
        },
    };
})();
