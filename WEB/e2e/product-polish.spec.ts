import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('shows an accessible loading state and recovers from a failed feed request', async ({
  page,
}) => {
  await mockApi(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/posts?**', async (route) => {
    await pending;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Serviço indisponível.' }),
    });
  });
  await login(page);
  await expect(page.getByRole('status', { name: 'Carregando publicações' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nenhuma publicação', exact: true })).toHaveCount(
    0,
  );
  release();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar as publicações.' }),
  ).toBeVisible();
  await page.unroute('**/api/posts?**');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('app-post-card')).toHaveCount(2);
});

test('discards profile edits from either close action and associates validation with the name field', async ({
  page,
}) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  const edit = page.getByRole('button', { name: 'Editar perfil', exact: true });
  await edit.click();
  await page.getByLabel('Nome', { exact: true }).fill('Alteração não salva');
  await page.locator('input[type=file]').setInputFiles({
    name: 'discarded.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByRole('button', { name: 'Enviar foto', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Fechar edição', exact: true }).click();
  await edit.click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Gabriel Dev');
  await expect(page.getByRole('button', { name: 'Enviar foto', exact: true })).toBeDisabled();
  await page.getByLabel('Nome', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#profile-name-error')).toBeVisible();
  expect(api.calls.filter((call) => call.method === 'PUT')).toHaveLength(0);
});

test('renders the local font and keeps authentication and administration usable on tablet', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/register');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 16px Manrope'))).toBe(true);
  await page.screenshot({ path: 'test-results/register-tablet.png', fullPage: true });
  await login(page, 'admin@example.test');
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-tablet.png', fullPage: true });
});

test('reveals the skip link only on keyboard focus and moves focus into the page', async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo', exact: true });
  expect(await skip.evaluate((el) => getComputedStyle(el).clipPath)).not.toBe('none');
  await skip.focus();
  expect(await skip.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
  await expect(skip).toBeInViewport({ ratio: 1 });
  const feedUrl = page.url();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveURL(feedUrl);
  await expect(page.locator('app-post-card')).toHaveCount(2);
});
