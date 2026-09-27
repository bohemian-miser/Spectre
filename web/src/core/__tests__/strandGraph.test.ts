import { describe, expect, it } from 'vitest';
import {
  analyze,
  buildSystem,
  buildStrandGraph,
  comboDigitsFromIndex,
  comboOptionCounts,
  comboToMatchingIndices,
  flatten,
  leafOrder,
  rasterizeStrands,
  strandComboCount,
  strandComponents,
} from '..';

describe('strandGraph', () => {
  const subset = [2, 5, 7, 8];
  const g = buildStrandGraph('spectre', subset, 3);

  it('enumerates combinations in lexicographic order of the combo string', () => {
    const counts = comboOptionCounts('spectre', subset);
    expect(strandComboCount(g)).toBe(counts.reduce((a, b) => a * b, 1));
    const strings = Array.from({ length: strandComboCount(g) }, (_, i) =>
      comboDigitsFromIndex(counts, i).join(''),
    );
    expect([...strings].sort()).toEqual(strings);
    expect(strings[0]).toBe('0000000000');
  });

  it('agrees with analyze() on circuits and tails for every combination', () => {
    const instances = flatten(buildSystem('spectre', 3)['Delta']);
    const counts = comboOptionCounts('spectre', subset);
    for (let i = 0; i < strandComboCount(g); i += 7) {
      const digits = comboDigitsFromIndex(counts, i);
      const combo = digits.join('');
      const idx = comboToMatchingIndices('spectre', subset, combo);
      const matchingIndexByType: Record<string, number> = {};
      leafOrder('spectre').forEach((t, k) => (matchingIndexByType[t] = idx[k]));
      const ref = analyze({ family: 'spectre', instances, selected: new Set(subset), matchingIndexByType });
      const c = strandComponents(g, digits);
      let closed = 0;
      let open = 0;
      let longest = 0;
      for (let k = 0; k < c.n; k++) {
        if (c.segs[k] === 0) continue;
        if (c.ends[k] === 0) {
          closed++;
          longest = Math.max(longest, c.segs[k]);
        } else open++;
      }
      expect(closed).toBe(ref.circuits.length);
      expect(open).toBe(ref.tails.length);
      expect(longest).toBe(Math.max(0, ...ref.circuits.map((p) => p.points.length)));
    }
  });

  it('rasterises into an RGBA buffer with some ink', () => {
    const img = rasterizeStrands(g, comboDigitsFromIndex(comboOptionCounts('spectre', subset), 5), 64);
    expect(img.length).toBe(64 * 64 * 4);
    let inked = 0;
    for (let p = 3; p < img.length; p += 4) if (img[p]) inked++;
    expect(inked).toBeGreaterThan(200);
  });
});

describe('decomposeCombo', () => {
  it('splits the Tile(1,1) full rule only as 15 + 023678, and only for 640 combinations', async () => {
    const { decomposeCombo, ruleSplits, splitTable } = await import('..');
    const rule = [0, 1, 2, 3, 5, 6, 7, 8];
    expect(ruleSplits('spectre', rule).map((s) => s.parts.join('+'))).toEqual([
      '0136+2578',
      '0356+1278',
      '023678+15',
    ]);
    const counts = ruleSplits('spectre', rule).map((s) =>
      splitTable('spectre', rule, s).table.reduce((a, row) => a * row.filter(Boolean).length, 1),
    );
    expect(counts).toEqual([0, 0, 640]);
    expect(decomposeCombo('spectre', rule, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual([]);
  });

  it('a decomposed combination has exactly its parts’ strands', async () => {
    const { decomposeCombo, splitTable, ruleSplits } = await import('..');
    const rule = [0, 1, 2, 3, 5, 6, 7, 8];
    const split = ruleSplits('spectre', rule)[2];
    const t = splitTable('spectre', rule, split).table;
    const digits = t.map((row) => row.findIndex(Boolean));
    const [dec] = decomposeCombo('spectre', rule, digits);
    const lengths = (r: number[], d: readonly number[]) => {
      const c = strandComponents(buildStrandGraph('spectre', r, 3), d);
      const out: number[] = [];
      for (let k = 0; k < c.n; k++) if (c.segs[k]) out.push(c.segs[k] * (c.ends[k] ? -1 : 1));
      return out;
    };
    const whole = lengths(rule, digits).sort((a, b) => a - b);
    const union = dec.parts
      .flatMap((p) => lengths([...p.rule].map(Number), p.digits))
      .sort((a, b) => a - b);
    expect(whole).toEqual(union);
  });
});

describe('circuitNesting', () => {
  it('matches brute-force point-in-polygon on real patterns', async () => {
    const { circuitNesting } = await import('..');
    // Triangle fractals nest deeply; 15 and 2578 barely nest.
    const cases: [number[], number][] = [
      [[0, 3, 5, 6], 3],
      [[0, 2, 3, 6, 7, 8], 4],
      [[2, 5, 7, 8], 4],
      [[0, 1, 2, 3, 5, 6, 7, 8], 3],
    ];
    for (const [rule, level] of cases) {
      const g = buildStrandGraph('spectre', rule, level);
      const counts = comboOptionCounts('spectre', rule);
      const total = counts.reduce((a, b) => a * b, 1);
      for (const i of [0, Math.floor(total / 3), total - 1]) {
        const c = strandComponents(g, comboDigitsFromIndex(counts, i));
        const fast = circuitNesting(g, c);
        // Brute force: polygon of each circuit, depth = circuits containing a point of it.
        const polys = new Map<number, [number, number][]>();
        for (let n = 0; n < g.nNodes; n++) {
          const k = c.comp[n];
          if (fast.depth[k] < 0) continue;
          if (!polys.has(k)) {
            const pts: [number, number][] = [];
            let node = n;
            let occ = g.nodeOcc[g.nodeOccStart[n]];
            for (;;) {
              pts.push([g.nodeX[node], g.nodeY[node]]);
              const p = c.partner[occ];
              node = g.occNode[p];
              if (node === n) break;
              const k0 = g.nodeOccStart[node];
              occ = g.nodeOcc[k0] === p ? g.nodeOcc[k0 + 1] : g.nodeOcc[k0];
            }
            polys.set(k, pts);
          }
        }
        const inside = (x: number, y: number, poly: [number, number][]) => {
          if (poly.length < 3) return false; // a 2-cycle encloses nothing
          let on = false;
          for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
            const [xa, ya] = poly[a];
            const [xb, yb] = poly[b];
            if (ya > y !== yb > y && x < xa + ((y - ya) / (yb - ya)) * (xb - xa)) on = !on;
          }
          return on;
        };
        let maxD = 0;
        let sum = 0;
        for (const [k, poly] of polys) {
          const [x, y] = [poly[0][0] + 1e-6, poly[0][1] + 1.3e-6];
          let d = 0;
          for (const [k2, other] of polys) if (k2 !== k && inside(x, y, other)) d++;
          expect(fast.depth[k]).toBe(d);
          maxD = Math.max(maxD, d);
          sum += d;
        }
        expect(fast.maxDepth).toBe(maxD);
        expect(fast.depthSum).toBe(sum);
      }
    }
  });
});

describe('bridgeStats', () => {
  it('matches explicit polygons and the outline encloses the whole patch', async () => {
    const { bridgeStats, patchBoundary } = await import('..');
    for (const [family, rule, level] of [
      ['spectre', [2, 5, 7, 8], 3],
      ['spectre', [1, 2, 7, 8], 3],
      ['spectre', [0, 1, 2, 3, 5, 6, 7, 8], 3],
      ['hex', [1, 2, 8], 3],
    ] as const) {
      const g = buildStrandGraph(family, [...rule], level);
      const b = patchBoundary(g);
      expect(b.twiceArea / 2).toBeCloseTo(g.patchArea, 6);
      const counts = comboOptionCounts(family, [...rule]);
      const d = comboDigitsFromIndex(counts, Math.floor(counts.reduce((x, y) => x * y, 1) / 2));
      const c = strandComponents(g, d);
      const fast = bridgeStats(g, c);
      // Brute force: build each side's polygon explicitly.
      const m = b.xs.length;
      const at = (pos: number): [number, number] => {
        const i = Math.floor(pos) % m;
        const j = (i + 1) % m;
        const t = pos - Math.floor(pos);
        return [b.xs[i] + t * (b.xs[j] - b.xs[i]), b.ys[i] + t * (b.ys[j] - b.ys[i])];
      };
      const ratios: number[] = [];
      const seen = new Set<number>();
      for (let n = 0; n < g.nNodes; n++) {
        const k = c.comp[n];
        if (g.nodeDeg[n] !== 1 || seen.has(k) || c.ends[k] !== 2 || c.junc[k] !== 0) continue;
        seen.add(k);
        const poly: [number, number][] = [];
        let node = n;
        let occ = g.nodeOcc[g.nodeOccStart[n]];
        poly.push([g.nodeX[n], g.nodeY[n]]);
        for (;;) {
          const p = c.partner[occ];
          node = g.occNode[p];
          poly.push([g.nodeX[node], g.nodeY[node]]);
          if (g.nodeDeg[node] === 1) break;
          const k0 = g.nodeOccStart[node];
          occ = g.nodeOcc[k0] === p ? g.nodeOcc[k0 + 1] : g.nodeOcc[k0];
        }
        // Outline forward from the far end back to the start.
        let pos = b.nodePos[node];
        const end = b.nodePos[n];
        let target = end >= pos ? end : end + m;
        if (Math.floor(end) === Math.floor(pos) && end >= pos) target = end;
        for (let v = Math.floor(pos) + 1; v <= Math.floor(target); v++) poly.push([b.xs[v % m], b.ys[v % m]]);
        poly.push(at(end));
        let s = 0;
        for (let i = 0; i < poly.length; i++) {
          const [x1, y1] = poly[i];
          const [x2, y2] = poly[(i + 1) % poly.length];
          s += x1 * y2 - x2 * y1;
        }
        const side = s / 2;
        const smaller = Math.max(0, Math.min(side, g.patchArea - side));
        ratios.push(smaller / b.tileArea / c.segs[k]);
        pos = 0;
      }
      expect(fast.count).toBe(ratios.length);
      if (ratios.length) {
        expect(fast.max).toBeCloseTo(Math.max(...ratios), 9);
        expect(fast.min).toBeCloseTo(Math.min(...ratios), 9);
        expect(fast.mean).toBeCloseTo(ratios.reduce((x, y) => x + y, 0) / ratios.length, 9);
      }
    }
  });
});
