'use strict';

// A tiny WebAudio synth: a polka loop on plucked "tamburica" notes, hoof clops and a few effects. No audio files.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  const semi = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const CHORDS = {
  G: { bass: ['G2', 'D2'], triad: ['G3', 'B3', 'D4'] },
  D: { bass: ['D2', 'A2'], triad: ['F#3', 'A3', 'D4'] },
  C: { bass: ['C2', 'G2'], triad: ['E3', 'G3', 'C4'] },
};
const PROGRESSION = 'G G D D D D G G C C G G D D G G'.split(' ');
const MELODY = (
  'B4 D5 B4 G4 | A4 B4 G4 - | A4 C5 A4 F#4 | G4 A4 F#4 - | D4 F#4 A4 D5 | C5 B4 A4 F#4 | G4 B4 D5 B4 | G4 - G4 - | ' +
  'E5 E5 D5 C5 | E5 G5 E5 C5 | D5 D5 B4 G4 | D5 E5 D5 B4 | A4 B4 C5 A4 | F#4 G4 A4 F#4 | G4 B4 A4 F#4 | G4 D4 G4 -'
).split('|').flatMap(bar => bar.trim().split(/\s+/)).map(n => (n === '-' ? null : n));

const Sound = {
  ctx: null,
  musicOn: true,
  step: 0,
  next: 0,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.6; this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = this.musicOn ? 0.3 : 0; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
    const len = ctx.sampleRate * 0.5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.next = ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 40);
  },

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.music) this.music.gain.setTargetAtTime(this.musicOn ? 0.3 : 0, this.ctx.currentTime, 0.05);
    return this.musicOn;
  },

  tone(freq, t, dur, type, vol, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
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
    const eighth = 60 / 132 / 2;
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
    if (m) { this.pluck(noteFreq(m), t, 0.24, 0.2); this.pluck(noteFreq(m) * 1.004, t + 0.06, 0.16, 0.07); }
    if (beat === 0 || beat === 2) this.tone(noteFreq(chord.bass[beat / 2]), t, 0.28, 'triangle', 0.4, this.music);
    else for (const n of chord.triad) this.tone(noteFreq(n), t, 0.09, 'square', 0.035, this.music);
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  clop(alt) {
    if (!this.ctx) return;
    const t = this.now();
    this.noiseBurst(t, 0.05, alt ? 1900 : 1400, 5, 0.35);
    this.tone(alt ? 640 : 520, t, 0.045, 'sine', 0.18);
  },

  crash() {
    if (!this.ctx) return;
    const t = this.now();
    this.noiseBurst(t, 0.5, 380, 0.7, 0.9, 'lowpass');
    this.tone(85, t, 0.3, 'square', 0.18);
    for (let i = 0; i < 4; i++) this.noiseBurst(t + 0.05 + i * 0.06, 0.05, 900 + i * 300, 6, 0.4);
  },

  whip() {
    if (!this.ctx) return;
    this.noiseBurst(this.now(), 0.09, 3500, 1, 1, 'highpass');
  },

  beep(high) {
    if (!this.ctx) return;
    this.tone(high ? 1320 : 880, this.now(), high ? 0.4 : 0.15, 'square', 0.12);
  },

  checkpoint() {
    if (!this.ctx) return;
    const t = this.now();
    ['G5', 'B5', 'D6', 'G6'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.09, 0.22, 'square', 0.1));
  },

  fanfare() {
    if (!this.ctx) return;
    const t = this.now();
    ['G4', 'B4', 'D5', 'G5', 'D5', 'G5', 'B5', 'D6'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.14, 0.3, 'square', 0.1));
  },

  timeUp() {
    if (!this.ctx) return;
    const t = this.now();
    ['D5', 'C5', 'A4', 'F#4', 'D4'].forEach((n, i) => this.tone(noteFreq(n), t + i * 0.18, 0.3, 'triangle', 0.2));
  },
};
