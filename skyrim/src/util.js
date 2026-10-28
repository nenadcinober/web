// Shared constants, small helpers, seeded noise and the save state.
const W = 1024, H = 768, TS = 32;
const FONT = '"Alegreya Sans", Georgia, serif';
const TITLE_FONT = 'Cinzel, Georgia, serif';
const SAVE_KEY = 'skyrim.save.v1';

let S = null;   // the save state, plain JSON
let G = null;   // the running GameScene
let UI = null;  // the running UIScene

function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function hash2(x, y, s) { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) {
    let t = 0, amp = 0.5, f = 1;
    for (let i = 0; i < 4; i++) { t += amp * vnoise(x * f, y * f, s + i * 13); amp *= 0.5; f *= 2; }
    return t / 0.9375;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
function angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}
const tilePx = t => t * TS + TS / 2;

function newState() {
    return {
        v: 1, level: 1, xp: 0, lvlPending: 0,
        hpMax: 100, mpMax: 100, spMax: 100, hp: 100, mp: 100, sp: 100,
        gold: 40, arrows: 0,
        inv: { iron_sword: 1, hide_armor: 1, potion_hp: 2, sweetroll: 1 },
        weapon: 'iron_sword', armor: 'hide_armor', bow: null, hand: 'sword',
        spells: ['flames', 'healing'], spell: 0,
        words: {}, shouts: {}, souls: 0,
        q: 0, f: { claw: 0, bounty: 0 },
        killed: {}, opened: {}, found: {}, flags: {},
        map: 'world', x: tilePx(28), y: tilePx(84), time: 8 * 60,
        intro: false, kills: 0,
    };
}
const xpNeed = lvl => 60 + lvl * 45;

function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
function loadSave() {
    try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (s && s.v === 1) return Object.assign(newState(), s);
    } catch (e) { /* storage blocked or corrupt */ }
    return null;
}
function hasSave() { return !!loadSave(); }
