'use strict';

// Every sprite is painted on a canvas at boot in a naive-art manner (flat colours, dark outlines, rosy cheeks),
// at twice the display size so it stays crisp when the map is zoomed in. Sprites are shown at scale 0.5.

const OUT = '#2b1a0e';

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w * 2, h * 2);
  const c = tex.getContext();
  c.save(); c.scale(2, 2);
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c, w, h);
  c.restore();
  tex.refresh();
}

function ell(c, x, y, rx, ry, fill, stroke, lw, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); }
}

function poly(c, pts, fill, stroke, lw) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); }
}

function line(c, x1, y1, x2, y2, color, w) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = color; c.lineWidth = w; c.stroke();
}

function rrect(c, x, y, w, h, r, fill, stroke, lw) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); }
}

function face(c, x, y, r, o = {}) {
  ell(c, x, y, r, r * 1.05, o.skin || '#f3c9a0', OUT, 1.3);
  ell(c, x - r * 0.45, y + r * 0.3, r * 0.22, r * 0.16, '#e86a5a');
  ell(c, x + r * 0.45, y + r * 0.3, r * 0.22, r * 0.16, '#e86a5a');
  ell(c, x - r * 0.33, y - r * 0.08, r * 0.1, r * 0.13, OUT);
  ell(c, x + r * 0.33, y - r * 0.08, r * 0.1, r * 0.13, OUT);
  if (o.mustache) {
    c.fillStyle = '#3a2412';
    c.beginPath();
    c.ellipse(x - r * 0.25, y + r * 0.42, r * 0.32, r * 0.13, 0.25, 0, Math.PI * 2);
    c.ellipse(x + r * 0.25, y + r * 0.42, r * 0.32, r * 0.13, -0.25, 0, Math.PI * 2);
    c.fill();
  } else {
    c.beginPath(); c.arc(x, y + r * 0.38, r * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
    c.strokeStyle = '#8a2a1a'; c.lineWidth = 1; c.stroke();
  }
}

// A frontal villager standing on (cx, by). Returns where the hands are so props can be drawn in them.
function person(c, cx, by, o) {
  const skirt = !!o.skirt;
  if (skirt) {
    poly(c, [cx - 7, by - 24, cx + 7, by - 24, cx + 12, by - 4, cx - 12, by - 4], o.skirt, OUT, 1.3);
    if (o.apron) {
      poly(c, [cx - 5, by - 22, cx + 5, by - 22, cx + 7, by - 6, cx - 7, by - 6], o.apron, OUT, 1);
      for (let i = 0; i < 3; i++) ell(c, cx - 3 + i * 3, by - 9, 1, 1, '#d8262e');
    }
    ell(c, cx - 4, by - 2, 3, 2.2, OUT); ell(c, cx + 4, by - 2, 3, 2.2, OUT);
  } else {
    rrect(c, cx - 7, by - 16, 6, 14, 1.5, o.pants || '#2c2c38', OUT, 1.2);
    rrect(c, cx + 1, by - 16, 6, 14, 1.5, o.pants || '#2c2c38', OUT, 1.2);
    ell(c, cx - 4.5, by - 2, 4, 2.4, OUT); ell(c, cx + 4.5, by - 2, 4, 2.4, OUT);
  }
  // torso
  poly(c, [cx - 8, by - 30, cx + 8, by - 30, cx + 9, by - (skirt ? 21 : 15), cx - 9, by - (skirt ? 21 : 15)], o.shirt, OUT, 1.3);
  if (o.vest) {
    poly(c, [cx - 8, by - 30, cx - 2, by - 30, cx - 3, by - 16, cx - 9, by - 16], o.vest, OUT, 1);
    poly(c, [cx + 2, by - 30, cx + 8, by - 30, cx + 9, by - 16, cx + 3, by - 16], o.vest, OUT, 1);
    ell(c, cx - 5, by - 23, 0.9, 0.9, '#e8c040'); ell(c, cx + 5, by - 23, 0.9, 0.9, '#e8c040');
  }
  if (o.embroidery) for (let i = 0; i < 4; i++) ell(c, cx - 4.5 + i * 3, by - 28, 1, 1, o.embroidery);
  // arms
  rrect(c, cx - 12, by - 29, 4.5, 13, 2, o.sleeve || o.shirt, OUT, 1.1);
  rrect(c, cx + 7.5, by - 29, 4.5, 13, 2, o.sleeve || o.shirt, OUT, 1.1);
  ell(c, cx - 9.8, by - 15, 2.4, 2.4, o.skin || '#f3c9a0', OUT, 1);
  ell(c, cx + 9.8, by - 15, 2.4, 2.4, o.skin || '#f3c9a0', OUT, 1);
  // head
  const hy = by - 37;
  if (o.scarf) {
    poly(c, [cx - 9, hy - 2, cx + 9, hy - 2, cx + 7, hy + 10, cx - 7, hy + 10], o.scarf, OUT, 1.2);
  }
  face(c, cx, hy, 7, o);
  if (o.scarf) {
    c.beginPath(); c.arc(cx, hy, 8.2, Math.PI * 1.02, Math.PI * 1.98);
    c.lineTo(cx + 8.2, hy + 1); c.lineTo(cx - 8.2, hy + 1); c.closePath();
    c.fillStyle = o.scarf; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    if (o.dots) for (let i = 0; i < 5; i++) ell(c, cx - 5 + i * 2.5, hy - 4 - Math.sin(i / 4 * Math.PI) * 2, 0.9, 0.9, o.dots);
    poly(c, [cx + 4, hy + 7, cx + 9, hy + 12, cx + 6, hy + 13], o.scarf, OUT, 1);
  }
  if (o.hat === 'black') {
    ell(c, cx, hy - 5, 11, 2.6, '#1c1814', OUT, 1.2);
    rrect(c, cx - 6.5, hy - 13, 13, 8.5, 2.5, '#1c1814', OUT, 1.2);
    line(c, cx - 6, hy - 7, cx + 6, hy - 7, '#8a1c1c', 1.6);
  } else if (o.hat === 'green') {
    ell(c, cx, hy - 5, 10, 2.4, '#3d5a2a', OUT, 1.2);
    poly(c, [cx - 6, hy - 6, cx - 4, hy - 13, cx + 4, hy - 13, cx + 6, hy - 6], '#4b6d33', OUT, 1.2);
    poly(c, [cx + 4, hy - 9, cx + 11, hy - 20, cx + 7, hy - 9], '#e8e2c8', OUT, 0.8);
  } else if (o.hat === 'grey') {
    ell(c, cx, hy - 5, 10, 2.4, '#55585e', OUT, 1.2);
    rrect(c, cx - 6, hy - 12, 12, 7.5, 3, '#6b6e75', OUT, 1.2);
    line(c, cx - 6, hy - 7, cx + 6, hy - 7, '#2a2a30', 1.4);
  }
  return { lx: cx - 9.8, rx: cx + 9.8, hy: by - 15 };
}

function towerBase(c, cx, cy, level) {
  const cols = [['#8a5a32', '#6e4424'], ['#9a9a92', '#77776f'], ['#c8463a', '#a33328'], ['#e6b830', '#b88a14']][level];
  ell(c, cx, cy + 2, 21, 9, 'rgba(0,0,0,0.25)');
  ell(c, cx, cy, 20, 8, cols[1], OUT, 1.4);
  ell(c, cx, cy - 2, 20, 8, cols[0], OUT, 1.4);
  if (level === 0) for (let i = -2; i <= 2; i++) line(c, cx + i * 7, cy - 9, cx + i * 7, cy + 5, 'rgba(60,30,10,0.5)', 0.8);
  if (level >= 2) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    ell(c, cx + Math.cos(a) * 15, cy - 2 + Math.sin(a) * 5.5, 1.8, 1.8, level === 3 ? '#fff6d0' : '#fff');
  }
}

function makeTowerTextures(scene) {
  for (let l = 0; l < 4; l++) canvasTex(scene, 'base' + l, 44, 22, c => towerBase(c, 22, 11, l));

  canvasTex(scene, 't_dudek', 44, 56, c => {
    const h = person(c, 20, 54, { shirt: '#fbf8ee', vest: '#1f1d22', pants: '#2b2b33', hat: 'black', mustache: true, embroidery: '#c8262e' });
    line(c, h.rx + 1, h.hy + 12, h.rx + 1, 4, '#8a5a2a', 2.2);
    line(c, h.rx - 4, 8, h.rx + 6, 8, '#6a6a70', 1.8);
    for (let i = -1; i <= 1; i++) line(c, h.rx + 1 + i * 4.5, 8, h.rx + 1 + i * 4.5, 0.5, '#6a6a70', 1.5);
  });

  canvasTex(scene, 't_regica', 44, 56, c => {
    const h = person(c, 22, 54, { shirt: '#fbf8ee', skirt: '#2e57a8', apron: '#fbf8ee', scarf: '#d8262e', dots: '#fff', embroidery: '#2e57a8' });
    ell(c, h.rx + 4, h.hy - 2, 7, 5, '#3a3a40', OUT, 1.3);
    rrect(c, h.rx - 3, h.hy - 8, 14, 3, 1, '#4a4a52', OUT, 1);
    line(c, h.rx + 11, h.hy - 6, h.rx + 15, h.hy - 8, OUT, 1.6);
    ell(c, h.rx + 4, h.hy - 11, 3, 1.5, 'rgba(255,255,255,0.8)');
  });

  canvasTex(scene, 't_mamica', 44, 56, c => {
    const h = person(c, 20, 54, { shirt: '#3a3036', skirt: '#2a2228', apron: '#5a4a52', scarf: '#151215', skin: '#eec09c' });
    line(c, h.rx + 2, h.hy + 13, h.rx + 4, 8, '#9a6a36', 1.8);
    poly(c, [h.rx - 1, h.hy + 10, h.rx + 7, h.hy + 10, h.rx + 9, h.hy + 17, h.rx - 3, h.hy + 17], '#d8b04a', OUT, 1);
    line(c, h.lx - 1, h.hy, h.lx - 3, h.hy - 9, '#eec09c', 2.4);
  });

  canvasTex(scene, 't_lovec', 44, 56, c => {
    const h = person(c, 20, 54, { shirt: '#4e6b36', sleeve: '#4e6b36', pants: '#3a3226', hat: 'green', mustache: true });
    line(c, h.lx - 2, h.hy + 4, h.rx + 12, h.hy - 18, '#5a3a1e', 3);
    line(c, h.lx + 8, h.hy - 6, h.rx + 13, h.hy - 19, '#2a2a2e', 1.8);
  });

  canvasTex(scene, 't_pcele', 44, 56, c => {
    rrect(c, 8, 38, 28, 6, 1, '#7a4a24', OUT, 1.3);
    line(c, 12, 44, 12, 54, '#7a4a24', 2.5); line(c, 32, 44, 32, 54, '#7a4a24', 2.5);
    c.beginPath(); c.moveTo(6, 38); c.bezierCurveTo(6, 8, 38, 8, 38, 38); c.closePath();
    c.fillStyle = '#d9a83c'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
    for (let i = 1; i < 5; i++) {
      const y = 38 - i * 6;
      const half = Math.sqrt(Math.max(0, 1 - Math.pow((38 - y) / 27, 2))) * 16;
      line(c, 22 - half, y, 22 + half, y, '#a27424', 1.2);
    }
    ell(c, 22, 33, 4, 3, '#2a1a0e');
    for (const [x, y] of [[8, 14], [36, 18], [30, 6]]) {
      ell(c, x, y, 2.6, 1.8, '#f2c21c', OUT, 0.8);
      line(c, x - 1, y - 1.8, x - 1, y + 1.8, OUT, 0.8);
      ell(c, x + 0.5, y - 2.5, 1.6, 1, 'rgba(255,255,255,0.85)');
    }
  });

  canvasTex(scene, 't_zvono', 44, 56, c => {
    rrect(c, 9, 24, 26, 30, 1, '#f6f2e6', OUT, 1.4);
    poly(c, [5, 26, 22, 8, 39, 26], '#b8322a', OUT, 1.4);
    poly(c, [17, 40, 27, 40, 27, 54, 17, 54], '#5a3a20', OUT, 1.2);
    c.beginPath(); c.arc(22, 40, 5, Math.PI, 0); c.fillStyle = '#5a3a20'; c.fill(); c.stroke();
    rrect(c, 17, 13, 10, 10, 1, '#3a2a1e', OUT, 1);
    line(c, 22, 2, 22, 8, OUT, 1.5); line(c, 19, 4.5, 25, 4.5, OUT, 1.5);
    ell(c, 13, 32, 2, 2, '#2e57a8'); ell(c, 31, 32, 2, 2, '#2e57a8');
  });
  canvasTex(scene, 'bell', 12, 12, c => {
    c.beginPath(); c.moveTo(2, 10); c.quadraticCurveTo(2, 1, 6, 1); c.quadraticCurveTo(10, 1, 10, 10); c.closePath();
    c.fillStyle = '#e6b830'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    ell(c, 6, 10.5, 1.4, 1.2, OUT);
  });
}

function makeEnemyTextures(scene) {
  for (let f = 0; f < 2; f++) {
    const s = f ? 1 : -1;
    canvasTex(scene, 'e_lisica' + f, 40, 30, c => {
      c.beginPath(); c.moveTo(6, 16); c.quadraticCurveTo(-2, 8 + s * 2, 2, 4); c.quadraticCurveTo(10, 8, 12, 15); c.closePath();
      c.fillStyle = '#e07a2a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
      ell(c, 2.5, 5, 2.6, 2.2, '#fff8ee');
      line(c, 13, 20, 13 + s * 3, 28, OUT, 2.2); line(c, 25, 20, 25 - s * 3, 28, OUT, 2.2);
      line(c, 17, 20, 17 - s * 2, 28, '#3a2010', 2); line(c, 28, 20, 28 + s * 2, 28, '#3a2010', 2);
      ell(c, 20, 16, 11, 6, '#e8812e', OUT, 1.3);
      ell(c, 20, 19, 7, 2.5, '#fff1df');
      poly(c, [28, 12, 38, 15, 30, 19], '#e8812e', OUT, 1.2);
      ell(c, 30, 12, 5.5, 5, '#e8812e', OUT, 1.2);
      poly(c, [27, 9, 28, 2, 31, 8], '#e8812e', OUT, 1); poly(c, [31, 8, 33, 2, 34, 9], '#e8812e', OUT, 1);
      ell(c, 32, 11.5, 1, 1.2, OUT); ell(c, 38, 15, 1.2, 1.1, OUT);
    });
    canvasTex(scene, 'e_guska' + f, 30, 32, c => {
      line(c, 13, 24, 13 + s * 2, 30, '#e88a1a', 1.8); line(c, 17, 24, 17 - s * 2, 30, '#e88a1a', 1.8);
      ell(c, 14, 20, 10, 6.5, '#fbfbf6', OUT, 1.3);
      poly(c, [4, 18, 0, 14 + s, 6, 16], '#f0f0ea', OUT, 1);
      c.beginPath(); c.moveTo(19, 18); c.quadraticCurveTo(24, 12, 21, 4); c.lineTo(25, 4); c.quadraticCurveTo(28, 13, 23, 20); c.closePath();
      c.fillStyle = '#fbfbf6'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
      ell(c, 23, 5, 3.6, 3.2, '#fbfbf6', OUT, 1.1);
      poly(c, [25.5, 4, 30, 5.5, 25.5, 7], '#ee8a1a', OUT, 0.9);
      ell(c, 23.5, 4, 0.9, 0.9, OUT);
      c.beginPath(); c.arc(13, 19, 5, 0.2, 2.6); c.strokeStyle = '#c8c8c0'; c.lineWidth = 1; c.stroke();
    });
    canvasTex(scene, 'e_vrana' + f, 36, 28, c => {
      ell(c, 18, 16, 10, 5.5, '#1e1e24', OUT, 1.2);
      poly(c, [8, 15, 1, 12 + s, 2, 19], '#1e1e24', OUT, 1);
      ell(c, 27, 12, 4.5, 4.2, '#1e1e24', OUT, 1.2);
      poly(c, [30, 11, 36, 13, 30, 14.5], '#4a4a4a', OUT, 0.9);
      ell(c, 28, 11, 1.1, 1.1, '#f2d24a');
      if (f) poly(c, [13, 14, 20, 0, 24, 14], '#2a2a32', OUT, 1.2);
      else poly(c, [13, 17, 21, 27, 24, 17], '#2a2a32', OUT, 1.2);
    });
    canvasTex(scene, 'e_purger' + f, 40, 44, c => {
      const wheel = (x) => {
        ell(c, x, 36, 7, 7, null, OUT, 1.6);
        for (let i = 0; i < 3; i++) {
          const a = i / 3 * Math.PI + f * 0.5;
          line(c, x + Math.cos(a) * 6, 36 + Math.sin(a) * 6, x - Math.cos(a) * 6, 36 - Math.sin(a) * 6, '#777', 0.7);
        }
      };
      wheel(8); wheel(32);
      line(c, 8, 36, 18, 26, '#c8262e', 1.8); line(c, 18, 26, 30, 26, '#c8262e', 1.8);
      line(c, 30, 26, 32, 36, '#c8262e', 1.8); line(c, 18, 26, 20, 36, '#c8262e', 1.8);
      line(c, 30, 26, 29, 19, OUT, 1.4); line(c, 26, 19, 31, 19, OUT, 1.5);
      line(c, 17, 21, 20 + s * 2, 33, '#3a3a50', 3); line(c, 17, 21, 18 - s * 2, 33, '#2a2a3e', 3);
      poly(c, [13, 22, 15, 10, 23, 10, 22, 22], '#8a7a5a', OUT, 1.2);
      line(c, 19, 10, 19, 17, '#c8262e', 1.6);
      line(c, 21, 14, 28, 19, '#8a7a5a', 2.6);
      face(c, 19, 6, 4.8, { mustache: false });
      ell(c, 21, 5.2, 1.6, 1.4, null, OUT, 0.8);
      ell(c, 19, 2, 7, 1.6, '#55585e', OUT, 1);
      rrect(c, 15, -3, 8, 5, 2, '#6b6e75', OUT, 1);
    });
    canvasTex(scene, 'e_poreznik' + f, 34, 48, c => {
      line(c, 14, 34, 14 + s * 4, 46, '#3c3e46', 4); line(c, 20, 34, 20 - s * 4, 46, '#30323a', 4);
      ell(c, 14 + s * 4, 46, 3, 1.6, OUT); ell(c, 20 - s * 4, 46, 3, 1.6, OUT);
      rrect(c, 9, 17, 16, 19, 3, '#5a5d66', OUT, 1.3);
      poly(c, [15, 17, 19, 17, 17, 26], '#fff');
      line(c, 17, 18, 17, 25, '#7a1a1a', 1.5);
      line(c, 21, 20, 25 + s, 30, '#5a5d66', 3.5);
      rrect(c, 22 + s, 30, 11, 8, 1, '#5a3418', OUT, 1.1);
      line(c, 26 + s, 30, 29 + s, 30, '#d8b04a', 1.3);
      face(c, 17, 11, 5.5);
      ell(c, 15, 10, 1.9, 1.7, null, OUT, 0.8); ell(c, 19.5, 10, 1.9, 1.7, null, OUT, 0.8);
      ell(c, 17, 6, 8.5, 1.8, '#2a2a30', OUT, 1);
      rrect(c, 12, 0, 10, 6.5, 2.5, '#36363e', OUT, 1);
    });
    canvasTex(scene, 'e_vepar' + f, 48, 34, c => {
      line(c, 12, 22, 12 + s * 3, 32, OUT, 3); line(c, 34, 22, 34 - s * 3, 32, OUT, 3);
      line(c, 17, 22, 17 - s * 3, 32, '#2a1a10', 2.6); line(c, 38, 22, 38 + s * 2, 32, '#2a1a10', 2.6);
      ell(c, 24, 17, 18, 10, '#5a4030', OUT, 1.4);
      for (let i = 0; i < 9; i++) line(c, 12 + i * 3, 8 + Math.abs(i - 4) * 0.4, 13 + i * 3, 4 + Math.abs(i - 4) * 0.4, '#3a2618', 1.3);
      poly(c, [36, 10, 47, 15, 46, 22, 37, 24], '#5a4030', OUT, 1.3);
      ell(c, 46, 18, 2, 3, '#c8907a', OUT, 1);
      c.beginPath(); c.moveTo(42, 21); c.quadraticCurveTo(45, 24, 44, 17); c.strokeStyle = '#fbf6e6'; c.lineWidth = 1.6; c.stroke();
      ell(c, 40, 14, 1.1, 1.1, '#e8d050');
      poly(c, [35, 9, 37, 3, 39, 10], '#5a4030', OUT, 1);
      line(c, 6, 15, 2, 18 + s * 2, OUT, 1.4);
    });
    // bosses
    canvasTex(scene, 'e_komisija' + f, 64, 50, c => {
      const wy = 42;
      rrect(c, 4, 22, 56, 16, 6, '#7aa6c8', OUT, 1.6);
      c.beginPath(); c.moveTo(14, 23); c.quadraticCurveTo(18, 4, 34, 4); c.quadraticCurveTo(48, 4, 52, 23); c.closePath();
      c.fillStyle = '#7aa6c8'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke();
      poly(c, [19, 21, 22, 9, 32, 9, 32, 21], '#d8eef8', OUT, 1.1);
      poly(c, [35, 21, 35, 9, 44, 9, 48, 21], '#d8eef8', OUT, 1.1);
      for (const [x, hat] of [[25, '#36363e'], [40, '#55585e']]) {
        face(c, x, 15, 4.2, { mustache: x > 30 });
        ell(c, x, 11, 6, 1.4, hat, OUT, 0.8); rrect(c, x - 3.5, 7, 7, 4, 1.5, hat, OUT, 0.8);
      }
      ell(c, 58, 30, 2.2, 2, '#f2e27a', OUT, 1); rrect(c, 2, 31, 6, 3, 1, '#c8262e', OUT, 0.8);
      for (const x of [16, 48]) {
        ell(c, x, wy, 7, 7, '#222', OUT, 1.4); ell(c, x, wy, 3, 3, '#aaa');
        line(c, x, wy, x + Math.cos(f * 1.5) * 3, wy + Math.sin(f * 1.5) * 3, OUT, 1);
      }
      rrect(c, 26, 26, 12, 7, 1, '#fff', OUT, 0.8);
      c.fillStyle = OUT; c.font = 'bold 5px sans-serif'; c.fillText('750', 28, 31.5);
    });
    canvasTex(scene, 'e_jastreb' + f, 60, 44, c => {
      ell(c, 30, 24, 15, 8, '#7a5230', OUT, 1.4);
      for (let i = 0; i < 4; i++) ell(c, 24 + i * 4, 26, 2, 3, '#e8d8b8');
      poly(c, [15, 22, 4, 17 + (f ? -3 : 3), 6, 28], '#6a4628', OUT, 1.2);
      ell(c, 44, 19, 6.5, 6, '#e8e0cc', OUT, 1.3);
      poly(c, [49, 18, 56, 21, 49, 23], '#e8b830', OUT, 1);
      ell(c, 46, 17.5, 1.4, 1.4, OUT);
      if (f) poly(c, [20, 20, 30, 0, 42, 2, 38, 20], '#8a6038', OUT, 1.4);
      else poly(c, [20, 27, 28, 44, 40, 42, 38, 27], '#8a6038', OUT, 1.4);
    });
    canvasTex(scene, 'e_bager' + f, 70, 56, c => {
      rrect(c, 6, 40, 46, 12, 6, '#2a2a2a', OUT, 1.5);
      for (let i = 0; i < 4; i++) ell(c, 13 + i * 11, 46, 4, 4, '#555', OUT, 1);
      line(c, 10 + f * 3, 41, 48 + f * 3, 41, '#666', 1);
      rrect(c, 8, 26, 40, 15, 2, '#f2c21c', OUT, 1.5);
      rrect(c, 12, 10, 18, 17, 2, '#f2c21c', OUT, 1.5);
      rrect(c, 15, 13, 12, 9, 1, '#bfe2f2', OUT, 1);
      face(c, 21, 17, 3.6, { mustache: true });
      line(c, 40, 28, 56, 10 + f * 3, '#e0a818', 5); line(c, 40, 28, 56, 10 + f * 3, OUT, 1);
      line(c, 56, 10 + f * 3, 64, 30, '#e0a818', 4);
      poly(c, [58, 30, 70, 30, 66, 40, 58, 38], '#555', OUT, 1.3);
      rrect(c, 34, 30, 10, 6, 1, '#fff', OUT, 0.8);
    });
    canvasTex(scene, 'e_direktor' + f, 76, 50, c => {
      rrect(c, 2, 22, 72, 16, 6, '#151518', OUT, 1.6);
      c.beginPath(); c.moveTo(16, 23); c.quadraticCurveTo(22, 6, 38, 6); c.quadraticCurveTo(54, 6, 58, 23); c.closePath();
      c.fillStyle = '#151518'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke();
      poly(c, [22, 21, 26, 10, 37, 10, 37, 21], '#9ab8c8', OUT, 1);
      poly(c, [40, 21, 40, 10, 50, 10, 54, 21], '#9ab8c8', OUT, 1);
      face(c, 45, 16, 4.8, { mustache: true });
      ell(c, 45, 11.8, 6.5, 1.6, '#151518', OUT, 0.8); rrect(c, 41, 7.5, 8, 4.5, 1.5, '#151518', OUT, 0.8);
      line(c, 64, 22, 64, 8, '#aaa', 1); poly(c, [64, 8, 72, 10, 64, 13], '#c8262e', OUT, 0.8);
      ell(c, 72, 30, 2.4, 2.2, '#f2e27a', OUT, 1);
      line(c, 8, 30, 70, 30, '#888', 0.8);
      for (const x of [16, 60]) {
        ell(c, x, 41, 7.5, 7.5, '#222', OUT, 1.4); ell(c, x, 41, 3.5, 3.5, '#ccc');
        line(c, x, 41, x + Math.cos(f * 1.5) * 3.5, 41 + Math.sin(f * 1.5) * 3.5, OUT, 1);
      }
    });
  }
  canvasTex(scene, 'shadow', 40, 14, c => ell(c, 20, 7, 18, 6, 'rgba(0,0,0,0.28)'));
}

function makeMiscTextures(scene) {
  canvasTex(scene, 'p_vile', 26, 10, c => {
    line(c, 0, 5, 17, 5, '#8a5a2a', 2);
    line(c, 17, 1, 17, 9, '#6a6a70', 1.6);
    for (const y of [1.5, 5, 8.5]) line(c, 17, y, 25, y, '#6a6a70', 1.3);
  });
  canvasTex(scene, 'p_lonac', 18, 16, c => {
    ell(c, 9, 9, 7, 5.5, '#3a3a40', OUT, 1.2);
    rrect(c, 1, 4, 16, 3, 1, '#4a4a52', OUT, 1);
    ell(c, 9, 3, 4, 1.5, 'rgba(255,255,255,0.8)');
  });
  canvasTex(scene, 'p_pcela', 10, 8, c => {
    ell(c, 5, 4.5, 3.6, 2.4, '#f2c21c', OUT, 0.8);
    line(c, 4, 2.3, 4, 6.7, OUT, 0.9); line(c, 6, 2.3, 6, 6.7, OUT, 0.9);
    ell(c, 4.5, 1.6, 2, 1.2, 'rgba(255,255,255,0.85)');
  });
  canvasTex(scene, 'puff', 20, 20, c => {
    ell(c, 10, 10, 9, 9, 'rgba(255,255,255,0.9)');
    ell(c, 7, 8, 4, 4, '#fff');
  });
  canvasTex(scene, 'splat', 40, 40, c => {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      ell(c, 20 + Math.cos(a) * 11, 20 + Math.sin(a) * 11, 6, 6, i % 2 ? '#f2e2b8' : '#e8c890');
    }
    ell(c, 20, 20, 10, 10, '#f6ecd0');
  });
  canvasTex(scene, 'coin', 14, 14, c => {
    ell(c, 7, 7, 6, 6, '#f2c21c', OUT, 1.2);
    ell(c, 7, 7, 3.5, 3.5, null, '#b88a14', 1);
  });
  canvasTex(scene, 'heart', 24, 24, c => licitar(c, 12, 12, 10));
  canvasTex(scene, 'star', 10, 10, c => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.6;
      pts.push(5 + Math.cos(a) * r, 5.3 + Math.sin(a) * r);
    }
    poly(c, pts, '#f2c21c', OUT, 0.8);
  });
  canvasTex(scene, 'hen0', 18, 18, c => hen(c, '#c86a2a'));
  canvasTex(scene, 'hen1', 18, 18, c => hen(c, '#f6f2e6'));
  canvasTex(scene, 'stork', 50, 30, c => {
    ell(c, 24, 15, 12, 4.5, '#fff', OUT, 1);
    poly(c, [16, 13, 4, 2, 12, 2, 30, 13], '#fff', OUT, 1);
    poly(c, [4, 2, 12, 2, 10, 6, 6, 5], OUT);
    poly(c, [16, 17, 6, 28, 14, 28, 30, 17], '#fff', OUT, 1);
    poly(c, [6, 28, 14, 28, 12, 24, 8, 25], OUT);
    line(c, 35, 14, 42, 13, '#fff', 2.4);
    ell(c, 43, 13, 2.6, 2.4, '#fff', OUT, 0.8);
    line(c, 45, 13, 50, 14, '#d8362e', 1.6);
    line(c, 12, 15, 2, 16, '#d8362e', 1.2);
  });
}

function hen(c, body) {
  line(c, 8, 13, 8, 17, '#e8a020', 1.2); line(c, 11, 13, 11, 17, '#e8a020', 1.2);
  ell(c, 9, 10, 6, 4.5, body, OUT, 1);
  poly(c, [3, 9, 0, 4, 5, 7], body === '#f6f2e6' ? '#2a2a2a' : '#3a5a2a', OUT, 0.8);
  ell(c, 14, 6, 3, 3, body, OUT, 1);
  poly(c, [16.5, 5.5, 18, 6.5, 16.5, 7.5], '#e8a020');
  ell(c, 13.5, 2.8, 1.8, 1.2, '#d8262e');
  ell(c, 15, 5.4, 0.6, 0.6, OUT);
}

// The gingerbread heart from Croatian fairs: red, white piping, a little mirror in the middle.
function licitar(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y + r * 0.95);
  c.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.9, y - r * 1.05, x, y - r * 0.4);
  c.bezierCurveTo(x + r * 0.9, y - r * 1.05, x + r * 1.3, y + r * 0.1, x, y + r * 0.95);
  c.closePath();
  c.fillStyle = '#d4202a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
  c.save(); c.translate(x, y); c.scale(0.72, 0.72); c.translate(-x, -y);
  c.beginPath();
  c.moveTo(x, y + r * 0.95);
  c.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.9, y - r * 1.05, x, y - r * 0.4);
  c.bezierCurveTo(x + r * 0.9, y - r * 1.05, x + r * 1.3, y + r * 0.1, x, y + r * 0.95);
  c.setLineDash([1.5, 1.5]); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
  c.restore();
  ell(c, x, y, r * 0.28, r * 0.28, '#cfe6f0', '#fff', 0.8);
}

function makeTextures(scene) {
  makeTowerTextures(scene);
  makeEnemyTextures(scene);
  makeMiscTextures(scene);
}
