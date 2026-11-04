import { expect, test } from '@playwright/test';
import { login, mockApi, ME } from './api.fixture';

test('comment actions use an owner-only menu and a confirmed deletion', async ({ page }) => {
  const api = await mockApi(page);
  api.comments.push({
    ...api.comments[0],
    id: '66666666-6666-4666-8666-666666666666',
    userID: ME,
    authorName: 'Gabriel Dev',
    content: 'Meu comentario de teste.',
  });
  await login(page);
  await page
    .locator('app-post-card')
    .first()
    .getByRole('link', { name: 'Comentar', exact: true })
    .click();
  const composer = page.locator('.comment-composer');
  const input = composer.locator('input');
  const send = composer.getByRole('button', { name: 'Comentar', exact: true });
  await expect(send).toBeDisabled();
  await input.fill('   ');
  await expect(send).toBeDisabled();
  await input.fill('Comentario enviado pelo input.');
  await expect(send).toBeEnabled();
  await expect(send.locator('.pi-arrow-up')).toBeVisible();
  await input.press('Enter');
  await expect(
    page.locator('.comment').filter({ hasText: 'Comentario enviado pelo input.' }),
  ).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(send).toBeDisabled();
  const own = page.locator('.comment').filter({ hasText: 'Meu comentario de teste.' });
  const other = page.locator('.comment').filter({ hasText: 'Ana Dev' });
  await expect(other.locator('.comment-actions-trigger')).toHaveCount(0);
  for (const width of [1280, 320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const avatar = (await own.locator('p-avatar').boundingBox())!;
    expect(avatar.width).toBeGreaterThanOrEqual(44);
    expect(
      await own.locator('header a').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    await own.locator('.comment-actions-trigger').click();
    await page.getByRole('menuitem', { name: 'Excluir', exact: true }).click();
    const confirmation = page.getByRole('alertdialog', { name: /Excluir coment/ });
    await expect(confirmation).toBeVisible();
    expect(api.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0);
    await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(own).toBeVisible();
    expect(await own.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await own.locator('.comment-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Excluir', exact: true }).click();
  await page
    .getByRole('alertdialog', { name: /Excluir coment/ })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(own).toHaveCount(0);
  await expect(other).toBeVisible();
  expect(
    api.calls.filter((call) => call.method === 'DELETE' && call.path.includes('/comments/')),
  ).toHaveLength(1);
});
