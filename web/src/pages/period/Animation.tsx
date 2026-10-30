/**
 * The animation: every type's supertile at one level in a row, copies of
 * them carried into every type's supertile one or two levels up, the
 * routes walked and pulled tight, then the view pans down and the new row
 * builds the next. Plays in a loop, scrubs, and saves as a GIF.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HEX_TYPES } from '../../core';
import { tileColor } from '../../lib/palette';
import { GifEncoder } from '../../lib/gif';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { CYCLE, PHASES, drawFrame, durationOf, phaseAt, type Palette, type Phase } from './draw';
import type { State } from './period';
import { stepCrossings, stepsOf, type Step } from './scene';

const W = 1080;
const H = 560;
/** Most crossings the pieces of a step may carry for the animation to be drawn. */
const MAX_CROSSINGS = 20000;
const GIF_FPS = 10;
const GIF_SCALE = 0.6;

const ROUTES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const ROUTES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const nf = (n: number) => n.toLocaleString('en-US');
const levelName = (n: number) => (n === 0 ? 'the tiles' : `level ${n}`);

function paletteFrom(el: Element, dark: boolean): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
  return {
    bg: v('--canvas-bg', dark ? '#0f1318' : '#fbfaf7'),
    text: v('--text', dark ? '#e6e9ee' : '#1d2430'),
    muted: v('--muted', '#7a8494'),
    routes: dark ? ROUTES_DARK : ROUTES_LIGHT,
    tile: (t) => tileColor(t),
  };
}

/** What a phase of a step shows, in words. */
export function captionOf(st: Step, key: Phase['key']): string {
  const pieces = HEX_TYPES.reduce((a, t) => a + st.builds[t].pieces.length, 0);
  switch (key) {
    case 'show': return `${st.from === 0 ? 'The nine tiles' : `The nine level-${st.from} supertiles`}, each with its border`;
    case 'copy': return `${nf(pieces)} copies placed in the nine level-${st.to} supertiles, as each type's substitution rule says`;
    case 'walk': return `each level-${st.to} supertile's routes walked through its pieces`;
    case 'pull': return `pulled tight: the level-${st.to} borders${st.repeats !== null ? `, the same as ${levelName(st.repeats)}'s` : ''}`;
    default: return `level ${st.to} moves up to build the next`;
  }
}

export function Animation(props: { cs: CircuitShapes; states: readonly State[]; start: number; length: number | null; dark: boolean }): JSX.Element {
  const { cs, states } = props;
  const top = states.length - 1;
  const [depth, setDepth] = useState(1);
  const [from, setFrom] = useState(0);
  const [count, setCount] = useState(Math.min(3, top));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [gif, setGif] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const n = Math.max(0, Math.min(from, top - depth));
  const steps = Math.max(1, Math.min(count, Math.floor((top - n) / depth)));

  const crossings = useMemo(() => {
    let most = 0;
    for (let j = 0; j < steps; j++) most = Math.max(most, stepCrossings(states, n + depth * j, depth));
    return most;
  }, [states, n, depth, steps]);
  const built = useMemo(() => (crossings > MAX_CROSSINGS ? null : stepsOf(cs, states, n, depth, steps)), [cs, states, n, depth, steps, crossings]);
  const total = built ? durationOf(built) : 1;

  useEffect(() => {
    if (!playing || !built) return;
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      setT((x) => (x + dt) % total);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [playing, built, total]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !built) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const at = phaseAt(built, t);
    drawFrame(ctx, built, t, paletteFrom(c, props.dark), W, H, captionOf(built[at.step], at.phase.key));
  }, [built, t, props.dark]);

  const restart = (): void => setT(0);

  const saveGif = (): void => {
    if (!built || !canvas.current) return;
    const pal = paletteFrom(canvas.current, props.dark);
    const w = Math.round(W * GIF_SCALE), h = Math.round(H * GIF_SCALE);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setGif({ busy: false, note: 'This browser cannot draw the frames.' }); return; }
    const frames = Math.round(total * GIF_FPS);
    const at = (i: number): Uint8ClampedArray => {
      const time = (i / GIF_FPS) % total;
      const p = phaseAt(built, time);
      drawFrame(ctx, built, time, pal, W, H, captionOf(built[p.step], p.phase.key));
      return ctx.getImageData(0, 0, w, h).data;
    };
    setGif({ busy: true, note: 'Drawing frames…' });
    setTimeout(() => {
      const samples = Array.from({ length: 12 }, (_, i) => at(Math.floor((i * frames) / 12)).slice());
      const enc = new GifEncoder(w, h, samples);
      let i = 0;
      const chunk = (): void => {
        try {
          for (const end = Math.min(frames, i + 10); i < end; i++) enc.add(at(i), 100 / GIF_FPS);
          if (i < frames) {
            setGif({ busy: true, note: `Frame ${i} of ${frames}…` });
            setTimeout(chunk, 0);
            return;
          }
          const bytes = enc.finish();
          const url = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `hex-levels-${n}-to-${n + depth * steps}.gif`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          setGif({ busy: false, note: `Saved, ${nf(Math.round(bytes.length / 1024))} KB.` });
        } catch (e) {
          setGif({ busy: false, note: e instanceof Error ? e.message : String(e) });
        }
      };
      chunk();
    }, 0);
  };

  const now = built ? phaseAt(built, t) : null;
  return (
    <div className="pd-anim" data-testid="pd-anim">
      <div className="pd-controls">
        <label>
          From
          <select value={n} onChange={(e) => { setFrom(Number(e.target.value)); restart(); }} data-testid="pd-base">
            {Array.from({ length: top - depth + 1 }, (_, k) => <option key={k} value={k}>{k === 0 ? 'the tiles' : `level ${k}`}</option>)}
          </select>
        </label>
        <div className="pd-chips" role="group" aria-label="Levels a step">
          {[1, 2].map((d) => (
            <button key={d} type="button" aria-pressed={d === depth} className={d === depth ? 'is-active' : ''} disabled={d > top} onClick={() => { setDepth(d); restart(); }} data-testid={`pd-depth-${d}`}>
              {d === 1 ? 'One level a step' : 'Two levels a step'}
            </button>
          ))}
        </div>
        <label>
          Steps
          <select value={steps} onChange={(e) => { setCount(Number(e.target.value)); restart(); }} data-testid="pd-steps">
            {Array.from({ length: Math.max(1, Math.min(6, Math.floor((top - n) / depth))) }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}
          </select>
        </label>
      </div>
      {built && now ? (
        <>
          <canvas ref={canvas} className="pd-canvas" role="img" aria-label={`The nine supertile types built from ${levelName(n)} to level ${n + depth * steps}`} data-testid="pd-canvas" />
          <div className="pd-controls">
            <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="pd-play">{playing ? 'Pause' : 'Play'}</button>
            <input
              type="range" min={0} max={total} step={0.02} value={t} aria-label="Time"
              onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
              className="pd-scrub"
            />
            <button type="button" disabled={gif.busy} onClick={saveGif} data-testid="pd-gif">{gif.busy ? 'Saving…' : 'Save as GIF'}</button>
            {gif.note && <span className="bu-muted">{gif.note}</span>}
          </div>
          <ol className="pd-phases">
            {built.map((st, j) => PHASES.map((p) => (
              <li key={`${j}${p.key}`} className={j === now.step && p.key === now.phase.key ? 'is-active' : ''}>
                <button type="button" onClick={() => { setPlaying(false); setT(j * CYCLE + p.start + 0.999 * (p.end - p.start)); }}>{captionOf(st, p.key)}</button>
              </li>
            )))}
          </ol>
        </>
      ) : (
        <p className="bu-muted" data-testid="pd-too-big">
          The pieces of a step carry up to {nf(crossings)} crossings, too many to draw; start lower or take fewer steps.
        </p>
      )}
    </div>
  );
}
