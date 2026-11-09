# Progress

## Done
- M0 setup. M2 rules engine (61 tests, 95% line coverage of core, 3 levels validate).
- M1 art, two passes (round-1 review fixes applied: Geometric proportions, selection, threats on occupied tiles, Zeus, meander, night figure remap, splayed M/W). Formal re-review still to run.
- M3 playable slice: Boot -> Title -> Battle -> Result. BoardView (tiles, rocks, fire, water, units, pips, intents with order badges and arrow lanes, move/target/cursor overlays, selection), HUD (title strip, info card, Trojan order with glyphs, Zeus/End turn/Undo/Restart), animations (move, strike + hit-stop, attack, push, bump, swap, charge, pottery shatter, number pops, banners, bolt), procedural SFX synth, save of stars, test hook `window.__POO__`. Input: mouse, touch (tap to preview, tap to confirm), keyboard (arrows/WASD, Enter, Tab, E, Z, R, F, Esc, 1/2). e2e: Level 1 won through the UI on desktop and touch, Level 2 with Zeus, undo/restart, keyboard. `npm run check` green.

## In progress
- Style review round 2 + QA round on the playable slice (subagents), then M4 full cast.

## Next exact step
- Spawn style-reviewer (round 2, real battle screenshots) and qa-tester in background; start M4: chariot, Hector, Paris sprites; god portraits for Athena, Poseidon, Apollo, Ares, Aphrodite; Athena/Poseidon favor UI (Poseidon direction picker); ability toggle UI for Odysseus.
