/**
 * A card: one painted circuit as a square video of its mapping, looping for
 * at least three laps and about 15 seconds, with the lap's sound through the
 * bus reverb. `cardFrame` and `cardAudio` are deterministic, for
 * social/experiments/shapesound/export_card.py, which drives them frame by
 * frame through `window.__shapesoundCard`; `recordCard` records the same
 * thing in real time in the browser.
 */

import { impulse } from '../sound/synth';
import { noise, type Clip } from './render';
import { drawShape, prepare, type Layout, type Prepared, type ShapeScene } from './ShapeView';

export const CARD_SIZE = 1080;
export const CARD_FPS = 30;
/** Sample rate of the card's audio, which the loudness meter expects. */
export const CARD_SR = 48000;
const MIN_LAPS = 3;
const MIN_SECONDS = 15;

export interface CardSource extends ShapeScene {
  readonly main: Clip;
  readonly pen: Clip | null;
  readonly penLevel: number;
  readonly reverb: number;
}

export function cardLaps(lapSeconds: number): number {
  return Math.max(MIN_LAPS, Math.ceil(MIN_SECONDS / lapSeconds - 1e-9));
}

export interface CardInfo {
  readonly size: number;
  readonly fps: number;
  readonly lap: number;
  readonly laps: number;
  readonly seconds: number;
  readonly frames: number;
}

export function cardInfo(src: CardSource, size = CARD_SIZE): CardInfo {
  const lap = src.main.seconds;
  const laps = cardLaps(lap);
  const seconds = lap * laps;
  return { size, fps: CARD_FPS, lap, laps, seconds, frames: Math.round(seconds * CARD_FPS) };
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

export function cardPainter(src: CardSource, size = CARD_SIZE): CardPainter {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  const pre: Prepared = prepare(src);
  const layout = cardLayout(src, size);
  const lap = src.main.seconds;
  return {
    canvas,
    draw(t) {
      drawShape(g, src, pre, layout, src.play === 'constant' ? null : t % lap);
    },
  };
}

/** Wire a lap buffer (and its pen) into `ctx`, dry and through the reverb, as the live bus does. */
function wire(ctx: BaseAudioContext, src: CardSource, out: AudioNode, seeded: boolean): AudioBufferSourceNode[] {
  const buffer = (c: Clip): AudioBuffer => {
    const b = ctx.createBuffer(2, c.left.length, c.sr);
    b.copyToChannel(c.left, 0);
    b.copyToChannel(c.right, 1);
    return b;
  };
  const voice = ctx.createGain();
  const send = ctx.createGain();
  send.gain.value = src.reverb;
  const verb = ctx.createConvolver();
  const rnd = noise(7);
  verb.buffer = impulse(ctx, seeded ? () => (rnd() + 1) / 2 : Math.random);
  voice.connect(out);
  voice.connect(send).connect(verb).connect(out);
  const sources: AudioBufferSourceNode[] = [];
  const main = ctx.createBufferSource();
  main.buffer = buffer(src.main);
  main.loop = true;
  main.connect(voice);
  sources.push(main);
  if (src.pen && src.penLevel > 0) {
    const pen = ctx.createBufferSource();
    pen.buffer = buffer(src.pen);
    pen.loop = true;
    const pg = ctx.createGain();
    pg.gain.value = src.penLevel;
    pen.connect(pg).connect(voice);
    sources.push(pen);
  }
  return sources;
}

/**
 * The card's sound: the lap looped with the reverb, rendered offline. One
 * lap is rendered first and dropped, so the reverb is already ringing at the
 * start and the card loops without a seam.
 */
export async function cardAudio(src: CardSource): Promise<{ sr: number; left: Float32Array; right: Float32Array }> {
  const info = cardInfo(src);
  const lapLen = Math.round(info.lap * CARD_SR);
  const len = lapLen * info.laps;
  const ctx = new OfflineAudioContext(2, lapLen + len, CARD_SR);
  for (const s of wire(ctx, src, ctx.destination, true)) s.start(0);
  const out = await ctx.startRendering();
  return { sr: CARD_SR, left: out.getChannelData(0).slice(lapLen), right: out.getChannelData(1).slice(lapLen) };
}

/** Record the card in real time as WebM, the frames drawn from the audio clock. */
export async function recordCard(src: CardSource): Promise<Blob> {
  const info = cardInfo(src);
  const painter = cardPainter(src);
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const sources = wire(ctx, src, dest, true);
  // Start a lap early, silently, so the reverb is ringing when recording starts.
  const t0 = ctx.currentTime + 0.1 + info.lap;
  for (const s of sources) s.start(t0 - info.lap);
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
