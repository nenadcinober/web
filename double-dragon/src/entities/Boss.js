import Enemy from './Enemy.js';

export default class Boss extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'boss');
        this.health = 100; // More health
        this.speed = 60; // Slower

        this.setScale(0.35); // Slightly larger than enemies
        this.body.setSize(40, 20);
        this.body.setOffset(108, 236); // Approx center

        // Boss specific state
        this.isBoss = true;
    }

    update() {
        super.update();
        // Add boss specific logic here (e.g. smash attack)
    }

    // Override attack to be more powerful
    attack() {
        this.isAttacking = true;
        this.body.setVelocity(0);
        this.play('boss-smash'); // Assuming we add this anim

        this.scene.time.delayedCall(500, () => {
            if (this.isDead) return;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (dist < 80 && !this.target.isJumping) {
                // Heavy damage
                console.log('Boss Smash!');
                // this.target.takeDamage(20);
            }
            this.isAttacking = false;
        });
    }

    die() {
        super.die();
        this.scene.victory();
    }
}
