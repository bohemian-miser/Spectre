/**
 * Hash-URL <-> `ExplorerState` plumbing (DESIGN.md §8.1, §9.2).
 *
 * Pure string handling only — the React side (`useUrlSync`) supplies
 * `location.hash` and calls `history.replaceState`. Keeping the codec here
 * makes the round-trip property testable in a node environment.
 */

import {
  decodeExplorerState,
  encodeExplorerState,
  type ExplorerState,
} from '../core';

export const EXPLORER_ROUTE = '#/explorer';

/** `?`-less query string for a state. */
export function stateToQuery(state: ExplorerState): string {
  return encodeExplorerState(state).toString();
}

export function queryToState(query: string): ExplorerState {
  return decodeExplorerState(new URLSearchParams(query.replace(/^[?#]/, '')));
}

/** Split `#/explorer?a=b` into its route and query halves. */
export function splitHash(hash: string): { route: string; query: string } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const at = raw.indexOf('?');
  if (at < 0) return { route: raw ? `#${raw}` : '', query: '' };
  return { route: `#${raw.slice(0, at)}`, query: raw.slice(at + 1) };
}

/** Full hash for a state, e.g. `#/explorer?v=1&e=2578`. */
export function stateToHash(state: ExplorerState, route: string = EXPLORER_ROUTE): string {
  const query = stateToQuery(state);
  const r = route.startsWith('#') ? route : `#${route}`;
  return query ? `${r}?${query}` : r;
}

/** Decode a state from any of `#/explorer?x=1`, `?x=1` or a bare `x=1`. */
export function hashToState(hash: string): ExplorerState {
  const raw = hash.replace(/^[#?]/, '');
  if (raw.includes('?')) return queryToState(raw.slice(raw.indexOf('?') + 1));
  // A route-only hash (`#/dev`) carries no state; anything else is a query.
  return queryToState(raw.startsWith('/') ? '' : raw);
}

/**
 * Canonical comparison: two states are "the same URL" when they encode
 * identically. Used to suppress no-op `replaceState` calls (which would
 * otherwise fight the user's back button).
 */
export function sameEncodedState(a: ExplorerState, b: ExplorerState): boolean {
  return stateToQuery(a) === stateToQuery(b);
}

/** Round-trip a state through the codec — what a shared link will reproduce. */
export function canonicalizeState(state: ExplorerState): ExplorerState {
  return queryToState(stateToQuery(state));
}

/** Absolute shareable URL, given the current `location` origin+path. */
export function shareUrl(
  state: ExplorerState,
  base: string,
  route: string = EXPLORER_ROUTE,
): string {
  const stripped = base.split('#')[0];
  return `${stripped}${stateToHash(state, route)}`;
}
