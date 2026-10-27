/**
 * The machine, twice. First the pattern as a table: per tile type, its pairs
 * of edges `(a, b)`, the pair in use marked. Then, for one tile type, where
 * each exit lands: the tile type and edge across, for every ancestor stack,
 * and on hover the stacks themselves.
 *
 * Edges are named two ways. The position is 0 to 5 round the hexagon,
 * counted from the flag; the class label (`+2A`) is what has to match: an
 * edge of class +c only ever meets an edge of class −c.
 */
import { useMemo, useState } from 'react';

import { HEX_TYPES, matchingAt, slotsOfType, type HexType, type Link, type TileTypeId } from '../../core';
import { TileGlyph } from '../../components/TileGlyph';
import { HEX_CENTRE, HEX_OUTLINE, edgeLabelAt, orientationPath, pairingD } from '../../lib/hexBoard';
import { tileColor } from '../../lib/palette';
import { classLabel, landings, type Landing } from './landings';
import type { Pattern } from './walk';

const IDENT: [number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0];

/** The pairs of a type's pattern, as edge positions, smaller first. */
export function pairsOf(type: HexType, subset: readonly number[], matching: number): [number, number][] {
  const seams = slotsOfType('hex', type as TileTypeId, subset);
  if (seams.length < 2 || seams.length % 2) return [];
  return (matchingAt(seams.length, matching) ?? []).map(([i, j]) => [seams[i].edge, seams[j].edge].sort((x, y) => x - y) as [number, number]).sort((x, y) => x[0] - y[0]);
}

function Swatch({ type }: { type: HexType }): JSX.Element {
  return <span className="wk__swatch" style={{ background: tileColor(type) }} />;
}

/** One hexagon with its edges named both ways: positions inside, class labels outside. */
function EdgeKey({ type, subset, matching }: { type: HexType; subset: readonly number[]; matching: number }): JSX.Element {
  const out = (e: number) => {
    const a = HEX_OUTLINE[e];
    const b = HEX_OUTLINE[(e + 1) % 6];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return { x: m.x + (m.x - HEX_CENTRE.x) * 0.55, y: m.y + (m.y - HEX_CENTRE.y) * 0.55 };
  };
  const inside = (e: number) => {
    const p = edgeLabelAt(IDENT, e);
    return { x: HEX_CENTRE.x + (p.x - HEX_CENTRE.x) * 0.45, y: HEX_CENTRE.y + (p.y - HEX_CENTRE.y) * 0.45 };
  };
  const carries = new Set(slotsOfType('hex', type as TileTypeId, subset).map((s) => s.edge));
  return (
    <svg className="wk__key" viewBox="-0.95 -0.6 2.9 2.95" data-testid="wk-edge-key">
      <polygon points={HEX_OUTLINE.map((p) => `${p.x},${p.y}`).join(' ')} fill={tileColor(type)} className="wk__key-tile" />
      <path d={pairingD(IDENT, type, subset, matching)} className="wk__key-chords" />
      <path d={orientationPath(IDENT)} className="wk__key-flag" />
      {[0, 1, 2, 3, 4, 5].map((e) => {
        const i = inside(e);
        const o = out(e);
        return (
          <g key={e} className={carries.has(e) ? 'is-carrying' : 'is-bare'}>
            <text x={i.x} y={i.y} className="wk__key-pos" textAnchor="middle" dominantBaseline="central">{e}</text>
            <text x={o.x} y={o.y} className="wk__key-class" textAnchor="middle" dominantBaseline="central">{classLabel(type, e)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackRow({ type, stack }: { type: HexType; stack: readonly Link[] }): JSX.Element {
  return (
    <li className="wk__stack">
      <Swatch type={type} />{type}
      {stack.map((l, k) => (
        <span key={k}> → slot {l.slot} of <Swatch type={l.parent} />{l.parent}{k === stack.length - 1 ? <span className="td__hint"> (glued inside)</span> : ''}</span>
      ))}
    </li>
  );
}

export interface MachineViewProps {
  readonly pattern: Pattern;
  readonly byType: ReadonlyMap<HexType, number>;
  /** The tile the walk is on and the edge it came in through, to mark the pair in use. */
  readonly current: { readonly type: HexType; readonly entry: number | null } | null;
}

export function MachineView({ pattern, byType, current }: MachineViewProps): JSX.Element {
  const [pinned, setPinned] = useState<HexType | null>(null);
  const [hovered, setHovered] = useState<HexType | null>(null);
  const [depth, setDepth] = useState(4);
  const [hoverLanding, setHoverLanding] = useState<{ edge: number; landing: Landing } | null>(null);
  const [pinLanding, setPinLanding] = useState<{ edge: number; landing: Landing } | null>(null);
  const shown = hovered ?? pinned ?? current?.type ?? 'Delta';
  const pairs = useMemo(() => pairsOf(shown, pattern.subset, byType.get(shown) ?? 0), [shown, pattern.subset, byType]);
  const exits = useMemo(() => {
    const edges = [...new Set(pairs.flat())].sort((a, b) => a - b);
    return new Map(edges.map((e) => [e, landings(shown, e, depth)]));
  }, [pairs, shown, depth]);
  const detail = hoverLanding ?? pinLanding;

  return (
    <div className="wk__machine">
      <h3>The pattern as a table</h3>
      <p>Per tile type, its pairs of edges: a strand that comes in through one leaves through the other. Edges by position, 0 to 5 from the flag.</p>
      <table className="wk__table" data-testid="wk-table">
        <tbody>
          {HEX_TYPES.map((t) => {
            const ps = pairsOf(t, pattern.subset, byType.get(t) ?? 0);
            return (
              <tr key={t}>
                <th><Swatch type={t} />{t}</th>
                <td>
                  {ps.length === 0 ? <span className="td__hint">no strand</span> : ps.map(([a, b]) => {
                    const active = current && current.type === t && (current.entry === a || current.entry === b);
                    return <span key={a} className={`wk__row${active ? ' is-active' : ''}`} title={`${t}: edge ${a} (${classLabel(t, a)}) with edge ${b} (${classLabel(t, b)})`}>({a}, {b})</span>;
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>Where each exit lands</h3>
      <p>
        Leaving a tile through an edge, the tile across depends on the tile's ancestors. Pick a tile type (hover to
        look, click to keep it); for each exit, the tile types and edges it can land on are listed with how many
        ancestor stacks lead there. Hover one to see the stacks.
      </p>
      <div className="wk__starts" data-testid="wk-machine-types" onMouseLeave={() => setHovered(null)}>
        {HEX_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`wk__start${shown === t ? ' is-active' : ''}`}
            onMouseEnter={() => { setHovered(t); setHoverLanding(null); }}
            onClick={() => { setPinned(t); setPinLanding(null); }}
            data-testid={`wk-machine-${t}`}
          >
            <TileGlyph family="hex" type={t} selected={new Set(pattern.subset)} index={byType.get(t) ?? 0} curvedStrands size={44} />
            <span>{t}</span>
          </button>
        ))}
        <label className="wk__depth">
          ancestors up to
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} data-testid="wk-depth">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="wk__exits">
        <EdgeKey type={shown} subset={pattern.subset} matching={byType.get(shown) ?? 0} />
        <div>
          <p className="td__hint">
            Inside the hexagon: positions. Outside: class labels. A +c edge meets only a −c edge.
          </p>
          {pairs.length === 0 && <p>No edge of a {shown} carries a strand under this rule.</p>}
          <ul className="wk__pairs" data-testid="wk-exits">
            {pairs.map(([a, b]) => (
              <li key={a}>
                <strong>({a}, {b})</strong>
                {[b, a].map((exit) => {
                  const l = exits.get(exit)!;
                  return (
                    <div key={exit} className="wk__exit">
                      out through {exit} <span className="td__mono">{classLabel(shown, exit)}</span>, onto
                      {l.landings.map((land) => {
                        const on = detail && detail.edge === exit && detail.landing === land;
                        return (
                          <button
                            key={`${land.type}${land.edge}`}
                            type="button"
                            className={`td__chip${on ? ' is-active' : ''}`}
                            onMouseEnter={() => setHoverLanding({ edge: exit, landing: land })}
                            onMouseLeave={() => setHoverLanding(null)}
                            onClick={() => setPinLanding({ edge: exit, landing: land })}
                            data-testid={`wk-land-${exit}-${land.type}-${land.edge}`}
                          >
                            <Swatch type={land.type} />{land.type} {land.edge} <span className="td__mono">{classLabel(land.type, land.edge)}</span>
                            <span className="td__chip-note"> ×{land.stacks.length}</span>
                          </button>
                        );
                      })}
                      {l.unsettled > 0 && <span className="td__hint"> and {l.unsettled} stacks still outside after {depth} ancestors</span>}
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {detail && (
        <div className="wk__stacks" data-testid="wk-stacks">
          <p>
            <Swatch type={shown} />{shown} out through {detail.edge} lands on <Swatch type={detail.landing.type} />{detail.landing.type}, edge {detail.landing.edge}, for these {detail.landing.stacks.length} ancestor stacks (bottom up; the last ancestor is the one with the edge inside it):
          </p>
          <ul>
            {detail.landing.stacks.slice(0, 40).map((s, i) => <StackRow key={i} type={shown} stack={s} />)}
          </ul>
          {detail.landing.stacks.length > 40 && <p className="td__hint">and {detail.landing.stacks.length - 40} more.</p>}
        </div>
      )}
    </div>
  );
}

export default MachineView;
