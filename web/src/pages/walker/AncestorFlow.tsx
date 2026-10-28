/**
 * The ancestor stacks still possible, bundled: one row per level (the tile,
 * its parent, its grandparent, …), one column per type. A dot is the stacks
 * with that type at that level; a line, the stacks going from one type to
 * the next level's type, as wide as how many there are. `shown` is drawn
 * over `behind` (drawn faint), so a choice, or a landing hovered, shows which
 * of the stacks behind it keeps, at every level.
 */
import { useMemo } from 'react';

import { HEX_TYPES, type HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import type { World } from './possible';

interface Bundles {
  readonly total: number;
  readonly depth: number;
  /** level -> type -> stacks (level 0 is the tile) */
  readonly nodes: readonly Map<HexType, number>[];
  /** `level type type` (the type at level and at level + 1) -> stacks */
  readonly lines: ReadonlyMap<string, number>;
}

function bundle(start: HexType, worlds: readonly World[]): Bundles {
  const nodes: Map<HexType, number>[] = [];
  const lines = new Map<string, number>();
  let depth = 0;
  for (const w of worlds) {
    const types = [start, ...w.chain.map((l) => l.parent)];
    depth = Math.max(depth, types.length);
    types.forEach((t, k) => {
      const m = nodes[k] ?? (nodes[k] = new Map());
      m.set(t, (m.get(t) ?? 0) + 1);
      if (k + 1 < types.length) {
        const key = `${k} ${t} ${types[k + 1]}`;
        lines.set(key, (lines.get(key) ?? 0) + 1);
      }
    });
  }
  return { total: worlds.length, depth, nodes, lines };
}

const COL = 30;
const ROW = 24;
const LEFT = 26;
const TOP = 16;

export function AncestorFlow({ start, shown, behind }: { start: HexType; shown: readonly World[]; behind?: readonly World[] | null }): JSX.Element {
  const front = useMemo(() => bundle(start, shown), [start, shown]);
  const back = useMemo(() => (behind && behind !== shown ? bundle(start, behind) : null), [start, behind, shown]);
  const total = Math.max(front.total, back?.total ?? 0, 1);
  const depth = Math.max(front.depth, back?.depth ?? 0);
  const x = (t: HexType): number => LEFT + HEX_TYPES.indexOf(t) * COL + COL / 2;
  const y = (k: number): number => TOP + k * ROW + ROW / 2;
  const lineW = (n: number): number => Math.max(0.5, 9 * Math.sqrt(n / total));
  const dotR = (n: number): number => Math.max(2, 9 * Math.sqrt(n / total));
  const width = LEFT + HEX_TYPES.length * COL + 4;
  const height = TOP + depth * ROW + 4;

  const draw = (b: Bundles, cls: string) => (
    <g className={cls}>
      {[...b.lines].map(([key, n]) => {
        const [k, from, to] = key.split(' ');
        const x1 = x(from as HexType), y1 = y(Number(k)), x2 = x(to as HexType), y2 = y(Number(k) + 1);
        return <path key={key} d={`M${x1} ${y1} C${x1} ${y1 + ROW / 2} ${x2} ${y2 - ROW / 2} ${x2} ${y2}`} strokeWidth={lineW(n)} strokeOpacity={0.25 + 0.75 * Math.sqrt(n / total)} className="wk-flow__line"><title>{`${n.toLocaleString('en-US')} stacks: ${from} at ${levelName(Number(k))}, ${to} above it`}</title></path>;
      })}
      {b.nodes.map((m, k) => [...m].map(([t, n]) => (
        <circle key={`${k}${t}`} cx={x(t)} cy={y(k)} r={dotR(n)} fill={tileColor(t)} className="wk-flow__dot"><title>{`${levelName(k)}: ${t} in ${n.toLocaleString('en-US')} stacks`}</title></circle>
      )))}
    </g>
  );

  return (
    <svg className="wk-flow" width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-testid="wk-flow" data-stacks={front.total}>
      {HEX_TYPES.map((t) => <text key={t} x={x(t)} y={9} textAnchor="middle" className="wk-flow__head">{t.slice(0, 2)}</text>)}
      {Array.from({ length: depth }, (_, k) => <text key={k} x={LEFT - 6} y={y(k)} textAnchor="end" dominantBaseline="central" className="wk-flow__level">{k}</text>)}
      {back && draw(back, 'wk-flow__behind')}
      {draw(front, 'wk-flow__shown')}
    </svg>
  );
}

const levelName = (k: number): string => (k === 0 ? 'the tile' : k === 1 ? 'parent' : k === 2 ? 'grandparent' : `level ${k}`);

export default AncestorFlow;
