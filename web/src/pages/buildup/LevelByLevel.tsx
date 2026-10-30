/**
 * One type's routes at every level built: the longest, and the routes
 * grouped by composition, each composition marked by whether level n − 2
 * has it too, has only its shape, or has neither.
 */
import { useMemo, useRef } from 'react';
import { leafOrder, type HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { levelRoutes, type LevelRoutes } from './routes';

const nf = (n: number) => n.toLocaleString('en-US');
/** Compositions listed per level. */
const GROUPS = 6;
/** Characters of a composition shown before it is cut. */
const CUT = 90;

type Mark = 'again' | 'shape' | 'new';
interface Seen { readonly compositions: Set<string>; readonly shapes: Set<string> }
const markOf = (comp: string, shape: string, before: Seen | undefined): Mark | null => {
  if (!before) return null;
  if (before.compositions.has(comp)) return 'again';
  return before.shapes.has(shape) ? 'shape' : 'new';
};

function Comp(props: { text: string; mark: Mark | null; count?: number; tiles?: number; onClick?: () => void }): JSX.Element {
  const { text, mark } = props;
  const short = text.length > CUT ? `${text.slice(0, CUT)}…` : text;
  const body = (
    <>
      {props.tiles !== undefined && <b>{nf(props.tiles)}</b>} {short}{props.count !== undefined && <b> ×{nf(props.count)}</b>}
    </>
  );
  const cls = `bu-chip${mark ? ` is-${mark}` : ''}`;
  return props.onClick
    ? <button type="button" className={cls} title={text} onClick={props.onClick}>{body}</button>
    : <span className={cls} title={text}>{body}</span>;
}

export function LevelByLevel(props: { cs: CircuitShapes; built: number; type: HexType; onType: (t: HexType) => void; onPick: (level: number, from: number) => void }): JSX.Element {
  const { cs, built, type } = props;
  // a built level never changes, so each level's routes are read once per type
  const cache = useRef<{ cs: CircuitShapes | null; at: Map<string, LevelRoutes> }>({ cs: null, at: new Map() });
  const rows = useMemo(() => {
    if (cache.current.cs !== cs) cache.current = { cs, at: new Map() };
    const out: LevelRoutes[] = [];
    for (let n = 1; n <= built; n++) {
      const key = `${type} ${n}`;
      const hit = cache.current.at.get(key) ?? levelRoutes(cs, n, type);
      cache.current.at.set(key, hit);
      out.push(hit);
    }
    return out;
  }, [cs, built, type]);
  const seen = useMemo(() => rows.map((r): Seen => ({ compositions: new Set(r.groups.map((g) => g.composition)), shapes: new Set(r.groups.map((g) => g.shape)) })), [rows]);
  return (
    <div className="bu-lbl" data-testid="bu-level-by-level">
      <div className="bu-names" role="group" aria-label="Type">
        {leafOrder('hex').map((t) => (
          <button key={t} type="button" aria-pressed={t === type} className={`bu-name${t === type ? ' is-active' : ''}`} style={{ background: tileColor(t) }} onClick={() => props.onType(t as HexType)}>{t}</button>
        ))}
      </div>
      <p className="bu-muted">
        A route's composition is the child types it passes through, read from the end that sorts first.
        Marked against level n − 2: <span className="bu-chip is-again">same composition</span> <span className="bu-chip is-shape">same types, other counts</span> <span className="bu-chip is-new">new</span>
      </p>
      <table className="bu-summary-table bu-lbl-table">
        <thead><tr><th>Level</th><th className="num">Routes</th><th className="num">Compositions</th><th className="num">Routes as at n − 2</th><th>Longest</th><th>Commonest</th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const before = i >= 2 ? seen[i - 2] : undefined;
            const again = before ? r.groups.filter((g) => markOf(g.composition, g.shape, before) === 'again').reduce((s, g) => s + g.count, 0) : null;
            return (
              <tr key={r.level} data-testid={`bu-lbl-${r.level}`}>
                <td>{r.level}</td>
                <td className="num">{nf(r.routes)}</td>
                <td className="num">{nf(r.groups.length)}</td>
                <td className="num">{again === null ? '' : `${nf(again)} (${Math.round((100 * again) / Math.max(1, r.routes))}%)`}</td>
                <td><div className="bu-chips">{r.longest.map((x) => <Comp key={x.from} text={x.composition} tiles={x.tiles} mark={markOf(x.composition, x.shape, before)} onClick={() => props.onPick(r.level, x.from)} />)}</div></td>
                <td><div className="bu-chips">{r.groups.slice(0, GROUPS).map((g) => <Comp key={g.composition} text={g.composition} count={g.count} mark={markOf(g.composition, g.shape, before)} />)}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
