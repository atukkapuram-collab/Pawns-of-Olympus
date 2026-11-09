# Audio

All sound is synthesized in code at runtime. No samples, no third-party audio code.
- Sound effects: `src/audio/synth.ts` (renderer) + `src/audio/sfx.ts` (the parameter table `SOUNDS`).
- Music: `src/audio/music.ts` (sequencer, songs in `SONGS`).
- Audio starts only after the first click, tap or keypress (browser autoplay rules). Volumes and mute live in Settings and persist.

## Sound effects (parameters in `SOUNDS`)
Each is a short parameter list: wave, start frequency, slide, attack/sustain/release, plus optional noise mix, harmonic, bit-crush, low-pass and vibrato. Sounds with `jitter` render 3 pitch variants that rotate, so repeats never sound identical.

| Event | Sound | Character |
|---|---|---|
| tick / ui | square blips | cursor moves, menu clicks |
| select | rising triangle | picking a hero |
| invalid | low falling square, low-passed | dull "no" click |
| undo | falling triangle | |
| move | soft filtered noise | sandal steps |
| strike | square + inharmonic partial (×2.76), crushed | the bronze clang |
| hit | short filtered noise | |
| block | low triangle thud | shield takes it |
| bump / push | low thump / scrape noise | collisions and shoves |
| swap | noisy upward sweep | Odysseus' trick |
| **shatter** | crushed noise with a ×3.1 partial | the signature pottery crack |
| arrow | falling high noise | |
| charge | rumbling noise with fast vibrato | wheels |
| lightning | deep crushed noise, long tail | Zeus |
| wave | slow vibrato noise | Poseidon |
| fire / plague | crackle / thin descending whistle | |
| victory / defeat / star | triangle with fifth / falling minor third / bright ping | |

## Music
A plucked lyre (Karplus-Strong string), a soft triangle drone a fifth-octave below, and a frame drum, playing written eighth-note patterns. Patterns loop seamlessly.

| Song | Mode | Root | Tempo | Where |
|---|---|---|---|---|
| title | Dorian (calm) | D3 | 76 | title and menus |
| act1 | Dorian | D3 | 84 | Act I battles |
| act2 | Phrygian (tension) | E3 | 92 | Act II battles |
| act3 | Phrygian | C3 | 100 | Act III battles |
| victory | Mixolydian | G3 | 108 | victory sting (plays once) |

## Mixing
Default music volume 0.35 (×0.5 master), sound 0.6. Drone at 0.05, plucks at 0.55, drums 0.18–0.5. Everything is short so nothing masks the next event.
