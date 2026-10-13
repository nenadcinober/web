// Procedural art in the manner of late-20th-century Croatian naive painting (the Hlebine school
// of Podravina): flat bright colours, an ink outline round every shape, rosy cheeks, every leaf,
// star and roof shingle painted on its own. Everything is drawn into canvases at boot.
const VW = 1024, VH = 768;

const Art = (() => {
    const INK = '#2a1a14';

    function canvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w); c.height = Math.ceil(h);
        const x = c.getContext('2d');
        x.lineCap = 'round'; x.lineJoin = 'round';
        return [c, x];
    }
    function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
    function shade(hex, k) {
        const n = parseInt(hex.slice(1), 16);
        const f = v => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k)));
        return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
    }
    function path(x, pts) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); }
    function poly(x, pts, fill, lw = 2, stroke = INK) {
        path(x, pts);
        if (fill) { x.fillStyle = fill; x.fill(); }
        if (lw) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
    }
    function oval(x, cx, cy, rx, ry, fill, lw = 2, stroke = INK, rot = 0) {
        x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
        if (fill) { x.fillStyle = fill; x.fill(); }
        if (lw) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
    }
    function rect(x, a, b, w, h, fill, lw = 0, stroke = INK) {
        if (fill) { x.fillStyle = fill; x.fillRect(a, b, w, h); }
        if (lw) { x.lineWidth = lw; x.strokeStyle = stroke; x.strokeRect(a, b, w, h); }
    }
    function line(x, pts, w, c) {
        x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
        x.lineWidth = w; x.strokeStyle = c; x.stroke();
    }
    function rrect(x, a, b, w, h, r, fill, lw = 2) {
        x.beginPath(); x.roundRect(a, b, w, h, r);
        if (fill) { x.fillStyle = fill; x.fill(); }
        if (lw) { x.lineWidth = lw; x.strokeStyle = INK; x.stroke(); }
    }
    function star(x, cx, cy, r, fill, lw = 1.2, points = 5) {
        const pts = [];
        for (let i = 0; i < points * 2; i++) {
            const a = -Math.PI / 2 + i * Math.PI / points, rr = i % 2 ? r * 0.45 : r;
            pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
        }
        poly(x, pts, fill, lw);
    }
    function heartPath(x, cx, cy, s) {
        x.beginPath(); x.moveTo(cx, cy + s * 0.9);
        x.bezierCurveTo(cx - s * 1.35, cy + s * 0.05, cx - s * 0.9, cy - s * 1.05, cx, cy - s * 0.35);
        x.bezierCurveTo(cx + s * 0.9, cy - s * 1.05, cx + s * 1.35, cy + s * 0.05, cx, cy + s * 0.9);
        x.closePath();
    }
    // a union of circles with one ink outline round the whole: ink discs first, colour on top
    function blobs(x, list, fill, lw = 2.5) {
        x.fillStyle = INK;
        for (const b of list) { x.beginPath(); x.arc(b[0], b[1], b[2] + lw, 0, Math.PI * 2); x.fill(); }
        x.fillStyle = fill;
        for (const b of list) { x.beginPath(); x.arc(b[0], b[1], b[2], 0, Math.PI * 2); x.fill(); }
    }
    function flower(x, cx, cy, r, petal, mid = '#f2c230') {
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2;
            oval(x, cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75, r * 0.55, r * 0.55, petal, 1);
        }
        oval(x, cx, cy, r * 0.42, r * 0.42, mid, 1);
    }
    function tulip(x, cx, cy, s, col) {
        line(x, [[cx, cy + s * 1.6], [cx, cy]], 1.6, '#2e6a2a');
        oval(x, cx - s * 0.6, cy + s * 1.0, s * 0.55, s * 0.22, '#3e8a34', 1, INK, -0.6);
        oval(x, cx + s * 0.6, cy + s * 1.0, s * 0.55, s * 0.22, '#3e8a34', 1, INK, 0.6);
        poly(x, [[cx - s * 0.6, cy - s * 0.6], [cx - s * 0.3, cy - s * 0.1], [cx, cy - s * 0.7], [cx + s * 0.3, cy - s * 0.1],
            [cx + s * 0.6, cy - s * 0.6], [cx + s * 0.55, cy + s * 0.3], [cx, cy + s * 0.5], [cx - s * 0.55, cy + s * 0.3]], col, 1.2);
    }

    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
    const len = v => Math.hypot(v[0], v[1]);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

    function seg(x, p0, p1, w0, w1, color) {
        const d = sub(p1, p0), l = len(d) || 1, n = [-d[1] / l, d[0] / l];
        x.fillStyle = color;
        path(x, [add(p0, n, w0 / 2), add(p1, n, w1 / 2), add(p1, n, -w1 / 2), add(p0, n, -w0 / 2)]); x.fill();
        x.beginPath(); x.arc(p0[0], p0[1], w0 / 2, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(p1[0], p1[1], w1 / 2, 0, Math.PI * 2); x.fill();
    }
    function limb(x, pts, ws, color, lw) {
        for (let i = 0; i < pts.length - 1; i++) seg(x, pts[i], pts[i + 1], ws[i] + lw * 2, ws[i + 1] + lw * 2, INK);
        for (let i = 0; i < pts.length - 1; i++) seg(x, pts[i], pts[i + 1], ws[i], ws[i + 1], color);
    }
    function joint(a, b, L, pref) {
        const d = len(sub(b, a)), m = lerp(a, b, 0.5);
        if (d >= L || d < 0.01) return m;
        const bend = Math.sqrt((L / 2) ** 2 - (d / 2) ** 2);
        const v = sub(b, a), n = [-v[1] / d, v[0] / d];
        const s = (n[0] * pref[0] + n[1] * pref[1]) >= 0 ? 1 : -1;
        return add(m, n, bend * s);
    }

    // ---- Dudek ------------------------------------------------------------------------------
    const S = { fw: 64, fh: 96, cx: 32, headY: 19, headR: 10.5, shY: 33, hipY: 61, footY: 95, torsoW: 22, legW: 10, armW: 7, armLen: 25, stride: 1, bootL: 14, bootH: 8, k: 1 };
    // feet: [x offset, lift as a fraction of leg length]; hands: offset from the shoulder as a
    // fraction of arm length. Everything faces right.
    const POSES = {
        stand: { f: [[-6, 0], [6, 0]], h: [[-0.25, 0.95], [0.3, 0.95]] },
        squat: { f: [[-10, 0], [10, 0]], h: [[-0.7, 0.55], [0.7, 0.55]], bob: 7 },
        jump:  { f: [[-6, 0.14], [8, 0.32]], h: [[-0.35, -0.95], [0.4, -0.92]] },
        fall:  { f: [[-11, 0.04], [11, 0.2]], h: [[-0.92, -0.3], [0.92, -0.38]] },
        throw: { f: [[-6, 0.1], [7, 0.24]], h: [[-0.7, 0.5], [0.12, -1]] },
        hang:  { f: [[-3, 0.04], [5, 0.12]], h: [[0.06, -1], [0.2, -1]] },
        wave:  { f: [[-6, 0], [6, 0]], h: [[-0.25, 0.95], [0.55, -0.85]] },
        dead:  { f: [[-9, 0], [9, 0]], h: [[-0.85, -0.55], [0.85, -0.55]], front: true },
    };
    const DUDEK = { skin: '#f2b98e', hair: '#4a3626', mustache: '#3a281c', hat: '#1d1a18', band: '#c8241c', shirt: '#f7f2e3',
        vest: '#25222c', sash: '#c8241c', pants: '#f3eedf', boots: '#1a1416', buttons: '#f0c030', eye: INK };
    const CRNI = { skin: '#d8a888', hair: '#0e0a0a', mustache: '#0e0a0a', hat: '#0a0808', band: '#7a0c0c', shirt: '#3a3440',
        vest: '#111014', sash: '#7a0c0c', pants: '#2c2832', boots: '#0a0808', buttons: '#9a1010', eye: '#ff2a1a', angry: true };

    function drawPerson(x, def, poseName) {
        const P = POSES[poseName], k = S.k, lw = 1.8 * k + 0.3;
        const bob = (P.bob || 0) * k, lean = (P.lean || 0) * k;
        const cx = S.cx, hipY = S.hipY + bob, shY = S.shY + bob;
        const legL = (S.footY - S.hipY) * 1.04, armL = S.armLen, tw = S.torsoW;
        const front = !!P.front;
        const hips = front ? [[cx - tw * 0.24, hipY], [cx + tw * 0.24, hipY]] : [[cx - 3 * k, hipY], [cx + 3 * k, hipY]];
        const sh = front ? [[cx - tw * 0.5, shY + 3 * k], [cx + tw * 0.5, shY + 3 * k]]
                         : [[cx - tw * 0.15 + lean, shY + 3 * k], [cx + tw * 0.1 + lean, shY + 3 * k]];
        const feet = P.f.map(f => [cx + f[0] * S.stride, S.footY - f[1] * legL]);
        const hands = P.h.map((h, i) => [sh[i][0] + h[0] * armL, sh[i][1] + h[1] * armL]);

        const leg = (i, dark) => {
            const hip = hips[i], foot = feet[i];
            const ankle = [foot[0], foot[1] - S.bootH * 0.7];
            const kn = joint(hip, ankle, legL - S.bootH * 0.7, front ? [i ? 1 : -1, 0] : [1, 0]);
            limb(x, [hip, kn, ankle], [S.legW, S.legW * 1.2, S.legW * 1.6], dark ? shade(def.pants, 0.86) : def.pants, lw);
            const dir = front ? (i ? 1 : -1) : 1;
            oval(x, foot[0] + dir * S.bootL * 0.18, foot[1] - S.bootH * 0.5, S.bootL * 0.55, S.bootH * 0.55, def.boots, lw);
            oval(x, foot[0] + dir * S.bootL * 0.05, foot[1] - S.bootH * 0.7, S.bootL * 0.3, S.bootH * 0.18, 'rgba(255,255,255,0.18)', 0);
        };
        const arm = (i, dark) => {
            const s0 = sh[i], hd = hands[i];
            const el = joint(s0, hd, armL, [-0.5, 1]);
            limb(x, [s0, el, hd], [S.armW * 1.35, S.armW * 1.2, S.armW], dark ? shade(def.shirt, 0.86) : def.shirt, lw);
            oval(x, hd[0], hd[1], S.armW * 0.6, S.armW * 0.6, def.skin, lw);
        };

        if (!front) arm(0, true);
        leg(0, !front);
        leg(1, false);

        // torso: linen shirt, black vest, red sash
        const t0 = shY, t1 = hipY + 2 * k;
        const tl = cx - tw / 2 + lean, tr = cx + tw / 2 + lean;
        poly(x, [[tl + 2 * k, t0], [tr - 2 * k, t0], [tr, t0 + 4 * k], [cx + tw / 2 * 0.95, t1], [cx - tw / 2 * 0.9, t1], [tl, t0 + 4 * k]], def.shirt, lw);
        if (front) {
            poly(x, [[tl + 1, t0 + 2 * k], [cx - tw * 0.12, t0 + 2 * k], [cx - tw * 0.08, t1 - 2], [cx - tw / 2 * 0.88, t1 - 2]], def.vest, lw * 0.8);
            poly(x, [[tr - 1, t0 + 2 * k], [cx + tw * 0.12, t0 + 2 * k], [cx + tw * 0.08, t1 - 2], [cx + tw / 2 * 0.92, t1 - 2]], def.vest, lw * 0.8);
        } else {
            poly(x, [[tl + 1, t0 + 2 * k], [cx + tw * 0.2 + lean, t0 + 2 * k], [cx + tw * 0.14, t1 - 2], [cx - tw / 2 * 0.88, t1 - 2]], def.vest, lw * 0.8);
            for (let i = 0; i < 3; i++) oval(x, cx + tw * 0.17 + lean * (1 - i / 3), t0 + (5 + i * 7) * k, 1.4 * k, 1.4 * k, def.buttons, 0.6);
            oval(x, cx - tw * 0.18 + lean, t0 + 9 * k, 2 * k, 2 * k, def.sash, 0.5);
        }
        poly(x, [[cx - tw / 2 * 0.92, hipY - 4 * k], [cx + tw / 2 * 0.96, hipY - 4 * k], [cx + tw / 2 * 0.96, hipY + 1.5 * k], [cx - tw / 2 * 0.92, hipY + 1.5 * k]], def.sash, lw * 0.8);
        if (!front) line(x, [[cx - tw / 2 * 0.8, hipY], [cx - tw / 2 * 1.05, hipY + 9 * k]], 2.2 * k, def.sash);

        // head
        const r = S.headR, hx = cx + lean + (front ? 0 : 1 * k), hy = S.headY + bob;
        rect(x, hx - 3 * k, hy + r * 0.6, 6 * k, 5 * k, def.skin);
        oval(x, hx - (front ? 0 : r * 0.15), hy - r * 0.15, r * 0.95, r * 0.85, def.hair, lw);
        oval(x, hx, hy, r, r, def.skin, lw);
        const eye = (ex, ey) => {
            oval(x, ex, ey, r * 0.15, r * 0.19, def.eye, 0);
            if (!def.angry) oval(x, ex + r * 0.05, ey - r * 0.07, r * 0.05, r * 0.05, '#fff', 0);
        };
        if (front) {
            oval(x, hx - r * 0.98, hy + r * 0.05, r * 0.2, r * 0.28, def.skin, lw * 0.7);
            oval(x, hx + r * 0.98, hy + r * 0.05, r * 0.2, r * 0.28, def.skin, lw * 0.7);
            oval(x, hx - r * 0.45, hy + r * 0.32, r * 0.26, r * 0.2, 'rgba(225,70,70,0.55)', 0);
            oval(x, hx + r * 0.45, hy + r * 0.32, r * 0.26, r * 0.2, 'rgba(225,70,70,0.55)', 0);
            for (const s of [-1, 1]) {
                line(x, [[hx + s * r * 0.48, hy - r * 0.32], [hx + s * r * 0.22, hy - r * 0.08]], lw, INK);
                line(x, [[hx + s * r * 0.22, hy - r * 0.32], [hx + s * r * 0.48, hy - r * 0.08]], lw, INK);
            }
            oval(x, hx, hy + r * 0.12, r * 0.24, r * 0.2, shade(def.skin, 0.92), lw * 0.7);
            oval(x, hx - r * 0.3, hy + r * 0.42, r * 0.38, r * 0.15, def.mustache, lw * 0.5, INK, 0.25);
            oval(x, hx + r * 0.3, hy + r * 0.42, r * 0.38, r * 0.15, def.mustache, lw * 0.5, INK, -0.25);
            oval(x, hx, hy + r * 0.72, r * 0.18, r * 0.12, '#7a1a14', 0);
        } else {
            oval(x, hx - r * 0.3, hy + r * 0.05, r * 0.2, r * 0.27, def.skin, lw * 0.7);
            oval(x, hx + r * 0.12, hy + r * 0.38, r * 0.28, r * 0.2, 'rgba(225,70,70,0.55)', 0);
            eye(hx + r * 0.42, hy - r * 0.18);
            if (def.angry) line(x, [[hx + r * 0.15, hy - r * 0.52], [hx + r * 0.7, hy - r * 0.3]], lw * 1.3, INK);
            else line(x, [[hx + r * 0.25, hy - r * 0.48], [hx + r * 0.62, hy - r * 0.5]], lw * 0.8, def.hair);
            oval(x, hx + r * 0.9, hy + r * 0.08, r * 0.26, r * 0.24, shade(def.skin, 0.94), lw * 0.7);
            // the big Podravina moustache
            x.beginPath();
            x.moveTo(hx + r * 0.95, hy + r * 0.32);
            x.quadraticCurveTo(hx + r * 0.4, hy + r * 0.25, hx + r * 0.05, hy + r * 0.6);
            x.quadraticCurveTo(hx + r * 0.5, hy + r * 0.62, hx + r * 1.0, hy + r * 0.5);
            x.closePath(); x.fillStyle = def.mustache; x.fill(); x.lineWidth = lw * 0.6; x.strokeStyle = INK; x.stroke();
        }
        // hat: flat black crown, red band, wide brim, a little flower tucked in
        const by = hy - r * 0.6;
        oval(x, hx, by, r * 1.4, r * 0.3, def.hat, lw);
        poly(x, [[hx - r * 0.82, by], [hx - r * 0.72, by - r * 0.95], [hx + r * 0.72, by - r * 0.95], [hx + r * 0.82, by]], def.hat, lw);
        rect(x, hx - r * 0.79, by - r * 0.32, r * 1.58, r * 0.26, def.band);
        if (!front) {
            oval(x, hx - r * 0.6, by - r * 0.55, r * 0.22, r * 0.22, '#f04848', lw * 0.4);
            oval(x, hx - r * 0.6, by - r * 0.55, r * 0.08, r * 0.08, '#f0d040', 0);
        }

        if (!front) arm(1, false);
        else { arm(0, false); arm(1, false); }
    }

    // ---- platforms --------------------------------------------------------------------------
    // Every platform texture is 120 wide with its standing surface at y = PLAT_TOP.
    const PLAT_W = 120, PLAT_TOP = 8;

    function plank(x) {
        // a whitewashed-fence board, painted with tulips the way a cart or a chest would be
        rrect(x, 6, PLAT_TOP, 108, 22, 7, '#b5773c', 2.4);
        line(x, [[14, PLAT_TOP + 7], [104, PLAT_TOP + 6]], 1, '#8a5428');
        line(x, [[16, PLAT_TOP + 16], [100, PLAT_TOP + 17]], 1, '#8a5428');
        rrect(x, 8, PLAT_TOP + 1, 104, 5, 3, 'rgba(255,230,180,0.35)', 0);
        oval(x, 15, PLAT_TOP + 11, 2.2, 2.2, '#5a4a40', 1); oval(x, 105, PLAT_TOP + 11, 2.2, 2.2, '#5a4a40', 1);
        flower(x, 38, PLAT_TOP + 11, 5, '#d42a24');
        flower(x, 60, PLAT_TOP + 11, 6, '#f6f0e0', '#d42a24');
        flower(x, 82, PLAT_TOP + 11, 5, '#2a5ab0');
        // grass and clover growing over the top edge
        for (let i = 0; i < 14; i++) {
            const gx = 10 + i * 7.6;
            line(x, [[gx, PLAT_TOP + 2], [gx + (i % 2 ? 2 : -2), PLAT_TOP - 5 - (i % 3) * 1.5]], 2, i % 2 ? '#3e8a34' : '#5aa83c');
        }
    }
    function painted(x) {
        // the blue of a painted dowry chest (škrinja), white dots and a red tulip
        rrect(x, 6, PLAT_TOP, 108, 22, 7, '#2f5fae', 2.4);
        rrect(x, 11, PLAT_TOP + 4, 98, 14, 5, null, 0);
        x.lineWidth = 1.4; x.strokeStyle = '#f2e6c0'; x.stroke();
        for (let i = 0; i < 12; i++) oval(x, 16 + i * 8, PLAT_TOP + 11, 1.4, 1.4, '#f6f0e0', 0);
        oval(x, 60, PLAT_TOP + 11, 11, 7.5, '#2f5fae', 0);
        tulip(x, 60, PLAT_TOP + 9, 5, '#d42a24');
        rrect(x, 8, PLAT_TOP + 1, 104, 4, 3, 'rgba(255,255,255,0.25)', 0);
    }
    function sheaf(x, part) {
        // a sheaf of straw bound with red ribbon; drawn whole or as one broken half
        x.save();
        if (part === 'l') { x.beginPath(); x.rect(0, 0, 60, 40); x.clip(); }
        if (part === 'r') { x.beginPath(); x.rect(60, 0, 60, 40); x.clip(); }
        rrect(x, 6, PLAT_TOP, 108, 20, 10, '#e6c25a', 2.2);
        for (let i = 0; i < 16; i++) line(x, [[10 + i * 6.4, PLAT_TOP + 3], [12 + i * 6.4, PLAT_TOP + 17]], 1, '#a87a24');
        for (let i = 0; i < 9; i++) line(x, [[6 + i * 12, PLAT_TOP + 2], [3 + i * 13, PLAT_TOP - 4]], 1.4, '#c89a34');
        rect(x, 32, PLAT_TOP, 6, 20, '#c8241c', 1.2); rect(x, 82, PLAT_TOP, 6, 20, '#c8241c', 1.2);
        if (part) line(x, [[60, PLAT_TOP - 2], [56, PLAT_TOP + 6], [63, PLAT_TOP + 11], [57, PLAT_TOP + 22]], 2, INK);
        x.restore();
    }
    function cloudPlat(x) {
        blobs(x, [[28, PLAT_TOP + 14, 12], [50, PLAT_TOP + 9, 13], [72, PLAT_TOP + 10, 14], [94, PLAT_TOP + 14, 11], [60, PLAT_TOP + 18, 12], [38, PLAT_TOP + 19, 9], [84, PLAT_TOP + 19, 9]], '#fbf8f0', 2.2);
        oval(x, 50, PLAT_TOP + 20, 20, 4, '#e2e2ee', 0);
        oval(x, 82, PLAT_TOP + 21, 14, 3.5, '#e2e2ee', 0);
        oval(x, 34, PLAT_TOP + 14, 4, 2.5, 'rgba(240,120,140,0.5)', 0);
        oval(x, 88, PLAT_TOP + 14, 4, 2.5, 'rgba(240,120,140,0.5)', 0);
    }
    function spring(x, down) {
        const top = down ? 22 : 6;
        rect(x, 4, 32, 26, 5, '#5a5a62', 1.6);
        const pts = [];
        const n = 6;
        for (let i = 0; i <= n; i++) pts.push([i % 2 ? 26 : 8, 32 - (32 - top - 4) * i / n]);
        line(x, pts, 5, INK); line(x, pts, 3, '#d42a24');
        rrect(x, 2, top - 2, 30, 7, 3, '#f2c230', 1.6);
        oval(x, 17, top + 1.5, 2, 2, '#d42a24', 0);
    }

    // ---- creatures --------------------------------------------------------------------------
    function stork(x, f) {
        // white stork, wings beating; legs dangle down so Dudek can hang on to them
        const up = f === 'fly1';
        const wing = up ? [[56, 38], [30, 4], [8, 2], [24, 22], [70, 44]] : [[56, 40], [34, 70], [12, 80], [26, 56], [72, 46]];
        limb(x, [[68, 50], [64, 72], [66, 90]], [3, 3, 3], '#e23a20', 1.2);
        limb(x, [[74, 50], [72, 72], [70, 88]], [3, 3, 3], '#e23a20', 1.2);
        if (!up) { poly(x, wing, '#f8f6ee', 2); poly(x, [[34, 70], [12, 80], [26, 56], [36, 58]], '#1c1a1e', 1.6); }
        poly(x, [[28, 40], [4, 34], [10, 44], [2, 50], [30, 48]], '#1c1a1e', 1.8);
        oval(x, 60, 42, 30, 13, '#f8f6ee', 2.2);
        poly(x, [[34, 46], [70, 50], [50, 54]], '#1c1a1e', 1.4);
        limb(x, [[84, 36], [98, 24], [108, 20]], [10, 7, 7], '#f8f6ee', 2);
        oval(x, 110, 19, 8, 7, '#f8f6ee', 2);
        poly(x, [[115, 15], [139, 22], [116, 23]], '#e23a20', 1.6);
        oval(x, 112, 17, 1.8, 2, INK, 0);
        oval(x, 108, 22, 2.6, 1.8, 'rgba(230,80,80,0.5)', 0);
        if (up) { poly(x, wing, '#f8f6ee', 2); poly(x, [[30, 4], [8, 2], [24, 22], [32, 18]], '#1c1a1e', 1.6); }
        for (let i = 0; i < 4; i++) line(x, [[40 + i * 6, 36], [44 + i * 6, 44]], 1, '#c8c4b8');
    }
    function crow(x, f) {
        const body = '#1e1e2c', up = f === 'fly1';
        poly(x, [[18, 32], [2, 26], [6, 34], [0, 40], [18, 38]], body, 1.8);
        if (!up) poly(x, [[28, 34], [20, 54], [38, 50], [46, 36]], '#2c2c40', 1.8);
        oval(x, 32, 34, 17, 11, body, 2.2);
        oval(x, 52, 25, 10, 9.5, body, 2.2);
        poly(x, [[60, 22], [72, 27], [60, 30]], '#e8b830', 1.6);
        oval(x, 54, 22, 3.5, 3.5, '#fff', 1);
        oval(x, 55, 22, 1.6, 1.8, INK, 0);
        line(x, [[49, 16], [58, 19]], 2.2, INK);
        if (up) poly(x, [[26, 30], [16, 4], [36, 10], [46, 28]], '#2c2c40', 1.8);
        line(x, [[30, 44], [28, 50]], 2, '#e8b830'); line(x, [[36, 44], [36, 50]], 2, '#e8b830');
    }
    function darkCloud(x) {
        blobs(x, [[24, 22, 14], [46, 16, 16], [70, 18, 15], [88, 24, 11], [56, 28, 12]], '#4a4458', 2.4);
        for (const [cx, cy] of [[30, 22], [52, 18], [74, 20]]) oval(x, cx, cy, 5, 2.5, '#6a6478', 0);
        // a little painted lightning bolt
        poly(x, [[50, 34], [44, 46], [50, 45], [46, 56], [58, 41], [52, 42], [56, 34]], '#f2c230', 1.4);
    }

    // ---- items ------------------------------------------------------------------------------
    function licitar(x) {
        heartPath(x, 20, 21, 17); x.fillStyle = '#d61e2a'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        heartPath(x, 20, 21, 13); x.lineWidth = 1.6; x.setLineDash([2, 3]); x.strokeStyle = '#fff6e0'; x.stroke(); x.setLineDash([]);
        oval(x, 20, 18, 5.5, 5.5, '#bfe0f0', 1.4);
        oval(x, 18.5, 16.5, 1.8, 1.8, '#fff', 0);
        for (const [a, b] of [[10, 12], [30, 12], [20, 30]]) oval(x, a, b, 1.6, 1.6, '#3a9a40', 0);
    }
    function apple(x) {
        oval(x, 10, 13, 8, 7.5, '#d42a24', 1.8);
        oval(x, 7.5, 10.5, 2.4, 1.8, 'rgba(255,255,255,0.5)', 0);
        line(x, [[10, 6], [11, 2]], 1.8, '#5a3a20');
        oval(x, 14.5, 3.5, 3.5, 1.8, '#3e8a34', 1, INK, -0.4);
    }

    // ---- scenery ----------------------------------------------------------------------------
    function poplar(x, bx, by, h, R) {
        line(x, [[bx, by], [bx, by - h * 0.3]], 5, '#5a3a24');
        oval(x, bx, by - h * 0.58, h * 0.12, h * 0.42, '#2e5a2a', 2.2);
        for (let i = 0; i < 46; i++) {
            const t = R() * 2 - 1, a = R() * 2 - 1;
            const ly = by - h * 0.58 + t * h * 0.38, lx = bx + a * h * 0.1 * Math.sqrt(1 - t * t);
            oval(x, lx, ly, 2.6, 4, R() < 0.5 ? '#4a8a38' : '#6aa844', 0.6, INK, a);
        }
    }
    function fruitTree(x, bx, by, s, R) {
        limb(x, [[bx, by], [bx - 2, by - s * 0.5], [bx - s * 0.3, by - s * 0.95]], [s * 0.14, s * 0.1, s * 0.05], '#6a4428', 1.6);
        limb(x, [[bx - 1, by - s * 0.5], [bx + s * 0.32, by - s * 0.92]], [s * 0.08, s * 0.05], '#6a4428', 1.6);
        oval(x, bx, by - s * 1.05, s * 0.62, s * 0.48, '#3a7a30', 2.2);
        for (let i = 0; i < 60; i++) {
            const a = R() * Math.PI * 2, d = Math.sqrt(R());
            oval(x, bx + Math.cos(a) * d * s * 0.54, by - s * 1.05 + Math.sin(a) * d * s * 0.4, 3, 2, R() < 0.5 ? '#5a9a3e' : '#78b84a', 0.5, INK, a);
        }
        for (let i = 0; i < 12; i++) {
            const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.85;
            oval(x, bx + Math.cos(a) * d * s * 0.52, by - s * 1.05 + Math.sin(a) * d * s * 0.38, 3.2, 3.2, '#d8261e', 1);
        }
    }
    function house(x, bx, G, s, R) {
        // a long Podravina house: gable to the street, whitewashed walls, tiled roof, chimney
        const wh = 70 * s, fw = 92 * s, sw = 140 * s;
        rect(x, bx + fw, G - wh, sw, wh, '#ece4cc', 2.2);
        rect(x, bx + fw, G - 12 * s, sw, 12 * s, '#c8a878', 1.6);
        rect(x, bx + fw + 22 * s, G - 50 * s, 22 * s, 50 * s, '#7a4a28', 2);
        line(x, [[bx + fw + 33 * s, G - 50 * s], [bx + fw + 33 * s, G]], 1, INK);
        win(x, bx + fw + 70 * s, G - 52 * s, s); win(x, bx + fw + 105 * s, G - 52 * s, s);
        rect(x, bx, G - wh, fw, wh, '#f6f0de', 2.2);
        rect(x, bx, G - 12 * s, fw, 12 * s, '#c8a878', 1.6);
        win(x, bx + 14 * s, G - 52 * s, s); win(x, bx + 54 * s, G - 52 * s, s);
        // roof
        const ax = bx + fw / 2, ay = G - wh - 66 * s;
        rect(x, bx + fw + sw * 0.62, ay + 4 * s, 12 * s, 30 * s, '#c8b8a0', 1.8);
        poly(x, [[ax, ay], [bx + fw + sw - 18 * s, ay], [bx + fw + sw + 8 * s, G - wh + 4 * s], [bx + fw - 4 * s, G - wh + 4 * s]], '#a8442a', 2.2);
        for (let r = 1; r < 6; r++) {
            const t = r / 6, y = ay + (G - wh + 4 * s - ay) * t;
            line(x, [[ax + (bx + fw - 4 * s - ax) * t + 2, y], [bx + fw + sw - 18 * s + 26 * s * t, y]], 1, '#6a2416');
            for (let c = 0; c < 14; c++) {
                const cx = ax + (bx + fw - 4 * s - ax) * t + 8 * s + c * 12 * s;
                if (cx < bx + fw + sw - 22 * s + 26 * s * t) oval(x, cx, y - 4 * s, 5 * s, 3 * s, 'rgba(255,190,150,0.25)', 0);
            }
        }
        // the wooden gable with its sunburst boards
        poly(x, [[bx - 6 * s, G - wh + 4 * s], [ax, ay], [bx + fw + 6 * s, G - wh + 4 * s]], '#8a5a30', 2.2);
        for (let i = 0; i < 7; i++) line(x, [[ax, ay + 18 * s], [bx + 6 * s + i * (fw - 12 * s) / 6, G - wh]], 1.2, '#5a3418');
        oval(x, ax, ay + 32 * s, 6 * s, 6 * s, '#f2c230', 1.4);
        // chimney with a stork's nest
        const chx = bx + fw + sw * 0.62;
        oval(x, chx + 6 * s, ay + 2 * s, 18 * s, 6 * s, '#7a5a34', 1.8);
        for (let i = 0; i < 10; i++) line(x, [[chx - 10 * s + i * 3.6 * s, ay + 4 * s], [chx - 6 * s + i * 3.6 * s, ay - 2 * s]], 1, '#4a3418');
        // smoke curls
        x.beginPath(); x.moveTo(chx + 20 * s, ay - 4 * s);
        x.bezierCurveTo(chx + 34 * s, ay - 24 * s, chx + 10 * s, ay - 36 * s, chx + 28 * s, ay - 56 * s);
        x.lineWidth = 5; x.strokeStyle = 'rgba(240,240,240,0.7)'; x.stroke();
        // a nesting stork standing on one leg
        line(x, [[chx + 4 * s, ay], [chx + 4 * s, ay - 12 * s]], 1.6, '#e23a20');
        oval(x, chx + 2 * s, ay - 17 * s, 10 * s, 6 * s, '#f8f6ee', 1.6);
        poly(x, [[chx - 8 * s, ay - 18 * s], [chx - 2 * s, ay - 14 * s], [chx - 6 * s, ay - 12 * s]], '#1c1a1e', 1);
        line(x, [[chx + 9 * s, ay - 20 * s], [chx + 11 * s, ay - 30 * s]], 3 * s, INK); line(x, [[chx + 9 * s, ay - 20 * s], [chx + 11 * s, ay - 30 * s]], 2 * s, '#f8f6ee');
        oval(x, chx + 12 * s, ay - 32 * s, 3.5 * s, 3.2 * s, '#f8f6ee', 1.2);
        poly(x, [[chx + 14 * s, ay - 33 * s], [chx + 23 * s, ay - 30 * s], [chx + 14 * s, ay - 30 * s]], '#e23a20', 1);
        // geraniums on the windowsills
        for (const wx of [bx + 14 * s, bx + 54 * s]) for (let i = 0; i < 3; i++) oval(x, wx + 4 * s + i * 7 * s, G - 30 * s, 3 * s, 3 * s, '#e0262a', 0.8);
        void R;
    }
    function win(x, wx, wy, s) {
        rect(x, wx, wy, 24 * s, 22 * s, '#2a4a8a', 2);
        rect(x, wx + 3 * s, wy + 3 * s, 18 * s, 16 * s, '#f2d880', 0);
        line(x, [[wx + 12 * s, wy], [wx + 12 * s, wy + 22 * s]], 2, '#2a4a8a');
        line(x, [[wx, wy + 11 * s], [wx + 24 * s, wy + 11 * s]], 2, '#2a4a8a');
        rect(x, wx - 2 * s, wy + 22 * s, 28 * s, 3 * s, '#f6f0de', 1.2);
    }
    function church(x, bx, G) {
        // nave
        rect(x, bx + 50, G - 110, 170, 110, '#f2e4b8', 2.2);
        poly(x, [[bx + 46, G - 108], [bx + 76, G - 166], [bx + 224, G - 166], [bx + 226, G - 108]], '#b04a2e', 2.2);
        for (let i = 1; i < 5; i++) line(x, [[bx + 50 + i * 6, G - 108 - i * 11.6], [bx + 225, G - 108 - i * 11.6]], 1, '#6a2416');
        for (let i = 0; i < 3; i++) {
            const wx = bx + 100 + i * 42;
            x.beginPath(); x.moveTo(wx, G - 30); x.lineTo(wx, G - 78); x.arc(wx + 9, G - 78, 9, Math.PI, 0); x.lineTo(wx + 18, G - 30); x.closePath();
            x.fillStyle = '#4a6ab0'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        }
        // baroque tower with an onion dome
        const tx = bx, tw = 64;
        rect(x, tx, G - 250, tw, 250, '#f6ead0', 2.4);
        rect(x, tx, G - 254, tw, 10, '#d8c49a', 2);
        rect(x, tx, G - 160, tw, 6, '#d8c49a', 1.6);
        x.beginPath(); x.moveTo(tx + 20, G); x.lineTo(tx + 20, G - 40); x.arc(tx + 32, G - 40, 12, Math.PI, 0); x.lineTo(tx + 44, G); x.closePath();
        x.fillStyle = '#7a4a28'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        oval(x, tx + 32, G - 200, 15, 15, '#f8f4ea', 2);
        line(x, [[tx + 32, G - 200], [tx + 32, G - 210]], 2, INK); line(x, [[tx + 32, G - 200], [tx + 39, G - 197]], 2, INK);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; oval(x, tx + 32 + Math.cos(a) * 11, G - 200 + Math.sin(a) * 11, 0.8, 0.8, INK, 0); }
        x.beginPath(); x.moveTo(tx + 22, G - 222); x.lineTo(tx + 22, G - 236); x.arc(tx + 32, G - 236, 10, Math.PI, 0); x.lineTo(tx + 42, G - 222); x.closePath();
        x.fillStyle = '#2a2a3a'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        const dy = G - 254;
        x.beginPath(); x.moveTo(tx - 2, dy);
        x.bezierCurveTo(tx - 10, dy - 30, tx + 22, dy - 34, tx + 28, dy - 60);
        x.lineTo(tx + 36, dy - 60);
        x.bezierCurveTo(tx + 42, dy - 34, tx + 74, dy - 30, tx + 66, dy);
        x.closePath(); x.fillStyle = '#3a7a5a'; x.fill(); x.lineWidth = 2.4; x.strokeStyle = INK; x.stroke();
        oval(x, tx + 32, dy - 64, 8, 5, '#3a7a5a', 2);
        line(x, [[tx + 32, dy - 68], [tx + 32, dy - 100]], 3, INK);
        oval(x, tx + 32, dy - 80, 6, 6, '#f2c230', 1.6);
        line(x, [[tx + 32, dy - 100], [tx + 32, dy - 116]], 2.4, '#f2c230');
        line(x, [[tx + 25, dy - 110], [tx + 39, dy - 110]], 2.4, '#f2c230');
        for (let i = 0; i < 5; i++) line(x, [[tx + 6 + i * 13, dy - 4], [tx + 20 + i * 6, dy - 40]], 1, '#24503a');
    }
    function well(x, bx, G) {
        // đeram: the long-armed sweep well
        rect(x, bx - 22, G - 34, 44, 34, '#a8a094', 2);
        for (let i = 0; i < 3; i++) line(x, [[bx - 22, G - 34 + i * 11 + 6], [bx + 22, G - 34 + i * 11 + 6]], 1, '#6a6058');
        line(x, [[bx + 44, G], [bx + 40, G - 110]], 7, INK); line(x, [[bx + 44, G], [bx + 40, G - 110]], 4, '#7a5030');
        line(x, [[bx + 90, G - 60], [bx - 14, G - 150]], 5, INK); line(x, [[bx + 90, G - 60], [bx - 14, G - 150]], 3, '#9a6a3a');
        line(x, [[bx - 12, G - 150], [bx - 4, G - 50]], 1.4, INK);
        rect(x, bx - 12, G - 54, 14, 12, '#6a4428', 1.6);
        oval(x, bx + 84, G - 62, 9, 7, '#7a7066', 1.8);
    }
    function wattle(x, bx, G, w) {
        for (let i = 0; i <= w / 14; i++) line(x, [[bx + i * 14, G], [bx + i * 14, G - 40]], 3.2, '#5a3a20');
        for (let r = 0; r < 4; r++) {
            x.beginPath();
            for (let i = 0; i <= w / 7; i++) x.lineTo(bx + i * 7, G - 8 - r * 8 + ((i + r) % 2 ? 2 : -2));
            x.lineWidth = 3.4; x.strokeStyle = INK; x.stroke(); x.lineWidth = 2; x.strokeStyle = '#a8784a'; x.stroke();
        }
    }
    function sunflower(x, bx, G, h, R) {
        line(x, [[bx, G], [bx + 2, G - h]], 3, '#2e6a2a');
        oval(x, bx - 7, G - h * 0.5, 8, 3.5, '#3e8a34', 1, INK, -0.5);
        oval(x, bx + 9, G - h * 0.7, 8, 3.5, '#3e8a34', 1, INK, 0.5);
        const r = 7 + R() * 3;
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            oval(x, bx + 2 + Math.cos(a) * r, G - h + Math.sin(a) * r, r * 0.55, r * 0.25, '#f6c224', 0.8, INK, a);
        }
        oval(x, bx + 2, G - h, r * 0.6, r * 0.6, '#6a3a1c', 1.2);
    }
    function haystack(x, bx, G, s) {
        x.beginPath(); x.moveTo(bx - 40 * s, G); x.quadraticCurveTo(bx - 44 * s, G - 60 * s, bx, G - 92 * s);
        x.quadraticCurveTo(bx + 44 * s, G - 60 * s, bx + 40 * s, G); x.closePath();
        x.fillStyle = '#e2b64c'; x.fill(); x.lineWidth = 2.2; x.strokeStyle = INK; x.stroke();
        for (let i = 0; i < 18; i++) {
            const px = bx - 34 * s + i * 4 * s;
            line(x, [[px, G - 2], [bx + (px - bx) * 0.3, G - 70 * s + Math.abs(px - bx) * 0.6]], 1, '#a87a24');
        }
        line(x, [[bx, G - 92 * s], [bx, G - 108 * s]], 3, '#6a4a24');
    }
    function rooster(x, bx, by) {
        // a proud red rooster on the fence, tail in every colour on the palette
        const tail = ['#2a5ab0', '#3a9a40', '#1c1a1e', '#d42a24', '#f2c230'];
        tail.forEach((c, i) => oval(x, bx - 16, by - 14 + i * 3, 14, 4, c, 1.4, INK, -1.1 + i * 0.35));
        oval(x, bx, by - 6, 14, 11, '#c8401c', 2);
        oval(x, bx - 2, by - 6, 8, 5, '#f2a030', 1.2);
        limb(x, [[bx + 8, by - 12], [bx + 13, by - 24]], [9, 8], '#e8902a', 1.8);
        oval(x, bx + 14, by - 27, 6, 6, '#e8902a', 1.8);
        poly(x, [[bx + 10, by - 32], [bx + 12, by - 38], [bx + 15, by - 33], [bx + 18, by - 38], [bx + 19, by - 31]], '#e0201a', 1.2);
        poly(x, [[bx + 19, by - 28], [bx + 26, by - 26], [bx + 19, by - 24]], '#f2c230', 1.2);
        oval(x, bx + 18, by - 21, 2.4, 3.4, '#e0201a', 1);
        oval(x, bx + 16, by - 28, 1.2, 1.3, INK, 0);
        line(x, [[bx - 2, by + 4], [bx - 2, by + 12]], 2, '#e8b830'); line(x, [[bx + 4, by + 4], [bx + 4, by + 12]], 2, '#e8b830');
    }
    function goose(x, bx, G, R) {
        oval(x, bx, G - 10, 13, 8, '#f8f6ee', 1.8);
        limb(x, [[bx + 8, G - 14], [bx + 12, G - 26]], [6, 5], '#f8f6ee', 1.6);
        oval(x, bx + 13, G - 28, 5, 4.5, '#f8f6ee', 1.6);
        poly(x, [[bx + 17, G - 29], [bx + 23, G - 27], [bx + 17, G - 26]], '#ec8a1c', 1);
        oval(x, bx + 14, G - 29, 1, 1, INK, 0);
        line(x, [[bx - 2, G - 3], [bx - 2, G]], 2, '#ec8a1c'); line(x, [[bx + 3, G - 3], [bx + 3, G]], 2, '#ec8a1c');
        void R;
    }

    function village(x) {
        // the whole village street the jump starts from; ground line at G, transparent sky above
        const R = rng(21), G = 470;
        for (const [px, h] of [[30, 220], [262, 180], [392, 250], [655, 210], [800, 240], [1000, 200]]) poplar(x, px, G - 6, h, R);
        fruitTree(x, 960, G, 82, R);
        house(x, 12, G, 1, R);
        church(x, 420, G);
        well(x, 650, G);
        house(x, 760, G, 0.78, R);
        wattle(x, 252, G, 154);
        rooster(x, 330, G - 42);
        for (let i = 0; i < 6; i++) sunflower(x, 264 + i * 26, G, 58 + R() * 26, R);
        haystack(x, 970, G + 2, 0.8);
        // the field: a band of green with painted furrows and meadow flowers
        x.beginPath(); x.moveTo(0, G);
        for (let i = 0; i <= 32; i++) x.lineTo(i * 32, G - 3 + Math.sin(i * 1.7) * 3);
        x.lineTo(1024, 560); x.lineTo(0, 560); x.closePath();
        x.fillStyle = '#5c9e3a'; x.fill(); x.lineWidth = 2.4; x.strokeStyle = INK; x.stroke();
        for (let r = 0; r < 5; r++) {
            x.beginPath();
            for (let i = 0; i <= 32; i++) x.lineTo(i * 32, G + 14 + r * 17 + Math.sin(i * 0.9 + r) * 3);
            x.lineWidth = 2; x.strokeStyle = r % 2 ? '#4a8a30' : '#78b24a'; x.stroke();
        }
        for (let i = 0; i < 70; i++) {
            const fx = R() * 1024, fy = G + 8 + R() * 80, c = ['#f6f0e0', '#d42a24', '#f2c230', '#2a5ab0'][i % 4];
            oval(x, fx, fy, 2.2, 2.2, c, 0.8);
        }
        goose(x, 560, G + 18, R); goose(x, 600, G + 26, R); goose(x, 584, G + 44, R);
    }
    function hills(x) {
        // two rows of rolling hills sewn from patchwork fields, the way the Hlebine painters
        // laid out the Podravina plain; lollipop trees and a far chapel along the ridge
        const R = rng(8);
        const ridge = (y0, amp, ph) => i => y0 - Math.sin(i / 1024 * Math.PI * 2 + ph) * amp - Math.sin(i / 1024 * Math.PI * 5 + ph * 2) * amp * 0.35;
        const back = ridge(150, 34, 1.2), front = ridge(230, 26, 3.3);
        const hill = (f, base, cols) => {
            x.save();
            x.beginPath(); x.moveTo(0, 360);
            for (let i = 0; i <= 1024; i += 16) x.lineTo(i, f(i));
            x.lineTo(1024, 360); x.closePath();
            x.fillStyle = cols[0]; x.fill();
            x.clip();
            for (let i = 0; i < 16; i++) {
                const a = -200 + i * 90 + R() * 30;
                poly(x, [[a, 360], [a + 140, 0], [a + 220, 0], [a + 80, 360]], cols[i % cols.length], 0);
            }
            for (let i = 0; i < 6; i++) line(x, [[0, base + i * 22], [1024, base + i * 22 - 20]], 1.2, 'rgba(42,26,20,0.35)');
            x.restore();
            x.beginPath(); for (let i = 0; i <= 1024; i += 16) x.lineTo(i, f(i));
            x.lineWidth = 2.4; x.strokeStyle = INK; x.stroke();
        };
        hill(back, 170, ['#8cb48c', '#a8c48a', '#c8cc88', '#7aa48a']);
        for (let i = 0; i < 18; i++) {
            const tx = 20 + i * 58 + R() * 20, ty = back(tx);
            line(x, [[tx, ty + 2], [tx, ty - 10]], 2, '#4a3a2a');
            oval(x, tx, ty - 16, 7, 9, '#4e7e4a', 1.4);
        }
        const cx = 760, cy = back(cx);
        rect(x, cx - 10, cy - 30, 20, 30, '#f2ead6', 1.6);
        poly(x, [[cx - 12, cy - 30], [cx, cy - 46], [cx + 12, cy - 30]], '#b04a2e', 1.6);
        line(x, [[cx, cy - 46], [cx, cy - 56]], 1.6, INK); line(x, [[cx - 4, cy - 52], [cx + 4, cy - 52]], 1.6, INK);
        hill(front, 250, ['#6a9c4a', '#d8b850', '#88b448', '#b0c060', '#5a8a3e']);
        for (let i = 0; i < 12; i++) {
            const tx = 40 + i * 86 + R() * 30, ty = front(tx);
            line(x, [[tx, ty + 2], [tx, ty - 14]], 2.4, '#4a3a2a');
            oval(x, tx, ty - 22, 10, 12, i % 3 ? '#3e7a34' : '#5a9a3e', 1.6);
            for (let j = 0; j < 6; j++) oval(x, tx - 6 + R() * 12, ty - 30 + R() * 16, 1.6, 1.6, '#8ac85a', 0);
        }
    }
    function cloud(x, cx, cy, s, R) {
        const list = [];
        const n = 5 + Math.floor(R() * 3);
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1) - 0.5;
            list.push([cx + t * 120 * s, cy - Math.cos(t * Math.PI) * 16 * s + R() * 5 * s, (24 + R() * 12 - Math.abs(t) * 14) * s]);
        }
        list.push([cx - 25 * s, cy + 10 * s, 24 * s], [cx + 25 * s, cy + 10 * s, 24 * s]);
        blobs(x, list, '#fbf8f0', 2.4);
        for (const b of list) oval(x, b[0], b[1] + b[2] * 0.35, b[2] * 0.6, b[2] * 0.3, '#e6e6f0', 0);
        for (const b of list.slice(0, 3)) oval(x, b[0] - b[2] * 0.25, b[1] - b[2] * 0.35, b[2] * 0.3, b[2] * 0.18, '#ffffff', 0);
    }
    function flyingBird(x, bx, by, s) {
        x.beginPath(); x.moveTo(bx - 10 * s, by - 3 * s); x.quadraticCurveTo(bx - 5 * s, by - 8 * s, bx, by);
        x.quadraticCurveTo(bx + 5 * s, by - 8 * s, bx + 10 * s, by - 3 * s);
        x.lineWidth = 2.2 * s; x.strokeStyle = INK; x.stroke();
    }
    function cloudLayer(x, W, H) {
        const R = rng(4);
        const items = [];
        for (let i = 0; i < 11; i++) items.push([R() * W, (i + R() * 0.6) * H / 11, 0.6 + R() * 0.7]);
        // draw each one at its wrapped copies too, so the tile repeats without seams
        for (const [cx, cy, s] of items) for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) {
            const r = rng(Math.floor(cx * 7 + cy));
            cloud(x, cx + dx, cy + dy, s, r);
        }
        for (let i = 0; i < 9; i++) {
            const bx = R() * W, by = R() * H, s = 0.7 + R() * 0.6;
            for (let j = 0; j < 3; j++) flyingBird(x, bx + j * 22 * s, by + (j % 2) * 10 * s, s);
        }
    }
    function starLayer(x, W, H) {
        const R = rng(17);
        for (let i = 0; i < 220; i++) oval(x, R() * W, R() * H, 0.6 + R() * 1.1, 0.6 + R() * 1.1, `rgba(255,248,210,${0.4 + R() * 0.6})`, 0);
        for (let i = 0; i < 34; i++) {
            const sx = 30 + R() * (W - 60), sy = 30 + R() * (H - 60);
            star(x, sx, sy, 6 + R() * 7, R() < 0.25 ? '#ffffff' : '#f6d850', 1.4, R() < 0.2 ? 6 : 5);
        }
        // a comet with a painted tail
        const k = [700, 300];
        for (let i = 0; i < 6; i++) line(x, [[k[0], k[1]], [k[0] - 120 + i * 6, k[1] - 50 - i * 8]], 2, i % 2 ? '#f6d850' : '#f8f2e2');
        star(x, k[0], k[1], 11, '#fff2a0', 1.6);
    }
    function sun(x) {
        const c = 90;
        for (let i = 0; i < 16; i++) {
            const a = i / 16 * Math.PI * 2, a1 = a - 0.14, a2 = a + 0.14;
            poly(x, [[c + Math.cos(a1) * 52, c + Math.sin(a1) * 52], [c + Math.cos(a) * (i % 2 ? 76 : 86), c + Math.sin(a) * (i % 2 ? 76 : 86)], [c + Math.cos(a2) * 52, c + Math.sin(a2) * 52]], i % 2 ? '#f6a224' : '#f6d030', 1.8);
        }
        oval(x, c, c, 56, 56, '#f8d040', 2.6);
        oval(x, c, c, 46, 46, '#fbe070', 0);
        // a calm painted face
        x.beginPath(); x.arc(c - 18, c - 6, 8, 0.2, Math.PI - 0.2); x.lineWidth = 2.6; x.strokeStyle = INK; x.stroke();
        x.beginPath(); x.arc(c + 18, c - 6, 8, 0.2, Math.PI - 0.2); x.stroke();
        oval(x, c - 26, c + 12, 9, 6, 'rgba(230,80,60,0.55)', 0);
        oval(x, c + 26, c + 12, 9, 6, 'rgba(230,80,60,0.55)', 0);
        x.beginPath(); x.moveTo(c, c - 4); x.quadraticCurveTo(c + 6, c + 8, c - 2, c + 10); x.lineWidth = 2; x.stroke();
        x.beginPath(); x.arc(c, c + 14, 14, 0.35, Math.PI - 0.35); x.lineWidth = 2.6; x.strokeStyle = '#a82418'; x.stroke();
    }
    function moon(x) {
        const c = 80;
        oval(x, c, c, 70, 70, 'rgba(255,240,180,0.18)', 0);
        oval(x, c, c, 58, 58, '#f6ecb4', 2.6);
        for (const [a, b, r] of [[c - 26, c - 28, 8], [c + 30, c + 22, 10], [c - 30, c + 30, 6], [c + 20, c - 34, 5]]) oval(x, a, b, r, r, '#e6d898', 0);
        x.beginPath(); x.arc(c - 18, c - 4, 8, 0.2, Math.PI - 0.2); x.lineWidth = 2.6; x.strokeStyle = INK; x.stroke();
        x.beginPath(); x.arc(c + 18, c - 4, 8, 0.2, Math.PI - 0.2); x.stroke();
        oval(x, c - 24, c + 14, 8, 5, 'rgba(230,110,110,0.45)', 0);
        oval(x, c + 24, c + 14, 8, 5, 'rgba(230,110,110,0.45)', 0);
        x.beginPath(); x.arc(c, c + 14, 10, 0.4, Math.PI - 0.4); x.lineWidth = 2.4; x.stroke();
        star(x, c + 64, c - 50, 9, '#f6d850', 1.4);
    }
    function paper(x, W, H) {
        // the painting's surface: fine grain and a soft varnish vignette
        const img = x.createImageData(W, H), d = img.data, R = rng(99);
        for (let i = 0; i < d.length; i += 4) {
            const v = R() < 0.5 ? 255 : 60;
            d[i] = v; d[i + 1] = v * 0.92; d[i + 2] = v * 0.78; d[i + 3] = R() * 16;
        }
        x.putImageData(img, 0, 0);
        const g = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
        g.addColorStop(0, 'rgba(60,30,10,0)'); g.addColorStop(1, 'rgba(60,30,10,0.38)');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    // ---- registration -------------------------------------------------------------------------
    function sheet(scene, key, frames, fw, fh, draw) {
        const [c, x] = canvas(fw * frames.length, fh);
        frames.forEach((f, i) => { x.save(); x.translate(i * fw, 0); x.beginPath(); x.rect(0, 0, fw, fh); x.clip(); draw(x, f, i); x.restore(); });
        const tex = scene.textures.addCanvas(key, c);
        frames.forEach((f, i) => tex.add(f, 0, i * fw, 0, fw, fh));
    }
    function image(scene, key, w, h, draw) {
        const [c, x] = canvas(w, h);
        draw(x, w, h);
        scene.textures.addCanvas(key, c);
    }

    function build(scene) {
        const PF = Object.keys(POSES);
        sheet(scene, 'dudek', PF, S.fw, S.fh, (x, f) => drawPerson(x, DUDEK, f));
        sheet(scene, 'crni', PF, S.fw, S.fh, (x, f) => drawPerson(x, CRNI, f));
        sheet(scene, 'roda', ['fly1', 'fly2'], 144, 96, (x, f) => stork(x, f));
        sheet(scene, 'vrana', ['fly1', 'fly2'], 76, 58, (x, f) => crow(x, f));
        sheet(scene, 'opruga', ['up', 'down'], 34, 40, (x, f) => spring(x, f === 'down'));
        image(scene, 'p_daska', PLAT_W, 40, plank);
        image(scene, 'p_skrinja', PLAT_W, 40, painted);
        image(scene, 'p_snop', PLAT_W, 40, x => sheaf(x));
        image(scene, 'p_snop_l', PLAT_W, 40, x => sheaf(x, 'l'));
        image(scene, 'p_snop_r', PLAT_W, 40, x => sheaf(x, 'r'));
        image(scene, 'p_oblak', PLAT_W, 44, cloudPlat);
        image(scene, 'crni_oblak', 112, 60, darkCloud);
        image(scene, 'srce', 40, 40, licitar);
        image(scene, 'jabuka', 20, 22, apple);
        image(scene, 'slama', 14, 4, x => rect(x, 0, 0, 14, 4, '#e6c25a', 1, '#a87a24'));
        image(scene, 'perce', 16, 8, x => oval(x, 8, 4, 7, 3, '#2c2c40', 1));
        image(scene, 'pahulja', 20, 20, x => oval(x, 10, 10, 8, 8, '#fbf8f0', 1.6));
        image(scene, 'iskra', 16, 16, x => star(x, 8, 8, 7, '#f6d850', 1));
        image(scene, 'selo', 1024, 560, village);
        image(scene, 'brda', 1024, 360, hills);
        image(scene, 'oblaci', 1024, 2048, (x, w, h) => cloudLayer(x, w, h));
        image(scene, 'zvijezde', 1024, 1024, (x, w, h) => starLayer(x, w, h));
        image(scene, 'sunce', 180, 180, sun);
        image(scene, 'mjesec', 160, 160, moon);
        image(scene, 'papir', VW, VH, (x, w, h) => paper(x, w, h));
    }

    return { build, INK, PLAT_W, PLAT_TOP };
})();
