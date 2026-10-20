'use strict';

// A tiny WebAudio synth: a slow tamburica tune, tower shots, hits and fanfares. No audio files.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  const semi = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const CHORDS = {
  D: { bass: ['D2', 'A2'], triad: ['F#3', 'A3', 'D4'] },
  A: { bass: ['A2', 'E2'], triad: ['E3', 'A3', 'C#4'] },
  G: { bass: ['G2', 'D2'], triad: ['G3', 'B3', 'D4'] },
  Bm: { bass: ['B2', 'F#2'], triad: ['F#3', 'B3', 'D4'] },
};
const PROGRESSION = 'D D A A D D G A D D Bm Bm G G A D'.split(' ');
const MELODY = (
  'F#4 - A4 F#4 | D4 - F#4 A4 | E4 - C#4 E4 | A4 - G4 E4 | F#4 A4 D5 - | C#5 B4 A4 F#4 | G4 B4 A4 G4 | E4 - - - | ' +
  'A4 - D5 C#5 | B4 A4 F#4 A4 | B4 - D5 B4 | F#4 - E4 D4 | G4 - B4 G4 | E4 - G4 B4 | A4 G4 E4 C#4 | D4 - D4 -'
).split('|').flatMap(bar => bar.trim().split(/\s+/)).map(n => (n === '-' ? null : n));

const Sound = {
  ctx: null,
  musicOn: true,
  sfxOn: true,
  step: 0,
  next: 0,
  lastShot: {},

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = this.musicOn ? 0.25 : 0; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.6; this.sfx.connect(this.master);
    const len = ctx.sampleRate * 0.5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.next = ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 40);
  },

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.music) this.music.gain.setTargetAtTime(this.musicOn ? 0.25 : 0, this.ctx.currentTime, 0.05);
    return this.musicOn;
  },

  tone(freq, t, dur, type, vol, dest, slideTo) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  },

  pluck(freq, t, dur, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 6, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.music);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noiseBurst(t, dur, freq, q, vol, type = 'bandpass') {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx);
    s.start(t); s.stop(t + dur + 0.02);
  },

  schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    const eighth = 60 / 112 / 2;
    // after the tab was in the background, skip ahead instead of playing the backlog all at once
    if (this.next < ctx.currentTime - 0.2) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.15) {
      if (this.musicOn) this.playStep(this.step, this.next);
      this.next += eighth;
      this.step = (this.step + 1) % MELODY.length;
    }
  },

  playStep(step, t) {
    const beat = step % 4, chord = CHORDS[PROGRESSION[Math.floor(step / 4)]];
    const m = MELODY[step];
    if (m) { this.pluck(noteFreq(m), t, 0.3, 0.17); this.pluck(noteFreq(m) * 1.005, t + 0.07, 0.2, 0.06); }
    if (beat === 0 || beat === 2) this.tone(noteFreq(chord.bass[beat / 2]), t, 0.3, 'triangle', 0.35, this.music);
    else for (const n of chord.triad) this.tone(noteFreq(n), t, 0.08, 'square', 0.025, this.music);
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  // Shots are rate-limited per kind so twenty towers firing at once stay a patter, not a roar.
  ok(kind, gap) {
    if (!this.ctx || !this.sfxOn) return false;
    const t = this.now();
    if ((this.lastShot[kind] || 0) + gap > t) return false;
    this.lastShot[kind] = t;
    return true;
  },

  shot(kind) {
    if (!this.ok(kind, 0.07)) return;
    const t = this.now();
    switch (kind) {
      case 'dudek': this.noiseBurst(t, 0.06, 2600, 2, 0.25, 'highpass'); break;
      case 'regica': this.tone(220, t, 0.15, 'triangle', 0.25, null, 120); break;
      case 'lovec': this.noiseBurst(t, 0.18, 700, 0.8, 0.7, 'lowpass'); this.tone(90, t, 0.12, 'square', 0.15); break;
      case 'pcele': this.tone(300, t, 0.2, 'sawtooth', 0.04, null, 340); break;
      case 'zvono':
        [1, 2.76, 5.4].forEach((m, i) => this.tone(392 * m, t, 1.2 - i * 0.3, 'sine', 0.18 / (i + 1)));
        break;
    }
  },

  boom() {
    if (!this.ok('boom', 0.09)) return;
    const t = this.now();
    this.noiseBurst(t, 0.25, 400, 0.7, 0.5, 'lowpass');
    this.tone(160, t, 0.12, 'triangle', 0.2, null, 60);
  },

  pop() {
    if (!this.ok('pop', 0.05)) return;
    this.tone(700 + Math.random() * 300, this.now(), 0.07, 'square', 0.06, null, 300);
  },

  leak() {
    if (!this.ok('leak', 0.2)) return;
    const t = this.now();
    this.tone(330, t, 0.25, 'sawtooth', 0.15, null, 160);
    this.tone(220, t + 0.15, 0.3, 'sawtooth', 0.12, null, 110);
  },

  build() {
    if (!this.ok('build', 0.05)) return;
    const t = this.now();
    this.noiseBurst(t, 0.06, 900, 3, 0.4);
    this.noiseBurst(t + 0.1, 0.06, 1100, 3, 0.4);
  },

  coin() {
    if (!this.ok('coin', 0.05)) return;
    const t = this.now();
    this.tone(noteFreq('B5'), t, 0.08, 'square', 0.07);
    this.tone(noteFreq('E6'), t + 0.07, 0.18, 'square', 0.07);
  },

  click() {
    if (!this.ok('click', 0.03)) return;
    this.tone(1200, this.now(), 0.03, 'square', 0.05);
  },

  deny() {
    if (!this.ok('deny', 0.1)) return;
    this.tone(140, this.now(), 0.15, 'square', 0.1);
  },

  waveStart() {
    if (!this.ctx) return;
    const t = this.now();
    ['D4', 'F#4', 'A4', 'D5'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.1, 0.25, 'square', 0.08));
  },

  boss() {
    if (!this.ctx) return;
    const t = this.now();
    ['D3', 'C#3', 'C3', 'B2'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.25, 0.4, 'sawtooth', 0.12));
  },

  fanfare() {
    if (!this.ctx) return;
    const t = this.now();
    ['D4', 'F#4', 'A4', 'D5', 'A4', 'D5', 'F#5', 'A5'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.14, 0.3, 'square', 0.1));
  },

  lose() {
    if (!this.ctx) return;
    const t = this.now();
    ['A4', 'G4', 'E4', 'C#4', 'A3'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.22, 0.35, 'triangle', 0.2));
  },
};
