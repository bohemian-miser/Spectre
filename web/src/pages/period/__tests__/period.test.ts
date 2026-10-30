/**
 * The borders against the tiles: for every type at levels 1 to 3, the
 * strands of the supertile's leaf tiles are welded from the tiles' own
 * crossing points and walked, and each route of the border joins the same
 * two points through as many chords, with as many circuits closed inside as
 * the levels below say. Then the period of the line combination, the walk
 * through two levels of pieces, the facts the line rests on, and the exact
 * outlines.
 */
import { describe, expect, it } from 'vitest';

import { HEX_TYPES, buildSystem, childType, connectionPoints, flatten, leafOrder, leafPts, transPt, type HexType } from '../../../core';
import { CircuitShapes, ruleOptions } from '../../shapes/circuitShapes';
import { expand, run, sameBorder, walkExpansion, type Run } from '../period';
import { isLine, lineOf, repeatOf } from '../proof';
import { graphOf, trueOutline } from '../scene';

const key = (p: { x: number; y: number }) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

/** The strands of a level-n supertile of `type`, welded from its leaf tiles: boundary point -> [other end, chords], and the closed strands. */
function traced(subset: readonly number[], digits: readonly number[], n: number, type: HexType): { ends: Map<string, [string, number]>; circuits: number } {
  const sel = new Set(subset);
  const options = ruleOptions('hex', subset);
  const leafIdx = (t: string) => leafOrder('hex').indexOf(t as HexType);
  // node -> chord ends meeting there
  const at = new Map<string, number[]>();
  const other: number[] = [];
  const nodeOf: string[] = [];
  for (const leaf of flatten(buildSystem('hex', n)[type])) {
    const pts = connectionPoints('hex', leaf.type, sel).map((c) => key(transPt(leaf.xform, c.pt)));
    for (const [a, b] of options[leafIdx(leaf.type)][digits[leafIdx(leaf.type)]] ?? []) {
      const i = nodeOf.length;
      nodeOf.push(pts[a], pts[b]);
      other.push(i + 1, i);
      for (const [k, end] of [[pts[a], i], [pts[b], i + 1]] as const) (at.get(k) ?? at.set(k, []).get(k)!).push(end);
    }
  }
  const used = new Uint8Array(nodeOf.length);
  const ends = new Map<string, [string, number]>();
  for (const [k, list] of at) {
    if (list.length !== 1 || used[list[0]]) continue;
    let e = list[0];
    let chords = 0;
    for (;;) {
      used[e] = used[other[e]] = 1;
      chords++;
      const far = nodeOf[other[e]];
      const next = at.get(far)!.find((x) => x !== other[e]);
      if (next === undefined) {
        ends.set(k, [far, chords]);
        ends.set(far, [k, chords]);
        break;
      }
      e = next;
    }
  }
  let circuits = 0;
  for (let s = 0; s < nodeOf.length; s++) {
    if (used[s]) continue;
    circuits++;
    let e = s;
    do {
      used[e] = used[other[e]] = 1;
      const far = nodeOf[other[e]];
      e = at.get(far)!.find((x) => x !== other[e])!;
    } while (!used[e]);
  }
  return { ends, circuits };
}

/** Circuits inside a level-n supertile of `type`: those closing at level n, and those inside its children. */
function circuitsInside(r: Run, n: number, type: HexType): number {
  if (n === 0) return 0;
  let s = r.circuits[n][type];
  for (let slot = 0; slot < 8; slot++) {
    const c = childType(type, slot);
    if (c) s += circuitsInside(r, n - 1, c);
  }
  return s;
}

const COMBOS: [number[], string][] = [[[1, 2, 8], '010100000'], [[0, 2, 3, 4, 6, 8], '140000001']];

describe('every type\'s border, level by level', () => {
  for (const [subset, combo] of COMBOS) {
    it(`joins the crossings as the tiles' strands do (${subset.join('')} · ${combo})`, () => {
      const digits = [...combo].map((c) => parseInt(c, 36));
      const r = run(subset, digits, 3);
      const cs = new CircuitShapes('hex', subset, digits, 3, 1, true);
      let routes = 0;
      for (let n = 1; n <= 3; n++) {
        for (const t of HEX_TYPES) {
          const g = graphOf(cs, n, t, r.states[n][t]);
          const tiles = traced(subset, digits, n, t);
          expect(tiles.ends.size).toBe(g.dots.length);
          for (const [p, q] of g.routes) {
            const end = tiles.ends.get(key(g.dots[p]));
            expect(end).toEqual([key(g.dots[q]), r.states[n][t].chords[p]]);
            routes++;
          }
          expect(tiles.circuits).toBe(circuitsInside(r, n, t));
        }
      }
      expect(routes).toBeGreaterThan(50);
    }, 60000);
  }
});

describe('the line combination', () => {
  const r = run([1, 2, 8], [...'010100000'].map((c) => parseInt(c, 36)), 7);

  it('repeats every two levels from level 1, with no circuit', () => {
    expect(r.period).toEqual({ start: 1, length: 2 });
    expect(repeatOf(r)!.circuits).toEqual([0, 0, 0]);
    for (let n = 1; n + 2 <= 7; n++) for (const t of HEX_TYPES) expect(sameBorder(r.states[n][t], r.states[n + 2][t])).toBe(true);
    for (const t of HEX_TYPES) expect(sameBorder(r.states[1][t], r.states[2][t])).toBe(t === 'Psi');
  });

  it('has the borders docs/EVERY_OTHER_LEVEL.md tabulates', () => {
    const table: Record<HexType, [string, string, string]> = {
      Gamma: ['1 1 2 4 1 1', '0–5 1–2 3–4 6–7 8–9', '0–1 2–3 4–5 6–9 7–8'],
      Delta: ['2 1 0 1 2 2', '0–1 2–7 3–4 5–6', '0–3 1–2 4–5 6–7'],
      Theta: ['2 1 1 1 0 1', '0–1 2–3 4–5', '0–5 1–2 3–4'],
      Lambda: ['2 1 0 1 1 1', '0–1 2–5 3–4', '0–3 1–2 4–5'],
      Xi: ['1 0 1 1 0 1', '0–1 2–3', '0–3 1–2'],
      Pi: ['1 0 0 1 1 1', '0–3 1–2', '0–1 2–3'],
      Sigma: ['2 1 0 1 2 4', '0–1 2–7 3–4 5–6 8–9', '0–9 1–2 3–8 4–5 6–7'],
      Phi: ['2 1 0 0 0 1', '0–1 2–3', '0–3 1–2'],
      Psi: ['1 0 0 0 0 1', '0–1', '0–1'],
    };
    const pairs = (m: Int32Array) => [...m].flatMap((q, p) => (q > p ? [`${p}–${q}`] : [])).join(' ');
    for (const t of HEX_TYPES) {
      for (let n = 1; n <= 7; n++) {
        expect(r.states[n][t].perEdge.join(' ')).toBe(table[t][0]);
        expect(pairs(r.states[n][t].mate)).toBe(table[t][n % 2 ? 1 : 2]);
      }
    }
    expect(lineOf(r).levels.slice(1, 5).map((l) => [l.tiles, l.chords, l.onRoute])).toEqual([[8, 9, 9], [63, 83, 83], [496, 667, 667], [3905, 5265, 5265]]);
  });

  it('walks two levels of pieces into the border two levels up', () => {
    for (const t of HEX_TYPES) {
      const x = expand(r.states, 3, t, 2);
      const w = walkExpansion(x, (i) => r.states[1][x.pieces[i].type]);
      expect(w.circuits).toHaveLength(0);
      const mate = new Int32Array(x.border.length);
      for (const route of w.routes) {
        mate[route.from] = route.to;
        mate[route.to] = route.from;
      }
      expect([...mate]).toEqual([...r.states[3][t].mate]);
      expect([...mate]).toEqual([...r.states[1][t].mate]);
    }
  });

  it('gives the Psi one route through every chord, Psi children welded inside, and a chain that buries', () => {
    const line = lineOf(r);
    expect(line.crossings.every((c) => c === 2)).toBe(true);
    for (const l of line.levels) expect(l.onRoute).toBe(l.chords);
    expect(line.levels.map((l) => l.tiles).slice(0, 4)).toEqual([1, 8, 63, 496]);
    expect(line.slots).toEqual([{ slot: 0, welded: true }, { slot: 2, welded: true }, { slot: 5, welded: true }]);
    expect(line.chain).toEqual({ word: [0, 5], depth: 5 });
    expect(isLine(r, line)).toBe(true);
  });
});

describe('the exact outline', () => {
  it('runs through vertices of the leaf tiles, closing up', () => {
    for (const n of [1, 2, 3]) {
      for (const t of HEX_TYPES) {
        const corners = new Set<string>();
        for (const leaf of flatten(buildSystem('hex', n)[t])) for (const p of leafPts('hex', leaf.type)) corners.add(key(transPt(leaf.xform, p)));
        const o = trueOutline(n, t);
        expect(o.length).toBeGreaterThan(6);
        expect(o.every((p) => corners.has(key(p)))).toBe(true);
        expect(new Set(o.map(key)).size).toBe(o.length);
      }
    }
  });
});
