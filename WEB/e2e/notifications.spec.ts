import { expect, test } from '@playwright/test';
import { FIRST, OTHER, login, mockApi } from './api.fixture';

test('polls the HTTP inbox and marks a snapshot as seen without removing new arrivals', async ({
  page,
}) => {
  const api = await mockApi(page);
  const item = (id: string, kind: string) => ({
    id,
    actorID: OTHER,
    actorName: 'Ana Dev',
    postID: FIRST,
    kind,
    createdAt: '2026-10-21T12:00:00Z',
  });
  api.notifications = [item('first', 'like'), item('second', 'comment')];
  await page.clock.install();
  await login(page);
  await page.getByRole('button', { name: 'Notificações, 2 não lidas' }).click();
  const panel = page.getByRole('dialog', { name: 'Notificações', exact: true });
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  const arrival = item('third', 'comment');
  await page.route('**/api/notifications/read', async (route) => {
    const ids = route.request().postDataJSON().ids;
    expect(ids.sort()).toEqual(['first', 'second']);
    api.notifications = [arrival];
    await route.fulfill({ status: 204 });
  });
  await panel.getByRole('checkbox', { name: 'Selecionar todas as notificações' }).check();
  await panel.getByRole('button', { name: 'Marcar todas como lidas' }).click();
  await expect(panel.getByText('Visto', { exact: true })).toHaveCount(2);
  await page.clock.fastForward(300);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel.getByRole('listitem')).toHaveCount(1);
  api.notifications = [arrival, item('fourth', 'like')];
  await page.clock.fastForward(60_000);
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/notifications-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/notifications-mobile.png' });
  await panel.getByRole('link').first().click();
  await expect(page).toHaveURL('/posts/' + FIRST);
  await expect(panel).toBeHidden();
});

test('profile presence follows HTTP refreshes while the profile is open', async ({ page }) => {
  const api = await mockApi(page);
  await page.clock.install();
  await login(page);
  await page.goto('/profile/' + OTHER);
  const indicator = page.locator('.presence-indicator');
  await expect(indicator).toHaveAttribute('aria-label', 'Offline');
  api.otherPresence = 'Online';
  await page.clock.fastForward(60_000);
  await expect(indicator).toHaveAttribute('aria-label', 'Online');
  await page.screenshot({ path: 'test-results/presence-online-light.png' });
  await page.evaluate(() => document.documentElement.classList.add('pudd-dark'));
  await page.screenshot({ path: 'test-results/presence-online-dark.png' });
  api.otherPresence = 'Offline';
  await page.clock.fastForward(60_000);
  await expect(indicator).toHaveAttribute('aria-label', 'Offline');
  await expect(indicator.locator('.pi-minus')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/presence-offline-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: 'Feed', exact: true }).click();
  await expect(page).toHaveURL('/feed');
  const profileCalls = () => api.calls.filter((call) => call.path === '/users/' + OTHER).length;
  const before = profileCalls();
  await page.clock.fastForward(60_000);
  expect(profileCalls()).toBe(before);
});
