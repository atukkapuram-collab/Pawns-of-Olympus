---
name: pawns-playtest
description: How to run and playtest Pawns of Olympus through Playwright: start the build, play a level from its recorded solution via the window.__POO__ test hook, capture screenshots, and report issues. Load for QA, e2e tests, screenshots or playtesting.
---

# Pawns of Olympus: playtesting

## Commands (all PowerShell-safe)
- `npm run dev`: dev server at http://localhost:5173 (gallery at `/gallery.html`).
- `npm run e2e`: builds, serves `dist/` at `http://localhost:4180/pawns-of-olympus/` (a GitHub-Pages-style sub-path), runs `e2e/*.spec.ts` in two projects: `desktop` (1280×720 mouse) and `touch` (Pixel 7 landscape, `hasTouch`).
- `npm run screenshots`: runs `e2e/screenshots.spec.ts`, writes PNGs to `docs/screenshots/` (1x canvas captures and 2x), then view them with the Read tool.
- `npm run check`: the full gate (typecheck, lint, unit, validate-levels, build, e2e).

## The test hook: `window.__POO__`
Exposed by `src/main.ts`. Use it from `page.evaluate`:
- `__POO__.game`: the Phaser game.
- `__POO__.scene()`: key of the active top scene.
- `__POO__.battle()`: the active battle controller (or null) with `state` (pure core state), `dispatch(action)`, and `busy` (true while animating).
- `__POO__.startLevel(id, patron?)`: jump straight into a level.
- `__POO__.tileToClient(x, y)`: CSS-pixel center of a board tile, for real mouse/touch clicks.
- `__POO__.settle()`: a promise that resolves when no animation is running.

## Playing a level through the real UI
Prefer real input for e2e: for each solution action, click/tap the hero's tile, then the target tile (`tileToClient`), then press the End turn button (keyboard `E` or its on-screen button), awaiting `settle()` between steps. Use `dispatch` only for setup or fuzzing, never to fake a "win via UI" test.

## Screenshots
Capture the canvas element, not the page, so letterboxing doesn't hide problems. Name files `<screen>-<state>.png` (e.g. `battle-a1-01-turn1.png`). Always open them with Read and check them against the `pawns-art-style` checklist.

## Reporting
File bugs in `docs/BUGS.md` (format in `.claude/agents/qa-tester.md`) and log review rounds in `docs/PLAYTEST_LOG.md`.
