import Phaser from 'phaser';
import { makeConfig } from './game/config';
import { attachIntegerScaler } from './game/scaler';
import { BootScene } from './scenes/Boot';

const game = new Phaser.Game(makeConfig([BootScene]));

game.events.once(Phaser.Core.Events.READY, () => {
  attachIntegerScaler(game.canvas, () => game.scale.refresh());
});

// Test hook for Playwright (read-only inspection + scripted play).
declare global {
  interface Window {
    __POO__?: { game: Phaser.Game };
  }
}
window.__POO__ = { game };
