import { describe, expect, it } from 'vitest';

import { circuitLengthRgb } from '../colors';

/**
 * Approximate perceptual distance ("redmean") — good enough to tell "these are
 * the same green" from "these are different colours", which is the only
 * judgement being made here. Runs 0 … ~765.
 */
function perceptualDistance(a: readonly number[], b: readonly number[]): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

describe('circuitLengthRgb', () => {
  it('is deterministic per length', () => {
    expect(circuitLengthRgb(14)).toEqual(circuitLengthRgb(14));
  });

  it('no longer repeats every 9 lengths (the 40°-ramp collision)', () => {
    for (let n = 3; n < 60; n++) {
      expect(circuitLengthRgb(n)).not.toEqual(circuitLengthRgb(n + 9));
    }
  });

  it('gives every length a distinct colour across any practical range', () => {
    const seen = new Map<string, number>();
    for (let n = 1; n <= 2000; n++) {
      const key = circuitLengthRgb(n).join(',');
      const prior = seen.get(key);
      expect(prior, `length ${n} collides with length ${prior}`).toBeUndefined();
      seen.set(key, n);
    }
  });

  /**
   * The regression that mattered: distinct RGB tuples are not enough, because
   * two colours can differ by a couple of levels and still read as the same
   * ink. Under the old hashed hue, length 56 was rgb(130,255,60) and length
   * 672 was rgb(127,255,62) — the same green for circuits 12× apart in size,
   * which is exactly the comparison the colour exists to make.
   */
  it('never paints a long circuit the same as a much shorter one', () => {
    let worst = Number.POSITIVE_INFINITY;
    let worstPair: [number, number] = [0, 0];
    for (let a = 3; a <= 400; a++) {
      for (let b = a * 4; b <= 1600; b++) {
        const d = perceptualDistance(circuitLengthRgb(a), circuitLengthRgb(b));
        if (d < worst) {
          worst = d;
          worstPair = [a, b];
        }
      }
    }
    expect(
      worst,
      `lengths ${worstPair[0]} and ${worstPair[1]} look alike (distance ${worst.toFixed(1)})`,
    ).toBeGreaterThan(80);
  });

  it('ramps hue with length, so colour orders circuits by size', () => {
    // Short is warm, long is cool: red channel falls away as blue comes up.
    const short = circuitLengthRgb(4);
    const mid = circuitLengthRgb(120);
    const long = circuitLengthRgb(3000);
    expect(short[0]).toBeGreaterThan(long[0]);
    expect(long[2]).toBeGreaterThan(short[2]);
    expect(perceptualDistance(short, mid)).toBeGreaterThan(80);
    expect(perceptualDistance(mid, long)).toBeGreaterThan(80);
  });

  it('still separates neighbouring lengths, which share a hue', () => {
    for (let n = 1; n < 800; n++) {
      // Not far apart — they are genuinely similar circuits — but never equal.
      expect(perceptualDistance(circuitLengthRgb(n), circuitLengthRgb(n + 1))).toBeGreaterThan(20);
    }
  });

  it('keeps every colour bright enough to read as ink', () => {
    for (let n = 1; n <= 500; n++) {
      const rgb = circuitLengthRgb(n);
      expect(Math.max(...rgb)).toBeGreaterThanOrEqual(190);
      for (const ch of rgb) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(255);
      }
    }
  });
});
