// Levels are built in code on a 16-row grid of 48 px tiles. Row 14 is the usual ground top.
const TILE = { TOP: 0, DIRT: 1, BRICK: 2, Q: 3, USED: 4, HARD: 5, BTL: 6, BTR: 7, BL: 8, BR: 9, BRIDGE: 10, WALL: 12, LAVA_T: 13, LAVA: 14, WATER_T: 15, WATER: 16 };
const SOLID = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
const ROWS = 16, GROUND = 14;

class LevelBuilder {
    constructor(w, theme) {
        this.w = w; this.theme = theme;
        this.grid = Array.from({ length: ROWS }, () => new Array(w).fill(-1));
        this.contents = {}; this.objects = [];
    }
    set(x, y, t) { if (x >= 0 && x < this.w && y >= 0 && y < ROWS) this.grid[y][x] = t; return this; }
    get(x, y) { return (x >= 0 && x < this.w && y >= 0 && y < ROWS) ? this.grid[y][x] : -1; }
    fill(x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); return this; }
    ground(x0, x1, top = GROUND) { for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) this.set(x, y, y === top ? TILE.TOP : TILE.DIRT); return this; }
    water(x0, x1) { for (let x = x0; x <= x1; x++) { this.set(x, 14, TILE.WATER_T); this.set(x, 15, TILE.WATER); } return this; }
    lava(x0, x1) { for (let x = x0; x <= x1; x++) { this.set(x, 14, TILE.LAVA_T); this.set(x, 15, TILE.LAVA); } return this; }
    // B brick, ? coin block, M power-up block, H heart block, C brick with many coins,
    // S brick hiding a heart, X hard block, W castle wall, = bridge, U used block, o coin, space skips
    row(x, y, s) {
        [...s].forEach((ch, i) => {
            const X = x + i, key = X + ',' + y;
            switch (ch) {
                case 'B': this.set(X, y, TILE.BRICK); break;
                case '?': this.set(X, y, TILE.Q); this.contents[key] = 'coin'; break;
                case 'M': this.set(X, y, TILE.Q); this.contents[key] = 'power'; break;
                case 'H': this.set(X, y, TILE.Q); this.contents[key] = 'heart'; break;
                case 'C': this.set(X, y, TILE.BRICK); this.contents[key] = 'multi'; break;
                case 'S': this.set(X, y, TILE.BRICK); this.contents[key] = 'heart'; break;
                case 'X': this.set(X, y, TILE.HARD); break;
                case 'W': this.set(X, y, TILE.WALL); break;
                case '=': this.set(X, y, TILE.BRIDGE); break;
                case 'U': this.set(X, y, TILE.USED); break;
                case 'o': this.objects.push({ type: 'coin', x: X, y }); break;
            }
        });
        return this;
    }
    barrel(x, h, base = GROUND) {
        for (let i = 0; i < h; i++) {
            const y = base - 1 - i, top = i === h - 1;
            this.set(x, y, top ? TILE.BTL : TILE.BL); this.set(x + 1, y, top ? TILE.BTR : TILE.BR);
        }
        return this;
    }
    stairs(x, n, dir = 1, base = GROUND) {
        for (let i = 0; i < n; i++) {
            const h = dir > 0 ? i + 1 : n - i;
            for (let j = 0; j < h; j++) this.set(x + i, base - 1 - j, TILE.HARD);
        }
        return this;
    }
    coins(x, y, n) { for (let i = 0; i < n; i++) this.objects.push({ type: 'coin', x: x + i, y }); return this; }
    add(type, x, y = GROUND - 1, extra = {}) { this.objects.push({ type, x, y, ...extra }); return this; }
    // decorations stand on the ground wherever there is open grass
    decorate(seed, kinds, every = 9) {
        const rnd = Art.rng(seed);
        for (let x = 4; x < this.w - 12; x += every + Math.floor(rnd() * 6)) {
            const kind = kinds[Math.floor(rnd() * kinds.length)];
            const wTiles = { plot: 3, grm: 2, plast: 2 }[kind] || 1;
            let ok = true;
            for (let i = 0; i < wTiles; i++) if (this.get(x + i, GROUND) !== TILE.TOP || this.get(x + i, GROUND - 1) !== -1) ok = false;
            if (ok) this.objects.push({ type: 'decor', kind, x, y: GROUND - 1 });
        }
        return this;
    }
    done(meta) {
        return { ...meta, theme: this.theme, width: this.w, grid: this.grid, contents: this.contents, objects: this.objects };
    }
}

const Levels = (() => {
    function selo() {
        const L = new LevelBuilder(214, 'village');
        L.ground(0, 68).ground(71, 85).ground(89, 152).ground(155, 213);
        L.row(16, 10, '?');
        L.row(20, 10, 'B?BMB').row(22, 6, '?');
        L.add('goose', 24);
        L.barrel(29, 2).barrel(39, 3).add('goose', 42).barrel(47, 4).add('goose', 51).add('goose', 53).barrel(58, 4);
        L.coins(62, 9, 3).row(65, 10, 'B?B');
        L.row(78, 10, 'BMB').row(81, 6, 'BBBBBBBB').add('goose', 82, 5).add('goose', 85, 5);
        L.row(92, 6, 'BBB?').row(95, 10, 'C').add('snail', 98);
        L.row(101, 10, 'BS');
        L.row(107, 10, '?').row(110, 10, '?').row(110, 6, 'M').row(113, 10, '?');
        L.add('goose', 104).add('goose', 106);
        L.row(119, 10, 'B').row(122, 6, 'BBB').add('goose', 117).add('goose', 120);
        L.row(128, 6, 'B??B').row(129, 10, 'BB').add('snail', 126).add('goose', 131);
        L.stairs(135, 4, 1).stairs(141, 4, -1);
        L.stairs(148, 4, 1).fill(152, 10, 152, 13, TILE.HARD);
        L.stairs(155, 4, -1);
        L.barrel(164, 2).row(169, 10, 'BB?B').add('goose', 172).add('goose', 174).barrel(180, 2);
        L.stairs(182, 8, 1).fill(190, 6, 190, 13, TILE.HARD);
        L.set(199, 13, TILE.HARD).add('pole', 199, 13).add('house', 205);
        L.decorate(17, ['grm', 'plot', 'suncokret', 'plast', 'grm'], 8);
        return L.done({ name: 'SELO GRUNTOVEC', world: '1-1', music: 'polka', time: 300, start: 3 });
    }

    function podrum() {
        const L = new LevelBuilder(196, 'cellar');
        L.ground(0, 79).ground(82, 117).ground(121, 150).ground(153, 195);
        L.fill(0, 2, 0, 13, TILE.WALL).fill(6, 2, 165, 2, TILE.BRICK);
        L.row(10, 10, 'M????');
        L.add('snail', 17).add('hedgehog', 20).add('snail', 22);
        L.fill(26, 12, 26, 13, TILE.BRICK).fill(28, 10, 28, 13, TILE.BRICK).fill(30, 8, 30, 13, TILE.BRICK)
         .fill(32, 8, 32, 13, TILE.BRICK).fill(34, 10, 34, 13, TILE.BRICK);
        L.coins(28, 9, 1).coins(30, 7, 1).coins(32, 7, 1).coins(34, 9, 1);
        L.add('hedgehog', 37);
        L.row(40, 6, 'BBBBBB').row(40, 10, 'BCB').coins(41, 5, 4);
        L.row(46, 8, 'BBBBBBBBBB').row(46, 10, 'BBBBBBBBBB').set(46, 9, TILE.BRICK).set(55, 9, TILE.BRICK).coins(47, 9, 8);
        L.add('snail', 50).add('snail', 60).add('hedgehog', 64);
        L.barrel(66, 3).add('hedgehog', 70).barrel(72, 2);
        L.row(86, 10, 'BBBB').row(88, 6, 'BMBB').row(95, 10, 'C').row(98, 7, 'XXXX').coins(98, 6, 4);
        L.add('hedgehog', 92).add('hedgehog', 100).add('snail', 104).add('snail', 108).barrel(110, 3);
        L.row(127, 10, 'B?B?B').row(129, 6, 'H');
        L.add('hedgehog', 133).add('snail', 136).barrel(140, 4).barrel(146, 2);
        L.row(156, 9, 'BBBBB').coins(156, 8, 5).add('hedgehog', 160);
        L.stairs(170, 5, 1).fill(175, 9, 175, 13, TILE.HARD);
        L.set(186, 13, TILE.HARD).add('pole', 186, 13).add('house', 190);
        L.decorate(23, ['bacvica'], 11);
        return L.done({ name: 'VINSKI PODRUM', world: '1-2', music: 'podrum', time: 300, start: 3 });
    }

    function drava() {
        const L = new LevelBuilder(200, 'river');
        L.water(0, 199);
        L.ground(0, 15).row(9, 10, '?B?');
        L.add('log', 18, 11, { w: 3 }).add('log', 23, 9, { w: 3 });
        L.ground(28, 36).add('goose', 32).barrel(35, 2);
        L.add('mlog', 39, 10, { w: 3, axis: 'x', range: 4, speed: 80 });
        L.ground(48, 58).row(50, 10, 'BMB').add('hedgehog', 55).add('crow', 60, 7);
        L.add('log', 61, 11, { w: 2 }).add('log', 65, 9, { w: 2 }).add('log', 69, 7, { w: 3 }).coins(69, 5, 3);
        L.add('mlog', 74, 9, { w: 3, axis: 'y', range: 3, speed: 70 });
        L.ground(79, 95).row(83, 10, '?C?').add('goose', 87).add('goose', 89).stairs(92, 3, 1).add('crow', 98, 6);
        L.add('mlog', 98, 8, { w: 3, axis: 'x', range: 5, speed: 100 });
        L.ground(108, 112).add('crow', 116, 5);
        L.add('log', 115, 10, { w: 3 }).add('log', 120, 8, { w: 3 }).row(121, 4, 'H');
        L.add('mlog', 125, 10, { w: 3, axis: 'y', range: 3, speed: 80 });
        L.ground(130, 150).row(134, 10, 'BBMBB').add('hedgehog', 138).add('goose', 142).add('snail', 146).add('crow', 152, 6);
        L.add('log', 153, 10, { w: 2 }).add('mlog', 157, 9, { w: 3, axis: 'x', range: 5, speed: 110 });
        L.ground(166, 199).stairs(169, 6, 1).fill(175, 8, 175, 13, TILE.HARD);
        L.set(186, 13, TILE.HARD).add('pole', 186, 13).add('house', 191);
        L.decorate(31, ['trska', 'grm', 'trska'], 5);
        return L.done({ name: 'UZ DRAVU', world: '1-3', music: 'drava', time: 300, start: 3 });
    }

    function kula() {
        const L = new LevelBuilder(170, 'castle');
        L.fill(0, 2, 169, 3, TILE.WALL).fill(0, 4, 0, 13, TILE.WALL);
        L.ground(0, 13).lava(14, 17).ground(18, 30).set(24, 10, TILE.USED).add('firebar', 24, 10, { len: 6, speed: 2.0 });
        L.row(28, 10, 'M');
        L.lava(31, 34).ground(35, 52).set(40, 9, TILE.USED).add('firebar', 40, 9, { len: 6, speed: -2.3 });
        L.add('hedgehog', 46).add('hedgehog', 49);
        L.fill(44, 4, 52, 7, TILE.WALL);
        L.lava(53, 58).add('mlog', 54, 10, { w: 2, axis: 'y', range: 3, speed: 90 });
        L.ground(59, 80).set(63, 10, TILE.USED).add('firebar', 63, 10, { len: 5, speed: 2.2 }).row(67, 10, '?M?');
        L.set(74, 10, TILE.USED).add('firebar', 74, 10, { len: 6, speed: -1.8 }).add('snail', 78);
        L.lava(81, 86).add('mlog', 81, 10, { w: 3, axis: 'x', range: 2, speed: 70 });
        L.ground(87, 120).stairs(90, 3, 1).fill(93, 11, 96, 13, TILE.HARD);
        L.set(101, 13, TILE.USED).add('firebar', 101, 13, { len: 5, speed: 2.6 });
        L.set(108, 9, TILE.USED).add('firebar', 108, 9, { len: 6, speed: -2.6 });
        L.add('hedgehog', 104).add('hedgehog', 112).row(113, 9, '?M?');
        L.stairs(117, 3, 1).fill(120, 11, 120, 13, TILE.HARD);
        L.lava(121, 123).lava(124, 169).ground(124, 137, 11);
        L.fill(138, 11, 155, 11, TILE.BRIDGE);
        L.ground(156, 169, 11).fill(169, 4, 169, 10, TILE.WALL);
        L.add('boss', 150, 10, { x0: 140, x1: 154 }).add('axe', 157, 10).add('regica', 164, 10);
        return L.done({ name: 'KULA CRNOG DUDEKA', world: '1-4', music: 'kula', time: 300, start: 3, castle: true });
    }

    const LIST = [selo, podrum, drava, kula];
    return { count: LIST.length, build: i => LIST[i]() };
})();
