import { describe, expect, it } from 'vitest';
import { identifyHref, readIdentify } from '../href';

describe('the Identify page’s address', () => {
  it('writes a strand’s rule, combination, tile, edge and root level, and reads them back', () => {
    const p = { subset: [0, 2, 3, 4, 6, 8], combo: '140000001', tile: '3.0.5.1', edge: 2, level: 4 };
    const href = identifyHref('/Spectre/', p);
    expect(href).toBe('/Spectre/identify.html?rule=023468&combo=140000001&tile=3.0.5.1&edge=2&level=4');
    expect(identifyHref('/Spectre', p)).toBe(href);
    expect(readIdentify(href.slice(href.indexOf('?')))).toEqual(p);
    expect(readIdentify('rule=023468&combo=140000001&tile=3.0.5.1&edge=2&level=4')).toEqual(p);
  });

  it('refuses an address missing a part or naming no tile', () => {
    const ok = 'rule=023468&combo=140000001&tile=3.0.5.1&edge=2&level=4';
    expect(readIdentify(ok)).not.toBeNull();
    for (const bad of [
      ok.replace('rule=023468', 'rule=0234689'),
      ok.replace('rule=023468', 'rule=0233'),
      ok.replace('&combo=140000001', ''),
      ok.replace('edge=2', 'edge=6'),
      ok.replace('edge=2', 'edge=x'),
      ok.replace('tile=3.0.5.1', 'tile=3.0.5'),
      ok.replace('tile=3.0.5.1', 'tile=3.0.8.1'),
      ok.replace('&level=4', ''),
    ])
      expect(readIdentify(bad)).toBeNull();
  });
});
