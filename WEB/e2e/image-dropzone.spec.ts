import { test, expect, type Page } from '@playwright/test';
import { mockApi, login } from './api.fixture';

async function dropImage(page: Page, name: string, type = 'image/png') {
  const dataTransfer = await page.evaluateHandle(
    ({ name, type }) => {
      const transfer = new DataTransfer();
      const bytes = Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=',
        ),
        (character) => character.charCodeAt(0),
      );
      transfer.items.add(new File([bytes], name, { type }));
      return transfer;
    },
    { name, type },
  );
  const zone = page.getByRole('group', { name: 'Anexar imagem', exact: true });
  await zone.dispatchEvent('dragenter', { dataTransfer });
  await zone.dispatchEvent('dragover', { dataTransfer });
  await zone.dispatchEvent('drop', { dataTransfer });
  await dataTransfer.dispose();
}

async function checkLayout(page: Page, feature: string) {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ['light', 'dark']) {
      await page.getByRole('switch').setChecked(mode === 'dark');
      await expect(
        page.getByRole('img', { name: 'Prévia da imagem selecionada', exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/dropzone-${feature}-${mode}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test('selects post and avatar images by dropping them, then sends through the page action', async ({
  page,
}) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Criar publicação', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Escolher uma imagem', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/dropzone-post-empty.png', fullPage: true });
  await dropImage(page, 'project.png');
  await expect(page.locator('.filename')).toHaveText('project.png');
  await dropImage(page, 'invalid.txt', 'text/plain');
  await expect(page.getByRole('alert')).toContainText('5 MB');
  await expect(page.locator('.filename')).toHaveText('project.png');
  await dropImage(page, 'replacement.png');
  await expect(page.locator('.filename')).toHaveText('replacement.png');
  expect(api.calls.filter((call) => call.method === 'POST' && call.path === '/posts')).toHaveLength(
    0,
  );
  await checkLayout(page, 'post');
  await page.getByLabel('Sua publicação', { exact: true }).fill('Projeto com imagem arrastada.');
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByAltText('Imagem anexada à publicação')).toBeVisible();
  expect(
    api.calls.find((call) => call.method === 'POST' && call.path === '/posts')?.body,
  ).toContain('replacement.png');

  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await dropImage(page, 'avatar.png');
  await expect(page.locator('.filename')).toHaveText('avatar.png');
  await page.getByRole('button', { name: 'Descartar seleção', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Prévia da imagem selecionada', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enviar foto', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'test-results/dropzone-avatar-empty.png', fullPage: true });
  await dropImage(page, 'avatar-final.png');
  expect(
    api.calls.filter((call) => call.method === 'PUT' && call.path === '/users/me/avatar'),
  ).toHaveLength(0);
  await checkLayout(page, 'avatar');
  await page.getByRole('button', { name: 'Enviar foto', exact: true }).click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Foto de perfil atualizada.',
  );
  expect(api.profile.hasAvatar).toBe(true);
  expect(
    api.calls.find((call) => call.method === 'PUT' && call.path === '/users/me/avatar')?.body,
  ).toContain('avatar-final.png');
});
