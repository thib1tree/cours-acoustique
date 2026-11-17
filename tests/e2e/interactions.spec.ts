import { test, expect, type Page, type Locator } from '@playwright/test';

/** Wait until the Astro island containing `inner` has hydrated. */
async function hydrated(page: Page, inner: Locator) {
  await inner.scrollIntoViewIfNeeded();
  await expect(inner.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', /.*/);
  void page;
}

const CH1A = 'chapitres/01a-equation-des-ondes/';

test('slider: arrow keys change the value, typed values are accepted', async ({ page }) => {
  await page.goto(CH1A);
  const slider = page.locator('#s-1a-tube-L');
  await hydrated(page, slider);
  const field = page.getByLabel('niveau de pression, valeur en dB').first();
  await expect(field).toHaveValue('94');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(field).toHaveValue('95');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(field).toHaveValue('105');
  await field.fill('120');
  await field.press('Enter');
  await expect(field).toHaveValue('120');
});

test('scene state is restored from the URL (shareable configuration)', async ({ page }) => {
  await page.goto(`${CH1A}?1a-tube=L:120;view:euler`);
  const field = page.getByLabel('niveau de pression, valeur en dB').first();
  await field.scrollIntoViewIfNeeded();
  await expect(field).toHaveValue('120');
  await expect(page.getByRole('radio', { name: 'Eulérienne' }).first()).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('switching a term off strikes it in the live equation', async ({ page }) => {
  await page.goto(CH1A);
  const eq = page.locator('figure.eq[aria-label^="Système linéarisé"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('343,2');
  await eq.getByRole('switch', { name: 'inertie' }).click();
  await expect(eq.locator('.term-off')).toHaveCount(1);
  await expect(eq).toContainText('∞');
});

test('numeric quiz accepts an answer within tolerance and shows the correction', async ({
  page,
}) => {
  await page.goto(CH1A);
  const quiz = page.locator('form[data-quiz]').filter({ hasText: 'éclair' });
  await quiz.scrollIntoViewIfNeeded();
  await quiz.locator('input').fill('5,8');
  await quiz.getByRole('button', { name: 'Vérifier' }).click();
  await expect(quiz.locator('.quiz-feedback')).toHaveText('Juste.');
  await expect(quiz.locator('.quiz-explanation')).toBeVisible();
});

test('a prediction is locked and survives a reload', async ({ page }) => {
  await page.goto(CH1A);
  const form = page.locator('form[data-predict="eau"]');
  await form.getByText('Plus vite que dans l’air.').click();
  await form.getByRole('button').click();
  await expect(form.locator('.predict-locked')).toBeVisible();
  await page.reload();
  await expect(form.locator('input[value="2"]')).toBeChecked();
  await expect(form.locator('input[value="2"]')).toBeDisabled();
});

test('theme toggle switches and remembers the theme', async ({ page }) => {
  await page.goto('carte/');
  await page.getByRole('button', { name: 'Basculer entre thème clair et sombre' }).click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme === 'dark' || theme === 'light').toBe(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
});

test('course map shows the missing prerequisite path', async ({ page }) => {
  await page.goto('carte/?n=rayonnement');
  await expect(page.locator('.d-title')).toHaveText('Rayonnement');
  await expect(page.locator('.d-path li').first()).toBeVisible();
});
