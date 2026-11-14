/**
 * The edges each step of a circuit enters and leaves its tile by. A step is
 * one chord of the tile's type (`ReelCircuit.chords`); the chord's ends are
 * the tile's connection points, each on a seam whose label names the edge.
 */

import { COS30, SIN30, leafOrder, type TileFamilyId } from '../../core';
import { tileConnectionPoints } from '../../lib/tilingModel';
import type { ReelCircuit } from '../reel/circuits';
import type { ReelWorld } from '../reel/director';
import type { StepEdges } from './tileSounds';

/** A seam's label without its tile type (`Delta/-3A` → `-3A`). */
export const seamLabel = (id: string): string => id.slice(id.indexOf('/') + 1);

export function circuitSteps(world: ReelWorld, family: TileFamilyId, subset: readonly number[], c: ReelCircuit): StepEdges[] {
  const { cut, table } = world;
  const names = leafOrder(family);
  const selected = new Set(subset);
  const n = c.points.length;
  const out: StepEdges[] = [];
  for (let k = 0; k < n; k++) {
    const i = c.tiles[k];
    const tb = cut.type[i];
    const [a, b] = table.segments[tb][c.chords[k]];
    // Where the chord's ends land in the world, as `forEachChord` places them.
    // The step starts at the nearer one: welding moves a circuit's points by
    // up to `LOOP_WELD_EPSILON`, so neither end need sit exactly on it.
    const code = cut.code[i];
    const mir = (code & 16) !== 0 ? -1 : 1;
    const co = COS30[code & 15];
    const si = SIN30[code & 15];
    const px = cut.pos[2 * i] + cut.origin.x;
    const py = cut.pos[2 * i + 1] + cut.origin.y;
    const from = (q: { x: number; y: number }): number => Math.hypot(co * mir * q.x - si * q.y + px - c.points[k].x, si * mir * q.x + co * q.y + py - c.points[k].y);
    const aFirst = from(a) < from(b);
    const points = tileConnectionPoints(family, names[tb], selected);
    const seam = (p: { x: number; y: number }) => {
      let best = points[0];
      for (const q of points) if (Math.hypot(q.pt.x - p.x, q.pt.y - p.y) < Math.hypot(best.pt.x - p.x, best.pt.y - p.y)) best = q;
      return best.edge;
    };
    const entry = seam(aFirst ? a : b);
    const exit = seam(aFirst ? b : a);
    out.push({ type: names[tb], entry: seamLabel(entry.id), exit: seamLabel(exit.id), entryClass: entry.major, exitClass: exit.major });
  }
  return out;
}
