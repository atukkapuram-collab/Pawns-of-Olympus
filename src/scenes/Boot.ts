import Phaser from 'phaser';
import { loadSettings } from '../game/save';
import { sfx } from '../audio/sfx';
import { fxSettings } from '../view/fx';

/** Applies saved settings, then hands over to the title (or a ?level= deep link). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const st = loadSettings();
    sfx.setVolume(st.sound);
    sfx.setMuted(st.muted);
    fxSettings.shake = st.shake;
    fxSettings.reducedMotion = st.reducedMotion;
    const params = new URLSearchParams(window.location.search);
    const level = params.get('level');
    if (level) this.scene.start('Battle', { levelId: level });
    else this.scene.start('Title');
  }
}
