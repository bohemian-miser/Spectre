import { describe, expect, it } from 'vitest';
import { comboToMatchingIndices } from '../../core';
import { readCode } from '../comboCode';

const ok = (text: string, opts = {}) => {
  const r = readCode(text, opts);
  if (!r || !r.ok) throw new Error(`not read: ${text} → ${r && !r.ok ? r.error : 'nothing'}`);
  return r;
};

describe('readCode', () => {
  it('reads a bare code, its family from the digit count', () => {
    expect(ok('023468-140000001')).toMatchObject({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo: '140000001', tails: false });
    expect(ok(' 2578-0100101100 ')).toMatchObject({ family: 'spectre', subset: [2, 5, 7, 8], combo: '0100101100' });
    expect(ok('-000000000')).toMatchObject({ family: 'hex', subset: [], combo: '000000000' });
  });

  it('reads a ten-digit code in the page’s own ten-digit family', () => {
    expect(ok('2578-0100101100', { family: 'turtle' }).family).toBe('turtle');
    expect(ok('2578-0100101100', { family: 'hex' }).family).toBe('spectre');
  });

  it('reads every form of link the site writes', () => {
    const forms: [string, string][] = [
      ['https://bohemian-miser.github.io/Spectre/#/explorer?v=1&f=hex&e=023468&c=140000001', 'e= and c='],
      ['https://bohemian-miser.github.io/Spectre/map.html#/map?f=hex&e=023468&c=140000001', 'e= and c='],
      ['https://bohemian-miser.github.io/Spectre/supertiles.html#/supertiles?f=hex&c=023468-140000001', 'c='],
      ['https://bohemian-miser.github.io/Spectre/harmonics.html?rule=023468&combo=140000001&level=6', 'rule= and combo='],
      ['buildup.html?rule=023468&combo=140000001', 'rule= and combo='],
      ['https://bohemian-miser.github.io/Spectre/compare.html#a=023468-140000001:4:303&b=023468-140000001:6:14679', 'a= (Compare)'],
    ];
    for (const [link, via] of forms) expect(ok(link)).toMatchObject({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo: '140000001', via });
  });

  it('takes the family a link names over the digit count', () => {
    expect(ok('#/explorer?f=hat&e=2578&c=0100101100').family).toBe('hat');
  });

  it('reads a code whose rule leaves tails, and says so', () => {
    const r = ok('2357-0000000000');
    expect(r.tails).toBe(true);
    expect(comboToMatchingIndices(r.family, r.subset, r.combo)).toHaveLength(10);
  });

  it('says what is wrong', () => {
    const err = (text: string, opts = {}) => {
      const r = readCode(text, opts);
      return r && !r.ok ? r.error : null;
    };
    expect(readCode('   ')).toBeNull();
    expect(err('hello')).toMatch(/No rule and combination/);
    expect(err('023468-1400')).toMatch(/4 digits/);
    expect(err('023468-940000001')).toMatch(/Delta has 2/);
    expect(err('2578-0100101100', { families: ['hex'] })).toMatch(/Tile\(1,1\); this page takes Hexagons/);
    expect(err('#/explorer?f=hex&e=7&c=000000000')).toMatch(/no class 7/);
  });
});
