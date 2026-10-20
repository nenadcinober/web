// Adventure-map rules: walking heroes, visiting objects, starting battles and applying their results.
// Every user-facing effect goes through an `io` object so the same code serves the human (dialogs,
// animation) and the AI (instant decisions).
const Adv = {
    // set by the adventure scene: async (cfg) => battle result, shown on screen
    showBattle: null,

    playerOf(h) { return G.players[h.owner]; },
    log(s) { G.log.push(`${Core.dateStr()}: ${s}`); if (G.log.length > 60) G.log.shift(); },

    async moveHero(h, path, io) {
        const p = this.playerOf(h);
        for (let k = 0; k < path.length; k++) {
            const st = path[k];
            const px = h.x, py = h.y;
            const cost = Core.stepCost(h, px, py, st.x, st.y);
            const fresh = h.mp >= Core.maxMove(h);
            if (h.mp < cost && !fresh) return 'tired';
            const last = k === path.length - 1;
            const obj = Core.visAt(st.x, st.y);
            const other = Core.heroAt(st.x, st.y);
            if (other && other !== h) {
                h.mp = Math.max(0, h.mp - cost);
                h.dest = null;
                await this.meetHero(h, other, io);
                return 'visited';
            }
            if (obj && obj.type !== 'town') {
                h.mp = Math.max(0, h.mp - cost);
                h.dest = null;
                await this.visit(h, obj, io);
                return 'visited';
            }
            // step onto the tile
            h.mp = Math.max(0, h.mp - cost);
            h.x = st.x; h.y = st.y;
            const rev = Core.reveal(p, h.x, h.y, Core.sight(h));
            if (io.onStep) await io.onStep(h, px, py, rev);
            if (obj && obj.type === 'town') { h.dest = null; await this.visit(h, obj, io); return 'visited'; }
            const guard = Core.guardOf(h.x, h.y);
            if (guard) {
                h.dest = null;
                await this.attackMonster(h, guard, io, true);
                return 'fought';
            }
            if (!G.heroes[h.id]) return 'dead';
        }
        h.dest = null;
        return 'arrived';
    },

    guardOfObj(o) {
        if (o.type === 'monster' || o.type === 'town') return null;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const m = Core.inMap(o.x + dx, o.y + dy) && Core.visAt(o.x + dx, o.y + dy);
            if (m && m.type === 'monster') return m;
        }
        return null;
    },

    async visit(h, o, io) {
        const p = this.playerOf(h);
        const guard = this.guardOfObj(o);
        if (guard) {
            const ok = io.human ? await io.ask(`The ${this.objName(o)} is guarded by ${stackWord(guard.count).toLowerCase()} ${CREATURES[guard.cid].name}. Will you fight them?`, [{ key: Art.creature(io.scene, guard.cid), label: stackRange(guard.count), scale: 0.6 }]) : true;
            if (!ok) return;
            const won = await this.attackMonster(h, guard, io, false);
            if (!won || !G.heroes[h.id]) return;
        }
        const S = io.scene;
        switch (o.type) {
            case 'res': {
                p.res[o.res] += o.amt;
                Core.removeObj(o);
                io.sfx('pickup');
                if (io.human) await io.msg(`You find ${o.amt} ${RES_NAME[o.res].toLowerCase()}.`, [{ key: 'res_' + o.res, label: String(o.amt), scale: 1.5 }]);
                break;
            }
            case 'campfire': {
                const r = R.pick(['wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems']), n = R.int(4, 6), g = R.int(4, 6) * 100;
                p.res.gold += g; p.res[r] += n;
                Core.removeObj(o); io.sfx('pickup');
                if (io.human) await io.msg('Ransacking an abandoned campsite, you find some resources.', [{ key: 'res_gold', label: String(g), scale: 1.5 }, { key: 'res_' + r, label: String(n), scale: 1.5 }]);
                break;
            }
            case 'chest': {
                Core.removeObj(o); io.sfx('pickup');
                if (R.chance(0.12)) {
                    const aid = R.pick(ART_IDS.filter(a => ARTIFACTS[a].cls === 1));
                    Core.equip(h, aid);
                    if (io.human) await io.msg(`Inside the chest you find the ${ARTIFACTS[aid].name}.`, [{ key: Art.artifact(S, aid), label: ARTIFACTS[aid].name }]);
                    break;
                }
                const g = R.pick([1000, 1500, 2000]);
                let take = 0;
                if (io.human) take = await io.pick('After scouring the area, you discover an old hoard of treasure. Keep the gold, or give it to the peasants for experience?', [{ key: 'res_gold', label: `${g} gold`, scale: 1.5 }, { key: 'prim_know', label: `${g - 500} exp.` }]);
                else take = h.lvl < 6 && p.res.gold > 5000 ? 1 : 0;
                if (take === 1) { Core.giveExp(h, g - 500); await this.levelUps(h, io); }
                else p.res.gold += g;
                break;
            }
            case 'artifact': {
                Core.removeObj(o); io.sfx('pickup');
                Core.equip(h, o.aid);
                const a = ARTIFACTS[o.aid];
                if (io.human) await io.msg(`You find the ${a.name}.\n${this.artDesc(o.aid)}`, [{ key: Art.artifact(S, o.aid), label: ART_CLASS[a.cls] }]);
                break;
            }
            case 'mine': {
                if (o.owner !== h.owner) {
                    o.owner = h.owner; io.sfx('coin');
                    this.log(`${PLAYER_COLORS[p.color].name} captures the ${MINE_INFO[o.res].name}.`);
                    if (io.human) await io.msg(`You claim the ${MINE_INFO[o.res].name}. It will produce ${MINE_INFO[o.res].amt} ${RES_NAME[o.res].toLowerCase()} per day.`, [{ key: 'res_' + o.res, label: `+${MINE_INFO[o.res].amt}/day`, scale: 1.5 }]);
                } else if (io.human) await io.msg(`The ${MINE_INFO[o.res].name} is already yours.`);
                break;
            }
            case 'dwelling': await this.visitDwelling(h, o, io); break;
            case 'monster': await this.attackMonster(h, o, io, false); break;
            case 'site': await this.visitSite(h, o, io); break;
            case 'town': await this.visitTown(h, o, io); break;
        }
        if (io.refresh) io.refresh();
    },

    async visitDwelling(h, o, io) {
        const p = this.playerOf(h), c = CREATURES[o.cid];
        if (o.owner !== h.owner) { o.owner = h.owner; }
        if (o.avail <= 0) { if (io.human) await io.msg(`No ${c.name} are available to recruit this week.`); return; }
        const max = Math.min(o.avail, Core.maxAfford(p, o.cid, o.avail));
        if (!Core.armyCanAdd(h.army, o.cid)) { if (io.human) await io.msg(`You have no room in your army for ${c.name}.`); return; }
        let n;
        if (io.human) {
            if (max <= 0) { await io.msg(`${o.avail} ${c.name} would join you, but you cannot afford them (${c.cost} gold each).`); return; }
            n = await UI.amount(io.scene, `Recruit ${c.name}`, max, { render: v => `${c.name}: ${v} of ${o.avail} available\nCost: ${fmt(v * c.cost)} gold${c.extra ? ' + ' + Object.entries(c.extra).map(([k, x]) => x * v + ' ' + k).join(', ') : ''}`, ok: 'Recruit' });
        } else n = max;
        if (n > 0) { Core.pay(p, creatureCost(o.cid, n)); Core.armyAdd(h.army, o.cid, n); o.avail -= n; io.sfx('coin'); }
    },

    async visitTown(h, t, io) {
        const p = this.playerOf(h);
        if (t.owner === h.owner) {
            Core.learnGuild(h, t);
            if (io.human) await io.openTown(t);
            else AI.inTown(h, t);
            return;
        }
        // siege
        const defender = Core.heroAt(t.x, t.y);
        const name = t.owner >= 0 ? PLAYER_COLORS[G.players[t.owner].color].name : 'neutral';
        if (io.human) {
            const ok = await io.ask(`Attack the ${name} town of ${t.name}?`);
            if (!ok) { h.x = this.backTile(h, t).x; h.y = this.backTile(h, t).y; io.refresh && io.refresh(); return; }
        }
        const won = await this.fight(h, { town: t, hero: defender && defender.owner !== h.owner ? defender : null }, io);
        if (won && G.heroes[h.id]) {
            const old = t.owner;
            Core.setOwner(t, h.owner);
            t.garrison = Core.emptyArmy();
            h.x = t.x; h.y = t.y;
            Core.reveal(p, t.x, t.y, 8);
            Core.learnGuild(h, t);
            this.log(`${PLAYER_COLORS[p.color].name} captures ${t.name}.`);
            io.sfx('victory');
            if (io.human) await io.msg(`${t.name} is now yours!`, [{ key: 'town_' + t.faction, scale: 0.6 }]);
            if (old >= 0 && G.players[old].human && Adv.humanIO) await Adv.humanIO.notify(`${PLAYER_COLORS[p.color].name} has captured your town of ${t.name}!`);
        } else if (G.heroes[h.id]) {
            const b = this.backTile(h, t); h.x = b.x; h.y = b.y;
        }
    },
    // a hero that fails to enter a town steps back in front of the gate
    backTile(h, t) {
        if (h.x !== t.x || h.y !== t.y) return { x: h.x, y: h.y };
        for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) {
            const x = t.x + dx, y = t.y + dy;
            if (Core.passable(x, y) && !Core.visAt(x, y) && !Core.heroAt(x, y)) return { x, y };
        }
        return { x: t.x, y: t.y + 1 };
    },

    async meetHero(h, o, io) {
        if (o.owner === h.owner) {
            if (io.human) await io.exchange(h, o);
            else AI.exchange(h, o);
            return;
        }
        const t = Core.townOfHero(o);
        if (t) return this.visitTown(h, t, io);
        if (io.human && !await io.ask(`Attack ${o.name} (${PLAYER_COLORS[G.players[o.owner].color].name})?`)) return;
        await this.fight(h, { hero: o }, io);
    },

    async attackMonster(h, m, io, ambushed) {
        const p = this.playerOf(h);
        const mp = Core.armyPower(this.monsterArmy(m), null), hp = Core.armyPower(h.army, h);
        const c = CREATURES[m.cid];
        const ratio = hp / Math.max(1, mp);
        // weak monsters may offer to join, or flee
        if (!ambushed || ratio > 2) {
            if (ratio > 2.5 && m.agg <= 3 && Core.armyCanAdd(h.army, m.cid)) {
                const cost = ratio > 6 ? 0 : m.count * c.cost;
                let ok;
                if (io.human) ok = await io.ask(cost ? `The ${c.name} are impressed by your might and offer to join you for ${fmt(cost)} gold. Accept?` : `The ${c.name} are so impressed by your army that they wish to join you. Accept?`, [{ key: Art.creature(io.scene, m.cid), label: `${m.count}`, scale: 0.6 }]);
                else ok = p.res.gold >= cost + 2000;
                if (ok && p.res.gold >= cost) { p.res.gold -= cost; Core.armyAdd(h.army, m.cid, m.count); Core.removeObj(m); io.refresh && io.refresh(); return true; }
            } else if (ratio > 5 && m.agg <= 6) {
                let flee;
                if (io.human) flee = !(await io.ask(`The ${c.name} are terrified of your army and try to run away. Pursue them?`, [{ key: Art.creature(io.scene, m.cid), label: stackRange(m.count), scale: 0.6 }], { yes: 'Pursue', no: 'Let go' }));
                else flee = false;
                if (flee) { Core.removeObj(m); io.refresh && io.refresh(); return true; }
            }
        }
        return this.fight(h, { monster: m }, io);
    },

    monsterArmy(m) {
        const a = Core.emptyArmy();
        const k = Math.max(1, Math.min(m.count, m.count < 4 ? m.count : m.count < 20 ? 3 : m.count < 60 ? 4 : 5));
        let left = m.count;
        for (let i = 0; i < k; i++) { const n = Math.ceil(left / (k - i)); a[[3, 1, 5, 0, 6][i]] = { cid: m.cid, n }; left -= n; }
        return a;
    },

    // def: {monster} | {hero} | {town, hero?} | {army, label}
    async fight(h, def, io) {
        const p = this.playerOf(h);
        let dArmy, dHero = def.hero || null, siege = 0, dOwner = -1, towerPower = 0, tavern = false;
        if (def.monster) dArmy = this.monsterArmy(def.monster);
        else if (def.town) {
            const t = def.town;
            dOwner = t.owner;
            siege = t.built.castle ? 3 : t.built.citadel ? 2 : t.built.fort ? 1 : 0;
            towerPower = 1 + [1, 2, 3, 4, 5, 6, 7].filter(i => t.built['d' + i]).length;
            tavern = !!t.built.tavern;
            if (dHero) { Core.armyMergeInto(dHero.army, t.garrison); dArmy = dHero.army; }
            else dArmy = t.garrison.map(s => s && { ...s });
            if (!dArmy.some(Boolean)) {
                return true; // empty town: walk in
            }
        } else if (dHero) { dArmy = dHero.army; dOwner = dHero.owner; }
        else dArmy = def.army;
        const humanSide = p.human ? 0 : (dOwner >= 0 && G.players[dOwner].human ? 1 : -1);
        const cfg = {
            sides: [
                { hero: h, army: h.army, owner: h.owner, human: humanSide === 0 },
                { hero: dHero, army: dArmy, owner: dOwner, human: humanSide === 1 },
            ],
            siege, towerPower, tavern, terrain: G.terrain[Core.idx(h.x, h.y)],
            title: def.town ? `Siege of ${def.town.name}` : def.monster ? `${CREATURES[def.monster.cid].name}` : dHero ? `${h.name} vs ${dHero.name}` : 'Battle',
        };
        let res;
        if (humanSide >= 0 && this.showBattle) res = await this.showBattle(cfg);
        else res = CombatAI.simulate(cfg).res;
        const won = res.winner === 0;
        await this.applyBattle(h, dHero, def, res, io, humanSide);
        return won && !!G.heroes[h.id];
    },

    async applyBattle(h, dHero, def, res, io, humanSide) {
        const sides = [h, dHero];
        const w = res.winner;
        // armies and mana
        sides.forEach((hero, i) => {
            if (!hero) return;
            hero.mana = Math.max(0, Math.round(res.sides[i].mana));
            for (const m in res.sides[i].machinesLost) hero.machines[m] = 0;
            hero.army = res.sides[i].army;
            hero.tmpMorale = 0; hero.tmpLuck = 0;
        });
        if (def.monster) {
            if (w === 0) Core.removeObj(def.monster);
            else { const left = Core.armyTotal(res.sides[1].army); if (left > 0) def.monster.count = left; else Core.removeObj(def.monster); }
        }
        if (def.town && !dHero) {
            def.town.garrison = w === 1 ? res.sides[1].army : Core.emptyArmy();
        }
        if (def.town && dHero && w === 1) { def.town.garrison = Core.emptyArmy(); }
        if (def.army && def.onResult) def.onResult(res);
        // the losing heroes leave the map
        const loserHero = sides[1 - w];
        const winnerHero = sides[w];
        if (winnerHero) {
            let exp = res.sides[w].killedHp + (loserHero ? 500 : 0);
            Core.giveExp(winnerHero, exp);
            // necromancy
            const nec = Core.skillVal(winnerHero, 'necromancy');
            if (nec) {
                const raised = Math.floor(res.sides[w].killedHp * nec / 100 / 6);
                if (raised > 0 && Core.armyAdd(winnerHero.army, 'skeleton', raised) && G.players[winnerHero.owner].human) {
                    winnerHero._raised = raised;
                }
            }
        }
        if (loserHero) {
            const lp = G.players[loserHero.owner];
            const fled = res.sides[1 - w].fled, surr = res.sides[1 - w].surrendered;
            if (winnerHero) {
                for (const sl of ART_SLOTS) if (loserHero.arts[sl] && !fled && !surr) { Core.equip(winnerHero, loserHero.arts[sl]); delete loserHero.arts[sl]; }
                if (!fled && !surr) { for (const a of loserHero.pack) Core.equip(winnerHero, a); loserHero.pack = []; }
            }
            this.log(`${loserHero.name} (${PLAYER_COLORS[lp.color].name}) ${fled ? (surr ? 'surrenders' : 'retreats') : 'is defeated'}.`);
            if (fled) {
                if (!surr) loserHero.army = Core.emptyArmy();
                lp.heroes = lp.heroes.filter(id => id !== loserHero.id);
                loserHero.x = loserHero.y = -1;
                delete G.heroes[loserHero.id];
                lp.retreat = (lp.retreat || []).concat([loserHero]).slice(-2);
                if (surr) lp.res.gold = Math.max(0, lp.res.gold - (loserHero._surrCost || 0));
            } else Core.removeHero(loserHero);
            if (lp.human && humanSide < 0 && Adv.humanIO) await Adv.humanIO.notify(`${loserHero.name} has been defeated.`);
        }
        if (winnerHero && G.heroes[winnerHero.id]) {
            if (G.players[winnerHero.owner].human) {
                const hio = Adv.humanIO;
                if (winnerHero._raised) { await hio.msg(`Your Necromancy skill raises ${winnerHero._raised} Skeletons from the fallen.`, [{ key: Art.creature(hio.scene, 'skeleton'), label: '+' + winnerHero._raised, scale: 0.6 }]); delete winnerHero._raised; }
                await this.levelUps(winnerHero, hio);
            } else await this.levelUps(winnerHero, AI.io);
        }
        if (h && G.heroes[h.id] && !h.army.some(Boolean)) Core.removeHero(h);
        Core.checkElimination();
    },

    async levelUps(h, io) {
        while (G.heroes[h.id] && Core.pendingLevel(h)) {
            const roll = Core.rollLevel(h);
            let pick = 0;
            if (io.human && G.players[h.owner].human) pick = await io.levelUp(h, roll);
            else pick = AI.pickSkill(h, roll.opts);
            if (roll.opts[pick]) Core.applySkill(h, roll.opts[pick]);
        }
    },

    async visitSite(h, o, io) {
        const p = this.playerOf(h), S = io.scene, k = o.kind, name = SITES[k].name, hum = io.human;
        const once = async (txt) => { if (h.visited[o.id]) { if (hum) await io.msg(txt || `You have already visited the ${name}.`); return false; } h.visited[o.id] = 1; return true; };
        const week = Core.week();
        switch (k) {
            case 'windmill': case 'waterwheel': {
                if (o.week === week) { if (hum) await io.msg(`The ${name} has already been visited this week.`); break; }
                o.week = week;
                if (k === 'windmill') { const n = R.int(3, 6); p.res[o.res] += n; io.sfx('pickup'); if (hum) await io.msg(`The keeper of the ${name} gives you ${n} ${RES_NAME[o.res].toLowerCase()}.`, [{ key: 'res_' + o.res, label: String(n), scale: 1.5 }]); }
                else { const g = Core.week() === 1 ? 500 : 1000; p.res.gold += g; io.sfx('coin'); if (hum) await io.msg(`The mill owner shares his profits: ${g} gold.`, [{ key: 'res_gold', label: String(g), scale: 1.5 }]); }
                break;
            }
            case 'well': {
                if (h.weekly['w' + o.id] === G.day) { if (hum) await io.msg('A second drink at the well does nothing.'); break; }
                if (h.mana >= Core.maxMana(h)) { if (hum) await io.msg('A drink at the well has no effect: your spell points are already full.'); break; }
                h.weekly['w' + o.id] = G.day; h.mana = Core.maxMana(h); io.sfx('spell');
                if (hum) await io.msg('A drink at the well restores your spell points.');
                break;
            }
            case 'shrine1': case 'shrine2': case 'shrine3': {
                const sp = SPELLS[o.spell];
                if (h.spells.includes(o.spell)) { if (hum) await io.msg(`You already know ${sp.name}.`); break; }
                if (sp.lvl > Core.maxSpellLvl(h)) { if (hum) await io.msg(`The shrine teaches ${sp.name}, but you need more Wisdom to learn it.`, [{ key: Art.spell(S, o.spell), label: sp.name }]); break; }
                h.spells.push(o.spell); io.sfx('spell');
                if (hum) await io.msg(`You learn the spell ${sp.name}.`, [{ key: Art.spell(S, o.spell), label: sp.name }]);
                break;
            }
            case 'witch': {
                const sk = SKILLS[o.skill], have = Core.skillLvl(h, o.skill);
                if (have) { if (hum) await io.msg(`The witch offers to teach you ${sk.name}, but you already know it.`); break; }
                if (h.skills.length >= 8) { if (hum) await io.msg('You have no room to learn another skill.'); break; }
                if (!hum && (CLASSES[h.cls].skills[o.skill] || 0) < 3) break;
                if (!await once()) break;
                h.skills.push([o.skill, 1]); io.sfx('levelup');
                if (hum) await io.msg(`The witch teaches you Basic ${sk.name}.`, [{ key: Art.skill(S, o.skill), label: 'Basic ' + sk.name }]);
                break;
            }
            case 'arena': {
                if (!await once()) break;
                const pick = hum ? await io.pick('Fighting in the arena hones your skills. Choose your reward:', [{ key: 'prim_att', label: '+2 Attack' }, { key: 'prim_def', label: '+2 Defense' }]) : (CLASSES[h.cls].grow[0] >= CLASSES[h.cls].grow[1] ? 0 : 1);
                if (pick === 1) h.def += 2; else h.att += 2;
                io.sfx('levelup');
                break;
            }
            case 'merc': case 'marletto': case 'staraxis': case 'garden': {
                const st = { merc: 'att', marletto: 'def', staraxis: 'pow', garden: 'know' }[k], nm = { att: 'Attack', def: 'Defense', pow: 'Spell Power', know: 'Knowledge' }[st];
                if (!await once()) break;
                h[st]++; io.sfx('levelup');
                if (hum) await io.msg(`Your ${nm} increases by 1.`, [{ key: 'prim_' + st, label: '+1 ' + nm }]);
                break;
            }
            case 'learnstone': if (!await once()) break; Core.giveExp(h, 1000); io.sfx('levelup'); if (hum) await io.msg('Studying the runes on the stone grants you 1000 experience.'); await this.levelUps(h, io); break;
            case 'tree': if (!await once()) break; h.exp = Math.max(h.exp, LEVEL_EXP[h.lvl + 1]); io.sfx('levelup'); if (hum) await io.msg('Eating the fruit of the Tree of Knowledge, you gain a level!'); await this.levelUps(h, io); break;
            case 'sanctuary':
                if (h.lvl < 10) { if (hum) await io.msg('The librarians will only admit heroes of level 10 or higher.'); break; }
                if (!await once()) break;
                h.att += 2; h.def += 2; h.pow += 2; h.know += 2; io.sfx('levelup');
                if (hum) await io.msg('The Library of Enlightenment grants +2 to all primary skills.');
                break;
            case 'temple': h.tmpMorale = Math.max(h.tmpMorale, 1); io.sfx('spell'); if (hum) await io.msg('A prayer at the temple raises your morale (+1) until your next battle.'); break;
            case 'fountain': { const l = R.int(1, 3); h.tmpLuck = Math.max(h.tmpLuck, l); io.sfx('coin'); if (hum) await io.msg(`You toss a coin into the fountain. Luck +${l} until your next battle.`); break; }
            case 'stables':
                if (h.stableWeek !== week) { h.stableWeek = week; h.mp += 400; io.sfx('pickup'); if (hum) await io.msg('Fresh horses increase your movement for the rest of the week.'); }
                else if (hum) await io.msg('You have already rested your horses here this week.');
                break;
            case 'oasis':
                if (h.weekly['o' + o.id] === week) { if (hum) await io.msg('You have already rested at this oasis this week.'); break; }
                h.weekly['o' + o.id] = week; h.mp += 800; h.tmpMorale = Math.max(h.tmpMorale, 1); io.sfx('pickup');
                if (hum) await io.msg('Resting at the oasis refreshes your troops: +800 movement and +1 morale.');
                break;
            case 'scholar': {
                Core.removeObj(o);
                const r = R.int(0, 2);
                if (r === 0) { const st = R.pick(['att', 'def', 'pow', 'know']); h[st]++; if (hum) await io.msg(`The scholar teaches you: +1 ${({ att: 'Attack', def: 'Defense', pow: 'Spell Power', know: 'Knowledge' })[st]}.`, [{ key: 'prim_' + st }]); }
                else if (r === 1) {
                    const pool = SPELL_IDS.filter(s => SPELLS[s].lvl <= Core.maxSpellLvl(h) && !h.spells.includes(s));
                    if (pool.length) { const s = R.pick(pool); h.spells.push(s); if (hum) await io.msg(`The scholar teaches you ${SPELLS[s].name}.`, [{ key: Art.spell(S, s), label: SPELLS[s].name }]); }
                    else { Core.giveExp(h, 1000); if (hum) await io.msg('The scholar shares his wisdom: +1000 experience.'); await this.levelUps(h, io); }
                } else {
                    const up = h.skills.filter(s => s[1] < 3);
                    if (up.length) { const s = R.pick(up); s[1]++; if (hum) await io.msg(`The scholar improves your ${SKILLS[s[0]].name} to ${SKILL_LVL[s[1]]}.`, [{ key: Art.skill(S, s[0]), label: SKILLS[s[0]].name }]); }
                    else { h.know++; if (hum) await io.msg('The scholar teaches you: +1 Knowledge.'); }
                }
                io.sfx('levelup');
                break;
            }
            case 'monolith': {
                const twin = G.objects[o.twin];
                if (!twin) { if (hum) await io.msg('The monolith is silent.'); break; }
                const spot = this.freeAround(twin.x, twin.y);
                if (!spot) { if (hum) await io.msg('The exit is blocked.'); break; }
                h.x = spot.x; h.y = spot.y; io.sfx('spell');
                Core.reveal(p, h.x, h.y, Core.sight(h));
                if (io.teleported) await io.teleported(h);
                break;
            }
            case 'prison': {
                if (p.heroes.length >= 8) { if (hum) await io.msg('You cannot command more heroes.'); break; }
                const tpl = Core.freeTpl(null);
                if (!tpl) { Core.removeObj(o); break; }
                G.heroTpl[tpl].used = true;
                const nh = Core.makeHero(tpl, h.owner);
                nh.army = Core.emptyArmy(); nh.army[0] = { cid: FACTION_UNITS[nh.faction][0][0], n: 5 };
                nh.exp = LEVEL_EXP[R.int(4, 7)];
                await this.levelUps(nh, AI.io);
                nh.mana = Core.maxMana(nh);
                Core.removeObj(o);
                nh.x = o.x; nh.y = o.y; nh.mp = 0;
                p.heroes.push(nh.id);
                io.sfx('victory');
                if (hum) await io.msg(`You free ${nh.name}, a level ${nh.lvl} ${CLASSES[nh.cls].name}, who gladly joins your cause.`, [{ key: Art.portrait(S, nh), label: nh.name }]);
                break;
            }
            case 'pandora': {
                if (hum && !await io.ask("Open Pandora's Box? It may hold a great reward... or a terrible danger.")) break;
                if (o.trap) {
                    const m = MapGen.monsterObjRuntime(o.trap);
                    const won = await this.fight(h, { army: this.monsterArmy(m) }, io);
                    if (!won) break;
                }
                Core.removeObj(o);
                io.sfx('pickup');
                if (o.reward === 'gold') { p.res.gold += o.amount; if (hum) await io.msg(`Gold spills out of the box: ${fmt(o.amount)}.`, [{ key: 'res_gold', label: fmt(o.amount), scale: 1.5 }]); }
                else if (o.reward === 'exp') { Core.giveExp(h, o.amount); if (hum) await io.msg(`Ancient knowledge pours out: +${fmt(o.amount)} experience.`); await this.levelUps(h, io); }
                else if (o.reward === 'army') { const ok = Core.armyAdd(h.army, o.cid, o.n); if (hum) await io.msg(ok ? `${o.n} ${CREATURES[o.cid].name} emerge and join you.` : `${o.n} ${CREATURES[o.cid].name} emerge, but you have no room for them.`, [{ key: Art.creature(S, o.cid), label: String(o.n), scale: 0.6 }]); }
                else if (o.reward === 'art') { Core.equip(h, o.aid); if (hum) await io.msg(`Inside you find the ${ARTIFACTS[o.aid].name}.`, [{ key: Art.artifact(S, o.aid) }]); }
                else { const pool = SPELL_IDS.filter(s => SPELLS[s].lvl <= Core.maxSpellLvl(h) && !h.spells.includes(s)).slice(0, 3); pool.forEach(s => h.spells.push(s)); if (hum) await io.msg(pool.length ? `You learn: ${pool.map(s => SPELLS[s].name).join(', ')}.` : 'The box is empty.'); }
                break;
            }
        }
    },
    freeAround(x, y) {
        for (const [dx, dy] of [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (Core.passable(nx, ny) && !Core.visAt(nx, ny) && !Core.heroAt(nx, ny)) return { x: nx, y: ny };
        }
        return null;
    },

    objName(o) {
        switch (o.type) {
            case 'town': return o.name;
            case 'mine': return MINE_INFO[o.res].name;
            case 'res': return RES_NAME[o.res];
            case 'chest': return 'Treasure Chest';
            case 'campfire': return 'Campfire';
            case 'artifact': return ARTIFACTS[o.aid].name;
            case 'dwelling': return `${CREATURES[o.cid].name} Dwelling`;
            case 'monster': return CREATURES[o.cid].name;
            case 'site': return SITES[o.kind].name;
        }
        return '';
    },
    artDesc(aid) {
        const b = ARTIFACTS[aid].b, out = [];
        const nm = { att: 'Attack', def: 'Defense', pow: 'Spell Power', know: 'Knowledge', luck: 'Luck', morale: 'Morale', spd: 'creature speed', hp: 'creature health', move: 'movement', gold: 'gold per day', mana: 'spell points per day', sight: 'sight radius', spell: '% spell damage' };
        for (const k in b) out.push(`${b[k] > 0 ? '+' : ''}${b[k]} ${nm[k]}`);
        return out.join(', ');
    },
    // describes an object for hover / right-click
    describe(o, viewer) {
        const lines = [this.objName(o)];
        switch (o.type) {
            case 'town': lines.push(`${FACTIONS[o.faction].name} town`, o.owner >= 0 ? `Owner: ${PLAYER_COLORS[G.players[o.owner].color].name}` : 'Neutral'); break;
            case 'mine': lines.push(`Produces ${MINE_INFO[o.res].amt} ${RES_NAME[o.res]} per day`, o.owner >= 0 ? `Owner: ${PLAYER_COLORS[G.players[o.owner].color].name}` : 'Unclaimed'); break;
            case 'monster': lines[0] = `${stackWord(o.count)} ${CREATURES[o.cid].name}`; lines.push(`(${stackRange(o.count)})`); break;
            case 'dwelling': lines.push(`${o.avail} available`); break;
            case 'site': lines.push(SITES[o.kind].d); if (viewer && viewer.visited[o.id]) lines.push('(Visited)'); if (o.kind === 'shrine1' || o.kind === 'shrine2' || o.kind === 'shrine3') if (viewer && viewer.visited[o.id]) lines.push(SPELLS[o.spell].name); break;
            case 'artifact': lines.push(this.artDesc(o.aid)); break;
        }
        const g = this.guardOfObj(o);
        if (g) lines.push(`Guarded by ${CREATURES[g.cid].name}`);
        return lines;
    },
};

// Pandora's box traps need monsters outside map generation.
MapGen.monsterObjRuntime = function (level) {
    const old = this.rng; this.rng = R;
    const m = this.monsterObj(level, 0, 0);
    this.rng = old;
    return m;
};
