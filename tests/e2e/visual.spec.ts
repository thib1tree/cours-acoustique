import { test, expect } from '@playwright/test';

// Visual regression on the first screen of key pages, light and dark. Animations are
// paused by prefers-reduced-motion, so frames are deterministic.
test.use({ reducedMotion: 'reduce' });

const SHOTS = [
  { path: './', name: 'accueil' },
  { path: 'carte/', name: 'carte' },
  { path: 'chapitres/01a-equation-des-ondes/', name: 'chapitre-1a' },
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const s of SHOTS) {
    test(`${s.name} (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(s.path);
      await page.evaluate(() => document.fonts.ready);
      if (s.name === 'accueil')
        await page.locator('canvas.field[data-ready="true"]').waitFor({ timeout: 15_000 });
      await page.waitForTimeout(600);
      await expect(page).toHaveScreenshot(`${s.name}-${theme}.png`);
    });
  }
}
