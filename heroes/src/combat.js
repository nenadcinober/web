// Tactical combat engine. Pure logic: the combat scene drives it and animates the events it returns,
// and the AI runs it headless to resolve battles it is not watching.
const MACHINES = {
    ballista: { id: 'ballista', name: 'Ballista', att: 10, def: 10, min: 2, max: 3, hp: 250, spd: 0, shoot: 99, dshot: 1, machine: 1, value: 600, art: { a: 'ballista' } },
    tent: { id: 'tent', name: 'First Aid Tent', att: 0, def: 0, min: 0, max: 0, hp: 75, spd: 0, machine: 1, value: 300, art: { a: 'tent' } },
    tower: { id: 'tower', name: 'Arrow Tower', att: 10, def: 0, min: 6, max: 9, hp: 999, spd: 10, shoot: 999, machine: 1, struct: 1, value: 0, art: { a: 'tower' } },
};
const cdef = cid => CREATURES[cid] || MACHINES[cid];
const FORMATION = [[], [5], [2, 8], [2, 5, 8], [0, 4, 6, 10], [0, 2, 5, 8, 10], [0, 2, 4, 6, 8, 10], [0, 2, 4, 5, 6, 8, 10]];
const WALL_COL = 10;

class Battle {
    // cfg: { sides: [{ hero, army, owner, human }, ...], siege: 0-3, terrain, towers: n }
    constructor(cfg) {
        this.cfg = cfg;
        this.sides = cfg.sides.map((s, i) => ({
            i, hero: s.hero || null, owner: s.owner, human: !!s.human, cast: false, fled: false,
            mana: s.hero ? s.hero.mana : 0,
        }));
        this.units = [];
        this.round = 0;
        this.obstacles = new Set();
        this.walls = null;
        this.over = false; this.winner = -1;
        this.nextUid = 1;
        this.siege = cfg.siege || 0;
        // obstacles
        const nObs = R.int(2, 6);
        for (let k = 0; k < nObs * 4 && this.obstacles.size < nObs; k++) {
            const r = R.int(0, 10), c = R.int(3, this.siege ? 8 : 11);
            this.obstacles.add(Hex.key(r, c));
            if (R.chance(0.35) && c < 11) this.obstacles.add(Hex.key(r, c + 1));
        }
        if (this.siege) {
            this.walls = { sections: [], gate: { keys: [Hex.key(5, WALL_COL)], hp: 2, max: 2 } };
            for (const rows of [[0, 1], [2, 3, 4], [6, 7, 8], [9, 10]]) this.walls.sections.push({ keys: rows.map(r => Hex.key(r, WALL_COL)), hp: 2, max: 2 });
            for (let r = 0; r <= 10; r++) for (const c of [WALL_COL - 1, WALL_COL + 1]) this.obstacles.delete(Hex.key(r, c));
            for (let r = 0; r <= 10; r++) this.obstacles.delete(Hex.key(r, WALL_COL));
        }
        cfg.sides.forEach((s, side) => {
            const stacks = s.army.map((st, slot) => st ? { st, slot } : null).filter(Boolean);
            const rows = FORMATION[stacks.length];
            stacks.forEach((o, k) => {
                const d = cdef(o.st.cid);
                const c = side === 0 ? 1 : 13;
                this.addUnit(side, o.st.cid, o.st.n, rows[k], c, o.slot);
            });
            if (s.hero && s.hero.machines) {
                if (s.hero.machines.ballista) this.addUnit(side, 'ballista', 1, 3, side === 0 ? 0 : 14, -1);
                if (s.hero.machines.tent) this.addUnit(side, 'tent', 1, 7, side === 0 ? 0 : 14, -1);
            }
        });
        if (this.siege >= 2) {
            const towers = this.siege === 3 ? 3 : 1;
            for (let i = 0; i < towers; i++) { const u = this.addUnit(1, 'tower', cfg.towerPower || 2, -1, -1, -1); u.towerIdx = i; }
        }
        for (const u of this.units) this.obstacles.delete(Hex.key(u.r, u.c));
    }
    addUnit(side, cid, n, r, c, slot) {
        const d = cdef(cid);
        const u = {
            id: this.nextUid++, side, cid, n, n0: n, hp: 0, shots: d.shoot || 0, retals: 1, r, c, slot,
            eff: {}, acted: false, waited: false, defending: false, moraled: false, machine: !!d.machine, struct: !!d.struct,
        };
        u.hp = this.maxHp(u);
        this.units.push(u);
        return u;
    }

    // ---------------- stats ----------------
    def(u) { return cdef(u.cid); }
    hero(side) { return this.sides[side].hero; }
    hstat(side, k) { const h = this.hero(side); return h ? Core.stat(h, k) : 0; }
    hskill(side, k) { const h = this.hero(side); return h ? Core.skillVal(h, k) : 0; }
    maxHp(u) { const h = this.hero(u.side); return this.def(u).hp + (h && !u.machine ? Core.artBonus(h, 'hp') : 0); }
    att(u, melee) {
        let a = this.def(u).att + this.hstat(u.side, 'att');
        if (melee && u.eff.bloodlust) a += 3;
        if (u.eff.weakness) a -= 3;
        if (u.eff.prayer) a += 2;
        return Math.max(0, a);
    }
    dfn(u) {
        let d = this.def(u).def + this.hstat(u.side, 'def');
        if (u.eff.stoneskin) d += 3;
        if (u.eff.prayer) d += 2;
        if (u.defending) d = Math.ceil(d * 1.2) + 1;
        return Math.max(0, d);
    }
    spd(u) {
        const d = this.def(u);
        if (u.machine) return d.spd;
        const h = this.hero(u.side);
        let s = d.spd + (h ? Core.artBonus(h, 'spd') : 0);
        if (u.eff.haste) s += 3;
        if (u.eff.prayer) s += 2;
        if (u.eff.slow) s = Math.floor(s / 2);
        return Math.max(1, s);
    }
    morale(u) {
        if (u.machine || this.def(u).undead) return 0;
        const s = this.cfg.sides[u.side];
        let m = Core.morale(s.hero, s.army);
        if (this.siege && u.side === 1 && this.cfg.tavern) m += 1;
        return clamp(m, -3, 3);
    }
    luck(u) {
        if (u.machine) return 0;
        return clamp(Core.luck(this.hero(u.side)) + (u.eff.fortune ? 2 : 0), -3, 3);
    }
    alive(u) { return u.n > 0; }
    enemies(u) { return this.units.filter(o => o.side !== u.side && o.n > 0 && !o.struct); }
    allies(u) { return this.units.filter(o => o.side === u.side && o.n > 0 && !o.struct); }

    // ---------------- geometry ----------------
    cellsAt(u, r, c) {
        if (u.struct) return [];
        if (!this.def(u).large) return [[r, c]];
        return [[r, c], [r, u.side === 0 ? c - 1 : c + 1]];
    }
    cells(u) { return this.cellsAt(u, u.r, u.c); }
    unitAt(r, c) {
        for (const u of this.units) {
            if (u.n <= 0 || u.struct) continue;
            for (const [cr, cc] of this.cells(u)) if (cr === r && cc === c) return u;
        }
        return null;
    }
    wallAt(k) {
        if (!this.walls) return null;
        for (const s of this.walls.sections) if (s.keys.includes(k)) return s;
        if (this.walls.gate.keys.includes(k)) return this.walls.gate;
        return null;
    }
    cellFree(r, c, u) {
        if (!Hex.valid(r, c)) return false;
        const k = Hex.key(r, c);
        if (this.obstacles.has(k)) return false;
        const w = this.wallAt(k);
        if (w && w.hp > 0) {
            if (w !== this.walls.gate || u.side !== 1) return false;
        }
        const o = this.unitAt(r, c);
        return !o || o === u;
    }
    canStand(u, r, c) {
        for (const [cr, cc] of this.cellsAt(u, r, c)) if (!this.cellFree(cr, cc, u)) return false;
        return true;
    }
    // Reachable head positions: Map key -> {d, prev}
    reach(u) {
        const out = new Map();
        const sp = this.spd(u);
        const start = Hex.key(u.r, u.c);
        out.set(start, { d: 0, prev: -1 });
        if (u.machine || this.def(u).spd === 0) return out;
        if (this.def(u).fly) {
            for (let r = 0; r < Hex.ROWS; r++) for (let c = 0; c < Hex.COLS; c++) {
                const d = Hex.dist(u.r, u.c, r, c);
                if (d > 0 && d <= sp && this.canStand(u, r, c)) out.set(Hex.key(r, c), { d, prev: start });
            }
            return out;
        }
        const q = [start];
        for (let h = 0; h < q.length; h++) {
            const k = q[h], [r, c] = Hex.rc(k), d = out.get(k).d;
            if (d >= sp) continue;
            for (const [nr, nc] of Hex.neighbors(r, c)) {
                const nk = Hex.key(nr, nc);
                if (out.has(nk) || !this.canStand(u, nr, nc)) continue;
                out.set(nk, { d: d + 1, prev: k });
                q.push(nk);
            }
        }
        return out;
    }
    pathTo(reach, k) {
        const p = [];
        for (let c = k; c !== -1 && c !== undefined; c = reach.get(c).prev) p.push(c);
        return p.reverse();
    }
    adjacentTo(u, r, c, t) {
        for (const [ar, ac] of this.cellsAt(u, r, c)) for (const [tr, tc] of this.cells(t)) if (Hex.dist(ar, ac, tr, tc) === 1) return true;
        return false;
    }
    isAdjacent(a, b) { return this.adjacentTo(a, a.r, a.c, b); }
    attackPositions(u, t, reach) {
        reach = reach || this.reach(u);
        const out = [];
        for (const [k, v] of reach) { const [r, c] = Hex.rc(k); if (this.adjacentTo(u, r, c, t)) out.push(k); }
        return out;
    }
    canShoot(u) {
        const d = this.def(u);
        if (!d.shoot || u.shots <= 0) return false;
        if (u.machine) return true;
        return !this.enemies(u).some(e => this.isAdjacent(u, e));
    }
    wallsStanding() { return this.walls && this.walls.sections.some(s => s.hp > 0); }

    // ---------------- damage ----------------
    calcDamage(a, t, ranged, opts = {}) {
        const d = this.def(a), td = this.def(t);
        let base;
        const n = a.n;
        if (a.eff.bless || opts.mode === 'max') base = d.max * n;
        else if (a.eff.curse || opts.mode === 'min') base = d.min * n;
        else if (opts.mode === 'avg') base = (d.min + d.max) / 2 * n;
        else { const k = Math.min(n, 10); let s = 0; for (let i = 0; i < k; i++) s += R.int(d.min, d.max); base = s / k * n; }
        if (a.cid === 'ballista') base *= this.hstat(a.side, 'att') + 1;
        const A = this.att(a, !ranged), D = this.dfn(t) * (1 - (d.ignDef || 0));
        let m = A >= D ? 1 + 0.05 * Math.min(A - D, 60) : 1 - Math.min(0.7, 0.025 * (D - A));
        m *= 1 + (ranged ? this.hskill(a.side, 'archery') : this.hskill(a.side, 'offense')) / 100;
        m *= 1 - this.hskill(t.side, 'armorer') / 100;
        if (!ranged && t.eff.shield) m *= 0.85;
        if (ranged && !a.machine) {
            const far = Hex.dist(a.r, a.c, t.r, t.c) > 10;
            if (far && !d.nmp) m *= 0.5;
            if (this.siege && a.side === 0 && t.side === 1 && this.wallsStanding()) m *= 0.5;
        }
        if (!ranged && d.shoot && !d.nmp && !a.machine) m *= 0.5;
        if (opts.moved && d.joust) m *= 1 + 0.05 * opts.moved;
        if (opts.retal) m *= 1;
        let lucky = false, death = false;
        if (!opts.mode) {
            const lk = this.luck(a);
            if (lk > 0 && R.next() < lk / 24) { m *= 2; lucky = true; }
            if (d.deathBlow && R.chance(0.2)) { m *= 2; death = true; }
        }
        return { dmg: Math.max(1, Math.floor(base * m)), lucky, death };
    }
    totalHp(u) { return u.n > 0 ? (u.n - 1) * this.maxHp(u) + u.hp : 0; }
    applyDamage(t, dmg, ev) {
        const mh = this.maxHp(t), total = this.totalHp(t);
        let killed;
        if (dmg >= total) { killed = t.n; t.n = 0; t.hp = 0; }
        else {
            const rem = total - dmg, nn = Math.ceil(rem / mh);
            killed = t.n - nn; t.n = nn; t.hp = rem - (nn - 1) * mh;
        }
        if (t.eff.blind) delete t.eff.blind;
        ev.push({ t: 'dmg', u: t.id, dmg, killed });
        if (t.n <= 0) ev.push({ t: 'death', u: t.id });
        return killed;
    }
    // expected value destroyed by an attack (for AI)
    killValue(a, t, ranged, moved) {
        const { dmg } = this.calcDamage(a, t, ranged, { mode: 'avg', moved });
        const total = this.totalHp(t);
        const eff = Math.min(dmg, total);
        let v = eff / this.maxHp(t) * (this.def(t).value || 50);
        if (dmg >= total) v *= 1.3;
        return v;
    }

    // ---------------- turn order ----------------
    start() {
        const ev = [];
        this.newRound(ev);
        this.selectNext(ev);
        return ev;
    }
    newRound(ev) {
        this.round++;
        for (const u of this.units) {
            u.acted = false; u.waited = false; u.defending = false; u.moraled = false;
            const d = this.def(u);
            u.retals = d.unlRetal ? 999 : (d.retals || 1);
            if (this.round > 1) for (const e in u.eff) { if (--u.eff[e] <= 0) delete u.eff[e]; }
        }
        for (const s of this.sides) s.cast = false;
        ev.push({ t: 'round', n: this.round });
        if (this.siege && this.units.some(u => u.side === 0 && u.n > 0)) {
            const targets = this.walls.sections.filter(s => s.hp > 0).concat(this.walls.gate.hp > 0 ? [this.walls.gate] : []);
            if (targets.length) {
                const w = R.pick(targets), hit = R.chance(0.65);
                if (hit) w.hp--;
                ev.push({ t: 'catapult', keys: w.keys, hit, destroyed: w.hp <= 0, gate: w === this.walls.gate });
                if (hit && w.hp <= 0) ev.push({ t: 'log', s: w === this.walls.gate ? 'The gate is destroyed!' : 'A wall section collapses!' });
            }
        }
        if (this.round > 80) this.finish(1, ev);
    }
    selectNext(ev) {
        for (let guard = 0; guard < 400; guard++) {
            if (this.over) return;
            const live = this.units.filter(u => u.n > 0 && !u.acted);
            const p1 = live.filter(u => !u.waited);
            let next = null;
            if (p1.length) {
                p1.sort((a, b) => this.spd(b) - this.spd(a) || ((a.side - b.side) * (this.round % 2 ? 1 : -1)) || a.id - b.id);
                next = p1[0];
            } else if (live.length) {
                live.sort((a, b) => this.spd(a) - this.spd(b) || a.id - b.id);
                next = live[0];
            }
            if (!next) { this.newRound(ev); continue; }
            this.active = next;
            if (this.def(next).regen && next.n > 0) next.hp = this.maxHp(next);
            if (next.eff.blind) { next.acted = true; ev.push({ t: 'log', s: `${this.uname(next)} are blinded and cannot act.` }); continue; }
            if (next.cid === 'tent' && !this.allies(next).some(a => a !== next && !a.machine && a.hp < this.maxHp(a))) { next.acted = true; continue; }
            const m = this.morale(next);
            if (m < 0 && R.next() < -m / 24) {
                next.acted = true;
                ev.push({ t: 'morale', u: next.id, good: false });
                ev.push({ t: 'log', s: `Low morale freezes the ${this.uname(next)}.` });
                continue;
            }
            ev.push({ t: 'turn', u: next.id });
            return;
        }
    }
    uname(u) { const d = this.def(u); return u.n === 1 || u.machine ? d.name : plural(d.name); }

    // ---------------- actions ----------------
    // action: {type:'move', to} {type:'melee', target, from} {type:'shoot', target} {type:'defend'} {type:'wait'} {type:'heal', target} {type:'skip'}
    act(action) {
        const u = this.active, ev = [];
        if (this.over || !u) return ev;
        let ended = true;
        switch (action.type) {
            case 'move': {
                const reach = this.reach(u);
                if (!reach.has(action.to)) break;
                this.moveTo(u, action.to, reach, ev);
                break;
            }
            case 'melee': {
                const t = this.units.find(o => o.id === action.target);
                const reach = this.reach(u);
                if (!t || !reach.has(action.from)) break;
                const moved = reach.get(action.from).d;
                if (action.from !== Hex.key(u.r, u.c)) this.moveTo(u, action.from, reach, ev);
                this.melee(u, t, moved, ev);
                break;
            }
            case 'shoot': {
                const t = this.units.find(o => o.id === action.target);
                if (t && this.canShoot(u)) this.shoot(u, t, ev);
                break;
            }
            case 'heal': {
                const t = this.units.find(o => o.id === action.target);
                if (t) {
                    const amt = R.int(10, 25) * (1 + this.hstat(u.side, 'know') * 0) ;
                    const before = t.hp; t.hp = Math.min(this.maxHp(t), t.hp + amt);
                    ev.push({ t: 'heal', u: t.id, amt: t.hp - before });
                    ev.push({ t: 'log', s: `The First Aid Tent heals the ${this.uname(t)} for ${t.hp - before} HP.` });
                }
                break;
            }
            case 'defend': u.defending = true; ev.push({ t: 'log', s: `${this.uname(u)} defend.` }); break;
            case 'wait':
                if (!u.waited) { u.waited = true; ended = false; ev.push({ t: 'log', s: `${this.uname(u)} wait.` }); }
                break;
            default: break;
        }
        if (ended) u.acted = true;
        this.checkOver(ev);
        if (this.over) return ev;
        if (ended && u.n > 0 && !u.moraled && !['wait', 'defend', 'skip'].includes(action.type) && !u.machine) {
            const m = this.morale(u);
            if (m > 0 && R.next() < m / 24) {
                u.moraled = true; u.acted = false; u.waited = false;
                ev.push({ t: 'morale', u: u.id, good: true });
                ev.push({ t: 'log', s: `High morale enables the ${this.uname(u)} to attack again.` });
                ev.push({ t: 'turn', u: u.id });
                return ev;
            }
        }
        this.selectNext(ev);
        return ev;
    }
    moveTo(u, k, reach, ev) {
        const path = this.def(u).fly ? [Hex.key(u.r, u.c), k] : this.pathTo(reach, k);
        const [r, c] = Hex.rc(k);
        u.r = r; u.c = c;
        ev.push({ t: 'move', u: u.id, path, fly: !!this.def(u).fly });
    }
    melee(u, t, moved, ev) {
        ev.push({ t: 'attack', u: u.id, tgt: t.id });
        this.strike(u, t, false, moved, ev);
        if (this.def(u).allAdj) {
            for (const e of this.enemies(u)) if (e !== t && this.isAdjacent(u, e)) { ev.push({ t: 'attack', u: u.id, tgt: e.id, extra: true }); this.strike(u, e, false, 0, ev); }
        }
        if (this.def(u).breath) this.breath(u, t, ev);
        if (t.n > 0 && u.n > 0 && !this.def(u).noRetal && t.retals > 0 && !t.machine) {
            t.retals--;
            ev.push({ t: 'attack', u: t.id, tgt: u.id, retal: true });
            ev.push({ t: 'log', s: `The ${this.uname(t)} retaliate.` });
            this.strike(t, u, false, 0, ev);
        }
        if (this.def(u).dbl && u.n > 0 && t.n > 0) {
            ev.push({ t: 'attack', u: u.id, tgt: t.id });
            this.strike(u, t, false, 0, ev);
        }
    }
    breath(u, t, ev) {
        for (const [ar, ac] of this.cells(u)) for (const [tr, tc] of this.cells(t)) {
            if (Hex.dist(ar, ac, tr, tc) !== 1) continue;
            const a = Hex.cube(ar, ac), b = Hex.cube(tr, tc);
            let x = b[0] + (b[0] - a[0]), y = b[1] + (b[1] - a[1]);
            let r = y, c = x + (r - (r & 1)) / 2;
            let o = Hex.valid(r, c) ? this.unitAt(r, c) : null;
            if (o === t) { x += b[0] - a[0]; y += b[1] - a[1]; r = y; c = x + (r - (r & 1)) / 2; o = Hex.valid(r, c) ? this.unitAt(r, c) : null; }
            if (o && o !== u && o !== t && o.n > 0) { ev.push({ t: 'log', s: `Dragon breath scorches the ${this.uname(o)}.` }); this.strike(u, o, false, 0, ev); }
            return;
        }
    }
    shoot(u, t, ev) {
        const times = this.def(u).dshot ? 2 : 1;
        for (let i = 0; i < times && t.n > 0 && u.shots > 0; i++) {
            u.shots--;
            ev.push({ t: 'shoot', u: u.id, tgt: t.id });
            this.strike(u, t, true, 0, ev);
            if (this.def(u).aoe) {
                for (const [nr, nc] of Hex.neighbors(t.r, t.c)) {
                    const o = this.unitAt(nr, nc);
                    if (o && o !== t && o.n > 0 && !this.def(o).undead) this.strike(u, o, true, 0, ev);
                }
            }
        }
    }
    strike(a, t, ranged, moved, ev) {
        if (t.n <= 0 || a.n <= 0) return;
        const r = this.calcDamage(a, t, ranged, { moved });
        if (r.lucky) ev.push({ t: 'log', s: `Good luck shines on the ${this.uname(a)}!` });
        if (r.death) ev.push({ t: 'log', s: `The ${this.uname(a)} strike a death blow!` });
        const killed = this.applyDamage(t, r.dmg, ev);
        ev.push({ t: 'log', s: `The ${this.uname(a)} do ${r.dmg} damage.${killed ? ` ${killed} ${killed === 1 ? this.def(t).name : plural(this.def(t).name)} perish.` : ''}` });
        if (this.def(a).drain && a.n > 0) {
            const mh = this.maxHp(a), cap = a.n0 * mh, tot = Math.min(cap, this.totalHp(a) + r.dmg);
            a.n = Math.ceil(tot / mh); a.hp = tot - (a.n - 1) * mh;
            ev.push({ t: 'heal', u: a.id, amt: r.dmg });
        }
    }
    checkOver(ev) {
        if (this.over) return;
        const has = s => this.units.some(u => u.side === s && u.n > 0 && !u.machine);
        if (!has(0)) this.finish(1, ev);
        else if (!has(1)) this.finish(0, ev);
    }
    finish(winner, ev) {
        if (this.over) return;
        this.over = true; this.winner = winner;
        ev && ev.push({ t: 'over', winner });
    }
    flee(side, surrender) {
        this.sides[side].fled = true;
        this.sides[side].surrendered = !!surrender;
        const ev = [];
        this.finish(1 - side, ev);
        return ev;
    }
    surrenderCost(side) {
        let g = 0;
        for (const u of this.units) if (u.side === side && u.n > 0 && !u.machine) g += this.def(u).cost * u.n;
        return Math.round(g / 2);
    }

    // ---------------- spells ----------------
    spellPower(side) { return this.hstat(side, 'pow'); }
    spellAmount(side, sid) {
        const sp = SPELLS[sid], h = this.hero(side);
        let v = sp.base + sp.per * this.spellPower(side);
        if (sp.kind !== 'heal' && sp.kind !== 'raise') v *= 1 + (this.hskill(side, 'sorcery') + (h ? Core.artBonus(h, 'spell') : 0)) / 100;
        return Math.round(v);
    }
    canCast(side) {
        const s = this.sides[side], h = s.hero;
        return !!h && !s.cast && !this.over && h.spells.some(sid => SPELLS[sid].kind !== 'adv' && SPELLS[sid].cost <= s.mana);
    }
    spellTargets(side, sid) {
        const sp = SPELLS[sid];
        const live = this.units.filter(u => u.n > 0 && !u.struct && !u.machine);
        if (sp.target === 'enemy') return live.filter(u => u.side !== side);
        if (sp.target === 'ally') return live.filter(u => u.side === side);
        if (sp.target === 'any') return live;
        return [];
    }
    resisted(u, sid) {
        const sp = SPELLS[sid];
        if (sp.target === 'ally' || sp.kind === 'buff' || sp.kind === 'heal' || sp.kind === 'raise' || sp.kind === 'dispel') return false;
        const chance = (this.def(u).resist || 0) + this.hskill(u.side, 'resistance');
        return R.next() * 100 < chance;
    }
    unitsInArea(k, radius, ring) {
        const [r0, c0] = Hex.rc(k), out = [];
        for (const u of this.units) {
            if (u.n <= 0 || u.struct) continue;
            let hit = false;
            for (const [r, c] of this.cells(u)) { const d = Hex.dist(r, c, r0, c0); if (ring ? d === 1 : d <= radius) hit = true; }
            if (hit) out.push(u);
        }
        return out;
    }
    // target: unit id, hex key, or null
    cast(side, sid, target) {
        const ev = [], s = this.sides[side], sp = SPELLS[sid], h = s.hero;
        if (!h || s.cast || s.mana < sp.cost) return ev;
        s.mana -= sp.cost; s.cast = true;
        const dur = Math.max(1, this.spellPower(side));
        const amt = this.spellAmount(side, sid);
        const tu = typeof target === 'number' && sp.target !== 'hex' ? this.units.find(u => u.id === target) : null;
        let targets = [];
        if (sp.kind === 'dmg' || ((sp.kind === 'buff' || sp.kind === 'debuff') && !sp.mass) || sp.kind === 'heal' || sp.kind === 'raise' || sp.kind === 'dispel') targets = tu ? [tu] : [];
        else if (sp.kind === 'area') targets = this.unitsInArea(target, sp.radius);
        else if (sp.kind === 'ring') targets = this.unitsInArea(target, 1, true);
        else if (sp.kind === 'all') targets = this.units.filter(u => u.n > 0 && !u.struct);
        else if (sp.kind === 'chain') {
            if (tu) { targets = [tu]; let last = tu; while (targets.length < 4) { const rest = this.units.filter(u => u.n > 0 && !u.struct && !targets.includes(u)); if (!rest.length) break; rest.sort((a, b) => Hex.dist(a.r, a.c, last.r, last.c) - Hex.dist(b.r, b.c, last.r, last.c)); last = rest[0]; targets.push(last); } }
        } else if (sp.mass) targets = this.units.filter(u => u.n > 0 && !u.struct && !u.machine && (sp.kind === 'buff' ? u.side === side : u.side !== side));
        ev.push({ t: 'spell', sid, side, tgts: targets.map(u => u.id), hex: sp.target === 'hex' ? target : null });
        ev.push({ t: 'log', s: `${h.name} casts ${sp.name}.` });
        let chainAmt = amt;
        for (const u of targets) {
            if (this.resisted(u, sid)) { ev.push({ t: 'log', s: `The ${this.uname(u)} resist the spell.` }); ev.push({ t: 'resist', u: u.id }); continue; }
            switch (sp.kind) {
                case 'dmg': case 'area': case 'ring': case 'all': {
                    const k = this.applyDamage(u, amt, ev);
                    ev.push({ t: 'log', s: `${sp.name} does ${amt} damage to the ${this.uname(u)}.${k ? ` ${k} perish.` : ''}` });
                    break;
                }
                case 'chain': {
                    const k = this.applyDamage(u, chainAmt, ev);
                    ev.push({ t: 'log', s: `Lightning does ${chainAmt} damage to the ${this.uname(u)}.${k ? ` ${k} perish.` : ''}` });
                    chainAmt = Math.max(1, Math.round(chainAmt / 2));
                    break;
                }
                case 'buff': case 'debuff': {
                    const e = sp.eff;
                    if (e === 'blind' && this.def(u).undead) { ev.push({ t: 'log', s: `The undead ${this.uname(u)} are immune.` }); break; }
                    if (e === 'haste') delete u.eff.slow; if (e === 'slow') delete u.eff.haste;
                    if (e === 'bless') delete u.eff.curse; if (e === 'curse') delete u.eff.bless;
                    u.eff[e] = dur;
                    break;
                }
                case 'heal': {
                    for (const e in u.eff) if (!EFFECTS[e].good) delete u.eff[e];
                    const before = u.hp; u.hp = Math.min(this.maxHp(u), u.hp + amt);
                    ev.push({ t: 'heal', u: u.id, amt: u.hp - before });
                    break;
                }
                case 'raise': {
                    const mh = this.maxHp(u), tot = Math.min(u.n0 * mh, this.totalHp(u) + amt);
                    const before = u.n;
                    u.n = Math.ceil(tot / mh); u.hp = tot - (u.n - 1) * mh;
                    ev.push({ t: 'heal', u: u.id, amt });
                    if (u.n > before) ev.push({ t: 'log', s: `${u.n - before} ${this.def(u).name} rise again.` });
                    break;
                }
                case 'dispel': u.eff = {}; break;
            }
        }
        this.checkOver(ev);
        if (!this.over && this.active && this.active.n <= 0) this.selectNext(ev);
        return ev;
    }

    // ---------------- results ----------------
    result() {
        const out = { winner: this.winner, rounds: this.round, sides: [] };
        for (let s = 0; s < 2; s++) {
            const army = Core.emptyArmy(), lost = {}, machinesLost = {};
            let killedHp = 0, killedCount = 0;
            for (const u of this.units) {
                const d = this.def(u);
                if (u.side === s) {
                    if (u.machine) { if (u.n <= 0 && !u.struct) machinesLost[u.cid] = 1; continue; }
                    if (u.n < u.n0) lost[u.cid] = (lost[u.cid] || 0) + u.n0 - u.n;
                    if (u.n > 0 && u.slot >= 0) army[u.slot] = { cid: u.cid, n: u.n };
                } else if (!u.machine) {
                    killedHp += (u.n0 - Math.max(0, u.n)) * d.hp;
                    killedCount += u.n0 - Math.max(0, u.n);
                }
            }
            out.sides.push({ army, lost, machinesLost, killedHp, killedCount, fled: this.sides[s].fled, surrendered: this.sides[s].surrendered, mana: this.sides[s].mana });
        }
        return out;
    }
}

// ---------------- combat AI ----------------
const CombatAI = {
    choose(b, u) {
        const enemies = b.enemies(u);
        if (!enemies.length) return { type: 'skip' };
        if (u.cid === 'tent') {
            const hurt = b.allies(u).filter(a => !a.machine && a.hp < b.maxHp(a)).sort((x, y) => (b.def(y).value * y.n) - (b.def(x).value * x.n));
            return hurt.length ? { type: 'heal', target: hurt[0].id } : { type: 'skip' };
        }
        if (b.canShoot(u)) {
            let best = null, bv = -1;
            for (const e of enemies) { const v = b.killValue(u, e, true, 0) * (b.def(e).shoot ? 1.3 : 1); if (v > bv) { bv = v; best = e; } }
            return { type: 'shoot', target: best.id };
        }
        if (u.machine) return { type: 'skip' };
        const reach = b.reach(u);
        let best = null, bv = -Infinity;
        for (const e of enemies) {
            const poss = b.attackPositions(u, e, reach);
            if (!poss.length) continue;
            let v = b.killValue(u, e, false, 0) * (b.def(e).shoot ? 1.4 : 1);
            if (!b.def(u).noRetal && b.def(e).retals !== 0 && e.retals > 0) {
                const { dmg } = b.calcDamage(u, e, false, { mode: 'avg' });
                if (dmg < b.totalHp(e)) {
                    const sim = { ...e, n: Math.ceil((b.totalHp(e) - dmg) / b.maxHp(e)), eff: e.eff };
                    v -= b.killValue(sim, u, false, 0) * 0.5;
                }
            }
            for (const k of poss) {
                const moved = reach.get(k).d;
                let pv = v + (b.def(u).joust ? moved * 0.05 * v : 0) - moved * 0.01;
                if (pv > bv) { bv = pv; best = { type: 'melee', target: e.id, from: k }; }
            }
        }
        if (best) return best;
        // shooters with no target in reach and blocked: just defend
        if (b.def(u).shoot && u.shots > 0) return { type: 'defend' };
        // siege defenders hold behind the walls while they stand
        if (b.siege && u.side === 1 && b.wallsStanding() && !b.def(u).fly && b.units.some(o => o.side === 1 && o.n > 0 && (b.def(o).shoot || o.struct))) return { type: 'defend' };
        // advance toward the most attractive enemy
        let tgt = null, tv = -Infinity;
        for (const e of enemies) {
            const d = Hex.dist(u.r, u.c, e.r, e.c);
            const v = (b.def(e).value * e.n) / (1 + d) * (b.def(e).shoot ? 1.5 : 1);
            if (v > tv) { tv = v; tgt = e; }
        }
        let bestK = null, bd = Infinity;
        for (const [k] of reach) {
            const [r, c] = Hex.rc(k);
            let d = Infinity;
            for (const [tr, tc] of b.cells(tgt)) d = Math.min(d, Hex.dist(r, c, tr, tc));
            if (d < bd) { bd = d; bestK = k; }
        }
        if (bestK === null || bestK === Hex.key(u.r, u.c)) return { type: 'defend' };
        return { type: 'move', to: bestK };
    },
    heroSpell(b, side) {
        if (!b.canCast(side)) return null;
        const s = b.sides[side], h = s.hero;
        let best = null, bv = 0;
        const foe = 1 - side;
        const uval = u => (b.def(u).value || 0) * u.n;
        for (const sid of h.spells) {
            const sp = SPELLS[sid];
            if (sp.kind === 'adv' || sp.cost > s.mana) continue;
            const amt = b.spellAmount(side, sid);
            const dmgVal = u => { const eff = Math.min(amt, b.totalHp(u)); return eff / b.maxHp(u) * b.def(u).value * (amt >= b.totalHp(u) ? 1.3 : 1) * (1 - (b.def(u).resist || 0) / 100); };
            const consider = (v, target) => { v -= sp.cost * 4; if (v > bv) { bv = v; best = { sid, target }; } };
            switch (sp.kind) {
                case 'dmg': for (const u of b.spellTargets(side, sid)) consider(dmgVal(u), u.id); break;
                case 'chain': for (const u of b.spellTargets(side, sid)) consider(dmgVal(u) * 1.6, u.id); break;
                case 'area': case 'ring':
                    for (let k = 0; k < Hex.ROWS * Hex.COLS; k++) {
                        let v = 0;
                        for (const u of b.unitsInArea(k, 1, sp.kind === 'ring')) v += (u.side === foe ? 1 : -1.2) * dmgVal(u);
                        consider(v, k);
                    }
                    break;
                case 'all': { let v = 0; for (const u of b.units) if (u.n > 0 && !u.struct) v += (u.side === foe ? 1 : -1.2) * dmgVal(u); consider(v, null); break; }
                case 'buff': {
                    const k = { haste: 0.15, bless: 0.2, bloodlust: 0.15, stoneskin: 0.12, shield: 0.1, fortune: 0.08, prayer: 0.25 }[sp.eff] || 0.1;
                    if (sp.mass) { let v = 0; for (const u of b.allies({ side })) if (!u.machine && !u.eff[sp.eff]) v += uval(u) * k; consider(v, null); }
                    else for (const u of b.spellTargets(side, sid)) if (!u.eff[sp.eff] && !(sp.eff === 'bloodlust' && b.def(u).shoot)) consider(uval(u) * k, u.id);
                    break;
                }
                case 'debuff': {
                    const k = { slow: 0.2, curse: 0.15, weakness: 0.12, blind: 0.35 }[sp.eff] || 0.1;
                    if (sp.mass) { let v = 0; for (const u of b.enemies({ side })) if (!u.eff[sp.eff]) v += uval(u) * k; consider(v, null); }
                    else for (const u of b.spellTargets(side, sid)) if (!u.eff[sp.eff] && !(sp.eff === 'blind' && b.def(u).undead)) consider(uval(u) * k * (1 - (b.def(u).resist || 0) / 100), u.id);
                    break;
                }
                case 'heal': for (const u of b.spellTargets(side, sid)) { const miss = b.maxHp(u) - u.hp; const neg = Object.keys(u.eff).some(e => !EFFECTS[e].good); consider(Math.min(miss, amt) / b.maxHp(u) * b.def(u).value + (neg ? uval(u) * 0.12 : 0), u.id); } break;
                case 'raise': for (const u of b.spellTargets(side, sid)) { const lostHp = (u.n0 * b.maxHp(u)) - b.totalHp(u); consider(Math.min(lostHp, amt) / b.maxHp(u) * b.def(u).value, u.id); } break;
            }
        }
        return best;
    },
    // Fights a whole battle with both sides AI-controlled and returns the result.
    simulate(cfg) {
        const b = new Battle(cfg);
        b.start();
        for (let guard = 0; guard < 3000 && !b.over; guard++) {
            const u = b.active;
            if (!u) break;
            const sp = this.heroSpell(b, u.side);
            if (sp) { b.cast(u.side, sp.sid, sp.target); if (b.over) break; if (b.active !== u) continue; }
            b.act(this.choose(b, u));
        }
        if (!b.over) b.finish(1);
        return { battle: b, res: b.result() };
    },
};
