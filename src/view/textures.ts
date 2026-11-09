/**
 * Turns art-recipe PixelBuffers into Phaser textures. Everything is generated
 * at boot (or lazily, for text) from code; no image files are loaded.
 */
import type Phaser from 'phaser';
import type { PixelBuffer } from '../art/pixels';

export function bufferToCanvas(b: PixelBuffer): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  const ctx = c.getContext('2d')!;
  ctx.putImageData(new ImageData(b.toRGBA() as ImageDataArray, b.w, b.h), 0, 0);
  return c;
}

/** Register a buffer as a texture under `key` (no-op if it exists). */
export function ensureTexture(scene: Phaser.Scene, key: string, make: () => PixelBuffer): string {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, bufferToCanvas(make()));
  return key;
}

/** Replace a texture (used when a generated buffer changes). */
export function setTexture(scene: Phaser.Scene, key: string, b: PixelBuffer): string {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, bufferToCanvas(b));
  return key;
}
