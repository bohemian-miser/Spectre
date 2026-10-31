/**
 * The infinite line: rule 128, combination 010100000 on the hexagon tiles,
 * proved one step at a time. Each step is a statement, its proof, and the
 * computed object it rests on: the borders of every type level by level
 * (`period/period.ts`), the strands welded from the tiles themselves
 * (`line/strand.ts`), and a supertile drawn as its pieces two levels down
 * (`line/stitch.ts`).
 */
import { useMemo, useState } from 'react';
import { HEX_TYPES, childType, edgeParts, gluedPairs, type HexType } from '../core';
import { CircuitShapes } from './shapes/circuitShapes';
import { compose, onBorder, run, sameBorder } from './period/period';
import { lineOf } from './period/proof';
import { graphOf } from './period/scene';
import { StateGrid, StraightBorder } from './period/StateGrid';
import { PatchFigure, StitchFigure, along, alongColours, routeIndexOf } from './line/figures';
import { pairsRound, runsUnder, tracePatch } from './line/strand';
import { PAPER_URL } from '../lib/siteNav';
import { stitched } from './line/stitch';
import { chordsThrough, recipes, sameRecipes } from './line/recipe';
import { tileColor } from '../lib/palette';
import '../styles/buildup.css';
import '../styles/period.css';
import '../styles/line.css';

const SUBSET = [1, 2, 8];
const COMBO = '010100000';
const DIGITS = [...COMBO].map(Number);
/** Levels of borders computed; the proof needs 0 to 3, the rest are shown as a check. */
const TOP = 7;
const SLOT_COLOURS = ['var(--pd-r0)', 'var(--pd-r1)', 'var(--pd-r2)'];

const nf = (n: number) => n.toLocaleString('en-US');
const routesOf = (mate: Int32Array): string =>
  Array.from(mate).flatMap((q, p) => (q > p ? [`${p}–${q}`] : [])).join('  ');
const list = (xs: readonly (string | number)[]): string =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

function Chips<T extends string | number>(props: { value: T; options: readonly T[]; label: (x: T) => string; onPick: (x: T) => void; name: string }): JSX.Element {
  return (
    <div className="pd-chips" role="group" aria-label={props.name}>
      {props.options.map((x) => (
        <button key={x} type="button" aria-pressed={x === props.value} className={x === props.value ? 'is-active' : ''} onClick={() => props.onPick(x)}>
          {props.label(x)}
        </button>
      ))}
    </div>
  );
}

function Claim(props: { n: number; title: string; children: React.ReactNode }): JSX.Element {
  return (
    <p className="ln-claim">
      <strong>Claim {props.n}</strong> ({props.title}). {props.children}
    </p>
  );
}

export default function LinePage(): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const r = useMemo(() => run(SUBSET, DIGITS, TOP), []);
  const line = useMemo(() => lineOf(r), [r]);
  const cs = useMemo(() => new CircuitShapes('hex', SUBSET, DIGITS, 3, 1, true), []);
  const tiles = useMemo(() => HEX_TYPES.map((t) => tracePatch(SUBSET, DIGITS, 0, t)), []);

  const [heroLevel, setHeroLevel] = useState(3);
  const hero = useMemo(() => tracePatch(SUBSET, DIGITS, heroLevel, 'Psi'), [heroLevel]);
  const heroColour = useMemo(() => alongColours(hero), [hero]);

  const [borderType, setBorderType] = useState<HexType>('Delta');
  const borderFig = useMemo(() => {
    const patch = tracePatch(SUBSET, DIGITS, 1, borderType);
    const g = graphOf(cs, 1, borderType, r.states[1][borderType]);
    const route = routeIndexOf(patch, g.dots, g.routes);
    return { patch, g, route };
  }, [borderType, cs, r]);

  const [stitchType, setStitchType] = useState<HexType>('Delta');
  const stitch = useMemo(() => stitched(cs, r.states, 1, 2, stitchType), [cs, r, stitchType]);

  const rec = useMemo(() => {
    const at = (n: number) => recipes(r.states, n, 2);
    const odd = [at(1), at(3), at(5)], even = [at(2), at(4)];
    const counted = [1, 3, 5].every((n) => HEX_TYPES.every((t) => at(n)[t].every((x) => chordsThrough(r.states, n, x) === r.states[n + 2][t].chords[x.from])));
    return { r13: odd[0], repeats: sameRecipes(odd[0], odd[1]) && sameRecipes(odd[0], odd[2]), evenRepeats: sameRecipes(even[0], even[1]), counted };
  }, [r]);
  const [recType, setRecType] = useState<HexType>('Psi');
  const [recRoute, setRecRoute] = useState(0);
  const [recUse, setRecUse] = useState<number | null>(null);
  const recipe = rec.r13[recType][Math.min(recRoute, rec.r13[recType].length - 1)];
  const lit = useMemo(() => new Set(recipe.uses.map((u) => u.piece)), [recipe]);
  const stitch5 = useMemo(() => stitched(cs, r.states, 3, 2, recType), [cs, r, recType]);
  const stitch3 = useMemo(() => stitched(cs, r.states, 1, 2, recType), [cs, r, recType]);
  const symbols = HEX_TYPES.reduce((a, t) => a + rec.r13[t].length, 0);
  const psiInPsi = rec.r13.Psi[0].uses.filter((u) => u.type === 'Psi');
  const use = recUse === null ? null : recipe.uses[recUse] ?? null;

  const children = useMemo(() => {
    const patch = tracePatch(SUBSET, DIGITS, 3, 'Psi');
    const strand = patch.strands[0];
    const slots = line.slots.map((s) => s.slot);
    const slotOf = new Map<number, number>();
    patch.chords.forEach((c, i) => {
      const k = slots.indexOf(Number(patch.tiles[c.tile].id.split('.')[0]));
      if (k >= 0) slotOf.set(i, k);
    });
    return { patch, strand, slots, slotOf, runs: slots.map((s) => runsUnder(patch, strand, String(s))) };
  }, [line]);

  const psiStep = useMemo(() => compose(r.states[1], 'Psi'), [r]);
  const fourCrossings = HEX_TYPES.filter((t) => r.states[0][t].mate.length === 4);
  const twoCrossings = HEX_TYPES.filter((t) => r.states[0][t].mate.length === 2);
  const repeats = HEX_TYPES.every((t) => sameBorder(r.states[1][t], r.states[3][t]));
  const circuitsAt = (n: number) => HEX_TYPES.reduce((a, t) => a + r.circuits[n][t], 0);
  const psiPerEdge = [0, 1, 2].map((n) => r.states[n].Psi.perEdge.join(' '));
  const chain = line.chain!;
  const rotations = chain.word.map((_, i) => [...chain.word.slice(i), ...chain.word.slice(0, i)]);
  const welds = (s: number) => gluedPairs('Psi').filter(([a, b]) => (a.s === s && (a.e === 0 || a.e === 5)) || (b.s === s && (b.e === 0 || b.e === 5)));

  return (
    <article className="bu-page pd-page ln-page">
      <header className="bu-head ln-head">
        <h1>The infinite line</h1>
        <p>
          Rule <code>128</code> puts one crossing on every seam of class 1, 2 or 8 of the hexagon tiles, and combination <code>{COMBO}</code> joins each tile&rsquo;s crossings in pairs. Under them the strands of the whole tiling are a single line.
        </p>
      </header>

      <section className="ln-section" aria-labelledby="ln-thm">
        <h2 id="ln-thm">The theorem</h2>
        <p className="ln-theorem">
          In the hexagon tiling filled by a chain of nested Psi supertiles, with rule <code>128</code> and combination <code>{COMBO}</code>, there is exactly one strand. It never closes, never crosses itself, has no end in either direction, and passes through every tile: once through each tile with two crossings and twice through each with four.
        </p>
        <p>
          The proof rests on one comparison. A supertile seen from outside is its border: the crossings round its six edges, and which crossing a strand entering at each one leaves by. Two rounds of stitching take every type&rsquo;s level-1 border to its level-3 border, and the two are the same for all nine types. So each route two levels up is made of routes below by a fixed recipe, the same recipe at every odd level, and the strands of the whole tiling are that recipe applied over and over. Everything else follows by induction: no circuit ever closes, and the Psi, a single line as a tile, stays a single line at every level, each one the middle of the next.
        </p>
        <figure className="ln-figure" data-testid="ln-hero">
          <Chips name="Level" value={heroLevel} options={[1, 2, 3, 4]} label={(n) => `Level ${n}`} onPick={setHeroLevel} />
          <PatchFigure patch={hero} label={`The level-${heroLevel} Psi supertile and its strand`} colour={heroColour} className="ln-svg ln-hero" />
          <figcaption>
            The level-{heroLevel} Psi supertile: {nf(hero.tiles.length)} tiles, {nf(hero.chords.length)} chords, {hero.strands.length === 1 ? 'one strand' : `${hero.strands.length} strands`}, coloured from <span style={{ color: along(0) }}>one end</span> to <span style={{ color: along(1) }}>the other</span>. Welded here from the tiles themselves, independently of the borders below.
          </figcaption>
        </figure>
      </section>

      <section className="ln-section" aria-labelledby="ln-tiles">
        <h2 id="ln-tiles">1. Tiles and chords</h2>
        <p>
          The tiles are the nine hexagon types of the Spectre tiling, drawn as regular hexagons, and the tiling is built by substitution as in <a href={PAPER_URL}>Smith, Myers, Kaplan and Goodman-Strauss</a>. A supertile of each type is made of supertiles one level down, and the substitution says the same three things at every level: which type sits in each of its eight slots, which pairs of child edges meet inside it, and which run of child edges makes up each of its six edges. Those tables, and the fact that the tiles do not overlap, are all the proof takes from the tiling.
        </p>
        <p>
          Each tile has a crossing on every edge whose seam is of class 1, 2 or 8: four on {list(fourCrossings)}, two on {list(twoCrossings)}. The combination joins them in pairs by straight chords inside the tile, and on a four-crossing tile it never joins two crossings that interleave round the tile, so its two chords do not meet. Where two tiles share an edge their crossings coincide, so the chords join up into strands.
        </p>
        <div className="ln-tile-row" data-testid="ln-tiles">
          {HEX_TYPES.map((t, i) => (
            <figure key={t} className="ln-tile-fig">
              <PatchFigure patch={tiles[i]} label={`${t} and its chords`} colour={() => 'var(--text)'} dots={tiles[i].chords.flatMap((c) => [{ p: c.a }, { p: c.b }])} width={2} />
              <figcaption>{t}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="ln-section" aria-labelledby="ln-border">
        <h2 id="ln-border">2. The border of a supertile</h2>
        <p>
          The border of a supertile is how many crossings sit on each of its six edges, numbered 0, 1, 2, … in order round edges 0 to 5, and for each crossing the crossing a strand entering there leaves by. A strand that enters always leaves again: every crossing inside the supertile belongs to two tiles and every tile pairs all its crossings, so the strand cannot stop inside, and it cannot come back to where it entered. So the second half of the border pairs the crossings off; each pair is a <em>route</em>. Two supertiles have the same border when they have the same number of crossings on each edge and the same routes.
        </p>
        <figure className="ln-figure" data-testid="ln-border-fig">
          <Chips name="Type" value={borderType} options={HEX_TYPES} label={(t) => t} onPick={setBorderType} />
          <div className="ln-pair">
            <PatchFigure
              patch={borderFig.patch}
              label={`${borderType} at level 1, its strands coloured by route`}
              colour={(c) => { const i = borderFig.route.get(c); return i === undefined ? null : `var(--pd-r${i % 8})`; }}
              dots={borderFig.g.dots.map((p, i) => ({ p, text: String(i) }))}
            />
            <StraightBorder b={r.states[1][borderType]} label={`${borderType}'s level-1 border, drawn straight`} />
          </div>
          <figcaption>
            Left: the level-1 {borderType} supertile, its strands welded from its {borderFig.patch.tiles.length} tiles and coloured by route, its border crossings numbered. Right: the same border drawn straight, the crossings spaced evenly round a regular hexagon. Crossings per edge <code>{r.states[1][borderType].perEdge.join(' ')}</code>, routes <code>{routesOf(r.states[1][borderType].mate)}</code>.
          </figcaption>
        </figure>
      </section>

      <section className="ln-section" aria-labelledby="ln-step">
        <h2 id="ln-step">3. Each level from the one below</h2>
        <Claim n={1} title="one step">
          The borders of all nine types at level n + 1 are computed from their borders at level n by one rule, the same at every level.
        </Claim>
        <p>
          A level-(n + 1) supertile of type P is its children in slots 0 to 7, of the types P&rsquo;s substitution rule gives. Two more tables say how they fit: the pairs of child edges glued inside P, and, for each edge of P, the run of child edges it is made of. Gluing two child edges welds their crossings one to one in reverse order. To find a route of P, start at a crossing of P&rsquo;s border, which is a crossing of some child; follow that child&rsquo;s route to its other end; if that crossing is on P&rsquo;s border, stop; otherwise it is welded to a crossing of a sibling, so continue there. Each walk uses only the children&rsquo;s borders. A walk through children that never reaches P&rsquo;s border is a circuit, and it is the only way a circuit can close at level n + 1.
        </p>
        <p>
          The three tables are the substitution itself, so they are the same at every level. Two glued child edges are one curve in the tiling, run counter-clockwise by each child and so in opposite directions; the crossings on it are the same points for both, met in reverse order. So the rule takes level n&rsquo;s borders to level n + 1&rsquo;s whatever n is.
        </p>
        <details className="ln-details">
          <summary>The Psi&rsquo;s tables, and its level-2 route walked through its level-1 children</summary>
          <table className="bu-summary-table ln-table">
            <thead><tr><th>Slot</th>{[0, 1, 2, 3, 4, 5, 6, 7].map((s) => <th key={s} className="num">{s}</th>)}</tr></thead>
            <tbody><tr><th>Child</th>{[0, 1, 2, 3, 4, 5, 6, 7].map((s) => <td key={s} className="num">{childType('Psi', s) ?? '—'}</td>)}</tr></tbody>
          </table>
          <p>Glued child edges, as slot.edge:</p>
          <pre className="ln-pre">{gluedPairs('Psi').map(([a, b]) => `${a.s}.${a.e}~${b.s}.${b.e}`).join('  ')}</pre>
          <p>Each edge of the Psi as its run of child edges:</p>
          <pre className="ln-pre">{[0, 1, 2, 3, 4, 5].map((j) => `edge ${j}: ${edgeParts('Psi', j).map((c) => `${c.s}.${c.e}`).join(' ')}`).join('\n')}</pre>
          <p>
            The level-2 Psi&rsquo;s one route, from border crossing {psiStep.routes[0].from} to {psiStep.routes[0].to}, as the child crossings it enters, each written (slot, crossing of that child&rsquo;s level-1 border):
          </p>
          <pre className="ln-pre" data-testid="ln-psi-walk">{psiStep.routes[0].enters.map((c) => `(${c.slot}, ${c.pos})`).join(' ')}</pre>
        </details>
      </section>

      <section className="ln-section" aria-labelledby="ln-repeat">
        <h2 id="ln-repeat">4. Level 3 has level 1&rsquo;s borders</h2>
        <Claim n={2} title="two rounds of stitching">
          For every type, the border at level 3 is the border at level 1.
        </Claim>
        <p>
          The rule of Claim 1 applied to the tiles gives level 1, then level 2, then level 3. The grid shows every type&rsquo;s border at each, drawn straight; a level whose borders all equal an earlier level&rsquo;s is outlined.{' '}
          {repeats ? 'Level 3 matches level 1 type for type. Level 2 differs, and the tiles differ from everything above them: a tile has at most one crossing per edge.' : 'Level 3 does not match level 1.'}
        </p>
        <StateGrid states={r.states.slice(0, 4)} />
        <div className="ln-scroll">
          <table className="bu-summary-table ln-table" data-testid="ln-repeat-table">
            <thead>
              <tr><th>Type</th><th>Crossings per edge</th><th>Routes at level 1</th><th>Routes at level 2</th><th>Routes at level 3</th></tr>
            </thead>
            <tbody>
              {HEX_TYPES.map((t) => (
                <tr key={t}>
                  <th>{t}</th>
                  <td><code>{r.states[1][t].perEdge.join(' ')}</code></td>
                  <td><code>{routesOf(r.states[1][t].mate)}</code></td>
                  <td><code>{routesOf(r.states[2][t].mate)}</code></td>
                  <td className={sameBorder(r.states[1][t], r.states[3][t]) ? 'ln-same' : ''}><code>{routesOf(r.states[3][t].mate)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <figure className="ln-figure" data-testid="ln-stitch">
          <Chips name="Type" value={stitchType} options={HEX_TYPES} label={(t) => t} onPick={setStitchType} />
          <div className="ln-trio">
            <div><StraightBorder b={r.states[1][stitchType]} label={`${stitchType} at level 1`} /><span>Level 1</span></div>
            <StitchFigure s={stitch} label={`${stitchType} at level 3 as its level-1 pieces`} />
            <div><StraightBorder b={r.states[3][stitchType]} label={`${stitchType} at level 3`} /><span>Level 3</span></div>
          </div>
          <figcaption>
            The level-3 {stitchType} as its {stitch.pieces.length} level-1 pieces, each a copy of a level-1 supertile with its routes in grey. Each coloured line is one route of the level-3 {stitchType}, walked through the pieces&rsquo; routes and welds. Routes are coloured in order of their first crossing, so equal borders are coloured alike: each joins the same two crossings as the route of its colour in the level-1 border on the left. {stitch.circuits === 0 ? 'No walk through the pieces closes.' : `${stitch.circuits} walks through the pieces close.`} The <a href={`${base}period.html`}>Every other level</a> page animates the same stitching.
          </figcaption>
        </figure>
        <Claim n={3} title="every other level">
          For every n &ge; 1 the borders at level n + 2 are the borders at level n. So every odd level has level 1&rsquo;s borders, and every even level from 2 on has level 2&rsquo;s.
        </Claim>
        <p>
          By induction on n. For n = 1 it is Claim 2. If level n + 2 has level n&rsquo;s borders, the rule of Claim 1 applied to equal borders gives equal borders, so level n + 3 has level n + 1&rsquo;s.
        </p>
      </section>

      <section className="ln-section" aria-labelledby="ln-recipe">
        <h2 id="ln-recipe">5. Routes made of routes</h2>
        <p>
          A route of a level-3 supertile, walked through its level-1 pieces, takes one whole route of each piece it passes and then crosses a weld into the next piece. The list of those piece routes, in order, is the route&rsquo;s <em>recipe</em>: for each step, the piece&rsquo;s slot path below the supertile, its type, and the crossings of its border it is entered at and left by. The nine types have {symbols} routes between them at odd levels, so there are {symbols} recipes.
        </p>
        <Claim n={4} title="the recipe repeats">
          For every odd n, each route of a level-(n + 2) supertile is walked through its level-n pieces by the same recipe as the same route at level 3 through level 1: the same pieces, the same route of each, in the same order. At even n the recipe is that of level 4 through level 2.
        </Claim>
        <p>
          The walk reads nothing but the substitution tables and the borders of the pieces. At odd n the pieces have level 1&rsquo;s borders (Claim 3), so each step of the walk is the step taken at level 3; at even n they have level 2&rsquo;s. Computed directly, the recipes from level 3 to 5 and from 5 to 7 {rec.repeats ? 'are' : 'are not'} those from 1 to 3, and those from 4 to 6 {rec.evenRepeats ? 'are' : 'are not'} those from 2 to 4.
        </p>
        <figure className="ln-figure" data-testid="ln-recipe-fig">
          <Chips name="Type" value={recType} options={HEX_TYPES} label={(t) => t} onPick={(t) => { setRecType(t); setRecRoute(0); setRecUse(null); }} />
          <Chips name="Route" value={recRoute} options={rec.r13[recType].map((_, i) => i)} label={(i) => `${rec.r13[recType][i].from}–${rec.r13[recType][i].to}`} onPick={(i) => { setRecRoute(i); setRecUse(null); }} />
          <div className="ln-twin">
            <div><StitchFigure s={stitch3} label={`${recType} at level 3 as its level-1 pieces, route ${recipe.from}–${recipe.to}`} focus={recRoute} lit={lit} mark={use?.piece ?? null} /><span>Level 3, from level-1 pieces</span></div>
            <div><StitchFigure s={stitch5} label={`${recType} at level 5 as its level-3 pieces, route ${recipe.from}–${recipe.to}`} focus={recRoute} lit={lit} mark={use?.piece ?? null} /><span>Level 5, from level-3 pieces</span></div>
          </div>
          <div className="ln-barcode" role="group" aria-label={`The recipe of ${recType} ${recipe.from}–${recipe.to}`} data-testid="ln-barcode">
            {recipe.uses.map((u, i) => (
              <button
                key={i}
                type="button"
                title={`${i + 1}. ${u.path.join('.')}: ${u.type} ${u.enter}→${u.leave}`}
                aria-label={`Step ${i + 1}: piece ${u.path.join('.')}, ${u.type}, ${u.enter} to ${u.leave}`}
                className={`${u.type === recType ? 'is-same' : ''}${i === recUse ? ' is-on' : ''}`}
                style={{ background: tileColor(u.type) }}
                onMouseEnter={() => setRecUse(i)}
                onFocus={() => setRecUse(i)}
                onClick={() => setRecUse(i)}
              />
            ))}
          </div>
          <p className="ln-use" data-testid="ln-use">
            {use
              ? <>Step {recUse! + 1} of {recipe.uses.length}: piece <code>{use.path.join('.')}</code>, a {use.type}, entered at {use.enter} and left by {use.leave}. That route has {nf(r.states[1][use.type].chords[use.enter])} chords at level 1 and {nf(r.states[3][use.type].chords[use.enter])} at level 3.</>
              : <>{recType} {recipe.from}–{recipe.to}: {recipe.uses.length} steps through {lit.size} of the {stitch3.pieces.length} pieces.</>}
          </p>
          <figcaption>
            The recipe of {recType} {recipe.from}–{recipe.to}, one cell per step in order, coloured by the piece&rsquo;s type; cells outlined in black are pieces of the same type as the supertile. Hover over or tap a cell to mark its piece in both drawings. On the left the pieces are level-1 supertiles, on the right level-3 supertiles: the route takes the same pieces in the same order, and only the pieces have grown.
          </figcaption>
        </figure>
        <p>
          So a route at level 2k + 1 is its recipe applied k times, ending in level-1 routes, and a level-1 route is a run of tile chords: one finite table gives every route at every odd level. The Psi&rsquo;s own recipe passes {psiInPsi.length} Psi pieces and takes each one&rsquo;s route whole, entered at {psiInPsi[0]?.enter} and left by {psiInPsi[0]?.leave}; Claim 7 below is this fact, one level at a time.
        </p>
        <p>
          Counting chords through the recipes gives each route&rsquo;s length two levels up from the lengths below. The borders, computed level by level from scratch, give {rec.counted ? 'the same counts' : 'different counts'} at levels 3, 5 and 7:
        </p>
        <div className="ln-scroll">
          <table className="bu-summary-table ln-table" data-testid="ln-recipe-table">
            <thead><tr><th>Route</th><th className="num">Steps</th>{[1, 3, 5, 7].map((n) => <th key={n} className="num">Chords at level {n}</th>)}</tr></thead>
            <tbody>
              {HEX_TYPES.flatMap((t) => rec.r13[t].map((x) => (
                <tr key={`${t}${x.from}`}>
                  <td>{t} {x.from}–{x.to}</td>
                  <td className="num">{x.uses.length}</td>
                  {[1, 3, 5, 7].map((n) => <td key={n} className="num">{nf(r.states[n][t].chords[x.from])}</td>)}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ln-section" aria-labelledby="ln-circuits">
        <h2 id="ln-circuits">6. No circuit</h2>
        <Claim n={5} title="no circuit">
          No supertile, of any type at any level, contains a circuit.
        </Claim>
        <p>
          Take a circuit inside a supertile, and the lowest-level supertile containing it, at level k. A single tile contains none, so k &ge; 1, and the circuit is not inside any one child: it closes at level k. By Claim 1 that is decided by the type and the borders at level k &minus; 1, which by Claim 3 are the tiles&rsquo; (k = 1), level 1&rsquo;s (k odd) or level 2&rsquo;s (k even). So the circuits closing at any level are the ones closing at level 1, 2 or 3, and there are none:
        </p>
        <table className="bu-summary-table ln-table" data-testid="ln-circuits-table">
          <thead><tr><th>Level</th>{r.circuits.slice(1).map((_, i) => <th key={i} className="num">{i + 1}</th>)}</tr></thead>
          <tbody><tr><th>Circuits closing, all nine types</th>{r.circuits.slice(1).map((_, i) => <td key={i} className="num">{circuitsAt(i + 1)}</td>)}</tr></tbody>
        </table>
        <p className="bu-muted">Levels 4 and 5 are computed as a check; the proof uses levels 1 to 3.</p>
      </section>

      <section className="ln-section" aria-labelledby="ln-psi">
        <h2 id="ln-psi">7. A Psi supertile is one strand</h2>
        <Claim n={6} title="the Psi">
          At every level the chords of a Psi supertile&rsquo;s tiles form a single strand, from one crossing of its border to the other.
        </Claim>
        <p>
          The Psi has one crossing on edge 0 and one on edge 5 at every level: crossings per edge <code>{psiPerEdge[0]}</code> on the tile, <code>{psiPerEdge[1]}</code> at level 1, <code>{psiPerEdge[2]}</code> at level 2, and so at every level by Claim 3. Every chord of a tile in the supertile lies on a strand; inside the supertile that strand is finite, and it is not a circuit (Claim 5), so it runs from a border crossing to a border crossing. There are only two, so there is only one strand, and every chord is on it. The border computation counts the chords on that one route without looking at the tiles:
        </p>
        <table className="bu-summary-table ln-table" data-testid="ln-psi-table">
          <thead><tr><th>Level</th><th className="num">Tiles</th><th className="num">Chords of the tiles</th><th className="num">Chords on the route</th></tr></thead>
          <tbody>
            {line.levels.map((l) => (
              <tr key={l.level}><td>{l.level}</td><td className="num">{nf(l.tiles)}</td><td className="num">{nf(l.chords)}</td><td className="num">{nf(l.onRoute)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ln-section" aria-labelledby="ln-nest">
        <h2 id="ln-nest">8. A Psi child&rsquo;s strand is the middle of its parent&rsquo;s</h2>
        <Claim n={7} title="nesting">
          A Psi has Psi children in slots {list(children.slots)}. The strand of each is one unbroken stretch of the parent&rsquo;s strand, with at least one chord of the parent&rsquo;s strand before it and after it.
        </Claim>
        <p>
          The child&rsquo;s two crossings are on its edges 0 and 5 (Claim 6), and in each of these slots both edges are glued to siblings:{' '}
          {children.slots.map((s, i) => (
            <span key={s}>{i ? '; ' : ''}slot {s}: <code>{welds(s).map(([a, b]) => `${a.s}.${a.e}~${b.s}.${b.e}`).join(' ')}</code></span>
          ))}
          . So neither crossing of the child is on the parent&rsquo;s border. The parent&rsquo;s strand passes every chord of the child (Claim 6), so it enters the child; once in, it runs the child&rsquo;s whole strand and leaves by the other crossing into a sibling, where it carries on.
        </p>
        <figure className="ln-figure" data-testid="ln-nest-fig">
          <PatchFigure
            patch={children.patch}
            label="The level-3 Psi with the strands of its Psi children coloured"
            colour={(c) => { const k = children.slotOf.get(c); return k === undefined ? null : SLOT_COLOURS[k]; }}
            className="ln-svg ln-hero"
          />
          <figcaption>
            The level-3 Psi, with the chords of its Psi children coloured by slot:{' '}
            {children.slots.map((s, k) => (
              <span key={s}>{k ? ', ' : ''}<span style={{ color: SLOT_COLOURS[k] }}>slot {s}</span></span>
            ))}
            . Along the parent&rsquo;s strand of {nf(children.strand.chords.length)} chords, numbered from one end:
          </figcaption>
          <table className="bu-summary-table ln-table" data-testid="ln-nest-table">
            <thead><tr><th>Slot</th><th className="num">Stretches</th><th>Chords of the parent&rsquo;s strand</th></tr></thead>
            <tbody>
              {children.slots.map((s, k) => (
                <tr key={s}>
                  <td>{s}</td>
                  <td className="num">{children.runs[k].length}</td>
                  <td>{children.runs[k].map((x) => `${x.start + 1} to ${x.end}`).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </section>

      <section className="ln-section" aria-labelledby="ln-chain">
        <h2 id="ln-chain">9. A chain of Psi supertiles fills the plane</h2>
        <Claim n={8} title="the chain">
          Put each Psi supertile in the next at slots {chain.word.join(', ')}, {chain.word.join(', ')}, … in turn. Each supertile of the chain lies inside the one {chain.depth} levels above it, away from its border.
        </Claim>
        <p>
          An edge of a child is on its parent&rsquo;s border only where the parent&rsquo;s run of child edges includes it. Starting from all six edges of one supertile of the chain and keeping, a level at a time, the parent edges whose run includes a kept edge, gives the edges still on the border of each supertile above. They run out by {chain.depth} levels up whichever slot the chain starts at:
        </p>
        <table className="bu-summary-table ln-table" data-testid="ln-chain-table">
          <thead><tr><th>Slots in turn</th>{Array.from({ length: chain.depth + 1 }, (_, k) => <th key={k} className="num">{k} up</th>)}</tr></thead>
          <tbody>
            {rotations.map((w) => (
              <tr key={w.join('')}>
                <td>{w.join(', ')}, …</td>
                {Array.from({ length: chain.depth + 1 }, (_, k) => {
                  const e = onBorder('Psi', w, k);
                  return <td key={k} className="num">{e.length ? e.join(' ') : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          So in the union of the chain every tile edge is shared by two tiles of the union: an edge inside a supertile of the chain is shared there, and an edge on its border is inside the supertile {chain.depth} levels up. Every tile of the union is in some supertile of the chain.
        </p>
        <p>
          The union is the whole plane. At a vertex of a tile in the union, the tiles meeting there follow one another round the vertex across shared edges, and crossing an edge of a tile in the union lands in the union; so every tile at the vertex is in the union, and every point of a tile in the union has a neighbourhood inside it. The union is therefore open. It is also closed, since its tiles are congruent hexagons that do not overlap, so only finitely many of them meet any disk. The plane is connected, so the union is all of it.
        </p>
      </section>

      <section className="ln-section" aria-labelledby="ln-line">
        <h2 id="ln-line">10. The line</h2>
        <p>
          Let A<sub>0</sub>, A<sub>1</sub>, A<sub>2</sub>, … be the strands of the chain&rsquo;s supertiles (Claim 6). By Claim 7 each is a stretch in the middle of the next, which adds at least one chord at each end, so together they make a curve with no end in either direction. Every tile of the plane is in some supertile of the chain (Claim 8), so each of its chords is on that supertile&rsquo;s strand and on the curve. So the curve is the only strand, and it passes every chord: a tile with two crossings once, a tile with four twice.
        </p>
        <p>
          It never crosses itself. Each crossing is the midpoint of a tile edge, so each chord joins the midpoints of two different edges of a regular hexagon and, apart from its ends, lies inside its tile. The tiles do not overlap, so chords of different tiles can meet only at their ends, and each end is a crossing where exactly two chords meet, one after the other along the line. The two chords of a four-crossing tile join crossings that do not interleave round the tile, numbered in order round its edges:
        </p>
        <table className="bu-summary-table ln-table" data-testid="ln-pairs-table">
          <thead><tr><th>Type</th><th>Chords</th><th>Interleave</th></tr></thead>
          <tbody>
            {fourCrossings.map((t) => {
              const x = pairsRound(r.states[0][t].mate);
              return <tr key={t}><td>{t}</td><td><code>{x.pairs.map(([a, b]) => `${a}–${b}`).join('  ')}</code></td><td>{x.interleave ? 'yes' : 'no'}</td></tr>;
            })}
          </tbody>
        </table>
        <p>
          Two segments joining points round a convex polygon meet only if their ends interleave, so these chords are apart.
        </p>
      </section>

      <section className="ln-section" aria-labelledby="ln-rests">
        <h2 id="ln-rests">What the proof rests on</h2>
        <table className="bu-summary-table ln-table ln-rests">
          <thead><tr><th>Statement</th><th>From</th></tr></thead>
          <tbody>
            <tr><td>The substitution: the child in each slot, the glued pairs and the runs, the same at every level; its tiles do not overlap</td><td>The tiling, <a href={PAPER_URL}>Smith, Myers, Kaplan and Goodman-Strauss</a></td></tr>
            <tr><td>Every type&rsquo;s border at the tiles and at levels 1, 2 and 3; no circuit closing at levels 1 to 3</td><td>Computed on this page</td></tr>
            <tr><td>Psi children in slots {list(children.slots)} have both crossings welded</td><td>The glued pairs, on this page</td></tr>
            <tr><td>The chain {chain.word.join(', ')} buries each supertile {chain.depth} levels up</td><td>The runs, on this page</td></tr>
            <tr><td>No four-crossing tile joins interleaved crossings</td><td>The combination, on this page</td></tr>
          </tbody>
        </table>
      </section>
    </article>
  );
}
