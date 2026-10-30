/**
 * A level's tables as one common table and, per group of types with
 * identical tables, only what is the group's own: its overrides, drawn
 * highlighted, and the places it does not have, drawn faint.
 */
import { useMemo } from 'react';
import type { HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import type { CircuitShapes } from '../shapes/circuitShapes';
import type { LevelUse } from './circuitRoutes';
import { commonTable, ownPart } from './routes';
import { TableFigure } from './TableFigure';

const nf = (n: number) => n.toLocaleString('en-US');
const NONE = new Int32Array(0);

export function CommonOwn(props: {
  cs: CircuitShapes;
  level: number;
  groups: readonly (readonly HexType[])[];
  shade: (tiles: number) => number;
  picked: { type: HexType; from: number } | null;
  onPick: (types: readonly HexType[], type: HexType, from: number) => void;
  /** The routes a selected circuit uses at this level. */
  use?: LevelUse;
  maxUse?: number;
}): JSX.Element {
  const { cs, level, groups, shade, picked } = props;
  const common = useMemo(() => commonTable(cs, level), [cs, level]);
  const parts = useMemo(() => groups.map((g) => g.map((t) => ownPart(cs, level, t))), [cs, level, groups]);
  const pts = Object.values(cs.levels[level])[0].pts;
  const { use, maxUse } = props;
  const usesOf = (types: readonly HexType[]) => {
    if (!use) return null;
    const out = new Map<number, number>();
    for (const t of types) for (const [k, p] of use.byType.get(t) ?? []) out.set(k, (out.get(k) ?? 0) + p);
    return out;
  };
  const groupUses = useMemo(() => groups.map(usesOf), [use, groups]); // eslint-disable-line react-hooks/exhaustive-deps
  const allUses = useMemo(() => usesOf(Object.keys(cs.levels[level]) as HexType[]), [use, cs, level]); // eslint-disable-line react-hooks/exhaustive-deps
  // a common route picked is read in the first type that has its place without an override
  const pickCommon = (from: number) => {
    const t = (Object.keys(cs.levels[level]) as HexType[]).find((x) => cs.levels[level][x].has(from) && !parts.flat().some((o) => o.type === x && o.places.includes(from)));
    if (t) props.onPick([t], t, from);
  };
  return (
    <div className="bu-tables" data-testid="bu-common-own">
      <TableFigure
        className="is-common"
        pts={pts}
        dots={common.places}
        routes={common.routes}
        shade={shade}
        uses={allUses}
        maxUse={maxUse}
        onPick={level > 0 ? pickCommon : undefined}
        label={`Common table at level ${level}`}
        head={<div className="bu-names"><span className="bu-name is-common">Common</span></div>}
        caption={<>{nf(common.places.length)} places, {nf(common.routes.length)} routes{common.oneSided ? `, ${common.oneSided} one-sided` : ''}</>}
      />
      {groups.map((g, gi) => {
        const own = parts[gi];
        const first = own[0];
        const counts = new Set(own.map((o) => o.places.length));
        return (
          <TableFigure
            key={g.join()}
            className={g.length > 1 ? 'is-shared' : undefined}
            pts={pts}
            dots={NONE}
            frameOn={common.places}
            faint={first.absent}
            routes={[]}
            own={first.routes}
            shade={shade}
            uses={groupUses[gi]}
            maxUse={maxUse}
            picked={picked && g.includes(picked.type) ? picked.from : null}
            onPick={level > 0 ? (from) => props.onPick(g, g[0], from) : undefined}
            label={`Own entries of ${g.join(', ')}`}
            head={<div className="bu-names">{g.map((n) => <span key={n} className="bu-name" style={{ background: tileColor(n) }}>{n}</span>)}</div>}
            caption={
              <>
                {counts.size === 1 ? `${nf(first.places.length)} own` : own.map((o) => `${o.type} ${nf(o.places.length)}`).join(', ') + ' own'}
                {first.inside > 0 && counts.size === 1 ? ` (${first.inside} differ only inside)` : ''}, {nf(first.absent.length)} absent
                {groupUses[gi] && <span className="bu-uses"> · uses {nf(groupUses[gi]!.size)}, {nf([...groupUses[gi]!.values()].reduce((a, b) => a + b, 0))} passes</span>}
              </>
            }
          />
        );
      })}
    </div>
  );
}
