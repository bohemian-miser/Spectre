/**
 * Harmonics: the circuits of a combination that are the same circuit two
 * levels up. Every circuit born up to the level chosen is read at every
 * level (`harmonics/readings.ts`: the supertiles its strand runs through,
 * backtracks across a seam cancelled). A circuit born two levels above
 * another, through the same children, that reads at level k + 2 as the
 * other reads at level k from level 2 up is its harmonic; harmonics link
 * into chains (`harmonics/chains.ts`). The circuits are listed by family
 * (the children of the birth supertile they run through), each family's
 * chains one row each.
 *
 * A chosen chain is drawn whole over its supertiles, every member two
 * levels above the one before, one slider stepping them together
 * (`harmonics/ChainViews.tsx`), and expanded supertile by supertile with the
 * members side by side (`harmonics/ChainExplorer.tsx`). The chosen circuit's
 * readings are lined up with the member below it, or with any circuit
 * chosen by hand. Any circuit opens in the Explorer's infinite view. The
 * address can name the combination and the level to read to
 * (`?rule=023468&combo=140000001&level=7`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TileTypeId } from '../core';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { explorerCircuitHref } from './shapes/explorerLink';
import { CircuitGlyph as Glyph, describeCircuit } from './compare/CompareView';
import { ReadingsTable } from './compare/ReadingsTable';
import { compareHref } from './compare/refs';
import { ChainExplorer } from './harmonics/ChainExplorer';
import { ChainSupertiles, FamilyList, short } from './harmonics/ChainViews';
import { createHarmonicsClient, type CircuitInfo, type Comparison, type HarmonicsResult } from './harmonics/harmonicsJob';
import '../styles/shapes.css';
import '../styles/harmonics.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '000100000', level: 6 };

/** The rule, combination and level asked for in the address (`?rule=023468&combo=140000001&level=7`), else the default. */
function fromAddress(): ComboChoice {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const rule = q.get('rule') ?? '023468', combo = q.get('combo'), level = Number(q.get('level'));
  if (!combo || !/^\d+$/.test(rule) || !/^[0-9a-z]{9}$/.test(combo)) return DEFAULT;
  return { subset: [...rule].map(Number), combo, level: Number.isInteger(level) && level >= 2 && level <= 12 ? level : DEFAULT.level };
}

function explorerHref(base: string, choice: ComboChoice, c: CircuitInfo): string {
  return explorerCircuitHref(base, {
    family: 'hex',
    subset: choice.subset,
    combo: choice.combo,
    type: c.type as TileTypeId,
    level: c.level,
    path: c.first.path.map(([type, pos]) => ({ type: type as TileTypeId, pos })),
    chord: [
      { x: c.first.chord[0], y: c.first.chord[1] },
      { x: c.first.chord[2], y: c.first.chord[3] },
    ],
  });
}

const describe = describeCircuit;

export default function HarmonicsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const client = useRef(createHarmonicsClient({ forceSync: props.forceSync }));
  const [choice, setChoice] = useState<ComboChoice>(fromAddress);
  const [result, setResult] = useState<HarmonicsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  /** The circuit to line the picked one up with, chosen by hand; otherwise the member of its chain below it. */
  const [partnerChoice, setPartnerChoice] = useState<number | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);

  const live = useRef(0);
  /** Runs a request against the engine; the newest request wins. */
  const run = (go: () => Promise<HarmonicsResult>, pick: boolean): void => {
    const n = ++live.current;
    setBusy(true);
    setError(null);
    go()
      .then((r) => {
        if (n !== live.current) return;
        setResult(r);
        setComparison(null);
        if (pick) {
          setPicked(r.circuits.length ? r.circuits.length - 1 : null);
          setPartnerChoice(null);
        }
      })
      .catch((e: unknown) => n === live.current && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => n === live.current && setBusy(false));
  };
  useEffect(() => {
    run(() => client.current.start({ family: 'hex', ...choice }), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);
  useEffect(() => () => client.current.dispose(), []);

  const chainOf = useMemo(() => {
    const m = new Map<number, number>();
    result?.chains.forEach((ch, q) => ch.members.forEach((i) => m.set(i, q)));
    return m;
  }, [result]);
  const newAt = useMemo(() => {
    if (!result) return [];
    const harmonic = new Set(result.links.map((l) => l.b));
    const levels = [...new Set(result.circuits.map((c) => c.level))].sort((a, b) => a - b);
    return levels.map((l) => ({ level: l, born: result.circuits.filter((c) => c.level === l).length, fresh: result.circuits.filter((c, i) => c.level === l && !harmonic.has(i)).length }));
  }, [result]);
  const picking = picked !== null && result ? result.circuits[picked] : null;
  const chain = picked !== null && result ? result.chains[chainOf.get(picked) ?? -1] ?? null : null;
  const below = chain && picked !== null ? chain.members[chain.members.indexOf(picked) - 1] ?? null : null;
  const above = chain && picked !== null ? chain.members[chain.members.indexOf(picked) + 1] ?? null : null;
  /** The circuit lined up with the picked one: chosen, else the member below it in its chain, else the one above. */
  const partner = partnerChoice !== null && result && partnerChoice < result.circuits.length && partnerChoice !== picked ? partnerChoice : below ?? above ?? null;
  const other = partner !== null && result ? result.circuits[partner] : null;
  const extras = result && picked !== null && below !== null && partner === below ? result.extras[`${below}-${picked}`] : undefined;
  const compareKey = result && picked !== null && partner !== null ? `${result.level}/${partner}/${picked}` : null;
  useEffect(() => {
    if (!compareKey || picked === null || partner === null) return;
    let on = true;
    client.current
      .compare(partner, picked)
      .then((c) => on && setComparison(c))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareKey]);
  const comparing = comparison && picked !== null && partner !== null && comparison.a === partner && comparison.b === picked ? comparison : null;
  const inChains = result ? result.chains.filter((ch) => ch.members.length > 1) : [];
  const pick = (i: number) => {
    setPicked(i);
    setPartnerChoice(null);
  };

  return (
    <div className="shapes-page harm-page">
      <h1>Harmonics</h1>
      <p className="shapes-note">
        A circuit read at level k is the sequence of level-k supertiles its strand runs through (type, slot in its parent, parent type), with back-and-forth
        crossings of a seam cancelled. A circuit born two levels above another, through the same children of its birth supertile, that reads at level k + 2
        as the other reads at level k, from level 2 up, is its harmonic: the same circuit with every tile grown into a level-2 supertile, up to back-and-forth
        runs across seams at the lowest levels. Harmonics link into chains. Every circuit of the combination born up to the level chosen is read from the
        renormalisation, so nothing is traced tile by tile; the renormalisation can be taken one level further at a time, as far as the machine allows.
      </p>
      <ComboPicker busy={busy} onAdd={(c) => { setChoice(c); setPicked(null); setPartnerChoice(null); }} levels="any" verb="Read" initialLevel={choice.level} initialCombo={choice.combo} initialRule={choice.subset.join('')} />
      {error ? <p className="shapes-note">Could not compute: {error}</p> : null}
      {busy && !result ? <p className="shapes-note">Computing…</p> : null}
      {result ? (
        <>
          <section>
            <h2>
              Families and chains of {choice.subset.join('')} · {choice.combo} to level {result.level}
            </h2>
            <div className="shapes-controls">
              <button type="button" disabled={busy} onClick={() => run(() => client.current.next(), false)} data-testid="harm-next">
                {busy ? 'Computing…' : `Next level (${result.level + 1})`}
              </button>
              <span className="shapes-note">
                Level {result.level} took {result.seconds < 1 ? 'under a second' : `${result.seconds.toFixed(0)} s`}; each level costs about four times the last, and
                there is no limit.
              </span>
            </div>
            <p className="shapes-note" data-testid="harm-summary">
              {nf(result.circuits.length)} distinct circuits in {nf(new Set(result.chains.map((c) => c.family)).size)} families; {nf(inChains.length)} chains of
              two or more. {newAt.map((n) => `Level ${n.level}: ${n.born} born, ${n.fresh} new`).join('; ')}.
            </p>
            <p className="shapes-note">
              A <strong>family</strong> is every circuit through the same children of its birth supertile. A <strong>chain</strong> is circuits linked as
              harmonics, each two levels above the one before, in one row with the growth at each step. A dashed chip before a chain is a circuit two levels
              below its lowest member that reads the same at the top levels only. Circuits of a family in no chain with the others are listed apart, with how
              many top levels they agree at with the nearest member two levels away.
            </p>
            <FamilyList r={result} picked={picked} onPick={pick} />
          </section>
          {picking && chain ? (
            <section data-testid="harm-detail">
              <h2>
                {chain.members.length > 1
                  ? `A chain of family ${chain.family}: ${chain.members.map((m) => short(result.circuits[m])).join(' → ')}`
                  : `${nf(picking.length)} tiles at level ${picking.level}, in no chain`}
              </h2>
              <div className="harm-chain-glyphs">
                {chain.members.map((m) => {
                  const c = result.circuits[m];
                  return (
                    <figure key={m} className={m === picked ? 'is-picked' : ''}>
                      <button type="button" className="harm-glyph-pick" onClick={() => pick(m)} title={`Line up the ${nf(c.length)} with its neighbours`}>
                        <Glyph circuit={c} size={140} colour={m === picked ? 'var(--g1)' : 'var(--muted)'} label={describe(c)} />
                      </button>
                      <figcaption>
                        {describe(c)}; drawn at level {c.drawnFrom}. <a href={explorerHref(base, choice, c)}>Explorer</a>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              <ChainSupertiles client={client.current} level={result.level} members={chain.members} circuits={result.circuits} />
              <h3>Readings</h3>
              <div className="harm-compare">
                <label>
                  The {nf(picking.length)} lined up with{' '}
                  <select value={partner ?? ''} onChange={(e) => setPartnerChoice(e.target.value === '' ? null : Number(e.target.value))} data-testid="harm-partner">
                    <option value="">nothing</option>
                    {result.circuits.map((c, i) =>
                      i === picked ? null : (
                        <option key={i} value={i}>
                          {short(c)}
                          {below === i ? ' (below it in its chain)' : above === i ? ' (above it in its chain)' : ''}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                {other ? (
                  <span className="shapes-note">
                    Level k + {picking.level - other.level} of the {nf(picking.length)} against level k of the {nf(other.length)}; tokens the other reading does not
                    share are outlined.{' '}
                    <a
                      href={compareHref(base, { subset: choice.subset, combo: choice.combo, level: other.level, length: other.length }, { subset: choice.subset, combo: choice.combo, level: picking.level, length: picking.length })}
                      data-testid="harm-compare-link"
                    >
                      Open in Compare
                    </a>
                    , with the Fourier terms.
                  </span>
                ) : null}
              </div>
              <ReadingsTable b={picking} a={other} rows={comparing?.rows ?? null} nameA="of the other" />
              {extras ? (
                <p className="shapes-note" data-testid="harm-extras">
                  At level 2 the {nf(picking.length)} has {nf(extras.runs.length)} extra runs of visits and misses {nf(extras.unmatched)} of the {nf(other!.length)}&apos;s tiles:{' '}
                  {[...new Map(extras.runs.map((run) => [run.join(' '), 0])).keys()].map((run) => `[${run}]`).join(' ')}.
                  {extras.unmatched === 0 ? ' Every extra run is a loop out of one supertile and back into it, round a point where three supertiles meet.' : ''}
                </p>
              ) : null}
              <ChainExplorer client={client.current} level={result.level} members={chain.members} circuits={result.circuits} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
