/**
 * Battle HUD: an ink title strip top-left, and a clay column on the right
 * with a cream info card (selected/hovered unit), the numbered Trojan action
 * order, the patron favor, End turn, Undo and Restart.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { panel } from '../art/ui';
import { hpPips, intentGlyph, orderBadge } from '../art/markers';
import { meanderBand } from '../art/pixels';
import { UNITS } from '../data/units';
import { t } from '../data/strings';
import { intentOrder } from '../core/rules';
import type { GameState, Unit } from '../core/types';
import { HUD_W, HUD_X } from './layout';
import { DEPTH } from './BoardView';
import { addButton, addText, setText, type PixelButton } from './ui';
import { ensureTexture } from './textures';

const ROMAN = ['', 'I', 'II', 'III'];
const INTENT_NAME: Record<string, string> = { thrust: 'thrust', arrow: 'arrow', charge: 'charge', sweep: 'sweep' };

export interface HudHandlers {
  endTurn(): void;
  undo(): void;
  restart(): void;
  favor(): void;
}

export class Hud {
  readonly endTurn: PixelButton;
  readonly undo: PixelButton;
  readonly restart: PixelButton;
  readonly favor: PixelButton | null;
  private turnText: Phaser.GameObjects.Image;
  private infoParts: Phaser.GameObjects.GameObject[] = [];
  private orderParts: Phaser.GameObjects.GameObject[] = [];
  private readonly ix = HUD_X + 6;

  constructor(
    readonly scene: Phaser.Scene,
    title: string,
    act: number,
    s: GameState,
    h: HudHandlers,
  ) {
    const d = DEPTH.hud;
    // title strip
    const stripW = 208;
    scene.add.image(4, 4, ensureTexture(scene, `strip|${stripW}`, () => panel(stripW, 15, 'ink'))).setOrigin(0, 0).setDepth(d);
    addText(scene, 9, 8, `${ROMAN[act] ?? act}. ${title}`, C.cream).setDepth(d);
    this.turnText = addText(scene, 0, 8, '', C.goldHi).setDepth(d);

    // right column
    scene.add.image(HUD_X, 2, ensureTexture(scene, `hudcol|${HUD_W}`, () => { const b = panel(HUD_W, 176, 'clay'); meanderBand(b, 3, 3, HUD_W - 6, C.ink); return b; })).setOrigin(0, 0).setDepth(d);
    scene.add.image(this.ix, 16, ensureTexture(scene, 'hudinfo', () => panel(HUD_W - 12, 50, 'cream'))).setOrigin(0, 0).setDepth(d);
    addText(scene, this.ix + 1, 70, t('ui.trojansAct'), C.ink).setDepth(d);

    const bw = HUD_W - 12;
    const half = Math.floor((bw - 2) / 2);
    this.favor = s.patron ? addButton(scene, this.ix, 124, bw, 14, cap(s.patron), h.favor, 'F') : null;
    this.endTurn = addButton(scene, this.ix, 141, bw, 14, t('ui.endTurn'), h.endTurn, 'E');
    this.undo = addButton(scene, this.ix, 158, half, 14, t('ui.undo'), h.undo);
    this.restart = addButton(scene, this.ix + half + 2, 158, bw - half - 2, 14, t('ui.restart'), h.restart);
    for (const b of [this.favor, this.endTurn, this.undo, this.restart]) b?.img.setDepth(d + 1);
  }

  update(s: GameState, canUndo: boolean, busy: boolean, info: Unit | null, favorArmed: boolean): void {
    const d = DEPTH.hud + 1;
    setText(this.turnText, `${t('ui.turn')} ${Math.min(s.turn, 99)}  ${t('ui.par')} ${s.par}`, s.turn > s.par ? C.sun : C.goldHi);
    this.turnText.setX(4 + 208 - 5 - this.turnText.width);

    const playing = s.phase === 'player' && !busy;
    this.endTurn.setEnabled(playing);
    this.undo.setEnabled(playing && canUndo);
    this.restart.setEnabled(!busy);
    if (this.favor) {
      this.favor.setEnabled(playing && !s.favorUsed);
      this.favor.setLabel(s.favorUsed ? `${cap(s.patron!)}: used` : favorArmed ? `${cap(s.patron!)}: pick` : cap(s.patron!));
    }

    // info card
    for (const p of this.infoParts) p.destroy();
    this.infoParts = [];
    const x = this.ix + 4;
    if (info) {
      const st = UNITS[info.type];
      const name = addText(this.scene, x, 20, st.name, C.ink).setDepth(d);
      const team = info.team === 'trojan' ? 'trojan' : 'greek';
      const pips = this.scene.add.image(x + name.width + 4, 21, ensureTexture(this.scene, `pips|${info.hp}|${info.maxHp}|${team}`, () => hpPips(info.hp, info.maxHp, team))).setOrigin(0, 0).setDepth(d);
      this.infoParts.push(name, pips);
      const lines = describe(info, s);
      lines.forEach((ln, i) => this.infoParts.push(addText(this.scene, x, 31 + i * 10, ln.text, ln.color, { maxWidth: HUD_W - 20 }).setDepth(d)));
    } else {
      this.infoParts.push(addText(this.scene, x, 20, s.phase === 'player' ? 'Pick a hero.' : '', C.umber, { maxWidth: HUD_W - 20 }).setDepth(d));
    }

    // Trojan order list
    for (const p of this.orderParts) p.destroy();
    this.orderParts = [];
    const order = intentOrder(s);
    order.slice(0, 4).forEach((u, i) => {
      const y = 81 + i * 10;
      this.orderParts.push(this.scene.add.image(x - 3, y - 1, ensureTexture(this.scene, `badge|${i + 1}|${s.ares}`, () => orderBadge(i + 1, s.ares))).setOrigin(0, 0).setDepth(d));
      const nm = addText(this.scene, x + 9, y, UNITS[u.type].name, C.ink).setDepth(d);
      this.orderParts.push(nm);
      this.orderParts.push(this.scene.add.image(x + 11 + nm.width, y - 2, ensureTexture(this.scene, `gl|${u.intent!.kind}|${u.intent!.dir}`, () => intentGlyph(u.intent!.kind, u.intent!.dir, C.ink))).setOrigin(0, 0).setDepth(d));
    });
    if (order.length > 4) this.orderParts.push(addText(this.scene, x + 9, 121, `+${order.length - 4} more`, C.umber).setDepth(d));
    if (order.length === 0) this.orderParts.push(addText(this.scene, x, 81, 'None.', C.umber).setDepth(d));
  }
}

function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1);
}

function describe(u: Unit, s: GameState): Array<{ text: string; color: number }> {
  const st = UNITS[u.type];
  const out: Array<{ text: string; color: number }> = [];
  if (u.team === 'greek') {
    const act = st.abilities?.includes('swap') ? `Strike ${st.damage} or swap` : st.abilities?.includes('push') ? `Spear push ${st.damage}` : `Strike ${st.damage}`;
    out.push({ text: `Move ${st.move}. ${act}.`, color: C.umber });
    if (u.type === 'achilles') out.push({ text: 'Arrows kill him.', color: C.red });
    if (u.type === 'ajax') out.push({ text: 'Shield: -1 per hit.', color: C.oliveDk });
    if (u.type === 'patroclus') out.push({ text: 'Trojans aim at him.', color: C.red });
    if (u.type === 'odysseus') out.push({ text: 'Swap: line, 3 tiles.', color: C.umber });
    if (u.type === 'diomedes') out.push({ text: 'Push into walls, water.', color: C.umber });
    if (s.phase === 'player' && u.acted) out.push({ text: 'Done this turn.', color: C.umber });
    else if (s.phase === 'player' && u.moved) out.push({ text: 'Can still act.', color: C.umber });
  } else if (u.team === 'trojan') {
    const n = intentOrder(s).indexOf(u) + 1;
    out.push({ text: u.intent ? `Acts ${n}: ${INTENT_NAME[u.intent.kind]} ${st.damage + (s.ares ? 1 : 0)}` : 'Waiting.', color: C.umber });
    if (u.type === 'shieldbearer') out.push({ text: 'Front is shielded.', color: C.red });
    if (u.type === 'chariot') out.push({ text: 'Charges until blocked.', color: C.umber });
    if (u.type === 'paris') out.push({ text: 'Hunts Achilles.', color: C.red });
  } else {
    out.push({ text: 'Keep it afloat.', color: C.umber });
  }
  return out;
}
