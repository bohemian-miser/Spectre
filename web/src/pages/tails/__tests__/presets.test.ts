/**
 * The explainer's factual claims, pinned.
 *
 * Everything the article states as a number — Delta's six seams, the count
 * matrix printed in `docs/EXPLAINER_COPY.md`, the fingerprints, the eight
 * kernel members and their group structure — is asserted here against the copy
 * so a change to the tile tables fails the test suite instead of quietly
 * making the prose wrong.
 */

import { describe, expect, it } from 'vitest';
import {
  CLASSES,
  COUNT_MATRIX,
  KERNEL_MASKS,
  MATRIX_ROWS,
  NEVER_INVITED,
  PROFILES,
  SECTIONS,
  contractAt,
  crossingCount,
  edgesOf,
  explorerHref,
  fingerprint,
  hostOf,
  loadMasks,
  maskDigits,
  maskLabel,
  maskOf,
  matchingRecord,
  oddTypes,
  pairableUnder,
  rowParity,
  saveMasks,
  seamIndicesOfClass,
  seamMinorCount,
  seamTally,
  setOf,
  xorMask,
} from '../presets';
import { LEAF_ORDER, SPECTRE_VALID_SUBSETS, matchingIndicesToCombo, leafOrder } from '../../../core';

/** The table exactly as printed in docs/EXPLAINER_COPY.md ("The matrix"). */
const PUBLISHED_MATRIX: Readonly<Record<string, readonly number[]>> = {
  Gamma1: [0, 2, 1, 0, 0, 0, 0, 1, 0],
  Gamma2: [0, 0, 1, 1, 1, 0, 1, 1, 0],
  Delta: [0, 1, 1, 2, 0, 1, 1, 0, 0],
  Theta: [1, 0, 3, 1, 0, 0, 0, 0, 1],
  Lambda: [0, 1, 2, 1, 0, 1, 0, 0, 1],
  Xi: [1, 1, 2, 0, 0, 1, 0, 0, 1],
  Pi: [0, 2, 1, 0, 0, 2, 0, 0, 1],
  Sigma: [0, 1, 1, 1, 1, 1, 0, 0, 0],
  Phi: [1, 0, 2, 1, 0, 2, 0, 0, 0],
  Psi: [1, 1, 1, 0, 0, 3, 0, 0, 0],
};

describe('explainer presets', () => {
  it('lists the ten tile types of the copy, one per leaf', () => {
    expect(MATRIX_ROWS).toHaveLength(10);
    expect([...MATRIX_ROWS].sort()).toEqual([...LEAF_ORDER].sort());
    expect(CLASSES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reproduces the published count matrix entry for entry', () => {
    for (const row of COUNT_MATRIX) {
      expect(row.counts, `row ${row.type}`).toEqual(PUBLISHED_MATRIX[row.type]);
    }
  });

  it('tallies Delta as six seams — 3, 2, −5, 1, −3, −6 — over fourteen edges', () => {
    const seams = seamTally('Delta');
    expect(seams.map((s) => s.name)).toEqual(['3A', '2A', '-5A', '1A', '-3A', '-6A']);
    expect(seams.map((s) => s.labels.length)).toEqual([2, 3, 2, 3, 2, 2]);
    expect(seams.reduce((n, s) => n + s.labels.length, 0)).toBe(14);
  });

  it('knows the seam lengths the copy quotes: 2 is three edges, 7 is four, 8 is one', () => {
    expect(seamMinorCount(2)).toBe(3);
    expect(seamMinorCount(7)).toBe(4);
    expect(seamMinorCount(8)).toBe(1);
  });

  it('finds Theta’s three class-2 seams (2A, 2B and −2)', () => {
    const idx = seamIndicesOfClass('Theta', 2);
    expect(idx).toHaveLength(3);
    expect(crossingCount('Theta', new Set([2]))).toBe(3);
  });

  it('matches the fingerprints the copy calls out', () => {
    expect(fingerprint(7)).toEqual(['Gamma1', 'Gamma2']);
    expect(fingerprint(8)).toEqual(['Theta', 'Lambda', 'Xi', 'Pi']);
    expect(fingerprint(1)).toEqual(['Delta', 'Lambda', 'Xi', 'Sigma', 'Psi']);
    // The jackpot: 1 and 5 have the same fingerprint, so together they cancel.
    expect(fingerprint(5)).toEqual(fingerprint(1));
    expect(oddTypes(new Set([1, 5]))).toEqual([]);
    // {1,7} and {2,8} upset the same seven tiles, so {1,2,7,8} upsets nobody.
    expect(oddTypes(new Set([1, 7]))).toEqual(oddTypes(new Set([2, 8])));
    expect(oddTypes(new Set([1, 2, 7, 8]))).toEqual([]);
  });

  it('sums rows mod 2 the way the matrix figure claims', () => {
    const five = setOf(maskOf([5]));
    expect(COUNT_MATRIX.filter((row) => rowParity(row, five) === 1).map((r) => r.type)).toEqual([
      'Delta',
      'Lambda',
      'Xi',
      'Sigma',
      'Psi',
    ]);
    const oneFive = setOf(maskOf([1, 5]));
    expect(COUNT_MATRIX.every((row) => rowParity(row, oneFive) === 0)).toBe(true);
  });

  it('has exactly the eight kernel members, and they form a group under XOR', () => {
    expect(KERNEL_MASKS).toHaveLength(8);
    expect(KERNEL_MASKS.map((m) => edgesOf(m).join(''))).toEqual([...SPECTRE_VALID_SUBSETS]);
    for (const a of KERNEL_MASKS) {
      for (const b of KERNEL_MASKS) {
        expect(KERNEL_MASKS).toContain(xorMask(a, b));
      }
      expect(xorMask(a, a)).toBe(0); // every element its own inverse
      expect(oddTypes(setOf(a))).toEqual([]);
    }
    // The copy's worked example: {0,1,3,6} + {1,5} = {0,3,5,6}.
    expect(edgesOf(xorMask(maskOf([0, 1, 3, 6]), maskOf([1, 5])))).toEqual([0, 3, 5, 6]);
  });

  it('never invites class 4', () => {
    expect(NEVER_INVITED).toEqual([4]);
  });

  it('picks sensible tiles for the seam and contract figures', () => {
    expect(hostOf(7)).toBe('Gamma1'); // the Mystic's private seam
    expect(hostOf(2)).toBe('Delta'); // a full 2.0/2.1/2.2 run, not Gamma1's tail-end
    expect(pairableUnder(2)).toBe('Lambda'); // two class-2 crossings, one chord
    expect(pairableUnder(1)).toBe('Pi'); // the copy's happy tile under class 1
    for (const major of [1, 2, 5]) {
      expect(crossingCount(pairableUnder(major), new Set([major])) % 2).toBe(0);
    }
    // Class 8 gives every tile it touches exactly one crossing, so there is no
    // pairable tile at all — the fallback still names one that owns the class.
    expect(crossingCount(pairableUnder(8), new Set([8]))).toBe(1);
  });

  it('splits a slider position into a contract, clamped to the seam', () => {
    expect(contractAt(1.5, 3)).toEqual({ minor: 1, t: 0.5 });
    expect(contractAt(-4, 3)).toEqual({ minor: 0, t: 0 });
    expect(contractAt(3, 3)).toEqual({ minor: 2, t: 1 });
    expect(contractAt(9, 1)).toEqual({ minor: 0, t: 1 });
  });

  it('gives the matchmaker figure two tiles with four crossings each', () => {
    expect(crossingCount('Psi', new Set([1, 5]))).toBe(4);
    expect(crossingCount('Theta', new Set([2, 5, 7, 8]))).toBe(4);
  });

  it('builds matching records that round-trip to their combination strings', () => {
    for (const profile of PROFILES) {
      const record = matchingRecord(profile.subset, profile.combo);
      expect(Object.keys(record).sort()).toEqual([...leafOrder('spectre')].sort());
      const indices = leafOrder('spectre').map((t) => record[t]);
      expect(matchingIndicesToCombo('spectre', profile.subset, indices)).toBe(profile.combo);
    }
  });

  it('formats and links rules the way the article talks about them', () => {
    expect(maskLabel(maskOf([1, 5]))).toBe('{1, 5}');
    expect(maskLabel(0)).toBe('∅');
    expect(maskDigits(maskOf([2, 5, 7, 8]))).toBe('2578');
    const href = explorerHref([2, 5, 7, 8], { level: 3, combo: '0100101100' });
    expect(href).toContain('#/explorer?');
    expect(href).toContain('e=2578');
    expect(href).toContain('c=0100101100');
    expect(href).toContain('lv=3');
  });

  it('names every section the page anchors', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      'spectre',
      'numbers',
      'game',
      'theta',
      'sad',
      'puzzle',
      'fingerprints',
      'matrix',
      'kernel',
      'drawings',
      'mirrors',
    ]);
  });

  it('survives a missing localStorage (node, private mode)', () => {
    expect(() => saveMasks('spectre.tails.test', [1, 2])).not.toThrow();
    expect(loadMasks('spectre.tails.test')).toBeInstanceOf(Set);
  });
});
