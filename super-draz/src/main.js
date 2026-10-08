window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: VW,
    height: VH,
    backgroundColor: '#000000',
    physics: { default: 'arcade', arcade: { gravity: { y: 2400 }, tileBias: 40, debug: false } },
    input: { gamepad: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, StoryScene, IntroScene, GameScene, GameOverScene, EndingScene],
});
