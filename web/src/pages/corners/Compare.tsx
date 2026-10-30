/**
 * Two circuits through their Fourier terms. Each is put in the same standard
 * position first: about its centroid, over its radius of gyration, A turned
 * and restarted so its circle term and largest other term are real and
 * positive (`canonical`), B turned, restarted and if need be mirrored onto A
 * (`align`). Their terms are drawn side by side; any harmonic can be switched
 * off for both, and each circuit is redrawn, and traced by epicycles, from the
 * terms left on.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { align, aligned, canonical, outline, terms, type Alignment, type Terms } from '../shapes/descriptor';
import { centroid, type Loop } from './measure';
import { familyLabel, loadClass, type Circuit, type CornerIndex } from './data';

const TERMS = [10, 20, 30, 60];
const LAP_MS = 12000;
const TRACE = 720;
const nf = (n: number) => n.toLocaleString('en-US');
const third = (f: number) => (((f - 1) % 3) + 3) % 3 === 0;

export interface ComparePick {
  readonly combo: string;
  readonly index: number;
}

function harmonics(F: number): number[] {
  return Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0);
}

function size(t: Terms, f: number): number {
  const i = 2 * (f + t.F);
  return Math.hypot(t.c[i], t.c[i + 1]);
}

/** The terms with the harmonics in `off` set to zero. */
function keep(t: Terms, off: ReadonlySet<number>): Terms {
  const c = Float64Array.from(t.c);
  for (const f of off) {
    if (Math.abs(f) > t.F) continue;
    c[2 * (f + t.F)] = 0;
    c[2 * (f + t.F) + 1] = 0;
  }
  return { F: t.F, c };
}

/** A circuit's tiles about its centroid over its radius of gyration, turned (and mirrored) as `al` says. */
function standard(loop: Loop, rg: number, al: Alignment): Float64Array {
  const o = centroid(loop);
  const c = Math.cos(al.theta);
  const s = Math.sin(al.theta);
  const out = new Float64Array(2 * loop.n);
  for (let i = 0; i < loop.n; i++) {
    const x = (loop.xy[2 * i] - o.x) / rg;
    const y = ((loop.xy[2 * i + 1] - o.y) / rg) * (al.mirror ? -1 : 1);
    out[2 * i] = x * c - y * s;
    out[2 * i + 1] = x * s + y * c;
  }
  return out;
}

/** One class's circuits, loaded once and shared between both pickers. */
function useClasses(base: string, combo: string, circuits: readonly Circuit[]) {
  const [cache, setCache] = useState<ReadonlyMap<string, readonly Circuit[]>>(() => new Map([[combo, circuits]]));
  const asked = useRef(new Set<string>());
  const get = (c: string) => (c === combo ? circuits : cache.get(c) ?? null);
  const want = (c: string) => {
    if (c === combo || asked.current.has(c)) return;
    asked.current.add(c);
    loadClass(base, c)
      .then((cs) => setCache((m) => new Map(m).set(c, cs)))
      .catch(() => undefined);
  };
  return { get, want };
}

function Picker(props: {
  name: string;
  index: CornerIndex;
  pick: ComparePick;
  list: readonly Circuit[] | null;
  onPick: (p: ComparePick) => void;
  colour: string;
}): JSX.Element {
  const { name, index, pick, list, onPick } = props;
  return (
    <div className="corners-compare-pick">
      <b style={{ color: props.colour }}>{name}</b>
      <select value={pick.combo} onChange={(e) => onPick({ combo: e.target.value, index: 0 })} aria-label={`${name}: class`} data-testid={`corners-compare-${name}-combo`}>
        {index.classes.map((c) => (
          <option key={c.combo} value={c.combo}>
            {c.combo} · {c.kind}
          </option>
        ))}
      </select>
      <select
        value={pick.index}
        disabled={!list}
        onChange={(e) => onPick({ combo: pick.combo, index: Number(e.target.value) })}
        aria-label={`${name}: circuit`}
        data-testid={`corners-compare-${name}-circuit`}
      >
        {(list ?? []).map((c, i) => (
          <option key={i} value={i}>
            {familyLabel(c)} L{c.level} · {nf(c.length)} tiles
          </option>
        ))}
      </select>
    </div>
  );
}

export function Compare(props: {
  base: string;
  index: CornerIndex;
  /** The page's circuit and its class's circuits: A to start from. */
  combo: string;
  circuits: readonly Circuit[];
  pick: number;
  /** B to start from. */
  initial: ComparePick;
}): JSX.Element {
  const { base, index } = props;
  const classes = useClasses(base, props.combo, props.circuits);
  const [aPick, setAPick] = useState<ComparePick>({ combo: props.combo, index: props.pick });
  const [bPick, setBPick] = useState<ComparePick>(props.initial);

  // The page's circuit changing brings A and B back to it and the one it suggests.
  useEffect(() => {
    setAPick({ combo: props.combo, index: props.pick });
    setBPick(props.initial);
  }, [props.combo, props.pick, props.initial]);
  useEffect(() => {
    classes.want(aPick.combo);
    classes.want(bPick.combo);
  });

  const aList = classes.get(aPick.combo);
  const bList = classes.get(bPick.combo);
  const a = aList?.[aPick.index] ?? null;
  const b = bList?.[bPick.index] ?? null;

  return (
    <div className="corners-compare" data-testid="corners-compare">
      <div className="corners-controls">
        <Picker name="A" index={index} pick={aPick} list={aList} onPick={setAPick} colour="var(--k1)" />
        <Picker name="B" index={index} pick={bPick} list={bList} onPick={setBPick} colour="var(--k2)" />
      </div>
      {a && b ? (
        <TermsCompare
          a={{ loop: a.loop, rg: a.rg, length: a.length, label: `${familyLabel(a)} L${a.level}` }}
          b={{ loop: b.loop, rg: b.rg, length: b.length, label: `${familyLabel(b)} L${b.level}` }}
        />
      ) : (
        <p className="corners-note">Loading…</p>
      )}
    </div>
  );
}

/** A circuit as the terms see it: its tile positions as a loop, its radius of gyration, its length and a name. */
export interface TermsSubject {
  readonly loop: Loop;
  readonly rg: number;
  readonly length: number;
  readonly label: string;
}

/**
 * Two loops through their Fourier terms: the terms chart, the terms switched
 * on, the gap between the drawings, and the epicycles. Any page with two
 * loops can use it.
 */
export function TermsCompare(props: { a: TermsSubject; b: TermsSubject }): JSX.Element {
  const { a, b } = props;
  const [F, setF] = useState(30);
  const [off, setOff] = useState<ReadonlySet<number>>(new Set());
  const fit = useMemo(() => {
    const ta = terms(a.loop, F);
    const A = canonical(ta);
    const aAl = align(A, ta, false);
    const tb = terms(b.loop, F);
    const bAl = align(A, tb, true);
    return { A, B: aligned(tb, bAl), aAl, bAl };
  }, [a, b, F]);
  const tiles = useMemo(() => ({ a: standard(a.loop, a.rg, fit.aAl), b: standard(b.loop, b.rg, fit.bAl) }), [a, b, fit]);

  const kept = { A: keep(fit.A, off), B: keep(fit.B, off) };
  const fs = harmonics(F);
  const on = fs.filter((f) => !off.has(f));
  const sumOn = (t: Terms) => on.reduce((s, f) => s + size(t, f) ** 2, 0);
  const gap = Math.sqrt(on.reduce((s, f) => s + diff2(fit.A, fit.B, f), 0));
  const set = (pred: (f: number) => boolean) => setOff(new Set(harmonics(60).filter((f) => !pred(f))));

  return (
    <div className="corners-terms-compare" data-testid="corners-terms-compare">
      <div className="corners-controls">
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
        <span className="corners-note">Terms on:</span>
        <button type="button" onClick={() => set(() => true)} data-testid="corners-compare-all">
          All
        </button>
        <button type="button" onClick={() => set((f) => f !== 1)} data-testid="corners-compare-nocircle">
          All but the circle f = 1
        </button>
        <button type="button" onClick={() => set((f) => third(f))}>
          Only f = 1 mod 3
        </button>
        <button type="button" onClick={() => set((f) => f === 1)}>
          Only the circle
        </button>
        <label>
          Lowest |f| up to {Math.max(0, ...on.map(Math.abs))}
          <input type="range" min={1} max={F} value={Math.min(F, Math.max(1, ...on.map(Math.abs)))} onChange={(e) => set((f) => Math.abs(f) <= Number(e.target.value))} />
        </label>
      </div>
      <TermsPicker A={fit.A} B={fit.B} off={off} onToggle={(f) => setOff((s) => toggled(s, f))} />
      <p className="corners-note" data-testid="corners-compare-gap">
        {on.length} of {fs.length} terms on, carrying {(100 * sumOn(fit.A)).toFixed(1)}% of A’s shape and {(100 * sumOn(fit.B)).toFixed(1)}% of B’s. The two
        drawings differ by {gap.toFixed(3)} radii of gyration (rms). B has {nf(b.length)} tiles to A’s {nf(a.length)} and a radius of gyration{' '}
        {(b.rg / a.rg).toFixed(3)} times A’s{fit.bAl.mirror ? '; it is mirrored to match A' : ''}.
      </p>
      <TwoEpicycles A={kept.A} B={kept.B} tilesA={tiles.a} tilesB={tiles.b} labelA={a.label} labelB={b.label} />
    </div>
  );
}

function diff2(a: Terms, b: Terms, f: number): number {
  const i = 2 * (f + a.F);
  return (a.c[i] - b.c[i]) ** 2 + (a.c[i + 1] - b.c[i + 1]) ** 2;
}

function toggled(s: ReadonlySet<number>, f: number): Set<number> {
  const out = new Set(s);
  if (out.has(f)) out.delete(f);
  else out.add(f);
  return out;
}

/** |c_f| of A above the line and B below, log scale; a click switches a harmonic on or off for both. */
function TermsPicker(props: { A: Terms; B: Terms; off: ReadonlySet<number>; onToggle: (f: number) => void }): JSX.Element {
  const { A, B, off, onToggle } = props;
  const F = A.F;
  const W = 960;
  const H = 230;
  const m = { l: 44, r: 10, t: 8, b: 30 };
  const mid = (H - m.b + m.t) / 2;
  const decades = 4;
  const step = (W - m.l - m.r) / (2 * F + 1);
  const X = (f: number) => m.l + (f + F + 0.5) * step;
  const h = (r: number) => ((Math.max(-decades, Math.log10(Math.max(r, 1e-12))) + decades) / decades) * (mid - m.t - 2);
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Term sizes of A above and B below; click a harmonic to switch it" data-testid="corners-compare-terms">
        {[0, 1, 2, 3].map((d) => (
          <g key={d} pointerEvents="none">
            <line x1={m.l} x2={W - m.r} y1={mid - h(10 ** -d)} y2={mid - h(10 ** -d)} stroke="var(--grid)" />
            <line x1={m.l} x2={W - m.r} y1={mid + h(10 ** -d)} y2={mid + h(10 ** -d)} stroke="var(--grid)" />
            <text x={m.l - 6} y={mid - h(10 ** -d) + 3.5} textAnchor="end" className="tick">
              {d === 0 ? '1' : `1e−${d}`}
            </text>
          </g>
        ))}
        {harmonics(F).map((f) => {
          const isOff = off.has(f);
          return (
            <g key={f} onClick={() => onToggle(f)} style={{ cursor: 'pointer' }} data-f={f} data-on={isOff ? '0' : '1'}>
              <rect x={X(f) - step / 2} y={m.t} width={step} height={H - m.b - m.t} fill="transparent" />
              <line x1={X(f)} x2={X(f)} y1={mid - 1} y2={mid - 1 - h(size(A, f))} stroke="var(--k1)" strokeOpacity={isOff ? 0.18 : 1} strokeWidth={Math.max(1.5, step * 0.45)} />
              <line x1={X(f)} x2={X(f)} y1={mid + 1} y2={mid + 1 + h(size(B, f))} stroke="var(--k2)" strokeOpacity={isOff ? 0.18 : 1} strokeWidth={Math.max(1.5, step * 0.45)} />
              <title>{`f = ${f}${isOff ? ' (off)' : ''}: A ${size(A, f).toExponential(2)}, B ${size(B, f).toExponential(2)}. Click to switch ${isOff ? 'on' : 'off'}.`}</title>
            </g>
          );
        })}
        <line x1={m.l} x2={W - m.r} y1={mid} y2={mid} stroke="var(--line)" pointerEvents="none" />
        {[-F, -F / 2, 1, F / 2, F].map((f) => (
          <text key={f} x={X(Math.round(f))} y={H - m.b + 14} textAnchor="middle" className="tick">
            {Math.round(f)}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
          harmonic f: size |c_f| of A above, B below (faded when switched off)
        </text>
      </svg>
    </div>
  );
}

interface Cycle {
  readonly f: number;
  readonly re: number;
  readonly im: number;
  readonly r: number;
}

function cyclesOf(t: Terms): Cycle[] {
  return harmonics(t.F)
    .map((f) => ({ f, re: t.c[2 * (f + t.F)], im: t.c[2 * (f + t.F) + 1], r: size(t, f) }))
    .filter((c) => c.r > 0)
    .sort((x, y) => y.r - x.r);
}

/** A and B, each its tiles faint, the outline its terms on draw, and the epicycles drawing it, turning together. */
function TwoEpicycles(props: { A: Terms; B: Terms; tilesA: Float64Array; tilesB: Float64Array; labelA: string; labelB: string }): JSX.Element {
  const still = typeof requestAnimationFrame === 'undefined' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [playing, setPlaying] = useState(!still);
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      tRef.current = (tRef.current + (now - last) / LAP_MS) % 1;
      last = now;
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const traceA = useMemo(() => outline(props.A, TRACE), [props.A]);
  const traceB = useMemo(() => outline(props.B, TRACE), [props.B]);
  // One scale for both, so equal terms draw equal circles, fitted to what the terms on draw.
  const reach = useMemo(() => {
    let r = 1e-9;
    for (const pts of [traceA, traceB]) for (let i = 0; i < pts.length; i++) r = Math.max(r, Math.abs(pts[i]));
    return r * 1.05;
  }, [traceA, traceB]);
  return (
    <div className="corners-compare-epi">
      <div className="corners-row-even corners-compare-pair">
        <EpicycleCanvas terms={props.A} trace={traceA} tiles={props.tilesA} reach={reach} t={t} colour="--k1" label={`A, ${props.labelA}`} testId="corners-compare-epi-a" />
        <EpicycleCanvas terms={props.B} trace={traceB} tiles={props.tilesB} reach={reach} t={t} colour="--k2" label={`B, ${props.labelB}`} testId="corners-compare-epi-b" />
      </div>
      <div className="corners-controls">
        <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="corners-compare-play">
          {playing ? 'Pause' : 'Play'}
        </button>
        <label>
          Lap
          <input
            type="range"
            min={0}
            max={999}
            value={Math.round(t * 1000)}
            onChange={(e) => {
              tRef.current = Number(e.target.value) / 1000;
              setT(tRef.current);
            }}
          />
        </label>
        <span className="corners-note">
          The circuits’ own tiles are faint (they reach past the edge when the drawing is small); the line is the outline the terms switched on draw, traced by their circles, largest first, each centred on the tip of
          the one before.
        </span>
      </div>
    </div>
  );
}

function EpicycleCanvas(props: { terms: Terms; trace: Float64Array; tiles: Float64Array; reach: number; t: number; colour: string; label: string; testId: string }): JSX.Element {
  const { terms: T, trace, tiles, reach, t } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const cycles = useMemo(() => cyclesOf(T), [T]);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const css = getComputedStyle(c);
    const ink = css.getPropertyValue('--text').trim() || '#222';
    const muted = css.getPropertyValue('--muted').trim() || '#888';
    const accent = css.getPropertyValue(props.colour).trim() || '#2a78d6';
    const side = c.clientWidth || 480;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(side * dpr)) {
      c.width = Math.round(side * dpr);
      c.height = Math.round(side * dpr);
    }
    const k = (c.width / 2 - 12 * dpr) / reach;
    const X = (x: number) => c.width / 2 + x * k;
    const Y = (y: number) => c.height / 2 - y * k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = muted;
    ctx.lineWidth = dpr;
    ctx.beginPath();
    const n = tiles.length / 2;
    const st = Math.max(1, Math.ceil(n / 3000));
    for (let i = 0; i < n; i += st) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(tiles[2 * i]), Y(tiles[2 * i + 1]));
    ctx.closePath();
    ctx.stroke();
    // The whole outline faintly, the part traced so far strongly.
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < TRACE; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(trace[2 * i]), Y(trace[2 * i + 1]));
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();
    const upto = Math.floor(t * TRACE);
    for (let i = 0; i <= upto; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(trace[2 * i]), Y(trace[2 * i + 1]));
    ctx.stroke();
    let x = 0;
    let y = 0;
    ctx.lineWidth = dpr;
    for (const e of cycles) {
      const a = 2 * Math.PI * e.f * t;
      const nx = x + e.re * Math.cos(a) - e.im * Math.sin(a);
      const ny = y + e.re * Math.sin(a) + e.im * Math.cos(a);
      if (e.r * k > 0.8) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = muted;
        ctx.beginPath();
        ctx.arc(X(x), Y(y), e.r * k, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.moveTo(X(x), Y(y));
        ctx.lineTo(X(nx), Y(ny));
        ctx.stroke();
      }
      x = nx;
      y = ny;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(X(x), Y(y), 4 * dpr, 0, 2 * Math.PI);
    ctx.fill();
  }, [t, cycles, trace, tiles, reach, props.colour]);
  return (
    <figure className="corners-compare-fig">
      {/* Sized by its own style, so its pixel size never feeds back into its display size. */}
      <canvas ref={canvas} width={480} height={480} style={{ display: 'block', width: '100%', aspectRatio: '1' }} aria-label={props.label} data-testid={props.testId} />
      <figcaption className="corners-note">{props.label}</figcaption>
    </figure>
  );
}
