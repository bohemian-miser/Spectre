/**
 * The circuits of a combination with their readings at every level, and the
 * lineages among them, computed from the renormalisation
 * (`shapes/circuitShapes.ts`) in a worker (`harmonics.worker.ts`) with a
 * main-thread fallback.
 */
import type { TileFamilyId } from '../../core';
import { CircuitShapes, distinctCircuits, familyOf } from '../shapes/circuitShapes';
import { extraRuns, lineages, readings, type Lineage, type Reading } from './readings';

export interface HarmonicsJob {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly level: number;
}

export interface CircuitInfo {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  /** Child slots of its birth supertile it runs through, sorted. */
  readonly family: string;
  readonly readings: readonly Reading[];
  /** Its outline drawn at the level where it has at most a few thousand points: x, y pairs in its supertile's frame. */
  readonly outline: Float64Array;
  readonly drawnAt: number;
  /** The tile it enters first: slots from its supertile down (type, slot), and its chord across that tile. */
  readonly first: { readonly path: readonly (readonly [string, number])[]; readonly chord: readonly number[] };
}

export interface HarmonicsResult {
  readonly circuits: readonly CircuitInfo[];
  readonly lineages: readonly Lineage[];
  /** For lineages that differ at the tiles: the harmonic's extra runs of visits at level 2, keyed `a-b`. */
  readonly extras: Readonly<Record<string, { unmatched: number; runs: string[][] }>>;
}

const MAX_POINTS = 3000;

export function harmonicsOf(job: HarmonicsJob): HarmonicsResult {
  const cs = new CircuitShapes(job.family, job.subset, [...job.combo].map((ch) => parseInt(ch, 36)), job.level, 1, true);
  const circuits: CircuitInfo[] = distinctCircuits(cs, 64)
    .map((d) => {
      const c = d.circuit;
      const rs = readings(cs, c);
      // the lowest level at which the raw visits fit the point budget
      let drawnAt = 0;
      while (drawnAt < c.level - 1 && rs[drawnAt].raw > MAX_POINTS) drawnAt++;
      const pts = cs.shape(c, drawnAt);
      const outline = new Float64Array(2 * pts.length);
      pts.forEach((p, i) => { outline[2 * i] = p.x; outline[2 * i + 1] = p.y; });
      const { path, chord } = cs.firstTile(c);
      return {
        level: c.level,
        type: c.type,
        length: c.length,
        family: familyOf(c),
        readings: rs,
        outline,
        drawnAt,
        first: { path: path.map((p) => [p.type, p.pos] as [string, number]), chord: chord.flatMap((p) => [p.x, p.y]) },
      };
    })
    .sort((a, b) => a.length - b.length || a.level - b.level);
  const ls = lineages(circuits);
  const extras: Record<string, { unmatched: number; runs: string[][] }> = {};
  for (const l of ls) {
    if (l.levels[0]) continue;
    const e = extraRuns(circuits[l.a].readings[0].tokens, circuits[l.b].readings[2].tokens);
    if (e) extras[`${l.a}-${l.b}`] = e;
  }
  return { circuits, lineages: ls, extras };
}

export interface HarmonicsClient {
  run(job: HarmonicsJob): Promise<HarmonicsResult>;
  dispose(): void;
}

export function createHarmonicsClient(opts: { forceSync?: boolean } = {}): HarmonicsClient {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./harmonics.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  let next = 1;
  const waiting = new Map<number, { resolve: (r: HarmonicsResult) => void; reject: (e: Error) => void }>();
  if (worker)
    worker.onmessage = (e: MessageEvent<{ id: number; result?: HarmonicsResult; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if (e.data.result) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
  return {
    run(job) {
      if (!worker)
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(harmonicsOf(job));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0),
        );
      const id = next++;
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        worker!.postMessage({ id, job });
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}
