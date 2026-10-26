import { expect, test, type WebSocketRoute } from '@playwright/test';
import { FIRST, ME, OTHER, login, mockApi } from './api.fixture';

test('receives the complete SignalR inbox and marks a snapshot as seen without removing new arrivals', async ({
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
  await page.route('**/api/hubs/notifications/negotiate*', (route) =>
    route.fulfill({
      json: {
        negotiateVersion: 1,
        connectionId: 'test',
        connectionToken: 'test',
        availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
      },
    }),
  );
  let socket: WebSocketRoute;
  await page.routeWebSocket('**/api/hubs/notifications?*', (ws) => {
    socket = ws;
    ws.onMessage((message) => {
      for (const frame of String(message).split('\x1e').filter(Boolean)) {
        const request = JSON.parse(frame);
        if (request.protocol) ws.send('{}\x1e');
        if (request.target === 'GetNotifications')
          ws.send(
            JSON.stringify({
              type: 3,
              invocationId: request.invocationId,
              result: api.notifications,
            }) + '\x1e',
          );
      }
    });
  });
  await login(page);
  await page.getByRole('button', { name: 'Notificações, 2 não lidas' }).click();
  const panel = page.getByRole('dialog', { name: 'Notificações', exact: true });
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  await expect(panel.getByText('Reconectando às atualizações…')).toHaveCount(0);
  const arrival = item('third', 'comment');
  await page.route('**/api/notifications/read', async (route) => {
    const ids = route.request().postDataJSON().ids;
    expect(ids.sort()).toEqual(['first', 'second']);
    api.notifications = [arrival];
    socket.send(
      JSON.stringify({ type: 1, target: 'Notifications', arguments: [[arrival]] }) + '\x1e',
    );
    await route.fulfill({ status: 204 });
  });
  await panel.getByRole('checkbox', { name: 'Selecionar todas as notificações' }).check();
  await panel.getByRole('button', { name: 'Marcar todas como lidas' }).click();
  await expect(panel.getByText('Visto', { exact: true })).toHaveCount(2);
  await expect(panel.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Notificações, 1 não lidas' })).toBeVisible();
  socket!.send(
    JSON.stringify({
      type: 1,
      target: 'Notifications',
      arguments: [[arrival, item('fourth', 'like')]],
    }) + '\x1e',
  );
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/notifications-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/notifications-mobile.png' });
  await panel.getByRole('link').first().click();
  await expect(page).toHaveURL('/posts/' + FIRST);
  await expect(panel).toBeHidden();
});

test('profile presence follows SignalR, ignores stale updates and recovers after disconnect', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/api/hubs/notifications/negotiate*', (route) =>
    route.fulfill({
      json: {
        negotiateVersion: 1,
        connectionId: 'presence',
        connectionToken: 'presence',
        availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
      },
    }),
  );
  let socket!: WebSocketRoute;
  let currentPresence: 'Online' | 'Offline' = 'Offline';
  let revision = 1;
  let watched: string | undefined;
  await page.routeWebSocket('**/api/hubs/notifications?*', (ws) => {
    socket = ws;
    ws.onMessage((message) => {
      for (const frame of String(message).split('\x1e').filter(Boolean)) {
        const request = JSON.parse(frame);
        if (request.protocol) ws.send('{}\x1e');
        if (!request.invocationId) continue;
        let result: unknown;
        if (request.target === 'GetNotifications') result = [];
        if (request.target === 'WatchProfilePresence') {
          watched = request.arguments[0];
          result = { userID: watched, presence: currentPresence, revision };
        }
        if (request.target === 'UnwatchProfilePresence') watched = undefined;
        ws.send(JSON.stringify({ type: 3, invocationId: request.invocationId, result }) + '\x1e');
      }
    });
  });
  await login(page);
  await page.goto('/profile/' + OTHER);
  const indicator = page.locator('.presence-indicator');
  await expect(indicator).toHaveAttribute('aria-label', 'Offline');
  expect(watched).toBe(OTHER);
  const send = (userID: string, presence: string, nextRevision: number) =>
    socket.send(
      JSON.stringify({
        type: 1,
        target: 'PresenceChanged',
        arguments: [{ userID, presence, revision: nextRevision }],
      }) + '\x1e',
    );
  currentPresence = 'Online';
  revision = 2;
  send(OTHER, 'Online', revision);
  await expect(indicator).toHaveAttribute('aria-label', 'Online');
  send(OTHER, 'Offline', 1);
  send(ME, 'Offline', 3);
  await expect(indicator).toHaveAttribute('aria-label', 'Online');
  await page.screenshot({ path: 'test-results/presence-online-light.png' });
  await page.evaluate(() => document.documentElement.classList.add('pudd-dark'));
  await page.screenshot({ path: 'test-results/presence-online-dark.png' });
  currentPresence = 'Offline';
  revision = 3;
  send(OTHER, currentPresence, revision);
  await expect(indicator).toHaveAttribute('aria-label', 'Offline');
  await expect(indicator.locator('.pi-minus')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/presence-offline-mobile.png' });
  await socket.close({ code: 1001, reason: 'connection interrupted' });
  await expect(indicator).toHaveAttribute('aria-label', 'Status indisponível');
  await expect(indicator).toHaveAttribute('aria-label', 'Offline', { timeout: 15000 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: 'Feed', exact: true }).click();
  await expect.poll(() => watched).toBeUndefined();
});
