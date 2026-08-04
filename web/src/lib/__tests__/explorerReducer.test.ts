import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPLORER_STATE,
  FLAG,
  MAX_LEVEL,
  connectionCount,
  edgesToSubset,
  leafOrder,
  matchingCount,
  validEdgeSubsets,
  type ExplorerState,
} from '../../core';
import {
  explorerReducer,
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
