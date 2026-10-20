'use strict';

// DOM interface layered over the Phaser canvas: HUD, panels, tooltips, minimap and modal screens.

const $ = id => document.getElementById(id);
const RARITY_CLASS = r => 'c-' + r;

const UI = D.UI = {
  tickT: 0, mapT: 0, target: null, targetHp: -1,

  init() {
    $('buttons').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      D.Sfx.play('click');
      if (b.dataset.act === 'char') this.toggle('char');
      if (b.dataset.act === 'inv') this.toggle('inv');
      if (b.dataset.act === 'menu') this.toggleMenu();
    });
    $('skills').addEventListener('click', e => {
      const s = e.target.closest('.slot');
      if (!s || !G.run) return;
      const key = s.dataset.skill;
      if (G.run.player.skills[key]) { G.run.player.rightSkill = key; this.refreshSkills(); }
      else this.toggle('char');
    });
    $('belt').addEventListener('click', e => {
      const s = e.target.closest('.slot');
      if (s && G.scene) G.scene.usePotion(s.dataset.pot);
    });
    for (const id of ['panel-char', 'panel-inv', 'panel-shop', 'panel-stash', 'panel-wp']) {
      const el = $(id);
      el.addEventListener('click', e => this.panelClick(e, false));
      el.addEventListener('contextmenu', e => { e.preventDefault(); this.panelClick(e, true); });
      el.addEventListener('mousemove', e => this.panelHover(e));
      el.addEventListener('mouseleave', () => this.hideTip());
    }
    $('hud').addEventListener('mousemove', e => this.hudHover(e));
    $('hud').addEventListener('mouseleave', () => this.hideTip());
    $('hud').addEventListener('contextmenu', e => e.preventDefault());
    $('modal').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) { D.Sfx.play('click'); this.modalAction(b.dataset.act); }
    });
    this.mini = $('minimap').getContext('2d');
    this.big = $('bigmap').querySelector('canvas').getContext('2d');
  },

  show() { $('ui').classList.remove('hidden'); },
  hide() { $('ui').classList.add('hidden'); this.hideTip(); },

  enterFloor(scene) {
    this.scene = scene;
    $('floorName').textContent = scene.floor.name;
    this.target = null; $('target').classList.add('hidden');
    this.buildMapBase(scene);
    this.buildSkillBar();
    this.buildBelt();
    this.refreshPanels();
    this.tickT = 0; this.mapT = 0;
  },

  // ---------- HUD ----------
  buildSkillBar() {
    const run = G.run, C = D.CLASSES[run.player.cls];
    $('skills').innerHTML = C.skills.map((k, i) =>
      `<div class="slot" data-skill="${k}"><img src="${D.Art.iconURL[D.SKILLS[k].icon]}"><span class="key">${'QWER'[i]}</span><span class="num"></span><div class="cd"></div></div>`).join('');
    this.refreshSkills();
  },

  refreshSkills() {
    const run = G.run;
    if (!run) return;
    for (const el of $('skills').children) {
      const k = el.dataset.skill, rank = run.player.skills[k] || 0;
      el.classList.toggle('locked', !rank);
      el.classList.toggle('sel', run.player.rightSkill === k);
      el.querySelector('.num').textContent = rank ? rank : '';
    }
  },

  buildBelt() {
    const keys = { hp: '1', mp: '2', rejuv: '3', tp: 'T' };
    $('belt').innerHTML = Object.keys(keys).map(k =>
      `<div class="slot" data-pot="${k}"><img src="${D.Art.iconURL[D.POTIONS[k].icon]}"><span class="key">${keys[k]}</span><span class="num"></span></div>`).join('');
  },

  tick(scene, dt) {
    this.tickT -= dt; this.mapT -= dt;
    if (this.tickT > 0) return;
    this.tickT = 0.08;
    const run = G.run, rp = run.player, st = scene.stats, P = scene.player;
    const hpPct = Math.max(0, rp.hp / st.maxHp * 100), mpPct = Math.max(0, rp.mana / st.maxMana * 100);
    const life = document.querySelector('.globe.life');
    life.querySelector('.fill').style.height = hpPct + '%';
    life.querySelector('.gval').textContent = `${Math.max(0, Math.ceil(rp.hp))} / ${st.maxHp}`;
    life.classList.toggle('poison', scene.now < P.poisonUntil);
    const mana = document.querySelector('.globe.mana');
    mana.querySelector('.fill').style.height = mpPct + '%';
    mana.querySelector('.gval').textContent = `${Math.floor(rp.mana)} / ${st.maxMana}`;
    const need = D.xpForLevel(rp.level);
    $('xpbar').querySelector('.xpfill').style.width = (rp.level >= D.MAX_LEVEL ? 100 : rp.xp / need * 100) + '%';
    $('xpbar').querySelector('.xptext').textContent = `Level ${rp.level} - ${rp.xp} / ${need} xp`;
    for (const el of $('skills').children) {
      const k = el.dataset.skill, sk = D.SKILLS[k], cd = P.cds[k] || 0;
      el.querySelector('.cd').style.height = (sk.cd && cd > 0 ? cd / sk.cd * 100 : 0) + '%';
      const rank = scene.skillRank(k);
      el.classList.toggle('nomana', rank > 0 && rp.mana < sk.mana + sk.manaPer * (rank - 1));
    }
    for (const el of $('belt').children) el.querySelector('.num').textContent = rp.potions[el.dataset.pot];
    $('charBadge').classList.toggle('hidden', !(rp.statPoints || rp.skillPoints));
    $('timer').textContent = `${D.fmtTime(run.elapsed)}  ·  Level ${rp.level} ${D.CLASSES[rp.cls].name}`;
    const buffs = Object.entries(run.buffs).map(([k, t]) => `<div class="buff">${D.SHRINES[k].buff} (${Math.ceil(t)}s)</div>`).join('');
    if (buffs !== this.lastBuffs) { $('buffs').innerHTML = buffs; this.lastBuffs = buffs; }
    if (this.target) this.updateTargetBar();
    if (this.mapT <= 0) { this.mapT = 0.2; this.drawMap(scene); }
  },

  setTarget(m) {
    if (m === this.target) return;
    this.target = m;
    const el = $('target');
    if (!m) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const d = m.d, nm = el.querySelector('.tname');
    nm.className = 'tname ' + (d.rank === 'boss' ? 'boss' : d.rank === 'champion' ? 'champion' : '');
    nm.textContent = d.rank === 'boss' ? m.def.name : d.rank === 'champion' ? d.name : m.def.name;
    const mods = (d.mods || []).map(k => D.CHAMPION_MODS[k].label);
    if (d.rank === 'minion') mods.push('Minion');
    el.querySelector('.tsub').textContent = [`Level ${d.mlvl}`, ...mods].join(' · ');
    this.updateTargetBar();
  },

  updateTargetBar() {
    const d = this.target.d;
    if (d.dead) { this.setTarget(null); return; }
    $('target').querySelector('.tfill').style.width = Math.max(0, d.hp / d.maxHp * 100) + '%';
  },

  log(msg, color) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.color = color || '#d8cbb0';
    const log = $('log');
    log.appendChild(el);
    while (log.children.length > 6) log.removeChild(log.firstChild);
    setTimeout(() => { el.style.opacity = '0'; }, 4500);
    setTimeout(() => el.remove(), 5600);
  },

  banner(title, sub) {
    const b = $('banner');
    b.innerHTML = `${D.esc(title)}${sub ? `<div style="font-size:18px;color:#c8b898">${D.esc(sub)}</div>` : ''}`;
    b.classList.remove('hidden');
    b.style.opacity = '1';
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.add('hidden'), 3200);
  },

  // ---------- minimap ----------
  buildMapBase(scene) {
    const { w, h } = scene;
    this.base = document.createElement('canvas');
    this.base.width = w; this.base.height = h;
    this.bctx = this.base.getContext('2d');
    const ex = G.explored[scene.floor.index];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ex[y * w + x]) this.paintCell(x, y);
  },

  paintCell(x, y) {
    const s = this.scene, v = s.grid[y * s.w + x], c = this.bctx;
    if (v === D.Dungeon.FLOOR) c.fillStyle = s.isTown ? '#4a5a30' : '#3a332c';
    else if (v === D.Dungeon.LAVA) c.fillStyle = '#b03a10';
    else {
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < s.w && ny < s.h && s.grid[ny * s.w + nx] !== D.Dungeon.WALL) { edge = true; break; }
      }
      if (!edge) return;
      c.fillStyle = s.isTown ? '#8a6a40' : '#b8a888';
    }
    c.fillRect(x, y, 1, 1);
  },

  drawMap(scene) {
    this.drawMapOn(this.mini, 200, scene, false);
    if (!$('bigmap').classList.contains('hidden')) this.drawMapOn(this.big, 600, scene, true);
  },

  drawMapOn(ctx, size, scene, big) {
    const { w, h, T } = scene;
    const k = size / Math.max(w, h), ox = (size - w * k) / 2, oy = (size - h * k) / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, ox, oy, w * k, h * k);
    const ex = G.explored[scene.floor.index];
    const seen = (x, y) => ex[Math.floor(y / T) * w + Math.floor(x / T)];
    const dot = (x, y, col, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox + x / T * k, oy + y / T * k, r, 0, 7); ctx.fill(); };
    const rr = big ? 5 : 3;
    for (const o of scene.interactables) {
      if (!seen(o.x, o.y)) continue;
      const col = { stairsDown: '#ffd040', stairsUp: '#7aff7a', waypoint: '#5aa0ff', portal: '#7af0ff', merchant: '#ffffff', healer: '#ffffff', stash: '#c8a040',
        chest: o.done ? null : '#c8a040', shrine: o.done ? null : '#ff7aff' }[o.kind];
      if (col) dot(o.x, o.y, col, rr);
    }
    for (const m of scene.monsters) if (m.boss && !m.d.dead && seen(m.d.x, m.d.y)) dot(m.d.x, m.d.y, '#ff2020', rr + 2);
    const P = scene.player;
    dot(P.x, P.y, '#000', rr + 1.5);
    dot(P.x, P.y, '#ff4040', rr);
  },

  toggleMap() { $('bigmap').classList.toggle('hidden'); if (this.scene) this.drawMap(this.scene); },

  // ---------- panels ----------
  isOpen(name) { return !$('panel-' + name).classList.contains('hidden'); },

  toggle(name) {
    const el = $('panel-' + name);
    const open = el.classList.contains('hidden');
    if (name === 'char' && open) for (const n of ['shop', 'stash', 'wp']) $('panel-' + n).classList.add('hidden');
    if ((name === 'shop' || name === 'stash' || name === 'wp') && open) for (const n of ['char', 'shop', 'stash', 'wp']) $('panel-' + n).classList.add('hidden');
    el.classList.toggle('hidden', !open);
    this.hideTip();
    this.refreshPanels();
  },

  open(name) { if (!this.isOpen(name)) this.toggle(name); },

  closeAll() {
    let any = false;
    for (const n of ['char', 'inv', 'shop', 'stash', 'wp']) { if (this.isOpen(n)) any = true; $('panel-' + n).classList.add('hidden'); }
    $('bigmap').classList.add('hidden');
    this.hideTip();
    return any;
  },

  refreshPanels() {
    if (!G.run) return;
    if (this.isOpen('char')) this.renderChar();
    if (this.isOpen('inv')) this.renderInv();
    if (this.isOpen('shop')) this.renderShop();
    if (this.isOpen('stash')) this.renderStash();
    if (this.isOpen('wp')) this.renderWaypoints();
    this.refreshSkills();
  },

  header(title) { return `<h3>${title}<button class="x" data-act="close">&times;</button></h3>`; },

  renderChar() {
    const run = G.run, rp = run.player, C = D.CLASSES[rp.cls], st = G.scene.stats;
    const statRow = (k, label) => `<span>${label}</span><span class="v">${st[k]}</span><button data-act="stat" data-k="${k}" ${rp.statPoints ? '' : 'disabled'}>+</button>`;
    const ps = (v) => v.toFixed(0);
    let html = this.header(`${C.name} &middot; Level ${rp.level}`);
    html += `<div class="stats">${statRow('str', 'Strength')}${statRow('dex', 'Dexterity')}${statRow('vit', 'Vitality')}${statRow('ene', 'Energy')}</div>`;
    html += `<div class="points">${rp.statPoints ? `${rp.statPoints} stat points to spend` : `${{ str: 'Strength', dex: 'Dexterity', ene: 'Energy' }[C.primary]} raises all your damage`}</div>`;
    const avg = (st.dmgMin + st.dmgMax) / 2 * st.dmgMult;
    html += `<div class="derived">
      <span>Damage</span><span>${Math.round(st.dmgMin * st.dmgMult)} - ${Math.round(st.dmgMax * st.dmgMult)} (avg ${avg.toFixed(1)})</span>
      <span>Life</span><span>${Math.ceil(rp.hp)} / ${st.maxHp}</span>
      <span>Mana</span><span>${Math.floor(rp.mana)} / ${st.maxMana}</span>
      <span>Defense</span><span>${Math.round(st.armor)}</span>
      <span>All resistances</span><span>${st.res}%</span>
      <span>Critical strike</span><span>${ps(st.crit)}%</span>
      <span>Attack speed</span><span>+${st.ias}%</span>
      <span>Run speed</span><span>+${st.frw}%</span>
      <span>Life stolen</span><span>${st.lifeSteal}%</span>
      <span>Magic find</span><span>+${st.mf}%</span>
      <span>Life / mana regen</span><span>${st.lifeRegen.toFixed(1)} / ${st.manaRegen.toFixed(1)} per s</span>
      <span>Monsters slain</span><span>${run.kills}</span>
    </div>`;
    html += `<div class="sub">Skills ${rp.skillPoints ? `&middot; <span style="color:#ffd070">${rp.skillPoints} point${rp.skillPoints > 1 ? 's' : ''} to spend</span>` : ''}${st.skills ? ` &middot; +${st.skills} from items` : ''}</div>`;
    C.skills.forEach((k, i) => {
      const sk = D.SKILLS[k], rank = rp.skills[k] || 0, locked = rp.level < sk.req;
      const eff = rank ? rank + st.skills : 0;
      const shown = Math.max(1, eff);
      const mult = Math.round((sk.mult + sk.multPer * (shown - 1)) * 100);
      const cost = Math.round(sk.mana + sk.manaPer * (shown - 1));
      const can = rp.skillPoints > 0 && !locked && rank < 20;
      html += `<div class="skillrow ${locked ? 'locked' : ''}" data-act="pickskill" data-k="${k}">
        <img src="${D.Art.iconURL[sk.icon]}">
        <div class="si"><div class="sn">${'QWER'[i]}: ${sk.name} ${rank ? `<span style="color:#fff">rank ${eff}</span>` : locked ? `<span style="color:#a66">(level ${sk.req})</span>` : '<span style="color:#a88">(not learned)</span>'}</div>
        <div class="sd">${sk.desc} ${mult}% weapon damage &middot; ${cost} mana${sk.cd ? ` &middot; ${sk.cd}s cooldown` : ''}</div></div>
        <button data-act="skill" data-k="${k}" ${can ? '' : 'disabled'}>+</button></div>`;
    });
    $('panel-char').innerHTML = html;
  },

  itemImg(it) { return `<img src="${D.Art.iconURL[it.icon]}">`; },

  renderInv() {
    const rp = G.run.player;
    let html = this.header('Inventory');
    html += '<div class="equip">';
    for (const slot of D.EQUIP_SLOTS) {
      const it = rp.equip[slot];
      html += `<div class="eq-slot ${it ? 'r-' + it.rarity : ''}" data-act="unequip" data-slot="${slot}"><span class="lbl">${D.SLOT_LABEL[slot]}</span>${it ? this.itemImg(it) : ''}</div>`;
    }
    html += '</div><div class="inv-grid">';
    rp.inv.forEach((it, i) => { html += `<div class="inv-cell ${it ? 'r-' + it.rarity : ''}" data-act="inv" data-i="${i}">${it ? this.itemImg(it) : ''}</div>`; });
    html += '</div>';
    html += `<div class="goldline"><span>Gold: ${rp.gold}</span><span>${rp.inv.filter(Boolean).length} / ${rp.inv.length}</span></div>`;
    const ctx = this.isOpen('shop') ? 'Right click: sell' : this.isOpen('stash') ? 'Right click: move to stash' : 'Right click: drop';
    html += `<div class="hint">Left click: equip &middot; ${ctx} &middot; Click a worn item to take it off</div>`;
    $('panel-inv').innerHTML = html;
  },

  shopStock() {
    const run = G.run;
    const lvl = Math.max(1, run.deepest ? run.floors[run.deepest].mlvl[1] : 1) + D.DIFFICULTY[run.difficulty].ilvl;
    if (!run.shop || run.shop.level !== lvl) {
      const items = [];
      for (let i = 0; i < 9; i++) items.push(D.Items.random(lvl, run.player.cls, D.rnd.weighted([['magic', 70], ['rare', 30]])));
      run.shop = { level: lvl, items };
    }
    return run.shop.items;
  },

  price(it) { return it.value * 5; },

  renderShop() {
    const rp = G.run.player;
    let html = this.header('Old Marta\'s Wares');
    html += '<div class="sub">Potions and scrolls</div><div class="shoplist">';
    for (const [k, p] of Object.entries(D.POTIONS)) {
      const full = rp.potions[k] >= p.max;
      html += `<div class="shoprow ${rp.gold < p.price ? 'poor' : ''}" data-act="buypot" data-k="${k}"><img src="${D.Art.iconURL[p.icon]}">
        <span class="nm">${p.name} <span style="color:#8f8270">(${rp.potions[k]}/${p.max})</span></span><span class="pr">${full ? 'full' : p.price + ' g'}</span></div>`;
    }
    html += '</div><div class="sub">Equipment</div><div class="shoplist">';
    this.shopStock().forEach((it, i) => {
      if (!it) return;
      html += `<div class="shoprow ${rp.gold < this.price(it) ? 'poor' : ''}" data-act="buy" data-i="${i}">${this.itemImg(it)}
        <span class="nm ${RARITY_CLASS(it.rarity)}">${D.esc(it.name)}</span><span class="pr">${this.price(it)} g</span></div>`;
    });
    html += `</div><div class="hint">Right click items in your inventory to sell them. Gold: <span style="color:#e8c060">${rp.gold}</span></div>`;
    $('panel-shop').innerHTML = html;
  },

  renderStash() {
    const run = G.run;
    let html = this.header('Stash') + '<div class="inv-grid">';
    run.stash.forEach((it, i) => { html += `<div class="inv-cell ${it ? 'r-' + it.rarity : ''}" data-act="stash" data-i="${i}">${it ? this.itemImg(it) : ''}</div>`; });
    html += '</div><div class="hint">Click an item to take it. Right click items in your inventory to store them.</div>';
    $('panel-stash').innerHTML = html;
  },

  renderWaypoints() {
    const run = G.run;
    let html = this.header('Waypoints') + '<div class="wplist">';
    for (const i of run.waypoints.slice().sort((a, b) => a - b)) {
      const name = i === 0 ? D.THEMES.town.name : run.floors[i].name;
      const cur = i === run.floorIndex;
      html += `<button class="mid" data-act="wp" data-i="${i}" ${cur ? 'disabled style="opacity:.5"' : ''}>${D.esc(name)}${i ? ` <span style="color:#8f8270;font-size:13px">(level ${i})</span>` : ''}</button>`;
    }
    html += '</div>';
    $('panel-wp').innerHTML = html;
  },

  openShop() { this.toggle('shop'); this.open('inv'); },
  openStash() { this.toggle('stash'); this.open('inv'); },
  openWaypoints() { this.toggle('wp'); },

  panelClick(e, right) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, run = G.run, rp = run.player, scene = G.scene;
    const i = el.dataset.i != null ? +el.dataset.i : null;
    let changed = true;
    switch (act) {
      case 'close': el.closest('.panel').classList.add('hidden'); this.hideTip(); return;
      case 'stat':
        if (rp.statPoints > 0) { rp.base[el.dataset.k] += 1; rp.statPoints--; D.Sfx.play('click'); }
        break;
      case 'skill': {
        const k = el.dataset.k, sk = D.SKILLS[k];
        if (rp.skillPoints > 0 && rp.level >= sk.req) {
          rp.skills[k] = (rp.skills[k] || 0) + 1; rp.skillPoints--;
          if (!rp.rightSkill || !rp.skills[rp.rightSkill]) rp.rightSkill = k;
          D.Sfx.play('level');
        }
        e.stopPropagation();
        break;
      }
      case 'pickskill':
        if (rp.skills[el.dataset.k]) rp.rightSkill = el.dataset.k;
        break;
      case 'inv': {
        const it = rp.inv[i];
        if (!it) return;
        if (!right) this.equip(i);
        else if (this.isOpen('shop')) { rp.inv[i] = null; rp.gold += it.value; D.Sfx.play('gold'); this.log(`Sold ${it.name} for ${it.value} gold`, '#e8c060'); }
        else if (this.isOpen('stash')) {
          const j = run.stash.indexOf(null);
          if (j < 0) { this.log('Stash is full', '#f66'); return; }
          run.stash[j] = it; rp.inv[i] = null; D.Sfx.play('pickup');
        } else { rp.inv[i] = null; scene.dropItem(it); }
        break;
      }
      case 'unequip': {
        const slot = el.dataset.slot, it = rp.equip[slot];
        if (!it) return;
        const j = rp.inv.indexOf(null);
        if (j < 0) { this.log('Inventory full', '#f66'); return; }
        rp.inv[j] = it; rp.equip[slot] = null; D.Sfx.play('pickup');
        break;
      }
      case 'stash': {
        const it = run.stash[i];
        if (!it) return;
        const j = rp.inv.indexOf(null);
        if (j < 0) { this.log('Inventory full', '#f66'); return; }
        rp.inv[j] = it; run.stash[i] = null; D.Sfx.play('pickup');
        break;
      }
      case 'buypot': {
        const k = el.dataset.k, p = D.POTIONS[k];
        if (rp.potions[k] >= p.max) { this.log('You can\'t carry any more', '#a88'); return; }
        if (rp.gold < p.price) { this.log('Not enough gold', '#f66'); D.Sfx.play('nomana'); return; }
        rp.gold -= p.price; rp.potions[k]++; D.Sfx.play('gold');
        break;
      }
      case 'buy': {
        const it = run.shop.items[i];
        if (!it) return;
        if (rp.gold < this.price(it)) { this.log('Not enough gold', '#f66'); D.Sfx.play('nomana'); return; }
        const j = rp.inv.indexOf(null);
        if (j < 0) { this.log('Inventory full', '#f66'); return; }
        rp.gold -= this.price(it); rp.inv[j] = it; run.shop.items[i] = null; D.Sfx.play('gold');
        break;
      }
      case 'wp': {
        D.Sfx.play('portal');
        this.closeAll();
        scene.goTo(i, 'waypoint');
        return;
      }
      default: changed = false;
    }
    if (changed) {
      scene.recalc();
      this.hideTip();
      this.refreshPanels();
      if (act === 'inv' || act === 'stash' || act === 'unequip' || act === 'buy') this.panelHover(e);
    }
  },

  equip(i) {
    const rp = G.run.player, it = rp.inv[i];
    let slot = it.slot;
    if (slot === 'ring') slot = !rp.equip.ring1 ? 'ring1' : !rp.equip.ring2 ? 'ring2' : 'ring1';
    rp.inv[i] = rp.equip[slot] || null;
    rp.equip[slot] = it;
    D.Sfx.play('pickup');
  },

  // ---------- tooltips ----------
  panelHover(e) {
    const el = e.target.closest('[data-act]');
    if (!el || !G.run) { this.hideTip(); return; }
    const rp = G.run.player, act = el.dataset.act, i = el.dataset.i != null ? +el.dataset.i : null;
    let it = null, hint = '', price = null;
    if (act === 'inv') { it = rp.inv[i]; hint = 'Click to equip'; if (it && this.isOpen('shop')) price = `Sells for ${it.value} gold`; }
    else if (act === 'unequip') { it = rp.equip[el.dataset.slot]; hint = 'Click to take off'; }
    else if (act === 'stash') it = G.run.stash[i];
    else if (act === 'buy') { it = G.run.shop.items[i]; if (it) price = `Costs ${this.price(it)} gold`; }
    if (!it) { this.hideTip(); return; }
    const cmpSlot = it.slot === 'ring' ? 'ring1' : it.slot;
    const cmp = act === 'unequip' ? null : rp.equip[cmpSlot];
    this.showTip(D.Items.tooltip(it, cmp, hint, price), e.clientX, e.clientY);
  },

  hudHover(e) {
    const s = e.target.closest('.slot');
    if (!s || !G.run) { this.hideTip(); return; }
    if (s.dataset.skill) {
      const sk = D.SKILLS[s.dataset.skill], rank = G.scene.skillRank(s.dataset.skill);
      this.showTip(`<div class="tt-name" style="color:#e8d5a8">${sk.name}</div><div>${sk.desc}</div>
        <div class="tt-base">${rank ? `Rank ${rank}` : `Learn it in the character panel (C) from level ${sk.req}`}</div>
        <div class="tt-hint">Right click casts the selected skill</div>`, e.clientX, e.clientY);
    } else if (s.dataset.pot) {
      const p = D.POTIONS[s.dataset.pot];
      this.showTip(`<div class="tt-name">${p.name}</div><div class="tt-hint">Buy more from Old Marta in the camp</div>`, e.clientX, e.clientY);
    }
  },

  showTip(html, x, y) {
    const t = $('tooltip');
    t.innerHTML = html;
    t.classList.remove('hidden');
    const r = t.getBoundingClientRect();
    let left = x + 16, top = y - r.height - 8;
    if (left + r.width > window.innerWidth - 4) left = x - r.width - 16;
    if (top < 4) top = y + 18;
    if (top + r.height > window.innerHeight - 4) top = window.innerHeight - r.height - 4;
    t.style.left = Math.max(4, left) + 'px'; t.style.top = top + 'px';
  },

  hideTip() { $('tooltip').classList.add('hidden'); },

  // ---------- modals ----------
  modalOpen() { return !$('modal').classList.contains('hidden'); },

  showModal(html) {
    $('modal').innerHTML = `<div class="box">${html}</div>`;
    $('modal').classList.remove('hidden');
    G.paused = true;
    this.hideTip();
  },

  hideModal() { $('modal').classList.add('hidden'); G.paused = false; },

  toggleMenu() {
    if (this.modalOpen()) {
      if (this.modalKind === 'menu' || this.modalKind === 'help') this.hideModal();
      return;
    }
    this.modalKind = 'menu';
    const run = G.run;
    this.showModal(`<h2>Paused</h2>
      <p style="color:#8f8270">${D.SIZES[run.size].label} map &middot; ${D.DIFFICULTY[run.difficulty].label} &middot; ${D.fmtTime(run.elapsed)}</p>
      <button class="mid" data-act="resume">Resume</button><br>
      <button class="mid" data-act="help">Controls</button><br>
      <button class="mid" data-act="sound">${D.Sfx.muted ? 'Sound: off' : 'Sound: on'}</button><br>
      <button class="mid" data-act="quit">Save &amp; quit to menu</button>`);
  },

  showHelp() {
    this.modalKind = 'help';
    this.showModal(`<h2>Controls</h2><table>
      <tr><td>Left click</td><td>Move, attack, pick up, talk, use</td></tr>
      <tr><td>Hold left click</td><td>Keep walking / attacking</td></tr>
      <tr><td>Shift + left click</td><td>Attack without moving</td></tr>
      <tr><td>Right click</td><td>Cast the selected skill</td></tr>
      <tr><td>Q W E R</td><td>Cast a skill at the cursor (and select it)</td></tr>
      <tr><td>1 2 3</td><td>Healing, mana, rejuvenation potion</td></tr>
      <tr><td>T</td><td>Read a Town Portal scroll</td></tr>
      <tr><td>I / C</td><td>Inventory / character and skills</td></tr>
      <tr><td>Tab</td><td>Map overlay</td></tr>
      <tr><td>Space</td><td>Close panels</td></tr>
      <tr><td>M</td><td>Mute sound</td></tr>
      <tr><td>Esc</td><td>Menu</td></tr></table>
      <p style="color:#8f8270;max-width:460px">Descend floor by floor. Bosses seal the stairs until they fall. Slay the Lord of Terror on the
      deepest level to win. Use waypoints and town portals to get back to the camp, sell loot and restock potions.</p>
      <button class="mid" data-act="resume">Back</button>`);
  },

  showDeath() {
    this.modalKind = 'death';
    this.showModal(`<h2 class="dead">You have died</h2>
      <p>Your hero wakes up in the camp. A tenth of your gold is lost.</p>
      <button class="big" data-act="respawn">Rise again</button>`);
  },

  showVictory() {
    this.modalKind = 'victory';
    const run = G.run, rp = run.player;
    const rec = G.records()[`${run.size}-${run.difficulty}`];
    this.showModal(`<h2>Victory!</h2>
      <p>The Lord of Terror is destroyed. The land can breathe again.</p>
      <table>
        <tr><td>Hero</td><td>Level ${rp.level} ${D.CLASSES[rp.cls].name}</td></tr>
        <tr><td>Map</td><td>${D.SIZES[run.size].label}, ${D.DIFFICULTY[run.difficulty].label}</td></tr>
        <tr><td>Time</td><td>${D.fmtTime(run.elapsed)}</td></tr>
        <tr><td>Best time</td><td>${rec ? D.fmtTime(rec.time) : '-'}</td></tr>
        <tr><td>Monsters slain</td><td>${run.kills}</td></tr>
        <tr><td>Deaths</td><td>${run.deaths}</td></tr>
        <tr><td>Gold</td><td>${rp.gold}</td></tr>
      </table>
      <button class="big" data-act="menu">Back to the menu</button>`);
  },

  modalAction(act) {
    if (act === 'resume') this.hideModal();
    else if (act === 'help') this.showHelp();
    else if (act === 'sound') { D.Sfx.toggleMute(); this.hideModal(); this.toggleMenu(); }
    else if (act === 'quit') {
      const s = G.scene;
      if (s && !s.dead) { G.run.player.x = s.player.x; G.run.player.y = s.player.y; }
      G.save();
      this.hideModal();
      window.Main.toMenu();
    } else if (act === 'respawn') { this.hideModal(); G.scene.respawn(); }
    else if (act === 'menu') { this.hideModal(); window.Main.toMenu(); }
  },
};
