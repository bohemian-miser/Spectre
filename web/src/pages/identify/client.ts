/**
 * Runs a strand's analysis in a worker (`identify.worker.ts`), or on the
 * page when workers are missing, one report per level; and asks the same
 * engine for the members drawn (`members.ts`).
 */

import type { Box } from '../../lib/viewport';
import type { ChainPicture } from '../harmonics/pairView';
import type { ChainRows, Fold } from '../harmonics/rows';
import type { BornCircuit } from '../shapes/circuitShapes';
import { IdentifyEngine, type IdentifyJob, type Report } from './identify';
import { Members, type MemberSpec } from './members';

/** A question about the members drawn. */
export type MembersCall =
  | { readonly name: 'picture'; readonly specs: readonly MemberSpec[]; readonly k: number; readonly fold: Fold }
  | { readonly name: 'rows'; readonly specs: readonly MemberSpec[]; readonly k: number; readonly fold: Fold }
  | { readonly name: 'detail'; readonly spec: MemberSpec; readonly level: number; readonly view: Box | null; readonly budget: number }
  | { readonly name: 'born'; readonly spec: MemberSpec };

export interface MembersClient {
  picture(specs: readonly MemberSpec[], k: number, fold: Fold): Promise<ChainPicture>;
  rows(specs: readonly MemberSpec[], k: number, fold: Fold): Promise<ChainRows>;
  detail(spec: MemberSpec, level: number, view: Box | null, budget: number): Promise<{ stop: number; pts: Float64Array; capped: boolean }>;
  born(spec: MemberSpec): Promise<BornCircuit>;
}

export interface IdentifyRun {
  /** Stops building; what is built stays to be drawn. */
  halt(): void;
  /** Ends the run. */
  stop(): void;
  readonly members: MembersClient;
}

/** A question answered from the members of the run. */
export function answer(members: Members | null, call: MembersCall): unknown {
  if (!members) throw new Error('nothing built yet');
  if (call.name === 'picture') return members.picture(call.specs, call.k, call.fold);
  if (call.name === 'rows') return members.rows(call.specs, call.k, call.fold);
  if (call.name === 'detail') return members.detail(call.spec, call.level, call.view, call.budget);
  return members.born(call.spec);
}

const membersOf = (ask: (call: MembersCall) => Promise<unknown>): MembersClient => ({
  picture: (specs, k, fold) => ask({ name: 'picture', specs, k, fold }) as Promise<ChainPicture>,
  rows: (specs, k, fold) => ask({ name: 'rows', specs, k, fold }) as Promise<ChainRows>,
  detail: (spec, level, view, budget) => ask({ name: 'detail', spec, level, view, budget }) as Promise<{ stop: number; pts: Float64Array; capped: boolean }>,
  born: (spec) => ask({ name: 'born', spec }) as Promise<BornCircuit>,
});

export function startIdentify(job: IdentifyJob, onReport: (r: Report) => void, onError: (message: string) => void, opts: { forceSync?: boolean } = {}): IdentifyRun {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./identify.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  if (worker) {
    const w = worker;
    let id = 1;
    const waiting = new Map<number, { resolve: (r: unknown) => void; reject: (e: Error) => void }>();
    w.onmessage = (
      e: MessageEvent<{ type: 'report'; report: Report } | { type: 'error'; error: string } | { type: 'answer'; id: number; result?: unknown; error?: string }>,
    ) => {
      const d = e.data;
      if (d.type === 'report') onReport(d.report);
      else if (d.type === 'error') onError(d.error);
      else {
        const h = waiting.get(d.id);
        if (!h) return;
        waiting.delete(d.id);
        if (d.error === undefined) h.resolve(d.result);
        else h.reject(new Error(d.error));
      }
    };
    w.onerror = (e) => onError(e.message || 'the worker failed');
    w.postMessage({ type: 'start', job });
    return {
      halt: () => w.postMessage({ type: 'halt' }),
      stop: () => {
        w.terminate();
        waiting.clear();
      },
      members: membersOf(
        (call) =>
          new Promise((resolve, reject) => {
            const n = id++;
            waiting.set(n, { resolve, reject });
            w.postMessage({ type: 'ask', id: n, call });
          }),
      ),
    };
  }
  let on = true;
  let engine: IdentifyEngine | null = null;
  let members: Members | null = null;
  const step = (): void => {
    if (!on) return;
    try {
      engine ??= new IdentifyEngine(job);
      members ??= new Members(engine);
      const r = engine.step();
      onReport(r);
      if (!r.done) setTimeout(step, 0);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };
  setTimeout(step, 0);
  return {
    halt: () => {
      on = false;
    },
    stop: () => {
      on = false;
    },
    members: membersOf(
      (call) =>
        new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(answer(members, call));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0),
        ),
    ),
  };
}
