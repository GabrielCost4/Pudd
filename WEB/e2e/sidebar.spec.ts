import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('keeps the account in view while scrolling and opens the profile from the sidebar', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.profile.hasAvatar = true;
  for (let index = 0; index < 4; index++) {
    api.posts.push({ ...api.posts[0], id: crypto.randomUUID(), content: 'Projeto ' + index });
  }
  await page.setViewportSize({ width: 1440, height: 800 });
  await login(page);
  await expect(page.locator('app-post-card')).toHaveCount(6);
  const account = page.getByRole('link', { name: 'Abrir meu perfil', exact: true });
  const assertAccountInView = async () => {
    const box = await account.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(account).toBeInViewport({ ratio: 1 });
  };
  for (const dark of [false, true]) {
    if (dark) await page.getByRole('switch', { name: 'Ativar modo escuro' }).check();
    await page.evaluate(() => window.scrollTo(0, 0));
    await assertAccountInView();
    const before = await account.boundingBox();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await assertAccountInView();
    const after = await account.boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
    expect(
      await page.locator('.account p-avatar').evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThanOrEqual(48);
    await page.screenshot({
      path: `test-results/sidebar-${dark ? 'dark' : 'light'}.png`,
      fullPage: false,
    });
  }
  await page.setViewportSize({ width: 1440, height: 560 });
  await assertAccountInView();
  await account.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/profile\/me$/);
  await expect(page.getByRole('heading', { name: 'Gabriel Dev', exact: true })).toBeVisible();
  expect(
    await page.locator('.profile-avatar').evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(112);
  await page.screenshot({ path: 'test-results/sidebar-profile.png', fullPage: true });
});

test('keeps account and logout accessible on a short mobile screen and closes after profile navigation', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  const account = page.getByRole('link', { name: 'Abrir meu perfil', exact: true });
  await expect(account).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({ path: 'test-results/sidebar-mobile.png', fullPage: false });
  await account.click();
  await expect(page).toHaveURL(/\/profile\/me$/);
  await expect(page.locator('#navigation')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
});

test('uses the MIT components without a license banner and supports keyboard dismissal on mobile', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.getByText('Invalid PrimeUI License', { exact: true })).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await trigger.click();
  await expect(page.locator('#navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#navigation')).not.toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});
