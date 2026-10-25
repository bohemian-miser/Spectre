/**
 * `TransducerPage` — where a tile is, how to cross one of its edges without
 * looking at the geometry, the finite-state machine that does the crossing,
 * and a rule and combination run on top of it.
 *
 * The construction is Simon Tatham's (combinatorial coordinates and the
 * neighbour transducer), written here in the site's own terms: tile types by
 * name, slot paths, supertiles, rules and combinations. Everything comes from
 * `core/transducer.ts` and the substitution tables; the picture is drawn only
 * so the machine's answers can be checked against it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HEX_TYPES, addressFromId, addressOfSymbols, buildSystem, childType, chordPairing, comboToMatchingIndices,
  flatten, formatAddress, hexTransducer, idOf, leafOrder, leafPts, levelMirror, neighbour,
  parseSym, runPeriodic, runTransducer, sameAddress, slotsOfType, strandStep, sym, transPt, validEdgeSubsets,
  walkStrand,
  type Address, type DfaItem, type HexType, type StrandState, type Sym, type TileTypeId, type TraceStep, type Transducer,
} from '../core';
import { tileColor } from '../lib/palette';
import { ExpansionMap, type MapHighlight } from './transducer/ExpansionMap';
import '../styles/transducer.css';

const FAMILY = 'hex' as const;
const ROOTS: readonly HexType[] = ['Delta', 'Gamma', 'Psi', 'Theta'];
const FRAME_MS = 1600;

interface Tile { readonly id: string; readonly address: Address; readonly type: HexType; readonly pts: { x: number; y: number }[]; readonly c: { x: number; y: number } }

function buildPatch(root: HexType, level: number): { tiles: Tile[]; viewBox: string } {
  const node = buildSystem(FAMILY, level)[root];
  const insts = flatten(node, levelMirror(level));
  const base = leafPts(FAMILY, 'Delta');
  const tiles: Tile[] = insts.map((inst) => {
    const pts = base.map((p) => transPt(inst.xform, p));
    return { id: inst.id, address: addressFromId(root, inst.id), type: inst.type as HexType, pts, c: { x: pts.reduce((a, p) => a + p.x, 0) / 6, y: pts.reduce((a, p) => a + p.y, 0) / 6 } };
  });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tiles) for (const p of t.pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const pad = 0.6;
  return { tiles, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}` };
}

/** One frame of the lookup: which rule to show, what to light up, what happened. */
interface Frame {
  readonly level: number;
  readonly map: HexType | null;
  readonly hl: MapHighlight;
  readonly title: string;
  readonly text: string;
  /** which input symbol of the machine's run this frame corresponds to */
  readonly symbol: number;
}

function framesOf(trace: readonly TraceStep[], address: Address, edge: number): Frame[] {
  const out: Frame[] = [];
  for (const s of trace) {
    switch (s.kind) {
      case 'up': {
        const who = s.level === 0 ? `The ${s.type}` : `The level-${s.level} ${s.type} supertile`;
        out.push({
          level: s.level, map: s.parent, symbol: s.level + 1,
          hl: { child: { s: s.slot, e: s.edge } },
          title: `Level ${s.level}: edge ${s.edge} of slot ${s.slot} in the ${s.parent} rule`,
          text: `${who} is in slot ${s.slot} of a ${s.parent}. In the ${s.parent} rule, edge ${s.edge} of slot ${s.slot} is yellow. Either it meets a sibling inside the rule, or it is on the supertile's outside.`,
        });
        out.push({
          level: s.level, map: s.parent, symbol: s.level + 1,
          hl: { child: { s: s.slot, e: s.edge }, parentEdge: s.parentEdge, piece: { j: s.parentEdge, i: s.i } },
          title: `Outside: piece ${s.i + 1} of ${s.n} of the ${s.parent}'s edge ${s.parentEdge}`,
          text: `It is on the outside, piece ${s.i + 1} of ${s.n} of the ${s.parent}'s edge ${s.parentEdge}. The answer depends on what lies across that edge of the whole ${s.parent}, so the same question is asked one level up.`,
        });
        break;
      }
      case 'inside':
        out.push({
          level: s.level - 1, map: s.parent, symbol: s.level,
          hl: { child: s.from, partner: s.to },
          title: `Level ${s.level - 1}: inside the ${s.parent} rule, edge ${s.from.e} of slot ${s.from.s} meets edge ${s.to.e} of slot ${s.to.s}`,
          text: `In the ${s.parent} rule, edge ${s.from.e} of slot ${s.from.s} (yellow) meets edge ${s.to.e} of slot ${s.to.s} (blue). The neighbour at this level is slot ${s.to.s}, a ${childType(s.parent, s.to.s)}, entered through its edge ${s.to.e}. The remaining frames go back down to the tile inside it.`,
        });
        break;
      case 'down':
        out.push({
          level: s.level - 1, map: s.type, symbol: s.level,
          hl: { parentEdge: s.edge, piece: { j: s.edge, i: s.i }, entered: s.child },
          title: `Level ${s.level - 1}: into the ${s.type} through its edge ${s.edge}, piece ${s.i + 1} of ${s.n}`,
          text: `Entering a ${s.type} through its edge ${s.edge}. The piece left by on the way up was piece ${s.n - s.i} of ${s.n}; the two supertiles face each other, so from this side it is piece ${s.i + 1} of ${s.n}. That piece is edge ${s.child.e} of slot ${s.child.s} (green), a ${s.childType}.`,
        });
        break;
      case 'top':
        out.push({
          level: s.level, map: null, symbol: s.level + 1,
          hl: {},
          title: `Level ${s.level}: the slot path has run out`,
          text: `Edge ${s.edge} of the level-${s.level} ${s.type} is on the outside, and this ${s.type} is the root of the patch, so there is no slot above it to look in. Any type whose rule has a ${s.type} child could be its parent; with one chosen, the lookup continues the same way.`,
        });
        break;
    }
  }
  if (trace[trace.length - 1]?.kind !== 'top') {
    const nb = neighbour(address, edge);
    if (nb.ok) out.push({ level: 0, map: null, symbol: 0, hl: {}, title: 'Landed', text: `Across edge ${edge} is ${idOf(nb.address)} (${formatAddress(nb.address)}), entered through its edge ${nb.edge}. Its slot path differs from this tile's only below the level where the crossing was settled.` });
  }
  return out;
}

/** A state of the machine, in words: each item is one guess still open. */
function describeItem(it: DfaItem, emittedSoFar: number): string {
  const owed = it.pending.length ? ` Output decided but not yet written: ${it.pending.map((s, i) => symText(s, emittedSoFar === 0 && i === 0)).join(', ')}.` : '';
  if (it.nfa === 'start') return 'Nothing read yet.';
  if (it.nfa.startsWith('acc ')) return `The two slot paths agree from here up (currently inside a ${it.nfa.slice(4)}).${owed}`;
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
  const [root, setRoot] = useState<HexType>('Delta');
  const [level, setLevel] = useState(3);
  const patch = useMemo(() => buildPatch(root, level), [root, level]);
  const byId = useMemo(() => new Map(patch.tiles.map((t) => [t.id, t])), [patch]);
  const [selected, setSelected] = useState<string>('1.7.0');
  const [edge, setEdge] = useState<number>(2);
  const [trail, setTrail] = useState<string[]>([]);
  const tile = byId.get(selected) ?? patch.tiles[0];

  useEffect(() => {
    if (!byId.has(selected)) { setSelected(patch.tiles[Math.floor(patch.tiles.length / 2)].id); setTrail([]); }
  }, [byId, selected, patch]);

  const crossing = useMemo(() => neighbour(tile.address, edge), [tile, edge]);
  const neighbourTile = crossing.ok ? byId.get(idOf(crossing.address)) : undefined;
  const frames = useMemo(() => framesOf(crossing.trace, tile.address, edge), [crossing, tile, edge]);

  // --- the animation -------------------------------------------------------
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setCursor(0); }, [frames]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setCursor((c) => {
        if (c + 1 >= frames.length) { setPlaying(false); return c; }
        return c + 1;
      });
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [playing, frames.length]);
  const frame = frames[Math.min(cursor, frames.length - 1)];

  const cross = useCallback((e: number) => { setEdge(e); setCursor(0); setPlaying(true); }, []);
  const moveThere = useCallback(() => {
    if (!crossing.ok) return;
    const id = idOf(crossing.address);
    if (!byId.has(id)) return;
    setTrail((t) => [...t, tile.id]);
    setSelected(id);
    setEdge(crossing.edge);
    setCursor(0);
    setPlaying(false);
  }, [crossing, byId, tile]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (ev.key >= '0' && ev.key <= '5') cross(Number(ev.key));
      else if (ev.key === 'Enter') moveThere();
      else if (ev.key === ' ') { ev.preventDefault(); setPlaying((p) => !p); }
      else if (ev.key === 'ArrowRight') setCursor((c) => Math.min(c + 1, frames.length - 1));
      else if (ev.key === 'ArrowLeft') setCursor((c) => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cross, moveThere, frames.length]);

  // the supertile the current frame is inside: tiles sharing the slot path down to that level
  const prefixOf = (a: Address, k: number): string => [...a.path].reverse().slice(0, Math.max(0, a.path.length - k)).map((l) => l.slot).join('.');
  const inSupertile = (id: string, prefix: string): boolean => prefix === '' || id === prefix || id.startsWith(prefix + '.');
  const focusPrefix = useMemo(() => prefixOf(tile.address, (frame?.level ?? 0) + 1), [tile, frame]);
  const parentPrefix = useMemo(() => prefixOf(tile.address, 1), [tile]);

  // --- the machine ---------------------------------------------------------
  const tr = useMemo(() => hexTransducer(), []);
  const run = useMemo(() => runTransducer(tr, tile.address, edge), [tr, tile, edge]);
  const runCursor = frame ? Math.min(frame.symbol, run.steps.length) : run.steps.length;
  const currentState = run.steps.length ? run.steps[Math.max(0, runCursor - 1)].to : tr.start;
  const emittedSoFar = run.steps.slice(0, Math.max(0, runCursor)).reduce((a, s) => a + s.emitted.length, 0);
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
  const seams = useMemo(() => slotsOfType(FAMILY, tile.type as TileTypeId, subset), [tile, subset]);
  const pairing = useMemo(() => chordPairing(FAMILY, tile.type as TileTypeId, subset, matching[tile.type] ?? 0), [tile, subset, matching]);
  const [strand, setStrand] = useState<{ states: StrandState[]; exits: number[]; end: string | null }>({ states: [], exits: [], end: null });

  const startStrand = useCallback((entry: number) => {
    setStrand({ states: [{ address: tile.address, entry }], exits: [], end: null });
  }, [tile]);
  const stepStrand = useCallback(() => {
    setStrand((s) => {
      if (!s.states.length || s.end) return s;
      const cur = s.states[s.states.length - 1];
      const st = strandStep(subset, matching, cur);
      if (!st.ok) return { ...s, end: st.reason === 'needs-parent' ? 'open' : st.reason };
      const closes = sameAddress(st.next.address, s.states[0].address) && st.next.entry === s.states[0].entry;
      setSelected(idOf(cur.address));
      setEdge(st.exit);
      setCursor(0);
      setPlaying(false);
      return { states: closes ? s.states : [...s.states, st.next], exits: [...s.exits, st.exit], end: closes ? 'circuit' : null };
    });
  }, [subset, matching]);
  const runStrand = useCallback(() => {
    setStrand((s) => {
      if (!s.states.length) return s;
      const w = walkStrand(subset, matching, s.states[0], 20000);
      return { states: [...w.states], exits: [...w.exits], end: w.end };
    });
  }, [subset, matching]);
  useEffect(() => setStrand({ states: [], exits: [], end: null }), [subset, combo, root, level]);

  const strandIds = useMemo(() => new Set(strand.states.map((s) => idOf(s.address))), [strand]);
  const edgeMid = (t: Tile, e: number): { x: number; y: number } => ({ x: (t.pts[e].x + t.pts[(e + 1) % 6].x) / 2, y: (t.pts[e].y + t.pts[(e + 1) % 6].y) / 2 });
  const strandLine = useMemo(() => {
    const pts: string[] = [];
    strand.states.forEach((s, i) => {
      const t = byId.get(idOf(s.address));
      if (!t) return;
      const m = edgeMid(t, s.entry);
      pts.push(`${m.x},${m.y}`);
      if (strand.exits[i] !== undefined) { const q = edgeMid(t, strand.exits[i]); pts.push(`${q.x},${q.y}`); }
    });
    return pts.join(' ');
  }, [strand, byId]);
  const trailLine = useMemo(() => [...trail, tile.id].map((id) => byId.get(id)).filter((t): t is Tile => !!t).map((t) => `${t.c.x},${t.c.y}`).join(' '), [trail, tile, byId]);

  // the boundary state of the whole patch: every crossing on the outline, paired with the one its strand leaves by
  const boundaryMachine = useMemo(() => {
    const pairs: { from: string; to: string | null; length: number }[] = [];
    const seen = new Set<string>();
    for (const t of patch.tiles) {
      for (const s of slotsOfType(FAMILY, t.type as TileTypeId, subset)) {
        if (neighbour(t.address, s.edge).ok) continue;
        const key = `${t.id}/${s.edge}`;
        if (seen.has(key)) continue;
        const w = walkStrand(subset, matching, { address: t.address, entry: s.edge }, 200000);
        const last = w.states[w.states.length - 1];
        const exit = w.exits.length === w.states.length ? w.exits[w.exits.length - 1] : undefined;
        const to = w.end === 'open' && exit !== undefined ? `${idOf(last.address)}/${exit}` : null;
        seen.add(key);
        if (to) seen.add(to);
        pairs.push({ from: key, to, length: w.exits.length });
      }
    }
    return pairs;
  }, [patch, subset, matching]);

  const parent = tile.address.path[0];

  return (
    <article className="td">
      <header className="td__intro">
        <p className="td__kicker">Slot paths</p>
        <h1>The neighbour machine</h1>
        <p className="td__lede">
          A tile's position is its slot path. Crossing an edge is a lookup in the substitution rules, carried up and
          down the path, and the whole procedure is a finite-state machine. A rule and a combination on top of that
          machine walk a strand.
        </p>
        <p>
          The construction is Simon Tatham's (<a href="https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-spectre/">combinatorial coordinates</a>,{' '}
          <a href="https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-transducers/">finite-state transducers</a>), built here for the nine hexagon tile types.
          The machine never reads the picture. The picture is there to check its answers.
        </p>
      </header>

      <nav className="td__toc" aria-label="Contents">
        <ol>
          <li><a href="#addresses">Where a tile is</a></li>
          <li><a href="#crossing">Crossing an edge</a></li>
          <li><a href="#transducer">The machine</a></li>
          <li><a href="#pattern">A rule and a combination</a></li>
        </ol>
      </nav>

      <section className="td__board">
        <div className="td__controls">
          <label>Supertile
            <select value={root} onChange={(e) => { setRoot(e.target.value as HexType); setTrail([]); }} data-testid="td-root">
              {ROOTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>Level
            <select value={level} onChange={(e) => { setLevel(Number(e.target.value)); setTrail([]); }} data-testid="td-level">
              {[2, 3, 4].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <span className="td__hint" data-testid="td-count">{patch.tiles.length} tiles. Click a tile to stand on it, click one of its edges (or press 0 to 5) to cross it, Enter to move there.</span>
        </div>
        <svg className="td__svg" viewBox={patch.viewBox} data-testid="td-svg" data-tile-count={patch.tiles.length}>
          {patch.tiles.map((t) => {
            const isSel = t.id === tile.id;
            const isNb = neighbourTile?.id === t.id;
            const inFocus = inSupertile(t.id, focusPrefix);
            const inParent = inSupertile(t.id, parentPrefix);
            const onStrand = strandIds.has(t.id);
            return (
              <polygon
                key={t.id}
                data-id={t.id}
                className={`td__tile${isSel ? ' is-selected' : ''}${isNb ? ' is-neighbour' : ''}${inParent ? ' in-parent' : inFocus ? ' in-grandparent' : ''}${onStrand ? ' on-strand' : ''}`}
                points={t.pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={tileColor(t.type)}
                onClick={() => { setSelected(t.id); setPlaying(false); setCursor(0); }}
              >
                <title>{t.id}: {formatAddress(t.address)}</title>
              </polygon>
            );
          })}
          {trail.length > 0 && <polyline className="td__trail" points={trailLine} />}
          {strandLine && <polyline className="td__strand" points={strandLine} />}
          {tile.pts.map((p, e) => {
            const q = tile.pts[(e + 1) % 6];
            const m = edgeMid(tile, e);
            return (
              <g key={e} className={`td__edge${e === edge ? ' is-active' : ''}`} onClick={() => cross(e)}>
                <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
                <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle">{e}</text>
              </g>
            );
          })}
        </svg>
      </section>

      <section id="addresses" className="td__section">
        <h2>1. Where a tile is</h2>
        <p>
          The patch is one level-{level} {root} supertile. Every tile in it sits in a slot of a level-1 supertile,
          which sits in a slot of a level-2 supertile, and so on up to the root. The slot path, read from the root
          down, is the tile's id, the same id the Supertiles page and the Explorer use.
        </p>
        <p>
          The selected tile is <strong data-testid="td-id">{tile.id}</strong>: <span data-testid="td-address">{formatAddress(tile.address)}</span>.
          Tiles in the same level-1 supertile are tinted. While the animation runs, the supertile the current frame is
          looking inside is tinted more faintly.
        </p>
        <p>
          Each type's substitution rule is a fixed picture: which type goes in which slot, and how the children's
          edges meet. Every lookup on this page is a lookup in one of these nine pictures. The coloured runs along the
          outside are the supertile's own six edges, each made of a few child edges in a row.
        </p>
        <div className="td__gallery">
          {parent && <ExpansionMap parent={parent.parent} highlight={{ child: { s: parent.slot, e: edge } }} size={300} title={`The ${parent.parent} rule. The selected tile is slot ${parent.slot}; its edge ${edge} is yellow.`} />}
        </div>
        <details>
          <summary>All nine rules</summary>
          <div className="td__gallery">
            {HEX_TYPES.map((P) => <ExpansionMap key={P} parent={P} size={230} />)}
          </div>
          <p>
            The rules were read off exact geometry once (<code>fass-theorem/01-tables.ts</code>) and are the same at
            every level: a level-7 Delta is made of level-6 children in these positions, with these edges meeting.
          </p>
        </details>
      </section>

      <section id="crossing" className="td__section">
        <h2>2. Crossing an edge</h2>
        <p>
          Which tile is across edge <strong>{edge}</strong> of the selected tile? Each frame below is one lookup in
          one rule. If the edge meets a sibling inside the parent's rule, that is the answer. If it is on the parent's
          outside, the same question is asked about the parent, one level up, and the answer is carried back down
          through the rules, one level at a time.
        </p>
        <div className="td__anim">
          <div>
            {frame?.map ? <ExpansionMap parent={frame.map} highlight={frame.hl} size={300} title={`The ${frame.map} rule`} /> : <div className="xmap" style={{ width: 300 }}><p className="td__hint">No rule to show for this frame.</p></div>}
          </div>
          <div className="td__anim-text">
            <div className="is-level">Frame {Math.min(cursor + 1, frames.length)} of {frames.length}</div>
            <p data-testid="td-frame-title"><strong>{frame?.title}</strong></p>
            <p data-testid="td-frame-text">{frame?.text}</p>
            <div className="td__controls">
              <button type="button" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}>◀</button>
              <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="td-play">{playing ? 'Pause' : 'Play'}</button>
              <button type="button" onClick={() => setCursor((c) => Math.min(frames.length - 1, c + 1))} disabled={cursor >= frames.length - 1} data-testid="td-next">▶</button>
              <button type="button" onClick={moveThere} disabled={!crossing.ok || !neighbourTile} data-testid="td-move">Move there</button>
              {trail.length > 0 && <button type="button" onClick={() => setTrail([])}>Clear trail ({trail.length})</button>}
            </div>
            <ol className="td__frames" data-testid="td-trace">
              {frames.map((f, i) => <li key={i}><button type="button" className={i === cursor ? 'is-current' : undefined} onClick={() => { setCursor(i); setPlaying(false); }}>{i + 1}. {f.title.split(':')[0]}</button></li>)}
            </ol>
          </div>
        </div>
        <p data-testid="td-result">
          {crossing.ok ? (
            <>Across edge {edge} is <strong>{idOf(crossing.address)}</strong> ({formatAddress(crossing.address)}), entered through its edge{' '}
              {crossing.edge}. The crossing was settled {crossing.level === 1 ? 'in the level-1 supertile' : `at level ${crossing.level}`}. It is outlined on the picture.</>
          ) : (
            <>No answer inside this patch: the edge is on the outside of the level-{level} {root}.</>
          )}
        </p>
        <p>
          Every edge of every supertile has a class, and an edge of class +c meets only an edge of class −c. Two
          matching edges are made of the same number of child edges, so piece i of n on one side is piece n−1−i of n
          on the other. That reversal is the only arithmetic; the rest is lookup.
        </p>
      </section>

      <section id="transducer" className="td__section">
        <h2>3. The machine</h2>
        <p>
          The frames above climb and come back down. On the way up they keep, for every level, which piece of which
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
          For the hexagons the table has <strong>{tr.states.length} rows</strong>, and no row holds back more than {maxPending} symbols of answer,
          so it never needs to see more than {maxPending} levels past the one it is writing.
        </p>
        <h3>The same crossing, as the machine runs it</h3>
        <p>
          Each arrow reads one link of the slot path; what the machine writes is in orange. The highlighted state is
          where the machine is after reading the link the animation is on.
        </p>
        <RunGraph tr={tr} steps={run.steps} current={currentState} start={tr.start} />
        <div className="td__state" data-testid="td-state">
          <strong>State {currentState}{tr.states[currentState].accepting ? ', done: the neighbour is fully known' : ''}</strong>, {tr.states[currentState].items.length} {tr.states[currentState].items.length === 1 ? 'guess' : 'guesses'} open:
          <ul>
            {tr.states[currentState].items.map((it, i) => <li key={i}>{describeItem(it, emittedSoFar)}</li>)}
          </ul>
        </div>
        <table className="td__run" data-testid="td-run">
          <thead><tr><th>reads</th><th>state</th><th>writes</th><th>guesses open</th></tr></thead>
          <tbody>
            {run.steps.map((s, i) => {
              const before = run.steps.slice(0, i).reduce((a, p) => a + p.emitted.length, 0);
              return (
                <tr key={i} className={i === runCursor - 1 ? 'is-current' : undefined}>
                  <td className="td__mono">{symText(s.input, i === 0)}</td>
                  <td>{s.to}{tr.states[s.to].accepting ? ' (done)' : ''}</td>
                  <td className="td__mono">{s.emitted.length ? s.emitted.map((o, j) => symText(o, before + j === 0)).join('; ') : '—'}</td>
                  <td>{tr.states[s.to].items.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p data-testid="td-run-result">
          {run.stuck ? 'The machine jammed. That does not happen on a legal slot path.' : run.accepted
            ? <>Written: <strong>{idOf(addressOfSymbols(run.output).address)}</strong>, entered through edge {addressOfSymbols(run.output).edge}. The same answer as the frames, from {run.steps.length} links read, with no stack.</>
            : <>The whole slot path is read and the machine is not done: the neighbour is outside this patch, and the machine is waiting for the root's parent.</>}
        </p>
        <details>
          <summary>Every move from state {currentState}</summary>
          <table className="td__run">
            <thead><tr><th>reads</th><th>state</th><th>writes</th></tr></thead>
            <tbody>
              {[...tr.states[currentState].next.entries()].map(([input, [to, out]]) => (
                <tr key={input}><td className="td__mono">{symText(input, currentState === tr.start)}</td><td>{to}</td><td className="td__mono">{out.length ? out.map((o) => symText(o, false)).join('; ') : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <h3>A wall of infinite height</h3>
        <p>
          A slot path that repeats for ever, a Psi in slot 0 of a Psi in slot 0 of a Psi and so on, is the corner of
          an infinitely large supertile. The climb never ends on it. The machine reaches a state it has been in
          before at the same point of the repeat, and from there its output repeats too. So an eventually periodic
          slot path has an eventually periodic neighbour.
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

      <section id="pattern" className="td__section">
        <h2>4. A rule and a combination</h2>
        <p>
          The machine knows nothing about strands. A rule picks the classes that carry a crossing, and a combination
          picks, in each tile, which crossing each one is joined to. A strand is: enter a tile at a crossing, go to
          its partner, cross that edge with the machine, repeat. A circuit is a strand that returns to its start. Each
          Step below also loads its crossing into the frames above.
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
          The selected {tile.type} has crossings on edges{' '}
          {seams.length ? seams.map((s, i) => <button key={s.edge} type="button" className="td__chip" onClick={() => startStrand(s.edge)} data-testid={`td-seam-${s.edge}`}>{s.edge}{pairing[i] >= 0 ? ` ↔ ${seams[pairing[i]].edge}` : ''}</button>) : 'none under this rule'}.
          {seams.length ? ' Each chip shows the edge it is joined to. Click one to start a strand entering there.' : ''}
        </p>
        <div className="td__controls">
          <button type="button" onClick={stepStrand} disabled={!strand.states.length || !!strand.end} data-testid="td-step">Step</button>
          <button type="button" onClick={runStrand} disabled={!strand.states.length || !!strand.end} data-testid="td-run-strand">Run to the end</button>
          <span className="td__hint" data-testid="td-strand-status">
            {!strand.states.length ? 'No strand yet.' : strand.end === 'circuit' ? `Closed: a circuit of ${strand.exits.length} segments.` : strand.end === 'open' ? `Left the patch after ${strand.exits.length} segments.` : strand.end ? `Stopped (${strand.end}).` : `${strand.exits.length} segments so far.`}
          </span>
        </div>
        {strand.states.length > 0 && (
          <ol className="td__trace td__strandlist" data-testid="td-strand">
            {strand.states.slice(-8).map((s, i, arr) => {
              const idx = strand.states.length - arr.length + i;
              const exit = strand.exits[idx];
              return <li key={idx}>{idOf(s.address)} ({s.address.leaf}), in at edge {s.entry}{exit !== undefined ? `, out at edge ${exit}` : ''}</li>;
            })}
          </ol>
        )}
        <h3>The boundary state of the patch</h3>
        <p>
          Every strand that enters the level-{level} {root} from outside, followed until it leaves: in at this
          crossing, out at that one. This table is all the rest of the tiling can see of the supertile. Two
          combinations with the same table for every type at some level are the same pattern at every larger scale,
          and iterating the table from level to level is what the deep orbit does.
        </p>
        <p data-testid="td-boundary-summary">
          {boundaryMachine.filter((p) => p.to).length * 2 + boundaryMachine.filter((p) => !p.to).length} crossings on the outline, joined in{' '}
          {boundaryMachine.length} strands; the longest runs {Math.max(0, ...boundaryMachine.map((p) => p.length))} segments inside the patch.
        </p>
        <details>
          <summary>The table</summary>
          <ul className="td__mono td__pairs">
            {boundaryMachine.map((p) => <li key={p.from}>{p.from} → {p.to ?? '(unpaired crossing)'} ({p.length})</li>)}
          </ul>
        </details>
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
