/**
 * A card: one painted circuit as a square video of its mapping, with its
 * sound through the bus reverb. Two kinds:
 * - loop: the lap repeated, at least three laps and about 15 s (or as asked),
 *   and seamless across laps;
 * - timeline: a spectrum with a ramping pen. The terms join, then the pen
 *   starts and speeds up to its top speed, holds it for `penHold` seconds,
 *   and the card ends.
 * `cardFrame`/`cardAudio` are deterministic, for
 * social/experiments/shapesound/export_card.py, which drives them frame by
 * frame through `window.__shapesoundCard`; `recordCard` records the same
 * thing in real time in the browser.
 */

import { REVERB_SECONDS, impulse } from '../sound/synth';
import { PEN_START, noise, penMotion, rampSeconds, renderPenMotion, renderSpectrum, type Clip } from './render';
import { drawShape, prepare, type Layout, type Prepared, type ShapeScene } from './ShapeView';

export const CARD_SIZE = 1080;
export const CARD_FPS = 30;
/** Sample rate of the card's audio, which the loudness meter expects. */
export const CARD_SR = 48000;
const MIN_LAPS = 3;
const MIN_SECONDS = 15;
/** A timeline card's sound fades out over its last this many seconds. */
const END_FADE = 0.05;

export interface CardSource extends ShapeScene {
  readonly main: Clip;
  readonly pen: Clip | null;
  readonly penLevel: number;
  readonly reverb: number;
}

/** What the caller asks for: a length in laps or seconds (a loop card), or seconds (a timeline card). */
export interface CardOptions {
  readonly laps?: number;
  readonly duration?: number;
}

export function cardLaps(lapSeconds: number): number {
  return Math.max(MIN_LAPS, Math.ceil(MIN_SECONDS / lapSeconds - 1e-9));
}

/** A timeline card's natural length, or null for a loop card. */
export function timelineSeconds(src: Pick<CardSource, 'mapping' | 'play' | 'settings'>): number | null {
  const sp = src.settings.spectrum;
  if (src.mapping !== 'spectrum' || src.play !== 'loop' || !sp.pen || sp.penRate <= 0) return null;
  return PEN_START + rampSeconds(penMotion(sp)) + sp.penHold;
}

export interface CardInfo {
  readonly kind: 'loop' | 'timeline';
  readonly size: number;
  readonly fps: number;
  /** One lap (loop), or the whole card (timeline). */
  readonly lap: number;
  readonly laps: number;
  readonly seconds: number;
  readonly frames: number;
}

export function cardInfo(src: CardSource, opts: CardOptions = {}, size = CARD_SIZE): CardInfo {
  const natural = timelineSeconds(src);
  if (natural !== null) {
    const seconds = opts.duration ?? natural;
    return { kind: 'timeline', size, fps: CARD_FPS, lap: seconds, laps: 1, seconds, frames: Math.round(seconds * CARD_FPS) };
  }
  const lap = src.main.seconds;
  const laps = opts.laps ?? (opts.duration ? Math.max(1, Math.round(opts.duration / lap)) : cardLaps(lap));
  const seconds = lap * laps;
  return { kind: 'loop', size, fps: CARD_FPS, lap, laps, seconds, frames: Math.round(seconds * CARD_FPS) };
}

/** The square's split: the spectrum's bars take the bottom 30%, no labels. */
function cardLayout(src: CardSource, size: number): Layout {
  const barsH = src.mapping === 'spectrum' ? Math.round(0.3 * size) : 0;
  return { w: size, loopH: size - barsH, barsH, labels: false };
}

export interface CardPainter {
  readonly canvas: HTMLCanvasElement;
  /** Draw the card at `t` seconds from its start. */
  draw(t: number): void;
}

export function cardPainter(src: CardSource, opts: CardOptions = {}, size = CARD_SIZE): CardPainter {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  const pre: Prepared = prepare(src);
  const layout = cardLayout(src, size);
  const info = cardInfo(src, opts, size);
  return {
    canvas,
    draw(t) {
      if (info.kind === 'timeline') drawShape(g, src, pre, layout, t, true);
      else drawShape(g, src, pre, layout, src.play === 'constant' ? null : t % info.lap);
    },
  };
}

/** A timeline card's partials and pen, rendered at `sr` for its whole length. */
function timelineClips(src: CardSource, seconds: number, sr: number): { main: Clip; pen: Clip } {
  const sp = src.settings.spectrum;
  return {
    main: renderSpectrum(src.shape, sp, sr, seconds, true),
    pen: renderPenMotion(src.shape, penMotion(sp), PEN_START, seconds, sr),
  };
}

/** Wire the clips into `ctx`, dry and through the reverb, as the live bus does. */
function wire(ctx: BaseAudioContext, main: Clip, pen: Clip | null, penLevel: number, reverb: number, out: AudioNode, loop: boolean): AudioBufferSourceNode[] {
  const buffer = (c: Clip): AudioBuffer => {
    const b = ctx.createBuffer(2, c.left.length, c.sr);
    b.copyToChannel(c.left, 0);
    b.copyToChannel(c.right, 1);
    return b;
  };
  const voice = ctx.createGain();
  const send = ctx.createGain();
  send.gain.value = reverb;
  const verb = ctx.createConvolver();
  const rnd = noise(7);
  verb.buffer = impulse(ctx, () => (rnd() + 1) / 2);
  voice.connect(out);
  voice.connect(send).connect(verb).connect(out);
  const sources: AudioBufferSourceNode[] = [];
  const add = (c: Clip, gain: number): void => {
    const s = ctx.createBufferSource();
    s.buffer = buffer(c);
    s.loop = loop;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(voice);
    sources.push(s);
  };
  add(main, 1);
  if (pen && penLevel > 0) add(pen, penLevel);
  return sources;
}

/**
 * The card's sound, rendered offline. A loop card renders laps first, as
 * many as the reverb's tail lasts, and drops them, so the reverb is already
 * ringing at the start and the card loops without a seam; a timeline card starts from silence and fades out at its
 * end.
 */
export async function cardAudio(src: CardSource, opts: CardOptions = {}): Promise<{ sr: number; left: Float32Array; right: Float32Array }> {
  const info = cardInfo(src, opts);
  if (info.kind === 'timeline') {
    const { main, pen } = timelineClips(src, info.seconds, CARD_SR);
    const len = main.left.length;
    const ctx = new OfflineAudioContext(2, len, CARD_SR);
    for (const s of wire(ctx, main, pen, src.penLevel, src.reverb, ctx.destination, false)) s.start(0);
    const out = await ctx.startRendering();
    const left = out.getChannelData(0).slice();
    const right = out.getChannelData(1).slice();
    const n = Math.round(END_FADE * CARD_SR);
    for (let i = 0; i < n; i++) {
      const g = 0.5 + 0.5 * Math.cos((Math.PI * (i + 1)) / n);
      left[len - n + i] *= g;
      right[len - n + i] *= g;
    }
    return { sr: CARD_SR, left, right };
  }
  const lapLen = Math.round(info.lap * CARD_SR);
  const len = lapLen * info.laps;
  // Enough laps first for the reverb's whole tail, however short the lap.
  const warm = lapLen * Math.ceil(REVERB_SECONDS / info.lap);
  const ctx = new OfflineAudioContext(2, warm + len, CARD_SR);
  for (const s of wire(ctx, src.main, src.pen, src.penLevel, src.reverb, ctx.destination, true)) s.start(0);
  const out = await ctx.startRendering();
  return { sr: CARD_SR, left: out.getChannelData(0).slice(warm), right: out.getChannelData(1).slice(warm) };
}

/** Record the card in real time as WebM, the frames drawn from the audio clock. */
export async function recordCard(src: CardSource, opts: CardOptions = {}): Promise<Blob> {
  const info = cardInfo(src, opts);
  const painter = cardPainter(src, opts);
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const timeline = info.kind === 'timeline';
  const clips = timeline ? timelineClips(src, info.seconds, ctx.sampleRate) : { main: src.main, pen: src.pen };
  const sources = wire(ctx, clips.main, clips.pen, src.penLevel, src.reverb, dest, !timeline);
  // A loop card starts early, silently, so the reverb is ringing when recording starts.
  const early = timeline ? 0 : info.lap * Math.ceil(REVERB_SECONDS / info.lap);
  const t0 = ctx.currentTime + 0.1 + early;
  for (const s of sources) s.start(t0 - early);
  const stream = new MediaStream([...painter.canvas.captureStream(CARD_FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
  painter.draw(0);
  await new Promise<void>((resolve) => {
    const tick = (): void => {
      const t = ctx.currentTime - t0;
      if (t >= 0 && rec.state === 'inactive') rec.start();
      painter.draw(Math.max(0, t));
      if (t >= info.seconds) {
        rec.stop();
        resolve();
      } else requestAnimationFrame(tick);
    };
    tick();
  });
  await done;
  sources.forEach((s) => s.stop());
  void ctx.close();
  return new Blob(chunks, { type: rec.mimeType || 'video/webm' });
}
