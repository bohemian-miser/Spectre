// @vitest-environment jsdom
/**
 * Members drawn over their supertiles at levels of millions of visits: in
 * full with a note past `DRAW_WARN`, through every 1,000th visit past
 * `SAMPLE_ABOVE`, as the engine draws them for 023468 / 140000001's
 * 1,083,894 and 36,701,253, both born at level 10.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChainCanvas } from '../ChainViews';
import { HarmonicsEngine } from '../harmonicsJob';
import { DRAW_WARN, SAMPLE_ABOVE } from '../levelWalk';

describe('a member of millions of visits over its supertiles', () => {
  afterEach(cleanup);

  it('says when it draws every 1,000th visit, and when drawing every visit may be slow', async () => {
    const engine = new HarmonicsEngine({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 10 });
    const r = engine.result();
    const members = [r.circuits.findIndex((c) => c.length === 1083894), r.circuits.findIndex((c) => c.length === 36701253)];
    const client = {
      picture: (m: readonly number[], k: number) => Promise.resolve(engine.picture(m, k)),
      rows: () => new Promise<never>(() => undefined),
      detail: () => new Promise<never>(() => undefined),
    };
    const canvas = (k: number) => (
      <ChainCanvas client={client} level={10} members={members} circuits={r.circuits} k={k} hi={2} setK={() => undefined} lit={[]} onHover={() => undefined} onPicture={() => undefined} fold="fixpoint" brief />
    );
    const { rerender } = render(canvas(0));
    await waitFor(() => expect(screen.getAllByTestId('harm-side')).toHaveLength(2), { timeout: 60000 });
    let sides = screen.getAllByTestId('harm-side');
    expect(36701253).toBeGreaterThan(SAMPLE_ABOVE);
    expect(sides[0].textContent).toMatch(/^1,083,894 L10 at level 0: 1,083,894 visits through/);
    expect(sides[1].textContent).toMatch(/36,701,253 L10 at level 0: every 1,000th of 37M visits, through [\d,]+ supertiles \(the first 600 drawn\)/);
    expect(screen.queryByTestId('harm-draw-warn')).toBeNull();
    rerender(canvas(1));
    await waitFor(() => expect(screen.getAllByTestId('harm-side')[1].textContent).toMatch(/at level 1/), { timeout: 60000 });
    sides = screen.getAllByTestId('harm-side');
    expect(sides[1].textContent).toMatch(/36,701,253 L10 at level 1: 10,420,571 visits through/);
    expect(10420571).toBeGreaterThan(DRAW_WARN);
    expect(screen.getByTestId('harm-draw-warn').textContent).toBe('10M visits at level 1: drawing may be slow');
    expect(sides[1].contains(screen.getByTestId('harm-draw-warn'))).toBe(true);
  }, 120000);
});
