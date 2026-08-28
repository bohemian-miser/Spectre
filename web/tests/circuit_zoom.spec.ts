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
  // Real engine work at three different zooms, so the default budget is tight
  // even when nothing is wrong.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`#/explorer?v=1&md=infinite&${RULE}&fc=1&lv=4`);
  await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', { timeout: 30000 });

  const viewport = page.locator('.explorer-infinite');
  const box = (await viewport.boundingBox())!;
  /**
   * Wheel out in a few big steps and let the assertions wait for the result,
   * rather than sleeping a fixed amount after each one — the queries take as
   * long as they take, and a CI runner is slower than a laptop.
   */
  const zoomOut = async (): Promise<void> => {
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 400);
    }
  };

  const toCircuitView = async (): Promise<void> => {
    await page.getByTestId('circuit-zoom').click();
    await expect(page.getByTestId('inf-found')).toContainText('circuits on screen', {
      timeout: 30000,
    });
  };

  await toCircuitView();

  // Without the toggle, a coarse view has nothing to show.
  await zoomOut();
  await expect(page.getByTestId('inf-found')).toHaveText('find: zoom in to tiles', {
    timeout: 30000,
  });

  // With it, the same circuits stay lit — and the HUD says they are held.
  await toCircuitView();
  await page.getByTestId('persist-found').check();
  await zoomOut();
  await expect(page.getByTestId('inf-found')).toContainText('held from a closer view', {
    timeout: 30000,
  });
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
