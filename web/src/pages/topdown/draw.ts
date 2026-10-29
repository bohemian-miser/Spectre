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
  /** Strands traced before the change: the ones through its tiles fade out with them. */
  readonly before?: readonly MapStrand[];
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

  // Where each mid-change tile is: its cluster's slide and fade, and its old
  // tile's fade. Strands go piece by piece with the tiles they lie in.
  const childMotion = new Map<string, { dx: number; dy: number; alpha: number }>();
  const parentFade = new Map<string, number>();
  for (const r of o.running) {
    const t = progressOf(r, o.now);
    if (t >= 1) continue;
    for (const plan of r.batch.plan) {
      const f = tileFrame(plan.start, t);
      parentFade.set(plan.id, 1 - f.shown);
      for (const k of r.batch.children.get(plan.id) ?? []) {
        childMotion.set(k.tile.id, {
          dx: plan.offset.x * f.remaining,
          dy: plan.offset.y * f.remaining,
          alpha: f.shown,
        });
      }
    }
  }
  const strandStyle = (s: MapStrand): { width: number; colour: string } => {
    const [r, g, b] = circuitLengthRgb(s.length);
    // strand weight follows its own depth's tile size
    return {
      width: Math.min(5, Math.max(0.6, s.edge * cam.scale * 0.12)),
      colour: s.closed ? `rgb(${r},${g},${b})` : TAIL_COLOR,
    };
  };
  /**
   * Draw the segments of `s` that `pick` accepts, each moved by `dx, dy`
   * (screen pixels) and joined to the next when consecutive.
   */
  const drawPieces = (
    s: MapStrand,
    pick: (tile: string) => { dx: number; dy: number } | null,
  ): void => {
    const n = s.points.length;
    const last = s.closed ? n : n - 1;
    ctx.beginPath();
    let open = false;
    for (let i = 0; i < last; i++) {
      const m = pick(s.segTiles[i]);
      if (!m) {
        open = false;
        continue;
      }
      const at = (p: Pt): Pt => ({ x: (p.x + m.dx) * cam.scale + cam.x, y: (p.y + m.dy) * cam.scale + cam.y });
      const a = at(s.points[i]);
      const c = s.curves[i];
      const c1 = at(c.c1);
      const c2 = at(c.c2);
      const q = at(s.points[(i + 1) % n]);
      if (!open) ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, q.x, q.y);
      open = true;
    }
    ctx.stroke();
  };
  const still = { dx: 0, dy: 0 };

  if (o.strands) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    o.strands.forEach((s, i) => {
      if (i === o.picked) return;
      const { width, colour } = strandStyle(s);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      drawPieces(s, (tile) => (childMotion.has(tile) ? null : still));
    });
    const p = o.picked != null ? o.strands[o.picked] : undefined;
    if (p) {
      const width = Math.min(8, Math.max(2, p.edge * cam.scale * 0.25));
      ctx.strokeStyle = o.ink;
      ctx.lineWidth = width + 3;
      drawPieces(p, (tile) => (childMotion.has(tile) ? null : still));
      ctx.strokeStyle = o.accent;
      ctx.lineWidth = width;
      drawPieces(p, (tile) => (childMotion.has(tile) ? null : still));
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

  // The strands of running changes: the old ones fade with the tiles they
  // ran through, the new ones fade in and slide home with their clusters.
  if (o.strands && (childMotion.size > 0 || parentFade.size > 0)) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    /** One pass over a strand: each run of consecutive segments in one moving tile, drawn as that tile is. */
    const drawRuns = (s: MapStrand, motion: (tile: string) => { dx: number; dy: number; alpha: number } | null): void => {
      const n = s.points.length;
      const last = s.closed ? n : n - 1;
      let i = 0;
      while (i < last) {
        const tile = s.segTiles[i];
        const m = motion(tile);
        if (!m || m.alpha <= 0) {
          i++;
          continue;
        }
        const at = (p: Pt): Pt => ({ x: (p.x + m.dx) * cam.scale + cam.x, y: (p.y + m.dy) * cam.scale + cam.y });
        ctx.globalAlpha = m.alpha;
        ctx.beginPath();
        const a = at(s.points[i]);
        ctx.moveTo(a.x, a.y);
        for (; i < last && s.segTiles[i] === tile; i++) {
          const c = s.curves[i];
          const c1 = at(c.c1);
          const c2 = at(c.c2);
          const q = at(s.points[(i + 1) % n]);
          ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, q.x, q.y);
        }
        ctx.stroke();
      }
    };
    for (const r of o.running) {
      if (progressOf(r, o.now) >= 1 || !r.before) continue;
      for (const s of r.before) {
        const { width, colour } = strandStyle(s);
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        drawRuns(s, (tile) => {
          const alpha = parentFade.get(tile);
          return alpha === undefined ? null : { dx: 0, dy: 0, alpha };
        });
      }
    }
    for (const s of o.strands) {
      const { width, colour } = strandStyle(s);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      drawRuns(s, (tile) => childMotion.get(tile) ?? null);
    }
    ctx.globalAlpha = 1;
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
