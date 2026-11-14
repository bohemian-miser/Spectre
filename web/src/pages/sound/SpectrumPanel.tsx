/**
 * The Fourier terms of the clicked circuit (and, to compare, the one clicked
 * before it) as bar charts, negative k on the left and positive on the
 * right, with buttons that play them as partials (`spectrum.ts`). A bar
 * lights while it sounds; clicking a bar plays it alone.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Pt } from '../../core';
import type { SoundEvent } from './score';
import { DB_RANGE, SCALINGS, circuitBars, partialEvents, scaled, type Scaling } from './spectrum';

export interface SpectrumSource {
  readonly label: string;
  /** A closed path, one point per step. */
  readonly points: readonly Pt[];
}

export interface SpectrumPanelProps {
  readonly a: SpectrumSource | null;
  readonly b: SpectrumSource | null;
  /** Hz of term ±1. */
  readonly f0: number;
  readonly f0Label: string;
  /** Plays events now; returns the context time they start. */
  play(events: readonly SoundEvent[]): number;
  /** Context seconds now. */
  now(): number;
}

const W = 300;
const H = 110;
const AXIS = 16;
const PLAY_SECONDS = 3;

interface Sounding {
  readonly chart: 'a' | 'b';
  /** The bar playing alone, or null for all of them. */
  readonly k: number | null;
  readonly until: number;
}

function Chart(props: {
  id: 'a' | 'b';
  source: SpectrumSource;
  F: number;
  scaling: Scaling;
  sounding: Sounding | null;
  onPlay: (k: number | null) => void;
}): JSX.Element {
  const { source, F, scaling, sounding } = props;
  const n = source.points.length;
  const usable = Math.max(1, Math.min(F, Math.floor((n - 1) / 2)));
  const bars = useMemo(() => circuitBars(source.points, usable), [source.points, usable]);
  const heights = useMemo(() => scaled(bars, scaling), [bars, scaling]);
  const top = Math.max(...bars.map((b) => b.amp), 1e-12);
  // One column per k from -usable to usable; k = 0 (the centroid) stays empty.
  const slot = W / (2 * usable + 1);
  const x = (k: number): number => (k + usable) * slot;
  const lit = (k: number): boolean => !!sounding && sounding.chart === props.id && (sounding.k === null || sounding.k === k);
  return (
    <figure className="sound-spectrum">
      <figcaption>
        <b>{source.label}</b> · {n} steps · |c<sub>k</sub>|, {scaling}
        {scaling === 'dB' ? `, baseline −${DB_RANGE} dB` : ''}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + AXIS}`} role="img" aria-label={`Fourier terms of ${source.label}`}>
        <line x1={0} x2={W} y1={H} y2={H} className="sound-spectrum-axis" />
        <line x1={W / 2} x2={W / 2} y1={H - 6} y2={H} className="sound-spectrum-axis" />
        {bars.map((b, i) => {
          const h = Math.max(heights[i] * (H - 4), heights[i] > 0 ? 1 : 0);
          const bx = x(b.k) + 1;
          const bw = Math.max(1, slot - 2);
          const db = b.amp > 0 ? 20 * Math.log10(b.amp / top) : -Infinity;
          return (
            <g key={b.k} onClick={() => props.onPlay(b.k)} className="sound-spectrum-bar">
              <rect x={x(b.k)} y={0} width={slot} height={H} fill="transparent" />
              <rect x={bx} y={H - h} width={bw} height={h} rx={Math.min(2, bw / 2)} className={lit(b.k) ? 'is-on' : undefined} />
              <title>{`k = ${b.k}: |c| = ${b.amp.toPrecision(3)} (${Number.isFinite(db) ? db.toFixed(1) : '−∞'} dB)`}</title>
            </g>
          );
        })}
        {[...new Set([-usable, -1, 1, usable])].map((k) => (
          <text key={k} x={k === -usable ? x(k) : k === usable ? x(k) + slot : x(k) + slot / 2} y={H + 12} textAnchor={k === -usable ? 'start' : k === usable ? 'end' : 'middle'} className="sound-spectrum-tick">
            {k}
          </text>
        ))}
      </svg>
      <div className="sound-buttons">
        <button type="button" onClick={() => props.onPlay(null)}>
          Play
        </button>
      </div>
    </figure>
  );
}

export function SpectrumPanel(props: SpectrumPanelProps): JSX.Element {
  const [scaling, setScaling] = useState<Scaling>('fundamental scaled down');
  const [F, setF] = useState(16);
  const [sounding, setSounding] = useState<Sounding | null>(null);
  const timer = useRef(0);
  useEffect(() => () => cancelAnimationFrame(timer.current), []);

  const play = (chart: 'a' | 'b', k: number | null): void => {
    const source = chart === 'a' ? props.a : props.b;
    if (!source) return;
    const usable = Math.max(1, Math.min(F, Math.floor((source.points.length - 1) / 2)));
    const bars = circuitBars(source.points, usable);
    const heights = scaled(bars, scaling);
    const pick = k === null ? bars.map(() => true) : bars.map((b) => b.k === k);
    const start = props.play(partialEvents(bars.filter((_, i) => pick[i]), heights.filter((_, i) => pick[i]), props.f0, PLAY_SECONDS));
    const until = start + PLAY_SECONDS;
    setSounding({ chart, k, until });
    cancelAnimationFrame(timer.current);
    const tick = (): void => {
      if (props.now() >= until) setSounding((s) => (s && s.until === until ? null : s));
      else timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
  };

  if (!props.a) return <p className="sound-note">Click a circuit to see its Fourier terms. Open strands have none.</p>;
  return (
    <div className="sound-spectra">
      <label className="sound-choice">
        <span>Scaling</span>
        <select aria-label="Scaling" value={scaling} onChange={(e) => setScaling(e.target.value as Scaling)}>
          {SCALINGS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="sound-slider">
        <span>Terms</span>
        <input type="range" min={2} max={48} step={1} value={F} onChange={(e) => setF(Number(e.target.value))} />
        <span className="sound-value">±{F}</span>
      </label>
      <p className="sound-note">
        Term k plays at |k| × {props.f0Label}, left for negative k and right for positive, at the height shown. Click a bar to hear it
        alone.
      </p>
      <Chart id="a" source={props.a} F={F} scaling={scaling} sounding={sounding} onPlay={(k) => play('a', k)} />
      {props.b ? <Chart id="b" source={props.b} F={F} scaling={scaling} sounding={sounding} onPlay={(k) => play('b', k)} /> : null}
    </div>
  );
}
