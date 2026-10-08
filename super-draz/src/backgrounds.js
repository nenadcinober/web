// Parallax backdrops painted like Hlebine glass paintings: a high horizon, patchwork fields,
// trees built leaf by leaf, a sun with a face. Each theme has a far and a near layer, 2048 px
// wide and seamless so they can repeat.
const Backgrounds = (() => {
    const { canvas, rng, shade, poly, oval, rect, line, vgrad, flame, INK } = Art;
    const BW = 2048;

    function sunFace(x, cx, cy, r, col = '#f8c830', rays = true) {
        if (rays) for (let i = 0; i < 16; i++) {
            const a = i / 16 * Math.PI * 2, a2 = a + 0.12;
            poly(x, [[cx + Math.cos(a - 0.12) * r * 1.05, cy + Math.sin(a - 0.12) * r * 1.05], [cx + Math.cos(a) * r * (i % 2 ? 1.45 : 1.7), cy + Math.sin(a) * r * (i % 2 ? 1.45 : 1.7)],
                [cx + Math.cos(a2) * r * 1.05, cy + Math.sin(a2) * r * 1.05]], i % 2 ? '#f6a020' : col, 1.5);
        }
        oval(x, cx, cy, r, r, col, 2.5);
        oval(x, cx - r * 0.35, cy - r * 0.15, r * 0.1, r * 0.13, INK, 0);
        oval(x, cx + r * 0.35, cy - r * 0.15, r * 0.1, r * 0.13, INK, 0);
        line(x, [[cx - r * 0.5, cy - r * 0.38], [cx - r * 0.2, cy - r * 0.4]], 2, INK);
        line(x, [[cx + r * 0.2, cy - r * 0.4], [cx + r * 0.5, cy - r * 0.38]], 2, INK);
        oval(x, cx - r * 0.5, cy + r * 0.2, r * 0.17, r * 0.12, 'rgba(230,80,60,0.5)', 0);
        oval(x, cx + r * 0.5, cy + r * 0.2, r * 0.17, r * 0.12, 'rgba(230,80,60,0.5)', 0);
        x.beginPath(); x.arc(cx, cy + r * 0.12, r * 0.32, 0.25, Math.PI - 0.25); x.lineWidth = 2.2; x.strokeStyle = INK; x.stroke();
        line(x, [[cx, cy - r * 0.1], [cx - r * 0.06, cy + r * 0.1], [cx + r * 0.04, cy + r * 0.12]], 1.6, INK);
    }

    function cloud(x, cx, cy, w, fill = '#ffffff', edge = 'rgba(70,90,130,0.6)') {
        const puffs = [[-0.36, 0.08, 0.22], [-0.14, -0.12, 0.28], [0.12, -0.16, 0.3], [0.36, 0.06, 0.22], [0, 0.1, 0.3]];
        x.beginPath();
        for (const [ox, oy, r] of puffs) { x.moveTo(cx + ox * w + r * w, cy + oy * w); x.arc(cx + ox * w, cy + oy * w, r * w, 0, 7); }
        x.lineWidth = 2.2; x.strokeStyle = edge; x.stroke();
        x.fillStyle = fill; x.fill();
    }

    function leaves(x, rnd, cx, cy, rx, ry, colors, n, size = 4) {
        for (let i = 0; i < n; i++) {
            const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
            oval(x, cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, size, size * 0.5, colors[i % colors.length], 0.6, 'rgba(30,40,20,0.7)', rnd() * 3);
        }
    }

    function tree(x, rnd, cx, base, h, greens) {
        const cr = h * 0.33, cy = base - h + cr;
        poly(x, [[cx - 8, base], [cx - 5, cy + cr * 0.3], [cx + 5, cy + cr * 0.3], [cx + 8, base]], '#5a3a24', 2);
        line(x, [[cx, cy + cr * 0.6], [cx - cr * 0.5, cy]], 3, '#5a3a24');
        line(x, [[cx, cy + cr * 0.5], [cx + cr * 0.45, cy - cr * 0.1]], 3, '#5a3a24');
        oval(x, cx, cy, cr, cr * 1.02, shade(greens[0], 0.7), 2);
        leaves(x, rnd, cx, cy, cr * 0.95, cr * 0.95, greens, Math.floor(cr * cr / 9), 5);
        for (let i = 0; i < 6; i++) oval(x, cx + (rnd() - 0.5) * cr * 1.4, cy + (rnd() - 0.5) * cr * 1.4, 3.5, 3.5, '#e83a2a', 1);
    }

    function poplar(x, rnd, cx, base, h, greens) {
        rect(x, cx - 3, base - h * 0.2, 6, h * 0.2, '#4a3020', 1.4);
        oval(x, cx, base - h * 0.58, h * 0.12, h * 0.42, shade(greens[0], 0.7), 2);
        leaves(x, rnd, cx, base - h * 0.58, h * 0.11, h * 0.4, greens, Math.floor(h * 0.9), 4);
    }

    function willow(x, rnd, cx, base, h) {
        poly(x, [[cx - 10, base], [cx - 6, base - h * 0.55], [cx + 6, base - h * 0.55], [cx + 12, base]], '#4a3424', 2);
        oval(x, cx, base - h * 0.65, h * 0.45, h * 0.3, '#3a5a2a', 2);
        for (let i = 0; i < 70; i++) {
            const sx = cx - h * 0.45 + rnd() * h * 0.9, sy = base - h * 0.75 + rnd() * h * 0.2;
            line(x, [[sx, sy], [sx + (rnd() - 0.5) * 8, sy + h * 0.35 + rnd() * h * 0.2]], 2, ['#5a8a3a', '#7aa84a', '#4a7a30'][i % 3]);
        }
    }

    function farmHouse(x, rnd, cx, base, w, h) {
        rect(x, cx - w / 2, base - h, w, h, '#f6f0e2', 2);
        rect(x, cx - w / 2, base - h * 0.18, w, h * 0.18, '#3a64b0', 1.5);
        const nw = Math.max(1, Math.round(w / 40));
        for (let i = 0; i < nw; i++) {
            const wx = cx - w / 2 + (i + 0.5) * w / nw - 8;
            rect(x, wx, base - h * 0.7, 16, 18, '#7ab0e0', 1.8);
            line(x, [[wx + 8, base - h * 0.7], [wx + 8, base - h * 0.7 + 18]], 1.4, INK);
            for (let j = 0; j < 3; j++) oval(x, wx + 3 + j * 5, base - h * 0.7 + 19, 2.6, 2.4, '#e02828', 0.8);
        }
        poly(x, [[cx - w / 2 - 10, base - h], [cx, base - h - h * 0.9], [cx + w / 2 + 10, base - h]], '#c89a4a', 2);
        for (let i = 0; i < w / 6; i++) {
            const px = cx - w / 2 - 6 + i * 6;
            line(x, [[px, base - h - 2], [px + (cx - px) * 0.25, base - h - h * 0.6 + Math.abs(px - cx) * 0.6 * h * 0.9 / (w / 2)]], 1, '#8a6224');
        }
        rect(x, cx + w * 0.2, base - h - h * 0.75, 10, h * 0.4, '#e8dcc8', 1.5);
    }

    function church(x, cx, base, s) {
        rect(x, cx - 40 * s, base - 70 * s, 110 * s, 70 * s, '#f4e8b8', 2);
        poly(x, [[cx - 46 * s, base - 70 * s], [cx + 20 * s, base - 110 * s], [cx + 76 * s, base - 70 * s]], '#b4502c', 2);
        rect(x, cx - 20 * s, base - 170 * s, 36 * s, 170 * s, '#f4d880', 2);
        rect(x, cx - 10 * s, base - 150 * s, 16 * s, 22 * s, '#3a2a20', 1.5);
        oval(x, cx - 2 * s, base - 195 * s, 20 * s, 26 * s, '#6a4a2a', 2);
        oval(x, cx - 2 * s, base - 222 * s, 8 * s, 10 * s, '#6a4a2a', 1.6);
        line(x, [[cx - 2 * s, base - 232 * s], [cx - 2 * s, base - 254 * s]], 2.4, '#e0b030');
        line(x, [[cx - 10 * s, base - 246 * s], [cx + 6 * s, base - 246 * s]], 2.4, '#e0b030');
        rect(x, cx - 24 * s, base - 42 * s, 14 * s, 18 * s, '#7ab0e0', 1.4);
        rect(x, cx + 30 * s, base - 42 * s, 14 * s, 18 * s, '#7ab0e0', 1.4);
    }

    function well(x, cx, base) {
        // a shadoof well (đeram): post, long sweep pole and bucket
        rect(x, cx - 22, base - 26, 44, 26, '#a89a86', 2);
        for (let i = 0; i < 3; i++) line(x, [[cx - 22, base - 8 - i * 8], [cx + 22, base - 8 - i * 8]], 1, INK);
        poly(x, [[cx + 40, base], [cx + 46, base - 110], [cx + 54, base - 110], [cx + 58, base]], '#7a5230', 2);
        line(x, [[cx - 20, base - 150], [cx + 110, base - 70]], 6, INK); line(x, [[cx - 20, base - 150], [cx + 110, base - 70]], 3.5, '#a87840');
        line(x, [[cx - 18, base - 148], [cx - 4, base - 36]], 1.6, INK);
        rect(x, cx - 12, base - 40, 16, 14, '#7a5230', 1.6);
        rect(x, cx + 100, base - 76, 22, 22, '#8a8478', 1.6);
    }

    function stork(x, cx, cy) {
        oval(x, cx, cy, 14, 6, '#f8f6ee', 1.6);
        poly(x, [[cx - 6, cy - 2], [cx - 24, cy - 8], [cx - 6, cy + 4]], '#1e1e24', 1.2);
        poly(x, [[cx + 2, cy - 2], [cx + 18, cy - 14], [cx + 6, cy + 3]], '#f8f6ee', 1.2);
        line(x, [[cx + 12, cy], [cx + 22, cy - 2]], 3, '#f8f6ee');
        line(x, [[cx + 22, cy - 2], [cx + 36, cy + 2]], 2, '#e84020');
        line(x, [[cx - 8, cy + 4], [cx - 18, cy + 14]], 1.5, '#e84020');
    }

    // ---- village ------------------------------------------------------------------------------
    function villageFar() {
        const [c, x] = canvas(BW, VH), rnd = rng(101);
        x.fillStyle = vgrad(x, 0, 470, ['#7cbce6', '#bfe0ee', '#f4eed2']); x.fillRect(0, 0, BW, 470);
        sunFace(x, 280, 150, 54);
        for (const [cx, cy, w] of [[700, 120, 150], [1100, 200, 110], [1500, 110, 170], [1880, 220, 120], [520, 300, 90]]) cloud(x, cx, cy, w);
        // birds
        for (let i = 0; i < 6; i++) { const bx = 900 + i * 40 + rnd() * 30, by = 240 + rnd() * 50; line(x, [[bx - 8, by - 3], [bx, by], [bx + 8, by - 3]], 2, INK); }
        // distant hills (periodic so the layer tiles)
        x.beginPath(); x.moveTo(0, VH);
        for (let px = 0; px <= BW; px += 16) x.lineTo(px, 440 - 30 * Math.sin(px / BW * Math.PI * 4) - 16 * Math.sin(px / BW * Math.PI * 10 + 1));
        x.lineTo(BW, VH); x.closePath(); x.fillStyle = '#8ab884'; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(40,60,40,0.6)'; x.stroke();
        // patchwork fields
        const fields = ['#e8c850', '#94c454', '#c89a48', '#b4d470', '#a87444', '#d8b04c', '#7ab048'];
        const rows = [450, 490, 535, 590, 660, VH];
        for (let r = 0; r < rows.length - 1; r++) {
            let px = -rnd() * 100;
            while (px < BW) {
                const w = 120 + rnd() * 260, col = fields[Math.floor(rnd() * fields.length)];
                const pw = Math.min(w, BW - px);
                poly(x, [[px, rows[r]], [px + pw, rows[r]], [px + pw + (r - 2) * 6, rows[r + 1]], [px + (r - 2) * 6, rows[r + 1]]], col, 1.5, 'rgba(60,50,30,0.6)');
                for (let k = 1; k < 5; k++) {
                    const yy = rows[r] + (rows[r + 1] - rows[r]) * k / 5;
                    line(x, [[px + 4, yy], [px + pw - 4, yy]], 1, shade(col, 0.85));
                }
                px += w;
            }
        }
        // tiny houses, lollipop trees and the church
        for (let i = 0; i < 14; i++) {
            const tx = 60 + i * 140 + rnd() * 60, ty = 448 + rnd() * 30;
            rect(x, tx - 1.5, ty, 3, 10, '#5a3a24');
            oval(x, tx, ty - 6, 8, 9, ['#3a8a30', '#5aa03a', '#2e7428'][i % 3], 1.2);
        }
        for (let i = 0; i < 6; i++) farmHouse(x, rnd, 120 + i * 330 + rnd() * 80, 470 + rnd() * 16, 40, 22);
        church(x, 1240, 470, 0.7);
        return c;
    }
    function villageNear() {
        const [c, x] = canvas(BW, VH), rnd = rng(202);
        const greens = ['#3a8a30', '#4ea03a', '#68b444', '#2e7428', '#86c04c'];
        x.beginPath(); x.moveTo(0, VH);
        for (let px = 0; px <= BW; px += 16) x.lineTo(px, 600 - 14 * Math.sin(px / BW * Math.PI * 6));
        x.lineTo(BW, VH); x.closePath(); x.fillStyle = '#6aa840'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#2e5a1a'; x.stroke();
        for (let i = 0; i < 220; i++) {
            const gx = rnd() * BW, gy = 610 + rnd() * 150;
            oval(x, gx, gy, 2.2, 2.2, ['#f4f4f0', '#f05050', '#f0d040', '#6a8ae0'][i % 4], 0.5);
        }
        farmHouse(x, rnd, 260, 620, 170, 90);
        farmHouse(x, rnd, 1180, 625, 150, 80);
        stork(x, 300, 470);
        well(x, 1520, 640);
        tree(x, rnd, 560, 640, 250, greens);
        tree(x, rnd, 860, 630, 200, greens);
        poplar(x, rnd, 980, 630, 260, greens);
        poplar(x, rnd, 1030, 635, 230, greens);
        tree(x, rnd, 1780, 640, 270, greens);
        poplar(x, rnd, 1960, 630, 240, greens);
        for (let i = 0; i < 5; i++) {
            const fx = 1300 + i * 20;
            poly(x, [[fx, 660], [fx, 620], [fx + 5, 614], [fx + 10, 620], [fx + 10, 660]], '#c09058', 1.4);
        }
        line(x, [[1296, 630], [1404, 630]], 4, '#9a7040');
        return c;
    }

    // ---- wine cellar --------------------------------------------------------------------------
    function cellarFar() {
        const [c, x] = canvas(BW, VH), rnd = rng(303);
        x.fillStyle = vgrad(x, 0, VH, ['#1e1410', '#3a2618', '#2a1c14']); x.fillRect(0, 0, BW, VH);
        for (let r = 0; r < 40; r++) for (let i = 0; i < 34; i++) {
            const bx = i * 64 + (r % 2 ? 32 : 0), by = r * 22;
            rect(x, bx + 1, by + 1, 62, 20, shade('#5a3424', 0.7 + rnd() * 0.4), 1, '#1a100c');
        }
        for (let i = 0; i < 8; i++) {
            const ax = 128 + i * 256;
            x.beginPath(); x.moveTo(ax - 110, VH); x.lineTo(ax - 110, 320); x.arc(ax, 320, 110, Math.PI, 0); x.lineTo(ax + 110, VH); x.closePath();
            x.fillStyle = 'rgba(10,6,4,0.55)'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#7a4a30'; x.stroke();
            for (let k = 0; k < 12; k++) {
                const a = Math.PI + k / 11 * Math.PI;
                line(x, [[ax + Math.cos(a) * 104, 320 + Math.sin(a) * 104], [ax + Math.cos(a) * 124, 320 + Math.sin(a) * 124]], 2, '#2a1810');
            }
            // a row of barrels in each arch
            for (let b = 0; b < 2; b++) {
                const bx = ax - 50 + b * 100, by = 560;
                oval(x, bx, by, 46, 46, '#7a4a24', 2);
                oval(x, bx, by, 34, 34, null, 1.5, '#4a2a14');
                oval(x, bx, by, 6, 6, '#3a2010', 1);
                rect(x, bx - 4, by + 28, 8, 12, '#c8a040', 1.2);
            }
        }
        return c;
    }
    function cellarNear() {
        const [c, x] = canvas(BW, VH), rnd = rng(404);
        for (let i = 0; i < 6; i++) {
            const cx = 170 + i * 340;
            const g = x.createRadialGradient(cx, 300, 0, cx, 300, 150);
            g.addColorStop(0, 'rgba(255,190,90,0.35)'); g.addColorStop(1, 'rgba(255,190,90,0)');
            x.fillStyle = g; x.beginPath(); x.arc(cx, 300, 150, 0, 7); x.fill();
            rect(x, cx - 8, 300, 16, 26, '#f0e4c0', 1.6);
            flame(x, cx, 290, 6, '#f8a020', '#fff2a0');
            rect(x, cx - 18, 326, 36, 6, '#4a3020', 1.4);
        }
        // strings of garlic, peppers and sausages from the beams
        rect(x, 0, 96, BW, 18, '#4a2e1c', 2);
        for (let i = 0; i < 16; i++) {
            const sx = 60 + i * 128 + rnd() * 30, kind = i % 3;
            line(x, [[sx, 114], [sx, 200]], 1.5, '#c8b080');
            for (let k = 0; k < 6; k++) {
                const yy = 130 + k * 13;
                if (kind === 0) oval(x, sx, yy, 7, 6, '#f4ecd8', 1.2);
                else if (kind === 1) { poly(x, [[sx - 4, yy - 5], [sx + 4, yy - 5], [sx, yy + 9]], '#d8241c', 1.2); }
                else oval(x, sx, yy, 4.5, 7, '#9a3a24', 1.2);
            }
        }
        // shelf of jars
        for (let i = 0; i < 4; i++) {
            const sx = 300 + i * 500;
            rect(x, sx, 470, 140, 8, '#6a4228', 1.6);
            for (let k = 0; k < 6; k++) {
                const col = ['#c8402a', '#e0a020', '#6a2a5a', '#4a8a30'][(i + k) % 4];
                rect(x, sx + 8 + k * 22, 446, 16, 24, col, 1.4);
                rect(x, sx + 8 + k * 22, 442, 16, 6, '#f4ecd8', 1.2);
            }
        }
        return c;
    }

    // ---- the Drava at sunset ------------------------------------------------------------------
    function riverFar() {
        const [c, x] = canvas(BW, VH), rnd = rng(505);
        x.fillStyle = vgrad(x, 0, 480, ['#3a2a6a', '#8a3a7a', '#e05a6a', '#f6a048', '#fad478']); x.fillRect(0, 0, BW, 480);
        sunFace(x, 1000, 440, 88, '#ffd050', false);
        for (const [cx, cy, w] of [[300, 160, 140], [700, 90, 110], [1500, 150, 160], [1850, 260, 110]]) cloud(x, cx, cy, w, '#f8c8b0', 'rgba(90,40,70,0.6)');
        for (let i = 0; i < 7; i++) { const bx = 1300 + i * 35 + rnd() * 20, by = 220 + rnd() * 50; line(x, [[bx - 8, by - 3], [bx, by], [bx + 8, by - 3]], 2, '#2a1a30'); }
        // far bank of poplars
        for (let i = 0; i < 60; i++) {
            const px = i * 34 + rnd() * 10, h = 40 + rnd() * 50;
            oval(x, px, 470 - h / 2, 9, h / 2, '#3a2a4a', 1.2, '#20142a');
        }
        rect(x, 0, 466, BW, 10, '#3a2a4a');
        x.fillStyle = vgrad(x, 476, VH, ['#e8905a', '#9a5a7a', '#3a4a8a']); x.fillRect(0, 476, BW, VH - 476);
        for (let i = 0; i < 140; i++) {
            const wy = 486 + rnd() * 280, wx = rnd() * BW, w = 20 + rnd() * 60;
            line(x, [[wx, wy], [wx + w, wy]], 2, Math.abs(wx - 1000) < 140 && wy < 640 ? 'rgba(255,220,120,0.8)' : 'rgba(255,230,220,0.35)');
        }
        return c;
    }
    function riverNear() {
        const [c, x] = canvas(BW, VH), rnd = rng(606);
        willow(x, rnd, 220, 650, 300);
        willow(x, rnd, 1300, 650, 260);
        // fishing hut on stilts
        const hx = 760;
        for (let i = 0; i < 4; i++) line(x, [[hx - 60 + i * 40, 560], [hx - 60 + i * 40, 680]], 5, '#4a3020');
        rect(x, hx - 80, 550, 160, 12, '#7a5230', 2);
        rect(x, hx - 60, 470, 120, 80, '#9a7040', 2);
        for (let i = 0; i < 8; i++) line(x, [[hx - 60 + i * 15, 470], [hx - 60 + i * 15, 550]], 1, '#5a3a20');
        poly(x, [[hx - 80, 474], [hx, 410], [hx + 80, 474]], '#c89a4a', 2);
        rect(x, hx - 12, 500, 24, 50, '#3a2414', 1.6);
        // boat
        poly(x, [[1660, 640], [1820, 640], [1790, 668], [1690, 668]], '#6a3a1c', 2);
        line(x, [[1700, 646], [1780, 646]], 2, '#c8a060');
        line(x, [[1740, 640], [1800, 590]], 3, '#8a6034');
        for (let i = 0; i < 12; i++) {
            const rx = 100 + i * 170 + rnd() * 40;
            for (let k = 0; k < 6; k++) {
                const h = 50 + rnd() * 50;
                line(x, [[rx + k * 6, 690], [rx + k * 6 + rnd() * 8 - 4, 690 - h]], 2.4, k % 2 ? '#4a7a30' : '#2e5a24');
                if (k % 3 === 0) oval(x, rx + k * 6, 694 - h, 3, 8, '#6a3a1c', 1);
            }
        }
        return c;
    }

    // ---- castle -------------------------------------------------------------------------------
    function castleFar() {
        const [c, x] = canvas(BW, VH), rnd = rng(707);
        x.fillStyle = vgrad(x, 0, VH, ['#0e0a1e', '#2a1438', '#4a1a2a']); x.fillRect(0, 0, BW, VH);
        for (let i = 0; i < 160; i++) oval(x, rnd() * BW, rnd() * 420, 1.3, 1.3, '#f8f0c0', 0);
        sunFace(x, 520, 170, 60, '#f4ecc0', false);
        for (let i = 0; i < 9; i++) {
            const tx = 60 + i * 230 + rnd() * 50, h = 220 + rnd() * 200, w = 60 + rnd() * 50;
            rect(x, tx, VH - h, w, h, '#1a1024', 2, '#0a0610');
            for (let k = 0; k < Math.floor(w / 18); k++) rect(x, tx + k * 18, VH - h - 14, 10, 14, '#1a1024');
            for (let k = 0; k < 4; k++) rect(x, tx + 12 + rnd() * (w - 30), VH - h + 30 + rnd() * (h - 80), 8, 14, '#f0b040');
        }
        return c;
    }
    function castleNear() {
        const [c, x] = canvas(BW, VH);
        for (let i = 0; i < 4; i++) {
            const px = 256 + i * 512;
            rect(x, px - 60, 140, 120, VH - 140, '#3a3444', 2.5, '#141018');
            for (let r = 0; r < 18; r++) {
                const off = r % 2 ? 20 : 0;
                for (let k = 0; k < 3; k++) rect(x, px - 60 + off + k * 40 - (off ? 20 : 0), 140 + r * 34, 40, 34, null, 1.2, '#1e1a24');
            }
            // banner with the black crow of Crni Dudek
            poly(x, [[px - 40, 180], [px + 40, 180], [px + 40, 330], [px, 300], [px - 40, 330]], '#8a1414', 2);
            oval(x, px, 240, 18, 12, '#141018', 0); oval(x, px + 16, 230, 8, 7, '#141018', 0);
            poly(x, [[px + 22, 228], [px + 32, 232], [px + 22, 235]], '#e0b030', 0);
            for (const s of [-1, 1]) {
                const tx = px + s * 120;
                const g = x.createRadialGradient(tx, 380, 0, tx, 380, 110);
                g.addColorStop(0, 'rgba(255,150,60,0.35)'); g.addColorStop(1, 'rgba(255,150,60,0)');
                x.fillStyle = g; x.beginPath(); x.arc(tx, 380, 110, 0, 7); x.fill();
                rect(x, tx - 4, 380, 8, 30, '#5a3a20', 1.4);
                flame(x, tx, 368, 10);
            }
        }
        return c;
    }

    const PAINTERS = {
        village: [villageFar, villageNear],
        cellar: [cellarFar, cellarNear],
        river: [riverFar, riverNear],
        castle: [castleFar, castleNear],
    };

    function ensure(scene, theme) {
        const [far, near] = PAINTERS[theme];
        if (!scene.textures.exists('bgfar_' + theme)) scene.textures.addCanvas('bgfar_' + theme, far());
        if (!scene.textures.exists('bgnear_' + theme)) scene.textures.addCanvas('bgnear_' + theme, near());
    }

    // lay copies of each layer across the level with parallax scroll factors
    function addTo(scene, theme, worldW) {
        ensure(scene, theme);
        const layers = [['bgfar_' + theme, 0.2, 0], ['bgnear_' + theme, 0.5, 1]];
        for (const [key, f, depth] of layers) {
            const span = (worldW - VW) * f + VW;
            for (let i = 0; i * BW < span + BW; i++) scene.add.image(i * BW, 0, key).setOrigin(0, 0).setScrollFactor(f).setDepth(depth);
        }
    }

    return { ensure, addTo, sunFace, cloud };
})();
