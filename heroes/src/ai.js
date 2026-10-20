// Computer opponents: town management (build, recruit, hire) and hero movement toward the most
// valuable reachable target, re-evaluated after every visit.
const AI = {
    io: {
        human: false, scene: null,
        msg: async () => { }, ask: async () => true, pick: async () => 0, sfx: () => { },
        notify: async (s) => { if (Adv.humanIO) await Adv.humanIO.notify(s); },
        onStep: null, refresh: null,
    },
    BUILD_ORDER: ['d2', 'hall2', 'market', 'd3', 'citadel', 'd4', 'mage1', 'hall3', 'd5', 'u1', 'u2', 'castle', 'u3', 'd6', 'blacksmith', 'u4', 'mage2', 'd7', 'u5', 'hall4', 'u6', 'u7', 'silo', 'mage3', 'mage4', 'mage5'],

    async turn(p, io) {
        this.io.onStep = io.onStep; this.io.refresh = io.refresh; this.io.scene = io.scene;
        if (!p.heroes.length) this.hire(p);
        for (const t of Core.townsOf(p)) this.manageTown(p, t);
        this.hire(p);
        const heroes = Core.heroesOf(p).sort((a, b) => Core.armyPower(b.army, b) - Core.armyPower(a.army, a));
        for (const h of heroes) {
            if (!G.heroes[h.id]) continue;
            await this.moveHero(p, h, heroes[0] === h);
            if (!p.alive || this.gameOver()) return;
        }
        for (const t of Core.townsOf(p)) this.recruitAll(p, t);
    },
    gameOver() { const h = Core.human(); return (h && !h.alive) || G.players.filter(p => p.alive).length < 2; },

    manageTown(p, t) {
        // keep enough gold to recruit at the start of a week
        const reserve = (G.day % 7 === 0) ? 3000 : 0;
        for (const want of this.BUILD_ORDER) {
            const bid = this.nextStep(t, want);
            if (!bid) continue;
            let st = Core.buildState(t, bid);
            if (st === 'res') { this.buyFor(p, buildingCost(t.faction, bid), reserve + 1500); st = Core.buildState(t, bid); }
            if (st === 'ok' && p.res.gold - buildingCost(t.faction, bid).gold >= reserve) { Core.build(t, bid); break; }
            if (st === 'today') break;
        }
        this.recruitAll(p, t);
    },
    // trade gold at the market for whatever else a purchase needs, keeping `keep` gold
    buyFor(p, cost, keep) {
        if (!Core.marketCount(p)) return;
        let gold = (cost.gold || 0) + keep;
        const need = {};
        for (const k in cost) if (k !== 'gold' && p.res[k] < cost[k]) { need[k] = cost[k] - p.res[k]; gold += need[k] * Core.buyPrice(p, k); }
        if (!Object.keys(need).length || p.res.gold < gold) return;
        for (const k in need) { p.res.gold -= need[k] * Core.buyPrice(p, k); p.res[k] += need[k]; }
    },
    // first missing prerequisite on the way to `bid`
    nextStep(t, bid, depth = 0) {
        if (depth > 8 || t.built[bid]) return null;
        if (bid.startsWith('mage') && +bid[4] > MAGE_LEVELS[t.faction]) return null;
        for (const r of BUILDINGS[bid].req) if (!t.built[r]) return this.nextStep(t, r, depth + 1);
        return bid;
    },
    recruitAll(p, t) {
        // a kingdom without heroes saves up to hire one
        if (!p.heroes.length && p.res.gold < 5000) return;
        for (let tier = 7; tier >= 1; tier--) {
            if (!t.built['d' + tier]) continue;
            const cid = Core.townRecruitCid(t, tier);
            const n = Core.maxAfford(p, cid, t.avail[tier - 1]);
            if (n > 0) Core.recruit(p, t, tier, n, cid);
        }
        // a hero sitting in town takes the new troops
        const h = Core.heroInTown(t);
        if (h && h.owner === p.id) this.inTown(h, t);
    },
    hire(p) {
        const want = Math.min(2 + Math.floor(Core.week() / 2), 5);
        if (p.heroes.length >= want || p.res.gold < (p.heroes.length ? 4500 : 2500)) return;
        for (const t of Core.townsOf(p)) {
            if (!t.built.tavern || Core.heroAt(t.x, t.y)) continue;
            const tpl = (p.tavern || []).find(k => !G.heroTpl[k].used);
            if (!tpl) return;
            const h = Core.hireHero(p, t, tpl);
            if (h) { Adv.log(`${PLAYER_COLORS[p.color].name} hires ${h.name}.`); return; }
        }
    },
    // take the garrison into the hero's army, keeping the strongest stacks
    inTown(h, t) {
        if (t.owner !== h.owner) return;
        Core.learnGuild(h, t);
        Core.armyMergeInto(h.army, t.garrison);
        for (let i = 0; i < 7; i++) {
            const g = t.garrison[i]; if (!g) continue;
            let wi = -1, wv = Infinity;
            h.army.forEach((s, j) => { if (s) { const v = CREATURES[s.cid].value * s.n; if (v < wv) { wv = v; wi = j; } } });
            if (wi >= 0 && CREATURES[g.cid].value * g.n > wv) { const tmp = h.army[wi]; h.army[wi] = g; t.garrison[i] = tmp; }
        }
        // buy war machines once rich
        const p = G.players[h.owner];
        if (t.built.blacksmith && !h.machines.ballista && p.res.gold > 8000) { p.res.gold -= WAR_MACHINES.ballista.cost; h.machines.ballista = 1; }
        if (t.built.blacksmith && !h.machines.tent && p.res.gold > 6000) { p.res.gold -= WAR_MACHINES.tent.cost; h.machines.tent = 1; }
        // upgrade stacks
        for (const s of h.army) if (s && Core.canUpgradeIn(t, s.cid)) {
            const cost = Core.upgradeCost(s.cid, s.n);
            if (Core.canAfford(p, cost) && p.res.gold - (cost.gold || 0) > 1500) { Core.pay(p, cost); s.cid = CREATURES[s.cid].upTo; }
        }
    },
    exchange(a, b) {
        // the stronger hero takes the better troops
        const [main, other] = Core.armyPower(a.army, a) >= Core.armyPower(b.army, b) ? [a, b] : [b, a];
        const all = [...main.army, ...other.army].filter(Boolean);
        all.sort((x, y) => CREATURES[y.cid].value * y.n - CREATURES[x.cid].value * x.n);
        const keepOther = all.pop();
        main.army = Core.emptyArmy(); other.army = Core.emptyArmy();
        for (const s of all) if (!Core.armyAdd(main.army, s.cid, s.n)) Core.armyAdd(other.army, s.cid, s.n);
        if (keepOther) Core.armyAdd(other.army, keepOther.cid, keepOther.n);
        if (!other.army.some(Boolean)) { const i = main.army.findIndex(Boolean); const s = main.army[i]; if (s.n > 1) { s.n--; other.army[0] = { cid: s.cid, n: 1 }; } }
    },
    pickSkill(h, opts) {
        if (!opts.length) return 0;
        const w = CLASSES[h.cls].skills;
        let best = 0, bv = -1;
        opts.forEach((o, i) => { const v = (w[o[0]] || 1) + (o[1] > 1 ? 2 : 0); if (v > bv) { bv = v; best = i; } });
        return best;
    },

    // ---------------- hero movement ----------------
    async moveHero(p, h, isMain) {
        for (let iter = 0; iter < 12; iter++) {
            if (!G.heroes[h.id] || h.mp <= 0) return;
            const r = Core.reach(h);
            const tgt = this.pickTarget(p, h, r, isMain);
            if (!tgt) return;
            const path = Core.pathTo(h, tgt.x, tgt.y, r);
            if (!path || !path.length) return;
            const res = await Adv.moveHero(h, path, this.io);
            if (this.gameOver()) return;
            if (res === 'tired' || res === 'arrived') {
                if (res === 'arrived' && tgt.town && G.heroes[h.id]) this.inTown(h, tgt.town);
                if (res === 'tired') return;
            }
        }
    },
    pickTarget(p, h, r, isMain) {
        const my = Core.armyPower(h.army, h);
        const mm = Core.maxMove(h);
        const diffK = DIFFICULTY[G.diff].ai;
        let best = null, bs = 0;
        // enemy heroes that could catch us near a target
        const threats = [];
        for (const id in G.heroes) {
            const e = G.heroes[id];
            if (e.owner === h.owner || e.owner < 0 || e.x < 0) continue;
            const ep = Core.armyPower(e.army, e);
            if (ep > my * 0.9) threats.push({ x: e.x, y: e.y, r: Core.maxMove(e) / 100 + 2 });
        }
        const consider = (x, y, v, extra) => {
            const d = r.dist[Core.idx(x, y)];
            if (!isFinite(d) || v <= 0) return;
            const days = d / mm;
            if (days > 5) return;
            for (const t of threats) if (Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) <= t.r) { v *= 0.1; break; }
            const s = v * Math.pow(0.72, days) / (1 + d / 4000);
            if (s > bs) { bs = s; best = Object.assign({ x, y }, extra); }
        };
        const canBeat = (power, k = 1.5) => my > power * k / diffK;
        // on the easier settings the AI leaves the player alone for the first week or two
        const spareHuman = owner => owner >= 0 && G.players[owner].human && Core.week() < [3, 2, 1, 1][G.diff];
        for (const id in G.objects) {
            const o = G.objects[id];
            let v = 0;
            const guard = Adv.guardOfObj(o);
            let guardOk = true;
            if (guard) { const gp = Core.armyPower(Adv.monsterArmy(guard), null); guardOk = canBeat(gp); }
            if (!guardOk) continue;
            switch (o.type) {
                case 'res': v = (o.res === 'gold' ? o.amt : o.amt * RES_VALUE[o.res]) * 1.2 + 300; break;
                case 'chest': v = 1600; break;
                case 'campfire': v = 1500; break;
                case 'artifact': v = 1500 * ARTIFACTS[o.aid].cls; break;
                case 'mine': if (o.owner !== h.owner) v = o.res === 'gold' ? 9000 : o.res === 'wood' || o.res === 'ore' ? 4000 : 5000; break;
                case 'dwelling': if (o.avail > 0 && Core.armyCanAdd(h.army, o.cid) && p.res.gold > CREATURES[o.cid].cost * 2) v = Math.min(o.avail, Core.maxAfford(p, o.cid, o.avail)) * CREATURES[o.cid].value * 0.8 + (o.owner !== h.owner ? 500 : 0); break;
                case 'monster': {
                    const mp = Core.armyPower(Adv.monsterArmy(o), null);
                    if (canBeat(mp)) v = 600 + mp * 0.15 + (o.count * CREATURES[o.cid].hp) * 0.8 + (G.road[Core.idx(o.x, o.y)] ? 6000 : 0);
                    break;
                }
                case 'town':
                    if (o.owner === h.owner) {
                        const g = Core.armyPower(o.garrison, null);
                        let weakest = Infinity;
                        h.army.forEach(s => { if (s) weakest = Math.min(weakest, CREATURES[s.cid].value * s.n); });
                        const useful = o.garrison.some(s => s && (h.army.includes(null) || h.army.some(a => a && a.cid === s.cid) || CREATURES[s.cid].value * s.n > weakest));
                        if (useful && g > my * 0.15 && !Core.heroAt(o.x, o.y)) v = Math.min(9000, 1500 + g / Math.max(1, my) * 6000) + (isMain ? 1500 : 0);
                        // learn spells from the guild
                        if (o.built.mage1 && !Core.heroAt(o.x, o.y) && o.guild.some((l, i) => o.built['mage' + (i + 1)] && i + 1 <= Core.maxSpellLvl(h) && l.some(s => !h.spells.includes(s)))) v += 800;
                    } else {
                        const dh = Core.heroAt(o.x, o.y);
                        const dp = Core.armyPower(o.garrison, null) * (1 + (o.built.fort ? 0.3 : 0) + (o.built.castle ? 0.3 : 0)) + (dh ? Core.armyPower(dh.army, dh) : 0);
                        if (canBeat(dp, 1.4) && !spareHuman(o.owner)) v = (o.owner >= 0 ? 30000 : 15000);
                    }
                    if (v) { consider(o.x, o.y, v, { town: o.owner === h.owner ? o : null }); v = 0; }
                    break;
                case 'site': v = this.siteValue(h, o); break;
            }
            if (guard && v) v += 800;
            if (v) consider(o.x, o.y, v);
        }
        for (const id in G.heroes) {
            const e = G.heroes[id];
            if (e.owner === h.owner || e.owner < 0) continue;
            if (Core.townOfHero(e) || spareHuman(e.owner)) continue;
            const ep = Core.armyPower(e.army, e);
            if (canBeat(ep, 1.3)) consider(e.x, e.y, 12000 + ep * 0.3);
        }
        // nothing worthwhile: explore toward unexplored tiles
        if (!best) {
            const ex = p.explored;
            let bd = Infinity;
            for (let i = 0; i < r.dist.length; i += 3) {
                if (!isFinite(r.dist[i]) || r.dist[i] < 200 || r.stop[i]) continue;
                const x = i % G.W, y = (i / G.W) | 0;
                let unk = 0;
                for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) if (Core.inMap(x + dx, y + dy) && !ex[Core.idx(x + dx, y + dy)]) unk++;
                if (unk >= 3 && r.dist[i] < bd) { bd = r.dist[i]; best = { x, y }; }
            }
        }
        return best;
    },
    siteValue(h, o) {
        const k = o.kind, w = Core.week();
        if (['arena', 'merc', 'marletto', 'staraxis', 'garden', 'learnstone', 'tree', 'witch', 'sanctuary'].includes(k)) {
            if (h.visited[o.id]) return 0;
            if (k === 'witch' && (Core.skillLvl(h, o.skill) || h.skills.length >= 8 || (CLASSES[h.cls].skills[o.skill] || 0) < 3)) return 0;
            if (k === 'sanctuary' && h.lvl < 10) return 0;
            return { arena: 4000, tree: 5000, learnstone: 2500, sanctuary: 6000 }[k] || 2500;
        }
        if (k === 'windmill' || k === 'waterwheel') return o.week === w ? 0 : 1500;
        if (k.startsWith('shrine')) return !h.spells.includes(o.spell) && SPELLS[o.spell].lvl <= Core.maxSpellLvl(h) ? 1500 : 0;
        if (k === 'scholar') return 2000;
        if (k === 'pandora') return o.trap ? 0 : 4000;
        if (k === 'prison') return G.players[h.owner].heroes.length < 6 ? 5000 : 0;
        if (k === 'well') return h.mana < Core.maxMana(h) / 2 ? 600 : 0;
        if (k === 'stables') return h.stableWeek !== w ? 900 : 0;
        if (k === 'oasis') return h.weekly['o' + o.id] !== w ? 900 : 0;
        return 0;
    },
};
