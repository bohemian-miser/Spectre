import { describe, expect, it } from 'vitest';

import { comboToMatchingIndices, leafOrder, maxMatchingIndex } from '../../core';
import {
  DEFAULT_SHARE,
  changeRule,
  defaultRule,
  pathNear,
  ruleFromShare,
  ruleShare,
  setTileMatching,
  toggleClass,
} from '../strandRule';

describe('strand rules and their combination strings', () => {
  it('reads a combination string into the matchings comboToMatchingIndices gives, and writes it back', () => {
    for (const family of ['hex', 'spectre'] as const) {
      const share = DEFAULT_SHARE[family];
      const [classes, digits] = share.split('-');
      const subset = [...classes].map(Number);
      const rule = ruleFromShare(family, share)!;
      expect(rule.subset).toEqual(subset);
      expect(rule.matching).toEqual(comboToMatchingIndices(family, subset, digits));
      expect(ruleShare(family, rule)).toBe(share);
      expect(defaultRule(family)).toEqual(rule);
    }
  });

  it('refuses a string with the wrong number of digits or a class the family lacks', () => {
    expect(ruleFromShare('hex', DEFAULT_SHARE.spectre)).toBeNull();
    expect(ruleFromShare('spectre', DEFAULT_SHARE.hex)).toBeNull();
    expect(ruleFromShare('hex', '9-000000000')).toBeNull();
    expect(ruleFromShare('hex', 'not a rule')).toBeNull();
  });

  it('keeps every matching in range when a class is dropped', () => {
    const rule = defaultRule('spectre');
    const highest = {
      ...rule,
      matching: leafOrder('spectre').map((type) => maxMatchingIndex('spectre', type, rule.subset)),
    };
    const narrowed = changeRule('spectre', highest, { subset: toggleClass(rule.subset, 2) });
    expect(narrowed.subset).toEqual([5, 7, 8]);
    leafOrder('spectre').forEach((type, i) => {
      expect(narrowed.matching[i]).toBeLessThanOrEqual(maxMatchingIndex('spectre', type, narrowed.subset));
    });
    expect(toggleClass([5, 7], 2)).toEqual([2, 5, 7]);
    expect(setTileMatching('hex', [0, 0, 0, 0, 0, 0, 0, 0, 0], 'Psi', 1)[leafOrder('hex').indexOf('Psi')]).toBe(1);
  });

  it('picks the drawn path nearest a point, within reach', () => {
    const paths = [
      { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], closed: false },
      { points: [{ x: 0, y: 5 }, { x: 10, y: 5 }], closed: false },
    ];
    expect(pathNear(paths, { x: 5, y: 1 }, 2)).toBe(0);
    expect(pathNear(paths, { x: 5, y: 4 }, 2)).toBe(1);
    expect(pathNear(paths, { x: 5, y: 2.5 }, 1)).toBeNull();
  });
});
