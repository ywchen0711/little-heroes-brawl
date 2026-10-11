// Little Heroes Brawl: screens (menu, heroes & skills, shop, bag, stage / VS setup, results), input, the battle loop.
import { W, H, HEROES, HERO_IDS, ENEMIES, STAGES, GEAR, ITEMS, SLOTS, COMBOS, SKILL_MAX } from './data.js?v=3';
import * as P from './progress.js?v=3';
import * as F from './fight.js?v=3';
import { renderBattle, drawFighter, drawPortrait, drawItemIcon, setSfxLang } from './render.js?v=3';
import { t, L, getLang, setLang, skillDesc } from './i18n.js?v=3';
import * as A from './audio.js?v=3';

const $ = (s) => document.querySelector(s);
const cv = $('#cv'), cx = cv.getContext('2d'), scr = $('#screen');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);
let scale = 1, mode = 'menu', B = null, cfg = null, demo = null;
let PR = load();
let twoP = false; try { twoP = localStorage.getItem('lhb_2p') === '1'; } catch (e) { /* ignore */ }

// ------------------------------------------------------------------ save
function load() { try { const d = JSON.parse(localStorage.getItem('lhb_profile')); if (d && d.heroes) return P.fixProfile(d); } catch (e) { /* ignore */ } return P.newProfile(); }
function save() { try { localStorage.setItem('lhb_profile', JSON.stringify(PR)); } catch (e) { /* ignore */ } if (cloud) cloud.touch('little-heroes', 'lhb_profile'); }
// cloud saves (shared by every game on the site); the game keeps working if they are unavailable
let cloud = null;
import('/save.js').then(async (m) => { cloud = m; if (await m.pull('little-heroes', 'lhb_profile')) { PR = load(); if (mode === 'menu') menuScreen(); } }).catch(() => {});

// ------------------------------------------------------------------ layout
function resize() {
  const w = innerWidth, h = innerHeight, k = Math.min(w / W, h / H), dpr = Math.min(2.5, devicePixelRatio || 1);
  const cw = Math.floor(W * k), ch = Math.floor(H * k);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); scale = cv.width / W;
}
addEventListener('resize', resize); resize();
const hubBtn = (show) => { const h = document.getElementById('hub-back'); if (h) h.style.display = show ? '' : 'none'; };
const name = (e) => L(e.def);
const ELC = { fire: '#ff6a1a', ice: '#3ab0f0', elec: '#e8b820', chi: '#4a8aff', phys: '#8a8a9a', shadow: '#9a5ae8', nature: '#3ac85a', earth: '#b8864a', smoke: '#9a9aaa' };

// ------------------------------------------------------------------ keyboard layouts (comfortable two-hand positions)
// 1 player: left hand WASD (or arrows), right hand rests on J K L; skills sit right above (U I O) and below (M , .)
const KB1 = { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], A: ['KeyJ', 'KeyZ'], J: ['KeyK', 'KeyX', 'Space'], D: ['KeyL', 'KeyC'],
  run: ['ShiftLeft', 'ShiftRight'], skills: [['KeyU', 'Digit1'], ['KeyI', 'Digit2'], ['KeyO', 'Digit3'], ['KeyM', 'Digit4'], ['Comma', 'Digit5'], ['Period', 'Digit6']], items: ['KeyQ', 'KeyE', 'KeyR'] };
// 2 players on one keyboard: 1P left side (WASD + F G H), 2P right side (arrows + K L ; or numpad 1 2 3)
const KB2a = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], A: ['KeyF'], J: ['KeyG'], D: ['KeyH'], run: ['ShiftLeft'], skills: [['Digit1'], ['Digit2'], ['Digit3'], ['Digit4'], ['Digit5'], ['Digit6']], items: ['KeyR', 'KeyT', 'KeyY'] };
const KB2b = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], A: ['KeyK', 'Numpad1'], J: ['KeyL', 'Numpad2'], D: ['Semicolon', 'Numpad3'], run: ['ShiftRight', 'Numpad0'], skills: [['Numpad4'], ['Numpad5'], ['Numpad6'], ['Numpad7'], ['Numpad8'], ['Numpad9']], items: ['KeyI', 'KeyO', 'KeyP'] };
const SKILL_KEYS_1P = ['U', 'I', 'O', 'M', ',', '.'];

// ------------------------------------------------------------------ small canvas art for the menus
function artCanvas(w, h, draw) { const c = document.createElement('canvas'); const d = 2; c.width = w * d; c.height = h * d; c.style.width = w + 'px'; c.style.height = h + 'px'; c._draw = (g, tm) => { g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h); draw(g, w, h, tm); }; c._draw(c.getContext('2d'), 0); return c; }
// animated full-body hero art (redrawn every frame while visible)
const live = new Set();
function heroArt(id, w, h, o = {}) {
  const cvs = artCanvas(w, h, (g, ww, hh, tm) => {
    if (o.bg !== false) { const gr = g.createRadialGradient(ww / 2, hh * 0.62, 4, ww / 2, hh * 0.62, ww * 0.62); gr.addColorStop(0, HEROES[id].color + '66'); gr.addColorStop(1, HEROES[id].color + '00'); g.fillStyle = gr; g.fillRect(0, 0, ww, hh); }
    g.fillStyle = 'rgba(10,6,30,0.3)'; g.beginPath(); g.ellipse(ww / 2, hh - 10, ww * 0.22, 5, 0, 0, 7); g.fill();
    drawFighter(g, HEROES[id], ww / 2, hh - 10, o.face || 1, (hh - 20) / 98, { st: o.st || 'idle', anim: tm + (o.phase || 0), t: (tm * 1.3) % 0.5 });
  });
  live.add(cvs); return cvs;
}
function portrait(id, size = 56) { return artCanvas(size, size, (g, s) => { const gr = g.createRadialGradient(s / 2, s * 0.4, 2, s / 2, s / 2, s / 2); gr.addColorStop(0, HEROES[id].color + 'aa'); gr.addColorStop(1, HEROES[id].color + '33'); g.fillStyle = gr; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, 7); g.fill(); g.save(); g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, 7); g.clip(); drawPortrait(g, HEROES[id], s / 2 - 1, s / 2 + 3, s / 44); g.restore(); }); }
const TIER = ['#c8b8a0', '#c08a4a', '#a8b8d0', '#ffcc3a', '#c070ff'];
function gearIcon(id, size = 40) {
  const g0 = GEAR[id], tierCol = TIER[Math.min(4, Math.floor(g0.lv / 5))];
  return artCanvas(size, size, (g, s) => {
    g.translate(s / 2, s / 2); g.scale(s / 40, s / 40);
    const bg = g.createRadialGradient(0, -4, 2, 0, 0, 20); bg.addColorStop(0, tierCol + '55'); bg.addColorStop(1, tierCol + '00'); g.fillStyle = bg; g.fillRect(-20, -20, 40, 40);
    g.strokeStyle = '#1a1530'; g.lineWidth = 2.2; g.lineJoin = 'round';
    const f = (c2) => { g.fillStyle = c2; }, rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); g.stroke(); };
    if (g0.slot === 'glove') { f(tierCol); rr(-12, -10, 22, 18, 7); rr(-12, 6, 16, 9, 3); g.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 3; i++) g.fillRect(-9 + i * 6, -10, 1.5, 8); }
    if (g0.slot === 'wear') { f(tierCol); g.beginPath(); g.moveTo(-8, -13); g.lineTo(-18, -6); g.lineTo(-13, 2); g.lineTo(-10, 0); g.lineTo(-10, 14); g.lineTo(10, 14); g.lineTo(10, 0); g.lineTo(13, 2); g.lineTo(18, -6); g.lineTo(8, -13); g.lineTo(3, -10); g.lineTo(-3, -10); g.closePath(); g.fill(); g.stroke(); }
    if (g0.slot === 'shoes') { f(tierCol); rr(-14, -2, 28, 12, 5); rr(-14, -12, 12, 14, 4); g.fillStyle = '#fff'; g.fillRect(-13, 7, 26, 2.5); }
    if (g0.slot === 'charm') { g.strokeStyle = '#d8b060'; g.beginPath(); g.arc(0, -8, 8, Math.PI, 0); g.stroke(); const gem = { luckycoin: '#ffd040', manapendant: '#4a9aff', heartlocket: '#ff4a7a', expbadge: '#5ad85a', critring: '#ff5a2a', phoenix: '#ff9a2a' }[id]; f(gem); g.strokeStyle = '#1a1530'; g.beginPath(); if (id === 'heartlocket') { g.moveTo(0, 12); g.bezierCurveTo(-14, 2, -8, -10, 0, -3); g.bezierCurveTo(8, -10, 14, 2, 0, 12); } else g.arc(0, 2, 10, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(-3, -1, 3, 0, 7); g.fill(); }
  });
}
function itemIcon(id, size = 40) {
  return artCanvas(size, size, (g, s) => {
    g.translate(s / 2, s / 2); g.scale(s / 40, s / 40); g.strokeStyle = '#1a1530'; g.lineWidth = 2; g.lineJoin = 'round';
    const rr = (x, y, w, h, r, c2) => { g.fillStyle = c2; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); g.stroke(); };
    if (id === 'milk') drawItemIcon(g, 'milkbottle', 0, 2, 1.3);
    if (id === 'juice') { rr(-9, -10, 18, 24, 3, '#ff9a2a'); g.fillStyle = '#ffd040'; g.fillRect(-8, -9, 16, 5); g.fillStyle = '#fff'; g.fillRect(3, -18, 2.5, 10); }
    if (id === 'bento') { rr(-15, -9, 30, 20, 4, '#c83a2a'); rr(-12, -6, 24, 14, 3, '#fff8e0'); g.fillStyle = '#ff6a6a'; g.beginPath(); g.arc(4, 1, 4, 0, 7); g.fill(); g.fillStyle = '#5ad85a'; g.fillRect(-10, -3, 8, 8); }
    if (id === 'candy') { ['#ff5a5a', '#ffd040', '#5ad85a', '#4a9aff', '#c070ff'].forEach((c2, i) => { g.strokeStyle = c2; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 3 + i * 2.6, i, i + 4); g.stroke(); }); }
    if (id === 'energy') { rr(-8, -14, 16, 28, 4, '#2a6ae8'); g.fillStyle = '#ffe040'; g.beginPath(); g.moveTo(2, -10); g.lineTo(-4, 1); g.lineTo(1, 1); g.lineTo(-2, 10); g.lineTo(5, -2); g.lineTo(0, -2); g.fill(); }
    if (id === 'bomb') { g.fillStyle = '#2a2a3a'; g.beginPath(); g.arc(0, 3, 12, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#c8a060'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, -6); g.quadraticCurveTo(12, -14, 8, -18); g.stroke(); g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(8, -18, 3, 0, 7); g.fill(); }
  });
}
const keycap = (k, cls = '') => `<kbd class="${cls}">${k}</kbd>`;
const comboLabel = (i) => COMBOS[i].replace('D', '🛡').replace('>', '→').replace('^', '↑').replace('v', '↓').replace('A', '👊').replace('J', '⤴');

// ------------------------------------------------------------------ screens
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function btn(label, fn, cls = '') { const b = el('button', 'btn ' + cls, label); b.onclick = () => { A.unlock(); A.sfx('menu'); fn(); }; return b; }
function show(nodes, cls = '') { live.clear(); scr.className = 'screen ' + cls; scr.innerHTML = ''; for (const n of [].concat(nodes)) if (n) scr.appendChild(n); scr.classList.remove('hidden'); scr.scrollTop = 0; gpFocus = 0; }
function header(title, onBack) {
  const h = el('div', 'hdr');
  if (onBack) h.appendChild(btn('‹ ' + t('back'), onBack, 'ghost small'));
  h.appendChild(el('h2', '', title));
  h.appendChild(el('div', 'goldTag', `<i class="coin"></i>${PR.gold.toLocaleString()}`));
  return h;
}
let toastT = 0;
function toast(msg) { const tt = $('#toast'); tt.textContent = msg; tt.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => tt.classList.remove('on'), 1800); }

function menuScreen() {
  mode = 'menu'; hubBtn(true); $('#touch').classList.add('hidden'); A.music('menu');
  const box = el('div', 'menu');
  box.appendChild(el('div', 'logo', `<div class="l1">${t('title')}</div><div class="l2">${t('sub')}</div>`));
  const line = el('div', 'heroLine');
  HERO_IDS.forEach((id, i) => { const w = el('div', 'heroStand'); w.appendChild(heroArt(id, 120, 150, { phase: i * 0.7, bg: false })); w.appendChild(el('div', 'hsName', `${L(HEROES[id])}<small>Lv ${PR.heroes[id].lv}</small>`)); w.style.setProperty('--hc', HEROES[id].color); w.onclick = () => { A.unlock(); A.sfx('menu'); heroesScreen(id); }; line.appendChild(w); });
  box.appendChild(line);
  const grid = el('div', 'mgrid');
  grid.appendChild(btn(`<b>⚔</b>${t('story')}`, () => pickHeroes(stageScreen), 'big red'));
  grid.appendChild(btn(`<b>🌊</b>${t('survival')}`, () => pickHeroes((ids) => startBattle({ mode: 'survival', ids })), 'big blue'));
  grid.appendChild(btn(`<b>🥊</b>${t('vs')}`, () => pickHeroes(vsScreen), 'big green'));
  box.appendChild(grid);
  const g2 = el('div', 'mgrid sub');
  g2.appendChild(btn('⭐ ' + t('heroes'), () => heroesScreen(HERO_IDS[0])));
  g2.appendChild(btn('🛒 ' + t('shop'), () => shopScreen('glove')));
  g2.appendChild(btn('🎒 ' + t('bag'), bagScreen));
  box.appendChild(g2);
  const row = el('div', 'row');
  row.appendChild(btn(`👥 ${twoP ? t('p2') : t('p1')}`, () => { twoP = !twoP; try { localStorage.setItem('lhb_2p', twoP ? '1' : '0'); } catch (e) { /* ignore */ } menuScreen(); }, 'ghost small'));
  row.appendChild(btn('⌨ ' + t('howto'), howtoScreen, 'ghost small'));
  row.appendChild(btn(getLang() === 'zh' ? 'English' : '中文', () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); applyLang(); menuScreen(); }, 'ghost small'));
  row.appendChild(btn(`${A.soundOn() ? '🔊' : '🔇'} ${t('sound')}`, () => { A.setSound(!A.soundOn()); menuScreen(); }, 'ghost small'));
  box.appendChild(row);
  box.appendChild(el('div', 'stats', `<i class="coin"></i>${PR.gold.toLocaleString()} · ${t('kos')} ${PR.kos} · ${t('wins')} ${PR.wins}/${PR.battles}`));
  show(box, 'menuScr');
}
// the key layout drawn as key caps
function keyGuide() {
  const g = el('div', 'kguide');
  const p1 = twoP ? KB2a : KB1, zh = getLang() === 'zh';
  const row = (title, html) => `<div class="krow"><span class="kt">${title}</span><span class="kk">${html}</span></div>`;
  if (!twoP) {
    g.innerHTML = `<div class="kcol"><h4>${zh ? '左手' : 'Left hand'}</h4>${row(zh ? '移動' : 'Move', keycap('W') + keycap('A') + keycap('S') + keycap('D'))}${row(zh ? '跑步' : 'Run', keycap('Shift', 'wide') + (zh ? ' 或連按兩下' : ' or double-tap'))}${row(zh ? '道具' : 'Items', keycap('Q') + keycap('E') + keycap('R'))}</div>
      <div class="kcol"><h4>${zh ? '右手' : 'Right hand'}</h4>${row(zh ? '攻擊' : 'Attack', keycap('J', 'hot'))}${row(zh ? '跳' : 'Jump', keycap('K', 'hot'))}${row(zh ? '防禦' : 'Defend', keycap('L', 'hot'))}${row(zh ? '技能 1-3' : 'Skills 1-3', keycap('U') + keycap('I') + keycap('O'))}${row(zh ? '技能 4-6' : 'Skills 4-6', keycap('M') + keycap(',') + keycap('.'))}</div>
      <div class="kcol"><h4>${zh ? '也可以用' : 'Also works'}</h4>${row(zh ? '移動' : 'Move', keycap('←') + keycap('↑') + keycap('↓') + keycap('→'))}${row(zh ? '攻 跳 防' : 'Atk Jump Def', keycap('Z') + keycap('X') + keycap('C'))}${row(zh ? '暫停' : 'Pause', keycap('Esc', 'wide'))}</div>`;
  } else {
    g.innerHTML = `<div class="kcol"><h4>1P</h4>${row(zh ? '移動' : 'Move', keycap('W') + keycap('A') + keycap('S') + keycap('D'))}${row(zh ? '攻 跳 防' : 'Atk Jump Def', keycap('F', 'hot') + keycap('G', 'hot') + keycap('H', 'hot'))}${row(zh ? '道具' : 'Items', keycap('R') + keycap('T') + keycap('Y'))}${row(zh ? '技能' : 'Skills', keycap('1') + '…' + keycap('6'))}</div>
      <div class="kcol"><h4>2P</h4>${row(zh ? '移動' : 'Move', keycap('←') + keycap('↑') + keycap('↓') + keycap('→'))}${row(zh ? '攻 跳 防' : 'Atk Jump Def', keycap('K', 'hot') + keycap('L', 'hot') + keycap(';', 'hot'))}${row(zh ? '或數字鍵盤' : 'or numpad', keycap('1') + keycap('2') + keycap('3'))}${row(zh ? '道具' : 'Items', keycap('I') + keycap('O') + keycap('P'))}</div>`;
  }
  void p1;
  return g;
}
function howtoScreen() { show([header(t('howto'), menuScreen), el('div', 'card', `<h3>⌨ ${getLang() === 'zh' ? '鍵盤' : 'Keyboard'}</h3>`), keyGuide(), el('div', 'card howto', t('howtoText'))]); }

function heroCard(id, onClick, opts = {}) {
  const rec = PR.heroes[id], card = el('div', 'hcard' + (opts.sel ? ' sel' : '') + (opts.dis ? ' dis' : '') + (opts.mini ? ' mini' : ''));
  card.style.setProperty('--hc', HEROES[id].color);
  card.appendChild(opts.mini ? portrait(id, 44) : heroArt(id, 150, 170, { phase: HERO_IDS.indexOf(id) }));
  card.appendChild(el('div', 'hn', `${L(HEROES[id])}`));
  if (!opts.mini) card.appendChild(el('div', 'hr', L(HEROES[id].role)));
  card.appendChild(el('div', 'hl', `Lv ${rec.lv}${rec.sp ? ` · <span class="spdot">SP ${rec.sp}</span>` : ''}`));
  if (!opts.dis) card.onclick = () => { A.unlock(); A.sfx('menu'); onClick(id); };
  return card;
}
function pickHeroes(next) {
  const chosen = [];
  const step = () => {
    const grid = el('div', 'hgrid');
    for (const id of HERO_IDS) grid.appendChild(heroCard(id, (h) => { chosen.push(h); if (twoP && chosen.length < 2) step(); else next(chosen); }, { dis: chosen.includes(id) }));
    show([header(chosen.length ? t('chooseHero2') : t('chooseHero'), menuScreen), grid]);
  };
  step();
}
const STAGE_COL = ['#4aa84a', '#c8862a', '#e8604a', '#5a7aa8', '#7a3aa8'];
function stageScreen(ids) {
  const list = el('div', 'stages');
  STAGES.forEach((s, i) => {
    const open = i <= PR.cleared, row = el('div', 'stage' + (open ? '' : ' dis') + (i < PR.cleared ? ' done' : ''));
    const boss = s.waves[s.waves.length - 1][0][0];
    row.style.setProperty('--sc', STAGE_COL[i]);
    row.innerHTML = `<div class="snum">${i + 1}</div><div class="sinfo"><div class="sn">${L(s)}</div><div class="sm">${t('recLv')} ${s.lv} · 👑 ${L(ENEMIES[boss])}</div></div><div class="sst">${i < PR.cleared ? '✓' : open ? '▶' : '🔒'}</div>`;
    if (open) row.onclick = () => { A.unlock(); startBattle({ mode: 'stage', stage: i, ids }); };
    list.appendChild(row);
  });
  show([header(t('chooseStage'), () => pickHeroes(stageScreen)), list]);
}
function vsScreen(ids) {
  const s = cfg?.vs || { n: 1, lvMode: 0, ally: false, foes: [] };
  const lv = PR.heroes[ids[0]].lv, foeLv = Math.max(1, lv + [0, -3, 3, 8][s.lvMode]);
  const box = el('div', 'card');
  const row = (label, opts, cur, set) => { const r = el('div', 'optrow'); r.appendChild(el('span', '', label)); for (const [k, v] of opts) r.appendChild(btn(v, () => { set(k); cfg = { vs: s }; vsScreen(ids); }, 'small' + (cur === k ? ' on' : ''))); box.appendChild(r); };
  row(t('foes'), [[1, '1'], [2, '2'], [3, '3']], s.n, (k) => { s.n = k; });
  row(t('foeLv'), [[0, t('same')], [1, '-3'], [2, '+3'], [3, '+8']], s.lvMode, (k) => { s.lvMode = k; });
  if (!twoP) row(t('ally'), [[false, t('none')], [true, t('random')]], s.ally, (k) => { s.ally = k; });
  const foeRow = el('div', 'foes');
  while (s.foes.length < s.n) s.foes.push(null); s.foes.length = s.n;
  s.foes.forEach((f, i) => {
    const b = el('div', 'foe');
    b.appendChild(f ? portrait(f, 60) : el('div', 'q', '?'));
    b.appendChild(el('div', '', f ? L(HEROES[f]) : t('random')));
    b.onclick = () => { const order = [null, ...HERO_IDS]; s.foes[i] = order[(order.indexOf(f) + 1) % order.length]; cfg = { vs: s }; vsScreen(ids); };
    foeRow.appendChild(b);
  });
  box.appendChild(foeRow);
  box.appendChild(el('div', 'sm', `${t('foeLv')}: ${foeLv}`));
  box.appendChild(btn('🥊 ' + t('start'), () => {
    const pick = (avoid) => { const pool = HERO_IDS.filter((h) => !avoid.includes(h)); const list = pool.length ? pool : HERO_IDS; return list[Math.floor(Math.random() * list.length)]; };
    const used = [...ids]; const foes = s.foes.map((f) => { const h = f || pick(used); used.push(h); return { hero: h, lv: foeLv }; });
    const ally = s.ally && !twoP ? { hero: pick(used), lv } : null;
    cfg = { vs: s }; startBattle({ mode: 'vs', ids, foes, ally });
  }, 'big red'));
  show([header(t('vsSetup'), () => pickHeroes(vsScreen)), box]);
}

// ---- heroes & skills
function heroesScreen(id) {
  const rec = PR.heroes[id], h = HEROES[id], st = P.heroStats(rec, id);
  const tabs = el('div', 'htabs'); for (const k of HERO_IDS) tabs.appendChild(heroCard(k, heroesScreen, { sel: k === id, mini: true }));
  const det = el('div', 'card hdet'); det.style.setProperty('--hc', h.color);
  const top = el('div', 'htop'); top.appendChild(heroArt(id, 170, 210, {}));
  const need = P.expToNext(rec);
  top.appendChild(el('div', 'hinfo', `<h3>${L(h)} <small>Lv ${rec.lv}</small></h3><div class="role">${L(h.role)}</div><p class="sm">${L(h.d)}</p>
    <div class="expbar"><i style="width:${Math.min(100, rec.exp / need * 100)}%"></i><span>${t('exp')} ${rec.exp.toLocaleString()} / ${need.toLocaleString()}</span></div>
    <div class="stgrid"><span>❤ ${t('hp')}<b>${st.mhp}</b></span><span>💧 ${t('mp')}<b>${st.mmp}</b></span><span>👊 ${t('atk')}<b>${Math.round(st.atk * 100)}</b></span><span>🛡 ${t('def')}<b>${Math.round(st.def)}</b></span><span>👟 ${t('spd')}<b>${Math.round(st.spd)}</b></span><span class="sp">✨ ${t('sp')}<b>${rec.sp}</b></span></div>`));
  det.appendChild(top);
  det.appendChild(el('div', 'sect', t('equipment')));
  const eq = el('div', 'eqrow');
  for (const slot of SLOTS) {
    const cur = rec.equip[slot], b = el('div', 'eqslot' + (cur ? ' has' : ''));
    b.appendChild(cur ? gearIcon(cur, 38) : el('div', 'q', '＋'));
    b.appendChild(el('div', 'sm', `<b>${t(slot)}</b><br>${cur ? L(GEAR[cur]) : t('empty')}`));
    b.onclick = () => gearPicker(id, slot);
    eq.appendChild(b);
  }
  det.appendChild(eq);
  det.appendChild(el('div', 'sect', `${t('skills')} <span class="spdot big">✨ ${t('sp')} ${rec.sp}</span>`));
  h.skills.forEach((s, i) => {
    const L0 = rec.skills[i] || 0, sk = P.skillAt(s, Math.max(1, L0)), row = el('div', 'skill' + (L0 ? '' : ' unl'));
    row.style.setProperty('--ec', ELC[s.elem] || '#888');
    const dots = Array.from({ length: SKILL_MAX }, (_, k) => `<i class="${k < L0 ? 'on' : ''}"></i>`).join('');
    const key = twoP ? '' : keycap(SKILL_KEYS_1P[i], 'sm');
    row.innerHTML = `<div class="combo">${key}<small>${comboLabel(i)}</small></div>
      <div class="sk"><b>${L(s)}</b> <span class="dots">${dots}</span><div class="sm">${skillDesc(sk)} · ${t('mpCost')} ${sk.mp}</div></div>`;
    const can = P.canRaise(rec, i);
    let label = L0 ? t('upgrade') : t('learn'), sub = '';
    if (L0 >= SKILL_MAX) label = t('maxed'); else if (!can.ok) sub = can.why === 'lv' ? `${t('needLv')} ${can.need}` : t('needSp');
    const b = btn(label + (sub ? `<small>${sub}</small>` : ''), () => { if (P.raiseSkill(rec, i)) { A.sfx('level'); save(); heroesScreen(id); } else A.sfx('nomp'); }, 'small skb' + (can.ok ? ' go' : ''));
    if (L0 >= SKILL_MAX) b.disabled = true;
    row.appendChild(b); det.appendChild(row);
  });
  show([header(t('heroes'), menuScreen), tabs, det]);
}
function gearPicker(heroId, slot) {
  const rec = PR.heroes[heroId], list = el('div', 'list');
  const ids = Object.keys(PR.gear).filter((g) => GEAR[g].slot === slot);
  if (rec.equip[slot]) list.appendChild(btn(t('unequip') + ': ' + L(GEAR[rec.equip[slot]]), () => { P.equip(PR, heroId, rec.equip[slot]); save(); heroesScreen(heroId); }, 'ghost small'));
  for (const g of ids) {
    const r = el('div', 'irow' + (rec.equip[slot] === g ? ' sel' : '')); r.appendChild(gearIcon(g));
    r.appendChild(el('div', 'in', `<b>${L(GEAR[g])}</b><div class="sm">${gearText(GEAR[g])} · ${t('owned')} ${PR.gear[g]}</div>`));
    r.onclick = () => { if (P.equip(PR, heroId, g)) { A.sfx('buy'); save(); heroesScreen(heroId); } else toast('❌'); };
    list.appendChild(r);
  }
  if (!ids.length) list.appendChild(el('div', 'card sm', getLang() === 'zh' ? '還沒有這類裝備，去商店買吧！' : 'You have none yet — visit the Shop!'));
  list.appendChild(btn('🛒 ' + t('shop'), () => shopScreen(slot), 'small'));
  show([header(`${L(HEROES[heroId])} · ${t(slot)}`, () => heroesScreen(heroId)), list]);
}
function gearText(g) {
  const p = [], zh = getLang() === 'zh';
  if (g.atk) p.push(`${t('atk')} +${g.atk}%`); if (g.def) p.push(`${t('def')} +${g.def}`); if (g.hp) p.push(`${t('hp')} +${g.hp}`); if (g.mp) p.push(`${t('mp')} +${g.mp}`);
  if (g.spd) p.push(`${t('spd')} +${g.spd}%`); if (g.jump) p.push(zh ? '跳更高' : 'higher jumps'); if (g.mpRegen) p.push(zh ? '魔力回復快' : 'faster MP');
  if (g.goldUp) p.push(`${t('gold')} +${g.goldUp * 100}%`); if (g.expUp) p.push(`${t('exp')} +${g.expUp * 100}%`); if (g.crit) p.push((zh ? '會心 +' : 'Crit +') + g.crit * 100 + '%');
  if (g.revive) p.push(zh ? `倒下時復活一次（${g.revive * 100}% 體力）` : `Revive once (${g.revive * 100}% HP)`);
  return p.join(' · ');
}
function itemText(it) { const p = []; if (it.hp) p.push(`${t('hp')} +${it.hp}`); if (it.mp) p.push(it.mp > 500 ? `${t('mp')} MAX` : `${t('mp')} +${it.mp}`); if (it.bomb) p.push(getLang() === 'zh' ? `丟出去爆炸 ${it.bomb}` : `Throw it: boom ${it.bomb}`); return p.join(' · '); }

// ---- shop
function shopScreen(tab) {
  const tabs = el('div', 'tabs');
  for (const k of [...SLOTS, 'items', 'sell']) tabs.appendChild(btn(k === 'items' ? t('items') : k === 'sell' ? t('sell') : t(k), () => shopScreen(k), 'small' + (k === tab ? ' on' : '')));
  const list = el('div', 'list'), topLv = Math.max(...HERO_IDS.map((h) => PR.heroes[h].lv));
  const priceBtn = (price, fn, sell) => btn(`<i class="coin"></i>${sell ? '+' : ''}${price.toLocaleString()}`, fn, 'small price' + (sell ? ' sell' : PR.gold < price ? ' poor' : ''));
  if (SLOTS.includes(tab)) for (const [id, g] of Object.entries(GEAR).filter(([, g]) => g.slot === tab)) {
    const lock = topLv < g.lv, r = el('div', 'irow' + (lock ? ' dis' : '')); r.appendChild(gearIcon(id));
    r.appendChild(el('div', 'in', `<b>${L(g)}</b><div class="sm">${gearText(g)}${PR.gear[id] ? ` · ${t('owned')} ${PR.gear[id]}` : ''}${lock ? ` · 🔒 ${t('needLv')} ${g.lv}` : ''}</div>`));
    r.appendChild(priceBtn(g.price, () => { if (lock) return; if (P.buyGear(PR, id)) { A.sfx('buy'); toast(t('bought') + ' ' + L(g)); save(); shopScreen(tab); } else { A.sfx('nomp'); toast(t('noGold')); } }));
    list.appendChild(r);
  }
  if (tab === 'items') for (const [id, it] of Object.entries(ITEMS)) {
    const r = el('div', 'irow'); r.appendChild(itemIcon(id));
    r.appendChild(el('div', 'in', `<b>${L(it)}</b><div class="sm">${itemText(it)} · ${t('owned')} ${PR.inv[id] || 0}</div>`));
    r.appendChild(priceBtn(it.price, () => { if (P.buyItem(PR, id)) { A.sfx('buy'); toast(t('bought') + ' ' + L(it)); save(); shopScreen(tab); } else { A.sfx('nomp'); toast(t('noGold')); } }));
    list.appendChild(r);
  }
  if (tab === 'sell') for (const id of Object.keys(PR.gear)) {
    const free = P.freeCopies(PR, id), r = el('div', 'irow' + (free < 1 ? ' dis' : '')); r.appendChild(gearIcon(id));
    r.appendChild(el('div', 'in', `<b>${L(GEAR[id])}</b><div class="sm">${t('owned')} ${PR.gear[id]}${free < 1 ? ' · ' + t('wornBy') : ''}</div>`));
    r.appendChild(priceBtn(P.sellGearPrice(id), () => { if (P.sellGear(PR, id)) { A.sfx('buy'); toast(t('sold')); save(); shopScreen(tab); } }, true));
    list.appendChild(r);
  }
  show([header(t('shop'), menuScreen), tabs, list]);
}
// ---- bag
function bagScreen() {
  const list = el('div', 'list');
  list.appendChild(el('div', 'sect', t('quick')));
  const keys = twoP ? ['R / I', 'T / O', 'Y / P'] : ['Q', 'E', 'R'];
  for (let s = 0; s < 3; s++) {
    const r = el('div', 'optrow'); r.appendChild(el('span', '', `${keycap(keys[s], 'sm')} ${t('slot')} ${s + 1}`));
    for (const id of [null, ...Object.keys(ITEMS)]) r.appendChild(btn(id ? L(ITEMS[id]) + ` ×${PR.inv[id] || 0}` : t('empty'), () => { P.setQuick(PR, s, id); save(); bagScreen(); }, 'small' + (PR.quick[s] === id ? ' on' : '')));
    list.appendChild(r);
  }
  list.appendChild(el('div', 'sect', t('items')));
  for (const [id, n] of Object.entries(PR.inv)) { if (!n) continue; const r = el('div', 'irow'); r.appendChild(itemIcon(id)); r.appendChild(el('div', 'in', `<b>${L(ITEMS[id])} ×${n}</b><div class="sm">${itemText(ITEMS[id])}</div>`)); list.appendChild(r); }
  list.appendChild(el('div', 'sect', t('equipment')));
  for (const [id, n] of Object.entries(PR.gear)) { const r = el('div', 'irow'); r.appendChild(gearIcon(id)); r.appendChild(el('div', 'in', `<b>${L(GEAR[id])} ×${n}</b><div class="sm">${gearText(GEAR[id])}</div>`)); list.appendChild(r); }
  show([header(t('bag'), menuScreen), list]);
}

// ------------------------------------------------------------------ battle
function startBattle(o) {
  cfg = { ...cfg, last: o };
  const players = o.ids.map((id) => ({ hero: id, rec: PR.heroes[id] }));
  B = F.newBattle({ mode: o.mode, stage: o.stage, players, foes: o.foes, ally: o.ally, inv: PR.inv, quick: PR.quick, seed: Date.now() });
  B.cfg = o; B.bg = o.mode === 'stage' ? STAGES[o.stage].bg : o.mode === 'vs' ? 'dojo' : ['park', 'forest', 'village', 'factory', 'castle'][Math.floor(Math.random() * 5)];
  mode = 'battle'; scr.classList.add('hidden'); hubBtn(false);
  if (isTouch) { $('#touch').classList.remove('hidden'); buildSkillButtons(); }
  else showHint();
  A.music(B.bg); resetInput();
}
let hintT = 0;
function showHint() {
  let seen = 0; try { seen = +(localStorage.getItem('lhb_hint') || 0); } catch (e) { /* ignore */ }
  if (seen >= 3) return;
  try { localStorage.setItem('lhb_hint', String(seen + 1)); } catch (e) { /* ignore */ }
  const h = $('#hint'), zh = getLang() === 'zh';
  h.innerHTML = twoP ? `1P ${keycap('WASD', 'wide')} ${keycap('F')}${keycap('G')}${keycap('H')} · 2P ${keycap('← ↑ ↓ →', 'wide')} ${keycap('K')}${keycap('L')}${keycap(';')}`
    : `${keycap('WASD', 'wide')} ${zh ? '移動' : 'move'} · ${keycap('J', 'hot')} ${zh ? '攻擊' : 'attack'} ${keycap('K', 'hot')} ${zh ? '跳' : 'jump'} ${keycap('L', 'hot')} ${zh ? '防禦' : 'defend'} · ${keycap('U')}${keycap('I')}${keycap('O')} ${keycap('M')}${keycap(',')}${keycap('.')} ${zh ? '技能' : 'skills'} · ${keycap('Q')}${keycap('E')}${keycap('R')} ${zh ? '道具' : 'items'}`;
  h.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('on'), 7000);
}
function endBattle() {
  $('#hint').classList.remove('on');
  const res = F.result(B), ids = B.cfg.ids;
  const out = P.applyRewards(PR, ids, res);
  if (B.mode === 'stage' && res.win) PR.cleared = Math.max(PR.cleared, B.cfg.stage + 1);
  if (B.mode === 'survival') PR.best = Math.max(PR.best, res.waves);
  save();
  mode = 'result'; $('#touch').classList.add('hidden'); hubBtn(true);
  A.music(res.win ? 'win' : 'menu'); if (!res.win) A.sfx('lose');
  const box = el('div', 'card result');
  box.appendChild(el('div', 'big ' + (res.win ? 'win' : 'lose'), B.mode === 'survival' ? t('survived', { n: res.waves }) : res.win ? t('win') : t('lose')));
  for (const id of ids) {
    const h = out.heroes[id], r = el('div', 'resrow'); r.appendChild(heroArt(id, 90, 110, { bg: false, st: res.win ? 'idle' : 'stun' }));
    const rec = PR.heroes[id];
    r.appendChild(el('div', '', `<b class="rn">${L(HEROES[id])}</b> Lv ${h.lv0}${h.lv > h.lv0 ? ` → <b class="up">Lv ${h.lv}!</b>` : ''}<br><span class="gain">+${h.exp.toLocaleString()} EXP</span><div class="expbar"><i style="width:${Math.min(100, rec.exp / P.expToNext(rec) * 100)}%"></i></div>${h.ups ? `<div class="sm up">✨ ${t('newSp')}</div>` : ''}`));
    box.appendChild(r);
    if (h.ups) A.sfx('level');
  }
  box.appendChild(el('div', 'goldline', `<i class="coin"></i>+${out.gold.toLocaleString()} · ${t('kos')} ${res.kos}`));
  const row = el('div', 'row');
  if (B.mode === 'stage' && res.win && B.cfg.stage + 1 < STAGES.length) row.appendChild(btn('➡ ' + t('next'), () => startBattle({ ...B.cfg, stage: B.cfg.stage + 1 }), 'big red'));
  row.appendChild(btn('🔁 ' + t('again'), () => startBattle(B.cfg), 'big'));
  row.appendChild(btn('⭐ ' + t('heroes'), () => heroesScreen(ids[0]), 'ghost'));
  row.appendChild(btn('🏠 ' + t('toMenu'), menuScreen, 'ghost'));
  box.appendChild(row);
  show(box, 'resScr');
}
function pauseScreen() {
  mode = 'pause'; resetInput();
  const box = el('div', 'card pause');
  box.appendChild(el('div', 'big', t('paused')));
  box.appendChild(btn('▶ ' + t('resume'), resume, 'big'));
  box.appendChild(btn('🚪 ' + t('quit'), () => { B.over = B.over || { win: false }; endBattle(); }, 'ghost'));
  show([box, keyGuide()], 'pauseScr');
}
function resume() { scr.classList.add('hidden'); mode = 'battle'; resetInput(); }

// ------------------------------------------------------------------ input
const keys = new Set();
const pressedOnce = []; // queued one-shot actions: [pi, 'skill'|'item', n]
const maps = () => (twoP ? [KB2a, KB2b] : [KB1]);
addEventListener('keydown', (e) => {
  A.unlock(); gpActive = false;
  if (mode === 'battle' && e.code === 'Escape') { pauseScreen(); e.preventDefault(); return; }
  if (mode === 'pause' && e.code === 'Escape') { resume(); e.preventDefault(); return; }
  if (e.repeat) { if (mode === 'battle') e.preventDefault(); return; }
  keys.add(e.code);
  if (mode === 'battle') {
    maps().forEach((m, pi) => {
      m.skills.forEach((list, i) => { if (list.includes(e.code)) pressedOnce.push([pi, 'skill', i]); });
      const k = m.items.indexOf(e.code); if (k >= 0) pressedOnce.push([pi, 'item', k]);
    });
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
function resetInput() { keys.clear(); pressedOnce.length = 0; for (const s of pstate) Object.assign(s, { prev: {}, running: 0, lastTap: {} }); touch.x = touch.z = 0; touch.A = touch.J = touch.D = 0; }
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (mode === 'battle') pauseScreen(); } });
const anyKey = (list) => list.some((k) => keys.has(k));
// gamepads
let gpActive = false, gpFocus = 0;
function pads() { const out = []; const list = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of list) if (g && g.connected && g.buttons.length) out.push(g); return out; }
function padRaw(g) {
  const b = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5)), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
  return { x: (b(15) || ax > 0.45 ? 1 : 0) - (b(14) || ax < -0.45 ? 1 : 0), z: (b(13) || ay > 0.5 ? 1 : 0) - (b(12) || ay < -0.5 ? 1 : 0), A: b(2), J: b(0), D: b(1), i0: b(4), i1: b(5), i2: b(3), start: b(9), run: Math.abs(ax) > 0.92 || b(7) };
}
addEventListener('gamepadconnected', () => { A.unlock(); toast(t('padOn')); });
const touch = { x: 0, z: 0, A: 0, J: 0, D: 0, run: 0 };
const pstate = [{ prev: {}, running: 0, lastTap: {} }, { prev: {}, running: 0, lastTap: {} }];
const lastPadBtns = [{}, {}];
function readInputs() {
  const n = B.players.length, out = [], pl = pads();
  for (let pi = 0; pi < n; pi++) {
    const r = { x: 0, z: 0, A: 0, J: 0, D: 0, run: 0 };
    const add = (o) => { if (o.x) r.x = o.x; if (o.z) r.z = o.z; r.A ||= o.A; r.J ||= o.J; r.D ||= o.D; r.run ||= o.run; };
    const m = maps()[pi];
    if (m) add({ x: (anyKey(m.right) ? 1 : 0) - (anyKey(m.left) ? 1 : 0), z: (anyKey(m.down) ? 1 : 0) - (anyKey(m.up) ? 1 : 0), A: anyKey(m.A), J: anyKey(m.J), D: anyKey(m.D), run: anyKey(m.run) });
    const myPads = twoP ? pl.filter((_, i) => i === pi) : pl;
    for (const g of myPads) {
      const pr = padRaw(g); add(pr); if (pr.x || pr.z || pr.A || pr.J || pr.D) gpActive = true;
      const slot = twoP ? pi : 0, lb = lastPadBtns[slot] || {};
      ['i0', 'i1', 'i2'].forEach((k, k2) => { if (pr[k] && !lb[k]) pressedOnce.push([pi, 'item', k2]); });
      lastPadBtns[slot] = pr;
      if (pr.start && !lb.start) { pauseScreen(); return null; }
    }
    if (pi === 0) add(touch);
    const s = pstate[pi], pv = s.prev, inp = F.blankInput();
    inp.x = r.x; inp.z = r.z; inp.A = r.A; inp.J = r.J; inp.D = r.D;
    inp.pA = r.A && !pv.A ? 1 : 0; inp.pJ = r.J && !pv.J ? 1 : 0; inp.pD = r.D && !pv.D ? 1 : 0;
    inp.dirs = { r: r.x > 0 && !(pv.x > 0), l: r.x < 0 && !(pv.x < 0), u: r.z < 0 && !(pv.z < 0), d: r.z > 0 && !(pv.z > 0) };
    const now = performance.now();
    for (const dir of ['l', 'r']) if (inp.dirs[dir]) { if (now - (s.lastTap[dir] || 0) < 280) s.running = dir === 'r' ? 1 : -1; s.lastTap[dir] = now; }
    if (r.x !== s.running) s.running = 0;
    inp.run = s.running || (r.run && r.x) ? 1 : 0;
    s.prev = r; out.push(inp);
  }
  for (const [pi, k, v] of pressedOnce) if (out[pi]) { if (k === 'skill') out[pi].skill = v; else out[pi].item = v; }
  pressedOnce.length = 0;
  return out;
}
// touch controls
const stick = $('#stick'), knob = $('#stick .knob');
let stickId = null;
function stickMove(e) {
  const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = r.width / 2, d = Math.hypot(dx, dy), k = d > m ? m / d : 1;
  knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  touch.x = Math.abs(dx) > 14 ? Math.sign(dx) : 0; touch.z = Math.abs(dy) > 14 ? Math.sign(dy) : 0; touch.run = Math.abs(dx) > m * 0.92 ? 1 : 0;
}
function stickEnd() { stickId = null; touch.x = touch.z = touch.run = 0; knob.style.transform = ''; }
stick.addEventListener('pointerdown', (e) => { A.unlock(); stickId = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } stickMove(e); e.preventDefault(); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(ev, (e) => { if (e.pointerId === stickId) stickEnd(); });
addEventListener('touchend', (e) => { if (!e.touches.length) { stickEnd(); touch.A = touch.J = touch.D = 0; document.querySelectorAll('.tb.on').forEach((b) => b.classList.remove('on')); } });
document.querySelectorAll('#touch [data-k]').forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); A.unlock(); b.classList.add('on'); if (k === 'pause') { if (mode === 'battle') pauseScreen(); return; } if (k.startsWith('i')) { pressedOnce.push([0, 'item', +k[1]]); return; } touch[k] = 1; try { b.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { b.classList.remove('on'); if (touch[k] !== undefined) touch[k] = 0; });
});
function buildSkillButtons() {
  const box = $('#skillBtns'); box.innerHTML = '';
  B.players[0].skills.forEach((s, i) => {
    if (!s) return;
    const b = el('button', 'sbtn', `${L(s)}<small>${s.mp}</small>`); b.dataset.slot = i;
    b.style.setProperty('--ec', ELC[s.elem] || '#888');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); A.unlock(); pressedOnce.push([0, 'skill', i]); });
    box.appendChild(b);
  });
  ['i0', 'i1', 'i2'].forEach((k, n) => { const id = PR.quick[n]; const b = $(`#touch [data-k="${k}"]`); if (b) b.textContent = id ? (getLang() === 'zh' ? ITEMS[id].zh.slice(0, 2) : ITEMS[id].en.slice(0, 4)) + ' ' + (PR.inv[id] || 0) : '—'; });
}
// gamepad menu navigation: the d-pad moves a highlight, A presses, B goes back
let gpPrev = {}, gpRep = 0;
function menuPad(dt) {
  const pl = pads(); if (!pl.length) return;
  const r = padRaw(pl[0]), pv = gpPrev; gpPrev = r;
  if (r.x || r.z || r.A || r.J || r.D) gpActive = true;
  if (!gpActive) return;
  const items = [...scr.querySelectorAll('button:not([disabled]), .hcard:not(.dis), .stage:not(.dis), .eqslot, .irow:not(.dis), .foe, .heroStand')].filter((e) => e.offsetParent !== null);
  document.querySelectorAll('.gpf').forEach((e) => e.classList.remove('gpf'));
  if (!items.length) return;
  const dir = r.z < 0 || r.x < 0 ? -1 : r.z > 0 || r.x > 0 ? 1 : 0, was = pv.z < 0 || pv.x < 0 ? -1 : pv.z > 0 || pv.x > 0 ? 1 : 0;
  if (dir && dir !== was) { gpFocus = (gpFocus + dir + items.length) % items.length; gpRep = 0.4; A.sfx('menu'); }
  else if (dir) { gpRep -= dt; if (gpRep <= 0) { gpFocus = (gpFocus + dir + items.length) % items.length; gpRep = 0.1; } }
  gpFocus = Math.max(0, Math.min(items.length - 1, gpFocus));
  const f = items[gpFocus]; f.classList.add('gpf'); if (dir) f.scrollIntoView({ block: 'nearest' });
  if (r.J && !pv.J) { A.unlock(); f.click(); }
  if ((r.D && !pv.D) || (r.start && !pv.start)) { if (mode === 'pause') resume(); else { const back = scr.querySelector('.hdr .btn'); if (back) back.click(); } }
}

// ------------------------------------------------------------------ loop
function applyLang() { setSfxLang(getLang()); document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en'; document.title = t('title') + (getLang() === 'zh' ? ' Little Heroes Brawl' : ''); }
applyLang();
let last = 0, acc = 0, lastFrame = 0, artT = 0;
setInterval(() => { const n = performance.now(); if (!document.hidden && n - lastFrame > 120) frame(n, true); }, 40);
function newDemo() {
  const ids = HERO_IDS.slice().sort(() => Math.random() - 0.5);
  demo = F.newBattle({ mode: 'stage', stage: Math.floor(Math.random() * 3), players: [{ hero: ids[0], rec: P.cpuHeroRec(ids[0], 14) }, { hero: ids[1], rec: P.cpuHeroRec(ids[1], 14) }], seed: Date.now() });
  demo.bg = ['park', 'forest', 'village', 'factory', 'castle'][Math.floor(Math.random() * 5)];
}
const ro = (b) => ({ bg: b.bg, name, stageName: b.stage ? L(b.stage) : '', dt: 1 / 60 });
function frame(now, fallback) {
  if (!fallback) requestAnimationFrame(frame);
  lastFrame = performance.now();
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000 || 0)); last = Math.max(last, now);   // timer and animation-frame clocks can disagree
  if (mode === 'battle') {
    acc += dt; let n = 0;
    if (window.__freeze) acc = 0;
    while (acc >= 1 / 60 && n < 4) {
      const inputs = readInputs(); if (!inputs) break;
      F.update(B, 1 / 60, inputs); n++; acc -= 1 / 60; events();
      if (B.over && B.overT > 2.4) { endBattle(); break; }
    }
    if (acc > 0.1) acc = 0;
    if (isTouch && B) document.querySelectorAll('#skillBtns .sbtn').forEach((b) => { const s = B.players[0].skills[+b.dataset.slot]; b.classList.toggle('low', !!s && B.players[0].mp < s.mp); });
    renderBattle(cx, B, scale, { ...ro(B), dt });
  } else if (mode === 'pause' || mode === 'result') { menuPad(dt); renderBattle(cx, B, scale, { ...ro(B), dt: 0 }); }
  else {
    menuPad(dt);
    if (!demo || demo.over && demo.overT > 2) newDemo();
    if (!window.__freeze) F.update(demo, dt, demo.players.map((p) => F.botInput(demo, p, dt))); demo.ev.length = 0; demo.banner = null;
    renderBattle(cx, demo, scale, { ...ro(demo), dt, noHud: true });
  }
  // animate the hero art in menus
  artT += dt;
  if (mode !== 'battle') for (const c of live) { if (!c.isConnected) { live.delete(c); continue; } c._draw(c.getContext('2d'), artT); }
}
function events() {
  for (const e of B.ev.splice(0)) {
    if (e.t === 'sfx') A.sfx(e.id);
    if (e.t === 'boss') A.music('boss');
    if (e.t === 'win') A.music('win');
  }
}
requestAnimationFrame(frame);
menuScreen();
window.__lhb = { get B() { return B; }, get PR() { return PR; }, P, F, startBattle, menuScreen, heroesScreen, shopScreen, bagScreen, pickHeroes, stageScreen, vsScreen, endBattle, pauseScreen, howtoScreen, resume, get mode() { return mode; },
  step(n, inps) { for (let i = 0; i < n; i++) { F.update(B, 1 / 60, inps ? inps(B) : B.players.map((p) => F.botInput(B, p, 1 / 60))); events(); } }, setProfile(p) { PR = P.fixProfile(p); save(); } };
