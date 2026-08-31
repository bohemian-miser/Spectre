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
  /**
   * When a part's crossings cannot all pair up (odd count), pair what can be
   * paired and draw the leftover as a dangling stub — a tail. Without this,
   * odd parts draw no strokes at all.
   */
  readonly hangTails?: boolean;
  readonly overlays?: readonly OverlayChord[];
  readonly overlaysByType?: Readonly<Record<string, readonly OverlayChord[]>>;
  /** Externally driven glow, e.g. palette-wide hover sync. */
  readonly highlightMajors?: ReadonlySet<number>;
  readonly dimmed?: boolean;
  /** Pulse tiles that can never be fully paired (odd connection count). */
  readonly markOdd?: boolean;
  /**
   * Small MAJOR-class numbers on every physical edge — majors only, so an edge
   * carrying 7a and 7b just reads "7". Classes outside `selectedEdges` are
   * drawn very faint rather than hidden, so the rule reads as a choice among
   * all of them rather than a bare handful.
   */
  readonly showMajorNumbers?: boolean;
  /** The tile's own name, faintly, over each part. */
  readonly showTileName?: boolean;

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
  /** True seam geometry — what the dots, chords and labels are placed from. */
  readonly polyline: readonly Pt[];
  /** The same seam pulled back from both ends, for stroking and hit-testing. */
  readonly display: readonly Pt[];
  readonly dot: Pt | null;
  readonly color: string;
}

const PAD = 0.55;
/**
 * Gap left at each end of a drawn seam, in world units (a tile edge is 1).
 * Two seams meeting at a vertex are two different handshakes, and drawn
 * end-to-end they read as one long stroke.
 */
const SEAM_TRIM = 0.1;
/** How far outside the tile a major-class number floats, in world units. */
const NUMBER_OFFSET = 0.34;

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
    showMajorNumbers = false,
    showTileName = false,
    matchingIndex,
    matchingIndexByType,
    ghostMatchings = false,
    hangTails = false,
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
        const world = local.map((p) => transPt(part.xform, p));
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
          polyline: world,
          display: trimPolyline(world, SEAM_TRIM),
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

  /**
   * Chords of the active matching, per part — plus, with `hangTails`, the
   * dangling stub of a part whose crossings cannot all pair up.
   */
  const { chords, tails } = useMemo(() => {
    const chordsOut: { key: string; from: Pt; to: Pt; ghost: boolean }[] = [];
    const tailsOut: { key: string; d: string; end: Pt }[] = [];
    for (const part of parts) {
      if (!selectedEdges) continue;
      const points = tileConnectionPoints(family, part.type, selectedEdges, contracts);
      const world = points.map((p) => transPt(part.xform, p.pt));

      if (points.length >= 2 && points.length % 2 === 0) {
        const all = enumerateMatchings(points.length);
        const idx =
          matchingIndexByType?.[part.type] ?? (parts.length === 1 ? matchingIndex ?? 0 : 0);

        if (ghostMatchings) {
          all.forEach((m, mi) => {
            if (mi === idx) return;
            m.forEach(([a, b], k) =>
              chordsOut.push({
                key: `g${part.type}.${mi}.${k}`,
                from: world[a],
                to: world[b],
                ghost: true,
              }),
            );
          });
        }
        const active = all[idx];
        if (active) {
          active.forEach(([a, b], k) =>
            chordsOut.push({ key: `m${part.type}.${k}`, from: world[a], to: world[b], ghost: false }),
          );
        }
      } else if (hangTails && points.length % 2 === 1) {
        // Points come in cyclic order, so pairing neighbours (0,1), (2,3), …
        // never crosses itself; the leftover crossing hangs.
        for (let i = 0; i + 1 < world.length; i += 2) {
          chordsOut.push({
            key: `m${part.type}.${i}`,
            from: world[i],
            to: world[i + 1],
            ghost: false,
          });
        }
        tailsOut.push({ key: `t${part.type}`, ...tailStub(world[world.length - 1], part) });
      }
    }
    return { chords: chordsOut, tails: tailsOut };
  }, [
    parts,
    family,
    selectedEdges,
    contracts,
    matchingIndex,
    matchingIndexByType,
    ghostMatchings,
    hangTails,
  ]);

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

  /**
   * One major-class number per SEAM, at the seam's halfway point, whether or
   * not the class is part of the rule — the selection only decides how loudly
   * each is drawn. Per seam, not per physical edge: a class-2 seam is three
   * edges walking in single file, and "2 2 2" reads as three seams.
   */
  const majorNumbers = useMemo(() => {
    if (!showMajorNumbers) return [];
    const outlines = new Map<string, readonly Pt[]>(
      parts.map((part) => [part.type, part.pts.map((q) => transPt(part.xform, q))]),
    );
    return seams.map((entry) => {
      const { pt, dir } = midpointFrame(entry.polyline);
      const outline = outlines.get(entry.ref.tileType) ?? [];
      // Perpendicular to the seam, pointing whichever way leaves the tile —
      // a probe just off the edge settles which of the two that is, and gets
      // it right on the Spectre's concave corners too.
      let nx = dir.y;
      let ny = -dir.x;
      if (pointInPolygon({ x: pt.x + nx * 0.08, y: pt.y + ny * 0.08 }, outline)) {
        nx = -nx;
        ny = -ny;
      }
      return {
        key: entry.ref.metaEdgeId,
        pt: { x: pt.x + nx * NUMBER_OFFSET, y: pt.y + ny * NUMBER_OFFSET },
        text: String(entry.ref.major),
        color: entry.color,
        on: selectedEdges?.has(entry.ref.major) ?? false,
      };
    });
  }, [seams, parts, showMajorNumbers, selectedEdges]);

  const tileNames = useMemo(() => {
    if (!showTileName) return [];
    return parts.map((part) => {
      // Centroid of the outline: close enough to "the middle of the tile" for
      // a label, and it needs no extra geometry.
      let sx = 0;
      let sy = 0;
      for (const p of part.pts) {
        const q = transPt(part.xform, p);
        sx += q.x;
        sy += q.y;
      }
      const n = Math.max(1, part.pts.length);
      return { key: part.type, pt: { x: sx / n, y: sy / n }, text: part.type };
    });
  }, [parts, showTileName]);

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

      <g className="tile-names" pointerEvents="none">
        {tileNames.map((t) => (
          <text
            key={t.key}
            x={t.pt.x}
            y={t.pt.y}
            fontSize={0.42}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f4f6fb"
            fillOpacity={0.34}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={0.03}
            paintOrder="stroke"
            data-tile-name={t.text}
          >
            {t.text}
          </text>
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
                d={polylineD(entry.display)}
                fill="none"
                stroke="transparent"
                strokeWidth={hitWidth}
                strokeLinecap="round"
                pointerEvents={interactive ? 'stroke' : 'none'}
              />
              <path
                className="edge-visual"
                d={polylineD(entry.display)}
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
            // Decorative: a chord drawn between two dots sits exactly where the
            // user must press to start a chord-draw gesture (stage-3 bugfix).
            pointerEvents="none"
          />
        ))}
        {tails.map((t) => (
          <g key={t.key} className="chord-tail" pointerEvents="none">
            <path
              className="chord is-tail"
              d={t.d}
              fill="none"
              stroke="#111"
              strokeOpacity={0.9}
              strokeWidth={strokeUnit * 1.8}
              strokeLinecap="round"
            />
            <circle
              className="tail-end"
              cx={t.end.x}
              cy={t.end.y}
              r={strokeUnit * 2.2}
              fill="#ff3b30"
            />
          </g>
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
            pointerEvents="none"
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

      <g className="major-numbers" pointerEvents="none">
        {majorNumbers.map((l) => (
          <text
            key={l.key}
            x={l.pt.x}
            y={l.pt.y}
            fontSize={0.38}
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={l.color}
            // In the rule: legible. Out of it: present, but clearly not part
            // of what is being edited.
            fillOpacity={l.on ? 0.95 : 0.38}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={0.025}
            paintOrder="stroke"
            // Not `data-major`: the seam paths already use that for the
            // class they belong to, and two meanings for one name is a trap.
            data-major-number={l.text}
            data-major-on={l.on ? '1' : '0'}
          >
            {l.text}
          </text>
        ))}
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

/** Segment lengths of a polyline, and their total. */
function arcLengths(pts: readonly Pt[]): { segs: number[]; total: number } {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    segs.push(d);
    total += d;
  }
  return { segs, total };
}

/** The point a given arc length along a polyline, and the direction there. */
function pointAtLength(
  pts: readonly Pt[],
  segs: readonly number[],
  target: number,
): { pt: Pt; dir: Pt } {
  let remaining = target;
  for (let i = 0; i < segs.length; i++) {
    if (segs[i] > 0 && remaining <= segs[i]) {
      const a = pts[i];
      const b = pts[i + 1];
      const t = remaining / segs[i];
      return {
        pt: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        dir: { x: (b.x - a.x) / segs[i], y: (b.y - a.y) / segs[i] },
      };
    }
    remaining -= segs[i];
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] ?? last;
  const d = dist(prev, last) || 1;
  return { pt: last, dir: { x: (last.x - prev.x) / d, y: (last.y - prev.y) / d } };
}

/** Halfway along a polyline: where a seam's number is anchored. */
function midpointFrame(pts: readonly Pt[]): { pt: Pt; dir: Pt } {
  if (pts.length === 0) return { pt: { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
  if (pts.length === 1) return { pt: pts[0], dir: { x: 1, y: 0 } };
  const { segs, total } = arcLengths(pts);
  if (total <= 0) return { pt: pts[0], dir: { x: 1, y: 0 } };
  return pointAtLength(pts, segs, total / 2);
}

/**
 * The polyline pulled back from both ends, keeping its middle vertices. Never
 * eats more than a third of a seam, so class 8's single short edge survives.
 */
function trimPolyline(pts: readonly Pt[], trim: number): readonly Pt[] {
  if (pts.length < 2 || trim <= 0) return pts;
  const { segs, total } = arcLengths(pts);
  if (total <= 0) return pts;
  const cut = Math.min(trim, total / 3);
  const head = pointAtLength(pts, segs, cut).pt;
  const tail = pointAtLength(pts, segs, total - cut).pt;
  const middle: Pt[] = [];
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    acc += segs[i];
    if (acc > cut && acc < total - cut) middle.push(pts[i + 1]);
  }
  return [head, ...middle, tail];
}

/** Ray-casting containment test — which side of a seam is out of the tile. */
function pointInPolygon(pt: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Path of a dangling tail: a stub from the unpaired crossing that heads for
 * the part's interior, droops a little, and stops. `end` is where it gives up.
 */
function tailStub(from: Pt, part: TilePart): { d: string; end: Pt } {
  let cx = 0;
  let cy = 0;
  for (const p of part.pts) {
    const q = transPt(part.xform, p);
    cx += q.x;
    cy += q.y;
  }
  const n = Math.max(1, part.pts.length);
  const dx = cx / n - from.x;
  const dy = cy / n - from.y;
  const reach = Math.hypot(dx, dy) || 1;
  const len = Math.min(1.05, reach * 0.6);
  const ux = dx / reach;
  const uy = dy / reach;
  const end: Pt = { x: from.x + ux * len, y: from.y + uy * len };
  const bend: Pt = {
    x: (from.x + end.x) / 2 - uy * len * 0.22,
    y: (from.y + end.y) / 2 + ux * len * 0.22,
  };
  return { d: `M ${from.x} ${from.y} Q ${bend.x} ${bend.y} ${end.x} ${end.y}`, end };
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
