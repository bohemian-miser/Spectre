/**
 * `TileEditor` — one tile, magnified, whose pairing you draw. Ported from the
 * aperiodic-circuits explorer's editor.
 *
 * Tap or press a connection point and a line follows you, latching on to each
 * point you pass; letting go (or tapping again) pairs it with the last one,
 * keeping as much of the old pairing as still fits. Tapping an edge away from
 * its points turns its class on or off. ‹ › step through the pairings, and
 * the arrows at the sides move to the neighbouring tile types. On the
 * keyboard, ← → change the tile type and ↑ ↓ step through its pairings.
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  MAX_STRANDS,
  edgeLabels,
  strandCount,
  leafPts,
  matchingAt,
  orientCurve,
  parseEdgeLabel,
  strandCurve,
  type EdgeContracts,
  type Matching,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { matchingOptions, tileMatchingInfo } from '../lib/matchingModel';
import { EdgeClassLegend } from './controls/EdgeClassLegend';
import { edgeClassColor } from '../lib/palette';

export interface TileEditorProps {
  readonly family: TileFamilyId;
  readonly type: TileTypeId;
  readonly selected: ReadonlySet<number>;
  readonly contracts?: EdgeContracts;
  /** Full matching index (`enumerateMatchings` order). */
  readonly index: number;
  /** Offer only non-crossing pairings (as the sliders do). */
  readonly nonCrossingOnly?: boolean;
  readonly curvedStrands?: boolean;
  onSetIndex(index: number): void;
  /** Tapping an edge turns its class on or off. */
  onToggleClass(major: number): void;
  /** Move to the previous (-1) or next (+1) tile type. */
  onStepTile(d: -1 | 1): void;
  onClose(): void;
  /** Set how many strands cross each seam of a class; shows steppers on the tile's class chips. */
  onStrands?(major: number, count: number): void;
}

/** Pairings shown at once in the gallery; the arrows reach the rest. */
const GALLERY_MAX = 48;

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

function segmentDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

const has = (m: Matching, i: number, j: number): boolean => m.some(([x, y]) => (x === i && y === j) || (x === j && y === i));

export function TileEditor(props: TileEditorProps): JSX.Element {
  const { family, type, selected, contracts, index, nonCrossingOnly = false, curvedStrands = false } = props;
  const { onSetIndex, onToggleClass, onStepTile, onClose, onStrands } = props;
  const [gallery, setGallery] = useState(false);

  const outline = leafPts(family, type);
  const classes = useMemo(() => edgeLabels(family, type).map((l) => parseEdgeLabel(l).major), [family, type]);
  const info = useMemo(() => tileMatchingInfo(family, type, selected, contracts), [family, type, selected, contracts]);
  const points = info.points.map((c) => c.pt);
  const options = useMemo(() => (info.odd ? [] : matchingOptions(info, nonCrossingOnly)), [info, nonCrossingOnly]);
  const position = Math.max(0, options.indexOf(index));
  const current = matchingAt(points.length, options.includes(index) ? index : (options[0] ?? 0)) ?? [];

  const box = useMemo(() => {
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const pad = span * 0.14;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad, span };
  }, [outline]);
  const span = box.span;
  const grab = span * 0.08;
  const snapAt = span * 0.13;
  const sw = span / 60;

  const svg = useRef<SVGSVGElement>(null);
  const [from, setFrom] = useState<number | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [dragging, setDragging] = useState(false);
  // The point the line last passed over: it stays latched until another one
  // takes over, or the line goes back to where it started.
  const [latched, setLatched] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toSvg = (e: PointerEvent): Pt | null => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const nearest = (p: Pt, within: number, except: number | null): number | null => {
    let best: number | null = null;
    let bestD = within;
    points.forEach((q, i) => {
      const d = dist(p, q);
      if (i !== except && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };
  // The class of the edge under p (nearest within reach).
  const classAt = (p: Pt): number | null => {
    let best: number | null = null;
    let bestD = span * 0.05;
    outline.forEach((a, e) => {
      const d = segmentDist(p, a, outline[(e + 1) % outline.length]);
      if (d < bestD) {
        best = classes[e];
        bestD = d;
      }
    });
    return best;
  };
  const reset = () => {
    setFrom(null);
    setCursor(null);
    setLatched(null);
  };
  const toggle = (major: number) => {
    reset();
    setMessage(null);
    onToggleClass(major);
  };

  /** Pair a with b, keeping as many of the current pairs as an allowed pairing can. */
  const connect = (a: number, b: number) => {
    reset();
    let best = -1;
    let bestShared = -1;
    for (const k of options) {
      const m = matchingAt(points.length, k);
      if (!m || !has(m, a, b)) continue;
      const shared = current.filter(([x, y]) => has(m, x, y)).length;
      if (shared > bestShared) {
        best = k;
        bestShared = shared;
      }
    }
    if (best < 0) setMessage('Those two can’t pair: the points between them would be left with an odd one out.');
    else {
      setMessage(null);
      onSetIndex(best);
    }
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e);
    if (!p) return;
    const hit = nearest(p, grab, null);
    if (from === null) {
      if (hit !== null && !info.odd) {
        setFrom(hit);
        setCursor(p);
        setLatched(null);
        setDragging(true);
        setMessage(null);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } else {
        const c = classAt(p);
        if (c !== null) toggle(c);
      }
      return;
    }
    // Already holding a line: a second tap lands it (on the point tapped, or
    // the one it last latched on to), turns an edge on or off, or lets go.
    const target = nearest(p, snapAt, from) ?? (hit === from ? null : latched);
    if (target !== null) connect(from, target);
    else if (hit === null && classAt(p) !== null) toggle(classAt(p)!);
    else reset();
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (from === null) return;
    const p = toSvg(e);
    if (!p) return;
    setCursor(p);
    const near = nearest(p, snapAt, null);
    if (near === from) setLatched(null);
    else if (near !== null) setLatched(near);
  };
  const onUp = () => {
    if (dragging && from !== null && latched !== null) connect(from, latched);
    setDragging(false);
  };

  const snap = from !== null ? latched : null;
  const a = from !== null ? points[from] : null;
  const b = snap !== null ? points[snap] : cursor;
  const step = (d: 1 | -1) => {
    if (options.length > 1) onSetIndex(options[(position + d + options.length) % options.length]);
  };
  // Arrow keys work while the editor is open, unless a form field has focus.
  const keys = useRef({ step, onStepTile });
  keys.current = { step, onStepTile };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused chip's own arrow keys (strand counts) come first.
      if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const act: Record<string, () => void> = {
        ArrowLeft: () => keys.current.onStepTile(-1),
        ArrowRight: () => keys.current.onStepTile(1),
        ArrowUp: () => keys.current.step(1),
        ArrowDown: () => keys.current.step(-1),
      };
      if (!act[e.key]) return;
      e.preventDefault();
      act[e.key]();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const chordD = ([i, j]: readonly [number, number]): string => {
    const p = points[i];
    const q = points[j];
    if (!curvedStrands) return `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
    const [h1, h2] = orientCurve(strandCurve(family, type, p, q), p);
    return `M ${p.x} ${p.y} C ${h1.x} ${h1.y} ${h2.x} ${h2.y} ${q.x} ${q.y}`;
  };
  const tileClasses = useMemo(() => [...new Set(classes)], [classes]);
  const strands = useMemo(() => Object.fromEntries(tileClasses.map((m) => [m, strandCount(contracts, m)])), [tileClasses, contracts]);
  const centre = {
    x: outline.reduce((s, p) => s + p.x, 0) / outline.length,
    y: outline.reduce((s, p) => s + p.y, 0) / outline.length,
  };

  return (
    <div className="tile-editor-pop" role="dialog" aria-label={`Pairing for ${type}`} data-testid="tile-editor">
      <div className="tile-editor-head">
        <b>{type}</b>
        {options.length > 1 && (
          <span className="tile-editor-step">
            <button type="button" onClick={() => step(-1)} aria-label="Previous pairing">
              ‹
            </button>
            <span data-testid="tile-editor-position">
              {position + 1}/{options.length}
            </span>
            <button type="button" onClick={() => step(1)} aria-label="Next pairing">
              ›
            </button>
          </span>
        )}
        <button type="button" className="tile-editor-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <button type="button" className="tile-editor-nav prev" onClick={() => onStepTile(-1)} aria-label="Previous tile">
        ‹
      </button>
      <button type="button" className="tile-editor-nav next" onClick={() => onStepTile(1)} aria-label="Next tile">
        ›
      </button>
      <svg
        ref={svg}
        className="tile-editor-stage"
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} className="tile-editor-body" />
        {outline.map((p, e) => {
          const q = outline[(e + 1) % outline.length];
          const on = selected.has(classes[e]);
          const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
          const len = dist(mid, centre) || 1;
          const out = { x: mid.x + ((mid.x - centre.x) / len) * span * 0.07, y: mid.y + ((mid.y - centre.y) / len) * span * 0.07 };
          return (
            <g key={e} className={`tile-editor-edge${on ? ' is-on' : ''}`} data-major={classes[e]}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={edgeClassColor(classes[e])} strokeWidth={sw * (on ? 2.4 : 1.2)} strokeLinecap="round" />
              <text x={out.x} y={out.y} fontSize={span * 0.06} textAnchor="middle" dominantBaseline="central" fill={edgeClassColor(classes[e])}>
                {classes[e]}
              </text>
            </g>
          );
        })}
        {current.map((pair, k) => (
          <path key={k} d={chordD(pair)} className="tile-editor-chord" fill="none" strokeWidth={sw * 1.8} strokeLinecap="round" />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={sw * 1.6} className={`tile-editor-dot${info.odd ? ' is-odd' : ''}`} />
        ))}
        {points.map((p, i) => (
          <circle key={`h${i}`} cx={p.x} cy={p.y} r={grab} fill="transparent" className="tile-editor-hit" data-point={i} />
        ))}
        {a && b && (
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeWidth={sw * 1.4} strokeLinecap="round" strokeDasharray={snap === null ? `${sw * 2} ${sw * 1.5}` : undefined} />
        )}
        {a && <circle cx={a.x} cy={a.y} r={sw * 3} fill="none" stroke="var(--accent)" strokeWidth={sw * 0.9} />}
        {snap !== null && <circle cx={points[snap].x} cy={points[snap].y} r={sw * 3} fill="var(--accent)" fillOpacity={0.25} stroke="var(--accent)" strokeWidth={sw * 0.9} />}
      </svg>
      <EdgeClassLegend
        family={family}
        selected={selected}
        only={tileClasses}
        onToggle={toggle}
        strands={strands}
        onStrands={onStrands}
        maxStrands={MAX_STRANDS}
        className="tile-editor-classes"
      />
      {options.length > 1 && (
        <div className="tile-editor-gallery">
          <button type="button" className="link-button" aria-expanded={gallery} onClick={() => setGallery((g) => !g)} data-testid="tile-editor-gallery-toggle">
            {gallery ? 'Hide' : 'Show'} all {options.length > GALLERY_MAX ? `(first ${GALLERY_MAX} of ${options.length})` : options.length} pairings
          </button>
          {gallery && (
            <ul data-testid="tile-editor-gallery">
              {options.slice(0, GALLERY_MAX).map((k, i) => {
                const m = matchingAt(points.length, k) ?? [];
                return (
                  <li key={k}>
                    <button type="button" aria-pressed={k === index} aria-label={`${type} pairing ${i + 1}`} onClick={() => onSetIndex(k)}>
                      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
                        <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} className="tile-editor-body" />
                        {m.map((pair, j) => (
                          <path key={j} d={chordD(pair)} className="tile-editor-chord" fill="none" strokeWidth={sw * 2.4} strokeLinecap="round" />
                        ))}
                      </svg>
                      <span>{i + 1}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <p className="tile-editor-hint" data-testid="tile-editor-hint">
        {message ??
          (from !== null
            ? 'Drag or tap to the point to pair it with.'
            : info.odd
              ? 'An odd number of points: tap an edge to turn its class on or off and even them up.'
              : points.length < 3
                ? 'Tap an edge to turn its class on or off.'
                : 'Tap a point to draw from it, or an edge to turn its class on or off. ← → change tile, ↑ ↓ change pairing.')}
      </p>
    </div>
  );
}

export default TileEditor;
