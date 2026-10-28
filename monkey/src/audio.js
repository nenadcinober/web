// WebAudio synth: plucked "tamburica" voices over a soft bass, plus a few sound effects.
// The tunes are original, in the manner of Podravina folk songs.
const Sound = (() => {
    let ctx = null, master, musicBus, sfxBus, noiseBuf;
    let muted = false;
    let track = null, trackName = null, step = 0, nextTime = 0, timer = null;
    try { muted = localStorage.getItem('monkey.muted') === '1'; } catch (e) { /* storage blocked */ }

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
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.3; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.45; musicBus.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        if (trackName) { const n = trackName; trackName = null; music(n); }
    }

    // a plucked string: bright attack that decays quickly, like a tamburica
    function pluck(bus, t, f, dur, vol, type = 'triangle') {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
        o.type = type; o.frequency.setValueAtTime(f, t);
        o2.type = 'square'; o2.frequency.setValueAtTime(f * 1.003, t);
        fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 6, t); fl.frequency.exponentialRampToValueAtTime(f * 1.5, t + Math.min(dur, 0.4));
        const g2 = ctx.createGain(); g2.gain.value = 0.25;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(vol * 0.35, t + Math.min(dur, 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(bus);
        o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    }

    function tone(bus, t, f, dur, type, vol, f2) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.006);
        g.gain.setValueAtTime(vol, t + dur * 0.6);
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

    const seq = (t, notes, d, vol = 0.2) => notes.forEach((n, i) => n && pluck(sfxBus, t + i * d, freq(n), d * 2, vol));

    const SFX = {
        click: t => tone(sfxBus, t, 1200, 0.03, 'square', 0.03),
        pickup: t => seq(t, ['C5', 'E5', 'G5', 'C6'], 0.07, 0.22),
        learn: t => seq(t, ['G5', 'D6'], 0.08, 0.18),
        point: t => seq(t, ['E5', 'A5'], 0.09, 0.2),
        lose: t => seq(t, ['A4', 'E4'], 0.12, 0.2),
        win: t => seq(t, ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'], 0.09, 0.2),
        bark: t => { noise(sfxBus, t, 0.12, 0.7, 700, 300); tone(sfxBus, t, 260, 0.1, 'sawtooth', 0.1, 140); noise(sfxBus, t + 0.18, 0.12, 0.7, 750, 300); tone(sfxBus, t + 0.18, 280, 0.1, 'sawtooth', 0.1, 150); },
        dig: t => { noise(sfxBus, t, 0.2, 0.6, 500, 150, 'lowpass'); noise(sfxBus, t + 0.05, 0.1, 0.4, 2500); },
        clunk: t => { tone(sfxBus, t, 180, 0.15, 'triangle', 0.5, 70); noise(sfxBus, t, 0.08, 0.3, 1200); },
        door: t => { tone(sfxBus, t, 320, 0.25, 'sawtooth', 0.04, 250); noise(sfxBus, t, 0.3, 0.2, 400, 200, 'lowpass'); },
        splash: t => { noise(sfxBus, t, 1.2, 0.7, 1500, 200); noise(sfxBus, t + 0.2, 0.8, 0.4, 600, 150, 'lowpass'); },
        engine: t => { for (let i = 0; i < 10; i++) tone(sfxBus, t + i * 0.12, 70, 0.11, 'sawtooth', 0.12, 55); },
        gulp: t => { tone(sfxBus, t, 300, 0.1, 'sine', 0.3, 160); tone(sfxBus, t + 0.18, 300, 0.1, 'sine', 0.3, 160); },
        snore: t => noise(sfxBus, t, 0.9, 0.3, 300, 120, 'lowpass'),
        coin: t => { pluck(sfxBus, t, freq('B5'), 0.2, 0.2); pluck(sfxBus, t + 0.08, freq('E6'), 0.5, 0.2); },
    };

    function play(name) {
        if (!ctx || muted || !SFX[name]) return;
        SFX[name](ctx.currentTime + 0.01);
    }

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
        // a lazy village tune for the outdoors
        selo: {
            bpm: 116, vol: 0.2,
            mel: `D5 ~ B4 G4 | A4 B4 C5 A4 | B4 ~ G4 ~ | D4 ~ ~ - | E4 F#4 G4 A4 | B4 ~ A4 G4 | A4 ~ ~ ~ | ~ - - - |
                  D5 ~ B4 G4 | A4 B4 C5 A4 | B4 ~ G4 ~ | E5 ~ D5 - | C5 B4 A4 G4 | A4 ~ F#4 ~ | G4 ~ ~ ~ | ~ - - - |
                  B4 C5 D5 ~ | E5 D5 C5 B4 | C5 ~ A4 ~ | ~ - - - | A4 B4 C5 ~ | D5 C5 B4 A4 | B4 ~ G4 ~ | ~ - - - |
                  E5 ~ D5 C5 | B4 ~ A4 G4 | C5 ~ B4 A4 | B4 ~ ~ - | A4 ~ B4 C5 | D5 ~ F#4 ~ | G4 ~ ~ ~ | ~ - - - |`,
            bass: `G2 - D3 - | D2 - A2 - | G2 - D3 - | G2 - B2 - | C3 - G3 - | G2 - D3 - | D2 - A2 - | D2 - F#2 - |
                   G2 - D3 - | D2 - A2 - | G2 - D3 - | C3 - G2 - | C3 - G3 - | D2 - A2 - | G2 - D3 - | G2 - D3 - |
                   G2 - D3 - | C3 - G3 - | A2 - E3 - | D2 - A2 - | D2 - A2 - | D2 - A2 - | G2 - D3 - | G2 - D3 - |
                   C3 - G3 - | G2 - D3 - | A2 - E3 - | G2 - D3 - | D2 - A2 - | D2 - A2 - | G2 - D3 - | G2 - D3 - |`,
            chord: true,
        },
        // a tavern polka
        birtija: {
            bpm: 150, vol: 0.17,
            mel: `A4 C#5 E5 C#5 | A4 C#5 E5 - | F#5 E5 D5 C#5 | B4 ~ - - | G#4 B4 D5 B4 | G#4 B4 D5 - | E5 D5 C#5 B4 | A4 ~ - - |
                  A4 C#5 E5 C#5 | A4 C#5 E5 - | F#5 G#5 A5 F#5 | E5 ~ - - | D5 F#5 E5 D5 | C#5 E5 D5 C#5 | B4 C#5 D5 G#4 | A4 ~ E4 - |`,
            bass: `A2 - E3 - | A2 - E3 - | D3 - A3 - | E3 - B2 - | E3 - B2 - | E3 - B2 - | E3 - G#2 - | A2 - E3 - |
                   A2 - E3 - | A2 - E3 - | D3 - A3 - | A2 - E3 - | B2 - F#3 - | A2 - E3 - | E3 - B2 - | A2 - E3 - |`,
            chord: true,
        },
        // church: slow and plain
        kapelica: {
            bpm: 72, vol: 0.14,
            mel: `E4 ~ G4 ~ | A4 ~ G4 ~ | E4 ~ D4 ~ | E4 ~ ~ ~ | G4 ~ A4 ~ | B4 ~ A4 G4 | A4 ~ ~ ~ | ~ ~ - - |
                  B4 ~ A4 ~ | G4 ~ E4 ~ | G4 ~ A4 ~ | G4 ~ E4 ~ | D4 ~ E4 ~ | G4 ~ D4 ~ | E4 ~ ~ ~ | ~ ~ - - |`,
            bass: `E2 ~ ~ ~ | A2 ~ ~ ~ | C3 ~ ~ ~ | E2 ~ ~ ~ | C3 ~ ~ ~ | G2 ~ ~ ~ | A2 ~ ~ ~ | A2 ~ ~ ~ |
                   G2 ~ ~ ~ | C3 ~ ~ ~ | C3 ~ ~ ~ | E2 ~ ~ ~ | B2 ~ ~ ~ | G2 ~ ~ ~ | E2 ~ ~ ~ | E2 ~ ~ ~ |`,
        },
        // by the river: a slow waltz feel in 6/8
        drava: {
            bpm: 120, vol: 0.17,
            mel: `D5 ~ ~ A4 ~ B4 | A4 ~ ~ F#4 ~ ~ | G4 ~ ~ E4 ~ F#4 | E4 ~ ~ ~ ~ ~ | F#4 ~ G4 A4 ~ B4 | A4 ~ ~ D5 ~ ~ | C#5 ~ B4 A4 ~ G4 | F#4 ~ ~ ~ ~ ~ |
                  D5 ~ ~ A4 ~ B4 | A4 ~ ~ F#4 ~ ~ | G4 ~ ~ B4 ~ A4 | G4 ~ ~ E4 ~ ~ | F#4 ~ A4 G4 ~ E4 | C#4 ~ ~ E4 ~ ~ | D4 ~ ~ ~ ~ ~ | ~ ~ ~ - - - |`,
            bass: `D3 - A3 - F#3 - | D3 - A3 - F#3 - | G2 - D3 - B2 - | A2 - E3 - C#3 - | D3 - A3 - F#3 - | D3 - A3 - F#3 - | A2 - E3 - C#3 - | D3 - A3 - F#3 - |
                   D3 - A3 - F#3 - | D3 - A3 - F#3 - | G2 - D3 - B2 - | E3 - B2 - G2 - | D3 - A3 - F#3 - | A2 - E3 - C#3 - | D3 - A3 - F#3 - | D3 - A3 - F#3 - |`,
        },
        // the battle of wits
        zafrkancija: {
            bpm: 176, vol: 0.15,
            mel: `D5 F5 A5 F5 | E5 D5 C#5 A4 | D5 F5 A5 F5 | G5 F5 E5 - | C5 E5 G5 E5 | D5 C5 A#4 A4 | A#4 C5 D5 E5 | F5 E5 D5 C#5 |`,
            bass: `D3 A2 D3 A2 | A2 E3 A2 E3 | D3 A2 D3 A2 | A2 E3 A2 C#3 | C3 G2 C3 G2 | A#2 F3 A#2 F3 | G2 D3 A2 E3 | A2 E3 A2 C#3 |`,
            chord: true,
        },
        // the inspector from the city
        direktor: {
            bpm: 96, vol: 0.15,
            mel: `A4 ~ ~ G#4 | A4 ~ C5 ~ | B4 ~ A4 ~ | E4 ~ ~ ~ | F4 ~ ~ E4 | F4 ~ A4 ~ | G#4 ~ ~ ~ | E4 ~ ~ ~ |`,
            bass: `A2 - A2 - | A2 - A2 - | E2 - E2 - | E2 - E2 - | F2 - F2 - | D2 - D2 - | E2 - E2 - | E2 - G#2 - |`,
        },
        // the celebration
        slavlje: {
            bpm: 168, vol: 0.17,
            mel: `G4 B4 D5 B4 | G4 B4 D5 - | E5 D5 C5 B4 | A4 ~ - - | F#4 A4 C5 A4 | F#4 A4 C5 - | D5 C5 B4 A4 | G4 ~ - - |
                  B4 B4 C5 D5 | E5 - D5 - | C5 C5 B4 A4 | B4 - G4 - | A4 A4 B4 C5 | D5 - B4 - | A4 G4 F#4 A4 | G4 ~ G5 - |`,
            bass: `G2 - D3 - | G2 - D3 - | C3 - G3 - | D3 - A2 - | D3 - A2 - | D3 - A2 - | D3 - F#2 - | G2 - D3 - |
                   G2 - D3 - | C3 - G3 - | D3 - A2 - | G2 - D3 - | D3 - A2 - | G2 - D3 - | D3 - A2 - | G2 - D3 - |`,
            chord: true,
        },
    };
    const TRACKS = {};
    for (const k in RAW) {
        const r = RAW[k];
        TRACKS[k] = { ...r, melN: parse(r.mel), bassN: parse(r.bass) };
    }

    function schedule() {
        if (!track || !ctx) return;
        const sd = 60 / track.bpm / 2;
        while (nextTime < ctx.currentTime + 0.15) {
            const t = nextTime;
            const m = track.melN[step % track.melN.length];
            if (m && m.f) pluck(musicBus, t, m.f, sd * m.len * 1.4 + 0.15, track.vol);
            const b = track.bassN[step % track.bassN.length];
            if (b && b.f) {
                tone(musicBus, t, b.f, sd * b.len * 0.9, 'triangle', 0.26);
                // the "bisernica" offbeat chop, a fifth and an octave above the bass
                if (track.chord) {
                    pluck(musicBus, t + sd, b.f * 3, sd * 0.8, 0.05);
                    pluck(musicBus, t + sd, b.f * 4, sd * 0.8, 0.04);
                }
            }
            step++;
            nextTime += sd;
        }
    }

    function music(name) {
        if (name === trackName && timer) return;
        stopMusic();
        trackName = name;
        track = TRACKS[name] || null;
        if (!ctx || !track) return;
        step = 0; nextTime = ctx.currentTime + 0.05;
        timer = setInterval(schedule, 25);
        schedule();
    }
    function stopMusic() { if (timer) clearInterval(timer); timer = null; track = null; trackName = null; }
    function toggleMute() {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 0.3;
        try { localStorage.setItem('monkey.muted', muted ? '1' : '0'); } catch (e) { /* storage blocked */ }
        return muted;
    }

    return { init, play, music, stopMusic, toggleMute, get muted() { return muted; } };
})();
