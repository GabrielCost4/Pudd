import { test, expect } from '@playwright/test';
import { mockApi, login } from './api.fixture';

test('profile search waits for two characters, shows avatars and navigates using the keyboard', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.avatarUsers.add(api.users[1].id);
  await login(page);
  const input = page.getByRole('combobox', { name: 'Pesquisar perfis por nome' });
  for (const width of [1920, 1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => {
        const search = await input.boundingBox();
        const feed = await page.locator('.feed').boundingBox();
        return Math.abs(search!.x - feed!.x);
      })
      .toBeLessThan(1);
    expect((await input.boundingBox())!.width).toBeLessThanOrEqual(289);
  }
  await expect(page.locator('.app-controls').getByRole('combobox')).toBeVisible();
  await expect(page.locator('.app-controls .pi-search')).toBeVisible();
  await expect(input).toHaveCSS('border-top-left-radius', '20px');
  await expect(input).toHaveCSS('padding-left', '44px');
  await input.fill('A');
  await page.waitForTimeout(400);
  expect(api.calls.filter((call) => call.path === '/users/search')).toHaveLength(0);
  await input.fill('Ana');
  const option = page.getByRole('option', { name: 'Ana Dev' });
  await expect(option).toBeVisible();
  await expect(option.locator('img')).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/profile\/22222222-/);
});

test('admin search selects a member with moderation actions and can return to the full list', async ({
  page,
}) => {
  await mockApi(page);
  await login(page, 'admin@example.test');
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  await page.getByRole('combobox', { name: 'Pesquisar membros por nome' }).fill('Ana');
  await page.getByRole('option', { name: 'Ana Dev' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Ana Dev' })).toContainText('Bloquear');
  await expect(page.getByRole('row').filter({ hasText: 'Gabriel Dev' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar todos os membros' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Gabriel Dev' })).toBeVisible();
});

test('admin separates recent activity from access and displays missing dates on desktop and mobile', async ({
  page,
}) => {
  await mockApi(page);
  await login(page, 'admin@example.test');
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.app-controls').getByRole('combobox')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const member =
      width > 600
        ? page.getByRole('row').filter({ hasText: 'Ana Dev' })
        : page.locator('.mobile-members .member').filter({ hasText: 'Ana Dev' });
    await expect(member).toContainText('Inativo');
    await expect(member).toContainText('Permitido');
    await expect(member).toContainText('Sem registro');
    await page.screenshot({ path: `test-results/activity-${width}.png`, fullPage: true });
  }
});
