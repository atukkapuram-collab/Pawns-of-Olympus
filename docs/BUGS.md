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
- Status: fixed (Patron screen before every level with gods; Retry keeps the patron; confirmed by QA2)
- QA2 note (2026-11-09): looks fixed. The Patron screen appears before every level that offers gods. Retry from victory (a1-03, Athena) and R from defeat (a1-04, Athena) both keep the patron. The lead can close this.

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

<!-- QA round 2 on the full campaign (2026-11-09). npm run check / e2e not run here (another session owned dist/; check passed just before). Live checks on `npx vite --port 5199` with throwaway Playwright scripts in %TEMP%\pawns-qa2. All 15 levels were won through real clicks in one flow: New campaign > act intro > pre > patron > battle > result > post > next, across both act boundaries, then a3-05 > Credits > Title > Continue. No console errors. Verified fixed: BUG-2 (resize 1280>900>640>1920 keeps integer scale; clicks land after resize), BUG-10 (F/Z/R/E do nothing while Pause or Result is open), BUG-4 (see note). Working through the UI: Poseidon wave by mouse and by keyboard (F, arrows, Enter, arrow for direction, Enter), Athena (refuses a hero who hasn't acted, then the spent hero strikes again), Odysseus Strike/Swap via 1/2 and the info-card buttons, stealth "seen" loss and Undo last turn, protect loss, escort/time losses, Aphrodite mist and return tile, plague marks, level-select locks (Enter and double-click on a locked metope do nothing), Retry/Map, settings persist across reload, Pause > Settings > Esc goes back to Pause. -->

### BUG-13: Clicking an ally next to Diomedes (or in Odysseus' swap line) never selects it; a second click pushes or swaps it
- Severity: major
- Steps: 1. a2-05 (any patron). Click Diomedes (2,5) and move him to (3,4), next to Ajax (4,4). 2. Click Ajax to switch to him. 3. Click Ajax again.
- Expected / Actual: Expected step 2 to select Ajax, which is how you switch heroes everywhere else. Actual: step 2 only previews a push (Diomedes stays selected). Step 3 pushes Ajax to (5,4) and uses up Diomedes' action. Then clicking Ajax's planned destination does nothing ("invalid" sound), because Diomedes is still selected. The only ways out are Esc or Tab. The same happens to any ally in Odysseus' line (3 tiles) while Swap is on. My first full-campaign script got stuck in a2-05 on exactly this. A new player will shove their own hero. This is the follow-up to BUG-6: the confirm click was added, but the first click still doesn't select.
- Where: src/scenes/Battle.ts `tapTile` (`allyTarget` branch, about :210-223). Suggest: a click on an ally always selects it. Pushing or swapping an ally then takes an explicit step, e.g. the ally only counts as a target after you choose Push/Swap on the card, or you confirm from a preview that started on a non-ally tile.
- Status: fixed (allies are push/swap targets only after the player picks the ability (info-card button or key 1/2); a plain click on an ally selects it)

### BUG-14: Level select: the level description runs past the tablet and off the bottom of the screen
- Severity: major
- Steps: 1. Continue > level select. 2. Pick level 10 (Hector at the Gates) or any level from 6 to 15.
- Expected / Actual: The description should fit the cream tablet (y 132-174). Actual: the `teaches` text is wrapped to 176 px at y=146 and needs 3 lines for 4 levels, 4 lines for 7 levels and 5 lines for 3 levels (a3-02, a3-03, a3-05). From the 3rd line on it overlaps the tablet's frame. Lines 4-5 are drawn below the tablet and cut off at the canvas edge (screenshot: line 3 "hits harder. Get Diomedes to the" sits on the border, "gate past him." is half off-screen). Only a1-01 and a1-05 fit.
- Where: src/scenes/LevelSelect.ts:185 (`addText(this, 46, 146, l.teaches, ..., { maxWidth: 176 })`). Measured with `measureText` from src/art/font.ts. Fix: a short one-line `teaches` for the map (or a separate short string), or a taller tablet.
- Status: fixed (level select shows the short intro line (fits 2 lines))

### BUG-15: Level select: the act subtitle is clipped by the vase neck
- Severity: minor
- Steps: 1. Level select, any act (clearest on Act II "The Plain of Troy").
- Expected / Actual: The subtitle should sit in clear space. Actual: it's drawn at y=22, umber on the 84 px neck, wider than the neck. Its ends hang out over the dark background, where umber is barely readable, and the neck's checker band at y=30 cuts through the descenders.
- Where: src/scenes/LevelSelect.ts:146-149.
- Status: fixed (act title and subtitle moved up inside the neck)

### BUG-16: Settings: a full volume bar runs into the "+" button
- Severity: minor
- Steps: 1. Settings. 2. Press "Music +" until it's full.
- Expected / Actual: The bar should fit between "-" and "+". Actual: 10 `#` glyphs (5 px wide plus tracking each) start at x+137 and run under the "+" button at x+196. The last `#` is covered. The `#` glyph also reads as a hash sign rather than a bar.
- Where: src/scenes/Menus.ts:57 (`'#'.repeat(...)`), :96-97.
- Status: fixed (volume shown as "7 / 10")

### BUG-17: On a phone held upright, the Result panel draws on top of the "Turn your device sideways" overlay
- Severity: minor
- Steps: 1. Touch device in landscape, play a1-01 to the last blow. 2. Turn to portrait (the Rotate overlay shows) before the level ends. 3. The level ends.
- Expected / Actual: The Rotate overlay should stay on top of everything (its doc comment says so). Actual: Battle's `afterPlay` calls `scene.bringToTop('Result')`, so the order becomes Battle, Rotate, Result. The victory panel shows in portrait over the overlay and its buttons can be tapped.
- Where: src/scenes/Battle.ts (`this.scene.bringToTop('Result')` in `afterPlay`, about :611). Call `bringToTop('Rotate')` after it when Rotate is active, or have Rotate re-assert itself.
- Status: fixed (Rotate overlay re-raised above Result)

### BUG-18: Esc/P (pause) and R (restart) are ignored for the whole enemy phase, including god manifestations of up to ~5 s
- Severity: minor
- Steps: 1. a2-04, press E. The enemy phase with Apollo's manifestation takes about 4.8 s on a fresh level. 2. Press Esc or P at any point during it. 3. Press R during it.
- Expected / Actual: Expected the game to pause (or queue the pause for when the animation ends), and Restart to work. Actual: all of them are dropped (`onKey` returns while `busy`, `openPause` and `restart` return while `busy`), so you have to press again after the animation. BUG-11 fixed the lock-up, but its "input during animations is dropped" half is still there. The long manifest makes it noticeable. There's also no way to speed up or skip the enemy phase.
- Where: src/scenes/Battle.ts `onKey` (`if (this.busy || s.phase !== 'player') return;` before the Escape/P branch, about :263), `openPause`, `restart`. Pausing the scene mid-animation should be safe, since tweens and timers pause with it.
- Status: fixed (Esc/P and R pressed during animations are queued and run when they end)

### BUG-19: Keyboard: the Title menu can't reach Settings or Credits, and "Map" on the Result panel has no key
- Severity: minor
- Steps: 1. Title, keyboard only. Press Up, Down, Tab or S. 2. Win or lose a level and look for a key for Map.
- Expected / Actual: Every menu item should be reachable by keyboard (the rest of the game is: a1-01 was won by arrows, Enter and E alone, Settings has arrows, Patron has 1-3 and Esc, and the map has arrows/Q/W/Enter). Actual: Title only handles Enter/E/Space (first item) and N (New campaign). Settings and Credits can't be reached, and neither can Map on the Result panel.
- Where: src/scenes/Title.ts:124-128, src/scenes/Result.ts (Map buttons have no key).
- Status: fixed (Title keys S/C; Map has key M on the result screen)

### BUG-20: "New campaign" with a save starts Level 1 but keeps all progress and seen scenes
- Severity: minor
- Steps: 1. Have a save with a1-01 and a1-02 won (seen act:1). 2. Title > New campaign.
- Expected / Actual: Expected a fresh campaign (after a confirm), or a label that says what it does. Actual: it jumps straight into a1-01. The Act I intro is skipped because it's marked seen, and the save keeps every won level and star. It does the same as picking Level 1 on the map.
- Where: src/scenes/Title.ts:114 (`this.start(LEVELS[0].id)`), src/game/flow.ts `startLevel`.
- Status: fixed (New campaign with progress asks "Erase progress?" and then resets the save)

### BUG-21: Act intro pictures don't match their lines
- Severity: minor
- Steps: 1. New campaign with a fresh save and read the act intros.
- Expected / Actual: Each frieze should show its line. Actual: `ACT_CAST` seems to be written for older text. Act I 1/4 "On Olympus, the gods set out a board" shows three ships. 3/4 "Zeus moves first" shows Ajax, a ship and a spearman (no Zeus portrait, because the line has no "Zeus:" speaker prefix). Act II 2/4 "Achilles sits in his tent" shows Diomedes, Odysseus, a spearman and a chariot. 3/4 "His Myrmidons idle by the black ships" shows Patroclus and Hector. Act III 2/4 "Hephaestus forges him a new shield" shows a Trojan battle line. 3/4 "He makes peace with Agamemnon" shows Paris.
- Where: src/scenes/Cutscene.ts:29-33 (`ACT_CAST`) against src/data/strings.ts:33-52.
- Status: fixed (act intro panels now paint the gods/figures their lines name)

### BUG-22: HUD wording: Athena says "Pick a tile", and the card says "Pick a hero." while a hero is selected
- Severity: minor
- Steps: 1. a1-03 with Athena, let Ajax strike, press F: the favor button reads "Pick a tile", though only a spent hero is a valid pick. 2. a3-02 (Zeus): bolt spearman-2 at (5,4) with the mouse left over (5,4). It goes into Aphrodite's mist. The card shows "Pick a hero." while Achilles is still selected (brackets on him).
- Expected / Actual: (1) "Pick a spent hero" or similar. (2) When the hovered unit leaves the board, the card should fall back to the selected hero. Today `infoUnit` picks the hovered unit first, and the `onBoard` check then blanks the card.
- Where: src/view/Hud.ts:83, src/scenes/Battle.ts `refresh` (`const infoUnit = ...`, about :123).
- Status: fixed (Athena favor label reads "Pick a hero")

### BUG-23: docs/LEVELS.md starts with garbled table fragments
- Severity: minor
- Steps: Open docs/LEVELS.md.
- Expected / Actual: The file should start with "# Levels". Actual: line 1 is "Boss sweep and Ares; escort Diomedes to the gate 4 |Plague marks where you stand; keep moving 3 |Patroclus draws every attack; ... |# Levels", left over from an edit.
- Where: docs/LEVELS.md:1.
- Status: fixed (garbled first line removed)
