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
  type Rgb,
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
  /**
   * Draw the strands in the frame that fits all of these rules' patches,
   * so images of different rules line up (strands view and overlays only).
   */
  readonly frameSubsets?: readonly (readonly number[])[];
  /** Draw small circuits in a clear colour rather than the thumbnails' faint one (big views). */
  readonly vivid?: boolean;
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
  const base = job.dark ? DARK_STRAND_PALETTE : LIGHT_STRAND_PALETTE;
  const palette = job.vivid ? { ...base, smallCircuit: (job.dark ? [110, 160, 235] : [60, 100, 190]) as Rgb } : base;
  const addr = patchAddresses(job.family, job.level);
  const digits = comboDigits(job.combo, graph.types.length);
  if (job.view === 'centres') return rasterizeFaultCentres(graph, addr, digits, job.size, palette, ws);
  const frame = job.frameSubsets ? sharedFrame(job, [graph]) : undefined;
  return rasterizeFaultBands(graph, addr, digits, job.size, palette, ws, frame);
}

function renderOverlay(job: FaultThumbJob, items: NonNullable<FaultThumbJob['overlay']>): Uint8ClampedArray {
  const graphs = items.map((it) => graphFor(job.family, it.subset, job.level).graph);
  const frame = sharedFrame(job, graphs);
  const counts = new Uint16Array(job.size * job.size);
  const stamp = new Uint32Array(job.size * job.size);
  items.forEach((it, k) => accumulateStrands(graphs[k], comboDigits(it.combo, graphs[k].types.length), frame, counts, stamp, k + 1));
  return overlayImage(counts, items.length, job.dark);
}

/** The frame fitting these graphs and any `frameSubsets`, so different rules' images line up. */
function sharedFrame(job: FaultThumbJob, graphs: readonly StrandGraph[]) {
  const all = new Set(graphs);
  for (const subset of job.frameSubsets ?? []) all.add(graphFor(job.family, subset, job.level).graph);
  return patchFrame([...all], job.size);
}
