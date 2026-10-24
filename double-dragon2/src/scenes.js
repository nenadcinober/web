const FONT = '"Tiny5", monospace';
const txt = (scene, x, y, s, size = 8, color = '#ffffff') =>
    scene.add.text(x, y, s, { fontFamily: FONT, fontSize: Math.round(size * 1.5) + 'px', color, stroke: '#000000', strokeThickness: 2, resolution: RES })
        .setScrollFactor(0).setDepth(5000);

// The game is laid out in world units (GAME_W x GAME_H); the camera zooms by RES to fill the
// native 1024 x 768 canvas with the high-resolution art.
function setupCamera(scene, bg = '#000000') {
    scene.cameras.main.setOrigin(0, 0).setZoom(RES).setBackgroundColor(bg);
}

// Small persistent settings (high score, mute). Storage can be missing or throw in private
// windows, so every access falls back to the default.
const Save = {
    get(k, d) { try { const v = localStorage.getItem('dupliZmaj2.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dupliZmaj2.' + k, JSON.stringify(v)); } catch (e) { /* not persisted */ } },
};
const toggleMute = () => Save.set('muted', Sound.toggleMute());

// Records the best score of a finished run; returns true when it beat the stored record.
function recordScore(scores) {
    const best = Math.max(0, ...scores), prev = Save.get('hiscore', 0);
    if (best <= prev) return false;
    Save.set('hiscore', best);
    return true;
}

// Croatian plural for the hit counter: 2-4 udarca, 5+ udaraca (but 12-14 udaraca).
const COMBO_MS = 1200;   // hits closer together than this count as one chain
const udarca = n => (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'UDARCA' : 'UDARACA';

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
        Sound.setMuted(Save.get('muted', false));
        Sprites.buildProps(this);
        for (const k in CHARS) Sprites.buildCharacter(this, CHARS[k]);
        // the Fićo that drives through the fair, drawn at foreground size with its driver
        Sprites.addTex(this, 'car', 70, 40, x => {
            x.scale(2.2, 2.2);
            Stages.fico(x, 1, 17, '#e05a40');
            x.beginPath(); x.ellipse(13, 6, 1.6, 1.9, 0, 0, 7); x.fillStyle = '#3a2a24'; x.fill();
        });
        const fontReady = document.fonts ? Promise.all([document.fonts.load('12px "Tiny5"', 'ABC'), document.fonts.load('12px "Tiny5"', 'ČĆŽŠĐ')]) : Promise.resolve();
        Promise.race([fontReady, new Promise(r => setTimeout(r, 2500))]).then(() => this.scene.start('Title'));
    }
}

// ================================================================================================
class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        setupCamera(this);
        if (!this.textures.exists('titleFar')) {
            const bg = Stages.village(GAME_W);
            this.textures.addCanvas('titleFar', bg.far);
            this.textures.addCanvas('titleNear', bg.near);
        }
        this.add.image(0, 0, 'titleFar').setOrigin(0).setScale(1 / RES);
        this.add.image(0, 0, 'titleNear').setOrigin(0).setScale(1 / RES);
        this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.4).setOrigin(0);

        const title = this.add.text(GAME_W / 2, 30, 'DUPLI ZMAJ', { fontFamily: FONT, fontSize: '34px', stroke: '#200000', strokeThickness: 4, resolution: RES }).setOrigin(0.5);
        const grd = title.context.createLinearGradient(0, 0, 0, title.height);
        grd.addColorStop(0, '#fff6a0'); grd.addColorStop(0.45, '#f0a020'); grd.addColorStop(0.55, '#d03010'); grd.addColorStop(1, '#801008');
        title.setFill(grd);
        const two = this.add.text(GAME_W / 2, 64, 'II', { fontFamily: FONT, fontSize: '46px', color: '#e01818', stroke: '#ffffff', strokeThickness: 3, resolution: RES }).setOrigin(0.5);
        this.tweens.add({ targets: two, scale: 1.08, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
        this.add.text(GAME_W / 2, 90, 'OSVETA GRUNTOVČANA', { fontFamily: FONT, fontSize: '13px', color: '#ffe8a0', stroke: '#000000', strokeThickness: 2, resolution: RES }).setOrigin(0.5);

        this.add.sprite(52, 226, 'dudek', 'idle').setScale(1.6 / RES).setOrigin(0.5, CHARS.dudek.originY);
        this.add.sprite(GAME_W - 52, 226, 'regica', 'idle').setScale(1.6 / RES).setOrigin(0.5, CHARS.regica.originY).setFlipX(true);

        this.sel = 0; this.started = false;
        this.items = [txt(this, GAME_W / 2, 118, '1 IGRAČ', 8).setOrigin(0.5), txt(this, GAME_W / 2, 132, '2 IGRAČA', 8).setOrigin(0.5)];
        this.cursor = txt(this, 0, 0, '>', 8, '#f0d040').setOrigin(0.5);
        this.prompt = txt(this, GAME_W / 2, 152, 'PRITISNI START', 8, '#f0d040').setOrigin(0.5);
        txt(this, GAME_W / 2, 172, 'HODANJE WASD/STRELICE  UDARAC J/Z', 6, '#c0c0c0').setOrigin(0.5);
        txt(this, GAME_W / 2, 182, 'NOGA K/X  SKOK L/C/RAZMAK', 6, '#c0c0c0').setOrigin(0.5);
        txt(this, GAME_W / 2, 192, '2. IGRAČ: STRELICE + NUM 1/2/3, ULAZ NUM 0', 6, '#c0c0c0').setOrigin(0.5);
        txt(this, GAME_W / 2, 202, 'M ZVUK  P PAUZA', 6, '#c0c0c0').setOrigin(0.5);
        const hi = Save.get('hiscore', 0);
        if (hi > 0) txt(this, GAME_W / 2, 213, 'REKORD ' + String(hi).padStart(6, '0'), 6, '#f0d040').setOrigin(0.5);
        txt(this, GAME_W / 2, 226, 'NEKOMERCIJALNI FAN HOMMAGE', 6, '#c8b8a0').setOrigin(0.5);

        this.ctrls = [new Controller(this, 0, 'solo'), new Controller(this, 1, 'p2')];
        startAudioOnInput(this, () => Sound.music('title'));
        if (Sound.ready) Sound.music('title');
        this.input.keyboard.on('keydown-M', toggleMute);
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
        const players = [{ char: 'dudek', lives: 2, score: 0, out: false }];
        if (sel === 1) players.push({ char: 'regica', lives: 2, score: 0, out: false });
        this.scene.start('Story', { stage: 0, players, twoP: sel === 1 });
    }
}

// ================================================================================================
class StoryScene extends Phaser.Scene {
    constructor() { super('Story'); }
    create(data) {
        this.data0 = data; this.done = false; this.t0 = undefined;
        setupCamera(this);
        const lines = ['ŠVERCERSKA BANDA UKRALA JE', 'DUDEKU KRAVU I POLA GRUNTA.', '', 'DUDEK I REGICA', 'KREĆU U OSVETU.', '', 'SAD BU GUŽVA!'];
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
            f.hits = 0; f.hitAt = 0;
            // a player who lost every life stays out for the rest of the run
            if (p.out) f.set('out');
            this.fighters.push(f); this.players.push(f);
        });
        // In a one-player game a second player can drop in with their START (NUM 0 / pad 2).
        this.joinCtrl = data.players.length === 1 ? new Controller(this, 1, 'p2') : null;
        for (const [type, x, z] of st.props) {
            const s = this.add.image(x, z, type).setOrigin(0.5, 1).setScale(1 / RES).setDepth(z);
            this.props.push({ type, x, z, sprite: s, broken: false });
        }
        for (const [type, x, z] of st.pickups) this.spawnPickup(type, x, z, false);

        this.waveIdx = 0; this.wave = null; this.queue = [];
        this.time99 = 99; this.timerAcc = 0;
        this.ended = false; this.overT = 0; this.paused = false; this.introT = 0;
        this.cars = [];
        this.hazard = st.hazard ? { nextT: 6000, warn: null } : null;
        this.buildHud();
        this.banner(st.name, st.title, 2600);
        Sound.music(st.music);

        this.input.keyboard.on('keydown-M', toggleMute);
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
        this.hud = [];
        this.players.forEach((p, i) => this.addHud(p, i));
        // The join hint needs a keyboard or a second pad, so it is left off touch screens.
        this.joinText = this.joinCtrl && !document.body.classList.contains('touch')
            ? txt(this, 222, 1, '2. IGRAČ\nNUM 0 ZA ULAZ', 6, '#ff8080') : null;
        this.timeText = txt(this, GAME_W / 2, 1, '', 8, '#f0d040').setOrigin(0.5, 0);
        this.enemyText = txt(this, GAME_W / 2, 38, '', 8, '#ffb0b0').setOrigin(0.5, 0);
        this.goText = txt(this, GAME_W - 104, 90, 'DALJE', 16, '#f0d040').setVisible(false);
        this.pauseText = txt(this, GAME_W / 2, 100, 'PAUZA', 16).setOrigin(0.5).setVisible(false);
        this.goUntil = 0;
    }

    addHud(p, i) {
        const x0 = i === 0 ? 6 : 222;
        this.hud[i] = {
            name: txt(this, x0, 1, `${i + 1}. ${p.def.name}`, 8, i === 0 ? '#80b0ff' : '#ff8080'),
            score: txt(this, x0, 27, '', 8),
            lives: txt(this, x0 + 74, 27, '', 8, '#f0d040'),
            combo: txt(this, x0, 38, '', 8, '#80f0a0').setVisible(false),
            x0,
        };
    }

    joinP2() {
        const f = new Fighter(this, CHARS.regica, this.camX + 60, 194, 'player');
        f.ctrl = new Controller(this, 1, 'p2');
        f.lives = 2; f.score = 0; f.pIndex = 1; f.hits = 0; f.hitAt = 0;
        f.h = 110; f.set('jump'); f.vh = 0; f.invuln = 2200;
        this.fighters.push(f); this.players.push(f);
        // The arrow keys now belong to player 2, so player 1 moves to the WASD half of the keyboard.
        this.players[0].ctrl = new Controller(this, 0, 'p1');
        this.data0 = { ...this.data0, twoP: true, players: [...this.data0.players, { char: 'regica', lives: 2, score: 0, out: false }] };
        this.addHud(f, 1);
        this.joinCtrl = null;
        if (this.joinText) { this.joinText.destroy(); this.joinText = null; }
        Sound.play('select');
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
            this.drawBar(g, h.x0 + 1, 17, p.state === 'out' ? 0 : p.hp, p.maxHp, 16, col);
            h.score.setText(String(p.score).padStart(6, '0'));
            h.lives.setText(p.state === 'out' ? 'VAN' : 'x' + p.lives);
            const chain = p.hits >= 2 && this.time.now - p.hitAt < COMBO_MS;
            h.combo.setVisible(chain);
            if (chain) h.combo.setText(`${p.hits} ${udarca(p.hits)}`);
        });
        if (this.joinText) this.joinText.setVisible(Math.floor(this.time.now / 600) % 2 === 0);
        const w = this.hazard && this.hazard.warn;
        if (w && Math.floor(this.time.now / 160) % 2 === 0) {
            // road sign warning at the edge the car will come from, on its lane
            const x = w.side > 0 ? GAME_W - 14 : 14, y = w.z - 26;
            g.fillStyle(0x000000); g.fillTriangle(x, y - 10, x - 10, y + 7, x + 10, y + 7);
            g.fillStyle(0xf0d040); g.fillTriangle(x, y - 7.5, x - 7.8, y + 5.5, x + 7.8, y + 5.5);
            g.fillStyle(0x000000); g.fillRect(x - 1, y - 3, 2, 5); g.fillRect(x - 1, y + 3, 2, 1.6);
        }
        this.timeText.setText('VRIJEME ' + String(Math.max(0, this.time99)).padStart(2, '0'));
        const e = this.lastEnemy;
        if (e && !e.removed) {
            this.enemyText.setText(e.def.name).setVisible(true);
            const blocks = e.def.heavy || e.def.boss ? 16 : 8;
            this.drawBar(g, GAME_W / 2 - blocks * 2.5, 52, e.hp, e.maxHp, blocks, 0xe04070);
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

    // Score and messages floating up from a spot in the world.
    popup(x, y, s, color = '#ffffff', size = 8) {
        x = Phaser.Math.Clamp(x, this.camX + s.length * 3 + 4, this.camX + GAME_W - s.length * 3 - 4);
        const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: Math.round(size * 1.5) + 'px', color, stroke: '#000000', strokeThickness: 2, resolution: RES })
            .setOrigin(0.5).setDepth(4500);
        this.tweens.add({ targets: t, y: y - 18, alpha: 0, delay: 350, duration: 650, onComplete: () => t.destroy() });
    }

    onDamage(by, target, dmg) {
        target.lastHitBy = by;
        if (by && by.isPlayer) {
            by.score += dmg * 10;
            by.hits = this.time.now - by.hitAt < COMBO_MS ? by.hits + 1 : 1;
            by.hitAt = this.time.now;
        }
        if (target.team === 'enemy') this.lastEnemy = target;
    }

    // A chain of 4+ hits pays a bonus once it runs out.
    settleCombos() {
        for (const p of this.players) {
            if (!p.hits || this.time.now - p.hitAt < COMBO_MS) continue;
            if (p.hits >= 4) {
                const bonus = p.hits * 50;
                p.score += bonus;
                this.popup(p.x, p.z - p.h - 70, 'KOMBO +' + bonus, '#80f0a0');
            }
            p.hits = 0;
        }
    }

    onKO(f) {
        if (f.team === 'enemy') {
            const by = f.lastHitBy;
            if (by && by.isPlayer) {
                const pts = f.def.score || 100;
                by.score += pts;
                this.popup(f.x, f.z - 50 * f.scale, '+' + pts, by.pIndex ? '#ff9090' : '#90c0ff');
            }
            if (f.def.heavy || f.def.boss) Sound.play('ko');
        } else Sound.play('ko');
    }

    eat(f, heal) {
        f.hp = Math.min(f.maxHp, f.hp + heal);
        Sound.play('eat');
        this.popup(f.x, f.z - f.h - 66, 'NJAM! +' + heal, '#80f0a0');
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

    // Food is only for players; foodOnly is for a player whose hands are already full.
    pickupNear(f, r = 14, foodOnly = false) {
        let best = null, bd = 1e9;
        for (const p of this.pickups) {
            if (FOOD[p.type] ? !f.isPlayer : foodOnly) continue;
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
        this.knives.push({ x: f.x + f.facing * 12, z: f.z, h: f.h + 34 * f.scale, vx: f.facing * 250, owner: f, sprite: s, hit: { dmg: 12, knock: [90, 200] } });
        Sound.play('knife');
    }

    // A lobbed bottle: flies in an arc, spinning, and shatters where it lands.
    spawnBottle(f) {
        const s = this.add.image(0, 0, 'bottle').setScale(1 / RES);
        const tgt = this.nearestPlayer(f), dist = tgt ? Math.abs(tgt.x - f.x) : 100;
        const vh = 150, flight = 2 * vh / (GRAV * 0.7);
        this.knives.push({ x: f.x + f.facing * 10, z: f.z, h: f.h + 40 * f.scale, vx: f.facing * Phaser.Math.Clamp(dist / flight, 60, 260), vh, grav: GRAV * 0.7,
                           spin: f.facing * 900, owner: f, sprite: s, hit: { dmg: 8 } });
        Sound.play('whoosh');
    }

    updateKnives(sec) {
        for (const k of this.knives) {
            k.x += k.vx * sec;
            if (k.grav) {
                k.vh -= k.grav * sec; k.h += k.vh * sec;
                k.sprite.angle += k.spin * sec;
                if (k.h <= 0) { k.dead = true; this.spark(k.x, k.z - 4, false); Sound.play('glass'); }
            }
            k.sprite.setPosition(k.x, k.z - k.h).setDepth(k.z);
            for (const o of this.fighters) {
                if (k.dead || o.team === k.owner.team || !o.hittable()) continue;
                if (Math.abs(o.x - k.x) < 9 && Math.abs(o.z - k.z) < 8 && Math.abs(o.h + 30 * o.scale - k.h) < 26) {
                    o.takeHit(k.owner, k.hit, Math.sign(k.vx));
                    if (k.grav) Sound.play('glass');
                    k.dead = true; break;
                }
            }
            if (k.x < this.camX - 30 || k.x > this.camX + GAME_W + 30) k.dead = true;
            if (k.dead) k.sprite.destroy();
        }
        this.knives = this.knives.filter(k => !k.dead);
    }

    // ---- road traffic hazard: a horn and a warning sign, then a car sweeps the lane -----------
    updateHazard(dt, sec) {
        const hz = this.hazard;
        if (hz && !this.ended) {
            if (!hz.warn && (hz.nextT -= dt) <= 0) {
                const ps = this.alivePlayers(), tgt = ps[Math.floor(Math.random() * ps.length)];
                hz.warn = { z: tgt ? tgt.z : 196, side: Math.random() < 0.5 ? -1 : 1, t: 1300 };
                Sound.play('horn');
            }
            if (hz.warn && (hz.warn.t -= dt) <= 0) {
                const { z, side } = hz.warn;
                const x = side > 0 ? this.camX + GAME_W + 50 : this.camX - 50;
                const sprite = this.add.image(x, z, 'car').setOrigin(0.5, 0.97).setScale(1 / RES).setFlipX(side < 0);
                const shadow = this.add.image(x, z, 'blob').setScale(2.6 / RES, 1.4 / RES);
                this.cars.push({ x, z, vx: -side * 290, sprite, shadow, hitSet: new Set() });
                Sound.play('car');
                hz.warn = null; hz.nextT = 7000 + Math.random() * 6000;
            }
        }
        for (const c of this.cars) {
            c.x += c.vx * sec;
            c.sprite.setPosition(c.x, c.z + 1).setDepth(c.z);
            c.shadow.setPosition(c.x, c.z).setDepth(c.z - 200);
            for (const o of this.fighters) {
                if (c.hitSet.has(o) || !o.hittable() || o.h > 24) continue;
                if (Math.abs(o.x - c.x) < 32 && Math.abs(o.z - c.z) < 9) {
                    c.hitSet.add(o);
                    o.takeHit(null, { dmg: 14, knock: [170, 240] }, Math.sign(c.vx));
                }
            }
            if ((c.vx > 0 && c.x > this.camX + GAME_W + 80) || (c.vx < 0 && c.x < this.camX - 80)) {
                c.dead = true; c.sprite.destroy(); c.shadow.destroy();
            }
        }
        this.cars = this.cars.filter(c => !c.dead);
    }

    // ---- boss intro: everything freezes while the boss gets a name card ------------------------
    bossIntro(wave) {
        const type = wave.e.map(e => e[0]).find(t => CHARS[t].boss || CHARS[t].heavy);
        if (!wave.intro || !type) return;
        const def = CHARS[type];
        this.introT = 2200;
        Sound.play('boss');
        const band = this.add.rectangle(0, 78, GAME_W, 86, 0x000000, 0.8).setOrigin(0).setScrollFactor(0).setDepth(5000);
        const edge = this.add.graphics().setScrollFactor(0).setDepth(5000);
        edge.fillStyle(0xc01818); edge.fillRect(0, 78, GAME_W, 2); edge.fillRect(0, 162, GAME_W, 2);
        const face = this.add.sprite(-60, 160, def.key, 'ready').setOrigin(0.5, def.originY).setScale(1.15 / RES).setScrollFactor(0).setDepth(5001);
        const name = txt(this, GAME_W + 120, 106, wave.intro[0], 16, '#ff4030').setOrigin(0.5).setDepth(5001);
        const sub = txt(this, GAME_W + 120, 130, wave.intro[1], 8, '#f0e0c0').setOrigin(0.5).setDepth(5001);
        this.tweens.add({ targets: face, x: 70, duration: 350, ease: 'Back.out' });
        this.tweens.add({ targets: [name, sub], x: 200, duration: 350, delay: 120, ease: 'Back.out' });
        const parts = [band, edge, face, name, sub];
        this.time.delayedCall(1900, () => this.tweens.add({ targets: parts, alpha: 0, duration: 300, onComplete: () => parts.forEach(o => o.destroy()) }));
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
            const r = Math.random();
            this.spawnPickup(r < 0.15 ? 'kobasica' : r < 0.4 ? 'jabuka' : r < 0.7 ? 'knife' : 'bat', p.x, p.z, true);
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
            if (this.wave.boss) { Sound.music('boss'); this.bossIntro(this.wave); }
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
            // The clock keeps what's left on the final wave so stageClear() can pay it out as the bonus.
            if (this.waveIdx >= waves.length) this.stageClear();
            else { this.time99 = 99; this.goUntil = this.time.now + 3000; Sound.play('go'); }
        }
    }

    stageClear() {
        this.ended = true;
        Sound.stopMusic(); Sound.play('clear');
        const bonus = Math.max(0, this.time99) * 100;
        for (const p of this.players) if (p.state !== 'out') { p.score += bonus; if (p.state === 'idle' || p.state === 'walk') p.set('win'); }
        this.banner('MISIJA GOTOVA', 'BONUS ZA VRIJEME ' + bonus, 3200);
        this.time.delayedCall(4000, () => {
            const players = this.players.map(p => ({ char: this.data0.players[p.pIndex].char, lives: p.lives, score: p.score, out: p.state === 'out' }));
            if (this.stageIdx + 1 < Stages.LIST.length) this.scene.start('Game', { ...this.data0, stage: this.stageIdx + 1, players });
            else this.scene.start('Ending', { players });
        });
    }

    update(time, delta) {
        const dt = Math.min(delta, 50), sec = dt / 1000;
        for (const p of this.players) p.ctrl.update();
        if (this.players.some(p => p.ctrl.pressed.start) && !this.ended) this.togglePause();
        if (this.paused) return;
        if (this.joinCtrl) {
            this.joinCtrl.update();
            if (this.joinCtrl.pressed.start && !this.ended) this.joinP2();
        }

        if (this.introT > 0) { this.introT -= dt; this.updateHud(); return; }
        if (this.hitstopT > 0) { this.hitstopT -= dt; this.updateHud(); return; }
        for (const f of this.fighters.slice()) f.update(dt);
        if (this.ended) {
            for (const p of this.players) if (p.state === 'idle' || p.state === 'walk') p.set('win');
        }
        this.updateKnives(sec);
        this.updateHazard(dt, sec);
        this.settleCombos();
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
                    this.scene.start('GameOver', { stage: this.stageIdx, scores: this.players.map(p => p.score) });
                }
            }
        }
        this.updateHud();
    }
}

// ================================================================================================
// No continues: once every player has used up all three lives the run is over.
class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOver'); }
    create(data) {
        setupCamera(this);
        txt(this, GAME_W / 2, 70, 'KRAJ IGRE', 16, '#e02020').setOrigin(0.5);
        txt(this, GAME_W / 2, 104, Stages.LIST[data.stage].name + ' - ' + Stages.LIST[data.stage].title, 8, '#c0c0c0').setOrigin(0.5);
        data.scores.forEach((sc, i) => txt(this, GAME_W / 2, 132 + i * 16, `${i + 1}. IGRAČ  ${String(sc).padStart(6, '0')}`, 8, '#f0d040').setOrigin(0.5));
        if (recordScore(data.scores)) txt(this, GAME_W / 2, 176, 'NOVI REKORD!', 8, '#80f0a0').setOrigin(0.5);
        Sound.music('gameover');
        this.ctrls = [new Controller(this, 0, 'solo'), new Controller(this, 1, 'p2')];
        this.t0 = this.time.now;
        this.time.delayedCall(8000, () => this.scene.start('Title'));
    }
    update() {
        let go = false;
        for (const c of this.ctrls) { c.update(); if (c.anyPressed()) go = true; }
        if (go && this.time.now - this.t0 > 1500) this.scene.start('Title');
    }
}

// ================================================================================================
class EndingScene extends Phaser.Scene {
    constructor() { super('Ending'); }
    create(data) {
        setupCamera(this, '#08061a');
        Sound.music('ending');
        // only the heroes still standing at the end take the bow
        const standing = data.players.filter(p => !p.out);
        standing.forEach((p, i) => {
            const dx = standing.length > 1 ? (i ? 24 : -24) : 0;
            this.add.sprite(GAME_W / 2 + dx, 214, p.char, 'win').setOrigin(0.5, CHARS[p.char].originY).setScale(1.4 / RES).setFlipX(i > 0);
        });
        const lines = ['CRNI DUDEK JE PORAŽEN.', 'BANDE VIŠE NEMA.', '', 'KRAVA JE DOMA,', 'GRUNT JE NAŠ.', '', 'KRAJ'];
        lines.forEach((l, i) => {
            const t = txt(this, GAME_W / 2, 30 + i * 14, l, 8, l === 'KRAJ' ? '#f0d040' : '#ffffff').setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: t, alpha: 1, delay: 500 + i * 500, duration: 400 });
        });
        data.players.forEach((p, i) => txt(this, 8 + i * 210, 4, `${i + 1}. ${String(p.score).padStart(6, '0')}`, 8, '#f0d040'));
        if (recordScore(data.players.map(p => p.score))) txt(this, GAME_W / 2, 18, 'NOVI REKORD!', 8, '#80f0a0').setOrigin(0.5);
        this.ctrl = new Controller(this, 0, 'solo');
        this.t0 = this.time.now;
    }
    update() {
        this.ctrl.update();
        if (this.time.now - this.t0 > 4500 && this.ctrl.anyPressed()) this.scene.start('Title');
    }
}
