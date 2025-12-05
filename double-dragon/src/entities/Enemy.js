export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'enemy') {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setOrigin(0.5, 1);

        this.setScale(0.25);
        this.body.setSize(32, 16);
        this.body.setOffset(112, 240);

        this.speed = 80;
        this.health = 30;
        this.isDead = false;
        this.isAttacking = false;
        this.target = scene.player;
    }

    update() {
        if (this.isDead || !this.target) return;

        // Depth sorting
        this.setDepth(this.y);

        if (this.isAttacking) return;

        // Simple AI: Move towards player
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
            // Attack range
            this.attack();
        } else if (dist < 400) {
            // Chase range
            this.scene.physics.moveToObject(this, this.target, this.speed);
            this.setFlipX(this.body.velocity.x < 0);
            this.play('enemy-walk', true);
        } else {
            this.body.setVelocity(0);
            this.play('enemy-idle', true);
        }
    }

    attack() {
        this.isAttacking = true;
        this.body.setVelocity(0);
        this.play('enemy-punch');

        // Hit player logic (simplified)
        this.scene.time.delayedCall(300, () => {
            if (this.isDead) return;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (dist < 50 && !this.target.isJumping) {
                // Hit player
                console.log('Player hit!');
                // this.target.takeDamage(5); // TODO: Implement player damage
            }
            this.isAttacking = false;
        });
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.health -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => this.clearTint());

        if (this.health <= 0) {
            this.die();
        } else {
            // Knockback
            const dx = this.x - this.target.x;
            this.body.setVelocityX(dx > 0 ? 100 : -100);
            this.isAttacking = true; // Stun
            this.scene.time.delayedCall(200, () => this.isAttacking = false);
        }
    }

    die() {
        this.isDead = true;
        this.body.enable = false;
        this.setTint(0x555555);
        this.play('enemy-idle'); // Or death anim
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 1000,
            onComplete: () => this.destroy()
        });
    }
}
