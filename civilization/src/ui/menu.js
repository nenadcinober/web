// Start screen: choose map size, number of rivals, difficulty and civilization.

var MenuScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function MenuScene() { Phaser.Scene.call(this, { key: 'Menu' }); },

  create: function () {
    var self = this;
    this.opts = { size: 'medium', numAI: MAP_SIZES.medium.ai, difficulty: 'normal', civ: 0 };
    try {
      var saved = JSON.parse(localStorage.getItem('civ_menu') || 'null');
      if (saved && MAP_SIZES[saved.size]) this.opts = saved;
    } catch (e) { /* first visit */ }
    this.drawBackground();

    serif(this, 512, 58, 'CIVILIZATION', 60, '#ffd27a', { stroke: '#3a2a10', strokeThickness: 6 }).setOrigin(0.5);
    txt(this, 512, 108, 'Rise of Empires  —  settle, build, rule and conquer', 16, '#e8dcc0', { fontStyle: 'italic' }).setOrigin(0.5);

    var g = this.add.graphics();
    drawPanel(g, 92, 138, 840, 590);
    var x0 = 124;

    // Map size
    txt(this, x0, 160, 'Map size', 15, UI.gold, { fontStyle: 'bold' });
    this.sizeBtns = {};
    Object.keys(MAP_SIZES).forEach(function (k, i) {
      var s = MAP_SIZES[k];
      self.sizeBtns[k] = button(self, x0 + 130 + i * 160, 154, 150, 32, s.name + '  (' + s.w + '×' + s.h + ')', function () {
        self.opts.size = k;
        self.opts.numAI = Math.min(self.opts.numAI, self.maxAI());
        if (self.opts.numAI < 1) self.opts.numAI = s.ai;
        self.refresh();
      });
    });

    // Rivals
    txt(this, x0, 214, 'Rival civs', 15, UI.gold, { fontStyle: 'bold' });
    this.aiBtns = [];
    for (var n = 1; n <= 9; n++) {
      (function (n) {
        self.aiBtns.push(button(self, x0 + 130 + (n - 1) * 52, 208, 44, 32, String(n), function () { self.opts.numAI = n; self.refresh(); }, { size: 15, bold: true }));
      })(n);
    }
    this.aiHint = txt(this, x0 + 600, 216, '', 12, UI.dim);

    // Difficulty
    txt(this, x0, 268, 'Difficulty', 15, UI.gold, { fontStyle: 'bold' });
    this.diffBtns = {};
    Object.keys(DIFFICULTIES).forEach(function (k, i) {
      self.diffBtns[k] = button(self, x0 + 130 + i * 160, 262, 150, 32, DIFFICULTIES[k].name, function () { self.opts.difficulty = k; self.refresh(); });
    });
    this.diffHint = txt(this, x0 + 130, 300, '', 12, UI.dim);

    // Civilization
    txt(this, x0, 336, 'Your people', 15, UI.gold, { fontStyle: 'bold' });
    this.civBtns = [];
    CIVS.forEach(function (c, i) {
      var bx = x0 + 130 + (i % 4) * 160, by = 330 + Math.floor(i / 4) * 54;
      var b = button(self, bx, by, 150, 48, '', function () { self.opts.civ = i; self.refresh(); });
      var sw = self.add.graphics();
      sw.fillStyle(c.color, 1); sw.fillCircle(16, 24, 9); sw.lineStyle(2, 0x000000, 0.7); sw.strokeCircle(16, 24, 9);
      b.add(sw);
      b.add(txt(self, 32, 8, c.name, 14, UI.text, { fontStyle: 'bold' }));
      b.add(txt(self, 32, 27, c.leader, 11, UI.dim));
      self.civBtns.push(b);
    });

    // Start
    this.startBtn = button(this, 312, 512, 190, 46, '⚔  Start New Game', function () { self.start(); }, { size: 17, bold: true, fill: 0x5a4418, hoverFill: 0x7a5c20 });
    this.contBtn = button(this, 522, 512, 190, 46, '📜  Continue Saved', function () { self.continueGame(); }, { size: 17, bold: true });
    this.contBtn.setEnabled(hasSave());

    txt(this, x0, 580, [
      'Goal: be the last civilization standing, launch the Space Colony Ship, or have the highest score after ' + MAX_TURNS + ' turns.',
      'Mouse: left-click selects / moves, right-click moves, drag pans, wheel zooms.  Arrows pan the map.',
      'Keys: B found city · F fortify · Space skip · W next unit · G go to · A automate worker · R road · I farm · M mine',
      '         L lumber camp · Q quarry · P pasture · Del disband · Enter end turn · T tech · E edicts · D diplomacy · C cities · H help',
      'Cities need food, housing (Aqueduct, Sewer) and happiness. Buildings and units also cost goods: wood, stone, iron, horses.',
      'Keep your factions (military, clergy, merchants, peasants) content with edicts — or face rebellion.',
    ].join('\n'), 12, '#d8ccb0', { lineSpacing: 5 });

    this.loading = txt(this, 512, 744, '', 14, UI.gold).setOrigin(0.5);
    this.input.keyboard.on('keydown-ENTER', function () { self.start(); });
    this.refresh();
  },

  maxAI: function () { return { small: 4, medium: 6, large: 8, huge: 9 }[this.opts.size]; },

  drawBackground: function () {
    var cols = Math.ceil(1024 / TILE) + 1, rows = Math.ceil(768 / TILE) + 1;
    var n = fractalNoise(cols, rows, 9), m = makeValueNoise(cols, rows, 5);
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var h = n(x, y), t;
      if (h < 0.42) t = h < 0.36 ? 'ocean' : 'coast';
      else if (h > 0.7) t = 'mountains';
      else if (h > 0.62) t = 'hills';
      else t = m(x, y) > 0.58 ? 'forest' : m(x, y) > 0.4 ? 'grass' : 'plains';
      this.add.image(x * TILE + 16, y * TILE + 16, 'ter_' + t + '_' + ((x * 7 + y * 3) % TERRAIN_VARIANTS));
    }
    this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.45);
  },

  refresh: function () {
    var o = this.opts, self = this;
    Object.keys(this.sizeBtns).forEach(function (k) { self.sizeBtns[k].setActive(o.size === k); });
    var max = this.maxAI();
    this.aiBtns.forEach(function (b, i) { b.setEnabled(i + 1 <= max); b.setActive(o.numAI === i + 1); });
    this.aiHint.setText('Up to ' + max + ' on this map');
    Object.keys(this.diffBtns).forEach(function (k) { self.diffBtns[k].setActive(o.difficulty === k); });
    var d = DIFFICULTIES[o.difficulty];
    this.diffHint.setText('AI output ×' + d.ai + ', your cities have ' + d.content + ' content citizens, AI aggression ×' + d.aggression);
    this.civBtns.forEach(function (b, i) { b.setActive(o.civ === i); });
    try { localStorage.setItem('civ_menu', JSON.stringify(o)); } catch (e) { /* private mode */ }
  },

  start: function () {
    var self = this;
    this.loading.setText('Shaping the world...');
    this.time.delayedCall(30, function () {
      newGame({ size: self.opts.size, numAI: self.opts.numAI, difficulty: self.opts.difficulty, civ: self.opts.civ });
      self.scene.start('Map');
    });
  },

  continueGame: function () {
    if (loadGame()) this.scene.start('Map');
    else this.loading.setText('The saved game could not be loaded.');
  },
});
