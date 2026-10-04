window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_W * RES,
    height: GAME_H * RES,
    backgroundColor: '#000000',
    antialias: true,
    roundPixels: true,
    input: { gamepad: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, StoryScene, GameScene, GameOverScene, EndingScene],
});
