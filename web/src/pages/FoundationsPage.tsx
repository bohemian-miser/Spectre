/**
 * Foundations: the combinations of a hexagon rule with their circuits,
 * chains and nuggets, the level each first closes at, and where the tails
 * go (`docs/FOUNDATIONS.md`). A rule with data in
 * `public/data/foundations/hex-<rule>/` (`circuit-classes/foundations-sweep.ts`,
 * cut for the page by `circuit-classes/foundations-page.ts`) is read from it
 * at its level: a file per combination, or for a rule of too many
 * combinations a list of index lines by first digit with each combination
 * analysed when chosen. Any other rule or level is analysed live in a worker
 * with the same code (`foundations/liveAnalysis.ts`), one combination or the
 * whole rule. The circuits are drawn from a fresh build in a worker
 * (`foundations/drawings.ts`). The address holds the rule, combination,
 * level and circuit shown.
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REPO_URL } from '../lib/siteNav';
import { ComboPicker } from './shapes/ComboPicker';
import { ComboList, MARK_KEYS } from './foundations/ComboList';
import { ComboView } from './foundations/ComboView';
import { MonstersTable } from './foundations/MonstersTable';
import { useChainBrute } from './foundations/bruteChains';
import { createDrawClient } from './foundations/drawings';
import { loadCombo, loadLines, loadPrecomputed, nf, readAddress, RULE, sourceOf, writeAddress, type Address, type Precomputed } from './foundations/data';
import { comboCount, combosOf, createLiveClient, keep, loadKept, type LiveProgress } from './foundations/liveAnalysis';
import { MARKS, pageIndex, SHORT, type IndexRow, type PageCombo, type PageIndex } from './foundations/pageData';
import '../styles/shapes.css';
import '../styles/foundations.css';

const DEFAULT_COMBO = '140000001';

export default function FoundationsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [address, setAddress] = useState<Address>(() => readAddress(typeof location === 'undefined' ? '' : location.search));
  const [pre, setPre] = useState<{ rule: string; data: Precomputed | null } | null>(null);
  const [lines, setLines] = useState<{ key: string; rows: IndexRow[] } | null>(null);
  const [data, setData] = useState<PageCombo | null>(null);
  const [kept, setKept] = useState<{ key: string; results: Record<string, PageCombo> }>({ key: '', results: {} });
  const [progress, setProgress] = useState<LiveProgress | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useRef(createDrawClient({ forceSync: props.forceSync }));
  // one client for the combination shown, one for sweeping the rule, so neither cancels the other
  const live = useRef(createLiveClient({ forceSync: props.forceSync }));
  const sweeper = useRef(createLiveClient({ forceSync: props.forceSync }));
  const brute = useChainBrute({ forceSync: props.forceSync });
  useEffect(
    () => () => {
      client.current.dispose();
      live.current.dispose();
      sweeper.current.dispose();
    },
    [],
  );

  const rule = address.rule;
  // the rule's precomputed data, if it has any
  useEffect(() => {
    const ac = new AbortController();
    loadPrecomputed(base, rule, ac.signal)
      .then((d) => setPre({ rule, data: d }))
      .catch(() => undefined);
    return () => ac.abort();
  }, [base, rule]);
  // undefined while loading
  const preData = pre?.rule === rule ? pre.data : undefined;
  const src = sourceOf(preData ?? null, address.level);
  const level = src.level;
  // the first combination of every rule is all zeros
  const combo = address.combo ?? (rule === RULE ? DEFAULT_COMBO : '0'.repeat(9));
  const keptKey = `${rule}@${level}`;

  // a rule written as index lines: the lines of the combinations sharing the first digit of the one shown
  const linesKey = preData?.kind === 'lines' && src.list ? `${rule}@${combo[0]}` : null;
  useEffect(() => {
    if (!linesKey || preData?.kind !== 'lines') return;
    const ac = new AbortController();
    loadLines(base, rule, combo[0], preData.level, ac.signal)
      .then((rows) => setLines({ key: linesKey, rows }))
      .catch((e: unknown) => !ac.signal.aborted && setError(e instanceof Error ? e.message : String(e)));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, linesKey]);

  // results kept from a sweep of this rule at this level
  useEffect(() => {
    if (src.combo || preData === undefined) return;
    let on = true;
    loadKept(rule, level).then((results) => on && setKept((k) => (k.key === keptKey ? k : { key: keptKey, results })));
    return () => {
      on = false;
    };
  }, [rule, level, keptKey, src.combo, preData]);
  const results = kept.key === keptKey ? kept.results : {};

  // the combination shown: precomputed, kept, or analysed now
  useEffect(() => {
    if (preData === undefined) return;
    setError(null);
    if (src.combo) {
      const ac = new AbortController();
      loadCombo(base, combo, ac.signal, rule)
        .then(setData)
        .catch((e: unknown) => !ac.signal.aborted && setError(e instanceof Error ? e.message : String(e)));
      return () => ac.abort();
    }
    if (results[combo]) {
      setData(results[combo]);
      return;
    }
    if (sweeping) return;
    setData(null);
    let on = true;
    live.current
      .run({ rule, level, combos: [combo] }, (p) => on && setData(p), (p) => on && setProgress(p))
      .then(() => on && setProgress(null))
      .catch((e: Error) => on && e.message !== 'cancelled' && setError(e.message));
    return () => {
      // only the single run this started; a sweep goes on
      on = false;
      live.current.cancel();
    };
    // `results` changes as a sweep fills it; a combination it has is shown from it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, rule, combo, level, src.combo, preData, sweeping, results[combo]]);

  useEffect(() => {
    if (typeof history === 'undefined') return;
    history.replaceState(null, '', `${location.pathname}${writeAddress(address.view === 'combos' ? { ...address, combo } : address)}${location.hash}`);
  }, [address, combo]);

  const sweep = useCallback(() => {
    const todo = combosOf(rule).filter((c) => !results[c]);
    const acc: Record<string, PageCombo> = { ...results };
    setSweeping(true);
    setError(null);
    let since = 0;
    sweeper.current
      .run(
        { rule, level, combos: todo },
        (p) => {
          acc[p.combo] = p;
          setKept({ key: keptKey, results: { ...acc } });
          if (++since >= 10) {
            since = 0;
            void keep(rule, level, acc);
          }
        },
        setProgress,
      )
      .then(() => keep(rule, level, acc))
      .catch((e: Error) => e.message !== 'cancelled' && setError(e.message))
      .finally(() => {
        setSweeping(false);
        setProgress(null);
      });
  }, [results, rule, level, keptKey]);
  const stopSweep = useCallback(() => {
    sweeper.current.cancel();
    void keep(rule, level, results);
  }, [rule, level, results]);

  const lineRows = lines && lines.key === linesKey ? lines.rows : null;
  const index = useMemo<PageIndex | null>(() => {
    if (src.list && preData?.kind === 'files') return preData.index;
    // index lines carry no monster circuits; each combination's analysis names its own
    if (src.list) return lineRows ? { rule, combos: lineRows, monsters: [] } : null;
    const done = Object.values(results);
    return done.length ? pageIndex(rule, done) : null;
  }, [src.list, preData, lineRows, results, rule]);
  const precomputed = src.list;

  const shortCount = index ? index.combos.filter((r) => r.limit < SHORT).length : 0;
  const select = useCallback((c: string) => setAddress((a) => (a.combo === c ? a : { ...a, combo: c, circuit: null })), []);
  const shown = data && data.combo === combo && data.rule === rule && data.levels === level ? data : null;
  const total = comboCount(rule);
  const done = Object.keys(results).length;

  return (
    <div className="fd-page">
      <header className="fd-intro">
        <h1>Foundations</h1>
        <p>
          Each combination&apos;s circuits, sorted into chains and nuggets, with the share of chords they take level by level and forecast to the limit. Choose a
          combination from the list. <a href={`${REPO_URL}/blob/main/docs/FOUNDATIONS.md`}>Write-up</a>
        </p>
        <details className="fd-how">
          <summary>How to read this</summary>
          <dl>
            <dt>Circuit</dt>
            <dd>its word: wherever and at whatever level it closes, it is the same circuit</dd>
            <dt>Harmonic</dt>
            <dd>a circuit from two levels down with each tile grown into a level-2 supertile, read the same from the floor (the level the first circuit closes at) up</dd>
            <dt>Foundational</dt>
            <dd>a circuit that is not a harmonic where it first closes</dd>
            <dt>Chain</dt>
            <dd>a foundational circuit and its harmonics</dd>
            <dt>Nugget</dt>
            <dd>a foundational circuit with no harmonic: it only closes again, in more places</dd>
            <dt>Monster</dt>
            <dd>a combination whose tails are not all accounted for (short), or a foundational circuit first closing at floor + 4 or later (late) or of at least 100,000 tiles (giant)</dd>
            <dt>Infinite line</dt>
            <dd>a tail still open at the top level built whose arc, followed up a repeating ancestry, reaches the same border places one turn further out twice running: a strand that ancestry never closes. Its share is as computed at the top, never forecast</dd>
            <dt>Limit</dt>
            <dd>the share of chords on known circuits once the chains are forecast past the build</dd>
            {MARK_KEYS.map((m) => (
              <Fragment key={m}>
                <dt>
                  <i className={`fd-dot fd-mark-${m}`} /> {MARKS[m].label}
                </dt>
                <dd>{MARKS[m].title[0].toLowerCase() + MARKS[m].title.slice(1)}</dd>
              </Fragment>
            ))}
          </dl>
        </details>
        <ComboPicker
          key={`${rule}/${combo}/${level}`}
          busy={sweeping}
          levels="any"
          verb="Analyse"
          initialRule={rule}
          initialCombo={combo}
          initialLevel={level}
          onAdd={(c) => {
            const r = c.subset.join('');
            // a new rule at the level shown takes that rule's own level: its precomputed one, if it has data
            setAddress((a) => ({ ...a, view: 'combos', rule: r, combo: c.combo, circuit: null, level: r !== rule && c.level === level ? null : c.level }));
          }}
        />
        <div className="fd-live" data-testid="fd-live">
          <span>
            Rule {rule}: {nf(total)} combinations ·{' '}
            {src.combo
              ? `precomputed to level ${level}`
              : precomputed
                ? `listed to level ${level}; each combination analysed here when chosen`
                : `level ${level}, analysed here${done ? `; ${nf(done)} done` : ''}`}
          </span>
          {precomputed && preData?.kind === 'lines' ? (
            <label>
              Listing combinations starting with{' '}
              <select value={combo[0]} onChange={(e) => select(e.target.value + '0'.repeat(combo.length - 1))} data-testid="fd-first-digit">
                {Object.keys(preData.shards).map((d) => (
                  <option key={d} value={d}>
                    {d} ({nf(preData.shards[d])})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!src.combo ? (
            <button type="button" disabled={sweeping || !shown} onClick={() => setAddress((a) => ({ ...a, level: level + 1, circuit: null }))}>
              Next level
            </button>
          ) : null}
          {precomputed ? null : sweeping ? (
            <button type="button" onClick={stopSweep}>
              Stop
            </button>
          ) : (
            <button type="button" disabled={done >= total} onClick={sweep} data-testid="fd-sweep">
              Sweep this rule at level {level}
            </button>
          )}
          {progress ? (
            <span className="fd-progress" data-testid="fd-progress">
              <progress value={sweeping ? progress.done : progress.step} max={sweeping ? progress.of : progress.steps} />
              {sweeping ? `${nf(progress.done)} of ${nf(progress.of)}: ${progress.combo}, ${progress.stage}` : `${progress.combo}: ${progress.stage}`}
            </span>
          ) : null}
        </div>
        <div className="fd-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={address.view === 'combos'} onClick={() => setAddress((a) => ({ ...a, view: 'combos' }))}>
            Combinations
          </button>
          <button type="button" role="tab" aria-selected={address.view === 'monsters'} onClick={() => setAddress((a) => ({ ...a, view: 'monsters' }))} data-testid="fd-tab-monsters">
            Monsters{index ? ` (${index.monsters.length + shortCount})` : ''}
            {shortCount ? <span className="fd-tab-short"> · short {shortCount}</span> : null}
          </button>
        </div>
      </header>
      {error ? <p className="fd-muted">Could not load the data: {error}</p> : null}
      {address.view === 'monsters' ? (
        index ? (
          <>
            {preData?.kind === 'lines' && precomputed ? (
              <p className="fd-muted">The index lines count each combination&apos;s monsters but do not list them: open a combination to see its own. Short combinations starting with {combo[0]}:</p>
            ) : null}
            <MonstersTable
            monsters={index.monsters}
            combos={index.combos}
            onOpen={(m) => setAddress((a) => ({ ...a, view: 'combos', combo: m.combo, circuit: m.id }))}
            onOpenCombo={(c) => setAddress((a) => ({ ...a, view: 'combos', combo: c, circuit: null }))}
            found={(m) => brute.foundOn(rule, m.combo, m.id)}
            />
          </>
        ) : (
          <p className="fd-muted">{precomputed ? 'Loading…' : 'Sweep the rule to list its monsters.'}</p>
        )
      ) : (
        <div className="fd-split">
          {index ? (
            <ComboList rows={index.combos} selected={combo} onSelect={select} />
          ) : (
            <p className="fd-muted">{preData === undefined || precomputed ? 'Loading…' : 'Sweep the rule to list its combinations.'}</p>
          )}
          <div className="fd-main">
            {shown ? (
              <ComboView data={shown} client={client.current} brute={brute} circuit={address.circuit} onCircuit={(id) => setAddress((a) => ({ ...a, circuit: id }))} />
            ) : (
              <p className="fd-muted">{src.combo ? `Loading ${combo}…` : `Analysing ${combo} to level ${level}…`}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
