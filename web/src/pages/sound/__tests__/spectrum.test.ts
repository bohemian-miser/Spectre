import { describe, expect, it } from 'vitest';
import type { Pt } from '../../../core';
import { circuitBars, partialEvents, scaled } from '../spectrum';

const circle = (n: number, dir = 1): Pt[] => Array.from({ length: n }, (_, j) => ({ x: Math.cos((dir * 2 * Math.PI * j) / n), y: Math.sin((dir * 2 * Math.PI * j) / n) }));

/** A triangle walked round its sides, `per` points a side. */
function triangle(per: number): Pt[] {
  const c = [0, 1, 2].map((k) => ({ x: Math.cos((2 * Math.PI * k) / 3), y: Math.sin((2 * Math.PI * k) / 3) }));
  const out: Pt[] = [];
  c.forEach((a, i) => {
    const b = c[(i + 1) % 3];
    for (let s = 0; s < per; s++) out.push({ x: a.x + ((b.x - a.x) * s) / per, y: a.y + ((b.y - a.y) * s) / per });
  });
  return out;
}

describe('spectrum', () => {
  it('puts a circle on k = +1 alone, whichever way it is walked', () => {
    for (const dir of [1, -1]) {
      const bars = circuitBars(circle(24, dir), 5);
      expect(bars.map((b) => b.k)).toEqual([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      const one = bars.find((b) => b.k === 1)!;
      expect(one.amp).toBeGreaterThan(0.99);
      for (const b of bars) if (b.k !== 1) expect(b.amp).toBeLessThan(1e-9);
    }
  });

  it('gives a triangle only the terms k = 1 mod 3', () => {
    const bars = circuitBars(triangle(10), 8);
    for (const b of bars) {
      if (((b.k - 1) % 3 + 3) % 3 === 0) expect(b.amp).toBeGreaterThan(1e-6);
      else expect(b.amp).toBeLessThan(1e-9);
    }
  });

  it('scales linearly, in dB, or with the fundamental brought down', () => {
    const bars = [
      { k: -2, amp: 0.1 },
      { k: 1, amp: 1 },
      { k: 4, amp: 0.001 },
    ];
    expect(scaled(bars, 'linear')).toEqual([0.1, 1, 0.001]);
    const db = scaled(bars, 'dB');
    expect(db[1]).toBe(1);
    expect(db[0]).toBeCloseTo(1 - 20 / 60, 9);
    expect(db[2]).toBeCloseTo(0, 9);
    expect(scaled(bars, 'fundamental scaled down')).toEqual([1, 1, 0.01]);
  });

  it('plays term k at |k| × f0, panned by its sign', () => {
    const bars = [
      { k: -2, amp: 0.5 },
      { k: 3, amp: 1 },
    ];
    const ev = partialEvents(bars, [0.5, 1], 100, 2);
    const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
    expect(hz(ev[0].midi)).toBeCloseTo(200, 6);
    expect(hz(ev[1].midi)).toBeCloseTo(300, 6);
    expect(ev[0].pan).toBeLessThan(0);
    expect(ev[1].pan).toBeGreaterThan(0);
    expect(ev[1].gain / ev[0].gain).toBeCloseTo(2, 9);
  });
});
