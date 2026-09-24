const MATERIALS = [
  { id: 'pvc', name: 'PVC prozori', base: 25, discount: 30, color: '#ffffff', points: ['Odlična toplinska izolacija', 'Jednostavno održavanje', '5- i 6-komorni profili'] },
  { id: 'pvcalu', name: 'PVC-Alu prozori', base: 93, discount: 30, color: '#3b4a57', points: ['Vanjska aluminijska obloga', 'Otporni na vremenske uvjete', 'Moderan izgled'] },
  { id: 'wood', name: 'Drveni prozori', base: 100, discount: 15, color: '#8a5a36', points: ['Prirodan materijal', 'Smreka, bor ili meranti', 'Topla atmosfera'] },
  { id: 'woodalu', name: 'Drvo-Alu prozori', base: 140, discount: 15, color: '#6b4a2e', points: ['Drvo iznutra, aluminij izvana', 'Dugotrajni', 'Vrhunska izolacija'] },
  { id: 'alu', name: 'Aluminijski prozori', base: 84, discount: 30, color: '#9aa7b3', points: ['Tanki, stabilni profili', 'Velike staklene površine', 'Gotovo bez održavanja'] },
  { id: 'balcony', name: 'Balkonska vrata', base: 91, discount: 30, color: '#ffffff', type: 'door', points: ['Niski prag po želji', 'Svi materijali', 'Zaključavajuća ručka'] },
];

const COLORS = [
  { id: 'white', name: 'Bijela', hex: '#ffffff', add: 0 },
  { id: 'anthracite', name: 'Antracit', hex: '#3b4a57', add: 0.18 },
  { id: 'oak', name: 'Zlatni hrast', hex: '#b5773c', add: 0.22 },
  { id: 'walnut', name: 'Orah', hex: '#6b4a2e', add: 0.22 },
  { id: 'grey', name: 'Svijetlo siva', hex: '#c3c9cf', add: 0.15 },
  { id: 'black', name: 'Crna', hex: '#1d2226', add: 0.2 },
];

const TYPES = [
  { id: 'single', name: 'Jednokrilni', factor: 1 },
  { id: 'double', name: 'Dvokrilni', factor: 1.55 },
  { id: 'fixed', name: 'Fiksni', factor: 0.7 },
  { id: 'door', name: 'Balkonska vrata', factor: 1.35 },
];

const GLASS = [
  { id: 'two', name: 'Dvoslojno Ug 1,1', add: 0 },
  { id: 'three', name: 'Troslojno Ug 0,6', add: 0.12 },
  { id: 'three-sec', name: 'Troslojno sigurnosno', add: 0.25 },
];

const fmt = n => n.toLocaleString('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 140;
}

// Inline SVG window drawing: frame colour, sash layout and proportions.
function windowSvg({ type = 'single', color = '#ffffff', w = 1000, h = 1200 }) {
  const W = 200, H = Math.max(120, Math.min(420, (h / w) * W));
  const f = 12;
  const stroke = isDark(color) ? '#11161a' : '#aeb8c2';
  const glass = `<linearGradient id="g${type}${H}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe8fb"/><stop offset=".55" stop-color="#9fd0f3"/><stop offset="1" stop-color="#e6f4fd"/></linearGradient>`;
  const pane = (x, y, pw, ph, handle, opening) => {
    const gid = `g${type}${H}`;
    let s = `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${color}" stroke="${stroke}"/>`;
    s += `<rect x="${x + 8}" y="${y + 8}" width="${pw - 16}" height="${ph - 16}" fill="url(#${gid})" stroke="${stroke}"/>`;
    s += `<path d="M${x + 16} ${y + 26} l22 -14 M${x + 16} ${y + 42} l34 -22" stroke="#fff" stroke-width="3" opacity=".7"/>`;
    if (opening) s += `<path d="M${x + 10} ${y + 10} L${opening === 'r' ? x + pw - 10 : x + 10} ${y + ph / 2} L${x + 10} ${y + ph - 10}" fill="none" stroke="${stroke}" stroke-dasharray="4 4" opacity=".6" transform="${opening === 'l' ? `translate(${2 * x + pw} 0) scale(-1 1)` : ''}"/>`;
    if (handle) s += `<rect x="${handle === 'r' ? x + pw - 7 : x + 2}" y="${y + ph / 2 - 12}" width="5" height="24" rx="2" fill="#d0d4d8" stroke="#7a8590"/>`;
    return s;
  };
  let inner = '';
  const iw = W - 2 * f, ih = H - 2 * f;
  if (type === 'double') {
    inner = pane(f, f, iw / 2, ih, 'r', 'r') + pane(f + iw / 2, f, iw / 2, ih, 'l', 'l');
  } else if (type === 'fixed') {
    inner = pane(f, f, iw, ih);
  } else {
    inner = pane(f, f, iw, ih, 'r', 'r');
  }
  return `<svg viewBox="-4 -4 ${W + 8} ${H + 12}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Prikaz prozora">
    <defs>${glass}</defs>
    <rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    ${inner}
    <rect x="-4" y="${H}" width="${W + 8}" height="6" rx="2" fill="#cfd6dd"/>
  </svg>`;
}

// Product cards
const grid = document.getElementById('productGrid');
grid.innerHTML = MATERIALS.map(m => `
  <article class="product">
    <span class="product-badge">${m.discount === 30 ? 'do ' : ''}-${m.discount}%</span>
    <div class="product-img">${windowSvg({ type: m.type || 'single', color: m.color, w: m.type ? 800 : 1000, h: m.type ? 2000 : 1300 })}</div>
    <div class="product-body">
      <h3>${m.name}</h3>
      <ul>${m.points.map(p => `<li>${p}</li>`).join('')}</ul>
      <div class="product-price">već od <b>${m.base} €</b></div>
      <div class="product-actions">
        <a href="#posebni" class="btn btn-ghost">Saznaj više</a>
        <a href="#konfigurator" class="btn btn-primary" data-material="${m.id}">Konfiguriraj</a>
      </div>
    </div>
  </article>`).join('');

document.querySelector('.hero-window').innerHTML = windowSvg({ type: 'double', color: '#ffffff', w: 1200, h: 1100 });

// Configurator
const state = { material: 'pvc', color: 'white', type: 'single', glass: 'two' };
const form = document.getElementById('configForm');

function renderChips(name, items) {
  const box = form.querySelector(`[data-name="${name}"]`);
  box.innerHTML = items.map(i => name === 'color'
    ? `<button type="button" class="swatch" data-id="${i.id}" title="${i.name}" style="background:${i.hex}" aria-label="${i.name}"></button>`
    : `<button type="button" class="chip" data-id="${i.id}">${i.name}</button>`).join('');
  box.addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    state[name] = btn.dataset.id;
    update();
  });
}

renderChips('material', MATERIALS.filter(m => !m.type));
renderChips('color', COLORS);
renderChips('type', TYPES);
renderChips('glass', GLASS);

const byId = (list, id) => list.find(x => x.id === id);
const qtyInput = document.getElementById('qty');

function computePrice() {
  const m = byId(MATERIALS, state.material);
  const c = byId(COLORS, state.color);
  const t = byId(TYPES, state.type);
  const g = byId(GLASS, state.glass);
  const w = Math.max(400, +form.width.value || 0), h = Math.max(400, +form.height.value || 0);
  const area = (w * h) / 1e6;
  let list = (m.base * 4.2 + area * m.base * 2.6) * t.factor * (1 + c.add + g.add);
  if (form.rc2.checked) list += 85;
  if (form.sound.checked) list += 60;
  const qty = Math.max(1, +qtyInput.value || 1);
  const sale = list * (1 - m.discount / 100);
  return { list: list * qty, sale: sale * qty, m, c, t, g, w, h, qty };
}

function update() {
  form.querySelectorAll('[data-name]').forEach(box => {
    box.querySelectorAll('[data-id]').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === state[box.dataset.name]));
  });
  const p = computePrice();
  document.getElementById('configPreview').innerHTML = windowSvg({ type: state.type, color: p.c.hex, w: p.w, h: p.h });
  document.getElementById('configSpec').innerHTML = [
    ['Materijal', p.m.name.replace(' prozori', '')],
    ['Boja', p.c.name],
    ['Vrsta', p.t.name],
    ['Dimenzije', `${p.w} × ${p.h} mm`],
    ['Staklo', p.g.name],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  document.getElementById('oldPrice').textContent = fmt(p.list);
  document.getElementById('price').textContent = fmt(p.sale);
}

form.addEventListener('input', update);
document.getElementById('qtyMinus').onclick = () => { qtyInput.value = Math.max(1, +qtyInput.value - 1); update(); };
document.getElementById('qtyPlus').onclick = () => { qtyInput.value = Math.min(99, +qtyInput.value + 1); update(); };
qtyInput.addEventListener('input', update);

grid.addEventListener('click', e => {
  const btn = e.target.closest('[data-material]');
  if (!btn) return;
  const id = btn.dataset.material;
  if (id === 'balcony') { state.type = 'door'; form.width.value = 900; form.height.value = 2100; }
  else state.material = id;
  update();
});

// Cart + toast
let cart = 0;
try { cart = +localStorage.getItem('prozorko-cart') || 0; } catch {}
const cartCount = document.getElementById('cartCount');
cartCount.textContent = cart;
const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove('show'), 2500);
}
document.getElementById('addToCart').addEventListener('click', () => {
  const p = computePrice();
  cart += p.qty;
  cartCount.textContent = cart;
  try { localStorage.setItem('prozorko-cart', cart); } catch {}
  showToast(`✔ ${p.qty}× ${p.m.name.replace(' prozori', '')} dodano u košaricu – ${fmt(p.sale)}`);
});
document.getElementById('newsletter').addEventListener('submit', e => {
  e.preventDefault();
  e.target.reset();
  showToast('✔ Hvala! Prijava na newsletter je uspjela.');
});

// Mobile nav
document.getElementById('burger').addEventListener('click', () => document.getElementById('mainnav').classList.toggle('open'));

// Promo countdown: ends next Sunday midnight
const end = new Date();
end.setDate(end.getDate() + ((7 - end.getDay()) % 7 || 7));
end.setHours(23, 59, 59, 0);
const cd = document.getElementById('countdown');
function tick() {
  let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const pad = n => String(n).padStart(2, '0');
  cd.textContent = `${d}d ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
}
tick();
setInterval(tick, 1000);

update();
