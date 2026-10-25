/**
 * Fault lines: which pairings put their big circuits in the same places.
 *
 * Every pairing of the chosen rules is drawn on one rooted patch, and each
 * tile is marked by the biggest strand through it, in bands relative to that
 * pairing's longest strand (`core/faultLines.ts`). Two pairings are alike when
 * their bands cover the same tiles, or the same small supertiles; alike ones
 * are grouped, across rules too. Each group shows which tiles' pairings don't
 * matter to it, and which supertile seams (fault lines) its big strands
 * follow.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_EXPLORER_STATE,
  clusterBySimilarity,
  comboToMatchingIndices,
  encodeExplorerState,
  rulePairings,
  sharedDigits,
  validEdgeSubsets,
  type FaultSurvey,
  type TileFamilyId,
} from '../core';
import { usePrefersDark } from '../hooks/usePrefersDark';
import { createFaultLinesClient, type FaultLinesClient } from '../workers/faultLinesClient';
import '../styles/faultlines.css';

const FAMILIES: readonly { id: TileFamilyId; label: string }[] = [
  { id: 'spectre', label: 'Spectres' },
  { id: 'hex', label: 'Hexagons' },
];
const LEVELS = [4, 5] as const;
const PER_RULE = [12, 40, 100] as const;
const GRAINS = [
  { value: 0, label: 'tile by tile' },
  { value: 1, label: 'level-1 supertiles' },
  { value: 2, label: 'level-2 supertiles' },
] as const;
const THUMB = 132;
const THUMBS_SHOWN = 6;
const GROUPS_SHOWN = 16;
const NEAREST = 8;

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

/** Every pairing of a rule, or a fixed random sample of `limit`. */
function pairingsFor(family: TileFamilyId, subset: readonly number[], limit: number): { combos: string[]; total: number } {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return rulePairings(family, subset, limit, random);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function FaultLinesPage(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('spectre');
  const [level, setLevel] = useState<number>(5);
  const [perRule, setPerRule] = useState<number>(40);
  const [grain, setGrain] = useState<number>(1);
  const [threshold, setThreshold] = useState(0.6);
  const [view, setView] = useState<'strands' | 'centres'>('strands');
  const rules = useMemo(() => validEdgeSubsets(family).filter((s) => s.edges.length).map((s) => s.edges.join('')), [family]);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(rules));
  useEffect(() => setChosen(new Set(rules)), [rules]);
  const [survey, setSurvey] = useState<(FaultSurvey & { family: TileFamilyId }) | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const client = useMemo(() => createFaultLinesClient(), []);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => client.dispose(), [client]);
  const dark = usePrefersDark();

  const plan = useMemo(
    () =>
      rules
        .filter((r) => chosen.has(r))
        .map((r) => {
          const subset = [...r].map(Number);
          return { rule: r, subset, ...pairingsFor(family, subset, perRule) };
        }),
    [rules, chosen, family, perRule],
  );
  const planned = plan.reduce((n, r) => n + r.combos.length, 0);

  const start = () => {
    cancelRef.current?.();
    setError(null);
    setSelected(null);
    setProgress({ done: 0, total: planned });
    cancelRef.current = client.survey(
      { family, level, grain, rules: plan.map((r) => ({ subset: r.subset, combos: r.combos })) },
      {
        onProgress: (done, total) => setProgress({ done, total }),
        onDone: (s) => {
          setSurvey({ ...s, family });
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

  const n = survey?.items.length ?? 0;
  const clustering = useMemo(() => (survey && n ? clusterBySimilarity(survey.matrix, n, threshold) : null), [survey, n, threshold]);
  const groups = useMemo(() => clustering?.clusters.filter((c) => c.length > 1) ?? [], [clustering]);
  const loners = useMemo(() => clustering?.clusters.filter((c) => c.length === 1).map((c) => c[0]) ?? [], [clustering]);
  const groupOf = useMemo(() => {
    const out = new Int32Array(n).fill(-1);
    groups.forEach((g, gi) => g.forEach((i) => (out[i] = gi)));
    return out;
  }, [groups, n]);

  const thumbJob = (i: number) => {
    const it = survey!.items[i];
    return { family: survey!.family, level: survey!.level, subset: it.subset, combo: it.combo, size: THUMB, dark, view };
  };
  const nearest = useMemo(() => {
    if (!survey || selected === null) return [];
    return survey.items
      .map((_, j) => j)
      .filter((j) => j !== selected)
      .sort((a, b) => survey.matrix[selected * n + b] - survey.matrix[selected * n + a])
      .slice(0, NEAREST);
  }, [survey, selected, n]);

  const label = (i: number) => `${survey!.items[i].rule} · ${survey!.items[i].combo}`;

  return (
    <article className="faultlines-page">
      <header>
        <h1>Fault lines</h1>
        <p className="muted">
          Whatever the rule, the big circuits keep forming triangles around the same lines: the seams where big supertiles
          meet. This page finds which pairings put their circuits in the same places. Each pairing is drawn on one rooted
          patch and every tile is marked by the biggest strand through it: at least half the longest strand, at least an
          eighth, or at least a fortieth (never counting anything shorter than an eighth of a curve that just spans the
          patch, or 16 segments, so bounded rules have no big strands at all). Two pairings are <b>alike</b> as far as those marks cover the
          same tiles, band by band, or the same small supertiles if you compare more roughly. Alike pairings are grouped, across
          rules too.
        </p>
      </header>

      <div className="faultlines-controls" role="group" aria-label="Survey">
        <label>
          Tiles
          <select value={family} onChange={(e) => setFamily(e.target.value as TileFamilyId)} data-testid="faultlines-family">
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} data-testid="faultlines-level">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pairings per rule
          <select value={perRule} onChange={(e) => setPerRule(Number(e.target.value))} data-testid="faultlines-per-rule">
            {PER_RULE.map((p) => (
              <option key={p} value={p}>
                up to {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compare
          <select value={grain} onChange={(e) => setGrain(Number(e.target.value))} data-testid="faultlines-grain">
            {GRAINS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="faultlines-rules" role="group" aria-label="Rules">
        {plan.length === 0 && <span className="muted">Pick at least one rule.</span>}
        {rules.map((r) => {
          const p = plan.find((x) => x.rule === r);
          return (
            <button
              key={r}
              type="button"
              className={`faultlines-rule mono${chosen.has(r) ? ' is-on' : ''}`}
              aria-pressed={chosen.has(r)}
              onClick={() => {
                const next = new Set(chosen);
                if (next.has(r)) next.delete(r);
                else next.add(r);
                setChosen(next);
              }}
            >
              {r}
              {p && p.combos.length < p.total ? <span className="muted"> {p.combos.length}/{p.total.toLocaleString('en-US')}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="faultlines-controls">
        {progress ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="primary" onClick={start} disabled={!planned} data-testid="faultlines-start">
            Compare {planned.toLocaleString('en-US')} pairings
          </button>
        )}
        <span className="muted" data-testid="faultlines-progress">
          {progress ? `${progress.done.toLocaleString('en-US')} of ${progress.total.toLocaleString('en-US')} placed…` : ''}
          {error ? `Failed: ${error}` : ''}
        </span>
      </div>

      {survey && clustering && (
        <>
          <div className="faultlines-controls">
            <label>
              Group pairings at least
              <input
                type="range"
                min={0.2}
                max={0.95}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                data-testid="faultlines-threshold"
              />
              <b>{pct(threshold)}</b> alike
            </label>
            <label>
              Thumbnails show
              <select value={view} onChange={(e) => setView(e.target.value as 'strands' | 'centres')} data-testid="faultlines-view">
                <option value="strands">strands</option>
                <option value="centres">circuit centres</option>
              </select>
            </label>
            <span className="muted" data-testid="faultlines-summary">
              {n} pairings at level {survey.level}: {groups.length} groups, {loners.length} unlike any other
            </span>
          </div>

          {selected !== null && (
            <section className="faultlines-nearest" aria-labelledby="faultlines-nearest-h" data-testid="faultlines-nearest">
              <h2 id="faultlines-nearest-h">
                Closest to <span className="mono">{label(selected)}</span>
                <button type="button" className="faultlines-close" onClick={() => setSelected(null)} aria-label="Close">
                  ×
                </button>
              </h2>
              <div className="faultlines-thumbs">
                <Thumb client={client} job={thumbJob(selected)} caption={label(selected)} href={explorerHref(survey.family, survey.items[selected].subset, survey.items[selected].combo, Math.min(survey.level, 5))} selected />
                {nearest.map((j) => (
                  <Thumb
                    key={j}
                    client={client}
                    job={thumbJob(j)}
                    caption={`${pct(survey.matrix[selected * n + j])}${groupOf[j] >= 0 ? ` · g${groupOf[j] + 1}` : ''} · ${label(j)}`}
                    onPick={() => setSelected(j)}
                  />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="faultlines-groups-h">
            <h2 id="faultlines-groups-h">Groups</h2>
            <p className="muted faultlines-note">
              Thumbnails are coloured the way they are compared: red strands are at least half the longest, orange an eighth,
              yellow a fortieth, the rest faint. Showing circuit centres instead puts a dot at the average of each closed
              circuit's points, sized by the log of its length and coloured the same way. Click one to list the pairings closest to it. In the digit patterns, · marks a
              tile whose pairing varies inside the group, so it doesn't move the big strands there.
            </p>
            <div className="faultlines-groups" data-testid="faultlines-groups">
              {groups.slice(0, GROUPS_SHOWN).map((g, gi) => (
                <GroupCard
                  key={g.join(',')}
                  index={gi}
                  members={g}
                  survey={survey}
                  client={client}
                  thumbJob={thumbJob}
                  label={label}
                  onPick={setSelected}
                />
              ))}
            </div>
            {groups.length > GROUPS_SHOWN && <p className="muted">…and {groups.length - GROUPS_SHOWN} smaller groups.</p>}
            {loners.length > 0 && (
              <p className="faultlines-loners" data-testid="faultlines-loners">
                <span className="muted">Unlike any other: </span>
                {loners.map((i) => (
                  <button key={i} type="button" className="mono" onClick={() => setSelected(i)}>
                    {label(i)}
                  </button>
                ))}
              </p>
            )}
          </section>

          <section aria-labelledby="faultlines-seams-h">
            <h2 id="faultlines-seams-h">Reading the seams</h2>
            <p className="muted faultlines-note">
              Every tile has an address: its path down the substitution tree. The seam between two tiles has the level of the
              smallest supertile holding both, so the level-k seams are where level-(k−1) supertiles meet: the fault lines.
              Each group's bars say how much likelier a crossing on each level's seams is to sit on a big strand than an
              average crossing; a tall bar at level k means the group's big circuits run across the level-k fault lines. In
              the group-theory picture the addresses are the tree the substitution’s automaton group acts on, each crossing is the
              gluing involution τ acting at that seam's depth, and a strand that keeps crossing higher seams is an orbit of
              ⟨σ, τ⟩ climbing the tree.
            </p>
          </section>

          <section aria-labelledby="faultlines-matrix-h">
            <h2 id="faultlines-matrix-h">How alike, pair by pair</h2>
            <SimilarityMatrix survey={survey} order={clustering.order} groupOf={groupOf} label={label} onPick={setSelected} />
          </section>
        </>
      )}
    </article>
  );
}

function GroupCard(props: {
  index: number;
  members: readonly number[];
  survey: FaultSurvey;
  client: FaultLinesClient;
  thumbJob: (i: number) => Parameters<FaultLinesClient['thumb']>[0];
  label: (i: number) => string;
  onPick: (i: number) => void;
}): JSX.Element {
  const { index, members, survey, client, thumbJob, label, onPick } = props;
  const [all, setAll] = useState(false);
  const items = members.map((i) => survey.items[i]);
  const patterns = sharedDigits(items);
  const L = survey.level;
  // Mean affinity per interior seam level, over members with big strands.
  const affinity = Array.from({ length: L }, (_, s) => {
    const vals = items.map((it) => it.faultAffinity[s + 1]).filter((v) => Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN;
  });
  const big = items.reduce((a, it) => a + it.coverage[1], 0) / items.length;
  const longest = items.map((it) => it.longest).sort((a, b) => a - b);
  const top = Math.max(...affinity.filter((v) => Number.isFinite(v)), 0);
  const follows = affinity.map((v, s) => ({ v, s: s + 1 })).filter((x) => x.v >= 1.25).map((x) => x.s);
  const shown = all ? members : members.slice(0, THUMBS_SHOWN);
  return (
    <div className="faultlines-group" data-testid="faultlines-group">
      <h3>
        Group {index + 1} <span className="muted">· {members.length} pairings</span>
      </h3>
      <ul className="faultlines-patterns">
        {patterns.map((p) => (
          <li key={p.rule}>
            <span className="mono">{p.rule}</span> <span className="mono faultlines-pattern">{p.pattern}</span>
            <span className="muted"> ×{p.count}</span>
          </li>
        ))}
      </ul>
      <p className="faultlines-stats">
        {big > 0 ? (
          <>
            Big strands on {pct(big)} of tiles; longest {longest[0].toLocaleString('en-US')}
            {longest[longest.length - 1] !== longest[0] ? `–${longest[longest.length - 1].toLocaleString('en-US')}` : ''}.
          </>
        ) : (
          <>No big strands: bounded circuits (longest {longest[longest.length - 1]}).</>
        )}
      </p>
      {top > 0 && (
        <div className="faultlines-affinity" title="How much likelier a crossing on each level's seams is to be on a big strand than an average crossing">
          <span className="muted">Seams by level</span>
          {affinity.map((v, s) => (
            <span key={s} className="faultlines-bar" data-strong={v >= 1.25 || undefined}>
              <span style={{ height: `calc((100% - 14px) * ${Number.isFinite(v) ? Math.min(1, v / Math.max(top, 2)) : 0})` }} />
              <small>{s + 1}</small>
            </span>
          ))}
          <span className="muted faultlines-follows">
            {follows.length ? `follows level ${follows.join(', ')} fault lines` : 'no preferred fault lines'}
          </span>
        </div>
      )}
      <div className="faultlines-thumbs">
        {shown.map((i) => (
          <Thumb key={i} client={client} job={thumbJob(i)} caption={label(i)} onPick={() => onPick(i)} />
        ))}
      </div>
      {members.length > THUMBS_SHOWN && (
        <button type="button" className="faultlines-more" onClick={() => setAll(!all)}>
          {all ? 'Fewer' : `All ${members.length}`}
        </button>
      )}
    </div>
  );
}

function Thumb(props: {
  client: FaultLinesClient;
  job: Parameters<FaultLinesClient['thumb']>[0];
  caption: string;
  onPick?: () => void;
  href?: string;
  selected?: boolean;
}): JSX.Element {
  const { client, job, caption, onPick, href, selected } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = `${job.family}|${job.level}|${job.subset.join('')}|${job.combo}|${job.size}|${job.dark}|${job.view ?? 'strands'}`;
  useEffect(() => {
    const abort = new AbortController();
    client
      .thumb(job, abort.signal)
      .then((rgba) => {
        const ctx = abort.signal.aborted ? null : canvas.current?.getContext('2d');
        if (!ctx) return;
        ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), job.size, job.size), 0, 0);
      })
      .catch(() => {});
    return () => abort.abort();
    // The key covers everything the job draws.
  }, [client, key]);
  const img = <canvas ref={canvas} width={job.size} height={job.size} aria-label={caption} />;
  return (
    <figure className={`faultlines-thumb${selected ? ' is-selected' : ''}`}>
      {onPick ? (
        <button type="button" onClick={onPick} title={caption}>
          {img}
        </button>
      ) : (
        img
      )}
      <figcaption className="mono">{href ? <a href={href}>{caption} ↗</a> : caption}</figcaption>
    </figure>
  );
}

function SimilarityMatrix(props: {
  survey: FaultSurvey;
  order: readonly number[];
  groupOf: Int32Array;
  label: (i: number) => string;
  onPick: (i: number) => void;
}): JSX.Element {
  const { survey, order, groupOf, label, onPick } = props;
  const n = order.length;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !n) return;
    const img = ctx.createImageData(n, n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = survey.matrix[order[r] * survey.items.length + order[c]];
        const p = (r * n + c) * 4;
        // Dark blue (unlike) to warm white (alike).
        img.data[p] = Math.round(20 + 235 * v);
        img.data[p + 1] = Math.round(30 + 200 * v * v);
        img.data[p + 2] = Math.round(70 + 120 * (1 - v));
        img.data[p + 3] = 255;
      }
    }
    // Group boundaries along the diagonal.
    for (let r = 1; r < n; r++) {
      if (groupOf[order[r]] === groupOf[order[r - 1]] && groupOf[order[r]] >= 0) continue;
      for (let c = 0; c < n; c++) {
        for (const p of [((r * n + c) * 4), ((c * n + r) * 4)]) {
          img.data[p] = 120;
          img.data[p + 1] = 200;
          img.data[p + 2] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [survey, order, groupOf, n]);
  const cell = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * n);
    return r >= 0 && c >= 0 && r < n && c < n ? [order[r], order[c]] : null;
  };
  return (
    <div className="faultlines-matrix">
      <canvas
        ref={canvas}
        width={n}
        height={n}
        data-testid="faultlines-matrix"
        onMouseMove={(e) => setHover(cell(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const hit = cell(e);
          if (hit) onPick(hit[0]);
        }}
      />
      <p className="muted faultlines-note">
        {hover
          ? `${label(hover[0])} and ${label(hover[1])}: ${pct(survey.matrix[hover[0] * survey.items.length + hover[1]])} alike`
          : 'Rows and columns in group order; bright blocks on the diagonal are the groups. Hover a cell to compare two pairings; click to list the closest to its row.'}
      </p>
    </div>
  );
}
