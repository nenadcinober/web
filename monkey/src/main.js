// Boot, title and ending screens. The adventure itself is GameScene in engine.js.
const tstyle = (size, color = '#ffffff', stroke = '#2a1a14', thick = 6) => ({ fontFamily: FONT, fontSize: size + 'px', color, stroke, strokeThickness: thick, align: 'center' });

class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        const t = this.add.text(VW / 2, VH / 2, 'Slikam Podravinu…', { fontFamily: 'Georgia', fontSize: '28px', color: '#f4e8c8' }).setOrigin(0.5);
        const go = () => {
            Art.build(this);
            for (const id in Backgrounds.ROOMS) Backgrounds.ensure(this, id);
            t.destroy();
            this.scene.start('Title');
        };
        const fonts = document.fonts
            ? Promise.race([Promise.all([document.fonts.load('40px "Lilita One"', 'AZaz09'), document.fonts.load('40px "Lilita One"', 'ČĆŽŠĐčćžšđ„“')]), new Promise(r => setTimeout(r, 2500))])
            : Promise.resolve();
        fonts.then(() => this.time.delayedCall(30, go), () => this.time.delayedCall(30, go));
    }
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        this.add.image(0, 0, 'bg_obala').setOrigin(0, 0);
        this.add.rectangle(0, SH, VW, VH - SH, 0x1e1410).setOrigin(0, 0);
        const d = this.add.sprite(330, 520, 'ch_draz', 'stand').setOrigin(0.5, 1).setScale(1.05);
        this.add.sprite(540, 500, 'ch_jaga', 'stand').setOrigin(0.5, 1).setScale(0.8).setFlipX(true);
        this.time.addEvent({ delay: 2600, loop: true, callback: () => { d.setFrame('talk'); this.time.delayedCall(500, () => d.setFrame('stand')); } });

        const words = [['TAJNA', 74, 96], ['GRUNTOVEČKE ADE', 84, 178]];
        const cols = ['#d42020', '#f2b62a', '#3a9a40', '#2a5ab0'];
        let k = 0;
        for (const [w, size, y] of words) {
            const spacing = size * 0.62, x0 = VW / 2 - (w.length - 1) * spacing / 2;
            [...w].forEach((ch, i) => {
                if (ch === ' ') return;
                const l = this.add.text(x0 + i * spacing, y, ch, tstyle(size, cols[k++ % cols.length], '#2a1a14', 11)).setOrigin(0.5);
                l.setAngle((i % 2 ? 1 : -1) * 4);
                l.setShadow(4, 5, 'rgba(40,20,10,0.55)', 0, true, true);
                this.tweens.add({ targets: l, y: y - 8, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: i * 80 });
            });
        }
        this.add.text(VW / 2, 246, 'avantura Draža Gruntovčana', tstyle(28, '#f8f0d8', '#2a1a14', 6)).setOrigin(0.5);

        const items = [];
        const addItem = (label, y, fn) => {
            const t = this.add.text(VW / 2, y, label, tstyle(34, '#d8c898', '#000000', 4)).setOrigin(0.5).setInteractive({ useHandCursor: true });
            t.on('pointerover', () => t.setColor('#ffffff'));
            t.on('pointerout', () => t.setColor('#d8c898'));
            t.on('pointerdown', () => { Sound.init(); Sound.play('click'); fn(); });
            items.push(t);
        };
        const hasSave = GameScene.hasSave();
        if (hasSave) addItem('Nastavi', SH + 50, () => this.scene.start('Game', { load: true }));
        addItem('Nova igra', SH + (hasSave ? 100 : 70), () => {
            try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
            this.scene.start('Game', {});
        });
        this.add.text(VW / 2, VH - 34, 'Klikni glagol pa stvar. Desni klik radi ono očito. Točka preskače rečenicu, M gasi glazbu.', tstyle(17, '#9a8a6a', '#000000', 0)).setOrigin(0.5);
        this.input.once('pointerdown', () => { Sound.init(); Sound.music('drava'); });
        Sound.music('drava');
    }
}

class EndScene extends Phaser.Scene {
    constructor() { super('End'); }
    create() {
        this.cameras.main.setBackgroundColor('#1a1008');
        this.cameras.main.fadeIn(800);
        this.add.image(VW / 2, 300, 'bg_selo').setDisplaySize(VW * 0.7, SH * 0.7).setAlpha(0.9);
        this.add.text(VW / 2, 70, 'KRAJ', tstyle(96, '#f2b62a', '#2a1a14', 12)).setOrigin(0.5);
        const lines = [
            'Draž je postal pravi Gruntovčan,',
            'gruntovnica se vratila v Gruntovec,',
            'a bager i danas leži na dnu Drave.',
            '',
            'Regica peče bučnicu. Garo i dalje ne voli nikoga.',
        ].join('\n');
        this.add.text(VW / 2, 600, lines, tstyle(26, '#f8f0d8', '#2a1a14', 5)).setOrigin(0.5);
        const again = this.add.text(VW / 2, 728, 'Igraj opet', tstyle(30, '#d8c898', '#000000', 4)).setOrigin(0.5).setInteractive({ useHandCursor: true });
        again.on('pointerover', () => again.setColor('#ffffff'));
        again.on('pointerout', () => again.setColor('#d8c898'));
        again.on('pointerdown', () => this.scene.start('Title'));
        Sound.music('slavlje');
    }
}

window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: VW,
    height: VH,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, GameScene, EndScene],
});
