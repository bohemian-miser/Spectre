import { describe, expect, it } from 'vitest';
import { compareHref, formatRef, hashOf, parseRef, refsFromHash } from '../refs';

describe('naming circuits for the Compare page', () => {
  it('parses and formats a name, and refuses a bad one', () => {
    const r = parseRef('023468-140000001:4:303')!;
    expect(r).toEqual({ subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 4, length: 303 });
    expect(formatRef(r)).toBe('023468-140000001:4:303');
    expect(parseRef('023468-140000001')).toBeNull();
    expect(parseRef('0233468-1:4:3')).toBeNull();
    expect(parseRef('023468-1:0:3')).toBeNull();
  });

  it('reads both circuits from a hash and writes a link that reads back', () => {
    const a = parseRef('023468-140000001:4:303')!;
    const b = parseRef('023468-000100000:6:8784')!;
    expect(hashOf(a, b)).toBe('#a=023468-140000001:4:303&b=023468-000100000:6:8784');
    expect(refsFromHash(hashOf(a, b))).toEqual({ a, b });
    expect(refsFromHash('#a=023468-140000001:4:303')).toBeNull();
    expect(compareHref('/Spectre/', a, b)).toBe('/Spectre/compare.html#a=023468-140000001:4:303&b=023468-000100000:6:8784');
  });
});
