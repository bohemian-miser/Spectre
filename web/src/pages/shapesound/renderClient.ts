/**
 * A voice's clips rendered in `render.worker.ts`: `renderInWorker` posts a
 * job and resolves with its clip. `runRender` is the job itself, which the
 * page also runs directly where it has no worker.
 */

import type { Pt } from '../../core';
import type { Play, Mapping, Settings, Clip } from './render';
import { render, renderPen, renderPenConstant } from './render';
import { makeShape, type Shape } from './shape';

export interface RenderJob {
  readonly id: number;
  /** Which clip: the lap (or held tone), or the pen. */
  readonly part: 'main' | 'pen';
  readonly key: string;
  readonly points: readonly Pt[];
  readonly open?: boolean;
  readonly mode: Mapping;
  readonly play: Play;
  readonly settings: Settings;
  readonly sr: number;
}

export type RenderReply = { readonly id: number; readonly clip: Clip } | { readonly id: number; readonly error: string };

let lastShape: { key: string; shape: Shape } | null = null;

export function runRender(job: Omit<RenderJob, 'id'>): Clip {
  if (!lastShape || lastShape.key !== job.key) lastShape = { key: job.key, shape: makeShape(job.points, job.open) };
  const shape = lastShape.shape;
  if (job.part === 'main') return render(shape, job.mode, job.settings, job.sr, job.play);
  const sp = job.settings.spectrum;
  return job.play === 'constant' ? renderPenConstant(shape, sp.penSpeed, job.sr) : renderPen(shape, sp, job.sr);
}

let worker: Worker | null = null;
let next = 1;
const waiting = new Map<number, { resolve: (c: Clip) => void; reject: (e: Error) => void }>();

/** Render a clip in the worker (or here, where workers are missing). */
export function renderInWorker(job: Omit<RenderJob, 'id'>): Promise<Clip> {
  if (typeof Worker === 'undefined') return Promise.resolve(runRender(job));
  if (!worker) {
    worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<RenderReply>) => {
      const w = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      if (!w) return;
      if ('clip' in e.data) w.resolve(e.data.clip);
      else w.reject(new Error(e.data.error));
    };
  }
  const id = next++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker!.postMessage({ ...job, id });
  });
}
