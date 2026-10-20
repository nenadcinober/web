'use strict';

// Balance tables: map sizes, difficulties, towers, enemies and the wave generator.

const TILE = 40;
const VIEW = { x: 0, y: 44, w: 800, h: 724 };
const PANEL_X = 800;
const W = 1024, H = 768;
const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
const FONT_T = 'Georgia, "Times New Roman", serif';

const SIZES = {
  mala: {
    name: 'Mala livada', desc: 'Jedan put kroz livadu kraj Gruntovca.\n25 valova · oko 15–20 minuta',
    w: 20, h: 18, waves: 25, spawn2From: 0, countMul: 1, endHp: 11, gold: 300, breakSec: 20, bossParts: 3,
  },
  srednja: {
    name: 'Srednje selo', desc: 'Duži put, a od 10. vala i drugi ulaz\ns brijega. 35 valova · oko 30 minuta',
    w: 30, h: 26, waves: 35, spawn2From: 10, countMul: 1.15, endHp: 20, gold: 340, breakSec: 25, bossParts: 4,
  },
  velika: {
    name: 'Cijela Podravina', desc: 'Velika karta s dva ulaza od 8. vala.\n50 valova · oko 45–60 minuta',
    w: 42, h: 34, waves: 50, spawn2From: 8, countMul: 1.3, endHp: 55, gold: 450, breakSec: 30, bossParts: 5,
  },
};

const DIFFS = {
  lako: { name: 'Lako', hp: 0.8, gold: 1.15, lives: 30 },
  normalno: { name: 'Normalno', hp: 1, gold: 1, lives: 20 },
  tesko: { name: 'Teško', hp: 1.25, gold: 0.9, lives: 12 },
};

// lv arrays are per level (1..4); up[i] is the price of going from level i+1 to i+2.
const TOWERS = {
  dudek: {
    name: 'Dudek', what: 'baca vile', key: '1', cost: 60, up: [70, 120, 200],
    air: true, dmgType: 'phys', proj: 'vile',
    dmg: [12, 21, 34, 54], rate: [1.2, 1.3, 1.45, 1.6], range: [130, 140, 152, 168],
    info: 'Brz i jeftin. Gađa i ptice.',
  },
  regica: {
    name: 'Regica', what: 'baca lonce', key: '2', cost: 100, up: [110, 180, 300],
    air: false, dmgType: 'phys', proj: 'lonac',
    dmg: [24, 40, 64, 100], rate: [0.6, 0.65, 0.7, 0.78], range: [120, 130, 142, 155], splash: [50, 56, 62, 72],
    info: 'Lonac pogađa sve oko sebe. Ne doseže ptice.',
  },
  mamica: {
    name: 'Mamica', what: 'kune i usporava', key: '3', cost: 90, up: [100, 160, 260],
    air: true, dmgType: 'magic', aura: true,
    dps: [3, 6, 10, 16], slow: [0.35, 0.45, 0.52, 0.6], range: [95, 105, 116, 130],
    info: 'Svi u blizini hodaju sporije od straha.',
  },
  lovec: {
    name: 'Lovec Pepek', what: 'puca iz puške', key: '4', cost: 150, up: [150, 250, 400],
    air: true, dmgType: 'phys', proj: 'metak', pierce: true, mode: 'jaki',
    dmg: [62, 112, 185, 300], rate: [0.42, 0.46, 0.5, 0.56], range: [210, 230, 252, 280],
    info: 'Daleko i jako. Probija pola oklopa.',
  },
  pcele: {
    name: 'Pčelinjak', what: 'pušta pčele', key: '5', cost: 120, up: [130, 200, 320],
    air: true, dmgType: 'magic', proj: 'pcela',
    dps: [8, 14, 23, 36], rate: [1, 1.05, 1.1, 1.2], targets: [2, 3, 3, 4], range: [120, 130, 142, 155],
    info: 'Ubodi peku 3 sekunde. Oklop ne pomaže.',
  },
  zvono: {
    name: 'Kapelica', what: 'zvono omami', key: '6', cost: 200, up: [200, 320, 500],
    air: true, dmgType: 'magic', pulse: true,
    dmg: [40, 70, 112, 175], period: [3, 2.8, 2.6, 2.3], stun: [0.3, 0.4, 0.5, 0.65], range: [110, 120, 132, 146],
    info: 'Zvono udari sve u krugu i na tren ih skameni.',
  },
};
const TOWER_ORDER = ['dudek', 'regica', 'mamica', 'lovec', 'pcele', 'zvono'];
const MODES = { prvi: 'Prvi', zadnji: 'Zadnji', jaki: 'Najjači', blizu: 'Najbliži' };
const MODE_ORDER = ['prvi', 'zadnji', 'jaki', 'blizu'];

const ENEMIES = {
  lisica: { name: 'Lisica', hp: 34, speed: 62, bounty: 6, r: 13 },
  guska: { name: 'Guska', hp: 18, speed: 74, bounty: 3, r: 11 },
  purger: { name: 'Purger na biciklu', hp: 70, speed: 58, bounty: 9, r: 14 },
  vrana: { name: 'Vrana', hp: 28, speed: 70, bounty: 7, r: 12, fly: true },
  poreznik: { name: 'Poreznik', hp: 110, speed: 42, bounty: 13, r: 14, armor: 0.45 },
  vepar: { name: 'Divlji vepar', hp: 260, speed: 34, bounty: 22, r: 17, armor: 0.2 },
  komisija: { name: 'Komisija iz grada', hp: 900, speed: 30, bounty: 120, r: 24, armor: 0.3, boss: true },
  jastreb: { name: 'Jastreb', hp: 700, speed: 44, bounty: 120, r: 22, fly: true, boss: true },
  bager: { name: 'Bager', hp: 1800, speed: 24, bounty: 200, r: 28, armor: 0.5, boss: true },
  direktor: { name: 'Drug direktor', hp: 4000, speed: 27, bounty: 0, r: 30, armor: 0.4, boss: true },
};

// [type, share of the wave's progress at which it starts appearing]
const UNLOCKS = [['lisica', 0], ['guska', 0.06], ['purger', 0.14], ['vrana', 0.2], ['poreznik', 0.28], ['vepar', 0.4]];
const BOSS_CYCLE = ['komisija', 'jastreb', 'bager', 'komisija', 'jastreb', 'bager'];

function hpMul(size, diff, w) {
  // the same early curve on every map; longer maps only grow further by the end
  const n = size.waves - 1, c = (size.endHp - 1 - 0.16 * n) / (n * n);
  return (1 + 0.16 * (w - 1) + c * (w - 1) * (w - 1)) * diff.hp;
}

function bountyMul(size, diff, w) {
  const p = (w - 1) / (size.waves - 1);
  return (1 + 1.6 * p) * diff.gold;
}

function bossWaves(size) {
  const n = size.bossParts, out = [];
  for (let k = 1; k < n; k++) out.push(Math.round(size.waves * k / n));
  out.push(size.waves);
  return out;
}

// A wave is a list of groups that spawn one after another; each group is one enemy type from one entrance.
function makeWave(size, w, rnd) {
  const p = (w - 1) / (size.waves - 1);
  const unlocked = UNLOCKS.filter(u => u[1] <= p + 1e-6).map(u => u[0]);
  const twoGates = size.spawn2From && w >= size.spawn2From;
  const budget = (8 + p * 24) * size.countMul * 34;
  const gap = 0.95 - p * 0.45;
  const groups = [];
  const bosses = bossWaves(size);
  const bi = bosses.indexOf(w);
  let title = null;

  const add = (type, share, gate) => {
    const e = ENEMIES[type];
    const count = Math.max(1, Math.round(budget * share / e.hp * (type === 'guska' ? 1.3 : 1)));
    groups.push({ type, count, gap: gap * (e.hp > 150 ? 1.8 : type === 'guska' ? 0.55 : 1), gate });
  };
  const gateFor = i => (twoGates ? i % 2 : 0);

  if (w === size.waves) {
    title = 'Zadnji val: Drug direktor!';
    unlocked.forEach((t, i) => add(t, 0.35, gateFor(i)));
    groups.push({ type: 'direktor', count: 1, gap: 1, gate: 0, boss: true });
    if (twoGates) groups.push({ type: 'bager', count: 1, gap: 1, gate: 1, boss: true });
  } else if (bi >= 0) {
    const boss = BOSS_CYCLE[bi % BOSS_CYCLE.length];
    title = ENEMIES[boss].name + ' dolazi!';
    add(unlocked[unlocked.length - 1], 0.5, 0);
    groups.push({ type: boss, count: 1, gap: 1, gate: 0, boss: true });
    if (twoGates) add(unlocked[Math.max(0, unlocked.length - 2)], 0.5, 1);
  } else if (unlocked.includes('vrana') && w % 6 === 4) {
    title = 'Jato vrana!';
    add('vrana', 0.8, 0);
    if (twoGates) add('vrana', 0.5, 1);
  } else if (unlocked.includes('poreznik') && w % 7 === 5) {
    title = 'Porezna kontrola!';
    add('poreznik', 0.8, 0);
    if (twoGates) add('poreznik', 0.5, 1);
  } else if (unlocked.includes('guska') && w % 9 === 2) {
    title = 'Guske su pobjegle!';
    add('guska', 0.9, 0);
    if (twoGates) add('guska', 0.6, 1);
  } else {
    // mostly the newest kinds, with a tail of older ones
    const n = Math.min(unlocked.length, 1 + Math.floor(rnd() * 3));
    const pool = unlocked.slice().reverse();
    const picks = [];
    for (let i = 0; i < n; i++) {
      const j = Math.min(pool.length - 1, Math.floor(Math.pow(rnd(), 1.6) * pool.length));
      picks.push(pool.splice(j, 1)[0]);
    }
    picks.forEach((t, i) => add(t, 1 / n, gateFor(i)));
    if (twoGates && picks.length === 1) add(picks[0], 0.5, 1);
  }
  return { groups, title, boss: bi >= 0 };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEASONS = [
  { name: 'Proljeće', grass: '#8cc45a', grass2: '#76b04a', dirt: '#b98a55' },
  { name: 'Ljeto', grass: '#a8c84e', grass2: '#93b542', dirt: '#c49a5c' },
  { name: 'Jesen', grass: '#b0a24c', grass2: '#9b8a3e', dirt: '#9c6b40' },
  { name: 'Zima', grass: '#eef2f6', grass2: '#dde6ee', dirt: '#a88d78' },
];

function seasonFor(size, w) {
  return Math.min(3, Math.floor((w - 1) / size.waves * 4));
}
