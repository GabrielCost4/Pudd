import { expect, test } from '@playwright/test';
import { FIRST, login, mockApi } from './api.fixture';

const phase = process.env['PUDD_UI_PHASE'] || 'after';

for (const dark of [false, true]) {
  test(`audits product routes in ${dark ? 'dark' : 'light'} mode`, async ({ page }) => {
    test.setTimeout(180000);
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
    const api = await mockApi(page);
    api.posts[0].content =
      'Um projeto começa com uma boa pergunta. Hoje compartilho o que aprendi construindo uma interface acessível, do primeiro esboço à navegação por teclado. '.repeat(
        4,
      );
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `docs/ui-audit/${phase}/${name}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    };
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/login');
    await expect(page.locator('.landscape-motion')).toBeAttached();
    await capture('login');
    await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
    await capture('register');
    await login(page, 'admin@example.test');
    await expect(page.locator('app-post-card')).toHaveCount(2);
    const pages = [
      ['/feed', 'feed', 'Feed'],
      ['/posts/new', 'editor', 'Nova publicação'],
      [`/posts/${FIRST}`, 'detail', 'Publicação'],
      ['/profile/me', 'profile', 'Meu perfil'],
      ['/admin', 'admin', 'Administração'],
    ];
    for (const [route, name, title] of pages) {
      // Client navigation preserves the deliberately in-memory session.
      await page.evaluate((url) => {
        history.pushState({}, '', url);
        dispatchEvent(new PopStateEvent('popstate'));
      }, route);
      await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
      await expect(page.locator('.loading')).toHaveCount(0);
      await capture(name);
      for (const width of [1920, 1280, 834, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        if (phase === 'after') {
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${name} at ${width}px`,
          ).toBe(true);
        }
        if (width === 390) await capture(`${name}-mobile`);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (name === 'profile') {
        await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
        await capture('profile-edit');
      }
      if (name === 'feed') {
        await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
        await expect(page.getByRole('dialog', { name: 'Editar publicação' })).toBeVisible();
        await capture('edit-dialog');
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      }
    }
    await page.goto('/notfound');
    await capture('notfound');
    await page.goto('/login');
    await page.setViewportSize({ width: 390, height: 844 });
    await capture('login-mobile');
    await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
    await capture('register-mobile');
  });
}
