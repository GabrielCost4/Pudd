import { expect, test } from '@playwright/test';
import { FIRST, OTHER, login, mockApi } from './api.fixture';

for (const dark of [false, true]) {
  test(`reviews loading, recovery, empty, feedback and navigation states in ${dark ? 'dark' : 'light'}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    const api = await mockApi(page);
    const original = [...api.posts];
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `docs/ui-audit/after/state-${name}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    };
    const navigate = async (url: string) => {
      await page.evaluate((route) => {
        history.pushState({}, '', route);
        dispatchEvent(new PopStateEvent('popstate'));
      }, url);
    };
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/posts?**', async (route) => {
      await pending;
      await route.fallback();
    });
    await login(page);
    await expect(page.getByRole('status', { name: 'Carregando publicações' })).toBeVisible();
    await capture('loading');
    release();
    await expect(page.locator('app-post-card')).toHaveCount(2);
    await page.unroute('**/api/posts?**');
    const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
    await menu.click();
    await capture('menu-open');
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await capture('menu-closed-focus');
    api.posts = [];
    await navigate('/feed?empty=1');
    await expect(page.getByRole('heading', { name: 'Nenhuma publicação' })).toBeVisible();
    await capture('empty');
    await page.route('**/api/posts?**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'Não foi possível conectar. Tente novamente.' }),
      }),
    );
    await navigate('/feed?failure=1');
    await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
    await capture('load-error');
    await page.unroute('**/api/posts?**');
    api.posts = original;
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.locator('app-post-card')).toHaveCount(2);
    await page.getByRole('link', { name: 'Escrever uma publicação', exact: true }).click();
    await page
      .getByLabel('Sua publicação', { exact: true })
      .fill('Um projeto com uma nova perspectiva.');
    api.postValidation = { Content: ['Revise o texto antes de publicar.'] };
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(page.locator('p-toast')).toContainText('Revise o texto');
    await expect(page.getByLabel('Sua publicação', { exact: true })).toHaveValue(
      'Um projeto com uma nova perspectiva.',
    );
    await capture('validation-error');
    api.postValidation = null;
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(page.locator('app-post-card')).toContainText(
      'Um projeto com uma nova perspectiva.',
    );
    await expect(page.locator('p-toast .p-toast-message-success')).toBeVisible();
    await capture('success');
    await navigate(`/profile/${OTHER}`);
    await expect(page.getByRole('heading', { name: 'Ana Dev', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar perfil', exact: true })).toHaveCount(0);
    await capture('other-profile');
    original[0].authorName = 'NomeExtremamenteLongoSemEspacos'.repeat(4);
    original[0].content = 'https://exemplo.test/' + 'projeto'.repeat(150);
    await navigate('/feed');
    await expect(page.locator('app-post-card')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await capture('long-content');
    await navigate(`/posts/${FIRST}`);
    await page
      .locator('app-post-card')
      .getByRole('button', { name: 'Excluir', exact: true })
      .click();
    const confirmation = page.getByRole('alertdialog', { name: 'Excluir publicação', exact: true });
    await expect(confirmation).toBeVisible();
    await capture('confirmation');
    await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await navigate('/unauthorized?reason=forbidden');
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    await capture('forbidden');
    await page.goto('/unauthorized?reason=session');
    await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
    await capture('session-ended');
  });
}
