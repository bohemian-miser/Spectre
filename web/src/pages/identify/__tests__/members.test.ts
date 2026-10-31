import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CircuitShapes } from '../../shapes/circuitShapes';
import type { PageCombo } from '../../foundations/pageData';
import { topReading } from '../../buildup/deep';
import { arcTokens, IdentifyEngine, readArc, tileOf } from '../identify';
import { Members, type MemberSpec } from '../members';

const SUBSET = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';
const digits = [...COMBO].map((c) => parseInt(c, 36));
const known = JSON.parse(readFileSync(resolve(__dirname, '../../../../public/data/foundations/hex-023468/140000001.json'), 'utf8')) as PageCombo;

function engineOn(level: number, length: number, cap: number): IdentifyEngine {
  const cs = new CircuitShapes('hex', SUBSET, digits, level, 1, false);
  const c = cs.born.find((b) => b.level === level && b.length === length && b.type === 'Delta')!;
  const at = tileOf(cs, c, Math.floor(length / 2));
  const e = new IdentifyEngine({ subset: SUBSET, combo: COMBO, tile: at.tile, edge: at.edge, level, cap, known });
  while (!e.done) e.step();
  return e;
}

describe('the members an identification shows', () => {
  it('reads an open strand as the identification does, beside the candidate carried up from its chain', () => {
    // the 14,679 built only to level 4: open there, most likely the 303's harmonic closing at level 6
    const e = engineOn(6, 14679, 4);
    const m = new Members(e);
    const strand: MemberSpec = { kind: 'strand', level: 4, birth: 6 };
    const cand: MemberSpec = { kind: 'predicted', from: { level: 4, length: 303 }, level: 6 };
    const lowest: MemberSpec = { kind: 'built', level: 4, length: 303 };
    const specs = [strand, cand, lowest];
    // k = 1: the strand and the candidate at level 3, the 303 at level 1
    const rows = m.rows(specs, 1);
    expect(rows.members.map((r) => r.levels.map((l) => l.level))).toEqual([
      [5, 4, 3],
      [5, 4, 3],
      [3, 2, 1],
    ]);
    // above its arc the strand is its ancestors, one visit a level
    expect(rows.members[0].levels[0].raw).toBe(1);
    expect(rows.members[0].levels[1].raw).toBe(1);
    // its reading below the arc is the identification's, and the candidate's is the 303's two levels down
    const arc = e.strand.arcs[4];
    const reading = readArc(e.cs, arc);
    const rowTokens = (j: number, d: number) => {
      const lv = rows.members[j].levels[d];
      return lv.items.filter((it) => it.kind === 'visit').length;
    };
    expect(rowTokens(0, 2)).toBe(arcTokens(reading.find((r) => r.level === 3)!, 6).length);
    const top = topReading(e.cs, e.harm.bornOf(e.harm.result().circuits.findIndex((c) => c.level === 4 && c.length === 303)), 3);
    expect(rowTokens(1, 2)).toBe(top.tokens[3].length);
    // the strand's visits paired with the candidate's
    const pairs = rows.pairs[0][2]!;
    expect([...pairs.ab].some((x) => x >= 0)).toBe(true);
    const pic = m.picture(specs, 1);
    expect(pic.sides.map((s) => s.level)).toEqual([3, 3, 1]);
    expect(pic.sides[0].open).toBe(true);
    expect(pic.sides[1].supertiles.some((s) => s.matched)).toBe(true);
    expect(pic.sides[0].supertiles.some((s) => s.link)).toBe(true);
    expect(pic.steps[1]).toBe('same');
    const d = m.detail(strand, 3, null, 150000);
    expect(d.pts.length).toBeGreaterThan(4);
  }, 30000);

  it('draws a closed strand reading as the circuit of the build it is', () => {
    const e = engineOn(4, 303, 8);
    const m = new Members(e);
    const specs: MemberSpec[] = [
      { kind: 'strand', level: 4, birth: 4 },
      { kind: 'built', level: 4, length: 303 },
    ];
    const pic = m.picture(specs, 2);
    expect(pic.steps).toEqual(['same']);
    expect(pic.sides[0].open).toBe(false);
    expect(pic.sides[0].count).toBe(pic.sides[1].count);
  });
});
