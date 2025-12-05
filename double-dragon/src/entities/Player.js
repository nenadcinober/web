export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setOrigin(0.5, 1);

        this.setScale(0.25); // Scale down 256x256 -> 64x64
        this.body.setSize(32, 16);
        this.body.setOffset(112, 240); // (256 - 32)/2 = 112, 256 - 16 = 240

        this.speed = 160;
        this.health = 100;
        this.isAttacking = false;

        // Z-axis (Jump) properties
        this.z = 0;
        this.zVelocity = 0;
        this.gravityZ = 600;
        this.jumpStrength = 300;
        this.isJumping = false;
        this.groundY = y; // Track where the shadow/feet are

        // Input keys
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keyPunch = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.keyKick = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyJump = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    }

    update() {
        // Handle Z-axis (Jump)
        if (this.isJumping) {
            this.zVelocity -= this.gravityZ * this.scene.game.loop.delta / 1000;
            this.z += this.zVelocity * this.scene.game.loop.delta / 1000;

            if (this.z <= 0) {
                this.z = 0;
                this.zVelocity = 0;
                this.isJumping = false;
                this.body.enable = true; // Re-enable collisions if we disabled them (optional)
            }
        } else {
            if (Phaser.Input.Keyboard.JustDown(this.keyJump)) {
                this.isJumping = true;
                this.zVelocity = this.jumpStrength;
            }
        }

        // Visual Y position = Physical Y - Z height
        // We need to store the physical Y separately because Phaser overrides this.y with physics
        // Actually, Phaser Arcade Physics updates this.y based on velocity.
        // So we should let physics handle X/Y movement, and we just offset the sprite texture?
        // No, Phaser Sprite X/Y IS the texture position.
        // Better approach: Use a container or a shadow sprite for physics, and offset the main sprite.
        // OR: Just modify body.offset.y? No, that messes up collisions.
        // Simple approach: 
        // 1. Let physics update this.y (ground position).
        // 2. In preUpdate or render, we offset the texture? No.
        // 3. Standard Top-Down Jump: The body stays on the ground. The sprite moves up.
        // But 'this' IS the sprite.
        // So: We need a Shadow sprite that follows 'this' (physics body), and 'this' (visual) is offset.
        // BUT 'this' has the physics body.
        // Solution: 'this' is the visual sprite. We manually manage the physics body position?
        // Easier: 'this' is the physics entity. We render it at y - z.
        // BUT if we change 'y', we change physics position.
        // CORRECT APPROACH: 'this' is the physics body (Shadow). We attach a child Sprite for the visual?
        // OR: We just accept that the hitbox moves up with the jump (simple platformer style) - BUT this is a beat 'em up, you can't hit enemies while jumping over them usually.
        // Let's stick to: 'this' is the player. When jumping, we offset the Y, but we need to keep the shadow/feet logic.
        // Actually, for a simple prototype, let's just move the sprite Y and disable body collision with "ground" obstacles if we had any.
        // But for depth sorting, we need Y to be the feet.
        // If Y changes, depth changes.
        // So, if I jump, my Y decreases, so I might appear BEHIND things I should be in front of.
        // FIX: this.depth = this.y + this.z;

        // Let's implement the "Visual Offset" pattern if possible, but simpler:
        // Just move the sprite.

        if (this.isAttacking) return;

        const { left, right, up, down } = this.cursors;

        this.body.setVelocity(0);

        // Movement (only if not attacking, but allowed while jumping?)
        // Classic Double Dragon: You can move while jumping? No, usually fixed arc.
        // Let's allow air control for better feel.

        if (left.isDown) {
            this.body.setVelocityX(-this.speed);
            this.setFlipX(true);
        } else if (right.isDown) {
            this.body.setVelocityX(this.speed);
            this.setFlipX(false);
        }

        if (up.isDown) {
            this.body.setVelocityY(-this.speed);
        } else if (down.isDown) {
            this.body.setVelocityY(this.speed);
        }

        // Apply Jump Offset to Visuals (Hack)
        // We can't easily separate Body and Sprite in one class without a container.
        // Let's just use the Z variable to offset the drawing? 
        // Phaser 3 doesn't have a simple "draw offset".
        // Okay, let's do the "Shadow" approach.
        // 'this' will be the visual sprite.
        // We will NOT use the body on 'this' for movement logic?
        // No, 'this' extends Sprite.
        // Let's just move the sprite Y.
        // Depth sorting: this.setDepth(this.y + this.z); (Since z is positive up, y is smaller up. Ground Y is y + z?)
        // No, if I jump (y decreases), my depth (y) decreases, so I go behind.
        // Correct depth is the "Shadow Y".
        // Shadow Y = this.y + this.z.

        // Update Depth
        this.setDepth(this.y + this.z);

        // Animations
        if (this.isJumping) {
            // this.play('player-jump', true); // Need jump anim
            this.play('player-idle', true); // Fallback
        } else if (this.isAttacking) {
            // Handled in attack method
        } else if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            this.play('player-walk', true);
        } else {
            this.play('player-idle', true);
        }

        // Attack Input
        if (Phaser.Input.Keyboard.JustDown(this.keyPunch) && !this.isAttacking && !this.isJumping) {
            this.attack('punch');
        } else if (Phaser.Input.Keyboard.JustDown(this.keyKick) && !this.isAttacking && !this.isJumping) {
            this.attack('kick');
        }
    }

    attack(type) {
        this.isAttacking = true;
        this.body.setVelocity(0);
        this.play('player-' + type);

        // Hitbox logic
        const offsetX = this.flipX ? -40 : 40;
        const hitZone = this.scene.add.rectangle(this.x + offsetX, this.y - 20, 40, 40, 0xff0000, 0); // Invisible
        this.scene.physics.add.existing(hitZone);
        hitZone.body.setAllowGravity(false);

        if (this.scene.enemies) {
            this.scene.physics.overlap(hitZone, this.scene.enemies, (zone, enemy) => {
                enemy.takeDamage(10);
            });
        }

        this.scene.time.delayedCall(300, () => {
            hitZone.destroy();
            this.isAttacking = false;
        });
    }

    takeDamage(amount) {
        if (this.health <= 0) return;

        this.health -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => this.clearTint());

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.setTint(0x555555);
        this.scene.gameOver();
    }
}
