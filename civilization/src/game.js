// Rules engine. Holds the whole game in the global G (plain JSON-serialisable data) and
// exposes functions the UI and the AI call. No Phaser in here.

var G = null;
var Hooks = {};          // UI callbacks: message(msg), changed(kind), event(evt), techLearned(p, key), gameOver(info)

function hook(name) {
  var f = Hooks[name];
  if (f) f.apply(null, Array.prototype.slice.call(arguments, 1));
}

function rnd(n) { return Math.floor(Math.random() * n); }
function pickRandom(a) { return a[rnd(a.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

// "Fat cross" city radii: dx²+dy² <= 5 (21 tiles) and <= 10 (37 tiles).
var RAD_SMALL = [], RAD_BIG = [];
(function () {
  for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) {
    var d = dx * dx + dy * dy;
    if (d <= 5) RAD_SMALL.push([dx, dy, d]);
    if (d <= 10) RAD_BIG.push([dx, dy, d]);
  }
})();
var DIRS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function inb(x, y) { return x >= 0 && y >= 0 && x < G.w && y < G.h; }
function tidx(x, y) { return y * G.w + x; }
function tileAt(x, y) { return inb(x, y) ? G.tiles[y * G.w + x] : null; }
function isWater(t) { return TERRAIN[t.t].water; }
function dist(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
function bdef(k) { return BUILDINGS[k] || WONDERS[k]; }
function player(id) { return G.players[id]; }
function humanPlayer() { return G.human >= 0 ? G.players[G.human] : null; }
function isHuman(pid) { return pid === G.human; }
function isBarb(pid) { return G.players[pid].barbarian; }
function diff() { return DIFFICULTIES[G.settings.difficulty] || DIFFICULTIES.normal; }
function aiMul(p) { return p.human || p.barbarian ? 1 : diff().ai; }

function yearOf(turn) {
  var y = -4000, t = 1;
  var steps = [[75, 50], [150, 20], [225, 10], [Infinity, 2]];
  for (var s = 0; s < steps.length && t < turn; s++) {
    while (t < turn && t < steps[s][0]) { y += steps[s][1]; t++; }
  }
  if (y === 0) y = 1;
  return y < 0 ? (-y) + ' BC' : y + ' AD';
}

// ---------------------------------------------------------------- messages

function addMsg(pid, text, color, x, y) {
  if (pid !== G.human || G.human < 0) return;
  var m = { turn: G.turn, text: text, color: color || '#e8e0c8', x: x, y: y };
  G.messages.push(m);
  if (G.messages.length > 80) G.messages.shift();
  hook('message', m);
}

function queueEvent(evt) {
  if (G.human < 0) {
    // Headless: resolve automatically with the first option.
    resolveEvent(evt, 0);
    return;
  }
  G.events.push(evt);
  hook('event', evt);
}

// ---------------------------------------------------------------- setup

function makePlayer(id, civIdx, human) {
  var civ = CIVS[civIdx] || { name: 'Barbarians', adj: 'Barbarian', leader: 'Chieftain', color: BARBARIAN_COLOR, cities: [] };
  return {
    id: id, civ: civIdx, name: civ.name, adj: civ.adj, leader: civ.leader, color: civ.color,
    human: !!human, barbarian: civIdx < 0, alive: true,
    gold: 30, sci: 0, research: null, techs: {}, numTechs: 0,
    goods: { wood: 10, stone: 0, iron: 0, horses: 0 },
    tax: 'normal', edicts: {},
    factions: { military: 50, clergy: 50, merchants: 50, peasants: 50 },
    factionMods: [], approval: 50,
    capital: -1, cityCount: 0, nameIdx: 0,
    aggression: 0.6 + Math.random() * 0.8,
    wins: 0, losses: 0, lostCities: 0, warWeary: 0,
    lastTribute: -100, lastPeaceAsk: -100,
    income: {}, lux: 0, foodTypes: 0, luxNames: [],
  };
}

function newGame(opts) {
  var size = MAP_SIZES[opts.size];
  var numAI = opts.numAI;
  var map = generateMap(size.w, size.h, numAI + 1);
  G = {
    version: 1, w: size.w, h: size.h, tiles: map.tiles, players: [], units: {}, cities: {},
    nextId: 1, turn: 1, diplo: [], wonders: {}, settings: opts, messages: [], events: [],
    over: null, human: opts.allAI ? -1 : 0, colony: {},
  };
  var others = [];
  for (var c = 0; c < CIVS.length; c++) if (c !== opts.civ) others.push(c);
  shuffle(others);
  var order = [opts.civ].concat(others);
  for (var i = 0; i <= numAI; i++) G.players.push(makePlayer(i, order[i], i === 0 && !opts.allAI));
  var barb = makePlayer(numAI + 1, -1, false);
  G.players.push(barb);
  var n = G.players.length;
  for (var a = 0; a < n; a++) {
    G.diplo.push([]);
    for (var b = 0; b < n; b++) G.diplo[a].push({ war: false, met: false, since: 0 });
  }
  rebuildIndex();
  var d = diff();
  map.starts.forEach(function (s, pi) {
    var p = G.players[pi];
    createUnit(pi, 'settler', s.x, s.y);
    createUnit(pi, 'warrior', s.x, s.y);
    createUnit(pi, 'worker', s.x, s.y);
    if (p.human) createUnit(pi, 'scout', s.x, s.y);
    else {
      if (d.ai >= 1.25) createUnit(pi, 'warrior', s.x, s.y);
      if (d.ai >= 1.5) createUnit(pi, 'settler', s.x, s.y);
    }
  });
  updateTerritory();
  var hp = humanPlayer();
  if (hp) {
    var s0 = map.starts[0];
    for (var yy = s0.y - 3; yy <= s0.y + 3; yy++) for (var xx = s0.x - 3; xx <= s0.x + 3; xx++) if (inb(xx, yy)) tileAt(xx, yy).explored = true;
  }
  updateVisibility();
  if (hp) addMsg(hp.id, 'You lead the ' + hp.name + '. Found your capital with the Settler (B).', '#ffd27a', map.starts[0].x, map.starts[0].y);
}

// ---------------------------------------------------------------- spatial index

function rebuildIndex() {
  G._upos = {};
  G._cpos = {};
  Object.keys(G.units).forEach(function (id) {
    var u = G.units[id], k = tidx(u.x, u.y);
    (G._upos[k] = G._upos[k] || []).push(u.id);
  });
  Object.keys(G.cities).forEach(function (id) {
    var c = G.cities[id];
    G._cpos[tidx(c.x, c.y)] = c.id;
  });
}

function unitsAt(x, y) {
  var a = G._upos[tidx(x, y)];
  if (!a) return [];
  return a.map(function (id) { return G.units[id]; });
}

function cityAt(x, y) {
  var id = G._cpos[tidx(x, y)];
  return id !== undefined ? G.cities[id] : null;
}

function playerUnits(pid) {
  var out = [];
  for (var id in G.units) if (G.units[id].owner === pid) out.push(G.units[id]);
  return out;
}

function playerCities(pid) {
  var out = [];
  for (var id in G.cities) if (G.cities[id].owner === pid) out.push(G.cities[id]);
  return out;
}

function isMilitary(u) { return !UNITS[u.type].civilian; }

// ---------------------------------------------------------------- units

function createUnit(owner, type, x, y, vet) {
  var u = { id: G.nextId++, type: type, owner: owner, x: x, y: y, hp: 10, moves: UNITS[type].moves * 3,
    vet: !!vet, fort: false, order: null, job: null, path: null, auto: false };
  G.units[u.id] = u;
  var k = tidx(x, y);
  (G._upos[k] = G._upos[k] || []).push(u.id);
  return u;
}

function removeFromIndex(u) {
  var k = tidx(u.x, u.y), a = G._upos[k];
  if (!a) return;
  var i = a.indexOf(u.id);
  if (i >= 0) a.splice(i, 1);
  if (!a.length) delete G._upos[k];
}

function killUnit(u) {
  removeFromIndex(u);
  delete G.units[u.id];
}

function placeUnit(u, x, y) {
  removeFromIndex(u);
  u.x = x; u.y = y;
  var k = tidx(x, y);
  (G._upos[k] = G._upos[k] || []).push(u.id);
}

function atWar(a, b) {
  if (a === b) return false;
  if (G.players[a].barbarian || G.players[b].barbarian) return true;
  return G.diplo[a][b].war;
}

function hasTech(p, key) { return !key || !!p.techs[key]; }

function moveCost(u, fx, fy, tx, ty) {
  var from = tileAt(fx, fy), to = tileAt(tx, ty);
  var fromCity = cityAt(fx, fy), toCity = cityAt(tx, ty);
  if ((from.road || fromCity) && (to.road || toCity)) return 1;
  return TERRAIN[to.t].move * 3;
}

// What would happen if unit u stepped onto (x,y): 'move', 'attack', 'capture' or null (blocked).
function stepKind(u, x, y) {
  if (!inb(x, y)) return null;
  var t = tileAt(x, y);
  if (isWater(t)) return null;
  var others = unitsAt(x, y).filter(function (o) { return o.owner !== u.owner; });
  var city = cityAt(x, y);
  if (others.length) {
    if (!atWar(u.owner, others[0].owner) || !isMilitary(u)) return null;
    return 'attack';
  }
  if (city && city.owner !== u.owner) {
    if (!atWar(u.owner, city.owner) || !isMilitary(u) || UNITS[u.type].siege) return null;
    return 'capture';
  }
  return 'move';
}

// Move one tile. Returns true if the unit moved or fought.
function stepUnit(u, x, y) {
  if (u.moves <= 0 || dist(u.x, u.y, x, y) !== 1) return false;
  var kind = stepKind(u, x, y);
  if (!kind) return false;
  if (kind === 'attack') { attack(u, x, y); return true; }
  var cost = moveCost(u, u.x, u.y, x, y);
  u.moves = Math.max(0, u.moves - cost);
  u.fort = false;
  if (u.order === 'fortify' || u.order === 'build') { u.order = null; u.job = null; }
  if (kind === 'capture' && G.players[u.owner].barbarian) { sackCity(cityAt(x, y), u); return true; }
  placeUnit(u, x, y);
  if (kind === 'capture') captureCity(cityAt(x, y), u.owner, u);
  if (isHuman(u.owner)) updateVisibility();
  else if (G.human >= 0 && tileAt(x, y).visible) checkContact(G.human, u.owner);
  return true;
}

// Follow u.path as far as moves allow. Stops if blocked or after fighting.
function followPath(u) {
  var moved = false;
  while (u.path && u.path.length && u.moves > 0 && G.units[u.id]) {
    var next = u.path[0];
    var kind = stepKind(u, next[0], next[1]);
    if (!kind) { u.path = null; break; }
    if (kind === 'attack') {
      // Only attack the final destination; anything in the way stops the march.
      if (u.path.length === 1) { stepUnit(u, next[0], next[1]); moved = true; }
      u.path = null;
      break;
    }
    if (!stepUnit(u, next[0], next[1])) { u.path = null; break; }
    u.path.shift();
    moved = true;
  }
  if (u.path && !u.path.length) u.path = null;
  return moved;
}

// ---------------------------------------------------------------- pathfinding (A*)

function Heap() { this.a = []; }
Heap.prototype.push = function (n) {
  var a = this.a; a.push(n);
  var i = a.length - 1;
  while (i > 0) {
    var p = (i - 1) >> 1;
    if (a[p].f <= a[i].f) break;
    var t = a[p]; a[p] = a[i]; a[i] = t; i = p;
  }
};
Heap.prototype.pop = function () {
  var a = this.a, top = a[0], last = a.pop();
  if (a.length) {
    a[0] = last;
    var i = 0;
    for (;;) {
      var l = i * 2 + 1, r = l + 1, m = i;
      if (l < a.length && a[l].f < a[m].f) m = l;
      if (r < a.length && a[r].f < a[m].f) m = r;
      if (m === i) break;
      var t = a[m]; a[m] = a[i]; a[i] = t; i = m;
    }
  }
  return top;
};

// Path for unit u to (tx,ty). The destination may be an enemy (attack) tile.
function findPath(u, tx, ty, maxNodes) {
  if (!inb(tx, ty) || isWater(tileAt(tx, ty))) return null;
  if (u.x === tx && u.y === ty) return [];
  maxNodes = maxNodes || 6000;
  var w = G.w, start = tidx(u.x, u.y), goal = tidx(tx, ty);
  var gScore = {}, came = {};
  gScore[start] = 0;
  var open = new Heap();
  open.push({ i: start, f: 0 });
  var closed = {}, n = 0;
  while (open.a.length) {
    var cur = open.pop();
    if (cur.i === goal) {
      var path = [], c = goal;
      while (c !== start) { path.unshift([c % w, Math.floor(c / w)]); c = came[c]; }
      return path;
    }
    if (closed[cur.i]) continue;
    closed[cur.i] = true;
    if (++n > maxNodes) return null;
    var cx = cur.i % w, cy = (cur.i - cx) / w;
    for (var d = 0; d < 8; d++) {
      var nx = cx + DIRS8[d][0], ny = cy + DIRS8[d][1];
      if (!inb(nx, ny)) continue;
      var ni = ny * w + nx;
      if (closed[ni]) continue;
      var t = G.tiles[ni];
      if (isWater(t)) continue;
      if (ni !== goal) {
        var us = G._upos[ni];
        if (us && G.units[us[0]].owner !== u.owner) continue;
        var cid = G._cpos[ni];
        if (cid !== undefined && G.cities[cid].owner !== u.owner) continue;
      } else {
        var kind = stepKind(u, nx, ny);
        if (!kind) continue;
      }
      var g = gScore[cur.i] + moveCost(u, cx, cy, nx, ny);
      if (gScore[ni] === undefined || g < gScore[ni]) {
        gScore[ni] = g;
        came[ni] = cur.i;
        open.push({ i: ni, f: g + Math.max(Math.abs(nx - tx), Math.abs(ny - ty)) * 2 });
      }
    }
  }
  return null;
}

function pathTurns(u, path) {
  var mv = UNITS[u.type].moves * 3, left = u.moves, turns = left > 0 ? 1 : 2, px = u.x, py = u.y;
  if (left <= 0) left = mv;
  for (var i = 0; i < path.length; i++) {
    if (left <= 0) { turns++; left = mv; }
    left -= moveCost(u, px, py, path[i][0], path[i][1]);
    px = path[i][0]; py = path[i][1];
  }
  return turns;
}

// ---------------------------------------------------------------- combat

function hasGlobal(p, key) {
  var cs = playerCities(p.id);
  for (var i = 0; i < cs.length; i++) {
    for (var b in cs[i].buildings) if (WONDERS[b] && WONDERS[b].gfx && WONDERS[b].gfx[key]) return WONDERS[b].gfx[key];
  }
  return 0;
}

function attackStrength(u) {
  var U = UNITS[u.type];
  return U.atk * (u.vet ? 1.5 : 1);
}

function defenseStrength(u, attacker) {
  var U = UNITS[u.type];
  if (U.def <= 0) return 0;
  var t = tileAt(u.x, u.y), m = 1 + TERRAIN[t.t].def;
  if (u.fort) m += 0.5;
  var city = cityAt(u.x, u.y);
  if (city) {
    m += 0.5;
    var walls = city.buildings.walls || hasGlobal(G.players[city.owner], 'walls');
    if (walls && !(attacker && UNITS[attacker.type].siege)) m += 1;
  }
  if (u.vet) m += 0.5;
  if (attacker && U.antiMounted && UNITS[attacker.type].mounted) m += 1;
  return U.def * m;
}

// Probability that attacker (hp ha) beats defender (hp hd) when each round is won with prob p.
function winChance(p, ha, hd) {
  var memo = {};
  function f(a, d) {
    if (d <= 0) return 1;
    if (a <= 0) return 0;
    var k = a * 16 + d;
    if (memo[k] !== undefined) return memo[k];
    return (memo[k] = p * f(a, d - 1) + (1 - p) * f(a - 1, d));
  }
  return f(ha, hd);
}

function bestDefender(x, y, attacker) {
  var best = null, bs = -1;
  unitsAt(x, y).forEach(function (d) {
    var s = defenseStrength(d, attacker) * (d.hp / 10);
    if (s > bs) { bs = s; best = d; }
  });
  return best;
}

function combatOdds(att, x, y) {
  var def = bestDefender(x, y, att);
  if (!def) return 1;
  var ds = defenseStrength(def, att);
  if (ds <= 0) return 1;
  var as = attackStrength(att);
  if (as <= 0) return 0;
  return winChance(as / (as + ds), att.hp, def.hp);
}

function unitLabel(u) {
  return G.players[u.owner].adj + ' ' + UNITS[u.type].name;
}

function attack(att, x, y) {
  var def = bestDefender(x, y, att);
  att.moves = 0;
  att.fort = false;
  if (!def) return;
  var ds = defenseStrength(def, att);
  var city = cityAt(x, y);
  if (ds <= 0) {
    // Only civilians: they are captured or scattered.
    captureCivilians(x, y, att);
    if (city && G.players[att.owner].barbarian) sackCity(city, att);
    else if (!UNITS[att.type].siege) {
      placeUnit(att, x, y);
      if (city && city.owner !== att.owner) captureCity(city, att.owner, att);
    }
    if (isHuman(att.owner)) updateVisibility();
    return;
  }
  var as = attackStrength(att);
  var p = as / (as + ds);
  while (att.hp > 0 && def.hp > 0) {
    if (Math.random() < p) def.hp--; else att.hp--;
  }
  var winner = att.hp > 0 ? att : def, loser = winner === att ? def : att;
  var A = G.players[att.owner], D = G.players[def.owner];
  winner.vet = winner.vet || Math.random() < 0.3;
  G.players[winner.owner].wins++;
  G.players[loser.owner].losses++;
  hook('combat', { x: x, y: y, fx: att.x, fy: att.y, winner: winner.owner });
  if (winner === att) {
    addMsg(att.owner, 'Your ' + UNITS[att.type].name + ' destroyed ' + unitLabel(def) + '.', '#9fe870', x, y);
    addMsg(def.owner, 'Your ' + UNITS[def.type].name + ' was destroyed by ' + unitLabel(att) + '.', '#ff8a7a', x, y);
  } else {
    addMsg(att.owner, 'Your ' + UNITS[att.type].name + ' was destroyed attacking ' + unitLabel(def) + '.', '#ff8a7a', x, y);
    addMsg(def.owner, 'Your ' + UNITS[def.type].name + ' defeated an attacking ' + unitLabel(att) + '.', '#9fe870', x, y);
  }
  G.players[loser.owner].warWeary += 2;
  killUnit(loser);
  if (winner === att) {
    var rest = unitsAt(x, y).filter(isMilitary);
    if (!rest.length) {
      captureCivilians(x, y, att);
      if (city && city.owner !== att.owner && !UNITS[att.type].siege && !G.players[att.owner].barbarian) {
        placeUnit(att, x, y);
        captureCity(city, att.owner, att);
      } else if (city && G.players[att.owner].barbarian) {
        sackCity(city, att);
      }
    }
  }
  if (G.human >= 0 && (isHuman(att.owner) || isHuman(def.owner))) updateVisibility();
}

function captureCivilians(x, y, by) {
  unitsAt(x, y).forEach(function (o) {
    if (o.owner === by.owner || isMilitary(o)) return;
    if (UNITS[o.type].worker && !G.players[by.owner].barbarian) {
      addMsg(o.owner, 'Your Worker was captured by the ' + G.players[by.owner].name + '!', '#ff8a7a', x, y);
      addMsg(by.owner, 'You captured a ' + G.players[o.owner].adj + ' Worker.', '#9fe870', x, y);
      o.owner = by.owner; o.order = null; o.job = null; o.path = null; o.auto = false;
      o.moves = 0;
    } else {
      addMsg(o.owner, 'Your ' + UNITS[o.type].name + ' was killed by ' + unitLabel(by) + '.', '#ff8a7a', x, y);
      killUnit(o);
    }
  });
}

function sackCity(city, barb) {
  var owner = G.players[city.owner];
  var loot = Math.min(owner.gold, 20 + city.pop * 5);
  owner.gold -= loot;
  if (city.pop > 1) city.pop--;
  addMsg(owner.id, 'Barbarians sacked ' + city.name + '! They stole ' + loot + ' gold.', '#ff8a7a', city.x, city.y);
  killUnit(barb);
}

// ---------------------------------------------------------------- cities

function canFoundCity(x, y) {
  var t = tileAt(x, y);
  if (!t || isWater(t) || TERRAIN[t.t].noCity) return false;
  for (var id in G.cities) {
    var c = G.cities[id];
    if (dist(c.x, c.y, x, y) < 3) return false;
  }
  return true;
}

function cityName(p) {
  var list = CIVS[p.civ] ? CIVS[p.civ].cities : [];
  var used = {};
  for (var id in G.cities) used[G.cities[id].name] = true;
  while (p.nameIdx < list.length) {
    var n = list[p.nameIdx++];
    if (!used[n]) return n;
  }
  return 'New ' + list[rnd(list.length)] + ' ' + (++p.nameIdx - list.length);
}

function foundCity(u) {
  if (!UNITS[u.type].settler || !canFoundCity(u.x, u.y)) return null;
  var p = G.players[u.owner];
  var c = {
    id: G.nextId++, name: cityName(p), owner: p.id, origOwner: p.id, x: u.x, y: u.y,
    pop: 1, food: 0, prod: 0, build: null, buildings: {}, focus: 'balanced',
    founded: G.turn, worked: [], specialists: 0, disorder: false, waitMsg: false, yields: null,
  };
  if (p.capital < 0 || !G.cities[p.capital]) { c.buildings.palace = true; p.capital = c.id; }
  G.cities[c.id] = c;
  G._cpos[tidx(c.x, c.y)] = c.id;
  tileAt(c.x, c.y).road = true;
  killUnit(u);
  updateTerritory();
  c.build = p.human ? { type: 'unit', key: 'warrior' } : aiChooseBuild(c);
  refreshCity(c);
  addMsg(p.id, c.name + ' has been founded.', '#ffd27a', c.x, c.y);
  if (isHuman(p.id)) updateVisibility();
  return c;
}

function cityRadius(c) { return c.pop >= 8 ? RAD_BIG : RAD_SMALL; }

function updateTerritory() {
  var tiles = G.tiles, n = tiles.length, best = new Float32Array(n);
  for (var i = 0; i < n; i++) { tiles[i].owner = -1; tiles[i].city = -1; best[i] = 99; }
  var ids = Object.keys(G.cities).map(Number).sort(function (a, b) { return a - b; });
  ids.forEach(function (id) {
    var c = G.cities[id];
    cityRadius(c).forEach(function (o) {
      var x = c.x + o[0], y = c.y + o[1];
      if (!inb(x, y)) return;
      var k = y * G.w + x;
      if (o[2] < best[k]) { best[k] = o[2]; tiles[k].owner = c.owner; tiles[k].city = c.id; }
    });
  });
}

function cityTiles(c) {
  var out = [];
  cityRadius(c).forEach(function (o) {
    var x = c.x + o[0], y = c.y + o[1];
    if (!inb(x, y) || (o[0] === 0 && o[1] === 0)) return;
    var t = G.tiles[y * G.w + x];
    if (t.city === c.id) out.push(y * G.w + x);
  });
  return out;
}

function tileYield(t, city) {
  var T = TERRAIN[t.t], f = T.food, p = T.prod, g = T.gold;
  if (t.res) { var R = RESOURCES[t.res]; f += R.food || 0; p += R.prod || 0; g += R.gold || 0; }
  switch (t.imp) {
    case 'farm': f += 1; break;
    case 'mine': p += t.t === 'hills' ? 2 : 1; break;
    case 'lumber': p += 1; break;
    case 'quarry': p += 1; break;
    case 'pasture': p += 1; break;
  }
  if (T.water && city) {
    if (city.buildings.harbor) f += 1;
    if (city.buildings.colossus) g += 1;
  }
  return { f: f, p: p, g: g };
}

function centerYield(c) {
  var y = tileYield(tileAt(c.x, c.y), c);
  return { f: Math.max(y.f + 1, 2), p: Math.max(y.p + 1, 2), g: y.g + 1 };
}

var FOCUS = {
  balanced:   { f: 1.4, p: 1.4, g: 0.8, name: 'Balanced' },
  food:       { f: 2.6, p: 0.6, g: 0.4, name: 'Food' },
  production: { f: 0.9, p: 2.4, g: 0.5, name: 'Production' },
  gold:       { f: 0.9, p: 0.6, g: 2.2, name: 'Gold' },
};

function enemyOnTile(k, owner) {
  var us = G._upos[k];
  return us && G.units[us[0]].owner !== owner && atWar(owner, G.units[us[0]].owner);
}

function assignTiles(c) {
  c.worked.forEach(function (k) { if (G.tiles[k].worked === c.id) G.tiles[k].worked = -1; });
  c.worked = [];
  var fw = FOCUS[c.focus] || FOCUS.balanced;
  var cands = cityTiles(c).filter(function (k) {
    return G.tiles[k].worked < 0 && !enemyOnTile(k, c.owner);
  }).map(function (k) { return { k: k, y: tileYield(G.tiles[k], c) }; });
  var cy = centerYield(c), food = cy.f, need = c.pop * 2;
  for (var n = 0; n < c.pop && cands.length; n++) {
    var wf = fw.f + (food < need + 1 ? 3 : 0);
    var bi = -1, bs = -1;
    for (var i = 0; i < cands.length; i++) {
      var y = cands[i].y, s = y.f * wf + y.p * fw.p + y.g * fw.g;
      if (s > bs) { bs = s; bi = i; }
    }
    if (bs <= 0.5) break;
    var pick = cands.splice(bi, 1)[0];
    food += pick.y.f;
    G.tiles[pick.k].worked = c.id;
    c.worked.push(pick.k);
  }
  c.specialists = c.pop - c.worked.length;
}

// Assign citizens, then turn workers into entertainers until the city is out of disorder.
function refreshCity(c) {
  assignTiles(c);
  var y = cityYields(c), guard = 0;
  while (y.disorder && c.worked.length && guard++ < 40) {
    var wi = 0, ws = 1e9;
    c.worked.forEach(function (k, i) {
      var ty = tileYield(G.tiles[k], c), s = ty.f + ty.p + ty.g;
      if (s < ws) { ws = s; wi = i; }
    });
    G.tiles[c.worked[wi]].worked = -1;
    c.worked.splice(wi, 1);
    c.specialists++;
    y = cityYields(c);
  }
  c.yields = y;
  return y;
}

function cityGarrison(c) {
  return unitsAt(c.x, c.y).filter(function (u) { return u.owner === c.owner && isMilitary(u); }).length;
}

function housingCap(c) {
  var h = 8;
  for (var b in c.buildings) { var d = bdef(b); if (d && d.fx && d.fx.housing) h += d.fx.housing; }
  return h;
}

function growThreshold(c) {
  var p = G.players[c.owner];
  var t = 14 + c.pop * 8;
  return Math.round(t / aiMul(p));
}

function edictOn(p, k) { return p.human && !!p.edicts[k]; }

function approvalHappy(p) {
  if (!p.human) return 0;
  var a = p.approval;
  return a >= 85 ? 2 : a >= 70 ? 1 : a < 20 ? -2 : a < 35 ? -1 : 0;
}

// Full economic breakdown of a city. Used for processing turns and for the city screen.
function cityYields(c) {
  var p = G.players[c.owner];
  var cy = centerYield(c), f = cy.f, pr = cy.p, com = cy.g;
  c.worked.forEach(function (k) {
    var y = tileYield(G.tiles[k], c);
    f += y.f; pr += y.p; com += y.g;
  });
  com += c.pop + c.specialists;
  if (c.buildings.palace) com += 3;
  if (edictOn(p, 'agrarian')) f += 1;

  var prodPct = 0, goldPct = 0, sciPct = 0, happyB = 0;
  for (var b in c.buildings) {
    var d = bdef(b);
    if (!d || !d.fx) continue;
    prodPct += d.fx.prodPct || 0; goldPct += d.fx.goldPct || 0; sciPct += d.fx.sciPct || 0; happyB += d.fx.happy || 0;
  }
  var cs = playerCities(p.id);
  var gHappy = 0, gProd = 0, gSci = 0, gGold = 0;
  cs.forEach(function (oc) {
    for (var b in oc.buildings) {
      var w = WONDERS[b];
      if (!w || !w.gfx) continue;
      gHappy += w.gfx.happy || 0; gProd += w.gfx.prodPct || 0; gSci += w.gfx.sciPct || 0; gGold += w.gfx.goldPct || 0;
      if (w.gfx.approval && !p.human) gHappy += 1;
    }
  });
  prodPct += gProd; sciPct += gSci; goldPct += gGold;
  if (edictOn(p, 'workethic')) prodPct += 15;
  if (edictOn(p, 'freemarket')) goldPct += 20;
  if (edictOn(p, 'literacy')) sciPct += 20;

  var mul = aiMul(p);
  var prod = Math.floor(pr * (1 + prodPct / 100) * mul);
  com = com * mul;
  var taxShare = p.human ? TAX_RATES[p.tax].gold : 0.5;
  var gold = Math.floor(com * taxShare * (1 + goldPct / 100));
  var sci = Math.max(1, Math.floor(com * (1 - taxShare) * (1 + sciPct / 100)));

  // Happiness (Caesar / Tropico flavour).
  var content = p.human ? diff().content : (mul > 1 ? 5 : 4);
  var empire = Math.floor(cs.length / 6);
  var unhappy = Math.max(0, c.pop - content) + empire;
  var lux = p.lux + Math.floor(p.foodTypes / 2);
  var garrison = cityGarrison(c);
  var happy = happyB + gHappy + lux + approvalHappy(p) + c.specialists;
  if (edictOn(p, 'martial')) happy += Math.min(3, garrison);
  if (edictOn(p, 'festivals')) happy += 1;
  if (edictOn(p, 'statereligion') && c.buildings.temple) happy += 1;
  if (edictOn(p, 'workethic')) happy -= 1;
  if (p.warWeary > 0) unhappy += Math.min(2, Math.floor(p.warWeary / 10));
  var mood = happy - unhappy;
  var disorder = mood < 0;
  if (disorder) { prod = 0; gold = 0; sci = 0; }
  return {
    food: f, foodNeed: c.pop * 2, surplus: f - c.pop * 2, prod: prod, rawProd: pr, commerce: Math.floor(com),
    gold: gold, sci: sci, happy: happy, unhappy: unhappy, content: content, mood: mood, disorder: disorder,
    housing: housingCap(c), garrison: garrison, lux: lux, empire: empire,
  };
}

// ---------------------------------------------------------------- production

function buildDef(item) {
  if (!item) return null;
  if (item.type === 'unit') return UNITS[item.key];
  if (item.type === 'building') return BUILDINGS[item.key];
  if (item.type === 'wonder') return WONDERS[item.key];
  if (item.type === 'project') return PROJECTS[item.key];
  return null;
}

function buildName(item) {
  if (!item) return 'Nothing';
  if (item.type === 'wealth') return 'Trade Goods';
  return buildDef(item).name;
}

function buildCost(c, item) {
  if (!item || item.type === 'wealth') return 0;
  var cost = buildDef(item).cost;
  var p = G.players[c.owner];
  if (item.type === 'unit' && !UNITS[item.key].civilian && edictOn(p, 'conscription')) cost = Math.round(cost * 0.75);
  return cost;
}

function isCoastal(c) {
  for (var d = 0; d < 8; d++) {
    var t = tileAt(c.x + DIRS8[d][0], c.y + DIRS8[d][1]);
    if (t && isWater(t)) return true;
  }
  return false;
}

function canBuild(c, item) {
  var p = G.players[c.owner];
  if (item.type === 'wealth') return true;
  var d = buildDef(item);
  if (!d || d.noBuild) return false;
  if (!hasTech(p, d.tech)) return false;
  if (item.type === 'unit') return true;
  if (item.type === 'project') return !c.buildings[item.key] && !G.colony[p.id];
  if (c.buildings[item.key]) return false;
  if (d.req && !c.buildings[d.req]) return false;
  if (d.coastal && !isCoastal(c)) return false;
  if (item.type === 'wonder' && G.wonders[item.key] !== undefined) return false;
  return true;
}

function buildOptions(c) {
  var p = G.players[c.owner], out = [];
  Object.keys(UNITS).forEach(function (k) {
    var item = { type: 'unit', key: k };
    if (!canBuild(c, item)) return;
    var obs = UNITS[k].obs;
    if (obs && hasTech(p, UNITS[obs].tech)) return;
    out.push(item);
  });
  Object.keys(BUILDINGS).forEach(function (k) { var it = { type: 'building', key: k }; if (canBuild(c, it)) out.push(it); });
  Object.keys(WONDERS).forEach(function (k) { var it = { type: 'wonder', key: k }; if (canBuild(c, it)) out.push(it); });
  Object.keys(PROJECTS).forEach(function (k) { var it = { type: 'project', key: k }; if (canBuild(c, it)) out.push(it); });
  out.push({ type: 'wealth', key: 'wealth' });
  return out;
}

function hasGoods(p, goods) {
  if (!goods) return true;
  for (var g in goods) if ((p.goods[g] || 0) < goods[g]) return false;
  return true;
}

// Goods market: buy at the listed price, sell at half.
function tradeGoods(p, good, n) {
  var price = GOODS[good].price;
  if (n > 0) {
    var cost = price * n;
    if (p.gold < cost) return false;
    p.gold -= cost;
    p.goods[good] += n;
  } else {
    n = -n;
    if (p.goods[good] < n) return false;
    p.goods[good] -= n;
    p.gold += Math.floor(price / 2) * n;
  }
  return true;
}

function goodsText(goods) {
  if (!goods) return '';
  return Object.keys(goods).map(function (g) { return goods[g] + GOODS[g].icon; }).join(' ');
}

function buyCost(c) {
  var item = c.build;
  if (!item || item.type === 'wealth' || item.type === 'project') return 0;
  var left = Math.max(0, buildCost(c, item) - c.prod);
  if (left <= 0) return 0;
  var cost = Math.round(2 * left + left * left / 20);
  if (item.type === 'wonder') cost *= 2;
  if (c.prod === 0) cost *= 2;
  return cost;
}

function buyItem(c) {
  var p = G.players[c.owner], cost = buyCost(c);
  if (!cost || p.gold < cost) return false;
  p.gold -= cost;
  c.prod = buildCost(c, c.build);
  return true;
}

function setBuild(c, item) {
  c.build = item;
  c.waitMsg = false;
}

function completeBuild(c, p) {
  var item = c.build, d = buildDef(item);
  if (item.type === 'unit') {
    var vet = !UNITS[item.key].civilian && !!c.buildings.barracks;
    if (UNITS[item.key].settler) c.pop--;
    createUnit(p.id, item.key, c.x, c.y, vet);
    addMsg(p.id, c.name + ' trained a ' + d.name + '.', '#cfe6ff', c.x, c.y);
    c.build = p.human ? null : aiChooseBuild(c);
  } else if (item.type === 'building') {
    c.buildings[item.key] = true;
    addMsg(p.id, c.name + ' built a ' + d.name + '.', '#cfe6ff', c.x, c.y);
    c.build = p.human ? null : aiChooseBuild(c);
  } else if (item.type === 'wonder') {
    c.buildings[item.key] = true;
    G.wonders[item.key] = c.id;
    var msg = 'The ' + p.adj + ' have completed the ' + d.name + ' in ' + c.name + '!';
    G.players.forEach(function (o) { if (o.id === p.id) addMsg(o.id, c.name + ' completed the ' + d.name + '!', '#ffd27a', c.x, c.y); else addMsg(o.id, msg, '#ffd27a'); });
    // Everyone else racing for it loses the target (production is kept).
    for (var id in G.cities) {
      var oc = G.cities[id];
      if (oc !== c && oc.build && oc.build.type === 'wonder' && oc.build.key === item.key) {
        addMsg(oc.owner, oc.name + ' can no longer build the ' + d.name + '.', '#ff8a7a', oc.x, oc.y);
        oc.build = G.players[oc.owner].human ? null : aiChooseBuild(oc);
      }
    }
    c.build = p.human ? null : aiChooseBuild(c);
  } else if (item.type === 'project') {
    G.colony[p.id] = true;
    declareWinner(p, 'science');
  }
  if (c.build && !canBuild(c, c.build)) c.build = p.human ? null : aiChooseBuild(c);
}

function processProduction(c, p, prod) {
  if (!c.build) { c.prod += prod; return; }
  if (c.build.type === 'wealth') { p.gold += Math.floor(prod / 2); return; }
  if (!canBuild(c, c.build)) { c.build = p.human ? null : aiChooseBuild(c); c.prod += prod; return; }
  var cost = buildCost(c, c.build);
  c.prod += prod;
  if (c.prod < cost) return;
  var d = buildDef(c.build);
  if (!hasGoods(p, d.goods)) {
    c.prod = cost;
    if (!c.waitMsg) addMsg(p.id, c.name + ' is waiting for ' + goodsText(d.goods) + ' to finish the ' + d.name + '.', '#ffb070', c.x, c.y);
    c.waitMsg = true;
    if (!p.human && Math.random() < 0.3) c.build = aiChooseBuild(c, true);
    return;
  }
  if (c.build.type === 'unit' && UNITS[c.build.key].settler && c.pop < 2) {
    c.prod = cost;
    if (!c.waitMsg) addMsg(p.id, c.name + ' must grow to size 2 to complete the Settler.', '#ffb070', c.x, c.y);
    c.waitMsg = true;
    return;
  }
  for (var g in d.goods) p.goods[g] -= d.goods[g];
  c.prod = Math.min(c.prod - cost, Math.floor(cost / 2));
  c.waitMsg = false;
  completeBuild(c, p);
}

// ---------------------------------------------------------------- capture / elimination

function captureCity(c, newOwner, byUnit) {
  var old = G.players[c.owner], np = G.players[newOwner];
  captureCivilians(c.x, c.y, byUnit);
  if (c.pop <= 1) {
    addMsg(old.id, c.name + ' has been destroyed by the ' + np.name + '!', '#ff5a4a', c.x, c.y);
    addMsg(np.id, 'You razed ' + c.name + '.', '#ffd27a', c.x, c.y);
    destroyCity(c);
  } else {
    c.pop--;
    c.owner = newOwner;
    c.prod = 0;
    c.food = 0;
    var kept = {};
    for (var b in c.buildings) {
      if (b === 'palace') continue;
      if (WONDERS[b] || Math.random() < 0.6) kept[b] = true;
    }
    c.buildings = kept;
    c.build = np.human ? null : aiChooseBuild(c);
    addMsg(old.id, c.name + ' has been captured by the ' + np.name + '!', '#ff5a4a', c.x, c.y);
    addMsg(np.id, 'You captured ' + c.name + '!', '#9fe870', c.x, c.y);
    if (!np.human && G.human >= 0 && old.id !== G.human) addMsg(G.human, 'The ' + np.name + ' captured ' + c.name + ' from the ' + old.name + '.', '#e8e0c8');
  }
  old.lostCities++;
  np.wins += 3;
  if (old.capital === c.id) {
    old.capital = -1;
    var rest = playerCities(old.id).sort(function (a, b) { return b.pop - a.pop; });
    if (rest.length) { rest[0].buildings.palace = true; old.capital = rest[0].id; }
  }
  if (np.capital < 0 || !G.cities[np.capital]) { if (G.cities[c.id]) { c.buildings.palace = true; np.capital = c.id; } }
  updateTerritory();
  checkElimination(old);
}

function destroyCity(c) {
  G.tiles.forEach(function (t) { if (t.worked === c.id) t.worked = -1; });
  delete G._cpos[tidx(c.x, c.y)];
  delete G.cities[c.id];
  updateTerritory();
}

function checkElimination(p) {
  if (!p.alive || p.barbarian) return;
  if (playerCities(p.id).length) return;
  var settlers = playerUnits(p.id).filter(function (u) { return UNITS[u.type].settler; });
  if (settlers.length) return;
  p.alive = false;
  playerUnits(p.id).forEach(killUnit);
  G.players.forEach(function (o) {
    if (o.id !== p.id) addMsg(o.id, 'The ' + p.name + ' civilization has been destroyed!', '#ffd27a');
  });
  if (p.human) addMsg(p.id, 'Your civilization has fallen.', '#ff5a4a');
}

// ---------------------------------------------------------------- diplomacy

function checkContact(a, b) {
  if (a === b || G.players[a].barbarian || G.players[b].barbarian) return;
  if (G.diplo[a][b].met) return;
  G.diplo[a][b].met = G.diplo[b][a].met = true;
  var other = isHuman(a) ? G.players[b] : isHuman(b) ? G.players[a] : null;
  if (other) {
    addMsg(G.human, 'You have made contact with the ' + other.name + ', led by ' + other.leader + '.', '#ffd27a');
    queueEvent({ key: 'notice', params: { title: 'First Contact', text: other.leader + ' of the ' + other.name + ' greets you.\n"' + pickRandom(['May our peoples prosper side by side.', 'We are watching you closely, stranger.', 'Our borders are open to traders, not to soldiers.', 'The world is large enough for both of us... for now.']) + '"', civ: other.id } });
  }
}

function declareWar(a, b) {
  if (atWar(a, b)) return;
  G.diplo[a][b].war = G.diplo[b][a].war = true;
  G.diplo[a][b].since = G.diplo[b][a].since = G.turn;
  var A = G.players[a], B = G.players[b];
  if (isHuman(b)) {
    addMsg(b, 'The ' + A.name + ' have declared war on you!', '#ff5a4a');
    queueEvent({ key: 'notice', params: { title: 'War!', text: A.leader + ' of the ' + A.name + ' has declared war on you!', civ: a } });
  } else if (isHuman(a)) {
    addMsg(a, 'You declared war on the ' + B.name + '.', '#ff8a7a');
  } else if (G.human >= 0 && G.diplo[G.human][a].met) {
    addMsg(G.human, 'The ' + A.name + ' declared war on the ' + B.name + '.', '#e8e0c8');
  }
  // Units inside the other side's cities are expelled to keep things simple.
  hook('changed', 'diplo');
}

function makePeace(a, b) {
  if (!G.diplo[a][b].war) return;
  G.diplo[a][b].war = G.diplo[b][a].war = false;
  G.diplo[a][b].since = G.diplo[b][a].since = G.turn;
  if (isHuman(a) || isHuman(b)) {
    var o = G.players[isHuman(a) ? b : a];
    addMsg(G.human, 'Peace has been signed with the ' + o.name + '.', '#9fe870');
  } else if (G.human >= 0 && G.diplo[G.human][a].met) {
    addMsg(G.human, 'The ' + G.players[a].name + ' and the ' + G.players[b].name + ' have made peace.', '#e8e0c8');
  }
  hook('changed', 'diplo');
}

function militaryStrength(pid) {
  var s = 0;
  for (var id in G.units) {
    var u = G.units[id];
    if (u.owner !== pid || !isMilitary(u)) continue;
    var U = UNITS[u.type];
    s += (U.atk + U.def) * (u.hp / 10) * (u.vet ? 1.3 : 1);
  }
  return s;
}

// AI answer to a peace proposal from `from`.
function aiAcceptsPeace(ai, from) {
  var d = G.diplo[ai][from];
  var turns = G.turn - d.since;
  if (turns < 6) return false;
  var mine = militaryStrength(ai), theirs = militaryStrength(from);
  var P = G.players[ai];
  var chance = 0.25 + (theirs > mine ? 0.35 : 0) + Math.min(0.3, P.lostCities * 0.1) - (P.aggression - 1) * 0.3;
  if (turns > 30) chance += 0.2;
  return Math.random() < chance;
}

// ---------------------------------------------------------------- per-player economy

function updateConnected(p) {
  var lux = {}, food = {}, income = { wood: 0, stone: 0, iron: 0, horses: 0 };
  var tiles = G.tiles;
  for (var i = 0; i < tiles.length; i++) {
    var t = tiles[i];
    if (t.owner !== p.id) continue;
    if (t.imp === 'lumber') income.wood += 1;
    if (t.imp === 'quarry') income.stone += 1;
    if (t.imp === 'mine' && t.t === 'hills' && !t.res) income.iron += 1;
    if (!t.res) continue;
    var R = RESOURCES[t.res];
    var connected = R.imp === null || t.imp === R.imp;
    if (!connected) continue;
    if (R.kind === 'luxury') lux[t.res] = true;
    if (R.kind === 'food') food[t.res] = true;
    if (R.good) income[R.good] += R.amount;
  }
  playerCities(p.id).forEach(function (c) {
    income.wood += 1;
    for (var b in c.buildings) {
      var d = BUILDINGS[b];
      if (d && d.fx.wood) income.wood += d.fx.wood;
      if (d && d.fx.iron) income.iron += d.fx.iron;
    }
  });
  var mul = aiMul(p);
  for (var g in income) income[g] = Math.floor(income[g] * mul + (mul > 1 && income[g] > 0 ? 0.5 : 0));
  p.lux = Object.keys(lux).length;
  p.luxNames = Object.keys(lux);
  p.foodTypes = Object.keys(food).length;
  p.goodsIncome = income;
}

function techCost(p, key) {
  var base = TECHS[key].cost * ({ small: 0.9, medium: 1.1, large: 1.35, huge: 1.6 }[G.settings.size] || 1);
  var knowers = 0;
  G.players.forEach(function (o) { if (o.id !== p.id && o.alive && !o.barbarian && o.techs[key]) knowers++; });
  return Math.round(base * (1 - Math.min(0.3, knowers * 0.08)));
}

function canResearch(p, key) {
  if (p.techs[key]) return false;
  return TECHS[key].req.every(function (r) { return p.techs[r]; });
}

// Next researchable step on the way to p.techGoal (cheapest missing prerequisite first).
function nextTowardGoal(p) {
  var goal = p.techGoal;
  if (!goal || p.techs[goal]) { p.techGoal = null; return null; }
  var best = null;
  (function walk(k) {
    if (p.techs[k]) return;
    if (canResearch(p, k)) { if (!best || TECHS[k].cost < TECHS[best].cost) best = k; return; }
    TECHS[k].req.forEach(walk);
  })(goal);
  return best;
}

function learnTech(p, key) {
  p.techs[key] = true;
  p.numTechs++;
  addMsg(p.id, 'Your scholars have discovered ' + TECHS[key].name + '!', '#9fd8ff');
  if (p.human) hook('techLearned', p, key);
}

function unitUpkeep(p) {
  var units = playerUnits(p.id).filter(function (u) { return !UNITS[u.type].settler; }).length;
  var free = 3 + playerCities(p.id).length * 2;
  return Math.max(0, units - free);
}

function buildingUpkeep(p) {
  var s = 0;
  playerCities(p.id).forEach(function (c) { for (var b in c.buildings) { var d = BUILDINGS[b]; if (d) s += d.upkeep || 0; } });
  return Math.floor(s * 0.6);
}

// Current per-turn gold and science, recomputed from the cities (the stored p.income is last turn's).
function estimateIncome(p) {
  var gold = 0, sci = 0;
  playerCities(p.id).forEach(function (c) {
    var y = c.yields || cityYields(c);
    gold += y.gold; sci += y.sci;
  });
  var upkeep = buildingUpkeep(p) + unitUpkeep(p) + edictCost(p);
  return { gold: gold, upkeep: upkeep, net: gold - upkeep, sci: sci };
}

function edictCost(p) {
  if (!p.human) return 0;
  var n = playerCities(p.id).length, s = 0;
  for (var k in p.edicts) {
    if (!p.edicts[k]) continue;
    s += (EDICTS[k].cost || 0) + (EDICTS[k].costPerCity || 0) * n;
  }
  return s;
}

// Tropico-style faction approval. Returns target values and the reasons behind them.
function factionTargets(p) {
  var cs = playerCities(p.id), n = Math.max(1, cs.length);
  var mil = playerUnits(p.id).filter(isMilitary).length;
  var out = {};
  Object.keys(FACTIONS).forEach(function (f) { out[f] = { v: 50, why: [] }; });
  function add(f, v, why) { if (!v) return; v = Math.round(v); out[f].v += v; out[f].why.push((v > 0 ? '+' : '') + v + ' ' + why); }

  add('military', clamp((mil / n - 1) * 8, -15, 15), 'army size');
  add('military', clamp(p.wins - p.losses, -15, 15), 'battles won/lost');
  var atWarCount = 0;
  G.players.forEach(function (o) { if (o.id !== p.id && !o.barbarian && o.alive && G.diplo[p.id][o.id].war) atWarCount++; });
  if (atWarCount) add('peasants', -5 * atWarCount, 'war');

  var temples = cs.filter(function (c) { return c.buildings.temple; }).length;
  var cath = cs.filter(function (c) { return c.buildings.cathedral; }).length;
  add('clergy', 15 * temples / n + 10 * cath / n - 10, 'temples & cathedrals');
  if (hasGlobal(p, 'happy') && cs.some(function (c) { return c.buildings.chapel; })) add('clergy', 10, "Michelangelo's Chapel");

  var markets = cs.filter(function (c) { return c.buildings.marketplace; }).length;
  add('merchants', 12 * markets / n - 6, 'marketplaces');
  add('merchants', p.gold < 0 ? -15 : clamp(p.gold / 40, 0, 10), 'treasury');

  var mood = 0, food = 0;
  cs.forEach(function (c) { if (c.yields) { mood += c.yields.mood; food += c.yields.surplus; } });
  add('peasants', clamp(mood / n * 4, -20, 15), 'city happiness');
  add('peasants', clamp(food / n * 2, -10, 8), 'food supply');

  var tx = TAX_RATES[p.tax].fx;
  for (var f in tx) add(f, tx[f], TAX_RATES[p.tax].name.toLowerCase() + ' taxes');
  for (var k in p.edicts) {
    if (!p.edicts[k]) continue;
    var fx = EDICTS[k].fx;
    for (f in fx) add(f, fx[f], EDICTS[k].name);
  }
  p.factionMods.forEach(function (m) { add(m.f, m.v, m.why); });
  var lib = hasGlobal(p, 'approval');
  if (lib) Object.keys(FACTIONS).forEach(function (f) { add(f, lib, 'Statue of Liberty'); });
  Object.keys(out).forEach(function (f) { out[f].v = clamp(out[f].v, 0, 100); });
  return out;
}

function updateApproval(p) {
  var t = factionTargets(p), sum = 0;
  Object.keys(FACTIONS).forEach(function (f) {
    p.factions[f] += (t[f].v - p.factions[f]) * 0.25;
    p.factions[f] = clamp(p.factions[f], 0, 100);
    sum += p.factions[f];
  });
  p.approval = sum / 4;
  p.factionMods = p.factionMods.filter(function (m) { return --m.turns > 0; });
  if (p.approval < 25 && G.turn > 20 && Math.random() < 0.15) spawnRebels(p);
  else if (p.approval < 32 && G.turn % 5 === 0) addMsg(p.id, 'Approval of your rule is dangerously low (' + Math.round(p.approval) + '%). Rebels may rise.', '#ffb070');
}

function endOfTurnPlayer(p) {
  if (!p.alive || p.barbarian) return;
  updateConnected(p);
  var cs = playerCities(p.id);
  var gold = 0, sci = 0;
  cs.forEach(function (c) {
    c.worked.forEach(function (k) { if (G.tiles[k].worked === c.id) G.tiles[k].worked = -1; });
    c.worked = [];
  });
  cs.forEach(function (c) {
    var y = refreshCity(c);
    if (y.disorder) addMsg(p.id, 'Civil disorder in ' + c.name + '! Production halted.', '#ff8a7a', c.x, c.y);
    // Food and growth.
    c.food += y.surplus;
    var need = growThreshold(c);
    if (c.food >= need) {
      if (c.pop < y.housing) {
        c.pop++;
        c.food = c.buildings.granary ? Math.floor(need / 2) : 0;
        if (c.pop === 8) updateTerritory();
      } else {
        c.food = need;
        if (G.turn % 10 === 0) addMsg(p.id, c.name + ' needs more housing to grow (' + (c.buildings.aqueduct ? 'Sewer System' : 'Aqueduct') + ').', '#ffb070', c.x, c.y);
      }
    } else if (c.food < 0) {
      if (c.pop > 1) { c.pop--; addMsg(p.id, 'Famine in ' + c.name + '! The city shrinks.', '#ff8a7a', c.x, c.y); }
      c.food = 0;
    }
    processProduction(c, p, y.prod);
    gold += y.gold;
    sci += y.sci;
  });
  if (G.over) return;
  for (var g in p.goodsIncome) p.goods[g] += p.goodsIncome[g];
  var upkeep = buildingUpkeep(p) + unitUpkeep(p) + edictCost(p);
  p.income = { gold: gold, upkeep: upkeep, net: gold - upkeep, sci: sci };
  p.gold += gold - upkeep;
  if (p.gold < 0) sellSomething(p);

  // Research.
  if (!p.research || p.techs[p.research]) p.research = p.human ? nextTowardGoal(p) : aiChooseResearch(p);
  p.sci += sci;
  var guard = 0;
  while (p.research && p.sci >= techCost(p, p.research) && guard++ < 5) {
    p.sci -= techCost(p, p.research);
    var k = p.research;
    p.research = null;
    learnTech(p, k);
    p.research = p.human ? nextTowardGoal(p) : aiChooseResearch(p);
  }

  // Units: heal, work, reset.
  playerUnits(p.id).forEach(function (u) {
    var t = tileAt(u.x, u.y);
    if (u.hp < 10) {
      var h = cityAt(u.x, u.y) ? 3 : t.owner === p.id ? 2 : 1;
      if (u.fort || u.moves === UNITS[u.type].moves * 3) h += 1;
      u.hp = Math.min(10, u.hp + h);
    }
    if (u.order === 'build' && u.job) {
      u.job.left--;
      if (u.job.left <= 0) {
        if (u.job.imp === 'road') t.road = true;
        else t.imp = u.job.imp;
        u.order = null; u.job = null;
        hook('changed', 'tiles');
      }
    }
    if (u.order === 'fortify' && isMilitary(u)) u.fort = true;
    u.moves = UNITS[u.type].moves * 3;
  });
  p.warWeary = Math.max(0, p.warWeary - 1);
  if (p.human) updateApproval(p);
}

function sellSomething(p) {
  var best = null, bc = null;
  playerCities(p.id).forEach(function (c) {
    for (var b in c.buildings) {
      var d = BUILDINGS[b];
      if (d && d.upkeep && (!best || d.upkeep > BUILDINGS[best].upkeep)) { best = b; bc = c; }
    }
  });
  if (best) {
    delete bc.buildings[best];
    p.gold += Math.floor(BUILDINGS[best].cost / 3);
    addMsg(p.id, 'Bankrupt! The ' + BUILDINGS[best].name + ' in ' + bc.name + ' was sold.', '#ff5a4a', bc.x, bc.y);
  } else {
    var u = playerUnits(p.id).filter(isMilitary)[0];
    if (u) { killUnit(u); addMsg(p.id, 'Bankrupt! A ' + UNITS[u.type].name + ' deserted.', '#ff5a4a'); }
  }
  if (p.gold < 0) p.gold = 0;
}

// ---------------------------------------------------------------- workers

function canBuildImp(u, imp) {
  var t = tileAt(u.x, u.y), p = G.players[u.owner], I = IMPROVEMENTS[imp];
  if (!UNITS[u.type].worker || isWater(t) || !hasTech(p, I.tech)) return false;
  if (cityAt(u.x, u.y)) return false;
  if (imp === 'road') return !t.road;
  if (t.imp === imp) return false;
  var R = t.res ? RESOURCES[t.res] : null;
  if (R && R.imp === imp) return true;
  if (imp === 'pasture') return false;
  if (imp === 'mine' && R && R.imp === 'mine') return true;
  return I.on.indexOf(t.t) >= 0;
}

function startJob(u, imp) {
  if (!canBuildImp(u, imp)) return false;
  var turns = IMPROVEMENTS[imp].turns;
  var t = tileAt(u.x, u.y);
  if (t.t === 'forest' || t.t === 'hills' || t.t === 'mountains') turns += 1;
  u.order = 'build';
  u.job = { imp: imp, left: turns };
  u.moves = 0;
  u.path = null;
  return true;
}

// ---------------------------------------------------------------- barbarians, rebels, events

function barbarianTier() {
  var m = 0;
  G.players.forEach(function (p) { if (p.alive && !p.barbarian) m = Math.max(m, p.numTechs); });
  return m;
}

function barbUnitType() {
  var n = barbarianTier();
  if (n < 6) return pickRandom(['warrior', 'warrior', 'archer']);
  if (n < 14) return pickRandom(['archer', 'horseman', 'swordsman']);
  if (n < 22) return pickRandom(['swordsman', 'knight', 'pikeman']);
  return pickRandom(['musketman', 'cavalry']);
}

function spawnBarbarians() {
  if (G.turn < 15) return;
  var barb = G.players[G.players.length - 1];
  var count = playerUnits(barb.id).length;
  var cities = Object.keys(G.cities).length;
  if (count > 3 + cities / 3) return;
  if (Math.random() > 0.08 * (G.w * G.h) / 2800) return;
  for (var tries = 0; tries < 40; tries++) {
    var x = rnd(G.w), y = rnd(G.h), t = tileAt(x, y);
    if (isWater(t) || t.owner >= 0 || t.visible || TERRAIN[t.t].noCity) continue;
    var near = false;
    for (var id in G.units) if (dist(G.units[id].x, G.units[id].y, x, y) < 4) { near = true; break; }
    for (id in G.cities) if (dist(G.cities[id].x, G.cities[id].y, x, y) < 6) { near = true; break; }
    if (near) continue;
    var n = 1 + (G.turn > 80 ? rnd(2) : 0);
    for (var i = 0; i < n; i++) createUnit(barb.id, barbUnitType(), x, y);
    return;
  }
}

function spawnRebels(p) {
  var cs = playerCities(p.id);
  if (!cs.length) return;
  var c = pickRandom(cs), barb = G.players[G.players.length - 1];
  var spots = [];
  RAD_SMALL.forEach(function (o) {
    var x = c.x + o[0], y = c.y + o[1], t = tileAt(x, y);
    if (t && !isWater(t) && o[2] >= 2 && !unitsAt(x, y).length && !cityAt(x, y)) spots.push([x, y]);
  });
  if (!spots.length) return;
  var s = pickRandom(spots), n = 1 + rnd(2);
  for (var i = 0; i < n; i++) createUnit(barb.id, barbUnitType(), s[0], s[1]);
  addMsg(p.id, 'Rebels have taken up arms near ' + c.name + '!', '#ff5a4a', s[0], s[1]);
  queueEvent({ key: 'notice', params: { title: 'Rebellion!', text: 'Discontent with your rule has boiled over. Armed rebels have appeared near ' + c.name + '.\nRaise approval with edicts, temples, markets and full granaries.' } });
}

function randomCity(p, filter) {
  var cs = playerCities(p.id).filter(filter || function () { return true; });
  return cs.length ? pickRandom(cs) : null;
}

// Random events (human only). Each option's `apply` mutates the game.
var EVENTS = {
  notice: {
    text: function (pr) { return pr.text; }, title: function (pr) { return pr.title; },
    options: [{ label: 'OK', apply: function () {} }],
  },
  drought: {
    title: function () { return 'Drought'; },
    make: function (p) { var c = randomCity(p, function (c) { return c.food > 5; }); return c && { city: c.id }; },
    text: function (pr) { return 'A severe drought strikes the fields around ' + G.cities[pr.city].name + '.'; },
    options: [
      { label: 'Send relief (-30 gold)', can: function (p) { return p.gold >= 30; }, apply: function (p) { p.gold -= 30; p.factionMods.push({ f: 'peasants', v: 5, turns: 10, why: 'drought relief' }); } },
      { label: 'Let them cope', apply: function (p, pr) { var c = G.cities[pr.city]; if (c) c.food = 0; p.factionMods.push({ f: 'peasants', v: -10, turns: 12, why: 'ignored drought' }); } },
    ],
  },
  caravan: {
    title: function () { return 'Merchant Caravan'; },
    make: function () { return {}; },
    text: function () { return 'A caravan of foreign merchants offers 25 wood and 15 stone for 40 gold.'; },
    options: [
      { label: 'Buy the goods (-40 gold)', can: function (p) { return p.gold >= 40; }, apply: function (p) { p.gold -= 40; p.goods.wood += 25; p.goods.stone += 15; p.factionMods.push({ f: 'merchants', v: 6, turns: 10, why: 'caravan trade' }); } },
      { label: 'Send them away', apply: function () {} },
    ],
  },
  goldstrike: {
    title: function () { return 'Gold Strike!'; },
    make: function () { return { amount: 40 + rnd(40) }; },
    text: function (pr) { return 'Prospectors have struck a rich vein of gold. The treasury gains ' + pr.amount + ' gold.'; },
    options: [{ label: 'Splendid!', apply: function (p, pr) { p.gold += pr.amount; } }],
  },
  plague: {
    title: function () { return 'Plague'; },
    make: function (p) { var c = randomCity(p, function (c) { return c.pop >= 4 && !c.buildings.aqueduct; }); return c && { city: c.id }; },
    text: function (pr) { return 'Plague has broken out in crowded ' + G.cities[pr.city].name + '. An Aqueduct would have kept the water clean.'; },
    options: [
      { label: 'Hire physicians (-50 gold)', can: function (p) { return p.gold >= 50; }, apply: function (p) { p.gold -= 50; } },
      { label: 'Quarantine the city (-2 pop)', apply: function (p, pr) { var c = G.cities[pr.city]; if (c) c.pop = Math.max(1, c.pop - 2); p.factionMods.push({ f: 'peasants', v: -8, turns: 10, why: 'plague' }); } },
    ],
  },
  ceremony: {
    title: function () { return 'The Clergy Petition'; },
    make: function () { return {}; },
    text: function () { return 'The high priests demand a grand ceremony to honour the gods.'; },
    options: [
      { label: 'Hold the ceremony (-35 gold)', can: function (p) { return p.gold >= 35; }, apply: function (p) { p.gold -= 35; p.factionMods.push({ f: 'clergy', v: 15, turns: 20, why: 'grand ceremony' }); } },
      { label: 'Refuse', apply: function (p) { p.factionMods.push({ f: 'clergy', v: -12, turns: 15, why: 'refused ceremony' }); } },
    ],
  },
  parade: {
    title: function () { return 'The Generals Request'; },
    make: function () { return {}; },
    text: function () { return 'Your generals ask for a victory parade and a bonus for the troops.'; },
    options: [
      { label: 'Fund the parade (-30 gold)', can: function (p) { return p.gold >= 30; }, apply: function (p) { p.gold -= 30; p.factionMods.push({ f: 'military', v: 15, turns: 20, why: 'military parade' }); } },
      { label: 'Refuse', apply: function (p) { p.factionMods.push({ f: 'military', v: -10, turns: 15, why: 'refused parade' }); } },
    ],
  },
  strike: {
    title: function () { return 'Workers on Strike'; },
    make: function (p) { var c = randomCity(p, function (c) { return c.pop >= 3 && c.prod > 0; }); return c && { city: c.id }; },
    text: function (pr) { return 'The workers of ' + G.cities[pr.city].name + ' down their tools and demand better pay.'; },
    options: [
      { label: 'Raise wages (-35 gold)', can: function (p) { return p.gold >= 35; }, apply: function (p) { p.gold -= 35; p.factionMods.push({ f: 'peasants', v: 8, turns: 15, why: 'raised wages' }); } },
      { label: 'Break the strike', apply: function (p, pr) { var c = G.cities[pr.city]; if (c) c.prod = 0; p.factionMods.push({ f: 'peasants', v: -12, turns: 15, why: 'broke strike' }, { f: 'military', v: 5, turns: 10, why: 'broke strike' }); } },
    ],
  },
  scholar: {
    title: function () { return 'A Wandering Scholar'; },
    make: function (p) { return p.research ? {} : null; },
    text: function () { return 'A wandering scholar offers to share their knowledge with your academies.'; },
    options: [{ label: 'Welcome them', apply: function (p) { if (p.research) p.sci += Math.floor(techCost(p, p.research) * 0.5); } }],
  },
  fire: {
    title: function () { return 'Great Fire'; },
    make: function (p) {
      var c = randomCity(p, function (c) { return Object.keys(c.buildings).some(function (b) { return BUILDINGS[b] && b !== 'palace'; }); });
      if (!c) return null;
      var bs = Object.keys(c.buildings).filter(function (b) { return BUILDINGS[b] && b !== 'palace'; });
      return { city: c.id, b: pickRandom(bs) };
    },
    text: function (pr) { return 'A fire is spreading through ' + G.cities[pr.city].name + ' and threatens the ' + BUILDINGS[pr.b].name + '.'; },
    options: [
      { label: 'Pay the fire brigade (-50 gold)', can: function (p) { return p.gold >= 50; }, apply: function (p) { p.gold -= 50; } },
      { label: 'Let it burn', apply: function (p, pr) { var c = G.cities[pr.city]; if (c) delete c.buildings[pr.b]; } },
    ],
  },
  harvest: {
    title: function () { return 'Bountiful Harvest'; },
    make: function () { return {}; },
    text: function () { return 'Perfect weather has blessed the harvest. Every granary fills up.'; },
    options: [{ label: 'Wonderful', apply: function (p) { playerCities(p.id).forEach(function (c) { c.food += Math.floor(growThreshold(c) / 2); }); p.factionMods.push({ f: 'peasants', v: 6, turns: 10, why: 'good harvest' }); } }],
  },
  peaceOffer: {
    title: function () { return 'Peace Proposal'; },
    text: function (pr) { var o = G.players[pr.from]; return o.leader + ' of the ' + o.name + ' proposes an end to the war.'; },
    options: [
      { label: 'Accept peace', apply: function (p, pr) { makePeace(p.id, pr.from); } },
      { label: 'The war goes on', apply: function () {} },
    ],
  },
  tribute: {
    title: function () { return 'Demand for Tribute'; },
    text: function (pr) { var o = G.players[pr.from]; return o.leader + ' of the ' + o.name + ' demands ' + pr.amount + ' gold, or there will be war!'; },
    options: [
      { label: 'Pay tribute', can: function (p, pr) { return p.gold >= pr.amount; }, apply: function (p, pr) { p.gold -= pr.amount; G.players[pr.from].gold += pr.amount; p.factionMods.push({ f: 'military', v: -10, turns: 15, why: 'paid tribute' }); } },
      { label: 'Refuse', apply: function (p, pr) { declareWar(pr.from, p.id); } },
    ],
  },
};
var RANDOM_EVENTS = ['drought', 'caravan', 'goldstrike', 'plague', 'ceremony', 'parade', 'strike', 'scholar', 'fire', 'harvest'];

function maybeRandomEvent(p) {
  if (G.turn < 12 || Math.random() > 0.07) return;
  var key = pickRandom(RANDOM_EVENTS);
  var pr = EVENTS[key].make(p);
  if (pr) queueEvent({ key: key, params: pr });
}

function eventOptions(evt) {
  var p = humanPlayer() || G.players[0];
  return EVENTS[evt.key].options.map(function (o) {
    return { label: o.label, enabled: !o.can || o.can(p, evt.params) };
  });
}

function resolveEvent(evt, i) {
  var p = humanPlayer() || G.players[0];
  var o = EVENTS[evt.key].options[i];
  if (o.can && !o.can(p, evt.params)) o = EVENTS[evt.key].options[EVENTS[evt.key].options.length - 1];
  o.apply(p, evt.params);
  var k = G.events.indexOf(evt);
  if (k >= 0) G.events.splice(k, 1);
  hook('changed', 'all');
}

// ---------------------------------------------------------------- visibility

function updateVisibility() {
  if (G.human < 0) return;
  var h = G.human, tiles = G.tiles, i;
  for (i = 0; i < tiles.length; i++) tiles[i].visible = false;
  function reveal(cx, cy, r) {
    for (var y = cy - r; y <= cy + r; y++) for (var x = cx - r; x <= cx + r; x++) {
      if (!inb(x, y)) continue;
      var t = tiles[y * G.w + x];
      t.visible = true;
      t.explored = true;
    }
  }
  for (var id in G.units) {
    var u = G.units[id];
    if (u.owner !== h) continue;
    var r = UNITS[u.type].sight || 1;
    var t = tileAt(u.x, u.y);
    if (t.t === 'hills' || t.t === 'mountains') r++;
    reveal(u.x, u.y, r);
  }
  for (id in G.cities) {
    var c = G.cities[id];
    if (c.owner !== h) continue;
    reveal(c.x, c.y, c.pop >= 8 ? 3 : 2);
  }
  for (i = 0; i < tiles.length; i++) {
    if (tiles[i].owner === h) { tiles[i].visible = true; tiles[i].explored = true; }
  }
  // Contact with anyone we can see.
  for (id in G.units) {
    u = G.units[id];
    if (u.owner !== h && tileAt(u.x, u.y).visible) checkContact(h, u.owner);
  }
  for (id in G.cities) {
    c = G.cities[id];
    if (c.owner !== h && tileAt(c.x, c.y).visible) checkContact(h, c.owner);
  }
  hook('changed', 'fog');
}

function updateContacts() {
  for (var id in G.units) {
    var u = G.units[id];
    if (G.players[u.owner].barbarian) continue;
    for (var oy = -2; oy <= 2; oy++) for (var ox = -2; ox <= 2; ox++) {
      var t = tileAt(u.x + ox, u.y + oy);
      if (!t) continue;
      if (t.owner >= 0 && t.owner !== u.owner) checkContact(u.owner, t.owner);
      var us = G._upos[tidx(u.x + ox, u.y + oy)];
      if (us && G.units[us[0]].owner !== u.owner) checkContact(u.owner, G.units[us[0]].owner);
    }
  }
}

// ---------------------------------------------------------------- score & victory

function score(p) {
  var s = 0;
  playerCities(p.id).forEach(function (c) {
    s += 4 + c.pop * 2;
    for (var b in c.buildings) if (WONDERS[b]) s += 15;
  });
  s += p.numTechs * 3;
  if (G.colony[p.id]) s += 300;
  return s;
}

function declareWinner(p, type) {
  if (G.over) return;
  G.over = { winner: p.id, type: type, turn: G.turn };
  hook('gameOver', G.over);
}

function checkVictory() {
  if (G.over) return;
  var alive = G.players.filter(function (p) { return p.alive && !p.barbarian; });
  var hp = humanPlayer();
  if (hp && !hp.alive) {
    var best = alive.slice().sort(function (a, b) { return score(b) - score(a); })[0];
    G.over = { winner: best ? best.id : -1, type: 'defeat', turn: G.turn };
    hook('gameOver', G.over);
    return;
  }
  if (alive.length === 1) { declareWinner(alive[0], 'conquest'); return; }
  if (G.turn > (G.settings.maxTurns || MAX_TURNS)) {
    var top = alive.slice().sort(function (a, b) { return score(b) - score(a); })[0];
    declareWinner(top, 'score');
  }
}

// ---------------------------------------------------------------- turn flow

function endTurn() {
  if (G.over) return;
  G.players.forEach(function (p) {
    if (p.alive && !p.human) aiTakeTurn(p);
  });
  if (G.over) return;
  G.players.forEach(function (p) { endOfTurnPlayer(p); });
  if (G.over) return;
  // Barbarian units just reset.
  playerUnits(G.players.length - 1).forEach(function (u) { u.moves = UNITS[u.type].moves * 3; if (u.hp < 10) u.hp++; });
  updateTerritory();
  updateContacts();
  spawnBarbarians();
  G.players.forEach(checkElimination);
  var hp = humanPlayer();
  if (hp && hp.alive) maybeRandomEvent(hp);
  G.turn++;
  checkVictory();
  if (G.over) return;
  if (hp && hp.alive) startHumanTurn(hp);
  hook('changed', 'all');
}

// Carry out standing orders (go-to paths, automated workers) at the start of the human's turn.
function startHumanTurn(p) {
  playerUnits(p.id).forEach(function (u) {
    if (!G.units[u.id]) return;
    if (u.auto && UNITS[u.type].worker) aiWorker(u, p);
    else if (u.path) followPath(u);
  });
  updateVisibility();
}

// Units that still want orders this turn.
function idleUnits(pid) {
  return playerUnits(pid).filter(function (u) {
    return u.moves > 0 && !u.order && !u.path && !u.auto && !u.fort && u.skip !== G.turn;
  });
}

// ---------------------------------------------------------------- save / load

function saveGame() {
  try {
    var json = JSON.stringify(G, function (k, v) { return k.charAt(0) === '_' ? undefined : v; });
    localStorage.setItem('civ_save', json);
    return true;
  } catch (e) { return false; }
}

function hasSave() {
  try { return !!localStorage.getItem('civ_save'); } catch (e) { return false; }
}

function loadGame() {
  try {
    var s = localStorage.getItem('civ_save');
    if (!s) return false;
    G = JSON.parse(s);
    rebuildIndex();
    updateTerritory();
    updateVisibility();
    return true;
  } catch (e) { return false; }
}
