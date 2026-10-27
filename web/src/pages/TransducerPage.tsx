/**
 * `TransducerPage` — one hexagon in the middle, and the world built around it
 * by crossing edges. A crossing is a lookup in the substitution rules carried
 * up and down the tile's slot path; the nine rules sit under the picture and
 * the lookup's steps are marked on them. When the slot path runs out, a
 * parent is chosen and the world grows. A rule and combination turn the same
 * crossings into a strand.
 *
 * The construction is Simon Tatham's (combinatorial coordinates and the
 * neighbour transducer). Everything is computed from `core/transducer.ts`
 * and the substitution tables; the picture is drawn so the answers can be
 * checked against it, never read.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import {
  HEX_TYPES, addressFromId, addressOfSymbols, buildSystem, childType, chordPairing, comboToMatchingIndices,
  flatten, formatAddress, hexTransducer, idOf, inv, leafOrder, leafPts, mul, parseSym, runPeriodic,
  runTransducer, slotsOfType, sym, transPt, validEdgeSubsets,
  type Address, type Affine, type DfaItem, type HexType, type Sym, type TileTypeId, type TraceStep, type Transducer,
} from '../core';
import { tileColor } from '../lib/palette';
import { ExpansionMap, type MapMark } from './transducer/ExpansionMap';
import { nearest, orientationPath, supertileEdges, type BoundaryEdge } from './transducer/board';
import { HierarchyBuilder } from './transducer/HierarchyBuilder';
import { MAX_LEVEL, initialBoard, parentOptions, prefixId, reduce, type World } from './transducer/world';
import '../styles/transducer.css';

const FAMILY = 'hex' as const;
/** Most tiles drawn faintly for a consulted supertile or a previewed parent. */
const FAINT_CAP = 1500;
/** Faint tiles nearest the action that also get an orientation flag. */
const FLAG_CAP = 300;

interface Placed { readonly id: string; readonly type: HexType; readonly xform: Affine }

/** Every tile of the root, placed relative to the start tile (which sits at the origin). */
function place(world: World): Map<string, Placed> {
  const insts = flatten(buildSystem(FAMILY, world.level)[world.root]);
  const start = insts.find((i) => i.id === world.startId);
  if (!start) throw new Error(`start tile ${world.startId} is not in the root`);
  const toStart = inv(start.xform);
  const out = new Map<string, Placed>();
  for (const i of insts) out.set(i.id, { id: i.id, type: i.type as HexType, xform: mul(toStart, i.xform) });
  return out;
}

/** The last few placed worlds, so that choosing the parent being previewed reuses the preview's layout. */
const placeCache = new Map<string, Map<string, Placed>>();
function placeCached(world: World): Map<string, Placed> {
  const key = `${world.root}|${world.level}|${world.startId}`;
  let hit = placeCache.get(key);
  if (hit) { placeCache.delete(key); placeCache.set(key, hit); return hit; }
  hit = place(world);
  placeCache.set(key, hit);
  while (placeCache.size > 4) placeCache.delete(placeCache.keys().next().value!);
  return hit;
}

/** Placed tiles with their slot paths, for the few that are drawn or looked up. */
const withAddress = (world: World, tiles: readonly Placed[]): (Placed & { address: Address })[] =>
  tiles.map((t) => ({ ...t, address: addressFromId(world.root, t.id) }));


/** Marks for the rules under the picture, one numbered step per lookup. */
function marksOf(trace: readonly TraceStep[]): { byType: Map<HexType, MapMark[]>; steps: { n: number; rule: HexType | null; text: string }[] } {
  const byType = new Map<HexType, MapMark[]>();
  const steps: { n: number; rule: HexType | null; text: string }[] = [];
  const add = (T: HexType, m: MapMark): void => { (byType.get(T) ?? byType.set(T, []).get(T)!).push(m); };
  let n = 0;
  for (const s of trace) {
    n++;
    const label = String(n);
    switch (s.kind) {
      case 'up':
        add(s.parent, { child: { s: s.slot, e: s.edge }, parentEdge: s.parentEdge, piece: { j: s.parentEdge, i: s.i }, label });
        steps.push({ n, rule: s.parent, text: `${s.level === 0 ? 'The tile' : `The level-${s.level} ${s.type}`} is slot ${s.slot} of a ${s.parent}. In the ${s.parent} rule, edge ${s.edge} of slot ${s.slot} is on the outside: piece ${s.i + 1} of ${s.n} of the ${s.parent}'s edge ${s.parentEdge}. Ask about the ${s.parent}, one level up.` });
        break;
      case 'inside':
        add(s.parent, { child: s.from, partner: s.to, label });
        steps.push({ n, rule: s.parent, text: `In the ${s.parent} rule, edge ${s.from.e} of slot ${s.from.s} meets edge ${s.to.e} of slot ${s.to.s}. The neighbour at level ${s.level - 1} is slot ${s.to.s}, a ${childType(s.parent, s.to.s)}, entered through its edge ${s.to.e}.` });
        break;
      case 'down':
        add(s.type, { parentEdge: s.edge, piece: { j: s.edge, i: s.i }, entered: s.child, label });
        steps.push({ n, rule: s.type, text: `Into the ${s.type} through its edge ${s.edge}, piece ${s.i + 1} of ${s.n} counted from this side: edge ${s.child.e} of slot ${s.child.s}, a ${s.childType}.` });
        break;
      case 'top':
        steps.push({ n, rule: null, text: `Edge ${s.edge} of the level-${s.level} ${s.type} is on the outside, and the ${s.type} is the root: there is no slot above it to look in.` });
        break;
    }
  }
  return { byType, steps };
}

function describeItem(it: DfaItem, emittedSoFar: number): string {
  const owed = it.pending.length ? ` Output decided but not yet written: ${it.pending.map((s, i) => symText(s, emittedSoFar === 0 && i === 0)).join(', ')}.` : '';
  if (it.nfa === 'start') return 'Nothing read yet.';
  if (it.nfa.startsWith('acc ')) return `The two slot paths agree from here up (inside a ${it.nfa.slice(4)}).${owed}`;
  const [l, r] = it.nfa.split('|');
  const [T, j] = l.split('.');
  const [U, jj] = r.split('.');
  return `Leaving edge ${j} of a ${T}; on the other side, edge ${jj} of a ${U}.${owed}`;
}

function symText(s: Sym, first: boolean): string {
  const { type, n } = parseSym(s);
  return first ? `${type}, edge ${n}` : `slot ${n} of ${type}`;
}

export function TransducerPage(): JSX.Element {
  const [startType, setStartType] = useState<HexType>('Pi');
  const [board, dispatch] = useReducer(reduce, 'Pi' as HexType, initialBoard);
  const { world, revealed, selected, entry, lookup, pending, trail, previewIdx } = board;

  const placed = useMemo(() => placeCached(world), [world]);
  const selAddress = useMemo(() => addressFromId(world.root, selected), [world.root, selected]);
  const options = useMemo(() => parentOptions(board), [board.world, board.pending]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = placed.get(selected) ?? placed.get(world.startId)!;
  const base = leafPts(FAMILY, 'Delta');
  const ptsOf = (p: Placed): { x: number; y: number }[] => base.map((q) => transPt(p.xform, q));

  const reset = useCallback((type: HexType) => {
    setStartType(type);
    dispatch({ type: 'reset', start: type });
  }, []);
  const cross = useCallback((edge: number) => dispatch({ type: 'cross', edge }), []);
  const growWorld = useCallback((parent: HexType, slot: number) => dispatch({ type: 'grow', parent, slot }), []);

  // --- a rule and a combination --------------------------------------------
  const rules = useMemo(() => validEdgeSubsets(FAMILY).filter((r) => r.edges.length > 0), []);
  const [ruleIdx, setRuleIdx] = useState(() => Math.max(0, rules.findIndex((r) => r.edges.join('') === '023468')));
  const subset = rules[ruleIdx]?.edges ?? [];
  const [combo, setCombo] = useState('111000100');
  const matching = useMemo(() => {
    const idx = comboToMatchingIndices(FAMILY, subset, combo);
    const m: Record<string, number> = {};
    leafOrder(FAMILY).forEach((t, i) => (m[t] = idx[i]));
    return m;
  }, [subset, combo]);
  const seams = useMemo(() => slotsOfType(FAMILY, sel.type as TileTypeId, subset), [sel, subset]);
  const pairing = useMemo(() => chordPairing(FAMILY, sel.type as TileTypeId, subset, matching[sel.type] ?? 0), [sel, subset, matching]);
  const entrySeam = entry === null ? -1 : seams.findIndex((s) => s.edge === entry);
  const strandExit = entrySeam >= 0 && pairing[entrySeam] >= 0 ? seams[pairing[entrySeam]].edge : null;
  const strandStep = useCallback(() => { if (strandExit !== null) cross(strandExit); }, [strandExit, cross]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      // Text fields keep every key. A dropdown or a button keeps the keys it acts on itself
      // (arrows change a dropdown; Enter and Space press a button); edge numbers always cross.
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const isDigit = ev.key >= '0' && ev.key <= '5' && ev.key.length === 1;
      if (tag === 'SELECT' && !isDigit) return;
      if (tag === 'BUTTON' && (ev.key === 'Enter' || ev.key === ' ')) return;
      if (isDigit) { ev.preventDefault(); cross(Number(ev.key)); }
      else if (pending && (ev.key === 'ArrowRight' || ev.key === 'ArrowDown')) { ev.preventDefault(); dispatch({ type: 'previewStep', delta: 1 }); }
      else if (pending && (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp')) { ev.preventDefault(); dispatch({ type: 'previewStep', delta: -1 }); }
      else if (ev.key === 'Enter') {
        if (pending && options[previewIdx]) growWorld(options[previewIdx].parent, options[previewIdx].slot);
        else strandStep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cross, strandStep, pending, options, previewIdx, growWorld]);

  // --- what the picture shows ----------------------------------------------
  const marks = useMemo(() => marksOf(lookup?.result.trace ?? []), [lookup]);
  /** The supertiles the last lookup consulted: the ancestor at the crossing level and its neighbour, drawn as ghosts. */
  const ghosts = useMemo(() => {
    const out = new Set<string>();
    // while a crossing waits for a parent, the preview draws the root and more
    if (!lookup || pending) return out;
    const k = lookup.result.ok ? lookup.result.level : lookup.result.level;
    const prefix = (id: string, levelsUp: number): string => id.split('.').filter(Boolean).slice(0, Math.max(0, id.split('.').filter(Boolean).length - levelsUp)).join('.');
    const roots = [prefix(lookup.from, k)];
    if (lookup.result.ok) roots.push(prefix(idOf(lookup.result.address), k));
    const inside: Placed[] = [];
    for (const p of placed.values()) if (roots.some((r) => r === '' || p.id === r || p.id.startsWith(r + '.'))) inside.push(p);
    const focus = transPt(placed.get(lookup.from)?.xform ?? placed.get(world.startId)!.xform, { x: 0.5, y: 0.866 });
    for (const p of nearest(inside, focus, FAINT_CAP)) out.add(p.id);
    return out;
  }, [lookup, placed, world.startId, pending]);

  /** The world as it would be with the previewed parent, and where the waiting crossing would land in it. */
  const preview = useMemo(() => {
    const o = pending ? options[previewIdx] : undefined;
    if (!pending || !o || world.level >= MAX_LEVEL) return null;
    const pw: World = { root: o.parent, level: world.level + 1, startId: prefixId(o.slot, world.startId) };
    const pplaced = placeCached(pw);
    const from = pplaced.get(prefixId(o.slot, pending.from));
    const shown = new Set([...revealed].map((id) => prefixId(o.slot, id)));
    const candidates = [...pplaced.values()].filter((p) => !shown.has(p.id));
    const tiles = nearest(candidates, transPt(from?.xform ?? pplaced.get(pw.startId)!.xform, { x: 0.5, y: 0.866 }), FAINT_CAP);
    const landing = o.landing;
    if (landing && !tiles.some((t) => t.id === landing) && pplaced.get(landing)) tiles.push(pplaced.get(landing)!);
    return { option: o, world: pw, tiles, landing, edges: supertileEdges(withAddress(pw, tiles), leafPts(FAMILY, 'Delta'), pw.level) };
  }, [pending, options, previewIdx, world, revealed]);
  const drawn = useMemo(() => {
    const ids = new Set<string>([...revealed, ...ghosts]);
    const list = [...ids].map((id) => placed.get(id)).filter((p): p is Placed => !!p);
    let minX = -2, minY = -2, maxX = 2, maxY = 2;
    for (const p of [...list, ...(preview?.tiles ?? [])]) for (const q of ptsOf(p)) { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }
    const pad = 1;
    const edges: BoundaryEdge[] = supertileEdges(withAddress(world, list), base, world.level);
    // every revealed tile is flagged; of the faint ones, the nearest to the selected tile
    const focus = transPt(placed.get(selected)?.xform ?? placed.get(world.startId)!.xform, { x: 0.5, y: 0.866 });
    const faint = list.filter((p) => !revealed.has(p.id));
    const flagged = [...list.filter((p) => revealed.has(p.id)), ...nearest(faint, focus, FLAG_CAP)];
    return { list, edges, flagged, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, ghosts, placed, preview, world.level, world.startId, selected]);
  const edgeWidth = (level: number): number => [0, 0.05, 0.09, 0.13, 0.16, 0.19, 0.22][Math.min(level, 6)];
  const neighbourId = lookup?.result.ok ? idOf(lookup.result.address) : null;

  // --- the machine ---------------------------------------------------------
  const tr = useMemo(() => hexTransducer(), []);
  const run = useMemo(() => (lookup ? runTransducer(tr, addressFromId(world.root, lookup.from), lookup.edge) : null), [tr, lookup, world.root]);
  const finalState = run && run.steps.length ? run.steps[run.steps.length - 1].to : tr.start;
  const maxPending = useMemo(() => Math.max(...tr.states.flatMap((s) => s.items.map((i) => i.pending.length))), [tr]);
  const [wallPrefix, setWallPrefix] = useState('Psi:1');
  const [wallPeriod, setWallPeriod] = useState('Psi:0');
  const wall = useMemo(() => {
    const parse = (s: string): Sym[] | null => {
      const out: Sym[] = [];
      for (const tok of s.split(/[\s,]+/).filter(Boolean)) {
        const m = /^([A-Za-z]+):(\d)$/.exec(tok);
        if (!m) return null;
        const type = HEX_TYPES.find((t) => t.toLowerCase() === m[1].toLowerCase());
        if (!type) return null;
        out.push(sym(type, Number(m[2])));
      }
      return out.length ? out : null;
    };
    const p = parse(wallPrefix), q = parse(wallPeriod);
    if (!p || !q) return { error: 'Symbols are type:number. The first is the tile and the edge to cross (Psi:1); the rest are the parent type and the slot (Psi:0 = slot 0 of a Psi).' } as const;
    const r = runPeriodic(tr, p, q);
    if (!r) return { error: 'Not a legal slot path: each parent must have the type below it in that slot.' } as const;
    return { prefix: r.prefix, period: r.period, steps: r.steps.length } as const;
  }, [tr, wallPrefix, wallPeriod]);

  const selPts = ptsOf(sel);
  const edgeMid = (pts: { x: number; y: number }[], e: number): { x: number; y: number } => ({ x: (pts[e].x + pts[(e + 1) % 6].x) / 2, y: (pts[e].y + pts[(e + 1) % 6].y) / 2 });
  const centre = (p: Placed): { x: number; y: number } => transPt(p.xform, { x: 0.5, y: 0.866 });
  const trailLine = [...trail, sel.id].map((id) => placed.get(id)).filter((p): p is Placed => !!p).map((p) => { const c = centre(p); return `${c.x},${c.y}`; }).join(' ');

  return (
    <article className="td">
      <header className="td__intro">
        <p className="td__kicker">Slot paths</p>
        <h1>The neighbour machine</h1>
        <p className="td__lede">
          One hexagon. Press an edge number and the tile across that edge appears, found from the slot path alone by
          looking in the substitution rules below. When the path runs out, choose a parent and the world grows.
        </p>
        <p>
          The construction is Simon Tatham's (<a href="https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-spectre/">combinatorial coordinates</a>,{' '}
          <a href="https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-transducers/">finite-state transducers</a>), built here for the nine hexagon tile types.
          The picture is drawn from the slot paths so the answers can be checked; the machine never reads it.
        </p>
      </header>

      <section className="td__board">
        <div className="td__controls">
          <label>Start with a
            <select value={startType} onChange={(e) => { reset(e.target.value as HexType); e.currentTarget.blur(); }} data-testid="td-start">
              {HEX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => reset(startType)} data-testid="td-reset">Start again</button>
          <span className="td__hint">Keys 0 to 5 cross an edge of the selected tile; click a drawn tile to select it. Enter follows the strand (section 3).</span>
        </div>
        <div className="td__explore">
          <svg className="td__svg td__svg--world" viewBox={drawn.viewBox} data-testid="td-svg" data-drawn={drawn.list.length} data-revealed={revealed.size} data-preview={preview?.tiles.length ?? 0} data-boundaries={drawn.edges.length}>
            {preview && preview.tiles.map((p, i) => (
              <g key={`pv-${p.id}`} className={`td__preview${p.id === preview.landing ? ' is-landing' : ''}`} data-preview-id={p.id}>
                <polygon points={ptsOf(p).map((q) => `${q.x},${q.y}`).join(' ')} fill={tileColor(p.type)} />
                {(i < FLAG_CAP || p.id === preview.landing) && <path d={orientationPath(p.xform)} className="td__flag" />}
              </g>
            ))}
            {preview && preview.edges.map((b) => (
              <line key={`pb-${b.key}`} className="td__boundary is-preview" data-level={Math.min(b.level, 3)} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} strokeWidth={edgeWidth(b.level)} />
            ))}
            {drawn.list.map((p) => {
              const pts = ptsOf(p);
              const isSel = p.id === sel.id;
              const isNb = p.id === neighbourId;
              const isGhost = !revealed.has(p.id);
              return (
                <polygon
                  key={p.id}
                  data-id={p.id}
                  className={`td__tile${isGhost ? ' is-ghost' : ' is-revealed'}${isSel ? ' is-selected' : ''}${isNb ? ' is-neighbour' : ''}`}
                  points={pts.map((q) => `${q.x},${q.y}`).join(' ')}
                  fill={tileColor(p.type)}
                  onClick={() => { if (!isGhost) dispatch({ type: 'select', id: p.id }); }}
                >
                  <title>{p.id || '(root)'}</title>
                </polygon>
              );
            })}
            {drawn.flagged.map((p) => <path key={`f-${p.id}`} d={orientationPath(p.xform)} className={`td__flag${revealed.has(p.id) ? '' : ' is-ghost'}`} />)}
            {drawn.edges.map((b) => (
              <line key={`b-${b.key}`} className="td__boundary" data-level={Math.min(b.level, 3)} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} strokeWidth={edgeWidth(b.level)} />
            ))}
            {trail.length > 0 && <polyline className="td__trail" points={trailLine} />}
            {selPts.map((p, e) => {
              const q = selPts[(e + 1) % 6];
              const m = edgeMid(selPts, e);
              return (
                <g key={e} className={`td__edge${lookup && lookup.from === sel.id && lookup.edge === e ? ' is-active' : ''}${entry === e ? ' is-entry' : ''}`} onClick={() => cross(e)}>
                  <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
                  <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle">{e}</text>
                </g>
              );
            })}
          </svg>
          <div className="td__side">
            <p>
              Selected: <strong data-testid="td-id">{sel.id || '(the root itself)'}</strong><br />
              <span data-testid="td-address">{formatAddress(selAddress)}</span>
            </p>
            <p className="td__hint" data-testid="td-world">
              World: a level-{world.level} {world.root}, {placed.size} tiles, {revealed.size} revealed.
              {world.level > 0 && <> Dark lines are supertile boundaries, thicker for higher levels; the flag in each tile points at its edge 0, with the barb on the edge-1 side.</>}
            </p>
            {pending && (
              <div className="td__pending" data-testid="td-pending">
                <p>
                  Edge {pending.edge} of {pending.from || 'this tile'} leaves the root. Give the level-{world.level} {world.root} a parent:
                </p>
                <div className="td__chips">
                  {options.map((o, i) => (
                    <button
                      key={`${o.parent}-${o.slot}`}
                      type="button"
                      className={`td__chip${i === previewIdx ? ' is-active' : ''}`}
                      onClick={(e) => { growWorld(o.parent, o.slot); e.currentTarget.blur(); }}
                      onMouseEnter={() => dispatch({ type: 'preview', idx: i })}
                      onFocus={() => dispatch({ type: 'preview', idx: i })}
                      disabled={world.level >= MAX_LEVEL}
                      data-testid={`td-parent-${o.parent}-${o.slot}`}
                    >
                      slot {o.slot} of a {o.parent}
                      <span className="td__chip-note">{o.landing ? ' lands' : o.needs ? ` +${o.needs - 1} more` : ' never'}</span>
                    </button>
                  ))}
                </div>
                {preview && (
                  <p className="td__hint" data-testid="td-preview">
                    Shown faintly: slot {preview.option.slot} of a {preview.option.parent} ({previewIdx + 1} of {options.length}).{' '}
                    {preview.landing
                      ? <>The crossing would land on {preview.landing}, a {preview.option.landingType}, outlined.</>
                      : preview.option.needs
                        ? <>The crossing would still leave the root; the quickest chain from here needs {preview.option.needs - 1} more {preview.option.needs - 1 === 1 ? 'parent' : 'parents'}.</>
                        : <>No chain of parents within level {MAX_LEVEL} lands this crossing from here.</>}
                    {preview.option.repeats && <> This parent puts the {world.root} inside another {world.root}; choosing it every time keeps the edge on the outside at every level, the corner of an infinitely large supertile.</>}
                    {' '}Arrow keys cycle, Enter or a click chooses.
                  </p>
                )}
                {world.level >= MAX_LEVEL && <p className="td__hint">The world is capped at level {MAX_LEVEL} on this page.</p>}
              </div>
            )}
            {lookup && (
              <div data-testid="td-lookup">
                <p><strong>Crossing edge {lookup.edge} of {lookup.from || 'the root'}</strong></p>
                <ol className="td__steps">
                  {marks.steps.map((s) => <li key={s.n}>{s.text}</li>)}
                </ol>
                <p data-testid="td-result">
                  {lookup.result.ok
                    ? <>Across it: <strong>{idOf(lookup.result.address)}</strong>, a {lookup.result.address.leaf}, entered through its edge {lookup.result.edge}. Settled at level {lookup.result.level}; the two level-{lookup.result.level} supertiles involved are drawn faintly.</>
                    : <>No answer yet: the slot path has no level {lookup.result.level + 1}.</>}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="rules" className="td__section">
        <h2>1. The rules, with the lookup marked</h2>
        <p>
          Each type's substitution rule: which type goes in which slot, how the children's edges meet, and along the
          outside, the supertile's own six edges as runs of child edges. A crossing is a chain of lookups in these
          nine pictures and nothing else. The numbered badges are the steps of the last crossing, in order; a yellow
          edge is the one asked about, blue the sibling edge it meets, green the edge entered on the way back down,
          and a thick piece of an outer run is where the question left or re-entered a supertile.
        </p>
        <div className="td__gallery td__gallery--rules" data-testid="td-rules">
          {HEX_TYPES.map((P) => <ExpansionMap key={P} parent={P} marks={marks.byType.get(P) ?? []} used={marks.byType.has(P)} size={300} title={`${P}`} />)}
        </div>
        <p>
          Every edge of every supertile has a class, and an edge of class +c meets only an edge of class −c. Two
          matching edges are made of the same number of child edges, so piece i of n on one side is piece n−1−i of n
          on the other. That reversal is the only arithmetic.
        </p>
      </section>

      <section id="transducer" className="td__section">
        <h2>2. The machine</h2>
        <p>
          The lookups above climb and come back down. On the way up they keep, for every level, which piece of which
          edge was left by, because the way down needs it. That memory is a stack, as tall as the climb.
        </p>
        <p>
          The way down uses one fact per level: the edge left by and the edge entered on the other side. Because +c
          meets only −c, there are few (type, edge) pairs that can face a given edge, so that fact can be guessed
          before the climb. The machine reads the slot path upward once, carrying every guess still consistent with
          the rules it has opened. When one guess is left at a level, that level's answer is written out at once. Its
          state is the set of surviving guesses, and its lookup table has one row per such set.
        </p>
        <p data-testid="td-machine-facts">
          For the hexagons the table has <strong>{tr.states.length} rows</strong>, and no row holds back more than {maxPending} symbols of answer.
        </p>
        {run ? (
          <>
            <h3>The last crossing, as the machine runs it</h3>
            <RunGraph tr={tr} steps={run.steps} current={finalState} start={tr.start} />
            <div className="td__state" data-testid="td-state">
              <strong>State {finalState}{tr.states[finalState].accepting ? ', done: the neighbour is fully known' : ''}</strong>, {tr.states[finalState].items.length} {tr.states[finalState].items.length === 1 ? 'guess' : 'guesses'} open:
              <ul>
                {tr.states[finalState].items.map((it, i) => <li key={i}>{describeItem(it, run.output.length)}</li>)}
              </ul>
            </div>
            <p data-testid="td-run-result">
              {run.stuck ? 'The machine jammed. That does not happen on a legal slot path.' : run.accepted
                ? <>Written: <strong>{idOf(addressOfSymbols(run.output).address)}</strong>, entered through edge {addressOfSymbols(run.output).edge}. The same answer as the lookups, from {run.steps.length} links read, with no stack.</>
                : <>The whole slot path is read and the machine is not done: it is waiting for the root's parent, like the lookups.</>}
            </p>
          </>
        ) : <p className="td__hint">Cross an edge above and the machine's run for it appears here.</p>}
        <h3>A wall of infinite height</h3>
        <p>
          A slot path that repeats for ever, a Psi in slot 0 of a Psi in slot 0 of a Psi and so on, is the corner of
          an infinitely large supertile. The lookups never end on it. The machine reaches a state it has been in
          before at the same point of the repeat, and from there its output repeats too.
        </p>
        <div className="td__wall">
          <label>starts with <input value={wallPrefix} onChange={(e) => setWallPrefix(e.target.value)} data-testid="td-wall-prefix" size={16} /></label>
          <label>then repeats <input value={wallPeriod} onChange={(e) => setWallPeriod(e.target.value)} data-testid="td-wall-period" size={16} /></label>
          <span className="td__hint">type:number. The first symbol is the tile and the edge to cross; the rest are the parent type and the slot.</span>
        </div>
        <p data-testid="td-wall-result">
          {'error' in wall ? wall.error : (
            <>Neighbour: <strong className="td__mono">{wall.prefix.map((s, i) => symText(s, i === 0)).join('; ') || '(nothing)'}</strong>, then{' '}
              <strong className="td__mono">{wall.period.map((s) => symText(s, false)).join('; ')}</strong> repeating. Found after {wall.steps} symbols.</>
          )}
        </p>
      </section>

      <section id="hierarchy" className="td__section">
        <h2>3. Building the hierarchy</h2>
        <p>
          Pick a tile and an edge. While the edge is on the outside of everything placed so far, what is across it is
          not known; a parent puts all of it inside a bigger supertile. Hover over a parent to see it on the board and
          click to keep it. Each level has its own colour, for the tiles that joined at that level and for that
          supertile's outline. When the crossing lands, the tile across the edge appears in its own colour, its side
          is grey up to the supertile both sides share, its supertiles are dashed, and the dark line is where the two
          sides touch.
        </p>
        <p>
          Edge 0 of a Gamma is the wall: choose the Gamma again and again and the edge stays outside each time. Every
          chain tried stays in the tree of choices; click a node there to go back to it and try another branch. With
          the board focused, the arrow keys move through the parents, Enter keeps one, Backspace goes back a level and
          0 to 5 pick the edge.
        </p>
        <HierarchyBuilder />
      </section>

      <section id="pattern" className="td__section">
        <h2>4. A rule and a combination</h2>
        <p>
          A rule picks the classes that carry a crossing; a combination picks, in each tile, which crossing each one
          is joined to. A strand is: enter a tile at a crossing, go to its partner, cross that edge, repeat. Enter
          takes one such step from the selected tile, using the edge it was entered through; the crossing shows up
          in the rules and the machine above like any other.
        </p>
        <div className="td__controls">
          <label>Rule
            <select value={ruleIdx} onChange={(e) => setRuleIdx(Number(e.target.value))} data-testid="td-rule">
              {rules.map((r, i) => <option key={r.mask} value={i}>{r.edges.join('')}</option>)}
            </select>
          </label>
          <label>Combination
            <input value={combo} onChange={(e) => setCombo(e.target.value.replace(/[^0-9a-z]/gi, '').slice(0, 9))} size={11} data-testid="td-combo" />
          </label>
          <span className="td__hint">One digit per type, in the order {leafOrder(FAMILY).join(', ')}.</span>
        </div>
        <p>
          The selected {sel.type} has crossings on edges{' '}
          {seams.length ? seams.map((s, i) => <button key={s.edge} type="button" className={`td__chip${entry === s.edge ? ' is-active' : ''}`} onClick={() => dispatch({ type: 'entry', edge: s.edge })} data-testid={`td-seam-${s.edge}`}>{s.edge}{pairing[i] >= 0 ? ` ↔ ${seams[pairing[i]].edge}` : ''}</button>) : 'none under this rule'}.
          {seams.length ? ' Each chip shows the edge it is joined to; click one to say the strand entered there.' : ''}
        </p>
        <div className="td__controls">
          <button type="button" onClick={strandStep} disabled={strandExit === null} data-testid="td-strand-step">Strand step{strandExit !== null ? `: out through edge ${strandExit}` : ''}</button>
          <span className="td__hint" data-testid="td-strand-status">
            {entry === null ? 'Pick the edge the strand enters by.' : strandExit === null ? `Edge ${entry} carries no crossing under this rule.` : `Entered through edge ${entry}; the combination joins it to edge ${strandExit}.`}
          </span>
        </div>
      </section>
    </article>
  );
}

/** The run through the machine as a left-to-right graph of the states visited. */
function RunGraph({ tr, steps, current, start }: { tr: Transducer; steps: readonly { input: Sym; from: number; to: number; emitted: readonly Sym[] }[]; current: number; start: number }): JSX.Element {
  const nodes: number[] = [start];
  for (const s of steps) if (!nodes.includes(s.to)) nodes.push(s.to);
  const W = 260, H = 170, R = 22;
  const x = (id: number): number => 80 + nodes.indexOf(id) * W;
  const width = 240 + Math.max(1, nodes.length - 1) * W;
  let emittedBefore = 0;
  return (
    <svg className="td__graph" viewBox={`0 0 ${width} ${H}`} data-testid="td-graph" style={{ maxWidth: width }}>
      <defs>
        <marker id="td-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {steps.map((s, i) => {
        const x1 = x(s.from), x2 = x(s.to);
        const loop = x1 === x2;
        const back = x2 < x1;
        const path = loop
          ? `M ${x1 + R * 0.7} ${H / 2 - R * 0.7} C ${x1 + 50} ${H / 2 - 70}, ${x1 - 50} ${H / 2 - 70}, ${x1 - R * 0.7} ${H / 2 - R * 0.7}`
          : back
            ? `M ${x1 - R} ${H / 2 + 6} Q ${(x1 + x2) / 2} ${H / 2 + 60} ${x2 + R} ${H / 2 + 6}`
            : `M ${x1 + R} ${H / 2} L ${x2 - R} ${H / 2}`;
        const lx = loop ? x1 : (x1 + x2) / 2;
        const ly = loop ? H / 2 - 66 : back ? H / 2 + 48 : H / 2 - 10;
        const first = emittedBefore;
        emittedBefore += s.emitted.length;
        const writes = s.emitted.length ? s.emitted.map((o, j) => symText(o, first + j === 0)).join('; ') : 'nothing yet';
        return (
          <g key={i}>
            <path className="edge" d={path} />
            <text className="edgelabel" x={lx} y={ly}>reads {symText(s.input, i === 0)}</text>
            <text className="edgelabel writes" x={lx} y={ly + 14 + (loop ? 0 : 20)}>writes {writes}</text>
          </g>
        );
      })}
      {nodes.map((id) => (
        <g key={id} className={`node${id === current ? ' is-current' : ''}${tr.states[id].accepting ? ' is-accepting' : ''}`}>
          <circle cx={x(id)} cy={H / 2} r={R} />
          <text x={x(id)} y={H / 2 + 4}>{id}</text>
          <text x={x(id)} y={H / 2 + R + 16} className="edgelabel">{tr.states[id].items.length} open</text>
        </g>
      ))}
    </svg>
  );
}

export default TransducerPage;
