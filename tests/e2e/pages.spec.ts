import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES } from './pages';

for (const p of PAGES) {
  test.describe(p.name, () => {
    test('renders without errors, accessible, no horizontal scroll', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(p.path);
      await expect(page.locator('h1').first()).toBeVisible();
      // Hydrate every island by scrolling through the page.
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 700) await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'horizontal page overflow (px)').toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
