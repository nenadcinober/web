// Every texture is painted procedurally onto canvases at boot: tiles, people, beasts,
// dragons, buildings and effects. Characters are 3/4-view, beasts face right, dragons face up.
const Art = (() => {
    let ctx;
    const rr = mulberry32(99);
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const circ = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const ell = (x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); ctx.fill(); };
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
    const line = (x1, y1, x2, y2, c, w = 1) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const stroke = (pts, c, w = 1) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
    const grad = (x, y, r, stops) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

    function canvas(scene, key, w, h, draw) {
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const t = scene.textures.createCanvas(key, w, h);
        ctx = t.getContext();
        draw(w, h);
        t.refresh();
    }

    // ---------- tiles ----------
    function speckle(ox, n, cols, size = 1) {
        for (let i = 0; i < n; i++) rect(ox + Math.floor(rr() * 32), Math.floor(rr() * 32), size, size, cols[Math.floor(rr() * cols.length)]);
    }
    const TILE_DRAW = [
        ox => { rect(ox, 0, 32, 32, '#4c6b35'); speckle(ox, 70, ['#5a7d3e', '#3f5c2b', '#68894a']); for (let i = 0; i < 6; i++) { const x = ox + rr() * 30, y = rr() * 28; line(x, y + 4, x + 1, y, '#6f9450'); } },
        ox => { rect(ox, 0, 32, 32, '#486532'); speckle(ox, 60, ['#56783c', '#3c5828']); [['#e8e0a0'], ['#c9a0d8'], ['#ffffff']].forEach(([c]) => { if (rr() < 0.7) rect(ox + rr() * 30, rr() * 30, 2, 2, c); }); },
        ox => { rect(ox, 0, 32, 32, '#8b8150'); speckle(ox, 80, ['#9a8f5a', '#776d42', '#a89c64']); for (let i = 0; i < 8; i++) { const x = ox + rr() * 30, y = rr() * 28; line(x, y + 4, x + 1.5, y, '#b0a46c'); } },
        ox => { rect(ox, 0, 32, 32, '#857a4a'); speckle(ox, 70, ['#958a55', '#6f6640']); rect(ox + rr() * 26, rr() * 26, 4, 3, '#7a7a72'); },
        ox => { rect(ox, 0, 32, 32, '#dde5ee'); speckle(ox, 60, ['#ffffff', '#cbd5e1', '#e9eef5']); },
        ox => { rect(ox, 0, 32, 32, '#d6dfe9'); speckle(ox, 50, ['#ffffff', '#c3cedc']); ell(ox + 10 + rr() * 12, 10 + rr() * 12, 6, 2, 'rgba(160,175,195,0.4)'); },
        ox => { rect(ox, 0, 32, 32, '#7d6448'); speckle(ox, 90, ['#8c7254', '#6a543a', '#957c5c']); for (let i = 0; i < 5; i++) ell(ox + rr() * 30, rr() * 30, 1.5, 1, '#9a948a'); },
        ox => { rect(ox, 0, 32, 32, '#6e6c66'); for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 * 5; x < 32; x += 10) { rect(ox + x + 1, y + 1, 8, 6, rr() < 0.5 ? '#8a8780' : '#7f7c75'); rect(ox + x + 1, y + 1, 8, 1, '#9c9890'); } },
        ox => { rect(ox, 0, 32, 32, '#2e5a78'); speckle(ox, 30, ['#3a6c8e', '#28506b']); for (let i = 0; i < 4; i++) { const x = ox + rr() * 24, y = rr() * 30; line(x, y, x + 6, y, 'rgba(170,210,235,0.5)'); } },
        ox => { rect(ox, 0, 32, 32, '#5b5d61'); poly([[ox, 32], [ox + 10, 8], [ox + 18, 20], [ox + 26, 4], [ox + 32, 14], [ox + 32, 32]], '#6c6e72'); line(ox + 10, 8, ox + 14, 26, '#45474b'); line(ox + 26, 4, ox + 22, 22, '#45474b'); speckle(ox, 30, ['#7a7c80', '#4a4c50']); },
        ox => { rect(ox, 0, 32, 32, '#64686e'); poly([[ox, 32], [ox + 8, 10], [ox + 16, 18], [ox + 24, 6], [ox + 32, 16], [ox + 32, 32]], '#767a80'); poly([[ox + 4, 18], [ox + 8, 10], [ox + 12, 16]], '#eef3f8'); poly([[ox + 20, 12], [ox + 24, 6], [ox + 28, 12]], '#eef3f8'); speckle(ox, 25, ['#e8eef4', '#50545a']); },
        ox => { rect(ox, 0, 32, 32, '#8f8572'); for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 * 8; x < 32; x += 16) { rect(ox + x, y, 15, 7, rr() < 0.5 ? '#a29780' : '#988d77'); rect(ox + x, y, 15, 1, '#b5aa92'); } rect(ox, 28, 32, 4, 'rgba(0,0,0,0.25)'); },
        ox => { rect(ox, 0, 32, 32, '#2e5a78'); for (let x = 0; x < 32; x += 6) { rect(ox + x, 0, 5, 32, '#7a5634'); rect(ox + x, 0, 1, 32, '#5a3d22'); } rect(ox, 0, 32, 2, '#4a321c'); rect(ox, 30, 32, 2, '#4a321c'); },
        ox => { rect(ox, 0, 32, 32, '#3b3733'); for (let y = 0; y < 32; y += 16) for (let x = (y / 16) * 8; x < 40; x += 16) { rect(ox + (x % 32), y + 1, 15, 14, rr() < 0.5 ? '#45403b' : '#403b36'); } speckle(ox, 25, ['#2a2724', '#55504a']); },
        ox => { rect(ox, 0, 32, 32, '#3a3530'); speckle(ox, 50, ['#2b2723', '#4e4740']); if (rr() < 0.6) { line(ox + 8, 12, ox + 18, 16, '#d8d0bc', 2); circ(ox + 20, 16, 2.5, '#d8d0bc'); } else ell(ox + 16, 16, 7, 4, 'rgba(90,80,60,0.6)'); },
        ox => { rect(ox, 0, 32, 32, '#1d1b1a'); for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 * 6; x < 32; x += 12) rect(ox + x + 1, y + 1, 10, 6, '#2a2725'); rect(ox, 26, 32, 6, 'rgba(0,0,0,0.4)'); },
        ox => { rect(ox, 0, 32, 32, '#a89a6e'); speckle(ox, 80, ['#b8aa7c', '#968862', '#c0b48a']); },
    ];

    // ---------- people ----------
    function human(o) {
        ctx.save();
        if (o.scale) ctx.scale(o.scale, o.scale);
        ell(16, 41.5, 10, 3, 'rgba(0,0,0,0.35)');
        if (o.cape) poly([[9, 16], [23, 16], [26, 38], [6, 38]], o.cape);
        rect(11, 29, 4, 10, o.pants); rect(17, 29, 4, 10, o.pants);
        rect(10, 37, 5, 3, o.boots || '#3a2a1c'); rect(17, 37, 5, 3, o.boots || '#3a2a1c');
        if (o.robe) { poly([[9, 18], [23, 18], [26, 40], [6, 40]], o.robe); rect(6, 38, 20, 2, 'rgba(0,0,0,0.25)'); line(16, 20, 16, 40, 'rgba(0,0,0,0.18)'); }
        poly([[8, 19], [10, 16], [22, 16], [24, 19], [24, 31], [8, 31]], o.tunic);
        rect(19, 17, 5, 14, 'rgba(0,0,0,0.15)');
        if (o.trim) { rect(15, 17, 2, 14, o.trim); }
        rect(8, 27, 16, 2.5, o.belt || '#3b2a1a'); rect(15, 27, 2.5, 2.5, '#c8b070');
        if (o.fur) ell(16, 17.5, 9, 3, o.fur);
        if (o.shield) { ell(6, 23, 5.5, 7.5, o.shield); circ(6, 23, 1.8, '#9a9a90'); }
        rect(5, 18, 4, 10, o.sleeve || o.tunic); rect(23, 18, 4, 10, o.sleeve || o.tunic);
        circ(7, 29, 2.2, o.skin); circ(25, 29, 2.2, o.skin);
        if (o.weapon === 'sword') { rect(24.4, 12, 2, 16, '#c9ced3'); rect(24.4, 12, 1, 16, '#e8ecef'); rect(22.5, 27.5, 6, 1.6, '#6b4a2a'); }
        if (o.weapon === 'axe') { rect(24.6, 14, 1.6, 16, '#6b4a2a'); poly([[26, 14], [31, 12], [31, 20], [26, 18]], '#a8aeb4'); }
        if (o.weapon === 'bow') { stroke([[4, 12], [1, 22], [4, 33]], '#7a5232', 2); line(4, 12, 4, 33, '#d8d0c0', 0.6); }
        if (o.weapon === 'club') { poly([[23, 30], [26, 30], [31, 4], [24, 6]], '#6b4a2a'); }
        if (o.weapon === 'staff') { rect(25, 6, 1.6, 34, '#6b4a2a'); circ(25.8, 6, 2.5, '#8ad8ff'); }
        circ(16, 10, 6.5, o.skin);
        if (o.hair) { ell(16, 6.8, 7, 4.2, o.hair); rect(9.4, 6, 2.2, o.longHair ? 11 : 6, o.hair); rect(20.4, 6, 2.2, o.longHair ? 11 : 6, o.hair); }
        rect(13, 10, 1.7, 1.7, o.eye || '#1b1410'); rect(17.4, 10, 1.7, 1.7, o.eye || '#1b1410');
        if (o.beard) poly([[10, 11], [22, 11], [21, 17], [16, o.longBeard ? 24 : 19.5], [11, 17]], o.beard);
        if (o.helm === 'horn' || o.helm === 'iron') {
            ell(16, 7, 7.6, 5.2, '#8d9196'); rect(8.4, 7.5, 15.2, 2, '#6b6f74'); rect(15.3, 7.5, 1.4, 5, '#6b6f74');
            if (o.helm === 'horn') { poly([[9, 6], [2, -1], [3.5, 3], [8, 8.5]], '#e8e0cc'); poly([[23, 6], [30, -1], [28.5, 3], [24, 8.5]], '#e8e0cc'); }
        }
        if (o.helm === 'guard') { ell(16, 7, 7.6, 5.4, '#8d8a7c'); rect(9, 8, 14, 7, '#7a776a'); rect(11, 10, 10, 1.6, '#1a1a1a'); rect(15.2, 8, 1.6, 7, '#5f5c52'); }
        if (o.helm === 'draugr') { ell(16, 6.5, 7.6, 5, '#5a4a36'); poly([[16, -1], [14, 4], [18, 4]], '#5a4a36'); rect(8.4, 7, 15.2, 2, '#3d3226'); }
        if (o.helm === 'crown') { rect(9.5, 4.5, 13, 2.5, '#d8b44a'); poly([[10, 4.5], [11.5, 1], [13, 4.5]], '#d8b44a'); poly([[15, 4.5], [16, 0.5], [17, 4.5]], '#d8b44a'); poly([[19, 4.5], [20.5, 1], [22, 4.5]], '#d8b44a'); }
        if (o.helm === 'hood') { ell(16, 8, 8.2, 7.8, o.hood); ell(16, 11.5, 4.6, 4.4, o.skin); rect(13.3, 11, 1.7, 1.7, '#1b1410'); rect(17.2, 11, 1.7, 1.7, '#1b1410'); }
        if (o.glow) { circ(13.8, 10.8, 1.6, o.glow); circ(18.2, 10.8, 1.6, o.glow); }
        ctx.restore();
    }

    const PEOPLE = {
        player: { skin: '#e2b896', hair: '#6a4426', beard: '#6a4426', tunic: '#6d5236', fur: '#b49a72', pants: '#4a3a2a', sleeve: '#5a432c', helm: 'horn', shield: '#6b4a2a' },
        npc_alvor: { skin: '#d8a888', hair: '#8a5a32', beard: '#8a5a32', tunic: '#5a4230', trim: '#3a2a1a', pants: '#3a3028', sleeve: '#d8a888', belt: '#2a1a10' },
        npc_lucan: { skin: '#d8b090', hair: '#2a2420', tunic: '#7a6a8a', trim: '#4a3a5a', pants: '#4a4038' },
        npc_sven: { skin: '#e0b898', hair: '#c9a060', tunic: '#5a7a4a', pants: '#4a4038', longHair: true },
        npc_gerdur: { skin: '#e0b898', hair: '#c88a4a', tunic: '#8a5a3a', pants: '#4a4038', longHair: true, robe: '#7a4e32' },
        npc_camilla: { skin: '#e2b896', hair: '#3a2418', tunic: '#a05a5a', pants: '#4a4038', longHair: true, robe: '#8a4a4a' },
        npc_jarl: { skin: '#d8a888', hair: '#c9a060', beard: '#c9a060', longBeard: true, tunic: '#8a2a2a', trim: '#d8b44a', fur: '#e0d0b0', pants: '#4a3028', helm: 'crown', cape: '#5a1a1a', robe: '#7a2424' },
        npc_irileth: { skin: '#5a6a7a', hair: '#1a1a24', tunic: '#5a5a62', trim: '#8a8a92', pants: '#3a3a42', eye: '#c02020', weapon: 'sword', sleeve: '#6a6a72' },
        npc_farengar: { skin: '#e0b898', tunic: '#2a3a7a', pants: '#2a2a4a', robe: '#24346e', helm: 'hood', hood: '#1e2a5e', weapon: 'staff' },
        npc_adrianne: { skin: '#e0b898', hair: '#5a3422', tunic: '#6a5040', pants: '#3a3028', longHair: true, sleeve: '#e0b898', weapon: 'sword' },
        npc_arcadia: { skin: '#d8b090', hair: '#7a3a2a', tunic: '#4a6a5a', pants: '#3a3028', robe: '#3e5e4e', longHair: true },
        npc_nazeem: { skin: '#8a5a3a', hair: '#1a1410', beard: '#1a1410', tunic: '#8a6a2a', trim: '#d8b44a', pants: '#5a4a2a', robe: '#a07a2a' },
        npc_heimskr: { skin: '#d8a888', hair: '#888888', beard: '#888888', tunic: '#5a4a3a', pants: '#3a3028', robe: '#4e4032' },
        npc_guard: { skin: '#d8a888', tunic: '#c8a84a', trim: '#7a5a2a', pants: '#4a3a2a', helm: 'guard', shield: '#c8a84a', weapon: 'sword', sleeve: '#6a5a3a' },
        npc_arngeir: { skin: '#d8b098', hair: '#c8c8c8', beard: '#d8d8d8', longBeard: true, tunic: '#7a7a7a', pants: '#5a5a5a', robe: '#6e6e6e', helm: 'hood', hood: '#5e5e5e' },
        arvel: { skin: '#a8b8a0', hair: '#2a2a2a', tunic: '#3a3a3a', pants: '#2a2a2a', sleeve: '#3a3a3a', weapon: 'sword', eye: '#a02020' },
        bandit: { skin: '#d8a888', hair: '#5a3a22', beard: '#5a3a22', tunic: '#5a4a3a', fur: '#8a7a5a', pants: '#3a3028', helm: 'iron', weapon: 'axe', sleeve: '#8a7a5a' },
        archer: { skin: '#d8a888', hair: '#3a2a1a', tunic: '#4a5a3a', fur: '#7a6a4a', pants: '#3a3028', weapon: 'bow', helm: 'iron' },
        chief: { skin: '#d8a888', hair: '#2a1a10', beard: '#2a1a10', tunic: '#3a3a3a', trim: '#8a2a2a', fur: '#3a3028', pants: '#2a2a2a', helm: 'horn', weapon: 'axe', cape: '#5a1a1a', shield: '#4a3a2a' },
        draugr: { skin: '#5a6458', tunic: '#4a4236', fur: '#3a3428', pants: '#3a342a', helm: 'draugr', weapon: 'sword', sleeve: '#5a6458', glow: '#7fe8ff', eye: '#7fe8ff' },
        overlord: { skin: '#4a5448', tunic: '#3a3428', trim: '#7a6a4a', fur: '#2a2620', pants: '#2a2620', helm: 'draugr', weapon: 'axe', cape: '#2a3428', glow: '#9ff4ff', shield: '#3d3226' },
        giant: { skin: '#c8a888', hair: '#7a6a5a', beard: '#7a6a5a', longBeard: true, tunic: '#7a6a4a', fur: '#9a8a6a', pants: '#5a4a3a', weapon: 'club', sleeve: '#c8a888' },
    };

    // ---------- beasts (side view, facing right) ----------
    function wolf(c, c2, big) {
        const s = big ? 1.25 : 1;
        ctx.save(); ctx.scale(s, s);
        ell(22, 27, 15, 3, 'rgba(0,0,0,0.3)');
        [[12, 18], [16, 19], [27, 18], [31, 19]].forEach(([x, y]) => rect(x, y, 3, 9, c2));
        poly([[8, 14], [-2, 9], [0, 13], [8, 18]], c);
        ell(20, 15, 13, 6.5, c); ell(20, 17.5, 10, 3.5, c2);
        ell(34, 11, 6, 5, c); poly([[37, 9], [45, 12], [44, 14], [37, 15]], c); circ(44.6, 12.6, 1.1, '#111');
        poly([[30, 7], [31, 1], [34, 6]], c); poly([[34, 7], [36, 1], [38, 7]], c2);
        rect(35, 9.5, 1.8, 1.6, big ? '#e8c040' : '#e0d060');
        if (big) { line(38, 14, 39, 20, '#f4f0e0', 1.5); line(41, 14, 41.5, 19, '#f4f0e0', 1.5); for (let i = 0; i < 4; i++) line(14 + i * 5, 10, 13 + i * 5, 16, '#6a4a2a', 1.5); }
        ctx.restore();
    }
    function dragonArt(w, h, o) {
        const cx = w / 2;
        // wings
        const wing = side => {
            const s = side;
            poly([[cx + s * 14, h * 0.36], [cx + s * w * 0.48, h * 0.18], [cx + s * w * 0.46, h * 0.3], [cx + s * w * 0.4, h * 0.5], [cx + s * w * 0.3, h * 0.46], [cx + s * w * 0.22, h * 0.58], [cx + s * 14, h * 0.56]], o.wing);
            [[0.48, 0.18], [0.4, 0.5], [0.22, 0.58]].forEach(([fx, fy]) => line(cx + s * 14, h * 0.38, cx + s * w * fx, h * fy, o.bone, 2));
        };
        wing(-1); wing(1);
        // tail
        poly([[cx - 9, h * 0.6], [cx + 9, h * 0.6], [cx + 3, h * 0.92], [cx, h], [cx - 3, h * 0.92]], o.body);
        poly([[cx, h * 0.97], [cx - 6, h * 0.9], [cx + 6, h * 0.9]], o.bone);
        // body, neck, head
        ell(cx, h * 0.47, 14, h * 0.17, o.body);
        ell(cx, h * 0.5, 7, h * 0.12, o.belly);
        for (let i = 0; i < 6; i++) poly([[cx, h * (0.3 + i * 0.06)], [cx - 3, h * (0.33 + i * 0.06)], [cx + 3, h * (0.33 + i * 0.06)]], o.bone);
        poly([[cx - 6, h * 0.32], [cx + 6, h * 0.32], [cx + 4, h * 0.14], [cx - 4, h * 0.14]], o.body);
        ell(cx, h * 0.11, 8, 10, o.body);
        poly([[cx - 5, h * 0.06], [cx + 5, h * 0.06], [cx, h * 0.0]], o.body);
        poly([[cx - 6, h * 0.12], [cx - 14, h * 0.18], [cx - 7, h * 0.15]], o.bone);
        poly([[cx + 6, h * 0.12], [cx + 14, h * 0.18], [cx + 7, h * 0.15]], o.bone);
        circ(cx - 4, h * 0.09, 1.8, o.eye); circ(cx + 4, h * 0.09, 1.8, o.eye);
        // legs
        [[-1, 0.42], [1, 0.42], [-1, 0.56], [1, 0.56]].forEach(([s, fy]) => { ell(cx + s * 15, h * fy, 5, 4, o.body); });
    }

    // ---------- buildings ----------
    function nordHouse(w, h, o) {
        const wallTop = h * 0.58;
        rect(6, wallTop, w - 12, h - wallTop - 4, o.wall || '#6b4a2e');
        for (let y = wallTop + 6; y < h - 12; y += 7) line(6, y, w - 6, y, 'rgba(0,0,0,0.3)', 1.5);
        rect(4, h - 14, w - 8, 12, o.base || '#77736c');
        for (let x = 6; x < w - 8; x += 12) rect(x, h - 13, 10, 5, 'rgba(255,255,255,0.08)');
        const dw = Math.min(26, w * 0.17);
        rect(w / 2 - dw / 2, h - 34, dw, 30, '#3a2614'); rect(w / 2 - 1, h - 34, 2, 30, '#2a1a0c'); circ(w / 2 + dw / 2 - 5, h - 18, 1.5, '#c8a050');
        if (o.windows !== false) [[0.22], [0.78]].forEach(([fx]) => { rect(w * fx - 7, wallTop + 10, 14, 10, '#f0b85a'); rect(w * fx - 1, wallTop + 10, 2, 10, '#4a321c'); });
        const rl = o.roof || '#7a5a3a';
        poly([[0, wallTop + 4], [w, wallTop + 4], [w - 14, 8], [14, 8]], rl);
        for (let y = 14; y < wallTop; y += 6) line(4 + (wallTop - y) * 0.1, y, w - 4 - (wallTop - y) * 0.1, y, 'rgba(0,0,0,0.22)', 1.5);
        rect(12, 6, w - 24, 5, '#4a321c');
        if (o.snow) { poly([[14, 8], [w - 14, 8], [w - 18, 20], [18, 22]], 'rgba(240,245,250,0.9)'); }
        // crossed gable beams with carved dragon heads
        line(w / 2 - 14, 22, w / 2 + 6, -2 + 8, '#4a321c', 4); line(w / 2 + 14, 22, w / 2 - 6, 6, '#4a321c', 4);
        rect(0, wallTop + 2, w, 4, '#4a321c');
        if (o.sign) { rect(w * 0.62, h - 42, 22, 14, '#7a5a3a'); rect(w * 0.62 + 3, h - 39, 16, 8, o.sign); }
    }

    function build(scene) {
        // tileset
        canvas(scene, 'tiles', TS * TILE_COUNT, TS, () => TILE_DRAW.forEach((f, i) => f(i * TS)));

        for (const k in PEOPLE) canvas(scene, k, 32, 44, () => human(PEOPLE[k]));
        canvas(scene, 'giant', 64, 88, () => human(Object.assign({ scale: 2 }, PEOPLE.giant)));

        canvas(scene, 'wolf', 46, 30, () => wolf('#7a7a78', '#5a5a58'));
        canvas(scene, 'sabre', 58, 38, () => wolf('#b89a62', '#8a6e42', true));
        canvas(scene, 'skeever', 30, 18, () => {
            ell(15, 16, 10, 2, 'rgba(0,0,0,0.3)'); stroke([[6, 12], [0, 9], [-2, 14]], '#d89a9a', 1.5);
            ell(14, 11, 8, 4.5, '#6a4e3a'); ell(23, 10, 5, 3.5, '#6a4e3a'); poly([[26, 8], [30, 10], [26, 12]], '#8a6e5a');
            circ(26, 8.5, 1, '#e02020'); ell(20, 6, 1.6, 2, '#c88a8a'); rect(10, 14, 2, 3, '#4a3a2a'); rect(17, 14, 2, 3, '#4a3a2a');
        });
        canvas(scene, 'spider', 56, 46, () => {
            ell(28, 42, 20, 4, 'rgba(0,0,0,0.3)');
            for (let i = 0; i < 4; i++) { const y = 16 + i * 5; stroke([[24, y], [10 - i * 2, y - 8], [3 - i, y + 14]], '#3a4248', 2.5); stroke([[32, y], [46 + i * 2, y - 8], [53 + i, y + 14]], '#3a4248', 2.5); }
            ell(28, 28, 12, 13, '#cfd8dc'); ell(28, 30, 7, 8, '#9fb0b8'); line(28, 20, 28, 38, '#5a6a72', 2);
            ell(28, 13, 7, 6, '#4a545a'); [[25, 10], [31, 10], [26, 13], [30, 13]].forEach(([x, y]) => circ(x, y, 1.3, '#ff3030'));
            poly([[25, 17], [24, 21], [27, 18]], '#e8e8e8'); poly([[31, 17], [32, 21], [29, 18]], '#e8e8e8');
        });
        canvas(scene, 'troll', 48, 54, () => {
            ell(24, 50, 16, 4, 'rgba(0,0,0,0.3)');
            rect(14, 34, 7, 14, '#c8ccd0'); rect(27, 34, 7, 14, '#c8ccd0');
            ell(24, 28, 15, 13, '#e8ecf0'); ell(24, 31, 9, 8, '#b8bec4');
            rect(5, 22, 7, 22, '#dfe3e7'); rect(36, 22, 7, 22, '#dfe3e7'); poly([[4, 44], [12, 44], [13, 48], [3, 48]], '#4a4a4a'); poly([[36, 44], [44, 44], [45, 48], [35, 48]], '#4a4a4a');
            ell(24, 13, 9, 8, '#e8ecf0'); ell(24, 16, 6, 4, '#9a8e88');
            [[20, 11], [24, 9], [28, 11]].forEach(([x, y]) => circ(x, y, 1.5, '#ffb020'));
            poly([[21, 18], [22, 21], [23, 18]], '#fff'); poly([[25, 18], [26, 21], [27, 18]], '#fff');
        });
        canvas(scene, 'dragon', 200, 170, (w, h) => dragonArt(w, h, { body: '#6e7a4e', wing: 'rgba(120,110,70,0.92)', belly: '#a8a070', bone: '#d8cca0', eye: '#ffcc30' }));
        canvas(scene, 'alduin', 240, 200, (w, h) => dragonArt(w, h, { body: '#1e1a1d', wing: 'rgba(40,30,36,0.95)', belly: '#3a2a2a', bone: '#7a6a5a', eye: '#ff2a10' }));
        canvas(scene, 'paarthurnax', 200, 170, (w, h) => dragonArt(w, h, { body: '#8a8580', wing: 'rgba(130,120,112,0.75)', belly: '#b0aaa0', bone: '#e8e0d0', eye: '#ffe080' }));
        canvas(scene, 'dragon_bones', 200, 170, (w, h) => {
            const cx = w / 2;
            line(cx, h * 0.05, cx, h * 0.98, '#e8e0cc', 4);
            for (let i = 0; i < 9; i++) { const y = h * (0.32 + i * 0.03); line(cx - 22 + i, y, cx + 22 - i, y, '#e0d8c0', 2.5); }
            [[-1], [1]].forEach(([s]) => { line(cx + s * 10, h * 0.38, cx + s * w * 0.45, h * 0.2, '#d8d0b8', 3); line(cx + s * 10, h * 0.4, cx + s * w * 0.38, h * 0.5, '#d8d0b8', 2.5); });
            ell(cx, h * 0.1, 9, 11, '#e8e0cc'); circ(cx - 4, h * 0.09, 2.5, '#2a2420'); circ(cx + 4, h * 0.09, 2.5, '#2a2420');
        });

        // weapons and effects
        canvas(scene, 'sword', 10, 40, () => { poly([[3, 4], [5, 0], [7, 4], [7, 30], [3, 30]], '#f0f2f4'); rect(5, 4, 2, 26, '#c8ccd0'); rect(0, 30, 10, 3, '#8a6a3a'); rect(3.5, 33, 3, 5, '#5a3a1a'); circ(5, 39, 1.8, '#8a6a3a'); });
        canvas(scene, 'bow', 16, 44, () => { stroke([[4, 2], [12, 12], [13, 22], [12, 32], [4, 42]], '#7a5232', 3); line(4, 2, 4, 42, '#e8e0d0', 1); });
        canvas(scene, 'arrow', 28, 6, () => { rect(4, 2.3, 20, 1.4, '#8a6a3a'); poly([[24, 0], [28, 3], [24, 6]], '#b8bcc0'); poly([[0, 0], [6, 3], [0, 6]], '#e0e0e0'); });
        canvas(scene, 'firebolt', 30, 16, () => { ell(18, 8, 12, 7, grad(18, 8, 12, [[0, 'rgba(255,240,180,1)'], [0.5, 'rgba(255,140,40,0.9)'], [1, 'rgba(255,60,0,0)']])); });
        canvas(scene, 'fireball', 26, 26, () => circ(13, 13, 13, grad(13, 13, 13, [[0, 'rgba(255,250,200,1)'], [0.45, 'rgba(255,120,30,0.95)'], [1, 'rgba(200,40,0,0)']])));
        canvas(scene, 'icespike', 30, 10, () => { poly([[0, 5], [8, 1], [30, 5], [8, 9]], '#d8f6ff'); poly([[8, 3], [30, 5], [8, 7]], '#8fd8f0'); });
        canvas(scene, 'spit', 16, 16, () => circ(8, 8, 8, grad(8, 8, 8, [[0, 'rgba(240,255,255,1)'], [0.6, 'rgba(140,220,255,0.8)'], [1, 'rgba(100,180,255,0)']])));
        canvas(scene, 'flame', 20, 20, () => circ(10, 10, 10, grad(10, 10, 10, [[0, 'rgba(255,255,220,1)'], [0.35, 'rgba(255,170,60,0.9)'], [1, 'rgba(255,60,0,0)']])));
        canvas(scene, 'glow', 20, 20, () => circ(10, 10, 10, grad(10, 10, 10, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']])));
        canvas(scene, 'spark', 6, 6, () => circ(3, 3, 3, '#ffffff'));
        canvas(scene, 'flake', 5, 5, () => circ(2.5, 2.5, 2.2, 'rgba(255,255,255,0.9)'));
        canvas(scene, 'light', 512, 512, () => circ(256, 256, 256, grad(256, 256, 256, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']])));
        canvas(scene, 'light_s', 256, 256, () => circ(128, 128, 128, grad(128, 128, 128, [[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']])));

        // trees and stones (origin at the bottom centre)
        const pine = snow => (w, h) => {
            ell(w / 2, h - 3, 14, 4, 'rgba(0,0,0,0.3)');
            rect(w / 2 - 3, h - 18, 6, 16, '#4a321c');
            for (let i = 0; i < 4; i++) {
                const y = h - 16 - i * 15, half = 22 - i * 4.5;
                poly([[w / 2 - half, y], [w / 2 + half, y], [w / 2, y - 26]], i % 2 ? '#24452e' : '#2a4f34');
                poly([[w / 2, y - 26], [w / 2 + half, y], [w / 2 + half * 0.2, y]], 'rgba(0,0,0,0.18)');
                if (snow) poly([[w / 2 - half * 0.7, y - 6], [w / 2 + half * 0.4, y - 7], [w / 2, y - 26]], 'rgba(245,248,252,0.9)');
            }
        };
        canvas(scene, 'pine', 48, 86, pine(false));
        canvas(scene, 'pine_snow', 48, 86, pine(true));
        canvas(scene, 'aspen', 52, 78, (w, h) => {
            ell(w / 2, h - 3, 14, 4, 'rgba(0,0,0,0.3)');
            rect(w / 2 - 2.5, h - 40, 5, 38, '#e8e4dc'); for (let y = h - 36; y < h - 4; y += 6) rect(w / 2 - 2.5, y, 3, 1.5, '#3a3a3a');
            [[26, 20, 15], [16, 30, 12], [36, 30, 12], [26, 36, 13], [20, 14, 9], [33, 15, 9]].forEach(([x, y, r], i) => circ(x, y, r, ['#d89a2a', '#e8b03a', '#c8862a'][i % 3]));
            for (let i = 0; i < 20; i++) circ(10 + rr() * 32, 6 + rr() * 38, 1.6, rr() < 0.5 ? '#f4cc5a' : '#b8701e');
        });
        canvas(scene, 'gildergreen', 150, 160, (w, h) => {
            ell(w / 2, h - 5, 40, 8, 'rgba(0,0,0,0.3)');
            poly([[w / 2 - 10, h - 4], [w / 2 + 10, h - 4], [w / 2 + 6, h - 60], [w / 2 - 6, h - 60]], '#5a4030');
            line(w / 2, h - 60, w / 2 - 30, h - 90, '#5a4030', 6); line(w / 2, h - 60, w / 2 + 30, h - 95, '#5a4030', 6);
            for (let i = 0; i < 40; i++) circ(20 + rr() * 110, 10 + rr() * 90, 10 + rr() * 8, ['#e8a0b8', '#f0b8c8', '#d888a8', '#f8d0dc'][i % 4]);
        });
        canvas(scene, 'bush', 30, 22, (w, h) => { ell(15, 19, 12, 3, 'rgba(0,0,0,0.25)'); circ(10, 13, 7, '#3e5e30'); circ(19, 12, 8, '#4a6e38'); circ(15, 8, 6, '#557a40'); circ(20, 9, 1.5, '#c03030'); circ(9, 11, 1.5, '#c03030'); });
        canvas(scene, 'stone', 22, 16, () => { ell(11, 13, 10, 3, 'rgba(0,0,0,0.25)'); ell(11, 9, 9, 6, '#7a7a76'); ell(9, 7, 5, 3, '#94948e'); });
        canvas(scene, 'rock_s', 30, 24, () => { ell(15, 21, 13, 3, 'rgba(0,0,0,0.25)'); ell(15, 14, 13, 9, '#6a6e74'); ell(13, 9, 9, 4, '#eef3f8'); });
        canvas(scene, 'stone_big', 56, 46, () => { ell(28, 42, 25, 5, 'rgba(0,0,0,0.3)'); poly([[4, 40], [8, 16], [22, 4], [40, 6], [52, 22], [52, 40]], '#6e6e6a'); poly([[22, 4], [40, 6], [44, 18], [26, 20]], '#8a8a84'); line(26, 20, 22, 40, '#55554f', 2); });

        // buildings (origin bottom centre)
        canvas(scene, 'house', 160, 120, (w, h) => nordHouse(w, h, {}));
        canvas(scene, 'inn', 224, 150, (w, h) => nordHouse(w, h, { sign: '#d8b44a' }));
        canvas(scene, 'shop', 144, 120, (w, h) => nordHouse(w, h, { sign: '#7aa0c8', roof: '#6a4e34' }));
        canvas(scene, 'forge', 128, 96, (w, h) => {
            ell(w / 2, h - 4, 60, 6, 'rgba(0,0,0,0.3)');
            poly([[0, 40], [w, 40], [w - 10, 6], [10, 6]], '#6a4e34'); for (let y = 12; y < 40; y += 6) line(6, y, w - 6, y, 'rgba(0,0,0,0.22)', 1.5);
            rect(10, 40, 6, h - 46, '#4a321c'); rect(w - 16, 40, 6, h - 46, '#4a321c');
            rect(22, 44, 34, 44, '#6e6a64'); rect(28, 62, 22, 16, '#2a1a10'); rect(30, 66, 18, 10, '#ff8a2a'); rect(33, 69, 12, 5, '#ffe080');
            rect(72, 70, 26, 8, '#3a3a3e'); rect(78, 78, 14, 10, '#2a2a2e'); poly([[98, 70], [104, 72], [98, 74]], '#3a3a3e');
            circ(110, 78, 8, '#8a8a84'); rect(108, 76, 4, 4, '#5a3a1a');
        });
        canvas(scene, 'dragonsreach', 320, 250, (w, h) => {
            rect(0, h - 40, w, 40, '#8a857a'); for (let y = h - 36; y < h; y += 8) line(0, y, w, y, 'rgba(0,0,0,0.2)');
            for (let i = 0; i < 6; i++) rect(w / 2 - 50 + i * 2, h - 40 + i * 6, 100 - i * 4, 6, i % 2 ? '#9a958a' : '#a8a296');
            poly([[20, h - 40], [w - 20, h - 40], [w - 30, 110], [30, 110]], '#6b4a2e'); for (let y = 118; y < h - 44; y += 9) line(24, y, w - 24, y, 'rgba(0,0,0,0.25)', 2);
            poly([[0, 120], [w, 120], [w - 40, 8], [40, 8]], '#5a4028'); for (let y = 16; y < 120; y += 8) line(10, y, w - 10, y, 'rgba(0,0,0,0.22)', 2);
            rect(36, 4, w - 72, 8, '#3a2814');
            line(w / 2 - 30, 40, w / 2 + 10, 0, '#3a2814', 7); line(w / 2 + 30, 40, w / 2 - 10, 0, '#3a2814', 7);
            [[60], [w - 60]].forEach(([x]) => { rect(x - 22, 124, 44, 80, '#8a857a'); poly([[x - 26, 126], [x + 26, 126], [x, 76]], '#4a3420'); });
            rect(w / 2 - 22, h - 96, 44, 56, '#3a2614'); rect(w / 2 - 1, h - 96, 2, 56, '#24160a');
            [[100], [w - 100]].forEach(([x]) => rect(x - 9, 150, 18, 26, '#f0b85a'));
            rect(w / 2 - 30, 130, 60, 16, '#8a2a2a'); circ(w / 2, 138, 6, '#d8b44a');
        });
        canvas(scene, 'hrothgar', 320, 220, (w, h) => {
            rect(10, 70, w - 20, h - 74, '#8a8a88'); for (let y = 78; y < h; y += 10) for (let x = 14 + (y / 10 % 2) * 10; x < w - 14; x += 20) rect(x, y, 18, 8, 'rgba(255,255,255,0.06)');
            poly([[0, 76], [w, 76], [w - 20, 30], [20, 30]], '#5a5a5e'); poly([[20, 30], [w - 20, 30], [w - 26, 44], [26, 46]], '#eef2f6');
            rect(w / 2 - 50, 0, 100, 76, '#7e7e7c'); poly([[w / 2 - 56, 10], [w / 2 + 56, 10], [w / 2, -20]], '#4e4e52'); poly([[w / 2 - 56, 10], [w / 2 + 56, 10], [w / 2 + 40, 4], [w / 2 - 40, 4]], '#eef2f6');
            for (let x = 40; x < w - 40; x += 34) rect(x, 100, 8, 26, '#2a2a30');
            rect(w / 2 - 22, h - 70, 44, 66, '#3a3026'); poly([[w / 2 - 22, h - 70], [w / 2 + 22, h - 70], [w / 2, h - 86]], '#3a3026');
            for (let i = 0; i < 5; i++) rect(w / 2 - 40 + i * 4, h - 6 + 0, 80 - i * 8, 6, '#9a9a98');
        });
        canvas(scene, 'watchtower', 120, 180, (w, h) => {
            ell(w / 2, h - 6, 52, 8, 'rgba(0,0,0,0.3)');
            rect(14, 30, w - 28, h - 36, '#8a867c'); rect(14, 30, 22, h - 36, 'rgba(255,255,255,0.08)'); rect(w - 36, 30, 22, h - 36, 'rgba(0,0,0,0.15)');
            for (let y = 36; y < h - 6; y += 12) line(14, y, w - 14, y, 'rgba(0,0,0,0.18)');
            for (let x = 12; x < w - 14; x += 16) if (x !== 44) rect(x, 18 + (x % 3) * 4, 12, 14, '#8a867c');
            poly([[52, 30], [70, 30], [64, 50]], '#3a3632');
            rect(w / 2 - 12, h - 44, 24, 38, '#2a2420'); rect(36, 70, 8, 16, '#1a1814'); rect(76, 100, 8, 16, '#1a1814');
        });
        canvas(scene, 'barrow', 224, 160, (w, h) => {
            for (let i = 0; i < 6; i++) rect(w / 2 - 70 + i * 6, h - 8 - i * 6, 140 - i * 12, 8, i % 2 ? '#7a7a76' : '#8a8a84');
            [[30], [w - 30]].forEach(([x]) => { rect(x - 16, 30, 32, h - 40, '#6e6e6a'); poly([[x - 20, 34], [x + 20, 34], [x, 4]], '#5e5e5a'); poly([[x - 20, 34], [x, 4], [x - 4, 34]], '#eef2f6'); });
            rect(60, 40, w - 120, 84, '#6e6e6a'); poly([[54, 44], [w - 54, 44], [w / 2, 4]], '#5e5e5a'); poly([[54, 44], [w / 2, 4], [w / 2 - 30, 44]], '#e4eaf0');
            ell(w / 2, 92, 28, 34, '#121012'); rect(w / 2 - 28, 92, 56, 32, '#121012');
            stroke([[w / 2 - 34, 92], [w / 2 - 34, 70], [w / 2, 54], [w / 2 + 34, 70], [w / 2 + 34, 92]], '#4e4e4a', 4);
            for (let i = 0; i < 12; i++) line(70 + i * 8, 52, 72 + i * 8, 60, '#4a6a7a', 1.5);
        });
        canvas(scene, 'tent', 66, 50, (w, h) => { ell(w / 2, h - 4, 30, 5, 'rgba(0,0,0,0.3)'); poly([[2, h - 6], [w / 2, 4], [w - 2, h - 6]], '#8a6e4a'); poly([[w / 2, 4], [w - 2, h - 6], [w / 2 + 6, h - 6]], '#6e5638'); poly([[w / 2 - 8, h - 6], [w / 2, 22], [w / 2 + 8, h - 6]], '#2a1e14'); line(w / 2, 4, w / 2 - 6, -2, '#5a3a1a', 2); });
        canvas(scene, 'tent_big', 130, 90, (w, h) => { ell(w / 2, h - 4, 60, 8, 'rgba(0,0,0,0.3)'); poly([[2, h - 6], [w / 2, 6], [w - 2, h - 6]], '#9a8462'); poly([[w / 2, 6], [w - 2, h - 6], [w / 2 + 10, h - 6]], '#7a6648'); for (let i = 0; i < 6; i++) line(w / 2, 6, 10 + i * 22, h - 6, 'rgba(60,40,20,0.4)', 2); line(w / 2 - 6, 0, w / 2 + 6, 14, '#e8e0cc', 4); });
        canvas(scene, 'campfire', 34, 26, () => {
            for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ell(17 + Math.cos(a) * 12, 18 + Math.sin(a) * 6, 4, 3, '#6e6e6a'); }
            line(9, 20, 25, 14, '#5a3a1a', 3); line(9, 14, 25, 20, '#4a2a10', 3);
            poly([[11, 18], [17, 0], [23, 18]], '#ff8a2a'); poly([[14, 18], [17, 6], [20, 18]], '#ffe080');
        });
        canvas(scene, 'chest', 32, 26, () => { ell(16, 23, 14, 3, 'rgba(0,0,0,0.3)'); rect(3, 8, 26, 15, '#7a5232'); rect(3, 4, 26, 6, '#8a6240'); rect(3, 8, 26, 2, '#4a3018'); [[7], [23]].forEach(([x]) => rect(x, 4, 3, 19, '#5a5a5e')); rect(14, 9, 5, 5, '#c8a84a'); });
        canvas(scene, 'chest_open', 32, 26, () => { ell(16, 23, 14, 3, 'rgba(0,0,0,0.3)'); rect(3, 10, 26, 13, '#7a5232'); rect(3, 0, 26, 7, '#5a3a20'); rect(5, 8, 22, 4, '#2a1a0c'); [[7], [23]].forEach(([x]) => rect(x, 10, 3, 13, '#5a5a5e')); });
        canvas(scene, 'wordwall', 120, 84, (w, h) => {
            ell(w / 2, h - 6, 56, 7, 'rgba(0,0,0,0.3)');
            poly([[4, h - 8], [10, 14], [w / 2, 2], [w - 10, 14], [w - 4, h - 8]], '#4e4c4a'); poly([[10, 14], [w / 2, 2], [w - 10, 14], [w - 14, 22], [w / 2, 12], [14, 22]], '#5e5c5a');
            for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { const x = 18 + i * 10, y = 26 + r * 12; line(x, y, x + 4, y + 6, '#5a7a8a', 1.5); line(x + 4, y, x, y + 6, '#5a7a8a', 1.5); }
        });
        canvas(scene, 'shrine', 44, 60, () => { ell(22, 56, 18, 4, 'rgba(0,0,0,0.3)'); rect(8, 40, 28, 16, '#7a7a76'); rect(6, 38, 32, 4, '#8a8a84'); rect(17, 12, 10, 28, '#9a9a94'); circ(22, 8, 6, '#9a9a94'); line(14, 18, 6, 30, '#9a9a94', 3); line(30, 18, 34, 6, '#c8c8c0', 2); circ(22, 48, 3, '#d8b44a'); });
        canvas(scene, 'sign', 26, 40, () => { rect(11, 10, 4, 28, '#5a3a1a'); rect(1, 8, 24, 10, '#8a6240'); line(4, 13, 22, 13, '#4a3018'); ell(13, 38, 7, 2, 'rgba(0,0,0,0.3)'); });
        canvas(scene, 'torch_post', 14, 44, () => { rect(5, 12, 4, 30, '#4a321c'); poly([[2, 12], [12, 12], [10, 6], [4, 6]], '#5a5a5e'); poly([[3, 6], [7, -4], [11, 6]], '#ff9a3a'); circ(7, 4, 2, '#ffe080'); });
        canvas(scene, 'torch', 16, 30, () => { rect(6, 12, 4, 16, '#4a321c'); rect(4, 12, 8, 3, '#5a5a5e'); poly([[3, 13], [8, -2], [13, 13]], '#ff9a3a'); circ(8, 8, 3, '#ffe080'); });
        canvas(scene, 'exitdoor', 52, 66, () => { rect(2, 4, 48, 60, '#4e4a46'); ell(26, 24, 20, 20, '#2a2622'); rect(6, 24, 40, 40, '#2a2622'); rect(10, 28, 32, 36, '#5a4028'); line(26, 28, 26, 64, '#3a2814', 2); circ(36, 46, 2, '#c8a84a'); });
        canvas(scene, 'web', 70, 54, () => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; line(35, 27, 35 + Math.cos(a) * 34, 27 + Math.sin(a) * 26, 'rgba(240,240,240,0.7)', 1); } for (let r = 6; r < 30; r += 6) { ctx.strokeStyle = 'rgba(240,240,240,0.55)'; ctx.beginPath(); ctx.ellipse(35, 27, r * 1.2, r * 0.9, 0, 0, Math.PI * 2); ctx.stroke(); } });
        canvas(scene, 'urn', 20, 26, () => { ell(10, 23, 8, 2.5, 'rgba(0,0,0,0.3)'); ell(10, 15, 8, 9, '#6e5a46'); rect(5, 2, 10, 5, '#5e4a36'); line(3, 15, 17, 15, '#8a7a5a', 1.5); });
        canvas(scene, 'sarcophagus', 38, 66, () => { ell(19, 62, 18, 4, 'rgba(0,0,0,0.35)'); rect(2, 4, 34, 58, '#5a5652'); rect(5, 7, 28, 52, '#6e6a64'); ell(19, 18, 8, 9, '#7e7a74'); rect(12, 26, 14, 26, '#7e7a74'); line(19, 28, 19, 50, '#5a5652', 2); });
        const SYM = [
            (x, y, s) => stroke([[x - 6 * s, y - 8 * s], [x + 6 * s, y - 4 * s], [x - 6 * s, y + 2 * s], [x + 6 * s, y + 8 * s]], '#cfe8f0', 2.5 * s),
            (x, y, s) => { ell(x - 1 * s, y, 8 * s, 4.5 * s, '#cfe8f0'); poly([[x + 6 * s, y], [x + 11 * s, y - 5 * s], [x + 11 * s, y + 5 * s]], '#cfe8f0'); },
            (x, y, s) => { poly([[x, y + 6 * s], [x - 10 * s, y - 6 * s], [x - 2 * s, y - 2 * s], [x, y - 8 * s], [x + 2 * s, y - 2 * s], [x + 10 * s, y - 6 * s]], '#cfe8f0'); },
        ];
        for (let i = 0; i < 3; i++) {
            canvas(scene, 'pillar' + i, 32, 60, () => { ell(16, 56, 14, 4, 'rgba(0,0,0,0.35)'); rect(4, 4, 24, 52, '#6e6a64'); rect(4, 4, 6, 52, 'rgba(255,255,255,0.1)'); rect(2, 2, 28, 5, '#7e7a74'); rect(7, 18, 18, 18, '#4e4a46'); SYM[i](16, 27, 0.8); });
            canvas(scene, 'hint' + i, 30, 28, () => { rect(1, 1, 28, 26, '#3a3632'); rect(3, 3, 24, 22, '#2a2724'); SYM[i](15, 14, 0.85); });
        }
        canvas(scene, 'gate_h', 96, 40, () => { rect(0, 0, 96, 6, '#4a4a4e'); for (let x = 4; x < 96; x += 9) rect(x, 0, 4, 40, '#5e5e64'); rect(0, 18, 96, 4, '#4a4a4e'); rect(0, 34, 96, 6, '#3a3a3e'); });
        canvas(scene, 'gate_v', 30, 100, () => { rect(0, 0, 30, 100, 'rgba(0,0,0,0.2)'); for (let y = 4; y < 100; y += 9) rect(0, y, 30, 4, '#5e5e64'); rect(12, 0, 5, 100, '#4a4a4e'); });
        canvas(scene, 'clawdoor_v', 34, 100, () => {
            rect(0, 0, 34, 100, '#4e4a46'); [[22], [50], [78]].forEach(([y], i) => { circ(17, y, 12, '#6e6a64'); circ(17, y, 9, '#5a5652'); SYM[(i + 1) % 3](17, y, 0.55); });
            circ(17, 50, 4, '#c8a84a');
        });
        canvas(scene, 'clawdoor_h', 100, 34, () => {
            rect(0, 0, 100, 34, '#4e4a46'); [[22], [50], [78]].forEach(([x], i) => { circ(x, 17, 12, '#6e6a64'); circ(x, 17, 9, '#5a5652'); SYM[(i + 1) % 3](x, 17, 0.55); });
        });
    }

    // a small map image: one pixel per tile, plus darker dots for trees
    const MINI = ['#4c6b35', '#486532', '#8b8150', '#857a4a', '#dde5ee', '#d6dfe9', '#9a7c58', '#a8a49a', '#2e5a78', '#55575b', '#7e848c', '#6b6458', '#8a6240', '#5a544c', '#5a544c', '#151413', '#a89a6e'];
    function minimap(scene, M) {
        const key = 'mini_' + M.id;
        canvas(scene, key, M.w * 4, M.h * 4, () => {
            for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) rect(x * 4, y * 4, 4, 4, MINI[M.data[y][x]]);
            M.trees.forEach(t => { if (!t.deco) rect(t.x / TS * 4 - 1, t.y / TS * 4 - 2, 3, 3, t.t === 'aspen' ? '#a8782a' : t.t === 'pine_snow' ? '#5a7a6a' : '#22402a'); });
            M.objs.forEach(o => { if (['house', 'inn', 'shop', 'forge', 'dragonsreach', 'hrothgar', 'watchtower', 'barrow'].includes(o.t)) rect(o.x / TS * 4 - 6, o.y / TS * 4 - 8, 12, 8, '#3a2a1a'); });
        });
        return key;
    }

    return { build, minimap };
})();
