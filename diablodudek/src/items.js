'use strict';

// Items: generation (bases, rarity, affixes, uniques), loot tables, derived hero stats and tooltips.

const Items = D.Items = {
  SLOT_WEIGHTS: [['weapon', 22], ['helm', 11], ['armor', 11], ['gloves', 10], ['boots', 10], ['offhand', 11], ['ring', 9], ['amulet', 6]],

  newId() { return 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); },

  tier(ilvl) { return ilvl < 8 ? 0 : ilvl < 16 ? 1 : 2; },

  rollRarity(mf, floorRarity) {
    const m = 1 + (mf || 0) / 100;
    const r = D.rnd.weighted([
      ['normal', 48],
      ['magic', 38 * Math.min(2, Math.sqrt(m))],
      ['rare', 10 * Math.pow(m, 0.8)],
      ['unique', 2.4 * Math.pow(m, 0.7)],
    ]);
    const order = ['normal', 'magic', 'rare', 'unique'];
    return order[Math.max(order.indexOf(r), order.indexOf(floorRarity || 'normal'))];
  },

  base(slot, ilvl, cls) {
    const C = D.CLASSES[cls], t = this.tier(ilvl);
    if (slot === 'weapon') {
      const b = D.rnd.pick(C.weapons);
      return { icon: b.icon, name: b.names[t], min: b.min, max: b.max };
    }
    if (slot === 'offhand') return { icon: C.offhand.icon, name: C.offhand.names[t], armor: C.offhand.armor };
    const b = D.ARMOR_BASES[slot];
    return { icon: b.icon, name: b.names[t], armor: b.armor };
  },

  make(slot, ilvl, rarity, cls) {
    ilvl = Math.max(1, Math.round(ilvl));
    let unique = null;
    if (rarity === 'unique') {
      const pool = D.UNIQUES.filter(u => (u.slot === slot || (slot === 'ring' && u.slot === 'ring')) && (!u.cls || u.cls === cls));
      const any = D.UNIQUES.filter(u => !u.cls || u.cls === cls);
      unique = D.rnd.pick(pool.length ? pool : any);
      slot = unique.slot;
    }
    const b = this.base(slot, ilvl, cls);
    const f = 1 + 0.2 * (ilvl - 1);
    const item = { id: this.newId(), slot, icon: b.icon, base: b.name, rarity, ilvl, aff: [] };
    if (slot === 'weapon') {
      const q = D.rnd.range(0.9, 1.12);
      item.min = Math.max(1, Math.round(b.min * f * q));
      item.max = Math.max(item.min + 1, Math.round(b.max * f * q));
    } else if (b.armor) {
      item.armor = Math.max(1, Math.round(b.armor * (1 + 0.22 * (ilvl - 1)) * D.rnd.range(0.85, 1.15)));
    }
    const pool = Object.keys(D.AFFIXES).filter(k => {
      const a = D.AFFIXES[k];
      const s = slot === 'ring' ? 'ring' : slot;
      return a.slots === 'any' || a.slots.split(' ').includes(s);
    });
    const roll = (k, mult) => {
      const a = D.AFFIXES[k], max = a.max(ilvl);
      const v = mult ? max * mult : max * D.rnd.range(0.4, 1);
      return Math.max(1, Math.round(v));
    };
    if (unique) {
      item.name = unique.name;
      for (const [k, mult] of unique.aff) item.aff.push([k, k === 'skills' ? mult : roll(k, mult)]);
      if (item.min) { item.min = Math.round(item.min * 1.15); item.max = Math.round(item.max * 1.15); }
    } else if (rarity === 'magic' || rarity === 'rare') {
      const n = rarity === 'magic' ? D.rnd.int(1, 2) : D.rnd.int(3, 5);
      const picks = [];
      while (picks.length < n) {
        const k = D.rnd.pick(pool);
        if (picks.includes(k)) continue;
        if (D.AFFIXES[k].rare && (rarity !== 'rare' || D.rnd() > 0.25)) continue;
        picks.push(k);
      }
      for (const k of picks) item.aff.push([k, roll(k)]);
      if (rarity === 'magic') {
        const pre = D.AFFIXES[picks[0]].pre, suf = picks[1] ? ' ' + D.AFFIXES[picks[1]].suf : '';
        item.name = `${b.name} ${pre}${suf}`;
      } else {
        const sec = D.RARE_NAMES.second[slot] || D.RARE_NAMES.second.amulet;
        item.name = `${D.rnd.pick(sec)} ${D.rnd.pick(D.RARE_NAMES.first)}`;
      }
    } else {
      item.name = b.name;
    }
    item.value = Math.round({ normal: 4, magic: 15, rare: 45, unique: 120 }[rarity] * (1 + ilvl * 0.35));
    return item;
  },

  random(ilvl, cls, rarity) {
    return this.make(D.rnd.weighted(this.SLOT_WEIGHTS), ilvl, rarity, cls);
  },

  potionType() { return D.rnd.weighted([['hp', 50], ['mp', 34], ['rejuv', 7], ['tp', 9]]); },

  goldAmount(mlvl) { return Math.round(mlvl * D.rnd.range(4, 10) + D.rnd.range(3, 9)); },

  // What a dead monster (or opened chest) leaves on the floor.
  drops(rank, mlvl, mf, cls, ilvlBonus) {
    const out = [], il = mlvl + ilvlBonus;
    const item = (floorRarity) => out.push({ kind: 'item', item: this.random(il + D.rnd.int(-1, 1), cls, this.rollRarity(mf, floorRarity)) });
    const gold = mult => out.push({ kind: 'gold', amount: Math.round(this.goldAmount(mlvl) * mult) });
    const pot = () => out.push({ kind: 'potion', ptype: this.potionType() });
    const one = (itemChance) => {
      const r = D.rnd();
      if (r < itemChance) item();
      else if (r < itemChance + 0.2) gold(1);
      else if (r < itemChance + 0.36) pot();
    };
    if (rank === 'normal') one(0.11);
    else if (rank === 'minion') one(0.16);
    else if (rank === 'champion') { item('magic'); item(); one(0.4); one(0.3); gold(3); }
    else if (rank === 'boss') {
      item('rare'); item('rare'); item('magic'); item('magic'); item();
      if (D.rnd() < 0.45) item('unique');
      gold(6); gold(6); pot(); pot(); pot();
    } else if (rank === 'chest') {
      item(D.rnd() < 0.35 ? 'magic' : null); one(0.35); one(0.25); gold(1.5);
    }
    return out;
  },

  // ---------- derived stats ----------
  stats(p, buffs) {
    const C = D.CLASSES[p.cls];
    const s = { str: p.base.str, dex: p.base.dex, vit: p.base.vit, ene: p.base.ene, life: 0, mana: 0, dmgPct: 0, dmgAll: 0, flat: 0,
      armorPct: 0, armorFlat: 0, res: 0, ias: 0, frw: 0, lifeSteal: 0, mf: 0, crit: 5, regen: 0, mregen: 0, skills: 0 };
    let itemArmor = 0, wmin = 1, wmax = 3;
    for (const key of D.EQUIP_SLOTS) {
      const it = p.equip[key];
      if (!it) continue;
      if (it.armor) itemArmor += it.armor;
      if (key === 'weapon') { wmin = it.min; wmax = it.max; }
      for (const [k, v] of it.aff) s[k] += v;
    }
    const lvl = p.level;
    // a hero never falls too far behind on an unlucky run of weapon drops
    wmin = Math.max(wmin, Math.round(lvl * 0.6)); wmax = Math.max(wmax, Math.round(lvl * 1.2 + 2));
    s.maxHp = Math.round(40 + s.vit * C.lifePerVit + (lvl - 1) * C.lifePerLvl + s.life);
    s.maxMana = Math.round(5 + s.ene * C.manaPerEne + (lvl - 1) * C.manaPerLvl + s.mana);
    s.armor = Math.round(itemArmor * (1 + s.armorPct / 100) + s.armorFlat + s.dex / 2);
    s.dmgMin = Math.round(wmin * (1 + s.dmgPct / 100)) + s.flat;
    s.dmgMax = Math.round(wmax * (1 + s.dmgPct / 100)) + s.flat * 2;
    s.dmgMult = (1 + s[C.primary] / 100) * (1 + s.dmgAll / 100);
    s.res = Math.min(75, s.res);
    s.ias = Math.min(60, s.ias);
    s.frw = Math.min(60, s.frw);
    s.crit = Math.min(50, s.crit);
    s.lifeSteal = Math.min(15, s.lifeSteal);
    s.manaRegen = 1.5 + s.ene * 0.05 + s.maxMana * 0.015 + s.mregen;
    s.lifeRegen = 0.25 + s.regen;
    if (buffs) {
      if (buffs.armor > 0) s.armor *= 2;
      if (buffs.combat > 0) s.dmgMult *= 1.5;
      if (buffs.speed > 0) { s.frw += 30; s.ias += 30; }
      if (buffs.mana > 0) s.manaRegen = s.manaRegen * 5 + 5;
    }
    return s;
  },

  // ---------- presentation ----------
  mainLine(it) {
    if (it.slot === 'weapon') return `Šteta: <span class="tt-main">${it.min} - ${it.max}</span>`;
    if (it.armor) return `Obrana: <span class="tt-main">${it.armor}</span>`;
    return '';
  },

  affLine(k, v) { return D.AFFIXES[k].fmt(v); },

  tooltip(it, cmp, hint, price) {
    const lines = [`<div class="tt-name c-${it.rarity}">${esc(it.name)}</div>`];
    if (it.rarity !== 'normal') lines.push(`<div class="tt-base">${esc(it.base)}</div>`);
    const main = this.mainLine(it);
    if (main) lines.push(`<div>${main}</div>`);
    const affColor = it.rarity === 'unique' ? 'c-unique' : 'tt-aff';
    for (const [k, v] of it.aff) lines.push(`<div class="${affColor}">${this.affLine(k, v)}</div>`);
    lines.push(`<div class="tt-base">Razina predmeta ${it.ilvl}</div>`);
    if (price != null) lines.push(`<div style="color:#e8c060">${price}</div>`);
    if (cmp && cmp !== it) {
      let delta = '';
      if (it.slot === 'weapon' && cmp.min != null) {
        const d = (it.min + it.max) / 2 - (cmp.min + cmp.max) / 2;
        delta = d ? `<span class="${d > 0 ? 'tt-up' : 'tt-down'}">${d > 0 ? '+' : ''}${d.toFixed(1)} prosj. štete</span>` : '';
      } else if (it.armor != null || cmp.armor != null) {
        const d = (it.armor || 0) - (cmp.armor || 0);
        delta = d ? `<span class="${d > 0 ? 'tt-up' : 'tt-down'}">${d > 0 ? '+' : ''}${d} obrane</span>` : '';
      }
      lines.push(`<div class="tt-cmp">Nosiš: <span class="c-${cmp.rarity}">${esc(cmp.name)}</span>${delta ? '<br>' + delta : ''}</div>`);
    }
    if (hint) lines.push(`<div class="tt-hint">${hint}</div>`);
    return lines.join('');
  },
};

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
D.esc = esc;
