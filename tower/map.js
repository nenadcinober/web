'use strict';

// Map generation (a winding cart track from the left edge to Dudek's house on the right, plus an optional
// second track coming down the hill) and painting the whole map onto one canvas, once per season.

const tkey = (x, y) => x + ',' + y;

function tilesBetween(a, b) {
  const out = [];
  const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
  let x = a[0], y = a[1];
  while (x !== b[0] || y !== b[1]) { x += dx; y += dy; out.push([x, y]); }
  return out;
}

function compress(tiles) {
  const out = [tiles[0]];
  for (let i = 1; i < tiles.length - 1; i++) {
    const p = tiles[i - 1], q = tiles[i], r = tiles[i + 1];
    if ((q[0] - p[0]) !== (r[0] - q[0]) || (q[1] - p[1]) !== (r[1] - q[1])) out.push(q);
  }
  out.push(tiles[tiles.length - 1]);
  return out.map(([x, y]) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }));
}

function makeRoute(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, start: total });
    total += len;
  }
  return { points, segs, total };
}

function routePos(route, d, out) {
  const segs = route.segs;
  let s = segs[segs.length - 1];
  for (let i = 0; i < segs.length; i++) if (d < segs[i].start + segs[i].len) { s = segs[i]; break; }
  const t = Math.min(1, Math.max(0, (d - s.start) / s.len));
  out.x = s.a.x + (s.b.x - s.a.x) * t;
  out.y = s.a.y + (s.b.y - s.a.y) * t;
  out.dx = s.b.x - s.a.x;
  return out;
}

function genTrack(W, H, rnd) {
  let y = 2 + Math.floor(rnd() * (H - 4));
  const corners = [[-1, y]], bands = [];
  let x = 0;
  for (;;) {
    const nx = x + 3 + Math.floor(rnd() * 3);
    if (nx > W - 4) break;
    corners.push([nx, y]); bands.push(nx);
    const minD = Math.max(3, Math.floor(H * 0.45));
    const up = y - 1, down = H - 2 - y;
    let ny;
    if (down >= minD && (up < minD || rnd() < 0.5)) ny = y + minD + Math.floor(rnd() * (down - minD + 1));
    else if (up >= minD) ny = y - minD - Math.floor(rnd() * (up - minD + 1));
    else ny = down > up ? H - 2 : 1;
    corners.push([nx, ny]);
    y = ny; x = nx;
  }
  corners.push([W - 1, y]);
  const tiles = [];
  for (let i = 0; i < corners.length - 1; i++) {
    for (const t of tilesBetween(corners[i], corners[i + 1])) if (t[0] >= 0) tiles.push(t);
  }
  return { tiles, bands, start: corners[0] };
}

function generateMap(sizeKey, seed) {
  const size = SIZES[sizeKey];
  const W = size.w, H = size.h;
  const rnd = mulberry32(seed);
  let track, side = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    track = genTrack(W, H, rnd);
    if (!size.spawn2From) break;
    const set = new Map(track.tiles.map((t, i) => [tkey(t[0], t[1]), i]));
    const cands = [];
    for (let cx = 3; cx <= W - 6; cx++) {
      if (track.bands.some(b => Math.abs(b - cx) < 2)) continue;
      for (const dir of [1, -1]) {
        let yy = dir === 1 ? 0 : H - 1, len = 0;
        while (yy >= 0 && yy < H && !set.has(tkey(cx, yy))) { yy += dir; len++; }
        const merge = set.get(tkey(cx, yy));
        // merging around the middle keeps both tracks worth defending
        if (yy >= 0 && yy < H && len >= 4 && merge > track.tiles.length * 0.3 && merge < track.tiles.length * 0.65) cands.push({ cx, dir, len, merge });
      }
    }
    if (cands.length) { side = cands[Math.floor(rnd() * cands.length)]; break; }
  }

  const pathSet = new Set(track.tiles.map(t => tkey(t[0], t[1])));
  const goal = track.tiles[track.tiles.length - 1];
  const routes = [makeRoute(compress([track.start, ...track.tiles]))];
  const gates = [{ tx: track.start[0] + 1, ty: track.start[1], dir: 'w' }];
  let side2 = null;
  if (side) {
    const tiles2 = [];
    for (let i = 0; i < side.len; i++) tiles2.push([side.cx, side.dir === 1 ? i : H - 1 - i]);
    const start2 = [side.cx, side.dir === 1 ? -1 : H];
    tiles2.forEach(t => pathSet.add(tkey(t[0], t[1])));
    routes.push(makeRoute(compress([start2, ...tiles2, ...track.tiles.slice(side.merge)])));
    gates.push({ tx: side.cx, ty: side.dir === 1 ? 0 : H - 1, dir: side.dir === 1 ? 'n' : 's' });
    side2 = tiles2;
  }

  const blocked = new Set(pathSet);
  const occupy = (x, y) => blocked.add(tkey(x, y));
  for (let dy = -1; dy <= 1; dy++) occupy(goal[0], goal[1] + dy);
  occupy(goal[0] - 1, goal[1] - 1);
  const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !blocked.has(tkey(x, y));
  const nearPath = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
    .some(([a, b]) => pathSet.has(tkey(x + a, y + b)));

  // gate signposts sit beside where each track enters
  const signs = [];
  gates.forEach((g, i) => {
    const cand = g.dir === 'w' ? [[0, g.ty - 1], [0, g.ty + 1]] : [[g.tx + 1, g.ty], [g.tx - 1, g.ty]];
    const spot = cand.find(([x, y]) => free(x, y));
    if (spot) { occupy(spot[0], spot[1]); signs.push({ tx: spot[0], ty: spot[1], text: i === 0 ? 'ZAGREB' : 'KOPRIVNICA' }); }
  });

  const decor = [];
  const drnd = mulberry32(seed ^ 0x5bd1e995);
  const place = (kind, x, y, w = 1, h = 1) => {
    for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) occupy(x + a, y + b);
    decor.push({ kind, tx: x, ty: y, w, h, v: drnd() });
  };

  // the village: houses and the church close to Dudek's house
  let houses = 0, church = false;
  for (let tries = 0; tries < 400 && houses < 3 + Math.floor(W / 10); tries++) {
    const x = goal[0] - 1 - Math.floor(drnd() * Math.min(7, W / 3));
    const y = goal[1] - 4 + Math.floor(drnd() * 9);
    if (!free(x, y) || nearPath(x, y) && drnd() < 0.8) continue;
    if (!church && free(x, y - 1)) { place('church', x, y); occupy(x, y - 1); church = true; continue; }
    place('house', x, y); houses++;
  }
  for (let tries = 0; tries < 200 && houses < 4 + Math.floor(W * H / 120); tries++) {
    const x = Math.floor(drnd() * W), y = Math.floor(drnd() * H);
    if (free(x, y) && !nearPath(x, y)) { place('house', x, y); houses++; }
  }
  if (W >= 30) {
    for (let tries = 0; tries < 200; tries++) {
      const x = 1 + Math.floor(drnd() * (W - 3)), y = 1 + Math.floor(drnd() * (H - 3));
      if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => free(x + a, y + b) && !nearPath(x + a, y + b))) {
        place('pond', x, y, 2, 2); break;
      }
    }
  }
  const fields = [];
  for (let tries = 0; tries < W * H / 60; tries++) {
    const fw = 2 + Math.floor(drnd() * 4), fh = 2 + Math.floor(drnd() * 3);
    const x = Math.floor(drnd() * (W - fw)), y = Math.floor(drnd() * (H - fh));
    let ok = true;
    for (let a = -1; a <= fw && ok; a++) for (let b = -1; b <= fh && ok; b++) if (pathSet.has(tkey(x + a, y + b))) ok = false;
    if (ok) fields.push({ x, y, w: fw, h: fh, v: drnd() });
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!free(x, y)) continue;
    const near = nearPath(x, y);
    const r = drnd();
    if (r < (near ? 0.025 : 0.085)) place(drnd() < 0.3 ? 'poplar' : drnd() < 0.5 ? 'fruit' : 'tree', x, y);
    else if (r < (near ? 0.03 : 0.1)) place('stog', x, y);
    else if (r < (near ? 0.035 : 0.115)) place('sunflower', x, y);
    else if (r < (near ? 0.038 : 0.122)) place(drnd() < 0.5 ? 'well' : 'cross', x, y);
  }
  decor.sort((a, b) => a.ty - b.ty);

  return { size, sizeKey, seed, W, H, track: track.tiles, side: side2, pathSet, blocked, routes, gates, goal, decor, fields, signs };
}

// ---------- painting ----------

function paintMap(scene, map, seasonIdx) {
  const S = SEASONS[seasonIdx];
  const pw = map.W * TILE, ph = map.H * TILE;
  let tex = scene.textures.exists('map_bg') ? scene.textures.get('map_bg') : null;
  if (!tex || tex.width !== pw || tex.height !== ph) {
    if (tex) scene.textures.remove('map_bg');
    tex = scene.textures.createCanvas('map_bg', pw, ph);
  }
  const c = tex.getContext();
  c.lineJoin = 'round'; c.lineCap = 'round';
  const rnd = mulberry32(map.seed + 77);
  const winter = seasonIdx === 3;

  c.fillStyle = S.grass; c.fillRect(0, 0, pw, ph);
  for (let i = 0; i < map.W * map.H * 1.2; i++) {
    c.globalAlpha = 0.35 + rnd() * 0.3;
    ell(c, rnd() * pw, rnd() * ph, 12 + rnd() * 34, 8 + rnd() * 20, S.grass2);
  }
  c.globalAlpha = 1;

  for (const f of map.fields) paintField(c, f, seasonIdx);

  for (let i = 0; i < map.W * map.H * 6; i++) {
    const x = rnd() * pw, y = rnd() * ph;
    if (winter) { line(c, x, y, x + 4, y, 'rgba(150,170,200,0.35)', 1); continue; }
    line(c, x, y, x + (rnd() - 0.5) * 3, y - 4 - rnd() * 3, seasonIdx === 2 ? '#7e7030' : '#5a8a32', 1);
  }
  const flowers = [['#fff', '#f2d22a'], ['#d8262e', '#2a1a0e'], ['#f2d22a', '#c8461a'], ['#7a9ee8', '#fff']];
  const nFlowers = [map.W * map.H * 0.9, map.W * map.H * 0.6, map.W * map.H * 0.5, 0][seasonIdx];
  for (let i = 0; i < nFlowers; i++) {
    const x = rnd() * pw, y = rnd() * ph;
    if (seasonIdx === 2) { ell(c, x, y, 2.5, 1.5, ['#c8561a', '#e8a020', '#8a3a1a'][i % 3], null, 0, rnd() * 3); continue; }
    const [p, m] = flowers[i % flowers.length];
    for (let k = 0; k < 5; k++) ell(c, x + Math.cos(k * 1.26) * 2.2, y + Math.sin(k * 1.26) * 2.2, 1.6, 1.6, p);
    ell(c, x, y, 1.2, 1.2, m);
  }
  if (winter) for (let i = 0; i < map.W * map.H * 1.5; i++) ell(c, rnd() * pw, rnd() * ph, 6 + rnd() * 16, 3 + rnd() * 5, 'rgba(255,255,255,0.8)');

  // the tracks: dark rim, dirt, then ruts and pebbles
  const tracks = [map.routes[0].points];
  if (map.routes[1]) tracks.push(map.routes[1].points);
  const stroke = (w, col) => {
    for (const pts of tracks) {
      c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) c.lineTo(p.x, p.y);
      c.strokeStyle = col; c.lineWidth = w; c.stroke();
    }
  };
  stroke(38, winter ? '#8a7a70' : '#6e4a2a');
  stroke(32, S.dirt);
  const tiles = map.track.concat(map.side || []);
  for (const [tx, ty] of tiles) {
    const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
    for (let k = 0; k < 4; k++) ell(c, x + (rnd() - 0.5) * 26, y + (rnd() - 0.5) * 26, 1.5 + rnd() * 2, 1.2 + rnd() * 1.5, rnd() < 0.5 ? '#8a6a4a' : '#d8c0a0');
    if (rnd() < 0.18) ell(c, x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 16, 6 + rnd() * 5, 3 + rnd() * 2, winter ? '#cfe6f0' : '#7a5a3e');
    if (winter) for (let k = 0; k < 3; k++) ell(c, x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30, 5 + rnd() * 6, 3 + rnd() * 3, 'rgba(255,255,255,0.85)');
  }
  c.setLineDash([5, 7]);
  stroke(2, 'rgba(70,40,20,0.35)');
  c.setLineDash([]);

  for (const d of map.decor) paintDecor(c, d, seasonIdx);
  for (const s of map.signs) {
    const half = s.text.length * 2.3 + 6;
    paintSign(c, Phaser.Math.Clamp(s.tx * TILE + 20, half + 2, pw - half - 2), s.ty * TILE + 36, s.text, winter);
  }
  paintHome(c, map.goal[0] * TILE + 20, map.goal[1] * TILE + 34, winter);
  tex.refresh();
}

function paintField(c, f, s) {
  const x = f.x * TILE + 6, y = f.y * TILE + 6, w = f.w * TILE - 12, h = f.h * TILE - 12;
  const pal = [
    ['#8a6038', '#6fa040'], ['#e6c048', '#d0a830'], ['#7a5232', '#6a4428'], ['#f4f7fa', '#c8d0da'],
  ][s];
  rrect(c, x, y, w, h, 4, pal[0], 'rgba(60,40,20,0.5)', 1.5);
  const vertical = f.v < 0.5;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (let i = 0; i < (vertical ? w : h); i += 7) {
    if (vertical) line(c, x + i, y, x + i, y + h, pal[1], 2.5);
    else line(c, x, y + i, x + w, y + i, pal[1], 2.5);
  }
  c.restore();
}

function crown(c, x, y, rx, ry, s, v) {
  const sets = [
    ['#4e9a34', '#6ab842', '#3a7a28'], ['#3e8a2c', '#5aa83a', '#2e6a22'],
    ['#d8742a', '#e8a62a', '#b84a1e'], null,
  ];
  if (s === 3) {
    line(c, x, y + ry, x, y - ry * 0.6, '#3a2a1e', 2.4);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45, l = ry * (0.6 + (i % 2) * 0.3);
      line(c, x, y + ry * 0.2 - i * 2, x + Math.cos(a) * l, y + Math.sin(a) * l, '#3a2a1e', 1.4);
      ell(c, x + Math.cos(a) * l, y + Math.sin(a) * l - 1, 3, 1.4, '#fff');
    }
    return;
  }
  const p = sets[s];
  ell(c, x, y, rx, ry, p[2], OUT, 1.5);
  const r = mulberry32(Math.floor(v * 1e6));
  for (let i = 0; i < rx * ry / 9; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.82;
    const lx = x + Math.cos(a) * rx * d, ly = y + Math.sin(a) * ry * d;
    ell(c, lx, ly, 3.2, 1.8, p[i % 2], 'rgba(30,50,20,0.6)', 0.6, r() * 3);
  }
}

function paintDecor(c, d, s) {
  const x = d.tx * TILE + TILE / 2, by = d.ty * TILE + TILE - 4;
  const shadow = () => ell(c, x, by, 14, 4, 'rgba(0,0,0,0.2)');
  switch (d.kind) {
    case 'tree':
      shadow();
      rrect(c, x - 3, by - 16, 6, 16, 1, '#6a4424', OUT, 1.2);
      crown(c, x, by - 24, 15, 13, s, d.v);
      break;
    case 'fruit':
      shadow();
      rrect(c, x - 2.5, by - 14, 5, 14, 1, '#6a4424', OUT, 1.2);
      crown(c, x, by - 21, 13, 11, s, d.v);
      if (s === 1) for (let i = 0; i < 6; i++) ell(c, x - 8 + (i * 37 % 16), by - 26 + (i * 13 % 11), 2, 2, '#d8262e', OUT, 0.6);
      if (s === 0) for (let i = 0; i < 7; i++) ell(c, x - 9 + (i * 37 % 18), by - 28 + (i * 13 % 13), 2, 2, '#fde8f0');
      break;
    case 'poplar':
      ell(c, x, by, 8, 3, 'rgba(0,0,0,0.2)');
      line(c, x, by, x, by - 10, '#6a4424', 3);
      if (s === 3) { crown(c, x, by - 22, 6, 18, 3, d.v); break; }
      crown(c, x, by - 26, 7, 22, s, d.v);
      break;
    case 'stog': {
      shadow();
      line(c, x, by - 34, x, by, '#6a4424', 2);
      c.beginPath(); c.moveTo(x - 14, by - 2); c.quadraticCurveTo(x - 14, by - 30, x, by - 30); c.quadraticCurveTo(x + 14, by - 30, x + 14, by - 2); c.closePath();
      c.fillStyle = s === 0 ? '#c8a848' : '#e2be4c'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
      for (let i = 1; i < 4; i++) line(c, x - 13 + i, by - 4 - i * 7, x + 13 - i, by - 4 - i * 7, '#b08a2a', 1);
      if (s === 3) { c.beginPath(); c.moveTo(x - 10, by - 22); c.quadraticCurveTo(x, by - 36, x + 10, by - 22); c.fillStyle = '#fff'; c.fill(); }
      break;
    }
    case 'sunflower':
      for (let i = 0; i < 3; i++) {
        const sx = x - 9 + i * 9, top = by - 22 - (i % 2) * 6;
        line(c, sx, by, sx, top, s === 3 ? '#8a7a5a' : '#4a7a2a', 1.8);
        if (s !== 3) ell(c, sx + 3, top + 10, 4, 2, '#5a9a32', null, 0, -0.5);
        if (s === 1) {
          for (let k = 0; k < 10; k++) ell(c, sx + Math.cos(k * 0.63) * 5, top + Math.sin(k * 0.63) * 5, 2.6, 1.4, '#f6c81c', null, 0, k * 0.63);
          ell(c, sx, top, 3.2, 3.2, '#5a3418', OUT, 0.8);
        } else if (s === 2 || s === 3) ell(c, sx + 1, top + 1, 3.5, 3.5, s === 3 ? '#6a5a4a' : '#5a3418', OUT, 0.8);
        else ell(c, sx, top, 2.5, 2.5, '#7ab842', OUT, 0.8);
      }
      break;
    case 'well': {
      shadow();
      rrect(c, x - 9, by - 12, 18, 12, 2, '#9a9a92', OUT, 1.3);
      line(c, x - 9, by - 7, x + 9, by - 7, '#77776f', 1);
      line(c, x + 12, by, x + 12, by - 24, '#6a4424', 2.4);
      line(c, x - 14, by - 34, x + 18, by - 20, '#7a5230', 2);
      line(c, x - 14, by - 34, x - 6, by - 14, '#3a2a1e', 0.8);
      rrect(c, x - 9, by - 16, 6, 5, 1, '#7a5230', OUT, 0.8);
      if (s === 3) ell(c, x, by - 12, 9, 1.8, '#fff');
      break;
    }
    case 'cross':
      ell(c, x, by, 7, 2.5, 'rgba(0,0,0,0.2)');
      line(c, x, by, x, by - 30, '#5a3a20', 3);
      line(c, x - 8, by - 22, x + 8, by - 22, '#5a3a20', 3);
      poly(c, [x - 7, by - 31, x, by - 36, x + 7, by - 31], '#5a3a20', OUT, 1);
      ell(c, x, by - 22, 1.6, 1.6, '#f2c21c');
      if (s < 2) for (let i = 0; i < 3; i++) ell(c, x - 4 + i * 4, by - 2, 2, 2, ['#d8262e', '#f2d22a', '#fff'][i]);
      break;
    case 'house': paintHouse(c, x, by, s, d.v, false); break;
    case 'church': paintChurch(c, x, by, s); break;
    case 'pond': {
      const px = d.tx * TILE + TILE, py = d.ty * TILE + TILE;
      ell(c, px, py, 34, 24, s === 3 ? '#cfe6f0' : '#4a8ac8', OUT, 1.8);
      ell(c, px - 6, py - 6, 16, 6, s === 3 ? '#e8f4fa' : '#6aa8de');
      if (s !== 3) {
        for (const [ox, oy] of [[8, 6], [-12, 8]]) {
          ell(c, px + ox, py + oy, 5, 3, '#fff', OUT, 0.8); ell(c, px + ox + 4, py + oy - 3, 2.2, 2, '#fff', OUT, 0.8);
          poly(c, [px + ox + 6, py + oy - 3, px + ox + 9, py + oy - 2, px + ox + 6, py + oy - 1.5], '#e8a020');
        }
      }
      for (let i = 0; i < 6; i++) {
        const rx = px + 24 + (i % 3) * 3, ry = py + 6 + i;
        line(c, rx, ry + 6, rx - 1, ry - 10, s === 3 ? '#a89a7a' : '#4a7a2a', 1.4);
        if (i % 2) ell(c, rx - 1, ry - 10, 1.4, 3.5, '#6a4424');
      }
      break;
    }
  }
}

function paintHouse(c, x, by, s, v, big) {
  const k = big ? 1.35 : 1;
  const w = 30 * k, h = 18 * k;
  ell(c, x, by, w * 0.6, 4, 'rgba(0,0,0,0.2)');
  const wall = v < 0.5 ? '#f8f4e8' : '#f2e4b8';
  rrect(c, x - w / 2, by - h, w, h, 1, wall, OUT, 1.4);
  // the lower band of old Podravina houses is often painted
  c.fillStyle = v < 0.3 ? '#3a6ab8' : '#8a5a32'; c.fillRect(x - w / 2 + 1, by - 4 * k, w - 2, 3 * k);
  const roof = v < 0.6 ? '#b8442a' : '#9a7a3e';
  poly(c, [x - w / 2 - 4, by - h + 1, x, by - h - 17 * k, x + w / 2 + 4, by - h + 1], roof, OUT, 1.4);
  if (v >= 0.6) for (let i = 1; i < 4; i++) line(c, x - w / 2 + i * w / 4 - 2, by - h, x - 1 + (i - 2) * 2, by - h - 15 * k, '#7a5a2a', 1);
  if (s === 3) poly(c, [x - w / 2 - 3, by - h, x, by - h - 16 * k, x + w / 2 + 3, by - h, x + w / 2 - 2, by - h + 3, x, by - h - 11 * k, x - w / 2 + 2, by - h + 3], '#fff');
  for (const wx of [-w / 4, w / 4]) {
    rrect(c, x + wx - 4 * k, by - h + 5 * k, 8 * k, 7 * k, 0.5, '#5a8ac8', '#2e57a8', 1.4);
    line(c, x + wx, by - h + 5 * k, x + wx, by - h + 12 * k, '#2e57a8', 1);
    if (s < 3) for (let i = 0; i < 3; i++) ell(c, x + wx - 3 * k + i * 3 * k, by - h + 13 * k, 1.6, 1.6, i % 2 ? '#f2d22a' : '#d8262e');
  }
  if (s === 3 || v > 0.7) {
    rrect(c, x + w / 4, by - h - 14 * k, 4, 8, 0.5, '#9a3a2a', OUT, 1);
    if (s === 3) for (let i = 0; i < 3; i++) ell(c, x + w / 4 + 2 + i * 3, by - h - 18 * k - i * 5, 3 + i, 2.5 + i, 'rgba(230,230,235,0.8)');
  }
}

function paintChurch(c, x, by, s) {
  ell(c, x, by, 18, 4, 'rgba(0,0,0,0.2)');
  rrect(c, x - 14, by - 22, 28, 22, 1, '#fbf8ee', OUT, 1.4);
  poly(c, [x - 16, by - 21, x, by - 32, x + 16, by - 21], '#b8442a', OUT, 1.3);
  rrect(c, x - 6, by - 58, 12, 38, 1, '#fbf8ee', OUT, 1.4);
  c.beginPath(); c.moveTo(x - 7, by - 58); c.quadraticCurveTo(x - 9, by - 66, x, by - 70); c.quadraticCurveTo(x + 9, by - 66, x + 7, by - 58); c.closePath();
  c.fillStyle = '#3a6a3a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
  line(c, x, by - 70, x, by - 80, OUT, 1.4); line(c, x - 3, by - 76, x + 3, by - 76, OUT, 1.4);
  ell(c, x, by - 50, 3, 3, '#f2e27a', OUT, 1);
  c.beginPath(); c.arc(x, by - 38, 3, Math.PI, 0); c.lineTo(x + 3, by - 32); c.lineTo(x - 3, by - 32); c.closePath();
  c.fillStyle = '#3a2a1e'; c.fill();
  c.beginPath(); c.arc(x, by - 6, 4, Math.PI, 0); c.lineTo(x + 4, by); c.lineTo(x - 4, by); c.closePath();
  c.fillStyle = '#5a3a20'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
  if (s === 3) {
    poly(c, [x - 15, by - 21, x, by - 31, x + 15, by - 21, x, by - 27], '#fff');
    c.beginPath(); c.moveTo(x - 7, by - 61); c.quadraticCurveTo(x, by - 70, x + 7, by - 61); c.quadraticCurveTo(x, by - 66, x - 7, by - 61); c.fillStyle = '#fff'; c.fill();
  }
}

function paintHome(c, x, by, winter) {
  paintHouse(c, x - 2, by + 2, winter ? 3 : 1, 0.75, true);
  rrect(c, x - 40, by - 52, 48, 12, 2, '#f8f4e8', OUT, 1.2);
  c.fillStyle = '#b8222a'; c.font = 'bold 8px Georgia, serif'; c.textAlign = 'center';
  c.fillText('DUDEKOVA', x - 16, by - 43.5);
  c.textAlign = 'left';
  licitar(c, x + 15, by - 30, 5);
}

function paintSign(c, x, by, text, winter) {
  ell(c, x, by, 8, 2.5, 'rgba(0,0,0,0.2)');
  line(c, x, by, x, by - 26, '#6a4424', 2.4);
  const w = text.length * 4.6 + 10;
  poly(c, [x - w / 2, by - 30, x + w / 2 - 5, by - 30, x + w / 2, by - 25, x + w / 2 - 5, by - 20, x - w / 2, by - 20], '#f6ecd0', OUT, 1.2);
  c.fillStyle = '#2b1a0e'; c.font = 'bold 7px "Trebuchet MS", sans-serif'; c.textAlign = 'center';
  c.fillText(text, x - 2, by - 22.5);
  c.textAlign = 'left';
  if (winter) ell(c, x - 2, by - 30.5, w / 2, 1.5, '#fff');
}
