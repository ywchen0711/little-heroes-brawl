// The player's profile: hero levels, EXP, skill points, learned skills, gold, equipment, items. Pure, saved as JSON.
import { HEROES, HERO_IDS, OLD_HEROES, ENEMIES, GEAR, ITEMS, SLOTS, LEVEL_EXP, MAX_LV, SKILL_LV_REQ, SKILL_MAX } from './data.js?v=3';

export function newHeroRec() { return { lv: 1, exp: 0, sp: 0, skills: { 0: 1 }, equip: { glove: null, wear: null, shoes: null, charm: null } }; }
export function newProfile() {
  const heroes = {}; for (const id of HERO_IDS) heroes[id] = newHeroRec();
  return { v: 1, gold: 150, inv: { milk: 3, juice: 2 }, gear: {}, quick: ['milk', 'juice', null], heroes, cleared: 0, best: 0, kos: 0, battles: 0, wins: 0 };
}
const spUpTo = (lv) => { let n = 0; for (let l = 2; l <= lv; l++) n += l % 5 === 0 ? 2 : 1; return n; };
export function fixProfile(p) {
  const d = newProfile();
  // saves from the 8-hero version: the best old hero becomes the new one (skills are refunded as skill points)
  p.heroes ||= {};
  for (const [old, nw] of Object.entries(OLD_HEROES)) {
    const r = p.heroes[old]; if (!r) continue;
    const cur = p.heroes[nw];
    if (!cur || (cur.migrated && r.lv > cur.lv)) p.heroes[nw] = { lv: r.lv, exp: r.exp || 0, sp: spUpTo(r.lv), skills: { 0: 1 }, equip: { ...d.heroes[nw].equip, ...(r.equip || {}) }, migrated: true };
  }
  for (const old of Object.keys(OLD_HEROES)) delete p.heroes[old];
  for (const k of Object.keys(d)) if (p[k] === undefined) p[k] = d[k];
  for (const id of HERO_IDS) { p.heroes[id] ||= newHeroRec(); p.heroes[id].equip ||= d.heroes[id].equip; p.heroes[id].skills ||= { 0: 1 }; }
  return p;
}

// ------------------------------------------------------------------ stats
export function gearOf(rec) { return SLOTS.map((s) => rec.equip[s] && GEAR[rec.equip[s]]).filter(Boolean); }
export function heroStats(rec, heroId) {
  const h = HEROES[heroId], g = gearOf(rec), sum = (k) => g.reduce((a, x) => a + (x[k] || 0), 0), lv = rec.lv;
  return {
    mhp: Math.round(h.hp * 1.25 + 30 * (lv - 1) + sum('hp')), mmp: Math.round(h.mp + 6 * (lv - 1) + sum('mp')),
    atk: h.atk * (1 + 0.04 * (lv - 1) + sum('atk') / 100), def: h.def + lv * 0.6 + sum('def'),
    spd: h.spd * (1 + sum('spd') / 100), jump: 1 + sum('jump'), mpRegen: sum('mpRegen'), crit: 0.05 + sum('crit'),
    goldUp: sum('goldUp'), expUp: sum('expUp'), revive: sum('revive'),
  };
}
export function enemyStats(kind, lv) {
  const b = ENEMIES[kind];
  return { mhp: Math.round(b.hp * (b.boss ? 0.85 : 0.75) * (1 + (b.boss ? 0.03 : 0.05) * (lv - 1))), mmp: b.mp + 6 * lv, atk: b.atk * (1 + 0.025 * (lv - 1)), def: b.def + lv * 0.5, spd: b.spd, jump: 1, mpRegen: 0, crit: 0.03, revive: 0,
    exp: Math.round(b.exp * (1 + 0.2 * (lv - 1))), gold: Math.round(b.gold * (1 + 0.14 * (lv - 1))) };
}
// a CPU hero at a level knows the skills it could have learned
export function cpuHeroRec(heroId, lv) {
  const rec = newHeroRec(); rec.lv = lv;
  SKILL_LV_REQ.forEach((req, i) => { if (lv >= req) rec.skills[i] = Math.min(SKILL_MAX, 1 + Math.floor((lv - req) / 4)); });
  return rec;
}

// ------------------------------------------------------------------ experience and skills
export const expToNext = (rec) => LEVEL_EXP(rec.lv);
export function gainExp(rec, n) {
  const ups = [];
  if (rec.lv >= MAX_LV) return ups;
  rec.exp += Math.round(n);
  while (rec.lv < MAX_LV && rec.exp >= expToNext(rec)) { rec.exp -= expToNext(rec); rec.lv++; rec.sp += rec.lv % 5 === 0 ? 2 : 1; ups.push(rec.lv); }
  if (rec.lv >= MAX_LV) rec.exp = 0;
  return ups;
}
// learning a skill costs 1 SP; raising it to level L needs hero level req + 3 (L - 1) and costs 1 SP
export function skillNeed(i, toLv) { return SKILL_LV_REQ[i] + 3 * (toLv - 1); }
export function canRaise(rec, i) {
  const cur = rec.skills[i] || 0;
  if (cur >= SKILL_MAX) return { ok: false, why: 'max' };
  if (rec.sp < 1) return { ok: false, why: 'sp' };
  if (rec.lv < skillNeed(i, cur + 1)) return { ok: false, why: 'lv', need: skillNeed(i, cur + 1) };
  return { ok: true };
}
export function raiseSkill(rec, i) { if (!canRaise(rec, i).ok) return false; rec.skills[i] = (rec.skills[i] || 0) + 1; rec.sp--; return true; }
// a skill's numbers at a skill level
export function skillAt(skill, L) {
  const k = L - 1, out = { ...skill, lv: L };
  out.dmg = skill.dmg ? Math.round(skill.dmg * (1 + 0.25 * k)) : 0;
  out.mp = Math.round(skill.mp * (1 - 0.05 * k));
  if (skill.n && (skill.n > 1 || skill.kind === 'rain' && !skill.big)) out.n = skill.n + Math.floor(k / 2);
  if (skill.heal) out.heal = Math.round(skill.heal * (1 + 0.2 * k));
  if (skill.dur) out.dur = skill.dur + (skill.kind === 'dash' ? 0.05 * k : 2 * k);
  if (skill.r) out.r = Math.round(skill.r * (1 + 0.06 * k));
  if (skill.amt) out.amt = Math.min(0.8, skill.amt + 0.05 * k);
  if (skill.hp) out.hp = Math.round(skill.hp * (1 + 0.25 * k));
  return out;
}

// ------------------------------------------------------------------ shop and bag
export function buyGear(P, id) { const g = GEAR[id]; if (P.gold < g.price) return false; P.gold -= g.price; P.gear[id] = (P.gear[id] || 0) + 1; return true; }
export function buyItem(P, id, n = 1) { const it = ITEMS[id]; if (P.gold < it.price * n) return false; P.gold -= it.price * n; P.inv[id] = (P.inv[id] || 0) + n; return true; }
export const sellGearPrice = (id) => Math.floor(GEAR[id].price / 2);
export function sellGear(P, id) {
  if (!P.gear[id]) return false;
  const usedBy = Object.values(P.heroes).filter((h) => Object.values(h.equip).includes(id)).length;
  if (usedBy >= P.gear[id]) return false;                     // still worn
  P.gear[id]--; if (!P.gear[id]) delete P.gear[id]; P.gold += sellGearPrice(id); return true;
}
// equipping: each owned copy can be worn by one hero
export function freeCopies(P, id) { return (P.gear[id] || 0) - Object.values(P.heroes).filter((h) => Object.values(h.equip).includes(id)).length; }
export function equip(P, heroId, id) {
  const rec = P.heroes[heroId], g = GEAR[id];
  if (rec.equip[g.slot] === id) { rec.equip[g.slot] = null; return true; }
  if (freeCopies(P, id) < 1) return false;
  rec.equip[g.slot] = id; return true;
}
export function setQuick(P, slot, id) { P.quick[slot] = id; }

// ------------------------------------------------------------------ rewards after a battle
export function applyRewards(P, heroIds, res) {
  const out = { gold: 0, heroes: {} };
  let goldUp = 0;
  for (const id of heroIds) goldUp = Math.max(goldUp, heroStats(P.heroes[id], id).goldUp);
  out.gold = Math.round(res.gold * (1 + goldUp)); P.gold += out.gold;
  for (const [i, id] of heroIds.entries()) {
    const rec = P.heroes[id], st = heroStats(rec, id);
    const exp = Math.round((res.exp[i] || 0) * (1 + st.expUp));
    const lv0 = rec.lv, ups = gainExp(rec, exp);
    out.heroes[id] = { exp, lv0, lv: rec.lv, ups: ups.length };
  }
  P.kos += res.kos || 0; P.battles++; if (res.win) P.wins++;
  return out;
}
