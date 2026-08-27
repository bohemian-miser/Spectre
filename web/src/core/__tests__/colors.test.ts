import { describe, expect, it } from 'vitest';

import { circuitLengthRgb } from '../colors';

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
