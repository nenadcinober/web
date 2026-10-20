// Phaser bootstrap.

window.addEventListener('load', function () {
  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#05070a',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, MapScene, HudScene],
  });
});
