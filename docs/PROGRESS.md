# Progress

## Done
- M0–M7 accepted (see ROADMAP). Full 15-level campaign validates (solutions replay to a win within par, none winnable in one turn); every level also replays in the browser (e2e/levels.spec.ts).
- `npm run check` green with all 15 levels (66 unit tests, 13 e2e incl. desktop + touch UI wins, flow, persistence, pause, portrait overlay).
- Style reviews rounds 1–3 applied (PLAYTEST_LOG). Night palette applies to Greeks only; stealth sight overlay; chariot redrawn.
- Docs current: GDD, STYLE_GUIDE, LEVELS (pars), STORY, UI_UX, AUDIO, ANIMATION, ARCHITECTURE, WORKFLOW (publishing steps), DECISIONS (30 entries).

## In progress
- QA round 2 (qa-tester agent) on the whole game; files bugs from BUG-13 in docs/BUGS.md.

## Next exact step
1. Fix QA round 2 bugs; re-run `npm run check`.
2. M8 polish pass on the weakest screens; M9 hardening (static build from dist, package:itch check).
3. M10: write docs/MORNING_REPORT.md and mark FINAL when check passes and ROADMAP is all checked.
