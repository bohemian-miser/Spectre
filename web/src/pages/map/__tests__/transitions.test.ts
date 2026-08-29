/**
 * Two independent answers to "where did Delta hand over to Gamma1?" — a scan
 * of the tiling, and a read of the line that was drawn. They are computed from
 * different data by different code, so the load-bearing test here is that they
 * agree: every crossing the walk made must be one the scan also found, at the
 * same place.
 */
import { describe, expect, it } from 'vitest';

import {
  LEAF_ORDER,
  comboToMatchingIndices,
  createUnrootedEngine,
  type Pt,
  type ViewRect,
  type ViewportCut,
} from '../../../core';
import { buildLeafChordTable, type LeafChordTable } from '../chords';
import {
  advanceWalk,
  buildChordIndex,
  chordTypes,
  hitTestChord,
  startTrail,
  transitionCounts,
  TRANSITION_TYPES,
} from '../strandWalk';
import {
  buildTransitionIndex,
  chainCounts,
  pairKey,
  pathChains,
  pathTransitions,
  pathTypeChords,
  screenTypeChords,
  selectionKey,
  type Elbow,
} from '../transitions';

const SEED = 1;
const SUBSET = [2, 5, 7, 8];
const COMBO = '0100101100';

const tableFor = (): LeafChordTable =>
  buildLeafChordTable(SUBSET, comboToMatchingIndices('spectre', SUBSET, COMBO));

const rect = (halfW: number): ViewRect => ({ cx: 0, cy: 0, halfW, halfH: halfW * 0.65 });
const cutFor = (view: ViewRect, budget = 200_000): ViewportCut =>
  createUnrootedEngine(SEED).query(view, budget);

function indexFor(halfW = 40) {
  const index = buildChordIndex(cutFor(rect(halfW)), tableFor());
  if (!index) throw new Error('no walkable cut');
  return index;
}

/**
 * Two computations of the same connection point agree only to within the weld
 * tolerance: each tile's instance position is f32, and the point is derived
 * independently from each side, so they drift by ~1e-4. Compare by distance,
 * not by a rounded key — a key boundary would split a matching pair.
 */
const SAME = 1e-3;
const joint = (e: Elbow): Pt => e[1];
const hasNear = (list: readonly Elbow[], p: Pt): boolean =>
  list.some((e) => Math.hypot(joint(e).x - p.x, joint(e).y - p.y) <= SAME);

describe('buildTransitionIndex', () => {
  it('finds crossings, keyed by ordered pair', () => {
    const idx = buildTransitionIndex(indexFor(), TRANSITION_TYPES);
    expect(idx.total).toBeGreaterThan(100);
    expect(idx.capped).toBe(false);
    expect(idx.byPair.size).toBeGreaterThan(1);

    // Every elbow is three real points, and the middle one is shared by the
    // two chords — that is what makes it a crossing rather than two lines.
    for (const bucket of idx.byPair.values()) {
      for (const [a, at, b] of bucket) {
        for (const p of [a, at, b]) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        }
        // The arms reach away from the joint, so it is not a degenerate point.
        expect(Math.hypot(a.x - at.x, a.y - at.y)).toBeGreaterThan(1e-6);
        expect(Math.hypot(b.x - at.x, b.y - at.y)).toBeGreaterThan(1e-6);
      }
    }
  });

  /**
   * On screen, a crossing is a PLACE: one connection point joining two tiles,
   * and the scan probes it from both sides. So `A→B` and `B→A` name the same
   * places traversed opposite ways, and their buckets must match exactly.
   *
   * This is the difference between the two senses worth being clear about: the
   * graph's counts are lopsided because a WALK goes one way through a place,
   * not because the tiling offers the two directions unequally.
   */
  it('sees A→B and B→A as the same places, traversed opposite ways', () => {
    const idx = buildTransitionIndex(indexFor(), TRANSITION_TYPES);
    let checked = 0;
    for (let a = 0; a < TRANSITION_TYPES; a++) {
      for (let b = a + 1; b < TRANSITION_TYPES; b++) {
        const ab = idx.byPair.get(pairKey(TRANSITION_TYPES, a, b)) ?? [];
        const ba = idx.byPair.get(pairKey(TRANSITION_TYPES, b, a)) ?? [];
        if (ab.length === 0 && ba.length === 0) continue;
        expect(ab).toHaveLength(ba.length);
        // Same joints: every A→B crossing has a B→A at the same place.
        for (const e of ab) {
          expect(hasNear(ba, joint(e)), `no reverse crossing near ${joint(e).x},${joint(e).y}`).toBe(
            true,
          );
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(2);
  });

  it('stops at the cap rather than scanning a whole dense cut', () => {
    const idx = buildTransitionIndex(indexFor(), TRANSITION_TYPES, 50);
    expect(idx.capped).toBe(true);
    expect(idx.total).toBeLessThanOrEqual(51);
  });
});

describe('pathTransitions', () => {
  const walked = (steps: number) => {
    const index = indexFor();
    const seed = hitTestChord(index, { x: 0, y: 0 }, 6);
    expect(seed).not.toBeNull();
    const trail = startTrail(seed!);
    advanceWalk(trail, index, { maxSteps: steps });
    return { index, trail };
  };

  it('reports exactly the crossings the transition matrix counted', () => {
    const { trail } = walked(120);
    const counts = transitionCounts(trail);
    let checked = 0;
    for (let a = 0; a < TRANSITION_TYPES; a++) {
      for (let b = 0; b < TRANSITION_TYPES; b++) {
        const want = counts[a * TRANSITION_TYPES + b];
        if (want === 0) continue;
        // The matrix is accumulated step by step during the walk; this reads
        // the finished line back. Same number, two different mechanisms.
        expect(pathTransitions(trail, a, b)).toHaveLength(want);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(3);
  });

  it('puts each crossing between the two chords it joins', () => {
    const { trail } = walked(60);
    const types = chordTypes(trail);
    const a = types[0];
    const b = types[1];
    const found = pathTransitions(trail, a, b);
    expect(found.length).toBeGreaterThan(0);
    // The first crossing of that pair is at the joint between chords 0 and 1,
    // i.e. trail point 1 — the elbow's middle.
    const first = found[0];
    if (types[0] === a && types[1] === b) {
      expect(first[1].x).toBeCloseTo(trail.xy[2], 9);
      expect(first[1].y).toBeCloseTo(trail.xy[3], 9);
    }
  });

  it('is empty for a pair the walk never made', () => {
    const { trail } = walked(40);
    const counts = transitionCounts(trail);
    const unused = counts.findIndex((c) => c === 0);
    expect(unused).toBeGreaterThanOrEqual(0);
    const from = Math.floor(unused / TRANSITION_TYPES);
    const to = unused % TRANSITION_TYPES;
    expect(pathTransitions(trail, from, to)).toEqual([]);
  });

  /**
   * The claim the whole feature rests on: "in the path" is a subset of "on
   * screen". If the scan missed a crossing the walk actually used, the
   * on-screen highlight would be lying about where the transition happens.
   */
  it('every crossing the walk made is one the on-screen scan also found', () => {
    const { index, trail } = walked(150);
    const idx = buildTransitionIndex(index, TRANSITION_TYPES);
    const counts = transitionCounts(trail);

    let compared = 0;
    for (let a = 0; a < TRANSITION_TYPES; a++) {
      for (let b = 0; b < TRANSITION_TYPES; b++) {
        if (counts[a * TRANSITION_TYPES + b] === 0) continue;
        const onScreen = idx.byPair.get(pairKey(TRANSITION_TYPES, a, b)) ?? [];
        for (const e of pathTransitions(trail, a, b)) {
          const p = joint(e);
          expect(
            hasNear(onScreen, p),
            `${LEAF_ORDER[a]}→${LEAF_ORDER[b]} at ${p.x},${p.y} was walked but not scanned`,
          ).toBe(true);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(20);
  });
});

/**
 * Runs of types are what the ranked list ranks. The load-bearing claim is that
 * the count and the drawing agree: whatever the list says a run happened N
 * times, the path has N of them to point at.
 */
describe('chainCounts', () => {
  const walk = (steps: number) => {
    const index = indexFor();
    const seed = hitTestChord(index, { x: 0, y: 0 }, 6);
    expect(seed).not.toBeNull();
    const trail = startTrail(seed!);
    advanceWalk(trail, index, { maxSteps: steps });
    return { index, trail };
  };

  it('counts pairs into exactly the transition matrix', () => {
    const { trail } = walk(200);
    const counts = transitionCounts(trail);
    const chains = chainCounts(chordTypes(trail), 2, TRANSITION_TYPES);
    // Same fact, two mechanisms: one accumulated a step at a time during the
    // walk, the other read the finished type log.
    let total = 0;
    for (const c of chains) {
      expect(c.types).toHaveLength(2);
      expect(c.count).toBe(counts[c.types[0] * TRANSITION_TYPES + c.types[1]]);
      total += c.count;
    }
    expect(total).toBe(counts.reduce((a, b) => a + b, 0));
    // Every counted pair is listed, not just the ones that happen to be big.
    expect(chains).toHaveLength(counts.filter((c) => c > 0).length);
  });

  it('ranks commonest first', () => {
    const { trail } = walk(200);
    const chains = chainCounts(chordTypes(trail), 3, TRANSITION_TYPES);
    expect(chains.length).toBeGreaterThan(1);
    for (let i = 1; i < chains.length; i++) {
      expect(chains[i - 1].count).toBeGreaterThanOrEqual(chains[i].count);
    }
  });

  it('counts overlapping runs, because that is what "how often" means', () => {
    // A A A holds two A As and one A A A, not one of each.
    expect(chainCounts([1, 1, 1], 2)).toEqual([{ types: [1, 1], count: 2 }]);
    expect(chainCounts([1, 1, 1], 3)).toEqual([{ types: [1, 1, 1], count: 1 }]);
    expect(chainCounts([1, 1, 1], 4)).toEqual([]);
  });

  it('keeps runs apart past the packed-key limit', () => {
    // Longer than a run can be packed into a double, so this takes the string
    // path — and two runs differing only in the last tile must stay distinct.
    const a = new Array<number>(20).fill(3);
    const types = [...a, 7, ...a, 8];
    const chains = chainCounts(types, 20, TRANSITION_TYPES);
    const twenty = chains.find((c) => c.types.every((t) => t === 3));
    expect(twenty?.count).toBe(2);
    expect(chains.filter((c) => c.types.at(-1) === 7)).toHaveLength(1);
    expect(chains.filter((c) => c.types.at(-1) === 8)).toHaveLength(1);
  });

  it('has nothing to say about a path shorter than the run', () => {
    expect(chainCounts([1, 2], 3)).toEqual([]);
    expect(chainCounts([], 2)).toEqual([]);
    expect(chainCounts([1, 2, 3], 0)).toEqual([]);
  });
});

describe('pathChains and pathTypeChords', () => {
  const walk = (steps: number) => {
    const index = indexFor();
    const seed = hitTestChord(index, { x: 0, y: 0 }, 6);
    const trail = startTrail(seed!);
    advanceWalk(trail, index, { maxSteps: steps });
    return { index, trail };
  };

  it('draws one run of line per place the path spelled the sequence out', () => {
    const { trail } = walk(200);
    const types = chordTypes(trail);
    const top = chainCounts(types, 4, TRANSITION_TYPES)[0];
    const runs = pathChains(trail, top.types);
    expect(runs.length).toBeGreaterThan(0);
    // Overlapping occurrences merge into one longer run, so the pieces are at
    // most as many as the count — and every piece is at least the sequence.
    expect(runs.length).toBeLessThanOrEqual(top.count);
    for (const r of runs) expect(r.length).toBeGreaterThanOrEqual(top.types.length + 1);
    // The points are the line that was drawn, not a copy of it.
    const first = runs[0];
    const k = indexOfRun(types, top.types);
    expect(first[0].x).toBeCloseTo(trail.xy[k * 2], 9);
    expect(first[0].y).toBeCloseTo(trail.xy[k * 2 + 1], 9);
  });

  it('covers every chord of a type the path crossed', () => {
    const { trail } = walk(200);
    const types = chordTypes(trail);
    const want = LEAF_ORDER.map((_, t) => [...types].filter((x) => x === t).length);
    const t = want.findIndex((c) => c > 1);
    expect(t).toBeGreaterThanOrEqual(0);
    const runs = pathTypeChords(trail, t);
    // Each run of `n` points is `n - 1` chords; adjacent ones are merged, so
    // the pieces add up to the chords rather than matching them one for one.
    const chords = runs.reduce((a, r) => a + r.length - 1, 0);
    expect(chords).toBe(want[t]);
  });

  it('finds every chord of a type on screen, walked or not', () => {
    const { index, trail } = walk(200);
    const t = chordTypes(trail)[0];
    const onScreen = screenTypeChords(index, t);
    expect(onScreen.length).toBeGreaterThan(0);
    for (const r of onScreen) expect(r).toHaveLength(2);
    // Untraced tiles have their chords too, so the screen has more than the
    // walk — the same containment the pair highlight relies on.
    const walked = pathTypeChords(trail, t).reduce((a, r) => a + r.length - 1, 0);
    expect(onScreen.length).toBeGreaterThanOrEqual(walked);
  });

  it('is empty for a sequence the path never made', () => {
    const { trail } = walk(60);
    const counts = transitionCounts(trail);
    // A pair with no count is a pair the walk never made, so it has nowhere to
    // be drawn — even though both of its types are all over the path.
    const unused = counts.findIndex((c) => c === 0);
    expect(unused).toBeGreaterThanOrEqual(0);
    const pair = [Math.floor(unused / TRANSITION_TYPES), unused % TRANSITION_TYPES];
    expect(pathChains(trail, pair)).toEqual([]);
    expect(pathChains(trail, [])).toEqual([]);
    // This rule gives every leaf a chord, so "a type that is not there" has to
    // be one past the last of them.
    expect(pathTypeChords(trail, LEAF_ORDER.length)).toEqual([]);
  });
});

/** First chord index where `types` spells `seq`. */
function indexOfRun(types: ArrayLike<number>, seq: readonly number[]): number {
  outer: for (let k = 0; k + seq.length <= types.length; k++) {
    for (let j = 0; j < seq.length; j++) if (types[k + j] !== seq[j]) continue outer;
    return k;
  }
  return -1;
}

describe('selectionKey', () => {
  it('tells the three shapes apart, and an absent one from all of them', () => {
    expect(selectionKey(null)).toBe('');
    expect(selectionKey({ kind: 'pair', from: 1, to: 2 })).not.toBe(
      selectionKey({ kind: 'pair', from: 2, to: 1 }),
    );
    expect(selectionKey({ kind: 'type', type: 1 })).not.toBe(
      selectionKey({ kind: 'chain', types: [1] }),
    );
    // Equal selections must key the same, or the view behind rebuilds its ink
    // on every pointer move.
    expect(selectionKey({ kind: 'chain', types: [1, 2, 3] })).toBe(
      selectionKey({ kind: 'chain', types: [1, 2, 3] }),
    );
  });
});
