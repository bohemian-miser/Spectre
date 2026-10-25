/**
 * The pure half of the fault-lines worker, shared with the synchronous
 * fallback: surveys, and band-coloured thumbnails from cached strand graphs.
 */

import {
  DARK_STRAND_PALETTE,
  LIGHT_STRAND_PALETTE,
  buildStrandGraph,
  accumulateStrands,
  comboDigits,
  overlayImage,
  patchFrame,
  patchAddresses,
  rasterizeFaultBands,
  rasterizeFaultCentres,
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
  /** Draw the strands, or a dot at each circuit's centre. */
  readonly view?: 'strands' | 'centres';
  /**
   * Instead of the one pairing, overlay all of these: each pixel coloured by
   * how many of them pass through it (`subset` and `combo` are then unused).
   */
  readonly overlay?: readonly { readonly subset: readonly number[]; readonly combo: string }[];
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
  if (job.overlay) return renderOverlay(job, job.overlay);
  const { graph, ws } = graphFor(job.family, job.subset, job.level);
  const palette = job.dark ? DARK_STRAND_PALETTE : LIGHT_STRAND_PALETTE;
  const draw = job.view === 'centres' ? rasterizeFaultCentres : rasterizeFaultBands;
  return draw(graph, patchAddresses(job.family, job.level), comboDigits(job.combo, graph.types.length), job.size, palette, ws);
}

function renderOverlay(job: FaultThumbJob, items: NonNullable<FaultThumbJob['overlay']>): Uint8ClampedArray {
  const graphs = items.map((it) => graphFor(job.family, it.subset, job.level).graph);
  const frame = patchFrame([...new Set(graphs)], job.size);
  const counts = new Uint16Array(job.size * job.size);
  const stamp = new Uint32Array(job.size * job.size);
  items.forEach((it, k) => accumulateStrands(graphs[k], comboDigits(it.combo, graphs[k].types.length), frame, counts, stamp, k + 1));
  return overlayImage(counts, items.length, job.dark);
}
