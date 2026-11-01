'use strict';
// The C64 boot screen, title, stage cards and the end screens around the fights.

function label(scene, x, y, str, size, color, o = {}) {
    return scene.add.text(x, y, str, Object.assign({
        fontFamily: PIXFONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: Math.max(3, size / 5), align: 'center',
    }, o)).setOrigin(0.5).setDepth(20);
}

function prose(scene, x, y, str, size, color, o = {}) {
    return label(scene, x, y, str, size, color, Object.assign({ fontFamily: FONT, strokeThickness: 5, lineSpacing: 6 }, o));
}

function blink(scene, t) { scene.tweens.add({ targets: t, alpha: 0.2, yoyo: true, repeat: -1, duration: 450 }); return t; }

// "LOAD"YIE AR KUNG-FU",8,1" on a blue C64 screen, the tape-style border stripes, then RUN.
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        const IX = 64, IY = 64, IW = W - 128, IH = H - 128;
        this.border = this.add.graphics();
        this.border.fillStyle(C.lblue); this.border.fillRect(0, 0, W, H);
        this.add.graphics().fillStyle(C.blue).fillRect(IX, IY, IW, IH);
        this.lines = ['', '    **** COMMODORE 64 BASIC V2 ****', '', ' 64K RAM SYSTEM  38911 BASIC BYTES FREE', '', 'READY.', ''];
        this.text = this.add.text(IX + 16, IY + 8, '', { fontFamily: PIXFONT, fontSize: '20px', color: hexStr(C.lblue), lineSpacing: 12 });
        this.cursor = this.add.rectangle(0, 0, 20, 20, C.lblue).setOrigin(0);
        this.loading = false;
        this.refresh();
        this.time.addEvent({ delay: 330, loop: true, callback: () => this.cursor.setVisible(!this.cursor.visible) });

        const steps = [
            d => this.time.delayedCall(700, d),
            d => this.type('LOAD"YIE AR KUNG-FU",8,1', d),
            d => this.print(['', 'SEARCHING FOR YIE AR KUNG-FU'], 700, d),
            d => this.print(['LOADING'], 200, d),
            d => { this.loading = true; this.time.delayedCall(1800, () => { this.loading = false; this.drawBorder(); d(); }); },
            d => this.print(['READY.', ''], 300, d),
            d => this.type('RUN', d),
            d => this.time.delayedCall(400, d),
        ];
        let i = 0;
        const next = () => { if (this.done) return; const s = steps[i++]; s ? s(next) : this.go(); };
        next();
        this.input.keyboard.on('keydown', () => { Sound.init(); this.go(); });
        this.input.on('pointerdown', () => { Sound.init(); this.go(); });
    }
    refresh() {
        this.text.setText(this.lines.join('\n'));
        const last = this.lines[this.lines.length - 1];
        this.cursor.setPosition(this.text.x + last.length * 20, this.text.y + (this.lines.length - 1) * 32);
    }
    type(str, done) {
        let n = 0;
        this.time.addEvent({
            delay: 75, repeat: str.length - 1, callback: () => {
                this.lines[this.lines.length - 1] += str[n++];
                Sound.sfx('type');
                this.refresh();
                if (n === str.length) this.time.delayedCall(250, done);
            },
        });
    }
    print(rows, wait, done) {
        this.lines.pop();
        this.lines.push(...rows, '');
        this.refresh();
        this.time.delayedCall(wait, done);
    }
    drawBorder() {
        const b = this.border;
        b.clear();
        if (!this.loading) { b.fillStyle(C.lblue); b.fillRect(0, 0, W, H); return; }
        const cols = Object.values(C);
        for (let y = 0; y < H;) {
            const h = 4 + Math.random() * 18;
            b.fillStyle(cols[(Math.random() * cols.length) | 0]); b.fillRect(0, y, W, h);
            y += h;
        }
    }
    update() { if (this.loading) this.drawBorder(); }
    go() {
        if (this.done) return;
        this.done = true;
        this.scene.start('Title');
    }
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        addStage(this, 0);
        const v = lowres(this);
        drawFighter(v.g, OOLONG, POSES.highkick, 92, GROUND, 1, { scale: 1.3 });
        drawFighter(v.g, OPPONENTS[3].look, POSES.thrust, 180, GROUND, -1, { scale: 1.3, active: true });
        v.flush();
        const hi = loadSave().hi;
        label(this, W / 2, 36, 'HI-SCORE ' + pad6(hi), 16, hexStr(C.yellow));
        label(this, W / 2, 120, 'YIE AR', 64, hexStr(C.yellow), { stroke: hexStr(C.red), strokeThickness: 12 });
        label(this, W / 2, 205, 'KUNG-FU', 84, '#ffffff', { stroke: hexStr(C.red), strokeThickness: 14 });
        prose(this, W / 2, 275, 'Oolong kreće na put da postane veliki majstor kung-fua', 24, '#ffffff');
        blink(this, label(this, W / 2, 330, 'PRITISNI SPACE', 22, hexStr(C.cyan)));
        const band = this.add.graphics().setDepth(19);
        band.fillStyle(0x000000, 0.75); band.fillRect(0, 668, W, 100);
        prose(this, W / 2, 716, [
            '← → hod   ·   ↑ skok   ·   ↓ čučanj   ·   Z/Y ruka   ·   X noga   ·   C visoka noga',
            'u skoku X leteći udarac   ·   čučeći Z/X niski udarci   ·   P pauza   ·   M glazba',
        ].join('\n'), 19, hexStr(C.lgrey));
        this.add.text(W - 8, H - 6, 'fan-remake u čast Yie Ar Kung-Fua (Konami / Imagine, C64 1985)', {
            fontFamily: FONT, fontSize: '12px', color: '#777777',
        }).setOrigin(1, 1).setDepth(20);

        const start = () => {
            Sound.init(); Sound.music(true); Sound.sfx('select');
            this.scene.start('Stage', { stage: 0, loop: 0, score: 0, lives: 3 });
        };
        this.input.keyboard.on('keydown', e => {
            Sound.init(); Sound.music(true);
            if (e.code === 'Space' || e.code === 'Enter') start();
            if (e.code === 'KeyM') Sound.toggleMusic();
        });
        this.input.on('pointerdown', start);
    }
}

// The card before each fight: who is next, what they fight with, and the ladder of masters.
class StageScene extends Phaser.Scene {
    constructor() { super('Stage'); }
    init(run) { this.run = run; }
    create() {
        const run = this.run, D = OPPONENTS[run.stage];
        this.cameras.main.setBackgroundColor('#000000');
        const v = lowres(this), g = v.g;
        g.fillStyle(C.blue); g.fillRect(0, 128, 116, 2);
        drawFighter(g, D.look, POSES.idle, 54, 128, 1, { scale: 1.25, active: true });
        if (D.minions) {
            const mini = Object.assign({}, D.look, { size: 0.55 });
            drawFighter(g, mini, POSES.idle, 22, 128, 1, { scale: 1.25 });
            drawFighter(g, mini, POSES.walk1, 92, 128, -1, { scale: 1.25 });
        }
        OPPONENTS.forEach((O, i) => {
            const x = 13 + i * 23, beaten = i < run.stage;
            drawFighter(g, O.look, beaten ? POSES.down : POSES.idle, x + (beaten ? 4 : 0), 184, 1, { scale: 0.42, tint: beaten ? C.dgrey : undefined });
            if (i === run.stage) { g.lineStyle(1, C.yellow); g.strokeRect(x - 11, 150, 22, 37); }
        });
        v.flush();

        const T = (y, str, size, col, font = PIXFONT, o = {}) => this.add.text(470, y, str, Object.assign({
            fontFamily: font, fontSize: size + 'px', color: col, wordWrap: { width: 520 }, lineSpacing: 6,
        }, o)).setDepth(20);
        T(100, `STAGE ${run.stage + 1}` + (run.loop ? `   KRUG ${run.loop + 1}` : ''), 26, hexStr(C.cyan));
        T(150, D.name, 44, hexStr(C.yellow));
        T(222, 'oružje: ' + D.arms, 24, hexStr(C.lgrey), FONT);
        T(280, `„${D.taunt}“`, 26, hexStr(C.lred), FONT);
        T(390, 'Savjet: ' + D.tip, 21, hexStr(C.lgreen), FONT);
        blink(this, T(530, 'SPACE - BORBA!', 18, '#ffffff'));
        this.add.text(24, 20, `SCORE ${pad6(run.score)}     ŽIVOTI ${run.lives}`, { fontFamily: FONT, fontSize: '20px', color: '#ffffff' });
        this.add.text(W / 2, 580, 'PROTIVNICI', { fontFamily: PIXFONT, fontSize: '12px', color: '#777777' }).setOrigin(0.5);

        Sound.sfx('select');
        let gone = false;
        const go = () => { if (gone) return; gone = true; Sound.init(); this.scene.start('Fight', run); };
        this.time.delayedCall(6000, go);
        this.input.keyboard.on('keydown', e => {
            if (e.code === 'KeyM') return Sound.toggleMusic();
            if (e.code === 'Escape') { gone = true; return this.scene.start('Title'); }
            go();
        });
        this.input.on('pointerdown', go);
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOver'); }
    init(run) { this.run = run; }
    create() {
        const run = this.run, D = OPPONENTS[run.stage];
        const hi = saveHi(run.score);
        this.cameras.main.setBackgroundColor('#000000');
        const v = lowres(this);
        v.g.fillStyle(C.dgrey); v.g.fillRect(40, 157, 176, 1);
        drawFighter(v.g, OOLONG, POSES.down, 104, 156, 1);
        drawFighter(v.g, D.minions ? Object.assign({}, D.look, { size: 0.7 }) : D.look, POSES.salute, 160, 156, -1);
        v.flush();
        Sound.music(false);
        Sound.sfx('lose');
        label(this, W / 2, 150, 'GAME OVER', 64, hexStr(C.lred));
        prose(this, W / 2, 240, `${D.name} je pobijedio Oolonga u ${run.stage + 1}. borbi` + (run.loop ? ` (${run.loop + 1}. krug)` : '') + '.', 26, '#ffffff');
        label(this, W / 2, 300, 'SCORE ' + pad6(run.score), 22, '#ffffff');
        label(this, W / 2, 340, 'HI-SCORE ' + pad6(hi), 18, hexStr(C.yellow));
        blink(this, label(this, W / 2, 690, 'SPACE - NOVA IGRA', 20, hexStr(C.cyan)));
        prose(this, W / 2, 735, 'ESC — naslovna', 18, '#888888');
        this.time.delayedCall(600, () => {
            this.input.keyboard.on('keydown', e => {
                if (e.code === 'Escape') return this.scene.start('Title');
                if (e.code === 'Space' || e.code === 'Enter') { Sound.music(true); this.scene.start('Stage', { stage: 0, loop: 0, score: 0, lives: 3 }); }
            });
        });
    }
}

class VictoryScene extends Phaser.Scene {
    constructor() { super('Victory'); }
    init(run) { this.run = run; }
    create() {
        const run = this.run;
        const hi = saveHi(run.score);
        addStage(this, 2);
        const v = lowres(this);
        OPPONENTS.forEach((O, i) => {
            const x = 12 + i * 21 + (i >= 5 ? 26 : 0);
            drawFighter(v.g, O.look, POSES.salute, x, GROUND - 4, i < 5 ? 1 : -1, { scale: 0.6, active: true });
        });
        drawFighter(v.g, OOLONG, POSES.salute, 128, GROUND + 6, 1, { scale: 1.3 });
        v.flush();
        Sound.sfx('gong');
        this.time.delayedCall(600, () => Sound.sfx('win'));
        label(this, W / 2, 150, 'VELIKI MAJSTOR!', 52, hexStr(C.yellow), { stroke: hexStr(C.red), strokeThickness: 10 });
        prose(this, W / 2, 230, 'Oolong je pobijedio svih jedanaest majstora.\nSad je on veliki majstor kung-fua — dok ga netko ne izazove.', 26, '#ffffff');
        label(this, W / 2, 310, 'SCORE ' + pad6(run.score) + '   HI ' + pad6(hi), 18, '#ffffff');
        blink(this, prose(this, W / 2, 370, `SPACE — ${run.loop + 2}. krug (majstori su brži)`, 24, hexStr(C.cyan)));
        this.time.delayedCall(800, () => {
            this.input.keyboard.on('keydown', e => {
                if (e.code === 'Escape') return this.scene.start('Title');
                if (e.code === 'Space' || e.code === 'Enter') this.scene.start('Stage', { stage: 0, loop: run.loop + 1, score: run.score, lives: run.lives });
            });
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'game-container',
    backgroundColor: '#000000',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, StageScene, FightScene, GameOverScene, VictoryScene],
};

function startGame() { window.game = new Phaser.Game(config); }

// Text is drawn into canvases, so wait (briefly) for both pixel fonts, including Pixelify's Latin
// Extended subset for č ć š ž đ, before the first scene renders any.
if (document.fonts && document.fonts.load) {
    Promise.race([
        Promise.all([
            document.fonts.load('20px "Press Start 2P"', 'AZ09'),
            document.fonts.load('24px "Pixelify Sans"', 'AaČčĆćŠšŽžĐđ'),
        ]),
        new Promise(r => setTimeout(r, 2500)),
    ]).then(startGame, startGame);
} else startGame();
