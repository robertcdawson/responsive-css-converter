import { test, expect } from '@playwright/test';

test.describe('CSS Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads demo CSS and converts it', async ({ page }) => {
    // Click demo button
    await page.click('button[title="Load sample CSS code"]');

    // Verify demo CSS is loaded
    const inputEditor = await page.locator('.cm-content').first();
    const inputText = await inputEditor.innerText();
    expect(inputText).toContain('.header');
    expect(inputText).toContain('width: 1200px');

    // Click convert button
    await page.click('button:has-text("Convert")');

    // Verify conversion
    const outputEditor = await page.locator('.cm-content').nth(1);
    const outputText = await outputEditor.innerText();
    expect(outputText).toContain('75.00rem'); // 1200px / 16
    expect(outputText).toContain('1.25rem'); // 20px / 16
  });

  test('handles URL extraction', async ({ page }) => {
    // Enter URL
    await page.fill('input[type="url"]', 'https://example.com');

    // Click extract button
    await page.click('button:has-text("Extract CSS")');

    // Verify loading state
    const extractButton = page.locator('button:has-text("Extracting...")');
    await expect(extractButton).toBeVisible();
  });

  test('validates URL input', async ({ page }) => {
    // Enter invalid URL
    await page.fill('input[type="url"]', 'invalid-url');

    // Click extract button
    await page.click('button:has-text("Extract CSS")');

    // Verify alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Please enter a valid URL');
      await dialog.accept();
    });
  });

  test('converts units with different settings', async ({ page }) => {
    // Load demo CSS
    await page.click('button[title="Load sample CSS code"]');

    // Change settings
    await page.fill('input#baseSize', '10');
    await page.selectOption('select#targetUnit', 'em');
    await page.fill('input#precision', '1');

    // Convert
    await page.click('button:has-text("Convert")');

    // Verify conversion with new settings
    const outputEditor = await page.locator('.cm-content').nth(1);
    const outputText = await outputEditor.innerText();
    expect(outputText).toContain('120.0em'); // 1200px / 10
    expect(outputText).toContain('2.0em'); // 20px / 10
  });

  test('formats and minifies CSS', async ({ page }) => {
    // Load demo CSS
    await page.click('button[title="Load sample CSS code"]');

    // Format input CSS
    await page.click('button[title="Format CSS code"]');

    // Verify formatting
    const inputEditor = await page.locator('.cm-content').first();
    const formattedText = await inputEditor.innerText();
    expect(formattedText).toContain('{\n  width');

    // Minify input CSS
    await page.click('button[title="Minify CSS code"]');

    // Verify minification
    const minifiedText = await inputEditor.innerText();
    expect(minifiedText).not.toContain('\n');
  });
}); 