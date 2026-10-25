/**
 * The pure half of the fault-lines worker, shared with the synchronous
 * fallback: surveys, and band-coloured thumbnails from cached strand graphs.
 */

import {
  DARK_STRAND_PALETTE,
  LIGHT_STRAND_PALETTE,
  buildStrandGraph,
  comboDigits,
  patchAddresses,
  rasterizeFaultBands,
  strandWorkspace,
  surveyFaults,
  type FaultSurvey,
  type FaultSurveyRule,
  type StrandGraph,
  type StrandWorkspace,
  type TileFamilyId,
} from '../core';

export interface FaultSurveyJob {
  readonly family: TileFamilyId;
  readonly level: number;
  readonly rules: readonly FaultSurveyRule[];
  readonly grain: number;
}

export interface FaultThumbJob {
  readonly family: TileFamilyId;
  readonly level: number;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly size: number;
  readonly dark: boolean;
}

/** Graphs of the rules surveyed last, so their thumbnails are quick. */
const graphs = new Map<string, { graph: StrandGraph; ws: StrandWorkspace }>();
const GRAPHS_KEPT = 12;

function graphFor(family: TileFamilyId, subset: readonly number[], level: number) {
  const key = `${family}|${subset.join('')}|${level}`;
  let hit = graphs.get(key);
  if (!hit) {
    const graph = buildStrandGraph(family, subset, level);
    hit = { graph, ws: strandWorkspace(graph) };
    graphs.set(key, hit);
    if (graphs.size > GRAPHS_KEPT) graphs.delete(graphs.keys().next().value as string);
  }
  return hit;
}

export function runFaultSurvey(job: FaultSurveyJob, onProgress?: (done: number, total: number) => void): FaultSurvey {
  return surveyFaults(job.family, job.level, job.rules, job.grain, onProgress);
}

export function renderFaultThumb(job: FaultThumbJob): Uint8ClampedArray {
  const { graph, ws } = graphFor(job.family, job.subset, job.level);
  const palette = job.dark ? DARK_STRAND_PALETTE : LIGHT_STRAND_PALETTE;
  return rasterizeFaultBands(graph, patchAddresses(job.family, job.level), comboDigits(job.combo, graph.types.length), job.size, palette, ws);
}
