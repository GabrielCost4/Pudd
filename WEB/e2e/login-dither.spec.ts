import { expect, test } from '@playwright/test';

test('animates abstract dither without loading portrait assets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/login');
  const canvas = page.locator('.dither-effect');
  await expect(canvas).toHaveClass(/ready/);
  const first = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()))
    .not.toBe(first);
  expect(requests.some((url) => /portrait|renaissance|day.png|night.png/.test(url))).toBe(false);
  await page.screenshot({ path: 'test-results/login-animated-dither.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).not.toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
});

test('keeps a static dither frame when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  const canvas = page.locator('.dither-effect');
  await expect(canvas).toHaveClass(/ready/);
  const unchanged = await canvas.evaluate(async (element: HTMLCanvasElement) => {
    const first = element.toDataURL();
    await new Promise((resolve) => setTimeout(resolve, 250));
    return first === element.toDataURL();
  });
  expect(unchanged).toBe(true);
});
