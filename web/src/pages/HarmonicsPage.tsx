/**
 * Harmonics: the circuits of a combination that are the same circuit two
 * levels up. Every circuit born up to the level chosen is read at every
 * level (`harmonics/readings.ts`: the supertiles its strand runs through,
 * backtracks across a seam cancelled); a circuit whose reading at level
 * k + 2 is another's at level k, at every level, is that circuit's harmonic.
 * The renormalisation can be taken one level further at a time, as far as the machine allows. The lineages are listed as chains; a chosen circuit is shown beside its
 * fundamental with the two readings lined up level by level, and where they
 * differ at the tiles, the harmonic's extra visits. Any circuit opens in the
 * Explorer's infinite view.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TileTypeId } from '../core';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { explorerCircuitHref } from './shapes/explorerLink';
import { createHarmonicsClient, type CircuitInfo, type HarmonicsResult } from './harmonics/harmonicsJob';
import '../styles/shapes.css';
import '../styles/harmonics.css';

const nf = (n: number) => n.toLocaleString('en-US');
const LEVELS = [4, 5, 6, 7, 8, 9];
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '000100000', level: 6 };
/** Tokens shown of a reading before it is cut short. */
const SHOWN = 80;

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

function glyphPath(outline: Float64Array, size: number): string {
  const n = outline.length / 2;
  if (!n) return '';
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += outline[2 * i];
    cy += outline[2 * i + 1];
  }
  cx /= n;
  cy /= n;
  let reach = 0;
  for (let i = 0; i < n; i++) reach = Math.max(reach, Math.abs(outline[2 * i] - cx), Math.abs(outline[2 * i + 1] - cy));
  const k = (size * 0.92) / 2 / (reach || 1);
  let d = '';
  for (let i = 0; i < n; i++) d += `${i ? 'L' : 'M'}${((outline[2 * i] - cx) * k).toFixed(1)} ${(-(outline[2 * i + 1] - cy) * k).toFixed(1)}`;
  return `${d}Z`;
}

function Glyph(props: { circuit: CircuitInfo; size: number; colour: string; label: string }): JSX.Element {
  const { size } = props;
  return (
    <svg className="shapes-glyph" width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label={props.label}>
      <path d={glyphPath(props.circuit.outlines[0] ?? new Float64Array(0), size)} fill="none" stroke={props.colour} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

const describe = (c: CircuitInfo) => `${nf(c.length)} tiles, born at level ${c.level} in a ${c.type}, through children ${c.family}`;

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

/** A reading's tokens, cut short when long. */
function Tokens(props: { tokens: readonly string[]; differ?: ReadonlySet<number> }): JSX.Element {
  const { tokens, differ } = props;
  const shown = tokens.slice(0, SHOWN);
  return (
    <code className="harm-tokens">
      {shown.map((t, i) => (
        <span key={i} className={differ?.has(i) ? 'harm-token harm-token-differs' : 'harm-token'}>
          {t}
        </span>
      ))}
      {tokens.length > SHOWN ? <span className="harm-token harm-more">… {nf(tokens.length - SHOWN)} more</span> : null}
    </code>
  );
}

export default function HarmonicsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const client = useRef(createHarmonicsClient({ forceSync: props.forceSync }));
  const [choice, setChoice] = useState<ComboChoice>(DEFAULT);
  const [result, setResult] = useState<HarmonicsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

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
        if (pick) setPicked(r.circuits.length ? r.circuits.length - 1 : null);
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
  const lineageOf = (b: number) => result?.lineages.find((l) => l.b === b && l.a === fund.get(b)) ?? null;
  const newAt = useMemo(() => {
    if (!result) return [];
    const levels = [...new Set(result.circuits.map((c) => c.level))].sort((a, b) => a - b);
    return levels.map((l) => ({ level: l, born: result.circuits.filter((c) => c.level === l).length, fresh: result.circuits.filter((c, i) => c.level === l && !fund.has(i)).length }));
  }, [result, fund]);
  const picking = picked !== null && result ? result.circuits[picked] : null;
  const fundOf = picked !== null && fund.has(picked) ? fund.get(picked)! : null;
  const fundamental = fundOf !== null && result ? result.circuits[fundOf] : null;
  const lineage = picked !== null ? lineageOf(picked) : null;
  const extras = result && picked !== null && fundOf !== null ? result.extras[`${fundOf}-${picked}`] : undefined;

  return (
    <div className="shapes-page harm-page">
      <h1>Harmonics</h1>
      <p className="shapes-note">
        A circuit read at level k is the sequence of level-k supertiles its strand runs through (type, slot in its parent, parent type), with back-and-forth
        crossings of a seam cancelled. A circuit born two levels above another that reads at level k + 2 as the other reads at level k, at every level, is its
        harmonic: the same circuit with every tile grown into a level-2 supertile. Every circuit of the combination born up to the level chosen is read from
        the renormalisation, so nothing is traced tile by tile.
      </p>
      <ComboPicker busy={busy} onAdd={(c) => { setChoice(c); setPicked(null); }} levels={LEVELS} verb="Read" initialLevel={DEFAULT.level} initialCombo={DEFAULT.combo} />
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
                        <button type="button" className={picked === m ? 'harm-pick harm-picked' : 'harm-pick'} onClick={() => setPicked(m)} title={describe(c)}>
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
              but differ at the tiles. A level where every circuit born is a harmonic brings nothing new.
            </p>
          </section>
          {picking ? (
            <section data-testid="harm-detail">
              <h2>
                {nf(picking.length)} tiles at level {picking.level}
                {fundamental ? ` is ${nf(fundamental.length)} at level ${fundamental.level}, two levels up` : ', a fundamental'}
              </h2>
              <div className="harm-pair">
                <figure>
                  <Glyph circuit={picking} size={220} colour="var(--g1)" label={describe(picking)} />
                  <figcaption>
                    {describe(picking)}; drawn at level {picking.drawnFrom}.{' '}
                    <a href={explorerHref(base, choice, picking)}>Explorer</a>
                  </figcaption>
                </figure>
                {fundamental ? (
                  <figure>
                    <Glyph circuit={fundamental} size={220} colour="var(--g2)" label={describe(fundamental)} />
                    <figcaption>
                      {describe(fundamental)}; drawn at level {fundamental.drawnFrom}.{' '}
                      <a href={explorerHref(base, choice, fundamental)}>Explorer</a>
                    </figcaption>
                  </figure>
                ) : null}
              </div>
              <table className="harm-readings" data-testid="harm-readings">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Visits</th>
                    <th>Reading, backtracks cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {[...picking.readings]
                    .reverse()
                    .map((r) => {
                      const k = r.level - 2;
                      const ra = fundamental && k >= 0 ? fundamental.readings.find((x) => x.level === k) ?? null : null;
                      const same = lineage && k >= 0 ? lineage.levels[k] ?? null : null;
                      return [
                        <tr key={`b${r.level}`} className="harm-row-b">
                          <td>{r.level}</td>
                          <td>
                            {nf(r.raw)} → {nf(r.tokens.length)}
                          </td>
                          <td>
                            <Tokens tokens={r.tokens} />
                          </td>
                        </tr>,
                        ra ? (
                          <tr key={`a${k}`} className="harm-row-a">
                            <td>{k} of the fundamental</td>
                            <td>
                              {nf(ra.raw)} → {nf(ra.tokens.length)}
                            </td>
                            <td>
                              <Tokens tokens={ra.tokens} />
                              <span className={same ? 'harm-same' : 'harm-differs'}>{same === null ? 'not compared' : same ? 'the same' : 'differs'}</span>
                            </td>
                          </tr>
                        ) : null,
                      ];
                    })}
                </tbody>
              </table>
              {extras ? (
                <p className="shapes-note" data-testid="harm-extras">
                  At level 2 the harmonic has {nf(extras.runs.length)} extra runs of visits and misses {nf(extras.unmatched)} of the fundamental&apos;s tiles:{' '}
                  {[...new Map(extras.runs.map((run) => [run.join(' '), 0])).keys()].map((run) => `[${run}]`).join(' ')}.
                  {extras.unmatched === 0 ? ' Every extra run is a loop out of one supertile and back into it, round a point where three supertiles meet.' : ''}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
