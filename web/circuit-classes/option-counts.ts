// Prints {"family|rule": [option count per leaf type]} for every valid rule of every family.
import { FAMILIES, comboOptionCounts, validEdgeSubsets } from '../src/core';
const out: Record<string, number[]> = {};
for (const f of FAMILIES) for (const s of validEdgeSubsets(f)) out[`${f}|${s.edges.join('')}`] = comboOptionCounts(f, s.edges);
console.log(JSON.stringify(out));
