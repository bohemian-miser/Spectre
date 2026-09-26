import { describe, expect, it } from 'vitest';
import { DEFAULT_EXPLORER_STATE, decodeExplorerState, encodeExplorerState } from '../../core';
import { explorerReducer } from '../explorerReducer';

const hex = explorerReducer(DEFAULT_EXPLORER_STATE, { type: 'setFamily', family: 'hex' });

describe('draw hexagons as Spectres', () => {
  it('is a hex-only drawing choice that round-trips through the URL as sh=s', () => {
    const on = explorerReducer(hex, { type: 'setShape', shape: 'spectre' });
    expect(on.shape).toBe('spectre');
    const q = encodeExplorerState(on);
    expect(q.get('sh')).toBe('s');
    expect(decodeExplorerState(q)).toEqual(on);
    const off = explorerReducer(on, { type: 'setShape', shape: 'hex' });
    expect(off).toEqual(hex);
    expect(encodeExplorerState(off).has('sh')).toBe(false);
  });

  it('does nothing outside the hex family, and leaving hex drops it', () => {
    expect(explorerReducer(DEFAULT_EXPLORER_STATE, { type: 'setShape', shape: 'spectre' })).toBe(
      DEFAULT_EXPLORER_STATE,
    );
    const on = explorerReducer(hex, { type: 'setShape', shape: 'spectre' });
    expect(explorerReducer(on, { type: 'setFamily', family: 'spectre' }).shape).toBeUndefined();
    const q = new URLSearchParams('v=1&sh=s');
    expect(decodeExplorerState(q).shape).toBeUndefined();
  });

  it('keeps the rule and matchings when toggled', () => {
    const ruled = explorerReducer(hex, { type: 'setSubset', subset: [0, 1, 2, 3, 4, 5, 6, 8] });
    const on = explorerReducer(ruled, { type: 'setShape', shape: 'spectre' });
    expect(on.subset).toEqual(ruled.subset);
    expect(on.matching).toEqual(ruled.matching);
  });
});
