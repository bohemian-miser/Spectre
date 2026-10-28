/**
 * Epicycles: the loop's Fourier terms, largest first, as circles riding on
 * circles. The tip of the last one draws the loop as t runs over one lap;
 * with every term it lands on every sample.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { epicyclePoint, epicycles, type Loop, type Spectrum } from "./measure";
import { frameOf } from "./charts";

const LAP_MS = 14000;
const TRAIL = 1500;

export function Epicycles(props: {
  loop: Loop;
  spectrum: Spectrum;
}): JSX.Element {
  const { loop, spectrum } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [terms, setTerms] = useState(30);
  // Still until asked when motion is unwelcome or there is no animation clock.
  const still =
    typeof requestAnimationFrame === "undefined" ||
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [playing, setPlaying] = useState(!still);
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const cycles = useMemo(() => epicycles(spectrum, terms), [spectrum, terms]);
  const frame = useMemo(() => frameOf(loop), [loop]);
  // The drawn loop at this many terms, for the trail and the still frame.
  const traced = useMemo(() => {
    const out = new Float64Array(2 * TRAIL);
    for (let i = 0; i < TRAIL; i++) {
      const p = epicyclePoint(cycles, i / TRAIL);
      out[2 * i] = frame.X(p.x + spectrum.cx);
      out[2 * i + 1] = frame.Y(p.y + spectrum.cy);
    }
    return out;
  }, [cycles, frame, spectrum]);

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

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const css = getComputedStyle(c);
    const ink = css.getPropertyValue("--text").trim() || "#222";
    const muted = css.getPropertyValue("--muted").trim() || "#888";
    const accent = css.getPropertyValue("--accent").trim() || "#2f7d6d";
    const size = c.clientWidth || 560;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(size * dpr)) {
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
    }
    const k = (c.width / 1080) * 1;
    ctx.setTransform(k, 0, 0, k, 40 * k, 40 * k);
    ctx.clearRect(-40, -40, 1080, 1080);
    // The circuit itself, faint.
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const step = Math.max(1, Math.ceil(loop.n / 3000));
    for (let i = 0; i < loop.n; i += step) {
      const x = frame.X(loop.xy[2 * i]);
      const y = frame.Y(loop.xy[2 * i + 1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    // What these terms draw, up to t.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const upto = Math.floor(t * TRAIL);
    for (let i = 0; i <= upto; i++) {
      if (i === 0) ctx.moveTo(traced[0], traced[1]);
      else ctx.lineTo(traced[2 * i], traced[2 * i + 1]);
    }
    ctx.stroke();
    // The circles, each centred on the last one's tip.
    const scale = frame.X(1) - frame.X(0);
    let x = frame.X(spectrum.cx);
    let y = frame.Y(spectrum.cy);
    ctx.lineWidth = 1;
    for (const e of cycles) {
      const r = e.r * scale;
      const a = 2 * Math.PI * e.f * t + e.phase;
      const nx = x + r * Math.cos(a);
      const ny = y - r * Math.sin(a);
      if (r > 0.6) {
        ctx.strokeStyle = muted;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
      x = nx;
      y = ny;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fill();
  }, [t, cycles, traced, loop, frame, spectrum]);

  const total = spectrum.n - 1;
  return (
    <div className="corners-fig" style={{ display: "grid", gap: 8 }}>
      {/* Sized by its own style: a display size that followed the pixel size would grow with every frame. */}
      <canvas
        ref={canvas}
        width={560}
        height={560}
        style={{
          display: "block",
          width: "100%",
          maxWidth: 560,
          height: "auto",
          aspectRatio: "1",
        }}
        aria-label={`The circuit redrawn by its ${terms} largest Fourier terms`}
        data-testid="corners-epicycles"
      />
      <div className="corners-controls">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          data-testid="corners-epi-play"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <label>
          Terms: {terms}
          <input
            type="range"
            min={1}
            max={Math.min(400, total)}
            value={terms}
            onChange={(e) => setTerms(Number(e.target.value))}
            data-testid="corners-epi-terms"
          />
        </label>
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
      </div>
    </div>
  );
}
