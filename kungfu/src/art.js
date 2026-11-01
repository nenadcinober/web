'use strict';
// Rendering. Physics and poses live in a 256x192 arena; every graphics object is drawn scaled 4x,
// so one arena unit is 4 screen pixels and fighters and stages come out as smooth vector art.
const W = 1024, H = 768, LW = 256, LH = 192, PX = 4;
const FONT = '"Pixelify Sans", monospace';
const PIXFONT = '"Press Start 2P", monospace';
const GROUND = 176;
const C = {
    black: 0x000000, white: 0xf4f1ea, red: 0xa8242c, cyan: 0x6fd3d0, purple: 0x7b3fa0, green: 0x3f8f3a,
    blue: 0x2a3d8f, yellow: 0xf2d24b, orange: 0xc06a2c, brown: 0x6b4426, lred: 0xe0707a, dgrey: 0x3c3c44,
    grey: 0x7c7c86, lgreen: 0x9be08a, lblue: 0x5f8de0, lgrey: 0xb9bcc4, gold: 0xe0b040,
};
const SKIN = 0xe8b088;
const OUTLINE = 0x1b120c;
const WEAPON_LEN = { pole: 28, nunchaku: 18, chain: 40, sword: 20, club: 18, tonfa: 9 };
const hexStr = c => '#' + c.toString(16).padStart(6, '0');
const pad6 = n => String(n).padStart(6, '0');

function mix(a, b, t) {
    const r = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t;
    const g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t;
    const bl = (a & 255) + ((b & 255) - (a & 255)) * t;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
const lighten = (c, t = 0.35) => mix(c, 0xffffff, t);
const darken = (c, t = 0.35) => mix(c, 0x000000, t);

const SAVE_KEY = 'kungfu.save.v1';
function loadSave() {
    try { return Object.assign({ hi: 20000 }, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { return { hi: 20000 }; }
}
function saveHi(score) {
    const s = loadSave();
    if (score > s.hi) { s.hi = score; try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
    return s.hi;
}

// ---------------------------------------------------------------------------------------------
// Poses: joint positions relative to the feet, facing right, for a fighter about 62 units tall.
// ---------------------------------------------------------------------------------------------
const IDLE = {
    hip: [0, -30], neck: [2, -50], head: [3, -56], fe: [9, -43], fh: [13, -49], be: [-3, -42], bh: [4, -45],
    fk: [7, -16], ff: [10, 0], bk: [-5, -15], bf: [-9, 0],
};
const pose = over => Object.assign({}, IDLE, over);
const POSES = {
    idle: IDLE,
    idle2: pose({ hip: [0, -29], neck: [2, -49], head: [3, -55], fe: [9, -42], fh: [13, -48], be: [-3, -41], bh: [4, -44], fk: [7, -15], bk: [-5, -14] }),
    walk1: pose({ fk: [9, -15], ff: [14, 0], bk: [-3, -15], bf: [-5, 0] }),
    walk2: pose({ fk: [4, -16], ff: [4, 0], bk: [-7, -14], bf: [-13, 0] }),
    crouch: { hip: [-1, -15], neck: [4, -30], head: [6, -36], fe: [11, -25], fh: [15, -30], be: [0, -23], bh: [7, -27], fk: [11, -11], ff: [9, 0], bk: [-7, -7], bf: [-11, 0] },
    jump: { hip: [0, -34], neck: [1, -54], head: [2, -60], fe: [8, -47], fh: [12, -53], be: [-4, -46], bh: [3, -50], fk: [9, -28], ff: [4, -19], bk: [-4, -26], bf: [-10, -19] },
    punchWind: pose({ neck: [0, -50], head: [1, -56], fe: [5, -43], fh: [8, -47], be: [-3, -42], bh: [3, -46] }),
    punch: { hip: [-1, -30], neck: [3, -50], head: [4, -56], fe: [14, -49], fh: [24, -51], be: [-5, -43], bh: [-2, -37], fk: [7, -16], ff: [11, 0], bk: [-6, -15], bf: [-12, 0] },
    kickWind: { hip: [-1, -31], neck: [-3, -50], head: [-4, -56], fe: [4, -44], fh: [9, -48], be: [-7, -42], bh: [-6, -37], fk: [9, -32], ff: [6, -19], bk: [-3, -16], bf: [-4, 0] },
    kick: { hip: [-3, -31], neck: [-8, -49], head: [-10, -55], fe: [-2, -44], fh: [4, -47], be: [-12, -42], bh: [-16, -36], fk: [10, -31], ff: [27, -33], bk: [-3, -16], bf: [-4, 0] },
    highWind: { hip: [-2, -31], neck: [-5, -50], head: [-6, -56], fe: [3, -45], fh: [8, -49], be: [-9, -42], bh: [-9, -36], fk: [8, -40], ff: [7, -27], bk: [-3, -16], bf: [-4, 0] },
    highkick: { hip: [-3, -32], neck: [-11, -48], head: [-14, -53], fe: [-4, -44], fh: [2, -48], be: [-15, -41], bh: [-19, -34], fk: [8, -42], ff: [23, -54], bk: [-3, -16], bf: [-4, 0] },
    lowpunch: { hip: [-1, -15], neck: [5, -30], head: [7, -36], fe: [14, -21], fh: [23, -15], be: [0, -23], bh: [6, -26], fk: [11, -11], ff: [9, 0], bk: [-7, -7], bf: [-11, 0] },
    sweepWind: { hip: [-2, -13], neck: [-4, -29], head: [-5, -35], fe: [4, -22], fh: [6, -14], be: [-6, -21], bh: [-9, -6], fk: [9, -10], ff: [13, -2], bk: [-7, -7], bf: [-11, 0] },
    sweep: { hip: [-4, -12], neck: [-9, -28], head: [-11, -34], fe: [-4, -20], fh: [-1, -10], be: [-12, -20], bh: [-14, -4], fk: [12, -7], ff: [28, -3], bk: [-8, -6], bf: [-12, 0] },
    flykick: { hip: [0, -34], neck: [-7, -52], head: [-9, -58], fe: [-1, -47], fh: [5, -50], be: [-12, -46], bh: [-16, -40], fk: [11, -33], ff: [25, -31], bk: [-3, -26], bf: [-9, -19] },
    flypunch: { hip: [0, -34], neck: [3, -54], head: [4, -60], fe: [14, -53], fh: [24, -55], be: [-4, -47], bh: [0, -42], fk: [9, -28], ff: [4, -19], bk: [-4, -26], bf: [-10, -19] },
    hit: { hip: [-3, -30], neck: [-8, -48], head: [-11, -53], fe: [-2, -42], fh: [3, -46], be: [-13, -41], bh: [-10, -35], fk: [5, -16], ff: [7, 0], bk: [-6, -15], bf: [-10, 0] },
    down: { hip: [2, -3], neck: [-17, -4], head: [-23, -5], fe: [-10, -8], fh: [-4, -3], be: [-14, -2], bh: [-8, -1], fk: [11, -7], ff: [20, -2], bk: [12, -3], bf: [21, -1] },
    salute: { hip: [0, -30], neck: [1, -50], head: [1, -56], fe: [7, -42], fh: [6, -47], be: [-2, -42], bh: [5, -47], fk: [3, -15], ff: [4, 0], bk: [-3, -15], bf: [-4, 0] },
    swing: { hip: [-1, -30], neck: [-3, -50], head: [-4, -56], fe: [0, -58], fh: [-4, -64], be: [-6, -52], bh: [-5, -62], fk: [7, -16], ff: [11, 0], bk: [-6, -15], bf: [-12, 0] },
    thrust: { hip: [-1, -30], neck: [4, -50], head: [5, -56], fe: [13, -47], fh: [20, -49], be: [4, -44], bh: [13, -46], fk: [8, -16], ff: [13, 0], bk: [-6, -15], bf: [-13, 0] },
    lowswing: { hip: [-2, -24], neck: [6, -41], head: [9, -46], fe: [12, -30], fh: [18, -22], be: [6, -32], bh: [14, -25], fk: [10, -12], ff: [13, 0], bk: [-7, -11], bf: [-12, 0] },
    smash: { hip: [-1, -29], neck: [5, -48], head: [7, -54], fe: [13, -43], fh: [19, -36], be: [6, -42], bh: [15, -38], fk: [8, -16], ff: [13, 0], bk: [-6, -15], bf: [-13, 0] },
    throwback: { hip: [0, -30], neck: [-2, -50], head: [-3, -56], fe: [-8, -48], fh: [-14, -54], be: [4, -43], bh: [10, -46], fk: [7, -16], ff: [11, 0], bk: [-6, -15], bf: [-12, 0] },
    belly: { hip: [-8, -36], neck: [10, -38], head: [16, -40], fe: [16, -34], fh: [23, -38], be: [12, -42], bh: [20, -45], fk: [-18, -34], ff: [-26, -31], bk: [-16, -38], bf: [-24, -42] },
};

// ---------------------------------------------------------------------------------------------
// Painting helpers
// ---------------------------------------------------------------------------------------------
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const add2 = (a, v, k = 1) => [a[0] + v[0] * k, a[1] + v[1] * k];
const norm2 = v => { const d = Math.hypot(v[0], v[1]) || 1; return [v[0] / d, v[1] / d]; };
const pts = arr => arr.map(p => ({ x: p[0], y: p[1] }));

// A tapered capsule from a (radius ra) to b (radius rb) in the current fill colour.
function capsule(g, a, b, ra, rb) {
    const d = norm2([b[0] - a[0], b[1] - a[1]]), n = [-d[1], d[0]];
    g.fillPoints(pts([add2(a, n, ra), add2(b, n, rb), add2(b, n, -rb), add2(a, n, -ra)]), true);
    g.fillCircle(a[0], a[1], ra); g.fillCircle(b[0], b[1], rb);
}

// Colours go through the pen so a hit flash or silhouette can repaint the whole figure, and the
// stage's ambient light (sunset, moonlight) tints every fighter the same way.
function makePen(g, s, o) {
    const amb = o.ambient;
    const col = o.tint !== undefined ? () => o.tint : amb ? c => mix(c, amb.c, amb.k) : c => c;
    return { g, s, col, detail: o.tint === undefined, ow: 0.5 * Math.min(1.2, Math.sqrt(s)) };
}

// An outlined, shaded body part: outline, base, a shadow on the lower right, light on the upper left.
function part(pen, a, b, ra, rb, color) {
    const g = pen.g, ow = pen.ow;
    g.fillStyle(pen.col(OUTLINE)); capsule(g, a, b, ra + ow, rb + ow);
    g.fillStyle(pen.col(color)); capsule(g, a, b, ra, rb);
    if (!pen.detail) return;
    g.fillStyle(pen.col(darken(color, 0.22)));
    capsule(g, add2(a, [0.4, 0.4], ra), add2(b, [0.4, 0.4], rb), ra * 0.5, rb * 0.5);
    g.fillStyle(pen.col(lighten(color, 0.3)));
    capsule(g, add2(a, [-0.42, -0.42], ra), add2(b, [-0.42, -0.42], rb), ra * 0.32, rb * 0.32);
}

function poly(pen, points, color, outline = true) {
    const g = pen.g;
    g.fillStyle(pen.col(color)); g.fillPoints(pts(points), true);
    if (outline) { g.lineStyle(pen.ow * 2, pen.col(OUTLINE)); g.strokePoints(pts(points), true); }
}

function disc(pen, c, r, color, outline = true) {
    const g = pen.g;
    if (outline) { g.fillStyle(pen.col(OUTLINE)); g.fillCircle(c[0], c[1], r + pen.ow); }
    g.fillStyle(pen.col(color)); g.fillCircle(c[0], c[1], r);
}

// A hanging strip (sash end, ponytail, headband tail) that sways with time.
function tail(pen, start, dir, segs, len, r0, r1, color, t, phase) {
    let p = start;
    for (let i = 0; i < segs; i++) {
        const sway = Math.sin(t / 170 + phase + i * 0.9) * (0.5 + i * 0.5) * pen.s;
        const q = [p[0] + dir[0] * len + sway, p[1] + dir[1] * len + Math.abs(sway) * 0.3];
        const k0 = i / segs, k1 = (i + 1) / segs;
        part(pen, p, q, r0 + (r1 - r0) * k0, r0 + (r1 - r0) * k1, color);
        p = q;
    }
}

// ---------------------------------------------------------------------------------------------
// Fighters
// ---------------------------------------------------------------------------------------------
// o.scale multiplies the look's own size, o.tint paints the whole figure one colour (hit flash,
// silhouettes), o.active straightens flexible weapons mid-strike, o.t drives cloth sway and
// o.ambient tints the figure to the stage's light.
function drawFighter(g, look, P, x, y, face, o = {}) {
    const s = (look.size || 1) * (o.scale || 1), f = face, t = o.t || 0;
    const pen = makePen(g, s, o);
    const J = k => [x + P[k][0] * s * f, y + P[k][1] * s];
    const skin = look.skin || SKIN, shoes = look.shoes || OUTLINE;
    const hip = J('hip'), neck = J('neck'), head = J('head');
    const u = norm2([neck[0] - hip[0], neck[1] - hip[1]]);
    let n = [-u[1], u[0]];
    if (n[0] * f < 0) n = [-n[0], -n[1]];        // n points to the fighter's front
    const sh = lerp2(neck, hip, 0.16);
    const slim = look.slim ? 0.85 : 1;

    const leg = (k, ft, back) => {
        const pc = back ? darken(look.pants, 0.25) : look.pants;
        const K = J(k), F = J(ft);
        part(pen, hip, K, 3.4 * s, 2.7 * s, pc);
        part(pen, K, F, 2.7 * s, 2.0 * s, pc);
        const d = norm2([F[0] - K[0], F[1] - K[1]]);
        const v = f === 1 ? [d[1], -d[0]] : [-d[1], d[0]];
        const wrap = look.wraps ?? lighten(pc, 0.45);
        part(pen, lerp2(K, F, 0.78), F, 2.15 * s, 2.0 * s, back ? darken(wrap, 0.25) : wrap);
        const A = add2(F, d, 0.8 * s);
        part(pen, add2(A, v, -1.3 * s), add2(A, v, 3.0 * s), 1.35 * s, 1.0 * s, back ? darken(shoes, 0.25) : shoes);
    };
    const arm = (e, h, back) => {
        const E = J(e), Hd = J(h), sx = add2(sh, n, back ? -0.9 * s : 0.9 * s);
        const dk = c => back ? darken(c, 0.25) : c;
        if (look.sleeve != null) {
            part(pen, sx, E, 2.6 * s * slim, 2.3 * s * slim, dk(look.sleeve));
            part(pen, E, Hd, 1.75 * s * slim, 1.45 * s * slim, dk(skin));
            part(pen, E, lerp2(E, Hd, 0.32), 2.4 * s * slim, 2.2 * s * slim, dk(look.sleeve));
        } else {
            part(pen, sx, E, 2.4 * s * slim, 1.75 * s * slim, dk(skin));
            part(pen, E, Hd, 1.75 * s * slim, 1.45 * s * slim, dk(skin));
        }
        if (look.wrist) part(pen, lerp2(E, Hd, 0.68), lerp2(E, Hd, 0.86), 1.7 * s, 1.6 * s, dk(look.wrist));
        disc(pen, Hd, 2.05 * s * slim, dk(skin));
        if (pen.detail) { g.fillStyle(pen.col(lighten(dk(skin), 0.35))); g.fillCircle(Hd[0] - 0.6 * s, Hd[1] - 0.6 * s, 0.8 * s); }
    };

    leg('bk', 'bf', true);
    arm('be', 'bh', true);

    // Torso: shoulders, chest and waist built around the spine.
    // Widths of the torso on its front and back side at the shoulders, chest and waist.
    const fat = look.fat, k = s * slim;
    const [sw, cw, ww] = (fat ? [5.4, 6.6, 6.4] : [5.4, 5.2, 3.9]).map(v => v * k);
    const [swB, cwB, wwB] = (fat ? [5.4, 5.6, 4.8] : [5.4, 5.2, 3.9]).map(v => v * k);
    const top = lerp2(neck, hip, 0.04), chest = lerp2(neck, hip, 0.35), waist = lerp2(neck, hip, 0.86);
    const body = [add2(top, n, sw), add2(chest, n, cw), add2(waist, n, ww), add2(hip, n, ww + 0.3 * s),
        add2(hip, n, -wwB - 0.3 * s), add2(waist, n, -wwB), add2(lerp2(chest, waist, 0.5), n, -cwB - 0.4 * s), add2(chest, n, -cwB), add2(top, n, -swB)];
    const torsoCol = look.bare ? skin : look.gi;
    poly(pen, body, torsoCol);
    if (pen.detail) {
        poly(pen, [add2(top, n, -swB), add2(chest, n, -cwB), add2(lerp2(chest, waist, 0.5), n, -cwB - 0.4 * s), add2(waist, n, -wwB), add2(hip, n, -wwB),
            add2(hip, n, -wwB + 1.8 * s), add2(waist, n, -wwB + 1.8 * s), add2(chest, n, -cwB + 2 * s), add2(top, n, -swB + 1.8 * s)], darken(torsoCol, 0.15), false);
        poly(pen, [add2(top, n, sw - 1.2 * s), add2(chest, n, cw - 0.6 * s), add2(lerp2(chest, waist, 0.5), n, cw * 0.7), add2(chest, n, cw - 2.2 * s), add2(top, n, sw - 2.6 * s)], lighten(torsoCol, 0.25), false);
    }
    if (fat) {
        const bc = add2(lerp2(neck, hip, 0.62), n, 3.6 * s);
        disc(pen, bc, 6.6 * s, skin);
        if (pen.detail) {
            g.fillStyle(pen.col(darken(skin, 0.18))); g.fillCircle(bc[0] + 1.6 * s, bc[1] + 1.6 * s, 4.6 * s);
            g.fillStyle(pen.col(skin)); g.fillCircle(bc[0] - 0.4 * s, bc[1] - 0.4 * s, 4.8 * s);
            g.fillStyle(pen.col(lighten(skin, 0.3))); g.fillCircle(bc[0] - 2.4 * s, bc[1] - 2.4 * s, 1.6 * s);
            g.fillStyle(pen.col(darken(skin, 0.45))); g.fillCircle(bc[0] + n[0] * 3 * s, bc[1] + 1.2 * s, 0.5 * s);
        }
    }
    if (pen.detail) {
        g.lineStyle(0.45 * s, pen.col(darken(torsoCol, 0.4)));
        if (look.bare) {
            const pc = add2(lerp2(top, chest, 0.75), n, 1 * s);
            g.lineBetween(pc[0], pc[1], pc[0] + n[0] * 3.6 * s + u[0] * -1.6 * s, pc[1] + n[1] * 3.6 * s - u[1] * 1.6 * s);
            g.fillStyle(pen.col(darken(skin, 0.35))); g.fillCircle(pc[0] + n[0] * 2.6 * s, pc[1] + n[1] * 2.6 * s - 0.3 * s, 0.45 * s);
        } else {
            const vb = add2(lerp2(neck, hip, 0.42), n, 1.6 * s);
            poly(pen, [add2(top, n, 2.4 * s), add2(top, n, -0.6 * s), vb], skin, false);
            g.lineStyle(0.5 * s, pen.col(darken(look.gi, 0.35)));
            g.lineBetween(top[0] + n[0] * 2.4 * s, top[1] + n[1] * 2.4 * s, vb[0], vb[1]);
            g.lineBetween(vb[0], vb[1], waist[0] - n[0] * ww * 0.7, waist[1] - n[1] * ww * 0.7);
            const fold = lerp2(chest, waist, 0.5);
            g.lineBetween(fold[0] - n[0] * 2 * s, fold[1] - n[1] * 2 * s, fold[0] - n[0] * 0.6 * s, fold[1] - n[1] * 0.6 * s + 1.5 * s);
        }
    }

    leg('fk', 'ff', false);

    // Sash with a knot at the front and two ends that swing behind.
    const bm = lerp2(waist, hip, 0.55), bw = ww + 0.6 * s, bwB = wwB + 0.6 * s;
    poly(pen, [add2(add2(bm, n, bw), u, 1.15 * s), add2(add2(bm, n, -bwB), u, 1.15 * s), add2(add2(bm, n, -bwB), u, -1.15 * s), add2(add2(bm, n, bw), u, -1.15 * s)], look.belt);
    const knot = add2(bm, n, bw * 0.75);
    tail(pen, knot, [-f * 0.35, 1], 2, 2.6 * s, 0.85 * s, 0.6 * s, look.belt, t, 0);
    tail(pen, knot, [-f * 0.6, 1], 2, 2.4 * s, 0.8 * s, 0.55 * s, darken(look.belt, 0.15), t, 1.7);
    disc(pen, knot, 1.25 * s, look.belt);

    if (look.shield) {
        const B = J('bh');
        disc(pen, B, 7.6 * s, C.grey);
        disc(pen, B, 6.2 * s, 0x7a4a24, false);
        g.lineStyle(0.8 * s, pen.col(C.gold)); g.strokeCircle(B[0], B[1], 4.4 * s);
        g.fillStyle(pen.col(C.lgrey));
        for (let a = 0; a < 6.28; a += 0.785) g.fillCircle(B[0] + Math.cos(a) * 6.9 * s, B[1] + Math.sin(a) * 6.9 * s, 0.45 * s);
        disc(pen, B, 1.9 * s, C.gold);
        if (pen.detail) { g.fillStyle(pen.col(0xfff0b0)); g.fillCircle(B[0] - 0.6 * s, B[1] - 0.6 * s, 0.7 * s); }
    }

    part(pen, lerp2(neck, head, 0.1), lerp2(neck, head, 0.75), 1.7 * s, 1.6 * s, skin);
    drawHead(pen, look, head[0], head[1], s, f, t, o);
    arm('fe', 'fh', false);
    drawWeapon(pen, look, J, s, f, !!o.active, t);
}

// A head in profile, facing f. Also used for the HUD portraits.
function drawHead(pen, look, hx, hy, s, f, t, o = {}) {
    const g = pen.g, r = 5 * s, skin = look.skin || SKIN, hair = look.hair ?? 0x1a1410, hs = look.hairStyle || 'top';
    const at = (dx, dy) => [hx + f * dx * s, hy + dy * s];
    const sway = Math.sin(t / 200) * 0.8 * s;

    if (hs === 'long') {
        poly(pen, [at(-0.5, -4.6), at(-5.6, -1), [hx - f * 6.4 * s + sway, hy + 9 * s], [hx - f * 2.4 * s + sway * 0.6, hy + 9.6 * s], at(-1, 3)], hair);
    }
    if (hs === 'pony') tail(pen, at(-4.4, -2.6), [-f * 0.75, 0.66], 3, 2.6 * s, 1.5 * s, 0.7 * s, hair, t, 0.5);
    if (look.band) {
        tail(pen, at(-4.6, -1.2), [-f * 0.9, 0.45], 2, 2.6 * s, 0.6 * s, 0.4 * s, look.band, t, 2.1);
        tail(pen, at(-4.6, -1.2), [-f * 0.8, 0.7], 2, 2.3 * s, 0.55 * s, 0.4 * s, darken(look.band, 0.15), t, 3.3);
    }

    // Skull and jaw, with a shadow on the back of the head.
    g.fillStyle(pen.col(OUTLINE)); g.fillEllipse(hx + f * 0.3 * s, hy + 0.4 * s, 2 * r * 0.94 + 2 * pen.ow, 2 * r * 1.06 + 2 * pen.ow);
    g.fillStyle(pen.col(pen.detail ? darken(skin, 0.2) : skin)); g.fillEllipse(hx + f * 0.3 * s, hy + 0.4 * s, 2 * r * 0.94, 2 * r * 1.06);
    if (pen.detail) { g.fillStyle(pen.col(skin)); g.fillEllipse(hx + f * 0.9 * s, hy + 0.1 * s, 2 * r * 0.8, 2 * r * 0.98); }
    // nose and chin
    poly(pen, [at(4.1, -1), at(5.6, 1.3), at(4.3, 1.7)], skin, false);
    if (pen.detail) {
        g.lineStyle(0.4 * s, pen.col(OUTLINE));
        const a = at(4.1, -1), b = at(5.6, 1.3), c = at(4.3, 1.7);
        g.lineBetween(a[0], a[1], b[0], b[1]); g.lineBetween(b[0], b[1], c[0], c[1]);
    }
    // ear
    const ear = at(-0.9, 0.6);
    g.fillStyle(pen.col(OUTLINE)); g.fillEllipse(ear[0], ear[1], 2.1 * s, 2.8 * s);
    g.fillStyle(pen.col(darken(skin, 0.12))); g.fillEllipse(ear[0], ear[1], 1.5 * s, 2.2 * s);

    // Hair over the top of the head.
    if (hs !== 'bald') {
        const spiky = hs === 'top', contour = [];
        for (let i = 0; i <= 12; i++) {
            const a = (-35 - i * 17) * Math.PI / 180, rr = r * (spiky ? (i % 2 ? 1.24 : 1.04) : 1.07);
            contour.push([hx + f * Math.cos(a) * rr + f * 0.3 * s, hy + Math.sin(a) * rr + 0.2 * s]);
        }
        contour.push(at(-2.6, 2.6), at(-1.6, -0.6), at(1.4, -2.2), at(3.6, -2.4));
        poly(pen, contour, hair);
        if (pen.detail) {
            g.lineStyle(0.45 * s, pen.col(lighten(hair, 0.3)));
            for (const [a, b] of [[[0.5, -4.2], [-2.6, -3.4]], [[2.2, -3.6], [-0.6, -2.6]], [[-1.6, -4.3], [-3.9, -1.6]]]) {
                const p = at(a[0], a[1]), q = at(b[0], b[1]);
                g.lineBetween(p[0], p[1], q[0], q[1]);
            }
        }
        if (hs === 'topknot') {
            disc(pen, at(-1.4, -6), 2 * s, hair);
            part(pen, at(-1.4, -4.6), at(-1.4, -4), 0.5 * s, 0.5 * s, C.red);
        }
    } else if (pen.detail) {
        g.fillStyle(pen.col(lighten(skin, 0.45))); g.fillEllipse(hx + f * 0.6 * s, hy - 2.9 * s, 3.4 * s, 1.4 * s);
    }
    if (look.band) part(pen, at(4.2, -2), at(-4.5, -1.3), 0.85 * s, 0.85 * s, look.band);

    // Face
    if (pen.detail) {
        const brow = look.brows ?? darken(hair, 0.1);
        part(pen, at(1.5, -2.2), at(3.9, -1.3), 0.45 * s, 0.35 * s, look.hairStyle === 'bald' && !look.brows ? darken(skin, 0.5) : brow);
        if (o.ko) {
            g.lineStyle(0.45 * s, pen.col(OUTLINE));
            const a = at(2.2, -0.3), b = at(3.6, -0.3); g.lineBetween(a[0], a[1], b[0], b[1]);
        } else {
            const e = at(2.9, -0.2);
            g.fillStyle(0xffffff); g.fillEllipse(e[0], e[1], 1.9 * s, 1.25 * s);
            g.fillStyle(0x140c08); g.fillCircle(e[0] + f * 0.4 * s, e[1], 0.55 * s);
        }
        const m0 = at(3.2, 2.9), m1 = at(4.4, 2.7);
        g.lineStyle(0.4 * s, pen.col(look.slim ? 0xb02838 : darken(skin, 0.5))); g.lineBetween(m0[0], m0[1], m1[0], m1[1]);
    }
    if (look.beard) poly(pen, [at(0.8, 2.2), at(4.6, 2.4), [hx + f * 3.4 * s + sway * 0.5, hy + 10 * s], at(1.6, 6)], look.beard);
    if (look.mustache) {
        part(pen, at(4.2, 2.2), [hx + f * 4.5 * s + sway * 0.2, hy + 6 * s], 0.5 * s, 0.3 * s, look.mustache);
        part(pen, at(3.5, 2.1), at(2.3, 4.6), 0.45 * s, 0.3 * s, look.mustache);
    }
}

function drawWeapon(pen, look, J, s, f, active, t) {
    const w = look.weapon, g = pen.g;
    if (!w || w === 'star') return;
    const E = J('fe'), Hd = J('fh');
    const d = norm2([Hd[0] - E[0], Hd[1] - E[1]]), nn = [-d[1], d[0]];
    const L = (WEAPON_LEN[w] || 0) * s;
    const at = k => add2(Hd, d, k);
    if (w === 'pole') {
        part(pen, at(-18 * s), at(L), 0.95 * s, 0.95 * s, 0x9a6a34);
        for (const k of [-15, -12, L / s - 4, L / s - 1]) part(pen, at(k * s), at((k + 1) * s), 1.05 * s, 1.05 * s, C.red);
    } else if (w === 'sword') {
        const tip = at(L), b0 = at(1.5 * s);
        poly(pen, [add2(b0, nn, 1.1 * s), add2(at(L * 0.75), nn, 1.2 * s), tip, add2(at(L * 0.6), nn, -0.7 * s), add2(b0, nn, -0.8 * s)], 0xdfe6ee);
        if (pen.detail) poly(pen, [add2(b0, nn, 1.1 * s), add2(at(L * 0.75), nn, 1.2 * s), tip, at(L * 0.7)], 0xffffff, false);
        part(pen, add2(at(1.2 * s), nn, -2.6 * s), add2(at(1.2 * s), nn, 2.6 * s), 0.65 * s, 0.65 * s, C.gold);
        part(pen, Hd, at(-3.4 * s), 0.7 * s, 0.7 * s, 0x6a1a1a);
        disc(pen, at(-3.8 * s), 0.9 * s, C.gold);
    } else if (w === 'club') {
        part(pen, at(-2.5 * s), at(L), 1.1 * s, 2.6 * s, 0x8a5a2a);
        g.fillStyle(pen.col(C.lgrey));
        for (const k of [0.6, 0.75, 0.9]) { const p = at(L * k); g.fillCircle(p[0] + nn[0] * 1.6 * s, p[1] + nn[1] * 1.6 * s, 0.55 * s); g.fillCircle(p[0] - nn[0] * 1.6 * s, p[1] - nn[1] * 1.6 * s, 0.55 * s); }
    } else if (w === 'tonfa') {
        if (active) part(pen, at(-1 * s), at(L), 0.85 * s, 0.85 * s, 0x4a3020);
        else part(pen, at(2.5 * s), add2(E, d, -3 * s), 0.85 * s, 0.85 * s, 0x4a3020);
        part(pen, Hd, add2(Hd, nn, 1.8 * s * f), 0.55 * s, 0.55 * s, 0x4a3020);
    } else if (w === 'nunchaku') {
        const a = at(7 * s);
        part(pen, Hd, a, 0.8 * s, 0.8 * s, 0x8a5a2a);
        let b0, b1;
        if (active) { b0 = at(10 * s); b1 = at(L); }
        else { b0 = [a[0] + f * 0.6 * s, a[1] + 3 * s]; b1 = [a[0] + f * 1.6 * s + Math.sin(t / 150) * s, a[1] + 10 * s]; }
        g.fillStyle(pen.col(C.lgrey));
        for (let k = 0.2; k < 1; k += 0.3) { const p = lerp2(a, b0, k); g.fillCircle(p[0], p[1], 0.45 * s); }
        part(pen, b0, b1, 0.8 * s, 0.8 * s, 0x8a5a2a);
    } else if (w === 'chain') {
        const links = [];
        if (active) for (let k = 0; k <= L; k += 1.8 * s) { const o = Math.sin(k * 0.5 + t / 40) * 1.3 * s; links.push(add2(at(k), nn, o)); }
        else for (let a = -1.4; a < 4.8; a += 0.35) links.push([Hd[0] + Math.cos(a) * 4.2 * s * f, Hd[1] + 5 * s + Math.sin(a) * 4.2 * s]);
        links.forEach((p, i) => {
            g.fillStyle(pen.col(OUTLINE)); g.fillEllipse(p[0], p[1], 1.6 * s, 1.6 * s);
            g.fillStyle(pen.col(i % 2 ? C.lgrey : C.grey)); g.fillEllipse(p[0], p[1], 1.1 * s, 1.1 * s);
        });
        const end = links[links.length - 1];
        disc(pen, end, 1.9 * s, C.dgrey);
        g.fillStyle(pen.col(C.grey));
        for (let a = 0; a < 6.28; a += 1.05) g.fillTriangle(end[0] + Math.cos(a) * 1.6 * s, end[1] + Math.sin(a) * 1.6 * s, end[0] + Math.cos(a + 0.3) * 3 * s, end[1] + Math.sin(a + 0.3) * 3 * s, end[0] + Math.cos(a + 0.6) * 1.6 * s, end[1] + Math.sin(a + 0.6) * 1.6 * s);
    } else if (w === 'fan') {
        drawFan(pen, Hd, Math.atan2(d[1], d[0]), 6.5 * s);
    }
}

function drawFan(pen, c, ang, r) {
    const g = pen.g;
    g.fillStyle(pen.col(OUTLINE)); g.slice(c[0], c[1], r + pen.ow, ang - 0.85, ang + 0.85); g.fillPath();
    g.fillStyle(pen.col(0xc8283a)); g.slice(c[0], c[1], r, ang - 0.8, ang + 0.8); g.fillPath();
    g.fillStyle(pen.col(0xf0d080)); g.slice(c[0], c[1], r * 0.45, ang - 0.8, ang + 0.8); g.fillPath();
    g.lineStyle(0.3 * r / 6, pen.col(0x5a1010));
    for (let a = -0.8; a <= 0.81; a += 0.2) g.lineBetween(c[0], c[1], c[0] + Math.cos(ang + a) * r, c[1] + Math.sin(ang + a) * r);
}

function drawProjectile(g, q, clock) {
    const pen = makePen(g, 1, {});
    if (q.fan) {
        for (let i = 3; i >= 1; i--) { g.fillStyle(0xc8283a, 0.12 * (4 - i)); g.fillCircle(q.x - Math.sign(q.vx) * i * 3, q.y, 3.5); }
        drawFan(pen, [q.x, q.y], clock / 60, 5.5);
        return;
    }
    const a = clock / 30;
    for (let i = 3; i >= 1; i--) { g.fillStyle(0xdfe6ee, 0.1 * (4 - i)); g.fillCircle(q.x - Math.sign(q.vx) * i * 3, q.y, 3); }
    const star = [];
    for (let i = 0; i < 8; i++) {
        const r = i % 2 ? 1.1 : 4, b = a + i * Math.PI / 4;
        star.push([q.x + Math.cos(b) * r, q.y + Math.sin(b) * r]);
    }
    poly(pen, star, 0xc8ccd6);
    g.fillStyle(0xffffff); g.fillTriangle(star[0][0], star[0][1], star[1][0], star[1][1], q.x, q.y);
    g.fillStyle(0x2a2a30); g.fillCircle(q.x, q.y, 0.9);
}

// ---------------------------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------------------------
function drawSpark(g, sp) {
    const k = sp.t / 200, a = 1 - k;
    g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(sp.x, sp.y, 2.5 + 7 * k);
    g.lineStyle(1.1 * a + 0.2, sp.c === C.lgrey ? 0xc0d8ff : 0xffe060, a);
    for (let i = 0; i < 8; i++) {
        const b = i * Math.PI / 4 + sp.rot, r0 = 2 + 5 * k, r1 = 5 + 12 * k * (i % 2 ? 0.7 : 1);
        g.lineBetween(sp.x + Math.cos(b) * r0, sp.y + Math.sin(b) * r0, sp.x + Math.cos(b) * r1, sp.y + Math.sin(b) * r1);
    }
    g.lineStyle(0.6, 0xffffff, a * 0.8); g.strokeCircle(sp.x, sp.y, 3 + 11 * k);
}

function drawDust(g, d) {
    const k = d.t / 500, a = (1 - k) * 0.45;
    g.fillStyle(d.c, a);
    g.fillEllipse(d.x, d.y - 2 * k, 4 + 10 * k, 2 + 4 * k);
}

// ---------------------------------------------------------------------------------------------
// Stages: a temple courtyard by day, at sunset and at night.
// ---------------------------------------------------------------------------------------------
const THEMES = [
    {
        sky: [0x2f6fc8, 0x86bfee, 0xf2e6c6], sun: [42, 50, 10, 0xfff6d0, 0xfff0a0], clouds: 0xffffff,
        mountains: [0x9fb4d8, 0x7a92bd, 0x5d7f6c], snow: 0xf4f8ff, hills: 0x4c7a3c, forest: 0x34602c,
        blossom: [0xf6b4c6, 0xfbd0dc, 0xe48aa4], bark: 0x4a3024, wall: 0xeee6d6, wallShade: 0xc9bfae, roof: 0x3f5f58,
        wood: 0xa8342c, gold: 0xe0b040, floor: [0xc8b494, 0x8f7a5c], stone: 0x9a968c, particles: 'petals',
    },
    {
        sky: [0x251a52, 0xc85078, 0xffb060], sun: [128, 112, 20, 0xffe6a8, 0xff9040], clouds: 0xffb0a0, mirror: true,
        mountains: [0xa05a78, 0x7a3e60, 0x55304a], hills: 0x3e2a34, forest: 0x2c1c26,
        blossom: [0xf090a8, 0xffc0c8, 0xc86880], bark: 0x2a1a1a, wall: 0xf0c8a8, wallShade: 0xc09078, roof: 0x3a2a38,
        wood: 0x9a2c28, gold: 0xf0b050, floor: [0xb08868, 0x6a4a3a], stone: 0x8a6e64, particles: 'petals',
        ambient: { c: 0xff7040, k: 0.16 },
    },
    {
        sky: [0x04071a, 0x111c44, 0x2a3a6c], moon: [196, 46, 9, 0xf4f2e0, 0x8090c0], stars: true,
        mountains: [0x2c3858, 0x202a46, 0x161e34], hills: 0x121a2c, forest: 0x0c1220,
        blossom: [0x9a90c0, 0xc0b8e0, 0x6a6090], bark: 0x161620, wall: 0x8a90aa, wallShade: 0x60667e, roof: 0x1a2032,
        wood: 0x6a2028, gold: 0xb09040, floor: [0x585a6c, 0x2a2a38], stone: 0x5a5e6e, particles: 'fireflies', lamps: true,
        ambient: { c: 0x203070, k: 0.32 },
    },
];

function rng(seed) {
    return () => {
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function gradRect(g, x, y, w, h, c0, c1, a0 = 1, a1 = 1) {
    g.fillGradientStyle(c0, c0, c1, c1, a0, a0, a1, a1);
    g.fillRect(x, y, w, h);
}

// A mountain ridge by midpoint displacement.
function ridge(rnd, base, lo, hi, rough) {
    let p = [[-10, lo + rnd() * (hi - lo)], [266, lo + rnd() * (hi - lo)]], amp = (hi - lo) * rough;
    for (let it = 0; it < 6; it++) {
        const q = [];
        for (let i = 0; i < p.length - 1; i++) {
            q.push(p[i]);
            q.push([(p[i][0] + p[i + 1][0]) / 2, Math.min(base - 2, Math.max(lo - 10, (p[i][1] + p[i + 1][1]) / 2 + (rnd() - 0.5) * amp))]);
        }
        q.push(p[p.length - 1]);
        p = q; amp *= 0.55;
    }
    return p;
}

function cloud(g, x, y, s, c, a) {
    g.fillStyle(c, a);
    for (const [dx, dy, r] of [[0, 0, 6], [6, -2, 7], [13, 0, 5.5], [-6, 1, 4.5], [4, 2, 6], [10, 2.5, 5]]) g.fillEllipse(x + dx * s, y + dy * s, r * 2.2 * s, r * 1.4 * s);
    g.fillStyle(0xffffff, a * 0.5);
    g.fillEllipse(x + 4 * s, y - 3 * s, 10 * s, 4 * s);
}

function drawStage(g, T) {
    const m = x => T.mirror ? LW - x : x;
    const rnd = rng(1985);
    gradRect(g, 0, 0, LW, 80, T.sky[0], T.sky[1]);
    gradRect(g, 0, 80, LW, 62, T.sky[1], T.sky[2]);
    if (T.stars) {
        for (let i = 0; i < 140; i++) {
            const b = rnd();
            g.fillStyle(0xffffff, 0.3 + b * 0.7);
            g.fillCircle(rnd() * LW, rnd() * 110, 0.15 + b * 0.35);
        }
    }
    const orb = T.sun || T.moon;
    if (orb) {
        const [x, y, r, c, glow] = orb;
        for (let i = 12; i > 0; i--) { g.fillStyle(glow, 0.035); g.fillCircle(m(x), y, r + i * 3.5); }
        g.fillStyle(c); g.fillCircle(m(x), y, r);
        if (T.moon) {
            g.fillStyle(darken(c, 0.12));
            for (const [dx, dy, cr] of [[-3, -2, 2], [2.5, 3, 1.6], [3, -3.5, 1], [-1, 4, 0.9]]) g.fillCircle(m(x) + dx, y + dy, cr);
        }
    }
    if (T.clouds) for (const [x, y, s] of [[30, 30, 1.1], [150, 22, 0.8], [210, 58, 0.9], [96, 66, 0.6]]) cloud(g, m(x), y, s, T.clouds, 0.75);

    // Three mountain ranges fading into the haze, the farthest with snow.
    T.mountains.forEach((col, i) => {
        const base = 141, r = ridge(rnd, base, [38, 62, 88][i], [86, 100, 118][i], [1, 0.85, 0.6][i]);
        g.fillStyle(col); g.fillPoints(pts([[-10, base], ...r, [266, base]]), true);
        // the slopes facing away from the light, a shade darker
        g.fillStyle(darken(col, 0.1));
        for (let k = 0; k < r.length - 1; k++) {
            if (r[k + 1][1] > r[k][1]) g.fillPoints(pts([r[k], r[k + 1], [r[k + 1][0] - 1.5, r[k + 1][1] + 6], [r[k][0] - 1.5, r[k][1] + 6]]), true);
        }
        if (i === 0 && T.snow) {
            g.fillStyle(T.snow);
            for (let k = 2; k < r.length - 2; k++) {
                if (r[k][1] < 66 && r[k][1] <= r[k - 1][1] && r[k][1] <= r[k + 1][1]) {
                    const dy = 66 - r[k][1];
                    g.fillPoints(pts([lerp2(r[k], r[k - 2], 0.5), r[k], lerp2(r[k], r[k + 2], 0.5), [r[k][0] + 1, r[k][1] + dy * 0.6], [r[k][0] - 1.5, r[k][1] + dy * 0.4]]), true);
                }
            }
        }
        gradRect(g, 0, 100 + i * 10, LW, 41 - i * 10, T.sky[2], T.sky[2], 0, 0.45 - i * 0.1);
    });
    const hill = [[-10, 141]];
    for (let x = -10; x <= 266; x += 4) hill.push([x, 127 - 6 * Math.sin(x / 31 + 2) - 3 * Math.sin(x / 11) - rnd() * 1.5]);
    hill.push([266, 141]);
    g.fillStyle(T.hills); g.fillPoints(pts(hill), true);
    g.fillStyle(T.forest);
    for (let x = -6; x < 262; x += 3 + rnd() * 3) {
        const y = 127 - 6 * Math.sin(x / 31 + 2) - 3 * Math.sin(x / 11) + 2, h = 3 + rnd() * 5;
        g.fillTriangle(x - 2, y + 2, x + 2, y + 2, x, y - h);
    }

    drawPagoda(g, m(214), T);
    drawWall(g, T, m);
    drawBlossomTree(g, m(26), T, rnd, T.mirror ? -1 : 1);
    drawLantern(g, m(78), 140, T);
    drawLantern(g, m(176), 140, T);
    drawFloor(g, T, rnd);
    gradRect(g, 0, 160, LW, 32, 0x000000, 0x000000, 0, 0.3);
}

function drawPagoda(g, cx, T) {
    const base = 120;
    let top = 0;
    for (let i = 0; i < 5; i++) {
        const w = 44 - i * 7, bot = base - i * 15;
        top = bot - 9;
        g.fillStyle(T.wood); g.fillRect(cx - w / 2, top, w, 9);
        g.fillStyle(darken(T.wall, 0.05)); g.fillRect(cx - w / 2 + 2, top + 1.5, w - 4, 6);
        g.fillStyle(T.wood);
        for (let x = cx - w / 2; x <= cx + w / 2 - 1; x += w / 6) g.fillRect(x, top, 1.4, 9);
        g.fillStyle(T.lamps ? 0xffd070 : 0x3a2018);
        for (let x = cx - w / 2 + w / 12; x < cx + w / 2 - 2; x += w / 6) g.fillRect(x - 0.6 + 0.7, top + 3, 2, 3.5);
        g.fillStyle(darken(T.wood, 0.3)); g.fillRect(cx - w / 2 - 1, bot - 1, w + 2, 1.4);
        const o = 9, ry = top + 0.5;
        const roof = [[cx - w / 2 - o - 4, ry - 4], [cx - w / 2 - o + 1, ry], [cx + w / 2 + o - 1, ry], [cx + w / 2 + o + 4, ry - 4],
            [cx + w / 2 + o - 2, ry - 2.5], [cx + w / 2 - 3, ry - 7.5], [cx - w / 2 + 3, ry - 7.5], [cx - w / 2 - o + 2, ry - 2.5]];
        g.fillStyle(T.roof); g.fillPoints(pts(roof), true);
        g.lineStyle(0.35, darken(T.roof, 0.35));
        for (let x = cx - w / 2 - o + 3; x < cx + w / 2 + o - 2; x += 2.2) g.lineBetween(x, ry - 0.3, cx + (x - cx) * 0.72, ry - 7.2);
        g.fillStyle(lighten(T.roof, 0.3)); g.fillRect(cx - w / 2 - o + 1, ry - 0.6, w + 2 * o - 2, 0.8);
        g.fillStyle(T.gold);
        g.fillCircle(cx - w / 2 - o - 4, ry - 4.4, 0.9); g.fillCircle(cx + w / 2 + o + 4, ry - 4.4, 0.9);
        g.fillRect(cx - w / 2 - o - 4.3, ry - 4, 0.6, 3); g.fillRect(cx + w / 2 + o + 3.7, ry - 4, 0.6, 3);
    }
    g.fillStyle(T.gold);
    g.fillRect(cx - 0.8, top - 22, 1.6, 15);
    for (let i = 0; i < 5; i++) g.fillEllipse(cx, top - 10 - i * 2.4, 4 - i * 0.4, 1.2);
    g.fillCircle(cx, top - 23, 1.6);
}

function drawWall(g, T, m) {
    g.fillStyle(T.wall); g.fillRect(0, 118, LW, 22);
    gradRect(g, 0, 118, LW, 22, T.wall, T.wallShade);
    g.fillStyle(darken(T.wallShade, 0.15)); g.fillRect(0, 137, LW, 3);
    // tiled roof cap with round tile ends
    g.fillStyle(T.roof); g.fillRect(0, 112, LW, 6);
    g.fillStyle(lighten(T.roof, 0.25)); g.fillRect(0, 111, LW, 1.2);
    g.fillStyle(darken(T.roof, 0.3));
    for (let x = 1; x < LW; x += 3) g.fillCircle(x, 118, 1.2);
    g.fillStyle(lighten(T.roof, 0.15));
    for (let x = 1; x < LW; x += 3) g.fillCircle(x - 0.3, 117.7, 0.5);
    // moon gate in the middle
    const gx = 128;
    g.fillStyle(darken(T.wallShade, 0.3)); g.fillCircle(gx, 128, 12.5);
    g.fillStyle(darken(T.forest, 0.35)); g.fillCircle(gx, 128, 11);
    g.fillStyle(T.forest); g.fillCircle(gx - 3, 133, 8); g.fillCircle(gx + 5, 135, 7);
    g.lineStyle(0.7, T.hills);
    for (const bx of [gx - 6, gx - 1, gx + 4]) g.lineBetween(bx, 140, bx + 1, 118);
    g.lineStyle(0.8, darken(T.wallShade, 0.25)); g.strokeCircle(gx, 128, 12);
    // calligraphy panels
    for (const x of [m(98), m(158)]) {
        g.fillStyle(T.wood); g.fillRect(x - 2.5, 121, 5, 13);
        g.fillStyle(T.gold);
        for (let i = 0; i < 3; i++) { g.fillRect(x - 1.2, 123 + i * 3.6, 2.4, 0.6); g.fillRect(x - 0.3, 122.6 + i * 3.6, 0.6, 2.4); }
    }
}

function drawBlossomTree(g, x, T, rnd, dir) {
    const tips = [];
    const branch = (p, ang, len, w, depth) => {
        const q = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
        g.fillStyle(T.bark); capsule(g, p, q, w, w * 0.7);
        if (depth === 0) { tips.push(q); return; }
        tips.push(lerp2(p, q, 0.7));
        branch(q, ang - 0.35 - rnd() * 0.3, len * 0.74, w * 0.66, depth - 1);
        branch(q, ang + 0.3 + rnd() * 0.35, len * 0.7, w * 0.62, depth - 1);
    };
    branch([x, 141], -Math.PI / 2 + dir * 0.18, 22, 2.6, 4);
    for (const t of tips) {
        for (let i = 0; i < 9; i++) {
            g.fillStyle(T.blossom[(rnd() * 3) | 0]);
            g.fillCircle(t[0] + (rnd() - 0.5) * 12, t[1] + (rnd() - 0.6) * 9, 1.6 + rnd() * 2.4);
        }
    }
    g.fillStyle(lighten(T.blossom[1], 0.4));
    for (const t of tips) for (let i = 0; i < 3; i++) g.fillCircle(t[0] + (rnd() - 0.6) * 9, t[1] + (rnd() - 0.8) * 6, 0.6 + rnd());
}

function drawLantern(g, x, base, T) {
    const st = T.stone, dk = darken(st, 0.3), lt = lighten(st, 0.2);
    g.fillStyle(dk); g.fillRect(x - 5, base - 2, 10, 2);
    g.fillStyle(st); g.fillRect(x - 3.5, base - 4, 7, 2);
    g.fillRect(x - 1.6, base - 15, 3.2, 11);
    g.fillStyle(lt); g.fillRect(x - 1.6, base - 15, 1, 11);
    g.fillStyle(st); g.fillRect(x - 4.5, base - 17, 9, 2);
    g.fillRect(x - 3.5, base - 24, 7, 7);
    g.fillStyle(T.lamps ? 0xffd070 : 0x2a2018); g.fillRect(x - 2, base - 22.5, 4, 4);
    g.fillStyle(dk); g.fillRect(x - 0.3, base - 22.5, 0.6, 4);
    g.fillStyle(st);
    g.fillPoints(pts([[x - 7, base - 23], [x + 7, base - 23], [x + 5, base - 25], [x + 1.5, base - 28], [x - 1.5, base - 28], [x - 5, base - 25]]), true);
    g.fillStyle(lt); g.fillRect(x - 7, base - 23.6, 14, 0.7);
    g.fillStyle(st); g.fillCircle(x, base - 29, 1.4);
}

function drawFloor(g, T, rnd) {
    gradRect(g, 0, 140, LW, 52, T.floor[0], T.floor[1]);
    const vy = 70, rows = [140, 141.6, 143.6, 146.2, 149.4, 153.4, 158.4, 164.6, 172.2, 181.4, 192.5];
    const xAt = (xb, y) => 128 + (xb - 128) * (y - vy) / (LH - vy);
    for (let r = 0; r < rows.length - 1; r++) {
        const y0 = rows[r], y1 = rows[r + 1], off = r % 2 ? 17 : 0;
        for (let xb = -400 + off; xb < 660; xb += 34) {
            const k = (y0 - 140) / 52, base = mix(T.floor[0], T.floor[1], k), c = mix(base, rnd() < 0.5 ? 0xffffff : 0x000000, rnd() * 0.08);
            g.fillStyle(c);
            g.fillPoints(pts([[xAt(xb, y0) + 0.2, y0 + 0.2], [xAt(xb + 34, y0) - 0.2, y0 + 0.2], [xAt(xb + 34, y1) - 0.2, y1 - 0.2], [xAt(xb, y1) + 0.2, y1 - 0.2]]), true);
            if (rnd() < 0.12) {
                g.lineStyle(0.3, darken(base, 0.3));
                const cx = xAt(xb + 10 + rnd() * 14, (y0 + y1) / 2);
                g.lineBetween(cx, y0 + 0.5, cx + (rnd() - 0.5) * 4, (y0 + y1) / 2);
                g.lineBetween(cx + (rnd() - 0.5) * 4, (y0 + y1) / 2, cx + (rnd() - 0.5) * 6, y1 - 0.5);
            }
        }
    }
    gradRect(g, 0, 140, LW, 6, 0x000000, 0x000000, 0.35, 0);
    if (T.particles === 'petals') {
        for (let i = 0; i < 40; i++) {
            g.fillStyle(T.blossom[i % 3], 0.85);
            g.fillEllipse(rnd() * LW, 142 + rnd() * 50, 1.2, 0.7);
        }
    }
}

// Light sources the ambient layer makes glow: lanterns, and the lit pagoda windows at night.
function stageLights(T) {
    if (!T.lamps) return [];
    const m = x => T.mirror ? LW - x : x;
    return [[m(78), 120, 9], [m(176), 120, 9], [m(214), 116, 14], [m(214), 101, 11], [m(214), 86, 9]];
}

// Each theme is painted once into a game-wide texture that every scene can show.
function stageTexture(scene, theme) {
    const key = 'stage' + theme;
    if (!scene.textures.exists(key)) {
        const g = scene.make.graphics({ add: false }).setScale(PX);
        drawStage(g, THEMES[theme]);
        scene.textures.addDynamicTexture(key, W, H).draw(g);
        g.destroy();
    }
    return key;
}

// The painted stage plus its living layer: drifting clouds, falling petals or fireflies, and
// flickering lantern light. Call update(dtMs) every frame.
function addStage(scene, theme) {
    const T = THEMES[theme];
    scene.add.image(0, 0, stageTexture(scene, theme)).setOrigin(0).setDepth(0);
    const back = scene.add.graphics().setScale(PX).setDepth(0.5);
    const glow = scene.add.graphics().setScale(PX).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    const front = scene.add.graphics().setScale(PX).setDepth(5);
    const R = Math.random;
    const clouds = T.clouds ? [0, 1, 2].map(i => ({ x: R() * 300 - 20, y: 14 + i * 16 + R() * 8, s: 0.5 + R() * 0.6, v: 0.8 + R() * 1.2 })) : [];
    const spawn = (anywhere) => T.particles === 'fireflies'
        ? { x: R() * LW, y: 110 + R() * 70, ph: R() * 6.28, vx: (R() - 0.5) * 6, vy: (R() - 0.5) * 4 }
        : { x: anywhere ? R() * LW : R() * LW * 1.2, y: anywhere ? R() * LH : -4, ph: R() * 6.28, vx: -4 - R() * 6, vy: 6 + R() * 6, c: T.blossom[(R() * 3) | 0] };
    const parts = [...Array(T.particles === 'fireflies' ? 22 : 30)].map(() => spawn(true));
    const lights = stageLights(T);
    let t = 0;
    return {
        T,
        update(dtMs) {
            const dt = dtMs / 1000;
            t += dtMs;
            back.clear(); glow.clear(); front.clear();
            for (const c of clouds) {
                c.x += c.v * dt;
                if (c.x > LW + 30) { c.x = -40; c.y = 14 + R() * 40; }
                cloud(back, c.x, c.y, c.s, T.clouds, 0.55);
            }
            for (const [x, y, r] of lights) {
                const fl = 0.85 + Math.sin(t / 90 + x) * 0.08 + Math.sin(t / 37 + y) * 0.05;
                for (let i = 4; i > 0; i--) { glow.fillStyle(0xff9a30, 0.06 * fl); glow.fillCircle(x, y, r * i / 4 * fl + 1); }
            }
            for (const p of parts) {
                if (T.particles === 'fireflies') {
                    p.vx += (R() - 0.5) * 20 * dt; p.vy += (R() - 0.5) * 20 * dt;
                    p.vx = Math.max(-8, Math.min(8, p.vx)); p.vy = Math.max(-6, Math.min(6, p.vy));
                    p.x = (p.x + p.vx * dt + LW) % LW; p.y = Math.max(100, Math.min(185, p.y + p.vy * dt));
                    const a = Math.max(0, Math.sin(t / 400 + p.ph));
                    glow.fillStyle(0xd0ff60, 0.15 * a); glow.fillCircle(p.x, p.y, 2.4);
                    glow.fillStyle(0xf0ffa0, 0.8 * a); glow.fillCircle(p.x, p.y, 0.5);
                } else {
                    p.x += (p.vx + Math.sin(t / 500 + p.ph) * 8) * dt; p.y += p.vy * dt;
                    if (p.y > LH + 4 || p.x < -6) Object.assign(p, spawn(false));
                    front.fillStyle(p.c, 0.9);
                    front.fillEllipse(p.x, p.y, 1.6, 0.6 + Math.abs(Math.sin(t / 250 + p.ph)) * 0.9);
                }
            }
        },
    };
}

// A scaled graphics layer in arena units; drawn straight to the screen.
function canvas(scene, depth = 1) {
    const g = scene.add.graphics().setScale(PX).setDepth(depth);
    return { g, flush() {} };
}

// A heading with a gold gradient fill.
function goldText(t) {
    const grd = t.context.createLinearGradient(0, 0, 0, t.height);
    grd.addColorStop(0, '#fff8c0'); grd.addColorStop(0.45, '#f4c838'); grd.addColorStop(1, '#a85810');
    return t.setFill(grd);
}
