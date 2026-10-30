'use strict';
// The fight: Dudek, seen from behind, against one opponent over three three-minute rounds.
const ROUND_SECS = 180, CLOCK_RATE = 2.6;
const OPP_X = 512, OPP_Y = 320, OPP_SCALE = 1.25, PL_X = 512, PL_Y = 690, PL_SCALE = 0.72;
const rand = (a, b) => a + Math.random() * (b - a);

// The attacking glove goes to (ax, ay), the other one stays up as a guard.
function atk(s, ax, ay, as, extra) {
    const base = s < 0 ? { lx: ax, ly: ay, ls: as, rx: 36, ry: -96 } : { rx: ax, ry: ay, rs: as, lx: -36, ly: -96 };
    return Object.assign(base, extra);
}

class FightScene extends Phaser.Scene {
    constructor() { super('Fight'); }

    init(data) {
        this.idx = data.idx;
        this.def = OPPONENTS[data.idx];
    }

    create() {
        const D = this.def;
        this.bg = this.add.graphics();
        drawArena(this.bg, 11 + this.idx);
        this.add.text(512, 102, 'VATROGASNI DOM GRUNTOVEC  ·  PODRAVSKA LIGA', { fontFamily: FONT, fontSize: '20px', color: '#ffe9a0', fontStyle: 'bold' }).setOrigin(0.5);
        const corner = this.add.graphics();
        drawBike(corner, 70, 352, 0.8);
        drawDida(corner, 56, 300, 0.55);
        this.crowdG = this.add.graphics().setDepth(2);
        this.refG = this.add.graphics().setDepth(8);
        this.oppG = this.add.graphics().setDepth(10);
        this.tellG = this.add.graphics().setDepth(11);
        this.plG = this.add.graphics().setDepth(20).setAlpha(0.84);
        this.fxG = this.add.graphics().setDepth(30);
        this.cloudG = this.add.graphics().setDepth(35);
        this.hudG = this.add.graphics().setDepth(50);

        const txt = (x, y, size, color, o = {}) => this.add.text(x, y, '', Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 4 }, o)).setDepth(51);
        this.heartT = txt(52, 14, 26, '#ff7a9a', { fontStyle: 'bold' });
        this.plNameT = txt(420, 8, 16, '#ffffff').setOrigin(1, 0).setText('DUDEK');
        this.opNameT = txt(420, 42, 16, '#ffffff').setOrigin(1, 0).setText(D.name.toUpperCase());
        this.pointsT = txt(1008, 10, 20, '#ffffff').setOrigin(1, 0);
        this.clockT = txt(1008, 42, 24, '#ffe060', { fontStyle: 'bold' }).setOrigin(1, 0);
        this.bigT = txt(512, 300, 84, '#ffdd33', { fontStyle: 'bold', strokeThickness: 10 }).setOrigin(0.5).setDepth(55).setAlpha(0);
        this.subT = txt(512, 560, 26, '#ffffff', { strokeThickness: 6 }).setOrigin(0.5).setDepth(55);
        this.countT = txt(512, 450, 120, '#ffffff', { fontStyle: 'bold', strokeThickness: 12 }).setOrigin(0.5).setDepth(55);
        this.popTs = [];

        this.round = 1;
        this.points = 0;
        this.oppPoints = 0;
        this.clock = 0;
        this.T = 0;
        this.pl = { hp: 100, hearts: D.hearts, maxHearts: D.hearts, stars: 0, state: 'idle', t: 0, downs: 0, totalDowns: 0, tired: false, dir: 1, hurtSide: 1 };
        this.opp = { hp: D.hp, state: 'guard', t: 0, guard: 'high', guardT: 1500, combo: 0, downs: 0, totalDowns: 0, nextAttack: 1500, move: null, side: 1, flinch: 0, hurtSide: 1, chainLeft: 0 };
        this.oppPose = pose({});
        this.plPose = pose({});
        this.sparks = [];
        this.flashes = [];
        this.cloud = 0;
        this.redFlash = 0;
        this.refShown = false;
        this.refArm = false;
        this.buffer = null;
        this.phase = 'intro';
        this.lastMove = null;

        this.setupInput();
        this.startRound(1);
    }

    // ---- Input ----------------------------------------------------------------------------------

    setupInput() {
        this.held = { up: false, down: false };
        const K = Phaser.Input.Keyboard.KeyCodes;
        this.keys = this.input.keyboard.addKeys({ up: K.UP, down: K.DOWN, w: K.W, s: K.S });
        this.input.keyboard.on('keydown', e => {
            if (e.repeat) return;
            const map = {
                ArrowLeft: 'dodgeL', KeyA: 'dodgeL', ArrowRight: 'dodgeR', KeyD: 'dodgeR',
                KeyZ: 'punchL', KeyJ: 'punchL', KeyX: 'punchR', KeyK: 'punchR',
                Enter: 'star', Space: 'star', KeyP: 'pause', Escape: 'pause', KeyM: 'music',
            };
            const a = map[e.code];
            if (a) { Sound.init(); this.act(a); }
        });
        this.input.on('pointerdown', () => { Sound.init(); if (this.phase === 'roundEnd') this.act('star'); });
        if (this.sys.game.device.input.touch) this.makeTouchPad();
    }

    makeTouchPad() {
        this.input.addPointer(3);
        const btn = (x, y, r, label, down, up) => {
            const g = this.add.graphics().setDepth(70);
            g.fillStyle(0xffffff, 0.16); g.fillCircle(x, y, r);
            g.lineStyle(3, 0xffffff, 0.45); g.strokeCircle(x, y, r);
            this.add.text(x, y, label, { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setDepth(71).setAlpha(0.8);
            const z = this.add.zone(x, y, r * 2, r * 2).setInteractive().setDepth(72);
            z.on('pointerdown', () => { Sound.init(); down(); });
            if (up) { z.on('pointerup', up); z.on('pointerout', up); }
        };
        btn(66, 690, 46, '◀', () => this.act('dodgeL'));
        btn(266, 690, 46, '▶', () => this.act('dodgeR'));
        btn(166, 712, 46, 'GARD', () => { this.held.down = true; }, () => { this.held.down = false; });
        btn(800, 610, 44, 'L↑', () => this.act('punchL', true));
        btn(916, 610, 44, 'D↑', () => this.act('punchR', true));
        btn(800, 712, 44, 'L↓', () => this.act('punchL', false));
        btn(916, 712, 44, 'D↓', () => this.act('punchR', false));
        btn(976, 520, 40, '★', () => this.act('star'));
        btn(980, 140, 28, '❚❚', () => this.act('pause'));
    }

    isHeld(k) {
        if (k === 'up') return this.keys.up.isDown || this.keys.w.isDown || this.held.up;
        return this.keys.down.isDown || this.keys.s.isDown || this.held.down;
    }

    act(a, high) {
        if (a === 'music') { Sound.toggleMusic(); return; }
        if (a === 'pause') { this.togglePause(); return; }
        if (this.phase === 'paused') return;
        if (this.phase === 'fight') {
            this.buffer = { a, at: this.T, high: high ?? this.isHeld('up') };
        } else if (this.phase === 'plDown' && (a === 'punchL' || a === 'punchR' || a === 'star')) {
            const P = this.pl;
            P.mash += 1;
            P.mashPose = !P.mashPose;
            if (P.mash >= P.mashNeed) this.plGetUp();
        } else if (this.phase === 'roundEnd' && this.cornerReady && a !== 'dodgeL' && a !== 'dodgeR') {
            this.cornerReady = false;
            Sound.sfx('select');
            this.startRound(this.round + 1);
        }
    }

    togglePause() {
        if (this.phase === 'paused') {
            this.phase = this.prevPhase;
            this.time.paused = false;
            this.tweens.resumeAll();
            this.pauseT.destroy();
        } else if (this.phase === 'fight' || this.phase === 'intro') {
            this.prevPhase = this.phase;
            this.phase = 'paused';
            this.time.paused = true;
            this.tweens.pauseAll();
            this.pauseT = this.add.text(512, 400, 'PAUZA\n\nP / ESC za nastavak', {
                fontFamily: FONT, fontSize: '44px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center',
            }).setOrigin(0.5).setDepth(80);
        }
    }

    // ---- Rounds, knockdowns and the end ---------------------------------------------------------

    startRound(n) {
        const P = this.pl, O = this.opp;
        this.round = n;
        this.clock = 0;
        P.downs = 0;
        O.downs = 0;
        this.phase = 'intro';
        if (this.overlay) { this.overlay.destroy(); this.overlay = null; }
        this.plSet('idle');
        this.oppToGuard();
        O.nextAttack = 1400;
        this.big(`${n}. RUNDA`, '#ffffff', 1100);
        Sound.sfx('bell1');
        this.time.delayedCall(1300, () => {
            this.big('BORBA!', '#ffdd33', 700);
            this.phase = 'fight';
        });
    }

    endRound() {
        this.phase = 'roundEnd';
        this.buffer = null;
        this.cloud = 0;
        this.plSet('idle');
        this.oppToGuard();
        Sound.sfx('bell');
        this.big('GONG!', '#ffffff', 1100);
        if (this.round >= 3) { this.time.delayedCall(1500, () => this.decision()); return; }
        this.time.delayedCall(1300, () => this.showCorner());
    }

    showCorner() {
        const D = this.def, P = this.pl, O = this.opp;
        P.hp = Math.min(100, P.hp + 30);
        P.hearts = P.maxHearts;
        P.tired = false;
        O.hp = Math.min(D.hp, O.hp + D.hp * 0.12);

        const c = this.add.container(0, 0).setDepth(60);
        this.overlay = c;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.75); g.fillRect(0, 0, W, H);
        g.fillStyle(0x2a1a10); g.fillRoundedRect(80, 150, 864, 460, 18);
        g.lineStyle(4, 0xf0d060); g.strokeRoundedRect(80, 150, 864, 460, 18);
        drawBike(g, 330, 540, 1.3);
        drawDida(g, 200, 330, 1.25, true);
        c.add(g);
        const t = (x, y, s, col, str, o = {}) => {
            const tx = this.add.text(x, y, str, Object.assign({ fontFamily: FONT, fontSize: s + 'px', color: col, stroke: '#000000', strokeThickness: 4 }, o));
            c.add(tx);
            return tx;
        };
        t(512, 168, 34, '#ffdd33', `KRAJ ${this.round}. RUNDE`, { fontStyle: 'bold' }).setOrigin(0.5, 0);
        t(200, 528, 20, '#ffe9a0', DIDA).setOrigin(0.5, 0);
        t(360, 240, 24, '#ffffff', '„' + D.tips[Math.min(this.round - 1, D.tips.length - 1)] + '“', { wordWrap: { width: 540 }, lineSpacing: 6 });
        const quip = D.quips[(this.round + this.idx) % D.quips.length];
        t(360, 470, 20, '#ff9a7a', `${D.name}: „${quip}“`, { wordWrap: { width: 540 } });
        const go = t(512, 560, 22, '#9fe0ff', 'SPACE, Z, X ili klik — sljedeća runda').setOrigin(0.5, 0);
        this.tweens.add({ targets: go, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
        this.cornerReady = false;
        this.time.delayedCall(700, () => { this.cornerReady = true; });
    }

    decision() {
        this.phase = 'over';
        this.big('ODLUKA SUDACA...', '#ffffff', 1600, 54);
        this.time.delayedCall(2000, () => this.finish(this.points > this.oppPoints, 'odluka'));
    }

    finish(win, how) {
        if (this.finished) return;
        this.finished = true;
        this.phase = 'over';
        if (this.countEv) this.countEv.remove();
        this.subT.setText('');
        if (win) {
            this.plSet('victory');
            if (this.opp.state !== 'down') this.opp.state = 'dizzy';
            this.big(how === 'odluka' ? 'POBJEDA NA BODOVE!' : how + '!', '#ffdd33', 2800, how === 'odluka' ? 60 : 110);
            Sound.sfx('win'); Sound.sfx('cheer');
        } else {
            this.opp.state = 'victory';
            this.big(how === 'odluka' ? 'PORAZ NA BODOVE' : how + '!', '#ff5050', 2800, how === 'odluka' ? 60 : 110);
            Sound.sfx('lose'); Sound.sfx('boo');
        }
        this.time.delayedCall(3200, () => this.scene.start('Result', {
            idx: this.idx, win, how, points: this.points, round: this.round, time: this.clockStr(),
        }));
    }

    oppKnockdown() {
        const O = this.opp, D = this.def;
        O.state = 'down';
        O.t = 0;
        O.downs++;
        O.totalDowns++;
        O.flinch = 0;
        O.move = null;
        O.downDir = O.hurtSide || 1;
        this.phase = 'oppDown';
        this.cloud = 0;
        this.buffer = null;
        this.points += 500 * O.totalDowns;
        this.plSet('idle');
        Sound.sfx('down'); Sound.sfx('cheer');
        this.big('DOLJE!', '#ffdd33', 1000);
        this.burstFlashes(14);
        if (O.downs >= 3) { this.time.delayedCall(1600, () => this.finish(true, 'T.K.O.')); return; }
        let upAt = D.getUp[Math.min(O.totalDowns - 1, D.getUp.length - 1)];
        if (upAt < 10) upAt = Phaser.Math.Clamp(upAt + Phaser.Math.Between(-1, 1), 2, 9);
        this.time.delayedCall(900, () => this.say(D.quips[O.totalDowns % D.quips.length]));
        this.startCount(upAt, () => {
            O.state = 'getup';
            O.t = 0;
            this.time.delayedCall(900, () => {
                O.hp = D.hp * D.getUpHp[Math.min(O.totalDowns - 1, D.getUpHp.length - 1)];
                this.hideCount();
                this.oppToGuard();
                O.nextAttack = 900;
                this.phase = 'fight';
                this.big('BORBA!', '#ffdd33', 700);
            });
        }, () => this.finish(true, 'K.O.'));
    }

    plKnockdown() {
        const P = this.pl, O = this.opp;
        P.state = 'down';
        P.t = 0;
        P.downs++;
        P.totalDowns++;
        P.tired = false;
        this.phase = 'plDown';
        this.cloud = 0;
        this.buffer = null;
        O.state = 'victory';
        O.t = 0;
        Sound.sfx('down'); Sound.sfx('boo');
        this.big('DUDEK DOLJE!', '#ff5050', 1100, 70);
        if (P.downs >= 3) { this.time.delayedCall(1600, () => this.finish(false, 'T.K.O.')); return; }
        P.mash = 0;
        P.mashNeed = 10 + P.totalDowns * 6 + this.idx * 2;
        this.time.delayedCall(1100, () => { if (this.phase === 'plDown') this.subT.setText('Lupaj Z / X da se digneš!'); });
        this.startCount(10, null, () => this.finish(false, 'K.O.'));
    }

    plGetUp() {
        const P = this.pl;
        if (this.countEv) this.countEv.remove();
        this.hideCount();
        P.hp = 100 * [0.65, 0.45, 0.3][Math.min(P.totalDowns - 1, 2)];
        P.hearts = Math.max(P.hearts, Math.ceil(P.maxHearts / 2));
        this.plSet('idle');
        this.oppToGuard();
        this.opp.nextAttack = 1200;
        this.phase = 'fight';
        Sound.sfx('cheer');
        this.big('BORBA!', '#ffdd33', 700);
    }

    startCount(upAt, onUp, onOut) {
        this.count = 0;
        this.refShown = true;
        const phase = this.phase;
        const tick = () => {
            if (this.phase !== phase) return;
            this.count++;
            this.refArm = !this.refArm;
            Sound.sfx('count');
            this.countT.setText(String(this.count)).setScale(1.4);
            this.tweens.add({ targets: this.countT, scale: 1, duration: 200 });
            if (this.count >= 10) { this.hideCount(); onOut(); return; }
            if (onUp && this.count >= upAt) { onUp(); return; }
            this.countEv = this.time.delayedCall(950, tick);
        };
        this.countEv = this.time.delayedCall(1200, tick);
    }

    hideCount() {
        this.refShown = false;
        this.countT.setText('');
        this.subT.setText('');
    }

    // ---- Dudek ----------------------------------------------------------------------------------

    plSet(s) {
        this.pl.state = s;
        this.pl.t = 0;
    }

    updatePlayer(dt) {
        const P = this.pl;
        P.t += dt;
        if (this.phase === 'plDown') { P.mash = Math.max(0, P.mash - dt / 1000 * 2.2); return; }
        switch (P.state) {
            case 'dodge': if (P.t >= 560) this.plSet('idle'); break;
            case 'punch':
                if (!P.done && P.t >= 85) { P.done = true; this.resolvePunch(P.hand, P.high, false); }
                if (P.t >= 250) this.plSet('idle');
                break;
            case 'star':
                if (!P.done && P.t >= 340) { P.done = true; this.resolvePunch('R', true, true); }
                if (P.t >= 640) this.plSet('idle');
                break;
            case 'recoil': if (P.t >= 330) this.plSet('idle'); break;
            case 'hurt': if (P.t >= 420) this.plSet('idle'); break;
            case 'block': if (!this.isHeld('down')) this.plSet('idle'); break;
        }
        if (this.phase !== 'fight') return;
        const ready = P.state === 'idle' || P.state === 'block' || (P.state === 'punch' && P.t >= 190);
        if (!ready) return;
        if (this.buffer && this.T - this.buffer.at < 220) {
            const b = this.buffer;
            this.buffer = null;
            this.doAction(b);
        } else if (P.state === 'idle' && this.isHeld('down')) this.plSet('block');
    }

    doAction(b) {
        const P = this.pl;
        if (b.a === 'dodgeL' || b.a === 'dodgeR') {
            this.plSet('dodge');
            P.dir = b.a === 'dodgeL' ? -1 : 1;
        } else if (b.a === 'punchL' || b.a === 'punchR') {
            if (P.tired) { Sound.sfx('tired'); this.pop('UMORAN!', '#ff7ab0', 512, 520); return; }
            this.plSet('punch');
            P.hand = b.a === 'punchL' ? 'L' : 'R';
            P.high = b.high;
            P.done = false;
            Sound.sfx('swing');
        } else if (b.a === 'star') {
            if (P.stars > 0 && !P.tired) {
                P.stars--;
                this.plSet('star');
                P.done = false;
                Sound.sfx('swing');
            } else Sound.sfx('nostar');
        }
    }

    setTired() {
        if (this.pl.tired) return;
        this.pl.tired = true;
        this.pop('UMORAN! Izmakni se ili blokiraj!', '#ff7ab0', 512, 540);
    }

    untire() {
        const P = this.pl;
        if (!P.tired) return;
        P.tired = false;
        P.hearts = Math.min(P.maxHearts, 5);
    }

    gainStar() {
        const P = this.pl;
        if (P.stars < 3) P.stars++;
        Sound.sfx('star');
        this.pop('★ ZVIJEZDA!', '#ffe040', 512, 160);
    }

    // A punch from Dudek reaches the opponent.
    resolvePunch(hand, high, isStar) {
        const O = this.opp, D = this.def, P = this.pl;
        if (this.phase !== 'fight') return;
        const st = O.state, s = hand === 'L' ? -1 : 1;
        if (st === 'strike' || st === 'down' || st === 'getup' || st === 'victory') return;
        let lands, star = false, mult = 1, boing = false;
        if (isStar) lands = true;
        else switch (st) {
            case 'guard':
            case 'recover':
                lands = !((O.guard === 'high' && high) || (O.guard === 'low' && !high));
                break;
            case 'hurt': lands = O.combo < D.comboLimit; break;
            case 'windup':
                lands = !!(O.move.interrupt && high && O.t >= O.move.windup - O.move.tell);
                if (lands) { star = true; mult = 1.5; }
                break;
            case 'open':
                lands = true; mult = 1.3;
                if (O.openStar && O.openHits === 0) star = true;
                break;
            case 'taunt': lands = true; star = true; mult = 1.2; break;
            case 'crow': lands = true; if (high) star = true; break;
            case 'dizzy': lands = true; break;
            default: lands = false;
        }
        // Štef's belly swallows body punches unless he's reeling
        if (lands && !isStar && !high && D.bodyMult < 0.5 && st !== 'dizzy') { lands = false; boing = true; }

        const op = this.oppPose, hx = OPP_X + op.x + s * 26, hy = OPP_Y + op.y + (high ? -112 + op.hy : 30) * OPP_SCALE;
        if (!lands) {
            Sound.sfx('block');
            this.spark(hx, hy - (high ? 10 : 0), 0xc8d8ff, false);
            if (boing) this.pop('BOING!', '#ffd0a0', hx, hy - 40);
            P.hearts = Math.max(0, P.hearts - 1);
            if (P.hearts === 0) this.setTired();
            this.plSet('recoil');
            O.combo = 0;
            if (st === 'hurt') { O.state = 'guard'; O.t = 0; }
            if (D.adapt && Math.random() < D.adapt) { O.guard = high ? 'high' : 'low'; O.guardHold = 1600; }
            if (Math.random() < D.counter && (st === 'guard' || st === 'recover' || st === 'hurt')) O.nextAttack = Math.min(O.nextAttack, 180);
            return;
        }

        let dmg = (isStar ? 24 : high ? 4 : 3.5) * mult;
        if (st === 'dizzy' && !high) dmg *= D.dizzyBodyMult || 1.5;
        else dmg *= high ? D.faceMult : D.bodyMult;
        O.hp -= dmg;
        this.points += Math.round(dmg * 10);
        O.combo++;
        if (st === 'open') O.openHits++;
        if (star) this.gainStar();
        Sound.sfx(isStar ? 'bighit' : 'hit');
        this.spark(hx, hy, isStar ? 0xffe040 : 0xffffff, isStar);
        if (isStar) { this.cameras.main.shake(220, 0.012); this.burstFlashes(8); }
        else if (Math.random() < 0.2) this.burstFlashes(2);
        O.hurtSide = s;
        O.hurtHigh = high;
        if (D.adapt && st === 'guard' && Math.random() < D.adapt * 0.6) { O.guard = high ? 'high' : 'low'; O.guardHold = 1800; }
        if (O.hp <= 0) { O.hp = 0; this.oppKnockdown(); return; }
        if (st === 'crow' && high) {
            O.state = 'dizzy';
            O.t = 0;
            this.say('Kukuri... joj!');
            return;
        }
        if (st === 'dizzy' || st === 'open' || st === 'taunt') { O.flinch = 170; return; }
        O.state = 'hurt';
        O.t = 0;
        O.move = null;
    }

    // ---- The opponent ---------------------------------------------------------------------------

    oppToGuard() {
        const O = this.opp, D = this.def;
        O.state = 'guard';
        O.t = 0;
        O.move = null;
        if (D.guard === 'high' && !(O.guardHold > 0)) O.guard = 'high';
        O.guardT = D.guardSwitch ? rand(...D.guardSwitch) : 0;
        const speed = (O.hp < D.hp * 0.4 ? 0.72 : 1) * Math.pow(0.88, this.round - 1);
        O.nextAttack = rand(...D.idle) * speed;
    }

    pickMove() {
        const moves = this.def.moves.filter(m => !(m.kind === 'cloud' && this.cloud > 0) && !(m === this.lastMove && (m.kind === 'taunt' || m.kind === 'crow' || m.kind === 'cloud')));
        let total = moves.reduce((a, m) => a + m.w, 0), r = Math.random() * total;
        for (const m of moves) { r -= m.w; if (r <= 0) return m; }
        return moves[0];
    }

    oppStart(M) {
        const O = this.opp;
        this.lastMove = M;
        O.move = M;
        O.t = 0;
        O.told = false;
        O.combo = 0;
        O.side = M.side === 'L' ? -1 : M.side === 'R' ? 1 : (Math.random() < 0.5 ? -1 : 1);
        if (M.kind === 'taunt' || M.kind === 'crow') {
            O.state = M.kind;
            this.say(M.say);
            if (M.kind === 'crow') Sound.sfx('crow');
            return;
        }
        O.state = 'windup';
        O.chainLeft = M.chain || 0;
    }

    chainNext() {
        const O = this.opp;
        O.chainLeft--;
        O.state = 'windup';
        O.t = O.move.windup * 0.45;
        O.told = false;
        O.side = -O.side;
    }

    updateOpp(dt) {
        const O = this.opp, D = this.def, M = O.move;
        O.t += dt;
        if (O.flinch > 0) O.flinch -= dt;
        if (O.guardHold > 0) O.guardHold -= dt;
        if (this.phase !== 'fight') return;
        switch (O.state) {
            case 'guard':
                if (D.guardSwitch) {
                    O.guardT -= dt;
                    if (O.guardT <= 0) { O.guard = O.guard === 'high' ? 'low' : 'high'; O.guardT = rand(...D.guardSwitch); }
                }
                if (O.t > 700) O.combo = 0;
                if (this.pl.state !== 'hurt') O.nextAttack -= dt;
                if (O.nextAttack <= 0) this.oppStart(this.pickMove());
                break;
            case 'recover': if (O.t >= 380) this.oppToGuard(); break;
            case 'hurt':
                if (O.t >= 330) {
                    this.oppToGuard();
                    if (Math.random() < D.counter * 0.6) O.nextAttack = 260;
                }
                break;
            case 'windup':
                if (!O.told && O.t >= M.windup - M.tell) {
                    O.told = true;
                    Sound.sfx('tell');
                    if (M.say) this.say(M.say);
                }
                if (O.t >= M.windup) {
                    if (M.kind === 'feint') { this.oppToGuard(); O.nextAttack = 260; this.say('Hehe!'); }
                    else { O.state = 'strike'; O.t = 0; O.resolved = false; }
                }
                break;
            case 'strike':
                if (!O.resolved && O.t >= M.strike) { O.resolved = true; this.resolveAttack(); }
                break;
            case 'open': if (O.t >= O.openDur) this.oppToGuard(); break;
            case 'taunt':
            case 'crow': if (O.t >= M.dur) this.oppToGuard(); break;
            case 'dizzy': if (O.t >= 2600) this.oppToGuard(); break;
        }
    }

    openUp(M) {
        const O = this.opp;
        O.state = 'open';
        O.t = 0;
        O.openDur = M.open;
        O.openStar = !!M.star;
        O.openHits = 0;
    }

    // The opponent's punch arrives: dodged, blocked or taken.
    resolveAttack() {
        const O = this.opp, M = O.move, P = this.pl;
        if (M.kind === 'cloud') {
            this.cloud = M.dur;
            Sound.sfx('cloud');
            O.state = 'recover';
            O.t = 0;
            return;
        }
        const dodging = P.state === 'dodge' && P.t >= 20 && P.t <= 520;
        const blocking = P.state === 'block';
        if (dodging && M.dodge !== false) {
            Sound.sfx('whoosh');
            this.untire();
            if (O.chainLeft > 0) this.chainNext();
            else this.openUp(M);
        } else if (blocking && M.block !== false) {
            Sound.sfx('block');
            this.untire();
            this.spark(PL_X, 520, 0xc8d8ff, false);
            this.cameras.main.shake(80, 0.004);
            if (O.chainLeft > 0) this.chainNext();
            else if (M.openOnBlock) this.openUp(M);
            else { O.state = 'recover'; O.t = 0; }
        } else {
            const dmg = M.dmg * (1 + (this.round - 1) * 0.1);
            P.hp -= dmg;
            this.oppPoints += Math.round(dmg * 10);
            P.hearts = Math.max(0, P.hearts - 3);
            if (P.stars > 0) P.stars--;
            P.hurtSide = M.kind === 'hook' ? -O.side : (Math.random() < 0.5 ? -1 : 1);
            this.plSet('hurt');
            this.buffer = null;
            this.redFlash = 1;
            Sound.sfx('ouch');
            this.spark(PL_X + P.hurtSide * -20, 530, 0xff6040, true);
            this.cameras.main.shake(180, M.dmg > 15 ? 0.014 : 0.008);
            if (P.hearts === 0) this.setTired();
            if (P.hp <= 0) { P.hp = 0; this.plKnockdown(); return; }
            if (Math.random() < 0.15) this.say(this.def.quips[Math.floor(Math.random() * this.def.quips.length)]);
            if (O.chainLeft > 0) this.chainNext();
            else { O.state = 'recover'; O.t = 0; }
        }
    }

    // ---- Effects --------------------------------------------------------------------------------

    big(text, color, dur = 1000, size = 84) {
        const t = this.bigT;
        this.tweens.killTweensOf(t);
        t.setText(text).setColor(color).setFontSize(size).setAlpha(1).setScale(0.4);
        this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
        this.tweens.add({ targets: t, alpha: 0, delay: dur, duration: 300 });
    }

    pop(text, color, x, y) {
        const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: '30px', color, stroke: '#000000', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5).setDepth(56);
        this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 500, duration: 700, onComplete: () => t.destroy() });
    }

    say(text) {
        if (!text) return;
        if (this.bubble) this.bubble.destroy();
        const c = this.add.container(OPP_X + 150, 150).setDepth(45);
        const t = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: '20px', color: '#1a0e0a', wordWrap: { width: 260 }, align: 'center' }).setOrigin(0.5);
        const w = t.width + 30, h = t.height + 20, g = this.add.graphics();
        g.fillStyle(0xffffff); g.lineStyle(3, OL);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 12); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
        g.fillTriangle(-w / 2 + 16, h / 2 - 2, -w / 2 + 40, h / 2 - 2, -w / 2 - 6, h / 2 + 22);
        c.add([g, t]);
        this.bubble = c;
        this.time.delayedCall(1700, () => { if (this.bubble === c) { c.destroy(); this.bubble = null; } });
    }

    spark(x, y, col, big) {
        this.sparks.push({ x, y, col, big, t: 0, life: big ? 380 : 240 });
    }

    burstFlashes(n) {
        for (let i = 0; i < n; i++) this.flashes.push({ x: rand(10, W - 10), y: rand(140, 290), t: -rand(0, 500), life: 160 });
    }

    clockStr() {
        const s = Math.min(ROUND_SECS, Math.floor(this.clock));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    // ---- Poses ----------------------------------------------------------------------------------

    oppTarget() {
        const O = this.opp, M = O.move, s = O.side, T = this.T;
        const bob = Math.sin(T * 0.005) * 4;
        const guard = O.guard === 'high' ? { lx: -34, ly: -106, rx: 34, ry: -106 } : { lx: -50, ly: 30, rx: 50, ry: 30 };
        if ((O.flinch > 0 || O.state === 'hurt') && O.state !== 'down') {
            const h = O.hurtSide;
            return O.hurtHigh
                ? pose({ hx: h * 14, hy: -14, x: h * 12, rot: h * 0.05, lx: -105, ly: -20, rx: 105, ry: -20, face: 'hurt' })
                : pose({ y: 22, hy: 16, lx: -55, ly: 50, rx: 55, ry: 50, face: 'hurt' });
        }
        switch (O.state) {
            case 'guard':
            case 'recover':
                return pose(Object.assign({ y: bob, face: O.state === 'recover' ? 'grin' : 'normal' }, guard));
            case 'windup': {
                const p = pose(this.windupPose(M, s));
                p.face = 'angry';
                if (O.told) { p.flash = 0.3 + 0.25 * Math.sin(T * 0.045); p.flashColor = M.flash ?? 0xffffff; }
                else if (M.flash) { p.flash = 0.45 * O.t / M.windup; p.flashColor = M.flash; }
                return p;
            }
            case 'strike': return pose(Object.assign(this.strikePose(M, s), { face: 'angry' }));
            case 'open': return pose(Object.assign(this.openPose(M, s), { face: 'surprised' }));
            case 'taunt': {
                const w = Math.sin(T * 0.012) * 24;
                return pose({ lx: -120, ly: -170 + w, rx: 120, ry: -170 - w, x: Math.sin(T * 0.006) * 16, face: 'grin' });
            }
            case 'crow': return pose({ lx: -115, ly: 40, rx: 115, ry: 40, hy: -18, y: -6, face: 'crow' });
            case 'dizzy': {
                const w = Math.sin(T * 0.006);
                return pose({ x: w * 30, rot: w * 0.08, lx: -85, ly: 60, rx: 85, ry: 60, face: 'dizzy' });
            }
            case 'down': return pose({ y: 210, rot: (O.downDir || 1) * 1.35, s: 0.95, lx: -140, ly: -10, rx: 140, ry: -10, face: 'ko' });
            case 'getup': return pose({ y: 50, lx: -60, ly: 40, rx: 60, ry: 40, face: 'hurt' });
            case 'victory': {
                const b = Math.abs(Math.sin(T * 0.008)) * 20;
                return pose({ lx: -110, ly: -210 - b, rx: 110, ry: -210 - b, y: -b * 0.3, face: 'grin' });
            }
        }
        return pose(guard);
    }

    windupPose(M, s) {
        switch (M.kind) {
            case 'jab': return atk(s, s * 60, -60, 0.9, { x: s * 6 });
            case 'upper': return atk(s, s * 95, 75, 0.9, { y: 38, rot: s * 0.08, hy: 10 });
            case 'bump': return { lx: -150, ly: -60, rx: 150, ry: -60, y: -14, s: 0.96 };
            case 'slam': return { lx: -55, ly: -240, rx: 55, ry: -240, y: -10, hy: 6 };
            case 'cloud': return atk(s, s * 150, -130, 0.9, { x: s * 10 });
            default: return atk(s, s * 170, -70, 0.85, { x: s * 20, rot: s * 0.06, hx: s * 10 });
        }
    }

    strikePose(M, s) {
        switch (M.kind) {
            case 'jab': return atk(s, s * 8, 175, 1.75, { x: -s * 4, s: 1.03 });
            case 'upper': return atk(s, s * 6, 160, 2.0, { y: -24, rot: -s * 0.06, hy: -8 });
            case 'bump': return { lx: -200, ly: -40, rx: 200, ry: -40, y: 70, s: 1.28 };
            case 'slam': return { lx: -36, ly: 175, rx: 36, ry: 175, ls: 1.8, rs: 1.8, y: 22 };
            case 'cloud': return atk(s, s * 20, 100, 1.4, {});
            default: return atk(s, s * 5, 175, 1.9, { x: -s * 22, rot: -s * 0.07, hx: -s * 8 });
        }
    }

    openPose(M, s) {
        switch (M.kind) {
            case 'jab': return atk(s, -s * 20, 60, 1.3, { x: -s * 10 });
            case 'upper': return atk(s, s * 10, -170, 1.0, { y: -16, hy: -10 });
            case 'bump': return { y: 40, s: 1.12, lx: -170, ly: 20, rx: 170, ry: 20 };
            case 'slam': return { lx: -60, ly: 95, rx: 60, ry: 95, y: 30, hy: 12 };
            default: return atk(s, -s * 90, 60, 1.2, { x: -s * 50, rot: -s * 0.12, hx: -s * 10 });
        }
    }

    plTarget() {
        const P = this.pl, T = this.T, bob = Math.sin(T * 0.006) * 3;
        const tint = P.tired ? 0.45 + 0.15 * Math.sin(T * 0.01) : 0;
        const idle = { lx: -58, ly: -238 + bob, rx: 58, ry: -238 - bob, y: bob, tint };
        switch (P.state) {
            case 'block': return pose({ lx: -22, ly: -230, rx: 22, ry: -234, y: 24, tint });
            case 'dodge': {
                const k = P.t < 430 ? 1 : Math.max(0, 1 - (P.t - 430) / 130);
                return pose(Object.assign({}, idle, { x: P.dir * 170 * k, rot: P.dir * 0.32 * k, y: 18 * k }));
            }
            case 'punch': {
                if (P.t >= 150) return pose(idle);
                const p = pose(Object.assign({}, idle, { x: (P.hand === 'L' ? -1 : 1) * 14, y: P.high ? -170 : -60 }));
                const gy = P.high ? -472 : -347, gs = P.high ? 0.72 : 0.8;
                if (P.hand === 'L') { p.lx = -18; p.ly = gy; p.ls = gs; } else { p.rx = 18; p.ry = gy; p.rs = gs; }
                return p;
            }
            case 'star':
                if (P.t < 330) return pose({ lx: -50, ly: -220, rx: 95, ry: -90, y: 36, rot: 0.1, x: 20, tint });
                return pose({ lx: -50, ly: -230, rx: 6, ry: -465, rs: 0.85, y: -180, rot: -0.04 });
            case 'recoil': return pose({ lx: -80, ly: -200, rx: 80, ry: -200, y: 28, tint });
            case 'hurt': return pose({ x: P.hurtSide * 40 + Math.sin(P.t * 0.08) * 8, rot: P.hurtSide * 0.15, y: 26, lx: -100, ly: -170, rx: 100, ry: -170, tint });
            case 'down': {
                const m = P.mashPose ? 10 : 0;
                return pose({ y: 190 - m, rot: 0.25, lx: -130, ly: -150 - m * 3, rx: 130, ry: -150 + m * 3, tint: 0.3 });
            }
            case 'victory': {
                const j = Math.abs(Math.sin(T * 0.008)) * 22;
                return pose({ lx: -100, ly: -390, rx: 100, ry: -390, y: -j });
            }
        }
        return pose(idle);
    }

    // ---- Frame ----------------------------------------------------------------------------------

    update(time, delta) {
        if (this.phase === 'paused') return;
        const dt = Math.min(delta, 50);
        this.T += dt;
        if (this.phase === 'fight') {
            this.clock += dt / 1000 * CLOCK_RATE;
            if (this.clock >= ROUND_SECS) { this.clock = ROUND_SECS; this.endRound(); }
        }
        this.updatePlayer(dt);
        this.updateOpp(dt);
        if (this.cloud > 0) this.cloud -= dt;
        this.render(dt);
    }

    render(dt) {
        const O = this.opp, D = this.def, T = this.T;
        const fast = O.state === 'strike' || O.flinch > 0 || O.state === 'hurt';
        lerpPose(this.oppPose, this.oppTarget(), 1 - Math.pow(fast ? 0.35 : 0.78, dt / 16.7));
        const op = this.oppPose;
        this.oppG.setPosition(OPP_X + op.x, OPP_Y + op.y).setScale(op.s * OPP_SCALE).setRotation(op.rot);
        drawFighter(this.oppG, D.look, op);

        lerpPose(this.plPose, this.plTarget(), 1 - Math.pow(0.55, dt / 16.7));
        const pp = this.plPose;
        this.plG.setPosition(PL_X + pp.x, PL_Y + pp.y).setScale(PL_SCALE).setRotation(pp.rot);
        drawBack(this.plG, DUDEK, pp);

        // The tell: a glint in the eye before the punch
        const tg = this.tellG;
        tg.clear();
        if (O.state === 'windup' && O.told) {
            const sc = op.s * OPP_SCALE, ex = OPP_X + op.x + (op.hx + 16) * sc, ey = OPP_Y + op.y + (-122 + op.hy) * sc;
            const r = 14 + Math.sin(T * 0.05) * 5;
            tg.fillStyle(0xffffff, 0.95);
            tg.fillPoints([{ x: ex, y: ey - r }, { x: ex + 4, y: ey - 4 }, { x: ex + r, y: ey }, { x: ex + 4, y: ey + 4 }, { x: ex, y: ey + r }, { x: ex - 4, y: ey + 4 }, { x: ex - r, y: ey }, { x: ex - 4, y: ey - 4 }], true);
        }

        // Crowd camera flashes
        const cg = this.crowdG;
        cg.clear();
        if (Math.random() < 0.02) this.burstFlashes(1);
        this.flashes = this.flashes.filter(f => (f.t += dt) < f.life);
        for (const f of this.flashes) if (f.t > 0) { cg.fillStyle(0xffffff, 1 - f.t / f.life); cg.fillCircle(f.x, f.y, 6 + f.t / 20); }

        // Hit sparks and the red flash of taking a punch
        const g = this.fxG;
        g.clear();
        this.sparks = this.sparks.filter(sp => (sp.t += dt) < sp.life);
        for (const sp of this.sparks) {
            const k = sp.t / sp.life, r = (sp.big ? 70 : 40) * (0.4 + k);
            g.lineStyle(sp.big ? 6 : 4, sp.col, 1 - k);
            for (let i = 0; i < 10; i++) {
                const a = i / 10 * Math.PI * 2 + sp.x;
                g.lineBetween(sp.x + Math.cos(a) * r * 0.45, sp.y + Math.sin(a) * r * 0.45, sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r);
            }
        }
        if (this.redFlash > 0) {
            g.fillStyle(0xff2020, this.redFlash * 0.25); g.fillRect(0, 0, W, H);
            this.redFlash = Math.max(0, this.redFlash - dt / 250);
        }

        // Lojz's cloud of seasoning hides his tells
        const cl = this.cloudG;
        cl.clear();
        if (this.cloud > 0) {
            const a = Math.min(1, this.cloud / 600) * 0.92;
            for (let i = 0; i < 26; i++) {
                const x = 512 + Math.sin(i * 2.3 + T * 0.0009) * 260 + Math.cos(i * 1.7) * 60;
                const y = 250 + Math.cos(i * 1.9 + T * 0.0011) * 110;
                cl.fillStyle([0xc8781e, 0xe0a040, 0x8a5a20, 0xd8b060][i % 4], a * 0.85);
                cl.fillCircle(x, y, 60 + (i % 5) * 14);
            }
        }

        // Referee
        const rg = this.refG;
        rg.clear();
        if (this.refShown) drawRef(rg, 230, 400, this.refArm);

        this.drawHud();
    }

    drawHud() {
        const g = this.hudG, P = this.pl, O = this.opp, D = this.def, T = this.T;
        g.clear();
        g.fillStyle(0x000000, 0.85); g.fillRect(0, 0, W, 78);
        g.lineStyle(2, 0xf0d060); g.lineBetween(0, 78, W, 78);
        // Hearts
        const hc = P.tired ? (Math.floor(T / 200) % 2 ? 0xff5fa0 : 0xffb0d0) : 0xff3a5a;
        g.fillStyle(hc);
        g.fillCircle(24, 26, 9); g.fillCircle(38, 26, 9); g.fillTriangle(15.5, 29, 46.5, 29, 31, 46);
        this.heartT.setText(String(P.hearts));
        // Stars
        for (let i = 0; i < 3; i++) {
            const x = 30 + i * 36, y = 60, on = i < P.stars;
            const pts = [];
            for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 : 14; pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }); }
            g.fillStyle(on ? 0xffe040 : 0x3a3a3a); g.fillPoints(pts, true);
        }
        // Health bars
        const bar = (y, frac, col) => {
            g.fillStyle(0x3a1010); g.fillRect(432, y, 320, 18);
            g.fillStyle(col); g.fillRect(432, y, 320 * Math.max(0, frac), 18);
            g.lineStyle(2, 0xffffff); g.strokeRect(432, y, 320, 18);
        };
        bar(10, P.hp / 100, P.hp < 30 ? 0xff5040 : 0x40d060);
        bar(44, O.hp / D.hp, 0xf0c020);
        this.pointsT.setText('BODOVI ' + String(this.points).padStart(6, '0'));
        this.clockT.setText(`R${this.round}  ${this.clockStr()}`);

        // Get-up meter while Dudek is down
        if (this.phase === 'plDown' && P.mashNeed) {
            g.fillStyle(0x000000, 0.7); g.fillRect(312, 600, 400, 30);
            g.fillStyle(0x40d060); g.fillRect(316, 604, 392 * Math.min(1, P.mash / P.mashNeed), 22);
            g.lineStyle(2, 0xffffff); g.strokeRect(312, 600, 400, 30);
        }
    }
}
