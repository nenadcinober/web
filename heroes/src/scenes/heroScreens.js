// Hero screen (stats, skills, artifacts, army, spellbook) and the hero-to-hero exchange screen.
const SLOT_POS = {
    head: [120, 0], neck: [120, 52], cloak: [60, 40], torso: [120, 104], weapon: [40, 104], shield: [200, 104],
    ring1: [20, 160], ring2: [220, 160], feet: [120, 210], misc1: [0, 220], misc2: [60, 220], misc3: [180, 220], misc4: [240, 220],
};

function heroStatsBlock(scene, c, h, x, y) {
    const prim = [['att', 'Attack'], ['def', 'Defense'], ['pow', 'Power'], ['know', 'Knowledge']];
    prim.forEach(([k, n], i) => {
        const im = scene.add.image(x + i * 66 + 22, y + 22, 'prim_' + k).setInteractive();
        im.on('pointerover', () => scene.status && scene.status(`${n}: ${h[k]} base${Core.artBonus(h, k) ? ` + ${Core.artBonus(h, k)} from artifacts` : ''}`));
        c.add(im);
        c.add(UI.text(scene, x + i * 66 + 22, y + 46, n, 12, UI.DIM, { origin: [0.5, 0] }));
        c.add(UI.text(scene, x + i * 66 + 22, y + 60, String(Core.stat(h, k)), 16, UI.GOLDS, { origin: [0.5, 0] }));
    });
}

class HeroScreen extends Phaser.Scene {
    constructor() { super('HeroScreen'); }
    init(d) { this.heroId = d.heroId; this.onClose = d.onClose; this.townId = d.town; }
    create() {
        this.input.mouse.disableContextMenu();
        this._modalDepth = 0; this._modals = 0;
        this.add.rectangle(0, 0, VW, VH, 0x000000, 0.6).setOrigin(0).setInteractive();
        this.root = null;
        this.draw();
        this.input.keyboard.on('keydown', e => { if ((e.key === 'Escape' || e.key === 'Enter') && !UI.anyModal(this)) this.close(); });
    }
    status(s) { if (this.st) this.st.setText(s || ''); }
    close(dismissed) { this.scene.stop(); this.onClose && this.onClose(dismissed); }
    draw() {
        if (this.root) this.root.destroy();
        const h = G.heroes[this.heroId];
        if (!h) { this.close(true); return; }
        const X = 62, Y = 40, W = 900, H = 690;
        const c = this.root = UI.panel(this, X, Y, W, H);
        const own = h.owner === 0;
        c.add(this.add.image(20, 20, Art.portrait(this, h)).setOrigin(0).setScale(1.5));
        c.add(UI.text(this, 120, 18, h.name, 24, UI.GOLDS, { title: true }));
        c.add(UI.text(this, 120, 52, `Level ${h.lvl} ${CLASSES[h.cls].name} (${FACTIONS[h.faction].name})`, 16, UI.TXT));
        const need = LEVEL_EXP[h.lvl + 1], prev = LEVEL_EXP[h.lvl];
        c.add(UI.text(this, 120, 74, `Experience: ${fmt(h.exp)} / ${fmt(need)}`, 14, UI.DIM));
        const bar = this.add.graphics(); c.add(bar);
        bar.fillStyle(0x000000).fillRect(120, 94, 200, 6).fillStyle(0xd8b040).fillRect(120, 94, 200 * clamp((h.exp - prev) / (need - prev), 0, 1), 6);
        heroStatsBlock(this, c, h, 20, 120);
        const morale = Core.morale(h, h.army), luck = Core.luck(h);
        const info = [
            `Spell points: ${h.mana} / ${Core.maxMana(h)}`,
            `Movement: ${h.mp} / ${Core.maxMove(h)}`,
            `Morale: ${morale > 0 ? '+' : ''}${morale}    Luck: ${luck > 0 ? '+' : ''}${luck}`,
            `War machines: ${[h.machines.ballista ? 'Ballista' : '', h.machines.tent ? 'First Aid Tent' : ''].filter(Boolean).join(', ') || 'none'}`,
        ];
        c.add(UI.text(this, 20, 210, info.join('\n'), 14, UI.TXT, { lineSpacing: 4 }));
        // skills
        c.add(UI.text(this, 20, 310, 'Secondary Skills', 16, UI.GOLDS, { title: true }));
        for (let i = 0; i < 8; i++) {
            const sx = 20 + (i % 2) * 150, sy = 336 + Math.floor(i / 2) * 52;
            const s = h.skills[i];
            c.add(this.add.rectangle(sx, sy, 144, 48, 0x140c06, 0.7).setOrigin(0).setStrokeStyle(1, 0x6a5020));
            if (!s) continue;
            const im = this.add.image(sx + 24, sy + 24, Art.skill(this, s[0])).setScale(0.95).setInteractive();
            const desc = SKILLS[s[0]].d.replace('{v}', SKILLS[s[0]].v[s[1] - 1]);
            im.on('pointerover', () => this.status(`${SKILL_LVL[s[1]]} ${SKILLS[s[0]].name}: ${desc}`));
            im.on('pointerout', () => this.status(''));
            c.add(im);
            c.add(UI.text(this, sx + 50, sy + 6, SKILL_LVL[s[1]], 12, UI.DIM));
            c.add(UI.text(this, sx + 50, sy + 22, SKILLS[s[0]].name, 14, UI.TXT));
        }
        // artifacts
        c.add(UI.text(this, 360, 18, 'Artifacts', 16, UI.GOLDS, { title: true }));
        const ax = 380, ay = 50;
        for (const sl of ART_SLOTS) {
            const [px, py] = SLOT_POS[sl];
            const bx = ax + px, by = ay + py;
            const r = this.add.rectangle(bx, by, 46, 46, 0x140c06, 0.85).setOrigin(0).setStrokeStyle(1, 0x8a6a30).setInteractive({ useHandCursor: true });
            c.add(r);
            const aid = h.arts[sl];
            if (aid) c.add(this.add.image(bx + 23, by + 23, Art.artifact(this, aid)).setScale(1));
            else c.add(UI.text(this, bx + 23, by + 23, sl.replace(/\d/, ''), 10, '#6a5a40', { origin: 0.5, stroke: 0 }));
            r.on('pointerover', () => this.status(aid ? `${ARTIFACTS[aid].name}: ${Adv.artDesc(aid)} (click to unequip)` : `${sl} slot`));
            r.on('pointerout', () => this.status(''));
            r.on('pointerup', () => { if (!own || !aid) return; delete h.arts[sl]; h.pack.push(aid); this.draw(); });
        }
        c.add(UI.text(this, 680, 50, 'Backpack', 14, UI.GOLDS));
        h.pack.slice(0, 15).forEach((aid, i) => {
            const bx = 680 + (i % 4) * 50, by = 72 + Math.floor(i / 4) * 50;
            const r = this.add.rectangle(bx, by, 46, 46, 0x140c06, 0.85).setOrigin(0).setStrokeStyle(1, 0x8a6a30).setInteractive({ useHandCursor: true });
            c.add(r);
            c.add(this.add.image(bx + 23, by + 23, Art.artifact(this, aid)));
            r.on('pointerover', () => this.status(`${ARTIFACTS[aid].name}: ${Adv.artDesc(aid)} (click to equip)`));
            r.on('pointerout', () => this.status(''));
            r.on('pointerup', () => {
                if (!own) return;
                const a = ARTIFACTS[aid];
                const slots = a.slot === 'ring' ? ['ring1', 'ring2'] : a.slot === 'misc' ? ['misc1', 'misc2', 'misc3', 'misc4'] : [a.slot];
                const free = slots.find(s => !h.arts[s]) || slots[0];
                const old = h.arts[free];
                h.arts[free] = aid;
                h.pack.splice(h.pack.indexOf(aid), 1);
                if (old) h.pack.push(old);
                this.draw();
            });
        });
        if (h.pack.length > 15) c.add(UI.text(this, 680, 326, `+${h.pack.length - 15} more`, 12, UI.DIM));
        // army
        c.add(UI.text(this, 360, 330, 'Army', 16, UI.GOLDS, { title: true }));
        const row = new ArmyRow(this, X + 360, Y + 356, h.army, { size: 62, gap: 6 });
        row.c.setDepth(1);
        this.armyRow = row;
        const link = new ArmyLink(this, [row], { mustKeep: () => true, onChange: () => this.draw(), onInfo: s => this.stackInfo(s) });
        this.events.once('shutdown', () => row.destroy());
        const oldRow = this._oldRow; if (oldRow) oldRow.destroy(); this._oldRow = row;
        c.add(UI.text(this, 360, 432, 'Click a stack, then a slot to move or swap. Shift+click a slot to split. Click a stack twice for details.', 13, UI.DIM, { wrap: 500 }));
        // spells
        c.add(UI.text(this, 360, 470, 'Spellbook', 16, UI.GOLDS, { title: true }));
        const sp = h.spells.slice().sort((a, b) => SPELLS[a].lvl - SPELLS[b].lvl);
        sp.forEach((s, i) => {
            const sx = 360 + (i % 10) * 52, sy = 496 + Math.floor(i / 10) * 52;
            const im = this.add.image(sx + 24, sy + 24, Art.spell(this, s)).setInteractive();
            im.on('pointerover', () => this.status(`${SPELLS[s].name} (level ${SPELLS[s].lvl}, ${SPELLS[s].cost} mana): ${spellDesc(s, h)}`));
            im.on('pointerout', () => this.status(''));
            c.add(im);
        });
        if (!sp.length) c.add(UI.text(this, 360, 500, 'No spells known.', 14, UI.DIM));
        this.st = UI.text(this, 20, 610, '', 14, UI.TXT, { wrap: 860 });
        c.add(this.st);
        if (own) {
            c.add(UI.button(this, 520, 640, 140, 34, h.sleep ? 'Wake Up' : 'Sleep', () => { h.sleep = !h.sleep; this.draw(); }, { size: 14 }));
            c.add(UI.button(this, 20, 640, 140, 34, 'Dismiss Hero', async () => {
                const t = this.townId && G.objects[this.townId];
                if (G.players[h.owner].heroes.length <= 1 && !G.players[h.owner].towns.length) { UI.msg(this, 'You cannot dismiss your last hero without a town.'); return; }
                if (await UI.confirm(this, `Dismiss ${h.name}? The hero and all troops will leave forever.`)) { Core.removeHero(h); this.close(true); }
            }, { size: 14 }));
        }
        c.add(UI.button(this, 740, 640, 140, 34, 'Close', () => this.close()));
    }
    stackInfo(s) {
        const m = UI.modal(this, 320, 380, { title: CREATURES[s.cid].name });
        m.add(this.add.image(160, 140, Art.creature(this, s.cid)).setOrigin(0.5, 1).setScale(0.75));
        m.add(UI.text(this, 24, 150, UI.creatureInfo(this, s.cid, s.n).slice(1).join('\n'), 14, UI.TXT, { wrap: 280 }));
        m.add(UI.button(this, 105, 336, 110, 32, 'Close', () => m.close()));
    }
}

class ExchangeScene extends Phaser.Scene {
    constructor() { super('Exchange'); }
    init(d) { this.aId = d.a; this.bId = d.b; this.onClose = d.onClose; }
    create() {
        this.input.mouse.disableContextMenu();
        this._modalDepth = 0; this._modals = 0;
        this.add.rectangle(0, 0, VW, VH, 0x000000, 0.6).setOrigin(0).setInteractive();
        this.draw();
        this.input.keyboard.on('keydown', e => { if (e.key === 'Escape' && !UI.anyModal(this)) this.close(); });
    }
    status(s) { if (this.st) this.st.setText(s || ''); }
    close() { this.scene.stop(); this.onClose && this.onClose(); }
    draw() {
        if (this.root) this.root.destroy();
        (this.rows || []).forEach(r => r.destroy());
        const a = G.heroes[this.aId], b = G.heroes[this.bId];
        const X = 32, Y = 60, W = 960, H = 620;
        const c = this.root = UI.panel(this, X, Y, W, H);
        c.add(UI.text(this, W / 2, 14, 'Hero Exchange', 22, UI.GOLDS, { origin: [0.5, 0], title: true }));
        this.rows = [];
        [a, b].forEach((h, i) => {
            const ox = i * 480 + 20;
            c.add(this.add.image(ox, 50, Art.portrait(this, h)).setOrigin(0));
            c.add(UI.text(this, ox + 70, 52, h.name, 18, UI.GOLDS));
            c.add(UI.text(this, ox + 70, 76, `Level ${h.lvl} ${CLASSES[h.cls].name}`, 14, UI.TXT));
            heroStatsBlock(this, c, h, ox, 120);
            c.add(UI.text(this, ox, 210, 'Skills: ' + (h.skills.map(s => `${SKILL_LVL[s[1]]} ${SKILLS[s[0]].name}`).join(', ') || 'none'), 13, UI.DIM, { wrap: 430 }));
            c.add(UI.text(this, ox, 270, 'Artifacts (click to give)', 14, UI.GOLDS));
            const arts = ART_SLOTS.filter(s => h.arts[s]).map(s => ({ s, aid: h.arts[s] })).concat(h.pack.map((aid, k) => ({ k, aid })));
            arts.slice(0, 18).forEach((o, j) => {
                const bx = ox + (j % 9) * 48, by = 292 + Math.floor(j / 9) * 48;
                const r = this.add.rectangle(bx, by, 44, 44, 0x140c06, 0.85).setOrigin(0).setStrokeStyle(1, 0x8a6a30).setInteractive({ useHandCursor: true });
                c.add(r); c.add(this.add.image(bx + 22, by + 22, Art.artifact(this, o.aid)).setScale(0.95));
                r.on('pointerover', () => this.status(`${ARTIFACTS[o.aid].name}: ${Adv.artDesc(o.aid)}`));
                r.on('pointerup', () => {
                    const other = h === a ? b : a;
                    if (o.s) delete h.arts[o.s]; else h.pack.splice(h.pack.indexOf(o.aid), 1);
                    Core.equip(other, o.aid);
                    this.draw();
                });
            });
            c.add(UI.text(this, ox, 400, 'Army', 14, UI.GOLDS));
            const row = new ArmyRow(this, X + ox, Y + 424, h.army, { size: 58, gap: 4 });
            this.rows.push(row);
        });
        new ArmyLink(this, this.rows, { mustKeep: () => true, onChange: () => this.rows.forEach(r => r.refresh()) });
        c.add(UI.text(this, 20, 500, 'Move troops between the heroes by clicking a stack and then a slot. Shift+click to split.', 13, UI.DIM));
        this.st = UI.text(this, 20, 530, '', 14, UI.TXT, { wrap: 900 });
        c.add(this.st);
        c.add(UI.button(this, W / 2 - 60, H - 52, 120, 36, 'Done', () => this.close()));
    }
}
