import { describe, expect, it } from 'vitest';

import { comboToMatchingIndices } from '../../../core';
import {
  DEFAULT_COMBO,
  DEFAULT_SUBSET,
  DEFAULT_SUPERTILES_STATE,
  SUPERTILES_ROUTE,
  decodeSupertilesQuery,
  encodeSupertilesQuery,
  hashToSupertilesState,
  normalizeRootTile,
  sameSupertilesState,
  supertilesStateToHash,
  type SupertilesUrlState,
} from '../supertilesUrl';

describe('supertiles URL codec', () => {
  it('writes nothing while everything is at its default', () => {
    expect(encodeSupertilesQuery(DEFAULT_SUPERTILES_STATE)).toBe('');
    expect(supertilesStateToHash(DEFAULT_SUPERTILES_STATE)).toBe(SUPERTILES_ROUTE);
  });

  it('round-trips a fully specified state', () => {
    const state: SupertilesUrlState = {
      rootTile: 'Psi',
      level: 5,
      gap: 0.8,
      depth: 2,
      showTiles: false,
      showLabels: false,
      lines: true,
      subset: [1, 5],
      matching: comboToMatchingIndices('spectre', [1, 5], '0000000000'),
    };
    expect(decodeSupertilesQuery(encodeSupertilesQuery(state))).toEqual(state);
  });

  it('is canonical: encode → decode → encode is stable', () => {
    const state: SupertilesUrlState = {
      rootTile: 'Sigma',
      level: 4,
      gap: 1.234,
      depth: 3,
      showTiles: true,
      showLabels: false,
      lines: false,
      subset: DEFAULT_SUBSET,
      matching: comboToMatchingIndices('spectre', DEFAULT_SUBSET, DEFAULT_COMBO),
    };
    const once = encodeSupertilesQuery(state);
    expect(encodeSupertilesQuery(decodeSupertilesQuery(once))).toBe(once);
  });

  it('carries only what changed', () => {
    const q = encodeSupertilesQuery({ ...DEFAULT_SUPERTILES_STATE, level: 5 });
    expect(q).toBe('lv=5');
  });

  it('carries the rule once lines are on, and reads it back', () => {
    const q = encodeSupertilesQuery({
      ...DEFAULT_SUPERTILES_STATE,
      lines: true,
      subset: [1, 5],
      matching: comboToMatchingIndices('spectre', [1, 5], '0000000000'),
    });
    expect(q).toContain('ln=1');
    expect(q).toContain('e=15');
    const back = decodeSupertilesQuery(q);
    expect(back.lines).toBe(true);
    expect(back.subset).toEqual([1, 5]);
    expect(back.matching).toEqual(comboToMatchingIndices('spectre', [1, 5], '0000000000'));
  });

  it('reads the lossless matching vector when a link carries one', () => {
    // `m=` is the fallback the Explorer's codec also uses, for matchings no
    // combination string can name. A link carrying one must survive intact.
    const vector = comboToMatchingIndices('spectre', DEFAULT_SUBSET, DEFAULT_COMBO);
    const back = decodeSupertilesQuery(`ln=1&e=2578&m=${vector.join('.')}`);
    expect(back.matching).toEqual(vector);
    // A malformed entry falls back to 0 rather than producing NaN geometry.
    expect(decodeSupertilesQuery('ln=1&e=2578&m=0.x.0').matching).toHaveLength(vector.length);
    expect(decodeSupertilesQuery('ln=1&e=2578&m=0.x.0').matching.every(Number.isFinite)).toBe(true);
  });

  it('prefers the combination string whenever one exists', () => {
    const q = encodeSupertilesQuery({ ...DEFAULT_SUPERTILES_STATE, lines: true });
    expect(q).toContain('c=');
    expect(q).not.toContain('m=');
  });

  it('clamps hostile input instead of trusting it', () => {
    const s = decodeSupertilesQuery('t=NotATile&lv=99&gap=-4&d=17&tl=0');
    expect(s.rootTile).toBe('Delta');
    expect(s.level).toBeLessThanOrEqual(6);
    expect(s.gap).toBe(0);
    expect(s.depth).toBeLessThanOrEqual(3);
    expect(s.showTiles).toBe(false);
    // Anything unparseable falls back rather than producing NaN geometry.
    expect(decodeSupertilesQuery('lv=abc&gap=xyz')).toEqual(DEFAULT_SUPERTILES_STATE);
  });

  it('accepts a flavour in any case, and rejects one that is not a flavour', () => {
    expect(normalizeRootTile('psi')).toBe('Psi');
    expect(normalizeRootTile('GAMMA')).toBe('Gamma');
    // Gamma1/Gamma2 are leaves, not substitution flavours.
    expect(normalizeRootTile('Gamma1')).toBe('Delta');
    expect(normalizeRootTile(null)).toBe('Delta');
  });

  it('reads a hash in any of the shapes the page may see', () => {
    const expected = { ...DEFAULT_SUPERTILES_STATE, level: 2, gap: 0.5 };
    expect(hashToSupertilesState('#/supertiles?lv=2&gap=0.5')).toEqual(expected);
    expect(hashToSupertilesState('?lv=2&gap=0.5')).toEqual(expected);
    expect(hashToSupertilesState('lv=2&gap=0.5')).toEqual(expected);
    // A route-only hash carries no state.
    expect(hashToSupertilesState('#/supertiles')).toEqual(DEFAULT_SUPERTILES_STATE);
    expect(hashToSupertilesState('')).toEqual(DEFAULT_SUPERTILES_STATE);
  });

  it('compares states by what they encode', () => {
    const a = { ...DEFAULT_SUPERTILES_STATE, gap: 0.5 };
    expect(sameSupertilesState(a, { ...a })).toBe(true);
    expect(sameSupertilesState(a, { ...a, gap: 0.6 })).toBe(false);
    // Values that clamp to the same thing are the same URL.
    expect(sameSupertilesState({ ...a, level: 99 }, { ...a, level: 6 })).toBe(true);
  });
});
