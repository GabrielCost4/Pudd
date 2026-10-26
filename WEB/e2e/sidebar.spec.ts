import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('places the panel control in the header and shows the working shortcut in its tooltip', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const control = page.locator('.sidebar-toggle');
  const sidebar = await page.locator('aside#navigation').boundingBox();
  const brand = await page.locator('.brand-image').boundingBox();
  const opened = await control.boundingBox();
  expect(opened!.x).toBeGreaterThan(brand!.x + brand!.width);
  expect(opened!.x + opened!.width).toBeLessThanOrEqual(sidebar!.x + sidebar!.width);
  await expect(control.locator('svg')).toBeVisible();
  await expect(control).toHaveAttribute('aria-keyshortcuts', 'Control+Shift+S');
  await control.hover();
  await expect(page.getByRole('tooltip')).toContainText('Alternar barra lateral');
  await expect(page.getByRole('tooltip')).toContainText('Ctrl+Shift+S');
  await page.screenshot({
    path: 'test-results/sidebar-panel-open.png',
    clip: { x: 0, y: 0, width: 650, height: 180 },
  });
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).focus();
  await page.keyboard.press('Control+Shift+s');
  await expect(control).toHaveAttribute('aria-expanded', 'false');
  await expect(control).toBeFocused();
  await expect.poll(async () => (await control.boundingBox())!.x).toBe(16);
  await control.hover();
  await expect(page.getByRole('tooltip')).toContainText('Ctrl+Shift+S');
  await page.screenshot({
    path: 'test-results/sidebar-panel-closed.png',
    clip: { x: 0, y: 0, width: 650, height: 180 },
  });
  await page.keyboard.press('Control+Shift+s');
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Feed', exact: true })).toBeVisible();
});

test('slides desktop navigation away and restores it from the keyboard in both themes', async ({
  page,
}) => {
  await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const sidebar = page.locator('aside#navigation');
  const column = page.locator('.main-column');
  for (const dark of [false, true]) {
    await page.getByRole('switch').setChecked(dark);
    const collapse = page.getByRole('button', { name: 'Recolher menu lateral', exact: true });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(await sidebar.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
      '0.28s',
    );
    await collapse.focus();
    await page.keyboard.press('Space');
    const expand = page.getByRole('button', { name: 'Expandir menu lateral', exact: true });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(page.getByRole('link', { name: 'Feed', exact: true })).toHaveCount(0);
    await expect
      .poll(async () => {
        const box = await sidebar.boundingBox();
        return box!.x + box!.width;
      })
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() => column.evaluate((element) => getComputedStyle(element).marginInlineStart))
      .toBe('0px');
    await expect(expand).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Pesquisar perfis por nome' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Notificações, 0 não lidas' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('switch')).toBeFocused();
    await page.screenshot({
      path: `test-results/sidebar-collapsed-${dark ? 'dark' : 'light'}.png`,
      fullPage: true,
    });
    await expand.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await sidebar.boundingBox())!.x).toBeGreaterThanOrEqual(-1);
    await expect
      .poll(() => column.evaluate((element) => getComputedStyle(element).marginInlineStart))
      .toBe('232px');
    await expect(sidebar).not.toHaveAttribute('inert');
    await expect(page.getByRole('link', { name: 'Feed', exact: true })).toBeVisible();
    await expect(page.locator('app-post-card')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/sidebar-expanded-${dark ? 'dark' : 'light'}.png`,
      fullPage: true,
    });
  }
});

test('preserves collapsed desktop navigation when visiting mobile and respects reduced motion', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await page.getByRole('button', { name: 'Recolher menu lateral' }).click();
  await expect
    .poll(() =>
      page
        .locator('.main-column')
        .evaluate((element) => getComputedStyle(element).marginInlineStart),
    )
    .toBe('0px');
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await menu.click();
  await expect(page.getByRole('link', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 800 });
  const expand = page.getByRole('button', { name: 'Expandir menu lateral' });
  await expect(expand).toBeVisible();
  await expand.click();
  await expect(page.locator('aside#navigation')).not.toHaveAttribute('inert');
  expect(
    await page
      .locator('aside#navigation')
      .evaluate((element) => getComputedStyle(element).transitionProperty),
  ).toBe('none');
  await expect(page.getByRole('link', { name: 'Meu perfil', exact: true })).toBeVisible();
});

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
