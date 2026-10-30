import { describe, expect, it } from 'vitest';

import { GAP, MIN_WIDTH, fullHeight, memberWidth, stickyHeight, stuckHeight } from '../stickyRow';

describe('the row of views', () => {
  it('shares the row out among the members, down to the minimum, and scrolls past it', () => {
    const row = 1276;
    expect(memberWidth(row, 2)).toEqual({ width: Math.floor((row - GAP) / 2), scrolls: false });
    expect(memberWidth(row, 4)).toEqual({ width: Math.floor((row - 3 * GAP) / 4), scrolls: false });
    expect(memberWidth(row, 4).width).toBeGreaterThan(MIN_WIDTH);
    expect(memberWidth(row, 8)).toEqual({ width: MIN_WIDTH, scrolls: true });
    expect(memberWidth(358, 2)).toEqual({ width: MIN_WIDTH, scrolls: true });
    for (const n of [1, 2, 3, 4, 5, 8]) {
      const { width, scrolls } = memberWidth(row, n);
      expect(width * n + GAP * (n - 1) <= row).toBe(!scrolls);
    }
  });

  it('keeps full height until the row reaches the top, then shrinks with the scroll to the stuck height', () => {
    const vh = 1000;
    const full = fullHeight(vh), min = stuckHeight(vh, 50);
    expect(min).toBeLessThan(full);
    expect(stickyHeight(-300, full, min)).toBe(full);
    expect(stickyHeight(0, full, min)).toBe(full);
    expect(stickyHeight(1, full, min)).toBe(full - 1);
    expect(stickyHeight(full - min, full, min)).toBe(min);
    expect(stickyHeight(5000, full, min)).toBe(min);
    // never grows while scrolling down
    let last = Infinity;
    for (let past = -50; past < 800; past += 7) {
      const h = stickyHeight(past, full, min);
      expect(h).toBeLessThanOrEqual(last);
      last = h;
    }
    // about 35 to 40 per cent of the screen, captions included
    expect((min + 50) / vh).toBeGreaterThanOrEqual(0.35);
    expect((min + 50) / vh).toBeLessThanOrEqual(0.4);
  });
});
