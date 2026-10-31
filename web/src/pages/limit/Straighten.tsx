/**
 * A patch of supertiles with its seams straightened round by round
 * (`core/straighten.ts`, computed in `workers/straighten.worker.ts`), and
 * the shapes the straightened supertiles come to, level by level.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE_FIG53 } from '../../core/colors';
import type { TileFamilyId } from '../../core/families';
import { GifEncoder } from '../../lib/gif';
import type { StraightenReply } from '../../workers/straighten.worker';
import type { LimitData } from './compute';
import { Figure } from './Figure';
import { boxOf, paletteFrom, viewOf, type Palette } from './draw';
import { computeStraighten, type StraightenLevel } from './straightenData';

const LEVELS = [1, 2, 3, 4] as const;
const W = 720;
const H = 560;
const HOLD = 0.6;
const MOVE = 1.2;
const GIF_FPS = 12;
const GIF_SCALE = 0.75;
const FAMILIES: readonly [TileFamilyId, string][] = [['spectre', 'Spectres'], ['hex', 'Hexagons']];

const nf = (n: number) => n.toLocaleString('en-US');

type Shape = StraightenLevel['shapes'][number];

/** The farthest a corner of a shape at one level is from the nearest same-kind shape at the level before. */
function moved(now: readonly Shape[], before: readonly Shape[]): number {
  const gap = (a: Float64Array, b: Float64Array) => {
    let worst = 0;
    for (let i = 0; i < a.length; i += 2) {
      let best = Infinity;
      for (let j = 0; j < b.length; j += 2) best = Math.min(best, Math.hypot(a[i] - b[j], a[i + 1] - b[j + 1]));
      worst = Math.max(worst, best);
    }
    return worst;
  };
  return Math.max(...now.map((s) => Math.min(...before.filter((t) => t.gamma === s.gamma).map((t) => gap(s.pts, t.pts)))));
}
const ease = (s: number) => s * s * (3 - 2 * s);

/** Time along a forward-and-back loop → round position (round + fraction). */
function roundAt(time: number, rounds: number): number {
  const leg = rounds * (HOLD + MOVE) + HOLD;
  const p = ((time % (2 * leg)) + 2 * leg) % (2 * leg);
  const u = p < leg ? p : 2 * leg - p;
  const step = Math.floor(u / (HOLD + MOVE));
  if (step >= rounds) return rounds;
  const f = (u - step * (HOLD + MOVE) - HOLD) / MOVE;
  return step + (f <= 0 ? 0 : ease(Math.min(1, f)));
}

function useStraighten(family: TileFamilyId): { byLevel: ReadonlyMap<number, StraightenLevel>; error: string | null } {
  const [state, setState] = useState<{ family: TileFamilyId; byLevel: Map<number, StraightenLevel>; error: string | null }>({ family, byLevel: new Map(), error: null });
  useEffect(() => {
    setState({ family, byLevel: new Map(), error: null });
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../../workers/straighten.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    if (!worker) {
      const id = setTimeout(() => {
        try {
          const byLevel = new Map(LEVELS.map((l) => [l, computeStraighten(family, l)] as const));
          setState({ family, byLevel, error: null });
        } catch (e) {
          setState({ family, byLevel: new Map(), error: e instanceof Error ? e.message : String(e) });
        }
      }, 0);
      return () => clearTimeout(id);
    }
    worker.onmessage = (e: MessageEvent<StraightenReply>) => {
      const m = e.data;
      if ('data' in m) setState((s) => (s.family === family ? { ...s, byLevel: new Map(s.byLevel).set(m.data.level, m.data) } : s));
      else setState((s) => ({ ...s, error: m.error }));
    };
    worker.postMessage({ family, levels: LEVELS });
    return () => worker?.terminate();
  }, [family]);
  return { byLevel: state.family === family ? state.byLevel : new Map(), error: state.error };
}

const fillOf = (type: string): string => {
  const [r, g, b] = PALETTE_FIG53[type] ?? [180, 180, 180];
  return `rgb(${r}, ${g}, ${b})`;
};

function draw(ctx: CanvasRenderingContext2D, d: StraightenLevel, at: number, pal: Palette, w: number, h: number): void {
  const scale = w / W;
  const view = viewOf(boxOf(d.pieces.map((p) => p.rounds[0])), w, h - 36 * scale, 14 * scale);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  const r0 = Math.floor(at);
  const r1 = Math.min(d.level + 1, r0 + 1);
  const t = at - r0;
  for (const p of d.pieces) {
    const a = p.rounds[r0];
    const b = p.rounds[r1];
    ctx.beginPath();
    for (let i = 0; i < a.length; i += 2) {
      const x = view.ox + view.scale * (a[i] + (b[i] - a[i]) * t);
      const y = view.oy - view.scale * (a[i + 1] + (b[i + 1] - a[i + 1]) * t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = p.interior ? 0.75 : 0.35;
    ctx.fillStyle = fillOf(p.type);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = Math.max(0.6, 0.9 * scale);
    ctx.stroke();
  }
  const round = Math.round(at);
  ctx.fillStyle = pal.text;
  ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  const what = round === 0 ? 'the leaves’ outlines' : `seams between level-${round - 1} supertiles straight`;
  ctx.fillText(`Level-${d.level} supertiles, round ${round} of ${d.level + 1}: ${what}, ${nf(d.kept[round])} vertices`, 12 * scale, h - 10 * scale);
}

export function Straighten(props: { limit: LimitData; dark: boolean }): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('spectre');
  const { byLevel, error } = useStraighten(family);
  const [level, setLevel] = useState(3);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [gif, setGif] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const d = byLevel.get(level) ?? null;
  const rounds = level + 1;
  const at = useMemo(() => roundAt(time, rounds), [time, rounds]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      setTime((x) => x + dt);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !d) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const ctx = c.getContext('2d');
    if (ctx) draw(ctx, d, at, paletteFrom(c, props.dark), c.width, c.height);
  }, [d, at, props.dark]);

  const saveGif = (): void => {
    if (!canvas.current || !d) return;
    const pal = paletteFrom(canvas.current, props.dark);
    const w = Math.round(W * GIF_SCALE), h = Math.round(H * GIF_SCALE);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setGif({ busy: false, note: 'This browser cannot draw the frames.' }); return; }
    const frames = Math.round(2 * (rounds * (HOLD + MOVE) + HOLD) * GIF_FPS);
    const frame = (i: number): Uint8ClampedArray => {
      draw(ctx, d, roundAt(i / GIF_FPS, rounds), pal, w, h);
      return ctx.getImageData(0, 0, w, h).data;
    };
    setGif({ busy: true, note: 'Drawing frames…' });
    setTimeout(() => {
      const samples = Array.from({ length: 12 }, (_, i) => frame(Math.floor((i * frames) / 24)).slice());
      const enc = new GifEncoder(w, h, samples);
      let i = 0;
      const chunk = (): void => {
        try {
          for (const end = Math.min(frames, i + 8); i < end; i++) enc.add(frame(i), 100 / GIF_FPS);
          if (i < frames) {
            setGif({ busy: true, note: `Frame ${i} of ${frames}…` });
            setTimeout(chunk, 0);
            return;
          }
          const bytes = enc.finish();
          const url = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `straighten-${family}-level-${level}.gif`;
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

  const top = props.limit.levels.length - 1;
  const limitOutline = props.limit.levels[top].outlines.other.spectre;
  const limitGamma = props.limit.levels[top].outlines.Gamma.spectre;
  const familyName = family === 'spectre' ? 'Spectre' : 'hexagon';

  return (
    <section className="bu-section lm-prose" aria-labelledby="lm-straight-h">
      <h2 id="lm-straight-h">Straightening the seams</h2>
      <p>
        A level-(n+2) Delta supertile cut into its level-n supertiles. Each stretch of a supertile&rsquo;s outline between two corners, points where three regions meet, is a seam shared with one neighbour. Round r replaces every seam between two level-(r−1) supertiles with one straight edge, each vertex sliding onto the chord at the same fraction of the way along: round 1 straightens the seams between tiles, the last round those between the level-n supertiles. Both sides of a seam move together, so the pieces never overlap. Outside the patch counts as one region; the supertiles touching it are drawn faint.
      </p>
      {error && <p className="bu-error">{error}</p>}
      <div className="lm-morph" data-testid="lm-straighten">
        <div className="lm-controls">
          <div className="lm-chips" role="group" aria-label="Tiles">
            {FAMILIES.map(([f, name]) => (
              <button key={f} type="button" aria-pressed={f === family} className={f === family ? 'is-active' : ''} onClick={() => setFamily(f)}>
                {name}
              </button>
            ))}
          </div>
          <div className="lm-chips" role="group" aria-label="Level of the supertiles">
            {LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={l === level} className={l === level ? 'is-active' : ''} onClick={() => { setLevel(l); setTime(0); }} disabled={!byLevel.has(l)} data-testid={`lm-straighten-level-${l}`}>
                Level {l}
              </button>
            ))}
          </div>
        </div>
        {d ? (
          <canvas ref={canvas} className="lm-canvas lm-canvas-tall" role="img" aria-label={`Level-${level} supertiles of ${familyName}s, seams straightened round by round`} data-testid="lm-straighten-canvas" />
        ) : (
          <p className="bu-muted">Building the level-{level + 2} patch…</p>
        )}
        <div className="lm-controls">
          <button type="button" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
          <input
            type="range" min={0} max={rounds} step={0.01} value={at} aria-label="Round"
            onChange={(e) => {
              setPlaying(false);
              const v = Number(e.target.value);
              const step = Math.floor(v);
              setTime(step * (HOLD + MOVE) + HOLD + (v - step) * MOVE);
            }}
            className="lm-scrub"
          />
          <button type="button" disabled={gif.busy || !d} onClick={saveGif}>{gif.busy ? 'Saving…' : 'Save as GIF'}</button>
          {gif.note && <span className="bu-muted">{gif.note}</span>}
        </div>
      </div>

      <h3>What the rounds come to</h3>
      <p>
        After the last round every supertile inside the patch is a polygon on its own corners. Laid over the limit&rsquo;s key points, those polygons at each level, with the limit&rsquo;s outline (level {top} from Spectres) dashed behind; Gamma&rsquo;s in orange, the rest in green:
      </p>
      <div className="lm-strip">
        {LEVELS.map((l) => {
          const s = byLevel.get(l);
          return (
            <figure key={l}>
              {s ? (
                <Figure
                  layers={[
                    { pts: limitOutline, stroke: 'muted', width: 0.8, dash: true },
                    { pts: limitGamma, stroke: 'muted', width: 0.5, dash: true },
                    ...s.shapes.map((sh) => ({ pts: sh.pts, stroke: sh.gamma ? 'spectre' : 'selfSimilar', width: 1.2 })),
                  ]}
                  width={150}
                  height={150}
                  dark={props.dark}
                  label={`Straightened level-${l} supertiles over the limit`}
                />
              ) : (
                <div className="lm-figure-wait" />
              )}
              <figcaption>Level {l}</figcaption>
            </figure>
          );
        })}
      </div>
      <table className="bu-summary-table lm-table" data-testid="lm-straighten-table">
        <thead>
          <tr>
            <th>Level</th>
            <th className="num">Supertiles inside the patch</th>
            <th>Corners each</th>
            <th className="num">Different polygons, Gamma</th>
            <th className="num">Others</th>
            <th className="num">Corners moved since the level before</th>
            <th className="num">Vertices before</th>
            <th className="num">After</th>
          </tr>
        </thead>
        <tbody>
          {LEVELS.map((l) => {
            const s = byLevel.get(l);
            if (!s) return <tr key={l}><td>{l}</td><td colSpan={7} className="bu-muted">…</td></tr>;
            return (
              <tr key={l}>
                <td>{l}</td>
                <td className="num">{s.cornerCounts.reduce((a, [, c]) => a + c, 0)}</td>
                <td>{s.cornerCounts.map(([k, c]) => `${k} (${c})`).join(', ')}</td>
                <td className="num">{s.shapes.filter((x) => x.gamma).length}</td>
                <td className="num">{s.shapes.filter((x) => !x.gamma).length}</td>
                <td className="num">{byLevel.has(l - 1) ? moved(s.shapes, byLevel.get(l - 1)!.shapes).toFixed(4) : ''}</td>
                <td className="num">{nf(s.kept[0])}</td>
                <td className="num">{nf(s.kept[s.kept.length - 1])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="bu-muted lm-notes">
        Vertices are counted over every supertile in the patch; distances are in the frame where the first key point is at 0 and the last at 1, the farthest any corner is from the nearest corner of the nearest polygon of the same kind one level down. A corner is where three supertiles meet, and where that is depends on which three, so the straightened supertiles are not all one polygon: the table counts the different ones. The polygons settle as the level grows, but they do not line up with the substitution: in the last round the straight edges cut across the seams the children had, so a straightened supertile is not made of straightened children. The one outline that is exactly its children is the limit itself.
      </p>
    </section>
  );
}
