import { expect, test } from '@playwright/test';

/**
 * Zooming out past the leaf cut swaps individual tiles for supertile glyphs.
 * Those glyphs are tile BACKGROUNDS, so the display switch has to govern them
 * too: with backgrounds off, a zoom-out used to replace a clean line drawing
 * with a carpet of coloured blobs. `lv=` is a zoom preset in infinite mode, so
 * these deep levels land on an aggregate cut without any wheel scrubbing.
 *
 * `fl=` is the display-flag bitmask: 23 is the default (backgrounds, outlines,
 * lines, rainbow tails); 22 is the same with backgrounds cleared.
 */
const RULE = 'e=2578&c=0100101100';
// `fc=0` keeps find-all out of it: it is on by default now, and circuits held
// from a closer view are ink of their own, which would muddy "nothing drew".
const aggregate = (flags: number): string =>
  `#/explorer?v=1&md=infinite&${RULE}&lv=7&fl=${flags}&fc=0`;

async function settleHud(page: import('@playwright/test').Page, hash: string): Promise<void> {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto(hash);
  await expect(page.getByTestId('inf-instances')).not.toHaveText('0 instances', {
    timeout: 30000,
  });
  // The HUD throttles to ~4 updates/s; give it a couple of those.
  await page.waitForTimeout(1500);
}

test('supertile glyphs are drawn while backgrounds are on', async ({ page }) => {
  await settleHud(page, aggregate(23));
  await expect(page.getByTestId('inf-lod')).toContainText('glyphs');
  await expect(page.getByTestId('inf-lod')).not.toContainText('hidden');
  // Something was actually painted.
  await expect(page.getByTestId('inf-draw')).not.toContainText('· 0 calls');
});

test('backgrounds off hides the supertile glyphs, and the HUD says why', async ({ page }) => {
  await settleHud(page, aggregate(22));
  await expect(page.getByTestId('inf-lod')).toContainText('hidden (backgrounds off)');
  await expect(page.getByTestId('inf-draw')).toContainText('· 0 calls');
});

test('backgrounds off still draws the strand lines at a leaf cut', async ({ page }) => {
  // The fix must not silence the level of detail the switch exists to expose.
  await settleHud(page, `#/explorer?v=1&md=infinite&${RULE}&lv=2&fl=22`);
  await expect(page.getByTestId('inf-lod')).toContainText('individual tiles');
  await expect(page.getByTestId('inf-lines')).toContainText('chords');
  await expect(page.getByTestId('inf-draw')).not.toContainText('· 0 calls');
});
