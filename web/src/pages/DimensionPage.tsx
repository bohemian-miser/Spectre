/**
 * Dimension: how each strand rule's patterns grow with the supertile level.
 *
 * Every combination of a rule's pairings is measured at a few supertile levels
 * (`core/scaling.ts`): its longest strand, closed or still open, and how fast
 * that grows against the patch's own growth. The ratio of logs is the strands'
 * dimension, which sorts the patterns: bounded circuits (0), curves that just
 * get bigger (about 1), fractal ones, and space-filling ones (about 2).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LINK_STATE,
  comboToMatchingIndices,
  encodeExplorerState,
  rulePairings,
  validEdgeSubsets,
  type GrowthKind,
  type Scaling,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { createScalingClient } from '../workers/scalingClient';
import '../styles/dimension.css';

const FAMILIES: readonly { id: TileFamilyId; label: string }[] = [
  { id: 'spectre', label: 'Spectres' },
  { id: 'hex', label: 'Hexagons' },
];
const DEEPEST = [4, 5, 6] as const;
/** Rules with more pairings than this are sampled at random. */
const SAMPLE = 200;
const SHOWN = 400;

interface Row {
  readonly rule: string;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly scaling?: Scaling;
  readonly error?: string;
}

type SortKey = 'dimension' | 'growth' | 'longest' | 'rule' | 'onCircuits';

const KIND_LABEL: Record<GrowthKind, string> = {
  bounded: 'bounded',
  steady: 'steady',
  bursty: 'in bursts',
};

/** A name for where d falls. */
export function dimensionBand(s: Scaling): string {
  if (s.kind === 'bounded' || s.dimension < 0.25) return 'bounded circuits';
  if (s.dimension < 1.3) return 'curves';
  if (s.dimension < 1.85) return 'fractal';
  return 'space-filling';
}

function explorerHref(family: TileFamilyId, root: TileTypeId, subset: readonly number[], combo: string, level: number): string {
  const q = encodeExplorerState({
    ...DEFAULT_LINK_STATE,
    family,
    rootTile: root,
    level,
    subset,
    matching: comboToMatchingIndices(family, subset, combo),
  });
  return `${import.meta.env.BASE_URL}#/explorer?${q.toString()}`;
}

export default function DimensionPage(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('spectre');
  const [deepest, setDeepest] = useState<number>(4);
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [sort, setSort] = useState<SortKey>('dimension');
  const [ruleFilter, setRuleFilter] = useState<string>('all');
  const client = useMemo(() => createScalingClient(), []);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => client.dispose(), [client]);

  const root: TileTypeId = 'Delta';
  const levels = useMemo(() => Array.from({ length: deepest - 1 }, (_, i) => i + 2), [deepest]);

  const plan = useMemo(() => {
    const out: Row[] = [];
    const totals: { rule: string; total: number; measured: number }[] = [];
    for (const s of validEdgeSubsets(family)) {
      if (!s.edges.length) continue;
      const rule = s.edges.join('');
      const { combos, total } = rulePairingsFor(family, s.edges);
      totals.push({ rule, total, measured: combos.length });
      for (const combo of combos) out.push({ rule, subset: s.edges, combo });
    }
    return { rows: out, totals };
  }, [family]);

  const start = () => {
    cancelRef.current?.();
    setRows(plan.rows);
    setDone(0);
    setRunning(true);
    cancelRef.current = client.run(
      { family, root, levels, rows: plan.rows.map((r) => ({ subset: r.subset, combo: r.combo })) },
      {
        onRow: (i, scaling) => {
          setRows((cur) => cur.map((r, k) => (k === i ? { ...r, scaling } : r)));
          setDone((n) => n + 1);
        },
        onError: (i, error) => {
          setRows((cur) => cur.map((r, k) => (k === i ? { ...r, error } : r)));
          setDone((n) => n + 1);
        },
        onDone: () => setRunning(false),
      },
    );
  };
  const stop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setRunning(false);
  };
  // A new family or depth makes old rows meaningless.
  useEffect(() => {
    stop();
    setRows([]);
    setDone(0);
    // stop only touches refs and setters.
  }, [family, deepest]);

  const measured = rows.filter((r) => r.scaling);
  const summary = useMemo(() => {
    type Entry = { n: number; bands: Map<string, number>; maxD: number; best?: Row };
    const by = new Map<string, Entry>();
    for (const r of measured) {
      const e: Entry = by.get(r.rule) ?? { n: 0, bands: new Map<string, number>(), maxD: -1 };
      e.n++;
      const band = dimensionBand(r.scaling!);
      e.bands.set(band, (e.bands.get(band) ?? 0) + 1);
      if (r.scaling!.dimension > e.maxD) {
        e.maxD = r.scaling!.dimension;
        e.best = r;
      }
      by.set(r.rule, e);
    }
    return by;
  }, [measured]);

  const shown = useMemo(() => {
    const value = (r: Row): number => {
      const s = r.scaling!;
      if (sort === 'dimension') return s.dimension;
      if (sort === 'growth') return s.growth;
      if (sort === 'longest') return s.levels[s.levels.length - 1].longest;
      if (sort === 'onCircuits') return s.levels[s.levels.length - 1].onCircuits;
      return 0;
    };
    const list = measured.filter((r) => ruleFilter === 'all' || r.rule === ruleFilter);
    if (sort === 'rule') list.sort((a, b) => a.rule.localeCompare(b.rule) || a.combo.localeCompare(b.combo));
    else list.sort((a, b) => value(b) - value(a) || a.rule.localeCompare(b.rule));
    return list.slice(0, SHOWN);
  }, [measured, sort, ruleFilter]);

  const header = (key: SortKey, label: string, title?: string) => (
    <th scope="col" title={title}>
      <button type="button" className={sort === key ? 'is-sorted' : undefined} onClick={() => setSort(key)}>
        {label}
        {sort === key ? ' ↓' : ''}
      </button>
    </th>
  );

  return (
    <article className="dimension-page">
      <header>
        <h1>Dimension of the patterns</h1>
        <p className="muted">
          Each rule and pairing is drawn on supertiles of growing level, and its longest strand measured, closed or still
          running off the patch. Each level makes the patch about 2.8 times wider; if the longest strand grows by a factor
          g per level, its <b>dimension</b> is <span className="mono">d = log g / log 2.8</span>. Circuits of bounded size
          have d = 0, curves that just get bigger d ≈ 1, and strands that fill area d ≈ 2; fractal ones fall in between.
          &ldquo;In bursts&rdquo; means the big strands only grow every other level. A d above 2 is a strand still being cut
          off by the patch's edge, growing faster than it can for long; measuring deeper levels brings it down.
        </p>
      </header>

      <div className="dimension-controls" role="group" aria-label="Measurement">
        <label>
          Tiles
          <select value={family} onChange={(e) => setFamily(e.target.value as TileFamilyId)} data-testid="dimension-family">
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Up to level
          <select value={deepest} onChange={(e) => setDeepest(Number(e.target.value))} data-testid="dimension-deepest">
            {DEEPEST.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        {running ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="primary" onClick={start} data-testid="dimension-start">
            Measure {plan.rows.length.toLocaleString('en-US')} pairings
          </button>
        )}
        <span className="muted" data-testid="dimension-progress">
          {rows.length ? `${done.toLocaleString('en-US')} of ${rows.length.toLocaleString('en-US')} measured` : ''}
          {running ? '…' : ''}
        </span>
      </div>
      <p className="muted dimension-note">
        Levels {levels.join(', ')}, rooted at a {root}. Rules with more than {SAMPLE} pairings are sampled at random:{' '}
        {plan.totals
          .filter((t) => t.measured < t.total)
          .map((t) => `${t.rule} (${t.measured} of ${t.total.toLocaleString('en-US')})`)
          .join(', ') || 'none here'}
        . Only non-crossing pairings are measured.
      </p>

      {summary.size > 0 && (
        <section aria-labelledby="dimension-rules-h">
          <h2 id="dimension-rules-h">By rule</h2>
          <table className="dimension-table" data-testid="dimension-rules">
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Pairings</th>
                <th scope="col">Bounded</th>
                <th scope="col">Curves</th>
                <th scope="col">Fractal</th>
                <th scope="col">Space-filling</th>
                <th scope="col">Highest d</th>
              </tr>
            </thead>
            <tbody>
              {[...summary.entries()].map(([rule, e]) => (
                <tr key={rule} className={ruleFilter === rule ? 'is-selected' : undefined} onClick={() => setRuleFilter(ruleFilter === rule ? 'all' : rule)}>
                  <th scope="row" className="mono">
                    {rule}
                  </th>
                  <td>{e.n}</td>
                  {['bounded circuits', 'curves', 'fractal', 'space-filling'].map((b) => (
                    <td key={b} className={e.bands.get(b) ? undefined : 'is-zero'}>
                      {e.bands.get(b) ?? '·'}
                    </td>
                  ))}
                  <td>
                    {e.best ? (
                      <a href={explorerHref(family, root, e.best.subset, e.best.combo, Math.min(deepest, 5))}>{e.maxD.toFixed(2)}</a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted dimension-note">Click a rule to list only its pairings; click its highest d to open that pairing in the Explorer.</p>
        </section>
      )}

      {shown.length > 0 && (
        <section aria-labelledby="dimension-rows-h">
          <h2 id="dimension-rows-h">
            Pairings{ruleFilter !== 'all' ? ` of ${ruleFilter}` : ''} ({shown.length < measured.length ? `top ${shown.length}` : shown.length})
          </h2>
          <table className="dimension-table" data-testid="dimension-rows">
            <thead>
              <tr>
                {header('rule', 'Rule')}
                <th scope="col">Pairing</th>
                <th scope="col" title="Longest strand, closed or open, at each level">
                  Longest strand by level
                </th>
                {header('growth', '× per level')}
                {header('dimension', 'd')}
                <th scope="col">Kind</th>
                {header('onCircuits', 'On circuits', 'Share of strand length on closed circuits at the deepest level')}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const s = r.scaling!;
                const last = s.levels[s.levels.length - 1];
                return (
                  <tr key={`${r.rule}-${r.combo}`} data-band={dimensionBand(s)}>
                    <td className="mono">{r.rule}</td>
                    <td className="mono">
                      <a href={explorerHref(family, root, r.subset, r.combo, Math.min(deepest, 5))}>{r.combo}</a>
                    </td>
                    <td className="mono dimension-levels">{s.levels.map((l) => l.longest).join(' → ')}</td>
                    <td>{s.growth.toFixed(2)}</td>
                    <td>
                      <b>{s.dimension.toFixed(2)}</b> <span className="muted">{dimensionBand(s)}</span>
                    </td>
                    <td>{KIND_LABEL[s.kind]}</td>
                    <td>{Math.round(last.onCircuits * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </article>
  );
}

/** Every pairing of a rule, or a random sample of {@link SAMPLE} when there are more. */
function rulePairingsFor(family: TileFamilyId, subset: readonly number[]): { combos: string[]; total: number } {
  // A fixed seed, so the sample is the same each time the page opens.
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return rulePairings(family, subset, SAMPLE, random);
}
