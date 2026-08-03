/**
 * Worker orchestration for circuit analysis (DESIGN.md §5.5).
 *
 * Small levels run synchronously (a round-trip costs more than the work);
 * everything at or above `workerMinLevel` goes to the module worker, with
 * newest-request-wins cancellation and memoization on the request signature.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisRequest, AnalysisResponse } from '../core';
import { analyzeSync, createAnalysisClient, type AnalysisClient } from '../workers/analysisClient';

export type AnalysisInput = Omit<AnalysisRequest, 'id'>;

export interface UseCircuitAnalysisOptions {
  /** Skip analysis entirely (e.g. the "circuit lines" toggle is off). */
  readonly enabled?: boolean;
  /** Levels below this run on the main thread. Default 3. */
  readonly workerMinLevel?: number;
  /** Never spawn a worker (tests, or after a worker failure). */
  readonly forceSync?: boolean;
}

export interface CircuitAnalysisState {
  readonly result: AnalysisResponse | null;
  readonly running: boolean;
  readonly error: string | null;
  /** True while a *new* request is in flight over a previously shown result. */
  readonly stale: boolean;
}

function signature(input: AnalysisInput): string {
  return JSON.stringify([
    input.family,
    input.rootTile,
    input.level,
    [...input.subset].sort((a, b) => a - b),
    input.matchingIndexByType,
    input.contracts ?? null,
    input.rainbowTails ?? false,
  ]);
}

const cache = new Map<string, AnalysisResponse>();
const CACHE_LIMIT = 24;

function remember(key: string, value: AnalysisResponse): void {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

let nextId = 1;

export function useCircuitAnalysis(
  input: AnalysisInput | null,
  opts: UseCircuitAnalysisOptions = {},
): CircuitAnalysisState {
  const enabled = (opts.enabled ?? true) && input !== null;
  const workerMinLevel = opts.workerMinLevel ?? 3;
  const key = useMemo(() => (input ? signature(input) : ''), [input]);

  const clientRef = useRef<AnalysisClient | null>(null);
  const latestId = useRef(0);

  const [state, setState] = useState<CircuitAnalysisState>(() => ({
    result: key ? cache.get(key) ?? null : null,
    running: false,
    error: null,
    stale: false,
  }));

  useEffect(
    () => () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !input) {
      setState({ result: null, running: false, error: null, stale: false });
      return;
    }

    const cached = cache.get(key);
    if (cached) {
      setState({ result: cached, running: false, error: null, stale: false });
      return;
    }

    const id = nextId++;
    latestId.current = id;
    const req: AnalysisRequest = { ...input, id };

    const useWorker = !opts.forceSync && input.level >= workerMinLevel;
    if (!useWorker) {
      try {
        const response = analyzeSync(req);
        remember(key, response);
        if (latestId.current === id) {
          setState({ result: response, running: false, error: null, stale: false });
        }
      } catch (err) {
        if (latestId.current === id) {
          setState({
            result: null,
            running: false,
            error: err instanceof Error ? err.message : String(err),
            stale: false,
          });
        }
      }
      return;
    }

    setState((prev) => ({ ...prev, running: true, error: null, stale: prev.result !== null }));

    if (!clientRef.current) clientRef.current = createAnalysisClient();
    let cancelled = false;
    clientRef.current
      .run(req)
      .then((response) => {
        remember(key, response);
        if (cancelled || latestId.current !== id) return; // newest request wins
        setState({ result: response, running: false, error: null, stale: false });
      })
      .catch((err: unknown) => {
        if (cancelled || latestId.current !== id) return;
        setState({
          result: null,
          running: false,
          error: err instanceof Error ? err.message : String(err),
          stale: false,
        });
      });

    return () => {
      cancelled = true;
    };
    // `input` is captured through `key`, which is its full signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, workerMinLevel, opts.forceSync]);

  return state;
}
