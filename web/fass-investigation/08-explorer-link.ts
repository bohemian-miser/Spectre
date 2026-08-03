/**
 * Build shareable Explorer deep links for the FASS configuration using the
 * core codec (encodeExplorerState), with a decode round-trip check.
 *
 * Run: cd web && npx --yes tsx fass-investigation/08-explorer-link.ts
 */

import {
  DEFAULT_EXPLORER_STATE,
  comboToMatchingIndices,
  decodeExplorerQuery,
  encodeExplorerQuery,
  formatComboShareString,
  type ExplorerState,
  type TileTypeId,
} from '../src/core';
import { FAMILY, SUBSET_1278 } from './lib';

const COMBO = '0100100000';

for (const [rootTile, level] of [
  ['Psi', 4],
  ['Psi', 6],
  ['Delta', 4],
  ['Delta', 6],
] as [TileTypeId, number][]) {
  const state: ExplorerState = {
    ...DEFAULT_EXPLORER_STATE,
    rootTile,
    level,
    subset: SUBSET_1278,
    matching: comboToMatchingIndices(FAMILY, SUBSET_1278, COMBO),
  };
  const q = encodeExplorerQuery(state);
  // round-trip check
  const back = decodeExplorerQuery(q);
  const ok =
    back.rootTile === rootTile &&
    back.level === level &&
    back.subset.join('') === '1278' &&
    back.matching.join(',') === state.matching.join(',');
  console.log(`${rootTile}@${level}: index.html#/explorer?${q}   roundtrip=${ok ? 'OK' : 'FAIL'}`);
}
console.log(`\ncanonical share string: ${formatComboShareString(SUBSET_1278, COMBO)}`);
console.log(`matching indices (leafOrder): ${comboToMatchingIndices(FAMILY, SUBSET_1278, COMBO).join(',')}`);
