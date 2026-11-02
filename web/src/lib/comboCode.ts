/**
 * Reading a rule and combination out of whatever was pasted: a bare code
 * (`023468-140000001`) or a link from any page of the site, each of which
 * spells it its own way. The combination bar's paste box reads through this,
 * so one parser knows every form.
 *
 * | Form                                 | Pages                               |
 * |--------------------------------------|-------------------------------------|
 * | `c=023468-140000001`                 | Supertiles, Top-down                |
 * | `e=023468&c=140000001`               | Explorer, Map                       |
 * | `rule=023468&combo=140000001`        | Harmonics, Build-up, Foundations, Identify |
 * | `a=023468-140000001:4:303`           | Compare (the first circuit)         |
 *
 * A link's `f=` names the family; without it, nine digits mean the hexagons
 * and ten mean the page's own ten-digit family (Tile(1,1) unless the page is
 * on another).
 *
 * Pure — no React, no DOM.
 */

import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  comboOptionCounts,
  comboDigitValue,
  familyMajors,
  leafOrder,
  parseComboShareString,
  validEdgeSubsets,
  type TileFamilyId,
} from '../core';

export interface CodeRead {
  readonly ok: true;
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  /** One digit per leaf type, lower case. */
  readonly combo: string;
  /** Which form it was read from, for telling the reader. */
  readonly via: string;
  /** The rule is not tail-free: some tile has an odd number of crossings. */
  readonly tails: boolean;
}

export interface CodeError {
  readonly ok: false;
  readonly error: string;
}

export interface ReadOptions {
  /** The page's family: a ten-digit code without `f=` is read in it when it has ten leaf types. */
  readonly family?: TileFamilyId;
  /** Families the page takes; a code for another is refused with its name. */
  readonly families?: readonly TileFamilyId[];
}

/** The rule and digits a text names, before any family is decided. */
function find(text: string): { rule: string; combo: string; via: string; family: string | null } | null {
  const t = text.trim();
  const bare = parseComboShareString(t);
  if (bare) return { rule: bare.subset.join(''), combo: bare.combo, via: 'the code', family: null };
  if (!/[?#&=]/.test(t)) return null;
  // Every `?` and `#` after the first starts more parameters: `page.html?x=1#/route?c=…`.
  const at = t.search(/[?#]/);
  const query = (at >= 0 ? t.slice(at + 1) : t).replace(/^\/[^?&]*\??/, '').replace(/[?#]/g, '&');
  const q = new URLSearchParams(query);
  const family = q.get('f');
  const c = q.get('c');
  const e = q.get('e');
  const a = q.get('a');
  if (c && c.includes('-')) {
    const s = parseComboShareString(c);
    if (s) return { rule: s.subset.join(''), combo: s.combo, via: 'c=', family };
  }
  if (e !== null && c) return { rule: e, combo: c, via: 'e= and c=', family };
  const rule = q.get('rule');
  const combo = q.get('combo');
  if (rule !== null && combo) return { rule, combo, via: 'rule= and combo=', family };
  if (a) {
    const m = /^(\d*)-([0-9a-z]+):/i.exec(a);
    if (m) return { rule: m[1], combo: m[2], via: 'a= (Compare)', family };
  }
  return null;
}

/** Read a code or a link; the error says what to change. */
export function readCode(text: string, opts: ReadOptions = {}): CodeRead | CodeError | null {
  if (!text.trim()) return null;
  const found = find(text);
  if (!found || !/^\d*$/.test(found.rule) || !/^[0-9a-z]+$/i.test(found.combo)) {
    return { ok: false, error: 'No rule and combination in that text. A code looks like 023468-140000001.' };
  }
  const combo = found.combo.toLowerCase();
  const subset = [...new Set([...found.rule].map(Number))].sort((x, y) => x - y);

  let family: TileFamilyId | null = null;
  if (found.family && (FAMILIES as readonly string[]).includes(found.family)) family = found.family as TileFamilyId;
  else if (opts.family && leafOrder(opts.family).length === combo.length) family = opts.family;
  else family = FAMILIES.find((f) => leafOrder(f).length === combo.length) ?? null;
  if (!family) {
    return { ok: false, error: `${combo.length} digits after the dash: the hexagons take 9, Tile(1,1) takes 10.` };
  }
  if (opts.families && !opts.families.includes(family)) {
    return { ok: false, error: `That code is for ${FAMILY_DISPLAY_NAMES[family]}; this page takes ${opts.families.map((f) => FAMILY_DISPLAY_NAMES[f]).join(' or ')}.` };
  }
  const order = leafOrder(family);
  if (combo.length !== order.length) {
    return { ok: false, error: `${FAMILY_DISPLAY_NAMES[family]} takes ${order.length} digits; this has ${combo.length}.` };
  }
  const majors = familyMajors(family);
  const stray = subset.filter((m) => !majors.includes(m));
  if (stray.length) return { ok: false, error: `${FAMILY_DISPLAY_NAMES[family]} has no class ${stray.join(', ')}.` };

  const counts = comboOptionCounts(family, subset);
  const over = order.filter((_, i) => comboDigitValue(combo[i]) >= counts[i]);
  if (over.length) {
    const what = over.map((t) => `${t} has ${counts[order.indexOf(t)]}`).join(', ');
    return { ok: false, error: `A digit is past its tile's pairings under ${subset.join('') || '∅'}: ${what}.` };
  }
  const rule = subset.join('');
  const tails = !validEdgeSubsets(family).some((v) => v.edges.join('') === rule);
  return { ok: true, family, subset, combo, via: found.via, tails };
}
