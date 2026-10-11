// Headless tests: progression rules, every skill of every hero, combo input, battles played by bots.
import { HEROES, HERO_IDS, STAGES, GEAR, LEVEL_EXP } from '../js/data.js?v=1';
import * as P from '../js/progress.js?v=1';
import * as F from '../js/fight.js?v=1';

let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const DT = 1 / 60;

// 1) progression
{
  const pr = P.newProfile(), rec = pr.heroes.blaze;
  ok(P.gainExp(rec, LEVEL_EXP(1)).length === 1 && rec.lv === 2 && rec.sp === 1, 'levelling gives a skill point');
  ok(P.raiseSkill(rec, 1) && rec.skills[1] === 1 && rec.sp === 0, 'learning skill 2 at level 2');
  ok(!P.canRaise(rec, 2).ok, 'skill 3 is locked by level and SP');
  P.gainExp(rec, 1e6); ok(rec.lv > 20 && rec.sp > 15, `lots of EXP: lv ${rec.lv}, sp ${rec.sp}`);
  while (P.raiseSkill(rec, 0)); ok(rec.skills[0] === 5, 'skills max out at level 5');
  const s1 = P.skillAt(HEROES.blaze.skills[0], 1), s5 = P.skillAt(HEROES.blaze.skills[0], 5);
  ok(s5.dmg > s1.dmg * 1.9 && s5.mp < s1.mp, `upgrades: damage ${s1.dmg} -> ${s5.dmg}, MP ${s1.mp} -> ${s5.mp}`);
  pr.gold = 1000; ok(P.buyGear(pr, 'leathergloves') && pr.gold === 780, 'buying gloves');
  const a0 = P.heroStats(rec, 'blaze').atk; P.equip(pr, 'blaze', 'leathergloves'); ok(P.heroStats(rec, 'blaze').atk > a0, 'gloves raise attack');
  ok(!P.equip(pr, 'frost', 'leathergloves'), 'one copy cannot be worn by two heroes');
  ok(!P.sellGear(pr, 'leathergloves'), 'cannot sell worn gear');
  ok(P.buyItem(pr, 'milk', 2) && pr.inv.milk === 5, 'buying milk');
}
// 2) every skill of every hero works
for (const h of HERO_IDS) {
  const rec = P.cpuHeroRec(h, 40);
  let dealt = 0, bad = '';
  for (let slot = 0; slot < 6; slot++) {
    const B = F.newBattle({ mode: 'vs', players: [{ hero: h, rec }], foes: [{ hero: 'kai', lv: 1 }, { hero: 'rocky', lv: 1 }], seed: 3 + slot });
    const me = B.players[0]; me.mp = me.mmp = 999;
    const close = ['upper', 'nova', 'tele'].includes(HEROES[h].skills[slot].kind);
    for (const e of B.ents) if (e.team === 1) { e.ai = null; e.x = me.x + (close ? 36 : 140); e.z = me.z; e.hp = e.mhp = 5000; e.inv = 0; }
    if (HEROES[h].skills[slot].kind === 'heal') me.hp = 50;
    const hp0 = B.ents.filter((e) => e.team === 1).reduce((a, e) => a + e.hp, 0), myhp0 = me.hp;
    const inputs = [F.blankInput()]; inputs[0].skill = slot;
    for (let i = 0; i < 240; i++) { F.update(B, DT, inputs); inputs[0] = F.blankInput(); }
    const d = hp0 - B.ents.filter((e) => e.team === 1).reduce((a, e) => a + e.hp, 0);
    const kind = HEROES[h].skills[slot].kind;
    const good = ['heal'].includes(kind) ? me.hp > myhp0 : kind === 'buff' ? Object.keys(me.buffs).length > 0 || B.ents.some((e) => Object.keys(e.buffs).length) : kind === 'wall' ? true : d > 0;
    if (!good) bad += ` ${slot}:${kind}`;
    if (B.ents.some((e) => !Number.isFinite(e.x + e.z + e.y + e.hp))) bad += ` NaN@${slot}`;
    dealt += d;
  }
  ok(!bad, `${HEROES[h].en}: all 6 skills work (${Math.round(dealt)} damage)${bad}`);
}
// 3) combo input: Defend, forward, Attack casts skill 1
{
  const rec = P.newHeroRec();
  const B = F.newBattle({ mode: 'vs', players: [{ hero: 'blaze', rec }], foes: [{ hero: 'kai', lv: 1 }], seed: 5 });
  const me = B.players[0]; const seq = [{ pD: 1, D: 1 }, {}, { dirs: { r: 1 }, x: 1 }, {}, { pA: 1, A: 1 }];
  let cast = false;
  for (const s of seq) { F.update(B, DT, [{ ...F.blankInput(), ...s }]); if (me.st === 'cast') cast = true; }
  for (let i = 0; i < 20; i++) F.update(B, DT, [F.blankInput()]);
  ok(cast && B.projs.length + B.fx.length > 0, 'D → A casts the Fireball');
  // punch combo knocks down on the third hit
  const B2 = F.newBattle({ mode: 'vs', players: [{ hero: 'kai', rec: P.newHeroRec() }], foes: [{ hero: 'rocky', lv: 1 }], seed: 6 });
  const p = B2.players[0], f = B2.ents.find((e) => e.team === 1); f.ai = null; f.x = p.x + 30; f.z = p.z; f.hp = f.mhp = 3000; f.inv = 0;
  for (let i = 0; i < 60; i++) F.update(B2, DT, [{ ...F.blankInput(), pA: i % 16 === 0 ? 1 : 0, A: 1 }]);
  ok(f.st === 'fly' || f.st === 'lie' || f.st === 'rise', 'three punches knock the foe down (' + f.st + ')');
}
// 4) bots play stages
function playStage(hero, lv, si, secs = 240) {
  const rec = P.cpuHeroRec(hero, lv);
  const B = F.newBattle({ mode: 'stage', stage: si, players: [{ hero, rec }], inv: { milk: 3 }, quick: ['milk', null, null], seed: 11 + si });
  let t = 0;
  for (; t < secs && !B.over; t += DT) {
    const me = B.players[0]; const inp = F.botInput(B, me, DT);
    if (me.hp < me.mhp * 0.3 && B.inv.milk) inp.item = 0;
    F.update(B, DT, [inp]);
  }
  return { B, t };
}
for (const [hero, lv, si] of [['blaze', 4, 0], ['kai', 9, 1], ['shade', 14, 2], ['frost', 20, 3], ['rocky', 28, 4]]) {
  const { B, t } = playStage(hero, lv, si);
  ok(B.over && B.over.win, `${HEROES[hero].en} lv ${lv} clears ${STAGES[si].en} (${t.toFixed(0)} s, ${B.earned.kos} KOs, ${B.earned.exp[0]} EXP, ${B.earned.gold} G)`);
}
{
  const { B } = playStage('bloom', 1, 4, 180);
  ok(!B.over || !B.over.win, 'a level 1 hero cannot clear the Dark Castle');
}
// 5) survival and rewards
{
  const rec = P.cpuHeroRec('volt', 10);
  const B = F.newBattle({ mode: 'survival', players: [{ hero: 'volt', rec }], seed: 21 });
  for (let t = 0; t < 400 && !B.over; t += DT) F.update(B, DT, [F.botInput(B, B.players[0], DT)]);
  ok(B.wave >= 3, `survival reaches wave ${B.wave}${B.over ? ' and ends' : ''}`);
  const pr = P.newProfile(); const g0 = pr.gold;
  const out = P.applyRewards(pr, ['volt'], F.result(B));
  ok(pr.gold > g0 && pr.heroes.volt.exp + pr.heroes.volt.lv > 1, `rewards applied: +${out.gold} G, lv ${out.heroes.volt.lv0} -> ${out.heroes.volt.lv}`);
}
// 6) two players
{
  const B = F.newBattle({ mode: 'stage', stage: 0, players: [{ hero: 'blaze', rec: P.cpuHeroRec('blaze', 3) }, { hero: 'frost', rec: P.cpuHeroRec('frost', 3) }], seed: 31 });
  for (let t = 0; t < 240 && !B.over; t += DT) F.update(B, DT, B.players.map((p) => F.botInput(B, p, DT)));
  ok(B.over && B.over.win && B.earned.exp[0] > 0 && B.earned.exp[1] > 0, `two players clear the park together (EXP ${B.earned.exp.join(' / ')})`);
}
void GEAR;
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
