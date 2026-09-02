/**
 * The single explorer reducer (DESIGN.md §1.1 "State", §9.1).
 *
 * Pure: `(ExplorerState, ExplorerAction) -> ExplorerState`, so every selection
 * rule (subset toggling, matching clamping, family switches) is unit-testable
 * without React. `useExplorerState` is a thin `useReducer` wrapper around it.
 */

import {
  ALL_FLAGS,
  DEFAULT_EXPLORER_STATE,
  DEFAULT_FIND_CEILING,
  DEFAULT_FOUND_HOLD,
  DEFAULT_INSTANCE_BUDGET,
  DEFAULT_LINE_SCALE,
  DEFAULT_TRAIL_HOLD,
  MAX_LEVEL,
  clampFindCeiling,
  clampFoundHold,
  maxMatchingIndex,
  normalizeMatchingVector,
  clampInstanceBudget,
  clampLineScale,
  clampFollowDamping,
  clampTracePace,
  DEFAULT_FOLLOW_DAMPING,
  clampTrailHold,
  leafOrder,
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
  | { readonly type: 'setTrace'; readonly trace: boolean }
  | { readonly type: 'setFollow'; readonly follow: boolean }
  | { readonly type: 'setTrailHold'; readonly hold: number }
  | { readonly type: 'setKeepCircuits'; readonly keepCircuits: boolean }
  | { readonly type: 'setKeepTails'; readonly keepTails: boolean }
  | { readonly type: 'setFindCircuits'; readonly findCircuits: boolean }
  | { readonly type: 'setPersistFound'; readonly persistFound: boolean }
  | { readonly type: 'setShowTicker'; readonly showTicker: boolean }
  | { readonly type: 'setShowTransitions'; readonly showTransitions: boolean }
  | { readonly type: 'setFindCeiling'; readonly findCeiling: number }
  | { readonly type: 'setFoundHold'; readonly foundHold: number }
  | { readonly type: 'setHighlightOnScreen'; readonly on: boolean }
  | { readonly type: 'setHighlightInPath'; readonly on: boolean }
  | { readonly type: 'setPace'; readonly pace: number | null }
  | { readonly type: 'setDamping'; readonly damping: number }
  | {
      readonly type: 'setTraceSeed';
      readonly traceSeed: readonly [number, number, number, number] | null;
    };

function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Highest legal FULL matching index for a leaf under a subset. */
/*
 * `maxMatchingIndex` and `normalizeMatchingVector` moved to `core/matchings`
 * so every page that edits a rule normalizes it the same way — the Supertiles
 * view skipping this is what made a valid rule claim to cross itself. Still
 * re-exported here, since this reducer is where callers look for them.
 */
export { maxMatchingIndex, normalizeMatchingVector };

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

    // Default-ON, like `trace`: only `follow: false` is ever stored.
    case 'setFollow': {
      if (action.follow === explorerFollow(state)) return state;
      if (action.follow) {
        const { follow: _f, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, follow: false };
    }

    case 'setTrailHold': {
      const hold = clampTrailHold(action.hold);
      if (hold === explorerTrailHold(state)) return state;
      if (hold === DEFAULT_TRAIL_HOLD) {
        const { hold: _h, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, hold };
    }

    // null = full speed (the default, stored as no key at all).
    case 'setPace': {
      if (action.pace === null) {
        if (state.pace === undefined) return state;
        const { pace: _p, ...rest } = state;
        return rest as ExplorerState;
      }
      const pace = clampTracePace(action.pace);
      return pace === state.pace ? state : { ...state, pace };
    }

    // The tuned default is stored as no key at all, like the pace.
    case 'setDamping': {
      const damping = clampFollowDamping(action.damping);
      if (damping === DEFAULT_FOLLOW_DAMPING) {
        if (state.damping === undefined) return state;
        const { damping: _d, ...rest } = state;
        return rest as ExplorerState;
      }
      return damping === state.damping ? state : { ...state, damping };
    }

    case 'setTraceSeed': {
      if (action.traceSeed === null) {
        if (state.traceSeed === undefined) return state;
        const { traceSeed: _t, ...rest } = state;
        return rest as ExplorerState;
      }
      const [a, b, c, d] = action.traceSeed;
      const cur = state.traceSeed;
      if (cur && cur[0] === a && cur[1] === b && cur[2] === c && cur[3] === d) return state;
      return { ...state, traceSeed: [a, b, c, d] };
    }

    // Default-ON, like `trace`: only `keepCircuits: false` is ever stored.
    case 'setKeepCircuits': {
      if (action.keepCircuits === explorerKeepCircuits(state)) return state;
      if (action.keepCircuits) {
        const { keepCircuits: _k, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, keepCircuits: false };
    }

    case 'setKeepTails': {
      if (action.keepTails === explorerKeepTails(state)) return state;
      if (action.keepTails) {
        const { keepTails: _k, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, keepTails: false };
    }

    // Default-OFF, like `follow`: only `findCircuits: true` is ever stored.
    case 'setFindCircuits': {
      if (action.findCircuits === explorerFindCircuits(state)) return state;
      if (action.findCircuits) {
        const { findCircuits: _f, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, findCircuits: false };
    }

    // Default-ON too: what find-all turned up stays on screen while the camera
    // pulls back, rather than being dropped at the edge of its own zoom.
    case 'setPersistFound': {
      if (action.persistFound === explorerPersistFound(state)) return state;
      if (action.persistFound) {
        const { persistFound: _p, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, persistFound: false };
    }

    // Default-ON, like the keep toggles: the ticker predates its own switch,
    // so an omitted param has to keep meaning "showing".
    case 'setShowTicker': {
      if (action.showTicker === explorerShowTicker(state)) return state;
      if (action.showTicker) {
        const { showTicker: _t, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, showTicker: false };
    }

    // Default-OFF: a hundred edges over the tiling is opt-in.
    case 'setShowTransitions': {
      if (action.showTransitions === explorerShowTransitions(state)) return state;
      if (!action.showTransitions) {
        const { showTransitions: _g, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, showTransitions: true };
    }

    case 'setFindCeiling': {
      const findCeiling = clampFindCeiling(action.findCeiling);
      if (findCeiling === explorerFindCeiling(state)) return state;
      if (findCeiling === DEFAULT_FIND_CEILING) {
        const { findCeiling: _f, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, findCeiling };
    }

    case 'setFoundHold': {
      const foundHold = clampFoundHold(action.foundHold);
      if (foundHold === explorerFoundHold(state)) return state;
      if (foundHold === DEFAULT_FOUND_HOLD) {
        const { foundHold: _h, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, foundHold };
    }

    case 'setHighlightOnScreen': {
      if (action.on === explorerHighlightOnScreen(state)) return state;
      if (!action.on) {
        const { highlightOnScreen: _h, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, highlightOnScreen: true };
    }

    case 'setHighlightInPath': {
      if (action.on === explorerHighlightInPath(state)) return state;
      if (!action.on) {
        const { highlightInPath: _h, ...rest } = state;
        return rest as ExplorerState;
      }
      return { ...state, highlightInPath: true };
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
      return { ...state, flags: (state.flags ^ action.flag) & ALL_FLAGS };

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

/** Whether the camera auto-follows the traced strand. Default ON. */
export function explorerFollow(state: ExplorerState): boolean {
  return state.follow !== false;
}

/** Most trail points held while auto-following; 0 = the whole trail. */
export function explorerTrailHold(state: ExplorerState): number {
  return state.hold === undefined ? DEFAULT_TRAIL_HOLD : clampTrailHold(state.hold);
}

/** Whether a strand that closes into a circuit stays coloured. Default ON. */
export function explorerKeepCircuits(state: ExplorerState): boolean {
  return state.keepCircuits !== false;
}

/** Whether a strand that genuinely ends (a tail) stays coloured. Default ON. */
export function explorerKeepTails(state: ExplorerState): boolean {
  return state.keepTails !== false;
}

/** Whether every on-screen circuit is found and coloured. Default ON. */
export function explorerFindCircuits(state: ExplorerState): boolean {
  return state.findCircuits !== false;
}

/** Whether found circuits stay drawn once the camera outruns find-all. ON. */
export function explorerPersistFound(state: ExplorerState): boolean {
  return state.persistFound !== false;
}

/** Ticker naming the tiles a chase crosses — ON unless `tk=0` says otherwise. */
export function explorerShowTicker(state: ExplorerState): boolean {
  return state.showTicker !== false;
}

/** Tiles find-all may analyse in one pass, and where circuit zoom parks. */
export function explorerFindCeiling(state: ExplorerState): number {
  return state.findCeiling === undefined
    ? DEFAULT_FIND_CEILING
    : clampFindCeiling(state.findCeiling);
}

/** Found circuits held while accumulating; 0 = every one of them. */
export function explorerFoundHold(state: ExplorerState): number {
  return state.foundHold === undefined ? DEFAULT_FOUND_HOLD : clampFoundHold(state.foundHold);
}

/** Light the hovered transition everywhere on screen — OFF unless asked. */
export function explorerHighlightOnScreen(state: ExplorerState): boolean {
  return state.highlightOnScreen === true;
}

/** Light it only along the traced strand — OFF unless asked. */
export function explorerHighlightInPath(state: ExplorerState): boolean {
  return state.highlightInPath === true;
}

/** Tile-type transition graph — OFF unless `tg=1` asks for it. */
export function explorerShowTransitions(state: ExplorerState): boolean {
  return state.showTransitions === true;
}

/** Chase pace in tiles/second, or null for full speed (the default). */
export function explorerPace(state: ExplorerState): number | null {
  return state.pace === undefined ? null : clampTracePace(state.pace);
}

/** Follow-camera damping multiplier; 1 (the tuned default) when unset. */
export function explorerDamping(state: ExplorerState): number {
  return state.damping === undefined ? DEFAULT_FOLLOW_DAMPING : clampFollowDamping(state.damping);
}

/** Convenience selector: `subset` as a Set for the core APIs. */
export function selectedSet(state: ExplorerState): ReadonlySet<number> {
  return new Set(state.subset);
}

export function hasFlag(state: ExplorerState, flag: number): boolean {
  return (state.flags & flag) !== 0;
}
