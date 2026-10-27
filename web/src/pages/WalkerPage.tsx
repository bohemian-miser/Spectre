/**
 * `WalkerPage` — a strand walked one tile at a time on a board that is built
 * as it goes. The pattern is chosen with the Explorer's own controls; the
 * board (`HexBoard`) draws the tiling around the walk the way the Explorer
 * does, with the pattern faint in every tile. Next to it, the current tile's
 * slot path as a column: each step rewrites it from the bottom up to the
 * level where the crossing settles, and when a crossing needs an ancestor the
 * board does not have, the walk stops and offers the parents, each previewed
 * on the board on hover.
 *
 * When the walk closes, its word is split into thirds (`sideRuns`) and the
 * tiles where the thirds disagree, and the corners, are marked.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import {
  DEFAULT_LINK_STATE, HEX_TYPES, addressFromId, encodeExplorerState, leafOrder, letter, matchingIndicesToCombo, normalizeMatchingVector,
  sideRuns, slotsOfType,
  type Address, type HexType, type TileTypeId,
} from '../core';
import { TileGlyph } from '../components/TileGlyph';
import { QuickBar } from '../components/controls/QuickBar';
import { cycleMatchingIndex, tileMatchingInfo } from '../lib/matchingModel';
import { HexBoard, type BoardMark, type BoardStep, type BoardTile } from '../components/HexBoard';
import { HEX_OUTLINE, nearest, placeWorld, supertileEdges, tileCentre, tilesAround, type PlacedTile } from '../lib/hexBoard';
import { tileColor } from '../lib/palette';
import { MAX_LEVEL, parentOptions, prefixId, type World } from './transducer/world';
import { LandingWalk } from './walker/LandingWalk';
import { MachineView } from './walker/MachineView';
import type { World as Stack } from './walker/possible';
import { initialWalk, longestCircuit, matchingByType, pairingTable, patternOf, reduceWalk, type Pattern } from './walker/walk';
import '../styles/transducer.css';
import '../styles/walker.css';

const RUN_CAP = 50000;
/** Tiles drawn faintly around the walk, and around a previewed parent's landing. */
const FAINT_CAP = 4000;
const PREVIEW_CAP = 700;
const BOUNDARY_CAP = 3000;

const DEFAULT = patternOf([0, 2, 3, 4, 6, 8], '000100000');

export function WalkerPage(): JSX.Element {
  const [pattern, setPattern] = useState<Pattern>(DEFAULT);
  const [startType, setStartType] = useState<HexType>('Delta');
  const [findLevel, setFindLevel] = useState(4);
  const [found, setFound] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  /** 'landings': walk every ancestor stack at once and choose only between landings; 'ancestors': choose each parent by hand. */
  const [mode, setMode] = useState<'landings' | 'ancestors'>('landings');
  const [seed, setSeed] = useState<{ edge: number | null; stacks?: Stack[]; n: number }>({ edge: null, n: 0 });
  const [hoverRun, setHoverRun] = useState<number | null>(null);
  const table = useMemo(() => pairingTable(pattern), [pattern]);
  const byType = useMemo(() => matchingByType(pattern), [pattern]);
  const [walk, dispatch] = useReducer(reduceWalk, 'Delta' as HexType, initialWalk);
  const { board, steps, waiting, closed, startEdge } = walk;
  const { world } = board;

  const combo = useMemo(() => matchingIndicesToCombo('hex', pattern.subset, pattern.matching), [pattern]);
  const explorerHref = useMemo(() => {
    const q = encodeExplorerState({ ...DEFAULT_LINK_STATE, family: 'hex', rootTile: 'Delta', level: 4, subset: pattern.subset, matching: pattern.matching });
    return `${import.meta.env.BASE_URL}#/explorer?${q.toString()}`;
  }, [pattern]);

  const reset = useCallback((t: HexType): void => {
    setStartType(t);
    setFound(null);
    setSeed((x) => ({ edge: null, n: x.n + 1 }));
    dispatch({ type: 'reset', start: t });
  }, []);
  const setSubset = (subset: readonly number[]): void => {
    setPattern((p) => ({ subset, matching: normalizeMatchingVector('hex', subset, p.matching) }));
    reset(startType);
  };
  const setMatching = (matching: readonly number[]): void => { setPattern((p) => ({ ...p, matching })); reset(startType); };
  const cycleTile = (type: TileTypeId, delta: number): void => {
    const at = leafOrder('hex').indexOf(type);
    const info = tileMatchingInfo('hex', type, new Set(pattern.subset));
    setMatching(pattern.matching.map((m, i) => (i === at ? cycleMatchingIndex(info, m, delta, true) : m)));
  };

  // --- the board -------------------------------------------------------------
  const placed = useMemo(() => placeWorld(world), [world]);
  const options = useMemo(() => (waiting ? parentOptions(board) : []), [waiting, board]);
  const address: Address = useMemo(() => addressFromId(world.root, board.selected), [world.root, board.selected]);
  const prevAddress: Address | null = useMemo(
    () => (board.trail.length ? addressFromId(world.root, board.trail[board.trail.length - 1]) : null),
    [world.root, board.trail],
  );
  const current = placed.get(board.selected)!;
  const withAddress = (root: HexType, tiles: readonly PlacedTile[]) => tiles.map((t) => ({ ...t, address: addressFromId(root, t.id) }));

  const preview = useMemo(() => {
    const o = waiting && previewing ? options[board.previewIdx] : undefined;
    if (!o || !board.pending || world.level >= MAX_LEVEL) return null;
    const pw: World = { root: o.parent, level: world.level + 1, startId: prefixId(o.slot, world.startId) };
    const pplaced = placeWorld(pw);
    const shown = new Set([...board.revealed].map((id) => prefixId(o.slot, id)));
    const from = pplaced.get(prefixId(o.slot, board.pending.from))!;
    const tiles = nearest([...pplaced.values()].filter((p) => !shown.has(p.id)), tileCentre(from.xform), PREVIEW_CAP);
    if (o.landing && !tiles.some((t) => t.id === o.landing) && pplaced.get(o.landing)) tiles.push(pplaced.get(o.landing)!);
    return { option: o, tiles, landing: o.landing, edges: supertileEdges(withAddress(pw.root, tiles), HEX_OUTLINE, pw.level) };
  }, [waiting, previewing, options, board.previewIdx, board.pending, board.revealed, world]);

  const drawn = useMemo(() => {
    const solid = [...board.revealed].map((id) => placed.get(id)).filter((p): p is PlacedTile => !!p);
    // the tiles round the walk, out to about two tiles from it
    const faint = tilesAround(placed.values(), solid, 3.6, FAINT_CAP, board.revealed);
    const outlined = solid.length + faint.length <= BOUNDARY_CAP ? [...solid, ...faint] : solid;
    return { solid, faint, edges: supertileEdges(withAddress(world.root, outlined), HEX_OUTLINE, world.level) };
  }, [board.revealed, placed, current, world]);

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
    const kind = new Map<string, string>();
    for (const r of runs) for (let i = r.from; i <= r.to; i++) for (let k = 0; k < 3; k++) kind.set(ids[i + k * S], k === r.odd || r.odd < 0 ? 'odd' : 'match');
    const pts = ids.map((id) => tileCentre(placed.get(id)!.xform));
    const c = pts.reduce((a, p) => ({ x: a.x + p.x / N, y: a.y + p.y / N }), { x: 0, y: 0 });
    const corners = [0, 1, 2].map((k) => {
      let b = k * S;
      for (let i = k * S; i < (k + 1) * S; i++) if (Math.hypot(pts[i].x - c.x, pts[i].y - c.y) > Math.hypot(pts[b].x - c.x, pts[b].y - c.y)) b = i;
      return b;
    });
    for (const i of corners) kind.set(ids[i], 'corner');
    const around = (i: number): string => Array.from({ length: 9 }, (_, d) => word[(i - 4 + d + N) % N]).join(' ');
    return { S, word, ids, runs, kind, joins: corners.map(around) };
  }, [closed, steps, board.trail, placed]);

  const boardTiles: BoardTile[] = [
    ...(preview?.tiles ?? []).map((t): BoardTile => ({ ...t, tone: 'preview', className: t.id === preview?.landing ? 'is-landing' : undefined })),
    ...drawn.faint.map((t): BoardTile => ({ ...t, tone: 'faint' })),
    ...drawn.solid.map((t): BoardTile => ({ ...t, tone: 'solid' })),
  ];
  const strand: BoardStep[] = steps.map((s, i) => ({ ...s, xform: placed.get(board.trail[board.trail.length - steps.length + i])?.xform ?? current.xform }));
  const marks: BoardMark[] = [
    ...(sides ? [...sides.kind].map(([id, kind]) => ({ xform: placed.get(id)!.xform, kind, r: kind === 'corner' ? 1.1 : 0.4 })) : []),
    ...(sides && hoverRun !== null
      ? [0, 1, 2].flatMap((k) => sides.ids.slice(sides.runs[hoverRun].from + k * sides.S, sides.runs[hoverRun].to + 1 + k * sides.S)).map((id) => ({ xform: placed.get(id)!.xform, kind: 'hover', r: 0.8 }))
      : []),
    ...(placed.get(world.startId) ? [{ xform: placed.get(world.startId)!.xform, kind: 'start', r: 0.75 }] : []),
  ];

  // --- controls ----------------------------------------------------------------
  const startType0 = addressFromId(world.root, world.startId).leaf;
  const startSeams = useMemo(() => slotsOfType('hex', startType0 as TileTypeId, pattern.subset), [startType0, pattern.subset]);
  const curType = address.leaf;
  const nextExit = board.entry === null ? undefined : table.get(curType)?.get(board.entry);
  const canStep = !closed && !waiting && nextExit !== undefined;
  const place = (): void => {
    const best = longestCircuit(pattern, 'Delta', findLevel);
    if (!best) { setFound(`No circuit closes inside a level-${findLevel} Delta with this pattern.`); return; }
    setFound(`Placed on the longest circuit inside a level-${findLevel} Delta: ${best.length} tiles, starting at ${best.id}.`);
    dispatch({ type: 'place', world: { root: 'Delta', level: findLevel, startId: best.id }, edge: best.edge });
    const a = addressFromId('Delta', best.id);
    setSeed((x) => ({ edge: best.edge, stacks: [{ chain: a.path, at: a, entry: best.edge }], n: x.n + 1 }));
  };
  const heights = steps.map((s) => s.height);
  const maxHeight = Math.max(1, ...heights);
  const lastHeight = steps.length ? steps[steps.length - 1].height : null;

  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (mode !== 'ancestors' || ev.metaKey || ev.ctrlKey || ev.altKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (waiting && (ev.key === 'ArrowRight' || ev.key === 'ArrowDown')) { ev.preventDefault(); setPreviewing(true); dispatch({ type: 'previewStep', delta: 1 }); }
      else if (waiting && (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp')) { ev.preventDefault(); setPreviewing(true); dispatch({ type: 'previewStep', delta: -1 }); }
      else if (ev.key === 'Enter' && tag !== 'BUTTON') {
        ev.preventDefault();
        const o = options[board.previewIdx];
        if (waiting && o) dispatch({ type: 'grow', parent: o.parent, slot: o.slot });
        else if (canStep) dispatch({ type: 'step', pattern });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, waiting, options, board.previewIdx, canStep, pattern]);

  return (
    <article className="td wk">
      <header className="td__intro">
        <p className="td__kicker">Strands</p>
        <h1>The circuit walker</h1>
        <p className="td__lede">
          Follow one strand tile by tile. In each tile the pattern sends it from the edge it came in by to that
          edge's partner; the tile across is found from the slot path. When the slot path runs out, choose the parent.
        </p>
      </header>

      <section className="td__section wk__setup">
        <div className="wk__rulepanel">
          <h2>1. The pattern</h2>
          <QuickBar
            family="hex"
            subset={pattern.subset}
            matching={pattern.matching}
            curvedStrands
            nonCrossingOnly
            onToggleMajor={(m) => setSubset(pattern.subset.includes(m) ? pattern.subset.filter((x) => x !== m) : [...pattern.subset, m].sort((a, b) => a - b))}
            onSubsetChange={setSubset}
            onStrands={() => undefined}
            onMatchingVectorChange={setMatching}
            onCycleTile={(type, delta) => cycleTile(type, delta)}
            onOpenTile={(type) => cycleTile(type, 1)}
          />
          <p data-testid="wk-pattern">
            Rule <span className="td__mono">{pattern.subset.join('')}</span>, combination <span className="td__mono">{combo ?? '(crossing)'}</span>.{' '}
            <a href={explorerHref} data-testid="wk-explorer">See it in the Explorer</a>.
          </p>
        </div>
        <div>
          <h2>2. Where the strand starts</h2>
          <div className="wk__starts" data-testid="wk-starts">
            {HEX_TYPES.map((t) => (
              <button key={t} type="button" className={`wk__start${startType === t && steps.length === 0 && world.level === 0 ? ' is-active' : ''}`} onClick={() => reset(t)} data-testid={`wk-start-${t}`}>
                <TileGlyph family="hex" type={t} selected={new Set(pattern.subset)} index={byType.get(t) ?? 0} curvedStrands size={52} />
                <span>{t}</span>
              </button>
            ))}
          </div>
          <div className="td__controls">
            <span>or start on the longest circuit in a level</span>
            <select value={findLevel} onChange={(e) => setFindLevel(Number(e.target.value))} data-testid="wk-find-level" aria-label="Supertile level">
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>Delta</span>
            <button type="button" onClick={place} data-testid="wk-find">Find it</button>
            {found && <span className="td__hint" data-testid="wk-found">{found}</span>}
          </div>
          {(mode === 'landings' || (steps.length === 0 && !waiting)) && (
            <p data-testid="wk-start-edges">
              The strand comes into the {startType0} through edge{' '}
              {startSeams.map((s) => (
                <button key={s.edge} type="button" className={`td__chip${startEdge === s.edge || seed.edge === s.edge ? ' is-active' : ''}`} onClick={() => { dispatch({ type: 'startEdge', edge: s.edge }); setSeed((x) => ({ edge: s.edge, n: x.n + 1 })); }} data-testid={`wk-edge-${s.edge}`}>
                  {s.edge} → {table.get(startType0)?.get(s.edge) ?? '–'}
                </button>
              ))}
              {startSeams.length === 0 && 'none: no edge of this tile carries a strand under this rule.'}
            </p>
          )}
        </div>
      </section>

      <section className="td__board">
        <h2>3. The walk</h2>
        <div className="wk__modes" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'landings'} className={`td__chip${mode === 'landings' ? ' is-active' : ''}`} onClick={() => setMode('landings')} data-testid="wk-mode-landings">Choose where it lands</button>
          <button type="button" role="tab" aria-selected={mode === 'ancestors'} className={`td__chip${mode === 'ancestors' ? ' is-active' : ''}`} onClick={() => setMode('ancestors')} data-testid="wk-mode-ancestors">Choose each ancestor</button>
          <span className="td__hint">
            {mode === 'landings'
              ? 'Every ancestor stack is followed at once; the walk only stops where they disagree about where the strand lands.'
              : 'Each time the strand leaves the supertile built so far, pick its parent.'}
          </span>
        </div>
        {mode === 'landings' ? (
          seed.edge === null
            ? <p className="td__hint">Choose the edge the strand comes in through, above.</p>
            : <LandingWalk
                key={`${seed.n}|${pattern.subset.join('')}|${pattern.matching.join('')}`}
                pattern={pattern}
                byType={byType}
                start={seed.stacks ? seed.stacks[0].at.leaf : startType0}
                startEdge={seed.edge}
                worlds={seed.stacks}
              />
        ) : (
          <>
        <div className="td__controls">
          <button type="button" onClick={() => dispatch({ type: 'step', pattern })} disabled={!canStep} data-testid="wk-step">
            Step
          </button>
          <button type="button" onClick={() => dispatch({ type: 'run', pattern, cap: RUN_CAP })} disabled={!canStep} data-testid="wk-run">
            Run until a choice
          </button>
          <span className="td__hint" data-testid="wk-status">
            {closed
              ? `A circuit: back on the start tile through edge ${startEdge}, after ${steps.length} tiles. No step settled above level ${maxHeight}.`
              : waiting
                ? `Step ${steps.length + 1} goes out through edge ${waiting.exit} of the ${waiting.type}, across the outside of everything built so far. Choose the next ancestor below; hover one to preview it.`
                : board.entry === null
                  ? 'Choose the edge the strand comes in through.'
                  : nextExit === undefined
                    ? `Edge ${board.entry} of a ${curType} carries no strand under this rule.`
                    : `${steps.length} ${steps.length === 1 ? 'tile' : 'tiles'} walked; the next step goes out through edge ${nextExit}. Enter steps.`}
          </span>
        </div>

        <div className="wk__main">
          <HexBoard
            tiles={boardTiles}
            pattern={{ subset: pattern.subset, matching: byType }}
            strand={strand}
            pendingStep={waiting ? { ...waiting, xform: current.xform } : null}
            boundaries={drawn.edges}
            previewBoundaries={preview?.edges ?? []}
            focus={{ xform: current.xform, type: curType, entry: board.entry }}
            nest={{ root: world.root, level: world.level }}
            marks={marks}
            testId="wk-svg"
          />

          <div className="wk__tape" data-testid="wk-tape">
            <div className={`wk__cell is-unknown${waiting ? ' is-wanted' : ''}`} data-testid="wk-cell-unknown">
              <span className="wk__lvl">level {world.level + 1}</span> {waiting && preview ? `${preview.option.parent}, slot ${preview.option.slot}?` : 'not chosen'}
            </div>
            {[...address.path].map((l, k) => ({ l, k })).reverse().map(({ l, k }) => {
              const changed = prevAddress && (prevAddress.path[k]?.slot !== l.slot || prevAddress.path[k]?.parent !== l.parent);
              const read = lastHeight !== null && k < lastHeight;
              return (
                <div key={k} className={`wk__cell${changed ? ' is-changed' : ''}${read ? ' is-read' : ''}`} data-testid={`wk-cell-${k + 1}`}>
                  <span className="wk__lvl">level {k + 1}</span> <span className="wk__swatch" style={{ background: tileColor(l.parent) }} />{l.parent}, slot {l.slot}
                </div>
              );
            })}
            <div className={`wk__cell is-tile${prevAddress && prevAddress.leaf !== address.leaf ? ' is-changed' : ''}`} data-testid="wk-cell-0">
              <span className="wk__lvl">tile</span> <span className="wk__swatch" style={{ background: tileColor(address.leaf) }} />{address.leaf}{board.entry !== null ? `, in through ${board.entry}` : ''}
            </div>
            <p className="td__hint" data-testid="wk-start-id">Start tile: {world.startId || '(the root)'}, entered through edge {startEdge ?? '–'}.</p>
            <p className="td__hint">
              The current tile's slot path, read bottom up. {lastHeight === null ? '' : `The last step settled at level ${lastHeight}: shaded cells were read, outlined cells rewritten.`}
            </p>
            <p className="td__hint">
              On the board: the strand in black, every tile's pairing faint, edge numbers on the current tile (blue in, orange out), a green ring on the start tile, thicker lines for higher supertile boundaries.
            </p>
          </div>
        </div>

        {waiting && (
          <div className="td__pending" data-testid="wk-pending" onMouseLeave={() => setPreviewing(false)}>
            <p>
              The board is a level-{world.level} {world.root}. Its parent can be any of these.{' '}
              {options.every((o) => o.landing) ? 'Each one takes the strand back inside at once; they differ in where it lands.' : 'Some take the strand back inside at once ("lands on"); others need more ancestors.'}
            </p>
            <div className="td__chips">
              {options.map((o, i) => (
                <button
                  key={`${o.parent}-${o.slot}`}
                  type="button"
                  className={`td__chip${previewing && i === board.previewIdx ? ' is-active' : ''}`}
                  onMouseEnter={() => { setPreviewing(true); dispatch({ type: 'preview', idx: i }); }}
                  onFocus={() => { setPreviewing(true); dispatch({ type: 'preview', idx: i }); }}
                  onClick={() => { setPreviewing(false); dispatch({ type: 'grow', parent: o.parent, slot: o.slot }); }}
                  disabled={world.level >= MAX_LEVEL}
                  data-testid={`wk-parent-${o.parent}-${o.slot}`}
                >
                  <span className="wk__swatch" style={{ background: tileColor(o.parent) }} />slot {o.slot} of a {o.parent}
                  <span className="td__chip-note">{o.landing ? ` lands on ${o.landingType}` : o.needs ? ` needs ${o.needs - 1} more` : ' never lands'}</span>
                </button>
              ))}
            </div>
            <p className="td__hint" data-testid="wk-preview">
              {preview
                ? preview.landing
                  ? `Previewed (dashed): slot ${preview.option.slot} of a ${preview.option.parent}. The strand would land on the outlined ${preview.option.landingType}.`
                  : `Previewed (dashed): slot ${preview.option.slot} of a ${preview.option.parent}. The strand would still leave it${preview.option.needs ? `; ${preview.option.needs - 1} more parent${preview.option.needs - 1 === 1 ? '' : 's'} at least` : ''}.`
                : 'Hover a parent, or use the arrow keys, to see the tiles it adds.'}
              {world.level >= MAX_LEVEL && ` The board stops at level ${MAX_LEVEL}.`}
            </p>
          </div>
        )}
          </>
        )}
      </section>

      <section className="td__section">
        <h2>4. The machine</h2>
        <MachineView pattern={pattern} byType={byType} current={closed ? null : { type: curType, entry: board.entry }} />
      </section>

      {mode === 'ancestors' && <section className="td__section">
        <h2>How high each step reached</h2>
        <p>One bar per step: the level where its crossing settled.</p>
        <svg className="wk__heights" viewBox={`0 0 ${Math.max(1, heights.length)} ${maxHeight}`} preserveAspectRatio="none" data-testid="wk-heights" data-steps={heights.length}>
          {heights.map((h, i) => <rect key={i} x={i} y={maxHeight - h} width={1} height={h} />)}
        </svg>
      </section>}

      {mode === 'ancestors' && closed && (
        <section className="td__section" data-testid="wk-sides">
          <h2>Three sides</h2>
          {!sides ? (
            <p>{steps.length} tiles is not a multiple of 3, so the circuit is not three copies of one side.</p>
          ) : (
            <>
              <p>
                Each tile written as its type and the edges in and out (<code>{sides.word[0]}</code> is a{' '}
                {sides.word[0].slice(0, -2)} entered through edge {sides.word[0].slice(-2, -1)} and left through edge {sides.word[0].slice(-1)}),
                the circuit cut into three sides of {sides.S} and compared. Hover a run to ring its tiles on the board. {sides.runs.length === 0
                  ? 'The three sides are the same word.'
                  : `They differ at ${sides.runs.reduce((s, r) => s + r.to - r.from + 1, 0)} positions, in ${sides.runs.length} ${sides.runs.length === 1 ? 'run' : 'runs'}: red dots on the odd side, amber on the matching tiles of the other two.`}
              </p>
              {sides.runs.length > 0 && (
                <ul data-testid="wk-runs">
                  {sides.runs.map((r, ri) => {
                    const ref = (Math.max(0, r.odd) + 1) % 3;
                    return (
                      <li key={r.from} className="wk__run" onMouseEnter={() => setHoverRun(ri)} onMouseLeave={() => setHoverRun(null)}>
                        Positions {r.from}–{r.to}: {r.odd < 0 ? 'all three sides differ' : `side ${r.odd + 1} ${r.reversed ? 'walks the block backwards' : 'differs'}`}:{' '}
                        <code>{sides.word.slice(r.from + ref * sides.S, r.to + 1 + ref * sides.S).join(' ')}</code>
                        {r.odd >= 0 && <> against <code>{sides.word.slice(r.from + r.odd * sides.S, r.to + 1 + r.odd * sides.S).join(' ')}</code></>}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p>
                Corners (ringed): the tile of each side farthest from the circuit's centre. The nine tiles round each{' '}
                {new Set(sides.joins).size === 1 ? 'are the same word' : 'differ'}:
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
