window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: VW,
    height: VH,
    backgroundColor: '#1a1210',
    input: { gamepad: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, GameScene],
});
