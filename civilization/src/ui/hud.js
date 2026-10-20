// HUD overlay: top status bar, bottom command panel, minimap, message log, and modal dialogs
// (dialogs live in dialogs.js and are mixed into this scene).

var BOTTOM_Y = 640;

var HudScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function HudScene() { Phaser.Scene.call(this, { key: 'Hud' }); },

  create: function () {
    var self = this;
    this.ready = false;
    this.modal = null;
    this.lists = [];
    this.msgTexts = [];
    this.map = this.scene.get('Map');

    // Top bar
    var top = this.add.graphics();
    top.fillGradientStyle(0x3a2e1c, 0x3a2e1c, 0x1c160e, 0x1c160e, 1);
    top.fillRect(0, 0, 1024, VIEW_TOP);
    top.lineStyle(2, UI.border, 1);
    top.lineBetween(0, VIEW_TOP - 1, 1024, VIEW_TOP - 1);
    this.add.zone(0, 0, 1024, VIEW_TOP).setOrigin(0).setInteractive();
    this.topT = {};
    var segs = [['civ', null], ['gold', function () { self.openMarket(); }], ['sci', function () { self.openTech(); }], ['goods', function () { self.openMarket(); }], ['appr', function () { self.openPolicies(); }], ['turn', null]];
    segs.forEach(function (s) {
      var t = txt(self, 0, 6, '', 13, UI.text, { fontStyle: 'bold' });
      if (s[1]) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerdown', s[1]);
        t.on('pointerover', function () { t.setColor(UI.gold); });
        t.on('pointerout', function () { t.setColor(UI.text); });
      }
      self.topT[s[0]] = t;
    });

    // Bottom panel
    var bot = this.add.graphics();
    bot.fillGradientStyle(0x2a2216, 0x2a2216, 0x15110a, 0x15110a, 1);
    bot.fillRect(0, BOTTOM_Y, 1024, 768 - BOTTOM_Y);
    bot.lineStyle(2, UI.border, 1);
    bot.lineBetween(0, BOTTOM_Y + 1, 1024, BOTTOM_Y + 1);
    bot.lineStyle(1, UI.borderDim, 1);
    bot.lineBetween(208, BOTTOM_Y + 8, 208, 760);
    bot.lineBetween(768, BOTTOM_Y + 8, 768, 760);
    this.add.zone(0, BOTTOM_Y, 1024, 768 - BOTTOM_Y).setOrigin(0).setInteractive();

    this.buildMinimap();

    this.info = this.add.container(0, 0);
    this.actions = this.add.container(0, 0);

    this.endBtn = button(this, 778, 650, 236, 46, 'End Turn', function () { self.endTurnPressed(); }, { size: 18, bold: true, fill: 0x5a4418, hoverFill: 0x7a5c20 });
    var small = [
      ['Tech', 'T', function () { self.openTech(); }], ['Edicts', 'E', function () { self.openPolicies(); }],
      ['Diplomacy', 'D', function () { self.openDiplomacy(); }], ['Cities', 'C', function () { self.openCities(); }],
      ['Market', 'K', function () { self.openMarket(); }], ['Help', 'H', function () { self.openHelp(); }],
      ['Save', '', function () { self.flash(saveGame() ? 'Game saved.' : 'Could not save (storage unavailable).'); }], ['Menu', 'Esc', function () { self.openMenu(); }],
    ];
    small.forEach(function (s, i) {
      button(self, 778 + (i % 4) * 60, 702 + Math.floor(i / 4) * 31, 56, 27, s[0], s[2], { size: 11, tip: s[1] ? s[0] + ' (' + s[1] + ')' : null });
    });

    this.hoverText = txt(this, 512, BOTTOM_Y - 4, '', 12, '#f4ecd4', { backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 3 } }).setOrigin(0.5, 1);
    this.flashText = txt(this, 512, 520, '', 15, '#ffe8a0', { fontStyle: 'bold', backgroundColor: 'rgba(30,20,8,0.85)', padding: { x: 10, y: 6 }, align: 'center', wordWrap: { width: 700 } }).setOrigin(0.5).setAlpha(0).setDepth(50);
    this.tip = txt(this, 0, 0, '', 11, '#ffffff', { backgroundColor: 'rgba(0,0,0,0.85)', padding: { x: 5, y: 3 } }).setDepth(300).setVisible(false);

    this.input.on('wheel', function (p, objs, dx, dy) {
      if (!self.modal) return;
      self.lists.forEach(function (l) { l.onWheel(p, dy); });
    });
    this.input.on('pointermove', function (p) { if (self.tip.visible) self.tip.setPosition(Math.min(p.x + 12, 1024 - self.tip.width - 4), p.y - 24); });

    // Recent messages from the save (if any) are not replayed; start a fresh log.
    this.ready = true;
    this.map.hudReady();
    this.refresh();
  },

  showTip: function (s) { this.tip.setText(s).setVisible(true); },
  hideTip: function () { this.tip.setVisible(false); },

  flash: function (s) {
    this.tweens.killTweensOf(this.flashText);
    this.flashText.setText(s).setAlpha(1);
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: 2200, duration: 600 });
  },

  // ------------------------------------------------------------ minimap

  buildMinimap: function () {
    var self = this;
    var s = Math.min(196 / G.w, 116 / G.h);
    this.mmScale = s;
    this.mmW = Math.floor(G.w * s); this.mmH = Math.floor(G.h * s);
    this.mmX = 6 + Math.floor((198 - this.mmW) / 2); this.mmY = BOTTOM_Y + 6 + Math.floor((118 - this.mmH) / 2);
    if (this.textures.exists('minimap')) this.textures.remove('minimap');
    this.mmTex = this.textures.createCanvas('minimap', this.mmW, this.mmH);
    this.add.image(this.mmX, this.mmY, 'minimap').setOrigin(0);
    var frame = this.add.graphics();
    frame.lineStyle(1, UI.border, 1);
    frame.strokeRect(this.mmX - 1, this.mmY - 1, this.mmW + 2, this.mmH + 2);
    this.mmView = this.add.graphics();
    var z = this.add.zone(this.mmX, this.mmY, this.mmW, this.mmH).setOrigin(0).setInteractive({ useHandCursor: true });
    function jump(p) {
      var x = (p.x - self.mmX) / s, y = (p.y - self.mmY) / s;
      self.map.cameras.main.centerOn(x * TILE, y * TILE);
    }
    z.on('pointerdown', jump);
    z.on('pointermove', function (p) { if (p.isDown) jump(p); });
  },

  drawMinimap: function () {
    var ctx = this.mmTex.getContext(), s = this.mmScale;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.mmW, this.mmH);
    for (var y = 0; y < G.h; y++) for (var x = 0; x < G.w; x++) {
      var t = G.tiles[y * G.w + x];
      if (!t.explored) continue;
      var col = t.owner >= 0 ? G.players[t.owner].color : TERRAIN[t.t].color;
      if (t.owner >= 0 && isWater(t)) col = TERRAIN[t.t].color;
      ctx.fillStyle = hex(col);
      ctx.fillRect(Math.floor(x * s), Math.floor(y * s), Math.ceil(s), Math.ceil(s));
    }
    for (var id in G.cities) {
      var c = G.cities[id];
      if (!tileAt(c.x, c.y).explored) continue;
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.floor(c.x * s) - 1, Math.floor(c.y * s) - 1, Math.ceil(s) + 2, Math.ceil(s) + 2);
      ctx.fillStyle = hex(G.players[c.owner].color);
      ctx.fillRect(Math.floor(c.x * s), Math.floor(c.y * s), Math.ceil(s), Math.ceil(s));
    }
    for (id in G.units) {
      var u = G.units[id];
      if (u.owner !== G.human && (!tileAt(u.x, u.y).visible || !isMilitary(u))) continue;
      ctx.fillStyle = u.owner === G.human ? '#ffffff' : '#ff3030';
      ctx.fillRect(Math.floor(u.x * s), Math.floor(u.y * s), Math.max(1, Math.ceil(s)), Math.max(1, Math.ceil(s)));
    }
    this.mmTex.refresh();
  },

  updateMinimapView: function () {
    var v = this.map.cameras.main.worldView, s = this.mmScale / TILE;
    var x = clamp(v.x * s, 0, this.mmW), y = clamp(v.y * s, 0, this.mmH);
    var r = clamp(v.right * s, 0, this.mmW), b = clamp(v.bottom * s, 0, this.mmH);
    this.mmView.clear();
    this.mmView.lineStyle(1, 0xffffff, 0.9);
    this.mmView.strokeRect(this.mmX + x, this.mmY + y, r - x, b - y);
  },

  // ------------------------------------------------------------ status

  refresh: function () {
    if (!this.ready) return;
    var p = humanPlayer();
    var T = this.topT;
    T.civ.setText(p.name).setColor(hex(p.color));
    var inc = estimateIncome(p);
    p.income = inc;
    var net = inc.net;
    T.gold.setText('💰 ' + p.gold + ' (' + (net >= 0 ? '+' : '') + net + ')');
    if (p.research) {
      var cost = techCost(p, p.research), sci = inc.sci || 0;
      var turns = sci > 0 ? Math.max(1, Math.ceil((cost - p.sci) / sci)) : '∞';
      T.sci.setText('🔬 ' + TECHS[p.research].name + ' ' + p.sci + '/' + cost + ' (' + turns + ')');
    } else T.sci.setText('🔬 Choose research!');
    var gi = p.goodsIncome || {};
    T.goods.setText(Object.keys(GOODS).map(function (g) { return GOODS[g].icon + ' ' + p.goods[g] + (gi[g] ? '+' + gi[g] : ''); }).join('  '));
    T.appr.setText('👑 ' + Math.round(p.approval) + '%');
    T.appr.setStyle({ color: p.approval < 35 ? UI.bad : p.approval >= 70 ? UI.good : UI.text });
    T.turn.setText('Turn ' + G.turn + ' · ' + yearOf(G.turn));
    var x = 10;
    ['civ', 'gold', 'sci', 'goods', 'appr'].forEach(function (k) { T[k].setX(x); x += T[k].width + 22; });
    T.turn.setX(1024 - 10 - T.turn.width);

    this.drawMinimap();
    this.refreshInfo();
    var idle = idleUnits(G.human).length;
    this.endBtn.setLabel(G.over ? 'Game Over' : idle ? 'End Turn  (' + idle + ' idle)' : 'End Turn ▶');
    this.pruneMessages();
  },

  refreshInfo: function () {
    var self = this;
    this.info.removeAll(true);
    this.actions.removeAll(true);
    var u = this.map.selUnit();
    var X = 218, Y = BOTTOM_Y + 8;
    if (!u) {
      var idle = idleUnits(G.human).length;
      this.info.add(serif(this, X, Y, idle ? 'No unit selected' : 'All units have orders', 17));
      this.info.add(txt(this, X, Y + 28, idle ? 'Press W or click a unit to give orders.' : 'Press Enter or click End Turn to continue.\nClick one of your cities to manage it.', 12, UI.dim, { lineSpacing: 4 }));
      var p = humanPlayer();
      var cs = playerCities(p.id);
      var pop = cs.reduce(function (a, c) { return a + c.pop; }, 0);
      this.info.add(txt(this, X, Y + 74, cs.length + ' cities · population ' + pop + ' · ' + p.numTechs + ' techs · score ' + score(p), 12, UI.text));
      this.info.add(txt(this, X, Y + 92, 'Victory: conquest · Space Colony Ship · best score at turn ' + (G.settings.maxTurns || MAX_TURNS), 11, UI.dim));
      return;
    }
    var U = UNITS[u.type];
    this.info.add(this.add.image(X + 22, Y + 24, 'unit_' + u.type).setScale(1.05));
    this.info.add(serif(this, X + 50, Y, U.name + (u.vet ? ' ★' : ''), 17));
    var stats = (U.civilian ? 'Civilian' : 'Attack ' + U.atk + ' · Defence ' + U.def) + ' · Moves ' + fmtMoves(u.moves) + '/' + U.moves + ' · HP ' + u.hp + '/10';
    this.info.add(txt(this, X + 50, Y + 24, stats, 12, UI.text));
    var status = '';
    if (u.order === 'build' && u.job) status = 'Building ' + IMPROVEMENTS[u.job.imp].name + ' (' + plural(u.job.left, 'turn') + ')';
    else if (u.auto) status = 'Automated';
    else if (u.path) status = 'Moving (' + u.path.length + ' tiles left)';
    else if (u.fort) status = isMilitary(u) ? 'Fortified (+50% defence)' : 'Sleeping';
    var t = tileAt(u.x, u.y);
    var tdesc = TERRAIN[t.t].name + (t.res ? ', ' + RESOURCES[t.res].name : '') + (t.imp ? ', ' + IMPROVEMENTS[t.imp].name : '') + (t.road ? ', road' : '');
    if (TERRAIN[t.t].def) tdesc += ' (+' + Math.round(TERRAIN[t.t].def * 100) + '% def)';
    this.info.add(txt(this, X + 50, Y + 41, (status ? status + ' · ' : '') + tdesc, 11, UI.dim));
    // Other units on the tile.
    var here = unitsAt(u.x, u.y).filter(function (o) { return o.owner === G.human; });
    if (here.length > 1) {
      here.slice(0, 8).forEach(function (o, i) {
        var b = button(self, 600 + (i % 4) * 40, Y + 2 + Math.floor(i / 4) * 30, 36, 28, '', function () { self.map.selectUnit(o); }, { tip: UNITS[o.type].name + ' ' + o.hp + '/10' });
        b.add(self.add.image(18, 14, 'unit_' + o.type).setScale(0.55));
        if (o === u) b.setActive(true);
        self.info.add(b);
      });
    }
    // Actions
    var acts = [];
    var city = cityAt(u.x, u.y);
    if (U.settler) {
      acts.push(['Found City', 'B', 'found', canFoundCity(u.x, u.y)]);
      if (city && city.owner === G.human) acts.push(['Join City', 'J', 'join', city.pop < housingCap(city)]);
    }
    if (U.worker) {
      acts.push(['Automate', 'A', 'auto', true]);
      Object.keys(IMPROVEMENTS).forEach(function (k) {
        var key = { road: 'R', farm: 'I', mine: 'M', lumber: 'L', quarry: 'Q', pasture: 'P' }[k];
        if (canBuildImp(u, k)) acts.push([IMPROVEMENTS[k].name, key, 'build:' + k, true]);
      });
    }
    acts.push([isMilitary(u) ? 'Fortify' : 'Sleep', 'F', 'fortify', !u.fort]);
    if (u.fort || u.order || u.auto || u.path) acts.push(['Wake', 'U', 'wake', true]);
    acts.push(['Skip', 'Space', 'skip', true]);
    acts.push(['Go To', 'G', 'goto', true]);
    acts.push(['Disband', 'Del', 'disband', true]);
    var bx = X, by = Y + 66, bw = 86;
    acts.slice(0, 12).forEach(function (a, i) {
      var b = button(self, bx + (i % 6) * (bw + 4), by + Math.floor(i / 6) * 28, bw, 25, a[0], function () { self.map.doOrder(a[2]); }, { size: 11, tip: a[0] + (a[1] ? ' (' + a[1] + ')' : '') });
      b.setEnabled(a[3]);
      self.actions.add(b);
    });
  },

  setHover: function (t, sticky) {
    if (!t) { this.hoverText.setText(''); return; }
    var tile = tileAt(t[0], t[1]);
    if (!tile.explored) { this.hoverText.setText('Unexplored'); return; }
    var y = tileYield(tile, null);
    var parts = [TERRAIN[tile.t].name + '  ' + y.f + '🌾 ' + y.p + '⚒ ' + y.g + '💰'];
    if (tile.res) {
      var R = RESOURCES[tile.res];
      parts.push(R.icon + ' ' + R.name + (R.imp ? ' (needs ' + IMPROVEMENTS[R.imp].name + ')' : ''));
    }
    if (tile.imp) parts.push(IMPROVEMENTS[tile.imp].name);
    if (tile.road) parts.push('Road');
    if (tile.owner >= 0) parts.push(G.players[tile.owner].adj + ' territory');
    var c = cityAt(t[0], t[1]);
    if (c) parts.push(c.name + ' (size ' + c.pop + ')');
    if (tile.visible) {
      var us = unitsAt(t[0], t[1]);
      if (us.length) {
        var top = us[0];
        parts.push(G.players[top.owner].adj + ' ' + UNITS[top.type].name + (us.length > 1 ? ' +' + (us.length - 1) : '') + ' (' + top.hp + '/10)');
      }
    }
    this.hoverText.setText(parts.join('  ·  '));
  },

  // ------------------------------------------------------------ messages

  addMessage: function (m) {
    var self = this;
    var t = txt(this, 8, 0, m.text, 12, m.color, { backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 2 } });
    t.msg = m;
    if (m.x !== undefined) {
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', function () { self.map.centerOn(m.x, m.y, true); });
    }
    this.msgTexts.push(t);
    while (this.msgTexts.length > 7) this.msgTexts.shift().destroy();
    this.layoutMessages();
  },

  pruneMessages: function () {
    var keep = [];
    this.msgTexts.forEach(function (t) { if (t.msg.turn >= G.turn - 1) keep.push(t); else t.destroy(); });
    this.msgTexts = keep;
    this.layoutMessages();
  },

  layoutMessages: function () {
    var y = VIEW_TOP + 6;
    this.msgTexts.forEach(function (t) {
      t.setY(y);
      t.setAlpha(t.msg.turn === G.turn ? 1 : 0.6);
      y += t.height + 2;
    });
  },

  // ------------------------------------------------------------ turn flow

  endTurnPressed: function () {
    if (this.modal || G.over) { if (G.over) this.showGameOver(); return; }
    var p = humanPlayer();
    var noBuild = playerCities(p.id).filter(function (c) { return !c.build; });
    if (noBuild.length && this.promptCity !== G.turn) {
      this.promptCity = G.turn;
      this.openCity(noBuild[0]);
      this.flash(noBuild[0].name + ' needs something to build.');
      return;
    }
    var avail = Object.keys(TECHS).some(function (k) { return canResearch(p, k); });
    if (!p.research && avail && this.promptTech !== G.turn) {
      this.promptTech = G.turn;
      this.openTech();
      return;
    }
    var self = this;
    this.endBtn.setLabel('Please wait...').setEnabled(false);
    this.time.delayedCall(20, function () {
      endTurn();
      self.endBtn.setEnabled(true);
      if (!G.over) saveGame();
      self.map.dirty = true;
      self.map.selectNext();
      self.refresh();
      self.processQueue();
    });
  },

  // Show the next pending popup: events, discoveries, game over.
  processQueue: function () {
    if (!this.ready || this.modal) return;
    if (G.over) { this.showGameOver(); return; }
    if (G.events.length) { this.showEvent(G.events[0]); return; }
    if (this.map.pendingTech) {
      var k = this.map.pendingTech;
      this.map.pendingTech = null;
      this.showDiscovery(k);
    }
  },
});
