// Tactical battle screen: hex battlefield, unit sprites, animations and the player's controls.
const HW = 52, HR = HW / Math.sqrt(3), RH = HR * 1.5;
const BOX = (VW - (Hex.COLS * HW + HW / 2)) / 2 + HW / 2, BOY = 104;

function hexCenter(r, c) { return [BOX + c * HW + (r & 1 ? HW / 2 : 0), BOY + r * RH]; }
function hexPoints(cx, cy, k = 1) {
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 90); pts.push({ x: cx + Math.cos(a) * HR * k, y: cy + Math.sin(a) * HR * k }); }
    return pts;
}
function pixelToHex(px, py) {
    let best = null, bd = Infinity;
    for (let r = 0; r < Hex.ROWS; r++) for (let c = 0; c < Hex.COLS; c++) {
        const [x, y] = hexCenter(r, c); const d = (x - px) ** 2 + (y - py) ** 2;
        if (d < bd) { bd = d; best = [r, c]; }
    }
    return bd < HR * HR * 1.1 ? best : null;
}

class CombatScene extends Phaser.Scene {
    constructor() { super('Combat'); }
    init(d) { this.cfg = d.cfg; this.onEnd = d.onEnd; }
    create() {
        this.input.mouse.disableContextMenu();
        this._modalDepth = 0; this._modals = 0;
        this.b = new Battle(this.cfg);
        this.sprites = {};
        this.auto = false;
        this.humanSide = this.cfg.sides.findIndex(s => s.human);
        this.drawField();
        this.drawUI();
        this.hl = this.add.graphics().setDepth(5);
        this.hov = this.add.graphics().setDepth(6);
        for (const u of this.b.units) this.makeUnitSprite(u);
        this.setupInput();
        this.logLines = [];
        this.log(this.cfg.title ? `${this.cfg.title} begins!` : 'Battle begins!');
        this.cameras.main.fadeIn(300);
        this.time.delayedCall(350, () => this.loop());
    }

    // ---------------- drawing ----------------
    drawField() {
        const key = 'bf_' + (this.cfg.terrain || 1) + (this.b.siege ? '_s' : '');
        if (!this.textures.exists(key)) {
            const [c, x] = Art.canvas(VW, 600);
            const t = this.cfg.terrain || T.GRASS;
            const pat = x.createPattern(Art.terrainPattern(t === T.WATER ? T.SAND : t), 'repeat');
            x.save(); x.scale(1.5, 1.5); x.fillStyle = pat; x.fillRect(0, 0, VW, 600); x.restore();
            const sky = x.createLinearGradient(0, 0, 0, 90);
            sky.addColorStop(0, '#203050'); sky.addColorStop(1, 'rgba(32,48,80,0)');
            x.fillStyle = sky; x.fillRect(0, 0, VW, 90);
            const vg = x.createRadialGradient(VW / 2, 330, 200, VW / 2, 330, 640);
            vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
            x.fillStyle = vg; x.fillRect(0, 0, VW, 600);
            const r = Art.rnd(t * 99);
            for (let i = 0; i < 14; i++) {
                const px = r() * VW, py = r() < 0.5 ? 30 + r() * 40 : 560 + r() * 30;
                x.globalAlpha = 0.9;
                const src = this.textures.get(`decor_${Math.max(1, t)}_${i % 6}`).getSourceImage();
                x.drawImage(src, px - 24, py - 50);
                x.globalAlpha = 1;
            }
            Art.add(this, key, c);
        }
        this.add.image(0, 0, key).setOrigin(0);
        const g = this.add.graphics().setDepth(1);
        g.lineStyle(1, 0x000000, 0.25);
        for (let r = 0; r < Hex.ROWS; r++) for (let c = 0; c < Hex.COLS; c++) {
            const [cx, cy] = hexCenter(r, c);
            g.strokePoints(hexPoints(cx, cy, 0.98), true);
        }
        // obstacles
        const tt = Math.max(1, this.cfg.terrain || 1);
        for (const k of this.b.obstacles) {
            const [r, c] = Hex.rc(k), [cx, cy] = hexCenter(r, c);
            this.add.image(cx, cy + 16, `decor_${tt}_${(r * 3 + c) % 6}`).setOrigin(0.5, 1).setDepth(10 + r * 10).setScale(1.25);
        }
        // siege walls
        this.wallSprites = {};
        if (this.b.walls) {
            const wallTex = 'siegewall';
            if (!this.textures.exists(wallTex)) {
                const [c, x] = Art.canvas(56, 80);
                Art.rect(x, 4, 20, 48, 60, '#a8a090', 2);
                for (let i = 0; i < 3; i++) Art.rect(x, 4 + i * 17, 10, 12, 12, '#a8a090', 1.5);
                for (let i = 0; i < 4; i++) Art.line(x, [[6, 34 + i * 12], [50, 34 + i * 12]], 1, '#7a7468');
                Art.light(x, 56, 80, 0.3);
                Art.add(this, wallTex, c);
                const [c2, x2] = Art.canvas(56, 80);
                Art.rect(x2, 4, 20, 48, 60, '#8a7a60', 2);
                x2.beginPath(); x2.moveTo(10, 80); x2.lineTo(10, 46); x2.arc(28, 46, 18, Math.PI, 0); x2.lineTo(46, 80); x2.fillStyle = '#5a3a1a'; x2.fill(); x2.lineWidth = 2; x2.strokeStyle = '#1a120c'; x2.stroke();
                for (let i = 0; i < 4; i++) Art.line(x2, [[16 + i * 8, 40], [16 + i * 8, 80]], 1.5, '#3a2a10');
                Art.add(this, 'siegegate', c2);
                const [c3, x3] = Art.canvas(56, 40);
                for (let i = 0; i < 7; i++) Art.oval(x3, 8 + (i * 13) % 42, 26 + (i % 3) * 4, 8, 6, '#8a8478', 1.5);
                Art.add(this, 'rubble', c3);
            }
            for (const sec of [...this.b.walls.sections, this.b.walls.gate]) {
                for (const k of sec.keys) {
                    const [r, c] = Hex.rc(k), [cx, cy] = hexCenter(r, c);
                    const im = this.add.image(cx, cy + 22, sec === this.b.walls.gate ? 'siegegate' : 'siegewall').setOrigin(0.5, 1).setDepth(10 + r * 10);
                    this.wallSprites[k] = im;
                }
            }
            // towers drawn at the right edge
            this.towerSprites = [];
            const tpos = [[985, 330], [990, 160], [990, 510]];
            this.b.units.filter(u => u.struct).forEach((u, i) => {
                const [x, y] = tpos[i];
                const im = this.add.image(x, y + 50, Art.creature(this, 'tower')).setOrigin(0.5, 1).setDepth(10 + y / 4).setScale(0.8);
                this.sprites[u.id] = { im, struct: true, x, y: y - 20 };
            });
        }
    }
    drawUI() {
        UI.panel(this, 0, 600, VW, VH - 600).setDepth(2000);
        // heroes
        this.heroInfo = [];
        this.cfg.sides.forEach((s, i) => {
            const x = i === 0 ? 8 : VW - 8;
            if (s.hero) {
                const im = this.add.image(x, 8, Art.portrait(this, s.hero)).setOrigin(i === 0 ? 0 : 1, 0).setDepth(2001).setInteractive({ useHandCursor: true });
                im.on('pointerdown', (p) => {
                    const h = s.hero; const lines = [h.name, `Level ${h.lvl} ${CLASSES[h.cls].name}`, `Attack ${Core.stat(h, 'att')}  Defense ${Core.stat(h, 'def')}`, `Power ${Core.stat(h, 'pow')}  Knowledge ${Core.stat(h, 'know')}`, `Spell points: ${Math.round(this.b.sides[i].mana)}`, `Morale ${Core.morale(h, s.army)}  Luck ${Core.luck(h)}`];
                    const pop = UI.popup(this, p.x - (i ? 260 : 0), p.y + 10, lines); pop.setDepth(9000); this.input.once('pointerup', () => pop.destroy());
                });
            }
            const name = s.hero ? s.hero.name : s.owner >= 0 ? 'Garrison' : 'Neutral';
            const col = s.owner >= 0 ? PLAYER_COLORS[G.players[s.owner].color].css : '#c0c0c0';
            const t = UI.text(this, x + (i === 0 ? 66 : -66), 10, name, 16, col, { origin: [i, 0] }).setDepth(2001);
            const mt = UI.text(this, x + (i === 0 ? 66 : -66), 32, '', 13, '#a0c0ff', { origin: [i, 0] }).setDepth(2001);
            this.heroInfo.push(mt);
        });
        this.roundText = UI.text(this, VW / 2, 12, '', 18, UI.GOLDS, { origin: [0.5, 0], title: true }).setDepth(2001);
        // queue
        this.queueC = this.add.container(0, 0).setDepth(2002);
        // log
        this.logText = UI.text(this, 260, 666, '', 14, UI.TXT, { lineSpacing: 2 }).setDepth(2002);
        this.statusText = UI.text(this, VW / 2, 578, '', 16, '#ffffff', { origin: 0.5, stroke: 4 }).setDepth(2003);
        // buttons
        const bw = 112, bh = 32;
        const mk = (x, y, l, fn, tip) => UI.button(this, x, y, bw, bh, l, fn, { size: 14, tip }).setDepth(2003);
        this.btnSurr = mk(12, 668, 'Surrender', () => this.surrender(), 'Pay gold to leave the battle keeping your army');
        this.btnFlee = mk(12, 706, 'Retreat', () => this.retreat(), 'Flee; your hero survives but the army is lost');
        this.btnAuto = mk(132, 668, 'Auto', () => this.toggleAuto(), 'Let the computer fight for you (A)');
        this.btnOpt = mk(132, 706, 'Log', () => this.fullLog(), 'Show the full combat log');
        this.btnSpell = mk(VW - 248, 668, 'Spell (C)', () => this.spellbook(), 'Cast a spell with your hero');
        this.btnWait = mk(VW - 124, 668, 'Wait (W)', () => this.humanAct({ type: 'wait' }), 'Act later this round');
        this.btnDef = mk(VW - 124, 706, 'Defend (D)', () => this.humanAct({ type: 'defend' }), 'Skip the turn and gain +20% defense');
        this.btnSkip = mk(VW - 248, 706, 'Info', () => this.activeInfo(), 'Details of the active stack');
        this.setControls(false);
    }
    makeUnitSprite(u) {
        if (u.struct) return;
        const [x, y] = this.unitPos(u);
        const im = this.add.image(x, y, Art.creature(this, u.cid)).setOrigin(0.5, 134 / 140).setScale(this.b.def(u).large ? 0.66 : 0.6);
        if (u.side === 1) im.setFlipX(true);
        const col = u.side === 0 ? 0x2a4ab0 : 0x8a2a2a;
        const bx = x + (u.side === 0 ? 22 : -22), by = y - 6;
        const box = this.add.rectangle(bx, by, 34, 15, col).setStrokeStyle(1, 0xf0e0a0);
        const txt = UI.text(this, bx, by, String(u.n), 12, '#ffffff', { origin: 0.5, stroke: 2 });
        this.sprites[u.id] = { im, box, txt };
        this.placeUnit(u);
    }
    unitPos(u) {
        const cells = this.b.cells(u);
        let x = 0, y = 0;
        for (const [r, c] of cells) { const [cx, cy] = hexCenter(r, c); x += cx; y += cy; }
        return [x / cells.length, y / cells.length + 18];
    }
    placeUnit(u) {
        const s = this.sprites[u.id]; if (!s || s.struct) return;
        const [x, y] = this.unitPos(u);
        s.im.setPosition(x, y).setDepth(10 + u.r * 10 + 5);
        this.placeBox(u, x, y);
    }
    placeBox(u, x, y) {
        const s = this.sprites[u.id];
        const bx = x + (u.side === 0 ? 20 : -20) + (this.b.def(u).large ? (u.side === 0 ? 0 : 0) : 0), by = y - 4;
        s.box.setPosition(bx, by).setDepth(10 + u.r * 10 + 6).setVisible(u.n > 0);
        s.txt.setPosition(bx, by).setDepth(10 + u.r * 10 + 7).setText(fmt(u.n)).setVisible(u.n > 0);
        const good = Object.keys(u.eff).some(e => EFFECTS[e].good), bad = Object.keys(u.eff).some(e => !EFFECTS[e].good);
        s.box.setStrokeStyle(good && bad ? 2 : 1, good && bad ? 0xffff60 : good ? 0x60ff60 : bad ? 0xff6060 : 0xf0e0a0);
    }

    // ---------------- loop ----------------
    controlled(u) { return u.side === this.humanSide && !this.auto && !u.machine; }
    async loop() {
        try { await this.battleLoop(); }
        catch (e) {
            // never leave the player stuck in a broken battle: resolve the rest automatically
            console.error('combat error', e);
            if (!this.b.over) { const sim = this.b; for (let g = 0; g < 3000 && !sim.over; g++) { try { sim.act(CombatAI.choose(sim, sim.active)); } catch (e2) { sim.finish(1); } } }
            this.clearHL(); this.setControls(false);
            this.showResult();
        }
    }
    async battleLoop() {
        await this.animate(this.b.start());
        while (!this.b.over) {
            const u = this.b.active;
            if (!u) break;
            this.refreshInfo();
            if (this.controlled(u)) {
                const action = await this.waitInput(u);
                if (!action) continue;
                if (action.type === 'cast') { await this.animate(this.b.cast(u.side, action.sid, action.target)); continue; }
                if (action.type === 'flee') { this.b.flee(u.side, action.surrender); break; }
                await this.animate(this.b.act(action));
            } else {
                this.setControls(false);
                this.status(u.side === this.humanSide ? '' : `Enemy turn: ${this.b.uname(u)}`);
                const aiSide = u.side !== this.humanSide || this.auto;
                if (aiSide) {
                    const sp = CombatAI.heroSpell(this.b, u.side);
                    if (sp) { await this.animate(this.b.cast(u.side, sp.sid, sp.target)); if (this.b.over) break; if (this.b.active !== u) continue; }
                }
                await this.delay(this.auto ? 60 : 220);
                await this.animate(this.b.act(CombatAI.choose(this.b, u)));
            }
        }
        this.clearHL();
        this.setControls(false);
        await this.delay(400);
        this.showResult();
    }
    delay(ms) { return new Promise(r => this.time.delayedCall(ms, r)); }
    waitInput(u) {
        return new Promise(res => {
            this.inputRes = res;
            this.reach = this.b.reach(u);
            this.setControls(true);
            this.drawHL();
            Sfx.play('turn');
            this.status(`${this.b.uname(u)} — your turn`);
        });
    }
    humanAct(a) {
        if (!this.inputRes) return;
        const u = this.b.active;
        if (a.type === 'wait' && u.waited) { this.status('This stack has already waited.'); return; }
        const r = this.inputRes; this.inputRes = null;
        this.setControls(false); this.clearHL();
        r(a);
    }
    setControls(on) {
        const hasHero = this.humanSide >= 0 && this.cfg.sides[this.humanSide].hero;
        const siegeDef = this.b.siege && this.humanSide === 1;
        this.btnWait.setDisabled(!on || (this.b.active && this.b.active.waited));
        this.btnDef.setDisabled(!on);
        this.btnSpell.setDisabled(!on || !hasHero || !this.b.canCast(this.humanSide));
        this.btnFlee.setDisabled(!on || !hasHero || siegeDef);
        this.btnSurr.setDisabled(!on || !hasHero || this.cfg.sides[1 - this.humanSide].owner < 0);
        this.btnSkip.setDisabled(!on);
    }
    toggleAuto() {
        this.auto = !this.auto;
        this.btnAuto.setLabel(this.auto ? 'Manual' : 'Auto');
        if (this.auto && this.inputRes) { const r = this.inputRes; this.inputRes = null; this.clearHL(); r(null); }
    }

    // ---------------- input ----------------
    setupInput() {
        this.input.on('pointermove', p => this.hover(p));
        this.input.on('pointerdown', (p, over) => {
            if (over.length || UI.anyModal(this)) return;
            const h = pixelToHex(p.x, p.y);
            if (p.rightButtonDown()) { this.rightInfo(p, h); return; }
            this.click(p, h);
        });
        this.input.keyboard.on('keydown', e => {
            if (UI.anyModal(this)) return;
            const k = e.key.toLowerCase();
            if (k === 'w') this.humanAct({ type: 'wait' });
            else if (k === 'd' || k === ' ') this.humanAct({ type: 'defend' });
            else if (k === 'c') this.spellbook();
            else if (k === 'a') this.toggleAuto();
            else if (k === 'escape' && this.targeting) this.cancelTarget();
        });
    }
    clearHL() { this.hl.clear(); this.hov.clear(); }
    drawHL() {
        this.hl.clear();
        const u = this.b.active; if (!u || !this.reach) return;
        if (!this.targeting) {
            this.hl.fillStyle(0x000000, 0.22);
            for (const [k] of this.reach) {
                const [r, c] = Hex.rc(k);
                for (const [cr, cc] of this.b.cellsAt(u, r, c)) { const [x, y] = hexCenter(cr, cc); this.hl.fillPoints(hexPoints(x, y, 0.92), true); }
            }
        }
        this.hl.lineStyle(2, 0xffe060, 1);
        for (const [r, c] of this.b.cells(u)) { const [x, y] = hexCenter(r, c); this.hl.strokePoints(hexPoints(x, y, 0.92), true); }
    }
    hover(p) {
        this.hov.clear();
        if (!this.inputRes || UI.anyModal(this)) return;
        const h = pixelToHex(p.x, p.y);
        if (!h) { this.status(''); this.input.setDefaultCursor('default'); return; }
        const act = this.actionAt(p, h);
        this.input.setDefaultCursor(act ? (act.type === 'shoot' ? 'crosshair' : act.type === 'melee' ? 'pointer' : act.type === 'move' ? 'pointer' : 'help') : 'not-allowed');
        if (!act) { const o = this.b.unitAt(h[0], h[1]); this.status(o ? `${o.n} ${this.b.def(o).name}` : ''); return; }
        this.status(act.desc);
        const draw = (r, c, col) => { const [x, y] = hexCenter(r, c); this.hov.lineStyle(3, col, 1).strokePoints(hexPoints(x, y, 0.9), true); };
        if (act.type === 'move') for (const [r, c] of this.b.cellsAt(this.b.active, ...Hex.rc(act.to))) draw(r, c, 0xffffff);
        if (act.type === 'melee') { for (const [r, c] of this.b.cellsAt(this.b.active, ...Hex.rc(act.from))) draw(r, c, 0x60ff60); const t = this.b.units.find(o => o.id === act.target); for (const [r, c] of this.b.cells(t)) draw(r, c, 0xff4040); }
        if (act.type === 'shoot') { const t = this.b.units.find(o => o.id === act.target); for (const [r, c] of this.b.cells(t)) draw(r, c, 0xff8040); }
        if (act.type === 'cast') { (act.hexes || []).forEach(([r, c]) => draw(r, c, 0x80a0ff)); }
    }
    dmgRange(a, t, ranged, moved) {
        const lo = this.b.calcDamage(a, t, ranged, { mode: 'min', moved }).dmg, hi = this.b.calcDamage(a, t, ranged, { mode: 'max', moved }).dmg;
        const kill = d => Math.min(t.n, d >= this.b.totalHp(t) ? t.n : Math.max(0, Math.floor((d - t.hp) / this.b.maxHp(t)) + (d >= t.hp ? 1 : 0)));
        return `${lo === hi ? lo : lo + '-' + hi} damage, ${kill(lo) === kill(hi) ? kill(lo) : kill(lo) + '-' + kill(hi)} perish`;
    }
    actionAt(p, h) {
        const u = this.b.active, b = this.b;
        const [r, c] = h, k = Hex.key(r, c);
        if (this.targeting) return this.targetAction(p, h);
        const o = b.unitAt(r, c);
        if (o && o.side !== u.side) {
            if (b.canShoot(u)) return { type: 'shoot', target: o.id, desc: `Shoot ${b.uname(o)} (${this.dmgRange(u, o, true, 0)}, ${u.shots} shots left)` };
            const poss = b.attackPositions(u, o, this.reach);
            if (!poss.length) return null;
            let best = null, bd = Infinity;
            for (const pk of poss) {
                for (const [ar, ac] of b.cellsAt(u, ...Hex.rc(pk))) {
                    if (!b.cells(o).some(([tr, tc]) => Hex.dist(ar, ac, tr, tc) === 1 && tr === r && tc === c) && b.cells(o).length > 1) continue;
                    const [x, y] = hexCenter(ar, ac); const d = (x - p.x) ** 2 + (y - p.y) ** 2;
                    if (d < bd) { bd = d; best = pk; }
                }
            }
            if (best === null) best = poss[0];
            const moved = this.reach.get(best).d;
            return { type: 'melee', target: o.id, from: best, desc: `Attack ${b.uname(o)} (${this.dmgRange(u, o, false, moved)})` };
        }
        if (o && o === u) return { type: 'info', desc: `${b.uname(u)} — click Defend or Wait, or move` };
        if (this.reach.has(k) && k !== Hex.key(u.r, u.c)) return { type: 'move', to: k, desc: `${b.def(u).fly ? 'Fly' : 'Move'} ${b.uname(u)} here` };
        // large units: allow clicking the tail cell
        if (b.def(u).large) {
            const alt = Hex.key(r, c + (u.side === 0 ? 1 : -1));
            if (this.reach.has(alt) && alt !== Hex.key(u.r, u.c)) return { type: 'move', to: alt, desc: `Move ${b.uname(u)} here` };
        }
        return null;
    }
    click(p, h) {
        if (!this.inputRes || !h) return;
        const act = this.actionAt(p, h);
        if (!act || act.type === 'info') { if (act && act.type === 'info') this.activeInfo(); return; }
        if (act.type === 'cast') { this.targeting = null; this.humanAct({ type: 'cast', sid: act.sid, target: act.target }); return; }
        this.humanAct(act);
    }
    rightInfo(p, h) {
        if (!h) return;
        const o = this.b.unitAt(h[0], h[1]);
        if (!o) return;
        this.unitPopup(o, p.x, p.y);
    }
    unitPopup(o, px, py) {
        const b = this.b, d = b.def(o);
        const eff = Object.entries(o.eff).map(([e, n]) => `${EFFECTS[e].name} (${n})`);
        const lines = o.machine ? [d.name, `Health: ${o.hp}/${b.maxHp(o)}`] : UI.creatureInfo(this, o.cid, o.n, { att: b.att(o, true), def: b.dfn(o), spd: b.spd(o), hp: o.hp, shots: o.shots, eff });
        if (!o.machine) lines.push(`Morale ${b.morale(o)}  Luck ${b.luck(o)}`);
        const pop = UI.popup(this, px + 10, py - 140, lines, { icon: Art.creature(this, o.cid) });
        pop.setDepth(9000);
        this.input.once('pointerup', () => pop.destroy());
    }
    activeInfo() { const u = this.b.active; if (!u) return; const [x, y] = this.unitPos(u); this.unitPopup(u, x, y); }

    // ---------------- spells ----------------
    spellbook() {
        if (!this.inputRes || UI.anyModal(this)) return;
        const side = this.humanSide, h = this.cfg.sides[side].hero;
        if (!h || !this.b.canCast(side)) { this.status('Your hero cannot cast a spell now.'); return; }
        const mana = this.b.sides[side].mana;
        const spells = h.spells.filter(s => SPELLS[s].kind !== 'adv').sort((a, b) => SPELLS[a].lvl - SPELLS[b].lvl || SPELLS[a].cost - SPELLS[b].cost);
        const m = UI.modal(this, 760, 520, { title: `${h.name}'s Spellbook — ${Math.round(mana)} spell points` });
        spells.forEach((s, i) => {
            const sp = SPELLS[s], x = 24 + (i % 4) * 182, y = 54 + Math.floor(i / 4) * 92;
            const ok = sp.cost <= mana;
            const btn = UI.button(this, x, y, 172, 84, '', () => { m.close(); this.beginTarget(s); }, { disabled: !ok });
            btn.add(this.add.image(30, 42, Art.spell(this, s)).setAlpha(ok ? 1 : 0.4));
            btn.add(UI.text(this, 58, 14, sp.name, 14, ok ? UI.GOLDS : '#807060', { wrap: 110 }));
            btn.add(UI.text(this, 58, 54, `Lv ${sp.lvl} · ${sp.cost} mana`, 12, UI.DIM));
            btn.zone.on('pointerover', () => info.setText(spellDesc(s, h)));
            m.add(btn);
        });
        const info = m.add(UI.text(this, 24, 440, 'Hover a spell for details.', 14, UI.TXT, { wrap: 600 }));
        m.add(UI.button(this, 630, 470, 110, 34, 'Cancel', () => m.close()));
    }
    beginTarget(sid) {
        const sp = SPELLS[sid];
        if (sp.target === 'none') { this.humanAct({ type: 'cast', sid, target: null }); return; }
        this.targeting = sid;
        this.drawHL();
        this.status(`Select a target for ${sp.name} (right-click / Esc to cancel)`);
        this.input.once('pointerdown', p => { if (p.rightButtonDown()) this.cancelTarget(); });
    }
    cancelTarget() { this.targeting = null; this.drawHL(); this.status('Spell cancelled.'); }
    targetAction(p, h) {
        const sid = this.targeting, sp = SPELLS[sid], b = this.b, side = this.humanSide;
        const [r, c] = h;
        if (sp.target === 'hex') {
            const k = Hex.key(r, c);
            const hexes = [[r, c]].concat(Hex.neighbors(r, c));
            const shown = sp.kind === 'ring' ? Hex.neighbors(r, c) : hexes;
            const hit = b.unitsInArea(k, 1, sp.kind === 'ring');
            return { type: 'cast', sid, target: k, hexes: shown, desc: `Cast ${sp.name} here (${hit.length} stacks affected)` };
        }
        const o = b.unitAt(r, c);
        if (!o || !b.spellTargets(side, sid).includes(o)) return null;
        const amt = b.spellAmount(side, sid);
        const extra = (sp.kind === 'dmg' || sp.kind === 'chain') ? ` (${amt} damage)` : '';
        return { type: 'cast', sid, target: o.id, hexes: b.cells(o), desc: `Cast ${sp.name} on ${b.uname(o)}${extra}` };
    }

    // ---------------- flee ----------------
    async retreat() {
        if (!this.inputRes) return;
        if (await UI.confirm(this, 'Retreat from battle? Your hero escapes, but the army is lost. The hero can be re-hired in a tavern.')) this.humanAct({ type: 'flee', surrender: false });
    }
    async surrender() {
        if (!this.inputRes) return;
        const cost = this.b.surrenderCost(this.humanSide);
        const p = G.players[this.cfg.sides[this.humanSide].owner];
        if (p.res.gold < cost) { await UI.msg(this, `Surrendering would cost ${fmt(cost)} gold, which you don't have.`); return; }
        if (await UI.confirm(this, `The enemy will accept your surrender for ${fmt(cost)} gold. Your hero keeps the army and can be re-hired in a tavern. Accept?`)) {
            this.cfg.sides[this.humanSide].hero._surrCost = cost;
            this.humanAct({ type: 'flee', surrender: true });
        }
    }

    // ---------------- animation ----------------
    status(s) { this.statusText.setText(s || ''); }
    log(s) {
        this.logLines.push(s);
        this.logText.setText(this.logLines.slice(-4).join('\n'));
    }
    fullLog() {
        const m = UI.modal(this, 700, 560, { title: 'Combat Log' });
        m.add(UI.text(this, 20, 50, this.logLines.slice(-26).join('\n'), 13, UI.TXT, { wrap: 660 }));
        m.add(UI.button(this, 295, 512, 110, 34, 'Close', () => m.close()));
    }
    refreshInfo() {
        this.roundText.setText(`Round ${this.b.round}`);
        this.cfg.sides.forEach((s, i) => { if (s.hero) this.heroInfo[i].setText(`Spell points: ${Math.round(this.b.sides[i].mana)}${this.b.sides[i].cast ? ' (cast)' : ''}`); });
        // turn queue
        this.queueC.removeAll(true);
        const b = this.b;
        const live = b.units.filter(u => u.n > 0 && !u.struct);
        const now = live.filter(u => !u.acted).sort((a, c) => (a === b.active ? -1 : c === b.active ? 1 : 0) || (a.waited - c.waited) || b.spd(c) - b.spd(a));
        const next = live.slice().sort((a, c) => b.spd(c) - b.spd(a));
        const q = now.concat(next).slice(0, 15);
        q.forEach((u, i) => {
            const x = 260 + i * 34, y = 610;
            const col = u.side === 0 ? 0x2a4ab0 : 0x8a2a2a;
            this.queueC.add(this.add.rectangle(x, y, 32, 40, col, 0.9).setOrigin(0).setStrokeStyle(i === 0 ? 2 : 1, i === 0 ? 0xffe060 : 0x000000));
            this.queueC.add(this.add.image(x + 16, y + 38, Art.creature(this, u.cid)).setOrigin(0.5, 1).setScale(0.2).setFlipX(u.side === 1));
            this.queueC.add(UI.text(this, x + 30, y + 40, String(u.n), 10, '#ffffff', { origin: [1, 1], stroke: 2 }));
            if (i === now.length - 1 && now.length < q.length) this.queueC.add(this.add.rectangle(x + 33, y - 2, 2, 44, 0xffffff));
        });
    }
    floatText(x, y, s, col) {
        const t = UI.text(this, x, y, s, 18, col, { origin: 0.5, stroke: 4, bold: true }).setDepth(3000);
        this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
    }
    async animate(events) {
        for (const e of events) {
            const u = e.u !== undefined ? this.b.units.find(o => o.id === e.u) : null;
            const s = u && this.sprites[u.id];
            switch (e.t) {
                case 'log': this.log(e.s); break;
                case 'round': this.refreshInfo(); break;
                case 'turn': this.refreshInfo(); break;
                case 'move': await this.animMove(u, e); break;
                case 'attack': {
                    const t = this.b.units.find(o => o.id === e.tgt);
                    await this.animLunge(u, t);
                    break;
                }
                case 'shoot': {
                    const t = this.b.units.find(o => o.id === e.tgt);
                    await this.animShot(u, t);
                    break;
                }
                case 'dmg': {
                    if (!s || s.struct) break;
                    Sfx.play('hit');
                    s.im.setTintFill(0xff3030);
                    this.time.delayedCall(120, () => s.im.clearTint());
                    this.floatText(s.im.x, s.im.y - 70, `-${e.dmg}${e.killed ? ` (${e.killed})` : ''}`, '#ff8070');
                    this.placeBox(u, s.im.x, s.im.y);
                    await this.delay(120);
                    break;
                }
                case 'heal': if (s && !s.struct) { this.floatText(s.im.x, s.im.y - 70, `+${e.amt}`, '#80ff80'); this.placeBox(u, s.im.x, s.im.y); } break;
                case 'death':
                    if (s && !s.struct) {
                        Sfx.play('death');
                        this.tweens.add({ targets: s.im, alpha: 0.35, angle: u.side === 0 ? -80 : 80, y: s.im.y - 10, duration: 400 });
                        s.im.setTint(0x777777).setDepth(9);
                        s.box.setVisible(false); s.txt.setVisible(false);
                        await this.delay(250);
                    }
                    break;
                case 'morale': if (s) { this.floatText(s.im.x, s.im.y - 90, e.good ? 'Morale!' : 'Fear!', e.good ? '#ffe060' : '#c080ff'); await this.delay(400); } break;
                case 'resist': if (s) this.floatText(s.im.x, s.im.y - 90, 'Resisted', '#ffffff'); break;
                case 'spell': await this.animSpell(e); this.refreshInfo(); break;
                case 'catapult': await this.animCatapult(e); break;
                case 'over': break;
            }
        }
        for (const u of this.b.units) if (u.n > 0 && this.sprites[u.id] && !this.sprites[u.id].struct) { const s = this.sprites[u.id]; this.placeBox(u, s.im.x, s.im.y); }
        this.refreshInfo();
    }
    animMove(u, e) {
        return new Promise(res => {
            const s = this.sprites[u.id];
            const pts = e.path.map(k => { const [r, c] = Hex.rc(k); return this.unitPosAt(u, r, c); });
            s.box.setVisible(false); s.txt.setVisible(false);
            s.im.setDepth(1500);
            if (e.fly) {
                const [x, y] = pts[pts.length - 1];
                const dist = Math.hypot(x - s.im.x, y - s.im.y);
                this.tweens.add({ targets: s.im, x, y, duration: 200 + dist * 1.2, ease: 'Sine.easeInOut', onComplete: () => { this.placeUnit(u); res(); } });
                this.tweens.add({ targets: s.im, scaleY: s.im.scaleY * 1.05, yoyo: true, duration: 150 });
                return;
            }
            const steps = pts.slice(1).map(([x, y]) => ({ x, y, duration: 110 }));
            if (!steps.length) { this.placeUnit(u); return res(); }
            this.tweens.chain({ targets: s.im, tweens: steps, onComplete: () => { this.placeUnit(u); res(); } });
            Sfx.play('step');
        });
    }
    unitPosAt(u, r, c) { const cells = this.b.cellsAt(u, r, c); let x = 0, y = 0; for (const [cr, cc] of cells) { const [cx, cy] = hexCenter(cr, cc); x += cx; y += cy; } return [x / cells.length, y / cells.length + 18]; }
    animLunge(u, t) {
        return new Promise(res => {
            const s = this.sprites[u.id], ts = t && this.sprites[t.id];
            if (!s || s.struct || !ts) return res();
            const dx = (ts.im ? ts.im.x : ts.x) - s.im.x, dy = (ts.im ? ts.im.y : ts.y) - s.im.y, d = Math.hypot(dx, dy) || 1;
            if (dx !== 0 && !s.struct) s.im.setFlipX(dx < 0);
            const ox = s.im.x, oy = s.im.y;
            this.tweens.add({ targets: s.im, x: ox + dx / d * 16, y: oy + dy / d * 8, duration: 110, yoyo: true, onComplete: () => { s.im.setPosition(ox, oy); s.im.setFlipX(u.side === 1); res(); } });
        });
    }
    animShot(u, t) {
        return new Promise(res => {
            const s = this.sprites[u.id], ts = this.sprites[t.id];
            if (!s || !ts) return res();
            Sfx.play('shoot');
            const sx = s.struct ? s.x : s.im.x, sy = s.struct ? s.y : s.im.y - 50;
            const tx = ts.im.x, ty = ts.im.y - 40;
            const art = this.b.def(u).art || {};
            const fire = ['fireball', 'staff', 'bolt'].includes(art.wpn) || u.cid === 'lich' || u.cid === 'powerlich';
            const p = this.add.image(sx, sy, fire ? 'spark' : 'px').setDepth(3000);
            if (fire) p.setTint(art.glow ? Phaser.Display.Color.HexStringToColor(art.glow).color : 0xff8020).setScale(0.9);
            else { p.setDisplaySize(26, 3).setTint(art.wpn === 'rock' ? 0x8a8478 : 0xf0e0b0).setRotation(Math.atan2(ty - sy, tx - sx)); if (art.wpn === 'rock') p.setDisplaySize(14, 14); }
            const dist = Math.hypot(tx - sx, ty - sy);
            this.tweens.add({ targets: p, x: tx, y: ty, duration: 120 + dist * 0.5, onComplete: () => { p.destroy(); res(); } });
        });
    }
    animSpell(e) {
        return new Promise(res => {
            Sfx.play(['fireball', 'meteor', 'armageddon'].includes(e.sid) ? 'fire' : 'spell');
            const col = { fireball: 0xff6010, meteor: 0xff8030, armageddon: 0xff4010, lightning: 0xffff80, chain: 0xffff80, icebolt: 0x80d0ff, frostring: 0x80d0ff, implosion: 0xc060ff, magicarrow: 0xffe060 }[e.sid] || 0x80c0ff;
            const targets = e.tgts.map(id => this.sprites[id]).filter(s => s && s.im);
            const spots = targets.map(s => [s.im.x, s.im.y - 40]);
            if (e.hex !== null && e.hex !== undefined) { const [r, c] = Hex.rc(e.hex); const [x, y] = hexCenter(r, c); spots.push([x, y]); }
            if (!spots.length) return this.time.delayedCall(200, res);
            spots.forEach(([x, y]) => {
                const g = this.add.image(x, y, 'spark').setTint(col).setDepth(3000).setScale(0.3).setBlendMode(Phaser.BlendModes.ADD);
                this.tweens.add({ targets: g, scale: e.sid === 'fireball' || e.sid === 'meteor' || e.sid === 'frostring' ? 5 : 3, alpha: 0, duration: 500, onComplete: () => g.destroy() });
                for (let i = 0; i < 8; i++) {
                    const sp = this.add.image(x, y, 'spark').setTint(col).setDepth(3000).setScale(0.25).setBlendMode(Phaser.BlendModes.ADD);
                    const a = Math.random() * Math.PI * 2;
                    this.tweens.add({ targets: sp, x: x + Math.cos(a) * 50, y: y + Math.sin(a) * 40, alpha: 0, duration: 500, onComplete: () => sp.destroy() });
                }
            });
            if (e.sid === 'armageddon') this.cameras.main.shake(400, 0.01);
            this.time.delayedCall(450, res);
        });
    }
    animCatapult(e) {
        return new Promise(res => {
            const [r, c] = Hex.rc(e.keys[0]);
            const [tx, ty] = hexCenter(r, c);
            const rock = this.add.image(40, 300, 'px').setDisplaySize(12, 12).setTint(0x8a8478).setDepth(3000);
            this.tweens.add({ targets: rock, x: tx, duration: 500 });
            this.tweens.add({ targets: rock, y: { from: 300, to: 60 }, duration: 250, yoyo: true, ease: 'Sine.easeOut', onComplete: () => {
                rock.destroy();
                if (e.hit) { Sfx.play('hit'); this.cameras.main.shake(150, 0.004); }
                if (e.destroyed) for (const k of e.keys) { const im = this.wallSprites[k]; if (im) im.setTexture('rubble').setOrigin(0.5, 1); }
                this.floatText(tx, ty - 40, e.hit ? (e.destroyed ? 'Destroyed!' : 'Hit!') : 'Miss', '#ffffff');
                res();
            } });
        });
    }

    // ---------------- result ----------------
    showResult() {
        const res = this.b.result();
        const won = this.humanSide >= 0 ? res.winner === this.humanSide : res.winner === 0;
        Sfx.play(won ? 'victory' : 'defeat');
        const m = UI.modal(this, 640, 440, { title: won ? 'Victory!' : (res.sides[this.humanSide]?.fled ? (res.sides[this.humanSide].surrendered ? 'Surrendered' : 'Retreated') : 'Defeat') });
        const list = (lost) => Object.entries(lost).map(([cid, n]) => ({ cid, n }));
        [0, 1].forEach(i => {
            const x = 30 + i * 300;
            const s = this.cfg.sides[i];
            const name = s.hero ? s.hero.name : (s.owner >= 0 ? 'Garrison' : 'Neutral creatures');
            m.add(UI.text(this, x, 52, `${name} — casualties`, 15, UI.GOLDS));
            const l = list(res.sides[i].lost);
            if (!l.length) m.add(UI.text(this, x, 80, 'None', 14, UI.DIM));
            l.slice(0, 8).forEach((o, j) => {
                const xx = x + (j % 4) * 66, yy = 80 + Math.floor(j / 4) * 84;
                m.add(this.add.image(xx + 30, yy + 64, Art.creature(this, o.cid)).setOrigin(0.5, 1).setScale(0.38));
                m.add(UI.text(this, xx + 30, yy + 66, String(o.n), 13, UI.TXT, { origin: [0.5, 0] }));
            });
        });
        if (won && this.humanSide >= 0 && this.cfg.sides[this.humanSide].hero) {
            const exp = res.sides[this.humanSide].killedHp + (this.cfg.sides[1 - this.humanSide].hero ? 500 : 0);
            m.add(UI.text(this, 320, 300, `${this.cfg.sides[this.humanSide].hero.name} gains ${fmt(exp)} experience.`, 16, UI.TXT, { origin: [0.5, 0] }));
        }
        m.add(UI.button(this, 265, 380, 110, 36, 'OK', () => { m.close(); this.cameras.main.fadeOut(250); this.time.delayedCall(260, () => this.onEnd(res)); }));
    }
}
