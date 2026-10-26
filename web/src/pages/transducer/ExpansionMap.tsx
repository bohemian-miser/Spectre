/**
 * `ExpansionMap` — one type's substitution rule as a picture: the children in
 * their slots with slot numbers and types, every child edge numbered, and the
 * supertile's six edges marked along the outside as the runs of child edges
 * that make them up. Marks show lookups: the child edge asked about, the
 * sibling edge it meets inside, or the supertile edge and piece it lies on,
 * and the child edge entered on the way back down, each with a step number.
 */
import { useMemo } from 'react';

import {
  buildSystem, edgeParts, flatten, leafPts, levelMirror, transPt,
  type HexType,
} from '../../core';
import { tileColor } from '../../lib/palette';

export interface MapMark {
  /** the child edge being looked up */
  readonly child?: { s: number; e: number };
  /** the child edge it meets inside the supertile */
  readonly partner?: { s: number; e: number };
  /** the supertile edge it lies on */
  readonly parentEdge?: number;
  /** piece i of that supertile edge */
  readonly piece?: { j: number; i: number };
  /** the child edge entered on the way down */
  readonly entered?: { s: number; e: number };
  /** step number shown as a badge */
  readonly label?: string;
}

export interface ExpansionMapProps {
  readonly parent: HexType;
  readonly marks?: readonly MapMark[];
  readonly size?: number;
  readonly title?: string;
  readonly used?: boolean;
}

interface Pt { x: number; y: number }
interface Child { s: number; type: HexType; pts: Pt[]; c: Pt }

const ARC_COLOURS = ['#e36b6b', '#e0a53b', '#8fc24b', '#3bb7b0', '#5b8def', '#b06bd6'];

function layout(parent: HexType): { children: Child[]; viewBox: string } {
  const insts = flatten(buildSystem('hex', 1)[parent], levelMirror(1));
  const base = leafPts('hex', 'Delta');
  const children: Child[] = insts.map((inst) => {
    const pts = base.map((p) => transPt(inst.xform, p));
    const c = { x: pts.reduce((a, p) => a + p.x, 0) / 6, y: pts.reduce((a, p) => a + p.y, 0) / 6 };
    return { s: Number(inst.id), type: inst.type as HexType, pts, c };
  });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ch of children) for (const p of ch.pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const pad = 1.1;
  return { children, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}` };
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const towards = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
/** A point a distance d from the edge midpoint, on the side away from the child's centre. */
const outward = (ch: Child, e: number, d: number): Pt => {
  const m = mid(ch.pts[e], ch.pts[(e + 1) % 6]);
  const dx = m.x - ch.c.x, dy = m.y - ch.c.y, n = Math.hypot(dx, dy) || 1;
  return { x: m.x + (dx / n) * d, y: m.y + (dy / n) * d };
};

export function ExpansionMap({ parent, marks = [], size = 240, title, used = false }: ExpansionMapProps): JSX.Element {
  const { children, viewBox } = useMemo(() => layout(parent), [parent]);
  const bySlot = useMemo(() => new Map(children.map((c) => [c.s, c])), [children]);
  const arcs = useMemo(() => [0, 1, 2, 3, 4, 5].map((j) => edgeParts(parent, j)), [parent]);
  const activeEdges = new Set(marks.map((m) => m.parentEdge).filter((j): j is number => j !== undefined));
  const pieces = marks.filter((m) => m.piece).map((m) => m.piece!);

  const edgeLines = (sel: { s: number; e: number } | undefined, cls: string, label?: string): JSX.Element | null => {
    if (!sel) return null;
    const ch = bySlot.get(sel.s);
    if (!ch) return null;
    const p = ch.pts[sel.e], q = ch.pts[(sel.e + 1) % 6];
    const b = outward(ch, sel.e, -0.42);
    return (
      <g key={`${cls}-${sel.s}-${sel.e}-${label ?? ''}`}>
        <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={`xmap__hl ${cls}`} />
        {label && <g className="xmap__badge"><circle cx={b.x} cy={b.y} r={0.27} /><text x={b.x} y={b.y}>{label}</text></g>}
      </g>
    );
  };

  return (
    <figure className={`xmap${used ? ' is-used' : ''}`} style={{ width: size }} data-testid={`xmap-${parent}`} data-used={used ? '1' : '0'}>
      <svg viewBox={viewBox} className="xmap__svg">
        {children.map((ch) => (
          <polygon key={ch.s} points={ch.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={tileColor(ch.type)} className="xmap__child" />
        ))}
        {arcs.map((arc, j) => {
          const active = activeEdges.has(j);
          return (
            <g key={j} className={`xmap__arc${active ? ' is-active' : ''}`} stroke={ARC_COLOURS[j]}>
              {arc.map(({ s, e }, i) => {
                const ch = bySlot.get(s)!;
                const a = outward(ch, e, 0.16);
                const p = ch.pts[e], q = ch.pts[(e + 1) % 6];
                const shift = { x: a.x - mid(p, q).x, y: a.y - mid(p, q).y };
                const isPiece = pieces.some((pc) => pc.j === j && pc.i === i);
                return (
                  <g key={i}>
                    <line x1={p.x + shift.x} y1={p.y + shift.y} x2={q.x + shift.x} y2={q.y + shift.y} className={isPiece ? 'is-piece' : undefined} />
                    {(active || isPiece) && (() => { const t = outward(ch, e, 0.5); return <text x={t.x} y={t.y} className="xmap__piece">{i + 1}/{arc.length}</text>; })()}
                  </g>
                );
              })}
              {(() => {
                const m = arc[Math.floor(arc.length / 2)];
                const ch = bySlot.get(m.s)!;
                const t = outward(ch, m.e, active ? 0.95 : 0.72);
                return <text x={t.x} y={t.y} className="xmap__arclabel" fill={ARC_COLOURS[j]} stroke="none">edge {j}</text>;
              })()}
            </g>
          );
        })}
        {children.map((ch) => (
          <g key={`l${ch.s}`}>
            <text x={ch.c.x} y={ch.c.y - 0.1} className="xmap__slot">{ch.s}</text>
            <text x={ch.c.x} y={ch.c.y + 0.3} className="xmap__type">{ch.type}</text>
            {ch.pts.map((_, e) => {
              const t = towards(mid(ch.pts[e], ch.pts[(e + 1) % 6]), ch.c, 0.3);
              return <text key={e} x={t.x} y={t.y} className="xmap__edge">{e}</text>;
            })}
          </g>
        ))}
        {marks.map((m, i) => (
          <g key={i}>
            {edgeLines(m.child, 'is-child', m.label)}
            {edgeLines(m.partner, 'is-partner')}
            {edgeLines(m.entered, 'is-entered', m.child ? undefined : m.label)}
          </g>
        ))}
      </svg>
      <figcaption>{title ?? `${parent}: slots 0 to 7 hold ${children.map((c) => c.type).join(', ')}`}</figcaption>
    </figure>
  );
}

export default ExpansionMap;
