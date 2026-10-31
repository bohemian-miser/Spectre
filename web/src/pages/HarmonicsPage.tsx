/**
 * Harmonics: the circuits of a combination that are the same circuit two
 * levels up. Every circuit born up to the level chosen is read at every
 * level (`harmonics/readings.ts`: the supertiles its strand runs through,
 * backtracks across a seam cancelled). A circuit born two levels above
 * another, through the same children, that reads at level k + 2 as the
 * other reads at level k from level 2 up is its harmonic; harmonics link
 * into chains (`harmonics/chains.ts`). Links can be graded: pairs that read
 * at least a chosen share alike at every level, under a chosen fold, link
 * too (`harmonics/similarity.ts`).
 *
 * The circuits sit in a table, a column per level and a row per chain,
 * grouped by family (`harmonics/ChainViews.tsx`). Clicking a circuit opens
 * its row: every member drawn over its supertiles in linked pan and zoom
 * views, the members' rows of visits level by level (`harmonics/rows.ts`),
 * hovering lighting a visit's expansion in every member, and the readings of
 * the circuit clicked lined up with its neighbour in the chain. Shift-clicking a second circuit
 * compares exactly those two. Past the level built, each chain's next member
 * can be brute-forced (`harmonics/BruteForce.tsx`); a member found joins its
 * chain like a built one. The address names the rule, combination, level
 * and selection (`?rule=023468&combo=140000001&level=7&c=7-103851`, with
 * `&with=…` for a pair), and the members found (`&bf=8-734256.10-36701253`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TileTypeId } from '../core';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { explorerCircuitHref } from './shapes/explorerLink';
import { describeCircuit } from './compare/CompareView';
import { ReadingsTable } from './compare/ReadingsTable';
import { compareHref } from './compare/refs';
import { ChainWorkspace, CircuitTable, short, Thumb, THUMB_POINTS, useThumbs } from './harmonics/ChainViews';
import { chainsOf } from './harmonics/chains';
import { FOLDS, type Fold } from './harmonics/rows';
import { linksAt, MIN_SCORE, type Scored } from './harmonics/similarity';
import { BreakdownSets } from './harmonics/BreakdownSets';
import { levelKey, toFound, useBruteForce, type FoundLook, type FoundMember } from './harmonics/BruteForce';
import { createHarmonicsClient, type CircuitInfo, type Comparison, type HarmonicsResult } from './harmonics/harmonicsJob';
import '../styles/shapes.css';
import '../styles/harmonics.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '000100000', level: 6 };

const params = () => new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

/** The rule, combination and level asked for in the address (`?rule=023468&combo=140000001&level=7`), else the default. */
function fromAddress(): ComboChoice {
  const q = params();
  const rule = q.get('rule') ?? '023468', combo = q.get('combo'), level = Number(q.get('level'));
  if (!combo || !/^\d+$/.test(rule) || !/^[0-9a-z]{9}$/.test(combo)) return DEFAULT;
  return { subset: [...rule].map(Number), combo, level: Number.isInteger(level) && level >= 2 && level <= 12 ? level : DEFAULT.level };
}

/** A circuit named in the address as `level-length`. */
const circuitKey = levelKey;
const findKey = (r: HarmonicsResult, key: string | null) => (key ? r.circuits.findIndex((c) => circuitKey(c) === key) : -1);

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

/** What is chosen, by `circuitKey`: a circuit (and with it its chain), or two circuits compared. */
interface Selection {
  readonly focus: string;
  readonly with: string | null;
}

/** The members found, read by the engine: their circuits after the result's, and their thumbnails. */
interface FoundRead {
  readonly r: HarmonicsResult;
  readonly list: readonly FoundMember[];
  readonly infos: readonly CircuitInfo[];
  readonly thumbs: readonly Float64Array[];
}

export default function HarmonicsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const client = useRef(createHarmonicsClient({ forceSync: props.forceSync }));
  const [choice, setChoice] = useState<ComboChoice>(fromAddress);
  const [result, setResult] = useState<HarmonicsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [foundRead, setFoundRead] = useState<FoundRead | null>(null);
  const [foundScores, setFoundScores] = useState<{ key: string; scores: Map<number, Scored> } | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const thumbs = useThumbs(client.current, result);
  const [fold, setFold] = useState<Fold>('fixpoint');
  const [threshold, setThreshold] = useState(1);
  const [scored, setScored] = useState<{ key: string; scored: Scored[] } | null>(null);
  /** The selection the address asked for, kept until the first result. */
  const asked = useRef<{ c: string | null; with: string | null; bf: string | null } | null>({ c: params().get('c'), with: params().get('with'), bf: params().get('bf') });
  const askedFound = useRef(asked.current?.bf ?? null);

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
          const want = asked.current;
          asked.current = null;
          // a circuit the address names: built, or among the members it names found
          const named = (key: string | null | undefined) => !!key && (findKey(r, key) >= 0 || (want?.bf ?? '').split(/[.,]/).includes(key));
          setSel(
            want && named(want.c)
              ? { focus: want.c!, with: named(want.with) && want.with !== want.c ? want.with! : null }
              : r.circuits.length
                ? { focus: circuitKey(r.circuits[r.circuits.length - 1]), with: null }
                : null,
          );
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


  // every pair two levels apart scored under the fold, once per level and fold
  const scoreKey = result ? `${choice.subset.join('')} ${choice.combo} ${result.level} ${fold}` : null;
  useEffect(() => {
    if (!scoreKey) return;
    let on = true;
    client.current
      .similarities(fold)
      .then((s) => on && setScored({ key: scoreKey, scored: s }))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreKey]);
  const scores = scored && scored.key === scoreKey ? scored.scored : null;
  /** The pairs linked at the threshold, by `a-b`; null while scoring. */
  const linked = useMemo(() => (scores ? new Map(linksAt(scores, threshold).map((s) => [`${s.a}-${s.b}`, s])) : null), [scores, threshold]);
  /** The chains at the threshold; the exact rule's while scoring. */
  const chains = useMemo(() => (result && linked ? chainsOf(result.circuits, [...linked.values()]) : result?.chains ?? []), [result, linked]);
  const shown = useMemo(() => (result ? { ...result, chains } : null), [result, chains]);
  const chainOf = useMemo(() => {
    const m = new Map<number, number>();
    chains.forEach((ch, q) => ch.members.forEach((i) => m.set(i, q)));
    return m;
  }, [chains]);
  const newAt = useMemo(() => {
    if (!result) return [];
    const harmonic = new Set(result.links.map((l) => l.b));
    const levels = [...new Set(result.circuits.map((c) => c.level))].sort((a, b) => a - b);
    return levels.map((l) => ({ level: l, born: result.circuits.filter((c) => c.level === l).length, fresh: result.circuits.filter((c, i) => c.level === l && !harmonic.has(i)).length }));
  }, [result]);
  /** Every circuit the views can take: the result's, then the members found once the engine has read them. */
  const n = result?.circuits.length ?? 0;
  const [look, setLook] = useState<Omit<FoundLook, 'onPick'>>({ thumbs: new Map(), index: new Map(), circuits: [], scores: new Map(), selected: new Set() });
  const pick = (i: number, shift: boolean) => {
    const all = look.circuits;
    if (!all[i]) return;
    const key = circuitKey(all[i]);
    setSel((s) => (shift && s && s.focus !== key ? { focus: s.focus, with: key } : { focus: key, with: null }));
  };
  const brute = useBruteForce(client.current, choice, result, chains, { forceSync: props.forceSync, asked: askedFound.current, look: { ...look, onPick: pick } });
  // the members found, read by the engine after the result's circuits
  useEffect(() => {
    if (!result) return;
    let on = true;
    const list = brute.found;
    client.current
      .found(list.map(toFound), THUMB_POINTS)
      .then((got) => on && setFoundRead({ r: result, list, infos: got.map((g) => g.info), thumbs: got.map((g) => g.pts) }))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
  }, [result, brute.found]);
  const read = foundRead && foundRead.r === result && foundRead.list === brute.found ? foundRead : null;
  const circuits = useMemo<readonly CircuitInfo[]>(() => (result ? [...result.circuits, ...(read?.infos ?? [])] : []), [result, read]);
  const indexOf = useMemo(() => new Map(circuits.map((c, i) => [circuitKey(c), i])), [circuits]);
  const selFocus = sel ? indexOf.get(sel.focus) ?? -1 : -1;
  const selWith = sel?.with != null ? indexOf.get(sel.with) ?? null : null;
  /** The members found on each chain, by the chain's index. */
  const foundOf = useMemo(() => {
    const m = new Map<number, number[]>();
    if (!read) return m;
    chains.forEach((ch, q) => {
      const got = brute.byRow.get(ch.members.join(' '));
      if (got?.length) m.set(q, got.map((f) => indexOf.get(levelKey(f.found))!).filter((i) => i !== undefined));
    });
    return m;
  }, [read, chains, brute.byRow, indexOf]);
  const chainOfFound = useMemo(() => {
    const m = new Map<number, number>();
    for (const [q, is] of foundOf) for (const i of is) m.set(i, q);
    return m;
  }, [foundOf]);
  const focus = selFocus >= 0 ? circuits[selFocus] : null;
  const q = selFocus < 0 ? -1 : selFocus < n ? chainOf.get(selFocus) ?? -1 : chainOfFound.get(selFocus) ?? -1;
  /** The circuits in the workspace: the two compared, or the focus's chain with the members found on it, by level. */
  const members = useMemo(() => {
    if (selFocus < 0) return [];
    if (selWith !== null) return [selFocus, selWith].sort((a, b) => circuits[a].level - circuits[b].level || circuits[a].length - circuits[b].length);
    return chains[q] ? [...chains[q].members, ...(foundOf.get(q) ?? [])] : [selFocus];
  }, [selFocus, selWith, circuits, chains, q, foundOf]);
  const at = members.indexOf(selFocus);
  /** The circuit the focus's readings are lined up with: the other one compared, else its neighbour in its chain (below, else above). */
  const partner = selFocus < 0 ? null : selWith ?? members[at - 1] ?? members[at + 1] ?? null;
  const other = partner !== null ? circuits[partner] ?? null : null;
  const below = partner !== null && other && focus && other.level < focus.level ? partner : null;
  const extras = result && below !== null ? result.extras[`${below}-${selFocus}`] : undefined;
  const compareKey = result && selFocus >= 0 && partner !== null ? `${result.level}/${circuitKey(circuits[partner])}/${circuitKey(circuits[selFocus])}/${circuits.length}` : null;
  useEffect(() => {
    if (!compareKey || selFocus < 0 || partner === null) return;
    let on = true;
    client.current
      .compare(partner, selFocus)
      .then((c) => on && setComparison(c))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareKey]);
  const comparing = comparison && partner !== null && comparison.a === partner && comparison.b === selFocus ? comparison : null;
  const inChains = chains.filter((ch) => ch.members.length > 1);
  const chain = chains[q] ?? null;
  const chainMembers = chain ? [...chain.members, ...(foundOf.get(q) ?? [])] : [];
  /** Whether a circuit is one found above the build. */
  const isFound = (i: number) => i >= n;

  // each member found scored against the member before it in its chain, under the table's fold
  const scoresKey = read ? `${result!.level} ${fold} ${read.infos.map(circuitKey).join(' ')}` : null;
  useEffect(() => {
    if (!scoresKey || !result) return;
    let on = true;
    const pairs: [number, number][] = [];
    for (const [cq, is] of foundOf) {
      const ms = [...chains[cq].members, ...is];
      for (const i of is) pairs.push([ms[ms.indexOf(i) - 1], i]);
    }
    Promise.all(pairs.map(([a, b]) => client.current.score(a, b, fold)))
      .then((got) => on && setFoundScores({ key: scoresKey, scores: new Map(got.map((s) => [s.b, s])) }))
      .catch(() => undefined);
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoresKey, foundOf]);

  // what the cells of the members found show
  useEffect(() => {
    const thumbs = new Map<string, Float64Array>();
    const index = new Map<string, number>();
    read?.infos.forEach((c, j) => {
      thumbs.set(circuitKey(c), read.thumbs[j]);
      index.set(circuitKey(c), n + j);
    });
    setLook({ thumbs, index, circuits, scores: foundScores && foundScores.key === scoresKey ? foundScores.scores : new Map(), selected: new Set(members) });
  }, [read, n, circuits, foundScores, scoresKey, members]);

  // the address follows the choice, the selection and the members found
  useEffect(() => {
    if (typeof history === 'undefined' || !result) return;
    const q = new URLSearchParams({ rule: choice.subset.join(''), combo: choice.combo, level: String(result.level) });
    if (sel) q.set('c', sel.focus);
    if (sel?.with != null) q.set('with', sel.with);
    // the members found, as named while they are found again
    const bf = brute.param || (brute.restoring ? askedFound.current : '');
    history.replaceState(null, '', `${location.pathname}?${q}${bf ? `&bf=${bf}` : ''}`);
  }, [choice, result, sel, brute.param, brute.restoring]);

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
      <ComboPicker busy={busy} onAdd={(c) => { asked.current = null; askedFound.current = null; setChoice(c); setSel(null); }} levels="any" verb="Read" initialLevel={choice.level} initialCombo={choice.combo} initialRule={choice.subset.join('')} />
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
              {nf(result.circuits.length)} distinct circuits in {nf(new Set(chains.map((c) => c.family)).size)} families; {nf(inChains.length)} chains of
              two or more{threshold < 1 || fold !== 'fixpoint' ? ` at ${Math.round(threshold * 100)}% alike, folding ${FOLDS.find((f) => f.id === fold)!.name}` : ''}. {newAt.map((n) => `Level ${n.level}: ${n.born} born, ${n.fresh} new`).join('; ')}.
            </p>
            <p className="shapes-note">
              Each circuit sits in the column of the level it closes at. A <strong>family</strong> is every circuit through the same children of its birth
              supertile; a <strong>chain</strong> is a row of circuits linked as harmonics, two columns apart. A dashed ≈ cell is a circuit that reads as a
              chain&apos;s lowest member at the top levels only. Click a circuit to open its row; shift-click a second to compare the two. Past the level
              built, a ? is a chain&apos;s next member, two levels above its last: Brute force follows the strands through that supertile, working out
              only the routes they use, until one closes reading as the last member. The member found takes the cell, dotted, drawn through the middles
              of the supertiles it visits at the lowest level with at most {nf(THUMB_POINTS)} of them; hover it for how it was found.
            </p>
            <div className="shapes-controls harm-link-controls">
              <label className="harm-threshold">
                Link circuits at least{' '}
                <input
                  type="range"
                  min={MIN_SCORE * 100}
                  max={100}
                  step={1}
                  value={Math.round(threshold * 100)}
                  onChange={(e) => setThreshold(Number(e.target.value) / 100)}
                  data-testid="harm-threshold"
                />{' '}
                <output>{Math.round(threshold * 100)}%</output> alike
              </label>
              <span className="harm-show" role="radiogroup" aria-label="What the readings fold">
                Fold:
                {FOLDS.map((f) => (
                  <label key={f.id} className="harm-check">
                    <input type="radio" name="harm-table-fold" checked={fold === f.id} onChange={() => setFold(f.id)} data-testid={`harm-table-fold-${f.id}`} /> {f.name}
                  </label>
                ))}
              </span>
              {!scores ? <span className="shapes-note">Scoring pairs…</span> : null}
            </div>
            <p className="shapes-note">
              Two circuits two levels apart in one family link when, at every level from 2 up, the two read at least that share alike: one less the edit
              distance between the readings (best rotation, either way round) over the longer one&apos;s length, under the fold chosen. 100% folding weaving
              and detours is the exact rule. Each link shows its least share between the two; hover it for every level.
            </p>
            <CircuitTable r={shown!} thumbs={thumbs} selected={members} onPick={pick} linked={linked} beyond={brute.beyond} />
            {brute.climbLine}
          </section>
          {focus && sel && selFocus >= 0 ? (
            <section data-testid="harm-detail">
              {selWith !== null ? (
                <div className="harm-pairbar" data-testid="harm-pairbar">
                  Comparing {members.map((m) => short(circuits[m])).join(' and ')} ·{' '}
                  <button type="button" className="harm-crumb" onClick={() => setSel({ focus: sel.focus, with: null })} data-testid="harm-back">
                    back to the chain
                  </button>
                </div>
              ) : null}
              <h2>
                {selWith !== null
                  ? `${short(circuits[members[0]])} and ${short(circuits[members[1]])}`
                  : chain && chainMembers.length > 1
                    ? `A chain of family ${chain.family}: ${chainMembers.map((m) => short(circuits[m])).join(' → ')}`
                    : `${nf(focus.length)} tiles at level ${focus.level}, in no chain`}
              </h2>
              <div className="harm-chain-glyphs">
                {members.map((m) => {
                  const c = circuits[m];
                  return (
                    <figure key={m} className={m === selFocus ? 'is-picked' : ''}>
                      <button
                        type="button"
                        className={`harm-glyph-pick${isFound(m) ? ' is-found' : ''}`}
                        onClick={() => setSel({ focus: circuitKey(c), with: selWith === null ? null : circuitKey(circuits[members.find((x) => x !== m)!]) })}
                        title={`Line up the ${nf(c.length)}'s readings with its neighbour`}
                      >
                        <Thumb pts={isFound(m) ? read?.thumbs[m - n] : thumbs.get(m)} size={120} label={describe(c)} />
                      </button>
                      <figcaption>
                        {describe(c)}. {isFound(m) ? 'Brute-forced.' : <a href={explorerHref(base, choice, c)}>Explorer</a>}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              <ChainWorkspace client={client.current} level={result.level} members={members} circuits={circuits} fold={fold} onFold={setFold} />
              {isFound(selFocus) || (partner !== null && isFound(partner)) ? null : (
                <BreakdownSets client={client.current} level={result.level} circuits={result.circuits} focus={selFocus} partner={partner} />
              )}
              <h3>Readings</h3>
              {other ? (
                <p className="shapes-note">
                  Level k + {focus.level - other.level} of the {nf(focus.length)} against level k of the {nf(other.length)}; tokens the other reading does not
                  share are outlined.{' '}
                  {partner !== null && (isFound(partner) || isFound(selFocus)) ? null : (
                  <><a
                    href={compareHref(base, { subset: choice.subset, combo: choice.combo, level: other.level, length: other.length }, { subset: choice.subset, combo: choice.combo, level: focus.level, length: focus.length })}
                    data-testid="harm-compare-link"
                  >
                    Open in Compare
                  </a>
                  , with the Fourier terms.</>
                  )}
                </p>
              ) : null}
              <ReadingsTable b={focus} a={other} rows={comparing?.rows ?? null} nameA="of the other" />
              {extras && other ? (
                <p className="shapes-note" data-testid="harm-extras">
                  At level 2 the {nf(focus.length)} has {nf(extras.runs.length)} extra runs of visits and misses {nf(extras.unmatched)} of the {nf(other.length)}&apos;s tiles:{' '}
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
