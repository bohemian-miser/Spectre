import { test, expect } from '@playwright/test';

test('repro line count bug: only 1 continuous line should exist for Psi supertile', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).p !== undefined);

  // Select 'Psi' tile
  const tileSelect = page.locator('select').nth(1);
  await tileSelect.selectOption('Psi');

  // Select Joiner Edges 1, 2, 7 (Mystic), 8
  const edgesToSelect = ['1', '2', '7 (Mystic)', '8'];
  for (const edge of edgesToSelect) {
    // Joiner edges are the second set of checkboxes
    await page.getByLabel(edge, { exact: true }).nth(1).check();
  }

  // Build Supertiles (4 iterations)
  const buildBtn = page.getByText('Build Supertiles');
  await buildBtn.click();
  await buildBtn.click();
  await buildBtn.click();
  await buildBtn.click();

  // Max out sliders for Pi and Theta
  await page.evaluate(() => {
    const labels = ['Pi', 'Theta'];
    for (const label of labels) {
      const slider = document.getElementById(`slider-${label}`) as HTMLInputElement;
      if (slider) {
        slider.value = slider.max;
        slider.dispatchEvent(new Event('input'));
      }
    }
    (window as any).p.loop();
  });

  await page.waitForTimeout(1000); // Wait for analysis

  // Check stats
  const stats = await page.evaluate(() => {
    const s = (window as any).state.circuitStats;
    let totalLineCount = 0;
    for (const count of s.lines.values()) {
      totalLineCount += count;
    }
    return { totalLineCount };
  });

  console.log('Line Stats:', stats);

  // Expect exactly one line in total
  expect(stats.totalLineCount).toBe(1);
});