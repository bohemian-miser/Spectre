/**
 * Foundations: the combinations of a hexagon rule with their circuits,
 * chains and nuggets, the level each first closes at, and where the tails
 * go (`docs/FOUNDATIONS.md`). Rule 023468 is precomputed by the sweep
 * (`circuit-classes/foundations-sweep.ts`, cut for the page by
 * `circuit-classes/foundations-page.ts`); any other rule, or any other
 * level, is analysed live in a worker with the same code
 * (`foundations/liveAnalysis.ts`), one combination or the whole rule. The
 * circuits are drawn from a fresh build in a worker (`foundations/drawings.ts`).
 * The address holds the rule, combination, level and circuit shown.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REPO_URL } from '../lib/siteNav';
import { ComboPicker } from './shapes/ComboPicker';
import { ComboList } from './foundations/ComboList';
import { ComboView } from './foundations/ComboView';
import { MonstersTable } from './foundations/MonstersTable';
import { createDrawClient } from './foundations/drawings';
import { loadCombo, loadIndex, nf, readAddress, RULE, writeAddress, type Address } from './foundations/data';
import { comboCount, combosOf, createLiveClient, keep, loadKept, type LiveProgress } from './foundations/liveAnalysis';
import { pageIndex, type PageCombo, type PageIndex } from './foundations/pageData';
import '../styles/shapes.css';
import '../styles/foundations.css';

const DEFAULT_COMBO = '140000001';
/** The level a live analysis runs to unless asked; one more is built for what the tails close into. */
const LIVE_LEVEL = 8;
/** The level the precomputed data is classified to. */
const PRE_LEVEL = 9;

export default function FoundationsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [address, setAddress] = useState<Address>(() => readAddress(typeof location === 'undefined' ? '' : location.search));
  const [pre, setPre] = useState<{ rule: string; index: PageIndex | null } | null>(null);
  const [data, setData] = useState<PageCombo | null>(null);
  const [kept, setKept] = useState<{ key: string; results: Record<string, PageCombo> }>({ key: '', results: {} });
  const [progress, setProgress] = useState<LiveProgress | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useRef(createDrawClient({ forceSync: props.forceSync }));
  // one client for the combination shown, one for sweeping the rule, so neither cancels the other
  const live = useRef(createLiveClient({ forceSync: props.forceSync }));
  const sweeper = useRef(createLiveClient({ forceSync: props.forceSync }));
  useEffect(
    () => () => {
      client.current.dispose();
      live.current.dispose();
      sweeper.current.dispose();
    },
    [],
  );

  const rule = address.rule;
  // the rule's precomputed index, if it has one
  useEffect(() => {
    const ac = new AbortController();
    loadIndex(base, rule, ac.signal)
      .then((index) => setPre({ rule, index }))
      .catch(() => undefined);
    return () => ac.abort();
  }, [base, rule]);
  const preIndex = pre?.rule === rule ? pre.index : undefined;
  const precomputed = address.level === null && !!preIndex;
  const level = address.level ?? (preIndex ? PRE_LEVEL : LIVE_LEVEL);
  const combos = useMemo(() => combosOf(rule), [rule]);
  const combo = address.combo ?? (rule === RULE ? DEFAULT_COMBO : combos[0]);
  const keptKey = `${rule}@${level}`;

  // results kept from a sweep of this rule at this level
  useEffect(() => {
    if (precomputed || preIndex === undefined) return;
    let on = true;
    loadKept(rule, level).then((results) => on && setKept((k) => (k.key === keptKey ? k : { key: keptKey, results })));
    return () => {
      on = false;
    };
  }, [rule, level, keptKey, precomputed, preIndex]);
  const results = kept.key === keptKey ? kept.results : {};

  // the combination shown: precomputed, kept, or analysed now
  useEffect(() => {
    if (preIndex === undefined) return;
    setError(null);
    if (precomputed) {
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
  }, [base, rule, combo, level, precomputed, preIndex, sweeping, results[combo]]);

  useEffect(() => {
    if (typeof history === 'undefined') return;
    history.replaceState(null, '', `${location.pathname}${writeAddress(address.view === 'combos' ? { ...address, combo } : address)}${location.hash}`);
  }, [address, combo]);

  const sweep = useCallback(() => {
    const todo = combos.filter((c) => !results[c]);
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
  }, [combos, results, rule, level, keptKey]);
  const stopSweep = useCallback(() => {
    sweeper.current.cancel();
    void keep(rule, level, results);
  }, [rule, level, results]);

  const index = useMemo<PageIndex | null>(() => {
    if (precomputed) return preIndex ?? null;
    const done = Object.values(results);
    return done.length ? pageIndex(rule, done) : null;
  }, [precomputed, preIndex, results, rule]);

  const select = useCallback((c: string) => setAddress((a) => (a.combo === c ? a : { ...a, combo: c, circuit: null })), []);
  const shown = data && data.combo === combo && data.rule === rule && data.levels === level ? data : null;
  const total = comboCount(rule);
  const done = Object.keys(results).length;

  return (
    <div className="fd-page">
      <header className="fd-intro">
        <h1>Foundations</h1>
        <p>
          A circuit is its word: wherever and at whatever level it closes, it is the same circuit. Where it first closes it is a <b>harmonic</b> (a circuit
          from two levels down with each tile grown into a level-2 supertile, read the same from the <b>floor</b> up) or a <b>foundational</b> circuit. A
          foundational circuit with harmonics starts a <b>chain</b>; one without is a <b>nugget</b>, which only closes again, in more places. A{' '}
          <b>monster</b> is a foundational circuit at floor + 4 or later, after harmonics have begun, or one of at least 100,000 tiles. All 320 combinations
          of rule 023468 are precomputed, sorted to level 9 and built to level 10; any other rule or level is analysed here.{' '}
          <a href={`${REPO_URL}/blob/main/docs/FOUNDATIONS.md`}>Write-up</a>
        </p>
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
            setAddress((a) => ({ ...a, view: 'combos', rule: r, combo: c.combo, circuit: null, level: r === RULE && c.level === PRE_LEVEL ? null : c.level }));
          }}
        />
        <div className="fd-live" data-testid="fd-live">
          <span>
            Rule {rule}: {nf(total)} combinations · {precomputed ? `precomputed to level ${level}` : `level ${level}, analysed here${done ? `; ${nf(done)} done` : ''}`}
          </span>
          {!precomputed ? (
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
            Monsters{index ? ` (${index.monsters.length})` : ''}
          </button>
        </div>
      </header>
      {error ? <p className="fd-muted">Could not load the data: {error}</p> : null}
      {address.view === 'monsters' ? (
        index ? (
          <MonstersTable monsters={index.monsters} onOpen={(m) => setAddress((a) => ({ ...a, view: 'combos', combo: m.combo, circuit: m.id }))} />
        ) : (
          <p className="fd-muted">{precomputed ? 'Loading…' : 'Sweep the rule to list its monsters.'}</p>
        )
      ) : (
        <div className="fd-split">
          {index ? (
            <ComboList rows={index.combos} selected={combo} onSelect={select} />
          ) : (
            <p className="fd-muted">{preIndex === undefined ? 'Loading…' : 'Sweep the rule to list its combinations.'}</p>
          )}
          <div className="fd-main">
            {shown ? (
              <ComboView data={shown} client={client.current} circuit={address.circuit} onCircuit={(id) => setAddress((a) => ({ ...a, circuit: id }))} />
            ) : (
              <p className="fd-muted">{precomputed ? `Loading ${combo}…` : `Analysing ${combo} to level ${level}…`}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
