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

test('chapter 2: interface presets change the reflection coefficient', async ({ page }) => {
  await page.goto('chapitres/02-ondes-planes/');
  const eq = page.locator('figure.eq[aria-label^="Coefficient de réflexion"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('0,600');
  const preset = page.getByRole('button', { name: 'Surface libre' });
  await hydrated(page, preset);
  await preset.click();
  await eq.scrollIntoViewIfNeeded();
  await expect(eq).toContainText(/[−-]1,000/);
});

test('chapter 3: doubling the bottle volume lowers the note by √2', async ({ page }) => {
  await page.goto('chapitres/03-guides-cavites/');
  const eq = page.locator('figure.eq[aria-label^="Fréquence propre du résonateur"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('104');
  const field = page.getByLabel('volume de la cavité, valeur en L').first();
  await hydrated(page, field);
  await field.fill('1,5');
  await field.press('Enter');
  await eq.scrollIntoViewIfNeeded();
  await expect(eq).toContainText('74 Hz');
});

test('chapter 4: a larger piston narrows the beam', async ({ page }) => {
  await page.goto('chapitres/04-rayonnement/');
  const eq = page.locator('figure.eq[aria-label^="Directivité du piston"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('19');
  const field = page.getByLabel('rayon du piston rapporté à la longueur d’onde, valeur').first();
  await hydrated(page, field);
  await field.fill('10');
  await field.press('Enter');
  await eq.scrollIntoViewIfNeeded();
  await expect(eq).toContainText('9');
  await expect(eq).not.toContainText('19');
});

test('chapter 5: a moving observer hears less than a moving source', async ({ page }) => {
  await page.goto('chapitres/05-sources-en-mouvement/');
  const eq = page.locator('figure.eq[aria-label^="Effet Doppler"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('2,00');
  const toggle = page.getByRole('radio', { name: 'Les auditeurs' }).first();
  await hydrated(page, toggle);
  await toggle.click();
  await eq.scrollIntoViewIfNeeded();
  await expect(eq).toContainText('1,50');
});

test('chapter 6: without the diffracted wave, the shadow is silent', async ({ page }) => {
  await page.goto('chapitres/06-diffraction-diffusion/');
  const eq = page.locator('figure.eq[aria-label^="Champ autour de l"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('−13');
  const toggle = eq.getByRole('switch').first();
  await toggle.click();
  await expect(eq).toContainText('−100');
});

test('chapter 7: Eyring falls below Sabine when absorption grows', async ({ page }) => {
  await page.goto('chapitres/07-acoustique-des-salles/');
  const eq = page.locator('figure.eq[aria-label^="Durées de réverbération"]');
  await hydrated(page, eq);
  await expect(eq).toContainText('1,18');
  await expect(eq).toContainText('1,09');
  const field = page.getByLabel('coefficient d’absorption moyen, valeur').first();
  await hydrated(page, field);
  await field.fill('0,8');
  await field.press('Enter');
  await eq.scrollIntoViewIfNeeded();
  await expect(eq).toContainText('0,22');
  await expect(eq).toContainText('0,11');
});
