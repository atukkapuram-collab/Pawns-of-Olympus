// Pretty-prints level JSON files in the house style (one unit / solution turn
// per line, board rows stacked). Usage: node tools/format-level.mjs <file.json> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, dst] = process.argv;
if (!src) {
  console.error('usage: node tools/format-level.mjs <file.json> [out.json]');
  process.exit(1);
}
const l = JSON.parse(readFileSync(src, 'utf8'));
const j = (v) => JSON.stringify(v).replace(/,(?=["{[\d-])/g, ', ').replace(/":/g, '": ');
const lines = ['{'];
const keys = Object.keys(l);
keys.forEach((k, i) => {
  const comma = i < keys.length - 1 ? ',' : '';
  const v = l[k];
  if (k === 'board') lines.push(`  "board": [\n${v.map((r) => `    ${JSON.stringify(r)}`).join(',\n')}\n  ]${comma}`);
  else if (k === 'units') lines.push(`  "units": [\n${v.map((u) => `    ${j(u)}`).join(',\n')}\n  ]${comma}`);
  else if (k === 'solution') {
    lines.push(`  "solution": {\n    "patron": ${JSON.stringify(v.patron)},\n    "turns": [\n${v.turns.map((t) => `      ${j(t)}`).join(',\n')}\n    ]\n  }${comma}`);
  } else lines.push(`  ${JSON.stringify(k)}: ${j(v)}${comma}`);
});
lines.push('}', '');
writeFileSync(dst ?? src, lines.join('\n'));
console.log(`formatted ${dst ?? src}`);
