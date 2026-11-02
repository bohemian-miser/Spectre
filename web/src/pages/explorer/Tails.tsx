/**
 * The Explorer's tail classes on a rooted patch (`tailClasses.ts`, run in a
 * worker): `TailsControl` is the switch, the progress, a legend of classes
 * and the hovered tail's fate with its links, one item of the viewport's
 * tool row; `TailsLayer` draws every open strand of the patch in its
 * class's colour over the strands, and reports the tail under the pointer.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { inv, mul, transPt, type Affine, type Path, type Pt } from '../../core';
import { useElementSize } from '../../hooks/useElementSize';
import { cameraAffine, type Camera } from '../../lib/viewport';
import { classKey, type Closing, type Named, type Near, type TailFate } from './tailClasses';
import type { TailsState } from './tailClassesClient';

/** The Foundations chart's chain colours (`--fd-c0` to `--fd-c5`), then more. */
const CHAIN_COLOURS = ['#2a78d6', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#00a3b4', '#a0522d'];
/** Nuggets: the Foundations nugget orange first. */
const NUGGET_COLOURS = ['#eb6834', '#b8860b', '#f4a582', '#8c3a14'];
const UNKNOWN = '#e34948';
const OPEN = '#8a8984';
/** A strand certified as an infinite line: the Foundations chart's `--fd-line`. */
const LINE = '#127f96';

const nf = (n: number): string => n.toLocaleString('en-US');

/** A class of the legend. */
export interface TailClass {
  readonly key: string;
  readonly label: string;
  readonly colour: string;
  readonly dashed: boolean;
  readonly tails: number;
  readonly tiles: number;
}

/** What a circuit is, in a few words: `harmonic 1 of the 381`. */
export function circuitLabel(n: Named): string {
  if (n.nugget) return `the ${nf(n.length)}, a nugget`;
  if (n.order === 0) return `the ${nf(n.length)}, foundational`;
  return `the ${nf(n.length)}, harmonic ${n.order} of the ${nf(n.root.length)}`;
}

const nearLabel = (x: Near): string =>
  `reads as ${x.named.order ? `harmonic ${x.named.order} of the ${nf(x.named.root.length)}` : `the ${nf(x.named.length)}`} at levels ${x.from} to ${x.to} only`;

/** A tail's fate in a sentence. */
export function fateText(f: TailFate, closing: Closing | null, candidate: string | null | undefined): string {
  if (f.state === 'ends') return `ends inside a tile at level ${f.level}`;
  if (f.state === 'line') return `an infinite line, certified at level ${f.level} along ${f.cycle}, ${nf(f.tiles)} tiles so far`;
  if (f.state === 'open') {
    const past = `open past level ${f.level}${f.why === 'routes' ? ' (route budget)' : ''}`;
    const cand = candidate === undefined ? '; candidate: reading…' : candidate ? `; candidate: ${candidate}` : '';
    return `${past}, ${nf(f.tiles)} tiles so far${cand}`;
  }
  const c = closing!;
  if (!c.named) return `closes at level ${c.level} as a circuit of ${nf(c.length)} tiles not known${c.near ? `; ${nearLabel(c.near)}` : ''}`;
  return `closes at level ${c.level} as ${circuitLabel(c.named)}`;
}

/** Each tail's class key (null while pending), and the legend. */
export function tailClasses(state: TailsState, tiles: readonly number[]): { keys: (string | null)[]; classes: TailClass[] } {
  const keys = state.fates.map((f) => (!f ? null : f.state === 'closed' ? classKey(state.closings[f.closing]) : f.state === 'line' ? 'line' : 'open'));
  const by = new Map<string, { tails: number; tiles: number; named: Named | null; top: number }>();
  keys.forEach((k, i) => {
    if (!k) return;
    const f = state.fates[i]!;
    const e = by.get(k) ?? by.set(k, { tails: 0, tiles: 0, named: null, top: 0 }).get(k)!;
    e.tails++;
    e.tiles += tiles[i] ?? 0;
    if (f.state === 'closed') e.named ??= state.closings[f.closing].named;
    else if (f.state !== 'line') e.top = Math.max(e.top, f.level);
  });
  const rank = (k: string, n: Named | null): number => {
    if (k === 'open') return 3e9;
    if (k === 'line') return 2.5e9;
    if (k === 'unknown') return 2e9;
    if (n!.nugget) return 1e9 + n!.root.length;
    const r = state.chains.indexOf(n!.root.id);
    return r < 0 ? 1e8 + n!.root.length : r;
  };
  const sorted = [...by].sort((a, b) => rank(a[0], a[1].named) - rank(b[0], b[1].named));
  let chains = 0;
  let nuggets = 0;
  const lengths = new Map<number, number>();
  for (const [, e] of sorted) if (e.named?.nugget) lengths.set(e.named.root.length, (lengths.get(e.named.root.length) ?? 0) + 1);
  const classes = sorted.map(([key, e]): TailClass => {
    const n = e.named;
    if (key === 'open') return { key, label: `open past level ${e.top}`, colour: OPEN, dashed: true, tails: e.tails, tiles: e.tiles };
    if (key === 'unknown') return { key, label: 'not known', colour: UNKNOWN, dashed: false, tails: e.tails, tiles: e.tiles };
    if (key === 'line') return { key, label: 'infinite line', colour: LINE, dashed: false, tails: e.tails, tiles: e.tiles };
    if (n!.nugget) {
      const family = lengths.get(n!.root.length)! > 1 ? ` (${n!.root.families.split(' ')[0]})` : '';
      return { key, label: `${nf(n!.root.length)} nugget${family}`, colour: NUGGET_COLOURS[nuggets++ % NUGGET_COLOURS.length], dashed: false, tails: e.tails, tiles: e.tiles };
    }
    const r = state.chains.indexOf(n!.root.id);
    const colour = CHAIN_COLOURS[(r >= 0 && r < 6 ? r : 6 + chains) % CHAIN_COLOURS.length];
    if (!(r >= 0 && r < 6)) chains++;
    return { key, label: `${nf(n!.root.length)} chain`, colour, dashed: false, tails: e.tails, tiles: e.tiles };
  });
  return { keys, classes };
}

export function TailsControl(props: {
  on: boolean;
  onToggle(on: boolean): void;
  state: TailsState | null;
  classes: readonly TailClass[];
  picked: string | null;
  onPick(key: string | null): void;
  /** The tail last hovered: its fate in words, and its links. */
  detail: { text: string; links: React.ReactNode } | null;
}): JSX.Element {
  const { on, onToggle, state, classes, picked, onPick, detail } = props;
  const progress = !state
    ? 'tracing…'
    : state.error
      ? state.error
      : state.done === 0 && !state.finished
        ? `${state.stage}…`
        : state.finished
          ? `${nf(state.total)} tails classified${state.ended ? '' : ', reading the open ones…'}`
          : `${nf(state.done)} of ${nf(state.total)} tails classified`;
  return (
    <div className={on ? 'tails-control is-open' : 'tails-control'} data-testid="tails-control" data-panzoom-ignore="">
      <div className="tails-row">
        <label title="Colour each strand that leaves the patch by the circuit it closes into">
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} data-testid="tails-toggle" />
          Tails
        </label>
        {on ? (
          <span className="tails-progress" data-testid="tails-progress">
            {progress}
          </span>
        ) : null}
      </div>
      {on && classes.length ? (
        <ul className="tails-legend" data-testid="tails-legend">
          {classes.map((c) => (
            <li key={c.key}>
              <button type="button" aria-pressed={picked === c.key} onClick={() => onPick(picked === c.key ? null : c.key)} title="Pick out these tails">
                <i className={c.dashed ? 'is-dashed' : undefined} style={{ borderColor: c.colour, background: c.dashed ? undefined : c.colour }} />
                <span className="tails-label">{c.label}</span>
                <span className="tails-count">
                  {nf(c.tails)} · {nf(c.tiles)} tiles
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {on && detail ? (
        <p className="tails-detail" data-testid="tails-detail">
          {detail.text} {detail.links}
        </p>
      ) : null}
    </div>
  );
}

const devicePixels = (): number => Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);

function strokePath(ctx: CanvasRenderingContext2D, m: Affine, p: Path): void {
  ctx.beginPath();
  p.points.forEach((q, i) => {
    const x = m[0] * q.x + m[1] * q.y + m[2];
    const y = m[3] * q.x + m[4] * q.y + m[5];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/** Squared distance from p to segment ab. */
function segDist2(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = dx * dx + dy * dy;
  const t = L > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
  const x = a.x + t * dx - p.x;
  const y = a.y + t * dy - p.y;
  return x * x + y * y;
}

/** The open strands over a rooted patch, each in its class's colour; the tail under the pointer goes to `onHover`. */
export function TailsLayer(props: {
  tails: readonly Path[];
  /** Per tail: its class key, null while pending. */
  keys: readonly (string | null)[];
  classes: readonly TailClass[];
  picked: string | null;
  viewTransform: Affine;
  camera: Camera;
  /** The fate of a tail in words, for the label under the pointer. */
  label(tail: number): string;
  onHover(tail: number): void;
}): JSX.Element {
  const { tails, keys, classes, picked, viewTransform, camera, label, onHover } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useElementSize(hostRef);
  const [hover, setHover] = useState<{ tail: number; x: number; y: number } | null>(null);
  const style = useMemo(() => new Map(classes.map((c) => [c.key, c])), [classes]);
  const toPatch = useMemo(() => mul(cameraAffine(camera), viewTransform), [camera, viewTransform]);
  const live = useRef({ tails, keys, toPatch, onHover });
  live.current = { tails, keys, toPatch, onHover };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || size.width <= 0) return;
    const id = requestAnimationFrame(() => {
      const dpr = devicePixels();
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const width = Math.max(1.5, Math.min(4, camera.scale * 0.12));
      const order = tails.map((_, i) => i).filter((i) => keys[i]);
      // the picked class on top
      if (picked) order.sort((a, b) => Number(keys[a] === picked) - Number(keys[b] === picked));
      for (const i of order) {
        const c = style.get(keys[i]!);
        if (!c) continue;
        const dim = picked !== null && keys[i] !== picked;
        ctx.globalAlpha = dim ? 0.18 : 1;
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(12,14,20,0.5)';
        ctx.lineWidth = width + 1.5;
        strokePath(ctx, toPatch, tails[i]);
        ctx.strokeStyle = c.colour;
        ctx.lineWidth = i === hover?.tail ? width + 1.5 : width;
        if (c.dashed) ctx.setLineDash([width * 2, width * 1.6]);
        strokePath(ctx, toPatch, tails[i]);
      }
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    });
    return () => cancelAnimationFrame(id);
  }, [size, camera.scale, toPatch, tails, keys, style, picked, hover]);

  // The canvas lets the pointer through, so listen on the viewport under it.
  useEffect(() => {
    const host = hostRef.current?.parentElement;
    if (!host) return;
    const move = (e: PointerEvent): void => {
      if (e.buttons) return;
      const { tails: ts, keys: ks, toPatch: m, onHover: report } = live.current;
      const r = hostRef.current!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const p = transPt(inv(m), { x, y });
      const reach = 8 / Math.hypot(m[0], m[3]);
      let best = -1;
      let bestD = reach * reach;
      ts.forEach((path, i) => {
        if (!ks[i]) return;
        const pts = path.points;
        for (let j = 0; j + 1 < pts.length; j++) {
          const d = segDist2(p, pts[j], pts[j + 1]);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      });
      if (best >= 0) report(best);
      setHover(best >= 0 ? { tail: best, x, y } : null);
    };
    const leave = (): void => setHover(null);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div className="xray-layer tails-layer" ref={hostRef} aria-hidden="true" data-testid="tails-layer">
      <canvas ref={canvasRef} />
      {hover ? (
        <div className="xray-tip tails-tip" data-testid="tails-tip" style={{ left: Math.min(hover.x + 14, Math.max(0, size.width - 300)), top: hover.y + 14 }}>
          {label(hover.tail)}
        </div>
      ) : null}
    </div>
  );
}
