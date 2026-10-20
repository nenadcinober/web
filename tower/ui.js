'use strict';

// Menu scene, the HUD scene that sits on top of the game, and the shared button helper.

const hex = s => parseInt(s.slice(1), 16);
const SAVE_KEY = 'obrana-gruntovca-save';

function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 && SIZES[s.sizeKey] ? s : null; } catch (e) { return null; }
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* private mode */ } }

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function setT(obj, s) { if (obj.text !== s) obj.setText(s); }

function makeButton(scene, x, y, w, h, label, onClick, o = {}) {
  const ct = scene.add.container(x, y);
  const g = scene.add.graphics();
  const txt = scene.add.text(0, o.textY || 0, label, {
    fontFamily: FONT, fontSize: o.size || '16px', color: '#2b1a0e', fontStyle: 'bold', align: 'center',
  }).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  ct.add([g, txt, zone]);
  const b = { ct, g, txt, zone, enabled: true, active: false, hover: false, w, h };
  b.draw = () => {
    g.clear();
    const base = b.active ? (o.activeFill || '#f2c21c') : (o.fill || '#f6ecd0');
    let col = hex(base);
    if (b.hover && b.enabled) col = Phaser.Display.Color.IntegerToColor(col).lighten(8).color;
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 8);
    g.fillStyle(col, b.enabled ? 1 : 0.55); g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(2, b.enabled ? 0x2b1a0e : 0x8a7a6a, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    if (o.stitch !== false && h >= 30) {
      g.lineStyle(1, 0xc8262e, b.enabled ? 0.8 : 0.3);
      for (let i = -w / 2 + 8; i < w / 2 - 8; i += 6) g.lineBetween(i, h / 2 - 5, i + 3, h / 2 - 5);
    }
    txt.setAlpha(b.enabled ? 1 : 0.5);
  };
  b.setEnabled = v => { if (b.enabled !== v) { b.enabled = v; b.draw(); } return b; };
  b.setActive = v => { if (b.active !== v) { b.active = v; b.draw(); } return b; };
  b.setLabel = s => { setT(txt, s); return b; };
  b.setVisible = v => { ct.setVisible(v); zone.input.enabled = v; return b; };
  zone.on('pointerover', () => { b.hover = true; b.draw(); if (o.onHover) o.onHover(true); });
  zone.on('pointerout', () => { b.hover = false; b.draw(); if (o.onHover) o.onHover(false); });
  zone.on('pointerdown', (p, lx, ly, ev) => {
    Sound.init();
    if (ev) ev.stopPropagation();
    if (!b.enabled) { Sound.deny(); return; }
    Sound.click();
    onClick();
  });
  b.draw();
  return b;
}

// Cross-stitch border like the red-and-black embroidery on Podravina shirts and tablecloths.
function stitchBand(c, x0, y0, len, horizontal) {
  const step = 6;
  for (let i = 0; i < len / step; i++) {
    const k = i % 8;
    const rows = [0, 1, 2, 3, 3, 2, 1, 0][k];
    for (let r = 0; r <= rows; r++) {
      const col = r === rows ? '#1c1814' : '#c8262e';
      const along = i * step, across = r * 4;
      const x = horizontal ? x0 + along : x0 + across;
      const y = horizontal ? y0 + across : y0 + along;
      line(c, x, y, x + 3, y + 3, col, 1.1); line(c, x + 3, y, x, y + 3, col, 1.1);
    }
  }
}

function makeUiTextures(scene) {
  canvasTex(scene, 'ui_top', W, 44, c => {
    c.fillStyle = '#f6ecd0'; c.fillRect(0, 0, W, 44);
    c.fillStyle = '#c8262e'; c.fillRect(0, 40, W, 4);
    stitchBand(c, 4, 26, W - 8, true);
  });
  canvasTex(scene, 'ui_panel', W - PANEL_X, H - 44, c => {
    const pw = W - PANEL_X, ph = H - 44;
    c.fillStyle = '#efe2c0'; c.fillRect(0, 0, pw, ph);
    c.fillStyle = '#c8262e'; c.fillRect(0, 0, 4, ph);
    for (let i = 0; i < 400; i++) {
      c.globalAlpha = 0.08;
      ell(c, Math.random() * pw, Math.random() * ph, 4 + Math.random() * 10, 2 + Math.random() * 4, '#a88a5a');
    }
    c.globalAlpha = 1;
    stitchBand(c, 8, 4, ph - 8, false);
  });
}

function paintMenu(c, w, h) {
  const sky = c.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, '#9fd0e8'); sky.addColorStop(1, '#f6ecd0');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // the naive sun with a face
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    poly(c, [110 + Math.cos(a - 0.1) * 48, 100 + Math.sin(a - 0.1) * 48, 110 + Math.cos(a) * 72, 100 + Math.sin(a) * 72,
      110 + Math.cos(a + 0.1) * 48, 100 + Math.sin(a + 0.1) * 48], '#f6c81c', OUT, 1.2);
  }
  ell(c, 110, 100, 46, 46, '#f6d23a', OUT, 2);
  face(c, 110, 100, 30, {});
  for (const [x, y, s] of [[820, 80, 1], [600, 130, 0.7], [960, 170, 0.6]]) {
    for (const [dx, dy, r] of [[0, 0, 30], [30, 6, 24], [-28, 8, 22], [10, -16, 22]]) ell(c, x + dx * s, y + dy * s, r * s, r * s * 0.8, '#fff', null);
  }
  // hills and fields
  c.beginPath(); c.moveTo(0, 330);
  for (let x = 0; x <= w; x += 32) c.lineTo(x, 320 - Math.sin(x / 140) * 26 - Math.sin(x / 57) * 8);
  c.lineTo(w, h); c.lineTo(0, h); c.closePath();
  c.fillStyle = '#7aa84a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  const fieldCols = ['#e6c048', '#8a6038', '#9ac85a', '#d0a830', '#6fa040', '#c89a5a'];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const y0 = 350 + row * 40, x0 = i * 150 - row * 40;
      poly(c, [x0, y0, x0 + 150, y0, x0 + 160, y0 + 40, x0 + 10, y0 + 40], fieldCols[(i + row * 2) % 6], 'rgba(40,30,10,0.5)', 1);
      for (let k = 1; k < 5; k++) line(c, x0 + 2 * k, y0 + k * 8, x0 + 150 + 2 * k, y0 + k * 8, 'rgba(60,40,10,0.25)', 1.5);
    }
  }
  c.fillStyle = '#8cc45a'; c.fillRect(0, 470, w, h - 470);
  line(c, 0, 470, w, 470, OUT, 2);
  // village on the horizon
  c.save(); c.translate(0, 0);
  for (const [x, v] of [[300, 0.2], [380, 0.8], [700, 0.4], [770, 0.65], [850, 0.1]]) { c.save(); c.translate(x, 340); c.scale(1.4, 1.4); paintHouse(c, 0, 0, 1, v, false); c.restore(); }
  c.save(); c.translate(540, 352); c.scale(1.6, 1.6); paintChurch(c, 0, 0, 1); c.restore();
  for (const [x, y, s] of [[230, 340, 1.5], [460, 345, 1.3], [640, 340, 1.4], [930, 335, 1.6]]) {
    c.save(); c.translate(x, y); c.scale(s, s);
    rrect(c, -3, -16, 6, 16, 1, '#6a4424', OUT, 1.2); crown(c, 0, -26, 15, 13, 1, x / 1000);
    c.restore();
  }
  c.restore();
  // Dudek and Regica in the foreground
  for (const [x, o, sc] of [
    [110, { shirt: '#fbf8ee', vest: '#1f1d22', pants: '#2b2b33', hat: 'black', mustache: true, embroidery: '#c8262e' }, 4.2],
    [920, { shirt: '#fbf8ee', skirt: '#2e57a8', apron: '#fbf8ee', scarf: '#d8262e', dots: '#fff', embroidery: '#2e57a8' }, 4.2],
  ]) {
    c.save(); c.translate(x, 760); c.scale(sc, sc);
    const hnd = person(c, 0, 0, o);
    if (o.vest) {
      line(c, hnd.rx + 1, hnd.hy + 12, hnd.rx + 1, -50, '#8a5a2a', 2.2);
      line(c, hnd.rx - 4, -46, hnd.rx + 6, -46, '#6a6a70', 1.8);
      for (let i = -1; i <= 1; i++) line(c, hnd.rx + 1 + i * 4.5, -46, hnd.rx + 1 + i * 4.5, -53, '#6a6a70', 1.5);
    }
    c.restore();
  }
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * w, y = 480 + Math.random() * (h - 480);
    const p = ['#fff', '#d8262e', '#f2d22a', '#7a9ee8'][i % 4];
    for (let k = 0; k < 5; k++) ell(c, x + Math.cos(k * 1.26) * 2.6, y + Math.sin(k * 1.26) * 2.6, 2, 2, p);
    ell(c, x, y, 1.4, 1.4, '#c8461a');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    if (!this.textures.exists('menu_bg')) canvasTex(this, 'menu_bg', W, H, paintMenu);
    this.add.image(0, 0, 'menu_bg').setOrigin(0).setScale(0.5);
    const title = this.add.text(W / 2, 64, 'OBRANA GRUNTOVCA', {
      fontFamily: FONT_T, fontSize: '58px', color: '#b8222a', fontStyle: 'bold', stroke: '#fff8e8', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(3, 4, '#2b1a0e', 0, true, true);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(W / 2, 118, 'Dudek, Regica i cijeli Gruntovec brane selo od lisica, porezniki i komisije iz grada', {
      fontFamily: FONT, fontSize: '17px', color: '#2b1a0e', fontStyle: 'bold', backgroundColor: '#f6ecd0cc', padding: { x: 10, y: 4 },
    }).setOrigin(0.5);

    try { this.diff = localStorage.getItem('obrana-gruntovca-diff') || 'normalno'; } catch (e) { this.diff = 'normalno'; }
    if (!DIFFS[this.diff]) this.diff = 'normalno';

    this.add.text(W / 2, 182, 'Odaberi veličinu karte', {
      fontFamily: FONT_T, fontSize: '26px', color: '#2b1a0e', fontStyle: 'bold', stroke: '#f6ecd0', strokeThickness: 6,
    }).setOrigin(0.5);
    Object.keys(SIZES).forEach((k, i) => this.sizeCard(k, W / 2 + (i - 1) * 300, 300));

    this.add.text(W / 2, 430, 'Težina', {
      fontFamily: FONT_T, fontSize: '22px', color: '#2b1a0e', fontStyle: 'bold', stroke: '#f6ecd0', strokeThickness: 6,
    }).setOrigin(0.5);
    this.diffBtns = {};
    Object.keys(DIFFS).forEach((k, i) => {
      const d = DIFFS[k];
      this.diffBtns[k] = makeButton(this, W / 2 + (i - 1) * 150, 472, 136, 44, d.name + '\n' + d.lives + ' srca', () => this.setDiff(k), { size: '15px' });
    });
    this.setDiff(this.diff);

    const save = loadSave();
    if (save) {
      makeButton(this, W / 2, 545, 420, 50,
        `Nastavi: ${SIZES[save.sizeKey].name}, val ${save.wave + 1}/${SIZES[save.sizeKey].waves} (${DIFFS[save.diffKey].name})`,
        () => this.scene.start('Game', { sizeKey: save.sizeKey, diffKey: save.diffKey, seed: save.seed, save }),
        { size: '16px', fill: '#f2c21c' });
    }

    this.add.text(W / 2, 612,
      'Klikni branitelja desno pa polje uz put  ·  1–6 biraj  ·  U nadogradi  ·  X prodaj  ·  T ciljanje\n' +
      'Razmak = sljedeći val  ·  P pauza  ·  F brzina  ·  kotačić zum  ·  povuci ili WASD/strelice za pomicanje', {
        fontFamily: FONT, fontSize: '13px', color: '#2b1a0e', align: 'center', backgroundColor: '#f6ecd0dd', padding: { x: 10, y: 6 },
      }).setOrigin(0.5);
    this.input.keyboard.on('keydown', () => Sound.init());
  }

  setDiff(k) {
    this.diff = k;
    try { localStorage.setItem('obrana-gruntovca-diff', k); } catch (e) { /* private mode */ }
    for (const key in this.diffBtns) this.diffBtns[key].setActive(key === k);
  }

  sizeCard(key, x, y) {
    const s = SIZES[key];
    const w = 270, h = 180;
    const g = this.add.graphics();
    const draw = hover => {
      g.clear();
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 5, w, h, 12);
      g.fillStyle(hover ? 0xfff8e0 : 0xf6ecd0, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(3, hover ? 0xc8262e : 0x2b1a0e, 1); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(1.5, 0xc8262e, 0.8);
      for (let i = x - w / 2 + 12; i < x + w / 2 - 12; i += 8) { g.lineBetween(i, y - h / 2 + 8, i + 4, y - h / 2 + 12); g.lineBetween(i + 4, y - h / 2 + 8, i, y - h / 2 + 12); }
    };
    draw(false);
    this.add.text(x, y - 56, s.name, { fontFamily: FONT_T, fontSize: '25px', color: '#b8222a', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(x, y - 26, `${s.w} × ${s.h} polja`, { fontFamily: FONT, fontSize: '14px', color: '#5a4a3a' }).setOrigin(0.5);
    this.add.text(x, y + 16, s.desc, { fontFamily: FONT, fontSize: '14px', color: '#2b1a0e', align: 'center', lineSpacing: 4 }).setOrigin(0.5);
    // a tiny drawing of how many tracks there are
    const mg = this.add.graphics();
    mg.fillStyle(0x8cc45a, 1); mg.fillRect(x - 40, y + 50, 80, 26);
    mg.lineStyle(4, 0xb98a55, 1);
    mg.beginPath(); mg.moveTo(x - 40, y + 56); mg.lineTo(x - 20, y + 56); mg.lineTo(x - 20, y + 70); mg.lineTo(x + 5, y + 70);
    mg.lineTo(x + 5, y + 58); mg.lineTo(x + 40, y + 58); mg.strokePath();
    if (s.spawn2From) { mg.beginPath(); mg.moveTo(x + 22, y + 50); mg.lineTo(x + 22, y + 58); mg.strokePath(); }
    mg.lineStyle(2, 0x2b1a0e, 1); mg.strokeRect(x - 40, y + 50, 80, 26);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerdown', () => {
      Sound.init(); Sound.click();
      this.scene.start('Game', { sizeKey: key, diffKey: this.diff, seed: (Math.random() * 1e9) | 0 });
    });
  }
}

class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const gs = this.gs = this.scene.get('Game');
    gs.ui = this;

    this.snow = this.add.particles(0, 0, 'puff', {
      x: { min: 0, max: VIEW.w }, y: VIEW.y - 10, lifespan: 12000, speedY: { min: 25, max: 55 }, speedX: { min: -14, max: 14 },
      scale: { min: 0.1, max: 0.28 }, alpha: 0.9, frequency: 70, emitting: false,
    });
    this.leaves = this.add.particles(0, 0, 'puff', {
      x: { min: 0, max: VIEW.w }, y: VIEW.y - 10, lifespan: 14000, speedY: { min: 30, max: 50 }, speedX: { min: -30, max: 30 },
      scaleX: { min: 0.15, max: 0.25 }, scaleY: 0.1, rotate: { min: 0, max: 360 }, tint: [0xd8742a, 0xe8a62a, 0xb84a1e, 0x8a3a1a],
      frequency: 450, emitting: false,
    });

    this.bossG = this.add.graphics();
    this.bossT = this.add.text(VIEW.w / 2, 58, '', { fontFamily: FONT, fontSize: '13px', color: '#fff', fontStyle: 'bold', stroke: '#2b1a0e', strokeThickness: 4 }).setOrigin(0.5);
    this.pauseT = this.add.text(VIEW.w / 2, VIEW.y + VIEW.h / 2, 'PAUZA', {
      fontFamily: FONT_T, fontSize: '64px', color: '#f6ecd0', fontStyle: 'bold', stroke: '#2b1a0e', strokeThickness: 10,
    }).setOrigin(0.5).setVisible(false);
    this.bannerT = this.add.text(VIEW.w / 2, 150, '', {
      fontFamily: FONT_T, fontSize: '40px', color: '#b8222a', fontStyle: 'bold', stroke: '#fff8e8', strokeThickness: 9, align: 'center',
    }).setOrigin(0.5).setAlpha(0);
    this.toastT = this.add.text(VIEW.w / 2, VIEW.y + VIEW.h - 40, '', {
      fontFamily: FONT, fontSize: '17px', color: '#2b1a0e', fontStyle: 'bold', backgroundColor: '#f6ecd0ee', padding: { x: 12, y: 6 }, align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.add.image(0, 0, 'ui_top').setOrigin(0).setScale(0.5);
    this.add.image(PANEL_X, 44, 'ui_panel').setOrigin(0).setScale(0.5);

    const big = { fontFamily: FONT, fontSize: '20px', color: '#2b1a0e', fontStyle: 'bold' };
    this.add.image(22, 20, 'heart').setScale(0.62);
    this.livesT = this.add.text(40, 20, '', big).setOrigin(0, 0.5);
    this.add.image(112, 20, 'coin').setScale(1.1);
    this.goldT = this.add.text(126, 20, '', big).setOrigin(0, 0.5);
    this.waveT = this.add.text(230, 20, '', big).setOrigin(0, 0.5);
    this.seasonT = this.add.text(380, 20, '', { ...big, fontSize: '17px', color: '#5a3a1e' }).setOrigin(0, 0.5);
    this.timeT = this.add.text(500, 20, '', { ...big, fontSize: '15px', color: '#5a4a3a' }).setOrigin(0, 0.5);

    this.pauseB = makeButton(this, 620, 20, 82, 30, 'Pauza', () => gs.togglePause(), { size: '14px', stitch: false });
    this.speedB = makeButton(this, 704, 20, 70, 30, '1×', () => gs.cycleSpeed(), { size: '15px', stitch: false });
    this.musicB = makeButton(this, 784, 20, 76, 30, 'Glazba', () => { const on = Sound.toggleMusic(); this.musicB.setActive(on); }, { size: '14px', stitch: false });
    this.musicB.setActive(Sound.musicOn);
    this.menuB = makeButton(this, 878, 20, 96, 30, 'Izbornik', () => this.confirmExit(), { size: '14px', stitch: false });
    this.helpB = makeButton(this, 976, 20, 84, 30, 'Pomoć', () => this.showHelp(), { size: '14px', stitch: false });

    // panel
    this.nextB = makeButton(this, 914, 84, 196, 56, '', () => gs.callWave(), { size: '15px', fill: '#f2c21c' });
    this.shop = {};
    TOWER_ORDER.forEach((type, i) => {
      const def = TOWERS[type];
      const x = 860 + (i % 2) * 108, y = 158 + Math.floor(i / 2) * 86;
      const b = makeButton(this, x, y, 102, 80, '', () => gs.selectBuild(type), {
        onHover: on => { this.hoverType = on ? type : null; this.infoDirty = true; }, stitch: false, activeFill: '#f8d860',
      });
      const icon = this.add.image(0, -10, 't_' + type).setScale(0.42).setOrigin(0.5, 0.5);
      const name = this.add.text(0, 17, def.name, { fontFamily: FONT, fontSize: '12px', color: '#2b1a0e', fontStyle: 'bold' }).setOrigin(0.5);
      const coin = this.add.image(-14, 31, 'coin').setScale(0.6);
      const price = this.add.text(-6, 31, String(def.cost), { fontFamily: FONT, fontSize: '12px', color: '#2b1a0e', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const key = this.add.text(-46, -36, def.key, { fontFamily: FONT, fontSize: '11px', color: '#8a6a4a', fontStyle: 'bold' });
      b.ct.add([icon, name, coin, price, key]);
      b.ct.bringToTop(b.zone);
      this.shop[type] = b;
    });

    this.infoTitle = this.add.text(828, 412, '', { fontFamily: FONT_T, fontSize: '17px', color: '#b8222a', fontStyle: 'bold' });
    this.infoBody = this.add.text(828, 436, '', {
      fontFamily: FONT, fontSize: '13px', color: '#2b1a0e', lineSpacing: 2, wordWrap: { width: 188 },
    });
    this.modeB = makeButton(this, 914, 540, 196, 28, '', () => gs.selected && gs.cycleMode(gs.selected), { size: '13px', stitch: false });
    this.upB = makeButton(this, 862, 578, 92, 38, '', () => gs.selected && gs.upgrade(gs.selected), { size: '13px', fill: '#bfe0a0' });
    this.sellB = makeButton(this, 966, 578, 92, 38, '', () => gs.selected && gs.sell(gs.selected), { size: '13px', fill: '#f0b8a8' });

    this.previewT = this.add.text(828, 604, '', { fontFamily: FONT, fontSize: '11px', color: '#5a3a1e', wordWrap: { width: 188 }, lineSpacing: 1 });

    // minimap
    const mm = this.mm = { x: 814, y: 636, w: 200, h: 124 };
    const ms = Math.min(mm.w / gs.pw, mm.h / gs.ph);
    mm.s = ms; mm.ox = mm.x + (mm.w - gs.pw * ms) / 2; mm.oy = mm.y + (mm.h - gs.ph * ms) / 2;
    this.add.rectangle(mm.x + mm.w / 2, mm.y + mm.h / 2, mm.w + 4, mm.h + 4, 0x2b1a0e);
    this.add.image(mm.ox, mm.oy, 'map_bg').setOrigin(0).setScale(ms);
    this.mmG = this.add.graphics();
    const mmZone = this.add.zone(mm.x, mm.y, mm.w, mm.h).setOrigin(0).setInteractive({ useHandCursor: true });
    const jump = p => gs.cameras.main.centerOn((p.x - mm.ox) / ms, (p.y - mm.oy) / ms);
    mmZone.on('pointerdown', jump);
    mmZone.on('pointermove', p => { if (p.isDown) jump(p); });

    this.infoDirty = true;
    this.infoClock = 0;
    this.mmClock = 0;
    (gs.pending || []).forEach(f => f());
    gs.pending = [];
  }

  banner(text, color) {
    this.bannerT.setText(text).setColor(color || '#b8222a');
    this.tweens.killTweensOf(this.bannerT);
    this.bannerT.setAlpha(0).setScale(0.5);
    this.tweens.add({ targets: this.bannerT, alpha: 1, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: this.bannerT, alpha: 0, delay: 2200, duration: 600 });
  }

  toast(text, ms = 2600) {
    this.toastT.setText(text);
    this.tweens.killTweensOf(this.toastT);
    this.toastT.setAlpha(1);
    this.tweens.add({ targets: this.toastT, alpha: 0, delay: ms, duration: 500 });
  }

  update(time, delta) {
    const gs = this.gs;
    if (!gs.sys.isActive() && !gs.sys.isPaused()) return;
    setT(this.livesT, String(Math.max(0, gs.lives)));
    setT(this.goldT, String(gs.gold));
    setT(this.waveT, `Val ${gs.waveNum}/${gs.size.waves}`);
    setT(this.seasonT, SEASONS[gs.season].name);
    setT(this.timeT, fmtTime(gs.stats.time));
    this.pauseB.setActive(gs.paused);
    this.pauseT.setVisible(gs.paused && !gs.over && !this.modal);
    this.speedB.setLabel(gs.speed + '×').setActive(gs.speed > 1);
    this.snow.emitting = gs.season === 3 && !gs.paused;
    this.leaves.emitting = gs.season === 2 && !gs.paused;

    // next-wave button
    if (gs.over) this.nextB.setLabel('Kraj igre').setEnabled(false);
    else if (gs.spawning || gs.waveNum >= gs.size.waves) {
      const left = gs.enemies.length + gs.queues.reduce((a, q) => a + q.filter(i => i.type).length, 0);
      const what = gs.waveNum >= gs.size.waves ? 'Zadnji val' : `Val ${gs.waveNum} dolazi`;
      this.nextB.setLabel(`${what}\njoš ${left} napadača`).setEnabled(false);
    } else if (gs.countdown === null) this.nextB.setLabel('Kreni! (razmak)').setEnabled(true);
    else this.nextB.setLabel(`Val ${gs.waveNum + 1} za ${Math.ceil(gs.countdown)} s\nodmah = +${gs.earlyBonus()} din`).setEnabled(true);

    for (const type of TOWER_ORDER) {
      const b = this.shop[type];
      b.setEnabled(gs.gold >= TOWERS[type].cost);
      b.setActive(gs.buildType === type);
    }

    this.infoClock -= delta;
    if (this.infoDirty || this.infoClock <= 0) { this.refreshInfo(); this.infoDirty = false; this.infoClock = 150; }
    this.mmClock -= delta;
    if (this.mmClock <= 0) { this.drawMinimap(); this.mmClock = 100; }
    this.drawBossBar();
  }

  refreshInfo() {
    const gs = this.gs, t = gs.selected;
    if (t) {
      const def = t.def, L = t.level;
      setT(this.infoTitle, `${def.name} · razina ${L + 1}`);
      const lines = statLines(def, L, L < 3);
      lines.push(`Ulovio: ${t.kills}`);
      lines.push('', def.info);
      setT(this.infoBody, lines.join('\n'));
      const canMode = !def.aura && !def.pulse;
      this.modeB.setVisible(canMode);
      if (canMode) this.modeB.setLabel(`Cilja: ${MODES[t.mode]}  (T)`);
      this.upB.setVisible(true).setLabel(L < 3 ? `Nadogradi\n${def.up[L]} din (U)` : 'Najviša\nrazina').setEnabled(L < 3 && gs.gold >= def.up[L]);
      this.sellB.setVisible(true).setLabel(`Prodaj\n+${gs.refund(t)} din (X)`).setEnabled(true);
    } else {
      const type = this.hoverType || gs.buildType;
      this.modeB.setVisible(false); this.upB.setVisible(false); this.sellB.setVisible(false);
      if (type) {
        const def = TOWERS[type];
        setT(this.infoTitle, def.name);
        setT(this.infoBody, [`${def.what[0].toUpperCase() + def.what.slice(1)} · tipka ${def.key}`, `Cijena: ${def.cost} din`, ...statLines(def, 0, false), '', def.info].join('\n'));
      } else {
        setT(this.infoTitle, 'Kak se brani selo');
        setT(this.infoBody, [
          'Odaberi branitelja gore, pa klikni na travu uz put.',
          'Klikni postavljenog da ga nadogradiš ili prodaš.',
          'Desni klik ili Esc odustaje.',
          'Povuci mišem ili WASD za pomicanje, kotačić za zum.',
          'Shift + klik postavlja više istih.',
        ].join('\n'));
      }
    }
    const next = gs.previewNext();
    setT(this.previewT, next ? 'Sljedeći val: ' + next : '');
  }

  drawMinimap() {
    const gs = this.gs, mm = this.mm, g = this.mmG, s = mm.s;
    g.clear();
    g.fillStyle(0x2e57a8, 1);
    for (const t of gs.towers) g.fillRect(mm.ox + t.x * s - 1.5, mm.oy + t.y * s - 2, 3, 3);
    g.fillStyle(0xd8262e, 1);
    for (const e of gs.enemies) g.fillCircle(mm.ox + e.x * s, mm.oy + e.y * s, e.def.boss ? 3 : 1.6);
    const v = gs.cameras.main.worldView;
    g.lineStyle(1.5, 0xffffff, 1);
    const x0 = Math.max(mm.ox, mm.ox + v.x * s), y0 = Math.max(mm.oy, mm.oy + v.y * s);
    const x1 = Math.min(mm.ox + gs.pw * s, mm.ox + (v.x + v.width) * s), y1 = Math.min(mm.oy + gs.ph * s, mm.oy + (v.y + v.height) * s);
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }

  drawBossBar() {
    const gs = this.gs, g = this.bossG;
    g.clear();
    const boss = gs.enemies.find(e => e.def.boss && !e.dead);
    if (!boss) { setT(this.bossT, ''); return; }
    const w = 360, x = VIEW.w / 2 - w / 2, y = 50;
    g.fillStyle(0x2b1a0e, 0.85); g.fillRoundedRect(x - 4, y - 2, w + 8, 18, 6);
    g.fillStyle(0xc8262e, 1); g.fillRoundedRect(x, y + 1, Math.max(0, w * boss.hp / boss.maxHp), 12, 4);
    setT(this.bossT, `${boss.def.name}  ${Math.ceil(boss.hp)}`);
    this.bossT.setY(y + 7);
  }

  overlay(w, h) {
    const items = [];
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0xf6ecd0, 1); g.fillRoundedRect(W / 2 - w / 2, H / 2 - h / 2, w, h, 14);
    g.lineStyle(4, 0xc8262e, 1); g.strokeRoundedRect(W / 2 - w / 2, H / 2 - h / 2, w, h, 14);
    g.lineStyle(1.5, 0x2b1a0e, 1); g.strokeRoundedRect(W / 2 - w / 2 + 8, H / 2 - h / 2 + 8, w - 16, h - 16, 10);
    items.push(dim, g);
    return items;
  }

  closeOverlay() {
    (this.modalItems || []).forEach(o => o.destroy());
    this.modalItems = null;
    this.modal = false;
    this.gs.modal = false;
  }

  confirmExit() {
    if (this.modal || this.gs.over) return;
    this.modal = true; this.gs.modal = true;
    const wasPaused = this.gs.paused;
    this.gs.paused = true;
    const items = this.overlay(460, 220);
    items.push(this.add.text(W / 2, H / 2 - 60, 'Natrag u izbornik?', { fontFamily: FONT_T, fontSize: '28px', color: '#b8222a', fontStyle: 'bold' }).setOrigin(0.5));
    items.push(this.add.text(W / 2, H / 2 - 18, 'Igra je spremljena na početku ovog vala\npa možeš nastaviti kasnije.', {
      fontFamily: FONT, fontSize: '15px', color: '#2b1a0e', align: 'center',
    }).setOrigin(0.5));
    const yes = makeButton(this, W / 2 - 90, H / 2 + 55, 150, 44, 'Izađi', () => { this.scene.stop('Game'); this.scene.start('Menu'); });
    const no = makeButton(this, W / 2 + 90, H / 2 + 55, 150, 44, 'Igraj dalje', () => { this.closeOverlay(); this.gs.paused = wasPaused; }, { fill: '#f2c21c' });
    items.push(yes.ct, no.ct);
    this.modalItems = items;
  }

  showHelp() {
    if (this.modal || this.gs.over) return;
    this.modal = true; this.gs.modal = true;
    const wasPaused = this.gs.paused;
    this.gs.paused = true;
    const items = this.overlay(700, 560);
    items.push(this.add.text(W / 2, H / 2 - 245, 'Kak se brani Gruntovec', { fontFamily: FONT_T, fontSize: '28px', color: '#b8222a', fontStyle: 'bold' }).setOrigin(0.5));
    const body = [
      'Napadači idu putem do Dudekove hiže. Svaki koji uđe odnese jedno licitarsko srce (veliki šefovi 5, direktor 10).',
      '',
      'Dudek – baca vile, brz i jeftin.          Regica – lonac pogađa sve oko sebe (ne i ptice).',
      'Mamica – kune pa svi hodaju sporije.      Lovec Pepek – daleko, jako, probija pola oklopa.',
      'Pčelinjak – ubodi peku 3 s, kroz oklop.   Kapelica – zvono udari sve u krugu i omami.',
      '',
      'Poreznik, vepar, bager i komisija imaju oklop: vile, lonci i puška im manje škode,',
      'a pčele, Mamica i zvono jednako. Vrane i jastreb lete prečacem preko polja – Regica ih ne doseže.',
      '',
      'Svaki branitelj ima 4 razine. Prodaja vraća 70 %, a sve u istoj pauzi prije vala 100 %.',
      'Pokreni val ranije za bonus. Između valova igra se sama spremi.',
      'Godišnja doba se mijenjaju: proljeće, ljeto, jesen pa zima.',
      '',
      '1–6 branitelji  ·  U nadogradi  ·  X prodaj  ·  T način ciljanja  ·  Esc odustani',
      'Razmak val  ·  P pauza  ·  F brzina  ·  M glazba  ·  kotačić / + − zum  ·  WASD, strelice ili povuci',
    ].join('\n');
    items.push(this.add.text(W / 2, H / 2 + 5, body, {
      fontFamily: FONT, fontSize: '14px', color: '#2b1a0e', align: 'left', lineSpacing: 4, wordWrap: { width: 640 },
    }).setOrigin(0.5));
    const ok = makeButton(this, W / 2, H / 2 + 240, 180, 44, 'Razumijem', () => { this.closeOverlay(); this.gs.paused = wasPaused; }, { fill: '#f2c21c' });
    items.push(ok.ct);
    this.modalItems = items;
  }

  showEnd(win) {
    const gs = this.gs;
    this.closeOverlay();
    this.modal = true;
    const items = this.overlay(560, 400);
    items.push(this.add.text(W / 2, H / 2 - 140, win ? 'Gruntovec je obranjen!' : 'Gruntovec je pal...', {
      fontFamily: FONT_T, fontSize: '38px', color: win ? '#2e7a2a' : '#b8222a', fontStyle: 'bold',
    }).setOrigin(0.5));
    items.push(this.add.text(W / 2, H / 2 - 92, win
      ? 'Dudek i Regica slave uz tamburice. Drug direktor je otišel nazad u grad!'
      : 'Komisija je zauzela Dudekovu hižu. Ali bu još prilike!', {
      fontFamily: FONT, fontSize: '15px', color: '#2b1a0e', align: 'center', wordWrap: { width: 480 },
    }).setOrigin(0.5));
    const s = gs.stats;
    items.push(this.add.text(W / 2, H / 2 - 4, [
      `Karta: ${gs.size.name}  ·  ${gs.diff.name}`,
      `Valova odbijeno: ${win ? gs.size.waves : Math.max(0, gs.waveNum - 1)} / ${gs.size.waves}`,
      `Ulovljeno napadača: ${s.kills}   ·   Pobjeglo: ${s.leaked}`,
      `Postavljeno branitelja: ${s.built}`,
      `Vrijeme igre: ${fmtTime(s.time)}   ·   Preostala srca: ${Math.max(0, gs.lives)}`,
    ].join('\n'), { fontFamily: FONT, fontSize: '16px', color: '#2b1a0e', align: 'center', lineSpacing: 6 }).setOrigin(0.5));
    const again = makeButton(this, W / 2 - 110, H / 2 + 135, 190, 48, 'Igraj opet', () => {
      this.scene.start('Game', { sizeKey: gs.cfg.sizeKey, diffKey: gs.cfg.diffKey, seed: (Math.random() * 1e9) | 0 });
    }, { fill: '#f2c21c' });
    const menu = makeButton(this, W / 2 + 110, H / 2 + 135, 190, 48, 'Izbornik', () => { this.scene.stop('Game'); this.scene.start('Menu'); });
    items.push(again.ct, menu.ct);
    this.modalItems = items;
  }
}

function statLines(def, L, showNext) {
  const f = (arr, unit = '', mul = 1, dec = 0) => {
    const v = (arr[L] * mul).toFixed(dec);
    const n = showNext ? ` → ${(arr[L + 1] * mul).toFixed(dec)}` : '';
    return v + n + unit;
  };
  const out = [];
  if (def.aura) out.push(`Usporava: ${f(def.slow, ' %', 100)}`, `Šteta: ${f(def.dps, '/s')}`);
  else if (def.pulse) out.push(`Šteta: ${f(def.dmg)}`, `Zvoni svakih: ${f(def.period, ' s', 1, 1)}`, `Omami: ${f(def.stun, ' s', 1, 2)}`);
  else if (def.proj === 'pcela') out.push(`Otrov: ${f(def.dps, '/s')} kroz 3 s`, `Pčela odjednom: ${f(def.targets)}`);
  else out.push(`Šteta: ${f(def.dmg)}`, `Hitaca: ${f(def.rate, '/s', 1, 2)}`);
  if (def.splash) out.push(`Prskanje: ${f(def.splash)}`);
  out.push(`Domet: ${f(def.range)}`);
  out.push(`Gađa ptice: ${def.air ? 'da' : 'ne'}`);
  return out;
}
