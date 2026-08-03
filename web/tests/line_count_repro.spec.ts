import { test, expect } from '@playwright/test';

test('repro line count bug: only 1 continuous line should exist for Psi supertile', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('legacy.html');
  await page.waitForFunction(() => (window as any).p !== undefined);

  // Select 'Psi' tile
  const tileSelect = page.locator('select').nth(1);
  await tileSelect.selectOption('Psi');

  // Select Joiner Edges 1, 2, 7 (Mystic), 8 via dropdown
  // The dropdown contains valid combinations. "1, 2, 7(M), 8" should be one of them.
  // There are multiple selects on the page. 
  // 1. Shapes, 2. Category (Tile), 3. Colours, 4. Joiner Edges
  const joinerSelect = page.locator('select').nth(3);
  
  // We select by label. The label format is comma separated, with 7(M) for 7.
  // Edges 1, 2, 7, 8 -> "1, 2, 7(M), 8"
  await joinerSelect.selectOption({ label: '1, 2, 7(M), 8' });
  
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

  
  // Build Supertiles (4 iterations)
  const buildBtn = page.getByText('Build Supertiles');
  for (let i = 0; i < 5; i++) {
    buildBtn.click();
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
  }
});