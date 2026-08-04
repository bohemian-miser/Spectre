/**
 * `TilingCanvas` — Canvas2D renderer for the heavy levels (DESIGN.md §5.2).
 *
 * Same inputs as `TilingView`, no interactivity: level 5 is ~35 k tiles and
 * level 6 ~273 k, well past a practical SVG node budget. Each leaf type gets a
 * cached `Path2D`; drawing is `setTransform` + `fill`/`stroke` per instance,
 * inside one `requestAnimationFrame` per camera/state change.
 */

import { useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_CONTRACTS,
  mul,
  type Affine,
  type ColorSchemeId,
  type EdgeContracts,
  type Path,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { buildOverlayPaths } from '../lib/overlayPaths';
import { edgeClassColor, tileColor } from '../lib/palette';
import { buildTilingModel, tileConnectionPoints, tileOutline } from '../lib/tilingModel';
import { fitToBounds, type Camera } from '../lib/viewport';
import { useElementSize } from '../hooks/useElementSize';

export interface TilingCanvasProps {
  readonly family: TileFamilyId;
  readonly rootTile?: TileTypeId;
  readonly level: number;
  readonly curvy?: boolean;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  readonly contracts?: EdgeContracts;
  readonly showBackgrounds?: boolean;
  readonly showOutlines?: boolean;
  readonly showDots?: boolean;
  readonly selectedEdges?: ReadonlySet<number>;
  readonly stabilizeChirality?: boolean;
  /** Omit to auto-fit the tiling into the element. */
  readonly camera?: Camera;
  readonly circuits?: readonly Path[];
  readonly tails?: readonly Path[];
  readonly circuitColorByLength?: ReadonlyMap<number, string> | readonly (readonly [number, string])[];
  readonly rainbowTails?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}

const path2dCache = new Map<string, Path2D>();

function tilePath2d(family: TileFamilyId, type: TileTypeId, curvy: boolean): Path2D {
  const key = `${family}/${type}/${curvy ? 'c' : 's'}`;
  let hit = path2dCache.get(key);
  if (!hit) {
    hit = new Path2D(tileOutline(family, type, curvy));
    path2dCache.set(key, hit);
  }
  return hit;
}

function applyTransform(ctx: CanvasRenderingContext2D, dpr: number, cam: Camera, m: Affine): void {
  // world -> screen: first the tile transform, then the camera.
  const a = cam.scale * m[0];
  const b = cam.scale * m[3];
  const c = cam.scale * m[1];
  const d = cam.scale * m[4];
  const e = cam.scale * m[2] + cam.x;
  const f = cam.scale * m[5] + cam.y;
  ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * e, dpr * f);
}

export function TilingCanvas(props: TilingCanvasProps): JSX.Element {
  const {
    family,
    rootTile = 'Delta',
    level,
    curvy = false,
    colorScheme = 'bright',
    customColors,
    contracts = DEFAULT_CONTRACTS,
    showBackgrounds = true,
    showOutlines = true,
    showDots = false,
    selectedEdges,
    stabilizeChirality = true,
    camera,
    circuits,
    tails,
    circuitColorByLength,
    rainbowTails = false,
    className,
    ariaLabel,
  } = props;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useElementSize(hostRef);

  const model = useMemo(
    () => buildTilingModel({ family, rootTile, level, curvy, stabilizeChirality }),
    [family, rootTile, level, curvy, stabilizeChirality],
  );

  const overlay = useMemo(
    () =>
      circuits || tails
        ? buildOverlayPaths(
            { circuits: circuits ?? [], tails: tails ?? [], circuitColorByLength },
            { rainbowTails },
          )
        : [],
    [circuits, tails, circuitColorByLength, rainbowTails],
  );

  const effectiveCamera = useMemo(
    () => camera ?? fitToBounds(model.bounds, size),
    [camera, model.bounds, size],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    // Only touch the bitmap when it actually changed: resizing clears the
    // canvas and can re-trigger observers. CSS (absolute inset:0) owns the
    // element's layout size, so no style writes here.
    const bitmapW = Math.round(size.width * dpr);
    const bitmapH = Math.round(size.height * dpr);
    if (canvas.width !== bitmapW) canvas.width = bitmapW;
    if (canvas.height !== bitmapH) canvas.height = bitmapH;

    let frame = 0;
    const draw = (): void => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const strokeScale = effectiveCamera.scale * dpr;
      for (const inst of model.instances) {
        applyTransform(ctx, dpr, effectiveCamera, mul(model.viewTransform, inst.xform));
        const p = tilePath2d(family, inst.type, curvy);
        if (showBackgrounds) {
          ctx.fillStyle = tileColor(inst.type, colorScheme, customColors);
          ctx.fill(p);
        }
        if (showOutlines && strokeScale > 1.2) {
          ctx.lineWidth = 0.08;
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.stroke(p);
        }
      }

      if (showDots && selectedEdges?.size) {
        for (const inst of model.instances) {
          const pts = tileConnectionPoints(family, inst.type, selectedEdges, contracts);
          if (!pts.length) continue;
          applyTransform(ctx, dpr, effectiveCamera, mul(model.viewTransform, inst.xform));
          for (const p of pts) {
            ctx.beginPath();
            ctx.arc(p.pt.x, p.pt.y, 0.15, 0, Math.PI * 2);
            ctx.fillStyle = edgeClassColor(p.edge.major);
            ctx.fill();
          }
        }
      }

      if (overlay.length) {
        applyTransform(ctx, dpr, effectiveCamera, model.viewTransform);
        ctx.lineWidth = 0.12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const rec of overlay) {
          ctx.strokeStyle = rec.color;
          ctx.stroke(new Path2D(rec.d));
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [
    size,
    model,
    effectiveCamera,
    family,
    curvy,
    colorScheme,
    customColors,
    showBackgrounds,
    showOutlines,
    showDots,
    selectedEdges,
    contracts,
    overlay,
  ]);

  return (
    <div
      ref={hostRef}
      className={['tiling-canvas', className ?? ''].filter(Boolean).join(' ')}
      style={{ width: '100%', height: '100%' }}
      data-tile-count={model.tileCount}
      data-level={level}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel ?? `${family} tiling, level ${level}, ${model.tileCount} tiles`}
      />
    </div>
  );
}

export default TilingCanvas;
