'use strict';
// Title, opponent ladder, pre-fight card and the result screens around the fight.
const SAVE_KEY = 'punchout.save.v1';

function loadSave() {
    try { return Object.assign({ unlocked: 0, beaten: [] }, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { return { unlocked: 0, beaten: [] }; }
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }

function button(scene, x, y, label, fn, size = 34) {
    const t = scene.add.text(x, y, label, {
        fontFamily: FONT, fontSize: size + 'px', color: '#ffdd33', stroke: '#000000', strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor('#ffffff'));
    t.on('pointerout', () => t.setColor('#ffdd33'));
    t.on('pointerdown', () => { Sound.init(); Sound.sfx('select'); fn(); });
    return t;
}

function backdrop(scene, dim = 0.55) {
    const g = scene.add.graphics();
    drawArena(g, 5);
    g.fillStyle(0x000000, dim); g.fillRect(0, 0, W, H);
    return g;
}

// A fighter's portrait inside a masked frame, so the legs don't spill out.
function portrait(scene, look, x, y, s, frame, p = {}) {
    const g = scene.add.graphics().setPosition(x, y).setScale(s).setDepth(5);
    drawFighter(g, look, pose(Object.assign({ lx: -70, ly: -10, rx: 70, ry: -10 }, p)));
    if (frame) {
        const m = scene.make.graphics({ add: false });
        m.fillStyle(0xffffff); m.fillRect(frame.x, frame.y, frame.w, frame.h);
        g.setMask(m.createGeometryMask());
    }
    return g;
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        backdrop(this, 0.45);
        portrait(this, DUDEK, 250, 470, 1.15, null, { lx: -40, ly: -170, rx: 70, ry: -110, face: 'grin' });
        const champ = OPPONENTS[OPPONENTS.length - 1];
        portrait(this, champ.look, 790, 470, 1.15, null, { lx: -110, ly: -60, rx: 40, ry: -160, face: 'angry', flash: 0.82, flashColor: 0x120a06 });
        this.add.text(W / 2, 92, 'GRUNTOVEČKI', {
            fontFamily: FONT, fontSize: '56px', color: '#ffffff', stroke: '#8a0a0a', strokeThickness: 10, fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20);
        this.add.text(W / 2, 162, 'PUNCH-OUT!!', {
            fontFamily: FONT, fontSize: '92px', color: '#ffcc22', stroke: '#8a0a0a', strokeThickness: 14, fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20);
        this.add.text(W / 2, 228, 'Dudek iz Gruntovca kreće po pojas prvaka Podravine', {
            fontFamily: FONT, fontSize: '22px', color: '#f0e0c0', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(20);
        const go = button(this, W / 2, 330, 'U RING!', () => this.scene.start('Select'), 48);
        this.tweens.add({ targets: go, scale: 1.08, yoyo: true, repeat: -1, duration: 500 });
        const band = this.add.graphics().setDepth(19);
        band.fillStyle(0x000000, 0.7); band.fillRect(0, 600, W, 82);
        this.add.text(W / 2, 640, [
            '← → izmicanje   ·   ↓ gard   ·   Z / X lijevi / desni u trbuh   ·   ↑ + Z / X u glavu',
            'ENTER ili SPACE zvjezdani aperkat   ·   P pauza   ·   M glazba',
        ].join('\n'), {
            fontFamily: FONT, fontSize: '19px', color: '#e0d0b0', stroke: '#000000', strokeThickness: 4, align: 'center', lineSpacing: 8,
        }).setOrigin(0.5).setDepth(20);
        this.add.text(W - 10, H - 8, 'parodija u čast Punch-Outa', { fontFamily: FONT, fontSize: '13px', color: '#8a7a6a' }).setOrigin(1, 1).setDepth(20);
        const start = () => { Sound.init(); this.scene.start('Select'); };
        this.input.keyboard.once('keydown-ENTER', start);
        this.input.keyboard.once('keydown-SPACE', start);
        this.input.keyboard.on('keydown-M', () => { Sound.init(); Sound.toggleMusic(); });
    }
}

class SelectScene extends Phaser.Scene {
    constructor() { super('Select'); }
    create() {
        backdrop(this, 0.7);
        const save = loadSave();
        this.add.text(W / 2, 56, 'PODRAVSKA LIGA', {
            fontFamily: FONT, fontSize: '54px', color: '#ffcc22', stroke: '#8a0a0a', strokeThickness: 10, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add.text(W / 2, 108, 'Pobijedi sve redom i pojas prvaka ide v Gruntovec', {
            fontFamily: FONT, fontSize: '20px', color: '#f0e0c0', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);
        OPPONENTS.forEach((D, i) => {
            const cx = 140 + i * 248, cy = 150, cw = 220, ch = 400;
            const open = i <= save.unlocked, beaten = save.beaten.includes(D.id);
            const g = this.add.graphics();
            g.fillStyle(open ? 0x3a2414 : 0x1a1410); g.fillRoundedRect(cx - cw / 2, cy, cw, ch, 14);
            g.lineStyle(4, beaten ? 0x40d060 : open ? 0xf0d060 : 0x4a4a4a); g.strokeRoundedRect(cx - cw / 2, cy, cw, ch, 14);
            portrait(this, D.look, cx, cy + 230, 0.85, { x: cx - cw / 2 + 4, y: cy + 4, w: cw - 8, h: 250 },
                open ? { face: 'angry' } : { flash: 0.92, flashColor: 0x0a0806 });
            const t = (y, str, size, col) => this.add.text(cx, cy + y, str, {
                fontFamily: FONT, fontSize: size + 'px', color: col, stroke: '#000000', strokeThickness: 4, align: 'center', wordWrap: { width: cw - 16 },
            }).setOrigin(0.5, 0).setDepth(10);
            t(262, open ? D.name : '???', 24, '#ffffff');
            t(294, open ? `„${D.nick}“` : '', 18, '#ffcc22');
            t(322, open ? `${D.from} · ${D.record}` : 'zaključano', 17, '#c0b090');
            if (beaten) t(352, 'POBIJEĐEN ✔', 18, '#60e080');
            else if (open) t(352, 'BORI SE!', 20, '#ffdd33');
            if (open) {
                const z = this.add.zone(cx, cy + ch / 2, cw, ch).setInteractive({ useHandCursor: true });
                z.on('pointerover', () => { g.lineStyle(4, 0xffffff); g.strokeRoundedRect(cx - cw / 2, cy, cw, ch, 14); });
                z.on('pointerout', () => { g.lineStyle(4, beaten ? 0x40d060 : 0xf0d060); g.strokeRoundedRect(cx - cw / 2, cy, cw, ch, 14); });
                z.on('pointerdown', () => { Sound.init(); Sound.sfx('select'); this.scene.start('Intro', { idx: i }); });
            }
        });
        if (save.beaten.length >= OPPONENTS.length) {
            this.add.text(W / 2, 584, '★ Dudek je prvak Podravine! Možeš se boriti s kim god hoćeš.', {
                fontFamily: FONT, fontSize: '22px', color: '#ffe060', stroke: '#000000', strokeThickness: 4,
            }).setOrigin(0.5);
        }
        button(this, 150, 700, '← NAZAJ', () => this.scene.start('Title'), 26);
        const next = Math.min(save.unlocked, OPPONENTS.length - 1);
        button(this, W - 190, 700, 'SLJEDEĆA BORBA →', () => this.scene.start('Intro', { idx: next }), 26);
        this.input.keyboard.once('keydown-ENTER', () => { Sound.init(); this.scene.start('Intro', { idx: next }); });
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));
    }
}

class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }
    init(data) { this.idx = data.idx; }
    create() {
        const D = OPPONENTS[this.idx];
        backdrop(this, 0.6);
        portrait(this, DUDEK, 230, 470, 1.1, null, { lx: -40, ly: -160, rx: 40, ry: -160 });
        portrait(this, D.look, 794, 470, 1.1, null, { face: 'angry', lx: -45, ly: -150, rx: 45, ry: -150 });
        const t = (x, y, str, size, col, o = {}) => this.add.text(x, y, str, Object.assign({
            fontFamily: FONT, fontSize: size + 'px', color: col, stroke: '#000000', strokeThickness: 5, align: 'center',
        }, o)).setOrigin(0.5).setDepth(20);
        t(W / 2, 60, `${this.idx + 1}. BORBA`, 30, '#c0b090');
        t(W / 2, 330, 'VS', 110, '#ff3a3a', { fontStyle: 'bold', strokeThickness: 12 });
        t(230, 120, 'DUDEK', 40, '#ffffff', { fontStyle: 'bold' });
        t(230, 160, 'Gruntovec · 0 – 0', 20, '#c0b090');
        t(794, 120, D.name.toUpperCase(), 40, '#ffffff', { fontStyle: 'bold' });
        t(794, 160, `„${D.nick}“ · ${D.from} · ${D.record}`, 20, '#ffcc22');
        t(794, 188, D.job, 18, '#c0b090');
        const band = this.add.graphics().setDepth(19);
        band.fillStyle(0x000000, 0.75); band.fillRect(0, 590, W, 178);
        t(W / 2, 624, `${D.name}: „${D.intro}“`, 22, '#ff9a7a', { wordWrap: { width: 900 } });
        t(W / 2, 686, `${DIDA}: „${D.tips[0]}“`, 18, '#9fe0ff', { wordWrap: { width: 940 } });
        const go = t(W / 2, 742, 'SPACE ili klik — u ring!', 20, '#ffdd33');
        this.tweens.add({ targets: go, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
        const start = () => { Sound.init(); Sound.sfx('bell1'); this.scene.start('Fight', { idx: this.idx }); };
        this.input.once('pointerdown', start);
        this.input.keyboard.once('keydown-SPACE', start);
        this.input.keyboard.once('keydown-ENTER', start);
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('Select'));
    }
}

class ResultScene extends Phaser.Scene {
    constructor() { super('Result'); }
    init(data) { this.r = data; }
    create() {
        const r = this.r, D = OPPONENTS[r.idx], last = r.idx === OPPONENTS.length - 1;
        const save = loadSave();
        if (r.win) {
            if (!save.beaten.includes(D.id)) save.beaten.push(D.id);
            save.unlocked = Math.max(save.unlocked, Math.min(r.idx + 1, OPPONENTS.length - 1));
            writeSave(save);
        }
        backdrop(this, 0.6);
        const champion = r.win && last;
        if (r.win) {
            portrait(this, DUDEK, 300, 470, 1.15, null, { lx: -110, ly: -230, rx: 110, ry: -230, face: 'grin' });
            const loser = portrait(this, D.look, 780, 600, 0.9, null, { face: 'ko', lx: -140, ly: -10, rx: 140, ry: -10 });
            loser.setRotation(1.3);
        } else {
            portrait(this, D.look, 724, 470, 1.15, null, { lx: -110, ly: -230, rx: 110, ry: -230, face: 'grin' });
            const loser = portrait(this, DUDEK, 300, 600, 0.9, null, { face: 'ko', lx: -140, ly: -10, rx: 140, ry: -10 });
            loser.setRotation(-1.3);
        }
        if (champion) {
            const g = this.add.graphics().setDepth(4);
            const cols = [0xd42a2a, 0xffffff, 0x2a4ad4, 0xffd020];
            for (let i = 0; i < 120; i++) { g.fillStyle(cols[i % 4]); g.fillRect(Math.random() * W, Math.random() * H, 8, 14); }
            Sound.sfx('cheer');
        }
        const t = (y, str, size, col, o = {}) => this.add.text(W / 2, y, str, Object.assign({
            fontFamily: FONT, fontSize: size + 'px', color: col, stroke: '#000000', strokeThickness: 6, align: 'center', wordWrap: { width: 900 },
        }, o)).setOrigin(0.5).setDepth(20);
        const how = r.how === 'odluka' ? 'odlukom sudaca' : `${r.how} u ${r.round}. rundi (${r.time})`;
        t(70, champion ? 'PRVAK PODRAVINE!' : r.win ? 'POBJEDA!' : 'PORAZ!', 76, r.win ? '#ffcc22' : '#ff5050', { fontStyle: 'bold', strokeThickness: 10 });
        t(138, `${r.win ? 'Dudek je pobijedil' : 'Dudek je izgubil'} ${how}`, 26, '#ffffff');
        t(176, `Bodovi: ${r.points}`, 22, '#c0b090');
        t(232, r.win ? D.win : D.lose, 24, r.win ? '#9fe0a0' : '#ff9a7a');
        if (champion) t(300, 'Cijeli Gruntovec slavi v vatrogasnom domu, a Dida Imbro vozi bicikl oko ringa s pojasom na ramenu!', 22, '#ffe9a0');
        if (r.win && !last) {
            button(this, W / 2, 680, 'SLJEDEĆI PROTIVNIK →', () => this.scene.start('Intro', { idx: r.idx + 1 }), 34);
            button(this, W / 2, 736, 'LIGA', () => this.scene.start('Select'), 24);
        } else if (r.win) {
            button(this, W / 2, 690, 'LIGA', () => this.scene.start('Select'), 34);
        } else {
            button(this, W / 2, 680, 'REVANŠ!', () => this.scene.start('Intro', { idx: r.idx }), 38);
            button(this, W / 2, 736, 'LIGA', () => this.scene.start('Select'), 24);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, SelectScene, IntroScene, FightScene, ResultScene],
};

function startGame() { new Phaser.Game(config); }

// Text is drawn into canvases, so wait (briefly) for the pixel font, including its Latin Extended
// subset for č ć š ž đ, before the first scene renders any.
if (document.fonts && document.fonts.load) {
    Promise.race([
        Promise.all([document.fonts.load('24px "Pixelify Sans"', 'AaČčĆćŠšŽžĐđ'), document.fonts.load('bold 24px "Pixelify Sans"', 'AaČčĆćŠšŽžĐđ')]),
        new Promise(r => setTimeout(r, 2500)),
    ]).then(startGame, startGame);
} else startGame();
