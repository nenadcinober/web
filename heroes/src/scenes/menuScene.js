// Boot (texture generation) and the main menu with new-game setup.
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        const t = UI.text ? this.add.text(VW / 2, VH / 2, 'Painting the realm...', { fontFamily: TFONT, fontSize: '28px', color: '#f0d890' }).setOrigin(0.5) : null;
        this.time.delayedCall(30, () => {
            Art.init(this);
            UI.init(this);
            this.scene.start('Menu');
        });
    }
}

class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }
    create() {
        this.input.mouse.disableContextMenu();
        this._modalDepth = 0; this._modals = 0;
        this.opts = Object.assign({ size: 1, opponents: 2, diff: 1, faction: 'random' }, this.loadPrefs());
        this.drawBackground();
        this.input.on('pointerdown', () => Sfx.unlock());
        this.mainMenu();
    }
    loadPrefs() { try { return JSON.parse(localStorage.getItem('heroes_prefs')) || {}; } catch (e) { return {}; } }
    savePrefs() { try { localStorage.setItem('heroes_prefs', JSON.stringify(this.opts)); } catch (e) { } }
    drawBackground() {
        if (!this.textures.exists('menubg')) {
            const [c, x] = Art.canvas(VW, VH);
            const g = x.createLinearGradient(0, 0, 0, VH);
            g.addColorStop(0, '#1a1030'); g.addColorStop(0.45, '#7a3a50'); g.addColorStop(0.62, '#e0904a'); g.addColorStop(1, '#2a1a10');
            x.fillStyle = g; x.fillRect(0, 0, VW, VH);
            const r = Art.rnd(7);
            for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.8})`; x.fillRect(r() * VW, r() * 300, 1.5, 1.5); }
            Art.glow(x, 760, 430, 160, '#ffd080', 0.6);
            Art.oval(x, 760, 430, 46, 46, '#ffe0a0', 0);
            // mountains
            const ridge = (y0, amp, col, seed) => {
                const rr = Art.rnd(seed); x.beginPath(); x.moveTo(0, VH);
                for (let px = 0; px <= VW; px += 16) x.lineTo(px, y0 - Math.abs(Math.sin(px * 0.006 + seed)) * amp - rr() * 18);
                x.lineTo(VW, VH); x.closePath(); x.fillStyle = col; x.fill();
            };
            ridge(470, 120, '#4a2a40', 3); ridge(530, 90, '#2a1a28', 9);
            // castle silhouette
            x.fillStyle = '#140c14';
            const tower = (tx, w, h) => { x.fillRect(tx - w / 2, 560 - h, w, h); x.beginPath(); x.moveTo(tx - w / 2 - 6, 560 - h); x.lineTo(tx, 560 - h - w * 1.3); x.lineTo(tx + w / 2 + 6, 560 - h); x.fill(); };
            x.fillRect(120, 470, 340, 120);
            tower(140, 40, 150); tower(230, 50, 210); tower(320, 36, 170); tower(420, 44, 140); tower(290, 70, 260);
            for (let i = 0; i < 20; i++) x.fillRect(120 + i * 17, 460, 10, 12);
            x.fillStyle = '#f0c060';
            for (const [a, b] of [[290, 380], [230, 420], [140, 470], [320, 450], [420, 480]]) x.fillRect(a - 3, b, 6, 10);
            // dragon
            x.save(); x.translate(640, 200); x.scale(0.9, 0.9); x.fillStyle = '#140c14';
            x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-60, -80, -150, -50); x.quadraticCurveTo(-80, -30, -40, 10); x.quadraticCurveTo(-90, 10, -130, 60); x.quadraticCurveTo(-40, 40, 10, 20);
            x.quadraticCurveTo(60, 30, 90, 10); x.lineTo(110, 0); x.lineTo(90, -6); x.quadraticCurveTo(50, -10, 0, 0); x.fill();
            x.beginPath(); x.moveTo(0, 6); x.quadraticCurveTo(60, -100, 130, -60); x.quadraticCurveTo(90, -50, 40, 10); x.fill();
            x.restore();
            x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 600, VW, 168);
            Art.add(this, 'menubg', c);
        }
        this.add.image(0, 0, 'menubg').setOrigin(0);
        UI.text(this, VW / 2, 70, 'Heroes of the Realm', 54, '#f8e0a0', { origin: 0.5, title: true, stroke: 6 });
        UI.text(this, VW / 2, 122, 'Might & Magic Conquest', 22, '#e0c080', { origin: 0.5, title: true, stroke: 4 });
    }
    clearUI() { (this.ui || []).forEach(o => o.destroy()); this.ui = []; }
    keep(o) { this.ui.push(o); return o; }
    mainMenu() {
        this.clearUI();
        const p = this.keep(UI.panel(this, VW / 2 - 160, 200, 320, 330, { alpha: 0.92 }));
        const hasAuto = !!Core.saveMeta('auto');
        const items = [
            ['New Game', () => this.newGameMenu()],
            ['Continue', () => { if (Core.load('auto')) this.scene.start('Adventure'); }, !hasAuto],
            ['Load Game', () => loadDialog(this, () => this.scene.start('Adventure'))],
            ['How to Play', () => showHelp(this)],
            [`Music: ${Sfx.music ? 'On' : 'Off'}`, () => { Sfx.unlock(); Sfx.toggleMusic(); this.mainMenu(); }],
        ];
        items.forEach(([l, fn, dis], i) => p.add(UI.button(this, 40, 30 + i * 58, 240, 44, l, fn, { title: true, size: 18, disabled: dis })));
        this.keep(UI.text(this, VW / 2, VH - 24, 'A single-player strategy game in the spirit of the classic Heroes of Might and Magic III.', 13, '#c0a880', { origin: 0.5 }));
    }
    newGameMenu() {
        this.clearUI();
        const o = this.opts;
        const p = this.keep(UI.panel(this, 112, 160, 800, 560, { alpha: 0.95 }));
        p.add(UI.text(this, 400, 16, 'New Random Map', 26, UI.GOLDS, { origin: [0.5, 0], title: true }));
        const row = (y, label, opts, cur, onPick, w = 150) => {
            p.add(UI.text(this, 30, y + 8, label, 17, UI.GOLDS, { title: true }));
            opts.forEach((op, i) => {
                const b = UI.button(this, 200 + i * (w + 8), y, w, 36, op.label, () => { onPick(op.value); this.savePrefs(); this.newGameMenu(); }, { size: 14 });
                if (op.value === cur) { const g = this.add.graphics(); g.lineStyle(3, 0xffe060).strokeRect(-2, -2, w + 4, 40); b.add(g); }
                p.add(b);
            });
        };
        row(70, 'Map Size', MAP_SIZES.map((s, i) => ({ label: `${s.name} (${s.n}×${s.n})`, value: i })), o.size, v => { o.size = v; o.opponents = Math.min(o.opponents, MAP_SIZES[v].maxP - 1); }, 136);
        const maxOpp = MAP_SIZES[o.size].maxP - 1;
        row(130, 'Opponents', Array.from({ length: maxOpp }, (_, i) => ({ label: String(i + 1), value: i + 1 })), o.opponents, v => o.opponents = v, 62);
        row(190, 'Difficulty', DIFFICULTY.map((d, i) => ({ label: d.name, value: i })), o.diff, v => o.diff = v, 136);
        p.add(UI.text(this, 30, 258, 'Your Faction', 17, UI.GOLDS, { title: true }));
        const facs = ['random'].concat(FACTION_IDS);
        facs.forEach((f, i) => {
            const x = 200 + (i % 4) * 146, y = 250 + Math.floor(i / 4) * 92;
            const b = UI.button(this, x, y, 138, 84, f === 'random' ? 'Random' : FACTIONS[f].name, () => { o.faction = f; this.savePrefs(); this.newGameMenu(); }, f === 'random' ? { size: 16 } : { icon: 'town_' + f, iconScale: 0.5 });
            if (o.faction === f) { const g = this.add.graphics(); g.lineStyle(3, 0xffe060).strokeRect(-2, -2, 142, 88); b.add(g); }
            p.add(b);
        });
        const fdesc = {
            random: 'A random faction is chosen for you.',
            castle: 'Knights and angels of the realm: solid infantry, marksmen, griffins and mighty Archangels.',
            rampart: 'Elves, dwarves and unicorns of the forest, with Gold Dragons at their command.',
            tower: 'Wizards of the snowy north: gremlins, golems, genies and lightning-hurling Titans.',
            inferno: 'Demons from the burning pits: imps, hell hounds, efreeti and Arch Devils.',
            necropolis: 'The undead legions: skeletons that rise from every fallen foe, vampires and Ghost Dragons.',
            stronghold: 'Barbarian hordes: goblins, wolf riders, ogres, cyclopes and Ancient Behemoths.',
        };
        p.add(UI.text(this, 200, 440, fdesc[o.faction], 14, UI.TXT, { wrap: 570 }));
        p.add(UI.text(this, 30, 478, `${o.opponents} computer opponent${o.opponents > 1 ? 's' : ''} on a ${MAP_SIZES[o.size].name.toLowerCase()} map. Defeat them all to win.`, 14, UI.DIM));
        p.add(UI.button(this, 30, 506, 140, 40, 'Back', () => this.mainMenu(), { title: true }));
        p.add(UI.button(this, 610, 506, 160, 40, 'Start Game', () => this.start(), { title: true, size: 18 }));
    }
    start() {
        this.clearUI();
        const msg = this.keep(UI.text(this, VW / 2, 400, 'Generating the world...', 28, UI.GOLDS, { origin: 0.5, title: true }));
        this.time.delayedCall(60, () => {
            const o = this.opts;
            const fac = o.faction === 'random' ? R.pick(FACTION_IDS) : o.faction;
            const players = [{ faction: fac, human: true, color: 0 }];
            for (let i = 1; i <= o.opponents; i++) players.push({ faction: R.pick(FACTION_IDS), human: false, color: i });
            MapGen.generate({ size: o.size, players, diff: o.diff, seed: (Date.now() & 0x7fffffff) });
            this.scene.start('Adventure');
        });
    }
}
