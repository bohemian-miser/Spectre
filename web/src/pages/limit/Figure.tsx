/**
 * A still canvas of closed outlines, fitted together, with optional marks.
 */
import { useEffect, useRef } from 'react';
import type { Pt } from '../../core/geom';
import { boxOf, paletteFrom, toCanvas, tracePath, viewOf, type Palette } from './draw';

export interface Layer {
  readonly pts: Float64Array;
  /** A palette key or a colour. */
  readonly stroke: keyof Palette | string;
  readonly fill?: boolean;
  readonly width?: number;
  readonly dash?: boolean;
}

export interface Mark {
  readonly at: Pt;
  readonly label?: string;
  readonly ring?: boolean;
}

export function Figure(props: { layers: readonly Layer[]; marks?: readonly Mark[]; width: number; height: number; dark: boolean; label: string; testId?: string }): JSX.Element {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const { layers, marks, width, height, dark } = props;
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const pal = paletteFrom(c, dark);
    const colour = (s: string) => (s in pal ? pal[s as keyof Palette] : s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.lineJoin = 'round';
    const view = viewOf(boxOf(layers.map((l) => l.pts)), width, height, 10);
    for (const l of layers) {
      tracePath(ctx, view, l.pts);
      if (l.fill) {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = colour(l.stroke);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = colour(l.stroke);
      ctx.lineWidth = l.width ?? 1.2;
      ctx.setLineDash(l.dash ? [4, 3] : []);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (const m of marks ?? []) {
      const p = toCanvas(view, m.at);
      if (m.ring) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
        ctx.strokeStyle = pal.text;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, 2 * Math.PI);
        ctx.fillStyle = pal.text;
        ctx.fill();
      }
      if (m.label) {
        ctx.fillStyle = pal.text;
        ctx.fillText(m.label, p.x, p.y - 11);
      }
    }
  }, [layers, marks, width, height, dark]);
  return <canvas ref={canvas} className="lm-figure" style={{ width: '100%', maxWidth: width, aspectRatio: `${width} / ${height}` }} role="img" aria-label={props.label} data-testid={props.testId} />;
}
