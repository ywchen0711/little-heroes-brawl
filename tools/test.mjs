// Headless tests: progression rules, every skill of every hero, combo input, battles played by bots.
import { HEROES, HERO_IDS, STAGES, GEAR, LEVEL_EXP } from '../js/data.js?v=4';
import * as P0 from '../js/progress.js?v=4';
import { moveList } from '../js/data.js?v=4';
const P = { ...P0, moveList };
import * as F from '../js/fight.js?v=4';

let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const DT = 1 / 60;

// 1) progression
{
  const pr = P.newProfile(), rec = pr.heroes.josh;
  ok(P.gainExp(rec, LEVEL_EXP(1)).length === 1 && rec.lv === 2 && rec.sp === 1, 'levelling gives a skill point');
  ok(P.raiseSkill(rec, 'josh', 'flamerush') && rec.learned.flamerush === 1 && rec.sp === 0 && rec.loadout[1] === 'flamerush', 'learning Flame Rush at level 2 puts it in a free slot');
  ok(!P.canRaise(rec, 'josh', 'risingflame').ok, 'move 3 is locked by level and SP');
  ok(!P.canRaise(rec, 'josh', 'iceball').ok, "Josh cannot learn Erin's Ice Ball");
  P.gainExp(rec, 1e6); ok(rec.lv > 20 && rec.sp > 15, `lots of EXP: lv ${rec.lv}, sp ${rec.sp}`);
  while (P.raiseSkill(rec, 'josh', 'fireball')); ok(rec.learned.fireball === 5, 'moves max out at level 5');
  ok(P.moveList('josh').length === 15 && P.moveList('erin').some((m) => m.sk.id === 'firstaid'), 'every hero has 15 moves to choose from (6 own, 3 element, 6 for anyone)');
  ok(P.raiseSkill(rec, 'josh', 'cyclone') && P.raiseSkill(rec, 'josh', 'phoenix'), 'learning a move anyone can learn and an extra fire move');
  P.equipMove(rec, 'josh', 0, 'phoenix'); P.equipMove(rec, 'josh', 5, 'fireball');
  ok(rec.loadout[0] === 'phoenix' && rec.loadout[5] === 'fireball' && P.heroLoadout(rec, 'josh')[0].id === 'phoenix', 'equipping moves into slots (and swapping)');
  ok(!P.equipMove(rec, 'josh', 2, 'blizzard'), 'a move not learned cannot be equipped');
  const s1 = P.skillAt(HEROES.josh.skills[0], 1), s5 = P.skillAt(HEROES.josh.skills[0], 5);
  ok(s5.dmg > s1.dmg * 1.9 && s5.mp < s1.mp, `upgrades: damage ${s1.dmg} -> ${s5.dmg}, MP ${s1.mp} -> ${s5.mp}`);
  pr.gold = 1000; ok(P.buyGear(pr, 'leathergloves') && pr.gold === 780, 'buying gloves');
  const a0 = P.heroStats(rec, 'josh').atk; P.equip(pr, 'josh', 'leathergloves'); ok(P.heroStats(rec, 'josh').atk > a0, 'gloves raise attack');
  ok(!P.equip(pr, 'erin', 'leathergloves'), 'one copy cannot be worn by two heroes');
  ok(!P.sellGear(pr, 'leathergloves'), 'cannot sell worn gear');
  ok(P.buyItem(pr, 'milk', 2) && pr.inv.milk === 5, 'buying milk');
}
// 1b) saves from the 8-hero version move to the four heroes
{
  const old = { gold: 999, inv: { milk: 1 }, gear: { jacket: 1 }, quick: ['milk', null, null], heroes: {
    blaze: { lv: 12, exp: 40, sp: 0, skills: { 0: 5, 1: 3 }, equip: { glove: null, wear: 'jacket', shoes: null, charm: null } },
    kai: { lv: 3, exp: 0, sp: 1, skills: { 0: 1 }, equip: {} }, frost: { lv: 7, exp: 5, sp: 2, skills: { 0: 2 }, equip: {} } }, cleared: 2 };
  const p = P.fixProfile(JSON.parse(JSON.stringify(old)));
  ok(Object.keys(p.heroes).sort().join() === 'erin,jasper,jeff,josh', 'old saves end up with exactly the four heroes');
  ok(p.heroes.josh.lv === 12 && p.heroes.josh.sp === 13 && p.heroes.josh.equip.wear === 'jacket', `Blaze lv 12 becomes Josh lv 12 with skills refunded as ${p.heroes.josh.sp} SP and his jacket`);
  ok(p.heroes.erin.lv === 7 && p.heroes.jasper.lv === 1 && p.gold === 999 && p.cleared === 2, 'Frost becomes Erin; gold and stage progress are kept');
}
// 2) every move of every hero works (all 15 per hero, each cast from slot 1)
for (const h of HERO_IDS) {
  let dealt = 0, bad = '';
  for (const m of moveList(h)) {
    const rec = P.cpuHeroRec(h, 40); rec.learned[m.sk.id] = 3; rec.loadout[0] = m.sk.id;
    const B = F.newBattle({ mode: 'vs', players: [{ hero: h, rec }], foes: [{ hero: 'jeff', lv: 1 }, { hero: 'erin', lv: 1 }], seed: 3 });
    const me = B.players[0]; me.mp = me.mmp = 999; B.items = [];
    const kind = m.sk.kind, close = ['upper', 'nova', 'tele'].includes(kind) || m.sk.id === 'powerpunch';
    for (const e of B.ents) if (e.team === 1) { e.ai = null; e.x = me.x + (close ? 36 : 140); e.z = me.z; e.hp = e.mhp = 5000; e.inv = 0; }
    if (kind === 'heal') me.hp = 50;
    const hp0 = B.ents.filter((e) => e.team === 1).reduce((a, e) => a + e.hp, 0), myhp0 = me.hp;
    const inputs = [F.blankInput()]; inputs[0].skill = 0;
    for (let i = 0; i < 240; i++) { F.update(B, DT, inputs); inputs[0] = F.blankInput(); }
    const d = hp0 - B.ents.filter((e) => e.team === 1).reduce((a, e) => a + e.hp, 0);
    const good = kind === 'heal' ? me.hp > myhp0 : kind === 'buff' ? Object.keys(me.buffs).length > 0 || B.ents.some((e) => Object.keys(e.buffs).length) : kind === 'wall' ? B.projs.some((p) => p.wall) || d > 0 : d > 0;
    if (!good) bad += ` ${m.sk.id}:${kind}`;
    if (B.ents.some((e) => !Number.isFinite(e.x + e.z + e.y + e.hp))) bad += ` NaN@${m.sk.id}`;
    dealt += d;
  }
  ok(!bad, `${HEROES[h].en}: all ${moveList(h).length} moves work (${Math.round(dealt)} damage)${bad}`);
}
// 3) combo input: Defend, forward, Attack casts skill 1
{
  const rec = P.newHeroRec();
  const B = F.newBattle({ mode: 'vs', players: [{ hero: 'josh', rec }], foes: [{ hero: 'jeff', lv: 1 }], seed: 5 });
  const me = B.players[0]; const seq = [{ pD: 1, D: 1 }, {}, { dirs: { r: 1 }, x: 1 }, {}, { pA: 1, A: 1 }];
  let cast = false;
  for (const s of seq) { F.update(B, DT, [{ ...F.blankInput(), ...s }]); if (me.st === 'cast') cast = true; }
  for (let i = 0; i < 20; i++) F.update(B, DT, [F.blankInput()]);
  ok(cast && B.projs.length + B.fx.length > 0, 'D → A casts the Fireball');
  // punch combo knocks down on the third hit
  const B2 = F.newBattle({ mode: 'vs', players: [{ hero: 'josh', rec: P.newHeroRec() }], foes: [{ hero: 'jeff', lv: 1 }], seed: 6 });
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
for (const [hero, lv, si] of [['josh', 4, 0], ['jeff', 9, 1], ['jasper', 14, 2], ['erin', 20, 3], ['jeff', 28, 4]]) {
  const { B, t } = playStage(hero, lv, si);
  ok(B.over && B.over.win, `${HEROES[hero].en} lv ${lv} clears ${STAGES[si].en} (${t.toFixed(0)} s, ${B.earned.kos} KOs, ${B.earned.exp[0]} EXP, ${B.earned.gold} G)`);
}
{
  const { B } = playStage('erin', 1, 4, 180);
  ok(!B.over || !B.over.win, 'a level 1 hero cannot clear the Dark Castle');
}
// 4b) practice mode
{
  const pr = P.newProfile(); const milk0 = pr.inv.milk;
  const B = F.newBattle({ mode: 'practice', players: [{ hero: 'josh', rec: P.cpuHeroRec('josh', 20) }], inv: pr.inv, quick: ['milk', 'bomb', null], behave: 'stand', dummies: 2, seed: 5 });
  const me = B.players[0], dums = () => B.ents.filter((e) => e.key === 'dummy');
  ok(dums().length === 2 && dums().every((d) => !d.ai), 'two standing dummies');
  me.hp = 10; let inp = F.blankInput(); inp.item = 0; F.update(B, DT, [inp]);
  ok(me.hp > 10 && pr.inv.milk === milk0 && B.inv.milk === 98, 'practice items are free: the real bag is untouched');
  const down = new Set(); let revived = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const d = dums()[0]; me.x = d.x - 30; me.z = d.z; const k = F.blankInput(); const j = i % 90;
    if (j === 0 || j === 15) { k.pA = 1; k.A = 1; } if (j === 60) k.skill = 0;
    F.update(B, DT, [k]);
    for (const x of dums()) { if (x.hp <= 0) down.add(x); else if (down.has(x) && x.hp === x.mhp) { down.delete(x); revived++; } }
  }
  ok(dums().length === 2 && revived >= 1 && B.practice.dmg > 500, `dummies get back up after a KO (${revived} times; damage dealt ${Math.round(B.practice.dmg)}, best combo ${B.practice.best})`);
  ok(me.mp === me.mmp && B.practice.casts[0] > 3, `infinite MP; Fireball cast ${B.practice.casts[0]} times`);
  ok(!B.over && B.earned.exp[0] < 1e9, 'practice never ends by itself');
  F.setPractice(B, { behave: 'fight', n: 3 });
  ok(dums().length === 3 && dums().every((d) => d.ai), 'switching to 3 dummies that fight back');
  me.hp = 1; me.inv = 0; for (let i = 0; i < 60 * 15; i++) F.update(B, DT, [F.blankInput()]);
  ok(me.hp > 0, 'you cannot lose in practice');
}
// 5) survival and rewards
{
  const rec = P.cpuHeroRec('jasper', 10);
  const B = F.newBattle({ mode: 'survival', players: [{ hero: 'jasper', rec }], seed: 21 });
  for (let t = 0; t < 400 && !B.over; t += DT) F.update(B, DT, [F.botInput(B, B.players[0], DT)]);
  ok(B.wave >= 3, `survival reaches wave ${B.wave}${B.over ? ' and ends' : ''}`);
  const pr = P.newProfile(); const g0 = pr.gold;
  const out = P.applyRewards(pr, ['jasper'], F.result(B));
  ok(pr.gold > g0 && pr.heroes.jasper.exp + pr.heroes.jasper.lv > 1, `rewards applied: +${out.gold} G, lv ${out.heroes.jasper.lv0} -> ${out.heroes.jasper.lv}`);
}
// 6) two players
{
  const B = F.newBattle({ mode: 'stage', stage: 0, players: [{ hero: 'josh', rec: P.cpuHeroRec('josh', 3) }, { hero: 'erin', rec: P.cpuHeroRec('erin', 3) }], seed: 31 });
  for (let t = 0; t < 240 && !B.over; t += DT) F.update(B, DT, B.players.map((p) => F.botInput(B, p, DT)));
  ok(B.over && B.over.win && B.earned.exp[0] > 0 && B.earned.exp[1] > 0, `two players clear the park together (EXP ${B.earned.exp.join(' / ')})`);
}
void GEAR;
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
