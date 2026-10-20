'use strict';

// Online play over WebRTC (PeerJS). GitHub Pages can't host a WebSocket server, so the free
// PeerJS cloud server is used only to find the other player; after that the two browsers talk
// directly over a data channel.
//
// Matchmaking needs no server of our own: everyone tries to register the same well-known
// "lobby" peer id. Whoever gets it waits there; the next visitor finds the id taken and
// connects to it instead. As soon as the pair connects, the waiting player drops the id
// (disconnect() keeps the data channel open), so the next visitor can claim the lobby.
// The lobby holder hosts the match and runs the authoritative simulation.

const Net = {
  peer: null,
  conn: null,
  active: false,
  playing: false,
  h: {},            // handlers: status(text), ready(role), fail(text), data(msg), close()

  start(room) {
    this.leave();
    this.room = room;
    this.lobbyId = 'cinober-bubble-volley-v1-' + (room || 'public');
    this.active = true;
    this.claim();
  },

  emit(name, ...args) { if (this.h[name]) this.h[name](...args); },

  claim() {
    if (!this.active) return;
    this.emit('status', 'Connecting to matchmaking…');
    const peer = this.peer = new Peer(this.lobbyId, { debug: 0 });
    peer.on('open', () => this.emit('status', this.room
      ? 'Room is open — waiting for your friend…'
      : 'Waiting for an opponent…\nOpen this page in another browser, or send it to a friend.'));
    peer.on('connection', c => {
      if (this.conn) {
        c.on('open', () => { c.send({ t: 'busy' }); setTimeout(() => c.close(), 300); });
        return;
      }
      this.conn = c;
      const to = setTimeout(() => { if (this.conn === c && !this.playing) { c.close(); this.conn = null; } }, 10000);
      c.on('open', () => {
        clearTimeout(to);
        c.send({ t: 'hello' });
        peer.disconnect();
        this.ready('host', c);
      });
    });
    peer.on('error', e => {
      if (peer !== this.peer || this.playing) return;
      if (e.type === 'unavailable-id') { peer.destroy(); this.join(); }
      else this.fail(e);
    });
  },

  join() {
    if (!this.active) return;
    this.emit('status', 'Found a waiting player — connecting…');
    const peer = this.peer = new Peer({ debug: 0 });
    peer.on('open', () => {
      const c = peer.connect(this.lobbyId, { serialization: 'json', reliable: true });
      const to = setTimeout(() => { if (!this.playing) this.retry(); }, 10000);
      c.on('data', d => {
        if (this.playing) return;
        if (d.t === 'busy') { clearTimeout(to); this.retry(); }
        else if (d.t === 'hello') { clearTimeout(to); this.ready('guest', c); }
      });
    });
    peer.on('error', e => {
      if (peer !== this.peer || this.playing) return;
      if (e.type === 'peer-unavailable') this.retry();
      else this.fail(e);
    });
  },

  // the lobby changed hands while we were connecting: start over
  retry() {
    if (!this.active || this.playing) return;
    if (this.peer) this.peer.destroy();
    this.peer = null; this.conn = null;
    setTimeout(() => this.claim(), 600 + Math.random() * 900);
  },

  ready(role, c) {
    this.playing = true;
    this.role = role;
    this.conn = c;
    c.on('data', d => { if (d.t !== 'hello' && d.t !== 'busy') this.emit('data', d); });
    c.on('close', () => this.lost());
    c.on('error', () => this.lost());
    // the game loop stops in a background tab; this keeps telling the other side we're here
    this.beat = setInterval(() => this.send({ t: 'p' }), 1000);
    this.emit('ready', role);
  },

  lost() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.beat);
    this.emit('close');
  },

  fail(e) {
    this.active = false;
    this.emit('fail', 'Could not reach the matchmaking server (' + (e.type || e) + ').');
  },

  send(d) { if (this.conn && this.conn.open) this.conn.send(d); },

  leave() {
    this.active = false;
    this.playing = false;
    clearInterval(this.beat);
    try { if (this.conn) this.conn.close(); } catch (e) { /* already closed */ }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* already destroyed */ }
    this.conn = null; this.peer = null;
  },
};
