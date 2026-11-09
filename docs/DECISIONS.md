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
13. **Project subagents need a Claude Code restart to load.** Tonight they run as general-purpose agents told to read and follow `.claude/agents/<name>.md`. Same prompts, same rules.
14. **Boards have no rock border.** The board edge acts as a wall for pushes; the board stands on a meander plinth. Rocks are dark umber (black-figure) blocks used only as obstacles, for contrast with clay ground.
15. **Tile pitch 24×16** with a 24×18 tile image (2px front lip shows only on the nearest row).
16. **Level 1 has no patron.** The linter showed Zeus makes it a one-turn win; Zeus is introduced in Level 2.
17. **Poseidon's wave pushes units one by one from the leading end** (a blocked lead means the next unit collides with it). Simpler and consistent with the push rule.
18. **Ships burn when next to fire** (not on brush), so fire threatens ships along brush lanes in Fire at the Ships.
19. **Stealth: heroes who step on the gate leave the board**; win when every living hero is out. Sentries see 3 tiles along their facing; standing in torchlight at the end of the player phase also counts as seen.
20. **Enemy order numbers are fixed at the start of the enemy phase**, so a Trojan killed mid-phase doesn't renumber the rest.
