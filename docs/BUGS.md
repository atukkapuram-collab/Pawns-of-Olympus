# Bugs

*Filed by qa-tester and the lead. Format in `.claude/agents/qa-tester.md`.*

<!-- QA round 1 on M3 (2026-11-09). npx vitest run: 61/61 pass. validate-levels: 3/3 ok. npm run check / e2e not run (another session owned dist/). Live checks on `npx vite --port 5199` with throwaway Playwright scripts. -->

### BUG-1: Animations play over the final state (units teleport, targets vanish early, enemy phase shows next turn)
- Severity: major
- Steps: 1. a1-01: select Achilles, click (4,3). Trace the sprite each frame: x jumps 48 -> 120 (the destination) at once, then slides back to 72 (path[0]) and forward again. 2. Strike spearman-1 (4,2): its sprite is hidden the moment you click, before the wind-up and the blow. 3. a1-03: Ajax to (4,2), press E, look during the "Trojans act" banner: spearman-1 already stands on its repositioned tile (4,1) and the badges/threats show NEXT turn's intents (all three on Ajax). Its real attack (thrust down from (5,0)) never shows. In a1-01 spearman-2 snaps (5,4) -> (5,3) 11 ms into the enemy phase.
- Expected / Actual: The board shows the pre-action state and animations move it step by step (GDD §1: the enemy phase resolves "one by one in number order", which is the core readability promise). Actual: `play()` calls `this.refresh()` first with `session.state` already final. `BoardView.refresh` snaps every sprite with `placeUnit`, hides dead units and redraws intents from the final state. The `'phase'` event calls `refresh()` again.
- Where: src/scenes/Battle.ts:371-372 (`busy = true; refresh()` at the start of `play`), Battle.ts:505 (`case 'phase'` refresh), src/view/BoardView.ts:188-207 (`refresh` places every unit). Fix idea: refresh overlays only (no `placeUnit`/visibility) while busy, or keep the previous state for drawing until the events finish.
- Status: fixed (animations now play over the pre-action board; snap to new state at the end)

### BUG-2: Canvas never shrinks after the window gets smaller (HUD ends up off-screen)
- Severity: major
- Steps: 1. Open at 1280x720 (canvas 1280x720, x4). 2. Resize the viewport to 900x600 or 500x400. 3. Grow to 1920x1080, then back to 1280x720.
- Expected / Actual: Expected the largest integer scale that fits (x2 at 900x600, x1 at 500x400). Actual: the canvas stays 1280x720 (then 1920x1080 after growing) and is cropped. End turn, Undo and Restart sit off-screen. A fresh load at 500x400 gives 320px, so only resizing is broken. Rotating a phone or un-maximizing a window strands the player.
- Where: src/game/scaler.ts:20 measures `#game` (`host.getBoundingClientRect()`). index.html:19 makes `#game` a grid item that grows to fit the canvas, so the host never gets smaller than the current canvas. Measure `window.innerWidth/innerHeight` (minus safe-area padding) instead, or give `#game` `min-width:0; min-height:0; overflow:hidden`.
- Status: fixed (scaler measures the visual viewport)

### BUG-3: Poseidon wave: units behind a blocked lead also collide, so the lead takes double impact
- Severity: major
- Steps: 1. Patron Poseidon, row 0 `.....` with spearman (3,0) and spearman (4,0) against the right edge. 2. Favor Poseidon at row 0, direction right.
- Expected / Actual: GDD §10 says "a chain moves together; only the lead can collide": the lead takes 1 impact and the chain stays. Actual: the lead bumps the edge (1 impact), then the follower is pushed into the lead and both take 1 more. The lead takes 2 total and dies (spearman HP 2). With 3 in a row against a wall, a lead that dies from the first bump lets the followers move into the empty tile.
- Where: src/core/rules.ts:159 (`for (const u of inLine) push(...)` pushes each unit on its own). The test "Poseidon: the wave pushes a whole row" does not cover a blocked lead.
- Status: fixed (GDD updated to the implemented chain rule (DECISIONS 17) + test)

### BUG-4: No way to pick a patron; Retry/Next from Result drop the patron
- Severity: minor
- Steps: 1. Title > Continue/New campaign: Battle starts with `level.patrons[0]`, so a1-03 is always Zeus and Athena can't be reached. 2. Start a1-03 with Athena (test hook), win or lose, press Retry: it comes back with Zeus. In-battle Restart keeps the patron, so the two paths disagree.
- Expected / Actual: GDD §10 "pick one patron per level". Retry should keep the patron.
- Where: src/scenes/Result.ts:97 (`scene.start('Battle', { levelId })` with no patron), src/scenes/Title.ts:48, src/scenes/Battle.ts init (falls back to `patrons[0]`). M4 already plans the patron UI; Retry should pass `patron` now.
- Status: open

### BUG-5: Favor mode fires at once on any clicked tile, including your own heroes
- Severity: minor
- Steps: 1. a1-02 (Zeus). Press F. 2. Click Achilles, for example to "cancel" or re-select.
- Expected / Actual: Expected the click to select the hero or ask for confirmation. Actual: lightning hits Achilles for 2 (4 -> 2 HP) and the once-per-level favor is spent. Undo recovers it, but a new player won't know that. Mouse and keyboard skip the preview step that touch has. Also, a Zeus bolt on an empty tile is accepted and wastes the favor.
- Where: src/scenes/Battle.ts:168 onward (`tapTile` favor branch: `confirmed` is always true for mouse/keyboard).
- Status: fixed (Zeus on a Greek needs a confirm click)

### BUG-6: With Diomedes or Odysseus (swap) selected, clicking a nearby ally pushes or swaps it instead of selecting it
- Severity: minor (no Diomedes or Odysseus in a1-01..03 yet; major once they appear)
- Steps: 1. Diomedes selected with an ally next to him. 2. Click the ally to switch heroes.
- Expected / Actual: Expected the click to select the ally. Actual: `isTarget` is checked before "tapped a Greek -> select", and push/swap targets include allies, so a mouse click pushes the ally at once. Touch previews first, which is less bad.
- Where: src/scenes/Battle.ts:192 (`if (sel && isTarget)` comes before `if (here && here.team === 'greek')` at :198).
- Status: fixed (ally targets need a confirm click; first click previews)

### BUG-7: Enemy AI tie-break goes by tile before direction, the opposite of GDD
- Severity: minor
- Steps: 1. 5x5 open board, Achilles (0,1), spearman (2,2). 2. `planFor` (vite-node probe).
- Expected / Actual: GDD §6 says ties break "by fixed direction order (up, right, down, left) then row-major tile order". So (0,2) facing up (2 steps, score 10) should win. Actual: it picks (1,1) facing left (same score, same path length) because the loop runs over tiles first and directions second, and keeps the first one it finds.
- Where: src/core/ai.ts:50-62. Fix the loop order or the GDD, and log the choice in DECISIONS.md.
- Status: fixed (GDD updated to the implemented tie-break order)

### BUG-8: Ships next to fire take 1 fire damage each enemy phase, which GDD doesn't mention
- Severity: minor
- Steps: 1. Board `.S^..` (ship next to fire), survive objective. 2. End turn: the ship takes 1 fire damage.
- Expected / Actual: GDD §7 only burns units standing in fire or on brush the fire tries to spread into. The code (and test "ships beside fire burn") also burns adjacent ships. It's probably intended for a1-04 "Fire at the Ships", but GDD/UNITS need the rule, and players need a telegraph for it.
- Where: src/core/rules.ts:311-317.
- Status: fixed (documented in GDD tiles table)

### BUG-9: Stealth: a hero pushed, swapped or waved onto the gate doesn't escape
- Severity: minor
- Steps: 1. Stealth level, Achilles one tile left of the gate, Poseidon. 2. Wave the row toward the gate.
- Expected / Actual: Expected Achilles to escape ("all heroes reach the gate"). Actual: he stands on the gate tile with `escaped` unset. Only a `move` action sets `escaped`. He has to step off and walk back on later. Same for Odysseus' swap and Diomedes' push.
- Where: src/core/rules.ts:89-92 (escape handled only in `case 'move'`).
- Status: fixed (any hero on the gate escapes after any action)

### BUG-10: Battle keyboard and HUD stay live under the Result screen
- Severity: minor
- Steps: 1. Win a1-01 so Result shows. 2. Press R. 3. Or click where the Battle HUD's Restart button sits under the dithered veil.
- Expected / Actual: Expected only Result to handle input. Actual: R fires Result's Retry (`scene.start('Battle')`) AND Battle's `hud.restart.press()`, so Battle's `create` runs twice (two `poo:ready` events). The Battle HUD Restart is clickable through the veil (restarts and closes Result), and hovering the board under the veil changes the info card. Today these only restart, but every new shortcut added to Battle will leak through.
- Where: src/scenes/Battle.ts:84 (keyboard), :233 (`KeyR`). Gate `onKey`/`onHover` and the HUD on `scene.isActive('Result')`, or pause Battle input while Result is open.
- Status: fixed (Battle ignores input while Result is open)

### BUG-11: Input during animations is dropped, and an animation error locks the level for good
- Severity: minor
- Steps: 1. a1-02: press E, then R while "Trojans act" plays: the restart is ignored and has to be pressed again. The same goes for Z during a move. 2. Code reading: if anything in `play()` throws (it runs as `void this.play(...)`), `busy` stays true. Restart is also gated on `!busy` (Battle.ts `restart()` and Hud `restart.setEnabled(!busy)`), so the only way out is a page reload. 3. `settleWaiters` isn't cleared on scene restart, so `__POO__.settle()` hangs if `startLevel` runs mid-animation.
- Expected / Actual: Restart should always work, and ideally interrupt an animation. Wrap `play()` in try/finally so `busy` is cleared.
- Where: src/scenes/Battle.ts:323-324 (`restart` returns when busy), :370-551 (`play`), :46 (`settleWaiters`).
- Status: fixed (play() wrapped in try/finally)

### BUG-12: Doc drift: a1-01 patron
- Severity: minor
- Steps: Compare docs/LEVELS.md (a1-01 patrons "Zeus") and GDD §10 ("Zeus from L1") with src/data/levels/a1-01.json (`"patrons": []`).
- Expected / Actual: They should agree. Level 1 has no favor button.
- Where: src/data/levels/a1-01.json, docs/LEVELS.md.
- Status: fixed (LEVELS.md and GODS.md corrected)
