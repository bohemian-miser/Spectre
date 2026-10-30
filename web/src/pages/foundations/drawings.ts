/**
 * Drawings of a combination's circuits, foundational and harmonic, from a
 * fresh build of the renormalisation (`buildShapes`) to the highest level
 * asked for. Each circuit is drawn at the place the data names (its index in
 * `closingGroups`, the numbering of the sweep); the place's level and tiles,
 * and its family when the data has it, are checked against the data before
 * it is drawn. A drawing has at most `BUDGET` points, whatever the circuit's
 * tiles: runs of tiles are drawn as one point (`CircuitShapes.coarse`), the
 * runs longer the more points it would take. Runs in a worker
 * (`drawings.worker.ts`) with a main-thread fallback.
 */
import { closingGroups, buildShapes, type Group } from './foundations';
import type { CircuitShapes } from '../shapes/circuitShapes';

export interface DrawJob {
  readonly subset: readonly number[];
  readonly combo: string;
  /** The circuits to draw: id, the place drawn (its index in `closingGroups`), and its level, tiles and family (when the data has it) as the data has them. */
  readonly want: readonly { readonly id: number; readonly place: number; readonly level: number; readonly length: number; readonly family?: string }[];
}

export interface Drawing {
  readonly id: number;
  /** The circuit at a resolution, as x, y pairs in its supertile's frame (`coarse`), at most `BUDGET` of them. */
  readonly xy: Float64Array;
  /** Tiles of the runs drawn, one per point; they add up to the circuit's tiles. */
  readonly runs: Int32Array;
  /** The supertile types it closes in, and the one drawn. */
  readonly types: readonly string[];
  readonly type: string;
  /** The tile it enters first, for the Explorer link: slots from its supertile down, and its chord across that tile. */
  readonly first: { readonly path: readonly { type: string; pos: number }[]; readonly chord: readonly [number, number, number, number] };
}

/** Runs of tiles within this share of the circuit's radius of gyration are drawn as one point. */
const SHARE = 0.025;
/** Points a drawing has at most; past it, the share grows until it fits. */
export const BUDGET = 900;

let last: { key: string; cs: CircuitShapes; groups: Group[] } | null = null;

function coarseWithin(cs: CircuitShapes, g: Group): { pts: { x: number; y: number }[]; tiles: number[] } {
  let share = SHARE;
  let out = cs.coarse(g.rep, share);
  while (out.pts.length > BUDGET) {
    share *= Math.max(1.2, Math.sqrt(out.pts.length / BUDGET));
    out = cs.coarse(g.rep, share);
  }
  return out;
}

export function drawCircuits(job: DrawJob): Drawing[] {
  if (!job.want.length) return [];
  const level = Math.max(...job.want.map((w) => w.level));
  const key = `${job.subset.join('')}/${job.combo}`;
  if (!last || last.key !== key || last.cs.maxLevel < level) {
    const cs = buildShapes(job.subset, job.combo, level);
    last = { key, cs, groups: closingGroups(cs) };
  }
  const { cs, groups } = last;
  return job.want.map((w) => {
    const g = groups[w.place];
    if (!g || g.level !== w.level || g.length !== w.length || (w.family !== undefined && g.family !== w.family))
      throw new Error(`place ${w.place} of ${job.combo} is not the ${w.length}-tile circuit at level ${w.level}`);
    const { pts, tiles } = coarseWithin(cs, g);
    const xy = new Float64Array(2 * pts.length);
    pts.forEach((p, i) => { xy[2 * i] = p.x; xy[2 * i + 1] = p.y; });
    const first = cs.firstTile(g.rep);
    return {
      id: w.id,
      xy,
      runs: Int32Array.from(tiles),
      types: Object.keys(g.copies),
      type: g.rep.type,
      first: { path: first.path.map((s) => ({ type: s.type, pos: s.pos })), chord: [first.chord[0].x, first.chord[0].y, first.chord[1].x, first.chord[1].y] },
    };
  });
}

export interface DrawClient {
  draw(job: DrawJob): Promise<Drawing[]>;
  dispose(): void;
}

export function createDrawClient(opts: { forceSync?: boolean } = {}): DrawClient {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./drawings.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  let id = 1;
  const waiting = new Map<number, { resolve: (r: Drawing[]) => void; reject: (e: Error) => void }>();
  if (worker)
    worker.onmessage = (e: MessageEvent<{ id: number; result?: Drawing[]; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if (e.data.result) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
  return {
    draw(job) {
      if (!worker)
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(drawCircuits(job));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0),
        );
      const n = id++;
      return new Promise((resolve, reject) => {
        waiting.set(n, { resolve, reject });
        worker!.postMessage({ id: n, job });
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}
