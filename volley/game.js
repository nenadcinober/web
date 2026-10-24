'use strict';

const COLORS = [0xe8453c, 0x2f7de1];
const FONT = '"Trebuchet MS", Verdana, sans-serif';
const STEP_MS = 1000 / 60;

const Sfx = {
  ctx: null,
  tone(freq, dur, type, vol, delay = 0) {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* no audio */ }
  },
  play(e) {
    if (e === 'hit') this.tone(480 + Math.random() * 120, 0.1, 'sine', 0.3);
    else if (e === 'net') this.tone(170, 0.08, 'square', 0.06);
    else if (e === 'point') { this.tone(660, 0.12, 'triangle', 0.2); this.tone(880, 0.16, 'triangle', 0.2, 0.1); }
    else if (e === 'win') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.13));
  },
};

function makeTextures(scene) {
  const g = scene.make.graphics({ add: false });

  // beach ball: six alternating panels with a white cap
  const panels = [0xffffff, 0xf7c21a, 0xffffff, 0xe8453c, 0xffffff, 0x2f7de1];
  const c = BR + 2;
  panels.forEach((col, i) => {
    g.fillStyle(col);
    g.slice(c, c, BR, i * Math.PI / 3, (i + 1) * Math.PI / 3, false);
    g.fillPath();
  });
  g.fillStyle(0xffffff); g.fillCircle(c, c, BR * 0.28);
  g.lineStyle(2, 0x1d2b3a); g.strokeCircle(c, c, BR);
  g.fillStyle(0xffffff, 0.45); g.fillEllipse(c - 8, c - 9, 12, 7);
  g.generateTexture('ball', c * 2, c * 2);
  g.clear();

  // blobs: half-circles with a shine
  COLORS.forEach((col, i) => {
    const o = R + 3;
    g.fillStyle(col);
    g.slice(o, o, R, Math.PI, 0, false);
    g.fillPath();
    g.lineStyle(3, 0x1d2b3a);
    g.beginPath(); g.arc(o, o, R, Math.PI, 0, false); g.closePath(); g.strokePath();
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(i === 0 ? o - 18 : o + 18, o - R * 0.62, 26, 12);
    g.generateTexture('blob' + i, o * 2, o + 3);
    g.clear();
  });

  g.fillStyle(0xffffff, 0.9);
  [[40, 40, 34], [80, 30, 40], [120, 42, 30], [70, 52, 36]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
  g.generateTexture('cloud', 160, 90);
  g.destroy();
}

function drawBeach(scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x2f8fe8, 0x2f8fe8, 0xbfe6ff, 0xbfe6ff, 1);
  g.fillRect(0, 0, W, GROUND - 70);
  g.fillStyle(0xfff3a0, 0.35); g.fillCircle(840, 120, 92);
  g.fillStyle(0xffe55c); g.fillCircle(840, 120, 62);
  g.fillGradientStyle(0x1c6fb8, 0x1c6fb8, 0x46b6e0, 0x46b6e0, 1);
  g.fillRect(0, GROUND - 70, W, 70);
  g.lineStyle(3, 0xffffff, 0.5);
  for (let x = -20; x < W; x += 90) {
    g.beginPath(); g.arc(x + 45, GROUND - 6, 28, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
  }
  g.fillStyle(0xf3d58a); g.fillRect(0, GROUND, W, H - GROUND);
  g.fillStyle(0xe7c06c); g.fillRect(0, GROUND, W, 5);
  for (let i = 0; i < 160; i++) {
    g.fillStyle(i % 2 ? 0xe2b862 : 0xfbe4a6);
    g.fillCircle((i * 97) % W, GROUND + 12 + ((i * 53) % (H - GROUND - 16)), 2);
  }
  const clouds = [[120, 90, 1], [470, 60, 0.7], [700, 190, 0.8], [300, 220, 0.55]].map(([x, y, s]) =>
    scene.add.image(x, y, 'cloud').setScale(s).setAlpha(0.85));

  // net: a post with a rounded top
  const n = scene.add.graphics().setDepth(3);
  n.fillStyle(0x1d2b3a); n.fillRoundedRect(NET_X - NET_HALF - 2, NET_TOP - NET_HALF - 2, NET_HALF * 2 + 4, GROUND - NET_TOP + NET_HALF + 4, NET_HALF + 2);
  n.fillStyle(0xf4f4f4); n.fillRoundedRect(NET_X - NET_HALF, NET_TOP - NET_HALF, NET_HALF * 2, GROUND - NET_TOP + NET_HALF, NET_HALF);
  n.fillStyle(0xe8453c);
  for (let y = NET_TOP + 14; y < GROUND - 10; y += 34) n.fillRect(NET_X - NET_HALF, y, NET_HALF * 2, 12);
  return clouds;
}

function readTouch(scene) {
  const t = { l: 0, r: 0, j: 0 };
  for (const p of scene.input.manager.pointers) {
    if (!p.isDown || !p.wasTouch) continue;
    if (p.y < H - 220) continue;
    if (p.x < 150) t.l = 1; else if (p.x < 300) t.r = 1; else if (p.x > W - 260) t.j = 1;
  }
  return t;
}

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    makeTextures(this);
    this.scene.start('game', { mode: 'demo' });
    this.scene.launch('menu');
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) { this.mode = data.mode || 'demo'; this.level = data.level || 'normal'; }

  create() {
    this.clouds = drawBeach(this);
    this.sim = new Sim();
    this.acc = 0;
    this.tick = 0;
    this.pending = [];
    this.remote = { l: 0, r: 0, j: 0 };
    this.lastSent = '';
    this.lastRecv = performance.now();
    this.off = [0, 0, 0, 0, 0, 0];
    this.ended = false;
    this.ai = this.mode === 'demo' ? [new Ai('normal'), new Ai('normal')] : [null, new Ai(this.level)];

    this.fx = this.add.graphics().setDepth(2);
    this.blobs = [0, 1].map(i => this.add.image(0, 0, 'blob' + i).setOrigin(0.5, (R + 3) / (R + 6)).setDepth(4));
    this.eyes = this.add.graphics().setDepth(5);
    this.ballImg = this.add.image(0, 0, 'ball').setDepth(6);

    const names = {
      demo: ['', ''], cpu: ['YOU', 'CPU'], local: ['PLAYER 1', 'PLAYER 2'],
      'online-host': ['YOU', 'RIVAL'], 'online-guest': ['RIVAL', 'YOU'],
    }[this.mode];
    this.names = names;
    const hud = this.mode !== 'demo';
    const style = { fontFamily: FONT, fontSize: '72px', fontStyle: 'bold', color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 8 };
    this.scoreTxt = [
      this.add.text(W * 0.25, 18, '0', style).setOrigin(0.5, 0).setDepth(10).setVisible(hud),
      this.add.text(W * 0.75, 18, '0', style).setOrigin(0.5, 0).setDepth(10).setVisible(hud),
    ];
    const small = { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 5 };
    const shown = this.mode === 'cpu' ? [names[0], names[1] + ' · ' + AI_LEVELS[this.level].label] : names;
    shown.forEach((n, i) => this.add.text(W * (i ? 0.75 : 0.25), 104, n, small).setOrigin(0.5, 0).setDepth(10).setVisible(hud));
    this.msg = this.add.text(W / 2, 250, '', { ...style, fontSize: '44px', align: 'center', strokeThickness: 7 })
      .setOrigin(0.5).setDepth(10);
    const help = {
      cpu: 'Move: A / D or ← / →   Jump: W, ↑ or Space   Esc: menu',
      local: 'Player 1: A / D, W to jump     Player 2: ← / →, ↑ to jump     Esc: menu',
      'online-host': 'Move: A / D or ← / →   Jump: W, ↑ or Space   Esc: leave',
      'online-guest': 'Move: A / D or ← / →   Jump: W, ↑ or Space   Esc: leave',
    }[this.mode];
    if (help) this.add.text(W / 2, H - 30, help, { ...small, fontSize: '18px', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);

    this.keys = this.input.keyboard.addKeys('A,D,W,LEFT,RIGHT,UP,SPACE,ENTER,ESC');
    if (hud) this.keys.ESC.on('down', () => this.toMenu());

    if (hud && this.sys.game.device.input.touch) {
      this.input.addPointer(2);
      const b = { fontFamily: FONT, fontSize: '40px', color: '#ffffff' };
      [[75, '◀'], [225, '▶'], [W - 130, 'JUMP']].forEach(([x, label]) => {
        this.add.circle(x, H - 110, 62, 0x000000, 0.18).setDepth(9);
        this.add.text(x, H - 110, label, label === 'JUMP' ? { ...b, fontSize: '26px' } : b).setOrigin(0.5).setDepth(9).setAlpha(0.8);
      });
    }

    if (this.mode.startsWith('online')) {
      Net.h = {
        data: d => this.onNet(d),
        close: () => this.opponentLeft(),
      };
      if (this.mode === 'online-guest') this.msg.setText('Connected!');
    }
    this.events.once('shutdown', () => { if (Net.h.data) Net.h = {}; });
  }

  toMenu() {
    Net.leave();
    this.scene.restart({ mode: 'demo' });
    this.scene.launch('menu');
  }

  opponentLeft() {
    if (this.ended) return;
    this.ended = true;
    Net.leave();
    this.msg.setText('Your opponent left the game');
    this.time.delayedCall(2500, () => this.toMenu());
  }

  onNet(d) {
    this.lastRecv = performance.now();
    if (d.t === 'i' && this.mode === 'online-host') this.applyGuest(d);
    else if (d.t === 's' && this.mode === 'online-guest') this.applySnapshot(d);
  }

  // steps of network delay that a message has to be run forward by
  lag() { return Math.min(12, Math.round(Net.rtt / 2 / STEP_MS)); }

  positions() {
    const s = this.sim;
    return [s.ball.x, s.ball.y, s.p[0].x, s.p[0].y, s.p[1].x, s.p[1].y];
  }

  // keep drawing where things were and let the error fade out, instead of snapping
  smooth(before) {
    this.positions().forEach((v, k) => {
      const diff = before[k] - v;
      this.off[k] = Math.abs(diff) < 120 ? this.off[k] + diff : 0;
    });
  }

  // The guest's blob belongs to the guest, so its own controls never lag: take the position it
  // reports and run it forward over the network delay with its keys. Between reports the host
  // keeps moving it with the last keys it got.
  applyGuest(d) {
    this.remote = d;
    const s = this.sim, p = s.p[1];
    if (d.rd !== s.round) return;           // sent before the last point reset the blobs
    const before = this.positions(), cd = p.cd;
    [p.x, p.y, p.vx, p.vy] = d.pos;
    for (let n = this.lag(); n > 0; n--) s.movePlayer(p, d, 1);
    p.cd = cd;
    this.smooth(before);
  }

  applySnapshot(d) {
    const s = this.sim, me = s.p[1];
    const before = this.positions(), mine = [me.x, me.y, me.vx, me.vy];
    const sameRally = d.rd === s.round;
    s.load(d);
    if (sameRally) [me.x, me.y, me.vx, me.vy] = mine;
    s.catchUp(this.lag());
    this.smooth(before);
    // hits and the net are heard as they happen locally; the score comes from the host
    (d.ev || []).forEach(e => { if (e === 'point' || e === 'win') Sfx.play(e); });
  }

  keysP1() { const k = this.keys; return { l: k.A.isDown, r: k.D.isDown, j: k.W.isDown || k.SPACE.isDown }; }
  keysP2() { const k = this.keys; return { l: k.LEFT.isDown, r: k.RIGHT.isDown, j: k.UP.isDown || k.ENTER.isDown }; }
  keysAny() {
    const a = this.keysP1(), b = this.keysP2(), t = readTouch(this);
    return { l: a.l || b.l || t.l ? 1 : 0, r: a.r || b.r || t.r ? 1 : 0, j: a.j || b.j || t.j ? 1 : 0 };
  }

  step() {
    const s = this.sim;
    let inp, humanJump = false;
    switch (this.mode) {
      case 'demo': inp = [this.ai[0].input(s, 0), this.ai[1].input(s, 1)]; break;
      case 'cpu': inp = [this.keysAny(), this.ai[1].input(s, 1)]; humanJump = inp[0].j; break;
      case 'local': {
        const t = readTouch(this);
        const a = this.keysP1();
        inp = [{ l: a.l || t.l, r: a.r || t.r, j: a.j || t.j }, this.keysP2()];
        humanJump = inp[0].j || inp[1].j;
        break;
      }
      case 'online-host': inp = [this.keysAny(), this.remote]; humanJump = inp[0].j || this.remote.j; break;
      case 'online-guest': {
        const o = s.p[0];
        inp = [{ l: o.vx < 0, r: o.vx > 0, j: 0 }, this.keysAny()];
        break;
      }
    }

    const auth = this.mode !== 'online-guest';
    s.step(inp, auth);
    if (auth) {
      if (this.mode !== 'demo') s.events.forEach(e => Sfx.play(e));
      this.pending.push(...s.events);
    } else {
      s.events.forEach(e => { if (e === 'hit' || e === 'net') Sfx.play(e); });
      // report where our blob is after this step, along with the keys that keep it moving
      const me = inp[1], p = s.p[1], key = me.l + '' + me.r + me.j;
      if (key !== this.lastSent || this.tick % 2 === 0) {
        const q = v => Math.round(v * 100) / 100;
        Net.send({ t: 'i', l: me.l, r: me.r, j: me.j, pos: [p.x, p.y, p.vx, p.vy].map(q), rd: s.round });
        this.lastSent = key;
      }
    }
    s.events = [];

    if (auth && s.state === 'over' && s.timer < -60 && (humanJump || this.mode === 'demo')) {
      this.sim = new Sim();
    }
    if (this.mode === 'online-host' && this.tick % 2 === 0) {
      Net.send({ ...this.sim.snapshot(), ev: this.pending });
      this.pending = [];
    }
    this.tick++;
  }

  update(time, delta) {
    this.acc += Math.min(delta, 100);
    while (this.acc >= STEP_MS) { this.step(); this.acc -= STEP_MS; }
    if (this.mode.startsWith('online') && !this.ended && performance.now() - this.lastRecv > 10000) this.opponentLeft();
    for (const c of this.clouds) { c.x += 0.15 * c.scale; if (c.x > W + 100) c.x = -100; }
    this.draw();
  }

  draw() {
    const s = this.sim, o = this.off, g = this.fx, e = this.eyes;
    for (let k = 0; k < 6; k++) o[k] *= 0.8;
    const bx = s.ball.x + o[0], by = s.ball.y + o[1];
    g.clear(); e.clear();

    for (let i = 0; i < 2; i++) {
      const p = s.p[i], x = p.x + o[2 + i * 2], y = p.y + o[3 + i * 2];
      const h = GROUND - y;
      g.fillStyle(0x000000, 0.2 * (1 - h / 400));
      g.fillEllipse(x, GROUND + 6, R * 2 * (1 - h / 700), 14);

      const sy = 1 + Phaser.Math.Clamp(-p.vy * 0.012, -0.12, 0.18);
      this.blobs[i].setPosition(x, y).setScale(1 - (sy - 1) * 0.6, sy);

      // the eye sits on the side facing the net and watches the ball
      const ex = x + (i === 0 ? 1 : -1) * R * 0.38, ey = y - R * 0.62 * sy;
      const a = Math.atan2(by - ey, bx - ex);
      e.fillStyle(0xffffff); e.fillCircle(ex, ey, 12);
      e.lineStyle(2, 0x1d2b3a); e.strokeCircle(ex, ey, 12);
      e.fillStyle(0x1d2b3a); e.fillCircle(ex + Math.cos(a) * 5, ey + Math.sin(a) * 5, 5.5);
    }

    const bh = GROUND - BR - by;
    g.fillStyle(0x000000, Math.max(0.05, 0.22 * (1 - bh / 600)));
    g.fillEllipse(bx, GROUND + 6, BR * 2 * Math.max(0.4, 1 - bh / 800), 10);
    this.ballImg.setPosition(bx, by).setRotation(s.ball.spin);

    if (this.mode === 'demo') return;

    this.scoreTxt[0].setText(s.score[0]);
    this.scoreTxt[1].setText(s.score[1]);
    if (s.state === 'play' && s.touches > 0) {
      const cx = W * (s.side ? 0.75 : 0.25);
      for (let t = 0; t < MAX_TOUCHES; t++) {
        g.fillStyle(t < s.touches ? 0xffffff : 0x000000, t < s.touches ? 0.95 : 0.2);
        g.fillCircle(cx + (t - 1) * 22, 146, 7);
      }
    }

    if (this.ended) return;
    let m = '';
    if (s.state === 'ready' && s.score[0] + s.score[1] === 0) m = 'First to ' + WIN_SCORE + '!';
    else if (s.state === 'point') m = this.names[s.server] + (this.names[s.server] === 'YOU' ? ' score!' : ' scores!');
    else if (s.state === 'over') {
      const who = this.names[s.winner];
      m = (who === 'YOU' ? 'YOU WIN!' : who + ' WINS!') + '\n' + s.score[0] + ' : ' + s.score[1];
      if (s.timer < -60) m += '\n\nJump for a rematch · Esc for menu';
    }
    if (this.msg.text !== m && !(m === '' && this.msg.text === 'Connected!' && this.tick < 90)) this.msg.setText(m);
  }
}

function button(scene, y, label, cb) {
  const bg = scene.add.rectangle(W / 2, y, 560, 66, 0x1d2b3a, 0.82).setStrokeStyle(3, 0xffffff, 0.8)
    .setInteractive({ useHandCursor: true });
  const t = scene.add.text(W / 2, y, label, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
  bg.on('pointerover', () => bg.setFillStyle(0xe8453c, 0.95));
  bg.on('pointerout', () => bg.setFillStyle(0x1d2b3a, 0.82));
  bg.on('pointerup', cb);
  return [bg, t];
}

function roomFromUrl() {
  const r = new URLSearchParams(location.search).get('room');
  return r && /^[a-z0-9]{3,16}$/i.test(r) ? r.toLowerCase() : null;
}

let autoJoined = false;

class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create(data) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d2b4a, 0.35);
    this.add.text(W / 2, 140, 'BUBBLE VOLLEY', {
      fontFamily: FONT, fontSize: '96px', fontStyle: 'bold', color: '#ffe55c', stroke: '#1d2b3a', strokeThickness: 12,
    }).setOrigin(0.5);
    this.add.text(W / 2, 222, 'beach volleyball with blobs — like the 90s arcade classic', {
      fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 5,
    }).setOrigin(0.5);

    const pick = data && data.pick;
    const opts = pick ? [
      ...Object.entries(AI_LEVELS).map(([k, lv], i) =>
        [(i + 1) + '   ' + lv.label[0] + lv.label.slice(1).toLowerCase(), () => this.scene.start('game', { mode: 'cpu', level: k })]),
      ['Esc   Back', () => this.scene.restart({})],
    ] : [
      ['1   Play vs Computer', () => this.scene.restart({ pick: true })],
      ['2   Online — random opponent', () => this.scene.start('lobby', { room: null })],
      ['3   Online — private room', () => this.privateRoom()],
      ['4   Two players, one keyboard', () => this.scene.start('game', { mode: 'local' })],
    ];
    opts.forEach(([label, cb], i) => {
      button(this, 320 + i * 86, label, cb);
      this.input.keyboard.once('keydown-' + (pick && i === 3 ? 'ESC' : ['ONE', 'TWO', 'THREE', 'FOUR'][i]), cb);
    });
    this.add.text(W / 2, 690, pick ? 'Choose how good the computer is'
      : 'Three touches per side · first to 15, win by 2 · the scorer serves', {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 4,
    }).setOrigin(0.5);
    if (pick) return;

    const room = roomFromUrl();
    if (room && !autoJoined) {
      autoJoined = true;
      this.time.delayedCall(0, () => this.scene.start('lobby', { room }));
    }
  }

  privateRoom() {
    const code = Math.random().toString(36).slice(2, 8);
    history.replaceState(null, '', location.pathname + '?room=' + code);
    this.scene.start('lobby', { room: code });
  }
}

class LobbyScene extends Phaser.Scene {
  constructor() { super('lobby'); }

  init(data) { this.room = data.room; }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d2b4a, 0.55);
    this.add.rectangle(W / 2, H / 2, 760, 420, 0x1d2b3a, 0.92).setStrokeStyle(4, 0xffe55c);
    const txt = { fontFamily: FONT, fontSize: '26px', color: '#ffffff', align: 'center', wordWrap: { width: 680 } };
    this.add.text(W / 2, 220, this.room ? 'PRIVATE ROOM' : 'ONLINE MATCH', { ...txt, fontSize: '40px', fontStyle: 'bold', color: '#ffe55c' }).setOrigin(0.5);
    this.status = this.add.text(W / 2, 330, '', txt).setOrigin(0.5);

    if (this.room) {
      const link = location.origin + location.pathname + '?room=' + this.room;
      const l = this.add.text(W / 2, 430, link, { ...txt, fontSize: '22px', color: '#8fd3ff' }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const hint = this.add.text(W / 2, 470, 'Click the link to copy it and send it to a friend', { ...txt, fontSize: '18px', color: '#cccccc' }).setOrigin(0.5);
      l.on('pointerup', () => {
        if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => hint.setText('Copied!'), () => {});
      });
    }
    const back = this.add.text(W / 2, 540, 'Esc — back to menu', { ...txt, fontSize: '20px', color: '#cccccc' }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.cancel());
    this.input.keyboard.once('keydown-ESC', () => this.cancel());

    Net.h = {
      status: s => this.status.setText(s),
      fail: s => this.status.setText(s + '\n\nYou can still play against the computer.'),
      ready: role => this.scene.start('game', { mode: 'online-' + role }),
    };
    Net.start(this.room);
  }

  cancel() {
    Net.leave();
    Net.h = {};
    if (this.room) history.replaceState(null, '', location.pathname);
    this.scene.start('menu');
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0d3b66',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene, MenuScene, LobbyScene],
});
