/**
 * The line page's two animations, drawn on a canvas each frame.
 *
 * `LabelsAnim`: a level-3 supertile with its strands and numbered border
 * crossings; the strands are pulled tight into routes, the supertile shrinks
 * onto the level-1 supertile of the same type, and the routes open out into
 * that supertile's strands. The numbers ride on their crossings throughout.
 *
 * `StitchAnim`: a level-5 supertile as its level-3 pieces, each outlined,
 * morphing into a level-3 supertile as its level-1 pieces: piece onto piece,
 * route onto route.
 *
 * Both step through the nine types in turn until a type is picked.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HEX_TYPES, type HexType, type Pt } from '../../core';
import { tileColor } from '../../lib/palette';
import type { CircuitShapes } from '../shapes/circuitShapes';
import type { State } from '../period/period';
import { borderScene, stitchScene, type Box } from './morph';
import { tracePatch } from './strand';

const W = 960;
const H = 540;
const ROUTES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const ROUTES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPts = (a: readonly Pt[], b: readonly Pt[], t: number): Pt[] => a.map((p, i) => ({ x: lerp(p.x, b[i].x, t), y: lerp(p.y, b[i].y, t) }));

/** Frame to canvas: the box fitted into the cell, y up. */
function fitter(box: Box, cell: Box, margin: number): (p: Pt) => Pt {
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const a = Math.min((cell.x1 - cell.x0 - 2 * margin) / w, (cell.y1 - cell.y0 - 2 * margin) / h);
  const cx = (cell.x0 + cell.x1) / 2, cy = (cell.y0 + cell.y1) / 2;
  const mx = (box.x0 + box.x1) / 2, my = (box.y0 + box.y1) / 2;
  return (p) => ({ x: cx + a * (p.x - mx), y: cy - a * (p.y - my) });
}

interface Palette { bg: string; text: string; muted: string; routes: readonly string[] }

function paletteOf(el: Element, dark: boolean): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
  return { bg: v('--canvas-bg', dark ? '#0f1318' : '#fbfaf7'), text: v('--text', dark ? '#e6e9ee' : '#1d2430'), muted: v('--muted', '#7a8494'), routes: dark ? ROUTES_DARK : ROUTES_LIGHT };
}

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = false): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** Label positions just outside each crossing, pushed apart where crossings sit close together. */
function labelSpots(dots: readonly Pt[], centre: Pt): Pt[] {
  const out = dots.map((d) => {
    const dx = d.x - centre.x, dy = d.y - centre.y, r = Math.hypot(dx, dy) || 1;
    return { x: d.x + (dx / r) * 16, y: d.y + (dy / r) * 16 };
  });
  const MIN = 17;
  for (let round = 0; round < 30; round++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x, dy = out[j].y - out[i].y, r = Math.hypot(dx, dy);
        if (r >= MIN) continue;
        const ux = r > 1e-6 ? dx / r : 1, uy = r > 1e-6 ? dy / r : 0, push = (MIN - r) / 2;
        out[i] = { x: out[i].x - ux * push, y: out[i].y - uy * push };
        out[j] = { x: out[j].x + ux * push, y: out[j].y + uy * push };
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}

function labels(ctx: CanvasRenderingContext2D, dots: readonly Pt[], centre: Pt, pal: Palette, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spots = labelSpots(dots, centre);
  dots.forEach((d, i) => {
    ctx.fillStyle = pal.text;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    const { x, y } = spots[i];
    ctx.lineWidth = 3;
    ctx.strokeStyle = pal.bg;
    ctx.strokeText(String(i), x, y);
    ctx.fillText(String(i), x, y);
  });
  ctx.globalAlpha = 1;
}

/** A canvas redrawn every frame from the time in its loop; the loop's length and the drawing come from the caller. */
function useLoop(duration: number, playing: boolean, onEnd: () => void): [number, (t: number) => void] {
  const [t, setT] = useState(0);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      setT((x) => {
        if (x + dt >= duration) { setTimeout(() => end.current(), 0); return 0; }
        return x + dt;
      });
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [playing, duration]);
  return [t, setT];
}

function Controls(props: { type: HexType; pinned: boolean; playing: boolean; onType: (t: HexType) => void; onPlay: () => void; t: number; duration: number; onScrub: (t: number) => void }): JSX.Element {
  return (
    <div className="pd-controls">
      <div className="pd-chips" role="group" aria-label="Type">
        {HEX_TYPES.map((x) => (
          <button key={x} type="button" aria-pressed={x === props.type} className={x === props.type ? 'is-active' : ''} onClick={() => props.onType(x)}>{x}</button>
        ))}
      </div>
      <button type="button" onClick={props.onPlay}>{props.playing ? 'Pause' : 'Play'}</button>
      <input type="range" min={0} max={props.duration} step={0.02} value={props.t} aria-label="Time" className="pd-scrub" onChange={(e) => props.onScrub(Number(e.target.value))} />
      {!props.pinned && <span className="bu-muted">every type in turn</span>}
    </div>
  );
}

/** One type at a time, or every type in turn until one is picked. */
function useTypes(): { type: HexType; pinned: boolean; pick: (t: HexType) => void; next: () => void } {
  const [type, setType] = useState<HexType>('Psi');
  const [pinned, setPinned] = useState(false);
  return {
    type,
    pinned,
    pick: (t) => { setType(t); setPinned(true); },
    next: () => { if (!pinned) setType((t) => HEX_TYPES[(HEX_TYPES.indexOf(t) + 1) % HEX_TYPES.length]); },
  };
}

const LABEL_PHASES = { holdA: 1.4, pull: 1.2, morph: 1.8, open: 1.2, holdB: 1.8 };
const LABEL_LOOP = Object.values(LABEL_PHASES).reduce((a, b) => a + b, 0);

export function LabelsAnim(props: { cs: CircuitShapes; states: readonly State[]; subset: readonly number[]; digits: readonly number[]; dark: boolean }): JSX.Element {
  const types = useTypes();
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useLoop(LABEL_LOOP, playing, types.next);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const scenes = useMemo(() => ({
    a: borderScene(props.cs, props.states, props.subset, props.digits, 3, types.type),
    b: borderScene(props.cs, props.states, props.subset, props.digits, 1, types.type),
  }), [props.cs, props.states, props.subset, props.digits, types.type]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const pal = paletteOf(c, props.dark);
    ctx.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const P = LABEL_PHASES;
    const pull = ease((t - P.holdA) / P.pull);
    const morph = ease((t - P.holdA - P.pull) / P.morph);
    const open = ease((t - P.holdA - P.pull - P.morph) / P.open);
    const cell: Box = { x0: 0, y0: 36, x1: W, y1: H };
    const fa = fitter(scenes.a.box, cell, 40), fb = fitter(scenes.b.box, cell, 40);
    const A = scenes.a, B = scenes.b;
    const at = (pa: readonly Pt[], pb: readonly Pt[]) => lerpPts(pa.map(fa), pb.map(fb), morph);

    // tiles: level 3's fade as its strands pull tight, level 1's come in as its routes open
    const tilesOf = (sc: typeof A, f: (p: Pt) => Pt, alpha: number) => {
      if (alpha <= 0.01) return;
      for (const tile of sc.tiles) {
        path(ctx, tile.outline.map(f), true);
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = tileColor(tile.type);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = pal.muted;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    tilesOf(A, fa, 1 - pull);
    tilesOf(B, fb, open);

    path(ctx, at(A.outline, B.outline), true);
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 2;
    ctx.stroke();

    A.routes.forEach((_, i) => {
      const shape = open > 0
        ? lerpPts(B.tight[i].map(fb), B.strands[i].map(fb), open)
        : morph > 0 ? at(A.tight[i], B.tight[i]) : lerpPts(A.strands[i].map(fa), A.tight[i].map(fa), pull);
      path(ctx, shape);
      ctx.strokeStyle = pal.routes[i % pal.routes.length];
      ctx.lineWidth = open > 0 || pull < 1 ? 2 : 3;
      ctx.stroke();
    });
    const dots = at(A.dots, B.dots);
    const centre = { x: dots.reduce((s, p) => s + p.x, 0) / dots.length, y: dots.reduce((s, p) => s + p.y, 0) / dots.length };
    labels(ctx, dots, centre, pal);

    ctx.fillStyle = pal.text;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lvl = morph < 0.5 ? 3 : 1;
    const what = t < P.holdA ? 'its strands' : pull < 1 ? 'strands pulled tight into routes' : morph < 1 ? 'shrinking onto level 1' : open < 1 ? 'routes opened into strands' : 'its strands';
    ctx.fillText(`${types.type} at level ${lvl}: ${what}`, 10, 10);
  }, [t, scenes, props.dark, types.type]);

  return (
    <div className="ln-anim" data-testid="ln-labels-anim">
      <canvas ref={canvas} className="ln-canvas" role="img" aria-label={`${types.type} at level 3 and at level 1, with the same numbered crossings joined the same way`} />
      <Controls type={types.type} pinned={types.pinned} playing={playing} onType={(x) => { types.pick(x); setT(0); }} onPlay={() => setPlaying((p) => !p)} t={t} duration={LABEL_LOOP} onScrub={(x) => { setPlaying(false); setT(x); }} />
    </div>
  );
}

const STITCH_PHASES = { holdA: 1.6, there: 2.2, holdB: 1.6, back: 2.2 };
const STITCH_LOOP = Object.values(STITCH_PHASES).reduce((a, b) => a + b, 0);

export function StitchAnim(props: { cs: CircuitShapes; states: readonly State[]; subset: readonly number[]; digits: readonly number[]; dark: boolean }): JSX.Element {
  const types = useTypes();
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useLoop(STITCH_LOOP, playing, types.next);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const scenes = useMemo(() => ({
    a: stitchScene(props.cs, props.states, 3, types.type),
    b: stitchScene(props.cs, props.states, 1, types.type),
    tiles: tracePatch(props.subset, props.digits, 3, types.type).tiles,
  }), [props.cs, props.states, props.subset, props.digits, types.type]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const pal = paletteOf(c, props.dark);
    ctx.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const P = STITCH_PHASES;
    const k = t < P.holdA ? 0 : t < P.holdA + P.there ? ease((t - P.holdA) / P.there) : t < P.holdA + P.there + P.holdB ? 1 : 1 - ease((t - P.holdA - P.there - P.holdB) / P.back);
    const cell: Box = { x0: 0, y0: 36, x1: W, y1: H };
    const A = scenes.a, B = scenes.b;
    const fa = fitter(A.box, cell, 40), fb = fitter(B.box, cell, 40);
    const at = (pa: readonly Pt[], pb: readonly Pt[]) => lerpPts(pa.map(fa), pb.map(fb), k);

    A.pieces.forEach((pc, i) => {
      const q = B.pieces[i];
      path(ctx, at(pc.outline, q.outline), true);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = tileColor(pc.type);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = pal.text;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 0.8;
      pc.routes.forEach((r, j) => { path(ctx, at(r, q.routes[j])); ctx.stroke(); });
      ctx.globalAlpha = 1;
    });
    // the level-1 pieces' own tiles, coming in as the morph arrives at level 3
    const tileAlpha = Math.max(0, (k - 0.6) / 0.4);
    if (tileAlpha > 0) {
      ctx.globalAlpha = 0.45 * tileAlpha;
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 0.5;
      for (const tile of scenes.tiles) { path(ctx, tile.outline.map(fb), true); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    A.walks.forEach((w, i) => {
      path(ctx, at(w, B.walks[i]));
      ctx.strokeStyle = pal.routes[i % pal.routes.length];
      ctx.lineWidth = 2.6;
      ctx.stroke();
    });
    path(ctx, at(A.outline, B.outline), true);
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    const dots = at(A.dots, B.dots);
    const centre = { x: dots.reduce((s, p) => s + p.x, 0) / dots.length, y: dots.reduce((s, p) => s + p.y, 0) / dots.length };
    labels(ctx, dots, centre, pal);

    ctx.fillStyle = pal.text;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const text = k === 0 ? `${types.type} at level 5, stitched from ${A.pieces.length} level-3 supertiles`
      : k === 1 ? `${types.type} at level 3, stitched from ${B.pieces.length} level-1 supertiles`
        : 'each level-3 piece onto the level-1 piece in its slot';
    ctx.fillText(text, 10, 10);
  }, [t, scenes, props.dark, types.type]);

  return (
    <div className="ln-anim" data-testid="ln-stitch-anim">
      <canvas ref={canvas} className="ln-canvas" role="img" aria-label={`${types.type} at level 5 from its level-3 pieces, and at level 3 from its level-1 pieces`} />
      <Controls type={types.type} pinned={types.pinned} playing={playing} onType={(x) => { types.pick(x); setT(0); }} onPlay={() => setPlaying((p) => !p)} t={t} duration={STITCH_LOOP} onScrub={(x) => { setPlaying(false); setT(x); }} />
    </div>
  );
}
