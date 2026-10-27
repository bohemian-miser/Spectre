/**
 * The walk on every tiling at once (`possible.ts`): the strand only stops
 * where the possible ancestor stacks disagree about where it lands, and
 * offers those landings. The board shows one of the stacks still possible;
 * hovering a landing shows a stack that lands there. Every choice made stays
 * in the tree of choices, and clicking one goes back to it.
 */
import { useMemo, useReducer, useState } from 'react';

import { addressFromId, idOf, type HexType } from '../../core';
import { HexBoard, type BoardStep, type BoardTile } from '../../components/HexBoard';
import { HEX_OUTLINE, placeWorld, supertileEdges, tilesAround, type PlacedTile } from '../../lib/hexBoard';
import { classLabel } from './landings';
import { makeWalker, reducePossible, replay, startWalk, type Outcome, type PossibleWalk, type World } from './possible';
import { ChoiceTree } from './ChoiceTree';
import { SidesView, sideMarks, sidesOf } from './SidesView';
import type { Pattern } from './walk';

export const MAX_LEVEL = 5;
const RUN_CAP = 20000;
const FAINT_CAP = 3000;

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
  const [whole, setWhole] = useState(false);
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
  const boundaries = useMemo(
    () => supertileEdges([...solid, ...faint].slice(0, 3000).map((t) => ({ ...t, address: addressFromId(shown.root, t.id) })), HEX_OUTLINE, shown.level),
    [shown, solid.length, faint.length], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const strand: BoardStep[] = stage.seen.map((s, i) => ({ ...s, xform: xformOf(shown.ids[i]) }));
  const here = stage.worlds[0];
  const current = shown.placed.get(shown.ids[n]) ?? solid[solid.length - 1];

  const closed = stage.status === 'closed';
  const sides = useMemo(() => (closed ? sidesOf(stage.seen, shown.ids, xformOf) : null), [closed, stage.seen, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const marks = [
    ...sideMarks(sides, hoverRun, xformOf),
    { xform: xformOf(shown.ids[0]), kind: 'start', r: 0.75 },
  ];
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
                ? `Step ${n + 1}: the ${stage.worlds.length} ancestor stacks still possible disagree about where the strand lands. Choose on the right.`
                : stage.status === 'stuck'
                  ? 'This edge carries no strand under the pattern.'
                  : `${n} ${n === 1 ? 'tile' : 'tiles'} walked; ${stage.worlds.length} ancestor ${stage.worlds.length === 1 ? 'stack' : 'stacks'} still possible. Steps they all agree on are taken without asking.`}
        </span>
      </div>


      <div className="wk__main">
        <HexBoard
          tiles={tiles}
          pattern={{ subset: pattern.subset, matching: byType }}
          strand={strand}
          focus={current && !closed ? { xform: current.xform, type: here.at.leaf, entry: here.entry } : null}
          marks={marks}
          boundaries={boundaries}
          nest={{ root: shown.root, level: shown.level }}
          testId="wk-svg"
        />
        <div className="wk__side">
          <p className="wk__tape-title">Landings</p>
          <ChoiceTree
            pw={pw}
            mode="path"
            onGoto={(id) => { setHover(null); dispatch({ type: 'goto', id }); }}
            onChooseAt={(id, key) => { setHover(null); dispatch({ type: 'chooseAt', id, key }); }}
            onHoverOption={(key) => setHover(key && stage.status === 'choice' ? stage.pending.find((o) => o.key === key) ?? null : null)}
          />
        </div>
      </div>


      <section className="td__section">
        <h3>How high each step reached</h3>
        <p>One bar per step: the level where its crossing settled, in the stack shown.</p>
        <svg className="wk__heights" viewBox={`0 0 ${Math.max(1, heights.length)} ${maxHeight}`} preserveAspectRatio="none" data-testid="wk-heights" data-steps={heights.length}>
          {heights.map((h, i) => <rect key={i} x={i} y={maxHeight - h} width={1} height={h} />)}
        </svg>
      </section>

      <div className="wk__whole">
        <button type="button" className="td__chip" onClick={() => setWhole((v) => !v)} aria-expanded={whole} data-testid="wk-whole">
          {whole ? 'Hide the whole tree' : 'Show the whole tree'}
        </button>
        {whole && (
          <div className="wk__whole-tree">
            <ChoiceTree pw={pw} mode="full" onGoto={(id) => dispatch({ type: 'goto', id })} onChooseAt={(id, key) => dispatch({ type: 'chooseAt', id, key })} />
          </div>
        )}
      </div>

      {closed && <SidesView sides={sides} length={n} onHoverRun={setHoverRun} />}
    </>
  );
}

export default LandingWalk;
