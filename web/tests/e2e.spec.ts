import { test, expect } from '@playwright/test';

test('main canvas is rendered', async ({ page }) => {
  await page.goto('legacy.html');
  const mainCanvas = page.locator('canvas').nth(1);
  await expect(mainCanvas).toBeVisible();
});

test('edge label checkboxes work correctly and labels appear/disappear', async ({ page }) => {
  await page.goto('legacy.html');

  const showAllCheckbox = page.getByLabel('Show all', { exact: true });
  const edgeCheckboxes = page.getByLabel(/^[0-8]$|^7 \(Mystic\)$/);

  // Get a reference to a thumbnail canvas and the main canvas
  // The thumbnails are every canvas except p5's own main canvas; matching on
  // that rather than hard-coded pixel dimensions, which drift with the layout.
  const thumbnailCanvas = page.locator('canvas:not(.p5Canvas)').first();
  const mainCanvas = page.locator('canvas').nth(1); // Assuming the main canvas is the second one

  // 1. Check 'Show all'
  await showAllCheckbox.check();

  // 9 "Major Edges" boxes (0-6, "7 (Mystic)", 8). This was 18 while the sidebar
  // also rendered a matching "Joiner Edges" checkbox column; that column became
  // a dropdown of valid combinations, leaving only the Major Edges set.
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
