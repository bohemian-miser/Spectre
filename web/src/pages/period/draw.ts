/**
 * One frame of the animation at time t (seconds), drawn on a canvas so the
 * same frames can be played and saved as a GIF. The phases: the level-n
 * pieces apart, pushed together (their crossings welded in pairs), the big
 * supertile's routes walked through them, the walks pulled straight into the
 * big supertile's own table, that table set beside the level-n table of the
 * same type, and both drawn straight.
 */
import type { Pt } from '../../core';
import { STRAIGHT_START, routeCurve, type Graph, type Scene } from './scene';

export interface Palette {
  readonly bg: string;
  readonly text: string;
  readonly muted: string;
  readonly line: string;
  readonly routes: readonly string[];
  readonly tile: (type: string) => string;
}

export interface Phase {
  readonly key: string;
  readonly start: number;
  readonly end: number;
}

export const PHASES: readonly Phase[] = [
  { key: 'apart', start: 0, end: 1.4 },
  { key: 'together', start: 1.4, end: 3.0 },
  { key: 'walk', start: 3.0, end: 5.0 },
  { key: 'pull', start: 5.0, end: 6.8 },
  { key: 'beside', start: 6.8, end: 8.2 },
  { key: 'straight', start: 8.2, end: 9.8 },
  { key: 'hold', start: 9.8, end: 12.0 },
];
export const DURATION = PHASES[PHASES.length - 1].end;

export const phaseAt = (t: number): Phase => PHASES.find((p) => t < p.end) ?? PHASES[PHASES.length - 1];

const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
/** Progress through phase `key` at time t: 0 before it, 1 after. */
const through = (key: string, t: number): number => {
  const p = PHASES.find((q) => q.key === key)!;
  return ease((t - p.start) / (p.end - p.start));
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpPt = (p: Pt, q: Pt, t: number): Pt => ({ x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) });

/** Where a graph's frame lands on the canvas: its centre at (cx, cy), its fitted radius r pixels. */
interface View { cx: number; cy: number; r: number }

/** A graph's point in its own unit frame, turned and drawn straight by s. */
const unitOf = (g: Graph, p: Pt): Pt => ({ x: (p.x - g.centre.x) / g.radius, y: (p.y - g.centre.y) / g.radius });
const turned = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

export function drawFrame(ctx: CanvasRenderingContext2D, s: Scene, t: number, pal: Palette, W: number, H: number, caption: string): void {
  const k = ctx.canvas.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  const P = s.parent;
  const together = through('together', t);
  const walk = through('walk', t);
  const pull = through('pull', t);
  const beside = through('beside', t);
  const straight = through('straight', t);
  const fadeIn = (t - PHASES[0].start) / (PHASES[0].end - PHASES[0].start);
  const big = Math.min(W, H - 40) * 0.47;
  const side = Math.min(W / 2, H - 40) * 0.42;
  const mid = 20 + (H - 20) / 2;
  // a graph's unit is its fitted radius; its outline reaches `extent / radius` units out
  const fit = (g: Graph, px: number): number => lerp(px * (g.radius / g.extent), px, straight);
  const pView: View = { cx: lerp(W / 2, W * 0.75, beside), cy: mid, r: lerp(fit(P, big), fit(P, side), beside) };
  const lView: View = { cx: W * 0.25, cy: mid, r: fit(s.lower, side) };
  const explode = lerp(1.55, 1, together);
  const toScreen = (v: View, u: Pt): Pt => ({ x: v.cx + u.x * v.r, y: v.cy - u.y * v.r });
  /** A parent-frame point of piece i, pushed out from the middle while apart (the whole drawn smaller to fit). */
  const piecePt = (i: number, p: Pt): Pt => {
    const c = unitOf(P, s.pieces[i].graph.centre);
    const u = unitOf(P, p);
    return toScreen(pView, { x: (u.x + c.x * (explode - 1)) / explode, y: (u.y + c.y * (explode - 1)) / explode });
  };
  const line = (pts: readonly Pt[], close = false): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (close) ctx.closePath();
  };
  const colour = (i: number): string => pal.routes[i] ?? pal.muted;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // the pieces: outlines, routes, crossings
  const pieceAlpha = (1 - pull * 0.85) * (1 - beside);
  if (pieceAlpha > 0.01) {
    s.pieces.forEach((pc, i) => {
      const g = pc.graph;
      const a = pieceAlpha * Math.min(1, Math.max(0, fadeIn * 1.6 - (i / s.pieces.length) * 0.6));
      if (a <= 0) return;
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = pal.tile(g.type);
      line(g.outline.map((p) => piecePt(i, p)), true);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 1.2;
      for (const [p, q] of g.routes) {
        line(routeCurve(g.dots[p], g.dots[q], g.centre, 12).map((x) => piecePt(i, x)));
        ctx.stroke();
      }
      ctx.fillStyle = pal.text;
      for (const d of g.dots) {
        const q = piecePt(i, d);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    // welds, ringed as the pieces meet
    const ring = together * (1 - pull) * (1 - beside);
    if (ring > 0.01) {
      ctx.globalAlpha = ring;
      ctx.strokeStyle = pal.text;
      ctx.lineWidth = 1;
      for (const w of s.welds) {
        const q = toScreen(pView, unitOf(P, w));
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3.6, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  // circuits closing inside: walked, then gone from the table
  const circ = walk * (1 - pull);
  if (circ > 0.01) {
    ctx.globalAlpha = circ;
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    for (const c of s.circuits) {
      line(c.map((p) => toScreen(pView, unitOf(P, p))), true);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // the parent's outline, once its pieces are pulled in
  const outlineAlpha = Math.max(pull, beside) * (1 - straight);
  const drawOutline = (g: Graph, v: View, a: number, extraTurn: number): void => {
    if (a <= 0.01) return;
    ctx.globalAlpha = a;
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 1.4;
    line(g.outline.map((p) => toScreen(v, turned(unitOf(g, p), extraTurn))), true);
    ctx.stroke();
  };
  const drawHexagon = (g: Graph, v: View, a: number): void => {
    if (a <= 0.01) return;
    ctx.globalAlpha = a;
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 1.4;
    line(Array.from({ length: 6 }, (_, j) => {
      const ang = STRAIGHT_START + (g.sense * j * Math.PI) / 3;
      return toScreen(v, { x: Math.cos(ang), y: Math.sin(ang) });
    }), true);
    ctx.stroke();
  };

  /** A graph's crossings on screen: as placed, turned and drawn straight by `straight`. */
  const dotsOf = (g: Graph, v: View): Pt[] => g.dots.map((p, i) => {
    const u = turned(unitOf(g, p), g.turn * straight);
    return toScreen(v, lerpPt(u, unitOf(g, g.straight[i]), straight));
  });
  const drawTable = (g: Graph, v: View, a: number, labels: boolean): void => {
    if (a <= 0.01) return;
    drawOutline(g, v, a * (1 - straight), g.turn * straight);
    drawHexagon(g, v, a * straight);
    const dots = dotsOf(g, v);
    const c = toScreen(v, { x: 0, y: 0 });
    ctx.globalAlpha = a;
    ctx.lineWidth = 2.4;
    g.routes.forEach(([p, q], i) => {
      ctx.strokeStyle = colour(i);
      line(routeCurve(dots[p], dots[q], c, 32));
      ctx.stroke();
    });
    ctx.fillStyle = pal.text;
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (labels && dots.length <= 40) {
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      dots.forEach((d, i) => {
        const dx = d.x - c.x, dy = d.y - c.y, len = Math.hypot(dx, dy) || 1;
        ctx.fillText(String(i), d.x + (dx / len) * 11, d.y + (dy / len) * 11);
      });
    }
  };

  // the parent's routes: walked through the pieces, then pulled into its own table
  if (beside < 0.01) {
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.6;
    s.routePaths.forEach((r, i) => {
      const n = Math.max(2, Math.round(walk * r.through.length));
      if (walk <= 0.001) return;
      ctx.strokeStyle = colour(i);
      const pts = r.through.slice(0, n).map((p, j) => toScreen(pView, unitOf(P, lerpPt(p, r.own[j], pull))));
      line(pts);
      ctx.stroke();
    });
    drawOutline(P, pView, outlineAlpha, 0);
    if (pull > 0.01) {
      ctx.globalAlpha = pull;
      ctx.fillStyle = pal.text;
      for (const d of P.dots) {
        const q = toScreen(pView, unitOf(P, d));
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  } else {
    drawTable(P, pView, 1, true);
    drawTable(s.lower, lView, beside, true);
    ctx.globalAlpha = beside;
    ctx.fillStyle = pal.muted;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`Level ${s.base} ${s.type}`, lView.cx, H - 8);
    ctx.fillText(`Level ${s.base + s.depth} ${s.type}`, pView.cx, H - 8);
    if (straight > 0.5) {
      ctx.globalAlpha = (straight - 0.5) * 2;
      ctx.fillStyle = pal.text;
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText(s.same ? '=' : '≠', W / 2, mid);
    }
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.text;
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(caption, 10, 8);
}
