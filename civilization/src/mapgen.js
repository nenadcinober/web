// Procedural map: one large continent (so every civ can reach every other by land) plus
// a few islands, with latitude-based climate, resources and spread-out start positions.

function makeValueNoise(w, h, cell) {
  var gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  var g = [];
  for (var i = 0; i < gw * gh; i++) g.push(Math.random());
  function smooth(t) { return t * t * (3 - 2 * t); }
  return function (x, y) {
    var fx = x / cell, fy = y / cell;
    var x0 = Math.floor(fx), y0 = Math.floor(fy);
    var tx = smooth(fx - x0), ty = smooth(fy - y0);
    var a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1];
    var c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
}

function fractalNoise(w, h, base) {
  var n1 = makeValueNoise(w, h, base), n2 = makeValueNoise(w, h, base / 2), n3 = makeValueNoise(w, h, base / 4);
  return function (x, y) { return n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15; };
}

function generateMap(w, h, numCivs) {
  for (var attempt = 0; attempt < 30; attempt++) {
    var res = tryGenerateMap(w, h, numCivs);
    if (res) return res;
  }
  throw new Error('Map generation failed');
}

function tryGenerateMap(w, h, numCivs) {
  var height = fractalNoise(w, h, Math.max(8, w / 5));
  var moist = fractalNoise(w, h, Math.max(6, w / 7));
  var temp = fractalNoise(w, h, Math.max(6, w / 6));
  var hv = new Float32Array(w * h);
  var x, y, i;
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      var dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      var d = Math.sqrt(dx * dx * 0.9 + dy * dy * 1.1);
      var v = height(x, y) - Math.pow(d, 2.2) * 0.55;
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) v -= 1;
      hv[y * w + x] = v;
    }
  }
  var sorted = Array.prototype.slice.call(hv).sort(function (a, b) { return a - b; });
  var seaLevel = sorted[Math.floor(sorted.length * 0.56)];
  var landVals = sorted.filter(function (v) { return v > seaLevel; });
  var mountLevel = landVals[Math.floor(landVals.length * 0.94)];
  var hillLevel = landVals[Math.floor(landVals.length * 0.80)];

  var tiles = [];
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      i = y * w + x;
      var t;
      if (hv[i] <= seaLevel) t = 'ocean';
      else if (hv[i] >= mountLevel) t = 'mountains';
      else if (hv[i] >= hillLevel && Math.random() < 0.85) t = 'hills';
      else {
        var lat = Math.abs(y / (h - 1) * 2 - 1);
        var tt = 1 - lat * 1.15 + (temp(x, y) - 0.5) * 0.35;
        var m = moist(x, y);
        if (tt < 0.08) t = 'snow';
        else if (tt < 0.25) t = m > 0.6 ? 'forest' : 'tundra';
        else if (m > 0.6) t = 'forest';
        else if (tt > 0.62 && m < 0.36) t = 'desert';
        else if (m > 0.45 || (tt > 0.5 && m > 0.4)) t = 'grass';
        else t = 'plains';
      }
      tiles.push({ t: t, res: null, imp: null, road: false, owner: -1, city: -1, worked: -1, explored: false, visible: false, mass: -1 });
    }
  }
  // Water next to land becomes coast.
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var tile = tiles[y * w + x];
    if (tile.t !== 'ocean') continue;
    for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
      var nx = x + ox, ny = y + oy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && !TERRAIN[tiles[ny * w + nx].t].water) tile.t = 'coast';
    }
  }

  // Label land masses (8-connected, like unit movement).
  var masses = [];
  for (i = 0; i < tiles.length; i++) {
    if (TERRAIN[tiles[i].t].water || tiles[i].mass >= 0) continue;
    var id = masses.length, count = 0, stack = [i];
    tiles[i].mass = id;
    while (stack.length) {
      var c = stack.pop(); count++;
      var cx = c % w, cy = (c - cx) / w;
      for (oy = -1; oy <= 1; oy++) for (ox = -1; ox <= 1; ox++) {
        nx = cx + ox; ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var n = ny * w + nx;
        if (tiles[n].mass < 0 && !TERRAIN[tiles[n].t].water) { tiles[n].mass = id; stack.push(n); }
      }
    }
    masses.push(count);
  }
  var main = 0;
  masses.forEach(function (c, k) { if (c > masses[main]) main = k; });
  var totalLand = masses.reduce(function (a, b) { return a + b; }, 0);
  if (masses[main] < totalLand * 0.7) return null;

  // Resources.
  var resKeys = Object.keys(RESOURCES);
  for (i = 0; i < tiles.length; i++) {
    tile = tiles[i];
    var chance = tile.t === 'coast' ? 0.07 : (TERRAIN[tile.t].water || tile.t === 'snow' ? 0 : 0.11);
    if (Math.random() >= chance) continue;
    var options = resKeys.filter(function (k) { return RESOURCES[k].on.indexOf(tile.t) >= 0; });
    if (options.length) tile.res = options[Math.floor(Math.random() * options.length)];
  }

  // Start positions on the main continent, as far apart as possible.
  function siteScore(sx, sy) {
    var s = 0;
    for (var yy = sy - 2; yy <= sy + 2; yy++) for (var xx = sx - 2; xx <= sx + 2; xx++) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      var dd = (xx - sx) * (xx - sx) + (yy - sy) * (yy - sy);
      if (dd > 5) continue;
      var tl = tiles[yy * w + xx], T = TERRAIN[tl.t];
      s += T.food * 1.5 + T.prod + T.gold * 0.5;
      if (tl.res) s += 2;
    }
    return s;
  }
  var cands = [];
  for (y = 3; y < h - 3; y++) for (x = 3; x < w - 3; x++) {
    tile = tiles[y * w + x];
    if (tile.mass !== main || (tile.t !== 'grass' && tile.t !== 'plains')) continue;
    cands.push({ x: x, y: y, s: siteScore(x, y) });
  }
  if (cands.length < numCivs * 5) return null;
  var best = cands.reduce(function (a, b) { return Math.max(a, b.s); }, 0);
  cands = cands.filter(function (c) { return c.s >= best * 0.6; });
  var starts = [cands[Math.floor(Math.random() * cands.length)]];
  while (starts.length < numCivs) {
    var pick = null, pickVal = -1;
    cands.forEach(function (c) {
      var md = Infinity;
      starts.forEach(function (s) { md = Math.min(md, Math.hypot(s.x - c.x, s.y - c.y)); });
      var val = md + c.s * 0.15;
      if (val > pickVal) { pickVal = val; pick = c; }
    });
    var minD = Infinity;
    starts.forEach(function (s) { minD = Math.min(minD, Math.hypot(s.x - pick.x, s.y - pick.y)); });
    if (minD < 6) return null;
    starts.push(pick);
  }
  // Guarantee every start a food resource close by.
  starts.forEach(function (s) {
    var hasFood = false, spots = [];
    for (var yy = s.y - 2; yy <= s.y + 2; yy++) for (var xx = s.x - 2; xx <= s.x + 2; xx++) {
      var tl = tiles[yy * w + xx];
      if (tl.res && RESOURCES[tl.res].kind === 'food') hasFood = true;
      if ((xx !== s.x || yy !== s.y) && (tl.t === 'grass' || tl.t === 'plains') && !tl.res) spots.push(tl);
    }
    if (!hasFood && spots.length) spots[Math.floor(Math.random() * spots.length)].res = 'wheat';
    tiles[s.y * w + s.x].res = null;
  });
  return { tiles: tiles, starts: starts, mainMass: main };
}
