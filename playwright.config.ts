import { defineConfig, devices } from '@playwright/test';

// e2e runs against the production build served under a GitHub-Pages-style
// sub-path. `npm run check` builds first and sets E2E_SKIP_BUILD=1; a standalone
// `npm run e2e` builds itself.
const PORT = 4180;
export const BASE_URL = `http://localhost:${PORT}/pawns-of-olympus/`;
const serve = `node tools/serve-static.mjs ${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: ['**/screenshots.spec.ts', '**/export-sprites.spec.ts'],
  timeout: 60_000,
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? serve : `npx vite build --logLevel warn && ${serve}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'touch', use: { ...devices['Pixel 7 landscape'], browserName: 'chromium' } },
  ],
});
