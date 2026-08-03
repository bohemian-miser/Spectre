/**
 * Explorer state context + URL sync (DESIGN.md §9).
 *
 * One reducer owns the whole scene; the hash query is a *mirror* of it. Writes
 * are debounced through `history.replaceState` so slider scrubbing does not
 * spam the history stack, while `popstate` (back/forward) pushes the decoded
 * state back into the reducer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import { DEFAULT_EXPLORER_STATE, type ExplorerState } from '../core';
import { explorerReducer, type ExplorerAction } from '../lib/explorerReducer';
import {
  EXPLORER_ROUTE,
  hashToState,
  sameEncodedState,
  splitHash,
  stateToHash,
} from '../lib/urlState';

export interface ExplorerContextValue {
  readonly state: ExplorerState;
  readonly dispatch: Dispatch<ExplorerAction>;
  /** Current shareable hash, e.g. `#/explorer?v=1&e=2578`. */
  readonly hash: string;
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

export interface UseExplorerStateOptions {
  readonly initialState?: ExplorerState;
  /** Seed from `location.hash` on mount and mirror changes back. */
  readonly syncUrl?: boolean;
  readonly route?: string;
  /** `history.replaceState` debounce in ms (§9.2 says 300). */
  readonly debounceMs?: number;
}

export interface ExplorerStore extends ExplorerContextValue {
  /** Force the URL to match the current state right now (share button). */
  flushUrl(): void;
}

function initialFromUrl(fallback: ExplorerState, route: string): ExplorerState {
  if (typeof window === 'undefined') return fallback;
  const { route: current, query } = splitHash(window.location.hash);
  if (!query) return fallback;
  if (current && route && current !== route) return fallback;
  return hashToState(window.location.hash);
}

export function useExplorerStore(opts: UseExplorerStateOptions = {}): ExplorerStore {
  const route = opts.route ?? EXPLORER_ROUTE;
  const syncUrl = opts.syncUrl ?? false;
  const debounceMs = opts.debounceMs ?? 300;

  const [state, dispatch] = useReducer(
    explorerReducer,
    opts.initialState ?? DEFAULT_EXPLORER_STATE,
    (seed: ExplorerState) => (syncUrl ? initialFromUrl(seed, route) : seed),
  );

  const hash = useMemo(() => stateToHash(state, route), [state, route]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const writtenRef = useRef<string>(hash);

  const flushUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const next = stateToHash(stateRef.current, route);
    if (next === writtenRef.current && window.location.hash === next) return;
    writtenRef.current = next;
    window.history.replaceState(window.history.state, '', next);
  }, [route]);

  // Debounced mirror: state -> URL.
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    if (hash === writtenRef.current) return;
    const timer = window.setTimeout(() => {
      writtenRef.current = hash;
      window.history.replaceState(window.history.state, '', hash);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [syncUrl, hash, debounceMs]);

  // URL -> state, for back/forward and pasted links.
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onPop = (): void => {
      const { route: current } = splitHash(window.location.hash);
      if (current && route && current !== route) return;
      const decoded = hashToState(window.location.hash);
      writtenRef.current = stateToHash(decoded, route);
      if (!sameEncodedState(decoded, stateRef.current)) {
        dispatch({ type: 'replace', state: decoded });
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, [syncUrl, route]);

  return useMemo(() => ({ state, dispatch, hash, flushUrl }), [state, dispatch, hash, flushUrl]);
}

export interface ExplorerProviderProps extends UseExplorerStateOptions {
  readonly children: ReactNode;
}

export function ExplorerProvider({ children, ...opts }: ExplorerProviderProps): JSX.Element {
  const store = useExplorerStore(opts);
  return <ExplorerContext.Provider value={store}>{children}</ExplorerContext.Provider>;
}

/** Access the explorer store. Throws outside a provider (a real bug). */
export function useExplorer(): ExplorerContextValue {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error('useExplorer must be used inside an <ExplorerProvider>');
  return ctx;
}

/** Non-throwing variant for widgets that work with or without a provider. */
export function useOptionalExplorer(): ExplorerContextValue | null {
  return useContext(ExplorerContext);
}
