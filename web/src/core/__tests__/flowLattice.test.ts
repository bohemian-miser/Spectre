import { describe, expect, it } from 'vitest';
import {
  combine,
  directedMatchings,
  defaultAxes,
  flowModel,
  hexMeetings,
  hexPatch,
  integerKernel,
  isCircuit,
  linesNeeded,
  pairStrands,
  tileStrandPoints,
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
