/**
 * `TileView` — the generic interactive single-tile widget (DESIGN.md §6.1).
 *
 * Renders ONE tile (a leaf, or the `Gamma1`+`Gamma2` Mystic composite) in its
 * own auto-fitted viewBox, with layered groups for fills, seams (meta-edges),
 * matching chords, overlays and edge labels. The DOM structure below is a
 * contract asserted by the component tests.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CONTRACTS,
  dist,
  enumerateMatchings,
  metaEdges,
  physicalEdgeMidpoints,
  transPt,
  svgMatrixString,
  type ColorSchemeId,
  type EdgeContracts,
  type EdgeLabel,
  type MetaEdge,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { edgeClassColor, tileColor } from '../lib/palette';
import { expandBox, boxSize, type Box } from '../lib/viewport';
import {
  seamPolyline,
  polylineD,
  tileOutline,
  tileParts,
  tilePartsBox,
  type TilePart,
} from '../lib/tilingModel';
import { tileConnectionPoints } from '../lib/tilingModel';

export type TileInteraction = 'none' | 'hover' | 'edge-select' | 'chord-draw';

/** Identifies one seam of one leaf part — the unit every callback speaks in. */
export interface EdgeRef {
  readonly tileType: TileTypeId;
  readonly metaEdgeId: string;
  readonly metaEdgeIndex: number;
  readonly major: number;
  readonly sign: 1 | -1;
  readonly label: EdgeLabel;
  /** Index into `connectionPoints()` order, or -1 when the class is unselected. */
  readonly pointIndex: number;
}

/** Straight-line overlay drawn on a tile: indices into `metaEdges()` order. */
export type OverlayChord = readonly [number, number];

export interface TileViewProps {
  readonly family: TileFamilyId;
  /** `'Gamma'` renders the Gamma1 + Gamma2 composite in non-hex families. */
  readonly tileType: TileTypeId;
  readonly curvy?: boolean;
  /** CSS size in px (or any CSS length); the viewBox handles world scaling. */
  readonly size?: number | string;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  readonly contracts?: EdgeContracts;

  // display layers
  /** Majors whose connection dots are drawn. */
  readonly selectedEdges?: ReadonlySet<number>;
  readonly showEdgeLabels?: boolean;
  /** Matching index for a single-part tile. */
  readonly matchingIndex?: number;
  /** Per-leaf matching indices (needed for the Gamma composite). */
  readonly matchingIndexByType?: Readonly<Record<string, number>>;
  /** Draw every other matching at low alpha (old thumbnail behaviour). */
  readonly ghostMatchings?: boolean;
  readonly overlays?: readonly OverlayChord[];
  readonly overlaysByType?: Readonly<Record<string, readonly OverlayChord[]>>;
  /** Externally driven glow, e.g. palette-wide hover sync. */
  readonly highlightMajors?: ReadonlySet<number>;
  readonly dimmed?: boolean;
  /** Pulse tiles that can never be fully paired (odd connection count). */
  readonly markOdd?: boolean;
  readonly showLabelText?: boolean;

  // interactivity
  readonly interaction?: TileInteraction;
  onEdgeHover?(edge: EdgeRef | null): void;
  onEdgeClick?(edge: EdgeRef): void;
  onChordDrawn?(from: EdgeRef, to: EdgeRef): void;
  onMatchingCycle?(delta: 1 | -1): void;
  /** Restrict chord-draw landing spots (explainer puzzles). */
  readonly validTargets?: readonly string[];

  readonly className?: string;
  readonly ariaLabel?: string;
}

interface SeamEntry {
  readonly ref: EdgeRef;
  readonly part: TilePart;
  readonly polyline: readonly Pt[];
  readonly dot: Pt | null;
  readonly color: string;
}

const PAD = 0.55;

function numericSize(size: number | string | undefined): number {
  if (typeof size === 'number') return size;
  if (typeof size === 'string') {
    const n = Number.parseFloat(size);
    if (Number.isFinite(n)) return n;
  }
  return 180;
}

export function TileView(props: TileViewProps): JSX.Element {
  const {
    family,
    tileType,
    curvy = false,
    size = 180,
    colorScheme = 'bright',
    customColors,
    contracts = DEFAULT_CONTRACTS,
    selectedEdges,
    showEdgeLabels = false,
    matchingIndex,
    matchingIndexByType,
    ghostMatchings = false,
    overlays,
    overlaysByType,
    highlightMajors,
    dimmed = false,
    markOdd = false,
    interaction = 'none',
    onEdgeHover,
    onEdgeClick,
    onChordDrawn,
    onMatchingCycle,
    validTargets,
    className,
    ariaLabel,
  } = props;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: EdgeRef; at: Pt; snap: EdgeRef | null } | null>(null);

  const parts = useMemo(() => tileParts(family, tileType), [family, tileType]);
  const box: Box = useMemo(() => expandBox(tilePartsBox(parts), PAD), [parts]);
  const { width: vbW, height: vbH } = boxSize(box);
  const px = numericSize(size);
  const pxPerWorld = px / Math.max(vbW, vbH, 1e-6);
  const hitWidth = Math.max(0.5, 44 / pxPerWorld);
  const snapRadius = Math.max(0.9, 32 / pxPerWorld);
  const strokeUnit = Math.max(0.03, 2 / pxPerWorld);

  /** All seams of all parts, with world-space geometry resolved once. */
  const seams: readonly SeamEntry[] = useMemo(() => {
    const out: SeamEntry[] = [];
    for (const part of parts) {
      const all = metaEdges(family, part.type);
      const points = selectedEdges
        ? tileConnectionPoints(family, part.type, selectedEdges, contracts)
        : [];
      all.forEach((seam: MetaEdge, index: number) => {
        const pointIndex = points.findIndex((p) => p.edge.id === seam.id);
        const local = seamPolyline(part.pts, seam);
        out.push({
          ref: {
            tileType: part.type,
            metaEdgeId: seam.id,
            metaEdgeIndex: index,
            major: seam.major,
            sign: seam.sign,
            label: seam.labels[0],
            pointIndex,
          },
          part,
          polyline: local.map((p) => transPt(part.xform, p)),
          dot: pointIndex >= 0 ? transPt(part.xform, points[pointIndex].pt) : null,
          color: edgeClassColor(seam.major),
        });
      });
    }
    return out;
  }, [parts, family, selectedEdges, contracts]);

  const seamById = useMemo(() => {
    const m = new Map<string, SeamEntry>();
    for (const s of seams) m.set(s.ref.metaEdgeId, s);
    return m;
  }, [seams]);

  /** Chords of the active matching, per part. */
  const chords = useMemo(() => {
    const out: { key: string; from: Pt; to: Pt; ghost: boolean }[] = [];
    for (const part of parts) {
      if (!selectedEdges) continue;
      const points = tileConnectionPoints(family, part.type, selectedEdges, contracts);
      if (points.length < 2 || points.length % 2 !== 0) continue;
      const all = enumerateMatchings(points.length);
      const idx =
        matchingIndexByType?.[part.type] ?? (parts.length === 1 ? matchingIndex ?? 0 : 0);
      const world = points.map((p) => transPt(part.xform, p.pt));

      if (ghostMatchings) {
        all.forEach((m, mi) => {
          if (mi === idx) return;
          m.forEach(([a, b], k) =>
            out.push({ key: `g${part.type}.${mi}.${k}`, from: world[a], to: world[b], ghost: true }),
          );
        });
      }
      const active = all[idx];
      if (active) {
        active.forEach(([a, b], k) =>
          out.push({ key: `m${part.type}.${k}`, from: world[a], to: world[b], ghost: false }),
        );
      }
    }
    return out;
  }, [parts, family, selectedEdges, contracts, matchingIndex, matchingIndexByType, ghostMatchings]);

  /** User-drawn straight-line overlays, resolved through meta-edge indices. */
  const overlayChords = useMemo(() => {
    const out: { key: string; from: Pt; to: Pt }[] = [];
    for (const part of parts) {
      const list =
        overlaysByType?.[part.type] ?? (parts.length === 1 ? overlays ?? [] : []);
      if (!list.length) continue;
      const all = metaEdges(family, part.type);
      list.forEach(([ai, bi], i) => {
        const a = all[ai];
        const b = all[bi];
        if (!a || !b) return;
        const pa = seamById.get(a.id)?.dot ?? contractPoint(part, a, contracts, family);
        const pb = seamById.get(b.id)?.dot ?? contractPoint(part, b, contracts, family);
        if (!pa || !pb) return;
        out.push({ key: `o${part.type}.${i}`, from: pa, to: pb });
      });
    }
    return out;
  }, [parts, family, overlays, overlaysByType, seamById, contracts]);

  const labels = useMemo(() => {
    if (!showEdgeLabels) return [];
    const out: { key: string; pt: Pt; text: string; color: string }[] = [];
    for (const part of parts) {
      const all = new Set(metaEdges(family, part.type).map((s) => s.major));
      for (const mid of physicalEdgeMidpoints(family, part.type, all)) {
        out.push({
          key: `${part.type}.${mid.index}`,
          pt: transPt(part.xform, mid.pt),
          text: mid.label.raw,
          color: edgeClassColor(mid.label.major),
        });
      }
    }
    return out;
  }, [parts, family, showEdgeLabels]);

  const oddParts = useMemo(() => {
    if (!markOdd || !selectedEdges) return new Set<string>();
    const out = new Set<string>();
    for (const part of parts) {
      const n = tileConnectionPoints(family, part.type, selectedEdges, contracts).length;
      if (n % 2 !== 0) out.add(part.type);
    }
    return out;
  }, [markOdd, parts, family, selectedEdges, contracts]);

  const toLocal = useCallback((clientX: number, clientY: number): Pt | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM?.();
    if (!svg || !ctm) return null;
    const inverse = ctm.inverse();
    const p = svg.createSVGPoint ? svg.createSVGPoint() : null;
    if (!p) return null;
    p.x = clientX;
    p.y = clientY;
    const out = p.matrixTransform(inverse);
    return { x: out.x, y: out.y };
  }, []);

  const setHover = useCallback(
    (entry: SeamEntry | null) => {
      setHovered(entry?.ref.metaEdgeId ?? null);
      onEdgeHover?.(entry?.ref ?? null);
    },
    [onEdgeHover],
  );

  const landingSpots = useMemo(() => {
    if (!drag) return [];
    return seams.filter(
      (s) =>
        s.dot &&
        s.ref.metaEdgeId !== drag.from.metaEdgeId &&
        (!validTargets || validTargets.includes(s.ref.metaEdgeId)),
    );
  }, [drag, seams, validTargets]);

  const onEdgePointerDown = useCallback(
    (entry: SeamEntry) => (event: React.PointerEvent) => {
      if (interaction !== 'chord-draw' || !entry.dot) return;
      event.stopPropagation();
      const at = toLocal(event.clientX, event.clientY) ?? entry.dot;
      (event.currentTarget as Element & { setPointerCapture?(id: number): void }).setPointerCapture?.(
        event.pointerId,
      );
      setDrag({ from: entry.ref, at, snap: null });
    },
    [interaction, toLocal],
  );

  const onSurfacePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!drag) return;
      const at = toLocal(event.clientX, event.clientY);
      if (!at) return;
      let snap: EdgeRef | null = null;
      let best = snapRadius;
      for (const s of landingSpots) {
        if (!s.dot) continue;
        const d = dist(at, s.dot);
        if (d < best) {
          best = d;
          snap = s.ref;
        }
      }
      setDrag({ from: drag.from, at, snap });
    },
    [drag, landingSpots, snapRadius, toLocal],
  );

  const onSurfacePointerUp = useCallback(() => {
    if (!drag) return;
    if (drag.snap) onChordDrawn?.(drag.from, drag.snap);
    setDrag(null);
  }, [drag, onChordDrawn]);

  const activateEdge = useCallback(
    (entry: SeamEntry) => {
      if (interaction === 'edge-select' || interaction === 'chord-draw') onEdgeClick?.(entry.ref);
    },
    [interaction, onEdgeClick],
  );

  const interactive = interaction !== 'none';
  const label = ariaLabel ?? `${tileType} tile`;
  const style = typeof size === 'number' ? { width: size, height: size } : { width: size, height: size };

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={label}
      className={[
        'tile-view',
        dimmed ? 'is-dimmed' : '',
        interactive ? 'is-interactive' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      viewBox={`${box.min.x} ${box.min.y} ${vbW} ${vbH}`}
      style={style}
      data-tile-type={tileType}
      data-family={family}
      onPointerMove={drag ? onSurfacePointerMove : undefined}
      onPointerUp={drag ? onSurfacePointerUp : undefined}
      onPointerLeave={drag ? onSurfacePointerUp : undefined}
      onKeyDown={
        onMatchingCycle
          ? (e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onMatchingCycle(1);
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onMatchingCycle(-1);
            }
          : undefined
      }
      tabIndex={onMatchingCycle ? 0 : undefined}
    >
      <g className="tile-fill">
        {parts.map((part) => (
          <path
            key={part.type}
            className={['tile-shape', oddParts.has(part.type) ? 'is-odd' : '']
              .filter(Boolean)
              .join(' ')}
            d={tileOutline(family, part.type, curvy)}
            transform={svgMatrixString(part.xform)}
            fill={tileColor(part.type, colorScheme, customColors)}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth={Math.max(0.02, strokeUnit * 0.6)}
            strokeLinejoin="round"
          />
        ))}
      </g>

      <g className="meta-edges">
        {seams.map((entry) => {
          const isHovered = hovered === entry.ref.metaEdgeId;
          const isHighlighted = highlightMajors?.has(entry.ref.major) ?? false;
          const isSelected = selectedEdges?.has(entry.ref.major) ?? false;
          return (
            <g
              key={entry.ref.metaEdgeId}
              className={[
                'meta-edge',
                isHovered ? 'is-hovered' : '',
                isHighlighted ? 'is-highlighted' : '',
                isSelected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-edge-id={entry.ref.metaEdgeId}
              data-major={entry.ref.major}
              data-sign={entry.ref.sign}
              data-panzoom-ignore={interactive ? '' : undefined}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? 'button' : undefined}
              aria-label={`class ${entry.ref.major} seam (${entry.ref.label.raw})`}
              onPointerEnter={interactive ? () => setHover(entry) : undefined}
              onPointerLeave={interactive ? () => setHover(null) : undefined}
              onPointerDown={interactive ? onEdgePointerDown(entry) : undefined}
              onClick={interactive ? () => activateEdge(entry) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activateEdge(entry);
                      }
                    }
                  : undefined
              }
            >
              <path
                className="edge-hit"
                d={polylineD(entry.polyline)}
                fill="none"
                stroke="transparent"
                strokeWidth={hitWidth}
                strokeLinecap="round"
                pointerEvents={interactive ? 'stroke' : 'none'}
              />
              <path
                className="edge-visual"
                d={polylineD(entry.polyline)}
                fill="none"
                stroke={entry.color}
                strokeWidth={strokeUnit * 1.6}
                strokeLinecap="round"
                pointerEvents="none"
              />
              {entry.dot ? (
                <circle
                  className="edge-dot"
                  cx={entry.dot.x}
                  cy={entry.dot.y}
                  r={0.15}
                  fill={entry.color}
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth={0.03}
                  pointerEvents="none"
                />
              ) : null}
            </g>
          );
        })}
      </g>

      <g className="matching-chords">
        {chords.map((c) => (
          <line
            key={c.key}
            className={c.ghost ? 'chord is-ghost' : 'chord'}
            x1={c.from.x}
            y1={c.from.y}
            x2={c.to.x}
            y2={c.to.y}
            stroke="#111"
            strokeOpacity={c.ghost ? 0.1 : 0.9}
            strokeWidth={c.ghost ? strokeUnit : strokeUnit * 1.8}
            strokeLinecap="round"
          />
        ))}
      </g>

      <g className="overlays">
        {overlayChords.map((c) => (
          <line
            key={c.key}
            className="overlay-chord"
            x1={c.from.x}
            y1={c.from.y}
            x2={c.to.x}
            y2={c.to.y}
            stroke="#0b6bcb"
            strokeWidth={strokeUnit * 1.6}
            strokeLinecap="round"
          />
        ))}
        {drag ? (
          <>
            {landingSpots.map((s) => (
              <circle
                key={`land-${s.ref.metaEdgeId}`}
                className={[
                  'landing-spot',
                  drag.snap?.metaEdgeId === s.ref.metaEdgeId ? 'is-snapped' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                cx={(s.dot as Pt).x}
                cy={(s.dot as Pt).y}
                r={drag.snap?.metaEdgeId === s.ref.metaEdgeId ? 0.4 : 0.28}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeUnit}
                pointerEvents="none"
              />
            ))}
            <line
              className="ghost-chord"
              x1={(seamById.get(drag.from.metaEdgeId)?.dot ?? drag.at).x}
              y1={(seamById.get(drag.from.metaEdgeId)?.dot ?? drag.at).y}
              x2={drag.snap ? (seamById.get(drag.snap.metaEdgeId)?.dot ?? drag.at).x : drag.at.x}
              y2={drag.snap ? (seamById.get(drag.snap.metaEdgeId)?.dot ?? drag.at).y : drag.at.y}
              stroke={edgeClassColor(drag.from.major)}
              strokeWidth={strokeUnit * 1.6}
              strokeDasharray={`${strokeUnit * 3} ${strokeUnit * 2}`}
              strokeLinecap="round"
              pointerEvents="none"
            />
          </>
        ) : null}
      </g>

      <g className="edge-labels">
        {labels.map((l) => (
          <text
            key={l.key}
            x={l.pt.x}
            y={l.pt.y}
            fontSize={0.26}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={l.color}
            stroke="rgba(0,0,0,0.75)"
            strokeWidth={0.02}
            paintOrder="stroke"
            pointerEvents="none"
          >
            {l.text}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Fallback dot position for overlay endpoints whose class is not selected. */
function contractPoint(
  part: TilePart,
  seam: MetaEdge,
  contracts: EdgeContracts,
  family: TileFamilyId,
): Pt | null {
  const points = tileConnectionPoints(family, part.type, new Set([seam.major]), contracts);
  const hit = points.find((p) => p.edge.id === seam.id);
  return hit ? transPt(part.xform, hit.pt) : null;
}

export default TileView;
