// Fighters live on a 2.5D belt: x along the street, z = depth (screen y of the feet), h = height
// above the ground. One class serves players and enemies; only think() differs.
const GRAV = 920;

const ATTACKS = {
    // player moves
    punch1:  { seq: [['punch1', 140]], active: [30, 120], reach: [2, 26], dmg: 4 },
    punch2:  { seq: [['punch2', 150]], active: [30, 130], reach: [2, 26], dmg: 5 },
    punch3:  { seq: [['punch3', 300]], active: [40, 180], reach: [2, 26], dmg: 8, knock: [70, 240] },
    kick1:   { seq: [['kick1', 230]], active: [60, 190], reach: [4, 32], dmg: 6 },
    kick2:   { seq: [['kick1', 110], ['kick2', 270]], active: [130, 300], reach: [4, 34], dmg: 9, knock: [95, 210] },
    elbow:   { seq: [['elbow', 300]], active: [50, 210], reach: [-30, -2], dmg: 9, knock: [80, 190] },
    swing:   { seq: [['throw', 130], ['swing', 250]], active: [130, 300], reach: [2, 42], dmg: 12, knock: [110, 210] },
    toss:    { seq: [['ready', 130], ['punch1', 200]], throwAt: 140 },
    pickup:  { seq: [['crouch', 180]] },
    // enemy moves have a visible wind-up so they can be read and interrupted
    epunch:  { seq: [['ready', 270], ['punch1', 190]], active: [270, 410], reach: [2, 26], dmg: 5 },
    ekick:   { seq: [['ready', 290], ['kick1', 270]], active: [310, 490], reach: [4, 32], dmg: 7 },
    eswing:  { seq: [['throw', 360], ['swing', 280]], active: [360, 540], reach: [2, 42], dmg: 10, knock: [110, 210] },
    etoss:   { seq: [['ready', 300], ['punch1', 240]], throwAt: 320 },
    whip:    { seq: [['ready', 320], ['punch1', 340]], active: [320, 560], reach: [8, 58], dmg: 6, whip: true },
    bigpunch:{ seq: [['ready', 380], ['punch2', 320]], active: [380, 600], reach: [4, 40], dmg: 11, knock: [110, 220] },
    slam:    { seq: [['throw', 460], ['swing', 340]], active: [460, 700], reach: [2, 44], dmg: 14, knock: [130, 240] },
    charge:  { seq: [['ready', 420], ['punch2', 650]], active: [420, 1060], reach: [2, 36], dmg: 12, knock: [140, 240], lunge: 175 },
};
const AIR = {
    jumpkick: { reach: [-2, 32], dmg: 10, knock: [100, 220] },
    spin:     { reach: [-34, 34], dmg: 12, knock: [120, 230] },
};

class Fighter {
    constructor(scene, def, x, z, team) {
        this.scene = scene; this.def = def; this.team = team;
        this.isPlayer = team === 'player';
        this.scale = def.scale || 1;
        this.x = x; this.z = z; this.h = 0;
        this.vx = 0; this.vh = 0; this.facing = 1;
        this.hp = def.hp; this.maxHp = def.hp;
        this.speed = def.speed;
        this.state = 'idle'; this.t = 0; this.frame = 'idle'; this.walkT = 0;
        this.invuln = 0; this.flash = 0;
        this.daze = 0; this.dazeTimer = 0;
        this.combo = 0; this.comboKind = null; this.comboTimer = 0;
        this.atkCooldown = 600 + Math.random() * 800;
        this.aiT = 0; this.goal = null;
        this.weapon = null;
        this.removed = false;
        this.shadow = scene.add.image(x, z, 'blob').setScale(this.scale / RES);
        this.sprite = scene.add.sprite(x, z, def.key, 'idle').setOrigin(0.5, def.originY).setScale(1 / RES);
        this.wsprite = scene.add.image(0, 0, 'bat').setScale(1 / RES).setVisible(false);
        this.whipSprite = scene.add.image(0, 0, 'whip').setOrigin(0.05, 0.5).setScale(1 / RES).setVisible(false);
    }

    // ---- state helpers -----------------------------------------------------------------------
    set(state) { this.state = state; this.t = 0; }
    toIdle() { this.set('idle'); this.atk = null; this.air = null; this.vx = 0; }
    hittable() {
        if (this.removed || this.invuln > 0) return false;
        return !['fall', 'down', 'getup', 'dead', 'out'].includes(this.state);
    }
    get busyAttacking() { return this.state === 'attack' || (this.state === 'jump' && this.air); }

    update(dt) {
        if (this.removed) return;
        this.t += dt;
        if (this.invuln > 0) this.invuln -= dt;
        if (this.flash > 0) this.flash -= dt;
        if (this.dazeTimer > 0 && (this.dazeTimer -= dt) <= 0) this.daze = 0;
        if (this.comboTimer > 0 && (this.comboTimer -= dt) <= 0) this.combo = 0;
        if (this.atkCooldown > 0) this.atkCooldown -= dt;
        const sec = dt / 1000;

        switch (this.state) {
            case 'idle': case 'walk': this.control(sec); break;
            case 'attack': this.updateAttack(sec); break;
            case 'jump': this.updateJump(sec); break;
            case 'land': this.frame = 'crouch'; if (this.t > 90) this.toIdle(); break;
            case 'hurt':
                this.frame = 'hurt'; this.x += this.vx * sec; this.vx *= 0.88;
                if (this.t > this.stun) this.toIdle();
                break;
            case 'dazed': this.frame = 'dazed'; if (this.t > 1000) this.toIdle(); break;
            case 'grabbed': this.frame = this.t < 120 && this.kneed ? 'hurt' : 'dazed'; break;
            case 'grab': this.updateGrab(sec); break;
            case 'fall': this.updateFall(sec); break;
            case 'down':
                this.frame = 'down';
                if (this.t > (this.hp <= 0 ? 500 : this.isPlayer ? 700 : 1000)) {
                    if (this.hp <= 0) { this.set('dead'); this.scene.onKO(this); }
                    else this.set('getup');
                }
                break;
            case 'getup': this.frame = 'crouch'; if (this.t > 280) { this.toIdle(); this.invuln = 450; } break;
            case 'dead':
                this.frame = 'down';
                if (this.t > 1100) this.scene.onDeathDone(this);
                break;
            case 'win': this.frame = 'win'; break;
            case 'out': break;
        }
        this.scene.clampFighter(this);
        this.render();
    }

    // ---- control: movement + starting actions -------------------------------------------------
    control(sec) {
        const it = this.think(sec) || {};
        if (it.jump) return this.startJump(it.mx || 0, it.air);
        if (it.attack) return this.startAttack(it.attack);
        if (it.punch && this.playerPunch()) return;
        if (it.kick && this.playerKick()) return;
        const mx = it.mx || 0, mz = it.mz || 0;
        if (mx || mz) {
            this.state = 'walk';
            this.x += mx * this.speed * sec;
            this.z += mz * this.speed * 0.6 * sec;
            if (mx && !it.noTurn) this.facing = mx;
            this.walkT += sec * 1000;
            this.frame = ['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(this.walkT / 120) % 4];
            if (this.isPlayer && mx) this.tryGrab(mx);
        } else {
            this.state = 'idle';
            this.frame = 'idle';
        }
    }

    startAttack(name) {
        this.set('attack');
        this.atk = ATTACKS[name]; this.atkName = name;
        this.hitSet = new Set(); this.whooshed = false; this.tossed = false; this.connected = false;
        this.atkTotal = this.atk.seq.reduce((a, s) => a + s[1], 0);
        this.frame = this.atk.seq[0][0];
    }

    updateAttack(sec) {
        const a = this.atk;
        let acc = 0, frame = a.seq[a.seq.length - 1][0];
        for (const [f, d] of a.seq) { if (this.t < acc + d) { frame = f; break; } acc += d; }
        this.frame = frame;
        if (a.active) {
            if (this.t >= a.active[0] && !this.whooshed) { this.whooshed = true; Sound.play(a.whip ? 'whip' : 'whoosh'); }
            if (a.lunge && this.t >= a.active[0] && this.t <= a.active[1]) this.x += this.facing * a.lunge * sec;
            if (this.t >= a.active[0] && this.t <= a.active[1]) this.hitScan(a, false);
        }
        if (a.throwAt && !this.tossed && this.t >= a.throwAt) {
            this.tossed = true;
            this.scene.spawnKnife(this);
            this.weapon = null;
        }
        if (this.atkName === 'pickup' && !this.tossed && this.t > 90) {
            this.tossed = true;
            const p = this.scene.pickupNear(this);
            if (p) { this.weapon = p.type; this.scene.removePickup(p); Sound.play('pickup'); }
        }
        if (this.t >= this.atkTotal) {
            if (!this.connected && this.isPlayer) this.combo = 0;
            this.toIdle();
        }
    }

    hitScan(a, air) {
        for (const o of this.scene.fighters) {
            if (o === this || o.team === this.team || this.hitSet.has(o) || !o.hittable()) continue;
            const rel = (o.x - this.x) * this.facing, hw = 5 * o.scale;
            if (rel < a.reach[0] - hw || rel > a.reach[1] + hw) continue;
            if (Math.abs(o.z - this.z) > 9 + 2 * this.scale) continue;
            if (air ? Math.abs(o.h - this.h) > 44 : o.h > 30) continue;
            this.hitSet.add(o);
            const dir = Math.sign(o.x - this.x) || this.facing;
            if (o.takeHit(this, a, dir)) { this.connected = true; this.comboTimer = 650; }
        }
        if (this.isPlayer) this.scene.hitProps(this, a);
    }

    takeHit(by, a, dir) {
        if (!this.hittable()) return false;
        const sc = this.scene;
        this.hp = Math.max(0, this.hp - a.dmg);
        this.flash = 70;
        sc.spark(this.x - dir * 5 * this.scale, this.z - this.h - 40 * this.scale, !!a.knock);
        Sound.play(a.knock ? 'heavy' : 'hit');
        sc.hitstop(a.knock ? 70 : 45);
        sc.onDamage(by, this, a.dmg);
        if (this.grabbedBy) this.grabbedBy.releaseGrab(false);
        if (this.grabbing) this.releaseGrab(false);
        this.facing = -dir;
        this.daze++; this.dazeTimer = 1100;
        const heavy = this.def.heavy;
        if (this.hp <= 0 || (a.knock && (!heavy || this.daze >= 2 || Math.random() < 0.5)) || (heavy && this.daze >= 5) || (this.isPlayer && this.daze >= 3)) {
            this.knockdown(dir, a.knock || [80, 200]);
            if (a.knock || this.hp <= 0) sc.shake(120, 0.006);
        } else if (heavy && this.state === 'attack' && Math.random() < 0.6) {
            // super armour: big guys shrug off jabs mid-swing
        } else if (!this.isPlayer && !heavy && this.daze >= 2 && !this.def.boss) {
            this.set('dazed'); this.atk = null; this.vx = 0;
        } else {
            this.set('hurt'); this.atk = null; this.air = null; this.h = 0;
            this.stun = heavy ? 160 : 290; this.vx = dir * 50;
        }
        return true;
    }

    knockdown(dir, k) {
        this.set('fall');
        this.atk = null; this.air = null;
        this.vx = dir * k[0]; this.vh = k[1]; this.h = Math.max(this.h, 1);
        this.facing = -dir; this.bounced = false; this.daze = 0;
        this.dropWeapon();
    }

    dropWeapon() {
        if (!this.weapon) return;
        this.scene.spawnPickup(this.weapon, this.x, this.z, true);
        this.weapon = null;
    }

    updateFall(sec) {
        this.frame = 'fall';
        this.x += this.vx * sec;
        this.vh -= GRAV * sec; this.h += this.vh * sec;
        if (this.thrownBy) this.scene.bodyCollide(this);
        if (this.h <= 0) {
            this.h = 0;
            if (!this.bounced && this.vh < -160) {
                this.bounced = true; this.vh = 90; this.vx *= 0.4;
                Sound.play('thud'); this.scene.shake(90, 0.004); this.scene.dust(this.x, this.z);
            } else {
                this.set('down'); this.vx = 0; this.thrownBy = null;
                if (!this.bounced) { Sound.play('thud'); this.scene.dust(this.x, this.z); }
            }
        }
    }

    startJump(mx, air) {
        this.set('jump');
        this.vh = 300; this.vx = mx * this.speed * 1.15; this.air = null; this.airPlan = air || null;
        if (mx) this.facing = mx;
        Sound.play('jump');
    }

    updateJump(sec) {
        if (this.isPlayer) {
            const it = this.think(sec) || {};
            if (it.kick && !this.air) this.startAir(Math.abs(this.vh) < 80 ? 'spin' : 'jumpkick');
        } else if (this.airPlan && !this.air) {
            if ((this.airPlan === 'jumpkick' && this.t > 140) || (this.airPlan === 'spin' && this.vh < 60)) this.startAir(this.airPlan);
        }
        if (this.air === 'spin' && this.airT < 420) this.vh = Math.max(this.vh, -40);
        this.x += this.vx * sec;
        this.vh -= GRAV * sec; this.h += this.vh * sec;
        if (this.air) {
            this.airT += sec * 1000;
            if (this.air === 'spin') {
                this.frame = 'spin';
                this.spinFlip = Math.floor(this.airT / 70) % 2 === 1;
                if (this.airT < 480) this.hitScan(AIR.spin, true);
                else this.frame = 'jump';
            } else {
                this.frame = 'jumpkick';
                this.hitScan(AIR.jumpkick, true);
            }
        } else this.frame = 'jump';
        if (this.h <= 0) {
            this.h = 0; this.set('land'); this.vx = 0; this.air = null; this.spinFlip = false;
            Sound.play('land');
        }
    }

    startAir(kind) {
        this.air = kind; this.airT = 0; this.hitSet = new Set();
        Sound.play('whoosh');
    }

    // ---- player-only: punch / kick selection, grabs ------------------------------------------
    playerPunch() {
        if (!this.weapon && this.scene.pickupNear(this)) { this.startAttack('pickup'); return true; }
        if (this.weapon === 'bat') { this.startAttack('swing'); return true; }
        if (this.weapon === 'knife') { this.startAttack('toss'); return true; }
        if (this.enemyBehind()) { this.startAttack('elbow'); return true; }
        const next = this.comboKind === 'p' && this.comboTimer > 0 ? Math.min(this.combo + 1, 2) : 0;
        this.combo = next; this.comboKind = 'p';
        this.startAttack(['punch1', 'punch2', 'punch3'][next]);
        if (next === 2) this.combo = 0;
        return true;
    }

    playerKick() {
        if (this.enemyBehind()) { this.startAttack('elbow'); return true; }
        const next = this.comboKind === 'k' && this.comboTimer > 0 ? Math.min(this.combo + 1, 2) : 0;
        this.combo = next; this.comboKind = 'k';
        this.startAttack(next === 2 ? 'kick2' : 'kick1');
        if (next === 2) this.combo = 0;
        return true;
    }

    // Classic back-elbow: when the nearest threat is right behind you and nothing is in front.
    enemyBehind() {
        let behind = false, front = false;
        for (const o of this.scene.enemies()) {
            if (!o.hittable() || Math.abs(o.z - this.z) > 10) continue;
            const rel = (o.x - this.x) * this.facing;
            if (rel > -2 && rel < 40) front = true;
            if (rel < -2 && rel > -30) behind = true;
        }
        return behind && !front;
    }

    tryGrab(mx) {
        for (const o of this.scene.enemies()) {
            if (o.state !== 'dazed' || o.invuln > 0) continue;
            const rel = (o.x - this.x) * mx;
            if (rel > 4 && rel < 20 && Math.abs(o.z - this.z) < 7) {
                this.set('grab'); this.grabbing = o; this.grabAct = null; this.knees = 0;
                o.set('grabbed'); o.grabbedBy = this; o.facing = -this.facing; o.atk = null; o.h = 0;
                Sound.play('grab');
                return;
            }
        }
    }

    updateGrab(sec) {
        const o = this.grabbing;
        if (!o || o.removed || o.state !== 'grabbed') { this.grabbing = null; this.toIdle(); return; }
        o.x = this.x + this.facing * 15; o.z = this.z + 0.1; o.facing = -this.facing;
        if (!this.grabAct) {
            this.frame = 'grab';
            const it = this.think(sec) || {};
            if (it.kick) { this.grabAct = 'knee'; this.actT = 0; this.kneeHit = false; }
            else if (it.punch) { this.grabAct = 'throw'; this.actT = 0; this.thrownDone = false; }
            else if (this.t > 220 && it.mx === -this.facing) { this.releaseGrab(true); return; }
            else if (this.t > 1700) { this.releaseGrab(true); return; }
            return;
        }
        this.actT += sec * 1000;
        if (this.grabAct === 'knee') {
            this.frame = 'knee';
            if (!this.kneeHit && this.actT > 70) {
                this.kneeHit = true; this.knees++;
                o.hp = Math.max(0, o.hp - 6); o.kneed = true; o.t = 0; o.flash = 70;
                this.scene.spark(o.x, o.z - 36 * o.scale, false); Sound.play('hit'); this.scene.hitstop(50);
                this.scene.onDamage(this, o, 6);
                if (this.knees >= 3 || o.hp <= 0) {
                    o.grabbedBy = null; this.grabbing = null;
                    o.knockdown(this.facing, [90, 230]); this.scene.shake(100, 0.005);
                }
            }
            if (this.actT > 210) { if (this.grabbing) { this.grabAct = null; this.t = 0; } else this.toIdle(); }
        } else {
            this.frame = this.actT < 130 ? 'grab' : 'throw';
            if (this.actT > 130) { o.x = this.x - this.facing * 2; o.h = 26; }
            if (!this.thrownDone && this.actT > 230) {
                this.thrownDone = true;
                o.grabbedBy = null; this.grabbing = null;
                o.hp = Math.max(0, o.hp - 10); o.x = this.x - this.facing * 14;
                this.scene.onDamage(this, o, 10);
                o.knockdown(-this.facing, [160, 260]); o.thrownBy = this;
                Sound.play('heavy');
            }
            if (this.actT > 420) this.toIdle();
        }
    }

    releaseGrab(pushAway) {
        const o = this.grabbing;
        this.grabbing = null;
        if (o && o.state === 'grabbed') {
            o.grabbedBy = null; o.set('hurt'); o.stun = 200; o.vx = pushAway ? this.facing * 60 : 0;
        }
        if (this.state === 'grab') this.toIdle();
    }

    // ---- brains ----------------------------------------------------------------------------
    think(sec) {
        if (this.isPlayer) {
            const c = this.ctrl;
            return { mx: c.mx, mz: c.mz, punch: c.pressed.punch, kick: c.pressed.kick, jump: c.pressed.jump && this.state !== 'jump' && this.state !== 'grab' };
        }
        return this.aiThink(sec);
    }

    aiThink(sec) {
        const sc = this.scene;
        const tgt = sc.nearestPlayer(this);
        if (!tgt) return { mx: 0, mz: 0 };
        const dx = tgt.x - this.x, dz = tgt.z - this.z, adx = Math.abs(dx);
        const def = this.def;
        const reachDist = def.attacks.includes('whip') ? 46 : (this.scale > 1.1 ? 32 : 24);
        const onScreen = this.x > sc.camX + 4 && this.x < sc.camX + GAME_W - 4;

        this.aiT -= sec * 1000;
        if (this.aiT <= 0 || !this.goal) {
            this.aiT = 250 + Math.random() * 400;
            const side = dx > 0 ? -1 : 1;
            this.goal = { x: tgt.x + side * reachDist, z: tgt.z + (Math.random() - 0.5) * 4 };
            // Some variety: hang back, circle, or go for a weapon on the floor.
            const r = Math.random();
            if (r < 0.12 && !def.boss) this.goal = { x: tgt.x + side * (70 + Math.random() * 40), z: FLOOR_TOP + 6 + Math.random() * (FLOOR_BOT - FLOOR_TOP - 12) };
            if (!this.weapon && !def.heavy && !def.attacks.includes('whip')) {
                const p = sc.pickupNear(this, 90);
                if (p && Math.random() < 0.5) this.goal = { x: p.x, z: p.z, pickup: p };
            }
            // Never settle off-screen: if the player is pinned to an edge, come round the other side.
            const lo = sc.camX + 14, hi = sc.camX + GAME_W - 14;
            if (this.goal.x < lo || this.goal.x > hi) {
                const flipped = tgt.x - side * reachDist;
                this.goal.x = Phaser.Math.Clamp(flipped >= lo && flipped <= hi ? flipped : this.goal.x, lo, hi);
            }
        }
        if (onScreen) this.facing = dx >= 0 ? 1 : -1;

        // pick up a weapon we walked onto
        if (this.goal.pickup && sc.pickupNear(this)) { this.goal = null; return { attack: 'pickup' }; }

        const ready = this.atkCooldown <= 0 && onScreen && tgt.hittable() && (def.boss || def.heavy || sc.attackers() < 2);
        if (ready) {
            const cd = def.boss ? 450 + Math.random() * 500 : def.heavy ? 900 + Math.random() * 900 : 900 + Math.random() * 1300;
            if (this.weapon === 'knife' && Math.abs(dz) < 5 && adx > 50 && adx < 150) { this.atkCooldown = cd; return { attack: 'etoss' }; }
            const inRange = adx < reachDist + 8 && adx > 6 && Math.abs(dz) < 7;
            if (inRange) {
                this.atkCooldown = cd;
                if (this.weapon === 'bat') return { attack: 'eswing' };
                const pick = def.attacks[Math.floor(Math.random() * def.attacks.length)];
                if (pick === 'espin' && Math.random() < 0.5) return { jump: true, mx: 0, air: 'spin' };
                return { attack: pick === 'ejumpkick' || pick === 'espin' ? 'ekick' : pick };
            }
            if (Math.abs(dz) < 6 && adx > 40 && adx < 90) {
                if (def.attacks.includes('ejumpkick') && Math.random() < 0.02) { this.atkCooldown = cd; return { jump: true, mx: Math.sign(dx), air: 'jumpkick' }; }
                if (def.attacks.includes('espin') && Math.random() < 0.025) { this.atkCooldown = cd; return { jump: true, mx: Math.sign(dx), air: 'spin' }; }
                if (def.attacks.includes('charge') && Math.random() < 0.02) { this.atkCooldown = cd; return { attack: 'charge' }; }
            }
        }

        const gx = this.goal.x - this.x, gz = this.goal.z - this.z;
        const mx = Math.abs(gx) > 3 ? Math.sign(gx) : 0;
        const mz = Math.abs(gz) > 2 ? Math.sign(gz) : 0;
        return { mx, mz, noTurn: onScreen };
    }

    // ---- drawing -------------------------------------------------------------------------------
    render() {
        const s = this.sprite;
        if (this.state === 'out') { s.setVisible(false); this.shadow.setVisible(false); this.wsprite.setVisible(false); this.whipSprite.setVisible(false); return; }
        s.setFrame(this.frame);
        s.x = this.x; s.y = this.z - this.h;
        const face = this.spinFlip ? -this.facing : this.facing;
        s.setFlipX(face < 0);
        s.setDepth(this.z);
        let vis = true;
        if (this.state === 'dead') vis = Math.floor(this.t / 70) % 2 === 0;
        else if (this.invuln > 0) vis = Math.floor(this.invuln / 60) % 2 === 0;
        s.setVisible(vis);
        if (this.flash > 0) s.setTintFill(0xffffff); else s.clearTint();
        this.shadow.setPosition(this.x, this.z).setDepth(this.z - 200);
        const shrink = Math.max(0.5, 1 - this.h / 120);
        this.shadow.setScale(this.scale * shrink * (this.frame === 'down' ? 1.5 : 1) / RES, this.scale * shrink / RES).setVisible(true);

        const hand = this.def.hands[this.frame];
        if (this.weapon && vis) {
            this.wsprite.setTexture(this.weapon).setVisible(true);
            this.wsprite.setOrigin(this.weapon === 'bat' ? 0.12 : 0.2, 0.5);
            this.wsprite.setPosition(this.x + face * hand.x, this.z - this.h - hand.y);
            this.wsprite.setAngle(face > 0 ? hand.a : 180 - hand.a).setFlipY(face < 0);
            this.wsprite.setDepth(this.z + 0.1);
        } else this.wsprite.setVisible(false);

        const showWhip = this.atk && this.atk.whip && this.state === 'attack' && this.t >= this.atk.active[0] && this.t <= this.atk.active[1];
        if (showWhip && vis) {
            const k = Math.min(1, (this.t - this.atk.active[0]) / 90);
            this.whipSprite.setVisible(true).setPosition(this.x + face * hand.x, this.z - this.h - hand.y);
            this.whipSprite.setScale(k / RES, 1 / RES).setFlipX(face < 0).setOrigin(face > 0 ? 0.05 : 0.95, 0.5).setDepth(this.z + 0.2);
        } else this.whipSprite.setVisible(false);
    }

    destroy() {
        this.removed = true;
        this.sprite.destroy(); this.shadow.destroy(); this.wsprite.destroy(); this.whipSprite.destroy();
    }
}
