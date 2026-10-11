// Little Heroes Brawl: heroes, skills, enemies, stages, equipment and items. Pure data.
export const W = 800, H = 450;              // logical screen
export const GROUND = 255, ZD = 170;         // the floor band: screen y = GROUND + z - y, z in 0..ZD
export const MAX_LV = 50;
export const LEVEL_EXP = (lv) => Math.floor(50 * Math.pow(lv, 1.6));
export const COMBOS = ['D>A', 'D>J', 'D^A', 'DvA', 'D^J', 'DvJ'];   // skill slot i is cast with COMBOS[i]
export const SKILL_LV_REQ = [1, 2, 5, 9, 14, 20];
export const SKILL_MAX = 5;

// skill kinds (fight.js): ball (n, spread, homing, pierce, arc), dash, upper, column (n), strike (n), nova (r), rain (n),
// beam, wall, heal (r), buff (stat), summon, tele, flip
const S = (id, zh, en, kind, o) => ({ id, zh, en, kind, ...o });
export const HEROES = {
  blaze: { zh: '炎仔', en: 'Blaze', elem: 'fire', hp: 420, mp: 220, atk: 1.05, def: 4, spd: 100, color: '#e8452c', hair: '#ff7a1a', skin: '#f6d2b0', style: 'spiky', pants: '#3a3a5a',
    d: { zh: '熱血的火焰少年，攻擊力高。', en: 'A hot-blooded boy of fire. Hits hard.' },
    skills: [
      S('fireball', '火球', 'Fireball', 'ball', { elem: 'fire', mp: 40, dmg: 50, spd: 330 }),
      S('flamerush', '火焰衝刺', 'Flame Rush', 'dash', { elem: 'fire', mp: 60, dmg: 45, spd: 380, dur: 0.5 }),
      S('risingflame', '升龍火拳', 'Rising Flame', 'upper', { elem: 'fire', mp: 50, dmg: 75 }),
      S('firepillar', '火柱', 'Fire Pillars', 'column', { elem: 'fire', mp: 80, dmg: 55, n: 3 }),
      S('inferno', '爆炎', 'Inferno', 'nova', { elem: 'fire', mp: 120, dmg: 90, r: 120 }),
      S('meteorrain', '流星火雨', 'Meteor Rain', 'rain', { elem: 'fire', mp: 160, dmg: 70, n: 6 }),
    ] },
  frost: { zh: '冰冰', en: 'Frost', elem: 'ice', hp: 390, mp: 260, atk: 0.95, def: 4, spd: 98, color: '#4aa8e8', hair: '#bfe8ff', skin: '#fae0cc', style: 'long', pants: '#2a4a7a',
    d: { zh: '冷靜的冰之少女，能把敵人凍住。', en: 'A calm ice girl who freezes her foes.' },
    skills: [
      S('iceball', '冰球', 'Ice Ball', 'ball', { elem: 'ice', mp: 40, dmg: 40, spd: 300 }),
      S('icespikes', '冰刺', 'Ice Spikes', 'column', { elem: 'ice', mp: 70, dmg: 50, n: 4 }),
      S('icewall', '冰牆', 'Ice Wall', 'wall', { elem: 'ice', mp: 60, dmg: 30, hp: 220 }),
      S('frostbeam', '冰凍光線', 'Frost Beam', 'beam', { elem: 'ice', mp: 90, dmg: 60 }),
      S('blizzard', '暴風雪', 'Blizzard', 'nova', { elem: 'ice', mp: 130, dmg: 70, r: 150 }),
      S('iciclerain', '冰錐雨', 'Icicle Rain', 'rain', { elem: 'ice', mp: 150, dmg: 55, n: 8 }),
    ] },
  volt: { zh: '雷霆', en: 'Volt', elem: 'elec', hp: 400, mp: 230, atk: 1.0, def: 3, spd: 112, color: '#f0c020', hair: '#fff07a', skin: '#f2cca8', style: 'spiky', pants: '#2a2a3a',
    d: { zh: '速度最快的閃電小子，電到會麻痺。', en: 'The fastest kid around. Shocks stun.' },
    skills: [
      S('spark', '電光彈', 'Spark Shot', 'ball', { elem: 'elec', mp: 30, dmg: 35, spd: 460 }),
      S('thunderstep', '雷霆瞬移', 'Thunder Step', 'tele', { elem: 'elec', mp: 50, dmg: 55 }),
      S('chain', '連鎖閃電', 'Chain Lightning', 'ball', { elem: 'elec', mp: 70, dmg: 40, n: 3, homing: true, spd: 280 }),
      S('strike', '落雷', 'Lightning Strike', 'strike', { elem: 'elec', mp: 90, dmg: 70, n: 3 }),
      S('staticburst', '雷電爆發', 'Static Burst', 'nova', { elem: 'elec', mp: 110, dmg: 75, r: 120 }),
      S('overcharge', '超電磁', 'Overcharge', 'buff', { elem: 'elec', mp: 100, stat: 'power', amt: 0.4, dur: 10 }),
    ] },
  kai: { zh: '阿凱', en: 'Kai', elem: 'chi', hp: 450, mp: 210, atk: 1.05, def: 6, spd: 102, color: '#f4f4f4', hair: '#1a1a1a', skin: '#f0c8a0', style: 'band', pants: '#c83030',
    d: { zh: '練功的武術少年，近身最強。', en: 'A young martial artist, strongest up close.' },
    skills: [
      S('chiblast', '氣功波', 'Chi Blast', 'ball', { elem: 'chi', mp: 40, dmg: 50, spd: 320 }),
      S('whirlwind', '旋風腿', 'Whirlwind Kick', 'dash', { elem: 'chi', mp: 50, dmg: 40, spd: 300, dur: 0.6 }),
      S('dragonup', '昇龍拳', 'Dragon Uppercut', 'upper', { elem: 'chi', mp: 50, dmg: 85 }),
      S('chispread', '散彈氣功', 'Chi Spread', 'ball', { elem: 'chi', mp: 80, dmg: 35, n: 5, spread: 1, spd: 300 }),
      S('chicannon', '氣功砲', 'Chi Cannon', 'beam', { elem: 'chi', mp: 120, dmg: 100 }),
      S('ironbody', '鐵布衫', 'Iron Body', 'buff', { elem: 'chi', mp: 80, stat: 'guard', amt: 0.5, dur: 12 }),
    ] },
  robin: { zh: '小羽', en: 'Robin', elem: 'phys', hp: 380, mp: 220, atk: 1.0, def: 3, spd: 106, color: '#3a9a4a', hair: '#8a5a2a', skin: '#f6d2b0', style: 'hood', pants: '#5a4a2a',
    d: { zh: '神射手，喜歡從遠處攻擊。', en: 'A sharpshooter who fights from afar.' },
    skills: [
      S('quickarrow', '快箭', 'Quick Arrow', 'ball', { elem: 'phys', mp: 25, dmg: 40, spd: 520, arrow: true }),
      S('triplearrow', '三連箭', 'Triple Arrow', 'ball', { elem: 'phys', mp: 50, dmg: 35, n: 3, spread: 1, spd: 480, arrow: true }),
      S('backflip', '後空翻射', 'Backflip Shot', 'flip', { elem: 'phys', mp: 40, dmg: 45, spd: 500 }),
      S('pierce', '穿透箭', 'Piercing Shot', 'ball', { elem: 'phys', mp: 70, dmg: 70, spd: 620, pierce: true, arrow: true }),
      S('arrowrain', '箭雨', 'Arrow Rain', 'rain', { elem: 'phys', mp: 110, dmg: 40, n: 10, arrow: true }),
      S('hawk', '獵鷹夥伴', 'Hawk Partner', 'summon', { elem: 'phys', mp: 120, summon: 'hawk', dur: 15 }),
    ] },
  shade: { zh: '小影', en: 'Shade', elem: 'shadow', hp: 380, mp: 230, atk: 1.0, def: 3, spd: 116, color: '#5a3a8a', hair: '#2a1a3a', skin: '#ecc6a8', style: 'mask', pants: '#2a1a3a',
    d: { zh: '神出鬼沒的小忍者。', en: 'A little ninja who appears out of nowhere.' },
    skills: [
      S('shuriken', '手裏劍', 'Shuriken', 'ball', { elem: 'phys', mp: 25, dmg: 30, n: 2, spread: 1, spd: 420, star: true }),
      S('shadowstep', '影步', 'Shadow Step', 'tele', { elem: 'shadow', mp: 45, dmg: 60 }),
      S('galeslash', '疾風斬', 'Gale Slash', 'dash', { elem: 'phys', mp: 50, dmg: 55, spd: 480, dur: 0.35 }),
      S('smoke', '煙霧彈', 'Smoke Bomb', 'nova', { elem: 'smoke', mp: 70, dmg: 20, r: 120 }),
      S('clone', '影分身', 'Shadow Clone', 'summon', { elem: 'shadow', mp: 150, summon: 'clone', dur: 14 }),
      S('kunai', '追蹤苦無', 'Homing Kunai', 'ball', { elem: 'phys', mp: 100, dmg: 35, n: 4, homing: true, spd: 320, star: true }),
    ] },
  bloom: { zh: '小蓮', en: 'Bloom', elem: 'nature', hp: 380, mp: 280, atk: 0.9, def: 4, spd: 100, color: '#e86aa8', hair: '#ff9ac8', skin: '#fae0cc', style: 'flower', pants: '#3a7a3a',
    d: { zh: '溫柔的花之少女，會幫隊友補血。', en: 'A gentle flower girl who heals her team.' },
    skills: [
      S('leaf', '葉刃', 'Leaf Blade', 'ball', { elem: 'nature', mp: 30, dmg: 35, spd: 340 }),
      S('heal', '治癒之光', 'Healing Light', 'heal', { elem: 'nature', mp: 80, heal: 120, r: 160 }),
      S('vine', '藤蔓纏繞', 'Vine Snare', 'column', { elem: 'nature', mp: 60, dmg: 40, n: 3 }),
      S('petal', '花瓣風暴', 'Petal Storm', 'nova', { elem: 'nature', mp: 100, dmg: 60, r: 140 }),
      S('guardian', '守護花環', 'Guardian Bloom', 'buff', { elem: 'nature', mp: 100, stat: 'guard', amt: 0.35, dur: 12, team: true }),
      S('spring', '生命之泉', 'Spring of Life', 'heal', { elem: 'nature', mp: 160, heal: 260, r: 220, regen: true }),
    ] },
  rocky: { zh: '石頭', en: 'Rocky', elem: 'earth', hp: 520, mp: 200, atk: 1.1, def: 8, spd: 88, color: '#9a6a3a', hair: '#5a3a1a', skin: '#e0b08a', style: 'buzz', pants: '#4a4a4a', big: true,
    d: { zh: '力大無窮的大個子，很耐打。', en: 'A strong, sturdy big guy.' },
    skills: [
      S('rocktoss', '投石', 'Rock Toss', 'ball', { elem: 'earth', mp: 40, dmg: 60, spd: 260, arc: true }),
      S('boulder', '巨石滾滾', 'Boulder Roll', 'dash', { elem: 'earth', mp: 60, dmg: 60, spd: 330, dur: 0.6 }),
      S('earthspikes', '地刺', 'Earth Spikes', 'column', { elem: 'earth', mp: 70, dmg: 60, n: 3 }),
      S('quake', '地震', 'Earthquake', 'nova', { elem: 'earth', mp: 110, dmg: 80, r: 180, ground: true }),
      S('stoneskin', '岩石皮膚', 'Stone Skin', 'buff', { elem: 'earth', mp: 90, stat: 'armor', amt: 0.5, dur: 12 }),
      S('meteor', '大隕石', 'Giant Meteor', 'rain', { elem: 'earth', mp: 180, dmg: 200, n: 1, big: true }),
    ] },
};
export const HERO_IDS = Object.keys(HEROES);

// enemies: stats at level 1; `skills` are full skill objects (they cast them like heroes do)
const sk = (hero, i) => HEROES[hero].skills[i];
export const ENEMIES = {
  thug: { zh: '小混混', en: 'Thug', hp: 170, mp: 0, atk: 0.65, def: 0, spd: 85, exp: 15, gold: 6, color: '#7a7a8a', hair: '#3a2a1a', skin: '#e8c0a0', style: 'buzz', pants: '#3a3a4a', skills: [] },
  knifer: { zh: '小刀仔', en: 'Knife Kid', hp: 200, mp: 0, atk: 0.75, def: 0, spd: 95, exp: 20, gold: 8, color: '#8a3a3a', hair: '#1a1a1a', skin: '#e8c0a0', style: 'spiky', pants: '#2a2a2a', weapon: 'knife', skills: [] },
  archer: { zh: '弓箭手', en: 'Archer', hp: 200, mp: 200, atk: 0.85, def: 0, spd: 90, exp: 22, gold: 9, color: '#5a7a3a', hair: '#6a4a2a', skin: '#e8c0a0', style: 'hood', pants: '#4a3a2a', skills: [sk('robin', 0)], ranged: true },
  brute: { zh: '大塊頭', en: 'Brute', hp: 600, mp: 0, atk: 1.3, def: 6, spd: 62, exp: 45, gold: 20, color: '#6a4a3a', hair: '#2a1a1a', skin: '#d8a880', style: 'buzz', pants: '#3a2a2a', big: true, armor: 0.4, skills: [] },
  ninja: { zh: '忍者', en: 'Ninja', hp: 280, mp: 200, atk: 0.95, def: 2, spd: 120, exp: 35, gold: 14, color: '#2a2a3a', hair: '#1a1a2a', skin: '#ecc6a8', style: 'mask', pants: '#1a1a2a', skills: [sk('shade', 0), sk('shade', 1)] },
  mage: { zh: '小法師', en: 'Mage', hp: 260, mp: 260, atk: 0.9, def: 1, spd: 88, exp: 40, gold: 16, color: '#6a3aa8', hair: '#e8e8f0', skin: '#f0d0b8', style: 'hat', pants: '#3a2a5a', skills: [sk('blaze', 0), sk('frost', 0)], ranged: true },
  robot: { zh: '機器人', en: 'Robot', hp: 340, mp: 240, atk: 0.85, def: 8, spd: 80, exp: 50, gold: 22, color: '#8a9aaa', hair: '#5a6a7a', skin: '#aabaca', style: 'robot', pants: '#4a5a6a', skills: [sk('kai', 0)], ranged: true },
  // bosses
  bruno: { zh: '惡霸布魯諾', en: 'Bruno the Bully', hp: 650, mp: 200, atk: 1.15, def: 8, spd: 70, exp: 160, gold: 120, color: '#c84a2a', hair: '#1a1a1a', skin: '#d8a880', style: 'buzz', pants: '#2a2a4a', big: true, boss: true, armor: 0.35, skills: [sk('rocky', 1)] },
  banditking: { zh: '山賊王', en: 'Bandit King', hp: 950, mp: 300, atk: 1.15, def: 5, spd: 110, exp: 320, gold: 220, color: '#8a6a2a', hair: '#5a2a1a', skin: '#e0b08a', style: 'band', pants: '#3a2a1a', boss: true, weapon: 'bat', armor: 0.25, skills: [sk('shade', 2), sk('robin', 1), sk('kai', 2)] },
  shadowmaster: { zh: '影之大師', en: 'Shadow Master', hp: 1050, mp: 400, atk: 1.15, def: 6, spd: 125, exp: 520, gold: 340, color: '#1a1a2a', hair: '#c8c8d8', skin: '#ecc6a8', style: 'mask', pants: '#1a1a2a', boss: true, armor: 0.25, skills: [sk('shade', 0), sk('shade', 1), sk('shade', 4), sk('shade', 3)] },
  megabot: { zh: '巨型機器人', en: 'Mega Bot', hp: 1300, mp: 500, atk: 1.2, def: 10, spd: 72, exp: 800, gold: 500, color: '#5a6a8a', hair: '#e8402a', skin: '#9aaaba', style: 'robot', pants: '#3a4a5a', big: true, boss: true, armor: 0.4, skills: [sk('kai', 4), sk('volt', 3), sk('robin', 4)] },
  zarkon: { zh: '黑暗魔王 札康', en: 'Dark Lord Zarkon', hp: 1600, mp: 600, atk: 1.3, def: 10, spd: 100, exp: 1400, gold: 900, color: '#3a0a2a', hair: '#f0f0f0', skin: '#c8b8d8', style: 'horns', pants: '#1a0a14', boss: true, armor: 0.35, skills: [sk('blaze', 0), sk('volt', 1), sk('blaze', 4), sk('frost', 5), sk('kai', 4)] },
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
