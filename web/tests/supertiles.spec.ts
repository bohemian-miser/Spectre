import { expect, test } from '@playwright/test';

/**
 * The Supertiles view: a supertile taken apart into the pieces it is made of.
 * What matters here is that the controls move the scene and that the deep
 * levels stay drawable — the geometry itself is pinned by unit tests.
 */
test('takes a supertile apart and reports what it drew', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('supertiles.html');

  const svg = page.locator('.supertile-view');
  await expect(svg).toBeVisible({ timeout: 30000 });
  // Delta's rule names eight pieces, and all eight are drawn.
  await expect(svg).toHaveAttribute('data-piece-count', '8');
  await expect(page.getByTestId('st-pieces')).toHaveText('8 pieces');
  await expect(page.getByTestId('st-rule')).toContainText('Sigma');
  expect(errors).toEqual([]);
});

test('the level slider is one substitution round per step', async ({ page }) => {
  await page.goto('supertiles.html');
  const svg = page.locator('.supertile-view');
  await expect(svg).toHaveAttribute('data-tile-count', '559', { timeout: 30000 });

  await page.getByTestId('st-level').fill('4');
  await expect(svg).toHaveAttribute('data-tile-count', '4401');
  await expect(page.getByTestId('st-level-value')).toHaveText('4');
});

test('spacing pushes the pieces apart without changing what they are', async ({ page }) => {
  await page.goto('supertiles.html#/supertiles?gap=0');
  const svg = page.locator('.supertile-view');
  await expect(svg).toBeVisible({ timeout: 30000 });

  /**
   * The scene is refit as it grows, so what a viewer actually sees is the
   * pieces separating RELATIVE TO THEIR OWN SIZE. Measure exactly that.
   */
  const separation = async (): Promise<number> => {
    const first = await page.locator('.supertile-island').first().boundingBox();
    const last = await page.locator('.supertile-island').last().boundingBox();
    if (!first || !last) throw new Error('no pieces on screen');
    const gap = Math.hypot(
      first.x + first.width / 2 - (last.x + last.width / 2),
      first.y + first.height / 2 - (last.y + last.height / 2),
    );
    return gap / first.width;
  };

  const closed = await separation();
  await page.getByTestId('st-gap').fill('1.2');
  await expect(page.getByTestId('st-gap-value')).toHaveText('1.20');
  // Same pieces, same tiles — further apart.
  await expect(svg).toHaveAttribute('data-piece-count', '8');
  await expect(svg).toHaveAttribute('data-tile-count', '559');
  expect(await separation()).toBeGreaterThan(closed * 1.2);
});

test('deep levels stay drawable by dropping to piece outlines', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('supertiles.html#/supertiles?lv=6&gap=0.5');
  const svg = page.locator('.supertile-view');
  await expect(svg).toHaveAttribute('data-tile-count', '272791', { timeout: 45000 });
  await expect(svg).toHaveAttribute('data-tiles-drawn', 'no');
  await expect(page.getByTestId('st-detail')).toContainText('outlines only');
  // The pieces are still there; only the spectres inside them are not.
  await expect(page.locator('.supertile-island')).toHaveCount(8);
  expect(errors).toEqual([]);
});

test('a deep link reproduces the scene, and the nav lists the page', async ({ page }) => {
  await page.goto('supertiles.html#/supertiles?t=Gamma&lv=3&gap=0.6&d=1');
  // Gamma is the odd one out: seven pieces, not eight.
  await expect(page.locator('.supertile-view')).toHaveAttribute('data-piece-count', '7', {
    timeout: 30000,
  });
  await expect(page.locator('nav a', { hasText: 'Supertiles' })).toHaveCount(1);
});

test('the rule controls weld and trace this supertile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('supertiles.html#/supertiles?lv=3&gap=0.35&ln=1&e=2578&c=0100101100');
  await expect(page.locator('.supertile-view')).toBeVisible({ timeout: 30000 });

  // The lines are drawn, and the HUD agrees with the analysis panel about
  // what was found — two independent traces of the same patch.
  await expect(page.locator('.supertile-strand').first()).toBeVisible({ timeout: 30000 });
  const hud = await page.getByTestId('st-strands').textContent();
  const circuits = Number(/(\d+) circuits/.exec(hud ?? '')?.[1]);
  expect(circuits).toBeGreaterThan(0);
  // The drawn lines come from a synchronous local trace and the panel from the
  // worker, so the picture is ready first; wait for the panel to catch up.
  await expect(page.locator('.stats-summary')).toContainText(`Circuits${circuits}`, {
    timeout: 30000,
  });
  expect(errors).toEqual([]);
});

test('picking a circuit length isolates those strands', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('supertiles.html#/supertiles?lv=3&gap=0.5&ln=1&e=2578&c=0100101100&tl=0');
  await expect(page.locator('.supertile-strand').first()).toBeVisible({ timeout: 30000 });
  const all = await page.locator('.supertile-strand').count();

  await page.locator('.stats-summary button').filter({ hasText: '×' }).first().click();
  await page.waitForTimeout(500);
  const lit = await page.locator('.supertile-strand[opacity="1"]').count();
  expect(lit).toBeGreaterThan(0);
  expect(lit).toBeLessThan(all);
});

test('a supertile too big to trace says so instead of hanging', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('supertiles.html#/supertiles?lv=6&ln=1&e=2578&c=0100101100');
  await expect(page.getByTestId('st-strands')).toContainText('over', { timeout: 45000 });
  await expect(page.locator('.supertile-strand')).toHaveCount(0);
});

/**
 * Regression: narrowing the seam subset used to leave the matching vector
 * holding indices that were valid for the WIDER subset. The combo encoder
 * rejects an out-of-range index exactly as it rejects a crossing one, so the
 * view claimed a perfectly good rule "crosses itself" — and `localChords`
 * returns nothing for such an index, so some tiles quietly stopped drawing
 * their strand at all.
 */
test('narrowing the edge rule keeps a combination string and keeps drawing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('supertiles.html#/supertiles?lv=2&gap=0.35&ln=1&e=012&c=');
  await expect(page.locator('.supertile-view')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.combo-readout')).toContainText('012-');

  // Push every matching to its highest index, so there is something to go
  // stale when the subset shrinks under it.
  const sliders = page.locator('.matching-grid input[type="range"]');
  const count = await sliders.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const max = await sliders.nth(i).getAttribute('max');
    await sliders.nth(i).fill(max ?? '0');
  }
  await expect(page.locator('.combo-readout')).toContainText('Combination string');
  const drawnBefore = await page.locator('.supertile-strand').count();
  expect(drawnBefore).toBeGreaterThan(0);

  // Drop a class from the rule.
  await page.locator('.edge-subset-picker button').filter({ hasText: /^2$/ }).first().click();

  // Still a real rule with a real combination string, still drawing.
  await expect(page.locator('.combo-readout')).toContainText('01-');
  await expect(page.locator('.combo-readout')).not.toContainText('crosses itself');
  await expect.poll(() => page.locator('.supertile-strand').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('strands draw over the pieces and their labels', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('supertiles.html#/supertiles?lv=3&gap=0.35&ln=1&e=2578&c=0100101100');
  await expect(page.locator('.supertile-strand').first()).toBeVisible({ timeout: 30000 });
  // Last in document order is last painted: the path is never buried under a
  // tile fill or a piece name.
  const order = await page
    .locator('.supertile-camera')
    .evaluate((g) => [...g.children].map((c) => c.getAttribute('class')));
  expect(order[order.length - 1]).toBe('supertile-strands');
});
