const FONT = '"Press Start 2P", monospace';
const txt = (scene, x, y, s, size = 8, color = '#ffffff') =>
    scene.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 2, resolution: RES })
        .setScrollFactor(0).setDepth(5000);

// The game is laid out in world units (GAME_W x GAME_H); the camera zooms by RES to fill the
// native 1024 x 768 canvas with the high-resolution art.
function setupCamera(scene, bg = '#000000') {
    scene.cameras.main.setOrigin(0, 0).setZoom(RES).setBackgroundColor(bg);
}

function startAudioOnInput(scene, onReady) {
    const go = () => { const first = !Sound.ready; Sound.init(); if (first && onReady) onReady(); };
    scene.input.keyboard.on('keydown', go);
    scene.input.on('pointerdown', go);
    if (scene.input.gamepad) scene.input.gamepad.on('down', go);
}

// ================================================================================================
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        Sprites.buildProps(this);
        for (const k in CHARS) Sprites.buildCharacter(this, CHARS[k]);
        const fontReady = document.fonts ? document.fonts.load('8px "Press Start 2P"') : Promise.resolve();
        Promise.race([fontReady, new Promise(r => setTimeout(r, 2500))]).then(() => this.scene.start('Title'));
    }
}

// ================================================================================================
class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        setupCamera(this);
        if (!this.textures.exists('titleFar')) {
            const bg = Stages.heliport(GAME_W);
            this.textures.addCanvas('titleFar', bg.far);
            this.textures.addCanvas('titleNear', bg.near);
        }
        this.add.image(0, 0, 'titleFar').setOrigin(0).setScale(1 / RES);
        this.add.image(0, 0, 'titleNear').setOrigin(0).setScale(1 / RES);
        this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.45).setOrigin(0);

        const title = this.add.text(GAME_W / 2, 30, 'DOUBLE DRAGON', { fontFamily: FONT, fontSize: '20px', stroke: '#200000', strokeThickness: 4, resolution: RES }).setOrigin(0.5);
        const grd = title.context.createLinearGradient(0, 0, 0, title.height);
        grd.addColorStop(0, '#fff6a0'); grd.addColorStop(0.45, '#f0a020'); grd.addColorStop(0.55, '#d03010'); grd.addColorStop(1, '#801008');
        title.setFill(grd);
        const two = this.add.text(GAME_W / 2, 64, 'II', { fontFamily: FONT, fontSize: '32px', color: '#e01818', stroke: '#ffffff', strokeThickness: 3, resolution: RES }).setOrigin(0.5);
        this.tweens.add({ targets: two, scale: 1.08, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
        this.add.text(GAME_W / 2, 90, 'THE REVENGE', { fontFamily: FONT, fontSize: '8px', color: '#a0c8ff', stroke: '#000000', strokeThickness: 2, resolution: RES }).setOrigin(0.5);

        this.add.sprite(52, 226, 'billy', 'idle').setScale(1.6 / RES).setOrigin(0.5, CHARS.billy.originY);
        this.add.sprite(GAME_W - 52, 226, 'jimmy', 'idle').setScale(1.6 / RES).setOrigin(0.5, CHARS.jimmy.originY).setFlipX(true);

        this.sel = 0; this.started = false;
        this.items = [txt(this, GAME_W / 2, 118, '1 PLAYER', 8).setOrigin(0.5), txt(this, GAME_W / 2, 132, '2 PLAYERS', 8).setOrigin(0.5)];
        this.cursor = txt(this, 0, 0, '>', 8, '#f0d040').setOrigin(0.5);
        this.prompt = txt(this, GAME_W / 2, 152, 'PRESS START', 8, '#f0d040').setOrigin(0.5);
        txt(this, GAME_W / 2, 172, 'MOVE WASD/ARROWS  PUNCH J/Z', 6, '#c0c0c0').setOrigin(0.5);
        txt(this, GAME_W / 2, 182, 'KICK K/X  JUMP L/C/SPACE', 6, '#c0c0c0').setOrigin(0.5);
        txt(this, GAME_W / 2, 192, '2P: ARROWS + NUM 1/2/3  M MUTE', 6, '#c0c0c0').setOrigin(0.5);
        txt(this, GAME_W / 2, 226, 'FAN TRIBUTE - NOT AFFILIATED', 6, '#706080').setOrigin(0.5);

        this.ctrls = [new Controller(this, 0, 'solo'), new Controller(this, 1, 'p2')];
        startAudioOnInput(this, () => Sound.music('title'));
        if (Sound.ready) Sound.music('title');
        this.input.keyboard.on('keydown-M', () => Sound.toggleMute());
        this.input.keyboard.on('keydown-ONE', () => this.begin(0));
        this.input.keyboard.on('keydown-TWO', () => this.begin(1));
        this.input.on('pointerdown', () => { if (!document.body.classList.contains('touch')) this.begin(this.sel); });
    }
    update() {
        let go = false;
        for (const c of this.ctrls) {
            c.update();
            if (c.pressed.start || c.pressed.punch || c.pressed.jump) go = true;
        }
        const nav = this.ctrls[0];
        if (nav.pressed.up || nav.pressed.down) { this.sel ^= 1; Sound.play('select'); }
        this.items.forEach((t, i) => t.setColor(i === this.sel ? '#ffffff' : '#808080'));
        this.cursor.setPosition(GAME_W / 2 - 52, this.items[this.sel].y);
        this.prompt.setVisible(Math.floor(this.time.now / 450) % 2 === 0);
        if (go) this.begin(this.sel);
    }
    begin(sel) {
        if (this.started) return;
        this.started = true;
        Sound.init(); Sound.play('select');
        const players = [{ char: 'billy', lives: 2, score: 0 }];
        if (sel === 1) players.push({ char: 'jimmy', lives: 2, score: 0 });
        this.scene.start('Story', { stage: 0, players, twoP: sel === 1 });
    }
}

// ================================================================================================
class StoryScene extends Phaser.Scene {
    constructor() { super('Story'); }
    create(data) {
        this.data0 = data; this.done = false; this.t0 = undefined;
        setupCamera(this);
        const lines = ['THE BLACK WARRIORS HAVE', 'TAKEN MARIAN FROM US.', '', 'BILLY AND JIMMY LEE', 'SWEAR REVENGE.', '', 'NO MORE HOLDING BACK.'];
        lines.forEach((l, i) => {
            const t = txt(this, GAME_W / 2, 58 + i * 16, l, 8, i >= 6 ? '#f04040' : '#ffffff').setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: t, alpha: 1, delay: 300 + i * 350, duration: 300 });
        });
        Sound.music('stage3');
        this.ctrl = new Controller(this, 0, 'solo');
        this.time.delayedCall(6000, () => this.next());
    }
    update() { this.ctrl.update(); if (this.t0 === undefined) this.t0 = this.time.now; if (this.time.now - this.t0 > 400 && this.ctrl.anyPressed()) this.next(); }
    next() { if (this.done) return; this.done = true; this.scene.start('Game', this.data0); }
}

// ================================================================================================
class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create(data) {
        this.data0 = data;
        this.stageIdx = data.stage;
        this.stage = Stages.LIST[data.stage];
        const st = this.stage;
        const bg = st.paint(st.width);
        setupCamera(this);
        if (this.textures.exists('far')) this.textures.remove('far');
        this.textures.addCanvas('far', bg.far);
        this.farFactor = bg.farFactor;
        this.far = this.add.tileSprite(0, 0, GAME_W * RES, FLOOR_TOP * RES, 'far').setOrigin(0).setScale(1 / RES).setScrollFactor(0).setDepth(-1000);
        // Slice the stage-wide near layer into chunks so no texture exceeds GPU size limits.
        const CH = 2048;
        for (let i = 0; i * CH < bg.near.width; i++) {
            const key = 'near' + i, w = Math.min(CH, bg.near.width - i * CH);
            const c = Sprites.makeCanvas(w, bg.near.height);
            c.getContext('2d').drawImage(bg.near, -i * CH, 0);
            if (this.textures.exists(key)) this.textures.remove(key);
            this.textures.addCanvas(key, c);
            this.add.image(i * CH / RES, 0, key).setOrigin(0).setScale(1 / RES).setDepth(-900);
        }

        this.camX = 0;
        this.fighters = [];
        this.players = [];
        this.pickups = [];
        this.knives = [];
        this.props = [];
        this.hitstopT = 0;

        data.players.forEach((p, i) => {
            const f = new Fighter(this, CHARS[p.char], 40 + i * 24, 186 + i * 22, 'player');
            f.ctrl = new Controller(this, i, data.twoP ? (i ? 'p2' : 'p1') : 'solo');
            f.lives = p.lives; f.score = p.score; f.pIndex = i;
            this.fighters.push(f); this.players.push(f);
        });
        for (const [type, x, z] of st.props) {
            const s = this.add.image(x, z, type).setOrigin(0.5, 1).setScale(1 / RES).setDepth(z);
            this.props.push({ type, x, z, sprite: s, broken: false });
        }
        for (const [type, x, z] of st.pickups) this.spawnPickup(type, x, z, false);

        this.waveIdx = 0; this.wave = null; this.queue = [];
        this.time99 = 99; this.timerAcc = 0;
        this.ended = false; this.overT = 0; this.paused = false;
        this.buildHud();
        this.banner(st.name, st.title, 2600);
        Sound.music(st.music);

        this.input.keyboard.on('keydown-M', () => Sound.toggleMute());
        this.input.keyboard.on('keydown-P', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        startAudioOnInput(this, () => Sound.music(st.music));
    }

    togglePause() {
        if (this.ended) return;
        this.paused = !this.paused;
        this.pauseText.setVisible(this.paused);
    }

    // ---- HUD -------------------------------------------------------------------------------------
    buildHud() {
        this.hudG = this.add.graphics().setScrollFactor(0).setDepth(4999);
        this.hud = this.players.map((p, i) => {
            const x0 = i === 0 ? 6 : 222;
            return {
                name: txt(this, x0, 4, `${i + 1}P ${p.def.name}`, 8, i === 0 ? '#80b0ff' : '#ff8080'),
                score: txt(this, x0, 24, '', 8),
                lives: txt(this, x0 + 74, 24, '', 8, '#f0d040'),
                x0,
            };
        });
        this.timeText = txt(this, GAME_W / 2, 4, '', 8, '#f0d040').setOrigin(0.5, 0);
        this.enemyText = txt(this, GAME_W / 2, 36, '', 8, '#ffb0b0').setOrigin(0.5, 0);
        this.goText = txt(this, GAME_W - 46, 90, 'GO', 16, '#f0d040').setVisible(false);
        this.pauseText = txt(this, GAME_W / 2, 100, 'PAUSE', 16).setOrigin(0.5).setVisible(false);
        this.goUntil = 0;
    }

    drawBar(g, x, y, hp, max, blocks, col) {
        const per = max / blocks;
        for (let i = 0; i < blocks; i++) {
            const full = hp >= (i + 1) * per - 0.01, part = !full && hp > i * per;
            g.fillStyle(0x000000); g.fillRect(x + i * 5 - 1, y - 1, 6, 9);
            g.fillStyle(full ? col : part ? 0xa04010 : 0x302030); g.fillRect(x + i * 5, y, 4, 7);
            if (full) { g.fillStyle(0xffffff, 0.5); g.fillRect(x + i * 5, y, 4, 2); }
        }
    }

    updateHud() {
        const g = this.hudG; g.clear();
        this.players.forEach((p, i) => {
            const h = this.hud[i];
            const col = p.hp / p.maxHp < 0.3 ? 0xf04030 : 0xf0d040;
            this.drawBar(g, h.x0 + 1, 14, p.state === 'out' ? 0 : p.hp, p.maxHp, 16, col);
            h.score.setText(String(p.score).padStart(6, '0'));
            h.lives.setText(p.state === 'out' ? 'OUT' : 'x' + p.lives);
        });
        this.timeText.setText('TIME ' + String(Math.max(0, this.time99)).padStart(2, '0'));
        const e = this.lastEnemy;
        if (e && !e.removed) {
            this.enemyText.setText(e.def.name).setVisible(true);
            const blocks = e.def.heavy || e.def.boss ? 16 : 8;
            this.drawBar(g, GAME_W / 2 - blocks * 2.5, 46, e.hp, e.maxHp, blocks, 0xe04070);
        } else this.enemyText.setVisible(false);
        const showGo = this.time.now < this.goUntil && Math.floor(this.time.now / 300) % 2 === 0;
        this.goText.setVisible(showGo);
        if (showGo) { g.fillStyle(0xf0d040); g.fillTriangle(GAME_W - 12, 98, GAME_W - 22, 89, GAME_W - 22, 107); }
    }

    banner(a, b, ms) {
        const t1 = txt(this, GAME_W / 2, 96, a, 16, '#f0d040').setOrigin(0.5);
        const t2 = b ? txt(this, GAME_W / 2, 118, b, 8).setOrigin(0.5) : null;
        this.time.delayedCall(ms, () => this.tweens.add({ targets: [t1, t2].filter(Boolean), alpha: 0, duration: 400, onComplete: () => { t1.destroy(); if (t2) t2.destroy(); } }));
    }

    // ---- services used by Fighter ----------------------------------------------------------------
    enemies() { return this.fighters.filter(f => f.team === 'enemy' && !f.removed); }
    alivePlayers() { return this.players.filter(p => p.state !== 'out' && p.state !== 'dead' && !(p.hp <= 0)); }
    attackers() { return this.enemies().filter(e => e.busyAttacking).length; }

    nearestPlayer(f) {
        let best = null, bd = 1e9;
        for (const p of this.alivePlayers()) {
            const d = Math.abs(p.x - f.x) + Math.abs(p.z - f.z) * 2;
            if (d < bd) { bd = d; best = p; }
        }
        return best;
    }

    clampFighter(f) {
        f.z = Phaser.Math.Clamp(f.z, FLOOR_TOP + 6, FLOOR_BOT - 2);
        if (f.isPlayer) f.x = Phaser.Math.Clamp(f.x, this.camX + 10, this.camX + GAME_W - 10);
        else f.x = Phaser.Math.Clamp(f.x, this.camX - 70, this.camX + GAME_W + 70);
    }

    hitstop(ms) { this.hitstopT = Math.max(this.hitstopT, ms); }
    shake(ms, k) { this.cameras.main.shake(ms, k / RES); }

    spark(x, y, big) {
        const s = this.add.sprite(x, y, 'spark', 0).setDepth(3000).setScale((big ? 1.3 : 1) / RES);
        let f = 0;
        this.time.addEvent({ delay: 45, repeat: 2, callback: () => { f++; if (f < 3) s.setFrame(f); else s.destroy(); } });
    }

    dust(x, z) {
        for (const d of [-1, 1]) {
            const s = this.add.image(x + d * 8, z - 3, 'dust').setScale(1 / RES).setDepth(z + 1);
            this.tweens.add({ targets: s, x: x + d * 22, alpha: 0, scale: 1.4 / RES, duration: 350, onComplete: () => s.destroy() });
        }
    }

    onDamage(by, target, dmg) {
        target.lastHitBy = by;
        if (by && by.isPlayer) by.score += dmg * 10;
        if (target.team === 'enemy') this.lastEnemy = target;
    }

    onKO(f) {
        if (f.team === 'enemy') {
            const by = f.lastHitBy;
            if (by && by.isPlayer) by.score += f.def.score || 100;
            if (f.def.heavy || f.def.boss) Sound.play('ko');
        } else Sound.play('ko');
    }

    onDeathDone(f) {
        if (f.team === 'enemy') {
            f.destroy();
            this.fighters = this.fighters.filter(o => o !== f);
            return;
        }
        if (f.lives > 0) {
            f.lives--;
            f.hp = f.maxHp; f.weapon = null;
            f.x = this.camX + 40 + f.pIndex * 20; f.z = 194; f.h = 110;
            f.set('jump'); f.vh = 0; f.vx = 0; f.air = null;
            f.invuln = 2200;
        } else {
            f.set('out');
        }
    }

    pickupNear(f, r = 14) {
        let best = null, bd = 1e9;
        for (const p of this.pickups) {
            const dx = Math.abs(p.x - f.x), dz = Math.abs(p.z - f.z);
            if (dx < r && dz < (r > 20 ? 60 : 8) && dx + dz < bd) { bd = dx + dz; best = p; }
        }
        return best;
    }

    spawnPickup(type, x, z, bounce) {
        z = Phaser.Math.Clamp(z, FLOOR_TOP + 6, FLOOR_BOT - 2);
        const s = this.add.image(x, z - 2, type).setScale(1 / RES).setDepth(z - 100);
        const p = { type, x, z, sprite: s };
        if (bounce) { s.y = z - 30; this.tweens.add({ targets: s, y: z - 2, duration: 380, ease: 'Bounce.out' }); }
        this.pickups.push(p);
        return p;
    }

    removePickup(p) { p.sprite.destroy(); this.pickups = this.pickups.filter(o => o !== p); }

    spawnKnife(f) {
        const s = this.add.image(0, 0, 'knife').setScale(1 / RES).setFlipX(f.facing < 0);
        this.knives.push({ x: f.x + f.facing * 12, z: f.z, h: f.h + 34 * f.scale, vx: f.facing * 250, owner: f, sprite: s });
        Sound.play('knife');
    }

    updateKnives(sec) {
        for (const k of this.knives) {
            k.x += k.vx * sec;
            k.sprite.setPosition(k.x, k.z - k.h).setDepth(k.z);
            for (const o of this.fighters) {
                if (o.team === k.owner.team || !o.hittable()) continue;
                if (Math.abs(o.x - k.x) < 9 && Math.abs(o.z - k.z) < 8 && Math.abs(o.h + 30 * o.scale - k.h) < 26) {
                    o.takeHit(k.owner, { dmg: 12, knock: [90, 200] }, Math.sign(k.vx));
                    k.dead = true; break;
                }
            }
            if (k.x < this.camX - 30 || k.x > this.camX + GAME_W + 30) k.dead = true;
            if (k.dead) k.sprite.destroy();
        }
        this.knives = this.knives.filter(k => !k.dead);
    }

    hitProps(f, a) {
        for (const p of this.props) {
            if (p.broken || f.hitSet.has(p)) continue;
            const rel = (p.x - f.x) * f.facing;
            if (rel < a.reach[0] - 8 || rel > a.reach[1] + 8 || Math.abs(p.z - f.z) > 10) continue;
            f.hitSet.add(p);
            p.broken = true;
            Sound.play('heavy');
            this.spark(p.x, p.z - 14, true);
            const dir = Math.sign(p.x - f.x) || 1;
            this.tweens.add({ targets: p.sprite, x: p.x + dir * 50, y: p.z - 30, angle: dir * 200, alpha: 0, duration: 500, onComplete: () => p.sprite.destroy() });
            this.spawnPickup(Math.random() < 0.5 ? 'knife' : 'bat', p.x, p.z, true);
        }
    }

    bodyCollide(body) {
        for (const o of this.enemies()) {
            if (o === body || !o.hittable() || o.h > 30) continue;
            if (Math.abs(o.x - body.x) < 16 && Math.abs(o.z - body.z) < 10) {
                o.takeHit(body.thrownBy, { dmg: 8, knock: [100, 200] }, Math.sign(body.vx) || 1);
            }
        }
    }

    // ---- waves & camera ----------------------------------------------------------------------
    updateCamera() {
        const alive = this.players.filter(p => p.state !== 'out');
        if (!alive.length) return;
        const maxX = Math.max(...alive.map(p => p.x)), minX = Math.min(...alive.map(p => p.x));
        let limit = this.stage.width - GAME_W;
        const w = this.stage.waves[this.waveIdx];
        if (w) limit = Math.min(limit, w.x);
        let target = Math.min(maxX - 140, limit, minX - 14);
        this.camX = Math.max(this.camX, Math.min(target, this.camX + 2.5));
        this.camX = Phaser.Math.Clamp(this.camX, 0, this.stage.width - GAME_W);
        this.cameras.main.scrollX = this.camX;
        this.far.tilePositionX = this.camX * this.farFactor * RES;
    }

    updateWaves(dt) {
        const waves = this.stage.waves;
        if (!this.wave && this.waveIdx < waves.length && this.camX >= waves[this.waveIdx].x - 0.5) {
            this.wave = waves[this.waveIdx];
            this.waveT = 0;
            this.queue = this.wave.e.map(e => ({ type: e[0], side: e[1], delay: e[2], weapon: e[3] }));
            if (this.wave.boss) Sound.music('boss');
        }
        if (!this.wave) return;
        this.waveT += dt;
        for (const q of this.queue) {
            if (q.spawned || this.waveT < q.delay) continue;
            q.spawned = true;
            const x = q.side === 'r' ? this.camX + GAME_W + 30 : this.camX - 30;
            const z = FLOOR_TOP + 12 + Math.random() * (FLOOR_BOT - FLOOR_TOP - 20);
            const e = new Fighter(this, CHARS[q.type], x, z, 'enemy');
            e.facing = q.side === 'r' ? -1 : 1;
            e.weapon = q.weapon || null;
            this.fighters.push(e);
            if (CHARS[q.type].heavy || CHARS[q.type].boss) this.lastEnemy = e;
        }
        if (this.queue.every(q => q.spawned) && this.enemies().length === 0) {
            this.wave = null;
            this.waveIdx++;
            this.time99 = 99;
            if (this.waveIdx >= waves.length) this.stageClear();
            else { this.goUntil = this.time.now + 3000; Sound.play('go'); }
        }
    }

    stageClear() {
        this.ended = true;
        Sound.stopMusic(); Sound.play('clear');
        const bonus = Math.max(0, this.time99) * 100;
        for (const p of this.players) if (p.state !== 'out') { p.score += bonus; if (p.state === 'idle' || p.state === 'walk') p.set('win'); }
        this.banner('MISSION CLEAR', 'TIME BONUS ' + bonus, 3200);
        this.time.delayedCall(4000, () => {
            const players = this.players.map(p => ({ char: this.data0.players[p.pIndex].char, lives: p.state === 'out' ? 0 : p.lives, score: p.score }));
            if (this.stageIdx + 1 < Stages.LIST.length) this.scene.start('Game', { ...this.data0, stage: this.stageIdx + 1, players });
            else this.scene.start('Ending', { players });
        });
    }

    update(time, delta) {
        const dt = Math.min(delta, 50), sec = dt / 1000;
        for (const p of this.players) p.ctrl.update();
        if (this.players.some(p => p.ctrl.pressed.start) && !this.ended) this.togglePause();
        if (this.paused) return;

        if (this.hitstopT > 0) { this.hitstopT -= dt; this.updateHud(); return; }
        for (const f of this.fighters.slice()) f.update(dt);
        if (this.ended) {
            for (const p of this.players) if (p.state === 'idle' || p.state === 'walk') p.set('win');
        }
        this.updateKnives(sec);
        this.updateCamera();
        if (!this.ended) this.updateWaves(dt);

        if (!this.ended) {
            this.timerAcc += dt;
            if (this.timerAcc > 1300) {
                this.timerAcc = 0; this.time99--;
                if (this.time99 < 0) {
                    this.time99 = 99;
                    for (const p of this.alivePlayers()) { p.hp = 0; p.knockdown(-p.facing, [40, 160]); }
                }
            }
            if (this.players.every(p => p.state === 'out')) {
                this.overT += dt;
                if (this.overT > 1200) {
                    this.ended = true;
                    this.scene.start('Continue', { ...this.data0 });
                }
            }
        }
        this.updateHud();
    }
}

// ================================================================================================
class ContinueScene extends Phaser.Scene {
    constructor() { super('Continue'); }
    create(data) {
        this.data0 = data;
        setupCamera(this);
        txt(this, GAME_W / 2, 70, 'GAME OVER', 16, '#e02020').setOrigin(0.5);
        txt(this, GAME_W / 2, 110, 'CONTINUE?', 8).setOrigin(0.5);
        this.count = 9;
        this.countText = txt(this, GAME_W / 2, 136, '9', 24, '#f0d040').setOrigin(0.5);
        txt(this, GAME_W / 2, 176, 'PRESS PUNCH', 8, '#a0a0a0').setOrigin(0.5);
        Sound.music('gameover');
        this.ctrls = [new Controller(this, 0, 'solo'), new Controller(this, 1, 'p2')];
        this.tick = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
            this.count--;
            if (this.count < 0) { this.tick.remove(); this.scene.start('Title'); return; }
            this.countText.setText(String(this.count)); Sound.play('select');
        } });
        this.t0 = this.time.now;
    }
    update() {
        let go = false;
        for (const c of this.ctrls) { c.update(); if (c.pressed.punch || c.pressed.start) go = true; }
        if (go && this.time.now - this.t0 > 500) {
            const players = this.data0.players.map(p => ({ char: p.char, lives: 2, score: 0 }));
            this.scene.start('Game', { ...this.data0, players });
        }
    }
}

// ================================================================================================
class EndingScene extends Phaser.Scene {
    constructor() { super('Ending'); }
    create(data) {
        setupCamera(this, '#08061a');
        Sound.music('ending');
        this.add.sprite(GAME_W / 2 - (data.players.length > 1 ? 24 : 0), 214, 'billy', 'win').setOrigin(0.5, CHARS.billy.originY).setScale(1.4 / RES);
        if (data.players.length > 1) this.add.sprite(GAME_W / 2 + 24, 214, 'jimmy', 'win').setOrigin(0.5, CHARS.jimmy.originY).setScale(1.4 / RES).setFlipX(true);
        const lines = ['THE SHADOW BOSS IS GONE.', 'THE BLACK WARRIORS', 'ARE FINISHED.', '', 'MARIAN IS AVENGED.', '', 'THE END'];
        lines.forEach((l, i) => {
            const t = txt(this, GAME_W / 2, 30 + i * 14, l, 8, l === 'THE END' ? '#f0d040' : '#ffffff').setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: t, alpha: 1, delay: 500 + i * 500, duration: 400 });
        });
        data.players.forEach((p, i) => txt(this, 8 + i * 210, 4, `${i + 1}P ${String(p.score).padStart(6, '0')}`, 8, '#f0d040'));
        this.ctrl = new Controller(this, 0, 'solo');
        this.t0 = this.time.now;
    }
    update() {
        this.ctrl.update();
        if (this.time.now - this.t0 > 4500 && this.ctrl.anyPressed()) this.scene.start('Title');
    }
}
