// Menus and interstitials. GameScene lives in game.js.
const FONT = '"Lilita One", Georgia, sans-serif';
const txt = (size, color = '#ffffff', stroke = '#2a1a14', thick = 6) => ({ fontFamily: FONT, fontSize: size + 'px', color, stroke, strokeThickness: thick, align: 'center' });

function hiScore(v) {
    try {
        const cur = parseInt(localStorage.getItem('superdraz.hi') || '0', 10) || 0;
        if (v !== undefined && v > cur) { localStorage.setItem('superdraz.hi', String(v)); return v; }
        return cur;
    } catch (e) { return v || 0; }
}

function newGameState() { return { lives: 3, score: 0, coins: 0, level: 0, power: 0 }; }

function groundStrip(scene, theme, y = 14) {
    for (let i = 0; i < VW / T; i++) {
        scene.add.image(i * T, y * T, 'tiles_' + theme, 0).setOrigin(0, 0);
        scene.add.image(i * T, (y + 1) * T, 'tiles_' + theme, 1).setOrigin(0, 0);
    }
}

class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        const t = this.add.text(VW / 2, VH / 2, 'Slikam Podravinu…', { fontFamily: 'Georgia', fontSize: '28px', color: '#f4e8c8' }).setOrigin(0.5);
        const go = () => {
            Art.build(this);
            Backgrounds.ensure(this, 'village');
            this.anims.create({ key: 'spin', frames: ['c0', 'c1', 'c2', 'c3'].map(f => ({ key: 'coin', frame: f })), frameRate: 8, repeat: -1 });
            t.destroy();
            this.scene.start('Title');
        };
        const fonts = document.fonts ? Promise.race([Promise.all([document.fonts.load('40px "Lilita One"', 'AZaz09'), document.fonts.load('40px "Lilita One"', 'ČĆŽŠĐčćžšđ„"')]), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
        fonts.then(() => this.time.delayedCall(30, go), () => this.time.delayedCall(30, go));
    }
}

class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        this.add.image(0, 0, 'bgfar_village').setOrigin(0, 0);
        this.add.image(-380, 0, 'bgnear_village').setOrigin(0, 0);
        groundStrip(this, 'village');
        this.add.image(80, 14 * T, 'plast').setOrigin(0, 1);
        this.add.image(830, 14 * T, 'grm').setOrigin(0, 1);

        // the title, letter by letter in folk colours
        const word = 'SUPER DRAŽ', cols = ['#d42020', '#f2b62a', '#3a9a40', '#2a5ab0'];
        const size = 118, spacing = 76, x0 = VW / 2 - (word.length - 1) * spacing / 2;
        [...word].forEach((ch, i) => {
            if (ch === ' ') return;
            const l = this.add.text(x0 + i * spacing, 170, ch, txt(size, cols[i % cols.length], '#2a1a14', 12)).setOrigin(0.5);
            l.setAngle((i % 2 ? 1 : -1) * 4);
            l.setShadow(5, 6, 'rgba(40,20,10,0.55)', 0, true, true);
            this.tweens.add({ targets: l, y: 160, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: i * 90 });
        });
        const g = this.add.graphics();
        g.fillStyle(0xf8f2e2, 1).lineStyle(4, 0x2a1a14, 1);
        g.fillRoundedRect(VW / 2 - 250, 252, 500, 56, 14).strokeRoundedRect(VW / 2 - 250, 252, 500, 56, 14);
        for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? 0x2a5ab0 : 0xcc2028, 1); g.fillCircle(VW / 2 - 225 + i * 41, 300, 3.5); }
        this.add.text(VW / 2, 278, 'Dudek spašava Regicu', txt(34, '#cc2028', '#f8f2e2', 2)).setOrigin(0.5);

        const dudek = this.add.sprite(300, 14 * T, 'dudek_b', 'stand').setOrigin(0.5, 1).setScale(1.3);
        const regica = this.add.sprite(724, 14 * T, 'regica', 'stand').setOrigin(0.5, 1).setScale(1.3).setFlipX(true);
        this.time.addEvent({ delay: 1400, loop: true, callback: () => {
            dudek.setFrame(dudek.frame.name === 'wave' ? 'stand' : 'wave');
            regica.setFrame(regica.frame.name === 'wave' ? 'stand' : 'wave');
        } });
        const heart = this.add.image(512, 14 * T - 110, 'srce').setScale(1.2);
        this.tweens.add({ targets: heart, scale: 1.45, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

        const panel = this.add.graphics();
        panel.fillStyle(0x2a1a14, 0.55).fillRoundedRect(VW / 2 - 420, 350, 840, 136, 18);
        const touch = document.body.classList.contains('touch');
        const press = this.add.text(VW / 2, 380, touch ? 'DOTAKNI ZA POČETAK' : 'PRITISNI ENTER ZA POČETAK', txt(36, '#fff6d0')).setOrigin(0.5);
        this.tweens.add({ targets: press, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
        this.add.text(VW / 2, 432, '← →  hodaj    Z / RAZMAK  skok    X  trči i bacaj vatru    P  pauza    M  zvuk', txt(19, '#ffffff', '#2a1a14', 5)).setOrigin(0.5);
        this.add.text(VW / 2, 466, 'NAJBOLJI REZULTAT  ' + String(hiScore()).padStart(6, '0'), txt(22, '#f2b62a')).setOrigin(0.5);
        this.add.text(VW - 16, VH - 12, 'Podravina, 1970.', txt(18, '#f8f2e2', '#2a1a14', 4)).setOrigin(1, 1);

        this.ctrl = new Controller(this);
        this.input.keyboard.on('keydown', () => Sound.init());
        this.input.on('pointerdown', () => { Sound.init(); this.start(); });
    }
    start() {
        if (this.started) return;
        this.started = true;
        Sound.init();
        Sound.play('coin');
        this.registry.set('state', newGameState());
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(420, () => this.scene.start('Story'));
    }
    update() {
        this.ctrl.update();
        if (this.ctrl.pressed.start || this.ctrl.pressed.jump) this.start();
    }
}

class StoryScene extends Phaser.Scene {
    constructor() { super('Story'); }
    create() {
        Backgrounds.ensure(this, 'castle');
        this.add.image(-200, 0, 'bgfar_castle').setOrigin(0, 0);
        this.add.rectangle(0, 0, VW, VH, 0x0a0610, 0.55).setOrigin(0, 0);
        const lines = [
            'Ljeto je 1970. U Gruntovcu se sprema proštenje.',
            'Ali Crni Dudek, najgori razbojnik u cijeloj Podravini,',
            'oteo je Regicu i odveo ju u svoju kulu!',
            '',
            'Dudek mora proći selo, vinski podrum',
            'i obalu Drave da je spasi.',
            '',
            '„Bormeš, Regica, idem po tebe!"',
        ];
        lines.forEach((l, i) => {
            const t = this.add.text(VW / 2, 150 + i * 50, l, txt(i === 7 ? 36 : 30, i === 7 ? '#f2b62a' : '#f8f2e2')).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: t, alpha: 1, duration: 500, delay: 300 + i * 450 });
        });
        this.add.sprite(160, 690, 'dudek_b', 'wave').setOrigin(0.5, 1).setScale(1.4);
        this.add.sprite(870, 690, 'boss', 'stand').setOrigin(0.5, 1).setFlipX(true);
        this.add.text(VW / 2, 720, 'PRITISNI ENTER', txt(22, '#ffffff')).setOrigin(0.5);
        this.ctrl = new Controller(this);
        this.input.on('pointerdown', () => this.next());
        this.time.delayedCall(9000, () => this.next());
    }
    next() {
        if (this.done) return;
        this.done = true;
        this.scene.start('Intro');
    }
    update() { this.ctrl.update(); if (this.ctrl.anyPressed()) this.next(); }
}

class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }
    create() {
        const st = this.registry.get('state');
        const meta = Levels.build(st.level);
        this.cameras.main.setBackgroundColor('#1a1210');
        this.add.text(VW / 2, 250, 'SVIJET ' + meta.world, txt(52, '#f8f2e2')).setOrigin(0.5);
        this.add.text(VW / 2, 320, meta.name, txt(40, '#f2b62a')).setOrigin(0.5);
        this.add.sprite(VW / 2 - 50, 470, 'dudek_s', 'stand').setOrigin(0.5, 1).setScale(1.6);
        this.add.text(VW / 2 + 10, 440, '×  ' + st.lives, txt(40)).setOrigin(0, 0.5);
        this.add.text(VW / 2, 560, 'BODOVI ' + String(st.score).padStart(6, '0') + '      DINARI ' + String(st.coins).padStart(2, '0'), txt(24, '#c8b89a', '#1a1210', 2)).setOrigin(0.5);
        this.time.delayedCall(2300, () => this.scene.start('Game'));
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOver'); }
    create() {
        const st = this.registry.get('state');
        hiScore(st.score);
        Sound.stopMusic();
        Sound.play('gameover');
        this.cameras.main.setBackgroundColor('#1a1210');
        this.add.text(VW / 2, 300, 'IGRA JE GOTOVA', txt(64, '#d42020')).setOrigin(0.5);
        this.add.text(VW / 2, 380, '„Joj meni, kaj bu sad?"', txt(30, '#f8f2e2')).setOrigin(0.5);
        this.add.sprite(VW / 2, 520, 'dudek_s', 'dead').setOrigin(0.5, 1).setScale(2);
        this.add.text(VW / 2, 600, 'BODOVI ' + String(st.score).padStart(6, '0'), txt(28, '#f2b62a')).setOrigin(0.5);
        this.ctrl = new Controller(this);
        this.canLeave = false;
        this.time.delayedCall(1500, () => { this.canLeave = true; });
        this.time.delayedCall(7000, () => this.scene.start('Title'));
        this.input.on('pointerdown', () => { if (this.canLeave) this.scene.start('Title'); });
    }
    update() { this.ctrl.update(); if (this.canLeave && this.ctrl.anyPressed()) this.scene.start('Title'); }
}

class EndingScene extends Phaser.Scene {
    constructor() { super('Ending'); }
    create() {
        const st = this.registry.get('state');
        const best = hiScore(st.score);
        this.add.image(0, 0, 'bgfar_village').setOrigin(0, 0);
        this.add.image(-900, 0, 'bgnear_village').setOrigin(0, 0);
        groundStrip(this, 'village');
        this.add.image(700, 14 * T, 'house').setOrigin(0.5, 1);
        this.add.image(60, 14 * T, 'suncokret').setOrigin(0, 1);
        this.add.image(110, 14 * T, 'suncokret').setOrigin(0, 1);
        const d = this.add.sprite(340, 14 * T, 'dudek_b', 'stand').setOrigin(0.5, 1).setScale(1.3);
        const r = this.add.sprite(420, 14 * T, 'regica', 'happy').setOrigin(0.5, 1).setScale(1.3).setFlipX(true);
        this.time.addEvent({ delay: 700, loop: true, callback: () => {
            d.setFrame(d.frame.name === 'wave' ? 'stand' : 'wave');
            r.setFrame(r.frame.name === 'happy' ? 'wave' : 'happy');
        } });
        this.time.addEvent({ delay: 400, loop: true, callback: () => {
            const h = this.add.image(380 + Phaser.Math.Between(-40, 40), 14 * T - 150, 'heart_small').setScale(1.4);
            this.tweens.add({ targets: h, y: h.y - 160, x: h.x + Phaser.Math.Between(-40, 40), alpha: 0, duration: 2200, onComplete: () => h.destroy() });
        } });
        const panel = this.add.graphics();
        panel.fillStyle(0xf8f2e2, 0.92).lineStyle(4, 0x2a1a14, 1);
        panel.fillRoundedRect(112, 70, 800, 300, 18).strokeRoundedRect(112, 70, 800, 300, 18);
        const lines = [
            ['„Dudek, moj junače! Hvala ti kaj si me spasil!"', '#cc2028', 30],
            ['Crni Dudek je pao u žeravicu,', '#2a1a14', 26],
            ['a Gruntovec opet ima mir.', '#2a1a14', 26],
            ['Na proštenju se svira, pleše i jede do jutra.', '#2a1a14', 26],
            ['KRAJ', '#2a5ab0', 44],
        ];
        lines.forEach(([l, c, s], i) => {
            const t = this.add.text(VW / 2, 112 + i * 52, l, txt(s, c, '#f8f2e2', 2)).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: t, alpha: 1, duration: 600, delay: 400 + i * 900 });
        });
        this.add.text(VW / 2, 400, 'BODOVI ' + String(st.score).padStart(6, '0') + '     NAJBOLJI ' + String(best).padStart(6, '0'), txt(26, '#f2b62a')).setOrigin(0.5);
        Sound.music('polka');
        this.ctrl = new Controller(this);
        this.canLeave = false;
        this.time.delayedCall(4500, () => { this.canLeave = true; this.add.text(VW / 2, 440, 'PRITISNI ENTER', txt(22)).setOrigin(0.5); });
        this.input.on('pointerdown', () => this.leave());
    }
    leave() { if (this.canLeave) { Sound.stopMusic(); this.scene.start('Title'); } }
    update() { this.ctrl.update(); if (this.ctrl.anyPressed()) this.leave(); }
}
