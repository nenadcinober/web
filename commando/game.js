'use strict';

// Commando: Marko — top-down run-and-gun through three missions of the Croatian War of
// Independence. Everything is drawn into textures at boot; there are no asset files.

const W = 1024, H = 768;
const FORT_Y = 230;            // centre line of the fortress wall at the top of every level
const FONT = '"Courier New", Courier, monospace';
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Phaser.Math.Between(a, b);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const LEVELS = [
  {
    name: 'MISIJA 1: VUKOVAR', short: 'VUKOVAR 1991.', when: 'jesen 1991.',
    brief: ['Grad je pod opsadom. Probij se kroz porušene ulice,',
            'spasi civile i uništi neprijateljsko uporište na kraju grada.'],
    ground: 'g1', buildTex: 'brick', obstacles: ['building', 'building', 'sandbag', 'car', 'sandbag'],
    length: 6400, bunker: 0.22, tank: 0.06, spawnEvery: 2600, enemyFire: 1900, turrets: 2, gateHp: 50,
  },
  {
    name: 'MISIJA 2: MASLENICA', short: 'MASLENICA 1993.', when: 'siječanj 1993.',
    brief: ['Kamenjar iznad Masleničkog mosta. Očisti uporišta',
            'i otvori put koji spaja sjever i jug Hrvatske.'],
    ground: 'g2', buildTex: 'stone', obstacles: ['stonewall', 'rock', 'rock', 'bush', 'sandbag'],
    length: 7200, bunker: 0.26, tank: 0.12, spawnEvery: 2200, enemyFire: 1650, turrets: 3, gateHp: 70,
  },
  {
    name: 'MISIJA 3: OLUJA — KNIN', short: 'KNIN 1995.', when: 'kolovoz 1995.',
    brief: ['Počela je Operacija Oluja. Probij liniju obrane',
            'i stigni do kninske tvrđave. Zastava čeka!'],
    ground: 'g3', buildTex: 'plaster', obstacles: ['tree', 'tree', 'building', 'sandbag', 'car'],
    length: 8000, bunker: 0.28, tank: 0.18, spawnEvery: 1900, enemyFire: 1450, turrets: 4, gateHp: 90,
  },
];

const txt = (scene, x, y, s, size, color = '#ffffff', extra = {}) =>
  scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color,
    stroke: '#000000', strokeThickness: Math.max(3, Math.round(size / 6)), align: 'center', ...extra,
  });

// ---------------------------------------------------------------- sound

const Sfx = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  noise(dur, freq, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  shot() { this.noise(0.07, 3200, 0.22); },
  eshot() { this.noise(0.06, 1400, 0.1); },
  boom() { this.noise(0.6, 900, 0.7); this.tone(70, 0.4, 'sine', 0.4, -40); },
  hurt() { this.tone(220, 0.15, 'sawtooth', 0.15, -120); },
  pickup() { this.tone(660, 0.08, 'square', 0.1); this.tone(990, 0.1, 'square', 0.1, 0, 0.08); },
  rescue() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.18, 0, i * 0.09)); },
  throw() { this.tone(500, 0.15, 'triangle', 0.1, -300); },
  win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'square', 0.1, 0, i * 0.16)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, 0, i * 0.25)); },
};

// ---------------------------------------------------------------- art

// Croatian flag with a simplified chequered coat of arms, drawn with its top-left at (x, y).
function drawFlag(g, x, y, w, h) {
  g.fillStyle(0xd52b1e); g.fillRect(x, y, w, h / 3);
  g.fillStyle(0xffffff); g.fillRect(x, y + h / 3, w, h / 3);
  g.fillStyle(0x171796); g.fillRect(x, y + 2 * h / 3, w, h / 3);
  const s = h * 0.085, sx = x + w / 2 - 2.5 * s, sy = y + h / 2 - 2.2 * s;
  const crown = [0x5aa0e0, 0x1d3f8f, 0x5aa0e0, 0x1d3f8f, 0x5aa0e0];
  crown.forEach((c, i) => { g.fillStyle(c); g.fillRect(sx + i * s, sy - s, s, s * 0.9); });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    g.fillStyle((r + c) % 2 ? 0xffffff : 0xd52b1e);
    g.fillRect(sx + c * s, sy + r * s, s, s);
  }
  g.fillStyle(0xd52b1e); g.fillTriangle(sx, sy + 5 * s, sx + 5 * s, sy + 5 * s, sx + 2.5 * s, sy + 6.2 * s);
  g.lineStyle(1.5, 0xd52b1e); g.strokeRect(sx, sy, 5 * s, 5 * s);
}

function makeTextures(s) {
  const T = (key, w, h, draw) => {
    const g = s.make.graphics({ add: false });
    draw(g); g.generateTexture(key, w, h); g.destroy();
  };

  // Soldiers are drawn top-down facing right, so sprite.rotation is the aim angle.
  const soldier = (body, dark, light, helmet, helmetHi, patch) => g => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(21, 22, 30, 34);
    g.fillStyle(dark); g.fillRoundedRect(5, 11, 9, 18, 3);
    g.fillStyle(body); g.fillEllipse(18, 20, 22, 32);
    g.fillStyle(dark); g.fillCircle(13, 12, 3); g.fillCircle(21, 28, 3); g.fillCircle(11, 25, 2);
    g.fillStyle(light); g.fillCircle(20, 11, 2); g.fillCircle(15, 21, 2);
    g.fillStyle(body); g.fillEllipse(26, 14, 13, 7); g.fillEllipse(25, 26, 12, 7);
    g.fillStyle(0x5a3a1e); g.fillRect(17, 18, 7, 4);
    g.fillStyle(0x1b1b1b); g.fillRect(23, 18, 17, 4); g.fillRect(27, 22, 3, 4);
    g.fillStyle(0xd9a77c); g.fillCircle(31, 17, 2.5); g.fillCircle(25, 23, 2.5);
    g.lineStyle(2, 0x111111, 0.9); g.strokeEllipse(18, 20, 22, 32);
    g.fillStyle(helmet); g.fillCircle(19, 20, 8.5);
    g.lineStyle(1.5, 0x111111, 0.9); g.strokeCircle(19, 20, 8.5);
    g.fillStyle(helmetHi); g.fillCircle(17.5, 18.5, 5.5);
    if (patch) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      g.fillStyle((r + c) % 2 ? 0xffffff : 0xd52b1e); g.fillRect(13 + c * 2, 5 + r * 2, 2, 2);
    }
  };
  T('marko', 40, 40, soldier(0x3f6b3a, 0x284a26, 0x86a85a, 0x243a20, 0x3f6a38, true));
  T('enemy', 40, 40, soldier(0x7a7466, 0x55514a, 0x948e7e, 0x3c3c38, 0x55554f, false));

  T('civil', 30, 30, g => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(16, 17, 26, 24);
    g.fillStyle(0x3b6fb5); g.fillEllipse(15, 17, 22, 18);
    g.fillStyle(0x2a4f85); g.fillRect(6, 21, 18, 5);
    g.fillStyle(0xe0b48a); g.fillCircle(15, 11, 6);
    g.fillStyle(0x4a3020); g.fillEllipse(15, 8, 12, 7);
  });

  T('bunker', 64, 64, g => {
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(6, 8, 58, 56, 10);
    g.fillStyle(0xb8a47a); g.fillRoundedRect(2, 2, 58, 58, 12);
    g.lineStyle(2, 0x8a7752); for (let i = 10; i < 58; i += 12) { g.lineBetween(i, 3, i, 9); g.lineBetween(i, 53, i, 59); g.lineBetween(3, i, 9, i); g.lineBetween(53, i, 59, i); }
    g.fillStyle(0x8a8a84); g.fillRoundedRect(9, 9, 44, 44, 8);
    g.fillStyle(0x6d6d66); g.fillRoundedRect(15, 15, 32, 32, 6);
    g.lineStyle(2, 0x55554f); g.strokeRoundedRect(9, 9, 44, 44, 8);
  });
  T('mg', 40, 12, g => {
    g.fillStyle(0x2a2a2a); g.fillCircle(8, 6, 6); g.fillRect(8, 4, 32, 4);
    g.fillStyle(0x444444); g.fillCircle(7, 5, 3);
  });

  // Tank hull faces down (it only drives south); the turret faces right and rotates.
  T('tank', 52, 76, g => {
    g.fillStyle(0x000000, 0.3); g.fillRect(4, 6, 50, 72);
    g.fillStyle(0x222222); g.fillRect(0, 0, 13, 76); g.fillRect(39, 0, 13, 76);
    g.fillStyle(0x3a3a3a); for (let y = 2; y < 74; y += 6) { g.fillRect(1, y, 11, 3); g.fillRect(40, y, 11, 3); }
    g.fillStyle(0x5b6146); g.fillRect(9, 6, 34, 64);
    g.fillStyle(0x6c7354); g.fillRect(11, 58, 30, 10);
    g.fillStyle(0x474c37); g.fillRect(13, 8, 26, 8);
    g.lineStyle(1, 0x3a3f2c); for (let x = 15; x < 38; x += 4) g.lineBetween(x, 9, x, 15);
  });
  T('turret', 60, 30, g => {
    g.fillStyle(0x2d3024); g.fillRect(22, 12, 38, 6);
    g.fillStyle(0x4a503a); g.fillCircle(15, 15, 14);
    g.fillStyle(0x5c6348); g.fillCircle(13, 13, 7);
    g.fillStyle(0x2d3024); g.fillRect(55, 11, 5, 8);
  });
  T('gate', 120, 60, g => {
    g.fillStyle(0x6b4a2b); g.fillRect(0, 0, 120, 60);
    g.lineStyle(2, 0x4a321c); for (let x = 12; x < 120; x += 12) g.lineBetween(x, 0, x, 60);
    g.fillStyle(0x3b3b3b); g.fillRect(0, 10, 120, 6); g.fillRect(0, 44, 120, 6);
    g.fillStyle(0x999999); for (let x = 6; x < 120; x += 12) { g.fillCircle(x, 13, 1.5); g.fillCircle(x, 47, 1.5); }
    g.lineStyle(3, 0x2a1c10); g.strokeRect(1, 1, 118, 58);
  });

  T('fortwall', 64, 64, g => {
    g.fillStyle(0x8f8574); g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 14; i++) { g.fillStyle(pick([0x9c9282, 0x82796a])); g.fillRect(ri(0, 60), ri(0, 60), ri(2, 5), ri(2, 4)); }
    g.lineStyle(2, 0x6a6152);
    for (let r = 0; r < 4; r++) {
      const y = r * 16; g.lineBetween(0, y, 64, y);
      for (let x = (r % 2) * 16; x <= 64; x += 32) g.lineBetween(x, y, x, y + 16);
    }
  });
  T('brick', 64, 64, g => {
    g.fillStyle(0x8a4b38); g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0x5e3326);
    for (let r = 0; r < 8; r++) {
      const y = r * 8; g.lineBetween(0, y, 64, y);
      for (let x = (r % 2) * 8; x <= 64; x += 16) g.lineBetween(x, y, x, y + 8);
    }
    for (let i = 0; i < 4; i++) { g.fillStyle(0x3d2a22, 0.7); g.fillCircle(ri(4, 60), ri(4, 60), ri(3, 7)); }
  });
  T('plaster', 64, 64, g => {
    g.fillStyle(0xcfc3a5); g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 60; i++) { g.fillStyle(pick([0xbdb093, 0xddd3b8, 0xc6b998])); g.fillRect(ri(0, 62), ri(0, 62), 2, 2); }
    g.lineStyle(1, 0x9a8f74); g.lineBetween(10, 5, 18, 20); g.lineBetween(18, 20, 14, 30); g.lineBetween(44, 40, 55, 52);
    g.fillStyle(0x7a3b2a, 0.5); g.fillRect(0, 0, 64, 4);
  });
  T('stone', 64, 22, g => {
    g.fillStyle(0x7d796c); g.fillRect(0, 0, 64, 22);
    for (let i = 0; i < 12; i++) { g.fillStyle(pick([0xa7a394, 0x9a9686, 0xb5b1a2])); g.fillEllipse(ri(4, 60), ri(4, 18), ri(10, 16), ri(7, 10)); }
  });
  T('sandbag', 32, 24, g => {
    g.fillStyle(0x8a7752); g.fillRoundedRect(1, 1, 30, 10, 4); g.fillRoundedRect(-15, 13, 30, 10, 4); g.fillRoundedRect(17, 13, 30, 10, 4);
    g.fillStyle(0xbfa97c); g.fillRoundedRect(2, 2, 28, 7, 3); g.fillRoundedRect(-14, 14, 28, 7, 3); g.fillRoundedRect(18, 14, 28, 7, 3);
  });
  T('tree', 56, 56, g => {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(31, 32, 50, 46);
    g.fillStyle(0x2f5e22); g.fillCircle(28, 28, 24);
    g.fillStyle(0x3d7530); g.fillCircle(22, 22, 12); g.fillCircle(35, 27, 11); g.fillCircle(26, 36, 10);
    g.fillStyle(0x4f8a3c); g.fillCircle(20, 19, 5); g.fillCircle(33, 22, 4);
  });
  T('bush', 40, 40, g => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(22, 23, 36, 32);
    g.fillStyle(0x5d6b2c); g.fillCircle(20, 20, 17);
    g.fillStyle(0x76853a); g.fillCircle(15, 16, 8); g.fillCircle(26, 22, 7);
  });
  T('rock', 48, 48, g => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(27, 28, 44, 40);
    g.fillStyle(0x7f7d75); g.fillPoints([{ x: 6, y: 20 }, { x: 16, y: 5 }, { x: 34, y: 4 }, { x: 44, y: 18 }, { x: 40, y: 40 }, { x: 18, y: 44 }, { x: 5, y: 34 }], true);
    g.fillStyle(0x9d9b92); g.fillPoints([{ x: 14, y: 12 }, { x: 30, y: 8 }, { x: 36, y: 18 }, { x: 22, y: 24 }], true);
  });
  T('car', 80, 40, g => {
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(5, 7, 76, 32, 8);
    g.fillStyle(0x2e2a27); g.fillRoundedRect(2, 4, 76, 32, 8);
    g.fillStyle(0x5b3a24); g.fillRoundedRect(6, 8, 18, 24, 4);
    g.fillStyle(0x161413); g.fillRect(28, 8, 10, 24); g.fillRect(56, 8, 8, 24);
    g.fillStyle(0x433c36); g.fillRect(38, 8, 18, 24);
    g.fillStyle(0x7a4a2a); g.fillCircle(70, 12, 3); g.fillCircle(46, 30, 4); g.fillCircle(14, 26, 3);
  });
  T('barrel', 26, 26, g => {
    g.fillStyle(0x000000, 0.3); g.fillCircle(15, 15, 12);
    g.fillStyle(0x7a1f15); g.fillCircle(13, 13, 12);
    g.fillStyle(0xb33a2a); g.fillCircle(13, 13, 10);
    g.lineStyle(2, 0x7a1f15); g.strokeCircle(13, 13, 6);
    g.fillStyle(0xe8c04a); g.fillCircle(9, 9, 2);
  });
  T('crater', 64, 64, g => {
    g.fillStyle(0x000000, 0.22); g.fillEllipse(32, 32, 62, 54);
    g.fillStyle(0x000000, 0.25); g.fillEllipse(32, 33, 40, 34);
    g.fillStyle(0x000000, 0.2); g.fillEllipse(33, 34, 20, 16);
  });
  T('debris', 40, 40, g => {
    for (let i = 0; i < 9; i++) { g.fillStyle(pick([0x5a5550, 0x6e6860, 0x7a4a38, 0x44403b])); g.fillRect(ri(2, 32), ri(2, 32), ri(3, 9), ri(3, 7)); }
  });

  T('bullet', 12, 4, g => { g.fillStyle(0xfff2a0); g.fillRect(0, 0, 12, 4); g.fillStyle(0xffffff); g.fillRect(6, 1, 6, 2); });
  T('ebullet', 8, 8, g => { g.fillStyle(0xff6a1a); g.fillCircle(4, 4, 4); g.fillStyle(0xffe08a); g.fillCircle(4, 4, 2); });
  T('shell', 14, 14, g => { g.fillStyle(0xff8a2a); g.fillCircle(7, 7, 7); g.fillStyle(0x332b20); g.fillCircle(7, 7, 4.5); });
  T('grenade', 12, 12, g => {
    g.fillStyle(0x2f3b1a); g.fillCircle(6, 6, 5.5);
    g.fillStyle(0x56692f); g.fillCircle(4.5, 4.5, 2);
    g.fillStyle(0x888888); g.fillRect(5, 0, 3, 3);
  });
  T('spark', 8, 8, g => { g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); });
  T('smoke', 32, 32, g => { g.fillStyle(0xffffff, 0.6); g.fillCircle(16, 16, 15); });

  T('medkit', 24, 24, g => {
    g.fillStyle(0xffffff); g.fillRoundedRect(0, 0, 24, 24, 4);
    g.fillStyle(0xd52b1e); g.fillRect(9, 4, 6, 16); g.fillRect(4, 9, 16, 6);
    g.lineStyle(2, 0x999999); g.strokeRoundedRect(1, 1, 22, 22, 4);
  });
  T('nadebox', 28, 22, g => {
    g.fillStyle(0x4b5a2a); g.fillRect(0, 0, 28, 22);
    g.lineStyle(2, 0x2f3b1a); g.strokeRect(1, 1, 26, 20);
    g.fillStyle(0x222222); [7, 14, 21].forEach(x => g.fillCircle(x, 11, 3.5));
  });
  T('rapid', 24, 24, g => {
    g.fillStyle(0x2b6cb0); g.fillRoundedRect(0, 0, 24, 24, 4);
    g.fillStyle(0xffe28a); g.fillTriangle(5, 12, 12, 4, 19, 12); g.fillTriangle(5, 20, 12, 12, 19, 20);
  });
  T('spread', 24, 24, g => {
    g.fillStyle(0xd9741e); g.fillRoundedRect(0, 0, 24, 24, 4);
    g.lineStyle(3, 0xffffff); g.lineBetween(12, 20, 12, 4); g.lineBetween(12, 20, 4, 7); g.lineBetween(12, 20, 20, 7);
  });

  const ground = (key, base, specks, extra) => T(key, 256, 256, g => {
    g.fillStyle(base); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 700; i++) { g.fillStyle(pick(specks), rnd(0.5, 1)); g.fillRect(ri(0, 254), ri(0, 254), ri(1, 4), ri(1, 4)); }
    extra(g);
  });
  ground('g1', 0x6b655b, [0x5c564d, 0x7a7468, 0x625c52, 0x847d70, 0x575048], g => {
    g.lineStyle(1, 0x4a453d, 0.8);
    for (let i = 0; i < 6; i++) {
      let x = ri(20, 236), y = ri(20, 236);
      for (let j = 0; j < 5; j++) { const nx = x + ri(-20, 20), ny = y + ri(-20, 20); g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
    }
  });
  ground('g2', 0xa59c84, [0x958c74, 0xb3aa92, 0x8a8a6a, 0x9c9f6f, 0xbcb59e], g => {
    for (let i = 0; i < 18; i++) { g.fillStyle(pick([0x8e8a7e, 0xc4c0b3, 0x7d7a70])); g.fillEllipse(ri(8, 248), ri(8, 248), ri(4, 12), ri(3, 8)); }
    for (let i = 0; i < 25; i++) { g.fillStyle(0x7f8545); g.fillCircle(ri(4, 252), ri(4, 252), ri(2, 4)); }
  });
  ground('g3', 0x7a8c3c, [0x6a7c32, 0x8a9c48, 0x718436, 0x93a352, 0x667530], g => {
    for (let i = 0; i < 6; i++) { g.fillStyle(0x8a7a50, 0.5); g.fillEllipse(ri(30, 226), ri(30, 226), ri(20, 50), ri(12, 30)); }
  });
}

// ---------------------------------------------------------------- scenes

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() { makeTextures(this); this.scene.start('menu'); }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  create() {
    this.add.tileSprite(0, 0, W, H, 'g3').setOrigin(0).setTint(0x777777);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);
    drawFlag(this.add.graphics(), W / 2 - 90, 70, 180, 90);
    txt(this, W / 2, 230, 'COMMANDO', 90, '#ffe28a', { strokeThickness: 10 }).setOrigin(0.5);
    txt(this, W / 2, 300, 'MARKO  ·  Domovinski rat 1991. – 1995.', 26, '#ffffff').setOrigin(0.5);
    const m = this.add.image(W / 2, 400, 'marko').setScale(3).setAngle(-90);
    this.tweens.add({ targets: m, y: 392, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    txt(this, W / 2, 545, [
      'Kretanje ............ WASD / strelice',
      'Pucanje ............. SPACE / J  ili lijevi klik (miš nišani)',
      'Bomba ............... G / K  ili desni klik',
      'Pauza / zvuk ........ P / M',
    ].join('\n'), 19, '#dddddd', { align: 'left', lineSpacing: 8 }).setOrigin(0.5);
    const go = txt(this, W / 2, 690, 'ENTER ili klik — kreni u akciju', 28, '#ffe28a').setOrigin(0.5);
    this.tweens.add({ targets: go, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    const start = () => { Sfx.init(); this.scene.start('game', { level: 0, score: 0, lives: 3, grenades: 5 }); };
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(d) {
    this.levelIdx = d.level || 0;
    this.L = LEVELS[this.levelIdx];
    this.score = d.score || 0;
    this.lives = d.lives ?? 3;
    this.grenades = d.grenades ?? 5;
  }

  create() {
    const L = this.L;
    this.LEN = L.length;
    this.physics.world.setBounds(0, 0, W, this.LEN);
    this.cameras.main.setBounds(0, 0, W, this.LEN);
    this.cameras.main.scrollY = this.LEN - H;
    this.add.tileSprite(0, 0, W, this.LEN, L.ground).setOrigin(0).setDepth(0);

    this.walls = this.physics.add.staticGroup();
    this.barrels = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.pBullets = this.physics.add.group();
    this.eBullets = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.civils = this.physics.add.group();

    this.player = this.physics.add.sprite(W / 2, this.LEN - 120, 'marko').setDepth(5);
    this.player.body.setCircle(13, 7, 7);
    this.player.setCollideWorldBounds(true);
    this.facing = -Math.PI / 2;
    this.player.rotation = this.facing;
    this.hp = 100; this.invulnUntil = 0; this.nextShot = 0; this.nextNade = 0;
    this.weapon = 'normal'; this.weaponUntil = 0; this.rescued = 0;
    this.lastMouseMove = -99999; this.nextAmbient = 0;

    this.buildLevel();
    this.setupColliders();
    this.setupInput();
    this.setupHud();
    this.showIntro();
  }

  // ------------------------------------------------ level

  buildLevel() {
    const L = this.L, LEN = this.LEN;

    for (let i = 0; i < LEN / 160; i++) {
      this.add.image(rnd(0, W), rnd(FORT_Y + 80, LEN), Math.random() < 0.6 ? 'crater' : 'debris')
        .setDepth(1).setAlpha(0.8).setAngle(rnd(0, 360)).setScale(rnd(0.6, 1.3));
    }

    // Rows of cover. Objects in a row keep 80px apart and rows keep a corridor between them,
    // so there is always a way through.
    for (let y = LEN - 330; y > FORT_Y + 420; y -= ri(200, 270)) {
      const placed = [];
      const n = ri(1, 3);
      for (let i = 0; i < n; i++) {
        const type = pick(L.obstacles), sz = this.obstacleSize(type);
        for (let tries = 0; tries < 6; tries++) {
          const x = ri(20 + sz.w / 2, W - 20 - sz.w / 2);
          if (placed.some(p => Math.abs(p.x - x) < (p.w + sz.w) / 2 + 80)) continue;
          placed.push({ x, w: sz.w });
          this.addObstacle(type, x, y + ri(-20, 20), sz);
          break;
        }
      }
      if (Math.random() < 0.35) {
        const spot = this.freeSpot(y - 100, 30);
        if (spot) this.barrels.create(spot.x, spot.y, 'barrel').setDepth(3);
      }
    }

    this.buildFortress();

    // Scripted encounters, triggered as the camera reaches them (sorted bottom to top).
    this.spawns = [];
    for (let y = LEN - 1000; y > FORT_Y + 520; y -= ri(260, 420)) {
      const r = Math.random();
      const kind = r < L.bunker ? 'bunker' : r < L.bunker + L.tank ? 'tank' : 'squad';
      this.spawns.push({ y, kind });
    }
    this.spawnIdx = 0;

    for (let y = LEN - 900; y > FORT_Y + 600; y -= ri(900, 1300)) {
      const spot = this.freeSpot(y, 34);
      if (!spot) continue;
      const c = this.civils.create(spot.x, spot.y, 'civil').setDepth(2);
      c.body.setImmovable(true);
      const label = txt(this, spot.x, spot.y - 26, 'POMOĆ!', 13, '#ffffff').setOrigin(0.5).setDepth(9);
      this.tweens.add({ targets: label, y: spot.y - 32, duration: 500, yoyo: true, repeat: -1 });
      c.setData('label', label);
    }
  }

  obstacleSize(type) {
    switch (type) {
      case 'building': return { w: ri(110, 220), h: ri(70, 110) };
      case 'sandbag': return { w: ri(3, 5) * 32, h: 24 };
      case 'stonewall': return { w: ri(4, 8) * 32, h: 22 };
      case 'car': return { w: 80, h: 40 };
      case 'tree': return { w: 56, h: 56 };
      case 'rock': return { w: 48, h: 48 };
      default: return { w: 40, h: 40 };
    }
  }

  addObstacle(type, x, y, sz) {
    if (type === 'building' || type === 'sandbag' || type === 'stonewall') {
      const key = type === 'building' ? this.L.buildTex : type === 'sandbag' ? 'sandbag' : 'stone';
      if (type === 'building') this.add.rectangle(x + 7, y + 9, sz.w, sz.h, 0x000000, 0.3).setDepth(2);
      const o = this.add.tileSprite(x, y, sz.w, sz.h, key).setDepth(3);
      this.walls.add(o);
      if (type === 'building') this.add.rectangle(x, y, sz.w, sz.h).setStrokeStyle(4, 0x000000, 0.35).setDepth(3);
    } else {
      const o = this.add.image(x, y, type).setDepth(type === 'tree' ? 6 : 3);
      if (type === 'car') o.setFlipX(Math.random() < 0.5);
      this.walls.add(o);
    }
  }

  // A random spot near row y whose square of size `size` is clear of every body.
  freeSpot(y, size) {
    for (let i = 0; i < 10; i++) {
      const x = ri(50, W - 50), yy = y + ri(-60, 60);
      if (this.physics.overlapRect(x - size / 2, yy - size / 2, size, size, true, true).length === 0) return { x, y: yy };
    }
    return null;
  }

  buildFortress() {
    const L = this.L, gw = 130, gx = W / 2;
    this.add.rectangle(W / 2, (FORT_Y - 35) / 2, W, FORT_Y - 35, 0x3a342c, 0.55).setDepth(1);
    const left = this.add.tileSprite((gx - gw / 2) / 2, FORT_Y, gx - gw / 2, 70, 'fortwall').setDepth(3);
    const right = this.add.tileSprite(gx + gw / 2 + (W - gx - gw / 2) / 2, FORT_Y, W - gx - gw / 2, 70, 'fortwall').setDepth(3);
    this.walls.add(left); this.walls.add(right);
    for (let x = 0; x < W; x += 32) {
      if (Math.abs(x + 9 - gx) < gw / 2 + 10) continue;
      this.add.rectangle(x + 9, FORT_Y - 42, 18, 14, 0x7a7262).setDepth(3);
    }
    txt(this, gx, FORT_Y - 70, 'NEPRIJATELJSKO UPORIŠTE', 16, '#ffcf8a').setOrigin(0.5).setDepth(3);

    const gate = this.enemies.create(gx, FORT_Y, 'gate').setDepth(4);
    gate.body.setImmovable(true); gate.body.pushable = false;
    gate.setData({ type: 'gate', hp: L.gateHp, solid: true });

    // Turrets sit just in front of the wall so bullets coming from the south reach them first.
    [180, W - 180, 330, W - 330].slice(0, L.turrets).forEach(x => this.spawnBunker(x, FORT_Y + 40, 16));
  }

  // ------------------------------------------------ setup

  setupColliders() {
    const P = this.physics;
    const playing = () => this.state === 'play';
    P.add.collider(this.player, this.walls);
    P.add.collider(this.player, this.barrels);
    P.add.collider(this.player, this.enemies, (p, e) => { if (e.getData('type') === 'tank') this.hurt(15); },
      (p, e) => e.getData('solid'));
    P.add.overlap(this.player, this.enemies, () => this.hurt(10), (p, e) => !e.getData('solid') && playing());
    P.add.collider(this.enemies, this.walls);
    P.add.collider(this.enemies, this.barrels);

    P.add.overlap(this.pBullets, this.enemies, (b, e) => {
      if (!b.active || !e.active) return;
      const dmg = b.getData('dmg');
      this.killBullet(b);
      this.damageEnemy(e, dmg);
    });
    P.add.overlap(this.pBullets, this.walls, b => this.killBullet(b));
    P.add.overlap(this.eBullets, this.walls, b => this.killBullet(b));
    P.add.overlap(this.pBullets, this.barrels, (b, br) => { this.killBullet(b); this.explodeBarrel(br); });
    P.add.overlap(this.eBullets, this.barrels, (b, br) => { this.killBullet(b); this.explodeBarrel(br); });
    P.add.overlap(this.player, this.eBullets, (p, b) => {
      if (!b.active) return;
      const dmg = b.getData('dmg');
      this.killBullet(b);
      this.hurt(dmg);
    }, playing);
    P.add.overlap(this.player, this.pickups, (p, it) => this.collect(it), playing);
    P.add.overlap(this.player, this.civils, (p, c) => this.rescue(c), playing);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,G,K,X,P,M,ENTER');
    this.input.mouse.disableContextMenu();
    this.input.on('pointermove', () => { this.lastMouseMove = this.time.now; });
    this.input.on('pointerdown', p => {
      Sfx.init();
      this.lastMouseMove = this.time.now;
      if (this.state === 'intro') { this.startPlay(); return; }
      if (p.rightButtonDown()) this.throwGrenade();
    });
    [this.keys.ENTER, this.keys.SPACE].forEach(k => k.on('down', () => { if (this.state === 'intro') this.startPlay(); }));
    [this.keys.G, this.keys.K, this.keys.X].forEach(k => k.on('down', () => this.throwGrenade()));
    this.keys.P.on('down', () => this.togglePause());
    this.keys.M.on('down', () => { Sfx.muted = !Sfx.muted; });
  }

  setupHud() {
    const fix = o => o.setScrollFactor(0).setDepth(100);
    fix(this.add.rectangle(W / 2, 20, W, 40, 0x000000, 0.6));
    this.hudLeft = fix(txt(this, 12, 9, '', 20, '#ffffff'));
    this.hpBar = fix(this.add.graphics());
    this.hudMid = fix(txt(this, W / 2 + 40, 9, this.L.short, 20, '#ffe28a').setOrigin(0.5, 0));
    this.hudRight = fix(txt(this, W - 12, 9, '', 20, '#ffffff').setOrigin(1, 0));
    this.hudWeapon = fix(txt(this, W / 2, 52, '', 18, '#8fd3ff').setOrigin(0.5, 0));
    this.progress = fix(this.add.graphics());
  }

  updateHud() {
    this.hudLeft.setText('MARKO ' + '♥'.repeat(Math.max(0, this.lives)));
    this.hudRight.setText(`BOMBE ${this.grenades}  CIVILI ${this.rescued}  ${String(this.score).padStart(7, '0')}`);
    const g = this.hpBar; g.clear();
    g.fillStyle(0x000000, 0.8); g.fillRect(168, 12, 154, 16);
    const f = Math.max(0, this.hp) / 100;
    g.fillStyle(f > 0.5 ? 0x4caf50 : f > 0.25 ? 0xe6b422 : 0xd52b1e); g.fillRect(170, 14, 150 * f, 12);
    const left = Math.ceil((this.weaponUntil - this.time.now) / 1000);
    this.hudWeapon.setText(this.weapon === 'normal' ? '' : `${this.weapon === 'rapid' ? 'BRZA' : 'TROSTRUKA'} PALJBA ${left}s`);
    const p = this.progress; p.clear();
    const t = Phaser.Math.Clamp((this.LEN - 120 - this.player.y) / (this.LEN - 120 - FORT_Y), 0, 1);
    p.fillStyle(0x000000, 0.5); p.fillRect(W - 16, 70, 8, H - 140);
    p.fillStyle(0xffe28a); p.fillRect(W - 16, 70 + (H - 140) * (1 - t), 8, (H - 140) * t);
  }

  showIntro() {
    this.state = 'intro';
    this.physics.pause();
    const L = this.L;
    const ui = [
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65),
      this.add.rectangle(W / 2, H / 2, 780, 340, 0x1d2414, 0.95).setStrokeStyle(3, 0xc9b77a),
      txt(this, W / 2, H / 2 - 120, L.name, 40, '#ffe28a').setOrigin(0.5),
      txt(this, W / 2, H / 2 - 72, L.when, 24, '#cccccc').setOrigin(0.5),
      txt(this, W / 2, H / 2 - 5, L.brief.join('\n'), 20, '#eeeeee', { lineSpacing: 8 }).setOrigin(0.5),
    ];
    const go = txt(this, W / 2, H / 2 + 115, 'ENTER ili klik — kreni!', 24, '#ffe28a').setOrigin(0.5);
    this.tweens.add({ targets: go, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });
    ui.push(go);
    ui.forEach(o => o.setScrollFactor(0).setDepth(200));
    this.introUi = ui;
  }

  startPlay() {
    this.introUi.forEach(o => o.destroy());
    this.physics.resume();
    this.state = 'play';
    this.nextAmbient = this.time.now + 3000;
  }

  togglePause() {
    if (this.state === 'play') {
      this.state = 'paused';
      this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true;
      this.pauseText = txt(this, W / 2, H / 2, 'PAUZA\n\nP za nastavak', 40, '#ffe28a').setOrigin(0.5).setScrollFactor(0).setDepth(200);
    } else if (this.state === 'paused') {
      this.state = 'play';
      this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false;
      this.pauseText.destroy();
    }
  }

  // ------------------------------------------------ main loop

  update(time) {
    if (this.state === 'paused') return;
    this.updateHud();
    if (this.state === 'intro') return;
    const cam = this.cameras.main;

    if (this.state === 'play') this.updatePlayer(time);
    else this.player.setVelocity(0, 0);

    // The camera only ever moves north, like the arcade original.
    const target = Phaser.Math.Clamp(this.player.y - H * 0.62, 0, this.LEN - H);
    if (target < cam.scrollY) cam.scrollY += (target - cam.scrollY) * 0.15;
    if (this.player.y > cam.scrollY + H - 22) {
      this.player.y = cam.scrollY + H - 22;
      if (this.player.body.velocity.y > 0) this.player.body.velocity.y = 0;
    }

    while (this.spawnIdx < this.spawns.length && this.spawns[this.spawnIdx].y > cam.scrollY - 70) {
      this.runSpawn(this.spawns[this.spawnIdx++]);
    }
    if (this.state === 'play' && time > this.nextAmbient) {
      this.nextAmbient = time + this.L.spawnEvery * rnd(0.7, 1.3);
      if (this.enemies.countActive() < 14) this.spawnAmbient();
    }

    this.updateEnemies(time);
    this.cleanup(time);
  }

  updatePlayer(time) {
    const k = this.keys, cam = this.cameras.main, pl = this.player;
    let vx = (k.A.isDown || k.LEFT.isDown ? -1 : 0) + (k.D.isDown || k.RIGHT.isDown ? 1 : 0);
    let vy = (k.W.isDown || k.UP.isDown ? -1 : 0) + (k.S.isDown || k.DOWN.isDown ? 1 : 0);
    const sp = vx && vy ? 210 * Math.SQRT1_2 : 210;
    pl.setVelocity(vx * sp, vy * sp);

    const ptr = this.input.activePointer;
    if (ptr.isDown) this.lastMouseMove = time;
    if (time - this.lastMouseMove < 2000) {
      this.facing = Phaser.Math.Angle.Between(pl.x, pl.y, ptr.x + cam.scrollX, ptr.y + cam.scrollY);
    } else if (vx || vy) {
      this.facing = Math.atan2(vy, vx);
    }
    pl.rotation = this.facing;

    const firing = k.SPACE.isDown || k.J.isDown || (ptr.isDown && ptr.leftButtonDown());
    if (firing && time >= this.nextShot) this.shoot(time);
    if (this.weapon !== 'normal' && time > this.weaponUntil) this.weapon = 'normal';
    pl.alpha = time < this.invulnUntil ? (Math.floor(time / 80) % 2 ? 0.35 : 1) : 1;
  }

  shoot(time) {
    const pl = this.player, a = this.facing;
    this.nextShot = time + (this.weapon === 'rapid' ? 85 : 170);
    const mx = pl.x + Math.cos(a) * 22, my = pl.y + Math.sin(a) * 22;
    const spread = this.weapon === 'spread' ? [-0.2, 0, 0.2] : [0];
    spread.forEach(d => this.spawnBullet(this.pBullets, 'bullet', mx, my, a + d + rnd(-0.03, 0.03), 720, time + 650, { dmg: 1 }));
    const flash = this.add.image(mx, my, 'spark').setTint(0xffe08a).setScale(1.6).setDepth(7);
    this.time.delayedCall(40, () => flash.destroy());
    Sfx.shot();
  }

  spawnBullet(group, key, x, y, ang, speed, die, data) {
    const b = group.create(x, y, key).setDepth(6).setRotation(ang);
    b.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    b.setData(data); b.setData('die', die);
    return b;
  }

  killBullet(b) {
    if (!b.active) return;
    if (b.getData('shell')) this.boomFx(b.x, b.y, 30, false);
    b.destroy();
  }

  throwGrenade() {
    const now = this.time.now;
    if (this.state !== 'play' || this.grenades <= 0 || now < this.nextNade) return;
    this.grenades--; this.nextNade = now + 450;
    const pl = this.player, cam = this.cameras.main, ptr = this.input.activePointer;
    let dist = 230;
    if (now - this.lastMouseMove < 2000) {
      dist = Phaser.Math.Clamp(Phaser.Math.Distance.Between(pl.x, pl.y, ptr.x + cam.scrollX, ptr.y + cam.scrollY), 80, 320);
    }
    const tx = Phaser.Math.Clamp(pl.x + Math.cos(this.facing) * dist, 10, W - 10);
    const ty = Math.max(cam.scrollY + 10, pl.y + Math.sin(this.facing) * dist);
    const g = this.add.image(pl.x, pl.y, 'grenade').setDepth(7);
    this.tweens.add({ targets: g, x: tx, y: ty, angle: 720, duration: 600, onComplete: () => { g.destroy(); this.explosion(tx, ty, 95, 14, 'nade'); } });
    this.tweens.add({ targets: g, scale: 2, duration: 300, yoyo: true, ease: 'Quad.Out' });
    Sfx.throw();
  }

  hurt(dmg) {
    if (this.state !== 'play' || this.time.now < this.invulnUntil) return;
    this.hp -= dmg;
    this.invulnUntil = this.time.now + 700;
    this.cameras.main.shake(120, 0.006);
    this.cameras.main.flash(120, 140, 0, 0);
    Sfx.hurt();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.state = 'dead';
    this.lives--;
    const pl = this.player;
    pl.setVelocity(0, 0).setVisible(false);
    this.boomFx(pl.x, pl.y, 40, false);
    const corpse = this.add.image(pl.x, pl.y, 'marko').setRotation(pl.rotation + 1.2).setTint(0x777777).setDepth(2);
    txt(this, W / 2, H / 2, 'MARKO JE POGOĐEN!', 40, '#ff6a5a').setOrigin(0.5).setScrollFactor(0).setDepth(150)
      .setData('tmp', true).setName('deathText');
    Sfx.lose();
    this.time.delayedCall(1900, () => {
      this.children.getByName('deathText')?.destroy();
      corpse.destroy();
      if (this.lives <= 0) { this.scene.start('over', { score: this.score, level: this.levelIdx }); return; }
      this.hp = 100;
      this.grenades = Math.max(this.grenades, 3);
      this.invulnUntil = this.time.now + 2500;
      this.eBullets.clear(true, true);
      this.enemies.getChildren().slice().forEach(e => {
        if (e.getData('type') === 'soldier' && Phaser.Math.Distance.Between(e.x, e.y, pl.x, pl.y) < 240) e.destroy();
      });
      pl.setVisible(true);
      this.state = 'play';
    });
  }

  // ------------------------------------------------ enemies

  runSpawn(s) {
    const cam = this.cameras.main;
    const y = Math.min(s.y, cam.scrollY - 40);
    if (s.kind === 'tank') { this.spawnTank(ri(120, W - 120), cam.scrollY - 60); return; }
    if (s.kind === 'bunker') {
      const spot = this.freeSpot(y, 70);
      if (spot) { this.spawnBunker(spot.x, spot.y, 14); return; }
    }
    const cx = ri(150, W - 150), n = ri(2, 4);
    for (let i = 0; i < n; i++) this.spawnSoldier(cx + ri(-90, 90), y - ri(0, 80));
  }

  spawnAmbient() {
    const cam = this.cameras.main;
    if (cam.scrollY < FORT_Y + 120 || Math.random() < 0.3) {
      const side = Math.random() < 0.5;
      const y = Math.max(FORT_Y + 90, cam.scrollY + rnd(H * 0.3, H * 0.65));
      this.spawnSoldier(side ? W + 20 : -20, y);
      return;
    }
    for (let i = 0; i < 6; i++) {
      const x = ri(60, W - 60), y = cam.scrollY - 30;
      if (this.physics.overlapRect(x - 16, y - 16, 32, 32, false, true).length === 0) { this.spawnSoldier(x, y); return; }
    }
  }

  spawnSoldier(x, y) {
    const e = this.enemies.create(x, y, 'enemy').setDepth(5);
    e.body.setCircle(13, 7, 7);
    e.rotation = Math.PI / 2;
    e.setData({ type: 'soldier', hp: 1, solid: false, speed: rnd(55, 85), nextThink: 0, nextFire: this.time.now + rnd(900, 2000) });
    return e;
  }

  spawnBunker(x, y, hp) {
    const e = this.enemies.create(x, y, 'bunker').setDepth(4);
    e.body.setSize(54, 54).setImmovable(true);
    e.body.pushable = false;
    const gun = this.add.image(x, y, 'mg').setOrigin(0.2, 0.5).setDepth(5).setRotation(Math.PI / 2);
    e.setData({ type: 'bunker', hp, solid: true, gun, burst: 0, nextFire: this.time.now + rnd(500, 1500) });
    return e;
  }

  spawnTank(x, y) {
    const e = this.enemies.create(x, y, 'tank').setDepth(4);
    e.body.setSize(48, 72);
    e.body.pushable = false;
    const gun = this.add.image(x, y, 'turret').setOrigin(15 / 60, 0.5).setDepth(5).setRotation(Math.PI / 2);
    e.setData({ type: 'tank', hp: 36, solid: true, gun, side: Math.random() < 0.5 ? -1 : 1, nextFire: this.time.now + 2000 });
    return e;
  }

  updateEnemies(time) {
    const cam = this.cameras.main, pl = this.player, L = this.L;
    const canFire = this.state === 'play';
    this.enemies.getChildren().slice().forEach(e => {
      if (!e.active) return;
      const type = e.getData('type'), gun = e.getData('gun');
      if (e.y > cam.scrollY + H + 160) { gun?.destroy(); e.destroy(); return; }
      const onScreen = e.y > cam.scrollY + 10 && e.y < cam.scrollY + H - 10 && e.x > 0 && e.x < W;
      const ang = Phaser.Math.Angle.Between(e.x, e.y, pl.x, pl.y);
      const dist = Phaser.Math.Distance.Between(e.x, e.y, pl.x, pl.y);

      if (type === 'soldier') {
        if (time > e.getData('nextThink')) {
          e.setData('nextThink', time + rnd(700, 1500));
          let a;
          if (dist > 230) a = ang + rnd(-0.7, 0.7);
          else if (dist < 130) a = ang + Math.PI + rnd(-0.6, 0.6);
          else a = ang + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
          const s = Math.random() < 0.2 ? 0 : e.getData('speed');
          e.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
        }
        const v = e.body.velocity;
        const aiming = time > e.getData('nextFire') - 400;
        e.rotation = !aiming && e.body.speed > 5 ? Math.atan2(v.y, v.x) : ang;
        if (canFire && onScreen && time > e.getData('nextFire') && dist < 560) {
          e.setData('nextFire', time + L.enemyFire * rnd(0.7, 1.3));
          this.enemyShot(e.x, e.y, ang + rnd(-0.1, 0.1), 250 + this.levelIdx * 25, 10);
        }
      } else if (type === 'bunker') {
        gun.rotation = ang;
        if (canFire && onScreen && time > e.getData('nextFire')) {
          let burst = e.getData('burst') || 3;
          this.enemyShot(e.x, e.y, ang + rnd(-0.06, 0.06), 290 + this.levelIdx * 25, 10);
          burst--;
          e.setData('burst', burst);
          e.setData('nextFire', time + (burst > 0 ? 170 : L.enemyFire * rnd(1.1, 1.5)));
        }
      } else if (type === 'tank') {
        const dx = pl.x - e.x;
        let vx = Math.abs(dx) > 40 ? Math.sign(dx) * 30 : 0;
        const vy = e.y < pl.y - 220 ? 40 : 0;
        if (e.body.blocked.down || e.body.touching.down) vx = e.getData('side') * 45;
        e.setVelocity(vx, vy);
        gun.setPosition(e.x, e.y - 4);
        gun.rotation = Phaser.Math.Angle.RotateTo(gun.rotation, ang, 0.025);
        if (canFire && onScreen && time > e.getData('nextFire') &&
            Math.abs(Phaser.Math.Angle.Wrap(gun.rotation - ang)) < 0.25) {
          e.setData('nextFire', time + 2600);
          const bx = e.x + Math.cos(gun.rotation) * 44, by = e.y - 4 + Math.sin(gun.rotation) * 44;
          this.spawnBullet(this.eBullets, 'shell', bx, by, gun.rotation, 230, time + 4000, { dmg: 25, shell: true });
          this.boomFx(bx, by, 14, false);
          Sfx.noise(0.3, 600, 0.4);
        }
      }
    });
  }

  enemyShot(x, y, ang, speed, dmg) {
    this.spawnBullet(this.eBullets, 'ebullet', x + Math.cos(ang) * 18, y + Math.sin(ang) * 18, ang, speed, this.time.now + 4000, { dmg });
    Sfx.eshot();
  }

  damageEnemy(e, dmg) {
    if (!e.active) return;
    const hp = e.getData('hp') - dmg;
    e.setData('hp', hp);
    if (hp <= 0) { this.killEnemy(e); return; }
    e.setTintFill(0xffffff);
    this.time.delayedCall(50, () => e.active && e.clearTint());
  }

  killEnemy(e) {
    const type = e.getData('type'), x = e.x, y = e.y;
    e.getData('gun')?.destroy();
    e.destroy();
    let pts = 100;
    if (type === 'soldier') {
      const body = this.add.image(x, y, 'enemy').setRotation(e.rotation + rnd(-1, 1)).setTint(0x5a5a5a).setDepth(1);
      this.tweens.add({ targets: body, alpha: 0, delay: 2500, duration: 1500, onComplete: () => body.destroy() });
      if (Math.random() < 0.12) this.dropPickup(x, y);
      Sfx.noise(0.12, 800, 0.2);
    } else if (type === 'bunker') {
      pts = 500;
      this.explosion(x, y, 70, 0, 'fx');
      this.add.image(x, y, 'debris').setScale(1.6).setDepth(1);
      this.dropPickup(x, y);
    } else if (type === 'tank') {
      pts = 1000;
      this.explosion(x, y, 90, 0, 'fx');
      this.add.image(x, y, 'tank').setTint(0x2a2a2a).setDepth(1);
      this.dropPickup(x, y, 'nade');
    } else if (type === 'gate') {
      pts = 2000;
      this.explosion(x, y, 120, 0, 'fx');
      this.time.delayedCall(250, () => this.boomFx(x - 40, y + 10, 70, true));
      this.time.delayedCall(500, () => this.boomFx(x + 40, y - 10, 70, true));
      this.missionComplete();
    }
    this.score += pts;
    if (type !== 'soldier') this.floatText(x, y - 20, '+' + pts);
  }

  // ------------------------------------------------ explosions

  explosion(x, y, r, dmg, src) {
    this.boomFx(x, y, r, true);
    if (dmg > 0) {
      this.enemies.getChildren().slice().forEach(e => {
        const reach = r + (e.getData('solid') ? 30 : 0);
        if (e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) < reach) this.damageEnemy(e, dmg);
      });
    }
    this.barrels.getChildren().slice().forEach(b => {
      if (b.active && Phaser.Math.Distance.Between(x, y, b.x, b.y) < r) this.time.delayedCall(120, () => this.explodeBarrel(b));
    });
    if (src === 'barrel' && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < r * 0.8) this.hurt(30);
    this.add.image(x, y, 'crater').setDepth(1).setScale(r / 50).setAngle(rnd(0, 360));
  }

  explodeBarrel(b) {
    if (!b.active) return;
    const x = b.x, y = b.y;
    b.destroy();
    this.explosion(x, y, 90, 12, 'barrel');
  }

  boomFx(x, y, r, big) {
    const flash = this.add.circle(x, y, r * 0.4, 0xfff2b0, 0.9).setDepth(8);
    this.tweens.add({ targets: flash, scale: 2.5, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: r * 3 }, lifespan: { min: 200, max: 550 }, scale: { start: r / 40, end: 0 },
      tint: [0xffd25a, 0xff8a2a, 0xff4a1a, 0x777777], emitting: false,
    }).setDepth(8);
    p.explode(Math.round(10 + r / 4));
    this.time.delayedCall(700, () => p.destroy());
    if (!big) return;
    for (let i = 0; i < 4; i++) {
      const s = this.add.image(x + rnd(-r / 3, r / 3), y + rnd(-r / 3, r / 3), 'smoke').setTint(0x555555).setAlpha(0.6).setScale(r / 50).setDepth(8);
      this.tweens.add({ targets: s, y: s.y - rnd(20, 50), scale: r / 25, alpha: 0, duration: rnd(700, 1200), onComplete: () => s.destroy() });
    }
    this.cameras.main.shake(160, Math.min(0.012, 0.004 * r / 60));
    Sfx.boom();
  }

  // ------------------------------------------------ pickups

  dropPickup(x, y, kind) {
    kind = kind || pick(['nade', 'nade', 'nade', 'med', 'med', 'rapid', 'spread']);
    const key = { nade: 'nadebox', med: 'medkit', rapid: 'rapid', spread: 'spread' }[kind];
    const it = this.pickups.create(x, y, key).setDepth(2);
    it.setData('kind', kind);
    this.tweens.add({ targets: it, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
  }

  collect(it) {
    if (!it.active) return;
    const kind = it.getData('kind');
    let label;
    if (kind === 'nade') { this.grenades = Math.min(9, this.grenades + 3); label = '+3 BOMBE'; }
    if (kind === 'med') { this.hp = Math.min(100, this.hp + 40); label = 'ZDRAVLJE +40'; }
    if (kind === 'rapid' || kind === 'spread') {
      this.weapon = kind; this.weaponUntil = this.time.now + 12000;
      label = kind === 'rapid' ? 'BRZA PALJBA!' : 'TROSTRUKA PALJBA!';
    }
    this.floatText(it.x, it.y - 10, label, '#8fd3ff');
    it.destroy();
    Sfx.pickup();
  }

  rescue(c) {
    if (!c.active) return;
    c.getData('label').destroy();
    this.rescued++;
    this.score += 500;
    this.floatText(c.x, c.y - 20, 'CIVIL SPAŠEN! +500', '#9dff8a');
    this.tweens.add({ targets: c, y: c.y + 60, alpha: 0, duration: 900, onComplete: () => c.destroy() });
    c.body.enable = false;
    Sfx.rescue();
  }

  floatText(x, y, s, color = '#ffe28a') {
    const t = txt(this, x, y, s, 18, color).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
  }

  cleanup(time) {
    const cam = this.cameras.main, top = cam.scrollY - 60, bot = cam.scrollY + H + 60;
    [this.pBullets, this.eBullets].forEach(g => g.getChildren().slice().forEach(b => {
      if (time > b.getData('die') || b.y < top || b.y > bot || b.x < -40 || b.x > W + 40) b.destroy();
    }));
    this.pickups.getChildren().slice().forEach(it => { if (it.y > bot + 100) it.destroy(); });
  }

  // ------------------------------------------------ end of mission

  missionComplete() {
    if (this.state !== 'play') return;
    this.state = 'done';
    this.eBullets.clear(true, true);
    const bonus = 1000 * (this.levelIdx + 1) + this.rescued * 250;
    this.score += bonus;
    Sfx.win();
    const last = this.levelIdx === LEVELS.length - 1;
    this.time.delayedCall(900, () => {
      [
        this.add.rectangle(W / 2, H / 2, 640, 240, 0x1d2414, 0.95).setStrokeStyle(3, 0xc9b77a),
        txt(this, W / 2, H / 2 - 60, 'MISIJA IZVRŠENA!', 44, '#ffe28a').setOrigin(0.5),
        txt(this, W / 2, H / 2 + 10, `Spašeno civila: ${this.rescued}\nBonus: ${bonus}`, 24, '#ffffff', { lineSpacing: 8 }).setOrigin(0.5),
        txt(this, W / 2, H / 2 + 80, last ? 'Kninska tvrđava je slobodna...' : 'Sljedeća misija uskoro...', 18, '#cccccc').setOrigin(0.5),
      ].forEach(o => o.setScrollFactor(0).setDepth(200));
    });
    this.time.delayedCall(4200, () => {
      if (last) this.scene.start('victory', { score: this.score });
      else this.scene.start('game', { level: this.levelIdx + 1, score: this.score, lives: this.lives, grenades: Math.max(this.grenades, 5) });
    });
  }
}

class OverScene extends Phaser.Scene {
  constructor() { super('over'); }
  create(d) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x120c0a);
    txt(this, W / 2, 230, 'KRAJ IGRE', 84, '#ff6a5a', { strokeThickness: 10 }).setOrigin(0.5);
    txt(this, W / 2, 330, `Misija nije uspjela: ${LEVELS[d.level].short}`, 26, '#dddddd').setOrigin(0.5);
    txt(this, W / 2, 380, `Bodovi: ${d.score}`, 30, '#ffe28a').setOrigin(0.5);
    const go = txt(this, W / 2, 520, 'ENTER ili klik — pokušaj ponovno ovu misiju', 24, '#ffffff').setOrigin(0.5);
    txt(this, W / 2, 570, 'ESC — glavni izbornik', 20, '#999999').setOrigin(0.5);
    this.tweens.add({ targets: go, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    const retry = () => this.scene.start('game', { level: d.level, score: 0, lives: 3, grenades: 5 });
    this.input.keyboard.once('keydown-ENTER', retry);
    this.input.once('pointerdown', retry);
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('menu'));
  }
}

class VictoryScene extends Phaser.Scene {
  constructor() { super('victory'); }
  create(d) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x1e3c78, 0x1e3c78, 0xf2a65a, 0xf2a65a, 1); g.fillRect(0, 0, W, 600);
    g.fillStyle(0xffd27a, 0.9); g.fillCircle(830, 485, 60);
    g.fillStyle(0x3d5a2a);
    g.fillPoints([{ x: 0, y: 560 }, { x: 200, y: 470 }, { x: 380, y: 410 }, { x: 512, y: 380 }, { x: 650, y: 410 }, { x: 820, y: 480 }, { x: W, y: 540 }, { x: W, y: H }, { x: 0, y: H }], true);
    g.fillStyle(0x7a7264);
    g.fillRect(380, 300, 264, 100);
    for (let x = 380; x < 644; x += 24) g.fillRect(x, 288, 14, 14);
    g.fillRect(470, 230, 84, 80);
    for (let x = 470; x < 554; x += 21) g.fillRect(x, 218, 12, 14);
    g.fillStyle(0x4a443a); g.fillRect(496, 345, 32, 55); g.fillRect(500, 250, 10, 18); g.fillRect(514, 250, 10, 18);
    g.fillStyle(0xdddddd); g.fillRect(510, 80, 4, 140);

    const flag = this.add.graphics({ x: 514, y: 160 });
    drawFlag(flag, 0, 0, 110, 55);
    this.tweens.add({ targets: flag, y: 82, duration: 4000, ease: 'Sine.Out' });
    this.tweens.add({ targets: flag, scaleY: 0.93, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add.image(560, 420, 'marko').setAngle(-90).setScale(1.4);

    this.add.rectangle(W / 2, 664, W, 208, 0x000000, 0.6);
    txt(this, W / 2, 595, 'POBJEDA!', 56, '#ffe28a', { strokeThickness: 8 }).setOrigin(0.5);
    txt(this, W / 2, 650, 'Kolovoz 1995. — Marko je podigao hrvatsku zastavu na kninskoj tvrđavi.', 20, '#ffffff').setOrigin(0.5);
    txt(this, W / 2, 680, 'Hvala svim hrvatskim braniteljima.', 20, '#cccccc').setOrigin(0.5);
    txt(this, W / 2, 715, `Bodovi: ${d.score}`, 24, '#ffe28a').setOrigin(0.5);
    txt(this, W / 2, 748, 'ENTER — glavni izbornik', 16, '#999999').setOrigin(0.5);
    Sfx.win();
    this.time.delayedCall(1500, () => {
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start('menu'));
      this.input.once('pointerdown', () => this.scene.start('menu'));
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#000000',
  audio: { noAudio: true },
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, OverScene, VictoryScene],
});
