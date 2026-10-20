'use strict';

// The game world: map, towers, enemies, projectiles and the wave clock. The HUD lives in UIScene (ui.js).

const SAYINGS = {
  dudek: ['Bež\' odi!', 'Kaj je sad ovo?!', 'Ne bu išlo!', 'Regica, dojdi!', 'To je moja zemlja!'],
  regica: ['Evo ti lonec!', 'Dudek, pomozi!', 'Van iz moje kuhnje!', 'Sram te bilo!'],
  mamica: ['Bog vas vidi!', 'Kaj delate, nesrečniki?!', 'Bum vam ja!', 'Joj meni!'],
  lovec: ['Bum ti ja pokazal!', 'Pif-paf!', 'Ni lova bez Pepeka!'],
  pcele: ['Bzzz!', 'Bzz-bzz-bzz!'],
  zvono: ['Bim-bam!', 'Ding-dong!'],
};
const BOSS_LINES = {
  komisija: 'Imate li vi papire za to?',
  jastreb: 'Kriiiii!',
  bager: 'Brrrm! Tu bu nova cesta!',
  direktor: 'Ja sam ovdje glavni!',
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    makeUiTextures(this);
    this.scene.start('Menu');
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.cfg = data; }

  create() {
    const d = this.cfg, sv = d.save;
    this.size = SIZES[d.sizeKey];
    this.diff = DIFFS[d.diffKey];
    this.map = generateMap(d.sizeKey, d.seed);
    this.pw = this.map.W * TILE; this.ph = this.map.H * TILE;
    this.gold = sv ? sv.gold : Math.round(this.size.gold * this.diff.gold);
    this.lives = sv ? sv.lives : this.diff.lives;
    this.waveNum = sv ? sv.wave : 0;
    this.stats = sv ? sv.stats : { kills: 0, built: 0, leaked: 0, time: 0 };
    this.season = seasonFor(this.size, Math.min(this.size.waves, this.waveNum + 1));
    paintMap(this, this.map, this.season);
    this.add.image(0, 0, 'map_bg').setOrigin(0).setDepth(-1);

    this.enemies = []; this.towers = []; this.projectiles = []; this.tracers = [];
    this.towerAt = new Map();
    this.queues = [[], []]; this.qTimers = [0, 0];
    this.spawning = false;
    this.waveLeft = {};
    this.countdown = this.waveNum > 0 ? this.size.breakSec : null;
    this.speed = 1; this.paused = false; this.over = false; this.modal = false;
    this.buildType = null; this.selected = null;
    this.lastSay = -10; this.bubbles = 0;
    this.pending = [];
    // birds cut the corners of the track diagonally, so they still pass over the defenders
    this.flyRoutes = this.map.routes.map(r => makeRoute(r.points.filter((p, i) => i === 0 || i === r.points.length - 1 || i % 2 === 0)));
    this.home = this.map.routes[0].points[this.map.routes[0].points.length - 1];

    this.gridG = this.add.graphics().setDepth(19000);
    this.rangeG = this.add.graphics().setDepth(20000);
    this.fxG = this.add.graphics().setDepth(30000);
    this.barsG = this.add.graphics().setDepth(31000);
    this.ghost = this.add.image(0, 0, 't_dudek').setScale(0.5).setOrigin(0.5, 0.96).setAlpha(0.75).setVisible(false).setDepth(25000);
    this.ghostTile = null;

    this.setupCamera();
    this.setupInput();
    this.spawnHens();
    this.storkT = 20;

    if (sv) for (const t of sv.towers) this.buildTower(t.type, t.tx, t.ty, t);

    this.scene.launch('UI');
    this.events.once('shutdown', () => { this.scene.stop('UI'); this.ui = null; });
    if (sv) this.later(ui => ui.toast(`Nastavljamo: val ${this.waveNum + 1} od ${this.size.waves}`));
    else this.later(ui => ui.toast('Postavi branitelje uz put pa klikni "Kreni!"', 5000));
  }

  later(f) { if (this.ui) f(this.ui); else this.pending.push(() => f(this.ui)); }

  // ---------- camera & input ----------

  setupCamera() {
    const cam = this.cameras.main;
    cam.setViewport(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    cam.setBackgroundColor('#4a6a2a');
    cam.setBounds(0, 0, this.pw, this.ph);
    this.minZoom = Math.min(1, VIEW.w / this.pw, VIEW.h / this.ph);
    cam.setZoom(Math.max(this.minZoom, 0.75));
    const start = this.map.routes[0].points[0];
    // open on the entrance, where the first defenders will go
    cam.centerOn(start.x + VIEW.w / cam.zoom / 2 - 20, start.y);
  }

  zoomBy(f, sx = VIEW.x + VIEW.w / 2, sy = VIEW.y + VIEW.h / 2) {
    const cam = this.cameras.main;
    const z1 = cam.zoom, z2 = Phaser.Math.Clamp(z1 * f, this.minZoom, 1.6);
    const ox = sx - VIEW.x - cam.width / 2, oy = sy - VIEW.y - cam.height / 2;
    const wx = cam.scrollX + cam.width / 2 + ox / z1, wy = cam.scrollY + cam.height / 2 + oy / z1;
    cam.setZoom(z2);
    cam.scrollX = wx - cam.width / 2 - ox / z2;
    cam.scrollY = wy - cam.height / 2 - oy / z2;
  }

  inView(p) { return p.x >= VIEW.x && p.x < VIEW.x + VIEW.w && p.y >= VIEW.y && p.y < VIEW.y + VIEW.h; }

  setupInput() {
    const cam = this.cameras.main;
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', p => {
      Sound.init();
      if (!this.inView(p) || this.over || this.modal) return;
      if (p.button === 2 && (this.buildType || this.selected)) { this.cancelBuild(); this.select(null); return; }
      this.press = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY, drag: p.button !== 0, btn: p.button };
    });
    this.input.on('pointermove', p => {
      const pr = this.press;
      if (pr && p.isDown) {
        const dx = p.x - pr.x, dy = p.y - pr.y;
        if (!pr.drag && Math.abs(dx) + Math.abs(dy) > 10) pr.drag = true;
        if (pr.drag) { cam.scrollX = pr.sx - dx / cam.zoom; cam.scrollY = pr.sy - dy / cam.zoom; }
      }
      this.updateGhost(p);
    });
    this.input.on('pointerup', p => {
      const pr = this.press;
      this.press = null;
      if (!pr || pr.drag || pr.btn !== 0 || !this.inView(p) || this.over || this.modal) return;
      const w = p.positionToCamera(cam);
      const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
      if (this.buildType) {
        const type = this.buildType;
        if (this.tryBuild(type, tx, ty) && !(p.event && p.event.shiftKey)) this.cancelBuild();
        this.updateGhost(p);
        return;
      }
      this.select(this.towerAt.get(tkey(tx, ty)) || null);
    });
    this.input.on('wheel', (p, objs, dx, dy) => {
      if (!this.inView(p) || this.modal) return;
      this.zoomBy(dy > 0 ? 0.88 : 1 / 0.88, p.x, p.y);
    });

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard.on('keydown', e => {
      Sound.init();
      if (this.over || this.modal) return;
      const k = e.key.toLowerCase();
      const idx = '123456'.indexOf(k);
      if (idx >= 0) { this.selectBuild(TOWER_ORDER[idx]); return; }
      if (k === ' ') { this.callWave(); e.preventDefault(); }
      else if (k === 'escape') { this.cancelBuild(); this.select(null); }
      else if (k === 'u' && this.selected) this.upgrade(this.selected);
      else if ((k === 'x' || k === 'delete' || k === 'backspace') && this.selected) this.sell(this.selected);
      else if (k === 't' && this.selected) this.cycleMode(this.selected);
      else if (k === 'p') this.togglePause();
      else if (k === 'f') this.cycleSpeed();
      else if (k === 'm' && this.ui) this.ui.musicB.setActive(Sound.toggleMusic());
      else if (k === '+' || k === '=') this.zoomBy(1 / 0.85);
      else if (k === '-') this.zoomBy(0.85);
    });
  }

  // ---------- building ----------

  selectBuild(type) {
    if (this.over) return;
    if (this.buildType === type) { this.cancelBuild(); return; }
    this.select(null);
    this.buildType = type;
    this.ghost.setTexture('t_' + type);
    this.drawGrid();
    if (this.lastPointer) this.updateGhost(this.lastPointer);
    if (this.ui) this.ui.infoDirty = true;
  }

  cancelBuild() {
    this.buildType = null;
    this.ghost.setVisible(false);
    this.ghostTile = null;
    this.gridG.clear();
    this.drawRanges();
    if (this.ui) this.ui.infoDirty = true;
  }

  canBuild(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.map.W && ty < this.map.H && !this.map.blocked.has(tkey(tx, ty)) && !this.towerAt.has(tkey(tx, ty));
  }

  drawGrid() {
    const g = this.gridG;
    g.clear();
    g.lineStyle(1, 0xffffff, 0.22);
    for (let y = 0; y < this.map.H; y++) for (let x = 0; x < this.map.W; x++) {
      if (this.canBuild(x, y)) g.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
    }
  }

  updateGhost(p) {
    this.lastPointer = p;
    if (!this.buildType || !this.inView(p) || this.modal) { if (this.ghost.visible) { this.ghost.setVisible(false); this.ghostTile = null; this.drawRanges(); } return; }
    const w = p.positionToCamera(this.cameras.main);
    const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
    const ok = this.canBuild(tx, ty) && this.gold >= TOWERS[this.buildType].cost;
    this.ghost.setVisible(true).setPosition(tx * TILE + 20, ty * TILE + 32);
    if (ok) this.ghost.clearTint(); else this.ghost.setTint(0xff7070);
    this.ghostTile = { tx, ty, ok };
    this.drawRanges();
  }

  drawRanges() {
    const g = this.rangeG;
    g.clear();
    const t = this.selected;
    if (t) {
      const r = t.def.range[t.level];
      g.fillStyle(0xfff8e0, 0.15); g.fillCircle(t.x, t.y - 6, r);
      g.lineStyle(2, 0xfff8e0, 0.8); g.strokeCircle(t.x, t.y - 6, r);
      g.lineStyle(2, 0xf2c21c, 1); g.strokeEllipse(t.x, t.y, 44, 20);
    }
    if (this.buildType && this.ghostTile) {
      const { tx, ty, ok } = this.ghostTile;
      const r = TOWERS[this.buildType].range[0];
      const col = ok ? 0xfff8e0 : 0xff5050;
      g.fillStyle(col, 0.15); g.fillCircle(tx * TILE + 20, ty * TILE + 24, r);
      g.lineStyle(2, col, 0.8); g.strokeCircle(tx * TILE + 20, ty * TILE + 24, r);
      g.lineStyle(2, col, 0.9); g.strokeRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2);
    }
  }

  tryBuild(type, tx, ty) {
    const def = TOWERS[type];
    if (!this.canBuild(tx, ty)) { Sound.deny(); return false; }
    if (this.gold < def.cost) { Sound.deny(); this.later(ui => ui.toast('Nema dosta dinara!', 1200)); return false; }
    this.gold -= def.cost;
    this.buildTower(type, tx, ty, null);
    this.stats.built++;
    Sound.build();
    if (this.calm()) this.save();
    return true;
  }

  buildTower(type, tx, ty, saved) {
    const def = TOWERS[type];
    const x = tx * TILE + 20, y = ty * TILE + 32;
    const t = {
      type, def, tx, ty, x, y, level: saved ? saved.level : 0, cd: 0.3, mode: saved ? saved.mode : (def.mode || 'prvi'),
      spent: saved ? saved.spent : def.cost, kills: saved ? saved.kills : 0, fresh: !saved, auraT: 0, stars: [],
    };
    t.base = this.add.image(x, y, 'base' + t.level).setScale(0.5).setDepth(y - 1);
    t.spr = this.add.image(x, y + 1, 't_' + type).setScale(0.5).setOrigin(0.5, 0.96).setDepth(y);
    this.towers.push(t);
    this.towerAt.set(tkey(tx, ty), t);
    this.refreshStars(t);
    if (!saved) {
      t.spr.setScale(0.5, 0.1);
      this.tweens.add({ targets: t.spr, scaleY: 0.5, duration: 260, ease: 'Back.Out' });
      this.puff(x, y, 3);
    }
    if (this.buildType) this.drawGrid();
    return t;
  }

  refreshStars(t) {
    t.stars.forEach(s => s.destroy());
    t.stars = [];
    for (let i = 0; i < t.level; i++) {
      t.stars.push(this.add.image(t.x - (t.level - 1) * 5 + i * 10, t.y + 7, 'star').setScale(0.55).setDepth(t.y + 1));
    }
    t.base.setTexture('base' + t.level);
  }

  select(t) {
    this.selected = t;
    this.drawRanges();
    if (this.ui) this.ui.infoDirty = true;
  }

  refund(t) { return t.fresh ? t.spent : Math.floor(t.spent * 0.7); }

  upgrade(t) {
    if (t.level >= 3) return;
    const cost = t.def.up[t.level];
    if (this.gold < cost) { Sound.deny(); return; }
    this.gold -= cost;
    t.spent += cost;
    t.level++;
    this.refreshStars(t);
    this.tweens.killTweensOf(t.spr);
    t.spr.setScale(0.5).setAngle(0);
    this.tweens.add({ targets: t.spr, scaleX: 0.6, scaleY: 0.6, duration: 120, yoyo: true });
    this.puff(t.x, t.y - 10, 4);
    Sound.coin();
    this.drawRanges();
    if (this.ui) this.ui.infoDirty = true;
    if (this.calm()) this.save();
  }

  sell(t) {
    const r = this.refund(t);
    this.gold += r;
    this.floatText(t.x, t.y - 30, '+' + r, '#f2c21c');
    this.puff(t.x, t.y, 4);
    t.spr.destroy(); t.base.destroy(); t.stars.forEach(s => s.destroy());
    this.towers.splice(this.towers.indexOf(t), 1);
    this.towerAt.delete(tkey(t.tx, t.ty));
    this.select(null);
    Sound.coin();
    if (this.buildType) this.drawGrid();
    if (this.calm()) this.save();
  }

  cycleMode(t) {
    if (t.def.aura || t.def.pulse) return;
    t.mode = MODE_ORDER[(MODE_ORDER.indexOf(t.mode) + 1) % MODE_ORDER.length];
    if (this.ui) this.ui.infoDirty = true;
  }

  togglePause() { if (!this.over) this.paused = !this.paused; }

  cycleSpeed() { this.speed = this.speed === 3 ? 1 : this.speed + 1; this.tweens.timeScale = this.speed; }

  // ---------- waves ----------

  earlyBonus() { return this.countdown ? Math.round(this.countdown * (1 + this.waveNum * 0.08)) : 0; }

  // No enemies on the map and none waiting to come: the only moment the game is saved.
  calm() { return !this.spawning && !this.enemies.length; }

  callWave() {
    if (this.spawning || this.over || this.waveNum >= this.size.waves) return;
    const bonus = this.earlyBonus();
    if (bonus > 0) { this.gold += bonus; Sound.coin(); this.later(ui => ui.toast(`Rani početak: +${bonus} dinara`, 1500)); }
    this.startWave();
  }

  waveRnd(w) { return mulberry32(this.cfg.seed * 31 + w * 7919); }

  previewNext() {
    const n = this.waveNum + 1;
    if (n > this.size.waves) return '';
    const wave = makeWave(this.size, n, this.waveRnd(n));
    const counts = {};
    for (const g of wave.groups) counts[g.type] = (counts[g.type] || 0) + g.count;
    return Object.keys(counts).map(k => `${counts[k]}× ${ENEMIES[k].name}`).join(', ');
  }

  // Waves overlap: the clock for the next one starts as soon as this one has finished coming out,
  // so a game's length depends on the wave count rather than on how long the stragglers take.
  startWave() {
    this.waveNum++;
    const wave = makeWave(this.size, this.waveNum, this.waveRnd(this.waveNum));
    this.queues = [[], []];
    let total = 0;
    for (const g of wave.groups) {
      const gate = Math.min(g.gate, this.map.routes.length - 1);
      const q = this.queues[gate];
      for (let i = 0; i < g.count; i++) q.push({ type: g.type, wait: g.gap });
      q.push({ type: null, wait: 1.8 });
      total += g.count;
    }
    this.waveLeft[this.waveNum] = total;
    this.qTimers = [0.4, 1.4];
    this.spawning = true;
    this.countdown = null;
    for (const t of this.towers) t.fresh = false;
    if (this.ui) this.ui.infoDirty = true;
    const s = seasonFor(this.size, this.waveNum);
    if (s !== this.season) {
      this.season = s;
      paintMap(this, this.map, s);
      this.later(ui => ui.banner(`Došla je ${SEASONS[s].name.toLowerCase()}!\n${wave.title || 'Val ' + this.waveNum}`, '#2e57a8'));
    } else this.later(ui => ui.banner(wave.title || `Val ${this.waveNum}`, wave.boss ? '#5a1a6a' : '#b8222a'));
    if (this.size.spawn2From && this.waveNum === this.size.spawn2From && this.map.routes[1]) {
      const g = this.map.gates[1];
      this.cameras.main.flash(250, 255, 240, 200);
      this.floatText(g.tx * TILE + 20, g.ty * TILE + 20, '!!!', '#c8262e', 32);
    }
    Sound.waveStart();
  }

  spawnDone() {
    this.spawning = false;
    if (this.waveNum >= this.size.waves) return;
    this.countdown = this.size.breakSec;
    if (this.size.spawn2From && this.waveNum + 1 === this.size.spawn2From && this.map.routes[1]) {
      this.later(ui => ui.toast('Pazi! Od sljedećeg vala napadaju i s drugog puta (KOPRIVNICA).\nPostavi branitelje i uz njega!', 6000));
      const g = this.map.gates[1];
      this.cameras.main.pan(g.tx * TILE + 20, g.ty * TILE + 20, 800, 'Sine.easeInOut');
      this.ring(g.tx * TILE + 20, g.ty * TILE + 20, 80, 0xc8262e);
    }
  }

  enemyGone(e) {
    if (--this.waveLeft[e.wave] > 0) return;
    const w = e.wave;
    const bonus = Math.round((30 + 5 * w) * this.diff.gold);
    this.gold += bonus;
    if (w >= this.size.waves) { if (!this.over && this.lives > 0) this.finish(true); return; }
    if (!(this.size.spawn2From && this.waveNum + 1 === this.size.spawn2From)) this.later(ui => ui.toast(`Val ${w} odbijen! +${bonus} dinara`, 2200));
    Sound.coin();
  }

  save() {
    if (this.over) return;
    writeSave({
      v: 1, sizeKey: this.cfg.sizeKey, diffKey: this.cfg.diffKey, seed: this.cfg.seed,
      wave: this.waveNum, gold: this.gold, lives: this.lives, stats: { ...this.stats },
      towers: this.towers.map(t => ({ type: t.type, tx: t.tx, ty: t.ty, level: t.level, mode: t.mode, spent: t.spent, kills: t.kills })),
    });
  }

  finish(win) {
    this.over = true;
    this.cancelBuild();
    this.select(null);
    clearSave();
    if (win) {
      Sound.fanfare();
      for (let i = 0; i < 12; i++) this.time.delayedCall(i * 160, () => this.puff(this.home.x + (Math.random() - 0.5) * 120, this.home.y - Math.random() * 80, 5));
    } else Sound.lose();
    this.later(ui => ui.showEnd(win));
  }

  // ---------- enemies ----------

  spawn(type, gate) {
    const def = ENEMIES[type];
    const route = def.fly ? this.flyRoutes[gate] : this.map.routes[gate];
    const mul = hpMul(this.size, this.diff, this.waveNum);
    const hp = def.hp * (def.boss ? Math.pow(mul, 0.8) : mul);
    const e = {
      type, def, hp, maxHp: hp, route, dist: 0, x: 0, y: 0, dx: 1,
      speed: def.speed * (0.94 + Math.random() * 0.12), curSpeed: def.speed,
      stun: 0, poisonT: 0, poisonDps: 0, slowAura: 0, slowShown: 0, anim: Math.random(), hitT: 0,
      bounty: def.bounty ? Math.max(1, Math.round(def.bounty * bountyMul(this.size, this.diff, this.waveNum))) : 0,
      fly: !!def.fly, dead: false, frame: 0, wob: Math.random() * 6, wave: this.waveNum,
    };
    routePos(route, 0, e);
    e.spr = this.add.image(e.x, e.y, 'e_' + type + '0').setScale(0.5).setOrigin(0.5, e.fly ? 0.5 : 0.88);
    if (e.fly) e.shadow = this.add.image(e.x, e.y, 'shadow').setScale(0.5 * def.r / 14).setDepth(2);
    this.enemies.push(e);
    if (def.boss) {
      Sound.boss();
      this.time.delayedCall(800, () => { if (!e.dead) this.say(e.x, e.y - 40, BOSS_LINES[type], true); });
    }
  }

  damage(e, amt, type, pierce, tower) {
    if (e.dead) return;
    if (type === 'phys' && e.def.armor) amt *= 1 - e.def.armor * (pierce ? 0.5 : 1);
    e.hp -= amt;
    if (amt > 4) e.hitT = 0.07;
    if (e.hp <= 0) this.kill(e, tower);
  }

  kill(e, tower) {
    e.dead = true;
    this.enemyGone(e);
    this.gold += e.bounty;
    this.stats.kills++;
    if (tower) tower.kills++;
    if (e.bounty) this.floatText(e.x, e.y - 20, '+' + e.bounty, '#f2c21c', e.def.boss ? 26 : 14);
    this.puff(e.x, e.y - 8, e.def.boss ? 10 : 3);
    Sound.pop();
    if (e.def.boss) { Sound.boom(); this.cameras.main.shake(250, 0.006); }
    const spr = e.spr;
    this.tweens.add({ targets: spr, alpha: 0, angle: e.dx < 0 ? -80 : 80, y: spr.y - 6, duration: 350, onComplete: () => spr.destroy() });
    if (e.shadow) e.shadow.destroy();
  }

  leak(e) {
    e.dead = true;
    this.enemyGone(e);
    const loss = e.type === 'direktor' ? 10 : e.def.boss ? 5 : 1;
    this.lives -= loss;
    this.stats.leaked++;
    Sound.leak();
    this.cameras.main.shake(180, 0.004);
    this.floatText(this.home.x, this.home.y - 40, '-' + loss, '#c8262e', 22);
    if (this.time.now - this.lastSay > 3) this.say(this.home.x - 30, this.home.y - 30, pick(['Joj, Regica!', 'Ne v hižu!', 'Kaj je to bilo?!']));
    const spr = e.spr;
    this.tweens.add({ targets: spr, alpha: 0, scale: 0.2, duration: 300, onComplete: () => spr.destroy() });
    if (e.shadow) e.shadow.destroy();
    if (this.lives <= 0 && !this.over) this.finish(false);
  }

  // ---------- towers ----------

  inRange(t, e, r2) {
    if (e.dead || (e.fly && !t.def.air)) return false;
    const dx = e.x - t.x, dy = e.y - (t.y - 6);
    return dx * dx + dy * dy <= r2;
  }

  score(t, e) {
    switch (t.mode) {
      case 'zadnji': return e.dist - e.route.total;
      case 'jaki': return e.hp;
      case 'blizu': return -Math.hypot(e.x - t.x, e.y - t.y);
      default: return e.dist - e.route.total;
    }
  }

  targets(t, n) {
    const r = t.def.range[t.level], r2 = r * r;
    const list = [];
    for (const e of this.enemies) if (this.inRange(t, e, r2)) list.push(e);
    if (list.length > 1) list.sort((a, b) => this.score(t, b) - this.score(t, a));
    return list.slice(0, n);
  }

  updateTower(t, dt) {
    const def = t.def, L = t.level;
    if (def.aura) {
      const r = def.range[L], r2 = r * r;
      let any = false;
      for (const e of this.enemies) {
        if (!this.inRange(t, e, r2)) continue;
        any = true;
        e.slowAura = Math.max(e.slowAura, def.slow[L] * (e.def.boss ? 0.5 : 1));
        this.damage(e, def.dps[L] * dt, 'magic', false, t);
      }
      t.auraT -= dt;
      if (any && t.auraT <= 0) {
        t.auraT = 1.3;
        this.ring(t.x, t.y - 6, r, 0x8a4ac8);
        this.tweens.add({ targets: t.spr, angle: { from: -6, to: 6 }, duration: 160, yoyo: true, onComplete: () => t.spr.setAngle(0) });
        this.chatter(t);
      }
      return;
    }
    t.cd -= dt;
    if (t.cd > 0) return;
    if (def.pulse) {
      const r = def.range[L], r2 = r * r;
      const hits = this.enemies.filter(e => this.inRange(t, e, r2));
      if (!hits.length) { t.cd = 0; return; }
      for (const e of hits) {
        this.damage(e, def.dmg[L], 'magic', false, t);
        e.stun = Math.max(e.stun, def.stun[L] * (e.def.boss ? 0.4 : 1));
      }
      t.cd = def.period[L];
      this.ring(t.x, t.y - 20, r, 0xf2c21c);
      this.bellSwing(t);
      Sound.shot('zvono');
      this.chatter(t);
      return;
    }
    const n = def.proj === 'pcela' ? def.targets[L] : 1;
    const tg = this.targets(t, n);
    if (!tg.length) { t.cd = 0; return; }
    t.cd = 1 / def.rate[L];
    t.spr.setFlipX(tg[0].x < t.x - 4);
    if (!this.tweens.isTweening(t.spr)) this.tweens.add({ targets: t.spr, scaleY: 0.44, duration: 70, yoyo: true });
    const sx = t.x + (tg[0].x < t.x ? -8 : 8), sy = t.y - 24;
    for (const e of tg) {
      if (def.proj === 'vile') {
        this.projectiles.push({ kind: 'vile', x: sx, y: sy, target: e, speed: 470, dmg: def.dmg[L], tower: t,
          spr: this.add.image(sx, sy, 'p_vile').setScale(0.5).setDepth(20500) });
      } else if (def.proj === 'pcela') {
        this.projectiles.push({ kind: 'pcela', x: t.x, y: t.y - 30, target: e, speed: 230, dps: def.dps[L], tower: t, wob: Math.random() * 6, age: 0,
          spr: this.add.image(t.x, t.y - 30, 'p_pcela').setScale(0.6).setDepth(20500) });
      } else if (def.proj === 'lonac') {
        const T = 0.6;
        const lead = {};
        if (e.fly) { lead.x = e.x; lead.y = e.y; } else routePos(e.route, Math.min(e.route.total, e.dist + e.curSpeed * T), lead);
        this.projectiles.push({ kind: 'lonac', sx, sy, ex: lead.x, ey: lead.y, t: 0, T, dmg: def.dmg[L], splash: def.splash[L], tower: t,
          spr: this.add.image(sx, sy, 'p_lonac').setScale(0.6).setDepth(20500) });
      } else if (def.proj === 'metak') {
        this.damage(e, def.dmg[L], 'phys', true, t);
        this.tracers.push({ x1: sx, y1: sy - 4, x2: e.x, y2: e.y - 8, t: 0.09 });
        this.puff(sx + (e.x < t.x ? -8 : 8), sy - 4, 1);
      }
    }
    Sound.shot(t.type);
    this.chatter(t);
  }

  bellSwing(t) {
    this.tweens.add({ targets: t.spr, angle: { from: -5, to: 5 }, duration: 120, yoyo: true, repeat: 1, onComplete: () => t.spr.setAngle(0) });
  }

  chatter(t) {
    const now = this.stats.time;
    if (now - this.lastSay < 9 || Math.random() > 0.12) return;
    this.lastSay = now;
    this.say(t.x, t.y - 46, pick(SAYINGS[t.type]));
  }

  updateProjectile(p, dt) {
    if (p.kind === 'lonac') {
      p.t += dt;
      const k = Math.min(1, p.t / p.T);
      p.spr.setPosition(p.sx + (p.ex - p.sx) * k, p.sy + (p.ey - p.sy) * k - Math.sin(k * Math.PI) * 55);
      p.spr.rotation += dt * 9;
      if (k >= 1) {
        const r2 = p.splash * p.splash;
        for (const e of this.enemies) {
          if (e.dead || e.fly) continue;
          const dx = e.x - p.ex, dy = e.y - p.ey, d2 = dx * dx + dy * dy;
          if (d2 <= r2) this.damage(e, p.dmg * (d2 < r2 * 0.25 ? 1 : 0.65), 'phys', false, p.tower);
        }
        const s = this.add.image(p.ex, p.ey, 'splat').setScale(p.splash / 40).setDepth(5).setAlpha(0.9);
        this.tweens.add({ targets: s, alpha: 0, scale: p.splash / 32, duration: 450, onComplete: () => s.destroy() });
        Sound.boom();
        p.done = true;
      }
      return;
    }
    const e = p.target;
    if (e && !e.dead) { p.lx = e.x; p.ly = e.y - (e.fly ? 0 : e.def.r * 0.7); }
    else if (p.lx === undefined) { p.done = true; return; }
    const dx = p.lx - p.x, dy = p.ly - p.y, d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 5) {
      if (e && !e.dead) {
        if (p.kind === 'vile') this.damage(e, p.dmg, 'phys', false, p.tower);
        else {
          e.poisonDps = Math.max(e.poisonT > 0 ? e.poisonDps : 0, p.dps);
          e.poisonT = 3;
          this.damage(e, p.dps * 0.25, 'magic', false, p.tower);
        }
      }
      p.done = true;
      return;
    }
    p.x += dx / d * step; p.y += dy / d * step;
    if (p.kind === 'pcela') {
      p.age += dt;
      const w = Math.sin(p.age * 18 + p.wob) * 6;
      p.spr.setPosition(p.x - dy / d * w, p.y + dx / d * w);
    } else {
      p.spr.setPosition(p.x, p.y);
      p.spr.rotation = Math.atan2(dy, dx);
    }
  }

  // ---------- effects ----------

  puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 10, 'puff').setScale(0.3 + Math.random() * 0.3).setDepth(21000);
      this.tweens.add({ targets: s, alpha: 0, scale: s.scale * 1.8, y: s.y - 14, duration: 420 + Math.random() * 200, onComplete: () => s.destroy() });
    }
  }

  ring(x, y, r, color) {
    const g = this.add.graphics().setDepth(21000).setPosition(x, y);
    g.lineStyle(3, color, 0.9); g.strokeCircle(0, 0, r);
    g.setScale(0.25);
    this.tweens.add({ targets: g, scale: 1, alpha: 0, duration: 520, onComplete: () => g.destroy() });
  }

  floatText(x, y, s, color, size = 14) {
    const t = this.add.text(x, y, s, {
      fontFamily: FONT, fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#2b1a0e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(35000);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  say(x, y, text, big) {
    if (this.bubbles >= 3) return;
    this.bubbles++;
    const txt = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: big ? '15px' : '13px', color: '#2b1a0e', fontStyle: 'bold' }).setOrigin(0.5);
    const w = txt.width + 14, h = txt.height + 8;
    const g = this.add.graphics();
    g.fillStyle(0xfffdf4, 1); g.lineStyle(2, big ? 0xc8262e : 0x2b1a0e, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 7); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
    g.fillTriangle(-4, h / 2 - 1, 6, h / 2 - 1, -6, h / 2 + 8);
    g.lineBetween(-4, h / 2, -6, h / 2 + 8); g.lineBetween(6, h / 2, -6, h / 2 + 8);
    const ct = this.add.container(x, y, [g, txt]).setDepth(40000);
    ct.setScale(Math.min(1.6, 1 / this.cameras.main.zoom));
    ct.setAlpha(0);
    this.tweens.add({ targets: ct, alpha: 1, y: y - 8, duration: 200 });
    this.tweens.add({ targets: ct, alpha: 0, delay: 1900, duration: 400, onComplete: () => { ct.destroy(); this.bubbles--; } });
  }

  spawnHens() {
    this.hens = [];
    const homes = this.map.decor.filter(d => d.kind === 'house' || d.kind === 'stog');
    for (let i = 0; i < Math.min(10, homes.length); i++) {
      const d = homes[i % homes.length];
      const hx = d.tx * TILE + 20, hy = d.ty * TILE + 44;
      const h = { hx, hy, x: hx, y: hy, gx: hx, gy: hy, wait: Math.random() * 3,
        spr: this.add.image(hx, hy, 'hen' + (i % 2)).setScale(0.5).setOrigin(0.5, 0.9) };
      this.hens.push(h);
    }
  }

  updateCosmetics(dt) {
    for (const h of this.hens) {
      if (h.wait > 0) { h.wait -= dt; continue; }
      const dx = h.gx - h.x, dy = h.gy - h.y, d = Math.hypot(dx, dy);
      if (d < 1) {
        h.wait = 1 + Math.random() * 3;
        h.gx = h.hx + (Math.random() - 0.5) * 50; h.gy = h.hy + (Math.random() - 0.3) * 20;
        continue;
      }
      const s = Math.min(d, 16 * dt);
      h.x += dx / d * s; h.y += dy / d * s;
      h.spr.setPosition(h.x, h.y - Math.abs(Math.sin(this.stats.time * 12)) * 1.5).setDepth(h.y).setFlipX(dx < 0);
    }
    if (this.season < 2) {
      this.storkT -= dt;
      if (this.storkT <= 0) {
        this.storkT = 35 + Math.random() * 40;
        const y = 60 + Math.random() * (this.ph - 120);
        const s = this.add.image(-60, y, 'stork').setScale(0.6).setDepth(45000);
        const sh = this.add.image(-60, y + 60, 'shadow').setScale(0.8, 0.5).setDepth(3).setAlpha(0.6);
        const dur = (this.pw + 120) / 70 * 1000;
        this.tweens.add({ targets: [s, sh], x: this.pw + 60, duration: dur, onComplete: () => { s.destroy(); sh.destroy(); } });
        this.tweens.add({ targets: s, scaleY: 0.45, duration: 380, yoyo: true, repeat: -1 });
      }
    }
  }

  // ---------- main loop ----------

  update(time, delta) {
    const realDt = Math.min(delta, 50) / 1000;
    if (!this.modal) {
      const cam = this.cameras.main, k = this.keys, sp = 650 * realDt / cam.zoom;
      if (k.A.isDown || k.LEFT.isDown) cam.scrollX -= sp;
      if (k.D.isDown || k.RIGHT.isDown) cam.scrollX += sp;
      if (k.W.isDown || k.UP.isDown) cam.scrollY -= sp;
      if (k.S.isDown || k.DOWN.isDown) cam.scrollY += sp;
    }
    if (!this.paused && !this.over) {
      const steps = this.speed;
      for (let i = 0; i < steps; i++) this.step(realDt);
      this.updateCosmetics(realDt * this.speed);
    }
    this.render(realDt);
  }

  step(dt) {
    this.stats.time += dt;
    if (!this.spawning && this.countdown !== null) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startWave();
    }
    if (this.spawning) {
      for (let g = 0; g < 2; g++) {
        const q = this.queues[g];
        if (!q.length) continue;
        this.qTimers[g] -= dt;
        while (q.length && this.qTimers[g] <= 0) {
          const it = q.shift();
          if (it.type) this.spawn(it.type, g);
          this.qTimers[g] += it.wait;
        }
      }
    }
    for (const t of this.towers) this.updateTower(t, dt);
    for (const p of this.projectiles) this.updateProjectile(p, dt);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.stun > 0) e.stun -= dt;
      if (e.poisonT > 0) {
        this.damage(e, e.poisonDps * Math.min(dt, e.poisonT), 'magic', false, null);
        e.poisonT -= dt;
        if (e.dead) continue;
      }
      const f = e.stun > 0 ? 0 : 1 - e.slowAura;
      e.slowShown = e.slowAura; e.slowAura = 0;
      e.curSpeed = e.speed * f;
      e.dist += e.curSpeed * dt;
      e.anim += dt * (0.3 + f);
      if (e.dist >= e.route.total) { this.leak(e); continue; }
      routePos(e.route, e.dist, e);
      if (e.hitT > 0) e.hitT -= dt;
    }
    if (this.projectiles.some(p => p.done)) {
      this.projectiles = this.projectiles.filter(p => { if (p.done) p.spr.destroy(); return !p.done; });
    }
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    for (const tr of this.tracers) tr.t -= dt;
    if (this.spawning && !this.queues[0].length && !this.queues[1].length) this.spawnDone();
    if (this.calm() && !this.over && this.waveNum && this.savedAt !== this.waveNum) { this.savedAt = this.waveNum; this.save(); }
  }

  render() {
    const bars = this.barsG;
    bars.clear();
    for (const e of this.enemies) {
      const frame = Math.floor(e.anim / (e.fly ? 0.12 : 0.16)) % 2;
      if (frame !== e.frame) { e.frame = frame; e.spr.setTexture('e_' + e.type + frame); }
      const lift = e.fly ? 22 + Math.sin(e.anim * 3 + e.wob) * 3 : 0;
      e.spr.setPosition(e.x, e.y - lift);
      e.spr.setDepth(e.fly ? 15000 + e.y : e.y);
      if (e.dx < -0.01) e.spr.setFlipX(true); else if (e.dx > 0.01) e.spr.setFlipX(false);
      if (e.fly) e.shadow.setPosition(e.x, e.y + 4);
      if (e.hitT > 0) e.spr.setTint(0xffb0a0);
      else if (e.stun > 0) e.spr.setTint(0xfff080);
      else if (e.poisonT > 0) e.spr.setTint(0xc8f090);
      else if (e.slowShown > 0) e.spr.setTint(0xb8c8ff);
      else e.spr.clearTint();
      if (e.hp < e.maxHp && !e.def.boss) {
        const w = 24, x = e.x - w / 2, y = e.y - lift - e.def.r * 2 - 4;
        bars.fillStyle(0x2b1a0e, 0.85); bars.fillRect(x - 1, y - 1, w + 2, 5);
        const k = Math.max(0, e.hp / e.maxHp);
        bars.fillStyle(k > 0.5 ? 0x6ab842 : k > 0.25 ? 0xf2c21c : 0xd8262e, 1); bars.fillRect(x, y, w * k, 3);
      }
    }
    const fx = this.fxG;
    fx.clear();
    if (this.tracers.length) {
      this.tracers = this.tracers.filter(t => t.t > 0);
      for (const t of this.tracers) {
        fx.lineStyle(2, 0xfff2b0, Math.min(1, t.t * 12)); fx.lineBetween(t.x1, t.y1, t.x2, t.y2);
      }
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#2b1a0e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, UIScene],
});
