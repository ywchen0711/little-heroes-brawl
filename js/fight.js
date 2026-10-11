// The brawl itself (pure, no DOM): 2.5D movement, punches and combos, defending, knockdowns, skills, elements,
// weapons lying around, AI, summons, waves, rewards. main.js feeds one input object per player per step.
import { W, ZD, GROUND, HEROES, ENEMIES, STAGES, SURVIVAL_POOL, ITEMS, PICKUPS, COMBOS } from './data.js?v=4';
import { heroStats, enemyStats, skillAt, cpuHeroRec, heroLoadout } from './progress.js?v=4';

const GRAV = 1500, JUMP = 470, FALL_MAX = 70, ZT = 16;
function mkRng(seed) { let s = seed >>> 0 || 9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export const blankInput = () => ({ x: 0, z: 0, A: 0, J: 0, D: 0, pA: 0, pJ: 0, pD: 0, dirs: {}, run: 0, skill: null, item: null });

// ------------------------------------------------------------------ fighters
let NID = 1;
function mkFighter(B, o) {
  const st = o.stats, big = o.def.big;
  const e = {
    id: NID++, team: o.team, kind: o.kind, key: o.key, def: o.def, name: o.def, pi: o.pi ?? -1, ai: o.ai || null, lv: o.lv || 1,
    x: o.x, z: o.z, y: 0, vx: 0, vz: 0, vy: 0, face: o.face || 1, st: 'idle', t: 0, hp: st.mhp, mhp: st.mhp, mp: st.mmp, mmp: st.mmp, stats: st,
    w: big ? 36 : 26, h: big ? 84 : 70, skills: o.skills || [], combo: 0, comboT: 9, fall: 0, inv: 0.8, frozenT: 0, freezeImm: 0, stunT: 0, burnT: 0,
    buffs: {}, hold: o.hold || null, cb: { s: 0, t: 0, dir: null }, dead: false, exp: st.exp || 0, gold: st.gold || 0, boss: !!o.def.boss,
    armor: o.def.armor || 0, life: o.life || 0, summon: o.summon || null, owner: o.owner || null, revived: false, guard: 0, anim: Math.random() * 9, flash: 0,
  };
  B.ents.push(e);
  return e;
}
function heroSkills(rec, heroId) { return heroLoadout(rec, heroId); }
export function addHero(B, heroId, rec, o = {}) {
  return mkFighter(B, { team: o.team ?? 0, kind: 'hero', key: heroId, def: HEROES[heroId], pi: o.pi, ai: o.ai, lv: rec.lv, x: o.x ?? 120, z: o.z ?? ZD / 2,
    face: o.face ?? 1, stats: heroStats(rec, heroId), skills: heroSkills(rec, heroId) });
}
export function addEnemy(B, kind, lv, o = {}) {
  const d = ENEMIES[kind], L = Math.min(5, 1 + Math.floor(lv / 8));
  const e = mkFighter(B, { team: o.team ?? 1, kind: 'enemy', key: kind, def: d, lv, x: o.x, z: o.z ?? B.rnd() * ZD, face: o.face ?? -1, stats: enemyStats(kind, lv),
    skills: d.skills.map((s) => { const x = skillAt(s, L); x.dmg = Math.round(x.dmg * (d.boss ? 0.75 : 0.6)); return x; }), ai: mkAI(B, d.boss ? 0.9 : 0.55 + Math.min(0.35, lv * 0.012)), hold: d.weapon ? { kind: d.weapon, uses: 99 } : null });
  return e;
}
function mkAI(B, skill) { return { skill, think: 0, tgt: null, cd: 1 + B.rnd() * 2, zoff: (B.rnd() - 0.5) * 30, punchT: 0, runT: 0, keepAway: 0 }; }

// ------------------------------------------------------------------ battle setup
// opts: { mode: 'stage'|'survival'|'vs', stage, players: [{ hero, rec }], foes: [{ hero, lv }] (vs), ally: { hero, lv } (vs), inv, quick, seed }
export function newBattle(opts) {
  const B = { mode: opts.mode, t: 0, ents: [], projs: [], fx: [], texts: [], items: [], ev: [], rnd: mkRng(opts.seed || Date.now()), Wd: opts.mode === 'vs' ? 900 : 1300,
    cam: 0, wave: 0, waveT: 1.2, over: null, overT: 0, earned: { exp: opts.players.map(() => 0), gold: 0, kos: 0 }, inv: opts.inv || {}, quick: opts.quick || [], banner: null, dropT: 12, stageLv: 1 };
  B.players = opts.players.map((p, i) => addHero(B, p.hero, p.rec, { pi: i, x: 120 + i * 40, z: ZD / 2 + (i ? 30 : -10) }));
  if (opts.mode === 'practice') {
    B.Wd = 900; B.waveT = 99999; B.inv = Object.fromEntries(Object.keys(ITEMS).map((k) => [k, 99]));
    B.practice = { dmg: 0, best: 0, casts: [0, 0, 0, 0, 0, 0], behave: opts.behave || 'stand', n: opts.dummies || 2, infMp: opts.infMp !== false };
    spawnDummies(B);
  }
  if (opts.mode === 'stage') { B.stage = STAGES[opts.stage]; B.stageLv = B.stage.lv; B.waves = B.stage.waves; }
  if (opts.mode === 'vs') {
    if (opts.ally) addHero(B, opts.ally.hero, cpuHeroRec(opts.ally.hero, opts.ally.lv), { ai: mkAI(B, 0.75), x: 90, z: ZD - 20 });
    opts.foes.forEach((f, i) => addHero(B, f.hero, cpuHeroRec(f.hero, f.lv), { team: 1, ai: mkAI(B, 0.6 + Math.min(0.3, f.lv * 0.012)), x: B.Wd - 120 - i * 50, z: 30 + i * 45 % ZD, face: -1 }));
    B.foeLv = opts.foes.reduce((a, f) => a + f.lv, 0);
    B.waveT = 99999;
  }
  // a few things to pick up (in practice too: picking up and throwing is part of the practice)
  for (let i = 0; i < 3; i++) dropItem(B, ['stone', 'bat', 'crate', 'knife'][Math.floor(B.rnd() * 4)], 200 + B.rnd() * (B.Wd - 300), B.rnd() * ZD, 0);
  return B;
}
function dropItem(B, kind, x, z, y = 0, extra = {}) { B.items.push({ kind, x, z, y, vy: 0, vx: 0, t: 0, ...extra }); }
function spawnWave(B) {
  const list = [];
  if (B.mode === 'stage') {
    for (const [k, n] of B.waves[B.wave]) for (let i = 0; i < n; i++) list.push([k, B.stageLv]);
    B.banner = { txt: B.wave === B.waves.length - 1 ? 'BOSS' : 'WAVE ' + (B.wave + 1), t: 1.6 };
  } else if (B.mode === 'survival') {
    const n = Math.min(7, 2 + Math.floor(B.wave / 2)), lv = 1 + Math.floor(B.wave * 1.3);
    for (let i = 0; i < n; i++) list.push([SURVIVAL_POOL[Math.floor(B.rnd() * Math.min(SURVIVAL_POOL.length, 2 + B.wave))], lv]);
    if ((B.wave + 1) % 5 === 0) { const bosses = ['bruno', 'banditking', 'shadowmaster', 'megabot', 'zarkon']; list.push([bosses[Math.min(4, Math.floor(B.wave / 5) % 5)], lv + 2]); }
    B.banner = { txt: 'WAVE ' + (B.wave + 1), t: 1.6 };
  }
  list.forEach(([k, lv], i) => {
    const side = i % 3 === 2 ? -1 : 1, x = side > 0 ? Math.min(B.Wd - 20, B.cam + W + 40 + i * 30) : Math.max(20, B.cam - 40 - i * 20);
    const e = addEnemy(B, k, lv, { x, face: -side });
    if (e.boss) { B.boss = e; B.ev.push({ t: 'boss' }); }
  });
  B.ev.push({ t: 'sfx', id: 'wave' });
}

// ------------------------------------------------------------------ helpers
const alive = (e) => !e.dead && e.hp > 0;
const enemiesOf = (B, e) => B.ents.filter((o) => o.team !== e.team && alive(o) && o.kind !== 'hawk');
function nearestFoe(B, e, maxD = 1e9) {
  let best = null, bd = maxD;
  for (const o of enemiesOf(B, e)) { const d = Math.abs(o.x - e.x) + Math.abs(o.z - e.z) * 2 + (o.st === 'lie' ? 200 : 0); if (d < bd) { bd = d; best = o; } }
  return best;
}
function sfx(B, id) { B.ev.push({ t: 'sfx', id }); }
function txt(B, e, s, col) { B.texts.push({ x: e.x, z: e.z, y: e.y + e.h + 6, s: String(s), col, t: 0.9 }); }
function fx(B, o) { B.fx.push({ t: 0, ...o }); }
function power(e) { return e.stats.atk * (1 + (e.buffs.power ? e.buffs.power.amt : 0)); }
function canAct(e) { return ['idle', 'walk', 'run', 'defend'].includes(e.st); }
function setSt(e, st) { e.st = st; e.t = 0; }

// ------------------------------------------------------------------ damage
// a = { dmg, fall, knock: bool, elem, kx, ky, unblock, src (entity), fromX, skill }
export function hit(B, tgt, a) {
  if (!alive(tgt) || tgt.inv > 0 || tgt.st === 'lie' || tgt.st === 'rise') return false;
  const src = a.src, fromX = a.fromX ?? (src ? src.x : tgt.x - tgt.face);
  const dir = tgt.x >= fromX ? 1 : -1;
  // a frozen target shatters out of the ice
  const wasFrozen = tgt.frozenT > 0;
  // defending, facing the attacker
  if (tgt.st === 'defend' && !a.unblock && Math.sign(fromX - tgt.x) === tgt.face && !wasFrozen) {
    const d = Math.max(1, Math.round(a.dmg * 0.1 * 100 / (100 + tgt.stats.def)));
    tgt.hp -= d; tgt.guard += a.dmg; tgt.vx = dir * 90; sfx(B, 'block'); fx(B, { k: 'block', x: tgt.x + tgt.face * 10, z: tgt.z, y: tgt.y + 34 });
    if (tgt.guard > 70) { tgt.guard = 0; setSt(tgt, 'hurt'); tgt.hurtDur = 0.6; txt(B, tgt, 'BREAK', '#ffd040'); }
    if (tgt.hp <= 0) tgt.hp = 1;
    return true;
  }
  let dmg = a.dmg * (src ? power(src) : 1) * (0.92 + B.rnd() * 0.16);
  const crit = src && B.rnd() < (src.stats.crit || 0.05); if (crit) dmg *= 1.5;
  dmg *= 100 / (100 + tgt.stats.def);
  if (tgt.buffs.guard) dmg *= 1 - tgt.buffs.guard.amt;
  if (tgt.buffs.armor) dmg *= 1 - tgt.buffs.armor.amt * 0.5;
  dmg = Math.max(1, Math.round(dmg));
  tgt.hp -= dmg; tgt.flash = 0.1;
  B.hitstop = Math.max(B.hitstop || 0, a.skill ? 0.055 : 0.035);                    // a tiny freeze sells the impact
  const who = src && (src.pi >= 0 ? src : src.owner && src.owner.pi >= 0 ? src.owner : null);
  if (who) { who.hits = B.t - (who.lastHitT ?? -9) < 1.1 ? (who.hits || 0) + 1 : 1; who.lastHitT = B.t; if (B.practice) { B.practice.dmg += dmg; B.practice.best = Math.max(B.practice.best, who.hits); } }
  txt(B, tgt, dmg, crit ? '#ffd040' : a.skill ? '#ffffff' : '#ffe8e0');
  fx(B, { k: 'hit', x: tgt.x - dir * 6, z: tgt.z, y: tgt.y + tgt.h * 0.6, elem: a.elem, heavy: !!(a.knock || (a.fall || 0) >= 100), skill: !!a.skill });
  sfx(B, a.skill ? 'hitbig' : 'hit');
  // rewards for the player's side
  if (src && src.team === 0) { const pi = src.pi >= 0 ? src.pi : src.owner?.pi ?? 0; if (B.earned.exp[pi] != null) B.earned.exp[pi] += dmg / 18; }
  tgt.lastHit = src;
  if (tgt.frozenT > 0) { tgt.frozenT = 0; fx(B, { k: 'shatter', x: tgt.x, z: tgt.z, y: tgt.y + 30 }); sfx(B, 'shatter'); }
  // element effects
  const el = a.elem;
  let knock = a.knock;
  if (el === 'ice' && !wasFrozen && tgt.freezeImm <= 0 && tgt.hp > 0 && !tgt.boss) { tgt.frozenT = 1.6; tgt.freezeImm = 3; tgt.vx = tgt.vz = 0; setSt(tgt, 'frozen'); sfx(B, 'freeze'); return true; }
  if (el === 'ice' && tgt.boss && tgt.hp > 0 && !wasFrozen && tgt.freezeImm <= 0) { tgt.freezeImm = 3; tgt.frozenT = 0.6; setSt(tgt, 'frozen'); return true; }
  if (el === 'fire') { tgt.burnT = 1.2; knock = true; }
  if ((el === 'elec' || el === 'smoke' || el === 'nature') && tgt.hp > 0 && !knock) { tgt.stunT = el === 'elec' ? 0.9 : 1.3; if (tgt.boss) tgt.stunT *= 0.4; }
  const air = tgt.y > 2;
  const armor = Math.max(tgt.armor, tgt.buffs.armor ? 0.6 : 0);
  tgt.fall += a.fall ?? 20;
  const fallMax = FALL_MAX * (1 + armor * 2);
  if (tgt.hp <= 0 || knock && !(armor > 0.5 && !a.skill && B.rnd() < 0.5) || tgt.fall >= fallMax || air) {
    knockDown(B, tgt, dir * (a.kx ?? 170), a.ky ?? 280);
  } else if (!(armor > 0 && B.rnd() < armor)) {
    setSt(tgt, 'hurt'); tgt.hurtDur = tgt.team === 0 ? 0.24 : 0.4; tgt.vx = dir * 60; tgt.hold && tgt.hold.heavy && dropHeld(B, tgt);
  }
  if (tgt.hp <= 0) onKO(B, tgt, src);
  return true;
}
function knockDown(B, e, vx, vy) {
  setSt(e, 'fly'); e.vx = vx; e.vy = vy; e.fall = 0; e.stunT = 0; e.frozenT = 0; e.guard = 0;
  if (e.hold) dropHeld(B, e);
}
function onKO(B, e, src) {
  e.hp = 0;
  if (e.koDone) return; e.koDone = true;
  if (e.team !== 0 || e.kind === 'hero') { B.impact = e.boss ? 0.12 : 0.08; B.impactX = e.x; B.impactY = GROUND + e.z - e.y - e.h * 0.5; }
  sfx(B, 'ko');
  if (e.team !== 0 && e.kind !== 'summon' && !e.summon && !B.practice) {
    B.earned.kos++;
    const share = e.exp / Math.max(1, B.players.length);
    B.players.forEach((p, i) => { B.earned.exp[i] += share; });
    // coins and sometimes milk
    const n = Math.max(1, Math.min(6, Math.round(e.gold / 15)));
    for (let i = 0; i < n; i++) dropItem(B, 'coin', e.x + (B.rnd() - 0.5) * 30, Math.max(0, Math.min(ZD, e.z + (B.rnd() - 0.5) * 20)), 30, { vy: 200 + B.rnd() * 150, vx: (B.rnd() - 0.5) * 120, val: Math.ceil(e.gold / n) });
    if (B.rnd() < (e.boss ? 1 : 0.12)) dropItem(B, 'milkbottle', e.x, e.z, 30, { vy: 220 });
  }
}
function dropHeld(B, e) { if (!e.hold) return; if (PICKUPS[e.hold.kind]) dropItem(B, e.hold.kind, e.x, e.z, 20, { vy: 150, vx: e.face * -40, uses: e.hold.uses }); e.hold = null; }

// ------------------------------------------------------------------ melee attacks
function startAttack(B, e, kind) {
  const w = e.hold && PICKUPS[e.hold.kind], wm = w && w.melee ? w : null;
  const reach = 34 + (wm ? wm.reach : 0) + (e.def.big ? 8 : 0);
  let a;
  if (kind === 'punch') {
    e.combo = e.comboT < 0.5 ? (e.combo + 1) % 3 : 0; e.comboT = 0;
    const fin = e.combo === 2;
    a = { dur: fin ? 0.42 : 0.26, on: fin ? 0.12 : 0.07, off: fin ? 0.24 : 0.15, dmg: (fin ? 38 : 22) + (wm ? wm.melee : 0), fall: fin ? 100 : 22, knock: fin, reach, hy: 26, hh: 26, kx: 200, ky: 300 };
    setSt(e, 'punch'); e.pose = fin ? 'fin' : e.combo ? 'p2' : 'p1';
    e.vx = e.face * (fin ? 60 : 20);
  } else if (kind === 'run') {
    a = { dur: 0.42, on: 0.05, off: 0.3, dmg: 36 + (wm ? wm.melee : 0), fall: 100, knock: true, reach: reach + 6, hy: 20, hh: 34, kx: 260, ky: 320 };
    setSt(e, 'runatk'); e.vx = e.face * e.stats.spd * 1.8;
  } else if (kind === 'jump') {
    a = { dur: 9, on: 0.04, off: 0.4, dmg: (e.dashJ ? 38 : 28) + (wm ? wm.melee * 0.6 : 0), fall: e.dashJ ? 100 : 60, knock: e.dashJ, reach: reach - 4, hy: 4, hh: 40, kx: 200, ky: 260 };
    setSt(e, 'jatk');
  }
  if (e.kind === 'enemy' && !e.boss) { a.on += 0.07; a.off += 0.07; if (a.dur < 9) a.dur += 0.07; }   // grunts telegraph their swings
  a.hit = new Set(); e.atk = a; sfx(B, 'swing');
  if (wm) { e.hold.uses--; if (e.hold.uses <= 0) { e.hold = null; sfx(B, 'break'); } }
}
function bodyBox(o) { return { x0: o.x - o.w / 2, x1: o.x + o.w / 2, y0: o.y, y1: o.y + o.h }; }
function meleeHits(B, e) {
  const a = e.atk; if (!a || e.t < a.on || e.t > a.off) return;
  const x0 = e.face > 0 ? e.x + 4 : e.x - 4 - a.reach, x1 = x0 + a.reach + 0;
  for (const o of enemiesOf(B, e)) {
    if (a.hit.has(o) || Math.abs(o.z - e.z) > ZT + (e.def.big ? 6 : 0)) continue;
    const b = bodyBox(o);
    if (b.x1 < x0 || b.x0 > x1 || b.y1 < e.y + a.hy || b.y0 > e.y + a.hy + a.hh) continue;
    a.hit.add(o); hit(B, o, { ...a, src: e, fromX: e.x, skill: false });
  }
}

// ------------------------------------------------------------------ skills
export function castSkill(B, e, slot) {
  const sk = e.skills[slot];
  if (!sk || !canAct(e) || e.y > 0) return false;
  if (e.mp < sk.mp) { if (e.pi >= 0) { txt(B, e, 'MP!', '#6ab0ff'); sfx(B, 'nomp'); } return false; }
  e.mp -= sk.mp; setSt(e, 'cast'); e.sk = sk; e.skDone = 0; e.vx = e.vz = 0; e.atk = null;
  if (e.pi >= 0) { B.ev.push({ t: 'cast', pi: e.pi, slot }); if (B.practice) { B.practice.casts[slot]++; B.practice.last = { slot, t: B.t }; } }
  if (sk.kind === 'dash') { setSt(e, 'dash'); e.atk = { hit: new Set() }; }
  if (sk.kind === 'upper') { setSt(e, 'upper'); e.atk = { hit: new Set() }; e.vy = 420; e.vx = e.face * 80; }
  if (sk.kind === 'flip') { setSt(e, 'flip'); e.vy = 340; e.vx = -e.face * 220; }
  sfx(B, 'cast'); fx(B, { k: 'aura', x: e.x, z: e.z, y: e.y, elem: sk.elem, life: 0.35 });
  return true;
}
function proj(B, e, o) {
  B.projs.push({ team: e.team, src: e, x: e.x + e.face * 22, z: e.z, y: e.y + 32, vx: e.face * (o.spd || 300), vz: 0, vy: 0, r: 10, life: 1.8, hit: new Set(), face: e.face, t: 0, ...o });
}
function skillEffect(B, e, dt) {
  const sk = e.sk, t = e.t;
  const once = (k, at) => { if (t >= at && !(e.skDone & k)) { e.skDone |= k; return true; } return false; };
  const base = { dmg: sk.dmg, elem: sk.elem, skill: true, fall: 100, knock: !['ice', 'elec', 'smoke', 'nature'].includes(sk.elem), src: e };
  switch (sk.kind) {
    case 'ball': if (once(1, 0.2)) {
      const n = sk.n || 1;
      for (let i = 0; i < n; i++) {
        const m = i - (n - 1) / 2;
        proj(B, e, { kind: 'ball', elem: sk.elem, dmg: sk.dmg, spd: sk.spd, vz: sk.spread ? m * 55 : 0, z: e.z + (sk.spread ? 0 : m * 14), homing: sk.homing, pierce: sk.pierce, arrow: sk.arrow, star: sk.star,
          arc: sk.arc, vy: sk.arc ? 300 : 0, y: e.y + (sk.arc ? 40 : 30) + (sk.spread || sk.homing ? 0 : 0), knock: base.knock, r: sk.arc ? 13 : 10, life: sk.homing ? 3 : 2, delayT: sk.homing ? i * 0.12 : 0 });
      }
      sfx(B, sk.arrow ? 'bow' : 'shoot');
    } if (t > 0.45) setSt(e, 'idle'); break;
    case 'column': for (let i = 0; i < sk.n; i++) if (once(1 << i, 0.18 + i * 0.12)) {
      const x = e.x + e.face * (70 + i * 58);
      fx(B, { k: 'column', x, z: e.z, y: 0, elem: sk.elem, life: 0.55 });
      areaHit(B, e, { x, z: e.z, rx: 26, rz: 18, y1: 100 }, { ...base, kx: 60, ky: 380 });
      sfx(B, 'column');
    } if (t > 0.3 + sk.n * 0.12) setSt(e, 'idle'); break;
    case 'strike': if (once(1, 0.15)) {
      const foes = enemiesOf(B, e).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x)).slice(0, sk.n);
      if (!foes.length) foes.push({ x: e.x + e.face * 120, z: e.z });
      foes.forEach((f, i) => B.fx.push({ k: 'bolt', x: f.x, z: f.z, y: 0, t: -0.35 - i * 0.12, life: 0.35, elem: sk.elem, pend: { src: e, a: { ...base, kx: 40, ky: 200 } } }));
    } if (t > 0.6) setSt(e, 'idle'); break;
    case 'nova': if (once(1, 0.25)) {
      fx(B, { k: 'nova', x: e.x, z: e.z, y: e.y, r: sk.r, elem: sk.elem, life: 0.5 });
      areaHit(B, e, { x: e.x, z: e.z, rx: sk.r, rz: sk.r * 0.55, y1: sk.ground ? 8 : 140, ell: true }, { ...base, unblock: true, kx: 220, ky: 300 });
      sfx(B, sk.elem === 'smoke' ? 'poof' : 'boom'); if (sk.ground) B.shake = 0.4; B.flash = 0.14; B.flashCol = sk.elem;
    } if (t > 0.6) setSt(e, 'idle'); break;
    case 'rain': if (once(1, 0.15)) {
      const tg = nearestFoe(B, e) || { x: e.x + e.face * 150, z: e.z };
      for (let i = 0; i < sk.n; i++) {
        const big = sk.big, sc = big || (i === 0 && e.team === 0) ? 0 : 1, x = tg.x + sc * (B.rnd() - 0.5) * 170, z = Math.max(0, Math.min(ZD, tg.z + sc * (B.rnd() - 0.5) * 60));   // the first drop lands right on the target
        B.projs.push({ team: e.team, src: e, kind: 'fall', elem: sk.elem, arrow: sk.arrow, big, x: x - (big ? 120 : 40), z, y: 380 + i * 50, vx: big ? 140 : 40, vz: 0, vy: big ? -380 : -520, r: big ? 60 : 22, dmg: sk.dmg, life: 3, hit: new Set(), t: 0, face: 1 });
      }
      sfx(B, 'cast');
    } if (t > 0.55) setSt(e, 'idle'); break;
    case 'beam': if (once(1, 0.28)) {
      fx(B, { k: 'beam', x: e.x + e.face * 20, z: e.z, y: e.y + 32, face: e.face, len: 560, elem: sk.elem, life: 0.5 });
      const x0 = e.face > 0 ? e.x : e.x - 560;
      areaHit(B, e, { x: x0 + 280, z: e.z, rx: 280, rz: 20, y0: e.y + 10, y1: e.y + 60 }, { ...base, kx: 260, ky: 260 });
      for (const p of B.projs) if (p.team !== e.team && Math.abs(p.z - e.z) < 22 && p.x > x0 && p.x < x0 + 560) p.life = 0;
      sfx(B, 'beam'); B.flash = 0.1; B.flashCol = sk.elem;
    } if (t > 0.75) setSt(e, 'idle'); break;
    case 'wall': if (once(1, 0.2)) {
      B.projs.push({ team: e.team, src: e, kind: 'wall', elem: sk.elem, x: e.x + e.face * 60, z: e.z, y: 0, vx: 0, vz: 0, vy: 0, r: 22, hp: sk.hp, dmg: sk.dmg, life: 7, hit: new Set(), t: 0, face: e.face, wall: true });
      sfx(B, 'freeze');
    } if (t > 0.45) setSt(e, 'idle'); break;
    case 'heal': if (once(1, 0.3)) {
      for (const o of B.ents) if (o.team === e.team && alive(o) && Math.hypot(o.x - e.x, (o.z - e.z) * 2) < sk.r) {
        const h = Math.min(sk.heal, o.mhp - o.hp); o.hp += h; if (h > 0) txt(B, o, '+' + Math.round(h), '#7dff9a');
        if (sk.regen) o.buffs.regen = { amt: sk.heal / 6, t: 6 };
        fx(B, { k: 'heal', x: o.x, z: o.z, y: o.y, life: 0.8 });
      }
      sfx(B, 'heal');
    } if (t > 0.6) setSt(e, 'idle'); break;
    case 'buff': if (once(1, 0.3)) {
      const who = sk.team ? B.ents.filter((o) => o.team === e.team && alive(o)) : [e];
      for (const o of who) { o.buffs[sk.stat] = { amt: sk.amt, t: sk.dur }; fx(B, { k: 'aura', x: o.x, z: o.z, y: o.y, elem: sk.elem, life: 0.8, big: true }); }
      sfx(B, 'buff');
    } if (t > 0.6) setSt(e, 'idle'); break;
    case 'summon': if (once(1, 0.35)) {
      if (sk.summon === 'clone') {
        const rec = { lv: e.lv, skills: {}, equip: {} };
        const c = mkFighter(B, { team: e.team, kind: 'summon', key: e.key, def: e.def, lv: e.lv, x: e.x - e.face * 30, z: Math.min(ZD, e.z + 20), face: e.face,
          stats: { ...e.stats, mhp: Math.round(e.mhp * 0.45) }, skills: e.skills.map((s) => (s && s.kind !== 'summon' ? s : null)), ai: mkAI(B, 0.8), life: sk.dur, summon: 'clone', owner: e });
        c.mp = c.mmp; c.ghost = true; void rec;
      } else {
        const hk = mkFighter(B, { team: e.team, kind: 'hawk', key: 'hawk', def: { zh: '獵鷹', en: 'Hawk' }, lv: e.lv, x: e.x, z: e.z, face: e.face,
          stats: { mhp: 9999, mmp: 0, atk: e.stats.atk, def: 999, spd: 200, crit: 0.05 }, life: sk.dur, summon: 'hawk', owner: e });
        hk.y = 90; hk.w = 20; hk.h = 16; hk.inv = 9999; hk.dmg = 22 * (1 + 0.25 * (sk.lv - 1));
      }
      fx(B, { k: 'poof', x: e.x - e.face * 30, z: e.z, y: 0, life: 0.5 }); sfx(B, 'poof');
    } if (t > 0.6) setSt(e, 'idle'); break;
    case 'tele': if (once(1, 0.12)) {
      const f = nearestFoe(B, e);
      fx(B, { k: 'poof', x: e.x, z: e.z, y: 0, life: 0.4, elem: sk.elem });
      if (f) { e.x = Math.max(10, Math.min(B.Wd - 10, f.x - f.face * 38)); e.z = f.z; e.face = f.x > e.x ? 1 : -1; }
      else e.x = Math.max(10, Math.min(B.Wd - 10, e.x + e.face * 160));
      fx(B, { k: 'poof', x: e.x, z: e.z, y: 0, life: 0.4, elem: sk.elem }); sfx(B, 'tele');
    }
      if (once(2, 0.22)) { e.atk = { dur: 0.3, on: 0, off: 9, dmg: sk.dmg, fall: 100, knock: sk.elem !== 'elec', elem: sk.elem, reach: 46, hy: 10, hh: 50, kx: 220, ky: 300, hit: new Set(), skill: true }; e.pose = 'fin'; }
      if (e.atk && t >= 0.22 && t < 0.34) { e.t -= 0; meleeSkillHits(B, e); }
      if (t > 0.5) { setSt(e, 'idle'); e.atk = null; }
      break;
  }
}
function meleeSkillHits(B, e) {
  const a = e.atk; const x0 = e.face > 0 ? e.x : e.x - a.reach, x1 = x0 + a.reach;
  for (const o of enemiesOf(B, e)) {
    if (a.hit.has(o) || Math.abs(o.z - e.z) > ZT + 4) continue;
    const b = bodyBox(o); if (b.x1 < x0 || b.x0 > x1 || b.y1 < e.y + a.hy || b.y0 > e.y + a.hy + a.hh) continue;
    a.hit.add(o); hit(B, o, { ...a, src: e, fromX: e.x });
  }
}
// area: { x, z, rx, rz, y0, y1, ell }
function areaHit(B, e, ar, a) {
  for (const o of enemiesOf(B, e)) {
    const dx = (o.x - ar.x) / (ar.rx + o.w / 2), dz = (o.z - ar.z) / (ar.rz + 6);
    if (ar.ell ? dx * dx + dz * dz > 1 : Math.abs(dx) > 1 || Math.abs(dz) > 1) continue;
    if (o.y > (ar.y1 ?? 999) || o.y + o.h < (ar.y0 ?? -9)) continue;
    hit(B, o, { ...a, fromX: ar.ell || ar.rx < 40 ? ar.x : e.x });
  }
}

// ------------------------------------------------------------------ items (consumables)
export function useItem(B, e, slot) {
  const id = B.quick[slot]; if (!id || !B.inv[id] || !alive(e) || !canAct(e)) return false;
  const it = ITEMS[id];
  if (it.bomb) {
    B.inv[id]--;
    B.projs.push({ team: e.team, src: e, kind: 'bomb', x: e.x + e.face * 16, z: e.z, y: 40, vx: e.face * 260, vz: 0, vy: 300, r: 10, dmg: it.bomb, life: 3, hit: new Set(), t: 0, face: e.face, arc: true });
    setSt(e, 'throw'); sfx(B, 'swing'); return true;
  }
  if (it.hp && e.hp >= e.mhp && !(it.mp && e.mp < e.mmp)) return false;
  if (!it.hp && it.mp && e.mp >= e.mmp) return false;
  B.inv[id]--;
  if (it.hp) { const h = Math.min(it.hp, e.mhp - e.hp); e.hp += h; txt(B, e, '+' + Math.round(h), '#7dff9a'); }
  if (it.mp) { e.mp = Math.min(e.mmp, e.mp + it.mp); txt(B, e, 'MP+', '#6ab0ff'); }
  setSt(e, 'drink'); sfx(B, 'drink'); fx(B, { k: 'heal', x: e.x, z: e.z, y: 0, life: 0.6 });
  return true;
}

// ------------------------------------------------------------------ AI: fills an input object
function aiInput(B, e, dt) {
  const ai = e.ai, inp = blankInput();
  if (e.passive) {
    ai.think -= dt;
    if (ai.think <= 0 || ai.tx == null) { ai.think = 1.5 + B.rnd() * 2; ai.tx = 220 + B.rnd() * (B.Wd - 340); ai.tz = B.rnd() * ZD; }
    if (Math.abs(ai.tx - e.x) > 12) inp.x = Math.sign(ai.tx - e.x); if (Math.abs(ai.tz - e.z) > 8) inp.z = Math.sign(ai.tz - e.z);
    return inp;
  }
  ai.think -= dt; ai.cd -= dt; ai.punchT -= dt;
  if (ai.think <= 0 || !ai.tgt || !alive(ai.tgt)) { ai.tgt = nearestFoe(B, e); ai.think = 0.3 + B.rnd() * 0.4; ai.zoff = (B.rnd() - 0.5) * 24; ai.keepAway = e.def.ranged && B.rnd() < 0.7 ? 150 + B.rnd() * 80 : 0; }
  const t = ai.tgt; if (!t) return inp;
  const dx = t.x - e.x, dz = t.z + (Math.abs(dx) > 80 ? ai.zoff : 0) - e.z, adx = Math.abs(dx), adz = Math.abs(t.z - e.z);
  // defend against a swing that is coming
  if (canAct(e) && B.rnd() < ai.skill * 0.06) {
    const threat = enemiesOf(B, e).find((o) => Math.abs(o.x - e.x) < 70 && Math.abs(o.z - e.z) < 20 && ['punch', 'runatk', 'jatk', 'dash'].includes(o.st));
    if (threat) { inp.pD = 1; inp.D = 1; e.face = threat.x > e.x ? 1 : -1; return inp; }
  }
  // dodge a ball coming along this line
  if (canAct(e) && B.rnd() < ai.skill * 0.05) {
    const p = B.projs.find((q) => q.team !== e.team && q.kind === 'ball' && Math.abs(q.z - e.z) < 18 && Math.sign(e.x - q.x) === Math.sign(q.vx) && Math.abs(q.x - e.x) < 160);
    if (p) { inp.z = e.z > ZD / 2 ? -1 : 1; inp.pJ = B.rnd() < 0.5 ? 1 : 0; inp.J = inp.pJ; return inp; }
  }
  // skills
  if (ai.cd <= 0 && canAct(e) && e.skills.some(Boolean)) {
    const opts = [];
    e.skills.forEach((s, i) => {
      if (!s || e.mp < s.mp) return;
      const k = s.kind;
      if ((k === 'ball' || k === 'beam' || k === 'flip') && adz < (s.homing ? 60 : 16) && adx > 80) opts.push(i);
      else if ((k === 'dash' || k === 'column') && adz < 14 && adx < 240 && adx > 40) opts.push(i);
      else if ((k === 'nova' || k === 'upper') && adx < 70 && adz < 30) opts.push(i);
      else if (k === 'heal' && e.hp < e.mhp * 0.55) opts.push(i, i);
      else if (k === 'buff' && !e.buffs[s.stat] && adx < 260) opts.push(i);
      else if (k === 'summon' && !B.ents.some((o) => o.owner === e && alive(o))) opts.push(i);
      else if ((k === 'rain' || k === 'strike') && adx < 360) opts.push(i);
      else if ((k === 'tele') && adx > 140) opts.push(i);
      else if (k === 'wall' && adx < 200 && adz < 20) opts.push(i);
    });
    if (opts.length && B.rnd() < 0.4 + ai.skill * 0.5) {
      const i = opts[Math.floor(B.rnd() * opts.length)];
      e.face = dx >= 0 ? 1 : -1; inp.skill = i; ai.cd = (e.boss ? 1.8 : e.kind === 'enemy' ? 4.5 : 2.6) + B.rnd() * (3.5 - ai.skill * 2); return inp;
    }
    ai.cd = 0.6;
  }
  // pick up something on the way
  if (!e.hold && canAct(e) && B.rnd() < 0.02) { const it = B.items.find((q) => PICKUPS[q.kind] && q.y <= 0 && Math.abs(q.x - e.x) < 20 && Math.abs(q.z - e.z) < 12); if (it) { inp.pA = 1; inp.A = 1; return inp; } }
  // take turns: if two friends are already brawling with the target, circle around and wait
  if (!e.boss && e.team !== 0) {
    const busy = B.ents.filter((o) => o !== e && o.team === e.team && alive(o) && o.ai && Math.abs(o.x - t.x) < 60 && Math.abs(o.z - t.z) < 20).length;
    if (busy >= 2 && adx < 150) { inp.x = adx < 110 ? -Math.sign(dx) : 0; inp.z = Math.abs(dz) < 30 ? (e.z > ZD / 2 ? -1 : 1) : 0; return inp; }
  }
  // ranged: keep distance and line up
  if (ai.keepAway && adx < ai.keepAway) { inp.x = dx > 0 ? -1 : 1; inp.z = Math.abs(dz) > 6 ? Math.sign(dz) : 0; return inp; }
  // in reach: punch
  if (adx < 46 + (e.def.big ? 8 : 0) && adz < 12) {
    if (Math.sign(dx) !== e.face && adx > 4) inp.x = Math.sign(dx);
    else if (ai.punchT <= 0) { inp.pA = 1; inp.A = 1; ai.punchT = e.kind === 'enemy' ? (e.boss ? 0.32 + B.rnd() * 0.3 : 0.4 + (1 - ai.skill) * 0.9 + B.rnd() * 0.3) : 0.18 + (1 - ai.skill) * 0.45 + B.rnd() * 0.2; }
    if (t.st === 'lie' || t.st === 'fly') { inp.x = 0; inp.pA = 0; }
    return inp;
  }
  // approach
  if (t.st === 'lie' && adx < 90) { inp.z = Math.sign(dz) || 1; return inp; }
  if (adx > 40) inp.x = Math.sign(dx);
  if (Math.abs(dz) > 5) inp.z = Math.sign(dz);
  if (adx > 260 && B.rnd() < 0.5) inp.run = 1;
  if (e.st === 'run' && adx < 120 && adz < 12 && B.rnd() < 0.3) { inp.pA = 1; inp.A = 1; }
  if (B.rnd() < 0.004 * ai.skill && adx < 150 && adz < 14) { inp.pJ = 1; inp.J = 1; }
  return inp;
}
function hawkStep(B, e, dt) {
  e.t += dt; e.anim += dt;
  const f = nearestFoe(B, e);
  if (!f) { e.x += (e.owner.x - e.x) * dt * 2; e.z += (e.owner.z - e.z) * dt * 2; e.y = 90; return; }
  e.dive = (e.dive || 0) - dt;
  if (e.dive <= 0 && !e.diving) { e.diving = true; e.tx = f.x; e.tz = f.z; e.hitDone = false; }
  if (e.diving) {
    e.x += (e.tx - e.x) * dt * 6; e.z += (e.tz - e.z) * dt * 6; e.y += (20 - e.y) * dt * 6; e.face = e.tx > e.x ? 1 : -1;
    if (!e.hitDone && e.y < 30) for (const o of enemiesOf(B, e)) if (Math.abs(o.x - e.x) < 24 && Math.abs(o.z - e.z) < 16) { e.hitDone = true; hit(B, o, { dmg: e.dmg, fall: 35, src: e.owner, fromX: e.x, skill: true, elem: 'phys' }); break; }
    if (e.y < 24) { e.diving = false; e.dive = 1.1; }
  } else { e.y += (90 - e.y) * dt * 3; e.x += (f.x - 60 * e.face - e.x) * dt * 1.5; e.z += (f.z - e.z) * dt * 1.5; }
}

// ------------------------------------------------------------------ one fighter step
function step(B, e, dt, inp) {
  e.t += dt; e.anim += dt; e.comboT += dt;
  if (inp) { if (inp.pA) e.bufA = 0.2; if (inp.pJ) e.bufJ = 0.12; }
  if (e.bufA > 0) e.bufA -= dt; if (e.bufJ > 0) e.bufJ -= dt;
  if (e.inv > 0) e.inv -= dt; if (e.flash > 0) e.flash -= dt; if (e.freezeImm > 0) e.freezeImm -= dt;
  e.fall = Math.max(0, e.fall - 40 * dt); e.guard = Math.max(0, e.guard - 25 * dt);
  for (const k in e.buffs) { const b = e.buffs[k]; b.t -= dt; if (k === 'regen' && alive(e)) e.hp = Math.min(e.mhp, e.hp + b.amt * dt); if (b.t <= 0) delete e.buffs[k]; }
  if (alive(e)) e.mp = Math.min(e.mmp, e.mp + (7 + (e.hp < e.mhp / 3 ? 6 : 0)) * (1 + (e.stats.mpRegen || 0)) * dt);
  if (e.burnT > 0) e.burnT -= dt;
  if (e.life) { e.life -= dt; if (e.life <= 0 && !e.dead) { e.dead = true; e.gone = true; fx(B, { k: 'poof', x: e.x, z: e.z, y: e.y, life: 0.5 }); return; } }
  const grounded = e.y <= 0 && e.vy <= 0;
  const spd = e.stats.spd * (e.buffs.power ? 1.2 : 1) * (e.hold && PICKUPS[e.hold.kind]?.heavy ? 0.8 : 1);
  // combo input (D, direction, A/J)
  if (inp && e.pi >= 0) {
    const cb = e.cb; cb.t += dt; if (cb.t > 0.5) cb.s = 0;
    if (inp.pD) { cb.s = 1; cb.t = 0; cb.dir = null; }
    else if (cb.s === 1) { const d = inp.dirs; const dir = d.r ? '>r' : d.l ? '>l' : d.u ? '^' : d.d ? 'v' : null; if (dir) { cb.s = 2; cb.dir = dir; cb.t = 0; } }
    else if (cb.s === 2 && (inp.pA || inp.pJ)) {
      const code = 'D' + cb.dir[0] + (inp.pA ? 'A' : 'J'), slot = COMBOS.indexOf(code);
      if (cb.dir === '>r') e.face = 1; if (cb.dir === '>l') e.face = -1;
      cb.s = 0;
      if (slot >= 0 && e.skills[slot] && (canAct(e) || e.st === 'punch' && e.t > 0.12)) { if (e.st === 'punch') setSt(e, 'idle'); if (castSkill(B, e, slot)) { inp.pA = inp.pJ = 0; } }
    }
  }
  // status
  if (e.dead) { physics(B, e, dt, true); return; }
  if (e.hp <= 0 && !['fly', 'lie'].includes(e.st)) { e.frozenT = 0; e.stunT = 0; knockDown(B, e, 0, 220); onKO(B, e, e.lastHit); }
  if (e.frozenT > 0) { e.frozenT -= dt; e.vx = 0; e.vz = 0; physics(B, e, dt); if (e.frozenT <= 0) setSt(e, 'idle'); return; }
  if (e.stunT > 0 && grounded && !['fly', 'lie', 'rise'].includes(e.st)) { e.stunT -= dt; if (e.st !== 'stun') setSt(e, 'stun'); e.vx *= 0.8; e.vz = 0; physics(B, e, dt); if (e.stunT <= 0) setSt(e, 'idle'); return; }
  switch (e.st) {
    case 'hurt': e.vx *= Math.pow(0.02, dt); if (e.t > (e.hurtDur || 0.3)) setSt(e, 'idle'); physics(B, e, dt); return;
    case 'stun': setSt(e, 'idle'); break;
    case 'frozen': setSt(e, 'idle'); break;
    case 'fly': physics(B, e, dt); if (e.y <= 0 && e.t > 0.05) { e.y = 0; e.vy = 0; setSt(e, 'lie'); e.vx *= 0.3; B.shake = Math.max(B.shake || 0, e.def.big ? 0.15 : 0.05); sfx(B, 'thud'); fx(B, { k: 'land', x: e.x, z: e.z, y: 0, life: 0.4 }); } return;
    case 'lie':
      e.vx *= Math.pow(0.01, dt); physics(B, e, dt);
      if (e.hp <= 0 && B.practice) { if (e.t > 0.9) { e.hp = e.mhp; e.koDone = false; setSt(e, 'rise'); } return; }
      if (e.hp <= 0) {
        if (e.stats.revive && !e.revived && e.t > 1.4) { e.revived = true; e.hp = Math.round(e.mhp * e.stats.revive); setSt(e, 'rise'); fx(B, { k: 'heal', x: e.x, z: e.z, y: 0, life: 1 }); txt(B, e, 'REVIVE', '#ffd040'); sfx(B, 'heal'); return; }
        if (e.t > 1.2 && (e.team !== 0 || e.kind !== 'hero')) { e.dead = true; } return;
      }
      if (e.t > 0.75) setSt(e, 'rise'); return;
    case 'rise': if (e.t > 0.3) { setSt(e, 'idle'); e.inv = 0.6; } physics(B, e, dt); return;
    case 'cast': skillEffect(B, e, dt); physics(B, e, dt); return;
    case 'dash': {
      const sk = e.sk; e.vx = e.face * sk.spd; e.vz = inp ? inp.z * spd * 0.3 : 0;
      for (const o of enemiesOf(B, e)) if (!e.atk.hit.has(o) && Math.abs(o.z - e.z) < ZT + 4 && Math.abs(o.x - (e.x + e.face * 14)) < 30 + o.w / 2 && o.y < 60) { e.atk.hit.add(o); hit(B, o, { dmg: sk.dmg, elem: sk.elem, fall: 100, knock: true, src: e, skill: true, kx: e.face * 0 + 230, ky: 300, fromX: e.x - e.face * 10 }); }
      if (B.t % 0.06 < dt) fx(B, { k: 'trail', x: e.x, z: e.z, y: e.y, elem: sk.elem, life: 0.3 });
      physics(B, e, dt); if (e.t > sk.dur) { setSt(e, 'idle'); e.vx *= 0.3; } return;
    }
    case 'upper': {
      const sk = e.sk;
      for (const o of enemiesOf(B, e)) if (!e.atk.hit.has(o) && Math.abs(o.z - e.z) < ZT + 4 && Math.abs(o.x - (e.x + e.face * 18)) < 26 + o.w / 2 && o.y < e.y + 70) { e.atk.hit.add(o); hit(B, o, { dmg: sk.dmg, elem: sk.elem, fall: 100, knock: true, src: e, skill: true, kx: 80, ky: 520, fromX: e.x }); }
      if (e.t < 0.3) fx(B, { k: 'trail', x: e.x, z: e.z, y: e.y, elem: sk.elem, life: 0.25 });
      physics(B, e, dt); if (e.y <= 0 && e.t > 0.15) { setSt(e, 'idle'); e.vx = 0; } return;
    }
    case 'flip': {
      const sk = e.sk;
      if (e.t > 0.22 && !e.skDone) { e.skDone = 1; proj(B, e, { kind: 'ball', elem: sk.elem, dmg: sk.dmg, spd: sk.spd, arrow: true, y: e.y + 30, knock: true }); sfx(B, 'bow'); }
      physics(B, e, dt); if (e.y <= 0 && e.t > 0.15) { setSt(e, 'idle'); e.vx = 0; } return;
    }
    case 'punch': case 'runatk':
      meleeHits(B, e); e.vx *= Math.pow(e.st === 'runatk' ? 0.08 : 0.001, dt);
      if (e.t > e.atk.dur) { setSt(e, 'idle'); e.atk = null; }
      physics(B, e, dt); return;
    case 'jatk': meleeHits(B, e); physics(B, e, dt); if (e.y <= 0 && e.t > 0.05) { setSt(e, 'idle'); e.vx = 0; e.atk = null; } return;
    case 'throw': case 'drink': case 'pick': e.vx = 0; e.vz = 0; physics(B, e, dt); if (e.t > (e.st === 'drink' ? 0.5 : 0.25)) setSt(e, 'idle'); return;
    case 'jump':
      if (inp) {
        if (inp.x && !e.dashJ) { e.vx += (inp.x * spd - e.vx) * Math.min(1, dt * 3); }
        if (inp.pA) { if (e.hold && (PICKUPS[e.hold.kind].heavy || e.hold.kind === 'knife')) throwHeld(B, e); else startAttack(B, e, 'jump'); }
      }
      physics(B, e, dt); if (e.y <= 0 && e.t > 0.05) { setSt(e, 'idle'); e.vx = 0; e.vz = 0; e.dashJ = false; } return;
  }
  // ---- controllable: idle / walk / run / defend
  if (!inp) inp = blankInput();
  if (e.bufA > 0 && !inp.pA) { inp = { ...inp, pA: 1 }; } if (e.bufJ > 0 && !inp.pJ) { inp = { ...inp, pJ: 1 }; }
  if (inp.pA) e.bufA = 0; if (inp.pJ) e.bufJ = 0;
  if (inp.skill != null) { castSkill(B, e, inp.skill); if (e.st !== 'idle' && e.st !== 'walk' && e.st !== 'run' && e.st !== 'defend') { physics(B, e, dt); return; } }
  if (inp.item != null && e.pi >= 0) { if (useItem(B, e, inp.item)) { physics(B, e, dt); return; } }
  if (e.st === 'defend') { e.vx *= Math.pow(0.01, dt); e.vz = 0; if (e.t > 0.32 && !inp.D) setSt(e, 'idle'); physics(B, e, dt); if (!inp.pA && !inp.pJ) return; }
  if (inp.pD && e.st !== 'defend') { setSt(e, 'defend'); e.vx = 0; e.vz = 0; physics(B, e, dt); return; }
  if (inp.pJ) {
    const running = e.st === 'run';
    setSt(e, 'jump'); e.vy = JUMP * e.stats.jump; e.dashJ = running;
    e.vx = running ? e.face * spd * 2.6 : inp.x * spd; e.vz = inp.z * spd * (running ? 0.4 : 0.55);
    sfx(B, 'jump'); physics(B, e, dt); return;
  }
  if (inp.pA) {
    const it = !e.hold && B.items.find((q) => q.y <= 0 && Math.abs(q.x - e.x) < 22 && Math.abs(q.z - e.z) < 14 && q.kind !== 'coin');
    if (it) { pickUp(B, e, it); physics(B, e, dt); return; }
    if (e.hold && (PICKUPS[e.hold.kind]?.heavy || (e.st === 'run' && e.hold.kind === 'knife'))) { throwHeld(B, e); physics(B, e, dt); return; }
    startAttack(B, e, e.st === 'run' ? 'run' : 'punch'); physics(B, e, dt); return;
  }
  // movement
  if (e.st === 'run') {
    if (inp.x === e.face || (inp.run && inp.x === e.face)) { e.vx = e.face * spd * 2.1; e.vz = inp.z * spd * 0.35; }
    else { setSt(e, 'idle'); e.vx = 0; }
  } else if (inp.x || inp.z) {
    if (inp.x) e.face = inp.x;
    if (inp.run && inp.x) { setSt(e, 'run'); e.vx = e.face * spd * 2.1; }
    else { if (e.st !== 'walk') setSt(e, 'walk'); e.vx = inp.x * spd; e.vz = inp.z * spd * 0.62; }
  } else { if (e.st !== 'idle') setSt(e, 'idle'); e.vx = 0; e.vz = 0; }
  physics(B, e, dt);
}
function pickUp(B, e, it) {
  B.items.splice(B.items.indexOf(it), 1);
  if (it.kind === 'milkbottle') { const h = Math.min(PICKUPS.milkbottle.heal, e.mhp - e.hp); e.hp += h; txt(B, e, '+' + h, '#7dff9a'); setSt(e, 'drink'); sfx(B, 'drink'); return; }
  e.hold = { kind: it.kind, uses: it.uses ?? PICKUPS[it.kind].uses ?? 1 }; setSt(e, 'pick'); sfx(B, 'pick');
}
function throwHeld(B, e) {
  const w = PICKUPS[e.hold.kind];
  B.projs.push({ team: e.team, src: e, kind: 'thrown', item: e.hold.kind, uses: e.hold.uses, x: e.x + e.face * 16, z: e.z, y: e.y + 40, vx: e.face * (w.heavy ? 330 : 460), vz: 0, vy: w.heavy ? 160 : 60, r: w.heavy ? 14 : 9, dmg: w.throwDmg || 30, life: 3, hit: new Set(), t: 0, face: e.face, arc: true, knock: true });
  e.hold = null; setSt(e, 'throw'); sfx(B, 'swing');
}
function physics(B, e, dt, deadOnly) {
  if (e.y > 0 || e.vy > 0) { e.vy -= GRAV * dt; }
  e.x += e.vx * dt; e.z += e.vz * dt; e.y += e.vy * dt;
  if (e.y < 0) { e.y = 0; if (e.vy < 0) e.vy = 0; }
  e.x = Math.max(12, Math.min(B.Wd - 12, e.x)); e.z = Math.max(0, Math.min(ZD, e.z));
  void deadOnly;
}

// ------------------------------------------------------------------ projectiles, items, fx
function stepProjs(B, dt) {
  for (const p of B.projs) {
    p.t += dt; p.life -= dt;
    if (p.delayT > 0) { p.delayT -= dt; p.x = p.src.x + p.face * 20; p.z = p.src.z; continue; }
    if (p.homing) {
      const tg = nearestFoe(B, p.src || { team: p.team, x: p.x, z: p.z });
      if (tg) { const a = Math.atan2(tg.z - p.z, tg.x - p.x), sp = Math.hypot(p.vx, p.vz) || 300; const cur = Math.atan2(p.vz, p.vx); let d = a - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; const na = cur + Math.max(-4 * dt, Math.min(4 * dt, d)); p.vx = Math.cos(na) * sp; p.vz = Math.sin(na) * sp; p.face = p.vx >= 0 ? 1 : -1; p.y += (32 - p.y) * dt * 2; }
    }
    if (p.arc || p.kind === 'fall') p.vy -= (p.kind === 'fall' ? 300 : GRAV * 0.9) * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.z < -10 || p.z > ZD + 10) p.life = 0;
    // landing
    if (p.y <= 0 && (p.arc || p.kind === 'fall')) {
      if (p.kind === 'fall') { areaHit(B, p.src, { x: p.x, z: p.z, rx: p.r, rz: p.r * 0.5, y1: 80, ell: true }, { dmg: p.dmg, elem: p.elem, skill: true, fall: 100, knock: !['ice', 'elec'].includes(p.elem), src: p.src, unblock: true, kx: 160, ky: 300 }); fx(B, { k: 'nova', x: p.x, z: p.z, y: 0, r: p.r, elem: p.elem, life: 0.4 }); sfx(B, p.big ? 'boom' : 'hitbig'); if (p.big) B.shake = 0.5; }
      if (p.kind === 'bomb') { areaHit(B, p.src, { x: p.x, z: p.z, rx: 70, rz: 40, y1: 100, ell: true }, { dmg: p.dmg, elem: 'fire', fall: 100, knock: true, src: p.src, unblock: true, skill: true }); fx(B, { k: 'nova', x: p.x, z: p.z, y: 0, r: 70, elem: 'fire', life: 0.5 }); sfx(B, 'boom'); B.shake = 0.3; }
      if (p.kind === 'thrown') { const w = PICKUPS[p.item]; if (w.breaks) { fx(B, { k: 'poof', x: p.x, z: p.z, y: 0, life: 0.4 }); sfx(B, 'break'); } else dropItem(B, p.item, p.x, p.z, 0, { uses: p.uses }); }
      if (p.kind === 'ball') fx(B, { k: 'hit', x: p.x, z: p.z, y: 4, elem: p.elem });
      p.life = 0; continue;
    }
    if (p.kind === 'fall' || p.kind === 'bomb') continue;
    if (p.x < -40 || p.x > B.Wd + 40) { p.life = 0; continue; }
    // walls stop enemy projectiles; balls cancel each other
    if (p.life > 0 && (p.kind === 'ball' || p.kind === 'thrown')) for (const q of B.projs) {
      if (q === p || q.team === p.team || q.life <= 0 || Math.abs(q.z - p.z) > 18 || Math.abs(q.x - p.x) > p.r + q.r || Math.abs(q.y - p.y) > 40) continue;
      if (q.wall) { q.hp -= p.dmg; p.life = 0; fx(B, { k: 'hit', x: p.x, z: p.z, y: p.y, elem: q.elem }); if (q.hp <= 0) { q.life = 0; fx(B, { k: 'shatter', x: q.x, z: q.z, y: 30 }); } sfx(B, 'block'); break; }
      if (q.kind === 'ball' && !p.pierce && !q.pierce) { p.life = 0; q.life = 0; fx(B, { k: 'hit', x: (p.x + q.x) / 2, z: p.z, y: p.y, elem: p.elem }); sfx(B, 'hit'); break; }
    }
    if (p.life <= 0) continue;
    // hitting fighters
    for (const o of B.ents) {
      if (o.team === p.team || !alive(o) || o.kind === 'hawk' || p.hit.has(o) || Math.abs(o.z - p.z) > 16 + (p.wall ? 8 : 0)) continue;
      const b = bodyBox(o);
      if (p.x + p.r < b.x0 || p.x - p.r > b.x1 || (!p.wall && (p.y + p.r < b.y0 || p.y - p.r > b.y1))) continue;
      if (p.wall) { p.hit.add(o); hit(B, o, { dmg: p.dmg, elem: p.elem, skill: true, fall: 40, src: p.src, fromX: p.x }); continue; }
      p.hit.add(o);
      hit(B, o, { dmg: p.dmg, elem: p.elem, skill: p.kind !== 'thrown', fall: p.kind === 'thrown' ? 100 : 70, knock: p.knock, src: p.src, fromX: p.x - p.vx * 0.01, kx: 180, ky: 260 });
      if (!p.pierce) { p.life = 0; if (p.kind === 'thrown' && !PICKUPS[p.item].breaks) dropItem(B, p.item, p.x, p.z, 20, { vy: 120, uses: p.uses }); break; }
    }
  }
  B.projs = B.projs.filter((p) => p.life > 0);
}
function stepItems(B, dt) {
  for (const it of B.items) {
    it.t += dt;
    if (it.y > 0 || it.vy > 0) { it.vy -= GRAV * dt; it.y += it.vy * dt; it.x += (it.vx || 0) * dt; if (it.y <= 0) { it.y = 0; it.vy = 0; it.vx = 0; } }
    if (it.kind === 'coin' && it.y <= 0) for (const p of B.ents) if (p.team === 0 && p.kind === 'hero' && alive(p) && Math.abs(p.x - it.x) < 26 && Math.abs(p.z - it.z) < 18) { B.earned.gold += it.val; it.got = true; txt(B, p, '+' + it.val + 'G', '#ffd040'); sfx(B, 'coin'); break; }
    if (it.kind === 'coin' && it.t > 12) it.got = true;
  }
  B.items = B.items.filter((i) => !i.got);
  // things falling from the sky now and then
  B.dropT -= dt;
  if (B.dropT <= 0) { B.dropT = 14 + B.rnd() * 10; if (B.items.filter((i) => i.kind !== 'coin').length < 5) dropItem(B, ['stone', 'bat', 'milkbottle', 'knife', 'crate', 'milkbottle'][Math.floor(B.rnd() * 6)], B.cam + 100 + B.rnd() * (W - 200), B.rnd() * ZD, 400); }
}
function stepFx(B, dt) {
  for (const f of B.fx) {
    f.t += dt;
    if (f.pend && f.t >= 0 && !f.fired) {
      f.fired = true; const p = f.pend; areaHit(B, p.src, { x: f.x, z: f.z, rx: 30, rz: 18, y1: 120, ell: true }, { ...p.a, unblock: true, fromX: f.x }); sfx(B, 'thunder');
    }
  }
  B.fx = B.fx.filter((f) => f.t < (f.life || 0.3));
  for (const t of B.texts) { t.t -= dt; t.y += 30 * dt; }
  B.texts = B.texts.filter((t) => t.t > 0);
}

// ------------------------------------------------------------------ the battle step
// inputs: array indexed by player index (pi)
export function update(B, dt, inputs) {
  if (B.flash > 0) B.flash -= dt;
  if (B.hitstop > 0) { B.hitstop -= dt; return; }
  B.t += dt; if (B.shake > 0) B.shake -= dt;
  if (B.banner) { B.banner.t -= dt; if (B.banner.t <= 0) B.banner = null; }
  for (const e of [...B.ents]) {
    if (e.gone) continue;
    if (e.kind === 'hawk') { e.life -= dt; if (e.life <= 0) { e.dead = true; e.gone = true; fx(B, { k: 'poof', x: e.x, z: e.z, y: e.y, life: 0.4 }); } else hawkStep(B, e, dt); continue; }
    let inp = null;
    if (e.pi >= 0) inp = inputs[e.pi] || blankInput();
    else if (e.ai && alive(e)) inp = aiInput(B, e, dt);
    step(B, e, dt, inp);
  }
  B.ents = B.ents.filter((e) => !(e.gone || (e.dead && e.team !== 0 && e.t > 1.6) || (e.dead && e.kind === 'summon')));
  stepProjs(B, dt); stepItems(B, dt); stepFx(B, dt);
  // camera
  const ps = B.players.filter(alive); const focus = ps.length ? ps : B.players;
  const cx = focus.reduce((a, p) => a + p.x, 0) / focus.length - W / 2;
  B.cam += (Math.max(0, Math.min(B.Wd - W, cx)) - B.cam) * Math.min(1, dt * 4);
  // waves and the end
  if (B.over) { B.overT += dt; return; }
  if (B.practice) { if (B.practice.infMp) for (const p of B.players) p.mp = p.mmp; return; }
  const foes = B.ents.filter((e) => e.team !== 0 && !e.dead && e.kind !== 'hawk' && !e.summon);
  if (B.mode !== 'vs' && !foes.length) {
    const last = B.mode === 'stage' && B.wave >= B.waves.length;
    if (last) { finish(B, true); return; }
    B.waveT -= dt;
    if (B.waveT <= 0) {
      if (B.mode === 'survival' && B.wave > 0) { B.earned.gold += 20 + B.wave * 10; B.players.forEach((p, i) => { B.earned.exp[i] += 30 + B.wave * 15; }); }
      if (B.wave > 0) for (const p of B.players) if (alive(p)) {   // a breather between waves
        const h = Math.round(p.mhp * 0.25); p.hp = Math.min(p.mhp, p.hp + h); p.mp = Math.min(p.mmp, p.mp + p.mmp * 0.5);
        txt(B, p, '+' + h, '#7dff9a'); fx(B, { k: 'heal', x: p.x, z: p.z, y: 0, life: 0.8 });
      }
      spawnWave(B); B.wave++; B.waveT = 1.4;
    }
  }
  if (B.mode === 'vs' && !foes.length) { finish(B, true); return; }
  if (B.players.every((p) => p.hp <= 0 && (p.st === 'lie' && p.t > 1.3 && (!p.stats.revive || p.revived)))) finish(B, false);
}
function finish(B, win) {
  B.over = { win };
  if (B.mode === 'stage' && win) { B.earned.gold += B.stage.reward.gold; B.players.forEach((p, i) => { B.earned.exp[i] += B.stage.reward.exp; }); }
  if (B.mode === 'vs') { const k = win ? 1 : 0.4; B.earned.gold += Math.round(B.foeLv * 22 * k); B.players.forEach((p, i) => { B.earned.exp[i] += Math.round(B.foeLv * 40 * k); }); }
  if (B.mode === 'survival') B.over.waves = Math.max(0, B.wave - 1);
  B.earned.exp = B.earned.exp.map((x) => Math.round(x)); B.earned.gold = Math.round(B.earned.gold);
  B.ev.push({ t: win ? 'win' : 'lose' });
}
export const result = (B) => ({ win: !!(B.over && B.over.win), exp: B.earned.exp, gold: B.earned.gold, kos: B.earned.kos, waves: B.over?.waves || 0 });
// a computer-controlled input for a player's fighter (tests, the title demo)
export function botInput(B, e, dt, skill = 0.9) {
  const keep = e.ai; e.ai = e.bot || (e.bot = mkAI(B, skill));
  const inp = aiInput(B, e, dt); e.ai = keep; return inp;
}

// ------------------------------------------------------------------ practice mode
function spawnDummies(B) {
  const P = B.practice, lv = B.players[0]?.lv || 1;
  B.ents = B.ents.filter((e) => e.key !== 'dummy');
  for (let i = 0; i < P.n; i++) {
    const d = addEnemy(B, 'dummy', lv, { x: 330 + i * 90, z: ZD * (0.3 + 0.4 * ((i % 2) ? 1 : 0)) + (i > 1 ? 20 : 0), face: -1 });
    d.inv = 0;
    if (P.behave === 'stand') d.ai = null;
    else if (P.behave === 'walk') { d.passive = true; d.ai = mkAI(B, 0.2); }
    else d.ai = mkAI(B, 0.3);
  }
}
// change the practice settings (behave: 'stand' | 'walk' | 'fight', n dummies, infinite MP) and reset the arena
export function setPractice(B, o = {}) {
  Object.assign(B.practice, o);
  B.projs = []; B.fx = []; B.texts = [];
  for (const p of B.players) { p.hp = p.mhp; p.mp = p.mmp; p.st = 'idle'; p.t = 0; p.x = 120 + p.pi * 40; p.z = ZD / 2; p.vx = p.vz = p.vy = 0; p.y = 0; p.frozenT = 0; p.stunT = 0; }
  spawnDummies(B);
}
