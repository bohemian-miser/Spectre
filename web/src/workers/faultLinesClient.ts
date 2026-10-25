/**
 * Runs fault-line surveys and thumbnails in a worker, with a main-thread
 * fallback. A new survey cancels the one running (and the thumbnails queued
 * behind it).
 */

import type { FaultSurvey } from '../core';
import { renderFaultThumb, runFaultSurvey, type FaultSurveyJob, type FaultThumbJob } from './faultJobs';

export type FaultRequest =
  | { readonly id: number; readonly kind: 'survey'; readonly job: FaultSurveyJob }
  | { readonly id: number; readonly kind: 'thumb'; readonly job: FaultThumbJob };

export type FaultReply =
  | { readonly id: number; readonly kind: 'progress'; readonly done: number; readonly total: number }
  | { readonly id: number; readonly kind: 'survey'; readonly survey: FaultSurvey }
  | { readonly id: number; readonly kind: 'thumb'; readonly rgba: Uint8ClampedArray }
  | { readonly id: number; readonly kind: 'error'; readonly error: string };

export interface FaultSurveyHandlers {
  onProgress?(done: number, total: number): void;
  onDone(survey: FaultSurvey): void;
  onError?(error: string): void;
}

export interface FaultLinesClient {
  /** Start a survey; returns a function that cancels it. */
  survey(job: FaultSurveyJob, handlers: FaultSurveyHandlers): () => void;
  /**
   * Render a thumbnail. Requests wait in a queue here, one in the worker at a
   * time, so one whose `signal` aborts (its card went away) is never drawn;
   * finished ones are cached.
   */
  thumb(job: FaultThumbJob, signal?: AbortSignal): Promise<Uint8ClampedArray>;
  dispose(): void;
}

let nextId = 1;

export function createFaultLinesClient(opts: { forceSync?: boolean } = {}): FaultLinesClient {
  if (opts.forceSync || typeof Worker === 'undefined') return syncClient();
  const spawn = (): Worker | null => {
    try {
      return new Worker(new URL('./faultLines.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  };
  let worker = spawn();
  if (!worker) return syncClient();
  const pending = new Map<number, (m: FaultReply) => void>();
  const attach = (w: Worker) => {
    w.onmessage = (e: MessageEvent<FaultReply>) => pending.get(e.data.id)?.(e.data);
  };
  attach(worker);
  // Thumbnails: one in flight at a time, so aborted ones can be dropped unsent.
  const thumbs = thumbCache();
  const queue: { job: FaultThumbJob; signal?: AbortSignal; resolve: (v: Uint8ClampedArray) => void; reject: (e: Error) => void }[] = [];
  let busy = false;
  const pump = () => {
    if (busy) return;
    // Disposed (React's StrictMode does that on its trial unmount): start again.
    if (!worker) {
      worker = spawn();
      if (!worker) return;
      attach(worker);
    }
    let next = queue.shift();
    while (next?.signal?.aborted) {
      next.reject(new Error('aborted'));
      next = queue.shift();
    }
    if (!next) return;
    const { job, resolve, reject } = next;
    const hit = thumbs.get(job);
    if (hit) {
      resolve(hit);
      pump();
      return;
    }
    busy = true;
    const id = nextId++;
    pending.set(id, (m) => {
      pending.delete(id);
      busy = false;
      if (m.kind === 'thumb') {
        thumbs.set(job, m.rgba);
        resolve(m.rgba);
      } else reject(new Error(m.kind === 'error' ? m.error : 'unexpected reply'));
      pump();
    });
    worker.postMessage({ id, kind: 'thumb', job } satisfies FaultRequest);
  };
  const fresh = () => {
    worker?.terminate();
    // Whatever was queued on the old worker will never answer.
    for (const [id, handle] of pending) handle({ id, kind: 'error', error: 'cancelled' });
    pending.clear();
    busy = false;
    worker = spawn();
    if (worker) attach(worker);
  };
  return {
    survey(job, handlers) {
      fresh();
      const id = nextId++;
      let live = true;
      pending.set(id, (m) => {
        if (!live) return;
        if (m.kind === 'progress') handlers.onProgress?.(m.done, m.total);
        else if (m.kind === 'survey') {
          pending.delete(id);
          handlers.onDone(m.survey);
        } else if (m.kind === 'error') {
          pending.delete(id);
          if (m.error !== 'cancelled') handlers.onError?.(m.error);
        }
      });
      worker?.postMessage({ id, kind: 'survey', job } satisfies FaultRequest);
      return () => {
        if (!live) return;
        live = false;
        if (pending.has(id)) fresh();
      };
    },
    thumb(job, signal) {
      const hit = thumbs.get(job);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve, reject) => {
        queue.push({ job, signal, resolve, reject });
        pump();
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      pending.clear();
    },
  };
}

function syncClient(): FaultLinesClient {
  const thumbs = thumbCache();
  return {
    survey(job, handlers) {
      let cancelled = false;
      void (async () => {
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
        try {
          const survey = runFaultSurvey(job, handlers.onProgress);
          if (!cancelled) handlers.onDone(survey);
        } catch (err) {
          if (!cancelled) handlers.onError?.(err instanceof Error ? err.message : String(err));
        }
      })();
      return () => {
        cancelled = true;
      };
    },
    async thumb(job, signal) {
      if (signal?.aborted) throw new Error('aborted');
      const hit = thumbs.get(job);
      if (hit) return hit;
      const rgba = renderFaultThumb(job);
      thumbs.set(job, rgba);
      return rgba;
    },
    dispose() {},
  };
}

/** The most recent thumbnails, by everything that decides their pixels. */
function thumbCache(limit = 400) {
  const map = new Map<string, Uint8ClampedArray>();
  const key = (j: FaultThumbJob) => `${j.family}|${j.level}|${j.subset.join('')}|${j.combo}|${j.size}|${j.dark}|${j.view ?? 'strands'}`;
  return {
    get: (j: FaultThumbJob) => map.get(key(j)),
    set(j: FaultThumbJob, rgba: Uint8ClampedArray) {
      map.set(key(j), rgba);
      if (map.size > limit) map.delete(map.keys().next().value as string);
    },
  };
}
