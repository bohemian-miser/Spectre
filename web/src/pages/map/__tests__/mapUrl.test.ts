/**
 * Hash codec for `#/map?seed=&cx=&cy=&z=&budget=`: round-trips, defaults,
 * clamping, and — the property the page's replaceState suppression rests on —
 * canonical stability (encode∘decode∘encode = encode).
 */
import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE } from '../camera';
import {
  COMBO_LENGTH,
  DEFAULT_MAP_STATE,
  MAP_BUDGETS,
  MAP_ROUTE,
  MAX_BUDGET,
  MIN_BUDGET,
  clampBudget,
  decodeMapQuery,
  encodeMapQuery,
  hashToMapState,
  mapStateToHash,
  normalizeCombo,
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
    expect(junk.budget).toBe(MAX_BUDGET); // 1e99 clamps down
    expect(decodeMapQuery('z=1e12').scale).toBe(MAX_SCALE);
    expect(clampBudget(1)).toBe(MIN_BUDGET);
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

/**
 * Strand-line parameters (stage 3): additive — a state with no line fields
 * encodes byte-identically to the pre-stage-3 codec, and `e`/`c` are the same
 * wire format as the Explorer's own edge-rule / combination-string params.
 */
describe('map url codec — strand lines', () => {
  it('omits the line params entirely while everything is at its default', () => {
    expect(encodeMapQuery(DEFAULT_MAP_STATE)).toBe(
      'seed=1&cx=0&cy=0&z=36&budget=100000',
    );
    const legacy = { seed: 4, cx: 1, cy: 2, scale: 12, budget: 50_000 };
    expect(encodeMapQuery(legacy)).not.toContain('ln=');
    expect(encodeMapQuery(legacy)).not.toContain('&e=');
    expect(encodeMapQuery(legacy)).not.toContain('&c=');
  });

  it('round-trips lines, subset and combo', () => {
    const state = {
      ...DEFAULT_MAP_STATE,
      lines: true,
      subset: [0, 2, 3, 6, 7, 8],
      combo: '1410001000',
    };
    const back = hashToMapState(mapStateToHash(state));
    expect(back.lines).toBe(true);
    expect(back.subset).toEqual([0, 2, 3, 6, 7, 8]);
    expect(back.combo).toBe('1410001000');
    expect(encodeMapQuery(back)).toBe(encodeMapQuery(state));
  });

  it('canonicalizes subsets and pads/trims combos', () => {
    const back = decodeMapQuery('ln=1&e=8752&c=01');
    expect(back.subset).toEqual([2, 5, 7, 8]); // deduped + sorted
    expect(back.combo).toBe('0100000000'); // padded to one digit per leaf
    expect(normalizeCombo('01-234!5678900000')).toBe('0123456789');
    expect(decodeMapQuery('ln=0').lines).toBe(false);
  });

  it('stays canonically stable with lines on', () => {
    const once = encodeMapQuery({ ...DEFAULT_MAP_STATE, lines: true, combo: 'zz' });
    expect(encodeMapQuery(decodeMapQuery(once))).toBe(once);
  });

  it('defaults to the CSV-verified 2578 / 0100101100 rule', () => {
    expect(DEFAULT_MAP_STATE.lines).toBe(false);
    expect(DEFAULT_MAP_STATE.subset).toEqual([2, 5, 7, 8]);
    expect(DEFAULT_MAP_STATE.combo).toBe('0100101100');
    expect(COMBO_LENGTH).toBe(10);
  });
});

describe('map line controls', () => {
  it('omits lw/no at their defaults and round-trips them otherwise', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    expect(encodeMapQuery(base)).not.toContain('lw=');
    expect(encodeMapQuery(base)).not.toContain('no=');

    const q = encodeMapQuery({ ...base, lineWidth: 3.5, noOverlap: true });
    expect(q).toContain('lw=3.5');
    expect(q).toContain('no=1');
    const back = decodeMapQuery(q);
    expect(back.lineWidth).toBe(3.5);
    expect(back.noOverlap).toBe(true);
    expect(encodeMapQuery(back)).toBe(q); // canonical
  });

  it('takes any weight, floors junk, and defaults the flag', () => {
    expect(decodeMapQuery('lw=99').lineWidth).toBe(99); // no ceiling
    expect(decodeMapQuery('lw=abc').lineWidth).toBe(1);
    expect(decodeMapQuery('').noOverlap).toBe(false);
  });
});
