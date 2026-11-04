import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('Enter sends forms while Shift+Enter preserves multiline text', async ({ page }) => {
  test.setTimeout(90000);
  const api = await mockApi(page);
  const feedbacks: unknown[] = [];
  await page.route('**/api/feedbacks', (route) => {
    feedbacks.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  });
  await login(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/posts/new');
    const writing = page.locator('#post-content');
    await writing.fill('Primeira linha ' + width);
    await writing.press('Shift+Enter');
    await writing.pressSequentially('Segunda linha');
    await expect(writing).toHaveValue('Primeira linha ' + width + '\nSegunda linha');
    const before = api.calls.filter(
      (call) => call.method === 'POST' && call.path === '/posts',
    ).length;
    await writing.press('Enter');
    await expect(page).toHaveURL(/\/posts\/[a-f0-9-]+$/);
    expect(
      api.calls.filter((call) => call.method === 'POST' && call.path === '/posts'),
    ).toHaveLength(before + 1);
    await page.goto('/profile/me');
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editar perfil', exact: true });
    await editor.locator('#profile-bio').fill('Bio enviada por Enter ' + width);
    await editor.locator('#profile-bio').press('Enter');
    await expect(editor).toBeHidden();
    expect(api.profile.bio).toBe('Bio enviada por Enter ' + width);
    await page.goto('/feedback');
    await page.locator('#feedback-description').fill('Feedback enviado com Enter ' + width);
    await page.locator('#feedback-description').press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Feedback enviado!', exact: true }),
    ).toBeVisible();
  }
  expect(feedbacks).toHaveLength(2);
});
