// Boot (fonts, textures, maps) and the title screen.
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        const t = this.add.text(W / 2, H / 2, 'Kujem čelik i budim zmajeve…', { fontFamily: 'Georgia', fontSize: '24px', color: '#d8d0b8' }).setOrigin(0.5);
        const go = () => {
            World.build();
            Art.build(this);
            for (const id in World.maps) Art.minimap(this, World.maps[id]);
            t.destroy();
            this.scene.start('Title');
        };
        const fonts = document.fonts
            ? Promise.race([Promise.all([document.fonts.load('40px Cinzel', 'AZ'), document.fonts.load('20px "Alegreya Sans"', 'azčćžšđ')]), new Promise(r => setTimeout(r, 2500))])
            : Promise.resolve();
        fonts.then(() => this.time.delayedCall(30, go), () => this.time.delayedCall(30, go));
    }
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        const g = this.add.graphics();
        // night sky, aurora and layered mountains
        for (let y = 0; y < H; y += 4) { const t = y / H; g.fillStyle(Phaser.Display.Color.GetColor(10 + t * 30, 14 + t * 34, 28 + t * 40), 1).fillRect(0, y, W, 4); }
        for (let i = 0; i < 120; i++) g.fillStyle(0xffffff, Math.random() * 0.8).fillCircle(Math.random() * W, Math.random() * 420, Math.random() * 1.4);
        const aur = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.addCounter({
            from: 0, to: Math.PI * 2, duration: 9000, repeat: -1, onUpdate: tw => {
                const ph = tw.getValue();
                aur.clear();
                for (let x = 0; x < W; x += 8) {
                    const y = 150 + Math.sin(x / 140 + ph) * 40 + Math.sin(x / 60 + ph * 2) * 12;
                    aur.fillStyle(0x30ff9a, 0.05 + 0.04 * Math.sin(x / 90 + ph)).fillRect(x, y - 60, 8, 120);
                    aur.fillStyle(0x6a40ff, 0.03).fillRect(x, y - 110, 8, 60);
                }
            },
        });
        const ridge = (base, amp, col, seed, snow) => {
            const pts = [[0, H]];
            for (let x = 0; x <= W; x += 16) pts.push([x, base - fbm(x / 140, seed, seed) * amp]);
            pts.push([W, H]);
            g.fillStyle(col, 1).fillPoints(pts.map(([x, y]) => ({ x, y })), true);
            // snow on the upper slopes, thicker the higher the ridge
            const line = base - amp * 0.42;
            if (snow) for (let i = 1; i < pts.length - 2; i++) {
                const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
                const s1 = Math.max(0, line - y1) * 0.55, s2 = Math.max(0, line - y2) * 0.55;
                if (s1 || s2) g.fillStyle(0xe8eef4, 0.85).fillPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x2, y: y2 + s2 }, { x: x1, y: y1 + s1 }], true);
            }
        };
        ridge(560, 380, 0x2a3240, 3, true);
        ridge(640, 260, 0x1e242e, 7, true);
        ridge(740, 160, 0x12161c, 11, false);
        this.add.particles(0, 0, 'flake', { x: { min: 0, max: W }, y: -10, lifespan: 9000, speedY: { min: 30, max: 70 }, speedX: { min: -25, max: 5 }, scale: { min: 0.3, max: 1 }, alpha: { start: 0.8, end: 0.1 }, frequency: 60 });
        const drag = this.add.image(W + 200, 120, 'alduin').setScale(0.5).setRotation(-Math.PI / 2).setTint(0x101010).setAlpha(0.9);
        this.tweens.add({ targets: drag, x: -200, y: 90, duration: 14000, repeat: -1, delay: 1500, onRepeat: () => { drag.y = 120; } });

        const title = this.add.text(W / 2, 200, 'SKYRIM', hstyle(110, '#e8e4dc', { strokeThickness: 10 })).setOrigin(0.5);
        title.setShadow(0, 6, 'rgba(0,0,0,0.8)', 14, true, true);
        this.add.text(W / 2, 288, 'Z M A J O R O Đ E N I', hstyle(26, '#c8c0a8')).setOrigin(0.5);

        const menu = [];
        const item = (label, y, fn) => {
            const t = this.add.text(W / 2, y, label, hstyle(30, '#d8d0b8')).setOrigin(0.5).setInteractive({ useHandCursor: true });
            t.on('pointerover', () => t.setColor('#ffffff').setScale(1.06));
            t.on('pointerout', () => t.setColor('#d8d0b8').setScale(1));
            t.on('pointerdown', () => { Sfx.init(); Sfx.play('click'); fn(); });
            menu.push(t);
        };
        const start = () => { this.scene.start('Game'); };
        const save = loadSave();
        let y = 420;
        if (save) { item('Nastavi', y, () => { S = save; start(); }); y += 54; }
        item('Nova igra', y, () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ } S = newState(); start(); });
        this.add.text(W / 2, H - 190, CONTROLS, tstyle(14, '#8a8478', { align: 'center', lineSpacing: 3 })).setOrigin(0.5, 0);
        this.input.keyboard.once('keydown-ENTER', () => { Sfx.init(); if (save) S = save; else S = newState(); start(); });
        this.input.once('pointerdown', () => { Sfx.init(); Sfx.startMusic(); });
    }
}

window.game = new Phaser.Game({
    type: Phaser.AUTO,
    width: W, height: H,
    parent: 'game-container',
    backgroundColor: '#0b0c0e',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, GameScene, UIScene],
});
