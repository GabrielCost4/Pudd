import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('keeps the authenticated page and API authorization after reload', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  const loginCount = api.calls.filter((call) => call.path === '/Auth/login').length;
  await page.reload();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.locator('app-post-card').first()).toBeVisible();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/me$/);
  await expect(page.locator('app-profile h2').first()).toContainText('Gabriel Dev');
  const profileUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(profileUrl);
  await expect(page.locator('app-profile h2').first()).toContainText('Gabriel Dev');
  expect(api.calls.filter((call) => call.path === '/Auth/login')).toHaveLength(loginCount);
  expect(
    api.calls
      .filter((call) => call.path === '/users/me')
      .every((call) => call.authorization?.startsWith('Bearer ')),
  ).toBe(true);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/feed');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page.reload();
  await expect(page.locator('#login-title')).toBeVisible();
});
