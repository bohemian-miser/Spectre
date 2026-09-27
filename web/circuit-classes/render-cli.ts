// Usage: tsx render-cli.ts <family> <rule> <level> <size> <outdir> [combo ...]  (no combos = all)
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildGraph, comboCount, comboFromIndex, comboString } from './engine';
import { workspace } from './features';
import { renderPng } from './render';
import type { TileFamilyId } from '../src/core';
const [family, rule, lv, size, out, ...combos] = process.argv.slice(2);
const g = buildGraph(family as TileFamilyId, [...rule].map(Number), Number(lv));
const ws = workspace(g);
mkdirSync(out, { recursive: true });
const list = combos.length ? combos.map((s) => [...s].map((ch) => parseInt(ch, 36))) : Array.from({ length: comboCount(g) }, (_, i) => comboFromIndex(g, i));
for (const d of list) writeFileSync(`${out}/${family}-${rule}-${comboString(d)}-L${lv}.png`, renderPng(g, d, ws, Number(size)));
console.log('rendered', list.length);
