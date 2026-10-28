'use strict';
// The SCUMM-style engine: verb panel, inventory, sentence line, walking, speech, dialogue choices,
// room loading and saving. Room scripts receive the scene itself as `E` and use the small API at
// the bottom of the class (say, choose, walk, give, take, goto, ...).

const VERBS = [['give', 'Daj'], ['open', 'Otvori'], ['close', 'Zatvori'], ['pick', 'Uzmi'], ['look', 'Pogledaj'],
    ['talk', 'Pričaj s'], ['use', 'Koristi'], ['push', 'Gurni'], ['pull', 'Povuci']];
const VERB_LABEL = Object.assign({ walk: 'Idi do' }, Object.fromEntries(VERBS));
const DEFAULT_MSG = {
    give: ['Mislim da to ne bi bilo pametno.', 'Ne mogu to dati.'],
    open: ['To se ne može otvoriti.', 'Ne otvara se. Čak ni uz moju snagu.'],
    close: ['To se ne može zatvoriti.', 'Nemam što zatvoriti.'],
    pick: ['Ne mogu to uzeti.', 'To mi ne treba.', 'Čak ni moji bicepsi to ne mogu podići.'],
    look: ['Ništa posebno.', 'Izgleda sasvim obično.'],
    talk: ['Nemam o čemu razgovarati s tim.', 'Ne vjerujem da će mi odgovoriti.'],
    use: ['To ne radi.', 'Ne znam kako bih to koristio.', 'Hm. Ne.'],
    push: ['Ne miče se. A ja sam jako, jako jak.', 'Gurao sam. Ništa.'],
    pull: ['Ne miče se.', 'Povukao sam. Ništa se nije dogodilo, osim istegnuća.'],
};
const HERO_LOOK = {
    skin: 0xeab27e, shirt: 0xf4f4f4, shirtType: 'tank', pants: 0x2848b0, shorts: true, shoes: 0x8a2020,
    hair: 0xf3d26a, hairStyle: 'ponytail', sh: 46, waist: 21, arm: 13, leg: 13, color: 0xffffff,
};
const SAVE_KEY = 'monkey2-save';
const pick = a => a[Math.floor(Math.random() * a.length)];

function forms(def, E) {
    const s = typeof def.forms === 'function' ? def.forms(E) : def.forms;
    const p = s.split('|');
    return { n: p[0], g: p[1] || p[0], d: p[2] || p[0], a: p[3] || p[0], i: p[4] || p[0] };
}
function newState() { return { room: 'luka', inv: [], money: 0, f: {}, ins: [], com: [], beachWins: 0, beachIdx: 0 }; }
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (s && s.room && ROOMS[s.room]) return Object.assign(newState(), s);
    } catch (e) {}
    return newState();
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function writeSave(st) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) {} }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) { this.st = data && data.cont ? loadState() : newState(); }

    get f() { return this.st.f; }

    create() {
        this.input.mouse.disableContextMenu();
        this.busy = false; this.choosing = false; this.ended = false;
        this.verb = null; this.pending = null; this.hoverT = null; this.hoverVerb = null;
        this.roomObjs = []; this.hotspots = []; this.actors = {}; this.dudes = [];
        this.invScroll = 0; this.actionId = 0; this.heroTarget = null; this.speechDone = null;

        this.hero = makeDude(this, HERO_LOOK);
        this.hero.id = 'hero';
        this.hero.setBelt(this.f.beltOn);
        this.hero.setChalk(this.f.chalked);

        this.speech = this.add.text(0, 0, '', {
            fontFamily: FONT, fontSize: '25px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
            align: 'center', wordWrap: { width: 470 },
        }).setOrigin(0.5, 1).setDepth(5000);
        this.toastT = this.add.text(W / 2, 64, '', {
            fontFamily: FONT, fontSize: '22px', color: '#ffe070', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(5100);
        this.fader = this.add.rectangle(0, 0, W, SH, 0x000000).setOrigin(0).setDepth(6000);
        this.buildUI();

        this.input.on('pointermove', p => this.onMove(p));
        this.input.on('pointerdown', (p, over) => this.onDown(p, over));
        this.input.keyboard.on('keydown-M', () => this.toggleMusic());
        this.input.keyboard.on('keydown-PERIOD', () => this.speechDone && this.speechDone());
        this.input.keyboard.on('keydown-ESC', () => this.speechDone && this.speechDone());

        this.script(async () => {
            this.buildRoom(this.st.room, null);
            await this.fadeTo(0, 500);
            if (this.R.enter) await this.R.enter(this);
        });
    }

    // ---- UI -------------------------------------------------------------------------------------

    buildUI() {
        this.add.rectangle(0, SH, W, H - SH, 0x000000).setOrigin(0).setDepth(7000);
        this.sentenceT = this.add.text(W / 2, SH + 20, '', { fontFamily: FONT, fontSize: '24px', color: '#4fd0d8' }).setOrigin(0.5).setDepth(7001);
        this.verbTexts = VERBS.map(([id, label], i) => {
            const col = Math.floor(i / 3), row = i % 3, x = 18 + col * 164, y = SH + 44 + row * 58;
            const t = this.add.text(x + 80, y + 27, label, { fontFamily: FONT, fontSize: '30px', color: '#3f9f4a' }).setOrigin(0.5).setDepth(7001);
            t.vid = id; t.box = [x, y, 160, 56];
            return t;
        });
        this.invG = this.add.graphics().setDepth(7001);
        this.invImgs = [];
        for (let i = 0; i < 12; i++) {
            const x = 520 + (i % 6) * 74, y = SH + 44 + Math.floor(i / 6) * 88;
            this.invImgs.push(this.add.image(x + 35, y + 42, 'it_jaje').setDepth(7002).setVisible(false));
        }
        this.musicG = this.add.graphics().setDepth(7001);
        this.drawMusicIcon();
    }

    drawMusicIcon() {
        const g = this.musicG, x = 990, y = SH + 20, on = Sound.musicOn;
        g.clear();
        g.fillStyle(on ? 0x4fd0d8 : 0x445566);
        g.fillRect(x - 12, y - 5, 7, 10); g.fillTriangle(x - 6, y - 5, x + 2, y - 11, x + 2, y + 11);
        g.fillRect(x - 6, y - 5, 8, 10);
        g.lineStyle(2, on ? 0x4fd0d8 : 0x445566);
        if (on) { g.beginPath(); g.arc(x + 4, y, 7, -0.8, 0.8); g.strokePath(); g.beginPath(); g.arc(x + 4, y, 12, -0.8, 0.8); g.strokePath(); }
        else { g.lineBetween(x + 6, y - 6, x + 16, y + 6); g.lineBetween(x + 16, y - 6, x + 6, y + 6); }
    }

    toggleMusic() { Sound.init(); Sound.toggleMusic(); this.drawMusicIcon(); }

    setPanelVisible(v) {
        for (const t of this.verbTexts) t.setVisible(v);
        this.invG.setVisible(v);
        if (!v) for (const im of this.invImgs) im.setVisible(false);
    }

    updateUI() {
        if (this.choosing) return;
        const dim = this.busy || this.ended;
        const active = this.pending ? this.pending.verb : this.verb;
        for (const t of this.verbTexts) {
            t.setColor(t.vid === active ? '#c8ff70' : t.vid === this.hoverVerb ? '#8fe08a' : '#3f9f4a');
            t.setAlpha(dim ? 0.35 : 1);
        }
        const inv = this.st.inv, g = this.invG;
        const maxScroll = Math.max(0, Math.ceil((inv.length - 12) / 6));
        this.invScroll = Phaser.Math.Clamp(this.invScroll, 0, maxScroll);
        g.clear();
        for (let i = 0; i < 12; i++) {
            const x = 520 + (i % 6) * 74, y = SH + 44 + Math.floor(i / 6) * 88;
            g.fillStyle(0x1c1030); g.fillRoundedRect(x, y, 70, 84, 6);
            g.lineStyle(2, 0x3a2a60); g.strokeRoundedRect(x, y, 70, 84, 6);
            const id = inv[i + this.invScroll * 6], im = this.invImgs[i];
            if (id) {
                im.setTexture('it_' + id).setVisible(true).setAlpha(dim ? 0.4 : 1);
                im.setTint(this.pending && this.pending.item === id ? 0xfff080 : 0xffffff);
            } else im.setVisible(false);
        }
        if (inv.length > 12) {
            g.fillStyle(this.invScroll > 0 ? 0x8a6ad0 : 0x2a2040); g.fillTriangle(976, SH + 110, 1004, SH + 110, 990, SH + 70);
            g.fillStyle(this.invScroll < maxScroll ? 0x8a6ad0 : 0x2a2040); g.fillTriangle(976, SH + 150, 1004, SH + 150, 990, SH + 190);
        }
        this.updateSentence();
    }

    updateSentence() {
        if (this.choosing) { this.sentenceT.setText(''); return; }
        if (this.busy || this.ended) { this.sentenceT.setText(''); return; }
        const t = this.hoverT, nm = t ? this.formsOf(t) : null;
        let s;
        if (this.pending) {
            const it = forms(ITEMS[this.pending.item], this);
            s = this.pending.verb === 'use'
                ? `Koristi ${it.a} s` + (nm ? ' ' + nm.i : '')
                : `Daj ${it.a}` + (nm ? ' ' + nm.d : '');
        } else {
            const v = this.verb || 'walk';
            if (nm && t.kind === 'item' && v === 'walk') s = nm.n.charAt(0).toUpperCase() + nm.n.slice(1);
            else s = VERB_LABEL[v] + (nm ? ' ' + (v === 'walk' ? nm.g : v === 'talk' ? nm.i : nm.a) : '');
        }
        this.sentenceT.setText(s);
    }

    formsOf(t) { return t.kind === 'item' ? forms(ITEMS[t.id], this) : forms(t.h.def, this); }

    hitVerb(x, y) {
        for (const t of this.verbTexts) { const b = t.box; if (x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]) return t.vid; }
        return null;
    }

    hitInv(x, y) {
        if (x < 520 || x >= 520 + 6 * 74 || y < SH + 44) return null;
        const col = Math.floor((x - 520) / 74), row = Math.floor((y - SH - 44) / 88);
        if (row > 1 || (x - 520) % 74 > 70) return null;
        return this.st.inv[row * 6 + col + this.invScroll * 6] || null;
    }

    // ---- input ----------------------------------------------------------------------------------

    onMove(p) {
        this.hoverVerb = null;
        let t = null;
        if (!this.busy && !this.choosing && !this.ended) {
            if (p.y < SH) { const h = this.hitScene(p.x, p.y); if (h) t = { kind: 'scene', h }; }
            else {
                const id = this.hitInv(p.x, p.y);
                if (id) t = { kind: 'item', id };
                this.hoverVerb = this.hitVerb(p.x, p.y);
            }
        }
        this.hoverT = t;
        this.updateUI();
    }

    onDown(p, over) {
        Sound.init();
        if (over && over.length) return;
        if (this.speechDone) { if (this.time.now - this.speechStart > 200) this.speechDone(); return; }
        if (p.x > 970 && p.y > SH && p.y < SH + 40) { this.toggleMusic(); return; }
        if (this.busy || this.choosing || this.ended) return;
        const right = p.rightButtonDown();
        if (p.y < SH) {
            const h = this.hitScene(p.x, p.y);
            if (h) { this.clickTarget({ kind: 'scene', h }, right); return; }
            if (right) return;
            this.pending = null; this.verb = null; this.actionId++;
            this.walkHero(p.x, p.y);
            this.updateUI();
            return;
        }
        const v = this.hitVerb(p.x, p.y);
        if (v) { this.pending = null; this.verb = v; Sound.sfx('click'); this.updateUI(); return; }
        if (this.st.inv.length > 12 && p.x > 970) {
            this.invScroll += p.y < SH + 130 ? -1 : 1;
            this.updateUI();
            return;
        }
        const id = this.hitInv(p.x, p.y);
        if (id) this.clickTarget({ kind: 'item', id }, right);
    }

    clickTarget(t, right) {
        if (this.pending) {
            const { verb, item } = this.pending;
            this.pending = null; this.verb = null;
            if (t.kind === 'item' && t.id === item) { this.updateUI(); return; }
            this.doAction(verb, t, item);
            return;
        }
        let verb = right ? this.defaultVerb(t) : (this.verb || 'walk');
        if (t.kind === 'item') {
            if (verb === 'walk') verb = 'use';
            const self = ITEMS[t.id].verbs && ITEMS[t.id].verbs.use;
            if ((verb === 'use' && !self) || verb === 'give') {
                this.pending = { verb, item: t.id };
                this.verb = verb;
                this.updateUI();
                return;
            }
        }
        this.verb = null;
        this.doAction(verb, t, null);
    }

    defaultVerb(t) {
        if (t.kind === 'item') return 'look';
        const d = t.h.def;
        return d.def || (d.exit ? 'walk' : t.h.dude ? 'talk' : 'look');
    }

    // ---- actions --------------------------------------------------------------------------------

    async doAction(verb, t, item) {
        const my = ++this.actionId;
        this.updateUI();
        if (t.kind === 'scene') {
            const h = t.h;
            if (verb === 'look' && !h.def.exit) this.faceToward(h);
            else {
                const p = this.approachPoint(h);
                const ok = await this.walkHero(p.x, p.y);
                if (!ok || my !== this.actionId) return;
                this.faceToward(h);
            }
        }
        await this.script(() => this.resolve(verb, t, item));
    }

    async resolve(verb, t, item) {
        let h;
        if (t.kind === 'scene') {
            const def = t.h.def, V = def.verbs || {};
            h = item ? (V[verb + ':' + item] || V[verb + ':*']) : V[verb];
            if (!h && def.exit && (verb === 'walk' || verb === 'open')) h = E => E.goto(def.exit, def.spawn);
            if (!h && verb === 'walk') return;
        } else {
            const V = ITEMS[t.id].verbs || {};
            if (item) {
                h = V['use:' + item] || (ITEMS[item].verbs || {})['use:' + t.id];
                if (!h && verb === 'give') h = 'Davati stvari samom sebi? To je tužno čak i za mene.';
                if (!h) h = 'To dvoje ne ide zajedno. Kao kardio i ja.';
            } else if (verb === 'pick') h = 'To već imam.';
            else h = V[verb];
        }
        if (!h) h = pick(DEFAULT_MSG[verb]);
        if (typeof h === 'function') h = await h(this, item);
        if (typeof h === 'string') await this.say('hero', h);
        else if (Array.isArray(h)) for (const line of h) await this.say('hero', line);
    }

    // Runs a cutscene/script with input locked, then saves.
    async script(fn) {
        this.busy = true;
        this.hoverT = null;
        this.updateUI();
        try { await fn(); } catch (e) { console.error(e); }
        if (this.ended) return;
        this.busy = false; this.verb = null; this.pending = null;
        writeSave(this.st);
        this.onMove(this.input.activePointer);
    }

    approachPoint(h) {
        const def = h.def;
        let x, y;
        if (def.walk) [x, y] = def.walk;
        else if (h.dude) {
            const d = h.dude, off = (d.o.sh * 2 + 60) * d.scale;
            x = d.c.x + (this.hero.c.x < d.c.x ? -off : off); y = d.c.y + 4;
        } else { const r = def.rect; x = r[0] + r[2] / 2; y = r[1] + r[3]; }
        const w = this.R.walk;
        return { x: Phaser.Math.Clamp(x, w.x1, w.x2), y: Phaser.Math.Clamp(y, w.y1, w.y2) };
    }

    faceToward(h) {
        if (h.def.face) { this.hero.setFacing(h.def.face); return; }
        const tx = h.dude ? h.dude.c.x : h.def.rect[0] + h.def.rect[2] / 2;
        if (Math.abs(tx - this.hero.c.x) > 4) this.hero.setFacing(tx > this.hero.c.x ? 1 : -1);
    }

    walkHero(x, y, free) {
        if (!free) {
            const w = this.R.walk;
            x = Phaser.Math.Clamp(x, w.x1, w.x2); y = Phaser.Math.Clamp(y, w.y1, w.y2);
        }
        if (this.heroTarget) this.heroTarget.res(false);
        return new Promise(res => { this.heroTarget = { x, y, res }; });
    }

    hitScene(x, y) {
        for (let i = this.hotspots.length - 1; i >= 0; i--) {
            const h = this.hotspots[i];
            if (!this.isVisible(h)) continue;
            const r = this.rectOf(h);
            if (x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) return h;
        }
        return null;
    }

    rectOf(h) {
        if (h.dude) {
            const d = h.dude, s = d.scale, w = (d.o.sh * 2 + 24) * s, hh = d.height * s;
            return [d.c.x - w / 2, d.c.y - hh, w, hh];
        }
        return h.def.rect;
    }

    isVisible(h) { return !h.def.visible || h.def.visible(this); }

    // ---- rooms ----------------------------------------------------------------------------------

    buildRoom(id, spawn) {
        const R = ROOMS[id];
        this.R = R;
        this.st.room = id;
        R.draw(this, this.gfx(0));
        this.hotspots = []; this.actors = {}; this.dudes = [];
        for (const def of R.objects || []) {
            const h = { def };
            if (def.make) h.disp = def.make(this);
            this.hotspots.push(h);
        }
        for (const def of R.actors || []) this.spawnActor(def);
        const sp = (spawn && R.spawn[spawn]) || R.spawn.default;
        this.hero.c.setPosition(sp.x, sp.y);
        this.hero.setFacing(sp.f || 1);
        this.hero.pose = null;
        this.hero.setProp(null);
        this.heroTarget = null;
        this.refresh();
    }

    spawnActor(def) {
        const d = makeDude(this, typeof def.look === 'function' ? def.look(this) : def.look);
        d.id = def.id;
        d.c.setPosition(def.x, def.y);
        d.setScale((def.scale || this.scaleAt(def.y)) * (def.size || 1));
        d.setFacing(def.face || 1);
        d.c.setDepth(def.depth || def.y);
        d.pose = d.basePose = def.pose || null;
        this.keep(d.c);
        this.dudes.push(d);
        this.actors[def.id] = d;
        const old = this.hotspots.find(h => h.def === def);
        if (old) old.dude = d; else this.hotspots.push({ def, dude: d });
        return d;
    }

    respawnActor(id) {
        const old = this.actors[id];
        const h = this.hotspots.find(x => x.dude === old);
        old.c.destroy();
        this.dudes = this.dudes.filter(d => d !== old);
        const d = this.spawnActor(h.def);
        this.refresh();
        return d;
    }

    clearRoom() {
        this.tweens.killAll();
        for (const o of this.roomObjs) o.destroy();
        this.roomObjs = [];
        this.toastT.setAlpha(0);
    }

    refresh() {
        for (const h of this.hotspots) {
            const vis = this.isVisible(h);
            if (h.dude) h.dude.c.setVisible(vis);
            if (h.disp) { h.disp.setVisible(vis); if (h.def.update) h.def.update(this, h.disp); }
        }
    }

    // ---- frame ----------------------------------------------------------------------------------

    update(time, dt) {
        dt = Math.min(dt, 50);
        if (!this.R) return;
        const ht = this.heroTarget, hc = this.hero.c;
        if (ht) {
            const dx = ht.x - hc.x, dy = ht.y - hc.y, dist = Math.hypot(dx, dy), sp = 0.26 * dt * this.scaleAt(hc.y);
            if (dist <= sp) {
                hc.x = ht.x; hc.y = ht.y;
                this.heroTarget = null; this.hero.walking = false;
                ht.res(true);
            } else {
                hc.x += dx / dist * sp; hc.y += dy / dist * sp;
                this.hero.walking = true;
                if (Math.abs(dx) > 3) this.hero.setFacing(dx > 0 ? 1 : -1);
            }
        } else this.hero.walking = false;
        this.hero.setScale(this.scaleAt(hc.y) * (this.R.heroSize || 1));
        hc.setDepth(hc.y);
        this.hero.update(dt);
        for (const d of this.dudes) d.update(dt);
    }

    scaleAt(y) {
        const s = this.R.scale;
        return Phaser.Math.Linear(s[1], s[3], Phaser.Math.Clamp((y - s[0]) / (s[2] - s[0]), 0, 1));
    }

    // ---- script API -----------------------------------------------------------------------------

    gfx(depth) { const g = this.add.graphics().setDepth(depth); this.roomObjs.push(g); return g; }
    keep(o) { this.roomObjs.push(o); return o; }
    txt(x, y, s, style, depth = 1) {
        return this.keep(this.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: '18px', color: '#ffffff' }, style)).setDepth(depth));
    }

    say(who, text) {
        let x, y, color, d = null;
        if (who === 'narr') { x = W / 2; y = 110; color = 0xffe070; }
        else if (typeof who === 'object') { x = who.x; y = who.y; color = who.color; }
        else {
            d = this.actor(who);
            if (!d) { console.warn('nema glumca', who); return Promise.resolve(); }
            x = d.c.x; y = d.c.y - d.height * d.scale - 14; color = d.color;
        }
        this.speech.setText(text).setColor(hex(color));
        const hw = this.speech.width / 2 + 8;
        this.speech.setPosition(Phaser.Math.Clamp(x, hw, W - hw), Math.max(this.speech.height + 6, y));
        if (d) d.talking = true;
        this.speechStart = this.time.now;
        return new Promise(res => {
            const done = () => {
                if (this.speechDone !== done) return;
                this.speechDone = null;
                timer.remove();
                if (d) d.talking = false;
                this.speech.setText('');
                res();
            };
            const timer = this.time.delayedCall(Math.max(1500, 900 + text.length * 62), done);
            this.speechDone = done;
        });
    }

    choose(lines) {
        this.choosing = true;
        this.setPanelVisible(false);
        this.sentenceT.setText('');
        const size = lines.length > 6 ? 20 : 22;
        return new Promise(res => {
            let y = SH + 12;
            const texts = lines.map((line, i) => {
                const t = this.add.text(18, y, line, { fontFamily: FONT, fontSize: size + 'px', color: '#b070f0', wordWrap: { width: 985 } })
                    .setDepth(7003).setInteractive({ useHandCursor: true });
                y += t.height + 3;
                t.on('pointerover', () => t.setColor('#ffef8a'));
                t.on('pointerout', () => t.setColor('#b070f0'));
                t.on('pointerdown', () => {
                    texts.forEach(x => x.destroy());
                    this.choosing = false;
                    this.setPanelVisible(true);
                    this.updateUI();
                    Sound.sfx('click');
                    res(i);
                });
                return t;
            });
        });
    }

    walk(x, y, free) { return this.walkHero(x, y, free); }
    face(x) {
        if (typeof x === 'number') this.hero.setFacing(x);
        else { const d = this.actor(x); this.hero.setFacing(d.c.x >= this.hero.c.x ? 1 : -1); }
    }
    wait(ms) { return new Promise(r => this.time.delayedCall(ms, r)); }
    has(id) { return this.st.inv.includes(id); }
    give(id) { if (!this.has(id)) this.st.inv.push(id); Sound.sfx('pick'); this.updateUI(); }
    take(id) { const i = this.st.inv.indexOf(id); if (i >= 0) this.st.inv.splice(i, 1); this.updateUI(); }
    actor(id) { return id === 'hero' ? this.hero : this.actors[id]; }
    nameOf(id) { const h = this.hotspots.find(x => x.def.id === id); return forms(h.def, this).n; }
    disp(id) { const h = this.hotspots.find(x => x.def.id === id); return h && (h.disp || (h.dude && h.dude.c)); }
    pose(who, p, ms) {
        const d = this.actor(who);
        d.pose = p || d.basePose;
        if (ms) return this.wait(ms).then(() => { d.pose = d.basePose; });
    }
    sfx(n) { Sound.sfx(n); }
    shake(ms, k) { this.cameras.main.shake(ms, k); }
    tween(cfg) { return new Promise(res => this.tweens.add(Object.assign({}, cfg, { onComplete: res }))); }
    toast(text) {
        this.tweens.killTweensOf(this.toastT);
        this.toastT.setText(text).setAlpha(1);
        this.tweens.add({ targets: this.toastT, alpha: 0, delay: 2200, duration: 600 });
    }
    fadeTo(a, ms) { return new Promise(res => this.tweens.add({ targets: this.fader, alpha: a, duration: ms, onComplete: res })); }

    async goto(id, spawn) {
        this.heroTarget = null;
        await this.fadeTo(1, 300);
        this.clearRoom();
        this.buildRoom(id, spawn);
        writeSave(this.st);
        await this.fadeTo(0, 300);
        if (this.R.enter) await this.R.enter(this);
    }

    showEnding() {
        this.ended = true; this.busy = true;
        clearSave();
        this.updateUI();
        const ov = this.add.rectangle(0, 0, W, H, 0x05040c).setOrigin(0).setDepth(9000).setAlpha(0).setInteractive();
        const items = [ov];
        const add = (y, s, size, color) => {
            const t = this.add.text(W / 2, y, s, {
                fontFamily: FONT, fontSize: size + 'px', color, align: 'center', wordWrap: { width: 820 },
                stroke: '#000000', strokeThickness: size > 40 ? 8 : 0,
            }).setOrigin(0.5).setDepth(9001).setAlpha(0);
            items.push(t);
            return t;
        };
        add(150, 'KRAJ', 96, '#ffcc33');
        add(290, 'Gajbruš Bicepvud postao je Gospodar Otoka Mišića, a LeBulk se ispuhao kao stari gumeni madrac.\n\nKažu da se u Staroj teretani u ponoć još uvijek čuje kako netko stenje pod šipkom...', 24, '#e8e0ff');
        add(420, `Uvrede: ${this.st.ins.length}/6   ·   Odgovori: ${this.st.com.length}/6   ·   Pobjede na plaži: ${this.st.beachWins}`, 22, '#4fd0d8');
        const btn = add(530, '[ IGRAJ PONOVO ]', 36, '#3f9f4a');
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#c8ff70'));
        btn.on('pointerout', () => btn.setColor('#3f9f4a'));
        btn.on('pointerdown', () => this.scene.start('Title'));
        add(620, 'Hvala na igranju! I ne preskačite dan za noge.', 20, '#8a7aaa');
        this.tweens.add({ targets: items, alpha: (t) => t === ov ? 0.92 : 1, duration: 1500 });
    }
}
