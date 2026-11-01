'use strict';
// The C64 look: the arena is drawn at 256x192 into render textures that are blown up 4x with
// nearest filtering, so every limb comes out in chunky pixels in the C64 palette.
const W = 1024, H = 768, LW = 256, LH = 192, PX = 4;
const FONT = '"Pixelify Sans", monospace';
const PIXFONT = '"Press Start 2P", monospace';
const GROUND = 176;
// The "Colodore" C64 palette
const C = {
    black: 0x000000, white: 0xffffff, red: 0x813338, cyan: 0x75cec8, purple: 0x8e3c97, green: 0x56ac4d,
    blue: 0x2e2c9b, yellow: 0xedf171, orange: 0x8e5029, brown: 0x553800, lred: 0xc46c71, dgrey: 0x4a4a4a,
    grey: 0x7b7b7b, lgreen: 0xa9ff9f, lblue: 0x706deb, lgrey: 0xb2b2b2,
};
const SKIN = 0xe0a878;
const WEAPON_LEN = { pole: 28, nunchaku: 18, chain: 40, sword: 20, club: 18, tonfa: 9 };
const hexStr = c => '#' + c.toString(16).padStart(6, '0');
const pad6 = n => String(n).padStart(6, '0');

function shade(c, k) {
    if (k === 1) return c;
    return (Math.round((c >> 16 & 255) * k) << 16) | (Math.round((c >> 8 & 255) * k) << 8) | Math.round((c & 255) * k);
}

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
// Poses: joint positions relative to the feet, facing right, for a fighter about 62 px tall.
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
    punch: { hip: [-1, -30], neck: [3, -50], head: [4, -56], fe: [14, -49], fh: [24, -51], be: [-5, -43], bh: [-2, -37], fk: [7, -16], ff: [11, 0], bk: [-6, -15], bf: [-12, 0] },
    kick: { hip: [-3, -31], neck: [-8, -49], head: [-10, -55], fe: [-2, -44], fh: [4, -47], be: [-12, -42], bh: [-16, -36], fk: [10, -31], ff: [27, -33], bk: [-3, -16], bf: [-4, 0] },
    highkick: { hip: [-3, -32], neck: [-11, -48], head: [-14, -53], fe: [-4, -44], fh: [2, -48], be: [-15, -41], bh: [-19, -34], fk: [8, -42], ff: [23, -54], bk: [-3, -16], bf: [-4, 0] },
    lowpunch: { hip: [-1, -15], neck: [5, -30], head: [7, -36], fe: [14, -21], fh: [23, -15], be: [0, -23], bh: [6, -26], fk: [11, -11], ff: [9, 0], bk: [-7, -7], bf: [-11, 0] },
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
// Fighters
// ---------------------------------------------------------------------------------------------
// o.scale multiplies the look's own size, o.tint paints the whole figure one colour (hit flash,
// silhouettes), o.active straightens flexible weapons (nunchaku, chain) mid-strike.
function drawFighter(g, look, P, x, y, face, o = {}) {
    const s = (look.size || 1) * (o.scale || 1), f = face, tint = o.tint;
    const col = c => tint !== undefined ? tint : c;
    const X = k => x + P[k][0] * s * f, Y = k => y + P[k][1] * s;
    const seg = (ax, ay, bx, by, w, c) => {
        g.lineStyle(w, col(c)); g.lineBetween(ax, ay, bx, by);
        g.fillStyle(col(c)); g.fillCircle(ax, ay, w / 2); g.fillCircle(bx, by, w / 2);
    };
    const skin = look.skin || SKIN, shoes = look.shoes || C.black;
    const shx = X('neck') + (X('hip') - X('neck')) * 0.15, shy = Y('neck') + (Y('hip') - Y('neck')) * 0.15;
    const leg = (k, ft, dim) => {
        const pc = shade(look.pants, dim ? 0.7 : 1);
        seg(X('hip'), Y('hip'), X(k), Y(k), 4.2 * s, pc);
        seg(X(k), Y(k), X(ft), Y(ft), 3.4 * s, pc);
        g.fillStyle(col(shade(shoes, dim ? 0.7 : 1)));
        g.fillRect(X(ft) + f * 1.5 * s - 2.5 * s, Y(ft) - 1.5 * s, 5 * s, 2 * s);
    };
    const arm = (e, h, dim) => {
        const k = dim ? 0.7 : 1;
        seg(shx, shy, X(e), Y(e), 3.2 * s, shade(look.sleeve ?? skin, k));
        seg(X(e), Y(e), X(h), Y(h), 2.6 * s, shade(skin, k));
        g.fillStyle(col(shade(skin, k))); g.fillCircle(X(h), Y(h), 1.9 * s);
    };

    leg('bk', 'bf', true);
    arm('be', 'bh', true);
    const tw = (look.fat ? 11 : 7) * s;
    seg(X('hip'), Y('hip'), X('neck'), Y('neck'), tw, look.gi);
    if (look.fat) {
        g.fillStyle(col(look.gi));
        g.fillCircle(X('hip') + (X('neck') - X('hip')) * 0.35 + f * 3 * s, Y('hip') + (Y('neck') - Y('hip')) * 0.35, 6.5 * s);
    }
    leg('fk', 'ff', false);
    g.fillStyle(col(look.belt)); g.fillRect(X('hip') - tw / 2 - 0.5, Y('hip') - 1.5 * s, tw + 1, 2 * s);
    if (look.shield) {
        g.fillStyle(col(C.grey)); g.fillCircle(X('bh'), Y('bh'), 7.5 * s);
        g.fillStyle(col(C.lgrey)); g.fillCircle(X('bh'), Y('bh'), 6 * s);
        g.fillStyle(col(C.yellow)); g.fillCircle(X('bh'), Y('bh'), 1.8 * s);
    }

    seg(X('neck'), Y('neck'), X('head'), Y('head'), 2.6 * s, skin);
    const hx = X('head'), hy = Y('head'), r = 5 * s;
    g.fillStyle(col(skin)); g.fillCircle(hx, hy, r);
    const hs = look.hairStyle || 'top';
    if (hs !== 'bald') {
        const hair = look.hair ?? C.black;
        if (hs === 'pony') seg(hx - f * r, hy - 1 * s, hx - f * (r + 5 * s), hy + 4 * s, 2.2 * s, hair);
        if (hs === 'long') seg(hx - f * 3 * s, hy, hx - f * 5 * s, hy + 10 * s, 3.4 * s, hair);
        g.fillStyle(col(hair));
        g.fillCircle(hx - f * 0.9 * s, hy - 1.4 * s, r * 0.95);
        if (hs === 'topknot') g.fillCircle(hx - f * 0.5 * s, hy - r - 1.2 * s, 1.8 * s);
        g.fillStyle(col(skin)); g.fillCircle(hx + f * 1.6 * s, hy + 1.2 * s, r * 0.72);
    }
    if (look.band) {
        g.fillStyle(col(look.band)); g.fillRect(hx - r, hy - 2.6 * s, 2 * r, 1.6 * s);
        seg(hx - f * r, hy - 1.8 * s, hx - f * (r + 4 * s), hy + 1 * s, 1.2 * s, look.band);
    }
    if (look.beard) { g.fillStyle(col(look.beard)); g.fillCircle(hx + f * 2 * s, hy + 4 * s, 2.4 * s); }
    if (look.mustache) {
        g.fillStyle(col(look.mustache));
        g.fillRect(Math.min(hx + f * 1 * s, hx + f * 5 * s), hy + 2 * s, 4 * s, Math.max(1, s));
    }
    if (tint === undefined) { g.fillStyle(0x000000); g.fillRect(Math.round(hx + f * 2.8 * s), Math.round(hy - 0.6 * s), 1, 1); }

    arm('fe', 'fh', false);
    drawWeapon(g, look, X, Y, s, f, !!o.active, col, seg);
}

function drawWeapon(g, look, X, Y, s, f, active, col, seg) {
    const w = look.weapon;
    if (!w || w === 'star') return;
    const ex = X('fe'), ey = Y('fe'), hx = X('fh'), hy = Y('fh');
    let dx = hx - ex, dy = hy - ey;
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const L = (WEAPON_LEN[w] || 0) * s;
    const at = t => [hx + dx * t, hy + dy * t];
    const line = (a, b, wd, c) => seg(a[0], a[1], b[0], b[1], wd, c);
    if (w === 'pole') {
        line(at(-18 * s), at(L), 2 * s, C.brown);
        const b = at(L); g.fillStyle(col(C.yellow)); g.fillRect(b[0] - 1, b[1] - 1, 2, 2);
    } else if (w === 'sword') {
        line([hx, hy], at(L), 1.6 * s, C.lgrey);
        line([hx - dy * 3 * s, hy + dx * 3 * s], [hx + dy * 3 * s, hy - dx * 3 * s], 1.2 * s, C.yellow);
        line([hx, hy], at(-3 * s), 1.4 * s, C.brown);
    } else if (w === 'club') {
        line(at(-2 * s), at(L), 3.4 * s, C.brown);
        const b = at(L); g.fillStyle(col(C.orange)); g.fillCircle(b[0], b[1], 2.6 * s);
    } else if (w === 'tonfa') {
        if (active) line([hx, hy], at(L), 1.8 * s, C.dgrey);
        else line(at(2 * s), [ex - dx * 3 * s, ey - dy * 3 * s], 1.8 * s, C.dgrey);
    } else if (w === 'nunchaku') {
        const a = at(7 * s);
        line([hx, hy], a, 1.6 * s, C.brown);
        if (active) line(at(10 * s), at(L), 1.6 * s, C.brown);
        else line([a[0], a[1] + 3 * s], [a[0] + f * s, a[1] + 10 * s], 1.6 * s, C.brown);
    } else if (w === 'chain') {
        g.fillStyle(col(C.lgrey));
        if (active) {
            for (let t = 0; t <= L; t += 2.5 * s) {
                const o = Math.sin(t * 0.6) * 1.5 * s, p = at(t);
                g.fillRect(p[0] - dy * o, p[1] + dx * o, 1, 1);
            }
            const b = at(L); g.fillStyle(col(C.grey)); g.fillCircle(b[0], b[1], 1.8 * s);
        } else {
            for (let a = 0; a < 6.28; a += 0.5) g.fillRect(hx + Math.cos(a) * 4 * s, hy + 5 * s + Math.sin(a) * 4 * s, 1, 1);
            g.fillStyle(col(C.grey)); g.fillCircle(hx, hy + 10 * s, 1.8 * s);
        }
    } else if (w === 'fan') {
        const ang = Math.atan2(dy, dx);
        g.fillStyle(col(C.lred)); g.slice(hx, hy, 6 * s, ang - 0.8, ang + 0.8); g.fillPath();
        line([hx, hy], at(5 * s), 1, C.yellow);
    }
}

function drawProjectile(g, q, clock) {
    const x = Math.round(q.x), y = Math.round(q.y);
    if (q.fan) {
        const a = clock / 80;
        g.fillStyle(C.lred); g.slice(x, y, 5, a, a + 2.2); g.fillPath();
        g.fillStyle(C.yellow); g.fillRect(x - 1, y - 1, 2, 2);
        return;
    }
    g.fillStyle(C.lgrey);
    if (((clock / 60) | 0) % 2) { g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
    else for (let d = -2; d <= 2; d++) { g.fillRect(x + d, y + d, 1, 1); g.fillRect(x + d, y - d, 1, 1); }
    g.fillStyle(C.dgrey); g.fillRect(x, y, 1, 1);
}

function drawSpark(g, sp) {
    const r = 2 + sp.t / 40, c = ((sp.t / 40) | 0) % 2 ? C.yellow : sp.c;
    const x = Math.round(sp.x), y = Math.round(sp.y);
    g.fillStyle(c);
    g.fillRect(x - r, y, 2 * r + 1, 1); g.fillRect(x, y - r, 1, 2 * r + 1);
    const q = Math.round(r * 0.7);
    g.fillRect(x - q, y - q, 1, 1); g.fillRect(x + q, y - q, 1, 1); g.fillRect(x - q, y + q, 1, 1); g.fillRect(x + q, y + q, 1, 1);
}

// ---------------------------------------------------------------------------------------------
// Stages: a pagoda courtyard by day, at sunset and at night, with ordered-dither skies.
// ---------------------------------------------------------------------------------------------
const THEMES = [
    {
        sky: [[30, 70, C.blue, C.lblue], [70, 112, C.lblue, C.cyan], [112, 140, C.cyan, C.white]],
        sun: [44, 56, 9, C.yellow], far: C.purple, snow: C.lgrey, near: C.green, tree: 0x2f7a2a, trunk: C.brown,
        ground: C.orange, groundLine: C.brown, roof: C.green, roofEdge: C.lgreen, wall: C.red, wallHi: C.lred, stone: C.grey,
    },
    {
        sky: [[30, 72, C.blue, C.purple], [72, 108, C.purple, C.lred], [108, 140, C.lred, C.yellow]],
        sun: [128, 120, 18, C.yellow], far: C.red, near: C.brown, tree: 0x2a1c00, trunk: 0x2a1c00, mirror: true,
        ground: C.brown, groundLine: C.orange, roof: C.dgrey, roofEdge: C.grey, wall: C.red, wallHi: C.orange, stone: C.dgrey,
    },
    {
        sky: [[30, 90, C.black, C.blue], [90, 140, C.blue, C.purple]],
        moon: [196, 52, 8, C.lgrey], stars: true, far: C.dgrey, near: 0x202020, tree: 0x1a2a1a, trunk: 0x202020,
        ground: C.dgrey, groundLine: C.black, roof: C.blue, roofEdge: C.lblue, wall: C.red, wallHi: C.lred, stone: C.grey, lamps: true,
    },
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Vertical blend from colour a to colour b over rows y0..y1, ordered-dithered like a C64 raster.
function ditherBand(g, y0, y1, a, b) {
    g.fillStyle(a); g.fillRect(0, y0, LW, y1 - y0);
    g.fillStyle(b);
    for (let y = y0; y < y1; y++) {
        const d = (y - y0 + 0.5) / (y1 - y0) * 16;
        let run = -1;
        for (let x = 0; x <= LW; x++) {
            const on = x < LW && BAYER[(y & 3) * 4 + (x & 3)] < d;
            if (on && run < 0) run = x;
            if (!on && run >= 0) { g.fillRect(run, y, x - run, 1); run = -1; }
        }
    }
}

function rng(seed) {
    return () => {
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function drawStage(g, T) {
    const m = x => T.mirror ? LW - x : x;
    const rnd = rng(1985);
    for (const [y0, y1, a, b] of T.sky) ditherBand(g, y0, y1, a, b);
    if (T.stars) {
        g.fillStyle(C.white);
        for (let i = 0; i < 50; i++) g.fillRect((rnd() * LW) | 0, 32 + ((rnd() * 70) | 0), 1, 1);
    }
    if (T.sun) { const [x, y, r, c] = T.sun; g.fillStyle(c); g.fillCircle(m(x), y, r); }
    if (T.moon) {
        const [x, y, r, c] = T.moon;
        g.fillStyle(c); g.fillCircle(m(x), y, r);
        g.fillStyle(C.grey); g.fillCircle(m(x) - 3, y - 2, 2); g.fillCircle(m(x) + 2, y + 3, 1.5);
    }

    // Far, jagged mountains with snow caps, then rounded nearer hills.
    const far = [{ x: 0, y: 140 }], peaks = [];
    for (let x = 0; x <= LW + 8; x += 8) {
        const peak = (x / 8) % 2 === 0, y = peak ? 112 - rnd() * 34 : 116 - rnd() * 12;
        far.push({ x, y });
        if (peak && y < 96) peaks.push([x, y]);
    }
    far.push({ x: LW + 8, y: 140 });
    g.fillStyle(T.far); g.fillPoints(far, true);
    if (T.snow) {
        g.fillStyle(T.snow);
        for (const [x, y] of peaks) g.fillTriangle(x - 3.5, y + 5, x, y, x + 3.5, y + 5);
    }
    const near = [{ x: 0, y: 140 }];
    for (let x = 0; x <= LW + 4; x += 4) near.push({ x, y: 128 - 9 * Math.sin(x / 23 + 1) - rnd() * 3 });
    near.push({ x: LW + 4, y: 140 });
    g.fillStyle(T.near); g.fillPoints(near, true);

    drawPagoda(g, m(212), T);

    // Cypresses and a stone lantern on the other side of the courtyard.
    for (const [x, h] of [[14, 50], [34, 38], [52, 30]]) {
        const tx = m(x);
        g.fillStyle(T.trunk); g.fillRect(tx - 1, 140 - h * 0.35, 3, h * 0.35);
        g.fillStyle(T.tree);
        for (let j = 0; j < 3; j++) {
            const w = 11 - j * 3, by = 140 - h * 0.3 - j * h * 0.22;
            g.fillTriangle(tx - w, by, tx + w, by, tx, by - h * 0.38);
        }
    }
    const lx = m(80);
    g.fillStyle(T.stone);
    g.fillRect(lx - 4, 138, 8, 2); g.fillRect(lx - 1, 128, 3, 10); g.fillRect(lx - 3, 122, 7, 6);
    g.fillRect(lx - 5, 120, 11, 2); g.fillRect(lx - 1, 117, 3, 3);
    g.fillStyle(T.lamps ? C.yellow : C.black); g.fillRect(lx - 1, 124, 3, 2);

    // Courtyard floor with perspective tiles.
    g.fillStyle(T.ground); g.fillRect(0, 140, LW, LH - 140);
    g.fillStyle(T.groundLine);
    for (const y of [140, 142, 145, 149, 154, 160, 167, 175, 184]) g.fillRect(0, y, LW, 1);
    g.lineStyle(1, T.groundLine);
    for (let i = -14; i <= 14; i++) g.lineBetween(128 + i * 10, 140, 128 + i * 34, LH);

    g.fillStyle(C.black); g.fillRect(0, 0, LW, 30);
    g.fillStyle(C.dgrey); g.fillRect(0, 30, LW, 1);
}

function drawPagoda(g, cx, T) {
    const base = 140;
    g.fillStyle(T.stone); g.fillRect(cx - 32, base - 6, 64, 6);
    g.fillStyle(shade(T.stone, 0.7)); g.fillRect(cx - 32, base - 3, 64, 1); g.fillRect(cx - 32, base - 1, 64, 1);
    let top = 0;
    for (let i = 0; i < 4; i++) {
        const w = 46 - i * 9, bot = base - 6 - i * 15;
        top = bot - 9;
        g.fillStyle(T.wall); g.fillRect(cx - w / 2, top, w, 9);
        g.fillStyle(T.wallHi);
        for (let x = cx - w / 2 + 2; x < cx + w / 2 - 1; x += 5) g.fillRect(Math.round(x), top, 1, 9);
        g.fillStyle(T.lamps ? C.yellow : C.black); g.fillRect(cx - 3, top + 3, 6, 6);
        const o = 8;
        g.fillStyle(T.roof);
        g.fillPoints([
            { x: cx - w / 2 - o - 3, y: top - 2 }, { x: cx - w / 2 - o, y: top + 1 }, { x: cx + w / 2 + o, y: top + 1 },
            { x: cx + w / 2 + o + 3, y: top - 2 }, { x: cx + w / 2 - 2, y: top - 6 }, { x: cx - w / 2 + 2, y: top - 6 },
        ], true);
        g.fillStyle(T.roofEdge); g.fillRect(cx - w / 2 - o, top, w + 2 * o, 1);
    }
    g.fillStyle(C.yellow); g.fillRect(cx - 1, top - 16, 2, 10); g.fillCircle(cx, top - 17, 2);
    if (T.lamps) {
        g.fillStyle(C.lred);
        for (const dx of [-26, 26]) { g.fillRect(cx + dx - 1, base - 34, 3, 4); g.fillStyle(C.yellow); g.fillRect(cx + dx, base - 33, 1, 2); g.fillStyle(C.lred); }
    }
}

// Each theme is drawn once into a game-wide dynamic texture that every scene can show.
function stageTexture(scene, theme) {
    const key = 'stage' + theme;
    if (!scene.textures.exists(key)) {
        const g = scene.make.graphics({ add: false });
        drawStage(g, THEMES[theme]);
        scene.textures.addDynamicTexture(key, LW, LH).draw(g);
        g.destroy();
    }
    return key;
}

function addStage(scene, theme) {
    return scene.add.image(0, 0, stageTexture(scene, theme)).setOrigin(0).setScale(PX);
}

// A 256x192 canvas shown 4x, plus the graphics object that is drawn into it.
function lowres(scene, depth = 1) {
    const rt = scene.add.renderTexture(0, 0, LW, LH).setOrigin(0).setScale(PX).setDepth(depth);
    const g = scene.make.graphics({ add: false });
    return { rt, g, flush() { rt.clear(); rt.draw(g); } };
}
