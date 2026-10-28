/**
 * Corners: how many sides a circuit has. Four measures, all computed here
 * from the circuit's tile positions (`corners/measure.ts`): equal-tile
 * corners walked round it, polygons fitted with sides of any length, a score
 * that only takes more corners when they pay, and its Fourier series, drawn
 * as epicycles. The tile positions come from `web/circuit-classes/corner-paths.ts`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  chooseCorners,
  chordCorners,
  decimation,
  evenStarts,
  symmetryShare,
  type ChordCurve,
  type PolygonFit,
  type Spectrum,
} from './corners/measure';
import { ErrorChart, OutlineView, SidesBars, SpectrumChart, SymmetryBars, WalkChart, fmt, type Overlay } from './corners/charts';
import { createCornersClient } from './corners/cornersClient';
import type { TileTypeId } from '../core';
import { familyLabel, loadClass, loadIndex, RULE, type Circuit, type CornerIndex } from './corners/data';
import { Compare } from './corners/Compare';
import { Epicycles } from './corners/Epicycles';
import { Survey } from './corners/Survey';
import { explorerCircuitHref } from './shapes/explorerLink';
import '../styles/corners.css';

const WALK_STARTS = 1080;
const MAX_WALKS = 8;
const MAX_SIDES = 24;
const FREE_SIDES = Array.from({ length: MAX_SIDES - 2 }, (_, i) => i + 3);
const THIRD_SIDES = FREE_SIDES.filter((k) => k % 3 === 0);
/** Samples the fits keep: free corners have three times as many places to go, so they get half the samples. */
const FIT_SAMPLES = { free: 360, thirds: 720 } as const;
const SYMMETRY_TURNS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DEFAULT_COMBO = '000100000';
const nf = (n: number) => n.toLocaleString('en-US');

type FitMode = 'free' | 'thirds';
const turnsOf = (mode: FitMode) => (mode === 'free' ? 1 : 3);
const sidesOf = (mode: FitMode) => (mode === 'free' ? FREE_SIDES : THIRD_SIDES);

interface Results {
  readonly walks: ReadonlyMap<number, ChordCurve>;
  /** Keyed `${circuit}:${m}:${k}`. */
  readonly fits: ReadonlyMap<string, PolygonFit>;
  readonly spectrum: Spectrum | null;
}
const EMPTY: Results = { walks: new Map(), fits: new Map(), spectrum: null };
const fitKey = (circuit: number, m: number, k: number) => `${circuit}:${m}:${k}`;

/** Same family: the same child slots, or one of the families sharing that circuit. */
function sameFamily(a: Circuit, b: Circuit): boolean {
  const fa = [a.family, ...a.aliases];
  return fa.includes(b.family) || b.aliases.some((x) => fa.includes(x));
}

export default function CornersPage(props: { forceSync?: boolean }): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [index, setIndex] = useState<CornerIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [combo, setCombo] = useState(() => fromHash()?.combo ?? DEFAULT_COMBO);
  const [circuits, setCircuits] = useState<Circuit[] | null>(null);
  const [pick, setPick] = useState<number | null>(() => fromHash()?.index ?? null);
  const [walkKs, setWalkKs] = useState<number[]>([3, 6, 9]);
  const [slotOf, setSlotOf] = useState<ReadonlyMap<number, number>>(new Map([[3, 1], [6, 2], [9, 3]]));
  const [addK, setAddK] = useState('12');
  const [signed, setSigned] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<FitMode>('free');
  const [gain, setGain] = useState(0.1);
  const [pickedSides, setPickedSides] = useState<number | null>(null);
  const [results, setResults] = useState<Results>(EMPTY);
  const client = useMemo(() => createCornersClient({ forceSync: props.forceSync }), [props.forceSync]);
  const asked = useRef(new Set<string>());
  const epoch = useRef(0);
  useEffect(() => () => client.dispose(), [client]);

  useEffect(() => {
    const abort = new AbortController();
    loadIndex(base, abort.signal)
      .then(setIndex)
      .catch((e: unknown) => {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => abort.abort();
  }, [base]);

  useEffect(() => {
    const abort = new AbortController();
    setCircuits(null);
    loadClass(base, combo, abort.signal)
      .then((cs) => {
        setCircuits(cs);
        // Open on the family with the knobbly corners when the class has it.
        setPick((p) => (p !== null && p < cs.length ? p : lastOf(cs, '147')));
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => abort.abort();
  }, [base, combo]);

  const circuit = circuits && pick !== null ? circuits[pick] : null;
  // The address names the circuit shown (#c=combo-index), so a link opens it.
  useEffect(() => {
    if (circuit && pick !== null) window.history.replaceState(null, '', `#c=${combo}-${pick}`);
  }, [circuit, combo, pick]);
  const starts = useMemo(() => (circuit ? evenStarts(circuit.loop.n, WALK_STARTS) : []), [circuit]);
  const generations = useMemo(
    () => (circuits && circuit ? circuits.map((c, i) => ({ c, i })).filter(({ c }) => sameFamily(c, circuit)).sort((a, b) => a.c.level - b.c.level) : []),
    [circuits, circuit],
  );

  // B for the comparison: the same family two levels up (a copy 4 + √15 times the size), else two down, else another generation, else the next circuit.
  const compareWith = useMemo(() => {
    if (!circuits || !circuit || pick === null) return null;
    const other = generations.filter(({ i }) => i !== pick);
    const at = (dl: number) => {
      const here = other.filter(({ c }) => c.level === circuit.level + dl);
      return here.find(({ c }) => c.family === circuit.family) ?? here[0];
    };
    const g = at(2) ?? at(-2) ?? other[other.length - 1];
    return { combo, index: g ? g.i : (pick + 1) % circuits.length };
  }, [circuits, circuit, pick, generations, combo]);

  // A new circuit drops every job still running for the old one.
  useEffect(() => {
    client.reset();
    asked.current = new Set();
    epoch.current++;
    setResults(EMPTY);
    setHover(null);
    setPickedSides(null);
  }, [client, circuit]);

  useEffect(() => {
    if (!circuit || pick === null) return;
    const mine = epoch.current;
    const ask = (key: string, go: () => Promise<void>) => {
      if (asked.current.has(key)) return;
      asked.current.add(key);
      go().catch(() => asked.current.delete(key));
    };
    const keep = (f: (r: Results) => Results) => {
      if (epoch.current === mine) setResults(f);
    };
    ask('spectrum', async () => {
      const s = await client.run<Spectrum>({ kind: 'spectrum', loop: circuit.loop });
      keep((r) => ({ ...r, spectrum: s }));
    });
    for (const k of walkKs)
      ask(`walk:${k}`, async () => {
        const w = await client.run<ChordCurve>({ kind: 'walk', loop: circuit.loop, rg: circuit.rg, k, starts });
        keep((r) => ({ ...r, walks: new Map(r.walks).set(k, w) }));
      });
    // This circuit's fits both ways, then its other generations' the current way.
    const fitsFor = (i: number, c: Circuit, md: FitMode) => {
      const m = turnsOf(md);
      const step = decimation(c.loop.n, m, FIT_SAMPLES[md]);
      if (step === null) return;
      for (const k of sidesOf(md))
        ask(`fit:${fitKey(i, m, k)}`, async () => {
          const f = await client.run<PolygonFit>({ kind: 'polygon', loop: c.loop, rg: c.rg, k, m, step });
          keep((r) => ({ ...r, fits: new Map(r.fits).set(fitKey(i, m, k), f) }));
        });
    };
    fitsFor(pick, circuit, 'thirds');
    fitsFor(pick, circuit, 'free');
    for (const g of generations) if (g.i !== pick) fitsFor(g.i, g.c, mode);
  }, [client, circuit, pick, walkKs, starts, generations, mode]);

  const colorOf = (k: number) => `var(--k${slotOf.get(k) ?? 1})`;
  const addWalk = () => {
    const k = Number(addK);
    if (!Number.isInteger(k) || k < 2 || k > 60 || walkKs.includes(k) || walkKs.length >= MAX_WALKS) return;
    const used = new Set(slotOf.values());
    let s = 1;
    while (used.has(s)) s++;
    setSlotOf(new Map(slotOf).set(k, s));
    setWalkKs([...walkKs, k].sort((a, b) => a - b));
    setAddK('');
  };
  const removeWalk = (k: number) => {
    setWalkKs(walkKs.filter((x) => x !== k));
    const next = new Map(slotOf);
    next.delete(k);
    setSlotOf(next);
  };

  const errorsOf = (i: number, md: FitMode) => {
    const m = turnsOf(md);
    const out = new Map<number, number>();
    for (const k of sidesOf(md)) {
      const f = results.fits.get(fitKey(i, m, k));
      if (f) out.set(k, f.rms);
    }
    return out;
  };
  const chosenOf = (i: number, md: FitMode) => {
    const e = errorsOf(i, md);
    return e.size === sidesOf(md).length ? chooseCorners(e, gain) : null;
  };

  if (error) return <p className="corners-note">The circuit data isn’t available ({error}).</p>;

  const walks = walkKs.map((k) => results.walks.get(k)).filter((w): w is ChordCurve => !!w);
  const m = turnsOf(mode);
  const chosen = pick !== null ? chosenOf(pick, mode) : null;
  const sides = pickedSides ?? chosen ?? 3;
  const fit = pick !== null ? results.fits.get(fitKey(pick, m, sides)) : undefined;
  const loopPoint = (s: number) => ({ x: circuit!.loop.xy[2 * s], y: circuit!.loop.xy[2 * s + 1] });

  return (
    <article className="corners-page">
      <header>
        <h1>Corners</h1>
        <p className="corners-note">
          How many sides a circuit has, four ways. Equal-tile corners are walked round it; polygons are fitted to it with sides of any length; a score keeps
          more corners only when each one cuts the error by a set fraction; and its Fourier series shows which turns map it to itself, drawn as epicycles. The
          circuits are the biggest of each family at its last few generations, for every class of rule {index?.rule ?? '023468'} on the hexagons, sampled at{' '}
          {nf(index?.samples ?? 4320)} tiles evenly spaced along each.
        </p>
      </header>

      <div className="corners-controls">
        <label>
          Class
          <select
            value={combo}
            onChange={(e) => {
              setPick(null);
              setCombo(e.target.value);
            }}
            data-testid="corners-class"
          >
            {index?.classes.map((c) => (
              <option key={c.combo} value={c.combo}>
                {c.combo} · {c.pattern} · {c.kind} · {c.members} pairing{c.members === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>
        <div className="corners-field">
          Circuit
          <div className="corners-seg" role="group" aria-label="Circuit">
            {circuits?.map((c, i) => (
              <button key={i} type="button" aria-pressed={i === pick} onClick={() => setPick(i)} data-testid="corners-circuit">
                {familyLabel(c)} L{c.level} · {nf(c.length)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!circuit ? (
        <p className="corners-note">Loading…</p>
      ) : (
        <>
          <p className="corners-note" data-testid="corners-caption">
            Family {familyLabel(circuit)} of combination <span className="mono">{combo}</span>: {nf(circuit.length)} tiles, born in a level-{circuit.level}{' '}
            {circuit.type} supertile, radius of gyration {circuit.rg.toFixed(1)}. <a href={`${base}shapes.html#c=${combo}-${pick}`}>Nearest shapes</a>.
            {circuit.first && (
              <>
                {' '}
                <a
                  href={explorerCircuitHref(base, {
                    family: 'hex',
                    subset: [...RULE.rule].map(Number),
                    combo,
                    type: circuit.type as TileTypeId,
                    level: circuit.level,
                    path: circuit.first.path.map(([type, pos]) => ({ type: type as TileTypeId, pos })),
                    chord: [
                      { x: circuit.first.chord[0], y: circuit.first.chord[1] },
                      { x: circuit.first.chord[2], y: circuit.first.chord[3] },
                    ],
                  })}
                  data-testid="corners-explorer"
                >
                  Open in the Explorer
                </a>
                .
              </>
            )}
          </p>

          <section aria-labelledby="corners-walk-h">
            <h2 id="corners-walk-h">Corners walked round</h2>
            <p className="corners-note">
              The loop cut into k runs of equal tile count from every start; each tile’s distance to the chord across its run, summed and divided by the tile count
              and the radius of gyration. Filled dots mark the best start, hollow ones the worst. <b>Contrast</b> is (worst − best) ÷ mean; <b>swing</b> is twice the
              curve’s k-th harmonic over its mean, the same thing measured from every start.
            </p>
            <div className="corners-controls">
              <div className="corners-field">
                Distance
                <div className="corners-seg" role="group" aria-label="Distance">
                  <button type="button" aria-pressed={!signed} onClick={() => setSigned(false)}>
                    Unsigned
                  </button>
                  <button type="button" aria-pressed={signed} onClick={() => setSigned(true)}>
                    Signed
                  </button>
                </div>
              </div>
              <div className="corners-field">
                Corners
                <form
                  className="corners-chips"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addWalk();
                  }}
                >
                  {walkKs.map((k) => (
                    <span key={k} className="corners-chip">
                      <i style={{ background: colorOf(k) }} />
                      {k}
                      <button type="button" aria-label={`Remove ${k} corners`} onClick={() => removeWalk(k)}>
                        ×
                      </button>
                    </span>
                  ))}
                  <span className="corners-addk">
                    <input type="number" min={2} max={60} value={addK} onChange={(e) => setAddK(e.target.value)} aria-label="Corners to add" data-testid="corners-add-k" />
                    <button type="submit" disabled={walkKs.length >= MAX_WALKS} data-testid="corners-add">
                      Add
                    </button>
                  </span>
                </form>
              </div>
            </div>
            <div className="corners-row">
              <div className="corners-fig">
                <OutlineView
                  loop={circuit.loop}
                  label="The circuit with equal-tile corners"
                  overlays={walks.map<Overlay>((w) => ({
                    key: `w${w.k}`,
                    color: colorOf(w.k),
                    pts: chordCorners(circuit.loop.n, w.k, starts[hover ?? w.best]).map(loopPoint),
                  }))}
                />
                <p className="corners-note">{hover !== null ? 'Corners from the start under the pointer.' : 'Corners at each count’s best start.'}</p>
              </div>
              <WalkChart curves={walks} n={circuit.loop.n} tiles={circuit.length} colorOf={colorOf} signed={signed} onHover={setHover} />
            </div>
            <div className="corners-tablewrap">
              <table className="corners-table" data-testid="corners-walk-table">
                <thead>
                  <tr>
                    <th>corners</th>
                    <th>best</th>
                    <th>signed at best</th>
                    <th>mean</th>
                    <th>worst</th>
                    <th>contrast</th>
                    <th>swing</th>
                  </tr>
                </thead>
                <tbody>
                  {walkKs.map((k) => {
                    const w = results.walks.get(k);
                    return (
                      <tr key={k}>
                        <td>
                          <span className="corners-chip" style={{ border: 0, padding: 0, background: 'none' }}>
                            <i style={{ background: colorOf(k) }} />
                            {k}
                          </span>
                        </td>
                        {w ? (
                          <>
                            <td>{fmt(w.unsigned[w.best], 4)}</td>
                            <td>{fmt(w.signed[w.best], 4)}</td>
                            <td>{fmt(w.unsigned.reduce((a, b) => a + b, 0) / w.unsigned.length, 4)}</td>
                            <td>{fmt(w.unsigned[w.worst], 4)}</td>
                            <td>{w.contrast.toFixed(2)}</td>
                            <td>{w.swing.toFixed(2)}</td>
                          </>
                        ) : (
                          <td colSpan={6}>computing…</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="corners-fit-h">
            <h2 id="corners-fit-h">Fitted polygons</h2>
            <p className="corners-note">
              k corners anywhere on the loop, chosen by dynamic programming so that the sides pass closest to it: each tile’s squared distance to the side across
              its stretch of the loop, summed, is least. The sides can have any lengths, and the polygon drawn is the one measured, so more sides never fit worse.
              With <b>thirds alike</b> the three thirds of the loop share one set of corners, turned, which leaves a third as many to choose; for an exactly
              three-fold circuit it costs almost nothing in fit.
              {results.spectrum && ` This one has ${(symmetryShare(results.spectrum, 3, true) * 100).toFixed(1)}% of its shape beyond the circle on the harmonics a third of a turn allows (100% is three-fold).`}{' '}
              The score keeps more sides only if each extra corner cuts the rms distance by the fraction set.
            </p>
            <div className="corners-controls">
              <div className="corners-field">
                Fit
                <div className="corners-seg" role="group" aria-label="Fit">
                  <button type="button" aria-pressed={mode === 'free'} onClick={() => setMode('free')} data-testid="corners-mode-free">
                    Sides free
                  </button>
                  <button type="button" aria-pressed={mode === 'thirds'} onClick={() => setMode('thirds')} data-testid="corners-mode-thirds">
                    Thirds alike
                  </button>
                </div>
              </div>
              <label>
                Each corner must cut the error by {Math.round(gain * 100)}%
                <input type="range" min={1} max={40} value={Math.round(gain * 100)} onChange={(e) => setGain(Number(e.target.value) / 100)} data-testid="corners-gain" />
              </label>
              <span className="corners-note" data-testid="corners-chosen">
                {chosen !== null ? `Chosen: ${chosen} sides.` : decimation(circuit.loop.n, m) === null ? 'This loop does not split into equal thirds.' : 'Fitting…'} {pickedSides !== null && pickedSides !== chosen ? `Showing ${pickedSides}.` : ''}
              </span>
            </div>
            <div className="corners-row">
              <div className="corners-fig">
                <OutlineView loop={circuit.loop} label={`The circuit with its best ${sides}-sided polygon`} overlays={fit ? [{ key: 'fit', color: 'var(--k1)', pts: fit.corners }] : []} testId="corners-fit-outline" />
                {fit && (
                  <>
                    <SidesBars sides={fit.sides} />
                    <p className="corners-note">
                      {sides} sides, rms {fit.rms.toFixed(4)} × Rg. Lengths round the loop, as % of the perimeter:{' '}
                      {fit.sides.map((s) => ((s / fit.sides.reduce((a, b) => a + b, 0)) * 100).toFixed(1)).join(' · ')}
                    </p>
                  </>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <ErrorChart
                  kMin={3}
                  kMax={MAX_SIDES}
                  chosen={chosen}
                  picked={sides}
                  onPick={(k) => setPickedSides(mode === 'thirds' && k % 3 !== 0 ? Math.max(3, Math.round(k / 3) * 3) : k)}
                  series={[
                    { id: 'free', label: 'sides free', color: 'var(--k1)', points: FREE_SIDES.flatMap((k) => (results.fits.get(fitKey(pick!, 1, k)) ? [{ k, v: results.fits.get(fitKey(pick!, 1, k))!.rms }] : [])) },
                    {
                      id: 'thirds',
                      label: 'thirds alike',
                      color: 'var(--k2)',
                      dashed: true,
                      points: THIRD_SIDES.flatMap((k) => (results.fits.get(fitKey(pick!, 3, k)) ? [{ k, v: results.fits.get(fitKey(pick!, 3, k))!.rms }] : [])),
                    },
                  ]}
                />
                <p className="corners-note">Click a number of sides to draw that polygon. The dashed line marks the count the score chose.</p>
                <div className="corners-tablewrap">
                  <table className="corners-table" data-testid="corners-generations">
                    <thead>
                      <tr>
                        <th>generation</th>
                        <th>tiles</th>
                        <th>chosen sides ({mode === 'free' ? 'free' : 'thirds alike'})</th>
                        <th>rms at chosen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generations.map(({ c, i }) => {
                        const k = chosenOf(i, mode);
                        const f = k !== null ? results.fits.get(fitKey(i, m, k)) : undefined;
                        return (
                          <tr key={i} className={i === pick ? 'is-on' : undefined} data-pick onClick={() => setPick(i)}>
                            <td>
                              level {c.level} {familyLabel(c)}
                            </td>
                            <td>{nf(c.length)}</td>
                            <td className="is-chosen">{k ?? '…'}</td>
                            <td>{f ? f.rms.toFixed(4) : '…'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="corners-fourier-h">
            <h2 id="corners-fourier-h">Fourier series</h2>
            <p className="corners-note">
              The loop as a sum of circles turning f times per lap, about its centroid, with the samples one tile-step apart. A turn by 1/m of a circle that carries
              tile i to tile i + L/m leaves only the harmonics f = 1 (mod m), so the share of the shape on those harmonics, leaving out the circle f = 1 that every m
              keeps, is 1 exactly when the circuit is m-fold.
            </p>
            {results.spectrum ? (
              <>
                <div className="corners-row corners-row-even">
                  <SymmetryBars shares={SYMMETRY_TURNS.map((t) => ({ m: t, share: symmetryShare(results.spectrum!, t, true) }))} />
                  <SpectrumChart spectrum={results.spectrum} F={60} />
                </div>
                <p className="corners-note">Amplitudes as a fraction of the circle’s; the harmonics a third of a turn allows (f = 1 mod 3) in the accent colour.</p>
                <div className="corners-epi">
                  <Epicycles loop={circuit.loop} spectrum={results.spectrum} />
                  <p className="corners-note">
                    Each term is a circle of radius |c<sub>f</sub>| turning f times per lap, largest first, each centred on the tip of the one before. With all{' '}
                    {nf(circuit.loop.n - 1)} terms the tip passes through every sample. For a three-fold circuit every term turns 1, −2, 4, −5, 7, … times per lap.
                  </p>
                </div>
              </>
            ) : (
              <p className="corners-note">Computing…</p>
            )}
          </section>
        </>
      )}

      {index && circuit && circuits && compareWith && (
        <section aria-labelledby="corners-compare-h">
          <h2 id="corners-compare-h">Two circuits compared</h2>
          <p className="corners-note">
            B laid over A, each about its centroid over its radius of gyration, so a copy at another size has the same terms. Turning B adds the same angle to the
            phase of every term; starting it k tiles on adds 2π f k / L to term f. The best fit is the turn, start and mirror image that leave the least rms gap
            between the outlines. B starts as the same family two levels up when the class has it.
          </p>
          <Compare base={base} index={index} a={circuit} aLabel={`${combo} ${familyLabel(circuit)} L${circuit.level}`} combo={combo} circuits={circuits} initial={compareWith} />
        </section>
      )}

      {index && (
        <section aria-labelledby="corners-survey-h">
          <h2 id="corners-survey-h">Every circuit</h2>
          <p className="corners-note">
            Each circuit’s shares on the thirds and sixths harmonics, its thirds-alike fits at 3, 6, 9 and 12 sides with the count the score chooses at the fraction
            set above, the counts chosen at each level of its family, and the contrast when 3, 6 and 9 equal-tile corners are walked round. Click a row to open it
            above.
          </p>
          <Survey
            base={base}
            index={index}
            gain={gain}
            forceSync={props.forceSync}
            picked={pick !== null ? { combo, index: pick } : null}
            onPick={(c, i) => {
              setCombo(c);
              setPick(i);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </section>
      )}
    </article>
  );
}

/** The circuit named in the address, #c=combo-index. */
function fromHash(): { combo: string; index: number } | null {
  if (typeof window === 'undefined') return null;
  const m = /c=([0-9a-z]+)-(\d+)/.exec(window.location.hash);
  return m ? { combo: m[1], index: Number(m[2]) } : null;
}

/** The highest-level circuit of a family, or the first circuit if the class has none. */
function lastOf(cs: readonly Circuit[], family: string): number {
  let best = -1;
  cs.forEach((c, i) => {
    if ((c.family === family || c.aliases.includes(family)) && (best < 0 || c.level >= cs[best].level)) best = i;
  });
  return Math.max(0, best);
}
