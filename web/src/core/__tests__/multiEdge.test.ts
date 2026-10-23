import { describe, expect, it } from 'vitest';
import {
  countWithin,
  cubeCoords,
  factorSignature,
  formatVector,
  gf2Rref,
  isAtom,
  multiEdgeModel,
  pairingFactorisation,
  nonCrossingPairings,
  tileEndPoints,
  tileEnds,
  traceLoops,
  type Pairing,
} from '../multiEdge';
import { HEX_PTS } from '../families';
import { hexPatch } from '../flowLattice';

const sel = (m: ReturnType<typeof multiEdgeModel>, v: readonly number[]) => m.classes.filter((_, k) => v[k]).join('');

describe('multiEdge', () => {
  it('finds the three hexagon basis selections from the Spectre project, class 0 included', () => {
    const m = multiEdgeModel();
    expect(m.classes).toEqual([0, 1, 2, 3, 4, 5, 6, 8]);
    expect(m.basis.map((b) => sel(m, b))).toEqual(['15', '128', '01346']);
  });

  it('row reduces mod 2 to rank 5, naming the rows behind each reduced row', () => {
    const m = multiEdgeModel();
    const r = gf2Rref(m.counts);
    expect(r.rows).toHaveLength(5);
    expect(r.redundant).toHaveLength(4);
    // Each reduced row really is the XOR of the rows it names.
    r.rows.forEach((row, i) => {
      const xor = m.counts[0].map((_, k) => r.from[i].reduce((a, t) => a ^ (m.counts[t][k] & 1), 0));
      expect(xor).toEqual(row);
    });
  });

  it('counts are valid exactly when their parity is a basis combination', () => {
    const m = multiEdgeModel();
    const x = (o: Record<number, number>) => m.classes.map((c) => o[c] ?? 0);
    expect(tileEnds(m, x({ 8: 2 })).every((e) => e % 2 === 0)).toBe(true);
    expect(cubeCoords(m, x({ 8: 2 }))).toEqual([0, 0, 0]);
    expect(cubeCoords(m, x({ 1: 3, 5: 1 }))).toEqual([1, 0, 0]);
    expect(cubeCoords(m, x({ 8: 1 }))).toBeNull();
  });

  it('counts the valid vectors in a box without listing them', () => {
    const m = multiEdgeModel();
    expect(countWithin(m, 1)).toBe(8);
    expect(countWithin(m, 2)).toBe(405);
    expect(countWithin(m, 3)).toBe(2048);
  });

  it('non-crossing pairings are Catalan', () => {
    expect([0, 2, 4, 6, 8].map((n) => nonCrossingPairings(n).pairings.length)).toEqual([1, 1, 2, 5, 14]);
    expect(nonCrossingPairings(3).pairings).toHaveLength(0);
    expect(nonCrossingPairings(20, 7)).toMatchObject({ truncated: true });
  });

  it('traces undirected loops and open paths', () => {
    const p = (x: number, y: number) => ({ x, y });
    const square = [
      { a: p(0, 0), b: p(1, 0) },
      { a: p(1, 1), b: p(1, 0) }, // either way round
      { a: p(1, 1), b: p(0, 1) },
      { a: p(0, 0), b: p(0, 1) },
    ];
    const path = [{ a: p(6, 0), b: p(7, 0) }, { a: p(5, 0), b: p(6, 0) }];
    const loops = traceLoops([square[2], ...path, square[0], square[3], square[1]]);
    expect(loops.filter((l) => l.closed).map((l) => l.segments.length)).toEqual([4]);
    expect(loops.filter((l) => !l.closed).map((l) => l.segments.length)).toEqual([2]);
  });

  it('has 14 atoms with at most 2 strands per class: 6 selections and 8 pairs', () => {
    const m = multiEdgeModel();
    const atoms: string[] = [];
    for (let code = 1; code < 3 ** 8; code++) {
      const v = m.classes.map((_, k) => Math.floor(code / 3 ** k) % 3);
      if (isAtom(m, v)) atoms.push(formatVector(m, v));
    }
    expect(atoms).toHaveLength(14);
    expect(atoms).toContain('15');
    expect(atoms).toContain('88');
    expect(atoms).not.toContain('01234568');
  });

  it('reads a factorisation off the pairings, and different pairings split differently', () => {
    const m = multiEdgeModel();
    const x = m.classes.map((c) => (c === 1 || c === 5 ? 2 : 0));
    const seen = new Map<string, number>();
    const pairs = m.types.map((t) => nonCrossingPairings(tileEndPoints(m, t, x, HEX_PTS).length).pairings);
    const total = pairs.reduce((a, p) => a * p.length, 1);
    for (let n = 0; n < total; n++) {
      let r = n;
      const chosen: Record<string, Pairing> = {};
      m.types.forEach((t, i) => {
        chosen[t] = pairs[i][r % pairs[i].length];
        r = Math.floor(r / pairs[i].length);
      });
      const f = pairingFactorisation(m, x, chosen)!;
      // The factors always add back up to x, and each is valid.
      expect(f.factors.reduce((a, g) => a.map((v, k) => v + g.vector[k]), x.map(() => 0))).toEqual(x);
      const sig = factorSignature(m, f);
      seen.set(sig, (seen.get(sig) ?? 0) + 1);
    }
    // Drawn whole, as 15 twice, or as a pair on 1 beside a pair on 5.
    expect([...seen.keys()].sort()).toEqual(['11 + 55', '1155', '15 + 15']);
    expect(pairingFactorisation(m, x, {})).toBeNull();
  });

  it('every loop drawn in a patch stays inside one factor', () => {
    const m = multiEdgeModel();
    const tiles = hexPatch(3);
    const xs = [
      m.classes.map(() => 2),
      m.classes.map((c) => (c === 0 || c === 1 || c === 3 || c === 4 || c === 6 ? 2 : c === 5 ? 3 : 1)),
      m.classes.map((c) => (c === 0 ? 3 : c === 3 || c === 4 || c === 6 || c === 1 ? 1 : 0)),
    ];
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    let split = 0;
    for (const x of xs) {
      for (let round = 0; round < 40; round++) {
        const chosen: Record<string, Pairing> = {};
        for (const t of m.types) {
          const ps = nonCrossingPairings(tileEndPoints(m, t, x, HEX_PTS).length).pairings;
          chosen[t] = ps[rand(ps.length)];
        }
        const f = pairingFactorisation(m, x, chosen)!;
        if (f.factors.length > 1) split++;
        const segs: { a: { x: number; y: number }; b: { x: number; y: number }; factor: number }[] = [];
        for (const t of tiles) {
          const ends = tileEndPoints(m, t.inst.type, x, t.pts);
          for (const [i, j] of chosen[t.inst.type]) segs.push({ a: ends[i].pos, b: ends[j].pos, factor: f.endFactor[t.inst.type][i] });
        }
        for (const loop of traceLoops(segs)) expect(new Set(loop.segments.map((i) => segs[i].factor)).size).toBe(1);
      }
    }
    expect(split).toBeGreaterThan(20);
  });
});
