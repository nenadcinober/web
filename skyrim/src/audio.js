// WebAudio synth: sound effects and a slow, original Nordic-flavoured ambient score
// (low drones, a horn-like melody and distant drums). Nothing here is sampled.
const Sfx = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf, verb;
    let muted = false, musicOn = false, timer = null, nextTime = 0, step = 0, mood = 'calm';
    try { muted = localStorage.getItem('skyrim.muted') === '1'; } catch (e) { /* storage blocked */ }

    const midi = m => 440 * Math.pow(2, (m - 69) / 12);

    function init() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.32; master.connect(ctx.destination);
        // a cheap "hall" reverb: two feedback delays
        verb = ctx.createGain(); verb.gain.value = 0.35;
        [0.13, 0.21].forEach(t => {
            const d = ctx.createDelay(); d.delayTime.value = t;
            const fb = ctx.createGain(); fb.gain.value = 0.45;
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
            verb.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master);
        });
        musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master); musicBus.connect(verb);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        if (musicOn) startMusic();
    }

    function tone(bus, t, f, dur, type, vol, f2, attack = 0.006) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + attack);
        g.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.5));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus);
        o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(bus, t, dur, vol, f, f2, type = 'bandpass', q = 1) {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
        if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(fl); fl.connect(g); g.connect(bus);
        s.start(t, Math.random()); s.stop(t + dur + 0.05);
    }
    // a soft horn: two detuned saws through a slowly opening lowpass
    function horn(t, f, dur, vol) {
        const fl = ctx.createBiquadFilter(); fl.type = 'lowpass';
        fl.frequency.setValueAtTime(f * 1.2, t); fl.frequency.linearRampToValueAtTime(f * 3.5, t + dur * 0.4); fl.frequency.linearRampToValueAtTime(f * 1.5, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.18);
        g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        [1, 1.004].forEach(m => {
            const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * m;
            o.connect(fl); o.start(t); o.stop(t + dur + 0.05);
        });
        fl.connect(g); g.connect(musicBus);
    }

    const SFX = {
        swing: t => noise(sfxBus, t, 0.16, 0.35, 900, 3000, 'bandpass', 0.8),
        hit: t => { noise(sfxBus, t, 0.12, 0.6, 1800, 500); tone(sfxBus, t, 180, 0.12, 'square', 0.12, 70); },
        clang: t => { tone(sfxBus, t, 1250, 0.25, 'triangle', 0.15, 1100); tone(sfxBus, t, 1870, 0.18, 'sine', 0.08); },
        hurt: t => { tone(sfxBus, t, 220, 0.2, 'sawtooth', 0.14, 110); noise(sfxBus, t, 0.1, 0.3, 600); },
        arrow: t => noise(sfxBus, t, 0.22, 0.35, 2500, 900, 'bandpass', 2),
        fire: t => noise(sfxBus, t, 0.25, 0.18, 500, 1500, 'lowpass'),
        bolt: t => { noise(sfxBus, t, 0.35, 0.35, 300, 1800, 'lowpass'); tone(sfxBus, t, 160, 0.3, 'sawtooth', 0.08, 60); },
        ice: t => { tone(sfxBus, t, 1600, 0.3, 'sine', 0.1, 2400); noise(sfxBus, t, 0.25, 0.25, 4000, 2000, 'highpass'); },
        heal: t => tone(sfxBus, t, 660, 0.35, 'sine', 0.06, 990),
        shout: t => {
            // three shaped bursts of breath and voice: FUS... RO... DAH
            [0, 0.16, 0.32].forEach((o, i) => {
                noise(sfxBus, t + o, 0.5, 0.7, 260 + i * 140, 120, 'bandpass', 1.5);
                tone(sfxBus, t + o, 95 - i * 8, 0.45, 'sawtooth', 0.22, 55);
            });
            noise(sfxBus, t + 0.32, 1.2, 0.5, 900, 80, 'lowpass');
        },
        wuld: t => noise(sfxBus, t, 0.5, 0.6, 400, 3000, 'bandpass', 1),
        rend: t => { tone(sfxBus, t, 70, 1.2, 'sawtooth', 0.25, 40); noise(sfxBus, t, 1.0, 0.5, 1500, 200, 'bandpass', 3); },
        roar: t => {
            tone(sfxBus, t, 140, 1.6, 'sawtooth', 0.3, 45, 0.15);
            tone(sfxBus, t, 93, 1.6, 'square', 0.12, 38, 0.2);
            noise(sfxBus, t, 1.6, 0.6, 700, 150, 'bandpass', 0.7);
        },
        breath: t => noise(sfxBus, t, 1.3, 0.45, 300, 1200, 'lowpass'),
        boom: t => { noise(sfxBus, t, 0.8, 0.8, 400, 50, 'lowpass'); tone(sfxBus, t, 80, 0.6, 'sine', 0.4, 30); },
        coin: t => { tone(sfxBus, t, 1320, 0.08, 'square', 0.06); tone(sfxBus, t + 0.07, 1760, 0.15, 'square', 0.06); },
        pickup: t => tone(sfxBus, t, 520, 0.12, 'triangle', 0.12, 780),
        open: t => { noise(sfxBus, t, 0.3, 0.3, 300, 150); tone(sfxBus, t, 90, 0.3, 'square', 0.06, 60); },
        door: t => { noise(sfxBus, t, 0.9, 0.5, 200, 80, 'lowpass'); tone(sfxBus, t, 55, 0.9, 'sawtooth', 0.1, 40); },
        click: t => tone(sfxBus, t, 900, 0.05, 'square', 0.05),
        groan: t => { tone(sfxBus, t, 110, 0.9, 'sawtooth', 0.12, 70, 0.2); noise(sfxBus, t, 0.9, 0.2, 400, 200); },
        growl: t => { tone(sfxBus, t, 160, 0.5, 'sawtooth', 0.1, 90); noise(sfxBus, t, 0.5, 0.25, 500, 250); },
        die: t => tone(sfxBus, t, 200, 0.6, 'sawtooth', 0.12, 50),
        word: t => {
            [0, 0.5, 1.0, 1.5].forEach((o, i) => horn(t + o, midi([50, 53, 57, 62][i]), 2.2, 0.08));
            noise(sfxBus, t, 2.5, 0.3, 200, 1200, 'bandpass', 4);
        },
        level: t => [62, 66, 69, 74].forEach((m, i) => horn(t + i * 0.15, midi(m), 1.4, 0.07)),
        quest: t => [57, 64, 69].forEach((m, i) => horn(t + i * 0.22, midi(m), 1.6, 0.06)),
        absorb: t => {
            for (let i = 0; i < 10; i++) tone(sfxBus, t + i * 0.2, 200 + i * 60, 0.6, 'sawtooth', 0.04, 400 + i * 80);
            noise(sfxBus, t, 3, 0.4, 200, 2400, 'bandpass', 2);
        },
    };

    function play(name) {
        if (!ctx || muted || !SFX[name]) return;
        SFX[name](ctx.currentTime + 0.01);
    }

    // ---- music: D dorian drones, a horn melody and a pulse of drums when fighting ----
    const MEL = [
        [62, 2], [64, 1], [65, 1], [67, 3], [65, 1], [64, 2], [62, 2], [0, 2],
        [69, 2], [67, 1], [65, 1], [64, 3], [62, 1], [60, 2], [62, 4], [0, 2],
        [57, 2], [60, 2], [62, 3], [64, 1], [65, 2], [64, 2], [62, 4], [0, 4],
    ];
    let melIdx = 0, melWait = 0;
    function scheduler() {
        if (!ctx) return;
        const beat = mood === 'battle' ? 0.32 : 0.55;
        while (nextTime < ctx.currentTime + 0.4) {
            const t = nextTime;
            if (step % 16 === 0) {
                const root = [38, 38, 36, 41][(step / 16) % 4];
                tone(musicBus, t, midi(root), beat * 16, 'triangle', 0.09, null, 1.5);
                tone(musicBus, t, midi(root + 7), beat * 16, 'sine', 0.05, null, 2);
                tone(musicBus, t, midi(root + 12), beat * 16, 'sine', 0.025, null, 2.5);
            }
            if (mood === 'battle') {
                if (step % 4 === 0 || step % 8 === 3) noise(musicBus, t, 0.35, 0.5, 120, 50, 'lowpass');
                if (step % 8 === 6) noise(musicBus, t, 0.15, 0.25, 900, 400);
            } else if (step % 8 === 0) {
                noise(musicBus, t, 0.6, 0.12, 90, 45, 'lowpass');
            }
            if (melWait <= 0) {
                const [m, len] = MEL[melIdx];
                if (m && (mood === 'battle' || Math.random() < 0.85)) horn(t, midi(m - (mood === 'battle' ? 0 : 12)), beat * len * 1.1, mood === 'battle' ? 0.06 : 0.07);
                melWait = len; melIdx = (melIdx + 1) % MEL.length;
            }
            melWait--;
            step++;
            nextTime += beat;
        }
    }
    function startMusic() {
        musicOn = true;
        if (!ctx || timer) return;
        nextTime = ctx.currentTime + 0.1;
        timer = setInterval(scheduler, 100);
    }
    function setMood(m) { mood = m; }
    function toggleMute() {
        muted = !muted;
        try { localStorage.setItem('skyrim.muted', muted ? '1' : '0'); } catch (e) { /* storage blocked */ }
        if (master) master.gain.value = muted ? 0 : 0.32;
        return muted;
    }

    return { init, play, startMusic, setMood, toggleMute, get muted() { return muted; } };
})();
