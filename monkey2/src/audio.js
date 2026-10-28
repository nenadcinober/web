'use strict';
// Procedural audio: a small reggae loop in the spirit of Melee Island, plus synthesized sound effects.
const Sound = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf, nextTime = 0, step = 0;
    let musicOn = true;
    try { musicOn = localStorage.getItem('monkey2-music') !== 'off'; } catch (e) {}

    const BPM = 82, STEP = 60 / BPM / 2;
    const CHORDS = [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59], [57, 60, 64], [55, 59, 62], [50, 53, 57], [52, 56, 59]];
    const MEL = [
        69, 0, 72, 0, 76, 0, 74, 72,
        71, 0, 67, 0, 71, 74, 0, 0,
        72, 0, 69, 0, 72, 0, 77, 76,
        76, 0, 0, 74, 71, 0, 68, 0,
        69, 0, 72, 76, 0, 81, 79, 76,
        74, 0, 71, 0, 67, 0, 71, 74,
        77, 0, 74, 0, 72, 0, 69, 0,
        71, 0, 68, 0, 64, 0, 0, 0,
    ];
    // Semitones above the chord root for each eighth note; null rests.
    const BASS = [0, null, null, 0, 7, null, 5, null];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    function init() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.5 : 0; musicBus.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
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
        s.start(t); s.stop(t + dur + 0.02);
        return { s, f, g };
    }

    function playStep(i, t) {
        const bar = Math.floor(i / 8), b = i % 8, chord = CHORDS[bar];
        if (BASS[b] !== null) osc('triangle', mtof(chord[0] - 24 + BASS[b]), t, STEP * 1.6, 0.32, musicBus, 0.01);
        // The skank: short chord stabs on beats two and four
        if (b === 2 || b === 6) for (const n of chord) osc('square', mtof(n), t, 0.09, 0.03, musicBus);
        const m = MEL[i];
        if (m) {
            osc('sine', mtof(m), t, 0.45, 0.12, musicBus);
            osc('sine', mtof(m) * 2.01, t, 0.25, 0.04, musicBus);
            osc('triangle', mtof(m) * 3, t, 0.12, 0.015, musicBus);
        }
        // One-drop: kick and rim on beat three, hats on the offbeats
        if (b === 4) {
            const k = osc('sine', 120, t, 0.25, 0.5, musicBus);
            k.frequency.exponentialRampToValueAtTime(45, t + 0.2);
            noise(t, 0.08, 0.15, 1800, 'bandpass', musicBus, 2);
        }
        if (b % 2 === 1) noise(t, 0.04, 0.05, 8000, 'highpass', musicBus);
    }

    function sfx(name) {
        if (!ctx) return;
        const t = ctx.currentTime, B = sfxBus;
        switch (name) {
            case 'pick': osc('square', 660, t, 0.08, 0.08, B); osc('square', 990, t + 0.07, 0.12, 0.08, B); break;
            case 'coin': osc('square', 988, t, 0.08, 0.08, B); osc('square', 1319, t + 0.08, 0.25, 0.08, B); break;
            case 'click': osc('square', 1200, t, 0.03, 0.04, B); break;
            case 'bark':
                for (const d of [0, 0.22]) { const o = osc('sawtooth', 380, t + d, 0.14, 0.18, B); o.frequency.exponentialRampToValueAtTime(180, t + d + 0.12); }
                break;
            case 'grunt': {
                const o = osc('sawtooth', 110, t, 0.9, 0.2, B, 0.05);
                o.frequency.linearRampToValueAtTime(85, t + 0.9);
                noise(t, 0.9, 0.05, 400, 'lowpass', B);
                break;
            }
            case 'whoosh': { const n = noise(t, 0.4, 0.25, 400, 'bandpass', B, 3); n.f.frequency.exponentialRampToValueAtTime(3000, t + 0.35); break; }
            case 'splash': noise(t, 0.6, 0.35, 1200, 'lowpass', B); noise(t + 0.1, 0.4, 0.15, 3000, 'highpass', B); break;
            case 'cluck':
                for (const d of [0, 0.15, 0.3]) { const o = osc('square', 700, t + d, 0.07, 0.07, B); o.frequency.exponentialRampToValueAtTime(400, t + d + 0.06); }
                break;
            case 'blender': {
                const n = noise(t, 1.4, 0.3, 900, 'bandpass', B, 4);
                const lfo = ctx.createOscillator(), lg = ctx.createGain();
                lfo.frequency.value = 18; lg.gain.value = 300;
                lfo.connect(lg); lg.connect(n.f.frequency); lfo.start(t); lfo.stop(t + 1.4);
                osc('sawtooth', 140, t, 1.4, 0.06, B, 0.1);
                break;
            }
            case 'gulp':
                for (const d of [0, 0.25, 0.5]) { const o = osc('sine', 300, t + d, 0.12, 0.25, B); o.frequency.exponentialRampToValueAtTime(120, t + d + 0.1); }
                break;
            case 'clang': osc('square', 820, t, 0.6, 0.1, B); osc('square', 1230, t, 0.4, 0.05, B); osc('sine', 410, t, 0.8, 0.15, B); break;
            case 'cheer':
                for (let k = 0; k < 7; k++) noise(t + k * 0.12, 0.9, 0.12, 900 + Math.random() * 1500, 'bandpass', B, 1.5);
                break;
            case 'poof': {
                const n = noise(t, 1.2, 0.4, 2000, 'lowpass', B);
                n.f.frequency.exponentialRampToValueAtTime(100, t + 1.1);
                const o = osc('sawtooth', 300, t, 1.2, 0.15, B);
                o.frequency.exponentialRampToValueAtTime(40, t + 1.1);
                break;
            }
            case 'creak': {
                const o = osc('sawtooth', 180, t, 0.5, 0.06, B, 0.05);
                o.frequency.linearRampToValueAtTime(260, t + 0.25);
                o.frequency.linearRampToValueAtTime(150, t + 0.5);
                break;
            }
            case 'thunder': noise(t, 1.6, 0.5, 200, 'lowpass', B); break;
            case 'laugh':
                for (let k = 0; k < 5; k++) osc('sawtooth', 170 - k * 10, t + k * 0.16, 0.12, 0.14, B);
                break;
        }
    }

    function toggleMusic() {
        musicOn = !musicOn;
        if (musicBus) musicBus.gain.value = musicOn ? 0.5 : 0;
        try { localStorage.setItem('monkey2-music', musicOn ? 'on' : 'off'); } catch (e) {}
        return musicOn;
    }

    return { init, sfx, toggleMusic, get musicOn() { return musicOn; } };
})();
