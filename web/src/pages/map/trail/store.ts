/**
 * A traced strand on the hexagons, held exactly.
 *
 * Every chord end of the hexagon family lies on the lattice
 * `x = i / 4, y = j * sqrt(3) / 4` (integers `i`, `j`), and a strand moves
 * between consecutive chord ends by one of a handful of lattice steps. The
 * store keeps the strand as one byte per step (an index into its table of
 * steps) and, every {@link CHUNK} segments, a checkpoint: the chunk's first
 * point and the lattice box holding all its points. A chunk decodes back to
 * its points with integer additions only, so a stretch read back is the
 * stretch walked, bit for bit.
 *
 * Coordinates are kept relative to the strand's first point (the origin), so
 * every stored integer is the strand's own extent, far inside 2^53.
 */

export const SQRT3 = Math.sqrt(3);

/** Segments per chunk. */
export const CHUNK = 4096;

/**
 * The lattice point a float point of the walk lands on. The walk's points
 * carry float drift (under 1e-5 lattice units at a million tile edges from
 * the world origin); anything further from the lattice is not a chord end.
 */
export function latticeOf(x: number, y: number): [number, number] {
  const fi = x * 4;
  const fj = (y * 4) / SQRT3;
  const i = Math.round(fi);
  const j = Math.round(fj);
  if (Math.abs(fi - i) > 1e-3 || Math.abs(fj - j) > 1e-3 || (i + j) % 2 !== 0) {
    throw new Error(`(${x}, ${y}) is not a chord end of the hexagon lattice`);
  }
  return [i, j];
}

/** A chunk's points' lattice box, relative to the origin. */
export interface LatticeBox {
  readonly minI: number;
  readonly maxI: number;
  readonly minJ: number;
  readonly maxJ: number;
}

export class TrailStore {
  /** The first point, absolute lattice coordinates. */
  readonly originI: number;
  readonly originJ: number;
  private codes = new Uint8Array(1 << 16);
  private readonly stepI: number[] = [];
  private readonly stepJ: number[] = [];
  private readonly stepCode = new Map<number, number>();
  /** Per chunk: first point (i, j) and box (minI, maxI, minJ, maxJ), relative. */
  private starts = new Float64Array(2 * 64);
  private boxes = new Float64Array(4 * 64);
  private points = 1;
  private lastI = 0;
  private lastJ = 0;

  constructor(originI: number, originJ: number) {
    this.originI = originI;
    this.originJ = originJ;
    this.starts[0] = 0;
    this.starts[1] = 0;
    this.boxes.set([0, 0, 0, 0], 0);
  }

  /** Points held. */
  get pointCount(): number {
    return this.points;
  }

  /** Segments held: one fewer than the points. */
  get segmentCount(): number {
    return this.points - 1;
  }

  get chunkCount(): number {
    return Math.ceil(this.segmentCount / CHUNK);
  }

  /** Bytes held: step codes, checkpoints and the step table. */
  get bytes(): number {
    return this.segmentCount + this.chunkCount * 48 + this.stepI.length * 16;
  }

  /** Append the next point, in absolute lattice coordinates. */
  append(i: number, j: number): void {
    const ri = i - this.originI;
    const rj = j - this.originJ;
    const di = ri - this.lastI;
    const dj = rj - this.lastJ;
    if (di === 0 && dj === 0) throw new Error('a strand never steps in place');
    const key = di * 4096 + dj;
    let code = this.stepCode.get(key);
    if (code === undefined) {
      if (this.stepI.length === 256) throw new Error('more than 256 distinct steps');
      code = this.stepI.length;
      this.stepI.push(di);
      this.stepJ.push(dj);
      this.stepCode.set(key, code);
    }
    const seg = this.points - 1;
    if (seg >= this.codes.length) {
      const next = new Uint8Array(this.codes.length * 2);
      next.set(this.codes);
      this.codes = next;
    }
    this.codes[seg] = code;
    this.points++;
    this.lastI = ri;
    this.lastJ = rj;
    // The point closes segment `seg`, so it belongs to that segment's chunk;
    // a point that starts a new chunk is also that chunk's checkpoint.
    this.grow(seg, ri, rj);
    if ((seg + 1) % CHUNK === 0) {
      const c = (seg + 1) / CHUNK;
      this.ensureChunks(c + 1);
      this.starts[2 * c] = ri;
      this.starts[2 * c + 1] = rj;
      this.boxes.set([ri, ri, rj, rj], 4 * c);
    }
  }

  private ensureChunks(n: number): void {
    if (2 * n <= this.starts.length) return;
    const s = new Float64Array(this.starts.length * 2);
    s.set(this.starts);
    this.starts = s;
    const b = new Float64Array(this.boxes.length * 2);
    b.set(this.boxes);
    this.boxes = b;
  }

  private grow(seg: number, ri: number, rj: number): void {
    const c = Math.floor(seg / CHUNK);
    this.ensureChunks(c + 1);
    const o = 4 * c;
    const B = this.boxes;
    if (ri < B[o]) B[o] = ri;
    if (ri > B[o + 1]) B[o + 1] = ri;
    if (rj < B[o + 2]) B[o + 2] = rj;
    if (rj > B[o + 3]) B[o + 3] = rj;
  }

  /** Chunk `c`'s box, relative lattice coordinates, over every point of its segments. */
  box(c: number): LatticeBox {
    const o = 4 * c;
    const B = this.boxes;
    return { minI: B[o], maxI: B[o + 1], minJ: B[o + 2], maxJ: B[o + 3] };
  }

  /** The first segment of chunk `c`, and how many it has. */
  chunkSegments(c: number): { first: number; count: number } {
    const first = c * CHUNK;
    return { first, count: Math.min(CHUNK, this.segmentCount - first) };
  }

  /**
   * Chunk `c`'s points, relative lattice coordinates `(i, j)` pairs: the
   * chunk's segments run from point 0 to point `count`.
   */
  chunkPoints(c: number, out?: Float64Array): Float64Array {
    const { first, count } = this.chunkSegments(c);
    const pts = out && out.length >= 2 * (count + 1) ? out : new Float64Array(2 * (count + 1));
    let i = this.starts[2 * c];
    let j = this.starts[2 * c + 1];
    pts[0] = i;
    pts[1] = j;
    const codes = this.codes;
    for (let k = 0; k < count; k++) {
      const code = codes[first + k];
      i += this.stepI[code];
      j += this.stepJ[code];
      pts[2 * k + 2] = i;
      pts[2 * k + 3] = j;
    }
    return pts;
  }

  /** Every point, relative lattice coordinates. For tests and small strands. */
  allPoints(): Float64Array {
    const out = new Float64Array(2 * this.points);
    let i = 0;
    let j = 0;
    for (let k = 0; k < this.points - 1; k++) {
      const code = this.codes[k];
      i += this.stepI[code];
      j += this.stepJ[code];
      out[2 * k + 2] = i;
      out[2 * k + 3] = j;
    }
    return out;
  }
}
