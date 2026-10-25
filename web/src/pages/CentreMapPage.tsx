/**
 * Centre map: every pairing of every rule (but the all-edges one), compared
 * by where its circuits' centres are.
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
import {
  DEFAULT_EXPLORER_STATE,
  clusterBySimilarity,
  comboToMatchingIndices,
  encodeExplorerState,
  matchesJoins,
  matchesPattern,
  rulePairings,
  seriate,
  validEdgeSubsets,
  type EdgeJoin,
  type TileFamilyId,
} from '../core';
import { JoinPicker } from '../components/JoinPicker';
import { usePrefersDark } from '../hooks/usePrefersDark';
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
const MAX_PER_RULE = 2000;
const PLOT = 520;
const THUMB = 160;
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

type HeatOrder = 'similar' | 'groups' | 'pairings';
const HEAT_ORDERS: readonly { id: HeatOrder; label: string }[] = [
  { id: 'similar', label: 'similar next to similar' },
  { id: 'groups', label: 'by group' },
  { id: 'pairings', label: 'rule by rule' },
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
  const [heatOrder, setHeatOrder] = useState<HeatOrder>('similar');
  const [threshold, setThreshold] = useState(0.9);
  const [ruleFilter, setRuleFilter] = useState('');
  const [pattern, setPattern] = useState('');
  const [joins, setJoins] = useState<readonly EdgeJoin[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
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

  const plan = useMemo(() => {
    const rules = validEdgeSubsets(family).filter((s) => s.edges.length);
    const all = rules[rules.length - 1]?.edges.length ?? 0;
    const items: Item[] = [];
    const used: { subset: readonly number[]; combos: string[] }[] = [];
    rules
      .filter((s) => s.edges.length < all)
      .forEach((s, ruleIndex) => {
        const { combos } = rulePairings(family, s.edges, MAX_PER_RULE);
        used.push({ subset: s.edges, combos });
        for (const combo of combos) items.push({ rule: s.edges.join(''), subset: s.edges, combo, ruleIndex });
      });
    return { items, rules: used };
  }, [family]);

  const start = () => {
    cancelRef.current?.();
    setError(null);
    setSelected(null);
    setJoins([]);
    setProgress({ phase: 'centres', done: 0, total: plan.items.length });
    const items = plan.items;
    const fam = family;
    cancelRef.current = client.run(
      { family, level, rules: plan.rules, matchSizes, weightBySize },
      {
        onProgress: (phase, done, total) => setProgress({ phase, done, total }),
        onDone: (r) => {
          setResult({ result: r, items, family: fam });
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
  const order = heatOrder === 'similar' ? similarOrder : heatOrder === 'groups' ? (clustering?.order ?? []) : Array.from({ length: n }, (_, i) => i);

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
          Every pairing of every rule but the all-edges one, drawn on one rooted patch and reduced to its circuits&rsquo;
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
          <button type="button" className="primary" onClick={start} data-testid="centremap-start">
            Compare {plan.items.length.toLocaleString('en-US')} pairings
          </button>
        )}
        <span className="muted" data-testid="centremap-progress">
          {progress ? `${PHASE_LABEL[progress.phase]}… ${progress.phase === 'layout' ? '' : `${progress.done} of ${progress.total}`}` : ''}
          {error ? `Failed: ${error}` : ''}
        </span>
      </div>
      <p className="muted centremap-note">
        Rules: {rules.join(', ')} — {plan.items.length.toLocaleString('en-US')} pairings, all of them non-crossing.
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
              />
            </section>
            <section aria-labelledby="centremap-heat-h">
              <h2 id="centremap-heat-h">Distances, A → B</h2>
              <label className="centremap-order">
                Order
                <select value={heatOrder} onChange={(e) => setHeatOrder(e.target.value as HeatOrder)} data-testid="centremap-order">
                  {HEAT_ORDERS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <Heatmap matrix={result.result.matrix} n={n} order={order} matches={searching ? matches : null} label={label} onPick={setSelected} />
            </section>
          </div>

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
                <Thumb client={thumbs} family={result.family} level={result.result.level} item={result.items[selected]} dark={dark} view="strands" caption="strands" />
                <Thumb client={thumbs} family={result.family} level={result.result.level} item={result.items[selected]} dark={dark} view="centres" caption="centres" />
              </div>
              <h3>Closest (average of both directions)</h3>
              <div className="centremap-thumbs">
                {nearest.map((b) => (
                  <Thumb
                    key={b}
                    client={thumbs}
                    family={result.family}
                    level={result.result.level}
                    item={result.items[b]}
                    dark={dark}
                    view="centres"
                    caption={`${label(b)} · ${dist(selected, b).toFixed(2)} / ${dist(b, selected).toFixed(2)}`}
                    onPick={() => setSelected(b)}
                  />
                ))}
              </div>
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
}): JSX.Element {
  const { embedding, n, colourOf, matches, hover, selected, onHover, onPick, label } = props;
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
      <svg viewBox={`0 0 ${PLOT} ${PLOT}`} data-testid="centremap-umap" onMouseLeave={() => onHover(null)}>
        {order.map((i) => {
          const on = !matches || matches[i];
          return (
            <circle
              key={i}
              cx={pts[i].x}
              cy={pts[i].y}
              r={i === selected ? 7 : on && matches ? 5.5 : 4.5}
              fill={colourOf(i)}
              opacity={on ? 0.9 : 0.12}
              stroke={i === selected || i === hover ? 'var(--text)' : 'none'}
              strokeWidth={1.5}
              data-index={i}
              onMouseEnter={() => onHover(i)}
              onClick={() => onPick(i)}
            >
              <title>{label(i)}</title>
            </circle>
          );
        })}
      </svg>
      <p className="mono centremap-hover" data-testid="centremap-hover">
        {hover !== null ? label(hover) : ' '}
      </p>
    </div>
  );
}

function Heatmap(props: {
  matrix: Float32Array;
  n: number;
  order: readonly number[];
  matches: readonly boolean[] | null;
  label: (i: number) => string;
  onPick: (i: number) => void;
}): JSX.Element {
  const { matrix, n, order, matches, label, onPick } = props;
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
    for (let r = 0; r < n; r++) {
      const a = order[r];
      const dim = matches && !matches[a];
      for (let c = 0; c < n; c++) {
        const v = matrix[a * n + order[c]];
        const t = Number.isFinite(v) ? 1 - q(v) : 0; // near = bright
        const p = (r * n + c) * 4;
        img.data[p] = Math.round(20 + 235 * t);
        img.data[p + 1] = Math.round(30 + 200 * t * t);
        img.data[p + 2] = Math.round(70 + 120 * (1 - t));
        img.data[p + 3] = dim ? 60 : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [matrix, n, order, matches]);
  const cell = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * n);
    return r >= 0 && c >= 0 && r < n && c < n ? [order[r], order[c]] : null;
  };
  return (
    <div className="centremap-heat">
      <canvas
        ref={canvas}
        width={n}
        height={n}
        data-testid="centremap-heatmap"
        onMouseMove={(e) => setHover(cell(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const hit = cell(e);
          if (hit) onPick(hit[0]);
        }}
      />
      <p className="muted centremap-note">
        {hover
          ? `${label(hover[0])} → ${label(hover[1])}: ${matrix[hover[0] * n + hover[1]].toFixed(2)} tiles`
          : 'Row A, column B: how far A’s centres are from B’s, bright = near. Rows and columns in the same order; click a row to pick it.'}
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
}): JSX.Element {
  const { client, family, level, item, dark, view, caption, onPick } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    client
      .thumb({ family, level, subset: item.subset, combo: item.combo, size: THUMB, dark, view }, abort.signal)
      .then((rgba) => {
        const ctx = abort.signal.aborted ? null : canvas.current?.getContext('2d');
        if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), THUMB, THUMB), 0, 0);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [client, family, level, item, dark, view]);
  const img = <canvas ref={canvas} width={THUMB} height={THUMB} aria-label={caption} />;
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
