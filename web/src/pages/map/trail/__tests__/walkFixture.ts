/**
 * A real strand for the trail tests: the walk the Explorer makes from a
 * shared link, fed head-centred cuts of the infinite hexagon plane the way
 * its trace feeder is, run to a given length.
 */
import { comboToMatchingIndices, unrootedEngineFor } from '../../../../core';
import { buildLeafChordTable } from '../../chords';
import { advanceWalk, buildChordIndex, hitTestChord, startTrail, type ChordEnd } from '../../strandWalk';

export interface WalkSpec {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly chain?: string;
  /** The link's `ts`: the tapped chord, `[atX, atY, toX, toY]`. */
  readonly seed: readonly [number, number, number, number];
}

/** The strand on the long open strand of rule 023468, combination 011001100 (an Explorer link). */
export const SEAM_STRAND: WalkSpec = {
  subset: [0, 2, 3, 4, 6, 8],
  combo: '011001100',
  chain: 'Psi-0-Psi-0-Phi-3-Psi-0-Phi-6-Xi-0-Delta',
  seed: [602561.75, 1809835.044, 602562.5, 1809835.477],
};

/** The strand's points in walk order, float world coordinates, at least `points` of them (fewer if it closes or ends). */
export function walkPoints(spec: WalkSpec, points: number, half = 60): Float64Array {
  const engine = unrootedEngineFor(1, 'hex', spec.chain);
  const chords = buildLeafChordTable('hex', spec.subset, comboToMatchingIndices('hex', spec.subset, spec.combo));
  const query = (cx: number, cy: number) => {
    const view = { cx, cy, halfW: half, halfH: half };
    const cut = engine.query(view, 200000, {});
    return { view, index: buildChordIndex(cut, chords) };
  };
  const [sx, sy] = spec.seed;
  const first = query(sx, sy);
  const hit = hitTestChord(first.index!, { x: sx, y: sy }, 1.5);
  if (!hit) throw new Error('the seed is not on a chord');
  const flip = Math.hypot(hit.at.x - sx, hit.at.y - sy) > Math.hypot(hit.to.x - sx, hit.to.y - sy);
  const start: ChordEnd = flip ? { at: hit.to, to: hit.at, leafType: hit.leafType } : hit;
  const trail = startTrail(start, chords.rows);
  while (trail.count < points) {
    const r = query(trail.head.x, trail.head.y);
    const before = trail.count;
    advanceWalk(trail, r.index, { covered: { ...r.view, halfW: half / 2, halfH: half / 2 }, maxSteps: 1e9 });
    if (trail.status !== 'frontier' || trail.count === before) break;
  }
  return trail.xy.slice(0, 2 * trail.count);
}
