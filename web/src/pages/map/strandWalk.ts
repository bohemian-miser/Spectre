/**
 * Tap-to-trace: following ONE strand across the infinite plane, one viewport
 * at a time.
 *
 * The map can draw strand lines at any depth because the chord geometry inside
 * a tile is purely LOCAL (`chords.ts`). Following a strand from tile to tile is
 * local too: consecutive chords meet at a connection point on the shared seam,
 * so "where does this line go next?" is answered by looking at the chord ends
 * that coincide with the current head — the same ε-weld `weldSegments` does for
 * a rooted patch, asked one point at a time instead of all at once.
 *
 * What that buys, and what it costs:
 *  - no welding of the whole viewport, no tracing, no global identity: a step
 *    is a lookup in a small neighbourhood, so a walk is affordable at any depth
 *    the LOD still emits individual tiles;
 *  - but a walk can only go as far as the tiles the engine actually emitted.
 *    So it does not pretend otherwise: it advances to the edge of the CURRENT
 *    cut, records where it stopped, and resumes there when the next cut brings
 *    more tiles into range. Panning is what feeds it, which is the interaction.
 *
 * The trail is kept in ABSOLUTE world doubles and only ever appended, so
 * panning back to the start shows exactly the line that was drawn. The renderer
 * gets f32 positions relative to a trail anchor (re-anchored if the walk ever
 * wanders far enough for f32 to lose sub-pixel precision) plus the cumulative
 * arc length per point — which is what the rainbow is a function of, and which
 * never changes for a point once appended.
 *
 * Pure module (core + map types only): no DOM, no GL, no React.
 */

import {
  COS30,
  MIN_TRAIL_HOLD,
  SIN30,
  SPECTRE_PTS,
  isAggregateType,
  type Pt,
  type ViewRect,
  type ViewportCut,
} from '../../core';
import type { LeafChordTable } from './chords';
import type { TrailGeometry } from './rendererTypes';

/**
 * Search radius when hunting for chord ends near a point, in world units.
 * Generous on purpose — it only bounds which chords are LOOKED AT; whether an
 * end actually counts as "the same connection point" is decided by the much
 * tighter {@link snapEpsilonAt} below. (Historically this single value did
 * both jobs, which broke walks under extreme seam contracts: two DISTINCT
 * connection points slid within 0.05 of each other read as one, and the walk
 * reported junctions — or worse, mistook the crowding neighbour for the chord
 * it arrived on and reported a dead end next to a perfectly good edge.)
 */
export const WELD_EPSILON = 0.05;

/**
 * Base snap tolerance for "these two chord ends are the SAME connection
 * point", in world units. Sized against the real error budget, not against
 * point spacing: abutting tiles' connection points coincide by construction,
 * and what separates them is (a) the f32 quantization of emitted instance
 * positions — bounded by the cut's local extent, ≤ ~1e-4 for any walkable
 * (≤ {@link TRACE_MAX_INSTANCES}) cut — and (b) double rounding of the
 * absolute world coordinates the trail stores. Measured drift stays under
 * 2e-4 near the origin and under ~6e-4 at |world| ≈ 1e12.
 */
export const SNAP_EPSILON = 1e-3;

/**
 * Ceiling for the adaptive snap: the contract sliders move in 1% steps of a
 * unit edge, so distinct connection points legitimately come as close as
 * ~0.01. The snap must never grow past that, or crowded points would merge
 * again like the old 0.05 weld did.
 */
export const SNAP_EPSILON_MAX = 0.005;

/**
 * Snap tolerance around a world point. The double-rounding contribution
 * grows with the coordinate magnitude (an ulp at 1e12 is ~2.2e-4), so far
 * from the origin the tolerance follows it — a few ulps of headroom — while
 * staying under {@link SNAP_EPSILON_MAX}.
 */
export function snapEpsilonAt(p: Pt): number {
  const m = Math.max(Math.abs(p.x), Math.abs(p.y));
  return Math.min(SNAP_EPSILON_MAX, SNAP_EPSILON + m * 2e-15);
}

/**
 * Farthest a chord endpoint can sit from its tile's emitted position. Chord
 * ends are connection points on the outline, and distance to a convex
 * combination is maximised at a vertex, so the vertex radius bounds them all.
 * This is what makes the neighbourhood probe below exhaustive rather than
 * hopeful.
 */
export const MAX_CHORD_REACH = SPECTRE_PTS.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);

/** Grid cell size in world units (a tile edge is 1). */
const CELL = 2;

/**
 * Above this many instances a walk stands still: the grid is rebuilt per cut,
 * and at this density a tile is a few pixels anyway, so there would be nothing
 * to watch. The status says so rather than silently stalling.
 */
export const TRACE_MAX_INSTANCES = 200_000;

/** Points the trail holds before it stops growing (~12 MB of doubles). */
export const TRAIL_MAX_POINTS = 500_000;

/**
 * Steps one {@link advanceWalk} call takes before handing control back.
 * Panning across a wide view can legitimately expose tens of thousands of new
 * chords at once; this only bounds a single call, and a `'walking'` result asks
 * the caller to come back for the rest.
 */
export const ADVANCE_MAX_STEPS = 20_000;

/**
 * Distance from the trail anchor at which f32 vertex positions stop being
 * sub-pixel accurate (f32 keeps ~7 digits, so 1e4 units quantizes to ~1e-3
 * world units — still a fraction of a pixel at any usable zoom). Past it the
 * geometry is rebuilt around a nearer anchor.
 */
const ANCHOR_RANGE = 1e4;

// ---------------------------------------------------------------------------
// Chord index over one viewport cut
// ---------------------------------------------------------------------------

/**
 * The leaf instances of one cut bucketed into a uniform grid — a
 * structure-of-arrays counting sort, so building it is three linear passes and
 * allocates nothing per tile.
 *
 * Positions stay in the cut's own origin-relative frame (that is what the
 * engine emitted); `origin` converts to and from world.
 */
export interface ChordIndex {
  readonly cut: ViewportCut;
  readonly chords: LeafChordTable;
  readonly origin: Pt;
  /** Grid extent in the cut's frame. */
  readonly minX: number;
  readonly minY: number;
  readonly cols: number;
  readonly rows: number;
  /** `starts[c]..starts[c + 1]` indexes `items` for cell `c`. */
  readonly starts: Int32Array;
  readonly items: Int32Array;
}

/**
 * Bucket the leaf instances of `cut`. Returns null when there is nothing
 * walkable: an aggregate LOD cut (no leaves on screen at all), a rule with no
 * chords, or more instances than {@link TRACE_MAX_INSTANCES}.
 */
export function buildChordIndex(cut: ViewportCut, chords: LeafChordTable): ChordIndex | null {
  if (cut.cutLevel > 0 || cut.count === 0) return null;
  if (chords.chordCount === 0) return null;
  if (cut.count > TRACE_MAX_INSTANCES) return null;

  const n = cut.count;
  const pos = cut.pos;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 2];
    const y = pos[i * 2 + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const cols = Math.max(1, Math.floor((maxX - minX) / CELL) + 1);
  const rows = Math.max(1, Math.floor((maxY - minY) / CELL) + 1);

  const starts = new Int32Array(cols * rows + 1);
  const cell = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const cx = Math.min(cols - 1, Math.floor((pos[i * 2] - minX) / CELL));
    const cy = Math.min(rows - 1, Math.floor((pos[i * 2 + 1] - minY) / CELL));
    const c = cy * cols + cx;
    cell[i] = c;
    starts[c + 1]++;
  }
  for (let c = 0; c < cols * rows; c++) starts[c + 1] += starts[c];
  const cursor = starts.slice(0, cols * rows);
  const items = new Int32Array(n);
  for (let i = 0; i < n; i++) items[cursor[cell[i]]++] = i;

  return { cut, chords, origin: cut.origin, minX, minY, cols, rows, starts, items };
}

/** One end of one chord, in world coordinates. */
export interface ChordEnd {
  /** The endpoint a walk would leave from. */
  readonly at: Pt;
  /** The chord's other endpoint. */
  readonly to: Pt;
}

/**
 * Visit every chord of every instance that could possibly reach within
 * `reach` world units of a point given in the cut's frame. Endpoints are handed
 * over in WORLD coordinates, so callers never see the origin-relative frame.
 *
 * The cell radius covers `reach + MAX_CHORD_REACH`, which is exactly the
 * distance a tile's POSITION can be from a chord end that lands in range — so
 * the visit misses nothing.
 */
function forEachNearbyChord(
  index: ChordIndex,
  localX: number,
  localY: number,
  reach: number,
  visit: (ax: number, ay: number, bx: number, by: number) => void,
): void {
  const { cut, chords, cols, rows, starts, items, minX, minY, origin } = index;
  const probe = Math.ceil((reach + MAX_CHORD_REACH) / CELL);
  const cx = Math.floor((localX - minX) / CELL);
  const cy = Math.floor((localY - minY) / CELL);
  const gy0 = Math.max(0, cy - probe);
  const gy1 = Math.min(rows - 1, cy + probe);
  const gx0 = Math.max(0, cx - probe);
  const gx1 = Math.min(cols - 1, cx + probe);
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const c = gy * cols + gx;
      for (let k = starts[c]; k < starts[c + 1]; k++) {
        const i = items[k];
        const typeByte = cut.type[i];
        if (isAggregateType(typeByte)) continue;
        const segs = chords.segments[typeByte];
        if (!segs || segs.length === 0) continue;
        // Instance decode, inlined from `instanceAffine` — this is the inner
        // loop of both the hit test and every walk step.
        const code = cut.code[i];
        const rot = code & 15;
        const mir = (code & 16) !== 0 ? -1 : 1;
        const co = COS30[rot];
        const si = SIN30[rot];
        const px = cut.pos[i * 2] + origin.x;
        const py = cut.pos[i * 2 + 1] + origin.y;
        for (let s = 0; s < segs.length; s++) {
          const a = segs[s][0];
          const b = segs[s][1];
          visit(
            co * mir * a.x - si * a.y + px,
            si * mir * a.x + co * a.y + py,
            co * mir * b.x - si * b.y + px,
            si * mir * b.x + co * b.y + py,
          );
        }
      }
    }
  }
}

/**
 * The chord nearest a world point, or null past `maxDist`.
 *
 * `at` is the chord end NEARER the query point and `to` the far one, so a walk
 * seeded with it runs off the way the tap was aimed and the tapped chord itself
 * is the first thing coloured.
 */
export function hitTestChord(index: ChordIndex, world: Pt, maxDist: number): ChordEnd | null {
  const lx = world.x - index.origin.x;
  const ly = world.y - index.origin.y;
  let best = maxDist * maxDist;
  let hitAtX = 0;
  let hitAtY = 0;
  let hitToX = 0;
  let hitToY = 0;
  let found = false;
  forEachNearbyChord(index, lx, ly, maxDist, (ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 1e-12 ? ((world.x - ax) * dx + (world.y - ay) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = world.x - (ax + t * dx);
    const ey = world.y - (ay + t * dy);
    const d2 = ex * ex + ey * ey;
    if (d2 >= best) return;
    best = d2;
    found = true;
    // Head for whichever end the tap was closest to.
    if (t <= 0.5) {
      hitAtX = ax;
      hitAtY = ay;
      hitToX = bx;
      hitToY = by;
    } else {
      hitAtX = bx;
      hitAtY = by;
      hitToX = ax;
      hitToY = ay;
    }
  });
  return found ? { at: { x: hitAtX, y: hitAtY }, to: { x: hitToX, y: hitToY } } : null;
}

/**
 * Where the strand goes on from `point`, having arrived from `from`.
 *
 * A connection point glues exactly two tiles, so the honest answers are: one
 * onward chord (`step`), none in this cut (`none` — either a genuine tile-
 * granularity tail or simply tiles the cut does not hold; the caller knows
 * which from coverage), or several (`junction`, which `tracePaths` also refuses
 * to walk through).
 *
 * Membership of the weld cluster at `point` is decided by {@link
 * snapEpsilonAt} — sized to float drift, NOT to point spacing — so distinct
 * connection points that seam contracts have slid close together (they can
 * legally come within ~0.01 of each other) are never mistaken for `point`.
 * Within the cluster, the chord we arrived on is recognised by its FAR end
 * sitting nearest `from` (not by its tile being present, so a walk resumes
 * correctly even after the tile it stepped off has been panned out of the
 * cut) — and exactly ONE chord is discarded for it, so a crowding neighbour
 * running almost parallel to the arrival chord can never eat the real
 * continuation. When two candidates remain at comparable distance the
 * geometry is genuinely ambiguous (points coincide at drift scale) and the
 * answer is `junction`; a clearly-nearest candidate wins outright.
 */
export function continuationAt(
  index: ChordIndex,
  point: Pt,
  from: Pt,
  searchRadius = WELD_EPSILON,
): { kind: 'step'; next: Pt } | { kind: 'none' } | { kind: 'junction' } {
  const snap = snapEpsilonAt(point);
  const snap2 = snap * snap;
  const lx = point.x - index.origin.x;
  const ly = point.y - index.origin.y;
  // Weld-cluster members: distance² of the end sitting on `point`, plus the
  // far end the strand would continue to. Flat arrays — this is the walk's
  // inner loop and clusters hold 2-3 members.
  const memD: number[] = [];
  const memX: number[] = [];
  const memY: number[] = [];
  forEachNearbyChord(index, lx, ly, searchRadius, (ax, ay, bx, by) => {
    const da = (ax - point.x) * (ax - point.x) + (ay - point.y) * (ay - point.y);
    const db = (bx - point.x) * (bx - point.x) + (by - point.y) * (by - point.y);
    // A degenerate (near-zero-length) chord can enrol both of its ends.
    if (da < snap2) {
      memD.push(da);
      memX.push(bx);
      memY.push(by);
    }
    if (db < snap2) {
      memD.push(db);
      memX.push(ax);
      memY.push(ay);
    }
  });
  if (memD.length === 0) return { kind: 'none' };

  // Discard exactly one arrival chord: the member whose far end lies nearest
  // `from`, provided it is a genuine match at drift scale.
  let arrival = -1;
  let bestFrom = snapEpsilonAt(from);
  bestFrom *= bestFrom;
  for (let i = 0; i < memD.length; i++) {
    const d = (memX[i] - from.x) * (memX[i] - from.x) + (memY[i] - from.y) * (memY[i] - from.y);
    if (d < bestFrom) {
      bestFrom = d;
      arrival = i;
    }
  }

  // Of what remains, take the member nearest `point`; a second candidate only
  // makes this a junction when it sits at comparable distance (within 4× of
  // the nearest, floored at 2e-4 so exact hits don't divide by drift noise).
  let best = -1;
  let second = -1;
  for (let i = 0; i < memD.length; i++) {
    if (i === arrival) continue;
    if (best === -1 || memD[i] < memD[best]) {
      second = best;
      best = i;
    } else if (second === -1 || memD[i] < memD[second]) {
      second = i;
    }
  }
  if (best === -1) return { kind: 'none' };
  if (second !== -1) {
    const ambit = 4 * Math.max(Math.sqrt(memD[best]), 2e-4);
    if (memD[second] < ambit * ambit) return { kind: 'junction' };
  }
  return { kind: 'step', next: { x: memX[best], y: memY[best] } };
}

// ---------------------------------------------------------------------------
// The trail
// ---------------------------------------------------------------------------

/**
 * Why a walk is not currently advancing.
 *
 *  - `walking`   — more to do right now; the caller should come straight back;
 *  - `frontier`  — it reached the edge of the tiles the engine emitted. Pan
 *                  that way and it continues;
 *  - `offscreen` — nothing walkable at all: aggregate LOD, lines off, or more
 *                  instances on screen than {@link TRACE_MAX_INSTANCES};
 *  - `closed`    — the strand came back to where the walk started: a circuit;
 *  - `end`       — the strand genuinely stops. Only ever reported inside a
 *                  region the cut is known to cover completely, so it means the
 *                  next tile contributes no chord (an odd tile — the
 *                  tile-granularity tails invalid rules leave), not that we ran
 *                  out of map;
 *  - `junction`  — three or more strand ends met, so there is no single way on;
 *  - `full`      — the trail hit {@link TRAIL_MAX_POINTS}.
 */
export type WalkStatus =
  | 'walking'
  | 'frontier'
  | 'offscreen'
  | 'closed'
  | 'end'
  | 'junction'
  | 'full';

/** True once the walk can never advance again, whatever the camera does. */
export function isTerminal(status: WalkStatus): boolean {
  return status === 'closed' || status === 'end' || status === 'junction' || status === 'full';
}

/**
 * What a HUD should say about a walk. Lives here so the wording cannot drift
 * from the status it describes — every one of these is a fact about the
 * geometry, not a guess.
 */
export function describeWalk(status: WalkStatus): string {
  switch (status) {
    case 'walking':
      return 'following…';
    case 'frontier':
      return 'pan to keep colouring';
    case 'offscreen':
      return 'zoom in to tiles to continue';
    case 'closed':
      return 'closed circuit';
    case 'end':
      return 'strand ends here';
    case 'junction':
      return 'stopped at a junction';
    case 'full':
      return 'length limit reached';
  }
}

export interface StrandTrail {
  /** Absolute world coordinates, 2 doubles per point; `count` points used. */
  xy: Float64Array;
  /** Cumulative arc length at each point, in world units. */
  arc: Float64Array;
  count: number;
  /** Bumped whenever points were appended — the renderer's upload key. */
  version: number;
  /** Where the walk began: the far end of the tapped chord. */
  readonly start: Pt;
  /** The moving end — the point the next step continues from. */
  head: Pt;
  /** The point before `head`, i.e. the direction the walk came from. */
  prev: Pt;
  status: WalkStatus;
  /**
   * World point the renderer's f32 coordinates are measured from. Trail state
   * rather than render cache, so appending points never disturbs it — a moved
   * anchor would mean re-uploading every vertex.
   */
  anchor: Pt;
  /** Cached f32 geometry for the renderer (rebuilt only when it must be). */
  geom: TrailGeometry | null;
}

function grow(trail: StrandTrail, need: number): void {
  if (need <= trail.arc.length) return;
  let cap = Math.max(1024, trail.arc.length);
  while (cap < need) cap *= 2;
  const xy = new Float64Array(cap * 2);
  xy.set(trail.xy.subarray(0, trail.count * 2));
  const arc = new Float64Array(cap);
  arc.set(trail.arc.subarray(0, trail.count));
  trail.xy = xy;
  trail.arc = arc;
}

function push(trail: StrandTrail, p: Pt): void {
  grow(trail, trail.count + 1);
  const i = trail.count;
  const step =
    i === 0 ? 0 : Math.hypot(p.x - trail.xy[(i - 1) * 2], p.y - trail.xy[(i - 1) * 2 + 1]);
  trail.xy[i * 2] = p.x;
  trail.xy[i * 2 + 1] = p.y;
  trail.arc[i] = (i === 0 ? 0 : trail.arc[i - 1]) + step;
  trail.count = i + 1;
  trail.version++;
  trail.geom = null;
}

/**
 * Start a trail on a tapped chord. The FAR end of the chord is the trail's
 * first point and the near end its second, so the rainbow starts under the
 * pointer and the walk runs off the way the tap was aimed.
 */
export function startTrail(seed: ChordEnd): StrandTrail {
  const trail: StrandTrail = {
    xy: new Float64Array(2048),
    arc: new Float64Array(1024),
    count: 0,
    version: 1,
    start: seed.to,
    head: seed.at,
    prev: seed.to,
    status: 'walking',
    anchor: seed.to,
    geom: null,
  };
  push(trail, seed.to);
  push(trail, seed.at);
  return trail;
}

/** Length of the coloured line so far, in world units (tile edge = 1). */
export function trailLength(trail: StrandTrail): number {
  return trail.count === 0 ? 0 : trail.arc[trail.count - 1];
}

/**
 * Drop the OLDEST points until at most `maxPoints` remain — the moving-window
 * behaviour of the follow mode, where the head runs on forever and the tail
 * lets go behind it.
 *
 * What survives a trim: `start` (so circuit closure is still detected even
 * after the start scrolled out of the window), `head`/`prev`/`status` (the
 * walk itself), and the ABSOLUTE arc values (so `trailLength` keeps reading
 * as the total distance walked, odometer-style, not the window's length).
 * The rainbow is unaffected too: {@link trailGeometry} rebases arc onto the
 * window, so the gradient always spans exactly the points still held.
 */
export function trimTrail(trail: StrandTrail, maxPoints: number): StrandTrail {
  const max = Math.max(MIN_TRAIL_HOLD, Math.floor(maxPoints));
  if (trail.count <= max) return trail;
  const drop = trail.count - max;
  trail.xy.copyWithin(0, drop * 2, trail.count * 2);
  trail.arc.copyWithin(0, drop, trail.count);
  trail.count = max;
  trail.version++;
  trail.geom = null;
  return trail;
}

/** True when `p` lies inside `rect` (both in world coordinates). */
function within(rect: ViewRect, p: Pt): boolean {
  return Math.abs(p.x - rect.cx) <= rect.halfW && Math.abs(p.y - rect.cy) <= rect.halfH;
}

export interface AdvanceOptions {
  /**
   * The world region this cut is known to cover COMPLETELY — the rect the
   * engine was queried with. Any tile touching a point inside it has a bbox
   * that meets the rect, so the engine emitted it; that is what lets a missing
   * continuation inside the rect be read as a genuine end rather than as
   * running out of map. Omit (or pass null when the cut was `truncated`) and
   * every missing continuation is treated as a frontier instead.
   */
  readonly covered?: ViewRect | null;
  readonly maxSteps?: number;
}

/**
 * Advance the walk through the tiles `index` holds, appending every point it
 * passes. Mutates and returns `trail` — it is a growing buffer, not a value.
 */
export function advanceWalk(
  trail: StrandTrail,
  index: ChordIndex | null,
  opts: AdvanceOptions = {},
): StrandTrail {
  if (isTerminal(trail.status)) return trail;
  if (!index) {
    trail.status = 'offscreen';
    return trail;
  }
  const covered = opts.covered ?? null;
  const maxSteps = opts.maxSteps ?? ADVANCE_MAX_STEPS;
  // Closure is "the head IS the start point", so it uses the same drift-scaled
  // snap as the weld — a strand merely passing a crowded neighbour of its
  // start must not read as a circuit.
  const closeEps = snapEpsilonAt(trail.start);
  const eps2 = closeEps * closeEps;

  for (let step = 0; step < maxSteps; step++) {
    if (trail.count >= TRAIL_MAX_POINTS) {
      trail.status = 'full';
      return trail;
    }
    const cont = continuationAt(index, trail.head, trail.prev);
    if (cont.kind === 'junction') {
      trail.status = 'junction';
      return trail;
    }
    if (cont.kind === 'none') {
      trail.status = covered && within(covered, trail.head) ? 'end' : 'frontier';
      return trail;
    }
    trail.prev = trail.head;
    trail.head = cont.next;
    push(trail, cont.next);
    const dx = trail.head.x - trail.start.x;
    const dy = trail.head.y - trail.start.y;
    if (dx * dx + dy * dy < eps2 && trail.count > 3) {
      trail.status = 'closed';
      return trail;
    }
  }
  trail.status = 'walking';
  return trail;
}

// ---------------------------------------------------------------------------
// Renderer geometry
// ---------------------------------------------------------------------------

/**
 * f32 geometry for the trail pass, anchored near the walk so the GPU never sees
 * absolute world coordinates (the same rule the instance stream follows).
 *
 * Rebuilt only when points were appended; the anchor moves only once the walk
 * has wandered more than {@link ANCHOR_RANGE} from it, which costs one extra
 * full rebuild at that moment and nothing afterwards.
 */
export function trailGeometry(trail: StrandTrail): TrailGeometry | null {
  if (trail.count < 2) return null;
  const cached = trail.geom;
  if (cached && cached.version === trail.version) return cached;

  if (
    Math.abs(trail.head.x - trail.anchor.x) >= ANCHOR_RANGE ||
    Math.abs(trail.head.y - trail.anchor.y) >= ANCHOR_RANGE
  ) {
    trail.anchor = { x: trail.head.x, y: trail.head.y };
  }
  const anchor = trail.anchor;

  const n = trail.count;
  const xy = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    xy[i * 2] = trail.xy[i * 2] - anchor.x;
    xy[i * 2 + 1] = trail.xy[i * 2 + 1] - anchor.y;
  }
  // Arc is rebased onto the window (arc[0] = 0): for an untrimmed trail this
  // changes nothing, and for a trimmed one it keeps the rainbow spanning the
  // points actually held — and keeps the f32 arc values small no matter how
  // far the odometer has run.
  const arcBase = trail.arc[0];
  const arc = new Float32Array(n);
  for (let i = 0; i < n; i++) arc[i] = trail.arc[i] - arcBase;
  const geom: TrailGeometry = {
    origin: anchor,
    xy,
    arc,
    pointCount: n,
    totalLength: trail.arc[n - 1] - arcBase,
    version: trail.version,
  };
  trail.geom = geom;
  return geom;
}
