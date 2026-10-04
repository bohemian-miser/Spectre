/**
 * `MorphCanvas` — plays the hexagons ↔ Spectres morph (`buildHexSpectreMorph`)
 * over the Explorer viewport, then hands back to the real view.
 *
 * Every tile's vertices and every strand's ends are interpolated in world
 * space, and the camera glides from the view the user was looking at to the
 * one the other shape will open with. One Canvas2D pass per frame.
 *
 * Both ends of the morph are in the hexagons' frame (the Spectre side is
 * fitted over them, `morph.align`), so the pass runs under the hexagon view
 * transform. The Spectre view draws its strokes in its own units, which the
 * fit scales, so the stroke widths glide to meet them.
 */

import { useEffect, useRef } from 'react';
import type { Affine, HexSpectreMorph } from '../core';
import type { Camera } from '../lib/viewport';

export interface MorphCanvasProps {
  readonly morph: HexSpectreMorph;
  /** `toSpectre` plays hexagons → Spectres; `toHex` the reverse. */
  readonly direction: 'toSpectre' | 'toHex';
  readonly viewTransform: Affine;
  readonly fromCamera: Camera;
  readonly toCamera: Camera;
  readonly fillOf: (type: string) => string;
  readonly showBackgrounds: boolean;
  readonly showOutlines: boolean;
  readonly showLines: boolean;
  /** Strand stroke width, world units. */
  readonly strokeWidth: number;
  readonly durationMs?: number;
  readonly onDone: () => void;
}

const ease = (s: number): number => (s < 0.5 ? 4 * s * s * s : 1 - (-2 * s + 2) ** 3 / 2);

/** Glide between cameras: log-scale and the world point at the centre. */
function cameraAt(a: Camera, b: Camera, e: number, w: number, h: number): Camera {
  const ca = { x: (w / 2 - a.x) / a.scale, y: (h / 2 - a.y) / a.scale };
  const cb = { x: (w / 2 - b.x) / b.scale, y: (h / 2 - b.y) / b.scale };
  const scale = Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * e);
  const cx = ca.x + (cb.x - ca.x) * e;
  const cy = ca.y + (cb.y - ca.y) * e;
  return { scale, x: w / 2 - cx * scale, y: h / 2 - cy * scale };
}

export function MorphCanvas(props: MorphCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      propsRef.current.onDone();
      return;
    }
    const { morph, direction, viewTransform: v, fromCamera, toCamera } = propsRef.current;
    const duration = propsRef.current.durationMs ?? 1400;
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // What the fit does to a Spectre unit: the Spectre view's strokes are that much thinner.
    const unit = Math.hypot(morph.align[0], morph.align[3]) || 1;

    // Group strands by colour once: one stroke per colour per frame.
    const byColor = new Map<string, number[]>();
    morph.chords.forEach((c, i) => {
      const list = byColor.get(c.color);
      if (list) list.push(i);
      else byColor.set(c.color, [i]);
    });

    let raf = 0;
    const started = performance.now();
    const frame = (now: number): void => {
      const p = propsRef.current;
      const s = Math.min(1, (now - started) / duration);
      const e = ease(s);
      const t = direction === 'toSpectre' ? e : 1 - e; // 0 = hexagons, 1 = Spectres
      const cam = cameraAt(fromCamera, toCamera, e, w, h);
      // world -> screen = camera ∘ view transform
      const a = cam.scale * v[0];
      const b = cam.scale * v[3];
      const c = cam.scale * v[1];
      const d = cam.scale * v[4];
      const tx = cam.scale * v[2] + cam.x;
      const ty = cam.scale * v[5] + cam.y;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * tx, dpr * ty);
      const lerp = (x: number, y: number) => x + (y - x) * t;
      const stroke = lerp(1, unit);

      const outlines = p.showOutlines && cam.scale * dpr > 1.2;
      ctx.lineWidth = 0.08 * stroke;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      for (const tile of morph.tiles) {
        const { from, to } = tile;
        ctx.beginPath();
        ctx.moveTo(lerp(from[0], to[0]), lerp(from[1], to[1]));
        for (let k = 2; k < from.length; k += 2) ctx.lineTo(lerp(from[k], to[k]), lerp(from[k + 1], to[k + 1]));
        ctx.closePath();
        if (p.showBackgrounds) {
          ctx.fillStyle = p.fillOf(tile.type);
          ctx.fill();
        }
        if (outlines) ctx.stroke();
      }

      if (p.showLines) {
        ctx.lineWidth = p.strokeWidth * stroke;
        ctx.lineCap = 'round';
        for (const [color, list] of byColor) {
          ctx.beginPath();
          for (const i of list) {
            const { from, to } = morph.chords[i];
            ctx.moveTo(lerp(from[0], to[0]), lerp(from[1], to[1]));
            ctx.lineTo(lerp(from[2], to[2]), lerp(from[3], to[3]));
          }
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }

      if (s < 1) raf = requestAnimationFrame(frame);
      else p.onDone();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="morph-canvas" aria-hidden="true" data-testid="morph-canvas" />;
}

export default MorphCanvas;
