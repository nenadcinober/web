// Tiny FM-ish synth: two-operator voices give the bass and lead a Mega Drive (YM2612) flavour,
// noise bursts handle drums and hit effects. Everything is generated, there are no audio files.
const Sound = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf;
    let muted = false;
    let song = null, step = 0, nextTime = 0, timer = null;

    const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    function freq(n) {
        const m = /^([A-G]#?)(-?\d)$/.exec(n);
        if (!m) return 0;
        const midi = NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function init() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.35; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.45; musicBus.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // Two-operator FM voice: modulator -> carrier frequency.
    function fm(bus, t, f, dur, opt) {
        const car = ctx.createOscillator(), mod = ctx.createOscillator();
        const mg = ctx.createGain(), g = ctx.createGain();
        car.type = opt.wave || 'sine';
        car.frequency.value = f;
        mod.frequency.value = f * (opt.ratio || 1);
        const idx = f * (opt.index || 2);
        mg.gain.setValueAtTime(idx, t);
        mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * (opt.decayTo || 0.2)), t + dur);
        mod.connect(mg); mg.connect(car.frequency);
        const vol = opt.vol || 0.3;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(vol * (opt.sustain || 0.5), t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        car.connect(g); g.connect(bus);
        car.start(t); mod.start(t); car.stop(t + dur + 0.02); mod.stop(t + dur + 0.02);
    }

    function noise(bus, t, dur, opt) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = opt.type || 'bandpass';
        f.frequency.setValueAtTime(opt.f || 1000, t);
        if (opt.f2) f.frequency.exponentialRampToValueAtTime(opt.f2, t + dur);
        f.Q.value = opt.q || 1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(opt.vol || 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(bus);
        src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    }

    function tone(bus, t, f, f2, dur, wave, vol) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = wave; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    }

    const SFX = {
        hit(t) { noise(sfxBus, t, 0.09, { f: 1800, q: 0.7, vol: 0.7 }); tone(sfxBus, t, 180, 60, 0.1, 'square', 0.25); },
        heavy(t) { noise(sfxBus, t, 0.16, { f: 900, f2: 200, q: 0.8, vol: 0.9 }); tone(sfxBus, t, 120, 40, 0.18, 'square', 0.35); },
        whoosh(t) { noise(sfxBus, t, 0.08, { f: 3000, f2: 900, q: 2, vol: 0.18 }); },
        jump(t) { tone(sfxBus, t, 220, 520, 0.12, 'square', 0.08); },
        land(t) { noise(sfxBus, t, 0.06, { type: 'lowpass', f: 400, vol: 0.4 }); },
        thud(t) { noise(sfxBus, t, 0.22, { type: 'lowpass', f: 300, f2: 80, vol: 0.9 }); tone(sfxBus, t, 90, 35, 0.2, 'sine', 0.5); },
        grab(t) { tone(sfxBus, t, 300, 200, 0.06, 'square', 0.1); },
        pickup(t) { tone(sfxBus, t, 660, 0, 0.06, 'square', 0.12); tone(sfxBus, t + 0.06, 990, 0, 0.08, 'square', 0.12); },
        knife(t) { noise(sfxBus, t, 0.12, { f: 5000, f2: 2000, q: 4, vol: 0.25 }); },
        whip(t) { noise(sfxBus, t, 0.05, { f: 6000, q: 3, vol: 0.5 }); tone(sfxBus, t, 1400, 300, 0.05, 'sawtooth', 0.15); },
        ko(t) { [523, 392, 330, 262, 196].forEach((f, i) => tone(sfxBus, t + i * 0.09, f, 0, 0.12, 'square', 0.12)); },
        go(t) { tone(sfxBus, t, 880, 0, 0.08, 'square', 0.1); tone(sfxBus, t + 0.12, 880, 0, 0.08, 'square', 0.1); },
        select(t) { tone(sfxBus, t, 440, 880, 0.1, 'square', 0.12); },
        clear(t) {
            ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'].forEach((n, i) =>
                fm(sfxBus, t + i * 0.12, freq(n), i === 5 ? 0.6 : 0.14, { ratio: 1, index: 1.5, vol: 0.25, wave: 'square' }));
        },
    };

    function play(name) {
        if (!ctx || muted || !SFX[name]) return;
        SFX[name](ctx.currentTime + 0.005);
    }

    // ---- Music ----------------------------------------------------------------------------
    // Each track: tempo (8th notes per minute / 2), and parallel lanes of tokens per 8th note.
    // A note token is like "A3", "-" holds the previous note, "." is a rest.
    const parse = s => s.replace(/\|/g, ' ').trim().split(/\s+/);
    const SONGS = {
        title: {
            bpm: 120,
            bass: parse('D2 . D3 D2 . D2 D3 . | A#1 . A#2 A#1 . A#1 A#2 . | C2 . C3 C2 . C2 C3 . | A1 . A2 A1 C2 . E2 .'),
            lead: parse('D4 - - A4 - - G4 F4 | F4 - - E4 - D4 - - | E4 - - G4 - - A4 C5 | A4 - - - - - - - '),
            pad: parse('F3 - - - - - - - | D3 - - - - - - - | E3 - - - - - - - | C#3 - - - - - - - '),
            drums: parse('k . h . s . h . | k . h k s . h . | k . h . s . h . | k . h k s s s s'),
        },
        stage1: {
            bpm: 150,
            bass: parse('A1 A1 A2 A1 A1 A2 G1 A1 | F1 F1 F2 F1 F1 F2 E1 F1 | G1 G1 G2 G1 G1 G2 F1 G1 | E1 E1 E2 E1 G1 G2 G#1 G#2'),
            lead: parse('A4 - C5 - E5 - D5 C5 | D5 - C5 - A4 - - . | C5 - E5 - G5 - F5 E5 | E5 - D5 - B4 - G#4 - |' +
                        'A4 - C5 - E5 - A5 G5 | F5 - E5 - D5 - C5 . | D5 - E5 - F5 - E5 D5 | E5 - - - - . . .'),
            drums: parse('k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k s s s'),
        },
        stage2: {
            bpm: 160,
            bass: parse('E1 E2 E1 E2 D2 E2 B1 E2 | C2 C3 C2 C3 D2 D3 D2 D3 | E1 E2 E1 E2 D2 E2 B1 E2 | C2 C3 D2 D3 B1 B2 B1 D#2'),
            lead: parse('E5 - B4 - E5 F#5 G5 - | F#5 - E5 - D5 - . . | E5 - B4 - E5 F#5 G5 - | A5 - G5 - F#5 - D#5 - |' +
                        'G5 - - F#5 - E5 - . | D5 - C5 - D5 - E5 - | B4 - - - E5 - - - | D#5 - - - - - . .'),
            drums: parse('k h s h k h s h | k h s h k h s s | k h s h k h s h | k k s h k k s s'),
        },
        stage3: {
            bpm: 138,
            bass: parse('D1 D2 D1 D2 D1 D2 C2 D2 | A#0 A#1 A#0 A#1 C1 C2 C1 C2 | D1 D2 D1 D2 F1 F2 E1 E2 | A0 A1 A0 A1 C#1 C#2 E1 A1'),
            lead: parse('D5 - - F5 - - E5 D5 | A#4 - - - C5 - - . | D5 - - F5 - - A5 G5 | E5 - - - C#5 - - . |' +
                        'F5 - E5 - D5 - C5 - | A#4 - A4 - G4 - A4 - | D5 - - A5 - G5 F5 E5 | A5 - - - - . . .'),
            drums: parse('k . s . k k s . | k . s . k k s h | k . s . k k s . | k . s k k s s s'),
        },
        boss: {
            bpm: 170,
            bass: parse('E1 E2 F1 F2 E1 E2 A#1 A#2 | E1 E2 F1 F2 E1 E2 D2 D#2 | E1 E2 F1 F2 E1 E2 A#1 A#2 | G1 G2 F1 F2 D#1 D#2 D1 D2'),
            lead: parse('E5 . E5 F5 . E5 A#5 - | A5 - G5 - F5 - E5 . | E5 . E5 F5 . E5 B5 - | A#5 - A5 - G5 - F5 -'),
            drums: parse('k h s h k h s h | k h s h k s s h | k h s h k h s h | k s k s s s s s'),
        },
        gameover: {
            bpm: 90, once: true,
            bass: parse('A1 - - - F1 - - - | E1 - - - A0 - - -'),
            lead: parse('E5 - D5 - C5 - B4 - | A4 - G#4 - A4 - - -'),
            drums: parse('. . . . . . . . | . . . . . . . .'),
        },
        ending: {
            bpm: 100,
            bass: parse('C2 . G2 C3 . G2 E2 . | A1 . E2 A2 . E2 C2 . | F1 . C2 F2 . C2 A1 . | G1 . D2 G2 . D2 B1 .'),
            lead: parse('E5 - - D5 C5 - G4 - | A4 - - C5 E5 - - - | F5 - E5 - D5 - C5 - | D5 - - - - - - - '),
            pad: parse('G3 - - - - - - - | E3 - - - - - - - | A3 - - - - - - - | B3 - - - - - - - '),
            drums: parse('k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h k s . s .'),
        },
    };

    function lenOf(lane, i) {
        let n = 1;
        while (lane[(i + n) % lane.length] === '-' && n < lane.length) n++;
        return n;
    }

    function schedule() {
        if (!song) return;
        const spb = 60 / song.bpm / 2; // seconds per 8th
        while (nextTime < ctx.currentTime + 0.12) {
            const t = nextTime;
            const L = song.bass.length;
            const i = step % L;
            const lanes = [['bass', { ratio: 1, index: 3.2, decayTo: 0.15, vol: 0.38, sustain: 0.4 }],
                           ['lead', { ratio: 1, index: 1.4, decayTo: 0.5, vol: 0.2, wave: 'square', sustain: 0.7 }],
                           ['pad', { ratio: 2, index: 0.6, decayTo: 0.8, vol: 0.09, sustain: 0.9 }]];
            for (const [name, opt] of lanes) {
                const lane = song[name];
                if (!lane) continue;
                const tok = lane[step % lane.length];
                const f = freq(tok);
                if (f) fm(musicBus, t, f, spb * lenOf(lane, step % lane.length) * 0.95, opt);
            }
            const dr = song.drums[step % song.drums.length];
            if (dr === 'k') { tone(musicBus, t, 150, 40, 0.12, 'sine', 0.7); }
            else if (dr === 's') { noise(musicBus, t, 0.12, { f: 1800, q: 0.6, vol: 0.35 }); tone(musicBus, t, 220, 120, 0.06, 'triangle', 0.25); }
            else if (dr === 'h') { noise(musicBus, t, 0.03, { type: 'highpass', f: 7000, vol: 0.12 }); }
            step++;
            nextTime += spb;
            if (song.once && step >= L) { song = null; break; }
        }
    }

    function music(name) {
        if (!ctx) return;
        stopMusic();
        song = SONGS[name] || null;
        step = 0;
        nextTime = ctx.currentTime + 0.05;
        timer = setInterval(schedule, 25);
    }

    function stopMusic() {
        song = null;
        if (timer) clearInterval(timer);
        timer = null;
    }

    function toggleMute() {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 0.35;
        return muted;
    }

    return { init, play, music, stopMusic, toggleMute, get ready() { return !!ctx; } };
})();
