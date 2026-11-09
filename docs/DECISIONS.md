# Decisions

Format: decision · options considered · why.

1. **Platforms: desktop + touch** (Phase 0 answer). Pointer-event input everywhere, landscape only, touch e2e project.
2. **Story: expanded** (Phase 0 answer). Act intros 3–4 panels, per-level pre/post scenes, god banter.
3. **Hosting: GitHub Pages, keep itch.io open** (Phase 0 answer). `base: ./`, relative paths, manual Pages workflow, `package:itch` zip script.
4. **GitHub: skipped for tonight.** Creating the private repo was blocked by the auto-mode safety check; the user chose to set it up in the morning. Commits stay local.
5. **TypeScript 6.0, not 7.x.** typescript-eslint 8.72 supports TS <6.1. Options: TS 7 without type-aware lint, or TS 6. TS 6 keeps the lint step working.
6. **Integer scaling done by our own scaler in device pixels** (Phaser Scale.NONE + CSS size). Options: Phaser `MAX_ZOOM` (CSS pixels, blurry seams at 125%/150% Windows scaling). Device-pixel math keeps every game pixel an exact block.
7. **e2e runs against the production build served under `/pawns-of-olympus/`.** It proves relative paths work for a GitHub Pages project site on every run.
8. **frontend-design skill source:** `anthropics/claude-code` contained no installable skill; installed from `anthropics/skills` instead (same skill).
9. **Playwright MCP already registered and connected in this environment**, so `claude mcp add` was not re-run.
10. **npm audit: moderate minimatch advisory in eslint dev dependencies only.** Not shipped to players; the only "fix" downgrades ESLint. Left as is.
11. **Level solution format:** `solution: { patron, turns: [[actions...]] }` instead of a flat list, so per-turn grouping and patron choice are explicit.
12. **Master palette: 32 colors** = the 18 reference colors + 14 shades (see STYLE_GUIDE.md). Night variant is a palette remap, not extra colors.
