import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Boss from '../entities/Boss.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.setBaseURL('.');
        this.load.image('background', 'assets/background.png');

        // Load as images first to process them
        this.load.image('player_src', 'assets/player.png');
        this.load.image('enemy_src', 'assets/enemy.png');
        this.load.image('boss_src', 'assets/boss.png');
    }

    create() {
        // Process textures to remove white background
        this.createTransparentTexture('player_src', 'player');
        this.createTransparentTexture('enemy_src', 'enemy');
        this.createTransparentTexture('boss_src', 'boss');

        // Background
        this.add.image(0, 0, 'background').setOrigin(0, 0).setDisplaySize(2000, 600);

        // Physics bounds - restrict to bottom half (street area)
        // Top half (0-300) is buildings, bottom half (300-600) is street
        this.physics.world.setBounds(0, 300, 2000, 300);
        this.cameras.main.setBounds(0, 0, 2000, 600);

        this.createAnimations();

        // Player - spawn in the street area
        this.player = new Player(this, 100, 450);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Enemies Group
        this.enemies = this.add.group({ runChildUpdate: true });
        this.physics.add.collider(this.player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);

        // Wave System
        this.wave = 1;
        this.waveActive = false;
        this.bossSpawned = false;

        // UI
        this.healthText = this.add.text(10, 10, 'Health: 100', { fontSize: '20px', fill: '#fff' }).setScrollFactor(0);
        this.statusText = this.add.text(400, 300, '', { fontSize: '48px', fill: '#fff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
    }

    createTransparentTexture(srcKey, destKey) {
        const src = this.textures.get(srcKey).getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = src.width;
        canvas.height = src.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // If white (or close to white), make transparent
            if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Add as sprite sheet
        this.textures.addSpriteSheet(destKey, canvas, { frameWidth: 256, frameHeight: 256 });
    }

    spawnEnemy(x, y) {
        const enemy = new Enemy(this, x, y);
        this.enemies.add(enemy);
    }

    spawnBoss(x, y) {
        const boss = new Boss(this, x, y);
        this.enemies.add(boss);
        this.bossSpawned = true;
    }

    createAnimations() {
        // Player (Row 1: Idle, Row 2: Walk, Row 3: Punch, Row 4: Kick)
        this.anims.create({ key: 'player-idle', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'player-walk', frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'player-punch', frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'player-kick', frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }), frameRate: 12, repeat: 0 });

        // Enemy (Row 1: Idle, Row 2: Walk, Row 3: Punch, Row 4: Hit)
        this.anims.create({ key: 'enemy-idle', frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'enemy-walk', frames: this.anims.generateFrameNumbers('enemy', { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'enemy-punch', frames: this.anims.generateFrameNumbers('enemy', { start: 8, end: 11 }), frameRate: 12, repeat: 0 });

        // Boss (Row 1: Idle, Row 2: Walk, Row 3: Punch, Row 4: Smash)
        this.anims.create({ key: 'boss-idle', frames: this.anims.generateFrameNumbers('boss', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'boss-walk', frames: this.anims.generateFrameNumbers('boss', { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'boss-smash', frames: this.anims.generateFrameNumbers('boss', { start: 12, end: 15 }), frameRate: 8, repeat: 0 });
    }

    update() {
        if (this.player) {
            this.player.update();
            this.healthText.setText('Health: ' + this.player.health);
        }

        // Wave Logic
        // Wave 1: x > 400
        if (this.player.x > 400 && this.wave === 1 && !this.waveActive) {
            this.waveActive = true;
            this.spawnEnemy(600, 450);
            this.spawnEnemy(700, 400);
            // Lock camera?
            // For now, just spawn.
        }

        // Wave 2: x > 1000
        if (this.player.x > 1000 && this.wave === 1 && this.enemies.countActive() === 0) {
            this.wave = 2;
            this.waveActive = false;
        }

        if (this.player.x > 1000 && this.wave === 2 && !this.waveActive) {
            this.waveActive = true;
            this.spawnEnemy(1200, 450);
            this.spawnEnemy(1300, 380);
            this.spawnEnemy(1250, 520);
        }

        // Boss: x > 1600
        if (this.player.x > 1600 && !this.bossSpawned) {
            this.spawnBoss(1800, 450);
        }
    }

    gameOver() {
        this.statusText.setText('GAME OVER\nRefresh to try again');
        this.physics.pause();
    }

    victory() {
        this.statusText.setText('VICTORY!\nYou defeated the Boss!');
        this.physics.pause();
    }
}
