# Architecture

## Layers
```
src/data (units, gods, levels/*.json, strings)      plain data, no logic
      │
src/core  (pure TS rules engine, deterministic)     no Phaser, no DOM, lint-enforced
      │  state + events
src/view  (board renderer, unit views, intents, HUD, effects)   Phaser objects
src/scenes (Boot, Title, LevelSelect, PatronSelect, Battle, ...)  flow + input
src/art   (palette, primitives, recipes → canvas textures at boot)
src/audio (ZzFX sfx, Web Audio sequencer)
src/game  (config, scaler, save, settings)
```

## Core data flow
- `loadLevel(levelData, patron) → GameState` (`src/core/level.ts`): parses the board, places units, sets initial intents.
- `applyAction(state, action) → { state, events }` (`src/core/rules.ts`): **pure**. Never mutates its input (it clones first). `events` is an ordered list of what happened (`moved`, `struck`, `pushed`, `damaged`, `defeated`, `swept`, `swapped`, `intentResolved`, `fireSpread`, `godAppears`, `phase`, `won`, `lost`…). The view animates events in order; the core never waits for the view.
- `Session` (`src/core/session.ts`): wraps a state with undo history (snapshots of the current player phase) and "undo last turn" (snapshot at the start of each player phase).
- `replaySolution(level) → result` (`src/core/replay.ts`): used by the validator, unit tests and e2e checks.
- Enemy AI (`src/core/ai.ts`) is a pure function of the state; ties break by fixed orders, so replays are identical.

## State model (simplified)
```ts
GameState {
  levelId, turn, phase: 'player' | 'enemy' | 'won' | 'lost',
  width, height, tiles: TileKind[] (row-major), fire: boolean[],
  units: Unit[]  // { id, type, team: 'greek'|'trojan'|'object', x, y, hp, maxHp, facing, moved, acted, intent?, status }
  patron, favorUsed, objective, trojanEvent, eventState,
  stats: { heroesFallen, turnsUsed }, rngFree: true
}
```
Units keep stable ids (`achilles`, `spearman-1`, `ship-1`…). Intent order = order of living Trojans in `units`.

## Save format (`localStorage['pawns-of-olympus/save']`)
```json
{ "version": 1, "levels": { "a1-01": { "won": true, "stars": [true, true, false] } }, "unlockedPatrons": ["zeus"], "lastLevel": "a1-01", "seenScenes": ["act1"] }
```
Settings live separately under `pawns-of-olympus/settings` (volumes, shake, reducedMotion, highContrast). Both are read in try/catch; unknown versions go through `migrate()` (stub) and fall back to defaults.

## Rendering
- All art is generated at boot from recipes in `src/art/` into canvas textures (`scene.textures.addCanvas`). No image files ship.
- Board origin and tile size come from `src/view/layout.ts`; positions are always whole pixels.
- Night levels re-render the same recipes through a palette-swap map.

## How to add…
- **A level:** add `src/data/levels/<id>.json` (format: `.claude/skills/pawns-level-design/SKILL.md`), add strings to `src/data/strings.ts`, run `npm run validate-levels`.
- **A unit:** add stats to `src/data/units.ts`, its intent shape (enemy) or ability (hero) in `src/core/`, a sprite recipe in `src/art/sprites/`, tests in `tests/`, a row in `docs/UNITS.md`.
- **A god:** add to `src/data/gods.ts`, implement the favor/event in `src/core/gods.ts`, add portrait + manifestation recipes, sounds, strings, tests, and a row in `docs/GODS.md`.
