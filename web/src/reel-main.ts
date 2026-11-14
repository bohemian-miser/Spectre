/**
 * Entry point for `reel.html`: a scripted trace for video capture, with no
 * controls. `?reel=<seed>&f=<family>&e=<edges>&c=<combo>&n=<circuits>&s=<seconds>&lw=<line width>`;
 * absent parameters take `reelDefaults`. The page exposes its progress and
 * event log as `window.reel` for the capture script.
 */

import { FAMILIES, subsetFromString, subsetToEdges, type TileFamilyId } from './core';
import { createCanvas2dRenderer } from './pages/map/canvasRenderer';
import { createMapRenderer } from './pages/map/renderer';
import { loadWorld, planReel, reelDefaults, type ReelPlan, type ReelOptions } from './pages/reel/director';
import { createReelStage } from './pages/reel/stage';

interface ReelHandle {
  ready: boolean;
  frames: number;
  fps: number;
  frame: number;
  log: ReelPlan['log'] | null;
  error: string | null;
}

declare global {
  interface Window {
    reel: ReelHandle;
  }
}

const handle: ReelHandle = { ready: false, frames: 0, fps: 30, frame: -1, log: null, error: null };
window.reel = handle;

function start(): void {
  const q = new URLSearchParams(location.search);
  const num = (key: string, fallback: number): number => {
    const v = Number(q.get(key));
    return q.has(key) && Number.isFinite(v) ? v : fallback;
  };
  const familyParam = q.get('f') as TileFamilyId | null;
  const family: TileFamilyId = familyParam && FAMILIES.includes(familyParam) ? familyParam : 'spectre';
  const defaults = reelDefaults(family);
  const options: ReelOptions = {
    seed: Math.floor(num('reel', 1)),
    family,
    subset: q.has('e') ? subsetToEdges(subsetFromString(q.get('e') ?? '')) : defaults.subset,
    combo: q.get('c') ?? defaults.combo,
    seconds: num('s', 180),
    circuits: num('n', Infinity),
    fps: num('fps', 30),
    bpm: num('bpm', 110),
    radius: num('r', defaults.radius),
    scale: num('z', defaults.scale),
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const world = loadWorld(options);
  const plan = planReel(options, world);

  const canvas = document.getElementById('reel') as HTMLCanvasElement;
  canvas.style.width = `${options.width}px`;
  canvas.style.height = `${options.height}px`;
  const renderer = q.get('gl') === '1' ? createMapRenderer(canvas, { family }) : createCanvas2dRenderer(canvas, family);
  if (!renderer) throw new Error('no renderer');
  const stage = createReelStage(renderer, plan, world, Math.min(2, window.devicePixelRatio || 1), num('lw', 2));

  handle.frames = plan.frames;
  handle.fps = options.fps;
  handle.log = plan.log;
  handle.ready = true;

  const t0 = performance.now();
  const tick = (now: number): void => {
    const frame = Math.min(plan.frames - 1, Math.floor(((now - t0) * options.fps) / 1000 + 1e-6));
    if (frame !== handle.frame) {
      stage.draw(frame);
      handle.frame = frame;
    }
    if (frame < plan.frames - 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

try {
  start();
} catch (err) {
  handle.error = err instanceof Error ? err.message : String(err);
  throw err;
}
