import Phaser from 'phaser';
import { GAME_H, GAME_W } from './scaler';

export const BG_COLOR = '#2a1a10';

export function makeConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: BG_COLOR,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    disableContextMenu: true,
    // We size the canvas ourselves (see scaler.ts) for exact integer scaling.
    scale: { mode: Phaser.Scale.NONE, width: GAME_W, height: GAME_H },
    input: { activePointers: 2, touch: { capture: true } },
    audio: { noAudio: true }, // our own Web Audio graph (src/audio) handles sound
    banner: false,
    scene: scenes,
  };
}
