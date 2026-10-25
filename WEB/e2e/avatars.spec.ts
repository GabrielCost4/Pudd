import { test, expect } from '@playwright/test';
import { ME, OTHER, mockApi, login } from './api.fixture';

test('does not request missing avatars when switching between profiles and the feed', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  for (let visit = 0; visit < 3; visit++) {
    await page.locator('app-post-card').filter({ hasText: 'Uma ideia da comunidade.' })
      .locator('.author').click();
    await expect(page).toHaveURL(new RegExp('/profile/' + OTHER));
    await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
    await expect(page).toHaveURL(/\/profile\/me$/);
    await page.getByRole('link', { name: 'Feed', exact: true }).click();
    await expect(page).toHaveURL(/\/feed$/);
  }
  expect(api.calls.filter((call) => call.path.endsWith('/avatar'))).toHaveLength(0);
});

test('shows comment author photos and falls back to initials when an image fails', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.avatarUsers.add(OTHER);
  api.comments.push({ ...api.comments[0], id: crypto.randomUUID(), content: 'Outra conversa.' });
  api.comments.push({
    ...api.comments[0],
    id: crypto.randomUUID(),
    userID: ME,
    authorName: 'Gabriel Dev',
    content: 'Sem foto de perfil.',
  });
  await login(page);
  await page.getByRole('link', { name: 'Comentar', exact: true }).first().click();
  const comments = page.locator('app-comments');
  const photos = comments.locator('.avatar img');
  await expect(photos).toHaveCount(2);
  await expect(photos.first()).toBeVisible();
  await expect(
    comments.locator('.comment').filter({ hasText: 'Sem foto de perfil.' }).locator('p-avatar'),
  ).toHaveText('G');
  await photos.first().dispatchEvent('error', { bubbles: false });
  await expect(photos).toHaveCount(0);
  await expect(comments.locator('.comment').first().locator('p-avatar')).toHaveText('A');
});

test('shows current and other author photos and synchronizes avatar changes with the sidebar and feed', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.profile.hasAvatar = true;
  api.avatarUsers.add(OTHER);
  api.posts.push({ ...api.posts[1], id: crypto.randomUUID(), content: 'Outro projeto da Ana.' });
  await login(page);
  const sidebar = page.locator('.account');
  const own = page.locator('app-post-card').filter({ hasText: 'Meu primeiro projeto no Pudd.' });
  const other = page.locator('app-post-card').filter({ hasText: 'Uma ideia da comunidade.' });
  await expect(sidebar.locator('img')).toBeVisible();
  await expect(own.locator('.author img')).toBeVisible();
  await expect(other.locator('.author img')).toBeVisible();
  const original = await sidebar.locator('img').getAttribute('src');
  await expect(own.locator('.author img')).toHaveAttribute('src', original!);
  expect(api.calls.filter((call) => call.path === '/users/' + OTHER + '/avatar')).toHaveLength(1);
  await other.locator('.author').click();
  await expect(page).toHaveURL(new RegExp('/profile/' + OTHER));
  await expect(sidebar.locator('img')).toHaveAttribute('src', original!);

  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Enviar foto', exact: true }).click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Foto de perfil atualizada.',
  );
  await expect(sidebar.locator('img')).not.toHaveAttribute('src', original!);
  const replacement = await sidebar.locator('img').getAttribute('src');
  await page.getByRole('link', { name: 'Feed', exact: true }).click();
  await expect(own.locator('.author img')).toHaveAttribute('src', replacement!);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(other.locator('.author img')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await expect(sidebar.locator('img')).toBeVisible();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Remover foto atual', exact: true }).click();
  await page
    .getByRole('alertdialog', { name: 'Remover foto de perfil', exact: true })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Foto de perfil removida.',
  );
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await expect(sidebar.locator('img')).toHaveCount(0);
  await expect(sidebar.locator('p-avatar')).toContainText('G');
  await page.getByRole('link', { name: 'Feed', exact: true }).click();
  await expect(own.locator('.author img')).toHaveCount(0);
  await expect(other.locator('.author img')).toBeVisible();
  await other.locator('.author img').dispatchEvent('error', { bubbles: false });
  await expect(other.locator('.author img')).toHaveCount(0);
  await expect(other.locator('.author p-avatar')).toContainText('A');
  expect(api.calls.some((call) => call.path === '/users/' + ME + '/avatar')).toBe(true);
});
