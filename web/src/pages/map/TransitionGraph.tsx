/**
 * `TransitionGraph` — which tile type a chase moves into, from which.
 *
 * The ticker names the tiles a strand crosses, in order. That says what
 * happened but not what the walk TENDS to do: a strand crossing
 * `Phi Gamma2 Gamma1 Xi Phi Gamma2 Gamma1` is going round something, and the
 * ticker makes you spot that by eye, one name at a time.
 *
 * So this draws the whole chase at once: every leaf type on a circle in its
 * own colour, and a directed edge for every ordered pair — all n² of them,
 * including a tile type following itself, which really happens. Weight is the
 * count, so the paths the substitution actually favours are the thick ones and
 * the rest stay faint rather than disappearing.
 *
 * Direction is the point, so `Phi → Gamma1` must be readable apart from
 * `Gamma1 → Phi`. Each edge bows to ONE side of the straight line between its
 * endpoints, chosen from the direction of travel: reversing the pair flips the
 * perpendicular, so the two directions bow to opposite sides and sit as a
 * lens rather than on top of each other. An arrowhead at the target end, in
 * the source type's colour, says which way round each one is.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LEAF_ORDER } from '../../core';

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
   * The edge under the pointer, reported as it changes — what lets the view
   * behind pick the same transition out on the tiling.
   */
  onHoverPair?(pair: { from: number; to: number } | null): void;
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

export function TransitionGraph(props: TransitionGraphProps): JSX.Element | null {
  const { transitions, colors, names = LEAF_ORDER, className } = props;
  const { onHoverPair, highlightOnScreen, onToggleOnScreen, highlightInPath, onToggleInPath } =
    props;
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<{ from: number; to: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Report the hovered edge outward, once per change rather than per pointer
  // move — the listener's work is per-change, and a mousemove stream is not.
  const hoverOut = useRef(onHoverPair);
  hoverOut.current = onHoverPair;
  useEffect(() => {
    hoverOut.current?.(hover);
  }, [hover?.from, hover?.to, hover]);
  useEffect(() => () => hoverOut.current?.(null), []);

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
   * Pick the edge whose curve passes nearest the pointer. Only edges with a
   * count are candidates: an unused pair has nothing to report, and letting
   * the other 90-odd compete would mostly hand hover to a faint line the
   * reader was not aiming at.
   */
  const onMove = useCallback(
    (ev: React.MouseEvent<SVGSVGElement>): void => {
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // The viewBox is square and the element keeps its aspect, so one scale.
      const px = ((ev.clientX - r.left) / r.width) * SIZE;
      const py = ((ev.clientY - r.top) / r.height) * SIZE;

      let best: { from: number; to: number } | null = null;
      let bestD2 = HOVER_REACH * HOVER_REACH;
      for (const e of edges) {
        if (transitions[e.from * n + e.to] === 0) continue;
        for (const s of e.samples) {
          const dx = s.x - px;
          const dy = s.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            best = { from: e.from, to: e.to };
          }
        }
      }
      setHover((prev) =>
        prev?.from === best?.from && prev?.to === best?.to ? prev : best,
      );
    },
    [edges, transitions, n],
  );

  if (!valid) return null;

  // Heavy edges last so they are not buried under the faint ones.
  const order = [...edges].sort(
    (p, q) => transitions[p.from * n + p.to] - transitions[q.from * n + q.to],
  );
  const hovered = hover ? transitions[hover.from * n + hover.to] : 0;

  return (
    <div
      className={['trace-graph', expanded ? 'is-big' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-testid="transition-graph"
      data-expanded={expanded ? '1' : '0'}
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
          {expanded ? '\u2013' : '\u2b1c'}
        </button>
        {onToggleOnScreen ? (
          <label title="Light every place this transition happens on screen">
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
          <label title="Light only the crossings the traced strand made">
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
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
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
              <path d="M 0 0.6 L 8 4 L 0 7.4 z" fill={colors[i] ?? '#c8c8c8'} />
            </marker>
          ))}
        </defs>

        {order.map((e) => {
          const count = transitions[e.from * n + e.to];
          const isHover = hover?.from === e.from && hover?.to === e.to;
          const share = max > 0 ? count / max : 0;
          // sqrt so one dominant pair does not flatten every other edge.
          const width = count === 0 ? 0.4 : 0.7 + 2.3 * Math.sqrt(share);
          const base = count === 0 ? 0.07 : 0.3 + 0.55 * share;
          // Hovering one edge dims the rest, which is the only way to follow a
          // single curve through a hundred of them.
          const opacity = isHover ? 1 : hover ? base * 0.25 : base;
          const color = colors[e.from] ?? '#c8c8c8';
          return (
            <g
              key={`${e.from}-${e.to}`}
              className="tg-edge"
              data-from={names[e.from]}
              data-to={names[e.to]}
              data-count={count}
            >
              <title>{`${names[e.from]} → ${names[e.to]}: ${count}`}</title>
              <path
                className="tg-line"
                d={e.d}
                stroke={color}
                strokeWidth={isHover ? width + 1.4 : width}
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
          const dim = hover !== null && hover.from !== i && hover.to !== i;
          return (
            <g key={name} className="tg-node" opacity={dim ? 0.35 : 1}>
              <circle cx={dot.x} cy={dot.y} r={2.6} fill={colors[i] ?? '#c8c8c8'} />
              <text
                x={p.x}
                y={p.y}
                fill={colors[i] ?? '#c8c8c8'}
                textAnchor={right ? 'start' : 'end'}
                dominantBaseline="middle"
                data-tile={name}
              >
                {name}
              </text>
            </g>
          );
        })}

        {hover ? (
          <text
            className="tg-readout"
            x={C}
            y={C}
            textAnchor="middle"
            dominantBaseline="middle"
            data-testid="transition-readout"
          >
            {`${names[hover.from]} → ${names[hover.to]}: ${hovered}`}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

export default TransitionGraph;
