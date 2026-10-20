'use strict';

// Procedural art: every texture (tiles, heroes, monsters, effects, item and skill icons) is drawn on a canvas at startup.

const Art = D.Art = {
  iconURL: {},

  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  },

  add(scene, key, c) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, c);
  },

  generateAll(scene) {
    for (const t of ['crypt', 'caves', 'hell', 'town']) this.add(scene, 'ts_' + t, this.tileset(t));
    for (const [key, o] of Object.entries(HEROES)) this.figureSet(scene, key, o, 1);
    for (const [key, o] of Object.entries(MONSTER_ART)) this.figureSet(scene, 'm_' + key, o, 1);
    for (const [key, o] of Object.entries(BOSS_ART)) this.figureSet(scene, 'b_' + key, o, 2);
    this.add(scene, 'npc_merchant', this.figure(NPCS.merchant, 0, 1));
    this.add(scene, 'npc_healer', this.figure(NPCS.healer, 0, 1));
    this.objects(scene);
    this.effects(scene);
    for (const name of ICON_NAMES) {
      const c = this.icon(name);
      this.add(scene, 'icon_' + name, c);
      this.iconURL[name] = c.toDataURL();
    }
  },

  figureSet(scene, key, o, scale) {
    for (let f = 0; f < 4; f++) this.add(scene, `${key}_${f}`, this.figure(o, f, scale));
  },

  // ---------- tiles ----------
  tileset(theme) {
    const T = D.TILE, c = this.canvas(T * 8, T), ctx = c.getContext('2d');
    const rng = D.makeRng(theme.length * 977 + 13);
    const P = PALETTES[theme];
    for (let i = 0; i < 4; i++) this.floorTile(ctx, i * T, P, rng, i, theme);
    // wall top
    ctx.fillStyle = P.top; ctx.fillRect(4 * T, 0, T, T);
    speckle(ctx, 4 * T, 0, T, T, rng, ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.25)'], 40, 3);
    // wall face
    this.wallFace(ctx, 5 * T, P, rng, theme);
    // void
    ctx.fillStyle = '#000'; ctx.fillRect(6 * T, 0, T, T);
    // lava
    this.lavaTile(ctx, 7 * T, rng);
    return c;
  },

  floorTile(ctx, x0, P, rng, variant, theme) {
    const T = D.TILE;
    ctx.fillStyle = P.floor[variant % P.floor.length];
    ctx.fillRect(x0, 0, T, T);
    if (theme === 'crypt' || theme === 'hell') {
      // flagstones
      const rows = [[0, 0, 24, 24], [24, 0, 24, 24], [0, 24, 24, 24], [24, 24, 24, 24]];
      if (variant === 1) rows.splice(0, 2, [0, 0, 48, 24]);
      if (variant === 2) rows.splice(2, 2, [0, 24, 16, 24], [16, 24, 32, 24]);
      for (const [x, y, w, h] of rows) {
        const shade = rng.range(-14, 14);
        ctx.fillStyle = shadeHex(P.floor[0], shade);
        ctx.fillRect(x0 + x + 1, y + 1, w - 2, h - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x0 + x + 1, y + 1, w - 2, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x0 + x + 1, y + h - 3, w - 2, 2);
      }
      ctx.strokeStyle = P.seam; ctx.lineWidth = 1;
      for (const [x, y, w, h] of rows) ctx.strokeRect(x0 + x + 0.5, y + 0.5, w - 1, h - 1);
      speckle(ctx, x0, 0, T, T, rng, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.05)'], 30, 2);
      if (variant === 3) {
        if (theme === 'hell') {
          ctx.strokeStyle = '#ff5a10'; ctx.lineWidth = 1.5; ctx.shadowColor = '#ff3000'; ctx.shadowBlur = 6;
          crack(ctx, x0 + 8, 10, rng, 5);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(90,10,10,0.55)';
          blob(ctx, x0 + 26, 28, 10, rng);
          bones(ctx, x0 + 12, 14, rng);
        }
      }
    } else if (theme === 'caves') {
      speckle(ctx, x0, 0, T, T, rng, ['rgba(0,0,0,0.22)', 'rgba(255,230,180,0.06)', P.seam], 70, 3);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = rng.chance(0.5) ? 'rgba(120,100,80,0.5)' : 'rgba(30,20,10,0.5)';
        ctx.beginPath(); ctx.ellipse(x0 + rng.range(4, 44), rng.range(4, 44), rng.range(2, 4), rng.range(1.5, 3), 0, 0, 7); ctx.fill();
      }
      if (variant === 3) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; crack(ctx, x0 + 6, 8, rng, 5); bones(ctx, x0 + 26, 30, rng); }
    } else {
      // town: grass with dirt patches
      speckle(ctx, x0, 0, T, T, rng, ['#4f5d32', '#36411f', '#5a6a3a'], 90, 2);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = rng.chance(0.5) ? '#62743c' : '#2f3a1b'; ctx.lineWidth = 1;
        const gx = x0 + rng.range(2, 46), gy = rng.range(4, 46);
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + rng.range(-2, 2), gy - rng.range(3, 6)); ctx.stroke();
      }
      if (variant >= 2) {
        ctx.fillStyle = 'rgba(90,70,45,0.6)';
        blob(ctx, x0 + 24, 24, variant === 3 ? 16 : 9, rng);
        speckle(ctx, x0 + 10, 10, 28, 28, rng, ['rgba(140,120,90,0.5)'], 12, 2);
      }
    }
  },

  wallFace(ctx, x0, P, rng, theme) {
    const T = D.TILE;
    ctx.fillStyle = P.face[0]; ctx.fillRect(x0, 0, T, T);
    if (theme === 'town') {
      for (let i = 0; i < 4; i++) {
        const lx = x0 + i * 12;
        const g = ctx.createLinearGradient(lx, 0, lx + 12, 0);
        g.addColorStop(0, '#7a5530'); g.addColorStop(0.5, '#5e3f20'); g.addColorStop(1, '#3a2512');
        ctx.fillStyle = g; ctx.fillRect(lx + 1, 4, 10, T - 4);
        ctx.fillStyle = '#7a5530';
        ctx.beginPath(); ctx.moveTo(lx + 1, 6); ctx.lineTo(lx + 6, 0); ctx.lineTo(lx + 11, 6); ctx.fill();
      }
      ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x0, 18, T, 3); ctx.fillRect(x0, 34, T, 3);
    } else if (theme === 'caves') {
      const g = ctx.createLinearGradient(0, 0, 0, T);
      g.addColorStop(0, P.face[0]); g.addColorStop(1, P.face[1]);
      ctx.fillStyle = g; ctx.fillRect(x0, 0, T, T);
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = rng.chance(0.5) ? 'rgba(0,0,0,0.3)' : 'rgba(255,220,170,0.08)';
        ctx.beginPath(); ctx.ellipse(x0 + rng.range(4, 44), rng.range(6, 42), rng.range(5, 11), rng.range(3, 7), rng.range(0, 3), 0, 7); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; crack(ctx, x0 + 10, 4, rng, 6);
    } else {
      // bricks
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 12 : 0;
        for (let col = -1; col < 3; col++) {
          const bx = x0 + col * 24 + off, by = row * 12;
          ctx.fillStyle = shadeHex(P.face[rng.int(0, 1)], rng.range(-10, 10));
          const cx = Math.max(bx + 1, x0), cw = Math.min(bx + 23, x0 + T) - cx;
          if (cw > 0) {
            ctx.fillRect(cx, by + 1, cw, 10);
            ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(cx, by + 1, cw, 2);
          }
        }
      }
      if (theme === 'hell') {
        ctx.strokeStyle = 'rgba(255,80,20,0.7)'; ctx.lineWidth = 1; ctx.shadowColor = '#f40'; ctx.shadowBlur = 5;
        crack(ctx, x0 + 20, 6, rng, 5); ctx.shadowBlur = 0;
      }
    }
    // top lip and bottom shadow for depth
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, 0, T, 2);
    const sh = ctx.createLinearGradient(0, T - 10, 0, T);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = sh; ctx.fillRect(x0, T - 10, T, 10);
  },

  lavaTile(ctx, x0, rng) {
    const T = D.TILE;
    const g = ctx.createRadialGradient(x0 + 24, 24, 4, x0 + 24, 24, 34);
    g.addColorStop(0, '#ffcf40'); g.addColorStop(0.5, '#ff6a10'); g.addColorStop(1, '#a01c04');
    ctx.fillStyle = g; ctx.fillRect(x0, 0, T, T);
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = 'rgba(80,10,0,0.55)';
      ctx.beginPath(); ctx.ellipse(x0 + rng.range(4, 44), rng.range(4, 44), rng.range(4, 9), rng.range(2, 5), rng.range(0, 3), 0, 7); ctx.fill();
    }
    speckle(ctx, x0, 0, T, T, rng, ['rgba(255,255,180,0.7)'], 10, 2);
  },

  // ---------- figures ----------
  figure(o, frame, scale) {
    const W = (o.w || 64), H = (o.h || 80);
    const c = this.canvas(W * scale, H * scale), ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.kind === 'spider') drawSpider(ctx, o, frame);
    else if (o.kind === 'wraith') drawWraith(ctx, o, frame);
    else drawHumanoid(ctx, o, frame);
    return c;
  },

  // ---------- world objects ----------
  objects(scene) {
    let c, ctx;
    // stairs down: a dark pit with steps
    c = this.canvas(96, 96); ctx = c.getContext('2d');
    ctx.fillStyle = '#2a2420'; roundRect(ctx, 6, 10, 84, 78, 8); ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = shadeHex('#5a5048', -i * 9);
      ctx.fillRect(14 + i * 3, 18 + i * 11, 68 - i * 6, 9);
    }
    const pit = ctx.createLinearGradient(0, 30, 0, 88);
    pit.addColorStop(0, 'rgba(0,0,0,0)'); pit.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = pit; ctx.fillRect(10, 20, 76, 68);
    ctx.strokeStyle = '#141010'; ctx.lineWidth = 4; roundRect(ctx, 6, 10, 84, 78, 8); ctx.stroke();
    this.add(scene, 'stairs_down', c);
    // stairs up
    c = this.canvas(96, 96); ctx = c.getContext('2d');
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = shadeHex('#7a7068', -(5 - i) * 10);
      ctx.fillRect(14 + (5 - i) * 2, 14 + i * 12, 68 - (5 - i) * 4, 11);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(14 + (5 - i) * 2, 14 + i * 12, 68 - (5 - i) * 4, 2);
    }
    ctx.fillStyle = 'rgba(255,240,200,0.12)'; ctx.fillRect(14, 4, 68, 12);
    this.add(scene, 'stairs_up', c);
    // seal (blocks stairs until boss dies)
    c = this.canvas(96, 96); ctx = c.getContext('2d');
    ctx.strokeStyle = '#ff3a20'; ctx.lineWidth = 3; ctx.shadowColor = '#f00'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(48, 48, 38, 0, 7); ctx.stroke();
    star(ctx, 48, 48, 34, 5); ctx.stroke();
    this.add(scene, 'seal', c);
    // chest
    for (const open of [false, true]) {
      c = this.canvas(48, 40); ctx = c.getContext('2d');
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(6, 16, 36, 20);
      ctx.fillStyle = '#7a5228'; ctx.fillRect(6, 16, 36, 4);
      if (open) {
        ctx.fillStyle = '#100804'; ctx.fillRect(8, 14, 32, 6);
        ctx.fillStyle = '#6a4420'; ctx.fillRect(6, 2, 36, 10);
      } else {
        ctx.fillStyle = '#6a4420'; roundRect(ctx, 6, 6, 36, 12, 5); ctx.fill();
      }
      ctx.fillStyle = '#b8902a'; ctx.fillRect(6, open ? 2 : 6, 4, open ? 34 : 30); ctx.fillRect(38, open ? 2 : 6, 4, open ? 34 : 30);
      ctx.fillRect(21, open ? 10 : 15, 6, 7);
      ctx.strokeStyle = '#1a0e04'; ctx.lineWidth = 2; ctx.strokeRect(6, open ? 2 : 6, 36, open ? 34 : 30);
      this.add(scene, open ? 'chest_open' : 'chest', c);
    }
    // shrine
    for (const used of [false, true]) {
      c = this.canvas(48, 72); ctx = c.getContext('2d');
      ctx.fillStyle = '#4a4a52'; ctx.fillRect(10, 60, 28, 10);
      const g = ctx.createLinearGradient(14, 0, 34, 0);
      g.addColorStop(0, '#6a6a74'); g.addColorStop(1, '#2a2a30');
      ctx.fillStyle = g; ctx.fillRect(14, 18, 20, 44);
      ctx.fillStyle = '#5a5a64'; ctx.fillRect(10, 14, 28, 6);
      if (!used) {
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(24, 9, 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(22, 26, 4, 24); ctx.fillRect(18, 32, 12, 4);
      }
      this.add(scene, used ? 'shrine_used' : 'shrine', c);
    }
    // waypoint: rune circle on the floor
    c = this.canvas(96, 64); ctx = c.getContext('2d');
    ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.ellipse(48, 32, 44, 28, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6ab0ff'; ctx.lineWidth = 2; ctx.shadowColor = '#3a8aff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(48, 32, 38, 23, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(48, 32, 26, 15, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      ctx.fillStyle = '#9ad0ff'; ctx.fillRect(48 + Math.cos(a) * 32 - 2, 32 + Math.sin(a) * 19 - 2, 4, 4);
    }
    this.add(scene, 'waypoint', c);
    // town portal
    c = this.canvas(64, 96); ctx = c.getContext('2d');
    let pg = ctx.createRadialGradient(32, 50, 2, 32, 50, 34);
    pg.addColorStop(0, '#e8f4ff'); pg.addColorStop(0.35, '#5aa0ff'); pg.addColorStop(0.8, '#1a3aa0'); pg.addColorStop(1, 'rgba(10,20,80,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(32, 50, 26, 42, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(200,230,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(32, 50, 24, 40, 0, 0, 7); ctx.stroke();
    this.add(scene, 'portal', c);
    // stash
    c = this.canvas(64, 52); ctx = c.getContext('2d');
    ctx.fillStyle = '#4a2c12'; ctx.fillRect(4, 14, 56, 32);
    ctx.fillStyle = '#6a4420'; roundRect(ctx, 4, 4, 56, 16, 6); ctx.fill();
    ctx.fillStyle = '#c8a040'; ctx.fillRect(4, 20, 56, 4); ctx.fillRect(28, 16, 8, 12);
    ctx.strokeStyle = '#1a0e04'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 56, 42);
    this.add(scene, 'stash', c);
    // fountain / well
    c = this.canvas(80, 72); ctx = c.getContext('2d');
    ctx.fillStyle = '#5a5a60'; ctx.beginPath(); ctx.ellipse(40, 46, 36, 20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a5a9a'; ctx.beginPath(); ctx.ellipse(40, 44, 28, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,0.5)'; ctx.beginPath(); ctx.ellipse(34, 40, 10, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a6a70'; ctx.fillRect(36, 8, 8, 34);
    ctx.fillStyle = '#8ac0ff'; ctx.beginPath(); ctx.arc(40, 8, 6, 0, 7); ctx.fill();
    this.add(scene, 'fountain', c);
    // tree
    c = this.canvas(96, 120); ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2412'; ctx.fillRect(42, 70, 12, 46);
    for (const [x, y, r, col] of [[48, 54, 34, '#1e3014'], [34, 62, 24, '#24381a'], [62, 60, 24, '#203416'], [48, 36, 26, '#2a4220'], [40, 46, 16, '#34502a']]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    this.add(scene, 'tree', c);
    // tent for the encampment
    c = this.canvas(128, 96); ctx = c.getContext('2d');
    ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(8, 90); ctx.lineTo(64, 10); ctx.lineTo(120, 90); ctx.fill();
    ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.moveTo(64, 10); ctx.lineTo(120, 90); ctx.lineTo(80, 90); ctx.fill();
    ctx.fillStyle = '#1a0e06'; ctx.beginPath(); ctx.moveTo(52, 90); ctx.lineTo(64, 48); ctx.lineTo(76, 90); ctx.fill();
    this.add(scene, 'tent', c);
    // campfire
    c = this.canvas(48, 40); ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2412'; ctx.fillRect(8, 28, 32, 6); ctx.fillRect(14, 24, 20, 6);
    const fg = ctx.createRadialGradient(24, 22, 1, 24, 20, 16);
    fg.addColorStop(0, '#fff6a0'); fg.addColorStop(0.5, '#ff8a20'); fg.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(10, 30); ctx.quadraticCurveTo(24, -6, 38, 30); ctx.fill();
    this.add(scene, 'campfire', c);
    // torch (wall sconce)
    c = this.canvas(16, 32); ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(6, 14, 4, 16);
    const tg = ctx.createRadialGradient(8, 10, 1, 8, 10, 8);
    tg.addColorStop(0, '#fff6c0'); tg.addColorStop(0.5, '#ff9020'); tg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(8, 10, 8, 0, 7); ctx.fill();
    this.add(scene, 'torch', c);
  },

  // ---------- effects ----------
  effects(scene) {
    let c, ctx, g;
    c = this.canvas(64, 64); ctx = c.getContext('2d');
    g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    this.add(scene, 'glow', c);

    c = this.canvas(12, 12); ctx = c.getContext('2d');
    g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 12, 12);
    this.add(scene, 'spark', c);

    c = this.canvas(34, 8); ctx = c.getContext('2d');
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(28, 4); ctx.stroke();
    ctx.fillStyle = '#d0d4dc'; ctx.beginPath(); ctx.moveTo(34, 4); ctx.lineTo(27, 0); ctx.lineTo(27, 8); ctx.fill();
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(0, 1, 6, 2); ctx.fillRect(0, 5, 6, 2);
    this.add(scene, 'arrow', c);

    c = this.canvas(20, 10); ctx = c.getContext('2d');
    ctx.fillStyle = '#d8f4ff'; ctx.beginPath(); ctx.moveTo(20, 5); ctx.lineTo(8, 0); ctx.lineTo(0, 5); ctx.lineTo(8, 10); ctx.fill();
    this.add(scene, 'shard', c);

    c = this.canvas(128, 128); ctx = c.getContext('2d');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(64, 64, 54, 0, 7); ctx.stroke();
    this.add(scene, 'ring', c);

    c = this.canvas(48, 18); ctx = c.getContext('2d');
    g = ctx.createRadialGradient(24, 9, 0, 24, 9, 24);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.scale(1, 0.375); ctx.beginPath(); ctx.arc(24, 24, 24, 0, 7); ctx.fill();
    this.add(scene, 'shadow', c);

    c = this.canvas(56, 32); ctx = c.getContext('2d');
    const br = D.makeRng(5);
    ctx.fillStyle = 'rgba(100,8,8,0.8)'; blob(ctx, 28, 16, 12, br);
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(28 + br.range(-24, 24), 16 + br.range(-12, 12), br.range(1.5, 4), 0, 7); ctx.fill(); }
    this.add(scene, 'blood', c);

    c = this.canvas(40, 40); ctx = c.getContext('2d');
    g = ctx.createRadialGradient(16, 16, 2, 20, 20, 18);
    g.addColorStop(0, '#9a7050'); g.addColorStop(1, '#2a1408');
    ctx.fillStyle = g; blob(ctx, 20, 20, 15, D.makeRng(9));
    this.add(scene, 'rock', c);

    // darkness mask: opaque everywhere except a soft hole in the middle
    c = this.canvas(512, 512); ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
    ctx.globalCompositeOperation = 'destination-out';
    g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.4, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.9, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    this.add(scene, 'darkness', c);
  },

  // ---------- icons ----------
  icon(name) {
    const c = this.canvas(48, 48), ctx = c.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const fn = ICONS[name];
    if (fn) fn(ctx);
    return c;
  },
};

// ---------- palettes ----------
const PALETTES = {
  crypt: { floor: ['#3d3c43', '#38373e', '#423f47', '#3a3940'], seam: '#18171c', top: '#121116', face: ['#4c4a54', '#3e3c46'] },
  caves: { floor: ['#4a3a2a', '#453524', '#4f3f2e', '#433322'], seam: '#2a1f15', top: '#160f09', face: ['#5e4a34', '#3a2a1a'] },
  hell:  { floor: ['#3a1c18', '#341814', '#40201b', '#2e1410'], seam: '#100403', top: '#0c0404', face: ['#3e2424', '#2c1616'] },
  town:  { floor: ['#46532b', '#4a5830', '#45522a', '#4a562e'], seam: '#2a3218', top: '#1a1208', face: ['#5a3f22', '#3a2812'] },
};

// ---------- drawing helpers ----------
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)),
    b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function speckle(ctx, x, y, w, h, rng, colors, n, size) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const s = rng.range(1, size);
    ctx.fillRect(x + rng.range(0, w - s), y + rng.range(0, h - s), s, s);
  }
}
function blob(ctx, x, y, r, rng) {
  ctx.beginPath();
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, rr = r * rng.range(0.6, 1.15);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}
function crack(ctx, x, y, rng, n) {
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 0; i < n; i++) { x += rng.range(2, 8); y += rng.range(2, 8) * (rng.chance(0.2) ? -0.3 : 1); ctx.lineTo(x, y); }
  ctx.stroke();
}
function bones(ctx, x, y, rng) {
  ctx.strokeStyle = '#b8b0a0'; ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const a = rng.range(0, 3), l = rng.range(5, 9);
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.fillStyle = '#c8c0b0'; ctx.beginPath(); ctx.arc(x + 6, y + 5, 3.5, 0, 7); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star(ctx, x, y, r, n) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / n) * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}
function limb(ctx, x1, y1, x2, y2, w, col) {
  ctx.strokeStyle = '#0d0906'; ctx.lineWidth = w + 3;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function circle(ctx, x, y, r, fill, outline) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 2.5; ctx.stroke(); }
  ctx.fillStyle = fill; ctx.fill();
}

function drawWeapon(ctx, kind, hx, hy, angle, o) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(angle);
  const metal = o.weapCol || '#c8ccd4';
  if (kind === 'sword') {
    limb(ctx, 0, 0, 0, -26, 3.5, metal);
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(-6, -3, 12, 3);
  } else if (kind === 'axe') {
    limb(ctx, 0, 6, 0, -24, 2.5, '#6a4a2a');
    ctx.fillStyle = metal; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(14, -26, 13, -12); ctx.quadraticCurveTo(8, -14, 0, -14); ctx.fill(); ctx.stroke();
  } else if (kind === 'cleaver') {
    limb(ctx, 0, 6, 0, -8, 3, '#5a3a1a');
    ctx.fillStyle = metal; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-3, -36, 16, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(120,0,0,0.6)'; ctx.fillRect(5, -30, 7, 16);
  } else if (kind === 'mace') {
    limb(ctx, 0, 4, 0, -20, 2.5, '#6a4a2a');
    circle(ctx, 0, -22, 6, metal, '#0d0906');
  } else if (kind === 'spear') {
    limb(ctx, 0, 10, 0, -30, 2, '#6a4a2a');
    ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(-3.5, -29); ctx.lineTo(3.5, -29); ctx.fill();
  } else if (kind === 'staff') {
    limb(ctx, 0, 16, 0, -28, 2.5, '#5a3a20');
    ctx.shadowColor = o.glow || '#7ab0ff'; ctx.shadowBlur = 10;
    circle(ctx, 0, -31, 4.5, o.glow || '#9ad0ff');
    ctx.shadowBlur = 0;
  } else if (kind === 'bow') {
    ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-8, 0, 20, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-8, 0, 20, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-8 + Math.cos(-1.1) * 20, Math.sin(-1.1) * 20); ctx.lineTo(-8 + Math.cos(1.1) * 20, Math.sin(1.1) * 20); ctx.stroke();
  } else if (kind === 'claws') {
    ctx.strokeStyle = metal; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * 4, -9); ctx.stroke(); }
  }
  ctx.restore();
}

function drawHumanoid(ctx, o, frame) {
  const cx = 32, hunch = o.hunch || 0, bw = o.bw || 18;
  const swing = frame === 1 ? 5 : frame === 2 ? -5 : 0;
  const atk = frame === 3;
  const legTop = 54, shoulderY = 34 + hunch, headY = 22 + hunch * 1.4;
  const bob = frame === 1 || frame === 2 ? 1 : 0;
  ctx.translate(0, bob);

  if (o.wings) {
    ctx.fillStyle = o.wings; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx, shoulderY + 2);
      ctx.lineTo(cx + s * 30, shoulderY - 18); ctx.lineTo(cx + s * 28, shoulderY + 4); ctx.lineTo(cx + s * 22, shoulderY + 2);
      ctx.lineTo(cx + s * 20, shoulderY + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (o.spiderLegs) {
    ctx.strokeStyle = '#1a0a1a'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
      const yy = 44 + i * 5, k = (i + (frame % 2)) % 2 ? 3 : -3;
      ctx.beginPath(); ctx.moveTo(cx, yy); ctx.lineTo(cx + s * 22, yy - 10 + k); ctx.lineTo(cx + s * 30, yy + 18); ctx.stroke();
    }
  }
  if (o.cape) {
    ctx.fillStyle = o.cape; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - bw / 2 - 1, shoulderY); ctx.lineTo(cx + bw / 2 + 1, shoulderY);
    ctx.lineTo(cx + bw / 2 + 6 - swing * 0.4, 68); ctx.lineTo(cx - bw / 2 - 6 - swing * 0.4, 68); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (o.tail) limb(ctx, cx - 4, legTop, cx - 18, legTop + 10 - swing, 3, o.skin);

  // back arm
  const armW = o.armW || 5;
  limb(ctx, cx - bw / 2 + 1, shoulderY + 2, cx - bw / 2 - 3 + swing * 0.6, shoulderY + 17, armW, o.sleeve || o.skin);

  // legs
  if (!o.robe) {
    const lw = o.legW || 6;
    limb(ctx, cx - 4, legTop, cx - 4 - swing, 73, lw, o.legs);
    limb(ctx, cx + 4, legTop, cx + 4 + swing, 73, lw, o.legs);
    if (o.boots) {
      ctx.fillStyle = o.boots;
      ctx.fillRect(cx - 4 - swing - 4, 70, 8, 5); ctx.fillRect(cx + 4 + swing - 4, 70, 8, 5);
    }
  }

  // torso
  const tg = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
  tg.addColorStop(0, shadeHex(o.body, 25)); tg.addColorStop(1, shadeHex(o.body, -25));
  ctx.fillStyle = tg; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2.5;
  if (o.robe) {
    ctx.beginPath(); ctx.moveTo(cx - bw / 2, shoulderY - 1); ctx.lineTo(cx + bw / 2, shoulderY - 1);
    ctx.lineTo(cx + bw / 2 + 7, 75); ctx.lineTo(cx - bw / 2 - 7, 75); ctx.closePath(); ctx.stroke(); ctx.fill();
  } else {
    roundRect(ctx, cx - bw / 2, shoulderY - 2, bw, legTop - shoulderY + 6, 5); ctx.stroke(); ctx.fill();
  }
  if (o.belt) { ctx.fillStyle = o.belt; ctx.fillRect(cx - bw / 2, legTop - 4, bw, 4); }
  if (o.ribs) {
    ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - bw / 2 + 2, shoulderY + 3 + i * 4); ctx.lineTo(cx + bw / 2 - 2, shoulderY + 3 + i * 4); ctx.stroke(); }
  }
  if (o.spikes) {
    ctx.fillStyle = '#d8c8a0';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 6 + i * 6, shoulderY - 1); ctx.lineTo(cx - 4 + i * 6, shoulderY - 8); ctx.lineTo(cx - 2 + i * 6, shoulderY - 1); ctx.fill(); }
  }

  // head
  const hr = o.headR || 7.5;
  if (o.hair) {
    ctx.fillStyle = o.hair;
    ctx.beginPath(); ctx.ellipse(cx - 2, headY + 6, hr + 2, hr + 7, 0, 0, 7); ctx.fill();
  }
  circle(ctx, cx, headY, hr, o.skin, '#0d0906');
  ctx.beginPath(); ctx.arc(cx, headY, hr, 0, 7); ctx.fillStyle = o.skin; ctx.fill();
  const hd = o.head;
  if (hd === 'helm') {
    ctx.fillStyle = o.helmCol || '#8a8a92';
    ctx.beginPath(); ctx.arc(cx, headY - 1, hr + 1, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - hr - 1, headY - 2, hr * 2 + 2, 3);
    if (o.horns) {
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath(); ctx.moveTo(cx - hr, headY - 3); ctx.quadraticCurveTo(cx - hr - 8, headY - 8, cx - hr - 5, headY - 16); ctx.lineTo(cx - hr + 2, headY - 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + hr, headY - 3); ctx.quadraticCurveTo(cx + hr + 8, headY - 8, cx + hr + 5, headY - 16); ctx.lineTo(cx + hr - 2, headY - 5); ctx.fill();
    }
  } else if (hd === 'hood') {
    ctx.fillStyle = o.hoodCol || '#3a2a4a';
    ctx.beginPath(); ctx.arc(cx, headY, hr + 2, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(cx + hr + 2, headY + 6); ctx.lineTo(cx - hr - 2, headY + 6); ctx.fill();
  } else if (hd === 'skull') {
    ctx.fillStyle = '#0d0906';
    ctx.fillRect(cx - 4, headY - 1, 3, 3); ctx.fillRect(cx + 2, headY - 1, 3, 3); ctx.fillRect(cx - 2, headY + 4, 5, 1.5);
  } else if (hd === 'horns') {
    ctx.fillStyle = o.hornCol || '#2a1a10';
    ctx.beginPath(); ctx.moveTo(cx - hr + 2, headY - 4); ctx.quadraticCurveTo(cx - hr - 6, headY - 12, cx - hr - 2, headY - 20); ctx.lineTo(cx - hr + 6, headY - 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + hr - 2, headY - 4); ctx.quadraticCurveTo(cx + hr + 6, headY - 12, cx + hr + 2, headY - 20); ctx.lineTo(cx + hr - 6, headY - 6); ctx.fill();
  } else if (hd === 'circlet') {
    ctx.fillStyle = '#d8b04a'; ctx.fillRect(cx - hr, headY - 4, hr * 2, 2.5);
    ctx.fillStyle = '#5af'; ctx.fillRect(cx - 1.5, headY - 5, 3, 3);
  } else if (hd === 'mask') {
    ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.arc(cx, headY + 1, hr - 1, 0, 7); ctx.fill();
    ctx.fillStyle = '#0d0906'; ctx.fillRect(cx - 4, headY - 1, 3, 3); ctx.fillRect(cx + 2, headY - 1, 3, 3);
  }
  if (o.eyes) {
    ctx.fillStyle = o.eyes; ctx.shadowColor = o.eyes; ctx.shadowBlur = 6;
    ctx.fillRect(cx + 1, headY - 1, 2.5, 2); ctx.fillRect(cx + 5, headY - 1, 2.5, 2);
    ctx.shadowBlur = 0;
  }

  // front arm + weapon
  const sx = cx + bw / 2 - 1, sy = shoulderY + 2;
  let hx, hy, ang;
  if (o.weapon === 'bow') {
    hx = atk ? sx + 14 : sx + 4 - swing * 0.4; hy = atk ? sy + 2 : sy + 14;
    ang = 0;
  } else if (atk) {
    hx = sx + 15; hy = sy + 4; ang = 1.35;
  } else {
    hx = sx + 3 - swing * 0.6; hy = sy + 15; ang = 0.35;
  }
  limb(ctx, sx, sy, hx, hy, armW, o.sleeve || o.skin);
  circle(ctx, hx, hy, armW * 0.55, o.skin);
  if (o.weapon && o.weapon !== 'none') drawWeapon(ctx, o.weapon, hx, hy, o.weapon === 'bow' ? 0 : ang, o);
  if (o.weapon2) drawWeapon(ctx, o.weapon2, cx - bw / 2 - 3 + swing * 0.6, shoulderY + 17, -0.3, o);
  if (o.shield) {
    ctx.fillStyle = o.shield; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx - bw / 2 - 2 + swing * 0.4, shoulderY + 14, 6, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
}

function drawSpider(ctx, o, frame) {
  const cx = 32, cy = 58;
  const k = frame === 1 ? 3 : frame === 2 ? -3 : 0;
  ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 3.5;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const off = (i % 2 ? k : -k);
    const y0 = cy - 4 + i * 3;
    ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx + s * (14 + i * 2), y0 - 12 + off); ctx.lineTo(cx + s * (22 + i * 3), cy + 14 - i * 2 + off); ctx.stroke();
  }
  ctx.strokeStyle = o.legs; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const off = (i % 2 ? k : -k);
    const y0 = cy - 4 + i * 3;
    ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx + s * (14 + i * 2), y0 - 12 + off); ctx.lineTo(cx + s * (22 + i * 3), cy + 14 - i * 2 + off); ctx.stroke();
  }
  const g = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 16);
  g.addColorStop(0, shadeHex(o.body, 40)); g.addColorStop(1, o.body);
  ctx.fillStyle = g; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx - 6, cy, 13, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + 9, cy + 1, 7, 6, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.mark || '#c02020'; ctx.beginPath(); ctx.arc(cx - 7, cy - 2, 3, 0, 7); ctx.fill();
  ctx.fillStyle = o.eyes || '#ff3030'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 5;
  ctx.fillRect(cx + 11, cy - 2, 2, 2); ctx.fillRect(cx + 13, cy, 2, 2); ctx.fillRect(cx + 10, cy + 1, 2, 2);
  ctx.shadowBlur = 0;
  if (frame === 3) { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(cx + 15, cy + 2, 4, 2); ctx.fillRect(cx + 15, cy + 5, 4, 2); }
}

function drawWraith(ctx, o, frame) {
  const cx = 32, float = frame === 1 ? -2 : frame === 2 ? 2 : 0;
  ctx.translate(0, float);
  const g = ctx.createLinearGradient(0, 18, 0, 76);
  g.addColorStop(0, o.body); g.addColorStop(1, 'rgba(20,30,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - 10, 26);
  ctx.quadraticCurveTo(cx - 22, 50, cx - 16, 76); ctx.lineTo(cx - 8, 66); ctx.lineTo(cx - 2, 76); ctx.lineTo(cx + 4, 66);
  ctx.lineTo(cx + 10, 76); ctx.quadraticCurveTo(cx + 22, 50, cx + 10, 26); ctx.closePath(); ctx.fill();
  // arms
  const reach = frame === 3 ? 18 : 8;
  ctx.strokeStyle = o.body; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx + 8, 34); ctx.lineTo(cx + 8 + reach, 42); ctx.stroke();
  ctx.strokeStyle = '#dde'; ctx.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + 8 + reach, 42); ctx.lineTo(cx + 13 + reach, 42 + i * 3); ctx.stroke(); }
  // hood
  ctx.fillStyle = o.hood || '#3a4a5a';
  ctx.beginPath(); ctx.arc(cx, 24, 10, Math.PI, 0); ctx.lineTo(cx + 10, 32); ctx.lineTo(cx - 10, 32); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(cx + 2, 26, 6, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = o.eyes; ctx.shadowColor = o.eyes; ctx.shadowBlur = 8;
  ctx.fillRect(cx, 25, 2.5, 2); ctx.fillRect(cx + 4, 25, 2.5, 2);
  ctx.shadowBlur = 0;
}

// ---------- characters ----------
const HEROES = {
  barbarian: { skin: '#c88a5a', body: '#6a4a2a', legs: '#4a3a2a', boots: '#2a1a0a', belt: '#2a1a0a', head: 'helm', horns: true, helmCol: '#7a7a82',
               weapon: 'axe', bw: 21, armW: 6.5, legW: 7, sleeve: '#c88a5a', shield: '#6a5030' },
  amazon:    { skin: '#e0b088', body: '#8a6a3a', legs: '#c09068', boots: '#5a3a1a', belt: '#4a2a10', head: 'none', hair: '#d8b040',
               weapon: 'bow', bw: 16, armW: 4.5, legW: 5.5, cape: '#3a5a2a' },
  sorceress: { skin: '#e8c0a0', body: '#3a2a6a', legs: '#2a1a4a', head: 'circlet', hair: '#1a1010', weapon: 'staff', robe: true, bw: 15,
               armW: 4.5, sleeve: '#3a2a6a', glow: '#ff9a40' },
};
const NPCS = {
  merchant: { skin: '#d8a888', body: '#7a3a2a', legs: '#3a2a1a', robe: true, head: 'hood', hoodCol: '#5a2a1a', bw: 18, weapon: 'none', belt: '#c8a040' },
  healer:   { skin: '#e0b898', body: '#d8d0b8', legs: '#3a2a1a', robe: true, head: 'hood', hoodCol: '#a89878', bw: 16, weapon: 'staff', glow: '#a0ffa0' },
};
const MONSTER_ART = {
  zombie:   { skin: '#7a9a5a', body: '#4a4a3a', legs: '#3a3a2a', head: 'none', hunch: 4, bw: 19, armW: 5.5, weapon: 'none', eyes: '#ff4' },
  skeleton: { skin: '#d8d0bc', body: '#c8c0ac', legs: '#d8d0bc', head: 'skull', bw: 13, armW: 3.5, legW: 3.5, ribs: true, weapon: 'sword', weapCol: '#9a9a9a' },
  archer:   { skin: '#d8d0bc', body: '#c8c0ac', legs: '#d8d0bc', head: 'skull', bw: 13, armW: 3.5, legW: 3.5, ribs: true, weapon: 'bow' },
  fallen:   { skin: '#c03a2a', body: '#a02a1a', legs: '#802018', head: 'horns', headR: 9, hornCol: '#e8d8b8', bw: 15, weapon: 'spear', eyes: '#ff0', belt: '#3a2a1a' },
  wraith:   { kind: 'wraith', body: 'rgba(120,150,190,0.85)', eyes: '#7ff' },
  shaman:   { skin: '#c03a2a', body: '#5a2a5a', legs: '#802018', head: 'horns', headR: 9, hornCol: '#e8d8b8', robe: true, bw: 15, weapon: 'staff', glow: '#ff6a20', eyes: '#ff0' },
  goatman:  { skin: '#7a5a3a', body: '#5a4a3a', legs: '#4a3a2a', head: 'horns', hornCol: '#d8c8a8', bw: 20, armW: 6, legW: 6.5, weapon: 'axe', eyes: '#f80', tail: true, belt: '#2a1a0a' },
  spider:   { kind: 'spider', body: '#3a2a1a', legs: '#5a4a3a', mark: '#c03020' },
  imp:      { skin: '#d04a2a', body: '#c03a2a', legs: '#a03020', head: 'horns', hornCol: '#1a0a0a', bw: 14, weapon: 'claws', eyes: '#ff0', wings: '#5a1a1a', tail: true },
  knight:   { skin: '#3a3a42', body: '#2a2a32', legs: '#2a2a32', head: 'helm', helmCol: '#1a1a20', horns: true, bw: 22, armW: 7, legW: 7.5, weapon: 'sword',
              weapCol: '#e04030', eyes: '#f22', cape: '#5a0a0a', shield: '#3a0a0a' },
};
const BOSS_ART = {
  gravekeeper: { skin: '#a8a080', body: '#5a4a3a', legs: '#3a3020', head: 'mask', bw: 26, armW: 8, legW: 8, hunch: 3, weapon: 'cleaver', belt: '#2a1a0a',
                 sleeve: '#a8a080', eyes: null, apron: true },
  venom:       { skin: '#8a6a9a', body: '#3a1a4a', legs: '#2a0a3a', head: 'none', hair: '#2a5a2a', robe: true, bw: 17, weapon: 'claws', weapCol: '#9f9',
                 eyes: '#5f5', spiderLegs: true },
  lord:        { skin: '#a8281a', body: '#8a1a10', legs: '#6a140a', head: 'horns', hornCol: '#e8dcc0', headR: 9, bw: 24, armW: 7.5, legW: 8, weapon: 'claws',
                 weapCol: '#ffd0a0', eyes: '#ff0', wings: '#3a0606', spikes: true, tail: true },
};

// ---------- icons ----------
const ICON_NAMES = ['sword', 'axe', 'mace', 'bow', 'staff', 'wand', 'shield', 'orb', 'quiver', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet',
  'potion_red', 'potion_blue', 'potion_purple', 'scroll', 'gold',
  'bash', 'leap', 'whirl', 'warcry', 'multishot', 'explode', 'freeze', 'strafe', 'firebolt', 'nova', 'chain', 'meteor'];

function iconBg(ctx, c1, c2) {
  const g = ctx.createRadialGradient(24, 20, 2, 24, 24, 32);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 48, 48);
}
function potion(ctx, col) {
  ctx.fillStyle = '#c8b898'; ctx.fillRect(20, 6, 8, 8);
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(19, 4, 10, 4);
  const g = ctx.createRadialGradient(20, 26, 2, 24, 30, 14);
  g.addColorStop(0, '#fff'); g.addColorStop(0.25, col); g.addColorStop(1, shadeHex(col, -90));
  ctx.fillStyle = g; ctx.strokeStyle = '#0d0906'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(24, 30, 13, 0, 7); ctx.fill(); ctx.stroke();
}
function arrowIcon(ctx, x1, y1, x2, y2, col) {
  limb(ctx, x1, y1, x2, y2, 2, '#c8a070');
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.fillStyle = col || '#ddd';
  ctx.beginPath(); ctx.moveTo(x2 + Math.cos(a) * 6, y2 + Math.sin(a) * 6);
  ctx.lineTo(x2 + Math.cos(a + 2.4) * 6, y2 + Math.sin(a + 2.4) * 6); ctx.lineTo(x2 + Math.cos(a - 2.4) * 6, y2 + Math.sin(a - 2.4) * 6); ctx.fill();
}
function bolt(ctx, pts, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 8;
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.shadowBlur = 0;
}
function flake(ctx, x, y, r) {
  ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#7cf'; ctx.shadowBlur = 8;
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 3;
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke();
  }
  ctx.shadowBlur = 0;
}
function fireball(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, '#fff8c0'); g.addColorStop(0.4, '#ffa020'); g.addColorStop(1, 'rgba(200,30,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
const ICONS = {
  sword: c => { drawWeapon(c, 'sword', 14, 36, 0.78, {}); limb(c, 10, 40, 14, 36, 4, '#5a3a1a'); },
  axe: c => drawWeapon(c, 'axe', 18, 40, 0.5, {}),
  mace: c => drawWeapon(c, 'mace', 16, 40, 0.6, {}),
  bow: c => { c.translate(24, 24); c.rotate(0.6); drawWeapon(c, 'bow', 8, 0, 0, {}); },
  staff: c => drawWeapon(c, 'staff', 16, 34, 0.6, { glow: '#7ab0ff' }),
  wand: c => { limb(c, 12, 40, 32, 12, 3, '#d8d0bc'); circle(c, 33, 11, 4, '#e8e0cc', '#0d0906'); },
  shield: c => {
    c.fillStyle = '#6a5030'; c.strokeStyle = '#0d0906'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(8, 8); c.lineTo(40, 8); c.lineTo(40, 24); c.quadraticCurveTo(40, 38, 24, 44); c.quadraticCurveTo(8, 38, 8, 24); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#a8a8b0'; c.fillRect(22, 10, 4, 30); c.fillRect(10, 20, 28, 4);
  },
  orb: c => {
    const g = c.createRadialGradient(20, 20, 1, 24, 24, 16);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#8ac8ff'); g.addColorStop(1, '#1a3a8a');
    c.fillStyle = g; c.beginPath(); c.arc(24, 24, 15, 0, 7); c.fill();
    c.strokeStyle = '#d8b04a'; c.lineWidth = 2; c.beginPath(); c.arc(24, 24, 15, 0.3, 2.8); c.stroke();
  },
  quiver: c => {
    c.fillStyle = '#6a4220'; c.strokeStyle = '#0d0906'; c.lineWidth = 2;
    c.save(); c.translate(24, 26); c.rotate(0.4); c.fillRect(-7, -14, 14, 28); c.strokeRect(-7, -14, 14, 28);
    for (let i = -1; i <= 1; i++) { c.strokeStyle = '#c8a070'; c.beginPath(); c.moveTo(i * 4, -14); c.lineTo(i * 4, -22); c.stroke();
      c.fillStyle = '#e8e0d0'; c.fillRect(i * 4 - 2, -24, 4, 4); }
    c.restore();
  },
  helm: c => {
    c.fillStyle = '#8a8a92'; c.strokeStyle = '#0d0906'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(24, 26, 15, Math.PI, 0); c.lineTo(39, 38); c.lineTo(9, 38); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1a1a20'; c.fillRect(16, 26, 16, 4); c.fillRect(22, 26, 4, 10);
  },
  armor: c => {
    c.fillStyle = '#7a6a5a'; c.strokeStyle = '#0d0906'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(10, 10); c.lineTo(18, 6); c.lineTo(30, 6); c.lineTo(38, 10); c.lineTo(40, 22); c.lineTo(34, 22); c.lineTo(34, 42);
    c.lineTo(14, 42); c.lineTo(14, 22); c.lineTo(8, 22); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.5; for (let y = 16; y < 42; y += 6) { c.beginPath(); c.moveTo(15, y); c.lineTo(33, y); c.stroke(); }
  },
  gloves: c => {
    c.fillStyle = '#6a4a2a'; c.strokeStyle = '#0d0906'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, 42); c.lineTo(14, 20); c.lineTo(17, 10); c.lineTo(21, 10); c.lineTo(22, 18); c.lineTo(24, 8); c.lineTo(28, 8); c.lineTo(29, 18);
    c.lineTo(32, 10); c.lineTo(35, 12); c.lineTo(34, 26); c.lineTo(38, 22); c.lineTo(40, 26); c.lineTo(32, 42); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#8a8a92'; c.fillRect(13, 34, 20, 6);
  },
  boots: c => {
    c.fillStyle = '#5a3a1a'; c.strokeStyle = '#0d0906'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, 6); c.lineTo(28, 6); c.lineTo(28, 30); c.lineTo(40, 34); c.lineTo(40, 42); c.lineTo(12, 42); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#3a2410'; c.fillRect(13, 12, 16, 4);
  },
  ring: c => {
    c.strokeStyle = '#0d0906'; c.lineWidth = 7; c.beginPath(); c.arc(24, 28, 11, 0, 7); c.stroke();
    c.strokeStyle = '#d8b04a'; c.lineWidth = 4; c.beginPath(); c.arc(24, 28, 11, 0, 7); c.stroke();
    c.fillStyle = '#c02a2a'; c.shadowColor = '#f44'; c.shadowBlur = 6; c.beginPath(); c.arc(24, 16, 5, 0, 7); c.fill(); c.shadowBlur = 0;
  },
  amulet: c => {
    c.strokeStyle = '#d8b04a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(10, 6); c.quadraticCurveTo(24, 30, 38, 6); c.stroke();
    c.fillStyle = '#d8b04a'; c.beginPath(); c.moveTo(24, 22); c.lineTo(32, 32); c.lineTo(24, 44); c.lineTo(16, 32); c.closePath(); c.fill();
    c.fillStyle = '#3a8aff'; c.shadowColor = '#5af'; c.shadowBlur = 6; c.beginPath(); c.arc(24, 33, 4, 0, 7); c.fill(); c.shadowBlur = 0;
  },
  potion_red: c => potion(c, '#e02020'),
  potion_blue: c => potion(c, '#2040f0'),
  potion_purple: c => potion(c, '#b030d0'),
  scroll: c => {
    c.fillStyle = '#d8c8a0'; c.strokeStyle = '#0d0906'; c.lineWidth = 2;
    c.fillRect(10, 12, 28, 24); c.strokeRect(10, 12, 28, 24);
    c.fillStyle = '#b8a880'; c.beginPath(); c.arc(10, 24, 5, 0, 7); c.fill(); c.beginPath(); c.arc(38, 24, 5, 0, 7); c.fill();
    c.fillStyle = '#3a6aff'; c.beginPath(); c.arc(24, 24, 5, 0, 7); c.fill();
  },
  gold: c => {
    for (const [x, y] of [[16, 30], [28, 32], [22, 24], [32, 24], [20, 36]]) circle(c, x, y, 7, '#e8c040', '#5a4010');
  },
  bash: c => { iconBg(c, '#7a3a1a', '#1a0804'); drawWeapon(c, 'mace', 22, 38, 0.5, {});
    c.strokeStyle = '#ffd040'; c.lineWidth = 2; star(c, 34, 14, 9, 5); c.stroke(); },
  leap: c => { iconBg(c, '#5a4a2a', '#100804'); c.strokeStyle = '#ffd890'; c.lineWidth = 4; c.beginPath(); c.moveTo(8, 40); c.quadraticCurveTo(24, -6, 40, 40); c.stroke();
    c.fillStyle = '#ffd890'; c.beginPath(); c.moveTo(40, 44); c.lineTo(34, 34); c.lineTo(44, 34); c.fill(); },
  whirl: c => { iconBg(c, '#4a4a5a', '#0a0a10'); c.strokeStyle = '#e0e4ff'; c.lineWidth = 3; c.beginPath();
    for (let a = 0; a < 12; a += 0.2) { const r = 2 + a * 1.6; c.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r); } c.stroke(); },
  warcry: c => { iconBg(c, '#8a2a1a', '#1a0404'); c.strokeStyle = '#ffd040'; c.lineWidth = 3;
    for (let r = 8; r < 26; r += 7) { c.beginPath(); c.arc(14, 24, r, -0.8, 0.8); c.stroke(); } },
  multishot: c => { iconBg(c, '#3a5a2a', '#081004'); arrowIcon(c, 8, 40, 38, 8); arrowIcon(c, 8, 40, 40, 22); arrowIcon(c, 8, 40, 24, 6); },
  explode: c => { iconBg(c, '#5a2a0a', '#100400'); arrowIcon(c, 6, 42, 26, 22); fireball(c, 32, 16, 14); },
  freeze: c => { iconBg(c, '#1a3a5a', '#02060c'); arrowIcon(c, 6, 42, 36, 12, '#bff'); flake(c, 33, 15, 9); },
  strafe: c => { iconBg(c, '#4a4a2a', '#0a0a04'); for (let i = 0; i < 5; i++) arrowIcon(c, 24, 24, 24 + Math.cos(i * 1.25) * 18, 24 + Math.sin(i * 1.25) * 18); },
  firebolt: c => { iconBg(c, '#4a1a0a', '#0a0200'); fireball(c, 30, 18, 14); c.strokeStyle = 'rgba(255,140,30,0.6)'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(8, 40); c.lineTo(24, 24); c.stroke(); },
  nova: c => { iconBg(c, '#1a3a6a', '#02040c'); c.strokeStyle = '#bfe8ff'; c.lineWidth = 3; c.shadowColor = '#7cf'; c.shadowBlur = 8;
    c.beginPath(); c.arc(24, 24, 16, 0, 7); c.stroke(); c.shadowBlur = 0; flake(c, 24, 24, 8); },
  chain: c => { iconBg(c, '#2a2a5a', '#02020c'); bolt(c, [[6, 8], [18, 20], [12, 26], [26, 30], [20, 36], [40, 42]], '#9cf'); },
  meteor: c => { iconBg(c, '#5a1a0a', '#0a0200'); c.strokeStyle = 'rgba(255,120,20,0.7)'; c.lineWidth = 8; c.beginPath(); c.moveTo(42, 4); c.lineTo(22, 26); c.stroke();
    fireball(c, 20, 28, 15); circle(c, 20, 28, 7, '#5a3a2a', '#0d0906'); },
};

Art.HEROES = HEROES;
