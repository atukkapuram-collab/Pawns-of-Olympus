import { defineConfig, devices } from '@playwright/test';
import base, { BASE_URL } from './playwright.config';

// `npm run screenshots`: captures every screen into docs/screenshots/.
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/screenshots.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: { baseURL: BASE_URL },
  projects: [
    {
      name: 'shots',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    },
  ],
});
