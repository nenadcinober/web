'use strict';
// Procedural audio: a driving NES-style fight loop in A minor, plus synthesized punches, bells and crowd.
const Sound = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf, nextTime = 0, step = 0;
    let musicOn = true;
    try { musicOn = localStorage.getItem('punchout-music') !== 'off'; } catch (e) {}

    const BPM = 138, STEP = 60 / BPM / 2;
    // A minor, F, G, E — two passes of the melody over the same four chords
    const ROOTS = [57, 53, 55, 52, 57, 53, 55, 52];
    const MEL = [
        69, 0, 72, 69, 76, 0, 74, 72,
        72, 0, 69, 72, 77, 76, 74, 0,
        71, 0, 74, 71, 79, 0, 77, 74,
        76, 75, 76, 0, 71, 0, 68, 0,
        81, 0, 79, 76, 77, 76, 74, 72,
        74, 0, 72, 69, 72, 0, 77, 0,
        79, 77, 76, 74, 71, 72, 74, 0,
        76, 0, 0, 0, 68, 71, 76, 0,
    ];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    function init() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.35 : 0; musicBus.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        nextTime = ctx.currentTime + 0.1;
        setInterval(schedule, 25);
    }

    function schedule() {
        // A throttled background tab falls behind; skip ahead instead of firing a burst of notes.
        if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05;
        while (nextTime < ctx.currentTime + 0.15) {
            if (musicOn) playStep(step, nextTime);
            nextTime += STEP;
            step = (step + 1) % 64;
        }
    }

    function osc(type, freq, t, dur, vol, bus, attack = 0.005) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus);
        o.start(t); o.stop(t + dur + 0.02);
        return o;
    }

    function noise(t, dur, vol, freq, type, bus, q = 1) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuf;
        f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(bus);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
        return { s, f, g };
    }

    function playStep(i, t) {
        const bar = Math.floor(i / 8), b = i % 8, root = ROOTS[bar];
        // Pulsing octave bass
        osc('square', mtof(root - 24 + (b % 2 ? 12 : 0)), t, STEP * 0.8, 0.07, musicBus);
        const m = MEL[i];
        if (m) {
            osc('square', mtof(m), t, STEP * 1.3, 0.05, musicBus);
            osc('triangle', mtof(m) * 2, t, 0.08, 0.03, musicBus);
        }
        if (b === 0 || b === 4) { const k = osc('sine', 140, t, 0.2, 0.5, musicBus); k.frequency.exponentialRampToValueAtTime(45, t + 0.15); }
        if (b === 2 || b === 6) noise(t, 0.12, 0.18, 1800, 'bandpass', musicBus, 0.8);
        noise(t, 0.03, 0.04, 9000, 'highpass', musicBus);
    }

    function sfx(name) {
        if (!ctx) return;
        const t = ctx.currentTime, B = sfxBus;
        switch (name) {
            case 'click': osc('square', 1200, t, 0.03, 0.05, B); break;
            case 'select': osc('square', 660, t, 0.07, 0.08, B); osc('square', 990, t + 0.07, 0.12, 0.08, B); break;
            case 'swing': { const n = noise(t, 0.14, 0.12, 900, 'bandpass', B, 2); n.f.frequency.exponentialRampToValueAtTime(2600, t + 0.12); break; }
            case 'hit': {
                const k = osc('sine', 180, t, 0.18, 0.7, B); k.frequency.exponentialRampToValueAtTime(50, t + 0.15);
                noise(t, 0.12, 0.5, 1400, 'lowpass', B);
                break;
            }
            case 'bighit': {
                const k = osc('sine', 220, t, 0.35, 0.8, B); k.frequency.exponentialRampToValueAtTime(40, t + 0.3);
                noise(t, 0.3, 0.6, 2200, 'lowpass', B);
                osc('square', 120, t, 0.1, 0.1, B);
                break;
            }
            case 'block': noise(t, 0.09, 0.35, 500, 'lowpass', B); osc('square', 90, t, 0.06, 0.06, B); break;
            case 'ouch': {
                const o = osc('sawtooth', 260, t, 0.25, 0.12, B); o.frequency.exponentialRampToValueAtTime(120, t + 0.22);
                noise(t, 0.15, 0.4, 900, 'lowpass', B);
                break;
            }
            case 'whoosh': { const n = noise(t, 0.3, 0.25, 400, 'bandpass', B, 3); n.f.frequency.exponentialRampToValueAtTime(3000, t + 0.25); break; }
            case 'tell': osc('square', 1760, t, 0.06, 0.05, B); osc('square', 2350, t + 0.05, 0.06, 0.04, B); break;
            case 'star': [0, 0.06, 0.12, 0.18].forEach((d, k) => osc('square', mtof(76 + k * 4), t + d, 0.12, 0.07, B)); break;
            case 'nostar': osc('square', 200, t, 0.1, 0.06, B); break;
            case 'bell':
                for (const d of [0, 0.35, 0.7]) { osc('sine', 1046, t + d, 1.2, 0.25, B); osc('sine', 1568, t + d, 0.8, 0.08, B); osc('sine', 2637, t + d, 0.3, 0.05, B); }
                break;
            case 'bell1': osc('sine', 1046, t, 1.5, 0.3, B); osc('sine', 1568, t, 1, 0.1, B); break;
            case 'count': osc('square', 440, t, 0.1, 0.07, B); break;
            case 'down': {
                const k = osc('sine', 90, t, 0.6, 0.9, B); k.frequency.exponentialRampToValueAtTime(30, t + 0.5);
                noise(t, 0.5, 0.5, 300, 'lowpass', B);
                break;
            }
            case 'cheer':
                for (let k = 0; k < 9; k++) noise(t + k * 0.09, 1.1, 0.1, 800 + Math.random() * 1800, 'bandpass', B, 1.2);
                break;
            case 'boo':
                for (let k = 0; k < 4; k++) { const o = osc('sawtooth', 150 + Math.random() * 30, t + k * 0.05, 0.9, 0.04, B, 0.1); o.frequency.linearRampToValueAtTime(110, t + 0.9); }
                break;
            case 'crow': {
                const o = osc('sawtooth', 500, t, 0.9, 0.1, B, 0.03);
                o.frequency.linearRampToValueAtTime(900, t + 0.15);
                o.frequency.linearRampToValueAtTime(700, t + 0.4);
                o.frequency.linearRampToValueAtTime(1000, t + 0.6);
                o.frequency.linearRampToValueAtTime(500, t + 0.9);
                break;
            }
            case 'cloud': noise(t, 0.8, 0.3, 1200, 'highpass', B); break;
            case 'tired': for (const d of [0, 0.12]) osc('triangle', 300 - d * 600, t + d, 0.12, 0.1, B); break;
            case 'win': [72, 76, 79, 84, 79, 84].forEach((m, k) => osc('square', mtof(m), t + k * 0.13, 0.2, 0.08, B)); break;
            case 'lose': [67, 63, 60, 55].forEach((m, k) => osc('triangle', mtof(m), t + k * 0.25, 0.35, 0.15, B)); break;
        }
    }

    function toggleMusic() {
        musicOn = !musicOn;
        if (musicBus) musicBus.gain.value = musicOn ? 0.35 : 0;
        try { localStorage.setItem('punchout-music', musicOn ? 'on' : 'off'); } catch (e) {}
        return musicOn;
    }

    return { init, sfx, toggleMusic, get musicOn() { return musicOn; } };
})();
