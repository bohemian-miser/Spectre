import { expect, test } from '@playwright/test';

/**
 * The Top-down page: tiles on a map turn into their supertile clusters in
 * place. The geometry is pinned by unit tests against the bottom-up
 * construction; here the controls must change the map.
 */
const state = (page: import('@playwright/test').Page) => page.getByTestId('td-state');

test('a click substitutes one tile, the rest stays, and undo puts it back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('topdown.html');
  await expect(state(page)).toHaveAttribute('data-tile-count', '63', { timeout: 30000 });
  await expect(state(page)).toHaveAttribute('data-family', 'hex');

  const box = await page.locator('.td-viewport').boundingBox();
  if (!box) throw new Error('no viewport');
  // find a spot on a tile: walk out from the centre until a click lands
  for (const dx of [0, 20, -20, 40, -40]) {
    await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2);
    if ((await state(page).getAttribute('data-steps')) === '1') break;
  }
  await expect(state(page)).toHaveAttribute('data-steps', '1');
  const count = Number(await state(page).getAttribute('data-tile-count'));
  expect([69, 70]).toContain(count);
  await expect(state(page)).toHaveAttribute('data-depth-max', '3');
  await expect(page.getByTestId('td-slide')).toBeVisible();

  await page.getByTestId('td-undo').click();
  await expect(state(page)).toHaveAttribute('data-tile-count', '63');
  expect(errors).toEqual([]);
});

test('every tile in view, then a selection, one level deeper each', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('topdown.html');
  await expect(state(page)).toHaveAttribute('data-tile-count', '63', { timeout: 30000 });
  await page.getByTestId('td-speed').selectOption('0');

  await page.getByTestId('td-in-view').click();
  await expect(state(page)).toHaveAttribute('data-tile-count', '496');

  await page.getByTestId('td-tool-lasso').click();
  const box = await page.locator('.td-viewport').boundingBox();
  if (!box) throw new Error('no viewport');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx - 60, cy - 60);
  await page.mouse.down();
  for (const [dx, dy] of [
    [60, -60],
    [60, 60],
    [-60, 60],
    [-60, -60],
  ]) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 5 });
  }
  await page.mouse.up();
  const picked = Number(await state(page).getAttribute('data-selected'));
  expect(picked).toBeGreaterThan(0);
  await page.getByTestId('td-substitute').click();
  await expect(state(page)).toHaveAttribute('data-depth-max', '4');
  await expect(state(page)).toHaveAttribute('data-selected', '0');
});

test('the spectre, from a link', async ({ page }) => {
  await page.goto('topdown.html#family=spectre&type=Gamma&level=2');
  await expect(state(page)).toHaveAttribute('data-tile-count', '55', { timeout: 30000 });
  await expect(state(page)).toHaveAttribute('data-family', 'spectre');
  await expect(page.getByTestId('td-type-Gamma')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('td-poly')).toHaveText('λ⁴ − 8λ² + 1');
  await page.getByTestId('td-family-hex').click();
  await expect(state(page)).toHaveAttribute('data-family', 'hex');
  await expect(page.getByTestId('td-hex-rule')).toBeVisible();
});

test('circuits: picking a strand and substituting its tiles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('topdown.html#family=hex&type=Delta&level=3&c=023468-111000100');
  await expect(state(page)).toHaveAttribute('data-tile-count', '496', { timeout: 30000 });
  await expect(page.getByTestId('td-circuits')).toBeChecked();
  await expect(state(page)).toHaveAttribute('data-circuits', '10');
  await page.getByTestId('td-speed').selectOption('0');

  const box = await page.locator('.td-viewport').boundingBox();
  if (!box) throw new Error('no viewport');
  // click a grid of spots round the centre until one lands on a strand
  let picked = '';
  outer: for (let r = 0; r <= 60; r += 5) {
    for (let dx = -r; dx <= r; dx += 5) {
      for (const dy of [-r, r]) {
        await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
        picked = (await state(page).getAttribute('data-picked')) ?? '';
        if (picked) break outer;
      }
    }
  }
  expect(Number(picked)).toBeGreaterThan(0);
  await expect(state(page)).toHaveAttribute('data-selected', picked);
  await page.getByTestId('td-substitute-circuit').click();
  await expect(state(page)).toHaveAttribute('data-steps', '1');
  await expect(state(page)).toHaveAttribute('data-depth-max', '4');
  expect(errors).toEqual([]);
});
