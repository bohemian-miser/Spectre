/**
 * `TileGlyph` — one tile drawn small: its outline, its selected edges in their
 * class colours, the connection points and the current pairing's chords. The
 * quick bar's tile picker shows one per tile type (as aperiodic-circuits'
 * does); `TileEditor` is the big, editable version of the same picture.
 */

import { useMemo } from 'react';
import {
  edgeLabels,
  leafPts,
  matchingAt,
  orientCurve,
  parseEdgeLabel,
  strandCurve,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { tileMatchingInfo } from '../lib/matchingModel';
import { edgeClassColor } from '../lib/palette';

export interface TileGlyphProps {
  readonly family: TileFamilyId;
  readonly type: TileTypeId;
  readonly selected: ReadonlySet<number>;
  readonly contracts?: EdgeContracts;
  /** Full matching index of the pairing to draw. */
  readonly index: number;
  readonly curvedStrands?: boolean;
  /** Width and height in px. */
  readonly size?: number;
}

export function TileGlyph(props: TileGlyphProps): JSX.Element {
  const { family, type, selected, contracts, index, curvedStrands = false, size = 56 } = props;
  const outline = leafPts(family, type);
  const classes = useMemo(() => edgeLabels(family, type).map((l) => parseEdgeLabel(l).major), [family, type]);
  const info = tileMatchingInfo(family, type, selected, contracts);
  const points = info.points.map((c) => c.pt);
  const pairs = info.odd ? [] : (matchingAt(points.length, index) ?? matchingAt(points.length, 0) ?? []);

  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = span * 0.08;
  const vb = `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`;
  const sw = span / 40;

  const chordD = ([i, j]: readonly [number, number]): string => {
    const p = points[i];
    const q = points[j];
    if (!curvedStrands) return `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
    const [h1, h2] = orientCurve(strandCurve(family, type, p, q), p);
    return `M ${p.x} ${p.y} C ${h1.x} ${h1.y} ${h2.x} ${h2.y} ${q.x} ${q.y}`;
  };

  return (
    <svg className="tile-glyph" viewBox={vb} width={size} height={size} aria-hidden="true">
      <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} className="tile-glyph-body" strokeWidth={sw * 0.8} />
      {outline.map((p, e) => {
        if (!selected.has(classes[e])) return null;
        const q = outline[(e + 1) % outline.length];
        return <line key={e} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={edgeClassColor(classes[e])} strokeWidth={sw * 2.2} strokeLinecap="round" />;
      })}
      {pairs.map((pair, k) => (
        <path key={k} d={chordD(pair)} className="tile-glyph-chord" fill="none" strokeWidth={sw * 1.6} strokeLinecap="round" />
      ))}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={sw * 1.3} className={`tile-glyph-dot${info.odd ? ' is-odd' : ''}`} />
      ))}
    </svg>
  );
}

export default TileGlyph;
