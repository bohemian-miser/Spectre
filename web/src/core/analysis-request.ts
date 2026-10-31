/**
 * Structured-clone friendly request/response envelope for running circuit
 * analysis off the main thread.
 *
 * The worker *entry* file (which touches the worker global scope) belongs to
 * the app layer, not to `core/` — everything here is pure, so the entry is a
 * few lines: `onmessage = (e) => postMessage(runAnalysis(e.data))`.
 */

import { analyze, localChords, pathLength, type CircuitAnalysis, type Path, type Segment } from './circuits';
import { buildDualGraph, type DualGraph } from './dual';
import type { EdgeContracts } from './edges';
import { leafOrder, type TileFamilyId, type TileTypeId } from './families';
import type { StrandCurve } from './strandCurves';
import { hexRuleSpectreDrawing } from './hexRule';
import { buildSystem, flatten } from './tiles';

export interface AnalysisRequest {
  /** Echoed back so callers can drop stale results (newest request wins). */
  readonly id: number;
  readonly family: TileFamilyId;
  readonly rootTile: TileTypeId;
  readonly level: number;
  /** Selected major edge classes. */
  readonly subset: readonly number[];
  /** Matching index per leaf type, keyed by TileTypeId. */
  readonly matchingIndexByType: Readonly<Record<string, number>>;
  readonly contracts?: EdgeContracts;
  readonly rainbowTails?: boolean;
  /**
   * `subset` and `matchingIndexByType` are a HEXAGON rule, drawn on the
   * 'spectre-iso' tiles with the Mystic as one tile (`hexRuleSpectreChords`).
   * `family` must then be 'spectre-iso'.
   */
  readonly hexRule?: boolean;
  /** Also build the dual of the strand graph (`buildDualGraph`). */
  readonly dual?: boolean;
  /** With `dual`: include the piece polygons, for filling regions. */
  readonly dualPieces?: boolean;
  /** Return the curve handles of each segment (`segmentControls`). */
  readonly curved?: boolean;
  /** Return each circuit's count vector (`circuitVectors`). */
  readonly loopVectors?: boolean;
  /** Return the tiles each path runs through (`circuitTiles`, `tailTiles`). */
  readonly pathTiles?: boolean;
}

export interface PathSummary {
  readonly length: number;
  readonly count: number;
}

export interface AnalysisResponse {
  readonly id: number;
  readonly tileCount: number;
  readonly circuits: readonly Path[];
  readonly tails: readonly Path[];
  readonly junctionCount: number;
  readonly circuitSummary: readonly PathSummary[];
  readonly tailSummary: readonly PathSummary[];
  /** Entries of the segmentKey -> color map (Maps clone fine, arrays are cheaper). */
  readonly segmentColors: readonly (readonly [string, string])[];
  readonly circuitColors: readonly (readonly [number, string])[];
  /** segmentKey -> curve handles, when the request asked for `curved`. */
  readonly segmentControls?: readonly (readonly [string, StrandCurve])[];
  /** Present when the request asked for `dual`. */
  readonly dual?: DualGraph;
  /** Each circuit's crossings per class, aligned with `circuits` (`loopVectors`). */
  readonly circuitVectors?: readonly Readonly<Record<number, number>>[];
  /**
   * Present when the request asked for `pathTiles`: per circuit and per tail
   * (aligned with `circuits` and `tails`), the tile each counted segment lies
   * in, in order, as its slot path from the root read as a base-8 number
   * (`slotPathCode`).
   */
  readonly circuitTiles?: readonly Int32Array[];
  readonly tailTiles?: readonly Int32Array[];
  readonly elapsedMs: number;
}

/**
 * A slot path from a level-`level` root (`1.7.0`) as one number: its first
 * `level` slots in base 8, the root's child the most significant. The
 * level-j supertile holding the tile is the code divided by 8^j, rounded down.
 */
export function slotPathCode(id: string, level: number): number {
  let code = 0;
  let digits = 0;
  for (let i = 0; i < id.length && digits < level; i++) {
    const c = id.charCodeAt(i) - 48;
    if (c < 0 || c > 9) continue;
    code = code * 8 + c;
    digits++;
  }
  for (; digits < level; digits++) code *= 8;
  return code;
}

function summarize(paths: readonly Path[]): PathSummary[] {
  const counts = new Map<number, number>();
  for (const p of paths) {
    const len = pathLength(p);
    counts.set(len, (counts.get(len) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([length, count]) => ({ length, count }));
}

/** Run a full analysis from a plain request object. Pure and deterministic. */
export function runAnalysis(req: AnalysisRequest): AnalysisResponse {
  const started = Date.now();
  const instances = flatten(buildSystem(req.family, req.level)[req.rootTile]);
  const drawing = req.hexRule
    ? hexRuleSpectreDrawing(new Set(req.subset), req.matchingIndexByType, req.contracts)
    : undefined;
  const selected = new Set(req.subset);
  let dual: DualGraph | undefined;
  if (req.dual) {
    let chords: Readonly<Record<string, readonly Segment[]>> | undefined = drawing?.chords;
    if (!chords) {
      const own: Record<string, readonly Segment[]> = {};
      for (const t of leafOrder(req.family)) {
        own[t] = localChords(req.family, t, selected, req.matchingIndexByType[t] ?? 0, req.contracts);
      }
      chords = own;
    }
    dual = buildDualGraph({ family: req.family, instances, chords, withPieces: req.dualPieces ?? false });
  }
  const result: CircuitAnalysis = analyze(
    {
      family: req.family,
      instances,
      selected,
      matchingIndexByType: req.matchingIndexByType,
      contracts: req.contracts,
      chords: drawing?.chords,
      auxChords: drawing?.auxChords,
    },
    { rainbowTails: req.rainbowTails, curved: req.curved, loopVectors: req.loopVectors, pathTiles: req.pathTiles },
  );
  let codes: Int32Array | null = null;
  const asCodes = (tiles: Int32Array): Int32Array => {
    codes ??= Int32Array.from(instances, (inst) => slotPathCode(inst.id, req.level));
    const out = new Int32Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) out[i] = codes[tiles[i]];
    return out;
  };
  return {
    id: req.id,
    tileCount: instances.length,
    circuits: result.circuits,
    tails: result.tails,
    junctionCount: result.junctionCount,
    circuitSummary: summarize(result.circuits),
    tailSummary: summarize(result.tails),
    segmentColors: [...result.segmentColor.entries()],
    circuitColors: [...result.circuitColorByLength.entries()],
    segmentControls: result.segmentControl ? [...result.segmentControl.entries()] : undefined,
    dual,
    circuitVectors: result.circuitVectors,
    circuitTiles: result.circuitTiles?.map(asCodes),
    tailTiles: result.tailTiles?.map(asCodes),
    elapsedMs: Date.now() - started,
  };
}
