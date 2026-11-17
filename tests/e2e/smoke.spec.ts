import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page renders and has no detectable a11y violations', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('h1')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('no horizontal page scroll', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
