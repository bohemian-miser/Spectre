/**
 * Sounds per tile type: what happens when the trace crosses a tile, enters
 * by an edge, or takes a chord through it. Plain JSON, so it can be saved,
 * loaded and handed to an offline synth with the events it produced.
 *
 * A step of a trace is a chord through one tile, from its entry edge to its
 * exit edge. The keys it matches, from the most general to the most
 * specific, are
 *   `tile`                 any step through the tile type,
 *   `class:<m>`            entering by an edge of class m,
 *   `classes:<m>><n>`      entering by class m and leaving by class n,
 *   `edge:<id>`            entering by that edge (`3A`, `-2A`: the seam's label),
 *   `chord:<id>|<id>`      that chord, either way (ids sorted).
 * Assignments under the tile type `*` apply to every tile type and come
 * before the type's own. Each match can play a note and change one setting.
 */

export const INSTRUMENTS = ['pluck', 'bell', 'soft', 'click'] as const;
export const TARGETS = ['pitch', 'trace', 'cutoff', 'pan', 'reverb', 'glide', 'detune', 'corner'] as const;
export const MODES = ['set', 'add', 'toggle'] as const;

export type Instrument = (typeof INSTRUMENTS)[number];
export type Target = (typeof TARGETS)[number];
export type Mode = (typeof MODES)[number];

/** What each target changes, for the editor. */
export const TARGET_HELP: Readonly<Record<Target, string>> = {
  pitch: 'semitones added to tile notes',
  trace: 'semitones added to the trace voice',
  cutoff: 'octaves on the trace voice’s low-pass',
  pan: '-1 left to 1 right, trace voice and tile notes',
  reverb: 'added to the reverb send (-1 dry)',
  glide: 'seconds added to the trace glide',
  detune: 'cents on the trace voice',
  corner: 'added to the corner depth',
};

export interface NoteAction {
  readonly instrument: Instrument;
  /** A scale degree (0 = root), or a MIDI note when `midi` is set. */
  readonly degree: number;
  readonly midi?: boolean;
  /** 0..1. */
  readonly velocity: number;
}

export interface ModAction {
  readonly target: Target;
  readonly amount: number;
  /** set: the value becomes `amount`; add: `amount` is added; toggle: 0 becomes `amount`, anything else 0. */
  readonly mode: Mode;
}

export interface Assignment {
  readonly note?: NoteAction;
  readonly mod?: ModAction;
}

export interface TileSounds {
  readonly version: 1;
  /** Tile type (or `*` for every type) → key → assignment. */
  readonly tiles: Readonly<Record<string, Readonly<Record<string, Assignment>>>>;
}

export const EMPTY_TILE_SOUNDS: TileSounds = { version: 1, tiles: {} };

/** One step of a trace through a tile. */
export interface StepEdges {
  readonly type: string;
  /** Seam labels (`3A`) of the edges it enters and leaves by, and their classes. */
  readonly entry: string;
  readonly exit: string;
  readonly entryClass: number;
  readonly exitClass: number;
}

export const chordKey = (a: string, b: string): string => `chord:${[a, b].sort().join('|')}`;

/** The keys a step matches, general first. */
export function stepKeys(s: StepEdges): string[] {
  return ['tile', `class:${s.entryClass}`, `classes:${s.entryClass}>${s.exitClass}`, `edge:${s.entry}`, chordKey(s.entry, s.exit)];
}

export function keyLabel(key: string): string {
  const [kind, rest] = [key.slice(0, key.indexOf(':') < 0 ? key.length : key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  if (kind === 'tile') return 'whole tile';
  if (kind === 'class') return `entering by class ${rest}`;
  if (kind === 'classes') return `class ${rest.replace('>', ' → ')}`;
  if (kind === 'edge') return `entering by edge ${rest}`;
  if (kind === 'chord') return `line ${rest.replace('|', ' – ')}`;
  return key;
}

export interface ModState {
  pitch: number;
  trace: number;
  cutoff: number;
  pan: number;
  reverb: number;
  glide: number;
  detune: number;
  corner: number;
}

export const ZERO_STATE: Readonly<ModState> = { pitch: 0, trace: 0, cutoff: 0, pan: 0, reverb: 0, glide: 0, detune: 0, corner: 0 };

export function applyMod(state: Readonly<ModState>, mod: ModAction): ModState {
  const v = state[mod.target];
  const next = mod.mode === 'set' ? mod.amount : mod.mode === 'add' ? v + mod.amount : v !== 0 ? 0 : mod.amount;
  return { ...state, [mod.target]: next };
}

/**
 * Walk the steps: the settings in force at each step (after its own
 * assignments), and the notes the steps play.
 */
export function stepActions(
  steps: readonly StepEdges[],
  map: TileSounds,
): { states: ModState[]; notes: { step: number; note: NoteAction; state: ModState }[] } {
  let state: ModState = { ...ZERO_STATE };
  const states: ModState[] = [];
  const notes: { step: number; note: NoteAction; state: ModState }[] = [];
  steps.forEach((s, k) => {
    const found: Assignment[] = [];
    for (const key of stepKeys(s)) {
      for (const scope of ['*', s.type]) {
        const a = map.tiles[scope]?.[key];
        if (a) found.push(a);
      }
    }
    for (const a of found) if (a.mod) state = applyMod(state, a.mod);
    for (const a of found) if (a.note) notes.push({ step: k, note: a.note, state });
    states.push(state);
  });
  return { states, notes };
}

export function describeAssignment(a: Assignment): string {
  const parts: string[] = [];
  if (a.note) parts.push(`${a.note.instrument} ${a.note.midi ? `MIDI ${a.note.degree}` : `degree ${a.note.degree}`} at ${Math.round(a.note.velocity * 100)}%`);
  if (a.mod) parts.push(`${a.mod.mode} ${a.mod.target} ${a.mod.mode === 'toggle' ? '0 / ' : ''}${a.mod.amount}`);
  return parts.join('; ') || 'nothing';
}

/** Set (or with `null`, remove) one assignment. */
export function withAssignment(map: TileSounds, scope: string, key: string, a: Assignment | null): TileSounds {
  const row = { ...(map.tiles[scope] ?? {}) };
  if (a && (a.note || a.mod)) row[key] = a;
  else delete row[key];
  const tiles = { ...map.tiles, [scope]: row };
  if (Object.keys(row).length === 0) delete tiles[scope];
  return { version: 1, tiles };
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function readAssignment(raw: unknown): Assignment | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, Record<string, unknown> | undefined>;
  let note: NoteAction | undefined;
  let mod: ModAction | undefined;
  const n = r.note;
  if (n && INSTRUMENTS.includes(n.instrument as Instrument) && isFiniteNumber(n.degree) && isFiniteNumber(n.velocity)) {
    note = { instrument: n.instrument as Instrument, degree: n.degree, velocity: Math.max(0, Math.min(1, n.velocity)), ...(n.midi === true ? { midi: true } : {}) };
  }
  const m = r.mod;
  if (m && TARGETS.includes(m.target as Target) && MODES.includes(m.mode as Mode) && isFiniteNumber(m.amount)) {
    mod = { target: m.target as Target, mode: m.mode as Mode, amount: m.amount };
  }
  return note || mod ? { ...(note ? { note } : {}), ...(mod ? { mod } : {}) } : null;
}

/** A map from JSON, keeping only the entries it can read; throws if it is not one at all. */
export function readTileSounds(json: unknown): TileSounds {
  const tiles = (json as { tiles?: unknown } | null)?.tiles;
  if (!tiles || typeof tiles !== 'object') throw new Error('not a tile sound map: no "tiles"');
  let map: TileSounds = EMPTY_TILE_SOUNDS;
  for (const [scope, row] of Object.entries(tiles as Record<string, unknown>)) {
    if (!row || typeof row !== 'object') continue;
    for (const [key, raw] of Object.entries(row as Record<string, unknown>)) {
      const a = readAssignment(raw);
      if (a) map = withAssignment(map, scope, key, a);
    }
  }
  return map;
}

/**
 * Example maps that work under any rule, since they use tile types and
 * classes only.
 */
export function presets(types: readonly string[], classes: readonly number[]): { name: string; map: TileSounds }[] {
  let perType: TileSounds = EMPTY_TILE_SOUNDS;
  types.forEach((t, i) => {
    perType = withAssignment(perType, t, 'tile', { note: { instrument: 'pluck', degree: i, velocity: 0.5 } });
  });
  let byClass: TileSounds = EMPTY_TILE_SOUNDS;
  const top = Math.max(1, ...classes);
  for (const m of classes) byClass = withAssignment(byClass, '*', `class:${m}`, { mod: { target: 'pan', mode: 'set', amount: +((m / top) * 1.6 - 0.8).toFixed(2) } });
  for (const t of types.filter((t) => t.startsWith('Gamma'))) {
    byClass = withAssignment(byClass, t, 'tile', { note: { instrument: 'bell', degree: 7, velocity: 0.6 }, mod: { target: 'trace', mode: 'toggle', amount: 12 } });
  }
  return [
    { name: 'A note per tile type', map: perType },
    { name: 'Pan by entry class, Gamma flips the octave', map: byClass },
  ];
}
