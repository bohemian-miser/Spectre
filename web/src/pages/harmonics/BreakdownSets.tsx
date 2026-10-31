/**
 * A circuit's breakdowns, or two circuits' compared (`breakdowns.ts`): per
 * level a chip per breakdown with the placements reading so, the two
 * circuits' rows side by side with how many placements of the higher read
 * as a breakdown of the lower, and one breakdown at a time drawn over its
 * supertiles, those where it differs from the level's commonest outlined.
 */
import { useEffect, useMemo, useState } from 'react';
import { tileColorHex } from '../../lib/palette';
import type { Box } from '../../lib/viewport';
import { Viewer, type Lines, type Mark } from '../buildup/Viewer';
import { fixedSource } from '../buildup/viewer';
import { readsAs, type BreakdownSummary, type LevelOverlap } from './breakdowns';
import type { BreakdownSets as Sets } from './breakdownStore';
import type { CircuitInfo, HarmonicsClient } from './harmonicsJob';
import type { Side } from './pairView';
import '../../styles/breakdowns.css';

const nf = (n: number) => n.toLocaleString('en-US');
const short = (c: CircuitInfo) => `${nf(c.length)} L${c.level}`;
const plural = (n: number, one: string, many = `${one}s`) => `${nf(n)} ${n === 1 ? one : many}`;

const closed = (xy: Float64Array): Float64Array => {
  const out = new Float64Array(xy.length + 2);
  out.set(xy);
  out[xy.length] = xy[0];
  out[xy.length + 1] = xy[1];
  return out;
};

/** The breakdown stepped to: which circuit (0 the lower), its level, and the breakdown's place in the level's list. */
interface Pick {
  readonly j: number;
  readonly k: number;
  readonly index: number;
}

/** The level of a circuit with the most breakdowns, the highest of those. */
function firstPick(s: BreakdownSummary, j: number): Pick {
  const most = s.levels.reduce((best, l) => (l.items.length >= best.items.length ? l : best), s.levels[0]);
  return { j, k: most.level, index: 0 };
}

export function BreakdownSets(props: { client: HarmonicsClient; level: number; circuits: readonly CircuitInfo[]; focus: number; partner: number | null }): JSX.Element | null {
  const { client, circuits, focus, partner } = props;
  /** The circuits shown, the lower first. */
  const shown = useMemo(() => {
    if (partner === null || partner === focus) return [focus];
    const [x, y] = [focus, partner];
    return circuits[x].level < circuits[y].level || (circuits[x].level === circuits[y].level && circuits[x].length <= circuits[y].length) ? [x, y] : [y, x];
  }, [focus, partner, circuits]);
  const key = `${props.level}: ${shown.join(' ')}`;
  const [sets, setSets] = useState<{ key: string; sets: Sets } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [side, setSide] = useState<{ key: string; side: Side } | null>(null);

  useEffect(() => {
    let on = true;
    setError(null);
    setPick(null);
    client
      .breakdowns(shown)
      .then((s) => {
        if (!on) return;
        setSets({ key, sets: s });
        const j = shown.indexOf(focus);
        setPick(firstPick(s.sets[j], j));
      })
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);

  const current = sets?.key === key ? sets.sets : null;
  const pickKey = pick && current ? `${key} ${pick.j} ${pick.k} ${pick.index}` : null;
  useEffect(() => {
    if (!pick || !pickKey) return;
    let on = true;
    client
      .breakdownPicture(shown[pick.j], pick.k, pick.index)
      .then((s) => on && setSide({ key: pickKey, side: s }))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, pickKey]);

  if (error) return <p className="shapes-note">Could not read the placements: {error}</p>;
  if (!current) return <p className="shapes-note">Reading every placement…</p>;
  const [a, b] = current.sets;
  const names = shown.map((m) => short(circuits[m]));
  const offset = b ? b.level - a.level : 0;
  const overlapAt = new Map<number, LevelOverlap>((current.overlap ?? []).map((o) => [o.level, o]));
  const steppedLevel = pick ? current.sets[pick.j].levels[pick.k] : null;
  const stepped = pick && steppedLevel ? steppedLevel.items[pick.index] : null;
  const step = (d: number) => pick && steppedLevel && setPick({ ...pick, index: (pick.index + d + steppedLevel.items.length) % steppedLevel.items.length });

  const chips = (s: BreakdownSummary, j: number, k: number, shared: readonly boolean[] | null) => {
    const l = s.levels[k];
    if (!l || l.read === 0) return <span className="bd-none">not read</span>;
    return (
      <span className="bd-chips">
        {l.items.map((x, i) => (
          <button
            key={i}
            type="button"
            className={`bd-chip${shared && !shared[i] ? ' is-alone' : ''}${pick && pick.j === j && pick.k === k && pick.index === i ? ' is-picked' : ''}`}
            onClick={() => setPick({ j, k, index: i })}
            title={`${plural(x.count, 'placement')} in ${plural(x.families, 'family', 'families')}; ${plural(x.size, 'supertile')} in the reading${shared ? (shared[i] ? '; the other circuit has it too' : '; only this circuit has it') : ''}`}
            data-testid="bd-chip"
          >
            {nf(x.count)}
          </button>
        ))}
        {l.read < s.placements ? <span className="bd-none"> {nf(s.placements - l.read)} too long to read</span> : null}
      </span>
    );
  };

  const placed = (s: BreakdownSummary, name: string) =>
    `The ${name} closes in ${plural(s.placements, 'placement')} at level ${s.level}, in ${plural(s.families, 'family', 'families')}` +
    (s.later ? `, and ${nf(s.later)} more times across the seams of supertiles above.` : '.');

  return (
    <div className="bd" data-testid="bd">
      <h3>Placements</h3>
      <p className="shapes-note">
        {placed(a, names[0])} {b ? placed(b, names[1]) : null} Read at a level, placements can run through different supertiles; each chip is one breakdown, a
        reading up to rotation and reversal, with the number of placements that read so.{b ? ` Level k of the ${names[0]} is set against level k + ${offset} of the ${names[1]}; a dashed chip is a breakdown only one of the two has.` : ''}
      </p>
      <table className="bd-table" data-testid="bd-table">
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">{names[0]}</th>
            {b ? <th scope="col">{names[1]}</th> : null}
            {b ? <th scope="col" /> : null}
          </tr>
        </thead>
        <tbody>
          {a.levels.map((l) => {
            const o = overlapAt.get(l.level);
            return (
              <tr key={l.level}>
                <th scope="row">{b ? `${l.level} · ${l.level + offset}` : l.level}</th>
                <td>{chips(a, 0, l.level, o ? o.inB : null)}</td>
                {b ? <td>{chips(b, 1, l.level + offset, o ? o.inA : null)}</td> : null}
                {b ? <td className="bd-score">{o ? readsAs(o, names[0], names[1]) : null}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {pick && stepped && steppedLevel ? (
        <div className="bd-step">
          <div className="bd-step-bar">
            <button type="button" onClick={() => step(-1)} disabled={steppedLevel.items.length < 2} aria-label="Previous breakdown" data-testid="bd-prev">
              ‹
            </button>
            <button type="button" onClick={() => step(1)} disabled={steppedLevel.items.length < 2} aria-label="Next breakdown" data-testid="bd-next">
              ›
            </button>
            <span data-testid="bd-step">
              {names[pick.j]} at level {pick.k}: breakdown {pick.index + 1} of {steppedLevel.items.length}, {plural(stepped.count, 'placement')}, {plural(stepped.size, 'supertile')} in its reading.
              {pick.index > 0 ? ' Outlined: supertiles holding visits the commonest breakdown lacks.' : steppedLevel.items.length > 1 ? ' The commonest.' : ''}
            </span>
          </div>
          {side?.key === pickKey ? <Picture side={side.side} fitKey={pickKey!} label={`One placement of the ${names[pick.j]} over its level-${pick.k} supertiles`} /> : <p className="shapes-note">Drawing…</p>}
        </div>
      ) : null}
    </div>
  );
}

/** One placement over its supertiles at a level, those marked outlined. */
function Picture(props: { side: Side; fitKey: string; label: string }): JSX.Element {
  const { side } = props;
  const frame = useMemo((): Box => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const all = side.supertiles.length ? side.supertiles.map((s) => s.outline) : [side.circuit];
    for (const xy of all)
      for (let i = 0; i + 1 < xy.length; i += 2) {
        x0 = Math.min(x0, xy[i]);
        x1 = Math.max(x1, xy[i]);
        y0 = Math.min(y0, xy[i + 1]);
        y1 = Math.max(y1, xy[i + 1]);
      }
    return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
  }, [side]);
  const lines: Lines = useMemo(
    () => ({ key: props.fitKey, count: 1, points: () => fixedSource(closed(side.circuit)), style: () => 0, styles: [{ color: '--text', width: 1.1, alpha: 0.85 }], stop: () => 0 }),
    [side, props.fitKey],
  );
  const marks = useMemo(() => {
    const out: Mark[] = side.supertiles.map((s) => ({ pts: closed(s.outline), color: tileColorHex(s.type), width: 0.7, fill: `${tileColorHex(s.type)}52` }));
    for (const s of side.supertiles) if (s.unshared) out.push({ pts: closed(s.outline), color: '#eb6834', width: 2.6 });
    return () => out;
  }, [side]);
  return <Viewer frame={frame} fitKey={props.fitKey} lines={lines} marks={marks} label={props.label} className="bd-view" />;
}
