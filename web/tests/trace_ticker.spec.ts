import { expect, test } from '@playwright/test';

/**
 * The rainbow line says where a strand went; it says nothing about what it
 * went THROUGH. The ticker names each tile as the walk leaves it, in that
 * tile's own colour.
 */
const RULE = 'e=2578&c=0100101100';

async function chase(page: import('@playwright/test').Page, hash: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(hash);
  await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', { timeout: 30000 });
  const viewport = page.locator('.explorer-infinite');
  const box = (await viewport.boundingBox())!;
  for (const [dx, dy] of [[0, 0], [12, 8], [-14, 6], [8, -12]]) {
    await viewport.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
    await page.waitForTimeout(400);
    const t = await page.getByTestId('inf-trace').textContent();
    if (t && !t.includes('tap a strand')) break;
  }
  await page.waitForTimeout(2500);
}

test('names the tiles a chase crosses, in their own colours', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // fp=8 paces the walk so the ticker is watchable rather than a blur.
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8`);

  const ticker = page.getByTestId('trace-ticker');
  await expect(ticker).toBeVisible();
  const chips = ticker.locator('.trace-tile');
  expect(await chips.count()).toBeGreaterThan(3);

  // Every name is a real spectre leaf type…
  const names = await chips.allTextContents();
  const known = ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Gamma1', 'Gamma2'];
  expect(names.every((n) => known.includes(n))).toBe(true);

  // …drawn in a real colour, and the newest one is marked.
  const colours = await chips.evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).backgroundColor),
  );
  expect(colours.every((c) => c !== 'rgba(0, 0, 0, 0)')).toBe(true);
  await expect(chips.last()).toHaveClass(/is-newest/);
  expect(errors).toEqual([]);
});

test('grows as the chase runs, and goes away when the strand is cleared', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=6`);
  const chips = page.getByTestId('trace-ticker').locator('.trace-tile');
  const first = await chips.count();
  await page.waitForTimeout(2500);
  expect(await chips.count()).toBeGreaterThanOrEqual(first);

  await page.getByTestId('trace-clear').click();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('trace-ticker')).toHaveCount(0);
});

test('the map page carries the same ticker', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('map.html#/map?seed=1&ln=1&e=2578&c=0100101100&fp=8');
  await expect(page.getByTestId('map-hud')).toBeVisible({ timeout: 30000 });
  const viewport = page.locator('.map-viewport');
  const box = (await viewport.boundingBox())!;
  for (const [dx, dy] of [[0, 0], [12, 8], [-14, 6], [8, -12]]) {
    await viewport.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
    await page.waitForTimeout(400);
    const t = await page.getByTestId('hud-trace').textContent();
    if (t && !t.includes('tap a strand')) break;
  }
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('trace-ticker')).toBeVisible();
  expect(await page.getByTestId('trace-ticker').locator('.trace-tile').count()).toBeGreaterThan(3);
});
