import Phaser from 'phaser';
import { loadSettings } from '../game/save';
import { applySettings } from './Menus';

/** Applies saved settings, then hands over to the title (or a ?level= deep link). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    applySettings(loadSettings());
    const params = new URLSearchParams(window.location.search);
    const level = params.get('level');
    if (level) this.scene.start('Battle', { levelId: level });
    else this.scene.start('Title');
  }
}
