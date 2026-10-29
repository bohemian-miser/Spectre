/**
 * Drawing the Top-down map on a canvas: every tile at its world place, and
 * the clusters of running substitutions fading in where their tiles were and
 * sliding home.
 *
 * Positions go through the camera in doubles and polygons much larger than
 * the screen are clipped first, so a shallow tile next to a deep one is drawn
 * correctly at any zoom.
 */

import { TAIL_COLOR, circuitLengthRgb, type Pt } from '../../core';
import type { Camera } from '../../lib/viewport';
import { tileFrame } from './animate';
import type { Batch, TopDownMap } from './map';
import type { MapStrand } from './strands';
import { clipToRect, type Placed } from './world';

export interface Running {
  readonly batch: Batch;
  readonly t0: number;
  readonly ms: number;
}

export interface DrawOptions {
  readonly map: TopDownMap;
  readonly camera: Camera;
  readonly width: number;
  readonly height: number;
  readonly running: readonly Running[];
  readonly now: number;
  readonly selected: ReadonlySet<string>;
  readonly focus: string | null;
  readonly outlines: boolean;
  /** Strands to draw over the tiles, and the one picked out. */
  readonly strands?: readonly MapStrand[];
  readonly picked?: number | null;
  readonly colour: (type: string) => string;
  readonly accent: string;
  readonly ink: string;
}

/** Batch progress in [0, 1]. */
export function progressOf(r: Running, now: number): number {
  return r.ms <= 0 ? 1 : Math.min(1, Math.max(0, (now - r.t0) / r.ms));
}

export function drawMap(ctx: CanvasRenderingContext2D, o: DrawOptions): void {
  const { camera: cam, width, height } = o;
  ctx.clearRect(0, 0, width, height);
  const viewMin = { x: -cam.x / cam.scale, y: -cam.y / cam.scale };
  const viewMax = { x: (width - cam.x) / cam.scale, y: (height - cam.y) / cam.scale };
  const pad = { x: (viewMax.x - viewMin.x) * 0.05, y: (viewMax.y - viewMin.y) * 0.05 };
  const clipMin = { x: -width, y: -height };
  const clipMax = { x: 2 * width, y: 2 * height };
  const visible = (p: { min: Pt; max: Pt }, dx = 0, dy = 0): boolean =>
    p.max.x + dx >= viewMin.x - pad.x &&
    p.min.x + dx <= viewMax.x + pad.x &&
    p.max.y + dy >= viewMin.y - pad.y &&
    p.min.y + dy <= viewMax.y + pad.y;

  const toScreen = (poly: readonly Pt[], dx: number, dy: number): Pt[] => {
    const pts = poly.map((p) => ({ x: (p.x + dx) * cam.scale + cam.x, y: (p.y + dy) * cam.scale + cam.y }));
    let big = false;
    for (const p of pts) if (Math.abs(p.x) > 4 * width + 1e4 || Math.abs(p.y) > 4 * height + 1e4) big = true;
    return big ? clipToRect(pts, clipMin, clipMax) : pts;
  };
  const trace = (pts: readonly Pt[]): void => {
    if (pts.length < 3) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  };
  const drawTile = (p: Placed, dx: number, dy: number, alpha: number): void => {
    ctx.globalAlpha = alpha;
    for (const leaf of p.leaves) {
      const pts = toScreen(leaf.poly, dx, dy);
      if (pts.length < 3) continue;
      ctx.beginPath();
      trace(pts);
      ctx.fillStyle = o.colour(leaf.type);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const drawSegments = (segs: readonly (readonly [Pt, Pt])[], dx: number, dy: number): void => {
    ctx.beginPath();
    for (const [a, b] of segs) {
      const ax = (a.x + dx) * cam.scale + cam.x;
      const ay = (a.y + dy) * cam.scale + cam.y;
      const bx = (b.x + dx) * cam.scale + cam.x;
      const by = (b.y + dy) * cam.scale + cam.y;
      if (Math.max(ax, bx) < 0 || Math.min(ax, bx) > width || Math.max(ay, by) < 0 || Math.min(ay, by) > height) continue;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  };

  // Which tiles are mid-change: their clusters are drawn by the second pass.
  const moving = new Set<string>();
  for (const r of o.running) {
    if (progressOf(r, o.now) >= 1) continue;
    for (const kids of r.batch.children.values()) for (const k of kids) moving.add(k.tile.id);
  }

  ctx.lineJoin = 'round';
  ctx.strokeStyle = o.ink;
  ctx.lineWidth = 0.7;
  for (const p of o.map.tiles.values()) {
    if (moving.has(p.tile.id) || !visible(p)) continue;
    drawTile(p, 0, 0, 1);
  }

  if (o.outlines) {
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (const [id, segs] of o.map.outlines) {
      const kids = o.running.find((r) => progressOf(r, o.now) < 1 && r.batch.children.has(id));
      if (!kids) drawSegments(segs, 0, 0);
    }
  }

  // Strands are traced on the settled map: they wait for running changes to finish.
  const settled = !o.running.some((r) => progressOf(r, o.now) < 1);
  if (o.strands && settled) {
    const drawStrand = (s: MapStrand, width: number, colour: string): void => {
      const n = s.points.length;
      const last = s.closed ? n : n - 1;
      if (n < 2) return;
      ctx.beginPath();
      const at = (p: Pt): Pt => ({ x: p.x * cam.scale + cam.x, y: p.y * cam.scale + cam.y });
      const p0 = at(s.points[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 0; i < last; i++) {
        const c = s.curves[i];
        const q = at(s.points[(i + 1) % n]);
        const c1 = at(c.c1);
        const c2 = at(c.c2);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, q.x, q.y);
      }
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    o.strands.forEach((s, i) => {
      if (i === o.picked) return;
      // strand weight follows its own depth's tile size
      const width = Math.min(5, Math.max(0.6, s.edge * cam.scale * 0.12));
      const [r, g, b] = circuitLengthRgb(s.length);
      drawStrand(s, width, s.closed ? `rgb(${r},${g},${b})` : TAIL_COLOR);
    });
    const p = o.picked != null ? o.strands[o.picked] : undefined;
    if (p) {
      const width = Math.min(8, Math.max(2, p.edge * cam.scale * 0.25));
      drawStrand(p, width + 3, o.ink);
      drawStrand(p, width, o.accent);
    }
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = o.accent;
  for (const id of o.selected) {
    const p = o.map.tiles.get(id);
    if (!p || !visible(p)) continue;
    ctx.beginPath();
    for (const leaf of p.leaves) trace(toScreen(leaf.poly, 0, 0));
    ctx.stroke();
  }

  // Running substitutions: each tile fades into its cluster, drawn where the
  // tile was, and the cluster slides home.
  for (const r of o.running) {
    const t = progressOf(r, o.now);
    if (t >= 1) continue;
    const parents = new Map(r.batch.parents.map((p) => [p.tile.id, p]));
    for (const plan of r.batch.plan) {
      const f = tileFrame(plan.start, t);
      const parent = parents.get(plan.id);
      ctx.strokeStyle = o.ink;
      ctx.lineWidth = 0.7;
      if (parent && f.shown < 1 && visible(parent)) drawTile(parent, 0, 0, 1 - f.shown);
      if (f.shown <= 0) continue;
      const dx = plan.offset.x * f.remaining;
      const dy = plan.offset.y * f.remaining;
      for (const k of r.batch.children.get(plan.id) ?? []) {
        if (o.map.tiles.get(k.tile.id) !== k || !visible(k, dx, dy)) continue;
        drawTile(k, dx, dy, f.shown);
      }
      const segs = o.outlines ? o.map.outlines.get(plan.id) : undefined;
      if (segs) {
        ctx.globalAlpha = f.shown;
        ctx.lineWidth = 2.2;
        drawSegments(segs, dx, dy);
        ctx.globalAlpha = 1;
      }
    }
  }

  if (o.focus) {
    const p = o.map.tiles.get(o.focus);
    if (p && visible(p)) {
      ctx.strokeStyle = o.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const leaf of p.leaves) trace(toScreen(leaf.poly, 0, 0));
      ctx.stroke();
    }
  }
}
