import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPLORER_STATE,
  DEFAULT_INSTANCE_BUDGET,
  DEFAULT_LINE_SCALE,
  DEFAULT_TRACE_PACE,
  DEFAULT_TRAIL_HOLD,
  FLAG,
  MAX_TRACE_PACE,
  MAX_TRAIL_HOLD,
  MIN_TRAIL_HOLD,
  MAX_INSTANCE_BUDGET,
  MAX_LEVEL,
  MIN_INSTANCE_BUDGET,
  MIN_LINE_SCALE,
  connectionCount,
  edgesToSubset,
  leafOrder,
  matchingCount,
  validEdgeSubsets,
  type ExplorerState,
} from '../../core';
import {
  explorerBudget,
  explorerFindCircuits,
  explorerPersistFound,
  explorerFollow,
  explorerKeepTails,
  explorerPace,
  explorerKeepCircuits,
  explorerLineWidth,
  explorerMode,
  explorerReducer,
  explorerTrace,
  explorerTrailHold,
  hasFlag,
  maxMatchingIndex,
  normalizeMatchingVector,
  selectedSet,
  type ExplorerAction,
} from '../explorerReducer';

const run = (state: ExplorerState, ...actions: ExplorerAction[]): ExplorerState =>
  actions.reduce(explorerReducer, state);

const base = DEFAULT_EXPLORER_STATE;

describe('subset editing', () => {
  it('keeps the subset sorted and de-duplicated', () => {
    const s = run(base, { type: 'setSubset', subset: [8, 2, 5, 2, 7] });
    expect(s.subset).toEqual([2, 5, 7, 8]);
  });

  it('toggleMajor adds and removes', () => {
    const on = run(base, { type: 'toggleMajor', major: 5 });
    expect(on.subset).toEqual([5]);
    const off = run(on, { type: 'toggleMajor', major: 5 });
    expect(off.subset).toEqual([]);
  });

  it('setSubsetMask accepts a kernel element', () => {
    const mask = edgesToSubset([2, 5, 7, 8]);
    expect(run(base, { type: 'setSubsetMask', mask }).subset).toEqual([2, 5, 7, 8]);
  });

  it('xorSubset implements the group operation on valid subsets', () => {
    // '15' XOR '0136' = '0356' — all three are in the spectre kernel (§3.8).
    const valid = validEdgeSubsets('spectre').map((v) => v.edges.join(''));
    const s = run(
      base,
      { type: 'setSubset', subset: [1, 5] },
      { type: 'xorSubset', mask: edgesToSubset([0, 1, 3, 6]) },
    );
    expect(s.subset.join('')).toBe('0356');
    expect(valid).toContain(s.subset.join(''));
  });

  it('clamps matching indices when the subset shrinks', () => {
    const withDots = run(base, { type: 'setSubset', subset: [2, 5, 7, 8] });
    const order = leafOrder('spectre');
    const psiAt = order.indexOf('Psi');
    const maxPsi = maxMatchingIndex('spectre', 'Psi', withDots.subset);
    expect(maxPsi).toBeGreaterThan(0);

    const scrubbed = run(withDots, {
      type: 'setMatching',
      tileType: 'Psi',
      index: maxPsi,
    });
    expect(scrubbed.matching[psiAt]).toBe(maxPsi);

    const narrowed = run(scrubbed, { type: 'setSubset', subset: [5] });
    expect(narrowed.matching[psiAt]).toBeLessThanOrEqual(
      maxMatchingIndex('spectre', 'Psi', [5]),
    );
  });
});

describe('matching editing', () => {
  const withDots = run(base, { type: 'setSubset', subset: [2, 5, 7, 8] });
  const order = leafOrder('spectre');

  it('setMatching clamps into the legal range', () => {
    const s = run(withDots, { type: 'setMatching', tileType: 'Delta', index: 9999 });
    const at = order.indexOf('Delta');
    expect(s.matching[at]).toBe(maxMatchingIndex('spectre', 'Delta', withDots.subset));
    expect(s.matching[at]).toBeLessThan(
      matchingCount(connectionCount('spectre', 'Delta', selectedSet(withDots))),
    );
  });

  it('cycleMatching wraps through the option list', () => {
    const at = order.indexOf('Psi');
    const n = connectionCount('spectre', 'Psi', selectedSet(withDots));
    const total = matchingCount(n);
    expect(total).toBeGreaterThan(1);

    let s = withDots;
    for (let i = 0; i < total; i++) s = run(s, { type: 'cycleMatching', tileType: 'Psi', delta: 1 });
    expect(s.matching[at]).toBe(withDots.matching[at]);
  });

  it('cycleMatching honours the non-crossing filter', () => {
    const s = run(withDots, {
      type: 'cycleMatching',
      tileType: 'Psi',
      delta: 1,
      nonCrossingOnly: true,
    });
    const at = order.indexOf('Psi');
    // Every reachable value must be a non-crossing option.
    expect(s.matching[at]).not.toBe(withDots.matching[at]);
  });

  it('ignores tile types outside the family leaf order', () => {
    const s = run(withDots, { type: 'setMatching', tileType: 'Gamma', index: 3 });
    expect(s).toBe(withDots);
  });
});

describe('family switching', () => {
  it('reshapes the matching vector (hex has 9 leaves, others 10)', () => {
    const s = run(base, { type: 'setSubset', subset: [2, 5] }, { type: 'setFamily', family: 'hex' });
    expect(s.family).toBe('hex');
    expect(s.matching).toHaveLength(leafOrder('hex').length);
    expect(s.matching).toHaveLength(9);

    const back = run(s, { type: 'setFamily', family: 'spectre' });
    expect(back.matching).toHaveLength(10);
  });

  it('clears overlays, whose meta-edge indices are family specific', () => {
    const s = run(
      base,
      { type: 'addChord', tileType: 'Delta', chord: [0, 3] },
      { type: 'setFamily', family: 'turtle' },
    );
    expect(s.overlays).toEqual({});
  });

  it('normalizeMatchingVector pads and clamps', () => {
    expect(normalizeMatchingVector('spectre', [], [5, 5, 5])).toEqual(new Array(10).fill(0));
    expect(normalizeMatchingVector('hex', [], [])).toHaveLength(9);
  });
});

describe('level, flags, colours', () => {
  it('clamps the level to 0..MAX_LEVEL', () => {
    expect(run(base, { type: 'setLevel', level: 99 }).level).toBe(MAX_LEVEL);
    expect(run(base, { type: 'setLevel', level: -3 }).level).toBe(0);
    expect(run(base, { type: 'stepLevel', delta: -10 }).level).toBe(0);
  });

  it('toggles flag bits', () => {
    expect(hasFlag(base, FLAG.BACKGROUNDS)).toBe(true);
    const off = run(base, { type: 'toggleFlag', flag: FLAG.BACKGROUNDS });
    expect(hasFlag(off, FLAG.BACKGROUNDS)).toBe(false);
    const on = run(off, { type: 'toggleFlag', flag: FLAG.BACKGROUNDS });
    expect(on.flags).toBe(base.flags);
  });

  it('setCustomColor switches the scheme and normalizes the hex', () => {
    const s = run(base, { type: 'setCustomColor', tileType: 'Delta', hex: '#AABBCC' });
    expect(s.colorScheme).toBe('custom');
    expect(s.customColors?.Delta).toBe('aabbcc');
  });
});

describe('overlays and contracts', () => {
  it('adds, de-duplicates and removes chords', () => {
    let s = run(base, { type: 'addChord', tileType: 'Delta', chord: [0, 3] });
    expect(s.overlays.Delta).toEqual([[0, 3]]);
    s = run(s, { type: 'addChord', tileType: 'Delta', chord: [3, 0] });
    expect(s.overlays.Delta).toHaveLength(1);
    s = run(s, { type: 'addChord', tileType: 'Delta', chord: [1, 2] });
    expect(s.overlays.Delta).toHaveLength(2);
    s = run(s, { type: 'removeChord', tileType: 'Delta', at: 0 });
    expect(s.overlays.Delta).toEqual([[1, 2]]);
    s = run(s, { type: 'clearOverlays' });
    expect(s.overlays).toEqual({});
  });

  it('rejects self-chords', () => {
    const s = run(base, { type: 'addChord', tileType: 'Delta', chord: [2, 2] });
    expect(s.overlays.Delta).toBeUndefined();
  });

  it('sets and clears contracts, dropping the key entirely when empty', () => {
    const s = run(base, { type: 'setContract', major: 2, contract: { minor: 2, t: 0.6 } });
    expect(s.contracts).toEqual({ 2: { minor: 2, t: 0.6 } });
    const cleared = run(s, { type: 'setContract', major: 2, contract: null });
    expect('contracts' in cleared).toBe(false);
  });

  it('setCamera stores and clears', () => {
    const s = run(base, { type: 'setCamera', camera: { x: 1, y: 2, scale: 3 } });
    expect(s.camera).toEqual({ x: 1, y: 2, scale: 3 });
    expect('camera' in run(s, { type: 'setCamera', camera: undefined })).toBe(false);
  });
});

describe('line thickness', () => {
  it('floors at the minimum, has no ceiling, and is a no-op at the current value', () => {
    expect(explorerLineWidth(base)).toBe(DEFAULT_LINE_SCALE);
    expect(run(base, { type: 'setLineWidth', lineWidth: DEFAULT_LINE_SCALE })).toBe(base);
    // No ceiling: a number box should accept whatever is typed.
    for (const lw of [99, 500, 4321.5]) {
      expect(explorerLineWidth(run(base, { type: 'setLineWidth', lineWidth: lw }))).toBe(lw);
    }
    expect(explorerLineWidth(run(base, { type: 'setLineWidth', lineWidth: 0 }))).toBe(
      MIN_LINE_SCALE,
    );
    expect(explorerLineWidth(run(base, { type: 'setLineWidth', lineWidth: -5 }))).toBe(
      MIN_LINE_SCALE,
    );
  });

  it('is independent of the renderer mode', () => {
    const s = run(
      base,
      { type: 'setLineWidth', lineWidth: 3 },
      { type: 'setMode', mode: 'infinite' },
      { type: 'setMode', mode: 'rooted' },
    );
    expect(explorerLineWidth(s)).toBe(3);
  });
});

describe('instance budget', () => {
  it('clamps to the engine range and is a no-op at the current value', () => {
    expect(explorerBudget(base)).toBe(DEFAULT_INSTANCE_BUDGET);
    expect(run(base, { type: 'setBudget', budget: DEFAULT_INSTANCE_BUDGET })).toBe(base);
    expect(explorerBudget(run(base, { type: 'setBudget', budget: 1e12 }))).toBe(
      MAX_INSTANCE_BUDGET,
    );
    expect(explorerBudget(run(base, { type: 'setBudget', budget: 1 }))).toBe(MIN_INSTANCE_BUDGET);
  });

  it('survives a round trip through rooted mode', () => {
    const s = run(
      base,
      { type: 'setMode', mode: 'infinite' },
      { type: 'setBudget', budget: 5_000_000 },
      { type: 'setMode', mode: 'rooted' },
      { type: 'setMode', mode: 'infinite' },
    );
    expect(explorerBudget(s)).toBe(5_000_000);
  });
});

describe('identity', () => {
  it('returns the same object for no-op actions (cheap React bail-outs)', () => {
    expect(run(base, { type: 'setLevel', level: base.level })).toBe(base);
    expect(run(base, { type: 'setFamily', family: 'spectre' })).toBe(base);
    expect(run(base, { type: 'setRootTile', rootTile: 'Delta' })).toBe(base);
  });

  it('reset returns the shared default', () => {
    const s = run(base, { type: 'setLevel', level: 4 }, { type: 'reset' });
    expect(s).toBe(DEFAULT_EXPLORER_STATE);
  });
});

describe('renderer mode', () => {
  it('sets and clears infinite mode, keeping rooted canonical (no key)', () => {
    const inf = run(base, { type: 'setMode', mode: 'infinite' });
    expect(inf.mode).toBe('infinite');
    expect(explorerMode(inf)).toBe('infinite');
    const back = run(inf, { type: 'setMode', mode: 'rooted' });
    expect('mode' in back).toBe(false);
    expect(explorerMode(back)).toBe('rooted');
    expect(run(inf, { type: 'setMode', mode: 'infinite' })).toBe(inf); // bail-out
  });

  it('offers infinite mode for every family the un-rooted engine generates', () => {
    const hex = run(base, { type: 'setFamily', family: 'hex' });
    const tried = run(hex, { type: 'setMode', mode: 'infinite' });
    expect(tried.mode).toBe('infinite');
    expect(explorerMode(tried)).toBe('infinite');
  });

  it('keeps infinite mode across a family change', () => {
    const inf = run(base, { type: 'setMode', mode: 'infinite' });
    const hex = run(inf, { type: 'setFamily', family: 'hex' });
    expect(hex.mode).toBe('infinite');
    expect(explorerMode(hex)).toBe('infinite');
    // ...and the matching vector was renormalized to the hex leaf order.
    expect(hex.matching).toHaveLength(leafOrder('hex').length);
    const spectre = run(hex, { type: 'setFamily', family: 'spectre' });
    expect(spectre.mode).toBe('infinite');
  });
});

describe('tap-to-trace', () => {
  it('is on by default and stores only the OFF choice', () => {
    expect(explorerTrace(base)).toBe(true);
    expect('trace' in base).toBe(false);

    const off = run(base, { type: 'setTrace', trace: false });
    expect(off.trace).toBe(false);
    expect(explorerTrace(off)).toBe(false);
    expect(run(off, { type: 'setTrace', trace: false })).toBe(off); // bail-out

    // Back on drops the key again, so the default state stays canonical.
    const on = run(off, { type: 'setTrace', trace: true });
    expect('trace' in on).toBe(false);
    expect(explorerTrace(on)).toBe(true);
    expect(run(base, { type: 'setTrace', trace: true })).toBe(base);
  });
});

describe('auto-follow / trail hold / kept circuits', () => {
  it('follow is off by default and stores only the ON choice', () => {
    expect(explorerFollow(base)).toBe(false);
    expect('follow' in base).toBe(false);

    const on = run(base, { type: 'setFollow', follow: true });
    expect(on.follow).toBe(true);
    expect(explorerFollow(on)).toBe(true);
    expect(run(on, { type: 'setFollow', follow: true })).toBe(on); // bail-out

    const off = run(on, { type: 'setFollow', follow: false });
    expect('follow' in off).toBe(false);
    expect(run(base, { type: 'setFollow', follow: false })).toBe(base);
  });

  it('hold clamps into range and drops the key at the default', () => {
    expect(explorerTrailHold(base)).toBe(DEFAULT_TRAIL_HOLD);

    const set = run(base, { type: 'setTrailHold', hold: 1234 });
    expect(set.hold).toBe(1234);
    expect(explorerTrailHold(set)).toBe(1234);

    expect(run(base, { type: 'setTrailHold', hold: 0 }).hold).toBe(MIN_TRAIL_HOLD);
    expect(run(base, { type: 'setTrailHold', hold: 1e9 }).hold).toBe(MAX_TRAIL_HOLD);
    expect(run(base, { type: 'setTrailHold', hold: Number.NaN })).toBe(base); // -> default, no key

    const back = run(set, { type: 'setTrailHold', hold: DEFAULT_TRAIL_HOLD });
    expect('hold' in back).toBe(false);
  });

  it('keep-circuits is on by default and stores only the OFF choice', () => {
    expect(explorerKeepCircuits(base)).toBe(true);
    expect('keepCircuits' in base).toBe(false);

    const off = run(base, { type: 'setKeepCircuits', keepCircuits: false });
    expect(off.keepCircuits).toBe(false);
    expect(explorerKeepCircuits(off)).toBe(false);
    expect(run(off, { type: 'setKeepCircuits', keepCircuits: false })).toBe(off);

    const on = run(off, { type: 'setKeepCircuits', keepCircuits: true });
    expect('keepCircuits' in on).toBe(false);
    expect(run(base, { type: 'setKeepCircuits', keepCircuits: true })).toBe(base);
  });
});

describe('chase pace and shareable trace seed', () => {
  it('pace defaults to full speed and stores only a number', () => {
    expect(explorerPace(base)).toBeNull();
    expect('pace' in base).toBe(false);

    const slow = run(base, { type: 'setPace', pace: DEFAULT_TRACE_PACE });
    expect(slow.pace).toBe(DEFAULT_TRACE_PACE);
    expect(explorerPace(slow)).toBe(DEFAULT_TRACE_PACE);
    expect(run(slow, { type: 'setPace', pace: DEFAULT_TRACE_PACE })).toBe(slow); // bail-out
    expect(run(base, { type: 'setPace', pace: 1e9 }).pace).toBe(MAX_TRACE_PACE);

    const full = run(slow, { type: 'setPace', pace: null });
    expect('pace' in full).toBe(false);
    expect(run(base, { type: 'setPace', pace: null })).toBe(base);
  });

  it('trace seed stores four coordinates and clears to no key', () => {
    expect('traceSeed' in base).toBe(false);
    const seeded = run(base, { type: 'setTraceSeed', traceSeed: [1.5, -2.25, 3, 4.125] });
    expect(seeded.traceSeed).toEqual([1.5, -2.25, 3, 4.125]);
    expect(run(seeded, { type: 'setTraceSeed', traceSeed: [1.5, -2.25, 3, 4.125] })).toBe(seeded);
    const cleared = run(seeded, { type: 'setTraceSeed', traceSeed: null });
    expect('traceSeed' in cleared).toBe(false);
    expect(run(base, { type: 'setTraceSeed', traceSeed: null })).toBe(base);
  });
});

describe('keep-tails and find-all toggles', () => {
  it('keep-tails is on by default and stores only the OFF choice', () => {
    expect(explorerKeepTails(base)).toBe(true);
    expect('keepTails' in base).toBe(false);
    const off = run(base, { type: 'setKeepTails', keepTails: false });
    expect(off.keepTails).toBe(false);
    const on = run(off, { type: 'setKeepTails', keepTails: true });
    expect('keepTails' in on).toBe(false);
    expect(run(base, { type: 'setKeepTails', keepTails: true })).toBe(base);
  });

  it('find-all is off by default and stores only the ON choice', () => {
    expect(explorerFindCircuits(base)).toBe(false);
    expect('findCircuits' in base).toBe(false);
    const on = run(base, { type: 'setFindCircuits', findCircuits: true });
    expect(on.findCircuits).toBe(true);
    const off = run(on, { type: 'setFindCircuits', findCircuits: false });
    expect('findCircuits' in off).toBe(false);
    expect(run(base, { type: 'setFindCircuits', findCircuits: false })).toBe(base);
  });

  it('persist-found is off by default and stores only the ON choice', () => {
    expect(explorerPersistFound(base)).toBe(false);
    expect('persistFound' in base).toBe(false);
    const on = run(base, { type: 'setPersistFound', persistFound: true });
    expect(explorerPersistFound(on)).toBe(true);
    const off = run(on, { type: 'setPersistFound', persistFound: false });
    expect('persistFound' in off).toBe(false);
    expect(run(base, { type: 'setPersistFound', persistFound: false })).toBe(base);
  });
});
