/**
 * Two circuits, named from outside (`refs.ts`), computed from the
 * renormalisation of their combinations: each one's readings and outlines
 * (`harmonics/harmonicsJob.ts`), the two lined up level by level, and each
 * one's tiles as a loop for the Fourier terms. Runs in a worker
 * (`compare.worker.ts`) with a main-thread fallback.
 */
import { HarmonicsEngine, lineUp, type CircuitInfo, type Comparison } from '../harmonics/harmonicsJob';
import { tileLoop } from '../shapes/circuitShapes';
import { sameRef, type CircuitRef } from './refs';

export interface Side {
  readonly ref: CircuitRef;
  readonly info: CircuitInfo;
  /** Its tiles (or the ends of its arcs at the finest level drawn) as a loop: x, y pairs, anticlockwise, and its radius of gyration. */
  readonly loop: { readonly xy: Float64Array; readonly n: number; readonly rg: number };
}

export interface CompareResult {
  readonly a: Side;
  readonly b: Side;
  readonly offset: number;
  readonly rows: Comparison['rows'];
}

/** Samples per loop, as the Corners page's data has (`corner-paths.ts`). */
const SAMPLES = 4320;

function side(ref: CircuitRef, engine: HarmonicsEngine): Side {
  const info = engine.result().circuits.find((c) => c.level === ref.level && c.length === ref.length);
  if (!info) throw new Error(`no circuit of ${ref.length} tiles born at level ${ref.level} in ${ref.subset.join('')}-${ref.combo} to level ${engine.level}`);
  const o = info.outlines[0];
  const pts = Array.from({ length: o.length / 2 }, (_, i) => ({ x: o[2 * i], y: o[2 * i + 1] }));
  const loop = tileLoop(pts, SAMPLES);
  return { ref, info, loop: { xy: loop.xy, n: loop.n, rg: loop.rg } };
}

/** Both circuits from one renormalisation per combination, run to the higher of their levels. */
export function compareRefs(a: CircuitRef, b: CircuitRef): CompareResult {
  const same = a.subset.join('') === b.subset.join('') && a.combo === b.combo;
  const ea = new HarmonicsEngine({ family: 'hex', subset: a.subset, combo: a.combo, level: same ? Math.max(a.level, b.level) : a.level });
  const eb = same ? ea : new HarmonicsEngine({ family: 'hex', subset: b.subset, combo: b.combo, level: b.level });
  const A = side(a, ea);
  const B = sameRef(a, b) ? A : side(b, eb);
  return { a: A, b: B, ...lineUp(A.info, B.info) };
}

export interface CompareClient {
  run(a: CircuitRef, b: CircuitRef): Promise<CompareResult>;
  dispose(): void;
}

export function createCompareClient(opts: { forceSync?: boolean } = {}): CompareClient {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./compare.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  let id = 1;
  const waiting = new Map<number, { resolve: (r: CompareResult) => void; reject: (e: Error) => void }>();
  if (worker)
    worker.onmessage = (e: MessageEvent<{ id: number; result?: CompareResult; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if (e.data.result) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
  return {
    run(a, b) {
      if (!worker)
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(compareRefs(a, b));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0),
        );
      const n = id++;
      return new Promise((resolve, reject) => {
        waiting.set(n, { resolve, reject });
        worker!.postMessage({ id: n, a, b });
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}
