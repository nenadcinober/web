window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: VW,
    height: VH,
    backgroundColor: '#000000',
    roundPixels: true,
    // step physics once per displayed frame, so 120/144 Hz screens don't see Dudek move in
    // uneven 60 Hz hops
    physics: { default: 'arcade', arcade: { gravity: { y: 2400 }, tileBias: 40, fixedStep: false, debug: false } },
    input: { gamepad: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, StoryScene, IntroScene, GameScene, GameOverScene, EndingScene],
});
