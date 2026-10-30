/**
 * The circuits of a combination as a table (`chains.ts`): a column per
 * level, a row per chain grouped by family, each circuit in the column of
 * the level it closes at; and a chain (or any two circuits) drawn over the
 * supertiles each runs through (`pairView.ts`), each member in a pan and
 * zoom view kept in step with the others by slot path (`chainLink.ts`), the
 * circuit drawn finer as the view closes in.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { Pt } from '../../core';
import { tileColorHex } from '../../lib/palette';
import type { Box } from '../../lib/viewport';
import { Viewer, type Lines, type Mark, type ViewerApi } from '../buildup/Viewer';
import { fixedSource } from '../buildup/viewer';
import { linkBox, supertileAt } from './chainLink';
import type { CircuitInfo, HarmonicsClient, HarmonicsResult } from './harmonicsJob';
import { SUPERTILE_CAP, VISIT_CAP, type Agreement, type ChainPicture, type Side } from './pairView';
import { holds, lit, type ChainRows, type Hovered, type Ranges } from './rows';
import '../../styles/buildup.css';

const nf = (n: number) => n.toLocaleString('en-US');
export const short = (c: CircuitInfo) => `${nf(c.length)} L${c.level}`;
/** Points a thumbnail is drawn through, at most. */
export const THUMB_POINTS = 3000;
/** Crossings in view a member is drawn through before the drawing stops at a coarser level. */
const DETAIL_POINTS = 150000;

const rgba = (hex: string, a: number) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`;
};
const boxOf = (xy: ArrayLike<number>): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < xy.length; i += 2) {
    x0 = Math.min(x0, xy[i]);
    x1 = Math.max(x1, xy[i]);
    y0 = Math.min(y0, xy[i + 1]);
    y1 = Math.max(y1, xy[i + 1]);
  }
  return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
};
const grow = (b: Box, f: number): Box => {
  const m = f * Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
  return { min: { x: b.min.x - m, y: b.min.y - m }, max: { x: b.max.x + m, y: b.max.y + m } };
};
const closed = (xy: Float64Array): Float64Array => {
  const out = new Float64Array(xy.length + 2);
  out.set(xy);
  out[xy.length] = xy[0];
  out[xy.length + 1] = xy[1];
  return out;
};

/** Each circuit's thumbnail (`HarmonicsEngine.thumbs`), asked for in one batch per result. */
export function useThumbs(client: HarmonicsClient, r: HarmonicsResult | null): Map<number, Float64Array> {
  const [thumbs, setThumbs] = useState<{ r: HarmonicsResult; map: Map<number, Float64Array> } | null>(null);
  useEffect(() => {
    if (!r) return;
    let on = true;
    client
      .thumbs(r.circuits.map((_, i) => i), THUMB_POINTS)
      .then((t) => on && setThumbs({ r, map: new Map(t.map((x, i) => [i, x.pts])) }))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [client, r]);
  return thumbs && thumbs.r === r ? thumbs.map : new Map();
}

/** A circuit drawn small on a canvas at the screen's pixel ratio, round joins, a line a pixel wide. */
export function Thumb(props: { pts: Float64Array | undefined; size: number; label: string }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { pts, size } = props;
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !pts || pts.length < 4) return;
    const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    const g = cv.getContext('2d');
    if (!g) return;
    const b = boxOf(pts);
    const span = Math.max(b.max.x - b.min.x, b.max.y - b.min.y) || 1;
    const k = ((size - 4) * dpr) / span;
    const ox = (cv.width - (b.max.x - b.min.x) * k) / 2, oy = (cv.height - (b.max.y - b.min.y) * k) / 2;
    g.clearRect(0, 0, cv.width, cv.height);
    g.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const x = ox + (pts[i] - b.min.x) * k, y = cv.height - oy - (pts[i + 1] - b.min.y) * k;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.lineWidth = Math.max(0.6, 0.9 * dpr);
    g.strokeStyle = getComputedStyle(cv).color || '#333';
    g.stroke();
  }, [pts, size]);
  return <canvas ref={ref} className="harm-thumb" style={{ width: size, height: size }} role="img" aria-label={props.label} />;
}

/** The table's rows: per family, its chains of two or more, then its circuits in no chain, one row each; every circuit in exactly one row. */
export function tableRows(r: HarmonicsResult): { family: string; rows: { chain: number; members: readonly number[] }[] }[] {
  const by = new Map<string, { chain: number; members: readonly number[] }[]>();
  r.chains.forEach((ch, q) => (by.get(ch.family) ?? by.set(ch.family, []).get(ch.family)!).push({ chain: q, members: ch.members }));
  return [...by.entries()].map(([family, rows]) => ({
    family,
    rows: rows.sort((x, y) => Number(x.members.length === 1) - Number(y.members.length === 1) || r.circuits[x.members[0]].level - r.circuits[y.members[0]].level),
  }));
}

/** Every circuit in a table: a column per level, a row per chain grouped by family; click a circuit to open its row, shift-click a second to compare the two. */
export function CircuitTable(props: {
  r: HarmonicsResult;
  thumbs: Map<number, Float64Array>;
  selected: readonly number[];
  onPick: (i: number, shift: boolean) => void;
}): JSX.Element {
  const { r } = props;
  const levels = Array.from({ length: r.level + 1 }, (_, l) => l);
  const groups = useMemo(() => tableRows(r), [r]);
  const sel = new Set(props.selected);
  return (
    <div className="harm-table-wrap">
      <table className="harm-table" data-testid="harm-table">
        <thead>
          <tr>
            <th />
            {levels.map((l) => (
              <th key={l} scope="col">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.family}>
              <tr className="harm-fam-row">
                <th colSpan={levels.length + 1} scope="rowgroup">
                  Family {g.family} <small>through children {[...g.family].join(', ')}</small>
                </th>
              </tr>
              {g.rows.map((row) => {
                const near = r.near.find((n) => n.b === row.members[0]);
                const alone = row.members.length === 1 ? r.closest[row.members[0]] : undefined;
                const chainText = row.members.map((m) => short(r.circuits[m])).join(' → ');
                return (
                  <tr key={row.chain} data-testid="harm-table-row" data-members={row.members.join(' ')}>
                    <th scope="row" className="harm-row-head" title={alone ? `Agrees with the ${short(r.circuits[alone.other])} at ${alone.top === 1 ? 'the top level' : `the top ${alone.top} levels`}` : undefined}>
                      {row.members.length > 1 ? 'chain' : alone ? `alone · top ${alone.top}` : 'alone'}
                    </th>
                    {levels.map((l) => {
                      const m = row.members.find((i) => r.circuits[i].level === l);
                      if (m === undefined) {
                        return near && r.circuits[near.a].level === l ? (
                          <td key={l} className="harm-cell-near" title={`The ${short(r.circuits[near.a])} reads as this chain's lowest member at its top ${near.top} levels only`}>
                            ≈ {nf(r.circuits[near.a].length)}
                          </td>
                        ) : (
                          <td key={l} />
                        );
                      }
                      const c = r.circuits[m];
                      return (
                        <td key={l}>
                          <button
                            type="button"
                            className={`harm-cell${sel.has(m) ? ' is-selected' : ''}`}
                            data-testid="harm-cell"
                            data-circuit={m}
                            data-level={l}
                            onClick={(e) => props.onPick(m, e.shiftKey)}
                            title={`${nf(c.length)} tiles, closing at level ${c.level} in a ${c.type}; family ${c.family}${row.members.length > 1 ? `; chain ${chainText}` : ''}. Shift-click to compare with the circuit chosen.`}
                          >
                            <Thumb pts={props.thumbs.get(m)} size={44} label={`${nf(c.length)} tiles`} />
                            <span>{nf(c.length)}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NONE: ReadonlySet<number> = new Set();

const STEP: Record<Agreement, { mark: string; title: string }> = {
  same: { mark: '=', title: 'reads the same as the one before at these levels' },
  differs: { mark: '≠', title: 'reads differently from the one before: outlined supertiles hold visits the other lacks' },
  long: { mark: '?', title: 'too long to line up with the one before at these levels' },
  unread: { mark: '–', title: 'one of the two is not read at its level' },
};

interface Detail {
  readonly key: string;
  readonly stop: number;
  readonly pts: Float64Array;
  readonly capped: boolean;
}

/** One member over its supertiles in a pan and zoom view. */
function MemberView(props: {
  c: CircuitInfo;
  side: Side;
  step: Agreement | null;
  detail: Detail | null;
  /** Supertiles lit by a hover (indices into `side.supertiles`). */
  lit: ReadonlySet<number>;
  fitKey: string;
  apiRef: React.MutableRefObject<ViewerApi | null>;
  onView: (b: Box) => void;
  onHover: (path: string | null) => void;
}): JSX.Element {
  const { side, c, detail } = props;
  const frame = useMemo(() => {
    const all: number[] = [];
    for (const s of side.supertiles) all.push(...s.outline);
    return grow(boxOf(all.length ? all : side.circuit), 0.02);
  }, [side]);
  const pts = detail?.pts ?? closed(side.circuit);
  const lines: Lines = useMemo(
    () => ({ key: `${props.fitKey} ${detail?.key ?? 'base'}`, count: 1, points: () => fixedSource(pts), style: () => 0, styles: [{ color: '--text', width: 1.1, alpha: 0.85 }], stop: () => 0 }),
    [pts, detail, props.fitKey],
  );
  const marks = useMemo(() => {
    const out: Mark[] = side.supertiles.map((s) => ({ pts: closed(s.outline), color: rgba(tileColorHex(s.type), 0.9), width: 0.7, fill: rgba(tileColorHex(s.type), 0.32) }));
    for (const s of side.supertiles) if (s.unshared) out.push({ pts: closed(s.outline), color: '#eb6834', width: 2.6 });
    return () => out;
  }, [side]);
  const live = useMemo(() => [...props.lit].map((t): Mark => ({ pts: closed(side.supertiles[t].outline), color: '#2a78d6', width: 2.6, fill: 'rgba(42,120,214,0.28)' })), [props.lit, side]);
  const h = props.lit.size === 1 ? side.supertiles[[...props.lit][0]] : null;
  const unshared = side.supertiles.filter((s) => s.unshared).length;
  return (
    <figure className="harm-member" data-testid="harm-side">
      <figcaption>
        {props.step ? (
          <span className="harm-step" title={STEP[props.step].title} data-testid="harm-step">
            {STEP[props.step].mark}
          </span>
        ) : null}
        <strong>{short(c)}</strong> at level {side.level}: {nf(side.visits)} visits{side.supertiles.length ? ` through ${nf(side.count)} supertiles` : ''}
        {side.supertiles.length && side.count > side.supertiles.length ? ` (the first ${nf(SUPERTILE_CAP)} drawn)` : ''}
        {unshared ? `; ${nf(unshared)} hold visits its neighbour lacks` : ''}.
        {detail ? (
          <span className="harm-detail-note">
            {' '}
            Circuit drawn to level {detail.stop}
            {detail.capped ? `, through ${nf(detail.pts.length / 2 - 1)} of its crossings` : ''}.
          </span>
        ) : null}
        {h ? <span className="harm-hover-note"> {`${h.type} ${h.path}`}</span> : null}
      </figcaption>
      {side.supertiles.length ? (
        <Viewer
          frame={frame}
          fitKey={props.fitKey}
          lines={lines}
          marks={marks}
          live={live}
          apiRef={props.apiRef}
          onView={props.onView}
          onPoint={(p: Pt | null) => props.onHover(p ? supertileAt(side, p)?.path ?? null : null)}
          label={`The ${nf(c.length)} over its supertiles at level ${side.level}`}
          className="harm-member-view"
        >
          <div className="bv-legend">
            {[...new Set(side.supertiles.map((s) => s.type))].sort().map((t) => (
              <span key={t} className="bu-key">
                <i style={{ background: tileColorHex(t) }} />
                {t}
              </span>
            ))}
          </div>
        </Viewer>
      ) : (
        <div className="harm-side-empty">
          {nf(side.visits)} visits at level {side.level}: more than {nf(VISIT_CAP)}, not drawn.
        </div>
      )}
    </figure>
  );
}

/**
 * Every member of a chain (or two circuits compared) over its supertiles,
 * the lowest at level k and the others at k plus their birth level less the
 * lowest's, with one slider for k. The views follow each other by slot path
 * while "link views" is on; the circuit is drawn finer as a view closes in.
 */
export function ChainCanvas(props: {
  client: HarmonicsClient;
  level: number;
  members: readonly number[];
  circuits: readonly CircuitInfo[];
  /** The lowest member's level drawn, and the highest it can be. */
  k: number;
  hi: number;
  setK: (k: number) => void;
  /** Supertiles lit by a hover, per member. */
  lit: readonly ReadonlySet<number>[];
  onHover: (path: string | null) => void;
  onPicture: (p: ChainPicture) => void;
}): JSX.Element {
  const { client, members, circuits, hi } = props;
  const [picture, setPicture] = useState<ChainPicture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState(true);
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());
  const [details, setDetails] = useState<Record<number, Detail>>({});
  const apis = useRef<React.MutableRefObject<ViewerApi | null>[]>([]);
  /** Members moved to follow another, and when: their next view change is not passed on. */
  const following = useRef(new Map<number, number>());
  const timers = useRef(new Map<number, number>());
  const key = `${props.level}: ${members.join(' ')}`;
  useEffect(() => {
    setHidden(new Set());
    setDetails({});
  }, [key]);
  const at = Math.min(Math.max(props.k, 0), hi);
  useEffect(() => {
    let on = true;
    setError(null);
    client
      .picture(members, at)
      .then((p) => {
        if (!on) return;
        setPicture(p);
        props.onPicture(p);
      })
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, at]);
  const current = picture && picture.k === at && picture.sides.length === members.length ? picture : null;
  members.forEach((_, j) => (apis.current[j] ??= { current: null }));
  /** The member's circuit drawn for its view, a moment after the view rests. */
  const ask = (j: number, view: Box | null) => {
    if (!current) return;
    const lvl = current.sides[j].level;
    clearTimeout(timers.current.get(j));
    timers.current.set(
      j,
      window.setTimeout(() => {
        client
          .detail(members[j], lvl, view, DETAIL_POINTS)
          .then((d) => setDetails((all) => ({ ...all, [j]: { key: `${at} ${d.stop} ${view ? `${view.min.x} ${view.min.y} ${view.max.x}` : 'all'}`, ...d } })))
          .catch(() => undefined);
      }, 220),
    );
  };
  useEffect(() => {
    setDetails({});
    if (current) members.forEach((_, j) => ask(j, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);
  const onView = (j: number, view: Box) => {
    ask(j, view);
    const t = following.current.get(j);
    if (t !== undefined) {
      following.current.delete(j);
      if (performance.now() - t < 200) return;
    }
    if (!link || !current) return;
    members.forEach((_, q) => {
      if (q === j || hidden.has(q)) return;
      const b = linkBox(current.sides[j], current.sides[q], view);
      if (!b) return;
      following.current.set(q, performance.now());
      apis.current[q].current?.show(b);
    });
  };
  if (hi < 0) return <></>;
  const skipped = current ? members.filter((_, j) => !current.sides[j].supertiles.length) : [];
  return (
    <div className="harm-supertiles" data-testid="harm-supertiles">
      <h3>Over their supertiles</h3>
      <div className="harm-canvas-controls">
        <label className="harm-slider">
          Lowest at level {at}
          <input type="range" min={0} max={hi} step={1} value={at} onChange={(e) => props.setK(Number(e.target.value))} data-testid="harm-k" />
        </label>
        <label className="harm-check">
          <input type="checkbox" checked={link} onChange={(e) => setLink(e.target.checked)} data-testid="harm-link" /> Link views
        </label>
        <button type="button" onClick={() => members.forEach((_, j) => { following.current.set(j, performance.now()); apis.current[j].current?.fit(boxOf(current?.sides[j].supertiles.flatMap((s) => [...s.outline]) ?? [])); })}>
          Fit all
        </button>
        {members.length > 2 ? (
          <span className="harm-show">
            Show:
            {members.map((m, j) => (
              <label key={m} className="harm-check">
                <input
                  type="checkbox"
                  checked={!hidden.has(j)}
                  onChange={(e) => setHidden((h) => { const n = new Set(h); if (e.target.checked) n.delete(j); else n.add(j); return n; })}
                />{' '}
                {nf(circuits[m].length)}
              </label>
            ))}
          </span>
        ) : null}
      </div>
      <p className="shapes-note">
        Each member two levels above the one before, its supertiles in their type&apos;s colour; outlined in orange, the supertiles holding visits the
        neighbouring member&apos;s reading lacks. Hovering a supertile lights the one with the same slot path in every member, and its visits in the rows
        below; zooming in draws the circuit up to two levels finer.
      </p>
      {error ? <p className="shapes-note">Could not draw: {error}</p> : null}
      {current ? (
        <>
          {skipped.length ? (
            <p className="shapes-note" data-testid="harm-skipped">
              Not drawn at these levels, over {nf(VISIT_CAP)} visits: {skipped.map((m) => short(circuits[m])).join(', ')}.
            </p>
          ) : null}
          <div className="harm-members">
            {members.map((m, j) =>
              hidden.has(j) ? null : (
                <MemberView
                  key={m}
                  c={circuits[m]}
                  side={current.sides[j]}
                  step={j ? current.steps[j - 1] : null}
                  detail={details[j] ?? null}
                  lit={props.lit[j] ?? NONE}
                  fitKey={`${key} ${at}`}
                  apiRef={apis.current[j]}
                  onView={(b) => onView(j, b)}
                  onHover={props.onHover}
                />
              ),
            )}
          </div>
        </>
      ) : (
        <p className="shapes-note">Drawing…</p>
      )}
    </div>
  );
}

/** The members' rows of visits, level by level down to the level drawn; hovering a visit lights what it expands into, in every member. */
function ReadingRows(props: {
  rows: ChainRows;
  members: readonly number[];
  circuits: readonly CircuitInfo[];
  ranges: readonly (readonly (Ranges | undefined)[])[] | null;
  onHover: (h: Hovered | null) => void;
}): JSX.Element {
  const { rows, members, circuits } = props;
  const depth = rows.members[0].levels.length;
  const cols = { gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` };
  return (
    <div className="harm-rows" data-testid="harm-rows">
      <div className="harm-cols" style={cols}>
        {members.map((m) => (
          <div key={m} className="harm-col-head">
            {short(circuits[m])}
          </div>
        ))}
        {Array.from({ length: depth }, (_, d) =>
          rows.members.map((mr, j) => {
            const lv = mr.levels[d];
            const r = props.ranges?.[j]?.[d];
            return (
              <div key={`${j} ${d}`} className={`harm-row${d === depth - 1 ? ' is-drawn' : ''}`} data-testid="harm-row" data-level={lv.level}>
                <div className="harm-xhead">
                  level {lv.level} · {nf(lv.raw)} visits{lv.raw > lv.keep.length ? `, ${nf(lv.raw - lv.keep.length)} back and forth` : ''}
                  {d === depth - 1 ? ' · drawn above' : ''}
                </div>
                <div className="harm-tokens" onMouseLeave={() => props.onHover(null)}>
                  {lv.items.map((it, q) =>
                    it.kind === 'run' ? (
                      <span
                        key={q}
                        className={`harm-chip harm-run${holds(r, it.from, it.to) ? ' is-lit' : ''}`}
                        title={`${nf(it.to - it.from)} visit${it.to - it.from > 1 ? 's' : ''} back and forth across a seam, through ${it.types.join(', ')}: cancelled from the reading`}
                        onMouseEnter={() => props.onHover({ kind: 'visit', j, d, from: it.from, to: it.to, q: null })}
                        data-testid="harm-run"
                      >
                        ↔ {nf(it.to - it.from)}
                      </span>
                    ) : (
                      <span
                        key={q}
                        className={`harm-chip${holds(r, it.i) ? ' is-lit' : ''}`}
                        style={{ ['--chip' as string]: tileColorHex(it.type) }}
                        title={`${it.type} in slot ${it.slot}`}
                        onMouseEnter={() => props.onHover({ kind: 'visit', j, d, from: it.i, to: it.i + 1, q: it.q })}
                        data-testid="harm-item"
                        data-raw={it.i}
                      >
                        {it.type} {it.slot}
                      </span>
                    ),
                  )}
                  {lv.more ? <span className="harm-token harm-more">… {nf(lv.more)} more</span> : null}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

/**
 * A chain (or two circuits) at work: drawn over their supertiles with the
 * slider, and read row by row down to the level drawn. Hovering a visit in
 * the rows lights its expansion below it and the supertiles it reaches in
 * the drawing, in every member through the readings; hovering a supertile
 * lights its visits and the visits above them.
 */
export function ChainWorkspace(props: { client: HarmonicsClient; level: number; members: readonly number[]; circuits: readonly CircuitInfo[] }): JSX.Element {
  const { client, members, circuits } = props;
  const hi = circuits[members[0]].level - 1;
  const key = `${props.level}: ${members.join(' ')}`;
  const [k, setK] = useState(hi);
  const [rows, setRows] = useState<{ key: string; rows: ChainRows } | null>(null);
  const [picture, setPicture] = useState<ChainPicture | null>(null);
  const [hover, setHover] = useState<Hovered | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setK(hi), [key, hi]);
  const at = Math.min(Math.max(k, 0), hi);
  useEffect(() => {
    let on = true;
    setError(null);
    setHover(null);
    client
      .rows(members, at)
      .then((r) => on && setRows({ key, rows: r }))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, at]);
  const current = rows && rows.key === key && rows.rows.k === at ? rows.rows : null;
  const paths = useMemo(
    () => (picture && picture.k === at && picture.sides.length === members.length ? picture.sides.map((s) => s.supertiles.map((t) => t.path)) : null),
    [picture, at, members.length],
  );
  const lighting = useMemo(() => (current && paths && hover ? lit(current, hover, paths) : null), [current, paths, hover]);
  return (
    <>
      <ChainCanvas
        client={client}
        level={props.level}
        members={members}
        circuits={circuits}
        k={at}
        hi={hi}
        setK={setK}
        lit={lighting?.tiles ?? []}
        onHover={(p) => setHover(p ? { kind: 'tile', path: p } : null)}
        onPicture={setPicture}
      />
      <h3>Rows of visits</h3>
      <p className="shapes-note">
        Each member read level by level, from the children of its birth supertile down to the level drawn above: every visit to a supertile in order, as
        type and slot, the runs of visits back and forth across a seam (which the reading cancels) folded into ↔ chips. Hovering a visit lights the visits
        it expands into below and the supertiles it reaches in the drawing, in every member through the readings.
      </p>
      {error ? <p className="shapes-note">Could not read the rows: {error}</p> : null}
      {current ? <ReadingRows rows={current} members={members} circuits={circuits} ranges={lighting?.ranges ?? null} onHover={setHover} /> : error ? null : <p className="shapes-note">Reading…</p>}
    </>
  );
}
