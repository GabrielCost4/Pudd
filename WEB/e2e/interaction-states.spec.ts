import { expect, test } from '@playwright/test';
import { login, mockApi } from './api.fixture';

for (const mode of ['light', 'dark'] as const) {
  test(`reviews hover, visible keyboard focus and editor overlays in ${mode}`, async ({ page }) => {
    await mockApi(page);
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);
    await page.getByRole('link', { name: 'Escrever uma publicação', exact: true }).click();
    const submit = page.getByRole('button', { name: 'Publicar', exact: true });
    const normal = await submit.evaluate((element) => getComputedStyle(element).backgroundColor);
    await submit.hover();
    await expect
      .poll(() => submit.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe(normal);
    await page.screenshot({ path: `docs/ui-audit/after/state-hover-${mode}.png`, fullPage: true });
    await page.keyboard.press('Tab');
    await submit.focus();
    expect(
      await submit.evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          element.matches(':focus-visible') &&
          (parseFloat(style.outlineWidth) > 0 || style.boxShadow !== 'none')
        );
      }),
    ).toBe(true);
    await page.screenshot({
      path: `docs/ui-audit/after/state-keyboard-focus-${mode}.png`,
      fullPage: true,
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        history.pushState({}, '', '/feed');
        dispatchEvent(new PopStateEvent('popstate'));
      });
      const edit = page
        .locator('app-post-card')
        .first()
        .getByRole('button', { name: 'Editar', exact: true });
      await edit.click();
      const dialog = page.getByRole('dialog', { name: 'Editar publicação', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `docs/ui-audit/after/state-dialog-${width}-${mode}.png`,
        fullPage: true,
      });
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(edit).toBeFocused();
    }
  });
}
