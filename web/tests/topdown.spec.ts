import { expect, test } from '@playwright/test';

/**
 * The Top-down page: substitute a board, or a lassoed part of it, one level
 * deeper. The placement rule is pinned by unit tests against the bottom-up
 * construction; here the controls must move the board and the URL.
 */
test('substitutes all, then a lassoed area, and undoes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('topdown.html');

  const svg = page.getByTestId('td-svg');
  await expect(svg).toHaveAttribute('data-tile-count', '8', { timeout: 30000 });
  await expect(page.getByTestId('td-poly')).toHaveText('λ⁴ − 8λ² + 1');
  await page.getByTestId('td-speed').selectOption('0');

  await page.getByTestId('td-substitute').click();
  await expect(svg).toHaveAttribute('data-level', '2');
  await expect(svg).toHaveAttribute('data-tile-count', '63');

  await page.getByTestId('td-lasso').click();
  const box = await page.locator('.td-viewport').boundingBox();
  if (!box) throw new Error('no viewport');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx - 90, cy - 90);
  await page.mouse.down();
  for (const [dx, dy] of [
    [90, -90],
    [90, 90],
    [-90, 90],
    [-90, -90],
  ]) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 6 });
  }
  await page.mouse.up();
  const picked = Number(await svg.getAttribute('data-selected'));
  expect(picked).toBeGreaterThan(0);
  expect(picked).toBeLessThan(63);

  await page.getByTestId('td-substitute').click();
  await expect(svg).toHaveAttribute('data-level', '3');
  const count = Number(await svg.getAttribute('data-tile-count'));
  expect(count).toBeGreaterThanOrEqual(7 * picked);
  expect(count).toBeLessThanOrEqual(8 * picked);
  expect(page.url()).toContain('steps=*;*;');

  await page.getByTestId('td-undo').click();
  await expect(svg).toHaveAttribute('data-tile-count', '63');
  expect(errors).toEqual([]);
});

test('a link restores the board', async ({ page }) => {
  await page.goto('topdown.html#type=Gamma&steps=*;*');
  const svg = page.getByTestId('td-svg');
  await expect(svg).toHaveAttribute('data-tile-count', '55', { timeout: 30000 });
  await expect(page.getByTestId('td-type-Gamma')).toHaveAttribute('aria-pressed', 'true');
});

test('the hexagons substitute too, placed by slot path, and the step animates', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('topdown.html');
  const svg = page.getByTestId('td-svg');
  await expect(svg).toHaveAttribute('data-tile-count', '8', { timeout: 30000 });

  await page.getByTestId('td-family-hex').click();
  await expect(svg).toHaveAttribute('data-family', 'hex');
  await expect(page.getByTestId('td-hex-rule')).toBeVisible();
  await expect(page.getByTestId('td-poly')).toHaveCount(0);

  await page.getByTestId('td-substitute').click();
  await expect(svg).toHaveAttribute('data-tile-count', '63');
  await expect(svg).toHaveAttribute('data-animating', 'yes');
  await expect(svg).toHaveAttribute('data-animating', 'no', { timeout: 10000 });
  expect(page.url()).toContain('family=hex');
  expect(errors).toEqual([]);
});
