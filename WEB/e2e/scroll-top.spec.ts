import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('returns to the top with keyboard support on desktop and mobile', async ({ page }) => {
  const api = await mockApi(page);
  for (let index = 0; index < 6; index++) {
    api.posts.push({ ...api.posts[0], id: crypto.randomUUID(), content: `Projeto ${index}` });
  }
  await login(page);
  const button = page.getByRole('button', { name: 'Voltar ao topo', exact: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: width === 1440 ? 'no-preference' : 'reduce' });
    await expect(button).toBeHidden();
    await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' }));
    await expect(button).toBeVisible();
    await expect(button).toBeInViewport({ ratio: 1 });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(button).toBeHidden();
  }
});
