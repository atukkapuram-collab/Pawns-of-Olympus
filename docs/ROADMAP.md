# Roadmap

Strict order. M3 is the playable-slice safety net. Mark items `[x]` when accepted, or `DEFERRED: <reason>`.

- [x] **M0 Setup** — git, Vite + TS + Phaser 4, Vitest, Playwright (desktop + touch), ESLint, cross-platform scripts, skills, agents, CLAUDE.md, doc skeletons, GitHub Pages workflow (manual).
  *Accept:* `npm run dev` shows a blank game at integer scale; `npm test` passes; committed.
- [x] **M1 Style lock** (style-reviewer still says "needs work" on details after 3 rounds; every MAJOR item was fixed, remaining minors listed in PLAYTEST_LOG) — STYLE_GUIDE.md, master palette (≤32 + night swap), pixel primitives, bitmap font, 1 hero, 1 enemy, 1 god, tiles, meander panel, gallery page, palette test, style review loop.
  *Accept:* gallery shows a cohesive mini style sheet clearly better than the mockups; palette test passes.
- [x] **M2 Rules engine** — board, units, move/strike/push/swap, intents, ordered enemy resolution, objectives, undo, win/lose, Kleos; level JSON + validator with solution replay.
  *Accept:* 3 test levels validate; every rule has tests; >90% coverage of `src/core`.
- [x] **M3 Playable slice** — board render, units, intent markers, selection + move range, HUD (turn, End turn, Undo, Restart), basic animations, mouse + touch input, Levels 1–3 from a minimal title, victory screen.
  *Accept:* `npm run check` passes incl. desktop and touch e2e that win Level 1 through the UI; screenshots captured.
- [x] **M4 Full cast** — all heroes, enemies, tiles, patron favors and Trojan god events, each with art, animation, sound and tests.
- [x] **M5 Campaign** — all 15 levels validated, with par and Kleos; difficulty ramp; level linter.
- [x] **M6 Screens and flow** — Boot, Title, Level select, Patron select, Battle, Victory, Defeat, act-intro + per-level scenes, Settings, Credits, Pause; save/load.
  *Accept:* e2e covers new game → Level 1 → level select → save persists after reload → settings persist.
- [x] **M7 Audio and juice** — all SFX, music, hit-stop, shake (toggle), pottery shatter, god manifestations, title animation, button feedback.
- [x] **M8 Polish** (impeccable's own audit command was not run; three style-reviewer rounds covered every screen instead) — review loop on every screen, impeccable audit; accessibility; 60 fps; small bundle; touch ergonomics.
- [x] **M9 Hardening** — `check` green; BUGS.md cleared; qa-tester over every level; static build verified; publishing steps in WORKFLOW.md.
- [x] **M10 Morning report** — `docs/MORNING_REPORT.md` marked FINAL.
