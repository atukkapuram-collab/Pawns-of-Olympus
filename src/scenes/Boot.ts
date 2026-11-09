import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // M0 placeholder: a single meander-ish stripe proves integer scaling is crisp.
    const g = this.add.graphics();
    for (let x = 0; x < 320; x += 8) {
      g.fillStyle(0xb5783f).fillRect(x, 170, 8, 2);
      g.fillStyle(0xe0a83a).fillRect(x + 2, 170, 4, 1);
    }
    this.game.events.emit('poo:ready', 'Boot');
  }
}
