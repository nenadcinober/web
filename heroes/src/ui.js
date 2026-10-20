// UI toolkit: panels, buttons, text and promise-based modal dialogs shared by every scene.
const UI = {
    GOLD: 0xd8b860, GOLDS: '#f0d890', TXT: '#f0e6c8', DIM: '#a89878',
    init(scene) {
        const [c, x] = Art.canvas(128, 128);
        const r = Art.rnd(42);
        x.fillStyle = '#3a2818'; x.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,160,0.05)'; x.fillRect(r() * 128, r() * 128, 2 + r() * 3, 1 + r() * 2); }
        Art.add(scene, 'panelbg', c);
        const [c2, x2] = Art.canvas(128, 128);
        x2.fillStyle = '#5a4a3a'; x2.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 40; i++) { const w = 20 + r() * 30, h = 12 + r() * 8; Art.rrect(x2, r() * 128 - 10, r() * 128 - 6, w, h, 3, `rgba(${90 + r() * 30},${76 + r() * 20},${60 + r() * 20},1)`, 1, 'rgba(20,10,0,0.6)'); }
        Art.add(scene, 'stonebg', c2);
    },
    text(scene, x, y, s, size = 16, color = UI.TXT, opts = {}) {
        const t = scene.add.text(x, y, s, Object.assign({
            fontFamily: opts.title ? TFONT : FONT, fontSize: size + 'px', color,
            stroke: '#000000', strokeThickness: opts.stroke ?? 3, align: opts.align || 'left',
            wordWrap: opts.wrap ? { width: opts.wrap } : undefined, lineSpacing: opts.lineSpacing || 0,
        }, opts.style || {}));
        if (opts.origin !== undefined) t.setOrigin(...[].concat(opts.origin));
        if (opts.bold) t.setFontStyle('bold');
        return t;
    },
    panel(scene, x, y, w, h, opts = {}) {
        const c = scene.add.container(x, y);
        const bg = scene.add.tileSprite(0, 0, w, h, opts.stone ? 'stonebg' : 'panelbg').setOrigin(0);
        const g = scene.add.graphics();
        g.lineStyle(3, 0x000000, 1).strokeRect(0, 0, w, h);
        g.lineStyle(2, UI.GOLD, 1).strokeRect(2, 2, w - 4, h - 4);
        g.lineStyle(1, 0x6a5020, 1).strokeRect(5, 5, w - 10, h - 10);
        c.add([bg, g]);
        if (opts.alpha) bg.setAlpha(opts.alpha);
        return c;
    },
    frame(scene, x, y, w, h, color = UI.GOLD, width = 2) {
        const g = scene.add.graphics();
        g.lineStyle(width, color, 1).strokeRect(x, y, w, h);
        return g;
    },
    button(scene, x, y, w, h, label, onClick, opts = {}) {
        const c = scene.add.container(x, y);
        const g = scene.add.graphics();
        let disabled = !!opts.disabled, hover = false;
        const draw = () => {
            g.clear();
            const top = disabled ? 0x4a4038 : hover ? 0x8a5a2a : 0x6a4020, bot = disabled ? 0x2a2420 : hover ? 0x5a3010 : 0x3a2010;
            g.fillGradientStyle(top, top, bot, bot, 1).fillRect(0, 0, w, h);
            g.lineStyle(2, 0x000000, 1).strokeRect(0, 0, w, h);
            g.lineStyle(1, disabled ? 0x6a6050 : hover ? 0xffe8a0 : UI.GOLD, 1).strokeRect(2, 2, w - 4, h - 4);
        };
        draw();
        c.add(g);
        let lbl = null;
        if (opts.icon) {
            const im = scene.add.image(w / 2, h / 2, opts.icon);
            const s = Math.min((w - 6) / im.width, (h - 6) / im.height, opts.iconScale || 1);
            im.setScale(s); c.add(im);
            if (label) { lbl = UI.text(scene, w / 2, h - 2, label, 12, UI.TXT, { origin: [0.5, 1] }); c.add(lbl); }
        } else {
            lbl = UI.text(scene, w / 2, h / 2, label, opts.size || 16, disabled ? '#807060' : UI.GOLDS, { origin: 0.5, title: opts.title });
            c.add(lbl);
        }
        const zone = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
        c.add(zone);
        zone.on('pointerover', () => { hover = true; draw(); if (opts.tip && scene.status) scene.status(opts.tip); });
        zone.on('pointerout', () => { hover = false; draw(); if (opts.tip && scene.status) scene.status(''); });
        zone.on('pointerup', (p) => { if (disabled || p.rightButtonReleased()) return; Sfx.play('click'); onClick && onClick(); });
        c.setDisabled = (d) => { disabled = d; draw(); if (lbl && !opts.icon) lbl.setColor(d ? '#807060' : UI.GOLDS); return c; };
        c.setLabel = (s) => { if (lbl) lbl.setText(s); return c; };
        c.zone = zone;
        c.setSize(w, h);
        return c;
    },
    iconCount(scene, x, y, key, count, opts = {}) {
        const c = scene.add.container(x, y);
        const im = scene.add.image(0, 0, key).setOrigin(0.5);
        if (opts.size) im.setScale(opts.size / Math.max(im.width, im.height));
        c.add(im);
        if (count !== undefined && count !== null) c.add(UI.text(scene, 0, (opts.size || im.height) / 2 + 2, String(count), opts.font || 13, UI.TXT, { origin: [0.5, 0] }));
        return c;
    },

    // ---------------- modal dialogs ----------------
    modal(scene, w, h, opts = {}) {
        const depth = 5000 + (scene._modalDepth = (scene._modalDepth || 0) + 10);
        const blocker = scene.add.rectangle(0, 0, VW, VH, 0x000000, opts.dim ?? 0.45).setOrigin(0).setInteractive().setDepth(depth);
        blocker.on('pointerdown', (p, lx, ly, e) => e && e.stopPropagation && e.stopPropagation());
        const x = opts.x ?? Math.round((VW - w) / 2), y = opts.y ?? Math.round((VH - h) / 2);
        const pnl = UI.panel(scene, x, y, w, h).setDepth(depth + 1);
        const items = [blocker, pnl];
        const m = {
            x, y, w, h, c: pnl, depth: depth + 1,
            add(o) { pnl.add(o); return o; },
            close() { items.forEach(o => o.destroy()); scene._modalDepth -= 10; scene._modals = (scene._modals || 1) - 1; },
        };
        scene._modals = (scene._modals || 0) + 1;
        if (opts.title) m.add(UI.text(scene, w / 2, 14, opts.title, 20, UI.GOLDS, { origin: [0.5, 0], title: true }));
        return m;
    },
    anyModal(scene) { return (scene._modals || 0) > 0; },
    // icons: [{key, label, scale}]
    msg(scene, text, opts = {}) {
        return new Promise(resolve => {
            const icons = opts.icons || [];
            const w = opts.w || 440;
            const tmp = UI.text(scene, 0, 0, text, 17, UI.TXT, { wrap: w - 50, align: 'center' });
            const th = tmp.height; tmp.destroy();
            const extra = Math.max(0, ...icons.map(ic => (String(ic.label || '').split('\n').length - 1)));
            const iconH = icons.length ? 100 + extra * 18 : 0;
            const btns = opts.buttons || [{ label: 'OK', value: true }];
            const h = (opts.title ? 44 : 22) + th + 18 + iconH + 64;
            const m = UI.modal(scene, w, h, { title: opts.title });
            let y = opts.title ? 48 : 22;
            m.add(UI.text(scene, w / 2, y, text, 17, UI.TXT, { origin: [0.5, 0], wrap: w - 50, align: 'center' }));
            y += th + 14;
            if (icons.length) {
                const step = Math.min(110, (w - 40) / icons.length);
                icons.forEach((ic, i) => {
                    const ix = w / 2 + (i - (icons.length - 1) / 2) * step;
                    const im = scene.add.image(ix, y + 34, ic.key);
                    im.setScale(ic.scale || Math.min(1, 64 / Math.max(im.width, im.height)));
                    m.add(im);
                    if (ic.label) m.add(UI.text(scene, ix, y + 72, ic.label, 14, UI.TXT, { origin: [0.5, 0], align: 'center' }));
                    if (opts.pick) {
                        const z = scene.add.zone(ix - step / 2 + 4, y - 4, step - 8, 92 + extra * 18).setOrigin(0).setInteractive({ useHandCursor: true });
                        const fr = scene.add.graphics(); m.add(fr);
                        z.on('pointerup', () => { opts.picked = i; m.c.list.filter(o => o._pickFrame).forEach(o => o.clear()); fr.clear().lineStyle(2, 0xffe080).strokeRect(ix - step / 2 + 4, y - 4, step - 8, 92 + extra * 18); });
                        fr._pickFrame = true;
                        m.add(z);
                        if (i === (opts.picked ?? 0)) fr.lineStyle(2, 0xffe080).strokeRect(ix - step / 2 + 4, y - 4, step - 8, 92 + extra * 18);
                    }
                });
                y += iconH;
            }
            const bw = 110, gap = 16, tot = btns.length * bw + (btns.length - 1) * gap;
            const done = v => { m.close(); scene.input.keyboard.off('keydown', onKey); resolve(opts.pick ? (v === false ? -1 : opts.picked ?? 0) : v); };
            btns.forEach((b, i) => m.add(UI.button(scene, (w - tot) / 2 + i * (bw + gap), h - 52, bw, 36, b.label, () => done(b.value))));
            const onKey = (e) => { if (e.key === 'Enter') done(btns[0].value); if (e.key === 'Escape') done(btns[btns.length - 1].value); };
            scene.time.delayedCall(50, () => scene.input.keyboard.on('keydown', onKey));
        });
    },
    confirm(scene, text, opts = {}) {
        return UI.msg(scene, text, Object.assign({ buttons: [{ label: opts.yes || 'Yes', value: true }, { label: opts.no || 'No', value: false }] }, opts));
    },
    // pick one of several icon options; returns index
    pick(scene, text, icons, opts = {}) {
        return UI.msg(scene, text, Object.assign({ icons, pick: true, picked: 0, buttons: [{ label: 'OK', value: true }].concat(opts.cancel ? [{ label: 'Cancel', value: false }] : []) }, opts));
    },
    // amount slider dialog -> number or 0
    amount(scene, title, max, opts = {}) {
        return new Promise(resolve => {
            const w = 420, h = opts.h || 230;
            const m = UI.modal(scene, w, h, { title });
            let n = opts.start ?? max;
            const info = m.add(UI.text(scene, w / 2, 52, '', 16, UI.TXT, { origin: [0.5, 0], align: 'center', wrap: w - 40 }));
            const bar = scene.add.graphics(); m.add(bar);
            const bx = 60, by = 118, bw = w - 120;
            const draw = () => {
                bar.clear();
                bar.fillStyle(0x1a1008).fillRect(bx, by, bw, 12).lineStyle(1, UI.GOLD).strokeRect(bx, by, bw, 12);
                const f = max ? n / max : 0;
                bar.fillStyle(0xc89030).fillRect(bx, by, bw * f, 12);
                bar.fillStyle(0xf0e0a0).fillRect(bx + bw * f - 4, by - 5, 8, 22);
                info.setText(opts.render ? opts.render(n) : String(n));
            };
            const z = scene.add.zone(bx - 6, by - 10, bw + 12, 32).setOrigin(0).setInteractive({ useHandCursor: true, draggable: true });
            const setFrom = (px) => { n = Math.round(clamp((px - m.x - bx) / bw, 0, 1) * max); draw(); };
            z.on('pointerdown', p => setFrom(p.x)); z.on('drag', p => setFrom(p.x));
            m.add(z);
            m.add(UI.button(scene, 18, by - 6, 34, 24, '-', () => { n = Math.max(0, n - 1); draw(); }));
            m.add(UI.button(scene, w - 52, by - 6, 34, 24, '+', () => { n = Math.min(max, n + 1); draw(); }));
            m.add(UI.button(scene, w / 2 - 50, by + 24, 100, 24, 'Max', () => { n = max; draw(); }, { size: 14 }));
            m.add(UI.button(scene, w / 2 - 120, h - 50, 110, 36, opts.ok || 'OK', () => { m.close(); resolve(n); }));
            m.add(UI.button(scene, w / 2 + 10, h - 50, 110, 36, 'Cancel', () => { m.close(); resolve(0); }));
            draw();
        });
    },
    // floating info box (right-click popups); returns destroyable container
    popup(scene, x, y, lines, opts = {}) {
        const w = opts.w || 260;
        const t = UI.text(scene, 0, 0, lines.join('\n'), 15, UI.TXT, { wrap: w - 24, align: opts.align || 'left', lineSpacing: 2 });
        const h = t.height + 20 + (opts.icon ? 80 : 0);
        x = clamp(x, 4, VW - w - 4); y = clamp(y, 4, VH - h - 4);
        const p = UI.panel(scene, x, y, w, h).setDepth(9000);
        if (opts.icon) { const im = scene.add.image(w / 2, 44, opts.icon); im.setScale(Math.min(1, 72 / Math.max(im.width, im.height))); p.add(im); }
        t.setPosition(12, 10 + (opts.icon ? 80 : 0)); p.add(t);
        return p;
    },
    // creature stat card
    creatureInfo(scene, cid, n, extra = {}) {
        const c = CREATURES[cid] || cdef(cid);
        const lines = [
            `${n !== undefined ? (n + ' ') : ''}${c.name}`,
            `Attack: ${c.att}${extra.att !== undefined ? ` (${extra.att})` : ''}`,
            `Defense: ${c.def}${extra.def !== undefined ? ` (${extra.def})` : ''}`,
            `Damage: ${c.min}${c.max !== c.min ? '-' + c.max : ''}`,
            `Health: ${c.hp}${extra.hp !== undefined ? ` (left ${extra.hp})` : ''}`,
            `Speed: ${c.spd}${extra.spd !== undefined ? ` (${extra.spd})` : ''}`,
        ];
        if (c.shoot) lines.push(`Shots: ${extra.shots ?? c.shoot}`);
        if (c.grow) lines.push(`Growth: ${c.grow}/week   Cost: ${c.cost}g${c.extra ? ' +' + Object.entries(c.extra).map(([k, v]) => v + ' ' + k).join(' ') : ''}`);
        const ab = [];
        if (c.fly) ab.push('Flying'); if (c.shoot) ab.push('Ranged'); if (c.large) ab.push('Large'); if (c.dbl) ab.push('Strikes twice'); if (c.dshot) ab.push('Shoots twice');
        if (c.noRetal) ab.push('No enemy retaliation'); if (c.unlRetal) ab.push('Unlimited retaliations'); if (c.retals === 2) ab.push('Retaliates twice');
        if (c.undead) ab.push('Undead'); if (c.breath) ab.push('Breath attack'); if (c.nmp) ab.push('No melee penalty'); if (c.resist) ab.push(`Resists spells ${c.resist}%`);
        if (c.regen) ab.push('Regeneration'); if (c.drain) ab.push('Life drain'); if (c.aoe) ab.push('Area attack'); if (c.joust) ab.push('Jousting'); if (c.allAdj) ab.push('Attacks all adjacent');
        if (c.ignDef) ab.push(`Ignores ${c.ignDef * 100}% defense`); if (c.deathBlow) ab.push('Death blow');
        if (ab.length) lines.push('', ab.join(', '));
        if (extra.eff && extra.eff.length) lines.push('', 'Spells: ' + extra.eff.join(', '));
        return lines;
    },
};

// A row of 7 army slots. onClick(slotIndex, pointer) is called; selection highlight managed externally.
class ArmyRow {
    constructor(scene, x, y, army, opts = {}) {
        this.scene = scene; this.army = army; this.opts = opts;
        this.size = opts.size || 58;
        this.gap = opts.gap ?? 4;
        this.c = scene.add.container(x, y);
        this.sel = -1;
        this.slots = [];
        for (let i = 0; i < 7; i++) {
            const sx = i * (this.size + this.gap);
            const bg = scene.add.rectangle(sx, 0, this.size, this.size, 0x140c06, 0.85).setOrigin(0).setStrokeStyle(1, 0x8a6a30);
            const z = scene.add.zone(sx, 0, this.size, this.size).setOrigin(0).setInteractive({ useHandCursor: true });
            z.on('pointerup', (p) => {
                if (p.rightButtonReleased()) return;
                opts.onClick && opts.onClick(i, this, p);
            });
            z.on('pointerdown', (p) => {
                if (!p.rightButtonDown()) return;
                const s = this.army[i]; if (!s) return;
                const pop = UI.popup(scene, p.x + 10, p.y - 100, UI.creatureInfo(scene, s.cid, s.n), { icon: Art.creature(scene, s.cid) });
                scene.input.once('pointerup', () => pop.destroy());
            });
            z.on('pointerover', () => { const s = this.army[i]; if (scene.status) scene.status(s ? `${s.n} ${CREATURES[s.cid].name} (right-click for info)` : 'Empty slot'); });
            this.c.add([bg, z]);
            this.slots.push({ bg, items: [] });
        }
        this.refresh();
    }
    setArmy(a) { this.army = a; this.refresh(); }
    refresh() {
        for (let i = 0; i < 7; i++) {
            const sl = this.slots[i];
            sl.items.forEach(o => o.destroy()); sl.items = [];
            const sx = i * (this.size + this.gap);
            sl.bg.setStrokeStyle(this.sel === i ? 3 : 1, this.sel === i ? 0xffe060 : 0x8a6a30);
            const s = this.army && this.army[i];
            if (!s) continue;
            const key = Art.creature(this.scene, s.cid);
            const im = this.scene.add.image(sx + this.size / 2, this.size - 4, key).setOrigin(0.5, 1);
            im.setScale(this.size / 150);
            const t = UI.text(this.scene, sx + this.size - 3, this.size - 2, fmt(s.n), 13, '#ffffff', { origin: [1, 1] });
            this.c.add([im, t]);
            sl.items.push(im, t);
        }
    }
    destroy() { this.c.destroy(); }
}

// Shared army-slot interaction: select a slot, then click another to move/merge/swap. Works across two rows.
class ArmyLink {
    constructor(scene, rows, opts = {}) {
        this.scene = scene; this.rows = rows; this.opts = opts;
        this.sel = null; // {row, i}
        rows.forEach(r => r.opts.onClick = (i, row, p) => this.click(row, i, p));
        this.splitMode = false;
    }
    clear() { this.sel = null; this.rows.forEach(r => { r.sel = -1; r.refresh(); }); this.opts.onSelect && this.opts.onSelect(null); }
    async click(row, i, p) {
        const a = row.army;
        if (!this.sel) {
            if (a[i]) { this.sel = { row, i }; row.sel = i; row.refresh(); this.opts.onSelect && this.opts.onSelect(this.sel); }
            return;
        }
        const src = this.sel.row.army, si = this.sel.i;
        if (row === this.sel.row && i === si) {
            this.opts.onInfo && this.opts.onInfo(src[si]);
            this.clear();
            return;
        }
        const s = src[si], d = a[i];
        const canEmpty = (arr) => arr !== src || this.opts.allowEmpty?.(arr) || arr.filter(Boolean).length > 1;
        const shift = p && p.event && p.event.shiftKey;
        if ((shift || this.splitMode) && s && (!d || d.cid === s.cid)) {
            this.splitMode = false;
            const total = s.n + (d ? d.n : 0);
            const keepMin = (src !== a && this.mustKeep(src)) && src.filter(Boolean).length === 1 ? 1 : 0;
            const n = await UI.amount(this.scene, 'Split Stack', total - keepMin, { start: d ? d.n : Math.floor(s.n / 2), render: v => `${CREATURES[s.cid].name}\nLeft: ${total - v}   Right: ${v}`, ok: 'Split' });
            if (n > 0 || d) {
                if (total - n <= 0) { if (!this.mustKeep(src) || src.filter(Boolean).length > 1) src[si] = null; else { this.clear(); return; } }
                else src[si] = { cid: s.cid, n: total - n };
                a[i] = n > 0 ? { cid: s.cid, n } : null;
            }
        } else if (!d) {
            if (src !== a && this.mustKeep(src) && src.filter(Boolean).length === 1) { this.clear(); return; }
            a[i] = s; src[si] = null;
        } else if (d.cid === s.cid) {
            if (src !== a && this.mustKeep(src) && src.filter(Boolean).length === 1) { this.clear(); return; }
            d.n += s.n; src[si] = null;
        } else {
            a[i] = s; src[si] = d;
        }
        this.clear();
        this.opts.onChange && this.opts.onChange();
    }
    mustKeep(arr) { return this.opts.mustKeep ? this.opts.mustKeep(arr) : false; }
}
