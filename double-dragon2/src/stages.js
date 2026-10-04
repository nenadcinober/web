// Stage backgrounds in the style of Croatian naive painting (the Hlebine school of Podravina):
// flat bright colour, a high horizon, every leaf and roof tile painted on its own, thin dark
// outlines. Scenes are Podravina villages around 1970. Painted once into canvases at RES pixels
// per unit: a far layer that tiles horizontally, and a near layer as wide as the stage.
const GAME_W = 320, GAME_H = 240;
const FLOOR_TOP = 156, FLOOR_BOT = 232;

const Stages = (() => {
    const FAR_W = 640;
    const OUT = 'rgba(40,24,20,0.85)';

    function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
    function canvas(wU, hU) {
        const c = Sprites.makeCanvas(wU * RES, hU * RES), x = c.getContext('2d');
        x.scale(RES, RES); x.lineCap = 'round'; x.lineJoin = 'round';
        return [c, x];
    }
    const R = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    function vgrad(x, y0, y1, stops) {
        const g = x.createLinearGradient(0, y0, 0, y1);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        return g;
    }
    function glow(x, cx, cy, r, color, alpha = 1) {
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color.replace('A', alpha)); g.addColorStop(1, color.replace('A', 0));
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    function line(x, x0, y0, x1, y1, w, c) { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineWidth = w; x.strokeStyle = c; x.stroke(); }
    function poly(x, pts, fill, stroke = OUT, w = 0.4) {
        x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath();
        if (fill) { x.fillStyle = fill; x.fill(); }
        if (stroke) { x.lineWidth = w; x.strokeStyle = stroke; x.stroke(); }
    }
    function oval(x, cx, cy, rx, ry, fill, stroke = OUT, w = 0.35) {
        x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7);
        if (fill) { x.fillStyle = fill; x.fill(); }
        if (stroke) { x.lineWidth = w; x.strokeStyle = stroke; x.stroke(); }
    }
    function label(x, s, cx, cy, size, color, bg) {
        x.save(); x.font = `bold ${size}px Georgia, "Times New Roman", serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        if (bg) { const w = x.measureText(s).width + 6; poly(x, [[cx - w / 2, cy - size * 0.75], [cx + w / 2, cy - size * 0.75], [cx + w / 2, cy + size * 0.75], [cx - w / 2, cy + size * 0.75]], bg); }
        x.fillStyle = color; x.fillText(s, cx, cy + 0.3); x.restore();
    }

    // ---- naive-painting motifs -------------------------------------------------------------
    function cloud(x, cx, cy, w, tint = '#ffffff', shade = '#c8d8ec') {
        const puffs = [[-0.38, 0.1, 0.22], [-0.15, -0.12, 0.28], [0.12, -0.18, 0.3], [0.36, 0.05, 0.22]];
        x.beginPath();
        for (const [ox, oy, r] of puffs) { x.moveTo(cx + ox * w + r * w, cy + oy * w); x.arc(cx + ox * w, cy + oy * w, r * w, 0, 7); }
        x.lineWidth = 0.8; x.strokeStyle = 'rgba(90,110,150,0.5)'; x.stroke();
        x.fillStyle = tint; x.fill();
        x.beginPath(); x.ellipse(cx, cy + 0.12 * w, 0.52 * w, 0.1 * w, 0, 0, 7); x.fillStyle = shade; x.fill();
    }

    function leafDabs(x, rnd, cx, cy, rx, ry, colors, n, size = 1.4) {
        for (let i = 0; i < n; i++) {
            const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
            const px = cx + Math.cos(a) * rx * r, py = cy + Math.sin(a) * ry * r;
            x.beginPath(); x.ellipse(px, py, size * (0.7 + rnd() * 0.5), size * 0.55, rnd() * 3, 0, 7);
            x.fillStyle = colors[Math.floor(rnd() * colors.length)]; x.fill();
        }
    }

    function poplar(x, rnd, cx, baseY, h, colors = ['#2a5a24', '#3a7a30', '#4e9440', '#1e4a1c']) {
        R(x, cx - 0.6, baseY - h * 0.25, 1.2, h * 0.25, '#5a3a24');
        oval(x, cx, baseY - h * 0.58, h * 0.1, h * 0.42, colors[0]);
        leafDabs(x, rnd, cx, baseY - h * 0.58, h * 0.09, h * 0.4, colors, Math.floor(h * 2.2), Math.max(0.6, h * 0.02));
    }

    function roundTree(x, rnd, cx, baseY, r, colors, fruit) {
        poly(x, [[cx - 1.6, baseY], [cx - 0.9, baseY - r * 1.1], [cx + 0.9, baseY - r * 1.1], [cx + 1.8, baseY]], '#6a4428');
        line(x, cx, baseY - r * 0.9, cx - r * 0.5, baseY - r * 1.4, 0.8, '#6a4428');
        line(x, cx, baseY - r, cx + r * 0.45, baseY - r * 1.5, 0.8, '#6a4428');
        oval(x, cx, baseY - r * 1.55, r, r * 0.85, colors[0]);
        leafDabs(x, rnd, cx, baseY - r * 1.55, r * 0.95, r * 0.8, colors, Math.floor(r * r * 1.2), 1.3);
        if (fruit) for (let i = 0; i < r * 0.8; i++) oval(x, cx + (rnd() - 0.5) * r * 1.6, baseY - r * 1.55 + (rnd() - 0.5) * r * 1.2, 0.8, 0.8, fruit, null);
    }

    function willow(x, rnd, cx, baseY, h, colors = ['#7a9a3a', '#9ab84a', '#5a7a2a']) {
        poly(x, [[cx - 2, baseY], [cx - 1.2, baseY - h * 0.5], [cx + 1.4, baseY - h * 0.5], [cx + 2.2, baseY]], '#5a4a36');
        oval(x, cx, baseY - h * 0.62, h * 0.32, h * 0.22, colors[2]);
        for (let i = 0; i < h * 3; i++) {
            const sx = cx + (rnd() - 0.5) * h * 0.6, sy = baseY - h * 0.75 + rnd() * h * 0.15, L = h * (0.25 + rnd() * 0.35);
            x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + (rnd() - 0.5) * 3, sy + L * 0.5, sx + (rnd() - 0.5) * 2, sy + L);
            x.lineWidth = 0.45; x.strokeStyle = colors[Math.floor(rnd() * colors.length)]; x.stroke();
        }
    }

    function bareTree(x, rnd, cx, baseY, h, snow) {
        const branch = (px, py, ang, len, w, depth) => {
            const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
            line(x, px, py, ex, ey, w, '#2a1e1a');
            if (snow && depth < 4) line(x, px, py - w * 0.4, ex, ey - w * 0.4, w * 0.35, '#f4f8ff');
            if (depth > 0) {
                branch(ex, ey, ang - 0.35 - rnd() * 0.3, len * 0.72, w * 0.65, depth - 1);
                branch(ex, ey, ang + 0.3 + rnd() * 0.3, len * 0.7, w * 0.65, depth - 1);
            }
        };
        branch(cx, baseY, -Math.PI / 2, h * 0.38, 2.4, 5);
    }

    function crow(x, cx, cy) {
        oval(x, cx, cy, 1.4, 0.9, '#141018', null);
        oval(x, cx + 1.2, cy - 0.6, 0.6, 0.55, '#141018', null);
        poly(x, [[cx + 1.7, cy - 0.7], [cx + 2.6, cy - 0.5], [cx + 1.7, cy - 0.3]], '#3a3020', null);
        poly(x, [[cx - 1.2, cy], [cx - 2.6, cy + 0.6], [cx - 1, cy + 0.6]], '#141018', null);
    }

    // Gable-front Podravina house: white plaster, wooden gable boards, red tiles, green shutters.
    function house(x, rnd, px, baseY, w, opts = {}) {
        const h = w * 0.62, roofH = w * 0.55;
        const wall = opts.wall || '#f4efe2';
        R(x, px, baseY - 3, w, 3, '#8a7a6a');                               // plinth
        poly(x, [[px, baseY - 3], [px, baseY - h], [px + w, baseY - h], [px + w, baseY - 3]], wall);
        for (let i = 0; i < 18; i++) R(x, px + rnd() * w, baseY - h + rnd() * h, 2 + rnd() * 3, 0.4, 'rgba(160,140,110,0.25)');
        // gable boards with a sun motif
        const gy = baseY - h, apex = gy - roofH;
        poly(x, [[px + 2, gy], [px + w / 2, apex + 3], [px + w - 2, gy]], '#8a5a30');
        for (let k = 4; k < w - 4; k += 2.2) line(x, px + k, gy, px + k, gy - Math.min(k, w - k) * roofH / (w / 2) + 3.5, 0.25, '#5a3418');
        x.beginPath(); x.arc(px + w / 2, gy - roofH * 0.38, w * 0.06, 0, 7); x.fillStyle = '#f0c040'; x.fill(); x.lineWidth = 0.3; x.strokeStyle = OUT; x.stroke();
        for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; line(x, px + w / 2 + Math.cos(t) * w * 0.07, gy - roofH * 0.38 + Math.sin(t) * w * 0.07, px + w / 2 + Math.cos(t) * w * 0.1, gy - roofH * 0.38 + Math.sin(t) * w * 0.1, 0.4, '#f0c040'); }
        // roof: tile scallops on both slopes, snow on top in winter
        const roof = opts.roof || '#c0482c';
        poly(x, [[px - 4, gy + 1], [px + w / 2, apex], [px + w / 2 + 2.5, apex], [px + 4.5, gy + 1]], roof);
        poly(x, [[px + w + 4, gy + 1], [px + w / 2, apex], [px + w / 2 - 2.5, apex], [px + w - 4.5, gy + 1]], roof);
        for (let t = 0.1; t < 1; t += 0.12) {
            const ax = px - 4 + (w / 2 + 4) * t, ay = gy + 1 - (roofH + 1) * t;
            line(x, ax, ay, ax + 7, ay + 0.6, 0.3, 'rgba(90,20,10,0.7)');
            const bx = px + w + 4 - (w / 2 + 4) * t;
            line(x, bx, ay, bx - 7, ay + 0.6, 0.3, 'rgba(90,20,10,0.7)');
        }
        if (opts.snow) {
            poly(x, [[px - 5, gy + 1.5], [px + w / 2, apex - 1.5], [px + w + 5, gy + 1.5], [px + w - 4, gy - 1], [px + w / 2, apex + 2], [px + 4, gy - 1]], '#f4f8ff', 'rgba(120,140,190,0.8)');
        }
        // chimney + 1970s TV antenna
        R(x, px + w * 0.68, apex + roofH * 0.25, 3.2, 6, '#b04a30'); R(x, px + w * 0.68 - 0.4, apex + roofH * 0.25, 4, 1, '#7a2a18');
        if (opts.smoke) for (let i = 0; i < 6; i++) oval(x, px + w * 0.68 + 1.6 + i * 1.6, apex + roofH * 0.2 - i * 3.2, 1.4 + i * 0.4, 1.1 + i * 0.3, `rgba(220,220,235,${0.7 - i * 0.1})`, null);
        if (opts.antenna !== false) {
            const ax = px + w * 0.3, ay = apex + roofH * 0.4;
            line(x, ax, ay, ax, ay - 12, 0.35, '#3a3a40');
            for (let k = 0; k < 4; k++) line(x, ax - 3 + k * 0.4, ay - 11 + k * 1.6, ax + 3 - k * 0.4, ay - 11 + k * 1.6, 0.3, '#3a3a40');
        }
        // two windows with shutters and geraniums
        for (const fx of [0.22, 0.62]) {
            const wx = px + w * fx, wy = baseY - h * 0.72, ww = w * 0.16, wh = h * 0.42;
            const lit = opts.lit;
            poly(x, [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]], lit ? '#ffd860' : '#3a5a7a');
            if (lit) glow(x, wx + ww / 2, wy + wh / 2, ww * 1.3, 'rgba(255,210,90,A)', 0.35);
            line(x, wx + ww / 2, wy, wx + ww / 2, wy + wh, 0.4, '#f4f0e8'); line(x, wx, wy + wh * 0.45, wx + ww, wy + wh * 0.45, 0.4, '#f4f0e8');
            poly(x, [[wx - ww * 0.45, wy], [wx, wy], [wx, wy + wh], [wx - ww * 0.45, wy + wh]], opts.shutter || '#2e7a4a');
            poly(x, [[wx + ww, wy], [wx + ww * 1.45, wy], [wx + ww * 1.45, wy + wh], [wx + ww, wy + wh]], opts.shutter || '#2e7a4a');
            R(x, wx - 1, wy + wh, ww + 2, 1.2, opts.snow ? '#f4f8ff' : '#8a5a30');
            if (!opts.snow) for (let k = 0; k < 4; k++) oval(x, wx + 0.5 + k * ww / 3.5, wy + wh - 0.6, 0.9, 0.8, k % 2 ? '#e02828' : '#ff5050', null);
        }
    }

    // Woven wicker fence (pleter), the classic Podravina yard fence.
    function wicker(x, x0, x1, baseY, h = 12, snow) {
        for (let px = x0; px <= x1; px += 9) poly(x, [[px - 0.7, baseY], [px - 0.7, baseY - h - 2], [px + 0.7, baseY - h - 2.6], [px + 0.7, baseY]], '#6a4a2a', OUT, 0.25);
        for (let y = baseY - h; y < baseY - 1; y += 1.6) {
            x.beginPath();
            for (let px = x0; px <= x1; px += 1) x.lineTo(px, y + Math.sin((px - x0) / 9 * Math.PI + y) * 0.6);
            x.lineWidth = 1.1; x.strokeStyle = (Math.round(y) % 2) ? '#9a7040' : '#7a5430'; x.stroke();
        }
        if (snow) R(x, x0, baseY - h - 1.2, x1 - x0, 1.4, '#f4f8ff');
    }

    function picketFence(x, x0, x1, baseY, h = 13, color = '#f0ead8') {
        line(x, x0, baseY - h * 0.35, x1, baseY - h * 0.35, 0.9, '#8a7a60'); line(x, x0, baseY - h * 0.75, x1, baseY - h * 0.75, 0.9, '#8a7a60');
        for (let px = x0; px <= x1; px += 3.2) poly(x, [[px, baseY], [px, baseY - h + 1], [px + 0.9, baseY - h], [px + 1.8, baseY - h + 1], [px + 1.8, baseY]], color, OUT, 0.25);
    }

    // Đeram: the tall well sweep of the Pannonian plain.
    function deram(x, px, baseY, snow) {
        poly(x, [[px - 5, baseY], [px - 5, baseY - 7], [px + 5, baseY - 7], [px + 5, baseY]], '#8a6038');
        for (let y = baseY - 6; y < baseY; y += 2) line(x, px - 5, y, px + 5, y, 0.3, '#5a3a20');
        if (snow) R(x, px - 5.5, baseY - 8, 11, 1.4, '#f4f8ff');
        const postX = px + 16;
        poly(x, [[postX - 1, baseY], [postX - 1, baseY - 32], [postX + 1, baseY - 32], [postX + 1, baseY]], '#6a4428');
        line(x, postX, baseY - 32, postX - 2.5, baseY - 37, 0.9, '#6a4428'); line(x, postX, baseY - 32, postX + 2.5, baseY - 37, 0.9, '#6a4428');
        line(x, postX + 16, baseY - 22, px, baseY - 56, 1.0, '#7a5030');               // sweep pole
        poly(x, [[postX + 14, baseY - 25], [postX + 19, baseY - 25], [postX + 19, baseY - 19], [postX + 14, baseY - 19]], '#8a8a8a');
        line(x, px, baseY - 56, px, baseY - 12, 0.3, '#3a2a1a');
        poly(x, [[px - 1.8, baseY - 12], [px + 1.8, baseY - 12], [px + 1.4, baseY - 8.5], [px - 1.4, baseY - 8.5]], '#5a6a7a');
    }

    function haystack(x, rnd, px, baseY, w, h, snow) {
        line(x, px, baseY - h - 6, px, baseY, 0.8, '#5a3a20');
        x.beginPath(); x.moveTo(px - w / 2, baseY); x.quadraticCurveTo(px - w * 0.55, baseY - h * 0.7, px, baseY - h);
        x.quadraticCurveTo(px + w * 0.55, baseY - h * 0.7, px + w / 2, baseY); x.closePath();
        x.fillStyle = vgrad(x, baseY - h, baseY, ['#e8c060', '#c89838']); x.fill(); x.lineWidth = 0.4; x.strokeStyle = OUT; x.stroke();
        for (let i = 0; i < w * 4; i++) {
            const t = rnd(), sx = px + (rnd() - 0.5) * w * (0.2 + t * 0.8), sy = baseY - h + t * h;
            line(x, sx, sy, sx + (rnd() - 0.5) * 2, sy + 2.5, 0.25, rnd() < 0.5 ? '#a07020' : '#f8e090');
        }
        if (snow) { x.beginPath(); x.moveTo(px - w * 0.36, baseY - h * 0.55); x.quadraticCurveTo(px, baseY - h * 1.12, px + w * 0.36, baseY - h * 0.55); x.quadraticCurveTo(px, baseY - h * 0.7, px - w * 0.36, baseY - h * 0.55); x.fillStyle = '#f4f8ff'; x.fill(); }
    }

    function church(x, px, baseY, k = 1, lit) {
        poly(x, [[px, baseY], [px, baseY - 20 * k], [px + 34 * k, baseY - 20 * k], [px + 34 * k, baseY]], '#f6f0e0');
        poly(x, [[px - 1.5 * k, baseY - 20 * k], [px + 17 * k, baseY - 30 * k], [px + 35.5 * k, baseY - 20 * k]], '#b04a30');
        poly(x, [[px - 9 * k, baseY], [px - 9 * k, baseY - 44 * k], [px + 2 * k, baseY - 44 * k], [px + 2 * k, baseY]], '#f8f2e4');
        x.beginPath(); x.moveTo(px - 10 * k, baseY - 44 * k); x.quadraticCurveTo(px - 3.5 * k, baseY - 56 * k, px - 3.5 * k, baseY - 64 * k);
        x.quadraticCurveTo(px - 3.5 * k, baseY - 56 * k, px + 3 * k, baseY - 44 * k); x.closePath();
        x.fillStyle = '#3a8a6a'; x.fill(); x.lineWidth = 0.35; x.strokeStyle = OUT; x.stroke();
        line(x, px - 3.5 * k, baseY - 64 * k, px - 3.5 * k, baseY - 70 * k, 0.4, '#d0a030'); line(x, px - 5 * k, baseY - 68 * k, px - 2 * k, baseY - 68 * k, 0.4, '#d0a030');
        oval(x, px - 3.5 * k, baseY - 37 * k, 2.4 * k, 2.4 * k, '#f0e0a0');
        for (const wx of [8, 18, 26]) poly(x, [[px + wx * k, baseY - 6 * k], [px + wx * k, baseY - 14 * k], [px + (wx + 3) * k, baseY - 14 * k], [px + (wx + 3) * k, baseY - 6 * k]], lit ? '#ffd860' : '#5a7090');
    }

    function fico(x, px, baseY, body = '#8ab8d8') {
        // the little Zastava 750 everyone's uncle drove
        x.beginPath(); x.moveTo(px, baseY - 3); x.quadraticCurveTo(px, baseY - 9, px + 6, baseY - 9);
        x.quadraticCurveTo(px + 8, baseY - 15.5, px + 16, baseY - 15.5); x.quadraticCurveTo(px + 23, baseY - 15.5, px + 25, baseY - 9);
        x.quadraticCurveTo(px + 30, baseY - 8.5, px + 30, baseY - 3); x.closePath();
        x.fillStyle = body; x.fill(); x.lineWidth = 0.45; x.strokeStyle = OUT; x.stroke();
        poly(x, [[px + 8.5, baseY - 9.5], [px + 10.5, baseY - 14], [px + 15.5, baseY - 14], [px + 15.5, baseY - 9.5]], '#d8eef8');
        poly(x, [[px + 16.5, baseY - 9.5], [px + 16.5, baseY - 14], [px + 21, baseY - 14], [px + 23.5, baseY - 9.5]], '#d8eef8');
        R(x, px - 0.5, baseY - 4, 31, 1.2, '#d0d0d8');
        oval(x, px + 1.6, baseY - 6.5, 1.3, 1.3, '#fff8d0');
        for (const wx of [6.5, 23.5]) { oval(x, px + wx, baseY - 2, 3, 3, '#1a1a1e'); oval(x, px + wx, baseY - 2, 1.4, 1.4, '#b8b8c0', null); }
    }

    function tractor(x, px, baseY) {
        poly(x, [[px + 4, baseY - 6], [px + 4, baseY - 13], [px + 18, baseY - 13], [px + 20, baseY - 6]], '#c82820');
        poly(x, [[px + 14, baseY - 13], [px + 14, baseY - 24], [px + 26, baseY - 24], [px + 26, baseY - 10]], '#c82820');
        poly(x, [[px + 15.5, baseY - 22], [px + 24.5, baseY - 22], [px + 24.5, baseY - 15], [px + 15.5, baseY - 15]], '#bfe0f0');
        R(x, px + 7, baseY - 18, 1.6, 5, '#2a2a2a');
        oval(x, px + 23, baseY - 7.5, 7.5, 7.5, '#1e1e1e'); oval(x, px + 23, baseY - 7.5, 3.5, 3.5, '#d8c020');
        oval(x, px + 6.5, baseY - 4, 4, 4, '#1e1e1e'); oval(x, px + 6.5, baseY - 4, 1.8, 1.8, '#d8c020');
    }

    function cartWithHorse(x, rnd, px, baseY) {
        // horse
        oval(x, px + 10, baseY - 15, 8, 4.5, '#8a5a30');
        poly(x, [[px + 16, baseY - 17], [px + 21, baseY - 25], [px + 25, baseY - 23], [px + 19, baseY - 14]], '#8a5a30');
        oval(x, px + 25, baseY - 23, 3, 1.8, '#8a5a30');
        poly(x, [[px + 18, baseY - 23], [px + 21.5, baseY - 26], [px + 19, baseY - 20]], '#3a2414', null);
        for (const lx of [4, 7, 13, 16]) line(x, px + lx, baseY - 12, px + lx + (lx % 2 ? 0.8 : -0.5), baseY, 1.2, '#7a4a28');
        line(x, px + 2, baseY - 16, px - 1, baseY - 8, 1, '#3a2414');
        oval(x, px + 25.5, baseY - 23.6, 0.4, 0.4, '#101010', null);
        // wagon with hay
        line(x, px + 4, baseY - 13, px - 8, baseY - 9, 0.7, '#5a3a20');
        poly(x, [[px - 40, baseY - 10], [px - 8, baseY - 10], [px - 10, baseY - 16], [px - 38, baseY - 16]], '#9a6a38');
        for (let k = -38; k < -10; k += 3) line(x, px + k, baseY - 16, px + k, baseY - 10, 0.25, '#5a3a20');
        haystack(x, rnd, px - 24, baseY - 15.5, 30, 12);
        for (const wx of [-34, -14]) { oval(x, px + wx, baseY - 4.5, 4.5, 4.5, null, '#4a2a14', 1); for (let a = 0; a < 6; a++) line(x, px + wx, baseY - 4.5, px + wx + Math.cos(a) * 4.5, baseY - 4.5 + Math.sin(a) * 4.5, 0.4, '#4a2a14'); }
    }

    function electricPole(x, px, baseY, h = 70) {
        poly(x, [[px - 1, baseY], [px - 0.7, baseY - h], [px + 0.7, baseY - h], [px + 1, baseY]], '#6a5038');
        line(x, px - 6, baseY - h + 4, px + 6, baseY - h + 4, 0.9, '#5a4030');
        for (const k of [-5, -1.5, 1.5, 5]) oval(x, px + k, baseY - h + 3, 0.5, 0.7, '#e8e8f0', null);
    }

    function wires(x, poles, baseY, h = 70) {
        for (let i = 0; i < poles.length - 1; i++) for (const k of [-5, 5]) {
            const a = poles[i] + k, b = poles[i + 1] + k, y = baseY - h + 3;
            x.beginPath(); x.moveTo(a, y); x.quadraticCurveTo((a + b) / 2, y + 7, b, y); x.lineWidth = 0.25; x.strokeStyle = 'rgba(40,30,30,0.8)'; x.stroke();
        }
    }

    function sunflower(x, px, baseY, h) {
        line(x, px, baseY, px, baseY - h, 0.6, '#3a6a24');
        oval(x, px - 1.6, baseY - h * 0.5, 1.6, 0.7, '#4a8a30', null);
        for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; oval(x, px + Math.cos(t) * 2.4, baseY - h + Math.sin(t) * 2.4, 1.3, 0.7, '#f8c820', null); }
        oval(x, px, baseY - h, 1.7, 1.7, '#5a3418');
    }

    function chicken(x, px, py, col = '#f4f0e8') {
        oval(x, px, py, 2.2, 1.6, col); oval(x, px + 2, py - 1.4, 1, 1, col);
        poly(x, [[px + 2.8, py - 1.6], [px + 3.8, py - 1.3], [px + 2.8, py - 1]], '#e8a020', null);
        oval(x, px + 1.9, py - 2.5, 0.5, 0.4, '#e02020', null);
        line(x, px - 0.4, py + 1.4, px - 0.6, py + 3, 0.3, '#e8a020'); line(x, px + 0.6, py + 1.4, px + 0.8, py + 3, 0.3, '#e8a020');
    }

    function goose(x, px, py) {
        oval(x, px, py, 3, 1.8, '#fbfbf6');
        x.beginPath(); x.moveTo(px + 2, py - 1); x.quadraticCurveTo(px + 3.5, py - 4, px + 3, py - 5.5); x.lineWidth = 1; x.strokeStyle = '#fbfbf6'; x.stroke();
        poly(x, [[px + 3.3, py - 5.6], [px + 5, py - 5.2], [px + 3.3, py - 4.8]], '#f08020', null);
    }

    function wayCross(x, px, baseY, snow) {
        line(x, px, baseY, px, baseY - 26, 1.2, '#5a3a20'); line(x, px - 5, baseY - 20, px + 5, baseY - 20, 1.1, '#5a3a20');
        poly(x, [[px - 6, baseY - 25], [px, baseY - 30], [px + 6, baseY - 25]], snow ? '#f4f8ff' : '#7a5030');
        oval(x, px, baseY - 21, 0.8, 0.8, '#e8c8a0', null); line(x, px, baseY - 20, px, baseY - 15, 0.7, '#e8c8a0');
        for (let k = 0; k < 3; k++) oval(x, px - 2 + k * 2, baseY - 1, 1, 1, ['#e02828', '#f0c030', '#e02828'][k], null);
    }

    function figure(x, px, baseY, k, shirt, skirtOrPants, headscarf) {
        // tiny peasant working in the field, painted flat
        line(x, px - 0.6 * k, baseY, px - 0.4 * k, baseY - 4 * k, 0.7 * k, skirtOrPants);
        line(x, px + 0.6 * k, baseY, px + 0.5 * k, baseY - 4 * k, 0.7 * k, skirtOrPants);
        poly(x, [[px - 1.4 * k, baseY - 4 * k], [px + 1.4 * k, baseY - 4 * k], [px + 1.1 * k, baseY - 8.5 * k], [px - 1.1 * k, baseY - 8.5 * k]], shirt, null);
        oval(x, px, baseY - 9.6 * k, 1 * k, 1.1 * k, headscarf || '#e8b088', null);
        line(x, px + 1.1 * k, baseY - 8 * k, px + 3 * k, baseY - 5 * k, 0.5 * k, shirt);
        line(x, px + 3 * k, baseY - 7 * k, px + 3 * k, baseY + 0.5 * k, 0.3, '#7a5030');
    }

    // Fields painted as a patchwork of strips running to the horizon.
    function patchwork(x, rnd, y0, y1, palette, rows = 4) {
        const H = y1 - y0;
        for (let r = 0; r < rows; r++) {
            const ya = y0 + H * Math.pow(r / rows, 1.4), yb = y0 + H * Math.pow((r + 1) / rows, 1.4);
            let px = -20;
            while (px < FAR_W + 20) {
                const w = 40 + rnd() * 90, c = palette[Math.floor(rnd() * palette.length)];
                poly(x, [[px, ya], [px + w, ya], [px + w + 6, yb], [px + 6, yb]], c, 'rgba(60,50,30,0.35)', 0.3);
                for (let fy = ya + 1.5; fy < yb; fy += 1.6 + r * 0.6) line(x, px + 1, fy, px + w + 5, fy, 0.25, 'rgba(0,0,0,0.12)');
                px += w;
            }
        }
    }

    function roadFloor(x, rnd, W, base, light, rut, edge) {
        x.fillStyle = vgrad(x, FLOOR_TOP, GAME_H, [base, light]); x.fillRect(0, FLOOR_TOP, W, GAME_H - FLOOR_TOP);
        for (const ry of [186, 200, 214]) {
            x.beginPath(); x.moveTo(0, ry);
            for (let px = 0; px <= W; px += 6) x.lineTo(px, ry + Math.sin(px / 23 + ry) * 1.2);
            x.lineWidth = 2.6; x.strokeStyle = rut; x.stroke();
        }
        for (let i = 0; i < W * 0.9; i++) {
            const sx = rnd() * W, sy = FLOOR_TOP + 6 + rnd() * (GAME_H - FLOOR_TOP - 10);
            oval(x, sx, sy, 0.5 + rnd() * 0.9, 0.35 + rnd() * 0.4, rnd() < 0.5 ? 'rgba(90,70,50,0.45)' : 'rgba(255,250,230,0.3)', null);
        }
        edge(FLOOR_TOP, false);
        edge(FLOOR_BOT + 1, true);
    }

    function grassEdge(x, rnd, W, flowers) {
        return (y, bottom) => {
            const h = bottom ? GAME_H - y : 6;
            x.fillStyle = vgrad(x, y - (bottom ? 0 : 2), y + h, ['#4a8a30', '#6aa840']); x.fillRect(0, y - (bottom ? 0 : 2), W, h + 2);
            for (let px = 0; px < W; px += 0.9) {
                const gh = 2 + rnd() * 3.5, gy = bottom ? y + 0.5 : y + h;
                line(x, px, gy, px + (rnd() - 0.5) * 1.6, gy - gh, 0.4, rnd() < 0.5 ? '#3a7a24' : '#7ab84a');
            }
            if (flowers) for (let i = 0; i < W / 9; i++) {
                const fx = rnd() * W, fy = bottom ? y + 2 + rnd() * 5 : y + rnd() * 4, c = flowers[Math.floor(rnd() * flowers.length)];
                for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; oval(x, fx + Math.cos(a) * 0.7, fy + Math.sin(a) * 0.7, 0.55, 0.55, c, null); }
                oval(x, fx, fy, 0.4, 0.4, '#f8d030', null);
            }
        };
    }

    // ---- Mission 1: Gruntovec village, summer ------------------------------------------------
    function village(W) {
        const rnd = rng(1970);
        const [far, f] = canvas(FAR_W, FLOOR_TOP);
        f.fillStyle = vgrad(f, 0, 100, ['#2a6ac8', '#5a9ae0', '#a8d0f0', '#e8f4f8']); f.fillRect(0, 0, FAR_W, 100);
        // naive sun with a face of rays
        f.beginPath(); f.arc(520, 26, 11, 0, 7); f.fillStyle = '#f8d030'; f.fill();
        for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; poly(f, [[520 + Math.cos(t - 0.1) * 12, 26 + Math.sin(t - 0.1) * 12], [520 + Math.cos(t) * 18, 26 + Math.sin(t) * 18], [520 + Math.cos(t + 0.1) * 12, 26 + Math.sin(t + 0.1) * 12]], '#f8b820', null); }
        for (const [cx, cy, w] of [[80, 30, 46], [250, 18, 36], [380, 40, 52], [610, 50, 30]]) cloud(f, cx, cy, w);
        for (let i = 0; i < 6; i++) { const bx = 150 + i * 40 + rnd() * 20, by = 30 + rnd() * 20; f.beginPath(); f.moveTo(bx - 2, by); f.quadraticCurveTo(bx - 1, by - 1.2, bx, by); f.quadraticCurveTo(bx + 1, by - 1.2, bx + 2, by); f.lineWidth = 0.4; f.strokeStyle = '#2a2a3a'; f.stroke(); }
        patchwork(f, rnd, 92, FLOOR_TOP, ['#e8c850', '#d8b040', '#8ab848', '#6a9a3a', '#b8d060', '#c89a48', '#9ab850']);
        for (let px = 6; px < FAR_W; px += 14 + rnd() * 30) poplar(f, rnd, px, 96 + rnd() * 4, 18 + rnd() * 12);
        church(f, 300, 98, 0.55);
        for (let i = 0; i < 8; i++) haystack(f, rnd, rnd() * FAR_W, 104 + rnd() * 30, 8, 7);
        for (let i = 0; i < 6; i++) figure(f, rnd() * FAR_W, 112 + rnd() * 34, 0.9, ['#f4f0e8', '#e05050', '#4a7ad0'][i % 3], i % 2 ? '#f4f0e8' : '#3a3a6a', i % 2 ? '#d02020' : null);

        const [near, n] = canvas(W, GAME_H);
        // yard grass behind the fences
        n.fillStyle = vgrad(n, 128, FLOOR_TOP, ['#7ab848', '#5a9a38']); n.fillRect(0, 128, W, FLOOR_TOP - 128);
        const poles = [];
        for (let px = 40; px < W; px += 170) poles.push(px);
        let px = 10, i = 0;
        while (px < W - 60) {
            const kind = i++ % 4;
            if (kind === 0) {
                house(n, rnd, px, 144, 64, {});
                roundTree(n, rnd, px + 84, 146, 14, ['#3a7a2a', '#4e9a38', '#6ab848', '#2a5a20'], '#e02828');
                px += 110;
            } else if (kind === 1) {
                deram(n, px + 10, 148);
                haystack(n, rnd, px + 58, 150, 26, 30);
                for (let k = 0; k < 5; k++) sunflower(n, px + 80 + k * 5, 152, 18 + (k % 2) * 4);
                px += 120;
            } else if (kind === 2) {
                // village inn
                house(n, rnd, px, 146, 76, { wall: '#f8e8b0', shutter: '#8a3a20' });
                label(n, 'GOSTIONA', px + 38, 99, 6, '#f8f0d8', '#5a2a18');
                poly(n, [[px + 84, 146], [px + 84, 140], [px + 104, 140], [px + 104, 146]], '#8a5a30');
                R(n, px + 86, 146, 1.2, 4, '#5a3a20'); R(n, px + 101, 146, 1.2, 4, '#5a3a20');
                fico(n, px + 110, 154, ['#8ab8d8', '#e8d050', '#e05a40'][Math.floor(rnd() * 3)]);
                px += 160;
            } else {
                wayCross(n, px + 16, 152);
                house(n, rnd, px + 34, 144, 60, { roof: '#a83a24' });
                roundTree(n, rnd, px + 112, 148, 12, ['#3a7a2a', '#4e9a38', '#6ab848', '#2a5a20'], '#f0c030');
                px += 140;
            }
        }
        // the butcher's at the end of the village, where the boss waits
        house(n, rnd, W - 120, 146, 80, { wall: '#f4e4e0', shutter: '#a02020' });
        label(n, 'MESNICA', W - 80, 99, 6, '#ffffff', '#a02020');
        wicker(n, 0, W, 156, 12);
        for (const p of poles) electricPole(n, p, 156);
        wires(n, poles, 156);
        roadFloor(n, rnd, W, '#b89060', '#d0aa78', 'rgba(120,85,50,0.5)', grassEdge(n, rnd, W, ['#ffffff', '#e83030', '#f8e040', '#8a60e0']));
        for (let k = 0; k < W / 70; k++) { const cx = rnd() * W; chicken(n, cx, 170 + rnd() * 8, rnd() < 0.6 ? '#f4f0e8' : '#c8783a'); }
        for (let k = 0; k < W / 200; k++) { const cx = rnd() * W, cy = 196 + rnd() * 20; n.save(); n.translate(cx, cy); n.scale(1, 0.3); oval(n, 0, 0, 10 + rnd() * 8, 10, 'rgba(110,150,200,0.55)', null); n.restore(); }
        return { far, near, farFactor: 0.2 };
    }

    // ---- Mission 2: along the Drava, autumn -------------------------------------------------
    function drava(W) {
        const rnd = rng(1971);
        const [far, f] = canvas(FAR_W, FLOOR_TOP);
        f.fillStyle = vgrad(f, 0, 112, ['#3a4aa0', '#8a5aa0', '#e07a78', '#f8b068', '#f8e0a0']); f.fillRect(0, 0, FAR_W, 112);
        f.beginPath(); f.arc(200, 92, 14, 0, 7); f.fillStyle = '#f87830'; f.fill();
        for (const [cx, cy, w] of [[60, 34, 50], [320, 24, 42], [470, 44, 56]]) cloud(f, cx, cy, w, '#ffe0c8', '#e8a0a0');
        for (let i = 0; i < 9; i++) { const bx = 360 + (i % 5) * 7 + Math.floor(i / 5) * 4, by = 30 + Math.abs(i % 5 - 2) * 3 + Math.floor(i / 5) * 8; f.beginPath(); f.moveTo(bx - 2, by); f.quadraticCurveTo(bx - 1, by - 1.2, bx, by); f.quadraticCurveTo(bx + 1, by - 1.2, bx + 2, by); f.lineWidth = 0.4; f.strokeStyle = '#2a1a2a'; f.stroke(); }
        // far bank with willows, then the river with painted ripples
        f.fillStyle = '#6a8a3a'; f.fillRect(0, 106, FAR_W, 10);
        for (let px = 4; px < FAR_W; px += 10 + rnd() * 18) willow(f, rnd, px, 112, 18 + rnd() * 10, ['#c8a040', '#a8a838', '#e0b048']);
        f.fillStyle = vgrad(f, 114, 140, ['#4a7ab8', '#6a9ac8', '#3a6aa8']); f.fillRect(0, 114, FAR_W, 26);
        for (let i = 0; i < 160; i++) { const wx = rnd() * FAR_W, wy = 116 + rnd() * 22; line(f, wx, wy, wx + 3 + rnd() * 4, wy, 0.35, rnd() < 0.5 ? '#c8e0f8' : '#f8c890'); }
        // ferry (skela) on its cable
        line(f, 0, 118, FAR_W, 118, 0.25, '#2a2a2a');
        poly(f, [[420, 128], [460, 128], [456, 132], [424, 132]], '#7a5030');
        R(f, 432, 121, 2, 7, '#5a3a20'); R(f, 444, 121, 2, 7, '#5a3a20');
        figure(f, 438, 128, 0.8, '#f4f0e8', '#3a3a6a'); figure(f, 450, 128, 0.8, '#d03030', '#f4f0e8', '#d02020');
        poly(f, [[100, 134], [116, 134], [113, 137], [103, 137]], '#5a3a20'); figure(f, 108, 134, 0.7, '#4a6a9a', '#3a3a3a');
        f.fillStyle = '#9a8a40'; f.fillRect(0, 140, FAR_W, FLOOR_TOP - 140);
        patchwork(f, rnd, 140, FLOOR_TOP, ['#c8a040', '#a88a30', '#d8b860', '#8a7a30'], 2);

        const [near, n] = canvas(W, GAME_H);
        n.fillStyle = vgrad(n, 132, FLOOR_TOP, ['#a89040', '#8a7a30']); n.fillRect(0, 132, W, FLOOR_TOP - 132);
        let px = 0, i = 0;
        while (px < W - 160) {
            const kind = i++ % 5;
            if (kind === 0) { willow(n, rnd, px + 20, 154, 60, ['#c8a040', '#d8b848', '#a89838', '#e8c058']); px += 50; }
            else if (kind === 1) {
                // corn field, stalks with golden cobs
                for (let k = 0; k < 26; k++) {
                    const cx = px + k * 3.4 + rnd(), h = 26 + rnd() * 8;
                    line(n, cx, 154, cx + (rnd() - 0.5) * 2, 154 - h, 0.7, '#a89048');
                    for (let l = 0; l < 3; l++) { const ly = 154 - h * (0.3 + l * 0.22); n.beginPath(); n.moveTo(cx, ly); n.quadraticCurveTo(cx + 4 * (l % 2 ? 1 : -1), ly - 3, cx + 6 * (l % 2 ? 1 : -1), ly + 1); n.lineWidth = 0.6; n.strokeStyle = '#c0a860'; n.stroke(); }
                    if (rnd() < 0.5) oval(n, cx + 1, 154 - h * 0.55, 0.9, 2.4, '#f0c040', '#8a6a20', 0.25);
                }
                px += 100;
            } else if (kind === 2) { haystack(n, rnd, px + 22, 154, 34, 40); haystack(n, rnd, px + 56, 154, 26, 30); px += 80; }
            else if (kind === 3) { cartWithHorse(n, rnd, px + 60, 154); px += 100; }
            else {
                tractor(n, px + 10, 154);
                for (let k = 0; k < 9; k++) oval(n, px + 48 + (k % 4) * 6 + (k > 3 ? 3 : 0), 151 - Math.floor(k / 4) * 4, 3.2, 2.6, k % 3 ? '#f08a20' : '#e8b030');
                // fisherman's hut
                poly(n, [[px + 80, 154], [px + 80, 138], [px + 106, 138], [px + 106, 154]], '#8a6a40');
                poly(n, [[px + 76, 139], [px + 93, 122], [px + 110, 139]], '#c8a050');
                for (let k = 0; k < 8; k++) line(n, px + 79 + k * 4, 139, px + 93, 122, 0.25, '#8a6a30');
                poly(n, [[px + 90, 154], [px + 90, 143], [px + 96, 143], [px + 96, 154]], '#3a2a1a');
                px += 130;
            }
        }
        // the village smithy at the end, for the blacksmith boss
        const sx = W - 130;
        poly(n, [[sx, 154], [sx, 112], [sx + 90, 112], [sx + 90, 154]], '#8a7a6a');
        for (let y = 114; y < 154; y += 4) for (let bx = sx + ((y / 4) % 2) * 5; bx < sx + 90; bx += 10) R(n, bx, y, 9.4, 3.4, 'rgba(160,140,120,0.6)');
        poly(n, [[sx - 6, 113], [sx + 45, 88], [sx + 96, 113]], '#6a5040');
        poly(n, [[sx + 30, 154], [sx + 30, 126], [sx + 60, 126], [sx + 60, 154]], '#2a1a14');
        glow(n, sx + 45, 144, 18, 'rgba(255,120,30,A)', 0.8);
        poly(n, [[sx + 38, 150], [sx + 52, 150], [sx + 50, 146], [sx + 40, 146]], '#3a3a40');
        label(n, 'KOVAČNICA', sx + 45, 106, 6, '#f8f0d8', '#3a2a1a');
        // embankment path with fallen leaves
        roadFloor(n, rnd, W, '#a08050', '#b89868', 'rgba(110,80,50,0.45)', grassEdge(n, rnd, W, ['#f8a020', '#e85020', '#f8d040']));
        for (let k = 0; k < W * 0.6; k++) { const lx = rnd() * W, ly = FLOOR_TOP + 6 + rnd() * 70; oval(n, lx, ly, 1.1, 0.6, ['#e87820', '#c84a18', '#f0b030', '#a0601a'][Math.floor(rnd() * 4)], null); }
        for (let k = 0; k < W / 150; k++) goose(n, rnd() * W, 168 + rnd() * 10);
        return { far, near, farFactor: 0.18 };
    }

    // ---- Mission 3: winter night in the village ---------------------------------------------
    function winter(W) {
        const rnd = rng(1972);
        const [far, f] = canvas(FAR_W, FLOOR_TOP);
        f.fillStyle = vgrad(f, 0, 110, ['#0a0a3a', '#1a1a5a', '#2a3a7a', '#4a5a9a']); f.fillRect(0, 0, FAR_W, 110);
        for (let k = 0; k < 220; k++) { const sx = rnd() * FAR_W, sy = rnd() * 96, r = 0.25 + rnd() * 0.5; oval(f, sx, sy, r, r, '#fffbe0', null); if (rnd() < 0.08) { line(f, sx - 1.8, sy, sx + 1.8, sy, 0.2, '#fffbe0'); line(f, sx, sy - 1.8, sx, sy + 1.8, 0.2, '#fffbe0'); } }
        glow(f, 140, 30, 34, 'rgba(255,250,210,A)', 0.35);
        oval(f, 140, 30, 13, 13, '#fbf6d8', null); oval(f, 136, 27, 2.4, 2.4, 'rgba(200,190,150,0.5)', null); oval(f, 144, 34, 1.6, 1.6, 'rgba(200,190,150,0.5)', null);
        f.fillStyle = vgrad(f, 100, FLOOR_TOP, ['#c8d8f0', '#e8f0fc']); f.fillRect(0, 100, FAR_W, FLOOR_TOP - 100);
        for (let k = 0; k < 6; k++) { const hx = 20 + k * 110 + rnd() * 40; house(f, rnd, hx, 108, 22, { snow: true, lit: true, antenna: false }); }
        church(f, 380, 110, 0.5, true);
        for (let px = 0; px < FAR_W; px += 30 + rnd() * 40) bareTree(f, rnd, px, 112 + rnd() * 6, 20 + rnd() * 10, true);
        for (let k = 0; k < 6; k++) line(f, 0, 118 + k * 6, FAR_W, 120 + k * 6, 0.2, 'rgba(120,140,190,0.35)');

        const [near, n] = canvas(W, GAME_H);
        n.fillStyle = vgrad(n, 128, FLOOR_TOP, ['#dce8f8', '#c8d8f0']); n.fillRect(0, 128, W, FLOOR_TOP - 128);
        let px = 0, i = 0;
        while (px < W - 170) {
            const kind = i++ % 4;
            if (kind === 0) { house(n, rnd, px + 10, 146, 66, { snow: true, lit: true, smoke: true }); px += 96; }
            else if (kind === 1) {
                bareTree(n, rnd, px + 22, 152, 80, true);
                for (let k = 0; k < 3; k++) crow(n, px + 8 + k * 12, 100 + k * 6);
                // snowman with a pot hat
                oval(n, px + 52, 147, 7, 6, '#f8fbff', 'rgba(110,130,180,0.8)'); oval(n, px + 52, 137, 5, 4.6, '#f8fbff', 'rgba(110,130,180,0.8)');
                oval(n, px + 52, 129.5, 3.6, 3.4, '#f8fbff', 'rgba(110,130,180,0.8)');
                poly(n, [[px + 49, 127], [px + 55, 127], [px + 54.4, 123], [px + 49.6, 123]], '#4a3a3a');
                poly(n, [[px + 53.5, 129.5], [px + 57.5, 130.2], [px + 53.5, 130.8]], '#f08020', null);
                oval(n, px + 51, 128.8, 0.4, 0.4, '#101010', null); oval(n, px + 53.4, 128.6, 0.4, 0.4, '#101010', null);
                line(n, px + 47, 137, px + 41, 132, 0.6, '#5a3a20');
                px += 76;
            } else if (kind === 2) {
                deram(n, px + 10, 150, true);
                haystack(n, rnd, px + 62, 152, 28, 32, true);
                // sled
                poly(n, [[px + 84, 150], [px + 104, 150], [px + 102, 146], [px + 86, 146]], '#9a6a38');
                n.beginPath(); n.moveTo(px + 82, 152); n.lineTo(px + 104, 152); n.quadraticCurveTo(px + 108, 152, px + 107, 148); n.lineWidth = 0.6; n.strokeStyle = '#3a2a1a'; n.stroke();
                px += 116;
            } else {
                church(n, px + 18, 152, 0.95, true);
                wayCross(n, px + 66, 154, true);
                px += 86;
            }
        }
        // vineyard cottage (klet) with a lantern, where the last fight happens
        const kx = W - 150;
        house(n, rnd, kx, 148, 84, { snow: true, lit: true, smoke: true, wall: '#e8e0d0', shutter: '#5a2a18', antenna: false });
        label(n, 'KLET', kx + 42, 98, 7, '#f8f0d8', '#3a2010');
        line(n, kx + 96, 154, kx + 96, 118, 0.8, '#3a2a1a'); line(n, kx + 96, 118, kx + 102, 118, 0.8, '#3a2a1a');
        glow(n, kx + 102, 122, 14, 'rgba(255,200,90,A)', 0.7);
        poly(n, [[kx + 100, 120], [kx + 104, 120], [kx + 104, 125], [kx + 100, 125]], '#ffd060', '#3a2a1a', 0.3);
        wicker(n, 0, W, 156, 11, true);
        // snowy road with sled runners and footprints
        n.fillStyle = vgrad(n, FLOOR_TOP, GAME_H, ['#c8d4ec', '#eef3fc']); n.fillRect(0, FLOOR_TOP, W, GAME_H - FLOOR_TOP);
        for (const ry of [190, 196]) { n.beginPath(); n.moveTo(0, ry); for (let x = 0; x <= W; x += 6) n.lineTo(x, ry + Math.sin(x / 40) * 2); n.lineWidth = 0.6; n.strokeStyle = 'rgba(120,140,190,0.7)'; n.stroke(); }
        for (let k = 0; k < W / 6; k++) { const fx = k * 6 + rnd() * 2, fy = 176 + Math.sin(k / 3) * 3 + (k % 2) * 3; oval(n, fx, fy, 1, 0.5, 'rgba(120,140,190,0.5)', null); }
        for (let k = 0; k < W * 0.5; k++) oval(n, rnd() * W, FLOOR_TOP + rnd() * 80, 0.4, 0.25, 'rgba(255,255,255,0.8)', null);
        n.fillStyle = vgrad(n, FLOOR_TOP, FLOOR_TOP + 8, ['rgba(60,70,130,0.35)', 'rgba(60,70,130,0)']); n.fillRect(0, FLOOR_TOP, W, 8);
        for (let x = 0; x < W; x += 8) { n.beginPath(); n.ellipse(x + 4, FLOOR_BOT + 6, 6 + rnd() * 3, 5, 0, Math.PI, 0); n.lineTo(x + 10, GAME_H); n.lineTo(x - 2, GAME_H); n.closePath(); n.fillStyle = '#f8fbff'; n.fill(); }
        line(n, 0, FLOOR_BOT + 2, W, FLOOR_BOT + 2, 0.4, 'rgba(120,140,190,0.5)');
        // falling snow over the whole scene
        for (let k = 0; k < W * 0.7; k++) oval(n, rnd() * W, rnd() * FLOOR_TOP, 0.35 + rnd() * 0.35, 0.35 + rnd() * 0.35, 'rgba(255,255,255,0.85)', null);
        return { far, near, farFactor: 0.2 };
    }

    // ---- Stage definitions --------------------------------------------------------------------
    // Each wave triggers when the camera reaches wave.x; the camera stays locked there until every
    // enemy in the wave is down. The last wave sits at width - GAME_W (the end of the stage).
    // Enemy entries: [type, side ('r' | 'l'), delay ms, weapon?]
    const LIST = [
        {
            name: 'MISIJA 1', title: 'SELO GRUNTOVEC', music: 'stage1', width: 1280, paint: village,
            props: [['drum', 420, 172], ['crate', 820, 166]],
            pickups: [['bat', 520, 200]],
            waves: [
                { x: 0, e: [['williams', 'r', 600], ['williams', 'r', 1800]] },
                { x: 320, e: [['williams', 'r', 0], ['roper', 'l', 800], ['williams', 'r', 2500, 'bat']] },
                { x: 640, e: [['linda', 'r', 0], ['roper', 'r', 700, 'knife'], ['williams', 'l', 2400]] },
                { x: 960, boss: true, e: [['abobo', 'r', 300], ['williams', 'l', 4000], ['linda', 'r', 9000]] },
            ],
        },
        {
            name: 'MISIJA 2', title: 'UZ DRAVU', music: 'stage2', width: 1600, paint: drava,
            props: [['drum', 700, 170], ['drum', 1180, 210]],
            pickups: [['knife', 400, 210]],
            waves: [
                { x: 0, e: [['linda', 'r', 600], ['williams', 'l', 1500]] },
                { x: 320, e: [['roper', 'r', 0, 'knife'], ['williams', 'r', 900], ['williams', 'l', 2400, 'bat']] },
                { x: 640, e: [['linda', 'r', 0], ['linda', 'l', 600], ['roper', 'r', 2600]] },
                { x: 960, e: [['abobo', 'r', 0], ['williams', 'l', 2000, 'bat']] },
                { x: 1280, boss: true, e: [['bolo', 'r', 300], ['roper', 'l', 3500], ['linda', 'r', 8000]] },
            ],
        },
        {
            name: 'MISIJA 3', title: 'ZIMSKA NOĆ', music: 'stage3', width: 1600, paint: winter,
            props: [['crate', 360, 174], ['drum', 1000, 206]],
            pickups: [['bat', 300, 210]],
            waves: [
                { x: 0, e: [['roper', 'r', 600], ['roper', 'l', 1400], ['linda', 'r', 3000]] },
                { x: 320, e: [['abobo', 'r', 0], ['williams', 'l', 1400, 'bat']] },
                { x: 640, e: [['linda', 'r', 0], ['williams', 'l', 300, 'knife'], ['roper', 'r', 2200], ['linda', 'l', 4200]] },
                { x: 960, e: [['burnov', 'r', 200], ['williams', 'l', 5000]] },
                { x: 1280, boss: true, e: [['shadow', 'r', 600]] },
            ],
        },
    ];

    return { LIST, village };
})();
