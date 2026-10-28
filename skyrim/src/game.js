// The world scene: map, player, combat, creatures, dragons, shouts and quest triggers.
const OBJ_DEF = {
    house: { solid: [148, 64] }, inn: { solid: [212, 84] }, shop: { solid: [134, 64] }, forge: { solid: [118, 46] },
    dragonsreach: { solid: [300, 130] }, hrothgar: { solid: [300, 120] }, watchtower: { solid: [92, 64] }, barrow: { solid: [200, 56] },
    gildergreen: { solid: [22, 14] }, tent: { solid: [56, 22] }, tent_big: { solid: [110, 40] }, campfire: { solid: [26, 10], light: true },
    chest: { solid: [28, 10] }, wordwall: { solid: [104, 28] }, shrine: { solid: [30, 14] }, sign: { solid: [8, 6] },
    torch_post: { solid: [6, 6], light: true }, torch: { light: true }, exitdoor: {}, web: {}, urn: { solid: [16, 8] },
    sarcophagus: { solid: [34, 56] }, pillar: { solid: [26, 12] }, hint: {}, stone_big: { solid: [48, 18] },
};
const TRAVEL = {
    riverwood: [28, 69], whiterun: [89, 62], barrow: [20, 31], watchtower: [75, 78], camp: [82, 43],
    giants: [107, 84], hrothgar: [59, 25], summit: [64, 12], helgen: [28, 88],
};
const PILLAR_ANSWER = [0, 0, 1];

class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create() {
        G = this;
        const M = this.M = World.maps[S.map];
        this.now = 0; this.dead = false; this.changing = false; this.frozenUntil = 0;
        this.atkReady = 0; this.castReady = 0; this.shoutReady = 0; this.shoutMax = 1; this.invulnUntil = 0;
        this.lastHurt = -99999; this.mpUseAt = -99999; this.spUseAt = -99999; this.flameTick = 0; this.saveAt = 20000;
        this.swing = null; this.dash = null; this.kb = null;

        const map = this.make.tilemap({ data: M.data, tileWidth: TS, tileHeight: TS });
        const ts = map.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0);
        this.layer = map.createLayer(0, ts, 0, 0).setDepth(-100);
        this.layer.setCollision(SOLID_TILES);
        // soft light and shade across the ground so repeated tiles don't read as wallpaper
        this.layer.forEachTile(t => {
            const v = Math.round(255 * (0.84 + 0.16 * fbm(t.x / 6, t.y / 6, 21)));
            t.tint = (v << 16) | (v << 8) | v;
        });
        this.physics.world.setBounds(0, 0, M.w * TS, M.h * TS);
        this.cameras.main.setBounds(0, 0, M.w * TS, M.h * TS);
        this.cameras.main.setBackgroundColor(M.dark ? '#0d0c0b' : '#55575b');

        this.solids = this.physics.add.staticGroup();
        this.foeGroup = this.physics.add.group();
        this.objs = []; this.npcs = []; this.foes = []; this.dragons = []; this.lightsList = []; this.proj = []; this.fx = [];
        M.trees.forEach(t => this.addTree(t));
        M.objs.forEach(o => this.addObj(o));
        M.npcs.forEach(n => this.addNpc(n));
        M.foes.forEach(f => { if (!(f.uid && S.killed[f.uid])) this.spawnFoe(f.k, f.x, f.y, f); });
        if (M.id === 'barrow' && S.flags.arvelFreed && !S.killed.arvel) this.spawnFoe('arvel', tilePx(45), tilePx(17), { uid: 'arvel' });

        const p = this.player = this.physics.add.sprite(S.x, S.y, 'player').setOrigin(0.5, 1);
        p.body.setSize(16, 10).setOffset(8, 33);
        p.setCollideWorldBounds(true);
        this.weapon = this.add.image(p.x, p.y, 'sword').setOrigin(0.5, 0.92);
        this.handGlow = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
        this.gfx = this.add.graphics().setDepth(8000);
        this.physics.add.collider(p, this.layer);
        this.physics.add.collider(p, this.solids);
        this.physics.add.collider(this.foeGroup, this.layer);
        this.physics.add.collider(this.foeGroup, this.solids);
        this.physics.add.collider(this.foeGroup, this.foeGroup);

        const cam = this.cameras.main;
        cam.startFollow(p, true, 0.12, 0.12);
        cam.roundPixels = true;
        cam.fadeIn(500);

        this.dark = this.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(9000);
        this.snow = this.add.particles(0, 0, 'flake', {
            x: { min: -60, max: W + 60 }, y: -10, lifespan: 7000, speedY: { min: 40, max: 95 }, speedX: { min: -35, max: 10 },
            scale: { min: 0.4, max: 1.2 }, alpha: { start: 0.9, end: 0.2 }, frequency: 35, quantity: 2, emitting: false,
        }).setScrollFactor(0).setDepth(8999);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,F,Q,R,Z,X,C,ONE,TWO,THREE');
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', ptr => {
            if (this.locked()) return;
            Sfx.init();
            if (ptr.rightButtonDown()) this.castPress(); else this.attack();
        });
        const K = this.keys;
        K.SPACE.on('down', () => !this.locked() && this.attack());
        K.F.on('down', () => !this.locked() && this.castPress());
        K.E.on('down', () => !this.locked() && this.interact());
        K.Q.on('down', () => !this.locked() && this.toggleHand());
        K.R.on('down', () => !this.locked() && this.cycleSpell());
        K.Z.on('down', () => !this.locked() && this.shout('fus'));
        K.X.on('down', () => !this.locked() && this.shout('wuld'));
        K.C.on('down', () => !this.locked() && this.shout('joor'));
        K.ONE.on('down', () => !this.locked() && this.quickPotion('hp'));
        K.TWO.on('down', () => !this.locked() && this.quickPotion('mp'));
        K.THREE.on('down', () => !this.locked() && this.quickPotion('sp'));
        this.events.on('resume', () => this.input.keyboard.resetKeys());

        this.updateWeaponTex();
        if (!this.scene.isActive('UI')) this.scene.launch('UI'); else UI.onMapLoaded();
        if (!S.intro) this.time.delayedCall(50, () => UI.intro());
        Sfx.startMusic();
    }

    locked() { return this.dead || this.changing || this.now < this.frozenUntil; }

    // ---------- world objects ----------
    addSolid(x, y, w, h) {
        const z = this.add.zone(x, y, w, h);
        this.physics.add.existing(z, true);
        this.solids.add(z);
        return z;
    }
    addTree(t) {
        const img = this.add.image(t.x, t.y, t.t).setOrigin(0.5, 1).setDepth(t.y);
        if (!t.deco) this.addSolid(t.x, t.y - 5, t.t === 'bush' ? 14 : 12, 8);
        if (t.t === 'bush' || t.deco) return;
        // a gentle sway
        this.tweens.add({ targets: img, angle: { from: -0.8, to: 0.8 }, duration: 1800 + Math.random() * 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 1500 });
    }
    addObj(o) {
        const def = OBJ_DEF[o.t] || {};
        if (o.t === 'gate' && S.flags.gateOpen) return;
        if (o.t === 'clawdoor' && S.flags.clawUsed) return;
        if (o.t === 'web' && S.flags.arvelFreed) return;
        let tex = o.t;
        if (o.t === 'gate') tex = o.vertical ? 'gate_v' : 'gate_h';
        if (o.t === 'clawdoor') tex = o.vertical ? 'clawdoor_v' : 'clawdoor_h';
        if (o.t === 'chest' && S.opened[o.id]) tex = 'chest_open';
        if (o.t === 'pillar') { o.state = S.flags['pillar' + o.idx] ?? [2, 1, 2][o.idx]; tex = 'pillar' + o.state; }
        if (o.t === 'hint') tex = 'hint' + o.sym;
        const img = this.add.image(o.x, o.y, tex);
        const ob = { o, img, def };
        if (o.center) {
            img.setDepth(o.y + 16);
            ob.solid = o.vertical ? this.addSolid(o.x, o.y, 32, 100) : this.addSolid(o.x, o.y, 100, 32);
        } else {
            img.setOrigin(0.5, 1).setDepth(o.t === 'hint' || o.t === 'torch' || o.t === 'web' ? o.y - 40 : o.y);
            if (def.solid) ob.solid = this.addSolid(o.x, o.y - def.solid[1] / 2, def.solid[0], def.solid[1]);
        }
        if (o.t === 'torch' || o.t === 'campfire' || o.t === 'torch_post') {
            this.tweens.add({ targets: img, alpha: { from: 0.85, to: 1 }, duration: 120 + Math.random() * 100, yoyo: true, repeat: -1 });
        }
        if (def.light) this.lightsList.push({ x: o.x, y: o.y - (o.t === 'torch_post' ? 36 : 12), r: o.t === 'campfire' ? 1.2 : 0.8 });
        if (o.t === 'forge') this.lightsList.push({ x: o.x - 25, y: o.y - 20, r: 0.7 });
        if (o.t === 'wordwall' && M_isBarrow(this) && !S.words.fus) this.tweens.add({ targets: img, alpha: { from: 0.75, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
        this.objs.push(ob);
        return ob;
    }
    addNpc(n) {
        if (n.id === 'arvel' && S.flags.arvelFreed) return;
        const def = NPCS[n.id];
        const big = def.tex === 'paarthurnax';
        const s = this.add.image(n.x, n.y, def.tex).setOrigin(0.5, big ? 0.6 : 1).setDepth(n.y);
        if (big) s.setScale(0.62).setDepth(n.y - 60);
        const npc = { id: n.id, def, spr: s, home: { x: n.x, y: n.y }, wander: n.wander || 0, tx: n.x, ty: n.y, waitUntil: 0, big };
        this.npcs.push(npc);
        if (!big) this.tweens.add({ targets: s, scaleY: { from: 1, to: 1.025 }, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // ---------- foes ----------
    spawnFoe(k, x, y, opt = {}) {
        const def = FOES[k];
        if (def.dragon) return this.spawnDragon(k, x, y);
        // never start inside rock or water: step outwards to the nearest open tile
        const open = (px, py) => { const t = this.layer.getTileAtWorldXY(px, py); return t && !t.collides; };
        for (let r = 1; r < 8 && !open(x, y); r++) {
            const spot = [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]].find(([ox, oy]) => open(x + ox * TS, y + oy * TS));
            if (spot) { x += spot[0] * TS; y += spot[1] * TS; }
        }
        const f = this.foeGroup.create(x, y, def.tex);
        f.setOrigin(0.5, 1);
        const s = def.scale || 1;
        f.setScale(s);
        const bw = Math.min(f.width * 0.55, 24), bh = 10;
        f.body.setSize(bw, bh).setOffset((f.width - bw) / 2, f.height - bh - 2);
        Object.assign(f, {
            def, k, hp: def.hp, maxHp: def.hp, home: { x, y }, uid: opt.uid, sleep: !!opt.sleep, dormant: !!opt.dormant,
            neutral: !!def.neutral, nextAtk: 0, hunting: false, stunUntil: 0, wanderUntil: 0, windUntil: 0, spitReady: 0,
            shoutReady: 0, slowUntil: 0, detourUntil: 0, detour: 1, baseScale: s, hitAt: -99999,
        });
        if (f.sleep) f.setTint(0x6a6a6a).setAlpha(0.9);
        if (opt.uid === 'arvel') f.hunting = true;
        this.foes.push(f);
        return f;
    }

    updateFoe(f, dt) {
        const now = this.now, p = this.player;
        const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
        f.setDepth(f.y);
        if (d > 1000 && !f.hunting) { f.body.setVelocity(0, 0); return; }
        if (f.def.regen && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + f.def.regen * dt);
        if (f.sleep) {
            f.body.setVelocity(0, 0);
            if (!f.dormant && (d < 150 || now - f.hitAt < 500)) {
                f.sleep = false; f.clearTint(); f.setAlpha(1); f.hunting = true;
                Sfx.play('groan'); this.floatText(f.x, f.y - 50, '!', '#9fe8ff', 22);
            }
            return;
        }
        if (now < f.stunUntil) { f.body.velocity.scale(Math.pow(0.02, dt)); return; }
        const slow = now < f.slowUntil ? 0.5 : 1;
        if (slow < 1) f.setTint(0x9fd8ff); else if (now > f.windUntil && f.tintTopLeft === 0x9fd8ff) f.clearTint();

        if (!f.hunting && !f.neutral && d < f.def.aggro && !this.dead) { f.hunting = true; if (f.def.beast) Sfx.play('growl'); }
        if (f.hunting && (dist(f.x, f.y, f.home.x, f.home.y) > 900 && d > 350 || this.dead)) f.hunting = false;

        let vx = 0, vy = 0;
        if (f.hunting) {
            const ang = Math.atan2(dy, dx);
            const sp = f.def.speed * slow;
            if (f.def.ranged) {
                if (d > f.def.range) { vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp; }
                else if (d < 120) { vx = -Math.cos(ang) * sp * 0.7; vy = -Math.sin(ang) * sp * 0.7; }
                if (d < f.def.range + 30 && now > f.nextAtk) {
                    f.nextAtk = now + f.def.cd;
                    this.shoot({ x: f.x, y: f.y - 20, ang: Math.atan2(p.y - 18 - (f.y - 20), dx), speed: 430, dmg: f.def.dmg, tex: 'arrow', foe: true });
                    Sfx.play('arrow');
                }
            } else {
                if (d > f.def.range) { vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp; }
                if (d < f.def.range + 6 && now > f.nextAtk && f.windUntil < now) {
                    f.windUntil = now + 320; f.setTint(0xffb0a0);
                    this.time.delayedCall(320, () => {
                        if (!f.active || f.hp <= 0 || now < f.stunUntil) return;
                        f.clearTint();
                        if (dist(f.x, f.y, this.player.x, this.player.y) < f.def.range + 18) this.hurtPlayer(f.def.dmg, f.x, f.y, f.k === 'giant' ? 520 : 120);
                        this.slashFx(f.x, f.y - 18, Math.atan2(this.player.y - f.y, this.player.x - f.x), 0xffd0c0);
                        Sfx.play('swing');
                    });
                    f.nextAtk = now + f.def.cd;
                }
                if (now < f.windUntil) { vx *= 0.2; vy *= 0.2; }
            }
            if (f.def.spit && d > 90 && d < 300 && now > f.spitReady) {
                f.spitReady = now + 2600;
                this.shoot({ x: f.x, y: f.y - 20, ang: Math.atan2(dy, dx), speed: 330, dmg: 10, tex: 'spit', foe: true, slow: true });
            }
            if (f.def.shout && d < 190 && now > f.shoutReady) {
                f.shoutReady = now + 9000;
                this.floatText(f.x, f.y - 70, 'FUS RO DAH!', '#9fe8ff', 26);
                Sfx.play('shout'); this.cameras.main.shake(300, 0.012);
                this.shockFx(f.x, f.y - 20, Math.atan2(dy, dx), 200, 0x9fe8ff);
                this.hurtPlayer(10, f.x, f.y, 700);
            }
            // slide around obstacles
            const b = f.body.blocked;
            if ((b.left || b.right || b.up || b.down) && now > f.detourUntil) { f.detourUntil = now + 500; f.detour = Math.random() < 0.5 ? 1 : -1; }
            if (now < f.detourUntil) { const t = vx; vx = -vy * f.detour + vx * 0.3; vy = t * f.detour + vy * 0.3; }
        } else {
            // wander near home
            if (now > f.wanderUntil) {
                f.wanderUntil = now + rnd(1500, 3500);
                const back = dist(f.x, f.y, f.home.x, f.home.y) > 140;
                const a = back ? Math.atan2(f.home.y - f.y, f.home.x - f.x) : rnd(0, Math.PI * 2);
                f.wv = Math.random() < 0.45 && !back ? 0 : f.def.speed * 0.35;
                f.wa = a;
            }
            vx = Math.cos(f.wa || 0) * (f.wv || 0); vy = Math.sin(f.wa || 0) * (f.wv || 0);
        }
        f.body.setVelocity(vx, vy);
        if (Math.abs(vx) > 5) f.setFlipX(vx < 0);
        else if (f.hunting) f.setFlipX(dx < 0);
        const moving = Math.abs(vx) + Math.abs(vy) > 10;
        f.scaleY = f.baseScale * (moving ? 1 + Math.sin(now / 70) * 0.04 : 1);
    }

    hurtFoe(f, dmg, ang, kb = 120, opts = {}) {
        if (!f.active || f.hp <= 0) return;
        if (f.sleep && f.dormant) return;
        f.hp -= dmg; f.hitAt = this.now; f.hunting = true; f.neutral = false;
        if (f.sleep) { f.sleep = false; f.clearTint(); f.setAlpha(1); }
        f.setTintFill(0xffffff);
        this.time.delayedCall(70, () => f.active && f.clearTint());
        this.floatText(f.x + rnd(-8, 8), f.y - f.displayHeight - 4, String(Math.round(dmg)), opts.col || '#ffe0a0', 16);
        if (kb) { f.body.setVelocity(Math.cos(ang) * kb * 2.2, Math.sin(ang) * kb * 2.2); f.stunUntil = this.now + (opts.stun || 160); }
        if (opts.slow) f.slowUntil = this.now + 3000;
        UI.target = f; UI.targetAt = this.now;
        Sfx.play('hit');
        for (let i = 0; i < 5; i++) this.puff(f.x, f.y - f.displayHeight * 0.5, 'spark', { vx: rnd(-120, 120), vy: rnd(-160, 40), life: 300, s0: 0.8, s1: 0.2, tint: f.def.beast ? 0xb02020 : 0xd03030 });
        if (f.hp <= 0) this.killFoe(f);
    }

    killFoe(f) {
        f.hp = 0;
        f.body.enable = false;
        this.foes = this.foes.filter(x => x !== f);
        f.setTint(0x505050);
        this.tweens.add({ targets: f, angle: f.flipX ? -90 : 90, y: f.y - 4, duration: 300 });
        this.tweens.add({ targets: f, alpha: 0, delay: 15000, duration: 1500, onComplete: () => f.destroy() });
        Sfx.play('die');
        S.kills++;
        this.addXP(f.def.xp);
        const g = rint(f.def.gold[0], f.def.gold[1]);
        if (g > 0) this.addGold(g);
        if (f.def.loot && Math.random() < f.def.loot) this.give(pick(['potion_hp', 'potion_hp', 'potion_mp', 'potion_sp']), 1);
        if (f.uid) {
            S.killed[f.uid] = true;
            if (f.uid === 'chief' && S.f.bounty <= 1) { S.f.bounty = 2; this.questUpdate('bounty', 'Zadatak ažuriran'); }
            if (f.uid === 'arvel') this.give('golden_claw', 1);
            if (f.uid === 'overlord') UI.notify('Draugr Gospodar je pao. Škrinja iza njega...');
            this.save();
        }
        if (UI.target === f) UI.target = null;
    }

    // ---------- dragons ----------
    spawnDragon(k, x, y) {
        const def = FOES[k];
        const d = { k, def, hp: def.hp, maxHp: def.hp, x, y, alt: 300, state: 'fly', stateUntil: this.now + 10000, ang: Math.PI / 2, circ: rnd(0, 6), breathReady: this.now + 3500, biteReady: 0, breathUntil: 0, burnTick: 0, rended: false, hitAt: 0 };
        const big = k === 'alduin' ? 1.15 : 1;
        d.scale = big;
        d.shadow = this.add.ellipse(x, y, 150 * big, 46 * big, 0x000000, 0.3).setDepth(-50);
        d.spr = this.add.image(x, y - d.alt, def.tex).setDepth(7000).setScale(big);
        this.dragons.push(d);
        UI.boss = d;
        Sfx.play('roar');
        this.cameras.main.shake(900, 0.01);
        UI.big(def.name, k === 'alduin' ? 'Proždiratelj Svjetova se spušta s neba!' : 'Zmaj!');
        return d;
    }

    summonAlduin() {
        if (S.killed.alduin || this.dragons.some(d => d.k === 'alduin') || this.M.id !== 'world') return;
        this.spawnDragon('alduin', this.player.x + 300, this.player.y - 300);
    }

    updateDragon(d, dt) {
        const now = this.now, p = this.player;
        const px = p.x, py = p.y - 10;
        const dx = px - d.x, dy = py - d.y, dd = Math.hypot(dx, dy);
        if (d.state === 'dead') {
            d.alt = Math.max(0, d.alt - 300 * dt);
            this.placeDragon(d);
            return;
        }
        if (d.state === 'fly') {
            d.circ += dt * 0.55;
            const tx = px + Math.cos(d.circ) * 300, ty = py + Math.sin(d.circ) * 210;
            const a = Math.atan2(ty - d.y, tx - d.x), sp = Math.min(330, dist(d.x, d.y, tx, ty) * 2.2);
            d.x += Math.cos(a) * sp * dt; d.y += Math.sin(a) * sp * dt;
            d.ang += angDiff(a, d.ang) * Math.min(1, dt * 3);
            d.alt += (160 - d.alt) * Math.min(1, dt * 1.5);
            if (now > d.breathReady && dd < 560 && !this.dead) {
                d.breathReady = now + (d.k === 'alduin' ? 2600 : 3300);
                if (d.k === 'alduin' && Math.random() < 0.55) this.meteors();
                else {
                    Sfx.play('breath');
                    const base = Math.atan2(py - d.y, px - d.x);
                    for (let i = -1; i <= 1; i++) this.time.delayedCall(i * 120 + 120, () => this.shoot({ x: d.x, y: d.y, ang: base + i * 0.16, speed: 360, dmg: d.def.dmg * 0.6, tex: 'fireball', foe: true, fire: true, life: 1.8 }));
                }
            }
            if (!d.def.needsRend && now > d.stateUntil) { d.state = 'land'; d.landX = px + rnd(-140, 140); d.landY = py + rnd(-170, -90); }
            if (d.def.needsRend && now > d.stateUntil) { d.stateUntil = now + 7000; UI.notify('Alduin je neranjiv u zraku. Obori ga Zmajosjekom (C)!'); }
        } else if (d.state === 'land') {
            const a = Math.atan2(d.landY - d.y, d.landX - d.x), r = dist(d.x, d.y, d.landX, d.landY);
            const sp = Math.min(280, r * 3 + 40);
            d.x += Math.cos(a) * sp * dt; d.y += Math.sin(a) * sp * dt;
            d.ang += angDiff(a, d.ang) * Math.min(1, dt * 3);
            d.alt = Math.max(0, d.alt - 200 * dt);
            if (r < 10 && d.alt < 5) {
                d.state = 'ground'; d.alt = 0; d.stateUntil = now + (d.rended ? 10000 : 8000);
                Sfx.play('boom'); this.cameras.main.shake(400, 0.015);
                for (let i = 0; i < 16; i++) this.puff(d.x + rnd(-60, 60), d.y + rnd(-20, 20), 'glow', { vx: rnd(-60, 60), vy: rnd(-40, 0), life: 800, s0: 1.5, s1: 3, tint: 0x9a8a70, alpha: 0.5 });
            }
        } else if (d.state === 'ground') {
            const a = Math.atan2(dy, dx);
            if (now > d.breathUntil) d.ang += angDiff(a, d.ang) * Math.min(1, dt * 2.5);
            if (dd > 120 && now > d.breathUntil) { d.x += Math.cos(a) * 75 * dt; d.y += Math.sin(a) * 75 * dt; }
            if (dd < 115 && now > d.biteReady && !this.dead) {
                d.biteReady = now + 1500;
                this.hurtPlayer(d.def.dmg, d.x, d.y, 400);
                this.slashFx(d.x + Math.cos(d.ang) * 50, d.y + Math.sin(d.ang) * 50, d.ang, 0xffffff);
                Sfx.play('growl');
            }
            if (now > d.breathReady && dd < 320 && now > d.breathUntil) {
                d.breathReady = now + 4800; d.breathUntil = now + 1400; d.breathAng = a;
                this.floatText(d.x, d.y - 100, 'YOL TOOR SHUL!', '#ffb060', 24);
                Sfx.play('breath'); Sfx.play('roar');
            }
            if (now < d.breathUntil) this.dragonBreath(d, dt);
            if (now > d.stateUntil) {
                d.state = 'fly'; d.stateUntil = now + 9000; d.rended = false;
                Sfx.play('roar');
                if (d.k === 'alduin') this.floatText(d.x, d.y - 120, 'Zu\'u unslaad!', '#ff6040', 22);
            }
        }
        this.placeDragon(d);
    }

    placeDragon(d) {
        const now = this.now;
        d.spr.setPosition(d.x, d.y - d.alt);
        d.spr.setRotation(d.ang + Math.PI / 2);
        const flap = d.alt > 20 && d.state !== 'dead' ? 1 + Math.sin(now / 110) * 0.1 : 1;
        d.spr.setScale(d.scale * flap, d.scale);
        d.spr.setDepth(d.alt > 30 ? 7000 : d.y + 40);
        d.shadow.setPosition(d.x, d.y + 10);
        const sh = clamp(1 - d.alt / 500, 0.35, 1);
        d.shadow.setScale(sh).setAlpha(0.15 + 0.25 * sh);
    }

    dragonBreath(d, dt) {
        const a = d.breathAng;
        const mx = d.x + Math.cos(d.ang) * 70, my = d.y + Math.sin(d.ang) * 70;
        for (let i = 0; i < 3; i++) {
            const s = a + rnd(-0.32, 0.32), v = rnd(280, 380);
            this.puff(mx, my - 10, 'flame', { vx: Math.cos(s) * v, vy: Math.sin(s) * v, life: 700, s0: 1, s1: 3.2, blend: true, depth: 6500 });
        }
        if (this.now > d.burnTick) {
            d.burnTick = this.now + 150;
            const p = this.player, pd = dist(mx, my, p.x, p.y - 12);
            if (pd < 280 && Math.abs(angDiff(Math.atan2(p.y - 12 - my, p.x - mx), a)) < 0.42) this.hurtPlayer(d.def.dmg * 0.22, mx, my, 0);
        }
    }

    meteors() {
        Sfx.play('roar');
        this.floatText(this.player.x, this.player.y - 90, 'Alduin doziva kišu meteora!', '#ff6040', 18);
        for (let i = 0; i < 6; i++) {
            const tx = this.player.x + rnd(-200, 200), ty = this.player.y + rnd(-160, 160);
            this.time.delayedCall(i * 260, () => {
                const ring = this.add.ellipse(tx, ty, 120, 50, 0xff3010, 0.25).setDepth(-40).setStrokeStyle(2, 0xff6020, 0.9);
                this.tweens.add({ targets: ring, alpha: { from: 0.2, to: 0.6 }, duration: 200, yoyo: true, repeat: 2 });
                this.time.delayedCall(1100, () => {
                    ring.destroy();
                    Sfx.play('boom'); this.cameras.main.shake(200, 0.01);
                    for (let k = 0; k < 14; k++) this.puff(tx, ty, 'flame', { vx: rnd(-180, 180), vy: rnd(-180, 80), life: 600, s0: 2, s1: 4, blend: true, depth: ty + 30 });
                    if (dist(tx, ty, this.player.x, this.player.y) < 64) this.hurtPlayer(32, tx, ty, 300);
                });
            });
        }
    }

    hurtDragon(d, dmg, opts = {}) {
        if (d.state === 'dead') return;
        if (d.def.needsRend && d.state === 'fly') {
            if (this.now - (d.immuneMsg || 0) > 1200) { d.immuneMsg = this.now; this.floatText(d.x, d.y - d.alt - 40, 'Neranjiv!', '#a0a0a0', 18); }
            return;
        }
        d.hp -= dmg; d.hitAt = this.now;
        d.spr.setTintFill(0xffffff);
        this.time.delayedCall(70, () => d.spr.active && d.spr.clearTint());
        this.floatText(d.x + rnd(-20, 20), d.y - d.alt - 60, String(Math.round(dmg)), opts.col || '#ffe0a0', 18);
        Sfx.play('hit');
        if (d.hp <= 0) this.dragonDie(d);
    }

    dragonDie(d) {
        d.hp = 0; d.state = 'dead';
        S.killed[d.k] = true;
        Sfx.play('roar');
        d.spr.setTint(0x555555);
        this.cameras.main.shake(800, 0.012);
        this.addXP(d.def.xp);
        UI.boss = null;
        this.time.delayedCall(1600, () => {
            if (d.k === 'alduin') {
                for (let i = 0; i < 60; i++) this.puff(d.x + rnd(-90, 90), d.y + rnd(-70, 70), 'glow', { vx: rnd(-30, 30), vy: rnd(-160, -60), life: 2000, s0: 2, s1: 0.2, tint: 0xffb040, blend: true, depth: 7100 });
                this.tweens.add({ targets: [d.spr, d.shadow], alpha: 0, duration: 2500 });
                this.time.delayedCall(2600, () => { this.setQ(9); UI.victory(); });
            } else {
                d.spr.setTexture('dragon_bones').clearTint();
                this.absorbSoul(d);
            }
        });
    }

    absorbSoul(d) {
        Sfx.play('absorb');
        this.frozenUntil = this.now + 3400;
        this.player.body.setVelocity(0, 0);
        const ev = this.time.addEvent({
            delay: 30, repeat: 100, callback: () => {
                const a = rnd(0, Math.PI * 2), r = rnd(20, 100);
                this.puff(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.6 - 20, 'glow', { home: true, life: 1400, s0: 1.2, s1: 0.3, tint: Math.random() < 0.5 ? 0xffa030 : 0xfff0c0, blend: true, depth: 7200 });
            },
        });
        this.time.delayedCall(3400, () => {
            ev.remove();
            S.souls++;
            this.player.setTintFill(0xffd080);
            this.time.delayedCall(200, () => this.player.clearTint());
            UI.big('ZMAJEVA DUŠA UPIJENA', 'Dovahkiin! Zmajorođeni!');
            if (S.words.fus && !S.shouts.fus) this.learnShout('fus', 1);
            if (d.k === 'mirmulnir') { this.give('dragon_bone', 1); if (S.q === 4) this.setQ(5); }
            this.save();
        });
    }

    // ---------- player actions ----------
    aimAngle() {
        const ptr = this.input.activePointer;
        const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        return Math.atan2(wp.y - (this.player.y - 18), wp.x - this.player.x);
    }

    attack() {
        if (this.now < this.atkReady) return;
        if (S.hand === 'bow' && S.bow) return this.fireArrow();
        const power = this.keys.SHIFT.isDown && S.sp >= 25;
        if (power) { S.sp -= 25; this.spUseAt = this.now; }
        this.atkReady = this.now + (power ? 750 : 420);
        const ang = this.aimAngle();
        this.swing = { t0: this.now, dur: power ? 240 : 170, ang };
        Sfx.play('swing');
        const dmg = ITEMS[S.weapon].dmg * (power ? 2.2 : 1) * (1 + (S.level - 1) * 0.05);
        const reach = power ? 66 : 56, px = this.player.x, py = this.player.y - 14;
        this.slashFx(px + Math.cos(ang) * 26, py + Math.sin(ang) * 26, ang, power ? 0xffe0a0 : 0xffffff, power);
        for (const f of this.foes.slice()) {
            const fy = f.y - 12, fd = dist(px, py, f.x, fy);
            if (fd < reach + f.def.rad && Math.abs(angDiff(Math.atan2(fy - py, f.x - px), ang)) < 1.25) this.hurtFoe(f, dmg, ang, power ? 260 : 120);
        }
        for (const d of this.dragons) {
            if (d.alt > 40 || d.state === 'dead') continue;
            if (dist(px, py, d.x, d.y) < reach + 70 && Math.abs(angDiff(Math.atan2(d.y - py, d.x - px), ang)) < 1.3) this.hurtDragon(d, dmg);
        }
    }

    fireArrow() {
        if (S.arrows <= 0) { UI.notify('Nemaš strijela. (Q prebacuje na mač)'); this.atkReady = this.now + 400; return; }
        S.arrows--;
        this.atkReady = this.now + 650;
        const ang = this.aimAngle();
        this.shoot({ x: this.player.x, y: this.player.y - 18, ang, speed: 720, dmg: ITEMS[S.bow].dmg * (1 + (S.level - 1) * 0.05), tex: 'arrow' });
        Sfx.play('arrow');
    }

    castPress() {
        const sp = SPELLS[S.spells[S.spell]];
        if (sp.kind !== 'bolt' || this.now < this.castReady) return;
        if (S.mp < sp.cost) { UI.notify('Nemaš dovoljno magije.'); this.castReady = this.now + 400; return; }
        S.mp -= sp.cost; this.mpUseAt = this.now;
        this.castReady = this.now + 550;
        const ang = this.aimAngle();
        this.shoot({ x: this.player.x, y: this.player.y - 18, ang, speed: sp.speed, dmg: sp.dmg * (1 + (S.level - 1) * 0.05), tex: sp.tex, slow: sp.slow, spell: true });
        Sfx.play(sp.slow ? 'ice' : 'bolt');
    }

    castHold(dt) {
        const held = (this.input.activePointer.rightButtonDown() || this.keys.F.isDown) && !this.locked();
        const sp = SPELLS[S.spells[S.spell]];
        this.handGlow.setVisible(false);
        if (!held || sp.kind === 'bolt') return;
        if (S.mp <= 0) return;
        S.mp = Math.max(0, S.mp - sp.cost * dt); this.mpUseAt = this.now;
        const p = this.player, ang = this.aimAngle();
        this.handGlow.setVisible(true).setTint(sp.col).setPosition(p.x - 10, p.y - 16).setScale(1 + Math.sin(this.now / 60) * 0.2).setDepth(p.y + 1);
        if (sp.kind === 'heal') {
            S.hp = Math.min(S.hpMax, S.hp + sp.amt * dt);
            if (Math.random() < 0.5) this.puff(p.x + rnd(-14, 14), p.y - rnd(0, 30), 'glow', { vx: 0, vy: -50, life: 600, s0: 0.6, s1: 0.1, tint: 0xfff0a0, blend: true, depth: p.y + 2 });
            if (this.now > this.flameTick) { this.flameTick = this.now + 400; Sfx.play('heal'); }
            return;
        }
        // flames: a cone of fire
        const ox = p.x + Math.cos(ang) * 16, oy = p.y - 16 + Math.sin(ang) * 16;
        for (let i = 0; i < 2; i++) {
            const s = ang + rnd(-0.25, 0.25), v = rnd(260, 340);
            this.puff(ox, oy, 'flame', { vx: Math.cos(s) * v, vy: Math.sin(s) * v, life: 380, s0: 0.5, s1: 2, blend: true, depth: p.y + 5 });
        }
        if (this.now > this.flameTick) {
            this.flameTick = this.now + 150;
            Sfx.play('fire');
            const dmg = sp.dmg * 0.15 * (1 + (S.level - 1) * 0.05);
            for (const f of this.foes.slice()) {
                const fy = f.y - 12;
                if (dist(ox, oy, f.x, fy) < 130 + f.def.rad && Math.abs(angDiff(Math.atan2(fy - oy, f.x - ox), ang)) < 0.4) this.hurtFoe(f, dmg, ang, 0, { col: '#ffa040' });
            }
            for (const d of this.dragons) if (dist(ox, oy, d.x, d.y) < 180 && Math.abs(angDiff(Math.atan2(d.y - oy, d.x - ox), ang)) < 0.5) this.hurtDragon(d, dmg, { col: '#ffa040' });
        }
    }

    toggleHand() {
        if (!S.bow) { UI.notify('Nemaš luk. Kupi ga kod kovača.'); return; }
        S.hand = S.hand === 'bow' ? 'sword' : 'bow';
        this.updateWeaponTex();
        Sfx.play('click');
    }
    updateWeaponTex() {
        if (S.hand === 'bow' && S.bow) this.weapon.setTexture('bow').setOrigin(0.5, 0.5).clearTint();
        else { S.hand = 'sword'; this.weapon.setTexture('sword').setOrigin(0.5, 0.92).setTint(ITEMS[S.weapon].tint); }
    }
    cycleSpell() {
        S.spell = (S.spell + 1) % S.spells.length;
        UI.notify('Čarolija: ' + SPELLS[S.spells[S.spell]].name);
        Sfx.play('click');
    }

    shout(id) {
        const lvl = S.shouts[id] || 0;
        if (!lvl) {
            if (id === 'fus' && S.words.fus) UI.notify('Znaš riječ FUS, ali treba ti zmajeva duša da je otključaš.');
            else if (id === 'fus') UI.notify('Još ne znaš nijedan povik.');
            return;
        }
        if (this.now < this.shoutReady) { UI.notify('Glas ti se još nije oporavio.'); return; }
        const cd = SHOUTS[id].cd[lvl] || SHOUTS[id].cd[1];
        this.shoutReady = this.now + cd; this.shoutMax = cd;
        const p = this.player, ang = this.aimAngle(), px = p.x, py = p.y - 16;
        const words = SHOUTS[id].words.slice(0, id === 'fus' ? lvl : 3).join(' ') + '!';
        this.floatText(px, py - 50, words, id === 'joor' ? '#c0a0ff' : '#cfeeff', 30);
        if (id === 'fus') {
            const range = [0, 140, 190, 250][lvl], kb = [0, 350, 550, 850][lvl], dmg = [0, 8, 14, 22][lvl];
            Sfx.play('shout'); this.cameras.main.shake(300 + lvl * 100, 0.006 * lvl);
            this.shockFx(px, py, ang, range, 0xbfe8ff);
            for (const f of this.foes.slice()) {
                const fy = f.y - 12;
                if (dist(px, py, f.x, fy) < range + f.def.rad && Math.abs(angDiff(Math.atan2(fy - py, f.x - px), ang)) < 0.75) {
                    const kbf = f.k === 'giant' || f.def.boss ? 0.4 : 1;
                    this.hurtFoe(f, dmg, Math.atan2(fy - py, f.x - px), kb * kbf / 2.2, { stun: 700 + lvl * 400, col: '#cfeeff' });
                }
            }
            for (const d of this.dragons) if (d.alt < 40 && dist(px, py, d.x, d.y) < range + 70) this.hurtDragon(d, dmg * 1.5, { col: '#cfeeff' });
            for (const pr of this.proj) if (pr.foe && dist(px, py, pr.x, pr.y) < range) pr.life = 0;
        } else if (id === 'wuld') {
            Sfx.play('wuld');
            let vx = 0, vy = 0;
            const k = this.keys;
            vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
            vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
            const a = vx || vy ? Math.atan2(vy, vx) : ang;
            this.dash = { until: this.now + 240, vx: Math.cos(a) * 1150, vy: Math.sin(a) * 1150 };
            this.invulnUntil = this.now + 300;
        } else if (id === 'joor') {
            Sfx.play('rend'); this.cameras.main.shake(500, 0.01);
            this.shockFx(px, py, ang, 520, 0xb090ff, 0.9);
            for (const d of this.dragons) {
                if (d.state === 'dead') continue;
                const dy = d.y - d.alt * 0.5;
                if (dist(px, py, d.x, dy) < 620 && Math.abs(angDiff(Math.atan2(dy - py, d.x - px), ang)) < 0.75) {
                    d.rended = true;
                    if (d.state === 'fly') { d.state = 'land'; d.landX = d.x; d.landY = d.y + 30; }
                    else d.stateUntil = this.now + 10000;
                    d.spr.setTint(0xc0a0ff); this.time.delayedCall(600, () => d.spr.active && d.state !== 'dead' && d.spr.clearTint());
                    this.floatText(d.x, d.y - d.alt - 70, d.k === 'alduin' ? 'Alduin pada na tlo!' : 'Zmaj pada!', '#c0a0ff', 22);
                }
            }
        }
    }

    quickPotion(stat) {
        const order = { hp: ['potion_hp', 'sweetroll'], mp: ['potion_mp'], sp: ['potion_sp', 'mead'] }[stat];
        const id = order.find(i => S.inv[i] > 0);
        if (!id) { UI.notify('Nemaš takav napitak.'); return; }
        this.useItem(id);
    }

    useItem(id) {
        const it = ITEMS[id];
        if (!it || !(S.inv[id] > 0)) return;
        if (it.kind === 'potion') {
            S[it.stat] = Math.min(S[it.stat + 'Max'], S[it.stat] + it.amt);
            this.take(id);
            Sfx.play('heal');
            UI.notify('Upotrijebljeno: ' + it.name);
        } else if (it.kind === 'weapon') { S.weapon = id; S.hand = 'sword'; this.updateWeaponTex(); Sfx.play('clang'); }
        else if (it.kind === 'armor') { S.armor = id; Sfx.play('clang'); }
        else if (it.kind === 'bow') { S.bow = id; S.hand = 'bow'; this.updateWeaponTex(); Sfx.play('click'); }
        else if (it.kind === 'tome') {
            if (!S.spells.includes(it.spell)) S.spells.push(it.spell);
            this.take(id);
            UI.big('Čarolija naučena', SPELLS[it.spell].name);
            Sfx.play('level');
        }
    }

    interact() {
        const t = this.focus;
        if (!t) return;
        if (t.npc) {
            const n = t.npc;
            if (!n.big) n.spr.setFlipX(this.player.x < n.spr.x);
            UI.openDialog(n.id);
            return;
        }
        const ob = t.obj, o = ob.o;
        switch (o.t) {
            case 'chest': {
                if (S.opened[o.id]) return;
                S.opened[o.id] = true;
                ob.img.setTexture('chest_open');
                Sfx.play('open');
                for (const k in o.loot) { if (k === 'gold') this.addGold(o.loot[k]); else this.give(k, o.loot[k]); }
                this.save();
                break;
            }
            case 'barrow': case 'exitdoor': this.changeMap(o.door.to, o.door.x, o.door.y); break;
            case 'pillar': {
                o.state = (o.state + 1) % 3;
                S.flags['pillar' + o.idx] = o.state;
                ob.img.setTexture('pillar' + o.state);
                Sfx.play('door');
                const pillars = this.objs.filter(x => x.o.t === 'pillar').sort((a, b) => a.o.idx - b.o.idx);
                if (!S.flags.gateOpen && pillars.every((x, i) => x.o.state === PILLAR_ANSWER[i])) {
                    S.flags.gateOpen = true;
                    const gate = this.objs.find(x => x.o.t === 'gate');
                    if (gate) this.openBarrier(gate);
                    UI.notify('Negdje u blizini podiže se željezna rešetka.');
                    this.save();
                }
                break;
            }
            case 'hint': UI.notify('Na zidu su uklesana tri simbola: zmija, zmija, kit.'); break;
            case 'clawdoor': {
                if (!this.has('golden_claw')) { UI.notify('Golema okrugla vrata od kamena. U sredini je udubina u obliku kandže.'); return; }
                UI.notify('Umećeš Zlatnu kandžu i okrećeš prstenove: medvjed, moljac, sova...');
                S.flags.clawUsed = true;
                if (S.f.claw < 2) { S.f.claw = 2; this.questUpdate('claw', 'Zadatak ažuriran'); }
                this.time.delayedCall(800, () => this.openBarrier(ob));
                this.save();
                break;
            }
            case 'shrine': S.hp = S.hpMax; S.mp = S.mpMax; S.sp = S.spMax; Sfx.play('heal'); UI.big('Blagoslov Talosa', 'Zdravlje, magija i izdržljivost obnovljeni.'); break;
            case 'sign': UI.notify(o.label); break;
            case 'wordwall': UI.notify('Drevni zmajski zapisi. Riječi su već utihnule.'); break;
        }
    }

    openBarrier(ob) {
        Sfx.play('door');
        this.cameras.main.shake(600, 0.004);
        if (ob.solid) { ob.solid.destroy(); ob.solid = null; }
        this.tweens.add({ targets: ob.img, alpha: 0, y: ob.img.y - 30, duration: 1200, onComplete: () => ob.img.destroy() });
        this.objs = this.objs.filter(x => x !== ob);
    }

    learnWordWall(ob) {
        S.words.fus = true;
        this.frozenUntil = this.now + 2600;
        this.player.body.setVelocity(0, 0);
        Sfx.play('word');
        const ev = this.time.addEvent({
            delay: 40, repeat: 55, callback: () => this.puff(ob.o.x + rnd(-50, 50), ob.o.y - rnd(10, 70), 'glow', { home: true, life: 1300, s0: 0.9, s1: 0.2, tint: 0x9fe8ff, blend: true, depth: 7200 }),
        });
        this.time.delayedCall(2600, () => {
            ev.remove();
            UI.big('Riječ moći: FUS', 'Sila. Treba ti zmajeva duša da je otključaš.');
            const ol = this.foes.find(f => f.uid === 'overlord');
            if (ol) {
                this.time.delayedCall(1200, () => {
                    ol.dormant = false; ol.sleep = false; ol.clearTint(); ol.setAlpha(1); ol.hunting = true;
                    Sfx.play('groan'); this.cameras.main.shake(500, 0.01);
                    UI.boss = ol;
                    this.floatText(ol.x, ol.y - 70, 'Sarkofag puca!', '#9fe8ff', 20);
                });
            }
            this.save();
        });
    }

    freeArvel() {
        const n = this.npcs.find(x => x.id === 'arvel');
        if (!n) return;
        S.flags.arvelFreed = true;
        n.spr.destroy();
        this.npcs = this.npcs.filter(x => x !== n);
        const web = this.objs.find(x => x.o.t === 'web');
        if (web) { web.img.destroy(); this.objs = this.objs.filter(x => x !== web); }
        this.spawnFoe('arvel', n.home.x, n.home.y, { uid: 'arvel' });
    }

    // ---------- items, gold, xp, quests ----------
    has(id) { return (S.inv[id] || 0) > 0; }
    give(id, n = 1) {
        const it = ITEMS[id];
        if (id === 'arrows') S.arrows += n;
        else S.inv[id] = (S.inv[id] || 0) + n;
        UI.notify('Dobiveno: ' + (id === 'arrows' ? 'strijele' : it.name) + (n > 1 ? ' (' + n + ')' : ''));
        Sfx.play('pickup');
        if (id === 'dragonstone' && S.q === 2) this.setQ(3);
        if (it.kind === 'bow' && !S.bow) { S.bow = id; }
    }
    take(id, n = 1) { S.inv[id] = Math.max(0, (S.inv[id] || 0) - n); if (!S.inv[id]) delete S.inv[id]; }
    addGold(n) { S.gold += n; UI.notify('+' + n + ' zlatnika'); Sfx.play('coin'); }
    addXP(n) {
        S.xp += n;
        while (S.xp >= xpNeed(S.level)) {
            S.xp -= xpNeed(S.level);
            S.level++; S.lvlPending++;
            Sfx.play('level');
            UI.big('Razina ' + S.level, 'Pritisni L i odaberi što ćeš ojačati.');
        }
    }
    alive(uid) { return this.foes.some(f => f.uid === uid && f.hp > 0); }
    setQ(n) { S.q = n; this.questUpdate('main', n === 9 ? 'Zadatak dovršen' : 'Zadatak ažuriran'); }
    questUpdate(qid, title) {
        const q = QUESTS[qid], st = q.stages[q.get()];
        UI.big(title, q.name);
        if (st) UI.notify(st.d);
        Sfx.play('quest');
        this.save();
    }
    learnShout(id, lvl) {
        S.shouts[id] = Math.max(S.shouts[id] || 0, lvl);
        const sh = SHOUTS[id];
        UI.big('Povik: ' + sh.words.slice(0, id === 'fus' ? lvl : 3).join(' '), sh.name + ' — tipka ' + sh.key);
        Sfx.play('word');
    }
    openShop(title, list) { UI.openShop(title, list); }
    save() {
        if (this.player && !this.dead) { S.x = this.player.x; S.y = this.player.y; }
        S.map = this.M.id;
        saveGame();
    }

    changeMap(to, x, y) {
        if (this.changing) return;
        this.changing = true;
        S.map = to; S.x = x; S.y = y;
        saveGame();
        Sfx.play('door');
        this.cameras.main.fadeOut(450);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    }

    fastTravel(id) {
        if (this.inCombat()) { UI.notify('Ne možeš putovati dok su neprijatelji u blizini.'); return false; }
        const [tx, ty] = TRAVEL[id];
        this.player.setPosition(tilePx(tx), tilePx(ty));
        this.player.body.reset(tilePx(tx), tilePx(ty));
        S.time += 120 + Math.floor(dist(S.x, S.y, tilePx(tx), tilePx(ty)) / TS) * 4;
        this.cameras.main.fadeIn(500);
        this.save();
        return true;
    }

    inCombat() {
        return this.dragons.some(d => d.state !== 'dead') || this.foes.some(f => f.hunting && dist(f.x, f.y, this.player.x, this.player.y) < 700);
    }

    hurtPlayer(dmg, sx, sy, kb = 0) {
        if (this.dead || this.now < this.invulnUntil) return;
        const armor = ITEMS[S.armor].armor;
        const real = Math.max(1, dmg * 100 / (100 + armor * 1.6));
        S.hp -= real;
        this.lastHurt = this.now;
        this.player.setTintFill(0xff5040);
        this.time.delayedCall(90, () => this.player.active && this.player.clearTint());
        Sfx.play('hurt');
        UI.hurtFlash = Math.min(0.6, UI.hurtFlash + 0.25 + real / 60);
        this.cameras.main.shake(120, 0.004);
        if (kb) { const a = Math.atan2(this.player.y - sy, this.player.x - sx); this.kb = { until: this.now + 180, vx: Math.cos(a) * kb, vy: Math.sin(a) * kb }; }
        if (S.hp <= 0) this.die();
    }

    die() {
        S.hp = 0; this.dead = true;
        this.player.body.setVelocity(0, 0);
        this.player.setTint(0x703030);
        this.tweens.add({ targets: this.player, angle: 90, duration: 500 });
        Sfx.play('die');
        Sfx.setMood('calm');
        this.time.delayedCall(900, () => UI.death());
    }

    // ---------- projectiles and effects ----------
    shoot(o) {
        const spr = this.add.image(o.x, o.y, o.tex).setRotation(o.ang).setDepth(o.y + 20);
        if (o.tex === 'firebolt' || o.tex === 'fireball' || o.tex === 'spit') spr.setBlendMode(Phaser.BlendModes.ADD);
        this.proj.push({ ...o, spr, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, life: o.life || 1.4 });
    }

    updateProj(dt) {
        const p = this.player;
        for (const pr of this.proj) {
            pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
            pr.spr.setPosition(pr.x, pr.y).setDepth(pr.y + 20);
            if (pr.fire && Math.random() < 0.5) this.puff(pr.x, pr.y, 'flame', { vx: 0, vy: 0, life: 300, s0: 1, s1: 0.2, blend: true, depth: pr.y + 19 });
            if (pr.spell && Math.random() < 0.4) this.puff(pr.x, pr.y, pr.slow ? 'spit' : 'flame', { vx: 0, vy: 0, life: 250, s0: 0.6, s1: 0.1, blend: true, depth: pr.y + 19 });
            const tile = this.layer.getTileAtWorldXY(pr.x, pr.y + 16);
            if (tile && tile.collides && tile.index !== TL.WATER) { pr.life = 0; this.burst(pr); continue; }
            if (pr.foe) {
                if (!this.dead && dist(pr.x, pr.y, p.x, p.y - 18) < 18) {
                    this.hurtPlayer(pr.dmg, pr.x - pr.vx, pr.y - pr.vy, pr.fire ? 120 : 40);
                    if (pr.slow) { this.slowUntil = this.now + 2500; }
                    pr.life = 0; this.burst(pr);
                }
            } else {
                for (const f of this.foes) {
                    if (dist(pr.x, pr.y, f.x, f.y - f.displayHeight * 0.45) < f.def.rad + 6) {
                        this.hurtFoe(f, pr.dmg, Math.atan2(pr.vy, pr.vx), 90, { slow: pr.slow, col: pr.spell ? (pr.slow ? '#9fe8ff' : '#ffa040') : undefined });
                        pr.life = 0; this.burst(pr); break;
                    }
                }
                if (pr.life > 0) for (const d of this.dragons) {
                    if (d.state === 'dead') continue;
                    if (dist(pr.x, pr.y, d.x, d.y) < 70 || dist(pr.x, pr.y, d.x, d.y - d.alt) < 70) { this.hurtDragon(d, pr.dmg); pr.life = 0; this.burst(pr); break; }
                }
            }
            if (pr.life <= 0 && pr.spr.active) { if (pr.fire) this.burst(pr); pr.spr.destroy(); }
        }
        this.proj = this.proj.filter(pr => pr.life > 0);
    }

    burst(pr) {
        const tex = pr.tex === 'arrow' ? 'spark' : pr.slow ? 'spit' : 'flame';
        for (let i = 0; i < (pr.tex === 'arrow' ? 3 : 8); i++) this.puff(pr.x, pr.y, tex, { vx: rnd(-120, 120), vy: rnd(-120, 120), life: 350, s0: 0.8, s1: 0.1, blend: tex !== 'spark', tint: tex === 'spark' ? 0xc8b890 : undefined, depth: pr.y + 25 });
    }

    // a cheap particle: moves, scales and fades, optionally homes in on the player
    puff(x, y, tex, o) {
        if (this.fx.length > 500) return;
        const img = this.add.image(x, y, tex).setDepth(o.depth || y + 30).setScale(o.s0 || 1);
        if (o.tint !== undefined) img.setTint(o.tint);
        if (o.blend) img.setBlendMode(Phaser.BlendModes.ADD);
        if (o.alpha) img.setAlpha(o.alpha);
        this.fx.push({ img, x, y, vx: o.vx || 0, vy: o.vy || 0, life: o.life, max: o.life, s0: o.s0 || 1, s1: o.s1 ?? 0.2, a0: o.alpha || 1, home: o.home });
    }
    updateFx(dtMs) {
        const dt = dtMs / 1000, p = this.player;
        for (const f of this.fx) {
            f.life -= dtMs;
            if (f.home) {
                const a = Math.atan2(p.y - 20 - f.y, p.x - f.x), r = dist(f.x, f.y, p.x, p.y - 20);
                f.vx += Math.cos(a) * 1400 * dt; f.vy += Math.sin(a) * 1400 * dt;
                f.vx *= 0.94; f.vy *= 0.94;
                if (r < 14) f.life = 0;
            }
            f.x += f.vx * dt; f.y += f.vy * dt;
            const t = 1 - f.life / f.max;
            f.img.setPosition(f.x, f.y).setScale(f.s0 + (f.s1 - f.s0) * t).setAlpha(f.a0 * (1 - t * t));
            if (f.life <= 0) f.img.destroy();
        }
        this.fx = this.fx.filter(f => f.life > 0);
    }

    slashFx(x, y, ang, col, big) {
        const g = this.add.graphics().setDepth(y + 40);
        const r = big ? 40 : 30;
        g.lineStyle(big ? 5 : 3, col, 0.9);
        g.beginPath(); g.arc(x - Math.cos(ang) * 10, y - Math.sin(ang) * 10, r, ang - 1.1, ang + 1.1); g.strokePath();
        this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    }
    shockFx(x, y, ang, range, col, spread = 0.75) {
        for (let i = 0; i < 26; i++) {
            const a = ang + rnd(-spread, spread), v = range * rnd(2.2, 3.2);
            this.puff(x, y, 'glow', { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 380, s0: 1.2, s1: 3.5, tint: col, blend: true, alpha: 0.7, depth: 7500 });
        }
        const g = this.add.graphics().setDepth(7500);
        let r = 10;
        const ev = this.time.addEvent({
            delay: 16, repeat: 18, callback: () => {
                r += range / 18; g.clear(); g.lineStyle(4, col, 1 - r / range * 0.9);
                g.beginPath(); g.arc(x, y, r, ang - spread, ang + spread); g.strokePath();
                if (ev.getRepeatCount() === 0) g.destroy();
            },
        });
    }
    floatText(x, y, str, col = '#ffffff', size = 16) {
        const t = this.add.text(x, y, str, { fontFamily: TITLE_FONT, fontSize: size + 'px', color: col, stroke: '#000000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(9500);
        this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, delay: 300, onComplete: () => t.destroy() });
    }

    // ---------- main loop ----------
    update(time, dtMs) {
        dtMs = Math.min(dtMs, 50);
        const dt = dtMs / 1000;
        this.now += dtMs;
        const now = this.now, p = this.player, K = this.keys;
        S.time = (S.time + dt * 2) % (24 * 60);

        // movement
        let vx = 0, vy = 0;
        if (!this.locked()) {
            vx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0);
            vy = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
        }
        const moving = vx || vy;
        if (moving) { const l = Math.hypot(vx, vy); vx /= l; vy /= l; }
        const sprint = moving && K.SHIFT.isDown && S.sp > 1;
        let speed = sprint ? 235 : 150;
        if (now < (this.slowUntil || 0)) speed *= 0.6;
        if (sprint) { S.sp = Math.max(0, S.sp - 22 * dt); this.spUseAt = now; }
        if (this.dash && now < this.dash.until) p.body.setVelocity(this.dash.vx, this.dash.vy);
        else if (this.kb && now < this.kb.until) p.body.setVelocity(this.kb.vx, this.kb.vy);
        else p.body.setVelocity(vx * speed, vy * speed);
        if (this.dash && now < this.dash.until && Math.random() < 0.8) this.puff(p.x, p.y - 18, 'player', { life: 220, s0: 1, s1: 1, alpha: 0.4, tint: 0x9fd8ff, depth: p.y - 1 });

        // regen
        if (!this.dead) {
            if (now - this.spUseAt > 700) S.sp = Math.min(S.spMax, S.sp + 20 * dt);
            if (now - this.mpUseAt > 1000) S.mp = Math.min(S.mpMax, S.mp + 7 * dt);
            if (now - this.lastHurt > 4000) S.hp = Math.min(S.hpMax, S.hp + 1.5 * dt);
        }

        // facing, bob, weapon
        const ang = this.aimAngle();
        if (!this.dead) p.setFlipX(Math.cos(ang) < 0);
        p.setDepth(p.y);
        p.scaleY = moving && !this.dead ? 1 + Math.sin(now / (sprint ? 55 : 80)) * 0.04 : 1;
        const cx = p.x, cy = p.y - 18;
        if (S.hand === 'bow' && S.bow) {
            this.weapon.setPosition(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 14).setRotation(ang);
        } else {
            let rot = ang + (Math.cos(ang) < 0 ? -0.9 : 0.9);
            if (this.swing) {
                const t = (now - this.swing.t0) / this.swing.dur;
                if (t >= 1) this.swing = null;
                else rot = this.swing.ang - 1.3 + 2.6 * t;
            }
            this.weapon.setPosition(cx + Math.cos(rot) * 8, cy + Math.sin(rot) * 8 + 4).setRotation(rot + Math.PI / 2);
        }
        this.weapon.setDepth(Math.sin(ang) < -0.3 && !this.swing ? p.y - 1 : p.y + 1).setVisible(!this.dead);

        this.castHold(dt);

        // npcs
        for (const n of this.npcs) {
            if (n.wander && now > n.waitUntil) {
                const d = dist(n.spr.x, n.spr.y, n.tx, n.ty);
                if (d < 3) { n.waitUntil = now + rnd(1500, 4000); n.tx = n.home.x + rnd(-n.wander, n.wander); n.ty = n.home.y + rnd(-n.wander * 0.5, n.wander * 0.5); }
                else { const a = Math.atan2(n.ty - n.spr.y, n.tx - n.spr.x); n.spr.x += Math.cos(a) * 40 * dt; n.spr.y += Math.sin(a) * 40 * dt; n.spr.setFlipX(Math.cos(a) < 0).setDepth(n.spr.y); }
            }
            if (n.big) n.spr.setScale(0.62, 0.62 + Math.sin(now / 900) * 0.01);
        }

        // foes and dragons
        for (const f of this.foes.slice()) this.updateFoe(f, dt);
        for (const d of this.dragons) this.updateDragon(d, dt);
        this.updateProj(dt);
        this.updateFx(dtMs);

        // story triggers
        if (this.M.id === 'world') {
            if (S.q === 4 && !S.killed.mirmulnir && !this.dragons.length && dist(p.x, p.y, tilePx(78), tilePx(74)) < 650) this.spawnDragon('mirmulnir', tilePx(78), tilePx(66));
            if (S.q === 8 && !S.killed.alduin && !this.dragons.length && dist(p.x, p.y, tilePx(64), tilePx(9)) < 450) this.summonAlduin();
            for (const k in this.M.locs) {
                const L = this.M.locs[k];
                if (!S.found[k] && dist(p.x, p.y, tilePx(L.x), tilePx(L.y)) < (L.r + 5) * TS) { S.found[k] = true; UI.big('Otkriveno', L.name); Sfx.play('quest'); this.save(); }
            }
        }
        const ww = this.objs.find(o => o.o.t === 'wordwall');
        if (ww && this.M.id === 'barrow' && !S.words.fus && dist(p.x, p.y, ww.o.x, ww.o.y) < 110 && !this.locked()) this.learnWordWall(ww);

        // what can be used right now
        this.focus = null;
        if (!this.locked()) {
            let best = 9999;
            for (const n of this.npcs) {
                const d = dist(p.x, p.y, n.spr.x, n.spr.y + (n.big ? 40 : 0));
                if (d < (n.big ? 110 : 52) && d < best) { best = d; this.focus = { npc: n, label: 'Razgovaraj — ' + n.def.name }; }
            }
            for (const ob of this.objs) {
                const o = ob.o;
                let label = null, range = 52, ty = o.y;
                if (o.t === 'chest' && !S.opened[o.id]) label = 'Otvori škrinju';
                else if (o.t === 'barrow') { label = 'Uđi — ' + o.label; range = 70; ty = o.y + 6; }
                else if (o.t === 'exitdoor') { label = o.label; range = 60; ty = o.y + 6; }
                else if (o.t === 'pillar') label = 'Okreni stup';
                else if (o.t === 'hint') { label = 'Pogledaj rezbariju'; ty = o.y + 40; range = 60; }
                else if (o.t === 'clawdoor') { label = 'Ispitaj vrata'; range = 70; }
                else if (o.t === 'shrine') label = 'Pomoli se Talosu';
                else if (o.t === 'sign') label = 'Pročitaj putokaz';
                else if (o.t === 'wordwall' && this.M.id === 'world') { label = 'Pogledaj zid riječi'; range = 80; }
                if (!label) continue;
                const d = dist(p.x, p.y, o.x, ty);
                if (d < range && d < best) { best = d; this.focus = { obj: ob, label }; }
            }
        }

        // music mood, autosave
        Sfx.setMood(this.inCombat() ? 'battle' : 'calm');
        if (now > this.saveAt) { this.saveAt = now + 20000; if (!this.inCombat() && !this.dead) this.save(); }

        this.drawBars();
        this.drawDarkness();
        const snowy = this.M.id === 'world' && p.y < tilePx(38);
        if (snowy !== this.snow.emitting) { if (snowy) this.snow.start(); else this.snow.stop(); }
        this.snow.frequency = p.y < tilePx(16) ? 12 : 35;
    }

    drawBars() {
        const g = this.gfx;
        g.clear();
        const cam = this.cameras.main.worldView;
        for (const f of this.foes) {
            if (f.hp >= f.maxHp || f.sleep) continue;
            if (!cam.contains(f.x, f.y)) continue;
            const w = 30, y = f.y - f.displayHeight - 8;
            g.fillStyle(0x000000, 0.6).fillRect(f.x - w / 2 - 1, y - 1, w + 2, 5);
            g.fillStyle(0xc02820, 1).fillRect(f.x - w / 2, y, w * f.hp / f.maxHp, 3);
        }
    }

    darkness() {
        if (this.M.dark) return 0.9;
        const h = S.time / 60;
        if (h >= 7 && h < 18) return 0;
        if (h >= 18 && h < 21) return (h - 18) / 3 * 0.62;
        if (h >= 4 && h < 7) return (7 - h) / 3 * 0.62;
        return 0.62;
    }
    drawDarkness() {
        const a = this.darkness();
        const rt = this.dark;
        if (a < 0.02) { rt.setVisible(false); return; }
        rt.setVisible(true);
        rt.clear();
        rt.fill(this.M.dark ? 0x050403 : 0x0a1030, a);
        const cam = this.cameras.main;
        const sx = this.player.x - cam.scrollX, sy = this.player.y - 20 - cam.scrollY;
        const pr = this.M.dark ? 1 : 0.8;
        rt.erase('light', sx - 256 * pr, sy - 256 * pr);
        for (const l of this.lightsList) {
            const lx = l.x - cam.scrollX, ly = l.y - cam.scrollY;
            if (lx < -200 || ly < -200 || lx > W + 200 || ly > H + 200) continue;
            rt.erase('light_s', lx - 128, ly - 128);
        }
        for (const pr2 of this.proj) if (pr2.spell || pr2.fire) rt.erase('light_s', pr2.x - cam.scrollX - 128, pr2.y - cam.scrollY - 128);
    }
}

function M_isBarrow(scene) { return scene.M && scene.M.id === 'barrow'; }
