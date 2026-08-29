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
import { buildTransitionIndex, pairKey, pathTransitions, type Elbow } from '../transitions';

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
