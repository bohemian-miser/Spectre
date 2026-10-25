import { describe, expect, it } from 'vitest';
import {
  SIZE_STEP,
  centreMap,
  chamferMatrix,
  distanceTransform,
  gridFor,
  seriate,
  sizeBand,
  type CentreSet,
} from '../centreMap';
import { comboDigitsFromIndex, comboOptionCounts } from '../strandGraph';
import { comboToMatchingIndices } from '../matchings';
import { matchesJoins, matchesPattern, pairingEdgeChords, selectionPatterns, selectionTileChords } from '../pairingSearch';
import { accumulateStrands, overlayImage, patchFrame } from '../centreMap';
import { buildStrandGraph } from '../strandGraph';
import { leafOrder } from '../families';
import { comboDigits } from '../faultLines';

let seed = 3;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const set = (pts: readonly (readonly [number, number, number?])[]): CentreSet => ({
  xs: Float64Array.from(pts.map((p) => p[0])),
  ys: Float64Array.from(pts.map((p) => p[1])),
  lens: Float64Array.from(pts.map((p) => p[2] ?? 6)),
  n: pts.length,
});

describe('distance transform', () => {
  it('is the exact squared distance to the nearest marked cell', () => {
    for (const size of [1, 7, 33]) {
      const m = new Uint8Array(size * size);
      const pts: [number, number][] = [];
      for (let k = 0; k < Math.max(1, size); k++) {
        const i = Math.floor(rand() * size);
        const j = Math.floor(rand() * size);
        m[j * size + i] = 1;
        pts.push([i, j]);
      }
      const dt = distanceTransform(m, size);
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const best = Math.min(...pts.map(([x, y]) => (x - i) ** 2 + (y - j) ** 2));
          expect(dt[j * size + i]).toBe(best);
        }
      }
    }
  });

  it('leaves everything far when nothing is marked', () => {
    expect(distanceTransform(new Uint8Array(9), 3).every((v) => v >= 1e19)).toBe(true);
  });
});

describe('directed chamfer distance', () => {
  // A grid of unit cells over [0, 20]², every cell in the window.
  const grid = gridFor(0, 0, 20, 20, 21);
  const window = new Uint8Array(21 * 21).fill(1);

  it('matches brute force: the mean distance from each of A’s dots to B’s nearest', () => {
    const sets = Array.from({ length: 4 }, () => set(Array.from({ length: 6 }, () => [Math.round(rand() * 20), Math.round(rand() * 20)] as const)));
    const m = chamferMatrix(sets, grid, window, { matchSizes: false, weightBySize: false });
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const A = sets[a];
        const B = sets[b];
        let sum = 0;
        for (let i = 0; i < A.n; i++) {
          let best = Infinity;
          for (let k = 0; k < B.n; k++) best = Math.min(best, Math.hypot(A.xs[i] - B.xs[k], A.ys[i] - B.ys[k]));
          sum += best;
        }
        expect(m[a * 4 + b]).toBeCloseTo(sum / A.n, 5);
      }
      expect(m[a * 4 + a]).toBe(0);
    }
  });

  it('is directed: a subset is at distance 0 from its superset, not the other way', () => {
    const small = set([[2, 2]]);
    const big = set([[2, 2], [12, 2]]);
    const m = chamferMatrix([small, big], grid, window, { matchSizes: false, weightBySize: false });
    expect(m[0 * 2 + 1]).toBe(0);
    expect(m[1 * 2 + 0]).toBeCloseTo(5, 5);
  });

  it('with sizes matched, a big centre is far from a small one in the same place', () => {
    const a = set([[5, 5, 5000]]);
    const b = set([[5, 5, 6], [9, 5, 4500]]);
    const plain = chamferMatrix([a, b], grid, window, { matchSizes: false, weightBySize: false });
    const sized = chamferMatrix([a, b], grid, window, { matchSizes: true, weightBySize: false });
    expect(plain[1]).toBe(0);
    // The big dot 4 away in the same size band beats the small one on top of it (several bands away).
    expect(sizeBand(5000)).toBe(sizeBand(4500));
    expect(sized[1]).toBeCloseTo(4, 5);
    expect(SIZE_STEP * (sizeBand(5000) - sizeBand(6))).toBeGreaterThan(4);
  });

  it('only averages dots inside the window, weighting big circuits more when asked', () => {
    const w = new Uint8Array(21 * 21);
    w[5 * 21 + 5] = 1;
    const a = set([[5, 5], [15, 15]]);
    const b = set([[8, 5]]);
    const m = chamferMatrix([a, b], grid, w, { matchSizes: false, weightBySize: false });
    expect(m[1]).toBeCloseTo(3, 5);
    const weighted = chamferMatrix([set([[5, 5, 1000], [8, 5, 2]]), b], grid, window, { matchSizes: false, weightBySize: true });
    expect(weighted[1]).toBeCloseTo((Math.log(1001) * 3) / (Math.log(1001) + Math.log(3)), 5);
  });

  it('compares real pairings: zero on the diagonal, different rules apart', () => {
    const rule = (subset: number[], n: number) => {
      const oc = comboOptionCounts('spectre', subset);
      return { subset, combos: Array.from({ length: n }, (_, i) => comboDigitsFromIndex(oc, i)) };
    };
    const r = centreMap('spectre', 3, [rule([1, 5], 2), rule([0, 3, 5, 6], 2)], { matchSizes: true, weightBySize: true });
    const n = 4;
    for (let i = 0; i < n; i++) expect(r.matrix[i * n + i]).toBe(0);
    expect(r.counts.every((c) => c.all >= c.inside && c.inside > 0)).toBe(true);
    expect(r.matrix[0 * n + 2]).toBeGreaterThan(0);
  });
});

describe('seriation', () => {
  it('orders rows so blocks of alike ones come out together, as a permutation', () => {
    // Three hidden blocks, shuffled: near within a block, far across, and not quite symmetric.
    const block = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2];
    const n = block.length;
    const m = new Float32Array(n * n);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) m[a * n + b] = a === b ? 0 : block[a] === block[b] ? 1 + rand() * 0.5 : 10 + rand();
    const order = seriate(m, n);
    expect([...order].sort((x, y) => x - y)).toEqual(Array.from({ length: n }, (_, i) => i));
    const runs = order.map((i) => block[i]).filter((b, k, arr) => k === 0 || b !== arr[k - 1]);
    expect(runs).toHaveLength(3);
    // Neighbours in the order are closer than in the original one.
    const adjacent = (o: readonly number[]) => o.slice(1).reduce((t, i, k) => t + m[o[k] * n + i], 0);
    expect(adjacent(order)).toBeLessThan(adjacent(Array.from({ length: n }, (_, i) => i)));
    expect(seriate(new Float32Array(0), 0)).toEqual([]);
    expect(seriate(Float32Array.from([0]), 1)).toEqual([0]);
  });
});

describe('pairing search', () => {
  it('matches combination strings with ? wildcards, a short pattern leaving the rest free', () => {
    expect(matchesPattern('1011000010', '1?1')).toBe(true);
    expect(matchesPattern('1011000010', '1??1??0010')).toBe(true);
    expect(matchesPattern('1011000010', '0')).toBe(false);
    expect(matchesPattern('1011000010', '')).toBe(true);
  });

  it('finds pairings by what a tile joins', () => {
    const subset = [0, 3, 5, 6];
    const types = leafOrder('spectre');
    const oc = comboOptionCounts('spectre', subset);
    const t = oc.findIndex((k) => k > 1);
    const type = types[t];
    const combos = Array.from({ length: oc[t] }, (_, d) => Array.from({ length: types.length }, (_, i) => (i === t ? d : 0)).join(''));
    // The first chord of each option, as a join, picks out that option (and only options with that chord).
    for (const combo of combos) {
      const [p, q] = pairingEdgeChords('spectre', subset, combo, type)[0];
      const join = { type, a: p[0], b: q[0] };
      expect(matchesJoins('spectre', subset, combo, [join])).toBe(true);
    }
    const chords = combos.map((c) => pairingEdgeChords('spectre', subset, c, type).map(([p, q]) => `${p[0]}-${q[0]}`).sort().join(','));
    expect(new Set(chords).size).toBe(combos.length);
    // No join at all matches everything; a join on an edge with no strand matches nothing.
    expect(matchesJoins('spectre', subset, combos[0], [])).toBe(true);
    expect(matchesJoins('spectre', subset, combos[0], [{ type, a: 0, b: 0 }])).toBe(false);
    expect(comboToMatchingIndices('spectre', subset, combos[0]).length).toBe(types.length);
  });
});

describe('selections', () => {
  const items = ['0000000000', '0100000000', '0110000000', '0100000001'].map((combo) => ({ rule: '1278', subset: [1, 2, 7, 8], combo }));

  it('sums a rule\'s selected combination strings up as one pattern, with the values each digit takes', () => {
    const [p] = selectionPatterns('spectre', [...items, { rule: '15', subset: [1, 5], combo: '0000000000' }]);
    expect(p.rule).toBe('1278');
    expect(p.count).toBe(4);
    expect(p.pattern).toBe('0??000000?');
    expect(p.spread[1].values).toEqual([{ digit: '1', count: 3 }, { digit: '0', count: 1 }]);
    expect(p.spread[0].values).toEqual([{ digit: '0', count: 4 }]);
    expect(p.spread[1].type).toBe(leafOrder('spectre')[1]);
    expect(selectionPatterns('spectre', items)).toHaveLength(1);
  });

  it('tallies the paths the selection draws on a tile', () => {
    const type = leafOrder('spectre')[1];
    const chords = selectionTileChords('spectre', items, type);
    const total = chords.reduce((t, c) => t + c.count, 0);
    // Every pairing draws the same number of chords on the tile; two options, split 1 : 3.
    const perPairing = pairingEdgeChords('spectre', [1, 2, 7, 8], '0000000000', type).length;
    expect(total).toBe(perPairing * items.length);
    expect(Math.max(...chords.map((c) => c.count))).toBeLessThanOrEqual(items.length);
    expect(new Set(chords.map((c) => c.count)).has(1)).toBe(true);
  });

  it('overlays strands: each pixel counts the pairings through it, once each', () => {
    const g = buildStrandGraph('spectre', [1, 2, 7, 8], 2);
    const frame = patchFrame([g], 64);
    const counts = new Uint16Array(64 * 64);
    const stamp = new Uint32Array(64 * 64);
    accumulateStrands(g, comboDigits('0000000000', g.types.length), frame, counts, stamp, 1);
    const once = counts.reduce((t, c) => t + c, 0);
    expect(once).toBeGreaterThan(0);
    expect(Math.max(...counts)).toBe(1);
    accumulateStrands(g, comboDigits('0000000000', g.types.length), frame, counts, stamp, 2);
    expect(Math.max(...counts)).toBe(2);
    const img = overlayImage(counts, 2, true);
    let lit = 0;
    for (let p = 3; p < img.length; p += 4) if (img[p]) lit++;
    expect(lit).toBe(once);
  });
});
