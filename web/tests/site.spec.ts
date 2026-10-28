import { test, expect } from '@playwright/test';

/**
 * Entry-switch smoke tests (stage 3): the new Explorer is the site root, the p5
 * app still works at legacy.html, and the widget gallery is untouched.
 */

test('/ renders the Explorer with a visible tiling SVG', async ({ page }) => {
  await page.goto('');

  await expect(page.locator('header.site-header')).toBeVisible();
  const svg = page.locator('svg.tiling-view');
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('data-level', '2');
  // Level 2 = 71 tiles, one <use> each (DESIGN.md §5.3).
  await expect(svg.locator('use')).toHaveCount(71);

  await expect(page.locator('.explorer-sidebar')).toBeVisible();
  await expect(page.locator('a[data-nav-id="legacy"]')).toHaveAttribute(
    'href',
    /legacy\.html$/,
  );
});

test('the explorer reacts to controls and shares its state through the hash', async ({ page }) => {
  await page.goto('');

  // Pick the first non-empty valid subset from the kernel dropdown.
  await page.selectOption('.edge-subset-picker select', { index: 1 });
  await page.click('button[aria-label="More supertiles"]');

  const svg = page.locator('svg.tiling-view');
  await expect(svg).toHaveAttribute('data-level', '3');
  await expect(svg).toHaveAttribute('data-tile-count', '559');
  // Circuit analysis (level 3 => worker) paints the overlay.
  await expect(page.locator('.circuit-path').first()).toBeVisible({ timeout: 15000 });

  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('#/explorer');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('lv=3');
});

test('a deep link reproduces the scene', async ({ page }) => {
  await page.goto('#/explorer?v=1&f=spectre&lv=1&e=2578');
  const svg = page.locator('svg.tiling-view');
  await expect(svg).toHaveAttribute('data-level', '1');
  await expect(page.locator('.matching-slider').first()).toBeVisible();
  await expect(page.locator('.combo-readout code')).toHaveText('2578-0000000000');
});

test('legacy.html still runs the p5 app', async ({ page }) => {
  await page.goto('legacy.html');
  const mainCanvas = page.locator('canvas').nth(1);
  await expect(mainCanvas).toBeVisible();
  await expect(page.locator('a.legacy-back')).toBeVisible();
});

test('widgets.html still renders the dev gallery', async ({ page }) => {
  await page.goto('widgets.html');
  await expect(page.locator('.gallery-header h1')).toHaveText('Spectre widget gallery');
  await expect(page.locator('svg.tiling-view')).toBeVisible();
  await expect(page.locator('.tile-palette-cell').first()).toBeVisible();
});

test('the quick bar under the field steps pairings, opens tiles and sets strands', async ({ page }) => {
  await page.goto('#/explorer?v=1&f=spectre&lv=2&e=2578&c=0100101100');
  const bar = page.getByTestId('quick-bar');
  await expect(bar).toBeVisible();
  await expect(page.getByTestId('quick-tail-free')).toHaveClass(/good/);

  const before = await page.getByTestId('quick-position').innerText();
  await bar.getByRole('button', { name: 'Next pairing ›' }).click();
  await expect(page.getByTestId('quick-position')).not.toHaveText(before);

  await bar.locator('[data-tile="Theta"]').click();
  await expect(page.getByTestId('tile-editor')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByTestId('quick-strands-5').click();
  await expect(page.getByTestId('quick-strands-5')).toHaveText('×2');
  await expect(page.getByTestId('quick-tail-free')).toHaveClass(/bad/);
});

test('the Corners page fits a circuit’s polygons and draws its spectrum', async ({ page }) => {
  await page.goto('corners.html');
  await expect(page.locator('[data-testid="corners-caption"]')).toContainText('25,356 tiles', { timeout: 20000 });
  // Family [147]'s knobbly triangle: nine sides, three long and six short.
  await expect(page.locator('[data-testid="corners-chosen"]')).toHaveText(/^Chosen: 9 sides\./, { timeout: 60000 });
  await expect(page.locator('[data-testid="corners-symmetry"] title').nth(1)).toHaveText('3-fold: 100.00%');
  await expect(page.locator('[data-testid="corners-epicycles"]')).toBeVisible();
});
