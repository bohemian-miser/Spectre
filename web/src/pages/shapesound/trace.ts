/**
 * Follow any strand from a point on it, as far as it goes: the map's strand
 * walk (`map/strandWalk.ts`) fed with cuts of the infinite plane centred on
 * the walk's head, as the map's trace feeder does, until the strand closes,
 * ends, or reaches `maxSteps`. Runs in slices so a worker can report progress
 * and stop between them.
 */

import { comboToMatchingIndices, unrootedEngineFor, type Pt, type TileFamilyId } from '../../core';
import { buildLeafChordTable } from '../map/chords';
import { advanceWalk, buildChordIndex, hitTestChord, startTrail, type StrandTrail } from '../map/strandWalk';

/** Half-width of each head-centred cut, world units: the fastest of 40, 60 and 100 on the Pi. */
const HALF = 100;
/** How near the start point a click must be to a chord, world units. */
const PICK = 1.5;
export const DEFAULT_MAX_STEPS = 1_000_000;

export interface TraceRequest {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  /** A world point on (or within `PICK` of) the strand. */
  readonly at: Pt;
  readonly maxSteps: number;
}

export interface TraceResult {
  /** Points in walk order, x, y interleaved: one per step, the first not repeated for a closed loop. */
  readonly xy: Float64Array;
  /** True when it came back to its start. */
  readonly closed: boolean;
  /** True when it stopped at `maxSteps` without closing. */
  readonly capped: boolean;
}

export interface Tracer {
  /** Walk for about `ms` milliseconds; returns the steps so far. */
  run(ms: number): number;
  readonly done: boolean;
  result(): TraceResult;
}

export function startTrace(req: TraceRequest): Tracer | null {
  const engine = unrootedEngineFor(1, req.family);
  const chords = buildLeafChordTable(req.family, req.subset, comboToMatchingIndices(req.family, req.subset, req.combo));
  const query = (cx: number, cy: number) => {
    const view = { cx, cy, halfW: HALF, halfH: HALF };
    return { view, index: buildChordIndex(engine.query(view, 400_000, {}), chords) };
  };
  const first = query(req.at.x, req.at.y);
  const hit = first.index ? hitTestChord(first.index, req.at, PICK) : null;
  if (!hit) return null;
  const trail: StrandTrail = startTrail(hit, chords.rows);
  let done = false;
  let stuck = false;
  return {
    get done() {
      return done;
    },
    run(ms) {
      const until = performance.now() + ms;
      while (!done && performance.now() < until) {
        const r = query(trail.head.x, trail.head.y);
        const before = trail.count;
        advanceWalk(trail, r.index, { covered: { ...r.view, halfW: HALF / 2, halfH: HALF / 2 }, maxSteps: Math.max(0, req.maxSteps - trail.steps) });
        stuck = trail.count === before;
        done = trail.status === 'closed' || trail.status === 'end' || trail.status === 'junction' || trail.steps >= req.maxSteps || stuck;
      }
      return trail.steps;
    },
    result() {
      const closed = trail.status === 'closed';
      // A closed walk ends back on its first point; drop the repeat.
      const n = closed ? trail.count - 1 : trail.count;
      return { xy: trail.xy.slice(0, 2 * n), closed, capped: !closed && trail.steps >= req.maxSteps };
    },
  };
}
