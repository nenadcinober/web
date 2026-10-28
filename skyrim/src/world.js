// The two maps: the overworld (Riverwood, Whiterun, the Throat of the World...) and the
// Bleak Falls Barrow crypt. Both are generated from fixed seeds so they never change.
const TL = { GRASS: 0, GRASS2: 1, TUNDRA: 2, TUNDRA2: 3, SNOW: 4, SNOW2: 5, DIRT: 6, COBBLE: 7, WATER: 8, ROCK: 9, SROCK: 10, WALL: 11, BRIDGE: 12, DFLOOR: 13, DFLOOR2: 14, DWALL: 15, SAND: 16 };
const SOLID_TILES = [TL.WATER, TL.ROCK, TL.SROCK, TL.WALL, TL.DWALL];
const TILE_COUNT = 17;

const World = { maps: {} };

World.build = function () {
    World.maps.world = World.genOverworld();
    World.maps.barrow = World.genBarrow();
};

const P = (tx, ty) => ({ x: tilePx(tx), y: tilePx(ty) });

World.genOverworld = function () {
    const w = 128, h = 96, SEED = 7;
    const d = [], road = [], keep = [];
    for (let y = 0; y < h; y++) { d.push(new Array(w).fill(0)); road.push(new Array(w).fill(0)); keep.push(new Array(w).fill(0)); }
    const rng = mulberry32(4242);
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y][x] = v; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? d[y][x] : TL.ROCK;
    const isSnow = (x, y) => y + (fbm(x / 8, y / 8, 3) - 0.5) * 14 < 36;
    const baseAt = (x, y) => {
        const alt = hash2(x, y, 9) < 0.5;
        if (isSnow(x, y)) return alt ? TL.SNOW : TL.SNOW2;
        if (x + (fbm(x / 10, y / 10, 5) - 0.5) * 16 > 64 && y > 34) return alt ? TL.TUNDRA : TL.TUNDRA2;
        return alt ? TL.GRASS : TL.GRASS2;
    };

    const LOC = {
        riverwood: { x: 28, y: 67, r: 9, name: 'Riverwood' },
        whiterun: { x: 104, y: 62, r: 0, name: 'Whiterun' },
        barrow: { x: 20, y: 29, r: 7, name: 'Bleak Falls Barrow' },
        watchtower: { x: 78, y: 75, r: 7, name: 'Zapadna stražarnica' },
        camp: { x: 82, y: 38, r: 7, name: 'Logor Halted Stream' },
        giants: { x: 112, y: 86, r: 7, name: 'Divovski logor' },
        hrothgar: { x: 58, y: 22, r: 7, name: 'High Hrothgar' },
        summit: { x: 64, y: 9, r: 6, name: 'Grlo svijeta' },
        helgen: { x: 28, y: 90, r: 4, name: 'Cesta za Helgen' },
    };

    // terrain: rolling noise, a ring of mountains at the edge and the Throat of the World in the north
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let e = fbm(x / 14, y / 14, SEED);
        const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (edge < 6) e += (6 - edge) * 0.09;
        const dt = dist(x, y * 1.15, 62, 15 * 1.15);
        if (dt < 30) e += (1 - dt / 30) * 0.55;
        if (e > 0.7) d[y][x] = isSnow(x, y) || y < 40 ? TL.SROCK : TL.ROCK;
        else d[y][x] = baseAt(x, y);
    }

    // the river runs south from the mountains, with sandy banks
    for (let y = 30; y < h; y++) {
        const cx = 44 + Math.sin(y / 7) * 3 + Math.sin(y / 17) * 2;
        const half = 1.2 + (y > 50 ? 0.6 : 0);
        for (let x = Math.floor(cx - half - 2); x <= Math.ceil(cx + half + 2); x++) {
            const dx = Math.abs(x - cx);
            if (dx <= half + 0.4) set(x, y, TL.WATER);
            else if (dx <= half + 1.6 && get(x, y) !== TL.WATER && get(x, y) !== TL.ROCK && get(x, y) !== TL.SROCK) set(x, y, TL.SAND);
        }
    }

    // clearings around every place
    for (const k in LOC) {
        const L = LOC[k];
        for (let y = L.y - L.r; y <= L.y + L.r; y++) for (let x = L.x - L.r; x <= L.x + L.r; x++) {
            if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
            if (dist(x, y, L.x, L.y) <= L.r + (hash2(x, y, 3) - 0.5) * 1.5) {
                const t = get(x, y);
                if (t === TL.ROCK || t === TL.SROCK) set(x, y, baseAt(x, y));
                keep[y][x] = 1;
            }
        }
    }

    // roads (a 3-wide trail) that cut through rock and cross water on bridges
    const carve = (pts, rad = 1.3) => {
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
            const n = Math.ceil(dist(ax, ay, bx, by) * 4);
            for (let s = 0; s <= n; s++) {
                const px = ax + (bx - ax) * s / n, py = ay + (by - ay) * s / n;
                for (let y = Math.floor(py - rad - 2); y <= Math.ceil(py + rad + 2); y++) for (let x = Math.floor(px - rad - 2); x <= Math.ceil(px + rad + 2); x++) {
                    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
                    const dd = dist(x, y, px, py);
                    if (dd <= rad) {
                        const t = d[y][x];
                        if (t === TL.WATER || t === TL.BRIDGE) d[y][x] = TL.BRIDGE;
                        else if (t !== TL.COBBLE) d[y][x] = TL.DIRT;
                    }
                    if (dd <= rad + 2.2) road[y][x] = 1;
                }
            }
        }
    };
    carve([[28, 95], [28, 84], [29, 76], [28, 70], [28, 66]]);
    carve([[18, 66], [40, 66]]);
    carve([[38, 66], [50, 66], [62, 64], [76, 62], [93, 62]]);
    carve([[24, 64], [24, 56], [20, 48], [17, 40], [21, 34], [20, 30]]);
    carve([[70, 63], [75, 70], [78, 74]]);
    carve([[78, 62], [81, 52], [82, 42]]);
    carve([[88, 63], [92, 72], [102, 80], [112, 85]]);
    carve([[58, 64], [57, 54], [53, 46], [55, 39], [61, 34], [57, 29], [58, 24]], 1.4);
    carve([[58, 24], [64, 23.5], [67, 18], [66, 14], [62, 12], [64, 10]], 1.4);

    // Whiterun: walls, a gate on the west, cobbled streets inside
    const WR = { x0: 92, y0: 50, x1: 117, y1: 74 };
    for (let y = WR.y0; y <= WR.y1; y++) for (let x = WR.x0; x <= WR.x1; x++) {
        const border = x === WR.x0 || x === WR.x1 || y === WR.y0 || y === WR.y1;
        d[y][x] = border ? TL.WALL : (hash2(x, y, 2) < 0.5 ? TL.GRASS : TL.GRASS2);
        keep[y][x] = 1; road[y][x] = 1;
    }
    const cob = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) d[y][x] = TL.COBBLE; };
    cob(WR.x0, 61, 110, 63);       // gate street
    cob(107, 56, 110, 63);         // up to Dragonsreach
    cob(99, 63, 101, 72);          // south lane
    cob(101, 70, 115, 71);
    cob(112, 61, 114, 70);
    for (let x = WR.x0 - 3; x < WR.x0; x++) for (let y = 61; y <= 63; y++) d[y][x] = TL.DIRT;

    // the summit is a bare snowfield
    for (let y = 4; y <= 14; y++) for (let x = 58; x <= 70; x++) if (dist(x, y, 64, 9) < 5.5) set(x, y, hash2(x, y, 1) < 0.5 ? TL.SNOW : TL.SNOW2);

    // trees and bushes
    const trees = [];
    const nearLoc = (x, y) => Object.values(LOC).some(L => dist(x, y, L.x, L.y) < L.r + 1.5);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const t = d[y][x];
        if (road[y][x] || keep[y][x] || nearLoc(x, y)) continue;
        if (![TL.GRASS, TL.GRASS2, TL.TUNDRA, TL.TUNDRA2, TL.SNOW, TL.SNOW2].includes(t)) continue;
        if (SOLID_TILES.includes(get(x, y + 1))) continue;
        const forest = fbm(x / 9, y / 9, 99);
        const snow = t === TL.SNOW || t === TL.SNOW2, tundra = t === TL.TUNDRA || t === TL.TUNDRA2;
        let p = snow ? (forest > 0.55 ? 0.22 : 0.05) : tundra ? 0.025 : (forest > 0.5 ? 0.38 : 0.07);
        const r = rng();
        const px = tilePx(x) + (rng() - 0.5) * 16, py = tilePx(y) + (rng() - 0.5) * 12;
        if (r < p) {
            const kind = snow ? 'pine_snow' : tundra ? (rng() < 0.5 ? 'aspen' : 'bush') : (rng() < 0.62 ? 'pine' : 'aspen');
            trees.push({ t: kind, x: px, y: py });
        } else if (r < p + (tundra ? 0.05 : 0.025)) {
            trees.push({ t: snow ? 'rock_s' : rng() < 0.5 ? 'bush' : 'stone', x: px, y: py, deco: true });
        }
    }

    const objs = [], npcs = [], foes = [];
    const O = (t, tx, ty, extra) => objs.push(Object.assign({ t }, P(tx, ty), extra || {}));
    // Riverwood
    O('house', 20, 64); O('forge', 28, 64.2); O('shop', 35, 64.2, { label: 'Trgovina Riverwood' });
    O('inn', 23, 73, { label: 'Spavajući div' }); O('house', 33, 73); O('house', 15, 70);
    O('campfire', 29, 69.5); O('chest', 17, 67, { id: 'rw_chest', loot: { gold: 25, potion_sp: 1 } });
    // Whiterun
    O('dragonsreach', 108.5, 55.6); O('gildergreen', 103.5, 59.6);
    O('forge', 97, 60.3, { label: 'Ratna djeva' }); O('shop', 113, 60, { label: 'Arcadijin kotlić' });
    O('house', 104, 69.6); O('house', 109.5, 69.6); O('inn', 96, 72.6, { label: 'Zastavna kobila' });
    O('house', 99, 56.8);
    O('torch_post', 93, 60); O('torch_post', 93, 64.6); O('torch_post', 107, 63.8); O('torch_post', 111, 63.8);
    // Bleak Falls Barrow
    O('barrow', 20, 28, { door: { to: 'barrow', x: tilePx(8), y: tilePx(25) }, label: 'Bleak Falls Barrow' });
    O('tent', 16, 33); O('campfire', 19, 33.5); O('chest', 24, 33, { id: 'bfb_out', loot: { gold: 40, arrows: 15 } });
    // Western Watchtower
    O('watchtower', 78, 74.5);
    // Halted Stream bandit camp
    O('tent', 79, 37); O('tent', 85.5, 37.5); O('campfire', 82, 39.6); O('chest', 82, 35.8, { id: 'camp_chest', loot: { gold: 120, potion_hp: 2, steel_armor: 1 } });
    // giants
    O('tent_big', 113, 84); O('campfire', 110, 87);
    // High Hrothgar, the summit
    O('hrothgar', 58, 20.6, { label: 'High Hrothgar' });
    O('wordwall', 64, 6.4, { label: 'Zid riječi' });
    O('chest', 66.5, 7.5, { id: 'summit_chest', loot: { gold: 300, potion_hp: 3 } });
    // a few wayside things
    O('stone_big', 50, 72); O('chest', 47, 82, { id: 'river_chest', loot: { gold: 30, potion_mp: 1 } });
    O('chest', 36, 40, { id: 'snow_chest', loot: { gold: 60, potion_hp: 1, arrows: 15 } });
    O('shrine', 73, 60.6, { label: 'Svetište Talosa' });
    O('sign', 57.5, 66.2, { label: 'Putokaz: Whiterun ⟶, ⟵ Riverwood, ↑ High Hrothgar' });

    const N = (id, tx, ty, wander = 0) => npcs.push(Object.assign({ id, wander: wander * TS }, P(tx, ty)));
    N('alvor', 28, 65.3); N('lucan', 35, 65.3); N('sven', 24, 68, 2); N('gerdur', 31, 68.5, 2); N('camilla', 34, 66.6, 1);
    N('jarl', 108.5, 57.4); N('irileth', 110.6, 57.6); N('farengar', 106.2, 57.6);
    N('adrianne', 97, 61); N('arcadia', 113, 60.8); N('nazeem', 104, 65, 3); N('heimskr', 103.5, 61.2);
    N('guard', 94, 60.2); N('guard', 94, 64.4); N('guard', 106, 66, 4); N('guard', 113, 66, 3);
    N('arngeir', 58, 21.6); N('paarthurnax', 64, 8.4);

    const F = (k, tx, ty, extra) => foes.push(Object.assign({ k }, P(tx, ty), extra || {}));
    // Barrow approach
    F('bandit', 17, 31); F('bandit', 23, 31.5); F('archer', 22, 27.5); F('archer', 16, 28);
    // Halted Stream
    F('bandit', 79, 39); F('bandit', 85, 40); F('archer', 86, 36); F('archer', 78, 36); F('chief', 82, 37.5, { uid: 'chief' });
    // wildlife
    [[35, 55], [50, 74], [14, 54], [44, 88], [66, 82], [18, 80], [55, 58], [38, 78], [67, 73]].forEach(([x, y]) => { F('wolf', x, y); F('wolf', x + 1.5, y + 1); });
    [[40, 30], [30, 42], [72, 30], [88, 24]].forEach(([x, y]) => F('sabre', x, y));
    F('troll', 54, 40); F('troll', 60, 32); F('troll', 63, 16);
    F('skeever', 46, 64); F('skeever', 47, 63);
    F('giant', 112, 87, { uid: 'giant' });
    F('bandit', 66, 70); F('archer', 64, 71); F('bandit', 96, 82);

    return { id: 'world', name: 'Skyrim', w, h, data: d, trees, objs, npcs, foes, locs: LOC, dark: false, spawn: P(28, 84) };
};

World.genBarrow = function () {
    const w = 80, h = 54;
    const d = [];
    for (let y = 0; y < h; y++) d.push(new Array(w).fill(TL.DWALL));
    const rooms = [
        { x: 4, y: 20, w: 12, h: 10 },   // R0 entrance hall
        { x: 22, y: 18, w: 10, h: 8 },   // R1 skeevers
        { x: 38, y: 12, w: 14, h: 12 },  // R2 spider + Arvel
        { x: 58, y: 6, w: 14, h: 10 },   // R3 crypt
        { x: 60, y: 26, w: 14, h: 10 },  // R4 pillar puzzle
        { x: 40, y: 34, w: 14, h: 10 },  // R5 hall
        { x: 22, y: 36, w: 12, h: 8 },   // R6 claw door
        { x: 3, y: 38, w: 14, h: 12 },   // R7 boss chamber
    ];
    const inRoom = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    rooms.forEach(r => {
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) d[y][x] = hash2(x, y, 4) < 0.07 ? TL.DFLOOR2 : TL.DFLOOR;
        r.cx = Math.floor(r.x + r.w / 2); r.cy = Math.floor(r.y + r.h / 2);
    });
    const gates = [];
    // L-shaped corridors, 3 wide; remembers where the corridor enters the next room
    const corridor = (a, b, gate) => {
        const path = [];
        let x = a.cx, y = a.cy;
        while (x !== b.cx) { path.push([x, y, 1, 0]); x += Math.sign(b.cx - x); }
        while (y !== b.cy) { path.push([x, y, 0, 1]); y += Math.sign(b.cy - y); }
        path.forEach(([px, py, hx]) => {
            for (let o = -1; o <= 1; o++) {
                const cx = hx ? px : px + o, cy = hx ? py + o : py;
                if (d[cy][cx] === TL.DWALL) d[cy][cx] = TL.DFLOOR;
            }
        });
        if (gate) {
            const i = path.findIndex(([px, py]) => inRoom(b, px, py));
            const [gx, gy, hx] = path[i - 1];
            gates.push({ t: gate, x: tilePx(gx), y: tilePx(gy), vertical: !!hx });
        }
    };
    corridor(rooms[0], rooms[1]); corridor(rooms[1], rooms[2]); corridor(rooms[2], rooms[3]);
    corridor(rooms[3], rooms[4]); corridor(rooms[4], rooms[5], 'gate'); corridor(rooms[5], rooms[6]);
    corridor(rooms[6], rooms[7], 'clawdoor');

    const objs = [], foes = [], npcs = [];
    const O = (t, tx, ty, extra) => objs.push(Object.assign({ t }, P(tx, ty), extra || {}));
    gates.forEach(g => objs.push(Object.assign({ center: true, id: g.t }, g)));
    rooms.forEach(r => { O('torch', r.x + 2, r.y - 0.45); O('torch', r.x + r.w - 3, r.y - 0.45); });
    O('exitdoor', 4.5, 25.4, { door: { to: 'world', x: tilePx(20), y: tilePx(29.5) }, label: 'Izlaz iz grobnice' });
    O('web', 45, 15.4); O('urn', 59, 7.5); O('urn', 70, 7.5); O('urn', 41, 42); O('urn', 23, 37.5);
    O('sarcophagus', 61, 9); O('sarcophagus', 64, 9); O('sarcophagus', 67, 9);
    O('chest', 51, 42, { id: 'bfb_hall', loot: { gold: 80, potion_hp: 1, potion_mp: 1 } });
    O('chest', 70, 14, { id: 'bfb_crypt', loot: { gold: 45, iron_armor: 1 } });
    // the puzzle: three rotating pillars and the carvings that give the answer
    [63, 67, 71].forEach((x, i) => O('pillar', x, 28.2, { idx: i }));
    [[66, 0], [67, 0], [68, 1]].forEach(([x, s]) => O('hint', x, 26.1, { sym: s }));
    // boss chamber
    O('wordwall', 10, 39.6, { label: 'Zid riječi' });
    O('sarcophagus', 10, 43);
    O('chest', 14.5, 47.5, { id: 'dragonstone_chest', loot: { gold: 150, dragonstone: 1 } });
    O('exitdoor', 3.6, 48.4, { door: { to: 'world', x: tilePx(20), y: tilePx(29.5) }, label: 'Tajni izlaz' });

    npcs.push(Object.assign({ id: 'arvel', web: true }, P(45, 16)));
    const F = (k, tx, ty, extra) => foes.push(Object.assign({ k }, P(tx, ty), extra || {}));
    F('skeever', 25, 21); F('skeever', 28, 23); F('skeever', 29, 20);
    F('draugr', 30, 24, { sleep: true });
    F('spider', 47, 19, { uid: 'spider' });
    F('draugr', 61, 12, { sleep: true }); F('draugr', 64, 12, { sleep: true }); F('draugr', 67, 12, { sleep: true });
    F('draugr', 72, 33, { sleep: true });
    F('draugr', 44, 37, { sleep: true }); F('draugr', 50, 40, { sleep: true }); F('draugr', 46, 42, { sleep: true });
    F('draugr', 25, 41, { sleep: true }); F('draugr', 31, 38, { sleep: true });
    F('overlord', 10, 45, { uid: 'overlord', sleep: true, dormant: true });

    return { id: 'barrow', name: 'Bleak Falls Barrow', w, h, data: d, trees: [], objs, npcs, foes, locs: {}, dark: true, rooms, spawn: P(8, 25) };
};
