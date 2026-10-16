import { expect, test } from '@playwright/test';
import { FIRST, login, mockApi } from './api.fixture';

test('opens post images in Galleria and restores focus after keyboard, close button and backdrop dismissal', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.posts[0].hasImage = true;
  const photo =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#114d4d"/><circle cx="500" cy="350" r="200" fill="#6e9987"/></svg>',
    );
  await page.route('**/api/posts/*/image', (route) =>
    route.fulfill({ json: { url: photo, expiresInSeconds: 3600 } }),
  );
  await login(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const trigger = page.getByRole('button', { name: 'Ampliar imagem da publicação', exact: true });
    const card = page.locator('app-post-card').first();
    const contentBounds = await card.locator('.content-text').boundingBox();
    const mediaBounds = await card.locator('.post-image').boundingBox();
    expect(Math.abs(mediaBounds!.width - contentBounds!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(mediaBounds!.x - contentBounds!.x)).toBeLessThanOrEqual(1);
    expect(
      await trigger.locator('img').evaluate((image) => getComputedStyle(image).objectFit),
    ).toBe('contain');
    await page.screenshot({ path: `test-results/post-media-${width}.png`, fullPage: true });
    const url = page.url();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const gallery = page.getByRole('dialog', { name: 'Imagem da publicação', exact: true });
    await expect(gallery).toBeVisible();
    await expect(gallery.getByAltText('Imagem ampliada da publicação')).toHaveAttribute(
      'src',
      photo,
    );
    const image = await gallery.locator('img').boundingBox();
    expect(image!.width).toBeLessThanOrEqual(width);
    expect(image!.height).toBeLessThanOrEqual(900);
    await page.screenshot({ path: `test-results/gallery-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(url);
    await trigger.click();
    await gallery.getByRole('button', { name: 'Fechar imagem', exact: true }).click();
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await gallery.click({ position: { x: 8, y: 8 } });
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
  }
  await page
    .locator('app-post-card')
    .first()
    .getByRole('link', { name: 'Comentar', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp('/posts/' + FIRST));
  await page.getByRole('button', { name: 'Ampliar imagem da publicação', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Imagem da publicação', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
});
