/**
 * Centre map: the pairings of every rule (capped per rule and sampled beyond
 * the cap; the all-edges rule only on request), compared by where their
 * circuits' centres are.
 *
 * Each pairing is drawn on one rooted patch and reduced to its circuits'
 * centres. For pairings A and B, the directed chamfer distance A → B is the
 * average distance from each of A's centres to the nearest of B's
 * (`core/centreMap.ts`). The heatmap shows that matrix; the scatter is a UMAP
 * of its rows (each pairing as its distances to all the others), coloured by
 * edge rule or by group. Search by rule and combination string with `?`
 * wildcards, or by what a tile joins, to pick pairings out of both.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_EXPLORER_STATE,
  clusterBySimilarity,
  comboToMatchingIndices,
  encodeExplorerState,
  matchesJoins,
  matchesPattern,
  leafOrder,
  leafPts,
  selectionPatterns,
  selectionTileChords,
  rulePairings,
  seriate,
  validEdgeSubsets,
  type EdgeJoin,
  type TileTypeId,
  type TileFamilyId,
} from '../core';
import { JoinPicker } from '../components/JoinPicker';
import { PanZoom } from '../components/PanZoom';
import { usePrefersDark } from '../hooks/usePrefersDark';
import { CENTRE_MAP_TTL_MS, centreMapKey, loadCentreMap, saveCentreMap } from '../lib/centreMapCache';
import { createCentreMapClient } from '../workers/centreMapClient';
import type { CentreMapPhase, CentreMapResult } from '../workers/centreMapJobs';
import { createFaultLinesClient, type FaultLinesClient } from '../workers/faultLinesClient';
import '../styles/centremap.css';

const FAMILIES: readonly { id: TileFamilyId; label: string }[] = [
  { id: 'spectre', label: 'Spectres' },
  { id: 'hex', label: 'Hexagons' },
];
const LEVELS = [4, 5] as const;
/** The all-edges rule has hundreds of thousands of pairings; everything else is enumerated. */
/** How many of the all-edges rule's pairings to sample by default (with a fixed seed). */
const DEFAULT_ALL_EDGES_SAMPLE = 200;
const PLOT = 520;
const PLOT_BOX = { min: { x: 0, y: 0 }, max: { x: PLOT, y: PLOT } };
const THUMB = 240;
/** The magnified view's render size, in pixels. */
const BIG = 900;
const NEAREST = 8;

const RULE_HUES = [210, 20, 130, 280, 45, 330, 170, 0, 90, 250];
const ruleColour = (i: number) => `hsl(${RULE_HUES[i % RULE_HUES.length]} 70% 52%)`;
const groupColour = (i: number) => (i < 0 ? 'hsl(0 0% 60%)' : `hsl(${(i * 137.5) % 360} 68% 50%)`);

interface Item {
  readonly rule: string;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly ruleIndex: number;
}

function explorerHref(family: TileFamilyId, subset: readonly number[], combo: string, level: number): string {
  const q = encodeExplorerState({
    ...DEFAULT_EXPLORER_STATE,
    family,
    rootTile: 'Delta',
    level,
    subset,
    matching: comboToMatchingIndices(family, subset, combo),
  });
  return `${import.meta.env.BASE_URL}#/explorer?${q.toString()}`;
}

/** Pearson correlation of two matrix rows (log-scaled), as a similarity in [−1, 1]. */
function rowCorrelation(m: Float32Array, n: number): Float32Array {
  let max = 0;
  for (const v of m) if (Number.isFinite(v) && v > max) max = v;
  const rows = Array.from({ length: n }, (_, a) => {
    const r = new Float64Array(n);
    let mean = 0;
    for (let b = 0; b < n; b++) {
      const v = m[a * n + b];
      r[b] = Math.log1p(Number.isFinite(v) ? v : max);
      mean += r[b] / n;
    }
    let ss = 0;
    for (let b = 0; b < n; b++) {
      r[b] -= mean;
      ss += r[b] * r[b];
    }
    const norm = Math.sqrt(ss) || 1;
    for (let b = 0; b < n; b++) r[b] /= norm;
    return r;
  });
  const out = new Float32Array(n * n);
  for (let a = 0; a < n; a++) {
    for (let b = a; b < n; b++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += rows[a][k] * rows[b][k];
      out[a * n + b] = s;
      out[b * n + a] = s;
    }
  }
  return out;
}

type HeatOrder = 'similar' | 'groups' | 'rule' | 'combo';
const HEAT_ORDERS: readonly { id: HeatOrder; label: string }[] = [
  { id: 'similar', label: 'similar next to similar' },
  { id: 'groups', label: 'by group' },
  { id: 'rule', label: 'by rule, then combination string' },
  { id: 'combo', label: 'by combination string' },
];

const PHASE_LABEL: Record<CentreMapPhase, string> = {
  centres: 'Finding circuit centres',
  distances: 'Measuring distances',
  layout: 'Laying out (UMAP)',
};

export default function CentreMapPage(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('spectre');
  const [level, setLevel] = useState<number>(5);
  const [matchSizes, setMatchSizes] = useState(true);
  const [weightBySize, setWeightBySize] = useState(true);
  const [result, setResult] = useState<{ result: CentreMapResult; items: readonly Item[]; family: TileFamilyId } | null>(null);
  const [progress, setProgress] = useState<{ phase: CentreMapPhase; done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [colourBy, setColourBy] = useState<'rule' | 'group'>('rule');
  const [rowOrder, setRowOrder] = useState<HeatOrder>('similar');
  const [colOrder, setColOrder] = useState<HeatOrder>('similar');
  const [threshold, setThreshold] = useState(0.9);
  const [ruleFilter, setRuleFilter] = useState('');
  const [pattern, setPattern] = useState('');
  const [joins, setJoins] = useState<readonly EdgeJoin[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  /** What a drag on the charts does, and the pairings picked out by a box. */
  const [dragMode, setDragMode] = useState<'pan' | 'select'>('pan');
  const [picked, setPicked] = useState<readonly number[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  /** The magnifier: which of [selected, ...nearest] it shows, and how. */
  const [magnified, setMagnified] = useState<{ at: number; view: 'strands' | 'centres' } | null>(null);
  const client = useMemo(() => createCentreMapClient(), []);
  const thumbs = useMemo(() => createFaultLinesClient(), []);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      client.dispose();
      thumbs.dispose();
    },
    [client, thumbs],
  );
  const dark = usePrefersDark();

  const [maxPerRule, setMaxPerRule] = useState(DEFAULT_ALL_EDGES_SAMPLE);
  const [includeAllEdges, setIncludeAllEdges] = useState(false);
  const plan = useMemo(() => {
    const rules = validEdgeSubsets(family).filter((s) => s.edges.length);
    const all = rules[rules.length - 1]?.edges.length ?? 0;
    const items: Item[] = [];
    const used: { subset: readonly number[]; combos: string[]; total: number }[] = [];
    rules
      .filter((s) => includeAllEdges || s.edges.length < all)
      .forEach((s, ruleIndex) => {
        // Every rule is measured in full but the all-edges one, which is sampled
        // down to the cap: a fixed seed, so the same cap picks the same pairings.
        let seed = 12345 + ruleIndex;
        const random = () => {
          seed = (seed * 1103515245 + 12345) % 2147483648;
          return seed / 2147483648;
        };
        const limit = s.edges.length < all ? Number.MAX_SAFE_INTEGER : Math.max(1, maxPerRule);
        const { combos, total } = rulePairings(family, s.edges, limit, random);
        combos.sort();
        used.push({ subset: s.edges, combos, total });
        for (const combo of combos) items.push({ rule: s.edges.join(''), subset: s.edges, combo, ruleIndex });
      });
    return { items, rules: used };
  }, [family, maxPerRule, includeAllEdges]);

  // Saved surveys (30 days in localStorage): the same settings show at once.
  const cacheKey = useMemo(
    () => centreMapKey({ family, level, matchSizes, weightBySize, rules: plan.rules }),
    [family, level, matchSizes, weightBySize, plan],
  );
  /** When the result on show was saved, if it came from (or went into) storage. */
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const loadSaved = (): boolean => {
    const saved = loadCentreMap(cacheKey);
    if (!saved || saved.counts.length !== plan.items.length) return false;
    cancelRef.current?.();
    setProgress(null);
    setError(null);
    setResult({ result: saved, items: plan.items, family });
    setPicked(null);
    setSavedAt(saved.savedAt);
    setResultKey(cacheKey);
    return true;
  };
  useEffect(() => {
    if (resultKey !== cacheKey) loadSaved();
    // Only a change of settings should look for a saved survey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const start = (recompute = false) => {
    setSelected(null);
    setJoins([]);
    if (!recompute && loadSaved()) return;
    cancelRef.current?.();
    setError(null);
    setProgress({ phase: 'centres', done: 0, total: plan.items.length });
    const items = plan.items;
    const fam = family;
    const key = cacheKey;
    cancelRef.current = client.run(
      { family, level, rules: plan.rules, matchSizes, weightBySize },
      {
        onProgress: (phase, done, total) => setProgress({ phase, done, total }),
        onDone: (r) => {
          setResult({ result: r, items, family: fam });
          setPicked(null);
          setResultKey(key);
          const now = Date.now();
          setSavedAt(saveCentreMap(key, r, now) ? now : null);
          setProgress(null);
        },
        onError: (e) => {
          setError(e);
          setProgress(null);
        },
      },
    );
  };
  const stop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setProgress(null);
  };

  const n = result?.items.length ?? 0;
  const similarity = useMemo(() => (result ? rowCorrelation(result.result.matrix, n) : null), [result, n]);
  const clustering = useMemo(() => (similarity ? clusterBySimilarity(similarity, n, threshold) : null), [similarity, n, threshold]);
  const groupOf = useMemo(() => {
    const out = new Int32Array(n).fill(-1);
    clustering?.clusters.filter((c) => c.length > 1).forEach((c, gi) => c.forEach((i) => (out[i] = gi)));
    return out;
  }, [clustering, n]);
  const groupCount = clustering?.clusters.filter((c) => c.length > 1).length ?? 0;
  const similarOrder = useMemo(() => (result ? seriate(result.result.matrix, n) : []), [result, n]);
  const byString = useMemo(() => {
    if (!result) return { rule: [], combo: [] };
    const idx = result.items.map((_, i) => i);
    const it = result.items;
    return {
      rule: [...idx].sort((a, b) => it[a].ruleIndex - it[b].ruleIndex || it[a].combo.localeCompare(it[b].combo)),
      combo: [...idx].sort((a, b) => it[a].combo.localeCompare(it[b].combo) || it[a].ruleIndex - it[b].ruleIndex),
    };
  }, [result]);
  const orderFor = (o: HeatOrder): readonly number[] =>
    o === 'similar' ? similarOrder : o === 'groups' ? (clustering?.order ?? []) : byString[o];

  const searching = !!ruleFilter || !!pattern.trim() || joins.length > 0;
  const matches = useMemo(() => {
    if (!result) return null;
    return result.items.map(
      (it) =>
        (!ruleFilter || it.rule === ruleFilter) &&
        matchesPattern(it.combo, pattern) &&
        matchesJoins(result.family, it.subset, it.combo, joins),
    );
  }, [result, ruleFilter, pattern, joins]);
  const matchCount = matches?.filter(Boolean).length ?? 0;

  /** A box picks what it covers, but only the search's matches while one is on. */
  const pickBox = (ids: readonly number[]) => setPicked(searching && matches ? ids.filter((i) => matches[i]) : ids);
  const label = (i: number) => `${result!.items[i].rule} · ${result!.items[i].combo}`;
  const dist = (a: number, b: number) => result!.result.matrix[a * n + b];
  const nearest = useMemo(() => {
    if (!result || selected === null) return [];
    const sym = (b: number) => (dist(selected, b) + dist(b, selected)) / 2;
    return result.items
      .map((_, b) => b)
      .filter((b) => b !== selected)
      .sort((a, b) => sym(a) - sym(b))
      .slice(0, NEAREST);
    // dist reads result and n.
  }, [result, selected, n]);

  const rules = plan.rules.map((r) => r.subset.join(''));
  const colourOf = (i: number) => (colourBy === 'rule' ? ruleColour(result!.items[i].ruleIndex) : groupColour(groupOf[i]));

  return (
    <article className="centremap-page">
      <header>
        <h1>Centre map</h1>
        <p className="muted">
          Every pairing of every rule (the all-edges rule only if you ask, and then a sample of it), drawn on one rooted patch and reduced to its circuits&rsquo;
          centres (the average of each circuit&rsquo;s points). For two pairings A and B, the <b>directed chamfer distance</b>{' '}
          A&nbsp;→&nbsp;B is the average distance from each of A&rsquo;s centres to the nearest centre of B: 0 when every
          centre of A has one of B&rsquo;s right on it. It is fast because B&rsquo;s centres are drawn onto a grid once and a
          distance transform gives every cell its distance to the nearest one, so each of A&rsquo;s centres is a single
          lookup. Only A&rsquo;s centres a margin in from the patch edge are averaged, since circuits the edge cuts lose
          theirs.
        </p>
      </header>

      <div className="centremap-controls" role="group" aria-label="Survey">
        <label>
          Tiles
          <select value={family} onChange={(e) => setFamily(e.target.value as TileFamilyId)} data-testid="centremap-family">
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} data-testid="centremap-level">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label title="The all-edges rule has hundreds of thousands of pairings, so it is always sampled">
          <input type="checkbox" checked={includeAllEdges} onChange={(e) => setIncludeAllEdges(e.target.checked)} data-testid="centremap-all-edges" /> Include
          the all-edges rule
        </label>
        {includeAllEdges && (
        <label title="How many of the all-edges rule's pairings to sample (the same sample each time); every other rule is measured in full">
          Its pairings
          <input
            type="number"
            min={1}
            step={10}
            value={maxPerRule}
            onChange={(e) => setMaxPerRule(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            data-testid="centremap-max"
            style={{ width: '7ch' }}
          />
        </label>
        )}
        <label title="A centre is only near one of a similar size: each size band (×4 in length) away costs as much as 4 tiles of distance">
          <input type="checkbox" checked={matchSizes} onChange={(e) => setMatchSizes(e.target.checked)} /> Match sizes
        </label>
        <label title="Average with weights ln(1 + length), so big circuits count for more than the many small ones">
          <input type="checkbox" checked={weightBySize} onChange={(e) => setWeightBySize(e.target.checked)} /> Weight by size
        </label>
        {progress ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => start()} data-testid="centremap-start">
            Compare {plan.items.length.toLocaleString('en-US')} pairings
          </button>
        )}
        <span className="muted" data-testid="centremap-progress">
          {progress ? `${PHASE_LABEL[progress.phase]}… ${progress.phase === 'layout' ? '' : `${progress.done} of ${progress.total}`}` : ''}
          {error ? `Failed: ${error}` : ''}
        </span>
        {!progress && result && resultKey === cacheKey && savedAt !== null && (
          <span className="muted" data-testid="centremap-saved">
            Saved {new Date(savedAt).toLocaleDateString()}, kept until{' '}
            {new Date(savedAt + CENTRE_MAP_TTL_MS).toLocaleDateString()} ·{' '}
            <button type="button" className="link-button" onClick={() => start(true)} data-testid="centremap-recompute">
              recompute
            </button>
          </span>
        )}
      </div>
      <p className="muted centremap-note">
        Rules:{' '}
        {plan.rules
          .map((r) => {
            const name = r.subset.join('');
            return r.combos.length < r.total ? `${name} (${r.combos.length} of ${r.total.toLocaleString('en-US')}, sampled)` : name;
          })
          .join(', ')}{' '}
        — {plan.items.length.toLocaleString('en-US')} pairings, all of them non-crossing.
      </p>

      {result && clustering && (
        <>
          <div className="centremap-controls" role="group" aria-label="View">
            <label>
              Colour by
              <select value={colourBy} onChange={(e) => setColourBy(e.target.value as 'rule' | 'group')} data-testid="centremap-colour">
                <option value="rule">edge rule</option>
                <option value="group">group</option>
              </select>
            </label>
            <label>
              Group rows correlated at least
              <input type="range" min={0.5} max={0.99} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} data-testid="centremap-threshold" />
              <b>{threshold.toFixed(2)}</b>
            </label>
            <span className="muted" data-testid="centremap-summary">
              {n} pairings at level {result.result.level}: {groupCount} groups
            </span>
          </div>
          {colourBy === 'rule' && (
            <div className="centremap-legend">
              {rules.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  className={`mono${ruleFilter === r ? ' is-on' : ''}`}
                  onClick={() => setRuleFilter(ruleFilter === r ? '' : r)}
                  title="Search this rule"
                >
                  <span className="centremap-swatch" style={{ background: ruleColour(i) }} />
                  {r}
                </button>
              ))}
            </div>
          )}

          <section className="centremap-search" aria-labelledby="centremap-search-h">
            <h2 id="centremap-search-h">Search</h2>
            <div className="centremap-controls">
              <label>
                Rule
                <select value={ruleFilter} onChange={(e) => setRuleFilter(e.target.value)} data-testid="centremap-rule">
                  <option value="">any</option>
                  {rules.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Combination
                <input
                  className="mono"
                  value={pattern}
                  placeholder="e.g. 1?0?00??10"
                  onChange={(e) => setPattern(e.target.value)}
                  data-testid="centremap-pattern"
                  spellCheck={false}
                />
              </label>
              <span data-testid="centremap-matches">
                {searching ? `${matchCount} of ${n} match` : 'Showing all'}
              </span>
              {searching && (
                <button
                  type="button"
                  onClick={() => {
                    setRuleFilter('');
                    setPattern('');
                    setJoins([]);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <JoinPicker family={result.family} joins={joins} onChange={setJoins} />
          </section>

          <div className="centremap-controls" role="group" aria-label="Drag">
            <span className="centremap-modal-views">
              Drag to
              {(['pan', 'select'] as const).map((m) => (
                <button key={m} type="button" className={dragMode === m ? 'is-on' : undefined} aria-pressed={dragMode === m} onClick={() => setDragMode(m)} data-testid={`centremap-drag-${m}`}>
                  {m === 'pan' ? 'pan' : 'select an area'}
                </button>
              ))}
            </span>
            <span className="muted">
              {dragMode === 'select' ? 'Drag a box on either chart to pick the pairings inside it (on the heatmap, its rows and columns).' : 'Wheel or pinch zooms either way.'}
            </span>
          </div>
          <div className="centremap-views">
            <section aria-labelledby="centremap-umap-h">
              <h2 id="centremap-umap-h">UMAP of the rows</h2>
              <Scatter
                embedding={result.result.embedding}
                n={n}
                colourOf={colourOf}
                matches={searching ? matches : null}
                hover={hover}
                selected={selected}
                onHover={setHover}
                onPick={setSelected}
                label={label}
                selecting={dragMode === 'select'}
                picked={picked}
                onBox={pickBox}
              />
            </section>
            <section aria-labelledby="centremap-heat-h">
              <h2 id="centremap-heat-h">Distances, A → B</h2>
              <div className="centremap-order">
                {(
                  [
                    ['Rows', rowOrder, setRowOrder, 'centremap-order'],
                    ['Columns', colOrder, setColOrder, 'centremap-col-order'],
                  ] as const
                ).map(([name, value, set, testid]) => (
                  <label key={name}>
                    {name}
                    <select value={value} onChange={(e) => set(e.target.value as HeatOrder)} data-testid={testid}>
                      {HEAT_ORDERS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <Heatmap matrix={result.result.matrix} n={n} rows={orderFor(rowOrder)} cols={orderFor(colOrder)} matches={searching ? matches : null} label={label} onPick={setSelected} selecting={dragMode === 'select'} picked={picked} onBox={pickBox} />
            </section>
          </div>

          {picked && picked.length === 0 && (
            <p className="muted" data-testid="centremap-picked-none">
              No pairings in that box.{' '}
              <button type="button" className="link-button" onClick={() => setPicked(null)}>
                Clear
              </button>
            </p>
          )}
          {picked && picked.length > 0 && (
            <SelectionPanel
              family={result.family}
              level={result.result.level}
              items={picked.map((i) => result.items[i])}
              client={thumbs}
              dark={dark}
              onClear={() => setPicked(null)}
            />
          )}

          {selected !== null && (
            <section className="centremap-selected" aria-labelledby="centremap-selected-h" data-testid="centremap-selected">
              <h2 id="centremap-selected-h">
                <span className="mono">{label(selected)}</span>
                <a href={explorerHref(result.family, result.items[selected].subset, result.items[selected].combo, Math.min(result.result.level, 5))}>Open in the Explorer ↗</a>
                <button type="button" className="centremap-close" onClick={() => setSelected(null)} aria-label="Close">
                  ×
                </button>
              </h2>
              <p className="muted">
                {result.result.counts[selected].all.toLocaleString('en-US')} circuit centres,{' '}
                {result.result.counts[selected].inside.toLocaleString('en-US')} inside the window
                {groupOf[selected] >= 0 ? ` · group ${groupOf[selected] + 1}` : ''}.
              </p>
              <div className="centremap-thumbs">
                {(['strands', 'centres'] as const).map((view) => (
                  <Thumb
                    key={view}
                    client={thumbs}
                    family={result.family}
                    level={result.result.level}
                    item={result.items[selected]}
                    dark={dark}
                    view={view}
                    caption={view}
                    onPick={() => setMagnified({ at: 0, view })}
                  />
                ))}
              </div>
              <h3>Closest (average of both directions)</h3>
              <div className="centremap-thumbs">
                {nearest.map((b, k) => (
                  <Thumb
                    key={b}
                    client={thumbs}
                    family={result.family}
                    level={result.result.level}
                    item={result.items[b]}
                    dark={dark}
                    view="centres"
                    caption={`${label(b)} · ${dist(selected, b).toFixed(2)} / ${dist(b, selected).toFixed(2)}`}
                    onPick={() => setMagnified({ at: k + 1, view: 'centres' })}
                  />
                ))}
              </div>
              {magnified && (
                <Magnifier
                  client={thumbs}
                  family={result.family}
                  level={result.result.level}
                  dark={dark}
                  list={[selected, ...nearest]}
                  at={magnified.at}
                  view={magnified.view}
                  item={(i) => result.items[i]}
                  label={label}
                  note={(i) =>
                    i === selected
                      ? 'the selected pairing'
                      : `${dist(selected, i).toFixed(2)} tiles from it, ${dist(i, selected).toFixed(2)} back`
                  }
                  href={(i) => explorerHref(result.family, result.items[i].subset, result.items[i].combo, Math.min(result.result.level, 5))}
                  onMove={(at, view) => setMagnified({ at, view })}
                  onSelect={(i) => {
                    setMagnified(null);
                    setSelected(i);
                  }}
                  onClose={() => setMagnified(null)}
                />
              )}
            </section>
          )}
        </>
      )}
    </article>
  );
}

function Scatter(props: {
  embedding: Float32Array;
  n: number;
  colourOf: (i: number) => string;
  matches: readonly boolean[] | null;
  hover: number | null;
  selected: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
  label: (i: number) => string;
  selecting: boolean;
  picked: readonly number[] | null;
  onBox: (picked: readonly number[]) => void;
}): JSX.Element {
  const { embedding, n, colourOf, matches, hover, selected, onHover, onPick, label, selecting, picked, onBox } = props;
  const pickedSet = useMemo(() => (picked ? new Set(picked) : null), [picked]);
  const pts = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, embedding[i * 2]);
      maxX = Math.max(maxX, embedding[i * 2]);
      minY = Math.min(minY, embedding[i * 2 + 1]);
      maxY = Math.max(maxY, embedding[i * 2 + 1]);
    }
    const pad = 16;
    const s = (PLOT - 2 * pad) / Math.max(maxX - minX, maxY - minY, 1e-9);
    return Array.from({ length: n }, (_, i) => ({ x: pad + (embedding[i * 2] - minX) * s, y: pad + (embedding[i * 2 + 1] - minY) * s }));
  }, [embedding, n]);
  // Matches draw last, on top.
  const order = useMemo(() => {
    const idx = Array.from({ length: n }, (_, i) => i);
    return matches ? idx.sort((a, b) => Number(matches[a]) - Number(matches[b])) : idx;
  }, [matches, n]);
  return (
    <div className="centremap-scatter">
      <PanZoom className="centremap-zoom" fitBounds={PLOT_BOX} padding={0} maxScale={60} showControls ariaLabel="UMAP: wheel or pinch to zoom, drag to pan">
        {(api) => {
          const k = api.camera.scale || 1;
          return (
            <>
              <svg data-testid="centremap-umap" onMouseLeave={() => onHover(null)}>
              <g transform={`translate(${api.camera.x} ${api.camera.y}) scale(${k})`}>
                {order.map((i) => {
                  const on = (!matches || matches[i]) && (!pickedSet || pickedSet.has(i));
                  // Radii and strokes in screen pixels, whatever the zoom.
                  return (
                    <circle
                      key={i}
                      cx={pts[i].x}
                      cy={pts[i].y}
                      r={(i === selected ? 7 : on && matches ? 5.5 : 4.5) / k}
                      fill={colourOf(i)}
                      opacity={on ? 0.9 : 0.12}
                      stroke={i === selected || i === hover ? 'var(--text)' : pickedSet?.has(i) ? 'var(--accent)' : 'none'}
                      strokeWidth={1.5 / k}
                      data-index={i}
                      data-panzoom-ignore=""
                      onMouseEnter={() => onHover(i)}
                      onClick={() => onPick(i)}
                    >
                      <title>{label(i)}</title>
                    </circle>
                  );
                })}
              </g>
              </svg>
              {selecting && (
                <BoxSelect
                  testid="centremap-umap-box"
                  onBox={(b) => {
                    const k2 = api.camera.scale || 1;
                    const x0 = (b.x0 - api.camera.x) / k2;
                    const x1 = (b.x1 - api.camera.x) / k2;
                    const y0 = (b.y0 - api.camera.y) / k2;
                    const y1 = (b.y1 - api.camera.y) / k2;
                    onBox(pts.map((p, i) => (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 ? i : -1)).filter((i) => i >= 0));
                  }}
                />
              )}
            </>
          );
        }}
      </PanZoom>
      <p className="mono centremap-hover" data-testid="centremap-hover">
        {hover !== null ? label(hover) : ' '}
      </p>
    </div>
  );
}

function Heatmap(props: {
  matrix: Float32Array;
  n: number;
  rows: readonly number[];
  cols: readonly number[];
  matches: readonly boolean[] | null;
  label: (i: number) => string;
  onPick: (i: number) => void;
  selecting: boolean;
  picked: readonly number[] | null;
  onBox: (picked: readonly number[]) => void;
}): JSX.Element {
  const { matrix, n, rows, cols, matches, label, onPick, selecting, picked, onBox } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !n) return;
    // Colour by rank (percentile), so a few huge distances don't wash out the rest.
    const vals = Array.from(matrix).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    const q = (v: number) => {
      let lo = 0;
      let hi = vals.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (vals[mid] < v) lo = mid + 1;
        else hi = mid;
      }
      return vals.length ? lo / vals.length : 0;
    };
    const img = ctx.createImageData(n, n);
    // A selection (from either chart) keeps its rows and columns bright and dims the rest.
    const isPicked = new Uint8Array(n);
    for (const i of picked ?? []) isPicked[i] = 1;
    for (let r = 0; r < n; r++) {
      const a = rows[r];
      for (let c = 0; c < n; c++) {
        const dim = (matches && !matches[a]) || (picked && !isPicked[a] && !isPicked[cols[c]]);
        const v = matrix[a * n + cols[c]];
        const t = Number.isFinite(v) ? 1 - q(v) : 0; // near = bright
        const p = (r * n + c) * 4;
        img.data[p] = Math.round(20 + 235 * t);
        img.data[p + 1] = Math.round(30 + 200 * t * t);
        img.data[p + 2] = Math.round(70 + 120 * (1 - t));
        img.data[p + 3] = dim ? 60 : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [matrix, n, rows, cols, matches, picked]);
  // The canvas is scaled and moved by the camera, so its on-screen box is
  // where the cells are.
  const cell = (clientX: number, clientY: number): [number, number] | null => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    const c = Math.floor(((clientX - rect.left) / rect.width) * n);
    const r = Math.floor(((clientY - rect.top) / rect.height) * n);
    return r >= 0 && c >= 0 && r < n && c < n ? [rows[r], cols[c]] : null;
  };
  const box = useMemo(() => ({ min: { x: 0, y: 0 }, max: { x: n, y: n } }), [n]);
  // A press that moved is a pan, not a pick.
  const pressed = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="centremap-heat"
      onPointerDownCapture={(e) => (pressed.current = { x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setHover(cell(e.clientX, e.clientY))}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => {
        const p = pressed.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) return;
        const hit = cell(e.clientX, e.clientY);
        if (hit) onPick(hit[0]);
      }}
    >
      <PanZoom className="centremap-zoom" fitBounds={box} fitKey={String(n)} padding={0} maxScale={400} showControls ariaLabel="Heatmap: wheel or pinch to zoom, drag to pan">
        {(api) => (
          <>
            <canvas
              ref={canvas}
              width={n}
              height={n}
              data-testid="centremap-heatmap"
              style={{
                width: n,
                height: n,
                transform: `translate(${api.camera.x}px, ${api.camera.y}px) scale(${api.camera.scale})`,
              }}
            />
            {selecting && (
              <BoxSelect
                testid="centremap-heat-box"
                onBox={(b) => {
                  // The box's corners in cells, clamped to the matrix: its rows and its columns.
                  const rect = canvas.current?.getBoundingClientRect();
                  if (!rect?.width) return;
                  const at = (v: number, lo: number, len: number) => Math.min(n - 1, Math.max(0, Math.floor(((v - lo) / len) * n)));
                  const c0 = at(b.cx0, rect.left, rect.width);
                  const c1 = at(b.cx1, rect.left, rect.width);
                  const r0 = at(b.cy0, rect.top, rect.height);
                  const r1 = at(b.cy1, rect.top, rect.height);
                  const out = new Set<number>();
                  for (let r = r0; r <= r1; r++) out.add(rows[r]);
                  for (let c = c0; c <= c1; c++) out.add(cols[c]);
                  onBox([...out]);
                }}
              />
            )}
          </>
        )}
      </PanZoom>
      <p className="muted centremap-note">
        {hover
          ? `${label(hover[0])} → ${label(hover[1])}: ${matrix[hover[0] * n + hover[1]].toFixed(2)} tiles`
          : 'Row A, column B: how far A’s centres are from B’s, bright = near. Rows and columns each in the order chosen above. Wheel or pinch to zoom, drag to pan; click a row to pick it.'}
      </p>
    </div>
  );
}

function Thumb(props: {
  client: FaultLinesClient;
  family: TileFamilyId;
  level: number;
  item: Item;
  dark: boolean;
  view: 'strands' | 'centres';
  caption: string;
  onPick?: () => void;
  size?: number;
}): JSX.Element {
  const { client, family, level, item, dark, view, caption, onPick, size = THUMB } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    client
      .thumb({ family, level, subset: item.subset, combo: item.combo, size, dark, view }, abort.signal)
      .then((rgba) => {
        const ctx = abort.signal.aborted ? null : canvas.current?.getContext('2d');
        if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), size, size), 0, 0);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [client, family, level, item, dark, view, size]);
  const img = <canvas ref={canvas} width={size} height={size} aria-label={caption} />;
  return (
    <figure className="centremap-thumb">
      {onPick ? (
        <button type="button" onClick={onPick} title={caption}>
          {img}
        </button>
      ) : (
        img
      )}
      <figcaption className="mono">{caption}</figcaption>
    </figure>
  );
}

/**
 * A pairing magnified in a modal, stepping through the selected pairing and
 * its closest ones (‹ › or ← →), switching strands and centres (or V), and
 * closing on Esc or a click outside.
 */
function Magnifier(props: {
  client: FaultLinesClient;
  family: TileFamilyId;
  level: number;
  dark: boolean;
  list: readonly number[];
  at: number;
  view: 'strands' | 'centres';
  item: (i: number) => Item;
  label: (i: number) => string;
  note: (i: number) => string;
  href: (i: number) => string;
  onMove: (at: number, view: 'strands' | 'centres') => void;
  onSelect: (i: number) => void;
  onClose: () => void;
}): JSX.Element {
  const { client, family, level, dark, list, at, view, item, label, note, href, onMove, onSelect, onClose } = props;
  const i = list[at];
  const step = (d: number) => onMove((at + d + list.length) % list.length, view);
  const flip = () => onMove(at, view === 'strands' ? 'centres' : 'strands');
  const keys = useRef({ step, flip, onClose });
  keys.current = { step, flip, onClose };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') keys.current.onClose();
      else if (e.key === 'ArrowLeft') keys.current.step(-1);
      else if (e.key === 'ArrowRight') keys.current.step(1);
      else if (e.key === 'v' || e.key === 'V') keys.current.flip();
      else return;
      e.preventDefault();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);
  // Portalled to the body, so no ancestor's stacking (the sticky site header) sits over it.
  return createPortal(
    <div className="centremap-modal" role="dialog" aria-modal="true" aria-label={`${label(i)}, magnified`} data-testid="centremap-magnifier" onClick={onClose}>
      <div className="centremap-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="centremap-modal-head">
          <button type="button" onClick={() => step(-1)} aria-label="Previous pairing">
            ‹
          </button>
          <span className="mono" data-testid="centremap-magnifier-label">
            {label(i)}
          </span>
          <button type="button" onClick={() => step(1)} aria-label="Next pairing">
            ›
          </button>
          <span className="muted" data-testid="centremap-magnifier-position">
            {at + 1} / {list.length} · {note(i)}
          </span>
          <span className="centremap-modal-views" role="group" aria-label="Show">
            {(['strands', 'centres'] as const).map((v) => (
              <button key={v} type="button" className={v === view ? 'is-on' : undefined} aria-pressed={v === view} onClick={() => onMove(at, v)}>
                {v}
              </button>
            ))}
          </span>
          <button type="button" className="centremap-close" onClick={onClose} aria-label="Close magnifier">
            ×
          </button>
        </div>
        <div className="centremap-modal-stage">
          <Thumb client={client} family={family} level={level} item={item(i)} dark={dark} view={view} caption={`${label(i)} · ${view}`} size={BIG} />
        </div>
        <div className="centremap-modal-foot">
          <span className="muted">← → step · V switches strands and centres · Esc closes</span>
          {at > 0 && (
            <button type="button" onClick={() => onSelect(i)}>
              Select this pairing
            </button>
          )}
          <a href={href(i)}>Open in the Explorer ↗</a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Drag a box over a chart. Covers the chart while selecting (so the drag isn't
 * a pan) and reports the box in the overlay's own pixels and in client
 * pixels, corners ordered.
 */
function BoxSelect(props: {
  testid: string;
  onBox: (b: { x0: number; y0: number; x1: number; y1: number; cx0: number; cy0: number; cx1: number; cy1: number }) => void;
}): JSX.Element {
  const { testid, onBox } = props;
  const host = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const local = (e: React.PointerEvent) => {
    const r = host.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  return (
    <div
      ref={host}
      className="centremap-box"
      data-panzoom-ignore=""
      data-testid={testid}
      onPointerDown={(e) => {
        const p = local(e);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        const p = local(e);
        setDrag({ ...drag, x1: p.x, y1: p.y });
      }}
      onPointerUp={() => {
        if (!drag) return;
        setDrag(null);
        const r = host.current!.getBoundingClientRect();
        const x0 = Math.min(drag.x0, drag.x1);
        const x1 = Math.max(drag.x0, drag.x1);
        const y0 = Math.min(drag.y0, drag.y1);
        const y1 = Math.max(drag.y0, drag.y1);
        if (x1 - x0 < 3 && y1 - y0 < 3) return;
        onBox({ x0, y0, x1, y1, cx0: x0 + r.left, cy0: y0 + r.top, cx1: x1 + r.left, cy1: y1 + r.top });
      }}
    >
      {drag && (
        <div
          className="centremap-box-rect"
          style={{
            left: Math.min(drag.x0, drag.x1),
            top: Math.min(drag.y0, drag.y1),
            width: Math.abs(drag.x1 - drag.x0),
            height: Math.abs(drag.y1 - drag.y0),
          }}
        />
      )}
    </div>
  );
}

/**
 * The pairings picked out by a box: per rule, one combination string with '?'
 * where they differ (hover a digit for the values it takes), all their strands
 * overlaid on the patch, and every tile with all the paths they draw on it.
 */
function SelectionPanel(props: {
  family: TileFamilyId;
  level: number;
  items: readonly Item[];
  client: FaultLinesClient;
  dark: boolean;
  onClear: () => void;
}): JSX.Element {
  const { family, level, items, client, dark, onClear } = props;
  const patterns = useMemo(() => selectionPatterns(family, items), [family, items]);
  const [hoverDigit, setHoverDigit] = useState<{ rule: string; position: number } | null>(null);
  /** What the patch shows: -1 for everything overlaid, else one selected pairing. */
  const [at, setAt] = useState(-1);
  useEffect(() => setAt(-1), [items]);
  // ← → step through: all overlaid, then each pairing, and round again.
  const step = useRef<(d: number) => void>(() => {});
  step.current = (d: number) => setAt((a) => ((a + 1 + d + items.length + 1) % (items.length + 1)) - 1);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, select, textarea, [contenteditable="true"], .join-picker')) return;
      if (globalThis.document?.querySelector('.centremap-modal')) return; // the magnifier has the keys
      e.preventDefault();
      step.current(e.key === 'ArrowLeft' ? -1 : 1);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);
  const spread = hoverDigit ? patterns.find((p) => p.rule === hoverDigit.rule)?.spread[hoverDigit.position] : undefined;
  const types = leafOrder(family);
  return (
    <section className="centremap-selected" aria-labelledby="centremap-picked-h" data-testid="centremap-picked">
      <h2 id="centremap-picked-h">
        {items.length} pairing{items.length === 1 ? '' : 's'} selected
        <button type="button" className="centremap-close" onClick={onClear} aria-label="Clear selection">
          ×
        </button>
      </h2>
      <ul className="centremap-patterns" data-testid="centremap-patterns">
        {patterns.map((p) => (
          <li key={p.rule}>
            <span className="mono centremap-pattern-rule">{p.rule}</span>
            <span className="mono centremap-pattern" onMouseLeave={() => setHoverDigit(null)}>
              {[...p.pattern].map((ch, i) => (
                <span
                  key={i}
                  className={ch === '?' ? 'is-wild' : undefined}
                  data-position={i}
                  onMouseEnter={() => setHoverDigit({ rule: p.rule, position: i })}
                  title={`${types[i]}: ${p.spread[i].values.map((v) => `${v.digit} ×${v.count}`).join(', ')}`}
                >
                  {ch}
                </span>
              ))}
            </span>
            <span className="muted"> ×{p.count}</span>
          </li>
        ))}
      </ul>
      <p className="muted centremap-note" data-testid="centremap-spread">
        {spread
          ? `${hoverDigit!.rule}, digit ${spread.position + 1} (${spread.type}): ${spread.values.map((v) => `${v.digit} ×${v.count}`).join(' · ')}`
          : 'Hover a digit to see the values it takes across the selection; ? marks the ones that vary.'}
      </p>
      <div className="centremap-overlays">
        <figure className="centremap-overlay">
          <div className="centremap-overlay-head">
            <span className="centremap-modal-views" role="group" aria-label="Show">
              <button type="button" className={at < 0 ? 'is-on' : undefined} aria-pressed={at < 0} onClick={() => setAt(-1)} data-testid="centremap-overlay-all">
                all overlaid
              </button>
              <button type="button" className={at >= 0 ? 'is-on' : undefined} aria-pressed={at >= 0} onClick={() => setAt(at >= 0 ? at : 0)} data-testid="centremap-overlay-one">
                one at a time
              </button>
            </span>
            <button type="button" onClick={() => step.current(-1)} aria-label="Previous pattern">
              ‹
            </button>
            <span className="mono" data-testid="centremap-overlay-label">
              {at < 0 ? `all ${items.length}` : `${at + 1} / ${items.length} · ${items[at].rule} · ${items[at].combo}`}
            </span>
            <button type="button" onClick={() => step.current(1)} aria-label="Next pattern">
              ›
            </button>
          </div>
          <OverlayBoard client={client} family={family} level={level} items={items} dark={dark} at={at} />
          <figcaption className="muted">
            {at < 0
              ? 'Every selected pairing’s strands on the patch: faint blue where a few pass, yellow where all do.'
              : 'One selected pairing, its circuits coloured by size like the thumbnails.'}{' '}
            ← → flick through all of them and each one; wheel or pinch to zoom, drag to pan.
          </figcaption>
        </figure>
        <div className="centremap-tiles" data-testid="centremap-tiles">
          {types.map((t) => (
            <TileChords key={t} family={family} type={t} items={items} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** The overlay's render size: big enough to zoom into a level-5 patch. */
const OVERLAY = 1600;
const OVERLAY_BOX = { min: { x: 0, y: 0 }, max: { x: OVERLAY, y: OVERLAY } };

/**
 * The selection on the patch: all of it overlaid (`at` = -1), or one pairing
 * (`at` = its index), drawn in the frame that fits every selected rule so
 * flicking between them keeps the patch still.
 */
function OverlayBoard(props: { client: FaultLinesClient; family: TileFamilyId; level: number; items: readonly Item[]; dark: boolean; at: number }): JSX.Element {
  const { client, family, level, items, dark, at } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const frameSubsets = useMemo(() => [...new Map(items.map((it) => [it.rule, it.subset])).values()], [items]);
  useEffect(() => {
    const abort = new AbortController();
    const one = at >= 0 ? items[at] : null;
    const first = one ?? items[0];
    client
      .thumb(
        {
          family,
          level,
          subset: first.subset,
          combo: first.combo,
          size: OVERLAY,
          dark,
          view: 'strands',
          frameSubsets,
          vivid: true,
          ...(one ? {} : { overlay: items.map((it) => ({ subset: it.subset, combo: it.combo })) }),
        },
        abort.signal,
      )
      .then((rgba) => {
        const ctx = abort.signal.aborted ? null : canvas.current?.getContext('2d');
        if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), OVERLAY, OVERLAY), 0, 0);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [client, family, level, items, dark, at, frameSubsets]);
  return (
    <PanZoom className="centremap-zoom centremap-overlay-zoom" fitBounds={OVERLAY_BOX} padding={0} maxScale={8} showControls ariaLabel="Overlay: wheel or pinch to zoom, drag to pan">
      {(api) => (
        <canvas
          ref={canvas}
          width={OVERLAY}
          height={OVERLAY}
          data-testid="centremap-overlay"
          aria-label={at >= 0 ? `${items[at].rule} · ${items[at].combo}` : 'All selected pairings overlaid'}
          style={{
            width: OVERLAY,
            height: OVERLAY,
            transform: `translate(${api.camera.x}px, ${api.camera.y}px) scale(${api.camera.scale})`,
          }}
        />
      )}
    </PanZoom>
  );
}

/** One tile with every chord the selection draws on it: thicker and stronger the more pairings draw it. */
function TileChords(props: { family: TileFamilyId; type: TileTypeId; items: readonly Item[] }): JSX.Element {
  const { family, type, items } = props;
  const outline = leafPts(family, type);
  const chords = useMemo(() => selectionTileChords(family, items, type), [family, items, type]);
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = span * 0.08;
  const sw = span / 70;
  const n = items.length;
  return (
    <figure className="centremap-tile">
      <svg viewBox={`${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`}>
        <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} className="tile-editor-body" />
        {chords.map((c, i) => (
          <line
            key={i}
            x1={c.a.x}
            y1={c.a.y}
            x2={c.b.x}
            y2={c.b.y}
            stroke="var(--accent)"
            strokeWidth={sw * (1 + 3 * (c.count / n))}
            strokeOpacity={0.25 + 0.75 * (c.count / n)}
            strokeLinecap="round"
          >
            <title>{`${c.count} of ${n}`}</title>
          </line>
        ))}
      </svg>
      <figcaption>
        {type} <span className="muted">· {chords.length} path{chords.length === 1 ? '' : 's'}</span>
      </figcaption>
    </figure>
  );
}
