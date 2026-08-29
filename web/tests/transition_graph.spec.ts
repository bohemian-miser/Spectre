import { expect, test } from '@playwright/test';

/**
 * The ticker names the tiles a chase crosses in order; the transition graph
 * says which type tends to follow which, over the whole chase. Both sit in the
 * bottom-right of the infinite views and both are switchable.
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
}

test('graphs which tile type follows which, with direction', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1`);

  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });

  // Every ordered pair is drawn, self-transitions included.
  await expect(graph.locator('.tg-edge')).toHaveCount(100);
  const names = await graph.locator('.tg-node text').allTextContents();
  expect(names).toEqual([
    'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Gamma2', 'Gamma1',
  ]);

  // The chase actually fed it counts.
  await expect
    .poll(async () =>
      graph.locator('.tg-edge').evaluateAll((gs) =>
        gs.filter((g) => Number((g as HTMLElement).dataset.count) > 0).length,
      ),
    )
    .toBeGreaterThan(2);

  // Direction is recorded separately: some pair must be lopsided, or the two
  // bows and arrowheads would be decoration.
  const lopsided = await graph.locator('.tg-edge').evaluateAll((gs) => {
    const m = new Map(
      gs.map((g) => {
        const d = (g as HTMLElement).dataset;
        return [`${d.from}>${d.to}`, Number(d.count)];
      }),
    );
    for (const [k, v] of m) {
      const [a, b] = k.split('>');
      if (a !== b && v > 0 && v !== (m.get(`${b}>${a}`) ?? 0)) return true;
    }
    return false;
  });
  expect(lopsided).toBe(true);

  expect(errors).toEqual([]);
});

test('hovering an edge reads out that direction, and only that one', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1`);
  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () =>
      graph.locator('.tg-edge').evaluateAll((gs) =>
        gs.filter((g) => Number((g as HTMLElement).dataset.count) > 0).length,
      ),
    )
    .toBeGreaterThan(0);

  // Aim at the busiest edge's own curve. Hover is resolved by nearest curve,
  // so this is the real interaction, not a synthesised event.
  const target = await graph.locator('.tg-edge').evaluateAll((gs) =>
    gs
      .map((g) => {
        const d = (g as HTMLElement).dataset;
        return {
          from: d.from!,
          to: d.to!,
          count: Number(d.count),
          d: g.querySelector('.tg-line')!.getAttribute('d')!,
        };
      })
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)[0],
  );
  const n = target.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const [sx, sy, cx, cy, ex, ey] = n;
  const svg = (await graph.locator('svg').boundingBox())!;
  const k = svg.width / 240; // the viewBox is 240 wide
  await page.mouse.move(svg.x + ((sx + 2 * cx + ex) / 4) * k, svg.y + ((sy + 2 * cy + ey) / 4) * k);

  await expect(page.getByTestId('transition-readout')).toHaveText(
    `${target.from} → ${target.to}: ${target.count}`,
    { timeout: 5000 },
  );
});

test('both panels are switchable, and say so in the link', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1`);
  await expect(page.getByTestId('transition-graph')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('trace-ticker')).toBeVisible();

  await page.getByTestId('show-transitions').uncheck();
  await expect(page.getByTestId('transition-graph')).toHaveCount(0);
  await page.getByTestId('show-ticker').uncheck();
  await expect(page.getByTestId('trace-ticker')).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('tk=0');
  expect(await page.evaluate(() => window.location.hash)).not.toContain('tg=1');
});

test('the map page carries the same pair', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`map.html#/map?seed=1&z=36&ln=1&${RULE}&tg=1`);
  await expect(page.getByTestId('map-hud')).not.toContainText('0 instances', {
    timeout: 30000,
  });
  await expect(page.getByTestId('map-show-transitions')).toBeChecked();
  await expect(page.getByTestId('map-show-ticker')).toBeChecked();
});
