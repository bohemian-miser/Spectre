/**
 * Hash codec for `#/map?seed=&cx=&cy=&z=&budget=`: round-trips, defaults,
 * clamping, and — the property the page's replaceState suppression rests on —
 * canonical stability (encode∘decode∘encode = encode).
 */
import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE } from '../camera';
import {
  DEFAULT_FIND_CEILING,
  MIN_FIND_CEILING,
} from '../../../core';
import {
  COMBO_LENGTH,
  DEFAULT_MAP_STATE,
  MAP_BUDGETS,
  MAP_ROUTE,
  MAX_BUDGET,
  MIN_BUDGET,
  clampBudget,
  comboLength,
  decodeMapQuery,
  defaultCombo,
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
  it('omits lw at its default and round-trips it otherwise', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    expect(encodeMapQuery(base)).not.toContain('lw=');

    const q = encodeMapQuery({ ...base, lineWidth: 3.5 });
    expect(q).toContain('lw=3.5');
    const back = decodeMapQuery(q);
    expect(back.lineWidth).toBe(3.5);
    expect(encodeMapQuery(back)).toBe(q); // canonical
  });

  it('takes any weight and floors junk', () => {
    expect(decodeMapQuery('lw=99').lineWidth).toBe(99); // no ceiling
    expect(decodeMapQuery('lw=abc').lineWidth).toBe(1);
  });

  it('writes `tr=` only to switch tap-to-trace OFF', () => {
    // Default ON, so a link that says nothing about it still traces — and
    // links written before the feature existed encode byte-identically.
    expect(DEFAULT_MAP_STATE.trace).toBe(true);
    expect(decodeMapQuery('').trace).toBe(true);
    expect(encodeMapQuery({ ...DEFAULT_MAP_STATE, lines: true })).not.toContain('tr=');

    const off = encodeMapQuery({ ...DEFAULT_MAP_STATE, lines: true, trace: false });
    expect(off).toContain('tr=0');
    const back = decodeMapQuery(off);
    expect(back.trace).toBe(false);
    expect(encodeMapQuery(back)).toBe(off); // canonical
    expect(decodeMapQuery('tr=1').trace).toBe(true);
  });
});

describe('follow / hold / keep-circuits params', () => {
  it('encodes fw/hp/kc additively and round-trips canonically', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    const plain = encodeMapQuery(base);
    expect(plain).not.toContain('fw=');
    expect(plain).not.toContain('hp=');
    expect(plain).not.toContain('kc=');

    const q = encodeMapQuery({ ...base, follow: false, hold: 1234, keepCircuits: false });
    expect(q).toContain('fw=0');
    expect(q).toContain('hp=1234');
    expect(q).toContain('kc=0');
    const back = decodeMapQuery(q);
    expect(back.follow).toBe(false);
    expect(back.hold).toBe(1234);
    expect(back.keepCircuits).toBe(false);
    expect(encodeMapQuery(back)).toBe(q); // canonical
  });

  it('defaults: follow on, the whole trail held, keep-circuits on', () => {
    const d = decodeMapQuery('');
    expect(d.follow).toBe(true);
    expect(d.hold).toBe(DEFAULT_MAP_STATE.hold);
    expect(d.hold).toBe(0); // 0 = keep all of it
    expect(d.keepCircuits).toBe(true);
    // Junk clamps rather than breaking the link.
    expect(decodeMapQuery('hp=abc').hold).toBe(DEFAULT_MAP_STATE.hold);
    expect(decodeMapQuery('hp=1').hold).toBeGreaterThan(1);
  });
});

describe('pace / trace-seed params (map codec)', () => {
  it('encodes fp/ts additively and round-trips canonically', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    const plain = encodeMapQuery(base);
    expect(plain).not.toContain('fp=');
    expect(plain).not.toContain('ts=');

    const q = encodeMapQuery({
      ...base,
      pace: 24,
      traceSeed: [12.125, -7.5, 13.008, -8.25] as const,
    });
    expect(q).toContain('fp=24');
    expect(q).toContain('ts=');
    const back = decodeMapQuery(q);
    expect(back.pace).toBe(24);
    expect(back.traceSeed).toEqual([12.125, -7.5, 13.008, -8.25]);
    expect(encodeMapQuery(back)).toBe(q); // canonical
  });

  it('defaults: full speed, no seed; junk drops cleanly', () => {
    const d = decodeMapQuery('');
    expect(d.pace).toBeNull();
    expect(d.traceSeed).toBeNull();
    expect(decodeMapQuery('ts=1,2,nope').traceSeed).toBeNull();
  });
});

describe('kt / fc params (map codec)', () => {
  it('round-trips keep-tails-off and find-all-off', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    expect(encodeMapQuery(base)).not.toContain('kt=');
    expect(encodeMapQuery(base)).not.toContain('fc=');
    const q = encodeMapQuery({
      ...base,
      keepTails: false,
      findCircuits: false,
      persistFound: false,
    });
    expect(q).toContain('kt=0');
    expect(q).toContain('fc=0');
    const back = decodeMapQuery(q);
    expect(back.keepTails).toBe(false);
    expect(back.findCircuits).toBe(false);
    expect(back.persistFound).toBe(false);
    expect(q).toContain('pf=0');
    expect(encodeMapQuery({ ...base, persistFound: true })).not.toContain('pf=');
    expect(encodeMapQuery(back)).toBe(q);
  });
});

describe('tk / tg / fx params (map codec)', () => {
  it('says nothing while the ticker is on and the graph is off', () => {
    const q = encodeMapQuery({ ...DEFAULT_MAP_STATE, lines: true });
    expect(q).not.toContain('tk=');
    expect(q).not.toContain('tg=');
    expect(q).not.toContain('fx=');
  });

  it('round-trips a hidden ticker and a shown graph', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    const q = encodeMapQuery({ ...base, showTicker: false, showTransitions: true });
    expect(q).toContain('tk=0');
    expect(q).toContain('tg=1');
    const back = decodeMapQuery(q);
    expect(back.showTicker).toBe(false);
    expect(back.showTransitions).toBe(true);
    expect(encodeMapQuery(back)).toBe(q);
  });

  it('round-trips a non-default find ceiling, and clamps a silly one', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    const q = encodeMapQuery({ ...base, findCeiling: 120_000 });
    expect(q).toContain('fx=120000');
    expect(decodeMapQuery(q).findCeiling).toBe(120_000);
    expect(encodeMapQuery(decodeMapQuery(q))).toBe(q);
    // Out of range and nonsense both fall back inside the allowed span.
    // No ceiling by design — see MIN_FIND_CEILING's note.
    expect(decodeMapQuery('fx=99999999').findCeiling).toBe(99_999_999);
    expect(decodeMapQuery('fx=1').findCeiling).toBe(MIN_FIND_CEILING);
    expect(decodeMapQuery('fx=banana').findCeiling).toBe(DEFAULT_FIND_CEILING);
  });

  it('round-trips the found-circuit hold, with 0 meaning no limit', () => {
    const base = { ...DEFAULT_MAP_STATE, lines: true };
    const q = encodeMapQuery({ ...base, foundHold: 2500 });
    expect(q).toContain('fh=2500');
    expect(decodeMapQuery(q).foundHold).toBe(2500);
    expect(encodeMapQuery(decodeMapQuery(q))).toBe(q);
    expect(encodeMapQuery({ ...base, foundHold: 0 })).not.toContain('fh=');
  });

  it('a link written before these existed still decodes to the old picture', () => {
    const back = decodeMapQuery('seed=1&z=36&ln=1&fc=1');
    expect(back.foundHold).toBe(0);
    expect(back.showTicker).toBe(true);
    expect(back.showTransitions).toBe(false);
    expect(back.findCeiling).toBe(DEFAULT_FIND_CEILING);
  });
});

/**
 * Tile family (`f=`) — additive exactly like the Explorer codec's: absent
 * means spectre, so every link from before families keeps meaning what it
 * meant, byte for byte.
 */
describe('tile family in the URL (map codec)', () => {
  it('never writes f= for spectre — the golden default stays byte-identical', () => {
    expect(encodeMapQuery(DEFAULT_MAP_STATE)).toBe('seed=1&cx=0&cy=0&z=36&budget=100000');
    expect(encodeMapQuery({ ...DEFAULT_MAP_STATE, family: 'spectre' })).toBe(
      'seed=1&cx=0&cy=0&z=36&budget=100000',
    );
    expect(decodeMapQuery('seed=1&z=36').family).toBe('spectre');
  });

  it('round-trips every family canonically', () => {
    for (const family of ['hex', 'hat', 'turtle'] as const) {
      const q = encodeMapQuery({ ...DEFAULT_MAP_STATE, family });
      expect(q).toContain(`f=${family}`);
      const back = decodeMapQuery(q);
      expect(back.family).toBe(family);
      expect(encodeMapQuery(back)).toBe(q);
    }
  });

  it('falls back to spectre for junk families', () => {
    expect(decodeMapQuery('seed=1&f=banana').family).toBe('spectre');
    expect(decodeMapQuery('seed=1&f=').family).toBe('spectre');
  });

  it('sizes combos to the family: hex speaks 9 digits, the rest 10', () => {
    expect(comboLength('hex')).toBe(9);
    expect(comboLength('spectre')).toBe(COMBO_LENGTH);
    expect(comboLength('hat')).toBe(10);
    expect(normalizeCombo('01', 'hex')).toBe('010000000');
    expect(normalizeCombo('0123456789ab', 'hex')).toBe('012345678');
    // Decoding a hex link pads its combo to hex length, and stays canonical.
    const back = decodeMapQuery('f=hex&ln=1&c=12');
    expect(back.combo).toBe('120000000');
    expect(encodeMapQuery(decodeMapQuery(encodeMapQuery(back)))).toBe(encodeMapQuery(back));
  });

  it('defaults the combo per family: verified rule for spectre, zeros elsewhere', () => {
    expect(defaultCombo('spectre')).toBe('0100101100');
    expect(defaultCombo('hex')).toBe('000000000');
    expect(defaultCombo('turtle')).toBe('0000000000');
    expect(decodeMapQuery('f=hex').combo).toBe('000000000');
  });

  it('keeps family alongside the strand rule without disturbing it', () => {
    const state = {
      ...DEFAULT_MAP_STATE,
      family: 'hat' as const,
      lines: true,
      subset: [2, 5, 7, 8],
      combo: '0100101100',
    };
    const q = encodeMapQuery(state);
    const back = decodeMapQuery(q);
    expect(back.family).toBe('hat');
    expect(back.subset).toEqual([2, 5, 7, 8]);
    expect(back.combo).toBe('0100101100');
    expect(encodeMapQuery(back)).toBe(q);
    expect(sameMapState(state, back)).toBe(true);
  });
});
