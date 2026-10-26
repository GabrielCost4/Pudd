import { test, expect, type Locator } from '@playwright/test';
import { mockApi, login } from './api.fixture';

async function expectReadableSelection(link: Locator) {
  const contrast = await link.evaluate((element) => {
    const luminance = (value: string) => {
      const channels = (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const rgb = channels.map((channel) => {
        const normalized = value.startsWith('color(') ? channel : channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const style = getComputedStyle(element);
    const text = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

test('keeps community pages accessible within desktop and mobile viewports in both themes', async ({
  page,
}) => {
  test.setTimeout(60000);
  await mockApi(page);
  await login(page);
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ['light', 'dark']) {
      if (mode === 'dark') {
        await page.getByRole('switch', { name: 'Ativar modo escuro', exact: true }).check();
      }
      for (const route of ['/feed', '/profile/me', '/posts/new']) {
        await page.locator('main').evaluate(() => window.scrollTo(0, 0));
        if (width <= 760) {
          await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
        }
        const name =
          route === '/feed' ? 'Feed' : route === '/profile/me' ? 'Meu perfil' : 'Criar publicação';
        await page.getByRole('link', { name, exact: true }).click();
        await expect(page.locator('main h1')).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          )
          .toBe(true);
        if (route === '/feed') {
          if (width === 1440) {
            await expect(page.locator('.community-art img')).toHaveJSProperty('complete', true);
            await page
              .locator('.community-about')
              .screenshot({ path: `test-results/about-pudd-${mode}.png` });
            const learnMore = page.getByRole('button', { name: 'Saiba mais sobre o Pudd' });
            await learnMore.click();
            const about = page.getByRole('dialog', { name: 'Sobre o Pudd', exact: true });
            await expect(about).toContainText('O Pudd é uma comunidade');
            await expect(about.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute(
              'href',
              '/profile/me',
            );
            await page.keyboard.press('Escape');
            await expect(about).toBeHidden();
            const action = await page.locator('.feed-heading').boundingBox();
            const aside = await page
              .getByRole('complementary', { name: 'Sobre a comunidade' })
              .boundingBox();
            const feed = await page.locator('section.feed').boundingBox();
            expect(Math.abs(action!.y - aside!.y)).toBeLessThanOrEqual(1);
            expect(aside!.x - feed!.x - feed!.width).toBeGreaterThanOrEqual(64);
            expect(width - aside!.x - aside!.width).toBeGreaterThanOrEqual(40);
            expect(aside!.width).toBeCloseTo(360, 0);
          }
          await expect(page.getByRole('complementary', { name: 'Sobre a comunidade' })).toBeVisible(
            {
              visible: width === 1440,
            },
          );
          await expect(page.locator('app-post-card')).toHaveCount(2);
          const cards = page.locator('app-post-card .post-card');
          const upper = await cards.nth(0).boundingBox();
          const lower = await cards.nth(1).boundingBox();
          const postGap = lower!.y - upper!.y - upper!.height;
          expect(postGap).toBeGreaterThanOrEqual(23);
          expect(postGap).toBeLessThanOrEqual(25);

          const community = page.getByRole('link', { name: 'Comunidade', exact: true });
          const mine = page.getByRole('link', { name: 'Minhas publicações', exact: true });
          await expect(community).toHaveAttribute('aria-current', 'page');
          const tabsBefore = await page.locator('.feed-tabs').boundingBox();
          await mine.click();
          await expect(
            page.getByRole('heading', { name: 'Minhas publicações', exact: true }),
          ).toBeVisible();
          await expect(mine).toHaveAttribute('aria-current', 'page');
          await expectReadableSelection(mine);
          await expect(community).not.toHaveAttribute('aria-current');
          await expect(page.locator('app-post-card')).toHaveCount(1);
          const tabsAfter = await page.locator('.feed-tabs').boundingBox();
          expect(Math.abs(tabsAfter!.y - tabsBefore!.y)).toBeLessThanOrEqual(1);
          await expect
            .poll(() =>
              page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
            )
            .toBe(true);
          await page.screenshot({
            path: `test-results/feed-mine-${mode}-${width}.png`,
            fullPage: true,
          });
          await community.focus();
          await page.keyboard.press('Enter');
          await expect(
            page.getByRole('heading', { name: 'Gabriel Dev', exact: true }),
          ).toBeVisible();
          await expect(community).toHaveAttribute('aria-current', 'page');
          await expectReadableSelection(community);
          await expect(page.locator('app-post-card')).toHaveCount(2);
        }
        if (route === '/profile/me') {
          await expect(
            page.getByRole('heading', { name: 'Gabriel Dev', exact: true }),
          ).toBeVisible();
          await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
          await expect(page.getByLabel('Nome', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        }
        await page.screenshot({
          path: `test-results/community-${route.replaceAll('/', '-')}-${mode}-${width}.png`,
          fullPage: true,
        });
      }
      if (mode === 'dark') {
        await page.getByRole('switch', { name: 'Ativar modo claro', exact: true }).uncheck();
      }
    }
  }
});

test('opens the editor from the feed composer with the current account photo', async ({ page }) => {
  const api = await mockApi(page);
  api.profile.hasAvatar = true;
  await login(page);
  const composer = page.getByRole('link', { name: 'Escrever uma publicação', exact: true });
  await expect(composer.locator('img')).toBeVisible();
  await composer.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/posts\/new$/);
  await expect(page.getByLabel('Sua publicação', { exact: true })).toBeVisible();
});

test('keeps posts visible while changing filters and cancels an outdated request', async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await expect(page.locator('app-post-card')).toHaveCount(2);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/posts?**', async (route) => {
    if (new URL(route.request().url()).searchParams.has('authorId')) await pending;
    await route.fallback();
  });
  await page.getByRole('link', { name: 'Minhas publicações', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atualizando publicações');
  await expect(page.locator('app-post-card')).toHaveCount(2);
  await expect(page.locator('.feed-results')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.feed-results')).toHaveAttribute('inert', '');
  await page.getByRole('link', { name: 'Comunidade', exact: true }).click();
  await expect(page.locator('.feed-results')).toHaveAttribute('aria-busy', 'false');
  release();
  await expect(page.locator('app-post-card')).toHaveCount(2);
  await page.getByRole('link', { name: 'Minhas publicações', exact: true }).click();
  await expect(page.locator('app-post-card')).toHaveCount(1);
  await expect(page.locator('.feed-results')).toHaveAttribute('aria-busy', 'false');
});
