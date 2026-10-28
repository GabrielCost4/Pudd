import { expect, test } from '@playwright/test';
import { FIRST, ME, login, mockApi } from './api.fixture';

test('separates images and texts in the profile and opens a complete post', async ({ page }) => {
  const api = await mockApi(page);
  api.posts[0].hasImage = true;
  const image =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1000"><rect width="600" height="1000" fill="#114d4d"/><circle cx="300" cy="350" r="180" fill="#6e9987"/><rect x="100" y="650" width="400" height="120" rx="20" fill="#e0e4ce"/></svg>',
    );
  await page.route('**/api/posts/*/image', (route) =>
    route.fulfill({ json: { url: image, expiresInSeconds: 3600 } }),
  );
  api.posts.push({
    ...api.posts[0],
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    content: 'Somente texto no perfil.\n'.repeat(120) + 'Fim da descrição.',
    hasImage: false,
  });
  await login(page);
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  const grid = page.locator('app-profile-posts');
  const imagesTab = grid.getByRole('button', { name: 'Imagens', exact: true });
  const textsTab = grid.getByRole('button', { name: 'Textos', exact: true });
  await expect(imagesTab).toHaveAttribute('aria-pressed', 'true');
  await expect(imagesTab).toHaveText('Imagens');
  await expect(textsTab).toHaveText('Textos');
  await expect(grid.locator('app-post-tile')).toHaveCount(1);
  await expect(grid.locator('app-post-tile img')).toBeVisible();
  await expect(grid).not.toContainText('Somente texto no perfil.');
  await grid.getByRole('button', { name: 'Abrir publicação de Gabriel Dev' }).click();
  const modal = page.getByRole('dialog', { name: 'Publicação', exact: true });
  await expect(modal.getByText('Meu primeiro projeto no Pudd.')).toBeVisible();
  await expect(modal.getByRole('link', { name: 'Comentar' })).toHaveAttribute(
    'href',
    '/posts/' + FIRST,
  );
  await expect(modal.locator('p-avatar')).toBeVisible();
  await expect(modal.getByRole('button', { name: /Curtir publicação/ })).toBeVisible();
  await expect(modal.locator('p-card')).toHaveCount(0);
  const media = (await modal.locator('.post-image').boundingBox())!;
  const copy = (await modal.locator('.post-copy').boundingBox())!;
  expect(media.x + media.width).toBeLessThanOrEqual(copy.x + 1);
  expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/profile-post-modal-desktop.png' });
  await page.keyboard.press('Escape');
  await grid.getByRole('button', { name: 'Textos', exact: true }).click();
  await expect(imagesTab).toHaveAttribute('aria-pressed', 'false');
  await expect(textsTab).toHaveAttribute('aria-pressed', 'true');
  await expect(grid.locator('app-post-tile')).toHaveCount(1);
  await expect(grid).toContainText('Somente texto no perfil.');
  await expect(grid.locator('img')).toHaveCount(0);
  expect(api.calls.some((call) => call.path === '/posts')).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/profile-text-grid.png', fullPage: true });
  await grid.getByRole('button', { name: 'Imagens', exact: true }).click();
  await expect(imagesTab).toHaveAttribute('aria-pressed', 'true');
  await expect(textsTab).toHaveAttribute('aria-pressed', 'false');
  await expect(grid.locator('img')).toBeVisible();
  await page.screenshot({ path: 'test-results/profile-image-grid.png', fullPage: true });
  await grid.getByRole('button', { name: 'Abrir publicação de Gabriel Dev' }).click();
  await expect(modal).toBeVisible();
  const mobileMedia = (await modal.locator('.post-image').boundingBox())!;
  const mobileAuthor = (await modal.locator('header').boundingBox())!;
  expect(mobileMedia.y + mobileMedia.height).toBeLessThanOrEqual(mobileAuthor.y + 1);
  const comment = modal.getByRole('link', { name: 'Comentar' });
  await comment.scrollIntoViewIfNeeded();
  await expect(comment).toBeInViewport();
  expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/profile-post-modal-mobile.png' });
  await page.keyboard.press('Escape');
  await grid.getByRole('button', { name: 'Textos', exact: true }).click();
  await grid.getByRole('button', { name: 'Abrir publicação de Gabriel Dev' }).click();
  await expect(modal).toContainText('Somente texto no perfil.');
  await expect(modal.locator('.post-image')).toHaveCount(0);
  await modal.getByRole('link', { name: 'Comentar' }).scrollIntoViewIfNeeded();
  await expect(modal.getByRole('link', { name: 'Comentar' })).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect
    .poll(() =>
      modal
        .locator('.post-copy')
        .evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true);
  await expect(modal.getByRole('link', { name: 'Comentar' })).toBeInViewport();
  await modal
    .locator('.post-copy')
    .evaluate((element) => (element.scrollTop = element.scrollHeight));
  await page.screenshot({ path: 'test-results/profile-text-modal-desktop.png' });
  await page.keyboard.press('Escape');
  expect(api.posts[0].userID).toBe(ME);
});
