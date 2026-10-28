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

test('two circuits through their terms on the Corners page: a copy two levels up has the same terms', async ({ page }) => {
  await page.goto('corners.html#c=000100000-13');
  const note = page.locator('[data-testid="corners-compare-gap"]');
  // B starts as A's family two levels up, near 4 + √15 = 7.873 times the radius of gyration, and draws within a hundredth of A.
  await expect(note).toContainText(/^60 of 60 terms on, .* differ by 0\.00\d radii .* B has 25,356 tiles to A’s 1,272 and a radius of gyration 7\.8\d+ times A’s\.$/, {
    timeout: 60000,
  });
  await page.locator('[data-testid="corners-compare-nocircle"]').click();
  await expect(note).toContainText(/^59 of 60 terms on/);
  // A click on a harmonic switches it for both.
  const f2 = page.locator('[data-testid="corners-compare-terms"] g[data-f="2"]');
  await f2.click();
  await expect(f2).toHaveAttribute('data-on', '0');
  await expect(note).toContainText(/^58 of 60 terms on/);
  await expect(page.locator('[data-testid="corners-compare-epi-b"]')).toBeVisible();
});

test('the Shapes page groups the circuits and finds a circuit’s twins', async ({ page }) => {
  await page.goto('shapes.html#c=000100000-14');
  await expect(page.locator('[data-testid="shapes-summary"]')).toHaveText(/^327 circuits in \d+ groups/, { timeout: 90000 });
  await expect(page.locator('[data-testid="shapes-selected"]')).toContainText('25,356 tiles');
  // Its nearest shape is the same knobbly triangle in another family or level.
  await expect(page.locator('[data-testid="shapes-nearest"] tbody tr').first()).toContainText('0.00');
});

test.describe('on a screen of pixel ratio 2', () => {
  test.use({ deviceScaleFactor: 2 });
  test('the Shapes page’s epicycles keep their size', async ({ page }) => {
    await page.goto('shapes.html#c=000100000-14');
    const epi = page.locator('[data-testid="corners-epicycles"]');
    await expect(epi).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(500);
    const [width, shown] = await epi.evaluate((c: HTMLCanvasElement) => [c.width, c.clientWidth]);
    expect(shown).toBeLessThanOrEqual(560);
    expect(width).toBe(2 * shown);
  });
});

test('a circuit opens in the Explorer’s infinite view, the trace closes on it, and it opens back on the Shapes page', async ({ page }) => {
  test.setTimeout(150000);
  // 000100000's family [13] circuit born at level 6: 1,272 tiles whose chords add up to 1,161.34 hexagon edges.
  await page.goto('corners.html#c=000100000-13');
  await expect(page.locator('[data-testid="corners-caption"]')).toContainText('1,272 tiles', { timeout: 20000 });
  const href = await page.locator('[data-testid="corners-explorer"]').getAttribute('href');
  expect(href).toMatch(/md=infinite/);
  await page.goto(href!.replace(/^\/Spectre\//, ''));
  await expect(page.getByText(/traced: 1,161 edges long — closed circuit/)).toBeVisible({ timeout: 60000 });
  const back = page.locator('[data-testid="inf-shapes"]');
  await expect(back).toHaveText('1,272 tiles: open on the Shapes page');
  await back.click();
  await expect(page.locator('[data-testid="shapes-selected"]')).toContainText('1,272 tiles', { timeout: 90000 });
});
