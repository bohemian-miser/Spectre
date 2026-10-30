/**
 * A supertile drawn from its children's route tables, glued at their shared
 * crossings: each child the strands run through filled in its type's
 * colour, and in it the child's routes that take part, each a straight line
 * between the crossings where the strand enters and leaves the child (a
 * pass, `viewer.ts`), coloured by the child's type and thicker for routes
 * passed more often.
 */
import { useMemo } from 'react';
import { leafOrder, type Pt } from '../../core';
import type { Box } from '../../lib/viewport';
import { Viewer, type Lines, type Mark, type ViewerApi } from './Viewer';
import { fixedSource, mapBox, type Geometry, type Pass } from './viewer';

const nf = (n: number) => n.toLocaleString('en-US');

/** Stroke colours for the types, one each, told apart on light and dark grounds. */
export const TYPE_STROKE: Record<string, string> = {
  Gamma: '#4e79a7', Delta: '#e15759', Theta: '#f28e2b', Lambda: '#76b7b2', Xi: '#59a14f',
  Pi: '#c9a227', Sigma: '#b07aa1', Phi: '#ff7f9e', Psi: '#9c755f',
};
const TYPES = leafOrder('hex') as string[];
/** Most children filled at once. */
const MAX_FILLS = 600;
/** Most of the other routes drawn faint. */
const MAX_REST = 120000;
/** Widths a route is drawn at, by how often it is passed. */
const WIDTHS = [1.6, 2.6, 3.8];
let drawings = 0;

const tint = (hex: string, alpha: number): string => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${alpha})`;
};

/** The supertile drawn in: its outline and a box to frame. */
export interface Frame {
  readonly outline: readonly Pt[];
  readonly box: Box;
}

const flat = (pts: readonly Pt[]): Float64Array => {
  const out = new Float64Array(2 * pts.length + 2);
  pts.forEach((p, i) => { out[2 * i] = p.x; out[2 * i + 1] = p.y; });
  if (pts.length) { out[2 * pts.length] = pts[0].x; out[2 * pts.length + 1] = pts[0].y; }
  return out;
};

export function PassesPane(props: {
  g: Geometry;
  frame: Frame;
  /** Changes when the view should frame `frame.box` again. */
  fitKey: string;
  passes: readonly Pass[];
  /** How often each pass's route is passed in all (1 when not given). */
  passesOf?: (p: Pass) => number;
  /** Draw, faint, the other routes of the children the passes run through. */
  rest?: boolean;
  /** Passes the other side has a match for: drawn faint, the rest bold. */
  matched?: readonly boolean[] | null;
  apiRef?: React.MutableRefObject<ViewerApi | null>;
  hovered: number | null;
  onHover: (i: number | null) => void;
  label: string;
  testId: string;
}): JSX.Element {
  const { g, frame, passes, matched } = props;
  const most = useMemo(() => {
    let m = 1;
    if (props.passesOf) for (const p of passes) m = Math.max(m, props.passesOf(p));
    return m;
  }, [passes, props.passesOf]);
  // the children the passes run through, by slot path
  const kids = useMemo(() => {
    const m = new Map<string, Pass>();
    for (const p of passes) m.set(p.path.join('.'), p);
    return [...m.values()];
  }, [passes]);
  const rest = useMemo(() => {
    if (!props.rest || kids.length > MAX_FILLS) return [] as [Pt, Pt][];
    const out: [Pt, Pt][] = [];
    for (const p of kids) {
      const T = g.cs.levels[p.level][p.type];
      for (const k of T.crossings()) {
        const m = T.mate(k);
        if (m <= k) continue;
        const a = T.pts[k], b = T.pts[m];
        out.push([
          { x: p.x[0] * a.x + p.x[1] * a.y + p.x[2], y: p.x[3] * a.x + p.x[4] * a.y + p.x[5] },
          { x: p.x[0] * b.x + p.x[1] * b.y + p.x[2], y: p.x[3] * b.x + p.x[4] * b.y + p.x[5] },
        ]);
        if (out.length >= MAX_REST) return out;
      }
    }
    return out;
  }, [g, kids, props.rest]);
  const R = rest.length;
  const lines: Lines = useMemo(() => {
    const width = (p: Pass) => {
      const c = props.passesOf?.(p) ?? 1;
      return most <= 1 ? 0 : Math.min(2, Math.floor((3 * Math.log(c)) / Math.log(most + 1)));
    };
    return {
      key: `${props.testId} ${++drawings}`,
      count: R + passes.length,
      points: (i) => {
        if (i < R) return fixedSource(Float64Array.of(rest[i][0].x, rest[i][0].y, rest[i][1].x, rest[i][1].y));
        const p = passes[i - R];
        return fixedSource(Float64Array.of(p.a.x, p.a.y, p.b.x, p.b.y));
      },
      style: (i) => {
        if (i < R) return 0;
        const p = passes[i - R];
        return 1 + TYPES.indexOf(p.type) * 6 + width(p) + (matched && matched[i - R] ? 3 : 0);
      },
      styles: [
        { color: '--muted', width: 0.8, alpha: 0.35 },
        ...TYPES.flatMap((t) => [
          ...WIDTHS.map((w) => ({ color: TYPE_STROKE[t], width: w, alpha: 1 })),
          ...WIDTHS.map((w) => ({ color: TYPE_STROKE[t], width: Math.max(1.2, w - 0.8), alpha: 0.5 })),
        ]),
      ],
      stop: () => 0,
    };
  }, [passes, matched, rest, R, most, props.testId]); // eslint-disable-line react-hooks/exhaustive-deps
  const marks = useMemo(() => {
    const out: Mark[] = [];
    if (kids.length <= MAX_FILLS) {
      for (const p of kids) {
        const pts = g.cs.outline(p.level, p.type).map((q) => ({ x: p.x[0] * q.x + p.x[1] * q.y + p.x[2], y: p.x[3] * q.x + p.x[4] * q.y + p.x[5] }));
        out.push({ pts: flat(pts), color: tint(TYPE_STROKE[p.type], 0.45), width: 0.8, fill: tint(TYPE_STROKE[p.type], 0.1) });
      }
    }
    out.push({ pts: flat(frame.outline), color: '--muted', width: 1 });
    return () => out;
  }, [g, frame, kids]);
  const present = useMemo(() => [...new Set(passes.map((p) => p.type))].sort((a, b) => TYPES.indexOf(a) - TYPES.indexOf(b)), [passes]);
  const pass = (i: number) => passes[i - R];
  return (
    <div className="bu-passes" data-testid={props.testId}>
      <Viewer
        frame={frame.box}
        fitKey={props.fitKey}
        lines={lines}
        marks={marks}
        hovered={props.hovered}
        onHover={(i) => props.onHover(i !== null && i >= R ? i : null)}
        onPick={(i) => {
          if (i === null || i < R) return;
          const p = pass(i);
          props.apiRef?.current?.fit(mapBox(p.x, g.box(p.level, p.type)));
        }}
        highlight={props.hovered !== null ? [{ i: props.hovered, color: '--text', width: 4 }] : undefined}
        tooltip={(i) => {
          if (i < R) return 'Another route of this child';
          const p = pass(i);
          const c = props.passesOf?.(p);
          return `Route of a ${p.type}, ${nf(p.tiles)} tiles${c && c > 1 ? `; passed ${nf(c)} times in all, in every ${p.type}` : ''}. Click to zoom to it`;
        }}
        apiRef={props.apiRef}
        label={props.label}
      >
        <div className="bv-legend">
          {present.map((t) => <span key={t} className="bu-key"><i style={{ background: TYPE_STROKE[t] }} />{t}</span>)}
        </div>
      </Viewer>
    </div>
  );
}
