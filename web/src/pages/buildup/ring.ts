/**
 * A supertile's outline as the viewer draws it: each corner followed by
 * every crossing on the edge it starts, in order round the border
 * (`CircuitShapes.border`), with a grid over its segments so a point or a
 * straight line can be tested against it quickly.
 */
import type { Pt } from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';

/** Cells along the longer side of the outline's box. */
const CELLS = 64;

export class Ring {
  /** The outline's points, x, y pairs, the first repeated at the end. */
  readonly pts: Float64Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly cell: number;
  private readonly nx: number;
  private readonly ny: number;
  /** Per cell, the segments (by their first point's index) that pass through it. */
  private readonly cells: Int32Array[];
  /** Lengths below this count as touching. */
  readonly eps: number;
  private stamp = 1;
  private readonly seen: Uint32Array;

  constructor(points: readonly Pt[]) {
    const m = points.length;
    this.pts = new Float64Array(2 * m + 2);
    points.forEach((p, i) => { this.pts[2 * i] = p.x; this.pts[2 * i + 1] = p.y; });
    this.pts[2 * m] = points[0].x;
    this.pts[2 * m + 1] = points[0].y;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const size = Math.max(x1 - x0, y1 - y0) || 1;
    this.eps = size * 1e-9;
    this.cell = size / CELLS;
    this.x0 = x0 - this.cell;
    this.y0 = y0 - this.cell;
    this.nx = Math.ceil((x1 - this.x0) / this.cell) + 2;
    this.ny = Math.ceil((y1 - this.y0) / this.cell) + 2;
    const lists: number[][] = Array.from({ length: this.nx * this.ny }, () => []);
    for (let i = 0; i < m; i++) {
      const [a, b, c, d] = this.cellBox(this.pts[2 * i], this.pts[2 * i + 1], this.pts[2 * i + 2], this.pts[2 * i + 3]);
      for (let cx = a; cx <= c; cx++) for (let cy = b; cy <= d; cy++) lists[cy * this.nx + cx].push(i);
    }
    this.cells = lists.map((l) => Int32Array.from(l));
    this.seen = new Uint32Array(m);
  }

  private cellBox(ax: number, ay: number, bx: number, by: number): [number, number, number, number] {
    const f = (v: number, o: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor((v - o) / this.cell)));
    return [f(Math.min(ax, bx), this.x0, this.nx), f(Math.min(ay, by), this.y0, this.ny), f(Math.max(ax, bx), this.x0, this.nx), f(Math.max(ay, by), this.y0, this.ny)];
  }

  /** Distance from (x, y) to the outline, or a grid cell's width when it is farther than that. */
  distance(x: number, y: number): number {
    let best = Infinity;
    const r = this.cell;
    const [a, b, c, d] = this.cellBox(x - r, y - r, x + r, y + r);
    const visit = (a: number, b: number, c: number, d: number) => {
      for (let cx = a; cx <= c; cx++) {
        for (let cy = b; cy <= d; cy++) {
          for (const i of this.cells[cy * this.nx + cx]) {
            const px = this.pts[2 * i], py = this.pts[2 * i + 1], vx = this.pts[2 * i + 2] - px, vy = this.pts[2 * i + 3] - py;
            const t = Math.max(0, Math.min(1, ((x - px) * vx + (y - py) * vy) / (vx * vx + vy * vy || 1)));
            best = Math.min(best, Math.hypot(x - px - t * vx, y - py - t * vy));
          }
        }
      }
    };
    visit(a, b, c, d);
    return Math.min(best, r);
  }

  /** Whether (x, y) is inside the outline (even-odd, a ray to the right), or within `tol` of it. */
  inside(x: number, y: number, tol = this.eps): boolean {
    if (this.distance(x, y) <= tol) return true;
    const row = Math.max(0, Math.min(this.ny - 1, Math.floor((y - this.y0) / this.cell)));
    const from = Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.x0) / this.cell)));
    const s = ++this.stamp;
    let odd = false;
    for (let cx = from; cx < this.nx; cx++) {
      for (const i of this.cells[row * this.nx + cx]) {
        if (this.seen[i] === s) continue;
        this.seen[i] = s;
        const ay = this.pts[2 * i + 1], by = this.pts[2 * i + 3];
        if ((ay > y) === (by > y)) continue;
        const ax = this.pts[2 * i], bx = this.pts[2 * i + 2];
        if (ax + ((y - ay) / (by - ay)) * (bx - ax) > x) odd = !odd;
      }
    }
    return odd;
  }

  /**
   * Whether the straight line from a to b stays inside the outline: it
   * crosses no segment of it (touching within `tol` allowed), and its
   * middle is inside.
   */
  holds(ax: number, ay: number, bx: number, by: number, tol = this.eps): boolean {
    const [c0, r0, c1, r1] = this.cellBox(ax, ay, bx, by);
    const s = ++this.stamp;
    const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    for (let cx = c0; cx <= c1; cx++) {
      for (let cy = r0; cy <= r1; cy++) {
        for (const i of this.cells[cy * this.nx + cx]) {
          if (this.seen[i] === s) continue;
          this.seen[i] = s;
          const px = this.pts[2 * i], py = this.pts[2 * i + 1], qx = this.pts[2 * i + 2], qy = this.pts[2 * i + 3];
          const seg = Math.hypot(qx - px, qy - py) || 1;
          // signed distances of each line's ends from the other line
          const d1 = side(ax, ay, bx, by, px, py) / len, d2 = side(ax, ay, bx, by, qx, qy) / len;
          const d3 = side(px, py, qx, qy, ax, ay) / seg, d4 = side(px, py, qx, qy, bx, by) / seg;
          if (((d1 > tol && d2 < -tol) || (d1 < -tol && d2 > tol)) && ((d3 > tol && d4 < -tol) || (d3 < -tol && d4 > tol))) return false;
        }
      }
    }
    return this.inside((ax + bx) / 2, (ay + by) / 2, tol);
  }
}

/** A level-n supertile of `type`'s outline, in its frame: each corner, then every crossing on the edge it starts. */
export function outlinePoints(cs: CircuitShapes, n: number, type: string): Pt[] {
  const T = cs.levels[n][type];
  const rows = cs.border(n, type);
  const out: Pt[] = [];
  for (let j = 0; j < 6; j++) {
    out.push(cs.corner(n, type, j));
    for (const p of rows[j]) out.push(T.pts[p]);
  }
  return out;
}
