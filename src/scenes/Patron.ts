/** Patron select: the gods on offer for this level, one favor line each. */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { panel } from '../art/ui';
import { meanderBand } from '../art/pixels';
import { buildPortrait } from '../art/sprites/gods';
import { levelById } from '../data/levels/index';
import { STRINGS, t } from '../data/strings';
import type { PatronId } from '../core/types';
import { startLevel } from '../game/flow';
import { ensureTexture } from '../view/textures';
import { addButton, addText, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';

export const FAVOR_LINE: Record<PatronId, string> = {
  zeus: 'Bolt: 2 damage, one tile.',
  athena: 'A spent hero acts again.',
  poseidon: 'A wave shoves one row.',
};

export class PatronScene extends Phaser.Scene {
  constructor() {
    super('Patron');
  }

  create(data: { levelId: string }): void {
    const level = levelById(data.levelId)!;
    this.cameras.main.setBackgroundColor('#2a1a10');
    this.add.image(4, 4, ensureTexture(this, 'pt|frame', () => {
      const b = panel(312, 172, 'ink');
      meanderBand(b, 3, 3, 306, C.clay);
      meanderBand(b, 3, 160, 306, C.clay);
      return b;
    })).setOrigin(0, 0);
    const head = addText(this, 0, 18, `${level.index}. ${level.title}`, C.goldHi);
    head.x = Math.round(160 - head.width / 2);
    const introKey = `lvl.${level.id}.intro`;
    if (STRINGS[introKey]) {
      const intro = addText(this, 0, 30, t(introKey), C.clayLt, { maxWidth: 280, align: 'center' });
      intro.x = Math.round(160 - intro.width / 2);
    }
    const ask = addText(this, 0, 45, 'Which god backs you?', C.cream);
    ask.x = Math.round(160 - ask.width / 2);

    const gods = level.patrons;
    const cw = 96, gap = 6;
    const total = gods.length * cw + (gods.length - 1) * gap;
    const x0 = Math.round(160 - total / 2);
    const buttons: PixelButton[] = [];
    gods.forEach((g, i) => {
      const x = x0 + i * (cw + gap);
      this.add.image(x, 58, ensureTexture(this, `pt|card`, () => panel(cw, 98, 'clay'))).setOrigin(0, 0);
      const portrait = this.add.image(x + 24, 62, ensureTexture(this, `portrait|${g}`, () => buildPortrait(g))).setOrigin(0, 0);
      portrait.setInteractive({ useHandCursor: true }).on('pointerup', () => this.pick(g));
      addText(this, x + 6, 121, FAVOR_LINE[g], C.ink, { maxWidth: cw - 12 });
      const b = addButton(this, x + 6, 139, cw - 12, 14, cap(g), () => this.pick(g), String(i + 1));
      buttons.push(b);
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (n >= 0 && gods[n]) buttons[n]!.press();
      if (e.code === 'Escape') this.scene.start('LevelSelect', { act: level.act });
    });
    this.game.events.emit('poo:ready', 'Patron');
  }

  private pick(g: PatronId): void {
    sfx.play('select');
    const id = (this.scene.settings.data as { levelId: string }).levelId;
    startLevel(this, id, g);
  }
}

function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1);
}
