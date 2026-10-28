/**
 * The shapes of circuits too big to render: the renormalisation of
 * `renormalize.ts`, keeping each arc's route through its children so one
 * circuit can be expanded on its own, down to any level of detail.
 *
 * An arc of a level-n supertile (outline crossing k to its mate) is the walk
 * through the children that made it: a list of child crossings it enters.
 * Expanding a circuit means replaying those walks recursively; stopping at
 * level `stop` draws each level-`stop` arc as a straight chord between its
 * ends, so a million-tile circuit comes out as a few thousand points with its
 * shape intact.
 *
 * Usage: tsx circuit-shapes.ts <family> <rule> <combo> <level> <type> <out.json>
 *   writes the largest circuits born at <level> in <type> (in that
 *   supertile's frame) and the supertile's children outlines, as JSON.
 */
import { writeFileSync } from 'node:fs';
import type { TileFamilyId } from '../src/core';
import { CircuitShapes } from '../src/pages/shapes/circuitShapes';

export { CircuitShapes, type BornCircuit } from '../src/pages/shapes/circuitShapes';

if (process.argv[1]?.endsWith('circuit-shapes.ts')) {
  const [family, rule, combo, lvArg, type, outFile, stopArg, keepArg] = process.argv.slice(2);
  const level = Number(lvArg);
  const t0 = Date.now();
  const cs = new CircuitShapes(family as TileFamilyId, [...rule].map(Number), [...combo].map((ch) => parseInt(ch, 36)), level, Number(keepArg ?? 50));
  const here = cs.born.filter((b) => b.level === level && b.type === type).sort((a, b) => b.length - a.length);
  const lengths = [...new Set(here.map((b) => b.length))].slice(0, 4);
  const picks = lengths.map((l) => here.find((b) => b.length === l)!);
  const stop = stopArg ? Number(stopArg) : Math.max(0, level - 5);
  const shapes = picks.map((b) => ({ length: b.length, pts: cs.shape(b, stop).map((p) => [p.x, p.y]) }));
  writeFileSync(outFile, JSON.stringify({ family, rule, combo, level, type, stop, shapes, counts: lengths.map((l) => here.filter((b) => b.length === l).length) }));
  console.log(`${combo} L${level} ${type}: born lengths ${lengths.join(' ')} (x${lengths.map((l) => here.filter((b) => b.length === l).length).join(' x')}), drawn to level ${stop}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
