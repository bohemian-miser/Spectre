import { test, expect } from '@playwright/test';

test('main canvas is rendered', async ({ page }) => {
  await page.goto('/');
  const mainCanvas = page.locator('canvas').nth(1);
  await expect(mainCanvas).toBeVisible();
});

test('edge label checkboxes work correctly and labels appear/disappear', async ({ page }) => {
  await page.goto('/');

  const showAllCheckbox = page.getByLabel('Show all edge numbers');
  const edgeCheckboxes = page.getByLabel(/^[0-8]$|^7 \(Mystic\)$/);

  // Get a reference to a thumbnail canvas and the main canvas
  const thumbnailCanvas = page.locator('canvas[width="192"][height="135"]').first();
  const mainCanvas = page.locator('canvas').nth(1); // Assuming the main canvas is the second one

  // 1. Check 'Show all edge numbers'
  await showAllCheckbox.check();

  const count = await edgeCheckboxes.count();
  expect(count).toBe(9);

  for (const checkbox of await edgeCheckboxes.all()) {
    await expect(checkbox).toBeChecked();
  }

  // Take screenshots with labels visible
  const thumbnailWithLabels = await thumbnailCanvas.screenshot();
  const mainCanvasWithLabels = await mainCanvas.screenshot();

  // 2. Uncheck 'Show all edge numbers'
  await showAllCheckbox.uncheck();

  for (const checkbox of await edgeCheckboxes.all()) {
    await expect(checkbox).not.toBeChecked();
  }

  // Take screenshots with labels hidden
  const thumbnailWithoutLabels = await thumbnailCanvas.screenshot();
  const mainCanvasWithoutLabels = await mainCanvas.screenshot();

  // Compare screenshots to ensure visual change (labels appearing/disappearing)
  expect(thumbnailWithLabels).not.toEqual(thumbnailWithoutLabels);
  expect(mainCanvasWithLabels).not.toEqual(mainCanvasWithoutLabels);
});
