// Small Phaser UI toolkit: text, buttons, panels, scroll lists, bars.

var UI = {
  font: 'Tahoma, Verdana, Segoe UI, sans-serif',
  serif: 'Georgia, "Palatino Linotype", "Times New Roman", serif',
  emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
  panel: 0x1e1a13,
  panel2: 0x2a2419,
  panel3: 0x3a3121,
  border: 0xb08d4a,
  borderDim: 0x6a5634,
  text: '#efe6cc',
  dim: '#a89c80',
  gold: '#ffd27a',
  good: '#9fe870',
  bad: '#ff8a7a',
  blue: '#9fd8ff',
};

function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }

function txt(scene, x, y, s, size, color, extra) {
  var style = { fontFamily: UI.font, fontSize: (size || 13) + 'px', color: color || UI.text };
  if (extra) for (var k in extra) style[k] = extra[k];
  var t = scene.add.text(x, y, s, style);
  t.setResolution(2);
  return t;
}

function serif(scene, x, y, s, size, color, extra) {
  var style = { fontFamily: UI.serif, fontSize: (size || 20) + 'px', color: color || UI.gold, fontStyle: 'bold' };
  if (extra) for (var k in extra) style[k] = extra[k];
  var t = scene.add.text(x, y, s, style);
  t.setResolution(2);
  return t;
}

// Framed panel drawn into a Graphics object.
function drawPanel(g, x, y, w, h, fill, border) {
  g.fillStyle(fill === undefined ? UI.panel : fill, 0.97);
  g.fillRoundedRect(x, y, w, h, 6);
  g.lineStyle(2, border === undefined ? UI.border : border, 1);
  g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 6);
  g.lineStyle(1, 0x000000, 0.6);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 4);
}

// A clickable button. Returns a container with setEnabled(bool), setLabel(str), setActive(bool).
function button(scene, x, y, w, h, label, cb, opts) {
  opts = opts || {};
  var c = scene.add.container(x, y);
  var g = scene.add.graphics();
  var t = txt(scene, w / 2, h / 2, label, opts.size || 13, opts.color || UI.text, { fontStyle: opts.bold ? 'bold' : 'normal', align: 'center' }).setOrigin(0.5);
  var zone = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  c.add([g, t, zone]);
  c.enabled = true;
  c.activeState = false;
  c.hover = false;
  function draw() {
    g.clear();
    var fill = opts.fill || UI.panel3;
    if (c.activeState) fill = opts.activeFill || 0x6b5424;
    else if (c.hover && c.enabled) fill = opts.hoverFill || 0x4d4130;
    g.fillStyle(fill, c.enabled ? 1 : 0.5);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.lineStyle(1, c.activeState ? 0xffd27a : (c.enabled ? UI.border : UI.borderDim), 1);
    g.strokeRoundedRect(0.5, 0.5, w - 1, h - 1, 4);
    t.setAlpha(c.enabled ? 1 : 0.45);
  }
  zone.on('pointerover', function () { c.hover = true; draw(); if (opts.tip && scene.showTip) scene.showTip(opts.tip); });
  zone.on('pointerout', function () { c.hover = false; draw(); if (opts.tip && scene.hideTip) scene.hideTip(); });
  zone.on('pointerdown', function (p) {
    if (p.rightButtonDown()) return;
    if (!c.enabled) return;
    if (c.clipCheck && !c.clipCheck(p)) return;
    cb(c);
  });
  c.setEnabled = function (v) { c.enabled = v; draw(); return c; };
  c.setLabel = function (s) { t.setText(s); return c; };
  c.setActive = function (v) { c.activeState = v; draw(); return c; };
  c.label = t;
  c.zone = zone;
  draw();
  return c;
}

// Horizontal bar (approval, progress).
function bar(scene, x, y, w, h, frac, color) {
  var g = scene.add.graphics();
  g.fillStyle(0x000000, 0.6);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, 1);
  g.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), h - 2);
  g.lineStyle(1, UI.borderDim, 1);
  g.strokeRect(x, y, w, h);
  return g;
}

// Vertically scrolling list clipped to a rectangle. Add rows to list.content at y offsets
// and set list.setHeight(total). Rows added via list.row() get clip-checked buttons.
function scrollList(scene, parent, x, y, w, h) {
  var content = scene.add.container(x, y);
  parent.add(content);
  var maskG = scene.make.graphics();
  maskG.fillStyle(0xffffff);
  maskG.fillRect(x + (parent.x || 0), y + (parent.y || 0), w, h);
  content.setMask(maskG.createGeometryMask());
  var list = { content: content, x: x, y: y, w: w, h: h, total: 0, scroll: 0, maskG: maskG };
  var absX = x + (parent.x || 0), absY = y + (parent.y || 0);
  list.inside = function (p) { return p.x >= absX && p.x <= absX + w && p.y >= absY && p.y <= absY + h; };
  list.setHeight = function (t) { list.total = t; list.scrollTo(list.scroll); };
  list.scrollTo = function (s) {
    list.scroll = clamp(s, 0, Math.max(0, list.total - h));
    content.y = y - list.scroll;
  };
  list.onWheel = function (p, dy) { if (list.inside(p)) { list.scrollTo(list.scroll + dy * 0.5); return true; } return false; };
  list.clip = function (b) { b.clipCheck = list.inside; return b; };
  list.destroy = function () { maskG.destroy(); };
  return list;
}

function fmtMoves(m) {
  var whole = Math.floor(m / 3), r = m % 3;
  var frac = r === 1 ? '⅓' : r === 2 ? '⅔' : '';
  return (whole || !frac ? whole : '') + frac;
}

function plural(n, s) { return n + ' ' + s + (n === 1 ? '' : 's'); }
