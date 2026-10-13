// Boot paints every texture; the title screen shows the village and Dudek warming up.
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        const t = this.add.text(VW / 2, VH / 2, 'Slikam Podravinu…', { fontFamily: 'Georgia', fontSize: '28px', color: '#f4e8c8' }).setOrigin(0.5);
        const go = () => {
            Art.build(this);
            this.anims.create({ key: 'flap', frames: this.anims.generateFrameNames('roda', { frames: ['fly1', 'fly2'] }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'caw', frames: this.anims.generateFrameNames('vrana', { frames: ['fly1', 'fly2'] }), frameRate: 6, repeat: -1 });
            t.destroy();
            this.scene.start('Title');
        };
        const fonts = document.fonts
            ? Promise.race([document.fonts.load('40px "Lilita One"', 'AZaz09ČĆŽŠĐčćžšđ'), new Promise(r => setTimeout(r, 2500))])
            : Promise.resolve();
        fonts.then(() => this.time.delayedCall(30, go), () => this.time.delayedCall(30, go));
    }
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        this.ctrl = new Controller(this);
        this.cameras.main.setScroll(0, START_SCROLL);
        this.scenery = new Scenery(this);
        const ui = o => o.setScrollFactor(0).setDepth(60);

        // the title, letter by letter in folk colours, each one bobbing like it's on a spring
        const cols = ['#d42020', '#f2b62a', '#3a9a40', '#2a5ab0'];
        const word = 'DUDEK', size = 124, spacing = 92, x0 = VW / 2 - (word.length - 1) * spacing / 2;
        [...word].forEach((ch, i) => {
            const l = ui(this.add.text(x0 + i * spacing, 128, ch, txt(size, cols[i % cols.length], '#2a1a14', 12)).setOrigin(0.5));
            l.setAngle((i % 2 ? 1 : -1) * 5).setShadow(5, 6, 'rgba(40,20,10,0.5)', 0, true, true);
            this.tweens.add({ targets: l, y: 104, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out', delay: i * 120, repeatDelay: 600 });
        });
        const g = ui(this.add.graphics());
        g.fillStyle(0xf8f2e2, 1).lineStyle(4, 0x2a1a14, 1);
        g.fillRoundedRect(VW / 2 - 200, 196, 400, 60, 14).strokeRoundedRect(VW / 2 - 200, 196, 400, 60, 14);
        for (let i = 0; i < 10; i++) { g.fillStyle(i % 2 ? 0x2a5ab0 : 0xcc2028, 1); g.fillCircle(VW / 2 - 180 + i * 40, 250, 3.5); }
        ui(this.add.text(VW / 2, 224, 'skoči do neba!', txt(38, '#cc2028', '#f8f2e2', 2)).setOrigin(0.5));

        // Dudek bouncing on a painted board, with a stork circling overhead
        this.add.image(300, -250 - Art.PLAT_TOP, 'p_daska').setOrigin(0.5, 0).setDepth(10);
        this.dudek = this.add.sprite(300, -250, 'dudek', 'jump').setScale(PS * 1.15).setDepth(20);
        this.dy = 0; this.dvy = -JUMP;
        this.roda = this.add.sprite(-120, -380, 'roda', 'fly1').play('flap').setDepth(21).setScale(0.8);
        this.tweens.add({ targets: this.roda, x: VW + 160, duration: 9000, repeat: -1, repeatDelay: 2500 });

        const panel = ui(this.add.graphics());
        panel.fillStyle(0x2a1a14, 0.55).fillRoundedRect(VW / 2 + 40, 300, 420, 250, 16);
        const lines = [
            ['← →  ili  A D', 'skakanje levo-desno'],
            ['↑  /  RAZMAK', 'hitanje jabuka'],
            ['ENTER  ·  M', 'pauza  ·  zvuk'],
        ];
        lines.forEach(([k, v], i) => {
            ui(this.add.text(VW / 2 + 70, 330 + i * 46, k, txt(24, '#f2c230', '#2a1a14', 5)).setOrigin(0, 0));
            ui(this.add.text(VW / 2 + 70, 330 + i * 46 + 24, v, txt(18, '#f8f2e2', '#2a1a14', 4)).setOrigin(0, 0));
        });
        ui(this.add.text(VW / 2 + 250, 510, 'Pazi na vrane i Crnoga Dudeka!\nRoda te nosi, opruga baca visoko.', txt(16, '#f8f2e2', '#2a1a14', 4)).setOrigin(0.5));
        ui(this.add.text(VW - 22, 18, 'NAJBOLJE ' + hiScore(), txt(22, '#f2c230', '#2a1a14', 5)).setOrigin(1, 0));
        const go = ui(this.add.text(VW / 2, 650, document.body.classList.contains('touch') ? 'DOTAKNI ZA POČETAK' : 'PRITISNI RAZMAK', txt(36, '#f8f2e2', '#2a1a14', 7)).setOrigin(0.5));
        this.tweens.add({ targets: go, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });

        this.input.on('pointerdown', () => this.start());
        playMusic('drava');
    }

    start() {
        if (this.leaving) return;
        this.leaving = true;
        wakeAudio();
        this.scene.start('Game');
    }

    update(time, delta) {
        const dt = Math.min(delta / 1000, 1 / 30);
        this.ctrl.update();
        if (this.ctrl.anyPressed()) this.start();
        this.dvy += GRAV * dt; this.dy += this.dvy * dt;
        if (this.dy >= 0 && this.dvy > 0) { this.dy = 0; this.dvy = -JUMP * 0.6; }
        this.dudek.setPosition(300, -250 + this.dy - PH * 1.15 / 2).setFrame(this.dy > -12 ? 'squat' : this.dvy < 0 ? 'jump' : 'fall');
        this.scenery.update(START_SCROLL, dt);
    }
}
