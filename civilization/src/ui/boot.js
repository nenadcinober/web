// Generates every texture procedurally (terrain tiles, emoji icons) so the game needs no asset files.

var TERRAIN_VARIANTS = 4;

function seededRand(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(color, f) {
  var r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawTerrainTile(ctx, key, v) {
  var T = TERRAIN[key], S = TILE, R = seededRand(key.length * 977 + v * 131 + key.charCodeAt(0) * 7);
  ctx.fillStyle = shade(T.color, 1);
  ctx.fillRect(0, 0, S, S);
  var i, x, y;
  for (i = 0; i < 60; i++) {
    ctx.fillStyle = shade(T.color, 0.86 + R() * 0.28);
    ctx.fillRect(Math.floor(R() * S), Math.floor(R() * S), 2, 2);
  }
  switch (key) {
    case 'ocean':
    case 'coast':
      ctx.strokeStyle = shade(T.color, key === 'coast' ? 1.25 : 1.35);
      ctx.lineWidth = 1;
      for (i = 0; i < 3; i++) {
        x = R() * 22 + 2; y = R() * 26 + 4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 3, x + 6, y); ctx.quadraticCurveTo(x + 9, y + 3, x + 12, y); ctx.stroke();
      }
      break;
    case 'grass':
    case 'plains':
      ctx.strokeStyle = shade(T.color, key === 'grass' ? 0.72 : 0.78);
      for (i = 0; i < 7; i++) {
        x = R() * 28 + 2; y = R() * 26 + 4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1, y - 3); ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y - 3); ctx.stroke();
      }
      break;
    case 'desert':
      ctx.strokeStyle = shade(T.color, 0.85);
      for (i = 0; i < 3; i++) {
        x = R() * 20 + 2; y = R() * 24 + 6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 4, x + 10, y); ctx.stroke();
      }
      break;
    case 'tundra':
      for (i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(240,245,250,0.5)'; ctx.fillRect(R() * 30, R() * 30, 2, 1); }
      break;
    case 'snow':
      for (i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(150,180,210,0.35)'; ctx.fillRect(R() * 30, R() * 30, 2, 1); }
      break;
    case 'forest':
      for (i = 0; i < 5; i++) {
        x = 4 + (i % 3) * 10 + R() * 4; y = 10 + Math.floor(i / 3) * 12 + R() * 4;
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 1, y + 2, 2, 4);
        ctx.fillStyle = shade(0x1f5a22, 0.8 + R() * 0.4);
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x - 5, y + 3); ctx.closePath(); ctx.fill();
      }
      break;
    case 'hills':
      for (i = 0; i < 2; i++) {
        x = 9 + i * 13 + R() * 3; y = 20 + R() * 6;
        ctx.fillStyle = shade(T.color, 1.15);
        ctx.beginPath(); ctx.arc(x, y, 8, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = shade(T.color, 0.7);
        ctx.beginPath(); ctx.arc(x, y, 8, Math.PI, 0); ctx.stroke();
      }
      break;
    case 'mountains':
      for (i = 0; i < 2; i++) {
        x = 9 + i * 13 + R() * 2; y = 27;
        var hgt = 16 + R() * 6;
        ctx.fillStyle = shade(0x6a635c, 0.9 + R() * 0.2);
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x, y - hgt); ctx.lineTo(x + 10, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f2f4f6';
        ctx.beginPath(); ctx.moveTo(x - 3.5, y - hgt + 6); ctx.lineTo(x, y - hgt); ctx.lineTo(x + 3.5, y - hgt + 6); ctx.closePath(); ctx.fill();
      }
      break;
  }
}

function makeEmojiTexture(scene, key, emoji, size) {
  if (scene.textures.exists(key)) return;
  var px = size || 40;
  var tex = scene.textures.createCanvas(key, px, px);
  var ctx = tex.getContext();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = Math.floor(px * 0.78) + 'px ' + UI.emoji;
  ctx.fillText(emoji, px / 2, px / 2 + px * 0.05);
  tex.refresh();
}

var BootScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); },
  create: function () {
    var self = this;
    Object.keys(TERRAIN).forEach(function (k) {
      for (var v = 0; v < TERRAIN_VARIANTS; v++) {
        var tex = self.textures.createCanvas('ter_' + k + '_' + v, TILE, TILE);
        drawTerrainTile(tex.getContext(), k, v);
        tex.refresh();
      }
    });
    Object.keys(RESOURCES).forEach(function (k) { makeEmojiTexture(self, 'res_' + k, RESOURCES[k].icon, 40); });
    Object.keys(UNITS).forEach(function (k) { makeEmojiTexture(self, 'unit_' + k, UNITS[k].icon, 40); });
    // A soft round glow used for selection and combat flashes.
    var glow = this.textures.createCanvas('glow', 64, 64), gc = glow.getContext();
    var grad = gc.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    gc.fillStyle = grad; gc.fillRect(0, 0, 64, 64); glow.refresh();
    this.scene.start('Menu');
  },
});
