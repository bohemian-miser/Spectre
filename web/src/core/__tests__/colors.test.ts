import { describe, expect, it } from 'vitest';

import { circuitHueColor, circuitLengthRgb } from '../colors';

/**
 * Approximate perceptual distance ("redmean") — good enough to tell "these are
 * the same green" from "these are different colours", which is the only
 * judgement being made here. Runs 0 … ~765.
 */
function perceptualDistance(a: readonly number[], b: readonly number[]): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** Hue angle in degrees, or -1 for a grey. */
function hueAngle(rgb: readonly number[]): number {
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 1e-9) return -1;
  return (
    (((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60) % 360 +
      360) %
    360
  );
}

/** Rough hue name, for asking "is it all one colour?" of a whole range. */
function hueBand(rgb: readonly number[]): string {
  const h = hueAngle(rgb);
  if (h < 0) return 'grey';
  if (h < 20) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 160) return 'green';
  if (h < 200) return 'cyan';
  if (h < 250) return 'blue';
  if (h < 290) return 'violet';
  if (h < 330) return 'pink';
  return 'red';
}

describe('circuitLengthRgb', () => {
  it('is deterministic per length', () => {
    expect(circuitLengthRgb(14)).toEqual(circuitLengthRgb(14));
  });

  it('no longer repeats every 9 lengths (the 40°-ramp collision)', () => {
    for (let n = 3; n < 60; n++) {
      expect(circuitLengthRgb(n)).not.toEqual(circuitLengthRgb(n + 9));
    }
  });

  it('gives every length a distinct colour across any practical range', () => {
    const seen = new Map<string, number>();
    for (let n = 1; n <= 2000; n++) {
      const key = circuitLengthRgb(n).join(',');
      const prior = seen.get(key);
      expect(prior, `length ${n} collides with length ${prior}`).toBeUndefined();
      seen.set(key, n);
    }
  });

  /**
   * The regression that mattered: distinct RGB tuples are not enough, because
   * two colours can differ by a couple of levels and still read as the same
   * ink. Under the old hashed hue, length 56 was rgb(130,255,60) and length
   * 672 was rgb(127,255,62) — the same green for circuits 12× apart in size,
   * which is exactly the comparison the colour exists to make.
   *
   * The range here goes to 30,000 on purpose. It used to stop at 1,600, and
   * that is why it sat green through the second version of this bug: the ramp
   * ran out at 4,096, so 3,995 and 16,271 came out the same RGB exactly —
   * four times apart, one colour — and nothing above 4,096 had a hue of its
   * own at all.
   */
  it('never paints a long circuit the same as a much shorter one', () => {
    // Every short length, then log-spaced up to the longest circuit the
    // reference analyses actually contain (27,621 in lvl6.csv).
    const lengths: number[] = [];
    for (let n = 2; n <= 400; n++) lengths.push(n);
    for (let n = 401; n <= 30000; n = Math.max(n + 1, Math.round(n * 1.01))) lengths.push(n);

    let worst = Number.POSITIVE_INFINITY;
    let worstPair: [number, number] = [0, 0];
    for (let i = 0; i < lengths.length; i++) {
      for (let j = i + 1; j < lengths.length; j++) {
        if (lengths[j] < lengths[i] * 4) continue;
        const d = perceptualDistance(circuitLengthRgb(lengths[i]), circuitLengthRgb(lengths[j]));
        if (d < worst) {
          worst = d;
          worstPair = [lengths[i], lengths[j]];
        }
      }
    }
    expect(
      worst,
      `lengths ${worstPair[0]} and ${worstPair[1]} look alike (distance ${worst.toFixed(1)})`,
    ).toBeGreaterThan(80);
  });

  it('ramps hue with length, so colour orders circuits by size', () => {
    // Short is warm, long is cool: red channel falls away as blue comes up.
    const short = circuitLengthRgb(4);
    const mid = circuitLengthRgb(120);
    const long = circuitLengthRgb(3000);
    expect(short[0]).toBeGreaterThan(long[0]);
    expect(long[2]).toBeGreaterThan(short[2]);
    expect(perceptualDistance(short, mid)).toBeGreaterThan(80);
    expect(perceptualDistance(mid, long)).toBeGreaterThan(80);
  });

  /**
   * "At a certain size everything is pink." The old ramp spread its hue over
   * 12 octaves, so every circuit past 4,096 tiles got the identical hue and a
   * screen of long circuits came out one colour. Lengths spread roughly evenly
   * per octave in the reference analyses, so that is how they are sampled.
   */
  it('spends no more than a third of the real range in any one hue', () => {
    const bands = new Map<string, number>();
    let samples = 0;
    for (let u = 1; u <= 14.8; u += 0.02) {
      bands.set(hueBand(circuitLengthRgb(2 ** u)), (bands.get(hueBand(circuitLengthRgb(2 ** u))) ?? 0) + 1);
      samples++;
    }
    const [name, count] = [...bands].sort((a, b) => b[1] - a[1])[0];
    expect(count / samples, `${name} covers ${((100 * count) / samples).toFixed(0)}% of the range`).
      toBeLessThan(0.4);
    // And the HUE still moves at the top of the range, which is the thing that
    // stopped: past the old ramp's end every length had the same 295°, so the
    // only difference left between two long circuits was their lightness.
    const spread = Math.abs(hueAngle(circuitLengthRgb(24000)) - hueAngle(circuitLengthRgb(6000)));
    expect(spread, 'the ramp has run out before the longest circuits').toBeGreaterThan(20);
  });

  /**
   * Distinct lengths, distinct colours — over the whole range circuits are
   * actually found in, not just the first two thousand. Eight-bit colour and a
   * hue that necessarily slows down as lengths grow mean this cannot hold
   * forever; what it must never do is what it did, which was to hand one
   * colour to lengths seven times apart.
   */
  it('gives every length its own colour up to the longest circuits seen', () => {
    const seen = new Map<string, number>();
    for (let n = 1; n <= 30000; n++) {
      const key = circuitLengthRgb(n).join(',');
      const prior = seen.get(key);
      expect(prior, `length ${n} is exactly the colour of length ${prior}`).toBeUndefined();
      seen.set(key, n);
    }
  });

  it('still separates neighbouring lengths, which share a hue', () => {
    for (let n = 1; n < 4000; n++) {
      // Not far apart — they are genuinely similar circuits — but never equal.
      expect(perceptualDistance(circuitLengthRgb(n), circuitLengthRgb(n + 1))).toBeGreaterThan(20);
    }
  });

  it('keeps every colour bright enough to read as ink', () => {
    for (let n = 1; n <= 30000; n++) {
      const rgb = circuitLengthRgb(n);
      expect(Math.max(...rgb)).toBeGreaterThanOrEqual(190);
      for (const ch of rgb) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(255);
      }
    }
  });
});

/**
 * The ranked palette: one colour per distinct circuit length WITHIN a patch.
 * Its job is to tell that patch's classes apart, so the thing it must never do
 * is hand two of them the same colour — which the old 40° step did on every
 * ninth rank, in one patch out of ten.
 */
describe('circuitHueColor', () => {
  const hueOf = (css: string): number => Number(/hsl\(([\d.]+)/.exec(css)![1]);

  it('never repeats within any patch worth drawing', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = circuitHueColor(i);
      expect(seen.has(c), `rank ${i} repeats a colour`).toBe(false);
      seen.add(c);
    }
  });

  it('used to collide every ninth rank, and does not now', () => {
    for (let i = 0; i < 60; i++) {
      expect(circuitHueColor(i)).not.toBe(circuitHueColor(i + 9));
    }
  });

  it('spreads however many ranks there are, evenly enough to tell apart', () => {
    // The most distinct lengths any reference combo has is 15.
    for (const count of [3, 8, 15, 24]) {
      const hues = Array.from({ length: count }, (_, i) => hueOf(circuitHueColor(i))).sort(
        (a, b) => a - b,
      );
      let gap = 360 - hues[hues.length - 1] + hues[0];
      for (let i = 1; i < hues.length; i++) gap = Math.min(gap, hues[i] - hues[i - 1]);
      // A perfectly even spread would be 360/count; the golden angle gets
      // within a factor of two of that for any count, which no fixed step does.
      expect(gap, `${count} ranks crowd to ${gap.toFixed(1)}°`).toBeGreaterThan(180 / count);
    }
  });

  it('is stable and clamps a nonsense rank', () => {
    expect(circuitHueColor(3)).toBe(circuitHueColor(3));
    expect(circuitHueColor(-2)).toBe(circuitHueColor(0));
    expect(circuitHueColor(2.7)).toBe(circuitHueColor(2));
  });
});
