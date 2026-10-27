/**
 * `WalkerPage` — a strand walked one tile at a time on a board that is built
 * as it goes. The machine is the combination's table (on a tile of this type,
 * entered by this edge, leave by that one); the board is the tiling, found
 * from slot paths by `neighbour()`. Next to the board, the current tile's
 * slot path as a column: each step rewrites it from the bottom up to the
 * level where the crossing settles, and when a crossing needs an ancestor
 * the board does not have, the walk stops and asks for one.
 *
 * When the walk closes, its word is split into thirds (`sideRuns`) and the
 * tiles where the thirds disagree, and the corners, are marked on the board.
 */
import { useMemo, useReducer, useState } from 'react';

import {
  HEX_TYPES, addressFromId, buildSystem, inv, leafOrder, leafPts, letter, mul, sideRuns, slotsOfType, transPt, validEdgeSubsets,
  type Address, type Affine, type HexType, type MetaNode, type TileNode,
} from '../core';
import { tileColor } from '../lib/palette';
import { supertileEdges } from './transducer/board';
import { MAX_LEVEL, parentOptions, type World } from './transducer/world';
import { initialWalk, longestCircuit, pairingTable, reduceWalk, type Pattern } from './walker/walk';
import '../styles/transducer.css';
import '../styles/walker.css';

const RUN_CAP = 50000;
const BOUNDARY_CAP = 3000;
const HEX_CENTRE = { x: 0.5, y: Math.sqrt(3) / 2 };

/** The placement of the tile at slot path `id` inside the root. */
function xformIn(world: World, id: string): Affine {
  let node: TileNode = buildSystem('hex', world.level)[world.root];
  let x: Affine = [1, 0, 0, 0, 1, 0];
  for (const s of id === '' ? [] : id.split('.').map(Number)) {
    const ch = (node as MetaNode).children.find((c) => c.pos === s);
    if (!ch) throw new Error(`no slot ${s} under ${node.type}`);
    x = mul(x, ch.xform);
    node = ch.node;
  }
  return x;
}

export function WalkerPage(): JSX.Element {
  const rules = useMemo(() => validEdgeSubsets('hex').filter((r) => r.edges.length > 0), []);
  const [ruleIdx, setRuleIdx] = useState(() => Math.max(0, rules.findIndex((r) => r.edges.join('') === '023468')));
  const [combo, setCombo] = useState('000100000');
  const [startType, setStartType] = useState<HexType>('Delta');
  const [findLevel, setFindLevel] = useState(4);
  const [found, setFound] = useState<string | null>(null);
  const pattern: Pattern = useMemo(() => ({ subset: rules[ruleIdx]?.edges ?? [], combo }), [rules, ruleIdx, combo]);
  const table = useMemo(() => pairingTable(pattern), [pattern]);
  const [walk, dispatch] = useReducer(reduceWalk, 'Delta' as HexType, initialWalk);
  const { board, steps, waiting, closed, startEdge } = walk;
  const { world } = board;

  const options = useMemo(() => (waiting ? parentOptions(board) : []), [waiting, board]);
  const address: Address = useMemo(() => addressFromId(world.root, board.selected), [world.root, board.selected]);
  const prevAddress: Address | null = useMemo(
    () => (board.trail.length ? addressFromId(world.root, board.trail[board.trail.length - 1]) : null),
    [world.root, board.trail],
  );

  // --- the board -------------------------------------------------------------
  const base = leafPts('hex', 'Delta');
  const drawn = useMemo(() => {
    const toStart = inv(xformIn(world, world.startId));
    const tiles = [...board.revealed].map((id) => {
      const a = addressFromId(world.root, id);
      return { id, type: a.leaf, address: a, xform: mul(toStart, xformIn(world, id)) };
    });
    const byId = new Map(tiles.map((t) => [t.id, t]));
    let minX = -2, minY = -2, maxX = 2, maxY = 2;
    for (const t of tiles) for (const q of base) { const p = transPt(t.xform, q); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    const edges = tiles.length <= BOUNDARY_CAP ? supertileEdges(tiles, base, world.level) : [];
    const centre = (id: string): { x: number; y: number } => transPt(byId.get(id)!.xform, HEX_CENTRE);
    return { tiles, byId, edges, centre, viewBox: `${minX - 1} ${minY - 1} ${maxX - minX + 2} ${maxY - minY + 2}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.revealed, world]);
  const path = [...board.trail, board.selected].filter((id) => drawn.byId.has(id)).map((id) => { const c = drawn.centre(id); return `${c.x},${c.y}`; }).join(' ');

  // --- the three sides of a closed walk -----------------------------------------
  const sides = useMemo(() => {
    if (!closed || steps.length % 3 || steps.length < 6) return null;
    const N = steps.length;
    const S = N / 3;
    const letters = steps.map((s) => letter(s.type, s.entry, s.exit));
    const { runs, offset } = sideRuns(letters);
    // Positions count from where sideRuns cut the word into thirds.
    const word = [...letters.slice(offset), ...letters.slice(0, offset)];
    const walked = board.trail.slice(-N);
    const ids = [...walked.slice(offset), ...walked.slice(0, offset)];
    const odd = new Set<string>();
    const match = new Set<string>();
    for (const r of runs) for (let i = r.from; i <= r.to; i++) for (let k = 0; k < 3; k++) (k === r.odd || r.odd < 0 ? odd : match).add(ids[i + k * S]);
    const pts = ids.map((id) => drawn.centre(id));
    const c = pts.reduce((a, p) => ({ x: a.x + p.x / N, y: a.y + p.y / N }), { x: 0, y: 0 });
    const corners = [0, 1, 2].map((k) => {
      let b = k * S;
      for (let i = k * S; i < (k + 1) * S; i++) if (Math.hypot(pts[i].x - c.x, pts[i].y - c.y) > Math.hypot(pts[b].x - c.x, pts[b].y - c.y)) b = i;
      return b;
    });
    const around = (i: number): string => Array.from({ length: 9 }, (_, d) => word[(i - 4 + d + N) % N]).join(' ');
    return { S, word, runs, odd, match, corners: new Set(corners.map((i) => ids[i])), joins: corners.map(around) };
  }, [closed, steps, board.trail, drawn]);

  // --- controls ----------------------------------------------------------------
  const startSeams = useMemo(() => slotsOfType('hex', addressFromId(world.root, world.startId).leaf, pattern.subset), [world, pattern.subset]);
  const curType = address.leaf;
  const nextExit = board.entry === null ? undefined : table.get(curType)?.get(board.entry);
  const reset = (t: HexType): void => { setStartType(t); setFound(null); dispatch({ type: 'reset', start: t }); };
  const place = (): void => {
    const best = longestCircuit(pattern, 'Delta', findLevel);
    if (!best) { setFound(`No circuit closes inside a level-${findLevel} Delta under this combination.`); return; }
    setFound(`The longest circuit inside a level-${findLevel} Delta has ${best.length} tiles; it starts at ${best.id}, entering by edge ${best.edge}.`);
    dispatch({ type: 'place', world: { root: 'Delta', level: findLevel, startId: best.id }, edge: best.edge });
  };
  const heights = steps.map((s) => s.height);
  const maxHeight = Math.max(1, ...heights);
  const lastHeight = steps.length ? steps[steps.length - 1].height : null;

  const tileClass = (id: string): string => {
    const cls = ['wk__tile'];
    if (id === board.selected) cls.push('is-current');
    if (id === world.startId) cls.push('is-start');
    return cls.join(' ');
  };

  return (
    <article className="td wk">
      <header className="td__intro">
        <p className="td__kicker">Strands</p>
        <h1>The circuit walker</h1>
        <p className="td__lede">
          A strand walks the tiling one tile at a time. The rule it follows is a short table: on a tile of this type,
          entered by this edge, leave by that one. The board is found as the walk goes, from each tile's slot path.
        </p>
        <p>
          The column beside the board is the current tile's slot path, the tile at the bottom and its ancestors above.
          Each step rewrites it from the bottom up to the level where the crossing settles. When a crossing needs an
          ancestor the board does not have yet, the walk stops and asks which one.
        </p>
      </header>

      <section className="td__board">
        <div className="td__controls">
          <label>Rule
            <select value={ruleIdx} onChange={(e) => setRuleIdx(Number(e.target.value))} data-testid="wk-rule">
              {rules.map((r, i) => <option key={r.mask} value={i}>{r.edges.join('')}</option>)}
            </select>
          </label>
          <label>Combination
            <input value={combo} onChange={(e) => setCombo(e.target.value.replace(/[^0-9a-z]/gi, '').slice(0, 9))} size={11} data-testid="wk-combo" />
          </label>
          <label>Start on a
            <select value={startType} onChange={(e) => reset(e.target.value as HexType)} data-testid="wk-start">
              {HEX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => reset(startType)} data-testid="wk-reset">Start again</button>
        </div>
        <div className="td__controls">
          <label>Longest circuit in a level
            <select value={findLevel} onChange={(e) => setFindLevel(Number(e.target.value))} data-testid="wk-find-level">
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            Delta
          </label>
          <button type="button" onClick={place} data-testid="wk-find">Find it and start there</button>
          {found && <span className="td__hint" data-testid="wk-found">{found}</span>}
        </div>

        <div className="wk__main">
          <svg className="td__svg wk__svg" viewBox={drawn.viewBox} data-testid="wk-svg" data-revealed={board.revealed.size}>
            {drawn.tiles.map((t) => (
              <polygon key={t.id} data-id={t.id} className={tileClass(t.id)} points={base.map((q) => { const p = transPt(t.xform, q); return `${p.x},${p.y}`; }).join(' ')} fill={tileColor(t.type)}>
                <title>{t.id || '(root)'}</title>
              </polygon>
            ))}
            {drawn.edges.map((b) => <line key={b.key} className="td__boundary" data-level={Math.min(b.level, 3)} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} strokeWidth={0.04 + 0.04 * Math.min(b.level, 5)} />)}
            {board.trail.length > 0 && <polyline className="wk__strand" points={path} />}
            {sides && drawn.tiles.filter((t) => sides.odd.has(t.id) || sides.match.has(t.id) || sides.corners.has(t.id)).map((t) => {
              const c = drawn.centre(t.id);
              const kind = sides.corners.has(t.id) ? 'corner' : sides.odd.has(t.id) ? 'odd' : 'match';
              return <circle key={`m-${t.id}`} className={`wk__mark is-${kind}`} cx={c.x} cy={c.y} r={kind === 'corner' ? 1.1 : 0.45} />;
            })}
          </svg>

          <div className="wk__tape" data-testid="wk-tape">
            <div className={`wk__cell is-unknown${waiting ? ' is-wanted' : ''}`} data-testid="wk-cell-unknown">
              <span className="wk__lvl">level {world.level + 1}</span> not chosen
            </div>
            {[...address.path].map((l, k) => ({ l, k })).reverse().map(({ l, k }) => {
              const changed = prevAddress && (prevAddress.path[k]?.slot !== l.slot || prevAddress.path[k]?.parent !== l.parent);
              const read = lastHeight !== null && k < lastHeight;
              return (
                <div key={k} className={`wk__cell${changed ? ' is-changed' : ''}${read ? ' is-read' : ''}`} data-testid={`wk-cell-${k + 1}`}>
                  <span className="wk__lvl">level {k + 1}</span> {l.parent}, slot {l.slot}
                </div>
              );
            })}
            <div className={`wk__cell is-tile${prevAddress && prevAddress.leaf !== address.leaf ? ' is-changed' : ''}`} data-testid="wk-cell-0">
              <span className="wk__lvl">tile</span> {address.leaf}{board.entry !== null ? `, in by edge ${board.entry}` : ''}
            </div>
            <p className="td__hint">
              {lastHeight === null ? 'No steps yet.' : `The last step settled at level ${lastHeight}; the cells it rewrote are marked.`}
            </p>
          </div>
        </div>

        {steps.length === 0 && !waiting && (
          <p data-testid="wk-start-edges">
            The strand enters the start tile by edge{' '}
            {startSeams.map((s) => (
              <button key={s.edge} type="button" className={`td__chip${startEdge === s.edge ? ' is-active' : ''}`} onClick={() => dispatch({ type: 'startEdge', edge: s.edge })} data-testid={`wk-edge-${s.edge}`}>{s.edge}</button>
            ))}
            {startSeams.length === 0 && 'none: no edge of this tile carries a crossing under this rule.'}
          </p>
        )}
        <div className="td__controls">
          <button type="button" onClick={() => dispatch({ type: 'step', pattern })} disabled={closed || !!waiting || nextExit === undefined} data-testid="wk-step">
            Step{nextExit !== undefined && !closed && !waiting ? `: leave by edge ${nextExit}` : ''}
          </button>
          <button type="button" onClick={() => dispatch({ type: 'run', pattern, cap: RUN_CAP })} disabled={closed || !!waiting || nextExit === undefined} data-testid="wk-run">
            Run to the next choice
          </button>
          <span className="td__hint" data-testid="wk-status">
            {closed
              ? `A circuit: back on the start tile, entering by edge ${startEdge}, after ${steps.length} tiles. It never read above level ${maxHeight}.`
              : waiting
                ? `Step ${steps.length + 1} leaves the level-${world.level} ${world.root} through edge ${waiting.exit} of a ${waiting.type}. Choose its parent.`
                : board.entry === null
                  ? 'Choose the edge the strand enters by.'
                  : nextExit === undefined
                    ? `Edge ${board.entry} of a ${curType} carries no crossing under this rule.`
                    : `${steps.length} tiles walked.`}
          </span>
        </div>

        {waiting && (
          <div className="td__pending" data-testid="wk-pending">
            <div className="td__chips">
              {options.map((o) => (
                <button key={`${o.parent}-${o.slot}`} type="button" className="td__chip" onClick={() => dispatch({ type: 'grow', parent: o.parent, slot: o.slot })} disabled={world.level >= MAX_LEVEL} data-testid={`wk-parent-${o.parent}-${o.slot}`}>
                  slot {o.slot} of a {o.parent}
                  <span className="td__chip-note">{o.landing ? ' lands' : o.needs ? ` +${o.needs - 1} more` : ' never'}</span>
                </button>
              ))}
            </div>
            <p className="td__hint">
              Ordered by how many more ancestors the crossing needs. "lands" settles it now.
              {world.level >= MAX_LEVEL && ` The board is capped at level ${MAX_LEVEL}.`}
            </p>
          </div>
        )}
      </section>

      <section className="td__section">
        <h2>How high each step reached</h2>
        <p>One bar per step, its height the level where the crossing settled.</p>
        <svg className="wk__heights" viewBox={`0 0 ${Math.max(1, heights.length)} ${maxHeight}`} preserveAspectRatio="none" data-testid="wk-heights" data-steps={heights.length}>
          {heights.map((h, i) => <rect key={i} x={i} y={maxHeight - h} width={1} height={h} />)}
        </svg>
      </section>

      <section className="td__section">
        <h2>The machine</h2>
        <p>
          The combination as a table. The row in use is marked. These rows are all the strand knows; everything else
          comes from the board.
        </p>
        <table className="wk__table" data-testid="wk-table">
          <tbody>
            {leafOrder('hex').map((t) => {
              const rows = [...(table.get(t as HexType) ?? new Map<number, number>())].sort((a, b) => a[0] - b[0]);
              return (
                <tr key={t}>
                  <th><span className="wk__swatch" style={{ background: tileColor(t) }} />{t}</th>
                  <td>
                    {rows.length === 0 ? <span className="td__hint">no crossings</span> : rows.map(([a, b]) => (
                      <span key={a} className={`wk__row${t === curType && a === board.entry && !closed ? ' is-active' : ''}`}>in {a}, out {b}</span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {closed && (
        <section className="td__section" data-testid="wk-sides">
          <h2>Three sides</h2>
          {!sides ? (
            <p>{steps.length} tiles is not a multiple of 3, so the circuit is not three copies of one side.</p>
          ) : (
            <>
              <p>
                Each tile written as its type and the edges in and out (<code>{sides.word[0]}</code>). The word is split into
                three sides of {sides.S} and compared. {sides.runs.length === 0
                  ? 'The three sides are the same word.'
                  : `They differ at ${sides.runs.reduce((s, r) => s + r.to - r.from + 1, 0)} positions, in ${sides.runs.length} ${sides.runs.length === 1 ? 'run' : 'runs'}. On the board the odd side's tiles are marked red, the matching tiles on the other two sides amber.`}
              </p>
              {sides.runs.length > 0 && (
                <ul data-testid="wk-runs">
                  {sides.runs.map((r) => (
                    <li key={r.from}>
                      Positions {r.from}–{r.to}: {r.odd < 0 ? 'all three sides differ' : `side ${r.odd + 1} ${r.reversed ? 'walks the block backwards' : 'differs'}`}:{' '}
                      <code>{sides.word.slice(r.from + ((Math.max(0, r.odd) + 1) % 3) * sides.S, r.to + 1 + ((Math.max(0, r.odd) + 1) % 3) * sides.S).join(' ')}</code>
                      {r.odd >= 0 && <> against <code>{sides.word.slice(r.from + r.odd * sides.S, r.to + 1 + r.odd * sides.S).join(' ')}</code></>}
                    </li>
                  ))}
                </ul>
              )}
              <p>
                The corners, the tile of each side farthest from the circuit's centre (ringed), and the nine tiles round
                each: {new Set(sides.joins).size === 1 ? 'the three joins are the same word' : 'the joins differ'}.
              </p>
              <ul data-testid="wk-joins">{sides.joins.map((j, i) => <li key={i}><code>{j}</code></li>)}</ul>
            </>
          )}
        </section>
      )}
    </article>
  );
}

export default WalkerPage;
