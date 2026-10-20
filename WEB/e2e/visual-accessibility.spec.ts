import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { FIRST, login, mockApi } from './api.fixture';

for (const mode of ['light', 'dark'] as const) {
  test(`checks rendered text contrast and icon font integrity in ${mode}`, async ({ page }) => {
    test.setTimeout(120000);
    await mockApi(page);
    await page.emulateMedia({ colorScheme: mode });
    await login(page, 'admin@example.test');
    await expect(page.locator('app-post-card')).toHaveCount(2);
    if (mode === 'dark') {
      for (const selector of ['body', '.navigation-panel', 'app-post-card .p-card']) {
        const channels = await page
          .locator(selector)
          .first()
          .evaluate((element) =>
            (getComputedStyle(element).backgroundColor.match(/[\d.]+/g) || [])
              .slice(0, 3)
              .map(Number),
          );
        expect(Math.max(...channels), `${selector} must stay dark`).toBeLessThanOrEqual(35);
        expect(
          Math.max(...channels) - Math.min(...channels),
          `${selector} must stay neutral`,
        ).toBeLessThanOrEqual(10);
      }
    }
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => /primeicons.*\.woff2/.test(name)),
    );
    expect(fonts.length).toBeGreaterThan(0);
    const font = await page.request.get(fonts[0]);
    expect(
      (await font.body()).equals(readFileSync('node_modules/primeicons/fonts/primeicons.woff2')),
    ).toBe(true);
    const routes = [
      '/feed',
      '/posts/new',
      `/posts/${FIRST}`,
      '/profile/me',
      '/admin',
      '/notfound',
      '/register',
      '/login',
    ];
    for (const url of routes) {
      await page.evaluate((route) => {
        history.pushState({}, '', route);
        dispatchEvent(new PopStateEvent('popstate'));
      }, url);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expect(page.locator('.loading')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      const failures = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const rgba = (color: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return Array.from(ctx.getImageData(0, 0, 1, 1).data);
        };
        const luminance = (color: number[]) => {
          const [r, g, b] = color.slice(0, 3).map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return r * 0.2126 + g * 0.7152 + b * 0.0722;
        };
        const errors: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const element = node.parentElement;
          const value = node.textContent?.trim();
          if (
            !element ||
            !value ||
            element.closest('script, style, [aria-hidden="true"], [disabled], .p-disabled')
          )
            continue;
          if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
          const style = getComputedStyle(element);
          const ancestors: Element[] = [];
          for (let current: Element | null = element; current; current = current.parentElement)
            ancestors.unshift(current);
          let background = [255, 255, 255];
          for (const ancestor of ancestors) {
            const color = rgba(getComputedStyle(ancestor).backgroundColor);
            const alpha = color[3] / 255;
            background = background.map(
              (channel, index) => color[index] * alpha + channel * (1 - alpha),
            );
          }
          const color = rgba(style.color);
          const alpha = color[3] / 255;
          const foreground = background.map(
            (channel, index) => color[index] * alpha + channel * (1 - alpha),
          );
          const a = luminance(foreground),
            b = luminance(background);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          const large =
            parseFloat(style.fontSize) >= 24 ||
            (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
          if (ratio + 0.01 < (large ? 3 : 4.5))
            errors.push(
              `${element.tagName}.${element.className}: "${value.slice(0, 55)}" (${ratio.toFixed(2)}:1)`,
            );
        }
        const contrast = (a: number[], b: number[]) => {
          const first = luminance(a),
            second = luminance(b);
          return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
        };
        for (const field of document.querySelectorAll('input:not([type="checkbox"]), textarea')) {
          if (!field.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) continue;
          const style = getComputedStyle(field);
          const background = rgba(style.backgroundColor);
          const border = contrast(rgba(style.borderTopColor), background);
          const foreground = contrast(rgba(style.color), background);
          if (border + 0.01 < 3) errors.push(`${field.id}: border ${border.toFixed(2)}:1`);
          if (foreground + 0.01 < 4.5)
            errors.push(`${field.id}: input text ${foreground.toFixed(2)}:1`);
          if (field.getAttribute('placeholder')) {
            const placeholder = contrast(
              rgba(getComputedStyle(field, '::placeholder').color),
              background,
            );
            if (placeholder + 0.01 < 4.5)
              errors.push(`${field.id}: placeholder ${placeholder.toFixed(2)}:1`);
          }
        }
        return errors;
      });
      expect(failures, `${mode} ${url}`).toEqual([]);
    }
  });
}
