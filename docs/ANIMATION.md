# Animation

*Filled in M3 and M7.*

| Motion | Frames / time | Notes |
|---|---|---|
| Idle | 2 frames, ~500 ms each | 1px bob, phase offset per unit |
| Move | 80–120 ms per tile | stepped, no easing drift; 1px squash on landing |
| Attack | 3 frames (wind-up, strike, recover) | 60–90 ms hit-stop on impact |
| Hit | 1 frame cream flash | 1–2 px knockback, number pop |
| Defeat | ~600 ms | pottery shatter: shards fall and dither out |
| God appears | ~900 ms in, action, ~600 ms out | ordered-dither fade |
| Screen shake | 2–4 frames, 1–2 px integer offsets | toggleable |
