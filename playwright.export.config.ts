import { defineConfig, devices } from '@playwright/test';
import base, { BASE_URL } from './playwright.config';

// `npm run export-sprites`: writes PNG sprite sheets to art-export/.
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/export-sprites.spec.ts'],
  workers: 1,
  use: { baseURL: BASE_URL },
  projects: [{ name: 'export', use: { ...devices['Desktop Chrome'] } }],
});
