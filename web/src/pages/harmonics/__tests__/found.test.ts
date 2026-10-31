/**
 * Circuits found above the build against the full build: a harmonic found
 * by the brute force with the routes worked out above a low base, taken into
 * an engine built lower still, reads as `readDown` reads the circuit the
 * full tables close there, and its thumbnail is the line through the
 * middles of the supertiles that circuit visits (`visitsWithFrames`).
 */
import { describe, expect, it } from 'vitest';

import { transPt, type HexType } from '../../../core';
import { middleOf } from '../../buildup/deep';
import { CircuitShapes, familyOf, type BornCircuit } from '../../shapes/circuitShapes';
import { harmonicAbove } from '../bruteForce';
import type { Found } from '../found';
import { HarmonicsEngine } from '../harmonicsJob';
import { visitsWithFrames } from '../pairView';
import { readDown, sameCyclic } from '../readings';
import { SparseRoutes } from '../sparseRoutes';

const RULE = [0, 2, 3, 4, 6, 8];
const build = (combo: string, level: number) => new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), level, 1, true);
const bornAt = (cs: CircuitShapes, level: number, length: number): BornCircuit => cs.born.find((c) => c.level === level && c.length === length)!;

/** Whether two closed lines (x, y pairs, the first point repeated last) are the same points in the same cyclic order, either way round. */
function sameLoop(a: Float64Array, b: Float64Array): boolean {
  const n = a.length / 2 - 1;
  if (b.length / 2 - 1 !== n) return false;
  const at = (xy: Float64Array, i: number) => `${xy[2 * i]},${xy[2 * i + 1]}`;
  const A = Array.from({ length: n }, (_, i) => at(a, i));
  const B = Array.from({ length: n }, (_, i) => at(b, i));
  return sameCyclic(A, B);
}

/** A born circuit's visits at a level drawn through their supertiles' middles, closed. */
function middles(cs: CircuitShapes, c: BornCircuit, level: number): Float64Array {
  const { v, xform } = visitsWithFrames(cs, c, level);
  const out = new Float64Array(2 * v.type.length + 2);
  v.type.forEach((t, i) => {
    const p = transPt(xform[i], middleOf(cs, level, t as HexType));
    out[2 * i] = p.x;
    out[2 * i + 1] = p.y;
  });
  out[2 * v.type.length] = out[0];
  out[2 * v.type.length + 1] = out[1];
  return out;
}

/** The harmonic two levels above a built circuit, found from a base at level `base`, as the brute force hands it over. */
function foundAbove(cs: CircuitShapes, base: number, from: BornCircuit, floor: number): Found {
  const R = new SparseRoutes(cs, base);
  const f = harmonicAbove(R, R.walked(from), { floor }).found!;
  return { level: f.level, type: f.type, length: f.length, family: f.family, deep: f.deep };
}

function expectSameAsBuilt(engine: HarmonicsEngine, full: CircuitShapes, f: Found, built: BornCircuit): void {
  expect(f).toMatchObject({ level: built.level, type: built.type, length: built.length, family: familyOf(built) });
  const n = engine.result().circuits.length;
  const [got] = engine.found([f], 3000);
  // the readings, level by level, as the full tables read the built circuit
  const want = readDown(full, built, 250000).readings;
  expect(got.info.readings.length).toBeGreaterThan(2);
  for (const r of got.info.readings) {
    const w = want.find((x) => x.level === r.level);
    if (!w) continue;
    expect(r.raw).toBe(w.raw);
    expect(sameCyclic(r.tokens, w.tokens)).toBe(true);
  }
  expect(want.find((x) => x.level === got.info.readings[0].level)).toBeDefined();
  // the thumbnail: every supertile visited at its level, through its middle
  const at = got.info.readings.find((r) => r.level === got.stop)!;
  expect(got.pts.length / 2 - 1).toBe(at.raw);
  expect(sameLoop(got.pts, middles(full, built, got.stop))).toBe(true);
  // drawn over its supertiles as a circuit of the engine, after the built ones
  const side = engine.picture([n], built.level - 1).sides[0];
  expect(side.visits).toBe(want.find((x) => x.level === built.level - 1)!.raw);
  expect(side.supertiles.length).toBeGreaterThan(0);
}

describe('a circuit found above the build', () => {
  it('140000001’s 734,256 at level 8, found from a base at level 5 and read by a build to level 6', () => {
    const full = build('140000001', 8);
    const f = foundAbove(full, 5, bornAt(full, 6, 14679), 2);
    const engine = new HarmonicsEngine({ family: 'hex', subset: RULE, combo: '140000001', level: 6 });
    expectSameAsBuilt(engine, full, f, bornAt(full, 8, 734256));
  }, 120000);

  it('000100000’s 8,784 at level 6, found from a base at level 4 and read by a build to level 4', () => {
    const full = build('000100000', 6);
    const f = foundAbove(full, 4, bornAt(full, 4, 441), 1);
    const engine = new HarmonicsEngine({ family: 'hex', subset: RULE, combo: '000100000', level: 4 });
    expectSameAsBuilt(engine, full, f, bornAt(full, 6, 8784));
    // the chain's two members in one picture and in rows, the found one after the built
    const r = engine.result();
    const a = r.circuits.findIndex((c) => c.level === 4 && c.length === 441);
    const n = r.circuits.length;
    const picture = engine.picture([a, n], 2);
    expect(picture.steps).toEqual(['same']);
    const rows = engine.rows([a, n], 2);
    expect(rows.members[1].levels.map((l) => l.level)).toEqual([5, 4]);
    // its similarity to the 441 is the built pair's
    const built = new HarmonicsEngine({ family: 'hex', subset: RULE, combo: '000100000', level: 6 });
    const br = built.result();
    const pair = built.similarities().find((s) => br.circuits[s.a].length === 441 && br.circuits[s.b].length === 8784)!;
    expect(engine.score(a, n).score).toBe(pair.score);
  }, 120000);
});
