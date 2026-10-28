// HUD (bars, compass, notifications) and every menu: dialogue, shops, inventory,
// journal, map, level-up, pause, death, victory and the opening text.
const tstyle = (size, color = '#e8e0cc', extra = {}) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 3 }, extra);
const hstyle = (size, color = '#f0e6c8', extra = {}) => Object.assign({ fontFamily: TITLE_FONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 4 }, extra);

class UIScene extends Phaser.Scene {
    constructor() { super('UI'); }

    create() {
        UI = this;
        this.g = this.add.graphics();
        this.notes = []; this.bigQ = []; this.bigBusy = false;
        this.hurtFlash = 0; this.target = null; this.targetAt = 0; this.boss = null;
        this.menu = null; this.menuType = null; this.dlgChoices = null;

        this.tLevel = this.add.text(16, 10, '', tstyle(18));
        this.tGold = this.add.text(16, 34, '', tstyle(16, '#e8cc70'));
        this.tTime = this.add.text(W - 16, 10, '', tstyle(18)).setOrigin(1, 0);
        this.tLoc = this.add.text(W - 16, 34, '', tstyle(16, '#c8c0a8')).setOrigin(1, 0);
        this.tEquip = this.add.text(36, H - 58, '', tstyle(16, '#e8e0cc'));
        this.tPots = this.add.text(W - 36, H - 58, '', tstyle(16, '#e8e0cc')).setOrigin(1, 0);
        this.tPrompt = this.add.text(W / 2, H - 112, '', tstyle(20, '#ffffff', { backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 12, y: 5 } })).setOrigin(0.5);
        this.tTarget = this.add.text(W / 2, 46, '', tstyle(15, '#f0e6c8')).setOrigin(0.5, 0);
        this.tCompass = ['S', 'I', 'J', 'Z', 'J'].map(l => this.add.text(0, 24, l, hstyle(16, '#f0e6c8')).setOrigin(0.5));
        this.bigT = this.add.text(W / 2, 170, '', hstyle(38, '#f4ead0', { strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
        this.bigS = this.add.text(W / 2, 214, '', tstyle(22, '#d8d0b8', { strokeThickness: 4 })).setOrigin(0.5).setAlpha(0);

        this.input.keyboard.addCapture('TAB');
        this.input.keyboard.on('keydown', e => this.onKey(e));
    }

    onMapLoaded() {
        this.target = null; this.boss = null;
        if (G.M.id === 'barrow') this.big(G.M.name, 'Drevna nordijska grobnica');
    }

    // ---------- HUD ----------
    bar(g, cx, y, w, frac, col) {
        frac = clamp(frac, 0, 1);
        g.fillStyle(0x000000, 0.6).fillRect(cx - w / 2 - 4, y - 6, w + 8, 12);
        g.lineStyle(1, 0xb8a878, 0.7).strokeRect(cx - w / 2 - 4, y - 6, w + 8, 12);
        g.fillStyle(0xb8a878, 0.9);
        g.fillTriangle(cx - w / 2 - 12, y, cx - w / 2 - 4, y - 6, cx - w / 2 - 4, y + 6);
        g.fillTriangle(cx + w / 2 + 12, y, cx + w / 2 + 4, y - 6, cx + w / 2 + 4, y + 6);
        g.fillStyle(col, 1).fillRect(cx - w * frac / 2, y - 3, w * frac, 6);
        g.fillStyle(0xffffff, 0.25).fillRect(cx - w * frac / 2, y - 3, w * frac, 2);
    }

    questTargets() {
        const out = [];
        for (const id in QUESTS) {
            const q = QUESTS[id], st = q.stages[q.get()];
            if (!st || st.done) continue;
            const m = G.M.id === 'barrow' && st.mb ? st.mb : st.m;
            let pos;
            if (m[0] !== G.M.id) pos = G.M.id === 'barrow' ? { x: tilePx(5), y: tilePx(25) } : { x: tilePx(20), y: tilePx(29) };
            else if (typeof m[1] === 'string') { const n = G.npcs.find(x => x.id === m[1]); if (!n) continue; pos = { x: n.spr.x, y: n.spr.y }; }
            else pos = { x: tilePx(m[1].x), y: tilePx(m[1].y) };
            out.push(Object.assign(pos, { main: id === 'main', name: q.name }));
        }
        return out;
    }

    drawCompass(g) {
        const cx = W / 2, cy = 24, cw = 460, half = cw / 2;
        const px = G.player.x, py = G.player.y;
        g.fillStyle(0x000000, 0.55).fillRect(cx - half, cy - 12, cw, 24);
        g.lineStyle(1, 0xb8a878, 0.7).lineBetween(cx - half, cy - 12, cx + half, cy - 12).lineBetween(cx - half, cy + 12, cx + half, cy + 12);
        g.fillStyle(0xb8a878, 0.9).fillTriangle(cx - half - 14, cy, cx - half, cy - 12, cx - half, cy + 12).fillTriangle(cx + half + 14, cy, cx + half, cy - 12, cx + half, cy + 12);
        const bx = deg => cx + deg / 180 * half;
        g.lineStyle(1, 0xd8d0b8, 0.5);
        for (let b = -165; b < 180; b += 15) if (b % 90) g.lineBetween(bx(b), cy + (b % 45 ? 7 : 3), bx(b), cy + 11);
        [0, 90, 180, -90, -180].forEach((b, i) => this.tCompass[i].setPosition(bx(b) + (b === 180 ? -8 : b === -180 ? 8 : 0), cy));
        const bearing = (x, y) => Math.atan2(x - px, -(y - py)) * 180 / Math.PI;
        if (G.M.id === 'world') for (const k in G.M.locs) {
            const L = G.M.locs[k], lx = tilePx(L.x), ly = tilePx(L.y), d = dist(px, py, lx, ly);
            if (d > 45 * TS || d < 4 * TS) continue;
            const x = bx(bearing(lx, ly));
            g.fillStyle(S.found[k] ? 0xd8d0b8 : 0x8a8478, 0.9).fillTriangle(x, cy - 6, x - 4, cy, x + 4, cy).fillTriangle(x, cy + 6, x - 4, cy, x + 4, cy);
        }
        for (const f of G.foes) if (f.hunting && dist(px, py, f.x, f.y) < 800) { g.fillStyle(0xd02020, 1).fillCircle(bx(bearing(f.x, f.y)), cy, 3); }
        for (const d of G.dragons) if (d.state !== 'dead') { g.fillStyle(0xff3020, 1).fillCircle(bx(bearing(d.x, d.y)), cy, 5); }
        for (const t of this.questTargets()) {
            if (dist(px, py, t.x, t.y) < 40) continue;
            const x = bx(bearing(t.x, t.y));
            g.fillStyle(t.main ? 0xf0c040 : 0xc8c8c8, 1).fillTriangle(x - 6, cy - 10, x + 6, cy - 10, x, cy + 2);
            g.lineStyle(1, 0x000000, 0.8).strokeTriangle(x - 6, cy - 10, x + 6, cy - 10, x, cy + 2);
        }
    }

    locationName() {
        if (G.M.id !== 'world') return G.M.name;
        let best = 'Skyrim', bd = 1e9;
        for (const k in G.M.locs) {
            const L = G.M.locs[k], d = dist(G.player.x, G.player.y, tilePx(L.x), tilePx(L.y));
            if (d < (Math.max(L.r, 8) + 4) * TS && d < bd) { bd = d; best = L.name; }
        }
        return best;
    }

    update(time, dtMs) {
        const g = this.g;
        g.clear();
        if (!G || !G.player || !G.sys.isActive() && !G.sys.isPaused()) return;
        const by = H - 26;
        this.bar(g, 180, by, 220, S.mp / S.mpMax, 0x3a6ad8);
        this.bar(g, W / 2, by, 260, S.hp / S.hpMax, 0xc8302a);
        this.bar(g, W - 180, by, 220, S.sp / S.spMax, 0x3aa84a);
        if (Object.keys(S.shouts).length) {
            const f = G.now < G.shoutReady ? 1 - (G.shoutReady - G.now) / G.shoutMax : 1;
            g.fillStyle(0x000000, 0.6).fillRect(W / 2 - 61, by - 17, 122, 6);
            g.fillStyle(f >= 1 ? 0xcfeeff : 0x5a7a8a, 1).fillRect(W / 2 - 60, by - 16, 120 * f, 4);
        }
        this.drawCompass(g);

        // enemy / boss bar under the compass
        let tgt = null;
        if (this.boss && (this.boss.hp > 0)) tgt = this.boss;
        else if (this.target && this.target.hp > 0 && G.now - this.targetAt < 5000) tgt = this.target;
        if (tgt) {
            const w = tgt.def.boss ? 340 : 220;
            this.bar(g, W / 2, 76, w, tgt.hp / tgt.maxHp, 0xb02020);
            this.tTarget.setText(tgt.def.name).setVisible(true);
        } else this.tTarget.setVisible(false);

        // hurt flash and low-health pulse
        this.hurtFlash = Math.max(0, this.hurtFlash - dtMs * 0.0015);
        let red = this.hurtFlash;
        if (S.hp / S.hpMax < 0.25 && !G.dead) red = Math.max(red, 0.18 + Math.sin(time / 180) * 0.1);
        if (red > 0.01) {
            for (let i = 0; i < 6; i++) {
                const t = i * 12, a = red * (1 - i / 6) * 0.5;
                g.fillStyle(0x900000, a).fillRect(0, t, W, 12).fillRect(0, H - t - 12, W, 12).fillRect(t, 0, 12, H).fillRect(W - t - 12, 0, 12, H);
            }
        }

        const xpf = S.xp / xpNeed(S.level);
        this.tLevel.setText('Razina ' + S.level + (S.lvlPending ? '  (L: napredak!)' : ''));
        g.fillStyle(0x000000, 0.5).fillRect(16, 58, 150, 5); g.fillStyle(0x9a8a5a, 1).fillRect(16, 58, 150 * xpf, 5);
        this.tGold.setText('Zlato: ' + S.gold + (S.souls ? '    Duše: ' + S.souls : ''));
        const hh = Math.floor(S.time / 60), mm = Math.floor(S.time % 60);
        this.tTime.setText((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm);
        this.tLoc.setText(this.locationName());
        const hand = S.hand === 'bow' && S.bow ? ITEMS[S.bow].name + ' (' + S.arrows + ')' : ITEMS[S.weapon].name;
        const shout = ['fus', 'wuld', 'joor'].filter(k => S.shouts[k]).map(k => SHOUTS[k].key).join('/');
        this.tEquip.setText('⚔ ' + hand + '     ✦ ' + SPELLS[S.spells[S.spell]].name + (shout ? '     ◈ Povici: ' + shout : ''));
        const cnt = ids => ids.reduce((a, i) => a + (S.inv[i] || 0), 0);
        this.tPots.setText('1 ❤ ' + cnt(['potion_hp', 'sweetroll']) + '    2 ✦ ' + cnt(['potion_mp']) + '    3 ⚡ ' + cnt(['potion_sp', 'mead']));
        const f = G.focus;
        this.tPrompt.setText(f && !this.menu ? 'E   ' + f.label : '').setVisible(!!(f && !this.menu));

        // notifications fade out
        const now = this.time.now;
        let y = 72;
        for (const n of this.notes) {
            n.t.setY(y); y += n.t.height + 4;
            n.t.setAlpha(clamp((n.until - now) / 800, 0, 1));
        }
        const old = this.notes.filter(n => n.until < now);
        old.forEach(n => n.t.destroy());
        if (old.length) this.notes = this.notes.filter(n => n.until >= now);
    }

    notify(text) {
        const t = this.add.text(16, 72, text, tstyle(17, '#e8e0cc', { wordWrap: { width: 430 } }));
        this.notes.push({ t, until: this.time.now + 5500 });
        while (this.notes.length > 6) this.notes.shift().t.destroy();
    }

    big(title, sub = '') {
        this.bigQ.push([title, sub]);
        if (!this.bigBusy) this.nextBig();
    }
    nextBig() {
        const it = this.bigQ.shift();
        if (!it) { this.bigBusy = false; return; }
        this.bigBusy = true;
        this.bigT.setText(it[0]); this.bigS.setText(it[1]);
        this.tweens.add({ targets: [this.bigT, this.bigS], alpha: { from: 0, to: 1 }, duration: 400, hold: 1900, yoyo: true, onComplete: () => this.nextBig() });
    }

    // ---------- menu plumbing ----------
    openMenu(type) {
        if (this.menu) this.menu.destroy();
        this.menu = this.add.container(0, 0).setDepth(100);
        this.menuType = type;
        this.dlgChoices = null;
        if (G && G.sys.isActive()) G.scene.pause();
        return this.menu;
    }
    closeMenu() {
        if (this.menu) this.menu.destroy();
        this.menu = null; this.menuType = null; this.dlgChoices = null;
        if (G && G.sys.isPaused()) G.scene.resume();
    }
    panel(c, x, y, w, h, alpha = 0.92) {
        const g = this.add.graphics();
        g.fillStyle(0x0b0b0c, alpha).fillRect(x, y, w, h);
        g.lineStyle(2, 0x4a4436, 1).strokeRect(x, y, w, h);
        g.lineStyle(1, 0xb8a878, 0.75).strokeRect(x + 5, y + 5, w - 10, h - 10);
        c.add(g);
        return g;
    }
    button(c, x, y, label, fn, opts = {}) {
        const col = opts.col || '#e8e0cc', hover = opts.hover || '#ffffff';
        const t = this.add.text(x, y, label, opts.style || tstyle(opts.size || 19, col)).setOrigin(opts.ox ?? 0, 0);
        if (fn && !opts.disabled) {
            t.setInteractive({ useHandCursor: true });
            t.on('pointerover', () => t.setColor(hover));
            t.on('pointerout', () => t.setColor(col));
            t.on('pointerdown', () => { Sfx.play('click'); fn(); });
        }
        c.add(t);
        return t;
    }
    canOpen() { return G && G.player && !G.dead && !G.changing && !['intro', 'death', 'victory', 'dialog', 'shop'].includes(this.menuType); }

    onKey(e) {
        const code = e.code;
        if (code === 'Tab') e.preventDefault && e.preventDefault();
        if (this.menuType === 'intro' || this.menuType === 'death' || this.menuType === 'victory') {
            if (['Enter', 'Space', 'Escape'].includes(code) && this.menuAction) this.menuAction();
            return;
        }
        if (this.menuType === 'dialog') {
            const m = /^Digit([1-9])$/.exec(code);
            if (m && this.dlgChoices && this.dlgChoices[+m[1] - 1]) this.dlgChoices[+m[1] - 1]();
            if (code === 'Escape' && this.dlgCanClose) this.closeMenu();
            return;
        }
        if (code === 'KeyN') { const muted = Sfx.toggleMute(); this.notify(muted ? 'Zvuk isključen.' : 'Zvuk uključen.'); return; }
        if (code === 'Escape') { if (this.menu) this.closeMenu(); else if (this.canOpen()) this.openPause(); return; }
        const map = { KeyI: 'inv', Tab: 'inv', KeyJ: 'journal', KeyM: 'map', KeyL: 'level' };
        const want = map[code];
        if (!want) return;
        if (this.menuType === want) { this.closeMenu(); return; }
        if (!this.canOpen()) return;
        if (want === 'inv') this.openInventory();
        if (want === 'journal') this.openJournal();
        if (want === 'map') this.openMap();
        if (want === 'level') { if (S.lvlPending) this.openLevel(); else this.notify('Treba ti još iskustva za novu razinu.'); }
    }

    // ---------- dialogue ----------
    openDialog(npcId) {
        this.dlgNpc = npcId;
        Sfx.play('click');
        this.showNode(NPCS[npcId].talk());
    }
    showNode(node) {
        const c = this.openMenu('dialog');
        const x = 112, y = 470, w = 800, h = 270;
        this.panel(c, x, y, w, h);
        c.add(this.add.text(x + 28, y + 20, node.who || NPCS[this.dlgNpc].name, hstyle(24, '#e8c870')));
        const body = this.add.text(x + 28, y + 58, node.t, tstyle(19, '#efe8d8', { wordWrap: { width: w - 56 }, lineSpacing: 3 }));
        c.add(body);
        const choices = node.c && node.c.length ? node.c : [{ l: 'Doviđenja.' }];
        this.dlgCanClose = choices.some(ch => !ch.go);
        let cy = Math.max(y + 70 + body.height, y + h - 24 - choices.length * 28);
        this.dlgChoices = choices.map((ch, i) => {
            const act = () => {
                const next = ch.go ? ch.go() : undefined;
                if (this.menuType !== 'dialog') return;   // the choice opened a shop
                if (next) this.showNode(next); else this.closeMenu();
            };
            this.button(c, x + 40, cy, (i + 1) + '.  ' + ch.l, act, { col: '#c8c0a0' });
            cy += 28;
            return act;
        });
    }

    // ---------- shop ----------
    openShop(title, list) {
        const c = this.openMenu('shop');
        this.shopArgs = [title, list];
        this.panel(c, 60, 50, W - 120, H - 100);
        c.add(this.add.text(W / 2, 74, title, hstyle(28, '#e8c870')).setOrigin(0.5, 0));
        c.add(this.add.text(W / 2, 112, 'Tvoje zlato: ' + S.gold, tstyle(18, '#e8cc70')).setOrigin(0.5, 0));
        c.add(this.add.text(100, 146, 'KUPI', hstyle(18)));
        c.add(this.add.text(W / 2 + 40, 146, 'PRODAJ', hstyle(18)));
        let y = 180;
        for (const id of list) {
            const it = ITEMS[id];
            let why = '';
            if (['weapon', 'armor', 'bow'].includes(it.kind) && G.has(id)) why = 'imaš';
            else if (it.kind === 'tome' && (S.spells.includes(it.spell) || G.has(id))) why = 'znaš';
            else if (it.needs && !G.has(it.needs)) why = 'treba kost';
            else if (S.gold < it.price) why = 'premalo zlata';
            const label = it.name + '  —  ' + it.price + ' zl.' + (why ? '  (' + why + ')' : '');
            this.button(c, 100, y, label, () => {
                S.gold -= it.price;
                if (it.kind === 'arrows') S.arrows += it.qty;
                else S.inv[id] = (S.inv[id] || 0) + 1;
                if (it.kind === 'bow' && !S.bow) S.bow = id;
                if (it.kind === 'tome') G.useItem(id);
                Sfx.play('coin');
                this.openShop(title, list);
            }, { disabled: !!why, col: why ? '#6a6458' : '#e8e0cc', size: 17 });
            y += 30;
        }
        y = 180;
        const equipped = [S.weapon, S.armor, S.bow];
        const sellable = Object.keys(S.inv).filter(id => ITEMS[id].price && ITEMS[id].kind !== 'quest' && !equipped.includes(id));
        if (!sellable.length) c.add(this.add.text(W / 2 + 40, y, 'Nemaš ništa za prodati.', tstyle(17, '#6a6458')));
        for (const id of sellable) {
            const it = ITEMS[id], val = Math.max(1, Math.floor(it.price * 0.4));
            this.button(c, W / 2 + 40, y, it.name + ' ×' + S.inv[id] + '  —  ' + val + ' zl.', () => {
                G.take(id); S.gold += val; Sfx.play('coin'); this.openShop(title, list);
            }, { size: 17 });
            y += 30;
            if (y > H - 120) break;
        }
        this.button(c, W / 2, H - 92, 'Zatvori', () => this.closeMenu(), { ox: 0.5, style: hstyle(20, '#c8c0a0') });
    }

    // ---------- inventory ----------
    openInventory() {
        const c = this.openMenu('inv');
        this.panel(c, 40, 40, W - 80, H - 80);
        c.add(this.add.text(W / 2, 56, 'INVENTAR', hstyle(28, '#e8c870')).setOrigin(0.5, 0));
        const order = ['weapon', 'bow', 'armor', 'potion', 'tome', 'quest'];
        const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0).sort((a, b) => order.indexOf(ITEMS[a].kind) - order.indexOf(ITEMS[b].kind));
        let y = 104;
        for (const id of ids) {
            const it = ITEMS[id];
            const eq = id === S.weapon || id === S.armor || id === S.bow;
            let info = '';
            if (it.kind === 'weapon') info = 'šteta ' + it.dmg;
            if (it.kind === 'bow') info = 'šteta ' + it.dmg;
            if (it.kind === 'armor') info = 'oklop ' + it.armor;
            if (it.kind === 'potion') info = '+' + it.amt + ' ' + { hp: 'zdravlja', mp: 'magije', sp: 'izdržljivosti' }[it.stat];
            if (it.kind === 'tome') info = 'pročitaj';
            if (it.kind === 'quest') info = 'predmet zadatka';
            const label = (eq ? '◆ ' : '   ') + it.name + (S.inv[id] > 1 ? ' ×' + S.inv[id] : '');
            const usable = it.kind !== 'quest';
            this.button(c, 76, y, label, usable ? () => { G.useItem(id); this.openInventory(); } : null, { size: 18, col: eq ? '#f0d070' : usable ? '#e8e0cc' : '#a8a090' });
            c.add(this.add.text(470, y + 2, info, tstyle(15, '#a8a090')).setOrigin(1, 0));
            y += 27;
            if (y > H - 110) break;
        }
        c.add(this.add.text(76, H - 96, 'Strijele: ' + S.arrows + '      Klikni predmet da ga opremiš ili upotrijebiš.', tstyle(15, '#a8a090')));

        const rx = 540;
        const stats = [
            ['Razina', S.level + '   (' + Math.floor(S.xp) + ' / ' + xpNeed(S.level) + ' iskustva)'],
            ['Zdravlje', Math.ceil(S.hp) + ' / ' + S.hpMax], ['Magija', Math.ceil(S.mp) + ' / ' + S.mpMax], ['Izdržljivost', Math.ceil(S.sp) + ' / ' + S.spMax],
            ['Oklop', ITEMS[S.armor].armor], ['Šteta mača', ITEMS[S.weapon].dmg], ['Zlato', S.gold], ['Zmajeve duše', S.souls], ['Ubijeno', S.kills],
        ];
        stats.forEach(([k, v], i) => {
            c.add(this.add.text(rx, 104 + i * 25, k, tstyle(17, '#a8a090')));
            c.add(this.add.text(rx + 140, 104 + i * 25, String(v), tstyle(17, '#efe8d8')));
        });
        let sy = 104 + stats.length * 25 + 16;
        c.add(this.add.text(rx, sy, 'ČAROLIJE (R mijenja)', hstyle(16, '#e8c870'))); sy += 28;
        S.spells.forEach((id, i) => {
            const sp = SPELLS[id];
            this.button(c, rx, sy, (i === S.spell ? '◆ ' : '   ') + sp.name + '  (' + sp.cost + (sp.kind === 'bolt' ? '' : '/s') + ' magije)', () => { S.spell = i; this.openInventory(); }, { size: 17, col: i === S.spell ? '#f0d070' : '#e8e0cc' });
            sy += 25;
        });
        sy += 12;
        c.add(this.add.text(rx, sy, 'POVICI', hstyle(16, '#e8c870'))); sy += 28;
        let any = false;
        for (const id in SHOUTS) {
            const lvl = S.shouts[id] || 0, sh = SHOUTS[id];
            if (!lvl && !(id === 'fus' && S.words.fus)) continue;
            any = true;
            const words = sh.words.map((wd, i) => i < (id === 'fus' ? lvl : lvl ? 3 : 0) ? wd : '·').join(' ');
            c.add(this.add.text(rx, sy, '[' + sh.key + ']  ' + words + '  —  ' + sh.name + (lvl ? '' : ' (zaključano)'), tstyle(17, lvl ? '#cfeeff' : '#7a8a90')));
            sy += 25;
        }
        if (!any) c.add(this.add.text(rx, sy, 'Još ne znaš nijedan povik.', tstyle(16, '#7a7468')));
        this.button(c, W / 2, H - 70, 'Zatvori (I)', () => this.closeMenu(), { ox: 0.5, style: hstyle(18, '#c8c0a0') });
    }

    // ---------- journal ----------
    openJournal() {
        const c = this.openMenu('journal');
        this.panel(c, 120, 60, W - 240, H - 120);
        c.add(this.add.text(W / 2, 78, 'DNEVNIK', hstyle(28, '#e8c870')).setOrigin(0.5, 0));
        let y = 130;
        for (const id in QUESTS) {
            const q = QUESTS[id], st = q.stages[q.get()];
            if (!st) continue;
            c.add(this.add.text(160, y, (st.done ? '✓ ' : '◆ ') + q.name, hstyle(20, st.done ? '#7a7468' : id === 'main' ? '#f0d070' : '#e8e0cc')));
            const d = this.add.text(190, y + 32, st.d, tstyle(17, st.done ? '#7a7468' : '#d8d0b8', { wordWrap: { width: W - 400 } }));
            c.add(d);
            y += 44 + d.height + 18;
        }
        c.add(this.add.text(W / 2, H - 140, 'Zlatna oznaka na kompasu pokazuje glavni zadatak, srebrna sporedne.', tstyle(15, '#a8a090')).setOrigin(0.5));
        this.button(c, W / 2, H - 104, 'Zatvori (J)', () => this.closeMenu(), { ox: 0.5, style: hstyle(18, '#c8c0a0') });
    }

    // ---------- map ----------
    openMap() {
        const c = this.openMenu('map');
        this.panel(c, 20, 20, W - 40, H - 40, 0.96);
        const M = G.M, key = 'mini_' + M.id;
        const s = Math.min((W - 100) / (M.w * 4), (H - 150) / (M.h * 4));
        const mw = M.w * 4 * s, mh = M.h * 4 * s, ox = (W - mw) / 2, oy = 70;
        c.add(this.add.text(W / 2, 32, M.id === 'world' ? 'SKYRIM' : M.name.toUpperCase(), hstyle(26, '#e8c870')).setOrigin(0.5, 0));
        c.add(this.add.image(ox, oy, key).setOrigin(0).setScale(s));
        const g = this.add.graphics(); c.add(g);
        g.lineStyle(2, 0x4a4436, 1).strokeRect(ox, oy, mw, mh);
        const toMap = (x, y) => [ox + x / TS * 4 * s, oy + y / TS * 4 * s];
        if (M.id === 'world') for (const k in M.locs) {
            if (!S.found[k]) continue;
            const L = M.locs[k];
            const [lx, ly] = toMap(tilePx(L.x), tilePx(L.y));
            g.fillStyle(0x1a1a1a, 1).fillCircle(lx, ly, 6); g.fillStyle(0xe8e0cc, 1).fillCircle(lx, ly, 4);
            this.button(c, lx, ly + 8, L.name, () => { if (G.fastTravel(k)) { this.closeMenu(); this.notify('Putuješ do: ' + L.name); } }, { ox: 0.5, style: tstyle(15, '#ffffff', { strokeThickness: 4 }), col: '#ffffff', hover: '#f0d070' });
        }
        for (const t of this.questTargets()) {
            const [qx, qy] = toMap(t.x, t.y);
            g.fillStyle(t.main ? 0xf0c040 : 0xd8d8d8, 1).fillTriangle(qx - 7, qy - 14, qx + 7, qy - 14, qx, qy);
            g.lineStyle(1.5, 0x000000, 1).strokeTriangle(qx - 7, qy - 14, qx + 7, qy - 14, qx, qy);
        }
        const [px, py] = toMap(G.player.x, G.player.y);
        g.fillStyle(0x000000, 1).fillCircle(px, py, 7); g.fillStyle(0x50c0ff, 1).fillCircle(px, py, 5);
        c.add(this.add.text(W / 2, H - 58, M.id === 'world' ? 'Klikni otkriveno mjesto za brzo putovanje.   Plava točka — ti.   Trokut — cilj zadatka.' : 'Plava točka — ti.   Trokut — cilj zadatka.', tstyle(16, '#a8a090')).setOrigin(0.5));
        this.button(c, W - 60, 36, '✕', () => this.closeMenu(), { ox: 0.5, style: hstyle(24, '#c8c0a0') });
    }

    // ---------- level up ----------
    openLevel() {
        const c = this.openMenu('level');
        this.panel(c, W / 2 - 300, 200, 600, 330);
        c.add(this.add.text(W / 2, 228, 'RAZINA ' + S.level, hstyle(34, '#e8c870')).setOrigin(0.5, 0));
        c.add(this.add.text(W / 2, 282, 'Odaberi što ćeš ojačati (+10). Preostalo: ' + S.lvlPending, tstyle(18, '#d8d0b8')).setOrigin(0.5, 0));
        const opts = [['ZDRAVLJE', 'hp', '#e05040'], ['MAGIJA', 'mp', '#5a8ae8'], ['IZDRŽLJIVOST', 'sp', '#5ac86a']];
        opts.forEach(([label, k, col], i) => {
            this.button(c, W / 2 - 190 + i * 190, 350, label, () => {
                S[k + 'Max'] += 10; S.hp = S.hpMax; S.mp = S.mpMax; S.sp = S.spMax; S.lvlPending--;
                Sfx.play('level');
                if (S.lvlPending > 0) this.openLevel(); else { this.closeMenu(); G.save(); }
            }, { ox: 0.5, style: hstyle(22, col), col, hover: '#ffffff' });
            c.add(this.add.text(W / 2 - 190 + i * 190, 388, String(S[k + 'Max']) + ' → ' + (S[k + 'Max'] + 10), tstyle(16, '#a8a090')).setOrigin(0.5, 0));
        });
        this.button(c, W / 2, 470, 'Kasnije', () => this.closeMenu(), { ox: 0.5, style: hstyle(18, '#8a8478') });
    }

    // ---------- pause ----------
    openPause() {
        const c = this.openMenu('pause');
        this.panel(c, W / 2 - 330, 80, 660, 600);
        c.add(this.add.text(W / 2, 104, 'STANKA', hstyle(32, '#e8c870')).setOrigin(0.5, 0));
        const items = [
            ['Nastavi', () => this.closeMenu()],
            ['Spremi igru', () => { G.save(); this.notify('Igra spremljena.'); this.closeMenu(); }],
            [Sfx.muted ? 'Zvuk: isključen' : 'Zvuk: uključen', () => { Sfx.toggleMute(); this.openPause(); }],
            ['Glavni izbornik', () => { G.save(); this.closeMenu(); this.scene.stop('Game'); this.scene.start('Title'); }],
        ];
        items.forEach(([l, fn], i) => this.button(c, W / 2, 166 + i * 42, l, fn, { ox: 0.5, style: hstyle(22, '#e8e0cc'), col: '#e8e0cc' }));
        c.add(this.add.text(W / 2, 350, CONTROLS, tstyle(16, '#c8c0a8', { align: 'center', lineSpacing: 6 })).setOrigin(0.5, 0));
    }

    // ---------- death, victory, intro ----------
    death() {
        const c = this.openMenu('death');
        c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0));
        c.add(this.add.text(W / 2, 300, 'POGINUO SI', hstyle(56, '#c03020', { strokeThickness: 8 })).setOrigin(0.5));
        c.add(this.add.text(W / 2, 380, 'Sovngarde će morati pričekati.\nKlikni ili pritisni Enter za učitavanje zadnjeg spremanja.', tstyle(20, '#d8d0b8', { align: 'center' })).setOrigin(0.5));
        this.menuAction = () => {
            this.menuAction = null;
            S = loadSave() || newState();
            S.hp = S.hpMax; S.mp = S.mpMax; S.sp = S.spMax;
            this.closeMenu();
            G.scene.restart();
        };
        const z = this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
        z.on('pointerdown', () => this.menuAction && this.menuAction());
        c.add(z);
    }

    victory() {
        const c = this.openMenu('victory');
        c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0));
        c.add(this.add.text(W / 2, 220, 'ALDUIN JE PORAŽEN', hstyle(52, '#f0d070', { strokeThickness: 8 })).setOrigin(0.5));
        c.add(this.add.text(W / 2, 360, [
            'Proždiratelj Svjetova je pao na vrhu Grla svijeta.',
            'Sivobradi pjevaju, skaldi slažu pjesme, a Whiterun slavi svog tana.',
            'Ti si Dovahkiin — Zmajorođeni.',
            '',
            'Razina ' + S.level + '   ·   ' + S.kills + ' poraženih neprijatelja   ·   ' + S.souls + ' zmajeve duše',
            '',
            'Klikni za nastavak igre — Skyrim je i dalje tvoj.',
        ].join('\n'), tstyle(21, '#e8e0cc', { align: 'center', lineSpacing: 6 })).setOrigin(0.5));
        Sfx.play('level');
        this.menuAction = () => { this.menuAction = null; this.closeMenu(); G.save(); };
        const z = this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
        z.on('pointerdown', () => this.menuAction && this.menuAction());
        c.add(z);
    }

    intro() {
        const c = this.openMenu('intro');
        c.add(this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0));
        const lines = [
            '"Hej, ti. Napokon si budan."',
            'Kola su se prevrnula kad je s neba pao zmaj i spalio Helgen.',
            'U kaosu si pobjegao šumom, bez ičega osim željeznog mača i kožnog oklopa.',
            'Cesta na sjever vodi u Riverwood, malo selo uz rijeku.',
            'Zmajevi su se vratili u Skyrim.',
        ];
        lines.forEach((l, i) => {
            const t = this.add.text(W / 2, 200 + i * 62, l, i ? tstyle(22, '#d8d0b8') : hstyle(28, '#f0e6c8')).setOrigin(0.5).setAlpha(0);
            c.add(t);
            this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 400 + i * 1300 });
        });
        const hint = this.add.text(W / 2, H - 90, 'Klikni ili pritisni Enter', tstyle(18, '#8a8478')).setOrigin(0.5).setAlpha(0);
        c.add(hint);
        this.tweens.add({ targets: hint, alpha: 1, duration: 600, delay: 2000 });
        this.menuAction = () => {
            this.menuAction = null;
            S.intro = true;
            this.closeMenu();
            G.questUpdate('main', 'Zadatak započet');
            this.notify('WASD kretanje, lijevi klik napad, desni klik čarolija, E akcija. Esc za sve kontrole.');
        };
        const z = this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
        z.on('pointerdown', () => { Sfx.init(); this.menuAction && this.menuAction(); });
        c.add(z);
    }
}

const CONTROLS = [
    'WASD / strelice — kretanje        Shift — trčanje',
    'Lijevi klik / Space — napad        Shift + napad — snažni udarac',
    'Desni klik / F — čarolija        R — promijeni čaroliju',
    'Q — mač / luk        E — razgovor, škrinje, vrata',
    'Z / X / C — povici (Fus Ro Dah, Wuld, Zmajosjek)',
    '1 / 2 / 3 — napitak zdravlja / magije / izdržljivosti',
    'I — inventar    J — dnevnik    M — karta    L — nova razina',
    'Esc — stanka    N — zvuk',
].join('\n');
