/**
 * `TransducerPage` — Simon Tatham's combinatorial coordinates and neighbour
 * transducer for the Spectre hexagons, as something you can watch and walk,
 * and then the same machine with one of our rules and pairings on top.
 *
 * Part 1 (addresses, crossing an edge, the transducer) is his construction,
 * run live from the substitution tables in `core/transducer.ts`. Crossing an
 * edge is animated as a sequence of lookups in the expansion maps
 * (`transducer/ExpansionMap.tsx`), and you can move to the neighbour and keep
 * walking. Part 2 adds the pairing inside each tile and walks a strand with
 * it. Everything on the page is computed, nothing is drawn by hand, and the
 * picture is only there to check the machine against: the machine never
 * looks at it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HEX_LETTER, HEX_TYPES, addressFromId, addressOfSymbols, buildSystem, childType, chordPairing, comboToMatchingIndices,
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

const name = (t: HexType): string => `${t} (${HEX_LETTER[t]})`;

/** One frame of the lookup animation: which map to show, what to light up, and what to say. */
interface Frame {
  readonly level: number;
  readonly map: HexType | null;
  readonly hl: MapHighlight;
  readonly title: string;
  readonly text: string;
  /** which input symbol of the transducer run this frame corresponds to */
  readonly symbol: number;
}

function framesOf(trace: readonly TraceStep[], address: Address, edge: number): Frame[] {
  const out: Frame[] = [];
  for (const s of trace) {
    switch (s.kind) {
      case 'up': {
        const who = s.level === 0 ? `this ${s.type}` : `the ${s.type} supertile at level ${s.level}`;
        out.push({
          level: s.level, map: s.parent, symbol: s.level + 1,
          hl: { child: { s: s.slot, e: s.edge } },
          title: `Level ${s.level}: look up edge ${s.edge} of child ${s.slot} in the ${HEX_LETTER[s.parent]} map`,
          text: `${who[0].toUpperCase()}${who.slice(1)} is child ${s.slot} of a ${name(s.parent)}. Open the ${s.parent} map and find edge ${s.edge} of child ${s.slot} (yellow). Is it glued to another child inside the map, or is it on the outside?`,
        });
        out.push({
          level: s.level, map: s.parent, symbol: s.level + 1,
          hl: { child: { s: s.slot, e: s.edge }, parentEdge: s.parentEdge, piece: { j: s.parentEdge, i: s.i } },
          title: `Outside: piece ${s.i + 1} of ${s.n} of the ${HEX_LETTER[s.parent]}'s edge ${s.parentEdge}`,
          text: `It is on the outside. It is piece ${s.i + 1} of ${s.n} of the ${s.parent}'s edge ${s.parentEdge}. So the answer is not in this map: it depends on what is across edge ${s.parentEdge} of the whole ${s.parent}. Carry the question up one level and ask it again about the ${s.parent} supertile.`,
        });
        break;
      }
      case 'inside':
        out.push({
          level: s.level - 1, map: s.parent, symbol: s.level,
          hl: { child: s.from, partner: s.to },
          title: `Level ${s.level - 1}: inside the ${HEX_LETTER[s.parent]} map, edge ${s.from.e} of child ${s.from.s} meets edge ${s.to.e} of child ${s.to.s}`,
          text: `In the ${s.parent} map, edge ${s.from.e} of child ${s.from.s} (yellow) is glued to edge ${s.to.e} of child ${s.to.s} (blue). That settles it at this level: the neighbour is child ${s.to.s}, a ${name(childType(s.parent, s.to.s) as HexType)}, entered through its edge ${s.to.e}. Now come back down, one level at a time, to find which tile inside it we actually land on.`,
        });
        break;
      case 'down':
        out.push({
          level: s.level - 1, map: s.type, symbol: s.level,
          hl: { parentEdge: s.edge, piece: { j: s.edge, i: s.i }, entered: s.child },
          title: `Level ${s.level - 1}: entering the ${HEX_LETTER[s.type]} through its edge ${s.edge}, piece ${s.i + 1} of ${s.n}`,
          text: `We are entering a ${name(s.type)} through its edge ${s.edge}. On the way up we left by piece ${s.n - s.i} of ${s.n}; the two supertiles face each other, so counted from this side that is piece ${s.i + 1} of ${s.n}. That piece of the ${s.type}'s edge ${s.edge} is edge ${s.child.e} of child ${s.child.s} (green), a ${name(s.childType)}. Step into it.`,
        });
        break;
      case 'top':
        out.push({
          level: s.level, map: null, symbol: s.level + 1,
          hl: {},
          title: `Level ${s.level}: the address has run out`,
          text: `Edge ${s.edge} of the ${name(s.type)} at level ${s.level} is on the outside, but the address has no parent for it: this is the top of the patch you are looking at. The tiling continues, of course. Give the top supertile a parent (any type whose rule has a ${s.type} child) and the lookup carries on exactly as before.`,
        });
        break;
    }
  }
  const last = out[out.length - 1];
  if (last && trace[trace.length - 1].kind !== 'top') {
    const nb = neighbour(address, edge);
    if (nb.ok) out.push({ level: 0, map: null, symbol: 0, hl: {}, title: 'Done', text: `We have landed: across edge ${edge} is ${formatAddress(nb.address)}, entered through its edge ${nb.edge}. Its address differs from ours only below the level where the crossing was settled. Press “Move there” to stand on it and keep walking.` });
  }
  return out;
}

/** A state of the transducer, in words. */
function describeItem(it: DfaItem, emittedSoFar: number): string {
  // pending output continues the output written so far; if nothing has been written yet, its first symbol is the neighbour's own type and entry edge
  const owed = it.pending.length ? ` Output owed but not yet written: ${it.pending.map((s, i) => symText(s, emittedSoFar === 0 && i === 0)).join(', ')}.` : '';
  if (it.nfa === 'start') return 'Nothing read yet.';
  if (it.nfa.startsWith('acc ')) return `Both addresses agree from here on (we are inside a ${it.nfa.slice(4)}).${owed}`;
  const [l, r] = it.nfa.split('|');
  const [T, j] = l.split('.');
  const [U, jj] = r.split('.');
  return `We are leaving edge ${j} of a ${T} and, if this guess is right, entering edge ${jj} of a ${U} on the other side.${owed}`;
}

function symText(s: Sym, first: boolean): string {
  const { type, n } = parseSym(s);
  return first ? `${HEX_LETTER[type]} edge ${n}` : `${n}${HEX_LETTER[type]}`;
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

  // the supertile the current frame is "inside": tiles sharing the address prefix down to that level
  const prefixOf = (a: Address, k: number): string => [...a.path].reverse().slice(0, Math.max(0, a.path.length - k)).map((l) => l.slot).join('.');
  const inSupertile = (id: string, prefix: string): boolean => prefix === '' || id === prefix || id.startsWith(prefix + '.');
  const focusPrefix = useMemo(() => prefixOf(tile.address, (frame?.level ?? 0) + 1), [tile, frame]);
  const parentPrefix = useMemo(() => prefixOf(tile.address, 1), [tile]);

  // --- transducer ----------------------------------------------------------
  const tr = useMemo(() => hexTransducer(), []);
  const run = useMemo(() => runTransducer(tr, tile.address, edge), [tr, tile, edge]);
  const runCursor = frame ? Math.min(frame.symbol, run.steps.length) : run.steps.length;
  const currentState = run.steps.length ? run.steps[Math.max(0, runCursor - 1)].to : tr.start;
  const emittedSoFar = run.steps.slice(0, Math.max(0, runCursor)).reduce((a, s) => a + s.emitted.length, 0);
  const [wallPrefix, setWallPrefix] = useState('Y:1');
  const [wallPeriod, setWallPeriod] = useState('Y:0');
  const wall = useMemo(() => {
    const parse = (s: string): Sym[] | null => {
      const out: Sym[] = [];
      for (const tok of s.split(/[\s,]+/).filter(Boolean)) {
        const m = /^([A-Za-z]+):(\d)$/.exec(tok);
        if (!m) return null;
        const letter = m[1].length === 1 ? m[1].toUpperCase() : m[1];
        const type = HEX_TYPES.find((t) => t === letter || HEX_LETTER[t] === letter || t.toLowerCase() === letter.toLowerCase());
        if (!type) return null;
        out.push(sym(type, Number(m[2])));
      }
      return out.length ? out : null;
    };
    const p = parse(wallPrefix), q = parse(wallPeriod);
    if (!p || !q) return { error: 'Write symbols as type:number, e.g. Y:1 then Y:0. The first symbol is the tile and the edge to cross; every later one is a parent letter and the child number.' } as const;
    const r = runPeriodic(tr, p, q);
    if (!r) return { error: 'The machine jammed: that is not a legal address (each symbol must be a parent that can hold the type below it).' } as const;
    return { prefix: r.prefix, period: r.period, steps: r.steps.length } as const;
  }, [tr, wallPrefix, wallPeriod]);

  // --- the pattern ---------------------------------------------------------
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
      // show the crossing of this step in the animation too
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

  // the level-k machine of the whole patch: every boundary crossing paired with the one its strand leaves by
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

  return (
    <article className="td">
      <header className="td__intro">
        <p className="td__kicker">Combinatorial coordinates</p>
        <h1>The neighbour machine</h1>
        <p className="td__lede">
          How to walk around a tiling without ever looking at it: every tile gets an address, crossing an edge is
          a lookup in a picture, carried up and down the address like a sum with carries, and the whole thing
          collapses into one small machine. Then we bolt a rule and a pairing onto that machine and it walks our strands.
        </p>
        <p>
          This page is a working copy of Simon Tatham’s construction from{' '}
          <a href="https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-spectre/">Combinatorial coordinates for the aperiodic Spectre tiling</a>{' '}
          and{' '}
          <a href="https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-transducers/">Beyond the wall</a>,
          built for the nine hexagon metatiles (Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi; his letters G D J L X P S F Y).
          Nothing here reads the picture. The picture is only there so you can check the machine’s answers.
        </p>
      </header>

      <nav className="td__toc" aria-label="Contents">
        <ol>
          <li><a href="#addresses">Addresses</a></li>
          <li><a href="#crossing">Crossing an edge, step by step</a></li>
          <li><a href="#transducer">The machine</a></li>
          <li><a href="#pattern">Our pattern on top</a></li>
        </ol>
      </nav>

      <section className="td__board">
        <div className="td__controls">
          <label>Patch
            <select value={root} onChange={(e) => { setRoot(e.target.value as HexType); setTrail([]); }} data-testid="td-root">
              {ROOTS.map((r) => <option key={r} value={r}>{name(r)} supertile</option>)}
            </select>
          </label>
          <label>Level
            <select value={level} onChange={(e) => { setLevel(Number(e.target.value)); setTrail([]); }} data-testid="td-level">
              {[2, 3, 4].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <span className="td__hint" data-testid="td-count">{patch.tiles.length} hexagons. Click a tile to stand on it, click one of its edges (or press 0–5) to cross it, Enter to move there.</span>
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
                <title>{formatAddress(t.address)}</title>
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
        <h2>1. Addresses</h2>
        <p>
          Think of a postal address written backwards: house, then street, then town, then country. A tile’s address is
          the same idea. It says what kind of tile it is, then which numbered child it is of which kind of parent, then
          which child that parent is of <em>its</em> parent, and so on up. The parents are the supertiles: the patch you
          see is one level-{level} {root} supertile, and every tile in it is a child of a child of a child of it.
        </p>
        <p>
          The selected tile is <strong data-testid="td-address">{formatAddress(tile.address)}</strong>. Read it as:{' '}
          {[`a ${name(tile.type)}`, ...tile.address.path.map((l) => `child ${l.slot} of a ${name(l.parent)}`)].join(', ')}.
          The tiles sharing its parent are tinted; while the animation below runs, the supertile it is currently
          thinking about is tinted more faintly.
        </p>
        <p>
          Where do the numbers come from? Each of the nine types has one picture, its <em>expansion map</em>, showing
          the seven or eight children it is made of, in fixed positions with fixed numbers. Here is the map of the
          selected tile’s parent, with that tile’s slot and its edges numbered. Every lookup on this page is a
          lookup in one of these nine pictures.
        </p>
        <div className="td__gallery">
          {tile.address.path.length > 0 && <ExpansionMap parent={tile.address.path[0].parent} highlight={{ child: { s: tile.address.path[0].slot, e: edge } }} size={300} title={`The ${tile.address.path[0].parent} map: our tile is child ${tile.address.path[0].slot}, edge ${edge} in yellow`} />}
        </div>
        <details>
          <summary>All nine maps</summary>
          <p>
            The coloured runs along the outside are the parent’s own six edges. Edge 2 of a Delta, say, is made of
            three child edges in a row, and that is what “piece 2 of 3” means in the animation. The maps were extracted
            from exact geometry once (<code>fass-theorem/01-tables.ts</code>) and are the same at every level: a
            level-7 Delta is made of level-6 children in exactly these positions.
          </p>
          <div className="td__gallery">
            {HEX_TYPES.map((P) => <ExpansionMap key={P} parent={P} size={230} />)}
          </div>
        </details>
        <p className="td__aside">
          <strong>If you like linear algebra:</strong> an address is a digit string in a mixed-radix number system, like a
          clock reading hours, minutes and seconds, except that which digits are allowed in one position depends on the
          digit above it (a Gamma has no child 2). The whole infinite tiling is the set of infinite strings, and a finite
          patch is the set of strings with a fixed tail.
        </p>
      </section>

      <section id="crossing" className="td__section">
        <h2>2. Crossing an edge, step by step</h2>
        <p>
          Standing on the selected tile, which tile is across edge <strong>{edge}</strong>? Watch the machine find out.
          Each frame is one lookup in one map. Mostly the edge is glued to a sibling inside the parent’s map and the
          answer is immediate. When it is on the outside, the question is handed up a level, exactly like a carry in
          long addition, and when an answer comes back it is handed down again, one map per level.
        </p>
        <div className="td__anim">
          <div>
            {frame?.map ? <ExpansionMap parent={frame.map} highlight={frame.hl} size={300} title={`${frame.map} (${HEX_LETTER[frame.map]}) map`} /> : <div className="xmap" style={{ width: 300 }}><p className="td__hint">No map for this frame.</p></div>}
          </div>
          <div className="td__anim-text">
            <div className="is-level">Frame {Math.min(cursor + 1, frames.length)} of {frames.length}</div>
            <p data-testid="td-frame-title"><strong>{frame?.title}</strong></p>
            <p data-testid="td-frame-text">{frame?.text}</p>
            <div className="td__controls">
              <button type="button" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}>◀</button>
              <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="td-play">{playing ? 'Pause' : 'Play'}</button>
              <button type="button" onClick={() => setCursor((c) => Math.min(frames.length - 1, c + 1))} disabled={cursor >= frames.length - 1} data-testid="td-next">▶</button>
              <button type="button" onClick={moveThere} disabled={!crossing.ok || !neighbourTile} data-testid="td-move">Move there (Enter)</button>
              {trail.length > 0 && <button type="button" onClick={() => setTrail([])}>Clear trail ({trail.length})</button>}
            </div>
            <ol className="td__frames" data-testid="td-trace">
              {frames.map((f, i) => <li key={i}><button type="button" className={i === cursor ? 'is-current' : undefined} onClick={() => { setCursor(i); setPlaying(false); }}>{i + 1}. {f.title.split(':')[0]}</button></li>)}
            </ol>
          </div>
        </div>
        <p data-testid="td-result">
          {crossing.ok ? (
            <>Answer: across edge {edge} is <strong>{formatAddress(crossing.address)}</strong>, entered through its edge{' '}
              {crossing.edge}. The crossing was settled {crossing.level === 1 ? 'in the parent' : `${crossing.level} levels up`}. It is outlined on the picture.</>
          ) : (
            <>No answer inside this patch: the edge is on the outside of the whole level-{level} supertile.</>
          )}
        </p>
        <p className="td__aside">
          <strong>Why it always ends:</strong> every edge of every supertile has a class, and an edge of class +c only
          ever meets an edge of class −c. Matching classes have the same number of pieces, so when the question comes
          back down a level, “piece i of n” on one side is “piece n−1−i of n” on the other. That reversal is the only
          arithmetic in the whole algorithm. Everything else is looking things up in the nine maps.
        </p>
      </section>

      <section id="transducer" className="td__section">
        <h2>3. The machine</h2>
        <p>
          You may be thinking: that was just a table lookup. It was. The question is what you have to{' '}
          <em>remember</em> between lookups. The animation above climbs and then comes back down, and on the way up it has to remember,
          for every level, which piece of which edge it left by, because it needs them again on the way down. That
          memory grows with the height of the climb. It is a stack.
        </p>
        <p>
          Tatham’s observation is that the way down only ever uses one fact per level: “I left my supertile through edge
          j, and the neighbour is entered through edge j′”. And that fact can be <em>guessed in advance</em>, because an
          edge of class +c can only ever meet an edge of class −c, so there are just a few (type, edge) pairs that could
          be on the far side. So instead of climbing and coming back, read the address upward <em>once</em>, carrying
          every still-possible guess as your state. Each map you open rules some guesses out. When only one survives at
          some level, that level’s output symbol is certain and can be written down immediately, before you have
          finished reading. A machine like that, which reads one symbol at a time, keeps a bounded memory and writes
          output as soon as it is sure, is a <em>finite-state transducer</em>. Its lookup table has one row per
          <em> set of surviving guesses</em>, and that is the whole difference.
        </p>
        <p data-testid="td-machine-facts">
          Built that way for the hexagons, the machine has <strong>{tr.states.length} states</strong> (rows), and at no point does it hold back more
          than {Math.max(...tr.states.flatMap((s) => s.items.map((i) => i.pending.length)))} symbols of output: it never has to look more than two levels ahead.
        </p>
        <h3>The same crossing, as the machine sees it</h3>
        <p>
          The graph is the path the machine takes through its states for the selected tile and edge. Each arrow is one
          input symbol (one link of the address); what it writes is in orange. The animation above and this graph are
          in step: the highlighted state is where the machine is after reading the symbol the animation is looking at.
        </p>
        <RunGraph tr={tr} steps={run.steps} current={currentState} start={tr.start} />
        <div className="td__state" data-testid="td-state">
          <strong>State {currentState}{tr.states[currentState].accepting ? ' (done: the neighbour is fully known)' : ''}</strong>, {tr.states[currentState].items.length} {tr.states[currentState].items.length === 1 ? 'possibility' : 'possibilities'} still open:
          <ul>
            {tr.states[currentState].items.map((it, i) => <li key={i}>{describeItem(it, emittedSoFar)}</li>)}
          </ul>
        </div>
        <table className="td__run" data-testid="td-run">
          <thead><tr><th>reads</th><th>goes to state</th><th>writes</th><th>possibilities still open</th></tr></thead>
          <tbody>
            {run.steps.map((s, i) => (
              <tr key={i} className={i === runCursor - 1 ? 'is-current' : undefined}>
                <td className="td__mono">{symText(s.input, i === 0)}</td>
                <td>{s.to}{tr.states[s.to].accepting ? ' (done)' : ''}</td>
                <td className="td__mono">{s.emitted.length ? s.emitted.map((o, j) => symText(o, i === 0 && j === 0 && run.steps.slice(0, i).every((p) => p.emitted.length === 0))).join('  ') : '— (not sure yet)'}</td>
                <td>{tr.states[s.to].items.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p data-testid="td-run-result">
          {run.stuck ? 'The machine jammed, which should never happen on a real address.' : run.accepted
            ? <>Output: <strong>{formatAddress(addressOfSymbols(run.output).address)}</strong> entered through edge {addressOfSymbols(run.output).edge}. Same answer as the animation, {run.steps.length} symbols read, {run.output.length} written, no stack.</>
            : <>The machine has read the whole address and is still not done: the neighbour is outside this patch, and it is waiting for more symbols (a parent for the top supertile).</>}
        </p>
        <details>
          <summary>Every move the current state can make</summary>
          <table className="td__run">
            <thead><tr><th>on reading</th><th>goes to</th><th>writes</th></tr></thead>
            <tbody>
              {[...tr.states[currentState].next.entries()].map(([input, [to, out]]) => (
                <tr key={input}><td className="td__mono">{symText(input, currentState === tr.start)}</td><td>{to}</td><td className="td__mono">{out.length ? out.map((o) => symText(o, false)).join(' ') : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <h3>Crossing an infinite wall</h3>
        <p>
          A tile whose address repeats for ever, say <em>Y 0Y 0Y 0Y …</em> (a Psi that is child 0 of a Psi that is child
          0 of a Psi …), is the corner of an infinitely large supertile. The climb-and-return algorithm would never
          finish on it. The machine does not care: once it is in a state it has been in before at the same point of the
          repeat, it will repeat its output too. So an eventually periodic address has an eventually periodic neighbour,
          and we can cross a wall of infinite height.
        </p>
        <div className="td__wall">
          <label>starts with <input value={wallPrefix} onChange={(e) => setWallPrefix(e.target.value)} data-testid="td-wall-prefix" size={14} /></label>
          <label>then repeats <input value={wallPeriod} onChange={(e) => setWallPeriod(e.target.value)} data-testid="td-wall-period" size={14} /></label>
          <span className="td__hint">Symbols are letter:number. The first is the tile and the edge to cross (Y:1 = a Psi, edge 1); the rest are parent letter and child number (Y:0 = child 0 of a Psi).</span>
        </div>
        <p data-testid="td-wall-result">
          {'error' in wall ? wall.error : (
            <>Neighbour: starts <strong className="td__mono">{wall.prefix.map((s, i) => symText(s, i === 0)).join(' ') || '(nothing)'}</strong>, then repeats{' '}
              <strong className="td__mono">{wall.period.map((s) => symText(s, false)).join(' ')}</strong> for ever. Found after {wall.steps} symbols.</>
          )}
        </p>
        <p className="td__aside">
          <strong>If you like linear algebra:</strong> the transducer is a sparse matrix per input symbol acting on a
          vector of “which state am I in”, except that the entries also carry output strings. Determinising is the
          power-set construction with those strings attached; the construction is not guaranteed to finish, and the fact
          that it does, with 2 symbols of hesitation at most, is a measured property of this substitution.
        </p>
      </section>

      <section id="pattern" className="td__section">
        <h2>4. Our pattern on top</h2>
        <p>
          Everything so far is Tatham’s, and it knows nothing about strands. Our patterns add one move. A rule picks
          which edge classes carry a crossing, and a pairing says which crossing each one is joined to inside the tile.
          So a strand is: enter a tile at a crossing, go to its partner (the pairing), cross that edge (the machine),
          repeat. A circuit is when that brings you back to where you started. The whole of the Explorer is this loop,
          and here you can run it one step at a time on the addresses. Each Step also loads that crossing into the
          animation above, so you can watch the lookup for it.
        </p>
        <div className="td__controls">
          <label>Rule
            <select value={ruleIdx} onChange={(e) => setRuleIdx(Number(e.target.value))} data-testid="td-rule">
              {rules.map((r, i) => <option key={r.mask} value={i}>{r.edges.join('')}</option>)}
            </select>
          </label>
          <label>Pairing
            <input value={combo} onChange={(e) => setCombo(e.target.value.replace(/[^0-9a-z]/gi, '').slice(0, 9))} size={11} data-testid="td-combo" />
          </label>
          <span className="td__hint">One digit per type in the order {leafOrder(FAMILY).map((t) => HEX_LETTER[t as HexType]).join(' ')}; the same strings as the Explorer’s.</span>
        </div>
        <p>
          The selected {name(tile.type)} has crossings on edges{' '}
          {seams.length ? seams.map((s, i) => <button key={s.edge} type="button" className="td__chip" onClick={() => startStrand(s.edge)} data-testid={`td-seam-${s.edge}`}>{s.edge}{pairing[i] >= 0 ? ` ↔ ${seams[pairing[i]].edge}` : ''}</button>) : 'none under this rule'}.
          {seams.length ? ' Each chip says which edge it is paired with. Click one to start a strand entering there.' : ''}
        </p>
        <div className="td__controls">
          <button type="button" onClick={stepStrand} disabled={!strand.states.length || !!strand.end} data-testid="td-step">Step</button>
          <button type="button" onClick={runStrand} disabled={!strand.states.length || !!strand.end} data-testid="td-run-strand">Run to the end</button>
          <span className="td__hint" data-testid="td-strand-status">
            {!strand.states.length ? 'No strand yet.' : strand.end === 'circuit' ? `Closed: a circuit of ${strand.exits.length} segments.` : strand.end === 'open' ? `Left the patch after ${strand.exits.length} segments: this strand continues in a bigger supertile.` : strand.end ? `Stopped (${strand.end}).` : `${strand.exits.length} segments so far.`}
          </span>
        </div>
        {strand.states.length > 0 && (
          <ol className="td__trace td__strandlist" data-testid="td-strand">
            {strand.states.slice(-8).map((s, i, arr) => {
              const idx = strand.states.length - arr.length + i;
              const exit = strand.exits[idx];
              return <li key={idx}>in {formatAddress(s.address)} through edge {s.entry}{exit !== undefined ? `, pairing sends it out of edge ${exit}` : ''}</li>;
            })}
          </ol>
        )}
        <h3>The machine of the whole patch</h3>
        <p>
          Run every strand that enters this level-{level} {root} supertile from outside until it leaves again. What is
          left is a table: in at this crossing, out at that one. That table is the supertile’s <em>boundary state</em>,
          the only thing the rest of the tiling can see of it. Two pairings with the same table for every type at some
          level draw the same pattern at every larger scale, and following the table from level to level instead of
          the tiles is how the deep orbit gets to level 11. It is the “state machine of the pattern” in the literal sense:
          the states are the crossings on the outline, and the transitions are the strands between them.
        </p>
        <p data-testid="td-boundary-summary">
          {boundaryMachine.filter((p) => p.to).length * 2 + boundaryMachine.filter((p) => !p.to).length} crossings on the outline, joined in{' '}
          {boundaryMachine.length} strands; the longest runs {Math.max(0, ...boundaryMachine.map((p) => p.length))} segments inside the patch.
        </p>
        <details>
          <summary>The table</summary>
          <ul className="td__mono td__pairs">
            {boundaryMachine.map((p) => <li key={p.from}>{p.from} → {p.to ?? '(dead end: an unpaired crossing)'} ({p.length})</li>)}
          </ul>
        </details>
        <p className="td__aside">
          <strong>Where this goes:</strong> the strand loop is a transducer too, Tatham’s machine composed with the
          pairing table. Its closed walks are the circuits. A family of circuits (a triangle, the bigger triangle two
          levels up, and so on) is a closed walk that reads the same with two more address symbols on top, exactly like
          the repeating wall above. Finding every family is searching this machine for such walks, which is the
          catalogue the deep-orbit work is building towards.
        </p>
      </section>
    </article>
  );
}

/** The run through the transducer as a left-to-right graph of the states visited. */
function RunGraph({ tr, steps, current, start }: { tr: Transducer; steps: readonly { input: Sym; from: number; to: number; emitted: readonly Sym[] }[]; current: number; start: number }): JSX.Element {
  const nodes: number[] = [start];
  for (const s of steps) if (!nodes.includes(s.to)) nodes.push(s.to);
  const W = 120, H = 150, R = 22;
  const x = (id: number): number => 40 + nodes.indexOf(id) * W;
  const width = 80 + Math.max(1, nodes.length - 1) * W;
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
        const ly = loop ? H / 2 - 62 : back ? H / 2 + 48 : H / 2 - 12 - (i % 2) * 14;
        return (
          <g key={i}>
            <path className="edge" d={path} />
            <text className="edgelabel" x={lx} y={ly}>
              {symText(s.input, i === 0)}{s.emitted.length ? <tspan className="writes"> / {s.emitted.map((o) => symText(o, false)).join(' ')}</tspan> : <tspan className="writes"> / –</tspan>}
            </text>
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
