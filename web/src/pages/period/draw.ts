/**
 * One frame of the animation at time t (seconds), on a canvas so the same
 * frames can be played and saved as a GIF. Each step: the nine supertiles of
 * level n in a row; copies of them carried down into the nine supertiles of
 * level n + d, each copy turned and mirrored into its slot; each parent's
 * routes walked through its pieces and pulled tight into its own; then the
 * view pans down, the new row moving up to take the old one's place, and the
 * next step starts from it. After the last step it starts again.
 */
import { HEX_TYPES, transPt, type Affine, type HexType, type Pt } from '../../core';
import { routeCurve, type Graph, type Step } from './scene';

export interface Palette {
  readonly bg: string;
  readonly text: string;
  readonly muted: string;
  readonly routes: readonly string[];
  readonly tile: (type: string) => string;
}

export interface Phase {
  readonly key: 'show' | 'copy' | 'walk' | 'pull' | 'pan';
  readonly start: number;
  readonly end: number;
}

/** The phases of one step, in seconds from its start. */
export const PHASES: readonly Phase[] = [
  { key: 'show', start: 0, end: 0.9 },
  { key: 'copy', start: 0.9, end: 4.1 },
  { key: 'walk', start: 4.1, end: 5.5 },
  { key: 'pull', start: 5.5, end: 6.9 },
  { key: 'pan', start: 6.9, end: 8.9 },
];
export const CYCLE = PHASES[PHASES.length - 1].end;
/** Seconds one copy takes to fly into place. */
const FLY = 1.1;
/** Seconds the loop fades out at its end and in at its start. */
const FADE = 0.5;

export const durationOf = (steps: readonly Step[]): number => steps.length * CYCLE;

/** The step and phase at time t. */
export function phaseAt(steps: readonly Step[], t: number): { step: number; phase: Phase; u: number } {
  const step = Math.min(steps.length - 1, Math.max(0, Math.floor(t / CYCLE)));
  const u = t - step * CYCLE;
  return { step, phase: PHASES.find((p) => u < p.end) ?? PHASES[PHASES.length - 1], u };
}

const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const through = (key: Phase['key'], u: number): number => {
  const p = PHASES.find((q) => q.key === key)!;
  return ease((u - p.start) / (p.end - p.start));
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A map from a graph's frame to the canvas: the middle of its bounding box to (x, y), scaled by a, y up. */
interface Place { readonly x: number; readonly y: number; readonly a: number }
const onCanvas = (g: Graph, at: Place) => (p: Pt): Pt => ({ x: at.x + at.a * (p.x - g.mid.x), y: at.y - at.a * (p.y - g.mid.y) });

/**
 * The canvas map of a copy in flight, from its place in the row above
 * (t = 0) to its slot in the parent (t = 1): its centre moves straight, its
 * size changes geometrically, it turns the short way round, and where the
 * slot mirrors it, it flips through edge-on.
 */
function flight(g: Graph, from: Place, slot: Affine, to: Place, toMid: Pt, t: number): (p: Pt) => Pt {
  // the slot map, piece frame to canvas (y up): to.a * (slot(p) - toMid) + (to.x, -to.y)
  const L = [slot[0] * to.a, slot[1] * to.a, slot[3] * to.a, slot[4] * to.a];
  const det = L[0] * L[3] - L[1] * L[2];
  const s1 = Math.sqrt(Math.abs(det));
  const sigma = det < 0 ? -1 : 1;
  const theta = Math.atan2(L[2], L[0]);
  const c1 = transPt(slot, g.mid);
  const end = { x: to.x + to.a * (c1.x - toMid.x), y: -to.y + to.a * (c1.y - toMid.y) };
  const start = { x: from.x, y: -from.y };
  const s = from.a * Math.pow(s1 / from.a, t), th = theta * t, f = lerp(1, sigma, t);
  const cx = lerp(start.x, end.x, t), cy = lerp(start.y, end.y, t) + Math.sin(Math.PI * t) * 0.15 * Math.abs(end.y - start.y);
  const cos = Math.cos(th), sin = Math.sin(th);
  return (p) => {
    const dx = p.x - g.mid.x, dy = (p.y - g.mid.y) * f;
    return { x: cx + s * (cos * dx - sin * dy), y: -(cy + s * (sin * dx + cos * dy)) };
  };
}

export function drawFrame(ctx: CanvasRenderingContext2D, steps: readonly Step[], t: number, pal: Palette, W: number, H: number, caption: string): void {
  const k = ctx.canvas.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  const { step: j, u } = phaseAt(steps, t);
  const st = steps[j];
  const next = steps[j + 1] ?? null;
  const copy = (u - PHASES[1].start) / (PHASES[1].end - PHASES[1].start);
  const walk = through('walk', u);
  const pull = through('pull', u);
  const pan = through('pan', u);
  const total = durationOf(steps);
  const fade = Math.min(1, t / FADE, (total - t) / FADE);

  const box = W / 9;
  const topY = H * 0.26, botY = H * 0.69, gap = botY - topY;
  /** A row's scale: every graph of it fits in a cell w wide and h high. */
  const fit = (gs: readonly Graph[], w: number, h: number) => Math.min(...gs.map((g) => Math.min(w / g.width, h / g.height)));
  /** Half the height of a row's tallest graph, in its own units. */
  const half = (gs: readonly Graph[]) => Math.max(...gs.map((g) => g.height)) / 2;
  const lows = HEX_TYPES.map((x) => st.lower[x]);
  const pars = HEX_TYPES.map((x) => st.builds[x].parent);
  const aTop = (gs: readonly Graph[]) => fit(gs, 0.8 * box, 0.28 * H);
  const aBot = (gs: readonly Graph[]) => fit(gs, 0.9 * box, 0.4 * H);
  const lowHalf = half(lows), parHalf = half(pars);
  const col = (type: HexType) => (HEX_TYPES.indexOf(type) + 0.5) * box;
  const lowAt = (type: HexType, p: number): Place => ({ x: col(type), y: topY - gap * p, a: aTop(lows) });
  const parAt = (type: HexType): Place => ({ x: col(type), y: lerp(botY, topY, pan), a: lerp(aBot(pars), aTop(pars), pan) });

  const path = (pts: readonly Pt[], close = false): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (close) ctx.closePath();
  };
  const colour = (i: number): string => pal.routes[i] ?? pal.muted;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  /** A supertile with its border: tinted, outlined, its routes coloured in order. */
  const drawGraph = (g: Graph, map: (p: Pt) => Pt, alpha: number, routes: 'colour' | 'grey' | 'none', outline: readonly Pt[] = g.outline, width = 1.6): void => {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = alpha * fade * 0.25;
    ctx.fillStyle = pal.tile(g.type);
    path(outline.map(map), true);
    ctx.fill();
    ctx.globalAlpha = alpha * fade;
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (routes !== 'none') {
      const c = map(g.centre);
      const dots = g.dots.map(map);
      ctx.lineWidth = width;
      g.routes.forEach(([p, q], i) => {
        ctx.strokeStyle = routes === 'colour' ? colour(i) : pal.muted;
        path(routeCurve(dots[p], dots[q], c, 14));
        ctx.stroke();
      });
      ctx.fillStyle = pal.text;
      const r = Math.max(0.8, Math.min(2.2, width * 1.1));
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  const label = (text: string, x: number, y: number, alpha: number, align: CanvasTextAlign = 'left', weight = '600'): void => {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = alpha * fade;
    ctx.fillStyle = pal.text;
    ctx.font = `${weight} 13px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  };

  // the row of level n, moving up and out as the view pans
  for (const type of HEX_TYPES) drawGraph(st.lower[type], onCanvas(st.lower[type], lowAt(type, pan)), 1 - pan, 'colour');
  label(st.from === 0 ? 'Tiles' : `Level ${st.from}`, 8, topY - gap * pan - aTop(lows) * lowHalf - 8, 1 - pan);

  // the next row's empty places, rising into view
  if (next && pan > 0.01) {
    const ahead = HEX_TYPES.map((x) => next.builds[x].parent);
    for (const type of HEX_TYPES) {
      const g = next.builds[type].parent;
      ctx.globalAlpha = 0.35 * pan * fade;
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      path(g.outline.map(onCanvas(g, { x: col(type), y: botY + gap * (1 - pan), a: aBot(ahead) })), true);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // the row of level n + d: empty places, then the copies, the walks, and the parents' own routes
  for (const type of HEX_TYPES) {
    const b = st.builds[type];
    const at = parAt(type);
    const pmap = onCanvas(b.parent, at);
    if (pull < 1) {
      ctx.globalAlpha = 0.4 * fade * (1 - pull);
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      path(b.parent.outline.map(pmap), true);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const n = b.pieces.length;
    const span = Math.max(0, (PHASES[1].end - PHASES[1].start) - FLY) / (PHASES[1].end - PHASES[1].start);
    b.pieces.forEach((pc, i) => {
      const g = st.lower[pc.type];
      const begin = n > 1 ? (span * i) / (n - 1) : 0;
      const f = ease((copy - begin) / (FLY / (PHASES[1].end - PHASES[1].start)));
      if (f <= 0) return;
      const alpha = (1 - pull) * (1 - pan);
      if (alpha <= 0.01) return;
      const map = f >= 1 ? (p: Pt) => pmap(transPt(pc.xform, p)) : flight(g, lowAt(pc.type, 0), pc.xform, at, b.parent.mid, f);
      drawGraph(g, map, alpha * (f >= 1 ? 1 : 0.9), walk > 0 ? 'grey' : 'colour', st.pieceOutline[pc.type], 1.1);
    });
    if (walk > 0 && pan <= 0) {
      ctx.globalAlpha = fade;
      ctx.lineWidth = 2.2;
      b.routePaths.forEach((r, i) => {
        const m = Math.max(2, Math.round(walk * r.through.length));
        ctx.strokeStyle = colour(i);
        path(r.through.slice(0, m).map((p, q) => pmap({ x: lerp(p.x, r.own[q].x, pull), y: lerp(p.y, r.own[q].y, pull) })));
        ctx.stroke();
      });
      if (b.circuits.length && pull < 1) {
        ctx.globalAlpha = fade * walk * (1 - pull);
        ctx.strokeStyle = pal.text;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        for (const c of b.circuits) {
          path(c.map(pmap), true);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
    if (pull > 0) drawGraph(b.parent, pmap, pull, pan > 0 ? 'colour' : 'none', b.parent.outline, 2);
    label(type, at.x, at.y + at.a * parHalf + 16, 1, 'center', '400');
  }
  const rowY = lerp(botY, topY, pan) - lerp(aBot(pars), aTop(pars), pan) * parHalf - 8;
  label(`Level ${st.to}`, 8, rowY, 1);
  if (st.repeats !== null) label(`the same borders as ${st.repeats === 0 ? 'the tiles' : `level ${st.repeats}`}`, 80, rowY, pull, 'left', '400');

  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.text;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(caption, 8, 8);
  ctx.globalAlpha = 1;
}
