/**
 * `HexBoard` — an SVG board of hexagon tiles placed by slot path, drawn the
 * way the Explorer draws them: every tile in its type colour with its
 * orientation flag, the pattern's chords faint in every tile, a strand in
 * bold from edge to edge, supertile boundaries thicker by level, and the
 * focus tile's edge numbers with its pairing. A preview layer (tiles that
 * would appear if a choice were made) is drawn faint underneath.
 *
 * The board's only state is its camera (wheel zooms about the cursor, drag
 * pans, Fit goes back to showing everything); pages place the tiles
 * (`lib/hexBoard.ts`) and pass them in.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { addressFromId, typeAt, transPt, type Affine, type HexType } from '../core';
import { tileColor } from '../lib/palette';
import { chordD, edgeLabelAt, orientationPath, pairingD, partnerEdge, pointOnEdge, tileCentre, tilePoints, HEX_OUTLINE, type BoundaryEdge } from '../lib/hexBoard';
import '../styles/hexboard.css';

export interface BoardTile {
  readonly id: string;
  readonly type: HexType;
  readonly xform: Affine;
  /** solid: on the walk; faint: around it; preview: would appear with the previewed choice. */
  readonly tone: 'solid' | 'faint' | 'preview';
  readonly className?: string;
}

/** One strand step: in through `entry`, out through `exit`. */
export interface BoardStep { readonly xform: Affine; readonly type: HexType; readonly entry: number; readonly exit: number }

export interface BoardMark { readonly xform: Affine; readonly kind: string; readonly r?: number }

export interface HexBoardProps {
  readonly tiles: readonly BoardTile[];
  /** The rule and the matching index per type: the pattern drawn faint in every tile. */
  readonly pattern?: { readonly subset: readonly number[]; readonly matching: ReadonlyMap<HexType, number> };
  readonly strand?: readonly BoardStep[];
  /** A step that has not landed yet: drawn to its exit edge. */
  readonly pendingStep?: BoardStep | null;
  readonly boundaries?: readonly BoundaryEdge[];
  readonly previewBoundaries?: readonly BoundaryEdge[];
  /** The tile whose edges are numbered. */
  readonly focus?: { readonly xform: Affine; readonly type: HexType; readonly entry: number | null } | null;
  readonly marks?: readonly BoardMark[];
  /** Most orientation flags drawn (the faint tiles nearest the start come first in `tiles`). */
  readonly flagCap?: number;
  readonly onTileClick?: (id: string) => void;
  readonly testId?: string;
  /**
   * The root the tiles' ids are slot paths in. Given, the board offers a
   * supertiles view: every tile tinted, at each level, with its ancestor's
   * type colour, faintly, so the supertiles show nested.
   */
  readonly nest?: { readonly root: HexType; readonly level: number } | null;
  readonly children?: ReactNode;
}

const boundaryWidth = (level: number): number => [0, 0.05, 0.09, 0.13, 0.16, 0.19, 0.22][Math.min(level, 6)];

export function HexBoard(props: HexBoardProps): JSX.Element {
  const { tiles, pattern, strand = [], pendingStep, boundaries = [], previewBoundaries = [], focus, marks = [], flagCap = 400, onTileClick, testId, nest } = props;
  const [nested, setNested] = useState(false);
  // one path per (level, ancestor type): every tile of the walk's world tinted with each ancestor's colour
  const tints = useMemo(() => {
    if (!nested || !nest || nest.level === 0) return [];
    const by = new Map<string, { level: number; type: HexType; d: string[] }>();
    for (const t of tiles) {
      if (t.tone === 'preview') continue;
      let a;
      try { a = addressFromId(nest.root, t.id); } catch { continue; }
      if (a.path.length !== nest.level) continue;
      for (let k = 1; k <= nest.level; k++) {
        const type = typeAt(a, k);
        const key = `${k}|${type}`;
        (by.get(key) ?? by.set(key, { level: k, type, d: [] }).get(key)!).d.push(`M${tilePoints(t.xform).replace(/ /g, 'L')}Z`);
      }
    }
    // biggest supertiles first, so the smaller ones sit on top
    return [...by.values()].sort((x, y) => y.level - x.level).map((g) => ({ ...g, d: g.d.join('') }));
  }, [nested, nest, tiles]);
  let minX = -3, minY = -3, maxX = 4, maxY = 4;
  for (const t of tiles) for (const q of HEX_OUTLINE) { const p = transPt(t.xform, q); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const fit = { x: minX - 1, y: minY - 1, w: maxX - minX + 2, h: maxY - minY + 2 };
  const [view, setView] = useState<typeof fit | null>(null);
  const vb = view ?? fit;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  /** Screen pixels per world unit, and the world point under a client position (viewBox is fitted, centred). */
  const frame = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = vbRef.current;
    const k = Math.min(r.width / v.w, r.height / v.h) || 1;
    const ox = (r.width - v.w * k) / 2;
    const oy = (r.height - v.h * k) / 2;
    return { k, x: v.x + (clientX - r.left - ox) / k, y: v.y + (clientY - r.top - oy) / k };
  };
  const zoom = (f: number, at?: { x: number; y: number }) => {
    const v = vbRef.current;
    const c = at ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    setView({ x: c.x - (c.x - v.x) / f, y: c.y - (c.y - v.y) / f, w: v.w / f, h: v.h / f });
  };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (ev: WheelEvent): void => {
      ev.preventDefault();
      const p = frame(ev.clientX, ev.clientY);
      zoom(Math.exp(-ev.deltaY * 0.0015), p);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const drag = useRef<{ x: number; y: number; v: typeof fit; k: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  const strandD = (steps: readonly BoardStep[]): string => {
    const out: string[] = [];
    let last: { x: number; y: number } | null = null;
    for (const s of steps) {
      if (!pattern) break;
      const a = pointOnEdge(s.type, pattern.subset, s.entry);
      const b = pointOnEdge(s.type, pattern.subset, s.exit);
      if (!a || !b) continue;
      const pa = transPt(s.xform, a);
      const joined = last && Math.hypot(last.x - pa.x, last.y - pa.y) < 1e-6;
      out.push(chordD(s.xform, s.type, a, b, !joined));
      last = transPt(s.xform, b);
    }
    return out.join(' ');
  };
  const pendingD = pendingStep ? strandD([pendingStep]) : '';
  const solid = tiles.filter((t) => t.tone === 'solid');
  const flagged = [...solid, ...tiles.filter((t) => t.tone !== 'solid').slice(0, Math.max(0, flagCap - solid.length))];

  return (
    <div className="hb-wrap">
    <svg
      ref={svgRef}
      className={`hb${panning ? ' is-panning' : ''}`}
      viewBox={viewBox}
      data-testid={testId}
      data-tiles={tiles.length}
      data-solid={solid.length}
      onPointerDown={(ev) => {
        if (ev.button !== 0) return;
        drag.current = { x: ev.clientX, y: ev.clientY, v: vbRef.current, k: frame(ev.clientX, ev.clientY).k };
      }}
      onPointerMove={(ev) => {
        const d = drag.current;
        if (!d) return;
        const dx = ev.clientX - d.x;
        const dy = ev.clientY - d.y;
        if (!panning && Math.hypot(dx, dy) < 4) return;
        if (!panning) { setPanning(true); (ev.currentTarget as SVGSVGElement).setPointerCapture(ev.pointerId); }
        setView({ ...d.v, x: d.v.x - dx / d.k, y: d.v.y - dy / d.k });
      }}
      onPointerUp={() => { drag.current = null; setPanning(false); }}
      onPointerCancel={() => { drag.current = null; setPanning(false); }}
    >
      {tints.length === 0 && tiles.map((t) => (
        <polygon
          key={`${t.tone}-${t.id}`}
          data-id={t.id}
          className={`hb__tile is-${t.tone}${t.className ? ` ${t.className}` : ''}`}
          points={tilePoints(t.xform)}
          fill={tileColor(t.type)}
          onClick={onTileClick ? () => onTileClick(t.id) : undefined}
        >
          <title>{`${t.id || '(root)'}: ${t.type}`}</title>
        </polygon>
      ))}
      {tints.map((g) => <path key={`n${g.level}${g.type}`} className="hb__nest" d={g.d} fill={tileColor(g.type)} data-level={g.level} />)}
      {tints.length > 0 && tiles.filter((t) => t.tone === 'preview').map((t) => <polygon key={`p-${t.id}`} className={`hb__tile is-preview${t.className ? ` ${t.className}` : ''}`} points={tilePoints(t.xform)} fill={tileColor(t.type)} />)}
      {previewBoundaries.map((b) => <line key={`pb-${b.key}`} className="hb__boundary is-preview" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} strokeWidth={boundaryWidth(b.level)} />)}
      {boundaries.map((b) => <line key={`b-${b.key}`} className="hb__boundary" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} strokeWidth={boundaryWidth(b.level)} />)}
      {pattern && tiles.map((t) => {
        const d = pairingD(t.xform, t.type, pattern.subset, pattern.matching.get(t.type) ?? 0);
        return d ? <path key={`c-${t.tone}-${t.id}`} className={`hb__chords is-${t.tone}`} d={d} /> : null;
      })}
      {flagged.map((t) => <path key={`f-${t.tone}-${t.id}`} d={orientationPath(t.xform)} className={`hb__flag is-${t.tone}`} />)}
      {strand.length > 0 && <path className="hb__strand" d={strandD(strand)} data-testid={testId ? `${testId}-strand` : undefined} />}
      {pendingD && <path className="hb__strand is-pending" d={pendingD} />}
      {focus && (
        <g className="hb__focus">
          <polygon className="hb__focus-outline" points={tilePoints(focus.xform)} />
          {[0, 1, 2, 3, 4, 5].map((e) => {
            const at = edgeLabelAt(focus.xform, e);
            const partner = pattern && focus.entry !== null ? partnerEdge(focus.type, pattern.subset, pattern.matching.get(focus.type) ?? 0, focus.entry) : null;
            const cls = e === focus.entry ? ' is-entry' : e === partner ? ' is-exit' : '';
            return <text key={e} className={`hb__edge-no${cls}`} x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central">{e}</text>;
          })}
        </g>
      )}
      {marks.map((m, i) => { const c = tileCentre(m.xform); return <circle key={`m-${i}`} className={`hb__mark is-${m.kind}`} cx={c.x} cy={c.y} r={m.r ?? 0.45} />; })}
      {props.children}
    </svg>
    <div className="hb-fit">
      {nest && nest.level > 0 && (
        <button type="button" className={nested ? 'is-active' : ''} onClick={() => setNested((v) => !v)} aria-pressed={nested} data-testid={testId ? `${testId}-nest` : undefined}>
          Supertiles
        </button>
      )}
      <button type="button" onClick={() => zoom(1.4)} aria-label="Zoom in">+</button>
      <button type="button" onClick={() => zoom(1 / 1.4)} aria-label="Zoom out">−</button>
      <button type="button" onClick={() => setView(null)} data-testid={testId ? `${testId}-fit` : undefined}>Fit</button>
    </div>
    </div>
  );
}

export default HexBoard;
