// Modal dialogs, mixed into HudScene.

var Dialogs = {

  openModal: function (x, y, w, h, title) {
    this.closeModal(true);
    var self = this;
    var c = this.add.container(0, 0).setDepth(100);
    var blocker = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.55).setInteractive();
    c.add(blocker);
    var g = this.add.graphics();
    drawPanel(g, x, y, w, h);
    c.add(g);
    if (title) c.add(serif(this, x + w / 2, y + 12, title, 24).setOrigin(0.5, 0));
    c.add(button(this, x + w - 36, y + 10, 26, 26, '✕', function () { self.closeModal(); }, { size: 14, bold: true }));
    this.modal = c;
    this.lists = [];
    this.map.updatePath();
    return c;
  },

  closeModal: function (silent) {
    if (this.confirmBox) { this.confirmBox.destroy(); this.confirmBox = null; }
    if (!this.modal) return;
    this.lists.forEach(function (l) { l.destroy(); });
    this.lists = [];
    this.modal.destroy();
    this.modal = null;
    this.hideTip();
    this.map.dirty = true;
    if (!silent) {
      var self = this;
      this.time.delayedCall(30, function () { self.processQueue(); });
    }
  },

  confirm: function (msg, onYes) {
    var self = this;
    if (this.confirmBox) this.confirmBox.destroy();
    var c = this.add.container(0, 0).setDepth(200);
    c.add(this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.4).setInteractive());
    var g = this.add.graphics();
    drawPanel(g, 312, 300, 400, 150);
    c.add(g);
    c.add(txt(this, 512, 340, msg, 15, UI.text, { align: 'center', wordWrap: { width: 360 } }).setOrigin(0.5));
    c.add(button(this, 352, 395, 140, 34, 'Yes', function () { c.destroy(); self.confirmBox = null; onYes(); }, { bold: true }));
    c.add(button(this, 532, 395, 140, 34, 'No', function () { c.destroy(); self.confirmBox = null; }));
    this.confirmBox = c;
  },

  // ------------------------------------------------------------ city screen

  openCity: function (c, keepScroll) {
    var self = this;
    var prevScroll = keepScroll && this.lists[0] ? this.lists[0].scroll : 0;
    var m = this.openModal(30, 44, 964, 680, null);
    var p = G.players[c.owner];
    var y = refreshCity(c);
    this.map.dirty = true;

    m.add(serif(this, 512, 54, (c.buildings.palace ? '★ ' : '') + c.name, 28).setOrigin(0.5, 0));
    m.add(txt(this, 512, 90, 'Size ' + c.pop + ' · founded ' + yearOf(c.founded) + (c.origOwner !== c.owner ? ' · conquered from the ' + G.players[c.origOwner].name : ''), 12, UI.dim).setOrigin(0.5, 0));
    var cs = playerCities(p.id);
    var idx = cs.indexOf(c);
    if (cs.length > 1) {
      m.add(button(this, 50, 56, 34, 28, '◀', function () { self.openCity(cs[(idx - 1 + cs.length) % cs.length]); }, { size: 14 }));
      m.add(button(this, 90, 56, 34, 28, '▶', function () { self.openCity(cs[(idx + 1) % cs.length]); }, { size: 14 }));
    }

    // Left: tile map
    var cell = 30, gx = 54, gy = 118;
    var mg = this.add.graphics();
    m.add(mg);
    RAD_BIG.forEach(function (o) {
      var x = c.x + o[0], yy = c.y + o[1], t = tileAt(x, yy);
      if (!t) return;
      var sx = gx + (o[0] + 3) * cell, sy = gy + (o[1] + 3) * cell;
      if (!t.explored) { mg.fillStyle(0x000000, 1); mg.fillRect(sx, sy, cell, cell); return; }
      var v = (x * 7 + yy * 13 + ((x * yy) % 5)) % TERRAIN_VARIANTS;
      m.add(self.add.image(sx + cell / 2, sy + cell / 2, 'ter_' + t.t + '_' + v).setScale(cell / TILE));
      if (t.res) m.add(self.add.image(sx + 8, sy + 8, 'res_' + t.res).setScale(0.35));
      var k = tidx(x, yy);
      var mine = t.city === c.id;
      if (!mine) { mg.fillStyle(0x000000, 0.55); }
      else if (o[0] === 0 && o[1] === 0) { mg.fillStyle(0x000000, 0); }
      else if (t.worked === c.id) { mg.fillStyle(0xffffff, 0.0); }
      else mg.fillStyle(0x000000, 0.3);
      mg.fillRect(sx, sy, cell, cell);
      if (mine && (t.worked === c.id || (o[0] === 0 && o[1] === 0))) {
        var ty = o[0] === 0 && o[1] === 0 ? centerYield(c) : tileYield(t, c);
        mg.lineStyle(2, o[0] === 0 && o[1] === 0 ? 0xffd27a : 0xffffff, 1);
        mg.strokeRect(sx + 1, sy + 1, cell - 2, cell - 2);
        m.add(txt(self, sx + cell / 2, sy + cell - 9, ty.f + ' ' + ty.p + ' ' + ty.g, 9, '#ffffff', { stroke: '#000', strokeThickness: 3, fontStyle: 'bold' }).setOrigin(0.5));
      }
      if (t.imp) m.add(txt(self, sx + cell - 3, sy + 2, { farm: '≡', mine: '▲', lumber: '🪵', quarry: '▦', pasture: '╫' }[t.imp], 9, '#ffe080', { stroke: '#000', strokeThickness: 2 }).setOrigin(1, 0));
      if (k === tidx(c.x, c.y)) m.add(txt(self, sx + cell / 2, sy + 10, '🏛', 13).setOrigin(0.5));
    });
    m.add(txt(this, gx, gy + 7 * cell + 4, 'Worked tiles show 🌾 ⚒ 💰. Entertainers: ' + c.specialists, 11, UI.dim));

    // Focus
    m.add(txt(this, gx, 352, 'Citizen focus', 13, UI.gold, { fontStyle: 'bold' }));
    Object.keys(FOCUS).forEach(function (f, i) {
      m.add(button(self, gx + i * 54, 372, 51, 24, FOCUS[f].name.slice(0, 5) === 'Produ' ? 'Prod' : FOCUS[f].name, function () { c.focus = f; self.openCity(c, true); }, { size: 11 }).setActive(c.focus === f));
    });

    // Stats
    var need = growThreshold(c);
    var growth;
    if (y.surplus > 0) growth = c.pop >= y.housing ? 'Housing full — build ' + (c.buildings.aqueduct ? 'a Sewer System' : 'an Aqueduct') : 'grows in ' + plural(Math.max(1, Math.ceil((need - c.food) / y.surplus)), 'turn');
    else if (y.surplus < 0) growth = 'STARVING';
    else growth = 'stagnant';
    var lines = [
      ['🌾 Food ' + y.food + ' − ' + y.foodNeed + ' eaten = ' + (y.surplus >= 0 ? '+' : '') + y.surplus, y.surplus < 0 ? UI.bad : UI.text],
      ['    stored ' + c.food + '/' + need + ', ' + growth, UI.dim],
      ['🏠 Housing ' + c.pop + ' / ' + y.housing, c.pop >= y.housing ? UI.bad : UI.text],
      ['⚒ Production ' + y.prod + (y.disorder ? ' (disorder!)' : ''), y.disorder ? UI.bad : UI.text],
      ['💰 Commerce ' + y.commerce + ' → ' + y.gold + ' gold, ' + y.sci + ' science', UI.text],
      ['😊 Happy ' + y.happy + '   😠 Unhappy ' + y.unhappy + '   → ' + (y.disorder ? 'DISORDER' : y.mood >= 2 ? 'Celebrating' : 'Content'), y.disorder ? UI.bad : y.mood >= 0 ? UI.good : UI.text],
      ['    ' + y.content + ' content by default, luxuries +' + y.lux + (y.empire ? ', empire size −' + y.empire : '') + (c.specialists ? ', entertainers +' + c.specialists : ''), UI.dim],
      ['🛡 Garrison ' + y.garrison + ' unit' + (y.garrison === 1 ? '' : 's') + (c.buildings.walls ? ', City Walls' : ''), UI.text],
    ];
    lines.forEach(function (l, i) { m.add(txt(self, gx, 408 + i * 19, l[0], 12, l[1])); });
    var units = unitsAt(c.x, c.y).filter(function (u) { return u.owner === c.owner; });
    m.add(txt(this, gx, 568, 'Units in city (click to select)', 12, UI.gold, { fontStyle: 'bold' }));
    units.slice(0, 16).forEach(function (u, i) {
      var b = button(self, gx + (i % 8) * 34, 588 + Math.floor(i / 8) * 34, 31, 31, '', function () {
        u.fort = false; u.order = null; u.skip = null;
        self.closeModal();
        self.map.selectUnit(u, true);
      }, { tip: UNITS[u.type].name + ' (' + u.hp + '/10)' + (u.fort ? ', fortified' : '') });
      b.add(self.add.image(15, 15, 'unit_' + u.type).setScale(0.6));
      m.add(b);
    });

    // Middle: production
    var px = 336;
    m.add(txt(this, px, 118, 'Producing', 13, UI.gold, { fontStyle: 'bold' }));
    var item = c.build, cost = buildCost(c, item);
    var d = buildDef(item);
    var nameLine = item ? buildName(item) : 'Nothing — choose below!';
    m.add(txt(this, px, 138, nameLine, 16, item ? UI.text : UI.bad, { fontStyle: 'bold' }));
    if (item && item.type !== 'wealth') {
      m.add(bar(this, px, 162, 300, 12, c.prod / cost, 0xe0a030));
      var left = Math.max(0, cost - c.prod);
      var tl = y.prod > 0 ? plural(Math.max(1, Math.ceil(left / y.prod)), 'turn') : 'never';
      var gtxt = d.goods ? '  needs ' + goodsText(d.goods) + (hasGoods(p, d.goods) ? ' ✓' : ' ✗') : '';
      m.add(txt(this, px, 178, c.prod + ' / ' + cost + ' ⚒ · ' + tl + gtxt, 12, d.goods && !hasGoods(p, d.goods) ? UI.bad : UI.dim));
      var bc = buyCost(c);
      if (bc > 0) {
        m.add(button(this, px, 198, 140, 26, 'Buy for ' + bc + ' 💰', function () {
          if (buyItem(c)) { self.flash('Purchased — ' + buildName(item) + ' completes next turn.'); self.openCity(c, true); }
        }, { size: 12 }).setEnabled(p.gold >= bc));
      }
      if (d.goods && !hasGoods(p, d.goods)) {
        var miss = 0;
        for (var gk in d.goods) miss += Math.max(0, d.goods[gk] - p.goods[gk]) * GOODS[gk].price;
        m.add(button(this, px + 148, 198, 152, 26, 'Import goods ' + miss + ' 💰', function () {
          for (var gk in d.goods) { var n = d.goods[gk] - p.goods[gk]; if (n > 0) tradeGoods(p, gk, n); }
          self.openCity(c, true);
        }, { size: 12 }).setEnabled(p.gold >= miss));
      }
    } else if (item) {
      m.add(txt(this, px, 162, 'Converts production into gold (' + Math.floor(y.prod / 2) + ' per turn).', 12, UI.dim));
    }

    m.add(txt(this, px, 234, 'Change production', 13, UI.gold, { fontStyle: 'bold' }));
    var list = scrollList(this, m, px, 254, 304, 448);
    this.lists.push(list);
    var opts = buildOptions(c);
    var ry = 0, lastType = null;
    opts.forEach(function (it) {
      if (it.type !== lastType) {
        var hdr = { unit: 'Units', building: 'Buildings', wonder: 'World Wonders', project: 'Projects', wealth: 'Other' }[it.type];
        list.content.add(txt(self, 2, ry + 3, hdr, 11, UI.dim, { fontStyle: 'bold' }));
        ry += 20; lastType = it.type;
      }
      var dd = buildDef(it), co = buildCost(c, it);
      var turns = it.type === 'wealth' ? '' : y.prod > 0 ? Math.max(1, Math.ceil(Math.max(0, co - c.prod) / y.prod)) + 't' : '∞';
      var okGoods = !dd || hasGoods(p, dd.goods);
      var tip = it.type === 'unit' ? (dd.civilian ? dd.name : 'A' + dd.atk + ' D' + dd.def + ' M' + dd.moves + (dd.mounted ? ', mounted' : '') + (dd.siege ? ', siege' : '') + (dd.antiMounted ? ', +100% vs mounted' : ''))
        : it.type === 'wealth' ? 'Turn production into gold' : dd.desc;
      var b = list.clip(button(self, 0, ry, 300, 24, '', function () { setBuild(c, it); self.openCity(c, true); }, { size: 12, tip: tip }));
      b.add(txt(self, 6, 5, buildName(it), 12, okGoods ? UI.text : '#d8a080'));
      b.add(txt(self, 294, 5, (co ? co + '⚒ ' : '') + (dd && dd.goods ? goodsText(dd.goods) + ' ' : '') + turns, 11, okGoods ? UI.dim : UI.bad).setOrigin(1, 0));
      if (item && it.type === item.type && it.key === item.key) b.setActive(true);
      list.content.add(b);
      ry += 26;
    });
    list.setHeight(ry);
    list.scrollTo(prevScroll);

    // Right: buildings
    var bx = 660;
    m.add(txt(this, bx, 118, 'Buildings', 13, UI.gold, { fontStyle: 'bold' }));
    var bl = Object.keys(c.buildings).filter(function (b) { return c.buildings[b]; });
    if (!bl.length) m.add(txt(this, bx, 140, 'None yet.', 12, UI.dim));
    bl.forEach(function (b, i) {
      var bd = bdef(b), wonder = !!WONDERS[b];
      var t = txt(self, bx + (i % 2) * 150, 140 + Math.floor(i / 2) * 19, (wonder ? '✦ ' : '• ') + bd.name, 12, wonder ? UI.gold : UI.text);
      t.setInteractive();
      t.on('pointerover', function () { self.showTip(bd.desc + (bd.upkeep ? ' Upkeep ' + bd.upkeep + '💰' : '')); });
      t.on('pointerout', function () { self.hideTip(); });
      m.add(t);
    });
    var upk = 0;
    bl.forEach(function (b) { if (BUILDINGS[b]) upk += BUILDINGS[b].upkeep || 0; });
    m.add(txt(this, bx, 140 + Math.ceil(bl.length / 2) * 19 + 8, 'Building upkeep: ' + Math.floor(upk * 0.6) + ' 💰/turn', 11, UI.dim));

    var ex = 660, ey = 500;
    m.add(txt(this, ex, ey, 'Empire goods', 13, UI.gold, { fontStyle: 'bold' }));
    Object.keys(GOODS).forEach(function (gk, i) {
      m.add(txt(self, ex + (i % 2) * 150, ey + 22 + Math.floor(i / 2) * 20, GOODS[gk].icon + ' ' + GOODS[gk].name + ' ' + p.goods[gk] + ' (+' + ((p.goodsIncome || {})[gk] || 0) + ')', 12, UI.text));
    });
    m.add(txt(this, ex, ey + 70, 'Luxuries: ' + (p.luxNames.length ? p.luxNames.map(function (k) { return RESOURCES[k].icon; }).join(' ') : 'none') + '   Food types: ' + p.foodTypes, 12, UI.text));
    m.add(txt(this, ex, ey + 92, 'Treasury: ' + p.gold + ' 💰', 12, UI.gold));
    m.add(button(this, ex, ey + 120, 140, 28, 'Close', function () { self.closeModal(); }, { bold: true }));
  },

  // ------------------------------------------------------------ technology

  openTech: function () {
    var self = this;
    var p = humanPlayer();
    var m = this.openModal(12, 36, 1000, 700, 'Technology');
    var tiers = {};
    Object.keys(TECHS).forEach(function (k) { (tiers[TECHS[k].tier] = tiers[TECHS[k].tier] || []).push(k); });
    var maxTier = Math.max.apply(null, Object.keys(tiers).map(Number));
    var colW = 960 / maxTier, bw = colW - 6, bh = 38, x0 = 32, y0 = 82;
    var pos = {};
    Object.keys(tiers).forEach(function (t) {
      tiers[t].forEach(function (k, i) { pos[k] = { x: x0 + (t - 1) * colW, y: y0 + i * (bh + 12) }; });
    });
    var lines = this.add.graphics();
    m.add(lines);
    Object.keys(TECHS).forEach(function (k) {
      TECHS[k].req.forEach(function (r) {
        lines.lineStyle(1.5, p.techs[r] ? 0x8a9a6a : 0x4a4436, 0.9);
        var a = pos[r], b = pos[k];
        lines.beginPath();
        lines.moveTo(a.x + bw, a.y + bh / 2);
        lines.lineTo(a.x + bw + 3, a.y + bh / 2);
        lines.lineTo(b.x - 3, b.y + bh / 2);
        lines.lineTo(b.x, b.y + bh / 2);
        lines.strokePath();
      });
    });
    var info = txt(this, 34, 590, '', 13, UI.text, { wordWrap: { width: 940 }, lineSpacing: 4 });
    m.add(info);
    var goalPath = {};
    if (p.techGoal) (function walk(k) { if (p.techs[k] || goalPath[k]) return; goalPath[k] = true; TECHS[k].req.forEach(walk); })(p.techGoal);
    function describe(k) {
      var T = TECHS[k], cost = techCost(p, k), sci = (p.income || {}).sci || 0;
      var st = p.techs[k] ? 'Known' : canResearch(p, k) ? 'Available — ' + cost + ' 🔬' + (sci ? ' (~' + Math.ceil(cost / sci) + ' turns)' : '') : 'Requires ' + T.req.map(function (r) { return TECHS[r].name; }).join(', ');
      var un = techUnlocks(k);
      info.setText(T.name + '  —  ' + st + '\nUnlocks: ' + (un.length ? un.join(', ') : 'progress toward later discoveries') + (canResearch(p, k) || p.techs[k] ? '' : '\nClick to set as research goal: the path will be researched automatically.'));
    }
    Object.keys(TECHS).forEach(function (k) {
      var P = pos[k];
      var known = p.techs[k], avail = canResearch(p, k), cur = p.research === k;
      var fill = known ? 0x2f5226 : cur ? 0x8a6418 : avail ? 0x23466a : goalPath[k] ? 0x4a3a5a : 0x29261f;
      var b = button(self, P.x, P.y, bw, bh, '', function () {
        if (known) return;
        if (avail) { p.research = k; p.techGoal = null; }
        else { p.techGoal = k; p.research = nextTowardGoal(p); }
        self.map.dirty = true;
        self.openTech();
      }, { fill: fill, hoverFill: known ? fill : 0x5a5030 });
      b.add(txt(self, bw / 2, bh / 2, TECHS[k].name, colW < 90 ? 10 : 11, known ? '#cfe8b8' : UI.text, { align: 'center', wordWrap: { width: bw - 4 } }).setOrigin(0.5));
      b.zone.on('pointerover', function () { describe(k); });
      m.add(b);
    });
    var sci = (p.income || {}).sci || 0;
    if (p.research) {
      describe(p.research);
      var c2 = techCost(p, p.research);
      m.add(txt(this, 34, 560, 'Researching ' + TECHS[p.research].name + ': ' + p.sci + ' / ' + c2 + ' (' + sci + ' per turn)', 13, UI.gold, { fontStyle: 'bold' }));
      m.add(bar(this, 520, 563, 300, 12, p.sci / c2, 0x4aa0e0));
    } else {
      m.add(txt(this, 34, 560, 'Choose a blue technology to research (' + sci + ' science per turn, ' + p.sci + ' stored).', 13, UI.bad, { fontStyle: 'bold' }));
    }
    m.add(txt(this, 760, 700, 'Known ' + p.numTechs + ' / ' + Object.keys(TECHS).length, 12, UI.dim));
  },

  showDiscovery: function (k) {
    var self = this;
    var p = humanPlayer();
    var m = this.openModal(262, 230, 500, 270, 'Discovery!');
    m.add(txt(this, 512, 280, 'Your scholars have discovered\n' + TECHS[k].name, 18, UI.text, { align: 'center', fontStyle: 'bold' }).setOrigin(0.5, 0));
    var un = techUnlocks(k);
    m.add(txt(this, 512, 340, un.length ? 'It allows: ' + un.join(', ') : 'It brings us closer to new wonders.', 13, UI.dim, { align: 'center', wordWrap: { width: 440 } }).setOrigin(0.5, 0));
    if (!p.research) m.add(button(this, 412, 440, 200, 34, 'Choose next research', function () { self.openTech(); }, { bold: true }));
    else m.add(button(this, 412, 440, 200, 34, 'Continue (' + TECHS[p.research].name + ')', function () { self.closeModal(); }, { bold: true }));
  },

  // ------------------------------------------------------------ edicts & factions

  openPolicies: function () {
    var self = this;
    var p = humanPlayer();
    var m = this.openModal(40, 44, 944, 680, 'Edicts & Factions');
    m.add(txt(this, 64, 90, 'Tax rate', 15, UI.gold, { fontStyle: 'bold' }));
    Object.keys(TAX_RATES).forEach(function (k, i) {
      var r = TAX_RATES[k];
      m.add(button(self, 64 + i * 130, 112, 122, 30, r.name + ' (' + Math.round(r.gold * 100) + '% gold)', function () { p.tax = k; self.refreshAll(); self.openPolicies(); }, { size: 12 }).setActive(p.tax === k));
    });
    m.add(txt(this, 64, 148, 'The rest of your commerce goes to science. Low taxes please merchants and peasants.', 11, UI.dim));
    m.add(txt(this, 64, 176, 'Edicts', 15, UI.gold, { fontStyle: 'bold' }));
    var ey = 200;
    Object.keys(EDICTS).forEach(function (k) {
      var E = EDICTS[k], unlocked = hasTech(p, E.tech), on = !!p.edicts[k];
      var b = button(self, 64, ey, 56, 40, on ? 'ON' : 'OFF', function () { p.edicts[k] = !on; self.refreshAll(); self.openPolicies(); }, { bold: true, fill: on ? 0x3a6a2a : UI.panel3 });
      b.setEnabled(unlocked);
      m.add(b);
      var cost = (E.cost || 0) ? E.cost + '💰/turn' : E.costPerCity ? E.costPerCity + '💰/city/turn' : 'free';
      var fx = Object.keys(E.fx).map(function (f) { return (E.fx[f] > 0 ? '+' : '') + E.fx[f] + ' ' + FACTIONS[f].name; }).join(', ');
      m.add(txt(self, 128, ey + 1, E.name + (unlocked ? '' : '  (requires ' + TECHS[E.tech].name + ')') + '  ·  ' + cost, 13, unlocked ? UI.text : UI.dim, { fontStyle: 'bold' }));
      m.add(txt(self, 128, ey + 20, E.desc + '  ' + fx, 11, UI.dim, { wordWrap: { width: 380 } }));
      ey += 48;
    });

    var fx0 = 540;
    var targets = factionTargets(p);
    m.add(txt(this, fx0, 90, 'Factions', 15, UI.gold, { fontStyle: 'bold' }));
    var fy = 116;
    Object.keys(FACTIONS).forEach(function (f) {
      var v = p.factions[f], tg = targets[f];
      m.add(txt(self, fx0, fy, FACTIONS[f].icon + ' ' + FACTIONS[f].name, 14, UI.text, { fontStyle: 'bold' }));
      m.add(bar(self, fx0 + 130, fy + 3, 200, 14, v / 100, v < 35 ? 0xd04030 : v >= 65 ? 0x50b040 : 0xd0a030));
      m.add(txt(self, fx0 + 340, fy + 1, Math.round(v) + '% → ' + Math.round(tg.v) + '%', 12, UI.text));
      m.add(txt(self, fx0 + 10, fy + 22, tg.why.slice(0, 6).join(', ') || 'no strong feelings', 11, UI.dim, { wordWrap: { width: 400 } }));
      fy += 78;
    });
    var a = p.approval;
    var eff = a >= 85 ? '+2 happy in every city' : a >= 70 ? '+1 happy in every city' : a < 20 ? '−2 happy in every city, rebellion likely!' : a < 25 ? '−1 happy in every city, rebels may rise!' : a < 35 ? '−1 happy in every city' : 'no effect';
    m.add(txt(this, fx0, fy + 4, 'Overall approval: ' + Math.round(a) + '%', 17, a < 35 ? UI.bad : a >= 70 ? UI.good : UI.gold, { fontStyle: 'bold' }));
    m.add(txt(this, fx0, fy + 30, 'Effect: ' + eff, 13, UI.text));
    m.add(txt(this, fx0, fy + 54, 'Approval drifts a quarter of the way toward its target each turn. Below 25% armed rebels can appear near your cities.', 11, UI.dim, { wordWrap: { width: 400 } }));
    m.add(txt(this, fx0, fy + 92, 'Edict costs: ' + edictCost(p) + ' 💰 per turn', 12, UI.text));
  },

  refreshAll: function () {
    playerCities(G.human).forEach(refreshCity);
    this.map.dirty = true;
  },

  // ------------------------------------------------------------ diplomacy

  openDiplomacy: function () {
    var self = this;
    var p = humanPlayer();
    var m = this.openModal(70, 70, 884, 620, 'Diplomacy');
    var mine = militaryStrength(p.id);
    m.add(txt(this, 100, 112, 'Civilization', 12, UI.dim));
    m.add(txt(this, 420, 112, 'Relation', 12, UI.dim));
    m.add(txt(this, 510, 112, 'Military', 12, UI.dim));
    m.add(txt(this, 600, 112, 'Cities · Score', 12, UI.dim));
    var y = 136;
    G.players.forEach(function (o) {
      if (o.id === p.id || o.barbarian) return;
      var met = G.diplo[p.id][o.id].met;
      var g = self.add.graphics();
      g.fillStyle(o.alive ? o.color : 0x444444, 1); g.fillCircle(112, y + 16, 10); g.lineStyle(2, 0x000000, 0.7); g.strokeCircle(112, y + 16, 10);
      m.add(g);
      if (!met) {
        m.add(txt(self, 132, y + 8, 'Unknown civilization', 14, UI.dim));
        y += 52;
        return;
      }
      m.add(txt(self, 132, y, o.name + (o.alive ? '' : ' (destroyed)'), 15, UI.text, { fontStyle: 'bold' }));
      m.add(txt(self, 132, y + 19, o.leader + ' · ' + (o.aggression > 1.15 ? 'warlike' : o.aggression < 0.85 ? 'peaceful' : 'cautious'), 11, UI.dim));
      if (o.alive) {
        var war = G.diplo[p.id][o.id].war;
        m.add(txt(self, 420, y + 8, war ? 'WAR' : 'Peace', 14, war ? UI.bad : UI.good, { fontStyle: 'bold' }));
        var theirs = militaryStrength(o.id), r = theirs / Math.max(1, mine);
        m.add(txt(self, 510, y + 8, r > 1.3 ? 'Stronger' : r < 0.77 ? 'Weaker' : 'Similar', 13, r > 1.3 ? UI.bad : r < 0.77 ? UI.good : UI.text));
        m.add(txt(self, 600, y + 8, playerCities(o.id).length + ' · ' + score(o), 13, UI.text));
        if (war) {
          var waited = G.turn - (p['peaceAsk' + o.id] || -99);
          m.add(button(self, 720, y + 4, 200, 30, 'Propose Peace', function () {
            p['peaceAsk' + o.id] = G.turn;
            if (aiAcceptsPeace(o.id, p.id)) { makePeace(p.id, o.id); self.flash(o.leader + ' accepts peace.'); }
            else self.flash(o.leader + ': "' + pickRandom(['Never! Our armies are just getting started.', 'You will have peace when we take what is ours.', 'Not yet. Ask again later.']) + '"');
            self.openDiplomacy();
          }, { size: 12 }).setEnabled(waited >= 5));
        } else {
          m.add(button(self, 720, y + 4, 200, 30, 'Declare War', function () {
            self.confirm('Declare war on the ' + o.name + '?', function () { declareWar(p.id, o.id); self.openDiplomacy(); });
          }, { size: 12 }));
        }
      }
      y += 52;
    });
    m.add(txt(this, 100, 640, 'Your score: ' + score(p) + '   ·   Your military strength: ' + Math.round(mine) + '   ·   Game ends after turn ' + (G.settings.maxTurns || MAX_TURNS) + ' (' + yearOf((G.settings.maxTurns || MAX_TURNS)) + ')', 12, UI.dim));
  },

  // ------------------------------------------------------------ city list

  openCities: function () {
    var self = this;
    var p = humanPlayer();
    var m = this.openModal(60, 60, 904, 640, 'Cities');
    var cols = [['City', 84], ['Size', 270], ['Food', 320], ['Prod', 375], ['Gold', 425], ['Sci', 475], ['Mood', 520], ['Building', 580]];
    cols.forEach(function (c) { m.add(txt(self, c[1], 104, c[0], 12, UI.dim)); });
    var list = scrollList(this, m, 80, 126, 864, 540);
    this.lists.push(list);
    var cs = playerCities(p.id), y = 0;
    if (!cs.length) list.content.add(txt(this, 4, 4, 'You have no cities.', 13, UI.dim));
    cs.forEach(function (c) {
      var yy = c.yields || refreshCity(c);
      var b = list.clip(button(self, 0, y, 860, 26, '', function () { self.openCity(c); }, { size: 12 }));
      var turns = '';
      if (c.build && c.build.type !== 'wealth' && yy.prod > 0) turns = ' (' + Math.max(1, Math.ceil((buildCost(c, c.build) - c.prod) / yy.prod)) + ')';
      var vals = [(c.buildings.palace ? '★ ' : '') + c.name, c.pop + '/' + yy.housing, (yy.surplus >= 0 ? '+' : '') + yy.surplus, yy.prod, yy.gold, yy.sci, yy.disorder ? '😠' : yy.mood >= 2 ? '😄' : '🙂', buildName(c.build) + turns];
      vals.forEach(function (v, i) { b.add(txt(self, cols[i][1] - 80, 5, String(v), 12, i === 7 && !c.build ? UI.bad : UI.text)); });
      list.content.add(b);
      y += 29;
    });
    list.setHeight(y);
  },

  // ------------------------------------------------------------ market

  openMarket: function () {
    var self = this;
    var p = humanPlayer();
    var m = this.openModal(212, 160, 600, 420, 'Goods Market');
    m.add(txt(this, 512, 200, 'Import goods your buildings and units need, or sell surplus. Treasury: ' + p.gold + ' 💰', 12, UI.dim, { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5, 0));
    var y = 248;
    Object.keys(GOODS).forEach(function (g) {
      var G0 = GOODS[g];
      m.add(txt(self, 240, y + 6, G0.icon + ' ' + G0.name, 15, UI.text, { fontStyle: 'bold' }));
      m.add(txt(self, 360, y + 7, p.goods[g] + '  (+' + ((p.goodsIncome || {})[g] || 0) + '/turn)', 13, UI.text));
      m.add(button(self, 500, y, 130, 30, 'Buy 10 (' + G0.price * 10 + '💰)', function () { tradeGoods(p, g, 10); self.openMarket(); }, { size: 12 }).setEnabled(p.gold >= G0.price * 10));
      m.add(button(self, 640, y, 140, 30, 'Sell 10 (+' + Math.floor(G0.price / 2) * 10 + '💰)', function () { tradeGoods(p, g, -10); self.openMarket(); }, { size: 12 }).setEnabled(p.goods[g] >= 10));
      y += 48;
    });
    m.add(txt(this, 240, y + 10, 'Wood comes from Lumber Camps (and every city). Stone from Quarries. Iron from Mines on\nhills and Iron deposits, Forges and Factories. Horses from Pastures on Horses.', 11, UI.dim, { lineSpacing: 4 }));
  },

  // ------------------------------------------------------------ help & menu

  openHelp: function () {
    var m = this.openModal(70, 40, 884, 690, 'How to Play');
    var s = [
      'WINNING  Be the last civilization standing (capture or raze every rival city), complete the Space Colony Ship',
      '(needs Space Flight), or have the highest score when turn ' + (G.settings.maxTurns || MAX_TURNS) + ' ends. Lose all your cities and settlers and you are out.',
      '',
      'UNITS  Left-click a unit to select it; left- or right-click a tile to move there (multi-turn routes are followed',
      'automatically). Moving into an enemy attacks it; the red circle shows your odds. Units heal when they rest,',
      'fastest in cities. Fortify (F) gives +50% defence. Hills +50%, forest +25%, mountains +100%, walls +100%.',
      'Spearmen and pikemen get +100% against mounted units. Siege units ignore city walls but cannot capture cities.',
      '',
      'SETTLERS & WORKERS  Settlers found cities (B) at least 3 tiles from other cities. Workers build farms (I),',
      'mines (M), lumber camps (L), quarries (Q), pastures (P) and roads (R), or can be automated (A).',
      'A resource only counts (luxury, food type, strategic good) once its improvement is built inside your borders.',
      '',
      'CITIES  Click a city to manage it. Each citizen works a tile; the city tile is free. Food above what citizens eat',
      'makes the city grow, up to its housing limit (8, +8 Aqueduct, +10 Sewer). Every citizen beyond the content limit',
      'is unhappy; temples, markets, colosseums, cathedrals, luxuries, food variety, wonders and edicts make people',
      'happy. If unhappy outnumber happy, citizens are pulled off tiles to become entertainers.',
      '',
      'GOODS  Buildings and advanced units also need wood, stone, iron or horses from your stockpile. Build lumber camps,',
      'quarries, mines and pastures, or trade in the Market (K). Commerce is split into gold and science by the tax rate.',
      '',
      'EDICTS & FACTIONS (E)  Military, clergy, merchants and peasants each judge your rule. Edicts, taxes, buildings,',
      'wars and events move their approval. High approval makes cities happier; very low approval breeds rebels.',
      'Random events will ask you for decisions. Rivals may declare war, demand tribute or offer peace (D).',
      '',
      'KEYS  Arrows pan · wheel zoom · W next unit · Space skip · G go to · U wake · X centre · Enter end turn',
      'T tech · E edicts · D diplomacy · C cities · K market · H help · Esc menu · Numpad 1-9 move one tile',
    ];
    m.add(txt(this, 96, 86, s.join('\n'), 12, UI.text, { lineSpacing: 4 }));
  },

  openMenu: function () {
    var self = this;
    var m = this.openModal(362, 210, 300, 350, 'Game Menu');
    var items = [
      ['Resume', function () { self.closeModal(); }],
      ['Save Game', function () { self.closeModal(); self.flash(saveGame() ? 'Game saved.' : 'Could not save.'); }],
      ['Load Saved Game', function () {
        self.confirm('Load the last save? Unsaved progress is lost.', function () { if (loadGame()) self.restartScenes(); });
      }],
      ['How to Play', function () { self.openHelp(); }],
      ['Quit to Main Menu', function () {
        self.confirm('Quit to the main menu? (The game autosaves every turn.)', function () { self.toMenu(); });
      }],
    ];
    items.forEach(function (it, i) { m.add(button(self, 412, 262 + i * 52, 200, 40, it[0], it[1], { size: 14, bold: true })); });
  },

  restartScenes: function () {
    var sm = this.scene;
    sm.stop('Map');
    sm.start('Map');
  },

  toMenu: function () {
    Hooks = {};
    this.scene.stop('Map');
    this.scene.start('Menu');
  },

  // ------------------------------------------------------------ events & game over

  showEvent: function (evt) {
    var self = this;
    var E = EVENTS[evt.key];
    var opts = eventOptions(evt);
    var h = 210 + opts.length * 44;
    var m = this.openModal(232, 384 - h / 2, 560, h, E.title(evt.params));
    var ty = 384 - h / 2 + 58;
    if (evt.params.civ !== undefined) {
      var g = this.add.graphics();
      g.fillStyle(G.players[evt.params.civ].color, 1); g.fillCircle(512, ty + 14, 14); g.lineStyle(2, 0x000000, 0.8); g.strokeCircle(512, ty + 14, 14);
      m.add(g);
      ty += 36;
    }
    m.add(txt(this, 512, ty, E.text(evt.params), 14, UI.text, { align: 'center', wordWrap: { width: 500 }, lineSpacing: 4 }).setOrigin(0.5, 0));
    var by = 384 + h / 2 - 24 - opts.length * 44;
    opts.forEach(function (o, i) {
      m.add(button(self, 312, by + i * 44, 400, 36, o.label, function () {
        resolveEvent(evt, i);
        self.refreshAll();
        self.closeModal();
      }, { size: 13, bold: true }).setEnabled(o.enabled));
    });
    // The close button would leave the event unresolved; hide it.
    m.list[3].setVisible(false);
  },

  showGameOver: function () {
    var self = this;
    if (this.modal && this.modal.isGameOver) return;
    var o = G.over, p = humanPlayer();
    var won = o.winner === G.human && o.type !== 'defeat';
    var m = this.openModal(162, 110, 700, 540, won ? 'Victory!' : 'Game Over');
    m.isGameOver = true;
    var w = o.winner >= 0 ? G.players[o.winner] : null;
    var how = {
      conquest: (w ? 'The ' + w.name + ' have conquered the world.' : ''),
      science: (w ? 'The ' + w.name + ' launched the Space Colony Ship to Alpha Centauri!' : ''),
      score: (w ? 'Time has run out. The ' + w.name + ' are remembered as the greatest civilization.' : ''),
      defeat: 'Your civilization has been destroyed.' + (w ? ' The ' + w.name + ' lead the world now.' : ''),
    }[o.type];
    m.add(txt(this, 512, 170, how, 17, won ? UI.good : UI.text, { align: 'center', wordWrap: { width: 620 }, fontStyle: 'bold' }).setOrigin(0.5, 0));
    m.add(txt(this, 512, 230, (won ? 'Glory to ' + p.leader + '!' : 'Better luck next time, ' + p.leader + '.') + '  ·  Turn ' + o.turn + ' (' + yearOf(o.turn) + ')', 13, UI.dim).setOrigin(0.5, 0));
    var rows = G.players.filter(function (x) { return !x.barbarian; }).sort(function (a, b) { return score(b) - score(a); });
    var y = 270;
    m.add(txt(this, 230, y, 'Civilization', 12, UI.dim));
    m.add(txt(this, 520, y, 'Cities', 12, UI.dim));
    m.add(txt(this, 600, y, 'Techs', 12, UI.dim));
    m.add(txt(this, 680, y, 'Score', 12, UI.dim));
    rows.forEach(function (r, i) {
      var yy = y + 24 + i * 24;
      var g = self.add.graphics(); g.fillStyle(r.color, 1); g.fillCircle(216, yy + 8, 7); m.add(g);
      m.add(txt(self, 230, yy, r.name + (r.alive ? '' : ' (destroyed)') + (r.id === G.human ? '  ← you' : ''), 13, r.id === o.winner ? UI.gold : UI.text, { fontStyle: r.id === G.human ? 'bold' : 'normal' }));
      m.add(txt(self, 520, yy, String(playerCities(r.id).length), 13, UI.text));
      m.add(txt(self, 600, yy, String(r.numTechs), 13, UI.text));
      m.add(txt(self, 680, yy, String(score(r)), 13, UI.text));
    });
    m.add(button(this, 312, 590, 190, 40, 'New Game', function () { try { localStorage.removeItem('civ_save'); } catch (e) { /* ignore */ } self.toMenu(); }, { bold: true, size: 15 }));
    m.add(button(this, 522, 590, 190, 40, 'View the Map', function () { self.closeModal(true); }, { size: 15 }));
  },
};

Object.keys(Dialogs).forEach(function (k) { HudScene.prototype[k] = Dialogs[k]; });
