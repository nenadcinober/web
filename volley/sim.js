'use strict';

// Pure game simulation, stepped at a fixed 60 Hz. No Phaser in here, so the host and the
// guest of an online match run exactly the same rules.

const W = 1024, H = 768, GROUND = 690;
const NET_X = W / 2, NET_HALF = 7, NET_TOP = GROUND - 175;
const R = 50, BR = 24;                       // blob radius, ball radius
const P_SPEED = 6.5, P_GRAV = 0.95, P_JUMP = -18.5;
const B_GRAV = 0.3, B_MAX = 17, B_MIN_KICK = 9;
const WIN_SCORE = 15, MAX_TOUCHES = 3;
const START_X = 210;

class Sim {
  constructor() {
    this.score = [0, 0];
    this.server = Math.random() < 0.5 ? 0 : 1;
    this.winner = -1;
    this.aiErr = [0, 0];
    this.events = [];
    this.round = 0;
    this.reset();
    this.timer = 100;
  }

  reset() {
    this.ball = { x: this.server === 0 ? START_X : W - START_X, y: 300, vx: 0, vy: 0, spin: 0 };
    this.p = [0, 1].map(i => ({ x: i === 0 ? START_X : W - START_X, y: GROUND, vx: 0, vy: 0, cd: 0 }));
    this.side = this.server;
    this.touches = 0;
    this.state = 'ready';
    this.timer = 45;
    this.round++;
  }

  // inp: [{l, r, j}, {l, r, j}]; {hold: true} leaves that blob where it is. Only the authority
  // (host / offline game) awards points; the guest just predicts motion until the next snapshot.
  step(inp, auth) {
    for (let i = 0; i < 2; i++) {
      if (inp[i].hold) { if (this.p[i].cd > 0) this.p[i].cd--; }
      else this.movePlayer(this.p[i], inp[i], i);
    }
    const b = this.ball;
    if (this.state === 'ready') {
      if (--this.timer <= 0) this.state = 'play';
    } else if (this.state === 'play') {
      this.moveBall(auth);
    } else {
      // after a point the ball just bounces out on the sand
      b.vy += B_GRAV; b.x += b.vx; b.y += b.vy; b.spin += b.vx * 0.04;
      if (b.y > GROUND - BR) { b.y = GROUND - BR; b.vy *= -0.45; b.vx *= 0.85; }
      this.walls(b);
      this.timer--;
      if (auth && this.state === 'point' && this.timer <= 0) this.reset();
    }
  }

  movePlayer(p, k, i) {
    p.vx = ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * P_SPEED;
    if (k.j && p.y >= GROUND) p.vy = P_JUMP;
    p.vy += P_GRAV;
    p.y += p.vy;
    if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; }
    p.x += p.vx;
    const lo = i === 0 ? R : NET_X + NET_HALF + R;
    const hi = i === 0 ? NET_X - NET_HALF - R : W - R;
    if (p.x < lo) p.x = lo;
    if (p.x > hi) p.x = hi;
    if (p.cd > 0) p.cd--;
  }

  walls(b) {
    if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); }
    else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
  }

  moveBall(auth) {
    const b = this.ball;
    b.vy += B_GRAV;
    b.x += b.vx; b.y += b.vy;
    b.spin += b.vx * 0.04;
    this.walls(b);
    if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); }

    // the net is a capsule: a vertical segment with a rounded top
    const cy = Math.max(NET_TOP, Math.min(GROUND, b.y));
    let dx = b.x - NET_X, dy = b.y - cy, d = Math.hypot(dx, dy);
    if (d < BR + NET_HALF) {
      if (d < 0.001) { dx = b.vx > 0 ? -1 : 1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d;
      b.x = NET_X + nx * (BR + NET_HALF);
      b.y = cy + ny * (BR + NET_HALF);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny;
        this.events.push('net');
      }
    }

    const side = b.x < NET_X ? 0 : 1;
    if (side !== this.side) { this.side = side; this.touches = 0; }

    for (let i = 0; i < 2; i++) {
      const p = this.p[i];
      if (b.y > p.y + 4) continue;           // blobs are half-circles: nothing below the base
      dx = b.x - p.x; dy = b.y - p.y; d = Math.hypot(dx, dy);
      if (d >= R + BR || d < 0.001) continue;
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * (R + BR);
      b.y = p.y + ny * (R + BR);
      // bounce in the blob's frame of reference, so a moving or jumping blob drives the ball
      let rx = b.vx - p.vx, ry = b.vy - p.vy;
      const vn = rx * nx + ry * ny;
      if (vn < 0) { rx -= 2 * vn * nx; ry -= 2 * vn * ny; }
      b.vx = rx + p.vx; b.vy = ry + p.vy;
      const out = b.vx * nx + b.vy * ny;
      if (out < B_MIN_KICK) { b.vx += (B_MIN_KICK - out) * nx; b.vy += (B_MIN_KICK - out) * ny; }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > B_MAX) { b.vx *= B_MAX / sp; b.vy *= B_MAX / sp; }

      if (p.cd <= 0) {
        p.cd = 12;
        if (this.side !== i) { this.side = i; this.touches = 0; }
        this.touches++;
        this.aiErr[i] = (Math.random() - 0.5) * 16;
        this.events.push('hit');
        if (auth && this.touches > MAX_TOUCHES) { this.point(1 - i); return; }
      }
    }

    if (b.y >= GROUND - BR) {
      b.y = GROUND - BR;
      if (auth) this.point(b.x < NET_X ? 1 : 0);
      else b.vy *= -0.45;
    }
  }

  point(w) {
    this.score[w]++;
    this.server = w;
    this.state = 'point';
    this.timer = 80;
    this.events.push('point');
    if (this.score[w] >= WIN_SCORE && this.score[w] - this.score[1 - w] >= 2) {
      this.state = 'over';
      this.winner = w;
      this.timer = 90;
      this.events.push('win');
    }
  }

  snapshot() {
    const b = this.ball, [a, c] = this.p, q = v => Math.round(v * 100) / 100;
    return {
      t: 's',
      b: [b.x, b.y, b.vx, b.vy].map(q),
      p: [a.x, a.y, a.vx, a.vy, c.x, c.y, c.vx, c.vy].map(q),
      sc: this.score, st: this.state, tm: this.timer, sd: this.side, tc: this.touches,
      sv: this.server, w: this.winner, rd: this.round,
    };
  }

  load(d) {
    const b = this.ball;
    [b.x, b.y, b.vx, b.vy] = d.b;
    [this.p[0].x, this.p[0].y, this.p[0].vx, this.p[0].vy,
     this.p[1].x, this.p[1].y, this.p[1].vx, this.p[1].vy] = d.p;
    this.score = d.sc; this.state = d.st; this.timer = d.tm; this.side = d.sd;
    this.touches = d.tc; this.server = d.sv; this.winner = d.w; this.round = d.rd;
  }

  // Guest only: a snapshot is about half a round trip old by the time it arrives. Run the ball
  // and the host's blob forward n steps to the present, against the guest's blob as it is now,
  // so a ball the guest has already hit doesn't jump back to before the hit.
  catchUp(n) {
    const cds = this.p.map(p => p.cd), events = this.events, h = this.p[0];
    for (; n > 0; n--) this.step([{ l: h.vx < 0, r: h.vx > 0, j: 0 }, { hold: true }], false);
    this.p.forEach((p, i) => { p.cd = cds[i]; });
    this.events = events;
  }
}

// think: steps between re-plans (a slower reaction); err: how much of the per-touch aim error
// it keeps; sloppy: random noise on how it rates each spot, so it sometimes picks a worse shot;
// speed: share of steps it actually moves on; sharp: aim where the opponent can't get to in time.
const AI_LEVELS = {
  easy:   { label: 'EASY', think: 14, err: 3, sloppy: 650, speed: 0.7, sharp: false },
  normal: { label: 'NORMAL', think: 1, err: 0.5, sloppy: 0, speed: 1, sharp: false },
  hard:   { label: 'HARD', think: 1, err: 0, sloppy: 0, speed: 1, sharp: true },
};

class Ai {
  constructor(level) {
    this.lv = AI_LEVELS[level] || AI_LEVELS.normal;
    this.n = 0;
    this.plan = null;
  }

  input(s, side) {
    const lv = this.lv, p = s.p[side];
    let jump = 0;
    if (!this.plan || this.n % lv.think === 0) { this.plan = aiPlan(s, side, lv); jump = this.plan.jump; }
    this.n++;
    // a slow blob only steps on some ticks
    if (lv.speed < 1 && (this.n % 10) >= lv.speed * 10) return { l: 0, r: 0, j: jump };
    const dx = this.plan.target - p.x;
    return { l: dx < -3 ? 1 : 0, r: dx > 3 ? 1 : 0, j: jump };
  }
}

// Computer player. It simulates the incoming ball, tries every spot its blob could reach in
// time, works out where the ball would fly after bouncing off the blob there, and stands on
// the spot whose bounce clears the net and lands farthest from the opponent. When nothing
// clears the net it sets the ball up high near the net for the next touch instead.
function aiPlan(s, side, lv) {
  const p = s.p[side], b = s.ball, toNet = side === 0 ? 1 : -1;
  const opp = s.p[1 - side];
  const home = side === 0 ? START_X + 20 : W - START_X - 20;
  const lo = side === 0 ? R : NET_X + NET_HALF + R, hi = side === 0 ? NET_X - NET_HALF - R : W - R;
  const mine = x => (x - NET_X) * toNet < 0;
  let target = home, jump = 0;

  if (s.state === 'play' || s.state === 'ready') {
    // path of the ball until it reaches the sand, ignoring the blobs
    const path = [];
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
    if (s.state === 'ready') path.push([x, y, vx, vy]);
    for (let n = 0; n < 240 && y < GROUND - BR; n++) {
      const px = x;
      if (s.state === 'play' || n > 0) { vy += B_GRAV; x += vx; y += vy; }
      if (x < BR) { x = BR; vx = -vx; } else if (x > W - BR) { x = W - BR; vx = -vx; }
      if ((px - NET_X) * (x - NET_X) <= 0 && y > NET_TOP - BR) { x = px; vx = -vx * 0.8; }
      path.push([x, y, vx, vy]);
    }

    const third = s.side === side && s.touches >= MAX_TOUCHES - 1;
    let best = -Infinity;
    for (let bx = lo; bx <= hi; bx += 4) {
      const t = path.findIndex(([qx, qy]) => qy <= GROUND + 4 && mine(qx) && Math.hypot(qx - bx, qy - GROUND) < R + BR);
      if (t < 0 || Math.abs(bx - p.x) > P_SPEED * lv.speed * (t + 1) + 4) continue;
      const score = rateHit(path[t], bx, side, opp.x, third, lv.sharp) + Math.random() * lv.sloppy;
      if (score > best) { best = score; target = bx; }
    }
    if (best === -Infinity) {
      // can't reach any contact: at least chase where it lands
      const land = path[path.length - 1][0];
      if (mine(land)) target = land;
    } else {
      target += s.aiErr[side] * lv.err;
    }

    const nearNet = Math.abs(b.x - NET_X) < 150;
    if (mine(b.x) && nearNet && Math.abs(b.x - p.x) < 60 && b.vy > -2 &&
        b.y < GROUND - 170 && b.y > GROUND - 300) jump = 1;
  }

  return { target, jump };
}

// How good is it to meet ball state q with a standing blob at bx? Mirrors Sim.moveBall's bounce.
// A sharp player rates a shot by how far the opponent would still be from it when it lands.
function rateHit([x, y, vx, vy], bx, side, oppX, third, sharp) {
  const toNet = side === 0 ? 1 : -1;
  const d = Math.hypot(x - bx, y - GROUND), nx = (x - bx) / d, ny = (y - GROUND) / d;
  const vn = vx * nx + vy * ny;
  if (vn < 0) { vx -= 2 * vn * nx; vy -= 2 * vn * ny; }
  const out = vx * nx + vy * ny;
  if (out < B_MIN_KICK) { vx += (B_MIN_KICK - out) * nx; vy += (B_MIN_KICK - out) * ny; }
  const sp = Math.hypot(vx, vy);
  if (sp > B_MAX) { vx *= B_MAX / sp; vy *= B_MAX / sp; }
  x = bx + nx * (R + BR); y = GROUND + ny * (R + BR);

  let over = false, n = 0;
  for (; n < 300 && y < GROUND - BR; n++) {
    const px = x;
    vy += B_GRAV; x += vx; y += vy;
    if (y < BR) { y = BR; vy = Math.abs(vy); }
    if (x < BR) { x = BR; vx = -vx; } else if (x > W - BR) { x = W - BR; vx = -vx; }
    if ((px - NET_X) * (x - NET_X) <= 0) {
      if (y > NET_TOP - BR - 6) return -1000;      // into the net
      over = true;
    }
  }
  if (over && (x - NET_X) * toNet > 0) return 1000 + (sharp ? Math.max(-400, Math.abs(x - oppX) - P_SPEED * n) : Math.abs(x - oppX));
  if (third) return -500;
  // set it up: high and landing close to the net on our side
  return 500 - Math.abs(x - (NET_X - toNet * 110));
}
