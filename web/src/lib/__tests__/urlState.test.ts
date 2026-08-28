import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPLORER_STATE,
  FAMILIES,
  TILE_NAMES,
  leafOrder,
  validEdgeSubsets,
  type ColorSchemeId,
  type ExplorerState,
} from '../../core';
import {
  EXPLORER_ROUTE,
  canonicalizeState,
  hashToState,
  sameEncodedState,
  shareUrl,
  splitHash,
  stateToHash,
  stateToQuery,
} from '../urlState';
import { explorerReducer, maxMatchingIndex } from '../explorerReducer';

/** Deterministic PRNG so failures are reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randomState(rand: () => number): ExplorerState {
  const family = FAMILIES[Math.floor(rand() * FAMILIES.length)];
  const rootTile = TILE_NAMES[Math.floor(rand() * TILE_NAMES.length)];
  const level = Math.floor(rand() * 7);
  const subsets = validEdgeSubsets(family);
  // Mix kernel subsets with arbitrary ones so both `c=` and `m=` paths appear.
  const subset =
    rand() < 0.65
      ? subsets[Math.floor(rand() * subsets.length)].edges
      : [...new Set([0, 1, 2, 3, 5, 6, 7, 8].filter(() => rand() < 0.4))].sort((a, b) => a - b);

  const matching = leafOrder(family).map((type) => {
    const max = maxMatchingIndex(family, type, subset);
    return max === 0 ? 0 : Math.floor(rand() * (max + 1));
  });

  const schemes: ColorSchemeId[] = ['bright', 'fig53', 'mystics', 'pride', 'custom'];
  const colorScheme = schemes[Math.floor(rand() * schemes.length)];

  const state: ExplorerState = {
    family,
    rootTile,
    level,
    subset,
    matching,
    flags: Math.floor(rand() * 256),
    colorScheme,
    overlays:
      rand() < 0.35
        ? { Delta: [[0, 2] as const, [1, 3] as const], Xi: [[1, 4] as const] }
        : {},
    ...(colorScheme === 'custom' ? { customColors: { Delta: 'dcdcdc', Xi: 'fff200' } } : {}),
    ...(rand() < 0.3 ? { contracts: { 2: { minor: 2, t: 0.6 }, 5: { minor: 1, t: 0.4 } } } : {}),
    ...(rand() < 0.3
      ? { camera: { x: Number((rand() * 40 - 20).toFixed(2)), y: 3.25, scale: 1.8 } }
      : {}),
  };
  return state;
}

describe('hash splitting', () => {
  it('parses route and query out of a hash', () => {
    expect(splitHash('#/explorer?v=1&e=2578')).toEqual({
      route: '#/explorer',
      query: 'v=1&e=2578',
    });
    expect(splitHash('#/dev')).toEqual({ route: '#/dev', query: '' });
    expect(splitHash('')).toEqual({ route: '', query: '' });
  });

  it('accepts bare query strings', () => {
    expect(hashToState('e=15').subset).toEqual([1, 5]);
    expect(hashToState('?e=15').subset).toEqual([1, 5]);
    expect(hashToState('#/explorer?e=15').subset).toEqual([1, 5]);
  });
});

describe('state <-> URL round-trip', () => {
  it('is stable for the default state', () => {
    const hash = stateToHash(DEFAULT_EXPLORER_STATE);
    expect(hash).toBe(`${EXPLORER_ROUTE}?v=1`);
    expect(hashToState(hash)).toEqual(DEFAULT_EXPLORER_STATE);
  });

  it('round-trips 200 randomized states', () => {
    const rand = rng(0xc0ffee);
    for (let i = 0; i < 200; i++) {
      const state = canonicalizeState(randomState(rand));
      const decoded = hashToState(stateToHash(state));
      expect(decoded, `state #${i}: ${stateToQuery(state)}`).toEqual(state);
      // Encoding is idempotent, so a shared link never drifts on re-share.
      expect(stateToQuery(decoded)).toBe(stateToQuery(state));
    }
  });

  it('emits the canonical combination string when representable', () => {
    const withSubset = explorerReducer(DEFAULT_EXPLORER_STATE, {
      type: 'setSubset',
      subset: [2, 5, 7, 8],
    });
    const q = new URLSearchParams(stateToQuery(withSubset));
    expect(q.get('e')).toBe('2578');
    // All-zero combos are the default, so nothing is emitted...
    expect(q.get('c')).toBeNull();
    expect(q.get('m')).toBeNull();

    // ...but a non-default non-crossing choice becomes `c=`.
    const bumped = explorerReducer(withSubset, {
      type: 'cycleMatching',
      tileType: 'Psi',
      delta: 1,
      nonCrossingOnly: true,
    });
    const q2 = new URLSearchParams(stateToQuery(bumped));
    expect(q2.get('c')).toMatch(/^[0-9a-z]+$/);
    expect(hashToState(stateToHash(bumped)).matching).toEqual(bumped.matching);
  });

  it('is lenient about junk', () => {
    const s = hashToState('#/explorer?f=nope&lv=banana&e=zz&cs=purple&cam=1,2&ov=&fl=');
    expect(s.family).toBe(DEFAULT_EXPLORER_STATE.family);
    expect(s.level).toBe(DEFAULT_EXPLORER_STATE.level);
    expect(s.subset).toEqual([]);
    expect(s.colorScheme).toBe('bright');
    expect(s.camera).toBeUndefined();
  });

  it('sameEncodedState compares canonically, not structurally', () => {
    const a = explorerReducer(DEFAULT_EXPLORER_STATE, { type: 'setSubset', subset: [5, 2, 8, 7] });
    const b = explorerReducer(DEFAULT_EXPLORER_STATE, { type: 'setSubset', subset: [2, 5, 7, 8] });
    expect(sameEncodedState(a, b)).toBe(true);
    expect(sameEncodedState(a, DEFAULT_EXPLORER_STATE)).toBe(false);
  });
});

describe('shareUrl', () => {
  it('replaces any existing hash on the base URL', () => {
    const state = explorerReducer(DEFAULT_EXPLORER_STATE, { type: 'setSubset', subset: [1, 5] });
    expect(shareUrl(state, 'https://example.com/Spectre/#/explorer?v=1&e=0136')).toBe(
      'https://example.com/Spectre/#/explorer?v=1&e=15',
    );
    expect(shareUrl(state, 'https://example.com/Spectre/', '#/dev')).toBe(
      'https://example.com/Spectre/#/dev?v=1&e=15',
    );
  });
});

describe('follow / hold / keep-circuits params (explorer codec)', () => {
  const inf: ExplorerState = { ...DEFAULT_EXPLORER_STATE, mode: 'infinite' };

  it('encodes fw/hp/kc additively and round-trips', () => {
    expect(stateToQuery(inf)).not.toMatch(/(^|&)(fw|hp|kc)=/);

    const s: ExplorerState = { ...inf, follow: true, hold: 1234, keepCircuits: false };
    const q = stateToQuery(s);
    expect(q).toContain('fw=1');
    expect(q).toContain('hp=1234');
    expect(q).toContain('kc=0');
    const back = hashToState(stateToHash(s));
    expect(back.follow).toBe(true);
    expect(back.hold).toBe(1234);
    expect(back.keepCircuits).toBe(false);
    expect(stateToQuery(back)).toBe(q); // canonical
  });

  it('drops all three keys at their defaults on decode', () => {
    const back = hashToState('#/explorer?v=1&md=infinite&fw=0&hp=5000&kc=1');
    expect('follow' in back).toBe(false);
    expect('hold' in back).toBe(false);
    expect('keepCircuits' in back).toBe(false);
  });
});

describe('pace / trace-seed params (explorer codec)', () => {
  const inf: ExplorerState = { ...DEFAULT_EXPLORER_STATE, mode: 'infinite' };

  it('encodes fp/ts additively and round-trips', () => {
    expect(stateToQuery(inf)).not.toMatch(/(^|&)(fp|ts)=/);

    const s: ExplorerState = { ...inf, pace: 24, traceSeed: [12.125, -7.5, 13.008, -8.25] };
    const q = stateToQuery(s);
    expect(q).toContain('fp=24');
    expect(q).toContain('ts=');
    const back = hashToState(stateToHash(s));
    expect(back.pace).toBe(24);
    expect(back.traceSeed).toEqual([12.125, -7.5, 13.008, -8.25]);
    expect(stateToQuery(back)).toBe(q); // canonical
  });

  it('drops malformed seeds and junk paces', () => {
    const back = hashToState('#/explorer?v=1&md=infinite&fp=abc&ts=1,2,zzz');
    expect('pace' in back).toBe(false);
    expect('traceSeed' in back).toBe(false);
  });
});

describe('kt / fc params (explorer codec)', () => {
  const inf: ExplorerState = { ...DEFAULT_EXPLORER_STATE, mode: 'infinite' };
  it('round-trips keep-tails-off and find-all-on', () => {
    expect(stateToQuery(inf)).not.toMatch(/(^|&)(kt|fc)=/);
    const s: ExplorerState = {
      ...inf,
      keepTails: false,
      findCircuits: true,
      persistFound: true,
    };
    const q = stateToQuery(s);
    expect(q).toContain('kt=0');
    expect(q).toContain('fc=1');
    const back = hashToState(stateToHash(s));
    expect(back.keepTails).toBe(false);
    expect(back.findCircuits).toBe(true);
    expect(back.persistFound).toBe(true);
    expect(stateToQuery(s)).toContain('pf=1');
    // Off is the default and writes nothing.
    expect(stateToQuery({ ...s, persistFound: false })).not.toContain('pf=');
    expect(stateToQuery(back)).toBe(q);
  });
});
