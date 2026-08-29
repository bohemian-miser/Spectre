/**
 * `TransitionGraph` — which tile type a chase moves into, from which.
 *
 * The ticker names the tiles a strand crosses, in order. That says what
 * happened but not what the walk TENDS to do: a strand crossing
 * `Phi Gamma2 Gamma1 Xi Phi Gamma2 Gamma1` is going round something, and the
 * ticker makes you spot that by eye, one name at a time.
 *
 * So this draws the whole chase at once, two ways:
 *
 *  - **the circle** — every leaf type on a ring in its own colour, and a
 *    directed edge for every ordered pair (all n², including a type following
 *    itself, which really happens). Weight is the count, so the paths the
 *    substitution favours are the thick ones and the rest stay faint rather
 *    than disappearing. Direction is the point, so `Phi → Gamma1` must be
 *    readable apart from `Gamma1 → Phi`: each edge bows to ONE side of the
 *    straight line between its endpoints, chosen from the direction of travel,
 *    so reversing the pair flips the perpendicular and the two sit as a lens
 *    rather than on top of each other.
 *  - **the ranking** — the same counts as a list, longest runs included: not
 *    just pairs but any length of run, so "how often does this five-tile
 *    section come round?" is a question you can ask and then click.
 *
 * Anything picked out here — an edge, a type, a run — is reported outward so
 * the tiling behind can light the same thing up. Hovering previews; clicking
 * pins, and a click on the background lets go again.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LEAF_ORDER } from '../../core';
import { selectionKey, type Chain, type GraphSelection } from './transitions';

export interface TransitionGraphProps {
  /**
   * Directed counts, row-major `from * n + to`, where n² is the array's
   * length — the walk's own `transitionCounts`.
   */
  readonly transitions: readonly number[];
  /** CSS colour per leaf type, in `LEAF_ORDER` — the tiles' own palette. */
  readonly colors: readonly string[];
  /** Type names, defaulting to `LEAF_ORDER`. */
  readonly names?: readonly string[];
  /**
   * Runs of consecutive types the path made, commonest first — what the ranked
   * mode lists. Counted by the view that owns the walk, at {@link chainLength}.
   */
  readonly chains?: readonly Chain[];
  /** The run length `chains` was counted at; 0 = nothing counted yet. */
  readonly chainLength?: number;
  /** Ask for a different run length — null when nothing should be counted. */
  onChainLength?(length: number | null): void;
  /**
   * What is picked out, reported as it changes — what lets the view behind
   * find the same thing on the tiling. Hover previews over a pinned choice.
   */
  onSelect?(selection: GraphSelection | null): void;
  /** Light every place that transition can happen in the current view. */
  readonly highlightOnScreen?: boolean;
  onToggleOnScreen?(): void;
  /** Light only the crossings the traced strand made. */
  readonly highlightInPath?: boolean;
  onToggleInPath?(): void;
  readonly className?: string;
}

/** Square viewBox; the panel is sized in CSS. */
const SIZE = 240;
const C = SIZE / 2;
/**
 * Radius the edges start and end on. Kept well inside the viewBox so the names
 * hanging outside the ring still fit: the widest ("Gamma2") is about 40 units
 * at the label font size, and 120 − LABEL_R has to cover it.
 */
const R = 52;
/** Radius the names sit at — outside the ring, so no edge crosses a label. */
const LABEL_R = 60;
/** Gap between an edge's end and the node, so arrowheads are not buried. */
const NODE_GAP = 5;
const HEAD_GAP = 7;
/** How far an edge bows off the straight line, as a fraction of its length. */
const BEND = 0.22;

/** Longest run the ranked mode will count. */
export const MAX_CHAIN = 30;
/** Rows drawn before the reader asks for more, and the step for asking. */
const ROW_PAGE = 200;

/**
 * The letter each leaf is named after. A run of thirty tiles has to fit on a
 * line to be read at all, and `Λ` is what "Lambda" means anyway.
 */
const GLYPHS: Readonly<Record<string, string>> = {
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Gamma1: 'Γ₁',
  Gamma2: 'Γ₂',
};
const glyphFor = (name: string | undefined): string =>
  (name && GLYPHS[name]) || (name ?? '?').slice(0, 2);

interface Pt {
  readonly x: number;
  readonly y: number;
}

interface Edge {
  readonly from: number;
  readonly to: number;
  /** The drawn curve. */
  readonly d: string;
  /** Where a hover label goes — the curve's own midpoint. */
  readonly mid: Pt;
  /**
   * Points along the curve, for pointer hit-testing. A hundred curves crossing
   * inside a 200px box cannot each own a fat invisible hit shape — they cover
   * each other, and the edge you aim at is usually not the one on top. Nearest
   * curve to the pointer has no such ambiguity.
   */
  readonly samples: readonly Pt[];
}

/** Points along a quadratic, `t` in [0, 1]. */
function sampleQuadratic(a: Pt, c: Pt, b: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    });
  }
  return out;
}

/** Points along a cubic, `t` in [0, 1]. */
function sampleCubic(a: Pt, c0: Pt, c1: Pt, b: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * a.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * b.y,
    });
  }
  return out;
}

function nodeAt(i: number, n: number, radius: number): Pt {
  // Start at the top and go clockwise, so the order reads like a clock face.
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: C + Math.cos(a) * radius, y: C + Math.sin(a) * radius };
}

/** Move from `p` towards `q` by `dist`. */
function toward(p: Pt, q: Pt, dist: number): Pt {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const L = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / L) * dist, y: p.y + (dy / L) * dist };
}

/**
 * One directed edge's geometry. The control point is offset along the
 * perpendicular of `from → to`; reversing the pair reverses that vector, which
 * is what puts the two directions on opposite sides of the same chord.
 */
function edgeGeometry(
  from: number,
  to: number,
  n: number,
): { d: string; mid: Pt; samples: readonly Pt[] } {
  const a = nodeAt(from, n, R);
  const b = nodeAt(to, n, R);

  if (from === to) {
    // A type following itself: a small loop hung outside the ring, swept the
    // same way round as the edges, so it reads as directed too.
    const out = nodeAt(from, n, R - 24);
    const side = { x: -(b.y - C), y: b.x - C };
    const L = Math.hypot(side.x, side.y) || 1;
    const off = { x: (side.x / L) * 11, y: (side.y / L) * 11 };
    const p0 = { x: a.x - off.x, y: a.y - off.y };
    const p1 = { x: a.x + off.x, y: a.y + off.y };
    const c0 = { x: out.x - off.x * 1.6, y: out.y - off.y * 1.6 };
    const c1 = { x: out.x + off.x * 1.6, y: out.y + off.y * 1.6 };
    const start = toward(p0, c0, NODE_GAP);
    const end = toward(p1, c1, HEAD_GAP);
    return {
      d: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${c0.x.toFixed(2)} ${c0.y.toFixed(2)} ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
      mid: { x: out.x, y: out.y },
      samples: sampleCubic(start, c0, c1, end, 10),
    };
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  // Rotate the direction of travel +90°. This is the whole asymmetry: swap
  // `from` and `to` and this vector points the other way.
  const perp = { x: -dy / L, y: dx / L };
  const bend = L * BEND;
  const ctrl = { x: (a.x + b.x) / 2 + perp.x * bend, y: (a.y + b.y) / 2 + perp.y * bend };

  const start = toward(a, ctrl, NODE_GAP);
  const end = toward(b, ctrl, HEAD_GAP);
  // A quadratic at t = 0.5.
  const mid = {
    x: (start.x + 2 * ctrl.x + end.x) / 4,
    y: (start.y + 2 * ctrl.y + end.y) / 4,
  };
  return {
    d: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${ctrl.x.toFixed(2)} ${ctrl.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    mid,
    samples: sampleQuadratic(start, ctrl, end, 12),
  };
}

/** How near the pointer must come to a curve, in viewBox units, to pick it. */
const HOVER_REACH = 16;
/** How near it must come to a type's dot on the ring to pick that type. */
const DOT_REACH = 6;
/**
 * A name's box, in viewBox units: the anchor, and the text running out from it
 * away from the ring. Aiming at the WORD is how a reader picks a type, and the
 * word is some 30 units wide — hit-testing its anchor point alone misses the
 * end of "Gamma2" by more than the reach.
 *
 * The font is the panel's monospace at 9 units, so a character is about 5.4
 * wide; the padding is what makes a near miss still count.
 */
const CHAR_W = 5.4;
const LABEL_PAD = 4;
function inLabel(name: string, anchor: Pt, right: boolean, px: number, py: number): boolean {
  const w = name.length * CHAR_W;
  const x0 = (right ? anchor.x : anchor.x - w) - LABEL_PAD;
  const x1 = (right ? anchor.x + w : anchor.x) + LABEL_PAD;
  return px >= x0 && px <= x1 && Math.abs(py - anchor.y) <= 6 + LABEL_PAD;
}

export function TransitionGraph(props: TransitionGraphProps): JSX.Element | null {
  const { transitions, colors, names = LEAF_ORDER, className } = props;
  const { chains = [], chainLength = 0, onChainLength, onSelect } = props;
  const { highlightOnScreen, onToggleOnScreen, highlightInPath, onToggleInPath } = props;
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<GraphSelection | null>(null);
  /** The click-pinned choice: it outlives the pointer until another, or a dismiss. */
  const [pinned, setPinned] = useState<GraphSelection | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [ranked, setRanked] = useState(false);
  const [length, setLength] = useState(2);
  /** Rarest first — how you find the run the chase almost never makes. */
  const [ascending, setAscending] = useState(false);
  const [rowLimit, setRowLimit] = useState(ROW_PAGE);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Hover previews over the pin, so moving the pointer away shows the pinned
  // choice again rather than nothing.
  const active = hover ?? pinned;
  const activeKey = selectionKey(active);

  // Report outward once per change rather than per pointer move — the
  // listener's work is per-change, and a mousemove stream is not.
  const selectOut = useRef(onSelect);
  selectOut.current = onSelect;
  useEffect(() => {
    selectOut.current?.(active);
    // `activeKey` is the identity of `active`; re-reporting an equal selection
    // would make the view behind rebuild its ink for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);
  useEffect(() => () => selectOut.current?.(null), []);

  // Ask for run counts only while the ranked list is actually open.
  const lengthOut = useRef(onChainLength);
  lengthOut.current = onChainLength;
  useEffect(() => {
    lengthOut.current?.(ranked ? length : null);
  }, [ranked, length]);
  useEffect(() => () => lengthOut.current?.(null), []);

  const n = Math.round(Math.sqrt(transitions.length));
  const valid = n > 1 && n * n === transitions.length;

  // Geometry depends only on how many types there are, so a chase that is
  // updating its counts many times a second does not rebuild any of it.
  const edges = useMemo<readonly Edge[]>(() => {
    if (!valid) return [];
    const out: Edge[] = [];
    for (let from = 0; from < n; from++) {
      for (let to = 0; to < n; to++) {
        out.push({ from, to, ...edgeGeometry(from, to, n) });
      }
    }
    return out;
  }, [n, valid]);

  const max = useMemo(() => {
    let m = 0;
    for (const c of transitions) if (c > m) m = c;
    return m;
  }, [transitions]);

  /**
   * What is under the pointer, in viewBox coordinates.
   *
   * Names win over edges: they sit outside the ring where no edge runs, and a
   * reader aiming at "Lambda" means the type, not whichever faint curve
   * happens to pass nearby. Only edges with a count are candidates — an unused
   * pair has nothing to report, and letting the other ninety compete would
   * mostly hand the pointer to a faint line nobody was aiming at.
   */
  const resolveAt = useCallback(
    (px: number, py: number): GraphSelection | null => {
      for (let i = 0; i < n; i++) {
        const anchor = nodeAt(i, n, LABEL_R);
        const dot = nodeAt(i, n, R);
        if (
          inLabel(names[i] ?? '', anchor, anchor.x >= C - 0.5, px, py) ||
          Math.hypot(dot.x - px, dot.y - py) <= DOT_REACH
        ) {
          return { kind: 'type', type: i };
        }
      }
      let best: GraphSelection | null = null;
      let bestD2 = HOVER_REACH * HOVER_REACH;
      for (const e of edges) {
        if (transitions[e.from * n + e.to] === 0) continue;
        for (const s of e.samples) {
          const dx = s.x - px;
          const dy = s.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            best = { kind: 'pair', from: e.from, to: e.to };
          }
        }
      }
      return best;
    },
    [edges, transitions, n, names],
  );

  const toViewBox = useCallback((clientX: number, clientY: number): Pt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    // The viewBox is square and the element keeps its aspect, so one scale.
    return { x: ((clientX - r.left) / r.width) * SIZE, y: ((clientY - r.top) / r.height) * SIZE };
  }, []);

  const onMove = useCallback(
    (ev: React.MouseEvent<SVGSVGElement>): void => {
      const p = toViewBox(ev.clientX, ev.clientY);
      if (!p) return;
      const found = resolveAt(p.x, p.y);
      setHover((prev) => (selectionKey(prev) === selectionKey(found) ? prev : found));
    },
    [resolveAt, toViewBox],
  );

  /**
   * A click pins what is under it — and a click on the background lets go,
   * which is the way out of a pin without hunting for a button.
   */
  const pick = useCallback(
    (sel: GraphSelection | null): void => {
      setPinned((prev) => (selectionKey(prev) === selectionKey(sel) ? null : sel));
      // Picking something and seeing nothing happen is the whole trap here:
      // the path marks cost almost nothing, so an explicit choice turns them
      // on rather than quietly needing a checkbox first.
      if (sel && !highlightOnScreen && !highlightInPath) onToggleInPath?.();
    },
    [highlightOnScreen, highlightInPath, onToggleInPath],
  );

  const onSvgClick = useCallback(
    (ev: React.MouseEvent<SVGSVGElement>): void => {
      const p = toViewBox(ev.clientX, ev.clientY);
      if (!p) return;
      pick(resolveAt(p.x, p.y));
    },
    [pick, resolveAt, toViewBox],
  );

  // A different length or order is a different list; start it from the top.
  useEffect(() => {
    setRowLimit(ROW_PAGE);
  }, [length, ascending]);

  const rows = useMemo(() => {
    // `chains` arrives commonest first. Rarest first is the same list read
    // backwards, which is cheaper and keeps ties in the same order.
    const list = ascending ? [...chains].reverse() : chains;
    return list.slice(0, rowLimit);
  }, [chains, ascending, rowLimit]);

  if (!valid) return null;

  const nameOf = (i: number): string => names[i] ?? `#${i}`;
  const colorOf = (i: number): string => colors[i] ?? '#c8c8c8';
  const describe = (sel: GraphSelection): string => {
    if (sel.kind === 'pair') return `${nameOf(sel.from)} → ${nameOf(sel.to)}`;
    if (sel.kind === 'type') return nameOf(sel.type);
    return sel.types.map(nameOf).join(' ');
  };
  const countOf = (sel: GraphSelection): number | null => {
    if (sel.kind === 'pair') return transitions[sel.from * n + sel.to];
    if (sel.kind !== 'chain') return null;
    const key = sel.types.join(',');
    return chains.find((c) => c.types.join(',') === key)?.count ?? null;
  };

  /** Turn a run of type indices into coloured letters. */
  const sequence = (types: readonly number[], testid?: string): JSX.Element => (
    <span className="tg-seq" data-testid={testid}>
      {types.map((t, i) => (
        <span key={i} style={{ color: colorOf(t) }} title={nameOf(t)}>
          {glyphFor(names[t])}
        </span>
      ))}
    </span>
  );

  /** Which types this selection touches, for dimming everything else. */
  const touches = (i: number): boolean => {
    if (!active) return true;
    if (active.kind === 'pair') return active.from === i || active.to === i;
    if (active.kind === 'type') return active.type === i;
    return active.types.includes(i);
  };

  // Heavy edges last so they are not buried under the faint ones.
  const order = [...edges].sort(
    (p, q) => transitions[p.from * n + p.to] - transitions[q.from * n + q.to],
  );

  const distinct = chains.length;
  const counted = chainLength === length;

  return (
    <div
      className={[
        'trace-graph',
        expanded ? 'is-big' : '',
        ranked ? 'is-tall' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="transition-graph"
      data-expanded={expanded ? '1' : '0'}
      data-mode={ranked ? 'ranked' : 'graph'}
      // The panel sits INSIDE the map viewport, which takes a pointerdown to
      // start a pan or a trace and captures the pointer for it. Without this
      // a click on a control here is swallowed by that capture — and worse,
      // it would also drag the tiling or start tracing a strand underneath.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tg-controls">
        <button
          type="button"
          className="tg-expand"
          data-testid="transition-expand"
          aria-pressed={expanded}
          aria-label={expanded ? 'Shrink the transition graph' : 'Expand the transition graph'}
          title={expanded ? 'Shrink' : 'Expand'}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '–' : '⬜'}
        </button>
        <button
          type="button"
          className="tg-expand"
          data-testid="transition-mode"
          aria-pressed={ranked}
          aria-label={ranked ? 'Show the transition circle' : 'Rank the runs by how often'}
          title={ranked ? 'Circle' : 'Ranked runs'}
          onClick={() => setRanked((v) => !v)}
        >
          {ranked ? '◎' : '≡'}
        </button>
        {onToggleOnScreen ? (
          <label title="Light every place this happens on screen">
            <input
              type="checkbox"
              data-testid="highlight-on-screen"
              checked={highlightOnScreen ?? false}
              onChange={onToggleOnScreen}
            />
            <span>on screen</span>
          </label>
        ) : null}
        {onToggleInPath ? (
          <label title="Light only the places the traced strand went through">
            <input
              type="checkbox"
              data-testid="highlight-in-path"
              checked={highlightInPath ?? false}
              onChange={onToggleInPath}
            />
            <span>in path</span>
          </label>
        ) : null}
      </div>

      {pinned ? (
        <div className="tg-pinned" data-testid="transition-pinned">
          {sequence(
            pinned.kind === 'pair'
              ? [pinned.from, pinned.to]
              : pinned.kind === 'type'
                ? [pinned.type]
                : pinned.types,
          )}
          <span className="tg-pinned-name">{describe(pinned)}</span>
          {countOf(pinned) !== null ? (
            <span className="tg-pinned-count">×{countOf(pinned)}</span>
          ) : null}
          <button
            type="button"
            data-testid="transition-unpin"
            aria-label="Stop picking this out"
            title="Dismiss"
            onClick={() => setPinned(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {ranked ? (
        <div
          className="tg-ranked"
          // Clicking past the rows dismisses, the same as the graph's background.
          onClick={(e) => {
            if (e.target === e.currentTarget) setPinned(null);
          }}
        >
          <div className="tg-lengths" role="group" aria-label="Run length">
            {Array.from({ length: MAX_CHAIN }, (_, i) => i + 1).map((L) => (
              <button
                key={L}
                type="button"
                data-testid={`chain-length-${L}`}
                aria-pressed={L === length}
                className={L === length ? 'is-on' : ''}
                onClick={() => setLength(L)}
              >
                {L}
              </button>
            ))}
          </div>
          <div className="tg-rank-head">
            <button
              type="button"
              data-testid="chain-order"
              aria-pressed={ascending}
              onClick={() => setAscending((v) => !v)}
              title={ascending ? 'Showing the rarest first' : 'Showing the commonest first'}
            >
              {ascending ? 'rarest' : 'commonest'}
            </button>
            <span data-testid="chain-distinct">
              {counted
                ? `${distinct.toLocaleString('en-US')} distinct`
                : 'counting…'}
            </span>
          </div>
          <ol className="tg-rows" data-testid="chain-rows">
            {rows.map((c) => {
              const sel: GraphSelection =
                c.types.length === 1
                  ? { kind: 'type', type: c.types[0] }
                  : c.types.length === 2
                    ? { kind: 'pair', from: c.types[0], to: c.types[1] }
                    : { kind: 'chain', types: c.types };
              const key = c.types.join(',');
              const on = selectionKey(active) === selectionKey(sel);
              return (
                <li
                  key={key}
                  className={`tg-row${on ? ' is-on' : ''}`}
                  data-testid={`chain-row-${key}`}
                  data-count={c.count}
                  onMouseEnter={() => setHover(sel)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => pick(sel)}
                >
                  {sequence(c.types)}
                  <span className="tg-row-count">{c.count.toLocaleString('en-US')}</span>
                </li>
              );
            })}
          </ol>
          {chains.length > rows.length ? (
            <button
              type="button"
              className="tg-more"
              data-testid="chain-more"
              onClick={() => setRowLimit((v) => v + ROW_PAGE)}
            >
              {`show ${Math.min(ROW_PAGE, chains.length - rows.length)} more of ${distinct.toLocaleString('en-US')}`}
            </button>
          ) : null}
          {counted && distinct === 0 ? (
            <p className="tg-empty">Trace a strand to count its runs.</p>
          ) : null}
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={onSvgClick}
          role="img"
          aria-label="How often the chase stepped from each tile type into each other"
        >
          <defs>
            {names.slice(0, n).map((name, i) => (
              <marker
                key={name}
                id={`tg-${uid}-${i}`}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0.6 L 8 4 L 0 7.4 z" fill={colorOf(i)} />
              </marker>
            ))}
          </defs>

          {order.map((e) => {
            const count = transitions[e.from * n + e.to];
            const isOn =
              (active?.kind === 'pair' && active.from === e.from && active.to === e.to) ||
              (active?.kind === 'type' && (active.type === e.from || active.type === e.to));
            const share = max > 0 ? count / max : 0;
            // sqrt so one dominant pair does not flatten every other edge.
            const width = count === 0 ? 0.4 : 0.7 + 2.3 * Math.sqrt(share);
            const base = count === 0 ? 0.07 : 0.3 + 0.55 * share;
            // Picking one edge dims the rest, which is the only way to follow a
            // single curve through a hundred of them.
            const opacity = isOn ? 1 : active ? base * 0.25 : base;
            return (
              <g
                key={`${e.from}-${e.to}`}
                className={`tg-edge${isOn ? ' is-on' : ''}`}
                data-from={nameOf(e.from)}
                data-to={nameOf(e.to)}
                data-count={count}
              >
                <title>{`${nameOf(e.from)} → ${nameOf(e.to)}: ${count}`}</title>
                <path
                  className="tg-line"
                  d={e.d}
                  stroke={colorOf(e.from)}
                  strokeWidth={isOn ? width + 1.4 : width}
                  strokeOpacity={opacity}
                  markerEnd={`url(#tg-${uid}-${e.from})`}
                />
              </g>
            );
          })}

          {names.slice(0, n).map((name, i) => {
            const p = nodeAt(i, n, LABEL_R);
            const dot = nodeAt(i, n, R);
            // Right half reads outward to the right, left half to the left, so
            // nothing runs back over the ring.
            const right = p.x >= C - 0.5;
            const on = active?.kind === 'type' && active.type === i;
            return (
              <g
                key={name}
                className={`tg-node${on ? ' is-on' : ''}`}
                opacity={touches(i) ? 1 : 0.35}
              >
                <circle cx={dot.x} cy={dot.y} r={on ? 3.8 : 2.6} fill={colorOf(i)} />
                <text
                  x={p.x}
                  y={p.y}
                  fill={colorOf(i)}
                  textAnchor={right ? 'start' : 'end'}
                  dominantBaseline="middle"
                  fontWeight={on ? 700 : undefined}
                  data-tile={name}
                >
                  {name}
                </text>
              </g>
            );
          })}

          {active ? (
            <text
              className="tg-readout"
              x={C}
              y={C}
              textAnchor="middle"
              dominantBaseline="middle"
              data-testid="transition-readout"
            >
              {countOf(active) !== null
                ? `${describe(active)}: ${countOf(active)}`
                : describe(active)}
            </text>
          ) : null}
        </svg>
      )}
    </div>
  );
}

export default TransitionGraph;
