// Chinese / English. ?lang=zh|en from the lobby wins, then the saved choice, then the browser.
const q = (typeof location !== 'undefined' && location.search.match(/[?&]lang=(zh|en)(?![a-z])/)) || null;
let lang = q ? q[1] : null;
try { if (lang) localStorage.setItem('lhb_lang', lang); else lang = localStorage.getItem('lhb_lang'); } catch (e) { /* storage blocked */ }
if (lang !== 'zh' && lang !== 'en') lang = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem('lhb_lang', l); } catch (e) { /* ignore */ } }
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en);

const S = {
  title: { zh: '小英雄齊打交', en: 'Little Heroes Brawl' }, sub: { zh: '打架升級 · 學技能 · 買裝備', en: 'Fight · Level up · Learn skills · Gear up' },
  story: { zh: '闖關模式', en: 'Story' }, survival: { zh: '生存模式', en: 'Survival' }, vs: { zh: '對戰模式', en: 'VS Battle' },
  heroes: { zh: '英雄與技能', en: 'Heroes & Skills' }, shop: { zh: '商店', en: 'Shop' }, bag: { zh: '背包', en: 'Bag' }, howto: { zh: '玩法說明', en: 'How to Play' },
  players: { zh: '玩家人數', en: 'Players' }, p1: { zh: '1 人', en: '1 Player' }, p2: { zh: '2 人（同一台）', en: '2 Players (same device)' },
  back: { zh: '返回', en: 'Back' }, close: { zh: '關閉', en: 'Close' }, start: { zh: '開始！', en: 'Fight!' }, gold: { zh: '金幣', en: 'Gold' },
  chooseHero: { zh: '選擇英雄', en: 'Choose a hero' }, chooseHero2: { zh: '2P 選擇英雄', en: '2P: choose a hero' }, chooseStage: { zh: '選擇關卡', en: 'Choose a stage' },
  recLv: { zh: '建議等級', en: 'Recommended Lv' }, locked: { zh: '未解鎖', en: 'Locked' }, cleared: { zh: '已通關', en: 'Cleared' },
  vsSetup: { zh: '對戰設定', en: 'VS setup' }, foes: { zh: '對手人數', en: 'Opponents' }, foeLv: { zh: '對手等級', en: 'Opponent level' }, ally: { zh: '電腦隊友', en: 'CPU ally' },
  none: { zh: '無', en: 'None' }, random: { zh: '隨機', en: 'Random' }, same: { zh: '和我一樣', en: 'Same as me' },
  lv: { zh: '等級', en: 'Lv' }, exp: { zh: '經驗', en: 'EXP' }, sp: { zh: '技能點', en: 'Skill points' }, hp: { zh: '體力', en: 'HP' }, mp: { zh: '魔力', en: 'MP' },
  atk: { zh: '攻擊', en: 'Attack' }, def: { zh: '防禦', en: 'Defense' }, spd: { zh: '速度', en: 'Speed' },
  equipment: { zh: '裝備', en: 'Equipment' }, skills: { zh: '技能', en: 'Skills' }, learn: { zh: '學習', en: 'Learn' }, upgrade: { zh: '升級', en: 'Upgrade' }, maxed: { zh: '已滿級', en: 'Max' },
  needLv: { zh: '需要等級', en: 'Needs Lv' }, needSp: { zh: '技能點不夠', en: 'No skill points' }, notLearned: { zh: '未學會', en: 'Not learned' },
  glove: { zh: '拳套', en: 'Gloves' }, wear: { zh: '衣服', en: 'Clothes' }, shoes: { zh: '鞋子', en: 'Shoes' }, charm: { zh: '護身符', en: 'Charm' },
  items: { zh: '道具', en: 'Items' }, buy: { zh: '購買', en: 'Buy' }, sell: { zh: '賣出', en: 'Sell' }, owned: { zh: '持有', en: 'Owned' }, equip: { zh: '裝備', en: 'Equip' }, unequip: { zh: '卸下', en: 'Remove' },
  noGold: { zh: '金幣不夠！', en: 'Not enough gold!' }, bought: { zh: '買到了！', en: 'Bought!' }, sold: { zh: '賣掉了。', en: 'Sold.' }, wornBy: { zh: '裝備中', en: 'Worn' }, shopLv: { zh: '等級', en: 'Lv' },
  quick: { zh: '戰鬥快捷道具（3 格）', en: 'Battle quick items (3 slots)' }, slot: { zh: '格', en: 'Slot' }, empty: { zh: '（空）', en: '(empty)' },
  win: { zh: '勝利！', en: 'Victory!' }, lose: { zh: '戰敗…', en: 'Defeated...' }, survived: { zh: '撐過了 {n} 波！', en: 'Survived {n} waves!' },
  gotExp: { zh: '得到經驗', en: 'EXP gained' }, gotGold: { zh: '得到金幣', en: 'Gold gained' }, levelUp: { zh: '升級！', en: 'Level up!' }, newSp: { zh: '得到技能點，去「英雄與技能」學新招吧！', en: 'You got skill points — learn new moves in Heroes & Skills!' },
  again: { zh: '再打一次', en: 'Fight again' }, next: { zh: '下一關', en: 'Next stage' }, toMenu: { zh: '回主選單', en: 'Main menu' },
  paused: { zh: '暫停', en: 'Paused' }, resume: { zh: '繼續', en: 'Resume' }, quit: { zh: '離開戰鬥（保留已得到的經驗與金幣）', en: 'Leave battle (keep the EXP and gold so far)' },
  sound: { zh: '聲音', en: 'Sound' }, on: { zh: '開', en: 'On' }, off: { zh: '關', en: 'Off' }, lobby: { zh: '大廳', en: 'Lobby' },
  combo: { zh: '招式', en: 'Input' }, mpCost: { zh: '魔力', en: 'MP' }, power: { zh: '威力', en: 'Power' },
  kos: { zh: '擊倒', en: 'KOs' }, wins: { zh: '勝場', en: 'Wins' }, battles: { zh: '戰鬥', en: 'Battles' },
  padOn: { zh: '🎮 偵測到搖桿', en: '🎮 Gamepad connected' },
  howtoText: { zh: `<b>基本操作</b><br>
1 人：方向鍵 移動　Z 攻擊　X 跳　C 防禦　（J / K / L 也可以）<br>
2 人：1P 用 WASD + F 攻擊 G 跳 H 防禦；2P 用 方向鍵 + J 攻擊 K 跳 L 防禦<br>
搖桿：左類比 / 十字鍵 移動　X / □ 攻擊　A / ✕ 跳　B / ○ 防禦　LB · RB · Y 道具　Start 暫停<br>
手機：左下搖桿，右下 攻 / 跳 / 防 按鈕，上方技能鍵<br><br>
<b>動作</b><br>
連按兩下方向 = 跑步。跑步中攻擊 = 衝撞，跑步中跳 = 飛身跳。連打三拳第三下會把敵人打飛。<br>
撿東西：站在球棒、石頭、木箱、牛奶上按攻擊。拿著石頭或木箱再按攻擊就會丟出去。<br><br>
<b>招式（技能）</b><br>
像小朋友齊打交一樣：<b>防禦 → 方向 → 攻擊/跳</b>。例如 防→前→攻 (D>A)、防→上→攻 (D^A)、防→下→跳 (DvJ)。<br>
1 人模式也可以直接按 1～6 放技能（手機按技能鍵）。快捷道具：Q / W / E。<br><br>
<b>成長</b><br>
打架得到經驗值，升級會得到技能點，在「英雄與技能」學新招、把技能升到 5 級。<br>
打倒敵人會掉金幣，可以在商店買拳套、衣服、鞋子、護身符和道具（牛奶、果汁、便當…）。每位英雄有自己的等級。`,
  en: `<b>Controls</b><br>
1 player: arrows move · Z attack · X jump · C defend (J / K / L also work)<br>
2 players: 1P uses WASD + F attack, G jump, H defend; 2P uses arrows + J attack, K jump, L defend<br>
Gamepad: stick / d-pad move · X / □ attack · A / ✕ jump · B / ○ defend · LB · RB · Y items · Start pause<br>
Phone: stick bottom left, attack / jump / defend bottom right, skill buttons on top<br><br>
<b>Moves</b><br>
Double-tap a direction to run. Attack while running = charge; jump while running = flying jump. The 3rd punch of a combo knocks foes flying.<br>
Pick things up: stand on a bat, stone, crate or milk and press attack. Holding a stone or crate, attack throws it.<br><br>
<b>Special moves (skills)</b><br>
Like the classic: <b>Defend → direction → Attack/Jump</b>. For example D>A, D^A, DvJ.<br>
In 1-player mode you can also press 1–6 to cast (skill buttons on phones). Quick items: Q / W / E.<br><br>
<b>Growing stronger</b><br>
Fighting gives EXP. Each level gives skill points: learn new moves and upgrade them to level 5 in Heroes & Skills.<br>
Beaten foes drop gold: buy gloves, clothes, shoes, charms and items (milk, juice, bento...) in the Shop. Every hero levels separately.` },
};
export const t = (k, vars) => { let s = L(S[k]) || k; if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]); return s; };

// a skill's description from its numbers
const KIND = {
  ball: { zh: '發射飛行道具', en: 'Shoots a projectile' }, dash: { zh: '向前衝刺撞飛敵人', en: 'Dashes forward, knocking foes away' },
  upper: { zh: '往上衝的上鉤攻擊', en: 'A rising uppercut' }, column: { zh: '前方連續冒出攻擊', en: 'Eruptions in a line ahead' },
  strike: { zh: '從天上打雷擊中附近敵人', en: 'Lightning strikes the nearest foes' }, nova: { zh: '以自己為中心的範圍攻擊', en: 'Hits everything around you' },
  rain: { zh: '從天上落下攻擊', en: 'Things rain down from the sky' }, beam: { zh: '超長的光線', en: 'A very long beam' }, wall: { zh: '擋住飛行道具的牆', en: 'A wall that blocks projectiles' },
  heal: { zh: '幫自己和附近隊友補血', en: 'Heals you and nearby allies' }, buff: { zh: '暫時變強', en: 'Powers up for a while' },
  summon: { zh: '召喚夥伴一起戰鬥', en: 'Summons a partner to fight' }, tele: { zh: '瞬間移動到敵人背後攻擊', en: 'Teleports behind a foe and strikes' }, flip: { zh: '往後翻同時射箭', en: 'Backflips while shooting' },
};
const ELEM = { fire: { zh: '火：會燒傷並擊倒', en: 'Fire: burns and knocks down' }, ice: { zh: '冰：會把敵人冰凍', en: 'Ice: freezes foes' }, elec: { zh: '雷：會麻痺', en: 'Lightning: stuns' },
  smoke: { zh: '煙：會讓敵人頭暈', en: 'Smoke: makes foes dizzy' }, nature: { zh: '自然：會纏住敵人', en: 'Nature: snares foes' } };
const BUFF = { power: { zh: '攻擊與速度提升', en: 'More attack and speed' }, guard: { zh: '受到的傷害減少', en: 'Take less damage' }, armor: { zh: '不容易被打倒', en: 'Hard to knock down' } };
export function skillDesc(s) {
  const parts = [L(KIND[s.kind])];
  if (s.n > 1) parts.push(lang === 'zh' ? `×${s.n}` : `×${s.n}`);
  if (s.homing) parts.push(lang === 'zh' ? '會追蹤' : 'homing');
  if (s.pierce) parts.push(lang === 'zh' ? '會穿透' : 'piercing');
  if (s.dmg) parts.push(`${t('power')} ${s.dmg}`);
  if (s.heal) parts.push(`+${s.heal} HP`);
  if (s.stat) parts.push(`${L(BUFF[s.stat])} ${Math.round(s.amt * 100)}% · ${s.dur}s${s.team ? (lang === 'zh' ? '（全隊）' : ' (team)') : ''}`);
  if (s.summon) parts.push(`${s.dur}s`);
  if (ELEM[s.elem]) parts.push(L(ELEM[s.elem]));
  return parts.join(' · ');
}
