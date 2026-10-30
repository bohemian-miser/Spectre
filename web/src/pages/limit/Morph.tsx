/**
 * One level's outline turning from one start into another: every vertex
 * glides from where the first start puts it to where the second does.
 * Plays, scrubs, and saves as a GIF.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { GifEncoder } from '../../lib/gif';
import type { Kind, LimitData, Outlines } from './compute';
import { boxOf, mix, paletteFrom, pingPong, tracePath, viewOf, type Palette } from './draw';

const W = 720;
const H = 520;
const PERIOD = 6;
const GIF_FPS = 12;
const GIF_SCALE = 0.75;

type Start = keyof Outlines;
const NAMES: Record<Start, string> = { hex: 'hexagons', spectre: 'Spectres', selfSimilar: 'Tile(1,b)' };
const PAIRS: readonly [Start, Start][] = [['hex', 'spectre'], ['hex', 'selfSimilar'], ['spectre', 'selfSimilar']];

const nf = (n: number) => n.toLocaleString('en-US');

function draw(ctx: CanvasRenderingContext2D, data: LimitData, level: number, kind: Kind, pair: [Start, Start], t: number, behind: boolean, pal: Palette, w: number, h: number): void {
  const top = data.levels.length - 1;
  const o = data.levels[level].outlines[kind];
  const ref = data.levels[top].outlines[kind].selfSimilar;
  const scale = w / W;
  const view = viewOf(boxOf([o[pair[0]], o[pair[1]], ref]), w, h - 36 * scale, 18 * scale);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  const colour = mix(pal[pair[0]], pal[pair[1]], t);
  tracePath(ctx, view, o[pair[0]], o[pair[1]], t);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (behind) {
    tracePath(ctx, view, ref);
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([4 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  tracePath(ctx, view, o[pair[0]], o[pair[1]], t);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, 1.6 * scale);
  ctx.stroke();
  ctx.fillStyle = pal.text;
  ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  const what = kind === 'Gamma' ? 'Gamma' : 'every other type';
  ctx.fillText(
    `Level ${level}, ${what}: ${nf(o.spectre.length / 2)} edges, ${Math.round(100 * (1 - t))}% ${NAMES[pair[0]]}, ${Math.round(100 * t)}% ${NAMES[pair[1]]}`,
    12 * scale,
    h - 10 * scale,
  );
}

export function Morph(props: { data: LimitData; dark: boolean }): JSX.Element {
  const { data } = props;
  const top = data.levels.length - 1;
  const [level, setLevel] = useState(Math.min(3, top));
  const [kind, setKind] = useState<Kind>('other');
  const [pairIndex, setPairIndex] = useState(0);
  const [behind, setBehind] = useState(true);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [gif, setGif] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const pair = PAIRS[pairIndex];
  const t = useMemo(() => pingPong(time, PERIOD), [time]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      setTime((x) => (x + dt) % PERIOD);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    draw(ctx, data, level, kind, pair, t, behind, paletteFrom(c, props.dark), c.width, c.height);
  }, [data, level, kind, pair, t, behind, props.dark]);

  const saveGif = (): void => {
    if (!canvas.current) return;
    const pal = paletteFrom(canvas.current, props.dark);
    const w = Math.round(W * GIF_SCALE), h = Math.round(H * GIF_SCALE);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setGif({ busy: false, note: 'This browser cannot draw the frames.' }); return; }
    const frames = Math.round(PERIOD * GIF_FPS);
    const at = (i: number): Uint8ClampedArray => {
      draw(ctx, data, level, kind, pair, pingPong(i / GIF_FPS, PERIOD), behind, pal, w, h);
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
          a.download = `outline-level-${level}-${kind === 'Gamma' ? 'gamma' : 'other'}-${pair[0]}-to-${pair[1]}.gif`;
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

  return (
    <div className="lm-morph" data-testid="lm-morph">
      <div className="lm-controls">
        <div className="lm-chips" role="group" aria-label="Level">
          {data.levels.map((l) => (
            <button key={l.level} type="button" aria-pressed={l.level === level} className={l.level === level ? 'is-active' : ''} onClick={() => setLevel(l.level)} data-testid={`lm-level-${l.level}`}>
              {l.level}
            </button>
          ))}
        </div>
        <div className="lm-chips" role="group" aria-label="Type">
          {(['other', 'Gamma'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={k === kind} className={k === kind ? 'is-active' : ''} onClick={() => setKind(k)}>
              {k === 'Gamma' ? 'Gamma' : 'Every other type'}
            </button>
          ))}
        </div>
        <div className="lm-chips" role="group" aria-label="Starts">
          {PAIRS.map(([a, b], i) => (
            <button key={i} type="button" aria-pressed={i === pairIndex} className={i === pairIndex ? 'is-active' : ''} onClick={() => setPairIndex(i)}>
              {NAMES[a]} ↔ {NAMES[b]}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvas} className="lm-canvas" role="img" aria-label={`Level ${level} outline, ${NAMES[pair[0]]} to ${NAMES[pair[1]]}`} data-testid="lm-canvas" />
      <div className="lm-controls">
        <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="lm-play">{playing ? 'Pause' : 'Play'}</button>
        <input
          type="range" min={0} max={PERIOD / 2} step={0.01} value={time % PERIOD <= PERIOD / 2 ? time % PERIOD : PERIOD - (time % PERIOD)} aria-label="From one start to the other"
          onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)); }}
          className="lm-scrub"
        />
        <label className="lm-check">
          <input type="checkbox" checked={behind} onChange={(e) => setBehind(e.target.checked)} />
          Level {top} Tile(1,b) behind
        </label>
        <button type="button" disabled={gif.busy} onClick={saveGif} data-testid="lm-gif">{gif.busy ? 'Saving…' : 'Save as GIF'}</button>
        {gif.note && <span className="bu-muted">{gif.note}</span>}
      </div>
    </div>
  );
}
