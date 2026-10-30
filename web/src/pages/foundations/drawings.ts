/**
 * Drawings of a combination's foundational circuits, from a fresh build of
 * the renormalisation (`buildShapes`) to the highest level asked for. Each
 * circuit is drawn at the place the data names (its index in
 * `closingGroups`, the numbering of the sweep); the place's level, tiles and
 * family are checked against the data before it is drawn. Runs in a worker
 * (`drawings.worker.ts`) with a main-thread fallback.
 */
import { closingGroups, buildShapes } from './foundations';
import type { CircuitShapes } from '../shapes/circuitShapes';

export interface DrawJob {
  readonly subset: readonly number[];
  readonly combo: string;
  /** The circuits to draw: id, the place drawn (its index in `closingGroups`), and its level, tiles and family as the data has them. */
  readonly want: readonly { readonly id: number; readonly place: number; readonly level: number; readonly length: number; readonly family: string }[];
}

export interface Drawing {
  readonly id: number;
  /** The circuit at a resolution, as x, y pairs in its supertile's frame (`coarse`). */
  readonly xy: Float64Array;
  /** The supertile types it closes in, and the one drawn. */
  readonly types: readonly string[];
  readonly type: string;
  /** The tile it enters first, for the Explorer link: slots from its supertile down, and its chord across that tile. */
  readonly first: { readonly path: readonly { type: string; pos: number }[]; readonly chord: readonly [number, number, number, number] };
}

/** Runs of tiles within this share of the circuit's radius of gyration are drawn as one point. */
const SHARE = 0.025;

let last: { key: string; cs: CircuitShapes } | null = null;

export function drawCircuits(job: DrawJob): Drawing[] {
  if (!job.want.length) return [];
  const level = Math.max(...job.want.map((w) => w.level));
  const key = `${job.subset.join('')}/${job.combo}`;
  if (!last || last.key !== key || last.cs.maxLevel < level) last = { key, cs: buildShapes(job.subset, job.combo, level) };
  const cs = last.cs;
  const groups = closingGroups(cs);
  return job.want.map((w) => {
    const g = groups[w.place];
    if (!g || g.level !== w.level || g.length !== w.length || g.family !== w.family) throw new Error(`place ${w.place} of ${job.combo} is not the ${w.length}-tile circuit at level ${w.level}`);
    const { pts } = cs.coarse(g.rep, SHARE);
    const xy = new Float64Array(2 * pts.length);
    pts.forEach((p, i) => { xy[2 * i] = p.x; xy[2 * i + 1] = p.y; });
    const first = cs.firstTile(g.rep);
    return {
      id: w.id,
      xy,
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
