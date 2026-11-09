# Progress

## Done
- M0 setup (see ROADMAP). `npm run check` green.
- M1 first pass: palette (32), pixel primitives, Stele font, figure recipes for 5 heroes + 3 Trojans, Zeus portrait, tiles, overlays, UI frames, backdrops, gallery, STYLE_GUIDE.md, palette test. Style review round 1 done (needs work: 12 items in PLAYTEST_LOG.md).
- M2 rules engine: src/core (types, board, combat, ai, rules, level, session, replay, lint), 3 levels (a1-01..03) validate, 61 tests, 95% line coverage of core. `tools/level-trace.ts` prints a level turn by turn.

## In progress
- M1 fix round 2 (style-review items), then M3 playable slice.

## Next exact step
- Apply style fixes 1–12 from PLAYTEST_LOG round 1 in src/art, then build Phaser BattleScene (src/view board renderer + HUD + input).
