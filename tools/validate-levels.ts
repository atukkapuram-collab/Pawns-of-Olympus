// `npm run validate-levels`: schema check + solution replay for every level.
// The real validator lands in M2; for now it lists level files.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'src', 'data', 'levels');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
console.log(`validate-levels: ${files.length} level file(s) found (validator arrives in M2)`);
