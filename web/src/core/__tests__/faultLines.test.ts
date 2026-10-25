import { describe, expect, it } from 'vitest';
import { LIGHT_STRAND_PALETTE, buildStrandGraph, comboOptionCounts, strandWorkspace } from '../strandGraph';
import { buildSystem, flatten } from '../tiles';
import {
  clusterBySimilarity,
  comboDigits,
  faultSignature,
  faultSimilarity,
  patchAddresses,
  patchSpan,
  placeStrands,
  rasterizeFaultCentres,
  seamLevels,
  sharedDigits,
  sharedLevel,
  surveyFaults,
} from '../faultLines';

const L = 4;

describe('patch addresses', () => {
  const addr = patchAddresses('spectre', L);
  const insts = flatten(buildSystem('spectre', L)['Delta']);

  it('names each tile, then each supertile, up to the whole patch', () => {
    expect(addr.nTiles).toBe(insts.length);
    expect(addr.ancestorCount[0]).toBe(insts.length);
    expect(addr.ancestorCount[L]).toBe(1);
    for (let d = 1; d <= L; d++) expect(addr.ancestorCount[d]).toBeLessThan(addr.ancestorCount[d - 1]);
    // The level-(L−1) supertiles of a level-L Delta are its children; there are as many as in a level-1 Delta.
    expect(addr.ancestorCount[L - 1]).toBe(flatten(buildSystem('spectre', 1)['Delta']).length - 1);
    // A patch spans λ^L with λ ≈ 2.8.
    expect(Math.pow(patchSpan(addr), 1 / L)).toBeGreaterThan(2.5);
    expect(Math.pow(patchSpan(addr), 1 / L)).toBeLessThan(3.1);
  });

  it('keeps the two halves of a Gamma in one level-1 supertile', () => {
    const g1 = insts.findIndex((t) => t.type === 'Gamma1');
    const g2 = insts.findIndex((t, i) => i > g1 && t.type === 'Gamma2' && t.id.split('.').slice(0, -1).join('.') === insts[g1].id.split('.').slice(0, -1).join('.'));
    expect(g2).toBeGreaterThan(g1);
    expect(sharedLevel(addr, g1, g2)).toBe(1);
    expect(sharedLevel(addr, g1, g1)).toBe(0);
  });

  it('puts every crossing on a seam of level 1..L, or L + 1 on the patch edge', () => {
    const g = buildStrandGraph('spectre', [0, 3, 5, 6], L);
    const seams = seamLevels(g, addr);
    for (let n = 0; n < g.nNodes; n++) {
      const lv = seams.nodeLevel[n];
      if (g.nodeDeg[n] === 1) expect(lv).toBe(L + 1);
      else expect(lv >= 1 && lv <= L).toBe(true);
    }
    // Every level has fault lines, and there are fewer the higher the level.
    for (let s = 1; s <= L; s++) expect(seams.perLevel[s]).toBeGreaterThan(0);
    expect(seams.perLevel[L]).toBeLessThan(seams.perLevel[1]);
  });
});

describe('placing and comparing pairings', () => {
  const addr = patchAddresses('spectre', L);
  const place = (rule: string, combo: string) => {
    const g = buildStrandGraph('spectre', [...rule].map(Number), L);
    return placeStrands(g, addr, comboDigits(combo, g.types.length), strandWorkspace(g));
  };

  it('finds no big strands in a bounded rule, and big ones in a growing one', () => {
    const bounded = place('15', '0000000000');
    expect(bounded.longest).toBeLessThan(patchSpan(addr) / 8);
    expect(bounded.tileBand.every((b) => b === 0)).toBe(true);
    const growing = place('0356', '0000000000');
    expect(growing.longest).toBeGreaterThan(patchSpan(addr));
    expect(growing.tileBand.some((b) => b === 3)).toBe(true);
    // Its big strands sit on some seam levels more than others.
    const aff = growing.faultAffinity.slice(1, L + 1).filter((v) => Number.isFinite(v));
    expect(Math.max(...aff)).toBeGreaterThan(1);
  });

  it('scores identical placements 1, two bounded rules 1, and bounded against growing 0', () => {
    const a = faultSignature(place('0356', '0000000000'), addr, 1);
    const b = faultSignature(place('15', '0000000000'), addr, 1);
    const c = faultSignature(place('15', '0000100100'), addr, 1);
    expect(faultSimilarity(a, a)).toBe(1);
    expect(faultSimilarity(b, c)).toBe(1);
    expect(faultSimilarity(a, b)).toBe(0);
  });

  it('draws circuit centres as dots, the big ones in the big-strand colours', () => {
    const g = buildStrandGraph('spectre', [0, 3, 5, 6], L);
    const img = rasterizeFaultCentres(g, addr, comboDigits('0000000000', g.types.length), 120, LIGHT_STRAND_PALETTE);
    const colours = new Set<string>();
    let lit = 0;
    for (let p = 0; p < img.length; p += 4) {
      if (!img[p + 3]) continue;
      lit++;
      colours.add(`${img[p]},${img[p + 1]},${img[p + 2]}`);
    }
    expect(lit).toBeGreaterThan(0);
    expect(colours.has(LIGHT_STRAND_PALETTE.smallCircuit.join(','))).toBe(true);
    expect([...LIGHT_STRAND_PALETTE.bands].some((b) => colours.has(b.join(',')))).toBe(true);
    // Dots only: far fewer pixels than the strands drawn.
    expect(lit).toBeLessThan(120 * 120 * 0.5);
  });

  it('compares more leniently at a coarser grain', () => {
    const p = place('0356', '0000000000');
    const q = place('023678', '1000000000');
    const fine = faultSimilarity(faultSignature(p, addr, 0), faultSignature(q, addr, 0));
    const coarse = faultSimilarity(faultSignature(p, addr, 2), faultSignature(q, addr, 2));
    expect(coarse).toBeGreaterThanOrEqual(fine);
  });
});

describe('surveys and groups', () => {
  it('compares every pairing with every other, symmetrically', () => {
    const s = surveyFaults('spectre', 3, [
      { subset: [1, 5], combos: ['0000000000', '0000100100'] },
      { subset: [0, 3, 5, 6], combos: ['0000000000', '1000000000'] },
    ], 1);
    const n = s.items.length;
    expect(n).toBe(4);
    expect(s.items.map((i) => i.rule)).toEqual(['15', '15', '0356', '0356']);
    for (let i = 0; i < n; i++) {
      expect(s.matrix[i * n + i]).toBe(1);
      for (let j = 0; j < n; j++) expect(s.matrix[i * n + j]).toBe(s.matrix[j * n + i]);
    }
  });

  it('groups pairings whose average likeness reaches the threshold', () => {
    // 0 and 1 alike, 2 and 3 alike, the pairs unlike each other.
    const m = Float32Array.from([1, 0.9, 0.1, 0.2, 0.9, 1, 0.2, 0.1, 0.1, 0.2, 1, 0.8, 0.2, 0.1, 0.8, 1]);
    expect(clusterBySimilarity(m, 4, 0.5).clusters.map((c) => [...c].sort())).toEqual([[0, 1], [2, 3]]);
    expect(clusterBySimilarity(m, 4, 0.95).clusters.length).toBe(4);
    expect(clusterBySimilarity(m, 4, 0.1).clusters).toHaveLength(1);
    expect([...clusterBySimilarity(m, 4, 0.5).order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('marks the digits that vary inside a group, per rule', () => {
    expect(sharedDigits([
      { rule: '0356', combo: '1000000100' },
      { rule: '0356', combo: '1000001100' },
      { rule: '023678', combo: '0400000010' },
    ])).toEqual([
      { rule: '0356', pattern: '100000·100', count: 2 },
      { rule: '023678', pattern: '0400000010', count: 1 },
    ]);
  });

  it('reads combination digits like the Explorer, padding with zeros', () => {
    expect(comboDigits('01a', 5)).toEqual([0, 1, 10, 0, 0]);
    expect(comboOptionCounts('spectre', [1, 5]).length).toBe(10);
  });
});
