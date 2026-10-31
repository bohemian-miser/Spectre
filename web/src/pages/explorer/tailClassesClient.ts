/**
 * Runs the tail classes (`tailClasses.ts`) in a worker, or on the page where
 * workers are missing, and gathers its updates into one state. The
 * combination's Foundations data is read first where the rule has it; a
 * new patch stops the worker running an old one.
 */

import { useEffect, useRef, useState } from 'react';
import { analyseCombo } from '../foundations/comboAnalysis';
import { loadCombo, RULE } from '../foundations/data';
import { pageCombo, type PageCombo } from '../foundations/pageData';
import { openCandidate, TailClassifier, tailShapes, type Closing, type TailFate, type TailJob, type TailUpdate } from './tailClasses';

export type TailsIn = { id: number; job: TailJob; known: PageCombo | null };
export type TailsOut =
  | { id: number; update: TailUpdate }
  | { id: number; candidate: { strand: number; label: string | null } }
  | { id: number; end: true }
  | { id: number; error: string };

export interface TailsState {
  /** The patch the state is of. */
  readonly key: string;
  readonly stage: string;
  readonly done: number;
  readonly total: number;
  readonly fates: readonly (TailFate | null)[];
  readonly closings: readonly Closing[];
  /** Chains in the Foundations chart's order (`chainOrder`). */
  readonly chains: readonly number[];
  /** Identify's candidate for each strand still open, by the tail it is followed as (null: none ranked). */
  readonly candidates: ReadonlyMap<number, string | null>;
  /** Every tail has a fate; `ended` once the candidates are in too. */
  readonly finished: boolean;
  readonly ended: boolean;
  readonly seconds: number;
  readonly error: string | null;
}

/** The combination's Foundations data, when its rule has them. */
async function knownOf(job: TailJob): Promise<PageCombo | null> {
  if (job.subset.join('') !== RULE) return null;
  try {
    return await loadCombo(import.meta.env.BASE_URL, job.combo);
  } catch {
    return null;
  }
}

const fresh = (key: string, job: TailJob): TailsState => ({
  key,
  stage: 'starting',
  done: 0,
  total: job.tails.length,
  fates: job.tails.map(() => null),
  closings: [],
  chains: [],
  candidates: new Map(),
  finished: false,
  ended: false,
  seconds: 0,
  error: null,
});

function apply(s: TailsState, m: TailsOut): TailsState {
  if ('error' in m) return { ...s, error: m.error, ended: true };
  if ('end' in m) return { ...s, ended: true };
  if ('candidate' in m) return { ...s, candidates: new Map(s.candidates).set(m.candidate.strand, m.candidate.label) };
  const u = m.update;
  let { fates, closings } = s;
  if (u.closings.length) {
    const next = [...closings];
    for (const [i, c] of u.closings) next[i] = c;
    closings = next;
  }
  if (u.fates.length) {
    const next = [...fates];
    for (const [i, f] of u.fates) next[i] = f;
    fates = next;
  }
  return { ...s, stage: u.stage, done: u.done, total: u.total, fates, closings, chains: u.chains.length ? u.chains : s.chains, finished: u.finished, seconds: u.seconds };
}

let nextId = 1;

/** The tail classes of a patch (named by `key`), streamed in; null while off. */
export function useTailClasses(input: { key: string; job: TailJob } | null): TailsState | null {
  const [state, setState] = useState<TailsState | null>(null);
  const workerRef = useRef<{ worker: Worker; busy: boolean } | null>(null);

  useEffect(
    () => () => {
      workerRef.current?.worker.terminate();
      workerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!input) {
      setState(null);
      return;
    }
    const { key, job } = input;
    const id = nextId++;
    let live = true;
    setState(fresh(key, job));
    const take = (m: TailsOut): void => {
      if (!live || m.id !== id) return;
      if ('end' in m || 'error' in m) {
        if (workerRef.current) workerRef.current.busy = false;
      }
      setState((s) => (s && s.key === key ? apply(s, m) : s));
    };
    void knownOf(job).then((known) => {
      if (!live) return;
      let w = workerRef.current;
      if (w?.busy) {
        // a run cannot be stopped part way: start over with a new worker
        w.worker.terminate();
        workerRef.current = w = null;
      }
      if (!w && typeof Worker !== 'undefined') {
        try {
          workerRef.current = w = { worker: new Worker(new URL('./tailClasses.worker.ts', import.meta.url), { type: 'module' }), busy: false };
        } catch {
          w = null;
        }
      }
      if (w) {
        w.busy = true;
        w.worker.onmessage = (e: MessageEvent<TailsOut>) => take(e.data);
        w.worker.onerror = (e) => take({ id, error: e.message || 'the tail classes worker failed' });
        w.worker.postMessage({ id, job, known } satisfies TailsIn);
        return;
      }
      setTimeout(() => {
        try {
          const shapes = tailShapes(job.subset, job.combo, known, (s, c, l) => pageCombo(analyseCombo(s, c, l)));
          const fates = new TailClassifier(job, shapes, (update) => take({ id, update })).run();
          for (const strand of new Set(fates.flatMap((f) => (f?.state === 'open' ? [f.strand] : [])))) take({ id, candidate: { strand, label: openCandidate(job, strand, shapes) } });
          take({ id, end: true });
        } catch (err) {
          take({ id, error: err instanceof Error ? err.message : String(err) });
        }
      }, 0);
    });
    return () => {
      live = false;
    };
    // `input` is named by its key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.key]);

  return state;
}
