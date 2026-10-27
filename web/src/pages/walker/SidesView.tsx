/**
 * The three sides of a closed walk: its word cut into thirds (`sideRuns`),
 * the runs where they disagree, and the corners. `sidesOf` computes them and
 * the board marks; `SidesView` writes them out, and reports which run is
 * hovered so the page can ring its tiles.
 */
import { letter, sideRuns, type Affine, type SideRun } from '../../core';
import type { BoardMark } from '../../components/HexBoard';
import { tileCentre } from '../../lib/hexBoard';

export interface Sides {
  readonly S: number;
  readonly word: readonly string[];
  /** Tile ids in walk order, starting where the word was cut. */
  readonly ids: readonly string[];
  readonly runs: readonly SideRun[];
  /** odd / match / corner, per tile id. */
  readonly kind: ReadonlyMap<string, string>;
  readonly joins: readonly string[];
}

/** `steps[i]` was walked on tile `ids[i]`; `xformOf` places a tile. */
export function sidesOf(steps: readonly { type: string; entry: number; exit: number }[], walkedIds: readonly string[], xformOf: (id: string) => Affine): Sides | null {
  const N = steps.length;
  if (N < 6 || N % 3 || walkedIds.length < N) return null;
  const S = N / 3;
  const letters = steps.map((s) => letter(s.type, s.entry, s.exit));
  const { runs, offset } = sideRuns(letters);
  const word = [...letters.slice(offset), ...letters.slice(0, offset)];
  const walked = walkedIds.slice(0, N);
  const ids = [...walked.slice(offset), ...walked.slice(0, offset)];
  const kind = new Map<string, string>();
  for (const r of runs) for (let i = r.from; i <= r.to; i++) for (let k = 0; k < 3; k++) kind.set(ids[i + k * S], k === r.odd || r.odd < 0 ? 'odd' : 'match');
  const pts = ids.map((id) => tileCentre(xformOf(id)));
  const c = pts.reduce((a, p) => ({ x: a.x + p.x / N, y: a.y + p.y / N }), { x: 0, y: 0 });
  const corners = [0, 1, 2].map((k) => {
    let b = k * S;
    for (let i = k * S; i < (k + 1) * S; i++) if (Math.hypot(pts[i].x - c.x, pts[i].y - c.y) > Math.hypot(pts[b].x - c.x, pts[b].y - c.y)) b = i;
    return b;
  });
  for (const i of corners) kind.set(ids[i], 'corner');
  const around = (i: number): string => Array.from({ length: 9 }, (_, d) => word[(i - 4 + d + N) % N]).join(' ');
  return { S, word, ids, runs, kind, joins: corners.map(around) };
}

/** Board marks for the sides, with the hovered run's tiles ringed. */
export function sideMarks(sides: Sides | null, hoverRun: number | null, xformOf: (id: string) => Affine): BoardMark[] {
  if (!sides) return [];
  const out: BoardMark[] = [...sides.kind].map(([id, kind]) => ({ xform: xformOf(id), kind, r: kind === 'corner' ? 1.1 : 0.4 }));
  if (hoverRun !== null && sides.runs[hoverRun]) {
    const r = sides.runs[hoverRun];
    for (let k = 0; k < 3; k++) for (const id of sides.ids.slice(r.from + k * sides.S, r.to + 1 + k * sides.S)) out.push({ xform: xformOf(id), kind: 'hover', r: 0.8 });
  }
  return out;
}

const spell = (w: string): string => `${w.slice(0, -2)} ${w.slice(-2, -1)}→${w.slice(-1)}`;

export function SidesView({ sides, length, onHoverRun }: { sides: Sides | null; length: number; onHoverRun: (i: number | null) => void }): JSX.Element {
  return (
    <section className="td__section" data-testid="wk-sides">
      <h2>Three sides</h2>
      {!sides ? (
        <p>{length} tiles is not a multiple of 3, so the circuit is not three copies of one side.</p>
      ) : (
        <>
          <p>
            Each tile written as its type and the edges in and out (<code>{spell(sides.word[0])}</code>), the circuit cut into
            three sides of {sides.S} and compared.{' '}
            {sides.runs.length === 0
              ? 'The three sides are the same.'
              : `They differ at ${sides.runs.reduce((s, r) => s + r.to - r.from + 1, 0)} positions, in ${sides.runs.length} ${sides.runs.length === 1 ? 'run' : 'runs'}: red dots on the odd side, amber on the matching tiles of the other two. Hover a run to ring its tiles.`}
          </p>
          {sides.runs.length > 0 && (
            <ul data-testid="wk-runs">
              {sides.runs.map((r, ri) => {
                const ref = (Math.max(0, r.odd) + 1) % 3;
                const block = (k: number): string => sides.word.slice(r.from + k * sides.S, r.to + 1 + k * sides.S).map(spell).join(', ');
                return (
                  <li key={r.from} className="wk__run" onMouseEnter={() => onHoverRun(ri)} onMouseLeave={() => onHoverRun(null)}>
                    Positions {r.from}–{r.to}: {r.odd < 0 ? 'all three sides differ' : `side ${r.odd + 1} ${r.reversed ? 'walks the block backwards' : 'differs'}`}:{' '}
                    <code>{block(ref)}</code>
                    {r.odd >= 0 && <> against <code>{block(r.odd)}</code></>}
                  </li>
                );
              })}
            </ul>
          )}
          <p>
            Corners (ringed): the tile of each side farthest from the circuit's centre. The nine tiles round each{' '}
            {new Set(sides.joins).size === 1 ? 'are the same' : 'differ'}:
          </p>
          <ul data-testid="wk-joins">{sides.joins.map((j, i) => <li key={i}><code>{j.split(' ').map(spell).join(', ')}</code></li>)}</ul>
        </>
      )}
    </section>
  );
}
