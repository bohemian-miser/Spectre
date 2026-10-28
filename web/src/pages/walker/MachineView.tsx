/**
 * The machine, twice. First the pattern as a table: per tile type, its pairs
 * of edges `(a, b)`, the pair in use marked. Then, for one tile type, where
 * each exit lands: a table per exit, a row per tile across and the level
 * whose supertile the edge goes inside (or a seam above them all), with the
 * ancestor types that send it there; on hover a drawing of one such stack.
 *
 * Edges are named two ways. The position is 0 to 5 round the hexagon,
 * counted from the flag; the class number is what has to match: an edge of
 * class +c only ever meets an edge of class −c. The letter after it tells two
 * edges of one class on the same tile apart.
 */
import { useMemo, useState } from 'react';

import { HEX_TYPES, matchingAt, slotsOfType, type HexType, type Link, type TileTypeId } from '../../core';
import { TileGlyph } from '../../components/TileGlyph';
import { HEX_CENTRE, HEX_OUTLINE, orientationPath, pairingD } from '../../lib/hexBoard';
import { tileColor } from '../../lib/palette';
import { sceneOf } from '../transducer/hierarchy';
import { classLabel, landings } from './landings';
import type { Pattern } from './walk';

const IDENT: [number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0];
/** Ancestors looked at when listing landings. */
const DEPTH = 4;
/** One colour per level of the drawing, level 0 being the tile itself. */
const LEVEL_COLOURS = ['#1b2230', '#2f6fdb', '#0ca678', '#f59f00', '#e8590c', '#7048e8'];

/** The pairs of a type's pattern, as edge positions, smaller first. */
export function pairsOf(type: HexType, subset: readonly number[], matching: number): [number, number][] {
  const seams = slotsOfType('hex', type as TileTypeId, subset);
  if (seams.length < 2 || seams.length % 2) return [];
  return (matchingAt(seams.length, matching) ?? []).map(([i, j]) => [seams[i].edge, seams[j].edge].sort((x, y) => x - y) as [number, number]).sort((x, y) => x[0] - y[0]);
}

function Swatch({ type }: { type: HexType }): JSX.Element {
  return <span className="wk__swatch" style={{ background: tileColor(type) }} />;
}

/** One hexagon with its edges named both ways: positions just inside each edge, class labels outside. */
function EdgeKey({ type, subset, matching }: { type: HexType; subset: readonly number[]; matching: number }): JSX.Element {
  const along = (e: number, t: number, push: number) => {
    const a = HEX_OUTLINE[e];
    const b = HEX_OUTLINE[(e + 1) % 6];
    const m = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    return { x: m.x + (m.x - HEX_CENTRE.x) * push, y: m.y + (m.y - HEX_CENTRE.y) * push };
  };
  const carries = new Set(slotsOfType('hex', type as TileTypeId, subset).map((s) => s.edge));
  return (
    <svg className="wk__key" viewBox="-0.95 -0.6 2.9 2.95" data-testid="wk-edge-key">
      <polygon points={HEX_OUTLINE.map((p) => `${p.x},${p.y}`).join(' ')} fill={tileColor(type)} className="wk__key-tile" />
      <path d={pairingD(IDENT, type, subset, matching)} className="wk__key-chords" />
      <path d={orientationPath(IDENT)} className="wk__key-flag" />
      {[0, 1, 2, 3, 4, 5].map((e) => {
        // positions sit a quarter of the way along the edge, clear of the flag at edge 0's middle
        const i = along(e, 0.25, -0.2);
        const o = along(e, 0.5, 0.55);
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

/** One stack drawn: the tiles of its top ancestor coloured by the level they share with the start tile; the start tile and the tile across outlined. */
function StackDrawing({ start, edge, stack }: { start: HexType; edge: number; stack: readonly Link[] }): JSX.Element {
  const scene = useMemo(() => sceneOf(start, edge, stack), [start, edge, stack]);
  const box = scene.frames[scene.level];
  const pad = 0.6;
  const d = (pts: readonly { x: number; y: number }[]): string => `M${pts.map((q) => `${q.x.toFixed(3)} ${q.y.toFixed(3)}`).join('L')}Z`;
  const startTile = scene.tiles.find((t) => t.id === scene.startId)!;
  const far = scene.landed ? scene.tiles.find((t) => t.id === scene.landed!.farId) : undefined;
  return (
    <svg className="wk__stackdraw" viewBox={`${box.minX - pad} ${box.minY - pad} ${box.maxX - box.minX + 2 * pad} ${box.maxY - box.minY + 2 * pad}`} data-testid="wk-stack-drawing">
      {scene.tiles.map((t) => <path key={t.id} d={d(t.pts)} fill={tileColor(t.type)} opacity={0.55} stroke="#fff" strokeWidth={0.05} />)}
      {scene.outlines.map((segs, k) => (
        <path key={k} d={segs.map((s) => `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`).join('')} stroke={LEVEL_COLOURS[k + 1]} strokeWidth={0.12 + 0.08 * k} fill="none" strokeLinecap="round" />
      ))}
      <path d={d(startTile.pts)} fill="none" stroke="#1c7ed6" strokeWidth={0.22} />
      {far && <path d={d(far.pts)} fill="none" stroke="#e8590c" strokeWidth={0.22} />}
      <line x1={scene.crossed.x1} y1={scene.crossed.y1} x2={scene.crossed.x2} y2={scene.crossed.y2} stroke="#1b2230" strokeWidth={0.18} strokeLinecap="round" />
    </svg>
  );
}

const Chip = ({ type, not }: { type: HexType; not?: boolean }): JSX.Element => <span className={`wk__chip${not ? ' is-not' : ''}`} style={{ background: tileColor(type) }} title={not ? `not a ${type}` : type}>{type.slice(0, 2)}</span>;

const orTiles = (xs: readonly string[]): string => xs.map((t) => `a ${t.replace(' ', ', edge ')}`).join(' or ');

/**
 * One exit's landings as a table: a row per tile landed on and level whose
 * supertile the edge goes inside, and per ancestor level the types that send
 * it there. A level where every type the exit meets there does is `any`.
 */
function ExitTable({ rows, exit, active, onHover, onPin }: { rows: readonly Row[]; exit: number; active: string | null; onHover: (r: Row | null) => void; onPin: (r: Row) => void }): JSX.Element {
  const any = Array.from({ length: DEPTH }, (_, j) => new Set(rows.flatMap((r) => r.levels[j])));
  return (
    <table className="wk__landtable" data-testid={`wk-exit-${exit}`}>
      <thead>
        <tr>
          <th>Lands on</th>
          <th>Inside</th>
          {Array.from({ length: DEPTH }, (_, j) => <th key={j}>{j === 0 ? 'Parent' : j === 1 ? 'Grandparent' : `Level ${j + 1}`}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.key}
            className={`wk__landing${active === r.key ? ' is-active' : ''}`}
            onMouseEnter={() => onHover(r)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onPin(r)}
            data-testid={`wk-land-${exit}-${r.key}`}
          >
            <td>{r.type ? <><Swatch type={r.type} /><strong>{r.type}</strong> {r.edge}</> : <strong className="wk__odd">{orTiles(r.tiles ?? [])}</strong>}</td>
            <td>{insideText(r.inside)}</td>
            {r.levels.map((ts, j) => (
              <td key={j}>
                {ts.length === 0 ? '' : ts.length === any[j].size ? <span className="td__hint">any</span> : ts.length > any[j].size / 2
                  ? <><span className="td__hint">not </span>{HEX_TYPES.filter((t) => any[j].has(t) && !ts.includes(t)).map((t) => <Chip key={t} type={t} not />)}</>
                  : ts.map((t) => <Chip key={t} type={t} />)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "a Theta", "a Gamma in a Delta". */
const chainText = (types: readonly HexType[]): string => types.map((t) => `a ${t}`).join(' in ');

export interface MachineViewProps {
  readonly pattern: Pattern;
  readonly byType: ReadonlyMap<HexType, number>;
  /** The tile the walk is on and the edge it came in through, to mark the pair in use. */
  readonly current: { readonly type: HexType; readonly entry: number | null } | null;
}

interface Row {
  readonly exit: number;
  readonly key: string;
  /** The tile landed on; null where the supertiles across name different tiles. */
  readonly type: HexType | null;
  readonly edge: number | null;
  /** The level whose supertile the edge goes inside, or 'seam': on the outline of all DEPTH, across a seam above. */
  readonly inside: number | 'seam';
  /** Per level 1..DEPTH, the ancestor types of the stacks that land here (empty above `inside`). */
  readonly levels: readonly (readonly HexType[])[];
  /** Where the supertiles across name different tiles: those tiles. */
  readonly tiles?: readonly string[];
  readonly example: readonly Link[];
}

/** Per level 1..DEPTH, the ancestor types the stacks pass through. */
const typesPerLevel = (stacks: readonly (readonly Link[])[]): HexType[][] =>
  Array.from({ length: DEPTH }, (_, j) => HEX_TYPES.filter((t) => stacks.some((s) => s[j]?.parent === t)));

const insideText = (k: number | 'seam'): string => (k === 'seam' ? `across a seam above level ${DEPTH}` : k === 1 ? 'its parent' : k === 2 ? 'its grandparent' : `its level-${k} ancestor`);

export function MachineView({ pattern, byType, current }: MachineViewProps): JSX.Element {
  const [pinned, setPinned] = useState<HexType | null>(null);
  const [hovered, setHovered] = useState<HexType | null>(null);
  const [hoverRow, setHoverRow] = useState<Row | null>(null);
  const [pinRow, setPinRow] = useState<Row | null>(null);
  const shown = hovered ?? pinned ?? current?.type ?? 'Delta';
  const pairs = useMemo(() => pairsOf(shown, pattern.subset, byType.get(shown) ?? 0), [shown, pattern.subset, byType]);
  const rowsByExit = useMemo(() => {
    const out = new Map<number, Row[]>();
    for (const e of [...new Set(pairs.flat())]) {
      const l = landings(shown, e, DEPTH);
      const rows: Row[] = [];
      for (const x of l.landings) {
        for (let k = 1; k <= DEPTH; k++) {
          const stacks = x.stacks.filter((st) => st.length === k);
          if (stacks.length) rows.push({ exit: e, key: `${x.type}${x.edge}@${k}`, type: x.type, edge: x.edge, inside: k, levels: typesPerLevel(stacks), example: stacks[0] });
        }
      }
      for (const x of l.acrossSeam) rows.push({ exit: e, key: `${x.type}${x.edge}@seam`, type: x.type, edge: x.edge, inside: 'seam', levels: typesPerLevel(x.stacks), example: x.stacks[0] });
      for (const u of l.unforced) rows.push({ exit: e, key: `${u.tiles.join()}@seam`, type: null, edge: null, inside: 'seam', levels: typesPerLevel(u.stacks), tiles: u.tiles, example: u.stacks[0] });
      // each tile's rows together, in the order the tiles first appear
      const first = new Map<string, number>();
      rows.forEach((r, i) => { const t = `${r.type}${r.edge}`; if (!first.has(t)) first.set(t, i); });
      rows.sort((a, b) => first.get(`${a.type}${a.edge}`)! - first.get(`${b.type}${b.edge}`)!);
      out.set(e, rows);
    }
    return out;
  }, [pairs, shown]);
  const detail = hoverRow ?? (pinRow && rowsByExit.get(pinRow.exit)?.some((r) => r.key === pinRow.key) ? pinRow : null);

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
        The tile across an edge depends on which supertiles the tile sits in. For one tile type (hover to look, click
        to keep it), each exit below lists the tiles it can land on, and which ancestors send it there. Hover a row
        to see one of them drawn.
      </p>
      <div className="wk__starts" data-testid="wk-machine-types" onMouseLeave={() => setHovered(null)}>
        {HEX_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`wk__start${shown === t ? ' is-active' : ''}`}
            onMouseEnter={() => { setHovered(t); setHoverRow(null); }}
            onClick={() => { setPinned(t); setPinRow(null); }}
            data-testid={`wk-machine-${t}`}
          >
            <TileGlyph family="hex" type={t} selected={new Set(pattern.subset)} index={byType.get(t) ?? 0} curvedStrands size={44} />
            <span>{t}</span>
          </button>
        ))}
      </div>

      <div className="wk__exits">
        <div>
          <EdgeKey type={shown} subset={pattern.subset} matching={byType.get(shown) ?? 0} />
          <p className="td__hint">
            Inside: positions, 0 to 5 from the flag. Outside: classes. An edge of class +c meets only an edge of class −c; the
            letter only tells apart two edges of the same class on one tile.
          </p>
        </div>
        <div>
          {pairs.length === 0 && <p>No edge of a {shown} carries a strand under this rule.</p>}
          {pairs.map(([a, b]) => (
            <div key={a} className="wk__pair" data-testid={`wk-pair-${a}-${b}`}>
              <h4>({a}, {b})</h4>
              {[b, a].map((exit) => (
                <div key={exit} className="wk__exit">
                  <p className="wk__exit-head">Out through {exit} <span className="td__mono">{classLabel(shown, exit)}</span>:</p>
                  <ExitTable
                    rows={rowsByExit.get(exit) ?? []}
                    exit={exit}
                    active={detail?.exit === exit ? detail.key : null}
                    onHover={setHoverRow}
                    onPin={setPinRow}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="wk__exitdraw">
          {detail ? (
            <>
              <StackDrawing start={shown} edge={detail.exit} stack={detail.example} />
              <p className="td__hint">
                {detail.inside !== 'seam'
                  ? `The ${shown} (blue) in ${chainText(detail.example.map((l) => l.parent))}. Its edge ${detail.exit} (black) is inside the ${detail.example[detail.example.length - 1].parent}, and the tile across is a ${detail.type} (orange).`
                  : `The ${shown} (blue) in ${chainText(detail.example.map((l) => l.parent))}: its edge ${detail.exit} (black) is on the outline of all ${DEPTH}. ${detail.type ? `Every supertile that can sit across it holds a ${detail.type} there, entered by edge ${detail.edge}.` : `The supertiles that can sit across it hold ${orTiles(detail.tiles ?? [])} there.`}`}
                {' '}Lines mark each level's supertile.
              </p>
            </>
          ) : <p className="td__hint">Hover a landing to see an example.</p>}
        </div>
      </div>
    </div>
  );
}

export default MachineView;
