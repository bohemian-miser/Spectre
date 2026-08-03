/**
 * Structured-clone friendly request/response envelope for running circuit
 * analysis off the main thread.
 *
 * The worker *entry* file (which touches the worker global scope) belongs to
 * the app layer, not to `core/` — everything here is pure, so the entry is a
 * few lines: `onmessage = (e) => postMessage(runAnalysis(e.data))`.
 */

import { analyze, pathLength, type CircuitAnalysis, type Path } from './circuits';
import type { EdgeContracts } from './edges';
import type { TileFamilyId, TileTypeId } from './families';
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
  readonly elapsedMs: number;
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
  const result: CircuitAnalysis = analyze(
    {
      family: req.family,
      instances,
      selected: new Set(req.subset),
      matchingIndexByType: req.matchingIndexByType,
      contracts: req.contracts,
    },
    { rainbowTails: req.rainbowTails },
  );
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
    elapsedMs: Date.now() - started,
  };
}
