/**
 * The walk on every tiling at once (`possible.ts`): the strand only stops
 * where the possible ancestor stacks disagree about where it lands, and
 * offers those landings. The board shows one of the stacks still possible;
 * hovering a landing shows a stack that lands there. Every choice made stays
 * in the tree of choices, and clicking one goes back to it.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { addressFromId, idOf, matchingIndicesToCombo, mul, transPt, type Affine, type HexType, type TileTypeId } from '../../core';
import { HexBoard, type BoardStep, type BoardTile } from '../../components/HexBoard';
import { HEX_OUTLINE, placeNear, placeWorld, pointOnEdge, strandPathD, supertileEdges, tileCentre, tilePoints, tilesAround, xformInRoot, type PlacedTile } from '../../lib/hexBoard';
import { explorerCircuitHref } from '../shapes/explorerLink';
import { tileColor } from '../../lib/palette';
import { startSearch, type Search } from '../../workers/searchClient';
import { createClosingsClient, type ClosingsClient } from '../../workers/closingsClient';
import type { FirstClosing } from '../buildup/buildup';
import { SearchTreeData, followKeys } from './search';
import { choicesOf, concreteChain, circuitsAhead, followWord, makeWalker, reducePossible, replay, replayChoices, rotateWord, stageAfter, stageAhead, startWalk, type Ahead, type Outcome, type PossibleWalk, type Seen, type Stage, type Walker, type World } from './possible';
import { AncestorFlow } from './AncestorFlow';
import { classLabel } from './landings';
import { CircuitList, FoundList } from './CircuitList';
import { circuitsIn, foundIn, type Circuit } from './circuits';
import { ChoiceTree } from './ChoiceTree';
import { SearchTree, circuitColor } from './SearchTree';
import type { Choice } from './share';
import { SidesView, sideMarks, sidesOf } from './SidesView';
import type { Pattern } from './walk';

export const MAX_LEVEL = 5;
const RUN_CAP = 20000;
const FAINT_CAP = 3000;

/** Where a stack puts the strand's tiles, placed relative to the start tile. */
function sceneOf(pw: PossibleWalk, w: World, steps: number, frame?: Affine) {
  const wk = pw.walker;
  const { at, levels } = replay(wk, w, steps);
  // a stack across a seam is shown closed in the fewest parents that bring its sides together
  const chain = concreteChain(w);
  const level = chain.length;
  const root = level ? chain[level - 1].parent : wk.start;
  const ids = at.map(idOf);
  const world = { root, level, startId: idOf({ leaf: wk.start, path: chain }) };
  const placed = level <= MAX_LEVEL ? placeWorld(world) : placeNear(world, ids);
  return { placed: frame ? framed(placed, frame) : placed, ids, levels, root, level };
}

/** The tiles turned by `frame`, the start tile's placement on the board. The last few are cached. */
const framedCache = new Map<Map<string, PlacedTile>, { frame: Affine; out: Map<string, PlacedTile> }>();
function framed(placed: Map<string, PlacedTile>, frame: Affine): Map<string, PlacedTile> {
  const hit = framedCache.get(placed);
  if (hit && hit.frame === frame) return hit.out;
  const out = new Map<string, PlacedTile>();
  for (const [id, t] of placed) out.set(id, { ...t, xform: mul(frame, t.xform) });
  framedCache.set(placed, { frame, out });
  while (framedCache.size > 4) framedCache.delete(framedCache.keys().next().value!);
  return out;
}

/** Arrows along a peek's strand, and how many pixels long. */
const PEEK_ARROWS = 4;
const ARROW_PX = 10;

/**
 * The walk from a node of the tree, drawn small beside the pointer: its
 * tiles faint in their colours, the strand over them in one strong colour on
 * a light halo, the start tile outlined and a few arrows for the way it
 * goes, to the node's fork or to where its branch ends. Line widths are in
 * pixels, so a strand of thousands of tiles is as easy to follow as a short one.
 */
function CircuitPeek({ pw, subset, frame, id, keys, landing, text, x, y }: { pw: PossibleWalk; subset: readonly number[]; frame?: Affine; id: number; keys?: readonly string[]; landing?: string; text?: string; x: number; y: number }): JSX.Element | null {
  const size = 220;
  const drawn = useMemo(() => {
    // a landing not yet taken is taken here, on the side, without adding it to the tree; a branch of the search is walked again from the start
    const st = keys ? searchStage(pw, keys) : landing ? stageAfter(pw, id, landing, RUN_CAP) : stageAhead(pw, id, RUN_CAP);
    const g = sceneOf(pw, st.worlds[0], st.seen.length, frame);
    const ids = g.ids.slice(0, st.seen.length + 1).filter((t) => g.placed.has(t));
    const tiles = [...new Set(ids)].map((t) => g.placed.get(t)!);
    const pts = ids.map((t) => tileCentre(g.placed.get(t)!.xform));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const box = { x: Math.min(...xs) - 1.2, y: Math.min(...ys) - 1.2, w: Math.max(...xs) - Math.min(...xs) + 2.4, h: Math.max(...ys) - Math.min(...ys) + 2.4 };
    const steps = st.seen.flatMap((s, i) => (g.placed.has(g.ids[i]) ? [{ ...s, xform: g.placed.get(g.ids[i])!.xform, next: g.placed.get(g.ids[i + 1]) }] : []));
    const strand = strandPathD(steps, subset);
    // an arrow where the strand leaves a tile, pointing at the next tile's centre
    const unit = Math.max(box.w, box.h) / size;
    const L = ARROW_PX * unit;
    const count = Math.min(PEEK_ARROWS, Math.floor(steps.length / 4));
    const arrows = Array.from({ length: count }, (_, k) => steps[Math.floor(((k + 0.5) * steps.length) / count)]).flatMap((s) => {
      const out = s && s.next ? pointOnEdge(s.type, subset, s.exit) : null;
      if (!s || !s.next || !out) return [];
      const p = transPt(s.xform, out);
      const a = tileCentre(s.xform), b = tileCentre(s.next.xform);
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
      const tip = { x: p.x + ux * L * 0.55, y: p.y + uy * L * 0.55 };
      const back = { x: p.x - ux * L * 0.45, y: p.y - uy * L * 0.45 };
      return [`${tip.x},${tip.y} ${back.x - uy * L * 0.45},${back.y + ux * L * 0.45} ${back.x + uy * L * 0.45},${back.y - ux * L * 0.45}`];
    });
    return { st, tiles, start: g.placed.get(ids[0]), pts, box, strand, arrows, unit };
  }, [pw, id, keys, landing, subset, frame]);
  const { st, tiles, start, pts, box, strand, arrows, unit } = drawn;
  // thinner where the tiles are drawn small, so a long strand does not cover its own turns
  const tilePx = 1 / unit;
  const strandPx = Math.min(2.4, Math.max(1.2, tilePx * 0.45));
  const haloPx = strandPx + Math.min(3.2, Math.max(1.2, tilePx * 0.5));
  // above and to the right of the pointer, clear of the rows under it; below only where there is no room above
  const left = Math.min(x + 18, window.innerWidth - size - 12);
  const above = y > size + 160;
  return (
    <div className="wk__peek" style={above ? { left, top: y - 18, width: size, transform: 'translateY(-100%)' } : { left, top: y + 18, width: size }} data-testid="wk-peek">
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} width={size} height={size} style={{ ['--wk-strand' as string]: `${strandPx}px`, ['--wk-halo' as string]: `${haloPx}px` }}>
        <g className="wk__peek-tiles">
          {tiles.map((t) => <polygon key={t.id} points={tilePoints(t.xform)} fill={tileColor(t.type)} className="wk__peek-tile" />)}
        </g>
        {start && <polygon points={tilePoints(start.xform)} fill={tileColor(start.type)} className="wk__peek-start-tile" data-testid="wk-peek-start" />}
        <path d={strand} className="wk__peek-halo" />
        <path d={strand} className="wk__peek-strand" data-testid="wk-peek-strand" />
        {arrows.map((a, i) => <polygon key={i} points={a} className="wk__peek-arrow" />)}
        {pts[0] && <circle cx={pts[0].x} cy={pts[0].y} r={3.5 * unit} className="wk__peek-start" />}
      </svg>
      <p className="wk__peek-head">{st.status === 'closed' ? `A circuit of ${st.seen.length} tiles` : st.status === 'choice' ? `${st.seen.length} tiles, to the fork at step ${st.seen.length + 1}` : `${st.seen.length} tiles, still open`}</p>
      {text && <p>{text}</p>}
    </div>
  );
}

/** The stage at the end of a branch of the search, walked again from the start; the last few are kept, per walker. */
const searched = new WeakMap<Walker, Map<string, Stage>>();
function searchStage(pw: PossibleWalk, keys: readonly string[]): Stage {
  const memo = searched.get(pw.walker) ?? searched.set(pw.walker, new Map()).get(pw.walker)!;
  const k = keys.join('|');
  const hit = memo.get(k);
  if (hit) return hit;
  const st = followKeys(pw, keys, RUN_CAP).stage;
  memo.set(k, st);
  if (memo.size > 40) memo.delete(memo.keys().next().value!);
  return st;
}

const CHAIN_ROWS = 5000;
/** The highest level built to find where the circuits found first close. */
const CLOSING_LEVEL = 10;
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
  readonly onRestart?: (word: Seen[], carry: Carry) => void;
  /** Carried over from the walk this one restarts: the board's turn and the display switches. */
  readonly carry?: Carry;
}

/** What a restart keeps: the start tile's placement on the board, so the circuit stays put, and the display switches. */
export interface Carry {
  readonly frame: Affine;
  readonly dots: boolean;
  readonly decisions: boolean;
  readonly view: 'off' | 'split' | 'full';
}

export function LandingWalk({ pattern, byType, start, startEdge, worlds, initial, onState, follow, onRestart, carry }: LandingWalkProps): JSX.Element {
  const [pw, dispatch] = useReducer(reducePossible, null, () => {
    const w = startWalk(makeWalker(pattern, start, startEdge, MAX_LEVEL), worlds);
    // from a link: make its choices again and walk on to where it was
    if (follow) return followWord(w, follow, RUN_CAP);
    return initial ? replayChoices(w, initial.choices, initial.current) : w;
  });
  const [hover, setHover] = useState<Outcome | null>(null);
  const [hoverRun, setHoverRun] = useState<number | null>(null);
  // the whole tree: off, beside the board, or across the page
  const [view, setView] = useState<'off' | 'split' | 'full'>(carry?.view ?? (initial?.whole ? 'split' : 'off'));
  const whole = view !== 'off';
  // a branch of the search gives up after this many tiles
  const [tileLimit, setTileLimit] = useState(1000);
  // keep only the branch that is a circuit's first reading (canon.ts)
  const [oneReading, setOneReading] = useState(true);
  // a search: explore with no limit on forks, until stopped
  const [searching, setSearching] = useState(false);
  // the search: its workers, its tree as their records come in (shown every 200 ms), the branch each walked last, and what is left
  const search = useRef<Search | null>(null);
  const data = useRef<SearchTreeData | null>(null);
  const [searchShown, setSearchShown] = useState<{ version: number; at: readonly string[]; waiting: number; workers: number } | null>(null);
  const latest = useRef<{ at: readonly string[]; waiting: number }>({ at: [], waiting: 0 });
  // a circuit of the list hovered: its branches outlined on the search map
  const [lit, setLit] = useState<string | null>(null);
  const [showDots, setShowDots] = useState(carry?.dots ?? true);
  const [showDecisions, setShowDecisions] = useState(carry?.decisions ?? false);
  const [debugOpen, setDebugOpen] = useState(false);
  // per landing at the current fork, the circuits found a few choices ahead, worked out in the background
  const [ahead, setAhead] = useState<{ at: string; by: ReadonlyMap<string, Ahead> } | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [peek, setPeek] = useState<{ id: number; keys?: readonly string[]; landing?: string; text?: string; x: number; y: number } | null>(null);
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
  // while a search runs, the way down to the node it is walking: unfolded in the trees, and marked
  const isCollapsed = useCallback((id: number): boolean => {
    let depth = 0;
    for (let at = pw.nodes[id].parent; at !== null; at = pw.nodes[at].parent) depth++;
    const fold = depth >= 3 && !onRoute.has(id);
    return flipped.has(id) ? !fold : fold;
  }, [pw, onRoute, flipped]);
  // a landing taken, or a node of the tree, walks on by itself to the next fork or the end
  const goto = (id: number): void => { setHover(null); dispatch({ type: 'goto', id }); dispatch({ type: 'run', cap: RUN_CAP }); };
  const take = (id: number, key: string): void => { setHover(null); dispatch({ type: 'chooseAt', id, key }); dispatch({ type: 'run', cap: RUN_CAP }); };
  useEffect(() => () => search.current?.stop(), []);
  useEffect(() => {
    if (!searching) return undefined;
    const t = setInterval(() => {
      const d = data.current;
      if (!d) return;
      setSearchShown({ version: d.version, ...latest.current, workers: search.current?.workers ?? 1 });
      if (latest.current.waiting === 0 && d.nodes.length > 1) { search.current?.stop(); search.current = null; setSearching(false); }
    }, 200);
    return () => clearInterval(t);
  }, [searching]);
  const startSearching = (): void => {
    search.current?.stop();
    const d = new SearchTreeData();
    data.current = d;
    latest.current = { at: [], waiting: 1 };
    search.current = startSearch(pw.walker, pw.current === 0 ? pw.stage : pw.nodes[0].stage, tileLimit, oneReading, (u) => {
      d.put(u.walked);
      latest.current = { at: u.at, waiting: u.waiting };
    });
    setSearching(true);
  };
  const stopSearching = (): void => {
    search.current?.stop();
    search.current = null;
    setSearching(false);
    if (data.current) setSearchShown({ version: data.current.version, at: [], waiting: latest.current.waiting, workers: 0 });
  };
  const searchVersion = searchShown?.version;
  const found = useMemo(() => (data.current ? foundIn(data.current.nodes) : []), [searchVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  // where each circuit found first closes as the supertiles are built up, asked once per circuit, in a worker
  const combo = useMemo(() => matchingIndicesToCombo('hex', pattern.subset, pattern.matching), [pattern]);
  const closings = useRef<{ client: ClosingsClient; asked: Set<string> } | null>(null);
  const [closingOf, setClosingOf] = useState<ReadonlyMap<string, FirstClosing | null>>(() => new Map());
  useEffect(() => () => { closings.current?.client.dispose(); closings.current = null; }, []);
  useEffect(() => {
    if (!combo) return;
    const c = closings.current ?? (closings.current = { client: createClosingsClient(), asked: new Set() });
    const fresh = found.filter((f) => !c.asked.has(f.key));
    if (!fresh.length) return;
    for (const f of fresh) c.asked.add(f.key);
    c.client.ask(pattern.subset, combo, fresh.map((f) => ({ key: f.key, length: f.tiles })), CLOSING_LEVEL, (got) => setClosingOf((m) => new Map([...m, ...got])));
  }, [found, combo, pattern]);
  // the way down to the branch each worker walked last
  const searchAt = useMemo(() => {
    const r = new Set<number>();
    const d = data.current;
    if (!d || !searching) return r;
    for (const h of searchShown?.at ?? []) for (let id: number | null = d.idOf(h) ?? null; id !== null; id = d.nodes[id].parent) r.add(id);
    return r;
  }, [searchShown, searching]);
  const searchText = useMemo(() => {
    const ns = data.current?.nodes;
    if (!ns || !searchShown) return null;
    const forks = ns.filter((x) => x.fork).length;
    const closed = found.reduce((a, c) => a + c.branches, 0);
    const gaveUp = ns.filter((x) => x.end?.status === 'walking').length;
    const cut = ns.filter((x) => x.end?.status === 'cut').length;
    return `${searching ? `Searching on ${searchShown.workers} ${searchShown.workers === 1 ? 'worker' : 'workers'}: ` : ''}${forks.toLocaleString('en-US')} forks; ${closed} ${closed === 1 ? 'branch closes' : 'branches close'} on ${found.length} ${found.length === 1 ? 'circuit' : 'circuits'}; ${gaveUp.toLocaleString('en-US')} still open after ${tileLimit} tiles; ${cut ? `${cut.toLocaleString('en-US')} cut as not the first reading; ` : ''}${searchShown.waiting.toLocaleString('en-US')} waiting.`;
  }, [searchShown, found, searching, tileLimit]); // eslint-disable-line react-hooks/exhaustive-deps
  const goSearch = (id: number): void => {
    const d = data.current;
    if (!d) return;
    setPeek(null);
    setHover(null);
    dispatch({ type: 'follow', keys: d.keysTo(id), cap: RUN_CAP });
    mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const peekSearch = (id: number | null, text?: string): void => {
    const d = data.current;
    setPeek(id === null || !d ? null : { id: 0, keys: d.keysTo(id), text, ...pointer.current });
  };

  // how each circuit branches from the smaller ones compares every pair of branches, so it waits until the search stops
  const circuits = useMemo<Circuit[]>(() => (!searching && data.current ? circuitsIn(data.current.nodes) : []), [searching, searchVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onState?.(choicesOf(pw), pw.current, whole); }, [pw, whole]); // eslint-disable-line react-hooks/exhaustive-deps
  const { stage } = pw;
  const n = stage.seen.length;
  // every stack at the fork, after its step, whichever landing it takes
  const atFork = useMemo(() => stage.pending.flatMap((o) => o.worlds), [stage]);

  // The board: one stack still possible, or while a landing is hovered, a stack that lands there.
  const shown = useMemo(() => {
    const w = hover ? hover.worlds[0] : stage.worlds[0];
    return sceneOf(pw, w, hover ? n + 1 : n, carry?.frame);
  }, [pw, hover, stage, n, carry]);
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
  // the supertile the board is drawn in, in the Explorer's infinite view, tracing the strand from the start tile
  const explorerHref = useMemo(() => {
    const chain = concreteChain(here);
    const first = stage.seen[0];
    if (!chain.length || !first) return null;
    const root = chain[chain.length - 1].parent;
    const top = [...chain].reverse();
    const at = xformInRoot({ root, level: chain.length, startId: '' }, idOf({ leaf: pw.walker.start, path: chain }));
    const a = pointOnEdge(first.type, pattern.subset, first.entry), b = pointOnEdge(first.type, pattern.subset, first.exit);
    if (!a || !b) return null;
    return explorerCircuitHref(import.meta.env.BASE_URL, {
      family: 'hex',
      subset: pattern.subset,
      combo: matchingIndicesToCombo('hex', pattern.subset, pattern.matching) ?? '',
      type: root as TileTypeId,
      level: chain.length,
      path: top.map((l, i) => ({ type: (i + 1 < top.length ? top[i + 1].parent : pw.walker.start) as TileTypeId, pos: l.slot })),
      chord: [transPt(at, a), transPt(at, b)],
    });
  }, [here, stage.seen, pw.walker.start, pattern]);
  const current = shown.placed.get(shown.ids[n]) ?? solid[solid.length - 1];

  const closed = stage.status === 'closed';
  // the circuit from its k-th tile: that tile becomes the start, placed where it is drawn now, so the board does not turn
  const restart = (k: number, back = false): void => onRestart?.(rotateWord(stage.seen, k, back), { frame: xformOf(shown.ids[k % n]), dots: showDots, decisions: showDecisions, view });
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
        onHoverNode: (id: number | null, text?: string) => setPeek(id === null ? null : { id, text, ...pointer.current }),
        onHoverLanding: (at: { node: number; key: string } | null, text?: string) => setPeek(at === null ? null : { id: at.node, landing: at.key, text, ...pointer.current }),
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

  return (
    <>
      <div className="td__controls">
        <button type="button" onClick={() => dispatch({ type: 'step' })} disabled={stage.status !== 'walking'} data-testid="wk-step">Step</button>
        <button type="button" onClick={() => dispatch({ type: 'run', cap: RUN_CAP })} disabled={stage.status !== 'walking'} data-testid="wk-run">Run until a choice</button>
        <button type="button" className="td__chip" aria-pressed={showDots} onClick={() => setShowDots((v) => !v)} data-testid="wk-dots">{showDots ? 'Dots on' : 'Dots off'}</button>
        <button type="button" className="td__chip" aria-pressed={showDecisions} onClick={() => setShowDecisions((v) => !v)} data-testid="wk-decisions">{showDecisions ? 'Choices marked' : 'Mark choices'}</button>
        {explorerHref && <a className="td__chip" href={explorerHref} target="_blank" rel="noreferrer" data-testid="wk-open-explorer">Open in the Explorer</a>}
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
          <button type="button" className="td__chip" onClick={() => restart(n - 1)} data-testid="wk-restart-prev">◀ the tile before</button>
          <button type="button" className="td__chip" onClick={() => restart(1)} data-testid="wk-restart-next">the next tile ▶</button>
          <button type="button" className="td__chip" onClick={() => restart(0, true)} data-testid="wk-restart-back">this tile, the other way round</button>
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

      {peek && <CircuitPeek pw={pw} subset={pattern.subset} frame={carry?.frame} id={peek.id} keys={peek.keys} landing={peek.landing} text={peek.text} x={peek.x} y={peek.y} />}

      <section className="td__section" data-testid="wk-search">
        <h3>Circuits found</h3>
        <div className="wk__explore">
          <button type="button" className="td__chip" onClick={searching ? stopSearching : startSearching} data-testid="wk-search-go">
            {searching ? 'Stop' : 'Search breadth first'}
          </button>
          <label>a branch gives up after <input type="number" min={1} value={tileLimit} onChange={(e) => setTileLimit(Math.max(1, Number(e.target.value) || 1))} /> tiles</label>
          <label title="A circuit through the start tile at several places is read from each, either way round; keep only the reading that comes first, comparing tile by tile with the start's type and edge first.">
            <input type="checkbox" checked={oneReading} onChange={(e) => setOneReading(e.target.checked)} data-testid="wk-one-reading" /> one branch per circuit
          </label>
          <span className="td__hint" data-testid="wk-search-status">
            {searchText ?? 'Takes every landing at every fork, the nearest forks first, on every core but one, until stopped, and lists each circuit the first time a branch closes on it.'}
          </span>
        </div>
        {data.current && data.current.nodes.length > 1 && (
          <SearchTree
            nodes={data.current.nodes}
            version={searchVersion ?? 0}
            start={pw.walker.start}
            found={found}
            highlight={lit}
            route={searchAt}
            onHoverNode={canHover ? (id, key) => { setLit(key ?? null); peekSearch(id); } : undefined}
            onGoto={goSearch}
          />
        )}
        {found.length > 0 && (
          <FoundList
            found={found}
            closings={combo ? { of: closingOf, upTo: CLOSING_LEVEL } : undefined}
            colour={circuitColor}
            onGoto={goSearch}
            onHover={canHover ? (f) => { setLit(f?.key ?? null); peekSearch(f ? f.node : null, f ? `${f.choices} ${f.choices === 1 ? 'choice' : 'choices'} from the start${f.branches > 1 ? `; ${f.branches} branches close on it` : ''}` : undefined); } : undefined}
          />
        )}
      </section>

      <section className="td__section">
        <h3>How high each step reached</h3>
        <p>One bar per step: the level where its crossing settled, in the stack shown.</p>
        <svg className="wk__heights" viewBox={`0 0 ${Math.max(1, heights.length)} ${maxHeight}`} preserveAspectRatio="none" data-testid="wk-heights" data-steps={heights.length}>
          {heights.map((h, i) => <rect key={i} x={i} y={maxHeight - h} width={1} height={h} />)}
        </svg>
      </section>

      {circuits.length > 0 && <CircuitList circuits={circuits} onGoto={goSearch} />}

      {closed && <SidesView sides={sides} length={n} onHoverRun={setHoverRun} />}

      <details className="wk__debug" onToggle={(e) => setDebugOpen((e.target as HTMLDetailsElement).open)} data-testid="wk-debug">
        <summary>The chain, tile by tile</summary>
        {debugOpen && <ChainTable seen={stage.seen} ids={shown.ids} levels={shown.levels} root={shown.root} level={shown.level} chosen={chosen} />}
      </details>
    </>
  );
}

export default LandingWalk;
