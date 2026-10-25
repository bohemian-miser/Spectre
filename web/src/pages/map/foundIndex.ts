/**
 * Where the circuits find-all has already found lie, chord by chord, so the
 * next cut can leave them out before it welds and traces.
 *
 * A view regrown round the same ground is mostly circuits found already, and
 * welding, tracing and building their geometry again is most of what a pass
 * costs. A strand's chords are its own (a found circuit is a pure loop, so no
 * other strand touches it), which is what lets them be dropped wholesale: the
 * strands left over trace exactly as they would have with them in.
 *
 * A chord is named by its midpoint. Two cuts place the same chord a hair
 * apart (f32 offsets from different origins), so a lookup is a nearest match
 * within {@link MATCH} on a coarse grid, not an exact key; distinct chords sit
 * far further apart than that.
 */

/** Two chord midpoints this close are the same chord, in world units. */
const MATCH = 1e-2;
/** Grid cell size; a lookup needs a neighbour cell only when this close to an edge. */
const CELL = 1;
/** Cell keys are ix * ROW + iy (collisions only cost a distance check). */
const ROW = 2 ** 26;

export class FoundIndex<T> {
  private readonly cells = new Map<number, number[]>();
  private xs: number[] = [];
  private ys: number[] = [];
  /** Midpoint -> the circuit it belongs to. */
  private slotOf: number[] = [];
  /** Circuits, by slot, with how many chords each has. */
  readonly items: T[] = [];
  readonly sizes: number[] = [];

  get circuits(): number {
    return this.items.length;
  }

  /** Index one circuit's chord midpoints (x, y pairs, world coordinates). */
  add(item: T, mids: ArrayLike<number>): void {
    const slot = this.items.length;
    this.items.push(item);
    this.sizes.push(mids.length >> 1);
    for (let i = 0; i + 1 < mids.length; i += 2) {
      const x = mids[i];
      const y = mids[i + 1];
      const k = Math.floor(x / CELL) * ROW + Math.floor(y / CELL);
      const at = this.xs.length;
      this.xs.push(x);
      this.ys.push(y);
      this.slotOf.push(slot);
      const l = this.cells.get(k);
      if (l) l.push(at);
      else this.cells.set(k, [at]);
    }
  }

  /** The slot of the found circuit with a chord whose midpoint is (x, y), or -1. */
  find(x: number, y: number): number {
    if (this.items.length === 0) return -1;
    const fx = x / CELL;
    const fy = y / CELL;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const m = MATCH / CELL;
    const x0 = fx - ix < m ? ix - 1 : ix;
    const x1 = ix + 1 - fx < m ? ix + 1 : ix;
    const y0 = fy - iy < m ? iy - 1 : iy;
    const y1 = iy + 1 - fy < m ? iy + 1 : iy;
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const l = this.cells.get(cx * ROW + cy);
        if (!l) continue;
        for (const at of l) {
          if (Math.abs(this.xs[at] - x) < MATCH && Math.abs(this.ys[at] - y) < MATCH) return this.slotOf[at];
        }
      }
    }
    return -1;
  }
}
