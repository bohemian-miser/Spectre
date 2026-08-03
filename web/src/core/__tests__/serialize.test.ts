import { describe, expect, it } from 'vitest';
import {
  CODEC_VERSION,
  DEFAULT_EXPLORER_STATE,
  DEFAULT_FLAGS,
  FLAG,
  decodeExplorerQuery,
  decodeExplorerState,
  encodeExplorerQuery,
  encodeExplorerState,
  normalizeExplorerState,
  type ExplorerState,
} from '../serialize';
import { leafOrder } from '../families';
import { enumerateMatchings, nonCrossingForTile } from '../matchings';
import { connectionCount } from '../edges';
import { subsetToEdges, validEdgeSubsets } from '../subsets';

const q = (s: string): URLSearchParams => new URLSearchParams(s);

describe('explorer state codec', () => {
  it('emits only the version for the default state', () => {
    expect(encodeExplorerQuery(DEFAULT_EXPLORER_STATE)).toBe(`v=${CODEC_VERSION}`);
    expect(decodeExplorerQuery('')).toEqual(DEFAULT_EXPLORER_STATE);
    expect(DEFAULT_FLAGS).toBe(23);
    expect(FLAG.BACKGROUNDS | FLAG.OUTLINES | FLAG.LINES | FLAG.RAINBOW_TAILS).toBe(23);
  });

  it('round-trips a fully populated state', () => {
    const state: ExplorerState = {
      family: 'spectre',
      rootTile: 'Theta',
      level: 3,
      subset: [2, 5, 7, 8],
      matching: [0, 2, 0, 2, 0, 0, 2, 0, 0, 0],
      flags: 0b1101111,
      colorScheme: 'custom',
      customColors: { Delta: 'dcdcdc', Xi: 'fff200' },
      contracts: { 2: { minor: 2, t: 0.6 }, 5: { minor: 1, t: 0.4 } },
      overlays: { Delta: [[0, 4], [2, 5]], Xi: [[1, 3]] },
      camera: { x: 12.5, y: -3.2, scale: 1.8 },
    };
    const decoded = decodeExplorerState(encodeExplorerState(state));
    expect(decoded).toEqual(state);
    expect(normalizeExplorerState(decoded)).toEqual(decoded);
  });

  it('prefers the canonical combination string and falls back to m=', () => {
    const base: ExplorerState = {
      ...DEFAULT_EXPLORER_STATE,
      subset: [2, 5, 7, 8],
      matching: [0, 2, 0, 2, 0, 0, 2, 0, 0, 0],
    };
    const params = encodeExplorerState(base);
    expect(params.get('e')).toBe('2578');
    expect(params.get('c')).toBe('0101001000');
    expect(params.get('m')).toBeNull();
    expect(decodeExplorerState(params).matching).toEqual(base.matching);

    // matching index 1 for Theta is a CROSSING matching -> not combo-representable
    const exotic: ExplorerState = { ...base, matching: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] };
    const exoticParams = encodeExplorerState(exotic);
    expect(exoticParams.get('c')).toBeNull();
    expect(exoticParams.get('m')).toBe('0.1');
    expect(decodeExplorerState(exoticParams).matching).toEqual(exotic.matching);
  });

  it('c wins when both c and m are present', () => {
    const decoded = decodeExplorerState(q('e=2578&c=0100000000&m=0.1'));
    const theta = decoded.matching[1];
    expect(theta).toBe(nonCrossingForTile('spectre', 'Theta', new Set([2, 5, 7, 8]))[1]);
  });

  it('is lenient about junk', () => {
    const decoded = decodeExplorerState(
      q('f=klein&t=Bottle&lv=99&e=xy&fl=abc&cs=neon&cam=1,2&ct=oops&ov=&unknown=1'),
    );
    expect(decoded.family).toBe('spectre');
    expect(decoded.rootTile).toBe('Delta');
    expect(decoded.level).toBe(6); // clamped, not crashed
    expect(decoded.subset).toEqual([]);
    expect(decoded.flags).toBe(DEFAULT_FLAGS);
    expect(decoded.colorScheme).toBe('bright');
    expect(decoded.camera).toBeUndefined();
    expect(decoded.contracts).toBeUndefined();
    expect(decoded.overlays).toEqual({});
  });

  it('clamps out-of-range matching indices instead of failing', () => {
    // Delta has a single matching under {2,5,7,8}
    const decoded = decodeExplorerState(q('e=2578&m=17'));
    expect(decoded.matching[0]).toBe(0);
    const big = decodeExplorerState(q('e=2578&c=z000000000'));
    expect(big.matching[0]).toBe(0);
  });

  it('drops asymmetric class-0 contract overrides', () => {
    const bad = decodeExplorerState(q('e=0356&ct=0:0@0.25'));
    // clamped back to the seam centre, i.e. the default
    expect(bad.contracts?.[0]).toEqual({ minor: 0, t: 1 });
    const good = decodeExplorerState(q('e=2578&ct=2:2@0.60'));
    expect(good.contracts?.[2]).toEqual({ minor: 2, t: 0.6 });
  });

  it('handles the hexagon family’s shorter matching vector', () => {
    const state: ExplorerState = {
      ...DEFAULT_EXPLORER_STATE,
      family: 'hex',
      subset: [1, 5],
      matching: leafOrder('hex').map(() => 0),
    };
    const decoded = decodeExplorerState(encodeExplorerState(state));
    expect(decoded.matching.length).toBe(9);
    expect(decoded).toEqual(state);
  });

  it('round-trips randomized states (property test)', () => {
    let seed = 12345;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const families = ['spectre', 'hex', 'hat', 'turtle'] as const;
    for (let iter = 0; iter < 200; iter++) {
      const family = families[Math.floor(rnd() * families.length)];
      const valid = validEdgeSubsets(family);
      const subset = subsetToEdges(valid[Math.floor(rnd() * valid.length)].mask);
      const matching = leafOrder(family).map((type) => {
        const n = connectionCount(family, type, new Set(subset));
        const all = enumerateMatchings(n).length;
        return all ? Math.floor(rnd() * all) : 0;
      });
      const state: ExplorerState = {
        family,
        rootTile: 'Delta',
        level: Math.floor(rnd() * 7),
        subset,
        matching,
        flags: Math.floor(rnd() * 256),
        colorScheme: 'bright',
        overlays: rnd() > 0.5 ? { Delta: [[0, 1]] } : {},
        ...(rnd() > 0.7 ? { camera: { x: 1.25, y: -2.5, scale: 3 } } : {}),
      };
      const params = encodeExplorerState(state);
      expect(decodeExplorerState(params), params.toString()).toEqual(state);
    }
  });
});
