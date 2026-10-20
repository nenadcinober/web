'use strict';

// Static game data: hero classes, skills, monsters, bosses, item bases and affixes, map sizes.

window.D = window.D || {};

D.TILE = 48;

D.makeRng = function (seed) {
  let s = (seed >>> 0) || 1;
  const r = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
  r.range = (a, b) => a + r() * (b - a);
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  r.weighted = (entries) => {
    let total = 0;
    for (const e of entries) total += e[1];
    let x = r() * total;
    for (const e of entries) { x -= e[1]; if (x <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  };
  return r;
};

// Combat and loot use an unseeded generator; only map layout is seeded.
D.rnd = D.makeRng(Date.now() ^ (Math.random() * 1e9));

D.SIZES = {
  small:  { label: 'Small',  floors: 3, dim: 52, monsters: 36, champions: 1, chests: 3, bosses: ['lord'], bossFloors: [3], minutes: '15 - 20 min',
            maxMlvl: 10, desc: '3 dungeon levels, 1 boss' },
  medium: { label: 'Medium', floors: 5, dim: 58, monsters: 42, champions: 2, chests: 4, bosses: ['gravekeeper', 'lord'], bossFloors: [3, 5], minutes: '30 - 40 min',
            maxMlvl: 18, desc: '5 dungeon levels, 2 bosses' },
  large:  { label: 'Large',  floors: 7, dim: 62, monsters: 46, champions: 2, chests: 4, bosses: ['gravekeeper', 'venom', 'lord'], bossFloors: [3, 5, 7], minutes: '45 - 60 min',
            maxMlvl: 26, desc: '7 dungeon levels, 3 bosses' },
};

D.DIFFICULTY = {
  normal:    { label: 'Normal',    hp: 1.0, dmg: 1.0, xp: 1.0, ilvl: 0, desc: 'A fair fight' },
  nightmare: { label: 'Nightmare', hp: 1.6, dmg: 1.45, xp: 1.35, ilvl: 3, desc: 'Tougher foes, better loot' },
  hell:      { label: 'Hell',      hp: 2.4, dmg: 2.0, xp: 1.75, ilvl: 6, desc: 'For the reckless' },
};

D.THEMES = {
  crypt: { name: 'Forgotten Crypt', monsters: ['zombie', 'skeleton', 'archer', 'fallen', 'wraith'] },
  caves: { name: 'Caverns of Despair', monsters: ['fallen', 'shaman', 'goatman', 'spider', 'archer'] },
  hell:  { name: 'River of Flame', monsters: ['imp', 'knight', 'wraith', 'goatman', 'spider'] },
  town:  { name: 'Gruntvale Encampment', monsters: [] },
};

D.CLASSES = {
  barbarian: {
    name: 'Barbarian', primary: 'str', base: { str: 30, dex: 20, vit: 25, ene: 10 },
    lifePerVit: 4, lifePerLvl: 6, manaPerEne: 1.5, manaPerLvl: 1,
    attack: 'melee', atkRange: 50, atkCd: 0.45,
    weapons: [
      { icon: 'axe', names: ['Hand Axe', 'Battle Axe', 'Berserker Axe'], min: 3, max: 7 },
      { icon: 'sword', names: ['Short Sword', 'Broad Sword', 'Phase Blade'], min: 4, max: 6 },
      { icon: 'mace', names: ['Club', 'Flail', 'War Hammer'], min: 2, max: 9 },
    ],
    offhand: { icon: 'shield', names: ['Buckler', 'Kite Shield', 'Tower Shield'], armor: 6 },
    skills: ['bash', 'leap', 'whirl', 'warcry'],
    desc: 'A savage melee warrior. Strength boosts all damage.',
  },
  amazon: {
    name: 'Amazon', primary: 'dex', base: { str: 20, dex: 30, vit: 20, ene: 15 },
    lifePerVit: 3, lifePerLvl: 5, manaPerEne: 1.5, manaPerLvl: 1.5,
    attack: 'bow', atkRange: 430, atkCd: 0.55,
    weapons: [
      { icon: 'bow', names: ['Short Bow', 'Long Bow', 'Hydra Bow'], min: 2, max: 7 },
      { icon: 'bow', names: ['Hunter\'s Bow', 'Composite Bow', 'Matriarchal Bow'], min: 3, max: 6 },
    ],
    offhand: { icon: 'quiver', names: ['Quiver', 'Hunter\'s Quiver', 'Endless Quiver'], armor: 2 },
    skills: ['multishot', 'explode', 'freeze', 'strafe'],
    desc: 'A deadly archer. Dexterity boosts all damage.',
  },
  sorceress: {
    name: 'Sorceress', primary: 'ene', base: { str: 10, dex: 20, vit: 20, ene: 30 },
    lifePerVit: 3, lifePerLvl: 4, manaPerEne: 2, manaPerLvl: 2,
    attack: 'spark', atkRange: 400, atkCd: 0.5,
    weapons: [
      { icon: 'staff', names: ['Short Staff', 'War Staff', 'Archon Staff'], min: 2, max: 6 },
      { icon: 'wand', names: ['Wand', 'Bone Wand', 'Lich Wand'], min: 3, max: 5 },
    ],
    offhand: { icon: 'orb', names: ['Eagle Orb', 'Glowing Orb', 'Eldritch Orb'], armor: 1 },
    skills: ['firebolt', 'nova', 'chain', 'meteor'],
    desc: 'A master of the elements. Energy boosts all damage.',
  },
};

// mult/multPer: weapon-damage multiplier at rank 1 and per extra rank.
D.SKILLS = {
  bash:      { name: 'Bash', req: 1, mana: 2, manaPer: 0.3, cd: 0, kind: 'melee', mult: 2.4, multPer: 0.3, icon: 'bash',
               desc: 'A crushing blow that knocks the enemy back.' },
  leap:      { name: 'Leap Slam', req: 2, mana: 6, manaPer: 0.4, cd: 2.5, kind: 'leap', range: 320, radius: 90, mult: 1.6, multPer: 0.25, icon: 'leap',
               desc: 'Leap to the target spot and slam everything nearby, stunning briefly.' },
  whirl:     { name: 'Whirlwind', req: 5, mana: 11, manaPer: 0.6, cd: 0.6, kind: 'whirl', range: 340, radius: 72, mult: 0.85, multPer: 0.12, icon: 'whirl',
               desc: 'Spin toward the target, cutting through everything in your path.' },
  warcry:    { name: 'War Cry', req: 9, mana: 15, manaPer: 0.8, cd: 5, kind: 'cry', radius: 190, mult: 2.2, multPer: 0.3, stun: 2.2, icon: 'warcry',
               desc: 'A terrifying shout that damages and stuns all nearby enemies.' },

  multishot: { name: 'Multishot', req: 1, mana: 4, manaPer: 0.3, cd: 0, kind: 'multi', mult: 0.75, multPer: 0.1, icon: 'multishot',
               desc: 'Fire a spread of arrows. One more arrow every 2 ranks.' },
  explode:   { name: 'Exploding Arrow', req: 2, mana: 6, manaPer: 0.4, cd: 0, kind: 'explarrow', radius: 85, mult: 1.8, multPer: 0.25, elem: 'fire', icon: 'explode',
               desc: 'An arrow that bursts into flame on impact.' },
  freeze:    { name: 'Freezing Arrow', req: 5, mana: 8, manaPer: 0.5, cd: 0, kind: 'freezearrow', mult: 1.5, multPer: 0.2, elem: 'cold', freeze: 1.6, icon: 'freeze',
               desc: 'A piercing arrow that freezes every enemy it passes through.' },
  strafe:    { name: 'Strafe', req: 9, mana: 12, manaPer: 0.6, cd: 1.5, kind: 'strafe', mult: 0.9, multPer: 0.12, icon: 'strafe',
               desc: 'Loose a rapid volley at every enemy around you.' },

  firebolt:  { name: 'Fire Bolt', req: 1, mana: 3, manaPer: 0.25, cd: 0, kind: 'bolt', mult: 1.7, multPer: 0.22, elem: 'fire', icon: 'firebolt',
               desc: 'Hurl a bolt of fire.' },
  nova:      { name: 'Frost Nova', req: 2, mana: 9, manaPer: 0.5, cd: 1, kind: 'nova', radius: 190, mult: 1.2, multPer: 0.18, elem: 'cold', icon: 'nova',
               desc: 'A ring of ice that damages and chills everything around you.' },
  chain:     { name: 'Chain Lightning', req: 5, mana: 12, manaPer: 0.6, cd: 0, kind: 'chain', mult: 1.5, multPer: 0.2, elem: 'light', icon: 'chain',
               desc: 'Lightning that leaps between enemies. One more jump every 3 ranks.' },
  meteor:    { name: 'Meteor', req: 9, mana: 18, manaPer: 0.9, cd: 2, kind: 'meteor', radius: 115, mult: 4.0, multPer: 0.5, elem: 'fire', icon: 'meteor',
               desc: 'Call down a meteor that leaves the ground burning.' },
};

// Monster bases at monster level 1.
D.MONSTERS = {
  zombie:   { name: 'Zombie', hp: 34, dmg: 6, speed: 42, cd: 1.4, range: 46, radius: 17, xp: 1.15, ai: 'melee', scale: 1.0, pack: [3, 5] },
  skeleton: { name: 'Skeleton', hp: 24, dmg: 5, speed: 82, cd: 1.1, range: 46, radius: 15, xp: 1.0, ai: 'melee', scale: 1.0, pack: [3, 6] },
  archer:   { name: 'Skeleton Archer', hp: 18, dmg: 3.5, speed: 72, cd: 1.9, range: 320, radius: 15, xp: 1.1, ai: 'ranged', proj: 'arrow', scale: 1.0, pack: [2, 4] },
  fallen:   { name: 'Fallen', hp: 14, dmg: 3, speed: 105, cd: 0.9, range: 40, radius: 13, xp: 0.75, ai: 'melee', scale: 0.8, pack: [4, 7] },
  wraith:   { name: 'Wraith', hp: 26, dmg: 6, speed: 112, cd: 1.1, range: 46, radius: 16, xp: 1.2, ai: 'melee', elem: 'cold', scale: 1.05, pack: [2, 4] },
  shaman:   { name: 'Fallen Shaman', hp: 20, dmg: 5, speed: 70, cd: 2.2, range: 290, radius: 14, xp: 1.3, ai: 'ranged', proj: 'fireball', elem: 'fire', scale: 0.85, pack: [1, 2], escort: 'fallen' },
  goatman:  { name: 'Goatman', hp: 34, dmg: 7, speed: 88, cd: 1.2, range: 48, radius: 17, xp: 1.2, ai: 'melee', scale: 1.1, pack: [3, 5] },
  spider:   { name: 'Cave Spider', hp: 22, dmg: 4, speed: 128, cd: 0.9, range: 42, radius: 16, xp: 1.0, ai: 'melee', elem: 'poison', scale: 1.0, pack: [3, 5] },
  imp:      { name: 'Imp', hp: 26, dmg: 6, speed: 92, cd: 2.6, range: 300, radius: 15, xp: 1.3, ai: 'ranged', proj: 'firebolt', elem: 'fire', scale: 0.9, pack: [2, 4] },
  knight:   { name: 'Doom Knight', hp: 70, dmg: 10, speed: 68, cd: 1.5, range: 54, radius: 21, xp: 2.0, ai: 'melee', scale: 1.25, pack: [1, 3] },
};

D.BOSSES = {
  gravekeeper: { name: 'Bonecrusher the Gravekeeper', art: 'gravekeeper', hp: 280, dmg: 10, speed: 82, cd: 1.5, range: 70, radius: 34, xp: 22,
                 abilities: ['charge', 'slam', 'summon'], minions: 'skeleton', title: 'The dead do not rest here.' },
  venom:       { name: 'Lady Venomshade', art: 'venom', hp: 340, dmg: 9, speed: 92, cd: 1.4, range: 64, radius: 30, xp: 26,
                 abilities: ['spray', 'poisonNova', 'summon', 'charge'], minions: 'spider', title: 'Her brood hungers.' },
  lord:        { name: 'Baal\'zhur, Lord of Terror', art: 'lord', hp: 480, dmg: 11, speed: 86, cd: 1.5, range: 74, radius: 38, xp: 40,
                 abilities: ['fireRing', 'breath', 'charge', 'summon', 'slam'], minions: 'knight', title: 'Terror itself awaits.' },
};

D.CHAMPION_MODS = {
  strong:   { label: 'Extra Strong' },
  fast:     { label: 'Extra Fast' },
  stone:    { label: 'Stone Skin' },
  fire:     { label: 'Fire Enchanted' },
  cold:     { label: 'Cold Enchanted' },
  vampire:  { label: 'Vampiric' },
};
D.CHAMPION_NAMES = {
  first: ['Blood', 'Grim', 'Gore', 'Rot', 'Doom', 'Bone', 'Wrath', 'Bile', 'Ash', 'Gloom', 'Pit', 'Storm', 'Dread', 'Rust', 'Venom'],
  second: ['fang', 'maw', 'claw', 'hide', 'skull', 'heart', 'spine', 'tongue', 'eye', 'thorn', 'gut', 'wing'],
  title: ['the Hungry', 'the Cruel', 'the Unclean', 'the Wretched', 'the Butcher', 'the Defiler', 'the Cold', 'the Witch', 'the Mad', 'the Hunter'],
};

D.SHRINES = {
  armor:   { label: 'Armor Shrine', buff: 'Armor +100%', color: 0x88aaff },
  combat:  { label: 'Combat Shrine', buff: 'Damage +50%', color: 0xff6644 },
  speed:   { label: 'Speed Shrine', buff: 'Speed +30%', color: 0x66ff99 },
  mana:    { label: 'Mana Shrine', buff: 'Mana regen x5', color: 0x6688ff },
  exp:     { label: 'Experience Shrine', buff: 'Experience +50%', color: 0xffdd55 },
  refill:  { label: 'Refilling Shrine', buff: null, color: 0xff4466 },
};

// Equipment slots and the item bases that roll in them.
D.EQUIP_SLOTS = ['helm', 'amulet', 'weapon', 'armor', 'offhand', 'gloves', 'ring1', 'ring2', 'boots'];
D.SLOT_LABEL = { helm: 'Helm', amulet: 'Amulet', weapon: 'Weapon', armor: 'Armor', offhand: 'Off-hand', gloves: 'Gloves',
  ring1: 'Ring', ring2: 'Ring', boots: 'Boots' };

D.ARMOR_BASES = {
  helm:   { icon: 'helm', names: ['Cap', 'Great Helm', 'Bone Visage'], armor: 4 },
  armor:  { icon: 'armor', names: ['Leather Armor', 'Chain Mail', 'Templar Plate'], armor: 10 },
  gloves: { icon: 'gloves', names: ['Leather Gloves', 'Chain Gloves', 'War Gauntlets'], armor: 2 },
  boots:  { icon: 'boots', names: ['Boots', 'Chain Boots', 'War Boots'], armor: 2 },
  ring:   { icon: 'ring', names: ['Ring', 'Ring', 'Ring'], armor: 0 },
  amulet: { icon: 'amulet', names: ['Amulet', 'Amulet', 'Amulet'], armor: 0 },
};

// Affix rolls: max value at item level il; a roll lands between 40% and 100% of it.
D.AFFIXES = {
  str:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} to Strength`, pre: 'Mighty', suf: 'of Strength' },
  dex:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} to Dexterity`, pre: 'Nimble', suf: 'of Dexterity' },
  vit:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} to Vitality`, pre: 'Stout', suf: 'of Vitality' },
  ene:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} to Energy`, pre: 'Wise', suf: 'of Energy' },
  life:      { max: il => 8 + il * 3, slots: 'helm armor offhand gloves boots ring amulet', fmt: v => `+${v} to Life`, pre: 'Robust', suf: 'of the Whale' },
  mana:      { max: il => 8 + il * 2.5, slots: 'helm armor offhand ring amulet weapon', fmt: v => `+${v} to Mana`, pre: 'Lapis', suf: 'of the Mind' },
  dmgPct:    { max: il => 25 + il * 4, slots: 'weapon', fmt: v => `+${v}% Enhanced Damage`, pre: 'Cruel', suf: 'of Slaughter' },
  dmgAll:    { max: il => 5 + il * 1.2, slots: 'gloves ring amulet offhand helm', fmt: v => `+${v}% Damage`, pre: 'Savage', suf: 'of Fury' },
  flat:      { max: il => 1 + il * 0.6, slots: 'weapon ring offhand gloves', fmt: v => `Adds ${v}-${v * 2} Damage`, pre: 'Jagged', suf: 'of Maiming' },
  armorPct:  { max: il => 20 + il * 3, slots: 'helm armor offhand gloves boots', fmt: v => `+${v}% Enhanced Defense`, pre: 'Sturdy', suf: 'of the Bulwark' },
  armorFlat: { max: il => 5 + il * 3, slots: 'helm armor offhand gloves boots ring amulet', fmt: v => `+${v} Defense`, pre: 'Hardened', suf: 'of Warding' },
  res:       { max: il => 6 + il * 1.3, slots: 'any', fmt: v => `All Resistances +${v}%`, pre: 'Shimmering', suf: 'of the Prism' },
  ias:       { max: il => Math.min(30, 10 + il * 0.7), slots: 'weapon gloves offhand', fmt: v => `+${v}% Attack Speed`, pre: 'Swift', suf: 'of Haste' },
  frw:       { max: il => Math.min(30, 10 + il * 0.7), slots: 'boots', fmt: v => `+${v}% Faster Run/Walk`, pre: 'Fleet', suf: 'of Speed' },
  lifeSteal: { max: il => Math.min(8, 2 + il * 0.22), slots: 'weapon ring amulet gloves', fmt: v => `${v}% Life Stolen per Hit`, pre: 'Vampiric', suf: 'of the Leech' },
  mf:        { max: il => 10 + il * 1.5, slots: 'any', fmt: v => `+${v}% Magic Find`, pre: 'Lucky', suf: 'of Fortune' },
  crit:      { max: il => Math.min(12, 3 + il * 0.3), slots: 'weapon ring amulet gloves offhand helm', fmt: v => `+${v}% Critical Strike`, pre: 'Deadly', suf: 'of Precision' },
  regen:     { max: il => 1 + il * 0.3, slots: 'armor ring amulet helm boots', fmt: v => `Regenerate ${v} Life per second`, pre: 'Healing', suf: 'of Regeneration' },
  mregen:    { max: il => 1 + il * 0.25, slots: 'offhand ring amulet helm weapon', fmt: v => `Regenerate ${v} Mana per second`, pre: 'Arcane', suf: 'of the Magus' },
  skills:    { max: () => 1, slots: 'amulet weapon offhand helm', fmt: v => `+${v} to All Skills`, pre: 'Masterful', suf: 'of the Ages', rare: true },
};

D.RARE_NAMES = {
  first: ['Doom', 'Grim', 'Blood', 'Soul', 'Storm', 'Bone', 'Dread', 'Shadow', 'Wraith', 'Viper', 'Rune', 'Corpse', 'Pain', 'Gale', 'Eagle', 'Raven'],
  second: { weapon: ['Bite', 'Song', 'Edge', 'Fang', 'Reaver', 'Spike'], helm: ['Crown', 'Visage', 'Cowl', 'Horn'], armor: ['Shell', 'Coat', 'Hide', 'Mantle'],
            gloves: ['Grip', 'Fist', 'Hand', 'Claw'], boots: ['Stride', 'Track', 'Road', 'Spur'], offhand: ['Ward', 'Guard', 'Aegis', 'Mark'],
            ring: ['Loop', 'Band', 'Coil', 'Spiral'], amulet: ['Heart', 'Eye', 'Charm', 'Talisman'] },
};

// Uniques: fixed affix sets, each value = roll max * multiplier.
D.UNIQUES = [
  { name: 'Gruntvale Cleaver', slot: 'weapon', cls: 'barbarian', aff: [['dmgPct', 1.6], ['lifeSteal', 1], ['str', 1.3], ['ias', 1]] },
  { name: 'The Gravedigger', slot: 'weapon', cls: 'barbarian', aff: [['dmgPct', 1.4], ['flat', 1.5], ['crit', 1], ['vit', 1.2]] },
  { name: 'Windforce Remnant', slot: 'weapon', cls: 'amazon', aff: [['dmgPct', 1.6], ['ias', 1], ['dex', 1.4], ['lifeSteal', 0.8]] },
  { name: 'Hellrain', slot: 'weapon', cls: 'amazon', aff: [['dmgPct', 1.3], ['crit', 1.2], ['skills', 1], ['mana', 1.2]] },
  { name: 'Ember of the Archon', slot: 'weapon', cls: 'sorceress', aff: [['dmgPct', 1.5], ['ene', 1.4], ['skills', 1], ['mregen', 1.3]] },
  { name: 'Lich Whisper', slot: 'weapon', cls: 'sorceress', aff: [['dmgPct', 1.3], ['mana', 1.5], ['crit', 1.1], ['lifeSteal', 0.7]] },
  { name: 'Crown of Ages', slot: 'helm', aff: [['res', 1.2], ['life', 1.3], ['armorPct', 1.4], ['skills', 1]] },
  { name: 'Bloodfist', slot: 'gloves', aff: [['ias', 1], ['dmgAll', 1.5], ['life', 1.2], ['lifeSteal', 0.8]] },
  { name: 'Shadow Dancer', slot: 'boots', aff: [['frw', 1], ['dex', 1.5], ['armorPct', 1.3], ['res', 0.8]] },
  { name: 'Shaftstop', slot: 'armor', aff: [['armorPct', 1.6], ['life', 1.5], ['res', 1], ['regen', 1.2]] },
  { name: 'Stone of Jordan', slot: 'ring', aff: [['mana', 1.5], ['skills', 1], ['ene', 1.2], ['mregen', 1]] },
  { name: 'Raven Frost', slot: 'ring', aff: [['dex', 1.5], ['crit', 1.1], ['flat', 1.3], ['life', 1]] },
  { name: 'Mara\'s Kaleidoscope', slot: 'amulet', aff: [['skills', 2], ['res', 1.4], ['str', 1], ['dex', 1]] },
  { name: 'Highlord\'s Wrath', slot: 'amulet', aff: [['crit', 1.2], ['dmgAll', 1.4], ['lifeSteal', 0.8], ['ias', 0.8]] },
  { name: 'Homunculus', slot: 'offhand', aff: [['life', 1.4], ['armorPct', 1.4], ['res', 1.2], ['mregen', 1.2]] },
];

D.POTIONS = {
  hp:   { name: 'Healing Potion', icon: 'potion_red', max: 12, price: 25 },
  mp:   { name: 'Mana Potion', icon: 'potion_blue', max: 12, price: 25 },
  rejuv:{ name: 'Rejuvenation Potion', icon: 'potion_purple', max: 6, price: 120 },
  tp:   { name: 'Town Portal Scroll', icon: 'scroll', max: 10, price: 40 },
};

D.xpForLevel = lvl => Math.round(45 * Math.pow(lvl, 1.75));       // xp needed to go from lvl to lvl+1
D.monsterXp = mlvl => Math.round(10 * Math.pow(mlvl, 1.3));
D.hpScale = mlvl => Math.pow(1 + 0.25 * (mlvl - 1), 1.68);
D.dmgScale = mlvl => Math.pow(1 + 0.2 * (mlvl - 1), 1.25);
D.MAX_LEVEL = 50;
