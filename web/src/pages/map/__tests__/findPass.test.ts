import { describe, expect, it } from 'vitest';
import {
  COS30,
  SIN30,
  comboToMatchingIndices,
  createUnrootedEngine,
  isAggregateType,
  tracePaths,
  weldSegments,
  type Segment,
  type ViewportCut,
} from '../../../core';
import { buildLeafChordTable, type LeafChordTable } from '../chords';
import { FindPassState, findTableOf, type FoundLoop } from '../findPass';
import { traceLoops } from '../loopTrace';

const SUBSET = [2, 5, 7, 8];
const COMBO = '0100101100';
const table = (curved = false): LeafChordTable =>
  buildLeafChordTable('spectre', SUBSET, comboToMatchingIndices('spectre', SUBSET, COMBO), undefined, curved);
const cutAt = (cx: number, cy: number, half: number): ViewportCut =>
  createUnrootedEngine(1).query({ cx, cy, halfW: half, halfH: half * 0.7 }, 200_000);

/** Every chord of a cut in world coordinates, as the find pass lays them. */
function worldSegments(cut: ViewportCut, t: LeafChordTable): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < cut.count; i++) {
    if (isAggregateType(cut.type[i])) continue;
    const code = cut.code[i];
    const co = COS30[code & 15];
    const si = SIN30[code & 15];
    const mir = code & 16 ? -1 : 1;
    const px = cut.pos[2 * i] + cut.origin.x;
    const py = cut.pos[2 * i + 1] + cut.origin.y;
    for (const [a, b] of t.segments[cut.type[i]] ?? []) {
      out.push([
        { x: co * mir * a.x - si * a.y + px, y: si * mir * a.x + co * a.y + py },
        { x: co * mir * b.x - si * b.y + px, y: si * mir * b.x + co * b.y + py },
      ]);
    }
  }
  return out;
}

/** A circuit by where it is and how long: its points' centre and its chord count. */
const keyOf = (pts: readonly { x: number; y: number }[]): string => {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return `${(x / pts.length).toFixed(2)},${(y / pts.length).toFixed(2)}:${pts.length}`;
};

/** What the general welder and junction-safe tracer call this cut's circuits. */
function reference(cut: ViewportCut, t: LeafChordTable): string[] {
  return tracePaths(weldSegments(worldSegments(cut, t)))
    .circuits.filter((c) => c.points.length >= 3)
    .map((c) => keyOf(c.points))
    .sort();
}

/** A found loop's crossing points (straight chords: its drawn points less the repeat). */
function loopKey(l: FoundLoop): string {
  const pts = [];
  for (let i = 0; i < l.pointCount - 1; i++) pts.push({ x: l.xy[2 * i] + l.origin.x, y: l.xy[2 * i + 1] + l.origin.y });
  return keyOf(pts);
}

describe('traceLoops', () => {
  it('finds exactly the circuits weldSegments + tracePaths find', () => {
    const t = table();
    for (const [cx, cy] of [[0, 0], [140, -60], [-300, 220]]) {
      const cut = cutAt(cx, cy, 60);
      const segs = worldSegments(cut, t);
      const xy = new Float64Array(4 * segs.length);
      segs.forEach(([a, b], i) => xy.set([a.x, a.y, b.x, b.y], 4 * i));
      const got = traceLoops(xy, segs.length)
        .filter((l) => l.points.length >= 3)
        .map((l) => keyOf(l.points))
        .sort();
      const want = reference(cut, t);
      expect(want.length).toBeGreaterThan(20);
      expect(got).toEqual(want);
    }
  });

  it('a loop lists, for each step, the segment that takes it', () => {
    // A square, its sides given out of order and backwards, plus an open tail.
    const xy = Float64Array.from([1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 5, 5, 6, 6]);
    const [loop, ...rest] = traceLoops(xy, 5);
    expect(rest).toEqual([]);
    const n = loop.points.length;
    expect(n).toBe(4);
    for (let i = 0; i < n; i++) {
      const s = loop.segs[i];
      const ends = [
        [xy[4 * s], xy[4 * s + 1]],
        [xy[4 * s + 2], xy[4 * s + 3]],
      ].map(([x, y]) => `${x},${y}`);
      const p = loop.points[i];
      const q = loop.points[(i + 1) % n];
      expect(ends.sort()).toEqual([`${p.x},${p.y}`, `${q.x},${q.y}`].sort());
    }
  });
});

describe('FindPassState', () => {
  it('finds a cut’s circuits once, then only counts them as seen', () => {
    const t = table();
    const ft = findTableOf(t);
    const state = new FindPassState();
    const cut = cutAt(0, 0, 60);
    const first = state.pass(cut, ft);
    expect(first.fresh.map(loopKey).sort()).toEqual(reference(cut, t));
    expect(first.seenWhole).toEqual([]);

    // The same ground again: nothing new, everything seen whole.
    const again = state.pass(cut, ft);
    expect(again.fresh).toEqual([]);
    expect([...again.seenWhole].sort()).toEqual(first.fresh.map((l) => l.id).sort());
  });

  it('over shifted ground, the new circuits plus those seen whole are the cut’s circuits', () => {
    const t = table();
    const ft = findTableOf(t);
    const state = new FindPassState();
    const first = state.pass(cutAt(0, 0, 60), ft);
    const byId = new Map(first.fresh.map((l) => [l.id, loopKey(l)]));
    const moved = cutAt(25, -10, 60);
    const next = state.pass(moved, ft);
    expect(next.seenWhole.length).toBeGreaterThan(0);
    expect(next.fresh.length).toBeGreaterThan(0);
    const got = [...next.fresh.map(loopKey), ...next.seenWhole.map((id) => byId.get(id)!)].sort();
    expect(got).toEqual(reference(moved, t));
  });

  it('forgets what it is not told to keep', () => {
    const ft = findTableOf(table());
    const state = new FindPassState();
    const cut = cutAt(0, 0, 40);
    const first = state.pass(cut, ft);
    const kept = first.fresh.slice(0, 3).map((l) => l.id);
    state.keep(kept);
    const again = state.pass(cut, ft);
    expect([...again.seenWhole].sort()).toEqual([...kept].sort());
    expect(again.fresh.length).toBe(first.fresh.length - kept.length);
  });

  it('bends curved circuits along their chords', () => {
    const state = new FindPassState();
    const straight = new FindPassState().pass(cutAt(0, 0, 30), findTableOf(table()));
    const curved = state.pass(cutAt(0, 0, 30), findTableOf(table(true)));
    expect(curved.fresh.length).toBe(straight.fresh.length);
    const pts = (r: typeof curved) => r.fresh.reduce((n, l) => n + l.pointCount, 0);
    expect(pts(curved)).toBeGreaterThan(pts(straight));
  });
});
