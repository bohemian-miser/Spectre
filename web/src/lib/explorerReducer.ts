/**
 * The single explorer reducer (DESIGN.md §1.1 "State", §9.1).
 *
 * Pure: `(ExplorerState, ExplorerAction) -> ExplorerState`, so every selection
 * rule (subset toggling, matching clamping, family switches) is unit-testable
 * without React. `useExplorerState` is a thin `useReducer` wrapper around it.
 */

import {
  DEFAULT_EXPLORER_STATE,
  DEFAULT_INSTANCE_BUDGET,
  DEFAULT_LINE_SCALE,
  MAX_LEVEL,
  clampInstanceBudget,
  clampLineScale,
  connectionCount,
  leafOrder,
  matchingCount,
  subsetToEdges,
  supportsInfiniteMode,
  type Camera,
  type Chord,
  type ColorSchemeId,
  type EdgeContract,
  type EdgeContracts,
  type ExplorerMode,
  type ExplorerState,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { cycleMatchingIndex, tileMatchingInfo } from './matchingModel';

export type ExplorerAction =
  | { readonly type: 'replace'; readonly state: ExplorerState }
  | { readonly type: 'reset' }
  | { readonly type: 'setFamily'; readonly family: TileFamilyId }
  | { readonly type: 'setRootTile'; readonly rootTile: TileTypeId }
  | { readonly type: 'setLevel'; readonly level: number }
  | { readonly type: 'stepLevel'; readonly delta: number }
  | { readonly type: 'setSubset'; readonly subset: readonly number[] }
  | { readonly type: 'setSubsetMask'; readonly mask: number }
  | { readonly type: 'toggleMajor'; readonly major: number }
  | { readonly type: 'xorSubset'; readonly mask: number }
  | { readonly type: 'setMatching'; readonly tileType: TileTypeId; readonly index: number }
  | {
      readonly type: 'cycleMatching';
      readonly tileType: TileTypeId;
      readonly delta: number;
      readonly nonCrossingOnly?: boolean;
    }
  | { readonly type: 'setMatchingVector'; readonly matching: readonly number[] }
  | { readonly type: 'setFlags'; readonly flags: number }
  | { readonly type: 'toggleFlag'; readonly flag: number }
  | { readonly type: 'setColorScheme'; readonly colorScheme: ColorSchemeId }
  | { readonly type: 'setCustomColor'; readonly tileType: string; readonly hex: string }
  | { readonly type: 'setContract'; readonly major: number; readonly contract: EdgeContract | null }
  | { readonly type: 'clearContracts' }
  | { readonly type: 'addChord'; readonly tileType: TileTypeId; readonly chord: Chord }
  | { readonly type: 'removeChord'; readonly tileType: TileTypeId; readonly at: number }
  | { readonly type: 'clearOverlays'; readonly tileType?: TileTypeId }
  | { readonly type: 'setCamera'; readonly camera: Camera | undefined }
  | { readonly type: 'setMode'; readonly mode: ExplorerMode }
  | { readonly type: 'setBudget'; readonly budget: number }
  | { readonly type: 'setLineWidth'; readonly lineWidth: number }
  | { readonly type: 'setNoOverlap'; readonly noOverlap: boolean }
  | { readonly type: 'setTrace'; readonly trace: boolean };

function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Highest legal FULL matching index for a leaf under a subset. */
export function maxMatchingIndex(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
): number {
  return Math.max(0, matchingCount(connectionCount(family, type, new Set(subset))) - 1);
}

/**
 * Re-shape and clamp the matching vector for a family/subset. Called after any
 * change that can invalidate indices (family swap, subset edit).
 */
export function normalizeMatchingVector(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
): readonly number[] {
  return leafOrder(family).map((type, i) =>
    clampInt(matching[i] ?? 0, 0, maxMatchingIndex(family, type, subset)),
  );
}

function sortedSubset(subset: readonly number[]): readonly number[] {
  return [...new Set(subset.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9))].sort(
    (a, b) => a - b,
  );
}

function withSubset(state: ExplorerState, subset: readonly number[]): ExplorerState {
  const next = sortedSubset(subset);
  return {
    ...state,
    subset: next,
    matching: normalizeMatchingVector(state.family, next, state.matching),
  };
}

/** Drop empty chord lists so encoded URLs stay canonical. */
function pruneOverlays(
  overlays: Readonly<Record<string, readonly Chord[]>>,
): Readonly<Record<string, readonly Chord[]>> {
  const out: Record<string, readonly Chord[]> = {};
  for (const [k, v] of Object.entries(overlays)) if (v.length) out[k] = v;
  return out;
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'replace':
      return action.state;

    case 'reset':
      return DEFAULT_EXPLORER_STATE;

    case 'setFamily': {
      if (action.family === state.family) return state;
      // The hex family has one Gamma leaf instead of Gamma1/Gamma2, so the
      // vector changes length (DESIGN.md §12.9).
      const next: ExplorerState = {
        ...state,
        family: action.family,
        matching: normalizeMatchingVector(action.family, state.subset, state.matching),
        overlays: {},
      };
      // The un-rooted engine only generates spectre; leaving `infinite` set
      // for another family would be a lie, so drop back to rooted.
      return supportsInfiniteMode(action.family) ? next : stripMode(next);
    }

    case 'setMode': {
      if (action.mode !== 'infinite') return stripMode(state);
      if (!supportsInfiniteMode(state.family)) return stripMode(state);
      return state.mode === 'infinite' ? state : { ...state, mode: 'infinite' };
    }

    // Kept across a hop back to rooted mode (where it is simply unused) so the
    // choice survives toggling; the codec only writes it alongside `md`.
    case 'setBudget': {
      const budget = clampInstanceBudget(action.budget);
      return budget === explorerBudget(state) ? state : { ...state, budget };
    }

    case 'setLineWidth': {
      const lineWidth = clampLineScale(action.lineWidth);
      return lineWidth === explorerLineWidth(state) ? state : { ...state, lineWidth };
    }

    case 'setNoOverlap': {
      if (action.noOverlap === !!state.noOverlap) return state;
      if (!action.noOverlap) {
        const { noOverlap: _n, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, noOverlap: true };
    }

    // Default-ON, so it is the FALSE value that has to be stored (the codec
    // writes `tc=0` for it) and turning it back on drops the key again.
    case 'setTrace': {
      if (action.trace === explorerTrace(state)) return state;
      if (action.trace) {
        const { trace: _t, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, trace: false };
    }

    case 'setRootTile':
      return state.rootTile === action.rootTile ? state : { ...state, rootTile: action.rootTile };

    case 'setLevel': {
      const level = clampInt(action.level, 0, MAX_LEVEL);
      return level === state.level ? state : { ...state, level };
    }

    case 'stepLevel': {
      const level = clampInt(state.level + action.delta, 0, MAX_LEVEL);
      return level === state.level ? state : { ...state, level };
    }

    case 'setSubset':
      return withSubset(state, action.subset);

    case 'setSubsetMask':
      return withSubset(state, subsetToEdges(action.mask));

    case 'toggleMajor': {
      const has = state.subset.includes(action.major);
      return withSubset(
        state,
        has ? state.subset.filter((m) => m !== action.major) : [...state.subset, action.major],
      );
    }

    case 'xorSubset': {
      // Valid subsets form a group under symmetric difference (§3.8), so this
      // is the "combine two rules" affordance.
      const cur = new Set(state.subset);
      for (const e of subsetToEdges(action.mask)) {
        if (cur.has(e)) cur.delete(e);
        else cur.add(e);
      }
      return withSubset(state, [...cur]);
    }

    case 'setMatching': {
      const order = leafOrder(state.family);
      const at = order.indexOf(action.tileType);
      if (at < 0) return state;
      const max = maxMatchingIndex(state.family, action.tileType, state.subset);
      const next = [...state.matching];
      const value = clampInt(action.index, 0, max);
      if (next[at] === value) return state;
      next[at] = value;
      return { ...state, matching: next };
    }

    case 'cycleMatching': {
      const order = leafOrder(state.family);
      const at = order.indexOf(action.tileType);
      if (at < 0) return state;
      const info = tileMatchingInfo(
        state.family,
        action.tileType,
        new Set(state.subset),
        state.contracts,
      );
      const value = cycleMatchingIndex(
        info,
        state.matching[at] ?? 0,
        action.delta,
        action.nonCrossingOnly ?? false,
      );
      if (value === state.matching[at]) return state;
      const next = [...state.matching];
      next[at] = value;
      return { ...state, matching: next };
    }

    case 'setMatchingVector':
      return {
        ...state,
        matching: normalizeMatchingVector(state.family, state.subset, action.matching),
      };

    case 'setFlags': {
      const flags = clampInt(action.flags, 0, 255);
      return flags === state.flags ? state : { ...state, flags };
    }

    case 'toggleFlag':
      return { ...state, flags: (state.flags ^ action.flag) & 255 };

    case 'setColorScheme':
      return state.colorScheme === action.colorScheme
        ? state
        : { ...state, colorScheme: action.colorScheme };

    case 'setCustomColor':
      return {
        ...state,
        colorScheme: 'custom',
        customColors: {
          ...(state.customColors ?? {}),
          [action.tileType]: action.hex.replace(/^#/, '').toLowerCase(),
        },
      };

    case 'setContract': {
      const next: Record<number, EdgeContract> = { ...(state.contracts ?? {}) } as Record<
        number,
        EdgeContract
      >;
      if (action.contract === null) delete next[action.major];
      else next[action.major] = action.contract;
      const contracts: EdgeContracts | undefined = Object.keys(next).length ? next : undefined;
      return contracts ? { ...state, contracts } : stripContracts(state);
    }

    case 'clearContracts':
      return stripContracts(state);

    case 'addChord': {
      const existing = state.overlays[action.tileType] ?? [];
      const [a, b] = action.chord;
      if (a === b) return state;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (existing.some(([x, y]) => (x < y ? `${x}-${y}` : `${y}-${x}`) === key)) return state;
      return {
        ...state,
        overlays: pruneOverlays({ ...state.overlays, [action.tileType]: [...existing, action.chord] }),
      };
    }

    case 'removeChord': {
      const existing = state.overlays[action.tileType] ?? [];
      if (action.at < 0 || action.at >= existing.length) return state;
      const next = existing.filter((_, i) => i !== action.at);
      return { ...state, overlays: pruneOverlays({ ...state.overlays, [action.tileType]: next }) };
    }

    case 'clearOverlays': {
      if (!action.tileType) return { ...state, overlays: {} };
      const { [action.tileType]: _dropped, ...rest } = state.overlays;
      return { ...state, overlays: rest };
    }

    case 'setCamera': {
      if (!action.camera) {
        const { camera: _c, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, camera: action.camera };
    }

    default:
      return state;
  }
}

function stripContracts(state: ExplorerState): ExplorerState {
  const { contracts: _c, ...rest } = state;
  return rest as ExplorerState;
}

/** Remove the optional `mode` key entirely (canonical "rooted"). */
function stripMode(state: ExplorerState): ExplorerState {
  if (state.mode === undefined) return state;
  const { mode: _m, ...rest } = state;
  return rest as ExplorerState;
}

/** Effective mode, honouring the engine's family restriction. */
export function explorerMode(state: ExplorerState): ExplorerMode {
  return state.mode === 'infinite' && supportsInfiniteMode(state.family) ? 'infinite' : 'rooted';
}

/** Effective instance budget for infinite mode. */
export function explorerBudget(state: ExplorerState): number {
  return state.budget === undefined ? DEFAULT_INSTANCE_BUDGET : clampInstanceBudget(state.budget);
}

/** Effective strand-line thickness multiplier. */
export function explorerLineWidth(state: ExplorerState): number {
  return state.lineWidth === undefined ? DEFAULT_LINE_SCALE : clampLineScale(state.lineWidth);
}

/** Whether tapping a strand traces it (infinite mode only). Default ON. */
export function explorerTrace(state: ExplorerState): boolean {
  return state.trace !== false;
}

/** Convenience selector: `subset` as a Set for the core APIs. */
export function selectedSet(state: ExplorerState): ReadonlySet<number> {
  return new Set(state.subset);
}

export function hasFlag(state: ExplorerState, flag: number): boolean {
  return (state.flags & flag) !== 0;
}
