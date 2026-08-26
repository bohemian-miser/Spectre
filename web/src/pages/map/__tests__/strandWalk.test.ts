/**
 * Tap-to-trace geometry.
 *
 * The claim the feature makes is narrow and checkable: the coloured line is
 * the STRAND, followed one chord at a time through real engine output — not a
 * decoration drawn near it. So the tests run against actual `ViewportCut`s and
 * pin:
 *
 *  - every step of a walk is a chord that exists in the cut, and consecutive
 *    steps share an endpoint to within the weld ε (i.e. the line is connected
 *    and is made of the same segments the renderer draws);
 *  - the walk agrees with `tracePaths` — the batch tracer the rooted Explorer
 *    uses — about what closes and what runs on;
 *  - a walk stops at the edge of the tiles it was given and RESUMES from
 *    exactly there when a wider cut arrives, extending its trail rather than
 *    rewriting it. That is the "only advance what is on screen, pan back to
 *    where you started" contract;
 *  - the f32 geometry handed to the renderer is origin-relative, monotone in
 *    arc length, and re-anchors instead of losing precision.
 */
import { describe, expect, it } from 'vitest';
import {
  comboToMatchingIndices,
  createUnrootedEngine,
  instanceAffine,
  isAggregateType,
  tracePaths,
  transPt,
  weldSegments,
  type Pt,
  type Segment,
  type ViewRect,
  type ViewportCut,
} from '../../../core';
import { buildLeafChordTable, type LeafChordTable } from '../chords';
import {
  ADVANCE_MAX_STEPS,
  MAX_CHORD_REACH,
  TRACE_MAX_INSTANCES,
  TRAIL_MAX_POINTS,
  WELD_EPSILON,
  advanceWalk,
  buildChordIndex,
  continuationAt,
  describeWalk,
  hitTestChord,
  isTerminal,
  startTrail,
  trailGeometry,
  trailLength,
  trimTrail,
  type StrandTrail,
  type WalkStatus,
} from '../strandWalk';

const SEED = 1;

/** A rule whose strands run a long way on the plane. */
const OPEN_SUBSET = [2, 5, 7, 8];
const OPEN_COMBO = '0100101100';
/** A rule with short closed circuits near the origin. */
const LOOP_SUBSET = [1, 5];
const LOOP_COMBO = '0000000000';
/** Odd connection counts: tiles that contribute no chord at all. */
const ODD_SUBSET = [2];

function tableFor(subset: readonly number[], combo: string): LeafChordTable {
  return buildLeafChordTable(subset, comboToMatchingIndices('spectre', subset, combo));
}

function cutFor(view: ViewRect, budget = 200_000): ViewportCut {
  return createUnrootedEngine(SEED).query(view, budget);
}

function rect(halfW: number, halfH = halfW * 0.65, cx = 0, cy = 0): ViewRect {
  return { cx, cy, halfW, halfH };
}

/** Every chord of the cut in world coordinates — the renderer's own view of it. */
function cutSegments(cut: ViewportCut, table: LeafChordTable): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < cut.count; i++) {
    const typeByte = cut.type[i];
    if (isAggregateType(typeByte)) continue;
    const M = instanceAffine(
      cut.pos[i * 2] + cut.origin.x,
      cut.pos[i * 2 + 1] + cut.origin.y,
      cut.code[i],
    );
    for (const [a, b] of table.segments[typeByte]) out.push([transPt(M, a), transPt(M, b)]);
  }
  return out;
}

const near = (a: Pt, b: Pt, eps = WELD_EPSILON): boolean => Math.hypot(a.x - b.x, a.y - b.y) < eps;

function trailPoints(trail: StrandTrail): Pt[] {
  return Array.from({ length: trail.count }, (_, i) => ({
    x: trail.xy[i * 2],
    y: trail.xy[i * 2 + 1],
  }));
}

/** Walk the strand nearest the view centre; returns null when the rule draws none. */
function walkFromCentre(
  view: ViewRect,
  table: LeafChordTable,
  budget = 200_000,
): { trail: StrandTrail; cut: ViewportCut } | null {
  const cut = cutFor(view, budget);
  const index = buildChordIndex(cut, table);
  if (!index) return null;
  const hit = hitTestChord(index, { x: view.cx, y: view.cy }, 5);
  if (!hit) return null;
  const trail = startTrail(hit);
  advanceWalk(trail, index, { covered: view });
  return { trail, cut };
}

// ---------------------------------------------------------------------------

describe('chord index', () => {
  it('refuses cuts it cannot honestly walk', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);

    // Aggregate LOD: the instances stand for thousands of tiles each, so there
    // are no leaf chords on screen to follow.
    const far = cutFor(rect(4000), 50_000);
    expect(far.cutLevel).toBeGreaterThan(0);
    expect(buildChordIndex(far, table)).toBeNull();

    // A rule with no chords at all.
    const cut = cutFor(rect(10));
    expect(cut.cutLevel).toBe(0);
    expect(buildChordIndex(cut, buildLeafChordTable([], []))).toBeNull();

    // And beyond the instance ceiling, where a tile is a few pixels anyway.
    expect(cut.count).toBeLessThan(TRACE_MAX_INSTANCES);
    expect(buildChordIndex({ ...cut, count: TRACE_MAX_INSTANCES + 1 }, table)).toBeNull();
  });

  it('finds the chord under a point and aims at the end nearest it', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const cut = cutFor(rect(10));
    const index = buildChordIndex(cut, table);
    expect(index).not.toBeNull();

    const segs = cutSegments(cut, table);
    expect(segs.length).toBeGreaterThan(0);

    // Aim at a point a quarter of the way along a known chord: the hit must be
    // that chord, aimed at its nearer end.
    const [a, b] = segs[Math.floor(segs.length / 2)];
    const q = { x: a.x + (b.x - a.x) * 0.25, y: a.y + (b.y - a.y) * 0.25 };
    const hit = hitTestChord(index!, q, 1);
    expect(hit).not.toBeNull();
    expect(near(hit!.at, a) || near(hit!.at, b)).toBe(true);
    expect(near(hit!.at, a)).toBe(true);
    expect(near(hit!.to, b)).toBe(true);

    // Nothing within reach is honestly nothing: a hair's-breadth radius over
    // empty space must not snap to a distant chord.
    expect(hitTestChord(index!, { x: a.x + 40, y: a.y + 40 }, 1e-6)).toBeNull();
  });

  it('reaches chords whose tile position is far from them', () => {
    // The probe radius is derived from MAX_CHORD_REACH, so it has to actually
    // bound how far a chord end sits from its instance's emitted position.
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const cut = cutFor(rect(10));
    let worst = 0;
    for (let i = 0; i < cut.count; i++) {
      const typeByte = cut.type[i];
      if (isAggregateType(typeByte)) continue;
      const px = cut.pos[i * 2] + cut.origin.x;
      const py = cut.pos[i * 2 + 1] + cut.origin.y;
      const M = instanceAffine(px, py, cut.code[i]);
      for (const [a, b] of table.segments[typeByte]) {
        for (const p of [transPt(M, a), transPt(M, b)]) {
          worst = Math.max(worst, Math.hypot(p.x - px, p.y - py));
        }
      }
    }
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(MAX_CHORD_REACH);
  });
});

describe('walking a strand', () => {
  it('follows chords that really exist in the cut, end to end', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const view = rect(20);
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    const { trail, cut } = walked!;
    expect(trail.count).toBeGreaterThan(8);

    // Index the cut's chords by endpoint so "is this step a real chord?" is a
    // lookup rather than a re-derivation.
    const key = (p: Pt): string => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    const byEnd = new Map<string, Pt[]>();
    const link = (from: Pt, to: Pt): void => {
      const list = byEnd.get(key(from));
      if (list) list.push(to);
      else byEnd.set(key(from), [to]);
    };
    for (const [a, b] of cutSegments(cut, table)) {
      link(a, b);
      link(b, a);
    }

    const pts = trailPoints(trail);
    let sum = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const others = byEnd.get(key(pts[i])) ?? [];
      expect(others.some((o) => near(o, pts[i + 1]))).toBe(true);
      sum += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    // A walk never doubles straight back on itself...
    for (let i = 0; i + 2 < pts.length; i++) {
      expect(near(pts[i], pts[i + 2])).toBe(false);
    }
    // ...and its arc length is the sum of the steps it actually took.
    expect(trailLength(trail)).toBeCloseTo(sum, 6);
  });

  it('agrees with tracePaths about a circuit closing', () => {
    const table = tableFor(LOOP_SUBSET, LOOP_COMBO);
    const view = rect(20);
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    const { trail, cut } = walked!;
    expect(trail.status).toBe('closed');

    // The batch tracer must agree: the seed point lies on a closed path whose
    // segment count is the one the walk took.
    const { circuits } = tracePaths(weldSegments(cutSegments(cut, table)));
    const mine = circuits.find((c) => c.points.some((p) => near(p, trail.start, 0.1)));
    expect(mine).toBeDefined();
    expect(mine!.closed).toBe(true);
    // The trail repeats its first point at the end; the path does not.
    expect(trail.count - 1).toBe(mine!.points.length);
  });

  it('calls a genuine dead end an end, not a frontier', () => {
    // Under {2} most tiles have an odd number of connection points and draw no
    // chord at all, so strands stop mid-plane — the tile-granularity tails.
    const table = tableFor(ODD_SUBSET, '0000000000');
    const view = rect(20);
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    expect(walked!.trail.status).toBe('end');
    expect(isTerminal(walked!.trail.status)).toBe(true);

    // Terminal means terminal: more tiles cannot revive it.
    const wide = rect(60);
    const index = buildChordIndex(cutFor(wide), table);
    const before = walked!.trail.count;
    advanceWalk(walked!.trail, index, { covered: wide });
    expect(walked!.trail.count).toBe(before);
  });

  it('reports a frontier — never an end — when the cut simply runs out', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const view = rect(20);
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    expect(walked!.trail.status).toBe('frontier');
    expect(isTerminal(walked!.trail.status)).toBe(false);

    // The head is where it stopped, and it is out past the covered rect (or on
    // its rim) — that is precisely why it stopped.
    const head = walked!.trail.head;
    const outside =
      Math.abs(head.x - view.cx) > view.halfW - MAX_CHORD_REACH ||
      Math.abs(head.y - view.cy) > view.halfH - MAX_CHORD_REACH;
    expect(outside).toBe(true);
  });

  it('resumes where it stopped when a wider cut arrives, extending the same line', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const small = rect(20);
    const walked = walkFromCentre(small, table);
    expect(walked).not.toBeNull();
    const { trail } = walked!;
    const prefix = trailPoints(trail);
    const prefixLength = trailLength(trail);
    expect(trail.status).toBe('frontier');

    // Exactly what panning does: a fresh cut over more of the plane.
    const wide = rect(60);
    advanceWalk(trail, buildChordIndex(cutFor(wide), table), { covered: wide });

    expect(trail.count).toBeGreaterThan(prefix.length);
    // Everything already coloured stays coloured, in place — this is what makes
    // panning back to the start show the line that was drawn.
    const after = trailPoints(trail);
    prefix.forEach((p, i) => {
      expect(after[i].x).toBe(p.x);
      expect(after[i].y).toBe(p.y);
    });
    expect(trailLength(trail)).toBeGreaterThan(prefixLength);
    // Arc length is absolute, so the prefix's values are untouched too.
    expect(trail.arc[prefix.length - 1]).toBeCloseTo(prefixLength, 9);
  });

  it('stands still, without giving up, when there is nothing to walk on', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const walked = walkFromCentre(rect(20), table);
    const { trail } = walked!;
    const before = trail.count;

    advanceWalk(trail, null); // zoomed out to aggregates, or lines switched off
    expect(trail.status).toBe('offscreen');
    expect(trail.count).toBe(before);
    expect(isTerminal(trail.status)).toBe(false);
  });

  it('hands control back mid-walk instead of blocking on a huge viewport', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const view = rect(60);
    const cut = cutFor(view);
    const index = buildChordIndex(cut, table);
    const hit = hitTestChord(index!, { x: 0, y: 0 }, 5);
    const trail = startTrail(hit!);

    advanceWalk(trail, index, { covered: view, maxSteps: 3 });
    expect(trail.status).toBe('walking');
    expect(trail.count).toBe(5); // two seed points plus three steps
    expect(isTerminal(trail.status)).toBe(false);

    advanceWalk(trail, index, { covered: view });
    expect(trail.count).toBeGreaterThan(5);
    expect(ADVANCE_MAX_STEPS).toBeGreaterThan(1000);
  });

  it('stops growing at the trail cap rather than eating the tab', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const view = rect(20);
    const cut = cutFor(view);
    const index = buildChordIndex(cut, table);
    const trail = startTrail(hitTestChord(index!, { x: 0, y: 0 }, 5)!);
    trail.count = TRAIL_MAX_POINTS; // a walk that has been fed for a very long time

    advanceWalk(trail, index, { covered: view });
    expect(trail.status).toBe('full');
    expect(isTerminal(trail.status)).toBe(true);
    expect(trail.count).toBe(TRAIL_MAX_POINTS);
  });

  it('will not call an end on a truncated cut', () => {
    // `covered: null` is what the canvas passes when the engine hit its
    // instance cap: the cut has holes, so a missing chord proves nothing.
    const table = tableFor(ODD_SUBSET, '0000000000');
    const view = rect(20);
    const cut = cutFor(view);
    const index = buildChordIndex(cut, table);
    const hit = hitTestChord(index!, { x: 0, y: 0 }, 5);
    const trail = startTrail(hit!);
    advanceWalk(trail, index, { covered: null });
    expect(trail.status).toBe('frontier');
  });
});

describe('continuationAt', () => {
  it('takes the one onward chord and refuses to walk back', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const cut = cutFor(rect(20));
    const index = buildChordIndex(cut, table)!;
    const hit = hitTestChord(index, { x: 0, y: 0 }, 5)!;

    const step = continuationAt(index, hit.at, hit.to);
    expect(step.kind).toBe('step');
    const next = (step as { kind: 'step'; next: Pt }).next;
    expect(near(next, hit.to)).toBe(false);

    // Arriving from the other side gives the other chord back — the point has
    // degree 2 and the walk direction is the only thing that picks between them.
    const back = continuationAt(index, hit.at, next);
    expect(back.kind).toBe('step');
    expect(near((back as { kind: 'step'; next: Pt }).next, hit.to)).toBe(true);
  });

  it('recognises the arriving chord by its far end, not by its tile', () => {
    // A resumed walk stepped off a tile that may now be out of the cut. What
    // identifies the chord it came in on is `from`, so the answer must not
    // change when the walk arrives from a point no chord in the index touches.
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const index = buildChordIndex(cutFor(rect(20)), table)!;
    const hit = hitTestChord(index, { x: 0, y: 0 }, 5)!;
    const both = continuationAt(index, hit.at, { x: 1e6, y: 1e6 });
    expect(both.kind).toBe('junction'); // two ends, neither excluded
  });
});

describe('trail geometry for the renderer', () => {
  it('is origin-relative, monotone in arc length, and cached per version', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const view = rect(20, 13, 800, 600); // well away from the world origin
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    const { trail } = walked!;

    const geom = trailGeometry(trail);
    expect(geom).not.toBeNull();
    expect(geom!.pointCount).toBe(trail.count);
    // The GPU never sees the absolute coordinates, only small offsets.
    for (let i = 0; i < geom!.pointCount; i++) {
      expect(Math.abs(geom!.xy[i * 2])).toBeLessThan(1e3);
      expect(geom!.xy[i * 2] + geom!.origin.x).toBeCloseTo(trail.xy[i * 2], 2);
      expect(geom!.xy[i * 2 + 1] + geom!.origin.y).toBeCloseTo(trail.xy[i * 2 + 1], 2);
    }
    for (let i = 1; i < geom!.pointCount; i++) {
      expect(geom!.arc[i]).toBeGreaterThanOrEqual(geom!.arc[i - 1]);
    }
    expect(geom!.arc[0]).toBe(0);
    expect(geom!.totalLength).toBeCloseTo(trailLength(trail), 3);

    // Same version → same object, so the renderer can skip the upload.
    expect(trailGeometry(trail)).toBe(geom);

    // Growing it bumps the version and restretches the gradient, without
    // touching a single arc value already recorded.
    const wide = rect(60, 39, 800, 600);
    advanceWalk(trail, buildChordIndex(cutFor(wide), table), { covered: wide });
    const grown = trailGeometry(trail);
    expect(grown).not.toBe(geom);
    expect(grown!.totalLength).toBeGreaterThan(geom!.totalLength);
    for (let i = 0; i < geom!.pointCount; i++) expect(grown!.arc[i]).toBe(geom!.arc[i]);
  });

  it('re-anchors rather than let f32 go coarse on a very long walk', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const view = rect(20);
    const walked = walkFromCentre(view, table);
    const { trail } = walked!;
    const anchor = trailGeometry(trail)!.origin;

    // Stand the head a long way out — what a walk that has run for hours does.
    trail.head = { x: trail.head.x + 5e4, y: trail.head.y };
    trail.version++;
    const moved = trailGeometry(trail)!;
    expect(moved.origin).not.toEqual(anchor);
    expect(Math.hypot(moved.origin.x - trail.head.x, moved.origin.y - trail.head.y)).toBeLessThan(
      1,
    );
    // Re-anchoring is a change of frame, not of the line: world positions hold.
    for (let i = 0; i < moved.pointCount; i++) {
      expect(moved.xy[i * 2] + moved.origin.x).toBeCloseTo(trail.xy[i * 2], 1);
      expect(moved.xy[i * 2 + 1] + moved.origin.y).toBeCloseTo(trail.xy[i * 2 + 1], 1);
    }
  });

  it('has nothing to draw before the first step', () => {
    const table = tableFor(OPEN_SUBSET, OPEN_COMBO);
    const index = buildChordIndex(cutFor(rect(20)), table)!;
    const trail = startTrail(hitTestChord(index, { x: 0, y: 0 }, 5)!);
    trail.count = 1; // a bare tap, before the chord it landed on is recorded
    expect(trailGeometry(trail)).toBeNull();
  });
});

describe('describeWalk', () => {
  it('says something true about every status', () => {
    const all: WalkStatus[] = [
      'walking',
      'frontier',
      'offscreen',
      'closed',
      'end',
      'junction',
      'full',
    ];
    const said = all.map(describeWalk);
    expect(said.every((s) => s.length > 0)).toBe(true);
    expect(new Set(said).size).toBe(all.length);
    expect(describeWalk('frontier')).toMatch(/pan/i);
    expect(describeWalk('closed')).toMatch(/circuit/i);
  });
});

// ---------------------------------------------------------------------------
// Crowded connection points (extreme seam contracts)
// ---------------------------------------------------------------------------
//
// Seam contracts slide connection points along their seams, and near a seam
// end two DISTINCT points can legally come within ~0.01 of each other — far
// inside the old 0.05 weld, which then reported junctions (both points read
// as one) or dead ends (the crowding neighbour, running almost parallel to
// the arrival chord, was mistaken for it and discarded, eating the real
// continuation). The snap tolerance is sized to float drift instead, so these
// walks must now step cleanly through crowded geometry.

describe('crowded contracts (regression: "fails to find the edge next to it")', () => {
  const CROWDED_CONTRACTS = {
    2: { minor: 0, t: 0.995 },
    5: { minor: 0, t: 0.01 },
    7: { minor: 0, t: 0.99 },
    8: { minor: 0, t: 0.985 },
  } as const;

  function crowdedTable(): LeafChordTable {
    return buildLeafChordTable(
      OPEN_SUBSET,
      comboToMatchingIndices('spectre', OPEN_SUBSET, OPEN_COMBO),
      CROWDED_CONTRACTS,
    );
  }

  it('continuationAt steps through every interior connection point', () => {
    const table = crowdedTable();
    const view = rect(60, 40);
    const cut = cutFor(view);
    const index = buildChordIndex(cut, table)!;
    const segs = cutSegments(cut, table);
    const margin = MAX_CHORD_REACH + 0.5;
    let probed = 0;
    for (let i = 0; i < segs.length; i += 5) {
      const [a, b] = segs[i];
      for (const [pt, from] of [
        [a, b],
        [b, a],
      ] as const) {
        if (Math.abs(pt.x) > view.halfW - margin || Math.abs(pt.y) > view.halfH - margin) continue;
        probed++;
        // This rule has no odd tiles, so every interior point continues:
        // anything else is the crowding failure this suite regresses.
        expect(continuationAt(index, pt, from).kind).toBe('step');
      }
    }
    expect(probed).toBeGreaterThan(100);
  });

  it('a walk crosses crowded geometry instead of dying at a fake junction', () => {
    const table = crowdedTable();
    const view = rect(60, 40);
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    const { trail } = walked!;
    // Before the fix this stopped at 'junction' after a handful of steps.
    expect(trail.status).toBe('frontier');
    expect(trailLength(trail)).toBeGreaterThan(50);
  });

  it('closure still uses the tight snap: loops close, near-misses do not', () => {
    const table = buildLeafChordTable(
      LOOP_SUBSET,
      comboToMatchingIndices('spectre', LOOP_SUBSET, LOOP_COMBO),
      { 1: { minor: 0, t: 0.1 }, 5: { minor: 0, t: 0.93 } },
    );
    const view = rect(30);
    const walked = walkFromCentre(view, table);
    expect(walked).not.toBeNull();
    expect(walked!.trail.status).toBe('closed');
    // The trail genuinely returns to its start under the drift-scaled snap.
    const t = walked!.trail;
    const head = { x: t.xy[(t.count - 1) * 2], y: t.xy[(t.count - 1) * 2 + 1] };
    expect(near(head, t.start, 1e-3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The follow window (trimTrail)
// ---------------------------------------------------------------------------

describe('trimTrail', () => {
  function longWalk(): StrandTrail {
    const walked = walkFromCentre(rect(60, 40), tableFor(OPEN_SUBSET, OPEN_COMBO));
    expect(walked).not.toBeNull();
    expect(walked!.trail.count).toBeGreaterThan(60);
    return walked!.trail;
  }

  it('keeps the newest points and the odometer', () => {
    const trail = longWalk();
    const before = trailPoints(trail);
    const total = trailLength(trail);
    const version = trail.version;

    trimTrail(trail, 40);
    expect(trail.count).toBe(40);
    expect(trail.version).toBeGreaterThan(version);
    // The window is exactly the newest 40 points, bit-identical.
    const after = trailPoints(trail);
    const tail = before.slice(before.length - 40);
    after.forEach((p, i) => {
      expect(p.x).toBe(tail[i].x);
      expect(p.y).toBe(tail[i].y);
    });
    // trailLength still reads the total walked, not the window's length.
    expect(trailLength(trail)).toBe(total);
    // head/prev untouched: the walk can carry straight on.
    expect(trail.head.x).toBe(before[before.length - 1].x);
    expect(trail.head.y).toBe(before[before.length - 1].y);
  });

  it('is a no-op under the cap and floors tiny caps', () => {
    const trail = longWalk();
    const count = trail.count;
    const version = trail.version;
    trimTrail(trail, count + 10);
    expect(trail.count).toBe(count);
    expect(trail.version).toBe(version);
    trimTrail(trail, 1); // floored to MIN_TRAIL_HOLD
    expect(trail.count).toBe(16);
  });

  it('rebases the renderer geometry onto the window', () => {
    const trail = longWalk();
    trimTrail(trail, 40);
    const geom = trailGeometry(trail)!;
    expect(geom.pointCount).toBe(40);
    // Rainbow spans the window: arc restarts at 0 and totalLength is the
    // window's own length, not the odometer.
    expect(geom.arc[0]).toBe(0);
    const windowLen = trail.arc[trail.count - 1] - trail.arc[0];
    expect(geom.totalLength).toBeCloseTo(windowLen, 3);
    expect(geom.totalLength).toBeLessThan(trailLength(trail));
  });

  it('still detects closure after the start left the window', () => {
    // A loop long enough to trim mid-walk: walk it in small steps, trimming
    // to fewer points than the circuit holds, and it must still close.
    const table = tableFor(LOOP_SUBSET, LOOP_COMBO);
    const view = rect(40);
    const cut = cutFor(view);
    const index = buildChordIndex(cut, table)!;
    const hit = hitTestChord(index, { x: 0, y: 0 }, 5)!;
    const trail = startTrail(hit);
    for (let i = 0; i < 500 && !isTerminal(trail.status); i++) {
      advanceWalk(trail, index, { covered: view, maxSteps: 1 });
      trimTrail(trail, 16);
    }
    expect(trail.status).toBe('closed');
  });
});
