/**
 * A supertile drawn from its children's route tables, glued at their shared
 * crossings: each child filled in its type's colour, and in it the child's
 * routes that make up the routes (or the circuit) shown, each a straight line
 * between the crossings where the strand enters and leaves the child (a
 * pass, `viewer.ts`). A child route opens into its own children's routes one
 * level down; so does the whole drawing, a level at a time.
 */
import { useMemo } from 'react';
import { leafOrder, type Pt } from '../../core';
import type { Box } from '../../lib/viewport';
import { Viewer, type Lines, type Mark, type ViewerApi } from './Viewer';
import { fixedSource, mapBox, signature, subCount, subPasses, type Geometry, type Pass } from './viewer';

const nf = (n: number) => n.toLocaleString('en-US');
/** Most passes drawn at once. */
export const MAX_PASSES = 200000;

/** Stroke colours for the types, one each, told apart on light and dark grounds. */
export const TYPE_STROKE: Record<string, string> = {
  Gamma: '#4e79a7', Delta: '#e15759', Theta: '#f28e2b', Lambda: '#76b7b2', Xi: '#59a14f',
  Pi: '#c9a227', Sigma: '#b07aa1', Phi: '#ff7f9e', Psi: '#9c755f',
};
const TYPES = leafOrder('hex') as string[];
/** Most children filled at once. */
const MAX_FILLS = 600;
let drawings = 0;

const tint = (hex: string, alpha: number): string => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${alpha})`;
};

/** One step of a breakdown: the passes drawn and what they are the passes of. */
export interface Depth {
  readonly passes: readonly Pass[];
  readonly label: string;
}

/** The supertile the breakdown is drawn in: its outline, its children's, and a box round it. */
export interface Frame {
  readonly outline: readonly Pt[];
  readonly children: readonly (readonly Pt[])[];
  readonly box: Box;
}

const flat = (pts: readonly Pt[], close = true): Float64Array => {
  const out = new Float64Array(2 * pts.length + (close ? 2 : 0));
  pts.forEach((p, i) => { out[2 * i] = p.x; out[2 * i + 1] = p.y; });
  if (close && pts.length) { out[2 * pts.length] = pts[0].x; out[2 * pts.length + 1] = pts[0].y; }
  return out;
};

export function PassesPane(props: {
  g: Geometry;
  frame: Frame;
  title: string;
  stack: readonly Depth[];
  onStack: (s: readonly Depth[]) => void;
  /** Signatures of the passes on the other side, when compared. */
  other?: ReadonlySet<string> | null;
  apiRef?: React.MutableRefObject<ViewerApi | null>;
  hovered: number | null;
  onHover: (i: number | null) => void;
  testId: string;
}): JSX.Element {
  const { g, frame, stack } = props;
  const top = stack[stack.length - 1];
  const passes = top.passes;
  const sigs = useMemo(() => (props.other ? passes.map((p) => signature(g, p)) : null), [g, passes, props.other]);
  const unmatched = useMemo(() => (sigs && props.other ? sigs.map((s) => !props.other!.has(s)) : null), [sigs, props.other]);
  const lines: Lines = useMemo(() => ({
    key: `${props.testId} ${++drawings}`,
    count: passes.length,
    points: (i) => fixedSource(Float64Array.of(passes[i].a.x, passes[i].a.y, passes[i].b.x, passes[i].b.y)),
    style: (i) => TYPES.indexOf(passes[i].type) + (unmatched && !unmatched[i] ? TYPES.length : 0),
    styles: [
      ...TYPES.map((t) => ({ color: TYPE_STROKE[t], width: unmatched ? 3 : 2, alpha: 1 })),
      ...TYPES.map((t) => ({ color: TYPE_STROKE[t], width: 1.2, alpha: 0.35 })),
    ],
    stop: () => 0,
  }), [passes, unmatched, stack.length, props.testId]);
  const marks = useMemo(() => {
    const out: Mark[] = [];
    // each child the routes run through, filled in its type's colour
    const kids = new Map<string, Pass>();
    for (const p of passes) kids.set(p.path.join('.'), p);
    if (kids.size <= MAX_FILLS) {
      for (const p of kids.values()) {
        const pts = g.cs.outline(p.level, p.type).map((q) => ({ x: p.x[0] * q.x + p.x[1] * q.y + p.x[2], y: p.x[3] * q.x + p.x[4] * q.y + p.x[5] }));
        out.push({ pts: flat(pts), color: tint(TYPE_STROKE[p.type], 0.45), width: 0.8, fill: tint(TYPE_STROKE[p.type], 0.1) });
      }
    }
    out.push({ pts: flat(frame.outline), color: '--muted', width: 1 });
    // where the routes meet, so each one's ends read where lines overlap
    if (passes.length <= 120) {
      const ends = new Float64Array(2 * passes.length);
      passes.forEach((p, i) => { ends[2 * i] = p.a.x; ends[2 * i + 1] = p.a.y; });
      out.push({ pts: ends, color: '--text', width: 1.6, dots: true });
    }
    return () => out;
  }, [g, frame, passes]);
  const present = [...new Set(passes.map((p) => p.type))].sort((a, b) => TYPES.indexOf(a) - TYPES.indexOf(b));
  const next = subCount(g, passes);
  const atTiles = passes.length > 0 && passes[0].level === 0;
  const open = (i: number | null) => {
    if (i === null) return;
    const p = passes[i];
    if (p.level === 0) return;
    props.onStack([...stack, { passes: subPasses(g, p), label: `in one ${p.type}` }]);
    props.apiRef?.current?.fit(mapBox(p.x, g.box(p.level, p.type)));
  };
  return (
    <div className="bu-passes" data-testid={props.testId}>
      <div className="bu-crumbs" aria-label="Depth">
        <strong>{props.title}</strong>
        {stack.map((d, i) => (
          <button key={i} type="button" className={i === stack.length - 1 ? 'is-active' : ''} onClick={() => props.onStack(stack.slice(0, i + 1))} disabled={i === stack.length - 1}>
            {i > 0 && <span className="bu-sep">›</span>}
            {d.label ? `${d.label}, ` : ''}level {d.passes[0]?.level}: {nf(d.passes.length)} {d.passes.length === 1 ? 'route' : 'routes'}
          </button>
        ))}
      </div>
      <Viewer
        frame={frame.box}
        fitKey={`${props.testId} ${props.title}`}
        lines={lines}
        marks={marks}
        hovered={props.hovered}
        onHover={props.onHover}
        onPick={open}
        highlight={props.hovered !== null ? [{ i: props.hovered, color: '--text', width: 4 }] : undefined}
        tooltip={(i) => `Route of the ${passes[i].type} at ${passes[i].path.join('.')}: ${nf(passes[i].tiles)} tiles${passes[i].level > 0 ? '. Click to open it' : ''}`}
        apiRef={props.apiRef}
        label={`${props.title}: ${passes.length} routes of its children`}
      />
      <div className="bu-passes-foot">
        <span className="bu-legend">
          {present.map((t) => <span key={t} className="bu-key"><i style={{ background: TYPE_STROKE[t] }} />{t}</span>)}
        </span>
        {unmatched && <span className="bu-muted">Bold: {nf(unmatched.filter(Boolean).length)} of {nf(passes.length)} run through a sequence of child types no route on the other side has.</span>}
        <button
          type="button"
          disabled={atTiles || next > MAX_PASSES}
          title={next > MAX_PASSES ? `${nf(next)} routes are too many to draw` : undefined}
          onClick={() => props.onStack([...stack, { passes: passes.flatMap((p) => subPasses(g, p)), label: '' }])}
          data-testid={`${props.testId}-down`}
        >
          One level down ({nf(next)})
        </button>
      </div>
    </div>
  );
}
