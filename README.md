# 小英雄齊打交 · Little Heroes Brawl

A 2.5D brawler for kids in the spirit of the classic *Little Fighter* games, with an RPG layer on top.

**Fighting earns EXP. Levels give skill points to learn and upgrade special moves. Gold buys equipment and items.**

It plays in the browser, in Chinese or English, with keyboard, gamepad or touch, alone or with two players on the same device.

## Heroes

There are 8 original heroes, and each one levels up separately. Every hero has 6 special moves, cast with the classic *Defend → direction → Attack/Jump* inputs.

| Hero | Style | Moves |
|---|---|---|
| 炎仔 Blaze | Fire, hits hard | Fireball, Flame Rush, Rising Flame, Fire Pillars, Inferno, Meteor Rain |
| 冰冰 Frost | Ice, freezes foes | Ice Ball, Ice Spikes, Ice Wall, Frost Beam, Blizzard, Icicle Rain |
| 雷霆 Volt | Lightning, fastest | Spark Shot, Thunder Step, Chain Lightning, Lightning Strike, Static Burst, Overcharge |
| 阿凱 Kai | Martial artist | Chi Blast, Whirlwind Kick, Dragon Uppercut, Chi Spread, Chi Cannon, Iron Body |
| 小羽 Robin | Archer | Quick Arrow, Triple Arrow, Backflip Shot, Piercing Shot, Arrow Rain, Hawk Partner |
| 小影 Shade | Ninja | Shuriken, Shadow Step, Gale Slash, Smoke Bomb, Shadow Clone, Homing Kunai |
| 小蓮 Bloom | Healer | Leaf Blade, Healing Light, Vine Snare, Petal Storm, Guardian Bloom, Spring of Life |
| 石頭 Rocky | Big and tough | Rock Toss, Boulder Roll, Earth Spikes, Earthquake, Stone Skin, Giant Meteor |

## Growing stronger

- **EXP:** you earn it by hitting and knocking out foes, and by clearing stages and survival waves.
- **Skill points:** every level gives 1 (2 every fifth level). Learning a skill costs 1 point. Upgrading costs 1 point per level, up to level 5, and each upgrade also needs a higher hero level. Upgrades add damage, extra projectiles, healing and duration, and lower the MP cost.
- **Gold:** knocked-out foes drop gold coins. Spend gold in the shop:
  - equipment in four slots: gloves (attack), clothes (defence and HP), shoes (speed and jump) and charms (gold+, EXP+, MP, critical hits, revive);
  - items you use in battle: milk, juice, bento, rainbow candy, energy drink, bombs.

## Modes

- **Story:** 5 stages, each with 4 waves ending in a boss. The stages are the Park, the Forest, Ninja Village, the Robot Factory and the Dark Castle; the bosses are Bruno the Bully, the Bandit King, the Shadow Master, the Mega Bot and Dark Lord Zarkon.
- **Survival:** endless waves, with a boss every fifth wave.
- **VS:** fight 1 to 3 CPU heroes at your level, or a stronger or weaker level, with an optional CPU ally.
- **Arena items:** bats, knives, stones, crates and milk bottles lie around the arena and fall from the sky.

## Controls

| | 1 player | 2 players (1P / 2P) | Gamepad | Touch |
|---|---|---|---|---|
| Move | Arrows | WASD / Arrows | Stick / d-pad | Stick |
| Attack | Z or J | F / J | X / □ | 👊 |
| Jump | X or K | G / K | A / ✕ | ⤴ |
| Defend | C or L | H / L | B / ○ | 🛡 |
| Skills | 1–6, or combos | combos | combos | skill buttons |
| Items | Q W E | R T Y / U I O | LB RB Y | item buttons |
| Pause | Esc / P | Esc / P | Start | ⏸ |

- Double-tap a direction to run.
- Attack while running for a charge, and jump while running for a flying jump.
- The third punch of a combo knocks the foe flying.

## Development

The game is plain ES modules with no build step. Serve the folder and open `index.html`.

```
npm test     # node tools/test.mjs
```

`tools/test.mjs` checks:
- the progression rules;
- that every skill of every hero works;
- the combo input and the punch combo;
- that bots at the recommended levels clear all five stages, while a level-1 hero can't clear the last one;
- survival, rewards, and two players clearing a stage together.
