/**
 * The animation: a supertile `depth` levels up built from its level-n
 * pieces, its routes pulled tight, and its table set beside the level-n
 * table of the same type. Plays, scrubs, and saves as a GIF.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HEX_TYPES, type HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import { GifEncoder } from '../../lib/gif';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { DURATION, PHASES, drawFrame, phaseAt, type Palette } from './draw';
import type { State } from './period';
import { buildScene, pieceCrossings, type Scene } from './scene';

const W = 720;
const H = 460;
/** Most crossings the pieces may carry for the animation to be drawn. */
const MAX_CROSSINGS = 6000;
const GIF_FPS = 12;
const GIF_SCALE = 0.75;

const ROUTES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const ROUTES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const nf = (n: number) => n.toLocaleString('en-US');

function paletteFrom(el: Element, dark: boolean): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
  return {
    bg: v('--canvas-bg', dark ? '#0f1318' : '#fbfaf7'),
    text: v('--text', dark ? '#e6e9ee' : '#1d2430'),
    muted: v('--muted', '#7a8494'),
    line: v('--muted', '#7a8494'),
    routes: dark ? ROUTES_DARK : ROUTES_LIGHT,
    tile: (t) => tileColor(t),
  };
}

/** What each phase shows, in words. */
export function captionOf(s: Scene, key: string): string {
  const top = s.base + s.depth;
  switch (key) {
    case 'apart': return `${s.pieces.length} level-${s.base} supertiles: the pieces of a level-${top} ${s.type}`;
    case 'together': return `${nf(s.welds.length)} pairs of crossings welded where pieces meet`;
    case 'walk': return `${s.routePaths.length} route${s.routePaths.length === 1 ? '' : 's'} walked through the pieces${s.circuits.length ? `, ${s.circuits.length} closing inside` : ''}`;
    case 'pull': return `each walk pulled tight: the level-${top} ${s.type}'s table`;
    case 'beside': return `beside the level-${s.base} ${s.type}'s table`;
    case 'straight': return 'both drawn straight';
    default: return s.same ? `level ${top} = level ${s.base}: the same crossings, joined the same way` : `level ${top} ≠ level ${s.base}`;
  }
}

export function Animation(props: { cs: CircuitShapes; states: readonly State[]; start: number; length: number | null; dark: boolean }): JSX.Element {
  const { cs, states } = props;
  const top = states.length - 1;
  const [type, setType] = useState<HexType>('Psi');
  const [depth, setDepth] = useState(props.length === 1 ? 1 : 2);
  const [base, setBase] = useState(Math.max(0, Math.min(props.start, top - depth)));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [gif, setGif] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const n = Math.max(0, Math.min(base, top - depth));

  const crossings = useMemo(() => pieceCrossings(states, n, depth, type), [states, n, depth, type]);
  const scene = useMemo(() => {
    if (crossings > MAX_CROSSINGS) return null;
    if (cs.maxLevel < n + depth) cs.extend(n + depth);
    return buildScene(cs, states, n, depth, type);
  }, [cs, states, n, depth, type, crossings]);

  useEffect(() => {
    if (!playing || !scene) return;
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      setT((x) => (x + dt) % DURATION);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [playing, scene]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !scene) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    drawFrame(ctx, scene, t, paletteFrom(c, props.dark), W, H, captionOf(scene, phaseAt(t).key));
  }, [scene, t, props.dark]);

  const saveGif = (): void => {
    if (!scene || !canvas.current) return;
    const pal = paletteFrom(canvas.current, props.dark);
    const w = Math.round(W * GIF_SCALE), h = Math.round(H * GIF_SCALE);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setGif({ busy: false, note: 'This browser cannot draw the frames.' }); return; }
    const frames = Math.round(DURATION * GIF_FPS);
    const at = (i: number): Uint8ClampedArray => {
      const time = (i / GIF_FPS) % DURATION;
      drawFrame(ctx, scene, time, pal, W, H, captionOf(scene, phaseAt(time).key));
      return ctx.getImageData(0, 0, w, h).data;
    };
    setGif({ busy: true, note: 'Drawing frames…' });
    setTimeout(() => {
      const samples = Array.from({ length: 12 }, (_, i) => at(Math.floor((i * frames) / 12)).slice());
      const enc = new GifEncoder(w, h, samples);
      let i = 0;
      const chunk = (): void => {
        try {
          for (const end = Math.min(frames, i + 12); i < end; i++) enc.add(at(i), 100 / GIF_FPS);
          if (i < frames) {
            setGif({ busy: true, note: `Frame ${i} of ${frames}…` });
            setTimeout(chunk, 0);
            return;
          }
          const bytes = enc.finish();
          const url = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `hex-${scene.type}-level-${scene.base}-to-${scene.base + scene.depth}.gif`;
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

  const phase = phaseAt(t);
  return (
    <div className="pd-anim" data-testid="pd-anim">
      <div className="pd-controls">
        <div className="pd-chips" role="group" aria-label="Type">
          {HEX_TYPES.map((x) => (
            <button key={x} type="button" aria-pressed={x === type} className={x === type ? 'is-active' : ''} onClick={() => { setType(x); setT(0); }} data-testid={`pd-type-${x}`}>
              {x}
            </button>
          ))}
        </div>
        <label>
          Pieces at level
          <select value={n} onChange={(e) => { setBase(Number(e.target.value)); setT(0); }} data-testid="pd-base">
            {Array.from({ length: top - depth + 1 }, (_, k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <div className="pd-chips" role="group" aria-label="Levels up">
          {[1, 2].map((d) => (
            <button key={d} type="button" aria-pressed={d === depth} className={d === depth ? 'is-active' : ''} disabled={d > top} onClick={() => { setDepth(d); setT(0); }} data-testid={`pd-depth-${d}`}>
              {d === 1 ? 'One level up' : 'Two levels up'}
            </button>
          ))}
        </div>
      </div>
      {scene ? (
        <>
          <canvas ref={canvas} className="pd-canvas" role="img" aria-label={captionOf(scene, 'hold')} data-testid="pd-canvas" />
          <div className="pd-controls">
            <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="pd-play">{playing ? 'Pause' : 'Play'}</button>
            <input
              type="range" min={0} max={DURATION} step={0.02} value={t} aria-label="Time"
              onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
              className="pd-scrub"
            />
            <button type="button" disabled={gif.busy} onClick={saveGif} data-testid="pd-gif">{gif.busy ? 'Saving…' : 'Save as GIF'}</button>
            {gif.note && <span className="bu-muted">{gif.note}</span>}
          </div>
          <ol className="pd-phases">
            {PHASES.map((p) => (
              <li key={p.key} className={p.key === phase.key ? 'is-active' : ''}>
                <button type="button" onClick={() => { setPlaying(false); setT(p.start + 0.999 * (p.end - p.start)); }}>{captionOf(scene, p.key)}</button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="bu-muted" data-testid="pd-too-big">
          The pieces of a level-{n + depth} {type} carry {nf(crossings)} crossings, too many to draw; pick lower pieces.
        </p>
      )}
    </div>
  );
}
