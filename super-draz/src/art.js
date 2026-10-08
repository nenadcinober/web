// Procedural art in the manner of Croatian naive painting (the Hlebine school of Podravina):
// flat bright colours, a dark ink outline round every shape, rosy cheeks, every leaf and brick
// painted on its own. Everything is drawn into canvases at boot; there are no image files.
const T = 48, VW = 1024, VH = 768;

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
    function vgrad(x, y0, y1, stops) {
        const g = x.createLinearGradient(0, y0, 0, y1);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        return g;
    }

    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
    const len = v => Math.hypot(v[0], v[1]);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

    // one tapered segment, filled as separate shapes so overlapping winding never punches holes
    function seg(x, p0, p1, w0, w1, color) {
        const d = sub(p1, p0), l = len(d) || 1, n = [-d[1] / l, d[0] / l];
        x.fillStyle = color;
        path(x, [add(p0, n, w0 / 2), add(p1, n, w1 / 2), add(p1, n, -w1 / 2), add(p0, n, -w0 / 2)]); x.fill();
        x.beginPath(); x.arc(p0[0], p0[1], w0 / 2, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(p1[0], p1[1], w1 / 2, 0, Math.PI * 2); x.fill();
    }
    // a limb through several joints: ink silhouette first, colour on top
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

    // ---- people -----------------------------------------------------------------------------
    const SIZES = {
        small: { fw: 64, fh: 48, cx: 32, headY: 15, headR: 8.5, shY: 24, hipY: 36, footY: 47, torsoW: 17, legW: 7, armW: 5, armLen: 12, stride: 0.55, bootL: 10, bootH: 5, k: 0.75 },
        big:   { fw: 64, fh: 96, cx: 32, headY: 19, headR: 10.5, shY: 33, hipY: 61, footY: 95, torsoW: 22, legW: 10, armW: 7, armLen: 25, stride: 1, bootL: 14, bootH: 8, k: 1 },
        boss:  { fw: 96, fh: 136, cx: 48, headY: 27, headR: 14.5, shY: 46, hipY: 86, footY: 134, torsoW: 32, legW: 14, armW: 10, armLen: 35, stride: 1.4, bootL: 19, bootH: 11, k: 1.4 },
    };
    // feet: [x offset, lift as a fraction of leg length] back then front; hands: offset from the
    // shoulder as a fraction of arm length. Everything faces right.
    const POSES = {
        stand: { f: [[-6, 0], [6, 0]], h: [[-0.25, 0.95], [0.3, 0.95]] },
        walk1: { f: [[-12, 0], [12, 0]], h: [[0.55, 0.8], [-0.5, 0.85]] },
        walk2: { f: [[-3, 0.2], [4, 0]], h: [[0.1, 1], [-0.05, 1]], bob: -1 },
        walk3: { f: [[12, 0], [-12, 0]], h: [[-0.5, 0.85], [0.55, 0.8]] },
        jump:  { f: [[-11, 0.12], [11, 0.45]], h: [[-0.7, 0.55], [0.35, -0.95]] },
        skid:  { f: [[-2, 0], [14, 0]], h: [[-0.85, 0.25], [0.75, 0.3]], lean: -3 },
        throw: { f: [[-8, 0], [8, 0]], h: [[-0.35, 0.9], [1, 0.05]] },
        climb: { f: [[-2, 0.3], [5, 0.05]], h: [[0.35, -0.9], [0.45, -0.55]] },
        dead:  { f: [[-9, 0], [9, 0]], h: [[-0.85, -0.55], [0.85, -0.55]], front: true },
        wave:  { f: [[-6, 0], [6, 0]], h: [[-0.25, 0.95], [0.55, -0.85]] },
    };

    const DUDEK = { skin: '#f2b98e', hair: '#4a3626', mustache: '#3a281c', hat: '#1d1a18', band: '#c8241c', shirt: '#f7f2e3',
        vest: '#25222c', sash: '#c8241c', pants: '#f3eedf', boots: '#1a1416', buttons: '#f0c030', eye: INK };
    const DUDEK_FIRE = { ...DUDEK, vest: '#c0281e', sash: '#f0c030', band: '#f0c030', buttons: '#2a6ab0' };
    const CRNI = { skin: '#d8a888', hair: '#0e0a0a', mustache: '#0e0a0a', hat: '#0a0808', band: '#7a0c0c', shirt: '#3a3440',
        vest: '#111014', sash: '#7a0c0c', pants: '#2c2832', boots: '#0a0808', buttons: '#9a1010', eye: '#ff2a1a', angry: true };

    function drawPerson(x, def, poseName, S) {
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
            // embroidered flower on the vest
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
            // eyes shut tight in a cross
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

    // Regica in Podravina costume: red headscarf, embroidered linen blouse, wide skirt, blue apron.
    function drawRegica(x, pose) {
        const cx = 32, lw = 2;
        const skin = '#f4c6a0', red = '#cc2028', blue = '#2448a0', white = '#f8f4ea';
        const fo = pose === 'walk1' ? [[-6, 0], [6, 0]] : pose === 'walk2' ? [[4, 0], [-4, 0]] : [[-4, 0], [5, 0]];
        for (const f of fo) oval(x, cx + f[0] + 3, 93, 6, 3.5, '#201818', lw);
        // skirt
        x.beginPath(); x.moveTo(cx - 10, 52); x.lineTo(cx + 11, 52); x.lineTo(cx + 23, 88);
        x.quadraticCurveTo(cx, 93, cx - 21, 88); x.closePath();
        x.fillStyle = white; x.fill(); x.lineWidth = lw; x.strokeStyle = INK; x.stroke();
        for (let i = -2; i <= 2; i++) line(x, [[cx + i * 3, 56], [cx + i * 6, 86]], 0.8, 'rgba(120,100,80,0.5)');
        x.save(); x.clip();
        rect(x, cx - 26, 78, 52, 5, red); rect(x, cx - 26, 84, 52, 2, blue);
        for (let i = 0; i < 9; i++) oval(x, cx - 20 + i * 5, 75, 1.2, 1.2, red, 0);
        x.restore();
        x.beginPath(); x.moveTo(cx - 10, 52); x.lineTo(cx + 11, 52); x.lineTo(cx + 23, 88);
        x.quadraticCurveTo(cx, 93, cx - 21, 88); x.closePath(); x.lineWidth = lw; x.strokeStyle = INK; x.stroke();
        // apron
        poly(x, [[cx + 1, 52], [cx + 11, 52], [cx + 20, 84], [cx + 5, 86]], blue, lw);
        for (let i = 0; i < 3; i++) line(x, [[cx + 3 + i * 0.8, 62 + i * 8], [cx + 13 + i * 2.2, 62 + i * 8]], 1.6, '#f0c030');
        // blouse
        poly(x, [[cx - 9, 31], [cx + 9, 31], [cx + 11, 53], [cx - 11, 53]], white, lw);
        rect(x, cx - 11, 49, 22, 4, red, 1.4);
        for (let i = 0; i < 4; i++) { oval(x, cx - 4 + i * 3, 36, 1.1, 1.1, red, 0); oval(x, cx - 2.5 + i * 3, 39, 1.1, 1.1, blue, 0); }
        const armPose = {
            stand: [[cx + 4, 46], [cx + 9, 47]], walk1: [[cx + 6, 50], [cx - 4, 50]], walk2: [[cx - 4, 50], [cx + 6, 50]],
            wave: [[cx + 2, 48], [cx + 16, 12]], happy: [[cx - 14, 14], [cx + 16, 12]],
        }[pose] || [[cx + 4, 46], [cx + 9, 47]];
        const shs = [[cx - 3, 35], [cx + 4, 35]];
        const arm = (i, dark) => {
            const s0 = shs[i], hd = armPose[i], el = joint(s0, hd, 22, [-0.5, 1]);
            limb(x, [s0, el, hd], [7, 5, 4.5], dark ? shade(skin, 0.9) : skin, 1.8);
            oval(x, s0[0], s0[1] + 1, 6, 5.5, white, lw);
            oval(x, s0[0], s0[1] + 3, 2, 1.2, red, 0);
            oval(x, hd[0], hd[1], 3, 3, skin, 1.6);
        };
        arm(0, true);
        // head with scarf
        const hx = cx + 1, hy = 20;
        oval(x, hx, hy, 10, 10.5, skin, lw);
        x.beginPath(); x.moveTo(hx + 9, hy - 4);
        x.quadraticCurveTo(hx + 4, hy - 16, hx - 6, hy - 12);
        x.quadraticCurveTo(hx - 15, hy - 4, hx - 11, hy + 8);
        x.lineTo(hx - 18, hy + 18); x.lineTo(hx - 8, hy + 12);
        x.quadraticCurveTo(hx - 2, hy + 12, hx + 1, hy + 10);
        x.quadraticCurveTo(hx - 6, hy + 4, hx - 5, hy - 4);
        x.quadraticCurveTo(hx + 2, hy - 8, hx + 9, hy - 4);
        x.closePath(); x.fillStyle = red; x.fill(); x.lineWidth = lw; x.strokeStyle = INK; x.stroke();
        for (const d of [[-6, -9], [0, -10], [-10, -1], [-9, 6], [-3, -5], [-13, 13]]) oval(x, hx + d[0], hy + d[1], 1.3, 1.3, white, 0);
        oval(x, hx, hy + 11, 3, 2.2, red, 1.4);
        oval(x, hx - 2, hy - 3, 4, 2, '#4a2a18', 0);
        oval(x, hx + 3, hy - 1, 1.6, 2.2, INK, 0); oval(x, hx + 3.5, hy - 1.8, 0.6, 0.6, '#fff', 0);
        oval(x, hx + 8, hy - 1, 1.2, 1.8, INK, 0);
        line(x, [[hx + 1, hy - 4.5], [hx + 4.5, hy - 5]], 1, '#4a2a18');
        oval(x, hx + 1, hy + 4, 3, 2.2, 'rgba(230,70,80,0.55)', 0);
        oval(x, hx + 9, hy + 4, 1.8, 1.8, 'rgba(230,70,80,0.45)', 0);
        oval(x, hx + 9.5, hy + 1.5, 1.4, 1.4, shade(skin, 0.92), 0.8);
        x.beginPath(); x.arc(hx + 5.5, hy + 5, 2.4, 0.2, Math.PI - 0.2); x.lineWidth = 1.2; x.strokeStyle = '#8a1a1a'; x.stroke();
        arm(1, false);
    }

    // ---- animals ------------------------------------------------------------------------------
    const WHITE = '#f8f6ee', ORANGE = '#ec8a1c';
    function goose(x, f) {
        if (f === 'flat') {
            oval(x, 24, 42, 19, 6, WHITE, 2); oval(x, 41, 40, 5, 3.5, WHITE, 1.6);
            poly(x, [[45, 39], [51, 41], [45, 42]], ORANGE, 1.4);
            line(x, [[39, 38.5], [42, 41.5]], 1.4, INK); line(x, [[42, 38.5], [39, 41.5]], 1.4, INK);
            return;
        }
        const s = f === 'walk1' ? 1 : -1;
        for (const [hx, d] of [[19, -s], [27, s]]) {
            line(x, [[hx, 38], [hx + d * 3, 45]], 2.6, ORANGE);
            poly(x, [[hx + d * 3 - 3, 46], [hx + d * 3 + 4, 46], [hx + d * 3, 43.5]], ORANGE, 1.2);
        }
        poly(x, [[5, 24], [14, 25], [12, 33]], WHITE, 1.8);
        oval(x, 22, 31, 15, 10, WHITE, 2);
        oval(x, 20, 29, 9, 5.5, '#e2ddd0', 1.4, INK, -0.2);
        line(x, [[14, 30], [22, 31]], 0.9, '#a8a090'); line(x, [[15, 32.5], [24, 33]], 0.9, '#a8a090');
        limb(x, [[31, 27], [35, 17], [37, 10]], [9, 7, 7], WHITE, 1.8);
        oval(x, 38, 9, 6.5, 6, WHITE, 1.8);
        poly(x, [[43, 6], [52, 7.5], [44, 9.5]], ORANGE, 1.4);
        poly(x, [[44, 10], [50, 13], [43, 12.5]], ORANGE, 1.4);
        oval(x, 40, 7.5, 1.5, 1.7, INK, 0);
        line(x, [[37, 4], [42.5, 5.8]], 1.8, INK);
        oval(x, 37, 11.5, 2.2, 1.5, 'rgba(230,80,80,0.5)', 0);
    }

    function shell(x, cx, cy, r) {
        oval(x, cx, cy, r, r * 0.95, '#e0a840', 2);
        oval(x, cx + r * 0.05, cy, r * 0.72, r * 0.68, '#c8402c', 1.4);
        oval(x, cx + r * 0.1, cy, r * 0.47, r * 0.45, '#f4d460', 1.4);
        oval(x, cx + r * 0.12, cy, r * 0.22, r * 0.21, '#2a7a40', 1.2);
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            oval(x, cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.82, 1.4, 1.4, '#fff', 0);
        }
    }
    function snail(x, f) {
        if (f === 'shell') { shell(x, 24, 31, 15); return; }
        const st = f === 'walk1' ? 0 : 3;
        poly(x, [[3 + st, 46], [40, 46], [45, 42], [45, 31], [41, 26], [36, 30], [34, 40], [6 + st, 41]], '#a4b864', 2);
        line(x, [[39, 29], [36, 17]], 2.4, '#a4b864'); line(x, [[43, 29], [45, 18]], 2.4, '#a4b864');
        for (const [ex, ey] of [[36, 16], [45.5, 17]]) { oval(x, ex, ey, 3, 3, WHITE, 1.4); oval(x, ex + 1, ey, 1.2, 1.4, INK, 0); }
        line(x, [[39, 37], [43, 37]], 1.2, INK);
        shell(x, 21, 28, 14);
    }
    function hedgehog(x, f) {
        const s = f === 'walk1' ? 1 : -1;
        oval(x, 16 + s * 2, 44, 3, 2.5, '#3a2418', 1.2); oval(x, 30 - s * 2, 44, 3, 2.5, '#3a2418', 1.2);
        // spikes
        for (let i = 0; i <= 12; i++) {
            const a = Math.PI + i / 12 * Math.PI * 0.95;
            const bx = 21 + Math.cos(a) * 16, byy = 36 + Math.sin(a) * 13;
            const tx = 21 + Math.cos(a) * 25, ty = 36 + Math.sin(a) * 22;
            const n = [-Math.sin(a) * 3.5, Math.cos(a) * 3.5];
            poly(x, [[bx + n[0], byy + n[1]], [tx, ty], [bx - n[0], byy - n[1]]], i % 2 ? '#5a3a24' : '#7a5232', 1.2);
        }
        oval(x, 21, 37, 18, 11, '#8a6040', 2);
        oval(x, 36, 38, 8, 6, '#e0b888', 1.8);
        oval(x, 44, 37, 2.6, 2.2, INK, 0);
        oval(x, 34, 34, 1.5, 1.8, INK, 0);
        line(x, [[31, 31], [36, 32.5]], 1.6, INK);
        oval(x, 33, 40, 2.4, 1.6, 'rgba(230,80,80,0.5)', 0);
    }
    function crow(x, f) {
        const body = '#1e1e2c';
        poly(x, [[14, 25], [2, 20], [5, 27], [1, 31], [14, 30]], body, 1.6);
        if (f === 'fly1') poly(x, [[18, 23], [12, 3], [24, 9], [33, 21]], '#2c2c40', 1.6);
        oval(x, 26, 27, 14, 9, body, 2);
        oval(x, 40, 20, 7.5, 7, body, 2);
        poly(x, [[46, 17], [55, 21], [46, 24]], '#f0b828', 1.4);
        oval(x, 42, 18.5, 2.6, 2.6, WHITE, 0.8); oval(x, 43, 18.5, 1.2, 1.4, INK, 0);
        line(x, [[38, 15], [45, 16.5]], 1.8, '#f0b828');
        if (f === 'fly2') poly(x, [[18, 28], [14, 45], [26, 39], [33, 30]], '#2c2c40', 1.6);
        line(x, [[24, 35], [23, 41]], 1.6, '#f0b828'); line(x, [[29, 35], [29, 41]], 1.6, '#f0b828');
    }

    // ---- items --------------------------------------------------------------------------------
    function sausage(x) {
        const pts = [[8, 32], [14, 25], [24, 21], [34, 23], [41, 30]];
        limb(x, pts, [12, 14, 15, 14, 12], '#b04a2a', 2);
        line(x, [[13, 24], [22, 19.5], [31, 20]], 2.2, 'rgba(255,220,200,0.6)');
        for (const d of [[16, 29], [22, 26], [28, 28], [34, 26], [20, 31], [31, 31]]) oval(x, d[0], d[1], 1.4, 1, '#f4dcc0', 0);
        line(x, [[5, 35], [2, 39]], 1.5, '#e8d8b0'); line(x, [[44, 33], [47, 37]], 1.5, '#e8d8b0');
    }
    function pepper(x) {
        x.beginPath(); x.moveTo(17, 14);
        x.bezierCurveTo(10, 24, 16, 40, 30, 46);
        x.bezierCurveTo(35, 40, 36, 24, 31, 14);
        x.closePath(); x.fillStyle = '#d8241c'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        line(x, [[19, 19], [20, 33]], 2.4, 'rgba(255,200,180,0.6)');
        line(x, [[25, 16], [28, 38]], 1, 'rgba(120,10,10,0.5)');
        poly(x, [[14, 15], [24, 10], [34, 15], [24, 18]], '#3a9030', 1.6);
        line(x, [[24, 11], [27, 3]], 2.6, '#3a7a28');
    }
    function heartPath(x, cx, cy, s) {
        x.beginPath();
        x.moveTo(cx, cy + s * 0.95);
        x.bezierCurveTo(cx - s * 1.5, cy - s * 0.05, cx - s * 0.75, cy - s * 1.05, cx, cy - s * 0.42);
        x.bezierCurveTo(cx + s * 0.75, cy - s * 1.05, cx + s * 1.5, cy - s * 0.05, cx, cy + s * 0.95);
        x.closePath();
    }
    function licitar(x) {
        heartPath(x, 24, 25, 19); x.fillStyle = '#d61e2a'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        heartPath(x, 24, 25, 15); x.setLineDash([2, 2.5]); x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke(); x.setLineDash([]);
        oval(x, 24, 23, 5.5, 5.5, '#dfe8f0', 1.4);
        oval(x, 22.5, 21.5, 2, 1.4, '#fff', 0);
        for (const d of [[14, 17], [34, 17], [24, 37]]) { oval(x, d[0], d[1], 2, 2, '#f0d040', 0.8); }
        oval(x, 17, 27, 1.4, 1.4, '#3aa040', 0); oval(x, 31, 27, 1.4, 1.4, '#3aa040', 0);
    }
    function coin(x, i) {
        const rx = [12, 8, 2.5, 8][i];
        oval(x, 24, 24, rx, 15, '#f2c232', 2);
        if (rx > 4) {
            oval(x, 24, 24, rx * 0.7, 11, '#e0a820', 1, '#a87810');
            x.save(); x.translate(24, 24); x.scale(rx / 12 * (i === 3 ? -1 : 1), 1);
            x.font = 'bold 15px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
            x.fillStyle = '#9a6a10'; x.fillText('D', 0, 1);
            x.restore();
            line(x, [[24 - rx * 0.5, 14], [24 - rx * 0.2, 12]], 1.6, 'rgba(255,255,255,0.8)');
        }
    }
    function flame(x, cx, cy, r, outer = '#f04a14', inner = '#ffd040') {
        x.beginPath();
        x.moveTo(cx - r, cy + r * 0.2);
        x.quadraticCurveTo(cx - r * 0.9, cy - r * 0.8, cx, cy - r * 1.3);
        x.quadraticCurveTo(cx + r * 0.9, cy - r * 0.8, cx + r, cy + r * 0.2);
        x.arc(cx, cy + r * 0.2, r, 0, Math.PI);
        x.closePath(); x.fillStyle = outer; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#7a1a08'; x.stroke();
        oval(x, cx, cy + r * 0.3, r * 0.55, r * 0.6, inner, 0);
    }

    // ---- tiles --------------------------------------------------------------------------------
    // 0 ground top, 1 ground, 2 brick, 3 ? block, 4 used block, 5 hard block, 6-9 barrel,
    // 10 bridge, 11 (unused), 12 castle wall, 13/14 lava, 15/16 water
    const THEMES = {
        village: { grass: '#5aac34', grass2: '#7cc444', soil: '#94603a', soil2: '#6e4226', brick: '#c4542c', mortar: '#ecd6a8', hard: '#b4a48c', stone: false },
        river:   { grass: '#4c9c3c', grass2: '#7ab84a', soil: '#8a5a3c', soil2: '#5e3a26', brick: '#b8502e', mortar: '#e8cca0', hard: '#a8988a', stone: false },
        cellar:  { soil: '#5a4434', soil2: '#3e2e24', floor: '#8a7660', brick: '#8a4a34', mortar: '#4a3428', hard: '#8a7a6a', stone: true },
        castle:  { soil: '#4a4652', soil2: '#34303c', floor: '#6e6878', brick: '#5e5668', mortar: '#2c2834', hard: '#7a7484', stone: true },
    };

    function tileset(theme) {
        const P = THEMES[theme], rnd = rng(theme.length * 977);
        const [c, x] = canvas(17 * T, T);
        const at = i => { x.save(); x.translate(i * T, 0); x.beginPath(); x.rect(0, 0, T, T); x.clip(); };
        const done = () => x.restore();
        const dirt = () => {
            rect(x, 0, 0, T, T, P.soil);
            for (let i = 0; i < 9; i++) oval(x, rnd() * T, rnd() * T, 2 + rnd() * 4, 1.5 + rnd() * 2, P.soil2, 0);
            for (let i = 0; i < 4; i++) oval(x, rnd() * T, rnd() * T, 1.5 + rnd() * 2, 1.2 + rnd() * 1.5, shade(P.soil, 1.25), 0.6, P.soil2);
        };
        const flags = (y0) => {
            rect(x, 0, y0, T, T - y0, P.floor);
            for (let r = 0; r < 2; r++) {
                const off = r % 2 ? 0 : T / 2;
                for (let i = -1; i < 2; i++) {
                    const bx = off + i * T + 1, byy = y0 + r * 12 + 1;
                    rect(x, bx, byy, T - 2, 11, shade(P.floor, 0.9 + rnd() * 0.2), 1.2, P.mortar);
                    line(x, [[bx + 2, byy + 2], [bx + T - 6, byy + 2]], 1.2, 'rgba(255,255,255,0.18)');
                }
            }
        };
        // 0 ground top
        at(0);
        if (P.stone) { dirt(); flags(0); }
        else {
            dirt();
            rect(x, 0, 0, T, 13, P.grass);
            for (let i = 0; i < 16; i++) {
                const gx = i * 3 + rnd() * 2, h = 4 + rnd() * 6;
                poly(x, [[gx - 2, 12], [gx + rnd() * 2 - 1, 12 - h], [gx + 2, 12]], i % 2 ? P.grass2 : shade(P.grass, 0.85), 0);
            }
            x.beginPath(); for (let i = 0; i <= 8; i++) x.lineTo(i * 6, 13 + (i % 2 ? 2.5 : 0)); x.lineTo(T, 0); x.lineTo(0, 0); x.closePath();
            x.fillStyle = P.grass; x.globalAlpha = 0.5; x.fill(); x.globalAlpha = 1;
            line(x, Array.from({ length: 9 }, (_, i) => [i * 6, 13 + (i % 2 ? 2.5 : 0)]), 1.6, '#2e5a1a');
            for (let i = 0; i < 2; i++) {
                const fx = 8 + rnd() * 32, fy = 4 + rnd() * 4, col = ['#f4f4f0', '#f05050', '#f0d040'][Math.floor(rnd() * 3)];
                for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; oval(x, fx + Math.cos(a) * 1.8, fy + Math.sin(a) * 1.8, 1.3, 1.3, col, 0); }
                oval(x, fx, fy, 1, 1, '#f0b020', 0);
            }
        }
        done();
        // 1 ground fill
        at(1); dirt(); if (P.stone) flags(0); done();
        // 2 brick
        at(2);
        rect(x, 0, 0, T, T, P.mortar);
        for (let r = 0; r < 4; r++) {
            const off = r % 2 ? -T / 4 : 0;
            for (let i = 0; i < 3; i++) {
                const bx = off + i * (T / 2) + 1, byy = r * 12 + 1;
                rect(x, bx, byy, T / 2 - 2, 10, shade(P.brick, 0.88 + rnd() * 0.24), 1.1, shade(P.brick, 0.5));
                line(x, [[bx + 2, byy + 2], [bx + T / 2 - 6, byy + 2]], 1.2, 'rgba(255,230,200,0.35)');
            }
        }
        done();
        // 3 ? block: a painted chest with a folk question mark
        const box = (fill, mark) => {
            rect(x, 0, 0, T, T, INK);
            rect(x, 2, 2, T - 4, T - 4, fill);
            rect(x, 2, 2, T - 4, 4, shade(fill, 1.3)); rect(x, 2, T - 6, T - 4, 4, shade(fill, 0.75));
            for (const [a, b] of [[7, 7], [T - 7, 7], [7, T - 7], [T - 7, T - 7]]) oval(x, a, b, 2.2, 2.2, shade(fill, 0.55), 0.8);
            if (mark) {
                for (const [a, b, col] of [[13, 24, '#2a6ab0'], [35, 24, '#2a6ab0'], [24, 11, '#3a9a40']]) oval(x, a, b, 2.2, 2.2, col, 0.6);
                x.font = 'bold 32px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
                x.lineWidth = 4; x.strokeStyle = INK; x.strokeText('?', 24, 27); x.fillStyle = '#d42020'; x.fillText('?', 24, 27);
            }
        };
        at(3); box('#f2b62a', true); done();
        at(4); box('#9a6a3a', false); done();
        // 5 hard block
        at(5);
        rect(x, 0, 0, T, T, INK);
        poly(x, [[1, 1], [T - 1, 1], [1, T - 1]], shade(P.hard, 1.2), 0);
        poly(x, [[T - 1, 1], [T - 1, T - 1], [1, T - 1]], shade(P.hard, 0.7), 0);
        rect(x, 7, 7, T - 14, T - 14, P.hard, 1.2);
        for (let i = 0; i < 4; i++) oval(x, 10 + rnd() * 28, 10 + rnd() * 28, 1.5, 1, shade(P.hard, 0.8), 0);
        done();
        // 6-9 barrel, drawn 2 tiles wide then sliced
        const [bc, bx] = canvas(2 * T, 2 * T);
        bx.lineCap = 'round';
        const wood = '#a8662e';
        rect(bx, 3, 0, 2 * T - 6, 2 * T, wood);
        for (let i = 0; i < 7; i++) {
            const sx = 3 + i * (2 * T - 6) / 7;
            rect(bx, sx, 0, (2 * T - 6) / 7, 2 * T, shade(wood, 0.85 + (i % 3) * 0.1));
            line(bx, [[sx, 0], [sx, 2 * T]], 1.2, '#5a3418');
        }
        const g = bx.createLinearGradient(3, 0, 2 * T - 3, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(0.35, 'rgba(255,240,200,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
        bx.fillStyle = g; bx.fillRect(3, 0, 2 * T - 6, 2 * T);
        rect(bx, 3, 0, 2 * T - 6, 2 * T, null, 2.5);
        rect(bx, 0, 4, 2 * T, 9, '#4a4038', 2); rect(bx, 2, 5, 2 * T - 4, 2, 'rgba(255,255,255,0.3)');
        rect(bx, 3, 34, 2 * T - 6, 6, '#4a4038', 1.6);
        rect(bx, 3, 34 + T, 2 * T - 6, 6, '#4a4038', 1.6);
        for (let i = 0; i < 3; i++) oval(bx, 14 + i * 34, 8.5, 1.5, 1.5, '#d8c8a0', 0);
        for (let i = 0; i < 4; i++) {
            x.save(); x.translate((6 + i) * T, 0);
            x.drawImage(bc, (i % 2) * T, i < 2 ? 0 : T, T, T, 0, 0, T, T);
            x.restore();
        }
        // 10 bridge plank with chain
        at(10);
        rect(x, 0, 0, T, 20, '#8e5a2c', 2);
        for (let i = 0; i < 3; i++) line(x, [[i * 16 + 2, 2], [i * 16 + 2, 18]], 1.2, '#5a3418');
        line(x, [[2, 5], [T - 2, 5]], 1.2, 'rgba(255,220,170,0.4)');
        for (let i = 0; i < 4; i++) oval(x, 6 + i * 12, 27, 5, 3.5, null, 2, '#3a3440');
        done();
        // 12 castle wall
        at(12);
        rect(x, 0, 0, T, T, P.mortar);
        for (let r = 0; r < 3; r++) {
            const off = r % 2 ? -T / 3 : 0;
            for (let i = 0; i < 3; i++) rect(x, off + i * (T * 0.66) + 1, r * 16 + 1, T * 0.66 - 2, 14, shade(P.hard, 0.8 + rnd() * 0.25), 1, INK);
        }
        done();
        // 13/14 lava
        at(13);
        rect(x, 0, 14, T, T - 14, '#e2481a');
        x.beginPath(); x.moveTo(0, 16);
        for (let i = 0; i <= 4; i++) x.quadraticCurveTo(i * 12 - 6, 8, i * 12, 16);
        x.lineTo(T, T); x.lineTo(0, T); x.closePath(); x.fillStyle = '#f06a1a'; x.fill();
        line(x, [[0, 16], [6, 10], [12, 16], [18, 10], [24, 16], [30, 10], [36, 16], [42, 10], [48, 16]], 2, '#ffd040');
        for (let i = 0; i < 3; i++) oval(x, 8 + i * 16, 30 + (i % 2) * 8, 3, 2, '#ffc030', 0);
        done();
        at(14);
        rect(x, 0, 0, T, T, '#d43c18');
        for (let i = 0; i < 6; i++) oval(x, rnd() * T, rnd() * T, 2 + rnd() * 3, 1.5 + rnd() * 2, i % 2 ? '#f07020' : '#ffb030', 0);
        done();
        // 15/16 water
        at(15);
        rect(x, 0, 16, T, T - 16, '#3a6ab0');
        x.beginPath(); x.moveTo(0, 18);
        for (let i = 0; i <= 4; i++) x.quadraticCurveTo(i * 12 - 6, 12, i * 12, 18);
        x.lineTo(T, T); x.lineTo(0, T); x.closePath(); x.fillStyle = '#4a82c8'; x.fill();
        for (let i = 0; i < 4; i++) oval(x, 6 + i * 12, 16, 3, 1.4, '#e8f4ff', 0);
        line(x, [[8, 30], [20, 30]], 1.5, 'rgba(255,255,255,0.4)'); line(x, [[28, 40], [42, 40]], 1.5, 'rgba(255,255,255,0.4)');
        done();
        at(16);
        rect(x, 0, 0, T, T, '#2e5a9a');
        line(x, [[4, 12], [18, 12]], 1.5, 'rgba(255,255,255,0.25)'); line(x, [[26, 30], [44, 30]], 1.5, 'rgba(255,255,255,0.25)');
        done();
        return c;
    }

    // ---- props --------------------------------------------------------------------------------
    function pole(x) {
        rect(x, 13, 18, 8, 446, '#c8a060', 1.6);
        for (let y = 30; y < 460; y += 24) line(x, [[13, y], [21, y + 6]], 1, 'rgba(90,60,30,0.5)');
        oval(x, 17, 12, 9, 9, '#d42020', 2);
        oval(x, 14.5, 9.5, 2.5, 2, 'rgba(255,255,255,0.6)', 0);
    }
    function towel(x) {
        poly(x, [[60, 2], [4, 2], [4, 40], [60, 40]], '#f8f4ea', 2);
        for (let i = 0; i < 6; i++) {
            const cx = 10 + i * 9;
            poly(x, [[cx, 8], [cx + 3.5, 12], [cx, 16], [cx - 3.5, 12]], i % 2 ? '#2a5ab0' : '#cc2028', 0);
        }
        rect(x, 6, 22, 52, 3, '#cc2028'); rect(x, 6, 28, 52, 1.5, '#2a5ab0');
        for (let i = 0; i < 12; i++) line(x, [[6 + i * 4.6, 40], [6 + i * 4.6, 46]], 1.4, '#cc2028');
    }
    function house(x) {
        // Podravina farmhouse: whitewashed walls, blue plinth, porch, thatched roof, stork on the chimney
        const W = 288, base = 286;
        rect(x, 30, 150, 228, 136, '#f6f0e0', 2.5);
        rect(x, 30, 262, 228, 24, '#3a64b0', 2);
        for (let i = 0; i < 4; i++) {
            const ax = 42 + i * 56;
            x.beginPath(); x.moveTo(ax, 262); x.lineTo(ax, 196); x.quadraticCurveTo(ax + 22, 172, ax + 44, 196); x.lineTo(ax + 44, 262);
            x.fillStyle = 'rgba(160,130,90,0.25)'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke();
        }
        // door
        rect(x, 116, 186, 56, 100, '#6a3a1c', 2.5);
        for (let i = 0; i < 4; i++) line(x, [[116 + i * 14, 188], [116 + i * 14, 284]], 1, '#4a2410');
        oval(x, 162, 236, 3, 3, '#f0c030', 1);
        poly(x, [[116, 186], [144, 168], [172, 186]], '#f6f0e0', 2);
        // windows with geraniums
        for (const wx of [56, 202]) {
            rect(x, wx, 182, 32, 38, '#7ab0e0', 2.5);
            line(x, [[wx + 16, 182], [wx + 16, 220]], 2, INK); line(x, [[wx, 200], [wx + 32, 200]], 2, INK);
            rect(x, wx - 4, 220, 40, 9, '#8a4a24', 1.6);
            for (let i = 0; i < 5; i++) { oval(x, wx + i * 8, 216, 4, 3.5, '#e02828', 1); oval(x, wx + 4 + i * 8, 222, 3, 2, '#3a9030', 0); }
        }
        // roof
        poly(x, [[8, 156], [144, 44], [280, 156]], '#c89a4a', 2.5);
        for (let i = 0; i < 26; i++) {
            const t = i / 25, px = 8 + t * 272;
            const top = px < 144 ? 156 - (px - 8) / 136 * 112 : 156 - (280 - px) / 136 * 112;
            line(x, [[px, 154], [px + (144 - px) * 0.1, top + 6]], 1.1, '#8a6224');
        }
        line(x, [[8, 156], [280, 156]], 3, '#8a6224');
        rect(x, 196, 60, 22, 50, '#e8dcc8', 2);
        oval(x, 207, 58, 20, 7, '#6a4a28', 1.6);
        // stork in its nest
        oval(x, 206, 40, 9, 6, '#f8f6ee', 1.6);
        line(x, [[212, 36], [216, 22]], 3, '#f8f6ee'); oval(x, 217, 20, 4, 4, '#f8f6ee', 1.4);
        line(x, [[220, 20], [232, 24]], 2.4, '#e84020');
        poly(x, [[198, 38], [190, 42], [200, 44]], '#1e1e24', 1.2);
        oval(x, 218, 19, 0.9, 0.9, INK, 0);
        // sunflowers by the wall
        for (const sx of [10, 270]) {
            line(x, [[sx, 286], [sx, 210]], 3, '#3a7a28');
            for (let p = 0; p < 10; p++) { const a = p / 10 * Math.PI * 2; oval(x, sx + Math.cos(a) * 9, 206 + Math.sin(a) * 9, 5, 2.4, '#f6c020', 0.8, INK, a); }
            oval(x, sx, 206, 6, 6, '#5a3418', 1.4);
        }
    }
    function axe(x) {
        line(x, [[10, 44], [36, 8]], 6, INK); line(x, [[10, 44], [36, 8]], 3.5, '#a86a30');
        poly(x, [[30, 4], [44, 2], [46, 20], [34, 16]], '#c8ccd4', 2);
        line(x, [[44, 4], [46, 18]], 2, '#fff');
    }
    function log(x, w) {
        const L = w * T;
        rect(x, 6, 3, L - 12, 18, '#9a6436', 2);
        for (let i = 0; i < w * 3; i++) line(x, [[12 + i * 15, 8 + (i % 2) * 6], [20 + i * 15, 8 + (i % 2) * 6]], 1.2, '#6a4020');
        line(x, [[8, 6], [L - 10, 6]], 1.4, 'rgba(255,220,170,0.4)');
        oval(x, L - 7, 12, 5, 9, '#d8b07a', 2); oval(x, L - 7, 12, 2.5, 5, null, 1, '#9a6436');
        oval(x, 7, 12, 4, 9, '#7a4a24', 2);
    }

    // ---- decor --------------------------------------------------------------------------------
    function bush(x, rnd) {
        const greens = ['#3a8a30', '#4ea03a', '#68b444', '#2e7428'];
        oval(x, 48, 32, 42, 18, '#2e6a26', 2);
        for (let i = 0; i < 70; i++) {
            const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
            oval(x, 48 + Math.cos(a) * 38 * r, 32 + Math.sin(a) * 15 * r, 3.2, 1.8, greens[i % 4], 0.5, INK, rnd() * 3);
        }
        for (let i = 0; i < 5; i++) oval(x, 16 + rnd() * 64, 22 + rnd() * 16, 2.2, 2.2, ['#f04848', '#f8f8f0', '#f0d040'][i % 3], 0.6);
    }
    function fence(x) {
        rect(x, 0, 18, 144, 5, '#9a7040', 1.4); rect(x, 0, 32, 144, 5, '#9a7040', 1.4);
        for (let i = 0; i < 9; i++) poly(x, [[4 + i * 16, 48], [4 + i * 16, 10], [9 + i * 16, 4], [14 + i * 16, 10], [14 + i * 16, 48]], '#c09058', 1.6);
    }
    function sunflower(x, rnd) {
        line(x, [[24, 96], [24, 26]], 3.5, '#3a7a28');
        oval(x, 16, 62, 8, 4, '#4a9a34', 1.4, INK, 0.5); oval(x, 32, 50, 8, 4, '#4a9a34', 1.4, INK, -0.5);
        for (let p = 0; p < 12; p++) { const a = p / 12 * Math.PI * 2; oval(x, 24 + Math.cos(a) * 12, 22 + Math.sin(a) * 12, 7, 3, '#f6c020', 1, INK, a); }
        oval(x, 24, 22, 8.5, 8.5, '#6a3a18', 1.6);
        for (let i = 0; i < 8; i++) oval(x, 20 + rnd() * 8, 18 + rnd() * 8, 0.9, 0.9, '#2a1408', 0);
    }
    function haystack(x) {
        x.beginPath(); x.moveTo(6, 94); x.quadraticCurveTo(2, 40, 48, 8); x.quadraticCurveTo(94, 40, 90, 94); x.closePath();
        x.fillStyle = '#e2b64c'; x.fill(); x.lineWidth = 2.2; x.strokeStyle = INK; x.stroke();
        for (let i = 0; i < 30; i++) {
            const t = i / 30, px = 12 + t * 72;
            line(x, [[px, 92], [px + (48 - px) * 0.35, 30 + Math.abs(px - 48) * 0.6]], 1, '#a87a24');
        }
        line(x, [[48, 8], [48, -2]], 3, '#6a4a24');
        oval(x, 30, 70, 8, 5, 'rgba(255,255,255,0.15)', 0);
    }
    function reeds(x, rnd) {
        for (let i = 0; i < 9; i++) {
            const bx = 4 + i * 5, h = 40 + rnd() * 28;
            line(x, [[bx, 72], [bx + rnd() * 6 - 3, 72 - h]], 2, i % 2 ? '#5a8a30' : '#3a6a24');
            if (i % 3 === 0) oval(x, bx + 1, 72 - h + 4, 2.5, 7, '#6a3a1c', 1);
        }
    }
    function smallBarrel(x) {
        oval(x, 24, 26, 18, 20, '#a8662e', 2);
        rect(x, 6, 12, 36, 4, '#4a4038', 1); rect(x, 6, 36, 36, 4, '#4a4038', 1);
        oval(x, 24, 26, 18, 20, null, 2);
        line(x, [[16, 8], [16, 44]], 1, '#5a3418'); line(x, [[32, 8], [32, 44]], 1, '#5a3418');
    }
    function torch(x) {
        rect(x, 20, 30, 8, 30, '#5a3a20', 1.6);
        rect(x, 16, 26, 16, 8, '#3a3440', 1.6);
        flame(x, 24, 14, 9);
    }

    // ---- registration -------------------------------------------------------------------------
    function sheet(scene, key, frames, fw, fh, draw) {
        const [c, x] = canvas(fw * frames.length, fh);
        frames.forEach((f, i) => { x.save(); x.translate(i * fw, 0); x.beginPath(); x.rect(0, 0, fw, fh); x.clip(); draw(x, f, i); x.restore(); });
        const tex = scene.textures.addCanvas(key, c);
        frames.forEach((f, i) => tex.add(f, 0, i * fw, 0, fw, fh));
        return tex;
    }
    function image(scene, key, w, h, draw) {
        const [c, x] = canvas(w, h);
        draw(x);
        scene.textures.addCanvas(key, c);
    }

    const PERSON_FRAMES = ['stand', 'walk1', 'walk2', 'walk3', 'jump', 'skid', 'throw', 'climb', 'dead', 'wave'];

    function build(scene) {
        const S = SIZES;
        sheet(scene, 'dudek_s', PERSON_FRAMES, S.small.fw, S.small.fh, (x, f) => drawPerson(x, DUDEK, f, S.small));
        sheet(scene, 'dudek_b', PERSON_FRAMES, S.big.fw, S.big.fh, (x, f) => drawPerson(x, DUDEK, f, S.big));
        sheet(scene, 'dudek_f', PERSON_FRAMES, S.big.fw, S.big.fh, (x, f) => drawPerson(x, DUDEK_FIRE, f, S.big));
        sheet(scene, 'boss', PERSON_FRAMES, S.boss.fw, S.boss.fh, (x, f) => drawPerson(x, CRNI, f, S.boss));
        sheet(scene, 'regica', ['stand', 'wave', 'happy', 'walk1', 'walk2'], 64, 96, (x, f) => drawRegica(x, f));
        sheet(scene, 'goose', ['walk1', 'walk2', 'flat'], 56, 48, (x, f) => goose(x, f));
        sheet(scene, 'snail', ['walk1', 'walk2', 'shell'], 48, 48, (x, f) => snail(x, f));
        sheet(scene, 'hedgehog', ['walk1', 'walk2'], 48, 48, (x, f) => hedgehog(x, f));
        sheet(scene, 'crow', ['fly1', 'fly2'], 56, 48, (x, f) => crow(x, f));
        sheet(scene, 'coin', ['c0', 'c1', 'c2', 'c3'], 48, 48, (x, f, i) => coin(x, i));
        image(scene, 'kobasica', 48, 48, sausage);
        image(scene, 'paprika', 48, 48, pepper);
        image(scene, 'srce', 48, 48, licitar);
        image(scene, 'heart_small', 24, 24, x => { heartPath(x, 12, 12, 9); x.fillStyle = '#d61e2a'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke(); });
        image(scene, 'fireball', 24, 24, x => flame(x, 12, 13, 7));
        image(scene, 'ember', 20, 20, x => { oval(x, 10, 10, 8, 8, '#f86a1a', 1.5, '#7a1a08'); oval(x, 10, 10, 4.5, 4.5, '#ffd850', 0); });
        image(scene, 'bossfire', 72, 30, x => {
            x.beginPath(); x.moveTo(2, 15); x.quadraticCurveTo(30, 0, 60, 4); x.quadraticCurveTo(72, 15, 60, 26); x.quadraticCurveTo(30, 30, 2, 15);
            x.fillStyle = '#f04a14'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#7a1a08'; x.stroke();
            oval(x, 50, 15, 14, 6, '#ffd040', 0); oval(x, 58, 15, 6, 3, '#fff6c0', 0);
        });
        image(scene, 'debris', 18, 18, x => { rect(x, 2, 2, 14, 10, '#c4542c', 1.5); rect(x, 4, 4, 8, 2, 'rgba(255,230,200,0.4)'); });
        image(scene, 'pole', 34, 470, pole);
        image(scene, 'towel', 64, 48, towel);
        image(scene, 'house', 288, 288, house);
        image(scene, 'axe', 48, 48, axe);
        image(scene, 'log2', 96, 24, x => log(x, 2));
        image(scene, 'log3', 144, 24, x => log(x, 3));
        image(scene, 'grm', 96, 54, x => bush(x, rng(7)));
        image(scene, 'plot', 144, 48, fence);
        image(scene, 'suncokret', 48, 96, x => sunflower(x, rng(11)));
        image(scene, 'plast', 96, 96, haystack);
        image(scene, 'trska', 48, 72, x => reeds(x, rng(5)));
        image(scene, 'bacvica', 48, 48, smallBarrel);
        image(scene, 'baklja', 48, 64, torch);
        image(scene, 'px', 4, 4, x => rect(x, 0, 0, 4, 4, '#fff'));
        for (const th of Object.keys(THEMES)) {
            const c = tileset(th);
            const tex = scene.textures.addCanvas('tiles_' + th, c);
            for (let i = 0; i < 17; i++) tex.add(i, 0, i * T, 0, T, T);
        }
    }

    return { build, canvas, rng, shade, poly, oval, rect, line, vgrad, path, limb, flame, heartPath, INK, SIZES };
})();
