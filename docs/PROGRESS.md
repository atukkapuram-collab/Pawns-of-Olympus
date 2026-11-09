# Progress

## Done
- M0 setup, M2 rules engine (63 tests), M3 playable slice (e2e wins L1 through the UI, desktop + touch).
- M1 art: two review rounds applied (see PLAYTEST_LOG). M4 cast art: Hector, Paris, chariot; portraits for all 6 gods; Poseidon/Athena favor UI; ability toggle; mist marker.
- QA round 1: 11 of 12 bugs fixed (BUG-4 patron picker fixed by M6 Patron screen).
- Act I complete: a1-01..a1-05 validate.
- M6 screens: campaign flow (src/game/flow.ts), Cutscene (act intros + pre/post scenes), Patron select, amphora Level select, Settings, Pause (Esc/P), Credits; save of stars and seen scenes; lettered title screen with marching frieze.
- Story text for all 15 levels + god banter + epigraphs (lore-keeper), credited in CREDITS.md.
- M7 partial: SFX synth, music sequencer (Greek modes, per act), god manifestations with banter, pottery shatter, hit-stop, shake.

## In progress
- Acts II and III levels being designed by two level-designer agents (src/data/levels/a2-0*.json, a3-0*.json are uncommitted WIP until they report back and validate).

## Next exact step
1. When the level agents report: run `npm run validate-levels`, fix/adjust, commit Acts II-III, fill pars in docs/LEVELS.md.
2. e2e for save persisting across reload + settings persisting (M6 acceptance).
3. Touch portrait "turn your device" overlay; style review round 3 and QA round 2; M8 polish; M9 hardening; M10 morning report.
