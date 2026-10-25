import { describe, expect, it } from 'vitest';
import {
  combine,
  directedMatchings,
  defaultAxes,
  echelonRows,
  flowModel,
  hexMeetings,
  hexPatch,
  integerKernel,
  isCircuit,
  linesNeeded,
  pairStrands,
  signedArea,
  traceStrandPaths,
  tileStrandPoints,
  liftZero,
  zeroFlow,
  zeroLines,
} from '../flowLattice';

describe('flowLattice', () => {
  it('every glued pair of hexagon edges is +k against -k, except class 0', () => {
    expect(hexMeetings()).toHaveLength(51);
    const labels = flowModel('labels');
    expect(labels.dropped).toEqual(['0']);
    expect(labels.vars.map((v) => v.label)).toEqual(['1', '2', '3', '4', '5', '6', '8']);
  });

  it('labels mode: a 2D lattice spanned by the 15 and 128 loops', () => {
    const m = flowModel('labels');
    expect(m.basis).toHaveLength(2);
    for (const b of m.basis) expect(isCircuit(m, b)).toBe(true);
    // 15, 128 and 258 all lift with one line per edge.
    const support = (x: readonly number[]) => x.flatMap((v, k) => (v ? [m.vars[k].label] : [])).join('');
    const singles = new Set<string>();
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) {
      const x = combine(m.basis, [a, b], m.vars.length);
      if (linesNeeded(x) <= 1) singles.add(support(x));
    }
    expect([...singles].sort()).toEqual(['', '128', '15', '258']);
  });

  it('groups mode: 12 orientable groups and a 5D lattice', () => {
    const m = flowModel('groups');
    expect(m.vars).toHaveLength(12);
    expect(m.dropped).toEqual(['0']);
    expect(m.basis).toHaveLength(5);
    for (const b of m.basis) expect(isCircuit(m, b)).toBe(true);
    const [i, j] = defaultAxes(m);
    expect(i).not.toBe(j);
  });

  it('integerKernel finds a whole-number basis, not a rational one', () => {
    // x - y = 0 and y + z = 0: kernel is t(1, 1, -1).
    expect(integerKernel([[1, -1, 0], [0, 1, 1]], 3)).toEqual([[1, 1, -1]]);
    // 2x = 0 kills x even though it is 0 mod 2.
    expect(integerKernel([[2, 0]], 2)).toEqual([[0, 1]]);
  });

  it('every tile of a patch balances and its strands pair up without crossing', () => {
    for (const mode of ['labels', 'groups'] as const) {
      const m = flowModel(mode);
      const x = combine(m.basis, m.basis.map((_, i) => (i % 2 ? -2 : 1)), m.vars.length);
      for (const t of hexPatch(2)) {
        const pts = tileStrandPoints(m, t.inst.type, x, t.pts);
        const strands = pairStrands(pts);
        expect(strands, `${mode} ${t.inst.type}`).not.toBeNull();
        expect(strands!.length * 2).toBe(pts.length);
      }
    }
  });

  it('class 0 either way: a 0 column, plus the ±2 pair in both modes; groups mode reaches 8D', () => {
    const labels = flowModel('labels', true);
    expect(labels.dropped).toEqual([]);
    expect(labels.zeroTypes).toEqual(['Theta', 'Xi', 'Phi', 'Psi']);
    expect(labels.vars.map((v) => v.label)).toEqual(['0', '1', '2', '3', '4', '5', '6', '8']);
    // Labels mode: the old two loops (no class-0 lines needed) and the pure pair.
    expect(labels.basis).toHaveLength(3);
    expect(labels.basis.filter((b) => zeroLines(labels, b) > 0)).toEqual([[2, 0, 0, 0, 0, 0, 0, 0]]);
    for (const b of labels.basis) expect(isCircuit(labels, b)).toBe(true);

    const m = flowModel('groups', true);
    expect(m.vars).toHaveLength(13);
    expect(m.basis).toHaveLength(8);
    for (const b of m.basis) expect(isCircuit(m, b)).toBe(true);
    // Some loops need class-0 lines alongside directed ones.
    expect(m.basis.some((b) => zeroLines(m, b) > 0 && b.some((v, k) => k !== m.zeroVar && v !== 0))).toBe(true);
    // Every old circuit is still one, once its class-0 lines are lifted.
    for (const b of flowModel('groups').basis) expect(isCircuit(m, liftZero(m, [0, ...b]))).toBe(true);
  });

  it('class 0 either way soaks up an imbalance of the right parity, and no more', () => {
    const m = flowModel('groups', true);
    const x = m.basis.find((b) => zeroLines(m, b) > 0 && b.some((v, k) => k !== m.zeroVar && v !== 0))!;
    const n = zeroLines(m, x);
    const z = zeroFlow(m, x);
    m.types.forEach((t, i) => {
      if (!m.zeroTypes.includes(t)) expect(z[i]).toBe(0);
      else expect((n - Math.abs(z[i])) % 2).toBe(0);
    });
    // One more line breaks the parity; two more is the same circuit with an extra in-and-out pair.
    const more = (d: number) => x.map((v, k) => (k === m.zeroVar ? v + d : v));
    expect(isCircuit(m, more(1))).toBe(false);
    expect(isCircuit(m, more(2))).toBe(true);
    // Too few lines can't take up the imbalance; lifting puts back just enough.
    const fewer = more(-2);
    expect(isCircuit(m, fewer)).toBe(false);
    expect(liftZero(m, fewer)).toEqual(x);
  });

  it('echelonRows: each row is its mix of tile rows, carrying ±1 per class-0 tile', () => {
    for (const mode of ['labels', 'groups'] as const) {
      for (const zero of [false, true]) {
        const m = flowModel(mode, zero);
        const rows = echelonRows(m);
        // Without class 0 the rows are exactly the matrix's rank: unknowns minus the lattice's dimension.
        if (!zero) expect(rows).toHaveLength(m.vars.length - m.basis.length);
        let lastPivot = -1;
        for (const r of rows) {
          r.entries.forEach((v, k) => {
            const want = k === m.zeroVar ? 0 : r.mix.reduce((a, c, i) => a + c * m.matrix[i][k], 0);
            expect(v).toBe(want);
          });
          expect(r.zero).toBe(m.zeroTypes.reduce((a, t) => a + Math.abs(r.mix[m.types.indexOf(t)]), 0));
          // Pivots step right, and nothing sits above or below a pivot.
          const p = r.entries.findIndex((v) => v !== 0);
          if (p >= 0) {
            expect(p).toBeGreaterThan(lastPivot);
            lastPivot = p;
            for (const o of rows) if (o !== r) expect(o.entries[p]).toBe(0);
          }
        }
        // Every circuit fits every reduced row: d within ±(zero·n), same parity.
        for (const b of m.basis) {
          const n = zeroLines(m, b);
          for (const r of rows) {
            const d = r.entries.reduce((a, v, k) => a + v * b[k], 0);
            expect(Math.abs(d)).toBeLessThanOrEqual(r.zero * n);
            expect((r.zero * n - Math.abs(d)) % 2).toBe(0);
          }
        }
      }
    }
  });

  it('pairStrands refuses an unbalanced boundary', () => {
    const p = (dir: 'in' | 'out') => ({ edge: 0, pos: { x: 0, y: 0 }, dir });
    expect(pairStrands([p('in'), p('in'), p('out')])).toBeNull();
    expect(pairStrands([p('out'), p('out'), p('in'), p('in')])).toHaveLength(2);
  });
});

describe('directedMatchings', () => {
  const pts = (dirs: string) => [...dirs].map((d) => ({ edge: 0, pos: { x: 0, y: 0 }, dir: (d === 'o' ? 'out' : 'in') as 'in' | 'out' }));

  it('counts the non-crossing ways to join each entry to an exit', () => {
    expect(directedMatchings(pts('')).matchings).toEqual([[]]);
    expect(directedMatchings(pts('ooii')).matchings).toHaveLength(1);
    expect(directedMatchings(pts('oioi')).matchings).toHaveLength(2);
    // Alternating ends: every non-crossing pairing joins opposite ends, so Catalan(3).
    expect(directedMatchings(pts('ioioio')).matchings).toHaveLength(5);
    expect(directedMatchings(pts('ooi')).matchings).toHaveLength(0);
  });

  it('always pairs an entry with an exit, and never crosses', () => {
    const p = pts('iooiio');
    for (const m of directedMatchings(p).matchings) {
      for (const [a, b] of m) {
        expect(p[a].dir).toBe('in');
        expect(p[b].dir).toBe('out');
      }
      const chords = m.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
      for (const [a1, a2] of chords) for (const [b1, b2] of chords) expect(a1 < b1 && b1 < a2 && a2 < b2).toBe(false);
    }
  });

  it('stops at the limit and says so', () => {
    const r = directedMatchings(pts('io'.repeat(8)), 10);
    expect(r.matchings).toHaveLength(10);
    expect(r.truncated).toBe(true);
  });
});

describe('traceStrandPaths', () => {
  const at = (x: number, y: number, dir: 'in' | 'out') => ({ edge: 0, pos: { x, y }, dir });
  const strand = (a: [number, number], b: [number, number]) => ({ from: at(a[0], a[1], 'in'), to: at(b[0], b[1], 'out') });

  it('joins strands exit to entry, closing loops and leaving open paths open', () => {
    const loop = [strand([0, 0], [1, 0]), strand([1, 0], [1, 1]), strand([1, 1], [0, 1]), strand([0, 1], [0, 0])];
    // An open path listed tail first, so tracing must find its head.
    const open = [strand([6, 0], [7, 0]), strand([5, 0], [6, 0])];
    const paths = traceStrandPaths([loop[2], ...open, loop[0], loop[3], loop[1]]);
    const closed = paths.filter((p) => p.closed);
    expect(closed).toHaveLength(1);
    expect(closed[0].strands).toHaveLength(4);
    const opens = paths.filter((p) => !p.closed);
    expect(opens).toHaveLength(1);
    expect(opens[0].strands).toEqual([2, 1]);
  });

  it('signedArea is positive for clockwise on screen (y down)', () => {
    const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(signedArea(square)).toBe(1);
    expect(signedArea([...square].reverse())).toBe(-1);
  });
});
