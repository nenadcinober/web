'use strict';

// Gruntovec Run: an OutRun-style pseudo-3D race. Dudek drives his horse cart across Podravina,
// with Regica beside him, trying to reach the big fair in Koprivnica before time runs out.
// The road renderer follows the classic segment-projection technique: the road is a list of
// short segments, each projected to the screen and drawn back to front with sprites on top.

const W = 1024, H = 768;
const STEP = 1 / 60;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const ROAD_WIDTH = 2000;
const LANES = 3;
const FIELD_OF_VIEW = 100;
const CAMERA_HEIGHT = 1000;
const DRAW_DISTANCE = 400;
const FOG_DENSITY = 2.5;
const CAMERA_DEPTH = 1 / Math.tan((FIELD_OF_VIEW / 2) * Math.PI / 180);
const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;
const MAX_SPEED = SEGMENT_LENGTH / STEP;
const ACCEL = MAX_SPEED / 5;
const BREAKING = -MAX_SPEED;
const DECEL = -MAX_SPEED / 5;
const OFF_ROAD_DECEL = -MAX_SPEED / 2;
const OFF_ROAD_LIMIT = MAX_SPEED / 4;
const CENTRIFUGAL = 0.36;
const SPRITE_SCALE = 0.3 / 80;
const TOP_KMH = 64;
const START_TIME = 34;

const HILLS_Y = 226;
const FIELDS_Y = 252;
const FOG = 0xd4e6ee;

const PLACES = ['Gruntovec', 'Hlebine', 'Novigrad', 'Virje', 'Molve', 'Đurđevac', 'Koprivnica'];
const STAGES = [
  { theme: 'selo', length: 1300, extend: 0, pano: 7 },
  { theme: 'polja', length: 1300, extend: 28 },
  { theme: 'selo', length: 1300, extend: 28, pano: 9 },
  { theme: 'polja', length: 1300, extend: 28 },
  { theme: 'drava', length: 1300, extend: 29 },
  { theme: 'pijesci', length: 1450, extend: 31 },
];
const TRAFFIC = [
  { key: 'traktor', min: 0.18, max: 0.28 },
  { key: 'zaprega', min: 0.15, max: 0.25 },
  { key: 'bicikl', min: 0.1, max: 0.18 },
  { key: 'fico', min: 0.35, max: 0.5 },
  { key: 'fico2', min: 0.35, max: 0.5 },
];
const PALETTES = {
  green: {
    light: { road: 0x6c6c6c, grass: 0x6cae3f, rumble: 0xf2f2f2, lane: 0xf2f2f2 },
    dark: { road: 0x6c6c6c, grass: 0x5d9f35, rumble: 0xc62828 },
  },
  sand: {
    light: { road: 0x747068, grass: 0xdcc88e, rumble: 0xf2f2f2, lane: 0xf2f2f2 },
    dark: { road: 0x747068, grass: 0xcfb97c, rumble: 0xc62828 },
  },
};

const LINES = {
  crash: [['regica', 'Joj, Dudek! Pazi kam voziš!'], ['regica', 'Dudek, bu nas Bog kaznil!'], ['regica', 'Kola buš razbil, Dudek!'],
    ['regica', 'Polako, jajca se bu potrla!'], ['regica', 'Joj meni, zakaj sam se za tebe vudala!'],
    ['dudek', 'Regica, ne gnjavi!'], ['dudek', 'Kaj se je to tu stvorilo?!'], ['dudek', 'Hijo, konjič, hijo!']],
  offroad: [['regica', 'Dudek, to je njiva, ne cesta!'], ['regica', 'Kuruzu buš pogazil!'], ['dudek', 'Prečac, Regica, prečac!']],
  checkpoint: [['regica', 'Brže, Dudek, sajam čeka!'], ['dudek', 'Dijo! Još malo, Regica!'], ['regica', 'Bravo, Dudek! Samo tak dalje!']],
  hurry: [['regica', 'Dudek, brže! Sajam bu gotov!']],
  start: [['dudek', 'Regica, drži se! Dijo!']],
  finish: [['regica', 'Dudek, ti si moj junak!']],
  timeup: [['regica', 'Joj, Dudek... zakasnili smo.']],
};

const U = {
  increase(start, inc, max) { let r = start + inc; while (r >= max) r -= max; while (r < 0) r += max; return r; },
  limit: (v, a, b) => Math.max(a, Math.min(v, b)),
  interpolate: (a, b, p) => a + (b - a) * p,
  easeIn: (a, b, p) => a + (b - a) * Math.pow(p, 2),
  easeInOut: (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5),
  percentRemaining: (n, total) => (n % total) / total,
  overlap(x1, w1, x2, w2, percent = 1) {
    const half = percent / 2;
    return !((x1 + w1 * half) < (x2 - w2 * half) || (x1 - w1 * half) > (x2 + w2 * half));
  },
  fog: (d, density) => 1 / Math.pow(Math.E, d * d * density),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
};

function project(p, camX, camY, camZ) {
  p.camera.x = (p.world.x || 0) - camX;
  p.camera.y = (p.world.y || 0) - camY;
  p.camera.z = (p.world.z || 0) - camZ;
  p.screen.scale = CAMERA_DEPTH / p.camera.z;
  p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
  p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
  p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * W / 2);
}

function quad(g, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  g.fillStyle(color, 1);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath();
  g.fillPath();
}

function drawSegment(g, x1, y1, w1, x2, y2, w2, fog, color) {
  const r1 = w1 / Math.max(6, 2 * LANES), r2 = w2 / Math.max(6, 2 * LANES);
  const l1 = w1 / Math.max(32, 8 * LANES), l2 = w2 / Math.max(32, 8 * LANES);
  g.fillStyle(color.grass, 1);
  g.fillRect(0, y2, W, y1 - y2 + 1);
  quad(g, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
  quad(g, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
  quad(g, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);
  if (color.lane) {
    const lw1 = w1 * 2 / LANES, lw2 = w2 * 2 / LANES;
    let lx1 = x1 - w1 + lw1, lx2 = x2 - w2 + lw2;
    for (let lane = 1; lane < LANES; lane++, lx1 += lw1, lx2 += lw2) {
      quad(g, lx1 - l1 / 2, y1, lx1 + l1 / 2, y1, lx2 + l2 / 2, y2, lx2 - l2 / 2, y2, color.lane);
    }
  }
  if (fog < 1) { g.fillStyle(FOG, 1 - fog); g.fillRect(0, y2, W, y1 - y2 + 1); }
}

// ---------------------------------------------------------------- the road from Gruntovec to Koprivnica

class Track {
  constructor() {
    this.segments = [];
    this.stageEnds = [];
    this.cars = [];
    this.zone = 'green';
  }

  lastY() { return this.segments.length ? this.segments[this.segments.length - 1].p2.world.y : 0; }

  findSegment(z) { return this.segments[Math.floor(z / SEGMENT_LENGTH) % this.segments.length]; }

  addSegment(curve, y) {
    const n = this.segments.length, pal = PALETTES[this.zone];
    this.segments.push({
      index: n,
      p1: { world: { y: this.lastY(), z: n * SEGMENT_LENGTH }, camera: {}, screen: {} },
      p2: { world: { y, z: (n + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
      curve, sprites: [], cars: [], clip: 0, fog: 1, looped: false,
      color: Math.floor(n / RUMBLE_LENGTH) % 2 ? pal.dark : pal.light,
    });
  }

  addRoad(enter, hold, leave, curve, y) {
    const startY = this.lastY(), endY = startY + y * SEGMENT_LENGTH, total = enter + hold + leave;
    for (let n = 0; n < enter; n++) this.addSegment(U.easeIn(0, curve, n / enter), U.easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++) this.addSegment(curve, U.easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) this.addSegment(U.easeInOut(curve, 0, n / leave), U.easeInOut(startY, endY, (enter + hold + n) / total));
  }

  // Podravina is flat, so hills are gentle and always come back down: the backdrop never drifts.
  piece(rng) {
    const S = 25, M = 50, L = 100, hill = 10;
    const dir = rng() < 0.5 ? -1 : 1, r = rng();
    if (r < 0.18) this.addRoad(M, M, M, 0, 0);
    else if (r < 0.40) this.addRoad(M, M, M, dir * 4, 0);
    else if (r < 0.55) { this.addRoad(M, M, M, dir * 2, hill); this.addRoad(M, M, M, -dir * 4, -hill); }
    else if (r < 0.68) { for (let i = 0; i < 2; i++) { this.addRoad(S, S, S, 0, hill); this.addRoad(S, S, S, 0, -hill); } }
    else if (r < 0.76) this.addRoad(L, L, L, dir * 3, 0);
    else if (r < 0.88) { this.addRoad(M, S, M, dir * 5, 0); this.addRoad(M, S, M, -dir * 5, 0); }
    else this.addRoad(S, M, S, dir * 6, 0);
  }

  build(seed) {
    const rng = mulberry32(seed);
    this.addRoad(0, 60, 0, 0, 0);
    STAGES.forEach(st => {
      st.start = this.segments.length;
      this.zone = st.theme === 'pijesci' ? 'sand' : 'green';
      while (this.segments.length - st.start < st.length - 80) {
        // the sands of Đurđevac give way to green fields before Koprivnica
        if (st.theme === 'pijesci' && this.segments.length - st.start > st.length - 560) this.zone = 'green';
        this.piece(rng);
      }
      this.zone = 'green';
      this.addRoad(0, 80, 0, 0, 0);
      this.stageEnds.push(this.segments.length - 20);
    });
    this.finishIndex = this.stageEnds[this.stageEnds.length - 1];
    this.addRoad(0, 420, 0, 0, 0);
    this.length = this.segments.length * SEGMENT_LENGTH;
    for (const n of [12, ...this.stageEnds]) {
      for (const k of [n, n + 1]) {
        this.segments[k].color = Object.assign({}, this.segments[k].color, { road: 0xf4f4f4, rumble: 0xf4f4f4, lane: null });
      }
    }
  }

  decorate(rng) {
    const segs = this.segments;
    const add = (n, key, offset, extra) => {
      n = Math.floor(n);
      if (n >= 0 && n < segs.length) segs[n].sprites.push(Object.assign({ source: SPR[key], offset }, extra || {}));
    };
    const pick = a => a[Math.floor(rng() * a.length)];
    const side = () => (rng() < 0.5 ? -1 : 1);
    const village = (from, to) => {
      for (let n = from; n < to; n += 10 + Math.floor(rng() * 6)) {
        add(n, pick(['kuca', 'kuca', 'kuca2']), -(1.3 + rng() * 0.3));
        if (rng() < 0.85) add(n + 5, pick(['kuca', 'kuca2']), 1.3 + rng() * 0.3);
        if (rng() < 0.3) add(n + 2, 'djeram', -(2.9 + rng()));
        if (rng() < 0.25) add(n + 7, 'guske', 1.15 + rng() * 0.1);
        if (rng() < 0.3) add(n + 3, 'topola', 3 + rng());
      }
    };
    const fields = (from, to, kinds, chance) => {
      for (let n = from; n < to; n += 3) if (rng() < chance) add(n, pick(kinds), side() * (1.25 + rng() * 2.8));
    };
    const avenue = (from, to, off) => { for (let n = from; n < to; n += 6) { add(n, 'topola', -off); add(n + 3, 'topola', off); } };
    const gate = { center: true, ghost: true };

    add(12, 'vrata_0', 0, gate);
    add(20, 'tabla_0', 1.2);
    STAGES.forEach((st, i) => {
      const s = st.start, e = this.stageEnds[i];
      add(e, 'vrata_' + (i + 1), 0, gate);
      add(e - 215, 'tabla_' + (i + 1), 1.2);
      if (st.theme === 'selo') {
        add(s + 10, 'pano_' + st.pano, -1.3);
        add(s + 160, 'crkva', -3.0);
        village(s + 30, s + 300);
        add(s + 320, 'raspelo', 1.2);
        add(s + 450, 'pano_0', 1.3);
        add(s + 820, i === 0 ? 'pano_5' : 'pano_8', -1.3);
        avenue(s + 520, s + 680, 1.25);
        fields(s + 330, e - 220, ['kuruza', 'stog', 'stog', 'suncokret', 'krava', 'hrast', 'topola', 'djeram'], 0.55);
        village(e - 200, e - 30);
      } else if (st.theme === 'polja') {
        add(s + 30, 'pano_2', 1.3);
        add(s + 500, 'raspelo', -1.2);
        add(s + 640, 'pano_4', 1.3);
        add(s + 1000, 'pano_1', -1.3);
        avenue(s + 200, s + 400, 1.2);
        avenue(s + 750, s + 900, 1.2);
        fields(s + 20, e - 220, ['kuruza', 'kuruza', 'suncokret', 'suncokret', 'stog'], 0.75);
        village(e - 200, e - 30);
      } else if (st.theme === 'drava') {
        add(s + 300, 'pano_0', -1.3);
        add(s + 700, 'pano_5', 1.3);
        fields(s + 20, e - 220, ['vrba', 'vrba', 'hrast', 'hrast', 'topola', 'krava', 'guske'], 0.7);
        village(e - 200, e - 120);
        add(e - 100, 'utvrda', -1.6);
        add(e - 70, 'picok', 1.25);
        add(e - 40, 'pano_3', -1.3);
      } else {
        add(s + 40, 'pano_6', 1.3);
        add(s + 300, 'pano_3', -1.3);
        fields(s + 60, e - 560, ['dina', 'dina', 'bor', 'bor', 'bor'], 0.75);
        add(e - 560, 'pano_1', 1.3);
        add(e - 260, 'crkva', -3.0);
        village(e - 500, e - 40);
      }
    });
  }

  clearCars() {
    this.cars = [];
    for (const seg of this.segments) seg.cars = [];
  }

  resetCars(rng) {
    this.clearCars();
    // Spread evenly along the road, one lane each, so traffic never starts as a wall across all three lanes.
    const count = 190, spacing = (this.finishIndex - 60) / count;
    for (let i = 0; i < count; i++) {
      const type = TRAFFIC[Math.floor(rng() * TRAFFIC.length)];
      const segIdx = 30 + Math.floor(i * spacing + rng() * spacing * 0.5);
      const car = {
        offset: [-0.66, 0, 0.66][Math.floor(rng() * 3)] + (rng() - 0.5) * 0.2,
        z: segIdx * SEGMENT_LENGTH,
        sprite: SPR[type.key],
        speed: MAX_SPEED * (type.min + rng() * (type.max - type.min)),
        percent: 0,
      };
      this.segments[segIdx].cars.push(car);
      this.cars.push(car);
    }
  }
}

// ---------------------------------------------------------------- the game

class RaceScene extends Phaser.Scene {
  constructor() { super('race'); }

  create() {
    buildTextures(this);
    this.track = new Track();
    this.track.build(1975);
    this.track.decorate(mulberry32(2024));

    this.add.image(0, 0, 'bg_sky').setOrigin(0).setDepth(0);
    this.clouds = this.add.tileSprite(0, 30, W, 260, 'bg_clouds').setOrigin(0).setDepth(1);
    this.hills = this.add.tileSprite(0, HILLS_Y, W, 200, 'bg_hills').setOrigin(0).setDepth(2);
    this.fields = this.add.tileSprite(0, FIELDS_Y, W, 170, 'bg_fields').setOrigin(0).setDepth(3);
    this.ground = this.add.rectangle(0, FIELDS_Y + 165, W, H, FOG).setOrigin(0).setDepth(3);
    this.roadG = this.add.graphics().setDepth(5);
    this.pool = Array.from({ length: 320 }, () => this.add.image(-999, -999, 'topola').setOrigin(0).setVisible(false));
    this.playerImg = this.add.image(W / 2, H, 'player0').setOrigin(0.5, 1);
    this.hudG = this.add.graphics().setDepth(900);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,Z,X,SPACE,ENTER,M,P');
    this.input.keyboard.on('keydown', () => Sound.init());

    this.position = 0; this.playerX = 0; this.playerY = 0; this.speed = 0;
    this.skyOffset = 0; this.hillOffset = 0; this.treeOffset = 0;
    this.acc = 0; this.steer = 0; this.clop = 0; this.lastClop = 0; this.horseFrame = 0;
    this.bubble = { t: 0, who: 'regica' };
    this.crashCd = 0; this.offroadCd = 0; this.msgTimer = 0;
    this.pDest = { x: W / 2, top: H - 250, w: 300, h: 250 };
    this.best = 0;
    try { this.best = Number(localStorage.getItem('gruntovec-run-best')) || 0; } catch (e) { /* storage blocked */ }

    this.createHud();
    this.createTitle();
    this.toTitle();
  }

  // ------------------------------------------------ UI

  text(x, y, s, size, color, ox = 0, oy = 0, extra = {}) {
    return this.add.text(x, y, s, Object.assign({
      fontFamily: FONT, fontSize: size + 'px', color, stroke: '#1a0f08', strokeThickness: Math.max(3, size / 8),
    }, extra)).setOrigin(ox, oy).setDepth(960);
  }

  createHud() {
    const bar = this.add.rectangle(0, 0, W, 66, 0x000000, 0.35).setOrigin(0).setDepth(950);
    const vez = this.add.tileSprite(0, 66, W, 12, 'vez').setOrigin(0).setDepth(950).setTileScale(0.5);
    this.txtScoreLbl = this.text(18, 6, 'BODOVI', 16, '#ffd23f');
    this.txtScore = this.text(18, 24, '0', 32, '#ffffff');
    this.txtTimeLbl = this.text(W / 2, 4, 'VREME', 16, '#ffd23f', 0.5, 0);
    this.txtTime = this.text(W / 2, 18, '0', 46, '#ffd23f', 0.5, 0, { stroke: '#7a0d0d', strokeThickness: 7 });
    this.txtStageLbl = this.text(W - 18, 6, 'DIONICA 1/4', 16, '#ffd23f', 1, 0);
    this.txtStage = this.text(W - 18, 26, '', 26, '#ffffff', 1, 0);
    this.txtSpeed = this.text(W - 24, H - 86, '0', 52, '#ffffff', 1, 0);
    this.txtKmh = this.text(W - 24, H - 30, 'km/h', 18, '#ffd23f', 1, 0);
    this.txtMusic = this.text(18, H - 98, '♪ M', 14, '#f3ead2', 0, 0, { fontFamily: 'Arial, sans-serif' });
    this.routeLabels = PLACES.map(p => this.text(0, H - 34, p, 13, '#f3ead2', 0.5, 0, { fontFamily: 'Arial, sans-serif', strokeThickness: 3 }));
    this.hudItems = [bar, vez, this.txtScoreLbl, this.txtScore, this.txtTimeLbl, this.txtTime, this.txtStageLbl,
      this.txtStage, this.txtSpeed, this.txtKmh, this.txtMusic, ...this.routeLabels];

    this.msgBig = this.text(W / 2, 250, '', 76, '#ffd23f', 0.5, 0.5, { stroke: '#7a0d0d', strokeThickness: 9 }).setDepth(970);
    this.msgSmall = this.text(W / 2, 322, '', 30, '#ffffff', 0.5, 0.5).setDepth(970);
    this.txtPause = this.text(W / 2, H / 2, 'PAUZA', 80, '#ffffff', 0.5, 0.5).setDepth(990).setVisible(false);
    this.bubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#222', align: 'center', wordWrap: { width: 260 },
    }).setDepth(905).setVisible(false);
  }

  createTitle() {
    const c = this.add.container(0, 0).setDepth(980);
    const g = this.add.graphics();
    g.fillStyle(0x1a0f08, 0.66); g.fillRoundedRect(W / 2 - 400, 96, 800, 470, 18);
    g.lineStyle(4, 0xffd23f, 0.9); g.strokeRoundedRect(W / 2 - 400, 96, 800, 470, 18);
    const vez1 = this.add.tileSprite(W / 2 - 380, 114, 760, 18, 'vez').setOrigin(0).setTileScale(0.75);
    const vez2 = this.add.tileSprite(W / 2 - 380, 530, 760, 18, 'vez').setOrigin(0).setTileScale(0.75);
    const title = this.text(W / 2, 190, 'GRUNTOVEC RUN', 92, '#ffd23f', 0.5, 0.5, { stroke: '#b71c1c', strokeThickness: 10 });
    const sub = this.text(W / 2, 262, 'Dudek i Regica jure na kolima na veliki sajam v Koprivnicu!', 24, '#ffffff', 0.5, 0.5,
      { fontFamily: 'Arial, sans-serif', fontStyle: 'bold' });
    const route = this.text(W / 2, 300, PLACES.join('  →  '), 22, '#ffe08a', 0.5, 0.5);
    const help = this.text(W / 2, 372,
      '←  →   upravljanje        ↑ / Z   dijo! (brže)        ↓ / X   koči\nM   muzika        P   pauza', 19, '#f3ead2', 0.5, 0.5,
      { fontFamily: 'Arial, sans-serif', align: 'center', lineSpacing: 10 });
    this.titleBest = this.text(W / 2, 436, '', 20, '#ffd23f', 0.5, 0.5);
    const press = this.text(W / 2, 486, 'Pritisni SPACE ili ENTER', 34, '#ffffff', 0.5, 0.5);
    this.tweens.add({ targets: press, alpha: 0.25, duration: 650, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    c.add([g, vez1, vez2, title, sub, route, help, this.titleBest, press]);
    this.titleC = c;
  }

  showMessage(big, small, duration) {
    this.msgBig.setText(big).setVisible(true).setScale(1);
    this.msgSmall.setText(small || '').setVisible(true);
    this.tweens.add({ targets: this.msgBig, scale: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.Out' });
    this.msgTimer = duration;
  }

  say(kind) {
    const [who, text] = U.pick(LINES[kind]);
    this.bubble = { t: 2.4, who, text };
    this.bubbleText.setText(text);
  }

  // ------------------------------------------------ flow

  toTitle() {
    this.state = 'title';
    this.position = 0; this.playerX = 0; this.speed = MAX_SPEED * 0.3; this.stage = 0;
    this.track.clearCars();
    this.titleC.setVisible(true);
    this.titleBest.setText(this.best ? `Najbolji rezultat: ${this.best}` : 'Stigni do sajma prije nego vreme istekne!');
    this.msgBig.setVisible(false); this.msgSmall.setVisible(false);
    this.bubble.t = 0;
    this.paused = false; this.txtPause.setVisible(false);
  }

  startRace() {
    Sound.init();
    this.track.resetCars(mulberry32((Math.random() * 1e9) | 0));
    this.position = 0; this.playerX = 0; this.speed = 0;
    this.timeLeft = START_TIME; this.score = 0; this.stage = 0;
    this.countdown = 3; this.lastCount = 4; this.lastBeep = 99; this.hurried = {};
    this.state = 'countdown'; this.stateTimer = 0;
    this.titleC.setVisible(false);
    this.say('start');
  }

  finishRace() {
    this.state = 'finish'; this.stateTimer = 0;
    const bonus = Math.ceil(this.timeLeft) * 1000;
    this.score = Math.floor(this.score) + bonus;
    this.showMessage('CILJ! KOPRIVNICA', `Stigli smo na sajam!  Bonus za vreme: ${bonus}`, 4);
    Sound.fanfare();
    this.say('finish');
    this.saveBest();
  }

  saveBest() {
    if (this.score <= this.best) return;
    this.best = Math.floor(this.score);
    try { localStorage.setItem('gruntovec-run-best', String(this.best)); } catch (e) { /* storage blocked */ }
  }

  handleKeys() {
    const k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    const go = JD(k.SPACE) | JD(k.ENTER);
    if (go && this.state === 'title') this.startRace();
    else if (go && this.state === 'over') this.toTitle();
    if (JD(k.M)) this.txtMusic.setText(Sound.toggleMusic() ? '♪ M' : '♪ M (ugašeno)');
    if (JD(k.P) && this.state !== 'title') { this.paused = !this.paused; this.txtPause.setVisible(this.paused); }
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.handleKeys();
    if (!this.paused) {
      this.acc += dt;
      while (this.acc >= STEP) { this.tick(STEP); this.acc -= STEP; }
    }
    this.renderWorld();
    this.renderHud(this.paused ? 0 : dt);
  }

  // ------------------------------------------------ simulation

  tick(dt) {
    const T = this.track;
    const playerSegment = T.findSegment(this.position + PLAYER_Z);
    const playerW = SPR.player0.w * SPRITE_SCALE;
    const speedPercent = this.speed / MAX_SPEED;
    const dx = dt * 2 * speedPercent;
    const startPosition = this.position;
    const racing = this.state === 'race';

    this.updateCars(dt, playerSegment, playerW);
    this.position = U.increase(this.position, dt * this.speed, T.length);

    const k = this.keys;
    let left = false, right = false, faster = false, slower = false;
    if (racing) {
      left = k.LEFT.isDown || k.A.isDown;
      right = k.RIGHT.isDown || k.D.isDown;
      faster = k.UP.isDown || k.W.isDown || k.Z.isDown;
      slower = k.DOWN.isDown || k.S.isDown || k.X.isDown;
    } else if (this.state === 'title') {
      faster = this.speed < MAX_SPEED * 0.45;
    } else if (this.state === 'finish') {
      slower = true;
    }

    if (left) this.playerX -= dx;
    else if (right) this.playerX += dx;
    if (racing) this.playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL;
    else this.playerX += (0 - this.playerX) * Math.min(1, dt * 2);
    this.steer += ((left ? -1 : right ? 1 : 0) - this.steer) * 0.2;

    if (faster) this.speed += ACCEL * dt;
    else if (slower) this.speed += BREAKING * dt;
    else this.speed += DECEL * dt;

    if (racing) this.collide(dt, playerSegment, playerW);

    this.playerX = U.limit(this.playerX, -3, 3);
    this.speed = U.limit(this.speed, 0, MAX_SPEED);

    const moved = this.position - startPosition;
    if (moved > 0 && moved < 10000) {
      const turn = playerSegment.curve * moved / SEGMENT_LENGTH;
      this.skyOffset = U.increase(this.skyOffset, 0.001 * turn, 1);
      this.hillOffset = U.increase(this.hillOffset, 0.002 * turn, 1);
      this.treeOffset = U.increase(this.treeOffset, 0.003 * turn, 1);
    }

    if (this.speed > 60) {
      this.clop += dt * (1.5 + 7 * this.speed / MAX_SPEED);
      if (Math.floor(this.clop) !== this.lastClop) {
        this.lastClop = Math.floor(this.clop);
        this.horseFrame = this.lastClop % 2;
        Sound.clop(this.horseFrame);
      }
    }

    this.crashCd -= dt; this.offroadCd -= dt;
    this.playerSegIndex = playerSegment.index;
    this.logic(dt, playerSegment);
  }

  collide(dt, playerSegment, playerW) {
    const T = this.track;
    if (this.playerX < -1 || this.playerX > 1) {
      if (this.speed > OFF_ROAD_LIMIT) this.speed += OFF_ROAD_DECEL * dt;
      if (this.speed > OFF_ROAD_LIMIT * 0.8 && this.offroadCd <= 0 && this.bubble.t <= 0) { this.say('offroad'); this.offroadCd = 8; }
      for (const sp of playerSegment.sprites) {
        if (sp.ghost) continue;
        const spriteW = sp.source.w * SPRITE_SCALE;
        if (U.overlap(this.playerX, playerW, sp.offset + spriteW / 2 * (sp.offset > 0 ? 1 : -1), spriteW)) {
          this.speed = MAX_SPEED / 5;
          this.position = U.increase(playerSegment.p1.world.z, -PLAYER_Z, T.length);
          this.onCrash();
          break;
        }
      }
    }
    for (const car of playerSegment.cars) {
      const carW = car.sprite.w * SPRITE_SCALE;
      if (this.speed > car.speed && U.overlap(this.playerX, playerW, car.offset, carW, 0.8)) {
        this.speed = car.speed * (car.speed / this.speed);
        this.position = U.increase(car.z, -PLAYER_Z, T.length);
        this.onCrash();
        break;
      }
    }
  }

  onCrash() {
    if (this.crashCd > 0) return;
    this.crashCd = 1.2;
    Sound.crash();
    this.cameras.main.shake(180, 0.006);
    if (this.bubble.t <= 0.8) this.say('crash');
  }

  logic(dt, playerSegment) {
    const T = this.track;
    this.stateTimer = (this.stateTimer || 0) + dt;
    if (this.bubble.t > 0) this.bubble.t -= dt;

    if (this.state === 'title') {
      if (playerSegment.index > 1000) this.position = 0;
    } else if (this.state === 'countdown') {
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this.lastCount && c > 0) { this.lastCount = c; this.showMessage(String(c), '', 0.9); Sound.beep(false); }
      if (this.countdown <= 0) {
        this.state = 'race';
        this.showMessage('DIJO!', 'Na sajam v Koprivnicu!', 1.4);
        Sound.whip(); Sound.beep(true);
      }
    } else if (this.state === 'race') {
      this.timeLeft -= dt;
      this.score += this.speed * dt / 20;
      if (this.timeLeft <= 5 && this.timeLeft > 0) {
        const s = Math.ceil(this.timeLeft);
        if (s !== this.lastBeep) { this.lastBeep = s; Sound.beep(false); }
      }
      if (this.timeLeft < 10 && !this.hurried[this.stage]) { this.hurried[this.stage] = true; this.say('hurry'); }
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = 'timeup'; this.stateTimer = 0;
        Sound.timeUp();
        this.say('timeup');
        this.showMessage('VREME JE ISTEKLO!', 'Sajam bu bez Dudeka i Regice...', 3);
      } else if (playerSegment.index >= T.stageEnds[this.stage]) {
        this.stage++;
        if (this.stage === STAGES.length) this.finishRace();
        else {
          this.timeLeft += STAGES[this.stage].extend;
          this.showMessage('PRODULJENO VREME!', `${PLACES[this.stage].toUpperCase()}  +${STAGES[this.stage].extend} s`, 2.5);
          Sound.checkpoint();
          this.say('checkpoint');
        }
      }
    } else if (this.state === 'timeup' || this.state === 'finish') {
      if (this.speed <= 0 && this.stateTimer > 2.5) {
        const done = this.state === 'finish';
        this.saveBest();
        this.state = 'over';
        this.showMessage(done ? 'CILJ! KOPRIVNICA' : 'VREME JE ISTEKLO!',
          `Bodovi: ${Math.floor(this.score)}   •   SPACE za novu vožnju`, Infinity);
      }
    }
  }

  updateCars(dt, playerSegment, playerW) {
    const T = this.track;
    for (const car of T.cars) {
      const oldSeg = T.findSegment(car.z);
      car.offset += this.carOffset(car, oldSeg, playerSegment, playerW);
      car.z = U.increase(car.z, dt * car.speed, T.length);
      car.percent = U.percentRemaining(car.z, SEGMENT_LENGTH);
      const newSeg = T.findSegment(car.z);
      if (oldSeg !== newSeg) {
        oldSeg.cars.splice(oldSeg.cars.indexOf(car), 1);
        newSeg.cars.push(car);
      }
    }
  }

  // Slower traffic steers around the player and each other when it is about to run into them.
  carOffset(car, carSegment, playerSegment, playerW) {
    const segs = this.track.segments, lookahead = 20, carW = car.sprite.w * SPRITE_SCALE;
    if (carSegment.index - playerSegment.index > DRAW_DISTANCE) return 0;
    for (let i = 1; i < lookahead; i++) {
      const seg = segs[(carSegment.index + i) % segs.length];
      if (seg === playerSegment && car.speed > this.speed && U.overlap(this.playerX, playerW, car.offset, carW, 1.2)) {
        const dir = this.playerX > 0.5 ? -1 : this.playerX < -0.5 ? 1 : (car.offset > this.playerX ? 1 : -1);
        return dir * 1 / i * (car.speed - this.speed) / MAX_SPEED;
      }
      for (const other of seg.cars) {
        const otherW = other.sprite.w * SPRITE_SCALE;
        if (car.speed > other.speed && U.overlap(car.offset, carW, other.offset, otherW, 1.2)) {
          const dir = other.offset > 0.5 ? -1 : other.offset < -0.5 ? 1 : (car.offset > other.offset ? 1 : -1);
          return dir * 1 / i * (car.speed - other.speed) / MAX_SPEED;
        }
      }
    }
    if (car.offset < -0.9) return 0.1;
    if (car.offset > 0.9) return -0.1;
    return 0;
  }

  // ------------------------------------------------ rendering

  drawSprite(idx, sprite, scale, destX, destY, offX, offY, clipY, depth) {
    if (idx >= this.pool.length) return false;
    const k = W / 2 * SPRITE_SCALE * ROAD_WIDTH;
    const destW = sprite.w * scale * k, destH = sprite.h * scale * k;
    destX += destW * offX; destY += destH * offY;
    const clipH = clipY ? Math.max(0, destY + destH - clipY) : 0;
    if (clipH >= destH || destW < 0.5 || destX > W || destX + destW < 0 || destY > H) return false;
    const img = this.pool[idx];
    if (img.texture.key !== sprite.key) img.setTexture(sprite.key);
    img.setCrop(0, 0, img.width, img.height * (1 - clipH / destH));
    img.setPosition(destX, destY).setDisplaySize(destW, destH).setDepth(depth).setVisible(true);
    return true;
  }

  renderWorld() {
    const T = this.track, segs = T.segments, n = segs.length;
    const baseSegment = T.findSegment(this.position);
    const basePercent = U.percentRemaining(this.position, SEGMENT_LENGTH);
    const playerSegment = T.findSegment(this.position + PLAYER_Z);
    const playerPercent = U.percentRemaining(this.position + PLAYER_Z, SEGMENT_LENGTH);
    const playerY = U.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    this.playerY = playerY;

    this.clouds.tilePositionX = this.skyOffset * 2048;
    this.hills.tilePositionX = this.hillOffset * 2048;
    this.fields.tilePositionX = this.treeOffset * 2048;
    const py = U.limit(playerY, -10000, 10000);
    this.hills.y = HILLS_Y + py * 0.0025;
    this.fields.y = FIELDS_Y + py * 0.004;
    this.ground.y = this.fields.y + 165;

    const g = this.roadG;
    g.clear();
    // Project near to far to find what is visible, then paint far to near so each nearer
    // strip covers the one behind it and no grass shows through between road strips.
    const visible = [];
    let maxy = H, x = 0, dx = -(baseSegment.curve * basePercent);
    for (let i = 0; i < DRAW_DISTANCE; i++) {
      const seg = segs[(baseSegment.index + i) % n];
      seg.looped = seg.index < baseSegment.index;
      seg.fog = U.fog(i / DRAW_DISTANCE, FOG_DENSITY);
      seg.clip = maxy;
      const camX = this.playerX * ROAD_WIDTH, camZ = this.position - (seg.looped ? T.length : 0);
      project(seg.p1, camX - x, playerY + CAMERA_HEIGHT, camZ);
      project(seg.p2, camX - x - dx, playerY + CAMERA_HEIGHT, camZ);
      x += dx; dx += seg.curve;
      if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
      visible.push(seg);
      maxy = seg.p2.screen.y;
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const seg = visible[i];
      drawSegment(g, seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w, seg.p2.screen.x, seg.p2.screen.y, seg.p2.screen.w, seg.fog, seg.color);
    }

    let used = 0, depth = 10;
    for (let i = DRAW_DISTANCE - 1; i > 0; i--) {
      const seg = segs[(baseSegment.index + i) % n];
      for (const car of seg.cars) {
        const scale = U.interpolate(seg.p1.screen.scale, seg.p2.screen.scale, car.percent);
        const sx = U.interpolate(seg.p1.screen.x, seg.p2.screen.x, car.percent) + scale * car.offset * ROAD_WIDTH * W / 2;
        const sy = U.interpolate(seg.p1.screen.y, seg.p2.screen.y, car.percent);
        if (this.drawSprite(used, car.sprite, scale, sx, sy, -0.5, -1, seg.clip, depth)) used++;
        depth += 0.01;
      }
      for (const sp of seg.sprites) {
        const scale = seg.p1.screen.scale;
        const sx = seg.p1.screen.x + scale * sp.offset * ROAD_WIDTH * W / 2;
        const offX = sp.center ? -0.5 : (sp.offset < 0 ? -1 : 0);
        if (this.drawSprite(used, sp.source, scale, sx, seg.p1.screen.y, offX, -1, seg.clip, depth)) used++;
        depth += 0.01;
      }
      if (seg === playerSegment) {
        const scale = CAMERA_DEPTH / PLAYER_Z, k = W / 2 * SPRITE_SCALE * ROAD_WIDTH;
        const destY = H / 2 - scale * U.interpolate(seg.p1.camera.y, seg.p2.camera.y, playerPercent) * H / 2;
        const dw = SPR.player0.w * scale * k, dh = SPR.player0.h * scale * k;
        const rough = this.playerX < -1 || this.playerX > 1;
        const bounce = (rough ? 4 : 1.2) * Math.random() * (this.speed / MAX_SPEED) * (Math.random() < 0.5 ? -1 : 1);
        this.playerImg.setTexture(this.horseFrame ? 'player1' : 'player0')
          .setDisplaySize(dw, dh).setPosition(W / 2, destY + bounce)
          .setRotation(this.steer * 0.045 * Math.min(1, this.speed / (MAX_SPEED * 0.2))).setDepth(depth);
        this.pDest = { x: W / 2, top: destY - dh, w: dw, h: dh };
        depth += 0.01;
      }
    }
    for (let i = used; i < this.pool.length; i++) {
      if (!this.pool[i].visible) break;
      this.pool[i].setVisible(false);
    }
  }

  renderHud(dt) {
    const g = this.hudG;
    g.clear();
    const ui = this.state !== 'title';
    this.hudItems.forEach(o => o.setVisible(ui));
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) { this.msgBig.setVisible(false); this.msgSmall.setVisible(false); }
    }

    if (ui) {
      this.txtScore.setText(String(Math.floor(this.score)));
      const t = Math.max(0, Math.ceil(this.timeLeft));
      this.txtTime.setText(String(t));
      this.txtTime.setColor(t <= 10 && this.state === 'race' && Math.floor(this.timeLeft * 4) % 2 === 0 ? '#ff5a4a' : '#ffd23f');
      const s = Math.min(this.stage, STAGES.length - 1);
      this.txtStageLbl.setText(`DIONICA ${s + 1}/${STAGES.length}`);
      this.txtStage.setText(`${PLACES[s]} → ${PLACES[s + 1]}`);
      this.txtSpeed.setText(String(Math.round(this.speed / MAX_SPEED * TOP_KMH)));

      const bars = 18, lit = Math.round(this.speed / MAX_SPEED * bars);
      for (let i = 0; i < bars; i++) {
        const h = 8 + i * 2.6, bx = W - 340 + i * 12;
        const col = i < 8 ? 0x4cd137 : i < 14 ? 0xfbc531 : 0xe84118;
        g.fillStyle(i < lit ? col : 0x000000, i < lit ? 1 : 0.35);
        g.fillRect(bx, H - 26 - h, 10, h);
      }

      const y = H - 46, x0 = 44, x1 = 520, T = this.track;
      g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x0 - 28, y - 30, x1 - x0 + 56, 64, 10);
      g.lineStyle(4, 0xf3ead2, 1); g.lineBetween(x0, y, x1, y);
      PLACES.forEach((p, i) => {
        const f = i === 0 ? 0 : T.stageEnds[i - 1] / T.finishIndex, px = x0 + f * (x1 - x0);
        g.fillStyle(i <= this.stage ? 0xc62a32 : 0xf3ead2, 1); g.fillCircle(px, y, 7);
        this.routeLabels[i].setPosition(px, y + 10);
      });
      const px = x0 + U.limit((this.playerSegIndex || 0) / T.finishIndex, 0, 1) * (x1 - x0);
      g.fillStyle(0xffd23f, 1); g.fillTriangle(px - 9, y - 24, px + 9, y - 24, px, y - 8);
    }

    const b = this.bubble;
    this.bubbleText.setVisible(b.t > 0);
    if (b.t > 0) {
      const p = this.pDest;
      const hx = p.x + (b.who === 'regica' ? 0.17 : -0.17) * p.w, hy = p.top + p.h * 0.12;
      const bw = this.bubbleText.width + 26, bh = this.bubbleText.height + 18;
      const bx = U.limit(hx - bw / 2 + (b.who === 'regica' ? 60 : -60), 10, W - bw - 10), by = hy - bh - 34;
      const border = b.who === 'regica' ? 0xc62a32 : 0x1d1d1d;
      g.fillStyle(0xffffff, 0.96); g.fillRoundedRect(bx, by, bw, bh, 14);
      g.lineStyle(3, border, 1); g.strokeRoundedRect(bx, by, bw, bh, 14);
      const tx = U.limit(hx, bx + 20, bx + bw - 20);
      g.fillStyle(0xffffff, 0.96); g.fillTriangle(tx - 10, by + bh - 2, tx + 10, by + bh - 2, hx, hy - 6);
      g.lineStyle(3, border, 1); g.lineBetween(tx - 10, by + bh, hx, hy - 6); g.lineBetween(tx + 10, by + bh, hx, hy - 6);
      this.bubbleText.setPosition(bx + 13, by + 9);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [RaceScene],
});
