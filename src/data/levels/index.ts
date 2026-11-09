/** Campaign order. Add new levels here (and in docs/LEVELS.md). */
import type { LevelData } from '../../core/level';
import a101 from './a1-01.json';
import a102 from './a1-02.json';
import a103 from './a1-03.json';

export const LEVELS: LevelData[] = [a101, a102, a103] as unknown as LevelData[];

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((l) => l.id === id);
}
