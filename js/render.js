// Drawing: painted stage backgrounds (prerendered layers), an outlined jointed character rig with poses,
// glowing skills with particles, items, and the battle HUD.
import { W, H, GROUND, ZD } from './data.js?v=2';

let c = null;
const INK = '#1a1530';
const EL = { fire: ['#ff6a1a', '#ffd23a', '#c8200a'], ice: ['#6ad0ff', '#eafaff', '#2a7ad8'], elec: ['#ffe03a', '#ffffff', '#c89a10'], chi: ['#5ab8ff', '#ffffff', '#2a5ae8'],
  phys: ['#e8e0d0', '#ffffff', '#8a7a6a'], shadow: ['#a46aff', '#ecdcff', '#3a1a6a'], nature: ['#5ae06a', '#e0ffc0', '#2a8a2a'], earth: ['#c8904a', '#f0d8a0', '#6a4a2a'], smoke: ['#b8b8c8', '#f4f4fa', '#6a6a7a'] };
const col = (e, i = 0) => (EL[e] || EL.phys)[i];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }
function rng(seed) { let s = seed || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function circ(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, 7); c.fill(); }
function ell(x, y, rx, ry, fill, rot = 0) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, 7); c.fill(); }
function rr(x, y, w, h, r, fill, stroke, lw = 2) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function path(pts, fill, stroke, lw = 2.2) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); } }
// an outlined capsule limb segment
function seg(x1, y1, x2, y2, w, fill, hi) {
  c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = w + 3.2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = fill; c.lineWidth = w; c.stroke();
  if (hi) { c.strokeStyle = hi; c.lineWidth = w * 0.3; c.beginPath(); c.moveTo(x1 - w * 0.18, y1); c.lineTo(x2 - w * 0.18, y2); c.stroke(); }
}
function star(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.fill(); }

// ================================================================== the character rig
// angles: 0 = hanging straight down, + swings toward the facing direction
const POSE0 = { lean: 0, by: 0, head: 0, aF: [0.5, 1.9], aB: [0.25, 1.8], lF: [0.22, -0.15], lB: [-0.22, -0.1], open: 0 };
function mix(a, b, k) { const o = {}; for (const key in a) o[key] = Array.isArray(a[key]) ? a[key].map((v, i) => lerp(v, b[key][i], k)) : lerp(a[key], b[key] ?? a[key], k); return o; }
function poseFor(o) {
  const st = o.st || 'idle', t = o.t || 0, an = o.anim || 0;
  let P = { ...POSE0, aF: [...POSE0.aF], aB: [...POSE0.aB], lF: [...POSE0.lF], lB: [...POSE0.lB] };
  const breathe = Math.sin(an * 3);
  if (st === 'idle' || st === 'frozen') { P.by = breathe * 0.9; P.aF[0] += breathe * 0.04; P.aB[0] -= breathe * 0.04; }
  if (st === 'walk') { const p = Math.sin(an * 9.5); P.lF = [0.5 * p, -0.25 - 0.45 * Math.max(0, -p)]; P.lB = [-0.5 * p, -0.25 - 0.45 * Math.max(0, p)]; P.by = -Math.abs(p) * 1.6; P.aF = [0.5 - 0.25 * p, 1.9]; P.aB = [0.25 + 0.25 * p, 1.8]; }
  if (st === 'run' || st === 'dash') {
    const p = Math.sin(an * 15); P.lean = 0.32; P.lF = [0.95 * p, -0.35 - 1.1 * Math.max(0, -p)]; P.lB = [-0.95 * p, -0.35 - 1.1 * Math.max(0, p)];
    P.aF = [-0.9 * p + 0.2, 1.5]; P.aB = [0.9 * p + 0.2, 1.5]; P.by = -Math.abs(p) * 2.2;
    if (st === 'dash') { P.lean = 0.5; P.aF = [1.6, 0]; P.aB = [-0.6, 0.6]; P.lF = [1.0, -0.2]; P.lB = [-1.0, -0.4]; }
  }
  if (st === 'jump' || st === 'flip') { const up = (o.vy || 0) > 0; P.lF = [0.7, -1.5]; P.lB = [-0.1, -1.2]; P.aF = up ? [2.5, 0.3] : [1.4, 0.8]; P.aB = up ? [2.1, 0.4] : [-0.6, 0.6]; P.by = -2; if (st === 'flip') { P.lean = -0.3; } }
  if (st === 'jatk') { P.lF = [1.45, -0.05]; P.lB = [0.15, -1.7]; P.aF = [-0.5, 0.7]; P.aB = [-0.9, 0.5]; P.lean = -0.25; }
  if (st === 'punch' || st === 'runatk') {
    const a = o.atk || { on: 0.07, off: 0.15 };
    const ext = t < a.on ? -0.35 * (t / a.on) : t <= a.off ? 1 : Math.max(0, 1 - (t - a.off) / 0.12);
    const pz = o.pose || 'p1';
    if (st === 'runatk') { P.lean = 0.42; P.aF = [1.6, 0]; P.aB = [-0.7, 0.8]; P.lF = [0.8, -0.3]; P.lB = [-0.8, -0.6]; P.open = 1; }
    else if (pz === 'fin') { const k = clamp(ext, 0, 1); P.aF = [lerp(0.4, 3.0, k), lerp(1.4, 0.1, k)]; P.aB = [-0.4, 1.2]; P.lF = [lerp(0.3, 0.1, k), lerp(-0.6, 0, k)]; P.lB = [lerp(-0.3, -0.2, k), lerp(-0.6, 0, k)]; P.by = lerp(3, -7, k); P.lean = lerp(0.1, -0.12, k); P.open = k; }
    else if (pz === 'p2') { const k = clamp(ext, -0.4, 1); P.aB = [lerp(0.25, 1.55, Math.max(0, k)), lerp(1.8, 0.05, Math.max(0, k))]; P.aF = [0.3, 2.2]; P.lean = 0.14 * k; P.lF = [0.4, -0.25]; P.lB = [-0.4, -0.15]; P.open = Math.max(0, k); }
    else { const k = clamp(ext, -0.4, 1); P.aF = [lerp(0.5, 1.57, Math.max(0, k)) + (k < 0 ? k * 0.8 : 0), lerp(1.9, 0, Math.max(0, k))]; P.lean = 0.12 * k; P.lF = [0.4, -0.25]; P.lB = [-0.4, -0.15]; P.open = Math.max(0, k); }
  }
  if (st === 'defend') { P.aF = [1.35, 1.55]; P.aB = [1.15, 1.75]; P.lean = -0.06; P.lF = [0.38, -0.35]; P.lB = [-0.38, -0.25]; P.by = 2.5; }
  if (st === 'hurt') { const k = Math.min(1, t * 8); P.lean = -0.32 * k; P.head = -0.25 * k; P.aF = [-0.5, 0.7]; P.aB = [-0.8, 0.5]; P.lF = [0.3, -0.2]; P.lB = [-0.1, -0.1]; P.open = 1; }
  if (st === 'fly' || st === 'lie' || st === 'rise') { P.aF = [-1.2, 0.4]; P.aB = [-1.6, 0.3]; P.lF = [0.5, -0.4]; P.lB = [0.1, -0.2]; P.open = 1; P.head = -0.2; }
  if (st === 'stun') { P.lean = Math.sin(an * 5) * 0.1; P.head = Math.sin(an * 5 + 1) * 0.2; P.aF = [0.2, 0.3]; P.aB = [0.1, 0.3]; P.open = 0.5; }
  if (st === 'cast' || st === 'upper' || st === 'throw') {
    const k = o.sk || 'ball', w = Math.min(1, t * 5);
    let T = { ...P, aF: [1.55, 0.05], aB: [1.35, 0.15], lF: [0.45, -0.3], lB: [-0.4, -0.2], lean: 0.1, open: 1 };
    if (k === 'nova' || k === 'buff' || k === 'heal' || k === 'summon') T = { ...T, aF: [2.9, 0.3], aB: [2.7, 0.4], lean: -0.05, by: -2, lF: [0.25, -0.1], lB: [-0.25, -0.1] };
    if (k === 'rain' || k === 'strike') T = { ...T, aF: [3.05, 0], aB: [0.6, 1.4], lean: -0.08 };
    if (k === 'column') T = { ...T, aF: [0.9, 0.1], aB: [0.6, 1.2], by: 5, lF: [0.6, -0.9], lB: [-0.5, -0.6], lean: 0.2 };
    if (k === 'upper' || st === 'upper') T = { ...T, aF: [3.0, 0.1], aB: [-0.4, 1.0], lF: [0.1, 0], lB: [-0.4, -0.9], lean: -0.1, by: -4 };
    if (st === 'throw') T = { ...T, aF: [1.7, 0.1], aB: [-0.4, 0.8] };
    P = mix(P, T, w);
  }
  if (st === 'drink') { P.aF = [2.2, 1.9]; P.head = -0.25; }
  if (st === 'pick') { P.by = 9; P.aF = [0.7, 0.1]; P.lF = [0.9, -1.6]; P.lB = [-0.5, -1.4]; P.lean = 0.35; }
  return P;
}
const SKIN_ARMS = { tank: 1 };
// draw a fighter with feet at (x, y)
export function drawFighter(ctx, def, x, y, face, scale, o = {}) {
  const prev = c; c = ctx;
  const L = def.look || {}, big = def.big, s = scale * (big ? 1.17 : 1), st = o.st || 'idle', an = o.anim || 0;
  c.save(); c.translate(x, y); c.scale(face * s, s);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (o.tint) c.filter = o.tint;
  // whole-body rotation for knockdowns
  if (st === 'lie') { c.translate(-6, -3); c.rotate(-Math.PI / 2); }
  else if (st === 'fly') { const k = Math.min(1, (o.t || 0) * 3); c.translate(0, -10); c.rotate(-0.4 - k * 0.9); c.translate(0, 10); }
  else if (st === 'rise') { const k = Math.max(0, 1 - (o.t || 0) / 0.3); c.rotate(-Math.PI / 2 * k); }
  const P = poseFor(o);
  const hipY = -38 + P.by, neckY = hipY - 22, robot = L.top === 'robot';
  c.translate(0, hipY); c.rotate(P.lean); c.translate(0, -hipY);
  const skin = L.skin, sleeve = SKIN_ARMS[L.top] ? skin : robot ? L.c2 : L.c, dark = shade(L.c, -0.28);
  const fistCol = L.extras?.includes('gauntlets') ? L.trim : robot ? L.c2 : skin;
  // ---- limbs helpers
  const leg = (hx, ang, colr, shoeCol) => {
    const kx = hx + Math.sin(ang[0]) * 17, ky = hipY + Math.cos(ang[0]) * 17;
    const a2 = ang[0] + ang[1], fx = kx + Math.sin(a2) * 17, fy = ky + Math.cos(a2) * 17;
    seg(hx, hipY, kx, ky, 10, colr); seg(kx, ky, fx, fy, 9, colr);
    c.save(); c.translate(fx, fy); c.rotate(a2 * 0.3); rr(-4, -3, 13, 7, 3.5, shoeCol, INK, 2); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(-3, 2.2, 11, 1.4); c.restore();
  };
  const arm = (sx, sy, ang, colr, hand, hold) => {
    const ex = sx + Math.sin(ang[0]) * 14, ey = sy + Math.cos(ang[0]) * 14;
    const a2 = ang[0] + ang[1], hx = ex + Math.sin(a2) * 13, hy = ey + Math.cos(a2) * 13;
    seg(sx, sy, ex, ey, 8.5, colr); seg(ex, ey, hx, hy, 7.5, colr === skin ? skin : colr);
    if (hold) heldItem(hold, hx, hy, a2);
    circ(hx, hy, fistCol !== skin ? 6.2 : 5.2, INK); circ(hx, hy, fistCol !== skin ? 4.8 : 3.8, fistCol === skin ? hand : fistCol);
    return [hx, hy];
  };
  // ---- back layer: cape, long hair, scarf tails, ponytail
  const capeOn = L.extras?.includes('cape');
  if (capeOn) { const w = Math.sin(an * 4) * 3; path([[-6, neckY + 2], [6, neckY + 2], [-6 - 8, 2 + w], [-24 + w, 0]], shade(L.trim === '#e8402a' ? '#5a0a1a' : '#1a1028', 0), INK); }
  if (L.top === 'cloak') path([[-7, neckY], [9, neckY], [6, hipY + 18], [-16, hipY + 22 + Math.sin(an * 3) * 2]], dark, INK);
  hairBack(L, neckY, an, o);
  if (L.extras?.includes('scarf')) { const w = Math.sin(an * 7); c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 7.5; c.beginPath(); c.moveTo(-2, neckY + 2); c.quadraticCurveTo(-16, neckY + 4 + w * 3, -28, neckY + 8 + w * 6); c.stroke(); c.strokeStyle = L.trim; c.lineWidth = 4.5; c.stroke(); }
  if (L.extras?.includes('staff')) { seg(-12, neckY - 26, -14, 0, 3.5, '#7a5a2a'); circ(-12, neckY - 28, 6, rgba(L.trim, 0.5)); circ(-12, neckY - 28, 3.5, L.trim); }
  // ---- back arm and leg
  arm(-4, neckY + 3, P.aB, shade(sleeve, -0.22), shade(skin, -0.1));
  leg(-3, P.lB, shade(L.pants, -0.25), shade(L.shoes, -0.2));
  // ---- torso
  torso(L, hipY, neckY, an, P);
  // ---- front leg
  leg(3, P.lF, L.pants, L.shoes);
  // skirt / robe hem over the legs
  if (L.extras?.includes('skirt')) path([[-9, hipY - 4], [9, hipY - 4], [14, hipY + 10], [-14, hipY + 10]], L.c, INK);
  if (L.top === 'robe') path([[-10, hipY - 4], [10, hipY - 4], [15, hipY + 28], [-15, hipY + 28]], L.c, INK);
  if (L.top === 'coat') { path([[-10, hipY - 4], [10, hipY - 4], [14, hipY + 9], [-14, hipY + 9]], L.c, INK); c.fillStyle = L.c2; c.fillRect(-14, hipY + 6, 28, 3.5); }
  // ---- head
  head(L, def, neckY, P, o);
  // ---- front arm (with held item)
  arm(5, neckY + 3, P.aF, sleeve, skin, o.hold);
  if (o.glow && (st === 'cast' || st === 'upper')) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(18, neckY + 6, 1, 18, neckY + 6, 18); g.addColorStop(0, rgba(col(o.glow, 1), 0.9)); g.addColorStop(1, rgba(col(o.glow), 0)); c.fillStyle = g; c.beginPath(); c.arc(18, neckY + 6, 18, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
  c.restore(); c = prev;
}
function torso(L, hipY, neckY, an, P) {
  const sh = 11, wa = 8.5, top = neckY + 1, bot = hipY + 2;
  const g = c.createLinearGradient(-sh, top, sh, bot); g.addColorStop(0, shade(L.c, 0.12)); g.addColorStop(1, shade(L.c, -0.2));
  if (L.top === 'robot') {
    rr(-sh - 1, top - 1, 2 * sh + 2, bot - top + 2, 6, g, INK, 2.4);
    rr(-6, top + 5, 12, 10, 3, '#1a2430'); circ(0, top + 10, 3.6, L.trim); c.globalCompositeOperation = 'lighter'; circ(0, top + 10, 6, rgba(L.trim, 0.35)); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = shade(L.c, -0.35); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-sh + 2, bot - 6); c.lineTo(sh - 2, bot - 6); c.stroke();
    return;
  }
  path([[-sh, top], [sh, top], [wa, bot], [-wa, bot]], g, INK, 2.4);
  if (L.top === 'jacket') { path([[-3, top + 1], [3, top + 1], [2.5, bot - 1], [-2.5, bot - 1]], L.c2); c.strokeStyle = L.trim; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3.6, top + 1); c.lineTo(-3, bot - 1); c.moveTo(3.6, top + 1); c.lineTo(3, bot - 1); c.stroke(); }
  if (L.top === 'ninja') { c.strokeStyle = L.c2; c.lineWidth = 5; c.beginPath(); c.moveTo(-sh + 2, top + 2); c.lineTo(sh - 3, bot - 4); c.stroke(); rr(-wa - 1, bot - 6, 2 * wa + 2, 5, 2, L.trim, INK, 1.5); }
  if (L.top === 'tank') { c.fillStyle = shade(L.c, -0.15); c.fillRect(-sh + 3, top, 4, 4); c.fillRect(sh - 7, top, 4, 4); rr(-wa - 1, bot - 5, 2 * wa + 2, 4, 2, '#3a2a1a'); }
  if (L.top === 'hoodie') { c.strokeStyle = L.trim; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2, top + 2); c.lineTo(-3, top + 10); c.moveTo(2, top + 2); c.lineTo(3, top + 10); c.stroke(); rr(-6, bot - 9, 12, 6, 2, L.c2); }
  if (L.top === 'coat') { c.fillStyle = L.c2; c.fillRect(-1.5, top, 3, bot - top); rr(-sh - 1, top - 2, 2 * sh + 2, 5, 2.5, L.c2, INK, 1.5); }
  if (L.top === 'robe') { c.fillStyle = L.trim; c.fillRect(-1.5, top, 3, bot - top); c.fillRect(-wa, bot - 5, 2 * wa, 2.5); }
  if (L.top === 'cloak') { c.fillStyle = L.c2; c.fillRect(-sh + 3, top + 3, 2 * sh - 6, 3); }
  const ex = L.extras || [];
  if (ex.includes('flame')) { c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(0, top + 15); c.quadraticCurveTo(-4, top + 10, -1, top + 5); c.quadraticCurveTo(0, top + 9, 2, top + 6); c.quadraticCurveTo(4, top + 11, 0, top + 15); c.fill(); }
  if (ex.includes('bolt')) { path([[2, top + 3], [-3, top + 10], [0.5, top + 10], [-2, top + 16], [4, top + 8], [0.5, top + 8]], '#ffd84a'); }
  if (ex.includes('leaf')) { ell(0, top + 10, 3, 5, '#8ad86a', 0.6); }
  if (ex.includes('chain')) { c.strokeStyle = '#ffd040'; c.lineWidth = 2; c.setLineDash([2, 2]); c.beginPath(); c.arc(0, top - 2, 9, 0.3, Math.PI - 0.3); c.stroke(); c.setLineDash([]); }
}
function hairBack(L, neckY, an, o) {
  const hy = neckY - 15, sw = Math.sin(an * 4);
  if (L.style === 'ponytail') { const bob = Math.sin(an * 6) * 0.08 + (o.st === 'run' || o.st === 'dash' ? 0.5 : 0); c.save(); c.translate(-9, hy - 9); c.rotate(0.3 + bob); path([[-3, -2], [5, -3], [8, 8], [5, 22], [-1, 30], [-5, 20], [-6, 6]], L.hair, INK); c.strokeStyle = L.hair2; c.lineWidth = 2; c.beginPath(); c.moveTo(1, 2); c.quadraticCurveTo(3, 14, 0, 24); c.stroke(); rr(-5, -4, 10, 5, 2, '#5ab8ff', INK, 1.4); c.restore(); }
  if (L.style === 'long') { path([[-12, hy - 6], [6, hy - 8], [4, hy + 24], [-6, hy + 30 + sw * 2], [-16, hy + 22]], L.hair, INK); }
  if (L.style === 'hood' || L.top === 'hoodie') path([[-14, hy - 2], [2, hy - 16], [12, hy - 4], [8, hy + 14], [-12, hy + 14]], shade(L.c, -0.18), INK);
}
function head(L, def, neckY, P, o) {
  const st = o.st, an = o.anim || 0, hx = 2, hy = neckY - 14;
  c.save(); c.translate(hx, hy + 12); c.rotate(P.head); c.translate(-hx, -hy - 12);
  seg(1, neckY + 2, 2, neckY - 3, 6, L.top === 'robot' ? L.c2 : L.skin);
  const r = 15;
  if (L.style === 'robot') {
    rr(hx - 14, hy - 13, 28, 26, 9, shade(L.skin, 0.1), INK, 2.4);
    rr(hx - 4, hy - 5, 18, 9, 4, '#141c26'); c.globalCompositeOperation = 'lighter'; rr(hx + 1, hy - 3, 11, 4, 2, L.eye); c.globalCompositeOperation = 'source-over';
    seg(hx - 2, hy - 14, hx - 4, hy - 22, 2, '#5a6a7a'); circ(hx - 4, hy - 23, 2.6, L.trim);
    c.restore(); return;
  }
  // face
  c.lineWidth = 2.4; c.strokeStyle = INK;
  const fg = c.createRadialGradient(hx + 4, hy - 4, 3, hx, hy, r); fg.addColorStop(0, shade(L.skin, 0.12)); fg.addColorStop(1, shade(L.skin, -0.1));
  c.fillStyle = fg; c.beginPath(); c.ellipse(hx, hy, r, r * 1.02, 0, 0, 7); c.fill(); c.stroke();
  ell(hx - 7, hy + 2, 3, 4, shade(L.skin, -0.12));                     // ear
  // eyes (three-quarter view, facing right)
  const hurt = st === 'hurt' || st === 'fly' || st === 'lie' || st === 'stun', blink = (an % 3.7) < 0.12 && !hurt;
  const eye = (ex, ey, sz) => {
    if (hurt) { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - 2.5 * sz, ey - 2.5 * sz); c.lineTo(ex + 2.5 * sz, ey + 2.5 * sz); c.moveTo(ex + 2.5 * sz, ey - 2.5 * sz); c.lineTo(ex - 2.5 * sz, ey + 2.5 * sz); c.stroke(); return; }
    if (blink) { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - 2.8 * sz, ey); c.quadraticCurveTo(ex, ey + 2 * sz, ex + 2.8 * sz, ey); c.stroke(); return; }
    ell(ex, ey, 3.1 * sz, 4.4 * sz, '#ffffff'); c.strokeStyle = rgba('#1a1530', 0.55); c.lineWidth = 0.8; c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1.6 * sz; c.beginPath(); c.ellipse(ex, ey, 3.1 * sz, 4.4 * sz, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    const ig = c.createLinearGradient(ex, ey - 4 * sz, ex, ey + 4 * sz); ig.addColorStop(0, shade(L.eye, -0.3)); ig.addColorStop(1, shade(L.eye, 0.35));
    ell(ex + 0.7 * sz, ey + 0.4 * sz, 2.3 * sz, 3.4 * sz, ig); circ(ex + 0.9 * sz, ey + 0.6 * sz, 1.2 * sz, '#0e0a1a'); circ(ex + 1.6 * sz, ey - 1.2 * sz, 0.9 * sz, '#ffffff');
    c.strokeStyle = shade(L.hair, -0.35); c.lineWidth = 1.5 * sz; c.beginPath(); c.moveTo(ex - 2.6 * sz, ey - 6.2 * sz); c.lineTo(ex + 3 * sz, ey - 5.4 * sz); c.stroke();
  };
  if (!L.extras?.includes('shades')) { eye(hx + 9.5, hy + 1, 1); eye(hx + 2, hy + 1.2, 0.78); }
  else { rr(hx - 1, hy - 3, 16, 6, 3, '#121218'); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(hx + 2, hy - 2, 4, 1.5); }
  if (def.girl) { c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hx + 11.5, hy - 2.5); c.lineTo(hx + 13.5, hy - 4); c.stroke(); }
  ell(hx + 10, hy + 7, 2.6, 1.6, 'rgba(255,110,120,0.35)');
  // mouth
  const open = P.open > 0.5 || hurt;
  c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath();
  if (open) { c.ellipse(hx + 8.5, hy + 9, 2.3, 1.9, 0, 0, 7); c.fillStyle = '#7a2030'; c.fill(); c.stroke(); }
  else { c.moveTo(hx + 6, hy + 9); c.quadraticCurveTo(hx + 8.5, hy + 10.5, hx + 11, hy + 8.6); c.stroke(); }
  if (L.extras?.includes('mask')) { path([[hx - 4, hy + 3], [hx + 15, hy + 2], [hx + 14, hy + 11], [hx - 3, hy + 12]], L.c2 || '#33334a', INK, 1.6); }
  if (L.extras?.includes('beard')) path([[hx - 2, hy + 6], [hx + 14, hy + 6], [hx + 10, hy + 16], [hx + 2, hy + 15]], L.hair, INK, 1.6);
  if (L.extras?.includes('scar')) { c.strokeStyle = '#a04a3a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx + 3, hy - 6); c.lineTo(hx + 7, hy + 2); c.stroke(); }
  hairFront(L, hx, hy, r, an, o);
  c.restore();
}
function hairFront(L, hx, hy, r, an, o) {
  const hg = c.createLinearGradient(hx - r, hy - r, hx + r, hy); hg.addColorStop(0, L.hair); hg.addColorStop(1, L.hair2);
  const ex = L.extras || [];
  const hl = () => { c.strokeStyle = rgba('#ffffff', 0.45); c.lineWidth = 1.6; c.beginPath(); c.arc(hx - 1, hy - 3, r * 0.75, -2.4, -1.4); c.stroke(); };
  switch (L.style) {
    case 'spiky': {
      const pts = [[hx - 14, hy + 4]]; const n = 7;
      for (let i = 0; i <= n; i++) { const a = Math.PI * (0.95 + i * 1.15 / n), rr2 = i % 2 ? r * 0.95 : r * 1.55; pts.push([hx + Math.cos(a) * rr2 - (i % 2 ? 0 : 3), hy - 2 + Math.sin(a) * rr2]); }
      pts.push([hx + 16, hy - 2], [hx + 10, hy - 6], [hx + 8, hy + 1], [hx + 4, hy - 5], [hx - 4, hy - 2], [hx - 9, hy + 6]);
      path(pts, hg, INK, 2.2); hl(); break;
    }
    case 'swept': path([[hx - 15, hy + 5], [hx - 16, hy - 8], [hx - 6, hy - 17], [hx + 8, hy - 16], [hx + 22, hy - 10], [hx + 12, hy - 7], [hx + 19, hy - 1], [hx + 7, hy - 3], [hx + 4, hy + 2], [hx - 4, hy - 4], [hx - 8, hy + 6]], hg, INK, 2.2); hl(); break;
    case 'buzz': path([[hx - 15, hy + 3], [hx - 15, hy - 7], [hx - 6, hy - 15], [hx + 7, hy - 15], [hx + 15, hy - 6], [hx + 12, hy - 7], [hx + 2, hy - 8], [hx - 8, hy - 3]], hg, INK, 2.2); break;
    case 'mohawk': path([[hx - 10, hy - 10], [hx - 6, hy - 24], [hx + 2, hy - 18], [hx + 6, hy - 25], [hx + 10, hy - 14], [hx + 4, hy - 12]], hg, INK, 2); break;
    case 'ponytail': path([[hx - 15, hy + 6], [hx - 16, hy - 6], [hx - 8, hy - 15], [hx + 6, hy - 16], [hx + 16, hy - 8], [hx + 17, hy + 4], [hx + 12, hy - 3], [hx + 9, hy + 2], [hx + 5, hy - 4], [hx - 2, hy - 3], [hx - 8, hy + 3]], hg, INK, 2.2); hl(); break;
    case 'long': path([[hx - 15, hy + 8], [hx - 16, hy - 7], [hx - 6, hy - 16], [hx + 8, hy - 16], [hx + 17, hy - 6], [hx + 16, hy + 3], [hx + 9, hy - 5], [hx - 2, hy - 4], [hx - 9, hy + 8]], hg, INK, 2.2); hl(); break;
    case 'cap': path([[hx - 15, hy - 2], [hx - 13, hy - 12], [hx, hy - 17], [hx + 12, hy - 12], [hx + 14, hy - 4]], L.c === '#6a6c80' ? '#262838' : shade(L.c, -0.3), INK, 2.2); path([[hx + 8, hy - 6], [hx + 24, hy - 3], [hx + 22, hy], [hx + 8, hy - 2]], '#1a1c28', INK, 1.8); break;
    case 'hood': path([[hx - 16, hy + 10], [hx - 17, hy - 6], [hx - 4, hy - 19], [hx + 12, hy - 15], [hx + 18, hy - 4], [hx + 14, hy - 6], [hx + 4, hy - 9], [hx - 6, hy - 2], [hx - 10, hy + 12]], L.c, INK, 2.2); break;
    case 'hat': path([[hx - 19, hy - 7], [hx + 21, hy - 7], [hx + 2, hy - 44], [hx - 6, hy - 40]], L.c, INK, 2.2); rr(hx - 21, hy - 11, 44, 6, 3, shade(L.c, -0.25), INK, 1.8); star(hx, hy - 24, 4, L.trim); break;
  }
  if (ex.includes('headband')) { c.fillStyle = '#ffffff'; rr(hx - 15, hy - 9, 31, 5, 2, '#f4f4f4', INK, 1.6); c.fillStyle = '#e8302a'; circ(hx + 9, hy - 6.5, 2, '#e8302a'); const w = Math.sin(an * 9) * 3; seg(hx - 14, hy - 7, hx - 26, hy - 2 + w, 3, '#f4f4f4'); seg(hx - 14, hy - 6, hx - 24, hy + 4 + w, 3, '#f4f4f4'); }
  if (ex.includes('bandana')) rr(hx - 15, hy - 11, 31, 6, 3, '#c83030', INK, 1.6);
  if (ex.includes('snowclip')) { c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(hx - 6 + Math.cos(a) * 4.5, hy - 11 + Math.sin(a) * 4.5); c.lineTo(hx - 6 - Math.cos(a) * 4.5, hy - 11 - Math.sin(a) * 4.5); c.stroke(); } circ(hx - 6, hy - 11, 1.6, '#9ad8ff'); }
  if (ex.includes('tricorn')) path([[hx - 20, hy - 8], [hx + 20, hy - 8], [hx + 12, hy - 22], [hx, hy - 18], [hx - 12, hy - 22]], '#2a1a12', INK, 2.2);
  if (ex.includes('horns')) { path([[hx - 8, hy - 12], [hx - 18, hy - 32], [hx - 2, hy - 15]], '#e8dcc0', INK, 1.8); path([[hx + 6, hy - 13], [hx + 14, hy - 33], [hx + 12, hy - 12]], '#e8dcc0', INK, 1.8); }
  void o;
}
function heldItem(k, x, y, a) {
  c.save(); c.translate(x, y); c.rotate(-a + Math.PI / 2);
  if (k === 'bat') { c.rotate(-1.2); rr(-3, -30, 7, 34, 3.5, '#c8904a', INK, 1.8); rr(-3, 0, 7, 6, 2, '#3a2a1a'); }
  if (k === 'knife') { c.rotate(-1.4); path([[-1.5, 2], [1.5, 2], [2, -14], [0, -18], [-2, -14]], '#dfe4ee', INK, 1.4); rr(-2.5, 1, 5, 6, 1.5, '#5a3a1a'); }
  if (k === 'stone') { circ(0, -6, 10, INK); circ(0, -6, 8.6, '#8a8a92'); circ(-3, -9, 3, '#a8a8b2'); }
  if (k === 'crate') { rr(-13, -24, 26, 24, 2, '#c08a4a', INK, 2); c.strokeStyle = '#7a5a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -23); c.lineTo(12, -1); c.stroke(); }
  if (k === 'bow') { c.strokeStyle = '#7a4a1a'; c.lineWidth = 3; c.beginPath(); c.arc(4, 0, 16, -1.3, 1.3); c.stroke(); c.strokeStyle = '#e8e8e8'; c.lineWidth = 1; c.beginPath(); c.moveTo(4 + Math.cos(-1.3) * 16, Math.sin(-1.3) * 16); c.lineTo(4 + Math.cos(1.3) * 16, Math.sin(1.3) * 16); c.stroke(); }
  c.restore();
}
export function drawPortrait(ctx, def, x, y, s) {
  const prev = c; c = ctx; c.save(); c.translate(x, y); c.scale(s, s);
  const L = def.look; const neckY = 14;
  hairBack(L, neckY, 0, {});
  head(L, def, neckY, { head: 0, open: 0 }, { st: 'idle', anim: 1 });
  c.restore(); c = prev;
}

// ================================================================== backgrounds (prerendered layers per stage)
const BGS = {
  park: { sky: ['#5ab4f0', '#bfe6ff', '#fff4d8'], sun: '#fff6c0', haze: '#cfe8f8', far: '#7cb6a0', mid: '#4f9a52', floor: ['#7cc65a', '#5aa640'], path: '#d8c08a', grade: 'rgba(255,240,200,0.06)', amb: 'leaf' },
  forest: { sky: ['#f4b45a', '#ffd890', '#fff0c8'], sun: '#fff0b0', haze: '#f0d8a0', far: '#4e7a5a', mid: '#2c5a36', floor: ['#5e8a36', '#46702a'], path: '#9a7a4a', grade: 'rgba(255,200,120,0.08)', amb: 'firefly' },
  village: { sky: ['#ff8a5a', '#ffb878', '#ffe0b0'], sun: '#fff0c8', haze: '#ffc8a0', far: '#9a5a6a', mid: '#6a3a40', floor: ['#c89a6a', '#b0845a'], path: '#e0c090', grade: 'rgba(255,140,100,0.08)', amb: 'petal' },
  factory: { sky: ['#2c3444', '#4a5464', '#6a6a70'], sun: null, haze: '#7a7a80', far: '#3a4252', mid: '#2a303c', floor: ['#7a8290', '#5e6674'], path: '#c8a030', grade: 'rgba(80,140,255,0.06)', amb: 'spark' },
  castle: { sky: ['#140a26', '#3a1a4a', '#7a2a5a'], sun: '#f0e8ff', moon: true, haze: '#5a2a5a', far: '#2a1838', mid: '#1c1028', floor: ['#5a5068', '#463e56'], path: '#7a2a3a', grade: 'rgba(120,60,200,0.08)', amb: 'ember' },
  dojo: { sky: ['#f6dcaa', '#fff0d0', '#fff8e8'], sun: null, haze: '#f0d8b0', far: '#c89a60', mid: '#a87840', floor: ['#e0b878', '#c89e60'], path: '#b83a2a', grade: 'rgba(255,220,160,0.06)', amb: 'dust' },
};
const layerCache = {};
function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
function layers(id, arenaW) {
  const key = id + arenaW; if (layerCache[key]) return layerCache[key];
  const P = BGS[id] || BGS.park, prev = c, r = rng(id.length * 977 + 13);
  // sky
  const sky = mk(W, GROUND + 30); c = sky.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, GROUND + 30); g.addColorStop(0, P.sky[0]); g.addColorStop(0.6, P.sky[1]); g.addColorStop(1, P.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, GROUND + 30);
  if (id === 'castle') for (let i = 0; i < 90; i++) circ(r() * W, r() * 200, r() * 1.3 + 0.3, rgba('#ffffff', 0.4 + r() * 0.6));
  if (P.sun) { const sx = id === 'forest' || id === 'village' ? 560 : 620, sy = id === 'village' ? 150 : id === 'forest' ? 120 : 70; const sg = c.createRadialGradient(sx, sy, 4, sx, sy, 160); sg.addColorStop(0, rgba(P.sun, 0.95)); sg.addColorStop(0.2, rgba(P.sun, 0.5)); sg.addColorStop(1, rgba(P.sun, 0)); c.fillStyle = sg; c.fillRect(0, 0, W, GROUND + 30); circ(sx, sy, P.moon ? 30 : 34, P.sun); if (P.moon) circ(sx - 10, sy - 8, 28, P.sky[0]); }
  if (id === 'park' || id === 'dojo' || id === 'village') for (let i = 0; i < 7; i++) { const x = r() * W, y = 30 + r() * 90, s = 0.6 + r() * 0.8; for (let k = 0; k < 5; k++) ell(x + k * 16 * s, y + Math.sin(k * 1.7) * 6 * s, 20 * s, 12 * s, rgba('#ffffff', 0.85)); ell(x + 32 * s, y + 8 * s, 50 * s, 8 * s, rgba(P.sky[1], 0.5)); }
  if (id === 'forest') { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const x = 380 + i * 70; const rg = c.createLinearGradient(x, 0, x - 120, GROUND); rg.addColorStop(0, 'rgba(255,240,180,0.18)'); rg.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = rg; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 30, 0); c.lineTo(x - 80, GROUND + 30); c.lineTo(x - 140, GROUND + 30); c.fill(); } c.globalCompositeOperation = 'source-over'; }
  // far layer (tiles every 1600)
  const TW = 1600, far = mk(TW, GROUND + 30); c = far.getContext('2d');
  const fg = c.createLinearGradient(0, 80, 0, GROUND + 30); fg.addColorStop(0, rgba(P.far, 0.75)); fg.addColorStop(1, P.far);
  c.fillStyle = fg;
  if (id === 'factory') { for (let x = 0; x < TW; x += 120 + r() * 80) { const h = 80 + r() * 90; c.fillRect(x, GROUND + 30 - h - 40, 70 + r() * 50, h + 40); c.fillRect(x + 20, GROUND - h - 90, 14, 60); } }
  else if (id === 'castle') { for (let x = 0; x < TW; x += 260) { c.fillRect(x, 120, 170, 200); c.fillRect(x + 60, 60, 46, 70); c.beginPath(); c.moveTo(x + 52, 62); c.lineTo(x + 83, 14); c.lineTo(x + 114, 62); c.fill(); for (let k = 0; k < 6; k++) c.fillRect(x + k * 30, 110, 18, 14); } }
  else if (id === 'dojo') { c.fillRect(0, 40, TW, GROUND); }
  else { c.beginPath(); c.moveTo(0, GROUND + 30); for (let x = 0; x <= TW; x += 20) c.lineTo(x, 150 + Math.sin(x * 0.006) * 34 + Math.sin(x * 0.017) * 12); c.lineTo(TW, GROUND + 30); c.fill();
    c.fillStyle = rgba(P.haze, 0.25); c.fillRect(0, 140, TW, GROUND); }
  // mid layer
  const mid = mk(TW, GROUND + 40); c = mid.getContext('2d');
  midLayer(id, P, TW, r);
  // floor (arena length)
  const FH = H - GROUND + 30, floor = mk(arenaW + W, FH); c = floor.getContext('2d');
  const flg = c.createLinearGradient(0, 0, 0, FH); flg.addColorStop(0, shade(P.floor[1], -0.15)); flg.addColorStop(0.3, P.floor[1]); flg.addColorStop(1, P.floor[0]); c.fillStyle = flg; c.fillRect(0, 0, arenaW + W, FH);
  floorDetail(id, P, arenaW + W, FH, r);
  // grade + vignette
  const vig = mk(W, H); c = vig.getContext('2d');
  const vg = c.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,30,0.42)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.fillStyle = P.grade; c.fillRect(0, 0, W, H);
  c = prev;
  return (layerCache[key] = { sky, far, mid, floor, vig, TW, P });
}
function tree(x, base, h, colr, r) {
  c.fillStyle = shade('#6a4a2a', -0.1); c.fillRect(x - 5, base - h * 0.45, 10, h * 0.45);
  const blobs = 6; for (let i = 0; i < blobs; i++) { const a = i / blobs * Math.PI * 2; circ(x + Math.cos(a) * h * 0.22, base - h * 0.62 + Math.sin(a) * h * 0.16, h * 0.24, colr); }
  circ(x, base - h * 0.7, h * 0.3, colr);
  circ(x - h * 0.08, base - h * 0.78, h * 0.16, shade(colr, 0.18)); circ(x + h * 0.14, base - h * 0.55, h * 0.12, shade(colr, -0.15));
  void r;
}
function pine(x, base, h, colr) { c.fillStyle = '#4a3220'; c.fillRect(x - 4, base - h * 0.2, 8, h * 0.2); for (let i = 0; i < 4; i++) { const y = base - h * 0.2 - i * h * 0.2, w = h * (0.32 - i * 0.06); path([[x - w, y], [x + w, y], [x, y - h * 0.32]], i % 2 ? colr : shade(colr, 0.1)); } }
function midLayer(id, P, TW, r) {
  const base = GROUND + 18;
  if (id === 'park') {
    for (let x = 30; x < TW; x += 150 + r() * 90) tree(x, base, 120 + r() * 50, shade(P.mid, (r() - 0.5) * 0.15), r);
    for (let x = 100; x < TW; x += 400) { rr(x, base - 30, 70, 6, 2, '#a86a3a', INK, 1.5); c.fillStyle = '#5a3a2a'; c.fillRect(x + 6, base - 24, 5, 22); c.fillRect(x + 58, base - 24, 5, 22); rr(x, base - 48, 70, 5, 2, '#a86a3a', INK, 1.5); }
    for (let x = 260; x < TW; x += 520) { c.fillStyle = '#3a3a4a'; c.fillRect(x, base - 110, 5, 110); circ(x + 2, base - 112, 9, '#fff6c0'); circ(x + 2, base - 112, 14, 'rgba(255,246,192,0.3)'); }
    c.fillStyle = '#ffffff'; for (let x = 0; x < TW; x += 24) { c.fillRect(x, base - 26, 5, 26); } c.fillRect(0, base - 22, TW, 4); c.fillRect(0, base - 11, TW, 4);
  } else if (id === 'forest') {
    for (let x = 0; x < TW; x += 70 + r() * 50) pine(x, base, 170 + r() * 80, shade(P.mid, (r() - 0.5) * 0.2));
    for (let x = 40; x < TW; x += 230) { c.fillStyle = '#f0e8d8'; c.fillRect(x, base - 12, 5, 12); ell(x + 2.5, base - 12, 10, 6, '#d83a2a'); circ(x - 2, base - 14, 1.6, '#ffffff'); circ(x + 5, base - 13, 1.4, '#ffffff'); }
  } else if (id === 'village') {
    for (let x = 0; x < TW; x += 260) {
      rr(x + 20, base - 110, 180, 110, 0, '#f0e0c0', INK, 2); c.fillStyle = '#7a3a2a'; for (let k = 0; k < 4; k++) c.fillRect(x + 30 + k * 44, base - 100, 32, 60);
      c.fillStyle = '#e8d8b8'; for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) c.fillRect(x + 32 + k * 44, base - 98 + j * 20, 28, 17);
      path([[x, base - 108], [x + 220, base - 108], [x + 190, base - 150], [x + 30, base - 150]], '#3a2a3a', INK);
      path([[x - 12, base - 104], [x + 8, base - 112], [x + 212, base - 112], [x + 232, base - 104]], '#2a1e2a');
      circ(x + 230, base - 80, 10, '#ff5a3a'); circ(x + 230, base - 80, 16, 'rgba(255,120,80,0.3)'); c.fillStyle = INK; c.fillRect(x + 229, base - 104, 2, 14);
    }
    for (let x = 120; x < TW; x += 520) { c.fillStyle = '#5a3a2a'; c.fillRect(x - 5, base - 90, 10, 90); for (let i = 0; i < 14; i++) circ(x + (r() - 0.5) * 110, base - 110 + (r() - 0.5) * 60, 16 + r() * 10, i % 3 ? '#ffb8d0' : '#ff9ac0'); }
  } else if (id === 'factory') {
    c.fillStyle = '#20262e'; for (let x = 0; x < TW; x += 200) { c.fillRect(x, 20, 16, base); } c.fillRect(0, 20, TW, 14);
    for (let x = 0; x < TW; x += 200) { c.strokeStyle = '#20262e'; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 8, 34); c.lineTo(x + 100, 120); c.lineTo(x + 192, 34); c.stroke(); }
    for (let x = 40; x < TW; x += 330) { rr(x, base - 80, 120, 80, 4, '#4a5262', INK, 2); c.fillStyle = '#ffcc2a'; for (let k = 0; k < 5; k++) { path([[x + k * 24, base - 12], [x + k * 24 + 12, base - 12], [x + k * 24 + 2, base], [x + k * 24 - 10, base]], '#ffcc2a'); } c.fillStyle = '#2a3a4a'; c.fillRect(x + 12, base - 70, 40, 26); c.fillStyle = '#6ad0ff'; c.fillRect(x + 15, base - 67, 34, 20); }
    c.strokeStyle = '#5a6a7a'; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 70); c.lineTo(TW, 70); c.stroke(); c.strokeStyle = '#7a8a9a'; c.lineWidth = 3; c.stroke();
  } else if (id === 'castle') {
    for (let x = 0; x < TW; x += 180) { rr(x, 40, 34, base - 40, 0, '#2a2236', INK, 2); c.fillStyle = '#3a2e4a'; c.fillRect(x + 4, 40, 6, base - 40); }
    for (let x = 60; x < TW; x += 360) { rr(x, 70, 70, 120, 34, '#3a1830', INK, 2); const gw = c.createLinearGradient(x, 70, x, 190); gw.addColorStop(0, '#c83a5a'); gw.addColorStop(1, '#5a1a8a'); rr(x + 8, 78, 54, 104, 27, gw); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 35, 78); c.lineTo(x + 35, 182); c.moveTo(x + 8, 130); c.lineTo(x + 62, 130); c.stroke(); }
    for (let x = 140; x < TW; x += 360) { rr(x, base - 120, 40, 120, 2, '#6a1a2a'); c.fillStyle = '#ffd040'; c.fillRect(x + 4, base - 116, 32, 3); }
  } else if (id === 'dojo') {
    c.fillStyle = '#f8ecd0'; for (let x = 0; x < TW; x += 110) { c.fillRect(x + 12, 80, 86, 130); c.strokeStyle = '#c8a878'; c.lineWidth = 1.5; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + 12 + k * 21.5, 80); c.lineTo(x + 12 + k * 21.5, 210); c.stroke(); } for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x + 12, 80 + k * 26); c.lineTo(x + 98, 80 + k * 26); c.stroke(); } }
    c.fillStyle = '#6a3a18'; for (let x = 0; x < TW; x += 110) c.fillRect(x, 50, 12, base); c.fillRect(0, 50, TW, 16); c.fillRect(0, 210, TW, 10);
    for (let x = 300; x < TW; x += 560) { rr(x, 70, 54, 130, 2, '#f4f0e8', INK, 2); c.fillStyle = '#b8302a'; c.font = 'bold 34px serif'; c.textAlign = 'center'; c.fillText('拳', x + 27, 125); c.fillText('道', x + 27, 170); }
  }
}
function floorDetail(id, P, w, h, r) {
  if (id === 'park' || id === 'forest') {
    for (let i = 0; i < w / 3; i++) { const x = r() * w, y = 10 + r() * (h - 10), k = y / h; c.strokeStyle = rgba(shade(P.floor[0], (r() - 0.5) * 0.3), 0.8); c.lineWidth = 1 + k; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - 3 - k * 5); c.stroke(); }
    const pg = c.createLinearGradient(0, 70, 0, 130); pg.addColorStop(0, rgba(P.path, 0.9)); pg.addColorStop(1, rgba(shade(P.path, -0.1), 0.9)); c.fillStyle = pg;
    c.beginPath(); c.moveTo(0, 82); for (let x = 0; x <= w; x += 40) c.lineTo(x, 80 + Math.sin(x * 0.01) * 6); for (let x = w; x >= 0; x -= 40) c.lineTo(x, 122 + Math.sin(x * 0.013) * 6); c.fill();
    for (let i = 0; i < w / 30; i++) ell(r() * w, 86 + r() * 34, 2 + r() * 3, 1.4 + r() * 1.5, rgba('#8a7a5a', 0.6));
    for (let i = 0; i < w / 60; i++) { const x = r() * w, y = 140 + r() * (h - 150); for (let k = 0; k < 4; k++) circ(x + k * 4, y, 2.2, ['#ffffff', '#ffd84a', '#ff8ac0'][k % 3]); }
  } else if (id === 'village' || id === 'dojo') {
    for (let y = 0; y < h; y += 16 + y * 0.08) { c.fillStyle = rgba('#000000', 0.12); c.fillRect(0, y, w, 1.5); }
    for (let x = 0; x < w; x += 90) for (let y = 0, row = 0; y < h; y += 16 + y * 0.08, row++) { c.fillStyle = rgba('#000000', 0.1); c.fillRect(x + (row % 2) * 45, y, 1.5, 16 + y * 0.08); }
    if (id === 'dojo') { c.fillStyle = rgba(P.path, 0.85); c.fillRect(0, 70, w, 6); c.fillRect(0, h - 40, w, 6); }
  } else if (id === 'factory') {
    for (let x = 0; x < w; x += 80) for (let y = 0; y < h; y += 50) { rr(x + 2, y + 2, 76, 46, 3, rgba('#ffffff', 0.04), rgba('#000000', 0.25), 1.5); circ(x + 8, y + 8, 2, '#4a525e'); circ(x + 72, y + 8, 2, '#4a525e'); }
    c.fillStyle = '#26262c'; c.fillRect(0, 74, w, 44); for (let x = 0; x < w; x += 36) path([[x, 74], [x + 18, 74], [x + 6, 80], [x - 12, 80]], '#ffcc2a'); for (let x = 0; x < w; x += 36) path([[x, 118], [x + 18, 118], [x + 6, 112], [x - 12, 112]], '#ffcc2a');
  } else if (id === 'castle') {
    for (let y = 0, row = 0; y < h; y += 22 + row * 2, row++) for (let x = (row % 2) * 30; x < w; x += 60) rr(x + 1, y + 1, 58, 20 + row * 2, 3, shade(P.floor[1], (r() - 0.5) * 0.12), rgba('#000000', 0.3), 1.2);
    c.fillStyle = rgba('#8a1a2a', 0.85); c.fillRect(0, 78, w, 44); c.fillStyle = '#d8a040'; c.fillRect(0, 78, w, 3); c.fillRect(0, 119, w, 3);
  }
}

// ================================================================== particles (visual only)
const parts = [], seen = new WeakSet(), ghosts = new WeakMap();
function emit(x, y, z, n, o) { for (let i = 0; i < n; i++) { const a = o.a != null ? o.a + (Math.random() - 0.5) * (o.spread ?? 6.3) : Math.random() * 6.3, v = (o.v || 80) * (0.4 + Math.random() * 0.8); parts.push({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (o.up || 0), g: o.g ?? 160, t: 0, life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), r: (o.r || 2.5) * (0.6 + Math.random() * 0.8), col: o.col, add: o.add, kind: o.kind || 'dot', rot: Math.random() * 6 }); } }
function spawnFor(B) {
  for (const f of B.fx) {
    if (seen.has(f) || f.t < 0) continue; seen.add(f);
    const sy = GROUND + f.z - (f.y || 0), e = f.elem || 'phys';
    if (f.k === 'hit') { emit(f.x, sy, f.z, 10, { v: 170, life: 0.35, r: 2.6, col: col(e, 1), add: true, g: 300 }); emit(f.x, sy, f.z, 6, { v: 90, life: 0.4, r: 3.5, col: col(e), add: true, g: 100 }); }
    if (f.k === 'block') emit(f.x, sy, f.z, 8, { v: 120, life: 0.3, r: 2, col: '#9ad8ff', add: true });
    if (f.k === 'nova') emit(f.x, GROUND + f.z - 10, f.z, 34, { v: (f.r || 100) * 2.2, life: 0.55, r: 4, col: col(e), add: true, g: 0, up: -40 });
    if (f.k === 'column') emit(f.x, GROUND + f.z, f.z, 14, { a: -1.57, spread: 1.2, v: 260, life: 0.6, r: 3.5, col: col(e), add: e !== 'earth' && e !== 'nature', g: 500 });
    if (f.k === 'shatter') emit(f.x, sy, f.z, 16, { v: 200, life: 0.6, r: 3, col: '#d8f4ff', g: 500, kind: 'shard' });
    if (f.k === 'poof') emit(f.x, sy, f.z, 10, { v: 50, life: 0.7, r: 9, col: f.elem === 'elec' ? '#fff6a0' : 'rgba(210,210,225,0.7)', g: -30, kind: 'smoke' });
    if (f.k === 'heal') emit(f.x, GROUND + f.z, f.z, 12, { a: -1.57, spread: 1.4, v: 70, life: 1, r: 3, col: '#8affa0', add: true, g: -40, kind: 'plus' });
    if (f.k === 'aura') emit(f.x, GROUND + f.z - 30, f.z, 8, { a: -1.57, spread: 2, v: 60, life: 0.6, r: 3, col: col(e), add: true, g: -60 });
  }
  for (const p of B.projs) {
    if (p.kind === 'ball' && !p.arrow && !p.star) { const sx = p.x, sy = GROUND + p.z - p.y; if (Math.random() < 0.8) emit(sx - p.face * 6, sy, p.z, 1, { a: p.face > 0 ? 3.14 : 0, spread: 1, v: 40, life: 0.35, r: p.elem === 'ice' ? 2 : 3, col: col(p.elem, Math.random() < 0.5 ? 0 : 1), add: p.elem !== 'earth', g: p.elem === 'fire' ? -80 : 30 }); }
    if (p.kind === 'fall' && p.y > 0) emit(p.x, GROUND + p.z - p.y, p.z, 1, { a: -1.2, spread: 0.6, v: 40, life: 0.35, r: p.big ? 6 : 2.5, col: col(p.elem), add: true, g: -40 });
  }
}
function stepParts(dt, B) {
  spawnFor(B);
  for (const p of parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; }
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t > parts[i].life) parts.splice(i, 1);
  if (parts.length > 700) parts.splice(0, parts.length - 700);
}
function drawParts(B, front) {
  for (const p of parts) {
    if ((p.z > ZD * 0.5) !== front && p.kind !== 'amb') continue;
    const k = 1 - p.t / p.life, sx = p.x - B.cam, sy = p.y;
    c.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
    if (p.add) c.globalCompositeOperation = 'lighter';
    if (p.kind === 'shard') { c.save(); c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); c.restore(); }
    else if (p.kind === 'plus') { c.fillStyle = p.col; c.fillRect(sx - p.r, sy - 0.8, p.r * 2, 1.6); c.fillRect(sx - 0.8, sy - p.r, 1.6, p.r * 2); }
    else if (p.kind === 'smoke') circ(sx, sy, p.r * (1.4 - k * 0.6), p.col);
    else circ(sx, sy, p.r * (0.5 + k * 0.5), p.col);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
}
// ambient particles (in screen space)
const amb = [];
function ambient(B, P, dt) {
  const kind = P.amb, want = { leaf: 14, firefly: 26, petal: 22, spark: 16, ember: 24, dust: 18 }[kind] || 0;
  while (amb.length < want) amb.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * 9, s: 0.5 + Math.random() });
  for (const a of amb) {
    a.t += dt;
    if (kind === 'leaf' || kind === 'petal') { a.x += (-18 + Math.sin(a.t) * 14) * dt * a.s; a.y += 22 * dt * a.s; }
    if (kind === 'firefly' || kind === 'dust') { a.x += Math.sin(a.t * 0.7 + a.s * 5) * 10 * dt; a.y += Math.cos(a.t * 0.9) * 8 * dt; }
    if (kind === 'spark') { a.y += 80 * dt * a.s; a.x += 10 * dt; }
    if (kind === 'ember') { a.y -= 26 * dt * a.s; a.x += Math.sin(a.t * 2) * 12 * dt; }
    if (a.y > H + 10) { a.y = -10; a.x = Math.random() * W; } if (a.y < -10) { a.y = H + 10; a.x = Math.random() * W; }
    if (a.x < -10) a.x = W + 10; if (a.x > W + 10) a.x = -10;
    const x = a.x, y = a.y;
    if (kind === 'leaf') ell(x, y, 4 * a.s, 2 * a.s, rgba('#6ab84a', 0.85), a.t * 2);
    if (kind === 'petal') ell(x, y, 3.5 * a.s, 2 * a.s, rgba('#ffb8d4', 0.9), a.t * 2);
    if (kind === 'firefly') { c.globalCompositeOperation = 'lighter'; circ(x, y, 5 * a.s, rgba('#ffe890', 0.12 + 0.12 * Math.sin(a.t * 3))); circ(x, y, 1.4, rgba('#fff8c0', 0.5 + 0.5 * Math.sin(a.t * 3))); c.globalCompositeOperation = 'source-over'; }
    if (kind === 'dust') circ(x, y, 1.4 * a.s, rgba('#fff0d0', 0.4));
    if (kind === 'spark') { c.globalCompositeOperation = 'lighter'; circ(x, y, 1.6, rgba('#ffd060', 0.8)); c.globalCompositeOperation = 'source-over'; }
    if (kind === 'ember') { c.globalCompositeOperation = 'lighter'; circ(x, y, 2 * a.s, rgba('#ff7a4a', 0.5 + 0.3 * Math.sin(a.t * 4))); c.globalCompositeOperation = 'source-over'; }
  }
  void B;
}

// ================================================================== fighters, projectiles, items, fx
function shadow(x, y, rx) { const g = c.createRadialGradient(x, y, 1, x, y, rx); g.addColorStop(0, 'rgba(10,6,30,0.38)'); g.addColorStop(1, 'rgba(10,6,30,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, rx * 0.28, 0, 0, 7); c.fill(); }
function fighter(B, e) {
  const sx = e.x - B.cam, gy = GROUND + e.z, sy = gy - e.y;
  if (sx < -90 || sx > W + 90) return;
  shadow(sx, gy, (e.def.big ? 30 : 22) * (1 - Math.min(0.5, e.y / 200)));
  if (e.kind === 'hawk') { hawk(sx, sy, e); return; }
  // afterimages while dashing / running / teleporting
  const gl = ghosts.get(e) || []; if (!ghosts.has(e)) ghosts.set(e, gl);
  if ((e.st === 'dash' || e.st === 'run' || e.st === 'runatk' || e.st === 'upper') && (!gl.length || B.t - gl[gl.length - 1].t > 0.045)) gl.push({ t: B.t, x: e.x, z: e.z, y: e.y, st: e.st, an: e.anim, face: e.face });
  while (gl.length && B.t - gl[0].t > 0.22) gl.shift();
  const tintEl = e.sk?.elem || e.def.elem || 'phys';
  for (const g of gl) { const k = 1 - (B.t - g.t) / 0.22; drawFighter(c, e.def, g.x - B.cam, GROUND + g.z - g.y, g.face, 1, { st: g.st, anim: g.an, alpha: 0.22 * k }); }
  void tintEl;
  // aura for buffs
  if (e.buffs.power || e.buffs.guard || e.buffs.armor) { const k = e.buffs.power ? 'elec' : e.buffs.armor ? 'earth' : 'nature'; c.globalCompositeOperation = 'lighter'; const ag = c.createRadialGradient(sx, sy - 40, 6, sx, sy - 40, 46); ag.addColorStop(0, rgba(col(k), 0.0)); ag.addColorStop(0.7, rgba(col(k), 0.22 + 0.1 * Math.sin(B.t * 8))); ag.addColorStop(1, rgba(col(k), 0)); c.fillStyle = ag; c.beginPath(); c.ellipse(sx, sy - 40, 34, 50, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
  const blink = e.inv > 0 && e.inv < 2 && e.st !== 'lie' && e.st !== 'rise' && Math.floor(B.t * 20) % 2 === 0;
  const alpha = e.dead ? Math.max(0, 1 - (e.t - 0.3) * 1.2) : e.ghost ? 0.6 : blink ? 0.5 : 1;
  drawFighter(c, e.def, sx, sy, e.face, 1, { st: e.frozenT > 0 ? 'frozen' : e.st, t: e.t, anim: e.frozenT > 0 ? 0 : e.anim, pose: e.pose, hold: e.hold?.kind || (e.def.look?.extras?.includes('bow') ? 'bow' : null), alpha,
    atk: e.atk, sk: e.sk?.kind, glow: e.sk?.elem, vy: e.vy, tint: e.ghost ? 'hue-rotate(220deg) saturate(0.6) brightness(0.8)' : e.flash > 0 ? 'brightness(1.7)' : null });
  if (e.frozenT > 0) { const ig = c.createLinearGradient(sx - 24, sy - 92, sx + 24, sy); ig.addColorStop(0, 'rgba(220,248,255,0.75)'); ig.addColorStop(1, 'rgba(120,200,255,0.55)'); path([[sx - 22, sy], [sx - 25, sy - 70], [sx - 8, sy - 94], [sx + 18, sy - 86], [sx + 26, sy - 30], [sx + 20, sy]], ig, '#ffffff', 2); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(sx - 15, sy - 78, 5, 48); }
  if (e.burnT > 0) { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const fx = sx + Math.sin(B.t * 18 + i * 2) * 11, fy = sy - 18 - i * 13 - (B.t * 70 + i * 9) % 16; circ(fx, fy, 8 - i, rgba(i % 2 ? '#ffd23a' : '#ff5a1a', 0.75)); } c.globalCompositeOperation = 'source-over'; }
  if (e.st === 'stun') for (let i = 0; i < 3; i++) { const a = B.t * 6 + i * 2.1; star(sx + Math.cos(a) * 16, sy - 96 + Math.sin(a) * 5, 4.5, '#ffe040'); }
  if (e.st === 'defend') { c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(140,210,255,0.65)'; c.lineWidth = 4; c.beginPath(); c.arc(sx + e.face * 8, sy - 40, 30, e.face > 0 ? -1.1 : Math.PI - 1.1, e.face > 0 ? 1.1 : Math.PI + 1.1); c.stroke(); c.globalCompositeOperation = 'source-over'; }
  const top = sy - (e.def.big ? 112 : 98);
  if (e.pi < 0 && !e.boss && e.hp < e.mhp && !e.dead) { rr(sx - 22, top, 44, 6, 3, 'rgba(10,6,30,0.65)'); rr(sx - 21, top + 1, 42 * Math.max(0, e.hp / e.mhp), 4, 2, e.team === 0 ? '#5ae06a' : '#ff5a4a'); }
  if (e.pi >= 0) { const tc = e.pi ? '#4aa8ff' : '#ff4a5a'; path([[sx - 6, top - 2], [sx + 6, top - 2], [sx, top + 6]], tc, INK, 1.5); c.font = '900 12px "Baloo 2", "Arial Black", sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = INK; c.strokeText(e.pi ? '2P' : '1P', sx, top - 5); c.fillStyle = tc; c.fillText(e.pi ? '2P' : '1P', sx, top - 5); }
}
function hawk(x, y, e) {
  const f = Math.sin(e.anim * 14) * 9;
  path([[x - 4, y], [x - 24, y - 6 - f], [x - 10, y + 4]], '#8a5a32', INK, 1.5); path([[x + 4, y], [x + 24, y - 6 - f], [x + 10, y + 4]], '#8a5a32', INK, 1.5);
  ell(x, y, 9, 6.5, '#9a6a3a'); circ(x + 8 * e.face, y - 5, 5.5, '#f4f4f4'); path([[x + 12 * e.face, y - 6], [x + 18 * e.face, y - 3.5], [x + 12 * e.face, y - 1.5]], '#ffc020');
}
function glowBall(x, y, r, e) {
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 1, x, y, r * 2.6); g.addColorStop(0, rgba(col(e, 1), 0.95)); g.addColorStop(0.35, rgba(col(e), 0.75)); g.addColorStop(1, rgba(col(e), 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, 7); c.fill();
  c.globalCompositeOperation = 'source-over';
}
function projectile(B, p) {
  const sx = p.x - B.cam, sy = GROUND + p.z - p.y; if (sx < -120 || sx > W + 120) return;
  if (p.kind !== 'fall' && p.y > 0) shadow(sx, GROUND + p.z, p.r * 1.2);
  const e = p.elem || 'phys';
  if (p.kind === 'wall') { const a = Math.min(1, p.life * 2); c.globalAlpha = a; const ig = c.createLinearGradient(sx, sy - 80, sx, sy); ig.addColorStop(0, 'rgba(230,250,255,0.85)'); ig.addColorStop(1, 'rgba(110,190,255,0.7)'); path([[sx - 18, sy], [sx - 20, sy - 64], [sx - 6, sy - 84], [sx + 12, sy - 74], [sx + 20, sy - 30], [sx + 16, sy]], ig, '#ffffff', 2); c.globalAlpha = 1; return; }
  if (p.kind === 'thrown') { c.save(); c.translate(sx, sy); c.rotate(p.t * 12 * p.face); itemArt(p.item, 0, 0); c.restore(); return; }
  if (p.kind === 'bomb') { circ(sx, sy, 9, INK); circ(sx, sy, 7.6, '#2a2a3a'); glowBall(sx + 5, sy - 8, 3, 'fire'); return; }
  if (p.arrow) { c.save(); c.translate(sx, sy); c.rotate(Math.atan2(-p.vy, p.vx)); c.fillStyle = '#8a5a2a'; c.fillRect(-20, -1.5, 28, 3); path([[8, -5], [17, 0], [8, 5]], '#e0e4ee', INK, 1.2); path([[-22, -5], [-15, 0], [-22, 5], [-18, 0]], '#e84a3a'); c.restore(); return; }
  if (p.star) { c.save(); c.translate(sx, sy); c.rotate(p.t * 22); star(0, 0, 11, INK); star(0, 0, 9, '#cfd4e0'); circ(0, 0, 2.5, '#3a3a4a'); c.restore(); return; }
  if (p.kind === 'fall') {
    if (p.big) { glowBall(sx, sy, p.r * 0.5, 'fire'); circ(sx, sy, p.r * 0.42, INK); circ(sx, sy, p.r * 0.38, '#7a5232'); circ(sx - 8, sy - 8, p.r * 0.12, '#9a7252'); return; }
    if (p.arrow) { c.save(); c.translate(sx, sy); c.rotate(Math.atan2(-p.vy, p.vx)); c.fillStyle = '#8a5a2a'; c.fillRect(-16, -1.2, 22, 2.4); path([[6, -4], [13, 0], [6, 4]], '#e0e4ee'); c.restore(); return; }
    if (e === 'ice') { path([[sx - 6, sy - 24], [sx + 6, sy - 24], [sx, sy + 8]], '#d8f4ff', '#ffffff', 1.4); return; }
    glowBall(sx, sy, 7, e); circ(sx, sy, 5, col(e, 1)); return;
  }
  const r = p.r;
  if (e === 'earth') { c.save(); c.translate(sx, sy); c.rotate(p.t * 8); path([[-r, -r * 0.6], [-r * 0.3, -r], [r, -r * 0.7], [r * 0.9, r * 0.6], [-r * 0.2, r], [-r, r * 0.5]], '#9a7a5a', INK, 2); c.fillStyle = '#b89a76'; c.fillRect(-r * 0.4, -r * 0.6, r * 0.6, r * 0.4); c.restore(); return; }
  if (e === 'ice') { glowBall(sx, sy, r * 0.8, 'ice'); c.save(); c.translate(sx, sy); c.rotate(p.t * 6); c.fillStyle = '#e8faff'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); c.lineTo(Math.cos(a + 0.52) * r * 0.5, Math.sin(a + 0.52) * r * 0.5); } c.fill(); c.restore(); return; }
  if (e === 'elec') { glowBall(sx, sy, r, 'elec'); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#fff8b0'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 4; i++) { const a = Math.random() * 6.3; c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * r * 1.6, sy + Math.sin(a) * r * 1.6); } c.stroke(); c.globalCompositeOperation = 'source-over'; return; }
  if (e === 'fire') { glowBall(sx, sy, r * 1.1, 'fire'); c.globalCompositeOperation = 'lighter'; for (let i = 1; i < 4; i++) circ(sx - p.face * i * 8, sy + Math.sin(B.t * 30 + i) * 2, r * (1 - i * 0.22), rgba(i % 2 ? '#ffb030' : '#ff5a1a', 0.6)); c.globalCompositeOperation = 'source-over'; circ(sx, sy, r * 0.45, '#fffbe0'); return; }
  glowBall(sx, sy, r, e); circ(sx, sy, r * 0.42, '#ffffff');
}
export function itemArt(k, x, y) {
  if (k === 'bat') { c.save(); c.translate(x, y); c.rotate(-0.4); rr(-3.5, -20, 7, 34, 3.5, '#c8904a', INK, 1.8); rr(-3.5, 10, 7, 6, 2, '#3a2a1a'); c.restore(); }
  if (k === 'knife') { path([[x - 10, y - 2], [x + 3, y - 2.5], [x + 3, y + 2.5], [x - 10, y + 2]], '#dfe4ee', INK, 1.3); rr(x + 3, y - 3, 7, 6, 2, '#5a3a1a', INK, 1.2); }
  if (k === 'stone') { circ(x, y, 11.5, INK); circ(x, y, 10, '#8a8a92'); circ(x - 3, y - 3, 3.5, '#acacb6'); }
  if (k === 'crate') { rr(x - 13, y - 13, 26, 26, 2, '#c08a4a', INK, 2); c.strokeStyle = '#7a5a2a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 11, y - 11); c.lineTo(x + 11, y + 11); c.moveTo(x - 13, y); c.lineTo(x + 13, y); c.stroke(); }
  if (k === 'milkbottle') { rr(x - 7, y - 12, 14, 21, 5, '#ffffff', INK, 1.8); rr(x - 4.5, y - 17, 9, 6, 2, '#4aa0ff', INK, 1.4); c.fillStyle = '#4aa0ff'; c.fillRect(x - 6, y - 3, 12, 4); }
  if (k === 'coin') { circ(x, y, 7.5, INK); circ(x, y, 6.4, '#ffc21a'); circ(x - 1, y - 1, 3.8, '#ffe070'); c.fillStyle = '#c88a10'; c.fillRect(x - 0.8, y - 3, 1.6, 6); }
}
function items(B) {
  for (const it of B.items) {
    const sx = it.x - B.cam, gy = GROUND + it.z; if (sx < -40 || sx > W + 40) continue;
    shadow(sx, gy, 12);
    const bob = it.kind === 'coin' ? Math.abs(Math.sin(B.t * 6 + it.x)) * 4 : 0;
    if (it.kind === 'coin') { c.save(); c.translate(sx, gy - it.y - 9 - bob); c.scale(Math.abs(Math.cos(B.t * 4 + it.x)) * 0.8 + 0.2, 1); itemArt('coin', 0, 0); c.restore(); }
    else itemArt(it.kind, sx, gy - it.y - 11);
  }
}
function effects(B) {
  for (const f of B.fx) {
    if (f.t < 0) { if (f.k === 'bolt') { const sx = f.x - B.cam, gy = GROUND + f.z; c.globalCompositeOperation = 'lighter'; ell(sx, gy, 30, 9, rgba('#ffe040', Math.floor(B.t * 16) % 2 ? 0.45 : 0.15)); c.globalCompositeOperation = 'source-over'; } continue; }
    const sx = f.x - B.cam, gy = GROUND + f.z, sy = gy - (f.y || 0), k = f.t / (f.life || 0.3), e = f.elem || 'phys';
    c.globalAlpha = Math.max(0, 1 - k);
    switch (f.k) {
      case 'hit': c.globalCompositeOperation = 'lighter'; star(sx, sy, 16 * (1 - k) + 6, rgba(col(e, 1), 0.9)); circ(sx, sy, 22 * k + 4, rgba(col(e), 0.35)); c.globalCompositeOperation = 'source-over'; break;
      case 'block': c.strokeStyle = '#9ad8ff'; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, 10 + k * 18, 0, 7); c.stroke(); break;
      case 'column': {
        const h = 110 * Math.min(1, f.t * 8) * (1 - Math.max(0, k - 0.6) * 2.5);
        if (e === 'fire') { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) circ(sx + Math.sin(B.t * 30 + i) * 6, gy - i * h / 7, 18 - i * 1.6, rgba(i % 2 ? '#ffd23a' : '#ff5a1a', 0.7)); c.globalCompositeOperation = 'source-over'; }
        else if (e === 'nature') { c.strokeStyle = '#3a9a3a'; c.lineWidth = 6; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sx + i * 10, gy); c.quadraticCurveTo(sx + i * 22, gy - h / 2, sx + i * 6, gy - h * 0.8); c.stroke(); } }
        else { const ice = e === 'ice'; for (let i = -1; i <= 1; i++) { const hh = h * (i ? 0.72 : 1); const sg = c.createLinearGradient(sx, gy - hh, sx, gy); sg.addColorStop(0, ice ? '#ffffff' : '#d8b080'); sg.addColorStop(1, ice ? '#6ac0ff' : '#7a5232'); path([[sx + i * 15 - 11, gy], [sx + i * 15, gy - hh], [sx + i * 15 + 11, gy]], sg, INK, 1.8); } }
        break;
      }
      case 'bolt': { c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,240,140,0.9)'; c.lineWidth = 9; c.beginPath(); let x = sx, y = 0; c.moveTo(x, y); while (y < gy) { y += 28; x = sx + (Math.random() - 0.5) * 34; c.lineTo(x, Math.min(gy, y)); } c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.stroke(); ell(sx, gy, 36, 11, 'rgba(255,240,120,0.6)'); c.globalCompositeOperation = 'source-over'; break; }
      case 'nova': { const r = f.r * (0.3 + k * 0.85); c.globalCompositeOperation = 'lighter'; const ng = c.createRadialGradient(sx, gy, r * 0.2, sx, gy, r); ng.addColorStop(0, rgba(col(e), 0)); ng.addColorStop(0.8, rgba(col(e), 0.45)); ng.addColorStop(1, rgba(col(e, 1), 0.8)); c.fillStyle = ng; c.beginPath(); c.ellipse(sx, gy, r, r * 0.42, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; break; }
      case 'beam': { const w = f.len * f.face, th = 26 * (1 - Math.max(0, k - 0.5) * 2) * (0.85 + 0.15 * Math.sin(B.t * 60)); c.globalCompositeOperation = 'lighter'; const bg = c.createLinearGradient(0, sy - th, 0, sy + th); bg.addColorStop(0, rgba(col(e), 0)); bg.addColorStop(0.5, rgba(col(e), 0.9)); bg.addColorStop(1, rgba(col(e), 0)); c.fillStyle = bg; c.fillRect(Math.min(sx, sx + w), sy - th, Math.abs(w), th * 2); c.fillStyle = rgba(col(e, 1), 0.95); c.fillRect(Math.min(sx, sx + w), sy - th * 0.2, Math.abs(w), th * 0.4); glowBall(sx, sy, th * 0.7, e); c.globalCompositeOperation = 'source-over'; break; }
      case 'aura': c.globalCompositeOperation = 'lighter'; ell(sx, gy - 38, (f.big ? 36 : 28) * (0.6 + k), (f.big ? 54 : 44) * (0.6 + k), rgba(col(e), 0.35)); c.globalCompositeOperation = 'source-over'; break;
      case 'trail': break;
      case 'heal': c.globalCompositeOperation = 'lighter'; ell(sx, gy, 30 * (0.5 + k), 9, rgba('#8affa0', 0.4)); c.globalCompositeOperation = 'source-over'; break;
    }
    c.globalAlpha = 1;
  }
}

// ================================================================== HUD
const hpShown = new WeakMap(), comboShown = new WeakMap();
function bar(x, y, w, h, k, c1, c2, trail) {
  rr(x, y, w, h, h / 2, 'rgba(8,6,24,0.7)', INK, 2);
  if (trail != null && trail > k) rr(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, trail)), h - 4, (h - 4) / 2, '#ffffff');
  if (k > 0) { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); rr(x + 2, y + 2, Math.max(h - 4, (w - 4) * Math.min(1, k)), h - 4, (h - 4) / 2, g); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 4, y + 3, Math.max(0, (w - 8) * Math.min(1, k)), 1.5); }
}
const FONT = '"Baloo 2", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
function txtOut(s, x, y, size, fill, align = 'left', weight = 900) { c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.lineJoin = 'round'; c.lineWidth = Math.max(3, size / 4); c.strokeStyle = INK; c.strokeText(s, x, y); c.fillStyle = fill; c.fillText(s, x, y); }
function hud(B, o) {
  B.players.forEach((p, i) => {
    const x = 10 + i * 248, y = 10, accent = p.def.color || '#ff5a4a';
    const pg = c.createLinearGradient(x, y, x, y + 60); pg.addColorStop(0, 'rgba(30,24,70,0.88)'); pg.addColorStop(1, 'rgba(14,10,36,0.88)');
    rr(x, y, 236, 58, 14, pg, INK, 2.5); rr(x + 3, y + 3, 230, 4, 2, accent);
    c.save(); c.beginPath(); c.arc(x + 30, y + 31, 22, 0, 7); const cg = c.createRadialGradient(x + 30, y + 24, 4, x + 30, y + 31, 24); cg.addColorStop(0, shade(accent, 0.35)); cg.addColorStop(1, shade(accent, -0.3)); c.fillStyle = cg; c.fill(); c.clip(); drawPortrait(c, p.def, x + 29, y + 30, 1.05); c.restore();
    c.strokeStyle = '#ffd040'; c.lineWidth = 2.5; c.beginPath(); c.arc(x + 30, y + 31, 22, 0, 7); c.stroke();
    txtOut(o.name(p), x + 58, y + 24, 15, '#ffffff'); txtOut('Lv ' + p.lv, x + 226, y + 24, 12, '#ffd040', 'right');
    let sh = hpShown.get(p) ?? p.hp; sh = sh > p.hp ? sh - Math.max(1, (sh - p.hp) * 0.04) : p.hp; hpShown.set(p, sh);
    const k = Math.max(0, p.hp / p.mhp);
    bar(x + 56, y + 29, 172, 13, k, k < 0.3 ? '#ff7a6a' : '#7aea6a', k < 0.3 ? '#d8302a' : '#2ea84a', sh / p.mhp);
    bar(x + 56, y + 43, 172, 9, p.mp / p.mmp, '#7ac8ff', '#2a6ae8');
    c.font = `800 9px ${FONT}`; c.textAlign = 'right'; c.fillStyle = '#ffffff'; c.fillText(Math.max(0, Math.ceil(p.hp)) + '/' + p.mhp, x + 224, y + 39.5);
    // combo counter
    const hits = p.hits || 0, since = B.t - (p.lastHitT ?? -9);
    if (hits >= 2 && since < 1.2) { const pop = comboShown.get(p) !== hits ? 1.35 : 1; comboShown.set(p, hits); const yy = 120 + i * 60; c.save(); c.translate(24, yy); c.scale(pop, pop); c.globalAlpha = Math.min(1, (1.2 - since) * 3); txtOut(String(hits), 0, 0, 40, '#ffd040'); txtOut('HITS', 4 + String(hits).length * 22, 0, 18, '#ffffff'); c.restore(); c.globalAlpha = 1; }
  });
  // gold and stage progress
  const gx = W - 12; c.save(); txtOut(String(B.earned.gold), gx, 30, 20, '#ffd040', 'right'); c.restore(); itemArt('coin', gx - 14 - String(B.earned.gold).length * 11, 23);
  if (B.mode === 'stage') { txtOut(o.stageName, gx, 52, 13, '#ffffff', 'right'); for (let i = 0; i < B.waves.length; i++) { const cx = gx - (B.waves.length - 1 - i) * 16 - 4, done = i < B.wave - (B.ents.some((e) => e.team !== 0 && !e.dead) ? 1 : 0); circ(cx, 64, 5.5, INK); circ(cx, 64, 4, i === B.waves.length - 1 ? (done ? '#ff5a4a' : '#5a2a3a') : done ? '#ffd040' : '#3a3460'); } }
  if (B.mode === 'survival') txtOut('WAVE ' + Math.max(1, B.wave), gx, 54, 16, '#ffffff', 'right');
  // boss bar
  const b = B.boss && !B.boss.dead ? B.boss : B.ents.find((e) => e.boss && !e.dead);
  if (b) { const bw = 380, bx = W / 2 - bw / 2, by = H - 30; let sh = hpShown.get(b) ?? b.hp; sh = sh > b.hp ? sh - Math.max(1, (sh - b.hp) * 0.04) : b.hp; hpShown.set(b, sh); rr(bx - 6, by - 22, bw + 12, 44, 12, 'rgba(14,10,36,0.82)', INK, 2.5); txtOut(o.name(b), W / 2, by - 6, 14, '#ffb0c8', 'center'); bar(bx, by, bw, 14, Math.max(0, b.hp) / b.mhp, '#e86aff', '#8a2ac8', sh / b.mhp); }
  // vs: the other team
  if (B.mode === 'vs') B.ents.filter((e) => e.team === 1 && e.kind === 'hero').forEach((e, i) => { const x = W - 182, y = 76 + i * 30; rr(x, y, 170, 26, 9, 'rgba(40,10,24,0.78)', INK, 2); txtOut(`${o.name(e)} Lv${e.lv}`, x + 8, y + 11, 11, '#ffffff'); bar(x + 8, y + 14, 154, 8, Math.max(0, e.hp) / e.mhp, '#ff8a7a', '#d8302a'); });
  // banner
  if (B.banner) { const t = 1.6 - B.banner.t, slide = Math.min(1, t * 5), out = Math.max(0, (t - 1.25) * 3); c.save(); c.globalAlpha = Math.max(0, 1 - out); c.translate(W / 2 + (1 - slide) * -300 + out * 300, 175); const boss = B.banner.txt === 'BOSS';
    rr(-230, -42, 460, 64, 14, boss ? 'rgba(120,10,30,0.75)' : 'rgba(20,14,60,0.7)'); if (boss) { c.fillStyle = 'rgba(255,200,40,0.85)'; for (let i = -230; i < 230; i += 28) { path([[i, -42], [i + 14, -42], [i + 2, -36], [i - 12, -36]], '#ffcc2a'); path([[i, 22], [i + 14, 22], [i + 2, 16], [i - 12, 16]], '#ffcc2a'); } }
    c.font = `900 50px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 9; c.strokeStyle = INK; c.strokeText(boss ? 'WARNING · BOSS' : B.banner.txt, 0, 4); const tg = c.createLinearGradient(0, -36, 0, 10); tg.addColorStop(0, boss ? '#ffd0c0' : '#fff8c0'); tg.addColorStop(1, boss ? '#ff4a3a' : '#ffb020'); c.fillStyle = tg; c.fillText(boss ? 'WARNING · BOSS' : B.banner.txt, 0, 4); c.restore(); }
  if (B.over && B.over.win) { const k = Math.min(1, B.overT * 3); c.save(); c.globalAlpha = k; c.translate(W / 2, 200); c.scale(1.6 - k * 0.6, 1.6 - k * 0.6); c.font = `900 58px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 10; c.strokeStyle = INK; const s = B.mode === 'vs' ? 'YOU WIN!' : 'STAGE CLEAR!'; c.strokeText(s, 0, 0); const tg = c.createLinearGradient(0, -44, 0, 6); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(1, '#ffb020'); c.fillStyle = tg; c.fillText(s, 0, 0); c.restore(); }
}

// ================================================================== the frame
export function renderBattle(ctx, B, scale, o) {
  c = ctx; c.setTransform(scale, 0, 0, scale, 0, 0); c.imageSmoothingEnabled = true;
  const dt = Math.min(0.05, o.dt || 1 / 60), Ly = layers(o.bg, B.Wd);
  stepParts(dt, B);
  const sh = B.shake > 0 ? (Math.random() - 0.5) * 10 * Math.min(1, B.shake * 3) : 0;
  c.save(); c.translate(sh, sh * 0.5);
  c.drawImage(Ly.sky, 0, 0);
  const tile = (img, par, y) => { const off = ((B.cam * par) % Ly.TW + Ly.TW) % Ly.TW; c.drawImage(img, -off, y); c.drawImage(img, Ly.TW - off, y); };
  tile(Ly.far, 0.18, 0); tile(Ly.mid, 0.5, 0);
  c.drawImage(Ly.floor, -B.cam, GROUND - 30);
  if (o.bg === 'castle') for (let x = 140; x < Ly.TW; x += 360) { const sx = x - ((B.cam * 0.5) % Ly.TW); for (const xx of [sx, sx + Ly.TW]) { if (xx < -40 || xx > W + 40) continue; c.globalCompositeOperation = 'lighter'; circ(xx - 30, 150 + Math.sin(B.t * 13 + x) * 1.5, 18, 'rgba(255,140,60,0.25)'); circ(xx - 30, 150, 5, '#ffd080'); c.globalCompositeOperation = 'source-over'; } }
  // depth-sorted things
  items(B);
  drawParts(B, false);
  const list = [];
  for (const e of B.ents) list.push([e.z, 1, e]);
  for (const p of B.projs) list.push([p.z + 0.2, 2, p]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, x] of list) { if (k === 1) fighter(B, x); else projectile(B, x); }
  effects(B);
  drawParts(B, true);
  ambient(B, Ly.P, dt);
  // floating numbers
  for (const tx of B.texts) { const sx = tx.x - B.cam, sy = GROUND + tx.z - tx.y, age = 0.9 - tx.t, pop = age < 0.1 ? 1.5 - age * 5 : 1, big = tx.col === '#ffd040'; c.save(); c.globalAlpha = Math.min(1, tx.t * 3); c.translate(sx, sy); c.scale(pop, pop); txtOut(tx.s + (big && /^\d+$/.test(tx.s) ? '!' : ''), 0, 0, big ? 24 : 18, tx.col, 'center'); c.restore(); }
  c.restore();
  c.drawImage(Ly.vig, 0, 0);
  if (B.flash > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(col(B.flashCol || 'phys', 1), Math.min(0.35, B.flash * 2.5)); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
  if (!o.noHud) hud(B, o);
}
export function drawItemIcon(ctx, k, x, y, s = 1) { const prev = c; c = ctx; c.save(); c.translate(x, y); c.scale(s, s); itemArt(k, 0, 0); c.restore(); c = prev; }
