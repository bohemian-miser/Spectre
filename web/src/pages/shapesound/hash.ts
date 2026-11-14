/**
 * The page's state in the URL hash, so a link reproduces a card: the rule
 * (family, edges, combo), the selected circuit (its key and step count) and
 * the brush (mode, loop or constant, every setting as `<mode>.<name>`).
 *
 *   #family=hex&edges=01234568&combo=310021340&circuit=c812&steps=429
 *    &mode=spectrum&play=loop&spectrum.f0=62&spectrum.terms=42&...
 */

import type { TileFamilyId } from '../../core';
import type { Brush } from './paint';
import { DEFAULT_SETTINGS, LIMITS, MAPPINGS, PLAYS, type Mapping, type Play, type Settings } from './render';

export interface HashState {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  /** The selected circuit: its strand key and step count. */
  readonly circuit: { readonly key: string | null; readonly steps: number } | null;
  readonly brush: Brush;
}

const num = (v: number): string => String(Number(v.toPrecision(6)));

export function encodeHash(s: HashState): string {
  const q = new URLSearchParams();
  q.set('family', s.family);
  q.set('edges', s.subset.some((e) => e > 9) ? s.subset.join(',') : s.subset.join(''));
  q.set('combo', s.combo);
  if (s.circuit) {
    if (s.circuit.key) q.set('circuit', s.circuit.key);
    q.set('steps', String(s.circuit.steps));
  }
  q.set('mode', s.brush.mode);
  q.set('play', s.brush.play);
  for (const m of MAPPINGS) {
    for (const [k, v] of Object.entries(s.brush.settings[m])) q.set(`${m}.${k}`, typeof v === 'boolean' ? (v ? '1' : '0') : num(v as number));
  }
  return q.toString();
}

/** The state a hash names; whatever it leaves out comes from `fallback`. */
export function decodeHash(hash: string, fallback: HashState): HashState {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const family = (q.get('family') as TileFamilyId | null) ?? fallback.family;
  const edges = q.get('edges');
  const subset = edges ? (edges.includes(',') ? edges.split(',') : edges.split('')).map(Number).filter((e) => Number.isInteger(e)) : fallback.subset;
  const steps = Number(q.get('steps'));
  const circuit = q.get('circuit') || steps > 0 ? { key: q.get('circuit'), steps: steps > 0 ? steps : 0 } : fallback.circuit;
  const mode = MAPPINGS.includes(q.get('mode') as Mapping) ? (q.get('mode') as Mapping) : fallback.brush.mode;
  const play = PLAYS.includes(q.get('play') as Play) ? (q.get('play') as Play) : fallback.brush.play;
  const settings = Object.fromEntries(
    MAPPINGS.map((m) => [
      m,
      Object.fromEntries(
        Object.entries(DEFAULT_SETTINGS[m]).map(([k, d]) => {
          const raw = q.get(`${m}.${k}`);
          const prev = (fallback.brush.settings[m] as unknown as Record<string, number | boolean>)[k];
          if (raw === null) return [k, prev];
          if (typeof d === 'boolean') return [k, raw === '1' || raw === 'true'];
          const v = Number(raw);
          if (!Number.isFinite(v)) return [k, prev];
          // Kept to the sliders' range.
          const lim = (LIMITS[m] as Record<string, readonly [number, number] | undefined>)[k];
          return [k, lim ? Math.max(lim[0], Math.min(lim[1], v)) : v];
        }),
      ),
    ]),
  ) as unknown as Settings;
  return { family, subset, combo: q.get('combo') ?? fallback.combo, circuit, brush: { mode, play, settings } };
}
