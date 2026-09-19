/**
 * `MachinePage` — walk a strand by hand, one tile at a time.
 *
 * Every other page shows you a finished tiling and lets you look at the strands
 * in it. This one runs the question the other way round: given the tile you are
 * standing on and the seam you are leaving by, what may come next? Pick one, and
 * pick again, and watch the walk either close into a circuit or run away.
 *
 * The point is the distinction between three nested relations (see
 * `core/automaton.ts`):
 *
 *   PERMITTED  two slots may join when their labels are compatible. Pure algebra,
 *              no tiling input, a strict superset of what happens.
 *   ADMISSIBLE a permitted step that does not pile more than 360 degrees onto any
 *              vertex, and does not overlap the walk. Exact: spectre corners are
 *              whole multiples of 30 degrees.
 *   OBSERVED   the joins actually measured in a patch.
 *
 * A bound proved over PERMITTED needs no atlas, so it is worth far more than the
 * same bound checked over OBSERVED. Switch the relation toggle and the gap
 * between them becomes something you can walk through: under selection `15` with
 * Pi flipped, the permitted relation closes a circuit of length 12 that the
 * tiling itself never builds.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EdgeSubsetPicker } from '../components';
import {
  ANGLE_FULL_TURN,
  chordPairing,
  leafOrder,
  options as automatonOptions,
  permittedJoins,
  slotMidpoint2,
  slotsOfType,
  startWalk,
  step as automatonStep,
  subsetToString,
  undo as automatonUndo,
  zApply,
  zLeafPts,
  zToPt,
  type Option,
  type Placed,
  type TileFamilyId,
  type TileTypeId,
  type WalkState,
} from '../core';
import { tileColor } from '../lib/palette';
import {
  choiceOf,
  choosableTypes,
  defaultMatching,
  joinKey,
  keyForType,
  observedJoins,
  withChoice,
} from './machine/model';
import '../styles/machine.css';

type Relation = 'permitted' | 'observed';

const FAMILY: TileFamilyId = 'spectre';
const OBSERVED_LEVEL = 4;

export function MachinePage(): JSX.Element {
  const [subset, setSubset] = useState<readonly number[]>([1, 5]);
  const [matching, setMatching] = useState<Record<string, number>>(() =>
    defaultMatching(FAMILY, [1, 5]),
  );
  const [relation, setRelation] = useState<Relation>('permitted');
  const [walk, setWalk] = useState<WalkState | null>(null);
  const [closedAt, setClosedAt] = useState<number | null>(null);

  const observed = useMemo(() => observedJoins(FAMILY, subset, OBSERVED_LEVEL), [subset]);
  const permitted = useMemo(() => permittedJoins(FAMILY, subset), [subset]);
  const choosers = useMemo(() => choosableTypes(FAMILY, subset), [subset]);

  /** Types that carry a chord, so are worth starting from. */
  const startable = useMemo(
    () =>
      leafOrder(FAMILY).filter(
        (t) => chordPairing(FAMILY, t, subset, matching[t] ?? 0).some((x) => x >= 0),
      ),
    [subset, matching],
  );

  const reset = useCallback(() => {
    setWalk(null);
    setClosedAt(null);
  }, []);

  const changeSubset = useCallback((next: readonly number[]) => {
    setSubset(next);
    setMatching(defaultMatching(FAMILY, next));
    setWalk(null);
    setClosedAt(null);
  }, []);

  const begin = useCallback(
    (type: TileTypeId, seam: number) => {
      setWalk(startWalk(FAMILY, subset, matching, type, seam));
      setClosedAt(null);
    },
    [subset, matching],
  );

  // Every permitted next step, annotated with whether it has ever been observed.
  const allOptions = useMemo(() => {
    if (!walk || closedAt !== null) return [];
    const last = walk.tiles[walk.tiles.length - 1];
    const exit = last ? slotsOfType(FAMILY, last.type, subset)[last.outSeam] : undefined;
    return automatonOptions(walk).map((o) => ({
      option: o,
      seen: exit ? observed.pairs.has(joinKey(exit, o.slot)) : false,
    }));
  }, [walk, closedAt, subset, observed]);

  const shown = useMemo(
    () => (relation === 'observed' ? allOptions.filter((o) => o.seen) : allOptions),
    [allOptions, relation],
  );

  const take = useCallback(
    (o: Option) => {
      if (!walk || !o.admissible) return;
      if (o.closes) {
        setClosedAt(walk.tiles.length);
        return;
      }
      setWalk(automatonStep(walk, o));
    },
    [walk],
  );

  // --- keyboard ------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      const k = e.key.toLowerCase();

      if (k === 'escape') {
        reset();
        e.preventDefault();
        return;
      }
      if (k === 'backspace') {
        if (closedAt !== null) setClosedAt(null);
        else if (walk) setWalk(walk.tiles.length > 1 ? automatonUndo(walk) : null);
        e.preventDefault();
        return;
      }
      if (!walk) {
        const type = startable.find((t) => keyForType(t) === k);
        if (type) {
          const pairing = chordPairing(FAMILY, type, subset, matching[type] ?? 0);
          const seam = pairing.findIndex((x) => x >= 0);
          if (seam >= 0) begin(type, seam);
          e.preventDefault();
        }
        return;
      }
      if (/^[1-9]$/.test(k)) {
        const pick = shown[Number(k) - 1];
        if (pick?.option.admissible) take(pick.option);
        e.preventDefault();
        return;
      }
      // a letter cycles through the options of that tile type
      const matches = shown.filter((o) => keyForType(o.option.slot.type) === k);
      if (matches.length > 0) {
        const usable = matches.filter((m) => m.option.admissible);
        if (usable.length > 0) take(usable[0].option);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [walk, shown, startable, subset, matching, begin, take, reset, closedAt]);

  // --- geometry for drawing ------------------------------------------------
  const scene = useMemo(() => {
    if (!walk) return null;
    const placedPolys = walk.tiles.map((p) => ({
      tile: p,
      pts: zLeafPts(FAMILY, p.type).map((v) => zToPt(zApply(p.xform, v))),
    }));
    const ghostPolys = shown.map((o) => ({
      option: o.option,
      seen: o.seen,
      pts: zLeafPts(FAMILY, o.option.slot.type).map((v) => zToPt(zApply(o.option.xform, v))),
    }));
    const strand: { x: number; y: number }[] = [];
    for (const p of walk.tiles) {
      for (const seam of [p.inSeam, p.outSeam]) {
        if (seam < 0) continue;
        const m = zToPt(slotMidpoint2(FAMILY, subset, p, seam));
        strand.push({ x: m.x / 2, y: m.y / 2 });
      }
    }
    // A closed walk ends where it began, so join the loop up for drawing.
    if (closedAt !== null && strand.length > 0) strand.push({ ...strand[0] });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const poly of [...placedPolys, ...ghostPolys]) {
      for (const p of poly.pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const pad = 0.8;
    return {
      placedPolys,
      ghostPolys,
      strand,
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`,
    };
  }, [walk, shown, subset, closedAt]);

  const worstAngle = useMemo(() => {
    if (!walk) return 0;
    let worst = 0;
    for (const v of walk.angles.values()) worst = Math.max(worst, v);
    return worst;
  }, [walk]);

  const permittedCount = useMemo(() => {
    let n = 0;
    for (const l of permitted.values()) n += l.length;
    return n;
  }, [permitted]);

  return (
    <div className="machine">
      <header className="machine__intro">
        <h1>Strand machine</h1>
        <p>
          Pick a tile to stand on, then walk the strand one tile at a time. At each step you see
          every join the <strong>labels permit</strong>, which is a strict superset of the joins the
          tiling actually uses — and the exact 30-degree angle count that rules some of them out.
        </p>
      </header>

      <section className="machine__controls">
        <EdgeSubsetPicker family={FAMILY} subset={subset} onSubsetChange={changeSubset} />

        {choosers.length > 0 && (
          <div className="machine__chooser">
            <span className="machine__label">Chords</span>
            {choosers.map(({ type, options: n }) => (
              <label key={type} className="machine__choice">
                {type}
                <select
                  value={choiceOf(FAMILY, subset, matching, type)}
                  onChange={(e) => {
                    setMatching(withChoice(FAMILY, subset, matching, type, Number(e.target.value)));
                    reset();
                  }}
                >
                  {Array.from({ length: n }, (_, i) => (
                    <option key={i} value={i}>
                      option {i}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        <div className="machine__relation">
          <span className="machine__label">Offer</span>
          {(['permitted', 'observed'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={relation === r ? 'is-active' : undefined}
              onClick={() => setRelation(r)}
            >
              {r === 'permitted' ? 'every permitted join' : `only joins seen in a patch`}
            </button>
          ))}
          <span className="machine__hint">
            selection {subsetToString(subset.reduce((m, e) => m | (1 << e), 0))} has{' '}
            {permittedCount} permitted joins; {observed.pairs.size / 2} distinct ones occur in a
            level-{observed.level} patch of {observed.tiles.toLocaleString('en-US')} tiles
          </span>
        </div>
      </section>

      {!walk && (
        <section className="machine__start">
          <h2>Start on a tile</h2>
          <div className="machine__tiles">
            {startable.map((type) => {
              const pairing = chordPairing(FAMILY, type, subset, matching[type] ?? 0);
              const seams = slotsOfType(FAMILY, type, subset);
              return pairing.map((to, seam) =>
                to < 0 ? null : (
                  <button
                    key={`${type}-${seam}`}
                    type="button"
                    className="machine__tile"
                    style={{ borderColor: tileColor(type) }}
                    onClick={() => begin(type, seam)}
                  >
                    <span className="machine__key">{keyForType(type)}</span>
                    <span className="machine__tilename">{type}</span>
                    <span className="machine__seam">
                      in {seams[seam]?.id.split(' ')[1]} → out {seams[to]?.id.split(' ')[1]}
                    </span>
                  </button>
                ),
              );
            })}
          </div>
          {startable.length === 0 && (
            <p>No tile carries a chord under this selection, so there is nothing to walk.</p>
          )}
        </section>
      )}

      {walk && scene && (
        <section className="machine__board">
          <svg className="machine__svg" viewBox={scene.viewBox} role="img" aria-label="strand walk">
            {scene.ghostPolys.map((g, i) => (
              <polygon
                key={`ghost-${i}`}
                className={`machine__ghost${g.option.admissible ? '' : ' is-blocked'}${g.seen ? ' is-seen' : ''}`}
                points={g.pts.map((p) => `${p.x},${p.y}`).join(' ')}
                onClick={() => take(g.option)}
              />
            ))}
            {scene.placedPolys.map((p, i) => (
              <polygon
                key={`tile-${i}`}
                className="machine__placed"
                points={p.pts.map((q) => `${q.x},${q.y}`).join(' ')}
                style={{ fill: tileColor(p.tile.type) }}
              />
            ))}
            <polyline
              className="machine__strand"
              points={scene.strand.map((p) => `${p.x},${p.y}`).join(' ')}
            />
            {scene.ghostPolys.map((g, i) => {
              const c = g.pts.reduce(
                (acc, p) => ({ x: acc.x + p.x / g.pts.length, y: acc.y + p.y / g.pts.length }),
                { x: 0, y: 0 },
              );
              return (
                <text key={`gk-${i}`} className="machine__ghostkey" x={c.x} y={c.y}>
                  {i < 9 ? i + 1 : keyForType(g.option.slot.type)}
                </text>
              );
            })}
          </svg>

          <aside className="machine__panel">
            <div className="machine__status">
              {closedAt !== null ? (
                <p className="machine__closed">
                  Closed after <strong>{closedAt}</strong> tiles. That is a circuit of length{' '}
                  {closedAt}.
                </p>
              ) : (
                <p>
                  {walk.tiles.length} tile{walk.tiles.length === 1 ? '' : 's'} placed. Worst vertex
                  carries {worstAngle * 30}° of {ANGLE_FULL_TURN * 30}°.
                </p>
              )}
              <div className="machine__buttons">
                <button type="button" onClick={() => setWalk(automatonUndo(walk))}>
                  Undo <kbd>⌫</kbd>
                </button>
                <button type="button" onClick={reset}>
                  Restart <kbd>esc</kbd>
                </button>
              </div>
            </div>

            {closedAt === null && (
              <ol className="machine__options">
                {shown.map((o, i) => (
                  <li
                    key={o.option.slot.id + i}
                    className={o.option.admissible ? undefined : 'is-blocked'}
                  >
                    <button type="button" onClick={() => take(o.option)} disabled={!o.option.admissible}>
                      <kbd>{i < 9 ? i + 1 : keyForType(o.option.slot.type)}</kbd>
                      <span className="machine__optname">{o.option.slot.id}</span>
                      {o.option.closes && <span className="machine__tag is-close">closes</span>}
                      {!o.seen && <span className="machine__tag is-unseen">never observed</span>}
                      {o.option.reason === 'angle' && (
                        <span className="machine__tag is-bad">
                          {o.option.worstAngle * 30}° at a vertex
                        </span>
                      )}
                      {o.option.reason === 'overlap' && (
                        <span className="machine__tag is-bad">overlaps</span>
                      )}
                    </button>
                  </li>
                ))}
                {shown.length === 0 && (
                  <li className="machine__deadend">
                    Dead end: no {relation === 'observed' ? 'observed' : 'permitted'} join continues
                    this walk.
                  </li>
                )}
              </ol>
            )}
          </aside>
        </section>
      )}
    </div>
  );
}

export default MachinePage;

/** Exported for the tests: the tiles a walk visits, without repeat visits. */
export function visitedTypes(tiles: readonly Placed[]): readonly TileTypeId[] {
  return tiles.map((t) => t.type);
}
