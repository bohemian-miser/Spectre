/**
 * Hash codec for `#/map?seed=&cx=&cy=&z=&budget=`: round-trips, defaults,
 * clamping, and — the property the page's replaceState suppression rests on —
 * canonical stability (encode∘decode∘encode = encode).
 */
import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE } from '../camera';
import {
  DEFAULT_MAP_STATE,
  MAP_BUDGETS,
  MAP_ROUTE,
  clampBudget,
  decodeMapQuery,
  encodeMapQuery,
  hashToMapState,
  mapStateToHash,
  sameMapState,
} from '../mapUrl';

describe('map url codec', () => {
  it('round-trips typical states through the hash', () => {
    for (const state of [
      DEFAULT_MAP_STATE,
      { seed: 42, cx: -1234.567, cy: 890.125, scale: 0.02, budget: 250_000 },
      { seed: 0xc0ffee, cx: 1e9 + 0.5, cy: -2.5e8, scale: 1e-6, budget: 1_000_000 },
      { seed: 7, cx: 0.001, cy: -0.001, scale: 400, budget: 50_000 },
    ]) {
      const hash = mapStateToHash(state);
      expect(hash.startsWith(`${MAP_ROUTE}?`)).toBe(true);
      const back = hashToMapState(hash);
      expect(back.seed).toBe(Math.floor(state.seed) >>> 0);
      expect(back.budget).toBe(state.budget);
      expect(Math.abs(back.cx - state.cx)).toBeLessThanOrEqual(5e-4);
      expect(Math.abs(back.cy - state.cy)).toBeLessThanOrEqual(5e-4);
      expect(Math.abs(back.scale - state.scale) / state.scale).toBeLessThan(1e-4);
    }
  });

  it('is canonically stable: encode(decode(encode(s))) === encode(s)', () => {
    for (const state of [
      { seed: 3, cx: 1 / 3, cy: -12345.678901, scale: 0.123456789, budget: 100_000 },
      { seed: 999, cx: 5e11 + 0.123, cy: 7, scale: 1e-8, budget: 500_000 },
      DEFAULT_MAP_STATE,
    ]) {
      const once = encodeMapQuery(state);
      const twice = encodeMapQuery(decodeMapQuery(once));
      expect(twice).toBe(once);
      expect(sameMapState(decodeMapQuery(once), decodeMapQuery(twice))).toBe(true);
    }
  });

  it('defaults and clamps garbage input', () => {
    expect(hashToMapState('')).toEqual(DEFAULT_MAP_STATE);
    expect(hashToMapState('#/map')).toEqual(DEFAULT_MAP_STATE);
    const junk = decodeMapQuery('seed=banana&cx=NaN&cy=&z=-5&budget=1e99');
    expect(junk.seed).toBe(DEFAULT_MAP_STATE.seed);
    expect(junk.cx).toBe(0);
    expect(junk.cy).toBe(0);
    expect(junk.scale).toBe(MIN_SCALE); // -5 clamps up
    expect(junk.budget).toBe(1_000_000); // 1e99 clamps down
    expect(decodeMapQuery('z=1e12').scale).toBe(MAX_SCALE);
    expect(clampBudget(1)).toBe(10_000);
    expect(clampBudget(Number.NaN)).toBe(DEFAULT_MAP_STATE.budget);
  });

  it('negative seeds wrap to uint32 (same as the engine)', () => {
    expect(decodeMapQuery('seed=-1').seed).toBe(4294967295);
  });

  it('accepts hashes with or without the route prefix', () => {
    const q = encodeMapQuery({ ...DEFAULT_MAP_STATE, seed: 5 });
    expect(hashToMapState(`#/map?${q}`).seed).toBe(5);
    expect(hashToMapState(`?${q}`).seed).toBe(5);
    expect(hashToMapState(q).seed).toBe(5);
  });

  it('offers the documented budget presets, all within the clamp range', () => {
    expect(MAP_BUDGETS).toContain(100_000);
    expect(MAP_BUDGETS).toContain(1_000_000);
    for (const b of MAP_BUDGETS) expect(clampBudget(b)).toBe(b);
  });
});
