import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test.use({ hasTouch: true });
test('feed and profile open images fullscreen with pinch zoom', async ({ page, context }) => {
  const api = await mockApi(page);
  api.posts[0].hasImage = true;
  const photo =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="teal"/></svg>',
    );
  await page.route('**/api/posts/*/image', (route) =>
    route.fulfill({ json: { url: photo, expiresInSeconds: 3600 } }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Ampliar imagem da publicação', exact: true }).tap();
  const surface = page.locator('.mobile-image-surface:popover-open');
  await expect(surface).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Imagem ampliada' })).toHaveCount(0);
  const bounds = (await surface.boundingBox())!;
  expect(bounds.width).toBe(390);
  expect(bounds.height).toBe(844);
  const viewport = surface.locator('.viewport');
  await expect(surface.locator('img')).toHaveJSProperty('naturalWidth', 1000);
  const area = (await viewport.boundingBox())!;
  const x = area.x + area.width / 2,
    y = area.y + area.height / 2;
  const fittedWidth = (await surface.locator('img').boundingBox())!.width;
  await expect(surface.locator('.viewer-footer')).toBeHidden();
  await expect(surface.getByRole('button')).toHaveCount(0);
  await surface.locator('img').tap();
  await expect(surface).toBeVisible();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 35, y, id: 1 },
      { x: x + 35, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 90, y, id: 1 },
      { x: x + 90, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(async () => (await surface.locator('img').boundingBox())!.width)
    .toBeGreaterThan(fittedWidth * 1.5);
  await page.touchscreen.tap(5, 5);
  await expect(surface).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).tap();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).tap();
  await page.locator('app-post-tile img').waitFor();
  await page.getByRole('button', { name: 'Abrir publicação de Gabriel Dev' }).tap();
  await expect(surface).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Publicação', exact: true })).toBeHidden();
  await page.touchscreen.tap(5, 5);
  await expect(page.locator('app-post-tile button')).toBeFocused();
});
