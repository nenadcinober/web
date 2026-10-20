// The adventure map: terrain, objects, heroes, fog, minimap, side panel and the turn loop.
const TS = 32, CHUNK = 16, VIEW_W = 800, VIEW_H = 736;
const TERRAIN_ORDER = [T.SWAMP, T.DIRT, T.SAND, T.ROUGH, T.LAVA, T.GRASS, T.SNOW];

class AdventureScene extends Phaser.Scene {
    constructor() { super('Adventure'); }

    create() {
        this._mapMode = false;
        this._modalDepth = 0; this._modals = 0; this.ended = false;
        this.uiCam = this.cameras.add(0, 0, VW, VH);
        this.cameras.main.setViewport(0, 0, VIEW_W, VIEW_H).setBackgroundColor('#000000');
        this.events.on('addedtoscene', go => { (this._mapMode ? this.uiCam : this.cameras.main).ignore(go); });
        this.busy = false;
        this.selHero = null; this.selTown = null; this.path = null; this.pathSprites = [];
        this.objSprites = {}; this.heroSprites = {};
        this.buildMap();
        this.buildPanel();
        this.setupInput();
        Adv.showBattle = cfg => this.runBattle(cfg);
        this.io = this.makeIO();
        Adv.humanIO = this.io;
        const hp = Core.human();
        const hs = Core.heroesOf(hp);
        if (hs.length) { this.select(hs[0]); this.centerOn(hs[0].x, hs[0].y); }
        else if (hp.towns.length) { const t = G.objects[hp.towns[0]]; this.selectTown(t); this.centerOn(t.x, t.y); }
        this.refreshAll();
        if (!G.started) {
            G.started = true;
            Core.beginTurn(hp);
            this.refreshAll();
            this.time.delayedCall(300, () => UI.msg(this, `Welcome, ${PLAYER_COLORS[hp.color].name} ruler of ${FACTIONS[hp.faction].name}!\n\nDefeat every rival kingdom to win. Lose all your towns and heroes (or stay without a town for 7 days) and you are defeated.`, { title: 'A New Kingdom', icons: [{ key: 'town_' + hp.faction, scale: 0.6 }] }));
        }
    }

    mapMode(fn) { this._mapMode = true; try { return fn(); } finally { this._mapMode = false; } }

    // ---------------- map rendering ----------------
    buildMap() {
        const W = G.W, H = G.H;
        this.cameras.main.setBounds(0, 0, W * TS, H * TS);
        this.mapMode(() => {
            this.chunks = [];
            const cw = Math.ceil(W / CHUNK), ch = Math.ceil(H / CHUNK);
            for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
                const key = `chunk_${cx}_${cy}`;
                if (this.textures.exists(key)) this.textures.remove(key);
                const tex = this.textures.createCanvas(key, CHUNK * TS, CHUNK * TS);
                this.drawChunk(tex.getContext(), cx, cy);
                tex.refresh();
                this.add.image(cx * CHUNK * TS, cy * CHUNK * TS, key).setOrigin(0).setDepth(-10);
            }
            // decor
            for (const d of G.decor) {
                const t = G.terrain[Core.idx(d.x, d.y)] || T.GRASS;
                const key = d.w ? `wall_${t}_${d.v % 4}` : `decor_${t}_${d.v % 6}`;
                this.add.image(d.x * TS + TS / 2, d.y * TS + TS + (d.w ? 6 : 2), key).setOrigin(0.5, 1).setDepth(d.y * 10 + 2);
            }
            this.pathLayer = this.add.container(0, 0).setDepth(100000);
            // fog chunks
            this.fog = [];
            for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
                const key = `fog_${cx}_${cy}`;
                if (this.textures.exists(key)) this.textures.remove(key);
                const tex = this.textures.createCanvas(key, CHUNK * TS, CHUNK * TS);
                const im = this.add.image(cx * CHUNK * TS, cy * CHUNK * TS, key).setOrigin(0).setDepth(200000);
                this.fog.push({ cx, cy, tex, im });
            }
            this.hoverRect = this.add.rectangle(0, 0, TS, TS).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.35).setDepth(150000);
        });
        this.drawFog();
    }
    drawChunk(ctx, cx, cy) {
        const x0 = cx * CHUNK, y0 = cy * CHUNK, W = G.W, H = G.H;
        const pat = t => ctx.createPattern(Art.terrainPattern(t), 'repeat');
        ctx.fillStyle = pat(T.WATER); ctx.fillRect(0, 0, CHUNK * TS, CHUNK * TS);
        const tiles = (t) => {
            const out = [];
            for (let y = y0 - 1; y <= y0 + CHUNK; y++) for (let x = x0 - 1; x <= x0 + CHUNK; x++) {
                if (x < 0 || y < 0 || x >= W || y >= H) continue;
                if (G.terrain[y * W + x] === t) out.push([(x - x0) * TS, (y - y0) * TS]);
            }
            return out;
        };
        // shore: a sandy lip under every land tile that touches water
        const land = [];
        for (let y = y0 - 1; y <= y0 + CHUNK; y++) for (let x = x0 - 1; x <= x0 + CHUNK; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            if (G.terrain[y * W + x] !== T.WATER) land.push([(x - x0) * TS, (y - y0) * TS]);
        }
        ctx.fillStyle = '#c8b480'; ctx.beginPath();
        for (const [px, py] of land) ctx.roundRect(px - 5, py - 5, TS + 10, TS + 10, 12);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath();
        for (const [px, py] of land) ctx.roundRect(px - 7, py - 7, TS + 14, TS + 14, 14);
        ctx.globalCompositeOperation = 'destination-over'; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        for (const t of TERRAIN_ORDER) {
            const ts = tiles(t);
            if (!ts.length) continue;
            ctx.fillStyle = pat(t); ctx.beginPath();
            for (const [px, py] of ts) ctx.roundRect(px - 3, py - 3, TS + 6, TS + 6, 9);
            ctx.fill();
        }
        // roads
        const isRoad = (x, y) => x >= 0 && y >= 0 && x < W && y < H && G.road[y * W + x];
        const segs = [];
        for (let y = y0 - 1; y <= y0 + CHUNK; y++) for (let x = x0 - 1; x <= x0 + CHUNK; x++) {
            if (!isRoad(x, y)) continue;
            const px = (x - x0) * TS + TS / 2, py = (y - y0) * TS + TS / 2;
            let any = false;
            for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
                if (!isRoad(x + dx, y + dy)) continue;
                if (dx && dy && (isRoad(x + dx, y) || isRoad(x, y + dy))) continue;
                segs.push([px, py, px + dx * TS, py + dy * TS]); any = true;
            }
            if (!any) segs.push([px, py, px, py]);
        }
        for (const [w, c] of [[16, 'rgba(60,40,20,0.5)'], [12, '#9a8466'], [7, '#b8a484']]) {
            ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.beginPath();
            for (const s of segs) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
            ctx.stroke();
        }
        const rr = Art.rnd(cx * 31 + cy * 17);
        ctx.fillStyle = 'rgba(80,60,40,0.5)';
        for (const s of segs) for (let i = 0; i < 4; i++) { const f = rr(); ctx.fillRect(s[0] + (s[2] - s[0]) * f + rr() * 8 - 4, s[1] + (s[3] - s[1]) * f + rr() * 8 - 4, 2, 2); }
    }
    drawFog(only) {
        const ex = Core.human().explored, W = G.W, H = G.H;
        for (const f of this.fog) {
            if (only && !only.has(f.cx + ',' + f.cy)) continue;
            const ctx = f.tex.getContext();
            const x0 = f.cx * CHUNK, y0 = f.cy * CHUNK;
            // chunks with nothing explored near them are plain black: skip the costly blur
            let seen = false;
            for (let y = Math.max(0, y0 - 1); y <= Math.min(H - 1, y0 + CHUNK) && !seen; y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(W - 1, x0 + CHUNK); x++) if (ex[y * W + x]) { seen = true; break; }
            if (!seen) {
                if (f.black) continue;
                ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, CHUNK * TS, CHUNK * TS);
                f.black = true; f.tex.refresh();
                continue;
            }
            f.black = false;
            ctx.clearRect(0, 0, CHUNK * TS, CHUNK * TS);
            ctx.filter = 'blur(5px)';
            ctx.fillStyle = '#000000'; ctx.beginPath();
            let any = false;
            for (let y = y0 - 1; y <= y0 + CHUNK; y++) for (let x = x0 - 1; x <= x0 + CHUNK; x++) {
                if (x < 0 || y < 0 || x >= W || y >= H) { ctx.rect((x - x0) * TS - 4, (y - y0) * TS - 4, TS + 8, TS + 8); any = true; continue; }
                if (!ex[y * W + x]) { ctx.rect((x - x0) * TS - 6, (y - y0) * TS - 6, TS + 12, TS + 12); any = true; }
            }
            if (any) ctx.fill();
            ctx.filter = 'none';
            f.tex.refresh();
        }
    }
    fogChanged(x, y, r) {
        const set = new Set();
        for (let dy = -r - 1; dy <= r + 1; dy += 1) for (let dx = -r - 1; dx <= r + 1; dx += 1) {
            const nx = clamp(x + dx, 0, G.W - 1), ny = clamp(y + dy, 0, G.H - 1);
            set.add(Math.floor(nx / CHUNK) + ',' + Math.floor(ny / CHUNK));
        }
        this.drawFog(set);
    }

    // ---------------- objects & heroes ----------------
    objSpriteSpec(o) {
        switch (o.type) {
            case 'town': return { key: 'town_' + o.faction, dx: 0, dy: 10, scale: 1, flag: [36, -112] };
            case 'mine': return { key: 'mine_' + o.res, dx: 0, dy: 4, flag: [30, -64] };
            case 'dwelling': return { key: 'dwelling', dx: -TS / 2, dy: 2, flag: [-6, -62], creature: true };
            case 'res': return { key: 'res_' + o.res, dy: -2 };
            case 'chest': return { key: 'chest', dy: -2 };
            case 'campfire': return { key: 'campfire', dy: -2 };
            case 'artifact': return { key: Art.artifact(this, o.aid), dy: -4, scale: 0.6, glow: true };
            case 'monster': return { key: Art.creature(this, o.cid), dy: 2, scale: 0.36 };
            case 'site': return SMALL_SITES.includes(o.kind) ? { key: 'site_' + o.kind, dy: 2 } : { key: 'site_' + o.kind, dx: -TS / 2, dy: 4 };
        }
    }
    syncObjects() {
        this.mapMode(() => {
            for (const id in this.objSprites) if (!G.objects[id]) { this.objSprites[id].list.forEach(s => s.destroy()); delete this.objSprites[id]; }
            for (const id in G.objects) {
                const o = G.objects[id];
                let e = this.objSprites[id];
                if (!e) {
                    const sp = this.objSpriteSpec(o); if (!sp) continue;
                    const bx = o.x * TS + TS / 2 + (sp.dx || 0), by = o.y * TS + TS + (sp.dy || 0);
                    const list = [];
                    if (sp.glow) list.push(this.add.image(bx, by - 12, 'spark').setTint(0xffe080).setAlpha(0.7).setDepth(o.y * 10 + 3).setScale(1.2));
                    const im = this.add.image(bx, by, sp.key).setOrigin(0.5, 1).setDepth(o.y * 10 + 4).setScale(sp.scale || 1);
                    if (o.type === 'monster' && (o.x * 7 + o.y) % 2) im.setFlipX(true);
                    list.push(im);
                    if (sp.creature) list.push(this.add.image(bx + 18, by + 2, Art.creature(this, o.cid)).setOrigin(0.5, 1).setScale(0.26).setDepth(o.y * 10 + 5));
                    if (o.type === 'site' && o.kind === 'monolith') im.setTint([0xffffff, 0xff9090, 0x90ff90, 0x9090ff, 0xffff80, 0x80ffff][(o.pair || 0) % 6]);
                    let flag = null;
                    if (sp.flag) { flag = this.add.image(bx + sp.flag[0], by + sp.flag[1], 'flag').setOrigin(0.15, 1).setDepth(o.y * 10 + 6); list.push(flag); }
                    e = this.objSprites[id] = { list, flag, owner: null };
                }
                if (e.flag && e.owner !== o.owner) { e.owner = o.owner; e.flag.setVisible(o.owner >= 0); if (o.owner >= 0) e.flag.setTint(Core.color(o.owner).hex); }
            }
        });
    }
    syncHeroes() {
        this.mapMode(() => {
            for (const id in this.heroSprites) if (!G.heroes[id] || G.heroes[id].x < 0) { this.heroSprites[id].destroy(); delete this.heroSprites[id]; }
            for (const id in G.heroes) {
                const h = G.heroes[id]; if (h.x < 0) continue;
                let s = this.heroSprites[id];
                if (!s) s = this.heroSprites[id] = this.add.image(0, 0, 'hero_' + G.players[h.owner].color).setOrigin(0.5, 1);
                s.setPosition(h.x * TS + TS / 2, h.y * TS + TS + 2).setDepth(h.y * 10 + 7);
                const inTown = Core.townOfHero(h);
                s.setAlpha(inTown ? 0.9 : 1);
                const vis = Core.human().explored[Core.idx(h.x, h.y)];
                s.setVisible(!!vis);
            }
        });
    }

    // ---------------- side panel ----------------
    buildPanel() {
        this.add.tileSprite(VIEW_W, 0, VW - VIEW_W, VH, 'stonebg').setOrigin(0);
        UI.frame(this, VIEW_W + 1, 1, VW - VIEW_W - 2, VH - 2);
        this.add.tileSprite(0, VIEW_H, VIEW_W, VH - VIEW_H, 'panelbg').setOrigin(0);
        UI.frame(this, 1, VIEW_H, VIEW_W - 2, VH - VIEW_H - 1);
        // status strip over the map
        this.statusBg = this.add.rectangle(0, VIEW_H - 24, VIEW_W, 24, 0x000000, 0.55).setOrigin(0);
        this.statusText = UI.text(this, VIEW_W / 2, VIEW_H - 12, '', 15, UI.TXT, { origin: 0.5 });
        // minimap
        this.mmSize = 200;
        if (this.textures.exists('minimap')) this.textures.remove('minimap');
        this.mmTex = this.textures.createCanvas('minimap', G.W, G.H);
        this.add.rectangle(VIEW_W + 10, 10, 204, 204, 0x000000).setOrigin(0).setStrokeStyle(2, UI.GOLD);
        this.mm = this.add.image(VIEW_W + 12, 12, 'minimap').setOrigin(0).setDisplaySize(200, 200);
        this.mmView = this.add.graphics();
        this.mm.setInteractive({ useHandCursor: true });
        const mmJump = p => { const fx = (p.x - VIEW_W - 12) / 200, fy = (p.y - 12) / 200; this.centerOn(fx * G.W, fy * G.H); };
        this.mm.on('pointerdown', mmJump);
        this.mm.on('pointermove', p => { if (p.isDown) mmJump(p); });
        // hero + town lists
        UI.text(this, VIEW_W + 12, 220, 'Heroes', 14, UI.GOLDS, { title: true });
        UI.text(this, VIEW_W + 118, 220, 'Towns', 14, UI.GOLDS, { title: true });
        this.listItems = [];
        // buttons
        const bx = VIEW_W + 10, by = 520, bw = 101, bh = 30;
        const btn = (i, label, fn, tip) => UI.button(this, bx + (i % 2) * (bw + 2), by + Math.floor(i / 2) * (bh + 4), bw, bh, label, fn, { size: 14, tip });
        this.btnNext = btn(0, 'Next Hero', () => this.nextHero(), 'Select the next hero with movement left (H)');
        this.btnEnd = btn(1, 'End Turn', () => this.endTurn(), 'End your turn (E)');
        this.btnHero = btn(2, 'Hero', () => this.openHeroScreen(), 'Open the selected hero (Enter)');
        this.btnSpell = btn(3, 'Spellbook', () => this.advSpellbook(), 'Cast an adventure spell (S)');
        this.btnKing = btn(4, 'Kingdom', () => this.kingdom(), 'Kingdom overview (K)');
        this.btnSys = btn(5, 'System', () => this.systemMenu(), 'Save, load and options (Esc)');
        // info box
        this.infoC = this.add.container(VIEW_W + 10, 626);
        // resource bar
        this.resTexts = {};
        RES.forEach((r, i) => {
            const x = 10 + i * 92;
            this.add.image(x + 12, VIEW_H + 16, 'res_' + r).setScale(0.7);
            this.resTexts[r] = UI.text(this, x + 28, VIEW_H + 16, '0', 15, UI.TXT, { origin: [0, 0.5] });
        });
        this.dateText = UI.text(this, VIEW_W - 10, VIEW_H + 16, '', 15, UI.GOLDS, { origin: [1, 0.5] });
        this.dayBanner = UI.text(this, VIEW_W / 2, 60, '', 30, UI.GOLDS, { origin: 0.5, title: true, stroke: 5 }).setAlpha(0);
    }
    status(s) { this.statusText.setText(s || ''); }
    refreshPanel() {
        const p = Core.human();
        for (const r of RES) this.resTexts[r].setText(fmt(p.res[r]));
        this.dateText.setText(Core.dateStr());
        this.listItems.forEach(o => o.destroy()); this.listItems = [];
        const heroes = Core.heroesOf(p), towns = Core.townsOf(p);
        heroes.slice(0, 8).forEach((h, i) => {
            const x = VIEW_W + 12, y = 240 + i * 34;
            const c = this.add.container(x, y);
            const im = this.add.image(0, 0, Art.portrait(this, h)).setOrigin(0).setDisplaySize(28, 31);
            const mpf = clamp(h.mp / Core.maxMove(h), 0, 1), mnf = clamp(h.mana / Math.max(1, Core.maxMana(h)), 0, 1);
            const g = this.add.graphics();
            g.fillStyle(0x000000).fillRect(30, 0, 4, 31).fillRect(36, 0, 4, 31);
            g.fillStyle(0x30d030).fillRect(30, 31 - 31 * mpf, 4, 31 * mpf);
            g.fillStyle(0x4080ff).fillRect(36, 31 - 31 * mnf, 4, 31 * mnf);
            if (this.selHero === h.id) g.lineStyle(2, 0xffe060).strokeRect(-1, -1, 42, 33);
            const t = UI.text(this, 44, 15, h.name.length > 9 ? h.name.slice(0, 9) + '.' : h.name, 12, h.sleep ? UI.DIM : UI.TXT, { origin: [0, 0.5] });
            const z = this.add.zone(-2, -2, 102, 35).setOrigin(0).setInteractive({ useHandCursor: true });
            z.on('pointerup', (pp) => { if (pp.rightButtonReleased()) return; if (this.selHero === h.id) this.openHeroScreen(); else { this.select(h); this.centerOn(h.x, h.y); } });
            c.add([im, g, t, z]);
            this.listItems.push(c);
        });
        towns.slice(0, 8).forEach((t, i) => {
            const x = VIEW_W + 118, y = 240 + i * 34;
            const c = this.add.container(x, y);
            const im = this.add.image(0, 0, 'town_' + t.faction).setOrigin(0).setDisplaySize(40, 30);
            const g = this.add.graphics();
            if (this.selTown === t.id) g.lineStyle(2, 0xffe060).strokeRect(-1, -1, 42, 32);
            if (!t.builtToday) g.fillStyle(0x30d030).fillCircle(38, 4, 3);
            const tx = UI.text(this, 44, 15, t.name.length > 8 ? t.name.slice(0, 8) + '.' : t.name, 12, UI.TXT, { origin: [0, 0.5] });
            const z = this.add.zone(-2, -2, 100, 35).setOrigin(0).setInteractive({ useHandCursor: true });
            z.on('pointerup', (pp) => { if (pp.rightButtonReleased()) return; if (this.selTown === t.id) this.openTown(t); else { this.selectTown(t); this.centerOn(t.x, t.y); } });
            c.add([im, g, tx, z]);
            this.listItems.push(c);
        });
        // info box
        this.infoC.removeAll(true);
        const h = this.selHero && G.heroes[this.selHero];
        const t = this.selTown && G.objects[this.selTown];
        if (h) {
            this.infoC.add(UI.text(this, 0, 0, `${h.name}, Lv ${h.lvl}`, 14, UI.GOLDS));
            this.infoC.add(UI.text(this, 0, 18, `Move ${h.mp}/${Core.maxMove(h)}  Mana ${h.mana}/${Core.maxMana(h)}`, 12, UI.TXT));
            h.army.forEach((s, i) => {
                const x = (i % 4) * 51, y = 36 + Math.floor(i / 4) * 34;
                this.infoC.add(this.add.rectangle(x, y, 48, 32, 0x140c06, 0.8).setOrigin(0).setStrokeStyle(1, 0x6a5020));
                if (s) {
                    this.infoC.add(this.add.image(x + 24, y + 31, Art.creature(this, s.cid)).setOrigin(0.5, 1).setScale(0.22));
                    this.infoC.add(UI.text(this, x + 46, y + 32, fmt(s.n), 11, '#ffffff', { origin: [1, 1] }));
                }
            });
        } else if (t) {
            this.infoC.add(UI.text(this, 0, 0, t.name, 14, UI.GOLDS));
            const inc = Core.townIncome(t);
            this.infoC.add(UI.text(this, 0, 18, `${FACTIONS[t.faction].name} · +${inc.gold} gold/day`, 12, UI.TXT));
            t.garrison.forEach((s, i) => {
                const x = (i % 4) * 51, y = 36 + Math.floor(i / 4) * 34;
                this.infoC.add(this.add.rectangle(x, y, 48, 32, 0x140c06, 0.8).setOrigin(0).setStrokeStyle(1, 0x6a5020));
                if (s) { this.infoC.add(this.add.image(x + 24, y + 31, Art.creature(this, s.cid)).setOrigin(0.5, 1).setScale(0.22)); this.infoC.add(UI.text(this, x + 46, y + 32, fmt(s.n), 11, '#ffffff', { origin: [1, 1] })); }
            });
        }
        this.btnHero.setDisabled(!h);
    }
    drawMinimap() {
        const ctx = this.mmTex.getContext(), W = G.W, H = G.H;
        const img = ctx.createImageData(W, H), d = img.data;
        const ex = Core.human().explored;
        const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
        const tc = TERRAIN.map(t => hex(t.mini));
        for (let i = 0; i < W * H; i++) {
            let c;
            if (!ex[i]) c = [0, 0, 0];
            else { c = tc[G.terrain[i]]; if (G.block[i] && G.terrain[i] !== T.WATER) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55]; }
            d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
        }
        const put = (x, y, rgb) => { if (!Core.inMap(x, y)) return; const i = (y * W + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; };
        for (const id in G.objects) {
            const o = G.objects[id];
            if (!ex[Core.idx(o.x, o.y)]) continue;
            if (o.type === 'town' || o.type === 'mine' || o.type === 'dwelling') {
                const rgb = hex(Core.color(o.owner).css);
                const r = o.type === 'town' ? 1 : 0;
                for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) put(o.x + dx, o.y + dy, rgb);
            }
        }
        for (const id in G.heroes) { const h = G.heroes[id]; if (h.x >= 0 && ex[Core.idx(h.x, h.y)]) put(h.x, h.y, hex(PLAYER_COLORS[G.players[h.owner].color].css)); }
        ctx.putImageData(img, 0, 0);
        this.mmTex.refresh();
        this.drawMinimapView();
    }
    drawMinimapView() {
        const cam = this.cameras.main, k = 200 / (G.W * TS);
        this.mmView.clear().lineStyle(1, 0xffffff).strokeRect(VIEW_W + 12 + cam.scrollX * k, 12 + cam.scrollY * (200 / (G.H * TS)), VIEW_W * k, VIEW_H * (200 / (G.H * TS)));
    }
    refreshAll() {
        this.syncObjects(); this.syncHeroes();
        this.refreshPanel(); this.drawMinimap();
        this.updatePath();
    }

    // ---------------- selection & paths ----------------
    select(h) {
        this.selHero = h ? h.id : null; this.selTown = null;
        this.path = null;
        if (h && h.dest) this.planPath(h.dest.x, h.dest.y, true);
        this.refreshPanel(); this.updatePath();
    }
    selectTown(t) { this.selTown = t.id; this.selHero = null; this.path = null; this.refreshPanel(); this.updatePath(); }
    planPath(x, y, quiet) {
        const h = G.heroes[this.selHero];
        if (!h) return;
        const r = Core.reach(h, { explored: Core.human().explored });
        const p = Core.pathTo(h, x, y, r);
        if (!p || !p.length) { this.path = null; h.dest = null; if (!quiet) { Sfx.play('error'); this.status('You cannot reach that location.'); } return; }
        this.path = p; h.dest = { x, y };
    }
    updatePath() {
        this.pathLayer.removeAll(true);
        const h = this.selHero && G.heroes[this.selHero];
        if (!h || !this.path) return;
        this.mapMode(() => {
            let mp = h.mp;
            const fresh = h.mp >= Core.maxMove(h);
            this.path.forEach((st, i) => {
                const prevCost = i ? this.path[i - 1].cost : 0;
                const ok = st.cost <= h.mp || (i === 0 && fresh);
                const last = i === this.path.length - 1;
                const im = this.add.image(st.x * TS + TS / 2, st.y * TS + TS / 2, last ? 'spark' : 'dot').setTint(ok ? 0x40ff40 : 0xff5040).setScale(last ? 0.9 : 0.7).setAlpha(0.9);
                this.pathLayer.add(im);
            });
        });
    }

    // ---------------- input ----------------
    setupInput() {
        this.input.mouse.disableContextMenu();
        this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,D');
        this.input.on('pointermove', p => {
            if (UI.anyModal(this)) return;
            if (p.x >= VIEW_W || p.y >= VIEW_H) { this.hoverRect.setVisible(false); return; }
            const wp = this.cameras.main.getWorldPoint(p.x, p.y);
            const tx = Math.floor(wp.x / TS), ty = Math.floor(wp.y / TS);
            if (!Core.inMap(tx, ty)) return;
            this.hoverRect.setVisible(true).setPosition(tx * TS, ty * TS);
            this.status(this.describeTile(tx, ty));
        });
        this.input.on('pointerdown', (p, over) => {
            Sfx.unlock();
            if (over.length || UI.anyModal(this) || this.busy) return;
            if (p.x >= VIEW_W || p.y >= VIEW_H) return;
            const wp = this.cameras.main.getWorldPoint(p.x, p.y);
            const tx = Math.floor(wp.x / TS), ty = Math.floor(wp.y / TS);
            if (!Core.inMap(tx, ty)) return;
            if (p.rightButtonDown()) this.rightClick(p, tx, ty);
            else this.leftClick(tx, ty);
        });
        this.input.keyboard.on('keydown', e => {
            if (UI.anyModal(this) || this.busy || !this.scene.isActive()) return;
            const k = e.key.toLowerCase();
            if (k === 'e') this.endTurn();
            else if (k === 'h') this.nextHero();
            else if (k === 'k') this.kingdom();
            else if (k === 's') this.advSpellbook();
            else if (k === 'enter') this.openHeroScreen();
            else if (k === 'escape') this.systemMenu();
            else if (k === 'm' || k === ' ') { if (this.path) this.moveSelected(); }
            else if (k === 't') { const ts = Core.townsOf(Core.human()); if (ts.length) this.openTown(G.objects[this.selTown] || ts[0]); }
        });
    }
    describeTile(x, y) {
        const ex = Core.human().explored;
        if (!ex[Core.idx(x, y)]) return 'Uncharted territory';
        const h = Core.heroAt(x, y);
        if (h) return `${h.name}, ${CLASSES[h.cls].name} (${PLAYER_COLORS[G.players[h.owner].color].name})`;
        const o = Core.visAt(x, y);
        if (o) return Adv.describe(o, G.heroes[this.selHero]).slice(0, 2).join(' — ');
        // part of a building footprint?
        for (const id in G.objects) { const ob = G.objects[id]; const f = footOf(ob); if (x >= ob.x + f[0] && x <= ob.x + f[2] && y >= ob.y + f[1] && y <= ob.y + f[3]) return Adv.objName(ob); }
        const g = Core.guardOf(x, y);
        const t = TERRAIN[G.terrain[Core.idx(x, y)]].name + (G.road[Core.idx(x, y)] ? ' (road)' : '');
        if (g) return `${t} — guarded by ${CREATURES[g.cid].name}`;
        if (this.path) { const st = this.path.find(s => s.x === x && s.y === y); if (st) return `${t} — movement cost ${st.cost}`; }
        return t;
    }
    rightClick(p, x, y) {
        const ex = Core.human().explored;
        if (!ex[Core.idx(x, y)]) return;
        let lines = null, icon = null;
        const h = Core.heroAt(x, y);
        const o = Core.visAt(x, y);
        if (h) {
            lines = [`${h.name}`, `Level ${h.lvl} ${CLASSES[h.cls].name}`, `Owner: ${PLAYER_COLORS[G.players[h.owner].color].name}`];
            if (h.owner === 0) lines.push(`Attack ${Core.stat(h, 'att')}  Defense ${Core.stat(h, 'def')}  Power ${Core.stat(h, 'pow')}  Knowledge ${Core.stat(h, 'know')}`, h.army.filter(Boolean).map(s => `${s.n} ${CREATURES[s.cid].name}`).join(', '));
            else lines.push('Army: ' + h.army.filter(Boolean).map(s => `${stackWord(s.n)} ${CREATURES[s.cid].name}`).join(', '));
            icon = Art.portrait(this, h);
        } else if (o) {
            lines = Adv.describe(o, G.heroes[this.selHero]);
            if (o.type === 'monster') icon = Art.creature(this, o.cid);
            if (o.type === 'town') { icon = 'town_' + o.faction; if (o.owner === 0) lines.push(o.garrison.filter(Boolean).map(s => `${s.n} ${CREATURES[s.cid].name}`).join(', ') || 'No garrison'); else lines.push(o.garrison.some(Boolean) ? 'Garrison: ' + o.garrison.filter(Boolean).map(s => `${stackWord(s.n)} ${CREATURES[s.cid].name}`).join(', ') : 'No garrison'); }
            if (o.type === 'artifact') icon = Art.artifact(this, o.aid);
            if (o.type === 'mine') icon = 'mine_' + o.res;
            if (o.type === 'site') icon = 'site_' + o.kind;
            if (o.type === 'res') icon = 'res_' + o.res;
        } else lines = [this.describeTile(x, y)];
        const pop = UI.popup(this, p.x + 12, p.y - 60, lines, { icon, w: 300, align: 'center' });
        this.input.once('pointerup', () => pop.destroy());
    }
    leftClick(x, y) {
        const p = Core.human();
        const h = this.selHero && G.heroes[this.selHero];
        const hh = Core.heroAt(x, y);
        const o = Core.visAt(x, y);
        if (hh && hh.owner === 0 && (!h || hh === h)) {
            if (h === hh) this.openHeroScreen(); else this.select(hh);
            return;
        }
        if (!h && o && o.type === 'town' && o.owner === 0) { if (this.selTown === o.id) this.openTown(o); else this.selectTown(o); return; }
        if (!h) return;
        if (h.x === x && h.y === y) { this.openHeroScreen(); return; }
        if (this.path && h.dest && h.dest.x === x && h.dest.y === y) { this.moveSelected(); return; }
        if (o && o.type === 'town' && o.owner === 0 && Core.heroAt(o.x, o.y) === h) { this.openTown(o); return; }
        this.planPath(x, y);
        this.updatePath();
    }
    update(time, dt) {
        if (UI.anyModal(this) || !this.scene.isActive()) return;
        const cam = this.cameras.main, sp = dt * 0.6;
        let mx = 0, my = 0;
        if (this.keys.LEFT.isDown || this.keys.A.isDown) mx -= sp; if (this.keys.RIGHT.isDown || this.keys.D.isDown) mx += sp;
        if (this.keys.UP.isDown || this.keys.W.isDown) my -= sp; if (this.keys.DOWN.isDown) my += sp;
        const p = this.input.activePointer;
        if (p.x >= 0 && p.y >= 0 && this.game.hasFocus && p.x < VIEW_W && p.y < VIEW_H) {
            if (p.x < 6) mx -= sp; if (p.x > VIEW_W - 6 && p.x < VIEW_W) mx += sp;
            if (p.y < 6) my -= sp; if (p.y > VIEW_H - 6 && p.y < VIEW_H) my += sp;
        }
        if (mx || my) { cam.scrollX += mx; cam.scrollY += my; this.drawMinimapView(); }
    }
    centerOn(x, y) { this.cameras.main.centerOn(x * TS + TS / 2, y * TS + TS / 2); this.drawMinimapView(); }

    // ---------------- actions ----------------
    async moveSelected() {
        const h = G.heroes[this.selHero];
        if (!h || !this.path || this.busy) return;
        this.busy = true;
        const path = this.path;
        this.path = null; this.updatePath();
        try { await Adv.moveHero(h, path, this.io); }
        catch (e) { console.error(e); }
        this.busy = false;
        if (G.heroes[h.id]) { if (h.dest) this.planPath(h.dest.x, h.dest.y, true); }
        else this.select(Core.heroesOf(Core.human())[0] || null);
        this.refreshAll();
        this.checkEnd();
    }
    animStep(h, px, py, fast) {
        return new Promise(res => {
            const s = this.heroSprites[h.id];
            if (!s) return res();
            if (h.x !== px) s.setFlipX(h.x < px);
            s.setVisible(true);
            const cam = this.cameras.main;
            const wx = h.x * TS + TS / 2, wy = h.y * TS + TS + 2;
            if (wx < cam.scrollX + 120 || wx > cam.scrollX + VIEW_W - 120 || wy < cam.scrollY + 120 || wy > cam.scrollY + VIEW_H - 120) cam.pan(wx, wy, fast ? 120 : 250, 'Sine.easeInOut');
            s.setDepth(Math.max(h.y, py) * 10 + 7);
            this.tweens.add({ targets: s, x: wx, y: wy, duration: fast ? 70 : 140, onComplete: () => { s.setDepth(h.y * 10 + 7); this.drawMinimapView(); res(); } });
        });
    }
    makeIO() {
        const sc = this;
        return {
            human: true, scene: this,
            msg: (t, icons) => UI.msg(sc, t, { icons }),
            notify: (t) => UI.msg(sc, t),
            ask: (t, icons, o) => UI.confirm(sc, t, Object.assign({ icons }, o || {})),
            pick: (t, icons) => UI.pick(sc, t, icons),
            sfx: n => Sfx.play(n),
            onStep: async (h, px, py, rev) => {
                Sfx.play('step');
                if (rev) this.fogChanged(h.x, h.y, Core.sight(h) + 1);
                await this.animStep(h, px, py);
                this.refreshPanel();
            },
            refresh: () => this.refreshAll(),
            openTown: t => this.openTown(t),
            exchange: (a, b) => this.openExchange(a, b),
            levelUp: (h, roll) => this.levelUpDialog(h, roll),
            teleported: async h => { this.syncHeroes(); this.drawFog(); this.centerOn(h.x, h.y); },
        };
    }
    async levelUpDialog(h, roll) {
        Sfx.play('levelup');
        const nm = { att: 'Attack', def: 'Defense', pow: 'Spell Power', know: 'Knowledge' }[roll.prim];
        const head = `${h.name} has gained a level!\n${h.name} is now a level ${h.lvl} ${CLASSES[h.cls].name}.\n${nm} +1`;
        if (!roll.opts.length) { await UI.msg(this, head, { icons: [{ key: 'prim_' + roll.prim, label: '+1 ' + nm }], title: 'Level Up' }); return 0; }
        const icons = roll.opts.map(o => ({ key: Art.skill(this, o[0]), label: `${SKILL_LVL[o[1]]}\n${SKILLS[o[0]].name}` }));
        return UI.pick(this, head + '\n\nChoose a secondary skill:', icons, { title: 'Level Up', w: 460 });
    }
    openTown(t) {
        return new Promise(res => {
            this.selectTown(t);
            this.scene.pause();
            this.scene.launch('Town', { townId: t.id, onClose: () => { this.scene.resume(); this.refreshAll(); this.checkEnd(); res(); } });
        });
    }
    openHeroScreen(h) {
        h = h || (this.selHero && G.heroes[this.selHero]);
        if (!h) return;
        this.scene.pause();
        this.scene.launch('HeroScreen', { heroId: h.id, onClose: (dismissed) => { this.scene.resume(); if (dismissed) this.select(Core.heroesOf(Core.human())[0] || null); this.refreshAll(); } });
    }
    openExchange(a, b) {
        return new Promise(res => {
            this.scene.pause();
            this.scene.launch('Exchange', { a: a.id, b: b.id, onClose: () => { this.scene.resume(); this.refreshAll(); res(); } });
        });
    }
    runBattle(cfg) {
        return new Promise(res => {
            this.scene.sleep();
            this.scene.launch('Combat', { cfg, onEnd: (result) => { this.scene.stop('Combat'); this.scene.wake(); this.refreshAll(); res(result); } });
        });
    }
    nextHero() {
        const hs = Core.heroesOf(Core.human()).filter(h => h.mp > 0 && !h.sleep);
        if (!hs.length) { this.status('No heroes have movement left.'); return; }
        const i = hs.findIndex(h => h.id === this.selHero);
        const h = hs[(i + 1) % hs.length];
        this.select(h); this.centerOn(h.x, h.y);
    }

    // ---------------- turn loop ----------------
    async endTurn() {
        if (this.busy || UI.anyModal(this)) return;
        const hp = Core.human();
        const moving = Core.heroesOf(hp).filter(h => h.mp >= Core.maxMove(h) && !h.sleep);
        if (moving.length && !await UI.confirm(this, 'One or more heroes may still move. Are you sure you want to end your turn?')) return;
        this.busy = true;
        this.path = null; this.updatePath();
        const N = G.players.length;
        for (let guard = 0; guard < N * 2; guard++) {
            G.turn = (G.turn + 1) % N;
            if (G.turn === 0) {
                const before = Core.week();
                Core.nextDay();
                if (Core.week() !== before) this.weekStart = true;
            }
            const p = Core.cur();
            if (!p.alive) continue;
            if (p.human) break;
            Core.beginTurn(p);
            this.banner(`${PLAYER_COLORS[p.color].name}'s turn`, PLAYER_COLORS[p.color].css);
            try { await AI.turn(p, this.aiIO()); } catch (e) { console.error('AI error', e); }
            Core.checkElimination();
            this.refreshAll();
            if (await this.checkEnd()) { this.busy = false; return; }
        }
        Core.beginTurn(hp);
        this.busy = false;
        this.refreshAll();
        Sfx.play('turn');
        this.banner(Core.dateStr(), '#f0d890');
        if (this.weekStart) {
            this.weekStart = false;
            Sfx.play('week');
            if (G.weekOf) await UI.msg(this, `Astrologers proclaim the Week of the ${CREATURES[G.weekOf].name}!\nAll dwellings produce +5 ${plural(CREATURES[G.weekOf].name)}.`, { title: 'A New Week', icons: [{ key: Art.creature(this, G.weekOf), scale: 0.7 }] });
            else await UI.msg(this, 'A new week begins. Creatures in all dwellings multiply.', { title: 'A New Week' });
        }
        if (hp.towns.length === 0 && hp.heroes.length) {
            const left = 7 - hp.noTown;
            await UI.msg(this, left > 0 ? `You have no towns! Capture one within ${left} day${left > 1 ? 's' : ''} or be defeated.` : 'This is your last day to capture a town!');
        }
        const h = this.selHero && G.heroes[this.selHero];
        if (h) { this.select(h); this.centerOn(h.x, h.y); }
        else this.nextHero();
        this.autosave();
    }
    aiIO() {
        const sc = this;
        return {
            human: false, scene: this,
            onStep: async (h, px, py) => {
                const ex = Core.human().explored;
                this.syncHeroes();
                if (ex[Core.idx(h.x, h.y)] && Sfx) await this.animStep(h, px, py, true);
            },
            refresh: () => { this.syncObjects(); this.syncHeroes(); },
        };
    }
    banner(s, color) {
        this.dayBanner.setText(s).setColor(color).setAlpha(1);
        this.tweens.killTweensOf(this.dayBanner);
        this.tweens.add({ targets: this.dayBanner, alpha: 0, delay: 1000, duration: 600 });
    }
    async checkEnd() {
        if (this.ended) return true;
        Core.checkElimination();
        const hp = Core.human();
        const rivals = G.players.filter(p => !p.human && p.alive);
        if (!hp.alive) {
            this.ended = true; Sfx.play('defeat');
            await UI.msg(this, 'Your kingdom has fallen. All your towns and heroes are lost.', { title: 'Defeat' });
            this.toMenu();
            return true;
        }
        if (!rivals.length) {
            this.ended = true; Sfx.play('victory');
            await UI.msg(this, `Victory! All rival kingdoms have been conquered.\n\nYou won on ${Core.dateStr()}.`, { title: 'Victory', icons: [{ key: 'town_' + hp.faction, scale: 0.7 }] });
            try { localStorage.removeItem('heroes_save_auto'); } catch (e) { }
            this.toMenu();
            return true;
        }
        return false;
    }
    toMenu() { this.scene.stop('Town'); this.scene.stop('HeroScreen'); this.scene.start('Menu'); }
    autosave() { Core.save('auto'); }

    // ---------------- dialogs ----------------
    kingdom() {
        if (UI.anyModal(this)) return;
        const p = Core.human();
        const m = UI.modal(this, 700, 560, { title: 'Kingdom Overview' });
        const inc = Core.income(p);
        let y = 50;
        m.add(UI.text(this, 24, y, 'Daily income:', 15, UI.GOLDS));
        RES.forEach((r, i) => { m.add(this.add.image(150 + i * 76, y + 9, 'res_' + r).setScale(0.6)); m.add(UI.text(this, 164 + i * 76, y + 9, '+' + fmt(inc[r]), 14, UI.TXT, { origin: [0, 0.5] })); });
        y += 34;
        const mines = {}; for (const id in G.objects) { const o = G.objects[id]; if (o.type === 'mine' && o.owner === p.id) mines[o.res] = (mines[o.res] || 0) + 1; }
        m.add(UI.text(this, 24, y, 'Mines: ' + (Object.entries(mines).map(([r, n]) => `${n} ${MINE_INFO[r].name}`).join(', ') || 'none'), 14, UI.TXT, { wrap: 650 }));
        y += 30;
        m.add(UI.text(this, 24, y, 'Heroes', 16, UI.GOLDS, { title: true })); y += 24;
        for (const h of Core.heroesOf(p)) {
            m.add(this.add.image(24, y, Art.portrait(this, h)).setOrigin(0).setDisplaySize(36, 40));
            m.add(UI.text(this, 68, y + 2, `${h.name} — Lv ${h.lvl} ${CLASSES[h.cls].name}   A${Core.stat(h, 'att')} D${Core.stat(h, 'def')} P${Core.stat(h, 'pow')} K${Core.stat(h, 'know')}`, 14, UI.TXT));
            m.add(UI.text(this, 68, y + 20, h.army.filter(Boolean).map(s => `${s.n} ${CREATURES[s.cid].name}`).join(', '), 12, UI.DIM, { wrap: 600 }));
            y += 46;
        }
        y += 6;
        m.add(UI.text(this, 24, y, 'Towns', 16, UI.GOLDS, { title: true })); y += 24;
        for (const t of Core.townsOf(p)) {
            m.add(UI.text(this, 24, y, `${t.name} (${FACTIONS[t.faction].name}) — +${Core.townIncome(t).gold} gold — ${Object.keys(t.built).length} buildings`, 14, UI.TXT));
            y += 20;
        }
        y = Math.max(y + 10, 440);
        m.add(UI.text(this, 24, y, 'Rivals: ' + G.players.filter(o => !o.human).map(o => `${PLAYER_COLORS[o.color].name} (${FACTIONS[o.faction].name})${o.alive ? '' : ' — defeated'}`).join(', '), 13, UI.DIM, { wrap: 650 }));
        m.add(UI.button(this, 295, 510, 110, 34, 'Close', () => m.close()));
    }
    async systemMenu() {
        if (UI.anyModal(this) || this.busy) return;
        const m = UI.modal(this, 320, 380, { title: 'System' });
        const b = (i, l, fn) => m.add(UI.button(this, 60, 52 + i * 44, 200, 36, l, fn));
        b(0, 'Save Game', () => { m.close(); this.saveDialog(); });
        b(1, 'Load Game', () => { m.close(); this.loadDialog(); });
        b(2, `Sound: ${Sfx.enabled ? 'On' : 'Off'}`, () => { Sfx.toggle(); m.close(); this.systemMenu(); });
        b(3, `Music: ${Sfx.music ? 'On' : 'Off'}`, () => { Sfx.toggleMusic(); m.close(); this.systemMenu(); });
        b(4, 'Help', () => { m.close(); showHelp(this); });
        b(5, 'Main Menu', async () => { m.close(); if (await UI.confirm(this, 'Return to the main menu? Unsaved progress will be lost (an autosave is made every turn).')) this.toMenu(); });
        b(6, 'Return to Game', () => m.close());
    }
    saveDialog() {
        const m = UI.modal(this, 420, 330, { title: 'Save Game' });
        for (let i = 1; i <= 5; i++) {
            const meta = Core.saveMeta(i);
            m.add(UI.button(this, 30, 46 + (i - 1) * 46, 360, 38, `Slot ${i}: ${meta ? meta.date + ' (' + meta.when + ')' : 'empty'}`, () => {
                const ok = Core.save(i); m.close();
                UI.msg(this, ok ? 'Game saved.' : 'Could not save the game (storage full?).');
            }, { size: 13 }));
        }
        m.add(UI.button(this, 155, 280, 110, 34, 'Cancel', () => m.close()));
    }
    loadDialog() {
        loadDialog(this, () => { this.scene.restart(); });
    }
    advSpellbook() {
        const h = this.selHero && G.heroes[this.selHero];
        if (!h || UI.anyModal(this)) return;
        const spells = h.spells.filter(s => SPELLS[s].kind === 'adv');
        const m = UI.modal(this, 460, 220 + 0, { title: `${h.name}'s Adventure Spells` });
        if (!spells.length) m.add(UI.text(this, 230, 80, 'You know no adventure spells.\nLearn Town Portal or Dimension Door in a Mage Guild.', 15, UI.TXT, { origin: 0.5, align: 'center' }));
        spells.forEach((s, i) => {
            const sp = SPELLS[s];
            const x = 40 + i * 200;
            m.add(UI.button(this, x, 50, 180, 100, `${sp.name} (${sp.cost})`, () => { m.close(); this.castAdv(h, s); }, { icon: Art.spell(this, s), disabled: h.mana < sp.cost }));
        });
        m.add(UI.text(this, 230, 160, `Mana: ${h.mana}/${Core.maxMana(h)}`, 14, UI.DIM, { origin: [0.5, 0] }));
        m.add(UI.button(this, 175, 180, 110, 30, 'Close', () => m.close()));
    }
    async castAdv(h, s) {
        const sp = SPELLS[s];
        if (s === 'townportal') {
            const towns = Core.townsOf(Core.human()).filter(t => !Core.heroAt(t.x, t.y));
            if (!towns.length) { UI.msg(this, 'No free town to teleport to.'); return; }
            if (h.mp < 300) { UI.msg(this, 'You need at least 300 movement points to cast Town Portal.'); return; }
            towns.sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
            const t = towns[0];
            h.mana -= sp.cost; h.mp -= 300; h.x = t.x; h.y = t.y; h.dest = null;
            Sfx.play('spell');
            this.select(h); this.centerOn(h.x, h.y); this.refreshAll();
            Core.learnGuild(h, t);
            return;
        }
        if (s === 'dimensiondoor') {
            if (h.mp < 300) { UI.msg(this, 'You need at least 300 movement points to cast Dimension Door.'); return; }
            this.status('Click a free, explored tile within 9 tiles. Right-click to cancel.');
            const pick = await new Promise(res => {
                const once = (p, over) => {
                    if (p.x >= VIEW_W || p.y >= VIEW_H) return res(null);
                    if (p.rightButtonDown()) return res(null);
                    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
                    res({ x: Math.floor(wp.x / TS), y: Math.floor(wp.y / TS) });
                };
                this.busy = true;
                this.input.once('pointerdown', once);
            });
            this.busy = false;
            if (!pick) return;
            const ok = Core.inMap(pick.x, pick.y) && Core.passable(pick.x, pick.y) && !Core.visAt(pick.x, pick.y) && !Core.heroAt(pick.x, pick.y) && Core.human().explored[Core.idx(pick.x, pick.y)] && Math.max(Math.abs(pick.x - h.x), Math.abs(pick.y - h.y)) <= 9;
            if (!ok) { UI.msg(this, 'You cannot teleport there.'); return; }
            h.mana -= sp.cost; h.mp -= 300; h.x = pick.x; h.y = pick.y; h.dest = null;
            Sfx.play('spell');
            Core.reveal(Core.human(), h.x, h.y, Core.sight(h));
            this.drawFog(); this.select(h); this.refreshAll();
            const g = Core.guardOf(h.x, h.y);
            if (g) { this.busy = true; await Adv.attackMonster(h, g, this.io, true); this.busy = false; this.refreshAll(); this.checkEnd(); }
        }
    }
}

function showHelp(scene) {
    const txt = [
        'Explore the map with your heroes, gather resources, capture mines and towns, build up your towns and recruit armies. Defeat every rival to win.',
        '',
        'Adventure map: click a tile to plot a path (green = reachable today), click again to move. Right-click (hold) anything for information. Arrow keys / screen edges scroll; the minimap jumps.',
        'Keys: E end turn, H next hero, T town, K kingdom, S adventure spells, Enter hero screen, Space move along path, Esc system menu.',
        '',
        'Towns: build one structure per day. Creature dwellings grow every week (Monday). A Fort, Citadel and Castle add walls and arrow towers and increase growth.',
        'Armies: click a stack then another slot to move, merge or swap. Shift+click (or Split) to split.',
        '',
        'Combat: click a highlighted hex to move, an enemy to attack (the cursor position chooses the side), or shoot with ranged troops. Your hero may cast one spell per round.',
    ].join('\n');
    const m = UI.modal(scene, 640, 520, { title: 'How to Play' });
    m.add(UI.text(scene, 24, 54, txt, 15, UI.TXT, { wrap: 590, lineSpacing: 2 }));
    m.add(UI.button(scene, 265, 470, 110, 34, 'Close', () => m.close()));
}
function loadDialog(scene, after) {
    const m = UI.modal(scene, 420, 380, { title: 'Load Game' });
    const slots = ['auto', 1, 2, 3, 4, 5];
    slots.forEach((s, i) => {
        const meta = Core.saveMeta(s);
        m.add(UI.button(scene, 30, 46 + i * 46, 360, 38, `${s === 'auto' ? 'Autosave' : 'Slot ' + s}: ${meta ? meta.date + ' (' + meta.when + ')' : 'empty'}`, () => {
            if (!meta) return;
            m.close();
            if (Core.load(s)) after(); else UI.msg(scene, 'Could not load that save.');
        }, { size: 13, disabled: !meta }));
    });
    m.add(UI.button(scene, 155, 330, 110, 34, 'Cancel', () => m.close()));
}
