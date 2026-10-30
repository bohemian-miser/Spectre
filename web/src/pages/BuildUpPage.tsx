/**
 * Build-up: the supertiles of a combination built level by level. Each
 * level shows every supertile type's border table (which crossing a strand
 * entering at each crossing leaves by, and through how many tiles), types
 * with identical tables drawn once, and the circuits that close at that
 * level, new ones marked. Tables and circuits come from the renormalisation
 * (`shapes/circuitShapes.ts`), read by `buildup/buildup.ts`.
 *
 * The tables can also be read as the level's common table plus each type's
 * own entries; a route picked on a table is taken apart into its child arcs
 * (`buildup/routes.ts`); a type's routes are compared level by level by
 * composition; and a circuit picked shows the routes it uses at every level
 * below its own (`buildup/circuitRoutes.ts`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { tileColor } from '../lib/palette';
import type { HexType, TileTypeId } from '../core';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { explorerCircuitHref } from './shapes/explorerLink';
import { closingsByLevel, groupsAt, tablesAt, type Closing } from './buildup/buildup';
import { CircuitRoutes } from './buildup/CircuitRoutes';
import { circuitUse, type LevelUse } from './buildup/circuitRoutes';
import { CommonOwn } from './buildup/CommonOwn';
import { LevelByLevel } from './buildup/LevelByLevel';
import { RouteBreakdown, type Pick } from './buildup/RouteBreakdown';
import { TableFigure, bounds } from './buildup/TableFigure';
import '../styles/shapes.css';
import '../styles/buildup.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 6 };
/** Most points a circuit is drawn with; longer circuits are drawn through evenly spaced tiles. */
const MAX_POINTS = 4000;

/** A circuit's passes over a group's routes at a level, by lower place. */
function usesOf(use: LevelUse | undefined, types: readonly HexType[]): Map<number, number> | null {
  if (!use) return null;
  const out = new Map<number, number>();
  for (const t of types) for (const [k, p] of use.byType.get(t) ?? []) out.set(k, (out.get(k) ?? 0) + p);
  return out;
}

function CircuitCard(props: { cs: CircuitShapes; c: Closing; level: number; href: string; selected: boolean; onSelect: () => void }): JSX.Element {
  const { cs, c } = props;
  const d = useMemo(() => {
    const pts = cs.sampled(c.circuit, MAX_POINTS);
    const [minX, maxX] = bounds(pts.map((p) => p.x)), [minY, maxY] = bounds(pts.map((p) => p.y));
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${((p.x - minX) / span * 100).toFixed(2)} ${((maxY - p.y) / span * 100).toFixed(2)}`).join('') + 'Z';
    return { path, w: (maxX - minX) / span * 100, h: (maxY - minY) / span * 100 };
  }, [cs, c]);
  const isNew = c.first === props.level;
  return (
    <figure className={`bu-circuit${isNew ? ' is-new' : ''}${props.selected ? ' is-selected' : ''}`} data-testid="bu-circuit">
      <svg viewBox={`-4 -4 ${d.w + 8} ${d.h + 8}`} role="img" aria-label={`Circuit of ${c.length} tiles`}>
        <path d={d.path} className="bu-outline" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>
        <strong>{nf(c.length)} tiles</strong>
        <span>{isNew ? 'new at this level' : `also at level ${c.first}`}</span>
        <span>in a {c.circuit.type}, through children {c.family}</span>
        <a href={props.href}>Open in the Explorer</a>
        {props.level > 0 && (
          <button type="button" aria-pressed={props.selected} onClick={props.onSelect} data-testid="bu-circuit-select">
            {props.selected ? 'Hide its routes' : 'Show its routes'}
          </button>
        )}
      </figcaption>
    </figure>
  );
}

export default function BuildUpPage(): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [choice, setChoice] = useState<ComboChoice>(DEFAULT);
  const cs = useRef<CircuitShapes | null>(null);
  const [built, setBuilt] = useState(0);
  const [level, setLevel] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'type' | 'common'>('type');
  const [pick, setPick] = useState<Pick | null>(null);
  const [lblType, setLblType] = useState<HexType>('Delta');
  const [selected, setSelected] = useState<Closing | null>(null);

  // builds a level at a time, each in its own task so the page can draw between them
  const buildTo = (target: number, fresh?: ComboChoice): void => {
    setBusy(true);
    setError(null);
    const step = (): void => {
      try {
        const now = cs.current;
        if (!now) return;
        if (now.maxLevel >= target) { setBuilt(now.maxLevel); setBusy(false); return; }
        now.extend(now.maxLevel + 1);
        setBuilt(now.maxLevel);
        setTimeout(step, 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    };
    if (fresh) {
      setTimeout(() => {
        try {
          cs.current = new CircuitShapes('hex', fresh.subset, [...fresh.combo].map((ch) => parseInt(ch, 36)), 1, 1, true);
          setChoice(fresh);
          setPick(null);
          setSelected(null);
          setBuilt(1);
          setLevel(1);
          step();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setBusy(false);
        }
      }, 0);
    } else setTimeout(step, 0);
  };
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    buildTo(DEFAULT.level, DEFAULT);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tables = useMemo(() => (cs.current && level <= built ? tablesAt(cs.current, level) : null), [built, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const closings = useMemo(() => (cs.current ? closingsByLevel(cs.current) : []), [built]); // eslint-disable-line react-hooks/exhaustive-deps
  const [logMin, logMax] = tables ? bounds(tables.tables.flatMap((t) => t.routes.map((r) => Math.log(r[2])))) : [0, 0];
  const shade = useMemo(() => (n: number) => (logMax > logMin ? 0.25 + 0.75 * (Math.log(n) - logMin) / (logMax - logMin) : 1), [logMin, logMax]);
  const picked = pick && pick.level === level ? pick : null;
  const use = useMemo(() => (selected && cs.current ? circuitUse(cs.current, selected.circuit) : null), [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const levelUse = use?.[level];
  const maxUse = levelUse ? Math.max(...[...levelUse.byType.values()].flatMap((m) => [...m.values()])) : 0;
  const groupUses = useMemo(() => (tables ? tables.groups.map((g) => usesOf(levelUse, g)) : []), [tables, levelUse]);
  const usesCaption = (u: Map<number, number> | null) => {
    if (!u) return null;
    let passes = 0;
    for (const p of u.values()) passes += p;
    return <span className="bu-uses"> · uses {nf(u.size)}, {nf(passes)} passes</span>;
  };
  const pickAt = (types: readonly HexType[], type: HexType, from: number) => setPick({ level, types, type, from });
  // a built level never changes, so each level's count is worked out once
  const counted = useRef<{ cs: CircuitShapes | null; counts: number[] }>({ cs: null, counts: [] });
  const groupCounts = useMemo(() => {
    const now = cs.current;
    if (!now) return [];
    if (counted.current.cs !== now) counted.current = { cs: now, counts: [] };
    const { counts } = counted.current;
    for (let k = counts.length; k <= built; k++) counts.push(groupsAt(now, k).length);
    return counts.slice(0, built + 1);
  }, [built]); // eslint-disable-line react-hooks/exhaustive-deps
  const here = closings[level] ?? [];

  const hrefOf = (c: Closing): string => {
    const first = cs.current!.firstTile(c.circuit);
    return explorerCircuitHref(base, {
      family: 'hex', subset: choice.subset, combo: choice.combo, type: c.circuit.type as TileTypeId, level: c.circuit.level,
      path: first.path, chord: first.chord,
    });
  };

  return (
    <div className="bu-page">
      <header className="bu-head">
        <h1>Build-up</h1>
        <p>
          Every supertile of a type is the same supertile, so a combination can be built one level at a time: each type's border table, which crossing a strand entering at each crossing leaves by and through how many tiles, is made from its children's tables, placed as the type lays them out. A strand that closes up inside, without reaching the border, is a circuit closing at that level.
        </p>
        <p className="bu-muted">Types whose tables are identical are drawn once with all their names: from outside they behave the same, though they are built differently inside.</p>
      </header>

      <ComboPicker busy={busy} onAdd={(c) => buildTo(c.level, c)} levels="any" verb="Build" initialLevel={DEFAULT.level} initialCombo={DEFAULT.combo} />
      {error && <p className="bu-error">{error}</p>}

      <div className="bu-levels" role="group" aria-label="Level" data-testid="bu-levels">
        {Array.from({ length: built + 1 }, (_, k) => (
          <button key={k} type="button" aria-pressed={k === level} className={k === level ? 'is-active' : ''} onClick={() => setLevel(k)} data-testid={`bu-level-${k}`}>
            {k === 0 ? 'Tiles' : `Level ${k}`}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => { buildTo(built + 1); setLevel(built + 1); }} data-testid="bu-next">
          {busy ? `Building level ${built + 1}…` : `Build level ${built + 1}`}
        </button>
        <span className="bu-muted">{choice.subset.join('')} · {choice.combo}</span>
      </div>

      {tables && cs.current && (
        <section className="bu-section">
          <div className="bu-section-head">
            <h2>Border tables at {level === 0 ? 'the tiles' : `level ${level}`}</h2>
            <div className="bu-toggle" role="group" aria-label="Tables shown" data-testid="bu-view">
              <button type="button" aria-pressed={view === 'type'} className={view === 'type' ? 'is-active' : ''} onClick={() => setView('type')}>By type</button>
              <button type="button" aria-pressed={view === 'common'} className={view === 'common' ? 'is-active' : ''} onClick={() => setView('common')}>Common + own</button>
            </div>
          </div>
          <p className="bu-muted" data-testid="bu-summary">
            {tables.groups.length} different tables among the {tables.tables.length} types.{' '}
            {view === 'type'
              ? 'Fainter routes pass fewer tiles; point at one to read it, pick one to take it apart.'
              : 'Each type is the common table with its own entries (highlighted) in place of the common ones, less the places it does not have (faint).'}
          </p>
          {view === 'type' ? (
            <div className="bu-tables">
              {tables.groups.map((g, gi) => {
                const t = tables.tables.find((x) => x.type === g[0])!;
                return (
                  <TableFigure
                    key={g.join()}
                    className={g.length > 1 ? 'is-shared' : undefined}
                    pts={t.pts}
                    dots={t.crossings}
                    routes={t.routes}
                    shade={shade}
                    uses={groupUses[gi]}
                    maxUse={maxUse}
                    picked={picked && g.includes(picked.type) ? picked.from : null}
                    onPick={level > 0 ? (from) => pickAt(g, g[0], from) : undefined}
                    label={`Border table of ${g.join(', ')}`}
                    head={<div className="bu-names">{g.map((n) => <span key={n} className="bu-name" style={{ background: tileColor(n) }}>{n}</span>)}</div>}
                    caption={<>{nf(t.crossings.length)} crossings, {nf(t.routes.length)} routes{usesCaption(groupUses[gi])}</>}
                  />
                );
              })}
            </div>
          ) : (
            <CommonOwn cs={cs.current} level={level} groups={tables.groups} shade={shade} picked={picked} onPick={pickAt} use={levelUse} maxUse={maxUse} />
          )}
          {selected && (
            <p className="bu-uses" data-testid="bu-uses-note">
              {levelUse
                ? `The ${nf(selected.length)}-tile circuit closing at level ${selected.circuit.level} uses ${nf(levelUse.routes)} routes here, ${nf(levelUse.passes)} passes; thicker for more.`
                : `The ${nf(selected.length)}-tile circuit closes at level ${selected.circuit.level}; its routes show at the levels below.`}
              {' '}<button type="button" className="bu-clear" onClick={() => setSelected(null)}>Clear</button>
            </p>
          )}
          {picked && <RouteBreakdown key={`${picked.type} ${picked.level} ${picked.from}`} cs={cs.current} pick={picked} onType={(t) => setPick({ ...picked, type: t })} />}
        </section>
      )}

      <section className="bu-section">
        <h2>Circuits closing at {level === 0 ? 'the tiles' : `level ${level}`}</h2>
        {here.length === 0 ? (
          <p className="bu-muted">None: every strand reaches the border of its {level === 0 ? 'tile' : 'supertile'}.</p>
        ) : (
          <div className="bu-circuits">
            {cs.current && here.map((c) => (
              <CircuitCard key={c.key} cs={cs.current!} c={c} level={level} href={hrefOf(c)}
                selected={selected?.key === c.key && selected.circuit.level === level}
                onSelect={() => setSelected(selected?.key === c.key && selected.circuit.level === level ? null : c)} />
            ))}
          </div>
        )}
      </section>

      {cs.current && built >= 1 && (
        <section className="bu-section">
          <h2>{lblType} routes level by level</h2>
          <LevelByLevel cs={cs.current} built={built} type={lblType} onType={setLblType} onPick={(n, from) => { setLevel(n); setPick({ level: n, types: [lblType], type: lblType, from }); }} />
        </section>
      )}

      {selected && use && cs.current && (
        <section className="bu-section">
          <CircuitRoutes cs={cs.current} c={selected} use={use} closings={closings} />
        </section>
      )}

      <section className="bu-section">
        <h2>Every level so far</h2>
        <table className="bu-summary-table" data-testid="bu-every-level">
          <thead><tr><th>Level</th><th className="num">Different tables</th><th>New circuits (tiles)</th><th>Closing again</th></tr></thead>
          <tbody>
            {closings.map((cl, k) => (
              <tr key={k} className={k === level ? 'is-active' : ''} onClick={() => setLevel(k)}>
                <td>{k === 0 ? 'tiles' : k}</td>
                <td className="num">{groupCounts[k] ?? ''}</td>
                <td>{cl.filter((c) => c.first === k).map((c) => nf(c.length)).join(', ')}</td>
                <td>{cl.filter((c) => c.first < k).map((c) => nf(c.length)).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
