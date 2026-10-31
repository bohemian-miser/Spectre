/**
 * The X-ray over the Explorer's tiling: the supertiles of one level, each
 * washed in its type's colour and outlined. The wash goes under the strands
 * (between the tiles and the lines), so the strands keep their colours; the
 * outlines go on top, thin. Hovering a supertile names its type and slot
 * path.
 *
 * On a rooted patch the wash is `XrayWashSvg` inside the SVG scene or
 * `washXray` as the canvas scene's underlay, and `XrayRooted` draws the
 * outlines over it, redrawn with the PanZoom camera. On the infinite plane
 * `XrayInfinite` reads the canvas's camera each frame and asks the unrooted
 * engine for the supertiles in view; at a cut of single tiles it hands the
 * canvas each tile's supertile colour (`InfiniteCanvasApi.setTint`), drawn
 * under the strands; zoomed out to supertile glyphs, where no strands are
 * drawn, only the outlines show.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { inv, mul, transPt, unrootedEngineFor, type Affine, type Pt, type TileFamilyId, type TileNode, type TileTypeId } from '../../core';
import { useElementSize } from '../../hooks/useElementSize';
import { cameraAffine, type Camera } from '../../lib/viewport';
import type { MapCamera } from '../map/camera';
import type { InfiniteCanvasApi } from '../map/InfiniteCanvas';
import { outlineAtSize, outlineOf, supertileAt, supertilesAt, tintFromEngine, xrayFromEngine, type XraySupertile } from './xray';

/** The channels of a CSS colour written `rgb(r,g,b)` or `#rrggbb`. */
export function cssRgb(css: string): readonly [number, number, number] {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css);
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
  const n = css.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return [n[0] ?? 200, n[1] ?? 200, n[2] ?? 200];
}

/** Supertiles smaller than this on screen (CSS px) are not drawn. */
const MIN_DRAWN_PX = 2;
/** Opacity of the wash over the tiles. */
export const WASH_ALPHA = 0.3;
/**
 * Outline vertices per CSS px of a supertile's size. Neighbours decimate their
 * shared boundary independently, so this keeps the two copies within a pixel.
 */
const POINTS_PER_PX = 2;

function screenBox(m: Affine, s: XraySupertile): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of [
    [s.minX, s.minY],
    [s.maxX, s.minY],
    [s.maxX, s.maxY],
    [s.minX, s.maxY],
  ]) {
    const p = transPt(m, { x, y });
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

function tracePath(path: Path2D, m: Affine, loop: readonly Pt[]): void {
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    const x = m[0] * p.x + m[1] * p.y + m[2];
    const y = m[3] * p.x + m[4] * p.y + m[5];
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
}

/** The supertiles on screen, each with its outline at a size that looks right. */
function onScreen(width: number, height: number, family: TileFamilyId, items: readonly XraySupertile[], toScreen: Affine): { s: XraySupertile; loop: readonly Pt[] }[] {
  const out: { s: XraySupertile; loop: readonly Pt[] }[] = [];
  for (const s of items) {
    const b = screenBox(toScreen, s);
    if (b.x1 < 0 || b.y1 < 0 || b.x0 > width || b.y0 > height) continue;
    const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    if (size < MIN_DRAWN_PX) continue;
    out.push({ s, loop: outlineAtSize(outlineOf(s.node, family), size * POINTS_PER_PX) });
  }
  return out;
}

/**
 * Wash the supertiles in their types' colours, at {@link WASH_ALPHA}, onto a
 * canvas whose current transform maps CSS px to its pixels. `toScreen` maps
 * the supertiles' frame to CSS px. The canvas scene calls this between its
 * tiles and its strands.
 */
export function washXray(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  family: TileFamilyId,
  items: readonly XraySupertile[],
  toScreen: Affine,
  colorOf: (type: TileTypeId) => string,
): void {
  const fills = new Map<TileTypeId, Path2D>();
  for (const { s, loop } of onScreen(width, height, family, items, toScreen)) {
    let fill = fills.get(s.type);
    if (!fill) fills.set(s.type, (fill = new Path2D()));
    tracePath(fill, mul(toScreen, s.xform), loop);
  }
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = WASH_ALPHA;
  for (const [type, path] of fills) {
    ctx.fillStyle = colorOf(type);
    ctx.fill(path);
  }
  ctx.globalAlpha = alpha;
}

/**
 * Outline the supertiles on a canvas whose CSS size is `width` × `height`,
 * thin, the hovered one heavier. `toScreen` maps the supertiles' frame to
 * CSS px. Nothing is filled: the canvas lies over the strands.
 */
export function drawXray(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  width: number,
  height: number,
  family: TileFamilyId,
  items: readonly XraySupertile[],
  toScreen: Affine,
  hovered: XraySupertile | null,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const lines = new Path2D();
  for (const { s, loop } of onScreen(width, height, family, items, toScreen)) tracePath(lines, mul(toScreen, s.xform), loop);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2.25;
  ctx.stroke(lines);
  ctx.strokeStyle = 'rgba(12,14,20,0.95)';
  ctx.lineWidth = 1;
  ctx.stroke(lines);
  if (hovered) {
    const b = screenBox(toScreen, hovered);
    const loop = outlineAtSize(outlineOf(hovered.node, family), Math.max(b.x1 - b.x0, b.y1 - b.y0) * POINTS_PER_PX);
    const one = new Path2D();
    tracePath(one, mul(toScreen, hovered.xform), loop);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4;
    ctx.stroke(one);
    ctx.strokeStyle = 'rgba(12,14,20,1)';
    ctx.lineWidth = 2;
    ctx.stroke(one);
  }
}

/** The supertiles' wash inside an SVG scene, between the tiles and the strands: one outline per node, placed once per supertile. */
export function XrayWashSvg(props: { family: TileFamilyId; items: readonly XraySupertile[]; colorOf: (type: TileTypeId) => string; idPrefix: string }): JSX.Element {
  const { family, items, colorOf, idPrefix } = props;
  const defs = useMemo(() => {
    const ids = new Map<TileNode, string>();
    const out: JSX.Element[] = [];
    for (const s of items) {
      if (ids.has(s.node)) continue;
      const id = `${idPrefix}-${ids.size}`;
      ids.set(s.node, id);
      const loop = outlineOf(s.node, family).full;
      out.push(<path key={id} id={id} d={`M${loop.map((p) => `${p.x} ${p.y}`).join('L')}Z`} />);
    }
    return { ids, out };
  }, [family, items, idPrefix]);
  return (
    <g className="xray-wash" opacity={WASH_ALPHA} stroke="none" data-testid="xray-wash">
      <defs>{defs.out}</defs>
      {items.map((s) => (
        <use
          key={s.path}
          href={`#${defs.ids.get(s.node)}`}
          fill={colorOf(s.type)}
          transform={`matrix(${s.xform[0]} ${s.xform[3]} ${s.xform[1]} ${s.xform[4]} ${s.xform[2]} ${s.xform[5]})`}
        />
      ))}
    </g>
  );
}

const devicePixels = (): number => Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);

interface Hover {
  readonly s: XraySupertile;
  readonly x: number;
  readonly y: number;
}

/**
 * The canvas, the hover tracking on the viewport under it, and the label.
 * `frame()` hands back what to draw now; `redraw` changes whenever it does.
 */
function XrayCanvas(props: {
  family: TileFamilyId;
  frame: () => { items: readonly XraySupertile[]; toScreen: Affine } | null;
  redraw: unknown;
  /** Subscribe to per-frame redraws (the infinite plane moves without React). */
  tick?: (draw: () => void) => () => void;
  label: (s: XraySupertile) => string;
}): JSX.Element {
  const { family, frame, redraw, tick, label } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useElementSize(hostRef);
  const [hover, setHover] = useState<Hover | null>(null);
  const hoverRef = useRef<Hover | null>(null);
  hoverRef.current = hover;
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const draw = useMemo(
    () => (): void => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || size.width <= 0 || size.height <= 0) return;
      const dpr = devicePixels();
      const w = Math.round(size.width * dpr);
      const h = Math.round(size.height * dpr);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const f = frameRef.current();
      if (!f) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        return;
      }
      drawXray(ctx, dpr, size.width, size.height, family, f.items, f.toScreen, hoverRef.current?.s ?? null);
    },
    [size, family],
  );

  useEffect(() => {
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw, redraw, hover]);

  useEffect(() => (tick ? tick(draw) : undefined), [tick, draw]);

  // Hover: the canvas lets the pointer through, so listen on the viewport under it.
  useEffect(() => {
    const host = hostRef.current?.parentElement;
    if (!host) return;
    const move = (e: PointerEvent): void => {
      if (e.buttons) {
        if (hoverRef.current) setHover(null);
        return;
      }
      const f = frameRef.current();
      const r = hostRef.current!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const s = f ? supertileAt(f.items, transPt(inv(f.toScreen), { x, y }), family) : null;
      setHover(s ? { s, x, y } : null);
    };
    const leave = (): void => setHover(null);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, [family]);

  return (
    <div className="xray-layer" ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} />
      {hover ? (
        <div
          className="xray-tip"
          data-testid="xray-tip"
          style={{ left: Math.min(hover.x + 14, Math.max(0, size.width - 220)), top: hover.y + 14 }}
        >
          {label(hover.s)}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The supertiles of one level of a rooted patch (`root` is the level-`patchLevel`
 * node the patch flattens, placed by `viewTransform`), or null while off or
 * being listed. Listed off the input path: a deep level's outline is worked
 * out once, and can take a moment.
 */
export function useXrayItems(
  on: boolean,
  family: TileFamilyId,
  root: TileNode,
  patchLevel: number,
  level: number,
  viewTransform: Affine,
  onBusy?: (busy: boolean) => void,
): readonly XraySupertile[] | null {
  const [items, setItems] = useState<readonly XraySupertile[] | null>(null);
  useEffect(() => {
    setItems(null);
    if (!on) return;
    onBusy?.(true);
    const id = setTimeout(() => {
      setItems(supertilesAt(family, root, patchLevel, level, viewTransform));
      onBusy?.(false);
    }, 0);
    return () => clearTimeout(id);
  }, [on, family, root, patchLevel, level, viewTransform, onBusy]);
  return items;
}

/** The X-ray's outlines over a rooted patch, under the PanZoom camera. */
export function XrayRooted(props: { family: TileFamilyId; items: readonly XraySupertile[] | null; camera: Camera }): JSX.Element {
  const { family, items, camera } = props;
  const toScreen = useMemo(() => cameraAffine(camera), [camera]);
  const frame = useMemo(() => () => (items ? { items, toScreen } : null), [items, toScreen]);
  return <XrayCanvas family={family} frame={frame} redraw={frame} label={(s) => `${s.type} · ${s.path === '' ? 'the root' : s.path}`} />;
}

/** Most supertiles one view of the infinite plane lists. */
const INFINITE_CAP = 3000;

/** The X-ray over the infinite plane of `InfiniteCanvas` (same seed, family and chain). */
export function XrayInfinite(props: {
  family: TileFamilyId;
  seed: number;
  worldChain?: string;
  level: number;
  apiRef: React.MutableRefObject<InfiniteCanvasApi | null>;
  colorOf: (type: TileTypeId) => string;
  onTooMany?: (tooMany: boolean) => void;
}): JSX.Element {
  const { family, seed, worldChain, level, apiRef, colorOf, onTooMany } = props;
  const engine = useMemo(() => unrootedEngineFor(seed, family, worldChain), [seed, family, worldChain]);
  const state = useRef<{
    cam: MapCamera | null;
    w: number;
    h: number;
    /** The view last listed (with margin), and what it held. */
    rect: { x0: number; y0: number; x1: number; y1: number } | null;
    cut: ReturnType<typeof xrayFromEngine> | null;
  }>({ cam: null, w: 0, h: 0, rect: null, cut: null });
  const [root, setRoot] = useState<{ level: number; type: TileTypeId } | null>(null);
  const tooManyRef = useRef<boolean | null>(null);
  const colorRef = useRef(colorOf);
  colorRef.current = colorOf;
  useEffect(() => {
    state.current.rect = null;
    state.current.cut = null;
  }, [engine, level, colorOf]);
  useEffect(() => () => apiRef.current?.setTint(null), [apiRef]);

  const frame = useMemo(
    () => () => {
      const st = state.current;
      const cam = st.cam;
      if (!cam || st.w <= 0) return null;
      const hw = st.w / 2 / cam.scale;
      const hh = st.h / 2 / cam.scale;
      const r = st.rect;
      const inside = r && cam.cx - hw >= r.x0 && cam.cx + hw <= r.x1 && cam.cy - hh >= r.y0 && cam.cy + hh <= r.y1;
      if (!inside) {
        st.rect = { x0: cam.cx - 2 * hw, y0: cam.cy - 2 * hh, x1: cam.cx + 2 * hw, y1: cam.cy + 2 * hh };
        const view = { cx: cam.cx, cy: cam.cy, halfW: 2 * hw, halfH: 2 * hh };
        st.cut = xrayFromEngine(engine, view, level, INFINITE_CAP);
        const c = st.cut;
        apiRef.current?.setTint(tintFromEngine(engine, view, c, level, (t) => cssRgb(colorRef.current(t)), WASH_ALPHA));
        setRoot((prev) => (prev?.level === c.rootLevel && prev.type === c.rootType ? prev : { level: c.rootLevel, type: c.rootType }));
        if (tooManyRef.current !== c.tooMany) {
          tooManyRef.current = c.tooMany;
          onTooMany?.(c.tooMany);
        }
      }
      const toScreen: Affine = [cam.scale, 0, st.w / 2 - cam.cx * cam.scale, 0, cam.scale, st.h / 2 - cam.cy * cam.scale];
      return st.cut ? { items: st.cut.items, toScreen } : null;
    },
    [engine, level, onTooMany, apiRef],
  );

  // Follow the canvas's camera, which moves without React (panning, the follow camera).
  const tick = useMemo(
    () => (draw: () => void) => {
      let id = 0;
      const loop = (): void => {
        const api = apiRef.current;
        if (api) {
          const cam = api.getCamera();
          const { width, height } = api.getSize();
          const st = state.current;
          if (cam !== st.cam || width !== st.w || height !== st.h || !st.cut) {
            st.cam = cam;
            st.w = width;
            st.h = height;
            draw();
          }
        }
        id = requestAnimationFrame(loop);
      };
      id = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(id);
    },
    [apiRef],
  );

  useEffect(() => () => onTooMany?.(false), [onTooMany]);

  return (
    <XrayCanvas
      family={family}
      frame={frame}
      redraw={frame}
      tick={tick}
      label={(s) => `${s.type} · ${s.path === '' ? 'the root' : s.path}${root ? ` in the level-${root.level} ${root.type}` : ''}`}
    />
  );
}
