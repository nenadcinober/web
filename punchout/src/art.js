'use strict';
// Procedural art: the fire-station ring, opponents seen from the front and Dudek seen from behind.
const W = 1024, H = 768;
const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';
const OL = 0x1a0e0a;

function mix(a, b, t) {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255;
    const br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
function shade(c, f) { return f < 1 ? mix(c, 0x000000, 1 - f) : mix(c, 0xffffff, f - 1); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;

// A pose places the body (x, y, scale, rotation), the head offset and both gloves (position + scale,
// where a scale above 1 means the glove is coming at the camera).
const POSE0 = { x: 0, y: 0, s: 1, rot: 0, hx: 0, hy: 0, lx: -72, ly: -35, ls: 1, rx: 72, ry: -35, rs: 1, flash: 0, tint: 0 };
const POSE_KEYS = Object.keys(POSE0);
function pose(o) { return Object.assign({}, POSE0, { face: 'normal' }, o); }
function lerpPose(cur, tgt, t) {
    for (const k of POSE_KEYS) cur[k] = lerp(cur[k], tgt[k] ?? POSE0[k], t);
    cur.face = tgt.face || 'normal';
    cur.flashColor = tgt.flashColor;
    return cur;
}

function disc(g, x, y, r, col) { g.fillStyle(col); g.fillCircle(x, y, r); g.strokeCircle(x, y, r); }
function oval(g, x, y, w, h, col) { g.fillStyle(col); g.fillEllipse(x, y, w, h); g.strokeEllipse(x, y, w, h); }
function box(g, x, y, w, h, r, col) { g.fillStyle(col); g.fillRoundedRect(x, y, w, h, r); g.strokeRoundedRect(x, y, w, h, r); }
function poly(g, pts, col) { g.fillStyle(col); g.fillPoints(pts, true); g.strokePoints(pts, true); }

function vgrad(g, x, y, w, h, c1, c2, bands = 24) {
    const bh = h / bands;
    for (let i = 0; i < bands; i++) { g.fillStyle(mix(c1, c2, i / (bands - 1))); g.fillRect(x, y + i * bh, w, bh + 1); }
}

// A tapered limb (shoulder to elbow to wrist) ending in a laced, padded glove.
function arm(g, sx, sy, gx, gy, gs, skin, glove, outward, cuff, thick = 24) {
    const dx = gx - sx, dy = gy - sy, d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (nx * outward < 0) { nx = -nx; ny = -ny; }
    const bend = Math.max(6, 70 - d * 0.3);
    const ex = (sx + gx) / 2 + nx * bend, ey = (sy + gy) / 2 + ny * bend;
    const k = 0.75 + gs * 0.25, wS = thick * 1.3 * k, wE = thick * 0.95 * k, wW = thick * 0.8 * k;
    const seg = (ax, ay, bx, by, wa, wb) => {
        const l = Math.hypot(bx - ax, by - ay) || 1, px = -(by - ay) / l, py = (bx - ax) / l;
        return [{ x: ax + px * wa / 2, y: ay + py * wa / 2 }, { x: bx + px * wb / 2, y: by + py * wb / 2 },
            { x: bx - px * wb / 2, y: by - py * wb / 2 }, { x: ax - px * wa / 2, y: ay - py * wa / 2 }];
    };
    const limb = (col, grow) => {
        g.fillStyle(col);
        g.fillPoints(seg(sx, sy, ex, ey, wS + grow, wE + grow), true);
        g.fillPoints(seg(ex, ey, gx, gy, wE + grow, wW + grow), true);
        g.fillCircle(sx, sy, (wS + grow) * 0.56);
        g.fillCircle(ex, ey, (wE + grow) / 2);
    };
    limb(OL, 6);
    limb(skin, 0);
    // Light along the biceps, shadow under the forearm
    g.lineStyle(Math.max(2, wS * 0.2), shade(skin, 1.12), 0.8);
    g.lineBetween(lerp(sx, ex, 0.2) - nx * wS * 0.18, lerp(sy, ey, 0.2) - ny * wS * 0.18, lerp(sx, ex, 0.75) - nx * wE * 0.18, lerp(sy, ey, 0.75) - ny * wE * 0.18);
    g.lineStyle(Math.max(2, wE * 0.22), shade(skin, 0.82), 0.7);
    g.lineBetween(lerp(ex, gx, 0.15) + nx * wE * 0.22, lerp(ey, gy, 0.15) + ny * wE * 0.22, lerp(ex, gx, 0.7) + nx * wW * 0.22, lerp(ey, gy, 0.7) + ny * wW * 0.22);

    const r = 30 * gs, ed = Math.hypot(ex - gx, ey - gy) || 1, ux = (ex - gx) / ed, uy = (ey - gy) / ed;
    const cx = gx + ux * r * 0.85, cy = gy + uy * r * 0.85;
    g.lineStyle(3, OL);
    disc(g, cx, cy, r * 0.6, cuff);
    g.lineStyle(Math.max(1.5, 2 * gs), shade(cuff, 0.6));
    for (const t of [-0.25, 0.15]) {
        g.lineBetween(cx + ux * r * t - uy * r * 0.3, cy + uy * r * t + ux * r * 0.3, cx + ux * r * (t + 0.2) + uy * r * 0.3, cy + uy * r * (t + 0.2) - ux * r * 0.3);
    }
    g.lineStyle(3, OL);
    disc(g, gx, gy, r, glove);
    disc(g, gx - outward * r * 0.62, gy + r * 0.1, r * 0.38, shade(glove, 0.88));
    g.lineStyle(Math.max(1.5, 2.5 * gs), shade(glove, 0.62));
    g.beginPath(); g.arc(gx, gy, r * 0.64, Math.PI * 1.12, Math.PI * 1.88); g.strokePath();
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(gx - r * 0.25, gy - r * 0.42, r * 0.75, r * 0.38);
}

function inPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}

// Fills the squares of a checkerboard that lie wholly inside a polygon.
function checker(g, pts, x0, y0, x1, y1, sq, col) {
    g.fillStyle(col);
    for (let y = y0, row = 0; y < y1; y += sq, row++) for (let x = x0, c = 0; x < x1; x += sq, c++) {
        if ((row + c) % 2 && inPoly(pts, x + 0.5, y + 0.5) && inPoly(pts, x + sq - 0.5, y + 0.5) && inPoly(pts, x + 0.5, y + sq - 0.5) && inPoly(pts, x + sq - 0.5, y + sq - 0.5)) g.fillRect(x, y, sq, sq);
    }
}

function drawHead(g, L, x, y, R, face, C) {
    const skin = C(L.skin), hair = C(L.hairColor || 0x000000), dark = C(shade(L.skin, 0.8));
    g.lineStyle(3, OL);
    disc(g, x - R * 0.95, y + 4, R * 0.24, skin);
    disc(g, x + R * 0.95, y + 4, R * 0.24, skin);
    oval(g, x, y, R * 1.9, R * 2.1, skin);
    if (L.glassJaw) {
        g.fillStyle(0xcff0ff, 0.6); g.fillEllipse(x, y + R * 0.74, R * 0.95, R * 0.42);
        g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(x - R * 0.25, y + R * 0.68, x - R * 0.05, y + R * 0.82);
        g.lineStyle(3, OL);
    }
    if (L.stubble) {
        g.fillStyle(shade(L.skin, 0.7), 0.5);
        g.fillEllipse(x, y + R * 0.65, R * 1.3, R * 0.6);
    }

    // Hair
    if (L.hair === 'short' || L.hair === 'slick') {
        const pts = [];
        for (let i = 0; i <= 12; i++) { const a = Math.PI * (1 + i / 12); pts.push({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * 1.06 }); }
        if (L.hair === 'short') for (let i = 0; i <= 6; i++) pts.push({ x: x + R * 0.95 - i * R * 0.32, y: y - R * 0.42 + (i % 2) * R * 0.16 });
        else pts.push({ x: x + R * 0.7, y: y - R * 0.55 }, { x: x - R * 0.5, y: y - R * 0.62 });
        poly(g, pts, hair);
        if (L.hair === 'slick') { g.lineStyle(2, 0xffffff, 0.35); g.lineBetween(x - R * 0.5, y - R * 0.85, x + R * 0.4, y - R * 0.9); g.lineStyle(3, OL); }
    } else if (L.hair === 'bald') {
        g.fillStyle(0xffffff, 0.3); g.fillEllipse(x - R * 0.25, y - R * 0.7, R * 0.6, R * 0.25);
        g.fillStyle(hair); g.fillRect(x - R * 0.98, y - R * 0.3, R * 0.2, R * 0.4); g.fillRect(x + R * 0.78, y - R * 0.3, R * 0.2, R * 0.4);
    }

    // Hats
    const hc = C(L.hatColor || 0);
    if (L.hat === 'beret') {
        oval(g, x - R * 0.2, y - R * 0.82, R * 2.2, R * 0.85, hc);
        disc(g, x - R * 0.05, y - R * 1.25, 5, hc);
    } else if (L.hat === 'felt') {
        box(g, x - R * 0.68, y - R * 1.5, R * 1.36, R * 0.82, 12, hc);
        g.fillStyle(C(0x3a2010)); g.fillRect(x - R * 0.68, y - R * 0.86, R * 1.36, R * 0.16);
        oval(g, x, y - R * 0.72, R * 2.6, R * 0.42, hc);
        poly(g, [{ x: x + R * 0.5, y: y - R * 0.9 }, { x: x + R * 1.1, y: y - R * 1.8 }, { x: x + R * 0.7, y: y - R * 0.95 }], C(0x3a8a3a));
    } else if (L.hat === 'comb') {
        const red = C(0xe02424);
        disc(g, x - R * 0.42, y - R * 1.0, R * 0.3, red);
        disc(g, x + R * 0.42, y - R * 1.0, R * 0.3, red);
        disc(g, x, y - R * 1.18, R * 0.38, red);
    } else if (L.hat === 'headband') {
        g.fillStyle(hc); g.fillRect(x - R * 0.97, y - R * 0.62, R * 1.94, R * 0.26);
        g.strokeRect(x - R * 0.97, y - R * 0.62, R * 1.94, R * 0.26);
        poly(g, [{ x: x + R * 0.9, y: y - R * 0.55 }, { x: x + R * 1.5, y: y - R * 0.2 }, { x: x + R * 1.35, y: y - R * 0.05 }, { x: x + R * 0.9, y: y - R * 0.4 }], hc);
    }

    // Eyes and brows
    const ey = y - R * 0.08, ex = R * 0.36;
    if (face === 'hurt') {
        g.lineStyle(4, OL);
        for (const s of [-1, 1]) {
            g.beginPath(); g.moveTo(x + s * ex - 10, ey - 8); g.lineTo(x + s * ex + s * 4, ey); g.lineTo(x + s * ex - 10, ey + 8); g.strokePath();
        }
    } else if (face === 'ko') {
        g.lineStyle(4, OL);
        for (const s of [-1, 1]) { g.lineBetween(x + s * ex - 8, ey - 8, x + s * ex + 8, ey + 8); g.lineBetween(x + s * ex + 8, ey - 8, x + s * ex - 8, ey + 8); }
    } else if (face === 'dizzy') {
        g.lineStyle(2, OL);
        for (const s of [-1, 1]) { disc(g, x + s * ex, ey, 11, C(0xffffff)); g.strokeCircle(x + s * ex + 1, ey, 6); g.strokeCircle(x + s * ex + 2, ey + 1, 2); }
    } else if (face === 'grin') {
        g.lineStyle(4, OL);
        for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * ex, ey + 5, 9, Math.PI * 1.1, Math.PI * 1.9); g.strokePath(); }
    } else {
        const big = face === 'surprised' || face === 'crow';
        g.lineStyle(2, OL);
        for (const s of [-1, 1]) {
            oval(g, x + s * ex, ey, big ? 22 : 17, big ? 26 : 19, C(0xffffff));
            g.fillStyle(OL); g.fillCircle(x + s * ex + (big ? 0 : s * -1), ey + 1, big ? 3 : 5);
        }
        if (face === 'angry' || face === 'normal') {
            g.lineStyle(6, C(L.brows || OL));
            const tilt = face === 'angry' ? 7 : 0;
            for (const s of [-1, 1]) g.lineBetween(x + s * (ex + 12), ey - 18, x + s * (ex - 12), ey - 18 + tilt);
        }
    }
    g.lineStyle(3, OL);
    if (L.blush) { g.fillStyle(0xff7a8a, 0.45); g.fillCircle(x - R * 0.58, y + R * 0.3, 9); g.fillCircle(x + R * 0.58, y + R * 0.3, 9); }

    // Nose
    const nz = L.nose || 1;
    oval(g, x, y + R * 0.2, R * 0.3 * nz, R * 0.26 * nz, dark);

    // Mouth
    const my = y + R * 0.6;
    g.lineStyle(3, OL);
    if (face === 'hurt' || face === 'ko' || face === 'surprised') {
        oval(g, x, my + 4, face === 'surprised' ? 14 : 22, face === 'surprised' ? 16 : 26, 0x401010);
        if (face !== 'surprised') { g.fillStyle(0xe05060); g.fillEllipse(x + 3, my + 12, 12, 8); }
    } else if (face === 'crow') {
        oval(g, x, my + 6, 40, 44, 0x401010);
        g.fillStyle(0xe05060); g.fillEllipse(x, my + 18, 22, 12);
    } else if (face === 'grin') {
        g.fillStyle(0x401010); g.beginPath(); g.arc(x, my - 6, 18, Math.PI * 0.12, Math.PI * 0.88); g.closePath(); g.fillPath(); g.strokePath();
        g.fillStyle(C(0xffffff)); g.fillRect(x - 12, my - 1, 24, 5);
    } else if (face === 'angry') {
        box(g, x - 15, my - 6, 30, 13, 3, C(0xffffff));
        g.lineStyle(2, OL); g.lineBetween(x - 5, my - 6, x - 5, my + 7); g.lineBetween(x + 5, my - 6, x + 5, my + 7); g.lineBetween(x - 15, my, x + 15, my);
    } else if (face === 'dizzy') {
        g.beginPath(); g.moveTo(x - 14, my); for (let i = 1; i <= 4; i++) g.lineTo(x - 14 + i * 7, my + (i % 2 ? -4 : 4)); g.strokePath();
    } else {
        g.lineBetween(x - 11, my, x + 11, my - 2);
    }

    // Moustache and wattle
    const sc = C(L.stacheColor || L.hairColor || OL);
    if (L.stache === 'handlebar') {
        oval(g, x - R * 0.26, y + R * 0.42, R * 0.6, R * 0.22, sc);
        oval(g, x + R * 0.26, y + R * 0.42, R * 0.6, R * 0.22, sc);
        g.lineStyle(5, sc);
        g.beginPath(); g.arc(x - R * 0.62, y + R * 0.28, 9, Math.PI * 0.2, Math.PI * 1.4); g.strokePath();
        g.beginPath(); g.arc(x + R * 0.62, y + R * 0.28, 9, Math.PI * 1.6, Math.PI * 2.8); g.strokePath();
        g.lineStyle(3, OL);
    } else if (L.stache === 'brush') {
        box(g, x - R * 0.42, y + R * 0.33, R * 0.84, R * 0.2, 6, sc);
    }
    if (L.hat === 'comb') {
        disc(g, x - R * 0.14, y + R * 1.12, R * 0.17, C(0xe02424));
        disc(g, x + R * 0.14, y + R * 1.12, R * 0.17, C(0xe02424));
    }
}

// An opponent (or Dudek's portrait) from the front, drawn around the chest centre so the Graphics
// object can be moved, scaled and rotated as a whole.
function drawFighter(g, L, p) {
    g.clear();
    const F = p.flash || 0, FC = p.flashColor ?? 0xffffff;
    const C = F > 0.01 ? c => mix(c, FC, F) : c => c;
    const tw = L.width, hw = tw / 2, skin = C(L.skin);
    g.lineStyle(3, OL, 1);

    for (const sx of [-hw * 0.48, hw * 0.48]) {
        box(g, sx - 23, 120, 46, 170, 10, skin);
        box(g, sx - 25, 262, 50, 20, 4, C(0xf4f4f4));
        box(g, sx - 32, 280, 64, 30, 10, C(L.shoes));
    }

    box(g, -hw, -62, tw, 152, 34, skin);
    if (L.belly) {
        oval(g, 0, 36, tw * 0.94, 132 + L.belly * 18, C(shade(L.skin, 1.06)));
        g.fillStyle(C(shade(L.skin, 0.75))); g.fillCircle(0, 52, 4);
    } else {
        g.lineStyle(3, C(shade(L.skin, 0.75)));
        g.beginPath(); g.arc(-hw * 0.38, -26, hw * 0.4, Math.PI * 0.2, Math.PI * 0.85); g.strokePath();
        g.beginPath(); g.arc(hw * 0.38, -26, hw * 0.4, Math.PI * 0.15, Math.PI * 0.8); g.strokePath();
        if (L.abs) for (const yy of [22, 42]) { g.lineBetween(-hw * 0.3, yy, -4, yy + 2); g.lineBetween(4, yy + 2, hw * 0.3, yy); }
        if (L.abs) g.lineBetween(0, 10, 0, 60);
    }
    if (L.chestHair) {
        g.fillStyle(C(L.hairColor || OL));
        const r = rng(7);
        for (let i = 0; i < 40; i++) g.fillRect(-26 + r() * 52 - (r() - 0.5) * 20, -40 + r() * 70, 3, 3);
    }
    g.lineStyle(3, OL);
    if (L.top === 'smock') {
        box(g, -hw + 2, -58, tw - 4, 146, 28, C(L.topColor));
        const r = rng(3), paints = [0xe03030, 0x2a8ae0, 0xf0c020, 0x30b050, 0xa040c0];
        for (let i = 0; i < 16; i++) { g.fillStyle(C(paints[i % 5])); g.fillCircle(-hw + 18 + r() * (tw - 36), -40 + r() * 120, 4 + r() * 6); }
    } else if (L.top === 'singlet') {
        box(g, -hw + 16, -40, tw - 32, 128, 20, C(L.topColor));
        box(g, -hw + 18, -62, 16, 30, 4, C(L.topColor));
        box(g, hw - 34, -62, 16, 30, 4, C(L.topColor));
    }

    box(g, -hw - 6, 72, tw + 12, 78, 14, C(L.trunks));
    if (L.pattern === 'checker') {
        const sq = 13;
        g.fillStyle(C(0xffffff));
        for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx * sq < tw + 8; xx++) if ((xx + yy) % 2) g.fillRect(-hw - 4 + xx * sq, 84 + yy * sq, sq, sq);
        g.strokeRoundedRect(-hw - 6, 72, tw + 12, 78, 14);
    } else {
        g.fillStyle(C(L.stripe || 0xffffff));
        g.fillRect(-hw - 2, 84, 10, 62); g.fillRect(hw - 8, 84, 10, 62);
    }
    box(g, -hw - 8, 66, tw + 16, L.beltWide ? 30 : 16, 6, C(L.belt));
    if (L.beltWide) { oval(g, 0, 81, 62, 38, C(0xfff0a0)); disc(g, 0, 81, 9, C(0xd02020)); }

    box(g, p.hx * 0.5 - 22, -88 + p.hy * 0.5, 44, 36, 8, skin);
    drawHead(g, L, p.hx, -112 + p.hy, L.headR, p.face, C);

    const glove = C(L.gloves), cuff = C(L.cuff ?? 0xf0f0f0);
    const left = () => arm(g, -hw + 12, -46, p.lx, p.ly, p.ls, skin, glove, -1, cuff);
    const right = () => arm(g, hw - 12, -46, p.rx, p.ry, p.rs, skin, glove, 1, cuff);
    if (p.ls > p.rs) { right(); left(); } else { left(); right(); }
}

// Dudek seen from behind, drawn around his waist: a V-shaped back in a scoop-back top with the
// checkerboard crest, checked shorts, boots, and a short crop faded at the nape.
function drawBack(g, L, p) {
    g.clear();
    const skin = p.tint > 0.01 ? mix(L.skin, 0xff5fa0, p.tint) : L.skin;
    const dark = shade(skin, 0.8);
    g.lineStyle(3, OL);

    for (const s of [-1, 1]) {
        poly(g, [{ x: s * 16, y: 40 }, { x: s * 78, y: 40 }, { x: s * 72, y: 112 }, { x: s * 68, y: 146 }, { x: s * 62, y: 186 }, { x: s * 28, y: 186 }, { x: s * 24, y: 140 }, { x: s * 20, y: 108 }], skin);
        g.fillStyle(dark, 0.55); g.fillEllipse(s * 50, 138, 24, 46);
        g.lineStyle(3, OL);
        box(g, s * 45 - 23, 172, 46, 52, 10, L.shoes);
        g.lineStyle(2, 0xe0e0e0);
        for (let k = 0; k < 3; k++) g.lineBetween(s * 45 - 8, 182 + k * 10, s * 45 + 8, 186 + k * 10);
        g.lineStyle(3, OL);
    }

    const shorts = [{ x: -84, y: -22 }, { x: 84, y: -22 }, { x: 94, y: 62 }, { x: 8, y: 66 }, { x: 0, y: 48 }, { x: -8, y: 66 }, { x: -94, y: 62 }];
    poly(g, shorts, L.trunks);
    checker(g, shorts, -94, -10, 94, 66, 13, 0xffffff);
    g.lineStyle(3, OL); g.strokePoints(shorts, true);
    box(g, -86, -30, 172, 18, 6, L.belt);
    g.fillStyle(L.trunks); g.fillRect(-84, -23, 168, 4);

    const back = [{ x: -68, y: -18 }, { x: 68, y: -18 }, { x: 80, y: -70 }, { x: 96, y: -122 }, { x: 90, y: -152 }, { x: 62, y: -170 }, { x: 30, y: -184 }, { x: -30, y: -184 }, { x: -62, y: -170 }, { x: -90, y: -152 }, { x: -96, y: -122 }, { x: -80, y: -70 }];
    poly(g, back, skin);
    g.fillStyle(dark, 0.45);
    for (const s of [-1, 1]) g.fillPoints([{ x: s * 68, y: -18 }, { x: s * 80, y: -70 }, { x: s * 96, y: -122 }, { x: s * 82, y: -118 }, { x: s * 68, y: -70 }, { x: s * 56, y: -18 }], true);
    // Shoulder blades and the trapezius either side of the neck
    g.lineStyle(3, dark, 0.8);
    for (const s of [-1, 1]) {
        g.beginPath(); g.arc(s * 52, -128, 26, s < 0 ? Math.PI * 0.55 : Math.PI * 0.05, s < 0 ? Math.PI * 0.95 : Math.PI * 0.45); g.strokePath();
        g.lineBetween(s * 18, -192, s * 58, -168);
    }
    g.lineStyle(3, 0xfff4c0, 0.35);
    for (const s of [-1, 1]) g.lineBetween(s * 34, -182, s * 82, -156);

    g.lineStyle(3, OL);
    const top = [{ x: -64, y: -18 }, { x: 64, y: -18 }, { x: 76, y: -82 }, { x: 56, y: -122 }, { x: 36, y: -180 }, { x: 18, y: -180 }, { x: 22, y: -136 }, { x: 0, y: -118 }, { x: -22, y: -136 }, { x: -18, y: -180 }, { x: -36, y: -180 }, { x: -56, y: -122 }, { x: -76, y: -82 }];
    poly(g, top, L.topColor);
    g.lineStyle(2, shade(L.topColor, 1.8), 0.7);
    g.lineBetween(-60, -26, -70, -80); g.lineBetween(60, -26, 70, -80);
    const crest = [{ x: -22, y: -96 }, { x: 22, y: -96 }, { x: 22, y: -68 }, { x: 0, y: -50 }, { x: -22, y: -68 }];
    g.lineStyle(3, OL);
    poly(g, crest, 0xffffff);
    checker(g, crest, -22, -96, 22, -50, 8.8, 0xd42a2a);
    g.lineStyle(3, OL); g.strokePoints(crest, true);

    // Neck, ears, and the back of the head
    poly(g, [{ x: -26, y: -178 }, { x: -18, y: -210 }, { x: 18, y: -210 }, { x: 26, y: -178 }], skin);
    for (const s of [-1, 1]) { disc(g, s * 41, -218, 11, skin); g.fillStyle(dark); g.fillCircle(s * 42, -218, 5); }
    oval(g, 0, -226, 82, 92, skin);
    const hair = L.hairColor, cap = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI * (0.9 + 1.2 * i / 20); cap.push({ x: Math.cos(a) * 42, y: -226 + Math.sin(a) * 47 }); }
    cap.push({ x: 26, y: -200 }, { x: 12, y: -194 }, { x: 0, y: -192 }, { x: -12, y: -194 }, { x: -26, y: -200 });
    poly(g, cap, hair);
    g.fillStyle(hair, 0.35);
    for (let i = -3; i <= 3; i++) g.fillCircle(i * 7, -188 + Math.abs(i), 2);
    const r = rng(9);
    g.lineStyle(2, shade(hair, 1.35), 0.6);
    for (let i = 0; i < 18; i++) {
        const x = -30 + r() * 60, y = -262 + r() * 58;
        if (inPoly(cap, x, y)) g.lineBetween(x, y, x + (r() - 0.5) * 6, y + 6);
    }
    g.lineStyle(2, shade(hair, 0.6));
    g.beginPath(); g.arc(6, -250, 7, 0, Math.PI * 1.6); g.strokePath();

    const glove = L.gloves, cuff = 0xf0f0f0;
    const left = () => arm(g, -84, -148, p.lx, p.ly, p.ls, skin, glove, -1, cuff, 32);
    const right = () => arm(g, 84, -148, p.rx, p.ry, p.rs, skin, glove, 1, cuff, 32);
    if (p.ly < p.ry) { right(); left(); } else { left(); right(); }
}
// Dida Imbro, Dudek's trainer, in his cap with his bicycle never far away.
function drawDida(g, x, y, s = 1, talking = false) {
    g.lineStyle(3, OL);
    const S = v => v * s;
    box(g, x - S(60), y + S(40), S(120), S(110), S(26), 0x5a6a3a);
    box(g, x - S(16), y + S(30), S(32), S(22), 6, 0xe8b890);
    oval(g, x, y, S(84), S(92), 0xe8b890);
    disc(g, x - S(42), y + S(4), S(10), 0xe8b890);
    disc(g, x + S(42), y + S(4), S(10), 0xe8b890);
    box(g, x - S(46), y - S(46), S(92), S(28), 10, 0x34405a);
    oval(g, x + S(18), y - S(22), S(84), S(16), 0x2a3448);
    g.fillStyle(OL); g.fillCircle(x - S(15), y - S(4), S(4)); g.fillCircle(x + S(15), y - S(4), S(4));
    g.lineStyle(4, 0xdddddd); g.lineBetween(x - S(24), y - S(14), x - S(6), y - S(12)); g.lineBetween(x + S(6), y - S(12), x + S(24), y - S(14));
    g.lineStyle(3, OL);
    oval(g, x, y + S(10), S(16), S(14), 0xd09070);
    oval(g, x, y + S(22), S(56), S(14), 0xe0e0e0);
    if (talking) { oval(g, x, y + S(32), S(14), S(10), 0x401010); }
    else g.lineBetween(x - S(8), y + S(32), x + S(8), y + S(32));
}

function drawBike(g, x, y, s = 1) {
    g.lineStyle(4 * s, 0x202020);
    g.strokeCircle(x - 36 * s, y, 24 * s); g.strokeCircle(x + 36 * s, y, 24 * s);
    g.lineStyle(4 * s, 0x2a6ad0);
    g.beginPath(); g.moveTo(x - 36 * s, y); g.lineTo(x - 8 * s, y - 34 * s); g.lineTo(x + 26 * s, y - 34 * s); g.lineTo(x + 36 * s, y); g.lineTo(x, y); g.lineTo(x - 8 * s, y - 34 * s); g.strokePath();
    g.lineBetween(x + 26 * s, y - 34 * s, x + 22 * s, y - 48 * s);
    g.lineBetween(x + 14 * s, y - 50 * s, x + 30 * s, y - 50 * s);
    g.fillStyle(0x6a3a1a); g.fillEllipse(x - 8 * s, y - 38 * s, 20 * s, 7 * s);
    g.lineStyle(3, 0xc08a40); g.strokeRect(x + 24 * s, y - 32 * s, 22 * s, 14 * s);
}

// Referee Mirko, white shirt and bow tie, counting with one arm.
function drawRef(g, x, y, armDown) {
    g.lineStyle(3, OL);
    box(g, x - 34, y + 70, 28, 90, 8, 0x222222);
    box(g, x + 6, y + 70, 28, 90, 8, 0x222222);
    box(g, x - 46, y - 10, 92, 90, 22, 0xf4f4f4);
    poly(g, [{ x: x - 14, y: y - 6 }, { x: x, y: y + 2 }, { x: x - 14, y: y + 10 }], 0x111111);
    poly(g, [{ x: x + 14, y: y - 6 }, { x: x, y: y + 2 }, { x: x + 14, y: y + 10 }], 0x111111);
    oval(g, x, y - 40, 62, 70, 0xf0c09a);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 10, y - 66, 24, 10);
    g.fillStyle(OL); g.fillCircle(x - 11, y - 44, 4); g.fillCircle(x + 11, y - 44, 4);
    box(g, x - 18, y - 30, 36, 8, 3, 0x6a4a2a);
    oval(g, x, y - 18, 12, 10, 0x401010);
    g.lineStyle(14, OL);
    const hx = x + 70, hy = armDown ? y + 50 : y - 70;
    g.lineBetween(x + 40, y + 5, hx, hy);
    g.lineStyle(9, 0xf4f4f4); g.lineBetween(x + 40, y + 5, hx, hy);
    g.lineStyle(3, OL); disc(g, hx, hy, 11, 0xf0c09a);
    g.lineStyle(9, 0xf4f4f4); g.lineBetween(x - 40, y + 5, x - 54, y + 70);
    g.lineStyle(3, OL); disc(g, x - 54, y + 72, 10, 0xf0c09a);
}

// The Gruntovec fire station hall turned boxing arena.
function drawArena(g, seed = 1) {
    const r = rng(seed);
    vgrad(g, 0, 0, W, 330, 0x140c08, 0x3a2414);
    // Wooden wall panels and the firemen's banner
    for (let x = 0; x < W; x += 64) { g.fillStyle(x / 64 % 2 ? 0x2a1a10 : 0x301e12); g.fillRect(x, 80, 64, 70); }
    g.fillStyle(0xb81e1e); g.fillRect(180, 86, 664, 34);
    g.lineStyle(3, 0xf0d060); g.strokeRect(180, 86, 664, 34);
    // Pennants in red-and-white checks strung across the hall
    for (let x = 0; x < W; x += 32) {
        const y = 124 + Math.sin(x / W * Math.PI) * 14;
        g.fillStyle((x / 32) % 2 ? 0xd42a2a : 0xf4f4f4);
        g.fillTriangle(x, y, x + 28, y, x + 14, y + 22);
    }
    // Crowd: rows of heads, bigger towards the ring
    for (let row = 0; row < 5; row++) {
        const y = 150 + row * 30, sz = 13 + row * 2.4;
        g.fillStyle(0x000000, 0.3); g.fillRect(0, y - 4, W, 36);
        for (let x = -10; x < W + 20; x += sz * 2.1 + r() * 8) {
            const yy = y + r() * 8;
            g.fillStyle(mix([0x6a2a2a, 0x2a3a6a, 0x3a5a2a, 0x6a5a2a, 0x4a4a4a, 0x8a3a5a][Math.floor(r() * 6)], 0x140c08, 0.4 - row * 0.07));
            g.fillRoundedRect(x - sz, yy + sz * 0.6, sz * 2, sz * 2, 6);
            g.fillStyle(mix([0xf0c09a, 0xd8a070, 0xe8b890, 0xb07850][Math.floor(r() * 4)], 0x140c08, 0.45 - row * 0.08));
            g.fillCircle(x, yy, sz * 0.8);
            if (r() < 0.25) { g.fillStyle(mix(0x2a2a2a, 0x140c08, 0.3)); g.fillEllipse(x, yy - sz * 0.6, sz * 1.8, sz * 0.6); }
        }
    }
    // Ring floor with perspective
    poly(g, [{ x: 150, y: 312 }, { x: 874, y: 312 }, { x: 1260, y: H }, { x: -236, y: H }], 0x7f9ab8);
    g.fillStyle(0x93aecb); g.fillEllipse(512, 520, 560, 220);
    g.lineStyle(4, 0xb81e1e, 0.6); g.strokeEllipse(512, 520, 560, 220);
    g.fillStyle(0x5a7090); g.fillRect(0, 304, W, 10);
    // Back corner posts and ropes in the national colours
    const ropes = [[236, 0xd42a2a], [264, 0xf4f4f4], [292, 0x2a4ad4]];
    for (const [y, c] of ropes) {
        g.lineStyle(7, OL); g.lineBetween(150, y, 874, y); g.lineBetween(150, y, -120, y + 420); g.lineBetween(874, y, 1144, y + 420);
        g.lineStyle(4, c); g.lineBetween(150, y, 874, y); g.lineBetween(150, y, -120, y + 420); g.lineBetween(874, y, 1144, y + 420);
    }
    for (const x of [150, 874]) { g.lineStyle(3, OL); box(g, x - 9, 220, 18, 96, 4, 0xc8c8c8); box(g, x - 13, 216, 26, 12, 4, 0xd42a2a); }
    // Spotlights
    for (const x of [300, 512, 724]) {
        g.fillStyle(0xfff4c0, 0.05);
        g.fillPoints([{ x: x - 20, y: 0 }, { x: x + 20, y: 0 }, { x: x + 200, y: H }, { x: x - 200, y: H }], true);
    }
}
