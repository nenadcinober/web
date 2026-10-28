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
  small:  { label: 'Mala', floors: 3, dim: 52, monsters: 36, champions: 1, chests: 3, bosses: ['lord'], bossFloors: [3], minutes: '15 - 20 min',
            maxMlvl: 10, desc: '3 razine pod zemljom, 1 gazda' },
  medium: { label: 'Srednja', floors: 5, dim: 58, monsters: 42, champions: 2, chests: 4, bosses: ['gravekeeper', 'lord'], bossFloors: [3, 5], minutes: '30 - 40 min',
            maxMlvl: 18, desc: '5 razina pod zemljom, 2 gazde' },
  large:  { label: 'Velika', floors: 7, dim: 62, monsters: 46, champions: 2, chests: 4, bosses: ['gravekeeper', 'venom', 'lord'], bossFloors: [3, 5, 7], minutes: '45 - 60 min',
            maxMlvl: 26, desc: '7 razina pod zemljom, 3 gazde' },
};

D.DIFFICULTY = {
  normal:    { label: 'Normalno',   hp: 1.0, dmg: 1.0, xp: 1.0, ilvl: 0, desc: 'Pošteni boj' },
  nightmare: { label: 'Noćna mora', hp: 1.6, dmg: 1.45, xp: 1.35, ilvl: 3, desc: 'Jači vragi, bolji plijen' },
  hell:      { label: 'Pakel',      hp: 2.4, dmg: 2.0, xp: 1.75, ilvl: 6, desc: 'Za one bez glave' },
};

D.THEMES = {
  crypt: { name: 'Podrum pod klijetom', monsters: ['zombie', 'skeleton', 'archer', 'fallen', 'wraith'] },
  caves: { name: 'Dravski rukavci', monsters: ['fallen', 'shaman', 'goatman', 'spider', 'archer'] },
  hell:  { name: 'Coprnički pakel', monsters: ['imp', 'knight', 'wraith', 'goatman', 'spider'] },
  town:  { name: 'Gruntovec', monsters: [] },
};

D.CLASSES = {
  barbarian: {
    name: 'Dudek', primary: 'str', base: { str: 30, dex: 20, vit: 25, ene: 10 },
    lifePerVit: 4, lifePerLvl: 6, manaPerEne: 1.5, manaPerLvl: 1,
    attack: 'melee', atkRange: 50, atkCd: 0.45,
    weapons: [
      { icon: 'fork', names: ['Vile', 'Gnojne vile', 'Kovane vile'], min: 3, max: 7 },
      { icon: 'axe', names: ['Sjekirica', 'Drvarska sjekira', 'Bradva'], min: 4, max: 6 },
      { icon: 'mace', names: ['Batina', 'Mlatilo', 'Kovačko kladivo'], min: 2, max: 9 },
    ],
    offhand: { icon: 'shield', names: ['Poklopac od lonca', 'Poklopac od kotla', 'Vratašca od kokošinjca'], armor: 6 },
    skills: ['bash', 'leap', 'whirl', 'warcry'],
    desc: 'Gruntovečki seljak s vilama i poklopcem. Snaga diže svu štetu.',
  },
  amazon: {
    name: 'Regica', primary: 'dex', base: { str: 20, dex: 30, vit: 20, ene: 15 },
    lifePerVit: 3, lifePerLvl: 5, manaPerEne: 1.5, manaPerLvl: 1.5,
    attack: 'bow', atkRange: 430, atkCd: 0.55,
    weapons: [
      { icon: 'bow', names: ['Luk od lijeske', 'Lovački luk', 'Dravski dugi luk'], min: 2, max: 7 },
      { icon: 'bow', names: ['Vrbov luk', 'Jasenov luk', 'Luk lovca Pepeka'], min: 3, max: 6 },
    ],
    offhand: { icon: 'quiver', names: ['Tobolac', 'Pleteni tobolac', 'Bezdani tobolac'], armor: 2 },
    skills: ['multishot', 'explode', 'freeze', 'strafe'],
    desc: 'Dudekova Regica, oko kao u sokola. Spretnost diže svu štetu.',
  },
  sorceress: {
    name: 'Mamica', primary: 'ene', base: { str: 10, dex: 20, vit: 20, ene: 30 },
    lifePerVit: 3, lifePerLvl: 4, manaPerEne: 2, manaPerLvl: 2,
    attack: 'spark', atkRange: 400, atkCd: 0.5,
    weapons: [
      { icon: 'staff', names: ['Štap', 'Pastirski štap', 'Štap svetog Florijana'], min: 2, max: 6 },
      { icon: 'wand', names: ['Kuhača', 'Velika kuhača', 'Kuhača za pekmez'], min: 3, max: 5 },
    ],
    offhand: { icon: 'orb', names: ['Staklenka', 'Staklenka s krijesnicama', 'Začarana staklenka'], armor: 1 },
    skills: ['firebolt', 'nova', 'chain', 'meteor'],
    desc: 'Mamica zna sve trave i molitve. Energija diže svu štetu.',
  },
};

// mult/multPer: weapon-damage multiplier at rank 1 and per extra rank.
D.SKILLS = {
  bash:      { name: 'Mlat', req: 1, mana: 2, manaPer: 0.3, cd: 0, kind: 'melee', mult: 2.4, multPer: 0.3, icon: 'bash',
               desc: 'Zdravi seljački udarac koji odbaci neprijatelja.' },
  leap:      { name: 'Skok s plasta', req: 2, mana: 6, manaPer: 0.4, cd: 2.5, kind: 'leap', range: 320, radius: 90, mult: 1.6, multPer: 0.25, icon: 'leap',
               desc: 'Skoči kao s plasta sijena i tresni po svima okolo, kratko ih omami.' },
  whirl:     { name: 'Kosidba', req: 5, mana: 11, manaPer: 0.6, cd: 0.6, kind: 'whirl', range: 340, radius: 72, mult: 0.85, multPer: 0.12, icon: 'whirl',
               desc: 'Vrti se prema cilju i kosi sve na putu kao travu na livadi.' },
  warcry:    { name: 'Kaj je?!', req: 9, mana: 15, manaPer: 0.8, cd: 5, kind: 'cry', radius: 190, mult: 2.2, multPer: 0.3, stun: 2.2, icon: 'warcry',
               desc: 'Dudekov krik od kojeg se trese cijeli grunt: ošteti i omami sve okolo.' },

  multishot: { name: 'Lepeza strijela', req: 1, mana: 4, manaPer: 0.3, cd: 0, kind: 'multi', mult: 0.75, multPer: 0.1, icon: 'multishot',
               desc: 'Ispali lepezu strijela. Jedna strijela više svaka 2 ranga.' },
  explode:   { name: 'Rakijska strijela', req: 2, mana: 6, manaPer: 0.4, cd: 0, kind: 'explarrow', radius: 85, mult: 1.8, multPer: 0.25, elem: 'fire', icon: 'explode',
               desc: 'Strijela umočena u šljivovicu, plane kad pogodi.' },
  freeze:    { name: 'Strijela s dravskog leda', req: 5, mana: 8, manaPer: 0.5, cd: 0, kind: 'freezearrow', mult: 1.5, multPer: 0.2, elem: 'cold', freeze: 1.6, icon: 'freeze',
               desc: 'Strijela koja probija i smrzava sve kroz što prođe.' },
  strafe:    { name: 'Tuča strijela', req: 9, mana: 12, manaPer: 0.6, cd: 1.5, kind: 'strafe', mult: 0.9, multPer: 0.12, icon: 'strafe',
               desc: 'Pljušti strijelama po svakom neprijatelju oko sebe.' },

  firebolt:  { name: 'Žar iz krušne peći', req: 1, mana: 3, manaPer: 0.25, cd: 0, kind: 'bolt', mult: 1.7, multPer: 0.22, elem: 'fire', icon: 'firebolt',
               desc: 'Baci užarenu žeravicu.' },
  nova:      { name: 'Siječanjski mraz', req: 2, mana: 9, manaPer: 0.5, cd: 1, kind: 'nova', radius: 190, mult: 1.2, multPer: 0.18, elem: 'cold', icon: 'nova',
               desc: 'Prsten leda koji ošteti i ohladi sve oko tebe.' },
  chain:     { name: 'Grom svetog Ilije', req: 5, mana: 12, manaPer: 0.6, cd: 0, kind: 'chain', mult: 1.5, multPer: 0.2, elem: 'light', icon: 'chain',
               desc: 'Munja koja skače s vraga na vraga. Jedan skok više svaka 3 ranga.' },
  meteor:    { name: 'Zvijezda padalica', req: 9, mana: 18, manaPer: 0.9, cd: 2, kind: 'meteor', radius: 115, mult: 4.0, multPer: 0.5, elem: 'fire', icon: 'meteor',
               desc: 'Mamica izmoli zvijezdu s neba, a zemlja ostane gorjeti.' },
};

// Monster bases at monster level 1.
D.MONSTERS = {
  zombie:   { name: 'Utopljenik', hp: 34, dmg: 6, speed: 42, cd: 1.4, range: 46, radius: 17, xp: 1.15, ai: 'melee', scale: 1.0, pack: [3, 5] },
  skeleton: { name: 'Kostur', hp: 24, dmg: 5, speed: 82, cd: 1.1, range: 46, radius: 15, xp: 1.0, ai: 'melee', scale: 1.0, pack: [3, 6] },
  archer:   { name: 'Kostur strijelac', hp: 18, dmg: 3.5, speed: 72, cd: 1.9, range: 320, radius: 15, xp: 1.1, ai: 'ranged', proj: 'arrow', scale: 1.0, pack: [2, 4] },
  fallen:   { name: 'Lisica', hp: 14, dmg: 3, speed: 105, cd: 0.9, range: 40, radius: 13, xp: 0.75, ai: 'melee', scale: 0.8, pack: [4, 7] },
  wraith:   { name: 'Mora', hp: 26, dmg: 6, speed: 112, cd: 1.1, range: 46, radius: 16, xp: 1.2, ai: 'melee', elem: 'cold', scale: 1.05, pack: [2, 4] },
  shaman:   { name: 'Coprnica', hp: 20, dmg: 5, speed: 70, cd: 2.2, range: 290, radius: 14, xp: 1.3, ai: 'ranged', proj: 'fireball', elem: 'fire', scale: 0.85, pack: [1, 2], escort: 'fallen' },
  goatman:  { name: 'Vukodlak', hp: 34, dmg: 7, speed: 88, cd: 1.2, range: 48, radius: 17, xp: 1.2, ai: 'melee', scale: 1.1, pack: [3, 5] },
  spider:   { name: 'Podrumski pauk', hp: 22, dmg: 4, speed: 128, cd: 0.9, range: 42, radius: 16, xp: 1.0, ai: 'melee', elem: 'poison', scale: 1.0, pack: [3, 5] },
  imp:      { name: 'Vražić', hp: 26, dmg: 6, speed: 92, cd: 2.6, range: 300, radius: 15, xp: 1.3, ai: 'ranged', proj: 'firebolt', elem: 'fire', scale: 0.9, pack: [2, 4] },
  knight:   { name: 'Pakleni žandar', hp: 70, dmg: 10, speed: 68, cd: 1.5, range: 54, radius: 21, xp: 2.0, ai: 'melee', scale: 1.25, pack: [1, 3] },
};

D.BOSSES = {
  gravekeeper: { name: 'Grobar Štef', art: 'gravekeeper', hp: 280, dmg: 10, speed: 82, cd: 1.5, range: 70, radius: 34, xp: 22,
                 abilities: ['charge', 'slam', 'summon'], minions: 'skeleton', title: 'Mrtvi tu ne počivaju u miru.' },
  venom:       { name: 'Coprnica Bara', art: 'venom', hp: 340, dmg: 9, speed: 92, cd: 1.4, range: 64, radius: 30, xp: 26,
                 abilities: ['spray', 'poisonNova', 'summon', 'charge'], minions: 'spider', title: 'Njezini pauki su gladni.' },
  lord:        { name: 'Crni Dudek, gospodar pakla', art: 'lord', hp: 480, dmg: 11, speed: 86, cd: 1.5, range: 74, radius: 38, xp: 40,
                 abilities: ['fireRing', 'breath', 'charge', 'summon', 'slam'], minions: 'knight', title: 'Kaj si mislil, da buš lako?' },
};

D.CHAMPION_MODS = {
  strong:   { label: 'Jako snažan' },
  fast:     { label: 'Jako brz' },
  stone:    { label: 'Kamena koža' },
  fire:     { label: 'Ognjeni' },
  cold:     { label: 'Ledeni' },
  vampire:  { label: 'Krvopija' },
};
// Champions are named after a villager and the village they haunt.
D.CHAMPION_NAMES = {
  first: ['Štef', 'Joža', 'Pepek', 'Mijo', 'Imbra', 'Bolta', 'Floriš', 'Tonček', 'Ivek', 'Đuro', 'Franjo', 'Kata', 'Roza', 'Jaga', 'Barica'],
  second: ['iz Hlebina', 's Drave', 'iz Molvi', 'iz Đelekovca', 'iz Peteranca', 'iz Legrada', 'iz Sigeca', 'iz Torčeca', 'iz Gole',
    'iz Ždale', 'iz Drnja', 's Bilogore', 'iz Virja', 'iz Đurđevca', 'iz Koprivnice'],
};

D.SHRINES = {
  armor:   { label: 'Kapelica svetog Jurja', buff: 'Obrana +100%', color: 0x88aaff },
  combat:  { label: 'Kapelica svetog Mihaela', buff: 'Šteta +50%', color: 0xff6644 },
  speed:   { label: 'Kapelica svetog Kristofora', buff: 'Brzina +30%', color: 0x66ff99 },
  mana:    { label: 'Kapelica svetog Ivana', buff: 'Obnova mane x5', color: 0x6688ff },
  exp:     { label: 'Kapelica svetog Antuna', buff: 'Iskustvo +50%', color: 0xffdd55 },
  refill:  { label: 'Kapelica Majke Božje', buff: null, color: 0xff4466 },
};

// Equipment slots and the item bases that roll in them.
D.EQUIP_SLOTS = ['helm', 'amulet', 'weapon', 'armor', 'offhand', 'gloves', 'ring1', 'ring2', 'boots'];
D.SLOT_LABEL = { helm: 'Šešir', amulet: 'Ogrlica', weapon: 'Oružje', armor: 'Lajbek', offhand: 'Druga ruka', gloves: 'Rukavice',
  ring1: 'Prsten', ring2: 'Prsten', boots: 'Čizme' };

D.ARMOR_BASES = {
  helm:   { icon: 'helm', names: ['Slamnati šešir', 'Filcani šešir', 'Šubara'], armor: 4 },
  armor:  { icon: 'armor', names: ['Lajbek', 'Kožuh', 'Kovani kožuh'], armor: 10 },
  gloves: { icon: 'gloves', names: ['Vunene rukavice', 'Kožne rukavice', 'Kovačke rukavice'], armor: 2 },
  boots:  { icon: 'boots', names: ['Opanci', 'Čizme', 'Kovane čizme'], armor: 2 },
  ring:   { icon: 'ring', names: ['Prsten', 'Prsten', 'Prsten'], armor: 0 },
  amulet: { icon: 'amulet', names: ['Medaljon', 'Krunica', 'Zlatni lančić'], armor: 0 },
};

// Affix rolls: max value at item level il; a roll lands between 40% and 100% of it.
// Magic items are named "<base> <pre> <suf>": pre is a villager in the genitive and suf an "od ..." phrase,
// so neither has to agree in gender with the base name.
D.AFFIXES = {
  str:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} Snage`, pre: 'Jakog Štefa', suf: 'od Snage' },
  dex:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} Spretnosti`, pre: 'Spretnog Pepeka', suf: 'od Spretnosti' },
  vit:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} Izdržljivosti`, pre: 'Debelog Jože', suf: 'od Izdržljivosti' },
  ene:       { max: il => 3 + il * 0.8, slots: 'any', fmt: v => `+${v} Energije`, pre: 'Mudre Mamice', suf: 'od Energije' },
  life:      { max: il => 8 + il * 3, slots: 'helm armor offhand gloves boots ring amulet', fmt: v => `+${v} Života`, pre: 'Zdravog Mije', suf: 'od Svinjokolje' },
  mana:      { max: il => 8 + il * 2.5, slots: 'helm armor offhand ring amulet weapon', fmt: v => `+${v} Mane`, pre: 'Pobožne Kate', suf: 'od Krunice' },
  dmgPct:    { max: il => 25 + il * 4, slots: 'weapon', fmt: v => `+${v}% Pojačane štete`, pre: 'Ljutog Bolte', suf: 'od Klanja' },
  dmgAll:    { max: il => 5 + il * 1.2, slots: 'gloves ring amulet offhand helm', fmt: v => `+${v}% Štete`, pre: 'Divljeg Imbre', suf: 'od Bijesa' },
  flat:      { max: il => 1 + il * 0.6, slots: 'weapon ring offhand gloves', fmt: v => `Dodaje ${v}-${v * 2} štete`, pre: 'Oštrog Ivka', suf: 'od Rezanja' },
  armorPct:  { max: il => 20 + il * 3, slots: 'helm armor offhand gloves boots', fmt: v => `+${v}% Pojačane obrane`, pre: 'Čvrstog Franje', suf: 'od Plota' },
  armorFlat: { max: il => 5 + il * 3, slots: 'helm armor offhand gloves boots ring amulet', fmt: v => `+${v} Obrane`, pre: 'Kovača Luke', suf: 'od Zaštite' },
  res:       { max: il => 6 + il * 1.3, slots: 'any', fmt: v => `Sve otpornosti +${v}%`, pre: 'Šarene Roze', suf: 'od Duge' },
  ias:       { max: il => Math.min(30, 10 + il * 0.7), slots: 'weapon gloves offhand', fmt: v => `+${v}% Brzine napada`, pre: 'Brzog Tončeka', suf: 'od Žurbe' },
  frw:       { max: il => Math.min(30, 10 + il * 0.7), slots: 'boots', fmt: v => `+${v}% Bržeg hoda`, pre: 'Hitrog Đure', suf: 'od Ceste' },
  lifeSteal: { max: il => Math.min(8, 2 + il * 0.22), slots: 'weapon ring amulet gloves', fmt: v => `${v}% Života ukradeno po udarcu`, pre: 'Gladnog Floriša', suf: 'od Pijavice' },
  mf:        { max: il => 10 + il * 1.5, slots: 'any', fmt: v => `+${v}% Nalaženja blaga`, pre: 'Sretnog Kumeka', suf: 'od Sreće' },
  crit:      { max: il => Math.min(12, 3 + il * 0.3), slots: 'weapon ring amulet gloves offhand helm', fmt: v => `+${v}% Kritičnog udarca`, pre: 'Lovca Pepeka', suf: 'od Preciznosti' },
  regen:     { max: il => 1 + il * 0.3, slots: 'armor ring amulet helm boots', fmt: v => `Obnavlja ${v} života u sekundi`, pre: 'Ozdravljenog Bartola', suf: 'od Ozdravljenja' },
  mregen:    { max: il => 1 + il * 0.25, slots: 'offhand ring amulet helm weapon', fmt: v => `Obnavlja ${v} mane u sekundi`, pre: 'Učenog Župnika', suf: 'od Molitve' },
  skills:    { max: () => 1, slots: 'amulet weapon offhand helm', fmt: v => `+${v} svim vještinama`, pre: 'Starog Majstora', suf: 'od Vjekova', rare: true },
};

// Rare items are named "<second> <first>": a noun that fits the slot, then whose it is.
D.RARE_NAMES = {
  first: ['Coprnice', 'Vukodlaka', 'Utopljenika', 'Grobara', 'Švercera', 'Kuma', 'Lovca', 'Mlinara', 'Kovača', 'Župnika', 'Drave', 'Bilogore',
    'Pakla', 'Mjeseca', 'Oluje', 'Gavrana'],
  second: { weapon: ['Zub', 'Pjesma', 'Oštrica', 'Očnjak', 'Žetelac', 'Šiljak'], helm: ['Kruna', 'Lice', 'Kapa', 'Rog'], armor: ['Oklop', 'Kaput', 'Koža', 'Plašt'],
            gloves: ['Stisak', 'Šaka', 'Ruka', 'Pandža'], boots: ['Korak', 'Trag', 'Put', 'Ostruga'], offhand: ['Štit', 'Straža', 'Obrana', 'Znak'],
            ring: ['Petlja', 'Obruč', 'Zavojnica', 'Spirala'], amulet: ['Srce', 'Oko', 'Čar', 'Talisman'] },
};

// Uniques: fixed affix sets, each value = roll max * multiplier.
D.UNIQUES = [
  { name: 'Djedove vile', slot: 'weapon', cls: 'barbarian', aff: [['dmgPct', 1.6], ['lifeSteal', 1], ['str', 1.3], ['ias', 1]] },
  { name: 'Grobareva lopata', slot: 'weapon', cls: 'barbarian', aff: [['dmgPct', 1.4], ['flat', 1.5], ['crit', 1], ['vit', 1.2]] },
  { name: 'Luk s Martinja', slot: 'weapon', cls: 'amazon', aff: [['dmgPct', 1.6], ['ias', 1], ['dex', 1.4], ['lifeSteal', 0.8]] },
  { name: 'Pakleni pljusak', slot: 'weapon', cls: 'amazon', aff: [['dmgPct', 1.3], ['crit', 1.2], ['skills', 1], ['mana', 1.2]] },
  { name: 'Žeravica iz krušne peći', slot: 'weapon', cls: 'sorceress', aff: [['dmgPct', 1.5], ['ene', 1.4], ['skills', 1], ['mregen', 1.3]] },
  { name: 'Kuhača tete Jage', slot: 'weapon', cls: 'sorceress', aff: [['dmgPct', 1.3], ['mana', 1.5], ['crit', 1.1], ['lifeSteal', 0.7]] },
  { name: 'Šešir starog Dudeka', slot: 'helm', aff: [['res', 1.2], ['life', 1.3], ['armorPct', 1.4], ['skills', 1]] },
  { name: 'Krvave šake', slot: 'gloves', aff: [['ias', 1], ['dmgAll', 1.5], ['life', 1.2], ['lifeSteal', 0.8]] },
  { name: 'Plesne čizme s proštenja', slot: 'boots', aff: [['frw', 1], ['dex', 1.5], ['armorPct', 1.3], ['res', 0.8]] },
  { name: 'Nedjeljni lajbek', slot: 'armor', aff: [['armorPct', 1.6], ['life', 1.5], ['res', 1], ['regen', 1.2]] },
  { name: 'Regičin zaručnički prsten', slot: 'ring', aff: [['mana', 1.5], ['skills', 1], ['ene', 1.2], ['mregen', 1]] },
  { name: 'Gavranov mraz', slot: 'ring', aff: [['dex', 1.5], ['crit', 1.1], ['flat', 1.3], ['life', 1]] },
  { name: 'Krunica iz Molvi', slot: 'amulet', aff: [['skills', 2], ['res', 1.4], ['str', 1], ['dex', 1]] },
  { name: 'Gnjev svetog Mihaela', slot: 'amulet', aff: [['crit', 1.2], ['dmgAll', 1.4], ['lifeSteal', 0.8], ['ias', 0.8]] },
  { name: 'Vrata od kokošinjca', slot: 'offhand', aff: [['life', 1.4], ['armorPct', 1.4], ['res', 1.2], ['mregen', 1.2]] },
];

D.POTIONS = {
  hp:   { name: 'Crno vino', icon: 'potion_red', max: 12, price: 25 },
  mp:   { name: 'Čaj od kamilice', icon: 'potion_blue', max: 12, price: 25 },
  rejuv:{ name: 'Travarica', icon: 'potion_purple', max: 6, price: 120 },
  tp:   { name: 'Karta za autobus', icon: 'scroll', max: 10, price: 40 },
};

D.xpForLevel = lvl => Math.round(45 * Math.pow(lvl, 1.75));       // xp needed to go from lvl to lvl+1
D.monsterXp = mlvl => Math.round(10 * Math.pow(mlvl, 1.3));
D.hpScale = mlvl => Math.pow(1 + 0.25 * (mlvl - 1), 1.68);
D.dmgScale = mlvl => Math.pow(1 + 0.2 * (mlvl - 1), 1.25);
D.MAX_LEVEL = 50;
