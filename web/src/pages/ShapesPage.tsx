/**
 * Shapes: circuits grouped by shape. The circuits are those on the Corners
 * page (every class of hexagon rule 023468) and any combination of any
 * hexagon rule picked here, whose circuits are computed in the page. Each
 * circuit's first Fourier terms, sized by its radius of gyration, are
 * compared over turn, starting tile and mirror image (`shapes/descriptor.ts`);
 * the gaps are clustered by average linkage, cut at a threshold, and laid out
 * in the plane. A circuit's terms can be read, rebuilt, drawn as epicycles
 * and set against another's; any circuit opens in the Explorer's infinite
 * view (`shapes/explorerLink.ts`).
 */

import { useEffect, useMemo, useState } from 'react';
import type { TileTypeId } from '../core';
import { familyLabel, loadClass, loadIndex, RULE, type Circuit, type CircuitMeta, type CornerIndex } from './corners/data';
import { centroid, radiusOfGyration, type Loop } from './corners/measure';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { createComboClient } from './shapes/comboCircuits';
import { align, cut, meanShape, medoid, outline, separation, type Alignment } from './shapes/descriptor';
import { explorerCircuitHref } from './shapes/explorerLink';
import { EpicyclesOf, Rebuild, SeparationChart, TermGaps, TermsChart, loopFromTerms } from './shapes/FourierPanel';
import { createShapesClient, type ShapesResult } from './shapes/shapesClient';
import '../styles/shapes.css';

interface Entry {
  readonly key: string;
  /** The rule's classes, e.g. '023468'. */
  readonly rule: string;
  readonly combo: string;
  readonly pattern: string;
  readonly kind: string;
  readonly index: number;
  /** Picked here rather than one of the Corners page's circuits. */
  readonly added: boolean;
  readonly circuit: CircuitMeta & { readonly loop: Loop };
  /** Samples about the centroid over the radius of gyration, at most 160 of them. */
  readonly shape: Float64Array;
}

const TERMS = [10, 20, 30, 60];
const COLOURED = 8;
const nf = (n: number) => n.toLocaleString('en-US');
/** Threshold slider: 0..100 onto 0.005..0.4, evenly in log. */
const fromSlider = (v: number) => 0.005 * 80 ** (v / 100);
const toSlider = (h: number) => (100 * Math.log(h / 0.005)) / Math.log(80);

function normalised(c: { readonly loop: Loop }): Float64Array {
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

const label = (e: Entry) => `${e.added ? `${e.rule}·` : ''}${e.combo} ${familyLabel(e.circuit)} L${e.circuit.level}`;
const colourOf = (g: number) => (g < COLOURED ? `var(--g${g + 1})` : 'var(--muted)');

/** The Explorer's infinite view on this circuit, tracing it, when its first tile is known. */
function explorerHref(base: string, e: Entry): string | null {
  const first = e.circuit.first;
  if (!first) return null;
  return explorerCircuitHref(base, {
    family: 'hex',
    subset: [...e.rule].map(Number),
    combo: e.combo,
    type: e.circuit.type as TileTypeId,
    level: e.circuit.level,
    path: first.path.map(([type, pos]) => ({ type: type as TileTypeId, pos })),
    chord: [
      { x: first.chord[0], y: first.chord[1] },
      { x: first.chord[2], y: first.chord[3] },
    ],
  });
}

export default function ShapesPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [index, setIndex] = useState<CornerIndex | null>(null);
  const [atlas, setAtlas] = useState<Entry[] | null>(null);
  const [added, setAdded] = useState<Entry[]>([]);
  const [showAtlas, setShowAtlas] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** What the last Add came to, shown beside the picker until the next one. */
  const [addNote, setAddNote] = useState<string | null>(null);
  const [F, setF] = useState(30);
  const [mirror, setMirror] = useState(true);
  const [threshold, setThreshold] = useState(0.05);
  const [result, setResult] = useState<ShapesResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [compareKey, setCompareKey] = useState<string | null>(null);
  const [epicycleOf, setEpicycleOf] = useState<'circuit' | 'group'>('circuit');
  const client = useMemo(() => createShapesClient({ forceSync: props.forceSync }), [props.forceSync]);
  const combos = useMemo(() => createComboClient({ forceSync: props.forceSync }), [props.forceSync]);
  useEffect(() => () => client.dispose(), [client]);
  useEffect(() => () => combos.dispose(), [combos]);

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      const idx = await loadIndex(base, abort.signal);
      setIndex(idx);
      const out: Entry[] = [];
      for (const cls of idx.classes) {
        const cs: Circuit[] = await loadClass(base, cls.combo, abort.signal);
        cs.forEach((c, i) =>
          out.push({ key: `${cls.combo}-${i}`, rule: RULE.rule, combo: cls.combo, pattern: cls.pattern, kind: cls.kind, index: i, added: false, circuit: c, shape: normalised(c) }),
        );
        setLoaded(out.length);
      }
      setAtlas(out);
    })().catch((e: unknown) => {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    });
    return () => abort.abort();
  }, [base]);

  const entries = useMemo(() => (atlas ? [...(showAtlas ? atlas : []), ...added] : null), [atlas, added, showAtlas]);

  useEffect(() => {
    if (!entries) return;
    setResult(null);
    if (entries.length < 2) return;
    client
      .run({ loops: entries.map((e) => e.circuit.loop), F, mirror })
      .then(setResult)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [client, entries, F, mirror]);

  // Open on the circuit named in the address (#c=combo-index), else the first.
  useEffect(() => {
    if (!entries || !entries.length || (selectedKey !== null && entries.some((e) => e.key === selectedKey))) return;
    const m = /c=([0-9a-z]+-\d+)/.exec(window.location.hash);
    setSelectedKey(entries.find((e) => e.key === m?.[1])?.key ?? entries[0].key);
  }, [entries, selectedKey]);

  const add = async (c: ComboChoice) => {
    setBusy(true);
    setAddNote(null);
    try {
      const rule = c.subset.join('');
      const circuits = await combos.run({ family: 'hex', subset: c.subset, combo: c.combo, level: c.level });
      const fresh = circuits.map<Entry>((circuit, i) => ({
        key: `${rule}.${c.combo}.L${c.level}-${i}`,
        rule,
        combo: c.combo,
        pattern: c.combo,
        kind: 'picked',
        index: i,
        added: true,
        circuit,
        shape: normalised(circuit),
      }));
      setAdded((prev) => [...prev.filter((e) => !fresh.some((f) => f.key === e.key)), ...fresh]);
      if (fresh.length) {
        setSelectedKey(fresh[fresh.length - 1].key);
        setAddNote(`Added ${rule} · ${c.combo}: ${fresh.length} circuit${fresh.length === 1 ? '' : 's'}, selected below.`);
      } else setAddNote(`${rule} · ${c.combo} has no circuit of 400 tiles or more by level ${c.level}; nothing added.`);
    } catch (e) {
      setAddNote(`${c.subset.join('')} · ${c.combo} could not be computed (${e instanceof Error ? e.message : String(e)}).`);
    } finally {
      setBusy(false);
    }
  };

  const n = entries?.length ?? 0;
  const ready = result && result.terms.length === n ? result : null;
  const selected = entries && selectedKey !== null ? entries.findIndex((e) => e.key === selectedKey) : -1;
  const groups = useMemo(() => (ready ? cut(ready.merges, n, threshold) : null), [ready, n, threshold]);
  const members = useMemo(() => {
    if (!groups) return [];
    const out: number[][] = [];
    groups.forEach((g, i) => (out[g] ??= []).push(i));
    return out;
  }, [groups]);
  const centres = useMemo(() => (ready ? members.map((m) => medoid(m, ready.gaps, n)) : []), [members, ready, n]);
  // Every circuit turned onto its group's medoid, so a group's members face the same way.
  const shown = useMemo(() => {
    if (!entries || !ready || !groups) return null;
    return entries.map((e, i) => {
      const c = centres[groups[i]];
      return placed(e.shape, c === i ? null : align(ready.terms[c], ready.terms[i], mirror));
    });
  }, [entries, ready, groups, centres, mirror]);
  const meanTerms = useMemo(() => (ready ? members.map((m, g) => meanShape(m, ready.terms, centres[g], mirror)) : []), [members, ready, centres, mirror]);
  const means = useMemo(() => meanTerms.map((t) => outline(t, 240)), [meanTerms]);
  const counts = useMemo(() => {
    if (!ready) return [];
    return Array.from({ length: 61 }, (_, i) => {
      const h = fromSlider((i * 100) / 60);
      return { h, k: Math.max(...cut(ready.merges, n, h)) + 1 };
    });
  }, [ready, n]);
  const scores = useMemo(() => (ready && groups ? separation(ready.terms, groups) : null), [ready, groups]);

  const nearest = useMemo(() => {
    if (!ready || selected < 0) return [];
    return Array.from({ length: n }, (_, j) => j)
      .filter((j) => j !== selected)
      .sort((a, b) => ready.gaps[selected * n + a] - ready.gaps[selected * n + b])
      .slice(0, 10);
  }, [ready, selected, n]);
  const compareAt = entries && compareKey !== null ? entries.findIndex((e) => e.key === compareKey) : -1;
  const other = compareAt >= 0 && compareAt !== selected ? compareAt : (nearest[0] ?? null);

  const sel = entries && selected >= 0 ? entries[selected] : null;
  const singles = members.filter((m) => m.length === 1).flat();
  const multi = members.map((m, g) => ({ m, g })).filter(({ m }) => m.length > 1);
  const selAl = ready && sel && other !== null ? align(ready.terms[selected], ready.terms[other], mirror) : null;
  const selExplorer = sel ? explorerHref(base, sel) : null;
  const epicycleLoop = useMemo(() => {
    if (!sel || !groups) return null;
    return epicycleOf === 'group' ? loopFromTerms(meanTerms[groups[selected]]) : sel.circuit.loop;
  }, [sel, groups, epicycleOf, meanTerms, selected]);

  return (
    <article className="shapes-page">
      <header>
        <h1>Shapes</h1>
        <p className="shapes-note">
          Circuits grouped by shape: the Corners page’s circuits of every class of hexagon rule 023468, and any combination of any hexagon rule added below. A
          circuit’s shape is its first Fourier terms about its centroid, divided by its radius of gyration, so position and size drop out; two circuits are
          compared after the turn, starting tile and mirror image that bring them closest, and their <b>gap</b> is the rms distance left between the outlines, in
          radii of gyration. Generations of one family two levels apart are copies at 4 + √15 times the size and come out within a few hundredths; different
          shapes are 0.2 or more apart. Circuits closer on average than the threshold share a group.
        </p>
      </header>

      <section aria-labelledby="shapes-add-h">
        <h2 id="shapes-add-h">Circuits</h2>
        <p className="shapes-note">
          A combination’s circuits are computed here: the renormalisation to the level chosen, then the biggest circuit of each of its four biggest families at its
          last three generations, 400 tiles or more. Level 8 takes a few seconds.
        </p>
        <ComboPicker busy={busy} onAdd={add} />
        {addNote && (
          <p className="shapes-note" data-testid="shapes-add-note" role="status">
            {addNote}
          </p>
        )}
        <div className="shapes-controls">
          <label className="shapes-check">
            <input type="checkbox" checked={showAtlas} onChange={(e) => setShowAtlas(e.target.checked)} data-testid="shapes-atlas" />
            Include the Corners page’s {atlas ? nf(atlas.length) : ''} circuits (rule {RULE.rule})
          </label>
          {added.length > 0 && (
            <span className="shapes-added" data-testid="shapes-added">
              Added:{' '}
              {[...new Set(added.map((e) => `${e.rule}·${e.combo}`))].map((c) => (
                <span key={c} className="shapes-chip">
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => setAdded((prev) => prev.filter((e) => `${e.rule}·${e.combo}` !== c))}>
                    ×
                  </button>
                </span>
              ))}
            </span>
          )}
        </div>
      </section>

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
          {error
            ? error
            : !entries
              ? `Loading circuits… ${loaded}`
              : n < 2
                ? 'Add a combination, or include the Corners page’s circuits, to compare two or more.'
                : !ready
                  ? `Comparing ${nf(n)} circuits…`
                  : `${nf(n)} circuits in ${members.length} group${members.length === 1 ? '' : 's'}: ${multi.length} of two or more, ${singles.length} alone.`}
        </span>
      </div>

      {ready && entries && groups && shown && (
        <>
          <section aria-labelledby="shapes-map-h">
            <h2 id="shapes-map-h">Map</h2>
            <p className="shapes-note">
              Circuits placed so their distances on the page match their gaps as nearly as two dimensions allow (classical multidimensional scaling); each is
              drawn turned to face its group’s middle member. The eight largest groups are coloured; circuits added here are ringed. Click one to select it.
            </p>
            <ShapeMap entries={entries} shown={shown} layout={ready.layout} groups={groups} selected={selected} onPick={(i) => setSelectedKey(entries[i].key)} />
          </section>

          <section aria-labelledby="shapes-selected-h">
            <h2 id="shapes-selected-h">Nearest shapes</h2>
            {sel && (
              <div className="shapes-row">
                <div className="shapes-panel">
                  <Overlay a={sel} b={other !== null ? entries[other] : null} al={selAl} />
                  <p className="shapes-note" data-testid="shapes-selected">
                    <b>{label(sel)}</b>, {nf(sel.circuit.length)} tiles, born in a level-{sel.circuit.level} {sel.circuit.type} supertile
                    {sel.added ? '' : `, ${sel.kind} class ${sel.pattern}`}.{' '}
                    {selExplorer && (
                      <>
                        <a href={selExplorer} data-testid="shapes-explorer">
                          Open in the Explorer
                        </a>{' '}
                        (infinite view, tracing it).{' '}
                      </>
                    )}
                    {!sel.added && <a href={`${base}corners.html#c=${sel.key}`}>Open on the Corners page</a>}
                    {other !== null && (
                      <>
                        {' '}
                        Laid over it: {label(entries[other])}, gap {ready.gaps[selected * n + other].toFixed(3)}.
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
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {nearest.map((j) => {
                        const al = align(ready.terms[selected], ready.terms[j], mirror);
                        const href = explorerHref(base, entries[j]);
                        return (
                          <tr key={j} className={j === other ? 'is-on' : undefined} onClick={() => setCompareKey(entries[j].key)} onDoubleClick={() => setSelectedKey(entries[j].key)}>
                            <td>
                              <Glyph pts={shown[j]} size={26} colour={colourOf(groups[j])} label={label(entries[j])} /> {label(entries[j])}
                            </td>
                            <td>{nf(entries[j].circuit.length)}</td>
                            <td>{ready.gaps[selected * n + j].toFixed(3)}</td>
                            <td>{al.mirror ? 'yes' : ''}</td>
                            <td>{groups[j] === groups[selected] ? 'same' : groups[j] + 1}</td>
                            <td>{href && <a href={href} onClick={(e) => e.stopPropagation()}>Explorer</a>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="shapes-note">Click a row to lay it over the selected circuit and compare their terms below; double-click to select it.</p>
                </div>
              </div>
            )}
          </section>

          {sel && (
            <section aria-labelledby="shapes-fourier-h">
              <h2 id="shapes-fourier-h">Fourier terms</h2>
              <p className="shapes-note">
                The selected circuit’s terms c<sub>f</sub>, f turns per lap, turned and restarted so the circle term and the largest other term are real and
                positive, which makes phases comparable between circuits. Sizes are in radii of gyration and their squares add to 1. The harmonics a third of a turn
                allows (f = 1 mod 3) are in the accent colour; a three-fold circuit has no others.
              </p>
              <TermsChart terms={ready.terms[selected]} testId="shapes-terms-chart" />
              <div className="shapes-row">
                <div className="shapes-panel">
                  <h3>Rebuilt from its terms</h3>
                  <Rebuild terms={ready.terms[selected]} shape={sel.shape} />
                </div>
                <div className="shapes-panel">
                  <h3>
                    Epicycles of{' '}
                    <select value={epicycleOf} onChange={(e) => setEpicycleOf(e.target.value as 'circuit' | 'group')} data-testid="shapes-epicycles-of">
                      <option value="circuit">this circuit</option>
                      <option value="group">its group’s mean shape</option>
                    </select>
                  </h3>
                  {epicycleLoop && <EpicyclesOf key={`${selectedKey}/${epicycleOf}/${F}`} loop={epicycleLoop} />}
                </div>
              </div>
              {other !== null && selAl && (
                <>
                  <h3>
                    Term by term against {label(entries[other])}
                    {selAl.mirror ? ' (mirrored)' : ''}
                  </h3>
                  <TermGaps a={ready.terms[selected]} b={ready.terms[other]} al={selAl} />
                </>
              )}
            </section>
          )}

          <section aria-labelledby="shapes-groups-h">
            <h2 id="shapes-groups-h">Groups</h2>
            <p className="shapes-note">
              Each group’s mean shape (its members’ terms averaged after turning each onto the middle member) and its members. The first chart shows how many
              groups each threshold gives; flat stretches are thresholds the grouping does not depend on. The second shows which terms tell the groups apart: for
              each harmonic, how much its size varies between groups of two or more against within them, with the five strongest labelled.
            </p>
            <GroupCount counts={counts} threshold={threshold} />
            {scores && <SeparationChart scores={scores} F={F} />}
            <div className="shapes-groups" data-testid="shapes-groups">
              {multi.map(({ m, g }) => (
                <div key={g} className={`shapes-group${selected >= 0 && groups[selected] === g ? ' is-on' : ''}`}>
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
                      <button key={i} type="button" title={`${label(entries[i])} · ${nf(entries[i].circuit.length)} tiles`} onClick={() => setSelectedKey(entries[i].key)} aria-pressed={i === selected}>
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
                      <button key={i} type="button" title={`${label(entries[i])} · ${nf(entries[i].circuit.length)} tiles`} onClick={() => setSelectedKey(entries[i].key)} aria-pressed={i === selected}>
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
      {index && <p className="shapes-note">Corners page circuits: rule {index.rule} on the hexagons, tile positions from {index.generated}.</p>}
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
              <circle
                r={size / 2 + 3}
                fill={on ? 'var(--panel-2)' : 'transparent'}
                stroke={on ? 'var(--accent)' : entries[i].added ? 'var(--text)' : 'none'}
                strokeWidth={on ? 2 : 1}
                strokeDasharray={!on && entries[i].added ? '3 3' : undefined}
              />
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
