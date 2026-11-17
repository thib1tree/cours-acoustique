import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE = `http://localhost:${PORT}/cours-acoustique/`;

/**
 * Five viewport classes (CLAUDE.md § 9). All run on Chromium so the suite stays fast;
 * device descriptors keep their touch and DPR settings.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE, trace: 'off' },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  projects: [
    { name: 'phone-small', use: { ...devices['iPhone SE'], browserName: 'chromium' } },
    { name: 'phone-large', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'tablet', use: { ...devices['iPad Mini'], browserName: 'chromium' } },
    { name: 'laptop', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
    {
      name: 'desktop-large',
      use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: `pnpm astro preview --port ${PORT} --ignore-lock`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
  },
});
