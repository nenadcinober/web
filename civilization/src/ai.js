// Computer players: city production, research, settlers, workers, armies, diplomacy and barbarians.

var TARGET_CITIES = { small: 6, medium: 8, large: 10, huge: 12 };

function enemiesOf(pid) {
  return G.players.filter(function (o) { return o.alive && o.id !== pid && atWar(pid, o.id); }).map(function (o) { return o.id; });
}

function atWarWithCiv(pid) {
  return G.players.some(function (o) { return o.alive && !o.barbarian && o.id !== pid && G.diplo[pid][o.id].war; });
}

function enemyMilitaryNear(pid, x, y, r) {
  var n = 0;
  for (var id in G.units) {
    var u = G.units[id];
    if (u.owner === pid || !isMilitary(u) || !atWar(pid, u.owner)) continue;
    if (dist(u.x, u.y, x, y) <= r) n++;
  }
  return n;
}

function nearestOwnCity(pid, x, y) {
  var best = null, bd = 1e9;
  playerCities(pid).forEach(function (c) {
    var d = dist(c.x, c.y, x, y);
    if (d < bd) { bd = d; best = c; }
  });
  return best;
}

// ---------------------------------------------------------------- production

function bestUnit(c, stat, avoidGoods) {
  var p = G.players[c.owner], best = null, bs = -1;
  Object.keys(UNITS).forEach(function (k) {
    var U = UNITS[k];
    if (U.civilian || !canBuild(c, { type: 'unit', key: k })) return;
    if (U.goods && !hasGoods(p, U.goods) && (avoidGoods || !goodsSoon(p, U.goods))) return;
    var s = stat === 'def' ? U.def * 2 + U.atk * 0.3 : U.atk * 2 + U.def * 0.3 + (U.moves - 1) * 1.5;
    if (U.siege && stat !== 'siege') s *= 0.6;
    if (stat === 'siege' && U.siege) s *= 2;
    if (s > bs) { bs = s; best = k; }
  });
  return best ? { type: 'unit', key: best } : { type: 'unit', key: 'warrior' };
}

function goodsSoon(p, goods) {
  var inc = p.goodsIncome || {};
  for (var g in goods) if ((p.goods[g] || 0) + (inc[g] || 0) * 8 < goods[g]) return false;
  return true;
}

function countWhere(list, fn) { var n = 0; list.forEach(function (x) { if (fn(x)) n++; }); return n; }

function aiChooseBuild(c, avoidGoods) {
  var p = G.players[c.owner];
  var cs = playerCities(p.id), units = playerUnits(p.id);
  var y = c.yields || cityYields(c);
  var garrison = cityGarrison(c);
  var war = atWarWithCiv(p.id);
  var threat = enemyMilitaryNear(p.id, c.x, c.y, 4);
  var mil = countWhere(units, isMilitary);
  var settlers = countWhere(units, function (u) { return UNITS[u.type].settler; });
  var building = countWhere(cs, function (oc) { return oc.build && oc.build.type === 'unit' && oc.build.key === 'settler'; });
  var workers = countWhere(units, function (u) { return UNITS[u.type].worker; });

  if (garrison === 0) return bestUnit(c, 'def', avoidGoods);
  if (threat && garrison < 3) return bestUnit(c, garrison % 2 ? 'atk' : 'def', avoidGoods);

  var want = TARGET_CITIES[G.settings.size] || 8;
  if (!p._noSites && cs.length + settlers + building < want && settlers + building < 2 && (c.pop >= 2 || y.surplus >= 2) && !war) {
    if (cs.length < 3 || Math.random() < 0.6) return { type: 'unit', key: 'settler' };
  }
  if (workers + countWhere(cs, function (oc) { return oc.build && oc.build.key === 'worker'; }) < Math.ceil(cs.length * 0.8)) return { type: 'unit', key: 'worker' };

  var milWant = cs.length * 1.3 + 1 + (war ? cs.length * 1.2 : 0) + (p.aggression > 1.1 ? cs.length * 0.5 : 0);
  if (mil < milWant && (war || Math.random() < 0.5)) {
    if (war && Math.random() < 0.25) return bestUnit(c, 'siege', avoidGoods);
    return bestUnit(c, war || p.aggression > 1 ? 'atk' : 'def', avoidGoods);
  }

  // Buildings, scored by need.
  var opts = [];
  function consider(type, key, v) {
    var item = { type: type, key: key };
    if (!canBuild(c, item)) return;
    var d = buildDef(item);
    if (d.goods && !hasGoods(p, d.goods) && (avoidGoods || !goodsSoon(p, d.goods))) return;
    opts.push({ item: item, v: v + Math.random() * 2 });
  }
  var mood = y.mood;
  consider('building', 'temple', mood <= 1 ? 9 : 3);
  consider('building', 'colosseum', mood <= 0 ? 8 : 1);
  consider('building', 'cathedral', mood <= 0 ? 7 : 1);
  consider('building', 'granary', 4);
  consider('building', 'sawmill', p.goods.wood < 30 ? 6 : 2);
  consider('building', 'library', 6);
  consider('building', 'marketplace', 5 + (mood <= 1 ? 2 : 0));
  consider('building', 'harbor', 4);
  consider('building', 'barracks', war ? 4 : 1);
  consider('building', 'walls', war || threat ? 7 : 1.5);
  consider('building', 'aqueduct', c.pop >= y.housing - 2 ? 9 : 1);
  consider('building', 'sewer', c.pop >= y.housing - 2 ? 9 : 0);
  consider('building', 'forge', 5);
  consider('building', 'university', 6);
  consider('building', 'bank', 4);
  consider('building', 'factory', 6);
  consider('building', 'powerplant', 5);
  consider('building', 'stockexchange', 3);
  consider('building', 'researchlab', 6);
  var topProd = cs.every(function (oc) { return (oc.yields ? oc.yields.prod : 0) <= y.prod; });
  Object.keys(WONDERS).forEach(function (k) { consider('wonder', k, topProd ? 5 : 1.5); });
  Object.keys(PROJECTS).forEach(function (k) { consider('project', k, topProd ? 30 : 0); });
  opts.sort(function (a, b) { return b.v - a.v; });
  if (opts.length && opts[0].v > 2.5) return opts[0].item;
  if (mil < milWant + cs.length) return bestUnit(c, Math.random() < 0.5 ? 'atk' : 'def', avoidGoods);
  if (opts.length) return opts[0].item;
  return { type: 'wealth', key: 'wealth' };
}

// ---------------------------------------------------------------- research

var AI_TECH_BIAS = { bronze: 3, pottery: 2, writing: 3, currency: 2, monarchy: 2, masonry: 1.5, ironworking: 1.5, philosophy: 2, university: 2, gunpowder: 2, sanitation: 1.5, industrialization: 2, spaceflight: 3, rocketry: 2, computers: 2 };

function aiChooseResearch(p) {
  var opts = Object.keys(TECHS).filter(function (k) { return canResearch(p, k); });
  if (!opts.length) return null;
  var best = null, bs = -1;
  opts.forEach(function (k) {
    var s = (AI_TECH_BIAS[k] || 1) * 100 / techCost(p, k) * (0.7 + Math.random() * 0.6);
    if (UNITS && p.aggression > 1.1 && Object.keys(UNITS).some(function (u) { return UNITS[u].tech === k && !UNITS[u].civilian; })) s *= 1.4;
    if (s > bs) { bs = s; best = k; }
  });
  return best;
}

// ---------------------------------------------------------------- turn

function aiTakeTurn(p) {
  if (p.barbarian) { aiBarbarians(p); return; }
  if (G.turn % 15 === 0) p._noSites = false;
  aiDiplomacy(p);
  var ctx = { claims: {}, defenders: {} };
  var units = playerUnits(p.id);
  units.filter(function (u) { return UNITS[u.type].settler; }).forEach(function (u) { if (G.units[u.id]) aiSettler(u, p, ctx); });
  units.filter(function (u) { return UNITS[u.type].worker; }).forEach(function (u) { if (G.units[u.id]) aiWorker(u, p, ctx); });
  units.filter(function (u) { return u.type === 'scout'; }).forEach(function (u) { if (G.units[u.id]) aiScout(u, p); });
  aiMilitary(units.filter(function (u) { return G.units[u.id] && isMilitary(u); }), p, ctx);
  // Re-check production choices that became invalid.
  playerCities(p.id).forEach(function (c) {
    if (!c.build || !canBuild(c, c.build)) c.build = aiChooseBuild(c);
    if (c.build.type === 'wealth' && Math.random() < 0.2) c.build = aiChooseBuild(c);
    // AIs buy defenders in emergencies.
    if (cityGarrison(c) === 0 && enemyMilitaryNear(p.id, c.x, c.y, 3) && c.build.type === 'unit' && !UNITS[c.build.key].civilian) buyItem(c);
  });
  aiSpend(p);
}

// Spend surplus gold: import missing goods, then rush production.
function aiSpend(p) {
  var cs = playerCities(p.id);
  var reserve = 40 + cs.length * 10;
  cs.forEach(function (c) {
    var d = buildDef(c.build);
    if (!d || !d.goods || c.prod < buildCost(c, c.build)) return;
    for (var g in d.goods) {
      var miss = d.goods[g] - p.goods[g];
      if (miss > 0 && p.gold - miss * GOODS[g].price > reserve / 2) tradeGoods(p, g, miss);
    }
  });
  for (var g in p.goods) if (p.goods[g] > 300) tradeGoods(p, g, -(p.goods[g] - 300));
  var guard = 0;
  while (p.gold > reserve * 2 && guard++ < 4) {
    var best = null, bc = 1e9;
    cs.forEach(function (c) {
      if (!c.build || c.build.type === 'wealth' || c.build.type === 'project') return;
      var d = buildDef(c.build);
      if (d.goods && !hasGoods(p, d.goods)) return;
      var cost = buyCost(c);
      if (cost > 0 && cost < bc) { bc = cost; best = c; }
    });
    if (!best || p.gold - bc < reserve) break;
    buyItem(best);
  }
}

// ---------------------------------------------------------------- settlers

function siteValue(x, y, pid) {
  var s = 0;
  RAD_SMALL.forEach(function (o) {
    var t = tileAt(x + o[0], y + o[1]);
    if (!t) return;
    if (t.owner >= 0 && t.owner !== pid) { s -= 1; return; }
    if (t.owner === pid) { s += 0.3; return; }
    var T = TERRAIN[t.t];
    s += T.food * 1.6 + T.prod * 1.1 + T.gold * 0.5;
    if (t.res) s += 2;
  });
  var here = tileAt(x, y);
  if (here.t === 'hills') s += 2;
  for (var d = 0; d < 8; d++) { var n = tileAt(x + DIRS8[d][0], y + DIRS8[d][1]); if (n && isWater(n)) { s += 2; break; } }
  return s;
}

function aiSettler(u, p, ctx) {
  var cs = playerCities(p.id);
  if (!cs.length && canFoundCity(u.x, u.y)) { foundCity(u); return; }
  if (enemyMilitaryNear(p.id, u.x, u.y, 2)) {
    var home = nearestOwnCity(p.id, u.x, u.y);
    if (home) { u.path = findPath(u, home.x, home.y, 2000); followPath(u); }
    return;
  }
  var tgt = u.target;
  if (tgt && (!canFoundCity(tgt[0], tgt[1]) || ctx.claims[tgt[0] + ',' + tgt[1]])) tgt = null;
  if (!tgt) {
    var best = null, bs = -1e9, R = 12;
    for (var yy = u.y - R; yy <= u.y + R; yy++) for (var xx = u.x - R; xx <= u.x + R; xx++) {
      if (!canFoundCity(xx, yy) || ctx.claims[xx + ',' + yy]) continue;
      var t = tileAt(xx, yy);
      if (t.owner >= 0 && t.owner !== p.id) continue;
      if (enemyOnTile(tidx(xx, yy), p.id)) continue;
      var near = nearestOwnCity(p.id, xx, yy);
      var nd = near ? dist(near.x, near.y, xx, yy) : 0;
      var s = siteValue(xx, yy, p.id) - dist(u.x, u.y, xx, yy) * 0.8 - (nd > 7 ? (nd - 7) * 1.5 : 0);
      if (s > bs) { bs = s; best = [xx, yy]; }
    }
    if (best && bs > 4) {
      var path = findPath(u, best[0], best[1], 3000);
      if (path) { tgt = best; u.path = path; } else best = null;
    }
    if (!tgt) {
      p._noSites = true;
      if (canFoundCity(u.x, u.y) && siteValue(u.x, u.y, p.id) > 4) { foundCity(u); return; }
      // Nowhere to settle: join the nearest city instead.
      var nc = nearestOwnCity(p.id, u.x, u.y);
      if (nc && nc.x === u.x && nc.y === u.y) { if (nc.pop < housingCap(nc)) nc.pop++; killUnit(u); return; }
      if (nc) { u.path = findPath(u, nc.x, nc.y, 3000); followPath(u); }
      return;
    }
  }
  u.target = tgt;
  ctx.claims[tgt[0] + ',' + tgt[1]] = true;
  if (u.x === tgt[0] && u.y === tgt[1]) { foundCity(u); return; }
  if (!u.path || !u.path.length) u.path = findPath(u, tgt[0], tgt[1], 3000);
  followPath(u);
  if (G.units[u.id] && u.x === tgt[0] && u.y === tgt[1] && canFoundCity(u.x, u.y)) foundCity(u);
}

// ---------------------------------------------------------------- workers (also used for automated human workers)

function bestImprovement(t, p) {
  if (t.res) {
    var R = RESOURCES[t.res];
    if (R.imp && t.imp !== R.imp && hasTech(p, IMPROVEMENTS[R.imp].tech)) return { imp: R.imp, v: 8 };
    if (R.imp) return null;
  }
  if (t.imp) return null;
  if (t.t === 'grass' || t.t === 'plains') return { imp: 'farm', v: 3 };
  if (t.t === 'desert' || t.t === 'tundra') return { imp: 'farm', v: 1 };
  if (t.t === 'hills') {
    if (hasTech(p, 'masonry') && p.goods.stone < 40 && Math.random() < 0.5) return { imp: 'quarry', v: 4 };
    return { imp: 'mine', v: 3.5 };
  }
  if (t.t === 'forest') return { imp: 'lumber', v: p.goods.wood < 40 ? 4 : 2 };
  return null;
}

function aiWorker(u, p, ctx) {
  if (u.order === 'build') return;
  ctx = ctx || { claims: {} };
  if (enemyMilitaryNear(p.id, u.x, u.y, 2)) {
    var home = nearestOwnCity(p.id, u.x, u.y);
    if (home && (home.x !== u.x || home.y !== u.y)) { u.path = findPath(u, home.x, home.y, 2000); followPath(u); }
    return;
  }
  var best = null, bs = -1e9;
  var R = 8;
  for (var yy = u.y - R; yy <= u.y + R; yy++) for (var xx = u.x - R; xx <= u.x + R; xx++) {
    var t = tileAt(xx, yy);
    if (!t || t.owner !== p.id || isWater(t) || cityAt(xx, yy)) continue;
    var key = xx + ',' + yy;
    if (ctx.claims[key]) continue;
    if (enemyOnTile(tidx(xx, yy), p.id)) continue;
    var others = unitsAt(xx, yy).some(function (o) { return o !== u && o.owner === p.id && o.order === 'build'; });
    if (others) continue;
    var worked = t.worked >= 0;
    var opt = bestImprovement(t, p);
    var cand = null;
    if (opt) cand = { imp: opt.imp, v: opt.v + (worked ? 3 : 0) };
    else if (!t.road && worked && t.imp) cand = { imp: 'road', v: 1 };
    if (!cand) continue;
    var s = cand.v - dist(u.x, u.y, xx, yy) * 0.5;
    if (s > bs) { bs = s; best = { x: xx, y: yy, imp: cand.imp }; }
  }
  if (!best) {
    var c = nearestOwnCity(p.id, u.x, u.y);
    if (c && (c.x !== u.x || c.y !== u.y)) { u.path = findPath(u, c.x, c.y, 2000); followPath(u); }
    return;
  }
  ctx.claims[best.x + ',' + best.y] = true;
  if (u.x !== best.x || u.y !== best.y) {
    u.path = findPath(u, best.x, best.y, 2000);
    if (!u.path) return;
    followPath(u);
  }
  if (G.units[u.id] && u.x === best.x && u.y === best.y) startJob(u, best.imp);
}

function aiScout(u, p) {
  // Wander toward the least-known direction; AI scouts mostly meet other civs.
  for (var tries = 0; tries < 6 && u.moves > 0; tries++) {
    var d = DIRS8[rnd(8)], nx = u.x + d[0], ny = u.y + d[1];
    if (stepKind(u, nx, ny) === 'move') stepUnit(u, nx, ny);
  }
}

// ---------------------------------------------------------------- military

function aiMilitary(units, p, ctx) {
  var cs = playerCities(p.id);
  var war = atWarWithCiv(p.id);
  var enemies = enemiesOf(p.id);
  var assigned = {};
  // 1. Defenders: each city keeps the best defenders already inside it.
  cs.forEach(function (c) {
    var need = 1 + (war ? 1 : 0) + (enemyMilitaryNear(p.id, c.x, c.y, 4) ? 1 : 0) + (c.pop >= 8 ? 1 : 0);
    if (c.buildings.palace) need++;
    c._need = need;
    var here = unitsAt(c.x, c.y).filter(function (u) { return u.owner === p.id && isMilitary(u); });
    here.sort(function (a, b) { return UNITS[b.type].def - UNITS[a.type].def; });
    here.slice(0, need).forEach(function (u) { assigned[u.id] = c; });
    c._have = Math.min(need, here.length);
  });
  // 2. Fill undefended cities with the nearest free units.
  cs.slice().sort(function (a, b) { return a._have - b._have; }).forEach(function (c) {
    while (c._have < c._need) {
      var best = null, bd = 1e9;
      units.forEach(function (u) {
        if (assigned[u.id] || !G.units[u.id]) return;
        var d = dist(u.x, u.y, c.x, c.y) - UNITS[u.type].def * 0.5;
        if (d < bd && d < 14) { bd = d; best = u; }
      });
      if (!best) break;
      assigned[best.id] = c;
      c._have++;
    }
  });

  var targetCity = war ? pickWarTarget(p, enemies) : null;

  units.forEach(function (u) {
    if (!G.units[u.id] || u.moves <= 0) return;
    // Opportunistic attacks on adjacent enemies.
    if (tryAdjacentAttack(u, p, assigned[u.id] ? 0.7 : 0.55)) return;
    if (!G.units[u.id] || u.moves <= 0) return;
    var home = assigned[u.id];
    if (home) {
      if (u.x === home.x && u.y === home.y) { u.order = 'fortify'; u.fort = true; return; }
      u.order = null;
      u.path = findPath(u, home.x, home.y, 3000);
      followPath(u);
      if (G.units[u.id] && u.x === home.x && u.y === home.y) { u.order = 'fortify'; }
      return;
    }
    // Wounded units retreat to heal.
    if (u.hp <= 4) {
      var nc = nearestOwnCity(p.id, u.x, u.y);
      if (nc && (nc.x !== u.x || nc.y !== u.y)) { u.path = findPath(u, nc.x, nc.y, 2000); followPath(u); }
      else u.fort = true;
      return;
    }
    // Hunt barbarians near our cities.
    var barb = nearbyBarbarian(u, p, 6);
    if (barb && !targetCity) {
      approachAndAttack(u, p, barb.x, barb.y, 0.45);
      return;
    }
    if (targetCity) {
      var army = units.filter(function (o) { return G.units[o.id] && !assigned[o.id] && o.hp > 4; });
      var nearTarget = army.filter(function (o) { return dist(o.x, o.y, targetCity.x, targetCity.y) <= 3; }).length;
      var gathered = army.length >= 3 || nearTarget >= 2;
      if (gathered) {
        var odds = nearTarget >= 3 ? 0.3 : 0.42;
        approachAndAttack(u, p, targetCity.x, targetCity.y, UNITS[u.type].siege ? odds - 0.1 : odds);
        return;
      }
    }
    // Idle: rest in the nearest city.
    var c = nearestOwnCity(p.id, u.x, u.y);
    if (c && (c.x !== u.x || c.y !== u.y)) { u.path = findPath(u, c.x, c.y, 2000); followPath(u); }
    else { u.order = 'fortify'; u.fort = true; }
  });
}

function pickWarTarget(p, enemies) {
  var cap = G.cities[p.capital] || playerCities(p.id)[0];
  if (!cap) return null;
  var best = null, bs = 1e9;
  for (var id in G.cities) {
    var c = G.cities[id];
    if (c.owner === p.id || enemies.indexOf(c.owner) < 0 || G.players[c.owner].barbarian) continue;
    var s = dist(cap.x, cap.y, c.x, c.y) + cityGarrison(c) * 3 + (c.buildings.walls ? 4 : 0);
    if (s < bs) { bs = s; best = c; }
  }
  if (best && bs > 40) return null;
  return best;
}

function nearbyBarbarian(u, p, r) {
  var best = null, bd = 1e9;
  for (var id in G.units) {
    var o = G.units[id];
    if (!G.players[o.owner].barbarian) continue;
    var d = dist(o.x, o.y, u.x, u.y);
    if (d > r) continue;
    var c = nearestOwnCity(p.id, o.x, o.y);
    if (!c || dist(c.x, c.y, o.x, o.y) > 6) continue;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function tryAdjacentAttack(u, p, minOdds) {
  if (!UNITS[u.type].atk) return false;
  var best = null, bo = minOdds;
  for (var d = 0; d < 8; d++) {
    var x = u.x + DIRS8[d][0], y = u.y + DIRS8[d][1];
    var kind = stepKind(u, x, y);
    if (kind === 'capture') { stepUnit(u, x, y); return true; }
    if (kind !== 'attack') continue;
    var o = combatOdds(u, x, y);
    var c = cityAt(x, y);
    if (c) o += 0.05;
    if (o > bo) { bo = o; best = [x, y]; }
  }
  if (best) { stepUnit(u, best[0], best[1]); return true; }
  return false;
}

function approachAndAttack(u, p, tx, ty, minOdds) {
  if (dist(u.x, u.y, tx, ty) === 1) {
    var kind = stepKind(u, tx, ty);
    if (kind === 'capture') { stepUnit(u, tx, ty); return; }
    if (kind === 'attack' && combatOdds(u, tx, ty) >= minOdds) { stepUnit(u, tx, ty); return; }
    u.fort = true;
    return;
  }
  var path = findPath(u, tx, ty, 4000);
  if (!path) { u.fort = true; return; }
  // Walk up to the tile next to the target, then decide on the attack next turn.
  u.path = path.slice(0, Math.max(0, path.length - 1));
  followPath(u);
  if (G.units[u.id] && u.moves > 0 && dist(u.x, u.y, tx, ty) === 1) {
    var k2 = stepKind(u, tx, ty);
    if (k2 === 'capture' || (k2 === 'attack' && combatOdds(u, tx, ty) >= minOdds)) stepUnit(u, tx, ty);
  }
}

// ---------------------------------------------------------------- barbarians

function aiBarbarians(p) {
  playerUnits(p.id).forEach(function (u) {
    if (!G.units[u.id] || u.moves <= 0) return;
    if (tryAdjacentAttack(u, p, 0.3)) return;
    if (!G.units[u.id]) return;
    var best = null, bd = 1e9;
    for (var id in G.cities) {
      var c = G.cities[id], d = dist(c.x, c.y, u.x, u.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best && bd <= 14) { approachAndAttack(u, p, best.x, best.y, 0.25); return; }
    for (var i = 0; i < 4 && u.moves > 0; i++) {
      var dd = DIRS8[rnd(8)];
      if (stepKind(u, u.x + dd[0], u.y + dd[1]) === 'move') stepUnit(u, u.x + dd[0], u.y + dd[1]);
    }
  });
}

// ---------------------------------------------------------------- diplomacy

function cityDistanceBetween(a, b) {
  var best = 1e9;
  playerCities(a).forEach(function (ca) {
    playerCities(b).forEach(function (cb) { best = Math.min(best, dist(ca.x, ca.y, cb.x, cb.y)); });
  });
  return best;
}

function aiDiplomacy(p) {
  var mine = militaryStrength(p.id);
  var agg = p.aggression * diff().aggression;
  G.players.forEach(function (o) {
    if (o.id === p.id || !o.alive || o.barbarian || !G.diplo[p.id][o.id].met) return;
    var d = G.diplo[p.id][o.id];
    var theirs = militaryStrength(o.id);
    if (d.war) {
      var turns = G.turn - d.since;
      if (turns >= 10 && (mine < theirs * 0.9 || p.lostCities > 0 || turns > 40) && Math.random() < 0.08) {
        if (o.human) {
          if (G.turn - p.lastPeaceAsk >= 12) { p.lastPeaceAsk = G.turn; queueEvent({ key: 'peaceOffer', params: { from: p.id } }); }
        } else if (aiAcceptsPeace(o.id, p.id)) makePeace(p.id, o.id);
      }
      return;
    }
    if (G.turn < 25 || G.turn - d.since < 20) return;
    var otherWars = G.players.filter(function (x) { return x.alive && !x.barbarian && x.id !== p.id && G.diplo[p.id][x.id].war; }).length;
    if (otherWars) return;
    var close = cityDistanceBetween(p.id, o.id);
    if (close > 20) return;
    var ratio = mine / Math.max(1, theirs);
    if ((ratio > 1.5 - agg * 0.35 && Math.random() < 0.03 * agg) || (ratio > 0.9 && Math.random() < 0.004 * agg)) { declareWar(p.id, o.id); return; }
    if (o.human && ratio > 2 && o.gold >= 30 && G.turn - p.lastTribute > 40 && Math.random() < 0.03 * agg) {
      p.lastTribute = G.turn;
      queueEvent({ key: 'tribute', params: { from: p.id, amount: clamp(Math.round(o.gold * 0.35 / 10) * 10, 30, 200) } });
    }
  });
}
