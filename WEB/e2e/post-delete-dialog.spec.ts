import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

test('post deletion confirmation leaves side margins on mobile', async ({ page }) => {
  await mockApi(page);
  await login(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const post = page.locator('app-post-card').first();
    await post.getByRole('button', { name: /A.*es da publica/ }).click();
    await page.getByRole('menuitem', { name: 'Excluir', exact: true }).click();
    const confirmation = page.getByRole('alertdialog', { name: /Excluir publica/ });
    await expect(confirmation).toBeVisible();
    const bounds = (await confirmation.boundingBox())!;
    expect(bounds.width).toBeLessThanOrEqual(width - 48);
    expect(bounds.x).toBeGreaterThanOrEqual(24);
    expect(width - bounds.x - bounds.width).toBeGreaterThanOrEqual(24);
    await expect(confirmation.getByRole('button', { name: 'Confirmar', exact: true })).toHaveClass(
      /p-button-danger/,
    );
    await expect(confirmation.getByRole('button', { name: 'Cancelar', exact: true })).toHaveClass(
      /p-button-secondary/,
    );
    await page.screenshot({ path: `test-results/post-delete-${width}.png` });
    await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(post).toBeVisible();
  }
});
