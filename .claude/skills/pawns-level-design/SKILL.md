---
name: pawns-level-design
description: Level format, design principles, difficulty curve and the solution-replay requirement for Pawns of Olympus. Load when creating, editing, balancing or reviewing levels in src/data/levels/.
---

# Pawns of Olympus: level design

Rules of play: `docs/GDD.md`. Campaign list: `docs/LEVELS.md`. Engine types: `src/core/types.ts` and `src/core/level.ts`.

## File format (`src/data/levels/<id>.json`)
```json
{
  "id": "a1-01",
  "act": 1,
  "index": 1,
  "title": "The Landing",
  "teaches": "Move, then strike",
  "board": ["########", "#......#", "#......#", "########"],
  "legend": { ".": "ground", "#": "rock" },
  "units": [
    { "type": "achilles", "x": 2, "y": 2 },
    { "type": "spearman", "x": 5, "y": 2, "facing": "left" }
  ],
  "objective": { "type": "rout" },
  "patrons": ["zeus"],
  "trojanEvent": null,
  "par": 2,
  "maxTurns": 6,
  "intro": "lvl.a1-01.intro",
  "outro": "lvl.a1-01.outro",
  "solution": { "patron": "zeus", "turns": [[["move", "achilles", 4, 2], ["act", "achilles", "strike", 5, 2], ["endTurn"]]] }
}
```
- Board rows are strings; every char must be in `legend` (standard chars: `.` ground, `#` rock, `~` deep water, `S` ship, `^` fire, `%` dry brush, `G` gate, `*` torchlight, `,` sand). Coordinates are `x` (column) and `y` (row), origin top-left.
- `facing` on an enemy is the direction of its first telegraphed attack (`up|down|left|right`).
- Objectives: `rout`, `survive {turns}`, `protect {target:"ships", turns, minShips}`, `escort {unit, x, y}`, `stealth {x, y}`.
- `solution.turns` is a list of player turns; each turn is a list of actions ending in `["endTurn"]` (the final winning turn may omit it if the win happens mid-turn).
- Action forms: `["move", hero, x, y]`, `["act", hero, ability, x, y]`, `["favor", god, x, y]` (Zeus/Athena), `["favor", "poseidon", x, y, dir]`, `["endTurn"]`.

## Design principles
1. **One new idea per level.** Name it in `teaches`. Everything else on the board should be familiar.
2. **Smallest board that teaches it.** 4 to 8 columns × 4 to 7 rows (screen limit). The board edge is a wall; no rock border needed. Fewer units is better.
3. **Every turn is a puzzle with a real choice**, never a single forced move. But there is always at least one clean solution.
4. **Telegraphs are the puzzle.** The best moments make enemies hit each other, hit nothing, or get pushed into water.
5. **Par is fair:** Act I has 1 turn of slack over the recorded solution, Act II about half a turn, Act III none.
6. **No randomness.** Enemy AI is deterministic; the recorded solution must replay identically.
7. Level 1 must be winnable by someone who has never played a tactics game.

## Required checks (`npm run validate-levels`)
- Schema valid, all legend chars known, units on passable tiles, no overlaps, heroes unique.
- The recorded solution replays to a **win within par**.
- Linter: fails if the level can be won in 1 turn; warns if a turn has only one sensible move or if no enemy intent is ever redirected.

## Difficulty curve (approachable but thinky)
Act I teaches verbs one at a time with generous HP. Act II combines two ideas per level and introduces Trojan gods. Act III expects planning across 2–3 turns, and the finale combines everything.
