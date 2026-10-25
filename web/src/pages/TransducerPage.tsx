/**
 * `TransducerPage` — Simon Tatham's combinatorial coordinates and neighbour
 * transducer for the Spectre hexagons, as something you can step through, and
 * then the same machine with one of our rules and pairings on top.
 *
 * Part 1 (addresses, crossing an edge, the transducer) is his construction,
 * run live from the substitution tables in `core/transducer.ts`. Part 2 adds
 * the pairing inside each tile and walks a strand with it. Everything on the
 * page is computed, nothing is drawn by hand, and the picture is only there to
 * check the machine against: the machine never looks at it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HEX_LETTER, HEX_TYPES, addressFromId, addressOfSymbols, buildSystem, childType, chordPairing, comboToMatchingIndices,
  edgeClass, flatten, formatAddress, hexTransducer, idOf, leafOrder, leafPts, levelMirror, locateChildEdge, neighbour,
  parseSym, runPeriodic, runTransducer, sameAddress, slotsOfType, strandStep, sym, transPt, validEdgeSubsets,
  walkStrand,
  type Address, type HexType, type StrandState, type Sym, type TileTypeId, type TraceStep,
} from '../core';
import { tileColor } from '../lib/palette';
import '../styles/transducer.css';

const FAMILY = 'hex' as const;
const ROOTS: readonly HexType[] = ['Delta', 'Gamma', 'Psi', 'Theta'];

interface Tile { readonly id: string; readonly address: Address; readonly type: HexType; readonly pts: { x: number; y: number }[] }

function buildPatch(root: HexType, level: number): { tiles: Tile[]; viewBox: string } {
  const node = buildSystem(FAMILY, level)[root];
  const insts = flatten(node, levelMirror(level));
  const base = leafPts(FAMILY, 'Delta');
  const tiles: Tile[] = insts.map((inst) => ({
    id: inst.id,
    address: addressFromId(root, inst.id),
    type: inst.type as HexType,
    pts: base.map((p) => transPt(inst.xform, p)),
  }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tiles) for (const p of t.pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const pad = 0.6;
  return { tiles, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}` };
}

const name = (t: HexType): string => `${t} (${HEX_LETTER[t]})`;
const ordinal = (i: number, n: number): string => `piece ${i + 1} of ${n}`;

/** Plain words for one step of the recursive algorithm. */
function describe(step: TraceStep): string {
  switch (step.kind) {
    case 'up':
      return `Edge ${step.edge} of this ${step.type} is on the outside of its parent, a ${step.parent} (it is child ${step.slot}). It is ${ordinal(step.i, step.n)} of the ${step.parent}'s edge ${step.parentEdge}. So we ask the same question one level up: what is across edge ${step.parentEdge} of that ${step.parent}?`;
    case 'inside':
      return `Inside the ${step.parent} at level ${step.level}, edge ${step.from.e} of child ${step.from.s} meets edge ${step.to.e} of child ${step.to.s}. That is an answer at this level: the neighbour is child ${step.to.s}, entered through its edge ${step.to.e}. Now come back down.`;
    case 'down':
      return `We entered the ${step.type} through its edge ${step.edge}. The piece we left by was ${ordinal(step.n - 1 - step.i, step.n)} counted the other way round, so we land in child ${step.child.s} (a ${step.childType}), entering through its edge ${step.child.e}.`;
    case 'top':
      return `Edge ${step.edge} of this ${step.type} is on the outside of the whole patch. There is no parent in the address to ask, so the answer depends on which supertile this one sits in. Add one more link to the address and the machine can carry on.`;
  }
}

export function TransducerPage(): JSX.Element {
  const [root, setRoot] = useState<HexType>('Delta');
  const [level, setLevel] = useState(3);
  const patch = useMemo(() => buildPatch(root, level), [root, level]);
  const byId = useMemo(() => new Map(patch.tiles.map((t) => [t.id, t])), [patch]);
  const [selected, setSelected] = useState<string>('1.7.0');
  const [edge, setEdge] = useState<number>(2);
  const tile = byId.get(selected) ?? patch.tiles[0];

  useEffect(() => {
    if (!byId.has(selected)) setSelected(patch.tiles[Math.floor(patch.tiles.length / 2)].id);
  }, [byId, selected, patch]);

  const crossing = useMemo(() => neighbour(tile.address, edge), [tile, edge]);
  const neighbourTile = crossing.ok ? byId.get(idOf(crossing.address)) : undefined;

  // --- transducer ----------------------------------------------------------
  const tr = useMemo(() => hexTransducer(), []);
  const run = useMemo(() => runTransducer(tr, tile.address, edge), [tr, tile, edge]);
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
  const strandLine = useMemo(() => {
    // a polyline through the entry and exit midpoints of every tile on the strand
    const pts: string[] = [];
    strand.states.forEach((s, i) => {
      const t = byId.get(idOf(s.address));
      if (!t) return;
      const mid = (e: number): string => { const a = t.pts[e], b = t.pts[(e + 1) % 6]; return `${(a.x + b.x) / 2},${(a.y + b.y) / 2}`; };
      pts.push(mid(s.entry));
      if (strand.exits[i] !== undefined) pts.push(mid(strand.exits[i]));
    });
    return pts.join(' ');
  }, [strand, byId]);

  // the level-k machine of the whole patch: every boundary crossing paired with the one its strand leaves by
  const boundaryMachine = useMemo(() => {
    const pairs: { from: string; to: string | null; length: number }[] = [];
    const seen = new Set<string>();
    for (const t of patch.tiles) {
      for (const s of slotsOfType(FAMILY, t.type as TileTypeId, subset)) {
        if (neighbour(t.address, s.edge).ok) continue; // not on the outline
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

  const edgeMid = (t: Tile, e: number): { x: number; y: number } => ({ x: (t.pts[e].x + t.pts[(e + 1) % 6].x) / 2, y: (t.pts[e].y + t.pts[(e + 1) % 6].y) / 2 });
  const prefixOf = (a: Address, k: number): string => [...a.path].reverse().slice(0, a.path.length - k).map((l) => l.slot).join('.');
  const ancestorIds = useMemo(() => ({ 1: prefixOf(tile.address, 1), 2: prefixOf(tile.address, 2) }), [tile]);

  return (
    <article className="td">
      <header className="td__intro">
        <p className="td__kicker">Combinatorial coordinates</p>
        <h1>The neighbour machine</h1>
        <p className="td__lede">
          How to walk around a tiling without ever looking at it: every tile gets an address, crossing an edge is
          arithmetic on the address, and the arithmetic is a small machine. Then we bolt a rule and a pairing onto
          that machine and it walks our strands.
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
          <li><a href="#crossing">Crossing an edge</a></li>
          <li><a href="#transducer">The machine</a></li>
          <li><a href="#pattern">Our pattern on top</a></li>
        </ol>
      </nav>

      <section className="td__board">
        <div className="td__controls">
          <label>Patch
            <select value={root} onChange={(e) => setRoot(e.target.value as HexType)} data-testid="td-root">
              {ROOTS.map((r) => <option key={r} value={r}>{name(r)} supertile</option>)}
            </select>
          </label>
          <label>Level
            <select value={level} onChange={(e) => setLevel(Number(e.target.value))} data-testid="td-level">
              {[2, 3, 4].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <span className="td__hint" data-testid="td-count">{patch.tiles.length} hexagons. Click one to select it; click an edge of the selected tile to cross it.</span>
        </div>
        <svg className="td__svg" viewBox={patch.viewBox} data-testid="td-svg" data-tile-count={patch.tiles.length}>
          {patch.tiles.map((t) => {
            const isSel = t.id === tile.id;
            const isNb = neighbourTile?.id === t.id;
            const inL1 = t.id.startsWith(ancestorIds[1]) && (ancestorIds[1] === '' || t.id[ancestorIds[1].length] === '.');
            const inL2 = t.id.startsWith(ancestorIds[2]) && (ancestorIds[2] === '' || t.id[ancestorIds[2].length] === '.');
            const onStrand = strandIds.has(t.id);
            return (
              <polygon
                key={t.id}
                data-id={t.id}
                className={`td__tile${isSel ? ' is-selected' : ''}${isNb ? ' is-neighbour' : ''}${inL1 ? ' in-parent' : inL2 ? ' in-grandparent' : ''}${onStrand ? ' on-strand' : ''}`}
                points={t.pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={tileColor(t.type)}
                onClick={() => { setSelected(t.id); }}
              >
                <title>{formatAddress(t.address)}</title>
              </polygon>
            );
          })}
          {strandLine && <polyline className="td__strand" points={strandLine} />}
          {tile.pts.map((p, e) => {
            const q = tile.pts[(e + 1) % 6];
            const m = edgeMid(tile, e);
            return (
              <g key={e} className={`td__edge${e === edge ? ' is-active' : ''}`} onClick={() => setEdge(e)}>
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
          {[
            `a ${name(tile.type)}`,
            ...tile.address.path.map((l) => `child ${l.slot} of a ${name(l.parent)}`),
          ].join(', ')}. The tiles sharing its parent are tinted, and the tiles sharing its grandparent more faintly.
        </p>
        <p className="td__aside">
          <strong>If you like linear algebra:</strong> an address is a digit string in a mixed-radix number system, like a
          clock reading hours, minutes and seconds, except that which digits are allowed in one position depends on the
          digit above it (a Gamma has no child 2). The whole infinite tiling is the set of infinite strings, and a finite
          patch is the set of strings with a fixed tail.
        </p>
      </section>

      <section id="crossing" className="td__section">
        <h2>2. Crossing an edge</h2>
        <p>
          Standing on the selected tile, which tile is across edge <strong>{edge}</strong>? The machine answers by reading
          the address from the bottom, like doing a sum with carries. Most of the time the edge is inside the parent’s
          expansion, so only the lowest digit changes. Sometimes the edge is on the parent’s outside, so the question
          is passed up a level (a carry), and the answer comes back down.
        </p>
        <ol className="td__trace" data-testid="td-trace">
          {crossing.trace.map((s, i) => (
            <li key={i} className={`td__trace-${s.kind}`}>{describe(s)}</li>
          ))}
        </ol>
        <p data-testid="td-result">
          {crossing.ok ? (
            <>Answer: across edge {edge} is <strong>{formatAddress(crossing.address)}</strong>, entered through its edge{' '}
              {crossing.edge}. The crossing was settled {crossing.level === 1 ? 'in the parent' : `${crossing.level} levels up`}. It is highlighted on the picture.</>
          ) : (
            <>No answer inside this patch: the edge is on the outside of the whole level-{level} supertile.</>
          )}
        </p>
        <details className="td__tables">
          <summary>The three tables it used</summary>
          <p>
            For each parent type: which pairs of child edges meet inside it, and for each of its six edges, the child
            edges that make it up in order. The last two columns of the trace are read straight off these. The tables
            were extracted from exact geometry once (<code>fass-theorem/01-tables.ts</code>) and are the same at every
            level, which is the whole reason an address can be worked on digit by digit.
          </p>
          <table>
            <thead><tr><th>parent</th><th>children 0..7</th><th>glued inside</th><th>edge j = pieces</th></tr></thead>
            <tbody>
              {HEX_TYPES.map((P) => (
                <tr key={P}>
                  <td>{name(P)}</td>
                  <td>{[0, 1, 2, 3, 4, 5, 6, 7].map((s) => { const c = childType(P, s); return c ? HEX_LETTER[c] : '·'; }).join(' ')}</td>
                  <td className="td__mono">{gluedText(P)}</td>
                  <td className="td__mono">{[0, 1, 2, 3, 4, 5].map((j) => `${j}: ${piecesText(P, j)}`).join('  ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="td__aside">
          <strong>Why it always ends:</strong> every edge of every supertile has a class, and an edge of class +c only
          ever meets an edge of class −c. Matching classes have the same number of pieces, so when the question comes
          back down a level, “piece i of n” on one side is “piece n−1−i of n” on the other. That reversal is the only
          arithmetic in the whole algorithm.
        </p>
      </section>

      <section id="transducer" className="td__section">
        <h2>3. The machine</h2>
        <p>
          The sum above reads the address upward and only writes the answer on the way back down. Tatham’s observation
          is that you can write the answer <em>while reading</em>, as long as you are allowed to hesitate: after a few
          symbols you often already know how the answer starts, whatever comes later. A machine that reads one symbol at
          a time, keeps a little memory, and writes output as soon as it is sure, is a <em>finite-state transducer</em>.
          He builds it like this: first a checker that reads two addresses side by side and says whether they are
          neighbours; then treat one of the two as the output rather than the input; then make it deterministic by
          letting each state remember every possibility still open, with the output it would have written for each,
          and emit only what all of them agree on.
        </p>
        <p data-testid="td-machine-facts">
          Built that way for the hexagons, the machine has <strong>{tr.states.length} states</strong>, and at no point does it hold back more
          than {Math.max(...tr.states.flatMap((s) => s.items.map((i) => i.pending.length)))} symbols of output: it never has to look more than two levels ahead.
        </p>
        <h3>Feeding it the selected tile</h3>
        <table className="td__run" data-testid="td-run">
          <thead><tr><th>reads</th><th>goes to state</th><th>writes</th><th>possibilities still open</th></tr></thead>
          <tbody>
            {run.steps.map((s, i) => (
              <tr key={i}>
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
            ? <>Output: <strong>{formatAddress(addressOfSymbols(run.output).address)}</strong> entered through edge {addressOfSymbols(run.output).edge}. Same answer as the sum above, {run.steps.length} symbols read, {run.output.length} written.</>
            : <>The machine has read the whole address and is still not done: the neighbour is outside this patch, and it is waiting for more symbols (a parent for the top supertile).</>}
        </p>
        <h3>Crossing an infinite wall</h3>
        <p>
          A tile whose address repeats for ever, say <em>Y 0Y 0Y 0Y …</em> (a Psi that is child 0 of a Psi that is child
          0 of a Psi …), is the corner of an infinitely large supertile. The sum above would never finish on it. The
          machine does not care: once it is in a state it has been in before at the same point of the repeat, it will
          repeat its output too. So an eventually periodic address has an eventually periodic neighbour, and we can
          cross a wall of infinite height.
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
          and here you can run it one step at a time on the addresses.
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

function gluedText(P: HexType): string {
  const out: string[] = [];
  for (let s = 0; s < 8; s++) {
    if (!childType(P, s)) continue;
    for (let e = 0; e < 6; e++) {
      const loc = locateChildEdge(P, s, e);
      if (loc.kind === 'inside' && (loc.s > s || (loc.s === s && loc.e > e))) out.push(`${s}.${e}=${loc.s}.${loc.e}`);
    }
  }
  return out.join(' ');
}
function piecesText(P: HexType, j: number): string {
  const parts: string[] = [];
  for (let s = 0; s < 8; s++) {
    if (!childType(P, s)) continue;
    for (let e = 0; e < 6; e++) {
      const loc = locateChildEdge(P, s, e);
      if (loc.kind === 'outside' && loc.j === j) parts[loc.i] = `${s}.${e}`;
    }
  }
  return `[${parts.join(' ')}] class ${edgeClass(P, j)}`;
}
function symText(s: Sym, first: boolean): string {
  const { type, n } = parseSym(s);
  return first ? `${HEX_LETTER[type]} edge ${n}` : `${n}${HEX_LETTER[type]}`;
}

export default TransducerPage;
