/**
 * Foundations: every combination of 023468 with its foundational circuits,
 * the level each first closes at, and the harmonic chains grown from them
 * (`docs/FOUNDATIONS.md`). The figures come from the sweep
 * (`circuit-classes/foundations-sweep.ts`), cut for the page by
 * `circuit-classes/foundations-page.ts` (`foundations/pageData.ts`); the
 * circuits are drawn from a fresh build in a worker (`foundations/drawings.ts`).
 * The address holds the combination and circuit shown.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { REPO_URL } from '../lib/siteNav';
import { ComboList } from './foundations/ComboList';
import { ComboView } from './foundations/ComboView';
import { MonstersTable } from './foundations/MonstersTable';
import { createDrawClient } from './foundations/drawings';
import { loadCombo, loadIndex, readAddress, writeAddress, type Address } from './foundations/data';
import type { PageCombo, PageIndex } from './foundations/pageData';
import '../styles/foundations.css';

const DEFAULT_COMBO = '140000001';

export default function FoundationsPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [address, setAddress] = useState<Address>(() => readAddress(typeof location === 'undefined' ? '' : location.search));
  const [index, setIndex] = useState<PageIndex | null>(null);
  const [data, setData] = useState<PageCombo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useRef(createDrawClient({ forceSync: props.forceSync }));
  useEffect(() => () => client.current.dispose(), []);

  useEffect(() => {
    const ac = new AbortController();
    loadIndex(base, ac.signal)
      .then(setIndex)
      .catch((e: unknown) => !ac.signal.aborted && setError(e instanceof Error ? e.message : String(e)));
    return () => ac.abort();
  }, [base]);

  const combo = address.combo ?? DEFAULT_COMBO;
  useEffect(() => {
    const ac = new AbortController();
    loadCombo(base, combo, ac.signal)
      .then(setData)
      .catch((e: unknown) => !ac.signal.aborted && setError(e instanceof Error ? e.message : String(e)));
    return () => ac.abort();
  }, [base, combo]);

  useEffect(() => {
    if (typeof history === 'undefined') return;
    history.replaceState(null, '', `${location.pathname}${writeAddress(address.view === 'combos' ? { ...address, combo } : address)}${location.hash}`);
  }, [address, combo]);

  const select = useCallback((c: string) => setAddress((a) => (a.combo === c ? a : { ...a, combo: c, circuit: null })), []);
  const shown = data && data.combo === combo ? data : null;

  return (
    <div className="fd-page">
      <header className="fd-intro">
        <h1>Foundations</h1>
        <p>
          Every circuit of a combination closes at some level as one of three things: a <b>harmonic</b> (a circuit from two levels down with each tile grown
          into a level-2 supertile, read the same from the <b>floor</b> up), a <b>reborn</b> copy of a circuit that closed lower down, or a{' '}
          <b>foundational</b> circuit, which starts a chain of harmonics. A <b>monster</b> is a foundational circuit that starts its chain at floor + 4 or later,
          after harmonics have begun, or has at least 100,000 tiles. All 320 combinations of rule 023468, built to level 9 or 10.{' '}
          <a href={`${REPO_URL}/blob/main/docs/FOUNDATIONS.md`}>Write-up</a>
        </p>
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
          <MonstersTable monsters={index.monsters} onOpen={(m) => setAddress({ view: 'combos', combo: m.combo, circuit: m.id })} />
        ) : (
          <p className="fd-muted">Loading…</p>
        )
      ) : (
        <div className="fd-split">
          {index ? <ComboList rows={index.combos} selected={combo} onSelect={select} /> : <p className="fd-muted">Loading…</p>}
          <div className="fd-main">
            {shown ? (
              <ComboView data={shown} client={client.current} circuit={address.circuit} onCircuit={(id) => setAddress((a) => ({ ...a, circuit: id }))} />
            ) : (
              <p className="fd-muted">Loading {combo}…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
