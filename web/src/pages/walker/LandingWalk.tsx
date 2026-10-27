/**
 * The walk on every tiling at once (`possible.ts`): the strand only stops
 * where the possible ancestor stacks disagree about where it lands, and
 * offers those landings. The board shows one of the stacks still possible;
 * hovering a landing shows a stack that lands there. Every choice made stays
 * in the tree of choices, and clicking one goes back to it.
 */
import { useMemo, useReducer, useState } from 'react';

import { idOf, type HexType } from '../../core';
import { HexBoard, type BoardStep, type BoardTile } from '../../components/HexBoard';
import { placeWorld, tilesAround, type PlacedTile } from '../../lib/hexBoard';
import { tileColor } from '../../lib/palette';
import { classLabel } from './landings';
import { makeWalker, reducePossible, replay, startWalk, typesByLevel, type ChoiceNode, type Outcome, type PossibleWalk, type World } from './possible';
import { SidesView, sideMarks, sidesOf } from './SidesView';
import type { Pattern } from './walk';

export const MAX_LEVEL = 5;
const RUN_CAP = 20000;
const FAINT_CAP = 3000;

function Swatch({ type }: { type: HexType }): JSX.Element {
  return <span className="wk__swatch" style={{ background: tileColor(type) }} />;
}

/** Where a stack puts the strand's tiles, placed relative to the start tile. */
function sceneOf(pw: PossibleWalk, w: World, steps: number) {
  const wk = pw.walker;
  const { at, levels } = replay(wk, w, steps);
  const level = w.chain.length;
  const root = level ? w.chain[level - 1].parent : wk.start;
  const placed = placeWorld({ root, level, startId: idOf({ leaf: wk.start, path: w.chain }) });
  return { placed, ids: at.map(idOf), levels, root, level };
}

export function outcomeText(o: Outcome, maxLevel: number): string {
  if (o.key === 'closes') return 'closes the circuit';
  if (o.key === 'open') return `still on the outside of a level-${maxLevel} supertile`;
  return `lands on a ${o.type}, through its edge ${o.edge} (${classLabel(o.type!, o.edge!)})`;
}

function TreeNode({ pw, node, onGoto }: { pw: PossibleWalk; node: ChoiceNode; onGoto: (id: number) => void }): JSX.Element {
  const label = node.key === null
    ? `start: ${pw.walker.start}, in through ${pw.walker.startEdge}`
    : `step ${node.stage.seen.length}: ${node.key === 'closes' ? 'closes' : node.key === 'open' ? 'open' : node.key.replace(' ', ', edge ')}`;
  return (
    <li>
      <button type="button" className={`wk__node${node.id === pw.current ? ' is-current' : ''}`} onClick={() => onGoto(node.id)} data-testid={`wk-node-${node.id}`}>
        {node.key && node.key !== 'closes' && node.key !== 'open' && <Swatch type={node.key.split(' ')[0] as HexType} />}
        {label}
      </button>
      {node.children.length > 0 && <ul>{node.children.map((c) => <TreeNode key={c} pw={pw} node={pw.nodes[c]} onGoto={onGoto} />)}</ul>}
    </li>
  );
}

export interface LandingWalkProps {
  readonly pattern: Pattern;
  readonly byType: ReadonlyMap<HexType, number>;
  readonly start: HexType;
  readonly startEdge: number;
  /** Start from these stacks (a circuit found in a supertile) instead of the bare tile. */
  readonly worlds?: readonly World[];
}

export function LandingWalk({ pattern, byType, start, startEdge, worlds }: LandingWalkProps): JSX.Element {
  const [pw, dispatch] = useReducer(reducePossible, null, () => startWalk(makeWalker(pattern, start, startEdge, MAX_LEVEL), worlds));
  const [hover, setHover] = useState<Outcome | null>(null);
  const [hoverRun, setHoverRun] = useState<number | null>(null);
  const { stage } = pw;
  const n = stage.seen.length;

  // The board: one stack still possible, or while a landing is hovered, a stack that lands there.
  const shown = useMemo(() => {
    const w = hover ? hover.worlds[0] : stage.worlds[0];
    return sceneOf(pw, w, hover ? n + 1 : n);
  }, [pw, hover, stage, n]);
  const walked = shown.ids.slice(0, n + 1);
  const solid = [...new Set(walked)].map((id) => shown.placed.get(id)).filter((p): p is PlacedTile => !!p);
  const landing = hover && hover.key !== 'closes' && hover.key !== 'open' ? shown.placed.get(shown.ids[n + 1]) : undefined;
  const faint = tilesAround(shown.placed.values(), landing ? [...solid, landing] : solid, 3.6, FAINT_CAP, new Set([...walked, ...(landing ? [landing.id] : [])]));
  const tiles: BoardTile[] = [
    ...faint.map((t): BoardTile => ({ ...t, tone: 'faint' })),
    ...solid.map((t): BoardTile => ({ ...t, tone: 'solid' })),
    ...(landing ? [{ ...landing, tone: 'preview' as const, className: 'is-landing' }] : []),
  ];
  const xformOf = (id: string) => shown.placed.get(id)!.xform;
  const strand: BoardStep[] = stage.seen.map((s, i) => ({ ...s, xform: xformOf(shown.ids[i]) }));
  const here = stage.worlds[0];
  const current = shown.placed.get(shown.ids[n]) ?? solid[solid.length - 1];

  const closed = stage.status === 'closed';
  const sides = useMemo(() => (closed ? sidesOf(stage.seen, shown.ids, xformOf) : null), [closed, stage.seen, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const marks = [
    ...sideMarks(sides, hoverRun, xformOf),
    { xform: xformOf(shown.ids[0]), kind: 'start', r: 0.75 },
  ];
  const levels = useMemo(() => typesByLevel(stage.worlds), [stage.worlds]);
  const unread = stage.worlds.filter((w) => w.chain.length < levels.length).length;
  const heights = shown.levels.slice(0, n);
  const maxHeight = Math.max(1, ...heights);
  const choicesMade = pw.nodes[pw.current] ? (function count(id: number): number { const p = pw.nodes[id].parent; return p === null ? 0 : 1 + count(p); })(pw.current) : 0;

  return (
    <>
      <div className="td__controls">
        <button type="button" onClick={() => dispatch({ type: 'step' })} disabled={stage.status !== 'walking'} data-testid="wk-step">Step</button>
        <button type="button" onClick={() => dispatch({ type: 'run', cap: RUN_CAP })} disabled={stage.status !== 'walking'} data-testid="wk-run">Run until a choice</button>
        <span className="td__hint" data-testid="wk-status">
          {stage.status === 'closed'
            ? `A circuit of ${n} tiles, after ${choicesMade} ${choicesMade === 1 ? 'choice' : 'choices'}. It is the same circuit for all ${stage.worlds.length} ancestor stacks left.`
            : stage.status === 'open'
              ? `The strand is still on the outside of a level-${MAX_LEVEL} supertile after ${n} tiles.`
              : stage.status === 'choice'
                ? `Step ${n + 1}: the ${stage.worlds.length} ancestor stacks still possible disagree about where the strand lands. Choose below.`
                : stage.status === 'stuck'
                  ? 'This edge carries no strand under the pattern.'
                  : `${n} ${n === 1 ? 'tile' : 'tiles'} walked; ${stage.worlds.length} ancestor ${stage.worlds.length === 1 ? 'stack' : 'stacks'} still possible. Steps they all agree on are taken without asking.`}
        </span>
      </div>

      {stage.status === 'choice' && (
        <div className="td__pending" data-testid="wk-choices" onMouseLeave={() => setHover(null)}>
          <p>Leaving the {here.at.leaf} through edge {pw.walker.table.get(here.at.leaf)?.get(here.entry)}, the strand…</p>
          <div className="wk__outcomes">
            {stage.pending.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`wk__outcome${hover?.key === o.key ? ' is-active' : ''}`}
                onMouseEnter={() => setHover(o)}
                onFocus={() => setHover(o)}
                onClick={() => { setHover(null); dispatch({ type: 'choose', key: o.key }); }}
                data-testid={`wk-outcome-${o.key.replace(' ', '-')}`}
              >
                {o.type && <Swatch type={o.type} />}
                {outcomeText(o, MAX_LEVEL)}
                <span className="td__chip-note"> in {o.worlds.length} {o.worlds.length === 1 ? 'stack' : 'stacks'}</span>
              </button>
            ))}
          </div>
          <p className="td__hint">Hover one to see a tiling where it happens; click to keep it. Only the stacks that agree with it are kept.</p>
        </div>
      )}

      <div className="wk__main">
        <HexBoard
          tiles={tiles}
          pattern={{ subset: pattern.subset, matching: byType }}
          strand={strand}
          focus={current && !closed ? { xform: current.xform, type: here.at.leaf, entry: here.entry } : null}
          marks={marks}
          testId="wk-svg"
        />
        <div className="wk__tape" data-testid="wk-tape">
          <p className="wk__tape-title">Ancestors still possible</p>
          <div className="wk__cell is-unknown"><span className="wk__lvl">level {levels.length + 1}</span> not read yet</div>
          {[...levels].map((m, k) => ({ m, k })).reverse().map(({ m, k }) => (
            <div key={k} className={`wk__cell${m.size === 1 ? ' is-fixed' : ''}`} data-testid={`wk-level-${k + 1}`}>
              <span className="wk__lvl">level {k + 1}</span>
              {[...m].sort((a, b) => b[1] - a[1]).map(([t, c]) => <span key={t} className="wk__poss" title={`${c} stacks`}><Swatch type={t} />{t}</span>)}
            </div>
          ))}
          <div className="wk__cell is-tile"><span className="wk__lvl">tile</span> <Swatch type={here.at.leaf} />{here.at.leaf}{closed ? '' : `, in through ${here.entry}`}</div>
          <p className="td__hint">
            {stage.worlds.length} {stage.worlds.length === 1 ? 'stack' : 'stacks'} of ancestors agree with the walk so far{unread ? `; ${unread} of them have not needed every level shown` : ''}. A level with one type is settled.
          </p>
          <p className="td__hint">The board shows one of these stacks. The strand in black, every tile's pairing faint, the current tile's edge numbers (blue in, orange out), the start ringed green.</p>
        </div>
      </div>

      <div className="wk__treebox">
        <h3>Choices</h3>
        <ul className="wk__tree" data-testid="wk-tree"><TreeNode pw={pw} node={pw.nodes[0]} onGoto={(id) => dispatch({ type: 'goto', id })} /></ul>
        <p className="td__hint">Click a choice to go back to it; choosing differently there adds a branch.</p>
      </div>

      <section className="td__section">
        <h3>How high each step reached</h3>
        <p>One bar per step: the level where its crossing settled, in the stack shown.</p>
        <svg className="wk__heights" viewBox={`0 0 ${Math.max(1, heights.length)} ${maxHeight}`} preserveAspectRatio="none" data-testid="wk-heights" data-steps={heights.length}>
          {heights.map((h, i) => <rect key={i} x={i} y={maxHeight - h} width={1} height={h} />)}
        </svg>
      </section>

      {closed && <SidesView sides={sides} length={n} onHoverRun={setHoverRun} />}
    </>
  );
}

export default LandingWalk;
