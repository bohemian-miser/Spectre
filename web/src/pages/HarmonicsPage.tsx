/**
 * Harmonics: the circuits of a combination that are the same circuit two
 * levels up. Every circuit born up to the level chosen is read at every
 * level (`harmonics/readings.ts`: the supertiles its strand runs through,
 * backtracks across a seam cancelled); a circuit whose reading at level
 * k + 2 is another's at level k, at every level, is that circuit's harmonic.
 * The lineages are listed as chains, with the near-lineages (pairs that read
 * the same at their top levels and differ below) beside them. A chosen
 * circuit is lined up with its fundamental, or with any other circuit, level
 * by level, with the tokens the two do not share marked; where they differ
 * at the tiles, the harmonic's extra visits are listed. The two are drawn side
 * by side over their supertiles at a chosen level (`harmonics/PairViews.tsx`)
 * and expanded from their birth supertiles level by level. Any circuit opens in
 * the Explorer's infinite view.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TileTypeId } from '../core';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { explorerCircuitHref } from './shapes/explorerLink';
import { CircuitGlyph as Glyph, describeCircuit } from './compare/CompareView';
import { ReadingsTable } from './compare/ReadingsTable';
import { PairExpansion, PairSupertiles } from './harmonics/PairViews';
import { compareHref } from './compare/refs';
import { createHarmonicsClient, sameCyclic, type CircuitInfo, type Comparison, type HarmonicsResult } from './harmonics/harmonicsJob';
import '../styles/shapes.css';
import '../styles/harmonics.css';

const nf = (n: number) => n.toLocaleString('en-US');
const LEVELS = [4, 5, 6, 7, 8, 9, 10];
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '000100000', level: 6 };

interface Chain {
  readonly members: readonly number[];
}

/** Each circuit's fundamental (the circuit it is a harmonic of), when it has one: the lineage with most levels agreeing, then the longest. */
function fundamentals(r: HarmonicsResult): Map<number, number> {
  const best = new Map<number, { a: number; score: number }>();
  for (const l of r.lineages) {
    const score = l.levels.filter(Boolean).length * 1e6 + r.circuits[l.a].length;
    const cur = best.get(l.b);
    if (!cur || score > cur.score) best.set(l.b, { a: l.a, score });
  }
  return new Map([...best].map(([b, { a }]) => [b, a]));
}

/** The lineages as chains, from each fundamental up through its harmonics, longest fundamental first. */
function chainsOf(r: HarmonicsResult, fund: Map<number, number>): Chain[] {
  const next = new Map<number, number>();
  for (const [b, a] of fund) if (!next.has(a) || r.circuits[next.get(a)!].length < r.circuits[b].length) next.set(a, b);
  const chains: Chain[] = [];
  r.circuits.forEach((_, i) => {
    if (fund.has(i)) return;
    const members = [i];
    for (let at = next.get(i); at !== undefined && !members.includes(at); at = next.get(at)) members.push(at);
    chains.push({ members });
  });
  return chains.sort((x, y) => y.members.length - x.members.length || r.circuits[y.members[0]].length - r.circuits[x.members[0]].length);
}

/** A near-lineage: B, two levels above A and not its harmonic, reads as A at its top `top` levels (at least two). */
interface Near {
  readonly a: number;
  readonly b: number;
  readonly top: number;
}

/** Near-lineages among the circuits that have no fundamental: compared at A's top two levels only, which are short. */
function nearLineages(r: HarmonicsResult, fund: Map<number, number>): Near[] {
  const out: Near[] = [];
  r.circuits.forEach((b, bi) => {
    if (fund.has(bi)) return;
    let best: Near | null = null;
    r.circuits.forEach((a, ai) => {
      if (a.level + 2 !== b.level || a.level < 2) return;
      let top = 0;
      for (let k = a.level - 1; k >= 0; k--) {
        const ra = a.readings.find((x) => x.level === k);
        const rb = b.readings.find((x) => x.level === k + 2);
        if (!ra || !rb || ra.tokens.length > 4000 || !sameCyclic(ra.tokens, rb.tokens)) break;
        top++;
      }
      if (top >= 2 && (!best || top > best.top || (top === best.top && a.length > r.circuits[best.a].length))) best = { a: ai, b: bi, top };
    });
    if (best) out.push(best);
  });
  return out;
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
const short = (c: CircuitInfo) => `${nf(c.length)} L${c.level}`;

export default function HarmonicsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const client = useRef(createHarmonicsClient({ forceSync: props.forceSync }));
  const [choice, setChoice] = useState<ComboChoice>(DEFAULT);
  const [result, setResult] = useState<HarmonicsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  /** The circuit to line the picked one up with, chosen by hand; otherwise its fundamental or nearest. */
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

  const fund = useMemo(() => (result ? fundamentals(result) : new Map<number, number>()), [result]);
  const chains = useMemo(() => (result ? chainsOf(result, fund) : []), [result, fund]);
  const near = useMemo(() => (result ? nearLineages(result, fund) : []), [result, fund]);
  /** Circuits by the child slots of their birth supertile, in order of level: the families of the Circuits page. */
  const families = useMemo(() => {
    if (!result) return [];
    const by = new Map<string, number[]>();
    result.circuits.forEach((c, i) => (by.get(c.family) ?? by.set(c.family, []).get(c.family)!).push(i));
    return [...by.entries()]
      .map(([family, members]) => ({ family, members: members.sort((x, y) => result.circuits[x].level - result.circuits[y].level || result.circuits[x].length - result.circuits[y].length) }))
      .filter((f) => f.members.length > 1)
      .sort((x, y) => y.members.length - x.members.length);
  }, [result]);
  const lineageOf = (b: number) => result?.lineages.find((l) => l.b === b && l.a === fund.get(b)) ?? null;
  const newAt = useMemo(() => {
    if (!result) return [];
    const levels = [...new Set(result.circuits.map((c) => c.level))].sort((a, b) => a - b);
    return levels.map((l) => ({ level: l, born: result.circuits.filter((c) => c.level === l).length, fresh: result.circuits.filter((c, i) => c.level === l && !fund.has(i)).length }));
  }, [result, fund]);
  const picking = picked !== null && result ? result.circuits[picked] : null;
  const fundOf = picked !== null && fund.has(picked) ? fund.get(picked)! : null;
  const nearOf = picked !== null ? near.find((n) => n.b === picked) ?? null : null;
  /** The circuit lined up with the picked one: chosen, else its fundamental, else its nearest. */
  const partner = partnerChoice !== null && result && partnerChoice < result.circuits.length && partnerChoice !== picked ? partnerChoice : fundOf ?? nearOf?.a ?? null;
  const other = partner !== null && result ? result.circuits[partner] : null;
  const lineage = picked !== null ? lineageOf(picked) : null;
  const extras = result && picked !== null && fundOf !== null ? result.extras[`${fundOf}-${picked}`] : undefined;
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

  return (
    <div className="shapes-page harm-page">
      <h1>Harmonics</h1>
      <p className="shapes-note">
        A circuit read at level k is the sequence of level-k supertiles its strand runs through (type, slot in its parent, parent type), with back-and-forth
        crossings of a seam cancelled. A circuit born two levels above another that reads at level k + 2 as the other reads at level k, at every level, is its
        harmonic: the same circuit with every tile grown into a level-2 supertile. Every circuit of the combination born up to the level chosen is read from
        the renormalisation, so nothing is traced tile by tile; the renormalisation can be taken one level further at a time, as far as the machine allows.
      </p>
      <ComboPicker busy={busy} onAdd={(c) => { setChoice(c); setPicked(null); setPartnerChoice(null); }} levels={LEVELS} verb="Read" initialLevel={DEFAULT.level} initialCombo={DEFAULT.combo} />
      {error ? <p className="shapes-note">Could not compute: {error}</p> : null}
      {busy && !result ? <p className="shapes-note">Computing…</p> : null}
      {result ? (
        <>
          <section>
            <h2>
              Lineages of {choice.subset.join('')} · {choice.combo} to level {result.level}
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
              {nf(result.circuits.length)} distinct circuits in {nf(chains.length)} lineages
              {chains.some((ch) => ch.members.length > 1) ? `: ${nf(chains.filter((ch) => ch.members.length > 1).length)} with harmonics, ${nf(chains.filter((ch) => ch.members.length === 1).length)} alone` : ''}.{' '}
              {newAt.map((n) => `Level ${n.level}: ${n.born} born, ${n.fresh} new`).join('; ')}.
            </p>
            <ol className="harm-chains" data-testid="harm-chains">
              {chains.map((ch) => (
                <li key={ch.members[0]}>
                  {ch.members.map((m, j) => {
                    const c = result.circuits[m];
                    const l = j ? lineageOf(m) : null;
                    const prev = j ? result.circuits[ch.members[j - 1]] : null;
                    return (
                      <span key={m} className="harm-link">
                        {j && prev && l ? (
                          <span className="harm-arrow" title={l.levels.every(Boolean) ? 'reads the same at every level' : 'reads the same above the tiles'}>
                            → ×{(c.length / prev.length).toFixed(1)}
                            {l.levels.every(Boolean) ? '' : '*'}
                          </span>
                        ) : null}
                        <button type="button" className={picked === m ? 'harm-pick harm-picked' : 'harm-pick'} onClick={() => { setPicked(m); setPartnerChoice(null); }} title={describe(c)}>
                          {nf(c.length)}
                          <small> L{c.level}</small>
                        </button>
                      </span>
                    );
                  })}
                  {near
                    .filter((n) => n.a === ch.members[ch.members.length - 1])
                    .map((n) => {
                      const c = result.circuits[n.b];
                      const a = result.circuits[n.a];
                      return (
                        <span key={`near${n.b}`} className="harm-link">
                          <span className="harm-arrow" title={`reads the same at the top ${n.top} levels of the smaller and differs below`}>
                            ≈ ×{(c.length / a.length).toFixed(1)} (top {n.top})
                          </span>
                          <button
                            type="button"
                            className={picked === n.b ? 'harm-pick harm-related harm-picked' : 'harm-pick harm-related'}
                            onClick={() => { setPicked(n.b); setPartnerChoice(n.a); }}
                            title={`${describe(c)}; reads as the ${nf(a.length)} at its top ${n.top} levels and differs below`}
                            data-testid="harm-near"
                          >
                            {nf(c.length)}
                            <small> L{c.level}</small>
                          </button>
                        </span>
                      );
                    })}
                </li>
              ))}
            </ol>
            <p className="shapes-note">
              Each chain runs from a fundamental up through its harmonics, with the growth at each step; * marks a step where the two read the same above level 2
              but differ at the tiles. A dashed ≈ is a near-lineage: a circuit two levels up that reads the same at the smaller one&apos;s top levels and
              differs below. A level where every circuit born is a harmonic brings nothing new.
            </p>
            {families.length ? (
              <>
                <h3>Families</h3>
                <ol className="harm-chains" data-testid="harm-families">
                  {families.map((f) => (
                    <li key={f.family}>
                      <span className="harm-arrow">through children {f.family}:</span>
                      {f.members.map((m, j) => {
                        const c = result.circuits[m];
                        const prev = j ? result.circuits[f.members[j - 1]] : null;
                        return (
                          <span key={m} className="harm-link">
                            {prev ? <span className="harm-arrow">→ ×{(c.length / prev.length).toFixed(1)}</span> : null}
                            <button
                              type="button"
                              className={picked === m ? 'harm-pick harm-picked' : 'harm-pick'}
                              onClick={() => { setPicked(m); setPartnerChoice(prev ? f.members[j - 1] : null); }}
                              title={describe(c)}
                            >
                              {nf(c.length)}
                              <small> L{c.level}</small>
                            </button>
                          </span>
                        );
                      })}
                    </li>
                  ))}
                </ol>
                <p className="shapes-note">
                  A family is the circuits born through the same children of their supertile, level by level, whatever their readings say; a circuit of
                  dimension 2 grows by the area factor, about ×7.9 a level, and is the same as the one below only at its top levels. Clicking a member lines it
                  up with the one before it.
                </p>
              </>
            ) : null}
          </section>
          {picking ? (
            <section data-testid="harm-detail">
              <h2>
                {nf(picking.length)} tiles at level {picking.level}
                {other && partner === fundOf ? ` is ${nf(other.length)} at level ${other.level}, two levels up` : other ? ` against ${nf(other.length)} at level ${other.level}` : ', a fundamental'}
              </h2>
              <div className="harm-compare">
                <label>
                  Compare with{' '}
                  <select value={partner ?? ''} onChange={(e) => setPartnerChoice(e.target.value === '' ? null : Number(e.target.value))} data-testid="harm-partner">
                    <option value="">nothing</option>
                    {result.circuits.map((c, i) =>
                      i === picked ? null : (
                        <option key={i} value={i}>
                          {short(c)}
                          {fundOf === i ? ' (its fundamental)' : nearOf?.a === i ? ' (nearest)' : ''}
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
              <div className="harm-pair">
                <figure>
                  <Glyph circuit={picking} size={220} colour="var(--g1)" label={describe(picking)} />
                  <figcaption>
                    {describe(picking)}; drawn at level {picking.drawnFrom}.{' '}
                    <a href={explorerHref(base, choice, picking)}>Explorer</a>
                  </figcaption>
                </figure>
                {other ? (
                  <figure>
                    <Glyph circuit={other} size={220} colour="var(--g2)" label={describe(other)} />
                    <figcaption>
                      {describe(other)}; drawn at level {other.drawnFrom}.{' '}
                      <a href={explorerHref(base, choice, other)}>Explorer</a>
                    </figcaption>
                  </figure>
                ) : null}
              </div>
              {other && partner !== null && picked !== null ? <PairSupertiles client={client.current} level={result.level} ai={partner} bi={picked} a={other} b={picking} /> : null}
              <ReadingsTable b={picking} a={other} rows={comparing?.rows ?? null} nameA="of the other" />
              {extras && lineage ? (
                <p className="shapes-note" data-testid="harm-extras">
                  At level 2 the harmonic has {nf(extras.runs.length)} extra runs of visits and misses {nf(extras.unmatched)} of the fundamental&apos;s tiles:{' '}
                  {[...new Map(extras.runs.map((run) => [run.join(' '), 0])).keys()].map((run) => `[${run}]`).join(' ')}.
                  {extras.unmatched === 0 ? ' Every extra run is a loop out of one supertile and back into it, round a point where three supertiles meet.' : ''}
                </p>
              ) : null}
              {other && partner !== null && picked !== null ? <PairExpansion client={client.current} level={result.level} ai={partner} bi={picked} a={other} b={picking} /> : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
