# Pawns of Olympus

A 2D turn-based tactics-puzzle web game set in the Trojan War. Small grids, every enemy telegraphs its attack, each turn is a solvable puzzle. Pick a patron god per level; Trojan gods meddle. Up to 3 Kleos stars per level. Look: "Pottery Pixel" (GBA-era pixel art + Greek Geometric vase shapes + black-figure palette). Tagline: *The gods are playing. You are the pieces.*

**Read `docs/PROGRESS.md` first** in every session. Full original brief: `KICKOFF.md` (Part B).

## Stack
Phaser 4 (4.2.x) + TypeScript (strict) + Vite 8. Vitest (unit), Playwright Test (e2e, desktop + touch). Audio: ZzFX + own Web Audio sequencer. Saves: versioned `localStorage`. Internal res 320×180, integer scaling only (`src/game/scaler.ts`). Phaser 4 differs a lot from Phaser 3: use the Phaser skills in `.claude/skills/` (e.g. `v4-new-features`, `v3-to-v4-migration`), never v3 code from memory.

## Commands (all work in PowerShell)
| Command | What it does |
|---|---|
| `npm run dev` | Dev server, http://localhost:5173 (art gallery: `/gallery.html`) |
| `npm run build` / `npm run preview` | Production build to `dist/` (relative paths) / serve it |
| `npm test` | Vitest unit tests (`tests/`) |
| `npm run e2e` | Builds, serves under `/pawns-of-olympus/`, runs Playwright (`e2e/`) |
| `npm run validate-levels` | Schema check + solution replay + lint for every level |
| `npm run screenshots` | Captures every screen to `docs/screenshots/` |
| `npm run export-sprites` | PNG sprite sheets to `art-export/` |
| `npm run package:itch` | Zips `dist/` to `release/` for itch.io |
| `npm run check` | typecheck → lint → test → validate-levels → build → e2e. Must exit 0 at every commit (from M3 on). |

## Folder ownership
- `src/core/`: pure rules engine. **No Phaser, no DOM imports** (lint-enforced). Deterministic, fully unit-tested.
- `src/data/`: units, gods, `levels/*.json`, `strings.ts` (ALL player-facing text lives here).
- `src/art/`: palette, pixel primitives, sprite recipes, bitmap font, tiles, UI frames. Art is code; no image files.
- `src/audio/`: ZzFX sounds, music sequencer.
- `src/scenes/`: Phaser scenes. `src/view/`: board renderer, unit views, intents, HUD, effects.
- `tests/` unit, `e2e/` Playwright, `tools/` gallery, validator, scripts.
- Subagent ownership: `level-designer` → `src/data/levels/` + `docs/LEVELS.md`; `lore-keeper` → `src/data/strings.ts` + `docs/STORY.md`.

## Autonomy rules (overnight run)
1. No questions to the user after kickoff. Decide, log in `docs/DECISIONS.md` (decision, options, why), continue.
2. After every finished task: update `docs/PROGRESS.md` (done / in progress / next exact step) and `git commit`. Tests pass at every commit. Never leave the build broken.
3. After compaction or resume: re-read KICKOFF.md Part B, this file, `docs/PROGRESS.md`, `docs/ROADMAP.md`.
4. Free tools only, no accounts/API keys, no AI-generated art or audio, no analytics. Third-party assets only if CC0-like, logged in `CREDITS.md`.
5. Stay in this folder. No destructive git (no force push, no history rewrite). No GitHub pushes/publishing (the user sets up the private repo themselves). Never commit secrets.
6. Blocked? Try two alternatives, log in `docs/BLOCKERS.md`, take the best fallback, continue.
7. Build order: playable before beautiful (see `docs/ROADMAP.md`).

## Quality rules
- Art: follow `.claude/skills/pawns-art-style` and `docs/STYLE_GUIDE.md`. Palette test must pass.
- Writing: spare, mythic, wry about the gods. No banned phrases (see `docs/STORY.md`). Public-domain Iliad translations only for epigraphs.
- Review loop on every visual/gameplay milestone: build → test + screenshots (view them) → `style-reviewer` / `qa-tester` → fix → re-review → log in `docs/PLAYTEST_LOG.md`.
- UI work: use `frontend-design` and `impeccable` for hierarchy/copy; the pixel-art rules override them.

## Docs
`docs/PRD.md` · `GDD.md` (rules + numbers) · `STYLE_GUIDE.md` · `UNITS.md` · `GODS.md` · `LEVELS.md` · `STORY.md` · `UI_UX.md` · `AUDIO.md` · `ANIMATION.md` · `ARCHITECTURE.md` · `ROADMAP.md` · `WORKFLOW.md` (for the user) · logs: `DECISIONS.md`, `PROGRESS.md`, `BLOCKERS.md`, `PLAYTEST_LOG.md`, `BUGS.md` · `MORNING_REPORT.md` · `CREDITS.md`.

## Skills and agents
- Project skills: `pawns-art-style`, `pawns-level-design`, `pawns-playtest`. Installed: Phaser 4 skills, `impeccable`, `frontend-design`.
- Agents (`.claude/agents/`): `style-reviewer`, `qa-tester`, `level-designer`, `lore-keeper`. Max 3 running at once.

## Hosting
Target GitHub Pages (manual workflow in `.github/workflows/deploy-pages.yml`, never auto-run), itch.io stays possible (`npm run package:itch`). Keep `base: './'` and relative paths; no client-side routing.
