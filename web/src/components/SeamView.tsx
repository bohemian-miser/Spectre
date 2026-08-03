/**
 * `SeamView` — two tiles shaking hands across one seam (DESIGN.md §6.3).
 *
 * Tile B is posed by solving the gluing transform (`lib/seam.ts`): a
 * reflection-free rigid motion mapping B's `-k` meta-edge polyline onto A's
 * `+k` polyline reversed. The shared crossing dot is rendered ONCE but computed
 * independently from each tile's contract; `sharedDotError` is surfaced in dev
 * builds, which makes this widget a living test of the §3.3 mirror rule.
 */

import { useMemo, useState } from 'react';
import {
  DEFAULT_CONTRACTS,
  mul,
  physicalEdgeMidpoints,
  svgMatrixString,
  transPt,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { edgeClassColor, tileColor } from '../lib/palette';
import { poseSeam } from '../lib/seam';
import { boxOfPoints, boxSize, expandBox } from '../lib/viewport';
import { polylineD, seamPolyline, tileOutline, tileParts } from '../lib/tilingModel';

export interface SeamViewProps {
  readonly family: TileFamilyId;
  readonly tileA: TileTypeId;
  /** Edge class of the seam, e.g. 2. */
  readonly seamMajor: number;
  /** Pin the neighbour; otherwise a compatible leaf type is chosen. */
  readonly tileB?: TileTypeId;
  readonly contracts?: EdgeContracts;
  readonly curvy?: boolean;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  /** `2.0A/2.1A/2.2A` on A's side, `-2.2A/-2.1A/-2.0A` on B's. */
  readonly showLabels?: boolean;
  /** The single crossing dot both tiles agree on. */
  readonly showSharedDot?: boolean;
  readonly interaction?: 'none' | 'hover';
  onSeamHover?(hovering: boolean): void;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly className?: string;
}

const PAD = 0.6;

export function SeamView(props: SeamViewProps): JSX.Element {
  const {
    family,
    tileA,
    seamMajor,
    tileB,
    contracts = DEFAULT_CONTRACTS,
    curvy = false,
    colorScheme = 'bright',
    customColors,
    showLabels = false,
    showSharedDot = true,
    interaction = 'hover',
    onSeamHover,
    width = '100%',
    height = 260,
    className,
  } = props;

  const [hover, setHover] = useState(false);

  const pose = useMemo(
    () => poseSeam(family, tileA, seamMajor, { tileB, contracts }),
    [family, tileA, seamMajor, tileB, contracts],
  );

  const geometry = useMemo(() => {
    if (!pose) return null;
    const partsA = tileParts(family, pose.typeA);
    const partsB = tileParts(family, pose.typeB);
    const all = [
      ...partsA.flatMap((p) => p.pts.map((q) => transPt(p.xform, q))),
      ...partsB.flatMap((p) => p.pts.map((q) => transPt(pose.xformB, transPt(p.xform, q)))),
    ];
    const box = expandBox(boxOfPoints(all), PAD);
    const chainA = seamPolyline(partsA[0].pts, pose.seamA);
    const chainB = seamPolyline(partsB[0].pts, pose.seamB).map((p) => transPt(pose.xformB, p));
    return { partsA, partsB, box, chainA, chainB };
  }, [pose, family]);

  if (!pose || !geometry) {
    return (
      <div className={['seam-view', 'is-empty', className ?? ''].filter(Boolean).join(' ')}>
        No class-{seamMajor} seam on {tileA}.
      </div>
    );
  }

  const { box } = geometry;
  const { width: vbW, height: vbH } = boxSize(box);
  const color = edgeClassColor(seamMajor);
  const strokeUnit = 0.06;

  const labelsA = showLabels
    ? physicalEdgeMidpoints(family, pose.typeA, new Set([seamMajor])).filter(
        (m) => m.label.sign === pose.seamA.sign,
      )
    : [];
  const labelsB = showLabels
    ? physicalEdgeMidpoints(family, pose.typeB, new Set([seamMajor]))
        .filter((m) => m.label.sign === pose.seamB.sign)
        .map((m) => ({ ...m, pt: transPt(pose.xformB, m.pt) }))
    : [];

  const hovering = interaction === 'hover' && hover;

  return (
    <svg
      className={['seam-view', hovering ? 'is-hovered' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`${pose.typeA} glued to ${pose.typeB} along a class ${seamMajor} seam`}
      viewBox={`${box.min.x} ${box.min.y} ${vbW} ${vbH}`}
      width={width}
      height={height}
      data-seam-major={seamMajor}
      data-tile-a={pose.typeA}
      data-tile-b={pose.typeB}
      data-shared-dot-error={pose.sharedDotError.toFixed(6)}
    >
      <g className="seam-tile seam-tile-a">
        {geometry.partsA.map((part) => (
          <path
            key={`a-${part.type}`}
            d={tileOutline(family, part.type, curvy)}
            transform={svgMatrixString(part.xform)}
            fill={tileColor(part.type, colorScheme, customColors)}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={0.05}
          />
        ))}
      </g>
      <g className="seam-tile seam-tile-b">
        {geometry.partsB.map((part) => (
          <path
            key={`b-${part.type}`}
            d={tileOutline(family, part.type, curvy)}
            transform={svgMatrixString(mul(pose.xformB, part.xform))}
            fill={tileColor(part.type, colorScheme, customColors)}
            fillOpacity={0.85}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={0.05}
          />
        ))}
      </g>

      <g
        className="seam-highlight"
        data-panzoom-ignore=""
        onPointerEnter={
          interaction === 'hover'
            ? () => {
                setHover(true);
                onSeamHover?.(true);
              }
            : undefined
        }
        onPointerLeave={
          interaction === 'hover'
            ? () => {
                setHover(false);
                onSeamHover?.(false);
              }
            : undefined
        }
      >
        <path
          className="seam-hit"
          d={polylineD(geometry.chainA)}
          fill="none"
          stroke="transparent"
          strokeWidth={0.7}
          pointerEvents={interaction === 'hover' ? 'stroke' : 'none'}
        />
        <path
          className="seam-line seam-line-a"
          d={polylineD(geometry.chainA)}
          fill="none"
          stroke={color}
          strokeWidth={hovering ? strokeUnit * 2.2 : strokeUnit * 1.3}
          strokeLinecap="round"
          pointerEvents="none"
        />
        <path
          className="seam-line seam-line-b"
          d={polylineD(geometry.chainB)}
          fill="none"
          stroke={color}
          strokeWidth={hovering ? strokeUnit * 2.2 : strokeUnit * 1.3}
          strokeDasharray={`${strokeUnit * 4} ${strokeUnit * 3}`}
          strokeLinecap="round"
          pointerEvents="none"
        />
      </g>

      {showSharedDot ? (
        <circle
          className="seam-shared-dot"
          cx={pose.sharedPoint.x}
          cy={pose.sharedPoint.y}
          r={0.18}
          fill={color}
          stroke="#000"
          strokeWidth={0.035}
        />
      ) : null}

      {showLabels ? (
        <g className="edge-labels">
          {[...labelsA, ...labelsB].map((m, i) => (
            <text
              key={`${m.label.raw}-${i}`}
              x={m.pt.x}
              y={m.pt.y}
              fontSize={0.24}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              stroke="rgba(0,0,0,0.8)"
              strokeWidth={0.02}
              paintOrder="stroke"
            >
              {m.label.raw}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  );
}

export default SeamView;
