'use strict';

// Level generation. The tile layout of a floor is rebuilt from its seed whenever it is needed;
// the monsters, chests and shrines placed on it are created once and kept in the run state.

const WALL = 0, FLOOR = 1, LAVA = 2;

const Dungeon = D.Dungeon = {
  WALL, FLOOR, LAVA,

  themeFor(index, floors) {
    if (index === 0) return 'town';
    if (index === floors) return 'hell';
    const t = (index - 1) / Math.max(1, floors - 1);
    return t < 0.34 ? 'crypt' : t < 0.67 ? 'caves' : 'hell';
  },

  generate(theme, dim, seed, bossFloor) {
    const rng = D.makeRng(seed);
    let g;
    if (theme === 'caves') g = this.caves(dim, rng);
    else g = this.rooms(dim, rng, theme === 'hell');
    const { w, h, grid } = g;
    // start/end: the end is the walkable cell farthest from the start
    let start = g.start;
    if (!start) start = this.randomFloor(grid, w, h, rng);
    let dist = this.bfs(grid, w, h, start.x, start.y);
    let end = start, best = -1;
    for (let i = 0; i < dist.length; i++) if (dist[i] > best) { best = dist[i]; end = { x: i % w, y: (i / w) | 0 }; }
    const r = bossFloor ? 6.5 : 3.2;
    const ex = Math.max(Math.ceil(r) + 2, Math.min(w - Math.ceil(r) - 3, end.x));
    const ey = Math.max(Math.ceil(r) + 2, Math.min(h - Math.ceil(r) - 3, end.y));
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
      if (x * x + y * y <= r * r) grid[(ey + y) * w + ex + x] = FLOOR;
    }
    end = { x: ex, y: ey };
    // the start area gets a little room too, so the stairs and waypoint fit
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const tx = start.x + x, ty = start.y + y;
      if (tx > 1 && ty > 1 && tx < w - 2 && ty < h - 2) grid[ty * w + tx] = FLOOR;
    }
    dist = this.bfs(grid, w, h, start.x, start.y);
    const torches = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (grid[y * w + x] === WALL && grid[(y + 1) * w + x] === FLOOR && rng() < 0.07) torches.push({ x, y });
    }
    return { w, h, grid, start, end, dist, torches, rooms: g.rooms || [] };
  },

  rooms(dim, rng, lava) {
    const w = dim, h = dim, grid = new Uint8Array(w * h);
    const rooms = [], target = Math.floor(dim * dim / 165);
    for (let a = 0; a < 800 && rooms.length < target; a++) {
      const rw = rng.int(6, 13), rh = rng.int(6, 11);
      const x = rng.int(2, w - rw - 3), y = rng.int(2, h - rh - 3);
      if (rooms.some(r => x < r.x + r.w + 2 && x + rw + 2 > r.x && y < r.y + r.h + 2 && y + rh + 2 > r.y)) continue;
      rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
    }
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y * w + x] = FLOOR;
    for (const r of rooms) {
      if (r.w >= 10 && r.h >= 9 && rng() < 0.45) {
        for (const [px, py] of [[r.x + 2, r.y + 2], [r.x + r.w - 3, r.y + 2], [r.x + 2, r.y + r.h - 3], [r.x + r.w - 3, r.y + r.h - 3]]) grid[py * w + px] = WALL;
      }
    }
    // minimum spanning tree over room centres, plus a few loops
    const inTree = [0], edges = [];
    const d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
    while (inTree.length < rooms.length) {
      let bi = -1, bj = -1, bd = Infinity;
      for (const i of inTree) for (let j = 0; j < rooms.length; j++) {
        if (inTree.includes(j)) continue;
        const d = d2(rooms[i], rooms[j]);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
      edges.push([bi, bj]); inTree.push(bj);
    }
    for (let k = 0; k < Math.ceil(rooms.length * 0.2); k++) {
      const i = rng.int(0, rooms.length - 1);
      let bj = -1, bd = Infinity;
      for (let j = 0; j < rooms.length; j++) {
        if (j === i || edges.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) continue;
        const d = d2(rooms[i], rooms[j]);
        if (d < bd) { bd = d; bj = j; }
      }
      if (bj >= 0) edges.push([i, bj]);
    }
    const carve = (x, y) => { if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y * w + x] = FLOOR; };
    for (const [i, j] of edges) {
      const a = rooms[i], b = rooms[j];
      const horizFirst = rng() < 0.5;
      const row = horizFirst ? a.cy : b.cy, col = horizFirst ? b.cx : a.cx;
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx) + 1; x++) for (let k = 0; k < 2; k++) carve(x, row + k);
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy) + 1; y++) for (let k = 0; k < 2; k++) carve(col + k, y);
    }
    if (lava) this.addLava(grid, w, h, rooms, rng);
    const s = rooms[rng.int(0, rooms.length - 1)];
    return { w, h, grid, rooms, start: { x: s.cx, y: s.cy } };
  },

  addLava(grid, w, h, rooms, rng) {
    const countReach = () => {
      const s = this.randomFloor(grid, w, h, D.makeRng(1));
      const d = this.bfs(grid, w, h, s.x, s.y);
      let n = 0, f = 0;
      for (let i = 0; i < d.length; i++) { if (d[i] >= 0) n++; if (grid[i] === FLOOR) f++; }
      return n === f;
    };
    for (const r of rooms) {
      if (r.w < 8 || r.h < 8 || rng() < 0.4) continue;
      const qx = rng() < 0.5 ? r.x + 2 : r.x + r.w - 3, qy = rng() < 0.5 ? r.y + 2 : r.y + r.h - 3;
      const changed = [];
      const rad = rng.range(1.2, 2.2);
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
        const tx = qx + x, ty = qy + y, i = ty * w + tx;
        if (x * x + y * y <= rad * rad && tx > r.x && ty > r.y && tx < r.x + r.w - 1 && ty < r.y + r.h - 1 && grid[i] === FLOOR) {
          grid[i] = LAVA; changed.push(i);
        }
      }
      if (!countReach()) for (const i of changed) grid[i] = FLOOR;
    }
  },

  caves(dim, rng) {
    const w = dim, h = dim;
    for (let attempt = 0; attempt < 12; attempt++) {
      let grid = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) grid[y * w + x] = rng() < 0.45 ? WALL : FLOOR;
      for (let it = 0; it < 5; it++) {
        const next = new Uint8Array(w * h);
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && grid[(y + dy) * w + x + dx] === WALL) n++;
          next[y * w + x] = (n >= 5 || (it < 2 && n <= 1)) ? WALL : FLOOR;
        }
        grid = next;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) grid[y * w + x] = WALL;
      // keep only the largest connected region
      const seen = new Int32Array(w * h).fill(-1);
      let bestId = -1, bestN = 0, id = 0;
      for (let i = 0; i < w * h; i++) {
        if (grid[i] !== FLOOR || seen[i] >= 0) continue;
        let n = 0; const q = [i]; seen[i] = id;
        while (q.length) {
          const c = q.pop(); n++;
          const cx = c % w, cy = (c / w) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const j = (cy + dy) * w + cx + dx;
            if (grid[j] === FLOOR && seen[j] < 0) { seen[j] = id; q.push(j); }
          }
        }
        if (n > bestN) { bestN = n; bestId = id; }
        id++;
      }
      for (let i = 0; i < w * h; i++) if (grid[i] === FLOOR && seen[i] !== bestId) grid[i] = WALL;
      // widen single-tile pinches a little so fights aren't stuck in doorways
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        if (grid[i] !== WALL) continue;
        const l = grid[i - 1] === FLOOR, r = grid[i + 1] === FLOOR, u = grid[i - w] === FLOOR, d = grid[i + w] === FLOOR;
        if ((l && r && !u && !d) || (u && d && !l && !r)) { if (rng() < 0.5) grid[i] = FLOOR; }
      }
      if (bestN >= w * h * 0.36) return { w, h, grid };
    }
    // fall back to rooms if the caves never came out big enough
    return this.rooms(dim, rng, false);
  },

  town() {
    const w = 30, h = 24, grid = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) grid[y * w + x] = FLOOR;
    const trees = [];
    const rng = D.makeRng(424242);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const edge = x < 4 || y < 4 || x > w - 5 || y > h - 5;
      const keepClear = Math.abs(x - 15) < 3 && y > h - 6;
      if (edge && !keepClear && rng() < 0.22) { grid[y * w + x] = WALL; trees.push({ x, y }); }
    }
    const start = { x: 15, y: 13 };
    return { w, h, grid, start, end: { x: 15, y: 20 }, dist: this.bfs(grid, w, h, start.x, start.y), torches: [], trees, rooms: [] };
  },

  randomFloor(grid, w, h, rng) {
    for (let k = 0; k < 10000; k++) {
      const x = rng.int(1, w - 2), y = rng.int(1, h - 2);
      if (grid[y * w + x] === FLOOR) return { x, y };
    }
    for (let i = 0; i < grid.length; i++) if (grid[i] === FLOOR) return { x: i % w, y: (i / w) | 0 };
    return { x: 1, y: 1 };
  },

  // 8-way BFS over walkable tiles (no corner cutting); -1 = unreachable.
  bfs(grid, w, h, sx, sy, maxD = 32767) {
    const dist = new Int16Array(w * h).fill(-1);
    const q = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const s = sy * w + sx;
    if (grid[s] !== FLOOR) return dist;
    dist[s] = 0; q[qt++] = s;
    while (qh < qt) {
      const c = q[qh++], cd = dist[c];
      if (cd >= maxD) continue;
      const cx = c % w, cy = (c / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] >= 0 || grid[j] !== FLOOR) continue;
        if (dx && dy && (grid[cy * w + nx] !== FLOOR || grid[ny * w + cx] !== FLOOR)) continue;
        dist[j] = cd + 1; q[qt++] = j;
      }
    }
    return dist;
  },

  // ---------- population ----------
  createFloor(run, index) {
    const size = D.SIZES[run.size], n = size.floors;
    const theme = this.themeFor(index, n);
    const seed = (run.seed * 31 + index * 7919) >>> 0;
    const bossIdx = this.bossIndex(run, index);
    const bossKey = bossIdx >= 0 ? size.bosses[bossIdx] : null;
    const gen = this.generate(theme, size.dim, seed, !!bossKey);
    const rng = D.makeRng(seed ^ 0x5bd1e995);
    const T = D.TILE, px = t => t * T + T / 2;
    const mlvlStart = 1 + Math.round((index - 1) / n * (size.maxMlvl - 1));
    const mlvlEnd = 1 + Math.round(index / n * (size.maxMlvl - 1));
    const floor = {
      index, theme, seed, dim: size.dim,
      name: `${D.THEMES[theme].name} ${this.roman(this.themeLevel(run, index))}`,
      mlvl: [mlvlStart, mlvlEnd],
      monsters: [], chests: [], shrines: [], items: [],
      start: { x: px(gen.start.x), y: px(gen.start.y) },
      stairsUp: { x: px(gen.start.x) - T, y: px(gen.start.y) - T },
      waypoint: { x: px(gen.start.x) + T * 1.5, y: px(gen.start.y) + T },
      stairsDown: index < n ? { x: px(gen.end.x), y: px(gen.end.y) } : null,
      boss: bossKey, bossDead: false, bossId: null,
      final: index === n,
    };
    const { w, h, grid, dist } = gen;
    let maxDist = 1;
    for (let i = 0; i < dist.length; i++) if (dist[i] > maxDist) maxDist = dist[i];
    const mlvlAt = (tx, ty) => {
      const f = Math.max(0, dist[ty * w + tx]) / maxDist;
      return Math.round(mlvlStart + (mlvlEnd - mlvlStart) * f);
    };
    const isFree = (tx, ty) => grid[ty * w + tx] === FLOOR;
    const nearEnd = (tx, ty, r) => (tx - gen.end.x) ** 2 + (ty - gen.end.y) ** 2 < r * r;
    const candidates = [];
    for (let i = 0; i < dist.length; i++) if (dist[i] > 11) candidates.push(i);
    const used = [];
    const farFromUsed = (tx, ty, r) => used.every(u => (u.x - tx) ** 2 + (u.y - ty) ** 2 >= r * r);
    let nextId = 1;
    const add = (type, rank, tx, ty, extra) => {
      const m = this.makeMonster(run, type, rank, mlvlAt(tx, ty) + (rank === 'boss' ? 2 : 0), px(tx) + rng.range(-8, 8), px(ty) + rng.range(-8, 8));
      m.id = index * 10000 + nextId++;
      Object.assign(m, extra || {});
      floor.monsters.push(m);
      return m;
    };
    const placePack = (type, count, cx, cy, rank, extra) => {
      let placed = 0;
      for (let k = 0; k < 60 && placed < count; k++) {
        const tx = cx + rng.int(-2, 2), ty = cy + rng.int(-2, 2);
        if (tx < 1 || ty < 1 || tx >= w - 1 || ty >= h - 1 || !isFree(tx, ty)) continue;
        add(type, rank, tx, ty, extra); placed++;
      }
    };
    const pickSpot = (minSep) => {
      for (let k = 0; k < 200; k++) {
        const i = candidates[rng.int(0, candidates.length - 1)];
        const tx = i % w, ty = (i / w) | 0;
        if (bossKey && nearEnd(tx, ty, 10)) continue;
        if (!farFromUsed(tx, ty, minSep)) continue;
        return { x: tx, y: ty };
      }
      return null;
    };
    const types = D.THEMES[theme].monsters;
    // champion packs
    for (let c = 0; c < size.champions; c++) {
      const spot = pickSpot(7);
      if (!spot) break;
      used.push(spot);
      const type = rng.pick(types);
      const leader = add(type, 'champion', spot.x, spot.y, { name: this.championName(rng), mods: this.championMods(rng, mlvlEnd) });
      this.applyMods(leader);
      placePack(type, rng.int(3, 4), spot.x, spot.y, 'minion', { leader: leader.id });
    }
    // regular packs
    let total = floor.monsters.length, guard = 0;
    while (total < size.monsters && guard++ < 300) {
      const spot = pickSpot(5);
      if (!spot) break;
      used.push(spot);
      const type = rng.pick(types), def = D.MONSTERS[type];
      const count = rng.int(def.pack[0], def.pack[1]);
      placePack(type, count, spot.x, spot.y, 'normal');
      if (def.escort) placePack(def.escort, rng.int(2, 4), spot.x, spot.y, 'normal');
      total = floor.monsters.length;
    }
    // boss with a few guards
    if (bossKey) {
      const b = D.BOSSES[bossKey];
      const boss = add(bossKey, 'boss', gen.end.x, gen.end.y);
      boss.x = px(gen.end.x); boss.y = px(gen.end.y);
      floor.bossId = boss.id;
      placePack(b.minions, 4, gen.end.x, gen.end.y + 3, 'minion', { leader: boss.id });
      if (floor.stairsDown) floor.stairsDown = { x: px(gen.end.x), y: px(gen.end.y) - T * 4 };
    }
    // chests next to walls, and shrines
    const spots = candidates.filter(i => {
      return grid[i - w] === WALL && grid[i + w] === FLOOR && grid[i - 1] === FLOOR && grid[i + 1] === FLOOR && dist[i] > 6;
    });
    for (let c = 0; c < size.chests && spots.length; c++) {
      const i = spots.splice(rng.int(0, spots.length - 1), 1)[0];
      floor.chests.push({ x: px(i % w), y: px((i / w) | 0) - 6, opened: false });
    }
    const shrineCount = rng.int(1, 2);
    for (let c = 0; c < shrineCount; c++) {
      const spot = pickSpot(4);
      if (!spot) break;
      used.push(spot);
      const kind = rng.pick(Object.keys(D.SHRINES));
      floor.shrines.push({ x: px(spot.x), y: px(spot.y), kind, used: false });
    }
    return { floor, gen };
  },

  bossIndex(run, index) {
    return D.SIZES[run.size].bossFloors.indexOf(index);
  },

  themeLevel(run, index) {
    const n = D.SIZES[run.size].floors, theme = this.themeFor(index, n);
    let k = 0;
    for (let i = 1; i <= index; i++) if (this.themeFor(i, n) === theme) k++;
    return k;
  },

  roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] || String(n); },

  championName(rng) {
    const N = D.CHAMPION_NAMES;
    return `${rng.pick(N.first)}${rng.pick(N.second)} ${rng.pick(N.title)}`;
  },

  championMods(rng, mlvl) {
    const keys = Object.keys(D.CHAMPION_MODS), mods = [];
    const n = mlvl >= 9 ? 2 : 1;
    while (mods.length < n) { const k = rng.pick(keys); if (!mods.includes(k)) mods.push(k); }
    return mods;
  },

  applyMods(m) {
    for (const k of m.mods || []) {
      if (k === 'strong') m.dmg = Math.round(m.dmg * 1.6);
      if (k === 'fast') m.speed *= 1.45;
      if (k === 'stone') m.dr = 0.4;
    }
  },

  makeMonster(run, type, rank, mlvl, x, y) {
    const diff = D.DIFFICULTY[run.difficulty];
    const def = rank === 'boss' ? D.BOSSES[type] : D.MONSTERS[type];
    let hp = def.hp * D.hpScale(mlvl) * diff.hp;
    let dmg = def.dmg * D.dmgScale(mlvl) * diff.dmg * 0.72;
    let speed = def.speed;
    if (rank === 'champion') { hp *= 4; dmg *= 1.25; speed *= 1.1; }
    if (rank === 'minion') { hp *= 1.3; dmg *= 1.1; }
    hp = Math.round(hp);
    return { type, rank, mlvl, x, y, hp, maxHp: hp, dmg: Math.max(1, Math.round(dmg)), speed, dead: false };
  },
};
