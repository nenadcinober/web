// Random map generator. The map is cut into zones (one per player plus neutral ones) separated by
// walls of mountains and forest; zones connect through guarded passages. Each zone is then filled
// with towns, mines, treasure, sites and wandering monsters scaled to its distance from the players.
const FOOT = {
    town: [-2, -2, 2, 0], mine: [-1, -1, 1, 0], dwelling: [-1, -1, 0, 0], site: [-1, -1, 0, 0], small: [0, 0, 0, 0],
};
const SMALL_SITES = ['well', 'shrine1', 'shrine2', 'shrine3', 'witch', 'monolith', 'pandora', 'scholar', 'fountain'];

function footOf(o) {
    if (o.type === 'town' || o.type === 'mine' || o.type === 'dwelling') return FOOT[o.type];
    if (o.type === 'site' && !SMALL_SITES.includes(o.kind)) return FOOT.site;
    return FOOT.small;
}

const MapGen = {
    generate(opts) {
        const n = MAP_SIZES[opts.size].n;
        const rng = new RNG(opts.seed);
        this.rng = rng;
        const W = n, H = n, N = W * H;
        const g = {
            version: 1, W, H, seed: opts.seed, day: 1, turn: 0, diff: opts.diff, sizeIdx: opts.size,
            terrain: new Uint8Array(N), road: new Uint8Array(N), block: new Uint8Array(N), vis: new Int32Array(N).fill(-1),
            decor: [], objects: {}, heroes: {}, players: [], heroTpl: {}, nextId: 1, weekOf: null, log: [],
        };
        G = g;
        this.wall = new Uint8Array(N); // 1 = removable filler decor, 2 = zone wall, 3 = object footprint, 4 = reserved free
        // hero templates
        let pi = 0;
        for (const cls in HERO_NAMES) HERO_NAMES[cls].forEach((name, i) => { g.heroTpl[cls + i] = { name, cls, used: false, portrait: pi++ }; });

        const P = opts.players.length;
        // ---- zone centres ----
        const zones = [];
        const ang0 = rng.real(0, Math.PI * 2);
        const rad = n * (P <= 2 ? 0.33 : 0.36);
        for (let i = 0; i < P; i++) {
            const a = ang0 + i * Math.PI * 2 / P + rng.real(-0.2, 0.2);
            zones.push({ x: clamp(Math.round(n / 2 + Math.cos(a) * rad), 5, n - 6), y: clamp(Math.round(n / 2 + Math.sin(a) * rad), 5, n - 6), player: i, level: 1 });
        }
        const total = Math.max(P + Math.ceil(P / 2), Math.round(n * n / 300));
        if (total > P) zones.push({ x: Math.round(n / 2), y: Math.round(n / 2), player: -1, center: 1 });
        while (zones.length < total) {
            let best = null, bd = -1;
            for (let k = 0; k < 30; k++) {
                const x = rng.int(4, n - 5), y = rng.int(4, n - 5);
                const d = Math.min(...zones.map(z => Math.hypot(z.x - x, z.y - y)));
                if (d > bd) { bd = d; best = { x, y, player: -1 }; }
            }
            zones.push(best);
        }
        // neutral zone level by distance to nearest player zone
        const pz = zones.filter(z => z.player >= 0);
        for (const z of zones) if (z.player < 0) {
            const d = Math.min(...pz.map(p => Math.hypot(p.x - z.x, p.y - z.y))) / n;
            z.level = z.center ? 5 : clamp(2 + Math.floor(d * 6), 2, 4);
        }
        // ---- assign tiles ----
        const noise = this.noise(W, H, 6, rng);
        const zoneOf = new Int16Array(N);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            let best = 0, bd = Infinity;
            for (let k = 0; k < zones.length; k++) {
                const z = zones[k];
                const d = Math.hypot(z.x - x, z.y - y) * (z.player >= 0 ? 0.88 : 1) + noise[y * W + x] * 7;
                if (d < bd) { bd = d; best = k; }
            }
            zoneOf[y * W + x] = best;
        }
        this.zoneOf = zoneOf; this.zones = zones;
        zones.forEach((z, k) => { z.tiles = []; });
        for (let i = 0; i < N; i++) zones[zoneOf[i]].tiles.push(i);
        // ---- terrain ----
        const landT = [T.GRASS, T.DIRT, T.SAND, T.SNOW, T.SWAMP, T.ROUGH, T.LAVA];
        zones.forEach(z => {
            z.terrain = z.player >= 0 ? FACTIONS[opts.players[z.player].faction].terrain : rng.pick(landT);
            for (const i of z.tiles) g.terrain[i] = z.terrain;
        });
        // patches of other terrain inside zones
        const pn = this.noise(W, H, 5, rng), pn2 = this.noise(W, H, 4, rng);
        for (let i = 0; i < N; i++) {
            const z = zones[zoneOf[i]];
            if (pn[i] > 0.78 && z.player < 0) g.terrain[i] = landT[Math.floor(pn2[i] * 7) % 7];
            else if (pn[i] < 0.1 && z.terrain !== T.DIRT && z.terrain !== T.SAND) g.terrain[i] = z.terrain === T.SNOW ? T.SNOW : (pn2[i] > 0.5 ? T.DIRT : T.ROUGH);
        }
        // ---- zone walls ----
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x, z = zoneOf[i];
            let border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < W && ny < H && zoneOf[ny * W + nx] !== z) border = true;
            }
            if (border) this.wall[i] = 2;
        }
        // ---- passages ----
        const contacts = new Map();
        for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const nx = x + dx, ny = y + dy; if (ny >= H) continue;
            const a = zoneOf[y * W + x], b = zoneOf[ny * W + nx];
            if (a === b) continue;
            if (x < 2 || y < 2 || nx > W - 3 || ny > H - 3) continue;
            const key = Math.min(a, b) + ',' + Math.max(a, b);
            if (!contacts.has(key)) contacts.set(key, []);
            contacts.get(key).push([y * W + x, ny * W + nx]);
        }
        const edges = [...contacts.entries()].filter(e => e[1].length >= 4).map(([k, c]) => { const [a, b] = k.split(',').map(Number); return { a, b, c, w: rng.next() }; });
        edges.sort((p, q) => p.w - q.w);
        const parent = zones.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
        const chosen = [];
        for (const e of edges) {
            const ra = find(e.a), rb = find(e.b);
            const both = zones[e.a].player >= 0 && zones[e.b].player >= 0;
            if (ra !== rb) { parent[ra] = rb; chosen.push(e); }
            else if (rng.chance(both ? 0.15 : 0.4)) chosen.push(e);
        }
        this.passages = [];
        for (const e of chosen) {
            const c = e.c[Math.floor(e.c.length / 2)];
            const pts = [c[0], c[1]];
            for (const p of pts) {
                const px = p % W, py = (p / W) | 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = px + dx, ny = py + dy;
                    if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
                    const ni = ny * W + nx;
                    if (zoneOf[ni] === e.a || zoneOf[ni] === e.b) this.wall[ni] = 4;
                }
            }
            const za = zones[e.a], zb = zones[e.b];
            const guardTile = za.level >= zb.level ? c[0] : c[1];
            let lvl = Math.max(za.level, zb.level) + (za.player >= 0 && zb.player >= 0 ? 2 : 0);
            this.passages.push({ tile: guardTile, level: Math.min(lvl, 6), a: e.a, b: e.b });
        }
        // ---- water lakes ----
        zones.forEach(z => {
            if (z.player >= 0 || z.tiles.length < 250 || !rng.chance(0.45)) return;
            const cx = z.x + rng.int(-4, 4), cy = z.y + rng.int(-4, 4), r = rng.real(1.5, 3.2);
            for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
                const x = cx + dx, y = cy + dy;
                if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
                const i = y * W + x;
                if (zoneOf[i] !== zones.indexOf(z) || this.wall[i]) continue;
                if (Math.hypot(dx, dy) + noise[i] * 1.5 < r) g.terrain[i] = T.WATER;
            }
        });
        for (let i = 0; i < N; i++) if (g.terrain[i] === T.WATER) g.block[i] = 1;
        // ---- players ----
        opts.players.forEach((pl, i) => {
            g.players.push({
                id: i, color: pl.color, faction: pl.faction, human: !!pl.human, alive: true,
                res: Object.assign({}, pl.human ? DIFFICULTY[opts.diff].res : DIFFICULTY[1].res),
                heroes: [], towns: [], explored: new Uint8Array(N), tavern: [], noTown: 0, team: i,
            });
        });
        // ---- place towns ----
        zones.forEach((z, k) => {
            if (z.player >= 0) {
                const t = this.placeAt(z, k, this.townObj(opts.players[z.player].faction, z.player), 0, 3);
                z.town = t;
                if (t) g.players[z.player].towns.push(t.id);
            } else if (!z.center && z.tiles.length > 200 && rng.chance(0.45)) {
                z.town = this.placeAt(z, k, this.townObj(rng.pick(FACTION_IDS), -1, z.level), 0, 5);
            }
        });
        if (zones.some(z => z.player >= 0 && !z.town) && (opts.retry || 0) < 8) return this.generate(Object.assign({}, opts, { seed: opts.seed + 1, retry: (opts.retry || 0) + 1 }));
        // guard monsters on passages
        for (const ps of this.passages) {
            const x = ps.tile % W, y = (ps.tile / W) | 0;
            this.wall[ps.tile] = 0;
            this.add(this.monsterObj(ps.level, x, y));
        }
        // ---- fill zones ----
        zones.forEach((z, k) => this.fillZone(z, k, opts));
        // monoliths: link pairs placed in different zones
        const monos = Object.values(g.objects).filter(o => o.type === 'site' && o.kind === 'monolith');
        for (let i = 0; i + 1 < monos.length; i += 2) { monos[i].twin = monos[i + 1].id; monos[i + 1].twin = monos[i].id; monos[i].pair = monos[i + 1].pair = i / 2; }
        if (monos.length % 2) this.removeObject(monos[monos.length - 1]);
        // ---- filler decor ----
        const dn = this.noise(W, H, 3, rng);
        for (let i = 0; i < N; i++) {
            if (this.wall[i] || g.block[i] || g.vis[i] >= 0) continue;
            const z = zones[zoneOf[i]];
            const dz = Math.hypot((i % W) - z.x, ((i / W) | 0) - z.y);
            if (z.player >= 0 && dz < 4) continue;
            if (dn[i] > 0.62 || rng.chance(0.06)) this.wall[i] = 1;
        }
        for (let i = 0; i < N; i++) if (this.wall[i] === 1 || this.wall[i] === 2) { if (g.terrain[i] !== T.WATER) g.block[i] = 1; }
        this.broken = false;
        this.ensureReachable();
        if (this.broken && (opts.retry || 0) < 8) return this.generate(Object.assign({}, opts, { seed: opts.seed + 1, retry: (opts.retry || 0) + 1 }));
        this.makeRoads();
        // decor list for rendering
        for (let i = 0; i < N; i++) if ((this.wall[i] === 1 || this.wall[i] === 2) && g.terrain[i] !== T.WATER) g.decor.push({ x: i % W, y: (i / W) | 0, v: rng.int(0, 99), w: this.wall[i] === 2 ? 1 : 0 });
        // ---- heroes ----
        g.players.forEach(p => {
            const t = zones.find(z => z.player === p.id).town;
            const cl = FACTIONS[p.faction];
            const tpl = Core.freeTpl(rng.chance(0.5) ? cl.mightClass : cl.magicClass);
            G.heroTpl[tpl].used = true;
            const h = Core.makeHero(tpl, p.id);
            h.x = t.x; h.y = t.y;
            p.heroes.push(h.id);
            Core.learnGuild(h, t);
            Core.refreshTavern(p);
            Core.revealAll(p);
        });
        g.weekOf = null;
        return g;
    },

    noise(W, H, cell, rng) {
        const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
        const grid = new Float32Array(gw * gh).map(() => rng.next());
        const out = new Float32Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
            let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
            const a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
            out[y * W + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
        }
        return out;
    },

    add(o) {
        o.id = G.nextId++;
        G.objects[o.id] = o;
        const f = footOf(o);
        for (let dy = f[1]; dy <= f[3]; dy++) for (let dx = f[0]; dx <= f[2]; dx++) {
            const i = (o.y + dy) * G.W + o.x + dx;
            if (dx || dy) { G.block[i] = 1; this.wall[i] = 3; }
        }
        G.vis[o.y * G.W + o.x] = o.id;
        this.wall[o.y * G.W + o.x] = 3;
        return o;
    },
    removeObject(o) {
        const f = footOf(o);
        for (let dy = f[1]; dy <= f[3]; dy++) for (let dx = f[0]; dx <= f[2]; dx++) {
            const i = (o.y + dy) * G.W + o.x + dx; G.block[i] = 0; this.wall[i] = 0;
        }
        G.vis[o.y * G.W + o.x] = -1;
        delete G.objects[o.id];
    },
    // Is the footprint (plus one free tile in front of the entrance) available?
    fits(o, x, y, k) {
        const W = G.W, f = footOf(o), pad = o.type === 'town' ? 1 : 0;
        for (let dy = f[1] - pad; dy <= f[3] + 1; dy++) for (let dx = f[0] - pad; dx <= f[2] + pad; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= G.H - 1) return false;
            const i = ny * W + nx;
            if (this.zoneOf[i] !== k || this.wall[i] || G.block[i] || G.vis[i] >= 0) return false;
        }
        // keep a little space between objects
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const i = (y + 1 + dy) * W + x + dx;
            if (G.vis[i] >= 0) return false;
        }
        return true;
    },
    placeAt(z, k, o, dmin, dmax) {
        const rng = this.rng;
        for (let tries = 0; tries < 400; tries++) {
            const r = dmin + (dmax - dmin) * Math.sqrt(rng.next()) + tries / 40;
            const a = rng.real(0, Math.PI * 2);
            const x = Math.round(z.x + Math.cos(a) * r), y = Math.round(z.y + Math.sin(a) * r);
            if (!this.fits(o, x, y, k)) continue;
            o.x = x; o.y = y;
            this.add(o);
            // reserve the tile in front of the entrance
            this.wall[(y + 1) * G.W + x] = 4;
            return o;
        }
        return null;
    },
    placeRandom(z, k, o) {
        const rng = this.rng;
        for (let tries = 0; tries < 200; tries++) {
            const i = rng.pick(z.tiles);
            const x = i % G.W, y = (i / G.W) | 0;
            if (z.player >= 0 && Math.hypot(x - z.x, y - z.y) < 4) continue;
            if (!this.fits(o, x, y, k)) continue;
            o.x = x; o.y = y;
            this.add(o);
            this.wall[(y + 1) * G.W + x] = 4;
            return o;
        }
        return null;
    },
    // A monster stack next to an object, guarding it.
    guard(o, level, k) {
        if (!o) return;
        const cand = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = o.x + dx, y = o.y + dy, i = y * G.W + x;
            if (x < 1 || y < 1 || x >= G.W - 1 || y >= G.H - 1) continue;
            if (this.zoneOf[i] !== k || G.block[i] || G.vis[i] >= 0 || this.wall[i] === 2) continue;
            cand.push([x, y]);
        }
        if (!cand.length) return;
        const [x, y] = cand.find(c => c[1] === o.y + 1) || this.rng.pick(cand);
        this.add(this.monsterObj(level, x, y));
    },

    townObj(fac, owner, level) {
        const rng = this.rng;
        const t = {
            type: 'town', faction: fac, owner, name: rng.pick(FACTIONS[fac].towns) + (rng.chance(0.3) ? ' ' + rng.pick(['Keep', 'Hold', 'Vale', 'Reach']) : ''),
            built: { hall1: true, tavern: true, fort: true, d1: true }, avail: [0, 0, 0, 0, 0, 0, 0], garrison: Core.emptyArmy(),
            guild: [[], [], [], [], []], builtToday: false,
        };
        if (rng.chance(0.6)) t.built.d2 = true;
        if (owner < 0) {
            if (rng.chance(0.5)) t.built.d3 = true;
            if (level >= 3 && rng.chance(0.5)) { t.built.mage1 = true; t.built.d4 = true; }
            // garrison scaled to zone level
            const target = this.levelPower(level) * DIFFICULTY[G.diff].mon * 1.4;
            const units = FACTION_UNITS[fac];
            let tiers = [0, 1, 2, 3].filter(i => i < 2 + level);
            let spent = 0, slot = 0;
            while (spent < target && slot < 5) {
                const tier = rng.pick(tiers), cid = units[tier][level >= 4 ? 1 : 0], v = CREATURES[cid].value;
                const n = Math.max(1, Math.round(target / 4 / v));
                Core.armyAdd(t.garrison, cid, n); spent += n * v; slot++;
            }
        } else {
            t.built.mage1 = true;
        }
        for (let tier = 1; tier <= 7; tier++) if (t.built['d' + tier]) t.avail[tier - 1] = CREATURES[FACTION_UNITS[fac][tier - 1][0]].grow;
        // pre-roll the mage guild contents for every level this faction can reach
        for (let l = 1; l <= MAGE_LEVELS[fac]; l++) {
            const pool = rng.shuffle(SPELL_IDS.filter(s => SPELLS[s].lvl === l));
            t.guild[l - 1] = pool.slice(0, GUILD_SLOTS[l - 1]);
        }
        return t;
    },
    levelPower(level) { return [0, 1300, 3500, 8000, 17000, 32000, 60000][level] * this.rng.real(0.8, 1.25); },
    monsterObj(level, x, y) {
        const rng = this.rng;
        const tiers = [[], [1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7]][level];
        const tier = rng.pick(tiers);
        const pool = CREATURE_IDS.filter(c => CREATURES[c].tier === tier && (level >= 3 || !CREATURES[c].up));
        const cid = rng.pick(pool);
        const target = this.levelPower(level) * DIFFICULTY[G.diff].mon;
        const n = Math.max(1, Math.round(target / CREATURES[cid].value));
        return { type: 'monster', cid, count: n, count0: n, x, y, agg: rng.int(1, 10) };
    },
    fillZone(z, k, opts) {
        const rng = this.rng, L = z.level;
        const put = (o, guardLvl) => { const r = this.placeRandom(z, k, o); if (r && guardLvl) this.guard(r, guardLvl, k); return r; };
        const near = (o, d0, d1, guardLvl) => { const r = this.placeAt(z, k, o, d0, d1); if (r && guardLvl) this.guard(r, guardLvl, k); return r; };
        const rare = () => rng.pick(['mercury', 'sulfur', 'crystal', 'gems']);
        if (z.player >= 0) {
            near({ type: 'mine', res: 'wood', owner: -1 }, 4, 7);
            near({ type: 'mine', res: 'ore', owner: -1 }, 4, 7);
            near({ type: 'mine', res: FACTIONS[opts.players[z.player].faction].rare, owner: -1 }, 6, 10, 1);
            if (rng.chance(0.5)) put({ type: 'mine', res: rare(), owner: -1 }, 2);
        } else {
            if (L >= 3 || rng.chance(0.5)) put({ type: 'mine', res: 'gold', owner: -1 }, Math.min(L + 1, 6));
            put({ type: 'mine', res: rng.pick(['wood', 'ore', rare(), rare()]), owner: -1 }, L);
            if (rng.chance(0.5)) put({ type: 'mine', res: rare(), owner: -1 }, L);
        }
        const area = z.tiles.length / 300;
        const nres = Math.round((z.player >= 0 ? 6 : 5) * area) + 2;
        for (let i = 0; i < nres; i++) {
            const r = rng.weighted([['gold', 3], ['wood', 3], ['ore', 3], ['mercury', 1], ['sulfur', 1], ['crystal', 1], ['gems', 1]]);
            const amt = r === 'gold' ? rng.int(5, 10) * 100 : r === 'wood' || r === 'ore' ? rng.int(5, 10) : rng.int(3, 6);
            put({ type: 'res', res: r, amt });
        }
        for (let i = 0; i < Math.round(2 * area) + 1; i++) put({ type: 'chest' }, L >= 3 && rng.chance(0.3) ? L - 1 : 0);
        if (rng.chance(0.7)) put({ type: 'campfire' });
        // artifacts
        const nart = z.player >= 0 ? rng.int(0, 1) : rng.int(1, 3);
        for (let i = 0; i < nart; i++) {
            const cls = clamp(L - 1 + rng.int(-1, 1), 1, 4);
            const pool = ART_IDS.filter(a => ARTIFACTS[a].cls === cls);
            put({ type: 'artifact', aid: rng.pick(pool) }, z.player >= 0 ? 1 : L);
        }
        // sites
        const commonSites = ['windmill', 'waterwheel', 'well', 'shrine1', 'witch', 'merc', 'marletto', 'staraxis', 'garden', 'learnstone', 'temple', 'fountain', 'stables', 'scholar', 'oasis'];
        const richSites = ['shrine2', 'shrine3', 'arena', 'tree', 'pandora', 'prison', 'sanctuary', 'monolith', 'monolith'];
        const nsite = Math.round((z.player >= 0 ? 3 : 4) * area) + 1;
        for (let i = 0; i < nsite; i++) {
            const kind = (L >= 2 && rng.chance(0.35)) ? rng.pick(richSites) : rng.pick(commonSites);
            const o = this.siteObj(kind, L);
            const guarded = ['arena', 'tree', 'shrine3', 'prison', 'sanctuary', 'pandora'].includes(kind) ? L : 0;
            put(o, guarded);
        }
        // dwellings
        const nd = z.player >= 0 ? 1 : rng.int(1, 2);
        for (let i = 0; i < nd; i++) {
            const tier = clamp(L + rng.int(-1, 1), 1, 5);
            const pool = CREATURE_IDS.filter(c => CREATURES[c].tier === tier && !CREATURES[c].up);
            const cid = rng.pick(pool);
            put({ type: 'dwelling', cid, avail: CREATURES[cid].grow, owner: -1 }, z.player >= 0 ? 0 : L);
        }
        // wandering monsters
        const nmon = Math.round((z.player >= 0 ? 4 : 5) * area) + 1;
        for (let i = 0; i < nmon; i++) {
            const lv = z.player >= 0 ? rng.int(1, 2) : clamp(L + rng.int(-1, 0), 1, 6);
            const o = this.monsterObj(lv, 0, 0);
            put(o);
        }
    },
    siteObj(kind, L) {
        const rng = this.rng, o = { type: 'site', kind };
        if (kind === 'windmill') o.res = rng.pick(['mercury', 'sulfur', 'crystal', 'gems', 'wood', 'ore']);
        if (kind.startsWith('shrine')) o.spell = rng.pick(SPELL_IDS.filter(s => SPELLS[s].lvl === +kind[6]));
        if (kind === 'witch') o.skill = rng.pick(SKILL_IDS.filter(s => s !== 'necromancy'));
        if (kind === 'prison') o.tpl = null;
        if (kind === 'pandora') {
            o.reward = rng.weighted([['gold', 3], ['exp', 3], ['army', 2], ['art', 2], ['spells', 1]]);
            o.amount = o.reward === 'gold' ? rng.int(2, 6) * 1000 * Math.max(1, L - 1) : o.reward === 'exp' ? rng.int(2, 6) * 1000 * Math.max(1, L - 1) : 0;
            if (o.reward === 'army') { const cid = rng.pick(CREATURE_IDS.filter(c => CREATURES[c].tier === clamp(L + 1, 2, 6) && !CREATURES[c].up)); o.cid = cid; o.n = Math.max(1, Math.round(this.levelPower(L) * 0.5 / CREATURES[cid].value)); }
            if (o.reward === 'art') o.aid = rng.pick(ART_IDS.filter(a => ARTIFACTS[a].cls === clamp(L, 2, 4)));
            if (rng.chance(0.4)) o.trap = Math.min(L + 1, 6);
        }
        return o;
    },

    // Flood from the first town; carve filler decor until every object and passage can be reached.
    ensureReachable() {
        const g = G, W = g.W, H = g.H, N = W * H;
        const start = Object.values(g.objects).find(o => o.type === 'town' && o.owner === 0);
        const flood = () => {
            const seen = new Uint8Array(N), q = [start.y * W + start.x];
            seen[q[0]] = 1;
            while (q.length) {
                const i = q.pop(), x = i % W, y = (i / W) | 0;
                const o = g.vis[i] >= 0 ? g.objects[g.vis[i]] : null;
                if (o && o.type !== 'monster' && o !== start) continue;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    const ni = ny * W + nx;
                    if (seen[ni] || g.block[ni]) continue;
                    seen[ni] = 1; q.push(ni);
                }
            }
            return seen;
        };
        let seen = flood();
        for (let pass = 0; pass < 3; pass++) {
            let changed = false;
            for (const o of Object.values(g.objects)) {
                const i = o.y * W + o.x;
                if (seen[i]) continue;
                // BFS from the object through free or filler tiles to any reached tile
                const prev = new Int32Array(N).fill(-2), q = [i]; prev[i] = -1; let hit = -1;
                for (let h = 0; h < q.length && hit < 0; h++) {
                    const c = q[h], x = c % W, y = (c / W) | 0;
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
                        const ni = ny * W + nx;
                        if (prev[ni] !== -2) continue;
                        if (g.terrain[ni] === T.WATER || this.wall[ni] === 3 || this.wall[ni] === 2) continue;
                        prev[ni] = c;
                        if (seen[ni] && !g.block[ni]) { hit = ni; break; }
                        q.push(ni);
                    }
                }
                if (hit < 0) continue;
                for (let c = prev[hit]; c !== i && c >= 0; c = prev[c]) {
                    if (this.wall[c] === 1) { this.wall[c] = 0; g.block[c] = 0; changed = true; }
                }
                changed = true;
            }
            if (!changed) break;
            seen = flood();
        }
        // anything still unreachable is removed so the player never sees a treasure they can't get
        for (const o of Object.values(g.objects)) {
            if (seen[o.y * W + o.x]) continue;
            if (o.type === 'town' && o.owner >= 0) { this.broken = true; continue; }
            this.removeObject(o);
        }
    },
    makeRoads() {
        const g = G, W = g.W;
        const towns = Object.values(g.objects).filter(o => o.type === 'town');
        const goals = this.passages.map(p => p.tile).filter(t => g.vis[t] >= 0);
        const road = (a, b) => {
            // BFS on free tiles between two points (a and b may be object tiles)
            const N = W * g.H, prev = new Int32Array(N).fill(-2), q = [a]; prev[a] = -1;
            for (let h = 0; h < q.length; h++) {
                const c = q[h]; if (c === b) break;
                const x = c % W, y = (c / W) | 0;
                for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
                    const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= g.H) continue;
                    const ni = ny * W + nx;
                    if (prev[ni] !== -2 || g.block[ni]) continue;
                    if (g.vis[ni] >= 0 && ni !== b) continue;
                    prev[ni] = c; q.push(ni);
                }
            }
            if (prev[b] === -2) return;
            for (let c = b; c >= 0; c = prev[c]) g.road[c] = 1;
        };
        for (const t of towns) {
            const ti = (t.y + 1) * W + t.x;
            const zk = this.zoneOf[t.y * W + t.x];
            g.road[t.y * W + t.x] = 1;
            for (const ps of this.passages) if (ps.a === zk || ps.b === zk) road(ti, ps.tile);
        }
        // passage-to-passage roads through neutral zones
        this.zones.forEach((z, k) => {
            if (z.town) return;
            const ps = this.passages.filter(p => p.a === k || p.b === k);
            for (let i = 1; i < ps.length; i++) road(ps[0].tile, ps[i].tile);
        });
        for (const gi of goals) g.road[gi] = 1;
    },
};
