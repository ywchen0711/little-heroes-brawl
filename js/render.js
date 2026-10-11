// Drawing: stage backgrounds, chibi fighters with poses, skills and effects, items, the battle HUD.
import { W, H, GROUND, ZD, HEROES, ENEMIES, PICKUPS } from './data.js?v=1';

let c = null;
const EL = { fire: ['#ff6a1a', '#ffd040', '#c8200a'], ice: ['#7ad8ff', '#e8f8ff', '#2a8ad8'], elec: ['#ffe040', '#ffffff', '#c89a10'], chi: ['#6ac8ff', '#ffffff', '#2a6ae8'],
  phys: ['#e8e0d0', '#ffffff', '#8a7a6a'], shadow: ['#9a5ae8', '#e0c8ff', '#3a1a6a'], nature: ['#5ad85a', '#d8ffb0', '#2a8a2a'], earth: ['#b8864a', '#e8c890', '#6a4a2a'], smoke: ['#b8b8c8', '#f0f0f8', '#6a6a7a'] };
const col = (e, i = 0) => (EL[e] || EL.phys)[i];
function rr(x, y, w, h, r, fill) { c.fillStyle = fill; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fill(); }
function circ(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, 7); c.fill(); }
function ell(x, y, rx, ry, fill) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 7); c.fill(); }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; }
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// ------------------------------------------------------------------ backgrounds (parallax by the camera)
const BG = {
  park: { sky: ['#7ec8f8', '#d8f0ff'], far: '#8ac87a', near: '#5aa84a', floor: '#8ad06a', floor2: '#7ac05a', path: '#e0c890' },
  forest: { sky: ['#3a6a5a', '#9ac8a0'], far: '#2a5a3a', near: '#1e4a2a', floor: '#5a8a3a', floor2: '#4e7a32', path: '#8a6a4a' },
  village: { sky: ['#f0a070', '#ffe0b0'], far: '#8a5a6a', near: '#5a3a3a', floor: '#c8a070', floor2: '#b89060', path: '#d8b888' },
  factory: { sky: ['#3a4250', '#6a7280'], far: '#4a5260', near: '#3a4050', floor: '#7a8290', floor2: '#6a7280', path: '#c8a030' },
  castle: { sky: ['#1a0a2a', '#5a2a5a'], far: '#2a1a3a', near: '#1a1028', floor: '#5a5068', floor2: '#4e4560', path: '#7a2a3a' },
  dojo: { sky: ['#f4e0b0', '#fff4d8'], far: '#c89a60', near: '#a87840', floor: '#d8b078', floor2: '#c8a068', path: '#b83a2a' },
};
function background(B, bgId) {
  const P = BG[bgId] || BG.park, cam = B.cam;
  const g = c.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, GROUND);
  const r = rng(7);
  if (bgId === 'park' || bgId === 'dojo' || bgId === 'village') for (let i = 0; i < 6; i++) { const x = ((r() * 1600 - cam * 0.1 + B.t * 6) % 1600 + 1600) % 1600 - 200, y = 30 + r() * 80; ell(x, y, 40, 14, 'rgba(255,255,255,0.8)'); ell(x + 26, y - 8, 28, 14, 'rgba(255,255,255,0.8)'); }
  if (bgId === 'castle') { circ(620 - cam * 0.05, 70, 34, '#f0e8ff'); circ(608 - cam * 0.05, 62, 34, P.sky[0]); for (let i = 0; i < 40; i++) circ(r() * W, r() * 180, 1, '#ffffff'); }
  if (bgId === 'village') circ(640 - cam * 0.05, 120, 50, '#ffd890');
  // far layer
  c.fillStyle = P.far;
  const f = -cam * 0.3;
  if (bgId === 'factory') { for (let i = -1; i < 9; i++) { const x = ((i * 160 + f) % 1440 + 1440) % 1440 - 160; c.fillRect(x, 90, 110, GROUND - 90); c.fillRect(x + 20, 50, 18, 40); circ(x + 29, 44 - (B.t * 20 + i * 10) % 30, 8, 'rgba(200,200,210,0.4)'); c.fillStyle = P.far; for (let w = 0; w < 3; w++) { c.fillStyle = '#e8c860'; c.fillRect(x + 14 + w * 30, 120, 14, 10); c.fillStyle = P.far; } } }
  else if (bgId === 'castle') { for (let i = -1; i < 7; i++) { const x = ((i * 220 + f) % 1540 + 1540) % 1540 - 220; c.fillRect(x, 120, 140, GROUND); c.fillRect(x + 50, 60, 40, 60); c.beginPath(); c.moveTo(x + 45, 60); c.lineTo(x + 70, 20); c.lineTo(x + 95, 60); c.fill(); c.fillStyle = '#ffb040'; c.fillRect(x + 64, 80, 10, 14); c.fillStyle = P.far; } }
  else if (bgId === 'village') { for (let i = -1; i < 8; i++) { const x = ((i * 190 + f) % 1520 + 1520) % 1520 - 190; c.fillRect(x, 150, 130, GROUND - 150); c.beginPath(); c.moveTo(x - 20, 150); c.lineTo(x + 65, 105); c.lineTo(x + 150, 150); c.fill(); c.fillStyle = '#f0e0c0'; c.fillRect(x + 20, 170, 30, 26); c.fillRect(x + 80, 170, 30, 26); c.fillStyle = P.far; } }
  else if (bgId === 'dojo') { c.fillRect(0, 60, W, GROUND - 60); c.fillStyle = '#f8ecd0'; for (let i = -1; i < 10; i++) { const x = ((i * 100 + f) % 1000 + 1000) % 1000 - 100; c.fillRect(x + 10, 90, 70, 120); } c.fillStyle = '#7a4a20'; for (let i = -1; i < 10; i++) { const x = ((i * 100 + f) % 1000 + 1000) % 1000 - 100; c.fillRect(x, 60, 10, GROUND - 60); } c.fillStyle = '#b83a2a'; c.fillRect(0, 60, W, 14); }
  else { // hills and trees
    c.beginPath(); c.moveTo(0, GROUND); for (let x = 0; x <= W; x += 20) c.lineTo(x, 150 + Math.sin((x - f) * 0.01) * 22 + Math.sin((x - f) * 0.027) * 10); c.lineTo(W, GROUND); c.fill();
    const tr = -cam * 0.6;
    for (let i = -1; i < 9; i++) {
      const x = ((i * 130 + tr) % 1170 + 1170) % 1170 - 130, big = bgId === 'forest';
      c.fillStyle = '#6a4a2a'; c.fillRect(x + 24, 150, 12, GROUND - 150);
      circ(x + 30, 140, big ? 46 : 34, P.near); circ(x + 8, 160, big ? 30 : 22, P.near); circ(x + 52, 160, big ? 30 : 22, P.near); circ(x + 22, 128, 14, shade(P.near.length === 7 ? P.near : '#5aa84a', 0.15));
    }
    if (bgId === 'park') { c.fillStyle = '#f0f0f0'; for (let x = ((-cam * 0.9) % 30 + 30) % 30 - 30; x < W; x += 30) { c.fillRect(x, GROUND - 26, 5, 26); } c.fillRect(0, GROUND - 20, W, 4); c.fillRect(0, GROUND - 10, W, 4); }
  }
  // the floor band
  const fg = c.createLinearGradient(0, GROUND - 20, 0, H); fg.addColorStop(0, P.floor2); fg.addColorStop(1, P.floor); c.fillStyle = fg; c.fillRect(0, GROUND - 20, W, H - GROUND + 20);
  c.fillStyle = shade(P.floor2.length === 7 ? P.floor2 : '#6a8a4a', -0.15);
  if (bgId === 'factory' || bgId === 'dojo' || bgId === 'castle' || bgId === 'village') { for (let i = -1; i < 20; i++) { const x = ((i * 80 - cam) % 1600 + 1600) % 1600 - 80; c.fillRect(x, GROUND - 20, 2, H); } for (let y = GROUND; y < H; y += 34) c.fillRect(0, y, W, 2); }
  else for (let i = 0; i < 70; i++) { const x = ((r() * 1600 - cam) % 1600 + 1600) % 1600, y = GROUND - 10 + r() * (H - GROUND); c.fillRect(x, y, 3, 2); }
  c.fillStyle = P.path; c.globalAlpha = 0.5; c.fillRect(0, GROUND + 60, W, 40); c.globalAlpha = 1;
  if (bgId === 'factory') { c.fillStyle = '#2a2a30'; c.fillRect(0, GROUND + 60, W, 40); c.fillStyle = '#c8a030'; for (let x = ((-cam - B.t * 40) % 40 + 40) % 40 - 40; x < W; x += 40) c.fillRect(x, GROUND + 60, 20, 4); }
}

// ------------------------------------------------------------------ fighters
// pose: computed from the fighter state; draw at (x, y) feet, facing f, scale s
export function drawFighter(ctx, d, x, y, f, s, o = {}) {
  const prev = c; c = ctx;
  const st = o.st || 'idle', t = o.t || 0, an = o.anim || 0, big = d.big;
  c.save(); c.translate(x, y); c.scale(f * s * (big ? 1.18 : 1), s * (big ? 1.18 : 1));
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (st === 'lie' || st === 'fly' && o.vy < 0 && t > 0.15) { c.rotate(-Math.PI / 2 * (st === 'lie' ? 1 : Math.min(1, (t - 0.15) * 4))); c.translate(st === 'lie' ? -8 : 0, st === 'lie' ? 14 : 0); }
  else if (st === 'fly') c.rotate(-0.5);
  else if (st === 'rise') { c.rotate(-Math.PI / 2 * Math.max(0, 1 - t / 0.3)); }
  const skin = d.skin, shirt = d.color, pants = d.pants, dark = shade(shirt, -0.3);
  // pose numbers
  let legA = 0, legB = 0, armF = 0.3, armB = -0.3, bodyY = 0, lean = 0, armFLen = 0, kick = false;
  const walkP = Math.sin(an * 10);
  if (st === 'walk') { legA = walkP * 0.5; legB = -walkP * 0.5; armF = -walkP * 0.5; armB = walkP * 0.5; bodyY = Math.abs(walkP) * -1.5; }
  if (st === 'run' || st === 'dash') { const rp = Math.sin(an * 16); legA = rp * 0.9; legB = -rp * 0.9; armF = -rp * 0.9; armB = rp * 0.9; lean = 0.25; bodyY = Math.abs(rp) * -2; }
  if (st === 'idle') { bodyY = Math.sin(an * 3) * 0.8; armF = 0.25; armB = -0.25; }
  if (st === 'jump' || st === 'flip') { legA = -0.8; legB = 0.5; armF = -1.6; armB = -1.2; }
  if (st === 'jatk') { legA = -1.4; legB = 0.6; armF = 0.6; armB = -1; kick = true; }
  if (st === 'punch' || st === 'runatk') {
    const pz = o.pose || 'p1';
    if (pz === 'fin') { armF = -2.4 + Math.min(1, t * 6) * 0.6; armB = 0.5; legA = 0.5; legB = -0.3; lean = -0.1; bodyY = -2; }
    else { armF = pz === 'p2' ? 0.4 : -1.55; armB = pz === 'p2' ? -1.55 : 0.4; armFLen = 6; legA = 0.4; legB = -0.4; lean = 0.12; }
    if (st === 'runatk') { armF = -1.55; armFLen = 8; lean = 0.3; legA = 0.8; legB = -0.6; }
  }
  if (st === 'defend') { armF = -1.2; armB = -1.4; lean = -0.1; legA = 0.25; legB = -0.25; }
  if (st === 'hurt') { armF = 0.9; armB = 0.9; lean = -0.35; }
  if (st === 'cast' || st === 'throw') { armF = -1.57; armB = -1.4; armFLen = 4; lean = 0.08; legA = 0.35; legB = -0.35; }
  if (st === 'upper') { armF = -2.9; armB = 0.3; legA = 0.3; legB = -0.8; }
  if (st === 'stun' || st === 'frozen') { armF = 0.2; armB = -0.2; lean = Math.sin(an * 4) * 0.08 * (st === 'stun' ? 1 : 0); }
  if (st === 'drink' || st === 'pick') { armF = -2.2; armB = 0.3; }
  if (st === 'tele') {}
  c.rotate(lean);
  // shadow-side leg, arm
  const limb = (x0, y0, ang, len, w, colr) => { c.save(); c.translate(x0, y0); c.rotate(ang); rr(-w / 2, 0, w, len, w / 2, colr); c.restore(); };
  limb(-4, -24 + bodyY, legB, 22, 8, shade(pants, -0.25)); limb(-4, -24 + bodyY, legB, 22, 0, pants);
  c.save(); c.translate(-4, -24 + bodyY); c.rotate(legB); rr(-5, 18, 11, 6, 3, '#2a2a2a'); c.restore();
  limb(-6, -42 + bodyY, armB, 18, 7, dark);
  c.save(); c.translate(-6, -42 + bodyY); c.rotate(armB); circ(0, 18, 4.5, skin); c.restore();
  // body
  rr(-11, -46 + bodyY, 22, 25, 7, shirt);
  rr(-11, -26 + bodyY, 22, 4, 2, shade(pants, -0.2));
  if (d.style === 'band') { c.fillStyle = '#c83030'; c.fillRect(-11, -26 + bodyY, 22, 4); }
  if (d.style === 'robot') { rr(-7, -40 + bodyY, 14, 10, 3, '#3a4a5a'); circ(0, -35 + bodyY, 3, an % 1 > 0.5 ? '#ff4a2a' : '#ffaa2a'); }
  if (d.style === 'horns') { c.fillStyle = '#6a0a1a'; c.beginPath(); c.moveTo(-10, -44 + bodyY); c.lineTo(-22, -6 + Math.sin(an * 4) * 2); c.lineTo(-4, -20 + bodyY); c.fill(); }
  // front leg
  c.save(); c.translate(4, -24 + bodyY); c.rotate(kick ? -1.4 : legA); rr(-4, 0, 8, kick ? 24 : 22, 4, pants); rr(-5, kick ? 20 : 18, 11, 6, 3, '#2a2a2a'); c.restore();
  // head
  const hy = -60 + bodyY;
  head(d, 1, hy, o);
  // front arm (and what it holds)
  c.save(); c.translate(6, -42 + bodyY); c.rotate(armF);
  rr(-3.5, 0, 7, 18 + armFLen, 3.5, shirt); circ(0, 19 + armFLen, 4.8, skin);
  if (o.hold) {
    c.translate(0, 19 + armFLen);
    const k = o.hold;
    if (k === 'bat') { c.rotate(-0.4); rr(-2, -26, 5, 30, 2.5, '#c8904a'); rr(-2.5, -2, 6, 6, 2, '#3a2a1a'); }
    if (k === 'knife') { c.fillStyle = '#d8dce8'; c.fillRect(-1.5, -14, 3, 12); c.fillStyle = '#5a3a1a'; c.fillRect(-2, -2, 4, 5); }
    if (k === 'stone') circ(0, -4, 9, '#8a8a90');
    if (k === 'crate') { rr(-12, -20, 24, 22, 2, '#b8864a'); c.strokeStyle = '#7a5a2a'; c.lineWidth = 2; c.strokeRect(-12, -20, 24, 22); }
  }
  c.restore();
  c.restore(); c.globalAlpha = 1; c = prev;
}
function head(d, x, y, o = {}) {
  const skin = d.skin, hair = d.hair, s = d.style, hurt = o.st === 'hurt' || o.st === 'fly' || o.st === 'lie' || o.st === 'stun';
  // hair behind
  if (s === 'long' || s === 'flower') { rr(x - 15, y - 6, 22, 28, 8, hair); }
  if (s === 'horns') { rr(x - 14, y - 4, 20, 22, 6, hair); }
  circ(x, y, 14, s === 'robot' ? '#b8c4d0' : skin);
  // face
  if (s === 'robot') { rr(x - 2, y - 6, 16, 8, 3, '#1a2a3a'); c.fillStyle = o.anim % 0.6 > 0.3 ? '#ff4a2a' : '#ff8a2a'; c.fillRect(x + 4, y - 4, 8, 4); rr(x - 12, y - 16, 22, 6, 2, hair); }
  else {
    if (hurt) { c.strokeStyle = '#2a1a1a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + 3, y - 4); c.lineTo(x + 7, y); c.moveTo(x + 7, y - 4); c.lineTo(x + 3, y); c.stroke(); }
    else { rr(x + 3.5, y - 5, 3.5, 6, 1.5, '#1a1a2a'); circ(x + 5.6, y - 3.6, 0.9, '#ffffff'); }
    circ(x + 10, y + 2, 2.2, 'rgba(255,120,120,0.45)');
    c.strokeStyle = '#6a2a2a'; c.lineWidth = 1.2; c.beginPath();
    if (o.st === 'punch' || o.st === 'cast' || o.st === 'runatk' || hurt) { c.ellipse(x + 8, y + 6, 2, 1.6, 0, 0, 7); c.fillStyle = '#6a2a2a'; c.fill(); } else { c.moveTo(x + 6, y + 6); c.lineTo(x + 10, y + 5.5); c.stroke(); }
  }
  // hair / headwear
  c.fillStyle = hair;
  if (s === 'spiky') { c.beginPath(); c.moveTo(x - 15, y + 2); for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + i * 0.17); c.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); c.lineTo(x + Math.cos(a + 0.09) * 13, y + Math.sin(a + 0.09) * 13); } c.lineTo(x + 12, y - 8); c.lineTo(x - 4, y - 4); c.fill(); }
  if (s === 'long' || s === 'flower') { c.beginPath(); c.arc(x, y - 2, 15, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(x + 6, y - 6); c.lineTo(x - 8, y - 2); c.fill(); }
  if (s === 'flower') { for (let i = 0; i < 5; i++) circ(x - 6 + Math.cos(i * 1.26) * 5, y - 14 + Math.sin(i * 1.26) * 5, 3.5, '#fff0f8'); circ(x - 6, y - 14, 2.6, '#ffd040'); }
  if (s === 'band') { c.beginPath(); c.arc(x, y - 2, 14.5, Math.PI, Math.PI * 2); c.fill(); c.fillStyle = '#e83030'; c.fillRect(x - 14, y - 8, 28, 4); c.beginPath(); c.moveTo(x - 13, y - 7); c.lineTo(x - 24, y - 2 + Math.sin(o.anim * 8) * 3); c.lineTo(x - 22, y + 3); c.fill(); }
  if (s === 'hood') { c.beginPath(); c.arc(x, y - 1, 17, Math.PI * 0.75, Math.PI * 2.1); c.lineTo(x + 6, y - 9); c.lineTo(x - 10, y + 4); c.fill(); c.fillStyle = d.color; c.beginPath(); c.arc(x - 2, y, 17, Math.PI * 0.6, Math.PI * 1.9); c.lineTo(x + 5, y - 12); c.lineTo(x + 2, y - 10); c.lineTo(x - 13, y + 12); c.fill(); }
  if (s === 'mask') { c.beginPath(); c.arc(x, y - 1, 15, Math.PI * 0.9, Math.PI * 2.1); c.fill(); c.fillStyle = d.color === '#2a2a3a' || d.color === '#1a1a2a' ? '#3a3a4a' : shade(d.color, -0.2); c.fillRect(x - 6, y + 1, 20, 9); c.fillStyle = hair; c.beginPath(); c.moveTo(x - 13, y - 6); c.lineTo(x - 26, y - 10 + Math.sin(o.anim * 9) * 3); c.lineTo(x - 24, y - 2); c.fill(); }
  if (s === 'buzz') { c.beginPath(); c.arc(x, y - 1, 14.6, Math.PI * 1.02, Math.PI * 1.98); c.fill(); }
  if (s === 'hat') { c.fillStyle = d.color; c.beginPath(); c.moveTo(x - 20, y - 8); c.lineTo(x + 18, y - 8); c.lineTo(x - 2, y - 40); c.fill(); rr(x - 21, y - 11, 42, 5, 2, shade(d.color, -0.25)); circ(x - 2, y - 40, 3, '#ffd040'); c.fillStyle = hair; c.fillRect(x - 15, y - 6, 6, 14); }
  if (s === 'horns') { c.beginPath(); c.arc(x, y - 2, 15, Math.PI, Math.PI * 2); c.fill(); c.fillStyle = '#e8d8b0'; c.beginPath(); c.moveTo(x - 8, y - 12); c.lineTo(x - 16, y - 30); c.lineTo(x - 2, y - 14); c.fill(); c.beginPath(); c.moveTo(x + 6, y - 12); c.lineTo(x + 12, y - 30); c.lineTo(x + 12, y - 12); c.fill(); }
}
export function drawPortrait(ctx, d, x, y, s) { const prev = c; c = ctx; c.save(); c.translate(x, y); c.scale(s, s); head(d, 0, 0, { anim: 0 }); c.restore(); c = prev; }

function fighter(B, e) {
  const sx = e.x - B.cam, gy = GROUND + e.z, sy = gy - e.y;
  if (sx < -80 || sx > W + 80) return;
  // shadow
  ell(sx, gy, e.w * 0.75, 6, 'rgba(0,0,0,0.25)');
  if (e.kind === 'hawk') { hawk(sx, sy, e); return; }
  const blink = e.inv > 0 && e.st !== 'lie' && e.st !== 'rise' && e.inv < 2 && Math.floor(B.t * 20) % 2 === 0;
  const alpha = e.dead ? Math.max(0, 1 - (e.t - 0.2)) : e.ghost ? 0.62 : blink ? 0.45 : 1;
  if (e.buffs.power || e.buffs.guard || e.buffs.armor) { const k = e.buffs.power ? 'elec' : e.buffs.armor ? 'earth' : 'nature'; ell(sx, sy - 30, 26, 40, col(k, 0) + '33'); }
  if (e.ghost) { c.save(); c.filter = 'hue-rotate(200deg) saturate(0.5)'; }
  drawFighter(c, e.def, sx, sy, e.face, 1, { st: e.st, t: e.t, anim: e.anim, pose: e.pose, hold: e.hold?.kind, alpha, vy: e.vy });
  if (e.ghost) c.restore();
  if (e.flash > 0) { c.globalAlpha = 0.5; ell(sx, sy - 32, 18, 34, '#ffffff'); c.globalAlpha = 1; }
  if (e.frozenT > 0) { c.fillStyle = 'rgba(160,220,255,0.55)'; c.strokeStyle = 'rgba(230,250,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.rect(sx - 20, sy - 72, 40, 72); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(sx - 14, sy - 66, 6, 30); }
  if (e.burnT > 0) for (let i = 0; i < 4; i++) { const fx = sx + Math.sin(B.t * 20 + i * 2) * 10, fy = sy - 20 - i * 12 - (B.t * 60 + i * 9) % 14; circ(fx, fy, 6 - i, i % 2 ? '#ffd040' : '#ff6a1a'); }
  if (e.st === 'stun') for (let i = 0; i < 3; i++) { const a = B.t * 5 + i * 2.1; star(sx + Math.cos(a) * 14, sy - 80 + Math.sin(a) * 4, 4, '#ffe040'); }
  if (e.st === 'defend') { c.strokeStyle = 'rgba(160,220,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(sx + e.face * 6, sy - 34, 26, e.face > 0 ? -1 : Math.PI - 1, e.face > 0 ? 1 : Math.PI + 1); c.stroke(); }
  // a small bar over damaged non-player fighters
  if (e.pi < 0 && !e.boss && e.hp < e.mhp && !e.dead) { rr(sx - 20, sy - 90 - (e.def.big ? 12 : 0), 40, 5, 2, 'rgba(0,0,0,0.5)'); rr(sx - 19, sy - 89 - (e.def.big ? 12 : 0), 38 * Math.max(0, e.hp / e.mhp), 3, 1.5, e.team === 0 ? '#5ad85a' : '#ff5a4a'); }
  if (e.pi >= 0) { c.fillStyle = e.pi ? '#5aa8ff' : '#ff5a5a'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText(e.pi ? '2P' : '1P', sx, sy - 84 - (e.def.big ? 12 : 0)); }
}
function hawk(x, y, e) {
  const f = Math.sin(e.anim * 14) * 8;
  c.fillStyle = '#7a4a2a'; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 22, y - 6 - f); c.lineTo(x - 8, y + 4); c.moveTo(x + 4, y); c.lineTo(x + 22, y - 6 - f); c.lineTo(x + 8, y + 4); c.fill();
  ell(x, y, 8, 6, '#8a5a32'); circ(x + 7 * e.face, y - 4, 5, '#f0f0f0'); c.fillStyle = '#ffc020'; c.beginPath(); c.moveTo(x + 11 * e.face, y - 5); c.lineTo(x + 16 * e.face, y - 3); c.lineTo(x + 11 * e.face, y - 1); c.fill();
}
function star(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.fill(); }

// ------------------------------------------------------------------ projectiles, items, effects
function projectile(B, p) {
  const sx = p.x - B.cam, sy = GROUND + p.z - p.y; if (sx < -100 || sx > W + 100) return;
  if (p.kind !== 'fall' && p.y > 0) ell(sx, GROUND + p.z, p.r * 0.8, 3, 'rgba(0,0,0,0.2)');
  const e = p.elem || 'phys';
  if (p.kind === 'wall') { const a = Math.min(1, p.life); c.globalAlpha = a; rr(sx - 16, sy - 70, 32, 70, 4, 'rgba(150,220,255,0.75)'); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(sx - 10, sy - 64, 5, 50); c.globalAlpha = 1; return; }
  if (p.kind === 'thrown') { c.save(); c.translate(sx, sy); c.rotate(p.t * 12 * p.face); itemArt(p.item, 0, 0); c.restore(); return; }
  if (p.kind === 'bomb') { circ(sx, sy, 8, '#2a2a2a'); circ(sx + 4, sy - 7, 3, Math.floor(B.t * 16) % 2 ? '#ffd040' : '#ff6a1a'); return; }
  if (p.arrow) { c.save(); c.translate(sx, sy); c.rotate(p.kind === 'fall' ? Math.atan2(-p.vy, p.vx) : Math.atan2(-p.vy, p.vx)); c.fillStyle = '#8a5a2a'; c.fillRect(-18, -1.5, 26, 3); c.fillStyle = '#d8dce8'; c.beginPath(); c.moveTo(8, -5); c.lineTo(16, 0); c.lineTo(8, 5); c.fill(); c.fillStyle = '#e8e8e8'; c.fillRect(-20, -4, 6, 8); c.restore(); return; }
  if (p.star) { c.save(); c.translate(sx, sy); c.rotate(p.t * 20); star(0, 0, 10, '#c8ccd8'); circ(0, 0, 2.5, '#3a3a4a'); c.restore(); return; }
  if (p.kind === 'fall') {
    if (p.big) { const g = c.createRadialGradient(sx, sy, 6, sx, sy, p.r * 0.7); g.addColorStop(0, '#ffe080'); g.addColorStop(0.5, '#c86a2a'); g.addColorStop(1, 'rgba(120,60,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(sx, sy, p.r * 0.7, 0, 7); c.fill(); circ(sx, sy, p.r * 0.38, '#6a4a2a'); return; }
    if (e === 'ice') { c.fillStyle = '#c8f0ff'; c.beginPath(); c.moveTo(sx - 6, sy - 22); c.lineTo(sx + 6, sy - 22); c.lineTo(sx, sy + 6); c.fill(); return; }
    c.fillStyle = col(e, 0) + '66'; c.fillRect(sx - 5, sy - 30, 10, 24); circ(sx, sy, 10, col(e, 0)); circ(sx, sy, 5, col(e, 1)); return;
  }
  // balls by element
  const r = p.r;
  if (e === 'fire') { for (let i = 0; i < 4; i++) circ(sx - p.face * (i * 7) + Math.sin(B.t * 30 + i) * 2, sy, r - i * 2, i % 2 ? '#ffd040' : '#ff6a1a'); circ(sx, sy, r * 0.45, '#fff8c0'); return; }
  if (e === 'ice') { c.save(); c.translate(sx, sy); c.rotate(p.t * 6); c.fillStyle = '#9ae0ff'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); c.lineTo(Math.cos(a + 0.5) * r * 0.5, Math.sin(a + 0.5) * r * 0.5); } c.fill(); c.restore(); circ(sx, sy, r * 0.4, '#ffffff'); return; }
  if (e === 'elec') { circ(sx, sy, r + 3, 'rgba(255,230,60,0.35)'); circ(sx, sy, r * 0.6, '#ffffff'); c.strokeStyle = '#ffe040'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 5; i++) { const a = B.t * 20 + i * 1.3; c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * r * 1.4, sy + Math.sin(a) * r * 1.4); } c.stroke(); return; }
  if (e === 'nature') { c.save(); c.translate(sx, sy); c.rotate(p.t * 14); ell(0, 0, r, r * 0.5, '#5ad85a'); c.strokeStyle = '#2a8a2a'; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); c.restore(); return; }
  if (e === 'earth') { c.save(); c.translate(sx, sy); c.rotate(p.t * 8); rr(-r, -r, r * 2, r * 2, 4, '#9a7a5a'); c.fillStyle = '#7a5a3a'; c.fillRect(-r * 0.4, -r * 0.6, r * 0.6, r * 0.5); c.restore(); return; }
  const g = c.createRadialGradient(sx, sy, 1, sx, sy, r + 6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, col(e, 0)); g.addColorStop(1, col(e, 0) + '00'); c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r + 6, 0, 7); c.fill();
  if (p.homing) { c.fillStyle = col(e, 0) + '55'; circ(sx - p.vx * 0.04, sy, r * 0.7, col(e, 0) + '55'); }
}
function itemArt(k, x, y) {
  if (k === 'bat') { c.save(); c.translate(x, y); c.rotate(-0.3); rr(-3, -20, 6, 34, 3, '#c8904a'); rr(-3, 10, 6, 6, 2, '#3a2a1a'); c.restore(); }
  if (k === 'knife') { c.fillStyle = '#d8dce8'; c.fillRect(x - 8, y - 2, 12, 4); c.fillStyle = '#5a3a1a'; c.fillRect(x + 4, y - 2.5, 6, 5); }
  if (k === 'stone') { circ(x, y, 10, '#8a8a90'); circ(x - 3, y - 3, 4, '#a8a8b0'); }
  if (k === 'crate') { rr(x - 13, y - 13, 26, 26, 2, '#b8864a'); c.strokeStyle = '#7a5a2a'; c.lineWidth = 2; c.strokeRect(x - 13, y - 13, 26, 26); c.beginPath(); c.moveTo(x - 13, y - 13); c.lineTo(x + 13, y + 13); c.stroke(); }
  if (k === 'milkbottle') { rr(x - 6, y - 12, 12, 20, 4, '#ffffff'); rr(x - 4, y - 16, 8, 5, 2, '#5aa8ff'); c.fillStyle = '#5aa8ff'; c.fillRect(x - 6, y - 4, 12, 4); }
  if (k === 'coin') { circ(x, y, 7, '#ffc820'); circ(x, y, 4.5, '#ffe070'); c.fillStyle = '#c89010'; c.fillRect(x - 1, y - 3, 2, 6); }
}
function items(B) {
  for (const it of B.items) {
    const sx = it.x - B.cam, gy = GROUND + it.z; if (sx < -40 || sx > W + 40) continue;
    ell(sx, gy, 10, 3, 'rgba(0,0,0,0.25)');
    const bob = it.kind === 'coin' ? Math.abs(Math.sin(B.t * 6 + it.x)) * 3 : 0;
    itemArt(it.kind, sx, gy - it.y - (it.kind === 'coin' ? 8 : 10) - bob);
  }
}
function effects(B) {
  for (const f of B.fx) {
    if (f.t < 0) { if (f.k === 'bolt') { const sx = f.x - B.cam, gy = GROUND + f.z; ell(sx, gy, 26, 8, Math.floor(B.t * 16) % 2 ? 'rgba(255,230,60,0.5)' : 'rgba(255,230,60,0.15)'); } continue; }
    const sx = f.x - B.cam, gy = GROUND + f.z, sy = gy - (f.y || 0), k = f.t / (f.life || 0.3), e = f.elem || 'phys';
    c.globalAlpha = Math.max(0, 1 - k);
    switch (f.k) {
      case 'hit': for (let i = 0; i < 6; i++) { const a = i * 1.05 + f.x; c.strokeStyle = col(e, i % 2); c.lineWidth = 3; c.beginPath(); c.moveTo(sx + Math.cos(a) * 4, sy + Math.sin(a) * 4); c.lineTo(sx + Math.cos(a) * (8 + k * 20), sy + Math.sin(a) * (8 + k * 20)); c.stroke(); } circ(sx, sy, 8 * (1 - k), '#ffffff'); break;
      case 'block': c.strokeStyle = '#9ad8ff'; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, 10 + k * 16, 0, 7); c.stroke(); break;
      case 'column': {
        const h = 100 * Math.min(1, f.t * 8) * (1 - Math.max(0, k - 0.6) * 2.5);
        if (e === 'fire') { for (let i = 0; i < 6; i++) circ(sx + Math.sin(B.t * 30 + i) * 6, gy - i * h / 6, 16 - i * 1.5, i % 2 ? '#ffd040' : '#ff6a1a'); }
        else if (e === 'nature') { c.strokeStyle = '#3a9a3a'; c.lineWidth = 6; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sx + i * 10, gy); c.quadraticCurveTo(sx + i * 22, gy - h / 2, sx + i * 6, gy - h * 0.8); c.stroke(); } circ(sx, gy - h * 0.8, 6, '#ff8ac8'); }
        else { c.fillStyle = e === 'ice' ? '#bfeaff' : '#a8864a'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sx + i * 14 - 10, gy); c.lineTo(sx + i * 14, gy - h * (i ? 0.7 : 1)); c.lineTo(sx + i * 14 + 10, gy); c.fill(); } }
        break;
      }
      case 'bolt': { c.strokeStyle = '#fff6a0'; c.lineWidth = 5; c.beginPath(); let x = sx, y = 0; c.moveTo(x, y); while (y < gy) { y += 30; x = sx + (Math.random() - 0.5) * 30; c.lineTo(x, Math.min(gy, y)); } c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(); ell(sx, gy, 30, 9, 'rgba(255,240,120,0.6)'); break; }
      case 'nova': { const r = f.r * (0.3 + k * 0.9); c.strokeStyle = col(e, 0); c.lineWidth = 8 * (1 - k) + 2; c.beginPath(); c.ellipse(sx, gy, r, r * 0.45, 0, 0, 7); c.stroke(); c.fillStyle = col(e, 0) + '44'; c.fill(); for (let i = 0; i < 10; i++) { const a = i * 0.63; circ(sx + Math.cos(a) * r, gy - 10 - Math.abs(Math.sin(a)) * 30 * (1 - k) + Math.sin(a) * r * 0.45, 5 * (1 - k) + 1, col(e, 1)); } break; }
      case 'beam': { const x0 = sx, w = f.len * f.face, y = sy; const th = 22 * (1 - Math.max(0, k - 0.5) * 2); c.fillStyle = col(e, 0); c.fillRect(Math.min(x0, x0 + w), y - th / 2, Math.abs(w), th); c.fillStyle = col(e, 1); c.fillRect(Math.min(x0, x0 + w), y - th / 5, Math.abs(w), th / 2.5); circ(x0, y, th * 0.8, col(e, 1)); break; }
      case 'heal': for (let i = 0; i < 6; i++) { const px = sx + Math.sin(i * 2 + f.x) * 16, py = gy - 10 - k * 60 - i * 8; c.fillStyle = '#7dff9a'; c.fillRect(px - 1.5, py - 5, 3, 10); c.fillRect(px - 5, py - 1.5, 10, 3); } break;
      case 'aura': ell(sx, gy - 34, (f.big ? 34 : 26) * (0.6 + k), (f.big ? 50 : 40) * (0.6 + k), col(e, 0) + '55'); break;
      case 'poof': for (let i = 0; i < 6; i++) circ(sx + Math.cos(i) * k * 26, sy - 30 + Math.sin(i * 1.7) * k * 20, 12 * (1 - k * 0.5), f.elem === 'elec' ? '#fff6a0' : 'rgba(200,200,215,0.85)'); break;
      case 'trail': ell(sx, gy - 34, 14, 32, col(e, 0) + '66'); break;
      case 'shatter': for (let i = 0; i < 8; i++) { const a = i * 0.8; c.fillStyle = '#c8f0ff'; c.fillRect(sx + Math.cos(a) * k * 50, sy + Math.sin(a) * k * 40 + k * k * 40, 6, 6); } break;
    }
    c.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ the battle frame
export function renderBattle(ctx, B, scale, o) {
  c = ctx; c.setTransform(scale, 0, 0, scale, 0, 0);
  const sh = B.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
  c.save(); c.translate(sh, sh * 0.5);
  background(B, o.bg);
  // depth-sorted fighters, items and projectiles
  const list = [];
  for (const it of B.items) list.push([it.z, 0, it]);
  for (const e of B.ents) list.push([e.z, 1, e]);
  for (const p of B.projs) list.push([p.z + (p.kind === 'fall' ? 0.5 : 0.2), 2, p]);
  list.sort((a, b) => a[0] - b[0]);
  items(B);
  for (const [, k, x] of list) { if (k === 1) fighter(B, x); else if (k === 2) projectile(B, x); }
  effects(B);
  // floating numbers
  c.textAlign = 'center'; c.font = 'bold 16px "Arial Black", Arial, sans-serif';
  for (const tx of B.texts) { const sx = tx.x - B.cam, sy = GROUND + tx.z - tx.y; c.globalAlpha = Math.min(1, tx.t * 3); c.lineWidth = 4; c.strokeStyle = '#000'; c.strokeText(tx.s, sx, sy); c.fillStyle = tx.col; c.fillText(tx.s, sx, sy); }
  c.globalAlpha = 1;
  c.restore();
  hud(B, o);
}
function bar(x, y, w, h, k, fill, back = 'rgba(0,0,0,0.55)') { rr(x, y, w, h, h / 2, back); if (k > 0) rr(x + 1, y + 1, Math.max(h - 2, (w - 2) * Math.min(1, k)), h - 2, (h - 2) / 2, fill); }
function hud(B, o) {
  B.players.forEach((p, i) => {
    const x = 8 + i * 230, y = 8;
    rr(x, y, 220, 54, 10, 'rgba(10,14,40,0.72)');
    c.save(); c.beginPath(); c.arc(x + 27, y + 27, 21, 0, 7); c.fillStyle = i ? '#2a4a8a' : '#8a2a3a'; c.fill(); c.clip(); drawPortrait(c, p.def, x + 27, y + 32, 1.1); c.restore();
    c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'left'; c.fillText(`${o.name(p)}  Lv ${p.lv}`, x + 54, y + 17);
    bar(x + 54, y + 23, 158, 12, p.hp / p.mhp, p.hp / p.mhp < 0.3 ? '#ff4a4a' : '#ff6a5a');
    bar(x + 54, y + 38, 158, 9, p.mp / p.mmp, '#4a9aff');
    c.font = 'bold 10px sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(Math.max(0, Math.ceil(p.hp)) + ' / ' + p.mhp, x + 208, y + 33);
  });
  // gold earned and quick items
  c.textAlign = 'right'; c.font = 'bold 15px sans-serif'; c.fillStyle = '#000'; c.fillText('💰 ' + B.earned.gold, W - 9, 25); c.fillStyle = '#ffd040'; c.fillText('💰 ' + B.earned.gold, W - 10, 24);
  if (B.mode === 'survival') { c.fillStyle = '#fff'; c.fillText('WAVE ' + Math.max(1, B.wave), W - 10, 44); }
  if (B.mode === 'stage') { c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.fillText(`${o.stageName}  ${Math.min(B.wave, B.waves.length)}/${B.waves.length}`, W - 10, 44); }
  // boss bar
  const b = B.boss || B.ents.find((e) => e.boss && !e.dead);
  if (b && !b.dead) { c.textAlign = 'center'; c.font = 'bold 14px sans-serif'; c.fillStyle = '#fff'; c.fillText(o.name(b), W / 2, H - 30); bar(W / 2 - 180, H - 24, 360, 14, b.hp / b.mhp, '#c84af0'); }
  // vs: enemy team bars
  if (B.mode === 'vs') { const foes = B.ents.filter((e) => e.team === 1 && e.kind === 'hero'); foes.forEach((e, i) => { const x = W - 170, y = 56 + i * 26; rr(x, y, 160, 22, 8, 'rgba(40,10,20,0.6)'); c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.textAlign = 'left'; c.fillText(`${o.name(e)} Lv${e.lv}`, x + 6, y + 9); bar(x + 6, y + 12, 148, 7, Math.max(0, e.hp) / e.mhp, '#ff5a4a'); }); }
  if (B.banner) { const k = B.banner.t; c.globalAlpha = Math.min(1, k * 2); c.textAlign = 'center'; c.font = '900 54px "Arial Black", Arial, sans-serif'; c.lineWidth = 8; c.strokeStyle = '#1a1a3a'; c.strokeText(B.banner.txt, W / 2, 180); c.fillStyle = B.banner.txt === 'BOSS' ? '#ff5a4a' : '#ffd040'; c.fillText(B.banner.txt, W / 2, 180); c.globalAlpha = 1; }
}
export { itemArt };
export function drawItemIcon(ctx, k, x, y, s = 1) { const prev = c; c = ctx; c.save(); c.translate(x, y); c.scale(s, s); itemArt(k, 0, 0); c.restore(); c = prev; }
void ZD; void HEROES; void ENEMIES; void PICKUPS;
