/**
 * Every other level: a combination's borders compared level by level. A
 * type's border at a level (its crossings round the supertile and which
 * one a strand entering at each leaves by) is made from the borders one
 * level down by a rule that does not depend on the level (`period/period.ts`),
 * so once two levels' borders agree, every level after repeats them. The
 * page finds where that happens, animates a supertile built from the
 * pieces two levels down coming out as the same border, and, where the
 * Psi's border is one route, lays out why that route grows into one line
 * through the whole tiling (`period/proof.ts`).
 */
import { useMemo, useState } from 'react';
import { HEX_TYPES } from '../core';
import { usePrefersDark } from '../hooks/usePrefersDark';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { Animation } from './period/Animation';
import { run } from './period/period';
import { isLine, lineOf, repeatOf } from './period/proof';
import { StateGrid } from './period/StateGrid';
import '../styles/shapes.css';
import '../styles/buildup.css';
import '../styles/period.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [1, 2, 8], combo: '010100000', level: 7 };
const REPO = 'https://github.com/bohemian-miser/Spectre/blob/main';

const levelName = (n: number) => (n === 0 ? 'the tiles' : `level ${n}`);

export default function PeriodPage(): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const dark = usePrefersDark();
  const [choice, setChoice] = useState<ComboChoice>(DEFAULT);
  const { computed, error } = useMemo(() => {
    try {
      const digits = [...choice.combo].map((c) => parseInt(c, 36));
      const r = run(choice.subset, digits, choice.level);
      const cs = new CircuitShapes('hex', choice.subset, digits, Math.min(2, r.states.length - 1), 1, true);
      return { computed: { r, cs, rep: repeatOf(r), line: lineOf(r) }, error: null };
    } catch (e) {
      return { computed: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [choice]);
  const label = `${choice.subset.join('')} · ${choice.combo}`;

  return (
    <div className="bu-page pd-page">
      <header className="bu-head">
        <h1>Every other level</h1>
        <p>
          From outside, a supertile is its border: the crossings round its six edges, and which crossing a strand entering at each one leaves by. Every type&rsquo;s border at the next level is made from the borders at this one by the same rule at every level, so as soon as two levels have the same borders, all the levels after them repeat.
        </p>
      </header>

      <ComboPicker key={label} busy={false} onAdd={setChoice} levels="any" verb="Compare" initialLevel={choice.level} initialCombo={choice.combo} initialRule={choice.subset.join('')} />
      {error && <p className="bu-error">{error}</p>}

      {computed && (
        <>
          <section className="bu-section" aria-labelledby="pd-grid-h">
            <h2 id="pd-grid-h">Every border, level by level</h2>
            <p className="bu-muted" data-testid="pd-summary">
              {label}:{' '}
              {computed.rep
                ? <>the borders at level {computed.rep.start + computed.rep.length} are the borders at {levelName(computed.rep.start)}, so they repeat every {computed.rep.length === 1 ? 'level' : `${computed.rep.length} levels`} from {levelName(computed.rep.start)} on.</>
                : <>no two of levels 0 to {computed.r.states.length - 1} have the same borders.</>}
              {' '}Each border is drawn straight, its crossings spaced evenly along the six edges of a hexagon and its routes coloured in the order of their first crossing.
            </p>
            <StateGrid states={computed.r.states} />
          </section>

          <section className="bu-section" aria-labelledby="pd-anim-h">
            <h2 id="pd-anim-h">Each level built from the one below</h2>
            <p className="bu-muted">
              The nine supertiles of a level in a row, each with its border. Copies of them are carried down into the nine supertiles of the next level, turned and mirrored into the slots each type&rsquo;s substitution rule gives; each new supertile&rsquo;s routes are walked through its pieces and pulled tight into its own border. Then the new row moves up and builds the next. Routes are coloured in the order of their first crossing, so a row with the same borders as an earlier one is coloured the same way round.
            </p>
            <Animation key={label} cs={computed.cs} states={computed.r.states} start={computed.rep?.start ?? 1} length={computed.rep?.length ?? null} dark={dark} />
          </section>

          <Argument computed={computed} base={base} onLine={() => setChoice(DEFAULT)} />
        </>
      )}
    </div>
  );
}

function Argument(props: { computed: { r: ReturnType<typeof run>; rep: ReturnType<typeof repeatOf>; line: ReturnType<typeof lineOf> }; base: string; onLine: () => void }): JSX.Element {
  const { r, rep, line } = props.computed;
  const top = r.states.length - 1;
  const firstCircuit = r.circuits.findIndex((c) => HEX_TYPES.some((t) => c[t] > 0));
  const showsLine = isLine(r, line);
  return (
    <section className="bu-section pd-argument" aria-labelledby="pd-arg-h" data-testid="pd-argument">
      <h2 id="pd-arg-h">{rep ? 'Why the borders repeat at every level' : 'One step from level to level'}</h2>
      <ol>
        <li>
          A level-(n + 1) supertile&rsquo;s border is made from its children&rsquo;s level-n borders: the children are the types its substitution rule puts in its eight slots, each pair of child edges glued inside it welds their crossings in reverse order, and each of its six edges is a run of child edges, each run backwards. The rule, the glued pairs and the runs are the same at every level (the tables of the <a href={`${props.base}transducer.html`}>Neighbour machine</a>), so one step takes every type&rsquo;s border at level n to every type&rsquo;s border at level n + 1.
        </li>
        {rep ? (
          <>
            <li data-testid="pd-step-repeat">
              The borders at level {rep.start + rep.length} are the borders at {levelName(rep.start)}, type for type. The step applied to equal borders gives equal borders, so the borders at level n + {rep.length} are those at level n for every n from {rep.start} on.
            </li>
            <li data-testid="pd-step-circuits">
              A circuit closing at level n + 1 is a closed walk through the children&rsquo;s routes and welds, so which circuits close in each type at level n + 1 is decided by the level-n borders.{' '}
              {rep.circuits.every((c) => c === 0)
                ? <>None closes at levels 1 to {rep.start + rep.length}, which covers every border from {levelName(0)} to level {rep.start + rep.length - 1}; so no circuit closes at any level.</>
                : <>Circuits first close at level {firstCircuit}, and from level {rep.start + 1} on the same number closes in each type every {rep.length === 1 ? 'level' : `${rep.length} levels`}.</>}
            </li>
          </>
        ) : (
          <li>No two of levels 0 to {top} have the same borders.</li>
        )}
      </ol>

      <h2>The infinite line</h2>
      {showsLine ? (
        <ol>
          <li data-testid="pd-line-route">
            A Psi supertile has two crossings at every level, joined by one route. No circuit closes, so every chord of every tile of a Psi is on a strand that reaches its border, and there is only the one: the route passes every chord of every tile.
            <table className="bu-summary-table pd-line-table">
              <thead><tr><th>Level</th><th className="num">Tiles</th><th className="num">Chords of the tiles</th><th className="num">Chords on the route</th></tr></thead>
              <tbody>
                {line.levels.map((l) => (
                  <tr key={l.level}><td>{l.level}</td><td className="num">{nf(l.tiles)}</td><td className="num">{nf(l.chords)}</td><td className="num">{nf(l.onRoute)}</td></tr>
                ))}
              </tbody>
            </table>
          </li>
          <li data-testid="pd-line-slots">
            A Psi has Psi children in slots {line.slots.map((s) => s.slot).join(', ')}.{' '}
            {line.slots.filter((s) => s.welded).length === line.slots.length ? 'In every one' : `In slot${line.slots.filter((s) => s.welded).length === 1 ? '' : 's'} ${line.slots.filter((s) => s.welded).map((s) => s.slot).join(', ')}`}, both of the child&rsquo;s crossings are welded to siblings at every level. A strand that enters such a child runs its whole route and carries on out of the other end, so the child&rsquo;s route is the middle of its parent&rsquo;s, with more of the parent&rsquo;s route before it and after it.
          </li>
          <li data-testid="pd-line-chain">
            Put each Psi in the next at slots {line.chain!.word.join(', ')} in turn. An edge of a child stays on its parent&rsquo;s border only through the parent edges made of it, and following the edges that stay, every Psi of the chain is clear of the border of the Psi {line.chain!.depth} levels up, whichever slot of the word it starts at. So the chain&rsquo;s supertiles cover a tiling in which every tile edge is glued, and their routes, each the middle of the next, join into one line, unending both ways, through every tile of it. That tiling is the whole plane by the covering argument of <a href={`${REPO}/docs/FASS_THEOREM.md#4-non-overlap-and-exhaustion-the-covering-argument`}>the FASS theorem</a>.
          </li>
          <li>
            Each chord stays inside its tile, a convex hexagon, and the tiles do not overlap, so the line never crosses itself. The argument for rule 128 is written out, with its tables, in <a href={`${REPO}/docs/EVERY_OTHER_LEVEL.md`}>the line from its borders</a>.
          </li>
        </ol>
      ) : (
        <p className="bu-muted" data-testid="pd-no-line">
          {!rep ? 'The borders do not repeat by the last level built.'
            : !rep.circuits.every((c) => c === 0) ? 'Circuits close, so not every tile is on a route.'
              : !line.crossings.every((c) => c === 2) ? `The Psi has ${[...new Set(line.crossings)].join(' or ')} crossings, not one route.`
                : !line.everyTypeHasChord ? 'Some tile type has no chord, so the strands miss it.'
                  : 'No chain of Psi supertiles at the slots whose crossings are welded buries each one.'}
          {' '}The Psi&rsquo;s route is one line through the plane for{' '}
          <button type="button" className="pd-link" onClick={props.onLine}>rule {DEFAULT.subset.join('')}, combination {DEFAULT.combo}</button>.
        </p>
      )}
    </section>
  );
}
