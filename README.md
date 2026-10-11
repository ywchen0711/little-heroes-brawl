# 小英雄齊打交 · Little Heroes Brawl

A 2.5D brawler for kids in the spirit of the classic *Little Fighter* games, with an RPG layer on top.

**Fighting earns EXP. Levels give skill points to learn and upgrade special moves. Gold buys equipment and items.**

It plays in the browser, in Chinese or English, with keyboard, gamepad or touch, alone or with two players on the same device.

## Look

The art follows the style of action manga such as *One Punch Man*:
- inked characters with hard cel shading, screentone and sharp manga eyes;
- paper-and-ink stages with halftone shading;
- speed lines and focus lines;
- sound-effect lettering (砰！轟！ / BAM! BOOM!) and short impact frames on knockouts.

The heroes and story are original.

## Heroes

Four heroes, each levelling up separately, each with 6 special moves:

| Hero | Style | Moves |
|---|---|---|
| **Josh** | Flame brawler, hits hardest | Fireball, Flame Rush, Rising Flame, Fire Pillars, Inferno, Meteor Rain |
| **Jasper** | Lightning ninja, fastest | Spark Shot, Thunder Step, Gale Slash, Chain Lightning, Shadow Clone, Lightning Strike |
| **Jeff** | Earth powerhouse, toughest | Rock Toss, Boulder Roll, Dragon Uppercut, Earth Spikes, Earthquake, Stone Skin |
| **Erin** | Ice mage, freezes and heals | Ice Ball, Ice Spikes, Healing Light, Frost Beam, Blizzard, Icicle Rain |

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

The keyboard layout keeps both hands in a natural resting position.

**1 player**

| | Keys |
|---|---|
| Move | **W A S D** (left hand) — or the arrow keys |
| Attack / Jump / Defend | **J / K / L** (right hand resting on the home row) — or Z / X / C |
| Skills 1–3 | **U I O** (the row right above J K L) |
| Skills 4–6 | **M , .** (the row right below J K L) |
| Items | **Q E R** (next to WASD) |
| Run | hold **Shift**, or double-tap a direction |
| Pause | **Esc** |

**2 players on one keyboard:** 1P uses **WASD + F G H** (items R T Y, skills 1–6). 2P uses the **arrows + K L ;**, or numpad 1 2 3 (items I O P).

**Gamepad:** the stick or d-pad moves. Attack is X / □, jump is A / ✕, defend is B / ○. Items are on LB, RB and Y. RT runs and Start pauses.

**Phone:** a stick on the left and attack / jump / defend buttons on the right, with skill and item buttons.

Every move can also be cast with the classic *Defend → direction → Attack/Jump* input, e.g. D>A.

- Double-tap a direction or hold Shift to run.
- Attack while running for a charge, and jump while running for a flying jump.
- The third punch of a combo knocks the foe flying.

## Development

The game is plain ES modules with no build step. Serve the folder and open `index.html`.

```
npm test     # node tools/test.mjs
```

`tools/test.mjs` checks:
- the progression rules;
- that every skill of every hero works (and that old 8-hero saves migrate);
- the combo input and the punch combo;
- that bots at the recommended levels clear all five stages, while a level-1 hero can't clear the last one;
- survival, rewards, and two players clearing a stage together.
