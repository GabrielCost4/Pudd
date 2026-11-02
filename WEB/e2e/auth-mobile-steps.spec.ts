import { expect, test } from '@playwright/test';

test('mobile authentication keeps steps usable above the form', async ({ page }) => {
  for (const width of [320, 390, 700]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/login', '/register', '/forgot-password']) {
      await page.goto(route);
      const steps = page.locator('.community-step-button');
      await expect(steps).toHaveCount(3);
      await expect(page.locator('.auth-art')).toBeVisible();
      await steps.nth(1).click();
      await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
      await expect(page.locator('.community-step-content:visible')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const intro = await page.locator('.auth-art').boundingBox();
      const form = await page.locator('.login-panel').boundingBox();
      expect(form!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
      await page.locator('.login-panel input').first().scrollIntoViewIfNeeded();
      await expect(page.locator('.login-panel input').first()).toBeInViewport();
      if (width === 390) {
        await page.screenshot({
          path: `test-results/mobile-steps-${route.slice(1)}.png`,
          fullPage: true,
        });
      }
    }
  }
});
