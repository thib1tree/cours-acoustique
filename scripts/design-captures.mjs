import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('../docs/design', import.meta.url));
const out = base + '/captures';
await (async () => {
  const browser = await chromium.launch();
  const jobs = [];
  for (const d of ['a', 'b']) {
    for (const theme of ['light', 'dark']) {
      jobs.push([d, 'accueil', 1440, 900, theme, false]);
      jobs.push([d, 'chapitre', 1440, 900, theme, true]);
      jobs.push([d, 'carte', 1440, 900, theme, true]);
      jobs.push([d, 'accueil', 390, 844, theme, false]);
      jobs.push([d, 'chapitre', 390, 844, theme, false]);
      jobs.push([d, 'carte', 390, 844, theme, false]);
    }
    jobs.push([d, 'chapitre', 820, 1180, 'light', false]);
  }
  for (const [d, v, w, h, theme, full] of jobs) {
    const mobile = w < 800;
    const page = await browser.newPage({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on('pageerror', (e) => console.log(d, v, 'pageerror:', e.message));
    await page.goto(`file://${base}/${d}/${v}.html?static=1&theme=${theme}`);
    await page.waitForTimeout(700);
    if (v === 'chapitre' && mobile)
      await page.evaluate(() =>
        window.scrollTo(0, document.querySelector('figure').offsetTop - 60),
      );
    await page.waitForTimeout(200);
    const kind = w >= 1200 ? 'desktop' : w >= 800 ? 'tablet' : 'mobile';
    await page.screenshot({ path: `${out}/${d}-${v}-${kind}-${theme}.png`, fullPage: full });
    await page.close();
  }
  await browser.close();
})();
