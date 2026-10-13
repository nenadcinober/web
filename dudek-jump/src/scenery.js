// The painted backdrop: a village at the bottom, patchwork hills behind it, and a sky that turns
// from a pale Podravina morning through a golden afternoon and a pink sunset into a starry night
// with a smiling moon as Dudek climbs.
const GROUND_SCREEN = VH - 70;
const START_SCROLL = -GROUND_SCREEN;
const FONT = '"Lilita One", Georgia, sans-serif';
const txt = (size, color = '#ffffff', stroke = '#2a1a14', thick = 6) => ({ fontFamily: FONT, fontSize: size + 'px', color, stroke, strokeThickness: thick, align: 'center' });

// metres climbed → [top colour, horizon colour]
const SKY = [
    [0, 0x9cc8d8, 0xf4ecd2],
    [300, 0x74acd6, 0xd8ecdc],
    [600, 0x8ab0d0, 0xf6e0b0],
    [850, 0xe09a58, 0xf8dc98],
    [1150, 0x8a4c8c, 0xf2906c],
    [1450, 0x2a2a62, 0x7a4a7a],
    [1750, 0x141a46, 0x2e3274],
    [3000, 0x060818, 0x1a1444],
];

function mixColor(a, b, t) {
    const ch = s => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
function skyAt(m) {
    let i = 0;
    while (i < SKY.length - 2 && m > SKY[i + 1][0]) i++;
    const [m0, t0, h0] = SKY[i], [m1, t1, h1] = SKY[i + 1];
    const t = Phaser.Math.Clamp((m - m0) / (m1 - m0), 0, 1);
    return [mixColor(t0, t1, t), mixColor(h0, h1, t)];
}
const ramp = (m, a, b) => Phaser.Math.Clamp((m - a) / (b - a), 0, 1);

class Scenery {
    constructor(scene) {
        this.scene = scene;
        this.sky = scene.add.graphics().setScrollFactor(0).setDepth(0);
        this.stars = scene.add.tileSprite(0, 0, VW, VH, 'zvijezde').setOrigin(0).setScrollFactor(0).setDepth(1);
        this.sun = scene.add.image(850, 140, 'sunce').setScrollFactor(0).setDepth(2);
        this.moon = scene.add.image(180, 150, 'mjesec').setScrollFactor(0).setDepth(2);
        this.clouds = scene.add.tileSprite(0, 0, VW, VH, 'oblaci').setOrigin(0).setScrollFactor(0).setDepth(3);
        this.hillF = 0.3;
        this.hills = scene.add.image(0, 660 + START_SCROLL * this.hillF, 'brda').setOrigin(0, 1).setScrollFactor(1, this.hillF).setDepth(4);
        this.village = scene.add.image(0, 90, 'selo').setOrigin(0, 1).setDepth(5);
        scene.add.image(0, 0, 'papir').setOrigin(0).setScrollFactor(0).setDepth(50);
        this.drift = 0;
        this.update(START_SCROLL, 0);
    }

    update(scrollY, dt) {
        const m = Math.max(0, START_SCROLL - scrollY) / 10;
        const [top, hor] = skyAt(m);
        this.sky.clear().fillGradientStyle(top, top, hor, hor, 1).fillRect(0, 0, VW, VH);
        this.drift += dt * 7;
        this.clouds.tilePositionY = scrollY * 0.35;
        this.clouds.tilePositionX = this.drift;
        this.clouds.setAlpha(1 - ramp(m, 1250, 1650) * 0.8);
        this.clouds.setTint(mixColor(0xffffff, 0x8a86b8, ramp(m, 1100, 1700)));
        this.stars.tilePositionY = scrollY * 0.06;
        this.stars.setAlpha(ramp(m, 1250, 1700));
        this.sun.setAlpha(1 - ramp(m, 1050, 1350));
        this.sun.y = 140 + ramp(m, 500, 1300) * 300;
        this.moon.setAlpha(ramp(m, 1350, 1650));
        this.moon.y = 340 - ramp(m, 1350, 1900) * 200;
    }
}
