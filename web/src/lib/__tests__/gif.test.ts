/**
 * The GIF encoder against a decoder written here from the format: every
 * frame of a short animation decodes to its own pixels (to within the
 * palette's 5 bits a channel), including frames long enough to fill the
 * 4096-code table, and a frame that changes nothing lengthens the one before.
 */
import { describe, expect, it } from 'vitest';
import { encodeGif } from '../gif';

/** Frames as RGB, composited onto the screen as the format says (each frame left in place). */
function decode(bytes: Uint8Array): { width: number; height: number; frames: { rgb: Uint8Array; delay: number }[] } {
  let i = 6;
  const short = () => bytes[i++] | (bytes[i++] << 8);
  const width = short(), height = short();
  const packed = bytes[i++];
  i += 2;
  const table = bytes.slice(i, i + 3 * (2 << (packed & 7)));
  i += table.length;
  const screen = new Uint8Array(width * height * 3);
  const frames: { rgb: Uint8Array; delay: number }[] = [];
  let delay = 0;
  for (;;) {
    const b = bytes[i++];
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = bytes[i++];
      if (label === 0xf9) { i++; i++; delay = short(); i += 2; continue; }
      while (bytes[i]) i += bytes[i] + 1;
      i++;
      continue;
    }
    const x0 = short(), y0 = short(), w = short(), h = short();
    i++;
    const min = bytes[i++];
    const data: number[] = [];
    while (bytes[i]) { data.push(...bytes.slice(i + 1, i + 1 + bytes[i])); i += bytes[i] + 1; }
    i++;
    // LZW
    const clear = 1 << min, eoi = clear + 1;
    let size = min + 1, dict: number[][] = [], prev: number[] | null = null;
    const reset = () => { dict = Array.from({ length: clear + 2 }, (_, k) => [k]); size = min + 1; prev = null; };
    reset();
    const out: number[] = [];
    let acc = 0, bits = 0, p = 0;
    for (;;) {
      while (bits < size) { acc |= data[p++] << bits; bits += 8; }
      const code = acc & ((1 << size) - 1);
      acc >>>= size;
      bits -= size;
      if (code === clear) { reset(); continue; }
      if (code === eoi) break;
      let entry: number[];
      if (code < dict.length) entry = dict[code];
      else entry = [...prev!, prev![0]];
      out.push(...entry);
      if (prev) dict.push([...prev, entry[0]]);
      prev = entry;
      if (dict.length === 1 << size && size < 12) size++;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = out[y * w + x], s = ((y0 + y) * width + x0 + x) * 3;
      screen.set(table.slice(3 * k, 3 * k + 3), s);
    }
    frames.push({ rgb: screen.slice(), delay });
  }
  return { width, height, frames };
}

describe('encodeGif', () => {
  it('decodes to the frames it was given', () => {
    const W = 211, H = 137;
    const frames = Array.from({ length: 5 }, (_, f) => {
      const d = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, on = f < 4 && Math.hypot(x - 30 - 30 * f, y - 60) < 20;
        d[i] = on ? 200 : (x % 6) * 40;
        d[i + 1] = on ? 40 : (y % 6) * 40;
        d[i + 2] = on ? 40 : ((x ^ y) % 6) * 40;
        d[i + 3] = 255;
      }
      return { data: d, delay: 10 };
    });
    frames.push({ data: frames[4].data, delay: 10 });
    const g = decode(encodeGif(frames, W, H));
    expect([g.width, g.height]).toEqual([W, H]);
    expect(g.frames.map((f) => f.delay)).toEqual([10, 10, 10, 10, 20]);
    g.frames.forEach((f, k) => {
      let worst = 0;
      for (let p = 0; p < W * H; p++) for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(f.rgb[3 * p + c] - frames[k].data[4 * p + c]));
      expect(worst).toBeLessThanOrEqual(4);
    });
  });
});
