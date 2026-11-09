# Animation

Stiff and punchy, like vase figures: stepped poses, linear slides snapped to whole pixels (`roundPixels`), no floaty easing. Code: `src/scenes/Battle.ts` (`animate`), `src/view/fx.ts`, `src/view/BoardView.ts` (`tick`).

| Motion | Implemented as | Timing |
|---|---|---|
| Idle | 2 frames (`idle0`/`idle1`, upper body sinks 1px), phase offset per unit | 500 ms per frame |
| Move | linear slide per tile, depth re-sorted each tile; 1px landing sink | 90 ms per tile, 50 ms sink |
| Hero strike | wind-up frame → strike frame (spear levelled) → hit-stop → idle | 90 + 80 ms |
| Trojan attack | wind-up → strike → idle | 110 + 90 ms |
| Hit | 1-frame cream palette flash, damage number rises in steps, 1px shake | 70 ms flash, number ~6×60 ms |
| Blocked | "Immune" / "Blocked" / "Sheltered" pop in cream | 120 ms |
| Push / bump | slide 1 tile / 2px nudge out and back | 90 ms / 2×50 ms |
| Swap | both units slide at once | 140 ms |
| Charge | slide per tile | 60 ms per tile |
| **Defeat (shatter)** | sprite cut into 6 ragged wedges; shards drop (accelerating), drift 1–2px sideways and dither out | 8 frames × 55 ms |
| Swept away | sinks 4px, then shatters | 120 ms + shatter |
| Phase banners | ink strip "Trojans act" / "Your move" | 420 / 380 ms |
| God manifestation | silhouette dithers in over 5 steps while rising 6px, banter strip, dithers out over 3 | 250 + 900 + 135 ms |
| Zeus' bolt | gold zigzag on the tile, 2px shake | 90 ms + 4 shake frames |
| Screen shake | integer offsets of 1–2 px | 2–4 frames of 34 ms (toggleable) |
| Cutscene panels | painting dithers in over 4 steps | 4 × 45 ms |
| Title frieze | marching strip scrolls 1px | every 70 ms (off with reduced motion) |

Reduced motion: shake off, slides capped at 40 ms, shatter 3 frames, number pops shorter, banners and holds halved, title frieze still.
