/**
 * Painting circuits with the brush. A click on a circuit that is off turns
 * it on with a copy of the brush and selects it; a click on one that is on
 * turns it off. Shift-click selects an on circuit without turning it off.
 * Brush edits go to the selected circuit only.
 */

import type { Pt } from '../../core';
import type { Mapping, Play, Settings } from './render';

export interface Brush {
  readonly mode: Mapping;
  readonly play: Play;
  readonly settings: Settings;
}

export interface Voice extends Brush {
  readonly id: number;
  /** The strand's key (`Strand.key`). */
  readonly key: string;
  readonly points: readonly Pt[];
  readonly level: number;
  readonly on: boolean;
  /** A traced strand that did not close; `capped` when it stopped at the step limit. */
  readonly open?: boolean;
  readonly capped?: boolean;
  /** Where a traced strand was clicked, world coordinates (for links). */
  readonly at?: Pt;
}

/** A circuit or traced strand as a click delivers it. */
export interface Painted {
  readonly key: string;
  readonly points: readonly Pt[];
  readonly open?: boolean;
  readonly capped?: boolean;
  readonly at?: Pt;
}

export const MAX_VOICES = 16;
export const DEFAULT_LEVEL = 0.8;

export interface PaintResult {
  readonly kind: 'add' | 'remove' | 'select' | 'full';
  readonly voices: readonly Voice[];
  /** The voice selected afterwards, or null for none. */
  readonly selected: number | null;
  /** The voice added or removed. */
  readonly id?: number;
}

export const brushOf = (v: Brush): Brush => ({ mode: v.mode, play: v.play, settings: v.settings });

/** What a click on circuit `key` does; `id` is the id a new voice gets. */
export function paint(
  voices: readonly Voice[],
  selected: number | null,
  circuit: Painted,
  brush: Brush,
  shift: boolean,
  id: number,
  cap = MAX_VOICES,
): PaintResult {
  const have = voices.find((v) => v.key === circuit.key);
  if (have && shift) return { kind: 'select', voices, selected: have.id };
  if (have) return { kind: 'remove', id: have.id, voices: voices.filter((v) => v !== have), selected: selected === have.id ? null : selected };
  if (voices.length >= cap) return { kind: 'full', voices, selected };
  const traced = { ...(circuit.open ? { open: true } : {}), ...(circuit.capped ? { capped: true } : {}), ...(circuit.at ? { at: circuit.at } : {}) };
  return { kind: 'add', id, selected: id, voices: [...voices, { ...brushOf(brush), id, key: circuit.key, points: circuit.points, level: DEFAULT_LEVEL, on: true, ...traced }] };
}

/** The voices with the brush applied to the selected one (unchanged if it already has it). */
export function applyBrush(voices: readonly Voice[], selected: number | null, brush: Brush): readonly Voice[] {
  const v = voices.find((x) => x.id === selected);
  if (!v || (v.mode === brush.mode && v.play === brush.play && v.settings === brush.settings)) return voices;
  return voices.map((x) => (x === v ? { ...x, ...brushOf(brush) } : x));
}
