/**
 * `HierarchyBuilder` — choose a start tile and an edge, then choose parents
 * one at a time. Hovering a parent shows it on the board; clicking keeps it.
 * Each level has its own colour. Every chain tried stays in the tree of
 * choices underneath, and clicking a node there goes back to it.
 */
import { useMemo, useReducer, useState, type KeyboardEvent } from 'react';

import { HEX_TYPES, buildSystem, flatten, leafPts, levelMirror, transPt, type HexType, type Link } from '../../core';
import { tileColor } from '../../lib/palette';
import { orientationPath } from './board';
import {
  MAX_BUILD_LEVEL, chainOf, crossingAt, initialBuild, optionsAt, reduceBuild, sceneOf,
  type Build, type Pt, type Scene, type Seg,
} from './hierarchy';

/** One colour per level; level 0 is the start tile. */
export const LEVEL_COLOURS = ['#1b2230', '#2f6fdb', '#0ca678', '#f59f00', '#e8590c', '#7048e8'];
const WALL = '#1b2230';
/** the far side's levels, light to dark */
const FAR_GREYS = ['#ffffff', '#d3d8e0', '#bcc3cf', '#a5aebd', '#8e99ab', '#788499'];
const lineWidth = (k: number): number => 0.8 + 0.9 * k;

const keyOf = (start: HexType, edge: number, chain: readonly Link[]): string => `${start}|${edge}|${chain.map((l) => `${l.parent}${l.slot}`).join(',')}`;

/** Scenes of the last few chains looked at, so hovering back and forth does not place them again. */
const sceneCache = new Map<string, Scene>();
function cachedScene(start: HexType, edge: number, chain: readonly Link[]): Scene {
  const k = keyOf(start, edge, chain);
  let s = sceneCache.get(k);
  if (!s) {
    s = sceneOf(start, edge, chain);
    sceneCache.set(k, s);
    if (sceneCache.size > 12) sceneCache.delete(sceneCache.keys().next().value!);
  } else {
    sceneCache.delete(k);
    sceneCache.set(k, s);
  }
  return s;
}

const f = (v: number): string => v.toFixed(3);
const polyD = (pts: readonly Pt[]): string => `M${pts.map((q) => `${f(q.x)} ${f(q.y)}`).join('L')}Z`;
const segsD = (segs: readonly Seg[]): string => segs.map((s) => `M${f(s.x1)} ${f(s.y1)}L${f(s.x2)} ${f(s.y2)}`).join('');

/** A parent's rule in miniature: its children, the one the current supertile would be filled in. */
const thumbLayout = new Map<HexType, { pts: Pt[][]; slots: number[]; outline: Seg[]; viewBox: string }>();
function thumbOf(parent: HexType): { pts: Pt[][]; slots: number[]; outline: Seg[]; viewBox: string } {
  const hit = thumbLayout.get(parent);
  if (hit) return hit;
  const base = leafPts('hex', 'Delta');
  const insts = flatten(buildSystem('hex', 1)[parent], levelMirror(1));
  const pts = insts.map((i) => base.map((p) => transPt(i.xform, p)));
  const count = new Map<string, { n: number; seg: Seg }>();
  for (const poly of pts) for (let e = 0; e < 6; e++) {
    const a = poly[e], b = poly[(e + 1) % 6];
    const k = `${Math.round((a.x + b.x) * 500)},${Math.round((a.y + b.y) * 500)}`;
    const c = count.get(k);
    if (c) c.n++;
    else count.set(k, { n: 1, seg: { x1: a.x, y1: a.y, x2: b.x, y2: b.y } });
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of pts) for (const q of poly) { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }
  const out = {
    pts,
    slots: insts.map((i) => Number(i.id)),
    outline: [...count.values()].filter((c) => c.n === 1).map((c) => c.seg),
    viewBox: `${minX - 0.4} ${minY - 0.4} ${maxX - minX + 0.8} ${maxY - minY + 0.8}`,
  };
  thumbLayout.set(parent, out);
  return out;
}

function ParentThumb({ parent, slot, inner, outer }: { parent: HexType; slot: number; inner: string; outer: string }): JSX.Element {
  const t = thumbOf(parent);
  return (
    <svg className="hb__thumb" viewBox={t.viewBox} aria-hidden="true">
      {t.pts.map((poly, i) => <path key={i} d={polyD(poly)} fill={t.slots[i] === slot ? inner : '#d5dae2'} stroke="#fff" strokeWidth={0.08} />)}
      <path d={segsD(t.outline)} stroke={outer} strokeWidth={0.22} strokeLinecap="round" fill="none" />
    </svg>
  );
}

function SceneView({ scene, fresh, fit, start }: { scene: Scene; fresh: number | null; fit: number; start: HexType }): JSX.Element {
  const box = scene.frames[Math.min(fit, scene.level)];
  const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const pad = Math.max(1, 0.06 * size);
  const viewBox = `${box.minX - pad} ${box.minY - pad} ${box.maxX - box.minX + 2 * pad} ${box.maxY - box.minY + 2 * pad}`;
  // the start tile's side in the level colours; the far side, below the level where the sides meet, in greys
  const { bands, farBands } = useMemo(() => {
    const meet = scene.landed ? scene.landed.meet : Infinity;
    const by: string[][] = Array.from({ length: scene.level + 1 }, () => []);
    const far: string[][] = Array.from({ length: scene.level + 1 }, () => []);
    for (const t of scene.tiles) {
      if (t.farBand !== null && t.farBand < meet) far[t.farBand].push(polyD(t.pts));
      else if (t.band > 0) by[t.band].push(polyD(t.pts));
    }
    return { bands: by.map((ds) => ds.join('')), farBands: far.map((ds) => ds.join('')) };
  }, [scene]);
  const startTile = scene.tiles.find((t) => t.id === scene.startId)!;
  const farTile = scene.landed ? scene.tiles.find((t) => t.id === scene.landed!.farId)! : null;
  const cx = (scene.crossed.x1 + scene.crossed.x2) / 2, cy = (scene.crossed.y1 + scene.crossed.y2) / 2;
  const levels = Array.from({ length: scene.level }, (_, i) => scene.level - i); // biggest first, so smaller outlines sit on top
  const isFresh = (k: number): boolean => fresh !== null && k > fresh;
  return (
    <svg className="hb__svg" viewBox={viewBox} data-testid="hb-svg" data-level={scene.level} data-tiles={scene.tiles.length}
      data-landed={scene.landed ? scene.landed.farType : ''} data-fresh={fresh ?? ''}>
      {bands.map((d, k) => k > 0 && (
        <path key={`b${k}`} d={d} className={`hb__band${isFresh(k) ? ' is-fresh' : ''}`} fill={LEVEL_COLOURS[k]} data-band={k} />
      ))}
      {farBands.map((d, k) => k > 0 && d && (
        <path key={`fb${k}`} d={d} className="hb__band is-far" fill={FAR_GREYS[k]} data-far-band={k} />
      ))}
      {[startTile, farTile].filter((t) => t !== null).map((t) => (
        <g key={`key-${t!.id}`}>
          <path d={polyD(t!.pts)} className="hb__key" fill={tileColor(t!.type)} />
          <path d={orientationPath(t!.xform)} className="td__flag" />
        </g>
      ))}
      {levels.map((k) => (
        <path key={`o${k}`} d={segsD(scene.outlines[k - 1])} className={`hb__outline${isFresh(k) ? ' is-fresh' : ''}`} stroke={LEVEL_COLOURS[k]}
          strokeWidth={lineWidth(k)} vectorEffect="non-scaling-stroke" data-level={k} />
      ))}
      {scene.landed && scene.landed.farOutlines.map((segs, i) => (
        <path key={`fo${i}`} d={segsD(segs)} className="hb__outline is-far" stroke={LEVEL_COLOURS[i + 1]}
          strokeWidth={lineWidth(i + 1)} vectorEffect="non-scaling-stroke" data-far-level={i + 1} />
      ))}
      {scene.landed && <path d={segsD(scene.landed.wall)} className="hb__wall" stroke={WALL} strokeWidth={lineWidth(scene.level) + 1.5} vectorEffect="non-scaling-stroke" />}
      <path d={segsD([scene.crossed])} className="hb__crossed" strokeWidth={lineWidth(scene.level) + 2.5} vectorEffect="non-scaling-stroke" />
      <circle className="hb__ring" cx={cx} cy={cy} r={Math.max(0.9, 0.035 * size)} vectorEffect="non-scaling-stroke" />
      <title>{start}</title>
    </svg>
  );
}

interface TreeNodeLayout { id: number; x: number; depth: number }

function layoutTree(build: Build): { nodes: TreeNodeLayout[]; width: number; depth: number } {
  const out: TreeNodeLayout[] = [];
  let leaf = 0, depth = 0;
  const walk = (id: number, d: number): number => {
    depth = Math.max(depth, d);
    const n = build.nodes[id];
    const xs = n.children.map((c) => walk(c, d + 1));
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : leaf++;
    out.push({ id, x, depth: d });
    return x;
  };
  walk(0, 0);
  return { nodes: out, width: Math.max(1, leaf), depth };
}

function ChoiceTree({ build, onGoto, onPeek }: { build: Build; onGoto: (id: number) => void; onPeek: (id: number | null) => void }): JSX.Element {
  const { nodes, width, depth } = useMemo(() => layoutTree(build), [build]);
  const COL = 118, ROW = 40, LEFT = 56, TOP = 18;
  const at = new Map(nodes.map((n) => [n.id, n]));
  const px = (n: TreeNodeLayout): number => LEFT + n.x * COL + 12;
  const py = (n: TreeNodeLayout): number => TOP + n.depth * ROW;
  const W = LEFT + width * COL + 60, H = TOP + depth * ROW + 18;
  return (
    <div className="hb__tree-wrap">
      <svg className="hb__tree" width={W} height={H} viewBox={`0 0 ${W} ${H}`} data-testid="hb-tree" data-nodes={build.nodes.length}>
        {Array.from({ length: depth + 1 }, (_, d) => (
          <text key={`row${d}`} x={4} y={TOP + d * ROW + 4} className="hb__tree-row" fill={LEVEL_COLOURS[d]}>{d === 0 ? 'start' : `level ${d}`}</text>
        ))}
        {nodes.filter((n) => build.nodes[n.id].parent !== null).map((n) => {
          const p = at.get(build.nodes[n.id].parent!)!;
          return <line key={`e${n.id}`} x1={px(p)} y1={py(p)} x2={px(n)} y2={py(n)} className="hb__tree-edge" />;
        })}
        {nodes.map((n) => {
          const node = build.nodes[n.id];
          const cross = crossingAt(build, n.id);
          const current = n.id === build.current;
          const label = node.link ? `${node.link.parent} ${node.link.slot}` : `${build.start}, edge ${build.edge}`;
          return (
            <g key={n.id} className={`hb__tree-node${current ? ' is-current' : ''}`} transform={`translate(${px(n)} ${py(n)})`}
              onClick={() => onGoto(n.id)} onMouseEnter={() => onPeek(n.id)} onMouseLeave={() => onPeek(null)} data-testid={`hb-node-${n.id}`}>
              <circle r={current ? 9 : 7} fill={n.depth === 0 ? tileColor(build.start) : LEVEL_COLOURS[n.depth]} />
              <text x={13} y={4} className="hb__tree-label">{label}{cross.ok && <tspan className="hb__tree-land"> → {cross.address.leaf}</tspan>}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HierarchyBuilder(): JSX.Element {
  const [build, dispatch] = useReducer(reduceBuild, 'Gamma' as HexType, (s) => initialBuild(s, 0));
  /** a chain shown on the board instead of the current one: a hovered parent or tree node */
  const [peek, setPeek] = useState<{ chain: Link[]; extends: boolean } | null>(null);
  const [hi, setHi] = useState(0);
  /** the level the view frames; null follows the top */
  const [fit, setFit] = useState<number | null>(null);

  const chain = useMemo(() => chainOf(build, build.current), [build]);
  const level = chain.length;
  const options = useMemo(() => optionsAt(build, build.current), [build]);
  const scene = cachedScene(build.start, build.edge, peek ? peek.chain : chain);
  const cross = crossingAt(build, build.current);
  const framed = fit === null ? scene.level : Math.min(fit, scene.level);

  const peekOption = (i: number | null): void => {
    if (i === null || !options[i]) { setPeek(null); return; }
    setPeek({ chain: [...chain, { slot: options[i].slot, parent: options[i].parent }], extends: true });
  };
  const choose = (i: number): void => {
    const o = options[i];
    if (!o) return;
    dispatch({ type: 'choose', link: { slot: o.slot, parent: o.parent } });
    setPeek(null);
    setHi(0);
  };
  const goto = (id: number): void => { dispatch({ type: 'goto', id }); setPeek(null); setHi(0); };

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT') { e.stopPropagation(); return; }
    if (target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.stopPropagation(); return; }
    let used = true;
    if (/^[0-5]$/.test(e.key)) dispatch({ type: 'edge', edge: Number(e.key) });
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && options.length) { const i = (hi + 1) % options.length; setHi(i); peekOption(i); }
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && options.length) { const i = (hi - 1 + options.length) % options.length; setHi(i); peekOption(i); }
    else if (e.key === 'Enter') choose(hi);
    else if (e.key === 'Backspace') { dispatch({ type: 'up' }); setPeek(null); setHi(0); }
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  };

  const top = level ? chain[level - 1].parent : build.start;
  const status = cross.ok
    ? <>Across edge {build.edge}: a <strong>{cross.address.leaf}</strong>, entered through its edge {cross.edge}. The two sides first share a supertile at
      level {cross.level}. Below that level the far side is grey, its supertiles dashed, and the dark line is where it touches the start tile's side.</>
    : level === 0
      ? <>A {build.start} alone. Edge {build.edge} is on its outside, so what is across it is not known yet: choose a parent.</>
      : level >= MAX_BUILD_LEVEL
        ? <>Edge {build.edge} is still on the outside of the level-{level} {top}, and level {MAX_BUILD_LEVEL} is as high as this view goes. Click an earlier node in the tree to try another branch.</>
        : <>Edge {build.edge} is still on the outside of the level-{level} {top}: choose its parent.</>;

  const note = (o: (typeof options)[number]): string =>
    o.needs === 1 ? `lands: a ${o.landingType}` : o.repeats ? 'the same again: still outside' : o.needs === null ? `no landing by level ${MAX_BUILD_LEVEL}` : `lands after ${o.needs - 1} more`;

  return (
    <div className="hb" tabIndex={0} onKeyDown={onKey} data-testid="hb">
      <div className="td__controls">
        <label>Start with a
          <select value={build.start} onChange={(e) => { dispatch({ type: 'start', start: e.target.value as HexType }); setPeek(null); setHi(0); e.currentTarget.blur(); }} data-testid="hb-start">
            {HEX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <span className="hb__edges">and cross edge
          {[0, 1, 2, 3, 4, 5].map((e) => (
            <button key={e} type="button" className={`td__chip${build.edge === e ? ' is-active' : ''}`} aria-pressed={build.edge === e}
              onClick={(ev) => { dispatch({ type: 'edge', edge: e }); ev.currentTarget.blur(); }} data-testid={`hb-edge-${e}`}>{e}</button>
          ))}
        </span>
        <span className="hb__fit">Frame
          {Array.from({ length: scene.level + 1 }, (_, k) => (
            <button key={k} type="button" className={`td__chip${k === framed ? ' is-active' : ''}`} aria-pressed={k === framed}
              onClick={(ev) => { setFit(k === scene.level ? null : k); ev.currentTarget.blur(); }} data-testid={`hb-fit-${k}`}
              style={{ borderColor: k ? LEVEL_COLOURS[k] : undefined }}>
              {k === 0 ? 'tiles' : `level ${k}`}
            </button>
          ))}
        </span>
      </div>
      <div className="hb__body">
        <SceneView scene={scene} fresh={peek?.extends ? level : null} fit={framed} start={build.start} />
        <div className="hb__side">
          <p className="hb__status" data-testid="hb-status">{status}</p>
          {options.length > 0 && (
            <div className="hb__options" onMouseLeave={() => peekOption(null)} data-testid="hb-options">
              <p className="td__hint">
                Parents a {level ? `level-${level} ` : ''}{top} can have. The {level ? 'supertile' : 'tile'} so far is the{' '}
                <span style={{ color: level ? LEVEL_COLOURS[level] : tileColor(build.start) }}>■</span> child; the outline is the new{' '}
                <span style={{ color: LEVEL_COLOURS[level + 1] }}>level {level + 1}</span>.
              </p>
              {options.map((o, i) => (
                <button key={`${o.parent}-${o.slot}`} type="button" className={`hb__option${i === hi ? ' is-active' : ''}${o.needs === 1 ? ' lands' : ''}`}
                  onMouseEnter={() => { setHi(i); peekOption(i); }} onFocus={() => { setHi(i); peekOption(i); }}
                  onClick={() => choose(i)} data-testid={`hb-option-${o.parent}-${o.slot}`}>
                  <ParentThumb parent={o.parent} slot={o.slot} inner={level ? LEVEL_COLOURS[level] : tileColor(build.start)} outer={LEVEL_COLOURS[level + 1]} />
                  <span className="hb__option-text">
                    <strong>{o.parent}</strong> <span className="td__hint">slot {o.slot}</span>
                    <span className="hb__option-note">{note(o)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <h3 className="hb__tree-title">Choices so far</h3>
      <ChoiceTree build={build} onGoto={goto} onPeek={(id) => setPeek(id === null ? null : { chain: chainOf(build, id), extends: false })} />
    </div>
  );
}

export default HierarchyBuilder;
