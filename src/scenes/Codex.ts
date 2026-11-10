/**
 * The Codex: every card the player has met, grouped like the friezes on a
 * vase. Unmet ones show as "?". Opens from the title screen and the pause menu.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { panel } from '../art/ui';
import { meanderBand } from '../art/pixels';
import { CARDS, cardName, type TopicKind } from '../data/teach';
import { t } from '../data/strings';
import { hasSeen } from '../game/flow';
import { ensureTexture } from '../view/textures';
import { addButton, addText, type PixelButton } from '../view/ui';
import { sfx } from '../audio/sfx';

const COLUMNS: TopicKind[][] = [['hero', 'god'], ['trojan', 'tgod'], ['tile', 'goal']];

export function seenCards(): string[] {
  return CARDS.filter((c) => hasSeen(`card:${c.id}`)).map((c) => c.id);
}

export class CodexScene extends Phaser.Scene {
  private back: string | undefined;

  constructor() {
    super('Codex');
  }

  create(data: { back?: string }): void {
    this.back = data.back;
    this.add.image(0, 0, ensureTexture(this, 'codex|bg', () => {
      const b = panel(320, 180, 'ink');
      b.frame(4, 4, 312, 172, C.deepClay);
      meanderBand(b, 6, 6, 308, C.clay);
      return b;
    })).setOrigin(0, 0);
    addText(this, 12, 19, t('codex.title'), C.goldHi);
    addText(this, 52, 19, t('codex.hint'), C.clayLt);
    const close = addButton(this, 250, 16, 60, 13, t('ui.close'), () => this.close(), 'Esc');
    const seen = new Set(seenCards());
    const buttons: PixelButton[] = [close];
    // second groups start on one shared row, below the tallest first group
    const secondRow = 31 + 10 + Math.max(...COLUMNS.map((k) => CARDS.filter((c) => c.kind === k[0]).length)) * 12 + 2;
    COLUMNS.forEach((kinds, ci) => {
      const x = 12 + ci * 100;
      let y = 31;
      for (const [gi, k] of kinds.entries()) {
        if (gi === 1) y = Math.max(y, secondRow);
        addText(this, x, y, t(`card.group.${k}`), C.sun);
        y += 10;
        const group = CARDS.filter((c) => c.kind === k);
        for (const c of group) {
          if (seen.has(c.id)) {
            const ids = CARDS.filter((cc) => seen.has(cc.id)).map((cc) => cc.id);
            const b = addButton(this, x, y, 96, 11, cardName(c.id), () => {
              sfx.play('select');
              this.scene.start('Cards', { ids, mode: 'codex', index: ids.indexOf(c.id), back: this.back });
            });
            buttons.push(b);
          } else {
            this.add.image(x, y, ensureTexture(this, 'codex|unseen', () => {
              const b = panel(96, 11, 'ink');
              return b;
            })).setOrigin(0, 0);
            addText(this, x + 46, y + 2, '?', C.clayLt);
          }
          y += 12;
        }
        y += 2;
      }
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { if (e.code === 'Escape') this.close(); });
    this.game.events.emit('poo:ready', 'Codex');
  }

  private close(): void {
    sfx.play('ui');
    if (this.back === 'Pause') {
      this.scene.stop();
      this.scene.resume('Pause');
    } else this.scene.start(this.back ?? 'Title');
  }
}
