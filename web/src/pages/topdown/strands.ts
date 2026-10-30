/**
 * Strands on the Top-down map.
 *
 * Each tile carries the chords its type's matching gives it, as on every
 * other page (`localChords`). Chords join only between tiles of one depth,
 * whose edges meet exactly; a strand that reaches a tile of another depth,
 * or the edge of the map, stops there as an open strand. Each depth is
 * welded and traced as the Explorer does it, in its own board frame about an
 * exact anchor so the coordinates stay small however deep it is, then drawn
 * through that depth's world frame.
 *
 * Every chord remembers its tile, so a circuit knows the tiles it runs
 * through — the set a "substitute this circuit" step replaces.
 *
 * Pure — no React, no DOM.
 */

import {
  DEFAULT_CONTRACTS,
  leafOrder,
  localChords,
  pathLength,
  pathSegments,
  segmentKey,
  strandCurve,
  topDownLeaves,
  tracePaths,
  transPt,
  weldSegments,
  zSub,
  zToAffine,
  type Affine,
  type Pt,
  type Segment,
  type TileTypeId,
  type ZVec,
} from '../../core';
import type { StrandRule } from '../../lib/strandRule';
import type { TopDownMap } from './map';

export interface MapStrand {
  readonly closed: boolean;
  /** Chords along it, as the Explorer counts them. */
  readonly length: number;
  readonly depth: number;
  /** World points and, per segment, its curve handles in world coordinates. */
  readonly points: readonly Pt[];
  readonly curves: readonly { readonly c1: Pt; readonly c2: Pt }[];
  /** The tile each segment lies in, aligned with `curves`. */
  readonly segTiles: readonly string[];
  /** Slot paths of the tiles it runs through, each once, in order. */
  readonly tiles: readonly string[];
  /** The tile of every chord along it, in order, with repeats: a tile crossed twice appears twice. */
  readonly route: readonly string[];
  /** World length of a tile edge at its depth. */
  readonly edge: number;
}

export interface MapStrands {
  readonly strands: readonly MapStrand[];
  readonly circuits: number;
  readonly open: number;
}

interface ChordInfo {
  readonly tile: string;
  /** Curve handles in the depth's local board frame. */
  readonly c1: Pt;
  readonly c2: Pt;
  /** Whether the chord runs from `seg[0]` to `seg[1]` as stored. */
  readonly a: Pt;
}

export function traceMap(map: TopDownMap, rule: StrandRule): MapStrands {
  const { family } = map;
  const selected = new Set(rule.subset);
  const contracts = rule.contracts ?? DEFAULT_CONTRACTS;
  const order = leafOrder(family);
  const chordCache = new Map<TileTypeId, readonly Segment[]>();
  const chordsOf = (type: TileTypeId): readonly Segment[] => {
    let hit = chordCache.get(type);
    if (!hit) {
      const i = order.indexOf(type);
      hit = localChords(family, type, selected, rule.matching[i] ?? 0, contracts);
      chordCache.set(type, hit);
    }
    return hit;
  };

  const byDepth = new Map<number, string[]>();
  for (const [id, p] of map.tiles) {
    const list = byDepth.get(p.depth) ?? [];
    list.push(id);
    byDepth.set(p.depth, list);
  }

  const strands: MapStrand[] = [];
  let circuits = 0;
  let open = 0;
  for (const [depth, ids] of byDepth) {
    const frame = map.frames[depth - map.start];
    if (!frame) continue;
    const anchor: ZVec = map.tiles.get(ids[0])!.tile.z.t;
    const offset = transPt(frame, zToPt(anchor));
    const world: Affine = [frame[0], frame[1], offset.x, frame[3], frame[4], offset.y];
    const edge = Math.hypot(frame[0], frame[3]);

    const segs: Segment[] = [];
    const meta: { tile: string; c1: Pt; c2: Pt }[] = [];
    for (const id of ids) {
      const placed = map.tiles.get(id)!;
      for (const leaf of topDownLeaves([placed.tile], family)) {
        const local = zToAffine({ ...leaf.z, t: zSub(leaf.z.t, anchor) });
        for (const chord of chordsOf(leaf.type)) {
          const curve = strandCurve(family, leaf.type, chord[0], chord[1]);
          segs.push([transPt(local, chord[0]), transPt(local, chord[1])]);
          meta.push({ tile: id, c1: transPt(local, curve.c1), c2: transPt(local, curve.c2) });
        }
      }
    }
    // Welded and traced exactly as the Explorer does (`analyze`).
    const welded = weldSegments(segs);
    const info = new Map<string, ChordInfo>();
    welded.forEach((seg, i) => info.set(segmentKey(seg), { ...meta[i], a: seg[0] }));

    const traced = tracePaths(welded);
    for (const [paths, closed] of [
      [traced.circuits, true],
      [traced.tails, false],
    ] as const) {
      for (const path of paths) {
        const tiles: string[] = [];
        const route: string[] = [];
        const seen = new Set<string>();
        const curves: { c1: Pt; c2: Pt }[] = [];
        const segTiles: string[] = [];
        for (const seg of pathSegments(path)) {
          const c = info.get(segmentKey(seg));
          segTiles.push(c ? c.tile : '');
          if (!c) {
            curves.push({ c1: transPt(world, seg[0]), c2: transPt(world, seg[1]) });
            continue;
          }
          route.push(c.tile);
          if (!seen.has(c.tile)) {
            seen.add(c.tile);
            tiles.push(c.tile);
          }
          // the path may walk the chord backwards: swap the handles to match
          const forward = Math.hypot(seg[0].x - c.a.x, seg[0].y - c.a.y) < 1e-6;
          curves.push({
            c1: transPt(world, forward ? c.c1 : c.c2),
            c2: transPt(world, forward ? c.c2 : c.c1),
          });
        }
        strands.push({
          closed,
          length: pathLength(path),
          depth,
          points: path.points.map((p) => transPt(world, p)),
          curves,
          segTiles,
          tiles,
          route,
          edge,
        });
        if (closed) circuits++;
        else open++;
      }
    }
  }
  return { strands, circuits, open };
}

function zToPt(t: ZVec): Pt {
  return transPt(zToAffine({ k: 0, m: 0, t }), { x: 0, y: 0 });
}
