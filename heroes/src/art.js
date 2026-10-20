// Procedural art: every texture in the game is painted into a canvas at runtime.
const Art = (() => {
    const INK = '#1a120c';
    function canvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w); c.height = Math.ceil(h);
        const x = c.getContext('2d');
        x.lineCap = 'round'; x.lineJoin = 'round';
        return [c, x];
    }
    function shade(hex, k) {
        if (!hex || hex[0] !== '#') return hex;
        const n = parseInt(hex.slice(1), 16);
        const f = v => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k)));
        return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
    }
    function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
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
    function rrect(x, a, b, w, h, r, fill, lw = 2, stroke = INK) {
        x.beginPath(); x.roundRect(a, b, w, h, r);
        if (fill) { x.fillStyle = fill; x.fill(); }
        if (lw) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
    }
    function line(x, pts, w, c) {
        x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
        x.lineWidth = w; x.strokeStyle = c; x.stroke();
    }
    // thick limb with an ink outline
    function limb(x, pts, w, c) { line(x, pts, w + 3, INK); line(x, pts, w, c); }
    function star(x, cx, cy, r, fill, lw = 1.2, points = 5, inner = 0.45) {
        const pts = [];
        for (let i = 0; i < points * 2; i++) {
            const a = -Math.PI / 2 + i * Math.PI / points, rr = i % 2 ? r * inner : r;
            pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
        }
        poly(x, pts, fill, lw);
    }
    function glow(x, cx, cy, r, col, a = 0.6) {
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    // soft light from the upper left over whatever is already painted
    function light(x, w, h, k = 0.35) {
        x.save(); x.globalCompositeOperation = 'source-atop';
        const g = x.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, `rgba(255,255,240,${k * 0.6})`); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(0,0,20,${k})`);
        x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore();
    }
    function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
    function add(scene, key, c) { if (scene.textures.exists(key)) scene.textures.remove(key); scene.textures.addCanvas(key, c); return key; }

    // ======================= creatures =======================
    function wing(x, sx, sy, len, col, bat, flip = 1) {
        if (bat) {
            const pts = [[sx, sy], [sx - len * 0.3 * flip, sy - len * 0.7], [sx - len * 0.75 * flip, sy - len * 0.85], [sx - len * flip, sy - len * 0.4],
                [sx - len * 0.8 * flip, sy - len * 0.25], [sx - len * 0.7 * flip, sy + len * 0.05], [sx - len * 0.45 * flip, sy - len * 0.05], [sx - len * 0.3 * flip, sy + len * 0.2]];
            poly(x, pts, col, 2);
            for (const p of [[sx - len * 0.75 * flip, sy - len * 0.85], [sx - len * flip, sy - len * 0.4], [sx - len * 0.7 * flip, sy + len * 0.05]]) line(x, [[sx, sy], p], 1.5, shade(col, 0.6));
        } else {
            const pts = [[sx, sy]];
            for (let i = 0; i <= 6; i++) {
                const a = -Math.PI * 0.95 + i * 0.22;
                const r = len * (0.75 + 0.25 * Math.sin(i * 0.9));
                pts.push([sx + Math.cos(a) * r * flip * 1.0, sy + Math.sin(a) * r * 0.9 - 4]);
            }
            pts.push([sx - len * 0.2 * flip, sy + len * 0.25]);
            poly(x, pts, col, 2);
            for (let i = 1; i < 6; i++) line(x, [[sx, sy], [pts[i + 1][0] * 0.6 + sx * 0.4, pts[i + 1][1] * 0.6 + sy * 0.4]], 1.2, shade(col, 0.75));
        }
    }
    function weapon(x, wpn, hx, hy, p) {
        const steel = '#d8dde4', wood = '#8a5a2a';
        switch (wpn) {
            case 'spear': case 'pitchfork': case 'trident':
                limb(x, [[hx - 4, hy + 30], [hx + 6, hy - 52]], 3, wood);
                if (wpn === 'spear') poly(x, [[hx + 6, hy - 64], [hx + 10, hy - 50], [hx + 2, hy - 50]], steel, 1.5);
                else { const tip = hx + 6, ty = hy - 52; for (const d of [-5, 0, 5]) limb(x, [[tip + d, ty], [tip + d + 1, ty - 12]], 1.5, wpn === 'trident' ? '#e0c040' : steel); line(x, [[tip - 6, ty], [tip + 6, ty]], 2, INK); }
                break;
            case 'halberd':
                limb(x, [[hx - 4, hy + 30], [hx + 6, hy - 56]], 3, wood);
                poly(x, [[hx + 5, hy - 48], [hx + 18, hy - 54], [hx + 18, hy - 36], [hx + 5, hy - 40]], steel, 1.5);
                poly(x, [[hx + 6, hy - 68], [hx + 9, hy - 54], [hx + 3, hy - 54]], steel, 1.5);
                break;
            case 'lance':
                poly(x, [[hx - 20, hy + 2], [hx + 60, hy - 18], [hx - 18, hy + 8]], '#e8d8b0', 1.5);
                oval(x, hx - 6, hy + 1, 5, 7, steel, 1.5);
                break;
            case 'sword': case 'flamesword': case 'scimitar': case 'dagger': {
                const L = wpn === 'dagger' ? 14 : 34;
                const col = wpn === 'flamesword' ? '#ffb030' : steel;
                if (wpn === 'flamesword') glow(x, hx + 12, hy - L / 2 - 6, 20, '#ff8020', 0.6);
                if (wpn === 'scimitar') { x.beginPath(); x.moveTo(hx, hy - 2); x.quadraticCurveTo(hx + 24, hy - 10, hx + 24, hy - L); x.quadraticCurveTo(hx + 14, hy - 14, hx + 3, hy - 6); x.closePath(); x.fillStyle = col; x.fill(); x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke(); }
                else poly(x, [[hx + 1, hy - 4], [hx + 4 + L * 0.35, hy - L], [hx + 8 + L * 0.35, hy - L - 4], [hx + 6, hy - 1]], col, 1.5);
                line(x, [[hx - 5, hy - 1], [hx + 8, hy - 7]], 3, '#c8a040');
                break;
            }
            case 'axe': case 'axethrow':
                limb(x, [[hx - 2, hy + 8], [hx + 8, hy - 26]], 3, wood);
                poly(x, [[hx + 6, hy - 22], [hx + 20, hy - 30], [hx + 22, hy - 14], [hx + 9, hy - 16]], steel, 1.5);
                break;
            case 'club':
                limb(x, [[hx - 2, hy + 4], [hx + 12, hy - 28]], 5, wood);
                oval(x, hx + 13, hy - 30, 7, 9, '#7a4a20', 2, INK, 0.4);
                for (const [a, b] of [[8, -34], [16, -26], [12, -38]]) oval(x, hx + a, hy + b, 1.5, 1.5, '#c0c0c0', 0.8);
                break;
            case 'whip':
                x.beginPath(); x.moveTo(hx, hy); x.bezierCurveTo(hx + 30, hy - 30, hx + 40, hy + 10, hx + 22, hy + 30);
                x.lineWidth = 3; x.strokeStyle = '#ff8020'; x.stroke(); glow(x, hx + 30, hy, 18, '#ff6010', 0.5);
                break;
            case 'scythe':
                limb(x, [[hx - 6, hy + 34], [hx + 8, hy - 52]], 3, '#3a2a20');
                x.beginPath(); x.moveTo(hx + 8, hy - 52); x.quadraticCurveTo(hx + 36, hy - 50, hx + 40, hy - 30); x.quadraticCurveTo(hx + 30, hy - 44, hx + 8, hy - 46); x.closePath();
                x.fillStyle = steel; x.fill(); x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke();
                break;
            case 'staff':
                limb(x, [[hx - 2, hy + 34], [hx + 4, hy - 50]], 3, '#6a4a2a');
                if (p.glow) glow(x, hx + 4, hy - 54, 14, p.glow, 0.9);
                oval(x, hx + 4, hy - 54, 5, 5, p.glow || '#80a0ff', 1.5);
                break;
            case 'bow':
                x.beginPath(); x.arc(hx - 4, hy, 26, -1.2, 1.2); x.lineWidth = 4; x.strokeStyle = INK; x.stroke(); x.lineWidth = 2.5; x.strokeStyle = wood; x.stroke();
                line(x, [[hx - 4 + Math.cos(-1.2) * 26, hy + Math.sin(-1.2) * 26], [hx - 4 + Math.cos(1.2) * 26, hy + Math.sin(1.2) * 26]], 1, '#f0f0f0');
                break;
            case 'crossbow':
                rect(x, hx - 10, hy - 3, 26, 5, wood, 1.5);
                x.beginPath(); x.arc(hx + 14, hy, 12, -1.4, 1.4); x.lineWidth = 3; x.strokeStyle = INK; x.stroke(); x.lineWidth = 2; x.strokeStyle = steel; x.stroke();
                break;
            case 'ball': case 'fireball':
                if (wpn === 'fireball') glow(x, hx + 6, hy - 10, 18, '#ff6010', 0.9);
                oval(x, hx + 6, hy - 10, 7, 7, wpn === 'fireball' ? '#ffa020' : '#606870', 2);
                break;
            case 'rock': oval(x, hx - 6, hy - 46, 16, 13, '#8a8478', 2); oval(x, hx - 10, hy - 50, 5, 3, '#a8a298', 0); break;
            case 'bolt':
                glow(x, hx + 8, hy - 30, 24, '#a0d0ff', 0.8);
                poly(x, [[hx + 4, hy - 56], [hx + 14, hy - 34], [hx + 6, hy - 32], [hx + 16, hy - 6], [hx, hy - 30], [hx + 8, hy - 32]], '#fff8a0', 1.5);
                break;
            case 'sling': line(x, [[hx, hy], [hx + 10, hy - 18], [hx + 2, hy - 22]], 1.5, '#6a4a2a'); oval(x, hx + 4, hy - 22, 3, 3, '#808080', 1); break;
        }
    }
    function head(x, p, hx, hy, r) {
        const skin = p.bones ? '#ece4cc' : p.skin || '#e8b890';
        if (p.collar) poly(x, [[hx - 16, hy + 6], [hx - 14, hy - 16], [hx - 4, hy + 2], [hx + 6, hy + 2], [hx + 14, hy - 14], [hx + 14, hy + 8]], '#a01020', 1.5);
        if (p.hair && !p.bones) oval(x, hx - 3, hy - 1, r + 2, r + 3, p.hair, 2);
        if (p.helm === 'hood') { oval(x, hx - 2, hy - 1, r + 4, r + 5, p.c1, 2); oval(x, hx + 2, hy + 1, r - 2, r - 1, p.bones ? '#1a1418' : shade(skin, 0.8), 1); }
        else oval(x, hx, hy, r, r * 1.05, skin, 2);
        if (p.ears) { poly(x, [[hx - 4, hy - 2], [hx - 14, hy - 10], [hx - 6, hy + 3]], skin, 1.5); }
        if (p.helm !== 'hood' || p.bones) {
            if (p.bones) {
                const ec = p.eyes || (p.glow || '#000000');
                oval(x, hx + 4, hy - 1, 3, 3.5, '#201818', 0); oval(x, hx - 3, hy - 1, 2.5, 3.5, '#201818', 0);
                if (p.glow || p.eyes) { oval(x, hx + 4, hy - 1, 1.3, 1.3, ec, 0); }
                line(x, [[hx + 1, hy + 6], [hx + 7, hy + 6]], 1.2, '#302020');
            } else if (p.cyclops) {
                oval(x, hx + 4, hy - 2, 4.5, 4, '#ffffff', 1.2); oval(x, hx + 5, hy - 2, 2, 2, '#202020', 0);
            } else {
                oval(x, hx + 5, hy - 2, 1.8, 2, p.zombie ? '#c0d020' : '#202020', 0);
                if (!p.beard) line(x, [[hx + 3, hy + 6], [hx + 8, hy + 5]], 1.2, shade(skin, 0.5));
            }
        }
        if (p.tusks) { poly(x, [[hx + 4, hy + 5], [hx + 6, hy - 1], [hx + 7, hy + 5]], '#fff8e0', 1); }
        if (p.beard) poly(x, [[hx - 4, hy + 2], [hx + 9, hy + 3], [hx + 6, hy + 16], [hx - 2, hy + 12]], p.beard, 1.5);
        switch (p.helm) {
            case 'helm': case 'plume':
                x.beginPath(); x.arc(hx, hy - 1, r + 1.5, Math.PI, 0); x.closePath(); x.fillStyle = p.armor || '#b8c0c8'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
                rect(x, hx + 2, hy - 2, 2.5, 8, p.armor || '#b8c0c8', 1);
                if (p.helm === 'plume') { x.beginPath(); x.moveTo(hx - 2, hy - r - 1); x.quadraticCurveTo(hx - 14, hy - r - 14, hx - 20, hy - 2); x.lineWidth = 6; x.strokeStyle = INK; x.stroke(); x.lineWidth = 4; x.strokeStyle = '#d02020'; x.stroke(); }
                break;
            case 'cap': x.beginPath(); x.arc(hx, hy - 2, r + 1, Math.PI * 1.05, -0.1); x.closePath(); x.fillStyle = shade(p.c1, 0.85); x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); break;
            case 'horns': for (const s of [-1, 1]) poly(x, [[hx + s * 5 - 2, hy - r + 2], [hx + s * 9 - 2, hy - r - 9], [hx + s * 2 - 2, hy - r + 1]], '#e8e0c8', 1.5); break;
            case 'bighorns':
                for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx + s * 4, hy - r + 3); x.quadraticCurveTo(hx + s * 22, hy - r - 2, hx + s * 14, hy - r - 18); x.quadraticCurveTo(hx + s * 14, hy - r - 4, hx + s * 1, hy - r + 4); x.closePath(); x.fillStyle = '#d8ccb0'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke(); }
                break;
            case 'crown': poly(x, [[hx - 9, hy - r + 2], [hx - 9, hy - r - 7], [hx - 4, hy - r - 2], [hx, hy - r - 9], [hx + 4, hy - r - 2], [hx + 9, hy - r - 7], [hx + 9, hy - r + 2]], '#f0c830', 1.5); break;
            case 'wizard': poly(x, [[hx - 14, hy - r + 3], [hx + 14, hy - r + 3], [hx - 2, hy - r - 26]], p.c1, 2); star(x, hx - 1, hy - r - 6, 3, '#f0e060', 0.8); break;
            case 'turban': oval(x, hx - 1, hy - r + 1, r + 2, 7, p.turban || '#f0ece0', 2); oval(x, hx + 5, hy - r + 1, 2, 2, '#c02040', 1); break;
        }
    }
    function man(x, p, opts = {}) {
        const fat = p.fat ? 1.3 : 1;
        const body = p.armor || p.c1;
        const sx = 0, hipY = -40, shY = -68;
        if (p.glow && !opts.noGlow) glow(x, 0, -50, 50, p.glow, 0.35);
        if (p.wings) wing(x, -4, shY + 4, 52, p.wings, isDark(p.wings), 1);
        if (p.tail) { x.beginPath(); x.moveTo(-6, hipY); x.bezierCurveTo(-30, hipY + 10, -38, -10, -28, -2); x.lineWidth = 6; x.strokeStyle = INK; x.stroke(); x.lineWidth = 3.5; x.strokeStyle = p.skin; x.stroke(); poly(x, [[-28, -2], [-36, 2], [-26, -10]], p.skin, 1.5); }
        if (p.cape) poly(x, [[-8, shY + 2], [8, shY + 2], [6, -16], [-26, -12]], p.cape, 2);
        if (!opts.sitting) {
            if (p.robe) poly(x, [[-12 * fat, hipY - 6], [12 * fat, hipY - 6], [16 * fat, 0], [-18 * fat, 0]], p.c1, 2);
            else {
                const leg = p.bones ? '#ece4cc' : p.armor || shade(p.c1, 0.7);
                limb(x, [[-5, hipY], [-9, -18], [-10, -2]], 6 * fat, leg);
                limb(x, [[5, hipY], [8, -18], [12, -2]], 6 * fat, leg);
                if (!p.bones) { oval(x, -9, -2, 6, 3, '#3a2a1a', 1.5); oval(x, 14, -2, 6, 3, '#3a2a1a', 1.5); }
            }
        }
        // back arm
        const armC = p.bones ? '#ece4cc' : (p.armor || p.skin);
        limb(x, [[-8 * fat, shY + 4], [-14 * fat, shY + 18], [-12 * fat, shY + 28]], 5, armC);
        // torso
        if (p.bones && !p.robe && !p.armor) {
            line(x, [[0, shY], [0, hipY]], 4, '#ece4cc');
            for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(0, shY + 5 + i * 6, 9 - i, 3, 0, 0, Math.PI * 2); x.lineWidth = 2; x.strokeStyle = '#ece4cc'; x.stroke(); }
        } else rrect(x, -12 * fat, shY, 24 * fat, hipY - shY + 4, 6, p.robe ? p.c1 : body, 2);
        if (p.armor && !p.robe) { rect(x, -12 * fat + 2, shY + 10, 24 * fat - 4, 3, p.c1, 0); }
        if (p.cross) { rect(x, -2, shY + 4, 4, 18, '#d02020'); rect(x, -8, shY + 9, 16, 4, '#d02020'); }
        line(x, [[-12 * fat, hipY - 2], [12 * fat, hipY - 2]], 3, '#5a3a1a');
        if (p.shield) {
            const sc = p.shield;
            poly(x, [[-24, shY + 4], [-6, shY + 4], [-6, shY + 22], [-15, shY + 32], [-24, shY + 22]], sc, 2);
            oval(x, -15, shY + 15, 3, 3, '#e8c040', 1);
        }
        // head
        head(x, p, 2, shY - 12, 11);
        // front arm + weapon
        const hx = 16 * fat, hy = shY + 20;
        if (p.wpn === 'rock') { limb(x, [[8 * fat, shY + 4], [8, shY - 18], [4, shY - 28]], 6, armC); weapon(x, 'rock', hx, hy, p); return; }
        if (p.wpn === 'bow') { limb(x, [[8 * fat, shY + 4], [22, shY + 10]], 5, armC); weapon(x, 'bow', 24, shY + 10, p); return; }
        limb(x, [[8 * fat, shY + 4], [hx, shY + 12], [hx + 2, hy]], 5, armC);
        if (p.wpn === 'claws' || p.wpn === 'fist') { oval(x, hx + 2, hy, 4.5, 4.5, armC, 1.5); if (p.wpn === 'claws') for (const d of [-3, 0, 3]) line(x, [[hx + 4, hy + d], [hx + 10, hy + d + 2]], 1.5, '#f0f0e0'); }
        else { oval(x, hx + 2, hy, 3.5, 3.5, p.bones ? '#ece4cc' : p.skin, 1.2); weapon(x, p.wpn, hx + 2, hy, p); }
    }
    function isDark(hex) { const n = parseInt(hex.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) < 300; }
    function quadruped(x, p, opts = {}) {
        const big = p.big ? 1.25 : 1;
        const c1 = p.c1, c2 = p.c2 || shade(c1, 0.8);
        const bw = 34 * big, bh = 16 * big, by = -38 * big;
        if (p.fire) glow(x, 0, by, 50, '#ff5010', 0.35);
        if (p.wings) wing(x, -6, by - 6, 50, p.wings, isDark(p.wings), 1);
        // tail
        const tailC = p.head === 'horse' ? (p.mane || c2) : c1;
        x.beginPath(); x.moveTo(-bw + 4, by - 4); x.quadraticCurveTo(-bw - 20, by - 6, -bw - 14, by + 22);
        x.lineWidth = p.head === 'horse' ? 9 : 6; x.strokeStyle = INK; x.stroke(); x.lineWidth -= 3; x.strokeStyle = tailC; x.stroke();
        // far legs
        const leg = (lx, front, far) => {
            const col = far ? shade(c1, 0.75) : c1;
            limb(x, [[lx, by + 6], [lx + (front ? 4 : -4), by + 22 * big], [lx + (front ? 2 : -2), -2]], 6 * big, col);
            if (p.head === 'eagle' && front) { for (const d of [-3, 0, 3]) line(x, [[lx + 2, -2], [lx + 6 + d, 0]], 1.5, '#e8c040'); }
            else oval(x, lx + (front ? 2 : -2), -2, 4 * big, 2.5, p.head === 'horse' || p.head === 'bull' ? '#3a3030' : shade(c1, 0.5), 1);
        };
        leg(-bw + 14, false, true); leg(bw - 12, true, true);
        if (p.barding) oval(x, 0, by, bw + 3, bh + 4, p.barding, 2);
        oval(x, 0, by, bw, bh, c1, 2);
        if (p.head === 'eagle') { oval(x, bw - 10, by - 2, 16, 13, p.c2, 1.5); }
        if (p.spikes) for (let i = -2; i <= 2; i++) poly(x, [[i * 10 - 4, by - bh + 2], [i * 10, by - bh - 10], [i * 10 + 4, by - bh + 2]], '#e8e0c8', 1.2);
        leg(-bw + 8, false, false); leg(bw - 6, true, false);
        // heads
        const heads = p.heads || 1;
        for (let h = heads - 1; h >= 0; h--) {
            const ox = (h - (heads - 1) / 2) * -9, oy = (h - (heads - 1) / 2) * 9;
            const hx = bw - 4 + ox * 0.3, hy = by - 18 + oy;
            switch (p.head) {
                case 'horse':
                    poly(x, [[bw - 14, by - 4], [bw - 2, by - 30], [bw + 8, by - 26], [bw + 2, by]], c1, 2);
                    poly(x, [[bw - 4, by - 34], [bw + 24, by - 22], [bw + 22, by - 14], [bw - 2, by - 20]], c1, 2);
                    poly(x, [[bw - 2, by - 34], [bw + 2, by - 44], [bw + 4, by - 32]], c1, 1.5);
                    if (p.mane) poly(x, [[bw - 18, by - 6], [bw - 8, by - 34], [bw - 2, by - 36], [bw - 8, by - 10]], p.mane, 1.5);
                    oval(x, bw + 8, by - 28, 1.6, 1.6, '#101010', 0);
                    if (p.horn) poly(x, [[bw + 4, by - 34], [bw + 20, by - 56], [bw + 9, by - 32]], p.horn, 1.5);
                    break;
                case 'wolf':
                    poly(x, [[hx - 12, hy + 14], [hx - 4, hy - 6], [hx + 10, hy - 6], [hx + 26, hy + 2], [hx + 24, hy + 8], [hx + 6, hy + 10], [hx, hy + 18]], c1, 2);
                    poly(x, [[hx - 2, hy - 4], [hx + 2, hy - 16], [hx + 6, hy - 5]], c1, 1.5);
                    oval(x, hx + 10, hy - 1, 2, 1.6, p.fire ? '#ffd020' : '#101010', 0);
                    line(x, [[hx + 14, hy + 8], [hx + 24, hy + 6]], 1.2, INK);
                    if (p.fire) { glow(x, hx + 26, hy + 6, 10, '#ff8020', 0.9); }
                    break;
                case 'eagle':
                    oval(x, hx, hy - 4, 11, 11, p.c2, 2);
                    poly(x, [[hx + 8, hy - 8], [hx + 22, hy - 2], [hx + 8, hy + 2]], '#f0c030', 1.5);
                    oval(x, hx + 4, hy - 7, 1.8, 1.8, '#101010', 0);
                    if (p.crown) poly(x, [[hx - 7, hy - 14], [hx - 7, hy - 22], [hx - 3, hy - 17], [hx, hy - 23], [hx + 3, hy - 17], [hx + 7, hy - 22], [hx + 7, hy - 14]], '#f0c830', 1.2);
                    break;
                case 'boar':
                    oval(x, hx + 4, hy + 10, 14, 11, c1, 2);
                    oval(x, hx + 17, hy + 12, 4, 5, shade(c1, 1.2), 1.5);
                    poly(x, [[hx + 12, hy + 16], [hx + 16, hy + 6], [hx + 15, hy + 17]], '#fff8e0', 1);
                    oval(x, hx + 8, hy + 5, 1.6, 1.6, '#101010', 0);
                    poly(x, [[hx - 4, hy + 2], [hx - 2, hy - 8], [hx + 2, hy + 2]], c1, 1.2);
                    break;
                case 'bull':
                    oval(x, hx + 4, hy + 8, 16 * big, 14 * big, c1, 2);
                    oval(x, hx + 16, hy + 14, 8, 7, c2, 1.5);
                    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx + 4 + s * 6, hy - 2); x.quadraticCurveTo(hx + 4 + s * 22, hy - 6, hx + 4 + s * 18, hy - 22); x.lineWidth = 6; x.strokeStyle = INK; x.stroke(); x.lineWidth = 3.5; x.strokeStyle = p.horn; x.stroke(); }
                    oval(x, hx + 12, hy + 4, 2, 2, '#ff3010', 0);
                    for (const d of [0, 5]) line(x, [[hx + 14 + d, hy + 20], [hx + 15 + d, hy + 26]], 2, '#fff8e0');
                    break;
            }
        }
    }
    function dragon(x, p) {
        const c1 = p.c1, c2 = p.c2;
        if (p.ghost) x.globalAlpha = 0.85;
        wing(x, -4, -64, 66, p.bones ? 'rgba(0,0,0,0)' : shade(c1, 0.8), true, 1);
        if (p.bones) { const pts = [[-4, -64], [-30, -110], [-60, -100], [-68, -60]]; for (const q of pts) limb(x, [[-4, -64], q], 2, c1); line(x, pts, 2, c1); }
        // tail
        x.beginPath(); x.moveTo(-30, -36); x.bezierCurveTo(-60, -30, -70, -4, -46, -4); x.lineWidth = 12; x.strokeStyle = INK; x.stroke(); x.lineWidth = 8; x.strokeStyle = c1; x.stroke();
        poly(x, [[-46, -4], [-56, 2], [-50, -12]], c2, 1.5);
        limb(x, [[-18, -30], [-24, -14], [-20, -2]], 8, shade(c1, 0.75));
        limb(x, [[16, -30], [22, -14], [26, -2]], 8, shade(c1, 0.75));
        if (p.bones) {
            line(x, [[-34, -40], [30, -44]], 5, c1);
            for (let i = -26; i < 26; i += 8) { x.beginPath(); x.ellipse(i, -38, 4, 12, 0, 0, Math.PI * 2); x.lineWidth = 2.5; x.strokeStyle = c1; x.stroke(); }
        } else {
            oval(x, 0, -40, 36, 17, c1, 2);
            oval(x, 2, -32, 26, 8, c2, 0);
        }
        // neck & head
        x.beginPath(); x.moveTo(24, -44); x.quadraticCurveTo(44, -60, 40, -86); x.lineWidth = p.bones ? 6 : 16; x.strokeStyle = INK; x.stroke(); x.lineWidth = p.bones ? 3.5 : 12; x.strokeStyle = c1; x.stroke();
        poly(x, [[30, -92], [44, -100], [70, -88], [68, -80], [46, -78], [34, -80]], p.bones ? '#ece4cc' : c1, 2);
        poly(x, [[36, -96], [30, -112], [44, -98]], c2, 1.5);
        oval(x, 50, -90, 2.5, 2, p.bones ? '#60ff80' : '#ffd020', 0);
        line(x, [[52, -82], [68, -84]], 1.5, INK);
        limb(x, [[-20, -30], [-14, -14], [-12, -2]], 9, c1);
        limb(x, [[22, -30], [30, -14], [34, -2]], 9, c1);
        for (const fx of [-12, 34]) for (const d of [-3, 1, 5]) line(x, [[fx, -2], [fx + d + 3, 1]], 1.5, '#f0f0e0');
        x.globalAlpha = 1;
    }
    function bird(x, p) {
        wing(x, -2, -62, 58, p.c1, false, 1);
        oval(x, 0, -52, 22, 14, p.c1, 2, INK, -0.2);
        x.beginPath(); x.moveTo(-18, -48); x.lineTo(-44, -40); x.lineTo(-40, -32); x.lineTo(-16, -40); x.closePath(); x.fillStyle = p.c1; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        oval(x, 22, -72, 11, 10, p.c2, 2);
        poly(x, [[30, -76], [46, -68], [30, -66]], '#f0c030', 1.5);
        oval(x, 25, -75, 1.8, 1.8, '#101010', 0);
        limb(x, [[-2, -40], [-4, -14], [0, -2]], 4, '#e0b040');
        limb(x, [[8, -40], [10, -14], [14, -2]], 4, '#e0b040');
        wing(x, 4, -60, 50, shade(p.c1, 1.15), false, 1);
        if (p.bolt) { glow(x, 20, -40, 30, '#a0c0ff', 0.4); poly(x, [[28, -110], [36, -92], [30, -92], [40, -74], [24, -94], [30, -94]], '#fff8a0', 1.2); }
    }
    function golem(x, p) {
        const c = p.c1, d = shade(c, 0.75);
        rrect(x, -14, -36, 10, 34, 2, d, 2); rrect(x, 4, -36, 10, 34, 2, d, 2);
        rrect(x, -22, -80, 44, 46, 4, c, 2);
        rrect(x, -12, -100, 24, 22, 3, c, 2);
        rect(x, -6, -92, 5, 3, '#ff5020'); rect(x, 3, -92, 5, 3, '#ff5020');
        rrect(x, -34, -78, 12, 40, 3, d, 2); rrect(x, 22, -78, 12, 40, 3, d, 2);
        if (p.rivets) for (const [a, b] of [[-16, -74], [16, -74], [-16, -40], [16, -40], [0, -58]]) oval(x, a, b, 2, 2, shade(c, 1.3), 1);
        if (p.shiny) { glow(x, -8, -70, 20, '#ffffff', 0.5); line(x, [[-16, -70], [-4, -50]], 2, '#ffffff'); }
        line(x, [[-22, -60], [22, -56]], 1.5, shade(c, 0.55));
    }
    function tree(x, p) {
        limb(x, [[-8, -40], [-12, -16], [-16, -2]], 10, p.c1);
        limb(x, [[8, -40], [12, -16], [18, -2]], 10, p.c1);
        poly(x, [[-16, -90], [16, -90], [14, -36], [-14, -36]], p.c1, 2);
        for (let i = 0; i < 4; i++) line(x, [[-10 + i * 6, -86], [-8 + i * 6, -40]], 1.2, shade(p.c1, 0.65));
        limb(x, [[-12, -82], [-34, -70], [-40, -50]], 6, p.c1);
        limb(x, [[12, -82], [30, -66], [36, -48]], 6, p.c1);
        for (const [a, b, r] of [[0, -104, 24], [-22, -96, 16], [22, -96, 16], [-36, -76, 10], [34, -74, 10]]) oval(x, a, b, r, r * 0.8, p.c2, 2);
        if (p.bloom) for (const [a, b] of [[-8, -112], [10, -100], [-24, -94], [26, -92]]) oval(x, a, b, 3, 3, p.bloom, 1);
        oval(x, -5, -68, 2.5, 3, '#f0e060', 0); oval(x, 6, -68, 2.5, 3, '#f0e060', 0);
        line(x, [[-6, -56], [6, -56]], 2, shade(p.c1, 0.4));
    }
    function genie(x, p) {
        if (p.fire) glow(x, 0, -60, 56, '#ff6010', 0.45);
        else glow(x, 0, -50, 50, '#80c0ff', 0.3);
        x.beginPath(); x.moveTo(-14, -42); x.bezierCurveTo(-20, -20, 10, -20, 0, -8); x.bezierCurveTo(-10, 2, 14, 2, 20, -6); x.bezierCurveTo(14, -16, 22, -30, 14, -42); x.closePath();
        x.fillStyle = p.fire ? '#f0a020' : shade(p.c1, 1.3); x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        const sk = p.c1;
        limb(x, [[-14, -74], [-26, -60], [-30, -48]], 7, sk);
        rrect(x, -16, -80, 32, 40, 8, sk, 2);
        rect(x, -16, -48, 32, 6, p.c2, 1.5);
        head(x, { skin: sk, helm: p.turban ? 'turban' : 'none', turban: p.turban, hair: p.fire ? '#ffa020' : null }, 2, -92, 11);
        if (p.fire) { for (const d of [-8, 0, 8]) poly(x, [[d - 4, -100], [d, -116 - Math.abs(d)], [d + 4, -100]], '#ffd040', 1); }
        limb(x, [[14, -74], [26, -64], [30, -78]], 7, sk);
        if (p.fire) { glow(x, 32, -82, 14, '#ff8020', 0.9); oval(x, 32, -82, 5, 5, '#ffe060', 1); }
        else oval(x, 30, -78, 4, 4, sk, 1.5);
    }
    function naga(x, p) {
        x.beginPath(); x.moveTo(-6, -40); x.bezierCurveTo(-60, -40, -60, 0, -10, -4); x.bezierCurveTo(30, -6, 40, -20, 10, -40); x.closePath();
        x.fillStyle = p.c1; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        x.beginPath(); x.moveTo(-40, -14); x.bezierCurveTo(-30, -2, 10, -2, 20, -16); x.lineWidth = 4; x.strokeStyle = shade(p.c1, 1.3); x.stroke();
        for (const [ax, ay, bx, by] of [[-8, -70, -30, -82], [-8, -62, -32, -60]]) { limb(x, [[ax, ay], [bx, by]], 5, p.skin); weapon(x, 'sword', bx, by, p); }
        rrect(x, -12, -82, 24, 44, 8, p.skin, 2);
        rect(x, -12, -72, 24, 7, p.c2, 1.5);
        head(x, { skin: p.skin, hair: '#202020', helm: p.crown ? 'crown' : 'none' }, 2, -94, 11);
        for (const [ax, ay, bx, by] of [[8, -72, 30, -84], [8, -62, 32, -58]]) { limb(x, [[ax, ay], [bx, by]], 5, p.skin); weapon(x, 'sword', bx, by, p); }
    }
    function ghost(x, p) {
        glow(x, 0, -56, 46, p.c1, 0.35);
        const pts = [[-14, -88], [14, -88], [22, -40], [18, -10], [10, -20], [4, -4], [-4, -18], [-12, -6], [-16, -22], [-26, -14]];
        poly(x, pts, rgba(p.c2, 0.85), 2);
        oval(x, 0, -92, 14, 15, p.c2, 2);
        oval(x, 4, -90, 9, 10, '#0a0a10', 0);
        oval(x, 1, -92, 2, 2, '#80ff90', 0); oval(x, 8, -92, 2, 2, '#80ff90', 0);
        limb(x, [[10, -78], [22, -64], [28, -66]], 4, p.c1);
        if (p.scythe) weapon(x, 'scythe', 26, -60, p);
        else for (const d of [-3, 0, 3]) line(x, [[28, -66 + d], [36, -64 + d]], 1.5, '#f0f0f0');
    }
    function rider(x, p) {
        const mount = { head: p.mount === 'wolf' ? 'wolf' : 'horse', c1: p.mc, c2: shade(p.mc, 0.8), mane: p.mount === 'horse' ? shade(p.mc, 0.5) : null };
        if (p.mount === 'camel') { mount.head = 'horse'; mount.mane = null; }
        x.save(); if (p.mount === 'wolf') { x.scale(0.85, 0.85); }
        quadruped(x, mount);
        if (p.mount === 'camel') oval(x, -2, -60, 14, 10, p.mc, 2);
        x.restore();
        x.save(); x.translate(-2, p.mount === 'wolf' ? -8 : p.mount === 'camel' ? -20 : -14);
        limb(x, [[2, -38], [12, -24], [8, -10]], 6, p.armor || shade(p.c1, 0.7));
        man(x, p, { sitting: true });
        x.restore();
    }
    function centaur(x, p) {
        quadruped(x, { head: 'none', c1: p.mc, c2: shade(p.mc, 0.8) });
        x.save(); x.translate(24, -12); man(x, Object.assign({}, p, { robe: 0 }), { sitting: true }); x.restore();
    }
    function machine(x, p) {
        if (p.a === 'ballista') {
            for (const wx of [-24, 20]) { oval(x, wx, -12, 11, 11, '#6a4a2a', 2); oval(x, wx, -12, 3, 3, '#3a2a1a', 1); }
            poly(x, [[-36, -26], [40, -40], [42, -32], [-34, -18]], '#8a5a2a', 2);
            x.beginPath(); x.arc(30, -36, 26, -1.9, 1.3); x.lineWidth = 5; x.strokeStyle = INK; x.stroke(); x.lineWidth = 3; x.strokeStyle = '#b0a080'; x.stroke();
            line(x, [[-20, -24], [58, -44]], 2, '#d8dde4');
        } else if (p.a === 'tent') {
            poly(x, [[-40, -2], [0, -70], [40, -2]], '#f0ece0', 2);
            poly(x, [[-6, -2], [0, -40], [6, -2]], '#5a4a3a', 1.5);
            rect(x, -18, -46, 8, 20, '#d02020'); rect(x, -24, -40, 20, 8, '#d02020');
            line(x, [[0, -70], [0, -86]], 2, INK); poly(x, [[0, -86], [16, -82], [0, -78]], '#d02020', 1);
        } else if (p.a === 'tower') {
            rrect(x, -22, -100, 44, 98, 3, '#a8a090', 2);
            for (let i = 0; i < 4; i++) rect(x, -22 + i * 12, -112, 8, 12, '#a8a090', 2);
            rect(x, -4, -80, 8, 14, '#2a2020'); rect(x, -4, -46, 8, 14, '#2a2020');
        }
    }
    function creatureCanvas(cid) {
        const d = cdef(cid), p = d.art;
        const [c, x] = canvas(176, 140);
        x.translate(88, 134);
        const sc = p.sc || 1;
        x.scale(sc, sc);
        oval(x, 0, -1, 38, 6, 'rgba(0,0,0,0.25)', 0);
        switch (p.a) {
            case 'man': man(x, p); break;
            case 'beast': quadruped(x, p); break;
            case 'dragon': x.scale(1.05, 1.05); dragon(x, p); break;
            case 'bird': x.scale(1.1, 1.1); bird(x, p); break;
            case 'golem': golem(x, p); break;
            case 'tree': tree(x, p); break;
            case 'genie': genie(x, p); break;
            case 'naga': naga(x, p); break;
            case 'ghost': ghost(x, p); break;
            case 'rider': rider(x, p); break;
            case 'centaur': centaur(x, p); break;
            default: machine(x, p);
        }
        x.setTransform(1, 0, 0, 1, 0, 0);
        light(x, 176, 140, 0.3);
        return c;
    }

    // ======================= terrain =======================
    const patterns = {};
    function terrainPattern(t) {
        if (patterns[t]) return patterns[t];
        const S = 64, [c, x] = canvas(S, S);
        const r = rnd(t * 977 + 13);
        const base = TERRAIN[t].color;
        rect(x, 0, 0, S, S, base);
        const speck = (n, cols, size) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; const s = size * (0.5 + r()); x.fillRect(r() * S, r() * S, s, s); } };
        switch (TERRAIN[t].id) {
            case 'water':
                speck(60, [shade(base, 1.08), shade(base, 0.92)], 4);
                for (let i = 0; i < 9; i++) { const a = r() * S, b = r() * S; x.beginPath(); x.arc(a, b, 5, 0.2, Math.PI - 0.2); x.lineWidth = 1.3; x.strokeStyle = 'rgba(200,230,255,0.45)'; x.stroke(); }
                break;
            case 'grass':
                speck(240, [shade(base, 1.15), shade(base, 0.85), shade(base, 0.75), '#5f9a36'], 2.5);
                for (let i = 0; i < 40; i++) { const a = r() * S, b = r() * S; line(x, [[a, b], [a + r() * 2 - 1, b - 4]], 1, shade(base, 1.3)); }
                for (let i = 0; i < 4; i++) oval(x, r() * S, r() * S, 1.5, 1.5, r() > 0.5 ? '#f0e060' : '#f0f0f0', 0);
                break;
            case 'dirt': speck(260, [shade(base, 1.15), shade(base, 0.85), '#6a5030', '#9a7a4a'], 3); for (let i = 0; i < 8; i++) oval(x, r() * S, r() * S, 2, 1.5, '#7a7060', 0.6); break;
            case 'sand': speck(300, [shade(base, 1.07), shade(base, 0.92), '#c8b070'], 2); for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(r() * S, r() * S, 8, 0.3, 1.2); x.lineWidth = 1; x.strokeStyle = shade(base, 0.85); x.stroke(); } break;
            case 'snow': speck(160, ['#ffffff', '#d8e2ee', '#c8d4e4'], 3); for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(r() * S, r() * S, 7, 0.2, 1.4); x.lineWidth = 1; x.strokeStyle = '#b8c8dc'; x.stroke(); } break;
            case 'swamp':
                speck(220, [shade(base, 1.2), shade(base, 0.8), '#3a5a3a'], 3);
                for (let i = 0; i < 6; i++) oval(x, r() * S, r() * S, 4 + r() * 4, 2 + r() * 2, '#2a4a5a', 0);
                for (let i = 0; i < 12; i++) { const a = r() * S, b = r() * S; line(x, [[a, b], [a, b - 6]], 1, '#7a9a4a'); }
                break;
            case 'rough': speck(240, [shade(base, 1.15), shade(base, 0.8), '#7a6040'], 3); for (let i = 0; i < 14; i++) oval(x, r() * S, r() * S, 2 + r() * 2, 1.5 + r(), '#8a8070', 0.8); break;
            case 'lava':
                speck(240, ['#3a2a2a', '#5a4040', '#2a1a1a'], 3);
                for (let i = 0; i < 6; i++) { let a = r() * S, b = r() * S; const pts = [[a, b]]; for (let k = 0; k < 4; k++) { a += r() * 10 - 5; b += r() * 10 - 5; pts.push([a, b]); } line(x, pts, 2.2, '#ff6010'); line(x, pts, 1, '#ffd040'); }
                break;
        }
        patterns[t] = c;
        return c;
    }

    // ======================= map objects =======================
    function decorCanvas(t, v, wall) {
        const W = wall ? 64 : 48, H = wall ? 64 : 56, [c, x] = canvas(W, H);
        const r = rnd(t * 131 + v * 7 + (wall ? 999 : 0));
        const id = TERRAIN[t].id;
        const pine = (px, py, s, col, snow) => {
            line(x, [[px, py], [px, py - 8 * s]], 3 * s, '#5a3a20');
            for (let i = 0; i < 3; i++) poly(x, [[px - (12 - i * 3) * s, py - (6 + i * 9) * s], [px, py - (22 + i * 9) * s], [px + (12 - i * 3) * s, py - (6 + i * 9) * s]], col, 1.5);
            if (snow) for (let i = 0; i < 3; i++) poly(x, [[px - 4 * s, py - (16 + i * 9) * s], [px, py - (22 + i * 9) * s], [px + 4 * s, py - (16 + i * 9) * s]], '#ffffff', 0);
        };
        const oak = (px, py, s, col) => {
            limb(x, [[px, py], [px, py - 14 * s]], 4 * s, '#6a4220');
            for (const [a, b, rr] of [[0, -22, 11], [-8, -16, 8], [8, -16, 8], [0, -30, 7]]) oval(x, px + a * s, py + b * s, rr * s, rr * 0.85 * s, col, 1.5);
            oval(x, px - 3 * s, py - 25 * s, 4 * s, 3 * s, shade(col, 1.25), 0);
        };
        const rock = (px, py, s, col) => { poly(x, [[px - 12 * s, py], [px - 9 * s, py - 10 * s], [px - 1 * s, py - 15 * s], [px + 9 * s, py - 9 * s], [px + 12 * s, py]], col, 1.5); line(x, [[px - 1 * s, py - 15 * s], [px + 2 * s, py]], 1, shade(col, 0.7)); };
        const mountain = (px, py, s, col, cap) => {
            poly(x, [[px - 30 * s, py], [px - 6 * s, py - 44 * s], [px + 4 * s, py - 36 * s], [px + 12 * s, py - 48 * s], [px + 32 * s, py]], col, 2);
            poly(x, [[px - 6 * s, py - 44 * s], [px + 4 * s, py - 36 * s], [px + 2 * s, py], [px - 12 * s, py]], shade(col, 0.8), 0);
            if (cap) poly(x, [[px - 14 * s, py - 30 * s], [px - 6 * s, py - 44 * s], [px + 4 * s, py - 36 * s], [px + 12 * s, py - 48 * s], [px + 20 * s, py - 32 * s], [px + 10 * s, py - 36 * s], [px + 2 * s, py - 28 * s], [px - 6 * s, py - 34 * s]], cap, 1);
        };
        const cactus = (px, py, s) => { rrect(x, px - 3 * s, py - 24 * s, 6 * s, 24 * s, 3, '#4a8a3a', 1.5); rrect(x, px - 11 * s, py - 18 * s, 5 * s, 10 * s, 2, '#4a8a3a', 1.2); rrect(x, px + 6 * s, py - 20 * s, 5 * s, 8 * s, 2, '#4a8a3a', 1.2); };
        const deadtree = (px, py, s) => { limb(x, [[px, py], [px, py - 22 * s], [px - 8 * s, py - 30 * s]], 3 * s, '#5a4a3a'); limb(x, [[px, py - 14 * s], [px + 9 * s, py - 24 * s]], 2 * s, '#5a4a3a'); };
        const bx = W / 2, by = H - 4;
        if (wall) {
            const mcol = { grass: '#8a8070', dirt: '#7a6a5a', sand: '#c0a070', snow: '#c8d0dc', swamp: '#5a6a5a', rough: '#8a7058', lava: '#4a3434' }[id];
            if (r() < (id === 'grass' || id === 'swamp' || id === 'snow' ? 0.45 : 0.75)) mountain(bx, by, 0.9 + r() * 0.2, mcol, id === 'snow' ? '#ffffff' : id === 'lava' ? '#ff6020' : '#e8e8e8');
            else for (let i = 0; i < 4; i++) {
                const px = 12 + r() * 40, py = 30 + r() * 30;
                if (id === 'snow') pine(px, py, 1.1, '#2a5a3a', true);
                else if (id === 'grass') (r() < 0.5 ? pine(px, py, 1.1, '#2a6a2a') : oak(px, py, 1, '#3a7a2a'));
                else if (id === 'swamp') oak(px, py, 1, '#4a6a3a');
                else if (id === 'lava') deadtree(px, py, 1.2);
                else rock(px, py, 1.2, mcol);
            }
            return c;
        }
        const k = r();
        switch (id) {
            case 'grass': if (k < 0.45) oak(bx, by, 1, r() < 0.5 ? '#3a7a2a' : '#4a8a2a'); else if (k < 0.8) pine(bx, by, 1, '#2a6a2a'); else rock(bx, by, 1, '#9a948a'); if (r() < 0.5) oak(bx + 12, by - 2, 0.7, '#4a8a3a'); break;
            case 'dirt': if (k < 0.4) deadtree(bx, by, 1); else if (k < 0.7) oak(bx, by, 0.9, '#5a7a2a'); else rock(bx, by, 1, '#8a7a6a'); break;
            case 'sand': if (k < 0.5) cactus(bx, by, 1); else rock(bx, by, 1, '#c8a878'); if (r() < 0.4) cactus(bx + 12, by, 0.7); break;
            case 'snow': pine(bx, by, 1, '#2a5a3a', true); if (r() < 0.6) pine(bx + 12, by + 2, 0.75, '#2a5a3a', true); break;
            case 'swamp': if (k < 0.6) oak(bx, by, 1, '#4a6a3a'); else deadtree(bx, by, 1); for (let i = 0; i < 4; i++) line(x, [[bx - 14 + i * 9, by], [bx - 15 + i * 9, by - 10]], 1.5, '#7a8a3a'); break;
            case 'rough': rock(bx, by, 1.1, '#9a8468'); if (r() < 0.6) rock(bx + 10, by, 0.6, '#8a7458'); break;
            case 'lava': if (k < 0.5) { rock(bx, by, 1.1, '#3a2a2a'); glow(x, bx, by - 6, 10, '#ff6010', 0.5); } else deadtree(bx, by, 1.1); break;
        }
        return c;
    }
    function townCanvas(fac) {
        const F = FACTIONS[fac], [c, x] = canvas(176, 128);
        const wall = F.wall, roof = F.roof, d = shade(wall, 0.75);
        const tower = (tx, ty, w, h, rc) => {
            rect(x, tx - w / 2, ty - h, w, h, wall, 2);
            rect(x, tx - w / 2 + 2, ty - h, w / 3, h, shade(wall, 1.1));
            if (fac === 'tower' || fac === 'castle' || fac === 'rampart') poly(x, [[tx - w / 2 - 3, ty - h], [tx, ty - h - w * 1.1], [tx + w / 2 + 3, ty - h]], rc || roof, 2);
            else if (fac === 'inferno') { poly(x, [[tx - w / 2 - 2, ty - h], [tx - w / 2 + 2, ty - h - 10], [tx, ty - h - 4], [tx + w / 2 - 2, ty - h - 12], [tx + w / 2 + 2, ty - h]], roof, 2); glow(x, tx, ty - h - 6, 10, '#ff8020', 0.6); }
            else if (fac === 'necropolis') { poly(x, [[tx - w / 2 - 2, ty - h], [tx, ty - h - w * 1.4], [tx + w / 2 + 2, ty - h]], roof, 2); oval(x, tx, ty - h * 0.6, 2, 3, '#80ff90', 0); }
            else for (let i = 0; i < 3; i++) rect(x, tx - w / 2 + i * (w / 3), ty - h - 5, w / 3 - 2, 5, wall, 1.5);
            rect(x, tx - 2, ty - h * 0.65, 4, 7, '#2a2020');
        };
        // keep
        tower(88, 70, 34, 50);
        tower(60, 80, 18, 36); tower(116, 80, 18, 36);
        // outer wall
        rect(x, 22, 92, 132, 30, d, 2);
        for (let i = 0; i < 11; i++) rect(x, 22 + i * 12, 86, 8, 7, d, 1.5);
        tower(24, 124, 20, 42); tower(152, 124, 20, 42);
        // gate
        x.beginPath(); x.moveTo(78, 124); x.lineTo(78, 106); x.arc(88, 106, 10, Math.PI, 0); x.lineTo(98, 124); x.closePath(); x.fillStyle = '#3a2a1a'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
        for (let i = 0; i < 4; i++) line(x, [[81 + i * 5, 100], [81 + i * 5, 124]], 1, '#6a5a3a');
        if (fac === 'rampart') for (const [a, b] of [[10, 110], [166, 108], [40, 70], [136, 72]]) { oval(x, a, b, 10, 9, '#3a8a3a', 1.5); }
        if (fac === 'inferno') { glow(x, 88, 30, 30, '#ff4010', 0.4); }
        if (fac === 'necropolis') for (const a of [8, 168]) { rect(x, a - 2, 104, 4, 20, '#8a8a90', 1); rect(x, a - 6, 108, 12, 3, '#8a8a90', 1); }
        light(x, 176, 128, 0.25);
        return c;
    }
    function flagCanvas() {
        const [c, x] = canvas(20, 24);
        line(x, [[3, 2], [3, 23]], 2, '#3a2a1a');
        poly(x, [[4, 2], [18, 5], [14, 8], [18, 11], [4, 13]], '#ffffff', 1.2, '#202020');
        return c;
    }
    function heroMapCanvas(color) {
        const [c, x] = canvas(56, 64);
        x.translate(28, 60); x.scale(0.44, 0.44);
        oval(x, 0, -1, 36, 6, 'rgba(0,0,0,0.3)', 0);
        quadruped(x, { head: 'horse', c1: '#7a4a2a', c2: '#5a3a1a', mane: '#2a1a10', barding: color });
        x.save(); x.translate(-2, -14);
        man(x, { skin: '#e8b890', c1: color, armor: '#c0c8d0', helm: 'plume', wpn: 'none', cape: color }, { sitting: true });
        x.restore();
        line(x, [[-14, -70], [-14, -124]], 4, '#3a2a1a');
        poly(x, [[-12, -124], [24, -116], [14, -108], [24, -100], [-12, -96]], color, 3);
        x.setTransform(1, 0, 0, 1, 0, 0);
        light(x, 56, 64, 0.25);
        return c;
    }
    function resCanvas(r, S = 32) {
        const [c, x] = canvas(S, S);
        x.scale(S / 32, S / 32);
        switch (r) {
            case 'gold': for (const [a, b] of [[10, 24], [20, 25], [15, 19], [8, 17], [22, 18], [15, 12]]) { oval(x, a, b, 6, 3.5, '#f0c030', 1.2); oval(x, a, b - 1, 3, 1.5, '#fff0a0', 0); } break;
            case 'wood': for (const [a, b] of [[16, 25], [12, 19], [20, 19], [16, 13]]) { rrect(x, a - 10, b - 3, 20, 7, 3, '#8a5a2a', 1.2); oval(x, a + 9, b, 3, 3.5, '#d0a060', 1); } break;
            case 'ore': for (const [a, b, s] of [[10, 24, 7], [21, 23, 8], [15, 15, 7]]) poly(x, [[a - s, b + 3], [a - s + 2, b - s + 2], [a + 1, b - s], [a + s, b - 2], [a + s - 1, b + 3]], '#7a7a80', 1.2); break;
            case 'mercury': poly(x, [[12, 4], [20, 4], [19, 10], [26, 26], [6, 26], [13, 10]], '#d8e0e8', 1.5); oval(x, 16, 21, 8, 4, '#b0b8c8', 0); oval(x, 13, 19, 2, 1.5, '#ffffff', 0); break;
            case 'sulfur': poly(x, [[4, 27], [10, 16], [16, 10], [23, 15], [28, 27]], '#e8d020', 1.5); oval(x, 14, 16, 3, 2, '#fff880', 0); break;
            case 'crystal': for (const [a, h, col] of [[10, 18, '#e04050'], [17, 24, '#f06070'], [23, 16, '#d03040']]) poly(x, [[a - 4, 28], [a - 3, 28 - h + 4], [a, 28 - h], [a + 3, 28 - h + 4], [a + 4, 28]], col, 1.2); break;
            case 'gems': for (const [a, b, col] of [[10, 22, '#40c060'], [21, 22, '#4080f0'], [15, 13, '#f0d040']]) poly(x, [[a - 6, b], [a - 3, b - 5], [a + 3, b - 5], [a + 6, b], [a, b + 6]], col, 1.2); break;
        }
        return c;
    }
    function mineCanvas(res) {
        const [c, x] = canvas(96, 72);
        const rcol = { gold: '#f0c030', wood: '#8a5a2a', ore: '#7a7a80', mercury: '#c8d0e0', sulfur: '#e8d020', crystal: '#e04050', gems: '#40a0f0' }[res];
        if (res === 'wood') {
            rect(x, 14, 34, 58, 30, '#9a6a3a', 2); poly(x, [[8, 36], [43, 14], [78, 36]], '#6a4a2a', 2);
            x.beginPath(); x.arc(78, 48, 14, 0, Math.PI * 2); x.fillStyle = '#c0c0c8'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
            for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(x, [[78 + Math.cos(a) * 14, 48 + Math.sin(a) * 14], [78 + Math.cos(a) * 17, 48 + Math.sin(a) * 17]], 2, '#808088'); }
            for (const [a, b] of [[18, 66], [30, 66], [24, 60]]) { rrect(x, a - 8, b - 3, 16, 6, 3, '#8a5a2a', 1); }
        } else if (res === 'sulfur' || res === 'mercury') {
            if (res === 'sulfur') { poly(x, [[4, 68], [30, 30], [48, 22], [70, 36], [92, 68]], '#d8c020', 2); glow(x, 48, 30, 18, '#fff060', 0.5); poly(x, [[38, 68], [40, 52], [56, 52], [58, 68]], '#3a2a10', 1.5); }
            else {
                rect(x, 16, 28, 56, 40, '#a09080', 2); poly(x, [[10, 30], [44, 10], [78, 30]], '#5a4a6a', 2);
                for (const a of [26, 46]) { poly(x, [[a, 44], [a + 10, 44], [a + 12, 58], [a - 2, 58]], '#c8d8e8', 1.5); }
                rect(x, 66, 8, 8, 24, '#6a6060', 1.5); glow(x, 70, 6, 10, '#c0e0ff', 0.6);
                rect(x, 40, 52, 10, 16, '#3a2a1a', 1.5);
            }
        } else {
            poly(x, [[2, 70], [16, 30], [40, 14], [62, 22], [84, 34], [94, 70]], '#8a7a68', 2);
            poly(x, [[30, 70], [32, 44], [48, 36], [62, 44], [64, 70]], '#1a1410', 2);
            rect(x, 32, 42, 4, 28, '#7a5a2a', 1); rect(x, 58, 42, 4, 28, '#7a5a2a', 1); rect(x, 30, 40, 34, 5, '#7a5a2a', 1);
            if (res === 'gems') { oval(x, 78, 60, 14, 6, '#3060c0', 2); }
            for (const [a, b] of [[16, 64], [74, 66], [84, 56]]) { const cc = resCanvas(res, 18); x.drawImage(cc, a - 9, b - 12); }
        }
        light(x, 96, 72, 0.25);
        return c;
    }
    function siteCanvas(kind) {
        const small = SMALL_SITES.includes(kind);
        const W = small ? 40 : 64, H = small ? 44 : 64, [c, x] = canvas(W, H);
        const cx = W / 2, by = H - 3;
        switch (kind) {
            case 'windmill':
                rect(x, cx - 10, by - 34, 20, 34, '#d8c8a0', 2); poly(x, [[cx - 12, by - 34], [cx, by - 46], [cx + 12, by - 34]], '#8a4a2a', 2);
                for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; poly(x, [[cx, by - 38], [cx + Math.cos(a) * 28, by - 38 + Math.sin(a) * 28], [cx + Math.cos(a + 0.25) * 26, by - 38 + Math.sin(a + 0.25) * 26]], '#f0ece0', 1.5); }
                rect(x, cx - 4, by - 12, 8, 12, '#5a3a1a', 1.5); break;
            case 'waterwheel':
                oval(x, cx + 12, by - 8, 16, 6, '#3a7ac0', 1.5);
                rect(x, cx - 26, by - 30, 30, 30, '#b09070', 2); poly(x, [[cx - 30, by - 30], [cx - 11, by - 44], [cx + 8, by - 30]], '#7a3a2a', 2);
                x.beginPath(); x.arc(cx + 14, by - 20, 15, 0, Math.PI * 2); x.lineWidth = 4; x.strokeStyle = INK; x.stroke(); x.lineWidth = 2.5; x.strokeStyle = '#8a5a2a'; x.stroke();
                for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(x, [[cx + 14, by - 20], [cx + 14 + Math.cos(a) * 15, by - 20 + Math.sin(a) * 15]], 2, '#8a5a2a'); }
                break;
            case 'well': rrect(x, cx - 12, by - 16, 24, 16, 3, '#9a948a', 2); glow(x, cx, by - 16, 14, '#60a0ff', 0.8); oval(x, cx, by - 16, 10, 3, '#4080f0', 1.5); line(x, [[cx - 12, by - 16], [cx - 12, by - 34], [cx + 12, by - 34], [cx + 12, by - 16]], 3, '#6a4a2a'); poly(x, [[cx - 16, by - 32], [cx, by - 42], [cx + 16, by - 32]], '#7a3a2a', 1.5); break;
            case 'shrine1': case 'shrine2': case 'shrine3': {
                const col = { shrine1: '#4080ff', shrine2: '#40c060', shrine3: '#e04040' }[kind];
                rect(x, cx - 14, by - 6, 28, 6, '#c8c0b0', 1.5);
                for (const a of [cx - 11, cx + 7]) rect(x, a, by - 26, 4, 20, '#e0d8c8', 1.2);
                poly(x, [[cx - 16, by - 26], [cx, by - 36], [cx + 16, by - 26]], '#c8c0b0', 1.5);
                glow(x, cx, by - 15, 12, col, 0.9); star(x, cx, by - 15, 5, col, 1, 4); break;
            }
            case 'witch': limb(x, [[cx - 6, by], [cx - 8, by - 10], [cx - 4, by - 16]], 2, '#e0a030'); limb(x, [[cx + 6, by], [cx + 8, by - 10], [cx + 4, by - 16]], 2, '#e0a030'); rect(x, cx - 12, by - 34, 24, 18, '#6a5a3a', 2); poly(x, [[cx - 15, by - 33], [cx + 2, by - 44], [cx + 15, by - 33]], '#8a8a40', 1.5); rect(x, cx - 3, by - 28, 6, 8, '#f0d040', 1); break;
            case 'arena': oval(x, cx, by - 18, 28, 14, '#c8b890', 2); oval(x, cx, by - 20, 20, 8, '#d8c8a0', 1.5); for (let i = -3; i <= 3; i++) rect(x, cx + i * 7 - 2, by - 26, 4, 10, '#e8dcc0', 1); oval(x, cx, by - 18, 14, 5, '#c8a060', 1); line(x, [[cx - 6, by - 20], [cx + 6, by - 16]], 2, '#d8dde4'); break;
            case 'merc': for (const [a, col] of [[cx - 14, '#c04030'], [cx + 10, '#d0a040']]) { poly(x, [[a - 12, by], [a, by - 26], [a + 12, by]], col, 2); line(x, [[a, by - 26], [a, by - 36]], 1.5, INK); poly(x, [[a, by - 36], [a + 8, by - 33], [a, by - 30]], '#f0f0f0', 1); } break;
            case 'marletto': rect(x, cx - 9, by - 50, 18, 50, '#a8a090', 2); for (let i = 0; i < 3; i++) rect(x, cx - 9 + i * 7, by - 56, 5, 6, '#a8a090', 1.5); rect(x, cx - 3, by - 40, 6, 8, '#2a2020'); rect(x, cx - 4, by - 12, 8, 12, '#4a3020', 1); break;
            case 'staraxis': rect(x, cx - 12, by - 8, 24, 8, '#8a8070', 1.5); line(x, [[cx, by - 8], [cx, by - 26]], 3, '#c8a040'); for (const r of [16, 11]) { x.beginPath(); x.ellipse(cx, by - 32, r, r * 0.45, 0.4, 0, Math.PI * 2); x.lineWidth = 2; x.strokeStyle = '#e0b030'; x.stroke(); } star(x, cx, by - 32, 6, '#fff080', 1); break;
            case 'garden': oval(x, cx, by - 10, 26, 10, '#3a8a3a', 2); for (let i = 0; i < 10; i++) oval(x, cx - 22 + i * 5, by - 10 + Math.sin(i) * 5, 2.5, 2.5, ['#f04060', '#f0e040', '#f0f0f0', '#c060f0'][i % 4], 0.8); rrect(x, cx - 6, by - 28, 12, 18, 3, '#d8d0c0', 1.5); glow(x, cx, by - 30, 10, '#a0ffa0', 0.7); break;
            case 'learnstone': poly(x, [[cx - 10, by], [cx - 12, by - 36], [cx - 2, by - 46], [cx + 10, by - 40], [cx + 12, by]], '#8a8a90', 2); for (let i = 0; i < 4; i++) line(x, [[cx - 4, by - 34 + i * 8], [cx + 5, by - 33 + i * 8]], 1.5, '#60c0ff'); break;
            case 'tree': limb(x, [[cx, by], [cx, by - 26]], 8, '#6a4220'); for (const [a, b, r] of [[0, -40, 20], [-14, -32, 12], [14, -32, 12]]) oval(x, cx + a, by + b, r, r * 0.8, '#3a8a2a', 2); for (const [a, b] of [[-8, -44], [6, -38], [-14, -30], [14, -30], [0, -50]]) oval(x, cx + a, by + b, 3, 3, '#f0c030', 1); break;
            case 'temple': rect(x, cx - 24, by - 6, 48, 6, '#d8d0c0', 1.5); for (let i = 0; i < 5; i++) rect(x, cx - 22 + i * 10, by - 32, 5, 26, '#ece4d4', 1.2); poly(x, [[cx - 26, by - 32], [cx, by - 46], [cx + 26, by - 32]], '#d8d0c0', 2); glow(x, cx, by - 20, 12, '#fff0a0', 0.6); break;
            case 'fountain': oval(x, cx, by - 8, 16, 6, '#a8a090', 1.5); oval(x, cx, by - 9, 12, 4, '#5090e0', 0); rect(x, cx - 2, by - 26, 4, 18, '#a8a090', 1); for (const d of [-1, 1]) { x.beginPath(); x.moveTo(cx, by - 26); x.quadraticCurveTo(cx + d * 10, by - 34, cx + d * 12, by - 10); x.lineWidth = 2; x.strokeStyle = '#a0d0ff'; x.stroke(); } oval(x, cx + 5, by - 9, 2, 1.5, '#f0c030', 0); break;
            case 'stables': rect(x, cx - 26, by - 26, 52, 26, '#9a6a3a', 2); poly(x, [[cx - 30, by - 26], [cx, by - 44], [cx + 30, by - 26]], '#7a2a1a', 2); rect(x, cx - 8, by - 18, 16, 18, '#4a2a10', 1.5); line(x, [[cx - 8, by - 18], [cx + 8, by]], 1.5, '#8a6a3a'); line(x, [[cx + 8, by - 18], [cx - 8, by]], 1.5, '#8a6a3a'); break;
            case 'scholar': poly(x, [[cx - 8, by], [cx - 6, by - 22], [cx + 6, by - 22], [cx + 8, by]], '#5a4a8a', 1.5); oval(x, cx, by - 27, 5, 5, '#e8b890', 1.2); rect(x, cx + 6, by - 18, 8, 10, '#a02020', 1); rect(x, cx - 16, by - 6, 10, 6, '#2a6a2a', 1); break;
            case 'monolith': poly(x, [[cx - 7, by], [cx - 8, by - 36], [cx, by - 42], [cx + 8, by - 36], [cx + 7, by]], '#6a6a7a', 2); glow(x, cx, by - 22, 12, '#c060ff', 0.9); oval(x, cx, by - 22, 4, 6, '#e0b0ff', 1); break;
            case 'prison': rect(x, cx - 22, by - 34, 44, 34, '#5a5a60', 2); for (let i = 0; i < 6; i++) line(x, [[cx - 18 + i * 7, by - 30], [cx - 18 + i * 7, by - 2]], 2, '#2a2a2a'); poly(x, [[cx - 24, by - 34], [cx, by - 44], [cx + 24, by - 34]], '#4a4a50', 2); oval(x, cx, by - 18, 4, 4, '#e8b890', 1); break;
            case 'pandora': rrect(x, cx - 13, by - 18, 26, 18, 3, '#7a2a8a', 2); rrect(x, cx - 14, by - 24, 28, 7, 3, '#9a3aaa', 2); rect(x, cx - 2, by - 22, 4, 22, '#f0c030', 1); glow(x, cx, by - 24, 14, '#ff80ff', 0.5); break;
            case 'oasis': oval(x, cx, by - 8, 24, 8, '#3a8ad0', 2); for (const a of [cx - 16, cx + 14]) { limb(x, [[a, by - 6], [a + 2, by - 36]], 3, '#8a6a3a'); for (let i = 0; i < 5; i++) { const an = -Math.PI + i * Math.PI / 4; line(x, [[a + 2, by - 36], [a + 2 + Math.cos(an) * 14, by - 36 + Math.sin(an) * 6 + 6]], 3, '#3a8a2a'); } } break;
            case 'sanctuary': rect(x, cx - 22, by - 26, 44, 26, '#d8d0b8', 2); x.beginPath(); x.arc(cx, by - 26, 16, Math.PI, 0); x.closePath(); x.fillStyle = '#4060a0'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); for (let i = 0; i < 4; i++) rect(x, cx - 18 + i * 11, by - 22, 4, 22, '#ece4d4', 1); break;
        }
        light(x, W, H, 0.2);
        return c;
    }
    function dwellingCanvas() {
        const [c, x] = canvas(64, 64);
        poly(x, [[4, 62], [8, 30], [32, 12], [56, 30], [60, 62]], '#8a7a60', 2);
        poly(x, [[22, 62], [22, 42], [32, 34], [42, 42], [42, 62]], '#2a1e14', 2);
        line(x, [[8, 30], [32, 12], [56, 30]], 3, '#5a4a30');
        light(x, 64, 64, 0.2);
        return c;
    }
    function chestCanvas() { const [c, x] = canvas(32, 32); rrect(x, 5, 14, 22, 14, 2, '#8a5a2a', 1.5); rrect(x, 4, 9, 24, 8, 4, '#a06a30', 1.5); rect(x, 14, 12, 4, 7, '#f0c030', 1); line(x, [[5, 20], [27, 20]], 1.5, '#5a3a1a'); return c; }
    function campfireCanvas() { const [c, x] = canvas(32, 32); for (const a of [-0.5, 0.5]) { x.save(); x.translate(16, 26); x.rotate(a); rrect(x, -12, -2, 24, 5, 2, '#6a4a2a', 1); x.restore(); } glow(x, 16, 18, 12, '#ff8020', 0.8); poly(x, [[10, 25], [13, 12], [16, 18], [19, 8], [22, 25]], '#ffb030', 1.2); poly(x, [[13, 25], [16, 17], [19, 25]], '#fff080', 0); return c; }

    // ======================= icons =======================
    function artCanvas(aid, S = 44) {
        const a = ARTIFACTS[aid], [c, x] = canvas(S, S);
        x.scale(S / 44, S / 44);
        const tint = ['#c0c0c0', '#c8c8d0', '#6ab0f0', '#d070f0', '#f0c030'][a.cls];
        rrect(x, 1, 1, 42, 42, 6, '#2a2018', 1.5, '#806040');
        glow(x, 22, 22, 20, tint, 0.35);
        const h = (aid.length * 37) % 360;
        const col = `hsl(${h},55%,55%)`;
        switch (a.slot) {
            case 'weapon':
                if (/club|flail/.test(aid)) { limb(x, [[10, 36], [26, 14]], 4, '#7a4a20'); oval(x, 28, 12, 7, 7, '#8a8a90', 1.5); }
                else if (/axe/.test(aid)) { limb(x, [[12, 36], [28, 10]], 3, '#7a4a20'); poly(x, [[24, 12], [36, 8], [34, 22], [26, 18]], '#d8dde4', 1.5); }
                else { poly(x, [[12, 32], [32, 8], [36, 8], [36, 12], [16, 36]], aid === 'hellfire' ? '#ffa030' : '#e0e4ea', 1.5); line(x, [[9, 28], [20, 39]], 3, '#c8a040'); }
                break;
            case 'shield': poly(x, [[10, 8], [34, 8], [34, 24], [22, 38], [10, 24]], col, 2); oval(x, 22, 20, 4, 4, '#f0c030', 1); break;
            case 'head':
                if (/crown|dragon/.test(aid)) poly(x, [[8, 32], [8, 14], [15, 22], [22, 10], [29, 22], [36, 14], [36, 32]], '#f0c030', 1.5);
                else if (/skull/.test(aid)) { oval(x, 22, 20, 12, 13, '#ece4cc', 1.5); oval(x, 17, 20, 3, 4, '#201818', 0); oval(x, 27, 20, 3, 4, '#201818', 0); }
                else { x.beginPath(); x.arc(22, 26, 14, Math.PI, 0); x.closePath(); x.fillStyle = col; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); rect(x, 20, 24, 4, 10, col, 1); }
                break;
            case 'torso': poly(x, [[10, 10], [18, 6], [26, 6], [34, 10], [32, 36], [12, 36]], col, 2); line(x, [[22, 8], [22, 36]], 1.5, shade(col, 0.6)); break;
            case 'neck': x.beginPath(); x.arc(22, 16, 11, 0.2, Math.PI - 0.2); x.lineWidth = 2; x.strokeStyle = '#f0c030'; x.stroke(); star(x, 22, 30, 7, col, 1.2, 6); break;
            case 'cloak': poly(x, [[14, 8], [30, 8], [38, 38], [6, 38]], col, 2); break;
            case 'ring': x.beginPath(); x.arc(22, 26, 10, 0, Math.PI * 2); x.lineWidth = 5; x.strokeStyle = INK; x.stroke(); x.lineWidth = 3; x.strokeStyle = '#f0c030'; x.stroke(); poly(x, [[17, 16], [22, 10], [27, 16], [22, 20]], col, 1.2); break;
            case 'feet': poly(x, [[14, 8], [24, 8], [24, 30], [36, 32], [36, 38], [12, 38]], col, 2); if (/speed/.test(aid)) for (const d of [0, 6]) line(x, [[6, 20 + d], [12, 20 + d]], 1.5, '#ffffff'); break;
            default:
                if (/clover/.test(aid)) for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; oval(x, 22 + Math.cos(an) * 6, 20 + Math.sin(an) * 6, 6, 6, '#40a040', 1.2); }
                else if (/badge/.test(aid)) star(x, 22, 22, 13, '#f0c030', 1.5);
                else if (/gold/.test(aid)) { poly(x, [[12, 16], [32, 16], [36, 38], [8, 38]], '#8a6a3a', 1.5); oval(x, 22, 14, 8, 4, '#f0c030', 1.2); }
                else if (/orb|charm|firmament/.test(aid)) { glow(x, 22, 22, 16, col, 0.9); oval(x, 22, 22, 10, 10, col, 1.5); }
                else if (/spyglass/.test(aid)) { x.save(); x.translate(22, 22); x.rotate(-0.7); rrect(x, -16, -4, 32, 8, 3, '#c8a040', 1.5); x.restore(); }
                else { rrect(x, 10, 8, 24, 30, 2, '#6a2a2a', 1.5); rect(x, 13, 10, 3, 26, '#f0e0c0'); }
        }
        return c;
    }
    function spellCanvas(sid, S = 48) {
        const sp = SPELLS[sid], [c, x] = canvas(S, S);
        x.scale(S / 48, S / 48);
        const bg = ['', '#3a5a9a', '#3a8a5a', '#9a6a2a', '#8a2a3a', '#6a2a8a'][sp.lvl];
        rrect(x, 2, 2, 44, 44, 6, bg, 2, '#d8b860');
        glow(x, 24, 24, 20, '#ffffff', 0.25);
        const W = '#ffffff', Y = '#ffe060';
        switch (sid) {
            case 'magicarrow': poly(x, [[10, 38], [32, 16], [28, 14], [38, 10], [34, 20], [32, 16]], Y, 1.5); line(x, [[10, 38], [32, 16]], 2.5, Y); break;
            case 'haste': case 'masshaste': for (const d of sid === 'masshaste' ? [-6, 6] : [0]) { poly(x, [[14 + d, 34], [24 + d, 12], [34 + d, 18], [24 + d, 22]], W, 1.2); } break;
            case 'slow': case 'massslow': poly(x, [[14, 10], [34, 10], [24, 24], [34, 38], [14, 38], [24, 24]], '#c0d0f0', 1.5); break;
            case 'bless': star(x, 24, 24, 14, Y, 1.2, 8, 0.5); break;
            case 'curse': oval(x, 24, 22, 11, 12, '#e0e0d0', 1.5); oval(x, 20, 22, 3, 4, '#201818', 0); oval(x, 28, 22, 3, 4, '#201818', 0); break;
            case 'bloodlust': poly(x, [[16, 36], [30, 10], [34, 12], [20, 38]], '#ff4040', 1.5); break;
            case 'stoneskin': poly(x, [[10, 34], [14, 16], [24, 10], [36, 16], [38, 34]], '#a0988a', 1.5); break;
            case 'shield': poly(x, [[12, 10], [36, 10], [36, 24], [24, 38], [12, 24]], '#80a0e0', 1.5); break;
            case 'cure': rect(x, 20, 10, 8, 28, '#40e060', 1); rect(x, 10, 20, 28, 8, '#40e060', 1); break;
            case 'dispel': for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(24, 24, 6 + i * 5, i, i + 4); x.lineWidth = 2; x.strokeStyle = W; x.stroke(); } break;
            case 'lightning': case 'chain': poly(x, [[26, 6], [14, 26], [22, 26], [16, 42], [34, 20], [25, 20]], Y, 1.2); if (sid === 'chain') poly(x, [[38, 14], [32, 26], [36, 26], [32, 36], [42, 24], [38, 24]], Y, 1); break;
            case 'icebolt': case 'frostring': for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(x, [[24 + Math.cos(a) * 14, 24 + Math.sin(a) * 14], [24 - Math.cos(a) * 14, 24 - Math.sin(a) * 14]], 2.5, '#c0e8ff'); } if (sid === 'frostring') { x.beginPath(); x.arc(24, 24, 17, 0, 7); x.lineWidth = 2; x.strokeStyle = '#c0e8ff'; x.stroke(); } break;
            case 'weakness': poly(x, [[14, 36], [24, 20], [28, 22], [18, 38]], '#c0c0c0', 1.2); poly(x, [[26, 18], [34, 8], [36, 10], [28, 20]], '#c0c0c0', 1.2); break;
            case 'blind': oval(x, 24, 24, 14, 8, W, 1.5); oval(x, 24, 24, 5, 5, '#202020', 0); line(x, [[10, 36], [38, 12]], 3, '#ff3030'); break;
            case 'fortune': for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; oval(x, 24 + Math.cos(an) * 6, 24 + Math.sin(an) * 6, 6, 6, '#40c040', 1.2); } break;
            case 'fireball': case 'meteor': glow(x, 24, 26, 18, '#ff6010', 0.9); oval(x, 24, 26, 9, 9, '#ffa020', 1.2); if (sid === 'meteor') for (const [a, b] of [[12, 12], [36, 10]]) oval(x, a, b, 4, 4, '#ffa020', 1); break;
            case 'prayer': poly(x, [[18, 38], [22, 12], [26, 12], [30, 38]], '#f0e0c0', 1.5); glow(x, 24, 12, 10, Y, 0.9); break;
            case 'resurrection': x.beginPath(); x.ellipse(24, 15, 6, 7, 0, 0, 7); x.lineWidth = 3; x.strokeStyle = Y; x.stroke(); line(x, [[24, 22], [24, 40]], 3, Y); line(x, [[14, 27], [34, 27]], 3, Y); break;
            case 'armageddon': for (let i = 0; i < 5; i++) poly(x, [[8 + i * 7, 40], [11 + i * 7, 18 + (i % 2) * 8], [14 + i * 7, 40]], i % 2 ? '#ffd040' : '#ff6010', 1); break;
            case 'implosion': for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(24, 24, 4 + i * 4, i * 1.4, i * 1.4 + 4.5); x.lineWidth = 2; x.strokeStyle = '#d090ff'; x.stroke(); } break;
            case 'townportal': rect(x, 14, 14, 20, 24, '#c8c0b0', 1.5); poly(x, [[12, 14], [24, 6], [36, 14]], '#4060c0', 1.5); glow(x, 24, 28, 8, '#80c0ff', 1); break;
            case 'dimensiondoor': rrect(x, 15, 8, 18, 32, 8, '#3a1a5a', 1.5); glow(x, 24, 24, 10, '#c080ff', 1); break;
        }
        return c;
    }
    function skillCanvas(sk, S = 44) {
        const [c, x] = canvas(S, S); x.scale(S / 44, S / 44);
        rrect(x, 1, 1, 42, 42, 6, '#3a2a1c', 1.5, '#a08040');
        const Y = '#f0d070';
        switch (sk) {
            case 'logistics': poly(x, [[10, 32], [18, 14], [28, 20], [34, 10]], null, 0); line(x, [[8, 34], [18, 16], [28, 22], [36, 10]], 3, Y); break;
            case 'pathfinding': for (let i = 0; i < 4; i++) oval(x, 12 + i * 7, 32 - i * 6, 3, 4, Y, 1); break;
            case 'scouting': oval(x, 22, 22, 14, 8, '#ffffff', 1.5); oval(x, 22, 22, 5, 5, '#3060c0', 1); break;
            case 'archery': x.beginPath(); x.arc(14, 22, 16, -1.1, 1.1); x.lineWidth = 3; x.strokeStyle = Y; x.stroke(); line(x, [[10, 22], [38, 22]], 2, '#ffffff'); break;
            case 'offense': poly(x, [[10, 34], [30, 10], [34, 10], [34, 14], [14, 38]], '#e0e4ea', 1.5); break;
            case 'armorer': poly(x, [[10, 10], [34, 10], [32, 34], [22, 38], [12, 34]], '#a0a8b0', 1.5); break;
            case 'leadership': poly(x, [[14, 38], [14, 8], [34, 14], [14, 20]], '#d03030', 1.5); break;
            case 'luck': for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; oval(x, 22 + Math.cos(an) * 6, 22 + Math.sin(an) * 6, 6, 6, '#40a040', 1.2); } break;
            case 'wisdom': rrect(x, 10, 10, 24, 26, 2, '#4060a0', 1.5); rect(x, 13, 12, 3, 22, '#f0e0c0'); break;
            case 'mysticism': glow(x, 22, 22, 16, '#80c0ff', 1); break;
            case 'intelligence': x.beginPath(); x.arc(22, 22, 12, 0, 7); x.fillStyle = '#e0a0c0'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); line(x, [[22, 10], [22, 34]], 1.5, INK); break;
            case 'sorcery': glow(x, 22, 22, 16, '#ff6010', 1); oval(x, 22, 22, 6, 6, '#ffd040', 1); break;
            case 'estates': for (const [a, b] of [[14, 30], [24, 30], [19, 24], [19, 16]]) oval(x, a, b, 6, 3, '#f0c030', 1); break;
            case 'necromancy': oval(x, 22, 20, 11, 12, '#ece4cc', 1.5); oval(x, 18, 20, 3, 4, '#201818', 0); oval(x, 26, 20, 3, 4, '#201818', 0); break;
            case 'resistance': poly(x, [[12, 10], [32, 10], [32, 24], [22, 36], [12, 24]], '#60c0a0', 1.5); line(x, [[14, 32], [30, 12]], 2, '#ffffff'); break;
            case 'learning': rrect(x, 8, 14, 28, 18, 2, '#a06030', 1.5); line(x, [[22, 14], [22, 32]], 1.5, INK); break;
        }
        return c;
    }
    function primCanvas(k, S = 44) {
        const [c, x] = canvas(S, S); x.scale(S / 44, S / 44);
        rrect(x, 1, 1, 42, 42, 6, '#3a2a1c', 1.5, '#a08040');
        if (k === 'att') { poly(x, [[10, 34], [30, 10], [34, 10], [34, 14], [14, 38]], '#e0e4ea', 1.5); line(x, [[8, 30], [16, 38]], 3, '#c8a040'); }
        if (k === 'def') { poly(x, [[10, 8], [34, 8], [34, 24], [22, 38], [10, 24]], '#4060c0', 2); oval(x, 22, 20, 4, 4, '#f0c030', 1); }
        if (k === 'pow') { glow(x, 22, 22, 18, '#ff8030', 1); poly(x, [[24, 6], [14, 24], [22, 24], [18, 38], [32, 18], [24, 18]], '#ffe060', 1.2); }
        if (k === 'know') { rrect(x, 8, 12, 28, 22, 2, '#6a2a2a', 1.5); line(x, [[22, 12], [22, 34]], 1.5, INK); for (let i = 0; i < 3; i++) { line(x, [[11, 17 + i * 5], [19, 17 + i * 5]], 1, '#f0e0c0'); line(x, [[25, 17 + i * 5], [33, 17 + i * 5]], 1, '#f0e0c0'); } }
        return c;
    }
    // ======================= portraits =======================
    function portraitCanvas(idx, cls, W = 58, H = 64) {
        const [c, x] = canvas(W, H);
        const r = rnd(idx * 7919 + 17);
        const fac = CLASSES[cls].faction, F = FACTIONS[fac], might = CLASSES[cls].might;
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, F.sky[0]); g.addColorStop(1, F.sky[1]);
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.save(); x.scale(W / 58, H / 64);
        const skins = ['#f0c8a0', '#e0b088', '#c89068', '#a07050', '#f4d4b8'];
        let skin = skins[Math.floor(r() * skins.length)];
        if (cls === 'demoniac' || (fac === 'inferno' && r() < 0.5)) skin = '#c06050';
        if (fac === 'necropolis') skin = r() < 0.5 ? '#d8d8d0' : '#c0c8c0';
        if (cls === 'battlemage' && r() < 0.6) skin = '#8aa060';
        const hairC = ['#2a1a10', '#6a3a1a', '#c09040', '#e0d0a0', '#a03018', '#808080'][Math.floor(r() * 6)];
        const robe = might ? (F.roof) : shade(F.roof, 0.8);
        // shoulders
        poly(x, [[2, 64], [6, 48], [18, 42], [40, 42], [52, 48], [56, 64]], might ? '#9aa0a8' : robe, 2);
        if (might) { poly(x, [[18, 42], [29, 52], [40, 42]], robe, 1.5); oval(x, 10, 50, 7, 5, '#b8c0c8', 1.5); oval(x, 48, 50, 7, 5, '#b8c0c8', 1.5); }
        else poly(x, [[22, 42], [29, 56], [36, 42]], shade(robe, 1.3), 1.5);
        rect(x, 24, 34, 10, 10, skin, 1.5);
        if (r() < 0.6 && !might) oval(x, 29, 22, 15, 17, hairC, 2);
        oval(x, 29, 24, 11, 13, skin, 2);
        oval(x, 25, 23, 1.6, 1.8, '#202020', 0); oval(x, 33, 23, 1.6, 1.8, '#202020', 0);
        line(x, [[25, 20], [27, 19.5]], 1.2, hairC); line(x, [[31, 19.5], [33, 20]], 1.2, hairC);
        line(x, [[29, 24], [28, 29], [30, 29]], 1, shade(skin, 0.6));
        if (r() < 0.45 || cls === 'barbarian') poly(x, [[19, 28], [39, 28], [36, 40], [29, 44], [22, 40]], hairC, 1.5);
        else line(x, [[26, 32], [32, 32]], 1.2, shade(skin, 0.5));
        if (fac === 'necropolis') { oval(x, 25, 23, 2.5, 3, '#202020', 0); oval(x, 33, 23, 2.5, 3, '#202020', 0); oval(x, 25, 23, 1, 1, '#80ff80', 0); oval(x, 33, 23, 1, 1, '#80ff80', 0); }
        const helm = might ? (fac === 'stronghold' ? 'horns' : fac === 'inferno' ? 'bighorns' : r() < 0.6 ? 'helm' : 'hair') : (fac === 'tower' ? 'wizard' : r() < 0.5 ? 'hood' : 'hair');
        if (helm === 'helm') { x.beginPath(); x.arc(29, 22, 12.5, Math.PI, 0); x.closePath(); x.fillStyle = '#b8c0c8'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); rect(x, 28, 16, 2.5, 12, '#b8c0c8', 1); if (r() < 0.5) { x.beginPath(); x.moveTo(29, 10); x.quadraticCurveTo(22, 0, 12, 10); x.lineWidth = 4; x.strokeStyle = F.roof; x.stroke(); } }
        else if (helm === 'hood') { x.beginPath(); x.moveTo(14, 40); x.quadraticCurveTo(12, 6, 29, 6); x.quadraticCurveTo(46, 6, 44, 40); x.quadraticCurveTo(40, 18, 29, 14); x.quadraticCurveTo(18, 18, 14, 40); x.fillStyle = robe; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); }
        else if (helm === 'wizard') { poly(x, [[12, 16], [46, 16], [30, -6]], robe, 2); star(x, 30, 8, 3, '#f0e060', 0.8); }
        else if (helm === 'horns' || helm === 'bighorns') { for (const s of [-1, 1]) poly(x, [[29 + s * 7, 14], [29 + s * (helm === 'bighorns' ? 20 : 14), 0], [29 + s * 11, 16]], '#e0d8c0', 1.5); poly(x, [[17, 18], [29, 9], [41, 18]], hairC, 1.5); }
        else { poly(x, [[17, 22], [18, 12], [29, 9], [40, 12], [41, 22], [36, 15], [24, 15]], hairC, 1.5); }
        x.restore();
        light(x, W, H, 0.25);
        x.lineWidth = 2; x.strokeStyle = '#d8b860'; x.strokeRect(1, 1, W - 2, H - 2);
        return c;
    }

    return {
        INK, canvas, shade, rgba, poly, oval, rect, rrect, line, limb, star, glow, light, rnd, add,
        terrainPattern,
        init(scene) {
            add(scene, 'flag', flagCanvas());
            for (let i = 0; i < PLAYER_COLORS.length; i++) add(scene, 'hero_' + i, heroMapCanvas(PLAYER_COLORS[i].css));
            for (const r of RES) { add(scene, 'res_' + r, resCanvas(r, 32)); add(scene, 'mine_' + r, mineCanvas(r)); }
            for (const f of FACTION_IDS) add(scene, 'town_' + f, townCanvas(f));
            for (const k in SITES) add(scene, 'site_' + k, siteCanvas(k));
            add(scene, 'dwelling', dwellingCanvas());
            add(scene, 'chest', chestCanvas());
            add(scene, 'campfire', campfireCanvas());
            for (let t = 1; t < TERRAIN.length; t++) for (let v = 0; v < 6; v++) { add(scene, `decor_${t}_${v}`, decorCanvas(t, v, false)); if (v < 4) add(scene, `wall_${t}_${v}`, decorCanvas(t, v, true)); }
            for (const k of ['att', 'def', 'pow', 'know']) add(scene, 'prim_' + k, primCanvas(k));
            // small helpers
            const [pc, px] = canvas(16, 16); oval(px, 8, 8, 4, 4, '#ffffff', 1.5); add(scene, 'dot', pc);
            const [ac, ax] = canvas(4, 4); ax.fillStyle = '#ffffff'; ax.fillRect(0, 0, 4, 4); add(scene, 'px', ac);
            const [sc, sx] = canvas(32, 32); glow(sx, 16, 16, 16, '#ffffff', 1); add(scene, 'spark', sc);
        },
        creature(scene, cid) { const k = 'cr_' + cid; if (!scene.textures.exists(k)) add(scene, k, creatureCanvas(cid)); return k; },
        portrait(scene, h) { const k = 'pt_' + h.portrait; if (!scene.textures.exists(k)) add(scene, k, portraitCanvas(h.portrait, h.cls)); return k; },
        portraitTpl(scene, tplId) { const t = G.heroTpl[tplId]; return this.portrait(scene, { portrait: t.portrait, cls: t.cls }); },
        spell(scene, sid) { const k = 'sp_' + sid; if (!scene.textures.exists(k)) add(scene, k, spellCanvas(sid)); return k; },
        artifact(scene, aid) { const k = 'ar_' + aid; if (!scene.textures.exists(k)) add(scene, k, artCanvas(aid)); return k; },
        skill(scene, sk) { const k = 'sk_' + sk; if (!scene.textures.exists(k)) add(scene, k, skillCanvas(sk)); return k; },
    };
})();
