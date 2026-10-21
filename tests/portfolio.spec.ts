import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('WCAG AA checks on homepage and open case in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.locator('[data-case="community-bot"]').click();
    // Measure the settled state, not an intermediate frame of the entrance fade.
    await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
});

test('theme follows OS, explicit selection persists and can be reset', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Цветовая тема', { exact: true }).selectOption('light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Цветовая тема', { exact: true }).selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('all seven cases open, Escape closes, focus and scroll are restored', async ({ page }) => {
  await page.goto('./');
  const cards = page.locator('[data-case]');
  await expect(cards).toHaveCount(7);
  for (let index = 0; index < 7; index++) {
    const card = cards.nth(index);
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('body')).toHaveClass('modal-open');
    await expect(page.getByRole('dialog').locator('h2')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(card).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass('modal-open');
  }
});

test('dialog traps focus; backdrop and close control dismiss it', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-case="diary"]').click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Закрыть кейс ↑' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Закрыть кейс', exact: true })).toBeFocused();
  await page.mouse.click(2, 2);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('[data-case="markdown"]').click();
  await page.getByRole('button', { name: 'Закрыть кейс', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('direct URL, back and forward keep case state in sync', async ({ page }) => {
  await page.goto('./#case-community-bot');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/#case-/);
  await page.locator('[data-case="gps"]').click();
  await page.goBack();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goForward();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('h2')).toContainText('Маршрут');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

for (const width of [360, 768, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test('layout and media at ' + width + 'px, ' + theme, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push(response.url() + ': ' + response.status());
      });
      await page.goto('./');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('h1')).toContainText('Вадим Баранов');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.locator('[data-case="diary"]').click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      for (const img of await dialog.locator('img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
        expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(
          0,
        );
      }
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      for (const link of await dialog.locator('figure a').all()) {
        const href = await link.getAttribute('href');
        expect(href).toContain('/VB_AI_Portfolio/images/');
        expect((await page.request.get(href!)).ok()).toBe(true);
      }
      expect(errors).toEqual([]);
    });
  }
}

test('content and native case controls work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/VB_AI_Portfolio/');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('#case-community-bot summary').click();
  await expect(page.locator('#case-community-bot h2')).toBeVisible();
  await expect(page.locator('.case-detail')).toHaveCount(7);
  await context.close();
});
