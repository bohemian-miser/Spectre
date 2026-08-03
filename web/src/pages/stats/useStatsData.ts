/**
 * Runtime loader for `public/data/circuit_stats.json` (289 KB).
 *
 * The file lives in `public/` rather than being bundled, so the stats page's
 * JS stays small and the dataset can be refreshed without a rebuild; the
 * trade-off is a runtime fetch, which means a real error state — never a blank
 * page — when it fails.
 */

import { useCallback, useEffect, useState } from 'react';
import { normalizeBase } from '../../lib/siteNav';
import { parseStatsDataset, type StatsDataset } from './statsData';

export const STATS_DATA_PATH = 'data/circuit_stats.json';

/** `${import.meta.env.BASE_URL}data/circuit_stats.json`. */
export function statsDataUrl(base = '/'): string {
  return `${normalizeBase(base)}${STATS_DATA_PATH}`;
}

export type StatsLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: StatsDataset }
  | { readonly status: 'error'; readonly message: string };

export interface StatsLoad {
  readonly state: StatsLoadState;
  readonly reload: () => void;
}

export function useStatsData(url: string): StatsLoad {
  const [state, setState] = useState<StatsLoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    setState({ status: 'loading' });

    (async () => {
      try {
        const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
        if (!res.ok) {
          throw new Error(`the server answered ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`);
        }
        const json: unknown = await res.json();
        const data = parseStatsDataset(json);
        if (!cancelled) setState({ status: 'ready', data });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        // An aborted request is our own cleanup, not a failure worth showing.
        if (/abort/i.test(message)) return;
        setState({ status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [url, attempt]);

  return { state, reload };
}
