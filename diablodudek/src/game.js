'use strict';

// Run state, saving, and the Phaser scenes: Boot (generates art) and Game (one floor at a time).

const SAVE_KEY = 'dudekov-pakel-save';
const RECORD_KEY = 'dudekov-pakel-records';
const STASH_KEY = 'dudekov-pakel-stash';
const STASH_SIZE = 40;

const G = window.G = {
  run: null,
  grids: {},
  explored: {},
  paused: false,
  scene: null,
  showAllLabels: false,
  stash: null,

  ensureFloor(i) {
    const run = this.run;
    if (i === 0) {
      if (!this.grids[0]) this.grids[0] = D.Dungeon.town();
      if (!run.floors[0]) {
        const T = D.TILE, px = t => t * T + T / 2;
        run.floors[0] = { index: 0, theme: 'town', name: D.THEMES.town.name, monsters: [], chests: [], shrines: [], items: [],
          start: { x: px(15), y: px(13) }, mlvl: [1, 1] };
      }
      if (!this.explored[0]) this.explored[0] = new Uint8Array(30 * 24).fill(1);
      return { floor: run.floors[0], gen: this.grids[0] };
    }
    if (!run.floors[i]) {
      const { floor, gen } = D.Dungeon.createFloor(run, i);
      run.floors[i] = floor;
      this.grids[i] = gen;
    } else if (!this.grids[i]) {
      const f = run.floors[i];
      this.grids[i] = D.Dungeon.generate(f.theme, f.dim, f.seed, !!f.boss);
    }
    const gen = this.grids[i];
    if (!this.explored[i]) this.explored[i] = new Uint8Array(gen.w * gen.h);
    return { floor: run.floors[i], gen };
  },

  // The stash is shared by every hero and outlives runs, so it has its own storage key.
  loadStash() {
    let stash = null;
    try { stash = JSON.parse(localStorage.getItem(STASH_KEY)); } catch (e) { /* corrupt or blocked: start empty */ }
    if (!Array.isArray(stash)) stash = [];
    while (stash.length < STASH_SIZE) stash.push(null);
    // saves from before the shared stash kept it on the run
    const old = this.run && this.run.stash;
    if (old) {
      for (const it of old) {
        if (!it) continue;
        const j = stash.indexOf(null);
        if (j >= 0) stash[j] = it; else stash.push(it);
      }
      delete this.run.stash;
    }
    this.stash = stash;
    this.saveStash();
  },

  saveStash() {
    if (!this.stash) return;
    try { localStorage.setItem(STASH_KEY, JSON.stringify(this.stash)); } catch (e) { /* ignore */ }
  },

  save() {
    this.saveStash();
    if (!this.run || this.run.won) return;
    try {
      const explored = {};
      for (const [k, arr] of Object.entries(this.explored)) explored[k] = rle(arr);
      localStorage.setItem(SAVE_KEY, JSON.stringify({ run: this.run, explored }));
    } catch (e) { /* storage full or blocked: the run just won't be resumable */ }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data.run || data.run.v !== 1) return false;
      this.run = data.run;
      this.grids = {}; this.explored = {};
      for (const [k, s] of Object.entries(data.explored || {})) this.explored[k] = unrle(s);
      return true;
    } catch (e) { return false; }
  },

  savedSummary() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const r = JSON.parse(raw).run;
      if (!r || r.v !== 1) return null;
      return r;
    } catch (e) { return null; }
  },

  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } },

  records() { try { return JSON.parse(localStorage.getItem(RECORD_KEY)) || {}; } catch (e) { return {}; } },

  addRecord(run) {
    const recs = this.records(), key = `${run.size}-${run.difficulty}`;
    const prev = recs[key];
    if (!prev || run.elapsed < prev.time) recs[key] = { time: run.elapsed, cls: run.cls, level: run.player.level };
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(recs)); } catch (e) { /* ignore */ }
  },
};

function rle(arr) {
  let out = '', cur = arr[0], n = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === cur) n++;
    else { out += cur + ':' + n + ','; cur = arr[i]; n = 1; }
  }
  return out + cur + ':' + n + '|' + arr.length;
}
function unrle(s) {
  const [body, len] = s.split('|');
  const arr = new Uint8Array(+len);
  let i = 0;
  for (const part of body.split(',')) {
    const [v, n] = part.split(':').map(Number);
    arr.fill(v, i, i + n); i += n;
  }
  return arr;
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
}
D.fmtTime = fmtTime;

const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const ELEM_COLOR = { phys: 0xffffff, fire: 0xff8a30, cold: 0x8ad8ff, light: 0xb0c8ff, poison: 0x7aff5a };

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    D.Art.generateAll(this);
    window.Main.onBooted();
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) { this.arrival = (data && data.arrival) || 'start'; }

  create() {
    G.scene = this;
    const run = this.run = G.run;
    const { floor, gen } = G.ensureFloor(run.floorIndex);
    this.floor = floor; this.gen = gen;
    this.T = D.TILE; this.w = gen.w; this.h = gen.h; this.grid = gen.grid;
    this.isTown = floor.index === 0;
    this.now = 0;
    this.timers = []; this.projectiles = []; this.hazards = []; this.monsters = []; this.groundItems = []; this.interactables = [];
    this.flow = null; this.flowT = 0; this.flowTile = -1; this.saveT = 20; this.dead = false; this.hover = null;
    this.summonCount = 0; this.bossIntro = false; this.lastTile = -1; this.leaving = false; this.hoverGi = null; this.holdMode = null;

    this.buildMap();
    this.buildObjects();
    this.spawnMonsters();
    for (const it of floor.items) this.addGroundSprite(it);
    this.createPlayer();
    this.createDarkness();
    this.setupCamera();
    this.setupInput();

    if (!run.waypoints.includes(floor.index)) {
      run.waypoints.push(floor.index);
      if (!this.isTown) this.after(1.2, () => D.UI.log('Putokaz zapamćen', '#9ad0ff'));
    }
    run.deepest = Math.max(run.deepest, floor.index);
    this.recalc();
    D.UI.enterFloor(this);
    D.Sfx.setAmbient(floor.theme);
    this.cameras.main.fadeIn(350, 0, 0, 0);
    G.save();
  }

  // ---------- map ----------
  tileIndex(x, y) {
    const { grid, w, h } = this, v = grid[y * w + x];
    const inner = x > 0 && y > 0 && x < w - 1 && y < h - 1;
    if (v === D.Dungeon.FLOOR || (this.isTown && inner)) {
      const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      const r = hsh % 100;
      return r < 7 ? 3 : r < 35 ? 1 : r < 55 ? 2 : 0;
    }
    if (v === D.Dungeon.LAVA) return 7;
    if (y + 1 < h && grid[(y + 1) * w + x] !== D.Dungeon.WALL) return 5;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny * w + nx] !== D.Dungeon.WALL) return 4;
    }
    return 6;
  }

  buildMap() {
    const data = [];
    for (let y = 0; y < this.h; y++) {
      const row = [];
      for (let x = 0; x < this.w; x++) row.push(this.tileIndex(x, y));
      data.push(row);
    }
    const key = 'ts_' + this.floor.theme;
    const map = this.make.tilemap({ data, tileWidth: this.T, tileHeight: this.T });
    const ts = map.addTilesetImage(key, key, this.T, this.T, 0, 0);
    this.layer = map.createLayer(0, ts, 0, 0);
    this.layer.setDepth(-100);
    const T = this.T;
    for (const t of this.gen.torches) {
      const x = t.x * T + T / 2, y = t.y * T + T / 2 + 2;
      this.add.image(x, y, 'torch').setDepth((t.y + 1) * T - 2);
      const glow = this.add.image(x, y - 6, 'glow').setTint(0xff8a30).setBlendMode('ADD').setScale(1.6).setAlpha(0.55).setDepth((t.y + 1) * T - 1);
      this.tweens.add({ targets: glow, alpha: 0.3, scale: 1.3, duration: 180 + Math.random() * 200, yoyo: true, repeat: -1 });
    }
    if (this.isTown) {
      for (const t of this.gen.trees) this.add.image(t.x * T + T / 2, t.y * T + T * 0.85, 'tree').setOrigin(0.5, 0.95).setDepth(t.y * T + T * 0.85);
    }
  }

  walkable(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.grid[ty * this.w + tx] === D.Dungeon.FLOOR;
  }
  walkablePx(x, y) { return this.walkable(Math.floor(x / this.T), Math.floor(y / this.T)); }
  wallPx(x, y) {
    const tx = Math.floor(x / this.T), ty = Math.floor(y / this.T);
    return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.grid[ty * this.w + tx] === D.Dungeon.WALL;
  }
  boxFree(x, y, r) {
    const ry = r * 0.6;
    return this.walkablePx(x - r, y - ry) && this.walkablePx(x + r, y - ry) && this.walkablePx(x - r, y + ry) && this.walkablePx(x + r, y + ry);
  }
  moveEntity(e, dx, dy, r) {
    let moved = false;
    if (!this.boxFree(e.x, e.y, r)) {
      // already overlapping a wall (pushed or landed there): let it slide out
      if (this.walkablePx(e.x + dx, e.y + dy)) { e.x += dx; e.y += dy; return true; }
      return false;
    }
    if (dx && this.boxFree(e.x + dx, e.y, r)) { e.x += dx; moved = true; }
    if (dy && this.boxFree(e.x, e.y + dy, r)) { e.y += dy; moved = true; }
    return moved;
  }
  nearestWalkable(x, y) {
    const T = this.T, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (this.walkable(tx, ty)) return this.boxFree(x, y, 11) ? { x, y } : { x: tx * T + T / 2, y: ty * T + T / 2 };
    for (let r = 1; r < 8; r++) {
      let best = null, bd = Infinity;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !this.walkable(tx + dx, ty + dy)) continue;
        const cx = (tx + dx) * T + T / 2, cy = (ty + dy) * T + T / 2, d = dist2(cx, cy, x, y);
        if (d < bd) { bd = d; best = { x: cx, y: cy }; }
      }
      if (best) return best;
    }
    return { x, y };
  }
  // line of sight: walls block, lava doesn't
  los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(d / 16);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.wallPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }
  clearLine(x0, y0, x1, y1, r) {
    const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(d / 8));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.boxFree(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return false;
    }
    return true;
  }

  findPath(sx, sy, gx, gy) {
    const T = this.T, w = this.w, h = this.h;
    const goal = this.nearestWalkable(gx, gy);
    if (this.clearLine(sx, sy, goal.x, goal.y, 11)) return [goal];
    const s = Math.floor(sy / T) * w + Math.floor(sx / T), g = Math.floor(goal.y / T) * w + Math.floor(goal.x / T);
    const gxT = g % w, gyT = (g / w) | 0;
    const gScore = new Float32Array(w * h).fill(Infinity), came = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
    const heap = new MinHeap();
    gScore[s] = 0; heap.push(s, 0);
    let found = false, expansions = 0;
    while (heap.size && expansions++ < 8000) {
      const c = heap.pop();
      if (c === g) { found = true; break; }
      if (closed[c]) continue;
      closed[c] = 1;
      const cx = c % w, cy = (c / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!this.walkable(nx, ny)) continue;
        if (dx && dy && (!this.walkable(nx, cy) || !this.walkable(cx, ny))) continue;
        const j = ny * w + nx, ng = gScore[c] + (dx && dy ? 1.414 : 1);
        if (ng < gScore[j]) {
          gScore[j] = ng; came[j] = c;
          const hx = Math.abs(nx - gxT), hy = Math.abs(ny - gyT);
          heap.push(j, ng + Math.max(hx, hy) + 0.414 * Math.min(hx, hy));
        }
      }
    }
    if (!found) return null;
    const tiles = [];
    for (let c = g; c !== -1 && c !== s; c = came[c]) tiles.push(c);
    tiles.reverse();
    const pts = tiles.map(c => ({ x: (c % w) * T + T / 2, y: ((c / w) | 0) * T + T / 2 }));
    pts[pts.length - 1] = goal;
    // string pulling: keep only the waypoints we can't walk straight past
    const out = [];
    let cur = { x: sx, y: sy }, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clearLine(cur.x, cur.y, pts[j].x, pts[j].y, 11)) j--;
      out.push(pts[j]); cur = pts[j]; i = j + 1;
    }
    return out;
  }

  // ---------- world objects ----------
  addInteractable(kind, x, y, tex, label, opts = {}) {
    const spr = this.add.image(x, y, tex).setOrigin(0.5, opts.oy != null ? opts.oy : 0.5);
    spr.setDepth(opts.depth != null ? opts.depth : y);
    const o = { kind, x, y, r: opts.r || 34, sprite: spr, label, data: opts.data };
    this.interactables.push(o);
    return o;
  }

  buildObjects() {
    const f = this.floor, T = this.T, run = this.run;
    if (this.isTown) {
      const px = t => t * T + T / 2;
      this.add.image(px(8), px(7) - 10, 'tent').setDepth(px(7) - 30);
      this.add.image(px(22), px(7) - 10, 'tent').setDepth(px(7) - 30);
      const fire = this.add.image(px(15), px(10), 'campfire').setDepth(px(10));
      const fg = this.add.image(px(15), px(10) - 6, 'glow').setTint(0xff8a30).setBlendMode('ADD').setScale(3).setAlpha(0.5).setDepth(px(10) + 1);
      this.tweens.add({ targets: fg, alpha: 0.3, scale: 2.6, duration: 220, yoyo: true, repeat: -1 });
      void fire;
      this.addInteractable('merchant', px(8), px(9) + 18, 'npc_merchant', 'Teta Jaga (dućan)', { oy: 0.95, r: 30 });
      this.addInteractable('healer', px(22), px(9) + 18, 'npc_healer', 'Župnik Ivo (lijek)', { oy: 0.95, r: 30 });
      this.addInteractable('stash', px(11), px(15), 'stash', 'Dudekova škrinja', { r: 32 });
      this.addInteractable('waypoint', px(19), px(15), 'waypoint', 'Putokaz', { depth: -50, r: 40 });
      this.addInteractable('stairsDown', px(15), px(20), 'stairs_down', 'Silazak u podrum', { depth: -50, r: 42 });
      this.addInteractable('fountain', px(15), px(16) - 6, 'fountain', 'Zdenac', { r: 34 });
      if (run.portal) this.addInteractable('portal', px(17), px(13), 'portal', `Autobus za: ${run.floors[run.portal.floor].name}`, { oy: 0.9, r: 30 });
      return;
    }
    const above = f.index === 1 ? D.THEMES.town.name : run.floors[f.index - 1] ? run.floors[f.index - 1].name : 'razinu iznad';
    this.addInteractable('stairsUp', f.stairsUp.x, f.stairsUp.y, 'stairs_up', `Gore: ${above}`, { depth: -50, r: 42 });
    this.addInteractable('waypoint', f.waypoint.x, f.waypoint.y, 'waypoint', 'Putokaz', { depth: -50, r: 40 });
    if (f.stairsDown) {
      const s = this.addInteractable('stairsDown', f.stairsDown.x, f.stairsDown.y, 'stairs_down', 'Još dublje dolje', { depth: -50, r: 42 });
      if (f.boss && !f.bossDead) {
        s.seal = this.add.image(s.x, s.y, 'seal').setDepth(-49).setBlendMode('ADD');
        this.tweens.add({ targets: s.seal, angle: 360, duration: 8000, repeat: -1 });
      }
    }
    for (const c of f.chests) {
      const o = this.addInteractable('chest', c.x, c.y, c.opened ? 'chest_open' : 'chest', 'Sanduk', { r: 28, data: c });
      if (c.opened) o.done = true;
    }
    for (const s of f.shrines) {
      const o = this.addInteractable('shrine', s.x, s.y, s.used ? 'shrine_used' : 'shrine', D.SHRINES[s.kind].label, { oy: 0.85, r: 30, data: s });
      if (s.used) o.done = true;
      else {
        o.glow = this.add.image(s.x, s.y - 52, 'glow').setTint(D.SHRINES[s.kind].color).setBlendMode('ADD').setScale(1.4).setDepth(s.y + 1);
        this.tweens.add({ targets: o.glow, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
      }
    }
    if (run.portal && run.portal.floor === f.index) this.addInteractable('portal', run.portal.x, run.portal.y, 'portal', 'Autobus za Gruntovec', { oy: 0.9, r: 30 });
  }

  // ---------- monsters ----------
  spawnMonsters() {
    // summoned adds vanish when you leave the floor
    this.floor.monsters = this.floor.monsters.filter(d => !d.summoned);
    for (const d of this.floor.monsters) {
      if (d.dead) continue;
      // monsters recover while you're away; a wounded boss stays wounded so every attempt counts
      if (d.rank !== 'boss') d.hp = d.maxHp;
      this.addMonster(d);
    }
  }

  addMonster(d) {
    const boss = d.rank === 'boss';
    const def = boss ? D.BOSSES[d.type] : D.MONSTERS[d.type];
    const key = boss ? 'b_' + def.art : 'm_' + d.type;
    const scale = boss ? (d.type === 'lord' ? 1.1 : 1) : def.scale * (d.rank === 'champion' ? 1.15 : 1);
    const m = {
      d, def, boss, key, scale, r: def.radius * (d.rank === 'champion' ? 1.1 : 1),
      state: 'idle', cd: D.rnd.range(0, 1), windup: 0, frameT: D.rnd.range(0, 0.3), frame: 0,
      stunUntil: 0, slowUntil: 0, freezeUntil: 0, burnUntil: 0, burnDps: 0, losT: D.rnd.range(0, 0.3), hasLos: false,
      abilityT: 3, charge: null, flashT: 0, wander: null,
    };
    m.shadow = this.add.image(d.x, d.y, 'shadow').setScale(scale * (boss ? 2.2 : 1.1)).setDepth(-40);
    m.sprite = this.add.sprite(d.x, d.y, key + '_0').setOrigin(0.5, 0.95).setScale(scale);
    if (d.type === 'wraith') m.sprite.setAlpha(0.85);
    if (d.rank === 'champion' || boss) {
      m.aura = this.add.image(d.x, d.y, 'glow').setBlendMode('ADD').setDepth(-39)
        .setTint(boss ? 0xff2a10 : 0x5a6aff).setScale(boss ? 3.2 : 1.6, boss ? 1.4 : 0.7).setAlpha(0.55);
    }
    this.monsters.push(m);
    return m;
  }

  monsterCenter(m) { return { x: m.d.x, y: m.d.y - 24 * m.scale * (m.boss ? 1.6 : 1) }; }

  aggro(m) {
    if (m.state !== 'idle') return;
    m.state = 'chase';
    for (const o of this.monsters) {
      if (o.state === 'idle' && !o.d.dead && dist2(o.d.x, o.d.y, m.d.x, m.d.y) < 260 * 260) o.state = 'chase';
    }
  }

  updateMonsters(dt) {
    const P = this.player, now = this.now;
    if (this.flowT <= 0 || this.flowTile !== this.playerTile()) {
      const pt = this.playerTile();
      this.flow = D.Dungeon.bfs(this.grid, this.w, this.h, pt % this.w, (pt / this.w) | 0, 40);
      this.flowTile = pt; this.flowT = 0.3;
    }
    this.flowT -= dt;
    const active = [];
    for (const m of this.monsters) {
      const d = m.d;
      if (d.dead) continue;
      const dx = P.x - d.x, dy = P.y - d.y, dist = Math.hypot(dx, dy);
      const near = dist < 1000;
      m.sprite.setVisible(dist < 1500); m.shadow.setVisible(dist < 1500);
      if (m.aura) m.aura.setVisible(dist < 1500);
      if (!near) { if (m.state !== 'idle' && dist > 1400) m.state = 'idle'; continue; }
      active.push(m);
      m.cd -= dt; m.losT -= dt;
      if (m.losT <= 0) { m.hasLos = this.los(d.x, d.y - 4, P.x, P.y - 4); m.losT = 0.25; }
      if (m.burnUntil > now) {
        m.burnTick = (m.burnTick || 0) - dt;
        if (m.burnTick <= 0) { m.burnTick = 0.5; this.damageMonster(m, m.burnDps * 0.5, 'fire', { quiet: true }); if (d.dead) continue; }
      }
      if (this.dead) { this.animateMonster(m, false, dt); continue; }
      if (m.state === 'idle') {
        const aggroR = m.boss ? 460 : 340;
        if (dist < aggroR && m.hasLos) this.aggro(m);
        else { this.idleWander(m, dt); continue; }
      }
      if (m.boss && !this.bossIntro && dist < 560) this.introBoss(m);
      if (now < m.stunUntil || now < m.freezeUntil) { this.animateMonster(m, false, dt); continue; }
      const slow = now < m.slowUntil ? 0.5 : 1;
      let moved = false;
      if (m.charge) { moved = this.updateCharge(m, dt); this.animateMonster(m, moved, dt); continue; }
      if (m.windup > 0) {
        m.windup -= dt;
        if (m.windup <= 0) { if (m.skipStrike) m.skipStrike = false; else this.monsterStrike(m); }
        this.animateMonster(m, false, dt, true);
        continue;
      }
      if (m.boss) { m.abilityT -= dt * (d.hp < d.maxHp * 0.35 ? 1.5 : 1); if (m.abilityT <= 0 && this.bossAbility(m, dist)) { this.animateMonster(m, false, dt, true); continue; } }
      const ranged = m.def.ai === 'ranged';
      const reach = m.def.range + 14;
      if (ranged && dist < m.def.range && m.hasLos) {
        if (m.cd <= 0) { m.windup = 0.35; m.facing = dx < 0 ? -1 : 1; }
        else if (dist < 150) moved = this.stepMonster(m, -dx / dist, -dy / dist, dt, slow * 0.8);
      } else if (!ranged && dist <= reach) {
        if (m.cd <= 0) { m.windup = m.boss ? 0.45 : 0.35; m.facing = dx < 0 ? -1 : 1; }
      } else {
        const dir = this.chaseDir(m, dx, dy, dist);
        if (dir) moved = this.stepMonster(m, dir.x, dir.y, dt, slow);
      }
      this.animateMonster(m, moved, dt);
    }
    // keep monsters from stacking on each other and on the hero
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      if (a.d.dead) continue;
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        if (b.d.dead) continue;
        const min = (a.r + b.r) * 0.8, ddx = b.d.x - a.d.x, ddy = b.d.y - a.d.y, dd = ddx * ddx + ddy * ddy;
        if (dd < min * min && dd > 0.01) {
          const dd1 = Math.sqrt(dd), push = (min - dd1) / 2, nx = ddx / dd1, ny = ddy / dd1;
          const wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
          this.moveEntity(a.d, -nx * push * wa, -ny * push * wa, a.r * 0.6);
          this.moveEntity(b.d, nx * push * wb, ny * push * wb, b.r * 0.6);
        }
      }
      const min = a.r * 0.8 + 12, ddx = a.d.x - P.x, ddy = a.d.y - P.y, dd = ddx * ddx + ddy * ddy;
      if (dd < min * min && dd > 0.01 && !P.leap) {
        const dd1 = Math.sqrt(dd);
        this.moveEntity(a.d, ddx / dd1 * (min - dd1), ddy / dd1 * (min - dd1), a.r * 0.6);
      }
    }
  }

  idleWander(m, dt) {
    if (m.boss || m.d.rank === 'minion') { this.animateMonster(m, false, dt); return; }
    if (!m.wander || m.wander.t <= 0) {
      m.wander = D.rnd() < 0.5 ? { t: D.rnd.range(1, 3), x: 0, y: 0 } : { t: D.rnd.range(0.6, 1.4), x: D.rnd.range(-1, 1), y: D.rnd.range(-1, 1) };
    }
    m.wander.t -= dt;
    const moved = (m.wander.x || m.wander.y) ? this.stepMonster(m, m.wander.x, m.wander.y, dt, 0.35) : false;
    this.animateMonster(m, moved, dt);
  }

  chaseDir(m, dx, dy, dist) {
    if (m.hasLos && dist < 320 && this.clearLine(m.d.x, m.d.y, this.player.x, this.player.y, m.r * 0.6)) return { x: dx / dist, y: dy / dist };
    const T = this.T, w = this.w, tx = Math.floor(m.d.x / T), ty = Math.floor(m.d.y / T);
    const here = this.flow[ty * w + tx];
    let best = here < 0 ? 9999 : here, bx = -1, by = -1;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = tx + ox, ny = ty + oy;
      if (!this.walkable(nx, ny)) continue;
      if (ox && oy && (!this.walkable(nx, ty) || !this.walkable(tx, ny))) continue;
      const v = this.flow[ny * w + nx];
      if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx < 0) return dist > 0 ? { x: dx / dist, y: dy / dist } : null;
    const cx = bx * T + T / 2 - m.d.x, cy = by * T + T / 2 - m.d.y, l = Math.hypot(cx, cy) || 1;
    return { x: cx / l, y: cy / l };
  }

  stepMonster(m, nx, ny, dt, mul) {
    const sp = m.d.speed * mul * dt;
    if (nx) m.facing = nx < 0 ? -1 : 1;
    return this.moveEntity(m.d, nx * sp, ny * sp, m.r * 0.6);
  }

  animateMonster(m, moving, dt, attacking) {
    const s = m.sprite, d = m.d;
    m.frameT += dt;
    let f = 0;
    if (attacking || m.windup > 0) f = 3;
    else if (moving) f = Math.floor(m.frameT / 0.16) % 2 ? 1 : 2;
    if (f !== m.frame) { m.frame = f; s.setTexture(`${m.key}_${f}`); }
    s.setPosition(d.x, d.y).setDepth(d.y);
    if (m.facing) s.setFlipX(m.facing < 0);
    m.shadow.setPosition(d.x, d.y);
    if (m.aura) m.aura.setPosition(d.x, d.y);
    const now = this.now;
    if (m.flashT > 0) { m.flashT -= dt; s.setTintFill(0xffffff); }
    else if (now < m.freezeUntil) s.setTint(0x7ad0ff);
    else if (now < m.slowUntil) s.setTint(0xa8c8ff);
    else if (now < m.burnUntil) s.setTint(0xffb080);
    else if (m.charge && m.charge.tele > 0) s.setTint(0xff5050);
    else s.clearTint();
  }

  monsterStrike(m) {
    const P = this.player, d = m.d, def = m.def;
    m.cd = def.cd * D.rnd.range(0.85, 1.15);
    const elem = def.elem || 'phys';
    if (def.ai === 'ranged') {
      const c = this.monsterCenter(m), a = Math.atan2(P.y - 26 - c.y, P.x - c.x);
      const kind = def.proj;
      this.spawnProj({ x: c.x, y: c.y, angle: a, speed: kind === 'arrow' ? 360 : 270, owner: 'm', dmg: d.dmg, elem, kind, mlvl: d.mlvl, range: 520 });
      D.Sfx.play(kind === 'arrow' ? 'arrow' : 'fire');
      return;
    }
    const reach = def.range + 26;
    if (dist2(P.x, P.y, d.x, d.y) <= reach * reach && !P.leap) {
      let dmg = d.dmg;
      const mods = d.mods || [];
      this.hurtPlayer(dmg, elem, d.mlvl, m);
      if (mods.includes('fire')) this.hurtPlayer(dmg * 0.5, 'fire', d.mlvl, m);
      if (mods.includes('cold')) { this.hurtPlayer(dmg * 0.4, 'cold', d.mlvl, m); }
      if (mods.includes('vampire')) d.hp = Math.min(d.maxHp, d.hp + dmg * 2);
      D.Sfx.play('hit');
    } else D.Sfx.play('swing');
  }

  // ---------- bosses ----------
  introBoss(m) {
    this.bossIntro = true;
    D.UI.banner(m.def.name, m.def.title);
    D.Sfx.play('roar');
    this.cameras.main.shake(500, 0.006);
    this.aggro(m);
  }

  bossAbility(m, dist) {
    const liveAdds = this.monsters.filter(o => o.d.summoned && !o.d.dead).length;
    const abilities = m.def.abilities.filter(a => a !== 'summon' || liveAdds < 4);
    const ab = D.rnd.pick(abilities);
    const d = m.d, P = this.player;
    const enraged = d.hp < d.maxHp * 0.35;
    m.abilityT = D.rnd.range(4.5, 6.5);
    if (ab === 'charge') {
      if (dist < 140 || dist > 650 || !m.hasLos) { m.abilityT = 0.5; return false; }
      m.charge = { tele: 0.55, t: 0.75, dx: 0, dy: 0, hit: false };
      D.Sfx.play('roar');
      return true;
    }
    if (ab === 'slam') {
      if (dist > 260) { m.abilityT = 0.5; return false; }
      m.windup = 0.85; m.cd = 99; m.skipStrike = true;
      const ring = this.add.image(d.x, d.y, 'ring').setTint(0xff3020).setAlpha(0.6).setScale(0.3).setDepth(-30).setBlendMode('ADD');
      this.tweens.add({ targets: ring, scale: 2.6, duration: 850, onComplete: () => ring.destroy() });
      this.after(0.85, () => {
        if (d.dead) return;
        m.cd = 0.6;
        this.cameras.main.shake(300, 0.012);
        D.Sfx.play('slam');
        this.burst(d.x, d.y, 0xd08a40, 30, 170);
        if (dist2(P.x, P.y, d.x, d.y) < 175 * 175) { this.hurtPlayer(d.dmg * 1.7, 'phys', d.mlvl, m); P.slowUntil = this.now + 1.5; }
      });
      return true;
    }
    if (ab === 'summon') {
      const n = enraged ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = D.rnd.range(0, Math.PI * 2);
        const pos = this.nearestWalkable(d.x + Math.cos(a) * 90, d.y + Math.sin(a) * 90);
        const md = D.Dungeon.makeMonster(this.run, m.def.minions, 'minion', Math.max(1, d.mlvl - 2), pos.x, pos.y);
        md.id = d.id * 100 + (++this.summonCount);
        md.summoned = true;
        this.floor.monsters.push(md);
        const nm = this.addMonster(md);
        nm.state = 'chase';
        this.burst(pos.x, pos.y - 20, 0x9a40ff, 14, 60);
      }
      D.Sfx.play('portal');
      return true;
    }
    if (ab === 'spray' || ab === 'breath') {
      const n = ab === 'breath' ? 8 : 7, poison = ab === 'spray';
      m.cd = 99;
      for (let i = 0; i < n; i++) {
        this.after(i * (ab === 'breath' ? 0.09 : 0.05), () => {
          if (d.dead) return;
          const c = this.monsterCenter(m);
          const base = Math.atan2(P.y - 26 - c.y, P.x - c.x);
          const a = ab === 'breath' ? base + D.rnd.range(-0.22, 0.22) : base + (i - (n - 1) / 2) * 0.12;
          this.spawnProj({ x: c.x, y: c.y, angle: a, speed: 300, owner: 'm', dmg: d.dmg * 0.42, elem: poison ? 'poison' : 'fire',
            kind: poison ? 'poison' : 'firebolt', mlvl: d.mlvl, range: 640 });
          if (i % 3 === 0) D.Sfx.play(poison ? 'poison' : 'fire');
        });
      }
      this.after(n * 0.09 + 0.2, () => { m.cd = 0.3; });
      m.windup = 0.4; m.skipStrike = true;
      return true;
    }
    if (ab === 'poisonNova' || ab === 'fireRing') {
      const n = ab === 'fireRing' ? 16 : 14, poison = ab === 'poisonNova';
      const waves = enraged ? 2 : 1;
      for (let wv = 0; wv < waves; wv++) {
        this.after(0.4 + wv * 0.6, () => {
          if (d.dead) return;
          const c = this.monsterCenter(m);
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + wv * 0.15;
            this.spawnProj({ x: c.x + Math.cos(a) * 34, y: c.y + 10 + Math.sin(a) * 34, angle: a, speed: 230, owner: 'm', dmg: d.dmg * 0.45, elem: poison ? 'poison' : 'fire',
              kind: poison ? 'poison' : 'fireball', mlvl: d.mlvl, range: 560 });
          }
          D.Sfx.play(poison ? 'poison' : 'boom');
          if (poison) this.addHazard(d.x, d.y, 110, 5, d.dmg * 0.35, 'poison', 'm', 0x5aff3a);
        });
      }
      m.windup = 0.5; m.skipStrike = true;
      return true;
    }
    return false;
  }

  updateCharge(m, dt) {
    const c = m.charge, d = m.d, P = this.player;
    if (c.tele > 0) {
      c.tele -= dt;
      if (c.tele <= 0) {
        const dx = P.x - d.x, dy = P.y - d.y, l = Math.hypot(dx, dy) || 1;
        c.dx = dx / l; c.dy = dy / l; m.facing = dx < 0 ? -1 : 1;
      }
      return false;
    }
    c.t -= dt;
    const moved = this.moveEntity(d, c.dx * 560 * dt, c.dy * 560 * dt, m.r * 0.5);
    if (!c.hit && dist2(P.x, P.y, d.x, d.y) < (m.r + 22) ** 2) {
      c.hit = true;
      this.hurtPlayer(d.dmg * 1.4, 'phys', d.mlvl, m);
      this.knockPlayer(c.dx, c.dy, 70);
      this.cameras.main.shake(200, 0.01);
    }
    if (c.t <= 0 || !moved) { m.charge = null; m.cd = 0.4; }
    if (Math.random() < 0.5) this.puff(d.x, d.y - 10);
    return moved;
  }

  // ---------- hero ----------
  createPlayer() {
    const f = this.floor, run = this.run, T = this.T, rp = run.player;
    let pos;
    const a = this.arrival;
    if (a === 'load') pos = { x: rp.x, y: rp.y };
    else if (this.isTown) {
      if (a === 'up') pos = { x: 15 * T + T / 2, y: 19 * T };
      else if (a === 'waypoint') pos = { x: 19 * T + T / 2, y: 16 * T + T / 2 };
      else if (a === 'portal') pos = { x: 17 * T + T / 2, y: 14 * T + T / 2 };
      else pos = { ...f.start };
    } else if (a === 'up') pos = { x: f.stairsDown.x, y: f.stairsDown.y + T * 1.3 };
    else if (a === 'waypoint') pos = { x: f.waypoint.x, y: f.waypoint.y + T };
    else if (a === 'portal' && run.portal) { pos = { x: run.portal.x, y: run.portal.y + T * 0.8 }; }
    else pos = { x: f.start.x + T * 0.6, y: f.start.y + T * 0.6 };
    if (a === 'portal' && !this.isTown) {
      // the portal closes once you step back through it
      run.portal = null;
      const po = this.interactables.find(o => o.kind === 'portal');
      if (po) { po.sprite.destroy(); this.interactables.splice(this.interactables.indexOf(po), 1); }
    }
    pos = this.nearestWalkable(pos.x, pos.y);
    const key = rp.cls;
    const P = this.player = {
      x: pos.x, y: pos.y, key, frame: 0, frameT: 0, facing: 1, path: null, action: null,
      atkCd: 0, castLock: 0, cds: {}, slowUntil: 0, poisonUntil: 0, poisonDps: 0, healQ: 0, manaQ: 0, potCd: 0,
      leap: null, whirl: null, stuckT: 0, holdT: 0, flashT: 0,
    };
    P.shadow = this.add.image(P.x, P.y, 'shadow').setScale(1.2).setDepth(-40);
    P.sprite = this.add.sprite(P.x, P.y, key + '_0').setOrigin(0.5, 0.95);
    if (rp.hp == null) { this.recalc(); rp.hp = this.stats.maxHp; rp.mana = this.stats.maxMana; }
  }

  playerTile() { return Math.floor(this.player.y / this.T) * this.w + Math.floor(this.player.x / this.T); }

  recalc() {
    const rp = this.run.player;
    this.stats = D.Items.stats(rp, this.run.buffs);
    if (rp.hp != null) { rp.hp = Math.min(rp.hp, this.stats.maxHp); rp.mana = Math.min(rp.mana, this.stats.maxMana); }
  }

  skillRank(key) {
    const base = this.run.player.skills[key] || 0;
    return base ? base + this.stats.skills : 0;
  }

  weaponHit(mult) {
    const s = this.stats;
    let dmg = D.rnd.range(s.dmgMin, s.dmgMax + 1) * s.dmgMult * mult;
    const crit = D.rnd() * 100 < s.crit;
    if (crit) dmg *= 2;
    return { dmg, crit };
  }

  updatePlayer(dt) {
    const P = this.player, rp = this.run.player, st = this.stats, now = this.now;
    // regeneration and potions
    let heal = st.lifeRegen * dt;
    if (P.healQ > 0) { const h = Math.min(P.healQ, st.maxHp * 0.6 * dt + 1); P.healQ -= h; heal += h; }
    rp.hp = Math.min(st.maxHp, rp.hp + heal);
    let mana = st.manaRegen * dt;
    if (P.manaQ > 0) { const m = Math.min(P.manaQ, st.maxMana * 0.6 * dt + 1); P.manaQ -= m; mana += m; }
    rp.mana = Math.min(st.maxMana, rp.mana + mana);
    if (P.poisonUntil > now) { rp.hp -= P.poisonDps * dt; if (rp.hp <= 0) { this.die(); return; } }
    let buffChanged = false;
    for (const k of Object.keys(this.run.buffs)) {
      this.run.buffs[k] -= dt;
      if (this.run.buffs[k] <= 0) { delete this.run.buffs[k]; buffChanged = true; }
    }
    if (buffChanged) this.recalc();
    P.atkCd -= dt; P.castLock -= dt; P.potCd -= dt;
    for (const k in P.cds) P.cds[k] -= dt;

    if (P.leap) { this.updateLeap(dt); return; }
    if (P.whirl) { this.updateWhirl(dt); return; }

    const ptr = this.input.activePointer;
    if (ptr.leftButtonDown() && this.holdLeft && P.castLock <= 0) this.holdLeftUpdate(dt);
    if (ptr.rightButtonDown() && this.holdRight) this.castRight(true);

    let moved = false;
    if (P.castLock <= 0 && P.action) moved = this.runAction(dt);
    if (!P.action) P.path = null;
    this.animatePlayer(moved, dt);
  }

  runAction(dt) {
    const P = this.player, act = P.action;
    if (act.type === 'attack') {
      const m = act.target;
      if (m.d.dead) { P.action = null; P.path = null; return false; }
      const C = D.CLASSES[this.run.player.cls];
      const skill = act.skill ? D.SKILLS[act.skill] : null;
      const melee = skill ? skill.kind === 'melee' : C.attack === 'melee';
      const range = melee ? C.atkRange + m.r : C.atkRange;
      const c = this.monsterCenter(m);
      const d = Math.hypot(m.d.x - P.x, m.d.y - P.y);
      if (d <= range && (melee || this.los(P.x, P.y - 4, m.d.x, m.d.y - 4))) {
        P.path = null;
        if (P.atkCd <= 0) {
          if (act.skill) {
            if (!this.castSkill(act.skill, c, m)) P.action = null;
          } else this.basicAttack(c, m);
          if (!this.input.activePointer.leftButtonDown() && !this.input.activePointer.rightButtonDown()) P.action = null;
        }
        return false;
      }
      act.repath = (act.repath || 0) - dt;
      if (!P.path || act.repath <= 0) { P.path = this.findPath(P.x, P.y, m.d.x, m.d.y); act.repath = 0.3; }
      return this.followPath(dt);
    }
    if (act.type === 'pickup') {
      const gi = act.item;
      if (!this.groundItems.includes(gi)) { P.action = null; return false; }
      if (dist2(P.x, P.y, gi.x, gi.y) < 44 * 44) { this.pickup(gi); P.action = null; return false; }
      if (!P.path) P.path = this.findPath(P.x, P.y, gi.x, gi.y);
      return this.followPath(dt);
    }
    if (act.type === 'interact') {
      const o = act.obj;
      if (dist2(P.x, P.y, o.x, o.y) < (o.r + 26) ** 2) { P.action = null; P.path = null; this.interact(o); return false; }
      if (!P.path) P.path = this.findPath(P.x, P.y, o.x, o.y);
      return this.followPath(dt);
    }
    if (act.type === 'move') {
      const moved = this.followPath(dt);
      if (!P.path) P.action = null;
      return moved;
    }
    return false;
  }

  followPath(dt) {
    const P = this.player;
    if (!P.path || !P.path.length) { P.path = null; return false; }
    const t = P.path[0];
    const dx = t.x - P.x, dy = t.y - P.y, d = Math.hypot(dx, dy);
    const speed = 210 * (1 + this.stats.frw / 100) * (this.now < P.slowUntil ? 0.6 : 1);
    const step = speed * dt;
    if (d <= step) {
      if (this.boxFree(t.x, t.y, 11)) { P.x = t.x; P.y = t.y; }
      P.path.shift();
      if (!P.path.length) P.path = null;
      return true;
    }
    const ox = P.x, oy = P.y;
    this.moveEntity(P, dx / d * step, dy / d * step, 11);
    if (Math.abs(dx) > 2) P.facing = dx < 0 ? -1 : 1;
    const progressed = Math.hypot(P.x - ox, P.y - oy);
    if (progressed < step * 0.25) {
      P.stuckT += dt;
      if (P.stuckT > 0.35) { P.stuckT = 0; P.path = null; if (P.action && P.action.type === 'move') P.action = null; }
    } else P.stuckT = 0;
    return progressed > 0.1;
  }

  animatePlayer(moving, dt) {
    const P = this.player, s = P.sprite;
    P.frameT += dt;
    let f = 0;
    if (P.castLock > 0) f = 3;
    else if (moving) f = Math.floor(P.frameT / 0.14) % 2 ? 1 : 2;
    if (f !== P.frame) { P.frame = f; s.setTexture(`${P.key}_${f}`); }
    s.setPosition(P.x + (P.lunge || 0) * P.facing, P.y - (P.lift || 0)).setDepth(P.y).setFlipX(P.facing < 0);
    P.shadow.setPosition(P.x, P.y);
    if (P.flashT > 0) { P.flashT -= dt; s.setTint(0xff5050); }
    else if (this.now < P.poisonUntil) s.setTint(0x9aff8a);
    else if (this.now < P.slowUntil) s.setTint(0x9ac8ff);
    else s.clearTint();
  }

  faceTo(x) { if (Math.abs(x - this.player.x) > 2) this.player.facing = x < this.player.x ? -1 : 1; }

  // ---------- input ----------
  setupInput() {
    this.input.mouse.disableContextMenu();
    this.holdLeft = false; this.holdRight = false;
    this.input.on('pointerdown', (p) => {
      D.Sfx.init();
      if (G.paused || this.dead) return;
      if (p.rightButtonDown()) { this.holdRight = true; this.castRight(false); }
      else if (p.leftButtonDown()) { this.holdLeft = true; this.onLeftDown(p); }
    });
    this.input.on('pointerup', (p) => {
      if (!p.leftButtonDown()) this.holdLeft = false;
      if (!p.rightButtonDown()) this.holdRight = false;
    });
    this.input.on('gameout', () => { this.holdLeft = false; this.holdRight = false; });
  }

  worldPointer() {
    const p = this.input.activePointer;
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  updateHover() {
    const wp = this.worldPointer();
    let best = null, bd = Infinity;
    for (const m of this.monsters) {
      if (m.d.dead || !m.sprite.visible) continue;
      const c = this.monsterCenter(m), rr = m.r + (m.boss ? 26 : 12);
      const d = dist2(wp.x, wp.y, c.x, c.y);
      if (d < rr * rr && d < bd) { bd = d; best = { type: 'monster', m }; }
    }
    if (!best) {
      for (const gi of this.groundItems) {
        const b = gi.label.getBounds();
        if (gi.label.visible && wp.x >= b.x - 2 && wp.x <= b.right + 2 && wp.y >= b.y - 2 && wp.y <= b.bottom + 2) { best = { type: 'item', gi }; break; }
        if (dist2(wp.x, wp.y, gi.x, gi.y) < 18 * 18) { best = { type: 'item', gi }; break; }
      }
    }
    if (!best) {
      for (const o of this.interactables) {
        if (o.done) continue;
        const oy = o.kind === 'merchant' || o.kind === 'healer' || o.kind === 'portal' || o.kind === 'shrine' ? o.y - 30 : o.y;
        if (dist2(wp.x, wp.y, o.x, oy) < o.r * o.r) { best = { type: 'obj', o }; break; }
      }
    }
    const prev = this.hover;
    this.hover = best;
    if (prev && prev.type === 'obj' && (!best || best.o !== prev.o)) this.hideObjLabel(prev.o);
    if (best && best.type === 'obj') this.showObjLabel(best.o);
    const hoverGi = best && best.type === 'item' ? best.gi : null;
    if (hoverGi !== this.hoverGi) {
      const prevGi = this.hoverGi;
      if (prevGi && prevGi.label.active) prevGi.label.setBackgroundColor('rgba(0,0,0,0.7)').setVisible(!prevGi.minor || G.showAllLabels);
      if (hoverGi) {
        hoverGi.label.setBackgroundColor('rgba(40,40,110,0.95)');
        if (!hoverGi.label.visible) this.layoutLabel(hoverGi, this.groundItems);
        hoverGi.label.setVisible(true);
      }
      this.hoverGi = hoverGi;
    }
    let shown = best && best.type === 'monster' ? best.m : null;
    if (!shown) {
      const P = this.player;
      shown = this.monsters.find(m => m.boss && !m.d.dead && m.state !== 'idle' && dist2(m.d.x, m.d.y, P.x, P.y) < 900 * 900) || null;
    }
    D.UI.setTarget(shown);
    this.game.canvas.style.cursor = best ? (best.type === 'monster' ? 'crosshair' : 'pointer') : 'default';
  }

  showObjLabel(o) {
    if (!o.labelText) {
      o.labelText = this.add.text(o.x, o.y - (o.sprite.displayHeight * (o.sprite.originY)) - 12, o.label, {
        fontFamily: 'Crimson Text, Georgia, serif', fontSize: '16px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.75)', padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(96000);
    }
    o.labelText.setVisible(true);
    o.sprite.setTint(0xffffcc);
  }
  hideObjLabel(o) { if (o.labelText) o.labelText.setVisible(false); if (o.sprite.active) o.sprite.clearTint(); }

  onLeftDown(p) {
    const P = this.player;
    if (P.leap || P.whirl) return;
    const shift = p.event && p.event.shiftKey;
    const wp = this.worldPointer();
    const h = this.hover;
    if (shift) { this.faceTo(wp.x); P.action = null; P.path = null; if (P.atkCd <= 0) this.basicAttack(wp, h && h.type === 'monster' ? h.m : null); this.holdMode = 'stand'; return; }
    if (h && h.type === 'monster') { P.action = { type: 'attack', target: h.m }; P.path = null; this.holdMode = 'attack'; return; }
    if (h && h.type === 'item') { P.action = { type: 'pickup', item: h.gi }; P.path = null; this.holdMode = null; return; }
    if (h && h.type === 'obj') { P.action = { type: 'interact', obj: h.o }; P.path = null; this.holdMode = null; return; }
    this.moveTo(wp.x, wp.y);
    this.holdMode = 'move';
    this.moveMarker(wp.x, wp.y);
  }

  holdLeftUpdate(dt) {
    const P = this.player;
    P.holdT -= dt;
    if (P.holdT > 0) return;
    P.holdT = 0.12;
    const wp = this.worldPointer();
    if (this.holdMode === 'move') {
      const h = this.hover;
      if (h && h.type === 'monster') { P.action = { type: 'attack', target: h.m }; P.path = null; this.holdMode = 'attack'; return; }
      if (dist2(wp.x, wp.y, P.x, P.y) > 20 * 20) this.moveTo(wp.x, wp.y);
    } else if (this.holdMode === 'stand') {
      this.faceTo(wp.x);
      if (P.atkCd <= 0) this.basicAttack(wp, this.hover && this.hover.type === 'monster' ? this.hover.m : null);
    } else if (this.holdMode === 'attack' && !P.action) {
      const h = this.hover;
      if (h && h.type === 'monster') P.action = { type: 'attack', target: h.m };
    }
  }

  moveTo(x, y) {
    const P = this.player;
    const path = this.findPath(P.x, P.y, x, y);
    if (path) { P.path = path; P.action = { type: 'move' }; }
  }

  moveMarker(x, y) {
    const r = this.add.image(x, y, 'ring').setScale(0.25).setTint(0xffd070).setAlpha(0.8).setDepth(-30);
    this.tweens.add({ targets: r, scale: 0.08, alpha: 0, duration: 350, onComplete: () => r.destroy() });
  }

  castRight(repeat) {
    const P = this.player;
    if (P.leap || P.whirl || P.castLock > 0) return;
    const key = this.run.player.rightSkill;
    if (!key) return;
    if (repeat && (P.cds[key] > 0 || P.atkCd > 0)) return;
    const h = this.hover;
    const target = h && h.type === 'monster' ? h.m : null;
    const pt = target ? this.monsterCenter(target) : this.worldPointer();
    this.castSkill(key, pt, target, false, !repeat);
  }

  castSkillKey(i) {
    if (G.paused || this.dead) return;
    const key = D.CLASSES[this.run.player.cls].skills[i];
    if (!this.run.player.skills[key]) { D.UI.log(`${D.SKILLS[key].name}: još nije naučeno`, '#a88'); return; }
    this.run.player.rightSkill = key;
    D.UI.refreshSkills();
    const P = this.player;
    if (P.leap || P.whirl || P.castLock > 0) return;
    const h = this.hover;
    const target = h && h.type === 'monster' ? h.m : null;
    const pt = target ? this.monsterCenter(target) : this.worldPointer();
    this.castSkill(key, pt, target, false, true);
  }

  // ---------- attacks and skills ----------
  basicAttack(pt, target) {
    const P = this.player, C = D.CLASSES[this.run.player.cls];
    P.atkCd = C.atkCd / (1 + this.stats.ias / 100);
    P.castLock = 0.2;
    this.faceTo(pt.x);
    const ox = P.x, oy = P.y - 28;
    const a = Math.atan2(pt.y - oy, pt.x - ox);
    if (C.attack === 'melee') {
      this.lunge();
      D.Sfx.play('swing');
      this.after(0.08, () => {
        const victim = target && !target.d.dead && dist2(target.d.x, target.d.y, P.x, P.y) < (C.atkRange + target.r + 16) ** 2
          ? target : this.nearestInArc(P.x, P.y, a, C.atkRange + 20, 1.1);
        if (victim) { const h = this.weaponHit(1); this.damageMonster(victim, h.dmg, 'phys', { crit: h.crit, knock: 6 }); }
      });
    } else if (C.attack === 'bow') {
      const h = this.weaponHit(1);
      this.spawnProj({ x: ox, y: oy, angle: a, speed: 620, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'phys', kind: 'arrow', range: 560 });
      D.Sfx.play('arrow');
    } else {
      const h = this.weaponHit(0.9);
      this.spawnProj({ x: ox, y: oy, angle: a, speed: 520, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'light', kind: 'spark', range: 520 });
      D.Sfx.play('spark');
    }
  }

  lunge() {
    const P = this.player;
    P.lunge = 7;
    this.tweens.addCounter({ from: 7, to: 0, duration: 180, onUpdate: tw => { P.lunge = tw.getValue(); } });
  }

  nearestInArc(x, y, ang, range, half) {
    let best = null, bd = Infinity;
    for (const m of this.monsters) {
      if (m.d.dead) continue;
      const dx = m.d.x - x, dy = m.d.y - y, d = Math.hypot(dx, dy);
      if (d > range + m.r) continue;
      let da = Math.abs(Math.atan2(dy, dx) - ang);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > half && d > m.r + 10) continue;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  monstersInRadius(x, y, r) {
    return this.monsters.filter(m => !m.d.dead && dist2(m.d.x, m.d.y, x, y) < (r + m.r) ** 2);
  }

  castSkill(key, pt, target, fromAction, announce) {
    const P = this.player, rp = this.run.player, sk = D.SKILLS[key];
    const rank = this.skillRank(key);
    if (!rank) return false;
    if (P.cds[key] > 0) return false;
    const cost = Math.round(sk.mana + sk.manaPer * (rank - 1));
    if (rp.mana < cost) { if (announce) { D.UI.log('Nema dosta mane', '#88f'); D.Sfx.play('nomana'); } return false; }
    const mult = sk.mult + sk.multPer * (rank - 1);
    const C = D.CLASSES[rp.cls];
    const ox = P.x, oy = P.y - 28;
    const ang = Math.atan2(pt.y - oy, pt.x - ox);
    const spend = () => { rp.mana -= cost; P.cds[key] = sk.cd; P.atkCd = C.atkCd / (1 + this.stats.ias / 100); };
    this.faceTo(pt.x);

    switch (sk.kind) {
      case 'melee': {
        let victim = target;
        if (victim && dist2(victim.d.x, victim.d.y, P.x, P.y) > (C.atkRange + victim.r + 10) ** 2) {
          if (!fromAction) { P.action = { type: 'attack', target: victim, skill: key }; P.path = null; }
          return fromAction;
        }
        if (!victim) victim = this.nearestInArc(P.x, P.y, ang, C.atkRange + 24, 1.2);
        if (!victim) return false;
        spend(); P.castLock = 0.25; this.lunge(); D.Sfx.play('swing');
        this.after(0.09, () => {
          if (victim.d.dead) return;
          const h = this.weaponHit(mult);
          const kx = victim.d.x - P.x, ky = victim.d.y - P.y, kl = Math.hypot(kx, ky) || 1;
          this.damageMonster(victim, h.dmg, 'phys', { crit: h.crit });
          if (!victim.boss) this.moveEntity(victim.d, kx / kl * 40, ky / kl * 40, victim.r * 0.6);
          this.burst(victim.d.x, victim.d.y - 24, 0xffd070, 10, 60);
        });
        return true;
      }
      case 'leap': {
        let dx = pt.x - P.x, dy = pt.y + 28 - P.y;
        const d = Math.hypot(dx, dy) || 1;
        const len = Math.min(d, sk.range);
        let tx = P.x + dx / d * len, ty = P.y + dy / d * len;
        if (!this.boxFree(tx, ty, 11)) { const n = this.nearestWalkable(tx, ty); tx = n.x; ty = n.y; }
        if (!this.los(P.x, P.y - 10, tx, ty - 10) && Math.hypot(tx - P.x, ty - P.y) > 200) return false;
        spend();
        P.action = null; P.path = null;
        P.leap = { sx: P.x, sy: P.y, tx, ty, t: 0, dur: 0.45, mult, radius: sk.radius };
        D.Sfx.play('leap');
        return true;
      }
      case 'whirl': {
        spend();
        const d = Math.min(Math.hypot(pt.x - P.x, pt.y + 28 - P.y), sk.range);
        P.action = null; P.path = null;
        P.whirl = { ang: Math.atan2(pt.y + 28 - P.y, pt.x - P.x), left: Math.max(60, d), tick: 0, mult, radius: sk.radius, t: 0 };
        D.Sfx.play('swing');
        return true;
      }
      case 'cry': {
        spend(); P.castLock = 0.4;
        D.Sfx.play('shout');
        this.ringFx(P.x, P.y - 20, 0xffc040, sk.radius);
        this.cameras.main.shake(200, 0.006);
        for (const m of this.monstersInRadius(P.x, P.y, sk.radius)) {
          const h = this.weaponHit(mult);
          this.damageMonster(m, h.dmg, 'phys', { crit: h.crit, aoe: true });
          if (!m.d.dead) m.stunUntil = this.now + (m.boss ? 0.6 : sk.stun);
        }
        return true;
      }
      case 'multi': {
        spend(); P.castLock = 0.25;
        const n = 5 + Math.floor((rank - 1) / 2), spread = 0.13;
        for (let i = 0; i < n; i++) {
          const h = this.weaponHit(mult);
          this.spawnProj({ x: ox, y: oy, angle: ang + (i - (n - 1) / 2) * spread, speed: 620, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'phys', kind: 'arrow', range: 520 });
        }
        D.Sfx.play('arrow');
        return true;
      }
      case 'explarrow': {
        spend(); P.castLock = 0.22;
        const h = this.weaponHit(mult);
        this.spawnProj({ x: ox, y: oy, angle: ang, speed: 600, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'fire', kind: 'firearrow', range: 560,
          explode: { radius: sk.radius, dmg: h.dmg * 0.8, elem: 'fire', color: 0xff7a20 } });
        D.Sfx.play('arrow');
        return true;
      }
      case 'freezearrow': {
        spend(); P.castLock = 0.22;
        const h = this.weaponHit(mult);
        this.spawnProj({ x: ox, y: oy, angle: ang, speed: 640, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'cold', kind: 'icearrow', range: 620,
          pierce: true, freeze: sk.freeze });
        D.Sfx.play('frost');
        return true;
      }
      case 'strafe': {
        const targets = this.monsters.filter(m => !m.d.dead && dist2(m.d.x, m.d.y, P.x, P.y) < 460 * 460 && this.los(P.x, P.y - 4, m.d.x, m.d.y - 4));
        if (!targets.length) { if (announce) D.UI.log('Nikoga u dometu', '#a88'); return false; }
        spend();
        targets.sort((a, b) => dist2(a.d.x, a.d.y, P.x, P.y) - dist2(b.d.x, b.d.y, P.x, P.y));
        const n = 8 + rank;
        P.castLock = n * 0.06 + 0.1;
        for (let i = 0; i < n; i++) {
          this.after(i * 0.06, () => {
            const alive = targets.filter(m => !m.d.dead);
            if (!alive.length) return;
            const m = alive[i % alive.length], c = this.monsterCenter(m);
            const a = Math.atan2(c.y - (P.y - 28), c.x - P.x);
            this.faceTo(c.x);
            const h = this.weaponHit(mult);
            this.spawnProj({ x: P.x, y: P.y - 28, angle: a, speed: 700, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'phys', kind: 'arrow', range: 560 });
            D.Sfx.play('arrow');
          });
        }
        return true;
      }
      case 'bolt': {
        spend(); P.castLock = 0.22;
        const h = this.weaponHit(mult);
        this.spawnProj({ x: ox, y: oy, angle: ang, speed: 520, owner: 'p', dmg: h.dmg, crit: h.crit, elem: 'fire', kind: 'firebolt', range: 600,
          burn: h.dmg * 0.12 });
        D.Sfx.play('fire');
        return true;
      }
      case 'nova': {
        spend(); P.castLock = 0.3;
        D.Sfx.play('frost');
        this.ringFx(P.x, P.y - 16, 0x8ad8ff, sk.radius);
        for (let i = 0; i < 18; i++) {
          const a = i / 18 * Math.PI * 2;
          const s = this.add.image(P.x, P.y - 16, 'shard').setRotation(a).setTint(0xcff0ff).setBlendMode('ADD').setDepth(P.y + 5);
          this.tweens.add({ targets: s, x: P.x + Math.cos(a) * sk.radius, y: P.y - 16 + Math.sin(a) * sk.radius, alpha: 0, duration: 380, onComplete: () => s.destroy() });
        }
        for (const m of this.monstersInRadius(P.x, P.y, sk.radius)) {
          const h = this.weaponHit(mult);
          this.damageMonster(m, h.dmg, 'cold', { crit: h.crit, aoe: true });
          if (!m.d.dead) m.slowUntil = this.now + 3.5;
        }
        return true;
      }
      case 'chain': {
        let first = target;
        if (!first) {
          let bd = Infinity;
          for (const m of this.monsters) {
            if (m.d.dead) continue;
            const c = this.monsterCenter(m), d = dist2(c.x, c.y, pt.x, pt.y);
            if (d < 120 * 120 && d < bd && this.los(P.x, P.y - 4, m.d.x, m.d.y - 4)) { bd = d; first = m; }
          }
        }
        spend(); P.castLock = 0.28;
        D.Sfx.play('zap');
        if (!first) { this.lightning(ox, oy, pt.x, pt.y); return true; }
        const jumps = 4 + Math.floor((rank - 1) / 3);
        const hit = new Set();
        let from = { x: ox, y: oy }, cur = first;
        for (let j = 0; j <= jumps && cur; j++) {
          const c = this.monsterCenter(cur);
          this.lightning(from.x, from.y, c.x, c.y);
          const h = this.weaponHit(mult);
          hit.add(cur);
          this.damageMonster(cur, h.dmg, 'light', { crit: h.crit, aoe: j > 0 });
          from = c;
          let next = null, bd = 260 * 260;
          for (const m of this.monsters) {
            if (m.d.dead || hit.has(m)) continue;
            const mc = this.monsterCenter(m), d = dist2(mc.x, mc.y, c.x, c.y);
            if (d < bd) { bd = d; next = m; }
          }
          cur = next;
        }
        return true;
      }
      case 'meteor': {
        let tx = pt.x, ty = pt.y + 20;
        const d = Math.hypot(tx - P.x, ty - P.y);
        if (d > 520) { tx = P.x + (tx - P.x) / d * 520; ty = P.y + (ty - P.y) / d * 520; }
        spend(); P.castLock = 0.35;
        const mark = this.add.image(tx, ty, 'ring').setTint(0xff4010).setScale(sk.radius / 54).setAlpha(0.2).setDepth(-30).setBlendMode('ADD');
        this.tweens.add({ targets: mark, alpha: 0.8, duration: 850 });
        const rock = this.add.image(tx + 160, ty - 520, 'rock').setDepth(ty + 1000).setScale(1.5);
        const trail = this.add.image(tx + 160, ty - 520, 'glow').setTint(0xff7a20).setBlendMode('ADD').setScale(2.2).setDepth(ty + 999);
        this.tweens.add({ targets: [rock, trail], x: tx, y: ty - 10, duration: 900, ease: 'Quad.easeIn' });
        D.Sfx.play('fire');
        const h = this.weaponHit(mult);
        this.after(0.9, () => {
          rock.destroy(); trail.destroy(); mark.destroy();
          D.Sfx.play('boom');
          this.cameras.main.shake(250, 0.01);
          this.burst(tx, ty - 10, 0xff7020, 40, sk.radius * 1.4);
          this.flash(tx, ty - 10, 0xffa040, sk.radius / 16);
          for (const m of this.monstersInRadius(tx, ty, sk.radius)) this.damageMonster(m, h.dmg, 'fire', { crit: h.crit, aoe: true });
          this.addHazard(tx, ty, sk.radius * 0.8, 3.5, h.dmg * 0.18, 'fire', 'p', 0xff5a10);
        });
        return true;
      }
    }
    return false;
  }

  updateLeap(dt) {
    const P = this.player, L = P.leap;
    L.t += dt;
    const k = Math.min(1, L.t / L.dur);
    P.x = L.sx + (L.tx - L.sx) * k; P.y = L.sy + (L.ty - L.sy) * k;
    P.lift = Math.sin(k * Math.PI) * 70;
    this.faceTo(L.tx);
    if (k >= 1) {
      P.leap = null; P.lift = 0; P.castLock = 0.15;
      this.cameras.main.shake(180, 0.008);
      D.Sfx.play('slam');
      this.burst(P.x, P.y - 4, 0xc8a070, 24, L.radius * 1.3);
      this.ringFx(P.x, P.y - 4, 0xd8b080, L.radius);
      for (const m of this.monstersInRadius(P.x, P.y, L.radius)) {
        const h = this.weaponHit(L.mult);
        this.damageMonster(m, h.dmg, 'phys', { crit: h.crit, aoe: true });
        if (!m.d.dead) m.stunUntil = this.now + (m.boss ? 0.3 : 0.8);
      }
    }
    this.animatePlayer(false, dt);
    this.player.sprite.setTexture(`${P.key}_3`); P.frame = 3;
  }

  updateWhirl(dt) {
    const P = this.player, W = P.whirl;
    W.t += dt; W.tick -= dt;
    const step = 330 * dt;
    const moved = this.moveEntity(P, Math.cos(W.ang) * step, Math.sin(W.ang) * step, 11);
    W.left -= step;
    if (W.tick <= 0) {
      W.tick = 0.15;
      D.Sfx.play('swing');
      for (const m of this.monstersInRadius(P.x, P.y, W.radius)) {
        const h = this.weaponHit(W.mult);
        this.damageMonster(m, h.dmg, 'phys', { crit: h.crit, quietSound: true, aoe: true });
      }
    }
    P.sprite.setPosition(P.x, P.y).setDepth(P.y);
    P.facing = Math.floor(W.t / 0.08) % 2 ? 1 : -1;
    P.sprite.setFlipX(P.facing < 0).setTexture(`${P.key}_3`); P.frame = 3;
    P.shadow.setPosition(P.x, P.y);
    if (Math.random() < 0.6) this.puff(P.x + D.rnd.range(-30, 30), P.y - D.rnd.range(0, 40), 0xd8e0ff);
    if (W.left <= 0 || !moved || W.t > 1.4) { P.whirl = null; P.castLock = 0.1; }
  }

  // ---------- damage ----------
  damageMonster(m, amount, elem, opts = {}) {
    const d = m.d;
    if (d.dead) return;
    if (d.dr) amount *= 1 - d.dr;
    amount = Math.max(1, Math.round(amount));
    d.hp -= amount;
    m.flashT = 0.07;
    if (m.state === 'idle') this.aggro(m);
    const c = this.monsterCenter(m);
    // damage-over-time ticks get smaller numbers so they don't drown out real hits
    this.floatText(c.x + D.rnd.range(-10, 10), c.y - 14, String(amount), opts.crit ? '#ffd040' : elem === 'phys' ? '#ffffff' : '#' + ELEM_COLOR[elem].toString(16).padStart(6, '0'), opts.crit ? 22 : opts.quiet ? 12 : 16);
    if (!opts.quiet && !opts.quietSound) D.Sfx.play(opts.crit ? 'crit' : 'hit');
    if (elem === 'fire' && opts.burn) { m.burnUntil = this.now + 3; m.burnDps = Math.max(m.burnDps, opts.burn); }
    if (elem === 'cold' && !m.boss) m.slowUntil = Math.max(m.slowUntil, this.now + 1.5);
    if (this.stats.lifeSteal && !opts.quiet) {
      const rp = this.run.player;
      rp.hp = Math.min(this.stats.maxHp, rp.hp + amount * this.stats.lifeSteal / 100 * (opts.aoe ? 0.5 : 1));
    }
    if (opts.knock && !m.boss) {
      const kx = d.x - this.player.x, ky = d.y - this.player.y, kl = Math.hypot(kx, ky) || 1;
      this.moveEntity(d, kx / kl * opts.knock, ky / kl * opts.knock, m.r * 0.6);
    }
    if (d.hp <= 0) this.killMonster(m);
  }

  killMonster(m) {
    const d = m.d, run = this.run;
    d.dead = true; d.hp = 0;
    run.kills++;
    D.Sfx.play('mdie');
    const xpMult = { normal: 1, minion: 1.5, champion: 4, boss: 1 }[d.rank];
    let xp = D.monsterXp(d.mlvl) * m.def.xp * xpMult * D.DIFFICULTY[run.difficulty].xp;
    const gap = run.player.level - d.mlvl - 5;
    if (gap > 0) xp *= Math.max(0.15, 1 - gap * 0.12);
    if (run.buffs.exp > 0) xp *= 1.5;
    if (d.summoned) xp *= 0.3;
    this.addXp(Math.round(xp));
    // corpse
    const blood = this.add.image(d.x, d.y, 'blood').setDepth(-60).setScale(m.boss ? 2.5 : 1).setAngle(D.rnd.range(-20, 20));
    void blood;
    const s = m.sprite;
    s.clearTint().setTint(0x6a5a5a);
    s.setTexture(`${m.key}_0`);
    this.tweens.add({ targets: s, angle: m.facing < 0 ? -90 : 90, y: d.y - 6, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
    this.tweens.add({ targets: [m.shadow, m.aura].filter(Boolean), alpha: 0, duration: 600, onComplete: () => { m.shadow.destroy(); if (m.aura) m.aura.destroy(); } });
    this.burst(d.x, d.y - 20, 0x8a0a0a, m.boss ? 40 : 10, m.boss ? 160 : 60);
    if ((d.mods || []).includes('fire')) {
      this.burst(d.x, d.y - 10, 0xff7020, 30, 120);
      if (dist2(this.player.x, this.player.y, d.x, d.y) < 110 * 110) this.hurtPlayer(d.dmg * 1.2, 'fire', d.mlvl, m);
      D.Sfx.play('boom');
    }
    // loot
    if (!d.summoned || D.rnd() < 0.3) {
      const drops = D.Items.drops(d.rank, d.mlvl, this.stats.mf, run.player.cls, D.DIFFICULTY[run.difficulty].ilvl);
      this.spawnDrops(drops, d.x, d.y);
    }
    this.monsters.splice(this.monsters.indexOf(m), 1);
    if (d.summoned) this.floor.monsters.splice(this.floor.monsters.indexOf(d), 1);
    if (d.rank === 'boss') this.bossKilled(m);
  }

  bossKilled(m) {
    const f = this.floor;
    f.bossDead = true;
    this.cameras.main.shake(800, 0.012);
    D.Sfx.play('roar');
    for (const o of this.monsters.slice()) if (o.d.summoned) { o.d.dead = true; this.burst(o.d.x, o.d.y - 20, 0x9a40ff, 10, 50); o.sprite.destroy(); o.shadow.destroy(); if (o.aura) o.aura.destroy();
      this.monsters.splice(this.monsters.indexOf(o), 1); this.floor.monsters.splice(this.floor.monsters.indexOf(o.d), 1); }
    if (f.final) {
      D.UI.banner(`${m.def.name} je pao!`, 'Mrak se povlači, Podravina opet diše.');
      this.after(3.2, () => this.victory());
    } else {
      D.UI.banner(`${m.def.name} je pao!`, 'Put dolje je otvoren.');
      const s = this.interactables.find(o => o.kind === 'stairsDown');
      if (s && s.seal) { const seal = s.seal; s.seal = null; this.tweens.add({ targets: seal, alpha: 0, scale: 2, duration: 800, onComplete: () => seal.destroy() }); }
    }
    G.save();
  }

  hurtPlayer(amount, elem, mlvl, source) {
    const P = this.player, rp = this.run.player, st = this.stats;
    if (this.dead || P.leap) return;
    if (elem === 'phys') {
      const red = Math.min(0.75, st.armor / (st.armor + 40 + 12 * (mlvl || 1)));
      amount *= 1 - red;
    } else amount *= 1 - st.res / 100;
    amount = Math.max(1, Math.round(amount));
    if (elem === 'poison') {
      const prev = this.now < P.poisonUntil ? P.poisonDps : 0;
      P.poisonUntil = this.now + 3;
      P.poisonDps = Math.max(prev, amount / 3);
      this.floatText(P.x, P.y - 70, String(amount), '#7aff5a', 15);
      return;
    }
    if (elem === 'cold') P.slowUntil = this.now + 2;
    rp.hp -= amount;
    P.flashT = 0.1;
    this.floatText(P.x + D.rnd.range(-8, 8), P.y - 70, String(amount), '#ff5050', 16);
    if (amount > st.maxHp * 0.12) { D.Sfx.play('hurt'); this.cameras.main.shake(120, 0.004); }
    if (rp.hp <= 0) this.die();
    void source;
  }

  knockPlayer(nx, ny, d) {
    const P = this.player;
    for (let i = 0; i < 6; i++) this.moveEntity(P, nx * d / 6, ny * d / 6, 11);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    const rp = this.run.player, P = this.player;
    rp.hp = 0;
    P.action = null; P.path = null; P.whirl = null; P.leap = null;
    D.Sfx.play('pdie');
    P.sprite.setTint(0x8a2020);
    this.tweens.add({ targets: P.sprite, angle: P.facing < 0 ? -90 : 90, duration: 700 });
    this.cameras.main.shake(400, 0.01);
    this.after(1.6, () => D.UI.showDeath());
  }

  respawn() {
    const run = this.run, rp = run.player;
    run.deaths++;
    const lost = Math.floor(rp.gold * 0.1);
    rp.gold -= lost;
    rp.hp = null; rp.mana = null;
    this.player.poisonUntil = 0;
    run.floorIndex = 0;
    D.UI.log(lost ? `Budiš se u Gruntovcu, ${lost} dinara siromašniji` : 'Budiš se u Gruntovcu', '#c88');
    this.goTo(0, 'town', true);
  }

  victory() {
    const run = this.run;
    run.won = true;
    G.addRecord(run);
    G.clearSave();
    D.Sfx.play('victory');
    D.UI.showVictory();
  }

  // ---------- xp ----------
  addXp(xp) {
    const rp = this.run.player;
    if (rp.level >= D.MAX_LEVEL) return;
    rp.xp += xp;
    while (rp.level < D.MAX_LEVEL && rp.xp >= D.xpForLevel(rp.level)) {
      rp.xp -= D.xpForLevel(rp.level);
      rp.level++;
      rp.statPoints += 5;
      rp.skillPoints += 1;
      this.recalc();
      rp.hp = this.stats.maxHp; rp.mana = this.stats.maxMana;
      D.Sfx.play('level');
      D.UI.banner(`Razina ${rp.level}`, 'Novi bodovi za osobine i vještine: pritisni C');
      const P = this.player;
      const g = this.add.image(P.x, P.y - 30, 'glow').setTint(0xffd070).setBlendMode('ADD').setScale(1).setDepth(P.y + 10);
      this.tweens.add({ targets: g, scale: 5, alpha: 0, duration: 900, onComplete: () => g.destroy() });
      D.UI.refreshPanels();
    }
  }

  // ---------- projectiles, hazards and effects ----------
  spawnProj(o) {
    const p = Object.assign({ r: 8, life: 0, hitSet: null, travelled: 0 }, o);
    p.vx = Math.cos(o.angle) * o.speed; p.vy = Math.sin(o.angle) * o.speed;
    let s;
    const k = o.kind;
    if (k === 'arrow' || k === 'firearrow' || k === 'icearrow') {
      s = this.add.image(o.x, o.y, 'arrow').setRotation(o.angle);
      if (k !== 'arrow') {
        p.glow = this.add.image(o.x, o.y, 'glow').setTint(k === 'firearrow' ? 0xff7a20 : 0x8ad8ff).setBlendMode('ADD').setScale(0.7);
        s.setTint(k === 'firearrow' ? 0xffb080 : 0xc0f0ff);
      }
    } else if (k === 'spark') {
      s = this.add.image(o.x, o.y, 'glow').setTint(0x9ac0ff).setBlendMode('ADD').setScale(0.45);
    } else {
      const col = k === 'poison' ? 0x6aff3a : k === 'fireball' ? 0xff5a10 : 0xff8a30;
      s = this.add.image(o.x, o.y, 'glow').setTint(col).setBlendMode('ADD').setScale(k === 'fireball' ? 0.8 : 0.6);
      p.core = this.add.image(o.x, o.y, 'spark').setBlendMode('ADD').setScale(1.2);
      p.trailCol = col;
      p.r = k === 'fireball' ? 11 : 9;
    }
    p.sprite = s;
    if (o.pierce) p.hitSet = new Set();
    this.projectiles.push(p);
    return p;
  }

  updateProjectiles(dt) {
    const P = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.travelled += p.speed * dt;
      p.life += dt;
      let end = p.travelled > p.range || this.projWall(p);
      if (!end) {
        if (p.owner === 'p') {
          for (const m of this.monsters) {
            if (m.d.dead || (p.hitSet && p.hitSet.has(m))) continue;
            const c = this.monsterCenter(m), rr = m.r + p.r;
            if (dist2(p.x, p.y, c.x, c.y) < rr * rr) {
              this.damageMonster(m, p.dmg, p.elem, { crit: p.crit, burn: p.burn, knock: p.kind === 'arrow' ? 3 : 0 });
              if (p.freeze && !m.d.dead) { m.freezeUntil = this.now + (m.boss ? p.freeze * 0.3 : p.freeze); m.slowUntil = this.now + p.freeze + 2; }
              if (p.hitSet) { p.hitSet.add(m); if (p.kind === 'icearrow') this.burst(c.x, c.y, 0x8ad8ff, 8, 50); }
              else { end = true; break; }
            }
          }
        } else if (dist2(p.x, p.y, P.x, P.y - 26) < (p.r + 14) ** 2 && !P.leap) {
          this.hurtPlayer(p.dmg, p.elem, p.mlvl);
          end = true;
        }
      }
      if (end) {
        if (p.explode) {
          const e = p.explode;
          this.burst(p.x, p.y, e.color, 26, e.radius * 1.3);
          this.flash(p.x, p.y, e.color, e.radius / 18);
          D.Sfx.play('boom');
          for (const m of this.monstersInRadius(p.x, p.y + 20, e.radius)) this.damageMonster(m, e.dmg, e.elem, { quietSound: true, aoe: true });
        } else if (p.kind !== 'arrow') this.burst(p.x, p.y, p.trailCol || 0x9ac0ff, 8, 50);
        p.sprite.destroy(); if (p.glow) p.glow.destroy(); if (p.core) p.core.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      p.sprite.setPosition(p.x, p.y).setDepth(p.y + 30);
      if (p.glow) p.glow.setPosition(p.x, p.y).setDepth(p.y + 29);
      if (p.core) p.core.setPosition(p.x, p.y).setDepth(p.y + 31);
      if (p.trailCol && Math.random() < 0.5) this.puff(p.x, p.y, p.trailCol);
    }
  }

  // A projectile stops at a wall only when its whole width is in it, so shots that graze a corner fly on.
  projWall(p) {
    const gx = p.x, gy = p.y + 24, nx = -p.vy / p.speed * 8, ny = p.vx / p.speed * 8;
    return this.wallPx(gx, gy) && this.wallPx(gx + nx, gy + ny) && this.wallPx(gx - nx, gy - ny);
  }

  addHazard(x, y, r, dur, dps, elem, owner, color) {
    const s = this.add.image(x, y, 'glow').setTint(color).setBlendMode('ADD').setScale(r / 22, r / 44).setAlpha(0.55).setDepth(-35);
    this.tweens.add({ targets: s, alpha: 0.35, duration: 300, yoyo: true, repeat: -1 });
    this.hazards.push({ x, y, r, until: this.now + dur, dps, elem, owner, color, tick: 0, sprite: s });
  }

  updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      if (this.now > hz.until) { const s = hz.sprite; this.tweens.add({ targets: s, alpha: 0, duration: 400, onComplete: () => s.destroy() }); this.hazards.splice(i, 1); continue; }
      hz.tick -= dt;
      if (Math.random() < 0.35) this.puff(hz.x + D.rnd.range(-hz.r, hz.r) * 0.8, hz.y + D.rnd.range(-hz.r, hz.r) * 0.4, hz.color);
      if (hz.tick > 0) continue;
      hz.tick = 0.5;
      if (hz.owner === 'p') {
        for (const m of this.monstersInRadius(hz.x, hz.y, hz.r)) this.damageMonster(m, hz.dps * 0.5, hz.elem, { quiet: true });
      } else if (dist2(this.player.x, this.player.y, hz.x, hz.y) < hz.r * hz.r) this.hurtPlayer(hz.dps * 0.5, hz.elem, 1);
    }
  }

  after(sec, fn) { this.timers.push({ t: this.now + sec, fn }); }

  updateTimers() {
    for (let i = 0; i < this.timers.length; i++) {
      const t = this.timers[i];
      if (t.t <= this.now) { this.timers.splice(i, 1); i--; t.fn(); }
    }
  }

  burst(x, y, color, count, radius) {
    const e = this.add.particles(x, y, 'spark', {
      speed: { min: radius * 0.4, max: radius * 1.6 }, lifespan: { min: 250, max: 550 }, scale: { start: 1.6, end: 0 },
      tint: color, blendMode: 'ADD', emitting: false,
    });
    e.setDepth(y + 40);
    e.explode(count);
    this.time.delayedCall(700, () => e.destroy());
  }

  puff(x, y, color = 0x8a7a6a) {
    const s = this.add.image(x, y, 'spark').setTint(color).setBlendMode('ADD').setScale(D.rnd.range(0.8, 1.6)).setDepth(y + 20);
    this.tweens.add({ targets: s, y: y - D.rnd.range(10, 30), alpha: 0, scale: 0.2, duration: D.rnd.range(250, 500), onComplete: () => s.destroy() });
  }

  flash(x, y, color, scale) {
    const g = this.add.image(x, y, 'glow').setTint(color).setBlendMode('ADD').setScale(scale * 0.5).setDepth(y + 50);
    this.tweens.add({ targets: g, scale, alpha: 0, duration: 380, onComplete: () => g.destroy() });
  }

  ringFx(x, y, color, radius) {
    const r = this.add.image(x, y, 'ring').setTint(color).setBlendMode('ADD').setScale(0.2, 0.12).setDepth(y + 40);
    this.tweens.add({ targets: r, scaleX: radius / 54, scaleY: radius / 54 * 0.6, alpha: 0, duration: 420, onComplete: () => r.destroy() });
  }

  lightning(x1, y1, x2, y2) {
    const g = this.add.graphics().setDepth(Math.max(y1, y2) + 60).setBlendMode('ADD');
    const pts = [[x1, y1]], n = Math.max(3, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 22));
    for (let i = 1; i < n; i++) pts.push([x1 + (x2 - x1) * i / n + D.rnd.range(-12, 12), y1 + (y2 - y1) * i / n + D.rnd.range(-12, 12)]);
    pts.push([x2, y2]);
    for (const [w, c, a] of [[7, 0x4a6aff, 0.5], [3, 0xb0d0ff, 1], [1.2, 0xffffff, 1]]) {
      g.lineStyle(w, c, a); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.strokePath();
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
    this.flash(x2, y2, 0x9ac0ff, 1.2);
  }

  floatText(x, y, text, color, size) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(97000);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  // ---------- loot ----------
  spawnDrops(drops, x, y) {
    drops.forEach((dr, i) => {
      const a = D.rnd.range(0, Math.PI * 2), rr = i === 0 && drops.length === 1 ? 0 : D.rnd.range(18, 26 + drops.length * 6);
      const pos = this.nearestWalkable(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7);
      const entry = Object.assign({ x: pos.x, y: pos.y }, dr);
      this.floor.items.push(entry);
      this.addGroundSprite(entry, true);
      if (dr.kind === 'item' && dr.item.rarity === 'unique') D.Sfx.play('unique');
    });
  }

  dropLabel(entry) {
    if (entry.kind === 'gold') return { text: `${entry.amount} dinara`, color: '#e8c060' };
    if (entry.kind === 'potion') return { text: D.POTIONS[entry.ptype].name, color: '#e6e6e6' };
    const c = { normal: '#e6e6e6', magic: '#7d7dff', rare: '#ffef6a', unique: '#c9a564' }[entry.item.rarity];
    return { text: entry.item.name, color: c };
  }

  addGroundSprite(entry, fresh) {
    const icon = entry.kind === 'gold' ? 'gold' : entry.kind === 'potion' ? D.POTIONS[entry.ptype].icon : entry.item.icon;
    const spr = this.add.image(entry.x, entry.y, 'icon_' + icon).setScale(0.6).setDepth(entry.y - 20);
    const lab = this.dropLabel(entry);
    const label = this.add.text(entry.x, entry.y - 18, lab.text, {
      fontFamily: 'Crimson Text, Georgia, serif', fontSize: '15px', color: lab.color, backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 1).setDepth(95000);
    // plain white items only get a label while Alt is held or the cursor is on them
    const gi = { entry, x: entry.x, y: entry.y, sprite: spr, label, minor: entry.kind === 'item' && entry.item.rarity === 'normal' };
    label.setVisible(!gi.minor || G.showAllLabels);
    if (entry.kind === 'item' && (entry.item.rarity === 'unique' || entry.item.rarity === 'rare')) {
      gi.beam = this.add.image(entry.x, entry.y - 40, 'glow').setTint(entry.item.rarity === 'unique' ? 0xd8a040 : 0xffef6a)
        .setBlendMode('ADD').setScale(0.5, 2.6).setAlpha(0.5).setDepth(entry.y - 21);
    }
    if (fresh) {
      spr.y -= 30;
      this.tweens.add({ targets: spr, y: entry.y, duration: 380, ease: 'Bounce.easeOut' });
      if (entry.kind === 'item') D.Sfx.play('drop');
    }
    if (label.visible) this.layoutLabel(gi, this.groundItems);
    this.groundItems.push(gi);
  }

  layoutLabel(gi, others) {
    // nudge labels up until they no longer overlap visible neighbours
    let y = gi.entry.y - 18;
    for (let k = 0; k < 8; k++) {
      gi.label.setPosition(gi.entry.x, y);
      const b = gi.label.getBounds();
      const hit = others.some(o => o !== gi && o.label.visible && Phaser.Geom.Rectangle.Overlaps(b, o.label.getBounds()));
      if (!hit) break;
      y -= b.height + 1;
    }
  }

  applyLabelFilter() {
    const laid = [];
    for (const gi of this.groundItems) {
      gi.label.setVisible(!gi.minor || G.showAllLabels || gi === this.hoverGi);
      if (gi.label.visible) { this.layoutLabel(gi, laid); laid.push(gi); }
    }
  }

  removeGround(gi) {
    gi.sprite.destroy(); gi.label.destroy(); if (gi.beam) gi.beam.destroy();
    this.groundItems.splice(this.groundItems.indexOf(gi), 1);
    const i = this.floor.items.indexOf(gi.entry);
    if (i >= 0) this.floor.items.splice(i, 1);
  }

  pickup(gi) {
    const e = gi.entry, rp = this.run.player;
    if (e.kind === 'gold') {
      rp.gold += e.amount; D.Sfx.play('gold'); this.removeGround(gi);
    } else if (e.kind === 'potion') {
      const def = D.POTIONS[e.ptype];
      if (rp.potions[e.ptype] >= def.max) { D.UI.log(`Ne moreš nositi više: ${def.name}`, '#a88'); return false; }
      rp.potions[e.ptype]++; D.Sfx.play('pickup'); this.removeGround(gi);
    } else {
      const slot = rp.inv.indexOf(null);
      if (slot < 0) { D.UI.log('Torba je puna', '#f66'); D.Sfx.play('nomana'); return false; }
      rp.inv[slot] = e.item;
      D.Sfx.play('pickup');
      D.UI.log(`Pobrano: ${e.item.name}`, { normal: '#ddd', magic: '#8a8aff', rare: '#ffef6a', unique: '#c9a564' }[e.item.rarity]);
      this.removeGround(gi);
    }
    D.UI.refreshPanels();
    return true;
  }

  autoPickup() {
    const P = this.player, rp = this.run.player;
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gi = this.groundItems[i], e = gi.entry;
      if (e.kind === 'item') continue;
      if (dist2(P.x, P.y, gi.x, gi.y) > 40 * 40) continue;
      if (e.kind === 'potion' && rp.potions[e.ptype] >= D.POTIONS[e.ptype].max) continue;
      this.pickup(gi);
    }
  }

  dropItem(item) {
    const P = this.player;
    const entry = { x: P.x, y: P.y, kind: 'item', item };
    const pos = this.nearestWalkable(P.x + D.rnd.range(-30, 30), P.y + D.rnd.range(10, 30));
    entry.x = pos.x; entry.y = pos.y;
    this.floor.items.push(entry);
    this.addGroundSprite(entry, true);
  }

  // ---------- interactions ----------
  interact(o) {
    const run = this.run, f = this.floor;
    switch (o.kind) {
      case 'stairsDown': {
        if (o.seal) { D.UI.log('Krvavi pečat zatvara put. Prvo sredi gazdu ove razine.', '#f66'); D.Sfx.play('nomana'); return; }
        D.Sfx.play('stairs');
        this.goTo(f.index + 1, 'down');
        return;
      }
      case 'stairsUp': D.Sfx.play('stairs'); this.goTo(f.index - 1, 'up'); return;
      case 'waypoint': D.UI.openWaypoints(); return;
      case 'portal': {
        D.Sfx.play('portal');
        if (this.isTown) this.goTo(run.portal.floor, 'portal');
        else this.goTo(0, 'portal');
        return;
      }
      case 'chest': {
        if (o.done) return;
        o.done = true; o.data.opened = true;
        o.sprite.setTexture('chest_open');
        this.hideObjLabel(o);
        D.Sfx.play('chest');
        const mlvl = Math.round((f.mlvl[0] + f.mlvl[1]) / 2);
        this.spawnDrops(D.Items.drops('chest', mlvl, this.stats.mf, run.player.cls, D.DIFFICULTY[run.difficulty].ilvl), o.x, o.y + 30);
        return;
      }
      case 'shrine': {
        if (o.done) return;
        o.done = true; o.data.used = true;
        o.sprite.setTexture('shrine_used');
        this.hideObjLabel(o);
        if (o.glow) o.glow.destroy();
        const def = D.SHRINES[o.data.kind];
        D.Sfx.play('shrine');
        this.flash(o.x, o.y - 40, def.color, 4);
        if (o.data.kind === 'refill') {
          this.recalc(); run.player.hp = this.stats.maxHp; run.player.mana = this.stats.maxMana; this.player.poisonUntil = 0;
          D.UI.log('Kapelica Majke Božje: osjećaš se kao nov', '#f8a');
        } else {
          run.buffs[o.data.kind] = 90;
          this.recalc();
          D.UI.log(`${def.label}: ${def.buff} na 90 sekundi`, '#9ad0ff');
        }
        return;
      }
      case 'merchant': D.UI.openShop(); return;
      case 'stash': D.UI.openStash(); return;
      case 'healer':
      case 'fountain': {
        this.recalc();
        run.player.hp = this.stats.maxHp; run.player.mana = this.stats.maxMana; this.player.poisonUntil = 0;
        D.Sfx.play('shrine');
        D.UI.log(o.kind === 'healer' ? 'Župnik Ivo: "Hodi s Bogom, sinko."' : 'Hladna voda iz zdenca te okrijepi', '#9f9');
        return;
      }
    }
  }

  usePotion(type) {
    if (G.paused || this.dead) return;
    const rp = this.run.player, P = this.player;
    if (type === 'tp') return this.townPortal();
    if (!rp.potions[type]) { D.UI.log(`Nema više: ${D.POTIONS[type].name}`, '#a88'); return; }
    if (P.potCd > 0) return;
    P.potCd = 0.35;
    rp.potions[type]--;
    const st = this.stats;
    if (type === 'hp') { P.healQ += st.maxHp * 0.4 + 30; P.poisonUntil = 0; }
    if (type === 'mp') P.manaQ += st.maxMana * 0.45 + 20;
    if (type === 'rejuv') { rp.hp = Math.min(st.maxHp, rp.hp + st.maxHp * 0.45); rp.mana = Math.min(st.maxMana, rp.mana + st.maxMana * 0.45); P.poisonUntil = 0; }
    D.Sfx.play('potion');
  }

  townPortal() {
    const run = this.run, rp = run.player, P = this.player;
    if (G.paused || this.dead) return;
    if (this.isTown) { D.UI.log('Već si u Gruntovcu', '#a88'); return; }
    if (!rp.potions.tp) { D.UI.log('Nemaš više karata za autobus', '#a88'); return; }
    rp.potions.tp--;
    const old = this.interactables.find(o => o.kind === 'portal');
    if (old) { old.sprite.destroy(); if (old.labelText) old.labelText.destroy(); this.interactables.splice(this.interactables.indexOf(old), 1); }
    const pos = this.nearestWalkable(P.x + P.facing * 50, P.y);
    run.portal = { floor: this.floor.index, x: pos.x, y: pos.y };
    const o = this.addInteractable('portal', pos.x, pos.y, 'portal', 'Autobus za Gruntovec', { oy: 0.9, r: 30 });
    o.sprite.setScale(0.1);
    this.tweens.add({ targets: o.sprite, scale: 1, duration: 500, ease: 'Back.easeOut' });
    D.Sfx.play('portal');
  }

  goTo(index, arrival, instant) {
    if (this.leaving) return;
    this.leaving = true;
    const run = this.run;
    run.player.x = this.player.x; run.player.y = this.player.y;
    run.floorIndex = index;
    D.UI.closeAll();
    const go = () => { G.save(); this.scene.restart({ arrival }); };
    if (instant) go();
    else { this.cameras.main.fadeOut(250, 0, 0, 0); this.time.delayedCall(260, go); }
  }

  // ---------- darkness, camera, fog ----------
  createDarkness() {
    this.lightR = this.isTown ? 0 : 430;
    if (this.isTown) return;
    this.dark = this.add.image(0, 0, 'darkness').setDepth(90000);
    const size = this.lightR * 2.25, big = 6000;
    this.darkRects = [[big * 2, big], [big * 2, big], [big, size], [big, size]]
      .map(([w, h]) => this.add.rectangle(0, 0, w, h, 0x000000).setOrigin(0, 0).setDepth(90000));
  }

  updateDarkness() {
    if (!this.dark) return;
    const P = this.player, size = this.lightR * 2.25, half = size / 2;
    const x = P.x, y = P.y - 30;
    this.dark.setPosition(x, y).setDisplaySize(size, size);
    const big = 6000;
    const [top, bottom, left, right] = this.darkRects;
    top.setPosition(x - big, y - half - big + 1);
    bottom.setPosition(x - big, y + half - 1);
    left.setPosition(x - half - big + 1, y - half);
    right.setPosition(x + half - 1, y - half);
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, true, 0.18, 0.18);
    cam.setFollowOffset(0, 30);
    cam.setBackgroundColor('#000000');
    if (this.isTown) cam.setBounds(0, 0, this.w * this.T, this.h * this.T);
    else cam.removeBounds();
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));
  }

  applyZoom() {
    const h = this.scale.height, w = this.scale.width;
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(h / 860, w / 1200), 0.55, 1.6));
  }

  reveal() {
    const t = this.playerTile();
    if (t === this.lastTile) return;
    this.lastTile = t;
    const ex = G.explored[this.floor.index], w = this.w, h = this.h;
    const tx = t % w, ty = (t / w) | 0, R = 8;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R) continue;
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = y * w + x;
      if (!ex[i]) { ex[i] = 1; D.UI.paintCell(x, y); }
    }
  }

  update(time, delta) {
    if (G.paused) return;
    const dt = Math.min(delta, 50) / 1000;
    this.now += dt;
    if (!this.run.won) this.run.elapsed += dt * 1000;
    this.updateTimers();
    if (!this.dead) {
      this.updateHover();
      this.updatePlayer(dt);
      this.autoPickup();
      this.reveal();
    }
    this.updateMonsters(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateDarkness();
    this.saveT -= dt;
    if (this.saveT <= 0) { this.saveT = 20; this.run.player.x = this.player.x; this.run.player.y = this.player.y; G.save(); }
    D.UI.tick(this, dt);
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const k = this.k, p = this.p;
    k.push(key); p.push(pri);
    let i = k.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (p[par] <= p[i]) break;
      [k[par], k[i]] = [k[i], k[par]]; [p[par], p[i]] = [p[i], p[par]];
      i = par;
    }
  }
  pop() {
    const k = this.k, p = this.p, top = k[0];
    const lk = k.pop(), lp = p.pop();
    if (k.length) {
      k[0] = lk; p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [p[m], p[i]] = [p[i], p[m]];
        i = m;
      }
    }
    return top;
  }
}

D.BootScene = BootScene;
D.GameScene = GameScene;
