/**
 * Battle HUD: an ink title strip top-left (level name), and a clay column on
 * the right: turn/par, a cream info card (selected or hovered unit), the
 * numbered Trojan action order, then the patron favor, End turn, Undo, Restart.
 */
import Phaser from 'phaser';
import { C } from '../art/palette';
import { panel } from '../art/ui';
import { hpPips, intentGlyph, orderBadge } from '../art/markers';
import { meanderBand } from '../art/pixels';
import { UNITS } from '../data/units';
import { t } from '../data/strings';
import { abilitiesOf, intentOrder } from '../core/rules';
import type { Ability, GameState, Unit } from '../core/types';
import { HUD_W, HUD_X } from './layout';
import { DEPTH } from './BoardView';
import { addButton, addText, setText, type PixelButton } from './ui';
import { ensureTexture } from './textures';

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const ABILITY_LABEL: Record<Ability, string> = { strike: 'Strike', swap: 'Swap', push: 'Push' };

export interface HudHandlers {
  endTurn(): void;
  undo(): void;
  restart(): void;
  favor(): void;
  ability(a: Ability): void;
}

export class Hud {
  readonly endTurn: PixelButton;
  readonly undo: PixelButton;
  readonly restart: PixelButton;
  readonly favor: PixelButton | null;
  private abilityBtns: PixelButton[] = [];
  private turnText: Phaser.GameObjects.Image;
  private infoParts: Phaser.GameObjects.GameObject[] = [];
  private orderParts: Phaser.GameObjects.GameObject[] = [];
  private readonly ix = HUD_X + 6;

  constructor(
    readonly scene: Phaser.Scene,
    title: string,
    index: number,
    s: GameState,
    readonly h: HudHandlers,
  ) {
    const d = DEPTH.hud;
    const stripW = 208;
    scene.add.image(4, 4, ensureTexture(scene, `strip|${stripW}`, () => panel(stripW, 15, 'ink'))).setOrigin(0, 0).setDepth(d);
    addText(scene, 9, 8, `${index}. ${title}`, C.cream).setDepth(d);

    scene.add.image(HUD_X, 2, ensureTexture(scene, `hudcol|${HUD_W}`, () => {
      const b = panel(HUD_W, 176, 'clay');
      meanderBand(b, 3, 3, HUD_W - 6, C.ink);
      return b;
    })).setOrigin(0, 0).setDepth(d);
    this.turnText = addText(scene, this.ix + 1, 15, '', C.ink).setDepth(d + 1);
    scene.add.image(this.ix, 25, ensureTexture(scene, 'hudinfo2', () => panel(HUD_W - 12, 44, 'cream'))).setOrigin(0, 0).setDepth(d);
    addText(scene, this.ix + 1, 72, t('ui.trojansAct'), C.ink).setDepth(d);

    const bw = HUD_W - 12;
    const half = Math.floor((bw - 2) / 2);
    this.favor = s.patron ? addButton(scene, this.ix, 124, bw, 14, cap(s.patron), h.favor, 'F') : null;
    this.endTurn = addButton(scene, this.ix, 141, bw, 14, t('ui.endTurn'), h.endTurn, 'E');
    this.undo = addButton(scene, this.ix, 158, half, 14, t('ui.undo'), h.undo);
    this.restart = addButton(scene, this.ix + half + 2, 158, bw - half - 2, 14, t('ui.restart'), h.restart);
    for (const b of [this.favor, this.endTurn, this.undo, this.restart]) b?.img.setDepth(d + 1);
  }

  update(s: GameState, canUndo: boolean, busy: boolean, info: Unit | null, favorArmed: boolean, selected: string | null, ability: Ability, aimAllies = false): void {
    const d = DEPTH.hud + 1;
    setText(this.turnText, `${t('ui.turn')} ${Math.min(s.turn, 99)}/${s.par}`, s.turn > s.par ? C.red : C.ink);

    const playing = s.phase === 'player' && !busy;
    this.endTurn.setEnabled(playing);
    this.undo.setEnabled(playing && canUndo);
    this.restart.setEnabled(!busy);
    if (this.favor) {
      this.favor.setEnabled(playing && !s.favorUsed);
      const g = cap(s.patron!);
      this.favor.setLabel(s.favorUsed ? `${g}: spent` : favorArmed ? (s.patron === 'poseidon' ? 'Pick a line' : s.patron === 'athena' ? 'Pick a hero' : 'Pick a tile') : g);
    }

    // info card
    for (const p of this.infoParts) p.destroy();
    this.infoParts = [];
    for (const b of this.abilityBtns) b.destroy();
    this.abilityBtns = [];
    const x = this.ix + 4;
    if (info) {
      const st = UNITS[info.type];
      const name = addText(this.scene, x, 29, st.name, C.ink).setDepth(d);
      const team = info.team === 'trojan' ? 'trojan' : 'greek';
      const pips = this.scene.add.image(x + name.width + 4, 30, ensureTexture(this.scene, `pips|${info.hp}|${info.maxHp}|${team}`, () => hpPips(info.hp, info.maxHp, team))).setOrigin(0, 0).setDepth(d);
      this.infoParts.push(name, pips);
      const abs = info.team === 'greek' ? abilitiesOf(info) : [];
      const toggles = (abs.length > 1 || abs.includes('push')) && info.id === selected && s.phase === 'player';
      const lines = describe(info, s).slice(0, toggles ? 1 : 3);
      let ly = 39;
      for (const ln of lines) {
        if (ly > 59) break;
        const img = addText(this.scene, x, ly, ln.text, ln.color, { maxWidth: HUD_W - 22 }).setDepth(d);
        if (ly + img.height > 68) { img.destroy(); break; }
        this.infoParts.push(img);
        ly += img.height + 2;
      }
      if (toggles) {
        const w = Math.floor((HUD_W - 22) / 2);
        abs.slice(0, 2).forEach((a, i) => {
          const label = abs.length === 1 ? 'Aim at ally' : ABILITY_LABEL[a];
          const bw2 = abs.length === 1 ? w * 2 + 2 : w;
          const b = addButton(this.scene, x + i * (w + 2), 51, bw2, 13, label, () => this.h.ability(a), String(i + 1));
          b.setActive(a === ability && (abs.length > 1 || aimAllies));
          b.img.setDepth(d + 1);
          this.abilityBtns.push(b);
        });
      }
    } else {
      this.infoParts.push(addText(this.scene, x, 29, s.phase === 'player' ? 'Pick a hero.' : '', C.umber).setDepth(d));
    }

    // Trojan action order
    for (const p of this.orderParts) p.destroy();
    this.orderParts = [];
    const order = intentOrder(s);
    const shown = order.length > 4 ? 3 : 4;
    order.slice(0, shown).forEach((u, i) => {
      const y = 83 + i * 10;
      if (info && info.id === u.id) {
        const hl = this.scene.add.rectangle(x - 4, y - 2, HUD_W - 14, 11, 0xffe9a0).setOrigin(0, 0).setDepth(d - 1);
        this.orderParts.push(hl);
      }
      this.orderParts.push(this.scene.add.image(x - 3, y - 1, ensureTexture(this.scene, `badge|${i + 1}|${s.ares}`, () => orderBadge(i + 1, s.ares))).setOrigin(0, 0).setDepth(d));
      const nm = addText(this.scene, x + 9, y, UNITS[u.type].name, C.ink).setDepth(d);
      this.orderParts.push(nm);
      this.orderParts.push(this.scene.add.image(x + 11 + nm.width, y - 2, ensureTexture(this.scene, `gl|${u.intent!.kind}|${u.intent!.dir}`, () => intentGlyph(u.intent!.kind, u.intent!.dir, C.ink))).setOrigin(0, 0).setDepth(d));
    });
    if (order.length > 4) this.orderParts.push(addText(this.scene, x + 9, 83 + 3 * 10, `+${order.length - 3} more`, C.umber).setDepth(d));
    if (order.length === 0) this.orderParts.push(addText(this.scene, x, 83, 'None.', C.umber).setDepth(d));
  }
}

function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1);
}

function describe(u: Unit, s: GameState): Array<{ text: string; color: number }> {
  const st = UNITS[u.type];
  const out: Array<{ text: string; color: number }> = [];
  if (u.team === 'greek') {
    const act = st.abilities?.includes('swap') ? 'Strike 1 or swap' : st.abilities?.includes('push') ? `Spear push ${st.damage}` : `Strike ${st.damage}`;
    out.push({ text: `Move ${st.move}. ${act}`, color: C.umber });
    const arrows = s.units.some((v) => (v.type === 'archer' || v.type === 'paris') && v.alive) || !!s.trojanEvent?.apollo;
    if (u.type === 'achilles' && arrows) out.push({ text: 'Arrows kill him.', color: C.red });
    if (u.type === 'ajax') out.push({ text: 'Shield: -1 a hit.', color: C.oliveDk });
    if (u.type === 'patroclus') out.push({ text: 'Trojans aim at him.', color: C.red });
    if (u.type === 'odysseus') out.push({ text: 'Swap: 3 in a line.', color: C.umber });
    if (u.type === 'diomedes') out.push({ text: 'Into rock or river.', color: C.umber });
    if (s.phase === 'player' && u.acted) out.push({ text: 'Done this turn.', color: C.umber });
    else if (s.phase === 'player' && u.moved) out.push({ text: 'Can still act.', color: C.umber });
  } else if (u.team === 'trojan') {
    const n = intentOrder(s).indexOf(u) + 1;
    const dmg = st.damage + (s.ares ? 1 : 0);
    const what = u.intent?.kind === 'arrow' ? `Arrow ${dmg}, full line` : u.intent?.kind === 'charge' ? `Charge ${dmg}` : u.intent?.kind === 'sweep' ? `Sweep ${dmg}, 3 tiles` : `Thrust ${dmg}`;
    out.push({ text: u.mist ? 'In the mist.' : n > 0 ? `Acts ${ORD[n] ?? n}.` : 'Waiting.', color: C.umber });
    out.push({ text: what, color: C.umber });
    if (u.type === 'shieldbearer') out.push({ text: 'Front is shielded.', color: C.red });
    if (u.type === 'chariot') out.push({ text: 'Runs till blocked.', color: C.umber });
    if (u.type === 'paris') out.push({ text: 'Hunts Achilles.', color: C.red });
  } else {
    out.push({ text: 'Keep it afloat.', color: C.umber });
  }
  return out;
}
