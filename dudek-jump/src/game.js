// The climb itself: Dudek bounces from board to board, the camera only ever follows him up,
// and anything that drops below the bottom of the painting is gone.
const GRAV = 1700, JUMP = 980, SPRING = 1640, RUN = 470;
const STORK_V = 1050, STORK_T = 2.4, APPLE_V = 1250;
const PS = 0.82, PH = 96 * PS;              // Dudek's scale and height on screen
const PW = Art.PLAT_W - 12, PTOP = Art.PLAT_TOP;
const EDGE = 64;                            // platforms keep this far from the screen edges

function hiScore(v) {
    try {
        const cur = parseInt(localStorage.getItem('dudekjump.hi') || '0', 10) || 0;
        if (v !== undefined && v > cur) { localStorage.setItem('dudekjump.hi', String(v)); return v; }
        return cur;
    } catch (e) { return v || 0; }
}
// folds an x that ran off one side back in, so the next board is never further than planned
const foldX = x => x < EDGE ? Math.min(2 * EDGE - x, VW - EDGE) : x > VW - EDGE ? Math.max(2 * (VW - EDGE) - x, EDGE) : x;
const rand = (a, b) => a + Math.random() * (b - a);

class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create() {
        this.ctrl = new Controller(this);
        this.cam = this.cameras.main;
        this.cam.setScroll(0, START_SCROLL);
        this.scenery = new Scenery(this);

        this.plats = []; this.items = []; this.foes = []; this.apples = [];
        this.plats.push({ type: 'ground', x: VW / 2, y: 0, w: 4000, vx: 0 });
        this.top = 0; this.lastX = VW / 2; this.nextFoeY = -3600;
        this.bonus = 0; this.best = 0; this.score = 0;
        this.over = false; this.paused = false; this.killer = null;

        this.p = { x: VW / 2, y: 0, vx: 0, vy: -JUMP, face: 1, state: 'play', t: 0, throwT: 0, landT: 0 };
        this.player = this.add.sprite(this.p.x, -PH / 2, 'dudek', 'jump').setScale(PS).setDepth(20);
        this.stork = this.add.sprite(0, 0, 'roda', 'fly1').setScale(0.9).setDepth(21).setVisible(false);
        this.generate();

        this.hud = this.add.text(22, 14, '0', txt(44, '#f8f2e2', '#2a1a14', 8)).setOrigin(0, 0).setScrollFactor(0).setDepth(60);
        this.add.text(VW - 22, 18, 'NAJBOLJE ' + hiScore(), txt(22, '#f2c230', '#2a1a14', 5)).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
        this.pauseText = this.add.text(VW / 2, VH / 2, 'PAUZA', txt(72, '#f8f2e2', '#2a1a14', 10)).setOrigin(0.5).setScrollFactor(0).setDepth(70).setVisible(false);
        this.input.on('pointerdown', () => { if (this.over && this.ready) this.scene.restart(); });

        playMusic('polka');
    }

    // ---- world generation ---------------------------------------------------------------------
    generate() {
        while (this.top > this.cam.scrollY - VH * 0.6) this.addRow();
    }

    addRow() {
        const h = -this.top, d = Phaser.Math.Clamp(h / 40000, 0, 1);
        const gap = rand(58 + 110 * d, 108 + 122 * d);
        const y = this.top - gap;
        // how far sideways Dudek can get before he falls back past the next board, with a margin
        const air = (JUMP + Math.sqrt(JUMP * JUMP - 2 * GRAV * gap)) / GRAV;
        const reach = Math.min(420, 0.75 * RUN * air);
        const x = foldX(this.lastX + rand(-reach, reach));
        const r = Math.random();
        const pMove = h > 900 ? 0.06 + 0.3 * d : 0, pCloud = h > 2600 ? 0.05 + 0.15 * d : 0;
        const type = r < pMove ? 'move' : r < pMove + pCloud ? 'cloud' : 'plank';
        const pl = this.makePlat(type, x, y, d);

        if (type !== 'cloud') {
            const q = Math.random();
            if (h > 2000 && q < 0.013) this.addItem('stork', pl, 0);
            else if (h > 300 && q < 0.08) this.addItem('spring', pl, rand(-30, 30));
            else if (q < 0.17) this.addItem('heart', pl, rand(-20, 20));
        }
        // straw sheaves look like boards but give way: never part of the path
        if (h > 1200 && Math.random() < 0.1 + 0.25 * d) {
            const sx = foldX(x + (Math.random() < 0.5 ? -1 : 1) * rand(170, 380)), sy = y + gap * rand(0.35, 0.65);
            if (!this.plats.some(o => !o.dead && Math.abs(o.y - sy) < 50 && Math.abs(o.x - sx) < PW + 20)) this.makePlat('sheaf', sx, sy, d);
        }
        if (y < this.nextFoeY && Math.random() < 0.05 + 0.1 * d) {
            this.addFoe(h > 12000 && Math.random() < 0.35 ? 'crni' : 'crow', y + gap * 0.5);
            this.nextFoeY = y - 700 + 300 * d;
        }
        this.top = y; this.lastX = x;
    }

    makePlat(type, x, y, d) {
        const tex = { plank: 'p_daska', move: 'p_skrinja', sheaf: 'p_snop', cloud: 'p_oblak' }[type];
        const spr = this.add.image(x, y - PTOP, tex).setOrigin(0.5, 0).setDepth(10);
        const pl = { type, x, y, w: PW, vx: 0, spr, item: null, dead: false };
        if (type === 'move') pl.vx = (Math.random() < 0.5 ? -1 : 1) * (70 + 140 * d);
        this.plats.push(pl);
        return pl;
    }

    addItem(kind, pl, ox) {
        const spr = kind === 'spring' ? this.add.sprite(0, 0, 'opruga', 'up').setOrigin(0.5, 1)
            : kind === 'stork' ? this.add.sprite(0, 0, 'roda', 'fly1').play('flap').setScale(0.7)
            : this.add.image(0, 0, 'srce');
        spr.setDepth(11);
        const it = { kind, pl, ox, spr, t: Math.random() * 6, dead: false };
        pl.item = it;
        this.items.push(it);
        this.placeItem(it);
    }

    placeItem(it) {
        const x = it.pl.x + it.ox, y = it.pl.y;
        if (it.kind === 'spring') it.spr.setPosition(x, y + 4);
        else if (it.kind === 'stork') it.spr.setPosition(x, y - 58 + Math.sin(it.t * 3) * 6);
        else it.spr.setPosition(x, y - 40 + Math.sin(it.t * 4) * 4);
    }

    addFoe(kind, y) {
        const baseX = rand(160, VW - 160);
        const f = { kind, baseX, x: baseX, y, baseY: y, t: Math.random() * 6, dead: false, hp: kind === 'crni' ? 3 : 1 };
        if (kind === 'crow') {
            f.spr = this.add.sprite(baseX, y, 'vrana', 'fly1').play('caw').setDepth(12);
            f.amp = rand(90, 220); f.speed = rand(1.2, 2.2); f.hw = 26; f.hh = 18; f.cy = 0;
        } else {
            f.cloud = this.add.image(baseX, y, 'crni_oblak').setOrigin(0.5, 0.3).setDepth(12);
            f.spr = this.add.sprite(baseX, y, 'crni', 'fall').setOrigin(0.5, 1).setScale(0.95).setDepth(12);
            f.amp = 160; f.speed = 0.9; f.hw = 26; f.hh = 44; f.cy = -44;
        }
        this.foes.push(f);
    }

    // ---- main loop ----------------------------------------------------------------------------
    update(time, delta) {
        const dt = Math.min(delta / 1000, 1 / 30);
        this.ctrl.update();
        if (this.over) {
            if (this.ready && this.ctrl.anyPressed()) this.scene.restart();
            return;
        }
        if (this.ctrl.pressed.start) {
            this.paused = !this.paused;
            this.pauseText.setVisible(this.paused);
            Sound.play('pause');
            if (this.paused) { this.tweens.pauseAll(); this.anims.pauseAll(); } else { this.tweens.resumeAll(); this.anims.resumeAll(); }
        }
        if (this.paused) return;

        this.updatePlatforms(dt);
        this.updatePlayer(dt);
        this.updateItems(dt);
        this.updateFoes(dt);
        this.updateApples(dt);

        const p = this.p;
        const line = this.cam.scrollY + VH * 0.42;
        if (p.state !== 'dead' && p.y - PH < line) this.cam.scrollY = p.y - PH - VH * 0.42;
        this.best = Math.max(this.best, -p.y);
        this.score = Math.floor(this.best / 10) + this.bonus;
        this.hud.setText(String(this.score));

        this.generate();
        this.cull();
        this.scenery.update(this.cam.scrollY, dt);
        if (p.y - PH > this.cam.scrollY + VH + 40) this.gameOver();
    }

    updatePlatforms(dt) {
        for (const pl of this.plats) {
            if (pl.dead || !pl.vx) continue;
            pl.x += pl.vx * dt;
            if (pl.x < EDGE) { pl.x = EDGE; pl.vx = Math.abs(pl.vx); }
            if (pl.x > VW - EDGE) { pl.x = VW - EDGE; pl.vx = -Math.abs(pl.vx); }
            pl.spr.x = pl.x;
        }
    }

    updatePlayer(dt) {
        const p = this.p, c = this.ctrl;
        if (p.state !== 'dead') {
            p.vx += (c.mx * RUN - p.vx) * Math.min(1, dt * 12);
            if (c.mx) p.face = c.mx > 0 ? 1 : -1;
        }
        if (p.state === 'fly') {
            p.vy = -STORK_V;
            p.t -= dt;
            if (p.t <= 0) this.endFly();
        } else p.vy += GRAV * dt;

        const prevY = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -30) p.x += VW + 60; else if (p.x > VW + 30) p.x -= VW + 60;

        if (p.state === 'play' && p.vy > 0) {
            for (const pl of this.plats) {
                if (pl.dead) continue;
                if (prevY <= pl.y && p.y >= pl.y && Math.abs(p.x - pl.x) < pl.w / 2 + 14) { this.land(pl); break; }
            }
        }

        p.throwT -= dt; p.landT -= dt;
        if (c.pressed.throw && p.state !== 'dead' && p.throwT <= 0) this.throwApple();

        const frame = p.state === 'dead' ? 'dead' : p.state === 'fly' ? 'hang' : p.throwT > 0.12 ? 'throw'
            : p.landT > 0 ? 'squat' : p.vy < 0 ? 'jump' : 'fall';
        const s = this.player;
        s.setFrame(frame).setFlipX(p.face < 0).setPosition(p.x, p.y - PH / 2);
        if (p.state === 'dead') s.angle += dt * 400;

        if (p.state === 'fly') {
            this.stork.setOrigin(p.face > 0 ? 66 / 144 : 78 / 144, 90 / 96).setFlipX(p.face < 0);
            this.stork.setPosition(p.x + 2 * p.face, p.y - PH + 10);
        }
    }

    land(pl) {
        const p = this.p;
        if (pl.type === 'sheaf') { this.breakSheaf(pl); return; }
        p.y = pl.y;
        const it = pl.item;
        if (it && it.kind === 'spring' && !it.dead && Math.abs(p.x - (pl.x + it.ox)) < 26) {
            p.vy = -SPRING;
            it.spr.setFrame('down');
            this.time.delayedCall(220, () => it.spr.active && it.spr.setFrame('up'));
            Sound.play('spring');
            this.tweens.add({ targets: this.player, angle: 360 * p.face, duration: 700, ease: 'Cubic.out', onComplete: () => { if (p.state !== 'dead') this.player.angle = 0; } });
        } else {
            p.vy = -JUMP;
            p.landT = 0.1;
            Sound.play('boing');
        }
        if (pl.type === 'cloud') this.vanishCloud(pl);
    }

    breakSheaf(pl) {
        pl.dead = true;
        pl.spr.setVisible(false);
        Sound.play('crack');
        for (const [k, dir] of [['p_snop_l', -1], ['p_snop_r', 1]]) {
            const half = this.add.image(pl.x, pl.y - PTOP, k).setOrigin(0.5, 0).setDepth(10);
            this.tweens.add({ targets: half, x: pl.x + dir * 40, y: pl.y + 500, angle: dir * 50, alpha: 0, duration: 900, ease: 'Quad.in', onComplete: () => half.destroy() });
        }
        this.burst('slama', pl.x, pl.y, 10);
    }

    vanishCloud(pl) {
        pl.dead = true;
        Sound.play('puff');
        this.tweens.add({ targets: pl.spr, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 350, onComplete: () => pl.spr.destroy() });
        this.burst('pahulja', pl.x, pl.y + 10, 8);
    }

    burst(tex, x, y, n) {
        for (let i = 0; i < n; i++) {
            const b = this.add.image(x + rand(-40, 40), y + rand(-6, 10), tex).setDepth(22).setAngle(rand(0, 360));
            this.tweens.add({ targets: b, x: b.x + rand(-60, 60), y: b.y + rand(40, 160), angle: b.angle + rand(-200, 200), alpha: 0, duration: rand(500, 900), onComplete: () => b.destroy() });
        }
    }

    floatText(x, y, s, color = '#f2c230') {
        const t = this.add.text(x, y, s, txt(26, color, '#2a1a14', 5)).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }

    throwApple() {
        const p = this.p;
        p.throwT = 0.28;
        const a = this.add.image(p.x + 6 * p.face, p.y - PH + 4, 'jabuka').setDepth(19);
        this.apples.push({ spr: a, vy: -APPLE_V, vx: p.vx * 0.15 });
        Sound.play('throw');
    }

    startFly(it) {
        const p = this.p;
        it.dead = true; it.spr.destroy();
        p.state = 'fly'; p.t = STORK_T; this.player.angle = 0;
        this.stork.setVisible(true).play('flap');
        Sound.play('stork');
    }

    endFly() {
        const p = this.p;
        p.state = 'play'; p.vy = -560;
        this.stork.setVisible(false).stop();
        const gone = this.add.sprite(this.stork.x, this.stork.y, 'roda', 'fly1').setOrigin(this.stork.originX, this.stork.originY)
            .setScale(0.9).setFlipX(p.face < 0).setDepth(21).play('flap');
        this.tweens.add({ targets: gone, x: gone.x + 500 * p.face, y: gone.y - 500, alpha: 0, duration: 1600, onComplete: () => gone.destroy() });
    }

    updateItems(dt) {
        const p = this.p;
        for (const it of this.items) {
            if (it.dead) continue;
            it.t += dt;
            this.placeItem(it);
            if (it.kind === 'spring' || p.state !== 'play') continue;
            const dx = Math.abs(p.x - it.spr.x), dy = Math.abs(p.y - PH / 2 - it.spr.y);
            if (it.kind === 'heart' && dx < 34 && dy < 50) {
                it.dead = true; it.spr.destroy();
                this.bonus += 25;
                Sound.play('coin');
                this.floatText(it.spr.x, it.spr.y, '+25');
                this.burst('iskra', it.spr.x, it.spr.y - 20, 6);
            } else if (it.kind === 'stork' && dx < 50 && dy < 60) this.startFly(it);
        }
    }

    updateFoes(dt) {
        const p = this.p;
        for (const f of this.foes) {
            if (f.dead) continue;
            f.t += dt;
            const nx = f.baseX + Math.sin(f.t * f.speed) * f.amp;
            f.spr.setFlipX(nx < f.x);
            f.x = nx; f.y = f.baseY + Math.sin(f.t * 2.6) * 8;
            f.spr.setPosition(f.x, f.y);
            if (f.cloud) f.cloud.setPosition(f.x, f.y);

            if (p.state === 'dead') continue;
            const cy = f.y + f.cy;
            const dx = Math.abs(p.x - f.x), dy = Math.abs(p.y - PH / 2 - cy);
            if (dx > f.hw + 18 || dy > f.hh + PH / 2 - 6) continue;
            if (p.state === 'fly') { this.killFoe(f); continue; }
            if (p.vy > 0 && p.y < cy - f.hh + 26) {
                // landed on its head
                p.vy = -JUMP * 1.05;
                Sound.play('stomp');
                this.killFoe(f);
            } else this.hurt(f.kind);
        }
    }

    killFoe(f) {
        f.dead = true;
        const pts = f.kind === 'crni' ? 300 : 100;
        this.bonus += pts;
        this.floatText(f.x, f.y - 40, '+' + pts);
        if (f.kind === 'crow') this.burst('perce', f.x, f.y, 8);
        const parts = f.cloud ? [f.spr, f.cloud] : [f.spr];
        this.tweens.add({ targets: parts, y: '+=700', angle: 200, alpha: 0, duration: 1100, ease: 'Quad.in', onComplete: () => parts.forEach(s => s.destroy()) });
    }

    hurt(kind) {
        const p = this.p;
        this.killer = kind;
        p.state = 'dead'; p.vy = Math.max(p.vy, -200);
        Sound.stopMusic();
        Sound.play('hit');
        this.cam.shake(250, 0.01);
    }

    updateApples(dt) {
        for (const a of this.apples) {
            if (a.dead) continue;
            a.vy += GRAV * 0.25 * dt;
            a.spr.y += a.vy * dt; a.spr.x += a.vx * dt;
            a.spr.angle += dt * 600;
            if (a.spr.y < this.cam.scrollY - 40 || a.vy > 0) { a.dead = true; a.spr.destroy(); continue; }
            for (const f of this.foes) {
                if (f.dead) continue;
                if (Math.abs(a.spr.x - f.x) < f.hw + 8 && Math.abs(a.spr.y - (f.y + f.cy)) < f.hh + 8) {
                    a.dead = true; a.spr.destroy();
                    f.hp--;
                    Sound.play(f.hp > 0 ? 'bump' : 'stomp');
                    if (f.hp > 0) { f.spr.setTint(0xff6a4a); this.time.delayedCall(120, () => f.spr.active && f.spr.clearTint()); }
                    else this.killFoe(f);
                    break;
                }
            }
        }
        this.apples = this.apples.filter(a => !a.dead);
    }

    cull() {
        const bottom = this.cam.scrollY + VH + 120;
        for (const pl of this.plats) {
            if (pl.y > bottom) { pl.dead = true; pl.gone = true; if (pl.spr) pl.spr.destroy(); }
        }
        this.plats = this.plats.filter(pl => !pl.gone && !(pl.dead && !pl.spr?.active));
        for (const it of this.items) if (!it.dead && (it.pl.gone || it.pl.y > bottom)) { it.dead = true; it.spr.destroy(); }
        this.items = this.items.filter(it => !it.dead);
        for (const f of this.foes) if (!f.dead && f.y > bottom + 60) { f.dead = true; f.spr.destroy(); if (f.cloud) f.cloud.destroy(); }
        this.foes = this.foes.filter(f => !f.dead || f.spr.active);
    }

    gameOver() {
        this.over = true; this.ready = false;
        this.stork.setVisible(false);
        Sound.stopMusic();
        Sound.play(this.p.state === 'dead' ? 'gameover' : 'fall');
        const prev = hiScore(), isNew = this.score > prev, best = Math.max(prev, this.score);
        hiScore(this.score);

        const g = this.add.graphics().setScrollFactor(0).setDepth(70);
        const w = 560, h = 330, x = VW / 2 - w / 2, y = VH / 2 - h / 2;
        g.fillStyle(0x2a1a14, 0.35).fillRect(0, 0, VW, VH);
        g.fillStyle(0xf8f2e2, 1).lineStyle(5, 0x2a1a14, 1).fillRoundedRect(x, y, w, h, 18).strokeRoundedRect(x, y, w, h, 18);
        for (let i = 0; i < 13; i++) {
            g.fillStyle([0xcc2028, 0x3a9a40, 0x2a5ab0, 0xf2b62a][i % 4], 1);
            g.fillCircle(x + 40 + i * 40, y + 22, 5); g.fillCircle(x + 40 + i * 40, y + h - 22, 5);
        }
        const add = (yy, s, size, color) => this.add.text(VW / 2, yy, s, txt(size, color, '#2a1a14', 6)).setOrigin(0.5).setScrollFactor(0).setDepth(71);
        add(y + 74, this.killer === 'crni' ? 'Crni Dudek ga je zrušil!' : this.killer ? 'Joj, vrana ga je zrušila!' : 'Joj, Dudek je opal!', 40, '#cc2028');
        add(y + 140, 'BODOVI ' + this.score, 52, '#f2c230');
        add(y + 198, (isNew ? 'NOVI REKORD!  ' : 'NAJBOLJE ') + best, 28, isNew ? '#3a9a40' : '#2a5ab0');
        const again = add(y + 262, document.body.classList.contains('touch') ? 'DOTAKNI — još jemput' : 'RAZMAK / ENTER — još jemput', 28, '#2a1a14');
        again.setStroke('#f8f2e2', 4);
        this.tweens.add({ targets: again, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
        this.time.delayedCall(700, () => { this.ready = true; });
    }
}
