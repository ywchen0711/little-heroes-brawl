// Little Heroes Brawl: heroes, skills, enemies, stages, equipment and items. Pure data.
export const W = 800, H = 450;              // logical screen
export const GROUND = 255, ZD = 170;         // the floor band: screen y = GROUND + z - y, z in 0..ZD
export const MAX_LV = 50;
export const LEVEL_EXP = (lv) => Math.floor(50 * Math.pow(lv, 1.6));
export const COMBOS = ['D>A', 'D>J', 'D^A', 'DvA', 'D^J', 'DvJ'];   // skill slot i is cast with COMBOS[i]
export const SKILL_LV_REQ = [1, 2, 5, 9, 14, 20];
export const SKILL_MAX = 5;

// ------------------------------------------------------------------ skills
// kinds (fight.js): ball (n, spread, homing, pierce, arc), dash, upper, column (n), strike (n), nova (r), rain (n),
// beam, wall, heal (r), buff (stat), summon, tele, flip
const S = (id, zh, en, kind, o) => ({ id, zh, en, kind, ...o });
export const SKILLS = Object.fromEntries([
  // fire
  S('fireball', '火球', 'Fireball', 'ball', { elem: 'fire', mp: 40, dmg: 50, spd: 330 }),
  S('flamerush', '火焰衝刺', 'Flame Rush', 'dash', { elem: 'fire', mp: 60, dmg: 45, spd: 380, dur: 0.5 }),
  S('risingflame', '升龍火拳', 'Rising Flame', 'upper', { elem: 'fire', mp: 50, dmg: 75 }),
  S('firepillar', '火柱', 'Fire Pillars', 'column', { elem: 'fire', mp: 80, dmg: 55, n: 3 }),
  S('inferno', '爆炎', 'Inferno', 'nova', { elem: 'fire', mp: 120, dmg: 90, r: 120 }),
  S('meteorrain', '流星火雨', 'Meteor Rain', 'rain', { elem: 'fire', mp: 160, dmg: 70, n: 6 }),
  // ice
  S('iceball', '冰球', 'Ice Ball', 'ball', { elem: 'ice', mp: 40, dmg: 40, spd: 300 }),
  S('icespikes', '冰刺', 'Ice Spikes', 'column', { elem: 'ice', mp: 70, dmg: 50, n: 4 }),
  S('icewall', '冰牆', 'Ice Wall', 'wall', { elem: 'ice', mp: 60, dmg: 30, hp: 220 }),
  S('frostbeam', '冰凍光線', 'Frost Beam', 'beam', { elem: 'ice', mp: 90, dmg: 60 }),
  S('blizzard', '暴風雪', 'Blizzard', 'nova', { elem: 'ice', mp: 130, dmg: 70, r: 150 }),
  S('iciclerain', '冰錐雨', 'Icicle Rain', 'rain', { elem: 'ice', mp: 150, dmg: 55, n: 8 }),
  S('heal', '治癒之光', 'Healing Light', 'heal', { elem: 'nature', mp: 80, heal: 120, r: 160 }),
  // lightning / shadow
  S('spark', '電光彈', 'Spark Shot', 'ball', { elem: 'elec', mp: 30, dmg: 35, spd: 460 }),
  S('thunderstep', '雷霆瞬移', 'Thunder Step', 'tele', { elem: 'elec', mp: 50, dmg: 55 }),
  S('chain', '連鎖閃電', 'Chain Lightning', 'ball', { elem: 'elec', mp: 70, dmg: 40, n: 3, homing: true, spd: 280 }),
  S('strike', '落雷', 'Lightning Strike', 'strike', { elem: 'elec', mp: 90, dmg: 70, n: 3 }),
  S('staticburst', '雷電爆發', 'Static Burst', 'nova', { elem: 'elec', mp: 110, dmg: 75, r: 120 }),
  S('overcharge', '超電磁', 'Overcharge', 'buff', { elem: 'elec', mp: 100, stat: 'power', amt: 0.4, dur: 10 }),
  S('shuriken', '手裏劍', 'Shuriken', 'ball', { elem: 'phys', mp: 25, dmg: 30, n: 2, spread: 1, spd: 420, star: true }),
  S('shadowstep', '影步', 'Shadow Step', 'tele', { elem: 'shadow', mp: 45, dmg: 60 }),
  S('galeslash', '疾風斬', 'Gale Slash', 'dash', { elem: 'elec', mp: 50, dmg: 55, spd: 480, dur: 0.35 }),
  S('smoke', '煙霧彈', 'Smoke Bomb', 'nova', { elem: 'smoke', mp: 70, dmg: 20, r: 120 }),
  S('clone', '影分身', 'Shadow Clone', 'summon', { elem: 'shadow', mp: 150, summon: 'clone', dur: 14 }),
  // earth / chi
  S('rocktoss', '投石', 'Rock Toss', 'ball', { elem: 'earth', mp: 40, dmg: 60, spd: 260, arc: true }),
  S('boulder', '巨石滾滾', 'Boulder Roll', 'dash', { elem: 'earth', mp: 60, dmg: 60, spd: 330, dur: 0.6 }),
  S('dragonup', '昇龍拳', 'Dragon Uppercut', 'upper', { elem: 'chi', mp: 50, dmg: 85 }),
  S('earthspikes', '地刺', 'Earth Spikes', 'column', { elem: 'earth', mp: 70, dmg: 60, n: 3 }),
  S('quake', '地震', 'Earthquake', 'nova', { elem: 'earth', mp: 110, dmg: 80, r: 180, ground: true }),
  S('stoneskin', '岩石皮膚', 'Stone Skin', 'buff', { elem: 'earth', mp: 90, stat: 'armor', amt: 0.5, dur: 12 }),
  S('chiblast', '氣功波', 'Chi Blast', 'ball', { elem: 'chi', mp: 40, dmg: 50, spd: 320 }),
  S('chicannon', '氣功砲', 'Chi Cannon', 'beam', { elem: 'chi', mp: 120, dmg: 100 }),
  S('quickarrow', '快箭', 'Quick Arrow', 'ball', { elem: 'phys', mp: 25, dmg: 40, spd: 520, arrow: true }),
  S('triplearrow', '三連箭', 'Triple Arrow', 'ball', { elem: 'phys', mp: 50, dmg: 35, n: 3, spread: 1, spd: 480, arrow: true }),
  S('arrowrain', '箭雨', 'Arrow Rain', 'rain', { elem: 'phys', mp: 110, dmg: 40, n: 10, arrow: true }),
].map((s) => [s.id, s]));

// ------------------------------------------------------------------ heroes
// look: how render.js dresses the shared body rig
export const HEROES = {
  josh: { zh: 'Josh', en: 'Josh', elem: 'fire', hp: 430, mp: 220, atk: 1.08, def: 5, spd: 102, color: '#e8402a',
    role: { zh: '火焰格鬥家', en: 'Flame brawler' }, d: { zh: '熱血又衝動的火焰少年，拳頭最重。', en: 'Hot-blooded and fearless — the hardest punches on the team.' },
    look: { skin: '#f6cfa8', hair: '#ff5a1a', hair2: '#ffc23a', style: 'spiky', top: 'jacket', c: '#d8302a', c2: '#f6f0e4', trim: '#ffd040', pants: '#262a3e', shoes: '#e8402a', eye: '#b8361a', extras: ['headband', 'flame'] },
    skills: ['fireball', 'flamerush', 'risingflame', 'firepillar', 'inferno', 'meteorrain'] },
  jasper: { zh: 'Jasper', en: 'Jasper', elem: 'elec', hp: 390, mp: 240, atk: 1.0, def: 3, spd: 118, color: '#3a6ae8',
    role: { zh: '閃電忍者', en: 'Lightning ninja' }, d: { zh: '跑得最快的閃電忍者，神出鬼沒。', en: 'The fastest kid alive — a lightning ninja who strikes from nowhere.' },
    look: { skin: '#f2cca8', hair: '#2a4ad8', hair2: '#7ab8ff', style: 'swept', top: 'ninja', c: '#1c2646', c2: '#2c3c6c', trim: '#ffd84a', pants: '#161e3a', shoes: '#22263a', eye: '#e8a820', extras: ['scarf', 'bolt'] },
    skills: ['spark', 'thunderstep', 'galeslash', 'chain', 'clone', 'strike'] },
  jeff: { zh: 'Jeff', en: 'Jeff', elem: 'earth', hp: 520, mp: 200, atk: 1.1, def: 8, spd: 88, color: '#5a8a3a', big: true,
    role: { zh: '大地力士', en: 'Earth powerhouse' }, d: { zh: '力氣超大的大個子，很耐打又會震地。', en: 'A gentle giant with earth-shaking strength.' },
    look: { skin: '#dfac84', hair: '#4a2e14', hair2: '#7a522a', style: 'buzz', top: 'tank', c: '#4e7e38', c2: '#3a6028', trim: '#c8a060', pants: '#6a5a40', shoes: '#4a3424', eye: '#5a3a1a', extras: ['gauntlets', 'leaf'] },
    skills: ['rocktoss', 'boulder', 'dragonup', 'earthspikes', 'quake', 'stoneskin'] },
  erin: { zh: 'Erin', en: 'Erin', elem: 'ice', hp: 420, mp: 280, atk: 1.0, def: 4, spd: 100, color: '#3aa8e8', girl: true,
    role: { zh: '冰雪魔法少女', en: 'Ice mage' }, d: { zh: '冷靜聰明的冰雪少女，能冰凍敵人還會幫隊友補血。', en: 'Cool and clever — she freezes foes and heals her friends.' },
    look: { skin: '#fbe0cc', hair: '#eef6ff', hair2: '#9ad0ff', style: 'ponytail', top: 'coat', c: '#3aa0e0', c2: '#ffffff', trim: '#e8f6ff', pants: '#24467a', shoes: '#f4f8ff', eye: '#1e7ad0', extras: ['snowclip', 'skirt'] },
    skills: ['iceball', 'icespikes', 'heal', 'frostbeam', 'blizzard', 'iciclerain'] },
};
for (const h of Object.values(HEROES)) h.skills = h.skills.map((id) => SKILLS[id]);
export const HERO_IDS = Object.keys(HEROES);
// older saves used eight heroes: their progress moves to the closest new hero
export const OLD_HEROES = { blaze: 'josh', kai: 'josh', volt: 'jasper', shade: 'jasper', robin: 'jasper', rocky: 'jeff', frost: 'erin', bloom: 'erin' };

// ------------------------------------------------------------------ enemies (stats at level 1)
const K = (...ids) => ids.map((id) => SKILLS[id]);
export const ENEMIES = {
  thug: { zh: '小混混', en: 'Thug', hp: 170, mp: 0, atk: 0.65, def: 0, spd: 85, exp: 15, gold: 6, skills: [],
    look: { skin: '#e8c0a0', hair: '#2a1e14', hair2: '#4a3424', style: 'cap', top: 'hoodie', c: '#6a6c80', c2: '#555768', trim: '#3a3c4c', pants: '#3a4a6a', shoes: '#e8e8e8', eye: '#3a2a1a', extras: [] } },
  knifer: { zh: '小刀仔', en: 'Knife Kid', hp: 200, mp: 0, atk: 0.75, def: 0, spd: 95, exp: 20, gold: 8, weapon: 'knife', skills: [],
    look: { skin: '#e8c0a0', hair: '#141414', hair2: '#3a3a3a', style: 'spiky', top: 'jacket', c: '#4a2420', c2: '#d8d0c0', trim: '#8a8a8a', pants: '#1e1e24', shoes: '#3a2a1a', eye: '#3a2a1a', extras: ['bandana'] } },
  archer: { zh: '弓箭手', en: 'Archer', hp: 200, mp: 200, atk: 0.85, def: 0, spd: 90, exp: 22, gold: 9, skills: K('quickarrow'), ranged: true,
    look: { skin: '#e8c0a0', hair: '#6a4a2a', hair2: '#8a6a3a', style: 'hood', top: 'cloak', c: '#3e6a32', c2: '#5a8a42', trim: '#a8864a', pants: '#4a3a2a', shoes: '#3a2a1a', eye: '#3a2a1a', extras: ['bow'] } },
  brute: { zh: '大塊頭', en: 'Brute', hp: 600, mp: 0, atk: 1.3, def: 6, spd: 62, exp: 45, gold: 20, big: true, armor: 0.4, skills: [],
    look: { skin: '#d8a880', hair: '#1a1210', hair2: '#3a2a1a', style: 'mohawk', top: 'tank', c: '#7a5a4a', c2: '#5a4236', trim: '#3a2a20', pants: '#3a3a44', shoes: '#2a2020', eye: '#3a1a1a', extras: ['scar'] } },
  ninja: { zh: '忍者', en: 'Ninja', hp: 280, mp: 200, atk: 0.95, def: 2, spd: 120, exp: 35, gold: 14, skills: K('shuriken', 'shadowstep'),
    look: { skin: '#ecc6a8', hair: '#14141e', hair2: '#2a2a3a', style: 'swept', top: 'ninja', c: '#22222e', c2: '#33334a', trim: '#c83030', pants: '#1a1a24', shoes: '#14141a', eye: '#3a2a1a', extras: ['mask', 'scarf'] } },
  mage: { zh: '小法師', en: 'Mage', hp: 260, mp: 260, atk: 0.9, def: 1, spd: 88, exp: 40, gold: 16, skills: K('fireball', 'iceball'), ranged: true,
    look: { skin: '#f0d0b8', hair: '#e8e8f0', hair2: '#b8b8d0', style: 'hat', top: 'robe', c: '#5a32a0', c2: '#7a4ac8', trim: '#ffd040', pants: '#2e1e50', shoes: '#2a1a3a', eye: '#6a2ab0', extras: ['staff'] } },
  robot: { zh: '機器人', en: 'Robot', hp: 340, mp: 240, atk: 0.85, def: 8, spd: 80, exp: 50, gold: 22, skills: K('chiblast'), ranged: true,
    look: { skin: '#a8b8c8', hair: '#5a6a7a', hair2: '#8a9aaa', style: 'robot', top: 'robot', c: '#8a9aac', c2: '#6a7a8c', trim: '#ff5a2a', pants: '#4a5a6a', shoes: '#3a4a5a', eye: '#ff4a2a', extras: [] } },
  // bosses
  bruno: { zh: '惡霸布魯諾', en: 'Bruno the Bully', hp: 650, mp: 200, atk: 1.15, def: 8, spd: 70, exp: 160, gold: 120, big: true, boss: true, armor: 0.35, skills: K('boulder'),
    look: { skin: '#d8a880', hair: '#141010', hair2: '#3a2a20', style: 'buzz', top: 'tank', c: '#c83a2a', c2: '#a02a1e', trim: '#ffd040', pants: '#262a48', shoes: '#141418', eye: '#2a1a1a', extras: ['chain', 'shades'] } },
  banditking: { zh: '山賊王', en: 'Bandit King', hp: 950, mp: 300, atk: 1.15, def: 5, spd: 110, exp: 320, gold: 220, boss: true, weapon: 'bat', armor: 0.25, skills: K('galeslash', 'triplearrow', 'dragonup'),
    look: { skin: '#e0b08a', hair: '#5a2a14', hair2: '#8a4a24', style: 'spiky', top: 'coat', c: '#7a5222', c2: '#e8d8b0', trim: '#ffd040', pants: '#3a2a1a', shoes: '#2a1a10', eye: '#3a1a0a', extras: ['tricorn', 'beard'] } },
  shadowmaster: { zh: '影之大師', en: 'Shadow Master', hp: 1050, mp: 400, atk: 1.15, def: 6, spd: 125, exp: 520, gold: 340, boss: true, armor: 0.25, skills: K('shuriken', 'shadowstep', 'clone', 'smoke'),
    look: { skin: '#ecc6a8', hair: '#d8d8e8', hair2: '#ffffff', style: 'long', top: 'ninja', c: '#16161e', c2: '#26263a', trim: '#9a5ae8', pants: '#121218', shoes: '#0e0e14', eye: '#9a5ae8', extras: ['mask', 'cape'] } },
  megabot: { zh: '巨型機器人', en: 'Mega Bot', hp: 1300, mp: 500, atk: 1.2, def: 10, spd: 72, exp: 800, gold: 500, big: true, boss: true, armor: 0.4, skills: K('chicannon', 'strike', 'arrowrain'),
    look: { skin: '#9aaaba', hair: '#e8402a', hair2: '#ff8a5a', style: 'robot', top: 'robot', c: '#5a6a8a', c2: '#46546e', trim: '#ff4a2a', pants: '#3a4a5a', shoes: '#2a3444', eye: '#ff3a2a', extras: [] } },
  zarkon: { zh: '黑暗魔王 札康', en: 'Dark Lord Zarkon', hp: 1600, mp: 600, atk: 1.3, def: 10, spd: 100, exp: 1400, gold: 900, boss: true, armor: 0.35, skills: K('fireball', 'thunderstep', 'inferno', 'iciclerain', 'chicannon'),
    look: { skin: '#c8b8d8', hair: '#f0f0f8', hair2: '#c8c8e0', style: 'long', top: 'robe', c: '#2a0a24', c2: '#4a1240', trim: '#e8402a', pants: '#140612', shoes: '#0e040c', eye: '#ff2a3a', extras: ['horns', 'cape'] } },
};

// story stages: waves of [enemy, count]; enemies are at the stage level
export const STAGES = [
  { id: 'park', zh: '公園', en: 'The Park', lv: 1, bg: 'park', waves: [[['thug', 3]], [['thug', 4]], [['thug', 3], ['knifer', 1]], [['bruno', 1], ['thug', 1]]], reward: { exp: 120, gold: 100 } },
  { id: 'forest', zh: '森林', en: 'The Forest', lv: 5, bg: 'forest', waves: [[['thug', 2], ['archer', 2]], [['knifer', 3], ['archer', 1]], [['brute', 1], ['archer', 2], ['thug', 1]], [['banditking', 1], ['knifer', 2]]], reward: { exp: 400, gold: 260 } },
  { id: 'village', zh: '忍者村', en: 'Ninja Village', lv: 10, bg: 'village', waves: [[['ninja', 3]], [['ninja', 2], ['archer', 2]], [['ninja', 3], ['brute', 1]], [['shadowmaster', 1], ['ninja', 2]]], reward: { exp: 900, gold: 520 } },
  { id: 'factory', zh: '機器工廠', en: 'Robot Factory', lv: 16, bg: 'factory', waves: [[['robot', 2], ['thug', 2]], [['robot', 3]], [['robot', 2], ['mage', 2]], [['megabot', 1], ['robot', 1]]], reward: { exp: 1800, gold: 900 } },
  { id: 'castle', zh: '黑暗城堡', en: 'Dark Castle', lv: 22, bg: 'castle', waves: [[['mage', 2], ['ninja', 2]], [['brute', 2], ['mage', 2]], [['robot', 2], ['ninja', 2], ['mage', 1]], [['zarkon', 1], ['mage', 2]]], reward: { exp: 3500, gold: 1600 } },
];
export const SURVIVAL_POOL = ['thug', 'knifer', 'archer', 'brute', 'ninja', 'mage', 'robot'];

// equipment: slot glove (atk %), wear (def, hp), shoes (spd), charm (special)
export const GEAR = {
  clothgloves: { slot: 'glove', zh: '布手套', en: 'Cloth Gloves', atk: 5, price: 60, lv: 1 },
  leathergloves: { slot: 'glove', zh: '皮手套', en: 'Leather Gloves', atk: 10, price: 220, lv: 4 },
  knuckles: { slot: 'glove', zh: '鐵拳套', en: 'Steel Knuckles', atk: 18, price: 650, lv: 9 },
  dragongloves: { slot: 'glove', zh: '龍之拳套', en: 'Dragon Gloves', atk: 28, price: 1600, lv: 15 },
  starfists: { slot: 'glove', zh: '星星拳', en: 'Star Fists', atk: 40, price: 3800, lv: 22 },
  tshirt: { slot: 'wear', zh: '帥氣T恤', en: 'Cool T-shirt', def: 5, hp: 20, price: 60, lv: 1 },
  jacket: { slot: 'wear', zh: '運動外套', en: 'Track Jacket', def: 10, hp: 50, price: 240, lv: 4 },
  kungfu: { slot: 'wear', zh: '功夫裝', en: 'Kung Fu Suit', def: 18, hp: 100, price: 700, lv: 9 },
  ninjagarb: { slot: 'wear', zh: '忍者裝束', en: 'Ninja Garb', def: 26, hp: 150, spd: 5, price: 1700, lv: 15 },
  heroarmor: { slot: 'wear', zh: '英雄鎧甲', en: 'Hero Armor', def: 36, hp: 260, price: 4000, lv: 22 },
  sneakers: { slot: 'shoes', zh: '球鞋', en: 'Sneakers', spd: 6, price: 80, lv: 1 },
  runshoes: { slot: 'shoes', zh: '跑鞋', en: 'Running Shoes', spd: 12, price: 300, lv: 5 },
  jumpboots: { slot: 'shoes', zh: '彈跳靴', en: 'Spring Boots', spd: 12, jump: 0.15, price: 800, lv: 10 },
  windboots: { slot: 'shoes', zh: '疾風靴', en: 'Wind Boots', spd: 22, jump: 0.15, price: 2000, lv: 16 },
  luckycoin: { slot: 'charm', zh: '幸運硬幣', en: 'Lucky Coin', goldUp: 0.25, price: 300, lv: 2 },
  manapendant: { slot: 'charm', zh: '魔力墜子', en: 'Mana Pendant', mp: 80, mpRegen: 0.4, price: 550, lv: 5 },
  heartlocket: { slot: 'charm', zh: '愛心項鍊', en: 'Heart Locket', hp: 140, price: 850, lv: 8 },
  expbadge: { slot: 'charm', zh: '經驗徽章', en: 'EXP Badge', expUp: 0.3, price: 1300, lv: 10 },
  critring: { slot: 'charm', zh: '會心戒指', en: 'Critical Ring', crit: 0.12, price: 1600, lv: 13 },
  phoenix: { slot: 'charm', zh: '鳳凰羽毛', en: 'Phoenix Feather', revive: 0.4, price: 4200, lv: 20 },
};
export const SLOTS = ['glove', 'wear', 'shoes', 'charm'];
// consumables (used in battle from the 3 quick slots)
export const ITEMS = {
  milk: { zh: '牛奶', en: 'Milk', hp: 150, price: 30 },
  juice: { zh: '果汁', en: 'Juice', mp: 100, price: 30 },
  bento: { zh: '便當', en: 'Bento Box', hp: 320, price: 90 },
  candy: { zh: '彩虹糖', en: 'Rainbow Candy', hp: 120, mp: 120, price: 80 },
  energy: { zh: '能量飲料', en: 'Energy Drink', mp: 999, price: 140 },
  bomb: { zh: '炸彈', en: 'Bomb', bomb: 120, price: 60 },
};
// things lying in the arena
export const PICKUPS = {
  bat: { zh: '球棒', en: 'Bat', melee: 18, reach: 22, uses: 12 },
  knife: { zh: '小刀', en: 'Knife', melee: 12, reach: 14, uses: 14, throwDmg: 45 },
  stone: { zh: '石頭', en: 'Stone', throwDmg: 50, heavy: true },
  crate: { zh: '木箱', en: 'Crate', throwDmg: 60, heavy: true, breaks: true },
  milkbottle: { zh: '牛奶瓶', en: 'Milk Bottle', heal: 100 },
};
