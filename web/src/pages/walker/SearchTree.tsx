/**
 * The tree of choices as explored so far, drawn top down and fitted to the
 * width: one row per choice from the start, each node a hexagon in its
 * landing's colour, centred over the leaves below it, so the tree zooms out
 * as it grows. A branch that closes is ringed in its circuit's colour, one
 * that gave up or left the patch is ringed dashed, a node not yet walked is
 * faint, and one cut as not a circuit's first reading fainter. The way down
 * to the node a search is walking is drawn in orange.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { tileColor } from '../../lib/palette';
import type { HexType } from '../../core';
import { circuitKey, type Found } from './circuits';
import type { Seen } from './possible';
import type { SearchNode } from './search';

const HEIGHT = 420;

const keys = new WeakMap<readonly Seen[], string>();
const keyOf = (seen: readonly Seen[]): string => keys.get(seen) ?? keys.set(seen, circuitKey(seen)).get(seen)!;

/** A colour per circuit, by the order the search found it. */
export const circuitColor = (i: number): string => `hsl(${(i * 137.5) % 360} 65% 45%)`;

const hexPoints = (cx: number, cy: number, r: number): string =>
  [0, 1, 2, 3, 4, 5].map((k) => { const a = (Math.PI / 3) * k; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');

export function SearchTree({ nodes: tree, version, start, found, highlight, route, onHoverNode, onGoto }: {
  /** The search's tree (`SearchTreeData`), which grows in place; `version` says it has. */
  nodes: readonly SearchNode[];
  version: number;
  start: HexType;
  found: readonly Found[];
  /** A circuit's key: its branches are ringed and the rest fade. */
  highlight?: string | null;
  /** The way down to the nodes the search is walking. */
  route?: ReadonlySet<number>;
  onHoverNode?: (id: number | null) => void;
  onGoto?: (id: number) => void;
}): JSX.Element {
  const box = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 1000));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const drawn = useMemo(() => {
    const n = tree.length;
    // children are made after their parents: one pass down the ids counts leaves, one up places them
    const leaves = new Float64Array(n);
    for (let id = n - 1; id >= 0; id--) {
      const ch = tree[id].children;
      leaves[id] = ch.length ? ch.reduce((a, c) => a + leaves[c], 0) : 1;
    }
    const x0 = new Float64Array(n);
    const depth = new Int32Array(n);
    for (let id = 0; id < n; id++) {
      let at = x0[id];
      for (const c of tree[id].children) { x0[c] = at; depth[c] = depth[id] + 1; at += leaves[c]; }
    }
    const deepest = Math.max(...depth);
    const row = Math.max(12, Math.min(44, (HEIGHT - 24) / Math.max(1, deepest)));
    const u = (width - 8) / leaves[0];
    const index = new Map(found.map((f, i) => [f.key, i]));
    const nodes = tree.slice(0, n).map((node) => {
      const end = node.end;
      const key = end?.status === 'closed' && end.seen ? keyOf(end.seen) : null;
      const type = node.parent === null ? start : node.key && /^[A-Z]/.test(node.key) ? node.key.split(' ')[0] : null;
      const r = Math.max(1.5, Math.min(10, row * 0.38, u * leaves[node.id] * 0.45));
      return {
        id: node.id, parent: node.parent, cx: 4 + u * (x0[node.id] + leaves[node.id] / 2), cy: 12 + depth[node.id] * row, r,
        type, key, ring: key !== null ? circuitColor(index.get(key) ?? 0) : null,
        state: end ? (end.status === 'closed' ? 'closed' : end.status === 'cut' ? 'cut' : 'open') : node.fork ? 'walked' : 'waiting',
      };
    });
    return { nodes, height: 24 + deepest * row };
  }, [tree, version, start, found, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const { nodes, height } = drawn;
  return (
    <div className="wk-stree" ref={box} data-testid="wk-stree" data-nodes={nodes.length}>
      <svg width={width} height={height} className={highlight ? 'is-highlit' : ''} onMouseLeave={() => onHoverNode?.(null)}>
        {nodes.map((c) => {
          if (c.parent === null) return null;
          const p = nodes[c.parent];
          const y1 = p.cy + p.r, y2 = c.cy - c.r, m = (y1 + y2) / 2;
          return <path key={`e${c.id}`} d={`M${p.cx} ${y1} C${p.cx} ${m} ${c.cx} ${m} ${c.cx} ${y2}`} className={`wk-stree__edge${route?.has(c.id) ? ' is-searching' : ''}`} />;
        })}
        {nodes.map((c) => (
          <g
            key={c.id}
            className={`wk-stree__node is-${c.state}${highlight && c.key === highlight ? ' is-lit' : ''}${route?.has(c.id) ? ' is-searching' : ''}`}
            onMouseEnter={() => onHoverNode?.(c.id)}
            onClick={() => onGoto?.(c.id)}
          >
            {c.type
              ? <polygon points={hexPoints(c.cx, c.cy, c.r)} fill={tileColor(c.type as never)} className="wk-stree__hex" />
              : <circle cx={c.cx} cy={c.cy} r={c.r * 0.8} className="wk-stree__end" />}
            {c.ring && <circle cx={c.cx} cy={c.cy} r={c.r + 2.5} stroke={c.ring} className="wk-stree__ring" />}
            {c.state === 'open' && <circle cx={c.cx} cy={c.cy} r={c.r + 2.5} className="wk-stree__ring is-open" />}
            {c.r >= 8 && c.type && <text x={c.cx} y={c.cy} className="wk-stree__name" textAnchor="middle" dominantBaseline="central">{c.type.slice(0, 3)}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default SearchTree;
