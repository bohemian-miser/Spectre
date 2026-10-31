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
import { runsUnder, tracePatch } from './line/strand';
import { stitched } from './line/stitch';
import '../styles/buildup.css';
import '../styles/period.css';
import '../styles/line.css';

const SUBSET = [1, 2, 8];
const COMBO = '010100000';
const DIGITS = [...COMBO].map(Number);
/** Levels of borders computed; the proof needs 0 to 3, the rest are shown as a check. */
const TOP = 5;
const REPO = 'https://github.com/bohemian-miser/Spectre/blob/main';
const FASS = `${REPO}/docs/FASS_THEOREM.md`;
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
          The proof rests on one comparison. A supertile seen from outside is its border: the crossings round its six edges, and which crossing a strand entering at each one leaves by. Two rounds of stitching take every type&rsquo;s level-1 border to its level-3 border, and the two are the same for all nine types. Everything else follows by induction: no circuit ever closes, and the Psi, a single line as a tile, stays a single line at every level, each one the middle of the next.
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
          The substitution rule, the glued pairs and the runs are the same at every level; that is read off exact geometry and proved for all levels in <a href={`${FASS}#2-the-substitution-tables`}>§2–3 of the FASS theorem</a>, where the induction also shows two glued edges carry their crossings in reverse order. So the rule takes level n&rsquo;s borders to level n + 1&rsquo;s whatever n is.
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

      <section className="ln-section" aria-labelledby="ln-circuits">
        <h2 id="ln-circuits">5. No circuit</h2>
        <Claim n={4} title="no circuit">
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
        <h2 id="ln-psi">6. A Psi supertile is one strand</h2>
        <Claim n={5} title="the Psi">
          At every level the chords of a Psi supertile&rsquo;s tiles form a single strand, from one crossing of its border to the other.
        </Claim>
        <p>
          The Psi has one crossing on edge 0 and one on edge 5 at every level: crossings per edge <code>{psiPerEdge[0]}</code> on the tile, <code>{psiPerEdge[1]}</code> at level 1, <code>{psiPerEdge[2]}</code> at level 2, and so at every level by Claim 3. Every chord of a tile in the supertile lies on a strand; inside the supertile that strand is finite, and it is not a circuit (Claim 4), so it runs from a border crossing to a border crossing. There are only two, so there is only one strand, and every chord is on it. The border computation counts the chords on that one route without looking at the tiles:
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
        <h2 id="ln-nest">7. A Psi child&rsquo;s strand is the middle of its parent&rsquo;s</h2>
        <Claim n={6} title="nesting">
          A Psi has Psi children in slots {list(children.slots)}. The strand of each is one unbroken stretch of the parent&rsquo;s strand, with at least one chord of the parent&rsquo;s strand before it and after it.
        </Claim>
        <p>
          The child&rsquo;s two crossings are on its edges 0 and 5 (Claim 5), and in each of these slots both edges are glued to siblings:{' '}
          {children.slots.map((s, i) => (
            <span key={s}>{i ? '; ' : ''}slot {s}: <code>{welds(s).map(([a, b]) => `${a.s}.${a.e}~${b.s}.${b.e}`).join(' ')}</code></span>
          ))}
          . So neither crossing of the child is on the parent&rsquo;s border. The parent&rsquo;s strand passes every chord of the child (Claim 5), so it enters the child; once in, it runs the child&rsquo;s whole strand and leaves by the other crossing into a sibling, where it carries on.
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
        <h2 id="ln-chain">8. A chain of Psi supertiles fills the plane</h2>
        <Claim n={7} title="the chain">
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
          So in the union of the chain every tile edge is shared by two tiles of the union. That the union is the whole plane, with no two tiles overlapping, is the covering argument of <a href={`${FASS}#4-non-overlap-and-exhaustion-the-covering-argument`}>§4 of the FASS theorem</a>: the supertiles form an increasing union of disks, each inside a later one, mapped into the plane by a local isometry, and such a map onto the plane is one to one and onto.
        </p>
      </section>

      <section className="ln-section" aria-labelledby="ln-line">
        <h2 id="ln-line">9. The line</h2>
        <p>
          Let A<sub>0</sub>, A<sub>1</sub>, A<sub>2</sub>, … be the strands of the chain&rsquo;s supertiles (Claim 5). By Claim 6 each is a stretch in the middle of the next, which adds at least one chord at each end, so together they make a curve with no end in either direction. Every tile of the plane is in some supertile of the chain (Claim 7), so each of its chords is on that supertile&rsquo;s strand and on the curve. So the curve is the only strand, and it passes every chord: a tile with two crossings once, a tile with four twice. It has no circuit to share the plane with (Claim 4).
        </p>
        <p>
          It never crosses itself. Each chord is a straight segment inside its tile, the hexagon tiles are convex and do not overlap, and the two chords of a four-crossing tile join crossings that do not interleave, so they do not meet. The details are <a href={FASS}>§6 of the FASS theorem</a>.
        </p>
      </section>

      <section className="ln-section" aria-labelledby="ln-rests">
        <h2 id="ln-rests">What the proof rests on</h2>
        <table className="bu-summary-table ln-table ln-rests">
          <thead><tr><th>Statement</th><th>From</th></tr></thead>
          <tbody>
            <tr><td>The substitution rule, glued pairs and runs are the same at every level; glued edges weld their crossings in reverse order</td><td><a href={`${FASS}#3-the-induction`}>FASS theorem §2–3</a>, machine-checked in <a href={`${REPO}/lean/README.md`}>Lean</a></td></tr>
            <tr><td>Every type&rsquo;s border at the tiles and at levels 1, 2 and 3; no circuit closing at levels 1 to 3</td><td>Computed on this page; tested against strands welded from the tiles</td></tr>
            <tr><td>Psi children in slots {list(children.slots)} have both crossings welded</td><td>The glued pairs, on this page</td></tr>
            <tr><td>The chain {chain.word.join(', ')} buries each supertile {chain.depth} levels up</td><td>The runs, on this page</td></tr>
            <tr><td>The chain fills the plane and its tiles do not overlap</td><td><a href={`${FASS}#4-non-overlap-and-exhaustion-the-covering-argument`}>FASS theorem §4</a></td></tr>
            <tr><td>Chords of different tiles meet only at shared crossings</td><td><a href={FASS}>FASS theorem §6</a></td></tr>
          </tbody>
        </table>
        <p className="bu-muted">
          The same argument, written as tables, is in <a href={`${REPO}/docs/EVERY_OTHER_LEVEL.md`}>The line of rule 128 from its borders</a>. In Lean, <code>routing_all_levels</code> in <a href={`${REPO}/lean/FASS/Hex.lean`}>the hexagon configuration</a> proves Claims 3 to 5 the same way: the level-1 routing comes back after two steps, so there is no circuit and one Psi route at every level.
        </p>
      </section>
    </article>
  );
}
