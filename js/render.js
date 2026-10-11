// Drawing in a manga style: inked characters with hard cel shading and screentone, ink-and-paper stage backgrounds
// tinted per stage, speed lines, impact frames, sound-effect lettering, glowing special moves, and a manga-panel HUD.
import { W, H, GROUND, ZD } from './data.js?v=4';

let c = null;
const INK = '#14101e', PAPER = '#f6f1e4', GLOW = 'source-over';   // normal blending: additive light would wash the paper white
const EL = { fire: ['#ff5a14', '#ffd23a', '#c8200a'], ice: ['#5ac8ff', '#eafaff', '#2a7ad8'], elec: ['#ffd820', '#ffffff', '#c89a10'], chi: ['#4aa8ff', '#ffffff', '#2a5ae8'],
  phys: ['#e8e0d0', '#ffffff', '#8a7a6a'], shadow: ['#9a5aff', '#ecdcff', '#3a1a6a'], nature: ['#4ad85a', '#e0ffc0', '#2a8a2a'], earth: ['#c8904a', '#f0d8a0', '#6a4a2a'], smoke: ['#b8b8c8', '#f4f4fa', '#6a6a7a'] };
const col = (e, i = 0) => (EL[e] || EL.phys)[i];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }
function mute(hex, k = 0.18) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (r + g + b) / 3; return '#' + [r, g, b].map((v) => Math.round(v + (m - v) * k).toString(16).padStart(2, '0')).join(''); }
function rng(seed) { let s = seed || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function circ(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, 7); c.fill(); }
function ell(x, y, rx, ry, fill, rot = 0) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, 7); c.fill(); }
function rr(x, y, w, h, r, fill, stroke, lw = 2) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function poly(pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
function path(pts, fill, stroke, lw = 2.4) { poly(pts); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); } }
function line(x1, y1, x2, y2, w, colr = INK) { c.strokeStyle = colr; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function star(x, y, r, fill, n = 5, inner = 0.45) { c.fillStyle = fill; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, q = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }

// ------------------------------------------------------------------ screentone patterns
const toneCache = new Map();
function tone(colr = INK, gap = 4, r = 0.9, alpha = 0.6) {
  const key = colr + gap + r + alpha + (c && c.canvas ? '' : ''); let p = toneCache.get(key); if (p) return p;
  const cv = document.createElement('canvas'); const k = 4; cv.width = cv.height = Math.round(gap * k); const g = cv.getContext('2d'); g.scale(k, k);
  g.fillStyle = rgba(colr, alpha); for (const [x, y] of [[0, 0], [gap / 2, gap / 2], [gap, 0], [0, gap], [gap, gap]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  p = c.createPattern(cv, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(1 / k));
  toneCache.set(key, p); return p;
}
// a halftone gradient: dot size changes between y0 and y1
function halftone(x, y, w, h, r0, r1, gap, colr, y0 = y, y1 = y + h) {
  c.fillStyle = colr;
  for (let yy = y, row = 0; yy < y + h; yy += gap * 0.866, row++) {
    const k = clamp((yy - y0) / (y1 - y0), 0, 1), r = lerp(r0, r1, k); if (r < 0.15) continue;
    c.beginPath();
    for (let xx = x + (row % 2) * gap / 2; xx < x + w; xx += gap) { c.moveTo(xx + r, yy); c.arc(xx, yy, r, 0, 7); }
    c.fill();
  }
}
function hatch(x, y, w, h, gap, colr, lw = 1, ang = 1) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = colr; c.lineWidth = lw; c.beginPath();
  for (let i = -h; i < w + h; i += gap) { c.moveTo(x + i, y + h); c.lineTo(x + i + h * ang, y); }
  c.stroke(); c.restore();
}

// ================================================================== the character rig (manga proportions)
const POSE0 = { lean: 0, by: 0, head: 0, aF: [0.5, 1.9], aB: [0.25, 1.8], lF: [0.22, -0.15], lB: [-0.22, -0.1], open: 0 };
function mix(a, b, k) { const o = {}; for (const key in a) o[key] = Array.isArray(a[key]) ? a[key].map((v, i) => lerp(v, b[key][i], k)) : lerp(a[key], b[key] ?? a[key], k); return o; }
function poseFor(o) {
  const st = o.st || 'idle', t = o.t || 0, an = o.anim || 0;
  let P = { ...POSE0, aF: [...POSE0.aF], aB: [...POSE0.aB], lF: [...POSE0.lF], lB: [...POSE0.lB] };
  const breathe = Math.sin(an * 3);
  if (st === 'idle' || st === 'frozen') { P.by = breathe * 0.9; P.aF[0] += breathe * 0.04; P.aB[0] -= breathe * 0.04; }
  if (st === 'walk') { const p = Math.sin(an * 9.5); P.lF = [0.5 * p, -0.25 - 0.45 * Math.max(0, -p)]; P.lB = [-0.5 * p, -0.25 - 0.45 * Math.max(0, p)]; P.by = -Math.abs(p) * 1.6; P.aF = [0.5 - 0.25 * p, 1.9]; P.aB = [0.25 + 0.25 * p, 1.8]; }
  if (st === 'run' || st === 'dash') {
    const p = Math.sin(an * 15); P.lean = 0.36; P.lF = [0.95 * p, -0.35 - 1.1 * Math.max(0, -p)]; P.lB = [-0.95 * p, -0.35 - 1.1 * Math.max(0, p)];
    P.aF = [-0.9 * p + 0.2, 1.5]; P.aB = [0.9 * p + 0.2, 1.5]; P.by = -Math.abs(p) * 2.2;
    if (st === 'dash') { P.lean = 0.55; P.aF = [1.6, 0]; P.aB = [-0.7, 0.6]; P.lF = [1.0, -0.2]; P.lB = [-1.05, -0.4]; P.open = 1; }
  }
  if (st === 'jump' || st === 'flip') { const up = (o.vy || 0) > 0; P.lF = [0.7, -1.5]; P.lB = [-0.1, -1.2]; P.aF = up ? [2.5, 0.3] : [1.4, 0.8]; P.aB = up ? [2.1, 0.4] : [-0.6, 0.6]; P.by = -2; if (st === 'flip') P.lean = -0.3; }
  if (st === 'jatk') { P.lF = [1.45, -0.05]; P.lB = [0.15, -1.7]; P.aF = [-0.5, 0.7]; P.aB = [-0.9, 0.5]; P.lean = -0.25; P.open = 1; }
  if (st === 'punch' || st === 'runatk') {
    const a = o.atk || { on: 0.07, off: 0.15 };
    const ext = t < a.on ? -0.35 * (t / a.on) : t <= a.off ? 1 : Math.max(0, 1 - (t - a.off) / 0.12);
    const pz = o.pose || 'p1';
    if (st === 'runatk') { P.lean = 0.45; P.aF = [1.6, 0]; P.aB = [-0.7, 0.8]; P.lF = [0.8, -0.3]; P.lB = [-0.8, -0.6]; P.open = 1; }
    else if (pz === 'fin') { const k = clamp(ext, 0, 1); P.aF = [lerp(0.4, 3.0, k), lerp(1.4, 0.1, k)]; P.aB = [-0.4, 1.2]; P.lF = [lerp(0.3, 0.1, k), lerp(-0.6, 0, k)]; P.lB = [lerp(-0.3, -0.2, k), lerp(-0.6, 0, k)]; P.by = lerp(3, -7, k); P.lean = lerp(0.1, -0.12, k); P.open = k; }
    else if (pz === 'p2') { const k = clamp(ext, -0.4, 1); P.aB = [lerp(0.25, 1.55, Math.max(0, k)), lerp(1.8, 0.05, Math.max(0, k))]; P.aF = [0.3, 2.2]; P.lean = 0.16 * k; P.lF = [0.4, -0.25]; P.lB = [-0.4, -0.15]; P.open = Math.max(0, k); }
    else { const k = clamp(ext, -0.4, 1); P.aF = [lerp(0.5, 1.57, Math.max(0, k)) + (k < 0 ? k * 0.8 : 0), lerp(1.9, 0, Math.max(0, k))]; P.lean = 0.14 * k; P.lF = [0.4, -0.25]; P.lB = [-0.4, -0.15]; P.open = Math.max(0, k); }
  }
  if (st === 'defend') { P.aF = [1.35, 1.55]; P.aB = [1.15, 1.75]; P.lean = -0.06; P.lF = [0.38, -0.35]; P.lB = [-0.38, -0.25]; P.by = 2.5; }
  if (st === 'hurt') { const k = Math.min(1, t * 8); P.lean = -0.32 * k; P.head = -0.25 * k; P.aF = [-0.5, 0.7]; P.aB = [-0.8, 0.5]; P.lF = [0.3, -0.2]; P.lB = [-0.1, -0.1]; P.open = 1; }
  if (st === 'fly' || st === 'lie' || st === 'rise') { P.aF = [-1.2, 0.4]; P.aB = [-1.6, 0.3]; P.lF = [0.5, -0.4]; P.lB = [0.1, -0.2]; P.open = 1; P.head = -0.2; }
  if (st === 'stun') { P.lean = Math.sin(an * 5) * 0.1; P.head = Math.sin(an * 5 + 1) * 0.2; P.aF = [0.2, 0.3]; P.aB = [0.1, 0.3]; P.open = 0.5; }
  if (st === 'cast' || st === 'upper' || st === 'throw') {
    const k = o.sk || 'ball', w = Math.min(1, t * 5);
    let T = { ...P, aF: [1.55, 0.05], aB: [1.35, 0.15], lF: [0.45, -0.3], lB: [-0.4, -0.2], lean: 0.12, open: 1 };
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
const RIG = { hip: 43, torso: 25, ua: 15.5, fa: 14.5, th: 20.5, sh: 20 };
// an inked limb: thick outline, flat colour, a hard shadow band on the back edge, screentone on far limbs
function limb(x1, y1, x2, y2, w, fill, dark) {
  c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = w + 3.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = fill; c.lineWidth = w; c.stroke();
  c.strokeStyle = shade(fill, -0.3); c.lineWidth = w * 0.42; c.beginPath(); c.moveTo(x1 - w * 0.27, y1 + 1); c.lineTo(x2 - w * 0.27, y2); c.stroke();
  if (dark) { c.strokeStyle = tone(INK, 3.2, 0.75, 0.5); c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
}
export function drawFighter(ctx, def, x, y, face, scale, o = {}) {
  const prev = c; c = ctx;
  const L0 = def.look || {}, big = def.big, s = scale * (big ? 1.16 : 1), st = o.st || 'idle', an = o.anim || 0;
  const L = { ...L0, c: mute(L0.c), c2: mute(L0.c2 || L0.c), pants: mute(L0.pants), shoes: mute(L0.shoes) };
  c.save(); c.translate(x, y); c.scale(face * s, s);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (o.tint) c.filter = o.tint;
  if (st === 'lie') { c.translate(-8, -3); c.rotate(-Math.PI / 2); }
  else if (st === 'fly') { const k = Math.min(1, (o.t || 0) * 3); c.translate(0, -12); c.rotate(-0.4 - k * 0.9); c.translate(0, 12); }
  else if (st === 'rise') { const k = Math.max(0, 1 - (o.t || 0) / 0.3); c.rotate(-Math.PI / 2 * k); }
  if (def.dummy) { drawDummy(o); c.restore(); c = prev; return; }
  const P = poseFor(o);
  const hipY = -RIG.hip + P.by, neckY = hipY - RIG.torso, robot = L.top === 'robot';
  c.translate(0, hipY); c.rotate(P.lean); c.translate(0, -hipY);
  const skin = L.skin, sleeve = L.top === 'tank' ? skin : robot ? L.c2 : L.c;
  const gaunt = L.extras?.includes('gauntlets'), fistCol = gaunt ? L.trim : robot ? L.c2 : skin;
  const leg = (hx, ang, colr, shoeCol, back) => {
    const kx = hx + Math.sin(ang[0]) * RIG.th, ky = hipY + Math.cos(ang[0]) * RIG.th;
    const a2 = ang[0] + ang[1], fx = kx + Math.sin(a2) * RIG.sh, fy = ky + Math.cos(a2) * RIG.sh;
    limb(hx, hipY, kx, ky, 10.5, colr, back); limb(kx, ky, fx, fy, 9, colr, back);
    if (!back) line(kx - 2, ky - 4, kx + 3, ky + 1, 1.1);
    c.save(); c.translate(fx, fy); c.rotate(a2 * 0.3); rr(-4.5, -3.5, 15, 7.5, 3.5, shoeCol, INK, 2.6); c.fillStyle = PAPER; c.fillRect(-3.5, 2, 13, 1.6); c.restore();
  };
  const arm = (sx, sy, ang, colr, back, hold) => {
    const ex = sx + Math.sin(ang[0]) * RIG.ua, ey = sy + Math.cos(ang[0]) * RIG.ua;
    const a2 = ang[0] + ang[1], hx = ex + Math.sin(a2) * RIG.fa, hy = ey + Math.cos(a2) * RIG.fa;
    limb(sx, sy, ex, ey, 8.5, colr, back); limb(ex, ey, hx, hy, 7.5, L.top === 'tank' ? (back ? shade(skin, -0.12) : skin) : colr, back);
    if (hold) heldItem(hold, hx, hy, a2);
    const fr = gaunt ? 6.6 : 5.2;
    circ(hx, hy, fr + 1.8, INK); circ(hx, hy, fr, back ? shade(fistCol, -0.22) : fistCol);
    if (!back) line(hx - 1, hy - fr + 1.5, hx + fr - 1.5, hy - 1, 1);
  };
  const ex = L.extras || [];
  if (ex.includes('cape')) { const w = Math.sin(an * 4) * 3; path([[-6, neckY + 2], [6, neckY + 2], [-8, 2 + w], [-28 + w, 0]], L.trim === '#e8402a' ? '#4a0a16' : '#18101e', INK); c.fillStyle = tone(PAPER, 4, 0.7, 0.25); c.fill(); }
  if (L.top === 'cloak') path([[-8, neckY], [9, neckY], [6, hipY + 18], [-18, hipY + 24 + Math.sin(an * 3) * 2]], shade(L.c, -0.25), INK);
  hairBack(L, neckY, an, o);
  if (ex.includes('scarf')) { const w = Math.sin(an * 7); c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 8.5; c.beginPath(); c.moveTo(-2, neckY + 2); c.quadraticCurveTo(-17, neckY + 3 + w * 3, -32, neckY + 6 + w * 7); c.stroke(); c.strokeStyle = L.trim; c.lineWidth = 5; c.stroke(); }
  if (ex.includes('staff')) { limb(-12, neckY - 26, -14, 0, 3.5, '#7a5a2a'); circ(-12, neckY - 28, 7, INK); circ(-12, neckY - 28, 5, L.trim); }
  arm(-5, neckY + 4, P.aB, shade(sleeve, -0.18), true);
  leg(-3, P.lB, shade(L.pants, -0.2), shade(L.shoes, -0.18), true);
  torso(L, hipY, neckY);
  leg(3, P.lF, L.pants, L.shoes, false);
  if (ex.includes('skirt')) { path([[-10, hipY - 4], [10, hipY - 4], [15, hipY + 11], [-15, hipY + 11]], L.c, INK); line(-2, hipY - 2, -5, hipY + 10, 1); line(5, hipY - 2, 8, hipY + 10, 1); }
  if (L.top === 'robe') { path([[-11, hipY - 4], [11, hipY - 4], [16, hipY + 30], [-16, hipY + 30]], L.c, INK); c.save(); poly([[-11, hipY - 4], [-2, hipY - 4], [-6, hipY + 30], [-16, hipY + 30]]); c.fillStyle = tone(INK, 3.2, 0.8, 0.5); c.fill(); c.restore(); }
  if (L.top === 'coat') { path([[-11, hipY - 4], [11, hipY - 4], [15, hipY + 10], [-15, hipY + 10]], L.c, INK); c.fillStyle = PAPER; c.fillRect(-15, hipY + 7, 30, 3.5); }
  head(L, def, neckY, P, o);
  arm(6, neckY + 4, P.aF, sleeve, false, o.hold);
  if (o.glow && (st === 'cast' || st === 'upper')) { c.globalCompositeOperation = GLOW; const g = c.createRadialGradient(20, neckY + 6, 1, 20, neckY + 6, 20); g.addColorStop(0, rgba(col(o.glow, 1), 0.95)); g.addColorStop(1, rgba(col(o.glow), 0)); c.fillStyle = g; c.beginPath(); c.arc(20, neckY + 6, 20, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
  c.restore(); c = prev;
}
// a wooden training dummy: a post, a stitched sack body with a target, peg arms and a round head
function drawDummy(o) {
  const st = o.st, t = o.t || 0, wob = st === 'hurt' ? Math.sin(t * 40) * 0.18 * Math.max(0, 1 - t * 3) : st === 'stun' ? Math.sin((o.anim || 0) * 6) * 0.08 : 0;
  rr(-12, -4, 24, 6, 2, '#6a4a2a', INK, 2.2);
  rr(-4, -46, 8, 44, 2, '#8a5a2a', INK, 2.4); hatch(-4, -46, 4, 44, 3, rgba(INK, 0.4));
  c.save(); c.translate(0, -46); c.rotate(wob); c.translate(0, 46);
  limb(-12, -68, -27, -62, 6, '#a87a4a'); limb(12, -68, 27, -74, 6, '#a87a4a');
  rr(-15, -84, 30, 42, 10, '#d8b078', INK, 2.8);
  c.save(); c.beginPath(); c.rect(-15, -84, 11, 42); c.fillStyle = tone(INK, 3.2, 0.8, 0.45); c.fill(); c.restore();
  for (const [r, f] of [[10, PAPER], [7, '#e8302a'], [4, PAPER], [1.8, '#e8302a']]) { circ(2, -63, r, f); c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.arc(2, -63, r, 0, 7); c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 1; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(-15, -74); c.lineTo(15, -74); c.moveTo(-15, -50); c.lineTo(15, -50); c.stroke(); c.setLineDash([]);
  circ(1, -97, 13, INK); circ(1, -97, 11, '#d8b078');
  const hit = st === 'hurt' || st === 'fly' || st === 'lie' || st === 'stun';
  if (hit) { for (const ex of [-4, 6]) { line(ex - 2.5, -100, ex + 2.5, -95, 1.8); line(ex + 2.5, -100, ex - 2.5, -95, 1.8); } }
  else { line(-6, -98, -2, -98, 1.8); line(4, -98, 8, -98, 1.8); }
  line(-3, -91, 5, -91, 1.4);
  c.restore();
}
function torso(L, hipY, neckY) {
  const sh = 12, wa = 8.5, top = neckY + 1, bot = hipY + 2;
  if (L.top === 'robot') {
    rr(-sh - 1, top - 1, 2 * sh + 2, bot - top + 2, 6, L.c, INK, 2.8);
    c.save(); c.beginPath(); c.rect(-sh, top, sh * 0.8, bot - top); c.fillStyle = tone(INK, 3.2, 0.8, 0.45); c.fill(); c.restore();
    rr(-6, top + 5, 12, 10, 3, INK); circ(0, top + 10, 3.6, L.trim); c.globalCompositeOperation = GLOW; circ(0, top + 10, 7, rgba(L.trim, 0.4)); c.globalCompositeOperation = 'source-over';
    line(-sh + 2, bot - 6, sh - 2, bot - 6, 1.2); line(-4, top + 18, 4, top + 18, 1.2);
    return;
  }
  const shapeT = [[-sh, top], [sh, top], [wa, bot], [-wa, bot]];
  path(shapeT, L.c, INK, 2.8);
  c.save(); poly(shapeT); c.clip(); c.fillStyle = shade(L.c, -0.25); c.fillRect(-sh - 2, top, sh * 0.85, bot - top + 2); c.fillStyle = tone(INK, 3.2, 0.8, 0.45); c.fillRect(-sh - 2, top, sh * 0.85, bot - top + 2); c.restore();
  if (L.top === 'jacket') { path([[-3.2, top + 1], [3.6, top + 1], [2.6, bot - 1], [-2.6, bot - 1]], L.c2); line(-3.6, top + 1, -3, bot - 1, 1.4); line(3.8, top + 1, 3, bot - 1, 1.4); line(-8, top + 6, -5, top + 13, 1); line(8, top + 7, 6, top + 14, 1); }
  if (L.top === 'ninja') { c.strokeStyle = L.c2; c.lineWidth = 5; c.beginPath(); c.moveTo(-sh + 2, top + 2); c.lineTo(sh - 3, bot - 4); c.stroke(); rr(-wa - 1, bot - 7, 2 * wa + 2, 5, 2, L.trim, INK, 1.8); }
  if (L.top === 'tank') { line(-4, top + 6, -2, top + 14, 1.1); line(4, top + 6, 3, top + 13, 1.1); rr(-wa - 1, bot - 6, 2 * wa + 2, 4.5, 2, INK); }
  if (L.top === 'hoodie') { line(-2, top + 2, -3, top + 11, 1.4); line(2, top + 2, 3, top + 11, 1.4); rr(-6, bot - 10, 12, 6, 2, L.c2, INK, 1.4); }
  if (L.top === 'coat') { c.fillStyle = PAPER; c.fillRect(-1.5, top, 3, bot - top); rr(-sh - 1, top - 2, 2 * sh + 2, 5, 2.5, PAPER, INK, 1.8); }
  if (L.top === 'robe') { c.fillStyle = L.trim; c.fillRect(-1.5, top, 3, bot - top); c.fillRect(-wa, bot - 5, 2 * wa, 2.5); }
  if (L.top === 'cloak') { c.fillStyle = L.c2; c.fillRect(-sh + 3, top + 3, 2 * sh - 6, 3); }
  const ex = L.extras || [];
  if (ex.includes('flame')) { c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(0, top + 16); c.quadraticCurveTo(-4.5, top + 11, -1, top + 5); c.quadraticCurveTo(0, top + 9, 2.2, top + 6); c.quadraticCurveTo(4.5, top + 12, 0, top + 16); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); }
  if (ex.includes('bolt')) path([[2, top + 3], [-3, top + 10], [0.5, top + 10], [-2, top + 17], [4.5, top + 8], [0.8, top + 8]], '#ffd84a', INK, 1);
  if (ex.includes('leaf')) ell(0, top + 10, 3, 5.5, '#7ad85a', 0.6);
  if (ex.includes('chain')) { c.strokeStyle = '#ffd040'; c.lineWidth = 2.2; c.setLineDash([2, 2]); c.beginPath(); c.arc(0, top - 2, 9.5, 0.3, Math.PI - 0.3); c.stroke(); c.setLineDash([]); }
}
function hairBack(L, neckY, an, o) {
  const hy = neckY - 13, sw = Math.sin(an * 4);
  if (L.style === 'ponytail') { const bob = Math.sin(an * 6) * 0.08 + (o.st === 'run' || o.st === 'dash' ? 0.5 : 0); c.save(); c.translate(-8, hy - 8); c.rotate(0.3 + bob); path([[-3, -2], [5, -3], [8, 8], [5, 22], [-1, 31], [-5, 20], [-6, 6]], L.hair, INK, 2.4); line(1, 2, 0, 24, 1.1, shade(L.hair, -0.35)); line(-2, 6, -3, 20, 1, shade(L.hair, -0.35)); rr(-5, -4, 10, 5, 2, '#5ab8ff', INK, 1.6); c.restore(); }
  if (L.style === 'long') { path([[-11, hy - 6], [6, hy - 8], [4, hy + 26], [-6, hy + 32 + sw * 2], [-16, hy + 24]], L.hair, INK, 2.4); line(-5, hy - 2, -8, hy + 26, 1, shade(L.hair, -0.3)); }
  if (L.style === 'hood' || L.top === 'hoodie') path([[-13, hy - 2], [2, hy - 15], [12, hy - 4], [8, hy + 13], [-11, hy + 13]], shade(L.c, -0.18), INK);
}
function head(L, def, neckY, P, o) {
  const st = o.st, an = o.anim || 0, hx = 3, hy = neckY - 12;
  c.save(); c.translate(hx, hy + 11); c.rotate(P.head); c.translate(-hx, -hy - 11);
  limb(1, neckY + 3, 2, neckY - 3, 6.5, L.top === 'robot' ? L.c2 : L.skin);
  if (L.style === 'robot') {
    rr(hx - 12, hy - 12, 24, 24, 7, L.skin, INK, 2.8);
    c.save(); c.beginPath(); c.rect(hx - 12, hy - 12, 9, 24); c.fillStyle = tone(INK, 3.2, 0.8, 0.45); c.fill(); c.restore();
    rr(hx - 3, hy - 5, 17, 8, 3, INK); c.globalCompositeOperation = GLOW; rr(hx + 1, hy - 3, 11, 4, 2, L.eye); c.globalCompositeOperation = 'source-over';
    line(hx - 2, hy - 12, hx - 4, hy - 21, 2.2); circ(hx - 4, hy - 22, 2.8, L.trim);
    c.restore(); return;
  }
  const face = () => { c.beginPath(); c.moveTo(hx - 10.5, hy - 3); c.quadraticCurveTo(hx - 11, hy - 13, hx - 1, hy - 13); c.quadraticCurveTo(hx + 10.5, hy - 13, hx + 10.5, hy - 3); c.lineTo(hx + 11, hy + 3); c.quadraticCurveTo(hx + 9.5, hy + 9.5, hx + 4.5, hy + 11.5); c.quadraticCurveTo(hx - 1.5, hy + 11.5, hx - 5.5, hy + 8); c.quadraticCurveTo(hx - 10.5, hy + 4, hx - 10.5, hy - 3); c.closePath(); };
  face(); c.fillStyle = L.skin; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke();
  c.save(); face(); c.clip(); c.fillStyle = shade(L.skin, -0.16); c.fillRect(hx - 12, hy + 4, 14, 10); c.fillStyle = tone(INK, 3.2, 0.7, 0.35); c.fillRect(hx - 12, hy + 4, 14, 10); c.restore();
  ell(hx - 4, hy + 1, 2.6, 3.6, shade(L.skin, -0.14)); c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(hx - 4, hy + 1, 2.6, -1.2, 1.4); c.stroke();
  const hurt = st === 'hurt' || st === 'fly' || st === 'lie', dizzy = st === 'stun', blink = (an % 3.7) < 0.12 && !hurt;
  const eye = (ex, ey, sz) => {
    if (hurt) { ell(ex, ey, 2.6 * sz, 3 * sz, '#ffffff'); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke(); circ(ex + 0.4, ey, 0.9 * sz, INK); return; }
    if (dizzy) { c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i * 0.9 + an * 6, r = i * 0.22 * sz; c.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); } c.stroke(); return; }
    if (blink) { line(ex - 3 * sz, ey, ex + 3.2 * sz, ey - 0.4, 2 * sz); return; }
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(ex - 3 * sz, ey); c.quadraticCurveTo(ex, ey - 3 * sz, ex + 3.4 * sz, ey - 0.8 * sz); c.quadraticCurveTo(ex + 0.5 * sz, ey + 2.6 * sz, ex - 3 * sz, ey); c.fill();
    c.save(); c.clip(); ell(ex + 0.8 * sz, ey, 1.7 * sz, 2.4 * sz, L.eye); circ(ex + 1 * sz, ey + 0.2 * sz, 0.95 * sz, INK); circ(ex + 1.6 * sz, ey - 0.9 * sz, 0.6 * sz, '#ffffff'); c.restore();
    c.strokeStyle = INK; c.lineWidth = 2.2 * sz; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 3.2 * sz, ey + 0.2); c.quadraticCurveTo(ex, ey - 3.1 * sz, ex + 3.6 * sz, ey - 0.8 * sz); c.stroke();
    c.lineWidth = 0.9; c.beginPath(); c.moveTo(ex - 1.5 * sz, ey + 1.9 * sz); c.lineTo(ex + 2.2 * sz, ey + 1.2 * sz); c.stroke();
    const g = def.girl; c.lineWidth = (g ? 1.5 : 2.3) * sz; c.beginPath(); c.moveTo(ex - 3.2 * sz, ey - (g ? 4.4 : 3.6) * sz); c.lineTo(ex + 3.6 * sz, ey - (g ? 4.6 : 5.0) * sz); c.stroke();
    if (g) { c.lineWidth = 1; c.beginPath(); c.moveTo(ex + 3.4 * sz, ey - 0.8 * sz); c.lineTo(ex + 4.6 * sz, ey - 2 * sz); c.stroke(); }
  };
  if (!L.extras?.includes('shades')) { eye(hx + 6.5, hy - 1, 1); eye(hx + 0.2, hy - 0.6, 0.7); }
  else { path([[hx - 1, hy - 4], [hx + 12, hy - 4], [hx + 11, hy + 1], [hx + 1, hy + 1]], INK); line(hx + 3, hy - 3, hx + 6, hy - 3, 1, '#ffffff'); }
  line(hx + 10.6, hy + 1, hx + 9.6, hy + 4, 1.1);
  if (hurt) { c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 1; for (const [dx, dy] of [[-12, -6], [13, -10]]) { c.beginPath(); c.moveTo(hx + dx, hy + dy - 4); c.quadraticCurveTo(hx + dx + 3, hy + dy + 1, hx + dx, hy + dy + 2); c.quadraticCurveTo(hx + dx - 3, hy + dy + 1, hx + dx, hy + dy - 4); c.fill(); c.stroke(); } }
  const open = P.open > 0.5 || hurt;
  if (open) { path([[hx + 4.5, hy + 6.5], [hx + 10, hy + 6], [hx + 9, hy + 9.5], [hx + 5.5, hy + 9.8]], '#5a1622', INK, 1.4); c.fillStyle = '#ffffff'; c.fillRect(hx + 5, hy + 6.4, 4.6, 1.2); }
  else line(hx + 5, hy + 7.4, hx + 9.6, hy + 6.8, 1.4);
  if (L.extras?.includes('mask')) path([[hx - 4, hy + 2], [hx + 12, hy + 1], [hx + 11, hy + 11], [hx - 3, hy + 11]], L.c2 || '#33334a', INK, 1.8);
  if (L.extras?.includes('beard')) { path([[hx - 3, hy + 5], [hx + 12, hy + 5], [hx + 9, hy + 15], [hx + 1, hy + 14]], L.hair, INK, 1.8); line(hx + 4, hy + 7, hx + 4, hy + 13, 0.9, shade(L.hair, -0.4)); }
  if (L.extras?.includes('scar')) { line(hx + 3, hy - 7, hx + 7, hy + 2, 1.4, '#7a2a20'); line(hx + 4, hy - 3, hx + 7, hy - 4, 1, '#7a2a20'); }
  hairFront(L, hx, hy, an);
  c.restore();
}
function strands(pts, colr) { c.strokeStyle = colr; c.lineWidth = 1.1; c.lineCap = 'round'; c.beginPath(); for (const [x1, y1, x2, y2] of pts) { c.moveTo(x1, y1); c.lineTo(x2, y2); } c.stroke(); }
function hairFront(L, hx, hy, an) {
  const dk = shade(L.hair, -0.38), ex = L.extras || [];
  const shine = (x, y, w) => { c.save(); c.translate(x, y); c.rotate(-0.25); c.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 4; i++) c.fillRect(i * (w / 4), 0, w / 8, 2.2); c.restore(); };
  switch (L.style) {
    case 'spiky': {
      const pts = [[hx - 13, hy + 5], [hx - 18, hy - 2], [hx - 13, hy - 6], [hx - 21, hy - 13], [hx - 10, hy - 14], [hx - 12, hy - 24], [hx - 2, hy - 17], [hx + 2, hy - 27], [hx + 7, hy - 16], [hx + 16, hy - 22], [hx + 13, hy - 11], [hx + 21, hy - 8], [hx + 12, hy - 5], [hx + 13, hy + 1], [hx + 7, hy - 6], [hx + 4, hy - 1], [hx, hy - 7], [hx - 5, hy - 2], [hx - 8, hy + 5]];
      path(pts, L.hair, INK, 2.4); strands([[hx - 6, hy - 6, hx - 10, hy - 15], [hx + 1, hy - 8, hx + 1, hy - 20], [hx + 6, hy - 8, hx + 12, hy - 15], [hx - 2, hy - 9, hx - 7, hy - 18]], dk); shine(hx - 6, hy - 12, 12); break;
    }
    case 'swept': path([[hx - 14, hy + 5], [hx - 16, hy - 8], [hx - 6, hy - 17], [hx + 9, hy - 16], [hx + 24, hy - 11], [hx + 13, hy - 7], [hx + 20, hy - 1], [hx + 8, hy - 3], [hx + 5, hy + 2], [hx - 3, hy - 4], [hx - 8, hy + 6]], L.hair, INK, 2.4);
      strands([[hx - 8, hy - 8, hx + 4, hy - 14], [hx - 4, hy - 4, hx + 14, hy - 10], [hx, hy - 1, hx + 15, hy - 4]], dk); shine(hx - 6, hy - 13, 12); break;
    case 'buzz': { const pts = [[hx - 14, hy + 3], [hx - 14, hy - 7], [hx - 6, hy - 14], [hx + 7, hy - 14], [hx + 13, hy - 6], [hx + 10, hy - 7], [hx + 2, hy - 8], [hx - 8, hy - 3]]; path(pts, L.hair, INK, 2.4); c.save(); poly(pts); c.fillStyle = tone(PAPER, 3, 0.6, 0.4); c.fill(); c.restore(); break; }
    case 'mohawk': path([[hx - 10, hy - 10], [hx - 7, hy - 25], [hx + 1, hy - 18], [hx + 5, hy - 27], [hx + 10, hy - 14], [hx + 4, hy - 12]], L.hair, INK, 2.2); break;
    case 'ponytail': path([[hx - 14, hy + 7], [hx - 15, hy - 6], [hx - 8, hy - 15], [hx + 6, hy - 15], [hx + 15, hy - 8], [hx + 16, hy + 5], [hx + 12, hy - 3], [hx + 9, hy + 2], [hx + 5, hy - 4], [hx - 2, hy - 3], [hx - 8, hy + 3]], L.hair, INK, 2.4);
      strands([[hx - 6, hy - 6, hx - 2, hy - 13], [hx + 3, hy - 5, hx + 6, hy - 12], [hx + 10, hy - 3, hx + 12, hy - 9]], shade(L.hair2, -0.3)); shine(hx - 5, hy - 12, 11); break;
    case 'long': path([[hx - 14, hy + 9], [hx - 15, hy - 7], [hx - 6, hy - 16], [hx + 8, hy - 16], [hx + 16, hy - 6], [hx + 15, hy + 4], [hx + 9, hy - 5], [hx - 2, hy - 4], [hx - 9, hy + 9]], L.hair, INK, 2.4); strands([[hx - 6, hy - 6, hx - 10, hy + 6], [hx + 2, hy - 8, hx + 6, hy - 14]], dk); shine(hx - 5, hy - 12, 11); break;
    case 'cap': path([[hx - 14, hy - 1], [hx - 12, hy - 12], [hx, hy - 16], [hx + 12, hy - 11], [hx + 13, hy - 3]], '#262838', INK, 2.4); path([[hx + 8, hy - 6], [hx + 25, hy - 3], [hx + 23, hy + 0.5], [hx + 8, hy - 2]], '#1a1c28', INK, 2); break;
    case 'hood': path([[hx - 15, hy + 11], [hx - 16, hy - 6], [hx - 4, hy - 18], [hx + 12, hy - 15], [hx + 18, hy - 4], [hx + 14, hy - 6], [hx + 4, hy - 9], [hx - 6, hy - 2], [hx - 10, hy + 13]], L.c, INK, 2.4); break;
    case 'hat': path([[hx - 19, hy - 7], [hx + 21, hy - 7], [hx + 2, hy - 44], [hx - 6, hy - 40]], L.c, INK, 2.4); c.save(); poly([[hx - 19, hy - 7], [hx - 2, hy - 7], [hx - 6, hy - 40]]); c.fillStyle = tone(INK, 3.2, 0.8, 0.45); c.fill(); c.restore(); rr(hx - 21, hy - 11, 44, 6, 3, shade(L.c, -0.25), INK, 2); star(hx, hy - 24, 4.5, L.trim); break;
  }
  if (ex.includes('headband')) { rr(hx - 14, hy - 9, 29, 5.5, 2, PAPER, INK, 1.8); circ(hx + 8, hy - 6.3, 2.2, '#d82a20'); const w = Math.sin(an * 9) * 3; limb(hx - 13, hy - 7, hx - 27, hy - 3 + w, 3, PAPER); limb(hx - 13, hy - 6, hx - 25, hy + 4 + w, 3, PAPER); }
  if (ex.includes('bandana')) rr(hx - 14, hy - 11, 29, 6.5, 3, '#b82a2a', INK, 1.8);
  if (ex.includes('snowclip')) { for (const [w, colr] of [[3, INK], [1.5, '#ffffff']]) { c.strokeStyle = colr; c.lineWidth = w; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(hx - 6 + Math.cos(a) * 5, hy - 11 + Math.sin(a) * 5); c.lineTo(hx - 6 - Math.cos(a) * 5, hy - 11 - Math.sin(a) * 5); c.stroke(); } } }
  if (ex.includes('tricorn')) path([[hx - 20, hy - 8], [hx + 20, hy - 8], [hx + 12, hy - 23], [hx, hy - 18], [hx - 12, hy - 23]], '#2a1a12', INK, 2.4);
  if (ex.includes('horns')) { path([[hx - 8, hy - 11], [hx - 18, hy - 33], [hx - 2, hy - 14]], '#e8dcc0', INK, 2); path([[hx + 6, hy - 12], [hx + 14, hy - 34], [hx + 12, hy - 11]], '#e8dcc0', INK, 2); }
}
function heldItem(k, x, y, a) {
  c.save(); c.translate(x, y); c.rotate(-a + Math.PI / 2);
  if (k === 'bat') { c.rotate(-1.2); rr(-3.5, -32, 7.5, 36, 3.5, '#c8904a', INK, 2.2); rr(-3.5, 0, 7.5, 6, 2, '#3a2a1a'); }
  if (k === 'knife') { c.rotate(-1.4); path([[-1.5, 2], [1.5, 2], [2, -15], [0, -19], [-2, -15]], '#e4e8f0', INK, 1.6); rr(-2.5, 1, 5, 7, 1.5, '#4a2e14', INK, 1.2); }
  if (k === 'stone') { circ(0, -6, 11, INK); circ(0, -6, 9.2, '#9a9aa2'); c.fillStyle = tone(INK, 3, 0.8, 0.5); c.beginPath(); c.arc(2, -3, 7, 0, 7); c.fill(); }
  if (k === 'crate') { rr(-14, -26, 28, 26, 2, '#c8944e', INK, 2.4); line(-12, -24, 12, -2, 2, '#6a4a22'); }
  if (k === 'bow') { c.strokeStyle = INK; c.lineWidth = 4.5; c.beginPath(); c.arc(4, 0, 17, -1.3, 1.3); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.5; c.stroke(); line(4 + Math.cos(-1.3) * 17, Math.sin(-1.3) * 17, 4 + Math.cos(1.3) * 17, Math.sin(1.3) * 17, 0.9); }
  c.restore();
}
export function drawPortrait(ctx, def, x, y, s) {
  const prev = c; c = ctx; c.save(); c.translate(x, y); c.scale(s, s);
  const L0 = def.look, L = { ...L0, c: mute(L0.c), c2: mute(L0.c2 || L0.c) }; const neckY = 14;
  hairBack(L, neckY, 0, {});
  head(L, def, neckY, { head: 0, open: 0 }, { st: 'idle', anim: 1 });
  c.restore(); c = prev;
}

// ================================================================== ink backgrounds (prerendered per stage, tinted)
const BGS = {
  park: { tint: '#2a4a7a', paper: '#f4f1e6', accent: '#e8402a', amb: 'leaf' },
  forest: { tint: '#2a5a3a', paper: '#f2f0e0', accent: '#e8a020', amb: 'firefly' },
  village: { tint: '#7a2a2a', paper: '#f8eedf', accent: '#ff7a8a', amb: 'petal' },
  factory: { tint: '#2a3442', paper: '#ecebe6', accent: '#ffc21a', amb: 'spark' },
  castle: { tint: '#2a1440', paper: '#e8e2ee', accent: '#c83a5a', amb: 'ember', night: true },
  dojo: { tint: '#5a3214', paper: '#f8f0dc', accent: '#c83020', amb: 'dust' },
};
const layerCache = {};
function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
function inkBox(x, y, w, h, fill, lw = 2.2) { c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = INK; c.lineWidth = lw; c.strokeRect(x, y, w, h); }
function layers(id, arenaW) {
  const key = id + arenaW; if (layerCache[key]) return layerCache[key];
  const P = BGS[id] || BGS.park, prev = c, r = rng(id.length * 977 + 13), T = P.tint, night = P.night;
  const lt = shade(T, 0.75), mid = shade(T, 0.45);
  const sky = mk(W, GROUND + 30); c = sky.getContext('2d');
  if (night) {
    c.fillStyle = shade(T, -0.2); c.fillRect(0, 0, W, GROUND + 30); halftone(0, 0, W, GROUND + 30, 1.4, 0.1, 6, rgba('#ffffff', 0.16));
    for (let i = 0; i < 70; i++) star(r() * W, r() * 200, 1 + r() * 2, '#ffffff', 4, 0.3);
    circ(620, 72, 34, PAPER); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(620, 72, 34, 0, 7); c.stroke(); c.save(); c.beginPath(); c.arc(620, 72, 32, 0, 7); c.clip(); halftone(586, 38, 70, 70, 1.4, 0.1, 4, rgba(T, 0.55)); c.restore();
  } else {
    c.fillStyle = P.paper; c.fillRect(0, 0, W, GROUND + 30);
    halftone(0, 0, W, 190, 1.6, 0.05, 6, rgba(T, 0.55), 0, 190);
    for (let i = 0; i < 6; i++) { const x = r() * W, y = 30 + r() * 80, s = 0.6 + r() * 0.8; c.fillStyle = P.paper; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); for (let k = 0; k < 5; k++) c.arc(x + k * 15 * s, y + Math.sin(k * 1.7) * 5 * s, 14 * s, Math.PI, 0); c.lineTo(x + 66 * s, y + 8 * s); c.lineTo(x - 14 * s, y + 8 * s); c.closePath(); c.fill(); c.stroke(); }
    if (id !== 'factory' && id !== 'dojo') { c.strokeStyle = INK; c.lineWidth = 2.5; c.fillStyle = P.paper; c.beginPath(); c.arc(640, 80, 30, 0, 7); c.fill(); c.stroke(); c.strokeStyle = rgba(INK, 0.6); c.lineWidth = 1.2; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; c.beginPath(); c.moveTo(640 + Math.cos(a) * 38, 80 + Math.sin(a) * 38); c.lineTo(640 + Math.cos(a) * 52, 80 + Math.sin(a) * 52); c.stroke(); } }
  }
  const TW = 1600, far = mk(TW, GROUND + 30); c = far.getContext('2d');
  const farFill = night ? shade(T, -0.05) : lt;
  if (id === 'park' || id === 'factory') { for (let x = 0; x < TW; x += 60 + r() * 50) { const w = 50 + r() * 60, h = 70 + r() * 110; inkBox(x, GROUND + 30 - h - 30, w, h + 30, farFill, 1.6); c.fillStyle = rgba(INK, 0.35); for (let wy = GROUND - h - 20; wy < GROUND; wy += 12) for (let wx = x + 6; wx < x + w - 6; wx += 10) if (r() < 0.6) c.fillRect(wx, wy, 5, 6); } }
  else if (id === 'castle') { for (let x = 0; x < TW; x += 260) { inkBox(x, 120, 170, 200, shade(T, 0.08), 2); inkBox(x + 60, 60, 46, 70, shade(T, 0.08), 2); path([[x + 52, 62], [x + 83, 14], [x + 114, 62]], shade(T, 0.08), INK, 2); for (let k = 0; k < 6; k++) inkBox(x + k * 30, 106, 18, 14, shade(T, 0.08), 1.5); } }
  else if (id === 'dojo') { c.fillStyle = lt; c.fillRect(0, 40, TW, GROUND); }
  else { c.fillStyle = farFill; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(0, GROUND + 30); for (let x = 0; x <= TW; x += 20) c.lineTo(x, 150 + Math.sin(x * 0.006) * 34 + Math.sin(x * 0.017) * 12); c.lineTo(TW, GROUND + 30); c.closePath(); c.fill(); c.stroke(); halftone(0, 140, TW, 130, 0.2, 1.4, 5, rgba(T, 0.45)); }
  const midL = mk(TW, GROUND + 40); c = midL.getContext('2d');
  midLayer(id, P, TW, r, mid, lt);
  const FH = H - GROUND + 30, floor = mk(arenaW + W, FH); c = floor.getContext('2d');
  c.fillStyle = night ? shade(T, 0.25) : P.paper; c.fillRect(0, 0, arenaW + W, FH);
  halftone(0, 0, arenaW + W, 70, 1.5, 0.2, 5, rgba(T, 0.5), 0, 70);
  floorDetail(id, P, arenaW + W, FH, r, mid);
  line(0, 1, arenaW + W, 1, 3);
  const vig = mk(W, H); c = vig.getContext('2d');
  const vg = c.createRadialGradient(W / 2, H * 0.55, H * 0.42, W / 2, H * 0.55, W * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, rgba(T, 0.28)); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
  c = prev;
  return (layerCache[key] = { sky, far, mid: midL, floor, vig, TW, P });
}
function inkTree(x, base, h, fill, r) {
  inkBox(x - 5, base - h * 0.45, 10, h * 0.45, fill, 2); hatch(x - 5, base - h * 0.45, 5, h * 0.45, 3, rgba(INK, 0.5));
  c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath();
  const n = 9; for (let i = 0; i <= n; i++) { const a = Math.PI * (0.9 + i * 1.2 / n), rr2 = h * (0.34 + r() * 0.06); c.arc(x + Math.cos(a) * h * 0.2, base - h * 0.66 + Math.sin(a) * h * 0.18, rr2 * 0.55, a - 0.8, a + 0.8); }
  c.closePath(); c.fill(); c.stroke();
  c.save(); c.clip(); halftone(x - h * 0.45, base - h * 0.95, h * 0.9, h * 0.6, 0.1, 1.5, 4, rgba(INK, 0.4), base - h * 0.85, base - h * 0.35); c.restore();
}
function inkPine(x, base, h, fill) { inkBox(x - 4, base - h * 0.2, 8, h * 0.2, fill, 1.8); for (let i = 0; i < 4; i++) { const y = base - h * 0.2 - i * h * 0.2, w = h * (0.32 - i * 0.06); path([[x - w, y], [x + w, y], [x, y - h * 0.32]], fill, INK, 2); c.save(); poly([[x - w, y], [x, y], [x, y - h * 0.32]]); c.fillStyle = tone(INK, 3.4, 0.8, 0.4); c.fill(); c.restore(); } }
function midLayer(id, P, TW, r, mid, lt) {
  const base = GROUND + 18, A = P.accent;
  if (id === 'park') {
    for (let x = 30; x < TW; x += 150 + r() * 90) inkTree(x, base, 120 + r() * 50, PAPER, r);
    for (let x = 100; x < TW; x += 400) { inkBox(x, base - 30, 70, 6, PAPER); inkBox(x + 6, base - 24, 5, 22, INK, 1); inkBox(x + 58, base - 24, 5, 22, INK, 1); inkBox(x, base - 48, 70, 5, PAPER); }
    for (let x = 260; x < TW; x += 520) { inkBox(x, base - 110, 5, 110, INK, 1); circ(x + 2, base - 112, 9, PAPER); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(x + 2, base - 112, 9, 0, 7); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 2; for (let x = 0; x < TW; x += 24) c.strokeRect(x, base - 26, 4, 26); line(0, base - 20, TW, base - 20, 2.5); line(0, base - 10, TW, base - 10, 2.5);
    for (let x = 700; x < TW; x += 900) { inkBox(x, base - 64, 18, 64, A, 2); c.fillStyle = PAPER; c.font = '900 13px sans-serif'; c.textAlign = 'center'; c.fillText('Z', x + 9, base - 46); }
  } else if (id === 'forest') {
    for (let x = 0; x < TW; x += 70 + r() * 50) inkPine(x, base, 170 + r() * 80, Math.floor(x) % 3 ? PAPER : lt);
    for (let x = 40; x < TW; x += 230) { inkBox(x, base - 12, 5, 12, PAPER, 1.4); c.fillStyle = A; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x + 2.5, base - 12, 10, 6, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); }
  } else if (id === 'village') {
    for (let x = 0; x < TW; x += 260) {
      inkBox(x + 20, base - 110, 180, 110, PAPER, 2.4);
      c.strokeStyle = INK; c.lineWidth = 1.2; for (let k = 0; k < 4; k++) { c.strokeRect(x + 30 + k * 44, base - 100, 32, 60); for (let j = 1; j < 3; j++) { c.beginPath(); c.moveTo(x + 30 + k * 44, base - 100 + j * 20); c.lineTo(x + 62 + k * 44, base - 100 + j * 20); c.stroke(); } }
      path([[x, base - 108], [x + 220, base - 108], [x + 190, base - 150], [x + 30, base - 150]], mid, INK, 2.4); hatch(x + 30, base - 150, 160, 42, 4, rgba(INK, 0.45));
      path([[x - 12, base - 104], [x + 8, base - 112], [x + 212, base - 112], [x + 232, base - 104]], INK);
      circ(x + 230, base - 80, 11, A); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(x + 230, base - 80, 11, 0, 7); c.stroke(); line(x + 230, base - 104, x + 230, base - 91, 1.6);
    }
    for (let x = 120; x < TW; x += 520) { inkBox(x - 5, base - 90, 10, 90, PAPER, 2); for (let i = 0; i < 12; i++) { const px = x + (r() - 0.5) * 110, py = base - 110 + (r() - 0.5) * 60; circ(px, py, 15 + r() * 8, rgba(A, 0.85)); c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(px, py, 15, 0, 7); c.stroke(); } }
  } else if (id === 'factory') {
    for (let x = 0; x < TW; x += 200) { inkBox(x, 20, 16, base, mid, 2); hatch(x, 20, 8, base, 3, rgba(INK, 0.5)); }
    inkBox(0, 20, TW, 14, mid, 2);
    for (let x = 0; x < TW; x += 200) { c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 8, 34); c.lineTo(x + 100, 120); c.lineTo(x + 192, 34); c.stroke(); c.strokeStyle = lt; c.lineWidth = 3; c.stroke(); }
    for (let x = 40; x < TW; x += 330) { inkBox(x, base - 80, 120, 80, PAPER, 2.4); halftone(x, base - 80, 120, 80, 0.2, 1.4, 4, rgba(INK, 0.45)); for (let k = 0; k < 5; k++) path([[x + k * 24, base - 12], [x + k * 24 + 12, base - 12], [x + k * 24 + 2, base], [x + k * 24 - 10, base]], A); inkBox(x + 12, base - 70, 40, 26, INK, 1); }
    line(0, 70, TW, 70, 10); line(0, 70, TW, 70, 5, lt);
  } else if (id === 'castle') {
    for (let x = 0; x < TW; x += 180) { inkBox(x, 40, 34, base - 40, shade(P.tint, 0.15), 2); hatch(x, 40, 12, base - 40, 4, rgba(INK, 0.5)); }
    for (let x = 60; x < TW; x += 360) { rr(x, 70, 70, 120, 34, INK); rr(x + 7, 77, 56, 106, 28, rgba(A, 0.9)); c.save(); c.clip(); halftone(x + 7, 77, 56, 106, 1.6, 0.2, 5, rgba(INK, 0.6)); c.restore(); line(x + 35, 78, x + 35, 182, 2.5); line(x + 8, 130, x + 62, 130, 2.5); }
    for (let x = 140; x < TW; x += 360) { inkBox(x, base - 120, 40, 120, A, 2); hatch(x, base - 120, 40, 120, 5, rgba(INK, 0.35)); }
  } else if (id === 'dojo') {
    for (let x = 0; x < TW; x += 110) { inkBox(x + 12, 80, 86, 130, PAPER, 1.6); c.strokeStyle = rgba(INK, 0.5); c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + 12 + k * 21.5, 80); c.lineTo(x + 12 + k * 21.5, 210); c.stroke(); } for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x + 12, 80 + k * 26); c.lineTo(x + 98, 80 + k * 26); c.stroke(); } }
    for (let x = 0; x < TW; x += 110) { inkBox(x, 50, 12, base, mid, 2); hatch(x, 50, 6, base, 3, rgba(INK, 0.45)); }
    inkBox(0, 50, TW, 16, mid, 2); inkBox(0, 210, TW, 10, mid, 2);
    for (let x = 300; x < TW; x += 560) { inkBox(x, 70, 54, 130, PAPER, 2.4); c.fillStyle = A; c.font = '900 34px serif'; c.textAlign = 'center'; c.fillText('拳', x + 27, 125); c.fillText('道', x + 27, 170); }
  }
}
function floorDetail(id, P, w, h, r, mid) {
  c.strokeStyle = rgba(INK, 0.55); c.lineWidth = 1.4;
  if (id === 'park' || id === 'forest') {
    for (let i = 0; i < w / 6; i++) { const x = r() * w, y = 14 + r() * (h - 14), k = y / h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1, y - 3 - k * 4); c.moveTo(x + 2, y); c.lineTo(x + 4, y - 2 - k * 4); c.stroke(); }
    c.fillStyle = shade(P.tint, 0.82); c.beginPath(); c.moveTo(0, 82); for (let x = 0; x <= w; x += 40) c.lineTo(x, 80 + Math.sin(x * 0.01) * 6); for (let x = w; x >= 0; x -= 40) c.lineTo(x, 122 + Math.sin(x * 0.013) * 6); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  } else if (id === 'village' || id === 'dojo') {
    for (let y = 0; y < h; y += 16 + y * 0.08) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let x = 0; x < w; x += 90) for (let y = 0, row = 0; y < h; y += 16 + y * 0.08, row++) { c.beginPath(); c.moveTo(x + (row % 2) * 45, y); c.lineTo(x + (row % 2) * 45, y + 16 + y * 0.08); c.stroke(); }
    if (id === 'dojo') { c.fillStyle = P.accent; c.fillRect(0, 70, w, 5); c.fillRect(0, h - 40, w, 5); }
  } else if (id === 'factory') {
    for (let x = 0; x < w; x += 80) for (let y = 0; y < h; y += 50) { c.strokeRect(x + 2, y + 2, 76, 46); circ(x + 8, y + 8, 2, INK); circ(x + 72, y + 8, 2, INK); }
    inkBox(0, 74, w, 44, mid, 2); for (let x = 0; x < w; x += 36) { path([[x, 74], [x + 18, 74], [x + 6, 80], [x - 12, 80]], P.accent); path([[x, 118], [x + 18, 118], [x + 6, 112], [x - 12, 112]], P.accent); }
  } else if (id === 'castle') {
    for (let y = 0, row = 0; y < h; y += 22 + row * 2, row++) for (let x = (row % 2) * 30; x < w; x += 60) c.strokeRect(x + 1, y + 1, 58, 20 + row * 2);
    c.fillStyle = rgba(P.accent, 0.85); c.fillRect(0, 78, w, 44); halftone(0, 78, w, 44, 0.9, 0.9, 5, rgba(INK, 0.4)); line(0, 78, w, 78, 3); line(0, 122, w, 122, 3);
  }
}

// ================================================================== particles and manga effects
const parts = [], seen = new WeakSet(), ghosts = new WeakMap(), sfxTexts = [];
let lastImpactT = -9, impactT = 0, impactX = W / 2, impactY = H / 2, focusT = 0, focusX = 0, focusY = 0, lastB = null;
const SFX = { zh: { light: ['啪', '咚', '砰'], heavy: ['砰！', '轟！', '咚！'], skill: ['轟！！', '轟隆！', '砰！！'], ko: ['K.O.!'] }, en: { light: ['POW', 'BAP', 'WHAP'], heavy: ['BAM!', 'WHAM!', 'POW!'], skill: ['BOOM!!', 'KA-BOOM!', 'KRAKOOM!'], ko: ['K.O.!'] } };
let lang = 'zh'; export function setSfxLang(l) { lang = l === 'en' ? 'en' : 'zh'; }
function emit(x, y, z, n, o) { for (let i = 0; i < n; i++) { const a = o.a != null ? o.a + (Math.random() - 0.5) * (o.spread ?? 6.3) : Math.random() * 6.3, v = (o.v || 80) * (0.4 + Math.random() * 0.8); parts.push({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (o.up || 0), g: o.g ?? 160, t: 0, life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), r: (o.r || 2.5) * (0.6 + Math.random() * 0.8), col: o.col, add: o.add, kind: o.kind || 'dot', rot: Math.random() * 6 }); } }
function sfxText(x, y, kind) { const list = SFX[lang][kind]; sfxTexts.push({ x, y, s: list[Math.floor(Math.random() * list.length)], t: 0, life: kind === 'light' ? 0.45 : 0.75, size: kind === 'light' ? 18 : kind === 'heavy' ? 30 : 38, rot: (Math.random() - 0.5) * 0.5, kind }); }
function spawnFor(B) {
  if (lastB !== B) { lastB = B; parts.length = 0; sfxTexts.length = 0; impactT = 0; focusT = 0; }
  for (const f of B.fx) {
    if (seen.has(f) || f.t < 0) continue; seen.add(f);
    const sy = GROUND + f.z - (f.y || 0), e = f.elem || 'phys';
    if (f.k === 'hit') {
      emit(f.x, sy, f.z, 8, { v: 170, life: 0.3, r: 2.6, col: col(e, 1), add: true, g: 300 });
      const kind = f.skill ? 'skill' : f.heavy ? 'heavy' : 'light';
      if (kind !== 'light' || Math.random() < 0.35) sfxText(f.x + (Math.random() - 0.5) * 30, sy - 26 - Math.random() * 16, kind);
      if (kind !== 'light') { focusT = 0.16; focusX = f.x; focusY = sy; }
    }
    if (f.k === 'block') emit(f.x, sy, f.z, 8, { v: 120, life: 0.3, r: 2, col: '#9ad8ff', add: true });
    if (f.k === 'nova') emit(f.x, GROUND + f.z - 10, f.z, 30, { v: (f.r || 100) * 2.2, life: 0.55, r: 4, col: col(e), add: true, g: 0, up: -40 });
    if (f.k === 'column') emit(f.x, GROUND + f.z, f.z, 12, { a: -1.57, spread: 1.2, v: 260, life: 0.6, r: 3.5, col: col(e), add: e !== 'earth' && e !== 'nature', g: 500 });
    if (f.k === 'shatter') emit(f.x, sy, f.z, 16, { v: 200, life: 0.6, r: 3, col: '#e0f6ff', g: 500, kind: 'shard' });
    if (f.k === 'poof') emit(f.x, sy, f.z, 8, { v: 50, life: 0.7, r: 10, col: PAPER, g: -30, kind: 'cloud' });
    if (f.k === 'heal') emit(f.x, GROUND + f.z, f.z, 12, { a: -1.57, spread: 1.4, v: 70, life: 1, r: 3, col: '#8affa0', add: true, g: -40, kind: 'plus' });
    if (f.k === 'aura') emit(f.x, GROUND + f.z - 30, f.z, 8, { a: -1.57, spread: 2, v: 60, life: 0.6, r: 3, col: col(e), add: true, g: -60 });
    if (f.k === 'land') emit(f.x, GROUND + f.z, f.z, 6, { a: -1.57, spread: 2.6, v: 70, life: 0.5, r: 8, col: PAPER, g: -10, kind: 'cloud' });
  }
  for (const p of B.projs) {
    if (p.kind === 'ball' && !p.arrow && !p.star) { const sx = p.x, sy = GROUND + p.z - p.y; if (Math.random() < 0.8) emit(sx - p.face * 6, sy, p.z, 1, { a: p.face > 0 ? 3.14 : 0, spread: 1, v: 40, life: 0.35, r: p.elem === 'ice' ? 2 : 3, col: col(p.elem, Math.random() < 0.5 ? 0 : 1), add: p.elem !== 'earth', g: p.elem === 'fire' ? -80 : 30 }); }
    if (p.kind === 'fall' && p.y > 0) emit(p.x, GROUND + p.z - p.y, p.z, 1, { a: -1.2, spread: 0.6, v: 40, life: 0.35, r: p.big ? 6 : 2.5, col: col(p.elem), add: true, g: -40 });
  }
  // impact frames on knockouts: short and rate limited (no rapid flashing)
  if (B.impact > 0 && B.t - lastImpactT > 0.8) { lastImpactT = B.t; impactT = Math.min(0.12, B.impact); impactX = B.impactX - B.cam; impactY = B.impactY; sfxText(B.impactX, B.impactY - 34, 'ko'); }
  B.impact = 0;
}
function stepParts(dt, B) {
  spawnFor(B);
  for (const p of parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; }
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t > parts[i].life) parts.splice(i, 1);
  if (parts.length > 700) parts.splice(0, parts.length - 700);
  for (const s of sfxTexts) s.t += dt;
  for (let i = sfxTexts.length - 1; i >= 0; i--) if (sfxTexts[i].t > sfxTexts[i].life) sfxTexts.splice(i, 1);
  if (impactT > 0) impactT -= dt; if (focusT > 0) focusT -= dt;
}
function drawParts(B, front) {
  for (const p of parts) {
    if ((p.z > ZD * 0.5) !== front) continue;
    const k = 1 - p.t / p.life, sx = p.x - B.cam, sy = p.y;
    c.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
    if (p.add) c.globalCompositeOperation = GLOW;
    if (p.kind === 'shard') { c.save(); c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = p.col; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.rect(-p.r, -p.r * 0.5, p.r * 2, p.r); c.fill(); c.stroke(); c.restore(); }
    else if (p.kind === 'plus') { c.fillStyle = p.col; c.fillRect(sx - p.r, sy - 0.8, p.r * 2, 1.6); c.fillRect(sx - 0.8, sy - p.r, 1.6, p.r * 2); }
    else if (p.kind === 'cloud') { const rr2 = p.r * (1.2 - k * 0.5); circ(sx, sy, rr2 + 1.6, INK); circ(sx, sy, rr2, p.col); }
    else circ(sx, sy, p.r * (0.5 + k * 0.5), p.col);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
}
const amb = [];
function ambient(P, dt) {
  const kind = P.amb, want = { leaf: 12, firefly: 22, petal: 20, spark: 14, ember: 22, dust: 14 }[kind] || 0;
  while (amb.length < want) amb.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * 9, s: 0.5 + Math.random() });
  if (amb.length > want) amb.length = want;
  for (const a of amb) {
    a.t += dt;
    if (kind === 'leaf' || kind === 'petal') { a.x += (-18 + Math.sin(a.t) * 14) * dt * a.s; a.y += 22 * dt * a.s; }
    if (kind === 'firefly' || kind === 'dust') { a.x += Math.sin(a.t * 0.7 + a.s * 5) * 10 * dt; a.y += Math.cos(a.t * 0.9) * 8 * dt; }
    if (kind === 'spark') { a.y += 80 * dt * a.s; a.x += 10 * dt; }
    if (kind === 'ember') { a.y -= 26 * dt * a.s; a.x += Math.sin(a.t * 2) * 12 * dt; }
    if (a.y > H + 10) { a.y = -10; a.x = Math.random() * W; } if (a.y < -10) { a.y = H + 10; a.x = Math.random() * W; }
    if (a.x < -10) a.x = W + 10; if (a.x > W + 10) a.x = -10;
    const x = a.x, y = a.y;
    if (kind === 'leaf' || kind === 'petal') { c.save(); c.translate(x, y); c.rotate(a.t * 2); ell(0, 0, 4.5 * a.s, 2.2 * a.s, kind === 'leaf' ? PAPER : '#ffc8d8'); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.restore(); }
    if (kind === 'firefly' || kind === 'spark' || kind === 'ember') { c.globalCompositeOperation = GLOW; circ(x, y, 4 * a.s, rgba(kind === 'firefly' ? '#ffe890' : kind === 'spark' ? '#ffd060' : '#ff7a4a', 0.18 + 0.12 * Math.sin(a.t * 3))); circ(x, y, 1.4, rgba('#fff8c0', 0.7)); c.globalCompositeOperation = 'source-over'; }
    if (kind === 'dust') circ(x, y, 1.3 * a.s, rgba(INK, 0.25));
  }
}
// radial focus lines
function focusLines(x, y, strength, colr = INK) {
  const n = 64, R = 560; c.fillStyle = colr;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i * 7.3 % 1) * 0.08, w = 0.012 + (i * 3.7 % 1) * 0.02, r0 = 90 + (i * 5.1 % 1) * 90 * (1 - strength);
    c.beginPath(); c.moveTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R); c.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R); c.fill();
  }
}
function shadow(x, y, rx) { ell(x, y, rx, rx * 0.26, rgba(INK, 0.22)); c.fillStyle = tone(INK, 3.2, 0.8, 0.45); c.beginPath(); c.ellipse(x, y, rx * 0.8, rx * 0.2, 0, 0, 7); c.fill(); }
function txtOut(s, x, y, size, fill, align = 'left') { c.font = `900 ${size}px ${FONT}`; c.textAlign = align; c.lineJoin = 'round'; c.lineWidth = Math.max(3, size / 4); c.strokeStyle = INK; c.strokeText(s, x, y); c.fillStyle = fill; c.fillText(s, x, y); }
const FONT = '"Bangers", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
function fighter(B, e) {
  const sx = e.x - B.cam, gy = GROUND + e.z, sy = gy - e.y;
  if (sx < -90 || sx > W + 90) return;
  shadow(sx, gy, (e.def.big ? 30 : 22) * (1 - Math.min(0.5, e.y / 200)));
  if (e.kind === 'hawk') { hawk(sx, sy, e); return; }
  const gl = ghosts.get(e) || []; if (!ghosts.has(e)) ghosts.set(e, gl);
  const fast = e.st === 'dash' || e.st === 'run' || e.st === 'runatk' || e.st === 'upper';
  if (fast && (!gl.length || B.t - gl[gl.length - 1].t > 0.05)) gl.push({ t: B.t, x: e.x, z: e.z, y: e.y, st: e.st, an: e.anim, face: e.face });
  while (gl.length && B.t - gl[0].t > 0.2) gl.shift();
  for (const g of gl) { const k = 1 - (B.t - g.t) / 0.2; drawFighter(c, e.def, g.x - B.cam, GROUND + g.z - g.y, g.face, 1, { st: g.st, anim: g.an, alpha: 0.18 * k }); }
  if (fast) { c.strokeStyle = rgba(INK, 0.7); c.lineCap = 'round'; for (let i = 0; i < 7; i++) { const yy = sy - 10 - i * 12 + Math.sin(B.t * 40 + i) * 2, len = 22 + (i * 13 % 20); c.lineWidth = 1 + (i % 3) * 0.6; c.beginPath(); c.moveTo(sx - e.face * (18 + (i * 7 % 10)), yy); c.lineTo(sx - e.face * (18 + len + (i * 7 % 10)), yy); c.stroke(); } }
  if (e.buffs.power || e.buffs.guard || e.buffs.armor) { const k = e.buffs.power ? 'elec' : e.buffs.armor ? 'earth' : 'nature'; c.globalCompositeOperation = GLOW; const ag = c.createRadialGradient(sx, sy - 44, 6, sx, sy - 44, 52); ag.addColorStop(0, rgba(col(k), 0)); ag.addColorStop(0.7, rgba(col(k), 0.22 + 0.1 * Math.sin(B.t * 8))); ag.addColorStop(1, rgba(col(k), 0)); c.fillStyle = ag; c.beginPath(); c.ellipse(sx, sy - 44, 36, 58, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
  const blink = e.inv > 0 && e.inv < 2 && e.st !== 'lie' && e.st !== 'rise' && Math.floor(B.t * 20) % 2 === 0;
  const alpha = e.dead ? Math.max(0, 1 - (e.t - 0.3) * 1.2) : e.ghost ? 0.6 : blink ? 0.5 : 1;
  drawFighter(c, e.def, sx, sy, e.face, 1, { st: e.frozenT > 0 ? 'frozen' : e.st, t: e.t, anim: e.frozenT > 0 ? 0 : e.anim, pose: e.pose, hold: e.hold?.kind || (e.def.look?.extras?.includes('bow') ? 'bow' : null), alpha,
    atk: e.atk, sk: e.sk?.kind, glow: e.sk?.elem, vy: e.vy, tint: e.ghost ? 'grayscale(1) brightness(0.6)' : e.flash > 0 ? 'brightness(1.6)' : null });
  if (e.frozenT > 0) { path([[sx - 22, sy], [sx - 25, sy - 76], [sx - 8, sy - 102], [sx + 18, sy - 94], [sx + 26, sy - 30], [sx + 20, sy]], 'rgba(200,240,255,0.65)', INK, 2.4); line(sx - 15, sy - 84, sx - 15, sy - 30, 4, 'rgba(255,255,255,0.8)'); }
  if (e.burnT > 0) { c.globalCompositeOperation = GLOW; for (let i = 0; i < 5; i++) { const fx = sx + Math.sin(B.t * 18 + i * 2) * 11, fy = sy - 18 - i * 14 - (B.t * 70 + i * 9) % 16; circ(fx, fy, 8 - i, rgba(i % 2 ? '#ffd23a' : '#ff5a1a', 0.75)); } c.globalCompositeOperation = 'source-over'; }
  if (e.st === 'stun') for (let i = 0; i < 3; i++) { const a = B.t * 6 + i * 2.1; star(sx + Math.cos(a) * 16, sy - 106 + Math.sin(a) * 5, 5.5, INK); star(sx + Math.cos(a) * 16, sy - 106 + Math.sin(a) * 5, 3.6, '#ffe040'); }
  if (e.st === 'defend') { c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(sx + e.face * 8, sy - 46, 32, e.face > 0 ? -1.1 : Math.PI - 1.1, e.face > 0 ? 1.1 : Math.PI + 1.1); c.stroke(); c.strokeStyle = '#9ad8ff'; c.lineWidth = 2.5; c.stroke(); }
  const top = sy - (e.def.big ? 122 : 108);
  if (e.pi < 0 && !e.boss && e.hp < e.mhp && !e.dead) { rr(sx - 22, top, 44, 7, 2, PAPER, INK, 1.8); c.fillStyle = e.team === 0 ? '#3ac85a' : '#e8302a'; c.fillRect(sx - 20.5, top + 1.5, 41 * Math.max(0, e.hp / e.mhp), 4); }
  if (e.pi >= 0) { const tc = e.pi ? '#2a8aff' : '#e8302a'; path([[sx - 7, top - 2], [sx + 7, top - 2], [sx, top + 7]], tc, INK, 1.8); txtOut(e.pi ? '2P' : '1P', sx, top - 5, 14, tc, 'center'); }
}
function hawk(x, y, e) {
  const f = Math.sin(e.anim * 14) * 9;
  path([[x - 4, y], [x - 25, y - 6 - f], [x - 10, y + 4]], '#a87a4a', INK, 1.8); path([[x + 4, y], [x + 25, y - 6 - f], [x + 10, y + 4]], '#a87a4a', INK, 1.8);
  ell(x, y, 9, 6.5, '#b88a5a'); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke(); circ(x + 8 * e.face, y - 5, 5.5, PAPER); path([[x + 12 * e.face, y - 6], [x + 18 * e.face, y - 3.5], [x + 12 * e.face, y - 1.5]], '#ffc020', INK, 1);
}
function glowBall(x, y, r, e) {
  c.globalCompositeOperation = GLOW;
  const g = c.createRadialGradient(x, y, 1, x, y, r * 2.6); g.addColorStop(0, rgba(col(e, 1), 0.95)); g.addColorStop(0.35, rgba(col(e), 0.75)); g.addColorStop(1, rgba(col(e), 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, 7); c.fill();
  c.globalCompositeOperation = 'source-over';
}
function projectile(B, p) {
  const sx = p.x - B.cam, sy = GROUND + p.z - p.y; if (sx < -120 || sx > W + 120) return;
  if (p.kind !== 'fall' && p.y > 0) shadow(sx, GROUND + p.z, p.r * 1.2);
  const e = p.elem || 'phys';
  if (p.kind === 'ball' && Math.abs(p.vx) > 50) { c.strokeStyle = rgba(INK, 0.6); c.lineWidth = 1.4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sx - p.face * (p.r + 4), sy + i * p.r * 0.6); c.lineTo(sx - p.face * (p.r + 26 - Math.abs(i) * 8), sy + i * p.r * 0.6); c.stroke(); } }
  if (p.kind === 'wall') { const a = Math.min(1, p.life * 2); c.globalAlpha = a; path([[sx - 18, sy], [sx - 20, sy - 66], [sx - 6, sy - 88], [sx + 12, sy - 78], [sx + 20, sy - 30], [sx + 16, sy]], 'rgba(210,244,255,0.85)', INK, 2.6); line(sx - 10, sy - 70, sx - 10, sy - 14, 3, '#ffffff'); c.globalAlpha = 1; return; }
  if (p.kind === 'thrown') { c.save(); c.translate(sx, sy); c.rotate(p.t * 12 * p.face); itemArt(p.item, 0, 0); c.restore(); return; }
  if (p.kind === 'bomb') { circ(sx, sy, 10, INK); circ(sx, sy, 8, '#3a3a4a'); glowBall(sx + 5, sy - 8, 3, 'fire'); return; }
  if (p.arrow) { c.save(); c.translate(sx, sy); c.rotate(Math.atan2(-p.vy, p.vx)); line(-20, 0, 8, 0, 4.5); line(-20, 0, 8, 0, 2, '#a87a4a'); path([[8, -5], [18, 0], [8, 5]], PAPER, INK, 1.6); path([[-23, -5], [-15, 0], [-23, 5], [-19, 0]], '#e84a3a', INK, 1); c.restore(); return; }
  if (p.star) { c.save(); c.translate(sx, sy); c.rotate(p.t * 22); star(0, 0, 12.5, INK, 4, 0.35); star(0, 0, 10, '#d8dce6', 4, 0.32); circ(0, 0, 2.5, INK); c.restore(); return; }
  if (p.kind === 'fall') {
    if (p.big) { glowBall(sx, sy, p.r * 0.5, 'fire'); circ(sx, sy, p.r * 0.42, INK); circ(sx, sy, p.r * 0.38, '#8a6242'); c.save(); c.beginPath(); c.arc(sx, sy, p.r * 0.38, 0, 7); c.clip(); halftone(sx - p.r * 0.38, sy - p.r * 0.38, p.r * 0.76, p.r * 0.76, 0.1, 1.6, 5, rgba(INK, 0.5)); c.restore(); return; }
    if (p.arrow) { c.save(); c.translate(sx, sy); c.rotate(Math.atan2(-p.vy, p.vx)); line(-16, 0, 6, 0, 3.5); line(-16, 0, 6, 0, 1.6, '#a87a4a'); path([[6, -4], [13, 0], [6, 4]], PAPER, INK, 1.2); c.restore(); return; }
    if (e === 'ice') { path([[sx - 6, sy - 26], [sx + 6, sy - 26], [sx, sy + 8]], '#e4f8ff', INK, 1.8); return; }
    glowBall(sx, sy, 7, e); circ(sx, sy, 5, col(e, 1)); return;
  }
  const r = p.r;
  if (e === 'earth') { c.save(); c.translate(sx, sy); c.rotate(p.t * 8); path([[-r, -r * 0.6], [-r * 0.3, -r], [r, -r * 0.7], [r * 0.9, r * 0.6], [-r * 0.2, r], [-r, r * 0.5]], '#a8886a', INK, 2.4); c.fillStyle = tone(INK, 3, 0.8, 0.5); c.fill(); c.restore(); return; }
  if (e === 'ice') { glowBall(sx, sy, r * 0.8, 'ice'); c.save(); c.translate(sx, sy); c.rotate(p.t * 6); c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); c.lineTo(Math.cos(a + 0.52) * r * 0.5, Math.sin(a + 0.52) * r * 0.5); } c.closePath(); c.fillStyle = '#eefbff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke(); c.restore(); return; }
  if (e === 'elec') { glowBall(sx, sy, r, 'elec'); c.strokeStyle = INK; c.lineWidth = 3.5; c.beginPath(); for (let i = 0; i < 3; i++) { const a = Math.random() * 6.3; c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * r * 0.8, sy + Math.sin(a) * r * 0.8); c.lineTo(sx + Math.cos(a + 0.4) * r * 1.7, sy + Math.sin(a + 0.4) * r * 1.7); } c.stroke(); c.strokeStyle = '#fff8b0'; c.lineWidth = 1.5; c.stroke(); return; }
  if (e === 'fire') { glowBall(sx, sy, r * 1.1, 'fire'); circ(sx, sy, r * 0.75, INK); c.globalCompositeOperation = GLOW; circ(sx, sy, r * 0.7, '#ff7a1a'); circ(sx, sy, r * 0.42, '#fff6c8'); c.globalCompositeOperation = 'source-over'; return; }
  glowBall(sx, sy, r, e); circ(sx, sy, r * 0.62, INK); circ(sx, sy, r * 0.48, '#ffffff');
}
export function itemArt(k, x, y) {
  if (k === 'bat') { c.save(); c.translate(x, y); c.rotate(-0.4); rr(-3.5, -20, 7.5, 34, 3.5, '#c8904a', INK, 2.2); rr(-3.5, 10, 7.5, 6, 2, '#3a2a1a'); c.restore(); }
  if (k === 'knife') { path([[x - 10, y - 2], [x + 3, y - 2.5], [x + 3, y + 2.5], [x - 10, y + 2]], '#e4e8f0', INK, 1.6); rr(x + 3, y - 3, 7, 6, 2, '#4a2e14', INK, 1.4); }
  if (k === 'stone') { circ(x, y, 12, INK); circ(x, y, 10.2, '#9a9aa2'); c.fillStyle = tone(INK, 3, 0.8, 0.5); c.beginPath(); c.arc(x + 2, y + 3, 7, 0, 7); c.fill(); }
  if (k === 'crate') { rr(x - 13, y - 13, 26, 26, 2, '#c8944e', INK, 2.4); line(x - 11, y - 11, x + 11, y + 11, 2.2, '#6a4a22'); line(x - 13, y, x + 13, y, 2.2, '#6a4a22'); }
  if (k === 'milkbottle') { rr(x - 7, y - 12, 14, 21, 5, '#ffffff', INK, 2); rr(x - 4.5, y - 17, 9, 6, 2, '#3a90f0', INK, 1.6); c.fillStyle = '#3a90f0'; c.fillRect(x - 5.6, y - 3, 11.2, 4); }
  if (k === 'coin') { circ(x, y, 8, INK); circ(x, y, 6.4, '#ffc21a'); circ(x - 1, y - 1, 3.8, '#ffe070'); c.fillStyle = INK; c.fillRect(x - 0.8, y - 3, 1.6, 6); }
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
    if (f.t < 0) { if (f.k === 'bolt') { const sx = f.x - B.cam, gy = GROUND + f.z; ell(sx, gy, 30, 9, Math.floor(B.t * 16) % 2 ? rgba(INK, 0.5) : rgba(INK, 0.15)); } continue; }
    const sx = f.x - B.cam, gy = GROUND + f.z, sy = gy - (f.y || 0), k = f.t / (f.life || 0.3), e = f.elem || 'phys';
    c.globalAlpha = Math.max(0, 1 - k);
    switch (f.k) {
      case 'hit': { const big = f.skill || f.heavy, R = (big ? 30 : 18) * (0.6 + k * 0.6);
        star(sx, sy, R + 4, INK, big ? 9 : 7, 0.42); star(sx, sy, R, '#ffffff', big ? 9 : 7, 0.42);
        if (big) { c.globalCompositeOperation = GLOW; star(sx, sy, R * 0.7, rgba(col(e), 0.9), 9, 0.4); c.globalCompositeOperation = 'source-over'; }
        c.strokeStyle = INK; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * 0.785 + f.x; c.beginPath(); c.moveTo(sx + Math.cos(a) * R * 1.2, sy + Math.sin(a) * R * 1.2); c.lineTo(sx + Math.cos(a) * R * 1.9, sy + Math.sin(a) * R * 1.9); c.stroke(); }
        break; }
      case 'block': c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.arc(sx, sy, 10 + k * 18, 0, 7); c.stroke(); c.strokeStyle = '#9ad8ff'; c.lineWidth = 2; c.stroke(); break;
      case 'column': {
        const h = 116 * Math.min(1, f.t * 8) * (1 - Math.max(0, k - 0.6) * 2.5);
        if (e === 'fire') { for (let i = 0; i < 7; i++) circ(sx + Math.sin(B.t * 30 + i) * 6, gy - i * h / 7, 19 - i * 1.6 + 2, INK); c.globalCompositeOperation = GLOW; for (let i = 0; i < 7; i++) circ(sx + Math.sin(B.t * 30 + i) * 6, gy - i * h / 7, 18 - i * 1.6, rgba(i % 2 ? '#ffd23a' : '#ff5a1a', 0.85)); c.globalCompositeOperation = 'source-over'; }
        else if (e === 'nature') { for (let i = -1; i <= 1; i++) { c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 8.5; c.beginPath(); c.moveTo(sx + i * 10, gy); c.quadraticCurveTo(sx + i * 22, gy - h / 2, sx + i * 6, gy - h * 0.8); c.stroke(); c.strokeStyle = '#4aa84a'; c.lineWidth = 5; c.stroke(); } }
        else { const ice = e === 'ice'; for (let i = -1; i <= 1; i++) { const hh = h * (i ? 0.72 : 1); path([[sx + i * 15 - 11, gy], [sx + i * 15, gy - hh], [sx + i * 15 + 11, gy]], ice ? '#e4f8ff' : '#c8a07a', INK, 2.4); c.save(); poly([[sx + i * 15 - 11, gy], [sx + i * 15, gy - hh], [sx + i * 15, gy]]); c.fillStyle = tone(INK, 3, 0.8, 0.45); c.fill(); c.restore(); } }
        break;
      }
      case 'bolt': { c.strokeStyle = INK; c.lineWidth = 11; c.lineJoin = 'miter'; c.beginPath(); let x = sx, y = 0; c.moveTo(x, y); while (y < gy) { y += 28; x = sx + (Math.random() - 0.5) * 34; c.lineTo(x, Math.min(gy, y)); } c.stroke(); c.strokeStyle = '#fff6a0'; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(); break; }
      case 'nova': { const r = f.r * (0.3 + k * 0.85); c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.ellipse(sx, gy, r, r * 0.42, 0, 0, 7); c.stroke(); c.globalCompositeOperation = GLOW; const ng = c.createRadialGradient(sx, gy, r * 0.2, sx, gy, r); ng.addColorStop(0, rgba(col(e), 0)); ng.addColorStop(0.8, rgba(col(e), 0.5)); ng.addColorStop(1, rgba(col(e, 1), 0.9)); c.fillStyle = ng; c.beginPath(); c.ellipse(sx, gy, r, r * 0.42, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; break; }
      case 'beam': { const w = f.len * f.face, th = 26 * (1 - Math.max(0, k - 0.5) * 2) * (0.85 + 0.15 * Math.sin(B.t * 60)); c.fillStyle = INK; c.fillRect(Math.min(sx, sx + w), sy - th - 3, Math.abs(w), th * 2 + 6); c.globalCompositeOperation = GLOW; const bg = c.createLinearGradient(0, sy - th, 0, sy + th); bg.addColorStop(0, rgba(col(e), 0.4)); bg.addColorStop(0.5, rgba(col(e), 1)); bg.addColorStop(1, rgba(col(e), 0.4)); c.fillStyle = bg; c.fillRect(Math.min(sx, sx + w), sy - th, Math.abs(w), th * 2); c.fillStyle = rgba(col(e, 1), 1); c.fillRect(Math.min(sx, sx + w), sy - th * 0.25, Math.abs(w), th * 0.5); c.globalCompositeOperation = 'source-over'; break; }
      case 'aura': c.globalCompositeOperation = GLOW; ell(sx, gy - 44, (f.big ? 38 : 30) * (0.6 + k), (f.big ? 60 : 50) * (0.6 + k), rgba(col(e), 0.35)); c.globalCompositeOperation = 'source-over'; break;
      case 'heal': c.globalCompositeOperation = GLOW; ell(sx, gy, 30 * (0.5 + k), 9, rgba('#8affa0', 0.45)); c.globalCompositeOperation = 'source-over'; break;
    }
    c.globalAlpha = 1;
  }
}
function drawSfx(B) {
  for (const s of sfxTexts) {
    const k = s.t / s.life, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - (k - 0.15) * 0.25, sx = s.x - B.cam;
    c.save(); c.globalAlpha = Math.min(1, (1 - k) * 3); c.translate(sx, s.y - k * 14); c.rotate(s.rot); c.scale(pop, pop);
    c.font = `900 ${s.size}px ${FONT}`; c.textAlign = 'center'; c.lineJoin = 'round';
    c.lineWidth = s.size / 3.2; c.strokeStyle = '#ffffff'; c.strokeText(s.s, 0, 0);
    c.lineWidth = s.size / 7; c.strokeStyle = INK; c.strokeText(s.s, 0, 0);
    c.fillStyle = s.kind === 'light' ? INK : s.kind === 'ko' ? '#e8302a' : '#ffd23a'; c.fillText(s.s, 0, 0);
    c.restore();
  }
}

// ================================================================== HUD (manga panels)
const hpShown = new WeakMap(), comboShown = new WeakMap();
function mbar(x, y, w, h, k, fill, trail) {
  path([[x + 4, y], [x + w, y], [x + w - 4, y + h], [x, y + h]], PAPER, INK, 2.4);
  if (trail != null && trail > k) { c.fillStyle = INK; c.fillRect(x + 3, y + 2.5, Math.max(0, (w - 7) * Math.min(1, trail)), h - 5); }
  if (k > 0) { c.save(); poly([[x + 4, y], [x + w, y], [x + w - 4, y + h], [x, y + h]]); c.clip(); c.fillStyle = fill; c.fillRect(x + 2, y + 2.5, Math.max(0, (w - 5) * Math.min(1, k)), h - 5); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 2, y + 2.5, Math.max(0, (w - 5) * Math.min(1, k)), 2); c.restore(); }
}
function practiceHud(B, o) {
  const P = B.practice, x = W - 214, y = 54, rows = B.players[0].skills;
  path([[x, y], [x + 206, y], [x + 202, y + 22 + rows.length * 25], [x - 4, y + 22 + rows.length * 25]], PAPER, INK, 3);
  txtOut('PRACTICE', x + 8, y + 18, 17, '#e8302a');
  c.font = `700 10px ${FONT}`; c.fillStyle = INK; c.textAlign = 'right'; c.fillText(o.labels.mp, x + 196, y + 16);
  rows.forEach((sk, i) => {
    const ry = y + 24 + i * 25, flash = P.last && P.last.slot === i && B.t - P.last.t < 0.6;
    if (flash) { c.fillStyle = rgba('#ffd23a', 0.8); c.fillRect(x + 2, ry - 1, 198, 23); }
    rr(x + 6, ry + 1, 20, 20, 3, PAPER, INK, 1.8); c.font = `900 13px ${FONT}`; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(o.keys[i] || '', x + 16, ry + 16);
    c.textAlign = 'left'; c.font = `700 10px ${FONT}`; c.fillStyle = rgba(INK, 0.7); c.fillText(o.combos[i], x + 30, ry + 9);
    c.font = `800 12px ${FONT}`; c.fillStyle = sk ? INK : rgba(INK, 0.4); c.fillText(sk ? o.skillName(sk) : '—', x + 30, ry + 20);
    if (sk) { c.textAlign = 'right'; c.font = `700 10px ${FONT}`; c.fillStyle = '#2a6ae8'; c.fillText(String(sk.mp), x + 196, ry + 9); c.fillStyle = P.casts[i] ? '#2ea84a' : rgba(INK, 0.35); c.font = `900 12px ${FONT}`; c.fillText(P.casts[i] ? '✓' + P.casts[i] : '·', x + 196, ry + 21); }
  });
  // stats and the input history
  const sy = y + 30 + rows.length * 25;
  path([[x, sy], [x + 206, sy], [x + 203, sy + 40], [x - 3, sy + 40]], PAPER, INK, 2.6);
  c.textAlign = 'left'; c.font = `800 11px ${FONT}`; c.fillStyle = INK;
  c.fillText(`${o.labels.dmg}: ${Math.round(P.dmg)}`, x + 8, sy + 16); c.fillText(`${o.labels.best}: ${P.best}`, x + 8, sy + 32);
  c.fillStyle = rgba(INK, 0.6); c.textAlign = 'right'; c.fillText(o.labels.esc, x + 198, sy + 32);
  const hist = o.hist || [];
  if (hist.length) {
    const w = hist.length * 30 + 14, hx = W / 2 - w / 2, hy = H - 46;
    path([[hx, hy], [hx + w, hy], [hx + w - 4, hy + 34], [hx - 4, hy + 34]], PAPER, INK, 2.6);
    hist.forEach((h, i) => { const age = (performance.now() - h.t) / 1000; c.globalAlpha = Math.max(0.35, 1 - age * 0.4); rr(hx + 9 + i * 30, hy + 5, 25, 24, 4, h.hot ? '#ffd23a' : PAPER, INK, 2); c.font = `900 15px ${FONT}`; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(h.s, hx + 21.5 + i * 30, hy + 23); });
    c.globalAlpha = 1;
  }
}
function hud(B, o) {
  if (B.practice) practiceHud(B, o);
  B.players.forEach((p, i) => {
    const x = 14 + i * 250, y = 12, accent = p.def.color || '#e8302a';
    path([[x, y], [x + 238, y], [x + 230, y + 60], [x - 4, y + 60]], PAPER, INK, 3);
    c.save(); poly([[x + 60, y + 2], [x + 236, y + 2], [x + 229, y + 58], [x + 56, y + 58]]); c.clip(); halftone(x + 56, y, 182, 60, 0.1, 1.2, 4, rgba(INK, 0.35)); c.restore();
    path([[x + 4, y + 4], [x + 56, y + 4], [x + 52, y + 56], [x, y + 56]], accent, INK, 2.4);
    c.save(); poly([[x + 4, y + 4], [x + 56, y + 4], [x + 52, y + 56], [x, y + 56]]); c.clip(); drawPortrait(c, p.def, x + 25, y + 32, 1.3); c.restore();
    txtOut(o.name(p), x + 62, y + 22, 20, '#ffffff'); txtOut('Lv ' + p.lv, x + 224, y + 22, 16, '#ffd23a', 'right');
    let sh = hpShown.get(p) ?? p.hp; sh = sh > p.hp ? sh - Math.max(1, (sh - p.hp) * 0.04) : p.hp; hpShown.set(p, sh);
    const k = Math.max(0, p.hp / p.mhp);
    mbar(x + 60, y + 28, 166, 13, k, k < 0.3 ? '#e8302a' : '#3ac85a', sh / p.mhp);
    mbar(x + 60, y + 43, 150, 9, p.mp / p.mmp, '#2a7ae8');
    c.font = `700 10px ${FONT}`; c.textAlign = 'right'; c.fillStyle = INK; c.fillText(Math.max(0, Math.ceil(p.hp)) + '/' + p.mhp, x + 220, y + 38.5);
    const hits = p.hits || 0, since = B.t - (p.lastHitT ?? -9);
    if (hits >= 2 && since < 1.2) { const pop = comboShown.get(p) !== hits ? 1.3 : 1; comboShown.set(p, hits); const yy = 136 + i * 70; c.save(); c.translate(72, yy); c.scale(pop, pop); c.globalAlpha = Math.min(1, (1.2 - since) * 3); star(0, -8, 54, INK, 12, 0.72); star(0, -8, 49, '#ffffff', 12, 0.72); txtOut(String(hits), -2, 6, 40, '#e8302a', 'center'); txtOut('HITS!', 2, 24, 16, '#ffd23a', 'center'); c.restore(); c.globalAlpha = 1; }
  });
  const gx = W - 16;
  path([[gx - 96, 12], [gx + 4, 12], [gx, 40], [gx - 100, 40]], PAPER, INK, 2.6); itemArt('coin', gx - 82, 26); txtOut(String(B.earned.gold), gx - 6, 35, 21, '#ffd23a', 'right');
  if (B.mode === 'stage') { txtOut(o.stageName, gx, 63, 16, '#ffffff', 'right'); for (let i = 0; i < B.waves.length; i++) { const cx = gx - (B.waves.length - 1 - i) * 17 - 5, done = i < B.wave - (B.ents.some((e) => e.team !== 0 && !e.dead) ? 1 : 0); star(cx, 77, 8, INK, 4, 0.6); star(cx, 77, 5.2, i === B.waves.length - 1 ? (done ? '#e8302a' : PAPER) : done ? '#ffd23a' : PAPER, 4, 0.6); } }
  if (B.mode === 'survival') txtOut('WAVE ' + Math.max(1, B.wave), gx, 64, 21, '#ffffff', 'right');
  const b = B.boss && !B.boss.dead ? B.boss : B.ents.find((e) => e.boss && !e.dead);
  if (b) { const bw = 380, bx = W / 2 - bw / 2, by = H - 32; let sh = hpShown.get(b) ?? b.hp; sh = sh > b.hp ? sh - Math.max(1, (sh - b.hp) * 0.04) : b.hp; hpShown.set(b, sh); path([[bx - 10, by - 24], [bx + bw + 14, by - 24], [bx + bw + 8, by + 20], [bx - 16, by + 20]], PAPER, INK, 3); txtOut(o.name(b), W / 2, by - 6, 18, '#e8302a', 'center'); mbar(bx, by, bw, 14, Math.max(0, b.hp) / b.mhp, '#8a2ac8', sh / b.mhp); }
  if (B.mode === 'vs') B.ents.filter((e) => e.team === 1 && e.kind === 'hero').forEach((e, i) => { const x = W - 188, y = 52 + i * 30; path([[x, y], [x + 174, y], [x + 170, y + 26], [x - 4, y + 26]], PAPER, INK, 2.2); txtOut(`${o.name(e)} Lv${e.lv}`, x + 6, y + 12, 13, '#ffffff'); mbar(x + 6, y + 14, 156, 8, Math.max(0, e.hp) / e.mhp, '#e8302a'); });
  if (B.banner) { const t = 1.6 - B.banner.t, slide = Math.min(1, t * 5), out = Math.max(0, (t - 1.25) * 3); c.save(); c.globalAlpha = Math.max(0, 1 - out); c.translate(W / 2 + (1 - slide) * -300 + out * 300, 180); const boss = B.banner.txt === 'BOSS';
    c.save(); c.rotate(-0.04); path([[-250, -46], [250, -52], [240, 24], [-240, 28]], boss ? INK : PAPER, INK, 4); c.restore();
    c.font = `900 58px ${FONT}`; c.textAlign = 'center'; c.lineJoin = 'round'; const s = boss ? 'BOSS BATTLE' : B.banner.txt; c.lineWidth = 10; c.strokeStyle = boss ? '#ffffff' : INK; c.strokeText(s, 0, 8); c.fillStyle = boss ? '#e8302a' : '#ffd23a'; c.fillText(s, 0, 8); c.restore(); }
  if (B.over && B.over.win) { const k = Math.min(1, B.overT * 3); c.save(); c.globalAlpha = k; c.translate(W / 2, 205); c.rotate(-0.05); c.scale(1.6 - k * 0.6, 1.6 - k * 0.6); c.font = `900 68px ${FONT}`; c.textAlign = 'center'; c.lineJoin = 'round'; const s = B.mode === 'vs' ? 'YOU WIN!' : 'STAGE CLEAR!'; c.lineWidth = 16; c.strokeStyle = '#ffffff'; c.strokeText(s, 0, 0); c.lineWidth = 8; c.strokeStyle = INK; c.strokeText(s, 0, 0); c.fillStyle = '#ffd23a'; c.fillText(s, 0, 0); c.restore(); }
}

// ================================================================== the frame
export function renderBattle(ctx, B, scale, o) {
  c = ctx; c.setTransform(scale, 0, 0, scale, 0, 0); c.imageSmoothingEnabled = true;
  const dt = clamp(o.dt || 0, 0, 0.05), Ly = layers(o.bg, B.Wd);
  stepParts(dt, B);
  const sh = B.shake > 0 ? (Math.random() - 0.5) * 10 * Math.min(1, B.shake * 3) : 0;
  c.save(); c.translate(sh, sh * 0.5);
  c.drawImage(Ly.sky, 0, 0);
  const tile = (img, par) => { const off = ((B.cam * par) % Ly.TW + Ly.TW) % Ly.TW; c.drawImage(img, -off, 0); c.drawImage(img, Ly.TW - off, 0); };
  tile(Ly.far, 0.18); tile(Ly.mid, 0.5);
  c.drawImage(Ly.floor, -B.cam, GROUND - 30);
  if (o.bg === 'castle') for (let x = 140; x < Ly.TW; x += 360) { const sx = x - ((B.cam * 0.5) % Ly.TW); for (const xx of [sx, sx + Ly.TW]) { if (xx < -40 || xx > W + 40) continue; c.globalCompositeOperation = GLOW; circ(xx - 30, 150 + Math.sin(B.t * 13 + x) * 1.5, 18, 'rgba(255,140,60,0.25)'); circ(xx - 30, 150, 5, '#ffd080'); c.globalCompositeOperation = 'source-over'; } }
  if (focusT > 0) { c.globalAlpha = Math.min(0.5, focusT * 4); focusLines(focusX - B.cam, focusY, 0.6); c.globalAlpha = 1; }
  items(B);
  drawParts(B, false);
  const list = [];
  for (const e of B.ents) list.push([e.z, 1, e]);
  for (const p of B.projs) list.push([p.z + 0.2, 2, p]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, x] of list) { if (k === 1) fighter(B, x); else projectile(B, x); }
  effects(B);
  drawParts(B, true);
  ambient(Ly.P, dt);
  for (const tx of B.texts) { const sx = tx.x - B.cam, sy = GROUND + tx.z - tx.y - 14, age = 0.9 - tx.t, pop = age < 0.1 ? 1.5 - age * 5 : 1, big = tx.col === '#ffd040'; c.save(); c.globalAlpha = Math.min(1, tx.t * 3); c.translate(sx, sy); c.scale(pop, pop); txtOut(tx.s + (big && /^\d+$/.test(tx.s) ? '!' : ''), 0, 0, big ? 26 : 19, tx.col === '#ffffff' || tx.col === '#ffe8e0' ? '#ffffff' : tx.col, 'center'); c.restore(); }
  drawSfx(B);
  c.restore();
  c.drawImage(Ly.vig, 0, 0);
  if (B.flash > 0) { c.globalCompositeOperation = GLOW; c.fillStyle = rgba(col(B.flashCol || 'phys', 1), Math.min(0.3, B.flash * 2.2)); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
  if (impactT > 0) { c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.8; focusLines(impactX, impactY, 1, '#ffffff'); c.globalAlpha = 1; }
  if (!o.noHud) hud(B, o);
}
export function drawItemIcon(ctx, k, x, y, s = 1) { const prev = c; c = ctx; c.save(); c.translate(x, y); c.scale(s, s); itemArt(k, 0, 0); c.restore(); c = prev; }
