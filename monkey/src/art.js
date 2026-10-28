// Procedural art in the manner of Croatian naive painting (the Hlebine school of Podravina):
// flat bright colours and a dark ink outline round every shape. Everything is painted into
// canvases at boot; there are no image files.
const VW = 1024, VH = 768, SH = 544;   // SH: height of the scene above the verb panel

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
    function line(x, pts, w, c = INK) {
        x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
        x.lineWidth = w; x.strokeStyle = c; x.stroke();
    }
    function vgrad(x, y0, y1, stops) {
        const g = x.createLinearGradient(0, y0, 0, y1);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        return g;
    }
    function text(x, s, cx, cy, size, fill, font = 'Georgia') {
        x.font = `bold ${size}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = fill; x.fillText(s, cx, cy);
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

    // little painted flowers, the way they're embroidered on headscarves and painted on chests
    function flower(x, cx, cy, r, petal = '#d42020', mid = '#f2c030') {
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2;
            oval(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.75, r * 0.75, petal, 1);
        }
        oval(x, cx, cy, r * 0.6, r * 0.6, mid, 1);
    }

    // ---- people -----------------------------------------------------------------------------
    // Each character is painted side-on, facing right, into a 140 x 232 frame with the feet at
    // y = 224. The sprite is flipped to face left.
    const FW = 140, FH = 232, FOOT = 224, CX = 62;

    const CHARS = {
        draz:     { skin: '#f4c6a0', hair: '#f0c848', style: 'draz', shirt: '#f8f3e6', vest: '#2f6fb8', buttons: '#f2c030', sash: '#d42020', pants: '#7a5232', boots: '#3a2416', col: '#ffe680' },
        dudek:    { skin: '#f2b98e', hair: '#4a3626', style: 'short', hat: 'sesir', hatCol: '#1d1a18', band: '#c8241c', mustache: '#3a281c', shirt: '#f7f2e3', vest: '#25222c', buttons: '#f0c030', sash: '#c8241c', pants: '#f3eedf', boots: '#1a1416', col: '#ff9a7a' },
        regica:   { skin: '#f6c4a0', hair: '#6a3a1c', style: 'short', hat: 'rubac', hatCol: '#d42020', shirt: '#fbf6ea', embroid: '#d42020', skirt: '#c42222', apron: '#f4ecd4', stockings: '#fbf6ea', boots: '#2a1a14', col: '#ff8fb0' },
        cinober:  { skin: '#eeb08a', hair: '#3a2a1e', style: 'bald', mustache: '#2a1c14', bigMustache: true, nose: 'big', shirt: '#b8302a', apron: '#f4efe2', pants: '#3a3230', boots: '#1a1416', fat: 1, col: '#ffb060' },
        joza:     { skin: '#e8b08c', hair: '#9a9a9a', style: 'short', hat: 'kapa', hatCol: '#5a4a3a', mustache: '#d8d8d8', shirt: '#efe8d6', vest: '#3f6a36', buttons: '#e0c070', pants: '#4a3c30', boots: '#1a1416', stoop: 4, col: '#a8e890' },
        lojzek:   { skin: '#eeb294', hair: '#f2f2f2', style: 'bald', nose: 'red', mustache: '#f2f2f2', shirt: '#d8cdb0', vest: '#6a4428', pants: '#4a3c30', boots: '#1a1416', stoop: 6, col: '#e0c8a0' },
        duka:     { skin: '#e8b48a', hair: '#7a4a24', style: 'short', hat: 'slamnati', hatCol: '#e8c870', band: '#3a6ab0', shirt: '#f0e8d4', open: true, pants: '#5a6a8a', boots: '#4a3020', straw: true, col: '#9ad0ff' },
        jaga:     { skin: '#e8b090', hair: '#bdbdbd', style: 'short', hat: 'rubac', hatCol: '#1e2e6a', shirt: '#f2ecdc', embroid: '#2a5ab0', skirt: '#4a3a2e', apron: '#e8dcc0', stockings: '#e8e0d0', boots: '#1a1416', stoop: 5, nose: 'big', col: '#d8a8ff' },
        pepek:    { skin: '#dca07a', hair: '#8a8a8a', style: 'short', hat: 'kapa', hatCol: '#26344e', beard: '#9a9a9a', shirt: '#f2f0ea', stripes: '#2a4a8a', pants: '#3a3a40', boots: '#1a1416', col: '#80e0e0' },
        direktor: { skin: '#f0c0a0', hair: '#3a3a3a', style: 'comb', glasses: true, shirt: '#f4f4f4', jacket: '#5e6470', tie: '#c41a1a', pants: '#5e6470', boots: '#141414', fat: 0.6, col: '#c8d0e0' },
    };

    function person(x, d, p) {
        const cx = CX, fat = d.fat || 0, lw = 2.2;
        const sit = !!p.sit;
        const stoop = (d.stoop || 0) + (p.slump ? 14 : 0);
        const hipY = sit ? 150 : 132, shY = (sit ? 84 : 66) + (d.stoop || 0) * 0.5;
        const tw = 30 + fat * 18;
        const walking = p.ph != null, ph = (p.ph || 0) * Math.PI * 2;
        const lean = stoop * 0.9;

        // legs: [0] is the far leg, [1] the near one
        const legs = [0, 1].map(k => {
            const hip = [cx + (k ? 3 : -4), hipY];
            let ft, kn;
            if (sit) {
                kn = [cx + 34, hipY + 4]; ft = [cx + 34 + (k ? 6 : -2), FOOT - 2];
            } else {
                const s = walking ? Math.sin(ph + (k ? Math.PI : 0)) : (k ? 0.18 : -0.14);
                const c = walking ? Math.cos(ph + (k ? Math.PI : 0)) : 0;
                ft = [cx + s * 25, FOOT - 3 - Math.max(0, c) * 10];
                kn = joint(hip, ft, 93, [1, 0]);
            }
            return { hip, kn, ft };
        });
        const drawLeg = (L, dark) => {
            const col = d.skirt ? d.stockings : d.pants;
            limb(x, [L.hip, L.kn, L.ft], [15 + fat * 3, 13, 11], dark ? shade(col, 0.82) : col, lw);
            oval(x, L.ft[0] + 7, L.ft[1] - 1, 13, 7, d.boots, lw);
            oval(x, L.ft[0] + 5, L.ft[1] - 4, 5, 2, 'rgba(255,255,255,0.2)', 0);
        };

        // arms
        const sh = [[cx - 2 + lean, shY + 9], [cx + 4 + lean, shY + 9]];
        const handFor = (k) => {
            const s = sh[k], sw = walking ? Math.sin(ph + (k ? 0 : Math.PI)) * 18 : 0;
            const m = k ? (p.arm || 'down') : (p.arm === 'up' ? 'up' : p.arm === 'reach' && sit ? 'reach' : 'down');
            switch (m) {
                case 'gesture': return [s[0] + 40, s[1] + 22];
                case 'reach': return [s[0] + 54, s[1] + 40];
                case 'hold': return [s[0] + 32, s[1] + 36];
                case 'up': return [s[0] + 18 + (k ? 6 : -4), s[1] - 52];
                case 'hip': return [s[0] + 10, s[1] + 46];
                default: return [s[0] + 4 - sw * (k ? 1 : -1) * 0.9, s[1] + 58];
            }
        };
        const sleeve = d.jacket || (d.stripes ? d.shirt : d.shirt);
        const drawArm = (k, dark) => {
            const s = sh[k], hd = handFor(k);
            const el = joint(s, hd, 62, p.arm === 'hip' && k ? [1, 0] : [-0.4, 1]);
            limb(x, [s, el, hd], [12 + fat * 2, 11, 9], dark ? shade(sleeve, 0.82) : sleeve, lw);
            if (d.stripes) { const m = lerp(s, el, 0.5); oval(x, m[0], m[1], 4, 4, d.stripes, 0); }
            oval(x, hd[0], hd[1], 6.5, 6.5, d.skin, lw);
        };

        drawArm(0, true);
        drawLeg(legs[0], true);
        drawLeg(legs[1], false);

        // torso
        const t0 = shY, t1 = hipY + 6;
        const tl = cx - tw / 2 + lean, tr = cx + tw / 2 + lean;
        const torso = [[tl + 4, t0], [tr - 4, t0], [tr + fat * 10, (t0 + t1) / 2 + 4], [tr - 1 + fat * 6, t1], [tl + 2 - lean * 0.6, t1], [tl - 1, (t0 + t1) / 2]];
        poly(x, torso, d.jacket || d.shirt, lw);
        if (d.stripes) for (let yy = t0 + 8; yy < t1; yy += 10) line(x, [[tl + 2, yy], [tr + fat * 8, yy]], 3.5, d.stripes);
        if (d.open) poly(x, [[tr - 6, t0 + 2], [tr - 1, t0 + 2], [tr - 4, t0 + 22]], d.skin, 1.2);
        if (d.embroid) {
            for (let i = 0; i < 3; i++) flower(x, cx + 2 + lean + (i - 1) * 8, t0 + 12, 2.2, d.embroid, '#f2c030');
        }
        if (d.vest) {
            poly(x, [[tl + 4, t0 + 1], [tr - 10, t0 + 1], [tr - 6 + fat * 6, t1 - 2], [tl + 2 - lean * 0.6, t1 - 2], [tl - 1, (t0 + t1) / 2]], d.vest, lw * 0.8);
            for (let i = 0; i < 4; i++) oval(x, tr - 8 + i * 0.6, t0 + 10 + i * 13, 2.4, 2.4, d.buttons || '#f2c030', 1);
        }
        if (d.jacket) {
            poly(x, [[tr - 10, t0 + 2], [tr - 3, t0 + 2], [tr - 1, t0 + 30]], d.shirt, 1.2);
            poly(x, [[tr - 6, t0 + 4], [tr - 3, t0 + 4], [tr - 1, t0 + 34], [tr - 5, t0 + 38]], d.tie, 1.2);
            line(x, [[tr - 12, t0 + 2], [tr - 4, t0 + 40]], 1.6);
        }
        if (fat) oval(x, tr + fat * 3, (t0 + t1) / 2 + 12, 8 + fat * 6, 16 + fat * 6, d.jacket || d.shirt, 0);
        if (d.sash) {
            poly(x, [[tl, hipY - 6], [tr + fat * 6, hipY - 6], [tr + fat * 6, hipY + 3], [tl, hipY + 3]], d.sash, lw * 0.8);
            poly(x, [[tl + 2, hipY], [tl - 7, hipY + 18], [tl + 1, hipY + 20], [tl + 6, hipY + 2]], d.sash, lw * 0.7);
        }
        if (d.skirt) {
            const sw = walking ? Math.sin(ph) * 4 : 0;
            const bot = sit ? hipY + 44 : FOOT - 36;
            const sk = sit
                ? [[tl - 2, hipY - 10], [tr + 2, hipY - 10], [cx + 48, hipY + 2], [cx + 52, bot], [cx - 4, bot], [tl - 6, hipY + 20]]
                : [[tl - 1, hipY - 12], [tr + 1, hipY - 12], [tr + 18 + sw, bot], [cx + 4, bot + 5], [tl - 16 + sw, bot]];
            poly(x, sk, d.skirt, lw);
            for (let i = 1; i < 4; i++) line(x, [lerp(sk[0], sk[1], i / 4), lerp(sk[sk.length - 1], sk[2], i / 4)], 1, shade(d.skirt, 0.7));
            line(x, [lerp(sk[sk.length - 1], sk[2], 0.05), lerp(sk[sk.length - 1], sk[2], 0.95)], 4, '#f2c030');
            if (d.apron) {
                const ap = sit ? [[cx + 8, hipY - 8], [tr + 4, hipY - 8], [cx + 50, bot - 2], [cx + 14, bot - 2]]
                               : [[cx + 2, hipY - 10], [tr + 2, hipY - 10], [tr + 14 + sw, bot - 4], [cx + 6, bot - 2]];
                poly(x, ap, d.apron, lw * 0.8);
                flower(x, (ap[0][0] + ap[2][0]) / 2, (ap[0][1] + ap[2][1]) / 2 + 8, 3, d.embroid || '#d42020', '#f2c030');
            }
        } else if (d.apron) {
            poly(x, [[cx - 2 + lean, t0 + 20], [tr + fat * 10, t0 + 20], [tr + fat * 10 + 2, FOOT - 70], [cx + 2, FOOT - 66]], d.apron, lw * 0.8);
            line(x, [[cx + 2 + lean, t0 + 22], [cx - 6 + lean, t0 + 2]], 2, '#d8d0c0');
        }

        // head
        const hc = [cx + 4 + lean + (p.slump ? 18 : 0), shY - 26 + (p.slump ? 22 : 0)];
        limb(x, [[cx + 1 + lean, shY + 2], [hc[0] - 2, hc[1] + 12]], [11, 11], d.skin, lw);
        if (d.style === 'draz') {
            // the ponytail, tied with a red ribbon
            poly(x, [[hc[0] - 12, hc[1] + 2], [hc[0] - 28, hc[1] + 16], [hc[0] - 30, hc[1] + 32], [hc[0] - 20, hc[1] + 22], [hc[0] - 8, hc[1] + 10]], d.hair, lw);
            oval(x, hc[0] - 16, hc[1] + 9, 4, 3, '#d42020', 1.2, INK, 0.6);
        }
        if (d.hat === 'rubac') poly(x, [[hc[0] - 14, hc[1] + 6], [hc[0] - 30, hc[1] + 30], [hc[0] - 14, hc[1] + 26], [hc[0] - 4, hc[1] + 12]], d.hatCol, lw);
        oval(x, hc[0], hc[1], 15, 18, d.skin, lw);
        oval(x, hc[0] + 16, hc[1] + 2, d.nose === 'big' ? 7 : 5, d.nose === 'big' ? 6.5 : 5, d.nose === 'red' ? '#e06060' : shade(d.skin, 0.95), lw * 0.8);
        oval(x, hc[0] - 4, hc[1] + 2, 4, 6, shade(d.skin, 0.92), lw * 0.7);
        oval(x, hc[0] + 6, hc[1] + 8, 4.5, 3, 'rgba(230,80,60,0.35)', 0);
        if (p.sleep) line(x, [[hc[0] + 5, hc[1] - 4], [hc[0] + 11, hc[1] - 3]], 1.8);
        else {
            oval(x, hc[0] + 9, hc[1] - 4, 2.3, 2.8, INK, 0);
            line(x, [[hc[0] + 4, hc[1] - 10], [hc[0] + 12, hc[1] - 10.5]], 1.8);
        }
        if (d.glasses) {
            oval(x, hc[0] + 9, hc[1] - 4, 5.5, 5, 'rgba(200,230,255,0.35)', 1.6);
            line(x, [[hc[0] + 3.5, hc[1] - 4], [hc[0] - 4, hc[1] - 3]], 1.4);
        }
        if (p.mouth) oval(x, hc[0] + 11, hc[1] + 11, 4, 3.6, '#5a1a14', 1.2);
        else line(x, [[hc[0] + 7, hc[1] + 11], [hc[0] + 13, hc[1] + 10]], 1.6);
        if (d.beard) poly(x, [[hc[0] - 6, hc[1] + 4], [hc[0] + 4, hc[1] + 12], [hc[0] + 16, hc[1] + 10], [hc[0] + 12, hc[1] + 24], [hc[0] - 2, hc[1] + 22]], d.beard, lw * 0.8);
        if (d.mustache) {
            const big = d.bigMustache ? 1.5 : 1;
            poly(x, [[hc[0] + 8, hc[1] + 6], [hc[0] + 19, hc[1] + 5], [hc[0] + 20 + 2 * big, hc[1] + 9 + 3 * big], [hc[0] + 13, hc[1] + 9], [hc[0] + 6 - 4 * big, hc[1] + 10 + 3 * big]], d.mustache, lw * 0.7);
        }
        if (d.straw) line(x, [[hc[0] + 12, hc[1] + 11], [hc[0] + 28, hc[1] + 6]], 2.4, '#e8c870');

        // hair
        if (d.style === 'draz') {
            poly(x, [[hc[0] - 15, hc[1] + 4], [hc[0] - 16, hc[1] - 10], [hc[0] - 8, hc[1] - 20], [hc[0] + 4, hc[1] - 22], [hc[0] + 14, hc[1] - 16],
                [hc[0] + 18, hc[1] - 22], [hc[0] + 14, hc[1] - 8], [hc[0] + 6, hc[1] - 12], [hc[0] - 2, hc[1] - 6], [hc[0] - 6, hc[1] + 2]], d.hair, lw);
        } else if (d.style === 'short' && !d.hat) {
            poly(x, [[hc[0] - 15, hc[1] + 4], [hc[0] - 14, hc[1] - 12], [hc[0], hc[1] - 19], [hc[0] + 13, hc[1] - 12], [hc[0] + 4, hc[1] - 10], [hc[0] - 6, hc[1] + 2]], d.hair, lw);
        } else if (d.style === 'bald') {
            poly(x, [[hc[0] - 15, hc[1] + 6], [hc[0] - 15, hc[1] - 4], [hc[0] - 8, hc[1] - 6], [hc[0] - 6, hc[1] + 4]], d.hair, lw * 0.8);
            if (d.hair === '#f2f2f2') { oval(x, hc[0] - 8, hc[1] - 16, 3, 5, '#f2f2f2', 1); oval(x, hc[0] - 2, hc[1] - 19, 2.5, 5, '#f2f2f2', 1); }
        } else if (d.style === 'comb') {
            poly(x, [[hc[0] - 15, hc[1] + 4], [hc[0] - 14, hc[1] - 8], [hc[0] - 8, hc[1] - 6], [hc[0] - 6, hc[1] + 2]], d.hair, lw * 0.8);
            for (let i = 0; i < 4; i++) line(x, [[hc[0] - 12, hc[1] - 10 - i * 2], [hc[0] + 10, hc[1] - 16 - i * 1.2]], 1.4, d.hair);
        }
        // hats
        if (d.hat === 'sesir') {
            poly(x, [[hc[0] - 12, hc[1] - 14], [hc[0] - 10, hc[1] - 34], [hc[0] + 12, hc[1] - 34], [hc[0] + 14, hc[1] - 14]], d.hatCol, lw);
            rect(x, hc[0] - 12, hc[1] - 20, 26, 5, d.band);
            oval(x, hc[0] + 1, hc[1] - 14, 26, 5, d.hatCol, lw);
        } else if (d.hat === 'kapa') {
            poly(x, [[hc[0] - 15, hc[1] - 6], [hc[0] - 12, hc[1] - 20], [hc[0] + 2, hc[1] - 24], [hc[0] + 14, hc[1] - 16], [hc[0] + 28, hc[1] - 12], [hc[0] + 14, hc[1] - 9]], d.hatCol, lw);
        } else if (d.hat === 'slamnati') {
            poly(x, [[hc[0] - 12, hc[1] - 14], [hc[0] - 8, hc[1] - 30], [hc[0] + 10, hc[1] - 30], [hc[0] + 14, hc[1] - 14]], d.hatCol, lw);
            rect(x, hc[0] - 11, hc[1] - 20, 24, 4, d.band);
            oval(x, hc[0] + 1, hc[1] - 14, 34, 6, d.hatCol, lw);
            for (let i = -3; i <= 3; i++) line(x, [[hc[0] + 1 + i * 9, hc[1] - 18], [hc[0] + 1 + i * 10, hc[1] - 10]], 1, '#b89040');
        } else if (d.hat === 'rubac') {
            poly(x, [[hc[0] - 16, hc[1] + 8], [hc[0] - 17, hc[1] - 8], [hc[0] - 8, hc[1] - 20], [hc[0] + 6, hc[1] - 22], [hc[0] + 16, hc[1] - 12], [hc[0] + 10, hc[1] - 9], [hc[0] - 2, hc[1] - 6], [hc[0] - 4, hc[1] + 10]], d.hatCol, lw);
            flower(x, hc[0] - 6, hc[1] - 12, 2.4, '#ffffff', '#f2c030');
            flower(x, hc[0] + 5, hc[1] - 16, 2, '#ffffff', '#f2c030');
            flower(x, hc[0] - 10, hc[1] + 0, 2, '#ffffff', '#f2c030');
        }

        drawArm(1, false);
    }

    const FRAMES = {
        stand: {}, talk: { mouth: 1, arm: 'gesture' }, talk2: { mouth: 1 },
        walk0: { ph: 0 }, walk1: { ph: 1 / 6 }, walk2: { ph: 2 / 6 }, walk3: { ph: 3 / 6 }, walk4: { ph: 4 / 6 }, walk5: { ph: 5 / 6 },
        reach: { arm: 'reach' }, hold: { arm: 'hold' }, up: { arm: 'up', mouth: 1 }, hip: { arm: 'hip' },
        sit: { sit: 1 }, sittalk: { sit: 1, mouth: 1, arm: 'gesture' }, sittalk2: { sit: 1, mouth: 1 },
        sleep: { sit: 1, slump: 1, sleep: 1, arm: 'reach' },
    };
    const FRAME_NAMES = Object.keys(FRAMES);

    function buildPeople(scene) {
        for (const id in CHARS) {
            const [c, x] = canvas(FW * FRAME_NAMES.length, FH);
            FRAME_NAMES.forEach((f, i) => {
                x.save(); x.translate(i * FW, 0);
                person(x, CHARS[id], FRAMES[f]);
                x.restore();
            });
            const tex = scene.textures.addCanvas('ch_' + id, c);
            FRAME_NAMES.forEach((f, i) => tex.add(f, 0, i * FW, 0, FW, FH));
        }
    }

    // ---- Garo, the yard dog -----------------------------------------------------------------
    function dog(x, mode) {
        const fur = '#8a5a30', dark = '#5a3418', lw = 2.2;
        if (mode === 'sleep') {
            oval(x, 70, 92, 46, 16, fur, lw);
            oval(x, 34, 82, 12, 7, fur, lw, INK, -0.3);
            poly(x, [[110, 90], [128, 80], [124, 92]], fur, lw);
            oval(x, 112, 90, 18, 13, fur, lw);
            poly(x, [[104, 82], [96, 98], [108, 96]], dark, lw);
            line(x, [[116, 86], [122, 87]], 1.8);
            oval(x, 128, 94, 4, 3, INK, 0);
            oval(x, 64, 84, 14, 6, dark, 0);
            return;
        }
        // sitting, facing right
        line(x, [[30, 96], [14, 70]], 7, INK); line(x, [[30, 96], [14, 70]], 4, fur);
        oval(x, 50, 84, 26, 20, fur, lw);
        poly(x, [[62, 60], [84, 40], [92, 60], [86, 100], [66, 102]], fur, lw);
        oval(x, 66, 82, 9, 12, dark, 0);
        limb(x, [[80, 74], [84, 102]], [10, 9], fur, lw);
        oval(x, 88, 104, 9, 5, fur, lw);
        oval(x, 44, 104, 16, 6, fur, lw);
        // red collar and chain
        poly(x, [[76, 50], [92, 58], [90, 64], [74, 56]], '#c8241c', 1.5);
        const hx = 98, hy = 36;
        poly(x, [[hx - 18, hy - 2], [hx - 14, hy - 22], [hx - 6, hy - 8]], dark, lw);
        oval(x, hx, hy, 18, 15, fur, lw);
        if (mode === 'growl' || mode === 'bark') {
            poly(x, [[hx + 8, hy - 2], [hx + 32, hy + 2], [hx + 32, hy + 8], [hx + 10, hy + 10]], fur, lw);
            poly(x, [[hx + 10, hy + 12], [hx + 30, hy + (mode === 'bark' ? 22 : 14)], [hx + 12, hy + 18]], '#a02020', lw * 0.8);
            for (let i = 0; i < 4; i++) poly(x, [[hx + 14 + i * 4, hy + 9], [hx + 16 + i * 4, hy + 14], [hx + 18 + i * 4, hy + 9]], '#ffffff', 0.8);
            line(x, [[hx - 2, hy - 10], [hx + 10, hy - 6]], 2.2);
        } else {
            poly(x, [[hx + 8, hy - 2], [hx + 30, hy + 2], [hx + 30, hy + 12], [hx + 8, hy + 12]], fur, lw);
            line(x, [[hx + 18, hy + 12], [hx + 28, hy + 11]], 1.5);
        }
        oval(x, hx + 31, hy + 3, 4, 3.5, INK, 0);
        oval(x, hx + 4, hy - 4, 2.5, 3, INK, 0);
        oval(x, hx - 6, hy + 2, 6, 8, dark, lw * 0.7);
    }
    function buildDog(scene) {
        const modes = ['sit', 'growl', 'bark', 'sleep'];
        const [c, x] = canvas(150 * modes.length, 120);
        modes.forEach((m, i) => { x.save(); x.translate(i * 150, 0); dog(x, m); x.restore(); });
        const tex = scene.textures.addCanvas('ch_garo', c);
        modes.forEach((m, i) => tex.add(m, 0, i * 150, 0, 150, 120));
    }

    // ---- inventory icons (72 x 56) ---------------------------------------------------------
    const ICONS = {
        dinari(x) {
            oval(x, 30, 32, 16, 16, '#d8b040', 2); oval(x, 30, 32, 11, 11, null, 1.4, '#8a6a20'); text(x, '1', 30, 33, 14, '#6a4a10');
            oval(x, 44, 26, 16, 16, '#e8c450', 2); oval(x, 44, 26, 11, 11, null, 1.4, '#8a6a20'); text(x, '1', 44, 27, 14, '#6a4a10');
        },
        krvavica(x) { poly(x, [[10, 34], [20, 22], [50, 20], [62, 28], [56, 38], [24, 40]], '#5a1a1a', 2); line(x, [[22, 28], [48, 26]], 2, '#8a3a3a'); line(x, [[8, 36], [4, 42]], 2); line(x, [[63, 28], [68, 22]], 2); },
        mak(x) {
            for (const [a, b] of [[22, 22], [36, 16], [50, 24]]) {
                line(x, [[a, b + 6], [36, 50]], 2.4, '#3a7a2a');
                for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2; oval(x, a + Math.cos(t) * 6, b + Math.sin(t) * 6, 6, 6, '#e02020', 1); }
                oval(x, a, b, 4, 4, '#1a1a1a', 1);
            }
        },
        krvavica_mak(x) { ICONS.krvavica(x); for (let i = 0; i < 9; i++) oval(x, 18 + i * 4.5, 24 + (i % 3) * 5, 1.5, 1.5, '#1a1a30', 0); oval(x, 54, 16, 6, 6, '#e02020', 1.5); },
        pita(x) {
            poly(x, [[8, 34], [64, 34], [58, 44], [14, 44]], '#c8c0b0', 2);
            oval(x, 36, 30, 28, 9, '#e8a040', 2);
            for (let i = 0; i < 5; i++) line(x, [[16 + i * 10, 26], [20 + i * 10, 34]], 1.5, '#a06020');
            line(x, [[28, 18], [26, 10]], 1.5, 'rgba(255,255,255,0.7)'); line(x, [[40, 18], [42, 8]], 1.5, 'rgba(255,255,255,0.7)');
        },
        lopata(x) { line(x, [[12, 46], [50, 14]], 8); line(x, [[12, 46], [50, 14]], 5, '#a87040'); poly(x, [[44, 8], [64, 4], [66, 20], [56, 26]], '#9aa0a8', 2); },
        karta(x) { poly(x, [[10, 8], [60, 12], [62, 48], [12, 46]], '#e8d8a8', 2); line(x, [[20, 36], [28, 28], [36, 32], [46, 22]], 1.5, '#8a5a30'); line(x, [[44, 16], [52, 24]], 2.5, '#c02020'); line(x, [[52, 16], [44, 24]], 2.5, '#c02020'); },
        lonac(x) {
            poly(x, [[16, 18], [56, 18], [62, 34], [54, 50], [18, 50], [10, 34]], '#a8602c', 2);
            oval(x, 36, 18, 22, 6, '#6a3418', 2);
            for (let i = 0; i < 5; i++) oval(x, 22 + i * 7, 15 - (i % 2) * 2, 5, 3.5, '#f2c830', 1);
            line(x, [[14, 30], [58, 30]], 2, '#e8d0a0');
        },
        rupec(x) { poly(x, [[10, 10], [62, 10], [36, 50]], '#1e2e6a', 2); flower(x, 36, 20, 3, '#ffffff', '#f2c030'); flower(x, 24, 15, 2, '#ffffff', '#f2c030'); flower(x, 48, 15, 2, '#ffffff', '#f2c030'); },
        rakija(x) { poly(x, [[30, 6], [42, 6], [42, 16], [52, 26], [52, 52], [20, 52], [20, 26], [30, 16]], 'rgba(220,240,255,0.8)', 2); rect(x, 21, 30, 30, 20, 'rgba(240,220,150,0.7)'); rect(x, 30, 3, 12, 6, '#8a5a30', 1.5); rect(x, 24, 32, 24, 12, '#f8f2e0', 1.2); text(x, 'R', 36, 39, 9, '#c02020'); },
        kokos(x) {
            poly(x, [[10, 34], [20, 22], [40, 20], [52, 12], [58, 16], [56, 26], [62, 30], [54, 34], [44, 44], [22, 44]], '#f2e030', 2);
            oval(x, 54, 12, 3, 4, '#e02020', 1); oval(x, 50, 18, 1.6, 1.6, INK, 0);
            oval(x, 32, 32, 7, 7, '#9aa0a8', 2); oval(x, 32, 32, 2, 2, INK, 0);
        },
        gruntovnica(x) { poly(x, [[12, 10], [60, 10], [60, 48], [12, 48]], '#6a2a1a', 2); rect(x, 16, 14, 40, 30, null, 1.5, '#e8c050'); text(x, 'GRUNT', 36, 29, 10, '#e8c050'); },
    };
    function buildIcons(scene) {
        for (const id in ICONS) {
            const [c, x] = canvas(72, 56);
            ICONS[id](x);
            scene.textures.addCanvas('it_' + id, c);
        }
    }

    // ---- props that change during play ------------------------------------------------------
    function prop(scene, key, w, h, fn) { const [c, x] = canvas(w, h); fn(x); scene.textures.addCanvas(key, c); }

    function buildProps(scene) {
        // the bar counter and the table in the tavern sit in front of the people behind them
        prop(scene, 'pr_sank', 360, 150, x => {
            poly(x, [[4, 10], [352, 10], [356, 26], [0, 26]], '#a06a3a', 2.5);
            poly(x, [[8, 26], [348, 26], [348, 148], [8, 148]], '#7a4a26', 2.5);
            for (let i = 0; i < 4; i++) {
                rect(x, 22 + i * 84, 40, 66, 92, '#8a5630', 2);
                flower(x, 55 + i * 84, 86, 8, i % 2 ? '#2a5ab0' : '#d42020', '#f2c030');
                for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.78; oval(x, 55 + i * 84 + Math.cos(a) * 22, 86 + Math.sin(a) * 22, 5, 3, '#3a8a3a', 1, INK, a); }
            }
            // two glasses and a jug on the counter
            poly(x, [[60, -2 + 12], [72, -2 + 12], [70, 12], [62, 12]], 'rgba(220,240,255,0.7)', 1.5);
            poly(x, [[290, 2], [306, 2], [310, 14], [286, 14]], '#c86a3a', 1.5);
        });
        prop(scene, 'pr_stol', 300, 110, x => {
            poly(x, [[16, 8], [284, 8], [298, 34], [2, 34]], '#a06a3a', 2.5);
            poly(x, [[2, 34], [298, 34], [298, 46], [2, 46]], '#7a4a26', 2.5);
            rect(x, 18, 46, 14, 62, '#6a3e20', 2); rect(x, 268, 46, 14, 62, '#6a3e20', 2);
            // a checked tablecloth runner
            poly(x, [[110, 8], [190, 8], [194, 34], [106, 34]], '#e8e0d0', 1.5);
            for (let i = 0; i < 5; i++) line(x, [[114 + i * 18, 8], [110 + i * 19, 34]], 3, '#d42020');
            // a wine jug and glasses
            poly(x, [[60, -2 + 10], [70, -10 + 10], [80, -2 + 10], [82, 20], [58, 20]], '#c86a3a', 1.5);
            poly(x, [[150, 0], [160, 0], [159, 18], [151, 18]], 'rgba(230,200,120,0.75)', 1.2);
            poly(x, [[200, 4], [210, 4], [209, 20], [201, 20]], 'rgba(230,200,120,0.75)', 1.2);
        });
        prop(scene, 'pr_tanjur', 80, 34, x => { oval(x, 40, 20, 34, 10, '#f4f0e8', 2); oval(x, 40, 19, 24, 6, '#e0dcd0', 1); });
        prop(scene, 'pr_krvavica', 60, 24, x => { poly(x, [[6, 14], [14, 6], [44, 5], [54, 11], [48, 18], [14, 19]], '#5a1a1a', 2); line(x, [[16, 10], [42, 9]], 2, '#8a3a3a'); });
        prop(scene, 'pr_kokos', 70, 60, x => { line(x, [[36, 0], [36, 18]], 2); x.save(); x.translate(0, 8); ICONS.kokos(x); x.restore(); });
        prop(scene, 'pr_pita', 76, 30, x => {
            poly(x, [[6, 16], [70, 16], [64, 26], [12, 26]], '#c8c0b0', 2);
            oval(x, 38, 13, 30, 8, '#e8a040', 2);
            for (let i = 0; i < 5; i++) line(x, [[16 + i * 11, 9], [20 + i * 11, 17]], 1.5, '#a06020');
        });
        prop(scene, 'pr_para', 40, 40, x => {
            line(x, [[12, 38], [8, 26], [14, 14], [10, 2]], 2.5, 'rgba(255,255,255,0.8)');
            line(x, [[28, 38], [24, 26], [30, 14], [26, 2]], 2.5, 'rgba(255,255,255,0.8)');
        });
        prop(scene, 'pr_vrata_zatv', 146, 152, x => {
            poly(x, [[2, 2], [144, 2], [144, 150], [2, 150]], '#8a5a30', 2.5);
            for (let i = 1; i < 6; i++) line(x, [[2 + i * 24, 2], [2 + i * 24, 150]], 1.6, '#5a3418');
            line(x, [[4, 20], [142, 20]], 6, '#5a3418'); line(x, [[4, 130], [142, 130]], 6, '#5a3418'); line(x, [[6, 126], [140, 24]], 6, '#5a3418');
            oval(x, 120, 76, 6, 6, '#2a2a2a', 1.5);
        });
        prop(scene, 'pr_vrata_otv', 146, 152, x => {
            poly(x, [[2, 2], [144, 2], [144, 150], [2, 150]], '#221610', 2.5);
            for (let i = 0; i < 4; i++) oval(x, 30 + i * 30, 140, 16, 8, '#c8a040', 1);
            poly(x, [[100, 10], [138, 4], [138, 150], [100, 140]], '#8a5a30', 2.5);
            line(x, [[110, 30], [136, 26]], 5, '#5a3418');
            // pitchfork and rake leaning inside
            line(x, [[20, 140], [30, 30]], 3, '#a87040');
            line(x, [[24, 30], [36, 30]], 2.5, '#9aa0a8');
        });
        prop(scene, 'pr_lopata', 40, 120, x => { line(x, [[20, 2], [20, 84]], 7); line(x, [[20, 2], [20, 84]], 4, '#a87040'); poly(x, [[8, 84], [32, 84], [30, 112], [20, 118], [10, 112]], '#9aa0a8', 2); line(x, [[14, 2], [26, 2]], 4); });
        prop(scene, 'pr_slika', 140, 170, x => {
            rect(x, 4, 4, 132, 162, '#b8862a', 3);
            rect(x, 16, 16, 108, 138, '#7ab0e0', 2);
            rect(x, 16, 112, 108, 42, '#4a9a40', 0);
            // a burning house and saint Florian pouring water on it
            poly(x, [[24, 112], [24, 86], [46, 70], [66, 86], [66, 112]], '#f4ecd8', 1.5);
            poly(x, [[30, 76], [40, 50], [46, 66], [54, 46], [60, 78]], '#f08020', 1.5);
            poly(x, [[38, 76], [44, 62], [50, 74]], '#f8d030', 1);
            oval(x, 96, 52, 9, 10, '#f4c6a0', 1.5);
            oval(x, 96, 40, 12, 3.5, '#f2d050', 1.5);
            poly(x, [[84, 64], [108, 64], [112, 120], [80, 120]], '#c02020', 1.5);
            poly(x, [[86, 66], [106, 66], [104, 100], [88, 100]], '#9aa0a8', 1.2);
            line(x, [[84, 76], [66, 70]], 4, '#f4c6a0');
            poly(x, [[60, 62], [72, 66], [68, 74], [58, 70]], '#6a5a4a', 1);
            line(x, [[60, 70], [52, 84]], 2, '#4aa0ff');
            line(x, [[56, 70], [46, 86]], 2, '#4aa0ff');
        });
        prop(scene, 'pr_karta', 50, 36, x => { poly(x, [[4, 6], [44, 2], [46, 30], [6, 32]], '#e8d8a8', 2); line(x, [[12, 24], [20, 16], [30, 20], [38, 12]], 1.4, '#8a5a30'); });
        prop(scene, 'pr_rupa', 120, 40, x => { oval(x, 60, 20, 54, 16, '#5a3a20', 2); oval(x, 60, 22, 40, 10, '#2a1a10', 0); });
        prop(scene, 'pr_lonac', 60, 50, x => { x.save(); x.scale(0.85, 0.85); ICONS.lonac(x); x.restore(); });
        prop(scene, 'pr_gruntovnica', 70, 30, x => { poly(x, [[8, 4], [62, 2], [66, 22], [4, 26]], '#6a2a1a', 2); line(x, [[14, 8], [58, 6]], 1.4, '#e8c050'); line(x, [[12, 20], [60, 18]], 1.4, '#e8c050'); });
        prop(scene, 'pr_skela', 300, 90, x => {
            poly(x, [[10, 30], [290, 30], [270, 70], [30, 70]], '#8a5a30', 2.5);
            for (let i = 1; i < 10; i++) line(x, [[10 + i * 28, 30], [30 + i * 24, 70]], 1.5, '#5a3418');
            poly(x, [[30, 70], [270, 70], [264, 86], [36, 86]], '#5a3418', 2);
            rect(x, 40, 4, 8, 28, '#6a3e20', 1.5); rect(x, 250, 4, 8, 28, '#6a3e20', 1.5);
            line(x, [[44, 8], [254, 8]], 3, '#c8a870');
        });
        prop(scene, 'pr_bager', 300, 230, x => {
            // a yellow excavator: tracks, cab, boom and bucket
            poly(x, [[30, 190], [230, 190], [250, 210], [230, 228], [30, 228], [12, 210]], '#3a3a3a', 2.5);
            for (let i = 0; i < 8; i++) oval(x, 40 + i * 26, 210, 9, 9, '#6a6a6a', 1.5);
            poly(x, [[40, 120], [210, 120], [214, 190], [36, 190]], '#f2c020', 2.5);
            poly(x, [[60, 60], [150, 60], [160, 120], [60, 120]], '#f2c020', 2.5);
            poly(x, [[72, 70], [140, 70], [146, 112], [72, 112]], 'rgba(170,210,240,0.85)', 2);
            text(x, 'KOMBINAT', 126, 154, 16, '#2a1a14');
            line(x, [[200, 130], [262, 40], [292, 120]], 18, INK);
            line(x, [[200, 130], [262, 40], [292, 120]], 12, '#f2c020');
            poly(x, [[272, 116], [298, 110], [298, 150], [268, 146]], '#6a6a6a', 2.5);
            rect(x, 20, 140, 22, 10, '#3a3a3a', 1.5);
        });
        prop(scene, 'pr_mjehur', 40, 40, x => oval(x, 20, 20, 14, 14, 'rgba(220,240,255,0.5)', 2, '#ffffff'));
    }

    function build(scene) {
        buildPeople(scene);
        buildDog(scene);
        buildIcons(scene);
        buildProps(scene);
    }

    return { build, canvas, rng, shade, poly, oval, rect, line, vgrad, text, flower, seg, limb, INK, CHARS, FW, FH, FOOT };
})();
