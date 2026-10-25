/**
 * `ExpansionMap` — one parent type's expansion, drawn as the lookup table it
 * is: the children in place with their slot numbers and types, every child
 * edge numbered, and the parent's six edges marked along the outside as the
 * runs of child edges that make them up (the B table). Highlights show one
 * lookup: the child edge being asked about, the glued partner it meets inside
 * (the G table), or the parent edge and piece it lies on, and the child edge
 * entered on the way back down.
 */
import { useMemo } from 'react';

import {
  HEX_LETTER, buildSystem, edgeParts, flatten, leafPts, levelMirror, transPt,
  type HexType,
} from '../../core';
import { tileColor } from '../../lib/palette';

export interface MapHighlight {
  /** the child edge being looked up */
  readonly child?: { s: number; e: number };
  /** the child edge it is glued to inside the parent */
  readonly partner?: { s: number; e: number };
  /** the parent edge it lies on */
  readonly parentEdge?: number;
  /** piece i of that parent edge */
  readonly piece?: { j: number; i: number };
  /** the child edge entered on the way down */
  readonly entered?: { s: number; e: number };
}

export interface ExpansionMapProps {
  readonly parent: HexType;
  readonly highlight?: MapHighlight;
  readonly size?: number;
  readonly title?: string;
}

interface Pt { x: number; y: number }
interface Child { s: number; type: HexType; pts: Pt[]; c: Pt }

const ARC_COLOURS = ['#e36b6b', '#e0a53b', '#8fc24b', '#3bb7b0', '#5b8def', '#b06bd6'];

function layout(parent: HexType): { children: Child[]; viewBox: string; centre: Pt } {
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
  const centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  return { children, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`, centre };
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const towards = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
/** A point a distance d from the edge midpoint, on the side away from the child's centre. */
const outward = (ch: Child, e: number, d: number): Pt => {
  const m = mid(ch.pts[e], ch.pts[(e + 1) % 6]);
  const dx = m.x - ch.c.x, dy = m.y - ch.c.y, n = Math.hypot(dx, dy) || 1;
  return { x: m.x + (dx / n) * d, y: m.y + (dy / n) * d };
};

export function ExpansionMap({ parent, highlight = {}, size = 240, title }: ExpansionMapProps): JSX.Element {
  const { children, viewBox } = useMemo(() => layout(parent), [parent]);
  const bySlot = useMemo(() => new Map(children.map((c) => [c.s, c])), [children]);
  const same = (a: { s: number; e: number } | undefined, s: number, e: number): boolean => !!a && a.s === s && a.e === e;
  const arcs = useMemo(() => [0, 1, 2, 3, 4, 5].map((j) => edgeParts(parent, j)), [parent]);

  return (
    <figure className="xmap" style={{ width: size }} data-testid={`xmap-${parent}`}>
      <svg viewBox={viewBox} className="xmap__svg">
        {children.map((ch) => (
          <polygon key={ch.s} points={ch.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={tileColor(ch.type)} className="xmap__child" />
        ))}
        {/* the parent's six edges, as coloured runs along the outside of the child edges that make them */}
        {arcs.map((arc, j) => {
          const active = highlight.parentEdge === j;
          return (
            <g key={j} className={`xmap__arc${active ? ' is-active' : ''}`} stroke={ARC_COLOURS[j]}>
              {arc.map(({ s, e }, i) => {
                const ch = bySlot.get(s)!;
                const a = outward(ch, e, 0.16);
                const p = ch.pts[e], q = ch.pts[(e + 1) % 6];
                const shift = { x: a.x - mid(p, q).x, y: a.y - mid(p, q).y };
                const isPiece = highlight.piece && highlight.piece.j === j && highlight.piece.i === i;
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
        {/* child labels and edge numbers */}
        {children.map((ch) => (
          <g key={`l${ch.s}`}>
            <text x={ch.c.x} y={ch.c.y} className="xmap__slot">{ch.s}<tspan className="xmap__type">{HEX_LETTER[ch.type]}</tspan></text>
            {ch.pts.map((_, e) => {
              const t = towards(mid(ch.pts[e], ch.pts[(e + 1) % 6]), ch.c, 0.3);
              return <text key={e} x={t.x} y={t.y} className="xmap__edge">{e}</text>;
            })}
          </g>
        ))}
        {/* highlights */}
        {children.map((ch) => ch.pts.map((p, e) => {
          const q = ch.pts[(e + 1) % 6];
          const cls = same(highlight.child, ch.s, e) ? 'is-child' : same(highlight.partner, ch.s, e) ? 'is-partner' : same(highlight.entered, ch.s, e) ? 'is-entered' : null;
          if (!cls) return null;
          return <line key={`${ch.s}-${e}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={`xmap__hl ${cls}`} />;
        }))}
      </svg>
      <figcaption>{title ?? `${parent} (${HEX_LETTER[parent]}) expands to ${children.map((c) => HEX_LETTER[c.type]).join(' ')}`}</figcaption>
    </figure>
  );
}

export default ExpansionMap;
