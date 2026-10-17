'use strict';

// Every picture in the game is painted on a canvas at boot, so the game ships without asset files.

const FONT = 'Impact, "Arial Black", sans-serif';
const SPR = {};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rnd = mulberry32(1975);
const pickR = arr => arr[Math.floor(rnd() * arr.length)];

function canvasTex(scene, key, w, h, draw) {
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
}

// lw is the sprite's width in world units (the player's cart is 80); its height follows the texture's aspect ratio.
function spriteTex(scene, key, lw, tw, th, draw) {
  canvasTex(scene, key, tw, th, draw);
  SPR[key] = { key, w: lw, h: lw * th / tw };
}

function ell(c, x, y, rx, ry, fill, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
}

function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }

function poly(c, pts, fill, stroke, lw) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.lineJoin = 'round'; c.stroke(); }
}

function line(c, x1, y1, x2, y2, color, w) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
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
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
}

function fitText(c, text, x, y, maxW, size, font, fill, stroke, sw) {
  let s = size;
  c.font = `${s}px ${font}`;
  while (c.measureText(text).width > maxW && s > 8) { s -= 2; c.font = `${s}px ${font}`; }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineWidth = sw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(text, x, y); }
  c.fillStyle = fill; c.fillText(text, x, y);
}

function shadow(c, x, y, rx, ry) { ell(c, x, y, rx, ry, 'rgba(0,0,0,0.3)'); }

function heart(c, x, y, s, color) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  c.fillStyle = color; c.fill();
}

function tulip(c, x, y, s, color) {
  line(c, x, y, x, y + s * 1.3, '#3f8a3a', 2);
  poly(c, [x - s, y - s * 0.9, x - s * 0.4, y - s * 0.3, x, y - s * 1.1, x + s * 0.4, y - s * 0.3,
    x + s, y - s * 0.9, x + s * 0.75, y + s * 0.3, x - s * 0.75, y + s * 0.3], color);
}

function flower(c, x, y, r, petal, center) {
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    ell(c, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, r * 0.55, petal, a);
  }
  ell(c, x, y, r * 0.55, r * 0.55, center);
}

function diamond(c, x, y, s, color) { poly(c, [x, y - s, x + s, y, x, y + s, x - s, y], color); }

// Leaves scattered inside an ellipse, lighter towards the upper left where the sun is.
function leafy(c, cx, cy, rx, ry, base, shades, n, size) {
  ell(c, cx, cy, rx, ry, base);
  const leaf = (x, y) => {
    const light = (cy - y) / ry - (x - cx) / rx * 0.3;
    const idx = Math.max(0, Math.min(shades.length - 1, Math.floor((light + 1) / 2 * shades.length + (rnd() - 0.5) * 1.5)));
    ell(c, x, y, size * (0.6 + rnd() * 0.7), size * (0.45 + rnd() * 0.5), shades[idx], rnd() * Math.PI);
  };
  c.save();
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.clip();
  for (let i = 0; i < n; i++) leaf(cx + (rnd() * 2 - 1) * rx, cy + (rnd() * 2 - 1) * ry);
  c.restore();
  for (let i = 0; i < n / 6; i++) {
    const a = rnd() * Math.PI * 2, r = 0.92 + rnd() * 0.08;
    leaf(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
  }
}

// A cart wheel seen from behind. The wheel runs along the road, so from the driver's seat
// it is almost edge-on: the iron-shod tread is a tall narrow strip, a sliver of the spoked
// face shows on the side towards the middle of the cart (the vanishing point), and the hub
// cap sticks out on the outside. side is -1 for the left wheel and +1 for the right.
function wheel(c, cx, cy, rx, ry, side) {
  const fx = cx - side * rx * 0.45;
  ell(c, fx, cy, rx * 0.5, ry, '#6e4a26');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    line(c, fx, cy, fx + Math.cos(a) * rx * 0.42, cy + Math.sin(a) * ry * 0.86, '#a0723f', 2.5);
  }
  ell(c, fx, cy, rx * 0.5, ry, null); c.lineWidth = 4; c.strokeStyle = '#3b2614'; c.stroke();
  ell(c, fx, cy, rx * 0.16, ry * 0.16, '#3b2614');
  rrect(c, cx - rx * 0.3, cy - ry, rx * 0.6, ry * 2, rx * 0.3, '#3b2614');
  rrect(c, cx - rx * 0.12, cy - ry + 3, rx * 0.24, ry * 2 - 6, rx * 0.12, '#6b6b6b');
  rrect(c, cx + side * rx * 0.2 - rx * 0.15, cy - ry * 0.14, rx * 0.3, ry * 0.28, 3, '#2b1a0e');
}

function xstitch(c, x, y, color) {
  line(c, x - 2, y - 2, x + 2, y + 2, color, 1.6);
  line(c, x + 2, y - 2, x - 2, y + 2, color, 1.6);
}

function vezStrip(c, x, y, w, h) {
  rect(c, x, y, w, h, '#f3ead2');
  const cell = h / 4;
  for (let col = 0; col * cell < w; col++) {
    const level = [0, 1, 2, 3, 2, 1][col % 6];
    for (let row = 0; row < 4; row++) {
      const px = x + col * cell + cell / 2, py = y + row * cell + cell / 2;
      if (row === level) xstitch(c, px, py, '#c62a32');
      else if (row === 3 - level) xstitch(c, px, py, '#1d1d1d');
    }
  }
}

// ---------------------------------------------------------------- backgrounds

function backgrounds(scene) {
  canvasTex(scene, 'bg_sky', 1024, 768, c => {
    const g = c.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, '#3f8fd8'); g.addColorStop(0.7, '#9fd0ef'); g.addColorStop(1, '#d4e6ee');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 768);
    const s = c.createRadialGradient(800, 110, 10, 800, 110, 130);
    s.addColorStop(0, 'rgba(255,250,215,0.9)'); s.addColorStop(1, 'rgba(255,250,215,0)');
    c.fillStyle = s; c.fillRect(600, 0, 400, 300);
    ell(c, 800, 110, 36, 36, '#fff7cf');
  });

  canvasTex(scene, 'bg_clouds', 2048, 260, c => {
    for (let i = 0; i < 14; i++) {
      const x = rnd() * 2048, y = 40 + rnd() * 160, s = 26 + rnd() * 36;
      const puffs = [];
      for (let k = 0; k < 6; k++) puffs.push([(k - 2.5) * s * 0.6 + (rnd() - 0.5) * s * 0.3, -Math.sin(k / 5 * Math.PI) * s * 0.5, s * (0.45 + rnd() * 0.35)]);
      for (const dx of [-2048, 0, 2048]) {
        for (const [ox, oy, r] of puffs) ell(c, x + dx + ox, y + oy + r * 0.15, r, r * 0.8, 'rgba(180,200,215,0.35)');
        for (const [ox, oy, r] of puffs) ell(c, x + dx + ox, y + oy, r, r * 0.8, 'rgba(255,255,255,0.95)');
      }
    }
  });

  // Bilogora: low hazy hills beyond the flat Podravina plain.
  canvasTex(scene, 'bg_hills', 2048, 200, c => {
    const range = (fn, color) => {
      c.beginPath(); c.moveTo(0, 200);
      for (let x = 0; x <= 2048; x += 4) c.lineTo(x, fn(2 * Math.PI * x / 2048));
      c.lineTo(2048, 200); c.closePath(); c.fillStyle = color; c.fill();
    };
    range(t => 105 - 30 * Math.sin(2 * t) - 16 * Math.sin(5 * t + 1) - 7 * Math.sin(11 * t + 2), '#97b4c6');
    range(t => 148 - 16 * Math.sin(3 * t + 0.5) - 9 * Math.sin(7 * t + 2.2) - 4 * Math.sin(17 * t), '#86aa95');
  });

  // Far fields with tree lines, poplars and villages with church towers; the bottom fades into the fog.
  canvasTex(scene, 'bg_fields', 2048, 170, c => {
    const g = c.createLinearGradient(0, 124, 0, 170);
    g.addColorStop(0, '#93b977'); g.addColorStop(1, '#d4e6ee');
    c.fillStyle = g; c.fillRect(0, 124, 2048, 46);
    const wrap = (x, fn) => { fn(x); if (x < 250) fn(x + 2048); if (x > 1798) fn(x - 2048); };
    for (let i = 0; i < 40; i++) {
      const x = rnd() * 2048, w = 60 + rnd() * 120, col = pickR(['#c9b65a', '#a6c870', '#a8885a', '#bcd07e']);
      wrap(x, px => { c.globalAlpha = 0.55; rect(c, px, 128, w, 8, col); c.globalAlpha = 1; });
    }
    for (let x = 0; x < 2048; x += 9) {
      const t = 2 * Math.PI * x / 2048;
      const h = 10 + 5 * Math.sin(7 * t) + 4 * Math.sin(19 * t + 1) + rnd() * 4, rx = 8 + rnd() * 5, col = pickR(['#4f7d45', '#5b8a4e', '#46723d']);
      wrap(x, px => ell(c, px, 128 - h * 0.5, rx, h, col));
    }
    for (let v = 0; v < 7; v++) {
      const vx = rnd() * 2048, houses = 3 + Math.floor(rnd() * 3), church = rnd() < 0.7, green = rnd() < 0.5;
      wrap(vx, px => {
        if (church) {
          rect(c, px + 30, 106, 30, 22, '#efe9dc'); poly(c, [px + 28, 108, px + 45, 98, px + 62, 108], '#b5452c');
          rect(c, px + 40, 80, 11, 48, '#f6f0e2'); poly(c, [px + 38, 82, px + 45.5, 60, px + 53, 82], green ? '#3d8b6e' : '#b5452c');
        }
        for (let k = 0; k < houses; k++) {
          const hx = px + 70 + k * 24;
          rect(c, hx, 118, 17, 10, '#efe9dc'); poly(c, [hx - 2, 119, hx + 8.5, 110, hx + 19, 119], '#b5452c');
        }
      });
    }
    for (let p = 0; p < 12; p++) {
      const gx = rnd() * 2048, n = 3 + Math.floor(rnd() * 5);
      const trees = []; for (let k = 0; k < n; k++) trees.push([k * 9, 26 + rnd() * 16]);
      wrap(gx, px => trees.forEach(([o, h]) => ell(c, px + o, 128 - h, 4, h, '#3f6a39')));
    }
  });

  // Red-and-black cross-stitch, as on Podravina embroidery.
  canvasTex(scene, 'vez', 72, 24, c => vezStrip(c, 0, 0, 72, 24));
}

// ---------------------------------------------------------------- player: Dudek and Regica on the cart

function drawCart(c, f) {
  rnd = mulberry32(7);
  const b = f ? 3 : 0, sw = f ? 8 : -8;
  shadow(c, 160, 250, 154, 13);

  // the horse, seen from behind, far parts first
  line(c, 132, 58 + b, 96, 150, '#3a2412', 4);
  line(c, 188, 58 + b, 224, 150, '#3a2412', 4);
  poly(c, [148, 16 + b, 151, 1 + b, 157, 13 + b], '#4e2d14');
  poly(c, [163, 13 + b, 169, 1 + b, 172, 16 + b], '#4e2d14');
  ell(c, 160, 26 + b, 13, 15, '#6b3f1f');
  ell(c, 160, 54 + b, 36, 22, '#6b3f1f');
  line(c, 160, 14 + b, 160, 50 + b, '#2b1a0e', 8);
  c.beginPath(); c.ellipse(160, 50 + b, 32, 17, 0, Math.PI, Math.PI * 2);
  c.strokeStyle = '#1d1d1d'; c.lineWidth = 9; c.stroke();
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + i * Math.PI / 6;
    ell(c, 160 + Math.cos(a) * 32, 50 + b + Math.sin(a) * 17, 2.5, 2.5, '#e2b84a');
  }
  ell(c, 160, 30 + b, 6, 6, '#d42a2a');
  ell(c, 128, 54 + b, 6, 8, '#d42a2a'); ell(c, 192, 54 + b, 6, 8, '#d42a2a');
  rect(c, 132, 112 + b, 15, f ? 32 : 40, '#5a3418');
  rect(c, 173, 112 + b, 15, f ? 40 : 32, '#5a3418');
  ell(c, 160, 90 + b, 50, 38, '#7a4a25');
  ell(c, 141, 80 + b, 18, 14, 'rgba(255,255,255,0.12)');
  ell(c, 179, 80 + b, 18, 14, 'rgba(255,255,255,0.12)');
  line(c, 160, 58 + b, 160, 122 + b, 'rgba(40,20,8,0.5)', 2);
  c.beginPath(); c.ellipse(160, 92 + b, 49, 30, 0, Math.PI * 0.12, Math.PI * 0.88);
  c.strokeStyle = '#2b1a0e'; c.lineWidth = 5; c.stroke();
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(160, 62 + b); c.quadraticCurveTo(160 + sw, 100 + b, 160 + sw * 1.6, 138);
  c.strokeStyle = '#2b1a0e'; c.lineWidth = 13; c.stroke();
  c.beginPath(); c.moveTo(161, 66 + b); c.quadraticCurveTo(163 + sw, 100 + b, 162 + sw * 1.6, 132);
  c.strokeStyle = '#4a3020'; c.lineWidth = 4; c.stroke();
  line(c, 118, 110, 140, 46 + b, '#2b1a0e', 2.5);
  line(c, 124, 110, 180, 46 + b, '#2b1a0e', 2.5);

  // Dudek drives on the left: black hat, white shirt, dark vest, whip in hand
  line(c, 78, 126, 44, 24, '#5b3a1a', 4);
  c.beginPath(); c.moveTo(44, 24); c.quadraticCurveTo(70 + sw, -6, 120, 16 + b);
  c.strokeStyle = '#222'; c.lineWidth = 1.8; c.stroke();
  ell(c, 80, 124, 15, 26, '#f4f1e8', -0.35);
  ell(c, 136, 124, 15, 26, '#f4f1e8', 0.35);
  c.beginPath(); c.moveTo(84, 98); c.quadraticCurveTo(108, 88, 132, 98); c.lineTo(137, 152); c.lineTo(79, 152); c.closePath();
  c.fillStyle = '#23232e'; c.fill();
  for (let i = 0; i < 5; i++) { ell(c, 92 + i * 8, 116, 2.4, 2.4, '#c62a32'); ell(c, 92 + i * 8, 122, 1.6, 1.6, '#3f8a3a'); }
  ell(c, 108, 95, 13, 5, '#f4f1e8');
  rect(c, 100, 80, 16, 14, '#d9a074');
  ell(c, 91, 74, 4, 7, '#d9a074'); ell(c, 125, 74, 4, 7, '#d9a074');
  ell(c, 108, 72, 17, 18, '#6a5640');
  ell(c, 108, 62, 31, 8, '#141414');
  rrect(c, 90, 36, 36, 28, 9, '#1c1c1c');
  rect(c, 90, 54, 36, 5, '#3a3a3a');
  ell(c, 100, 44, 4, 9, 'rgba(255,255,255,0.08)');

  // Regica beside him: red headscarf with white flowers, white embroidered blouse
  ell(c, 186, 124, 16, 24, '#fbf8f0', -0.3);
  ell(c, 240, 124, 16, 24, '#fbf8f0', 0.3);
  for (const sx of [186, 240]) for (let k = -1; k <= 1; k++) diamond(c, sx + k * 7, 132, 3, '#c62a32');
  c.beginPath(); c.moveTo(188, 98); c.quadraticCurveTo(212, 90, 236, 98); c.lineTo(242, 152); c.lineTo(182, 152); c.closePath();
  c.fillStyle = '#fbf8f0'; c.fill();
  line(c, 192, 104, 232, 104, '#c62a32', 3);
  for (let i = 0; i < 7; i++) { diamond(c, 190 + i * 7.3, 136, 3.2, '#c62a32'); ell(c, 190 + i * 7.3, 143, 1.4, 1.4, '#1d1d1d'); }
  poly(c, [194, 84, 230, 84, 212, 126], '#c62a32');
  for (let k = -2; k <= 2; k++) line(c, 212 + k * 2, 124, 212 + k * 3, 132, '#9e1d24', 1.5);
  ell(c, 212, 72, 18, 20, '#c62a32');
  for (const [x, y] of [[204, 62], [220, 66], [210, 80], [222, 82], [200, 76], [212, 98], [204, 92], [220, 94], [212, 110]]) {
    flower(c, x, y, 2.2, '#fff', '#f2c230');
  }
  ell(c, 212, 88, 6, 5, '#9e1d24');

  // the cart, its back board painted with folk tulips and a heart; the wheels go first so the
  // box hides their inner halves and they only show beside and under it
  wheel(c, 17, 194, 24, 62, -1);
  wheel(c, 303, 194, 24, 62, 1);
  c.save(); c.translate(160, 0); c.scale(0.9, 1); c.translate(-160, 0);
  rect(c, 14, 140, 292, 10, '#6b4220');
  rect(c, 18, 148, 284, 88, '#8a5a2c');
  line(c, 22, 177, 298, 177, '#6e4520', 2); line(c, 22, 206, 298, 206, '#6e4520', 2);
  for (let i = 0; i < 16; i++) {
    const y = 152 + rnd() * 80, x = 24 + rnd() * 240;
    line(c, x, y, x + 20 + rnd() * 30, y, 'rgba(60,30,10,0.25)', 1);
  }
  rect(c, 18, 140, 12, 98, '#5e3a1b'); rect(c, 290, 140, 12, 98, '#5e3a1b');
  ell(c, 160, 192, 64, 32, '#efdcae'); c.lineWidth = 3; c.strokeStyle = '#2f6b2a'; c.stroke();
  heart(c, 160, 190, 14, '#c62a32');
  tulip(c, 124, 194, 9, '#d8352f'); tulip(c, 196, 194, 9, '#d8352f');
  ell(c, 138, 206, 8, 3, '#3f8a3a', -0.5); ell(c, 182, 206, 8, 3, '#3f8a3a', 0.5);
  for (const [x, y] of [[24, 154], [296, 154], [24, 230], [296, 230]]) ell(c, x, y, 3, 3, '#2b1a0e');
  c.restore();
}

// ---------------------------------------------------------------- traffic, all seen from behind

function drawTractor(c) {
  shadow(c, 135, 248, 130, 10);
  rect(c, 184, 22, 9, 96, '#3a3a3a');
  ell(c, 190, 16, 13, 9, 'rgba(110,110,110,0.55)'); ell(c, 202, 6, 9, 6, 'rgba(110,110,110,0.35)');
  ell(c, 98, 92, 9, 20, '#2f4f8f', 0.5); ell(c, 172, 92, 9, 20, '#2f4f8f', -0.5);
  rrect(c, 104, 56, 62, 70, 16, '#2f4f8f');
  rect(c, 128, 40, 14, 18, '#c98b62');
  ell(c, 135, 36, 15, 15, '#4a3a2a');
  ell(c, 135, 26, 17, 9, '#5d5d5d');
  rrect(c, 98, 108, 74, 30, 6, '#1e1e1e');
  rrect(c, 70, 122, 130, 108, 10, '#c62828');
  rect(c, 74, 122, 122, 10, '#e04a3a');
  rrect(c, 94, 150, 82, 74, 6, '#4d4d4d');
  ell(c, 135, 186, 22, 22, '#3a3a3a'); ell(c, 135, 186, 8, 8, '#777');
  rect(c, 124, 214, 22, 34, '#2a2a2a');
  ell(c, 84, 138, 7, 7, '#ff8a1a'); ell(c, 186, 138, 7, 7, '#ff8a1a');
  for (const x of [8, 200]) {
    rrect(c, x, 104, 62, 146, 14, '#1b1b1b');
    for (let y = 114; y < 244; y += 12) line(c, x + 6, y, x + 56, y + 5, '#3c3c3c', 4);
  }
  rrect(c, 2, 92, 74, 22, 10, '#d83a3a'); rrect(c, 194, 92, 74, 22, 10, '#d83a3a');
}

function drawBike(c) {
  shadow(c, 60, 242, 30, 6);
  rrect(c, 55, 150, 10, 92, 5, '#151515');
  line(c, 48, 150, 46, 205, '#2d2d3a', 12); line(c, 72, 150, 74, 198, '#2d2d3a', 12);
  ell(c, 45, 210, 8, 5, '#1a1a1a'); ell(c, 75, 203, 8, 5, '#1a1a1a');
  line(c, 12, 104, 26, 108, '#999', 4); line(c, 94, 108, 108, 104, '#999', 4);
  ell(c, 28, 98, 9, 22, '#6f8fb5', 0.5); ell(c, 92, 98, 9, 22, '#6f8fb5', -0.5);
  ell(c, 16, 106, 5, 5, '#d9a074'); ell(c, 104, 106, 5, 5, '#d9a074');
  rrect(c, 34, 62, 52, 92, 14, '#6f8fb5');
  rect(c, 54, 46, 12, 18, '#d9a074');
  ell(c, 60, 50, 13, 14, '#7a5a3a');
  ell(c, 60, 42, 28, 7, '#e3c463');
  rrect(c, 46, 24, 28, 19, 6, '#e3c463');
  rect(c, 46, 36, 28, 4, '#333');
  // a goose in the basket on the rack, going to the fair too
  line(c, 50, 146, 42, 112, '#ffffff', 8);
  ell(c, 41, 108, 7, 6, '#ffffff');
  poly(c, [35, 106, 26, 110, 35, 112], '#f08a1a');
  rrect(c, 26, 140, 68, 42, 5, '#a87b3c');
  for (let y = 146; y < 182; y += 7) line(c, 28, y, 92, y, '#8a6230', 2);
  for (let x = 32; x < 94; x += 8) line(c, x, 142, x, 180, 'rgba(90,60,20,0.5)', 1.5);
}

function drawHayCart(c) {
  rnd = mulberry32(11);
  shadow(c, 137, 292, 130, 10);
  c.beginPath(); c.moveTo(16, 222); c.bezierCurveTo(4, 120, 40, 50, 137, 48); c.bezierCurveTo(234, 50, 272, 120, 259, 222); c.closePath();
  c.fillStyle = '#d6b04a'; c.fill();
  c.save(); c.clip();
  for (let i = 0; i < 260; i++) {
    const x = 10 + rnd() * 255, y = 45 + rnd() * 180;
    line(c, x, y, x + rnd() * 14 - 7, y + 6 + rnd() * 10, pickR(['#b8922f', '#ecd27a', '#c9a23e']), 2);
  }
  rect(c, 185, 40, 100, 190, 'rgba(0,0,0,0.08)');
  c.restore();
  rrect(c, 158, 30, 40, 40, 10, '#f1ede2');
  ell(c, 178, 24, 10, 11, '#6a5640');
  ell(c, 178, 16, 20, 5, '#e3c463'); rrect(c, 168, 4, 20, 13, 5, '#e3c463');
  wheel(c, 12, 242, 18, 46, -1); wheel(c, 263, 242, 18, 46, 1);
  rect(c, 20, 206, 235, 60, '#8a5a2c'); line(c, 22, 236, 253, 236, '#6e4520', 2);
  rect(c, 20, 200, 10, 68, '#5e3a1b'); rect(c, 245, 200, 10, 68, '#5e3a1b');
  poly(c, [137, 214, 123, 240, 151, 240], null, '#dd2222', 4);
}

function drawFico(c, col) {
  shadow(c, 99, 150, 92, 7);
  rrect(c, 20, 120, 32, 32, 6, '#151515'); rrect(c, 146, 120, 32, 32, 6, '#151515');
  c.beginPath(); c.moveTo(14, 128); c.lineTo(14, 80); c.quadraticCurveTo(16, 50, 44, 44);
  c.quadraticCurveTo(60, 8, 99, 8); c.quadraticCurveTo(138, 8, 154, 44);
  c.quadraticCurveTo(182, 50, 184, 80); c.lineTo(184, 128); c.closePath();
  c.fillStyle = col; c.fill();
  c.beginPath(); c.moveTo(52, 46); c.quadraticCurveTo(66, 18, 99, 18); c.quadraticCurveTo(132, 18, 146, 46); c.closePath();
  c.fillStyle = '#2a3a4a'; c.fill();
  line(c, 72, 28, 92, 23, 'rgba(255,255,255,0.4)', 3);
  for (let i = 0; i < 5; i++) line(c, 70, 62 + i * 8, 128, 62 + i * 8, 'rgba(0,0,0,0.3)', 3);
  ell(c, 30, 90, 9, 9, '#e02020'); ell(c, 168, 90, 9, 9, '#e02020');
  ell(c, 30, 106, 5, 4, '#ff9a1a'); ell(c, 168, 106, 5, 4, '#ff9a1a');
  rect(c, 76, 100, 46, 14, '#ffffff'); c.strokeStyle = '#222'; c.lineWidth = 1.5; c.strokeRect(76, 100, 46, 14);
  fitText(c, 'KC 75', 99, 107, 42, 11, 'bold Arial', '#111');
  rrect(c, 8, 116, 182, 9, 4, '#d8d8d8');
}

// ---------------------------------------------------------------- roadside

function drawPoplar(c) {
  shadow(c, 80, 672, 50, 8);
  rect(c, 74, 560, 12, 115, '#5b4129');
  leafy(c, 80, 320, 46, 300, '#2a5e27', ['#24521f', '#2e6a2c', '#3d7d36', '#4c8f3f', '#5c9e4a'], 420, 10);
}

function drawOak(c) {
  shadow(c, 225, 440, 170, 10);
  poly(c, [203, 445, 247, 445, 238, 280, 212, 280], '#5b4129');
  line(c, 225, 300, 150, 220, '#5b4129', 14); line(c, 225, 300, 310, 210, '#5b4129', 14);
  leafy(c, 225, 190, 200, 150, '#2f5e27', ['#2a5523', '#36692c', '#437a35', '#558c42', '#6aa050'], 900, 16);
}

function drawWillow(c) {
  shadow(c, 200, 362, 150, 9);
  poly(c, [182, 368, 222, 368, 214, 190, 192, 190], '#6b5a44');
  leafy(c, 200, 140, 175, 110, '#6f9a3a', ['#5f8a32', '#79a443', '#8db552', '#a3c765'], 600, 12);
  for (let x = 35; x < 368; x += 6) {
    const y0 = 140 + Math.sqrt(Math.max(0, 1 - ((x - 200) / 175) ** 2)) * 80;
    line(c, x, y0 - 20, x + rnd() * 6 - 3, y0 + 50 + rnd() * 70, pickR(['#86ad48', '#9cc25a', '#6f9a3a']), 3);
  }
}

function drawPine(c) {
  shadow(c, 100, 424, 70, 6);
  rect(c, 93, 320, 14, 105, '#6b4a2e');
  for (let k = 0; k < 6; k++) {
    const y = 40 + k * 52, half = 26 + k * 13;
    poly(c, [100, y - 40, 100 - half, y + 34, 100 + half, y + 34], '#23502b');
    poly(c, [100, y - 40, 100 + half, y + 34, 100 + half * 0.35, y + 34], '#2e6636');
  }
}

function drawCorn(c) {
  shadow(c, 225, 218, 220, 8);
  for (let i = 0; i < 26; i++) {
    const x = 12 + i * 16.5 + rnd() * 8, h = 150 + rnd() * 55, top = 220 - h, lean = rnd() * 8 - 4;
    line(c, x, 220, x + lean, top, '#5f8f2c', 5);
    for (let k = 0; k < 4; k++) {
      const y = 200 - k * h / 5 - rnd() * 10, d = (k % 2 ? 1 : -1) * (26 + rnd() * 16);
      c.beginPath(); c.moveTo(x + lean * (220 - y) / h, y); c.quadraticCurveTo(x + d * 0.6, y - 26, x + d, y + 6);
      c.strokeStyle = k % 2 ? '#6fa13a' : '#7db446'; c.lineWidth = 4; c.stroke();
    }
    if (rnd() < 0.6) { ell(c, x + 5, 220 - h * 0.45, 5, 13, '#e8c94a', 0.2); ell(c, x + 7, 220 - h * 0.45 + 4, 4, 11, '#7db446', 0.3); }
    for (let k = 0; k < 4; k++) line(c, x + lean, top, x + lean + (k - 1.5) * 4, top - 12, '#d9c25a', 2);
  }
}

function drawSunflowers(c) {
  shadow(c, 180, 218, 175, 8);
  for (let i = 0; i < 12; i++) {
    const x = 18 + i * 28 + rnd() * 10, h = 120 + rnd() * 60, top = 220 - h;
    line(c, x, 220, x, top, '#4f7f2a', 6);
    ell(c, x - 14, 220 - h * 0.45, 16, 8, '#5f9a34', 0.5);
    ell(c, x + 14, 220 - h * 0.62, 16, 8, '#5f9a34', -0.5);
    for (let p = 0; p < 14; p++) {
      const a = p / 14 * Math.PI * 2;
      ell(c, x + Math.cos(a) * 17, top + Math.sin(a) * 17, 9, 4.5, p % 2 ? '#f3c623' : '#e9b616', a);
    }
    ell(c, x, top, 13, 13, '#5a3a12');
    for (let d = 0; d < 6; d++) ell(c, x + (rnd() - 0.5) * 16, top + (rnd() - 0.5) * 16, 1.5, 1.5, '#3a240a');
  }
}

// A Podravina house with its gable end to the road: whitewashed walls, blue plinth,
// wooden gable with a sun motif and geraniums on the window sills.
function drawHouse(c) {
  shadow(c, 240, 412, 230, 10);
  rect(c, 60, 200, 360, 200, '#f3eedf');
  rect(c, 380, 200, 40, 200, 'rgba(0,0,0,0.06)');
  rect(c, 60, 368, 360, 32, '#6f8fae');
  poly(c, [30, 212, 240, 32, 450, 212], '#b5452c');
  for (let y = 60; y < 210; y += 16) { const hw = (y - 32) / 180 * 210; line(c, 240 - hw, y, 240 + hw, y, '#933522', 2); }
  line(c, 30, 212, 240, 32, '#7e2b1a', 6); line(c, 240, 32, 450, 212, '#7e2b1a', 6);
  poly(c, [92, 200, 240, 74, 388, 200], '#8a5a2c');
  for (let x = 100; x < 382; x += 14) {
    const yTop = x < 240 ? 200 - (x - 92) / 148 * 126 : 200 - (388 - x) / 148 * 126;
    line(c, x, yTop + 4, x, 198, '#6e4520', 2);
  }
  ell(c, 240, 160, 22, 22, '#e8c04a');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(c, 240 + Math.cos(a) * 26, 160 + Math.sin(a) * 26, 240 + Math.cos(a) * 34, 160 + Math.sin(a) * 34, '#e8c04a', 3); }
  rect(c, 226, 108, 28, 26, '#2c3e50'); line(c, 240, 108, 240, 134, '#fff', 2);
  rect(c, 60, 196, 360, 10, '#5e3a1b');
  for (const wx of [112, 298]) {
    rect(c, wx - 26, 248, 18, 88, '#3f7f4f'); rect(c, wx + 78, 248, 18, 88, '#3f7f4f');
    rect(c, wx - 6, 244, 82, 96, '#ffffff');
    rect(c, wx, 250, 70, 84, '#2f4f6f');
    line(c, wx + 35, 250, wx + 35, 334, '#fff', 4); line(c, wx, 290, wx + 70, 290, '#fff', 4);
    line(c, wx + 8, 258, wx + 26, 280, 'rgba(255,255,255,0.3)', 3);
    rect(c, wx - 10, 334, 90, 8, '#dddddd');
    for (let k = 0; k < 6; k++) { ell(c, wx + 5 + k * 12, 330, 8, 7, '#2f7a2f'); ell(c, wx + 6 + k * 12, 323, 5, 5, '#e02b3a'); }
  }
}

// An old wooden "hiža": logs with white chinking and a steep shingle roof.
function drawLogHouse(c) {
  shadow(c, 250, 372, 235, 9);
  rect(c, 50, 170, 400, 200, '#5b3a22');
  for (let y = 170; y < 370; y += 18) {
    rect(c, 50, y, 400, 14, '#6e4729');
    rect(c, 50, y + 14, 400, 4, '#e9e2d0');
    ell(c, 48, y + 7, 10, 8, '#7a5230'); ell(c, 452, y + 7, 10, 8, '#7a5230');
  }
  poly(c, [20, 182, 250, 30, 480, 182], '#6d6152');
  for (let i = 1; i < 9; i++) { const y = 30 + i * 17, hw = (y - 30) / 152 * 230; line(c, 250 - hw, y, 250 + hw, y, '#5a5044', 2); }
  line(c, 20, 182, 250, 30, '#4a4238', 6); line(c, 250, 30, 480, 182, '#4a4238', 6);
  poly(c, [130, 176, 250, 96, 370, 176], '#7a5230');
  heart(c, 250, 146, 12, '#c62a32');
  for (const wx of [120, 320]) {
    rect(c, wx - 6, 224, 72, 72, '#f4f1e8');
    rect(c, wx, 230, 60, 60, '#2f4f6f');
    line(c, wx + 30, 230, wx + 30, 290, '#f4f1e8', 4); line(c, wx, 260, wx + 60, 260, '#f4f1e8', 4);
    rect(c, wx - 8, 294, 76, 10, '#7a5230');
    for (let k = 0; k < 5; k++) ell(c, wx + 4 + k * 13, 290, 5, 5, k % 2 ? '#e02b3a' : '#ffffff');
  }
  rect(c, 200, 336, 100, 8, '#8a6240'); rect(c, 206, 344, 6, 20, '#6e4520'); rect(c, 288, 344, 6, 20, '#6e4520');
}

function drawChurch(c) {
  shadow(c, 180, 632, 170, 10);
  rect(c, 30, 330, 300, 302, '#f1e6c4');
  rect(c, 30, 330, 14, 302, '#e3d4a8'); rect(c, 316, 330, 14, 302, '#e3d4a8');
  poly(c, [20, 336, 180, 250, 340, 336], '#b5452c');
  for (const x of [72, 288]) { rect(c, x - 14, 400, 28, 60, '#4a5f7a'); ell(c, x, 400, 14, 14, '#4a5f7a'); }
  rect(c, 128, 120, 104, 512, '#f6eed6');
  rect(c, 128, 120, 8, 512, '#e3d4a8'); rect(c, 224, 120, 8, 512, '#e3d4a8');
  rect(c, 120, 300, 120, 10, '#e3d4a8'); rect(c, 120, 200, 120, 10, '#e3d4a8');
  rect(c, 160, 142, 40, 46, '#3a2a1a'); ell(c, 180, 142, 20, 20, '#3a2a1a');
  ell(c, 180, 250, 26, 26, '#ffffff'); c.strokeStyle = '#333'; c.lineWidth = 3; c.stroke();
  line(c, 180, 250, 180, 232, '#222', 3); line(c, 180, 250, 192, 254, '#222', 3);
  ell(c, 180, 380, 14, 14, '#4a5f7a');
  rect(c, 156, 560, 48, 72, '#5b3a1b'); ell(c, 180, 560, 24, 24, '#5b3a1b');
  poly(c, [124, 122, 236, 122, 222, 102, 138, 102], '#3d8b6e');
  ell(c, 180, 86, 40, 26, '#3d8b6e');
  ell(c, 166, 80, 10, 14, 'rgba(255,255,255,0.18)');
  rect(c, 172, 56, 16, 16, '#3d8b6e');
  ell(c, 180, 54, 12, 9, '#3d8b6e');
  rect(c, 177, 18, 6, 38, '#3d8b6e');
  rect(c, 178, 0, 4, 26, '#d4af37'); rect(c, 170, 8, 20, 4, '#d4af37');
}

// "Đeram": the well sweep found in every Podravina yard.
function drawWellSweep(c) {
  shadow(c, 200, 440, 140, 9);
  ell(c, 262, 404, 60, 16, '#4a3018');
  rect(c, 202, 352, 120, 52, '#7a5230');
  for (let x = 214; x < 320; x += 14) line(c, x, 356, x, 402, '#5e3a1b', 2);
  ell(c, 262, 352, 60, 16, '#8a6240'); ell(c, 262, 352, 50, 12, '#1e140a');
  line(c, 110, 445, 110, 175, '#5b3a1b', 16);
  line(c, 110, 182, 96, 150, '#5b3a1b', 10); line(c, 110, 182, 124, 150, '#5b3a1b', 10);
  line(c, 20, 231, 262, 40, '#6e4520', 10);
  ell(c, 28, 236, 20, 15, '#7f7f7f');
  line(c, 262, 40, 262, 326, '#6e4520', 5);
  rrect(c, 250, 318, 24, 24, 3, '#5a5a5a');
}

function drawHaystack(c) {
  rnd = mulberry32(5);
  shadow(c, 135, 292, 120, 10);
  line(c, 135, 2, 135, 60, '#6e4520', 8);
  c.beginPath(); c.moveTo(20, 290); c.bezierCurveTo(10, 150, 80, 40, 135, 40); c.bezierCurveTo(190, 40, 260, 150, 250, 290); c.closePath();
  c.fillStyle = '#d4ae48'; c.fill();
  c.save(); c.clip();
  for (let i = 0; i < 200; i++) {
    const x = 20 + rnd() * 230, y = 40 + rnd() * 250;
    line(c, x, y, x + rnd() * 10 - 5, y + 8 + rnd() * 10, pickR(['#b38a2c', '#ecd27a', '#c69e3a']), 2);
  }
  rect(c, 150, 30, 120, 270, 'rgba(0,0,0,0.1)');
  rect(c, 0, 260, 270, 40, 'rgba(0,0,0,0.12)');
  c.restore();
}

function drawCow(c) {
  shadow(c, 130, 158, 110, 8);
  for (const x of [60, 86, 166, 192]) { rect(c, x, 100, 14, 52, '#efe9df'); rect(c, x, 146, 14, 8, '#3a2a1a'); }
  ell(c, 130, 82, 85, 45, '#f2ede4');
  c.save(); c.beginPath(); c.ellipse(130, 82, 85, 45, 0, 0, Math.PI * 2); c.clip();
  ell(c, 150, 66, 32, 22, '#8a5a34'); ell(c, 98, 98, 24, 16, '#8a5a34'); ell(c, 196, 92, 20, 22, '#8a5a34');
  c.restore();
  ell(c, 160, 122, 16, 10, '#f1a5b0');
  line(c, 212, 70, 226, 128, '#d8d0c4', 4); ell(c, 226, 134, 5, 8, '#5a3a1b');
  ell(c, 56, 64, 30, 26, '#f2ede4');
  ell(c, 32, 74, 22, 20, '#f2ede4');
  ell(c, 38, 62, 10, 8, '#8a5a34');
  ell(c, 18, 86, 14, 11, '#f0b7a8');
  ell(c, 12, 86, 2, 2, '#5a3a3a'); ell(c, 20, 88, 2, 2, '#5a3a3a');
  ell(c, 34, 66, 3, 3, '#1a1a1a');
  ell(c, 52, 50, 11, 5, '#e8e0d4', -0.4);
  c.beginPath(); c.moveTo(36, 54); c.quadraticCurveTo(28, 40, 36, 30); c.strokeStyle = '#e8dcb0'; c.lineWidth = 5; c.lineCap = 'round'; c.stroke();
  line(c, 50, 84, 66, 96, '#5b3a1b', 3); ell(c, 64, 100, 7, 8, '#d4af37');
}

function drawGeese(c) {
  const goose = (x, y, s) => {
    shadow(c, x, y + 30 * s, 34 * s, 5 * s);
    line(c, x - 6 * s, y + 14 * s, x - 8 * s, y + 30 * s, '#f08a1a', 3 * s);
    line(c, x + 8 * s, y + 14 * s, x + 6 * s, y + 30 * s, '#f08a1a', 3 * s);
    poly(c, [x + 28 * s, y - 6 * s, x + 46 * s, y - 14 * s, x + 32 * s, y + 6 * s], '#e9e9e2');
    ell(c, x, y, 34 * s, 20 * s, '#fbfbf8');
    ell(c, x + 8 * s, y - 2 * s, 22 * s, 11 * s, '#e6e6de');
    c.beginPath(); c.moveTo(x - 24 * s, y - 6 * s); c.quadraticCurveTo(x - 38 * s, y - 20 * s, x - 34 * s, y - 46 * s);
    c.strokeStyle = '#fbfbf8'; c.lineWidth = 10 * s; c.lineCap = 'round'; c.stroke();
    ell(c, x - 36 * s, y - 50 * s, 9 * s, 8 * s, '#ffffff');
    poly(c, [x - 43 * s, y - 52 * s, x - 56 * s, y - 47 * s, x - 43 * s, y - 45 * s], '#f08a1a');
    ell(c, x - 37 * s, y - 52 * s, 1.6 * s, 1.6 * s, '#111');
  };
  goose(82, 86, 1); goose(176, 92, 0.95); goose(254, 84, 0.85);
}

function drawWaysideCross(c) {
  shadow(c, 80, 434, 50, 6);
  rect(c, 72, 56, 16, 380, '#6e4520');
  rect(c, 22, 120, 116, 14, '#6e4520');
  poly(c, [44, 60, 80, 26, 116, 60], '#5a5a5a');
  line(c, 44, 60, 80, 26, '#3a3a3a', 3); line(c, 80, 26, 116, 60, '#3a3a3a', 3);
  line(c, 36, 127, 124, 127, '#e8d8b0', 4);
  rect(c, 76, 128, 8, 52, '#e8d8b0'); ell(c, 80, 122, 6, 6, '#e8d8b0');
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + i / 8 * Math.PI;
    ell(c, 80 + Math.cos(a) * 34, 426 + Math.sin(a) * 20, 9, 5, '#3f8a3a', a);
  }
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i + 0.5) / 7 * Math.PI;
    flower(c, 80 + Math.cos(a) * 30, 424 + Math.sin(a) * 18, 5, ['#e02b3a', '#ffffff', '#f2c230'][i % 3], '#f2c230');
  }
}

// The old fort in Đurđevac, home of the Picok legend.
function drawCastle(c) {
  shadow(c, 240, 352, 230, 9);
  rect(c, 20, 190, 330, 160, '#efe7d2');
  rect(c, 20, 320, 330, 30, '#cfc5ad');
  poly(c, [10, 194, 40, 140, 330, 140, 360, 194], '#b5452c');
  rect(c, 150, 262, 60, 88, '#3a2a1a'); ell(c, 180, 262, 30, 30, '#3a2a1a');
  for (const x of [50, 100, 250, 300]) { rect(c, x, 216, 22, 30, '#3a3a3a'); }
  rect(c, 340, 100, 120, 250, '#f3ecd9');
  rect(c, 340, 100, 10, 250, '#e1d7bd');
  poly(c, [330, 104, 400, 20, 470, 104], '#b5452c');
  for (const y of [140, 210, 280]) { rect(c, 388, y, 24, 34, '#3a3a3a'); ell(c, 400, y, 12, 10, '#3a3a3a'); }
  line(c, 400, 20, 400, 2, '#444', 3);
  poly(c, [400, 2, 424, 8, 400, 14], '#c62a32');
}

// The Picok rooster on its pedestal.
function drawRooster(c) {
  shadow(c, 120, 316, 70, 6);
  rect(c, 70, 232, 100, 86, '#9a9a92');
  rect(c, 60, 222, 120, 14, '#b0b0a8');
  rect(c, 88, 256, 64, 26, '#c9a23e');
  fitText(c, 'PICOK', 120, 270, 58, 16, FONT, '#5a3a12');
  line(c, 112, 192, 106, 222, '#e8b830', 5); line(c, 134, 192, 140, 222, '#e8b830', 5);
  const tails = ['#1f4a3a', '#14302a', '#2a5e48', '#1f4a3a', '#123026'];
  for (let k = 0; k < 5; k++) {
    c.beginPath(); c.moveTo(158, 150); c.quadraticCurveTo(190 + k * 6, 60 + k * 10, 210 + k * 5, 120 + k * 16);
    c.strokeStyle = tails[k]; c.lineWidth = 9; c.lineCap = 'round'; c.stroke();
  }
  ell(c, 125, 160, 48, 38, '#b5452c');
  ell(c, 100, 172, 26, 26, '#6a2414');
  ell(c, 138, 160, 30, 19, '#8a3a1a');
  ell(c, 92, 128, 20, 28, '#e09a2a');
  ell(c, 86, 100, 14, 13, '#c0392b');
  poly(c, [70, 92, 74, 78, 80, 88, 86, 74, 90, 86, 97, 74, 100, 92], '#e02020');
  ell(c, 78, 118, 5, 9, '#e02020');
  poly(c, [73, 98, 58, 104, 73, 108], '#f2c230');
  ell(c, 82, 98, 3, 3, '#ffffff'); ell(c, 82, 98, 1.5, 1.5, '#111');
}

function drawDune(c) {
  const P = [[0, 162], [70, 60], [260, 10], [450, 162]];
  const at = t => {
    const u = 1 - t;
    return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
      u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]];
  };
  c.beginPath(); c.moveTo(0, 162); c.bezierCurveTo(70, 60, 260, 10, 450, 162); c.closePath();
  c.fillStyle = '#e6d398'; c.fill();
  c.save(); c.clip();
  for (let i = 0; i < 8; i++) {
    const y = 60 + i * 13;
    c.beginPath(); c.moveTo(40, y + 30); c.quadraticCurveTo(220, y - 10, 420, y + 40);
    c.strokeStyle = '#d4bd7f'; c.lineWidth = 2; c.stroke();
  }
  rect(c, 280, 0, 170, 165, 'rgba(0,0,0,0.07)');
  c.restore();
  for (let i = 0; i < 6; i++) {
    const [x, y] = at(0.15 + rnd() * 0.7);
    for (let k = 0; k < 7; k++) line(c, x, y + 3, x + (k - 3) * 4, y - 16 - rnd() * 10, '#7a9a3a', 2);
  }
}

function drawPlaceSign(c, name) {
  shadow(c, 140, 236, 100, 4);
  rect(c, 66, 120, 10, 118, '#8c8c8c'); rect(c, 204, 120, 10, 118, '#8c8c8c');
  rrect(c, 8, 16, 264, 112, 10, '#ffffff', '#1d1d1d', 7);
  fitText(c, name.toUpperCase(), 140, 72, 236, 58, FONT, '#1d1d1d');
}

function drawGate(c, name, sub) {
  for (const x of [18, 616]) {
    rrect(c, x, 40, 46, 340, 6, '#7a5230');
    for (let y = 52; y < 376; y += 16) {
      const gx = x + 23 + Math.sin(y / 12) * 14;
      ell(c, gx, y, 12, 9, y % 32 ? '#3f8a3a' : '#2f6b2a');
      if (y % 48 === 4) flower(c, gx, y, 4, '#e02b3a', '#f2c230');
    }
  }
  rect(c, 20, 24, 640, 112, '#b71c1c');
  for (let x = 20, i = 0; x < 660; x += 10, i++) {
    rect(c, x, 24, 10, 10, i % 2 ? '#ffffff' : '#b71c1c');
    rect(c, x, 34, 10, 10, i % 2 ? '#b71c1c' : '#ffffff');
    rect(c, x, 116, 10, 10, i % 2 ? '#ffffff' : '#b71c1c');
    rect(c, x, 126, 10, 10, i % 2 ? '#b71c1c' : '#ffffff');
  }
  fitText(c, name.toUpperCase(), 340, 76, 600, 62, FONT, '#ffffff', '#5a0a0a', 6);
  fitText(c, sub, 340, 104, 560, 18, 'bold Arial, sans-serif', '#ffe08a');
  for (let t = 0.04; t < 0.97; t += 0.035) {
    const u = 1 - t, x = u * u * 64 + 2 * u * t * 340 + t * t * 616, y = u * u * 140 + 2 * u * t * 220 + t * t * 140;
    ell(c, x, y + 4, 8, 5, '#3f8a3a');
    flower(c, x, y, 5, ['#e02b3a', '#ffffff', '#f2c230', '#5b7fd0'][Math.round(t * 30) % 4], '#f2c230');
  }
}

function drawBillboard(c, b) {
  shadow(c, 240, 312, 180, 5);
  rect(c, 80, 180, 22, 135, '#6e4520'); rect(c, 378, 180, 22, 135, '#6e4520');
  rect(c, 10, 10, 460, 190, b.bg);
  vezStrip(c, 14, 14, 452, 16);
  vezStrip(c, 14, 180, 452, 16);
  c.strokeStyle = '#5b3a1b'; c.lineWidth = 8; c.strokeRect(10, 10, 460, 190);
  fitText(c, b.t1, 240, 90, 400, 56, FONT, b.fg, b.stroke || null, 4);
  fitText(c, b.t2, 240, 146, 400, 28, 'bold Arial, sans-serif', b.fg);
  tulip(c, 36, 120, 10, '#d8352f'); tulip(c, 444, 120, 10, '#d8352f');
}

const GATE_SUB = ['START', 'PRODULJENO VREME', 'PRODULJENO VREME', 'PRODULJENO VREME', 'PRODULJENO VREME', 'PRODULJENO VREME', 'CILJ • VELIKI SAJAM'];

const BILLBOARDS = [
  { t1: 'KLET KOD DUDEKA', t2: 'vino • rakija • kobase', bg: '#f4e7c3', fg: '#8b1a1a' },
  { t1: 'VELIKI SAJAM', t2: 'Koprivnica • v nedelju', bg: '#b71c1c', fg: '#ffffff', stroke: '#5a0a0a' },
  { t1: 'NAIVA HLEBINE', t2: 'galerija slik na staklu', bg: '#2c4a7a', fg: '#ffe08a' },
  { t1: 'PICOKIJADA', t2: 'Đurđevac', bg: '#f2c230', fg: '#7a1010' },
  { t1: 'FRIŠKI SIR I VRHNJE', t2: 'pri Regici', bg: '#ffffff', fg: '#2f6b2a' },
  { t1: 'KOVAČ ŠTEF', t2: 'potkove • kotači • lanci', bg: '#4a4a4a', fg: '#ffd23f' },
  { t1: 'PODRAVSKA SAHARA', t2: 'Đurđevački peski', bg: '#e8cf8a', fg: '#6b3a12' },
  { t1: 'GRUNTOVEC', t2: 'selo veselo', bg: '#3f7f4f', fg: '#ffffff', stroke: '#1e3f26' },
  { t1: 'VIRJANSKI SAJAM', t2: 'konji • krave • svinje', bg: '#f4e7c3', fg: '#2c4a7a' },
  { t1: 'NOVIGRAD', t2: 'Podravski • dobrodošli', bg: '#2f6b2a', fg: '#ffe08a', stroke: '#143010' },
];

function buildTextures(scene) {
  if (scene.textures.exists('player0')) return;
  rnd = mulberry32(1975);
  backgrounds(scene);
  spriteTex(scene, 'player0', 80, 320, 264, c => drawCart(c, 0));
  spriteTex(scene, 'player1', 80, 320, 264, c => drawCart(c, 1));
  spriteTex(scene, 'traktor', 92, 270, 258, drawTractor);
  spriteTex(scene, 'bicikl', 34, 120, 248, drawBike);
  spriteTex(scene, 'zaprega', 104, 275, 300, drawHayCart);
  spriteTex(scene, 'fico', 70, 198, 156, c => drawFico(c, '#c0392b'));
  spriteTex(scene, 'fico2', 70, 198, 156, c => drawFico(c, '#8fc1e3'));
  spriteTex(scene, 'topola', 80, 160, 680, drawPoplar);
  spriteTex(scene, 'hrast', 300, 450, 450, drawOak);
  spriteTex(scene, 'vrba', 270, 400, 370, drawWillow);
  spriteTex(scene, 'bor', 120, 200, 430, drawPine);
  spriteTex(scene, 'kuruza', 300, 450, 225, drawCorn);
  spriteTex(scene, 'suncokret', 240, 360, 225, drawSunflowers);
  spriteTex(scene, 'kuca', 320, 480, 420, drawHouse);
  spriteTex(scene, 'kuca2', 330, 500, 380, drawLogHouse);
  spriteTex(scene, 'crkva', 380, 360, 640, drawChurch);
  spriteTex(scene, 'djeram', 200, 345, 450, drawWellSweep);
  spriteTex(scene, 'stog', 170, 270, 300, drawHaystack);
  spriteTex(scene, 'krava', 140, 255, 165, drawCow);
  spriteTex(scene, 'guske', 140, 300, 140, drawGeese);
  spriteTex(scene, 'raspelo', 70, 160, 440, drawWaysideCross);
  spriteTex(scene, 'utvrda', 460, 480, 360, drawCastle);
  spriteTex(scene, 'picok', 120, 240, 320, drawRooster);
  spriteTex(scene, 'dina', 360, 450, 165, drawDune);
  PLACES.forEach((p, i) => {
    spriteTex(scene, 'tabla_' + i, 120, 280, 240, c => drawPlaceSign(c, p));
    spriteTex(scene, 'vrata_' + i, 700, 680, 380, c => drawGate(c, p, GATE_SUB[i]));
  });
  BILLBOARDS.forEach((b, i) => spriteTex(scene, 'pano_' + i, 300, 480, 315, c => drawBillboard(c, b)));
}
