/**
 * Two circuits set against each other by hand: B turned, restarted and
 * mirrored onto A with sliders (or moved to the best fit `align` finds), drawn
 * over A with matching tiles joined, and their Fourier terms side by side:
 * sizes, the phase left between them at the current turn and start, and the
 * gap harmonic by harmonic. Terms are about the centroid over the radius of
 * gyration (`shapes/descriptor.ts`), so a copy at another size has the same
 * terms. The circle term f = 1 can be left out of all of it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { align, aligned, outline, terms, type Alignment, type Terms } from '../shapes/descriptor';
import { centroid, type Loop } from './measure';
import { familyLabel, loadClass, type Circuit, type CornerIndex } from './data';
import { fmt } from './charts';

const TERMS = [10, 20, 30, 60];
const LINKS = 12;
const BEST_MS = 700;
const nf = (n: number) => n.toLocaleString('en-US');
const deg = (r: number) => (r * 180) / Math.PI;
/** An angle in degrees to one place, without a sign on zero. */
const angle = (r: number) => fmt(Math.round(deg(r) * 10) / 10 || 0, 1);
const wrap = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/** The terms without the circle term f = 1. */
function withoutCircle(t: Terms): Terms {
  const c = Float64Array.from(t.c);
  c[2 * (1 + t.F)] = 0;
  c[2 * (1 + t.F) + 1] = 0;
  return { F: t.F, c };
}

function size2(t: Terms, f: number): number {
  const i = 2 * (f + t.F);
  return t.c[i] ** 2 + t.c[i + 1] ** 2;
}

/** A loop about its centroid, over its radius of gyration unless `trueSize`. */
function centred(loop: Loop, scale: number): Float64Array {
  const o = centroid(loop);
  const out = new Float64Array(2 * loop.n);
  for (let i = 0; i < loop.n; i++) {
    out[2 * i] = (loop.xy[2 * i] - o.x) * scale;
    out[2 * i + 1] = (loop.xy[2 * i + 1] - o.y) * scale;
  }
  return out;
}

/** B's point at lap fraction t of A once moved: e^{i theta} b(t + s), or e^{i theta} conj(b(-t - s)) mirrored. */
function moved(pts: Float64Array, al: Alignment, t: number): { x: number; y: number } {
  const n = pts.length / 2;
  const u = al.mirror ? -t - al.s : t + al.s;
  const j = ((Math.round(u * n) % n) + n) % n;
  return turn(pts[2 * j], pts[2 * j + 1], al);
}

function turn(x: number, y0: number, al: Alignment): { x: number; y: number } {
  const y = al.mirror ? -y0 : y0;
  const c = Math.cos(al.theta);
  const s = Math.sin(al.theta);
  return { x: x * c - y * s, y: x * s + y * c };
}

export interface ComparePick {
  readonly combo: string;
  readonly index: number;
}

export function Compare(props: {
  base: string;
  index: CornerIndex;
  /** A: the circuit the page is on, and its class's circuits. */
  a: Circuit;
  aLabel: string;
  combo: string;
  circuits: readonly Circuit[];
  /** B to start from. */
  initial: ComparePick;
}): JSX.Element {
  const { base, index, a, aLabel, combo, circuits } = props;
  const [bCombo, setBCombo] = useState(props.initial.combo);
  const [bIndex, setBIndex] = useState(props.initial.index);
  const [loaded, setLoaded] = useState<{ combo: string; circuits: Circuit[] } | null>(null);
  const [F, setF] = useState(30);
  const [theta, setTheta] = useState(0);
  const [s, setS] = useState(0);
  const [mirror, setMirror] = useState(false);
  const [noCircle, setNoCircle] = useState(false);
  const [trueSize, setTrueSize] = useState(false);
  const raf = useRef(0);

  // A new A on the page brings B back to the one it suggests.
  useEffect(() => {
    setBCombo(props.initial.combo);
    setBIndex(props.initial.index);
  }, [props.initial.combo, props.initial.index]);

  useEffect(() => {
    if (bCombo === combo) return;
    const abort = new AbortController();
    loadClass(base, bCombo, abort.signal)
      .then((cs) => setLoaded({ combo: bCombo, circuits: cs }))
      .catch(() => undefined);
    return () => abort.abort();
  }, [base, bCombo, combo]);

  const bList = bCombo === combo ? circuits : loaded?.combo === bCombo ? loaded.circuits : null;
  const b = bList ? (bList[bIndex] ?? bList[0]) : null;

  const ta = useMemo(() => terms(a.loop, F), [a, F]);
  const tb = useMemo(() => (b ? terms(b.loop, F) : null), [b, F]);
  const best = useMemo(() => (tb ? align(noCircle ? withoutCircle(ta) : ta, noCircle ? withoutCircle(tb) : tb, true) : null), [ta, tb, noCircle]);
  const al: Alignment = { gap: 0, mirror, s, theta };
  const A = noCircle ? withoutCircle(ta) : ta;
  const B = tb ? aligned(noCircle ? withoutCircle(tb) : tb, al) : null;

  // Every new pair starts as stored: no turn, no restart, no mirror.
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    setTheta(0);
    setS(0);
    setMirror(false);
  }, [a, b]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /** Slide the turn and start to the best fit (the mirror flips at once). */
  const toBest = () => {
    if (!best) return;
    cancelAnimationFrame(raf.current);
    setMirror(best.mirror);
    const from = { theta, s };
    const dTheta = wrap(best.theta - from.theta);
    const dS = best.s - from.s - Math.round(best.s - from.s);
    if (typeof requestAnimationFrame === 'undefined') {
      setTheta(wrap(from.theta + dTheta));
      setS((((from.s + dS) % 1) + 1) % 1);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / BEST_MS);
      const e = k * k * (3 - 2 * k);
      setTheta(wrap(from.theta + e * dTheta));
      setS((((from.s + e * dS) % 1) + 1) % 1);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const gap = B ? Math.sqrt(Array.from({ length: 2 * F + 1 }, (_, i) => i - F).reduce((g, f) => g + (f === 0 ? 0 : partGap(A, B, f)), 0)) : null;

  return (
    <div className="corners-compare" data-testid="corners-compare">
      <div className="corners-controls">
        <label>
          B: class
          <select
            value={bCombo}
            onChange={(e) => {
              setBCombo(e.target.value);
              setBIndex(0);
            }}
            data-testid="corners-compare-combo"
          >
            {index.classes.map((c) => (
              <option key={c.combo} value={c.combo}>
                {c.combo} · {c.kind}
              </option>
            ))}
          </select>
        </label>
        <label>
          B: circuit
          <select value={bIndex} onChange={(e) => setBIndex(Number(e.target.value))} data-testid="corners-compare-circuit" disabled={!bList}>
            {(bList ?? []).map((c, i) => (
              <option key={i} value={i}>
                {familyLabel(c)} L{c.level} · {nf(c.length)} tiles
              </option>
            ))}
          </select>
        </label>
        <label>
          Terms each side
          <select value={F} onChange={(e) => setF(Number(e.target.value))}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {b && tb && B && best && gap !== null ? (
        <>
          <div className="corners-controls">
            <label>
              Turn B {angle(theta)}°
              <input type="range" min={-180} max={180} step={0.1} value={deg(theta)} onChange={(e) => setTheta((Number(e.target.value) * Math.PI) / 180)} data-testid="corners-compare-turn" />
            </label>
            <label>
              Start B at tile {nf(Math.round(s * b.length) % b.length)} of {nf(b.length)}
              <input type="range" min={0} max={1} step={0.0005} value={s} onChange={(e) => setS(Number(e.target.value))} data-testid="corners-compare-start" />
            </label>
            <label className="corners-check">
              <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} data-testid="corners-compare-mirror" />
              Mirror B
            </label>
            <button type="button" onClick={toBest} data-testid="corners-compare-best">
              Turn B onto A
            </button>
            <button
              type="button"
              onClick={() => {
                cancelAnimationFrame(raf.current);
                setTheta(0);
                setS(0);
                setMirror(false);
              }}
            >
              As stored
            </button>
            <label className="corners-check">
              <input type="checkbox" checked={noCircle} onChange={(e) => setNoCircle(e.target.checked)} data-testid="corners-compare-nocircle" />
              Leave out the circle term f = 1
            </label>
            <label className="corners-check">
              <input type="checkbox" checked={trueSize} onChange={(e) => setTrueSize(e.target.checked)} />
              Draw at true size
            </label>
          </div>
          <p className="corners-note" data-testid="corners-compare-gap">
            Gap {gap.toFixed(3)} radii of gyration at this turn and start; the best fit is {best.gap.toFixed(3)}, turning B {angle(best.theta)}° and starting
            it at tile {nf(Math.round(best.s * b.length) % b.length)}
            {best.mirror ? ', mirrored' : ''}. B has {nf(b.length)} tiles to A’s {nf(a.length)} and a radius of gyration {(b.rg / a.rg).toFixed(3)} times A’s.
          </p>
          <div className="corners-row corners-row-even">
            <CompareOverlay a={a} b={b} A={A} B={B} al={al} noCircle={noCircle} trueSize={trueSize} aLabel={aLabel} />
            <div className="corners-compare-charts">
              <SizesChart a={A} b={B} />
              <PhaseChart a={A} b={B} />
              <GapChart a={A} b={B} />
            </div>
          </div>
        </>
      ) : (
        <p className="corners-note">Loading B…</p>
      )}
    </div>
  );
}

function partGap(a: Terms, b: Terms, f: number): number {
  const i = 2 * (f + a.F);
  return (a.c[i] - b.c[i]) ** 2 + (a.c[i + 1] - b.c[i + 1]) ** 2;
}

/** A, and B moved onto it, about their centroids; the tiles a twelfth of a lap apart on each joined to their partners. */
function CompareOverlay(props: { a: Circuit; b: Circuit; A: Terms; B: Terms; al: Alignment; noCircle: boolean; trueSize: boolean; aLabel: string }): JSX.Element {
  const { a, b, A, B, al, noCircle, trueSize } = props;
  const ka = trueSize ? 1 : 1 / a.rg;
  const kb = trueSize ? 1 : 1 / b.rg;
  // Terms are in radii of gyration; at true size their outlines are scaled back up.
  const scaled = (pts: Float64Array, r: number) => (trueSize ? pts.map((v) => v * r) : pts);
  const pa = useMemo(() => (noCircle ? scaled(outline(A, 720), a.rg) : centred(a.loop, ka)), [noCircle, A, a, ka, trueSize]); // eslint-disable-line react-hooks/exhaustive-deps
  const pbRaw = useMemo(() => centred(b.loop, kb), [b, kb]);
  // Rebuilt without the circle term, B's outline comes from its moved terms; otherwise its own tiles, turned.
  const pbTerms = useMemo(() => (noCircle ? scaled(outline(B, 720), b.rg) : null), [noCircle, B, b, trueSize]); // eslint-disable-line react-hooks/exhaustive-deps
  const pb = useMemo(() => {
    if (pbTerms) return pbTerms;
    const out = new Float64Array(pbRaw.length);
    for (let i = 0; i < pbRaw.length; i += 2) {
      const p = turn(pbRaw[i], pbRaw[i + 1], al);
      out[i] = p.x;
      out[i + 1] = p.y;
    }
    return out;
  }, [pbTerms, pbRaw, al]);
  const at = (pts: Float64Array, t: number) => {
    const n = pts.length / 2;
    const j = ((Math.round(t * n) % n) + n) % n;
    return { x: pts[2 * j], y: pts[2 * j + 1] };
  };
  const links = Array.from({ length: LINKS }, (_, j) => {
    const t = j / LINKS;
    return { p: at(pa, t), q: pbTerms ? at(pbTerms, t) : moved(pbRaw, al, t) };
  });
  let reach = 1e-9;
  for (const pts of [pa, pb]) for (let i = 0; i < pts.length; i++) reach = Math.max(reach, Math.abs(pts[i]));
  const size = 1000;
  const k = (size / 2 - 30) / reach;
  const path = (pts: Float64Array) => {
    const step = Math.max(1, Math.ceil(pts.length / 2 / 3000));
    let d = '';
    for (let i = 0; i < pts.length / 2; i += step) d += `${i ? 'L' : 'M'}${(pts[2 * i] * k).toFixed(1)} ${(-pts[2 * i + 1] * k).toFixed(1)}`;
    return `${d}Z`;
  };
  return (
    <div className="corners-fig">
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="corners-compare-overlay" role="img" aria-label={`${props.aLabel} with B laid over it`} data-testid="corners-compare-overlay">
        <path d={path(pa)} fill="none" stroke="var(--k1)" strokeWidth={2.4} strokeLinejoin="round" />
        <path d={path(pb)} fill="none" stroke="var(--k2)" strokeWidth={1.8} strokeOpacity={0.9} strokeLinejoin="round" />
        {links.map(({ p, q }, j) => (
          <g key={j}>
            <line x1={p.x * k} y1={-p.y * k} x2={q.x * k} y2={-q.y * k} stroke="var(--text)" strokeOpacity={0.5} strokeWidth={j === 0 ? 3 : 1.5} />
            <circle cx={p.x * k} cy={-p.y * k} r={j === 0 ? 11 : 6} fill="var(--k1)" />
            <circle cx={q.x * k} cy={-q.y * k} r={j === 0 ? 11 : 6} fill="var(--k2)" />
          </g>
        ))}
      </svg>
      <p className="corners-note">
        <b style={{ color: 'var(--k1)' }}>A</b> {props.aLabel}; <b style={{ color: 'var(--k2)' }}>B</b> {familyLabel(b)} L{b.level}.{' '}
        {trueSize ? 'Both at their own size.' : 'Each over its own radius of gyration.'} Lines join the tiles a twelfth of a lap apart on A to the tiles the start
        pairs them with on B; the thick one is A’s first tile.
      </p>
    </div>
  );
}

const third = (f: number) => (((f - 1) % 3) + 3) % 3 === 0;

function axis(F: number, W: number, m: { l: number; r: number }) {
  return (f: number) => m.l + ((f + F) / (2 * F)) * (W - m.l - m.r);
}

/** |c_f| of A above the line and of B below, log scale. */
function SizesChart(props: { a: Terms; b: Terms }): JSX.Element {
  const { a, b } = props;
  const F = a.F;
  const W = 720;
  const H = 220;
  const m = { l: 44, r: 10, t: 8, b: 28 };
  const mid = (H - m.b + m.t) / 2;
  const decades = 4;
  const X = axis(F, W, m);
  const h = (r2: number) => ((Math.max(-decades, Math.log10(Math.max(Math.sqrt(r2), 1e-12))) + decades) / decades) * (mid - m.t);
  const fs = Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0);
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Term sizes of A above and B below" data-testid="corners-compare-sizes">
        {[0, 1, 2, 3].map((d) => (
          <g key={d}>
            <line x1={m.l} x2={W - m.r} y1={mid - h(10 ** (-2 * d))} y2={mid - h(10 ** (-2 * d))} stroke="var(--grid)" />
            <line x1={m.l} x2={W - m.r} y1={mid + h(10 ** (-2 * d))} y2={mid + h(10 ** (-2 * d))} stroke="var(--grid)" />
            <text x={m.l - 6} y={mid - h(10 ** (-2 * d)) + 3.5} textAnchor="end" className="tick">
              {d === 0 ? '1' : `1e−${d}`}
            </text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={mid} y2={mid} stroke="var(--line)" />
        {fs.map((f) => (
          <g key={f}>
            <line x1={X(f)} x2={X(f)} y1={mid} y2={mid - h(size2(a, f))} stroke="var(--k1)" strokeWidth={third(f) ? 2.6 : 1.6} strokeLinecap="round" />
            <line x1={X(f)} x2={X(f)} y1={mid} y2={mid + h(size2(b, f))} stroke="var(--k2)" strokeWidth={third(f) ? 2.6 : 1.6} strokeLinecap="round" />
            <title>{`f = ${f}: A ${Math.sqrt(size2(a, f)).toExponential(2)}, B ${Math.sqrt(size2(b, f)).toExponential(2)}`}</title>
          </g>
        ))}
        {[-F, -F / 2, 0, F / 2, F].map((f) => (
          <text key={f} x={X(f)} y={H - m.b + 14} textAnchor="middle" className="tick">
            {Math.round(f)}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
          sizes |c_f|: A above, B below (the harmonics f = 1 mod 3 thicker)
        </text>
      </svg>
    </div>
  );
}

/** The phase of A's term less B's moved one, each dot as strong as the smaller of the two sizes. */
function PhaseChart(props: { a: Terms; b: Terms }): JSX.Element {
  const { a, b } = props;
  const F = a.F;
  const W = 720;
  const H = 180;
  const m = { l: 44, r: 10, t: 8, b: 28 };
  const X = axis(F, W, m);
  const Y = (ph: number) => m.t + ((Math.PI - ph) / (2 * Math.PI)) * (H - m.t - m.b);
  const fs = Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0 && size2(a, f) > 0 && size2(b, f) > 0);
  const top = Math.max(...fs.map((f) => Math.min(size2(a, f), size2(b, f))), 1e-30);
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Phase of A less phase of B, by harmonic" data-testid="corners-compare-phase">
        {[Math.PI, Math.PI / 2, 0, -Math.PI / 2, -Math.PI].map((p) => (
          <g key={p}>
            <line x1={m.l} x2={W - m.r} y1={Y(p)} y2={Y(p)} stroke={p === 0 ? 'var(--line)' : 'var(--grid)'} />
            <text x={m.l - 6} y={Y(p) + 3.5} textAnchor="end" className="tick">
              {p === 0 ? '0' : `${p > 0 ? '' : '−'}${Math.abs(p) === Math.PI ? 'π' : 'π/2'}`}
            </text>
          </g>
        ))}
        {fs.map((f) => {
          const i = 2 * (f + F);
          const d = wrap(Math.atan2(a.c[i + 1], a.c[i]) - Math.atan2(b.c[i + 1], b.c[i]));
          const w = Math.sqrt(Math.min(size2(a, f), size2(b, f)) / top);
          return (
            <circle key={f} cx={X(f)} cy={Y(d)} r={2 + 4 * w} fill={third(f) ? 'var(--accent)' : 'var(--text)'} fillOpacity={0.15 + 0.85 * w}>
              <title>{`f = ${f}: ${angle(d)}°`}</title>
            </circle>
          );
        })}
        {[-F, -F / 2, 0, F / 2, F].map((f) => (
          <text key={f} x={X(f)} y={H - m.b + 14} textAnchor="middle" className="tick">
            {Math.round(f)}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
          phase of A less B: a turn lifts every dot alike, a restart tilts them along a line
        </text>
      </svg>
    </div>
  );
}

/** |a_f - b_f|^2 by harmonic. */
function GapChart(props: { a: Terms; b: Terms }): JSX.Element {
  const { a, b } = props;
  const F = a.F;
  const W = 720;
  const H = 150;
  const m = { l: 44, r: 10, t: 8, b: 28 };
  const X = axis(F, W, m);
  const fs = Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0);
  const parts = new Map(fs.map((f) => [f, partGap(a, b, f)]));
  const top = Math.max(...parts.values(), 1e-12);
  const Y = (v: number) => m.t + (1 - v / top) * (H - m.t - m.b);
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Squared gap by harmonic" data-testid="corners-compare-gaps">
        <line x1={m.l} x2={W - m.r} y1={Y(0)} y2={Y(0)} stroke="var(--line)" />
        <text x={m.l - 6} y={Y(top) + 3.5} textAnchor="end" className="tick">
          {top.toExponential(1)}
        </text>
        {fs.map((f) => (
          <line key={f} x1={X(f)} x2={X(f)} y1={Y(0)} y2={Y(parts.get(f)!)} stroke={third(f) ? 'var(--accent)' : 'var(--muted)'} strokeWidth={2.2} strokeLinecap="round">
            <title>{`f = ${f}: ${parts.get(f)!.toExponential(2)}`}</title>
          </line>
        ))}
        {[-F, -F / 2, 0, F / 2, F].map((f) => (
          <text key={f} x={X(f)} y={H - m.b + 14} textAnchor="middle" className="tick">
            {Math.round(f)}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
          squared gap |a_f − b_f|² by harmonic, at this turn and start
        </text>
      </svg>
    </div>
  );
}
