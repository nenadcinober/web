import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Top-down/Beat 'em up gravity is 0
            debug: false // Disable debug
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);
