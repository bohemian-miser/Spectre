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

test('expands to four times the area, and back', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1`);
  const panel = page.getByTestId('transition-graph');
  await expect(panel).toBeVisible({ timeout: 30000 });
  const small = (await panel.boundingBox())!.width;

  await page.getByTestId('transition-expand').click();
  await expect(panel).toHaveAttribute('data-expanded', '1');
  const big = (await panel.boundingBox())!.width;
  // Two times across each way is four times the area.
  expect(big).toBeGreaterThan(small * 1.8);

  await page.getByTestId('transition-expand').click();
  await expect(panel).toHaveAttribute('data-expanded', '0');
  expect((await panel.boundingBox())!.width).toBeCloseTo(small, 0);
});

/**
 * The panel lives inside the map viewport, which takes a pointerdown to pan or
 * to trace and captures the pointer for it. Clicking a control here must reach
 * the control — and must not disturb the strand underneath.
 */
test('its controls take clicks without disturbing the tiling', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1`);
  await expect(page.getByTestId('transition-graph')).toBeVisible({ timeout: 30000 });
  const length = async (): Promise<number> => {
    const t = (await page.getByTestId('inf-trace').textContent()) ?? '';
    return Number(/traced: ([\d,]+) edges/.exec(t)?.[1]?.replace(/,/g, '') ?? -1);
  };
  const before = await length();
  expect(before).toBeGreaterThan(0);

  await page.getByTestId('highlight-on-screen').check();
  await expect(page.getByTestId('highlight-on-screen')).toBeChecked();
  await page.getByTestId('highlight-in-path').check();
  await expect(page.getByTestId('highlight-in-path')).toBeChecked();

  // The chase is still running, so the strand may be LONGER — but a click that
  // fell through to the viewport would have started a new trace, which resets
  // the length to a handful of edges.
  expect(await length()).toBeGreaterThanOrEqual(before);
  await expect(page.getByTestId('inf-trace')).not.toContainText('tap a strand');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('hs=1');
  expect(await page.evaluate(() => window.location.hash)).toContain('ht=1');
});

test('hovering an edge lights that transition on the tiling', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1&hs=1`);
  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });
  const calls = async (): Promise<number> => {
    const t = (await page.getByTestId('inf-draw').textContent()) ?? '';
    return Number(/(\d+) calls/.exec(t)?.[1] ?? -1);
  };
  await expect.poll(calls).toBeGreaterThan(0);

  await expect
    .poll(async () =>
      graph.locator('.tg-edge').evaluateAll((gs) =>
        gs.filter((g) => Number((g as HTMLElement).dataset.count) > 0).length,
      ),
    )
    .toBeGreaterThan(0);
  const before = await calls();

  const target = await graph.locator('.tg-edge').evaluateAll((gs) =>
    gs
      .map((g) => {
        const d = (g as HTMLElement).dataset;
        return {
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
  const k = svg.width / 240;
  await page.mouse.move(svg.x + ((sx + 2 * cx + ex) / 4) * k, svg.y + ((sy + 2 * cy + ey) / 4) * k);

  // Every crossing of that pair in the cut becomes its own bit of ink.
  await expect.poll(calls).toBeGreaterThan(before);
});

/**
 * Hovering finds a transition; holding on to it is how you then go and look at
 * the tiling. A pick has to outlive the pointer, and let go on request.
 */
test('a click pins what it picked, and the background lets go', async ({ page }) => {
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
  const at = { x: svg.x + ((sx + 2 * cx + ex) / 4) * k, y: svg.y + ((sy + 2 * cy + ey) / 4) * k };

  await page.mouse.move(at.x, at.y);
  await page.mouse.click(at.x, at.y);
  // Away from the panel entirely: the pick must survive losing the pointer.
  await page.mouse.move(svg.x - 300, svg.y - 200);
  await expect(page.getByTestId('transition-picked')).toContainText(
    `${target.from} → ${target.to}`,
  );
  // An explicit pick shows itself rather than waiting to be switched on.
  await expect(page.getByTestId('highlight-in-path')).toBeChecked();

  // A corner: the ring and its names live within about 60 units of the middle,
  // so this is the one part of the panel that is genuinely background. (The
  // middle is not — long edges bow straight across it.)
  await page.mouse.move(svg.x + 8 * k, svg.y + 8 * k);
  await page.mouse.click(svg.x + 8 * k, svg.y + 8 * k);
  await expect(page.getByTestId('transition-picked')).toHaveCount(0);
});

test('clicking a name picks the whole tile type, and lights it on screen', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1&hs=1`);
  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });
  const calls = async (): Promise<number> => {
    const t = (await page.getByTestId('inf-draw').textContent()) ?? '';
    return Number(/(\d+) calls/.exec(t)?.[1] ?? -1);
  };
  await expect.poll(calls).toBeGreaterThan(0);
  const before = await calls();

  // The name is a word, not a point: aim at the middle of it.
  const label = (await graph.locator('.tg-node text', { hasText: 'Phi' }).first().boundingBox())!;
  const at = { x: label.x + label.width / 2, y: label.y + label.height / 2 };
  await page.mouse.move(at.x, at.y);
  await page.mouse.click(at.x, at.y);
  await expect(page.getByTestId('transition-picked')).toContainText('Phi');
  // Every chord of that type in the cut becomes its own bit of ink.
  await expect.poll(calls).toBeGreaterThan(before);
});

/**
 * The ranked mode answers "how often does this five-tile section come round?",
 * which the circle cannot: it only draws pairs.
 */
test('ranks runs of any length, and draws the one picked', async ({ page }) => {
  // `fw=0`: auto-follow is on by default, and a chase that never stops keeps
  // re-ranking the list underneath the buttons this test clicks.
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&tg=1&fw=0`);
  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });
  const calls = async (): Promise<number> => {
    const t = (await page.getByTestId('inf-draw').textContent()) ?? '';
    return Number(/(\d+) calls/.exec(t)?.[1] ?? -1);
  };

  await page.getByTestId('transition-mode').click();
  await expect(graph).toHaveAttribute('data-mode', 'ranked');
  // Full height, so a long ranking is worth scrolling.
  const panel = (await graph.boundingBox())!;
  expect(panel.height).toBeGreaterThan(page.viewportSize()!.height * 0.6);

  // Pairs to begin with, and they agree with the circle's own counts.
  const rows = page.locator('[data-testid=chain-rows] li');
  await expect.poll(async () => rows.count()).toBeGreaterThan(0);
  const counts = await rows.evaluateAll((ls) => ls.map((l) => Number((l as HTMLElement).dataset.count)));
  expect([...counts].sort((a, b) => b - a)).toEqual(counts);

  await page.getByTestId('chain-order').click();
  const rare = await rows.evaluateAll((ls) => ls.map((l) => Number((l as HTMLElement).dataset.count)));
  expect(rare[0]).toBeLessThanOrEqual(rare.at(-1)!);
  await page.getByTestId('chain-order').click();

  await page.getByTestId('chain-length-5').click();
  await expect(page.getByTestId('chain-distinct')).not.toHaveText('counting…', { timeout: 10000 });
  await expect.poll(async () => rows.count()).toBeGreaterThan(0);
  const before = await calls();

  const first = rows.first();
  const want = Number(await first.getAttribute('data-count'));
  await first.click();
  const pinned = page.getByTestId('transition-picked');
  await expect(pinned).toBeVisible();
  // Five tiles, named in full — the whole sequence, not just its count.
  expect(((await pinned.textContent()) ?? '').split(/\s+/).length).toBeGreaterThanOrEqual(5);
  expect(want).toBeGreaterThan(0);
  // And drawn: each place the path spelled it out is its own run of ink.
  await expect.poll(calls).toBeGreaterThan(before);
});

/**
 * The bug this whole pass exists for: the marks used to be computed once and
 * then left behind by the very walk they describe.
 */
test('keeps the path marks up with a chase that is still running', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fw=1&fp=12&tg=1&ht=1`);
  await expect(page.getByTestId('transition-graph')).toBeVisible({ timeout: 30000 });
  const calls = async (): Promise<number> => {
    const t = (await page.getByTestId('inf-draw').textContent()) ?? '';
    return Number(/(\d+) calls/.exec(t)?.[1] ?? -1);
  };

  await page.getByTestId('transition-mode').click();
  await page.getByTestId('chain-length-1').click();
  const rows = page.locator('[data-testid=chain-rows] li');
  await expect.poll(async () => rows.count()).toBeGreaterThan(0);
  await rows.first().click();
  await expect(page.getByTestId('transition-picked')).toBeVisible();

  const before = await calls();
  expect(before).toBeGreaterThan(0);
  // The chase is walking; every new tile of that type is another mark.
  await expect.poll(calls, { timeout: 20000 }).toBeGreaterThan(before);
});

/**
 * Only a handful of the hundred drawn pairs have a count on a short chase.
 * The other ninety-odd are still real transitions the TILING makes, so they
 * have to answer the pointer and light up — that they did not is what made
 * the panel look broken.
 */
test('a pair the chase never made is still pickable, and still on the tiling', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1&hs=1`);
  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });
  const calls = async (): Promise<number> => {
    const t = (await page.getByTestId('inf-draw').textContent()) ?? '';
    return Number(/(\d+) calls/.exec(t)?.[1] ?? -1);
  };
  await expect.poll(calls).toBeGreaterThan(0);

  const edges = await graph.locator('.tg-edge').evaluateAll((gs) =>
    gs.map((g) => {
      const d = (g as HTMLElement).dataset;
      return {
        from: d.from!,
        to: d.to!,
        count: Number(d.count),
        d: g.querySelector('.tg-line')!.getAttribute('d')!,
      };
    }),
  );
  // The premise: most pairs are uncounted. If that stops being true the test
  // still holds, but it is no longer testing the interesting case.
  expect(edges.filter((e) => e.count === 0).length).toBeGreaterThan(edges.length / 2);

  const svg = (await graph.locator('svg').boundingBox())!;
  const k = svg.width / 240;
  const aim = (e: (typeof edges)[number]) => {
    const [sx, sy, cx, cy, ex, ey] = e.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    return { x: svg.x + ((sx + 2 * cx + ex) / 4) * k, y: svg.y + ((sy + 2 * cy + ey) / 4) * k };
  };

  // Sweep the uncounted pairs. Two things have to hold: the pointer answers
  // for a good number of them, and at least one of those puts ink on the
  // tiling — a transition the chase never made but the tiling makes anyway,
  // which is the whole reason "on screen" is a separate question.
  const before = await calls();
  let answered = 0;
  let lit: string | null = null;
  // A sample rather than all ninety-odd: enough to show the rate is nothing
  // like the "none of them" it was, without a hundred pointer moves.
  const sample = edges.filter((x) => x.count === 0 && x.from !== x.to).slice(0, 40);
  for (const e of sample) {
    const at = aim(e);
    await page.mouse.move(at.x, at.y);
    const text = await page
      .getByTestId('transition-readout')
      .textContent({ timeout: 2000 })
      .catch(() => null);
    if (text !== `${e.from} → ${e.to}: 0`) continue; // a nearer curve took it
    answered++;
    const marks = (await page.getByTestId('transition-marks').textContent()) ?? '';
    // Either it is on the tiling, and says how much, or it is not and says so.
    expect(marks).toMatch(/(\d+|none) on screen/);
    if (!lit && /[1-9]\d* on screen/.test(marks)) {
      lit = `${e.from} → ${e.to}`;
      await page.mouse.click(at.x, at.y);
      await expect(page.getByTestId('transition-picked')).toContainText(lit);
      await expect.poll(calls).toBeGreaterThan(before);
      await page.getByTestId('transition-unpin').click();
    }
  }
  // Before this, only the pairs the chase happened to make answered at all —
  // eight of a hundred, and none of these ninety-odd.
  expect(answered).toBeGreaterThan(12);
  expect(lit).not.toBeNull();
});

test('says how much it drew, including when that is nothing', async ({ page }) => {
  await chase(page, `#/explorer?v=1&md=infinite&${RULE}&fp=8&tg=1&hs=1&ht=1`);
  const graph = page.getByTestId('transition-graph');
  await expect(graph).toBeVisible({ timeout: 30000 });

  // Every type is on screen somewhere, so a name always draws something.
  const label = (await graph.locator('.tg-node text', { hasText: 'Phi' }).first().boundingBox())!;
  await page.mouse.move(label.x + label.width / 2, label.y + label.height / 2);
  await page.mouse.click(label.x + label.width / 2, label.y + label.height / 2);
  await expect(page.getByTestId('transition-marks')).toContainText(/\d+ on screen/, {
    timeout: 10000,
  });
  // A short chase crosses a handful of types, so "none in path" is a fact the
  // panel has to be able to state.
  const text = (await page.getByTestId('transition-marks').textContent()) ?? '';
  expect(text).toMatch(/(none|\d+) in path/);
});
