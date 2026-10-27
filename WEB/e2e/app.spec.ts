import { test, expect } from '@playwright/test';
import { FIRST, ME, OTHER, mockApi, login } from './api.fixture';

test('expands long feed posts and collapses them again on desktop and mobile', async ({ page }) => {
  const api = await mockApi(page);
  api.posts[0].content =
    'Compartilhando detalhes do projeto e dos aprendizados. '.repeat(30) + 'Fim do texto.';
  await login(page);
  const card = page.locator('app-post-card').filter({ hasText: 'Gabriel Dev' });
  const text = card.locator('.content-text');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(text).not.toContainText('Fim do texto.');
    await card.getByRole('button', { name: 'Ler mais', exact: true }).click();
    await expect(text).toContainText('Fim do texto.');
    await expect(card.getByRole('button', { name: 'Ler menos', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await card.getByRole('button', { name: 'Ler menos', exact: true }).click();
    await expect(text).not.toContainText('Fim do texto.');
    await page.screenshot({ path: 'test-results/read-more-' + width + '.png', fullPage: true });
  }
  await expect(
    page
      .locator('app-post-card')
      .filter({ hasText: 'Ana Dev' })
      .getByRole('button', { name: 'Ler mais', exact: true }),
  ).toHaveCount(0);
});

test('edits a feed post in a modal and preserves the feed on save or cancel', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const feedUrl = page.url();
    const card = page.locator('app-post-card').filter({ hasText: 'Gabriel Dev' });
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar publicação', exact: true });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(feedUrl);
    await dialog.getByLabel('Sua publicação', { exact: true }).fill('Discarded');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(card).not.toContainText('Discarded');
    expect(
      api.calls.filter((call) => call.method === 'PUT' && call.path === '/posts/' + FIRST),
    ).toHaveLength(width === 1280 ? 0 : 1);
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    const content = 'Atualizado no feed ' + width;
    await dialog.getByLabel('Sua publicação', { exact: true }).fill(content);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: 'test-results/edit-modal-' + width + '.png', fullPage: true });
    await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toContainText(content);
    await expect(page).toHaveURL(feedUrl);
    await expect(card.getByRole('button', { name: 'Editar', exact: true })).toBeFocused();
  }
});

test('fits login and registration within desktop and mobile viewport height', async ({ page }) => {
  await mockApi(page);
  for (const viewport of [
    { width: 1920, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 390, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ['/login', '/register']) {
      await page.goto(route);
      await expect(page.locator('#login-title')).toBeVisible();
      if (route === '/login') {
        const title = await page.locator('#login-title').boundingBox();
        const subtitle = await page.locator('.auth-heading > p:last-child').boundingBox();
        const emailLabel = await page.locator('label[for="email"]').boundingBox();
        expect(Math.abs(subtitle!.y - title!.y - title!.height - 16)).toBeLessThanOrEqual(1);
        const expectedGap =
          viewport.width <= 800 && viewport.height <= 740
            ? 16
            : viewport.width > 800 && viewport.height <= 760
              ? 24
              : 40;
        expect(
          Math.abs(emailLabel!.y - subtitle!.y - subtitle!.height - expectedGap),
        ).toBeLessThanOrEqual(1);
      }

      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1),
        )
        .toBe(true);
      const accountButton = page.locator('.account-button');
      const bounds = await accountButton.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    }
  }
});

test('protects private routes, renders 404, and keeps invalid credentials on login', async ({
  page,
}) => {
  const api = await mockApi(page);
  await page.goto('/profile/me');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  api.failLogin = true;
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('dev@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Entrar no Pudd' }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.');
  await expect(page).toHaveURL(/\/login$/);
});

test('registers a user and opens a paginated feed with author filtering', async ({ page }) => {
  const api = await mockApi(page);
  for (let i = 0; i < 7; i++)
    api.posts.push({ ...api.posts[0], id: crypto.randomUUID(), content: 'Projeto extra ' + i });
  await page.goto('/register');
  await page.getByLabel('Seu nome', { exact: true }).fill('Nova Pessoa');
  await page.getByLabel('E-mail', { exact: true }).fill('nova@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByRole('heading', { name: 'Nova Pessoa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page.getByLabel('Paginação')).toContainText('Página 2');
  await page.getByRole('link', { name: 'Minhas publicações', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Minhas publicações', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Minhas publicações', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(
    api.calls.some((c) => c.path === '/Auth/register' && JSON.parse(c.body).nome === 'Nova Pessoa'),
  ).toBeTruthy();
  await expect(page.locator('app-post-card')).toHaveCount(6);
});

test('creates, likes, comments, edits and deletes a post with an image', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Criar publicação', exact: true }).click();
  await page
    .getByLabel('Sua publicação', { exact: true })
    .fill('Construindo meu frontend completo.');
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.locator('app-post-card')).toContainText('Construindo meu frontend completo.');
  await expect(page.getByAltText('Imagem anexada à publicação')).toBeVisible();
  await page.getByRole('button', { name: /0 curtidas/ }).click();
  await expect(page.getByRole('button', { name: /1 curtida/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: /1 curtida/ }).click();
  await expect(page.getByRole('button', { name: /0 curtidas/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const commentInput = page.getByLabel('Seu comentário', { exact: true });
  const commentCounter = page.locator('#comment-character-count');
  await expect(commentCounter).toContainText('0 / 350 caracteres');
  await commentInput.fill('a'.repeat(350));
  await commentInput.press('End');
  await commentInput.press('b');
  await expect(commentInput).toHaveValue('a'.repeat(350));
  await expect(commentCounter).toContainText('350 / 350 caracteres');
  await commentInput.fill('Uma nova conversa.');
  await expect(commentCounter).toContainText('18 / 350 caracteres');
  await page.getByRole('button', { name: 'Comentar', exact: true }).click();
  await expect(page.locator('app-comments')).toContainText('Uma nova conversa.');
  await expect(commentCounter).toContainText('0 / 350 caracteres');
  await page.locator('app-comments').getByRole('button', { name: 'Excluir', exact: true }).click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.locator('app-comments')).not.toContainText('Uma nova conversa.');
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Sua publicação', { exact: true }).fill('Projeto atualizado.');
  await page.getByLabel('Remover a imagem atual').check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('app-post-card')).toContainText('Projeto atualizado.');
  await expect(page.getByAltText('Imagem anexada à publicação')).toHaveCount(0);
  await page.locator('app-post-card').getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(
    page.getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    }),
  ).toBeVisible();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(page.locator('app-post-card')).toContainText('Projeto atualizado.');
  await page.locator('app-post-card').getByRole('button', { name: 'Excluir', exact: true }).click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page).toHaveURL(/\/feed$/);
  expect(api.calls.some((c) => c.method === 'PUT' && c.body.includes('RemoveImage'))).toBeTruthy();
  expect(api.posts.some((p) => p.content === 'Projeto atualizado.')).toBeFalsy();
});

test('updates profile and uploads/removes avatar, then opens another profile', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  const cards = page.locator('.profile-edit-grid > p-card');
  const formBefore = (await cards.first().boundingBox())!;
  const avatarBefore = (await cards.last().boundingBox())!;
  expect(Math.abs(formBefore.width - avatarBefore.width)).toBeLessThan(1);
  expect(Math.abs(formBefore.height - avatarBefore.height)).toBeLessThan(1);
  const tallImage = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 1800;
    canvas.getContext('2d')!.fillRect(0, 0, 300, 1800);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'foto-vertical.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tallImage, 'base64'),
  });
  await expect(page.getByRole('img', { name: 'Prévia da imagem selecionada' })).toBeVisible();
  expect(Math.abs((await cards.last().boundingBox())!.height - formBefore.height)).toBeLessThan(1);
  expect(
    (await page.getByRole('img', { name: 'Prévia da imagem selecionada' }).boundingBox())!.height,
  ).toBeLessThanOrEqual(128);
  await page.screenshot({ path: 'test-results/profile-equal-cards.png', fullPage: true });
  const previewTrigger = page
    .locator('.avatar-selection')
    .getByRole('button', { name: 'Abrir imagem ampliada' });
  await previewTrigger.click();
  const imageDialog = page.getByRole('dialog', { name: 'Imagem ampliada' });
  await expect(imageDialog).toBeVisible();
  const enlargedImage = imageDialog.locator('img');
  const initialWidth = (await enlargedImage.boundingBox())!.width;
  await imageDialog.getByRole('button', { name: 'Ampliar imagem', exact: true }).click();
  await expect
    .poll(async () => (await enlargedImage.boundingBox())!.width)
    .toBeGreaterThan(initialWidth);
  const imageArea = imageDialog.getByRole('region');
  const area = (await imageArea.boundingBox())!;
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + area.width / 2 + 50, area.y + area.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  expect(
    await enlargedImage.evaluate((image) => parseFloat(image.style.getPropertyValue('--pan-x'))),
  ).toBeGreaterThan(0);
  await imageDialog.getByRole('button', { name: 'Reduzir imagem', exact: true }).click();
  await expect
    .poll(async () => Math.abs((await enlargedImage.boundingBox())!.width - initialWidth))
    .toBeLessThan(1);
  await imageDialog.getByRole('button', { name: 'Fechar imagem' }).click();
  await expect(imageDialog).toHaveCount(0);
  await expect(previewTrigger).toBeFocused();
  await page.getByRole('button', { name: 'Descartar seleção', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Gabriel Atualizado');
  await page.getByLabel('Bio', { exact: true }).fill('Aprendendo Angular e .NET.');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Gabriel Atualizado' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'avatar.webp',
    mimeType: 'image/webp',
    buffer: Buffer.from('RIFF0000WEBP'),
  });
  await page.getByRole('button', { name: 'Enviar foto' }).click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Foto de perfil atualizada.',
  );
  expect(api.profile.hasAvatar).toBeTruthy();
  await page
    .locator('.profile-photo')
    .getByRole('button', { name: 'Abrir imagem ampliada' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Imagem ampliada' })).toBeVisible();
  await page.getByRole('button', { name: 'Ampliar imagem', exact: true }).click();
  await page.getByRole('button', { name: 'Reduzir imagem', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar imagem' }).click();
  await page.getByRole('button', { name: 'Remover foto atual' }).click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Foto de perfil removida.',
  );
  expect(api.profile.hasAvatar).toBeFalsy();
  await expect(page.getByRole('link', { name: 'Ver publicações' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Feed', exact: true }).click();
  await page
    .locator('app-post-card')
    .first()
    .getByRole('link', { name: /Gabriel/ })
    .click();
  await expect(page).toHaveURL(new RegExp('/profile/' + ME));
  await page.getByRole('link', { name: 'Feed', exact: true }).click();
  await page
    .locator('app-post-card')
    .filter({ hasText: 'Uma ideia da comunidade.' })
    .getByRole('link', { name: /Ana Dev/ })
    .click();
  await expect(page).toHaveURL(new RegExp('/profile/' + OTHER));
  await expect(page.getByRole('button', { name: 'Editar perfil' })).toHaveCount(0);
});

test('admin blocks/unblocks accounts and moderates posts and comments', async ({ page }) => {
  const api = await mockApi(page);
  await login(page, 'admin@example.test');
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Desbloquear', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Moderar publicações' }).click();
  await page
    .locator('app-post-card')
    .filter({ hasText: 'Uma ideia da comunidade.' })
    .getByRole('button', { name: 'Moderar', exact: true })
    .click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.locator('app-post-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Comentar', exact: true }).click();
  await page.getByRole('button', { name: 'Remover pela moderação' }).click();
  await page
    .getByRole('alertdialog', {
      name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
    })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.locator('app-comments')).not.toContainText('Ótimo começo!');
  expect(
    api.calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/admin/posts/')),
  ).toBeTruthy();
  expect(
    api.calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/admin/comments/')),
  ).toBeTruthy();
});

test('handles server session rejection and missing posts', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Criar publicação', exact: true }).click();
  api.denied = true;
  await page.getByLabel('Sua publicação').fill('Sessão encerrada');
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page).toHaveURL(/\/unauthorized\?reason=session/);
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
  api.denied = false;
  await login(page);
  await expect(page.locator('app-post-card')).toHaveCount(2);
  api.posts = [];
  await page.getByRole('link', { name: 'Comentar', exact: true }).first().click();
  await expect(page).toHaveURL(/\/notfound$/);
});

test('mobile login has only the form, and application stays within viewport', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.locator('app-login-intro')).toBeHidden();
  await login(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await expect(page.getByRole('link', { name: 'Administração', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/feed-mobile.png', fullPage: true });
});

test('renders the desktop feed and keeps API requests authenticated', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  await expect(page.locator('app-post-card')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });
  const protectedCalls = api.calls.filter(
    (c) => !c.path.startsWith('/Auth/') && c.method !== 'OPTIONS',
  );
  expect(protectedCalls.length).toBeGreaterThan(0);
  expect(protectedCalls.every((c) => c.authorization?.startsWith('Bearer '))).toBeTruthy();
  expect(api.calls.find((c) => c.path === '/Auth/login')?.authorization).toBeUndefined();
});

test('keeps the mobile administration table and confirmation within the viewport', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@example.test');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('link', { name: 'Administração', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeAttached();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await expect(page.getByRole('list', { name: 'Membros da comunidade' })).toBeVisible();
  await page.getByRole('button', { name: 'Bloquear', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeInViewport();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
  const dialog = page.getByRole('alertdialog', {
    name: /^(Excluir publicação|Excluir comentário|Remover foto de perfil|Alterar acesso)$/,
  });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeAttached();
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
});

test('switches themes, persists the choice and presents the vertical introduction', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Que bom ter você de volta.', exact: true }),
  ).toBeVisible();
  const landscape = page.locator('.landscape-motion');
  await expect(landscape).toBeAttached();
  await page.locator('summary').click();
  await page.getByRole('tab', { name: /Complete seu perfil/ }).click();
  await expect(
    page.getByText('Em Meu perfil, adicione sua foto e uma bio para se apresentar.'),
  ).toBeVisible();
  const themeSwitch = page.getByRole('switch', { name: 'Ativar modo escuro', exact: true });
  await expect(themeSwitch).not.toBeChecked();
  await themeSwitch.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('switch', { name: 'Ativar modo claro', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/pudd-dark/);
  await expect(landscape).toBeAttached();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/pudd-dark/);
  await expect(
    page.getByRole('heading', { name: 'Que bom ter você de volta.', exact: true }),
  ).toBeVisible();
  await expect(landscape).toBeAttached();
  await page.screenshot({ path: 'test-results/login-dark.png', fullPage: true });
  await page.getByRole('switch', { name: 'Ativar modo claro', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Ativar modo escuro', exact: true }),
  ).not.toBeChecked();
  await expect(page.locator('html')).not.toHaveClass(/pudd-dark/);
  await expect(landscape).toBeAttached();
  await page.screenshot({ path: 'test-results/login-light.png', fullPage: true });
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crie sua conta', exact: true })).toBeVisible();
  await expect(landscape).toBeAttached();
  await page.screenshot({ path: 'test-results/register-light.png', fullPage: true });
});

test('opens the PrimeNG sidebar on mobile and navigates to the profile', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const trigger = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/me$/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
});
