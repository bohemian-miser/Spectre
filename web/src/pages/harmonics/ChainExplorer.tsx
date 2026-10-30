/**
 * A chain's members side by side, expanded supertile by supertile from their
 * birth supertiles (`focus.ts`). Each member is a column. Hovering a
 * supertile chip previews where it is and what it holds; clicking pins it,
 * and the chip the readings pair it with in every other column, neighbour by
 * neighbour. Each column then shows that
 * supertile's visits one level down, where it is in the circuit, and its
 * route table built from its children's (the Build-up page's
 * `buildup/PassesPane.tsx`) with the circuit's routes through it in bold.
 * Visits a neighbouring member lacks are outlined, and the runs of visits
 * back and forth across a seam, which the reading cancels, are shown as one
 * chip each.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tileColor } from '../../lib/palette';
import type { Box } from '../../lib/viewport';
import { PassesPane, type DrawnPasses } from '../buildup/PassesPane';
import { Viewer, type Lines, type Mark, type ViewerApi } from '../buildup/Viewer';
import { fixedSource } from '../buildup/viewer';
import { commonRun, type ChildItem, type FocusNode, type RouteTable, type Sel } from './focus';
import type { CircuitInfo, HarmonicsClient } from './harmonicsJob';
import '../../styles/buildup.css';

const nf = (n: number) => n.toLocaleString('en-US');
/** Chips shown per row before it is cut short. */
const SHOWN = 160;
/** How finely a circuit is drawn: runs of tiles within this share of its radius of gyration are one point. */
const SHARE = 0.002;

const keyOf = (ci: number, s: Sel) => `${ci} ${s.level} ${s.i}`;

const boxOf = (xy: ArrayLike<number>): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < xy.length; i += 2) {
    x0 = Math.min(x0, xy[i]);
    x1 = Math.max(x1, xy[i]);
    y0 = Math.min(y0, xy[i + 1]);
    y1 = Math.max(y1, xy[i + 1]);
  }
  return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
};
const grow = (b: Box, f: number): Box => {
  const m = f * Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
  return { min: { x: b.min.x - m, y: b.min.y - m }, max: { x: b.max.x + m, y: b.max.y + m } };
};
const closed = (xy: ArrayLike<number>): Float64Array => {
  const out = new Float64Array(xy.length + 2);
  out.set(xy as ArrayLike<number>);
  out[xy.length] = xy[0];
  out[xy.length + 1] = xy[1];
  return out;
};

/** The kept visits of two rows lined up: per item of `node`, whether `other` shares it (null for runs, or when there is nothing to compare with). */
function sharedItems(node: FocusNode, other: FocusNode | null): (boolean | null)[] {
  if (!other) return node.items.map(() => null);
  const mine = node.items.map((it, q) => (it.kind === 'visit' ? q : -1)).filter((q) => q >= 0);
  const theirs = other.items.filter((it) => it.kind === 'visit') as Extract<ChildItem, { kind: 'visit' }>[];
  const pairs = commonRun(
    mine.map((q) => (node.items[q] as Extract<ChildItem, { kind: 'visit' }>).token),
    theirs.map((v) => v.token),
  );
  const hit = new Set(pairs.map(([a]) => mine[a]));
  return node.items.map((it, q) => (it.kind === 'visit' ? hit.has(q) : null));
}

/** The members' picks, worked out in the engine and kept here. */
function useChainFocus(client: HarmonicsClient, level: number, members: readonly number[], circuits: readonly CircuitInfo[]) {
  const birth = useCallback((m: number): Sel => ({ level: circuits[m].level, i: -1 }), [circuits]);
  // circuit indices change with each level read, so everything is kept under the level and the members it was made for
  const memberKey = `${level}: ${members.join(' ')}`;
  const [held, setHeld] = useState<{ key: string; trails: Sel[][] }>({ key: memberKey, trails: members.map((m) => [birth(m)]) });
  const trails = useMemo(() => (held.key === memberKey ? held.trails : members.map((m) => [birth(m)])), [held, memberKey, members, birth]);
  const setTrails = (f: Sel[][] | ((t: Sel[][]) => Sel[][])) => setHeld({ key: memberKey, trails: typeof f === 'function' ? f(trails) : f });
  const [nodes, setNodes] = useState<Record<string, FocusNode>>({});
  const [drawings, setDrawings] = useState<Record<string, Float64Array>>({});
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(new Map<string, Promise<FocusNode>>());
  const latest = useRef({ trails, nodes });
  latest.current = { trails, nodes };
  const askedFor = useRef(level);
  if (askedFor.current !== level) {
    askedFor.current = level;
    asked.current.clear();
  }
  useEffect(() => {
    setNodes({});
    setError(null);
  }, [level]);
  const fetchNode = useCallback(
    (ci: number, sel: Sel, other: number | null): Promise<FocusNode> => {
      const k = `${keyOf(ci, sel)} ${other ?? ''}`;
      let p = asked.current.get(k);
      if (!p) {
        p = client.node(ci, sel, other);
        asked.current.set(k, p);
        p.then((n) => setNodes((all) => ({ ...all, [`${level} ${keyOf(ci, sel)}`]: n }))).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
      }
      return p;
    },
    [client, level],
  );
  const nodeOf = (ci: number, sel: Sel): FocusNode | null => nodes[`${level} ${keyOf(ci, sel)}`] ?? null;
  // the nodes on every trail, and each member's drawing
  useEffect(() => {
    trails.forEach((t, j) => t.forEach((s) => void fetchNode(members[j], s, null).catch(() => undefined)));
  }, [trails, members, fetchNode]);
  useEffect(() => {
    let on = true;
    for (const m of members) {
      if (drawings[`${level} ${m}`]) continue;
      client.drawing(m, SHARE).then((d) => on && setDrawings((all) => ({ ...all, [`${level} ${m}`]: d }))).catch(() => undefined);
    }
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, level]);
  const nodeAt = (j: number, depth: number): FocusNode | null => {
    const s = trails[j]?.[depth];
    return s ? nodeOf(members[j], s) : null;
  };
  /** Picks a visit of member j one level below its trail's node at `depth`, and the visits the readings pair it with in the other members. */
  const select = async (j: number, depth: number, sel: Sel): Promise<void> => {
    const now = latest.current.trails;
    const next = now.map((t) => t.slice(0, depth + 1));
    next[j].push(sel);
    // the visit member `to` pairs with member `from`'s: through the whole readings, else through the two parents' visits alone
    const step = async (from: number, to: number, s: Sel): Promise<Sel | null> => {
      if (next[to].length !== depth + 1) return null;
      const n = await fetchNode(members[from], s, members[to]);
      if (n.partner) return n.partner;
      const all = latest.current.nodes;
      const pa = all[`${level} ${keyOf(members[from], next[from][depth])}`], pb = all[`${level} ${keyOf(members[to], next[to][depth])}`];
      if (!pa || !pb) return null;
      const ka = pa.items.filter((it) => it.kind === 'visit') as Extract<ChildItem, { kind: 'visit' }>[];
      const kb = pb.items.filter((it) => it.kind === 'visit') as Extract<ChildItem, { kind: 'visit' }>[];
      const q = ka.findIndex((v) => v.i === s.i);
      const hit = commonRun(ka.map((v) => v.token), kb.map((v) => v.token)).find(([x]) => x === q);
      return hit ? { level: s.level + circuits[members[to]].level - circuits[members[from]].level, i: kb[hit[1]].i } : null;
    };
    try {
      for (const dir of [1, -1]) {
        let cur: Sel | null = sel;
        for (let m = j + dir; m >= 0 && m < members.length && cur; m += dir) {
          cur = await step(m - dir, m, cur);
          if (cur) next[m].push(cur);
        }
      }
      setTrails(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  /** Goes back to `depth` in every member. */
  const back = (depth: number) => setTrails((t) => t.map((x) => x.slice(0, depth + 1)));
  const drawingOf = (m: number): Float64Array | undefined => drawings[`${level} ${m}`];
  return { trails, nodeOf, nodeAt, select, back, drawingOf, fetchNode, error };
}

type Focus = ReturnType<typeof useChainFocus>;

/** A supertile's visits one level down as chips: kept visits by type and slot, runs of backtracks as one chip each, visits the neighbour lacks outlined. */
function Items(props: {
  node: FocusNode | null;
  other: FocusNode | null;
  picked: number | null;
  onPick?: (sel: Sel) => void;
  onHover?: (sel: Sel | null, at: DOMRect | null) => void;
  testId?: string;
}): JSX.Element {
  const { node } = props;
  if (!node) return <div className="harm-items shapes-note">…</div>;
  if (node.sel.level === 0) return <div className="harm-items shapes-note">A tile: nothing below it.</div>;
  const shared = sharedItems(node, props.other);
  const unshared = shared.filter((s) => s === false).length;
  const runs = node.items.filter((it) => it.kind === 'run').length;
  return (
    <div className="harm-items" data-testid={props.testId}>
      <div className="harm-xhead">
        {nf(node.childCount)} visits at level {node.sel.level - 1}
        {node.cancelled ? `; ${nf(node.cancelled)} back and forth across seams, in ${nf(runs)} run${runs === 1 ? "" : "s"} the reading cancels` : ''}
        {unshared ? `; ${nf(unshared)} not in the neighbour` : ''}
      </div>
      <div className="harm-tokens">
        {node.items.slice(0, SHOWN).map((it, q) =>
          it.kind === 'run' ? (
            <span
              key={q}
              className="harm-chip harm-run"
              title={`${nf(it.count)} visit${it.count > 1 ? 's' : ''} back and forth across a seam, through ${it.types.join(', ')}: cancelled from the reading`}
              data-testid="harm-run"
            >
              ↔ {nf(it.count)}
            </span>
          ) : (
            <button
              type="button"
              key={q}
              className={`harm-chip harm-xchip${shared[q] === false ? ' harm-token-differs' : ''}${props.picked === it.i ? ' harm-chip-picked' : ''}`}
              style={{ ['--chip' as string]: tileColor(it.type, 'bright') }}
              title={`${it.type} in slot ${it.slot}${shared[q] === false ? '; the neighbouring member has no visit to match it' : ''}`}
              onClick={() => props.onPick?.({ level: node.sel.level - 1, i: it.i })}
              onMouseEnter={(e) => props.onHover?.({ level: node.sel.level - 1, i: it.i }, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={() => props.onHover?.(null, null)}
              data-testid="harm-item"
            >
              {it.type} {it.slot}
            </button>
          ),
        )}
        {node.items.length > SHOWN ? <span className="harm-token harm-more">… {nf(node.items.length - SHOWN)} more</span> : null}
      </div>
    </div>
  );
}

/** The circuit with a supertile outlined, zoomed to it. */
function Location(props: { drawing: Float64Array | undefined; node: FocusNode | null; fitKey: string }): JSX.Element {
  const api = useRef<ViewerApi | null>(null);
  const { drawing, node } = props;
  const frame = useMemo(() => (drawing ? grow(boxOf(drawing), 0.04) : null), [drawing]);
  const lines: Lines | null = useMemo(
    () =>
      drawing
        ? { key: `loc ${props.fitKey} ${drawing.length}`, count: 1, points: () => fixedSource(drawing), style: () => 0, styles: [{ color: '--text', width: 1, alpha: 0.7 }], stop: () => 0 }
        : null,
    [drawing, props.fitKey],
  );
  const live: Mark[] = useMemo(() => (node ? [{ pts: closed(node.outline), color: '#eb6834', width: 2.5, fill: 'rgba(235,104,52,0.18)' }] : []), [node]);
  useEffect(() => {
    if (!node) return;
    const t = window.setTimeout(() => api.current?.fit(grow(boxOf(node.outline), node.sel.i < 0 ? 0.04 : 1)), 60);
    return () => clearTimeout(t);
  }, [node]);
  if (!frame || !lines) return <div className="harm-loc shapes-note">Drawing…</div>;
  return (
    <div className="harm-loc" data-testid="harm-location">
      <Viewer frame={frame} fitKey={props.fitKey} lines={lines} marks={() => []} live={live} apiRef={api} label="The circuit, the supertile picked outlined" />
    </div>
  );
}

/** A supertile's route table built from its children's, the circuit's routes in bold. */
function Routes(props: { table: RouteTable | null; fitKey: string }): JSX.Element {
  const { table } = props;
  const [hover, setHover] = useState<number | null>(null);
  const g: DrawnPasses | null = useMemo(() => {
    if (!table) return null;
    const lines = new Map(table.passes.map((p, i) => [p, table.lines[i]]));
    const ring = (n: number, t: string) => (n === table.level ? table.outline : table.rings[t]);
    return { line: (p) => lines.get(p)!, ring, box: (n, t) => grow(boxOf(ring(n, t)), 0.1) };
  }, [table]);
  const faint = useMemo(() => (table ? table.uses.map((u) => u === 0) : null), [table]);
  if (!table || !g) return <div className="harm-routes shapes-note">A tile has no route table.</div>;
  const frame = { outline: table.outline, box: grow(boxOf(table.outline), 0.06) };
  const birth = table.routes === 0;
  return (
    <div className="harm-routes" data-testid="harm-routes">
      <PassesPane g={g} frame={frame} fitKey={props.fitKey} passes={table.passes} matched={faint} strong hovered={hover} onHover={setHover} label={`A level-${table.level} ${table.type} built from its children's routes`} testId="harm-route-table" />
      <p className="harm-xhead">
        {birth
          ? `The circuit closing in this level-${table.level} ${table.type}: ${nf(table.passes.length)} routes of its children.`
          : `Level-${table.level} ${table.type}: ${nf(table.routes)} routes, the circuit takes ${nf(table.taken)} of them (bold)${table.all ? '' : '; only those are drawn'}.`}
      </p>
    </div>
  );
}

/** The supertile member j's is compared with at a depth: the member below's, or the one above's where the member below has none or has reached a tile. */
function neighbour(f: Focus, j: number, depth: number): FocusNode | null {
  for (const nb of [j - 1, j + 1]) {
    if (nb < 0 || nb >= f.trails.length || f.trails[nb].length <= depth) continue;
    const n = f.nodeAt(nb, depth);
    if (n && n.sel.level > 0) return n;
  }
  return null;
}

/** The trail of picks in one member, each clickable to go back to it. */
function Trail(props: { f: Focus; j: number; ci: number }): JSX.Element {
  const t = props.f.trails[props.j] ?? [];
  return (
    <div className="harm-trail">
      {t.map((s, d) => {
        const n = props.f.nodeOf(props.ci, s);
        return (
          <button type="button" key={d} className="harm-crumb" onClick={() => props.f.back(d)} title="Go back to this supertile in every member">
            {d ? '› ' : ''}
            {n ? (d ? `${n.type} ${n.path.split('.').pop()}` : `${n.type}, level ${s.level}`) : '…'}
          </button>
        );
      })}
    </div>
  );
}

/** Member j's picked supertile: where it is, its visits one level down (pick one to go further), its route table. */
function FocusColumn(props: { f: Focus; j: number; members: readonly number[]; onHover: Hover }): JSX.Element {
  const { f, j, members } = props;
  const depth = f.trails[j].length - 1;
  const node = f.nodeAt(j, depth);
  const other = f.trails[j].length - 1 === depth ? neighbour(f, j, depth) : null;
  const lost = f.trails.some((t) => t.length - 1 > depth);
  return (
    <div className="harm-col" data-testid="harm-focus">
      <Trail f={f} j={j} ci={members[j]} />
      {lost ? <p className="shapes-note">No supertile here pairs with the one picked in the other members.</p> : null}
      <Location drawing={f.drawingOf(members[j])} node={node} fitKey={`${members[j]}`} />
      <Items node={node} other={other} picked={null} onPick={(s) => void f.select(j, depth, s)} onHover={(s, at) => props.onHover(j, s, at)} testId="harm-children" />
      <Routes table={node?.routes ?? null} fitKey={`${members[j]} ${node?.sel.level} ${node?.sel.i}`} />
    </div>
  );
}

const head = (c: CircuitInfo) => (
  <div className="harm-col-head">
    {nf(c.length)} <small>L{c.level}</small>
  </div>
);

type Hover = (j: number, sel: Sel | null, at: DOMRect | null) => void;

/** The chain's members expanded supertile by supertile: hovering a chip previews it, clicking pins it in every member. */
export function ChainExplorer(props: { client: HarmonicsClient; level: number; members: readonly number[]; circuits: readonly CircuitInfo[] }): JSX.Element {
  const { members, circuits } = props;
  const f = useChainFocus(props.client, props.level, members, circuits);
  const cols = { gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` };
  const [hover, setHover] = useState<{ j: number; sel: Sel; x: number; y: number } | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const hoverNode = hover ? f.nodeOf(members[hover.j], hover.sel) : null;
  useEffect(() => {
    if (hover) void f.fetchNode(members[hover.j], hover.sel, null).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover]);
  const onHover: Hover = (j, s, at) => {
    const box = host.current?.getBoundingClientRect();
    setHover(s && at && box ? { j, sel: s, x: at.left - box.left, y: at.bottom - box.top + 4 } : null);
  };
  return (
    <div className="harm-explore" ref={host} data-testid="harm-explore">
      <h3>Supertile by supertile</h3>
      <p className="shapes-note">
        Each column is a member of the chain, from its birth supertile down. Hover a supertile to see where it is and what it holds; click to pin it, and
        the one the readings pair with it in every member. ↔ chips are runs of visits back and forth across a seam, which the reading cancels; outlined
        chips are visits the neighbouring member has no match for. The route table is the supertile built from its children&apos;s routes, those the
        circuit takes through it in bold.
      </p>
      {f.error ? <p className="shapes-note">Could not expand: {f.error}</p> : null}
      <div className="harm-cols" style={cols}>
        {members.map((m, j) => (
          <div key={m} className="harm-col">
            {head(circuits[m])}
            <Items
              node={f.nodeAt(j, 0)}
              other={neighbour(f, j, 0)}
              picked={f.trails[j][1]?.i ?? null}
              onPick={(s) => void f.select(j, 0, s)}
              onHover={(s, at) => onHover(j, s, at)}
              testId="harm-row"
            />
          </div>
        ))}
      </div>
      {hover ? (
        <div className="harm-pop" style={{ left: Math.max(0, hover.x - 40), top: hover.y }} data-testid="harm-pop">
          <MiniLocation drawing={f.drawingOf(members[hover.j])} node={hoverNode} />
          {hoverNode ? <Items node={hoverNode} other={null} picked={null} /> : <p className="shapes-note">…</p>}
          <p className="harm-xhead">Click to pin.</p>
        </div>
      ) : null}
      <div className="harm-cols" style={cols}>
        {members.map((m, j) => (
          <FocusColumn key={m} f={f} j={j} members={members} onHover={onHover} />
        ))}
      </div>
    </div>
  );
}

/** A small drawing of the circuit with a supertile outlined, for a preview. */
function MiniLocation(props: { drawing: Float64Array | undefined; node: FocusNode | null }): JSX.Element {
  const { drawing, node } = props;
  if (!drawing) return <></>;
  const b = grow(boxOf(drawing), 0.04);
  const d = (xy: ArrayLike<number>) => {
    let s = '';
    for (let i = 0; i + 1 < xy.length; i += 2) s += `${i ? 'L' : 'M'}${xy[i].toFixed(2)} ${(-xy[i + 1]).toFixed(2)}`;
    return s;
  };
  return (
    <svg className="harm-mini" viewBox={`${b.min.x} ${-b.max.y} ${b.max.x - b.min.x} ${b.max.y - b.min.y}`} role="img" aria-label="Where the supertile is in the circuit">
      <path d={d(drawing)} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {node ? <path d={`${d(node.outline)}Z`} fill="rgba(235,104,52,0.25)" stroke="#eb6834" strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  );
}
