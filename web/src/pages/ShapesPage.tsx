/**
 * Shapes: every circuit on the Corners page, grouped by shape. Each circuit's
 * first Fourier terms, sized by its radius of gyration, are compared over
 * turn, starting tile and mirror image (`shapes/descriptor.ts`); the gaps
 * are clustered by average linkage, cut at a threshold, and laid out in the
 * plane. All of it is computed here from the tile positions the Corners page
 * uses.
 */

import { useEffect, useMemo, useState } from 'react';
import { familyLabel, loadClass, loadIndex, type Circuit, type CornerIndex } from './corners/data';
import { centroid, radiusOfGyration } from './corners/measure';
import { align, cut, meanShape, medoid, outline, type Alignment } from './shapes/descriptor';
import { createShapesClient, type ShapesResult } from './shapes/shapesClient';
import '../styles/shapes.css';

interface Entry {
  readonly key: string;
  readonly combo: string;
  readonly pattern: string;
  readonly kind: string;
  readonly index: number;
  readonly circuit: Circuit;
  /** Samples about the centroid over the radius of gyration, at most 160 of them. */
  readonly shape: Float64Array;
}

const TERMS = [10, 20, 30, 60];
const COLOURED = 8;
const nf = (n: number) => n.toLocaleString('en-US');
/** Threshold slider: 0..100 onto 0.005..0.4, evenly in log. */
const fromSlider = (v: number) => 0.005 * 80 ** (v / 100);
const toSlider = (h: number) => (100 * Math.log(h / 0.005)) / Math.log(80);

function normalised(c: Circuit): Float64Array {
  const { xy, n } = c.loop;
  const o = centroid(c.loop);
  const r = radiusOfGyration(c.loop);
  const step = Math.max(1, Math.ceil(n / 160));
  const out: number[] = [];
  for (let j = 0; j < n; j += step) out.push((xy[2 * j] - o.x) / r, (xy[2 * j + 1] - o.y) / r);
  return Float64Array.from(out);
}

/** A shape turned (and mirrored) as an alignment says. */
function placed(shape: Float64Array, al: Alignment | null): Float64Array {
  if (!al) return shape;
  const out = new Float64Array(shape.length);
  const c = Math.cos(al.theta);
  const s = Math.sin(al.theta);
  for (let i = 0; i < shape.length; i += 2) {
    const x = shape[i];
    const y = al.mirror ? -shape[i + 1] : shape[i + 1];
    out[i] = x * c - y * s;
    out[i + 1] = x * s + y * c;
  }
  return out;
}

function glyphPath(pts: Float64Array, size: number, reach: number): string {
  const k = size / 2 / reach;
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${(pts[i] * k).toFixed(1)} ${(-pts[i + 1] * k).toFixed(1)}`;
  return `${d}Z`;
}

function reachOf(pts: Float64Array): number {
  let m = 0;
  for (let i = 0; i < pts.length; i++) m = Math.max(m, Math.abs(pts[i]));
  return m || 1;
}

function Glyph(props: { pts: Float64Array; size: number; colour?: string; width?: number; label: string }): JSX.Element {
  const { pts, size } = props;
  return (
    <svg className="shapes-glyph" width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label={props.label}>
      <path d={glyphPath(pts, size * 0.92, reachOf(pts))} fill="none" stroke={props.colour ?? 'var(--text)'} strokeWidth={props.width ?? 1.2} strokeLinejoin="round" />
    </svg>
  );
}

const label = (e: Entry) => `${e.combo} ${familyLabel(e.circuit)} L${e.circuit.level}`;
const colourOf = (g: number) => (g < COLOURED ? `var(--g${g + 1})` : 'var(--muted)');

export default function ShapesPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [index, setIndex] = useState<CornerIndex | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [F, setF] = useState(30);
  const [mirror, setMirror] = useState(true);
  const [threshold, setThreshold] = useState(0.05);
  const [result, setResult] = useState<ShapesResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [compare, setCompare] = useState<number | null>(null);
  const client = useMemo(() => createShapesClient({ forceSync: props.forceSync }), [props.forceSync]);
  useEffect(() => () => client.dispose(), [client]);

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      const idx = await loadIndex(base, abort.signal);
      setIndex(idx);
      const out: Entry[] = [];
      for (const cls of idx.classes) {
        const cs = await loadClass(base, cls.combo, abort.signal);
        cs.forEach((c, i) => out.push({ key: `${cls.combo}-${i}`, combo: cls.combo, pattern: cls.pattern, kind: cls.kind, index: i, circuit: c, shape: normalised(c) }));
        setLoaded(out.length);
      }
      setEntries(out);
    })().catch((e: unknown) => {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    });
    return () => abort.abort();
  }, [base]);

  useEffect(() => {
    if (!entries) return;
    setResult(null);
    client
      .run({ loops: entries.map((e) => e.circuit.loop), F, mirror })
      .then(setResult)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [client, entries, F, mirror]);

  // Open on the circuit named in the address (#c=combo-index), else the first.
  useEffect(() => {
    if (!entries || selected !== null) return;
    const m = /c=([0-9a-z]+-\d+)/.exec(window.location.hash);
    const at = m ? entries.findIndex((e) => e.key === m[1]) : -1;
    setSelected(Math.max(0, at));
  }, [entries, selected]);

  const n = entries?.length ?? 0;
  const groups = useMemo(() => (result ? cut(result.merges, n, threshold) : null), [result, n, threshold]);
  const members = useMemo(() => {
    if (!groups) return [];
    const out: number[][] = [];
    groups.forEach((g, i) => (out[g] ??= []).push(i));
    return out;
  }, [groups]);
  const centres = useMemo(() => (result ? members.map((m) => medoid(m, result.gaps, n)) : []), [members, result, n]);
  // Every circuit turned onto its group's medoid, so a group's members face the same way.
  const shown = useMemo(() => {
    if (!entries || !result || !groups) return null;
    return entries.map((e, i) => {
      const c = centres[groups[i]];
      return placed(e.shape, c === i ? null : align(result.terms[c], result.terms[i], mirror));
    });
  }, [entries, result, groups, centres, mirror]);
  const means = useMemo(
    () => (result ? members.map((m, g) => outline(meanShape(m, result.terms, centres[g], mirror), 240)) : []),
    [members, result, centres, mirror],
  );
  const counts = useMemo(() => {
    if (!result) return [];
    return Array.from({ length: 61 }, (_, i) => {
      const h = fromSlider((i * 100) / 60);
      return { h, k: Math.max(...cut(result.merges, n, h)) + 1 };
    });
  }, [result, n]);

  const nearest = useMemo(() => {
    if (!result || selected === null) return [];
    return Array.from({ length: n }, (_, j) => j)
      .filter((j) => j !== selected)
      .sort((a, b) => result.gaps[selected * n + a] - result.gaps[selected * n + b])
      .slice(0, 10);
  }, [result, selected, n]);
  const other = compare ?? nearest[0] ?? null;

  if (error) return <p className="shapes-note">The circuit data isn’t available ({error}).</p>;

  const sel = entries && selected !== null ? entries[selected] : null;
  const singles = members.filter((m) => m.length === 1).flat();
  const multi = members.map((m, g) => ({ m, g })).filter(({ m }) => m.length > 1);

  return (
    <article className="shapes-page">
      <header>
        <h1>Shapes</h1>
        <p className="shapes-note">
          Every circuit on the Corners page, grouped by shape. A circuit’s shape is its first Fourier terms about its centroid, divided by its radius of
          gyration, so position and size drop out; two circuits are compared after the turn, starting tile and mirror image that bring them closest, and their{' '}
          <b>gap</b> is the rms distance left between the outlines, in radii of gyration. Generations of one family two levels apart are copies at 4 + √15 times the
          size and come out within a few hundredths; different shapes are 0.2 or more apart. Circuits closer on average than the threshold share a group.
        </p>
      </header>

      <div className="shapes-controls">
        <label>
          Terms each side
          <select value={F} onChange={(e) => setF(Number(e.target.value))} data-testid="shapes-terms">
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="shapes-check">
          <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} data-testid="shapes-mirror" />
          Mirror images count as the same shape
        </label>
        <label>
          Threshold {threshold.toFixed(3)}
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={toSlider(threshold)}
            onChange={(e) => setThreshold(fromSlider(Number(e.target.value)))}
            data-testid="shapes-threshold"
          />
        </label>
        <span className="shapes-note" data-testid="shapes-summary">
          {!entries
            ? `Loading circuits… ${loaded}`
            : !result
              ? `Comparing ${nf(n)} circuits…`
              : `${nf(n)} circuits in ${members.length} group${members.length === 1 ? '' : 's'}: ${multi.length} of two or more, ${singles.length} alone.`}
        </span>
      </div>

      {result && entries && groups && shown && (
        <>
          <section aria-labelledby="shapes-map-h">
            <h2 id="shapes-map-h">Map</h2>
            <p className="shapes-note">
              Circuits placed so their distances on the page match their gaps as nearly as two dimensions allow (classical multidimensional scaling); each is
              drawn turned to face its group’s middle member. The eight largest groups are coloured. Click one to select it.
            </p>
            <ShapeMap entries={entries} shown={shown} layout={result.layout} groups={groups} selected={selected} onPick={setSelected} />
          </section>

          <section aria-labelledby="shapes-selected-h">
            <h2 id="shapes-selected-h">Nearest shapes</h2>
            {sel && (
              <div className="shapes-row">
                <div className="shapes-panel">
                  <Overlay a={sel} b={other !== null ? entries[other] : null} al={other !== null ? align(result.terms[selected!], result.terms[other], mirror) : null} />
                  <p className="shapes-note" data-testid="shapes-selected">
                    <b>{label(sel)}</b>, {nf(sel.circuit.length)} tiles, {sel.kind} class {sel.pattern}.{' '}
                    <a href={`${base}corners.html#c=${sel.key}`}>Open on the Corners page</a>.
                    {other !== null && (
                      <>
                        {' '}
                        Laid over it: {label(entries[other])}, gap {result.gaps[selected! * n + other].toFixed(3)}.
                      </>
                    )}
                  </p>
                </div>
                <div className="shapes-tablewrap">
                  <table className="shapes-table" data-testid="shapes-nearest">
                    <thead>
                      <tr>
                        <th>circuit</th>
                        <th>tiles</th>
                        <th>gap</th>
                        <th>mirrored</th>
                        <th>group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nearest.map((j) => {
                        const al = align(result.terms[selected!], result.terms[j], mirror);
                        return (
                          <tr key={j} className={j === other ? 'is-on' : undefined} onClick={() => setCompare(j)} onDoubleClick={() => setSelected(j)}>
                            <td>
                              <Glyph pts={shown[j]} size={26} colour={colourOf(groups[j])} label={label(entries[j])} /> {label(entries[j])}
                            </td>
                            <td>{nf(entries[j].circuit.length)}</td>
                            <td>{result.gaps[selected! * n + j].toFixed(3)}</td>
                            <td>{al.mirror ? 'yes' : ''}</td>
                            <td>{groups[j] === groups[selected!] ? 'same' : groups[j] + 1}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="shapes-note">Click a row to lay it over the selected circuit; double-click to select it.</p>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="shapes-groups-h">
            <h2 id="shapes-groups-h">Groups</h2>
            <p className="shapes-note">
              Each group’s mean shape (its members’ terms averaged after turning each onto the middle member) and its members. The chart shows how many groups each
              threshold gives; flat stretches are thresholds the grouping does not depend on.
            </p>
            <GroupCount counts={counts} threshold={threshold} />
            <div className="shapes-groups" data-testid="shapes-groups">
              {multi.map(({ m, g }) => (
                <div key={g} className={`shapes-group${selected !== null && groups[selected] === g ? ' is-on' : ''}`}>
                  <div className="shapes-group-head">
                    <Glyph pts={means[g]} size={92} colour={colourOf(g)} width={1.6} label={`Mean shape of group ${g + 1}`} />
                    <div>
                      <b>
                        <i style={{ background: colourOf(g) }} />
                        Group {g + 1}
                      </b>
                      <span className="shapes-note">{m.length} circuits</span>
                      <span className="shapes-note">{familiesOf(m, entries)}</span>
                    </div>
                  </div>
                  <div className="shapes-members">
                    {m.map((i) => (
                      <button key={i} type="button" title={`${label(entries[i])} · ${nf(entries[i].circuit.length)} tiles`} onClick={() => setSelected(i)} aria-pressed={i === selected}>
                        <Glyph pts={shown[i]} size={34} label={label(entries[i])} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {singles.length > 0 && (
                <div className="shapes-group">
                  <div className="shapes-group-head">
                    <div>
                      <b>Alone</b>
                      <span className="shapes-note">{singles.length} circuits with no other within the threshold</span>
                    </div>
                  </div>
                  <div className="shapes-members">
                    {singles.map((i) => (
                      <button key={i} type="button" title={`${label(entries[i])} · ${nf(entries[i].circuit.length)} tiles`} onClick={() => setSelected(i)} aria-pressed={i === selected}>
                        <Glyph pts={shown[i]} size={34} label={label(entries[i])} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {index && <p className="shapes-note">Rule {index.rule} on the hexagons; tile positions from {index.generated}.</p>}
    </article>
  );
}

function familiesOf(m: readonly number[], entries: readonly Entry[]): string {
  const fams = new Map<string, number>();
  const combos = new Set<string>();
  for (const i of m) {
    const f = familyLabel(entries[i].circuit);
    fams.set(f, (fams.get(f) ?? 0) + 1);
    combos.add(entries[i].combo);
  }
  return `${combos.size} combination${combos.size === 1 ? '' : 's'}; ${[...fams].map(([f, k]) => `${f} ×${k}`).join(', ')}`;
}

/** Groups against threshold, log scale across. */
function GroupCount(props: { counts: readonly { h: number; k: number }[]; threshold: number }): JSX.Element {
  const { counts, threshold } = props;
  const W = 620;
  const H = 150;
  const m = { l: 40, r: 12, t: 10, b: 32 };
  const lo = Math.log(counts[0].h);
  const hi = Math.log(counts[counts.length - 1].h);
  const X = (h: number) => m.l + ((Math.log(h) - lo) / (hi - lo)) * (W - m.l - m.r);
  const top = Math.max(...counts.map((c) => c.k));
  const Y = (k: number) => m.t + (1 - k / top) * (H - m.t - m.b);
  let d = '';
  counts.forEach((c, i) => {
    d += i ? `H${X(c.h).toFixed(1)}V${Y(c.k).toFixed(1)}` : `M${X(c.h).toFixed(1)} ${Y(c.k).toFixed(1)}`;
  });
  const ticks = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.4];
  return (
    <svg className="shapes-count" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Number of groups against threshold" data-testid="shapes-count">
      {[0, Math.round(top / 2), top].map((k) => (
        <g key={k}>
          <line x1={m.l} x2={W - m.r} y1={Y(k)} y2={Y(k)} stroke="var(--line)" />
          <text x={m.l - 6} y={Y(k) + 3.5} textAnchor="end">
            {k}
          </text>
        </g>
      ))}
      {ticks.map((h) => (
        <text key={h} x={X(h)} y={H - m.b + 15} textAnchor="middle">
          {h}
        </text>
      ))}
      <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
        threshold (gap)
      </text>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} />
      <line x1={X(threshold)} x2={X(threshold)} y1={m.t} y2={H - m.b} stroke="var(--text)" strokeDasharray="4 3" />
    </svg>
  );
}

function ShapeMap(props: {
  entries: readonly Entry[];
  shown: readonly Float64Array[];
  layout: Float64Array;
  groups: readonly number[];
  selected: number | null;
  onPick: (i: number) => void;
}): JSX.Element {
  const { entries, shown, layout, groups, selected, onPick } = props;
  const W = 960;
  const H = 600;
  const pad = 30;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < entries.length; i++) {
    x0 = Math.min(x0, layout[2 * i]);
    x1 = Math.max(x1, layout[2 * i]);
    y0 = Math.min(y0, layout[2 * i + 1]);
    y1 = Math.max(y1, layout[2 * i + 1]);
  }
  const k = Math.min((W - 2 * pad) / Math.max(x1 - x0, 1e-9), (H - 2 * pad) / Math.max(y1 - y0, 1e-9));
  const X = (x: number) => pad + (x - x0) * k + (W - 2 * pad - (x1 - x0) * k) / 2;
  const Y = (y: number) => H - pad - (y - y0) * k - (H - 2 * pad - (y1 - y0) * k) / 2;
  const size = 30;
  const order = entries.map((_, i) => i).sort((a, b) => (a === selected ? 1 : b === selected ? -1 : groups[b] - groups[a]));
  return (
    <div className="shapes-mapwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="shapes-map" role="img" aria-label="Map of circuits by shape" data-testid="shapes-map">
        {order.map((i) => {
          const pts = shown[i];
          const on = i === selected;
          return (
            <g key={i} transform={`translate(${X(layout[2 * i]).toFixed(1)} ${Y(layout[2 * i + 1]).toFixed(1)})`} onClick={() => onPick(i)} style={{ cursor: 'pointer' }}>
              <title>{`${label(entries[i])} · ${entries[i].circuit.length.toLocaleString('en-US')} tiles · group ${groups[i] + 1}`}</title>
              <circle r={size / 2 + 3} fill={on ? 'var(--panel-2)' : 'transparent'} stroke={on ? 'var(--accent)' : 'none'} strokeWidth={2} />
              <path d={glyphPath(pts, on ? size * 1.3 : size, reachOf(pts))} fill="none" stroke={colourOf(groups[i])} strokeWidth={on ? 1.6 : 1.1} strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Overlay(props: { a: Entry; b: Entry | null; al: Alignment | null }): JSX.Element {
  const { a, b, al } = props;
  const pa = a.shape;
  // The start does not move a drawn outline; the turn and mirror do.
  const pb = b && al ? placed(b.shape, al) : null;
  const reach = Math.max(reachOf(pa), pb ? reachOf(pb) : 0);
  const size = 320;
  return (
    <svg className="shapes-overlay" viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label="The selected circuit with its nearest shape laid over it" data-testid="shapes-overlay">
      <path d={glyphPath(pa, size * 0.94, reach)} fill="none" stroke="var(--g1)" strokeWidth={1.6} strokeLinejoin="round" />
      {pb && <path d={glyphPath(pb, size * 0.94, reach)} fill="none" stroke="var(--g2)" strokeWidth={1.2} strokeOpacity={0.85} strokeLinejoin="round" />}
    </svg>
  );
}
