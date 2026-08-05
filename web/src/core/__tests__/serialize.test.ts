import { describe, expect, it } from 'vitest';
import {
  CODEC_VERSION,
  DEFAULT_EXPLORER_STATE,
  DEFAULT_FLAGS,
  FLAG,
  MAX_LEVEL,
  decodeExplorerQuery,
  decodeExplorerState,
  encodeExplorerQuery,
  encodeExplorerState,
  normalizeExplorerState,
  supportsInfiniteMode,
  EXPLORER_MODES,
  DEFAULT_LINE_SCALE,
  MIN_LINE_SCALE,
  clampLineScale,
  type ExplorerState,
} from '../serialize';
import {
  DEFAULT_INSTANCE_BUDGET,
  INSTANCE_BUDGETS,
  MAX_INSTANCE_BUDGET,
  MIN_INSTANCE_BUDGET,
  clampInstanceBudget,
} from '../unrooted';
import { FAMILIES, leafOrder } from '../families';
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
    expect(decoded.level).toBe(MAX_LEVEL); // clamped, not crashed
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

/**
 * Renderer mode (`md=`) — ADDITIVE: the default state still encodes to exactly
 * `v=1`, every pre-existing link decodes unchanged, and `infinite` only
 * survives for families the un-rooted engine can actually generate.
 */
describe('explorer mode in the URL', () => {
  it('is absent from the default state and from rooted states', () => {
    expect(DEFAULT_EXPLORER_STATE.mode).toBeUndefined();
    expect(encodeExplorerQuery(DEFAULT_EXPLORER_STATE)).toBe(`v=${CODEC_VERSION}`);
    expect(encodeExplorerQuery({ ...DEFAULT_EXPLORER_STATE, mode: 'rooted' })).toBe(
      `v=${CODEC_VERSION}`,
    );
    expect(decodeExplorerQuery('v=1').mode).toBeUndefined();
  });

  it('round-trips infinite mode', () => {
    const state: ExplorerState = {
      ...DEFAULT_EXPLORER_STATE,
      level: 8,
      subset: [2, 5, 7, 8],
      mode: 'infinite',
    };
    const query = encodeExplorerQuery(state);
    expect(query).toContain('md=infinite');
    const back = decodeExplorerQuery(query);
    expect(back.mode).toBe('infinite');
    expect(back.level).toBe(8);
    expect(normalizeExplorerState(state)).toEqual(back);
    // Canonical: encode ∘ decode ∘ encode is a fixed point.
    expect(encodeExplorerQuery(back)).toBe(query);
  });

  it('refuses infinite mode for families the engine cannot generate', () => {
    expect(supportsInfiniteMode('spectre')).toBe(true);
    for (const f of FAMILIES.filter((x) => x !== 'spectre')) {
      expect(supportsInfiniteMode(f)).toBe(false);
      const encoded = encodeExplorerQuery({
        ...DEFAULT_EXPLORER_STATE,
        family: f,
        mode: 'infinite',
      });
      expect(encoded).not.toContain('md=');
      expect(decodeExplorerQuery(`v=1&f=${f}&md=infinite`).mode).toBeUndefined();
    }
    expect(EXPLORER_MODES).toEqual(['rooted', 'infinite']);
  });

  it('falls back to rooted for junk modes', () => {
    expect(decodeExplorerQuery('v=1&md=teleport').mode).toBeUndefined();
    expect(decodeExplorerQuery('v=1&md=').mode).toBeUndefined();
  });
});

/**
 * Instance budget (`bg=`) — additive in the same way, and only meaningful
 * alongside `md=infinite`.
 */
describe('instance budget in the URL', () => {
  const infinite: ExplorerState = { ...DEFAULT_EXPLORER_STATE, mode: 'infinite' };

  it('is omitted at the default and on rooted links', () => {
    expect(encodeExplorerQuery({ ...infinite, budget: DEFAULT_INSTANCE_BUDGET })).toBe(
      `v=${CODEC_VERSION}&md=infinite`,
    );
    // A budget with no infinite mode to spend it on never reaches the URL.
    expect(
      encodeExplorerQuery({ ...DEFAULT_EXPLORER_STATE, budget: MAX_INSTANCE_BUDGET }),
    ).toBe(`v=${CODEC_VERSION}`);
    expect(decodeExplorerQuery('v=1&bg=5000000').budget).toBeUndefined();
  });

  it('round-trips every offered preset', () => {
    for (const b of INSTANCE_BUDGETS) {
      const query = encodeExplorerQuery({ ...infinite, budget: b });
      const back = decodeExplorerQuery(query);
      expect(back.budget ?? DEFAULT_INSTANCE_BUDGET).toBe(b);
      expect(encodeExplorerQuery(back)).toBe(query); // canonical
    }
  });

  it('clamps out-of-range and junk values', () => {
    expect(decodeExplorerQuery('v=1&md=infinite&bg=999999999').budget).toBe(MAX_INSTANCE_BUDGET);
    expect(decodeExplorerQuery('v=1&md=infinite&bg=1').budget).toBe(MIN_INSTANCE_BUDGET);
    expect(decodeExplorerQuery('v=1&md=infinite&bg=banana').budget).toBeUndefined();
    expect(clampInstanceBudget(Number.NaN)).toBe(DEFAULT_INSTANCE_BUDGET);
  });

  it('leaves pre-budget links byte-identical', () => {
    // Canonical order: `md=` is written last, after the shared params.
    for (const link of ['v=1', 'v=1&lv=4&e=2578&c=0100101100', 'v=1&lv=7&md=infinite']) {
      expect(encodeExplorerQuery(decodeExplorerQuery(link))).toBe(link);
    }
  });
});

/**
 * Strand-line thickness (`lw=`). Unlike `bg=` it is NOT tied to a mode — the
 * rooted view strokes in world units and the map's views in CSS px, but the
 * multiplier means the same thing to both.
 */
describe('line thickness in the URL', () => {
  it('is omitted at the default', () => {
    expect(DEFAULT_EXPLORER_STATE.lineWidth).toBeUndefined();
    expect(encodeExplorerQuery({ ...DEFAULT_EXPLORER_STATE, lineWidth: DEFAULT_LINE_SCALE })).toBe(
      `v=${CODEC_VERSION}`,
    );
    expect(decodeExplorerQuery('v=1').lineWidth).toBeUndefined();
  });

  it('round-trips canonically in either mode', () => {
    for (const base of [
      DEFAULT_EXPLORER_STATE,
      { ...DEFAULT_EXPLORER_STATE, mode: 'infinite' as const },
    ]) {
      for (const lw of [0.25, 0.5, 1.5, 2, 3.75, 6, 40]) {
        const query = encodeExplorerQuery({ ...base, lineWidth: lw });
        expect(query).toContain(`lw=${lw}`);
        const back = decodeExplorerQuery(query);
        expect(back.lineWidth).toBe(lw);
        expect(encodeExplorerQuery(back)).toBe(query); // canonical
      }
    }
  });

  it('has no ceiling — the number box takes any weight', () => {
    // The whole point of a number box rather than a slider.
    for (const lw of [8, 25, 400, 12_345.5]) {
      expect(decodeExplorerQuery(`v=1&lw=${lw}`).lineWidth).toBe(lw);
      const q = encodeExplorerQuery({ ...DEFAULT_EXPLORER_STATE, lineWidth: lw });
      expect(encodeExplorerQuery(decodeExplorerQuery(q))).toBe(q); // still canonical
    }
  });

  it('floors at the smallest drawable width and ignores junk', () => {
    expect(decodeExplorerQuery('v=1&lw=0').lineWidth).toBe(MIN_LINE_SCALE);
    expect(decodeExplorerQuery('v=1&lw=-4').lineWidth).toBe(MIN_LINE_SCALE);
    expect(decodeExplorerQuery('v=1&lw=fat').lineWidth).toBeUndefined();
    expect(clampLineScale(Number.NaN)).toBe(DEFAULT_LINE_SCALE);
    // Snapped to two decimals so the round-trip is exact.
    expect(clampLineScale(1.23456)).toBe(1.23);
  });

  it('leaves pre-thickness links byte-identical', () => {
    for (const link of ['v=1', 'v=1&lv=4&e=2578&c=0100101100', 'v=1&lv=7&md=infinite']) {
      expect(encodeExplorerQuery(decodeExplorerQuery(link))).toBe(link);
    }
  });
});

/** Midpoint clipping (`no=`) — a plain additive boolean. */
describe('midpoint clipping in the URL', () => {
  it('is omitted when off and round-trips when on', () => {
    expect(DEFAULT_EXPLORER_STATE.noOverlap).toBeUndefined();
    expect(encodeExplorerQuery(DEFAULT_EXPLORER_STATE)).toBe(`v=${CODEC_VERSION}`);
    const on = encodeExplorerQuery({ ...DEFAULT_EXPLORER_STATE, noOverlap: true });
    expect(on).toBe(`v=${CODEC_VERSION}&no=1`);
    const back = decodeExplorerQuery(on);
    expect(back.noOverlap).toBe(true);
    expect(encodeExplorerQuery(back)).toBe(on); // canonical
  });

  it('treats anything but 1/true as off', () => {
    expect(decodeExplorerQuery('v=1&no=0').noOverlap).toBeUndefined();
    expect(decodeExplorerQuery('v=1&no=yes').noOverlap).toBeUndefined();
    expect(decodeExplorerQuery('v=1&no=true').noOverlap).toBe(true);
    expect(encodeExplorerQuery({ ...DEFAULT_EXPLORER_STATE, noOverlap: false })).toBe(
      `v=${CODEC_VERSION}`,
    );
  });

  it('combines with the other strand params without disturbing them', () => {
    const q = encodeExplorerQuery({
      ...DEFAULT_EXPLORER_STATE,
      lineWidth: 4,
      noOverlap: true,
      mode: 'infinite',
    });
    const back = decodeExplorerQuery(q);
    expect(back.lineWidth).toBe(4);
    expect(back.noOverlap).toBe(true);
    expect(back.mode).toBe('infinite');
    expect(encodeExplorerQuery(back)).toBe(q);
  });
});
