import { test, expect } from '@playwright/test';
import { mockApi, login } from './api.fixture';

test('counts post characters and blocks creation and editing above 5000', async ({ page }) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Nova publicação', exact: true }).click();
  const content = page.getByLabel('Sua publicação', { exact: true });
  const counter = page.locator('#post-character-count');
  const publish = page.getByRole('button', { name: 'Publicar', exact: true });
  await expect(counter).toHaveText('0 / 5000');
  await expect(content).toHaveCSS('resize', 'vertical');
  await expect(content).toHaveCSS('border-top-width', '1px');
  await content.fill('a'.repeat(5000));
  await expect(counter).toHaveText('5000 / 5000');
  await expect(publish).toBeEnabled();
  await content.fill('a'.repeat(5001));
  await expect(counter).toHaveText('5001 / 5000');
  await expect(content).toHaveAttribute('aria-invalid', 'true');
  await expect(publish).toBeDisabled();
  await page.locator('form.composer').evaluate((form) => (form as HTMLFormElement).requestSubmit());
  expect(api.calls.some((call) => call.method === 'POST' && call.path === '/posts')).toBe(false);
  await page.screenshot({ path: 'test-results/editor-character-limit.png', fullPage: true });
  await content.fill('a'.repeat(5000));
  await publish.click();
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await expect(counter).toHaveText('5000 / 5000');
  await content.fill('b'.repeat(5001));
  await expect(page.getByRole('button', { name: 'Salvar alterações', exact: true })).toBeDisabled();
  expect(api.calls.some((call) => call.method === 'PUT' && call.path.startsWith('/posts/'))).toBe(
    false,
  );
  await content.fill('Corrigido.');
  await expect(counter).toHaveText('10 / 5000');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.locator('app-post-card')).toContainText('Corrigido.');
});

test('shows API validation and success messages for creating and editing posts and updating the profile', async ({
  page,
}) => {
  const api = await mockApi(page);
  await login(page);
  await page.getByRole('link', { name: 'Nova publicação', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Escreva o conteúdo da publicação.');
  expect(api.calls.filter((call) => call.path === '/posts' && call.method === 'POST')).toHaveLength(
    0,
  );
  const content = page.getByLabel('Sua publicação', { exact: true });
  await content.fill('Meu projeto em construção.');
  api.postValidation = { Content: ['Conteúdo deve ter até 5.000 caracteres.'] };
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Conteúdo deve ter até 5.000 caracteres.');
  await expect(content).toHaveValue('Meu projeto em construção.');
  await page.screenshot({ path: 'test-results/toast-post-validation.png', fullPage: true });
  api.postValidation = null;
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Publicação criada com sucesso.',
  );
  await page.getByRole('link', { name: 'Voltar para o feed', exact: true }).click();
  const card = page.locator('app-post-card').filter({ hasText: 'Meu projeto em construção.' });
  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar publicação', exact: true });
  api.postValidation = { Content: ['Conteúdo rejeitado pela validação.'] };
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.locator('p-toast').getByRole('alert')).toContainText(
    'Conteúdo rejeitado pela validação.',
  );
  await expect(dialog).toBeVisible();
  api.postValidation = null;
  await dialog.getByLabel('Sua publicação', { exact: true }).fill('Projeto atualizado.');
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Publicação atualizada com sucesso.',
  );

  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.locator('#profile-name-error')).toHaveText('Informe seu nome.');
  await expect(page.getByLabel('Nome', { exact: true })).toHaveAttribute(
    'aria-describedby',
    'profile-name-error',
  );
  await page.getByLabel('Nome', { exact: true }).fill('Gabriel Atualizado');
  api.profileValidation = {
    Name: ['Nome deve ter até 50 caracteres.'],
    Bio: ['A bio deve ter até 500 caracteres.'],
  };
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nome deve ter até 50 caracteres.');
  await expect(page.getByRole('alert')).toContainText('A bio deve ter até 500 caracteres.');
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Gabriel Atualizado');
  await page.setViewportSize({ width: 390, height: 844 });
  const toast = page.locator('p-toast').getByRole('alert');
  await expect(toast).toBeVisible();
  expect((await toast.boundingBox())!.width).toBeLessThanOrEqual(350);
  await page.screenshot({ path: 'test-results/toast-profile-mobile.png', fullPage: true });
  await expect(page.locator('p-toast .p-toast-message-success')).toHaveCount(0);
  api.profileValidation = null;
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.locator('p-toast .p-toast-message-success')).toContainText(
    'Seu perfil foi atualizado.',
  );
  await expect(page.locator('p-toast .p-toast-message-error')).toHaveCount(0);
  const close = page.locator('p-toast').getByRole('button').first();
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('p-toast').getByRole('alert')).toHaveCount(0);
});
