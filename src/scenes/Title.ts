/**
 * Title screen (minimal M3 version; the frieze title arrives in M6/M7).
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { drawBackdrop } from '../art/backdrops';
import { panel } from '../art/ui';
import { t } from '../data/strings';
import { LEVELS } from '../data/levels/index';
import { loadSave } from '../game/save';
import { ensureTexture } from '../view/textures';
import { addButton, addText, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.add.image(0, 0, ensureTexture(this, 'bg|walls', () => drawBackdrop('walls'))).setOrigin(0, 0);
    const W = 200, H = 120, x = 60, y = 40;
    this.add.image(x, y, ensureTexture(this, `titlepanel|${W}|${H}`, () => panel(W, H, 'clay', true))).setOrigin(0, 0);
    const title = addText(this, 0, y + 18, t('game.title'), C.ink);
    title.x = Math.round(160 - title.width / 2);
    const tag = addText(this, 0, y + 30, t('game.tagline'), C.umber, { maxWidth: W - 20, align: 'center' });
    tag.x = Math.round(160 - tag.width / 2);

    const save = loadSave();
    const firstUnwon = LEVELS.find((l) => !save.levels[l.id]?.won) ?? LEVELS[0]!;
    const buttons: PixelButton[] = [];
    const bw = 110, bx = 160 - bw / 2;
    const hasProgress = Object.keys(save.levels).length > 0;
    if (hasProgress) buttons.push(addButton(this, bx, y + 54, bw, 14, t('ui.continue'), () => this.start(firstUnwon.id), 'E'));
    buttons.push(addButton(this, bx, y + (hasProgress ? 71 : 58), bw, 14, t('ui.newCampaign'), () => this.start(LEVELS[0]!.id), hasProgress ? 'N' : 'E'));

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') buttons[0]!.press();
      if (e.code === 'KeyN') buttons[buttons.length - 1]!.press();
    });
    this.input.on('pointerdown', () => sfx.unlock());
    this.game.events.emit('poo:ready', 'Title');
  }

  private start(levelId: string): void {
    sfx.play('select');
    this.scene.start('Battle', { levelId });
  }
}
