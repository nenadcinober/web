// Stage backgrounds are painted once into canvases at RES pixels per unit: a far layer that tiles
// horizontally behind everything, and a near layer as wide as the stage (sliced into chunks later
// so no single GPU texture gets too wide).
const GAME_W = 320, GAME_H = 240;
const FLOOR_TOP = 156, FLOOR_BOT = 232;

const Stages = (() => {
    const FAR_W = 640;

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
    function hgrad(x, x0, x1, stops) {
        const g = x.createLinearGradient(x0, 0, x1, 0);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        return g;
    }
    function glow(x, cx, cy, r, color, alpha = 1) {
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color.replace('A', alpha)); g.addColorStop(1, color.replace('A', 0));
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    function line(x, x0, y0, x1, y1, w, c) { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineWidth = w; x.strokeStyle = c; x.stroke(); }
    function neonText(x, s, cx, cy, size, color, glowColor) {
        x.save();
        x.font = `bold ${size}px Impact, "Arial Black", sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.shadowColor = glowColor || color; x.shadowBlur = 14;
        x.lineWidth = size * 0.12; x.strokeStyle = color; x.strokeText(s, cx, cy);
        x.shadowBlur = 6; x.fillStyle = '#ffffff'; x.globalAlpha = 0.9; x.fillText(s, cx, cy);
        x.restore();
    }

    // A wrap-around skyline for the far layer.
    function skyline(x, rnd, baseY, minH, maxH, body, edge, windows, winRate) {
        let px = 0;
        while (px < FAR_W) {
            const bw = 16 + rnd() * 40, bh = minH + rnd() * (maxH - minH);
            const top = baseY - bh;
            for (const off of [0, -FAR_W]) {
                const bx = px + off;
                R(x, bx, top, bw, bh, body);
                R(x, bx, top, 0.6, bh, edge);
                if (rnd() < 0.35) { R(x, bx + bw * 0.5 - 0.4, top - 10, 0.8, 10, body); glow(x, bx + bw * 0.5, top - 10, 2, 'rgba(255,60,60,A)', 0.9); }
                if (rnd() < 0.25) R(x, bx + 3, top - 3, bw - 6, 3, body);
            }
            const wr = rnd() * winRate;
            for (let wy = top + 3; wy < baseY - 2; wy += 3.4)
                for (let wx = px + 2; wx < px + bw - 2; wx += 2.6)
                    if (rnd() < wr) {
                        const c = windows[Math.floor(rnd() * windows.length)];
                        R(x, wx, wy, 1.4, 1.8, c);
                        if (wx + 1 > FAR_W) R(x, wx - FAR_W, wy, 1.4, 1.8, c);
                    }
            px += bw + rnd() * 3;
        }
    }

    function stars(x, rnd, n, maxY) {
        for (let i = 0; i < n; i++) {
            const sx = rnd() * FAR_W, sy = rnd() * maxY, r = rnd() * 0.45 + 0.15;
            x.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill();
            if (rnd() < 0.05) { line(x, sx - 2, sy, sx + 2, sy, 0.15, 'rgba(255,255,255,0.6)'); line(x, sx, sy - 2, sx, sy + 2, 0.15, 'rgba(255,255,255,0.6)'); }
        }
    }

    // Concrete-ish floor with perspective seams.
    function floor(x, W, y0, y1, top, bottom, seam, rnd, tile = 40) {
        x.fillStyle = vgrad(x, y0, y1, [top, bottom]); x.fillRect(0, y0, W, y1 - y0);
        let y = y0 + 6, step = 6;
        while (y < y1) { line(x, 0, y, W, y, 0.35, seam); step *= 1.25; y += step; }
        for (let tx = -60; tx < W + 60; tx += tile) line(x, tx, y0, tx - 34, y1, 0.35, seam);
        for (let i = 0; i < W * 1.5; i++) {
            x.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
            x.fillRect(rnd() * W, y0 + rnd() * (y1 - y0), 0.5 + rnd() * 1.5, 0.3);
        }
    }

    function hazard(x, W, y) {
        R(x, 0, y, W, GAME_H - y, '#e8c020');
        x.save(); x.beginPath(); x.rect(0, y, W, GAME_H - y); x.clip();
        x.fillStyle = '#1a1a1a';
        for (let tx = -10; tx < W; tx += 10) { x.beginPath(); x.moveTo(tx, y); x.lineTo(tx + 5, y); x.lineTo(tx + 13, GAME_H); x.lineTo(tx + 8, GAME_H); x.closePath(); x.fill(); }
        x.fillStyle = vgrad(x, y, GAME_H, ['rgba(255,255,255,0.35)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.4)']); x.fillRect(0, y, W, GAME_H - y);
        x.restore();
        line(x, 0, y, W, y, 0.6, '#5a4a10');
    }

    // ---- Stage 1: rooftop heliport at night ---------------------------------------------------
    function heliport(W) {
        const rnd = rng(7);
        const [far, f] = canvas(FAR_W, FLOOR_TOP);
        f.fillStyle = vgrad(f, 0, FLOOR_TOP, ['#03021a', '#0d0a36', '#211656', '#3e2770', '#6a3a7a', '#8a4a70']);
        f.fillRect(0, 0, FAR_W, FLOOR_TOP);
        stars(f, rnd, 260, 90);
        glow(f, 470, 34, 30, 'rgba(255,240,200,A)', 0.25);
        f.beginPath(); f.arc(470, 34, 11, 0, 7); f.fillStyle = vgrad(f, 23, 45, ['#fffbe8', '#e8dcb0']); f.fill();
        for (const [cx, cy, r] of [[466, 31, 2], [474, 37, 1.5], [469, 39, 1]]) { f.beginPath(); f.arc(cx, cy, r, 0, 7); f.fillStyle = 'rgba(180,170,130,0.5)'; f.fill(); }
        skyline(f, rnd, FLOOR_TOP, 50, 110, '#1e1840', 'rgba(120,110,200,0.25)', ['#6a5a98', '#8070b0'], 0.25);
        f.fillStyle = vgrad(f, 90, FLOOR_TOP, ['rgba(140,70,120,0)', 'rgba(140,70,120,0.35)']); f.fillRect(0, 90, FAR_W, FLOOR_TOP - 90);
        skyline(f, rnd, FLOOR_TOP, 25, 75, '#0c0a20', 'rgba(150,140,220,0.3)', ['#ffd870', '#ffe8a0', '#80e0ff', '#ff9050'], 0.5);

        const [near, n] = canvas(W, GAME_H);
        // water tower
        const wt = 70;
        for (const lx of [wt + 4, wt + 36]) { R(n, lx, 76, 2.4, 50, '#2e2e3c'); R(n, lx, 76, 0.7, 50, '#5a5a70'); }
        line(n, wt + 6, 80, wt + 36, 118, 0.8, '#2e2e3c'); line(n, wt + 36, 80, wt + 6, 118, 0.8, '#2e2e3c');
        n.fillStyle = hgrad(n, wt, wt + 42, ['#5a3420', '#a0663a', '#7a4628', '#3a2010']); n.fillRect(wt, 30, 42, 48);
        for (let k = 0; k < 42; k += 3) line(n, wt + k, 30, wt + k, 78, 0.2, 'rgba(30,15,5,0.5)');
        for (const yy of [38, 54, 70]) { R(n, wt - 0.5, yy, 43, 1.6, '#2a2a30'); R(n, wt - 0.5, yy, 43, 0.4, '#70707a'); }
        n.beginPath(); n.moveTo(wt - 3, 31); n.lineTo(wt + 21, 18); n.lineTo(wt + 45, 31); n.closePath();
        n.fillStyle = hgrad(n, wt, wt + 42, ['#4a2a18', '#8a5430', '#3a2010']); n.fill(); n.lineWidth = 0.6; n.strokeStyle = '#140a08'; n.stroke();
        // neon sign on scaffolding
        const sx = Math.floor(W * 0.55);
        for (const lx of [sx + 14, sx + 120]) { R(n, lx, 56, 2.5, 70, '#25252e'); R(n, lx, 56, 0.6, 70, '#55556a'); }
        for (let k = 0; k < 4; k++) line(n, sx + 16, 64 + k * 16, sx + 120, 72 + k * 16, 0.6, '#25252e');
        n.fillStyle = vgrad(n, 26, 58, ['#1c1024', '#120a18']); n.fillRect(sx, 26, 136, 32);
        n.lineWidth = 0.8; n.strokeStyle = '#3a2a40'; n.strokeRect(sx, 26, 136, 32);
        neonText(n, 'DRAGON', sx + 68, 38, 15, '#ff3c8c');
        neonText(n, 'H O T E L', sx + 68, 52, 7, '#40e8ff');
        glow(n, sx + 68, 42, 70, 'rgba(255,60,140,A)', 0.12);
        // chain-link fence
        R(n, 0, 64, W, 1.6, '#8a8aa4'); R(n, 0, 64, W, 0.5, '#c0c0d8');
        n.save(); n.beginPath(); n.rect(0, 65.6, W, 56.4); n.clip();
        n.lineWidth = 0.3; n.strokeStyle = 'rgba(150,150,180,0.55)';
        for (let x0 = -60; x0 < W + 60; x0 += 4) { n.beginPath(); n.moveTo(x0, 66); n.lineTo(x0 + 56, 122); n.moveTo(x0 + 56, 66); n.lineTo(x0, 122); n.stroke(); }
        n.restore();
        for (let px = 12; px < W; px += 96) {
            n.fillStyle = hgrad(n, px, px + 3, ['#50506a', '#b8b8d0', '#40405a']); n.fillRect(px, 60, 3, 64);
            n.beginPath(); n.arc(px + 1.5, 60, 1.8, 0, 7); n.fillStyle = '#9090a8'; n.fill();
        }
        // parapet
        n.fillStyle = vgrad(n, 122, FLOOR_TOP, ['#8a849a', '#6a647c', '#4e485e']); n.fillRect(0, 122, W, FLOOR_TOP - 122);
        R(n, 0, 120, W, 4, '#a8a2b8'); R(n, 0, 120, W, 0.8, '#d0cae0'); R(n, 0, 124, W, 1, 'rgba(0,0,0,0.35)');
        for (let k = 0; k < W; k += 32) { line(n, k, 125, k, FLOOR_TOP, 0.35, 'rgba(30,25,40,0.6)'); line(n, k + 0.5, 125, k + 0.5, FLOOR_TOP, 0.2, 'rgba(255,255,255,0.12)'); }
        for (let i = 0; i < W / 30; i++) { const ux = rnd() * W; n.fillStyle = vgrad(n, 125, 125 + 10 + rnd() * 20, ['rgba(20,15,25,0.35)', 'rgba(20,15,25,0)']); n.fillRect(ux, 125, 1 + rnd() * 3, 30); }
        // rooftop AC units with fans
        for (let ax = 170; ax < W - 120; ax += 360 + Math.floor(rnd() * 140)) {
            n.fillStyle = 'rgba(0,0,0,0.35)'; n.fillRect(ax + 4, 150, 64, 6);
            n.fillStyle = hgrad(n, ax, ax + 60, ['#a8a8b4', '#8a8a96', '#6a6a76']); n.fillRect(ax, 104, 60, 50);
            n.fillStyle = vgrad(n, 98, 104, ['#d0d0dc', '#a0a0ac']); n.beginPath(); n.moveTo(ax, 104); n.lineTo(ax + 6, 98); n.lineTo(ax + 66, 98); n.lineTo(ax + 60, 104); n.closePath(); n.fill();
            n.fillStyle = '#5a5a66'; n.beginPath(); n.moveTo(ax + 60, 104); n.lineTo(ax + 66, 98); n.lineTo(ax + 66, 148); n.lineTo(ax + 60, 154); n.closePath(); n.fill();
            for (let k = 0; k < 9; k++) line(n, ax + 4, 110 + k * 4.4, ax + 34, 110 + k * 4.4, 0.6, '#4a4a56');
            n.beginPath(); n.arc(ax + 47, 128, 9, 0, 7); n.fillStyle = '#2a2a34'; n.fill(); n.lineWidth = 0.8; n.strokeStyle = '#c0c0cc'; n.stroke();
            for (let k = 0; k < 4; k++) { n.save(); n.translate(ax + 47, 128); n.rotate(k * Math.PI / 2 + 0.4); n.beginPath(); n.ellipse(4, 0, 4, 1.6, 0, 0, 7); n.fillStyle = '#7a7a88'; n.fill(); n.restore(); }
            n.lineWidth = 0.6; n.strokeStyle = '#141418'; n.strokeRect(ax, 104, 60, 50);
            R(n, ax + 66, 112, 30, 3, '#70707c'); R(n, ax + 94, 112, 3, 40, '#70707c');
        }
        // floor + helipads
        floor(n, W, FLOOR_TOP, GAME_H, '#33334a', '#54546a', 'rgba(20,20,30,0.55)', rnd, 44);
        n.fillStyle = vgrad(n, FLOOR_TOP, FLOOR_TOP + 10, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']); n.fillRect(0, FLOOR_TOP, W, 10);
        for (const hx of [280, W - 190]) {
            n.save(); n.translate(hx, 196); n.scale(1, 0.34);
            n.beginPath(); n.arc(0, 0, 100, 0, 7); n.fillStyle = 'rgba(70,70,92,0.9)'; n.fill();
            n.lineWidth = 6; n.strokeStyle = '#e8c838'; n.stroke();
            n.beginPath(); n.arc(0, 0, 88, 0, 7); n.lineWidth = 2; n.strokeStyle = 'rgba(240,240,220,0.8)'; n.stroke();
            n.restore();
            n.fillStyle = 'rgba(240,236,220,0.92)';
            n.beginPath(); n.moveTo(hx - 26, 210); n.lineTo(hx - 18, 182); n.lineTo(hx - 10, 182); n.lineTo(hx - 16, 210); n.closePath(); n.fill();
            n.beginPath(); n.moveTo(hx + 14, 210); n.lineTo(hx + 18, 182); n.lineTo(hx + 26, 182); n.lineTo(hx + 24, 210); n.closePath(); n.fill();
            n.beginPath(); n.moveTo(hx - 20, 199); n.lineTo(hx + 20, 199); n.lineTo(hx + 21, 193); n.lineTo(hx - 18, 193); n.closePath(); n.fill();
            for (let i = 0; i < 40; i++) { n.fillStyle = 'rgba(70,70,92,0.6)'; n.fillRect(hx - 30 + rnd() * 60, 182 + rnd() * 28, rnd() * 3, 0.5); }
            for (let a = 0; a < 12; a++) {
                const t = a / 12 * Math.PI * 2, lx = hx + Math.cos(t) * 104, ly = 196 + Math.sin(t) * 35;
                glow(n, lx, ly, 4, a % 2 ? 'rgba(80,160,255,A)' : 'rgba(255,80,80,A)', 0.8);
                n.beginPath(); n.arc(lx, ly, 0.9, 0, 7); n.fillStyle = '#ffffff'; n.fill();
            }
        }
        // puddles reflecting the neon
        for (let i = 0; i < W / 220; i++) {
            const px = 60 + rnd() * (W - 120), py = 176 + rnd() * 46, pw = 14 + rnd() * 20;
            n.save(); n.translate(px, py); n.scale(1, 0.25); n.beginPath(); n.arc(0, 0, pw, 0, 7);
            n.fillStyle = 'rgba(120,110,180,0.35)'; n.fill(); n.restore();
            line(n, px - pw * 0.5, py, px + pw * 0.3, py, 0.4, 'rgba(255,90,170,0.5)');
        }
        hazard(n, W, FLOOR_BOT + 2);
        return { far, near, farFactor: 0.2 };
    }

    // ---- Stage 2: city street at dusk ---------------------------------------------------------
    function street(W) {
        const rnd = rng(21);
        const [far, f] = canvas(FAR_W, FLOOR_TOP);
        f.fillStyle = vgrad(f, 0, FLOOR_TOP, ['#1e1036', '#4a1c50', '#8a2c54', '#d0504c', '#f08a48', '#f8c060']); f.fillRect(0, 0, FAR_W, FLOOR_TOP);
        glow(f, 150, 112, 60, 'rgba(255,220,120,A)', 0.45);
        f.beginPath(); f.arc(150, 112, 16, 0, 7); f.fillStyle = vgrad(f, 96, 128, ['#fff4c0', '#ffc060']); f.fill();
        for (let i = 0; i < 14; i++) {
            const cx = rnd() * FAR_W, cy = 20 + rnd() * 60, cw = 30 + rnd() * 60;
            for (let k = 0; k < 5; k++) {
                f.save(); f.translate(cx + (k - 2) * cw * 0.18, cy + Math.abs(k - 2) * 1.2); f.scale(1, 0.32);
                f.beginPath(); f.arc(0, 0, cw * (0.28 - Math.abs(k - 2) * 0.04), 0, 7);
                f.fillStyle = vgrad(f, -20, 20, ['rgba(255,190,150,0.5)', 'rgba(150,60,110,0.55)']); f.fill(); f.restore();
            }
        }
        skyline(f, rnd, FLOOR_TOP, 40, 120, '#4a2050', 'rgba(255,170,120,0.35)', ['#ffc070', '#ffe0a0'], 0.18);

        const [near, n] = canvas(W, GAME_H);
        let x = 0, idx = 0;
        const signs = ['BAR', 'CAFE', 'PAWN', '24H', 'NOODLE', 'GYM'];
        while (x < W) {
            const kind = [0, 2, 1, 0, 3, 2, 1][idx++ % 7], bw = 100 + Math.floor(rnd() * 70), top = 8 + Math.floor(rnd() * 40);
            n.save(); n.beginPath(); n.rect(x, 0, bw, FLOOR_TOP); n.clip();
            if (kind === 0) {          // brick tenement with fire escape
                n.fillStyle = vgrad(n, top, FLOOR_TOP, ['#9a4430', '#7a3424']); n.fillRect(x, top, bw, FLOOR_TOP - top);
                for (let y = top; y < FLOOR_TOP; y += 3) {
                    const off = (Math.round((y - top) / 3) % 2) * 3;
                    for (let bx = x - off; bx < x + bw; bx += 6) {
                        n.fillStyle = `rgba(${120 + rnd() * 50},${45 + rnd() * 20},${30 + rnd() * 15},0.55)`;
                        n.fillRect(bx + 0.3, y + 0.3, 5.4, 2.4);
                    }
                    line(n, x, y, x + bw, y, 0.3, 'rgba(60,30,25,0.6)');
                }
                R(n, x, top, bw, 3, '#5a2a20'); R(n, x, top, bw, 0.8, '#b06048');
                for (let wy = top + 10; wy < 108; wy += 28) for (let wx = x + 10; wx < x + bw - 22; wx += 28) {
                    const lit = rnd() < 0.5;
                    R(n, wx - 1, wy - 1, 18, 22, '#3a2018');
                    n.fillStyle = lit ? vgrad(n, wy, wy + 20, ['#ffe090', '#e09040']) : vgrad(n, wy, wy + 20, ['#3a4060', '#202438']); n.fillRect(wx, wy, 16, 20);
                    line(n, wx + 8, wy, wx + 8, wy + 20, 0.6, '#3a2018'); line(n, wx, wy + 10, wx + 16, wy + 10, 0.6, '#3a2018');
                    if (lit && rnd() < 0.5) { n.fillStyle = 'rgba(160,40,40,0.6)'; n.fillRect(wx, wy, 5, 20); }
                    R(n, wx - 2.5, wy + 20, 21, 2, '#c8b8a8'); R(n, wx - 2.5, wy + 21.4, 21, 0.6, '#5a4a40');
                }
                // fire escape
                const fx = x + bw * 0.55;
                for (let fy = top + 30; fy < 120; fy += 28) {
                    R(n, fx - 22, fy, 44, 1.4, '#1a1a20'); for (let k = 0; k < 44; k += 3) line(n, fx - 22 + k, fy - 6, fx - 22 + k, fy, 0.3, '#1a1a20');
                    line(n, fx - 22, fy - 6, fx + 22, fy - 6, 0.6, '#1a1a20');
                    line(n, fx + 12, fy, fx - 4, fy + 28, 0.6, '#1a1a20');
                }
                n.fillStyle = vgrad(n, 116, FLOOR_TOP, ['#2a1610', '#1a0e0a']); n.fillRect(x + bw / 2 - 12, 118, 24, FLOOR_TOP - 118);
                n.fillStyle = vgrad(n, 120, FLOOR_TOP, ['#6a3a24', '#4a2414']); n.fillRect(x + bw / 2 - 10, 120, 20, FLOOR_TOP - 120);
                n.beginPath(); n.arc(x + bw / 2 + 6, 138, 0.9, 0, 7); n.fillStyle = '#e0c060'; n.fill();
            } else if (kind === 1) {   // office block with garage shutter
                n.fillStyle = hgrad(n, x, x + bw, ['#8a8a9a', '#a8a8b8', '#787888']); n.fillRect(x, top, bw, FLOOR_TOP - top);
                R(n, x, top, bw, 2.4, '#c8c8d8');
                for (let wy = top + 8; wy < 98; wy += 16) {
                    n.fillStyle = vgrad(n, wy, wy + 11, ['#7a98c8', '#2a3a5a', '#3a5070']); n.fillRect(x + 6, wy, bw - 12, 11);
                    line(n, x + 6, wy + 2, x + bw - 6, wy + 2, 0.3, 'rgba(255,255,255,0.35)');
                    for (let wx = x + 6; wx < x + bw - 6; wx += 12) R(n, wx, wy, 1.2, 11, '#8a8a9a');
                    if (rnd() < 0.5) R(n, x + 6 + Math.floor(rnd() * (bw - 20) / 12) * 12 + 1.2, wy, 10.8, 11, 'rgba(255,230,150,0.55)');
                    R(n, x + 4, wy + 11, bw - 8, 1.6, '#c0c0d0');
                }
                R(n, x + 8, 104, bw - 16, 3, '#2a2a34');
                n.fillStyle = vgrad(n, 107, FLOOR_TOP, ['#7a7a86', '#56565e']); n.fillRect(x + 10, 107, bw - 20, FLOOR_TOP - 107);
                for (let y = 108; y < FLOOR_TOP; y += 2.6) { line(n, x + 10, y, x + bw - 10, y, 0.35, '#3e3e46'); line(n, x + 10, y + 0.6, x + bw - 10, y + 0.6, 0.2, 'rgba(255,255,255,0.18)'); }
                n.save(); n.font = 'bold 9px Impact, "Arial Black", sans-serif'; n.fillStyle = 'rgba(230,60,120,0.75)';
                n.translate(x + bw / 2 - 18, 132); n.rotate(-0.12); n.fillText('BLACK', 0, 0); n.fillText('WARRIORS', -4, 10); n.restore();
            } else if (kind === 2) {   // shop front with awning and neon sign
                n.fillStyle = vgrad(n, top, FLOOR_TOP, ['#3e5266', '#2a3a4a']); n.fillRect(x, top, bw, FLOOR_TOP - top);
                for (let wy = top + 8; wy < 74; wy += 20) for (let wx = x + 8; wx < x + bw - 18; wx += 22) {
                    n.fillStyle = rnd() < 0.4 ? vgrad(n, wy, wy + 13, ['#b0f0ff', '#4aa0c0']) : '#18222e'; n.fillRect(wx, wy, 13, 13);
                    n.lineWidth = 0.6; n.strokeStyle = '#1a2430'; n.strokeRect(wx, wy, 13, 13);
                }
                const sign = signs[Math.floor(rnd() * signs.length)], col = ['#ff4060', '#40ffb0', '#ffd040', '#60a0ff'][Math.floor(rnd() * 4)];
                n.fillStyle = '#10141c'; n.fillRect(x + bw / 2 - 26, 76, 52, 14);
                neonText(n, sign, x + bw / 2, 83.5, 10, col);
                const aw = ['#d82828', '#2878d8', '#2a9a50'][Math.floor(rnd() * 3)];
                for (let ax = x + 4, k = 0; ax < x + bw - 4; ax += 8, k++) {
                    n.fillStyle = k % 2 ? '#f0f0f0' : aw;
                    n.beginPath(); n.moveTo(ax, 93); n.lineTo(ax + 8, 93); n.lineTo(ax + 9, 104); n.quadraticCurveTo(ax + 4.5, 107, ax - 1, 104); n.closePath(); n.fill();
                }
                n.fillStyle = vgrad(n, 93, 107, ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.3)']); n.fillRect(x + 4, 93, bw - 8, 13);
                R(n, x + 8, 108, bw - 16, 34, '#1a2a38');
                n.fillStyle = vgrad(n, 110, 140, ['#7ab8d8', '#305878']); n.fillRect(x + 10, 110, bw - 20, 30);
                n.fillStyle = 'rgba(255,240,200,0.35)'; n.fillRect(x + 10, 110, bw - 20, 30);
                for (let k = 0; k < 4; k++) { n.fillStyle = ['#e0a040', '#c04040', '#40a060', '#e0e0e0'][k]; n.fillRect(x + 16 + k * 10, 128, 6, 12); }
                line(n, x + 14, 112, x + 30, 138, 1.4, 'rgba(255,255,255,0.3)');
                R(n, x + 8, 140, bw - 16, FLOOR_TOP - 140, '#24242c');
            } else {                   // alley: sky visible, fence and dumpster
                n.fillStyle = vgrad(n, 60, FLOOR_TOP, ['#2a1a34', '#1a1222']); n.fillRect(x, 60, bw, FLOOR_TOP - 60);
                n.fillStyle = 'rgba(255,170,120,0.08)'; n.fillRect(x, 60, bw, 40);
                n.save(); n.beginPath(); n.rect(x, 86, bw, 50); n.clip();
                n.lineWidth = 0.3; n.strokeStyle = 'rgba(160,150,180,0.5)';
                for (let fx = x - 50; fx < x + bw + 50; fx += 4) { n.beginPath(); n.moveTo(fx, 86); n.lineTo(fx + 50, 136); n.moveTo(fx + 50, 86); n.lineTo(fx, 136); n.stroke(); }
                n.restore();
                R(n, x, 84, bw, 2, '#8a8098');
                n.fillStyle = vgrad(n, 120, FLOOR_TOP, ['#3a7a48', '#1e4a28']); n.fillRect(x + 12, 122, 40, 34);
                n.fillStyle = '#4a9a5a'; n.beginPath(); n.moveTo(x + 10, 122); n.lineTo(x + 54, 122); n.lineTo(x + 50, 116); n.lineTo(x + 14, 116); n.closePath(); n.fill();
                n.lineWidth = 0.6; n.strokeStyle = '#102014'; n.strokeRect(x + 12, 122, 40, 34);
                n.fillStyle = hgrad(n, x + 60, x + 76, ['#4a4a52', '#8a8a92', '#3a3a42']); n.fillRect(x + 60, 130, 16, 26);
                for (let i = 0; i < 4; i++) { n.fillStyle = 'rgba(200,200,200,0.5)'; n.beginPath(); n.arc(x + 20 + i * 9, 116 - rnd() * 3, 2 + rnd() * 2, 0, 7); n.fill(); }
            }
            n.restore();
            n.fillStyle = 'rgba(0,0,0,0.5)'; n.fillRect(x + bw - 1.2, top, 1.2, FLOOR_TOP - top);
            x += bw;
        }
        // street lamps
        for (let lx = 190; lx < W; lx += 270) {
            n.fillStyle = 'rgba(255,230,150,0.10)';
            n.beginPath(); n.moveTo(lx - 12, 64); n.lineTo(lx - 40, FLOOR_TOP + 30); n.lineTo(lx + 18, FLOOR_TOP + 30); n.closePath(); n.fill();
            n.fillStyle = hgrad(n, lx, lx + 3, ['#1a1a20', '#5a5a66', '#1a1a20']); n.fillRect(lx, 58, 3, FLOOR_TOP - 54);
            n.beginPath(); n.moveTo(lx + 1.5, 60); n.quadraticCurveTo(lx, 52, lx - 12, 56); n.lineWidth = 1.6; n.strokeStyle = '#2a2a30'; n.stroke();
            n.fillStyle = '#2a2a30'; n.fillRect(lx - 18, 56, 12, 4);
            glow(n, lx - 12, 62, 16, 'rgba(255,240,170,A)', 0.6);
            n.fillStyle = '#fff8d0'; n.fillRect(lx - 17, 60, 10, 2);
        }
        // sidewalk, curb, road
        n.fillStyle = vgrad(n, FLOOR_TOP, FLOOR_TOP + 26, ['#8a8478', '#aaa498']); n.fillRect(0, FLOOR_TOP, W, 26);
        for (let k = 0; k < W; k += 30) line(n, k, FLOOR_TOP, k - 6, FLOOR_TOP + 26, 0.35, 'rgba(60,55,50,0.6)');
        line(n, 0, FLOOR_TOP + 12, W, FLOOR_TOP + 12, 0.35, 'rgba(60,55,50,0.5)');
        for (let i = 0; i < W / 40; i++) { const cx = rnd() * W, cy = FLOOR_TOP + 2 + rnd() * 22; line(n, cx, cy, cx + 3 + rnd() * 4, cy + rnd() * 3, 0.25, 'rgba(50,45,40,0.6)'); }
        n.fillStyle = vgrad(n, FLOOR_TOP, FLOOR_TOP + 6, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']); n.fillRect(0, FLOOR_TOP, W, 6);
        R(n, 0, FLOOR_TOP + 26, W, 4, '#d0c8b8'); R(n, 0, FLOOR_TOP + 30, W, 2, '#5a564e');
        n.fillStyle = vgrad(n, FLOOR_TOP + 32, GAME_H, ['#2e2e36', '#44444e']); n.fillRect(0, FLOOR_TOP + 32, W, GAME_H - FLOOR_TOP - 32);
        for (let i = 0; i < W * 3; i++) { n.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.06)'; n.fillRect(rnd() * W, FLOOR_TOP + 32 + rnd() * 52, 0.6, 0.6); }
        for (let dx = 0; dx < W; dx += 44) { n.fillStyle = 'rgba(240,200,60,0.85)'; n.fillRect(dx, 212, 22, 1.8); n.fillStyle = 'rgba(40,40,40,0.4)'; n.fillRect(dx + rnd() * 18, 212, 3, 1.8); }
        for (let mx = 300; mx < W; mx += 420) {
            n.save(); n.translate(mx, 200); n.scale(1, 0.3); n.beginPath(); n.arc(0, 0, 16, 0, 7); n.fillStyle = '#26262c'; n.fill();
            n.lineWidth = 2; n.strokeStyle = '#4a4a52'; n.stroke(); n.restore();
        }
        for (let hx = 120; hx < W; hx += 340) {
            n.fillStyle = 'rgba(0,0,0,0.35)'; n.beginPath(); n.ellipse(hx + 5, 164, 7, 2, 0, 0, 7); n.fill();
            n.fillStyle = hgrad(n, hx, hx + 10, ['#a01010', '#f04040', '#901010']); n.fillRect(hx, 148, 10, 16);
            n.beginPath(); n.arc(hx + 5, 148, 5, Math.PI, 0); n.fill();
            R(n, hx - 2.5, 152, 15, 3.2, '#b01818'); n.lineWidth = 0.6; n.strokeStyle = '#300606'; n.strokeRect(hx, 143, 10, 21);
        }
        return { far, near, farFactor: 0.15 };
    }

    // ---- Stage 3: warehouse hideout -------------------------------------------------------
    function hideout(W) {
        const rnd = rng(99);
        const [far, f] = canvas(FAR_W, FLOOR_TOP);
        R(f, 0, 0, FAR_W, FLOOR_TOP, '#0a080e');
        const [near, n] = canvas(W, GAME_H);
        // corrugated back wall
        for (let x = 0; x < W; x += 5) {
            n.fillStyle = hgrad(n, x, x + 5, ['#2c2c34', '#4e4e58', '#3a3a42', '#26262c']); n.fillRect(x, 0, 5, FLOOR_TOP);
        }
        for (let i = 0; i < W / 25; i++) {
            const rx = rnd() * W, ry = 40 + rnd() * 80;
            n.fillStyle = vgrad(n, ry, ry + 30, ['rgba(140,60,20,0.35)', 'rgba(140,60,20,0)']); n.fillRect(rx, ry, 2 + rnd() * 6, 30);
        }
        n.fillStyle = vgrad(n, 0, 50, ['rgba(5,4,8,1)', 'rgba(5,4,8,0)']); n.fillRect(0, 0, W, 50);
        // girders
        const beam = (y, h) => {
            n.fillStyle = vgrad(n, y, y + h, ['#a05a34', '#7a3e22', '#4a2214']); n.fillRect(0, y, W, h);
            R(n, 0, y, W, 0.8, '#c87a4a'); R(n, 0, y + h - 0.8, W, 0.8, '#2a1008');
            for (let k = 6; k < W; k += 10) { n.beginPath(); n.arc(k, y + h / 2, 0.6, 0, 7); n.fillStyle = '#d08a5a'; n.fill(); }
        };
        beam(32, 9);
        for (let gx = 0; gx < W; gx += 90) {
            n.fillStyle = hgrad(n, gx, gx + 7, ['#4a2214', '#a05a34', '#7a3e22', '#3a180c']); n.fillRect(gx, 41, 7, FLOOR_TOP - 41);
            n.lineWidth = 2.2; n.strokeStyle = '#5a2a18'; n.beginPath(); n.moveTo(gx + 7, 44); n.lineTo(gx + 90, 104); n.stroke();
            n.lineWidth = 0.5; n.strokeStyle = '#b06a40'; n.beginPath(); n.moveTo(gx + 7, 43); n.lineTo(gx + 90, 103); n.stroke();
            for (let k = 0; k < 8; k++) { n.beginPath(); n.arc(gx + 3.5, 48 + k * 14, 0.6, 0, 7); n.fillStyle = '#d08a5a'; n.fill(); }
        }
        // hanging chains
        for (let cx = 140; cx < W; cx += 310) {
            for (let cy = 41; cy < 92; cy += 2.2) { n.beginPath(); n.ellipse(cx, cy, 0.7, 1.2, 0, 0, 7); n.lineWidth = 0.4; n.strokeStyle = '#7a7a84'; n.stroke(); }
            n.beginPath(); n.arc(cx, 95, 3, 0, Math.PI * 1.4); n.lineWidth = 1; n.strokeStyle = '#8a8a94'; n.stroke();
        }
        // crates & drums against the wall
        let cx = 20;
        while (cx < W - 230) {
            const stack = 1 + Math.floor(rnd() * 3);
            for (let k = 0; k < stack; k++) {
                const y = FLOOR_TOP - 26 * (k + 1), w = 28;
                n.fillStyle = hgrad(n, cx, cx + w, ['#b07a40', '#986634', '#6a4420']); n.fillRect(cx, y, w, 26);
                for (let yy = y + 4; yy < y + 26; yy += 4) line(n, cx, yy, cx + w, yy, 0.25, 'rgba(70,40,15,0.5)');
                n.fillStyle = '#5a3818';
                n.fillRect(cx, y, w, 3); n.fillRect(cx, y + 23, w, 3); n.fillRect(cx, y, 3, 26); n.fillRect(cx + w - 3, y, 3, 26);
                line(n, cx + 3, y + 3, cx + w - 3, y + 23, 2.6, '#5a3818');
                n.lineWidth = 0.6; n.strokeStyle = '#140a04'; n.strokeRect(cx, y, w, 26);
                if (rnd() < 0.4) { n.save(); n.font = 'bold 6px Impact, sans-serif'; n.fillStyle = 'rgba(30,15,5,0.7)'; n.fillText(rnd() < 0.5 ? 'FRAGILE' : 'B.W. CO', cx + 4, y + 16); n.restore(); }
            }
            cx += 28;
            if (rnd() < 0.5) {
                const dx = cx + 4;
                n.fillStyle = hgrad(n, dx, dx + 18, ['#2a5a7a', '#6ab0d0', '#3a80a8', '#123050']); n.fillRect(dx, FLOOR_TOP - 25, 18, 25);
                n.beginPath(); n.ellipse(dx + 9, FLOOR_TOP - 25, 9, 2.2, 0, 0, 7); n.fillStyle = '#4a90b8'; n.fill();
                for (const yy of [FLOOR_TOP - 18, FLOOR_TOP - 8]) R(n, dx, yy, 18, 1.4, '#123050');
                cx += 26;
            }
            cx += 30 + Math.floor(rnd() * 110);
        }
        // boss chamber banner
        const bx = W - 200;
        n.fillStyle = 'rgba(0,0,0,0.4)'; n.fillRect(bx + 4, 48, 84, 100);
        n.fillStyle = hgrad(n, bx, bx + 84, ['#5a0808', '#a01818', '#c82828', '#8a1010', '#5a0808']);
        n.beginPath(); n.moveTo(bx, 44); n.lineTo(bx + 84, 44); n.lineTo(bx + 84, 138); n.lineTo(bx + 42, 148); n.lineTo(bx, 138); n.closePath(); n.fill();
        for (let k = 1; k < 6; k++) line(n, bx + k * 14, 46, bx + k * 14, 140, 0.8, 'rgba(0,0,0,0.18)');
        R(n, bx - 4, 42, 92, 4, '#2a2a30'); R(n, bx - 4, 42, 92, 1, '#7a7a84');
        n.save(); n.translate(bx + 42, 92);
        n.beginPath(); n.arc(0, 0, 28, 0, 7); n.lineWidth = 2.4; n.strokeStyle = '#f0c040'; n.stroke();
        n.beginPath(); n.arc(0, 0, 24, 0, 7); n.lineWidth = 0.6; n.stroke();
        // stylised dragon: S-shaped body with head and claws
        n.beginPath(); n.moveTo(10, -18);
        n.bezierCurveTo(-20, -18, 20, 2, -6, 8); n.bezierCurveTo(-18, 12, -8, 22, 6, 18);
        n.lineWidth = 4.5; n.strokeStyle = '#f0c040'; n.stroke(); n.lineWidth = 1.6; n.strokeStyle = '#ffe890'; n.stroke();
        n.beginPath(); n.moveTo(8, -22); n.lineTo(18, -18); n.lineTo(10, -14); n.closePath(); n.fillStyle = '#f0c040'; n.fill();
        n.beginPath(); n.arc(12, -19, 1, 0, 7); n.fillStyle = '#ff2020'; n.fill();
        for (const [a, b] of [[-8, -6], [6, 4], [-10, 12]]) line(n, a, b, a - 4, b + 3, 1, '#f0c040');
        n.restore();
        // hanging lamps with light cones
        for (let lx = 60; lx < W; lx += 210) {
            line(n, lx, 0, lx, 48, 0.5, '#101010');
            n.fillStyle = 'rgba(255,236,170,0.07)';
            n.beginPath(); n.moveTo(lx - 6, 54); n.lineTo(lx - 46, GAME_H); n.lineTo(lx + 46, GAME_H); n.lineTo(lx + 6, 54); n.closePath(); n.fill();
            n.fillStyle = 'rgba(255,236,170,0.05)';
            n.beginPath(); n.moveTo(lx - 4, 54); n.lineTo(lx - 26, GAME_H); n.lineTo(lx + 26, GAME_H); n.lineTo(lx + 4, 54); n.closePath(); n.fill();
            n.beginPath(); n.moveTo(lx - 8, 54); n.lineTo(lx - 3, 47); n.lineTo(lx + 3, 47); n.lineTo(lx + 8, 54); n.closePath();
            n.fillStyle = '#3a5a3a'; n.fill(); n.lineWidth = 0.5; n.strokeStyle = '#101810'; n.stroke();
            glow(n, lx, 55, 10, 'rgba(255,245,190,A)', 0.8);
        }
        // concrete floor, oil stains, light pools
        floor(n, W, FLOOR_TOP, GAME_H, '#2e2a26', '#4e4842', 'rgba(15,12,10,0.5)', rnd, 52);
        n.fillStyle = vgrad(n, FLOOR_TOP, FLOOR_TOP + 10, ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']); n.fillRect(0, FLOOR_TOP, W, 10);
        for (let lx = 60; lx < W; lx += 210) {
            n.save(); n.translate(lx, 205); n.scale(1, 0.3);
            const g = n.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, 'rgba(255,236,170,0.22)'); g.addColorStop(1, 'rgba(255,236,170,0)');
            n.fillStyle = g; n.beginPath(); n.arc(0, 0, 60, 0, 7); n.fill(); n.restore();
        }
        for (let i = 0; i < W / 90; i++) {
            const ox = rnd() * W, oy = 168 + rnd() * 60, ow = 8 + rnd() * 18;
            n.save(); n.translate(ox, oy); n.scale(1, 0.3); n.beginPath(); n.arc(0, 0, ow, 0, 7);
            n.fillStyle = 'rgba(8,6,4,0.45)'; n.fill(); n.restore();
            line(n, ox - ow * 0.4, oy - 0.5, ox, oy - 0.8, 0.3, 'rgba(160,120,200,0.35)');
        }
        for (let i = 0; i < W / 60; i++) {
            let px = rnd() * W, py = 170 + rnd() * 60; n.beginPath(); n.moveTo(px, py);
            for (let k = 0; k < 4; k++) { px += 3 + rnd() * 5; py += (rnd() - 0.5) * 3; n.lineTo(px, py); }
            n.lineWidth = 0.3; n.strokeStyle = 'rgba(10,8,6,0.6)'; n.stroke();
        }
        return { far, near, farFactor: 0 };
    }

    // ---- Stage definitions --------------------------------------------------------------------
    // Each wave triggers when the camera reaches wave.x; the camera stays locked there until every
    // enemy in the wave is down. The last wave sits at width - GAME_W (the end of the stage).
    // Enemy entries: [type, side ('r' | 'l'), delay ms, weapon?]
    const LIST = [
        {
            name: 'MISSION 1', title: 'THE HELIPORT', music: 'stage1', width: 1280, paint: heliport,
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
            name: 'MISSION 2', title: 'CITY STREETS', music: 'stage2', width: 1600, paint: street,
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
            name: 'MISSION 3', title: 'THE HIDEOUT', music: 'stage3', width: 1600, paint: hideout,
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

    return { LIST, heliport };
})();
