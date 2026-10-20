'use strict';

// A small WebAudio synth for sound effects and a low ambient drone. No audio files.

const Sfx = D.Sfx = {
  ctx: null,
  muted: false,
  last: {},

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(ctx.destination);
    this.out = ctx.createGain(); this.out.gain.value = 0.8; this.out.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0; this.amb.connect(this.master);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    return this.muted;
  },

  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.2, freq = 1200, type = 'lowpass', slideTo = null, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 45) return;
    this.last[name] = now;
    const S = this;
    switch (name) {
      case 'swing': S.noise(0.14, 0.18, 900, 'bandpass', 2400); break;
      case 'hit': S.noise(0.1, 0.35, 700, 'lowpass', 200); S.tone(110, 0.1, 'square', 0.08, 60); break;
      case 'crit': S.noise(0.15, 0.4, 1400, 'lowpass', 200); S.tone(220, 0.15, 'square', 0.1, 80); break;
      case 'hurt': S.tone(180, 0.18, 'sawtooth', 0.12, 90); S.noise(0.08, 0.2, 500); break;
      case 'arrow': S.noise(0.12, 0.15, 3000, 'highpass', 1200); S.tone(500, 0.06, 'triangle', 0.05, 300); break;
      case 'fire': S.noise(0.35, 0.22, 400, 'lowpass', 2000); S.tone(90, 0.3, 'sawtooth', 0.05, 60); break;
      case 'boom': S.noise(0.7, 0.5, 900, 'lowpass', 60); S.tone(70, 0.6, 'sine', 0.3, 30); break;
      case 'frost': S.noise(0.5, 0.2, 5000, 'highpass', 2000); S.tone(1200, 0.4, 'sine', 0.05, 2400); break;
      case 'zap': S.noise(0.25, 0.25, 3000, 'bandpass', 6000); S.tone(900, 0.2, 'square', 0.05, 200); break;
      case 'spark': S.tone(800, 0.12, 'triangle', 0.08, 1600); break;
      case 'shout': S.tone(160, 0.5, 'sawtooth', 0.15, 110); S.tone(240, 0.5, 'sawtooth', 0.1, 150); S.noise(0.4, 0.15, 600); break;
      case 'leap': S.noise(0.3, 0.15, 400, 'bandpass', 1500); break;
      case 'mdie': S.tone(200, 0.35, 'sawtooth', 0.1, 50); S.noise(0.25, 0.15, 600, 'lowpass', 100); break;
      case 'pdie': S.tone(220, 1.2, 'sawtooth', 0.2, 40); S.noise(1, 0.2, 400, 'lowpass', 60); break;
      case 'gold': S.tone(1800, 0.08, 'square', 0.04); S.tone(2400, 0.1, 'square', 0.04, null, 0.06); break;
      case 'pickup': S.tone(500, 0.08, 'triangle', 0.1, 700); break;
      case 'drop': S.tone(300, 0.12, 'triangle', 0.08, 150); break;
      case 'unique': S.tone(523, 0.3, 'sine', 0.12); S.tone(784, 0.4, 'sine', 0.1, null, 0.12); S.tone(1046, 0.5, 'sine', 0.1, null, 0.24); break;
      case 'potion': S.noise(0.3, 0.15, 500, 'bandpass', 1500); S.tone(300, 0.25, 'sine', 0.06, 600); break;
      case 'level': [392, 523, 659, 784].forEach((f, i) => S.tone(f, 0.45, 'triangle', 0.12, null, i * 0.1)); break;
      case 'portal': S.tone(200, 0.8, 'sine', 0.12, 900); S.noise(0.8, 0.1, 2000, 'bandpass', 500); break;
      case 'stairs': S.noise(0.4, 0.2, 300, 'lowpass', 100); S.tone(120, 0.4, 'triangle', 0.08, 70); break;
      case 'chest': S.tone(180, 0.15, 'square', 0.06, 140); S.noise(0.2, 0.15, 800); break;
      case 'shrine': [660, 880, 990].forEach((f, i) => S.tone(f, 0.6, 'sine', 0.08, null, i * 0.08)); break;
      case 'click': S.tone(1000, 0.04, 'square', 0.04); break;
      case 'nomana': S.tone(150, 0.12, 'square', 0.05); break;
      case 'roar': S.tone(90, 1.2, 'sawtooth', 0.25, 45); S.tone(130, 1.1, 'sawtooth', 0.15, 60); S.noise(1.1, 0.3, 500, 'lowpass', 120); break;
      case 'slam': S.noise(0.5, 0.5, 600, 'lowpass', 40); S.tone(55, 0.5, 'sine', 0.35, 30); break;
      case 'poison': S.noise(0.4, 0.2, 800, 'bandpass', 300); break;
      case 'victory': [392, 494, 587, 784, 988].forEach((f, i) => S.tone(f, 0.9, 'triangle', 0.12, null, i * 0.16)); break;
    }
  },

  startAmbient() {
    const ctx = this.ctx;
    this.droneOsc = [];
    for (const f of [55, 82.4]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 180;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(flt.frequency);
      const g = ctx.createGain(); g.gain.value = 0.05;
      o.connect(flt); flt.connect(g); g.connect(this.amb);
      o.start(); lfo.start();
      this.droneOsc.push(o);
    }
  },

  setAmbient(theme) {
    if (!this.ctx) return;
    const base = { crypt: 55, caves: 49, hell: 41.2, town: 0 }[theme] || 0;
    const t = this.ctx.currentTime;
    this.amb.gain.setTargetAtTime(base ? 0.9 : 0, t, 0.8);
    if (base) { this.droneOsc[0].frequency.setTargetAtTime(base, t, 0.5); this.droneOsc[1].frequency.setTargetAtTime(base * 1.498, t, 0.5); }
  },
};
