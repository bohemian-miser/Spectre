/**
 * The Corners page's data: for each class of a rule (from the circuit atlas),
 * the biggest circuit of each family at each of its last few generations, as
 * tile positions sampled evenly by tile count.
 *
 * A circuit of L tiles is sampled at tiles round(j L / N), j = 0..N-1, with
 * N = 4320 (or every tile when L is smaller). 4320 = 2^5 3^3 5 divides by 2,
 * 3, 4, 5, 6, 8, 9, 10 and 12, so turning the loop by 1/m of its tiles is a
 * whole number of samples for those m. A tile's position is the midpoint of
 * the strand's chord through it, and the loop runs anticlockwise
 * (`chord-fit.ts`). Positions are stored as little-endian Int16 over the
 * bounding square, base64.
 *
 * Usage:
 *   tsx corner-paths.ts <family> <rule> <maxLevel> <outDir> [combo,...]
 *     writes <outDir>/<combo>.json for each class (all of them by default)
 *   tsx corner-paths.ts index <family> <rule> <outDir>
 *     writes <outDir>/index.json from the class files
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TileFamilyId } from '../src/core';
import { CircuitShapes, familyCircuits, mergeTwins, tileLoop } from '../src/pages/shapes/circuitShapes';

export const SAMPLES = 4320;
const MIN_LENGTH = 400;
const FAMILIES = 4;
const GENERATIONS = 3;

interface AtlasClassLite {
  readonly representative: string;
  readonly members: readonly string[];
  readonly pattern: string;
  readonly kind: string;
}

export interface CornerCircuit {
  readonly family: string;
  /** Other families whose biggest circuit at this level is the same shape. */
  readonly aliases: readonly string[];
  readonly level: number;
  readonly type: string;
  readonly length: number;
  /** Radius of gyration over every tile. */
  readonly rg: number;
  readonly samples: number;
  /** x0, y0, side of the bounding square. */
  readonly box: readonly [number, number, number];
  readonly pts: string;
  /** The tile it enters first: slots from its supertile down (type, slot), and its chord across that tile (x0, y0, x1, y1) in the supertile's frame. */
  readonly first: { readonly path: readonly (readonly [string, number])[]; readonly chord: readonly number[] };
}

function encode(xy: Float64Array, n: number): { box: [number, number, number]; pts: string } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    x0 = Math.min(x0, xy[2 * i]);
    x1 = Math.max(x1, xy[2 * i]);
    y0 = Math.min(y0, xy[2 * i + 1]);
    y1 = Math.max(y1, xy[2 * i + 1]);
  }
  const side = Math.max(x1 - x0, y1 - y0, 1e-9);
  const q = new Int16Array(2 * n);
  for (let i = 0; i < n; i++) {
    q[2 * i] = Math.round(((xy[2 * i] - x0) / side) * 65535) - 32768;
    q[2 * i + 1] = Math.round(((xy[2 * i + 1] - y0) / side) * 65535) - 32768;
  }
  return { box: [x0, y0, side], pts: Buffer.from(q.buffer).toString('base64') };
}

function classCircuits(family: TileFamilyId, subset: readonly number[], combo: string, maxLevel: number): CornerCircuit[] {
  const cs = new CircuitShapes(family, subset, [...combo].map((ch) => parseInt(ch, 36)), maxLevel, MIN_LENGTH);
  const all = familyCircuits(cs, FAMILIES, GENERATIONS).map((f) => {
    const loop = tileLoop(cs.shape(f.circuit, 0), SAMPLES);
    return { ...f, loop, rg: loop.rg };
  });
  return mergeTwins(all).map((f) => {
    const { path, chord } = cs.firstTile(f.circuit);
    const first = { path: path.map((p) => [p.type, p.pos] as [string, number]), chord: chord.flatMap((p) => [+p.x.toFixed(6), +p.y.toFixed(6)]) };
    return { family: f.family, aliases: f.aliases, level: f.level, type: f.type, length: f.length, rg: f.rg, samples: f.loop.n, ...encode(f.loop.xy, f.loop.n), first };
  });
}

if (process.argv[1]?.endsWith('corner-paths.ts')) {
  const args = process.argv.slice(2);
  if (args[0] === 'index') {
    const [, family, rule, outDir] = args;
    const atlas = JSON.parse(readFileSync(join(__dirname, `../public/data/circuit-atlas/${family}-${rule}.json`), 'utf8')) as { classes: AtlasClassLite[] };
    const classes = atlas.classes
      .filter((c) => existsSync(join(outDir, `${c.representative}.json`)))
      .map((c) => {
        const f = JSON.parse(readFileSync(join(outDir, `${c.representative}.json`), 'utf8')) as { circuits: CornerCircuit[]; maxLevel: number };
        return {
          combo: c.representative,
          pattern: c.pattern,
          kind: c.kind,
          members: c.members.length,
          maxLevel: f.maxLevel,
          circuits: f.circuits.map(({ pts: _pts, ...meta }) => meta),
        };
      });
    writeFileSync(join(outDir, 'index.json'), JSON.stringify({ family, rule, samples: SAMPLES, generated: new Date().toISOString().slice(0, 10), classes }));
    console.error(`wrote ${join(outDir, 'index.json')}: ${classes.length} classes`);
  } else {
    const [family, rule, maxArg, outDir, combos] = args;
    const fam = family as TileFamilyId;
    const subset = [...rule].map(Number);
    const maxLevel = Number(maxArg);
    mkdirSync(outDir, { recursive: true });
    const atlas = JSON.parse(readFileSync(join(__dirname, `../public/data/circuit-atlas/${family}-${rule}.json`), 'utf8')) as { classes: AtlasClassLite[] };
    const wanted = combos ? new Set(combos.split(',')) : null;
    for (const c of atlas.classes) {
      if (wanted && !wanted.has(c.representative)) continue;
      const file = join(outDir, `${c.representative}.json`);
      if (existsSync(file)) continue;
      const t0 = Date.now();
      const circuits = classCircuits(fam, subset, c.representative, maxLevel);
      writeFileSync(file, JSON.stringify({ family, rule, combo: c.representative, maxLevel, circuits }));
      console.error(`${c.representative}: ${circuits.length} circuits, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
}
