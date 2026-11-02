import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test.use({ hasTouch: true });

test('removes the profile banner using the mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await mockApi(page);
  await page.route('**/api/users/me', (route) =>
    route.fulfill({ json: { ...api.profile, hasBanner: true } }),
  );
  let removed = false;
  await page.route('**/api/users/*/banner', (route) => {
    if (route.request().method() === 'DELETE') {
      removed = true;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({
      json: {
        url:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="800" height="200" fill="teal"/></svg>',
          ),
        expiresInSeconds: 3600,
      },
    });
  });
  await login(page);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).tap();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).tap();
  await expect(page.locator('.profile-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Editar banner', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Remover banner', exact: true }).tap();
  const confirmation = page.getByRole('alertdialog', { name: 'Remover banner', exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Confirmar', exact: true }).tap();
  await expect(page.getByText('Banner removido.', { exact: true })).toBeVisible();
  expect(removed).toBe(true);
  await expect(page.locator('.profile-banner')).toHaveCount(0);
});
