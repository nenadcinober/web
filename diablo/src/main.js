'use strict';

// Main menu, new/continued runs, the Phaser game instance and keyboard shortcuts.

const Main = window.Main = {
  sel: { cls: 'barbarian', size: 'small', diff: 'normal' },

  init() {
    D.UI.init();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#000000',
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      scene: [D.BootScene, D.GameScene],
      render: { antialias: true },
      disableContextMenu: true,
    });
    window.addEventListener('keydown', e => this.onKey(e));
    window.addEventListener('keyup', e => { if (e.key === 'Alt') this.setShowAll(false); });
    window.addEventListener('blur', () => this.setShowAll(false));
    // the periodic save runs every 20 s; closing or hiding the tab must not lose what happened since
    window.addEventListener('pagehide', () => this.saveNow());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.saveNow(); });
    $('startBtn').addEventListener('click', () => this.newGame());
  },

  onBooted() {
    $('loading').classList.add('hidden');
    this.renderMenu();
  },

  renderMenu() {
    const cards = (el, entries, key, img) => {
      el.innerHTML = entries.map(([k, v]) => `<div class="card ${this.sel[key] === k ? 'sel' : ''}" data-k="${k}">
        ${img ? `<img src="${img(k)}">` : ''}<div class="cn">${v.label || v.name}</div><div class="cd">${v.desc}${v.minutes ? `<br>${v.minutes}` : ''}</div></div>`).join('');
      el.onclick = e => {
        const c = e.target.closest('.card');
        if (!c) return;
        this.sel[key] = c.dataset.k;
        this.renderMenu();
      };
    };
    if (!this.heroImgs) {
      this.heroImgs = {};
      for (const k of Object.keys(D.CLASSES)) this.heroImgs[k] = D.Art.figure(D.Art.HEROES[k], 3, 2).toDataURL();
    }
    cards($('classPick'), Object.entries(D.CLASSES), 'cls', k => this.heroImgs[k]);
    cards($('sizePick'), Object.entries(D.SIZES), 'size');
    cards($('diffPick'), Object.entries(D.DIFFICULTY), 'diff');
    const saved = G.savedSummary();
    const cont = $('menuContinue');
    if (saved) {
      const where = saved.floorIndex === 0 ? D.THEMES.town.name : (saved.floors[saved.floorIndex] || {}).name;
      cont.innerHTML = `<button class="big" id="contBtn">Continue</button>
        <div class="cinfo">Level ${saved.player.level} ${D.CLASSES[saved.cls].name} &middot; ${D.SIZES[saved.size].label} map, ${D.DIFFICULTY[saved.difficulty].label}
        &middot; ${D.esc(where || '')} &middot; ${D.fmtTime(saved.elapsed)}<br>Starting a new game replaces this one.</div>`;
      $('contBtn').onclick = () => this.continueGame();
    } else cont.innerHTML = '';
    const recs = G.records(), rows = [];
    for (const s of Object.keys(D.SIZES)) for (const d of Object.keys(D.DIFFICULTY)) {
      const r = recs[`${s}-${d}`];
      if (r) rows.push(`${D.SIZES[s].label} / ${D.DIFFICULTY[d].label}: ${D.fmtTime(r.time)} (${D.CLASSES[r.cls].name}, level ${r.level})`);
    }
    $('records').innerHTML = rows.length ? `<div style="color:#8a6d3b;font-family:Cinzel,serif">Best times</div>${rows.join('<br>')}` : '';
  },

  newRun() {
    const { cls, size, diff } = this.sel, C = D.CLASSES[cls];
    const w = C.weapons[0];
    const weapon = { id: D.Items.newId(), slot: 'weapon', icon: w.icon, base: w.names[0], name: w.names[0], rarity: 'normal', ilvl: 1,
      min: w.min, max: w.max, aff: [], value: 4 };
    return {
      v: 1, seed: (Math.random() * 2 ** 31) >>> 0, cls, size, difficulty: diff,
      elapsed: 0, floorIndex: 0, deepest: 0, floors: {}, waypoints: [0], portal: null,
      kills: 0, deaths: 0, buffs: {}, shop: null, won: false,
      player: {
        cls, level: 1, xp: 0, statPoints: 0, skillPoints: 0, base: { ...C.base }, skills: { [C.skills[0]]: 1 },
        rightSkill: C.skills[0], hp: null, mana: null, gold: 60,
        potions: { hp: 4, mp: 3, rejuv: 1, tp: 2 }, equip: { weapon }, inv: new Array(32).fill(null), x: 0, y: 0,
      },
    };
  },

  newGame() {
    D.Sfx.init();
    G.run = this.newRun();
    G.loadStash();
    G.grids = {}; G.explored = {};
    this.start('town');
    setTimeout(() => {
      D.UI.banner('Gruntvale Encampment', 'Take the dungeon entrance to the south');
      D.UI.log('Talk to Old Marta to trade, Brother Ivo to heal.', '#c8b898');
      D.UI.log('Press Esc for the controls.', '#8f8270');
    }, 600);
  },

  continueGame() {
    D.Sfx.init();
    if (!G.load()) { this.renderMenu(); return; }
    G.loadStash();
    const rp = G.run.player;
    let arrival = 'load';
    if (rp.hp != null && rp.hp <= 0) { rp.hp = null; rp.mana = null; G.run.floorIndex = 0; arrival = 'town'; }
    this.start(arrival);
  },

  start(arrival) {
    $('menu').classList.add('hidden');
    D.UI.closeAll();
    D.UI.show();
    G.paused = false;
    this.game.scene.start('game', { arrival });
  },

  toMenu() {
    this.game.scene.stop('game');
    G.scene = null;
    D.UI.closeAll();
    D.UI.hide();
    D.Sfx.setAmbient('town');
    $('menu').classList.remove('hidden');
    this.renderMenu();
  },

  saveNow() {
    const s = G.scene;
    if (!s || !G.run || s.leaving) return;
    if (!s.dead) { G.run.player.x = s.player.x; G.run.player.y = s.player.y; }
    G.save();
  },

  setShowAll(on) {
    if (G.showAllLabels === on) return;
    G.showAllLabels = on;
    if (G.scene) G.scene.applyLabelFilter();
  },

  onKey(e) {
    if (!$('menu').classList.contains('hidden') || !G.scene) return;
    // Alt would otherwise focus the browser's menu bar
    if (e.key === 'Alt') { e.preventDefault(); this.setShowAll(true); return; }
    const UI = D.UI, s = G.scene;
    if (UI.modalOpen()) {
      if (e.code === 'Escape' && (UI.modalKind === 'menu' || UI.modalKind === 'help')) UI.hideModal();
      return;
    }
    switch (e.code) {
      case 'Escape': if (!UI.closeAll()) UI.toggleMenu(); break;
      case 'Space': UI.closeAll(); e.preventDefault(); break;
      case 'KeyI': case 'KeyB': UI.toggle('inv'); break;
      case 'KeyC': case 'KeyS': UI.toggle('char'); break;
      case 'Tab': UI.toggleMap(); e.preventDefault(); break;
      case 'KeyM': UI.log(D.Sfx.toggleMute() ? 'Sound off' : 'Sound on'); break;
      case 'KeyQ': s.castSkillKey(0); break;
      case 'KeyW': s.castSkillKey(1); break;
      case 'KeyE': s.castSkillKey(2); break;
      case 'KeyR': s.castSkillKey(3); break;
      case 'Digit1': s.usePotion('hp'); break;
      case 'Digit2': s.usePotion('mp'); break;
      case 'Digit3': s.usePotion('rejuv'); break;
      case 'KeyT': case 'Digit4': s.townPortal(); break;
      default: return;
    }
  },
};

window.addEventListener('load', () => Main.init());
