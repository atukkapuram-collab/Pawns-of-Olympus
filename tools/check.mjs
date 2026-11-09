// `npm run check`: typecheck -> lint -> unit tests -> level validation -> build -> e2e.
// A Node script (not an && chain) so it runs identically in PowerShell, cmd and bash.
import { spawnSync } from 'node:child_process';

const steps = [
  ['typecheck', 'npx tsc --noEmit'],
  ['lint', 'npx eslint .'],
  ['test', 'npx vitest run'],
  ['validate-levels', 'npx vite-node tools/validate-levels.ts'],
  ['build', 'npx vite build --logLevel warn'],
  ['e2e', 'npx playwright test', { E2E_SKIP_BUILD: '1' }],
];

for (const [name, cmd, env] of steps) {
  console.log(`\n=== check: ${name} ===`);
  const t = Date.now();
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, env: { ...process.env, ...(env ?? {}) } });
  if (r.status !== 0) {
    console.error(`\ncheck FAILED at "${name}" (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
  console.log(`--- ${name} ok (${((Date.now() - t) / 1000).toFixed(1)}s)`);
}
console.log('\ncheck: all steps passed');
