/**
 * Limit shape: a supertile's outline, scaled down level after level, from
 * the hexagons and from the Spectres, and the shape both settle on
 * (`core/limitShape.ts`, computed in `workers/limit.worker.ts`).
 */
import { useEffect, useMemo, useState } from 'react';
import { transPt, type Pt } from '../core/geom';
import { LIMIT_QUAD, limitFrame, tileAB } from '../core/limitShape';
import { usePrefersDark } from '../hooks/usePrefersDark';
import { compareStarts, computeLimit, unflat, type LimitData, type StartGaps } from './limit/compute';
import { Figure, type Mark } from './limit/Figure';
import { Morph } from './limit/Morph';
import type { LimitReply } from '../workers/limit.worker';
import '../styles/buildup.css';
import '../styles/limit.css';

const TOP = 6;
const nf = (n: number) => n.toLocaleString('en-US');
const fx = (n: number, d = 4) => n.toFixed(d);
const sci = (n: number) => {
  const [m, e] = n.toExponential(1).split('e');
  return `${m} × 10${e.replace('-', '⁻').replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)])}`;
};

function useLimitData(): { data: LimitData | null; starts: readonly StartGaps[] | null; progress: number; error: string | null } {
  const [state, setState] = useState<{ data: LimitData | null; starts: readonly StartGaps[] | null; progress: number; error: string | null }>({ data: null, starts: null, progress: -1, error: null });
  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../workers/limit.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    if (!worker) {
      const id = setTimeout(() => {
        try {
          const data = computeLimit(TOP);
          setState({ data, starts: compareStarts(data), progress: TOP, error: null });
        } catch (e) {
          setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
        }
      }, 0);
      return () => clearTimeout(id);
    }
    worker.onmessage = (e: MessageEvent<LimitReply>) => {
      const m = e.data;
      if ('level' in m) setState((s) => ({ ...s, progress: m.level }));
      else if ('data' in m) setState((s) => ({ ...s, data: m.data }));
      else if ('starts' in m) setState((s) => ({ ...s, starts: m.starts }));
      else setState((s) => ({ ...s, error: m.error }));
    };
    worker.postMessage({ top: TOP });
    return () => worker?.terminate();
  }, []);
  return state;
}

/** Where segments ab and cd cross. */
function crossing(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / (r.x * s.y - r.y * s.x);
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

const flat = (pts: readonly Pt[]) => Float64Array.from(pts.flatMap((p) => [p.x, p.y]));

export default function LimitPage(): JSX.Element {
  const dark = usePrefersDark();
  const { data, starts, progress, error } = useLimitData();

  return (
    <div className="bu-page lm-page">
      <header className="bu-head">
        <h1>Limit shape</h1>
        <p>
          Scale a supertile down by the growth of one level, λ = √(4+√15) ≈ 2.806, at every level, and its outline settles on one shape whether the levels are built from hexagons or from Spectres. Each outline here is laid over the same four key points, so the levels and the two starts can be put on top of each other.
        </p>
      </header>

      {error && <p className="bu-error">{error}</p>}
      {!data && !error && <p className="bu-muted" data-testid="lm-progress">Building the outlines: level {Math.max(0, progress + 1)} of {TOP}…</p>}

      {data && (
        <>
          <section className="bu-section" aria-labelledby="lm-morph-h">
            <h2 id="lm-morph-h">From the hexagons to the Spectres</h2>
            <p className="bu-muted">
              A level&rsquo;s outline built from hexagons turning into the same level built from Spectres. Every Spectre vertex on the outline moves from its home on the hexagon edge of the same seam, as in the Explorer&rsquo;s morph, to its place on the Spectre. Every type but Gamma has the same outline, because the outline only depends on which slots hold a Gamma; Gamma&rsquo;s lacks the child in slot 2. The dashed line is the level-{TOP} outline of Tile(1,b), described below.
            </p>
            <Morph data={data} dark={dark} />
          </section>

          <Levels data={data} dark={dark} />
          <KeyPoints />
          <Starts data={data} starts={starts} dark={dark} />
        </>
      )}
    </div>
  );
}

function Levels(props: { data: LimitData; dark: boolean }): JSX.Element {
  const { levels } = props.data;
  const ratio = (i: number, f: (l: (typeof levels)[number]) => number) => (i === 0 ? '' : fx(f(levels[i]) / f(levels[i - 1]), 3));
  const edges = (l: (typeof levels)[number]) => l.outlines.other.spectre.length / 2;
  const last = levels.length - 1;
  const growth = edges(levels[last]) / edges(levels[last - 1]);
  return (
    <section className="bu-section" aria-labelledby="lm-levels-h">
      <h2 id="lm-levels-h">Level by level</h2>
      <p className="bu-muted">
        The hexagon start in <span className="lm-key lm-key-hex">blue</span>, the Spectre start in <span className="lm-key lm-key-spectre">orange</span>.
      </p>
      <div className="lm-strip">
        {levels.map((l) => (
          <figure key={l.level}>
            <Figure
              layers={[
                { pts: l.outlines.other.hex, stroke: 'hex', width: 1.1 },
                { pts: l.outlines.other.spectre, stroke: 'spectre', width: 1.1 },
              ]}
              width={150}
              height={150}
              dark={props.dark}
              label={`Level ${l.level}, hexagon and Spectre starts`}
            />
            <figcaption>Level {l.level}</figcaption>
          </figure>
        ))}
      </div>
      <table className="bu-summary-table lm-table" data-testid="lm-levels-table">
        <thead>
          <tr>
            <th>Level</th>
            <th className="num">Edges</th>
            <th className="num">×</th>
            <th className="num">Edges, Gamma</th>
            <th className="num">Key points from the limit, hexagons</th>
            <th className="num">Spectres</th>
            <th className="num">×</th>
            <th className="num">Hexagon start to Spectre start</th>
            <th className="num">×</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l, i) => (
            <tr key={l.level}>
              <td>{l.level}</td>
              <td className="num">{nf(edges(l))}</td>
              <td className="num">{ratio(i, edges)}</td>
              <td className="num">{nf(l.outlines.Gamma.spectre.length / 2)}</td>
              <td className="num">{sci(l.quadGapHex)}</td>
              <td className="num">{sci(l.quadGapSpectre)}</td>
              <td className="num">{ratio(i, (x) => x.quadGapSpectre)}</td>
              <td className="num">{fx(l.gapHexSpectre)}</td>
              <td className="num">{ratio(i, (x) => x.gapHexSpectre)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bu-muted lm-notes">
        Distances are in the frame where the first key point is at 0 and the last at 1: for the key points, the farthest any of the four is from the limit&rsquo;s; for the outlines, the Hausdorff distance (the farthest a point of either is from the other). The key points close in by 4 − √15 ≈ {fx(4 - Math.sqrt(15), 3)} a level. The outlines close in by about 1/λ ≈ {fx(1 / props.data.inflation, 3)}: what is left is detail the size of one tile, and one tile is λ⁻ⁿ of a level-n supertile. The outline gains {fx(growth, 3)} times the edges from level {last - 1} to level {last}; at that rate the limit&rsquo;s outline is a fractal curve of dimension about log {fx(growth, 3)} / log λ ≈ {fx(Math.log(growth) / Math.log(props.data.inflation), 2)}.
      </p>
    </section>
  );
}

function KeyPoints(): JSX.Element {
  return (
    <section className="bu-section lm-prose" aria-labelledby="lm-keys-h">
      <h2 id="lm-keys-h">Key points</h2>
      <p>
        Where a supertile&rsquo;s eight children go depends only on its four key points (vertices 3, 5, 7 and 11 of the Spectre, 1, 2, 3 and 5 of the hexagon), and one level takes the key points of level n to those of level n + 1 by a linear map that is the same at every level. Up to a translation its eigenvalues are ±λ, ±1 and ±1/λ. The ±λ pair is the four points growing as one similar shape. None of the tiles here has any of the ±1 pair, so the rest shrinks against the whole by 1/λ² = 4 − √15 a level, and every start ends at the same four points:
      </p>
      <table className="bu-summary-table">
        <thead><tr><th>Key point</th><th className="num">x</th><th className="num">y</th></tr></thead>
        <tbody>
          {LIMIT_QUAD.map((p, k) => (
            <tr key={k}><td>{k}</td><td className="num">{fx(p.x + 0, 6)}</td><td className="num">{fx(p.y + 0, 6)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Starts(props: { data: LimitData; starts: readonly StartGaps[] | null; dark: boolean }): JSX.Element {
  const { data, starts, dark } = props;
  const top = data.levels.length - 1;
  const b = data.b;
  const figures = useMemo(() => {
    const over = (pts: Pt[]) => {
      const F = limitFrame([3, 5, 7, 11].map((i) => pts[i]));
      return pts.map((p) => transPt(F, p));
    };
    const spectre = over(tileAB({ x: 1, y: 0 }, { x: 1, y: 0 }));
    const tileB = over(tileAB({ x: 1, y: 0 }, b));
    const keys: Mark[] = LIMIT_QUAD.map((p) => ({ at: p }));
    return {
      spectre: flat(spectre),
      tileB: flat(tileB),
      keys,
      cross: { at: crossing(tileB[1], tileB[2], tileB[12], tileB[13]), ring: true } as Mark,
    };
  }, [b]);
  const whole = data.levels[top].outlines.other.selfSimilar;
  const slotMarks: Mark[] = data.children.map((c) => {
    const pts = unflat(c.pts);
    const m = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
    return { at: m, label: String(c.slot) };
  });
  const hexAt = starts?.find((s) => s.start === 'Hexagon');
  const spectreAt = starts?.find((s) => s.start === 'Spectre, Tile(1,1)');
  const probe = Math.min(4, top - 1);
  const nearest = hexAt ? hexAt.gaps.flatMap((g, n) => (starts!.every((s) => s.gaps[n] >= g) ? [n] : [])) : [];
  const angle = (Math.atan2(b.y, b.x) * 180) / Math.PI;

  return (
    <section className="bu-section lm-prose" aria-labelledby="lm-tile-h">
      <h2 id="lm-tile-h">A tile with the limit&rsquo;s key points</h2>
      <p>
        The Spectre is Tile(1,1) of the family Tile(a,b), in which the edges at multiples of 60° have length a and the rest length b; the hat is Tile(1,√3). Let a and b be complex, so each kind of edge also turns by a fixed angle. The substitution only turns, shifts and mirrors tiles, so the tiles still meet edge to edge. The key points of Tile(1,b) depend linearly on b, and one b puts them at the limit&rsquo;s: b = {fx(b.x, 4)} {b.y < 0 ? '−' : '+'} {fx(Math.abs(b.y), 4)}i, length {fx(Math.hypot(b.x, b.y), 4)} turned {fx(angle, 1)}°. Every level of Tile(1,b) is then a similar copy of the one before, key points and all. Its outline crosses itself, edge 1 over edge 12 (circled), so it is not a tile on its own:
      </p>
      <div className="lm-pair">
        <figure>
          <Figure layers={[{ pts: figures.spectre, stroke: 'spectre', fill: true, width: 1.6 }]} marks={figures.keys} width={260} height={220} dark={dark} label="The Spectre, Tile(1,1), on the limit's key points" />
          <figcaption>Tile(1,1), the Spectre</figcaption>
        </figure>
        <figure>
          <Figure layers={[{ pts: figures.tileB, stroke: 'selfSimilar', fill: true, width: 1.6 }]} marks={[...figures.keys, figures.cross]} width={260} height={220} dark={dark} label="Tile(1,b) on the limit's key points, crossing itself" testId="lm-tile-b" />
          <figcaption>Tile(1,b)</figcaption>
        </figure>
      </div>
      <p>
        Its level-{top} outline with its eight children, each the level-{top - 1} outline placed in its slot. Each child is the whole turned over and shrunk by λ; the child in slot 7 is a Gamma, the whole less its slot-2 piece. A tile with exactly this outline would be its own supertile, which makes it the limit: a tile whose outline is a fractal curve rather than a polygon.
      </p>
      <Figure
        layers={[
          ...data.children.map((c) => ({ pts: c.pts, stroke: c.gamma ? 'spectre' : 'selfSimilar', fill: true, width: 1 })),
          { pts: whole, stroke: 'text', width: 1.4 },
        ]}
        marks={slotMarks}
        width={520}
        height={420}
        dark={dark}
        label={`The level-${top} outline of Tile(1,b) and its eight children`}
        testId="lm-children"
      />
      <h3>Which start is nearest</h3>
      <p>
        Fixing the key points does not bring the outline in: each start&rsquo;s outline still carries detail one tile across. Every start measured against the level-{top} outline of Tile(1,b), level by level (the level-{top} outline is itself some way from the limit, about a third of level {top - 1}&rsquo;s distance):
      </p>
      {starts ? (
        <table className="bu-summary-table lm-table" data-testid="lm-starts-table">
          <thead>
            <tr>
              <th>Start</th>
              {starts[0].gaps.map((_, n) => <th key={n} className="num">Level {n}</th>)}
            </tr>
          </thead>
          <tbody>
            {starts.map((s) => (
              <tr key={s.start}>
                <td>{s.start}</td>
                {s.gaps.map((g, n) => <td key={n} className="num">{fx(g)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="bu-muted">Measuring each start…</p>
      )}
      {hexAt && spectreAt && (
        <p data-testid="lm-starts-summary">
          The hexagon start is the nearest of these at {nearest.length === hexAt.gaps.length ? 'every level' : `level${nearest.length === 1 ? '' : 's'} ${nearest.join(', ')}`}. At level {probe} the Spectre start is {fx(spectreAt.gaps[probe] / hexAt.gaps[probe], 2)} times as far as the hexagon start, so it trails it by about {fx(Math.log(spectreAt.gaps[probe] / hexAt.gaps[probe]) / Math.log(data.inflation), 2)} of a level.
        </p>
      )}
    </section>
  );
}
