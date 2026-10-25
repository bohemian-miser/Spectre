/**
 * Pieces the Centre map's two views share: pairing thumbnails and the
 * magnifier, the box select, and the selection panel (patterns, overlay,
 * tiles).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_EXPLORER_STATE,
  comboToMatchingIndices,
  encodeExplorerState,
  leafOrder,
  leafPts,
  selectionPatterns,
  selectionTileChords,
  type SelectionPattern,
  type TileTypeId,
  type TileFamilyId,
} from '../../core';
import { PanZoom } from '../../components/PanZoom';
import type { FaultLinesClient } from '../../workers/faultLinesClient';

export const THUMB = 240;

const RULE_HUES = [210, 20, 130, 280, 45, 330, 170, 0, 90, 250];
export const ruleColour = (i: number): string => `hsl(${RULE_HUES[i % RULE_HUES.length]} 70% 52%)`;
/** The magnified view's render size, in pixels. */
const BIG = 900;

export interface Item {
  readonly rule: string;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly ruleIndex: number;
}

export function explorerHref(family: TileFamilyId, subset: readonly number[], combo: string, level: number): string {
  const q = encodeExplorerState({
    ...DEFAULT_EXPLORER_STATE,
    family,
    rootTile: 'Delta',
    level,
    subset,
    matching: comboToMatchingIndices(family, subset, combo),
  });
  return `${import.meta.env.BASE_URL}#/explorer?${q.toString()}`;
}

export function Thumb(props: {
  client: FaultLinesClient;
  family: TileFamilyId;
  level: number;
  item: Item;
  dark: boolean;
  view: 'strands' | 'centres';
  caption: string;
  onPick?: () => void;
  size?: number;
}): JSX.Element {
  const { client, family, level, item, dark, view, caption, onPick, size = THUMB } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    client
      .thumb({ family, level, subset: item.subset, combo: item.combo, size, dark, view }, abort.signal)
      .then((rgba) => {
        const ctx = abort.signal.aborted ? null : canvas.current?.getContext('2d');
        if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), size, size), 0, 0);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [client, family, level, item, dark, view, size]);
  const img = <canvas ref={canvas} width={size} height={size} aria-label={caption} />;
  return (
    <figure className="centremap-thumb">
      {onPick ? (
        <button type="button" onClick={onPick} title={caption}>
          {img}
        </button>
      ) : (
        img
      )}
      <figcaption className="mono">{caption}</figcaption>
    </figure>
  );
}

/**
 * A pairing magnified in a modal, stepping through the selected pairing and
 * its closest ones (‹ › or ← →), switching strands and centres (or V), and
 * closing on Esc or a click outside.
 */
export function Magnifier(props: {
  client: FaultLinesClient;
  family: TileFamilyId;
  level: number;
  dark: boolean;
  list: readonly number[];
  at: number;
  view: 'strands' | 'centres';
  item: (i: number) => Item;
  label: (i: number) => string;
  note: (i: number) => string;
  href: (i: number) => string;
  onMove: (at: number, view: 'strands' | 'centres') => void;
  onSelect: (i: number) => void;
  onClose: () => void;
}): JSX.Element {
  const { client, family, level, dark, list, at, view, item, label, note, href, onMove, onSelect, onClose } = props;
  const i = list[at];
  const step = (d: number) => onMove((at + d + list.length) % list.length, view);
  const flip = () => onMove(at, view === 'strands' ? 'centres' : 'strands');
  const keys = useRef({ step, flip, onClose });
  keys.current = { step, flip, onClose };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') keys.current.onClose();
      else if (e.key === 'ArrowLeft') keys.current.step(-1);
      else if (e.key === 'ArrowRight') keys.current.step(1);
      else if (e.key === 'v' || e.key === 'V') keys.current.flip();
      else return;
      e.preventDefault();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);
  // Portalled to the body, so no ancestor's stacking (the sticky site header) sits over it.
  return createPortal(
    <div className="centremap-modal" role="dialog" aria-modal="true" aria-label={`${label(i)}, magnified`} data-testid="centremap-magnifier" onClick={onClose}>
      <div className="centremap-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="centremap-modal-head">
          <button type="button" onClick={() => step(-1)} aria-label="Previous pairing">
            ‹
          </button>
          <span className="mono" data-testid="centremap-magnifier-label">
            {label(i)}
          </span>
          <button type="button" onClick={() => step(1)} aria-label="Next pairing">
            ›
          </button>
          <span className="muted" data-testid="centremap-magnifier-position">
            {at + 1} / {list.length} · {note(i)}
          </span>
          <span className="centremap-modal-views" role="group" aria-label="Show">
            {(['strands', 'centres'] as const).map((v) => (
              <button key={v} type="button" className={v === view ? 'is-on' : undefined} aria-pressed={v === view} onClick={() => onMove(at, v)}>
                {v}
              </button>
            ))}
          </span>
          <button type="button" className="centremap-close" onClick={onClose} aria-label="Close magnifier">
            ×
          </button>
        </div>
        <div className="centremap-modal-stage">
          <Thumb client={client} family={family} level={level} item={item(i)} dark={dark} view={view} caption={`${label(i)} · ${view}`} size={BIG} />
        </div>
        <div className="centremap-modal-foot">
          <span className="muted">← → step · V switches strands and centres · Esc closes</span>
          {at > 0 && (
            <button type="button" onClick={() => onSelect(i)}>
              Select this pairing
            </button>
          )}
          <a href={href(i)}>Open in the Explorer ↗</a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Drag a box over a chart. Covers the chart while selecting (so the drag isn't
 * a pan) and reports the box in the overlay's own pixels and in client
 * pixels, corners ordered.
 */
export function BoxSelect(props: {
  testid: string;
  onBox: (b: { x0: number; y0: number; x1: number; y1: number; cx0: number; cy0: number; cx1: number; cy1: number }) => void;
}): JSX.Element {
  const { testid, onBox } = props;
  const host = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const local = (e: React.PointerEvent) => {
    const r = host.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  return (
    <div
      ref={host}
      className="centremap-box"
      data-panzoom-ignore=""
      data-testid={testid}
      onPointerDown={(e) => {
        const p = local(e);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        const p = local(e);
        setDrag({ ...drag, x1: p.x, y1: p.y });
      }}
      onPointerUp={() => {
        if (!drag) return;
        setDrag(null);
        const r = host.current!.getBoundingClientRect();
        const x0 = Math.min(drag.x0, drag.x1);
        const x1 = Math.max(drag.x0, drag.x1);
        const y0 = Math.min(drag.y0, drag.y1);
        const y1 = Math.max(drag.y0, drag.y1);
        if (x1 - x0 < 3 && y1 - y0 < 3) return;
        onBox({ x0, y0, x1, y1, cx0: x0 + r.left, cy0: y0 + r.top, cx1: x1 + r.left, cy1: y1 + r.top });
      }}
    >
      {drag && (
        <div
          className="centremap-box-rect"
          style={{
            left: Math.min(drag.x0, drag.x1),
            top: Math.min(drag.y0, drag.y1),
            width: Math.abs(drag.x1 - drag.x0),
            height: Math.abs(drag.y1 - drag.y0),
          }}
        />
      )}
    </div>
  );
}

/**
 * The pairings picked out by a box: per rule, one combination string with '?'
 * where they differ (hover a digit for the values it takes), all their strands
 * overlaid on the patch, and every tile with all the paths they draw on it.
 */
export function SelectionPanel(props: {
  family: TileFamilyId;
  level: number;
  items: readonly Item[];
  client: FaultLinesClient;
  dark: boolean;
  onClear: () => void;
  /** Told which of `items` the board shows (-1: all overlaid), so the charts can mark it. */
  onShow?: (at: number) => void;
  /** The whole selection, when `items` is only a sample of it: its patterns and size. */
  whole?: { readonly patterns: readonly SelectionPattern[]; readonly count: number };
}): JSX.Element {
  const { family, level, items, client, dark, onClear, onShow, whole } = props;
  const sampled = useMemo(() => selectionPatterns(family, items), [family, items]);
  const patterns = whole?.patterns ?? sampled;
  const [hoverDigit, setHoverDigit] = useState<{ rule: string; position: number } | null>(null);
  /** What the patch shows: -1 for everything overlaid, else one selected pairing. */
  const [at, setAt] = useState(-1);
  useEffect(() => setAt(-1), [items]);
  const show = useRef(onShow);
  show.current = onShow;
  useEffect(() => show.current?.(at), [at]);
  // ← → step through: all overlaid, then each pairing, and round again.
  const step = useRef<(d: number) => void>(() => {});
  step.current = (d: number) => setAt((a) => ((a + 1 + d + items.length + 1) % (items.length + 1)) - 1);
  const clear = useRef(onClear);
  clear.current = onClear;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, select, textarea, [contenteditable="true"], .join-picker')) return;
      if (globalThis.document?.querySelector('.centremap-modal')) return; // the magnifier has the keys
      e.preventDefault();
      // Esc clears the selection.
      if (e.key === 'Escape') clear.current();
      else step.current(e.key === 'ArrowLeft' ? -1 : 1);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);
  // The tiles follow the board: every chord while all are overlaid, one pairing's while flicking.
  const onlyAt = useMemo(() => (at >= 0 && items[at] ? [items[at]] : items), [at, items]);
  const spread = hoverDigit ? patterns.find((p) => p.rule === hoverDigit.rule)?.spread[hoverDigit.position] : undefined;
  const types = leafOrder(family);
  return (
    <section className="centremap-selected" aria-labelledby="centremap-picked-h" data-testid="centremap-picked">
      <h2 id="centremap-picked-h">
        {(whole?.count ?? items.length).toLocaleString('en-US')} pairing{(whole?.count ?? items.length) === 1 ? '' : 's'} selected
        {whole && whole.count > items.length && <span className="muted"> · the board and tiles show a sample of {items.length}</span>}
        <button type="button" className="centremap-close" onClick={onClear} aria-label="Clear selection" title="Clear selection (Esc)">
          ×
        </button>
      </h2>
      <ul className="centremap-patterns" data-testid="centremap-patterns">
        {patterns.map((p) => (
          <li key={p.rule}>
            <span className="mono centremap-pattern-rule">{p.rule}</span>
            <span className="mono centremap-pattern" onMouseLeave={() => setHoverDigit(null)}>
              {[...p.pattern].map((ch, i) => (
                <span
                  key={i}
                  className={ch === '?' ? 'is-wild' : undefined}
                  data-position={i}
                  onMouseEnter={() => setHoverDigit({ rule: p.rule, position: i })}
                  title={`${types[i]}: ${p.spread[i].values.map((v) => `${v.digit} ×${v.count}`).join(', ')}`}
                >
                  {ch}
                </span>
              ))}
            </span>
            <span className="muted"> ×{p.count}</span>
          </li>
        ))}
      </ul>
      <p className="muted centremap-note" data-testid="centremap-spread">
        {spread
          ? `${hoverDigit!.rule}, digit ${spread.position + 1} (${spread.type}): ${spread.values.map((v) => `${v.digit} ×${v.count}`).join(' · ')}`
          : 'Hover a digit to see the values it takes across the selection; ? marks the ones that vary.'}
      </p>
      <div className="centremap-overlays">
        <figure className="centremap-overlay">
          <div className="centremap-overlay-head">
            <span className="centremap-modal-views" role="group" aria-label="Show">
              <button type="button" className={at < 0 ? 'is-on' : undefined} aria-pressed={at < 0} onClick={() => setAt(-1)} data-testid="centremap-overlay-all">
                all overlaid
              </button>
              <button type="button" className={at >= 0 ? 'is-on' : undefined} aria-pressed={at >= 0} onClick={() => setAt(at >= 0 ? at : 0)} data-testid="centremap-overlay-one">
                one at a time
              </button>
            </span>
            <button type="button" onClick={() => step.current(-1)} aria-label="Previous pattern">
              ‹
            </button>
            <span className="mono" data-testid="centremap-overlay-label">
              {at < 0 ? `all ${items.length}` : `${at + 1} / ${items.length} · ${items[at].rule} · ${items[at].combo}`}
            </span>
            <button type="button" onClick={() => step.current(1)} aria-label="Next pattern">
              ›
            </button>
            {at >= 0 || items.length === 1 ? (
              <a href={explorerHref(family, items[Math.max(0, at)].subset, items[Math.max(0, at)].combo, Math.min(level, 5))} data-testid="centremap-overlay-explorer">
                Open in the Explorer ↗
              </a>
            ) : (
              <span className="muted">step to one to open it in the Explorer</span>
            )}
          </div>
          <OverlayBoard client={client} family={family} level={level} items={items} dark={dark} at={at} />
          <figcaption className="muted">
            {at < 0
              ? 'Every selected pairing’s strands on the patch: faint blue where a few pass, yellow where all do.'
              : 'One selected pairing, its circuits coloured by size like the thumbnails.'}{' '}
            ← → flick through all of them and each one; wheel or pinch to zoom, drag to pan.
          </figcaption>
        </figure>
        <div className="centremap-tiles" data-testid="centremap-tiles">
          {types.map((t) => (
            <TileChords key={t} family={family} type={t} items={at >= 0 ? onlyAt : items} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** The overlay's render size: big enough to zoom into a level-5 patch. */
const OVERLAY = 1600;
const OVERLAY_BOX = { min: { x: 0, y: 0 }, max: { x: OVERLAY, y: OVERLAY } };

/**
 * The selection on the patch: all of it overlaid (`at` = -1), or one pairing
 * (`at` = its index), drawn in the frame that fits every selected rule so
 * flicking between them keeps the patch still.
 */
export function OverlayBoard(props: { client: FaultLinesClient; family: TileFamilyId; level: number; items: readonly Item[]; dark: boolean; at: number }): JSX.Element {
  const { client, family, level, items, dark, at } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const frameSubsets = useMemo(() => [...new Map(items.map((it) => [it.rule, it.subset])).values()], [items]);
  useEffect(() => {
    const abort = new AbortController();
    const one = at >= 0 ? items[at] : null;
    const first = one ?? items[0];
    client
      .thumb(
        {
          family,
          level,
          subset: first.subset,
          combo: first.combo,
          size: OVERLAY,
          dark,
          view: 'strands',
          frameSubsets,
          vivid: true,
          ...(one ? {} : { overlay: items.map((it) => ({ subset: it.subset, combo: it.combo })) }),
        },
        abort.signal,
      )
      .then((rgba) => {
        const ctx = abort.signal.aborted ? null : canvas.current?.getContext('2d');
        if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), OVERLAY, OVERLAY), 0, 0);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [client, family, level, items, dark, at, frameSubsets]);
  return (
    <PanZoom className="centremap-zoom centremap-overlay-zoom" fitBounds={OVERLAY_BOX} padding={0} maxScale={8} showControls ariaLabel="Overlay: wheel or pinch to zoom, drag to pan">
      {(api) => (
        <canvas
          ref={canvas}
          width={OVERLAY}
          height={OVERLAY}
          data-testid="centremap-overlay"
          aria-label={at >= 0 ? `${items[at].rule} · ${items[at].combo}` : 'All selected pairings overlaid'}
          style={{
            width: OVERLAY,
            height: OVERLAY,
            transform: `translate(${api.camera.x}px, ${api.camera.y}px) scale(${api.camera.scale})`,
          }}
        />
      )}
    </PanZoom>
  );
}

/** One tile with every chord the selection draws on it: thicker and stronger the more pairings draw it. */
export function TileChords(props: { family: TileFamilyId; type: TileTypeId; items: readonly Item[] }): JSX.Element {
  const { family, type, items } = props;
  const outline = leafPts(family, type);
  const chords = useMemo(() => selectionTileChords(family, items, type), [family, items, type]);
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = span * 0.08;
  const sw = span / 70;
  const n = items.length;
  return (
    <figure className="centremap-tile">
      <svg viewBox={`${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`}>
        <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} className="tile-editor-body" />
        {chords.map((c, i) => (
          <line
            key={i}
            x1={c.a.x}
            y1={c.a.y}
            x2={c.b.x}
            y2={c.b.y}
            stroke="var(--accent)"
            strokeWidth={sw * (1 + 3 * (c.count / n))}
            strokeOpacity={0.25 + 0.75 * (c.count / n)}
            strokeLinecap="round"
          >
            <title>{`${c.count} of ${n}`}</title>
          </line>
        ))}
      </svg>
      <figcaption>
        {type} <span className="muted">· {chords.length} path{chords.length === 1 ? '' : 's'}</span>
      </figcaption>
    </figure>
  );
}
