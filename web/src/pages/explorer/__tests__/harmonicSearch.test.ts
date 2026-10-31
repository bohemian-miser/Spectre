/**
 * The harmonic search against two independent sources: circuits built by
 * the renormalisation (`CircuitShapes`, read by `harmonics/readings.ts`),
 * placed in a level-8 Delta by walking the substitution tree, and a rooted
 * patch's strands as the circuit analysis traces them from the geometry.
 * 023468 · 140000001: the 303 (born at level 4) has the 14,679 (level 6) and
 * the 734,256 (level 8) as harmonics, agreeing from level 2 up. Under
 * 023468 · 000000000 the 27 (level 2) has both its harmonics inside a
 * level-6 patch, checked against the sweep's list.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSystem, comboToMatchingIndices, inv, leafPts, mul, pathLength, pathSegments, runAnalysis, slotPathCode, transPt, type Affine, type MetaNode, type TileNode } from '../../../core';
import { matchingVectorToRecord } from '../../../lib/matchingModel';
import { insideLoop } from '../xray';
import { CircuitShapes, type BornCircuit } from '../../shapes/circuitShapes';
import { expandVisits, readDown, sameCyclic, topVisits } from '../../harmonics/readings';
import { fitInside, foldVisits, PatchAncestors, readStrand, scoreReading, searchHarmonics, visitsAt, type Strand } from '../harmonicSearch';

const RULE = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';

/** A token without the parent's letters the Harmonics page adds deep below a birth (`Ph<6D` → `Ph<6`). */
const typeAndSlot = (t: string): string => /^[A-Za-z]*<\d/.exec(t)![0];

describe('reading a strand from its tiles', () => {
  it('makes one visit per run of tiles in a supertile, a circuit’s ends joined', () => {
    // codes in base 8: level-1 supertiles 1, 1, 2, 2, 3, 1
    const tiles = [0o10, 0o11, 0o20, 0o21, 0o30, 0o12];
    expect(Array.from(visitsAt(tiles, false, 1))).toEqual([1, 2, 3, 1]);
    expect(Array.from(visitsAt(tiles, true, 1))).toEqual([1, 2, 3]);
  });

  it('folds as the Harmonics page does: a circuit round its loop, an open strand with its ends kept', () => {
    const v = Int32Array.from([1, 2, 1, 3, 4, 3, 5]);
    expect(Array.from(foldVisits(v, false, 'fixpoint'))).toEqual([0, 3, 6]);
    expect(Array.from(foldVisits(Int32Array.from([1, 2, 3, 2]), true, 'fixpoint'))).toEqual([0, 1]);
    expect(Array.from(foldVisits(Int32Array.from([1, 2, 1, 2, 3]), false, 'weave'))).toEqual([0, 3, 4]);
    expect(Array.from(foldVisits(v, false, 'none'))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('scoring one reading against another', () => {
  const a = ['D<1', 'G<7', 'S<4', 'Ph<6', 'Pi<5', 'X<5'];
  it('finds a loop inside a longer text, either way round, at any rotation', () => {
    expect(fitInside(a, true, ['T<0', 'S<4', 'G<7', 'D<1', 'X<5', 'Pi<5', 'Ph<6', 'T<1'], false)).toBe(0);
    expect(fitInside(a, true, ['T<0', 'G<7', 'S<4', 'Ph<6', 'Pi<5', 'L<1'], false)).toBe(2);
  });

  it('scores a circuit whole, and part matches over the shorter reading', () => {
    expect(scoreReading(a, [...a.slice(2), ...a.slice(0, 2)].reverse(), true)).toEqual({ score: 1, match: 'whole' });
    expect(scoreReading(a, ['Ps<0', ...a, 'Ps<1', 'L<2'], false)).toEqual({ score: 1, match: 'part' });
    expect(scoreReading(a, ['S<4', 'Ph<6', 'Pi<5'], false)).toEqual({ score: 1, match: 'part' });
    // too short a piece of the circuit to count
    expect(scoreReading(a, ['S<4'], false)).toBeNull();
  });
});

/** A born circuit's tiles, as slot paths from its birth supertile read in base 8. */
function tilesOf(cs: CircuitShapes, c: BornCircuit): Int32Array {
  let v = topVisits(cs, c);
  while (v.level > 0) v = expandVisits(cs, v);
  return Int32Array.from(v.id);
}

/** The code of the first level-`b` supertile of a type under `root` (a level-`top` node), walking the substitution tree. */
function placeOf(root: TileNode, top: number, b: number, type: string): number {
  const go = (n: TileNode, level: number, code: number): number | null => {
    if (level === b) return n.type === type ? code : null;
    for (const ch of (n as MetaNode).children) {
      const r = go(ch.node, level - 1, code * 8 + ch.pos);
      if (r !== null) return r;
    }
    return null;
  };
  const at = go(root, top, 0);
  if (at === null) throw new Error(`no level-${b} ${type} under the root`);
  return at;
}

describe('the circuits of 023468 · 140000001 placed in a level-8 Delta', () => {
  const TOP = 8;
  const cs = new CircuitShapes('hex', RULE, [...COMBO].map((ch) => parseInt(ch, 36)), TOP, 1, true);
  const root = buildSystem('hex', TOP).Delta;
  const anc = new PatchAncestors(root, TOP);
  const born = cs.born.filter((c) => c.length < 1e6);
  const strands: Strand[] = born.map((c) => {
    const off = placeOf(root, TOP, c.level, c.type) * 8 ** c.level;
    return { closed: true, tiles: tilesOf(cs, c).map((t) => t + off) };
  });
  const index = (level: number, length: number) => born.findIndex((c) => c.level === level && c.length === length);
  const i303 = index(4, 303);
  const i14679 = index(6, 14679);
  const i734256 = index(8, 734256);

  it('reads each circuit as the Harmonics page does, at every level its tokens carry types', () => {
    for (const i of [i303, i14679, i734256]) {
      const c = born[i];
      for (const r of readDown(cs, c, 2e6).readings) {
        if (r.level > c.level - 2) continue;
        const mine = readStrand(anc, strands[i].tiles, true, r.level, 'fixpoint').tokens;
        expect(sameCyclic(mine, r.tokens.map(typeAndSlot))).toBe(true);
      }
    }
  });

  it('finds the 14,679 one step up from the 303 read at level 2, and the 734,256 two steps up', () => {
    const one = searchHarmonics(anc, strands, { circuit: i303, m: 2, k: 1, fold: 'fixpoint', threshold: 0 });
    expect(one.hits[0]).toMatchObject({ strand: i14679, score: 1, match: 'whole' });
    for (const h of one.hits.slice(1)) expect(h.score).toBeLessThan(0.8);
    const two = searchHarmonics(anc, strands, { circuit: i303, m: 2, k: 2, fold: 'fixpoint', threshold: 0 });
    expect(two.hits[0]).toMatchObject({ strand: i734256, score: 1, match: 'whole' });
    for (const h of two.hits.slice(1)) expect(h.score).toBeLessThan(0.8);
    // the 14,679 read at level 2 steps up to the 734,256 at level 4
    const next = searchHarmonics(anc, strands, { circuit: i14679, m: 2, k: 1, fold: 'fixpoint', threshold: 0.8 });
    expect(next.hits.map((h) => h.strand)).toEqual([i734256]);
  });
}, 120_000);

describe('a rooted patch: a level-6 Delta as the analysis traces it', () => {
  const LEVEL = 6;
  const res = runAnalysis({
    id: 1,
    family: 'hex',
    rootTile: 'Delta',
    level: LEVEL,
    subset: RULE,
    matchingIndexByType: matchingVectorToRecord('hex', comboToMatchingIndices('hex', RULE, COMBO)),
    pathTiles: true,
  });
  const strands: Strand[] = [...res.circuitTiles!.map((tiles) => ({ closed: true, tiles })), ...res.tailTiles!.map((tiles) => ({ closed: false, tiles }))];
  const root = buildSystem('hex', LEVEL).Delta;

  it('names the tile each segment of a strand lies in', () => {
    // Independent of the tracer: the segment's midpoint is inside the tile its slot path leads to.
    const tileAt = (code: number): Affine => {
      let node = root;
      let x: Affine = [1, 0, 0, 0, 1, 0];
      for (let d = LEVEL - 1; d >= 0; d--) {
        const c = (node as MetaNode).children.find((ch) => ch.pos === Math.floor(code / 8 ** d) % 8)!;
        x = mul(x, c.xform);
        node = c.node;
      }
      return x;
    };
    const hex = leafPts('hex', 'Delta');
    res.circuits.forEach((p, i) => {
      const tiles = res.circuitTiles![i];
      expect(tiles.length).toBe(pathLength(p));
      if (i % 20) return;
      pathSegments(p).forEach(([a, b], s) => {
        const mid = transPt(inv(tileAt(tiles[s])), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        expect(insideLoop(hex, mid)).toBe(true);
      });
    });
    expect(slotPathCode('1.7.0', 3)).toBe(0o170);
  });

  it('finds the 14,679 one step up from a 303, whole, and nothing else at 80%', () => {
    const anc = new PatchAncestors(root, LEVEL);
    const i303 = strands.findIndex((s) => s.closed && s.tiles.length === 303);
    const r = searchHarmonics(anc, strands, { circuit: i303, m: 2, k: 1, fold: 'fixpoint', threshold: 0.8 });
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0]).toMatchObject({ closed: true, tiles: 14679, score: 1, match: 'whole' });
    // the 303's reading in the patch is the Harmonics page's
    const cs = new CircuitShapes('hex', RULE, [...COMBO].map((ch) => parseInt(ch, 36)), 4, 1, true);
    const c = cs.born.find((b) => b.level === 4 && b.length === 303)!;
    expect(sameCyclic(r.reading, readDown(cs, c).readings.find((x) => x.level === 2)!.tokens.map(typeAndSlot))).toBe(true);
  });
}, 120_000);

describe('two steps up inside one patch: 023468 · 000000000 in a level-6 Delta', () => {
  const combo = '000000000';
  // The sweep's list of the combination's circuits and harmonics: [id, level, length, parent, …].
  const known = JSON.parse(readFileSync(resolve(__dirname, `../../../../public/data/foundations/hex-023468/${combo}.json`), 'utf8')) as {
    found: [number, number, number][];
    harm: [number, number, number, number][];
  };
  const res = runAnalysis({
    id: 1,
    family: 'hex',
    rootTile: 'Delta',
    level: 6,
    subset: RULE,
    matchingIndexByType: matchingVectorToRecord('hex', comboToMatchingIndices('hex', RULE, combo)),
    pathTiles: true,
  });
  const strands: Strand[] = [...res.circuitTiles!.map((tiles) => ({ closed: true, tiles })), ...res.tailTiles!.map((tiles) => ({ closed: false, tiles }))];
  const anc = new PatchAncestors(buildSystem('hex', 6).Delta, 6);

  it('finds the 27’s harmonics the sweep lists, one and two steps up, read from level 0', () => {
    const base = known.found.find((f) => f[1] === 2 && f[2] === 27)!;
    const one = known.harm.find((h) => h[3] === base[0])!;
    const two = known.harm.find((h) => h[3] === one[0])!;
    expect([one[1], one[2], two[1], two[2]]).toEqual([4, 513, 6, 10215]);
    const i27 = strands.findIndex((s) => s.closed && s.tiles.length === 27);
    for (const [k, want] of [[1, one[2]], [2, two[2]]]) {
      const r = searchHarmonics(anc, strands, { circuit: i27, m: 0, k, fold: 'fixpoint', threshold: 0.8 });
      expect(r.hits.length).toBeGreaterThan(0);
      for (const h of r.hits) expect(h).toMatchObject({ closed: true, tiles: want, score: 1, match: 'whole' });
    }
  });
}, 120_000);
