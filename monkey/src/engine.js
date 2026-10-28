// The point-and-click engine: rooms, walking, the nine verbs, inventory, speech, dialogue
// choices and the battle of wits. Room content and the story live in data.js; scripts there
// talk to the engine through the global G (the running GameScene).
const FONT = '"Lilita One", Georgia, sans-serif';
const SAVE_KEY = 'monkey.save.v1';
let G = null;

const VERBS = [
    ['give', 'Daj'], ['open', 'Otvori'], ['close', 'Zatvori'],
    ['take', 'Uzmi'], ['look', 'Gledaj'], ['talk', 'Pričaj s'],
    ['use', 'Koristi'], ['push', 'Gurni'], ['pull', 'Povuci'],
];
const VERB_LABEL = Object.fromEntries(VERBS);
VERB_LABEL.walk = 'Idi do';

// what Draž says when nothing more specific was written for an action
const DEFAULTS = {
    look: ['Ništ posebnoga.', 'Je, vidim. Lijepo.', 'Gledam, gledam... i ništ.'],
    take: ['To ne morem uzeti.', 'Kaj bi ja s tim?', 'Neće mi to trebati.'],
    open: ['To se ne da otvoriti.', 'Nema tu kaj otvarati.'],
    close: ['To se ne da zatvoriti.', 'Nema tu kaj zatvarati.'],
    talk: ['Ne bum pričal s tim. Ljudi bi mislili da sem čudan.', 'Ne odgovara. Kak i većina stvari v Gruntovcu.'],
    use: ['To ne ide.', 'Ne vidim kak bi to delalo.', 'Ništ se ne zgodi.'],
    push: ['Ne bude se pomaknulo.', 'Neće to ići.'],
    pull: ['Ne bude se pomaknulo.', 'Vučem, vučem... i ništ.'],
    give: ['Mislim da to ne bi htjel.', 'Ne bum to dal.'],
    useItem: ['Ne vidim kaj bi s tim.', 'To dvoje ne ide skupa.', 'Ne bu išlo.'],
};

// a word in the cases the sentence line needs: nominative, accusative, genitive, dative, instrumental
function N(n, a = n, g = n, d = n, i = n) { return { n, a, g, d, i }; }

const Geo = {
    inside(pt, poly) {
        let c = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const [xi, yi] = poly[i], [xj, yj] = poly[j];
            if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c;
        }
        return c;
    },
    closest(pt, poly) {
        if (Geo.inside(pt, poly)) return pt;
        let best = null, bd = Infinity;
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            const dx = b[0] - a[0], dy = b[1] - a[1];
            const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
            const q = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - pt[0], q[1] - pt[1]);
            if (d < bd) { bd = d; best = q; }
        }
        // nudge a hair inside so the next test passes
        const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
        return [best[0] + (cx - best[0]) * 0.01, best[1] + (cy - best[1]) * 0.01];
    },
};

class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) { this.startData = data || {}; }

    create() {
        G = this;
        this.input.mouse && this.input.mouse.disableContextMenu();
        const sv = this.startData.load ? GameScene.loadSave() : null;
        this.st = sv || { room: 'selo', entry: 'start', inv: [], flags: {}, insults: [...START_INSULTS], retorts: [] };
        this.st.inv = this.st.inv || [];
        this.busy = false;
        this.verb = 'walk';
        this.obj1 = null;
        this.invScroll = 0;
        this.hover = null;
        this.speech = null;
        this.choiceMode = null;
        this.moving = new Set();
        this.roomObjs = [];

        this.cameras.main.setBackgroundColor('#000000');
        this.buildUI();

        this.input.on('pointermove', p => this.onMove(p));
        this.input.on('pointerdown', p => this.onDown(p));
        this.input.keyboard.on('keydown', e => this.onKey(e));

        if (sv) this.enterRoom(sv.room, null, [sv.px, sv.py, sv.face]);
        else this.runScript(async () => { await this.enterRoom('selo', 'start'); await STORY.intro(); });
    }

    // ---- saving ------------------------------------------------------------------------------
    static loadSave() {
        try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.room ? s : null; } catch (e) { return null; }
    }
    static hasSave() { return !!GameScene.loadSave(); }
    save() {
        if (this.st.flags.kraj) return;
        try {
            const p = this.player;
            localStorage.setItem(SAVE_KEY, JSON.stringify({ ...this.st, px: Math.round(p.x), py: Math.round(p.y), face: p.flipX ? 'left' : 'right' }));
        } catch (e) { /* storage blocked: the game simply isn't saved */ }
    }

    // ---- UI ----------------------------------------------------------------------------------
    buildUI() {
        const g = this.add.graphics().setDepth(5000);
        g.fillStyle(0x1e1410, 1).fillRect(0, SH, VW, VH - SH);
        g.fillStyle(0x2a1c14, 1).fillRect(0, SH, VW, 34);
        // embroidered border along the top of the panel
        g.fillStyle(0xc8241c, 1).fillRect(0, SH, VW, 4);
        for (let i = 0; i < 64; i++) { g.fillStyle(i % 2 ? 0x2a5ab0 : 0xf2c030, 1); g.fillCircle(8 + i * 16, SH + 6, 2.2); }
        this.uiG = g;
        this.sentence = this.add.text(VW / 2, SH + 21, '', { fontFamily: FONT, fontSize: '22px', color: '#9be0c8' }).setOrigin(0.5).setDepth(5002);

        this.verbBtns = VERBS.map(([id, label], i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const r = { id, x: 14 + col * 138, y: SH + 44 + row * 60, w: 130, h: 52 };
            r.txt = this.add.text(r.x + r.w / 2, r.y + r.h / 2, label, { fontFamily: FONT, fontSize: '24px', color: '#d8c898' }).setOrigin(0.5).setDepth(5002);
            return r;
        });
        this.verbG = this.add.graphics().setDepth(5001);

        this.invSlots = [];
        for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
            const s = { x: 436 + c * 88, y: SH + 46 + r * 88, w: 82, h: 80 };
            s.img = this.add.image(s.x + s.w / 2, s.y + s.h / 2, 'it_lopata').setDepth(5003).setVisible(false);
            this.invSlots.push(s);
        }
        this.invG = this.add.graphics().setDepth(5001);
        this.arrows = [
            { dir: -1, x: 968, y: SH + 46, w: 44, h: 80 },
            { dir: 1, x: 968, y: SH + 134, w: 44, h: 80 },
        ];
        this.arrowT = this.arrows.map(a => this.add.text(a.x + a.w / 2, a.y + a.h / 2, a.dir < 0 ? '▲' : '▼', { fontFamily: FONT, fontSize: '26px', color: '#d8c898' }).setOrigin(0.5).setDepth(5002));

        // dialogue choices take over the whole panel
        this.choiceT = [];
        for (let i = 0; i < 6; i++) this.choiceT.push(this.add.text(24, SH + 44 + i * 36, '', { fontFamily: FONT, fontSize: '22px', color: '#c8a8f8', wordWrap: { width: 940 } }).setDepth(5003).setVisible(false));
        this.choiceArrows = [this.add.text(990, SH + 54, '▲', { fontFamily: FONT, fontSize: '26px', color: '#d8c898' }).setOrigin(0.5).setDepth(5003).setVisible(false),
                             this.add.text(990, SH + 200, '▼', { fontFamily: FONT, fontSize: '26px', color: '#d8c898' }).setOrigin(0.5).setDepth(5003).setVisible(false)];

        this.mute = this.add.text(VW - 10, 8, Sound.muted ? '♪̸' : '♪', { fontFamily: FONT, fontSize: '24px', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(1, 0).setDepth(6000);
        this.note = this.add.text(12, 10, '', { fontFamily: FONT, fontSize: '20px', color: '#ffe680', stroke: '#2a1a14', strokeThickness: 5 }).setDepth(6000);
        this.banner = this.add.text(VW / 2, 18, '', { fontFamily: FONT, fontSize: '30px', color: '#ffffff', stroke: '#2a1a14', strokeThickness: 7 }).setOrigin(0.5, 0).setDepth(6000);
        this.fader = this.add.rectangle(0, 0, VW, VH, 0x000000, 1).setOrigin(0, 0).setDepth(9000).setAlpha(0);
        this.drawUI();
    }

    drawUI() {
        const g = this.verbG, ig = this.invG;
        g.clear(); ig.clear();
        const inChoice = !!this.choiceMode;
        const dim = this.busy && !inChoice;
        const hv = this.hover;
        const hint = hv && hv.kind === 'hot' ? this.defaultVerb(hv.ref) : null;
        for (const b of this.verbBtns) {
            b.txt.setVisible(!inChoice);
            if (inChoice) continue;
            const active = this.verb === b.id, over = hv && hv.kind === 'verb' && hv.ref === b;
            g.fillStyle(active ? 0x5a2a1a : 0x2e2018, dim ? 0.4 : 1).fillRoundedRect(b.x, b.y, b.w, b.h, 10);
            g.lineStyle(2, active ? 0xf2c030 : 0x5a4030, dim ? 0.4 : 1).strokeRoundedRect(b.x, b.y, b.w, b.h, 10);
            b.txt.setColor(active ? '#ffd24a' : over ? '#ffffff' : hint === b.id ? '#ffeab0' : '#d8c898').setAlpha(dim ? 0.4 : 1);
        }
        const inv = this.st.inv;
        const maxScroll = Math.max(0, Math.ceil((inv.length - 12) / 6));
        this.invScroll = Math.min(this.invScroll, maxScroll);
        this.invSlots.forEach((s, i) => {
            const item = inv[this.invScroll * 6 + i];
            if (inChoice) { s.img.setVisible(false); return; }
            const over = hv && hv.kind === 'item' && hv.slot === s;
            ig.fillStyle(over ? 0x4a3020 : 0x2e2018, dim ? 0.4 : 1).fillRoundedRect(s.x, s.y, s.w, s.h, 8);
            ig.lineStyle(2, this.obj1 && this.obj1.item === item ? 0xf2c030 : 0x5a4030, dim ? 0.4 : 1).strokeRoundedRect(s.x, s.y, s.w, s.h, 8);
            if (item) s.img.setTexture('it_' + ITEMS[item].icon).setVisible(true).setAlpha(dim ? 0.4 : 1);
            else s.img.setVisible(false);
        });
        this.arrows.forEach((a, i) => {
            const on = a.dir < 0 ? this.invScroll > 0 : this.invScroll < maxScroll;
            this.arrowT[i].setVisible(!inChoice).setAlpha(on ? (dim ? 0.4 : 1) : 0.15);
            if (!inChoice) ig.fillStyle(0x2e2018, 1).fillRoundedRect(a.x, a.y, a.w, a.h, 8);
        });
        this.updateSentence();
    }

    updateSentence() {
        if (this.choiceMode || this.busy) { if (!this.lockedSentence) this.sentence.setText(''); return; }
        this.sentence.setText(this.sentenceFor(this.verb, this.obj1, this.hover && (this.hover.kind === 'hot' || this.hover.kind === 'item') ? this.hover : null));
    }

    nameOf(t, c = 'n') {
        if (!t) return '';
        const nm = t.kind === 'item' ? ITEMS[t.item].name : t.ref.name;
        return nm[c] || nm.n;
    }
    sentenceFor(verb, o1, o2) {
        const v = VERB_LABEL[verb];
        if (verb === 'use' && o1) return `${v} ${this.nameOf(o1, 'a')} s ${o2 ? this.nameOf(o2, 'i') : ''}`.trim();
        if (verb === 'give' && o1) return `${v} ${this.nameOf(o1, 'a')} ${o2 ? this.nameOf(o2, 'd') : ''}`.trim();
        if (!o2) return v;
        const c = verb === 'walk' ? 'g' : verb === 'talk' ? 'i' : 'a';
        return `${v} ${this.nameOf(o2, c)}`;
    }

    // ---- rooms -------------------------------------------------------------------------------
    async enterRoom(id, entry, pos) {
        const R = ROOMS[id];
        this.input.setDefaultCursor('crosshair');
        if (this.bg && this.fader.alpha < 1) await this.fade(1, 220);
        this.roomObjs.forEach(o => o.destroy());
        this.roomObjs = [];
        this.moving.clear();
        this.room = R; this.st.room = id;
        this.bg = this.add.image(0, 0, Backgrounds.ensure(this, id)).setOrigin(0, 0).setDepth(-1000);
        this.roomObjs.push(this.bg);
        this.props = {};
        for (const p of R.props || []) {
            const s = this.add.image(p.x, p.y, p.key).setOrigin(...(p.origin || [0.5, 1])).setDepth(p.depth != null ? p.depth : p.y);
            if (p.alpha != null) s.setAlpha(p.alpha);
            s.def = p;
            this.props[p.id] = s;
            this.roomObjs.push(s);
        }
        this.actors = {};
        for (const a of R.actors || []) {
            const key = 'ch_' + (a.char || a.id);
            const s = this.add.sprite(a.x, a.y, key, a.base || 'stand').setOrigin(0.5, 1);
            s.def = a; s.base = a.base || 'stand';
            s.setFlipX(a.face === 'left');
            s.setScale(a.scale || this.scaleAt(a.y));
            s.setDepth(a.depth != null ? a.depth : a.y);
            this.actors[a.id] = s;
            this.roomObjs.push(s);
        }
        const p = this.add.sprite(0, 0, 'ch_draz', 'stand').setOrigin(0.5, 1);
        p.base = 'stand'; p.def = { id: 'draz', col: Art.CHARS.draz.col };
        this.player = p; this.actors.draz = p;
        this.roomObjs.push(p);
        const e = pos || (R.entries[entry] || R.entries.start);
        this.placePlayer(e[0], e[1], e[2]);
        p.setVisible(!R.noPlayer);
        this.refresh();
        this.hover = null;
        Sound.music(R.music);
        await this.fade(0, 260);
        if (R.enter) await R.enter();
        this.save();
    }

    placePlayer(x, y, face) {
        const p = this.player;
        p.setPosition(x, y).setScale(this.scaleAt(y)).setDepth(y);
        if (face) p.setFlipX(face === 'left');
    }

    scaleAt(y) {
        const [y0, s0, y1, s1] = this.room.scale;
        return s0 + (s1 - s0) * Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    }

    refresh() {
        for (const id in this.props) {
            const s = this.props[id], d = s.def;
            s.setVisible(d.visible ? !!d.visible() : true);
        }
        for (const id in this.actors) {
            const s = this.actors[id];
            if (id === 'draz') continue;
            s.setVisible(s.def.visible ? !!s.def.visible() : true);
            if (s.def.frame && !s.talking) { const f = s.def.frame(); if (f) { s.base = f; s.setFrame(f); } }
        }
        this.drawUI();
    }

    fade(to, ms) {
        return new Promise(r => this.tweens.add({ targets: this.fader, alpha: to, duration: ms, onComplete: r }));
    }

    // ---- hit testing -------------------------------------------------------------------------
    hotRect(h) {
        if (h.actor) {
            const s = this.actors[h.actor];
            if (!s || !s.visible) return null;
            const w = s.displayWidth * (h.wk || 0.46), hh = s.displayHeight * (h.hk || 0.92);
            return [s.x - w / 2 + (h.dx || 0) * (s.flipX ? -1 : 1) * s.scaleX, s.y - hh, w, hh];
        }
        if (h.prop) {
            const s = this.props[h.prop];
            if (!s || !s.visible) return null;
            const b = s.getBounds();
            return [b.x, b.y, b.width, b.height];
        }
        return h.rect;
    }
    hotAt(x, y) {
        const list = this.room.hot || [];
        for (let i = list.length - 1; i >= 0; i--) {
            const h = list[i];
            if (h.visible && !h.visible()) continue;
            const r = this.hotRect(h);
            if (r && x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) return h;
        }
        return null;
    }
    uiAt(x, y) {
        const inR = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        if (this.choiceMode) {
            for (let i = 0; i < this.choiceT.length; i++) {
                const t = this.choiceT[i];
                if (t.visible && t.text && y >= t.y - 2 && y <= t.y + t.height + 2 && x < 960) return { kind: 'choice', idx: i };
            }
            if (x > 960 && y < SH + 120) return { kind: 'cscroll', dir: -1 };
            if (x > 960 && y > SH + 140) return { kind: 'cscroll', dir: 1 };
            return null;
        }
        for (const b of this.verbBtns) if (inR(b)) return { kind: 'verb', ref: b };
        for (const s of this.invSlots) if (inR(s)) {
            const item = this.st.inv[this.invScroll * 6 + this.invSlots.indexOf(s)];
            return item ? { kind: 'item', item, slot: s } : null;
        }
        for (const a of this.arrows) if (inR(a)) return { kind: 'arrow', dir: a.dir };
        return null;
    }

    defaultVerb(h) {
        if (!h) return null;
        if (h.default) return h.default;
        if (h.exit) return 'walk';
        if (h.actor && h.talk) return 'talk';
        return 'look';
    }

    // ---- input -------------------------------------------------------------------------------
    onMove(p) {
        if (this.busy && !this.choiceMode) { if (this.hover) { this.hover = null; this.drawUI(); } return; }
        let hv = null;
        if (p.y < SH) { if (!this.choiceMode) { const h = this.hotAt(p.x, p.y); if (h) hv = { kind: 'hot', ref: h }; } }
        else hv = this.uiAt(p.x, p.y);
        const same = (a, b) => (!a && !b) || (a && b && a.kind === b.kind && a.ref === b.ref && a.item === b.item && a.idx === b.idx && a.slot === b.slot);
        if (!same(hv, this.hover)) {
            this.hover = hv;
            if (this.choiceMode) this.drawChoices();
            this.drawUI();
        }
    }

    onDown(p) {
        Sound.init();
        if (p.y < 44 && p.x > VW - 50) { const m = Sound.toggleMute(); this.mute.setText(m ? '♪̸' : '♪'); return; }
        if (this.choiceMode) {
            const u = p.y >= SH ? this.uiAt(p.x, p.y) : null;
            if (u && u.kind === 'choice') this.pickChoice(u.idx);
            else if (u && u.kind === 'cscroll') { this.choiceMode.scroll = Math.max(0, Math.min(this.choiceMode.scroll + u.dir, Math.max(0, this.choiceMode.opts.length - 6))); this.drawChoices(); }
            return;
        }
        if (this.busy) { this.skipSpeech(); return; }
        const right = p.rightButtonDown();
        if (p.y < SH) {
            const h = this.hotAt(p.x, p.y);
            if (h) {
                if (right) this.activate(this.defaultVerb(h), { kind: 'hot', ref: h }, true);
                else this.activate(this.verb, { kind: 'hot', ref: h });
            } else {
                if (!(this.obj1 && !right)) { this.verb = 'walk'; this.obj1 = null; }
                this.walkPlayer(p.x, p.y);
                this.drawUI();
            }
            return;
        }
        const u = this.uiAt(p.x, p.y);
        if (!u) return;
        Sound.play('click');
        if (u.kind === 'verb') { this.verb = u.ref.id; this.obj1 = null; this.drawUI(); }
        else if (u.kind === 'arrow') { this.invScroll = Math.max(0, this.invScroll + u.dir); this.drawUI(); }
        else if (u.kind === 'item') {
            const t = { kind: 'item', item: u.item };
            if (right) this.activate('look', t, true);
            else this.activate(this.verb === 'walk' ? 'use' : this.verb, t);
        }
    }

    onKey(e) {
        if (e.key === '.' || e.key === 'Escape' || e.key === ' ') { if (this.busy) this.skipSpeech(); }
        if (e.key === 'm' || e.key === 'M') { const m = Sound.toggleMute(); this.mute.setText(m ? '♪̸' : '♪'); }
        if (this.choiceMode && /^[1-6]$/.test(e.key)) this.pickChoice(parseInt(e.key, 10) - 1);
    }

    activate(verb, t, viaRight) {
        if ((verb === 'use' || verb === 'give') && this.obj1 && !viaRight) {
            const a = this.obj1;
            if (a.kind === 'item' && t.kind === 'item' && a.item === t.item) return;
            this.run(verb, a, t);
            return;
        }
        if ((verb === 'use' || verb === 'give') && t.kind === 'item' && !(verb === 'use' && ITEMS[t.item].use)) {
            this.verb = verb; this.obj1 = t; this.drawUI();
            return;
        }
        this.run(verb, t);
    }

    run(verb, a, b) {
        this.verb = 'walk'; this.obj1 = null;
        this.lockedSentence = true;
        this.sentence.setText(this.sentenceFor(verb, b ? a : null, b || a));
        this.runScript(async () => {
            const hot = (b && b.kind === 'hot') ? b.ref : (a.kind === 'hot' ? a.ref : null);
            if (hot) {
                const ok = await this.walkToHot(hot);
                if (!ok) return;
            }
            this.lockedSentence = false;
            await this.perform(verb, a, b);
        });
    }

    async runScript(fn) {
        this.busy = true; this.hover = null; this.drawUI();
        try { await fn(); } catch (err) { console.error(err); }
        if (!this.sys.isActive() || this.ended) return;
        this.busy = false; this.lockedSentence = false;
        this.refresh();
        this.save();
    }

    async walkToHot(h) {
        let target = h.walk;
        if (!target) {
            const r = this.hotRect(h);
            if (!r) return false;
            target = Geo.closest([r[0] + r[2] / 2, r[1] + r[3] + 20], this.room.walk);
        }
        if (typeof target === 'function') target = target();
        await this.walkPlayer(target[0], target[1]);
        const r = this.hotRect(h);
        if (h.face) this.player.setFlipX(h.face === 'left');
        else if (r) this.player.setFlipX(r[0] + r[2] / 2 < this.player.x);
        return true;
    }

    async perform(verb, a, b) {
        if (verb === 'walk') {
            if (a.kind === 'hot' && a.ref.exit) await this.goExit(a.ref.exit);
            return;
        }
        if (a.kind === 'hot' && a.ref.exit && verb !== 'look') { await this.goExit(a.ref.exit); return; }
        let handler, say = DEFAULTS[verb];
        if (b) {
            // two objects: an item used with, or given to, something
            const item = a.item;
            if (b.kind === 'item') {
                handler = COMBOS[item + '+' + b.item] || COMBOS[b.item + '+' + item];
                say = DEFAULTS.useItem;
            } else {
                const map = verb === 'give' ? b.ref.give : b.ref.useWith;
                handler = map && (map[item] || map['*']);
                if (verb === 'use' && !handler) say = DEFAULTS.use;
            }
        } else if (a.kind === 'item') {
            const it = ITEMS[a.item];
            handler = verb === 'look' ? it.look : it[verb];
            if (verb === 'take' && !handler) handler = 'Već ga imam.';
        } else {
            handler = a.ref[verb];
        }
        if (typeof handler === 'function') await handler(a, b);
        else if (Array.isArray(handler)) for (const l of handler) await this.say('draz', l);
        else if (typeof handler === 'string') await this.say('draz', handler);
        else await this.say('draz', Phaser.Utils.Array.GetRandom(say));
    }

    async goExit(ex) {
        const e = typeof ex === 'function' ? ex() : ex;
        if (!e) return;
        if (e.walk) await this.walkPlayer(e.walk[0], e.walk[1]);
        await this.enterRoom(e.room, e.entry);
    }

    // ---- walking -----------------------------------------------------------------------------
    walkPlayer(x, y) {
        const t = Geo.closest([x, Math.min(y, SH - 2)], this.room.walk);
        return this.walkSprite(this.player, t[0], t[1]);
    }
    walkSprite(s, x, y, speed = 190) {
        if (s.mv && s.mv.resolve) s.mv.resolve();
        return new Promise(resolve => {
            s.mv = { tx: x, ty: y, resolve, speed, acc: 0, f: 0 };
            if (Math.abs(x - s.x) > 2) s.setFlipX(x < s.x);
            this.moving.add(s);
        });
    }

    update(time, dtMs) {
        const dt = Math.min(dtMs, 50) / 1000;
        for (const s of this.moving) {
            const m = s.mv;
            const dx = m.tx - s.x, dy = m.ty - s.y, d = Math.hypot(dx, dy * 1.6);
            const sc = s === this.player || s.def.perspective !== false ? s.scaleY : 1;
            const step = m.speed * Math.max(0.5, sc) * dt;
            if (d <= step || d < 1) {
                s.setPosition(m.tx, m.ty);
                this.moving.delete(s);
                s.setFrame(s.base);
                const r = m.resolve; s.mv = null; r();
            } else {
                s.x += dx / d * step; s.y += dy * 1.6 / d * step / 1.6;
                m.acc += step;
                const stride = 15 * Math.max(0.5, sc);
                while (m.acc > stride) { m.acc -= stride; m.f = (m.f + 1) % 6; }
                s.setFrame('walk' + m.f);
            }
            if (s.def.perspective !== false) s.setScale(this.scaleAt(s.y));
            s.setDepth(s.def.depth != null ? s.def.depth : s.y);
        }
    }

    // ---- speech ------------------------------------------------------------------------------
    say(who, text, opts = {}) {
        const s = this.actors[who];
        const col = (s && s.def && (s.def.col || (Art.CHARS[s.def.char || s.def.id] || {}).col)) || '#ffffff';
        this.skipSpeech(true);
        if (this.heldText) { this.heldText.destroy(); this.heldText = null; }
        const t = this.add.text(0, 0, text, {
            fontFamily: FONT, fontSize: '25px', color: col, stroke: '#1a0e08', strokeThickness: 6, align: 'center',
            wordWrap: { width: 560 }, lineSpacing: -2,
        }).setOrigin(0.5, 1).setDepth(7000);
        let hx = VW / 2, hy = 120;
        if (s && s.visible) {
            hx = s.x;
            hy = s.y - s.displayHeight * (s.def.headK || 0.92) - 8;
        }
        hx = Math.max(t.width / 2 + 10, Math.min(VW - t.width / 2 - 10, hx));
        hy = Math.max(t.height + 6, hy);
        t.setPosition(hx, hy);
        const ms = opts.ms || Math.max(1400, 700 + text.length * 52);
        let talkTimer = null;
        if (s && s.visible && !s.def.noTalk) {
            s.talking = true;
            const base = s.base || 'stand';
            const frames = base.startsWith('sit') ? ['sittalk', 'sittalk2', 'sit', 'sittalk2'] : base === 'sit' ? ['sittalk'] :
                s.def.talkFrames || (base === 'stand' ? ['talk', 'talk2', 'stand', 'talk2'] : [base]);
            let i = 0;
            talkTimer = this.time.addEvent({ delay: 140, loop: true, callback: () => { if (!s.mv) s.setFrame(frames[i++ % frames.length]); } });
        }
        return new Promise(resolve => {
            const done = () => {
                if (!this.speech || this.speech.t !== t) return;
                this.speech = null;
                // a held line stays up (an insult, while Draž picks his answer) until the next one
                if (opts.hold) this.heldText = t;
                else t.destroy();
                if (talkTimer) talkTimer.remove();
                if (s) { s.talking = false; if (!s.mv && s.active) s.setFrame(s.base || 'stand'); }
                resolve();
            };
            const timer = this.time.delayedCall(ms, done);
            this.speech = { t, done, timer, born: this.time.now };
        });
    }
    skipSpeech(force) {
        const sp = this.speech;
        if (!sp) return;
        if (!force && this.time.now - sp.born < 180) return;
        sp.timer.remove();
        sp.done();
    }
    async talk(lines) { for (const [who, l] of lines) await this.say(who, l); }

    wait(ms) { return new Promise(r => this.time.delayedCall(ms, r)); }

    // ---- dialogue choices --------------------------------------------------------------------
    choose(opts) {
        return new Promise(resolve => {
            this.choiceMode = { opts, resolve, scroll: 0 };
            this.hover = null;
            this.drawChoices();
            this.drawUI();
        });
    }
    drawChoices() {
        const cm = this.choiceMode;
        this.choiceT.forEach((t, i) => {
            const o = cm && cm.opts[cm.scroll + i];
            if (!o) { t.setVisible(false).setText(''); return; }
            const over = this.hover && this.hover.kind === 'choice' && this.hover.idx === i;
            t.setVisible(true).setText((cm.scroll + i + 1) + '. ' + o.t).setColor(over ? '#ffffff' : o.dim ? '#8a7aa8' : '#c8a8f8');
        });
        // long lines wrap: lay them out one below the other
        let y = SH + 44;
        this.choiceT.forEach(t => { t.setY(y); if (t.visible) y += Math.max(30, t.height + 4); });
        const many = cm && cm.opts.length > 6;
        this.choiceArrows[0].setVisible(!!many).setAlpha(many && cm.scroll > 0 ? 1 : 0.2);
        this.choiceArrows[1].setVisible(!!many).setAlpha(many && cm.scroll < cm.opts.length - 6 ? 1 : 0.2);
    }
    pickChoice(idx) {
        const cm = this.choiceMode;
        const o = cm && cm.opts[cm.scroll + idx];
        if (!o) return;
        Sound.play('click');
        this.choiceMode = null;
        this.choiceT.forEach(t => t.setVisible(false));
        this.choiceArrows.forEach(t => t.setVisible(false));
        this.hover = null;
        this.drawUI();
        cm.resolve(o);
    }

    // a dialogue tree: opts are { t, cond, run } and run returns 'end' to leave
    async dialog(optsFn) {
        for (;;) {
            const opts = optsFn().filter(o => !o.cond || o.cond());
            const o = await this.choose(opts);
            if (!o.silent) await this.say('draz', o.say || o.t);
            const r = o.run ? await o.run() : 'end';
            if (r === 'end') return;
        }
    }

    // ---- state helpers used by the scripts ---------------------------------------------------
    has(id) { return this.st.inv.includes(id); }
    async addItem(id, quiet) {
        if (this.has(id)) return;
        this.st.inv.push(id);
        if (!quiet) Sound.play('pickup');
        this.invScroll = Math.max(0, Math.ceil((this.st.inv.length - 12) / 6));
        this.refresh();
    }
    removeItem(id) { this.st.inv = this.st.inv.filter(i => i !== id); this.refresh(); }
    flag(n) { return this.st.flags[n]; }
    set(n, v = true) { this.st.flags[n] = v; this.refresh(); }
    actor(id) { return this.actors[id]; }
    prop(id) { return this.props[id]; }
    face(who, dir) { const s = this.actors[who]; if (s) s.setFlipX(dir === 'left'); }
    facePlayerTo(who) { const s = this.actors[who]; if (s) this.player.setFlipX(s.x < this.player.x); }
    async pose(who, frame, ms = 500) {
        const s = this.actors[who];
        s.setFrame(frame);
        await this.wait(ms);
        s.setFrame(s.base);
    }
    setBase(who, frame) { const s = this.actors[who]; s.base = frame; s.setFrame(frame); }
    sfx(n) { Sound.play(n); }
    tween(cfg) { return new Promise(r => this.tweens.add({ ...cfg, onComplete: r })); }
    notify(msg) {
        this.note.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.note);
        this.tweens.add({ targets: this.note, alpha: 0, delay: 2200, duration: 600 });
    }
    async card(lines, ms = 2600, hold = false) {
        // a black title card for passing time
        await this.fade(1, 400);
        const t = this.add.text(VW / 2, VH / 2, lines, { fontFamily: FONT, fontSize: '34px', color: '#f4e8c8', align: 'center', wordWrap: { width: 800 }, lineSpacing: 6 }).setOrigin(0.5).setDepth(9500).setAlpha(0);
        await this.tween({ targets: t, alpha: 1, duration: 400 });
        await new Promise(r => {
            const tm = this.time.delayedCall(ms, r);
            this.speech = { t: { destroy() {} }, done: () => { this.speech = null; r(); }, timer: tm, born: this.time.now };
        });
        this.speech = null;
        await this.tween({ targets: t, alpha: 0, duration: 300 });
        t.destroy();
        if (!hold) await this.fade(0, 400);
    }

    // ---- the battle of wits ------------------------------------------------------------------
    // Every insult has exactly one fitting comeback. Draž learns insults when they are thrown
    // at him and comebacks when someone answers his. Đuka takes turns with Draž and sometimes
    // fumbles; Jaga and the Direktor only attack, each with their own versions of the insults.
    async duel(oppId) {
        const OPP = DUEL_OPPONENTS[oppId];
        const st = this.st;
        let me = 0, them = 0, myTurn = OPP.trades;
        const need = 3;
        let deck = Phaser.Utils.Array.Shuffle(INSULTS.map((_, i) => i));
        const prevMusic = this.room.music;
        Sound.music('zafrkancija');
        const score = () => this.banner.setText(`Draž ${me}  :  ${them} ${OPP.name}`);
        score();
        const learn = (kind, i) => {
            const list = kind === 'i' ? st.insults : st.retorts;
            if (list.includes(i)) return;
            list.push(i);
            Sound.play('learn');
            this.notify(kind === 'i' ? 'Naučil si novu zafrkanciju!' : 'Naučil si novi odgovor!');
        };
        while (me < need && them < need) {
            if (myTurn) {
                const opts = st.insults.map(i => ({ t: INSULTS[i].i, i }));
                opts.push(...WEAK_INSULTS.map(t => ({ t, i: -1 })));
                const o = await this.choose(opts);
                await this.say('draz', o.t);
                if (o.i < 0) {
                    await this.say(oppId, Phaser.Utils.Array.GetRandom(OPP.mock));
                    them++; Sound.play('lose');
                } else if (Math.random() < OPP.skill) {
                    await this.say(oppId, INSULTS[o.i].r);
                    learn('r', o.i);
                    them++; Sound.play('lose');
                } else {
                    await this.say(oppId, Phaser.Utils.Array.GetRandom(OPP.fumble));
                    me++; Sound.play('point');
                }
                myTurn = false;
            } else {
                if (!deck.length) deck = Phaser.Utils.Array.Shuffle(INSULTS.map((_, i) => i));
                // Đuka prefers the insults Draž hasn't heard yet, so practice teaches something
                let pick = deck.findIndex(i => !st.insults.includes(i));
                if (pick < 0 || !OPP.trades || Math.random() < 0.35) pick = 0;
                const ins = deck.splice(pick, 1)[0];
                await this.say(oppId, INSULTS[ins][OPP.key], { hold: true });
                if (OPP.trades) learn('i', ins);
                const opts = st.retorts.map(i => ({ t: INSULTS[i].r, i }));
                opts.push(...WEAK_RETORTS.map(t => ({ t, i: -1 })));
                const o = await this.choose(opts);
                await this.say('draz', o.t);
                if (o.i === ins) {
                    me++; Sound.play('point');
                    if (!OPP.trades) await this.say(oppId, Phaser.Utils.Array.GetRandom(OPP.hurt));
                } else {
                    them++; Sound.play('lose');
                    await this.say(oppId, Phaser.Utils.Array.GetRandom(OPP.laugh));
                }
                // sparring with Đuka is turn about, so practice always teaches something
                if (OPP.trades) myTurn = true;
            }
            score();
        }
        this.banner.setText('');
        if (this.heldText) { this.heldText.destroy(); this.heldText = null; }
        Sound.music(prevMusic);
        const won = me >= need;
        Sound.play(won ? 'win' : 'lose');
        return won;
    }
}
