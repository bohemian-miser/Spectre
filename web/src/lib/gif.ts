/**
 * An animated GIF from RGBA frames: one 256-colour palette for the whole
 * animation (the most frequent colours of sample frames, at 5 bits a
 * channel), each frame stored as the rectangle that changed since the
 * frame before, and frames that change nothing folded into the previous
 * frame's delay. Loops forever.
 */

export interface RgbaFrame {
  readonly data: Uint8ClampedArray;
  /** Hundredths of a second it shows for. */
  readonly delay: number;
}

const key15 = (r: number, g: number, b: number): number => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

/** The palette: the 256 most frequent 15-bit colours over a sample of the frames' pixels, as RGB triples. */
function paletteOf(frames: readonly Uint8ClampedArray[]): Uint8Array {
  const count = new Uint32Array(1 << 15);
  const stride = Math.max(1, Math.floor(frames.length / 24));
  for (let f = 0; f < frames.length; f += stride) {
    const d = frames[f];
    for (let i = 0; i < d.length; i += 4) count[key15(d[i], d[i + 1], d[i + 2])]++;
  }
  const used: number[] = [];
  for (let k = 0; k < count.length; k++) if (count[k]) used.push(k);
  used.sort((a, b) => count[b] - count[a]);
  const out = new Uint8Array(256 * 3);
  used.slice(0, 256).forEach((k, i) => {
    out[3 * i] = ((k >> 10) << 3) | 4;
    out[3 * i + 1] = (((k >> 5) & 31) << 3) | 4;
    out[3 * i + 2] = ((k & 31) << 3) | 4;
  });
  return out;
}

/** Palette indices for RGBA pixels, through a nearest-colour table filled as colours are met. */
function indexer(palette: Uint8Array): (d: Uint8ClampedArray) => Uint8Array {
  const near = new Int16Array(1 << 15).fill(-1);
  const nearest = (k: number): number => {
    const r = ((k >> 10) << 3) | 4, g = (((k >> 5) & 31) << 3) | 4, b = ((k & 31) << 3) | 4;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < 256; i++) {
      const dr = palette[3 * i] - r, dg = palette[3 * i + 1] - g, db = palette[3 * i + 2] - b;
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };
  return (d) => {
    const out = new Uint8Array(d.length / 4);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const k = key15(d[i], d[i + 1], d[i + 2]);
      let n = near[k];
      if (n < 0) n = near[k] = nearest(k);
      out[p] = n;
    }
    return out;
  };
}

class Bytes {
  private buf: Uint8Array<ArrayBuffer> = new Uint8Array(1 << 16);
  length = 0;
  byte(b: number): void {
    if (this.length === this.buf.length) {
      const grown = new Uint8Array(this.buf.length * 2);
      grown.set(this.buf);
      this.buf = grown;
    }
    this.buf[this.length++] = b;
  }
  short(v: number): void {
    this.byte(v & 255);
    this.byte((v >> 8) & 255);
  }
  bytes(bs: ArrayLike<number>): void {
    for (let i = 0; i < bs.length; i++) this.byte(bs[i]);
  }
  out(): Uint8Array<ArrayBuffer> {
    return this.buf.slice(0, this.length);
  }
}

/** LZW code stream for 8-bit indices, in sub-blocks of at most 255 bytes. */
function lzw(out: Bytes, pixels: Uint8Array): void {
  const clear = 256, eoi = 257;
  out.byte(8);
  const code = new Int32Array(1 << 20);
  const stamp = new Int32Array(1 << 20);
  let gen = 1;
  let size = 9;
  let next = 258;
  let block: number[] = [];
  let acc = 0, bits = 0;
  const emit = (c: number): void => {
    acc |= c << bits;
    bits += size;
    while (bits >= 8) {
      block.push(acc & 255);
      acc >>>= 8;
      bits -= 8;
      if (block.length === 255) {
        out.byte(255);
        out.bytes(block);
        block = [];
      }
    }
  };
  emit(clear);
  let cur = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i];
    const key = (cur << 8) | k;
    if (stamp[key] === gen) {
      cur = code[key];
      continue;
    }
    emit(cur);
    if (next === 4096) {
      emit(clear);
      gen++;
      size = 9;
      next = 258;
    } else {
      if (next >= 1 << size) size++;
      stamp[key] = gen;
      code[key] = next++;
    }
    cur = k;
  }
  emit(cur);
  emit(eoi);
  if (bits > 0) block.push(acc & 255);
  if (block.length) {
    out.byte(block.length);
    out.bytes(block);
  }
  out.byte(0);
}

/**
 * Frames added one at a time, so only the file and the last frame are held.
 * The palette comes from sample frames given up front.
 */
export class GifEncoder {
  private readonly out = new Bytes();
  private readonly index: (d: Uint8ClampedArray) => Uint8Array;
  private last: Uint8Array | null = null;
  /** The last changed rectangle, written once the next frame shows whether its delay grows. */
  private pending: { x: number; y: number; w: number; h: number; delay: number; pix: Uint8Array } | null = null;

  constructor(readonly width: number, readonly height: number, samples: readonly Uint8ClampedArray[]) {
    const palette = paletteOf(samples);
    this.index = indexer(palette);
    const o = this.out;
    o.bytes([71, 73, 70, 56, 57, 97]); // GIF89a
    o.short(width);
    o.short(height);
    o.byte(0xf7); // a global table of 256 colours
    o.byte(0);
    o.byte(0);
    o.bytes(palette);
    o.bytes([0x21, 0xff, 11, ...Array.from('NETSCAPE2.0', (c) => c.charCodeAt(0)), 3, 1, 0, 0, 0]);
  }

  /** A frame of RGBA pixels, shown for `delay` hundredths of a second. */
  add(data: Uint8ClampedArray, delay: number): void {
    const { width, height } = this;
    const p = this.index(data);
    let x0 = 0, y0 = 0, x1 = width - 1, y1 = height - 1;
    const q = this.last;
    if (q) {
      x0 = width; y0 = height; x1 = -1; y1 = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          if (p[i] === q[i]) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) {
        this.pending!.delay += delay;
        return;
      }
    }
    this.flush();
    this.last = p;
    this.pending = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, delay, pix: p };
  }

  private flush(): void {
    const r = this.pending;
    if (!r) return;
    const o = this.out;
    o.bytes([0x21, 0xf9, 4, 0x04]); // leave the frame in place
    o.short(Math.max(2, Math.round(r.delay)));
    o.byte(0);
    o.byte(0);
    o.byte(0x2c);
    o.short(r.x);
    o.short(r.y);
    o.short(r.w);
    o.short(r.h);
    o.byte(0);
    const sub = new Uint8Array(r.w * r.h);
    for (let y = 0; y < r.h; y++) sub.set(r.pix.subarray((r.y + y) * this.width + r.x, (r.y + y) * this.width + r.x + r.w), y * r.w);
    lzw(o, sub);
    this.pending = null;
  }

  /** The file. */
  finish(): Uint8Array<ArrayBuffer> {
    if (!this.pending) throw new Error('a GIF needs a frame');
    this.flush();
    this.out.byte(0x3b);
    return this.out.out();
  }
}

/** The GIF file for frames of `width` × `height` pixels. */
export function encodeGif(frames: readonly RgbaFrame[], width: number, height: number): Uint8Array<ArrayBuffer> {
  const enc = new GifEncoder(width, height, frames.map((f) => f.data));
  for (const f of frames) enc.add(f.data, f.delay);
  return enc.finish();
}
