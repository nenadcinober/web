// Game state and the rules that act on it. The state (G) is plain data so it can be saved as JSON.
let G = null;

const Core = {
    // ---------------- lookups ----------------
    cur() { return G.players[G.turn]; },
    human() { return G.players.find(p => p.human); },
    obj(id) { return G.objects[id]; },
    hero(id) { return G.heroes[id]; },
    idx(x, y) { return y * G.W + x; },
    inMap(x, y) { return x >= 0 && y >= 0 && x < G.W && y < G.H; },
    week() { return Math.floor((G.day - 1) / 7) + 1; },
    dateStr() {
        const d = G.day - 1;
        return `Month ${Math.floor(d / 28) + 1}, Week ${Math.floor((d % 28) / 7) + 1}, Day ${d % 7 + 1}`;
    },
    color(owner) { return owner >= 0 ? PLAYER_COLORS[G.players[owner].color] : NEUTRAL_COLOR; },
    heroesOf(p) { return p.heroes.map(id => G.heroes[id]).filter(Boolean); },
    townsOf(p) { return p.towns.map(id => G.objects[id]).filter(Boolean); },
    heroAt(x, y) {
        for (const id in G.heroes) { const h = G.heroes[id]; if (h.x === x && h.y === y && h.owner >= 0) return h; }
        return null;
    },
    visAt(x, y) { const id = G.vis[this.idx(x, y)]; return id >= 0 ? G.objects[id] : null; },
    townOfHero(h) { const o = this.visAt(h.x, h.y); return o && o.type === 'town' ? o : null; },
    heroInTown(t) { const h = this.heroAt(t.x, t.y); return h; },

    // ---------------- armies ----------------
    emptyArmy() { return [null, null, null, null, null, null, null]; },
    armyAdd(army, cid, n) {
        if (n <= 0) return true;
        for (const s of army) if (s && s.cid === cid) { s.n += n; return true; }
        const i = army.indexOf(null);
        if (i < 0) return false;
        army[i] = { cid, n };
        return true;
    },
    armyCanAdd(army, cid) { return army.some(s => !s || s.cid === cid); },
    armyStacks(army) { return army.filter(Boolean).length; },
    armyTotal(army) { return army.reduce((a, s) => a + (s ? s.n : 0), 0); },
    armyPower(army, hero) {
        let v = 0;
        for (const s of army) if (s) v += CREATURES[s.cid].value * s.n;
        if (hero) v *= 1 + 0.05 * (this.stat(hero, 'att') + this.stat(hero, 'def')) + 0.03 * this.stat(hero, 'pow') * Math.min(1, hero.mana / 20);
        return Math.round(v);
    },
    // Merge `src` into `dst` as far as slots allow; returns leftover stacks left in src.
    armyMergeInto(dst, src) {
        for (let i = 0; i < src.length; i++) {
            const s = src[i]; if (!s) continue;
            if (this.armyAdd(dst, s.cid, s.n)) src[i] = null;
        }
    },

    // ---------------- hero stats ----------------
    artBonus(h, key) {
        let v = 0;
        for (const sl of ART_SLOTS) { const a = h.arts[sl]; if (a && ARTIFACTS[a].b[key]) v += ARTIFACTS[a].b[key]; }
        return v;
    },
    stat(h, k) { // att def pow know with artifacts
        const v = h[k] + this.artBonus(h, k);
        return k === 'pow' || k === 'know' ? Math.max(1, v) : Math.max(0, v);
    },
    skillLvl(h, sid) { const s = h.skills.find(s => s[0] === sid); return s ? s[1] : 0; },
    skillVal(h, sid) { const l = this.skillLvl(h, sid); return l ? SKILLS[sid].v[l - 1] : 0; },
    maxMana(h) { return Math.round(this.stat(h, 'know') * 10 * (1 + this.skillVal(h, 'intelligence') / 100)); },
    manaRegen(h) { return 1 + this.skillVal(h, 'mysticism') + this.artBonus(h, 'mana'); },
    maxSpellLvl(h) { return Math.max(2, this.skillVal(h, 'wisdom')); },
    morale(h, army) {
        let m = 0; const facs = new Set(); let undead = false, living = false;
        for (const s of army) if (s) { const c = CREATURES[s.cid]; facs.add(c.faction); if (c.undead) undead = true; else living = true; }
        if (facs.size === 1) m += 1; else if (facs.size > 2) m -= facs.size - 2;
        if (undead && living) m -= 1;
        if (h) m += this.skillVal(h, 'leadership') + this.artBonus(h, 'morale') + (h.tmpMorale || 0);
        return clamp(m, -3, 3);
    },
    luck(h) { return h ? clamp(this.skillVal(h, 'luck') + this.artBonus(h, 'luck') + (h.tmpLuck || 0), -3, 3) : 0; },
    sight(h) { return 5 + this.skillVal(h, 'scouting') + this.artBonus(h, 'sight'); },
    maxMove(h) {
        let slow = 99;
        for (const s of h.army) if (s) slow = Math.min(slow, CREATURES[s.cid].spd);
        if (slow === 99) slow = 3;
        const table = [1500, 1500, 1500, 1500, 1560, 1630, 1700, 1760, 1830, 1900, 1960, 2000];
        let mp = table[Math.min(slow, 11)];
        mp = Math.round(mp * (1 + this.skillVal(h, 'logistics') / 100)) + this.artBonus(h, 'move');
        if (h.stableWeek === this.week()) mp += 400;
        return mp;
    },

    // ---------------- map movement ----------------
    passable(x, y) { return this.inMap(x, y) && !G.block[this.idx(x, y)]; },
    guardOf(x, y) { // monster whose zone of control covers (x, y)
        if (this.visAt(x, y)) return null;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (!this.inMap(nx, ny)) continue;
            const o = this.visAt(nx, ny);
            if (o && o.type === 'monster') return o;
        }
        return null;
    },
    stepCost(h, x0, y0, x1, y1) {
        const i0 = this.idx(x0, y0), i1 = this.idx(x1, y1);
        let c;
        if (G.road[i0] && G.road[i1]) c = 50;
        else {
            c = TERRAIN[G.terrain[i0]].cost;
            if (c > 100) c = 100 + Math.round((c - 100) * (1 - this.skillVal(h, 'pathfinding') / 100));
        }
        if (x0 !== x1 && y0 !== y1) c = Math.round(c * 1.414);
        return c;
    },
    // Dijkstra over the map from the hero. Tiles holding objects, heroes or guarded by monsters end a path.
    reach(h, opts = {}) {
        const W = G.W, H = G.H, N = W * H;
        const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), stop = new Uint8Array(N);
        const s = this.idx(h.x, h.y);
        dist[s] = 0;
        const heap = new MinHeap();
        heap.push(0, s);
        const heroTiles = new Map();
        for (const id in G.heroes) { const o = G.heroes[id]; if (o.id !== h.id && o.owner >= 0) heroTiles.set(this.idx(o.x, o.y), o); }
        const explored = opts.explored;
        const maxCost = opts.maxCost || Infinity;
        while (heap.size) {
            const [d, i] = heap.pop();
            if (d > dist[i]) continue;
            // object tiles end a path; a tile guarded by a monster can only step on into an object (the fight comes first)
            if (stop[i] === 1 && i !== s) continue;
            if (d > maxCost) break;
            const guarded = stop[i] === 2 && i !== s;
            const x = i % W, y = (i / W) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const ni = ny * W + nx;
                if (G.block[ni]) continue;
                if (explored && !explored[ni]) continue;
                if (guarded && G.vis[ni] < 0) continue;
                const nd = d + this.stepCost(h, x, y, nx, ny);
                if (nd >= dist[ni]) continue;
                dist[ni] = nd; prev[ni] = i;
                if (G.vis[ni] >= 0 || heroTiles.has(ni)) stop[ni] = 1;
                else if (this.guardOf(nx, ny)) stop[ni] = 2;
                else stop[ni] = 0;
                heap.push(nd, ni);
            }
        }
        return { dist, prev, stop };
    },
    pathTo(h, tx, ty, r) {
        r = r || this.reach(h);
        const t = this.idx(tx, ty);
        if (!isFinite(r.dist[t])) return null;
        const path = [];
        for (let i = t; i !== -1 && i !== this.idx(h.x, h.y); i = r.prev[i]) path.push(i);
        path.reverse();
        let acc = 0, px = h.x, py = h.y;
        return path.map(i => {
            const x = i % G.W, y = (i / G.W) | 0;
            acc += this.stepCost(h, px, py, x, y); px = x; py = y;
            return { x, y, cost: acc };
        });
    },

    // ---------------- fog ----------------
    reveal(p, x, y, r) {
        const ex = p.explored; let changed = false;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r + r) continue;
            const nx = x + dx, ny = y + dy;
            if (!this.inMap(nx, ny)) continue;
            const i = this.idx(nx, ny);
            if (!ex[i]) { ex[i] = 1; changed = true; }
        }
        return changed;
    },
    revealAll(p) {
        for (const h of this.heroesOf(p)) this.reveal(p, h.x, h.y, this.sight(h));
        for (const t of this.townsOf(p)) this.reveal(p, t.x, t.y, 8);
    },

    // ---------------- heroes ----------------
    makeHero(tplId, owner) {
        const tpl = G.heroTpl[tplId];
        const cl = CLASSES[tpl.cls];
        const fac = cl.faction;
        const h = {
            id: 'H' + (G.nextId++), tpl: tplId, name: tpl.name, cls: tpl.cls, faction: fac, portrait: tpl.portrait,
            owner, x: -1, y: -1, lvl: 1, exp: 0,
            att: cl.start[0], def: cl.start[1], pow: cl.start[2], know: cl.start[3],
            mana: 0, mp: 0, skills: [], spells: [], army: this.emptyArmy(), arts: {}, pack: [],
            visited: {}, weekly: {}, tmpMorale: 0, tmpLuck: 0, stableWeek: 0, dest: null,
            machines: { ballista: 0, tent: 0 }, sleep: false,
        };
        const sw = Object.entries(cl.skills).sort((a, b) => b[1] - a[1]);
        if (cl.might) {
            h.skills.push([sw[0][0], 1]);
            if (R.chance(0.5)) h.skills.push([R.pick(sw.slice(1, 4))[0], 1]);
        } else {
            h.skills.push(['wisdom', 1]);
            const other = sw.filter(s => s[0] !== 'wisdom');
            h.skills.push([other[0][0] === 'necromancy' ? 'necromancy' : R.pick(other.slice(0, 3))[0], 1]);
        }
        if (fac === 'necropolis' && !h.skills.find(s => s[0] === 'necromancy')) h.skills.unshift(['necromancy', 1]);
        const l1 = SPELL_IDS.filter(s => SPELLS[s].lvl === 1 && SPELLS[s].kind !== 'adv');
        h.spells.push(cl.might ? R.pick(['bless', 'bloodlust', 'stoneskin', 'haste']) : R.pick(['magicarrow', 'slow', 'curse', 'shield', 'cure']));
        if (!cl.might) h.spells.push(R.pick(l1.filter(s => !h.spells.includes(s))));
        const units = FACTION_UNITS[fac];
        h.army[0] = { cid: units[0][0], n: R.int(12, 22) };
        h.army[1] = { cid: units[1][0], n: R.int(4, 8) };
        if (R.chance(0.6)) h.army[2] = { cid: units[2][0], n: R.int(1, 4) };
        h.mana = this.maxMana(h);
        h.mp = this.maxMove(h);
        G.heroes[h.id] = h;
        return h;
    },
    removeHero(h) {
        const p = G.players[h.owner];
        if (p) p.heroes = p.heroes.filter(id => id !== h.id);
        h.owner = -1; h.x = h.y = -1;
        delete G.heroes[h.id];
        G.heroTpl[h.tpl].used = false;
    },
    freeTpl(cls) {
        const free = Object.keys(G.heroTpl).filter(k => !G.heroTpl[k].used && (!cls || G.heroTpl[k].cls === cls));
        return free.length ? R.pick(free) : null;
    },
    refreshTavern(p) {
        p.tavern = [];
        const fc = FACTIONS[p.faction];
        const want = [R.chance(0.6) ? fc.mightClass : fc.magicClass, null];
        for (const cls of want) {
            const t = this.freeTpl(cls) || this.freeTpl(null);
            if (t && !p.tavern.includes(t)) p.tavern.push(t);
        }
    },
    hireHero(p, town, tplId) {
        if (p.res.gold < 2500 || p.heroes.length >= 8 || this.heroAt(town.x, town.y) || G.heroTpl[tplId].used) return null;
        p.res.gold -= 2500;
        G.heroTpl[tplId].used = true;
        const h = this.makeHero(tplId, p.id);
        h.x = town.x; h.y = town.y;
        h.mp = this.maxMove(h);
        p.heroes.push(h.id);
        p.tavern = p.tavern.filter(t => t !== tplId);
        this.reveal(p, h.x, h.y, this.sight(h));
        this.learnGuild(h, town);
        return h;
    },
    giveExp(h, amt) {
        h.exp += Math.round(amt * (1 + this.skillVal(h, 'learning') / 100));
    },
    pendingLevel(h) { return h.exp >= LEVEL_EXP[h.lvl + 1]; },
    // Rolls one level-up. Returns {prim, opts} where opts are up to two [skill, newLevel] choices.
    rollLevel(h) {
        h.lvl++;
        const cl = CLASSES[h.cls];
        const prim = ['att', 'def', 'pow', 'know'][R.weighted(cl.grow.map((w, i) => [i, w]))];
        h[prim]++;
        const ups = h.skills.filter(s => s[1] < 3).map(s => [s[0], s[1] + 1]);
        let news = [];
        if (h.skills.length < 8) {
            news = SKILL_IDS.filter(s => !h.skills.find(k => k[0] === s) && (s !== 'necromancy' || h.faction === 'necropolis'))
                .map(s => [[s, 1], cl.skills[s] || 1]);
        }
        const opts = [];
        const wUp = ups.map(u => [u, cl.skills[u[0]] || 1]);
        if (wUp.length) opts.push(R.weighted(wUp));
        if (news.length) opts.push(R.weighted(news));
        if (opts.length < 2 && wUp.length > 1) {
            const rest = wUp.filter(u => u[0] !== opts[0]);
            opts.push(R.weighted(rest));
        }
        return { prim, opts };
    },
    applySkill(h, opt) {
        const s = h.skills.find(k => k[0] === opt[0]);
        if (s) s[1] = opt[1]; else if (h.skills.length < 8) h.skills.push([opt[0], opt[1]]);
    },
    learnGuild(h, town) {
        if (!town || town.owner !== h.owner) return [];
        const learned = [];
        const maxL = this.maxSpellLvl(h);
        for (let l = 1; l <= 5; l++) {
            if (!town.built['mage' + l] || l > maxL) continue;
            for (const s of town.guild[l - 1]) if (!h.spells.includes(s)) { h.spells.push(s); learned.push(s); }
        }
        if (town.built.mage1) h.mana = Math.max(h.mana, this.maxMana(h));
        return learned;
    },
    equip(h, aid) { // put an artifact into a free matching slot, else the backpack
        const a = ARTIFACTS[aid];
        const slots = a.slot === 'ring' ? ['ring1', 'ring2'] : a.slot === 'misc' ? ['misc1', 'misc2', 'misc3', 'misc4'] : [a.slot];
        for (const s of slots) if (!h.arts[s]) { h.arts[s] = aid; return s; }
        h.pack.push(aid);
        return null;
    },

    // ---------------- towns ----------------
    growth(t, tier) {
        const base = CREATURES[FACTION_UNITS[t.faction][tier - 1][0]].grow;
        let g = base * (1 + (t.built.citadel ? 0.5 : 0) + (t.built.castle ? 0.5 : 0));
        if (G.weekOf && FACTION_UNITS[t.faction][tier - 1].includes(G.weekOf)) g += 5;
        return Math.floor(g);
    },
    townIncome(t) {
        const res = { gold: t.built.hall4 ? 4000 : t.built.hall3 ? 2000 : t.built.hall2 ? 1000 : 500 };
        if (t.built.silo) {
            const r = FACTIONS[t.faction].rare;
            if (r === 'wood' || r === 'ore') { res.wood = 1; res.ore = 1; } else res[r] = 1;
        }
        return res;
    },
    income(p) {
        const inc = {}; RES.forEach(r => inc[r] = 0);
        for (const t of this.townsOf(p)) { const ti = this.townIncome(t); for (const k in ti) inc[k] += ti[k]; }
        for (const id in G.objects) { const o = G.objects[id]; if (o.type === 'mine' && o.owner === p.id) inc[o.res] += MINE_INFO[o.res].amt; }
        for (const h of this.heroesOf(p)) inc.gold += this.skillVal(h, 'estates') + this.artBonus(h, 'gold');
        if (!p.human && G.diff) { const k = DIFFICULTY[G.diff].aiRes; for (const r of RES) inc[r] = Math.round(inc[r] * k); }
        return inc;
    },
    canAfford(p, cost) { for (const k in cost) if ((p.res[k] || 0) < cost[k]) return false; return true; },
    pay(p, cost) { for (const k in cost) p.res[k] -= cost[k]; },
    buildState(t, bid) { // 'built' | 'today' | 'na' | 'req' | 'res' | 'ok'
        const p = G.players[t.owner];
        if (t.built[bid]) return 'built';
        if (bid.startsWith('mage') && +bid[4] > MAGE_LEVELS[t.faction]) return 'na';
        if (bid === 'hall4' && p && this.townsOf(p).some(o => o.built.hall4)) return 'na';
        if (t.builtToday) return 'today';
        for (const r of BUILDINGS[bid].req) if (!t.built[r]) return 'req';
        if (!p || !this.canAfford(p, buildingCost(t.faction, bid))) return 'res';
        return 'ok';
    },
    build(t, bid) {
        const p = G.players[t.owner];
        if (this.buildState(t, bid) !== 'ok') return false;
        this.pay(p, buildingCost(t.faction, bid));
        t.built[bid] = true; t.builtToday = true;
        if (/^d\d$/.test(bid)) t.avail[+bid[1] - 1] += this.growth(t, +bid[1]);
        if (bid.startsWith('mage')) {
            const h = this.heroInTown(t);
            if (h && h.owner === t.owner) this.learnGuild(h, t);
        }
        return true;
    },
    townRecruitCid(t, tier) {
        const u = FACTION_UNITS[t.faction][tier - 1];
        return t.built['u' + tier] ? u[1] : u[0];
    },
    // Adds recruits to the garrison, or to the visiting hero when the garrison has no room.
    recruit(p, t, tier, n, cid) {
        cid = cid || this.townRecruitCid(t, tier);
        n = Math.min(n, t.avail[tier - 1]);
        if (n <= 0 || !this.canAfford(p, creatureCost(cid, n))) return false;
        const h = this.heroInTown(t);
        let dest = null;
        if (this.armyCanAdd(t.garrison, cid)) dest = t.garrison;
        else if (h && h.owner === p.id && this.armyCanAdd(h.army, cid)) dest = h.army;
        if (!dest) return false;
        this.pay(p, creatureCost(cid, n));
        this.armyAdd(dest, cid, n);
        t.avail[tier - 1] -= n;
        return true;
    },
    maxAfford(p, cid, cap) {
        const c = creatureCost(cid, 1); let n = cap;
        for (const k in c) if (c[k] > 0) n = Math.min(n, Math.floor((p.res[k] || 0) / c[k]));
        return Math.max(0, n);
    },
    upgradeCost(cid, n) {
        const a = creatureCost(cid, n), b = creatureCost(CREATURES[cid].upTo, n), out = {};
        for (const k of RES) { const v = (b[k] || 0) - (a[k] || 0); if (v > 0) out[k] = v; }
        return out;
    },
    canUpgradeIn(t, cid) {
        const c = CREATURES[cid];
        return t && c.upTo && c.faction === t.faction && t.built['u' + c.tier];
    },
    marketCount(p) { return this.townsOf(p).filter(t => t.built.market).length; },
    buyPrice(p, r) { const k = Math.max(1, this.marketCount(p)); return Math.round((r === 'wood' || r === 'ore' ? 1000 : 2000) / (1 + 0.25 * (k - 1))); },
    sellPrice(p, r) { const k = Math.max(1, this.marketCount(p)); return Math.round((r === 'wood' || r === 'ore' ? 50 : 100) * (1 + 0.25 * (k - 1))); },

    // ---------------- turn flow ----------------
    beginTurn(p) {
        const inc = this.income(p);
        for (const r of RES) p.res[r] += inc[r];
        for (const h of this.heroesOf(p)) {
            h.mp = this.maxMove(h);
            if (h.mana < this.maxMana(h)) h.mana = Math.min(this.maxMana(h), h.mana + this.manaRegen(h));
            const t = this.townOfHero(h);
            if (t && t.owner === p.id && t.built.mage1) h.mana = Math.max(h.mana, this.maxMana(h));
        }
        for (const t of this.townsOf(p)) t.builtToday = false;
        if (p.towns.length === 0) p.noTown = (p.noTown || 0) + 1; else p.noTown = 0;
    },
    nextDay() {
        G.day++;
        if ((G.day - 1) % 7 === 0) this.newWeek();
    },
    newWeek() {
        const pool = CREATURE_IDS.filter(c => CREATURES[c].faction !== 'neutral' && CREATURES[c].tier <= 5);
        G.weekOf = R.chance(0.8) ? R.pick(pool) : null;
        for (const id in G.objects) {
            const o = G.objects[id];
            if (o.type === 'town') for (let t = 1; t <= 7; t++) if (o.built['d' + t]) o.avail[t - 1] += this.growth(o, t);
            if (o.type === 'dwelling') o.avail = Math.min(o.avail + CREATURES[o.cid].grow, CREATURES[o.cid].grow * 3);
            if (o.type === 'monster' && o.count < o.count0 * 3) o.count = Math.ceil(o.count * 1.1);
        }
        for (const p of G.players) if (p.alive) this.refreshTavern(p);
    },
    // Marks players without towns or heroes (or townless for 7 days) as defeated.
    checkElimination() {
        const out = [];
        for (const p of G.players) {
            if (!p.alive) continue;
            if ((p.towns.length === 0 && p.heroes.length === 0) || (p.towns.length === 0 && p.noTown >= 7)) {
                p.alive = false;
                for (const h of this.heroesOf(p)) this.removeHero(h);
                for (const id in G.objects) { const o = G.objects[id]; if ((o.type === 'mine' || o.type === 'dwelling') && o.owner === p.id) o.owner = -1; }
                out.push(p);
            }
        }
        return out;
    },
    setOwner(o, owner) {
        if (o.type === 'town') {
            if (o.owner >= 0) { const op = G.players[o.owner]; op.towns = op.towns.filter(id => id !== o.id); }
            if (owner >= 0) G.players[owner].towns.push(o.id);
        }
        o.owner = owner;
    },
    removeObj(o) {
        G.vis[this.idx(o.x, o.y)] = -1;
        delete G.objects[o.id];
    },

    // ---------------- save / load ----------------
    serialize() {
        const s = Object.assign({}, G);
        s.players = G.players.map(p => Object.assign({}, p, { explored: Array.from(p.explored).join('') }));
        s.block = Array.from(G.block); s.vis = Array.from(G.vis); s.terrain = Array.from(G.terrain); s.road = Array.from(G.road);
        return JSON.stringify(s);
    },
    deserialize(str) {
        const s = JSON.parse(str);
        s.players.forEach(p => { p.explored = Uint8Array.from(p.explored, ch => +ch); });
        s.block = Uint8Array.from(s.block); s.vis = Int32Array.from(s.vis); s.terrain = Uint8Array.from(s.terrain); s.road = Uint8Array.from(s.road);
        G = s;
    },
    save(slot) {
        try { localStorage.setItem('heroes_save_' + slot, this.serialize()); localStorage.setItem('heroes_meta_' + slot, JSON.stringify({ date: this.dateStr(), when: new Date().toLocaleString(), size: G.W })); return true; }
        catch (e) { return false; }
    },
    load(slot) {
        try { const s = localStorage.getItem('heroes_save_' + slot); if (!s) return false; this.deserialize(s); return true; }
        catch (e) { return false; }
    },
    saveMeta(slot) { try { return JSON.parse(localStorage.getItem('heroes_meta_' + slot)); } catch (e) { return null; } },
};

class MinHeap {
    constructor() { this.k = []; this.v = []; }
    get size() { return this.k.length; }
    push(key, val) {
        const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
        while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
        k[i] = key; v[i] = val;
    }
    pop() {
        const k = this.k, v = this.v, top = [k[0], v[0]], lk = k.pop(), lv = v.pop();
        if (k.length) {
            let i = 0; const n = k.length;
            while (true) {
                let c = 2 * i + 1; if (c >= n) break;
                if (c + 1 < n && k[c + 1] < k[c]) c++;
                if (k[c] >= lk) break;
                k[i] = k[c]; v[i] = v[c]; i = c;
            }
            k[i] = lk; v[i] = lv;
        }
        return top;
    }
}
