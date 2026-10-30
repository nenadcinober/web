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

function arm(g, sx, sy, gx, gy, gs, skin, glove, outward, cuff, thick = 24) {
    const dx = gx - sx, dy = gy - sy, d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (nx * outward < 0) { nx = -nx; ny = -ny; }
    const bend = Math.max(6, 70 - d * 0.3);
    const ex = (sx + gx) / 2 + nx * bend, ey = (sy + gy) / 2 + ny * bend;
    const w = thick * (0.75 + gs * 0.25);
    const limb = (col, lw) => {
        g.lineStyle(lw, col);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(gx, gy); g.strokePath();
        g.fillStyle(col); g.fillCircle(sx, sy, lw / 2); g.fillCircle(ex, ey, lw / 2);
    };
    limb(OL, w + 6);
    limb(skin, w);
    g.lineStyle(3, OL);
    const r = 30 * gs, ed = Math.hypot(ex - gx, ey - gy) || 1;
    disc(g, gx + (ex - gx) / ed * r * 0.8, gy + (ey - gy) / ed * r * 0.8, r * 0.62, cuff);
    disc(g, gx, gy, r, glove);
    disc(g, gx - outward * r * 0.62, gy + r * 0.1, r * 0.38, shade(glove, 0.88));
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(gx - r * 0.25, gy - r * 0.4, r * 0.75, r * 0.42);
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

// Dudek seen from behind, drawn around his waist.
function drawBack(g, L, p) {
    g.clear();
    const skin = p.tint > 0.01 ? mix(L.skin, 0xff5fa0, p.tint) : L.skin;
    g.lineStyle(3, OL);
    for (const sx of [-38, 38]) box(g, sx - 24, 30, 48, 150, 10, skin);
    box(g, -76, -16, 152, 74, 14, L.trunks);
    g.fillStyle(0xffffff);
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 11; xx++) if ((xx + yy) % 2) g.fillRect(-74 + xx * 13.6, -2 + yy * 14, 13.6, 14);
    g.strokeRoundedRect(-76, -16, 152, 74, 14);
    box(g, -78, -164, 156, 162, 38, skin);
    box(g, -62, -142, 124, 142, 26, L.topColor);
    box(g, -60, -166, 18, 34, 4, L.topColor);
    box(g, 42, -166, 18, 34, 4, L.topColor);
    g.lineStyle(3, shade(L.topColor, 1.4), 0.6); g.lineBetween(0, -132, 0, -20);
    g.lineStyle(3, OL);
    box(g, -80, -20, 160, 14, 5, L.belt);
    box(g, -20, -190, 40, 40, 8, skin);
    disc(g, -41, -212, 10, skin);
    disc(g, 41, -212, 10, skin);
    oval(g, 0, -218, 82, 90, skin);
    oval(g, 0, -228, 86, 74, L.hairColor);
    const glove = L.gloves, cuff = 0xf0f0f0;
    const left = () => arm(g, -64, -144, p.lx, p.ly, p.ls, skin, glove, -1, cuff, 36);
    const right = () => arm(g, 64, -144, p.rx, p.ry, p.rs, skin, glove, 1, cuff, 36);
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
