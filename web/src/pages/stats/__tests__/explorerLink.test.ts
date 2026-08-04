/**
 * "Open in Explorer" must rebuild *exactly* the configuration a row describes,
 * for all 270 of them — the link is only useful if the scene it opens is the
 * scene whose numbers you were reading.
 *
 * The round trip goes through core's own decoder (`decodeExplorerState`), so
 * this test fails if either side of the codec drifts.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPLORER_STATE,
  MAX_LEVEL,
  comboToMatchingIndices,
  decodeExplorerState,
  matchingIndicesToCombo,
} from '../../../core';
import { parseStatsDataset } from '../statsData';
import {
  EXPLORER_LINK_LEVELS,
  explorerHref,
  explorerStateFor,
  isHeavyLevel,
  parseStatsHash,
  selectionToSubset,
  statsHash,
  STATS_ROUTE,
} from '../explorerLink';

const data = parseStatsDataset(
  JSON.parse(
    readFileSync(new URL('../../../../public/data/circuit_stats.json', import.meta.url), 'utf8'),
  ),
);

/** Pull the explorer query out of `<base>#/explorer?…`. */
function queryOf(href: string): URLSearchParams {
  const at = href.indexOf('?');
  expect(at).toBeGreaterThan(0);
  return new URLSearchParams(href.slice(at + 1));
}

describe('selectionToSubset', () => {
  it('turns a selection string into sorted major classes', () => {
    expect(selectionToSubset('2578')).toEqual([2, 5, 7, 8]);
    expect(selectionToSubset('023678')).toEqual([0, 2, 3, 6, 7, 8]);
    expect(selectionToSubset('')).toEqual([]);
  });
});

describe('explorerHref', () => {
  it('lands on the explorer document under the deploy base', () => {
    const href = explorerHref('2578', '0000001100', 4, '/Spectre/');
    expect(href.startsWith('/Spectre/#/explorer?')).toBe(true);
    expect(explorerHref('2578', '0000001100', 4, '/Spectre').startsWith('/Spectre/#/')).toBe(true);
    expect(explorerHref('2578', '0000001100', 4).startsWith('/#/explorer?')).toBe(true);
  });

  it('encodes selection, combo and level in the canonical wire format', () => {
    const q = queryOf(explorerHref('2578', '0000001100', 6, '/Spectre/'));
    expect(q.get('v')).toBe('1');
    expect(q.get('e')).toBe('2578');
    expect(q.get('c')).toBe('0000001100');
    expect(q.get('lv')).toBe('6');
    // Level 2 is the codec default and is therefore omitted.
    expect(queryOf(explorerHref('2578', '0000001100', 2, '/')).get('lv')).toBeNull();
  });

  it('clamps levels to the codec range', () => {
    expect(explorerStateFor('15', '0000000100', 99).level).toBe(MAX_LEVEL);
    expect(explorerStateFor('15', '0000000100', -3).level).toBe(0);
  });

  it('round-trips every one of the 270 configurations through core', () => {
    expect(data.rows).toHaveLength(270);
    for (const row of data.rows) {
      const state = decodeExplorerState(queryOf(explorerHref(row.selection, row.combo, 4, '/Spectre/')));
      expect(state.family).toBe(DEFAULT_EXPLORER_STATE.family);
      expect(state.rootTile).toBe('Delta');
      expect(state.level).toBe(4);
      expect(state.subset, row.id).toEqual(selectionToSubset(row.selection));
      // The decoded per-tile matchings are the ones the combo names …
      expect(state.matching, row.id).toEqual(
        comboToMatchingIndices('spectre', state.subset, row.combo),
      );
      // … and they encode back to the same combination string.
      expect(matchingIndicesToCombo('spectre', state.subset, state.matching), row.id).toBe(
        row.combo,
      );
    }
  });

  it('offers a quick preview level plus the two analysed depths', () => {
    expect(EXPLORER_LINK_LEVELS).toEqual([2, 4, 6]);
    expect(isHeavyLevel(2)).toBe(false);
    expect(isHeavyLevel(4)).toBe(false);
    expect(isHeavyLevel(6)).toBe(true);
  });
});

describe('stats page hash state', () => {
  it('round-trips level and open row', () => {
    const hash = statsHash({ level: 'lvl4', rowId: '2578-0000001100' });
    expect(hash).toBe(`${STATS_ROUTE}?ds=lvl4&sel=2578&combo=0000001100`);
    expect(parseStatsHash(hash)).toEqual({ level: 'lvl4', rowId: '2578-0000001100' });
    expect(parseStatsHash(statsHash({ level: 'lvl6', rowId: null }))).toEqual({
      level: 'lvl6',
      rowId: null,
    });
  });

  it('falls back on anything malformed', () => {
    expect(parseStatsHash('')).toEqual({ level: 'lvl6', rowId: null });
    expect(parseStatsHash('#/stats')).toEqual({ level: 'lvl6', rowId: null });
    expect(parseStatsHash('#/stats?ds=lvl9&sel=2578')).toEqual({ level: 'lvl6', rowId: null });
    expect(parseStatsHash('#/stats?ds=lvl4')).toEqual({ level: 'lvl4', rowId: null });
  });

  it('names rows the same way the model does', () => {
    const { rowId } = parseStatsHash('#/stats?ds=lvl6&sel=1278&combo=0100100000');
    expect(rowId).toBe('1278-0100100000');
    expect(data.rowsById.get(rowId!)?.lvl6.maxTail).toBe(248348);
  });
});
