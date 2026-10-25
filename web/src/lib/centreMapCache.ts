/**
 * Saved Centre map surveys, in localStorage for 30 days, so reopening the page
 * with the same settings shows the last result at once instead of recomputing.
 *
 * A survey is keyed by everything that decides it: family, level, the two
 * options and the pairings measured. The matrix and layout are stored as
 * base64 Float32Arrays (about 400 KB for the 270 Spectre pairings). When the
 * browser says storage is full, the oldest saved surveys go first; when it
 * refuses outright (private windows, blocked storage) nothing is saved and
 * nothing breaks.
 */

export const CENTRE_MAP_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PREFIX = 'centremap:v1:';

export interface SavedCentreMap {
  readonly savedAt: number;
  readonly level: number;
  readonly counts: readonly { readonly all: number; readonly inside: number }[];
  readonly matrix: Float32Array;
  readonly embedding: Float32Array;
}

export interface CentreMapKeyInput {
  readonly family: string;
  readonly level: number;
  readonly matchSizes: boolean;
  readonly weightBySize: boolean;
  readonly rules: readonly { readonly subset: readonly number[]; readonly combos: readonly string[] }[];
}

/** A short, stable key for a survey's settings and pairings. */
export function centreMapKey(k: CentreMapKeyInput): string {
  const pairings = k.rules.map((r) => `${r.subset.join('')}:${r.combos.join(',')}`).join('|');
  let h = 2166136261;
  for (let i = 0; i < pairings.length; i++) {
    h ^= pairings.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${PREFIX}${k.family}:${k.level}:${k.matchSizes ? 1 : 0}${k.weightBySize ? 1 : 0}:${(h >>> 0).toString(36)}`;
}

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function toBase64(a: Float32Array): string {
  const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(s: string): Float32Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/** Saved surveys' keys with their save times, oldest first; expired ones are removed. */
function savedKeys(store: Storage, now: number): { key: string; savedAt: number }[] {
  const out: { key: string; savedAt: number }[] = [];
  for (let i = store.length - 1; i >= 0; i--) {
    const key = store.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    let savedAt = 0;
    try {
      savedAt = Number((JSON.parse(store.getItem(key) ?? '{}') as { savedAt?: number }).savedAt) || 0;
    } catch {
      /* unreadable: treat as expired */
    }
    if (now - savedAt > CENTRE_MAP_TTL_MS) store.removeItem(key);
    else out.push({ key, savedAt });
  }
  return out.sort((a, b) => a.savedAt - b.savedAt);
}

export function loadCentreMap(key: string, now = Date.now()): SavedCentreMap | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as { savedAt: number; level: number; counts: SavedCentreMap['counts']; matrix: string; embedding: string };
    if (now - v.savedAt > CENTRE_MAP_TTL_MS) {
      store.removeItem(key);
      return null;
    }
    return { savedAt: v.savedAt, level: v.level, counts: v.counts, matrix: fromBase64(v.matrix), embedding: fromBase64(v.embedding) };
  } catch {
    return null;
  }
}

/** Save a survey; returns whether it was stored. */
export function saveCentreMap(
  key: string,
  result: { readonly level: number; readonly counts: SavedCentreMap['counts']; readonly matrix: Float32Array; readonly embedding: Float32Array },
  now = Date.now(),
): boolean {
  const store = storage();
  if (!store) return false;
  let raw: string;
  try {
    raw = JSON.stringify({ savedAt: now, level: result.level, counts: result.counts, matrix: toBase64(result.matrix), embedding: toBase64(result.embedding) });
  } catch {
    return false;
  }
  const others = (() => {
    try {
      return savedKeys(store, now).filter((k) => k.key !== key);
    } catch {
      return [];
    }
  })();
  for (;;) {
    try {
      store.setItem(key, raw);
      return true;
    } catch {
      // Full: make room by dropping the oldest saved survey, if any are left.
      const oldest = others.shift();
      if (!oldest) return false;
      try {
        store.removeItem(oldest.key);
      } catch {
        return false;
      }
    }
  }
}

/** Forget a saved survey. */
export function forgetCentreMap(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing to forget */
  }
}
