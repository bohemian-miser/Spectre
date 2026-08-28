import { expect, test } from '@playwright/test';

/**
 * Finding circuits needs a cut of individual tiles, but SEEING the pattern
 * they make does not. "Circuit zoom" parks the camera at the widest view that
 * still qualifies; the persist toggle then holds what was found while the
 * camera pulls further back.
 */
const RULE = 'e=2578&c=0100101100';

test('circuit zoom lands on a view find-all can actually analyse', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  // lv=8 is far past what find-all can do: it opens on supertile glyphs.
  await page.goto(`#/explorer?v=1&md=infinite&${RULE}&fc=1&lv=8`);
  await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', { timeout: 30000 });
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('inf-found')).toHaveText('find: zoom in to tiles');

  await page.getByTestId('circuit-zoom').click();
  await page.waitForTimeout(2500);

  await expect(page.getByTestId('inf-lod')).toContainText('individual tiles');
  await expect(page.getByTestId('inf-found')).toContainText('circuits on screen');
  expect(errors).toEqual([]);
});

test('found circuits are dropped on zoom-out, and held when asked', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`#/explorer?v=1&md=infinite&${RULE}&fc=1&lv=6`);
  await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', { timeout: 30000 });
  await page.getByTestId('circuit-zoom').click();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('inf-found')).toContainText('circuits on screen');

  const viewport = page.locator('.explorer-infinite');
  const box = (await viewport.boundingBox())!;
  const zoomOut = async (steps: number): Promise<void> => {
    for (let i = 0; i < steps; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1800);
  };

  // Without the toggle, a coarse view has nothing to show.
  await zoomOut(10);
  await expect(page.getByTestId('inf-found')).toHaveText('find: zoom in to tiles');

  // With it, the same circuits stay lit — and the HUD says they are held.
  await page.getByTestId('circuit-zoom').click();
  await page.waitForTimeout(2500);
  await page.getByTestId('persist-found').check();
  await zoomOut(10);
  await expect(page.getByTestId('inf-found')).toContainText('held from a closer view');
  // They are really being drawn, not just counted.
  await expect(page.getByTestId('inf-draw')).not.toContainText('· 0 calls');
});

test('the map page offers the same pair', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('map.html#/map?seed=1&ln=1&e=2578&c=0100101100&fc=1&pf=1&z=0.5');
  await expect(page.getByTestId('map-circuit-zoom')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('map-persist-found')).toBeChecked();
  await page.getByTestId('map-circuit-zoom').click();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('hud-found')).toContainText('circuits on screen');
});
