/**
 * Level 1's guided tutorial, as pure logic (no Phaser): one idea per step.
 *   select -> move -> strike -> read an intent -> End turn -> dodge -> Undo -> finish
 * The Battle scene asks `allows(input)` before doing anything while the
 * tutorial runs, and calls `after(ctx)` once the state has changed; the step
 * advances only when the player has done exactly what it asks.
 */
import { onBoard, unitById } from '../core/board';
import { threatTiles } from '../core/rules';
import type { GameState } from '../core/types';

export type TutStep = 'select' | 'move' | 'strike' | 'read' | 'endTurn' | 'dodge' | 'undo' | 'finish' | 'done';
export const TUT_STEPS: TutStep[] = ['select', 'move', 'strike', 'read', 'endTurn', 'dodge', 'undo', 'finish', 'done'];

export type TutInput =
  | { kind: 'select'; unit: string }
  | { kind: 'move'; unit: string; x: number; y: number }
  | { kind: 'act'; unit: string; x: number; y: number }
  | { kind: 'inspect'; unit: string | null }
  | { kind: 'endTurn' }
  | { kind: 'undo' }
  | { kind: 'favor' }
  | { kind: 'restart' };

export interface TutCtx {
  state: GameState;
  selected: string | null;
  info: string | null;
  /** The last input that went through (for steps that wait on a button). */
  last?: TutInput | undefined;
}

/** What the coach points at for a step. */
export type TutTarget =
  | { kind: 'unit'; id: string }
  | { kind: 'tile'; x: number; y: number }
  | { kind: 'units'; ids: string[]; tiles: Array<{ x: number; y: number }> }
  | { kind: 'button'; label: 'End turn' | 'Undo' }
  | { kind: 'board' };

const HERO = 'achilles';
/** Where step 2 sends Achilles: next to the first spearman. */
export const TUT_MOVE = { x: 4, y: 3 };
export const TUT_FIRST = 'spearman-1';
export const TUT_SECOND = 'spearman-2';

const isRed = (s: GameState, x: number, y: number) => threatTiles(s).some((t) => t.x === x && t.y === y);

export class Tutorial {
  index = 0;

  get step(): TutStep {
    return TUT_STEPS[this.index]!;
  }

  get active(): boolean {
    return this.step !== 'done';
  }

  /** May this input happen now? (Anything else is refused with a dull click.) */
  allows(input: TutInput, ctx: TutCtx): boolean {
    const s = ctx.state;
    // reading units and starting over are always fine
    if (input.kind === 'inspect' || input.kind === 'restart') return true;
    if (input.kind === 'select') return input.unit === HERO;
    const hero = unitById(s, HERO);
    switch (this.step) {
      case 'move':
        return input.kind === 'move' && input.x === TUT_MOVE.x && input.y === TUT_MOVE.y;
      case 'strike': {
        const first = unitById(s, TUT_FIRST);
        return input.kind === 'act' && !!first && input.x === first.x && input.y === first.y;
      }
      case 'endTurn':
        return input.kind === 'endTurn';
      case 'dodge':
        return input.kind === 'move' && !isRed(s, input.x, input.y);
      case 'undo':
        return input.kind === 'undo';
      case 'finish': {
        const second = unitById(s, TUT_SECOND);
        // only tiles that are safe AND next to the spearman, so the strike can follow
        if (input.kind === 'move') return !!second && !isRed(s, input.x, input.y) && Math.abs(input.x - second.x) + Math.abs(input.y - second.y) === 1;
        return input.kind === 'act' && !!hero?.moved && !!second && input.x === second.x && input.y === second.y;
      }
      default:
        return false;
    }
  }

  /** Re-check the current step against the new situation; advance if it is done. */
  after(ctx: TutCtx): void {
    for (let guard = 0; guard < TUT_STEPS.length && this.active && this.isDone(ctx); guard++) this.index++;
  }

  private isDone(ctx: TutCtx): boolean {
    const s = ctx.state;
    const hero = unitById(s, HERO);
    switch (this.step) {
      case 'select': return ctx.selected === HERO;
      case 'move': return !!hero && hero.x === TUT_MOVE.x && hero.y === TUT_MOVE.y;
      case 'strike': { const f = unitById(s, TUT_FIRST); return !f || !onBoard(f); }
      case 'read': return ctx.info === TUT_SECOND;
      case 'endTurn': return s.turn >= 2 && s.phase === 'player';
      case 'dodge': return !!hero && hero.moved && !isRed(s, hero.x, hero.y);
      case 'undo': return ctx.last?.kind === 'undo' && !!hero && !hero.moved;
      case 'finish': return s.phase === 'won';
      default: return false;
    }
  }

  /** What to highlight for the current step. */
  target(s: GameState): TutTarget {
    const hero = unitById(s, HERO);
    switch (this.step) {
      case 'select': return { kind: 'unit', id: HERO };
      case 'move': return { kind: 'tile', ...TUT_MOVE };
      case 'strike': return { kind: 'unit', id: TUT_FIRST };
      case 'read': {
        const tiles = threatTiles(s);
        // Achilles stays lit too: he is the one the lesson is about
        return { kind: 'units', ids: [TUT_SECOND, HERO].filter((id) => !!unitById(s, id)), tiles };
      }
      case 'endTurn': return { kind: 'button', label: 'End turn' };
      case 'undo': return { kind: 'button', label: 'Undo' };
      case 'dodge':
      case 'finish':
        return { kind: 'units', ids: [HERO, TUT_SECOND].filter((id) => !!unitById(s, id)), tiles: hero ? threatTiles(s) : [] };
      default: return { kind: 'board' };
    }
  }

  skip(): void {
    this.index = TUT_STEPS.length - 1;
  }
}
