// High-resolution procedural art. Every fighter is a skeleton (joint coordinates per pose, in world
// units) painted with tapered limbs, cel-shaded gradients and ink outlines at RES pixels per unit.
// The game runs in world units (320 x 240 visible) and the camera zooms by RES, so a texture
// pixel maps 1:1 to a screen pixel at the native 1024 x 768.
const RES = 3.2;

const Sprites = (() => {
    const BW = 60, BH = 68, FEET = 65;   // frame size in units at scale 1; feet sit at y = 62 in pose space
    const INK = '#170e16';
    const LIGHT = [-0.55, -0.83];        // light comes from the upper left

    // Poses, facing right. H hip, N neck, HD head (defaults to N + (1,-7)), BE/BH back elbow/hand,
    // FE/FH front elbow/hand, BK/BF back knee/foot, FK/FF front knee/foot.
    // BS/FS shoulders default to N + (-2,3) / N + (2,3). wa = held-weapon angle in degrees.
    const LEGS = { BK: [20, 51], BF: [17, 62], FK: [29, 51], FF: [31, 62] };
    const POSES = {
        idle:    { H: [24, 40], N: [25, 21], BE: [21, 31], BH: [27, 32], FE: [31, 30], FH: [35, 25], ...LEGS, wa: -70 },
        ready:   { H: [23, 40], N: [23, 21], BE: [20, 31], BH: [26, 31], FE: [21, 28], FH: [17, 23], ...LEGS, wa: -140 },
        walk1:   { H: [24, 40], N: [25, 21], BE: [20, 31], BH: [21, 38], FE: [29, 31], FH: [33, 36],
                   BK: [22, 51], BF: [16, 61], FK: [28, 50], FF: [33, 62], wa: -60 },
        walk2:   { H: [24, 39], N: [25, 20], BE: [22, 30], BH: [25, 37], FE: [27, 30], FH: [29, 37],
                   BK: [23, 50], BF: [22, 62], FK: [26, 50], FF: [27, 62], wa: -60 },
        walk3:   { H: [24, 40], N: [25, 21], BE: [24, 31], BH: [28, 37], FE: [24, 31], FH: [21, 37],
                   BK: [27, 50], BF: [32, 62], FK: [21, 51], FF: [16, 61], wa: -60 },
        punch1:  { H: [24, 40], N: [26, 21], FE: [33, 23], FH: [41, 23], BE: [21, 30], BH: [26, 31],
                   BK: [19, 51], BF: [16, 62], FK: [30, 51], FF: [33, 62], wa: 0 },
        punch2:  { H: [24, 40], N: [27, 21], BE: [32, 24], BH: [40, 22], FE: [30, 30], FH: [32, 26],
                   BK: [19, 51], BF: [15, 62], FK: [30, 51], FF: [33, 62], wa: -20 },
        punch3:  { H: [25, 40], N: [27, 20], FE: [33, 24], FH: [35, 11], BE: [22, 30], BH: [24, 34],
                   BK: [20, 51], BF: [17, 62], FK: [30, 50], FF: [32, 62], wa: -80 },
        kick1:   { H: [22, 40], N: [19, 22], FE: [24, 28], FH: [28, 25], BE: [16, 29], BH: [19, 33],
                   BK: [21, 51], BF: [20, 62], FK: [33, 38], FF: [44, 37], wa: -50 },
        kick2:   { H: [22, 40], N: [18, 23], FE: [24, 28], FH: [27, 32], BE: [13, 26], BH: [8, 28],
                   BK: [21, 51], BF: [19, 62], FK: [32, 34], FF: [43, 24], wa: -40 },
        jump:    { H: [24, 38], N: [25, 20], FE: [30, 22], FH: [33, 16], BE: [21, 24], BH: [22, 17],
                   BK: [19, 45], BF: [15, 52], FK: [31, 42], FF: [28, 50], wa: -90 },
        jumpkick:{ H: [22, 38], N: [18, 22], FE: [24, 27], FH: [28, 24], BE: [14, 26], BH: [10, 30],
                   BK: [18, 47], BF: [12, 43], FK: [32, 43], FF: [43, 47], wa: -40 },
        spin:    { H: [24, 38], N: [25, 20], FE: [31, 24], FH: [37, 26], BE: [19, 25], BH: [12, 27],
                   BK: [18, 45], BF: [13, 52], FK: [34, 38], FF: [45, 37], wa: 10 },
        hurt:    { H: [25, 40], N: [21, 22], HD: [18, 15], FE: [28, 28], FH: [32, 32], BE: [18, 30], BH: [15, 34],
                   ...LEGS, wa: -100 },
        dazed:   { H: [24, 42], N: [32, 30], HD: [37, 31], FE: [33, 37], FH: [33, 43], BE: [29, 37], BH: [28, 44],
                   BK: [21, 52], BF: [18, 62], FK: [27, 52], FF: [29, 62], wa: 80 },
        fall:    { H: [28, 44], N: [16, 36], HD: [10, 33], FE: [14, 29], FH: [10, 24], BE: [19, 43], BH: [13, 47],
                   BK: [35, 45], BF: [42, 42], FK: [36, 40], FF: [43, 34], wa: -120 },
        down:    { H: [28, 57], N: [14, 56], HD: [8, 55], FE: [17, 59], FH: [22, 60], BE: [13, 60], BH: [9, 61],
                   BK: [35, 57], BF: [43, 60], FK: [36, 54], FF: [44, 58], wa: 180 },
        crouch:  { H: [24, 50], N: [27, 33], HD: [29, 26], FE: [31, 42], FH: [33, 48], BE: [23, 40], BH: [25, 47],
                   BK: [18, 55], BF: [16, 62], FK: [31, 53], FF: [32, 62], wa: 20 },
        grab:    { H: [24, 40], N: [26, 22], FE: [33, 28], FH: [38, 30], BE: [31, 30], BH: [37, 32], ...LEGS, wa: 0 },
        knee:    { H: [24, 40], N: [26, 22], FE: [32, 30], FH: [37, 34], BE: [30, 31], BH: [36, 35],
                   BK: [22, 51], BF: [20, 62], FK: [33, 37], FF: [31, 48], wa: 0 },
        throw:   { H: [24, 40], N: [19, 23], HD: [17, 16], FE: [21, 14], FH: [16, 9], BE: [20, 15], BH: [15, 11],
                   BK: [22, 51], BF: [19, 62], FK: [30, 51], FF: [34, 62], wa: -150 },
        swing:   { H: [25, 40], N: [28, 21], FE: [34, 25], FH: [39, 30], BE: [30, 28], BH: [37, 31],
                   BK: [19, 51], BF: [15, 62], FK: [31, 51], FF: [34, 62], wa: 25 },
        elbow:   { H: [24, 40], N: [23, 21], HD: [22, 14], FE: [27, 29], FH: [30, 26], BE: [13, 26], BH: [19, 25],
                   BK: [18, 51], BF: [14, 62], FK: [28, 51], FF: [30, 62], wa: -70 },
        win:     { H: [24, 40], N: [25, 21], FE: [31, 15], FH: [33, 7], BE: [19, 15], BH: [17, 7],
                   BK: [20, 51], BF: [17, 62], FK: [28, 51], FF: [30, 62], wa: -90 },
    };
    const FRAME_NAMES = Object.keys(POSES);

    // ---- colour helpers -------------------------------------------------------------------
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const mul = (c, k) => c.map(v => Math.max(0, Math.min(255, v * k)));
    const mix = (c, d, t) => c.map((v, i) => v + (d[i] - v) * t);
    function pal(h, k = 1) {
        const c = mul(hex(h), k);
        return { l: css(mix(c, [255, 250, 235], 0.32)), b: css(c), s: css(mix(mul(c, 0.62), [40, 10, 60], 0.12)),
                 d: css(mul(c, 0.42)), raw: c };
    }

    // ---- primitives (all coordinates in units; the context is scaled by RES) ---------------------
    function celFill(ctx, cx, cy, nx, ny, r, p) {
        if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
        const g = ctx.createLinearGradient(cx + nx * r, cy + ny * r, cx - nx * r, cy - ny * r);
        g.addColorStop(0, p.l); g.addColorStop(0.26, p.l); g.addColorStop(0.3, p.b);
        g.addColorStop(0.62, p.b); g.addColorStop(0.68, p.s); g.addColorStop(1, p.s);
        return g;
    }
    function capsulePath(ctx, a, b, r1, r2) {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        ctx.beginPath();
        ctx.arc(a[0], a[1], r1, ang + Math.PI / 2, ang - Math.PI / 2 + Math.PI * 2);
        ctx.arc(b[0], b[1], r2, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.closePath();
    }
    function capsule(ctx, a, b, r1, r2, p, ink = 0.75) {
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 0.001;
        capsulePath(ctx, a, b, r1, r2);
        ctx.fillStyle = celFill(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -dy / L, dx / L, Math.max(r1, r2), p);
        ctx.fill();
        if (ink) { ctx.lineWidth = ink; ctx.strokeStyle = INK; ctx.stroke(); }
    }
    // Outline only around the union of several shapes: stroke wide first, then fill over it.
    function blob(ctx, pathFn, fill, ink = 0.75) {
        pathFn(); ctx.lineWidth = ink * 2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
        pathFn(); ctx.fillStyle = fill; ctx.fill();
    }
    function line(ctx, pts, w, col, cap = 'round') {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke();
    }
    const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    function norm(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; }

    // ---- head ---------------------------------------------------------------------------------
    function drawHead(ctx, c, ang, P, def) {
        ctx.save();
        ctx.translate(c[0], c[1]); ctx.rotate(ang);
        const skin = P.skin, hair = P.hair;
        const hg = ctx.createLinearGradient(-4, -5, 4, 5);
        hg.addColorStop(0, skin.l); hg.addColorStop(0.35, skin.b); hg.addColorStop(0.75, skin.b); hg.addColorStop(1, skin.s);

        // ponytail goes behind the head
        if (def.hair === 'pony') {
            blob(ctx, () => {
                ctx.beginPath(); ctx.moveTo(-3.5, -3.5);
                ctx.bezierCurveTo(-9, -4, -10, 3, -8.5, 10);
                ctx.bezierCurveTo(-7.5, 6, -6, 2, -3, 0); ctx.closePath();
            }, celFill(ctx, -6, 2, 1, 0, 3, hair));
        }
        // skull + jaw as one outlined shape
        blob(ctx, () => {
            ctx.beginPath();
            ctx.ellipse(-0.2, -0.6, 4.4, 4.9, 0, 0, Math.PI * 2);
            ctx.moveTo(4.6, 2.6); ctx.ellipse(1.6, 2.4, 3, 2.4, 0.15, 0, Math.PI * 2);
        }, hg);
        // nose
        blob(ctx, () => { ctx.beginPath(); ctx.moveTo(3.6, -0.8); ctx.lineTo(5.3, 1.1); ctx.lineTo(3.8, 1.5); ctx.closePath(); }, skin.b, 0.4);
        // ear
        ctx.beginPath(); ctx.ellipse(-1.3, 0.4, 1.1, 1.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.s; ctx.fill(); ctx.lineWidth = 0.4; ctx.strokeStyle = INK; ctx.stroke();
        // cheek shade + jaw line
        ctx.beginPath(); ctx.ellipse(0.6, 2.6, 2.8, 1.6, 0.2, 0, Math.PI); ctx.fillStyle = css(mul(skin.raw, 0.75), 0.45); ctx.fill();
        if (def.hair !== 'mask') {
            // eye
            ctx.beginPath(); ctx.ellipse(2.3, -0.6, 0.95, 0.6, 0, 0, Math.PI * 2); ctx.fillStyle = '#f4f0e8'; ctx.fill();
            ctx.beginPath(); ctx.arc(2.75, -0.55, 0.48, 0, Math.PI * 2); ctx.fillStyle = def.eyes || '#20140c'; ctx.fill();
            if (def.eyes) { ctx.save(); ctx.shadowColor = def.eyes; ctx.shadowBlur = 6; ctx.fill(); ctx.restore(); }
            line(ctx, [[1.0, -1.9], [3.6, -1.7]], 0.75, hair.d);
            line(ctx, [[2.4, 2.75], [3.8, 2.55]], 0.35, css(mul(skin.raw, 0.45)));
        }
        // hair styles
        const hairFill = celFill(ctx, 0, -4, 0, 1, 4, hair);
        switch (def.hair) {
            case 'pomp':
                blob(ctx, () => {
                    ctx.beginPath(); ctx.moveTo(-4.6, 2.5);
                    ctx.bezierCurveTo(-5.6, -3, -4, -6.5, 0, -6.6);
                    ctx.bezierCurveTo(3, -7.8, 5.5, -7.4, 6, -5.6);
                    ctx.bezierCurveTo(4.6, -5.4, 3.5, -4.6, 3.2, -3.3);
                    ctx.bezierCurveTo(1.5, -4, -0.5, -3.6, -1.6, -2.6);
                    ctx.bezierCurveTo(-2.4, -1.2, -2.6, 0.8, -2.8, 2.6); ctx.closePath();
                }, hairFill);
                line(ctx, [[-2.5, -5], [1, -6.2], [4.6, -6.4]], 0.5, hair.l);
                line(ctx, [[-3.6, -3], [-1.5, -4.8]], 0.35, hair.d);
                break;
            case 'short':
                blob(ctx, () => {
                    ctx.beginPath(); ctx.moveTo(-4.7, 1.8);
                    ctx.bezierCurveTo(-5.4, -4, -2, -6.3, 1, -5.9);
                    ctx.bezierCurveTo(3.4, -5.6, 4.6, -4.4, 4.2, -3);
                    ctx.bezierCurveTo(2, -3.6, 0, -3.2, -1.8, -2.2);
                    ctx.lineTo(-2.6, 1.8); ctx.closePath();
                }, hairFill);
                line(ctx, [[-2, -4.6], [1.5, -5.2]], 0.45, hair.l);
                break;
            case 'mohawk':
                ctx.beginPath(); ctx.ellipse(-0.6, -2.4, 4, 2.8, 0, Math.PI, Math.PI * 2); ctx.fillStyle = css(mul(skin.raw, 0.8), 0.6); ctx.fill();
                blob(ctx, () => {
                    ctx.beginPath(); ctx.moveTo(-4, -2.6);
                    const tips = [[-4.6, -6.5], [-2.8, -4.8], [-2.2, -9.5], [-0.6, -5.4], [0.6, -10.2], [1.6, -5.4], [3.4, -9], [3, -4.2]];
                    for (const t of tips) ctx.lineTo(t[0], t[1]);
                    ctx.lineTo(2.2, -3.6); ctx.lineTo(-1.5, -4.2); ctx.closePath();
                }, celFill(ctx, 0, -7, 1, 0, 3, hair));
                break;
            case 'pony':
                blob(ctx, () => {
                    ctx.beginPath(); ctx.moveTo(-4.6, 2);
                    ctx.bezierCurveTo(-5.6, -4.5, -1.5, -6.8, 1.5, -6);
                    ctx.bezierCurveTo(4, -5.4, 5, -3.6, 4.6, -1.8);
                    ctx.bezierCurveTo(3.4, -3.4, 1.8, -3.6, 0.4, -3.4);
                    ctx.bezierCurveTo(-1, -2.4, -2.4, -0.5, -2.6, 2); ctx.closePath();
                }, hairFill);
                ctx.beginPath(); ctx.ellipse(-4.3, -3, 1.2, 1, 0, 0, Math.PI * 2); ctx.fillStyle = '#f0d040'; ctx.fill();
                line(ctx, [[-2.5, -5.2], [1.6, -5.6]], 0.45, hair.l);
                break;
            case 'bald':
                ctx.beginPath(); ctx.ellipse(-1.4, -4, 1.8, 0.8, -0.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,240,0.55)'; ctx.fill();
                line(ctx, [[0.6, -1.9], [3.6, -1.5]], 1.0, '#1a0e08');
                break;
            case 'mask':
                blob(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -0.8, 5, 5.6, 0, 0, Math.PI * 2); ctx.moveTo(4.8, 2.4); ctx.ellipse(1.8, 2.4, 3.2, 2.6, 0.15, 0, Math.PI * 2); },
                     celFill(ctx, 0, 0, 1, 0.3, 5, hair));
                ctx.save(); ctx.shadowColor = def.eyes || '#ff3030'; ctx.shadowBlur = 10;
                ctx.fillStyle = def.eyes || '#ff3030';
                ctx.beginPath(); ctx.ellipse(2.6, -0.8, 1.3, 0.55, -0.15, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(-0.6, -0.8, 0.9, 0.5, 0.15, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                for (let i = 0; i < 4; i++) line(ctx, [[0.8 + i * 0.9, 2.2], [0.8 + i * 0.9, 3.6]], 0.3, hair.d);
                line(ctx, [[-4, -3.2], [4.5, -3.6]], 0.4, hair.l);
                break;
        }
        ctx.restore();
    }

    // ---- full character -----------------------------------------------------------------------
    function drawChar(ctx, def, pose, s) {
        const P = { skin: pal(def.skin), hair: pal(def.hairColor), top: pal(def.top), pants: pal(def.pants),
                    shoes: pal(def.shoes), belt: pal(def.belt || '#2a1a10') };
        const D = { skin: pal(def.skin, 0.72), top: pal(def.top, 0.72), pants: pal(def.pants, 0.72), shoes: pal(def.shoes, 0.72) };
        const b = def.bulk || 1, lb = Math.min(b, 1.3);
        const sc = p => [p[0] * s, p[1] * s];
        const N = sc(pose.N), H = sc(pose.H);
        const HD = pose.HD ? sc(pose.HD) : [N[0] + 1 * s, N[1] - 7 * s];
        const j = k => sc(pose[k]);
        const u = norm(N, H), pb = [u[1], -u[0]];          // pb points to the back side when upright
        const BS = add(N, add([u[0] * 3, u[1] * 3], pb, 4.4 * b * 0.8), s * 0.9);
        const FS = add(N, add([u[0] * 3, u[1] * 3], pb, -4.4 * b * 0.8), s * 0.9);
        const hipB = add(H, pb, 2.4 * s * lb), hipF = add(H, pb, -2.4 * s * lb);
        const sleeves = def.style === 'shirt';

        function arm(sh, el, ha, dark) {
            const sk = dark ? D.skin : P.skin, tp = dark ? D.top : P.top;
            capsule(ctx, sh, el, 3.3 * s * b, 2.6 * s * b, sleeves ? tp : sk);
            if (!sleeves) {   // bicep bulge
                ctx.beginPath(); ctx.ellipse(...lerp(sh, el, 0.45), 1.5 * s * b, 0.8 * s * b, Math.atan2(el[1] - sh[1], el[0] - sh[0]), 0, Math.PI * 2);
                ctx.fillStyle = sk.l; ctx.fill();
            }
            capsule(ctx, el, ha, 2.75 * s * b, 2.2 * s * b, sk);
            if (def.bracers) capsule(ctx, lerp(el, ha, 0.45), lerp(el, ha, 0.85), 2.9 * s * b, 2.5 * s * b, pal(def.bracers, dark ? 0.72 : 1));
            const fist = def.gloves ? pal(def.gloves, dark ? 0.72 : 1) : sk;
            const d = norm(el, ha);
            const fc = add(ha, d, 0.6 * s);
            ctx.beginPath(); ctx.ellipse(fc[0], fc[1], 2.8 * s * b, 2.45 * s * b, Math.atan2(d[1], d[0]), 0, Math.PI * 2);
            ctx.fillStyle = celFill(ctx, fc[0], fc[1], -d[1], d[0], 2.7 * s * b, fist); ctx.fill();
            ctx.lineWidth = 0.7; ctx.strokeStyle = INK; ctx.stroke();
            line(ctx, [add(fc, [-d[1], d[0]], -1.2 * s * b), add(add(fc, d, 1 * s), [-d[1], d[0]], 0.2 * s)], 0.35, fist.d);
        }
        function leg(hp, kn, ft, dark) {
            const pn = dark ? D.pants : P.pants, sh = dark ? D.shoes : P.shoes;
            capsule(ctx, hp, kn, 4.4 * s * lb, 3.6 * s * lb, pn);
            capsule(ctx, kn, ft, 3.5 * s * lb, 2.7 * s * lb, pn);
            line(ctx, [lerp(hp, kn, 0.5), lerp(hp, kn, 0.8)], 0.3, pn.s);   // fabric fold
            const dx = ft[0] - kn[0], dy = ft[1] - kn[1];
            const grounded = dy > Math.abs(dx) * 1.5;
            let a, c;
            if (grounded) { a = [ft[0] - 1.6 * s, ft[1] - 0.6 * s]; c = [ft[0] + 3.6 * s, ft[1] - 0.2 * s]; }
            else { const L = Math.hypot(dx, dy) || 1; a = add(ft, [dx / L, dy / L], -1 * s); c = add(ft, [dx / L, dy / L], 3.4 * s); }
            capsule(ctx, a, c, 2.4 * s, 2.0 * s, sh);
            line(ctx, [add(a, [0, 1.4 * s]), add(c, [0, 1.2 * s])], 0.5, grounded ? sh.d : 'rgba(0,0,0,0)');
        }
        function torso() {
            const sw = 7.8 * s * b, cw = 7.4 * s * b, ww = 5.4 * s * b, hw = 5.9 * s * lb;
            const nT = add(N, u, 1.2 * s), ch = add(N, u, 5 * s), wa = add(H, u, -3 * s);
            const pts = [add(nT, pb, sw), add(ch, pb, cw), add(wa, pb, ww), add(H, pb, hw), add(H, pb, -hw), add(wa, pb, -ww), add(ch, pb, -cw), add(nT, pb, -sw)];
            const path = () => {
                ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
                ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
                ctx.lineTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[4][0], pts[4][1]); ctx.lineTo(pts[5][0], pts[5][1]);
                ctx.quadraticCurveTo(pts[6][0], pts[6][1], pts[7][0], pts[7][1]);
                ctx.quadraticCurveTo(N[0], N[1] - 1 * s, pts[0][0], pts[0][1]); ctx.closePath();
            };
            const skinTorso = def.style === 'bare' || def.style === 'vest';
            const tp = skinTorso ? P.skin : P.top;
            const mid = lerp(N, H, 0.5);
            blob(ctx, path, celFill(ctx, mid[0], mid[1], pb[0], pb[1], sw, tp));
            const front = (k, t) => add(lerp(N, H, t), pb, -k * s * b);
            if (skinTorso) {
                // pecs and abs
                ctx.beginPath(); ctx.moveTo(...front(0.5, 0.28)); ctx.quadraticCurveTo(...front(4.4, 0.36), ...front(5.4, 0.22));
                ctx.lineWidth = 0.45; ctx.strokeStyle = P.skin.d; ctx.stroke();
                for (let i = 0; i < 3; i++) line(ctx, [front(1.4, 0.5 + i * 0.12), front(3.6, 0.5 + i * 0.12)], 0.32, css(mul(P.skin.raw, 0.55), 0.7));
                line(ctx, [front(2.5, 0.45), front(2.5, 0.85)], 0.3, css(mul(P.skin.raw, 0.55), 0.6));
            }
            if (def.style === 'vest') {
                ctx.save(); path(); ctx.clip();
                const vb = [add(nT, pb, sw + 1), add(ch, pb, cw * 0.15), add(H, pb, hw * 0.3), add(H, pb, hw + 1)];
                ctx.beginPath(); vb.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
                ctx.fillStyle = celFill(ctx, mid[0], mid[1], pb[0], pb[1], sw, P.top); ctx.fill();
                ctx.lineWidth = 0.6; ctx.strokeStyle = INK; ctx.stroke();
                const vf = [add(nT, pb, -sw - 1), add(ch, pb, -cw * 0.62), add(H, pb, -hw * 0.75), add(H, pb, -hw - 1)];
                ctx.beginPath(); vf.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.restore();
            } else if (def.style === 'tank') {
                ctx.save(); path(); ctx.clip();
                ctx.beginPath(); ctx.ellipse(...add(N, u, 1.2 * s), 3 * s, 2.2 * s, Math.atan2(u[1], u[0]), 0, Math.PI * 2);
                ctx.fillStyle = P.skin.b; ctx.fill(); ctx.lineWidth = 0.5; ctx.strokeStyle = INK; ctx.stroke();
                line(ctx, [front(0, 0.55), front(4, 0.62)], 0.3, P.top.s);
                ctx.restore();
            } else if (def.style === 'shirt') {
                line(ctx, [add(N, pb, 2 * s), add(N, u, 2.6 * s), add(N, pb, -2.4 * s)], 0.9, P.top.d);
                for (let i = 0; i < 4; i++) { const q = front(0.8, 0.25 + i * 0.17); ctx.beginPath(); ctx.arc(q[0], q[1], 0.4, 0, 7); ctx.fillStyle = '#c8b060'; ctx.fill(); }
            }
            if (def.straps) {
                ctx.save(); path(); ctx.clip();
                line(ctx, [add(nT, pb, -sw * 0.6), add(H, pb, hw * 0.8)], 2.2 * s, INK, 'butt');
                line(ctx, [add(nT, pb, -sw * 0.6), add(H, pb, hw * 0.8)], 1.4 * s, def.straps, 'butt');
                ctx.restore();
            }
            // belt
            const b0 = add(H, u, -2.2 * s), b1 = add(H, u, 0.6 * s);
            ctx.beginPath();
            [add(b0, pb, hw + 0.6), add(b1, pb, hw + 0.6), add(b1, pb, -hw - 0.6), add(b0, pb, -hw - 0.6)]
                .forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
            ctx.closePath(); ctx.fillStyle = celFill(ctx, H[0], H[1], u[0], u[1], 1.4 * s, P.belt); ctx.fill();
            ctx.lineWidth = 0.6; ctx.strokeStyle = INK; ctx.stroke();
            const bk = add(lerp(b0, b1, 0.5), pb, -hw * 0.55);
            ctx.fillStyle = '#f0d050'; ctx.fillRect(bk[0] - 1.1 * s, bk[1] - 1.1 * s, 2.2 * s, 2.2 * s);
            ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 0.35; ctx.strokeRect(bk[0] - 1.1 * s, bk[1] - 1.1 * s, 2.2 * s, 2.2 * s);
        }

        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        arm(BS, j('BE'), j('BH'), true);
        leg(hipB, j('BK'), j('BF'), true);
        leg(hipF, j('FK'), j('FF'), false);
        torso();
        // neck + head
        capsule(ctx, add(N, u, 1.5 * s), lerp(N, HD, 0.55), 2.5 * s * b, 2.2 * s * b, P.skin, 0.6);
        const hdv = [HD[0] - N[0], HD[1] - N[1]];
        ctx.save(); ctx.translate(HD[0], HD[1]); ctx.scale(s * Math.min(b, 1.15), s * Math.min(b, 1.15)); ctx.translate(-HD[0], -HD[1]);
        drawHead(ctx, HD, Math.atan2(hdv[0], -hdv[1]) - 0.14, P, def);
        ctx.restore();
        arm(FS, j('FE'), j('FH'), false);
    }

    // ---- textures -----------------------------------------------------------------------------
    function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

    function buildCharacter(scene, def) {
        const s = def.scale || 1;
        const fwU = BW * s * (def.bulk > 1.2 ? 1.08 : 1), fhU = BH * s;
        const fw = Math.ceil(fwU * RES), fh = Math.ceil(fhU * RES);
        const cols = 8, rows = Math.ceil(FRAME_NAMES.length / cols);
        const sheet = makeCanvas(fw * cols, fh * rows), ctx = sheet.getContext('2d');
        const xoff = (fwU - 48 * s) / 2, yoff = fhU - FEET * s;
        FRAME_NAMES.forEach((name, i) => {
            const fx = (i % cols) * fw, fy = Math.floor(i / cols) * fh;
            ctx.save();
            ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
            ctx.setTransform(RES, 0, 0, RES, fx + xoff * RES, fy + yoff * RES);
            drawChar(ctx, def, POSES[name], s);
            ctx.restore();
        });
        if (scene.textures.exists(def.key)) scene.textures.remove(def.key);
        const tex = scene.textures.addCanvas(def.key, sheet);
        FRAME_NAMES.forEach((name, i) => tex.add(name, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh));
        // Sprites use origin (0.5, originY) so the feet (pose y = 62) land on the ground line.
        def.originY = (yoff + 62 * s) / fhU;
        def.hands = {};
        for (const name of FRAME_NAMES) {
            const p = POSES[name];
            def.hands[name] = { x: (p.FH[0] - 24) * s, y: (62 - p.FH[1]) * s, a: p.wa || 0 };
        }
    }

    // Draws `fn(ctx)` in unit coordinates into a w x h (units) texture.
    function addTex(scene, key, w, h, fn) {
        const c = makeCanvas(w * RES, h * RES), ctx = c.getContext('2d');
        ctx.scale(RES, RES); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        fn(ctx);
        if (scene.textures.exists(key)) scene.textures.remove(key);
        return scene.textures.addCanvas(key, c);
    }

    function buildProps(scene) {
        addTex(scene, 'blob', 30, 9, x => {
            const g = x.createRadialGradient(15, 4.5, 0, 15, 4.5, 15);
            g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.7, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            x.save(); x.scale(1, 0.3); x.beginPath(); x.arc(15, 15, 15, 0, 7); x.fillStyle = g; x.fill(); x.restore();
        });
        addTex(scene, 'bat', 24, 7, x => {
            x.beginPath(); x.moveTo(1, 2.6); x.lineTo(9, 2.3); x.quadraticCurveTo(16, 1, 22.5, 1.4);
            x.quadraticCurveTo(23.6, 3.5, 22.5, 5.6); x.quadraticCurveTo(16, 6, 9, 4.7); x.lineTo(1, 4.4); x.closePath();
            x.fillStyle = celFill(x, 12, 3.5, 0, 1, 2.5, pal('#c08848')); x.fill(); x.lineWidth = 0.6; x.strokeStyle = INK; x.stroke();
            x.fillStyle = '#3a2a24'; x.fillRect(1, 2.4, 5, 2.2);
            line(x, [[10, 2.7], [21, 2.2]], 0.4, 'rgba(255,240,200,0.7)');
        });
        addTex(scene, 'knife', 15, 6, x => {
            x.beginPath(); x.moveTo(5.5, 2); x.lineTo(13, 2.2); x.lineTo(14.5, 3.4); x.lineTo(5.5, 4.2); x.closePath();
            const g = x.createLinearGradient(0, 2, 0, 4.2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c8d0dc'); g.addColorStop(1, '#7a8494');
            x.fillStyle = g; x.fill(); x.lineWidth = 0.5; x.strokeStyle = INK; x.stroke();
            capsule(x, [1.2, 3.1], [4.6, 3.1], 1.1, 1.1, pal('#5a3020'), 0.5);
            x.fillStyle = '#b0a080'; x.fillRect(4.6, 1.2, 1, 3.8);
        });
        addTex(scene, 'whip', 62, 8, x => {
            capsule(x, [1, 4], [5, 4], 1.4, 1.2, pal('#3a1a10'), 0.5);
            x.beginPath(); x.moveTo(5, 4);
            for (let i = 5; i <= 60; i += 1) x.lineTo(i, 4 + Math.sin(i / 6) * 1.6 * (i / 60));
            x.lineWidth = 1.1; x.strokeStyle = INK; x.stroke(); x.lineWidth = 0.6; x.strokeStyle = '#8a4428'; x.stroke();
        });
        addTex(scene, 'drum', 20, 26, x => {
            const g = x.createLinearGradient(1, 0, 19, 0);
            g.addColorStop(0, '#2a5a7a'); g.addColorStop(0.25, '#6ab0d0'); g.addColorStop(0.4, '#3a80a8'); g.addColorStop(1, '#123050');
            x.beginPath(); x.moveTo(1, 3); x.lineTo(1, 23); x.ellipse(10, 23, 9, 2.4, 0, Math.PI, 0, true); x.lineTo(19, 3); x.closePath();
            x.fillStyle = g; x.fill(); x.lineWidth = 0.7; x.strokeStyle = INK; x.stroke();
            for (const yy of [9, 17]) { x.beginPath(); x.ellipse(10, yy, 9, 2.2, 0, 0, Math.PI); x.lineWidth = 1; x.strokeStyle = '#0e2a40'; x.stroke(); }
            x.beginPath(); x.ellipse(10, 3, 9, 2.4, 0, 0, 7); x.fillStyle = '#4a90b8'; x.fill(); x.lineWidth = 0.7; x.strokeStyle = INK; x.stroke();
            x.beginPath(); x.ellipse(10, 3, 6, 1.4, 0, 0, 7); x.fillStyle = '#2a6088'; x.fill();
            x.fillStyle = 'rgba(120,60,20,0.5)'; x.fillRect(3, 12, 2, 6);
        });
        addTex(scene, 'crate', 28, 26, x => {
            const wood = pal('#a87038');
            x.fillStyle = celFill(x, 14, 13, 1, 0.3, 14, wood); x.fillRect(1, 1, 26, 24);
            for (let yy = 4; yy < 24; yy += 4) line(x, [[1, yy], [27, yy]], 0.25, 'rgba(70,40,15,0.5)');
            for (const [a, b, c, d] of [[1, 1, 27, 4], [1, 22, 27, 25], [1, 1, 4, 25], [24, 1, 27, 25]]) { x.fillStyle = wood.s; x.fillRect(a, b, c - a, d - b); }
            line(x, [[4, 4], [24, 22]], 3, wood.s, 'butt'); line(x, [[4, 4], [24, 22]], 0.4, wood.d);
            x.lineWidth = 0.7; x.strokeStyle = INK; x.strokeRect(1, 1, 26, 24);
            for (const [px, py] of [[2.5, 2.5], [25.5, 2.5], [2.5, 23.5], [25.5, 23.5]]) { x.beginPath(); x.arc(px, py, 0.5, 0, 7); x.fillStyle = '#d0d0d0'; x.fill(); }
        });
        // hit spark: 3 frames of a burst with glow
        const tex = addTex(scene, 'spark', 26 * 3, 26, x => {
            for (let f = 0; f < 3; f++) {
                const cx = f * 26 + 13, cy = 13, R = [7, 12, 10][f];
                const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
                g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, ['rgba(255,250,200,0.9)', 'rgba(255,220,90,0.8)', 'rgba(255,140,40,0.5)'][f]);
                g.addColorStop(1, 'rgba(255,120,30,0)');
                x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
                x.beginPath();
                for (let a = 0; a < 16; a++) {
                    const ang = a * Math.PI / 8 + f * 0.3, L = a % 2 ? R * 0.35 : R * (a % 4 ? 0.8 : 1.05);
                    x.lineTo(cx + Math.cos(ang) * L, cy + Math.sin(ang) * L);
                }
                x.closePath(); x.fillStyle = ['#ffffff', '#fff6b0', '#ffc860'][f]; x.fill();
            }
        });
        for (let f = 0; f < 3; f++) tex.add(f, 0, Math.round(f * 26 * RES), 0, Math.round(26 * RES), Math.round(26 * RES));
        addTex(scene, 'dust', 18, 10, x => {
            for (const [cx, cy, r] of [[6, 6, 3.5], [10, 4.5, 4], [13, 6.5, 3]]) {
                const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
                g.addColorStop(0, 'rgba(220,210,190,0.8)'); g.addColorStop(1, 'rgba(220,210,190,0)');
                x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
            }
        });
    }

    return { buildCharacter, buildProps, POSES, makeCanvas, pal, celFill, capsule, line, INK };
})();

const CHARS = {
    billy:   { key: 'billy', name: 'BILLY', skin: '#f0b080', hairColor: '#7a4a1c', hair: 'pomp', top: '#2860d8', pants: '#1c3a90',
               shoes: '#202028', belt: '#f0d040', style: 'vest', bracers: '#2860d8', hp: 64, speed: 74 },
    jimmy:   { key: 'jimmy', name: 'JIMMY', skin: '#f0b080', hairColor: '#e8c050', hair: 'pomp', top: '#d02828', pants: '#8a1414',
               shoes: '#202028', belt: '#f0d040', style: 'vest', bracers: '#d02828', hp: 64, speed: 74 },
    williams:{ key: 'williams', name: 'WILLIAMS', skin: '#e8a878', hairColor: '#1c1418', hair: 'short', top: '#e8e8e0', pants: '#3858a0',
               shoes: '#5a3418', style: 'tank', hp: 30, speed: 54, score: 100, attacks: ['epunch', 'epunch', 'ekick'] },
    roper:   { key: 'roper', name: 'ROPER', skin: '#d89060', hairColor: '#e05010', hair: 'mohawk', top: '#7a4a20', pants: '#a02020',
               shoes: '#1a1a1a', style: 'vest', hp: 38, speed: 60, score: 150, attacks: ['epunch', 'ekick', 'ejumpkick'] },
    linda:   { key: 'linda', name: 'LINDA', skin: '#f4c098', hairColor: '#9a30c0', hair: 'pony', top: '#e04898', pants: '#282030',
               shoes: '#e04898', belt: '#101010', style: 'tank', hp: 28, speed: 70, score: 150, attacks: ['whip', 'whip', 'ekick'] },
    abobo:   { key: 'abobo', name: 'ABOBO', skin: '#a8683c', hairColor: '#2a1a10', hair: 'bald', top: '#a8683c', pants: '#3a6a30',
               shoes: '#2a1a10', style: 'bare', straps: '#202020', scale: 1.3, bulk: 1.45, hp: 90, speed: 40, score: 1000, heavy: true,
               attacks: ['bigpunch', 'bigpunch', 'slam'] },
    bolo:    { key: 'bolo', name: 'BOLO', skin: '#c88050', hairColor: '#202020', hair: 'mohawk', top: '#304050', pants: '#504030',
               shoes: '#101010', style: 'vest', scale: 1.3, bulk: 1.45, hp: 110, speed: 44, score: 1500, heavy: true,
               gloves: '#303030', attacks: ['bigpunch', 'slam', 'charge'] },
    burnov:  { key: 'burnov', name: 'BURNOV', skin: '#e8b090', hairColor: '#202028', hair: 'mask', top: '#202028', pants: '#3a2a50',
               shoes: '#101010', style: 'shirt', scale: 1.35, bulk: 1.5, hp: 140, speed: 46, score: 3000, heavy: true,
               eyes: '#ff3030', gloves: '#a02020', attacks: ['bigpunch', 'charge', 'slam'] },
    shadow:  { key: 'shadow', name: 'SHADOW', skin: '#3a3048', hairColor: '#14101c', hair: 'pomp', top: '#201830', pants: '#181424',
               shoes: '#0a0810', belt: '#a01818', style: 'vest', bracers: '#401830', eyes: '#ff2020', hp: 170, speed: 82,
               score: 10000, boss: true, attacks: ['epunch', 'ekick', 'ejumpkick', 'espin', 'ekick'] },
};
