import { expect, test } from '@playwright/test';

test('keeps expanded instructions readable and inside the introduction at desktop sizes', async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const dark of [false, true]) {
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
      await page.goto('/login');
      await page.getByRole('switch').setChecked(dark);
      const formBefore = await page.locator('.login-card').boundingBox();
      await page.locator('summary').click();
      for (const title of [/Crie sua conta/, /Complete seu perfil/, /Publique e comente/]) {
        const step = page.getByRole('tab', { name: title });
        await step.click();
        await expect(step).toBeInViewport({ ratio: 1 });
        await expect(page.locator('.step-description:visible')).toBeInViewport({ ratio: 1 });
        const formAfter = await page.locator('.login-card').boundingBox();
        expect(Math.abs(formAfter!.y - formBefore!.y)).toBeLessThanOrEqual(1);
        expect(
          await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
        ).toBe(true);
        expect(
          (await page.locator('.landscape-motion').boundingBox())!.height,
        ).toBeGreaterThanOrEqual(64);
      }
      await page.screenshot({
        path: `test-results/summary-open-${dark ? 'dark' : 'light'}-${width}.png`,
        fullPage: true,
      });
    }
  }
});

test('animates the login instructions closed and remains usable from the keyboard', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/login');
  const panel = page.locator('.getting-started');
  const summary = panel.locator('summary');
  const collapsed = (await panel.boundingBox())!.height;
  await summary.click();
  await expect(panel).toHaveAttribute('open', '');
  await panel.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  await summary.focus();
  const closing = await summary.evaluate((element) => {
    element.click();
    const panel = element.closest('details')!;
    const height = panel.getBoundingClientRect().height;
    return {
      height,
      animating: panel
        .getAnimations({ subtree: true })
        .some((animation) => animation.playState === 'running'),
    };
  });
  expect(closing.animating).toBe(true);
  expect(closing.height).toBeGreaterThan(collapsed + 1);
  await expect
    .poll(async () => (await panel.boundingBox())!.height)
    .toBeLessThanOrEqual(collapsed + 1);
  await expect(summary).toBeFocused();
  await summary.press('Space');
  await expect(panel).toHaveAttribute('open', '');
});

test('closes instructions immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  const panel = page.locator('.getting-started');
  const summary = panel.locator('summary');
  const collapsed = (await panel.boundingBox())!.height;
  await summary.click();
  await expect(panel).toHaveAttribute('open', '');
  await summary.click();
  await expect(panel).not.toHaveAttribute('open');
  expect((await panel.boundingBox())!.height).toBeLessThanOrEqual(collapsed + 1);
});
