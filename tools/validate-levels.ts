/**
 * `npm run validate-levels`: for every level JSON file:
 *  1. schema check, 2. replay the recorded solution (must win within par),
 *  3. lint: not winnable in a single turn; every listed level is in index.ts.
 * Exits non-zero on any error. Warnings don't fail.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LevelData } from '../src/core/level';
import { replaySolution } from '../src/core/replay';
import { lintLevel } from '../src/core/lint';
import { LEVELS } from '../src/data/levels/index';

const dir = resolve(import.meta.dirname, '..', 'src', 'data', 'levels');
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
let failed = 0;
const indexed = new Set(LEVELS.map((l) => l.id));

for (const f of files) {
  let level: LevelData;
  try {
    level = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as LevelData;
  } catch (e) {
    console.log(`FAIL ${f}: invalid JSON (${(e as Error).message})`);
    failed++;
    continue;
  }
  const r = replaySolution(level);
  const lint = r.ok ? lintLevel(level) : { errors: [], warnings: [] };
  const errors = [...r.errors, ...lint.errors];
  if (!indexed.has(level.id)) errors.push('not listed in src/data/levels/index.ts');
  if (`${level.id}.json` !== f) errors.push(`file name should be ${level.id}.json`);
  const stars = r.stars.map((s) => (s ? '*' : '.')).join('');
  if (errors.length) {
    failed++;
    console.log(`FAIL ${level.id} "${level.title}"`);
    for (const e of errors) console.log(`     - ${e}`);
  } else {
    console.log(`ok   ${level.id} "${level.title}" wins in ${r.turnsUsed}/${level.par} [${stars}]`);
  }
  for (const w of lint.warnings) console.log(`     warn: ${w}`);
}
console.log(`\nvalidate-levels: ${files.length - failed}/${files.length} levels ok`);
process.exit(failed ? 1 : 0);
