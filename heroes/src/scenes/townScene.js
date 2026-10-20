// Town screen: a painted panorama of the town's buildings plus garrison, visiting hero and all town
// services (build, recruit, mage guild, market, tavern, blacksmith).
const TOWN_POS = {
    walls: [512, 238], hall: [512, 300], mage: [880, 292], d7: [170, 262],
    silo: [70, 352], market: [190, 360], tavern: [340, 352], blacksmith: [690, 352],
    d1: [60, 414], d2: [235, 414], d3: [410, 414], d4: [600, 416], d5: [780, 414], d6: [952, 414],
};

const TownArt = {
    draw(fac, id, lvl, up) {
        const F = FACTIONS[fac], A = Art;
        const wall = F.wall, roof = F.roof, trim = F.trim, dk = A.shade(wall, 0.75);
        const ctxSize = { walls: [1024, 140], hall: [220, 190], mage: [110, 220], silo: [80, 100], market: [140, 90], tavern: [140, 110], blacksmith: [140, 110] }[id] || (id === 'd7' ? [190, 200] : [160, 130]);
        const [c, x] = A.canvas(ctxSize[0], ctxSize[1]);
        const W = ctxSize[0], H = ctxSize[1];
        const roofShape = (x0, y0, w, h, col) => {
            if (fac === 'necropolis' || fac === 'tower') A.poly(x, [[x0 - 4, y0], [x0 + w / 2, y0 - h * 1.3], [x0 + w + 4, y0]], col, 2);
            else if (fac === 'inferno') { A.poly(x, [[x0 - 4, y0], [x0 + w * 0.2, y0 - h], [x0 + w * 0.5, y0 - h * 0.6], [x0 + w * 0.8, y0 - h * 1.1], [x0 + w + 4, y0]], col, 2); }
            else if (fac === 'stronghold') A.poly(x, [[x0 - 6, y0], [x0 + w / 2, y0 - h * 0.8], [x0 + w + 6, y0]], '#b08850', 2);
            else A.poly(x, [[x0 - 4, y0], [x0 + w / 2, y0 - h], [x0 + w + 4, y0]], col, 2);
        };
        const window = (wx, wy, lit) => { x.beginPath(); x.moveTo(wx, wy + 10); x.lineTo(wx, wy + 3); x.arc(wx + 3, wy + 3, 3, Math.PI, 0); x.lineTo(wx + 6, wy + 10); x.closePath(); x.fillStyle = lit ? '#f0d070' : '#2a2020'; x.fill(); x.lineWidth = 1; x.strokeStyle = A.INK; x.stroke(); };
        const block = (x0, y0, w, h, col) => { A.rect(x, x0, y0, w, h, col || wall, 2); A.rect(x, x0 + 2, y0 + 2, w * 0.3, h - 4, A.shade(col || wall, 1.08)); };
        const banner = (bx, by, col) => { A.line(x, [[bx, by], [bx, by - 26]], 2, A.INK); A.poly(x, [[bx, by - 26], [bx + 14, by - 22], [bx, by - 16]], col, 1); };
        switch (id) {
            case 'walls': {
                const towers = lvl;
                A.rect(x, 0, 70, W, 70, dk, 2);
                for (let i = 0; i < 64; i++) A.rect(x, i * 16, 60, 10, 12, dk, 1.5);
                const tw = (tx, h) => { block(tx - 24, 140 - h, 48, h, A.shade(wall, 0.85)); roofShape(tx - 26, 140 - h, 52, 30, roof); window(tx - 3, 140 - h + 20, true); };
                tw(40, 110); tw(984, 110);
                if (towers >= 2) { tw(300, 125); tw(724, 125); }
                if (towers >= 3) { tw(150, 130); tw(874, 130); }
                break;
            }
            case 'hall': {
                const s = 0.7 + lvl * 0.1;
                const w = 180 * s, h = 90 * s, x0 = (W - w) / 2, y0 = H - h;
                if (lvl >= 3) for (let i = 0; i < 6; i++) A.rect(x, x0 + 8 + i * (w - 20) / 5, y0, 6, h, '#ece4d4', 1.5);
                block(x0 + (lvl >= 3 ? 14 : 0), y0 + (lvl >= 3 ? 10 : 0), w - (lvl >= 3 ? 28 : 0), h - (lvl >= 3 ? 10 : 0));
                if (lvl >= 3) { x.beginPath(); x.arc(W / 2, y0, w * 0.22, Math.PI, 0); x.closePath(); x.fillStyle = lvl === 4 ? '#f0c030' : roof; x.fill(); x.lineWidth = 2; x.strokeStyle = A.INK; x.stroke(); A.line(x, [[W / 2, y0 - w * 0.22], [W / 2, y0 - w * 0.22 - 16]], 2, A.INK); }
                else roofShape(x0, y0, w, 50 * s, lvl === 1 ? '#8a5a2a' : roof);
                for (let i = 0; i < 4; i++) window(x0 + 20 + i * (w - 46) / 3, y0 + 20, i % 2 === 0);
                A.rect(x, W / 2 - 10, H - 26, 20, 26, '#4a3020', 1.5);
                if (lvl >= 2) banner(x0 + 10, y0 - 8, trim);
                break;
            }
            case 'mage': {
                const fh = 34;
                for (let i = 0; i < lvl; i++) { const w = 54 - i * 6; block((W - w) / 2, H - (i + 1) * fh, w, fh, A.shade(wall, 1 - i * 0.05)); window(W / 2 - 3, H - (i + 1) * fh + 10, true); }
                roofShape((W - 54 + lvl * 6) / 2, H - lvl * fh, 54 - lvl * 6, 34, '#6a3aa0');
                A.glow(x, W / 2, H - lvl * fh - 44, 18, '#a080ff', 0.9);
                A.oval(x, W / 2, H - lvl * fh - 44, 5, 5, '#e0d0ff', 1);
                break;
            }
            case 'tavern':
                block(14, 40, 110, 70, '#b09070'); roofShape(10, 40, 118, 34, '#8a3a1a');
                A.rect(x, 60, 80, 18, 30, '#4a3020', 1.5); window(28, 56, true); window(98, 56, true);
                A.line(x, [[124, 52], [136, 52]], 2, A.INK); A.rect(x, 126, 54, 12, 14, '#c8a040', 1); break;
            case 'market':
                for (let i = 0; i < 3; i++) { const sx = 6 + i * 44; A.rect(x, sx + 2, 50, 38, 40, '#a07850', 1.5); A.poly(x, [[sx - 2, 52], [sx + 21, 34], [sx + 44, 52]], ['#d04040', '#4060d0', '#e0b030'][i], 1.5); A.oval(x, sx + 12, 66, 5, 4, '#f08030', 1); A.oval(x, sx + 26, 66, 5, 4, '#80c040', 1); }
                break;
            case 'silo':
                A.rrect(x, 16, 20, 48, 80, 6, '#c0a070', 2); A.oval(x, 40, 20, 24, 10, '#8a5a2a', 2);
                for (let i = 0; i < 4; i++) A.line(x, [[18, 40 + i * 16], [62, 40 + i * 16]], 1.5, '#8a6a3a'); break;
            case 'blacksmith':
                block(10, 44, 100, 66, '#8a7a6a'); roofShape(6, 44, 108, 26, '#4a4a50');
                A.rect(x, 86, 6, 16, 40, '#6a5a50', 1.5); A.glow(x, 94, 4, 14, '#a0a0a0', 0.5);
                A.glow(x, 44, 92, 18, '#ff6010', 0.8); A.rect(x, 30, 80, 30, 30, '#2a1a10', 1.5);
                A.poly(x, [[100, 104], [130, 104], [126, 96], [104, 96]], '#505058', 1.5); break;
            default: { // dwellings
                const t = +id.slice(1);
                const col = A.shade(wall, 0.9 + (t % 3) * 0.06);
                if (t === 1) { block(30, 60, 100, 70, col); roofShape(26, 60, 108, 40, roof); A.rect(x, 70, 96, 20, 34, '#4a3020', 1.5); window(44, 80, true); window(108, 80, true); }
                if (t === 2) { block(56, 20, 48, 110, col); roofShape(52, 20, 56, 36, roof); window(77, 40, true); window(77, 70, false); block(20, 80, 40, 50, col); block(100, 80, 40, 50, col); }
                if (t === 3) { block(40, 30, 80, 100, col); roofShape(36, 30, 88, 50, roof); window(56, 60, true); window(94, 60, true); A.rect(x, 70, 100, 20, 30, '#3a2a1a', 1.5); }
                if (t === 4) { block(10, 60, 140, 70, col); for (let i = 0; i < 6; i++) A.rect(x, 12 + i * 24, 50, 14, 12, col, 1.5); for (let i = 0; i < 4; i++) window(26 + i * 34, 80, i % 2 === 0); A.rect(x, 68, 100, 24, 30, '#3a2a1a', 1.5); }
                if (t === 5) { block(30, 50, 100, 80, col); for (let i = 0; i < 5; i++) A.rect(x, 32 + i * 22, 50, 8, 80, '#ece4d4', 1.2); roofShape(26, 50, 108, 36, roof); A.glow(x, 80, 30, 14, '#fff0a0', 0.6); }
                if (t === 6) { block(6, 56, 148, 74, col); roofShape(2, 56, 156, 44, roof); x.beginPath(); x.moveTo(60, 130); x.lineTo(60, 100); x.arc(80, 100, 20, Math.PI, 0); x.lineTo(100, 130); x.fillStyle = '#2a1e14'; x.fill(); x.lineWidth = 2; x.strokeStyle = A.INK; x.stroke(); }
                if (t === 7) { A.poly(x, [[10, 200], [30, 90], [70, 40], [120, 30], [160, 70], [182, 200]], A.shade(wall, 0.7), 2); x.beginPath(); x.moveTo(70, 200); x.lineTo(70, 140); x.arc(98, 140, 28, Math.PI, 0); x.lineTo(126, 200); x.fillStyle = '#1a1010'; x.fill(); x.lineWidth = 2; x.strokeStyle = A.INK; x.stroke(); A.glow(x, 98, 150, 30, F.trim, 0.5); }
                if (up) { banner(t === 7 ? 70 : 24, t === 7 ? 60 : 64, trim); banner(t === 7 ? 150 : 136, t === 7 ? 80 : 64, trim); A.line(x, [[20, H - 3], [W - 20, H - 3]], 3, trim); }
                // emblem: tier creature head-on
                break;
            }
        }
        A.light(x, W, H, 0.22);
        return c;
    },
};

class TownScene extends Phaser.Scene {
    constructor() { super('Town'); }
    init(d) { this.townId = d.townId; this.onClose = d.onClose; }
    get t() { return G.objects[this.townId]; }
    create() {
        this.input.mouse.disableContextMenu();
        this._modalDepth = 0; this._modals = 0;
        this.root = this.add.container(0, 0);
        this.build();
        this.input.keyboard.on('keydown', e => { if (e.key === 'Escape' && !UI.anyModal(this)) this.close(); });
    }
    close() {
        const t = this.t, h = Core.heroInTown(t);
        if (h && h.owner === t.owner) Core.learnGuild(h, t);
        this.scene.stop();
        this.onClose && this.onClose();
    }
    status(s) { if (this.statusText) this.statusText.setText(s || ''); }
    build() {
        this.root.removeAll(true);
        this.children.list.filter(o => o !== this.root).forEach(o => o.destroy());
        const t = this.t, F = FACTIONS[t.faction];
        // panorama
        const g = this.add.graphics();
        g.fillGradientStyle(Phaser.Display.Color.HexStringToColor(F.sky[0]).color, Phaser.Display.Color.HexStringToColor(F.sky[0]).color, Phaser.Display.Color.HexStringToColor(F.sky[1]).color, Phaser.Display.Color.HexStringToColor(F.sky[1]).color, 1).fillRect(0, 0, VW, 440);
        const hills = Phaser.Display.Color.HexStringToColor(Art.shade(F.ground, 0.8)).color;
        g.fillStyle(hills, 1);
        g.beginPath(); g.moveTo(0, 240);
        for (let x = 0; x <= VW; x += 32) g.lineTo(x, 220 + Math.sin(x * 0.012 + t.faction.length) * 26 + Math.sin(x * 0.031) * 10);
        g.lineTo(VW, 440); g.lineTo(0, 440); g.closePath(); g.fillPath();
        g.fillStyle(Phaser.Display.Color.HexStringToColor(F.ground).color, 1).fillRect(0, 300, VW, 140);
        // sun / moon
        g.fillStyle(t.faction === 'necropolis' ? 0xd8e0e8 : t.faction === 'inferno' ? 0xff8040 : 0xfff0b0, 0.9).fillCircle(880, 70, 30);
        // a cobbled road through the town and some greenery between the buildings
        g.fillStyle(0x9a8466, 1).fillPoints([{ x: 430, y: 440 }, { x: 594, y: 440 }, { x: 528, y: 298 }, { x: 496, y: 298 }], true);
        g.fillStyle(0xb8a484, 1).fillPoints([{ x: 446, y: 440 }, { x: 578, y: 440 }, { x: 524, y: 300 }, { x: 500, y: 300 }], true);
        const r = Art.rnd(t.x * 31 + t.y);
        for (let i = 0; i < 14; i++) {
            const tx = 30 + r() * 960, ty = 250 + r() * 50;
            this.add.image(tx, ty, `decor_${FACTIONS[t.faction].terrain}_${Math.floor(r() * 6)}`).setOrigin(0.5, 1).setScale(0.9 + r() * 0.4);
        }
        const order = ['walls', 'd7', 'hall', 'mage', 'silo', 'market', 'tavern', 'blacksmith', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];
        for (const id of order) {
            let bid = id, lvl = 1, up = false;
            if (id === 'walls') { if (!t.built.fort) continue; lvl = t.built.castle ? 3 : t.built.citadel ? 2 : 1; bid = t.built.castle ? 'castle' : t.built.citadel ? 'citadel' : 'fort'; }
            else if (id === 'hall') { lvl = t.built.hall4 ? 4 : t.built.hall3 ? 3 : t.built.hall2 ? 2 : 1; bid = 'hall' + lvl; }
            else if (id === 'mage') { lvl = [5, 4, 3, 2, 1].find(l => t.built['mage' + l]) || 0; if (!lvl) continue; bid = 'mage' + lvl; }
            else if (/^d\d$/.test(id)) { if (!t.built[id]) continue; up = !!t.built['u' + id[1]]; }
            else if (!t.built[id]) continue;
            const key = `tb_${t.faction}_${id}_${lvl}_${up ? 1 : 0}`;
            if (!this.textures.exists(key)) Art.add(this, key, TownArt.draw(t.faction, id, lvl, up));
            const [px, py] = TOWN_POS[id];
            const im = this.add.image(px, py, key).setOrigin(0.5, 1);
            if (id !== 'walls') {
                im.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 10 });
                const label = /^d\d$/.test(id) ? buildingName(t.faction, up ? 'u' + id[1] : id) : buildingName(t.faction, bid);
                im.on('pointerover', () => { im.setTint(0xffffd0); this.status(label); });
                im.on('pointerout', () => { im.clearTint(); this.status(''); });
                im.on('pointerup', (p) => { if (p.rightButtonReleased()) return; this.clickBuilding(id); });
                im.on('pointerdown', (p) => { if (!p.rightButtonDown()) return; const pop = UI.popup(this, p.x, p.y - 60, [label, BUILDINGS[up ? 'u' + id[1] : bid].d]); this.input.once('pointerup', () => pop.destroy()); });
            }
        }
        // bottom panel
        UI.panel(this, 0, 440, VW, VH - 440);
        UI.text(this, 16, 452, t.name, 22, UI.GOLDS, { title: true });
        const inc = Core.townIncome(t);
        UI.text(this, 16, 482, `${F.name} · Income ${inc.gold} gold/day${t.builtToday ? ' · Already built today' : ''}`, 14, UI.DIM);
        // garrison & visitor
        const h = Core.heroInTown(t);
        const hero = h && h.owner === t.owner ? h : null;
        UI.text(this, 190, 512, 'Garrison', 14, UI.GOLDS);
        this.add.image(150, 548, 'town_' + t.faction).setDisplaySize(64, 46);
        this.gRow = new ArmyRow(this, 190, 530, t.garrison, { size: 58 });
        UI.text(this, 190, 596, hero ? `Visiting hero: ${hero.name}` : 'No visiting hero', 14, UI.GOLDS);
        const rows = [this.gRow];
        if (hero) {
            const pt = this.add.image(150, 650, Art.portrait(this, hero)).setDisplaySize(58, 64).setInteractive({ useHandCursor: true });
            pt.on('pointerup', () => this.openHero(hero));
            this.hRow = new ArmyRow(this, 190, 614, hero.army, { size: 58 });
            rows.push(this.hRow);
        } else this.hRow = null;
        this.link = new ArmyLink(this, rows, {
            mustKeep: arr => hero && arr === hero.army,
            onChange: () => this.refreshArmies(),
            onSelect: (sel) => this.updateArmyButtons(sel),
            onInfo: (s) => this.stackInfo(s),
        });
        // army buttons
        this.btnSplit = UI.button(this, 190, 684, 100, 30, 'Split', () => { if (this.link.sel) { this.link.splitMode = true; this.status('Click a slot to split into.'); } }, { size: 14 });
        this.btnUpg = UI.button(this, 296, 684, 100, 30, 'Upgrade', () => this.upgradeSel(), { size: 14 });
        this.btnDismiss = UI.button(this, 402, 684, 100, 30, 'Dismiss', () => this.dismissSel(), { size: 14 });
        this.updateArmyButtons(null);
        // service buttons
        const bx = 640, by = 470, bw = 180, bh = 38;
        const sb = (i, l, fn, dis) => UI.button(this, bx + (i % 2) * (bw + 8), by + Math.floor(i / 2) * (bh + 8), bw, bh, l, fn, { disabled: dis, size: 15 });
        sb(0, 'Build (Hall)', () => this.hallScreen());
        sb(1, 'Recruit Creatures', () => this.recruitScreen(), !t.built.fort);
        sb(2, 'Mage Guild', () => this.guildScreen(), !t.built.mage1);
        sb(3, 'Marketplace', () => this.marketScreen(), !t.built.market);
        sb(4, 'Tavern', () => this.tavernScreen(), !t.built.tavern);
        sb(5, 'Blacksmith', () => this.smithScreen(), !t.built.blacksmith);
        sb(6, 'Visiting Hero', () => hero && this.openHero(hero), !hero);
        sb(7, 'Leave Town', () => this.close());
        // resources
        this.resC = this.add.container(0, 0);
        this.statusText = UI.text(this, 830, 452, '', 14, UI.TXT, { origin: [0.5, 0] });
        this.refreshRes();
    }
    refreshRes() {
        this.resC.removeAll(true);
        const p = G.players[this.t.owner];
        RES.forEach((r, i) => {
            const x = 16 + i * 92, y = 736;
            this.resC.add(this.add.image(x + 10, y + 12, 'res_' + r).setScale(0.6));
            this.resC.add(UI.text(this, x + 24, y + 12, fmt(p.res[r]), 13, UI.TXT, { origin: [0, 0.5] }));
        });
        this.resC.add(UI.text(this, 1008, 748, Core.dateStr(), 13, UI.GOLDS, { origin: [1, 0.5] }));
    }
    refreshArmies() { this.gRow.refresh(); this.hRow && this.hRow.refresh(); this.updateArmyButtons(this.link.sel); }
    updateArmyButtons(sel) {
        const s = sel && sel.row.army[sel.i];
        this.btnSplit.setDisabled(!s || s.n < 2);
        this.btnUpg.setDisabled(!s || !Core.canUpgradeIn(this.t, s.cid));
        this.btnDismiss.setDisabled(!s);
    }
    async upgradeSel() {
        const sel = this.link.sel; if (!sel) return;
        const s = sel.row.army[sel.i], p = G.players[this.t.owner];
        const cost = Core.upgradeCost(s.cid, s.n), up = CREATURES[s.cid].upTo;
        const txt = Object.entries(cost).map(([k, v]) => `${fmt(v)} ${k}`).join(', ');
        if (!Core.canAfford(p, cost)) { await UI.msg(this, `Upgrading ${s.n} ${CREATURES[s.cid].name} to ${CREATURES[up].name} costs ${txt}. You cannot afford it.`); return; }
        if (await UI.confirm(this, `Upgrade ${s.n} ${CREATURES[s.cid].name} to ${CREATURES[up].name} for ${txt}?`, { icons: [{ key: Art.creature(this, up), scale: 0.6 }] })) {
            Core.pay(p, cost); s.cid = up; Sfx.play('coin');
            this.link.clear(); this.refreshArmies(); this.refreshRes();
        }
    }
    async dismissSel() {
        const sel = this.link.sel; if (!sel) return;
        const arr = sel.row.army, s = arr[sel.i];
        const hero = Core.heroInTown(this.t);
        if (hero && arr === hero.army && arr.filter(Boolean).length === 1) { await UI.msg(this, 'A hero must keep at least one stack.'); return; }
        if (await UI.confirm(this, `Dismiss ${s.n} ${CREATURES[s.cid].name}?`)) { arr[sel.i] = null; this.link.clear(); this.refreshArmies(); }
    }
    stackInfo(s) {
        const m = UI.modal(this, 320, 380, { title: CREATURES[s.cid].name });
        m.add(this.add.image(160, 140, Art.creature(this, s.cid)).setOrigin(0.5, 1).setScale(0.75));
        m.add(UI.text(this, 24, 150, UI.creatureInfo(this, s.cid, s.n).slice(1).join('\n'), 14, UI.TXT, { wrap: 280 }));
        m.add(UI.button(this, 105, 336, 110, 32, 'Close', () => m.close()));
    }
    openHero(h) {
        this.scene.pause();
        this.scene.launch('HeroScreen', { heroId: h.id, town: this.t.id, onClose: () => { this.scene.resume(); this.build(); } });
    }
    clickBuilding(id) {
        if (id === 'hall') this.hallScreen();
        else if (/^d\d$/.test(id)) this.recruitScreen(+id[1]);
        else if (id === 'mage') this.guildScreen();
        else if (id === 'tavern') this.tavernScreen();
        else if (id === 'market' || id === 'silo') this.marketScreen();
        else if (id === 'blacksmith') this.smithScreen();
    }

    // ---------------- build ----------------
    hallScreen() {
        const t = this.t;
        const m = UI.modal(this, 980, 660, { title: `Build in ${t.name}`, dim: 0.7 });
        const ids = ['hall2', 'hall3', 'hall4', 'fort', 'citadel', 'castle', 'tavern', 'market', 'silo', 'blacksmith', 'mage1', 'mage2', 'mage3', 'mage4', 'mage5',
            'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];
        // show only the next step of each upgrade chain
        const visible = ids.filter(id => {
            if (Core.buildState(t, id) === 'na') return false;
            if (/^hall[34]$/.test(id) && !t.built['hall' + (+id[4] - 1)]) return false;
            if (id === 'castle' && !t.built.citadel) return false;
            if (id === 'citadel' && !t.built.fort) return false;
            if (/^mage[2-5]$/.test(id) && !t.built['mage' + (+id[4] - 1)]) return false;
            if (/^u\d$/.test(id) && !t.built['d' + id[1]]) return false;
            if (id === 'hall2' && t.built.hall3) return false;
            if (id === 'hall3' && t.built.hall4) return false;
            if (id === 'fort' && t.built.citadel) return false;
            if (id === 'citadel' && t.built.castle) return false;
            if (/^mage[1-4]$/.test(id) && t.built['mage' + (+id[4] + 1)]) return false;
            return true;
        });
        const cols = 6, cw = 154, chh = 130;
        visible.forEach((id, i) => {
            const st = Core.buildState(t, id);
            const x = 20 + (i % cols) * (cw + 4), y = 50 + Math.floor(i / cols) * (chh + 6);
            const col = { built: 0xd8b040, ok: 0x30c030, res: 0xd03030, req: 0x606060, today: 0x4070d0 }[st];
            const bg = this.add.rectangle(x, y, cw, chh, 0x140c06, 0.9).setOrigin(0).setStrokeStyle(2, col);
            m.add(bg);
            let lid = id, lvl = 1, up = false;
            if (id.startsWith('hall')) { lid = 'hall'; lvl = +id[4]; }
            else if (id.startsWith('mage')) { lid = 'mage'; lvl = +id[4]; }
            else if (['fort', 'citadel', 'castle'].includes(id)) { lid = 'hall'; lvl = 2; }
            else if (/^u\d$/.test(id)) { lid = 'd' + id[1]; up = true; }
            const key = ['fort', 'citadel', 'castle'].includes(id) ? null : `tb_${t.faction}_${lid}_${lvl}_${up ? 1 : 0}`;
            if (key && !this.textures.exists(key)) Art.add(this, key, TownArt.draw(t.faction, lid, lvl, up));
            if (key) { const im = this.add.image(x + cw / 2, y + 96, key).setOrigin(0.5, 1); im.setScale(Math.min(1, 130 / im.width, 84 / im.height)); m.add(im); }
            else { const im = this.add.image(x + cw / 2, y + 92, 'town_' + t.faction).setOrigin(0.5, 1).setScale(0.6); m.add(im); }
            m.add(UI.text(this, x + cw / 2, y + 100, buildingName(t.faction, id), 13, st === 'built' ? '#f0d060' : UI.TXT, { origin: [0.5, 0], wrap: cw - 6, align: 'center' }));
            const z = this.add.zone(x, y, cw, chh).setOrigin(0).setInteractive({ useHandCursor: true });
            z.on('pointerup', () => this.buildDetail(id, () => { m.close(); this.build(); }));
            m.add(z);
        });
        m.add(UI.text(this, 20, 632, 'Green: can build · Red: not enough resources · Grey: requirements missing · Blue: already built today · Gold: built', 13, UI.DIM));
        m.add(UI.button(this, 850, 620, 110, 32, 'Close', () => m.close()));
    }
    async buildDetail(id, after) {
        const t = this.t, st = Core.buildState(t, id), b = BUILDINGS[id];
        const cost = buildingCost(t.faction, id);
        const missing = b.req.filter(r => !t.built[r]).map(r => buildingName(t.faction, r));
        let desc = b.d;
        if (b.tier) { const cid = FACTION_UNITS[t.faction][b.tier - 1][b.up ? 1 : 0]; const c = CREATURES[cid]; desc = `${b.up ? 'Upgrades' : 'Allows recruiting'} ${c.name} (growth ${c.grow}/week).`; }
        const lines = [desc, ''];
        if (st === 'built') lines.push('Already built.');
        else {
            lines.push('Cost: ' + Object.entries(cost).map(([k, v]) => `${fmt(v)} ${RES_NAME[k]}`).join(', '));
            if (missing.length) lines.push('Requires: ' + missing.join(', '));
            if (st === 'today') lines.push('You have already built in this town today.');
            if (st === 'res') lines.push('Not enough resources.');
        }
        const icons = [];
        if (b.tier) icons.push({ key: Art.creature(this, FACTION_UNITS[t.faction][b.tier - 1][b.up ? 1 : 0]), scale: 0.55 });
        if (st === 'ok') {
            if (await UI.confirm(this, lines.join('\n'), { title: buildingName(t.faction, id), icons, yes: 'Build', no: 'Cancel' })) {
                Core.build(t, id); Sfx.play('build');
                after();
            }
        } else await UI.msg(this, lines.join('\n'), { title: buildingName(t.faction, id), icons });
    }

    // ---------------- recruit ----------------
    recruitScreen(only) {
        const t = this.t, p = G.players[t.owner];
        const m = UI.modal(this, 900, 520, { title: 'Recruit Creatures', dim: 0.7 });
        const tiers = [1, 2, 3, 4, 5, 6, 7].filter(i => t.built['d' + i]);
        if (!tiers.length) m.add(UI.text(this, 450, 200, 'Build creature dwellings first (requires a Fort).', 16, UI.TXT, { origin: 0.5 }));
        tiers.forEach((tier, i) => {
            const x = 20 + (i % 4) * 216, y = 50 + Math.floor(i / 4) * 220;
            const cid = Core.townRecruitCid(t, tier), c = CREATURES[cid];
            const bg = this.add.rectangle(x, y, 208, 210, 0x140c06, 0.9).setOrigin(0).setStrokeStyle(2, only === tier ? 0xffe060 : 0x8a6a30);
            m.add(bg);
            m.add(UI.text(this, x + 104, y + 6, c.name, 16, UI.GOLDS, { origin: [0.5, 0] }));
            const im = this.add.image(x + 104, y + 140, Art.creature(this, cid)).setOrigin(0.5, 1).setScale(0.75);
            m.add(im);
            m.add(UI.text(this, x + 10, y + 146, `Available: ${t.avail[tier - 1]}`, 14, UI.TXT));
            m.add(UI.text(this, x + 10, y + 164, `Cost: ${c.cost}g${c.extra ? ' +' + Object.entries(c.extra).map(([k, v]) => v + ' ' + k).join(' ') : ''}`, 13, UI.DIM));
            m.add(UI.text(this, x + 10, y + 182, `Growth: ${Core.growth(t, tier)}/week`, 13, UI.DIM));
            const z = this.add.zone(x, y, 208, 210).setOrigin(0).setInteractive({ useHandCursor: true });
            z.on('pointerup', async (pp) => {
                if (pp.rightButtonReleased()) return;
                const max = Core.maxAfford(p, cid, t.avail[tier - 1]);
                if (t.avail[tier - 1] <= 0) { await UI.msg(this, `No ${c.name} are available this week.`); return; }
                if (max <= 0) { await UI.msg(this, `You cannot afford any ${c.name}.`); return; }
                const n = await UI.amount(this, `Recruit ${c.name}`, max, { render: v => `Recruit ${v} ${c.name}\nCost: ${fmt(v * c.cost)} gold${c.extra ? ' + ' + Object.entries(c.extra).map(([k, x]) => x * v + ' ' + k).join(', ') : ''}`, ok: 'Recruit' });
                if (n > 0) {
                    if (!Core.recruit(p, t, tier, n, cid)) await UI.msg(this, 'There is no room in the garrison or the visiting hero\'s army.');
                    else Sfx.play('coin');
                    m.close(); this.build(); this.recruitScreen(only);
                }
            });
            z.on('pointerdown', (pp) => { if (!pp.rightButtonDown()) return; const pop = UI.popup(this, pp.x, pp.y - 120, UI.creatureInfo(this, cid)); this.input.once('pointerup', () => pop.destroy()); });
            m.add(z);
        });
        m.add(UI.button(this, 300, 474, 140, 34, 'Recruit All', () => {
            let any = false;
            for (let tier = 7; tier >= 1; tier--) { if (!t.built['d' + tier]) continue; const cid = Core.townRecruitCid(t, tier); const n = Core.maxAfford(p, cid, t.avail[tier - 1]); if (n > 0 && Core.recruit(p, t, tier, n, cid)) any = true; }
            if (any) Sfx.play('coin');
            m.close(); this.build();
        }));
        m.add(UI.button(this, 460, 474, 140, 34, 'Close', () => m.close()));
    }

    // ---------------- mage guild ----------------
    guildScreen() {
        const t = this.t;
        const m = UI.modal(this, 700, 560, { title: 'Mage Guild', dim: 0.7 });
        for (let l = 1; l <= 5; l++) {
            const y = 50 + (5 - l) * 96;
            m.add(UI.text(this, 24, y + 30, `Level ${l}`, 16, t.built['mage' + l] ? UI.GOLDS : UI.DIM, { title: true }));
            if (l > MAGE_LEVELS[t.faction]) { m.add(UI.text(this, 140, y + 30, '(not available to this town)', 14, UI.DIM)); continue; }
            if (!t.built['mage' + l]) { m.add(UI.text(this, 140, y + 30, '(not built)', 14, UI.DIM)); continue; }
            t.guild[l - 1].forEach((s, i) => {
                const x = 140 + i * 180;
                const im = this.add.image(x + 24, y + 40, Art.spell(this, s)).setInteractive({ useHandCursor: true });
                im.on('pointerdown', (p) => { const pop = UI.popup(this, p.x, p.y - 80, [SPELLS[s].name, `Level ${SPELLS[s].lvl}, cost ${SPELLS[s].cost}`, spellDesc(s, null)]); this.input.once('pointerup', () => pop.destroy()); });
                m.add(im);
                m.add(UI.text(this, x + 54, y + 30, SPELLS[s].name, 14, UI.TXT, { wrap: 120 }));
            });
        }
        m.add(UI.text(this, 24, 516, 'Visiting heroes learn these spells (level 3+ requires Wisdom).', 13, UI.DIM));
        m.add(UI.button(this, 570, 512, 110, 34, 'Close', () => m.close()));
    }

    // ---------------- market ----------------
    marketScreen() {
        const p = G.players[this.t.owner];
        const m = UI.modal(this, 640, 440, { title: 'Marketplace', dim: 0.7 });
        m.add(UI.text(this, 320, 46, `Markets owned: ${Core.marketCount(p)} (more markets give better rates)`, 14, UI.DIM, { origin: [0.5, 0] }));
        const rs = RES.filter(r => r !== 'gold');
        rs.forEach((r, i) => {
            const y = 80 + i * 52;
            m.add(this.add.image(40, y + 18, 'res_' + r));
            m.add(UI.text(this, 70, y + 8, `${RES_NAME[r]}: ${p.res[r]}`, 15, UI.TXT));
            const buy = Core.buyPrice(p, r), sell = Core.sellPrice(p, r);
            m.add(UI.button(this, 240, y + 2, 170, 32, `Buy 1 for ${buy}g`, async () => {
                const max = Math.floor(p.res.gold / buy);
                if (max <= 0) return;
                const n = await UI.amount(this, `Buy ${RES_NAME[r]}`, max, { start: 1, render: v => `Buy ${v} ${RES_NAME[r]} for ${fmt(v * buy)} gold`, ok: 'Buy' });
                if (n > 0) { p.res.gold -= n * buy; p.res[r] += n; Sfx.play('coin'); }
                m.close(); this.refreshRes(); this.marketScreen();
            }, { size: 13, disabled: p.res.gold < buy }));
            m.add(UI.button(this, 420, y + 2, 170, 32, `Sell 1 for ${sell}g`, async () => {
                const n = await UI.amount(this, `Sell ${RES_NAME[r]}`, p.res[r], { start: 1, render: v => `Sell ${v} ${RES_NAME[r]} for ${fmt(v * sell)} gold`, ok: 'Sell' });
                if (n > 0) { p.res.gold += n * sell; p.res[r] -= n; Sfx.play('coin'); }
                m.close(); this.refreshRes(); this.marketScreen();
            }, { size: 13, disabled: p.res[r] <= 0 }));
        });
        m.add(UI.text(this, 24, 402, `Gold: ${fmt(p.res.gold)}`, 15, UI.GOLDS));
        m.add(UI.button(this, 510, 396, 110, 32, 'Close', () => m.close()));
    }

    // ---------------- tavern ----------------
    tavernScreen() {
        const t = this.t, p = G.players[t.owner];
        const m = UI.modal(this, 640, 430, { title: 'Tavern', dim: 0.7 });
        const occupied = !!Core.heroAt(t.x, t.y);
        const offers = (p.tavern || []).filter(tpl => !G.heroTpl[tpl].used).map(tpl => ({ tpl })).concat((p.retreat || []).map(h => ({ inst: h })));
        if (!offers.length) m.add(UI.text(this, 320, 160, 'No heroes are available for hire this week.', 15, UI.TXT, { origin: 0.5 }));
        offers.slice(0, 4).forEach((o, i) => {
            const x = 20 + i * 152;
            const name = o.tpl ? G.heroTpl[o.tpl].name : o.inst.name, cls = o.tpl ? G.heroTpl[o.tpl].cls : o.inst.cls;
            const key = o.tpl ? Art.portraitTpl(this, o.tpl) : Art.portrait(this, o.inst);
            m.add(this.add.image(x + 70, 110, key).setScale(1.3));
            m.add(UI.text(this, x + 70, 156, name, 15, UI.GOLDS, { origin: [0.5, 0] }));
            m.add(UI.text(this, x + 70, 176, `${o.inst ? 'Level ' + o.inst.lvl + ' ' : ''}${CLASSES[cls].name}`, 13, UI.TXT, { origin: [0.5, 0] }));
            m.add(UI.text(this, x + 70, 194, `${FACTIONS[CLASSES[cls].faction].name}${o.inst ? ' (returning)' : ''}`, 12, UI.DIM, { origin: [0.5, 0] }));
            m.add(UI.button(this, x + 15, 230, 110, 34, 'Hire', () => {
                if (occupied) { UI.msg(this, 'A hero is already visiting this town. Move them out first.'); return; }
                if (p.heroes.length >= 8) { UI.msg(this, 'You cannot command more than 8 heroes.'); return; }
                if (p.res.gold < 2500) { UI.msg(this, 'You need 2500 gold to hire a hero.'); return; }
                let h;
                if (o.tpl) h = Core.hireHero(p, t, o.tpl);
                else {
                    h = o.inst; p.res.gold -= 2500; p.retreat = p.retreat.filter(x => x !== h);
                    if (!h.army.some(Boolean)) h.army[0] = { cid: FACTION_UNITS[h.faction][0][0], n: 10 };
                    h.x = t.x; h.y = t.y; h.mp = Core.maxMove(h); h.owner = p.id;
                    G.heroes[h.id] = h; p.heroes.push(h.id);
                    Core.learnGuild(h, t);
                }
                if (h) { Sfx.play('coin'); m.close(); this.build(); }
            }, { disabled: occupied || p.res.gold < 2500 }));
        });
        const rumors = ['They say the dragons in the mountains guard great treasure.', 'A wise traveller always visits the windmills on Monday.', 'Rumor has it the neutral towns pay well in gold to whoever holds them.', 'Heroes who drink from a magic well regain their spell points.', 'Some say a Tree of Knowledge grows somewhere on this land.', 'The Arena makes a hero stronger, if they survive its guards.'];
        m.add(UI.text(this, 320, 300, `"${rumors[(G.day + t.x) % rumors.length]}"`, 14, UI.DIM, { origin: [0.5, 0], wrap: 580, align: 'center' }));
        m.add(UI.text(this, 320, 344, 'Hiring costs 2500 gold. New heroes appear every week.', 13, UI.TXT, { origin: [0.5, 0] }));
        m.add(UI.button(this, 265, 384, 110, 32, 'Close', () => m.close()));
    }

    // ---------------- blacksmith ----------------
    smithScreen() {
        const t = this.t, p = G.players[t.owner], h = Core.heroInTown(t);
        const m = UI.modal(this, 560, 330, { title: 'Blacksmith', dim: 0.7 });
        if (!h) m.add(UI.text(this, 280, 50, 'A hero must visit the town to buy war machines.', 14, UI.DIM, { origin: [0.5, 0] }));
        Object.entries(WAR_MACHINES).forEach(([k, w], i) => {
            const x = 40 + i * 250;
            m.add(this.add.image(x + 100, 170, Art.creature(this, k)).setOrigin(0.5, 1).setScale(0.8));
            m.add(UI.text(this, x + 100, 176, `${w.name} — ${w.cost} gold`, 15, UI.GOLDS, { origin: [0.5, 0] }));
            m.add(UI.text(this, x + 100, 198, w.d, 13, UI.TXT, { origin: [0.5, 0], wrap: 220, align: 'center' }));
            const owned = h && h.machines[k];
            m.add(UI.button(this, x + 45, 236, 110, 32, owned ? 'Owned' : 'Buy', () => {
                if (p.res.gold < w.cost) { UI.msg(this, 'Not enough gold.'); return; }
                p.res.gold -= w.cost; h.machines[k] = 1; Sfx.play('coin'); m.close(); this.refreshRes(); this.smithScreen();
            }, { disabled: !h || owned || p.res.gold < w.cost }));
        });
        m.add(UI.button(this, 225, 284, 110, 32, 'Close', () => m.close()));
    }
}

function spellDesc(sid, h) {
    const sp = SPELLS[sid];
    let pw = h ? Core.stat(h, 'pow') : 1;
    const amt = sp.base !== undefined ? Math.round((sp.base + sp.per * pw) * (1 + (h ? Core.skillVal(h, 'sorcery') + Core.artBonus(h, 'spell') : 0) / 100)) : 0;
    return sp.d.replace('{dmg}', h ? String(amt) : `${sp.base}+${sp.per}×Power`);
}
