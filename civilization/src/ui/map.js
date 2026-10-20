// The world map: terrain, improvements, borders, cities, units, fog of war, and mouse/keyboard control.

var VIEW_TOP = 28, VIEW_H = 612;

var MapScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function MapScene() { Phaser.Scene.call(this, { key: 'Map' }); },

  create: function () {
    var self = this;
    this.sel = null;
    this.gotoMode = false;
    this.dirty = true;
    this.hoverKey = -1;
    this.drag = null;
    this.cycle = { key: -1, i: 0 };

    var cam = this.cameras.main;
    cam.setViewport(0, VIEW_TOP, 1024, VIEW_H);
    cam.setBounds(-TILE * 6, -TILE * 6, G.w * TILE + TILE * 12, G.h * TILE + TILE * 12);
    cam.setBackgroundColor('#05070a');

    for (var y = 0; y < G.h; y++) for (var x = 0; x < G.w; x++) {
      var t = G.tiles[y * G.w + x];
      var v = (x * 7 + y * 13 + ((x * y) % 5)) % TERRAIN_VARIANTS;
      this.add.image(x * TILE + 16, y * TILE + 16, 'ter_' + t.t + '_' + v).setDepth(0);
      if (t.res) this.add.image(x * TILE + 10, y * TILE + 10, 'res_' + t.res).setScale(0.42).setDepth(2);
    }
    this.drawShores();
    this.impG = this.add.graphics().setDepth(1);
    this.borderG = this.add.graphics().setDepth(3);
    this.cityLayer = this.add.container(0, 0).setDepth(4);
    this.unitLayer = this.add.container(0, 0).setDepth(5);
    this.fogG = this.add.graphics().setDepth(6);
    this.selG = this.add.graphics().setDepth(7);
    this.pathG = this.add.graphics().setDepth(8);
    this.pathText = txt(this, 0, 0, '', 12, '#ffffff', { stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' }).setDepth(9).setOrigin(0.5);

    Hooks.changed = function () { self.dirty = true; };
    Hooks.message = function (m) { if (self.hud && self.hud.ready) self.hud.addMessage(m); };
    Hooks.event = function () { };
    Hooks.techLearned = function (p, k) { self.pendingTech = k; };
    Hooks.gameOver = function () { self.dirty = true; };
    Hooks.combat = function (c) { self.flash(c.x, c.y); };

    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('wheel', this.onWheel, this);
    this.input.keyboard.on('keydown', this.onKey, this);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.scene.launch('Hud');
    this.hud = this.scene.get('Hud');
  },

  // Called by the HUD once it has been built.
  hudReady: function () {
    this.redraw();
    var hp = humanPlayer();
    var first = playerUnits(hp.id)[0] || playerCities(hp.id)[0];
    if (first) this.centerOn(first.x, first.y, true);
    this.selectNext();
    if (G.over) this.hud.showGameOver();
    else this.hud.processQueue();
  },

  update: function (time) {
    var cam = this.cameras.main, sp = 9 / cam.zoom;
    var modal = this.hud && this.hud.modal;
    if (!modal) {
      if (this.cursors.left.isDown) cam.scrollX -= sp;
      if (this.cursors.right.isDown) cam.scrollX += sp;
      if (this.cursors.up.isDown) cam.scrollY -= sp;
      if (this.cursors.down.isDown) cam.scrollY += sp;
    }
    if (this.dirty) {
      this.dirty = false;
      this.redraw();
      if (this.hud && this.hud.ready) this.hud.refresh();
    }
    var u = this.selUnit();
    this.selG.clear();
    if (u) {
      var a = 0.55 + Math.sin(time / 180) * 0.4;
      this.selG.lineStyle(3, 0xffffff, a);
      this.selG.strokeCircle(u.x * TILE + 16, u.y * TILE + 16, 15);
    }
    if (this.hud && this.hud.ready) this.hud.updateMinimapView();
  },

  selUnit: function () {
    var u = this.sel ? G.units[this.sel] : null;
    if (!u || u.owner !== G.human) { this.sel = null; return null; }
    return u;
  },

  // ------------------------------------------------------------ drawing

  redraw: function () {
    this.drawImprovements();
    this.drawBorders();
    this.drawCities();
    this.drawUnits();
    this.drawFog();
    this.updatePath();
  },

  drawShores: function () {
    var g = this.add.graphics().setDepth(1);
    g.lineStyle(2, 0xe8d8a0, 0.55);
    for (var y = 0; y < G.h; y++) for (var x = 0; x < G.w; x++) {
      var t = G.tiles[y * G.w + x];
      if (isWater(t)) continue;
      var px = x * TILE, py = y * TILE;
      var n = tileAt(x, y - 1), s = tileAt(x, y + 1), w = tileAt(x - 1, y), e = tileAt(x + 1, y);
      if (n && isWater(n)) g.lineBetween(px, py + 1, px + TILE, py + 1);
      if (s && isWater(s)) g.lineBetween(px, py + TILE - 1, px + TILE, py + TILE - 1);
      if (w && isWater(w)) g.lineBetween(px + 1, py, px + 1, py + TILE);
      if (e && isWater(e)) g.lineBetween(px + TILE - 1, py, px + TILE - 1, py + TILE);
    }
  },

  drawImprovements: function () {
    var g = this.impG;
    g.clear();
    for (var y = 0; y < G.h; y++) for (var x = 0; x < G.w; x++) {
      var t = G.tiles[y * G.w + x];
      if (!t.explored) continue;
      var px = x * TILE, py = y * TILE, cx = px + 16, cy = py + 16;
      if (t.road || cityAt(x, y)) {
        g.lineStyle(3, 0x7a5a32, 0.9);
        var any = false;
        for (var d = 0; d < 8; d++) {
          var nx = x + DIRS8[d][0], ny = y + DIRS8[d][1], nt = tileAt(nx, ny);
          if (nt && (nt.road || cityAt(nx, ny)) && nt.explored) { g.lineBetween(cx, cy, cx + DIRS8[d][0] * 16, cy + DIRS8[d][1] * 16); any = true; }
        }
        if (!any && t.road) { g.fillStyle(0x7a5a32, 0.9); g.fillCircle(cx, cy, 3); }
      }
      switch (t.imp) {
        case 'farm':
          g.lineStyle(1, 0xe8d860, 0.85);
          for (var i = 0; i < 4; i++) g.lineBetween(px + 4, py + 18 + i * 3, px + 28, py + 18 + i * 3);
          break;
        case 'mine':
          g.fillStyle(0x2a2018, 1); g.fillTriangle(px + 20, py + 28, px + 25, py + 19, px + 30, py + 28);
          g.lineStyle(1, 0xd0c090, 1); g.strokeTriangle(px + 20, py + 28, px + 25, py + 19, px + 30, py + 28);
          break;
        case 'quarry':
          g.fillStyle(0xbab4aa, 1); g.fillRect(px + 20, py + 22, 5, 5); g.fillRect(px + 25, py + 24, 5, 4); g.fillRect(px + 22, py + 18, 5, 4);
          g.lineStyle(1, 0x403a30, 1); g.strokeRect(px + 20, py + 22, 5, 5);
          break;
        case 'lumber':
          g.fillStyle(0x8a5a2a, 1); g.fillRect(px + 19, py + 23, 10, 3); g.fillRect(px + 21, py + 19, 10, 3);
          break;
        case 'pasture':
          g.lineStyle(1, 0xf0e0c0, 0.9);
          g.lineBetween(px + 3, py + 27, px + 29, py + 27); g.lineBetween(px + 3, py + 23, px + 29, py + 23);
          for (var k = 0; k < 4; k++) g.lineBetween(px + 4 + k * 8, py + 21, px + 4 + k * 8, py + 29);
          break;
      }
    }
  },

  drawBorders: function () {
    var g = this.borderG;
    g.clear();
    for (var y = 0; y < G.h; y++) for (var x = 0; x < G.w; x++) {
      var t = G.tiles[y * G.w + x];
      if (t.owner < 0 || !t.explored) continue;
      var col = G.players[t.owner].color, px = x * TILE, py = y * TILE;
      g.fillStyle(col, 0.1);
      g.fillRect(px, py, TILE, TILE);
      g.lineStyle(2, col, 0.85);
      var n = tileAt(x, y - 1), s = tileAt(x, y + 1), w = tileAt(x - 1, y), e = tileAt(x + 1, y);
      if (!n || n.owner !== t.owner) g.lineBetween(px, py + 1, px + TILE, py + 1);
      if (!s || s.owner !== t.owner) g.lineBetween(px, py + TILE - 1, px + TILE, py + TILE - 1);
      if (!w || w.owner !== t.owner) g.lineBetween(px + 1, py, px + 1, py + TILE);
      if (!e || e.owner !== t.owner) g.lineBetween(px + TILE - 1, py, px + TILE - 1, py + TILE);
    }
  },

  drawCities: function () {
    var self = this;
    this.cityLayer.removeAll(true);
    Object.keys(G.cities).forEach(function (id) {
      var c = G.cities[id], t = tileAt(c.x, c.y);
      if (!t.explored) return;
      var P = G.players[c.owner];
      var cont = self.add.container(c.x * TILE + 16, c.y * TILE + 16);
      var g = self.add.graphics();
      if (c.buildings.walls || hasGlobal(P, 'walls')) {
        g.lineStyle(3, 0x9a9488, 1);
        g.strokeRoundedRect(-15, -15, 30, 30, 5);
      }
      var houses = c.pop >= 8 ? [[-8, -4], [5, -6], [-2, 5], [8, 6], [-10, 8]] : c.pop >= 4 ? [[-7, -3], [5, -5], [-1, 6], [8, 6]] : [[-6, -2], [5, -3], [0, 7]];
      houses.forEach(function (h) {
        g.fillStyle(0xe6d8b8, 1); g.fillRect(h[0] - 4, h[1] - 2, 8, 6);
        g.fillStyle(P.color, 1); g.fillTriangle(h[0] - 5, h[1] - 2, h[0], h[1] - 7, h[0] + 5, h[1] - 2);
        g.lineStyle(1, 0x000000, 0.6); g.strokeRect(h[0] - 4, h[1] - 2, 8, 6);
      });
      cont.add(g);
      var label = (c.buildings.palace ? '★ ' : '') + c.pop + ' ' + c.name;
      var nt = txt(self, 0, 21, label, 11, '#ffffff', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
      var bg = self.add.graphics();
      var w = nt.width + 8;
      bg.fillStyle(0x000000, 0.55); bg.fillRoundedRect(-w / 2, 13, w, 16, 4);
      bg.lineStyle(1.5, P.color, 1); bg.strokeRoundedRect(-w / 2, 13, w, 16, 4);
      cont.add([bg, nt]);
      if (c.owner === G.human) {
        var cost = buildCost(c, c.build), frac = cost ? c.prod / cost : 0;
        bg.fillStyle(0x222222, 1); bg.fillRect(-w / 2 + 2, 29, w - 4, 3);
        bg.fillStyle(c.build ? 0xe0a030 : 0xff4040, 1); bg.fillRect(-w / 2 + 2, 29, (w - 4) * (c.build ? clamp(frac, 0, 1) : 1), 3);
        if (c.yields && c.yields.disorder) cont.add(txt(self, 14, -20, '😠', 12).setOrigin(0.5));
      }
      self.cityLayer.add(cont);
    });
  },

  drawUnits: function () {
    var self = this;
    this.unitLayer.removeAll(true);
    var groups = {};
    for (var id in G.units) {
      var u = G.units[id];
      var t = tileAt(u.x, u.y);
      if (!t.visible && u.owner !== G.human) continue;
      var k = tidx(u.x, u.y);
      (groups[k] = groups[k] || []).push(u);
    }
    var sel = this.selUnit();
    Object.keys(groups).forEach(function (k) {
      var list = groups[k];
      var top = list.indexOf(sel) >= 0 ? sel : bestDefender(list[0].x, list[0].y, null) || list[0];
      var inCity = !!cityAt(top.x, top.y);
      var P = G.players[top.owner];
      var cx = top.x * TILE + 16, cy = top.y * TILE + (inCity ? 9 : 16);
      var cont = self.add.container(cx, cy);
      var g = self.add.graphics();
      g.fillStyle(0x000000, 0.35); g.fillEllipse(1, 11, 22, 7);
      g.fillStyle(P.color, 1);
      if (top.fort && isMilitary(top)) {
        g.fillRect(-11, -11, 22, 22);
        g.lineStyle(2, 0x000000, 0.8); g.strokeRect(-11, -11, 22, 22);
      } else {
        g.fillCircle(0, 0, 11);
        g.lineStyle(2, 0x000000, 0.8); g.strokeCircle(0, 0, 11);
      }
      cont.add(g);
      cont.add(self.add.image(0, 0, 'unit_' + top.type).setScale(0.48));
      if (top.hp < 10) {
        var hb = self.add.graphics();
        hb.fillStyle(0x000000, 0.8); hb.fillRect(-11, 12, 22, 4);
        hb.fillStyle(top.hp > 6 ? 0x60e040 : top.hp > 3 ? 0xe0c030 : 0xe04030, 1); hb.fillRect(-10, 13, 20 * top.hp / 10, 2);
        cont.add(hb);
      }
      if (list.length > 1) cont.add(txt(self, 9, -14, String(list.length), 10, '#ffffff', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }));
      if (top.vet) cont.add(txt(self, -15, -15, '★', 9, '#ffd27a', { stroke: '#000000', strokeThickness: 2 }));
      if (top.owner === G.human && top.moves <= 0) cont.setAlpha(0.72);
      if (top.order === 'build') cont.add(txt(self, -15, 4, '⚒', 10, '#ffffff', { stroke: '#000000', strokeThickness: 2 }));
      self.unitLayer.add(cont);
    });
  },

  drawFog: function () {
    var g = this.fogG;
    g.clear();
    for (var y = 0; y < G.h; y++) {
      var runStart = 0, runState = -1;
      for (var x = 0; x <= G.w; x++) {
        var st = 0;
        if (x < G.w) { var t = G.tiles[y * G.w + x]; st = !t.explored ? 2 : !t.visible ? 1 : 0; }
        else st = -2;
        if (st !== runState) {
          if (runState === 2) { g.fillStyle(0x000000, 1); g.fillRect(runStart * TILE, y * TILE, (x - runStart) * TILE, TILE); }
          else if (runState === 1) { g.fillStyle(0x000000, 0.42); g.fillRect(runStart * TILE, y * TILE, (x - runStart) * TILE, TILE); }
          runState = st; runStart = x;
        }
      }
    }
  },

  flash: function (x, y) {
    var t = tileAt(x, y);
    if (!t || !t.visible) return;
    var img = this.add.image(x * TILE + 16, y * TILE + 16, 'glow').setTint(0xff5020).setDepth(10).setScale(0.3).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: img, scale: 1.1, alpha: 0, duration: 450, onComplete: function () { img.destroy(); } });
  },

  // ------------------------------------------------------------ camera

  centerOn: function (x, y, instant) {
    var cam = this.cameras.main;
    var wx = x * TILE + 16, wy = y * TILE + 16;
    if (instant) { cam.centerOn(wx, wy); return; }
    var v = cam.worldView;
    var m = 64 / cam.zoom;
    if (wx < v.x + m || wx > v.right - m || wy < v.y + m || wy > v.bottom - m) cam.pan(wx, wy, 250, 'Sine.easeInOut');
  },

  pointerTile: function (p) {
    var wp = this.cameras.main.getWorldPoint(p.x, p.y);
    var x = Math.floor(wp.x / TILE), y = Math.floor(wp.y / TILE);
    return inb(x, y) ? [x, y] : null;
  },

  inView: function (p) { return p.y >= VIEW_TOP && p.y < VIEW_TOP + VIEW_H; },

  // ------------------------------------------------------------ input

  onDown: function (p) {
    if (!this.hud.ready || this.hud.modal || !this.inView(p) || G.over) return;
    if (p.rightButtonDown()) {
      var t = this.pointerTile(p);
      if (t && this.selUnit()) this.moveSelected(t[0], t[1]);
      return;
    }
    this.drag = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false };
  },

  onMove: function (p) {
    if (!this.hud.ready) return;
    var cam = this.cameras.main;
    if (this.drag && p.isDown && !this.hud.modal) {
      var dx = p.x - this.drag.x, dy = p.y - this.drag.y;
      if (this.drag.moved || Math.abs(dx) + Math.abs(dy) > 7) {
        this.drag.moved = true;
        cam.scrollX = this.drag.sx - dx / cam.zoom;
        cam.scrollY = this.drag.sy - dy / cam.zoom;
      }
      return;
    }
    if (!p.isDown) this.drag = null;
    if (!this.inView(p) || this.hud.modal) return;
    var t = this.pointerTile(p);
    var k = t ? tidx(t[0], t[1]) : -1;
    if (k !== this.hoverKey) {
      this.hoverKey = k;
      this.hud.setHover(t);
      this.updatePath();
    }
  },

  onUp: function (p) {
    var d = this.drag;
    this.drag = null;
    if (!d || d.moved || this.hud.modal || !this.inView(p) || G.over) return;
    if (p.button !== 0) return;
    var t = this.pointerTile(p);
    if (t) this.clickTile(t[0], t[1]);
  },

  onWheel: function (p, objs, dx, dy) {
    if (!this.hud.ready || this.hud.modal || !this.inView(p)) return;
    var cam = this.cameras.main;
    var before = cam.getWorldPoint(p.x, p.y);
    cam.setZoom(clamp(cam.zoom * (dy > 0 ? 0.87 : 1.15), 0.45, 2));
    var after = cam.getWorldPoint(p.x, p.y);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
  },

  clickTile: function (x, y) {
    var u = this.selUnit();
    if (this.gotoMode && u) { this.gotoMode = false; this.moveSelected(x, y); return; }
    this.gotoMode = false;
    var own = unitsAt(x, y).filter(function (o) { return o.owner === G.human; });
    var city = cityAt(x, y);
    if (city && city.owner === G.human) {
      if (u && (u.x !== x || u.y !== y) && u.moves > 0 && !own.length) { this.moveSelected(x, y); return; }
      this.hud.openCity(city);
      return;
    }
    if (own.length) {
      var k = tidx(x, y);
      if (this.cycle.key === k && u && u.x === x && u.y === y) this.cycle.i = (this.cycle.i + 1) % own.length;
      else { this.cycle.key = k; this.cycle.i = 0; }
      this.selectUnit(own[this.cycle.i]);
      return;
    }
    if (u) { this.moveSelected(x, y); return; }
    this.hud.setHover([x, y], true);
  },

  selectUnit: function (u, center) {
    this.sel = u ? u.id : null;
    this.gotoMode = false;
    if (u && center) this.centerOn(u.x, u.y);
    this.dirty = true;
    this.updatePath();
  },

  selectNext: function (skipCurrent) {
    var cur = this.selUnit();
    var cam = this.cameras.main;
    var cx = cur ? cur.x : (cam.worldView.centerX / TILE), cy = cur ? cur.y : (cam.worldView.centerY / TILE);
    var list = idleUnits(G.human).filter(function (u) { return !skipCurrent || u !== cur; });
    if (!list.length) { this.selectUnit(null); return; }
    list.sort(function (a, b) { return dist(a.x, a.y, cx, cy) - dist(b.x, b.y, cx, cy); });
    this.selectUnit(list[0], true);
  },

  afterAction: function (u) {
    var self = this;
    this.dirty = true;
    this.hud.processQueue();
    if (!u || !G.units[u.id] || u.moves <= 0 || u.order || u.path || u.auto || u.fort) {
      var id = u ? u.id : null;
      this.time.delayedCall(220, function () {
        if (self.sel === id || !self.selUnit()) self.selectNext(true);
      });
    }
  },

  explainBlocked: function (u, x, y) {
    var t = tileAt(x, y);
    if (!t) return;
    if (isWater(t)) { this.hud.flash('Land units cannot enter water.'); return; }
    var others = unitsAt(x, y).filter(function (o) { return o.owner !== u.owner; });
    var c = cityAt(x, y);
    var owner = others.length ? others[0].owner : c && c.owner !== u.owner ? c.owner : -1;
    if (owner >= 0 && !atWar(u.owner, owner)) { this.hud.flash('You are at peace with the ' + G.players[owner].name + '. Declare war in Diplomacy (D) first.'); return; }
    if (owner >= 0 && !isMilitary(u)) { this.hud.flash('Civilian units cannot attack.'); return; }
    if (c && UNITS[u.type].siege) { this.hud.flash('Siege units can bombard but not capture cities.'); return; }
    this.hud.flash("Can't move there.");
  },

  moveSelected: function (x, y) {
    var u = this.selUnit();
    if (!u || (u.x === x && u.y === y)) return;
    u.order = null; u.job = null; u.fort = false; u.auto = false;
    if (dist(u.x, u.y, x, y) === 1 && u.moves > 0) {
      var kind = stepKind(u, x, y);
      if (!kind) { this.explainBlocked(u, x, y); return; }
      u.path = null;
      stepUnit(u, x, y);
      this.afterAction(u);
      return;
    }
    var path = findPath(u, x, y, 8000);
    if (!path) {
      if (dist(u.x, u.y, x, y) === 1) this.explainBlocked(u, x, y);
      else this.hud.flash("Can't find a route there.");
      return;
    }
    u.path = path;
    if (u.moves > 0) followPath(u);
    this.afterAction(u);
  },

  updatePath: function () {
    var g = this.pathG;
    g.clear();
    this.pathText.setText('');
    var u = this.selUnit();
    if (!u || this.hoverKey < 0 || (this.hud && this.hud.modal)) return;
    var hx = this.hoverKey % G.w, hy = Math.floor(this.hoverKey / G.w);
    if (hx === u.x && hy === u.y) return;
    var path = u.path && u.path.length && u.path[u.path.length - 1][0] === hx && u.path[u.path.length - 1][1] === hy ? u.path : findPath(u, hx, hy, 3000);
    if (!path || !path.length) return;
    var mv = UNITS[u.type].moves * 3, left = u.moves, px = u.x, py = u.y, turn = left > 0 ? 0 : 1;
    if (left <= 0) left = mv;
    for (var i = 0; i < path.length; i++) {
      if (left <= 0) { turn++; left = mv; }
      left -= moveCost(u, px, py, path[i][0], path[i][1]);
      px = path[i][0]; py = path[i][1];
      g.fillStyle(turn === 0 ? 0xffffff : 0xffd040, 0.9);
      g.fillCircle(px * TILE + 16, py * TILE + 16, i === path.length - 1 ? 5 : 3);
    }
    var last = path[path.length - 1];
    var kind = stepKind(u, last[0], last[1]);
    var label = (turn + 1) + (turn ? ' turns' : ' turn');
    if (kind === 'attack') {
      var odds = combatOdds(u, last[0], last[1]);
      label = '⚔ ' + Math.round(odds * 100) + '%';
      g.lineStyle(3, 0xff3020, 1);
      g.strokeCircle(last[0] * TILE + 16, last[1] * TILE + 16, 13);
    }
    this.pathText.setText(label).setPosition(last[0] * TILE + 16, last[1] * TILE - 4);
  },

  // ------------------------------------------------------------ orders

  doOrder: function (order) {
    var u = this.selUnit();
    if (!u || G.over) return;
    var p = G.players[G.human];
    if (order === 'found') {
      if (!UNITS[u.type].settler) return;
      var c = foundCity(u);
      if (!c) { this.hud.flash('Cannot found a city here: too close to another city, or unsuitable terrain.'); return; }
      this.afterAction(null);
      this.hud.openCity(c);
      return;
    }
    if (order === 'fortify') {
      u.order = 'fortify'; u.path = null; u.auto = false;
      if (isMilitary(u)) u.fort = true;
      else u.fort = true;
    } else if (order === 'skip') {
      u.skip = G.turn;
    } else if (order === 'wait') {
      this.selectNext(true);
      return;
    } else if (order === 'goto') {
      this.gotoMode = true;
      this.hud.flash('Click the destination for the ' + UNITS[u.type].name + '.');
      return;
    } else if (order === 'auto') {
      if (!UNITS[u.type].worker) return;
      u.auto = true; u.path = null;
      aiWorker(u, p);
    } else if (order === 'wake') {
      u.order = null; u.fort = false; u.auto = false; u.path = null; u.job = null;
      this.dirty = true;
      this.hud.refresh();
      return;
    } else if (order === 'disband') {
      var self = this;
      this.hud.confirm('Disband this ' + UNITS[u.type].name + '?', function () { killUnit(u); self.afterAction(null); });
      return;
    } else if (order.indexOf('build:') === 0) {
      var imp = order.slice(6);
      if (!startJob(u, imp)) { this.hud.flash('A ' + IMPROVEMENTS[imp].name + ' cannot be built here.'); return; }
    } else if (order === 'join') {
      var jc = cityAt(u.x, u.y);
      if (!jc || jc.owner !== G.human || !UNITS[u.type].settler) return;
      if (jc.pop >= housingCap(jc)) { this.hud.flash(jc.name + ' has no housing for more people.'); return; }
      jc.pop++;
      killUnit(u);
      this.afterAction(null);
      return;
    }
    this.afterAction(u);
  },

  onKey: function (e) {
    if (!this.hud || !this.hud.ready) return;
    if (this.hud.modal) { if (e.key === 'Escape') this.hud.closeModal(); return; }
    if (G.over) return;
    var k = e.key.toLowerCase();
    var u = this.selUnit();
    var NUM = { Numpad1: [-1, 1], Numpad2: [0, 1], Numpad3: [1, 1], Numpad4: [-1, 0], Numpad6: [1, 0], Numpad7: [-1, -1], Numpad8: [0, -1], Numpad9: [1, -1] };
    if (NUM[e.code] && u) { this.moveSelected(u.x + NUM[e.code][0], u.y + NUM[e.code][1]); return; }
    switch (k) {
      case 'enter': this.hud.endTurnPressed(); return;
      case 'escape': this.gotoMode = false; this.hud.openMenu(); return;
      case 't': this.hud.openTech(); return;
      case 'e': this.hud.openPolicies(); return;
      case 'd': this.hud.openDiplomacy(); return;
      case 'c': this.hud.openCities(); return;
      case 'h': case 'f1': case '?': this.hud.openHelp(); return;
      case 'k': this.hud.openMarket(); return;
    }
    if (!u) { if (k === 'w' || k === ' ') this.selectNext(); return; }
    var map = { b: 'found', f: 'fortify', ' ': 'skip', w: 'wait', g: 'goto', a: 'auto', r: 'build:road', i: 'build:farm', m: 'build:mine', l: 'build:lumber', q: 'build:quarry', p: 'build:pasture', delete: 'disband', j: 'join', u: 'wake' };
    if (map[k]) { e.preventDefault && e.preventDefault(); this.doOrder(map[k]); }
    if (k === 'x') this.centerOn(u.x, u.y);
  },
});
