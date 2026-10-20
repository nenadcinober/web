// Waits for the web fonts, then starts the game.
(function () {
    const start = () => {
        window.game = new Phaser.Game({
            type: Phaser.AUTO,
            parent: 'game-container',
            width: VW,
            height: VH,
            backgroundColor: '#100a06',
            disableContextMenu: true,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            scene: [BootScene, MenuScene, AdventureScene, TownScene, HeroScreen, ExchangeScene, CombatScene],
        });
    };
    const fonts = [`16px ${FONT.split(',')[0]}`, `16px ${TFONT.split(',')[0]}`];
    if (document.fonts && document.fonts.load) {
        Promise.race([Promise.all(fonts.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]).then(start, start);
    } else start();
})();
