import { expect, test } from '@playwright/test';

test('moves the local landscape slowly and keeps the mobile form usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login');
  const landscape = page.locator('.landscape-motion');
  await expect(landscape).toHaveCSS('animation-name', /landscape-drift/);
  await expect(landscape).toBeVisible();
  await page.screenshot({ path: 'test-results/login-landscape-motion.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(landscape).not.toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
});

test('keeps the landscape still when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  const landscape = page.locator('.landscape-motion');
  await expect(landscape).toHaveCSS('animation-name', 'none');
  await page.getByRole('switch', { name: 'Ativar modo escuro', exact: true }).check();
  await expect(landscape).toHaveCSS('animation-name', 'none');
});
