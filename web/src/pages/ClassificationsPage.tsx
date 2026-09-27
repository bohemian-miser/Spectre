/**
 * Classifications page: every combination of every valid rule, placed by the
 * measurements that sorted it into a pattern class (triangle fractal, infinite
 * line, chaotic thin circuits, space-filling + triangle, …).
 *
 * The data comes from the offline sweep in `web/circuit-classes/` (see its
 * README for the method and thresholds), shipped as a compact binary under
 * `public/data/classifications/`. Hover a dot to render that combination in a
 * worker; click to pin it and read its numbers or open it in the Explorer.
 *
 * Shareable state lives in the hash:
 * `#/classifications?x=gC&y=cFill&r=spectre-01235678&hide=bounded&p=spectre-01235678-0000104110`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_EXPLORER_STATE,
  comboDigitChar,
  comboToMatchingIndices,
  decomposeCombo,
  type TileFamilyId,
} from '../core';
import { normalizeBase } from '../lib/siteNav';
import { EXPLORER_ROUTE, stateToHash } from '../lib/urlState';
import { createThumbnailClient, type ThumbnailClient } from '../workers/thumbnailClient';
import {
  FAMILY_LABEL,
  MISSING_CLASS,
  fieldValue,
  findRow,
  formatValue,
  loadClassifications,
  rowClass,
  rowCombo,
  rowDigits,
  ruleSubset,
  type ClassificationData,
} from './classifications/data';
import { ScatterPlot, type PlotHover } from './classifications/ScatterPlot';
import { Thumbnail } from './classifications/Thumbnail';
import '../styles/classifications.css';

export interface ClassificationsPageProps {
  /** Deploy base; defaults to Vite's `BASE_URL` (`/Spectre/` in production). */
  readonly base?: string;
  /** Mirror the view into `location.hash` (default true). */
  readonly syncUrl?: boolean;
  /** Tests inject data instead of fetching it. */
  readonly data?: ClassificationData;
  /** Tests render thumbnails synchronously. */
  readonly thumbnailClient?: ThumbnailClient;
}

/** One line per class, in the page's words. Keys match meta.json class ids. */
const CLASS_COPY: Readonly<Record<string, string>> = {
  triangle:
    'Circuits keep growing with the patch, and the big ones are near-perfect triangles nested inside triangles. Their outlines are fractal (dimension about 1.4).',
  thin: 'Circuits keep growing, faster than the triangles (dimension about 1.7), but each is a thin, doubled-back thread that encloses little area.',
  line: 'No circuit grows past a fixed size. One open strand grows in step with the patch and fills the region it runs through. Small loops may sit beside it.',
  mixed:
    'Space-filling and triangular at once: triangle circuits drawn as thick, area-filling bands, or a space-filling line running between growing triangles.',
  blob: 'Circuits keep growing and fill the region they span, without a triangular outline.',
  bounded: 'Every circuit and strand stays below a fixed size however large the patch gets.',
  unclear: 'Growing, but the shape measures fall between the thresholds.',
};

const DEFAULT_X = 'gC';
const DEFAULT_Y = 'cFill';
const THUMB_LEVELS = [4, 5, 6] as const;

interface HashState {
  x: string;
  y: string;
  rule: string;
  hide: string[];
  pin: string | null;
  tl: number;
}

function parseHash(hash: string): HashState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const at = raw.indexOf('?');
  const q = new URLSearchParams(at < 0 ? '' : raw.slice(at + 1));
  const tl = Number(q.get('tl'));
  return {
    x: q.get('x') ?? DEFAULT_X,
    y: q.get('y') ?? DEFAULT_Y,
    rule: q.get('r') ?? 'all',
    hide: (q.get('hide') ?? '').split(',').filter(Boolean),
    pin: q.get('p'),
    tl: (THUMB_LEVELS as readonly number[]).includes(tl) ? tl : 5,
  };
}

function formatHash(s: HashState): string {
  const q = new URLSearchParams();
  if (s.x !== DEFAULT_X) q.set('x', s.x);
  if (s.y !== DEFAULT_Y) q.set('y', s.y);
  if (s.rule !== 'all') q.set('r', s.rule);
  if (s.hide.length) q.set('hide', s.hide.join(','));
  if (s.pin) q.set('p', s.pin);
  if (s.tl !== 5) q.set('tl', String(s.tl));
  const qs = q.toString();
  return `#/classifications${qs ? `?${qs}` : ''}`;
}

function defaultBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

function usePrefersDark(): boolean {
  const query = '(prefers-color-scheme: light)';
  const get = () => typeof window === 'undefined' || !window.matchMedia || !window.matchMedia(query).matches;
  const [dark, setDark] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setDark(!mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return dark;
}

function explorerHref(base: string, family: TileFamilyId, rule: string, combo: string, level: number): string {
  const subset = ruleSubset(rule);
  return `${normalizeBase(base)}${stateToHash(
    {
      ...DEFAULT_EXPLORER_STATE,
      family,
      level,
      subset,
      matching: comboToMatchingIndices(family, subset, combo),
    },
    EXPLORER_ROUTE,
  )}`;
}

const fmt = (n: number) => n.toLocaleString('en-US');

const HOVER_W = 222;
const HOVER_H = 310;

/** Beside the pointer, flipped and clamped so the card stays inside the plot. */
function hoverCardPosition(hover: PlotHover, plot: { w: number; h: number }): { left: number; top: number } {
  const gap = 16;
  let left = hover.x + gap;
  if (left + HOVER_W > plot.w) left = hover.x - gap - HOVER_W;
  left = Math.max(0, left);
  const top = Math.max(0, Math.min(plot.h - HOVER_H, hover.y - HOVER_H / 2));
  return { left, top };
}

export default function ClassificationsPage(props: ClassificationsPageProps = {}): JSX.Element {
  const base = props.base ?? defaultBase();
  const syncUrl = props.syncUrl ?? true;
  const [load, setLoad] = useState<
    { status: 'loading' } | { status: 'ready'; data: ClassificationData } | { status: 'error'; message: string }
  >(props.data ? { status: 'ready', data: props.data } : { status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (props.data) return;
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    setLoad({ status: 'loading' });
    loadClassifications(base, controller?.signal)
      .then((data) => setLoad({ status: 'ready', data }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (!/abort/i.test(message)) setLoad({ status: 'error', message });
      });
    return () => controller?.abort();
  }, [base, props.data, attempt]);

  return (
    <section className="cls-page">
      <header className="cls-header">
        <h1>Classifications</h1>
        <p className="muted">
          Every valid edge rule with every way of pairing up the crossings, measured at levels 4 to
          6 and sorted by what its strands do as the patch grows. Each dot is one combination. Pick
          any two measurements for the axes, hover a dot to draw that combination, and click to pin
          it.
        </p>
      </header>
      {load.status === 'loading' && (
        <p className="cls-status" role="status">
          Loading every combination (about 5 MB)…
        </p>
      )}
      {load.status === 'error' && (
        <div className="cls-status" role="alert">
          <p>The classification data did not load: {load.message}.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}
      {load.status === 'ready' && (
        <ClassificationsView
          data={load.data}
          base={base}
          syncUrl={syncUrl}
          thumbnailClient={props.thumbnailClient}
        />
      )}
    </section>
  );
}

function ClassificationsView(props: {
  data: ClassificationData;
  base: string;
  syncUrl: boolean;
  thumbnailClient?: ThumbnailClient;
}): JSX.Element {
  const { data, base, syncUrl } = props;
  const { meta } = data;
  const dark = usePrefersDark();

  const initial = useMemo(
    () => (syncUrl && typeof window !== 'undefined' ? parseHash(window.location.hash) : parseHash('')),
    [syncUrl],
  );
  const fieldIndex = (key: string, fallback: string) => {
    const i = meta.fields.findIndex((f) => f.key === key);
    return i >= 0 ? i : meta.fields.findIndex((f) => f.key === fallback);
  };
  const [xField, setXField] = useState(() => fieldIndex(initial.x, DEFAULT_X));
  const [yField, setYField] = useState(() => fieldIndex(initial.y, DEFAULT_Y));
  const [rule, setRule] = useState(() =>
    meta.blocks.some((b) => `${b.family}-${b.rule}` === initial.rule) ? initial.rule : 'all',
  );
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(initial.hide));
  const [thumbLevel, setThumbLevel] = useState(initial.tl);
  const [jitter, setJitter] = useState(true);
  const [hover, setHover] = useState<PlotHover | null>(null);
  const [pinned, setPinned] = useState<number | null>(() => {
    if (!initial.pin) return null;
    const m = /^(.+)-(\d+)-([0-9a-z]+)$/.exec(initial.pin);
    if (!m) return null;
    const r = findRow(data, m[1], m[2], m[3]);
    return r >= 0 && rowClass(data, r) !== MISSING_CLASS ? r : null;
  });
  const [building, setBuilding] = useState(false);

  // Created in an effect (not during render) so StrictMode's simulated
  // unmount disposes a client that is then replaced, never one still in use.
  const [client, setClient] = useState<ThumbnailClient | null>(props.thumbnailClient ?? null);
  useEffect(() => {
    if (props.thumbnailClient) {
      setClient(props.thumbnailClient);
      return;
    }
    const c = createThumbnailClient();
    setClient(c);
    return () => c.dispose();
  }, [props.thumbnailClient]);
  useEffect(() => {
    if (!client) return;
    client.onBuilding = setBuilding;
    return () => {
      client.onBuilding = null;
    };
  }, [client]);

  const rowId = useCallback(
    (row: number) => {
      const b = meta.blocks[data.blockOf[row]];
      return `${b.family}-${b.rule}-${rowCombo(data, row)}`;
    },
    [data, meta],
  );

  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const next = formatHash({
      x: meta.fields[xField].key,
      y: meta.fields[yField].key,
      rule,
      hide: [...hidden],
      pin: pinned !== null ? rowId(pinned) : null,
      tl: thumbLevel,
    });
    if (window.location.hash !== next) window.history.replaceState(null, '', next);
  }, [syncUrl, meta, xField, yField, rule, hidden, pinned, thumbLevel, rowId]);

  const counts = useMemo(() => {
    const total = new Array<number>(meta.classes.length).fill(0);
    const perBlock = meta.blocks.map(() => new Array<number>(meta.classes.length).fill(0));
    let missing = 0;
    for (let r = 0; r < data.nRows; r++) {
      const c = rowClass(data, r);
      if (c === MISSING_CLASS) {
        missing++;
        continue;
      }
      total[c]++;
      perBlock[data.blockOf[r]][c]++;
    }
    return { total, perBlock, missing };
  }, [data, meta]);

  const visibleClass = useMemo(() => meta.classes.map((c) => !hidden.has(c.id)), [meta, hidden]);
  const visibleBlock = useMemo(
    () => meta.blocks.map((b) => rule === 'all' || `${b.family}-${b.rule}` === rule),
    [meta, rule],
  );
  const shownCounts = useMemo(() => {
    const out = new Array<number>(meta.classes.length).fill(0);
    meta.blocks.forEach((_, bi) => {
      if (!visibleBlock[bi]) return;
      counts.perBlock[bi].forEach((n, c) => (out[c] += n));
    });
    return out;
  }, [meta, visibleBlock, counts]);

  const [classColor, setClassColor] = useState<string[]>(() => meta.classes.map(() => '#888888'));
  const pageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const style = getComputedStyle(el);
    setClassColor(
      meta.classes.map((c) => style.getPropertyValue(`--cls-${c.id}`).trim() || '#888888'),
    );
  }, [meta, dark]);

  const toggleClass = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const describe = (row: number) => {
    const b = meta.blocks[data.blockOf[row]];
    const cls = meta.classes[rowClass(data, row)];
    const digits = rowDigits(data, row);
    const parts = decomposeCombo(b.family, ruleSubset(b.rule), digits).map((d) =>
      d.parts.map((p) => {
        const combo = p.digits.map((v) => comboDigitChar(v) ?? '0').join('');
        const r = findRow(data, b.family, p.rule, combo);
        return { rule: p.rule, combo, cls: r >= 0 ? meta.classes[rowClass(data, r)] : undefined };
      }),
    );
    return { block: b, cls, combo: rowCombo(data, row), digits, parts };
  };

  const plotWrapRef = useRef<HTMLDivElement | null>(null);
  const [plotSize, setPlotSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = plotWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setPlotSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fx = meta.fields[xField];
  const fy = meta.fields[yField];
  const hoverInfo = hover ? describe(hover.row) : null;
  const pinInfo = pinned !== null ? describe(pinned) : null;
  const shownTotal = shownCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="cls-view" ref={pageRef}>
      <div className="cls-legend" role="group" aria-label="Classes (click to show or hide)">
        {meta.classes.map((c, i) =>
          counts.total[i] ? (
            <button
              type="button"
              key={c.id}
              className="cls-chip"
              aria-pressed={!hidden.has(c.id)}
              onClick={() => toggleClass(c.id)}
              title={CLASS_COPY[c.id]}
              data-testid={`cls-chip-${c.id}`}
            >
              <i style={{ background: `var(--cls-${c.id})` }} aria-hidden="true" />
              {c.label}
              <span>{fmt(shownCounts[i])}</span>
            </button>
          ) : null,
        )}
      </div>

      <form className="cls-controls" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>Across</span>
          <select
            value={xField}
            onChange={(e) => setXField(Number(e.target.value))}
            aria-label="Horizontal axis"
            data-testid="cls-x"
          >
            {meta.fields.map((f, i) => (
              <option key={f.key} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="cls-swap"
          onClick={() => {
            setXField(yField);
            setYField(xField);
          }}
          aria-label="Swap the axes"
          title="Swap the axes"
        >
          ⇄
        </button>
        <label>
          <span>Up</span>
          <select
            value={yField}
            onChange={(e) => setYField(Number(e.target.value))}
            aria-label="Vertical axis"
            data-testid="cls-y"
          >
            {meta.fields.map((f, i) => (
              <option key={f.key} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Rule</span>
          <select value={rule} onChange={(e) => setRule(e.target.value)} aria-label="Rule" data-testid="cls-rule">
            <option value="all">Every family and rule</option>
            {meta.blocks.map((b) => (
              <option key={`${b.family}-${b.rule}`} value={`${b.family}-${b.rule}`}>
                {FAMILY_LABEL[b.family] ?? b.family} · {b.rule} ({fmt(b.count)})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Preview level</span>
          <select
            value={thumbLevel}
            onChange={(e) => setThumbLevel(Number(e.target.value))}
            aria-label="Level of the hover preview"
          >
            {THUMB_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
                {l === 6 ? ' (slow first time)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="cls-check">
          <input type="checkbox" checked={jitter} onChange={(e) => setJitter(e.target.checked)} />
          <span>Spread overlapping dots</span>
        </label>
      </form>

      <div className="cls-main">
        <div className="cls-plot-wrap" ref={plotWrapRef}>
          <ScatterPlot
            data={data}
            xField={xField}
            yField={yField}
            visibleClass={visibleClass}
            visibleBlock={visibleBlock}
            classColor={classColor}
            jitter={jitter}
            pinned={pinned}
            onHover={setHover}
            onPick={setPinned}
            ariaLabel={`Scatter of ${fmt(shownTotal)} combinations: ${fx.label} across, ${fy.label} up, coloured by class. The table below lists the counts.`}
          />
          {hover && hoverInfo && hover.row !== pinned && client && (
            <div className="cls-hover" style={hoverCardPosition(hover, plotSize)} data-testid="cls-hover">
              <Thumbnail
                client={client}
                channel="hover"
                family={hoverInfo.block.family}
                subset={ruleSubset(hoverInfo.block.rule)}
                digits={hoverInfo.digits}
                level={thumbLevel}
                size={200}
                dark={dark}
                building={building}
              />
              <div className="cls-hover-text">
                <b>
                  {hoverInfo.block.rule}-{hoverInfo.combo}
                </b>
                <span>
                  {FAMILY_LABEL[hoverInfo.block.family]} · <ClassName id={hoverInfo.cls.id} label={hoverInfo.cls.label} />
                </span>
                <span className="mono">
                  {fx.key} ≈ {formatValue(fx, fieldValue(data, hover.row, xField))} · {fy.key} ≈{' '}
                  {formatValue(fy, fieldValue(data, hover.row, yField))}
                </span>
                {hoverInfo.parts.map((ps) => (
                  <span key={ps.map((p) => p.rule).join('+')} className="mono">
                    = {ps.map((p) => `${p.rule}-${p.combo}`).join(' + ')}
                  </span>
                ))}
                {hover.stacked > 1 && <span className="muted">{fmt(hover.stacked)} dots on this pixel</span>}
              </div>
            </div>
          )}
        </div>

        <aside className="cls-side" aria-label="Pinned combination">
          {pinInfo && pinned !== null ? (
            <div className="cls-pin" data-testid="cls-pin">
              <div className="cls-pin-head">
                <h2>
                  {pinInfo.block.rule}-{pinInfo.combo}
                </h2>
                <button type="button" onClick={() => setPinned(null)} aria-label="Unpin">
                  ✕
                </button>
              </div>
              <p>
                {FAMILY_LABEL[pinInfo.block.family]} · <ClassName id={pinInfo.cls.id} label={pinInfo.cls.label} />
              </p>
              {client && (
              <Thumbnail
                client={client}
                channel="pin"
                family={pinInfo.block.family}
                subset={ruleSubset(pinInfo.block.rule)}
                digits={pinInfo.digits}
                level={thumbLevel}
                size={288}
                dark={dark}
                building={building}
              />
              )}
              <p className="cls-pin-links">
                <a
                  href={explorerHref(base, pinInfo.block.family, pinInfo.block.rule, pinInfo.combo, 4)}
                  target="_blank"
                  rel="noopener"
                >
                  Open in the Explorer (level 4)
                </a>
                <a
                  href={explorerHref(base, pinInfo.block.family, pinInfo.block.rule, pinInfo.combo, 6)}
                  target="_blank"
                  rel="noopener"
                >
                  level 6
                </a>
              </p>
              {pinInfo.parts.map((ps) => (
                <div key={ps.map((p) => p.rule).join('+')} className="cls-decomp" data-testid="cls-decomp">
                  <p>
                    Decomposes into two independent patterns: no chord joins one to the other, so
                    these strands are exactly theirs laid on top of each other.
                  </p>
                  <ul>
                    {ps.map((p) => (
                      <li key={p.rule}>
                        <a href={explorerHref(base, pinInfo.block.family, p.rule, p.combo, 4)} target="_blank" rel="noopener">
                          <span className="mono">
                            {p.rule}-{p.combo}
                          </span>
                        </a>{' '}
                        {p.cls && <ClassName id={p.cls.id} label={p.cls.label} />}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="muted">{CLASS_COPY[pinInfo.cls.id]}</p>
              <dl className="cls-values">
                {meta.fields.map((f, i) => (
                  <div key={f.key} title={f.description}>
                    <dt>{f.label}</dt>
                    <dd>≈ {formatValue(f, fieldValue(data, pinned, i))}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="cls-axes-help">
              <h2>The axes</h2>
              <dl>
                <dt>{fx.label}</dt>
                <dd>{fx.description}</dd>
                <dt>{fy.label}</dt>
                <dd>{fy.description}</dd>
              </dl>
              <p className="muted">Click a dot to pin it here with all its numbers and an Explorer link.</p>
            </div>
          )}
        </aside>
      </div>

      <section className="cls-classes" aria-labelledby="cls-classes-h">
        <h2 id="cls-classes-h">The classes</h2>
        <dl>
          {meta.classes.map((c, i) =>
            counts.total[i] ? (
              <div key={c.id}>
                <dt>
                  <i style={{ background: `var(--cls-${c.id})` }} aria-hidden="true" />
                  {c.label}
                </dt>
                <dd>{CLASS_COPY[c.id]}</dd>
              </div>
            ) : null,
          )}
        </dl>
        <p className="muted">
          All measurements are at finite levels: an infinite line here is an open strand that still
          grows with the patch at level 6, which matches the proved curves (such as{' '}
          <span className="mono">1278-0101000000</span>) but is evidence rather than proof for the
          rest. Hats and turtles are left out because their strands are identical to Tile(1,1)&rsquo;s. The
          method, thresholds and scripts are in{' '}
          <a href="https://github.com/bohemian-miser/Spectre/tree/main/web/circuit-classes">
            web/circuit-classes
          </a>
          .
        </p>
      </section>

      <section className="cls-table-section" aria-labelledby="cls-table-h">
        <h2 id="cls-table-h">Counts by family and rule</h2>
        <div className="cls-table-box">
          <table className="cls-table">
            <thead>
              <tr>
                <th scope="col">Family</th>
                <th scope="col">Rule</th>
                {meta.classes.map((c, i) => (counts.total[i] ? <th key={c.id} scope="col">{c.label}</th> : null))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {meta.blocks.map((b, bi) => (
                <tr key={`${b.family}-${b.rule}`}>
                  <td>{FAMILY_LABEL[b.family] ?? b.family}</td>
                  <td className="mono">{b.rule}</td>
                  {meta.classes.map((c, i) =>
                    counts.total[i] ? (
                      <td key={c.id} className={counts.perBlock[bi][i] ? '' : 'is-zero'}>
                        {counts.perBlock[bi][i] ? fmt(counts.perBlock[bi][i]) : '·'}
                      </td>
                    ) : null,
                  )}
                  <td>
                    {fmt(b.done)}
                    {b.done < b.count ? ` of ${fmt(b.count)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {counts.missing > 0 && (
          <p className="muted">{fmt(counts.missing)} combinations are not swept yet and are not plotted.</p>
        )}
      </section>
    </div>
  );
}

function ClassName(props: { id: string; label: string }): JSX.Element {
  return (
    <span className="cls-name">
      <i style={{ background: `var(--cls-${props.id})` }} aria-hidden="true" />
      {props.label}
    </span>
  );
}
