'use strict';
// The fight: Oolong against one master (or Feedle's swarm). Physics, hits and AI all run in
// 256x192 arena units; the arena layers are drawn scaled 4x and the HUD at full resolution.
const GRAV = 480, ARENA_L = 12, ARENA_R = 244, PLAYER_HP = 9, EXTRA_LIFE = 80000;
const POSE_KEYS = Object.keys(IDLE);
const clonePose = p => { const o = {}; for (const k of POSE_KEYS) o[k] = [p[k][0], p[k][1]]; return o; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Fighter {
    constructor(look, x, face, o = {}) {
        this.look = look; this.x = x; this.h = 0; this.vx = 0; this.vy = 0; this.face = face;
        this.state = 'idle'; this.st = 0; this.move = null; this.phase = null; this.pt = 0;
        this.hp = o.hp || 9; this.isPlayer = !!o.player; this.minion = !!o.minion;
        this.ai = o.ai || null; this.tempo = o.tempo || 1;
        this.poseKey = 'idle'; this.pose = clonePose(IDLE);
        this.flash = 0; this.think = 400; this.walkDir = 0; this.crouchT = 0; this.cd = {}; this.gone = false;
        this.trail = [];
    }
    get size() { return this.look.size || 1; }
    get air() { return this.h > 0 || this.vy > 0; }
}

function startMove(f, name, diff = 1) {
    const m = MOVES[name], k = f.isPlayer ? 1 : 1.05 * f.tempo / diff;
    f.move = m; f.phase = 'wind'; f.pt = 0; f.hitDone = false;
    f.wind = m.wind * k; f.act = m.act || 0; f.rec = (m.rec || 0) * (f.isPlayer ? 1 : f.tempo / diff);
    f.state = 'attack';
    if (!f.air) f.vx = 0;
}

class FightScene extends Phaser.Scene {
    constructor() { super('Fight'); }

    init(run) { this.run = Object.assign({ stage: 0, loop: 0, score: 0, lives: 3 }, run); }

    create() {
        const D = this.D = OPPONENTS[this.run.stage];
        this.diff = 1.2 + 0.2 * this.run.loop;
        this.hi = loadSave().hi;
        this.stage = addStage(this, this.run.stage % THEMES.length);
        this.ambient = this.stage.T.ambient;
        this.view = canvas(this, 2);
        this.fx = canvas(this, 3);
        this.hud = this.add.graphics().setDepth(10);
        this.hudArt = canvas(this, 11);

        this.player = new Fighter(OOLONG, 64, 1, { player: true, hp: PLAYER_HP });
        this.enemies = [];
        this.boss = null;
        if (D.minions) {
            this.swarmLeft = this.run.oppHp ?? D.hp; this.spawnT = 900; this.spawnSide = 1;
        } else {
            this.boss = new Fighter(D.look, 192, -1, { hp: this.run.oppHp ?? D.hp, ai: D.ai, tempo: D.tempo });
            this.enemies.push(this.boss);
        }
        this.projectiles = []; this.sparks = []; this.dust = [];
        // scene.restart() reuses this instance, so every per-round flag must be reset here.
        this.phase = 'intro'; this.pt = 0; this.clock = 0; this.paused = false; this.leaving = false;
        this.hitstop = 0; this.slowmo = 0;

        this.buildHUD();
        this.banner = goldText(this.add.text(W / 2, 330, `STAGE ${this.run.stage + 1}`, {
            fontFamily: PIXFONT, fontSize: '44px', color: '#ffffff', stroke: '#2a0a04', strokeThickness: 10, align: 'center',
        }).setOrigin(0.5).setDepth(12));
        this.sub = this.add.text(W / 2, 404, D.name, {
            fontFamily: FONT, fontSize: '30px', color: '#ffffff', stroke: '#000000', strokeThickness: 6, align: 'center',
        }).setOrigin(0.5).setDepth(12);
        this.flashRect = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(9);

        this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,Z,Y,X,C,SPACE,P,M,ESC');
        this.input.keyboard.on('keydown-M', () => Sound.toggleMusic());
        this.input.keyboard.on('keydown-P', () => {
            if (this.phase !== 'fight') return;
            this.paused = !this.paused;
            this.banner.setText(this.paused ? 'PAUZA' : '').setVisible(this.paused);
            goldText(this.banner);
        });
        this.input.keyboard.on('keydown-ESC', () => { saveHi(this.run.score); this.scene.start('Title'); });
        Sound.music(true);
        Sound.sfx('gong');
    }

    get oppHp() { return this.boss ? this.boss.hp : this.swarmLeft; }

    update(time, delta) {
        if (this.paused) return;
        let ms = Math.min(delta, 50);
        this.stage.update(ms);
        if (this.slowmo > 0) { this.slowmo -= ms; ms *= 0.35; }
        const dt = ms / 1000;
        this.clock += ms; this.pt += ms;
        for (const s of this.sparks) s.t += ms;
        this.sparks = this.sparks.filter(s => s.t < 200);
        for (const d of this.dust) d.t += ms;
        this.dust = this.dust.filter(d => d.t < 500);
        // A few frames of hit-stop sell the impact; everything freezes but the effects.
        if (this.hitstop > 0) { this.hitstop -= ms; this.draw(); return; }

        const fighting = this.phase === 'fight';
        if (fighting) {
            this.playerInput();
            for (const e of this.enemies) e.minion ? this.minionAI(e, dt) : this.ai(e, dt);
            if (this.D.minions) this.spawnMinions(dt);
        }
        for (const f of [this.player, ...this.enemies]) this.stepFighter(f, dt);
        if (fighting) { this.resolveHits(); this.updateProjectiles(dt); }
        this.separate();
        this.enemies = this.enemies.filter(e => !e.gone);
        this.phaseLogic();
        this.draw();
        this.drawHUD();
    }

    // ---------------------------------------------------------------------------------------------
    // Oolong
    // ---------------------------------------------------------------------------------------------
    playerInput() {
        const p = this.player, k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
        const pz = JD(k.Z), py = JD(k.Y), kick = JD(k.X), high = JD(k.C), up = JD(k.UP), sp = JD(k.SPACE);
        const punch = pz || py;
        if (p.state === 'jump' && !p.move) {
            if (punch) this.attack(p, 'flypunch');
            else if (kick || high) this.attack(p, 'flykick');
            return;
        }
        if (!['idle', 'walk', 'crouch'].includes(p.state)) return;
        this.faceTarget(p);
        const down = k.DOWN.isDown, dir = (k.RIGHT.isDown ? 1 : 0) - (k.LEFT.isDown ? 1 : 0);
        if (punch) return this.attack(p, down ? 'lowpunch' : 'punch');
        if (kick) return this.attack(p, down ? 'sweep' : 'kick');
        if (high) return this.attack(p, down ? 'sweep' : 'highkick');
        if (up || sp) { p.vy = 175; p.vx = dir * 75; p.state = 'jump'; Sound.sfx('jump'); this.puff(p.x, 2); return; }
        if (down) { p.state = 'crouch'; p.vx = 0; return; }
        p.state = dir ? 'walk' : 'idle';
        p.vx = dir * 72;
    }

    attack(f, name) { startMove(f, name, this.diff); Sound.sfx('swish'); }

    faceTarget(p) {
        let best = null, bd = 1e9;
        for (const e of this.enemies) {
            const d = Math.abs(e.x - p.x);
            if (e.state !== 'down' && d < bd) { bd = d; best = e; }
        }
        if (best && Math.abs(best.x - p.x) > 2) p.face = best.x > p.x ? 1 : -1;
    }

    // ---------------------------------------------------------------------------------------------
    // Opponents
    // ---------------------------------------------------------------------------------------------
    ai(e, dt) {
        if (!['idle', 'walk', 'crouch'].includes(e.state)) return;
        const p = this.player, dx = p.x - e.x;
        e.face = dx >= 0 ? 1 : -1;
        if (e.crouchT > 0) {
            e.crouchT -= dt * 1000; e.state = 'crouch'; e.vx = 0;
            if (e.crouchT > 0) return;
            e.state = 'idle';
        }
        if (this.reflex(e, p, Math.abs(dx), dt)) return;
        e.think -= dt * 1000;
        if (e.think <= 0) {
            e.think = e.ai.think * (0.6 + Math.random() * 0.8) / this.diff;
            if (this.decide(e, p, Math.abs(dx))) return;
        }
        // Backing off is slower than closing in, so a ranged master can't kite Oolong forever.
        e.state = e.walkDir ? 'walk' : 'idle';
        e.vx = e.walkDir * e.ai.speed * this.diff * (e.walkDir === e.face ? 1 : 0.55);
    }

    // Reflexes run every frame rather than on think ticks: punishing a whiffed attack, meeting a
    // jump-in in the air and reading a windup. Each fires at a rate, so slower masters react later.
    reflex(e, p, dist, dt) {
        const A = e.ai;
        if (p.state === 'down' || p.state === 'hit') return false;
        const fires = rate => Math.random() < 1 - Math.exp(-dt * rate * this.diff);
        const pick = ok => {
            const o = A.moves.filter(([n, , lo, hi]) => dist >= lo && dist <= hi && !(e.cd[n] > 0) && ok(MOVES[n]));
            return o.length ? o[(Math.random() * o.length) | 0][0] : null;
        };
        if (p.move && p.phase === 'rec' && !p.air && fires(7 * A.aggr)) {
            const n = pick(m => !m.projectile && !m.jump);
            if (n) { this.attack(e, n); return true; }
        }
        if (p.air && !p.move && dist < 64 && Math.sign(p.vx) === -e.face && fires(4 + 6 * A.dodge)) {
            const n = pick(m => (m.high || m.pose === 'kick') && !m.jump && !m.projectile);
            if (n) { this.attack(e, n); return true; }
            e.walkDir = -e.face;
        }
        if (p.move && p.phase === 'wind' && dist < 48 && fires(12 * A.dodge)) {
            if (p.move.low) { e.vy = 150; e.vx = -e.face * 55; e.state = 'jump'; return true; }
            if (p.move.high) { e.crouchT = 380; e.state = 'crouch'; e.vx = 0; return true; }
            e.walkDir = -e.face;
        }
        return false;
    }

    decide(e, p, dist) {
        const A = e.ai;
        if (p.state === 'down') { e.walkDir = 0; return false; }
        const opts = A.moves.filter(([n, , lo, hi]) => dist >= lo && dist <= hi && !(e.cd[n] > 0));
        if (opts.length && Math.random() < A.aggr) {
            let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
            const name = (opts.find(o => (r -= o[1]) < 0) || opts[0])[0];
            // Both throws share one cooldown, so there is always a gap to close in through.
            if (MOVES[name].projectile) e.cd.throwHigh = e.cd.throwLow = MOVES[name].cd / this.diff;
            this.attack(e, name);
            return true;
        }
        if (dist > A.range + 6) e.walkDir = e.face;
        else if (dist < A.range - 10) e.walkDir = -e.face;
        else e.walkDir = Math.random() < 0.35 ? (Math.random() < 0.5 ? 1 : -1) : 0;
        if ((e.x < ARENA_L + 6 && e.walkDir < 0) || (e.x > ARENA_R - 6 && e.walkDir > 0)) e.walkDir = 0;
        return false;
    }

    minionAI(e, dt) {
        if (!['idle', 'walk'].includes(e.state)) return;
        const p = this.player, dx = p.x - e.x;
        e.face = dx >= 0 ? 1 : -1;
        if (p.state !== 'down' && e.entered && Math.abs(dx) < 36 && Math.random() < dt * 4) return this.attack(e, 'minijump');
        e.state = 'walk';
        e.vx = e.face * 56 * this.diff;
    }

    spawnMinions(dt) {
        this.spawnT -= dt * 1000;
        const alive = this.enemies.filter(e => e.state !== 'down').length;
        if (this.spawnT > 0 || alive >= Math.min(5, 3 + this.run.loop) || alive >= this.swarmLeft) return;
        this.spawnT = (650 + Math.random() * 450) / this.diff;
        this.spawnSide = -this.spawnSide;
        const look = Object.assign({}, this.D.look, { size: 0.55 });
        this.enemies.push(new Fighter(look, this.spawnSide < 0 ? -8 : LW + 8, -this.spawnSide, { hp: 1, minion: true, tempo: 0.9 }));
    }

    // ---------------------------------------------------------------------------------------------
    // Movement, moves and poses
    // ---------------------------------------------------------------------------------------------
    stepFighter(f, dt) {
        const ms = dt * 1000;
        f.flash -= ms; f.st += ms;
        for (const k in f.cd) f.cd[k] -= ms;
        if (f.move) this.stepMove(f, ms);
        if (f.state === 'hit' && f.st > 280 && !f.air) f.state = 'idle';
        if (f.air) {
            f.h += f.vy * dt; f.vy -= GRAV * dt;
            if (f.h <= 0) { f.h = 0; f.vy = 0; this.land(f); }
        }
        if (!f.air && (f.state === 'hit' || f.state === 'down')) f.vx *= Math.exp(-dt * 7);
        f.x += f.vx * dt;
        if (f.minion) {
            if (f.x > ARENA_L && f.x < ARENA_R) f.entered = true;
            if (f.entered) f.x = clamp(f.x, ARENA_L, ARENA_R);
            if (f.state === 'down' && f.st > 700) f.gone = true;
        } else f.x = clamp(f.x, ARENA_L, ARENA_R);

        // Blend toward the target pose: snappy into a strike, a touch softer elsewhere.
        f.poseKey = this.poseFor(f);
        const T = POSES[f.poseKey];
        const tau = f.phase === 'act' ? 0.009 : f.phase === 'wind' ? 0.014 : (f.state === 'hit' || f.state === 'down') ? 0.012 : 0.026;
        const k = 1 - Math.exp(-dt / tau);
        for (const j of POSE_KEYS) {
            f.pose[j][0] += (T[j][0] - f.pose[j][0]) * k;
            f.pose[j][1] += (T[j][1] - f.pose[j][1]) * k;
        }

        // A short motion trail behind whatever is striking.
        if (f.move && f.move.strike && f.phase !== 'wind') f.trail.push(this.strikeTip(f));
        else if (f.trail.length) f.trail.shift();
        if (f.trail.length > 7) f.trail.shift();
    }

    stepMove(f, ms) {
        const m = f.move;
        f.pt += ms;
        if (f.phase === 'wind') {
            if (f.pt < f.wind) return;
            f.phase = 'act'; f.pt = 0;
            if (m.jump) {
                f.vy = m.jump;
                let vx = m.jumpVx || 80;
                if (m.leap) vx = Math.min(170, (Math.abs(this.player.x - f.x) + 26) / (2 * m.jump / GRAV));
                f.vx = f.face * vx;
                Sound.sfx('jump');
                this.puff(f.x, 2);
            }
            if (m.projectile) this.throwProjectile(f, m.projectile);
        } else if (f.phase === 'act') {
            if (!m.air && f.pt >= f.act) { f.phase = 'rec'; f.pt = 0; }
        } else if (f.phase === 'rec' && f.pt >= f.rec) {
            f.move = null; f.phase = null;
            f.state = f.isPlayer && m.crouch ? 'crouch' : 'idle';
        }
    }

    land(f) {
        if (f.move && f.move.air) { f.phase = 'rec'; f.pt = 0; f.rec = f.move.landRec || 120; f.vx = 0; this.puff(f.x, 2); }
        else if (f.state === 'jump') { f.state = 'idle'; f.vx = 0; this.puff(f.x, 2); }
        else if (f.state === 'down') { Sound.sfx('thud'); f.vx *= 0.5; this.puff(f.x, 5); if (!f.minion) this.cameras.main.shake(140, 0.006); }
    }

    poseFor(f) {
        if (f.state === 'down') return 'down';
        if (f.state === 'hit') return 'hit';
        if (f.state === 'win') return 'salute';
        if (f.move) {
            const m = f.move;
            if (f.phase === 'wind') return m.windPose || m.pose;
            if (f.phase === 'rec') {
                if (m.air) return 'crouch';
                if (f.pt > f.rec * 0.4) return m.crouch ? 'crouch' : 'idle';
            }
            return m.pose;
        }
        if (f.air) return 'jump';
        if (f.state === 'crouch') return 'crouch';
        if (f.state === 'walk') return ((this.clock / 130) | 0) % 2 ? 'walk1' : 'walk2';
        return ((this.clock / 420) | 0) % 2 ? 'idle' : 'idle2';
    }

    // ---------------------------------------------------------------------------------------------
    // Hits
    // ---------------------------------------------------------------------------------------------
    strikePoints(f, P = POSES[f.move.pose]) {
        const s = f.size, gy = GROUND - f.h;
        const at = j => [f.x + P[j][0] * s * f.face, gy + P[j][1] * s];
        if (f.move.strike !== 'weapon') return f.move.strike.map(at);
        const e = at('fe'), h = at('fh'), L = (WEAPON_LEN[f.look.weapon] || 6) * s;
        let dx = h[0] - e[0], dy = h[1] - e[1];
        const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        return [0.5, 0.75, 1].map(t => [h[0] + dx * L * t, h[1] + dy * L * t]);
    }

    // Where the striking limb or weapon is right now, from the blended pose.
    strikeTip(f) { const p = this.strikePoints(f, f.pose); return p[p.length - 1]; }

    hurtbox(f) {
        const T = POSES[f.poseKey], s = f.size, gy = GROUND - f.h;
        const cx = f.x + (T.hip[0] + T.neck[0]) / 2 * s * f.face, half = (f.look.fat ? 10 : 7) * s;
        return { l: cx - half, r: cx + half, t: gy + (T.head[1] - 6) * s, b: gy + Math.max(T.ff[1], T.bf[1]) * s + 2 };
    }

    inBox(p, b, m) { return p[0] >= b.l - m && p[0] <= b.r + m && p[1] >= b.t - m && p[1] <= b.b + m; }

    resolveHits() {
        for (const f of [this.player, ...this.enemies]) {
            if (!f.move || f.phase !== 'act' || f.hitDone || !f.move.strike) continue;
            const pts = this.strikePoints(f);
            for (const t of f.isPlayer ? this.enemies : [this.player]) {
                if (t.state === 'down' || t.state === 'hit' || t.gone) continue;
                const box = this.hurtbox(t);
                const at = pts.find(q => this.inBox(q, box, 2));
                if (!at) continue;
                f.hitDone = true;
                if (this.blocks(t, f, at)) { Sound.sfx('block'); this.spark(at, C.lgrey); this.hitstop = 50; }
                else this.damage(t, f, f.move.dmg, at);
                break;
            }
            if (!f.isPlayer) continue;
            for (const q of this.projectiles) {
                if (q.dead || !pts.some(p => Math.abs(p[0] - q.x) < 6 && Math.abs(p[1] - q.y) < 6)) continue;
                q.dead = true;
                Sound.sfx('block');
                this.spark([q.x, q.y], C.lgrey);
                this.addScore(50, [q.x, q.y]);
            }
        }
    }

    // Club's shield stops anything above the knees that comes from the front while he is not swinging.
    blocks(t, f, at) {
        return t.look.shield && !t.move && t.state !== 'crouch' && Math.sign(f.x - t.x) === t.face && at[1] < GROUND - t.h - 20;
    }

    damage(t, f, dmg, at) {
        t.hp -= dmg; t.flash = 160; t.move = null; t.phase = null; t.state = 'hit'; t.st = 0; t.trail = [];
        const dir = f ? (Math.sign(t.x - f.x) || -t.face) : -t.face;
        t.vx = dir * 70;
        if (t.air) t.vy = Math.min(t.vy, 0);
        this.spark(at, C.white);
        this.hitstop = dmg > 1 ? 90 : 60;
        if (dmg > 1) this.cameras.main.shake(120, 0.008);
        Sound.sfx(dmg > 1 ? 'hit' : 'punch');
        if (f && f.isPlayer) this.addScore(f.move.pts * (this.run.loop + 1), at);
        if (t.minion) {
            t.state = 'down'; t.vy = 80;
            if (--this.swarmLeft <= 0) this.ko(t);
            return;
        }
        if (t.hp <= 0) { t.hp = 0; this.ko(t); }
    }

    throwProjectile(f, kind) {
        const y = GROUND - (kind === 'high' ? 50 : 6);
        this.projectiles.push({ x: f.x + f.face * 16 * f.size, y, base: y, vx: f.face * 130 * Math.sqrt(this.diff), t: 0, fan: f.look.weapon === 'fan' });
        Sound.sfx('throw');
    }

    updateProjectiles(dt) {
        const p = this.player;
        for (const q of this.projectiles) {
            q.t += dt; q.x += q.vx * dt;
            if (q.fan) q.y = q.base + Math.sin(q.t * 12) * 3;
            if (q.x < -10 || q.x > LW + 10) q.dead = true;
            if (!q.dead && p.state !== 'down' && p.state !== 'hit' && this.inBox([q.x, q.y], this.hurtbox(p), 2)) {
                q.dead = true;
                this.damage(p, null, 1, [q.x, q.y]);
            }
        }
        this.projectiles = this.projectiles.filter(q => !q.dead);
    }

    // Grounded fighters can't walk through each other; in the air you can sail right over.
    separate() {
        const p = this.player, b = this.boss;
        if (!b || p.air || b.air || p.state === 'down' || b.state === 'down') return;
        const min = 7 * (p.size + b.size) + 2, dx = b.x - p.x;
        if (Math.abs(dx) >= min) return;
        const s = dx === 0 ? (p.x < LW / 2 ? 1 : -1) : Math.sign(dx), push = (min - Math.abs(dx)) / 2;
        p.x = clamp(p.x - s * push, ARENA_L, ARENA_R);
        b.x = clamp(b.x + s * push, ARENA_L, ARENA_R);
        if (Math.abs(b.x - p.x) < min) {
            if (p.x <= ARENA_L || p.x >= ARENA_R) b.x = p.x + s * min; else p.x = b.x - s * min;
        }
    }

    spark(at, c) { this.sparks.push({ x: at[0], y: at[1], t: 0, c, rot: Math.random() }); }

    puff(x, n) {
        const c = darken(this.stage.T.floor[0], 0.1);
        for (let i = 0; i < n; i++) this.dust.push({ x: x + (Math.random() - 0.5) * 12, y: GROUND + 1, t: Math.random() * 100, c });
    }

    addScore(n, at) {
        const before = this.run.score;
        this.run.score += n;
        this.popup(String(n), at, '#ffffff');
        if (Math.floor(before / EXTRA_LIFE) < Math.floor(this.run.score / EXTRA_LIFE)) {
            this.run.lives++;
            Sound.sfx('life');
            this.popup('1UP!', [this.player.x, GROUND - 70], '#a0ff90');
        }
    }

    popup(text, at, color) {
        const t = this.add.text(at[0] * PX, at[1] * PX - 10, text, {
            fontFamily: PIXFONT, fontSize: '16px', color, stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    // ---------------------------------------------------------------------------------------------
    // Round flow
    // ---------------------------------------------------------------------------------------------
    ko(loser) {
        loser.state = 'down'; loser.st = 0; loser.move = null; loser.phase = null;
        loser.vy = 90; loser.vx = (Math.sign(loser.vx) || -loser.face) * 80;
        Sound.sfx('ko');
        this.phase = 'ko'; this.pt = 0; this.playerWon = !loser.isPlayer;
        this.slowmo = 700; this.hitstop = 120;
        this.flashRect.setAlpha(0.7);
        this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 350 });
        this.cameras.main.shake(250, 0.012);
        this.projectiles = [];
        for (const f of [this.player, ...this.enemies]) {
            if (f !== loser && !f.air && ['walk', 'crouch'].includes(f.state)) { f.state = 'idle'; f.vx = 0; }
        }
        if (this.playerWon) { goldText(this.banner.setText('POBJEDA!').setVisible(true)); this.sub.setText(''); }
        else {
            const left = this.run.lives - 1;
            goldText(this.banner.setText('K.O.').setVisible(true));
            this.sub.setText(left > 0 ? `Oolong je pao! Još ${left} ${left === 1 ? 'život' : 'života'}.` : 'Oolong je pao...');
        }
    }

    phaseLogic() {
        if (this.phase === 'intro') {
            if (this.pt > 800 && this.banner.text !== 'BORBA!') { goldText(this.banner.setText('BORBA!')); this.sub.setText(''); }
            if (this.pt > 1500) { this.phase = 'fight'; this.banner.setVisible(false); }
        } else if (this.phase === 'ko') {
            const winners = this.playerWon ? [this.player] : this.enemies.filter(e => e.state !== 'down');
            for (const w of winners) if (!w.move && !w.air && w.state !== 'hit') { w.state = 'win'; w.vx = 0; }
            if (this.pt > 2200) this.playerWon ? this.startBonus() : this.loseLife();
        } else if (this.phase === 'bonus') {
            if (this.pt < 180) return;
            this.pt = 0;
            if (this.player.hp > 0) {
                this.player.hp--;
                this.bonus += 1000;
                this.addScore(1000, [this.player.x, GROUND - 66]);
                this.sub.setText(`BONUS ZA SNAGU  ${this.bonus}`);
                Sound.sfx('tick');
            } else if (!this.leaving) {
                this.leaving = true;
                this.time.delayedCall(900, () => this.nextStage());
            }
        }
    }

    startBonus() {
        this.phase = 'bonus'; this.pt = 0; this.bonus = 0;
        Sound.sfx('win');
    }

    nextStage() {
        const run = { stage: this.run.stage + 1, loop: this.run.loop, score: this.run.score, lives: this.run.lives };
        if (run.stage < OPPONENTS.length) this.scene.start('Stage', run);
        else this.scene.start('Victory', run);
    }

    loseLife() {
        if (this.leaving) return;
        this.leaving = true;
        const lives = this.run.lives - 1;
        this.cameras.main.fadeOut(400);
        this.time.delayedCall(450, () => {
            if (lives > 0) this.scene.restart(Object.assign({}, this.run, { lives, oppHp: this.oppHp }));
            else this.scene.start('GameOver', this.run);
        });
    }

    // ---------------------------------------------------------------------------------------------
    // Drawing
    // ---------------------------------------------------------------------------------------------
    draw() {
        const g = this.view.g, fx = this.fx.g;
        g.clear(); fx.clear();
        const all = [...this.enemies, this.player];
        for (const f of all) {
            const k = Math.max(0.35, 1 - f.h / 60), w = 20 * f.size * k;
            for (let i = 0; i < 3; i++) { g.fillStyle(0x000000, 0.13 * k); g.fillEllipse(f.x, GROUND + 0.5, w * (1 - i * 0.22), 4.6 * (1 - i * 0.22)); }
        }
        for (const d of this.dust) drawDust(g, d);
        for (const f of all) {
            if (f.trail.length > 1) {
                for (let i = 1; i < f.trail.length; i++) {
                    const k = i / f.trail.length, a = f.trail[i - 1], b = f.trail[i];
                    g.lineStyle((0.8 + 3 * k) * f.size, 0xffffff, 0.35 * k);
                    g.lineBetween(a[0], a[1], b[0], b[1]);
                }
            }
            const tint = f.flash > 0 && ((this.clock / 45) | 0) % 2 === 0 ? 0xffffff : undefined;
            const active = !!(f.move && f.phase !== 'wind' && f.move.strike === 'weapon');
            drawFighter(g, f.look, f.pose, f.x, GROUND - f.h, f.face, { tint, active, t: this.clock, ambient: this.ambient, ko: f.state === 'down' });
        }
        for (const q of this.projectiles) drawProjectile(g, q, this.clock);
        for (const s of this.sparks) drawSpark(fx, s);
    }

    buildHUD() {
        const D = this.D, T = (x, y, s, size, col) => this.add.text(x, y, s, { fontFamily: PIXFONT, fontSize: size + 'px', color: col, stroke: '#000000', strokeThickness: 4 }).setDepth(12);
        T(118, 12, 'OOLONG', 16, '#ffffff');
        T(W - 118, 12, D.name, 16, '#ffffff').setOrigin(1, 0);
        this.tScore = goldText(T(W / 2, 14, '000000', 22, '#ffffff').setOrigin(0.5, 0));
        this.tHi = T(W / 2, 48, '', 12, '#c8b890').setOrigin(0.5, 0);
        T(W / 2, 74, `STAGE ${this.run.stage + 1}/${OPPONENTS.length}` + (this.run.loop ? `  KRUG ${this.run.loop + 1}` : ''), 11, '#a09080').setOrigin(0.5, 0);
        this.add.text(W - 118, 78, D.arms, { fontFamily: FONT, fontSize: '18px', color: '#8fd8d0', stroke: '#000000', strokeThickness: 4 }).setOrigin(1, 0).setDepth(12);

        // Panel and portrait frames, drawn once.
        const h = this.add.graphics().setDepth(9.5);
        h.fillGradientStyle(0x2a140a, 0x2a140a, 0x0c0604, 0x0c0604, 0.92, 0.92, 0.92, 0.92);
        h.fillRect(0, 0, W, 112);
        h.fillStyle(0xe0b040); h.fillRect(0, 112, W, 3);
        h.fillStyle(0x6a3a10); h.fillRect(0, 115, W, 2);
        // Portraits: gold rings on the panel, heads clipped to the inner circle.
        const a = this.hudArt.g, mask = this.make.graphics({ add: false });
        for (const [cx, look, f] of [[14, OOLONG, 1], [LW - 14, D.look, -1]]) {
            h.fillStyle(0xe0b040); h.fillCircle(cx * PX, 56, 46);
            h.fillStyle(0x6a3a10); h.fillCircle(cx * PX, 56, 42);
            mask.fillCircle(cx * PX, 56, 40);
            a.fillStyle(0xf0d8a8); a.fillRect(cx - 10, 4, 20, 20);
            a.fillStyle(0x5a8ad0); a.fillRect(cx - 10, 4, 20, 8);
            const pen = makePen(a, 1.55, {});
            drawHead(pen, Object.assign({}, look, { size: 1 }), cx - f * 0.6, 15.6, 1.55, f, 0);
        }
        a.setMask(mask.createGeometryMask());
    }

    drawHUD() {
        const h = this.hud;
        h.clear();
        const bar = (x0, n, max, c0, c1, right) => {
            const sw = Math.floor(Math.min(34, 330 / max));
            for (let i = 0; i < max; i++) {
                const x = right ? x0 - (i + 1) * sw + 4 : x0 + i * sw, on = i < n;
                h.fillStyle(0x000000, 0.6); h.fillRoundedRect(x - 2, 38, sw, 28, 5);
                if (on) { h.fillGradientStyle(c0, c0, c1, c1); h.fillRect(x, 40, sw - 4, 24); h.fillStyle(0xffffff, 0.35); h.fillRect(x + 2, 42, sw - 8, 5); }
                else { h.fillStyle(0x2a1a14); h.fillRect(x, 40, sw - 4, 24); }
            }
        };
        bar(118, this.player.hp, PLAYER_HP, 0xfff080, 0xd88a10, false);
        bar(W - 118, this.oppHp, this.D.hp, 0xff9a8a, 0xa81c24, true);
        for (let i = 0; i < Math.min(this.run.lives, 8); i++) {
            const x = 128 + i * 22, y = 88;
            h.fillStyle(0x1a1410); h.fillCircle(x, y, 8);
            h.fillStyle(SKIN); h.fillCircle(x + 1, y + 1, 6.5);
            h.fillStyle(0x1a1410); h.fillRect(x - 7, y - 7, 14, 5);
            h.fillStyle(C.red); h.fillRect(x - 7, y - 3, 14, 2.5);
        }
        this.tScore.setText(pad6(this.run.score));
        this.tHi.setText('HI ' + pad6(Math.max(this.hi, this.run.score)));
    }
}
