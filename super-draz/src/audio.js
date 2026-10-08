// Chiptune synth: square/triangle voices and filtered noise, all generated in WebAudio.
// The tunes are original folk-dance melodies (polka, drmeš, a slow river waltz).
const Sound = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf;
    let muted = false;
    let track = null, step = 0, nextTime = 0, timer = null, rate = 1;

    const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    function freq(n) {
        const m = /^([A-G]#?)(-?\d)$/.exec(n);
        if (!m) return 0;
        return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12 - 69) / 12);
    }

    function init() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.32; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    function tone(bus, t, f, dur, type, vol, f2) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.005);
        g.gain.setValueAtTime(vol, t + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus);
        o.start(t); o.stop(t + dur + 0.02);
    }

    function noise(bus, t, dur, vol, f, f2, type = 'bandpass') {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t);
        if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(fl); fl.connect(g); g.connect(bus);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }

    const seq = (t, notes, d, type = 'square', vol = 0.14) => notes.forEach((n, i) => n && tone(sfxBus, t + i * d, freq(n), d * 0.95, type, vol));

    const SFX = {
        jump: t => tone(sfxBus, t, 280, 0.2, 'square', 0.12, 720),
        bigjump: t => tone(sfxBus, t, 200, 0.24, 'square', 0.12, 560),
        coin: t => { tone(sfxBus, t, freq('B5'), 0.07, 'square', 0.12); tone(sfxBus, t + 0.07, freq('E6'), 0.4, 'square', 0.12); },
        bump: t => tone(sfxBus, t, 160, 0.12, 'triangle', 0.5, 60),
        break: t => { noise(sfxBus, t, 0.3, 0.6, 1600, 200); tone(sfxBus, t, 220, 0.1, 'square', 0.12, 80); },
        stomp: t => tone(sfxBus, t, 520, 0.14, 'square', 0.16, 130),
        kick: t => { tone(sfxBus, t, 900, 0.07, 'square', 0.14, 300); noise(sfxBus, t, 0.06, 0.4, 3000); },
        item: t => seq(t, ['G4', 'C5', 'E5', 'G5', 'C6', 'E6'], 0.05, 'square', 0.1),
        grow: t => seq(t, ['C4', 'G4', 'C5', 'D4', 'A4', 'D5', 'E4', 'B4', 'E5'], 0.06, 'square', 0.1),
        power: t => seq(t, ['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.05, 'square', 0.1),
        shrink: t => seq(t, ['E5', 'B4', 'E4', 'C5', 'G4', 'C4'], 0.07, 'square', 0.1),
        fire: t => { noise(sfxBus, t, 0.12, 0.5, 2500, 500); tone(sfxBus, t, 800, 0.08, 'square', 0.08, 200); },
        oneup: t => seq(t, ['E5', 'G5', 'E6', 'C6', 'D6', 'G6'], 0.1, 'square', 0.12),
        die: t => seq(t, ['C5', 'C#5', 'D5', null, null, 'B4', 'F5', null, 'F5', 'F5', 'E5', 'D5', 'C5', 'E4', null, 'E4', 'C4'], 0.11, 'square', 0.13),
        flag: t => tone(sfxBus, t, 1400, 1.0, 'square', 0.09, 180),
        clear: t => {
            seq(t, ['G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6', null, 'E6', null, 'A#4', 'D#5', 'G5', 'A#5', 'D#6', 'G6', 'A#6', null, 'G6', null,
                'C5', 'F5', 'A5', 'C6', 'F6', 'A6', 'C7', null, null, null], 0.1, 'square', 0.1);
            seq(t, ['C3', null, null, null, null, null, 'C3', null, null, null, 'D#3', null, null, null, null, null, 'D#3', null, null, null,
                'F3', null, null, null, null, null, 'F3'], 0.1, 'triangle', 0.3);
        },
        gameover: t => seq(t, ['C5', null, 'G4', null, 'E4', null, 'A4', 'B4', 'A4', 'G#4', 'A#4', 'G#4', 'G4', 'F4', 'G4', null], 0.16, 'square', 0.12),
        tick: t => tone(sfxBus, t, 1800, 0.03, 'square', 0.05),
        pause: t => seq(t, ['E6', 'C6', 'E6', 'C6'], 0.06, 'square', 0.08),
        hurry: t => seq(t, ['C6', 'D#6', 'F#6', null, 'C6', 'D#6', 'F#6', null, 'C6', 'D#6', 'F#6'], 0.07, 'square', 0.09),
        bossfire: t => noise(sfxBus, t, 0.6, 0.5, 600, 120, 'lowpass'),
        bridge: t => { noise(sfxBus, t, 0.2, 0.5, 300, 80, 'lowpass'); tone(sfxBus, t, 90, 0.18, 'triangle', 0.3, 40); },
        bossfall: t => tone(sfxBus, t, 500, 1.4, 'square', 0.1, 50),
        hit: t => { noise(sfxBus, t, 0.15, 0.5, 900); tone(sfxBus, t, 300, 0.12, 'square', 0.12, 120); },
        splash: t => noise(sfxBus, t, 0.5, 0.5, 1200, 300),
    };

    function play(name) {
        if (!ctx || muted || !SFX[name]) return;
        SFX[name](ctx.currentTime + 0.01);
    }

    // ---- music ----------------------------------------------------------------------------
    // Each voice is a string of eighth-note steps: a note, '-' for rest, '~' to hold the previous note.
    function parse(s) {
        const tok = s.split(/\s+/).filter(t => t && t !== '|');
        const out = [];
        for (let i = 0; i < tok.length; i++) {
            if (tok[i] === '-' || tok[i] === '~') { out.push(null); continue; }
            let len = 1;
            while (tok[i + len] === '~') len++;
            out.push({ f: freq(tok[i]), len });
        }
        return out;
    }

    const RAW = {
        polka: {
            bpm: 150, lead: 'square', leadVol: 0.07,
            mel: `G4 B4 D5 B4 | G4 B4 D5 - | E5 D5 C5 B4 | A4 ~ - - | F#4 A4 C5 A4 | F#4 A4 C5 - | D5 C5 B4 A4 | G4 ~ - - |
                  G4 B4 D5 B4 | G4 B4 D5 - | E5 F#5 G5 E5 | D5 ~ - - | C5 E5 D5 C5 | B4 D5 C5 B4 | A4 B4 C5 F#4 | G4 ~ D4 - |
                  B4 B4 C5 D5 | E5 - D5 - | C5 C5 B4 A4 | B4 - G4 - | A4 A4 B4 C5 | D5 - B4 - | A4 G4 F#4 A4 | G4 ~ - - |
                  B4 B4 C5 D5 | E5 - G5 - | F#5 E5 D5 C5 | B4 - D5 - | C5 B4 A4 G4 | F#4 A4 D5 C5 | B4 A4 G4 F#4 | G4 ~ G5 - |`,
            bass: `G2 - D3 - | G2 - D3 - | C3 - G3 - | D3 - A2 - | D3 - A2 - | D3 - A2 - | D3 - F#2 - | G2 - D3 - |
                   G2 - D3 - | G2 - D3 - | C3 - G3 - | G2 - D3 - | A2 - E3 - | G2 - D3 - | D3 - A2 - | G2 - D3 - |
                   G2 - D3 - | C3 - G3 - | D3 - A2 - | G2 - D3 - | D3 - A2 - | G2 - D3 - | D3 - A2 - | G2 - D3 - |
                   G2 - D3 - | C3 - G3 - | D3 - A2 - | G2 - D3 - | C3 - G3 - | D3 - A2 - | D3 - A2 - | G2 - D3 - |`,
            drum: 'k h k h',
        },
        podrum: {
            bpm: 112, lead: 'triangle', leadVol: 0.2,
            mel: `E4 ~ G4 ~ | B4 ~ A4 G4 | F#4 ~ ~ ~ | D4 ~ ~ ~ | E4 ~ G4 ~ | B4 ~ C5 B4 | A4 ~ ~ ~ | B4 ~ ~ ~ |
                  C5 ~ B4 ~ | A4 ~ G4 F#4 | G4 ~ E4 ~ | ~ ~ - - | A4 ~ G4 ~ | F#4 ~ D4 ~ | E4 ~ ~ ~ | - - - - |`,
            bass: `E2 - E3 - | E2 - E3 - | D2 - D3 - | D2 - D3 - | E2 - E3 - | E2 - E3 - | A2 - A3 - | B2 - B3 - |
                   A2 - A3 - | A2 - A3 - | E2 - E3 - | E2 - E3 - | C3 - C3 - | D3 - D3 - | E2 - E3 - | B2 - B2 - |`,
            drum: 'k - h -',
        },
        drava: {
            bpm: 132, lead: 'square', leadVol: 0.06,
            mel: `D5 ~ ~ A4 | B4 ~ A4 ~ | F#4 ~ ~ D4 | E4 ~ ~ ~ | F#4 ~ G4 A4 | B4 ~ ~ A4 | G4 ~ E4 ~ | F#4 ~ ~ ~ |
                  D5 ~ ~ A4 | B4 ~ D5 ~ | E5 ~ ~ D5 | C#5 ~ ~ ~ | B4 ~ A4 G4 | F#4 ~ E4 ~ | D4 ~ ~ ~ | - - - - |`,
            bass: `D3 - A3 - | G2 - D3 - | D3 - A3 - | A2 - E3 - | D3 - A3 - | G2 - D3 - | A2 - E3 - | D3 - A3 - |
                   D3 - A3 - | G2 - D3 - | A2 - E3 - | A2 - E3 - | G2 - D3 - | D3 - A3 - | A2 - E3 - | D3 - A2 - |`,
            drum: 'k - h h',
        },
        kula: {
            bpm: 168, lead: 'square', leadVol: 0.06,
            mel: `D4 F4 A4 G#4 | D4 F4 A4 G4 | D4 F4 A#4 A4 | D4 F4 A4 F4 | C#4 E4 G4 F4 | C#4 E4 A4 G4 | D4 F4 A4 D5 | C#5 A4 E4 C#4 |`,
            bass: `D2 D2 D3 D2 | D2 D2 D3 D2 | A#1 A#1 A#2 A#1 | A#1 A#1 A#2 A#1 | A1 A1 A2 A1 | A1 A1 A2 A1 | D2 D2 D3 D2 | A1 A1 A2 A1 |`,
            drum: 'k h k h',
        },
        zvijezda: {
            bpm: 190, lead: 'square', leadVol: 0.06,
            mel: `C5 E5 G5 E5 | C5 E5 G5 E5 | D5 F5 A5 F5 | D5 F5 A5 F5 | B4 D5 G5 D5 | B4 D5 G5 D5 | C5 E5 G5 C6 | G5 E5 C5 G4 |`,
            bass: `C3 - C3 - | C3 - C3 - | D3 - D3 - | D3 - D3 - | G2 - G2 - | G2 - G2 - | C3 - C3 - | G2 - G2 - |`,
            drum: 'k h k h',
        },
    };
    const TRACKS = {};
    for (const k in RAW) {
        const r = RAW[k];
        TRACKS[k] = { ...r, melN: parse(r.mel), bassN: parse(r.bass), drumN: r.drum.split(' ') };
    }

    function schedule() {
        if (!track) return;
        const sd = 60 / track.bpm / 2 / rate;
        while (nextTime < ctx.currentTime + 0.15) {
            const t = nextTime;
            const m = track.melN[step % track.melN.length];
            if (m && m.f) tone(musicBus, t, m.f, sd * m.len * 0.92, track.lead, track.leadVol);
            const b = track.bassN[step % track.bassN.length];
            if (b && b.f) tone(musicBus, t, b.f, sd * b.len * 0.85, 'triangle', 0.22);
            const d = track.drumN[step % track.drumN.length];
            if (d === 'k') tone(musicBus, t, 150, 0.08, 'triangle', 0.3, 50);
            else if (d === 'h') noise(musicBus, t, 0.04, 0.12, 7000, 0, 'highpass');
            step++;
            nextTime += sd;
        }
    }

    function music(name) {
        if (!ctx) return;
        stopMusic();
        track = TRACKS[name] || null;
        if (!track) return;
        step = 0; rate = 1; nextTime = ctx.currentTime + 0.05;
        timer = setInterval(schedule, 25);
        schedule();
    }
    function stopMusic() { if (timer) clearInterval(timer); timer = null; track = null; }
    function setRate(r) { rate = r; }
    function toggleMute() {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 0.32;
        return muted;
    }

    return { init, play, music, stopMusic, setRate, toggleMute, get muted() { return muted; } };
})();
