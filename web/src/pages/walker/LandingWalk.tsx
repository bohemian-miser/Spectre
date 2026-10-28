/**
 * The walk on every tiling at once (`possible.ts`): the strand only stops
 * where the possible ancestor stacks disagree about where it lands, and
 * offers those landings. The board shows one of the stacks still possible;
 * hovering a landing shows a stack that lands there. Every choice made stays
 * in the tree of choices, and clicking one goes back to it.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { addressFromId, idOf, type HexType } from '../../core';
import { HexBoard, type BoardStep, type BoardTile } from '../../components/HexBoard';
import { HEX_OUTLINE, placeNear, placeWorld, strandPathD, supertileEdges, tileCentre, tilePoints, tilesAround, type PlacedTile } from '../../lib/hexBoard';
import { tileColor } from '../../lib/palette';
import { choicesOf, concreteChain, circuitsAhead, followWord, makeWalker, reducePossible, replay, replayChoices, rotateWord, stageAfter, stageAhead, startWalk, type Ahead, type Limits, type Outcome, type PossibleWalk, type Seen, type World } from './possible';
import { AncestorFlow } from './AncestorFlow';
import { classLabel } from './landings';
import { CircuitList } from './CircuitList';
import { circuitsOf } from './circuits';
import { ChoiceTree } from './ChoiceTree';
import type { Choice } from './share';
import { SidesView, sideMarks, sidesOf } from './SidesView';
import type { Pattern } from './walk';

export const MAX_LEVEL = 5;
const RUN_CAP = 20000;
const FAINT_CAP = 3000;

/** Where a stack puts the strand's tiles, placed relative to the start tile. */
function sceneOf(pw: PossibleWalk, w: World, steps: number) {
  const wk = pw.walker;
  const { at, levels } = replay(wk, w, steps);
  // a stack across a seam is shown closed in the fewest parents that bring its sides together
  const chain = concreteChain(w);
  const level = chain.length;
  const root = level ? chain[level - 1].parent : wk.start;
  const ids = at.map(idOf);
  const world = { root, level, startId: idOf({ leaf: wk.start, path: chain }) };
  const placed = level <= MAX_LEVEL ? placeWorld(world) : placeNear(world, ids);
  return { placed, ids, levels, root, level };
}

/**
 * The walk from a node of the tree, drawn small beside the pointer: its
 * tiles in their colours and the strand through their centres, to the
 * node's fork or to where its branch ends.
 */
function CircuitPeek({ pw, subset, id, landing, x, y }: { pw: PossibleWalk; subset: readonly number[]; id: number; landing?: string; x: number; y: number }): JSX.Element | null {
  const drawn = useMemo(() => {
    // a landing not yet taken is taken here, on the side, without adding it to the tree
    const st = landing ? stageAfter(pw, id, landing, RUN_CAP) : stageAhead(pw, id, RUN_CAP);
    const g = sceneOf(pw, st.worlds[0], st.seen.length);
    const ids = g.ids.slice(0, st.seen.length + 1).filter((t) => g.placed.has(t));
    const tiles = [...new Set(ids)].map((t) => g.placed.get(t)!);
    const pts = ids.map((t) => tileCentre(g.placed.get(t)!.xform));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const box = { x: Math.min(...xs) - 1.2, y: Math.min(...ys) - 1.2, w: Math.max(...xs) - Math.min(...xs) + 2.4, h: Math.max(...ys) - Math.min(...ys) + 2.4 };
    const strand = strandPathD(st.seen.flatMap((s, i) => (g.placed.has(g.ids[i]) ? [{ ...s, xform: g.placed.get(g.ids[i])!.xform }] : [])), subset);
    return { st, tiles, pts, box, strand };
  }, [pw, id, landing, subset]);
  const { st, tiles, pts, box, strand } = drawn;
  const size = 220;
  const left = Math.min(x + 18, window.innerWidth - size - 12);
  const top = Math.min(y + 18, window.innerHeight - size - 40);
  return (
    <div className="wk__peek" style={{ left, top, width: size }} data-testid="wk-peek">
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} width={size} height={size}>
        {tiles.map((t) => <polygon key={t.id} points={tilePoints(t.xform)} fill={tileColor(t.type)} className="wk__peek-tile" />)}
        <path d={strand} className="wk__peek-strand" />
        {pts[0] && <circle cx={pts[0].x} cy={pts[0].y} r={0.6} className="wk__peek-start" />}
      </svg>
      <p>{st.status === 'closed' ? `A circuit of ${st.seen.length} tiles` : st.status === 'choice' ? `${st.seen.length} tiles, to the fork at step ${st.seen.length + 1}` : `${st.seen.length} tiles, still open`}</p>
    </div>
  );
}

const CHAIN_ROWS = 5000;
/** How far the circuits ahead of each landing are looked for, and how far the nearest circuit is sought. */
const AHEAD = { choices: 3, forks: 30, tiles: 3000 };
const SEEK = { choices: 40, forks: 400, tiles: 30000 };

/** The walk tile by tile: the tile, its slot path, the edges in and out with their classes, where the crossing out settled, and the landing chosen there. */
function ChainTable({ seen, ids, levels, root, level, chosen }: {
  seen: readonly Seen[]; ids: readonly string[]; levels: readonly number[]; root: HexType; level: number; chosen: ReadonlyMap<number, { key: string; options: string[] }>;
}): JSX.Element {
  const rows = seen.slice(0, CHAIN_ROWS);
  return (
    <>
      <p className="td__hint">
        Slot paths in a level-{level} {root}{seen.length > CHAIN_ROWS ? `; the first ${CHAIN_ROWS.toLocaleString('en-US')} of ${seen.length.toLocaleString('en-US')} tiles` : ''}.
        A choice is on the tile it lands on.
      </p>
      <table className="wk__chain" data-testid="wk-chain">
        <thead>
          <tr><th>#</th><th>Tile</th><th>Slot path</th><th>In</th><th>Out</th><th>Crossing out settled at</th><th>Chosen</th></tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const c = chosen.get(i);
            return (
              <tr key={i} className={c ? 'is-chosen' : ''}>
                <td>{i}</td>
                <td>{s.type}</td>
                <td className="td__mono">{ids[i] ?? ''}</td>
                <td>{s.entry} <span className="td__mono">{classLabel(s.type, s.entry)}</span></td>
                <td>{s.exit} <span className="td__mono">{classLabel(s.type, s.exit)}</span></td>
                <td>{levels[i] !== undefined ? `level ${levels[i]}` : ''}</td>
                <td>{c ? `${c.key}, of ${c.options.join(' / ')}` : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export interface LandingWalkProps {
  readonly pattern: Pattern;
  readonly byType: ReadonlyMap<HexType, number>;
  readonly start: HexType;
  readonly startEdge: number;
  /** Start from these stacks (a circuit found in a supertile) instead of the bare tile. */
  readonly worlds?: readonly World[];
  /** Choices to make again on the way in (from a shared link), the node to show, and whether the whole tree is open. */
  readonly initial?: { readonly choices: readonly Choice[]; readonly current: number; readonly whole: boolean };
  /** Told the choices, the current node and whether the whole tree is open, whenever they change. */
  readonly onState?: (choices: Choice[], current: number, whole: boolean) => void;
  /** A circuit to walk again on the way in: at each fork, the landing it goes to. */
  readonly follow?: readonly Seen[];
  /** Asked to walk a closed circuit again from another of its tiles: its tiles from there. */
  readonly onRestart?: (word: Seen[]) => void;
}

export function LandingWalk({ pattern, byType, start, startEdge, worlds, initial, onState, follow, onRestart }: LandingWalkProps): JSX.Element {
  const [pw, dispatch] = useReducer(reducePossible, null, () => {
    const w = startWalk(makeWalker(pattern, start, startEdge, MAX_LEVEL), worlds);
    // from a link: make its choices again and walk on to where it was
    if (follow) return followWord(w, follow, RUN_CAP);
    return initial ? replayChoices(w, initial.choices, initial.current) : w;
  });
  const [hover, setHover] = useState<Outcome | null>(null);
  const [hoverRun, setHoverRun] = useState<number | null>(null);
  // the whole tree: off, beside the board, or across the page
  const [view, setView] = useState<'off' | 'split' | 'full'>(initial?.whole ? 'split' : 'off');
  const whole = view !== 'off';
  const [limits, setLimits] = useState<Limits>({ forks: 60, tiles: 1000 });
  const [exploring, setExploring] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const [showDecisions, setShowDecisions] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  // per landing at the current fork, the circuits found a few choices ahead, worked out in the background
  const [ahead, setAhead] = useState<{ at: string; by: ReadonlyMap<string, Ahead> } | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [peek, setPeek] = useState<{ id: number; landing?: string; x: number; y: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  // the pointer, wherever it is, so a node's walk is drawn beside it in any of the trees
  const peeking = useRef(false);
  peeking.current = peek !== null;
  useEffect(() => {
    const move = (e: MouseEvent): void => {
      pointer.current = { x: e.clientX, y: e.clientY };
      if (peeking.current) setPeek((p) => (p ? { ...p, ...pointer.current } : p));
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  const mainRef = useRef<HTMLDivElement | null>(null);
  // a pointer that hovers shows a node's walk beside it; a touch screen shows it on the board above
  const canHover = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;
  // subtrees three choices down fold away, unless on the way to the current node; a click flips one
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(() => new Set());
  const toggle = (id: number): void => setFlipped((f) => { const g = new Set(f); if (g.has(id)) g.delete(id); else g.add(id); return g; });
  const onRoute = useMemo(() => { const r = new Set<number>(); for (let id: number | null = pw.current; id !== null; id = pw.nodes[id].parent) r.add(id); return r; }, [pw]);
  const isCollapsed = useCallback((id: number): boolean => {
    let depth = 0;
    for (let at = pw.nodes[id].parent; at !== null; at = pw.nodes[at].parent) depth++;
    const fold = depth >= 3 && !onRoute.has(id);
    return flipped.has(id) ? !fold : fold;
  }, [pw, onRoute, flipped]);
  // a landing taken, or a node of the tree, walks on by itself to the next fork or the end
  const goto = (id: number): void => { setHover(null); dispatch({ type: 'goto', id }); dispatch({ type: 'run', cap: RUN_CAP }); };
  const take = (id: number, key: string): void => { setHover(null); dispatch({ type: 'chooseAt', id, key }); dispatch({ type: 'run', cap: RUN_CAP }); };
  // take every landing a little at a time, so the page keeps drawing
  useEffect(() => {
    if (!exploring) return undefined;
    if (pw.explored?.done) { setExploring(false); return undefined; }
    const t = setTimeout(() => dispatch({ type: 'explore', limits, budgetMs: 250 }), 0);
    return () => clearTimeout(t);
  }, [exploring, pw, limits]);
  const circuits = useMemo(() => circuitsOf(pw), [pw]);
  const forksOpen = pw.nodes.filter((x) => x.fork).length;
  const unopened = pw.nodes.filter((x) => !x.fork && !x.end && x.id !== pw.current).length;
  const long = pw.nodes.filter((x) => x.end?.status === 'walking').length;
  const branchesClosed = circuits.reduce((a, c) => a + c.nodes.length, 0);
  const exploredText = `${exploring ? 'Exploring: ' : ''}${forksOpen} ${forksOpen === 1 ? 'fork' : 'forks'}; ${branchesClosed} ${branchesClosed === 1 ? 'branch closes' : 'branches close'} on ${circuits.length} ${circuits.length === 1 ? 'circuit' : 'circuits'}${long ? `; ${long} still open after ${limits.tiles} tiles` : ''}${unopened && !exploring ? `; ${unopened} not walked (fork limit)` : ''}.`;
  useEffect(() => { onState?.(choicesOf(pw), pw.current, whole); }, [pw, whole]); // eslint-disable-line react-hooks/exhaustive-deps
  const { stage } = pw;
  const n = stage.seen.length;
  // every stack at the fork, after its step, whichever landing it takes
  const atFork = useMemo(() => stage.pending.flatMap((o) => o.worlds), [stage]);

  // The board: one stack still possible, or while a landing is hovered, a stack that lands there.
  const shown = useMemo(() => {
    const w = hover ? hover.worlds[0] : stage.worlds[0];
    return sceneOf(pw, w, hover ? n + 1 : n);
  }, [pw, hover, stage, n]);
  const walked = shown.ids.slice(0, n + 1);
  const solid = [...new Set(walked)].map((id) => shown.placed.get(id)).filter((p): p is PlacedTile => !!p);
  const landing = hover && hover.key !== 'closes' && hover.key !== 'open' ? shown.placed.get(shown.ids[n + 1]) : undefined;
  const faint = tilesAround(shown.placed.values(), landing ? [...solid, landing] : solid, 3.6, FAINT_CAP, new Set([...walked, ...(landing ? [landing.id] : [])]));
  // per landing tile chosen on the way to the current node: the landing taken and those offered
  const chosen = useMemo(() => {
    const out = new Map<number, { key: string; options: string[] }>();
    for (let id: number | null = pw.current; id !== null && pw.nodes[id].parent !== null; id = pw.nodes[id].parent) {
      const fork = pw.nodes[pw.nodes[id].parent!].fork;
      if (fork) out.set(fork.step, { key: pw.nodes[id].key!, options: fork.options.map((o) => o.key) });
    }
    return out;
  }, [pw]);
  // the tiles where a landing was chosen, along the walk to the current node
  const decisions = useMemo(() => {
    const out = new Set<string>();
    if (!showDecisions) return out;
    for (let id: number | null = pw.current; id !== null && pw.nodes[id].parent !== null; id = pw.nodes[id].parent) {
      const step = pw.nodes[pw.nodes[id].parent!].fork?.step;
      if (step !== undefined && step <= n) out.add(shown.ids[step]);
    }
    return out;
  }, [showDecisions, pw, shown, n]);
  const tiles: BoardTile[] = [
    ...faint.map((t): BoardTile => ({ ...t, tone: 'faint' })),
    ...solid.map((t): BoardTile => ({ ...t, tone: 'solid', className: decisions.has(t.id) ? 'is-decision' : undefined })),
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
    ...(showDots ? sideMarks(sides, hoverRun, xformOf) : []),
    { xform: xformOf(shown.ids[0]), kind: 'start', r: 0.75 },
  ];
  const heights = shown.levels.slice(0, n);
  const maxHeight = Math.max(1, ...heights);
  const choicesMade = pw.nodes[pw.current] ? (function count(id: number): number { const p = pw.nodes[id].parent; return p === null ? 0 : 1 + count(p); })(pw.current) : 0;

  // hovering a node, or a landing not yet taken, draws its walk beside the pointer (not on a touch screen)
  const peekHandlers = canHover
    ? {
        onHoverNode: (id: number | null) => setPeek(id === null ? null : { id, ...pointer.current }),
        onHoverLanding: (at: { node: number; key: string } | null) => setPeek(at === null ? null : { id: at.node, landing: at.key, ...pointer.current }),
      }
    : {};
  const forkAt = `${pw.current}|${n}|${stage.status}`;
  useEffect(() => {
    if (stage.status !== 'choice') return undefined;
    let cancelled = false;
    const keys = stage.pending.map((o) => o.key);
    let i = 0;
    const next = (): void => {
      if (cancelled || i >= keys.length) return;
      const key = keys[i++];
      const found = circuitsAhead(pw.walker, stageAfter(pw, pw.current, key, 0), AHEAD);
      setAhead((a) => ({ at: forkAt, by: new Map([...(a && a.at === forkAt ? a.by : []), [key, found]]) }));
      setTimeout(next, 0);
    };
    const t = setTimeout(next, 30);
    return () => { cancelled = true; clearTimeout(t); };
  }, [forkAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const aheadHere = ahead && ahead.at === forkAt ? ahead.by : null;
  // the shortest circuit from here: its branches walked shortest first, then its landings taken
  const seek = (): void => {
    setSeeking(true);
    setTimeout(() => {
      const found = circuitsAhead(pw.walker, stage, SEEK, true);
      setSeeking(false);
      if (!found.path) return;
      setHover(null);
      dispatch({ type: 'run', cap: RUN_CAP });
      for (const key of found.path) { dispatch({ type: 'choose', key }); dispatch({ type: 'run', cap: RUN_CAP }); }
    }, 20);
  };
  const exploreBar = (
    <div className="wk__explore">
      <button
        type="button"
        className="td__chip"
        onClick={() => {
          if (exploring) { setExploring(false); return; }
          dispatch({ type: 'explore', limits, budgetMs: 250, restart: true });
          setExploring(true);
        }}
        data-testid="wk-explore"
      >
        {exploring ? 'Stop' : 'Explore every branch'}
      </button>
      <label>stop after <input type="number" min={1} value={limits.forks} onChange={(e) => setLimits((l) => ({ ...l, forks: Math.max(1, Number(e.target.value) || 1) }))} /> forks,</label>
      <label>and a branch after <input type="number" min={1} value={limits.tiles} onChange={(e) => setLimits((l) => ({ ...l, tiles: Math.max(1, Number(e.target.value) || 1) }))} /> tiles</label>
      <span className="td__hint">At every fork, walks each landing in turn, the nearest forks first, until the whole tree of choices is drawn or a limit is reached.</span>
    </div>
  );

  return (
    <>
      <div className="td__controls">
        <button type="button" onClick={() => dispatch({ type: 'step' })} disabled={stage.status !== 'walking'} data-testid="wk-step">Step</button>
        <button type="button" onClick={() => dispatch({ type: 'run', cap: RUN_CAP })} disabled={stage.status !== 'walking'} data-testid="wk-run">Run until a choice</button>
        <button type="button" className="td__chip" aria-pressed={showDots} onClick={() => setShowDots((v) => !v)} data-testid="wk-dots">{showDots ? 'Dots on' : 'Dots off'}</button>
        <button type="button" className="td__chip" aria-pressed={showDecisions} onClick={() => setShowDecisions((v) => !v)} data-testid="wk-decisions">{showDecisions ? 'Choices marked' : 'Mark choices'}</button>
        <span className="wk__views" role="group" aria-label="Whole tree">
          {(['off', 'split', 'full'] as const).map((v) => (
            <button key={v} type="button" className={`td__chip${view === v ? ' is-active' : ''}`} aria-pressed={view === v} onClick={() => setView(v)} data-testid={`wk-view-${v}`}>
              {v === 'off' ? 'Landings' : v === 'split' ? 'Tree beside' : 'Tree full page'}
            </button>
          ))}
        </span>
        <span className="td__hint" data-testid="wk-status">
          {stage.status === 'closed'
            ? `A circuit of ${n} tiles, after ${choicesMade} ${choicesMade === 1 ? 'choice' : 'choices'}. It is the same circuit for all ${stage.worlds.length} ancestor stacks left.`
            : stage.status === 'open'
              ? `After ${n} tiles every stack left stops at a corner of two walls.`
              : stage.status === 'choice'
                ? `Step ${n + 1}: the ${stage.worlds.length} ancestor stacks still possible disagree about where the strand lands. Choose on the right.`
                : stage.status === 'stuck'
                  ? 'This edge carries no strand under the pattern.'
                  : `${n} ${n === 1 ? 'tile' : 'tiles'} walked; ${stage.worlds.length} ancestor ${stage.worlds.length === 1 ? 'stack' : 'stacks'} still possible. Steps they all agree on are taken without asking.`}
        </span>
      </div>
      {stage.status === 'choice' && (
        <div className="wk__ahead" data-testid="wk-ahead">
          <span className="td__hint">Circuits within {AHEAD.choices} more choices:</span>
          {stage.pending.map((o) => {
            const a = aheadHere?.get(o.key);
            return (
              <button
                key={o.key}
                type="button"
                className="td__chip"
                onClick={() => take(pw.current, o.key)}
                onMouseEnter={() => setHover(o)}
                onMouseLeave={() => setHover(null)}
                title={a ? `Taking ${o.key}: ${a.min === null ? 'no circuit' : `the shortest circuit closes ${a.min} tiles on`}${a.max !== null && a.max !== a.min ? `, the longest found ${a.max}` : ''}${a.open ? '; some branches were still open where the search stopped' : ''}.` : 'Looking ahead…'}
                data-testid={`wk-ahead-${o.key.replace(' ', '-')}`}
              >
                <strong>{o.key === 'closes' ? 'closes' : o.key}</strong>{' '}
                {!a ? '…' : a.min === null ? (a.open ? 'none yet' : 'none') : `${a.min}${a.max !== null && a.max !== a.min ? `–${a.max}` : ''}${a.open ? '+' : ''} tiles`}
              </button>
            );
          })}
          <button type="button" className="td__chip" onClick={seek} disabled={seeking} data-testid="wk-seek">
            {seeking ? 'Looking…' : 'Walk to the nearest circuit'}
          </button>
        </div>
      )}

      {closed && onRestart && (
        <div className="wk__restart" data-testid="wk-restart">
          <span className="td__hint">The same circuit, walked again from</span>
          <button type="button" className="td__chip" onClick={() => onRestart(rotateWord(stage.seen, n - 1))} data-testid="wk-restart-prev">◀ the tile before</button>
          <button type="button" className="td__chip" onClick={() => onRestart(rotateWord(stage.seen, 1))} data-testid="wk-restart-next">the next tile ▶</button>
          <button type="button" className="td__chip" onClick={() => onRestart(rotateWord(stage.seen, 0, true))} data-testid="wk-restart-back">this tile, the other way round</button>
        </div>
      )}

      {stage.corners.length > 0 && (
        <ul className="wk__corners" data-testid="wk-corners">
          {stage.corners.map((c) => {
            const landed = c.step < n ? `${stage.seen[c.step].type} ${stage.seen[c.step].entry}` : c.step === n && stage.status !== 'choice' ? `${here.at.leaf} ${here.entry}` : null;
            const elsewhere = c.tiles.filter((t) => (landed ? t.tile !== landed : !stage.pending.some((o) => o.key === t.tile)));
            return (
              <li key={c.step} className={c.unforced ? 'is-odd' : ''}>
                Step {c.step}: {c.stacks.toLocaleString('en-US')} {c.stacks === 1 ? 'stack meets' : 'stacks meet'} a second wall that goes on
                for ever and {c.stacks === 1 ? 'stops' : 'stop'}; across it,{' '}
                {c.tiles.length === 1 && c.tiles[0].stacks === c.stacks
                  ? `${c.tiles[0].tile} in all of them`
                  : c.tiles.map((t) => `${t.tile} in ${t.stacks.toLocaleString('en-US')}`).join(', ') || 'no tile is forced'}
                {elsewhere.length > 0 && ` (${elsewhere.map((t) => t.tile).join(', ')}: not where the other stacks ${landed ? 'land' : 'can land'})`}
                {c.unforced > 0 && `; not forced in ${c.unforced.toLocaleString('en-US')}`}.
              </li>
            );
          })}
        </ul>
      )}

      <div className={`wk__main${view === 'split' ? ' is-whole' : view === 'full' ? ' is-fullpage' : ''}`} ref={mainRef}>
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
        {view === 'split' ? (
          <div className="wk__side wk__side--whole">
            {exploreBar}
            {pw.explored && <p className="td__hint" data-testid="wk-explored">{exploredText}</p>}
            <ChoiceTree pw={pw} mode="full" onGoto={goto} onChooseAt={take} isCollapsed={isCollapsed} onToggle={toggle} {...peekHandlers} />
          </div>
        ) : (
          <div className="wk__side">
            <p className="wk__tape-title">Landings</p>
            <ChoiceTree
              pw={pw}
              mode="path"
              onGoto={goto}
              onChooseAt={take}
              onHoverOption={(key) => setHover(key && stage.status === 'choice' ? stage.pending.find((o) => o.key === key) ?? null : null)}
              {...peekHandlers}
            />
            <p className="wk__tape-title">Ancestor stacks</p>
            <AncestorFlow
              start={pw.walker.start}
              shown={hover ? hover.worlds : pw.nodes[pw.current].before ? pw.nodes[pw.current].stage.worlds : stage.worlds}
              behind={hover ? atFork : pw.nodes[pw.current].before}
            />
          </div>
        )}
      </div>

      {view === 'full' && (
        <div
          className="wk__fulltree"
          data-testid="wk-fulltree"
        >
          {exploreBar}
          {pw.explored && <p className="td__hint" data-testid="wk-explored">{exploredText}</p>}
          <ChoiceTree
            pw={pw}
            mode="full"
            onGoto={(id) => { setPeek(null); goto(id); if (canHover) mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            onChooseAt={(id, key) => { setPeek(null); take(id, key); if (canHover) mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            {...peekHandlers}
            isCollapsed={isCollapsed}
            onToggle={toggle}
          />
        </div>
      )}

      {peek && <CircuitPeek pw={pw} subset={pattern.subset} id={peek.id} landing={peek.landing} x={peek.x} y={peek.y} />}

      <section className="td__section">
        <h3>How high each step reached</h3>
        <p>One bar per step: the level where its crossing settled, in the stack shown.</p>
        <svg className="wk__heights" viewBox={`0 0 ${Math.max(1, heights.length)} ${maxHeight}`} preserveAspectRatio="none" data-testid="wk-heights" data-steps={heights.length}>
          {heights.map((h, i) => <rect key={i} x={i} y={maxHeight - h} width={1} height={h} />)}
        </svg>
      </section>

      {circuits.length > 0 && <CircuitList circuits={circuits} onGoto={goto} />}

      {closed && <SidesView sides={sides} length={n} onHoverRun={setHoverRun} />}

      <details className="wk__debug" onToggle={(e) => setDebugOpen((e.target as HTMLDetailsElement).open)} data-testid="wk-debug">
        <summary>The chain, tile by tile</summary>
        {debugOpen && <ChainTable seen={stage.seen} ids={shown.ids} levels={shown.levels} root={shown.root} level={shown.level} chosen={chosen} />}
      </details>
    </>
  );
}

export default LandingWalk;
