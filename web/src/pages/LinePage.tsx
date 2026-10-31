/**
 * The infinite line: rule 128, combination 010100000 on the hexagon tiles.
 * The proof is shown more than told: every level-3 supertile has its
 * level-1 supertile's numbered crossings, joined the same way (`LabelsAnim`),
 * so a level-5 supertile is stitched from its level-3 pieces exactly as a
 * level-3 one is from its level-1 pieces (`StitchAnim`), and so on up. The
 * borders come from `period/period.ts`, the strands drawn from the tiles
 * themselves (`line/strand.ts`).
 */
import { useMemo, useState } from 'react';
import { HEX_TYPES, gluedPairs } from '../core';
import { usePrefersDark } from '../hooks/usePrefersDark';
import { PAPER_URL } from '../lib/siteNav';
import { CircuitShapes } from './shapes/circuitShapes';
import { onBorder, run, sameBorder } from './period/period';
import { lineOf } from './period/proof';
import { LabelsAnim, StitchAnim } from './line/Anims';
import { PatchFigure, along, alongColours } from './line/figures';
import { recipes, sameRecipes } from './line/recipe';
import { pairsRound, runsUnder, tracePatch } from './line/strand';
import '../styles/buildup.css';
import '../styles/period.css';
import '../styles/line.css';

const SUBSET = [1, 2, 8];
const COMBO = '010100000';
const DIGITS = [...COMBO].map(Number);
/** Levels of borders computed; the proof needs 0 to 3, the rest are a check. */
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

export default function LinePage(): JSX.Element {
  const dark = usePrefersDark();
  const r = useMemo(() => run(SUBSET, DIGITS, TOP), []);
  const line = useMemo(() => lineOf(r), [r]);
  const cs = useMemo(() => new CircuitShapes('hex', SUBSET, DIGITS, 3, 1, true), []);

  const [heroLevel, setHeroLevel] = useState(3);
  const hero = useMemo(() => tracePatch(SUBSET, DIGITS, heroLevel, 'Psi'), [heroLevel]);
  const heroColour = useMemo(() => alongColours(hero), [hero]);

  const recipesRepeat = useMemo(() => {
    const at = (n: number) => recipes(r.states, n, 2);
    return sameRecipes(at(1), at(3)) && sameRecipes(at(1), at(5)) && sameRecipes(at(2), at(4));
  }, [r]);

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

  const repeats = HEX_TYPES.every((t) => sameBorder(r.states[1][t], r.states[3][t]));
  const circuits = r.circuits.slice(1, 4).reduce((a, c) => a + HEX_TYPES.reduce((s, t) => s + c[t], 0), 0);
  const fourCrossings = HEX_TYPES.filter((t) => r.states[0][t].mate.length === 4);
  const chain = line.chain!;
  const rotations = chain.word.map((_, i) => [...chain.word.slice(i), ...chain.word.slice(0, i)]);
  const welded = (s: number) => gluedPairs('Psi').filter(([a, b]) => (a.s === s && (a.e === 0 || a.e === 5)) || (b.s === s && (b.e === 0 || b.e === 5))).length === 2;

  return (
    <article className="bu-page pd-page ln-page">
      <header className="bu-head ln-head">
        <h1>The infinite line</h1>
        <p className="ln-theorem">
          With rule <code>128</code> and combination <code>{COMBO}</code>, the hexagon tiling has exactly one strand. It never closes, never crosses itself, has no end in either direction, and passes through every tile.
        </p>
      </header>

      <figure className="ln-figure" data-testid="ln-hero">
        <Chips name="Level" value={heroLevel} options={[1, 2, 3, 4]} label={(n) => `Level ${n}`} onPick={setHeroLevel} />
        <PatchFigure patch={hero} label={`The level-${heroLevel} Psi supertile and its strand`} colour={heroColour} className="ln-svg ln-hero" />
        <figcaption>
          The level-{heroLevel} Psi: {nf(hero.tiles.length)} tiles, {hero.strands.length === 1 ? 'one strand' : `${hero.strands.length} strands`}, coloured from <span style={{ color: along(0) }}>one end</span> to <span style={{ color: along(1) }}>the other</span>.
        </figcaption>
      </figure>

      <section className="ln-section" aria-labelledby="ln-labels">
        <h2 id="ln-labels">1. Level 3 has level 1&rsquo;s labels</h2>
        <p>
          Number the crossings round a supertile&rsquo;s edge. Each strand inside joins two of them. Every level-3 supertile has the same numbers, joined in the same pairs, as the level-1 supertile of its type.
        </p>
        <LabelsAnim cs={cs} states={r.states} subset={SUBSET} digits={DIGITS} dark={dark} />
        <details className="ln-details">
          <summary>The pairs for all nine types {repeats ? '(level 3 = level 1)' : ''}</summary>
          <div className="ln-scroll">
            <table className="bu-summary-table ln-table" data-testid="ln-repeat-table">
              <thead><tr><th>Type</th><th>Crossings per edge</th><th>Level 1</th><th>Level 3</th></tr></thead>
              <tbody>
                {HEX_TYPES.map((t) => (
                  <tr key={t}>
                    <th>{t}</th>
                    <td><code>{r.states[1][t].perEdge.join(' ')}</code></td>
                    <td><code>{routesOf(r.states[1][t].mate)}</code></td>
                    <td className={sameBorder(r.states[1][t], r.states[3][t]) ? 'ln-same' : ''}><code>{routesOf(r.states[3][t].mate)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="ln-section" aria-labelledby="ln-stitch">
        <h2 id="ln-stitch">2. So the stitching repeats</h2>
        <p>
          A supertile is its children stitched together the same way at every level. So level 5, stitched from level-3 pieces, is level 3 stitched from level-1 pieces with bigger pieces: the same welds, and every route passes the same pieces in the same order{recipesRepeat ? '' : ' (not found here)'}. Level 5 therefore has level 3&rsquo;s labels, which are level 1&rsquo;s, and so on up every odd level; the even levels repeat level 2 the same way.
        </p>
        <StitchAnim cs={cs} states={r.states} subset={SUBSET} digits={DIGITS} dark={dark} />
      </section>

      <section className="ln-section" aria-labelledby="ln-psi">
        <h2 id="ln-psi">3. No circuit, and the Psi is one strand</h2>
        <p>
          A circuit would close as a loop through some supertile&rsquo;s pieces, decided by the pieces&rsquo; labels, and those are the tiles&rsquo;, level 1&rsquo;s or level 2&rsquo;s. {circuits === 0 ? 'None closes at levels 1 to 3, so none ever does.' : `${circuits} close at levels 1 to 3.`} The Psi has two crossings at every level, so its tiles carry one strand from one to the other:
        </p>
        <table className="bu-summary-table ln-table" data-testid="ln-psi-table">
          <thead><tr><th>Level</th><th className="num">Tiles</th><th className="num">Chords</th><th className="num">On the one strand</th></tr></thead>
          <tbody>
            {line.levels.slice(0, 6).map((l) => (
              <tr key={l.level}><td>{l.level}</td><td className="num">{nf(l.tiles)}</td><td className="num">{nf(l.chords)}</td><td className="num">{nf(l.onRoute)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ln-section" aria-labelledby="ln-nest">
        <h2 id="ln-nest">4. Each Psi strand is the middle of the next</h2>
        <p>
          A Psi has Psi children in slots {list(children.slots)}, {children.slots.every(welded) ? 'both of whose crossings are welded to siblings' : 'not all welded inside'}, so each child&rsquo;s strand is one stretch in the middle of its parent&rsquo;s.
        </p>
        <figure className="ln-figure" data-testid="ln-nest-fig">
          <PatchFigure
            patch={children.patch}
            label="The level-3 Psi with the strands of its Psi children coloured"
            colour={(c) => { const k = children.slotOf.get(c); return k === undefined ? null : SLOT_COLOURS[k]; }}
            className="ln-svg ln-hero"
          />
          <figcaption>
            {children.slots.map((s, k) => (
              <span key={s}>{k ? ', ' : ''}<span style={{ color: SLOT_COLOURS[k] }}>slot {s}</span>: chords {children.runs[k].map((x) => `${x.start + 1}–${x.end}`).join(', ')}</span>
            ))}{' '}
            of the parent&rsquo;s {nf(children.strand.chords.length)}.
          </figcaption>
        </figure>
        <p>
          Nest each Psi in the next at slots {chain.word.join(', ')}, {chain.word.join(', ')}, … and each is clear of the edge of the one {chain.depth} levels up. The table shows which of its edges still lie on the edge of the supertile k levels up. So the chain leaves no tile edge exposed; its union is open and closed in the plane, so it is the whole plane, and the strands, each the middle of the next, join into one line through every tile.
        </p>
        <table className="bu-summary-table ln-table" data-testid="ln-chain-table">
          <thead><tr><th>Slots</th>{Array.from({ length: chain.depth + 1 }, (_, k) => <th key={k} className="num">k = {k}</th>)}</tr></thead>
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
      </section>

      <section className="ln-section" aria-labelledby="ln-cross">
        <h2 id="ln-cross">5. It never crosses itself</h2>
        <p>
          Each chord joins the midpoints of two edges of a regular hexagon, and the tiles do not overlap. The two chords of a four-crossing tile join crossings that do not interleave round it:
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
        <p className="bu-muted">
          The tiling, its substitution and the fact that its tiles do not overlap are from <a href={PAPER_URL}>Smith, Myers, Kaplan and Goodman-Strauss</a>; everything else on this page is computed as it loads.
        </p>
      </section>
    </article>
  );
}
