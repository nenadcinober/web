'use strict';
// SID-flavoured procedural audio: a pentatonic kung-fu tune with a pulse-wave lead, fast 50 Hz-style
// chord arpeggios and noise drums, plus the punches, swishes and the gong.
const Sound = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf, pulse25, pulse12, nextTime = 0, step = 0;
    let musicOn = true, playing = false;
    try { musicOn = localStorage.getItem('kungfu-music') !== 'off'; } catch (e) {}

    const BPM = 132, STEP = 60 / BPM / 2, ARP = 0.02;
    // D minor, Bb, C, D minor ×2, G minor, A — the arpeggio cycles each triad every frame like a SID tune
    const CHORDS = [[62, 65, 69], [62, 65, 69], [58, 62, 65], [60, 64, 67], [62, 65, 69], [62, 65, 69], [55, 58, 62], [57, 61, 64]];
    const MEL = [
        74, 0, 72, 69, 72, 0, 74, 0,
        77, 0, 74, 72, 69, 0, 0, 0,
        74, 0, 70, 69, 67, 0, 65, 0,
        67, 0, 69, 72, 76, 0, 72, 0,
        74, 74, 0, 77, 79, 0, 77, 74,
        81, 0, 79, 77, 74, 0, 0, 0,
        79, 0, 77, 74, 70, 0, 74, 0,
        73, 0, 76, 0, 81, 79, 76, 73,
    ];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    // A pulse wave of the given duty cycle, the SID's signature timbre.
    function pulseWave(duty) {
        const n = 40, re = new Float32Array(n), im = new Float32Array(n);
        for (let i = 1; i < n; i++) re[i] = 2 * Math.sin(Math.PI * i * duty) / (Math.PI * i);
        return ctx.createPeriodicWave(re, im);
    }

    function init() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        pulse25 = pulseWave(0.25);
        pulse12 = pulseWave(0.125);
        nextTime = ctx.currentTime + 0.1;
        setInterval(schedule, 25);
    }

    function schedule() {
        // A throttled background tab falls behind; skip ahead instead of firing a burst of notes.
        if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05;
        while (nextTime < ctx.currentTime + 0.15) {
            if (musicOn && playing) playStep(step, nextTime);
            nextTime += STEP;
            step = (step + 1) % 64;
        }
    }

    function voice(wave, freq, t, dur, vol, bus, attack = 0.004) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        if (typeof wave === 'string') o.type = wave; else o.setPeriodicWave(wave);
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus);
        o.start(t); o.stop(t + dur + 0.02);
        return o;
    }

    function sweep(wave, f0, f1, t, dur, vol, bus) {
        voice(wave, f0, t, dur, vol, bus).frequency.exponentialRampToValueAtTime(f1, t + dur);
    }

    function noise(t, dur, vol, freq, type, bus, q = 1) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuf;
        f.type = type; f.frequency.value = freq; f.Q.value = q;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(bus);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }

    function playStep(s, t) {
        const chord = CHORDS[(s >> 3) & 7];
        if (MEL[s]) voice(pulse25, mtof(MEL[s]), t, STEP * 1.6, 0.15, musicBus, 0.01);
        const a = voice(pulse12, mtof(chord[0] + 12), t, STEP * 0.95, 0.05, musicBus);
        for (let i = 1, tt = t + ARP; tt < t + STEP; i++, tt += ARP) a.frequency.setValueAtTime(mtof(chord[i % 3] + 12), tt);
        if (s % 2 === 0) voice('triangle', mtof(chord[0] - 24 + (s % 4 === 2 ? 12 : 0)), t, STEP * 1.8, 0.32, musicBus);
        if (s % 4 === 0) sweep('sine', 150, 45, t, 0.12, 0.5, musicBus);
        if (s % 4 === 2) noise(t, 0.09, 0.22, 1800, 'bandpass', musicBus, 0.8);
        noise(t, 0.025, 0.06, 7000, 'highpass', musicBus);
    }

    const SFX = {
        swish: t => noise(t, 0.08, 0.12, 3000, 'highpass', sfxBus),
        punch: t => { noise(t, 0.07, 0.5, 1100, 'bandpass', sfxBus, 1.2); sweep('square', 220, 70, t, 0.07, 0.18, sfxBus); },
        hit: t => { noise(t, 0.14, 0.6, 700, 'lowpass', sfxBus); sweep('square', 320, 50, t, 0.14, 0.22, sfxBus); },
        block: t => { voice('square', 1250, t, 0.09, 0.12, sfxBus); voice('square', 1580, t, 0.12, 0.1, sfxBus); },
        jump: t => sweep('square', 180, 520, t, 0.12, 0.1, sfxBus),
        throw: t => sweep(pulse12, 900, 1500, t, 0.1, 0.12, sfxBus),
        thud: t => { noise(t, 0.12, 0.4, 300, 'lowpass', sfxBus); sweep('sine', 120, 40, t, 0.15, 0.4, sfxBus); },
        ko: t => { sweep('square', 700, 55, t, 0.8, 0.22, sfxBus); noise(t, 0.3, 0.5, 500, 'lowpass', sfxBus); },
        gong: t => {
            [110, 165.5, 221, 297, 412].forEach((f, i) => voice('sine', f, t, 2.4 - i * 0.3, 0.22 / (i + 1), sfxBus, 0.005));
            noise(t, 0.2, 0.3, 300, 'lowpass', sfxBus);
        },
        select: t => { voice(pulse25, 880, t, 0.06, 0.15, sfxBus); voice(pulse25, 1320, t + 0.06, 0.08, 0.15, sfxBus); },
        type: t => noise(t, 0.02, 0.12, 4000, 'highpass', sfxBus),
        tick: t => voice('square', 1760, t, 0.03, 0.08, sfxBus),
        win: t => [69, 72, 74, 76, 79, 81].forEach((m, i) => voice(pulse25, mtof(m + 12), t + i * 0.09, 0.2, 0.15, sfxBus)),
        lose: t => [74, 72, 69, 67, 65, 62].forEach((m, i) => voice(pulse25, mtof(m), t + i * 0.14, 0.25, 0.15, sfxBus)),
        life: t => [72, 76, 79, 84].forEach((m, i) => voice(pulse25, mtof(m + 12), t + i * 0.06, 0.1, 0.13, sfxBus)),
    };

    function sfx(name) { if (ctx && SFX[name]) SFX[name](ctx.currentTime); }
    function music(on) { if (on && !playing) step = 0; playing = on; }
    function toggleMusic() {
        musicOn = !musicOn;
        try { localStorage.setItem('kungfu-music', musicOn ? 'on' : 'off'); } catch (e) {}
        if (musicBus) musicBus.gain.value = musicOn ? 0.32 : 0;
    }
    return { init, sfx, music, toggleMusic };
})();
