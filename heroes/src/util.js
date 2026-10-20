// Shared helpers: screen size, seeded RNG, hex-grid maths and small utilities.
const VW = 1024, VH = 768;
const FONT = '"Alegreya Sans", "Trebuchet MS", sans-serif';
const TFONT = '"Cinzel", Georgia, serif';

class RNG {
    constructor(seed) { this.s = (seed >>> 0) || 1; }
    next() {
        let t = (this.s += 0x6D2B79F5) >>> 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    real(a, b) { return a + this.next() * (b - a); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    weighted(pairs) { // [[item, weight], ...]
        let tot = 0; for (const p of pairs) tot += p[1];
        let r = this.next() * tot;
        for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
        return pairs[pairs.length - 1][0];
    }
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
        return arr;
    }
}

// Gameplay randomness (combat rolls, level-ups); map generation uses its own seeded RNG.
const R = new RNG(Date.now() ^ 0x5bd1e995);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.round(n).toLocaleString('en-US');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const deepCopy = o => JSON.parse(JSON.stringify(o));

// Combat hex grid: 15 columns x 11 rows, odd rows shifted half a hex to the right.
const Hex = {
    COLS: 15, ROWS: 11,
    valid(r, c) { return r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS; },
    key(r, c) { return r * this.COLS + c; },
    rc(k) { return [Math.floor(k / this.COLS), k % this.COLS]; },
    neighbors(r, c) {
        const odd = r & 1, out = [];
        const d = odd ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
                      : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
        for (const [dr, dc] of d) { const nr = r + dr, nc = c + dc; if (this.valid(nr, nc)) out.push([nr, nc]); }
        return out;
    },
    cube(r, c) { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; },
    dist(r1, c1, r2, c2) {
        const a = this.cube(r1, c1), b = this.cube(r2, c2);
        return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    },
};

// A coarse descriptor of a stack size, as the adventure map shows to the player.
function stackWord(n) {
    if (n < 5) return 'A few'; if (n < 10) return 'Several'; if (n < 20) return 'A pack of';
    if (n < 50) return 'Lots of'; if (n < 100) return 'A horde of'; if (n < 250) return 'A throng of';
    if (n < 500) return 'A swarm of'; if (n < 1000) return 'Zounds of'; return 'A legion of';
}
function stackRange(n) {
    if (n < 5) return '1-4'; if (n < 10) return '5-9'; if (n < 20) return '10-19'; if (n < 50) return '20-49';
    if (n < 100) return '50-99'; if (n < 250) return '100-249'; if (n < 500) return '250-499'; if (n < 1000) return '500-999';
    return '1000+';
}
