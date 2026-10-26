import { expect, test } from '@playwright/test';
import { FIRST, OTHER, login, mockApi } from './api.fixture';

test('opens post images with zoom and pan and restores focus after keyboard, close button and backdrop dismissal', async ({
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
    const gallery = page.getByRole('dialog', { name: 'Imagem ampliada', exact: true });
    await expect(gallery).toBeVisible();
    const frame = await gallery.locator('.viewer').boundingBox();
    expect(Math.abs(frame!.width - Math.min(width * 0.92, 960))).toBeLessThanOrEqual(1);
    expect(Math.abs(frame!.height - 720)).toBeLessThanOrEqual(1);
    await expect(gallery.getByAltText('Imagem da publicação')).toHaveAttribute('src', photo);
    const image = await gallery.locator('img').boundingBox();
    expect(image!.width).toBeLessThanOrEqual(width);
    expect(image!.height).toBeLessThanOrEqual(900);
    await expect(gallery.getByRole('button', { name: /Girar/ })).toHaveCount(0);
    const fittedTransform = await gallery
      .locator('img')
      .evaluate((img) => getComputedStyle(img).transform);
    await gallery.getByRole('button', { name: 'Ampliar imagem', exact: true }).click();
    await expect(gallery.locator('output')).toHaveText('125%');
    const viewport = gallery.getByRole('region');
    await expect(viewport).toHaveCSS('cursor', 'grab');
    const initialTransform = await gallery
      .locator('img')
      .evaluate((img) => getComputedStyle(img).transform);
    const area = (await viewport.boundingBox())!;
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.down();
    await expect(viewport).toHaveCSS('cursor', 'grabbing');
    await page.mouse.move(area.x + area.width / 2 + 60, area.y + area.height / 2 + 60, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(gallery.locator('img')).not.toHaveCSS('transform', initialTransform);
    expect(
      await gallery
        .locator('img')
        .evaluate((img) => Math.abs(parseFloat(img.style.getPropertyValue('--pan-x')))),
    ).toBeGreaterThan(0);
    await page.screenshot({ path: `test-results/gallery-${width}.png` });
    await gallery.getByRole('button', { name: 'Ajustar', exact: true }).click();
    await expect(gallery.locator('output')).toHaveText('100%');
    await expect(gallery.locator('img')).toHaveCSS('transform', fittedTransform);
    await page.keyboard.press('Escape');
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(url);
    await trigger.click();
    await gallery.getByRole('button', { name: 'Fechar imagem', exact: true }).click();
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(2, 2);
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
  await expect(page.getByRole('dialog', { name: 'Imagem ampliada', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('opens a member profile photo with a pointer cursor and restores focus after closing', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.avatarUsers.add(OTHER);
  await login(page);
  await page.locator('app-post-card').filter({ hasText: 'Ana Dev' }).locator('a.author').click();
  await expect(page).toHaveURL(new RegExp('/profile/' + OTHER));
  const trigger = page.getByRole('button', { name: 'Abrir imagem ampliada', exact: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS('cursor', 'zoom-in');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const gallery = page.getByRole('dialog', { name: 'Imagem ampliada', exact: true });
    await expect(gallery).toBeVisible();
    await expect(gallery.getByAltText('Foto de Ana Dev', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await gallery.getByRole('button', { name: 'Fechar imagem', exact: true }).click();
    await expect(gallery).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});
