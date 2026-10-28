/**
 * The circuits of any combination of a hexagon rule, computed here rather
 * than loaded: the renormalisation (`circuitShapes.ts`) up to a level, then
 * the biggest circuit of each family at its last three generations, as tile
 * loops with their first tiles (for the Explorer link). Runs in a worker
 * (`combo.worker.ts`) with a main-thread fallback.
 */

import type { TileFamilyId } from '../../core';
import { SAMPLES, type CircuitMeta } from '../corners/data';
import type { Loop } from '../corners/measure';
import { CircuitShapes, familyCircuits, mergeTwins, tileLoop } from './circuitShapes';

export interface ComboJob {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly level: number;
}

export type ComboCircuit = CircuitMeta & { readonly loop: Loop };

/** Circuits shorter than this are left out, as in the stored data. */
const MIN_LENGTH = 400;

export function comboCircuits(job: ComboJob): ComboCircuit[] {
  const cs = new CircuitShapes(job.family, job.subset, [...job.combo].map((ch) => parseInt(ch, 36)), job.level, MIN_LENGTH);
  const all = familyCircuits(cs).map((f) => {
    const loop = tileLoop(cs.shape(f.circuit, 0), SAMPLES);
    return { ...f, loop, rg: loop.rg };
  });
  return mergeTwins(all).map(({ loop, ...f }) => {
    const { path, chord } = cs.firstTile(f.circuit);
    return {
      family: f.family,
      aliases: f.aliases,
      level: f.level,
      type: f.type,
      length: f.length,
      rg: f.rg,
      samples: loop.n,
      box: [0, 0, 1] as const,
      first: { path: path.map((p) => [p.type, p.pos] as [string, number]), chord: chord.flatMap((p) => [p.x, p.y]) },
      loop: { xy: loop.xy, n: loop.n },
    };
  });
}

export interface ComboClient {
  run(job: ComboJob): Promise<ComboCircuit[]>;
  dispose(): void;
}

export function createComboClient(opts: { forceSync?: boolean } = {}): ComboClient {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./combo.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  let next = 1;
  const waiting = new Map<number, { resolve: (r: ComboCircuit[]) => void; reject: (e: Error) => void }>();
  if (worker)
    worker.onmessage = (e: MessageEvent<{ id: number; circuits?: ComboCircuit[]; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if (e.data.circuits) h.resolve(e.data.circuits);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
  return {
    run(job) {
      if (!worker)
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(comboCircuits(job));
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
