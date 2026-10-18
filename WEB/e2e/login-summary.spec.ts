import { expect, test } from '@playwright/test';

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
