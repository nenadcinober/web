'use strict';
// Procedural art: colour helpers, background painting primitives, the jointed "dude" rig every
// character is built from, and the inventory icons. Nothing is loaded from disk.

const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';
// Screen size, and the height of the scene area above the verb panel.
const W = 1024, H = 768, SH = 544;

function mix(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
function shade(c, f) { return f < 1 ? mix(c, 0x000000, 1 - f) : mix(c, 0xffffff, f - 1); }
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function rng(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const Draw = {
    // Banded gradients rather than fillGradientStyle, so it looks the same under Canvas and WebGL.
    vgrad(g, x, y, w, h, c1, c2, steps = 32) {
        const sh = h / steps;
        for (let i = 0; i < steps; i++) {
            g.fillStyle(mix(c1, c2, i / (steps - 1)));
            g.fillRect(x, y + Math.floor(i * sh), w, Math.ceil(sh) + 1);
        }
    },
    stars(g, x, y, w, h, n, seed) {
        const r = rng(seed);
        for (let i = 0; i < n; i++) {
            g.fillStyle(0xffffff, 0.25 + r() * 0.75);
            const s = r() < 0.12 ? 2 : 1;
            g.fillRect(x + r() * w, y + r() * h * r(), s, s);
        }
    },
    glow(g, x, y, r, c, a = 0.07, n = 6) {
        for (let i = n; i > 0; i--) { g.fillStyle(c, a); g.fillCircle(x, y, r * i / n); }
    },
    moon(g, x, y, r) {
        Draw.glow(g, x, y, r * 3, 0xfff2c0, 0.035, 8);
        g.fillStyle(0xfff4cc); g.fillCircle(x, y, r);
        g.fillStyle(0xe6d8a4);
        g.fillCircle(x - r * 0.35, y - r * 0.2, r * 0.22);
        g.fillCircle(x + r * 0.3, y + r * 0.35, r * 0.15);
        g.fillCircle(x + r * 0.4, y - r * 0.4, r * 0.1);
    },
    planks(g, x, y, w, h, c, rows, seed = 3) {
        const r = rng(seed), rh = h / rows;
        for (let i = 0; i < rows; i++) {
            const yy = y + i * rh;
            g.fillStyle(shade(c, 0.88 + r() * 0.2)); g.fillRect(x, yy, w, rh + 1);
            g.fillStyle(shade(c, 0.6)); g.fillRect(x, yy, w, 2);
            let xx = x + r() * 120;
            while (xx < x + w) { g.fillRect(xx, yy, 2, rh); xx += 110 + r() * 160; }
            g.fillStyle(shade(c, 1.12), 0.5);
            for (let k = 0; k < 6; k++) g.fillRect(x + r() * w, yy + 4 + r() * (rh - 8), 20 + r() * 50, 1);
        }
    },
    vplanks(g, x, y, w, h, c, n, seed = 5) {
        const r = rng(seed), pw = w / n;
        for (let i = 0; i < n; i++) {
            g.fillStyle(shade(c, 0.85 + r() * 0.25)); g.fillRect(x + i * pw, y, pw + 1, h);
            g.fillStyle(shade(c, 0.6)); g.fillRect(x + i * pw, y, 2, h);
        }
    },
    bricks(g, x, y, w, h, c, seed = 4) {
        const r = rng(seed);
        g.fillStyle(shade(c, 0.7)); g.fillRect(x, y, w, h);
        for (let row = 0; row * 18 < h; row++) {
            for (let xx = x - (row % 2) * 20; xx < x + w; xx += 40) {
                g.fillStyle(shade(c, 0.85 + r() * 0.25));
                g.fillRect(Math.max(x, xx + 1), y + row * 18 + 1, Math.min(38, x + w - xx - 1), 16);
            }
        }
    },
    window(g, x, y, w, h, lit, frame = 0x2a1a10) {
        if (lit) Draw.glow(g, x + w / 2, y + h / 2, Math.max(w, h) * 0.9, 0xffc060, 0.04, 5);
        g.fillStyle(frame); g.fillRect(x - 4, y - 4, w + 8, h + 8);
        g.fillStyle(lit ? 0xffd27a : 0x1a2246); g.fillRect(x, y, w, h);
        if (lit) { g.fillStyle(0xffe8a8); g.fillRect(x, y, w, h * 0.35); }
        g.fillStyle(frame); g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4);
    },
    door(g, x, y, w, h, c) {
        g.fillStyle(shade(c, 0.55)); g.fillRect(x - 5, y - 5, w + 10, h + 5);
        g.fillStyle(c); g.fillRect(x, y, w, h);
        g.fillStyle(shade(c, 0.75));
        for (let i = 1; i < 4; i++) g.fillRect(x + i * w / 4, y, 2, h);
        g.fillStyle(0xd8b040); g.fillCircle(x + w - 10, y + h * 0.55, 4);
    },
    house(g, x, y, w, h, c, roof, lit) {
        g.fillStyle(c); g.fillRect(x, y - h, w, h);
        g.fillStyle(roof); g.fillTriangle(x - 5, y - h, x + w + 5, y - h, x + w / 2, y - h - h * 0.55);
        if (lit) {
            g.fillStyle(0xffd27a);
            g.fillRect(x + w * 0.2, y - h * 0.65, w * 0.22, h * 0.3);
            g.fillRect(x + w * 0.6, y - h * 0.65, w * 0.22, h * 0.3);
        }
    },
    cobbles(g, x, y, w, h, c, seed = 9) {
        g.fillStyle(shade(c, 0.6)); g.fillRect(x, y, w, h);
        const r = rng(seed);
        for (let row = 0; row * 14 < h; row++) {
            const yy = y + row * 14 + 7, sz = 18 + row * 2;
            for (let xx = x - (row % 2) * sz / 2; xx < x + w + sz; xx += sz + 2) {
                g.fillStyle(shade(c, 0.85 + r() * 0.3));
                g.fillEllipse(xx, yy, sz, 11 + row * 0.4);
            }
        }
    },
    // Palm drawn around a local origin at the base of the trunk, so the caller can rotate it.
    palm(g, x, y, s = 1, bananas = false) {
        const top = { x: x + 34 * s, y: y - 270 * s };
        for (let i = 0; i < 18; i++) {
            const t = i / 17, px = x + Math.sin(t * 1.4) * 34 * s, py = y - t * 270 * s;
            g.fillStyle(i % 2 ? 0x6a4a2a : 0x5a3c22);
            g.fillEllipse(px, py, (26 - t * 10) * s, 20 * s);
        }
        const leaf = (ang, len, droop) => {
            const dx = Math.cos(ang), dy = Math.sin(ang), pts = [], N = 8;
            for (let i = 0; i <= N; i++) {
                const t = i / N, w = Math.sin(t * Math.PI) * 14 * s;
                pts.push({ x: top.x + dx * len * t - dy * w, y: top.y + dy * len * t + droop * t * t + dx * w });
            }
            for (let i = N; i >= 0; i--) {
                const t = i / N, w = Math.sin(t * Math.PI) * 14 * s;
                pts.push({ x: top.x + dx * len * t + dy * w * 0.3, y: top.y + dy * len * t + droop * t * t - dx * w * 0.3 });
            }
            g.fillPoints(pts, true);
        };
        g.fillStyle(0x1f5a2a);
        for (const a of [-2.9, -2.2, -1.2, -0.4, 0.2]) leaf(a, 120 * s, 50 * s);
        if (bananas) {
            g.fillStyle(0xe8c820);
            for (let i = 0; i < 7; i++) g.fillEllipse(top.x - 10 + (i % 4) * 7, top.y + 14 + Math.floor(i / 4) * 10, 8, 16);
            g.fillStyle(0x6a8a20); g.fillRect(top.x - 2, top.y + 4, 4, 10);
        }
        g.fillStyle(0x2f7a38);
        for (const a of [-2.6, -1.7, -0.8, 0.0]) leaf(a, 100 * s, 40 * s);
        g.fillStyle(0x4a3018);
        g.fillCircle(top.x - 6, top.y + 6, 7 * s); g.fillCircle(top.x + 6, top.y + 8, 7 * s);
    },
    crate(g, x, y, w, h, c = 0x8a6a40) {
        g.fillStyle(shade(c, 0.6)); g.fillRect(x, y, w, h);
        g.fillStyle(c); g.fillRect(x + 3, y + 3, w - 6, h - 6);
        g.fillStyle(shade(c, 0.6)); g.fillRect(x + 3, y + h / 2 - 2, w - 6, 4);
        g.lineStyle(3, shade(c, 0.6)); g.lineBetween(x + 3, y + 3, x + w - 3, y + h - 3);
    },
    barrel(g, x, y, w, h, c = 0x7a4a26) {
        g.fillStyle(c); g.fillRoundedRect(x, y, w, h, w * 0.25);
        g.fillStyle(shade(c, 1.15)); g.fillRect(x + w * 0.3, y + 4, w * 0.15, h - 8);
        g.fillStyle(0x3a3a3a); g.fillRect(x, y + h * 0.2, w, 5); g.fillRect(x, y + h * 0.75, w, 5);
        g.fillStyle(shade(c, 0.7)); g.fillEllipse(x + w / 2, y + 3, w - 4, 10);
    },
    lamp(g, x, y, h) {
        g.fillStyle(0x1a1a1e); g.fillRect(x - 3, y - h, 6, h); g.fillRect(x - 10, y - 6, 20, 6);
        Draw.glow(g, x, y - h - 12, 80, 0xffc860, 0.05, 6);
        g.fillStyle(0x1a1a1e); g.fillRect(x - 11, y - h - 30, 22, 4); g.fillRect(x - 11, y - h - 3, 22, 4);
        g.fillStyle(0xffe08a); g.fillRect(x - 8, y - h - 26, 16, 24);
    },
    board(E, x, y, w, h, text, size, col = 0x2a1a10, tcol = '#f0c860', depth = 1) {
        const g = E.gfx(depth);
        g.fillStyle(shade(col, 0.55)); g.fillRect(x - 3, y - 3, w + 6, h + 6);
        g.fillStyle(col); g.fillRect(x, y, w, h);
        E.txt(x + w / 2, y + h / 2, text, { fontSize: size + 'px', color: tcol, align: 'center' }, depth + 0.1).setOrigin(0.5);
        return g;
    },
    torch(E, x, y, h = 90) {
        const g = E.gfx(y - 1);
        g.fillStyle(0x4a3018); g.fillRect(x - 4, y - h, 8, h);
        g.fillStyle(0x2a1a0a); g.fillRect(x - 8, y - h - 8, 16, 12);
        Draw.glow(g, x, y - h - 20, 110, 0xff9030, 0.045, 6);
        const f = E.keep(E.add.graphics({ x, y: y - h - 6 }).setDepth(y));
        f.fillStyle(0xff6a10); f.fillEllipse(0, -14, 20, 30);
        f.fillStyle(0xffc030); f.fillEllipse(0, -10, 12, 20);
        f.fillStyle(0xfff0a0); f.fillEllipse(0, -6, 6, 10);
        E.tweens.add({ targets: f, scaleY: { from: 0.85, to: 1.15 }, scaleX: { from: 1.05, to: 0.92 }, duration: 150 + Math.random() * 90, yoyo: true, repeat: -1 });
        return f;
    },
    waves(E, x1, x2, y1, y2, n, seed) {
        const r = rng(seed);
        for (let i = 0; i < n; i++) {
            const w = E.keep(E.add.rectangle(x1 + r() * (x2 - x1), y1 + r() * (y2 - y1), 20 + r() * 40, 2, 0x9ab8ff, 0.35).setDepth(1));
            E.tweens.add({ targets: w, x: w.x + 12, alpha: { from: 0.05, to: 0.45 }, duration: 1400 + r() * 1400, yoyo: true, repeat: -1, delay: r() * 1500 });
        }
    },
    chicken(E, x, y) {
        const c = E.keep(E.add.container(x, y).setDepth(y + 1));
        const g = E.add.graphics();
        g.fillStyle(0xe0a020); g.fillRect(-6, -6, 3, 8); g.fillRect(4, -6, 3, 8);
        g.fillStyle(0xf4f0e8); g.fillEllipse(0, -16, 34, 24); g.fillTriangle(-14, -22, -26, -36, -10, -12);
        g.fillStyle(0xd8d0c4); g.fillEllipse(-2, -14, 16, 10);
        const head = E.add.container(12, -26), hg = E.add.graphics();
        hg.fillStyle(0xf4f0e8); hg.fillCircle(0, 0, 8);
        hg.fillStyle(0xd02020); hg.fillEllipse(0, -8, 8, 6); hg.fillEllipse(3, 7, 4, 6);
        hg.fillStyle(0xe0a020); hg.fillTriangle(7, -2, 14, 1, 7, 3);
        hg.fillStyle(0x111111); hg.fillCircle(3, -2, 1.5);
        head.add(hg);
        c.add([g, head]);
        E.tweens.add({ targets: head, angle: 40, y: -18, duration: 150, yoyo: true, repeat: -1, repeatDelay: 1900, hold: 120 });
        return c;
    },
    dog(E, x, y) {
        const c = E.keep(E.add.container(x, y).setDepth(y));
        const col = 0x8a5a30;
        const tail = E.add.graphics({ x: -30, y: -18 });
        tail.fillStyle(col); tail.fillEllipse(-10, -6, 22, 8);
        E.tweens.add({ targets: tail, angle: { from: -25, to: 20 }, duration: 260, yoyo: true, repeat: -1 });
        const g = E.add.graphics();
        g.fillStyle(col); g.fillEllipse(0, -14, 66, 28);
        g.fillEllipse(-22, -4, 22, 9); g.fillEllipse(22, -3, 22, 9);
        g.fillStyle(shade(col, 0.7)); g.fillEllipse(24, -36, 12, 20);
        g.fillStyle(col); g.fillEllipse(32, -28, 30, 24); g.fillEllipse(46, -22, 20, 13);
        g.fillStyle(0x111111); g.fillCircle(55, -24, 3.5); g.fillCircle(36, -32, 2.5);
        g.lineStyle(2, 0x111111); g.lineBetween(31, -37, 40, -35);
        g.fillStyle(0xb02020); g.fillRect(16, -24, 8, 16);
        g.fillStyle(0xdddddd);
        for (let i = 0; i < 3; i++) g.fillTriangle(15, -21 + i * 5, 15, -17 + i * 5, 10, -19 + i * 5);
        c.add([tail, g]);
        return c;
    },
};

// ---------------------------------------------------------------------------------------------
// The dude rig. A container whose origin is at the feet, with legs, arms (upper + forearm),
// torso and head as separate graphics so walking, talking and flexing are just joint angles.
// Drawn facing right; facing left is a negative scaleX.
// ---------------------------------------------------------------------------------------------
function makeDude(scene, opts) {
    const o = Object.assign({
        skin: 0xe8b07a, shirt: 0xffffff, shirtType: 'tank', pants: 0x2848a8, shorts: true, shoes: 0x3a2a20,
        hair: 0xf3d26a, hairStyle: 'short', beard: 0, longBeard: false, mustache: 0, sh: 46, waist: 22, arm: 13, leg: 13,
        head: 1, h: 1, alpha: 1, color: 0xffffff, talkArms: false, female: false,
    }, opts);
    const S = o.h, hipY = -88 * S, shY = -150 * S, th = hipY - shY;
    const s = o.sh, w = o.waist;
    const skinD = shade(o.skin, 0.8), skinL = shade(o.skin, 1.12);
    const c = scene.add.container(0, 0);

    const leg = (side) => {
        const L = scene.add.container(side * w * 0.5, hipY);
        const g = scene.add.graphics(), k = o.leg, l1 = 46 * S, l2 = 40 * S;
        g.fillStyle(o.skin);
        g.fillEllipse(0, l1 * 0.5, k * 2, l1 + 10);
        g.fillEllipse(1, l1 + l2 * 0.42, k * 1.45, l2 + 4);
        g.fillRect(-k * 0.4, l1, k * 0.8, l2);
        g.fillStyle(o.pants);
        if (o.shorts) g.fillRoundedRect(-k - 2, -6, k * 2 + 4, l1 * 0.62, 6);
        else { g.fillEllipse(0, l1 * 0.5, k * 2 + 3, l1 + 12); g.fillRoundedRect(-k * 0.8, l1 * 0.6, k * 1.6, l2 + l1 * 0.4 - 2, 4); }
        g.fillStyle(o.shoes); g.fillRoundedRect(-k * 0.75, l1 + l2 - 6, k * 1.5 + 9, 11, 4);
        L.add(g);
        return L;
    };

    const T = scene.add.container(0, hipY);
    const tg = scene.add.graphics();
    tg.fillStyle(o.skin);
    tg.fillPoints([{ x: -w, y: 2 }, { x: w, y: 2 }, { x: s * 0.9, y: -th * 0.62 }, { x: s, y: -th + 8 }, { x: s * 0.6, y: -th },
        { x: -s * 0.6, y: -th }, { x: -s, y: -th + 8 }, { x: -s * 0.9, y: -th * 0.62 }], true);
    const delt = 13 * Math.min(1.5, Math.max(0.6, s / 40));
    tg.fillCircle(-s + 6, -th + 10, delt); tg.fillCircle(s - 6, -th + 10, delt);
    tg.fillStyle(skinD); tg.fillEllipse(-s * 0.38, -th + 27, s * 0.8, 24); tg.fillEllipse(s * 0.38, -th + 27, s * 0.8, 24);
    tg.fillStyle(o.skin); tg.fillEllipse(-s * 0.38, -th + 23, s * 0.76, 20); tg.fillEllipse(s * 0.38, -th + 23, s * 0.76, 20);
    if (o.shirtType === 'none' || o.shirtType === 'top') {
        tg.lineStyle(2, skinD);
        tg.lineBetween(0, -th + 38, 0, -8);
        for (let r = 0; r < 3; r++) tg.lineBetween(-w * 0.6, -th + 46 + r * 9, w * 0.6, -th + 46 + r * 9);
        tg.fillStyle(skinL, 0.5); tg.fillEllipse(-s * 0.45, -th + 18, s * 0.3, 6); tg.fillEllipse(s * 0.3, -th + 18, s * 0.3, 6);
    }
    tg.fillStyle(o.shirt);
    if (o.shirtType === 'tank') {
        tg.fillPoints([{ x: -w - 1, y: 3 }, { x: w + 1, y: 3 }, { x: s * 0.78, y: -th * 0.62 }, { x: s * 0.42, y: -th + 2 }, { x: s * 0.26, y: -th + 2 },
            { x: s * 0.12, y: -th + 16 }, { x: -s * 0.12, y: -th + 16 }, { x: -s * 0.26, y: -th + 2 }, { x: -s * 0.42, y: -th + 2 }, { x: -s * 0.78, y: -th * 0.62 }], true);
        tg.lineStyle(1, shade(o.shirt, 0.8)); tg.lineBetween(-s * 0.3, -th + 26, s * 0.3, -th + 26);
    } else if (o.shirtType === 'tee' || o.shirtType === 'jacket') {
        tg.fillPoints([{ x: -w - 1, y: 3 }, { x: w + 1, y: 3 }, { x: s * 0.92, y: -th * 0.62 }, { x: s, y: -th + 8 }, { x: s * 0.6, y: -th },
            { x: -s * 0.6, y: -th }, { x: -s, y: -th + 8 }, { x: -s * 0.92, y: -th * 0.62 }], true);
        tg.fillCircle(-s + 6, -th + 10, delt); tg.fillCircle(s - 6, -th + 10, delt);
        if (o.shirtType === 'jacket') {
            tg.lineStyle(1, shade(o.shirt, 0.7), 0.7);
            for (let xx = -s; xx <= s; xx += 8) tg.lineBetween(xx, -th, xx, 2);
            for (let yy = -th + 4; yy < 0; yy += 8) tg.lineBetween(-s, yy, s, yy);
            tg.fillStyle(0xf0f0e0); tg.fillTriangle(-8, -th, 8, -th, 0, -th + 26);
            tg.fillStyle(0xc02030); tg.fillTriangle(-3, -th + 4, 3, -th + 4, 0, -th + 24);
            tg.fillStyle(shade(o.shirt, 0.65)); tg.fillTriangle(-9, -th, -2, -th + 30, -16, -th + 18); tg.fillTriangle(9, -th, 2, -th + 30, 16, -th + 18);
        } else {
            tg.fillStyle(o.skin); tg.fillTriangle(-9, -th, 9, -th, 0, -th + 10);
        }
    } else if (o.shirtType === 'top') {
        tg.fillRoundedRect(-s * 0.85, -th + 10, s * 1.7, 26, 8);
    }
    if (!o.shorts) { tg.fillStyle(o.pants); tg.fillRect(-w - 1, -10, 2 * w + 2, 12); }
    const belt = scene.add.graphics();
    belt.fillStyle(0x6b3b1a); belt.fillRect(-w - 4, -18, 2 * w + 8, 18);
    belt.fillStyle(0xd8b040); belt.fillRect(-7, -16, 14, 14);
    belt.fillStyle(0x6b3b1a); belt.fillRect(-3, -12, 6, 6);
    belt.visible = false;
    T.add([tg, belt]);

    const arm = (side) => {
        const A = scene.add.container(side * (s - 5), shY + 10);
        const a = o.arm, ug = scene.add.graphics();
        ug.fillStyle(o.skin); ug.fillEllipse(0, 20 * S, a * 2, 46 * S);
        ug.fillStyle(skinL, 0.6); ug.fillEllipse(a * 0.3, 16 * S, a * 0.6, 20 * S);
        if (o.shirtType === 'tee') { ug.fillStyle(o.shirt); ug.fillEllipse(0, 10, a * 2 + 5, 26); }
        if (o.shirtType === 'jacket') { ug.fillStyle(o.shirt); ug.fillEllipse(0, 20 * S, a * 2 + 5, 48 * S); }
        const F = scene.add.container(0, 40 * S), fg = scene.add.graphics();
        fg.fillStyle(o.shirtType === 'jacket' ? o.shirt : o.skin);
        fg.fillEllipse(0, 16 * S, a * 1.6 + (o.shirtType === 'jacket' ? 4 : 0), 38 * S);
        const fist = Math.max(5, a * 0.72);
        fg.fillStyle(o.skin); fg.fillCircle(0, 36 * S, fist);
        const chalk = scene.add.graphics();
        chalk.fillStyle(0xf6f6f6); chalk.fillCircle(0, 36 * S, fist);
        chalk.visible = false;
        F.add([fg, chalk]);
        A.add([ug, F]);
        A.fore = F; A.chalk = chalk;
        return A;
    };

    const Hd = scene.add.container(0, shY);
    const hg = scene.add.graphics(), r = 14 * o.head, hy = -10 - r;
    if (o.hairStyle === 'long') { hg.fillStyle(o.hair); hg.fillRoundedRect(-r * 1.2, hy - r * 0.6, r * 1.9, r * 2.7, r * 0.6); }
    if (o.hairStyle === 'ponytail') {
        hg.fillStyle(o.hair); hg.fillEllipse(-r * 1.2, hy + r * 0.35, r * 0.75, r * 2.0);
        hg.fillStyle(0xc03030); hg.fillRect(-r * 1.2 - 3, hy - r * 0.55, 6, 4);
    }
    hg.fillStyle(o.skin);
    hg.fillRect(-7, -14, 14, 16);
    hg.fillTriangle(-s * 0.55, 4, -6, -14, -6, 4); hg.fillTriangle(s * 0.55, 4, 6, -14, 6, 4);
    hg.fillEllipse(1, hy, r * 1.85, r * 2.2);
    hg.fillStyle(skinD); hg.fillEllipse(-r * 0.45, hy + 1, 6, 9);
    hg.fillStyle(0xffffff); hg.fillEllipse(r * 0.5, hy - 2, 7, 6);
    hg.fillStyle(0x151515); hg.fillCircle(r * 0.62, hy - 2, 1.9);
    if (o.female) { hg.lineStyle(2, 0x151515); hg.lineBetween(r * 0.3, hy - 6, r * 0.85, hy - 7); }
    hg.fillStyle(shade(o.hairStyle === 'bald' ? 0x5a4030 : o.hair, 0.6)); hg.fillRect(r * 0.2, hy - 9, 10, 2);
    hg.fillStyle(skinD); hg.fillTriangle(r * 0.85, hy - 3, r * 1.2, hy + 4, r * 0.82, hy + 5);
    if (o.beard) {
        hg.fillStyle(o.beard); hg.fillEllipse(r * 0.35, hy + r * 0.75, r * 1.5, r * 1.1);
        if (o.longBeard) hg.fillTriangle(-r * 0.4, hy + r * 0.8, r * 1.1, hy + r * 0.8, r * 0.2, hy + r * 2.8);
    }
    if (o.mustache) { hg.fillStyle(o.mustache); hg.fillEllipse(r * 0.7, hy + r * 0.42, r * 1.0, 6); }
    switch (o.hairStyle) {
        case 'ponytail': case 'short':
            hg.fillStyle(o.hair); hg.fillEllipse(-1, hy - r * 0.75, r * 1.95, r * 1.05); hg.fillEllipse(-r * 0.55, hy - r * 0.3, r * 0.9, r * 1.2); break;
        case 'long':
            hg.fillStyle(o.hair); hg.fillEllipse(0, hy - r * 0.75, r * 2.0, r * 1.1); hg.fillEllipse(-r * 0.6, hy, r * 0.9, r * 1.6); break;
        case 'mohawk':
            hg.fillStyle(o.hair); hg.fillRect(-r * 0.7, hy - r * 1.7, r * 1.2, r * 0.9); break;
        case 'ring':
            hg.fillStyle(o.hair); hg.fillEllipse(-r * 0.6, hy - r * 0.1, r * 0.8, r * 1.0); break;
        case 'pirate':
            hg.fillStyle(0x0e2a18); hg.fillTriangle(-r * 1.7, hy - r * 0.6, r * 1.8, hy - r * 0.6, 0, hy - r * 2.1);
            hg.fillRect(-r * 1.7, hy - r * 0.9, r * 3.5, r * 0.4);
            hg.fillStyle(0xe8ffe8); hg.fillCircle(0, hy - r * 1.2, 3.5); break;
        case 'bald':
            hg.fillStyle(skinL); hg.fillEllipse(r * 0.1, hy - r * 0.7, r * 0.6, r * 0.3); break;
    }
    const mouthC = scene.add.graphics();
    mouthC.lineStyle(2, o.female ? 0xb03040 : shade(o.skin, 0.5));
    mouthC.lineBetween(r * 0.35, hy + r * 0.5, r * 0.85, hy + r * 0.48);
    const mouthO = scene.add.graphics();
    mouthO.fillStyle(0x401010); mouthO.fillEllipse(r * 0.6, hy + r * 0.52, r * 0.55, r * 0.42);
    mouthO.visible = false;
    Hd.add([hg, mouthC, mouthO]);

    const legL = leg(-1), legR = leg(1), armL = arm(-1), armR = arm(1);
    const prop = scene.add.graphics();
    prop.visible = false;
    c.add([legL, legR, T, armL, armR, Hd, prop]);
    c.setAlpha(o.alpha);

    const d = {
        o, c, t: Math.random() * 1000, facing: 1, scale: 1, walking: false, talking: false, pose: null, basePose: null,
        height: 192 * S, color: o.color, nextMouth: 0,
        rot: { la: 0.12, ra: -0.12, lf: 0.08, rf: -0.08, ll: 0, rl: 0 },
    };
    d.setFacing = (f) => { d.facing = f; c.scaleX = d.scale * f; };
    d.setScale = (sc) => { d.scale = sc; c.scaleY = sc; c.scaleX = sc * d.facing; };
    d.setBelt = (v) => { belt.visible = !!v; };
    d.setChalk = (v) => { armL.chalk.visible = !!v; armR.chalk.visible = !!v; };
    d.setProp = (kind, gold = true) => {
        prop.clear();
        prop.visible = !!kind;
        if (kind === 'barbell') {
            const y = shY - 64 * S;
            prop.fillStyle(0x9aa0a8); prop.fillRect(-125, y - 3, 250, 6);
            for (const sx of [-1, 1]) {
                prop.fillStyle(0x222428); prop.fillRoundedRect(sx * 98 - 8, y - 36, 16, 72, 4); prop.fillRoundedRect(sx * 82 - 7, y - 30, 14, 60, 4);
            }
            if (gold) { prop.fillStyle(0xf2c430); prop.fillRoundedRect(108, y - 26, 12, 52, 4); }
        }
    };
    d.update = (dt) => {
        d.t += dt;
        const R = { la: 0.12, ra: -0.12, lf: 0.08, rf: -0.08, ll: 0, rl: 0 };
        if (d.walking) {
            const p = Math.sin(d.t * 0.011);
            R.ll = p * 0.42; R.rl = -p * 0.42;
            R.la = 0.14 + p * 0.3; R.ra = -0.14 + p * 0.3; R.lf = 0.25; R.rf = -0.25;
        }
        switch (d.pose) {
            case 'flex': R.la = 1.5; R.lf = 1.85; R.ra = -1.5; R.rf = -1.85; break;
            case 'crab': R.la = 0.4; R.lf = -1.25; R.ra = -0.4; R.rf = 1.25; break;
            case 'lift': R.la = Math.PI - 0.3; R.lf = 0; R.ra = -(Math.PI - 0.3); R.rf = 0; break;
            case 'reach': R.ra = -1.35; R.rf = -0.15; break;
            case 'hips': R.la = 0.75; R.lf = -1.7; R.ra = -0.75; R.rf = 1.7; break;
            case 'cheer': R.la = Math.PI - 0.5 + Math.sin(d.t * 0.012) * 0.2; R.ra = -(Math.PI - 0.5) + Math.sin(d.t * 0.012) * 0.2; R.lf = 0.3; R.rf = -0.3; break;
        }
        if (d.talking && o.talkArms) {
            R.ra = -2.1 + Math.sin(d.t * 0.009) * 0.5; R.rf = -0.6;
            R.la = 0.6 + Math.sin(d.t * 0.012) * 0.4; R.lf = 0.6;
        }
        const k = Math.min(1, dt * 0.014);
        for (const key in R) d.rot[key] += (R[key] - d.rot[key]) * k;
        legL.rotation = d.rot.ll; legR.rotation = d.rot.rl;
        armL.rotation = d.rot.la; armL.fore.rotation = d.rot.lf;
        armR.rotation = d.rot.ra; armR.fore.rotation = d.rot.rf;
        const breath = Math.sin(d.t * 0.003);
        T.scaleY = 1 + breath * 0.012;
        T.y = hipY - (d.walking ? Math.abs(Math.sin(d.t * 0.011)) * 3 : 0);
        Hd.y = shY + (T.y - hipY) - breath * 0.8;
        armL.y = armR.y = shY + 10 + (T.y - hipY);
        if (d.talking) {
            if (d.t > d.nextMouth) {
                mouthO.visible = !mouthO.visible; mouthC.visible = !mouthO.visible;
                d.nextMouth = d.t + 70 + Math.random() * 90;
            }
        } else { mouthO.visible = false; mouthC.visible = true; }
    };
    return d;
}

// ---------------------------------------------------------------------------------------------
// Inventory icons, drawn once into 64x64 textures by the boot scene.
// ---------------------------------------------------------------------------------------------
const ICONS = {
    novcanik(g) {
        g.fillStyle(0x5a3018); g.fillRoundedRect(8, 18, 48, 32, 6);
        g.fillStyle(0x7a4422); g.fillRoundedRect(8, 18, 48, 14, 6);
        g.fillStyle(0x3a8a3a); g.fillRect(14, 11, 30, 12);
        g.fillStyle(0x5ab05a); g.fillRect(16, 13, 26, 3);
        g.fillStyle(0xd8b040); g.fillCircle(48, 40, 5);
        g.fillStyle(0x6fc0ff); g.fillCircle(12, 54, 2.5); g.fillCircle(52, 56, 2); g.fillCircle(30, 58, 2);
    },
    skusa(g) {
        g.fillStyle(0x5a7fa0); g.fillEllipse(28, 32, 42, 18); g.fillTriangle(46, 32, 60, 20, 60, 44);
        g.fillStyle(0xd0e0f0); g.fillEllipse(26, 37, 32, 7);
        g.lineStyle(2, 0x2a4060); for (let i = 0; i < 4; i++) g.lineBetween(18 + i * 7, 25, 22 + i * 7, 31);
        g.fillStyle(0xffffff); g.fillCircle(14, 29, 4); g.fillStyle(0x111111); g.fillCircle(13, 29, 2);
    },
    jaje(g) {
        g.fillStyle(0xf4ead0); g.fillEllipse(32, 34, 32, 40);
        g.fillStyle(0xffffff, 0.7); g.fillEllipse(25, 25, 9, 12);
        g.fillStyle(0xd8c8a8); g.fillEllipse(38, 44, 10, 8);
    },
    banana(g) {
        for (let i = 0; i <= 20; i++) {
            const t = i / 20, a = Math.PI * (0.15 + t * 0.7);
            g.fillStyle(t < 0.08 || t > 0.94 ? 0x6a4a18 : 0xf2d020);
            g.fillCircle(32 + Math.cos(a) * 22, 14 + Math.sin(a) * 26, 6 + Math.sin(t * Math.PI) * 3);
        }
        g.fillStyle(0xfff080, 0.8);
        for (let i = 4; i <= 16; i++) { const a = Math.PI * (0.15 + i / 20 * 0.7); g.fillCircle(32 + Math.cos(a) * 17, 14 + Math.sin(a) * 21, 2); }
    },
    pojas(g) {
        g.fillStyle(0x6b3b1a); g.fillRoundedRect(4, 22, 56, 20, 5);
        g.fillStyle(0x8a5228); g.fillRect(4, 24, 56, 4);
        g.fillStyle(0xd8b040); g.fillRect(22, 18, 20, 28); g.fillStyle(0x6b3b1a); g.fillRect(27, 23, 10, 18);
        g.fillStyle(0x2a1a0a); for (let i = 0; i < 3; i++) g.fillCircle(48 + i * 4, 32, 1.5);
    },
    zob(g) {
        g.fillStyle(0xc8b080); g.fillPoints([{ x: 14, y: 20 }, { x: 50, y: 20 }, { x: 56, y: 58 }, { x: 8, y: 58 }], true);
        g.fillStyle(0xa89060); g.fillTriangle(18, 20, 46, 20, 32, 8);
        g.fillStyle(0x6a3a1a); g.fillRect(16, 18, 32, 4);
        g.fillStyle(0xf0e0b0); for (let i = 0; i < 9; i++) g.fillEllipse(18 + (i % 3) * 12, 32 + Math.floor(i / 3) * 8, 7, 4);
    },
    magnezij(g) {
        g.fillStyle(0xf0f0f0); g.fillRect(14, 18, 36, 40); g.fillEllipse(32, 58, 36, 8);
        g.fillStyle(0xe0e0e0); g.fillEllipse(32, 18, 36, 10);
        g.fillStyle(0x2a6ad0); g.fillRect(14, 30, 36, 14);
        g.fillStyle(0xffffff); g.fillRect(20, 35, 8, 4); g.fillRect(32, 35, 12, 4);
        g.fillStyle(0xffffff, 0.8); g.fillCircle(24, 10, 5); g.fillCircle(34, 7, 6); g.fillCircle(42, 11, 4);
    },
    kreatin(g) {
        g.fillStyle(0x4a6a3a); g.fillRect(12, 16, 40, 42); g.fillEllipse(32, 58, 40, 8);
        g.fillStyle(0x3a5a2a); g.fillEllipse(32, 16, 40, 10);
        g.fillStyle(0xd8c890); g.fillRect(16, 28, 32, 16);
        g.fillStyle(0x8a2020); g.fillRect(20, 32, 24, 3); g.fillRect(20, 38, 16, 3);
        g.lineStyle(1, 0xdddddd, 0.7); g.lineBetween(12, 16, 22, 26); g.lineBetween(12, 22, 20, 16); g.lineBetween(52, 20, 44, 28);
        g.fillStyle(0x9a8a6a, 0.6); for (let i = 0; i < 6; i++) g.fillCircle(16 + i * 6, 50 + (i % 2) * 3, 1.5);
    },
    mlijeko(g) {
        g.fillStyle(0xf8f8f8); g.fillRoundedRect(20, 20, 24, 40, 6); g.fillRect(25, 10, 14, 12);
        g.fillStyle(0x2a5ad0); g.fillRect(24, 5, 16, 7); g.fillRect(20, 32, 24, 14);
        g.fillStyle(0xffffff); g.fillCircle(32, 39, 4);
        g.fillStyle(0xd0d0d0); g.fillRect(40, 22, 3, 36);
    },
    disk(g) {
        g.fillStyle(0xb08a10); g.fillCircle(32, 32, 27);
        g.fillStyle(0xf2c430); g.fillCircle(32, 32, 24);
        g.fillStyle(0xd8a820); g.fillCircle(32, 32, 16);
        g.fillStyle(0xfff0a0); g.fillCircle(32, 32, 13);
        g.fillStyle(0x3a2a00); g.fillCircle(32, 32, 5);
        g.fillStyle(0xffffff, 0.8); g.fillEllipse(22, 18, 10, 5);
    },
    sejk(g) {
        g.fillStyle(0xc0d8e8, 0.9); g.fillPoints([{ x: 16, y: 16 }, { x: 48, y: 16 }, { x: 44, y: 60 }, { x: 20, y: 60 }], true);
        g.fillStyle(0x8a5a6a); g.fillPoints([{ x: 18, y: 26 }, { x: 46, y: 26 }, { x: 43, y: 58 }, { x: 21, y: 58 }], true);
        g.fillStyle(0xb07a8a); g.fillEllipse(32, 27, 28, 6);
        g.fillStyle(0x2a2a3a); g.fillRect(14, 10, 36, 8);
        g.fillStyle(0xfff6a0); g.fillTriangle(52, 6, 56, 14, 48, 14); g.fillTriangle(52, 20, 56, 14, 48, 14);
    },
    majica(g) {
        g.fillStyle(0x8a3ac0);
        g.fillPoints([{ x: 20, y: 10 }, { x: 44, y: 10 }, { x: 60, y: 22 }, { x: 52, y: 32 }, { x: 46, y: 28 }, { x: 46, y: 58 },
            { x: 18, y: 58 }, { x: 18, y: 28 }, { x: 12, y: 32 }, { x: 4, y: 22 }], true);
        g.fillStyle(0x6a2a90); g.fillEllipse(32, 11, 14, 6);
        g.fillStyle(0xffffff); g.fillRect(22, 24, 20, 3); g.fillRect(22, 30, 16, 3); g.fillRect(22, 36, 20, 3); g.fillRect(24, 42, 12, 3);
    },
};
