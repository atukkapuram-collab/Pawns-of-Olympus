/** A playing session: current state plus undo history. */
import { loadLevel, type LevelData } from './level';
import { applyAction } from './rules';
import type { Action, ApplyResult, GameState, PatronId } from './types';

export class Session {
  state: GameState;
  /** States since the start of the current player phase (for Undo). */
  private undoStack: GameState[] = [];
  /** State at the start of each player phase (for "Undo last turn"). */
  private turnStarts: GameState[] = [];

  constructor(
    readonly level: LevelData,
    readonly patron: PatronId | null,
  ) {
    this.state = loadLevel(level, patron);
    this.turnStarts.push(this.state);
  }

  dispatch(action: Action): ApplyResult {
    const before = this.state;
    const r = applyAction(before, action);
    if (r.error) return r;
    this.state = r.state;
    if (action.type === 'endTurn') {
      this.undoStack = [];
      if (r.state.phase === 'player') this.turnStarts.push(r.state);
    } else {
      this.undoStack.push(before);
    }
    return r;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0 && this.state.phase === 'player';
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    return true;
  }

  /** Back to the start of the last player phase (used from the defeat screen). */
  undoLastTurn(): boolean {
    const start = this.turnStarts[this.turnStarts.length - 1];
    if (!start) return false;
    this.state = start;
    this.undoStack = [];
    return true;
  }

  restart(): void {
    this.state = loadLevel(this.level, this.patron);
    this.undoStack = [];
    this.turnStarts = [this.state];
  }
}
