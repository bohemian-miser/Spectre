// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CircuitShapes, distinctCircuits } from '../../shapes/circuitShapes';
import { bornLevel, circuitRefOf, readPending, writePending } from '../fromTrace';
import { formatRef } from '../refs';

const RULE = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';

describe('naming a traced circuit for Compare', () => {
  it('finds the level each of 023468·140000001’s distinct circuits is born at', () => {
    const cs = new CircuitShapes('hex', RULE, [...COMBO].map((c) => parseInt(c, 36)), 7, 1, true);
    const distinct = distinctCircuits(cs, 64);
    expect(distinct.length).toBeGreaterThan(3);
    for (const d of distinct) {
      const lowest = Math.min(...distinct.filter((o) => o.length === d.length).map((o) => o.level));
      expect(bornLevel(RULE, COMBO, d.length, 7)).toBe(lowest);
    }
    // Compare's own examples.
    expect(formatRef(circuitRefOf(RULE, COMBO, 303)!)).toBe('023468-140000001:4:303');
    expect(formatRef(circuitRefOf(RULE, COMBO, 14679)!)).toBe('023468-140000001:6:14679');
    expect(bornLevel(RULE, COMBO, 304, 7)).toBeNull();
  });

  it('keeps the circuit waiting as A', () => {
    expect(readPending()).toBeNull();
    const a = circuitRefOf(RULE, COMBO, 303)!;
    writePending(a);
    expect(readPending()).toEqual(a);
    writePending(null);
    expect(readPending()).toBeNull();
  });
});
