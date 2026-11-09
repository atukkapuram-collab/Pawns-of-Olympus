/**
 * Shown on top of everything when a touch device is held upright: the game is
 * landscape only. Blocks input below it until the device turns.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { PixelBuffer } from '../art/pixels';
import { ensureTexture } from '../view/textures';
import { addText } from '../view/ui';

function phone(): PixelBuffer {
  const b = new PixelBuffer(40, 28);
  // upright phone, then a curved arrow, then the phone on its side
  b.rect(2, 4, 10, 18, C.cream).frame(2, 4, 10, 18, C.ink).rect(4, 6, 6, 13, C.clay);
  for (let a = Math.PI; a <= Math.PI * 1.5; a += 0.08) b.set(Math.round(20 + Math.cos(a + Math.PI) * 5), Math.round(13 + Math.sin(a + Math.PI) * 5), C.goldHi);
  b.triangle(24, 13, 27, 13, 25.5, 16, C.goldHi);
  b.rect(20, 18, 18, 10, C.cream).frame(20, 18, 18, 10, C.ink).rect(22, 20, 14, 6, C.clay);
  return b;
}

export class RotateScene extends Phaser.Scene {
  constructor() {
    super('Rotate');
  }

  create(): void {
    this.add.rectangle(0, 0, 320, 180, 0x2a1a10).setOrigin(0, 0).setInteractive();
    this.add.image(140, 60, ensureTexture(this, 'rotate|phone', phone)).setOrigin(0, 0);
    const tx = addText(this, 0, 100, 'Turn your device sideways.', C.cream);
    tx.x = Math.round(160 - tx.width / 2);
  }
}

/** Show/hide the Rotate scene as the device turns (touch devices only). */
export function watchOrientation(game: Phaser.Game): void {
  const check = (): void => {
    const touch = navigator.maxTouchPoints > 0;
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    const active = game.scene.isActive('Rotate');
    if (touch && portrait && !active) {
      game.scene.start('Rotate');
      game.scene.bringToTop('Rotate');
    } else if ((!portrait || !touch) && active) game.scene.stop('Rotate');
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  check();
}
