import { expect, test } from '@playwright/test';

/**
 * Infinite mode across tile families: the un-rooted engine now generates all
 * four (spectre, hexagons, hats, turtles), on both surfaces that embed it —
 * The Infinite Map (`f=` in the map hash) and the Explorer's infinite mode
 * (the Explorer's own `f=` plus `md=infinite`).
 *
 * These are wiring smokes: the geometry itself is pinned by the per-family
 * unit suites (core/__tests__/unrooted-families.test.ts, exact.test.ts); what
 * can only break here is a page refusing the family, mixing worlds after a
 * switch, or the renderer failing to draw the per-type meshes.
 */

async function settleMapHud(page: import('@playwright/test').Page, hash: string): Promise<void> {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto(`map.html${hash}`);
  await expect(page.getByTestId('hud-instances')).not.toHaveText('0 instances', {
    timeout: 30000,
  });
}

test('the map draws an endless hexagon world from an f=hex deep link', async ({ page }) => {
  await settleMapHud(page, '#/map?seed=1&f=hex&cx=0&cy=0&z=36');
  await expect(page.locator('[data-testid="map-family"]')).toHaveValue('hex');
  await expect(page.getByTestId('hud-cut')).toContainText('individual tiles');
  await expect(page.getByTestId('hud-draw-ms')).not.toContainText('0 calls');
  await expect(page.locator('.map-title')).toContainText('Hexagons');
});

test('switching the map family reseeds the world and the hash', async ({ page }) => {
  await settleMapHud(page, '#/map?seed=1&cx=0&cy=0&z=36');
  await page.selectOption('[data-testid="map-family"]', 'turtle');
  await expect(page.getByTestId('hud-instances')).not.toHaveText('0 instances', {
    timeout: 30000,
  });
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('f=turtle');
  // Turtles are drawn in the same instanced pipeline: something painted.
  await expect(page.getByTestId('hud-draw-ms')).not.toContainText('0 calls');
});

test('hex strand lines draw and the ticker speaks the hex leaf names', async ({ page }) => {
  // Classes {1, 5} pair up on hexagons; the all-zeros combo is the default.
  await settleMapHud(page, '#/map?seed=1&f=hex&cx=0&cy=0&z=36&ln=1&e=15&c=000000000');
  await expect(page.getByTestId('hud-lines')).toContainText('chords', { timeout: 30000 });
  // The matchings help names the 9 hex leaves — single Gamma, no Gamma1/2.
  await expect(page.locator('.map-lines-help').first()).toContainText('Gamma');
  await expect(page.locator('.map-lines-help').first()).not.toContainText('Gamma1');
});

test("the Explorer's infinite mode accepts every family", async ({ page }) => {
  for (const family of ['hex', 'hat', 'turtle']) {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(`#/explorer?v=1&f=${family}&md=infinite&lv=2`);
    await expect(page.getByTestId('mode-infinite')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', {
      timeout: 30000,
    });
    await expect(page.getByTestId('inf-lod')).toContainText('individual tiles');
    // The old "only generates Tile(1,1)" gate is gone.
    await expect(page.locator('#explorer-sidebar')).not.toContainText('only generates');
  }
});

test('a hex chase names hexagon tiles in the ticker', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // {2,5,8} pairs every hex leaf (no empty types), so any tap lands near ink.
  await page.goto('#/explorer?v=1&f=hex&md=infinite&e=258&fp=8');
  await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', {
    timeout: 30000,
  });
  await expect(page.getByTestId('inf-lines')).toContainText('chords', { timeout: 30000 });
  // Tap around the middle of the viewport until a strand is picked up (the
  // same retry the spectre ticker spec uses, on a wider grid — a tap needs
  // ink within 16 px, and this rule draws only ~2 chords per hexagon).
  const viewport = page.locator('.explorer-infinite');
  const box = (await viewport.boundingBox())!;
  const offsets: [number, number][] = [];
  for (const dy of [0, 40, -40, 80, -80]) {
    for (const dx of [0, 12, -14, 24, -30, 40, -48]) offsets.push([dx, dy]);
  }
  for (const [dx, dy] of offsets) {
    await viewport.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
    await page.waitForTimeout(300);
    const t = await page.getByTestId('inf-trace').textContent();
    if (t && !t.includes('tap a strand')) break;
  }
  await page.waitForTimeout(2000);
  const ticker = page.getByTestId('trace-ticker');
  await expect(ticker).toBeVisible();
  // Every chip is one of the 9 hex leaf names (never Gamma1/Gamma2).
  const names = await ticker.locator('.trace-tile').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  const hexNames = new Set(['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Gamma']);
  for (const name of names) expect(hexNames.has(name), `unexpected tile name ${name}`).toBe(true);
});
