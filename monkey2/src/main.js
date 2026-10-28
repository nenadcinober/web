'use strict';

class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        for (const id in ICONS) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            ICONS[id](g);
            g.generateTexture('it_' + id, 64, 64);
            g.destroy();
        }
        this.scene.start('Title');
    }
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        const g = this.add.graphics();
        Draw.vgrad(g, 0, 0, W, 500, 0x05081e, 0x4a2a6a);
        Draw.stars(g, 0, 0, W, 360, 220, 5);
        Draw.moon(g, 820, 120, 54);
        Draw.vgrad(g, 0, 470, W, 298, 0x24306a, 0x0a1030, 14);
        for (let i = 0; i < 14; i++) { g.fillStyle(0xfff3c0, 0.4 - i * 0.025); g.fillRect(790 - i * 4, 480 + i * 12, 60 + i * 8, 2); }
        // The island, with a giant dumbbell-shaped rock
        g.fillStyle(0x0c1a14);
        g.fillPoints([{ x: 60, y: 560 }, { x: 160, y: 470 }, { x: 260, y: 440 }, { x: 420, y: 430 }, { x: 560, y: 450 }, { x: 680, y: 520 }, { x: 720, y: 580 }, { x: 40, y: 600 }], true);
        g.fillStyle(0x16261c); g.fillRect(250, 360, 120, 18); g.fillCircle(250, 369, 34); g.fillCircle(370, 369, 34);
        g.fillStyle(0x0c1a14); g.fillRect(296, 378, 28, 60);
        Draw.palm(g, 520, 452, 0.8);
        Draw.palm(g, 140, 492, 0.6);
        this.hero = makeDude(this, HERO_LOOK);
        this.hero.c.setPosition(310, 360).setDepth(10);
        this.hero.setScale(0.75);
        this.hero.pose = 'flex';
        const glow = this.add.graphics().setDepth(9);
        Draw.glow(glow, 310, 300, 120, 0xffe080, 0.04, 6);

        this.add.text(W / 2, 92, 'TAJNA OTOKA MIŠIĆA', {
            fontFamily: FONT, fontSize: '76px', color: '#ffcc33', stroke: '#6a2000', strokeThickness: 12, fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20);
        this.add.text(W / 2, 156, 'Gajbruš Bicepvud u avanturi punoj znoja, proteina i uvreda', {
            fontFamily: FONT, fontSize: '22px', color: '#f0e0ff', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(20);

        const btn = (y, label, fn) => {
            const t = this.add.text(760, y, label, {
                fontFamily: FONT, fontSize: '34px', color: '#3f9f4a', stroke: '#000000', strokeThickness: 5,
            }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
            t.on('pointerover', () => t.setColor('#c8ff70'));
            t.on('pointerout', () => t.setColor('#3f9f4a'));
            t.on('pointerdown', () => { Sound.init(); Sound.sfx('click'); fn(); });
            return t;
        };
        let y = 300;
        if (hasSave()) { btn(y, 'NASTAVI', () => this.scene.start('Game', { cont: true })); y += 56; }
        btn(y, 'NOVA IGRA', () => { clearSave(); this.scene.start('Game', { cont: false }); });

        this.add.text(W / 2, 708, 'Lijevi klik: odaberi glagol pa predmet  ·  Desni klik: zadana radnja\nKlik ili točka: preskoči govor  ·  M: glazba', {
            fontFamily: FONT, fontSize: '17px', color: '#9a8ac0', align: 'center',
        }).setOrigin(0.5).setDepth(20);
        this.add.text(W - 10, H - 8, 'parodija u čast Monkey Islanda', { fontFamily: FONT, fontSize: '12px', color: '#5a4a7a' }).setOrigin(1, 1).setDepth(20);
        this.input.keyboard.on('keydown-M', () => { Sound.init(); Sound.toggleMusic(); });
    }
    update(t, dt) { this.hero.update(Math.min(dt, 50)); }
}

const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, GameScene],
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
