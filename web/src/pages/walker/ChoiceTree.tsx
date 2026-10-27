/**
 * The choices of a walk as a git-style tree, top down. Each row is a
 * landing: a hexagon in the tile's colour named inside, and lined up beside
 * it nine slots, one per tile type, filled for the supertile flavours
 * (ancestor types at the level that decides the fork) that lead to it, with
 * a number where more than one slot of that supertile type does. Rows
 * offered at the same fork sit close together. The path being walked runs
 * straight down the first lane; the other
 * landings at each fork branch off into lanes of their own, hollow until
 * taken. Each edge is drawn as a bundle of thin lines, one per flavour, in
 * that flavour's colour.
 */
import { useMemo } from 'react';

import { HEX_TYPES, type HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import { advance, forkOf, type ChoiceNode, type Fork, type ForkOption, type PossibleWalk, type Stage } from './possible';

const HEX_W = 30;
const HEX_H = HEX_W * (Math.sqrt(3) / 2);
/** Gap between rows offered at the same fork, and before a new fork. */
const TIGHT = HEX_H + 2;
const LOOSE = HEX_H + 7;
const LANE = HEX_W + 5;
const PAD = HEX_W / 2 + 3;
const THREAD = 1.5;
const SLOT = 11;
/** Room above the first row for the slot headings. */
const TOP = 12;

interface TreeRow {
  readonly key: string;
  readonly parent: number | null; // row index
  readonly lane: number;
  readonly kind: 'start' | 'landing' | 'end';
  readonly option?: ForkOption;
  readonly node?: number; // choice node reached, if taken
  readonly at?: number; // choice node whose fork offered it
  readonly step?: number;
  readonly from?: { readonly type: HexType; readonly exit: number };
  readonly then?: string;
  readonly onPath: boolean;
  readonly current: boolean;
  readonly label: string;
}

const compact = (n: number): string => (n < 1000 ? String(n) : n < 1e6 ? `${(n / 1000).toFixed(n < 1e4 ? 1 : 0)}k` : `${(n / 1e6).toFixed(1)}M`);
const levelWord = (k: number | null): string => (k === null ? '' : k === 1 ? 'parent' : k === 2 ? 'grandparent' : `level ${k}`);

export interface ChoiceTreeProps {
  readonly pw: PossibleWalk;
  /** 'path': the landings walked, and the ones offered at the next fork; 'full': every branch explored. */
  readonly mode: 'path' | 'full';
  readonly onGoto: (id: number) => void;
  readonly onChooseAt: (id: number, key: string) => void;
  /** A landing offered at the next fork is hovered (path mode). */
  readonly onHoverOption?: (key: string | null) => void;
}

export function ChoiceTree({ pw, mode, onGoto, onChooseAt, onHoverOption }: ChoiceTreeProps): JSX.Element {
  const rows = useMemo(() => {
    const ahead = new Map<number, Stage>();
    const stageAhead = (n: ChoiceNode): Stage => {
      const hit = ahead.get(n.id);
      if (hit) return hit;
      let st = n.id === pw.current ? pw.stage : n.stage;
      for (let i = 0; i < 20000 && st.status === 'walking'; i++) st = advance(pw.walker, st);
      ahead.set(n.id, st);
      return st;
    };
    const forkAt = (n: ChoiceNode): Fork | null => {
      if (n.fork) return n.fork;
      const st = stageAhead(n);
      return st.status === 'choice' ? forkOf(pw.walker, st) : null;
    };
    const onPath = new Set<number>();
    for (let id: number | null = pw.current; id !== null; id = pw.nodes[id].parent) onPath.add(id);
    const stretch = (n: ChoiceNode): string => {
      const f = forkAt(n);
      const a = n.stage.seen.length + 1;
      const b = f ? f.step - 1 : stageAhead(n).seen.length;
      return b > a ? `steps ${a}–${b}` : b === a ? `step ${a}` : '';
    };

    const out: TreeRow[] = [];
    // lanes: the row each lane is busy until
    const busy: number[] = [];
    const take = (lane: number, until: number): void => { busy[lane] = Math.max(busy[lane] ?? -1, until); };
    const free = (from: number): number => {
      for (let l = 1; ; l++) if ((busy[l] ?? -1) < from) return l;
    };

    const visit = (n: ChoiceNode, rowIndex: number, lane: number): void => {
      const f = forkAt(n);
      if (!f) {
        const st = stageAhead(n);
        if (st.status === 'closed' || st.status === 'open') {
          out.push({ key: `end${n.id}`, parent: rowIndex, lane, kind: 'end', node: n.id, onPath: onPath.has(n.id), current: n.id === pw.current, label: st.status === 'closed' ? `circuit · ${st.seen.length} tiles` : `open after ${st.seen.length} tiles` });
          take(lane, out.length - 1);
        }
        return;
      }
      const child = (o: ForkOption): number | undefined => n.children.find((c) => pw.nodes[c].key === o.key);
      // the landing on the walked path last, so the first lane runs straight on into its branch
      const order = [...f.options].sort((a, b) => Number(onPath.has(child(a) ?? -1)) - Number(onPath.has(child(b) ?? -1)));
      // every landing of this fork first, side by side; the branches explored from them below
      const later: { c: number; row: number; lane: number }[] = [];
      for (const o of order) {
        const c = child(o);
        const main = c !== undefined && onPath.has(c);
        const l = main ? lane : free(rowIndex);
        const me = out.length;
        out.push({
          key: `${n.id}:${o.key}`, parent: rowIndex, lane: l, kind: 'landing', option: o, node: c, at: n.id, step: f.step,
          from: f.from, then: c !== undefined ? stretch(pw.nodes[c]) : '', onPath: main, current: c === pw.current,
          label: o.type ? `${o.type} ${o.edge}` : o.key === 'closes' ? 'closes' : 'open',
        });
        if (c !== undefined) {
          // keep its lane until its branch has been laid out
          busy[l] = Infinity;
          later.push({ c, row: me, lane: l });
        } else take(l, me);
      }
      // the walked path's branch first, so it reads straight down; side branches after it
      later.sort((p, q) => Number(onPath.has(q.c)) - Number(onPath.has(p.c)));
      for (const { c, row, lane: l } of later) {
        visit(pw.nodes[c], row, l);
        busy[l] = out.length - 1;
      }
    };
    out.push({ key: 'start', parent: null, lane: 0, kind: 'start', node: 0, onPath: true, current: pw.current === 0, label: `${pw.walker.start}, in through ${pw.walker.startEdge}`, then: stretch(pw.nodes[0]) });
    if (mode === 'full') {
      take(0, 0);
      visit(pw.nodes[0], 0, 0);
      return out;
    }
    // path: the landings taken, one under the other, then what the next fork offers
    const route: number[] = [];
    for (let id: number | null = pw.current; id !== null; id = pw.nodes[id].parent) route.unshift(id);
    for (let r = 1; r < route.length; r++) {
      const n = pw.nodes[route[r]];
      const f = forkAt(pw.nodes[route[r - 1]])!;
      const o = f.options.find((x) => x.key === n.key)!;
      out.push({
        key: `${route[r - 1]}:${o.key}`, parent: out.length - 1, lane: 0, kind: 'landing', option: o, node: n.id, at: route[r - 1], step: f.step,
        from: f.from, then: stretch(n), onPath: true, current: n.id === pw.current, label: o.type ? `${o.type} ${o.edge}` : o.key,
      });
    }
    const here = out.length - 1;
    const cur = pw.nodes[pw.current];
    const f = forkAt(cur);
    if (f) {
      f.options.forEach((o, i) => out.push({
        key: `${cur.id}:${o.key}`, parent: here, lane: i, kind: 'landing', option: o, at: cur.id, step: f.step, from: f.from,
        onPath: false, current: false, label: o.type ? `${o.type} ${o.edge}` : o.key,
      }));
    } else {
      const st = stageAhead(cur);
      if (st.status === 'closed' || st.status === 'open') out.push({ key: `end${cur.id}`, parent: here, lane: 0, kind: 'end', node: cur.id, onPath: true, current: false, label: st.status === 'closed' ? `circuit · ${st.seen.length} tiles` : `open after ${st.seen.length} tiles` });
    }
    return out;
  }, [pw, mode]);

  const lanes = Math.max(1, ...rows.map((r) => r.lane + 1));
  const gw = PAD * 2 + (lanes - 1) * LANE;
  const x = (lane: number): number => PAD + lane * LANE;
  // rows offered at the same fork sit close; a new fork starts a little further down
  const ys: number[] = [];
  rows.forEach((r, i) => { ys.push(i === 0 ? TOP + HEX_H / 2 + 2 : ys[i - 1] + (r.parent !== null && r.parent === rows[i - 1].parent ? TIGHT : LOOSE)); });
  const y = (row: number): number => ys[row];
  const height = (ys[ys.length - 1] ?? 0) + HEX_H / 2 + 3;
  // the flavour slots: one per tile type, at the same place on every row
  const slotsX = gw + 8;
  const width = slotsX + HEX_TYPES.length * (SLOT + 2) + 46;

  return (
    <svg className="wk-tree" width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-testid="wk-tree">
      {HEX_TYPES.map((t, k) => (
        <text key={t} x={slotsX + k * (SLOT + 2) + SLOT / 2} y={9} className="wk-tree__slothead" textAnchor="middle">{t.slice(0, 2)}</text>
      ))}
      {rows.map((r, i) => {
        if (r.parent === null) return null;
        const p = rows[r.parent];
        const threads = r.option && r.option.deciders.length ? r.option.deciders : [null];
        const x1 = x(p.lane), y1 = y(r.parent) + HEX_H / 2, x2 = x(r.lane), y2 = y(i) - HEX_H / 2;
        return (
          <g key={`e${i}`} className={r.node === undefined && r.kind === 'landing' ? 'is-untaken' : ''}>
            {threads.map((t, k) => {
              const off = (k - (threads.length - 1) / 2) * THREAD;
              const bend = Math.min(y2, y1 + 8);
              const d = x1 === x2
                ? `M${x1 + off} ${y1} L${x2 + off} ${y2}`
                : `M${x1 + off} ${y1} C${x1 + off} ${y1 + 5} ${x2 + off} ${bend - 4} ${x2 + off} ${bend} L${x2 + off} ${y2}`;
              return <path key={k} d={d} stroke={t ? tileColor(t) : 'var(--text, #1d2430)'} className="wk-tree__thread" />;
            })}
          </g>
        );
      })}
      {rows.map((r, i) => {
        const untaken = r.kind === 'landing' && r.node === undefined;
        const type = r.kind === 'start' ? pw.walker.start : r.option?.type ?? null;
        const fill = type ? tileColor(type) : 'var(--panel, #fff)';
        const cx = x(r.lane), cy = y(i);
        const text = r.kind === 'end' ? (r.label.startsWith('circuit') ? '✓' : '…') : type ? type.slice(0, 3) : r.option?.key === 'closes' ? '✓' : 'wall';
        const click = (): void => {
          if (untaken) onChooseAt(r.at!, r.option!.key);
          else if (r.node !== undefined) onGoto(r.node);
        };
        const title = r.option && r.from
          ? `Step ${r.step}: out of a ${r.from.type} through ${r.from.exit}, ${r.option.type ? `lands on a ${r.option.type} through its edge ${r.option.edge}` : r.option.key === 'closes' ? 'closes the circuit' : 'goes on along a wall'}, in ${r.option.stacks.toLocaleString('en-US')} stacks${r.option.deciders.length ? `, decided by the ${levelWord(r.option.level)}: ${r.option.deciders.join(', ')}` : ''}.${r.then ? ` Then ${r.then}.` : ''}${untaken ? ' Click to take it.' : ''}`
          : r.label;
        return (
          <g
            key={r.key}
            className={`wk-tree__row${untaken ? ' is-untaken' : ''}${r.current ? ' is-current' : ''}`}
            onClick={click}
            onMouseEnter={untaken && onHoverOption ? () => onHoverOption(r.option!.key) : undefined}
            onMouseLeave={untaken && onHoverOption ? () => onHoverOption(null) : undefined}
            data-testid={untaken && mode === 'path' ? `wk-outcome-${r.option!.key.replace(' ', '-')}` : `wk-tree-${r.key.replace(/[: ]/g, '-')}`}
          >
            <title>{title}</title>
            <rect x={0} y={cy - TIGHT / 2} width={width} height={TIGHT} className="wk-tree__hit" />
            {r.current && <polygon points={hexPts(cx, cy, HEX_W / 2 + 4)} className="wk-tree__halo" />}
            <polygon points={hexPts(cx, cy, HEX_W / 2)} fill={untaken ? 'var(--panel, #fff)' : fill} stroke={untaken ? (type ? fill : '#8a93a3') : '#1b2230'} strokeWidth={untaken ? 2 : 1.2} className="wk-tree__hex" />
            <text x={cx} y={cy} className="wk-tree__name" textAnchor="middle" dominantBaseline="central">{text}</text>
            {r.option && HEX_TYPES.map((t, k) => {
              const at = r.option!.deciders.indexOf(t);
              const many = at >= 0 ? r.option!.slotsPer[at] ?? 1 : 0;
              const sx = slotsX + k * (SLOT + 2);
              return (
                <g key={t}>
                  <rect x={sx} y={cy - SLOT / 2} width={SLOT} height={SLOT} rx={2}
                    fill={at >= 0 ? tileColor(t) : 'none'} className={at >= 0 ? 'wk-tree__slot is-on' : 'wk-tree__slot'} />
                  {many > 1 && <text x={sx + SLOT / 2} y={cy + 0.5} className="wk-tree__slotn" textAnchor="middle" dominantBaseline="central">{many}</text>}
                </g>
              );
            })}
            {r.option && <text x={slotsX + HEX_TYPES.length * (SLOT + 2) + 4} y={cy} className="wk-tree__n" dominantBaseline="central">{compact(r.option.stacks)}</text>}
            {r.kind === 'end' && <text x={slotsX} y={cy} className="wk-tree__endtext" dominantBaseline="central">{r.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** A regular flat-topped hexagon of circumradius r. */
function hexPts(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export default ChoiceTree;
