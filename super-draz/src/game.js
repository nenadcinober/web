// The platforming itself: Dudek, the tile world, enemies, power-ups and the level endings.
const PLAYER_TEX = ['dudek_s', 'dudek_b', 'dudek_f'];
const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create() {
        this.st = this.registry.get('state');
        const L = this.L = Levels.build(this.st.level);
        this.worldW = L.width * T;
        this.clock = 0;
        this.mode = 'play'; this.phase = null; this.starOn = false; this.bumping = {};
        this.paused = false; this.frozen = false;
        this.combo = 0;
        this.headHits = [];
        this.multi = {};
        this.timeLeft = L.time; this.timeAcc = 0;
        this.firebars = [];
        this.tilesKey = 'tiles_' + L.theme;

        this.cameras.main.setBounds(0, 0, this.worldW, VH);
        this.physics.world.setBounds(0, -400, this.worldW, VH + 800);
        this.physics.world.checkCollision.up = false;
        this.physics.world.checkCollision.down = false;

        Backgrounds.addTo(this, L.theme, this.worldW);

        const map = this.make.tilemap({ data: L.grid, tileWidth: T, tileHeight: T });
        const ts = map.addTilesetImage('tiles', this.tilesKey, T, T, 0, 0);
        this.layer = map.createLayer(0, ts, 0, 0).setDepth(10);
        this.layer.setCollision(SOLID);

        this.enemies = this.physics.add.group();
        this.items = this.physics.add.group();
        this.fireballs = this.physics.add.group();
        this.hazards = this.physics.add.group({ allowGravity: false });
        this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.coinGroup = this.physics.add.staticGroup();

        for (const o of L.objects) this.spawn(o);

        const p = this.player = this.physics.add.sprite(L.start * T + T / 2, GROUND * T, 'dudek_s', 'stand').setOrigin(0.5, 1).setDepth(20);
        p.size = 0; p.facing = 1; p.inv = 0; p.star = 0; p.coyote = 0; p.jumpBuf = 0; p.jumping = false;
        p.throwUntil = 0; p.animT = 0; p.dead = false;
        this.setPower(this.st.power);
        p.prevBottom = p.body.bottom;

        this.physics.add.collider(p, this.layer, (pl, tile) => this.onPlayerTile(tile));
        this.physics.add.collider(p, this.platforms);
        this.physics.add.collider(this.enemies, this.layer, null, e => e.kind !== 'crow' && !e.dead);
        this.physics.add.collider(this.enemies, this.enemies, (a, b) => this.enemyBump(a, b), (a, b) => this.enemyProcess(a, b));
        this.physics.add.overlap(p, this.enemies, (pl, e) => this.touchEnemy(e));
        this.physics.add.collider(this.items, this.layer);
        this.physics.add.overlap(p, this.items, (pl, it) => this.collect(it));
        this.physics.add.overlap(p, this.coinGroup, (pl, c) => this.takeCoin(c));
        this.physics.add.collider(this.fireballs, this.layer);
        this.physics.add.overlap(this.fireballs, this.enemies, (f, e) => this.fireHit(f, e));
        this.physics.add.overlap(p, this.hazards, () => this.hurt());
        if (this.boss) {
            this.physics.add.collider(this.boss, this.layer, null, () => !this.boss.dead);
            this.physics.add.overlap(p, this.boss, () => { if (!this.boss.dead) this.hurt(); });
            this.physics.add.overlap(this.fireballs, this.boss, (a, b) => this.bossHit(a.texture.key === 'fireball' ? a : b));
        }
        if (this.axe) this.physics.add.overlap(p, this.axe, () => this.finishCastle());

        // Arcade copies body positions onto sprites only after update(), so a camera placed in
        // update() trails Dudek by one physics step and he jitters on screen
        this.events.on('postupdate', this.followCamera, this);
        this.events.once('shutdown', () => this.events.off('postupdate', this.followCamera, this));

        this.makeHud();
        this.ctrl = new Controller(this);
        Sound.music(L.music);
        this.cameras.main.fadeIn(250);
    }

    // ---- spawning -----------------------------------------------------------------------------
    spawn(o) {
        const px = o.x * T + T / 2, bottom = (o.y + 1) * T;
        switch (o.type) {
            case 'coin': {
                const c = this.coinGroup.create(px, o.y * T + T / 2, 'coin', 'c0');
                c.body.setSize(26, 34);
                c.setDepth(14);
                c.play('spin');
                break;
            }
            case 'goose': case 'snail': case 'hedgehog': case 'crow':
                this.spawnEnemy(o.type, px, bottom); break;
            case 'log': case 'mlog': {
                const pl = this.platforms.create(o.x * T, o.y * T, o.w === 2 ? 'log2' : 'log3').setOrigin(0, 0).setDepth(12);
                pl.body.setSize(o.w * T, 22, false); pl.body.setOffset(0, 1);
                pl.body.checkCollision.down = false; pl.body.checkCollision.left = false; pl.body.checkCollision.right = false;
                if (this.L.theme === 'castle') pl.setTint(0xb0a0b8);
                pl.axis = o.axis || null; pl.speed = o.speed || 0;
                if (pl.axis === 'x') { pl.min = o.x * T; pl.max = (o.x + o.range) * T; pl.body.setVelocityX(pl.speed); }
                if (pl.axis === 'y') { pl.min = o.y * T; pl.max = (o.y + o.range) * T; pl.body.setVelocityY(pl.speed); }
                break;
            }
            case 'pole':
                this.pole = this.add.image(px, bottom - T, 'pole').setOrigin(0.5, 1).setDepth(8);
                this.poleBase = bottom - T;
                this.flag = this.add.image(px - 34, this.poleBase - 440, 'towel').setOrigin(0.5, 0).setDepth(7);
                break;
            case 'house':
                this.house = this.add.image(o.x * T + 144, GROUND * T, 'house').setOrigin(0.5, 1).setDepth(5);
                break;
            case 'decor':
                this.add.image(o.x * T, bottom, o.kind).setOrigin(0, 1).setDepth(5);
                break;
            case 'firebar': {
                const fb = { cx: px, cy: o.y * T + T / 2, a: 0, speed: o.speed, parts: [] };
                for (let i = 0; i < o.len; i++) fb.parts.push(this.add.image(fb.cx, fb.cy, 'ember').setDepth(16));
                this.firebars.push(fb);
                break;
            }
            case 'boss': {
                const B = this.boss = this.physics.add.sprite(px, bottom, 'boss', 'stand').setOrigin(0.5, 1).setDepth(18);
                B.body.setSize(54, 118, false); B.body.setOffset(21, 18);
                B.hp = 6; B.x0 = o.x0 * T; B.x1 = o.x1 * T; B.dir = -1; B.awake = false; B.dead = false;
                B.nextMove = 0; B.nextJump = 0; B.nextFire = 0; B.throwUntil = 0;
                break;
            }
            case 'axe':
                this.axe = this.physics.add.staticImage(px, bottom - T / 2, 'axe').setDepth(15);
                this.tweens.add({ targets: this.axe, angle: 8, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
                break;
            case 'regica':
                this.regica = this.add.sprite(px, bottom, 'regica', 'stand').setOrigin(0.5, 1).setFlipX(true).setDepth(15);
                break;
        }
    }

    spawnEnemy(kind, x, bottom) {
        const e = this.physics.add.sprite(x, bottom, kind, kind === 'crow' ? 'fly1' : 'walk1').setOrigin(0.5, 1).setDepth(18);
        this.enemies.add(e);
        const box = { goose: [34, 32, 11, 16], snail: [32, 30, 8, 18], hedgehog: [34, 26, 5, 22], crow: [36, 26, 10, 12] }[kind];
        e.body.setSize(box[0], box[1], false); e.body.setOffset(box[2], box[3]);
        e.kind = kind; e.dir = -1; e.state = 'walk'; e.awake = false; e.dead = false; e.t = 0; e.baseY = e.y;
        if (kind === 'crow') e.body.setAllowGravity(false);
        e.body.enable = false;
        e.prevTop = e.body.top;
    }

    // ---- player -------------------------------------------------------------------------------
    setPower(size) {
        const p = this.player, b = p.body;
        const bottom = b.bottom, vx = b.velocity.x, vy = b.velocity.y;
        p.size = size;
        p.setTexture(PLAYER_TEX[size], p.frame.name);
        if (size === 0) { b.setSize(26, 42, false); b.setOffset(19, 6); }
        else { b.setSize(30, 84, false); b.setOffset(17, 12); }
        b.reset(p.x, bottom);
        b.velocity.set(vx, vy);
    }

    grow(size) {
        const p = this.player, from = p.size;
        Sound.play(size === 2 ? 'power' : 'grow');
        this.frozen = true;
        this.physics.pause();
        let n = 0;
        this.time.addEvent({ delay: 75, repeat: 8, callback: () => {
            n++;
            this.setPower(n % 2 ? size : from);
            if (n === 9) { this.setPower(size); this.frozen = false; this.physics.resume(); }
        } });
    }

    updatePlayer(s) {
        const p = this.player, b = p.body, c = this.ctrl, now = this.clock;
        const onGround = b.blocked.down || b.touching.down;
        if (onGround) {
            p.coyote = now + 90;
            this.combo = 0;
            if (b.velocity.y >= 0) p.jumping = false;
        }
        if (c.pressed.jump) p.jumpBuf = now + 120;

        const dir = c.mx, maxV = c.held.run ? 390 : 240;
        let vx = b.velocity.x;
        if (dir !== 0) {
            const turning = Math.sign(vx) === -dir;
            p.skidding = onGround && turning && Math.abs(vx) > 120;
            vx += dir * (onGround ? (turning ? 1900 : 950) : 700) * s;
            if (Math.abs(vx) > maxV) vx = Math.sign(vx) * Math.max(maxV, Math.abs(vx) - 900 * s);
            p.facing = dir;
        } else {
            p.skidding = false;
            const fr = (onGround ? 1100 : 160) * s;
            vx = Math.abs(vx) <= fr ? 0 : vx - Math.sign(vx) * fr;
        }
        b.setVelocityX(vx);

        if (p.jumpBuf > now && p.coyote > now) {
            b.setVelocityY(-(790 + Math.abs(vx) * 0.13));
            p.jumping = true; p.coyote = 0; p.jumpBuf = 0;
            Sound.play(p.size ? 'bigjump' : 'jump');
        }
        b.setGravityY(p.jumping && c.held.jump && b.velocity.y < 0 ? -1100 : 0);
        if (b.velocity.y > 950) b.setVelocityY(950);

        // the screen never scrolls back, so its left edge is a wall
        const cam = this.cameras.main;
        if (b.left < cam.scrollX) { p.x += cam.scrollX - b.left; if (b.velocity.x < 0) b.setVelocityX(0); }

        if (p.size === 2 && c.pressed.run && this.fireballs.countActive(true) < 2) this.shoot();

        let frame = 'stand';
        if (now < p.throwUntil) frame = 'throw';
        else if (!onGround) frame = 'jump';
        else if (p.skidding) frame = 'skid';
        else if (Math.abs(vx) > 10) {
            p.animT += Math.abs(vx) * s;
            frame = ['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(p.animT / 34) % 4];
        }
        p.setFrame(frame);
        p.setFlipX(p.facing < 0);

        if (p.star > now) {
            p.setTint([0xffffff, 0xff8080, 0xfff080, 0x80ff80][Math.floor(now / 70) % 4]);
        } else {
            if (this.starOn) { this.starOn = false; Sound.music(this.L.music); Sound.setRate(this.timeLeft <= 100 ? 1.25 : 1); }
            p.clearTint();
        }
        p.setAlpha(p.inv > now ? (Math.floor(now / 60) % 2 ? 0.3 : 1) : 1);

        if (b.bottom > GROUND * T + 30) this.die(true);
        else if (this.pole && b.right >= this.pole.x - 26) this.finishFlag();
    }

    shoot() {
        const p = this.player;
        const f = this.physics.add.sprite(p.x + p.facing * 22, p.y - 56, 'fireball').setDepth(19);
        this.fireballs.add(f);
        f.body.setCircle(9, 3, 4);
        f.body.setVelocity(p.facing * 560, 250);
        p.throwUntil = this.clock + 150;
        Sound.play('fire');
    }

    onPlayerTile(tile) {
        const b = this.player.body;
        if (b.blocked.up && tile.pixelY + T <= b.top + 3) this.headHits.push(tile);
    }

    processHeadHits() {
        if (!this.headHits.length) return;
        const px = this.player.x;
        let best = null, bd = 1e9;
        for (const t of this.headHits) {
            const d = Math.abs(t.pixelX + T / 2 - px);
            if (d < bd) { bd = d; best = t; }
        }
        this.headHits.length = 0;
        if (best && this.mode === 'play') this.hitBlock(best);
    }

    hurt() {
        const p = this.player;
        if (p.dead || this.mode !== 'play' || p.inv > this.clock || p.star > this.clock) return;
        if (p.size > 0) {
            Sound.play('shrink');
            this.setPower(0);
            p.inv = this.clock + 2200;
        } else this.die(false);
    }

    die(fell) {
        const p = this.player;
        if (p.dead) return;
        p.dead = true;
        this.mode = 'dead';
        Sound.stopMusic();
        Sound.play('die');
        p.body.enable = false;
        p.clearTint(); p.setAlpha(1);
        if (!fell) {
            p.setFrame('dead');
            this.tweens.add({ targets: p, y: p.y - 150, duration: 450, delay: 450, ease: 'Quad.out',
                onComplete: () => this.tweens.add({ targets: p, y: VH + 160, duration: 900, ease: 'Quad.in' }) });
        }
        this.time.delayedCall(3300, () => {
            this.st.lives--;
            this.st.power = 0;
            this.scene.start(this.st.lives <= 0 ? 'GameOver' : 'Intro');
        });
    }

    // ---- blocks -------------------------------------------------------------------------------
    hitBlock(tile) {
        const p = this.player, tx = tile.x, ty = tile.y, idx = tile.index, key = tx + ',' + ty;
        const content = this.L.contents[key];
        if (this.bumping && this.bumping[key]) return;
        this.bumpAbove(tx, ty);
        if (idx === TILE.Q || (idx === TILE.BRICK && content)) {
            if (content === 'multi') {
                this.popCoin(tx, ty);
                const m = this.multi[key] || (this.multi[key] = { left: 10, until: this.clock + 4000 });
                m.left--;
                const last = m.left <= 0 || this.clock > m.until;
                if (last) delete this.L.contents[key];
                this.bumpTile(tile, last ? TILE.USED : TILE.BRICK);
                return;
            }
            delete this.L.contents[key];
            if (content === 'power') this.spawnItem(p.size === 0 ? 'kobasica' : 'paprika', tx, ty);
            else if (content === 'heart') this.spawnItem('srce', tx, ty);
            else this.popCoin(tx, ty);
            this.bumpTile(tile, TILE.USED);
        } else if (idx === TILE.BRICK) {
            if (p.size > 0) this.breakBrick(tile);
            else { this.bumpTile(tile, TILE.BRICK); Sound.play('bump'); }
        } else Sound.play('bump');
    }

    bumpTile(tile, newIdx) {
        const tx = tile.x, ty = tile.y, key = tx + ',' + ty;
        this.bumping = this.bumping || {};
        this.bumping[key] = true;
        tile.setVisible(false);
        const img = this.add.image(tile.pixelX + T / 2, tile.pixelY + T / 2, this.tilesKey, tile.index).setDepth(11);
        this.tweens.add({ targets: img, y: img.y - 14, duration: 90, yoyo: true, onComplete: () => {
            img.destroy();
            const t = this.layer.putTileAt(newIdx, tx, ty);
            t.setVisible(true);
            delete this.bumping[key];
        } });
    }

    breakBrick(tile) {
        const cx = tile.pixelX + T / 2, cy = tile.pixelY + T / 2;
        this.layer.removeTileAt(tile.x, tile.y);
        Sound.play('break');
        this.addScore(50);
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 0], [1, 0]]) {
            const d = this.add.image(cx + dx * 10, cy + dy * 10, 'debris').setDepth(21);
            if (this.L.theme === 'castle' || this.L.theme === 'cellar') d.setTint(0xa08070);
            const vx = dx * 160, vy = dy ? -620 : -400;
            this.tweens.addCounter({ from: 0, to: 1, duration: 1200, onUpdate: tw => {
                const t = tw.getValue() * 1.2;
                d.x = cx + dx * 10 + vx * t; d.y = cy + dy * 10 + vy * t + 1200 * t * t; d.angle += 12;
            }, onComplete: () => d.destroy() });
        }
    }

    bumpAbove(tx, ty) {
        const top = ty * T, l = tx * T, r = l + T;
        for (const e of this.enemies.getChildren()) {
            if (e.dead || !e.awake) continue;
            if (Math.abs(e.body.bottom - top) < 10 && e.body.right > l && e.body.left < r) this.flipKill(e, true);
        }
        for (const c of this.coinGroup.getChildren().slice()) if (Math.abs(c.x - (l + T / 2)) < 10 && Math.abs(c.y - (top - T / 2)) < 10) this.takeCoin(c);
        for (const it of this.items.getChildren()) if (!it.emerging && Math.abs(it.body.bottom - top) < 10 && it.body.right > l && it.body.left < r) it.body.setVelocityY(-450);
    }

    popCoin(tx, ty) {
        const c = this.add.sprite(tx * T + T / 2, ty * T - T / 2, 'coin').play('spin').setDepth(9);
        this.addCoin();
        this.tweens.add({ targets: c, y: c.y - 110, duration: 260, ease: 'Quad.out', yoyo: true, hold: 0, onComplete: () => {
            this.popup('200', c.x, c.y - 20);
            c.destroy();
        } });
        this.addScore(200, null, null, true);
    }

    addCoin() {
        this.st.coins++;
        Sound.play('coin');
        if (this.st.coins >= 100) { this.st.coins -= 100; this.oneUp(this.player.x, this.player.y - 100); }
    }

    takeCoin(c) {
        if (!c.active) return;
        c.destroy();
        this.addCoin();
        this.addScore(200, null, null, true);
    }

    oneUp(x, y) {
        this.st.lives++;
        Sound.play('oneup');
        this.popup('+1 ŽIVOT', x, y, '#7ae060');
    }

    spawnItem(kind, tx, ty) {
        const it = this.physics.add.sprite(tx * T + T / 2, (ty + 1) * T, kind).setOrigin(0.5, 1).setDepth(9);
        this.items.add(it);
        it.body.setSize(36, 40, false); it.body.setOffset(6, 8);
        it.kind = kind; it.emerging = true; it.dir = 1;
        it.body.enable = false;
        Sound.play('item');
        this.tweens.add({ targets: it, y: ty * T, duration: 700, onComplete: () => {
            if (!it.active) return;
            it.emerging = false;
            it.body.enable = true;
            it.body.reset(it.x, it.y);
            it.setDepth(15);
        } });
    }

    collect(it) {
        if (it.emerging || !it.active || this.mode !== 'play') return;
        const p = this.player, kind = it.kind;
        it.destroy();
        this.addScore(1000, p.x, p.y - (p.size ? 100 : 50));
        if (kind === 'kobasica') { if (p.size === 0) this.grow(1); else Sound.play('power'); }
        else if (kind === 'paprika') { if (p.size < 2) this.grow(p.size + 1); else Sound.play('power'); }
        else if (kind === 'srce') {
            p.star = this.clock + 10000;
            this.starOn = true;
            Sound.play('power');
            Sound.music('zvijezda');
        }
    }

    // ---- enemies ------------------------------------------------------------------------------
    touchEnemy(e) {
        const p = this.player;
        if (this.mode !== 'play' || p.dead || e.dead || !e.awake) return;
        if (p.star > this.clock) { this.flipKill(e, true); return; }
        const stomp = p.body.velocity.y > 0 && p.prevBottom <= e.prevTop + 14;
        if (stomp && e.kind !== 'hedgehog') { this.stomp(e); return; }
        if (e.kind === 'snail' && e.state === 'shell') { this.kickShell(e, p.x < e.x ? 1 : -1); return; }
        if (e.kind === 'snail' && e.state === 'slide' && this.clock < e.safeUntil) return;
        this.hurt();
    }

    stomp(e) {
        const p = this.player;
        p.body.setVelocityY(this.ctrl.held.jump ? -780 : -470);
        p.jumping = true;
        const pts = STOMP_SCORES[Math.min(this.combo, STOMP_SCORES.length - 1)];
        this.combo++;
        Sound.play('stomp');
        if (e.kind === 'snail') {
            if (e.state === 'shell') { this.kickShell(e, p.x < e.x ? 1 : -1); return; }
            e.state = 'shell'; e.shellT = this.clock;
            e.setFrame('shell'); e.body.setVelocityX(0);
            this.addScore(pts, e.x, e.y - 50);
            return;
        }
        if (e.kind === 'goose') {
            e.dead = true;
            e.setFrame('flat');
            e.body.enable = false;
            this.time.delayedCall(500, () => e.destroy());
        } else this.flipKill(e, false);
        this.addScore(pts, e.x, e.y - 50);
    }

    kickShell(e, dir) {
        e.state = 'slide'; e.dir = dir; e.safeUntil = this.clock + 250;
        Sound.play('kick');
        this.addScore(400, e.x, e.y - 50);
    }

    flipKill(e, scored) {
        if (e.dead) return;
        e.dead = true;
        e.body.enable = false;
        e.setFlipY(true);
        if (e.kind === 'snail') e.setFrame('shell');
        Sound.play('kick');
        if (scored) this.addScore(200, e.x, e.y - 50);
        const vx = (e.x < this.player.x ? -1 : 1) * 120;
        const x0 = e.x, y0 = e.y;
        this.tweens.addCounter({ from: 0, to: 1, duration: 1400, onUpdate: tw => {
            const t = tw.getValue() * 1.4;
            e.x = x0 + vx * t; e.y = y0 - 450 * t + 1100 * t * t;
        }, onComplete: () => e.destroy() });
    }

    enemyProcess(a, b) {
        if (a.dead || b.dead || !a.awake || !b.awake) return false;
        if (a.kind === 'crow' || b.kind === 'crow') return false;
        const as = a.state === 'slide', bs = b.state === 'slide';
        if (as || bs) {
            if (as && bs) { this.flipKill(a, true); this.flipKill(b, true); }
            else this.flipKill(as ? b : a, true);
            return false;
        }
        return true;
    }

    enemyBump(a, b) {
        const d = a.x < b.x ? -1 : 1;
        a.dir = d; b.dir = -d;
    }

    updateEnemies(s) {
        const cam = this.cameras.main, now = this.clock;
        for (const e of this.enemies.getChildren().slice()) {
            if (e.dead) continue;
            if (!e.awake) {
                if (e.x < cam.scrollX + VW + 90) { e.awake = true; e.body.enable = true; }
                else continue;
            }
            if (e.y > VH + 140 || e.x < cam.scrollX - 600) { e.destroy(); continue; }
            const b = e.body;
            if (e.kind === 'crow') {
                e.t += s;
                b.setVelocity(-120, 0);
                e.y = e.baseY + Math.sin(e.t * 2.4) * 70;
                e.setFrame(Math.floor(now / 160) % 2 ? 'fly1' : 'fly2');
                e.setFlipX(true);
                continue;
            }
            if (b.blocked.left || b.touching.left) {
                if (e.state === 'slide' && e.dir < 0) this.shellWall(e);
                e.dir = 1;
            } else if (b.blocked.right || b.touching.right) {
                if (e.state === 'slide' && e.dir > 0) this.shellWall(e);
                e.dir = -1;
            }
            let speed = { goose: 75, snail: 45, hedgehog: 62 }[e.kind];
            if (e.kind === 'snail' && e.state === 'shell') {
                speed = 0;
                const age = now - e.shellT;
                if (age > 7000) { e.state = 'walk'; e.setFrame('walk1'); e.setAngle(0); }
                else if (age > 5800) e.setAngle(Math.sin(now / 30) * 10);
            } else if (e.kind === 'snail' && e.state === 'slide') {
                speed = 560;
                e.setAngle(0);
            } else {
                e.setFrame(Math.floor(now / 180) % 2 ? 'walk1' : 'walk2');
            }
            b.setVelocityX(e.dir * speed);
            if (e.state !== 'shell' && e.state !== 'slide') e.setFlipX(e.dir < 0);
        }
        for (const e of this.enemies.getChildren()) e.prevTop = e.body.top;
    }

    shellWall(e) {
        const cam = this.cameras.main;
        if (e.x > cam.scrollX && e.x < cam.scrollX + VW) Sound.play('bump');
    }

    // ---- items, fire, platforms, firebars -----------------------------------------------------
    updateItems(s) {
        const cam = this.cameras.main;
        for (const it of this.items.getChildren().slice()) {
            if (it.emerging) continue;
            if (it.y > VH + 100 || it.x < cam.scrollX - 200) { it.destroy(); continue; }
            const b = it.body;
            if (b.blocked.left) it.dir = 1; else if (b.blocked.right) it.dir = -1;
            if (it.kind === 'kobasica') b.setVelocityX(it.dir * 130);
            else if (it.kind === 'srce') {
                b.setVelocityX(it.dir * 170);
                if (b.blocked.down) b.setVelocityY(-560);
                it.angle = Math.sin(this.clock / 120) * 12;
            } else b.setVelocityX(0);
        }
    }

    updateFireballs() {
        const cam = this.cameras.main;
        for (const f of this.fireballs.getChildren().slice()) {
            const b = f.body;
            f.angle += 24;
            if (b.blocked.down) b.setVelocityY(-420);
            if (b.blocked.left || b.blocked.right || f.x < cam.scrollX - 40 || f.x > cam.scrollX + VW + 40 || f.y > VH + 40) this.poof(f);
        }
        for (const h of this.hazards.getChildren().slice()) if (h.x < cam.scrollX - 120 || h.x > cam.scrollX + VW + 120) h.destroy();
    }

    poof(f) {
        const x = f.x, y = f.y;
        f.destroy();
        const b = this.add.image(x, y, 'ember').setDepth(21);
        this.tweens.add({ targets: b, scale: 2.2, alpha: 0, duration: 200, onComplete: () => b.destroy() });
    }

    fireHit(f, e) {
        if (!f.active || e.dead || !e.awake) return;
        this.poof(f);
        this.flipKill(e, true);
    }

    updatePlatforms() {
        for (const pl of this.platforms.getChildren()) {
            if (pl.axis === 'x') {
                if (pl.x <= pl.min) pl.body.setVelocityX(pl.speed);
                else if (pl.x >= pl.max) pl.body.setVelocityX(-pl.speed);
            } else if (pl.axis === 'y') {
                if (pl.y <= pl.min) pl.body.setVelocityY(pl.speed);
                else if (pl.y >= pl.max) pl.body.setVelocityY(-pl.speed);
            }
        }
    }

    updateFirebars(s) {
        const b = this.player.body, cam = this.cameras.main;
        for (const fb of this.firebars) {
            fb.a += fb.speed * s;
            if (fb.cx < cam.scrollX - 400 || fb.cx > cam.scrollX + VW + 400) continue;
            fb.parts.forEach((part, i) => {
                part.setPosition(fb.cx + Math.cos(fb.a) * i * 16, fb.cy + Math.sin(fb.a) * i * 16);
                if (this.mode !== 'play' || this.player.dead) return;
                const qx = Phaser.Math.Clamp(part.x, b.left, b.right), qy = Phaser.Math.Clamp(part.y, b.top, b.bottom);
                if ((part.x - qx) ** 2 + (part.y - qy) ** 2 < 64) this.hurt();
            });
        }
    }

    // ---- boss ---------------------------------------------------------------------------------
    updateBoss() {
        const B = this.boss;
        if (!B || !B.active) return;
        if (B.dead) { if (B.y > VH + 200) B.destroy(); return; }
        const now = this.clock, cam = this.cameras.main;
        if (B.y > VH + 100) { B.dead = true; return; }
        if (!B.awake) {
            if (B.x < cam.scrollX + VW - 40) { B.awake = true; B.nextFire = now + 1200; B.nextJump = now + 2500; }
            else return;
        }
        const onG = B.body.blocked.down;
        if (this.mode !== 'play') {
            B.body.setVelocityX(0);
            B.setFrame(onG ? 'stand' : 'jump');
            return;
        }
        if (now > B.nextMove) { B.dir = Math.random() < 0.5 ? -1 : 1; B.nextMove = now + 700 + Math.random() * 900; }
        if (B.x < B.x0) B.dir = 1; else if (B.x > B.x1) B.dir = -1;
        B.body.setVelocityX(B.dir * 70);
        if (onG && now > B.nextJump) { B.body.setVelocityY(-640); B.nextJump = now + 2200 + Math.random() * 1800; }
        const facingLeft = this.player.x < B.x;
        if (now > B.nextFire) {
            const groundTop = 11 * T;
            const y = Math.random() < 0.5 ? groundTop - 28 : groundTop - 92;
            const f = this.physics.add.sprite(B.x + (facingLeft ? -50 : 50), y, 'bossfire').setDepth(19).setFlipX(!facingLeft);
            this.hazards.add(f);
            f.body.setSize(56, 16, false); f.body.setOffset(8, 7);
            f.body.setVelocityX(facingLeft ? -270 : 270);
            B.nextFire = now + 1700 + Math.random() * 1300;
            B.throwUntil = now + 380;
            Sound.play('bossfire');
        }
        let frame = 'stand';
        if (now < B.throwUntil) frame = 'throw';
        else if (!onG) frame = 'jump';
        else frame = ['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(now / 140) % 4];
        B.setFrame(frame);
        B.setFlipX(facingLeft);
    }

    bossHit(f) {
        const B = this.boss;
        if (!f.active || B.dead) return;
        this.poof(f);
        B.hp--;
        Sound.play('hit');
        B.setTintFill(0xffffff);
        this.time.delayedCall(90, () => B.active && B.clearTint());
        if (B.hp <= 0) {
            B.dead = true;
            B.body.enable = false;
            B.setFrame('dead').setFlipY(true);
            Sound.play('bossfall');
            this.addScore(5000, B.x, B.y - 140);
            this.tweens.add({ targets: B, y: B.y - 80, duration: 300, ease: 'Quad.out',
                onComplete: () => this.tweens.add({ targets: B, y: VH + 220, duration: 900, ease: 'Quad.in' }) });
        }
    }

    // ---- level endings ------------------------------------------------------------------------
    finishFlag() {
        if (this.mode !== 'play') return;
        this.mode = 'flag'; this.phase = 'slide';
        const p = this.player, b = p.body;
        Sound.stopMusic();
        Sound.play('flag');
        b.setVelocity(0, 0); b.setAllowGravity(false); b.setGravityY(0);
        p.clearTint(); p.setAlpha(1);
        p.x = this.pole.x - 12;
        p.setFlipX(false).setFrame('climb');
        const h = this.poleBase - b.bottom;
        const pts = h > 360 ? 5000 : h > 270 ? 2000 : h > 180 ? 800 : h > 90 ? 400 : 100;
        this.addScore(pts, this.pole.x + 40, p.y - 60);
        const dur = Math.max(250, (this.poleBase - p.y) * 2.2);
        this.tweens.add({ targets: p, y: this.poleBase, duration: dur });
        this.tweens.add({ targets: this.flag, y: this.poleBase - 60, duration: 900 });
        const t = Math.max(dur, 900);
        this.time.delayedCall(t + 250, () => { p.x = this.pole.x + 14; p.setFlipX(true); });
        this.time.delayedCall(t + 650, () => {
            p.setFlipX(false);
            b.setAllowGravity(true);
            this.phase = 'walk';
            Sound.play('clear');
        });
    }

    finishCastle() {
        if (this.mode !== 'play' || this.player.dead) return;
        this.mode = 'castle'; this.phase = 'collapse';
        const p = this.player;
        Sound.stopMusic();
        p.star = 0; p.clearTint(); p.setAlpha(1);
        p.body.setVelocityX(0);
        this.axe.destroy();
        const tiles = [];
        for (let x = this.L.width - 1; x >= 0; x--) {
            const t = this.layer.getTileAt(x, 11);
            if (t && t.index === TILE.BRIDGE) tiles.push(x);
        }
        tiles.forEach((x, i) => this.time.delayedCall(80 + i * 70, () => { this.layer.removeTileAt(x, 11); Sound.play('bridge'); }));
        const endT = 80 + tiles.length * 70;
        this.time.delayedCall(endT + 200, () => {
            const B = this.boss;
            if (B && B.active && !B.dead) {
                B.dead = true;
                B.setFrame('dead');
                Sound.play('bossfall');
                this.addScore(5000, B.x, B.y - 140);
            }
        });
        this.time.delayedCall(endT + 1600, () => { this.phase = 'walk'; Sound.play('clear'); });
    }

    updateAuto(s) {
        const p = this.player, b = p.body;
        if (this.phase === 'collapse' || this.phase === 'slide') {
            if (this.phase === 'collapse') { b.setVelocityX(0); if (b.blocked.down) p.setFrame('stand'); }
            return;
        }
        if (this.phase === 'walk') {
            const target = this.mode === 'flag' ? this.house.x : this.regica.x - 64;
            b.setVelocityX(160);
            p.animT += 160 * s;
            p.setFrame(b.blocked.down ? ['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(p.animT / 34) % 4] : 'jump');
            p.setFlipX(false);
            if (p.x >= target) {
                b.setVelocityX(0);
                if (this.mode === 'flag') {
                    p.setVisible(false);
                    this.phase = 'bonus';
                    this.time.delayedCall(400, () => this.countBonus(() => this.nextLevel()));
                } else {
                    this.phase = 'talk';
                    p.setFrame('stand');
                    this.regica.setFrame('happy');
                    this.speech('Dudek, moj junače!\nHvala ti kaj si me spasil!', this.regica.x, this.regica.y - 120);
                    this.time.addEvent({ delay: 400, repeat: 8, callback: () => {
                        const h = this.add.image((p.x + this.regica.x) / 2, p.y - 90, 'heart_small').setDepth(30);
                        this.tweens.add({ targets: h, y: h.y - 120, x: h.x + Phaser.Math.Between(-40, 40), alpha: 0, duration: 1600, onComplete: () => h.destroy() });
                    } });
                    this.time.delayedCall(3500, () => this.countBonus(() => this.scene.start('Ending')));
                }
            }
        }
    }

    speech(text, x, y) {
        const t = this.add.text(x, y, text, txt(24, '#cc2028', '#f8f2e2', 2)).setOrigin(0.5, 1).setDepth(41);
        const g = this.add.graphics().setDepth(40);
        const w = t.width + 30, h = t.height + 20;
        const left = Math.min(x - w / 2, this.cameras.main.scrollX + VW - w - 10);
        t.x = left + w / 2;
        g.fillStyle(0xf8f2e2, 1).lineStyle(4, 0x2a1a14, 1);
        g.fillRoundedRect(left, y - h + 10, w, h, 14).strokeRoundedRect(left, y - h + 10, w, h, 14);
        g.fillTriangle(x - 10, y + 8, x + 10, y + 8, x + 4, y + 30).lineBetween(x - 10, y + 10, x + 4, y + 30).lineBetween(x + 10, y + 10, x + 4, y + 30);
    }

    countBonus(next) {
        this.st.power = this.player.size;
        let i = 0;
        const step = () => {
            if (this.timeLeft <= 0) { this.time.delayedCall(1000, next); return; }
            const n = Math.min(this.timeLeft, 4);
            this.timeLeft -= n;
            this.st.score += 50 * n;
            if (i++ % 3 === 0) Sound.play('tick');
            this.time.delayedCall(16, step);
        };
        step();
    }

    nextLevel() {
        this.st.level++;
        this.scene.start(this.st.level >= Levels.count ? 'Ending' : 'Intro');
    }

    // ---- HUD and scoring ----------------------------------------------------------------------
    makeHud() {
        const st = txt(26);
        const add = (x, s, ax = 0) => this.add.text(x, 10, s, st).setOrigin(ax, 0).setScrollFactor(0).setDepth(100).setLineSpacing(-4);
        this.hudScore = add(40, '');
        this.add.sprite(330, 58, 'coin', 'c0').setScrollFactor(0).setDepth(100).setScale(0.62).play('spin');
        this.hudCoins = add(348, '');
        this.hudWorld = add(560, 'SVIJET\n ' + this.L.world);
        this.hudTime = add(VW - 40, '', 1);
        this.pauseText = this.add.text(VW / 2, VH / 2, 'PAUZA', txt(64, '#f2b62a')).setOrigin(0.5).setScrollFactor(0).setDepth(120).setVisible(false);
        this.updateHud();
    }

    updateHud() {
        this.hudScore.setText('DUDEK\n' + String(this.st.score).padStart(6, '0'));
        this.hudCoins.setText('\n×' + String(this.st.coins).padStart(2, '0'));
        this.hudTime.setText('VRIJEME\n' + String(Math.max(0, this.timeLeft)).padStart(3, ' '));
    }

    addScore(v, x, y, silent) {
        this.st.score += v;
        if (!silent && x !== null && x !== undefined) this.popup(String(v), x, y);
    }

    popup(s, x, y, color = '#ffffff') {
        const t = this.add.text(x, y, s, txt(22, color, '#2a1a14', 5)).setOrigin(0.5).setDepth(60);
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, delay: 200, onComplete: () => t.destroy() });
    }

    togglePause() {
        this.paused = !this.paused;
        this.pauseText.setVisible(this.paused);
        if (this.paused) {
            this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true;
            Sound.stopMusic(); Sound.play('pause');
        } else {
            this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false;
            Sound.music(this.starOn ? 'zvijezda' : this.L.music);
            if (this.timeLeft <= 100) Sound.setRate(1.25);
        }
    }

    tickTimer(dt) {
        if (this.mode !== 'play') return;
        this.timeAcc += dt;
        while (this.timeAcc >= 400) {
            this.timeAcc -= 400;
            this.timeLeft--;
            if (this.timeLeft === 100) { Sound.play('hurry'); Sound.setRate(1.25); }
            if (this.timeLeft <= 0) { this.timeLeft = 0; this.die(false); break; }
        }
    }

    followCamera() {
        if (this.paused || this.player.dead) return;
        const cam = this.cameras.main;
        const target = Phaser.Math.Clamp(Math.round(this.player.x - VW * 0.42), 0, this.worldW - VW);
        if (target > cam.scrollX) cam.scrollX = target;
    }

    update(time, delta) {
        this.ctrl.update();
        if (this.ctrl.pressed.start && this.mode === 'play' && !this.frozen) this.togglePause();
        if (this.paused || this.frozen) return;
        const dt = Math.min(delta, 40), s = dt / 1000;
        this.clock += dt;
        this.tickTimer(dt);
        this.processHeadHits();
        if (this.mode === 'play' && !this.player.dead) this.updatePlayer(s);
        else if (this.mode === 'flag' || this.mode === 'castle') this.updateAuto(s);
        this.updateEnemies(s);
        this.updateItems(s);
        this.updateFireballs();
        this.updatePlatforms();
        this.updateFirebars(s);
        this.updateBoss();

        this.updateHud();
        if (this.player.body) this.player.prevBottom = this.player.body.bottom;
    }
}
