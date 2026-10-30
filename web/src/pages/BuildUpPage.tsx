/**
 * Build-up: a combination's supertiles built one level at a time, each
 * supertile shown with every route through it, the strand's path from the
 * crossing where it enters to the crossing where it leaves. Types whose
 * routes join the same crossings through as many tiles share a chip. A
 * route or a circuit can be broken into its passes through the children,
 * level by level, and set beside another (`buildup/PassesPane.tsx`).
 * Tables and circuits come from the renormalisation (`shapes/circuitShapes.ts`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { tileColor } from '../lib/palette';
import type { HexType } from '../core';
import type { Box } from '../lib/viewport';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { closingsByLevel, groupsAt, type Closing } from './buildup/buildup';
import { CORE_TYPES, coreRoutes, extraRoutes } from './buildup/routes';
import { PassesPane, MAX_PASSES, type Depth, type Frame } from './buildup/PassesPane';
import { Viewer, type Lines, type Mark, type ViewerApi } from './buildup/Viewer';
import {
  Geometry, IDENTITY, chooseStop, circuitPasses, linesPerStop, mapBox, routePasses, routeSet, signature, subCount, subPasses, type Pass,
} from './buildup/viewer';
import '../styles/shapes.css';
import '../styles/buildup.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 6 };
/** Most lines drawn for the part of the supertile in view. */
const BUDGET = 150000;
/** Shades routes are drawn in, by tiles. */
const SHADES = 6;

const boxOf = (xs: Iterable<{ x: number; y: number }>): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of xs) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
};
const ptsBox = (a: Float64Array): Box => {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < a.length; i += 2) out.push({ x: a[i], y: a[i + 1] });
  return boxOf(out);
};
const flat = (pts: readonly { x: number; y: number }[]): Float64Array => {
  const out = new Float64Array(2 * pts.length + 2);
  pts.forEach((p, i) => { out[2 * i] = p.x; out[2 * i + 1] = p.y; });
  out[2 * pts.length] = pts[0].x;
  out[2 * pts.length + 1] = pts[0].y;
  return out;
};

/** One breakdown into passes: what it is of, the supertile it is drawn in, and the depths opened so far. */
interface Side {
  readonly title: string;
  readonly n: number;
  readonly type: string;
  readonly stack: readonly Depth[];
}

/** What is selected: a route of the shown type, or a circuit closing at the shown level. */
type Selection = { kind: 'route'; from: number } | { kind: 'circuit'; closing: Closing };

export default function BuildUpPage(): JSX.Element {
  const [choice, setChoice] = useState<ComboChoice>(DEFAULT);
  const cs = useRef<CircuitShapes | null>(null);
  const [built, setBuilt] = useState(0);
  const [level, setLevel] = useState(1);
  const [type, setType] = useState<HexType>('Delta');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [differs, setDiffers] = useState(false);
  const [sel, setSel] = useState<Selection | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<'routes' | 'passes'>('passes');
  const [compare, setCompare] = useState(false);
  const [sides, setSides] = useState<{ left: Side; right: Side | null } | null>(null);
  const [hoverL, setHoverL] = useState<number | null>(null);
  const [hoverR, setHoverR] = useState<number | null>(null);
  const viewer = useRef<ViewerApi | null>(null);
  const leftApi = useRef<ViewerApi | null>(null);
  const rightApi = useRef<ViewerApi | null>(null);

  // builds a level at a time, each in its own task so the page can draw between them
  const buildTo = (target: number, fresh?: ComboChoice, show?: number): void => {
    setBusy(true);
    setError(null);
    const step = (): void => {
      try {
        const now = cs.current;
        if (!now) return;
        if (now.maxLevel >= target) {
          setBuilt(now.maxLevel);
          if (show !== undefined) setLevel(show);
          setBusy(false);
          return;
        }
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
          setSel(null);
          setBuilt(1);
          setLevel(1);
          show = fresh.level;
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

  const now = cs.current;
  const ready = now !== null && level <= built;
  const g = useMemo(() => (now ? new Geometry(now) : null), [now, built]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => (ready ? groupsAt(now!, level) : []), [ready, now, level]);
  const closings = useMemo(() => (now ? closingsByLevel(now) : []), [now, built]);
  const here = closings[level] ?? [];
  // a built level never changes, so each level's count is worked out once
  const counted = useRef<{ cs: CircuitShapes | null; counts: number[] }>({ cs: null, counts: [] });
  const groupCounts = useMemo(() => {
    if (!now) return [];
    if (counted.current.cs !== now) counted.current = { cs: now, counts: [] };
    const { counts } = counted.current;
    for (let k = counts.length; k <= built; k++) counts.push(groupsAt(now, k).length);
    return counts.slice(0, built + 1);
  }, [now, built]);

  const circuit = sel?.kind === 'circuit' ? sel.closing : null;
  const shownType: HexType = circuit ? (circuit.circuit.type as HexType) : type;
  const rs = useMemo(() => (ready ? routeSet(now!, level, shownType) : null), [ready, now, level, shownType]);
  const perStop = useMemo(() => (g && rs ? linesPerStop(g, rs) : []), [g, rs]);
  const frame = useMemo(() => (ready ? boxOf(now!.outline(level, shownType)) : null), [ready, now, level, shownType]);
  const span = useMemo(() => {
    if (!g) return [] as number[];
    return Array.from({ length: Math.max(1, level) }, (_, s) => {
      const b = g.box(s, 'Delta');
      return Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
    });
  }, [g, level]);
  const logMax = rs && rs.tiles.length ? Math.log(rs.tiles[rs.tiles.length - 1]) : 0;
  const shadeOf = (tiles: number) => (logMax > 0 ? Math.min(SHADES - 1, Math.floor((Math.log(tiles) / logMax) * SHADES)) : SHADES - 1);

  const core = useMemo(() => (ready && differs ? coreRoutes(now!, level) : null), [ready, now, level, differs]);
  const extras = useMemo(() => (core ? extraRoutes(now!, level, shownType, core) : null), [core, now, level, shownType]);
  const isExtra = useMemo(() => {
    if (!extras || !rs) return null;
    const at = new Set(extras.map((r) => r[0]));
    return Array.from(rs.from, (k) => at.has(k));
  }, [extras, rs]);
  const routeLines: Lines | null = useMemo(() => {
    if (!g || !rs) return null;
    const faded = circuit !== null;
    return {
      key: `${choice.combo} ${level} ${shownType} ${faded} ${isExtra ? 'core' : ''}`,
      count: rs.from.length,
      points: (i, stop, view) => g.source(level, shownType, rs.from[i], IDENTITY, stop, view),
      style: (i) => (isExtra?.[i] ? SHADES : shadeOf(rs.tiles[i])),
      styles: [
        ...Array.from({ length: SHADES }, (_, s) => ({
          color: '--accent',
          width: 0.7 + (0.9 * s) / (SHADES - 1),
          alpha: (faded || isExtra ? 0.3 : 1) * (0.32 + (0.68 * s) / (SHADES - 1)),
        })),
        { color: '--danger', width: 2.2, alpha: 1 },
      ],
      stop: (scale, inView) => chooseStop(perStop, Math.min(1, 3 * inView), BUDGET, (s) => scale * span[s]),
    };
  }, [g, rs, perStop, span, circuit, choice.combo, level, shownType, isExtra]); // eslint-disable-line react-hooks/exhaustive-deps

  const routeMarks = useMemo(() => {
    if (!now || !g || !ready) return () => [];
    // the outline through crossings on the border; children's are left out, their few crossings making poor outlines that cut across the strands
    const outline: Mark = { pts: flat(now.outline(level, shownType)), color: '--muted', width: 1 };
    return (stop: number, view: Box | null): Mark[] => {
      const out = [outline];
      if (circuit) out.push({ pts: g.circuit(circuit.circuit, stop, view), color: '--danger', width: 2 });
      return out;
    };
  }, [now, g, ready, level, shownType, circuit]);

  const selRoute = sel?.kind === 'route' && rs ? rs.from.indexOf(sel.from) : -1;
  const highlight = useMemo(() => {
    const out: { i: number; color: string; width: number }[] = [];
    // a type's extras drawn again on top, so even a short one shows
    if (isExtra && isExtra.filter(Boolean).length <= 2000) isExtra.forEach((x, i) => { if (x) out.push({ i, color: '--danger', width: 2.5 }); });
    if (selRoute >= 0) out.push({ i: selRoute, color: '--danger', width: 3 });
    if (hover !== null && hover !== selRoute) out.push({ i: hover, color: '--text', width: 2.5 });
    return out;
  }, [selRoute, hover, isExtra]);

  // fit the viewer to a circuit when one is picked
  useEffect(() => {
    if (!circuit || !g) return;
    const id = setTimeout(() => viewer.current?.fit(ptsBox(g.circuit(circuit.circuit, Math.max(0, circuit.circuit.level - 3), null))), 60);
    return () => clearTimeout(id);
  }, [circuit, g]);

  const T = ready ? now!.levels[level][shownType] : null;
  const selFrom = sel?.kind === 'route' ? sel.from : null;
  const routeInfo = useMemo(() => {
    if (!g || !T || selFrom === null || level === 0) return null;
    const steps = g.enters(level, shownType, selFrom);
    const kx = g.kidX(level, shownType);
    const seen: { slot: number; type: string; passes: number }[] = [];
    for (const e of steps) {
      const s = seen.find((x) => x.slot === e.slot);
      if (s) s.passes++;
      else seen.push({ slot: e.slot, type: e.type, passes: 1 });
    }
    return { steps: steps.length, children: seen, box: (slot: number, t: string) => mapBox(kx[slot], g.box(level - 1, t)) };
  }, [g, T, selFrom, level, shownType]);

  const frameOf = (n: number, t: string): Frame => {
    const kx = g!.kidX(n, t);
    return {
      outline: now!.outline(n, t),
      children: n > 0 ? now!.childTypes(n, t).map((ch) => now!.outline(n - 1, ch.type).map((p) => {
        const x = kx[ch.pos];
        return { x: x[0] * p.x + x[1] * p.y + x[2], y: x[3] * p.x + x[4] * p.y + x[5] };
      })) : [],
      box: boxOf(now!.outline(n, t)),
    };
  };

  /**
   * What the children's routes are drawn for: the selected route or circuit,
   * or every route of the supertile (with the toggle, only those beyond the
   * core); and beside it the same two levels up (or down).
   */
  const startPasses = (): void => {
    if (!g || !now || level === 0) return;
    const top = (ps: readonly Pass[]): readonly Depth[] => [{ passes: ps, label: '' }];
    const all = (n: number, t: string): Pass[] => {
      const from = differs ? extraRoutes(now, n, t, coreRoutes(now, n)).filter((r) => r[1] >= 0).map((r) => r[0]) : Array.from(routeSet(now, n, t).from);
      return from.flatMap((k) => routePasses(g, n, t, k));
    };
    const m = level + 2 <= built ? level + 2 : level - 2;
    let right: Side | null = null;
    let left: Side;
    if (sel?.kind === 'circuit') {
      const c = sel.closing;
      left = { title: `${nf(c.length)}-tile circuit, level ${level}`, n: level, type: c.circuit.type, stack: top(circuitPasses(g, c.circuit)) };
      for (const k of [level + 2, level - 2]) {
        const twin = (closings[k] ?? []).filter((x) => x.family === c.family).sort((a, b) => b.length - a.length)[0];
        if (twin) {
          right = { title: `${nf(twin.length)}-tile circuit of the same children, level ${k}`, n: k, type: twin.circuit.type, stack: top(circuitPasses(g, twin.circuit)) };
          break;
        }
      }
    } else if (sel?.kind === 'route') {
      left = { title: `Route of ${nf(T!.len(sel.from))} tiles, level ${level}`, n: level, type: shownType, stack: top(routePasses(g, level, shownType, sel.from)) };
      if (m >= 1) {
        const other = routeSet(now, m, shownType);
        const k = other.from[other.from.length - 1];
        right = { title: `Longest ${shownType} route, level ${m}`, n: m, type: shownType, stack: top(routePasses(g, m, shownType, k)) };
      }
    } else {
      const what = differs ? `${shownType} routes beyond the core` : `Every route of a ${shownType}`;
      left = { title: `${what}, level ${level}`, n: level, type: shownType, stack: top(all(level, shownType)) };
      if (m >= 1) right = { title: `${what}, level ${m}`, n: m, type: shownType, stack: top(all(m, shownType)) };
    }
    setSides({ left, right });
    setHoverL(null);
    setHoverR(null);
  };
  useEffect(() => {
    if (mode === 'passes') startPasses();
  }, [mode, sel, level, shownType, built, g, differs]); // eslint-disable-line react-hooks/exhaustive-deps
  const leftTop = sides?.left.stack[sides.left.stack.length - 1];
  const rightTop = sides?.right?.stack[sides.right.stack.length - 1];
  const leftSigs = useMemo(() => (compare && g && leftTop ? new Set(leftTop.passes.map((p) => signature(g, p))) : null), [compare, g, leftTop]);
  const rightSigs = useMemo(() => (compare && g && rightTop ? new Set(rightTop.passes.map((p) => signature(g, p))) : null), [compare, g, rightTop]);
  // each side framed on what it draws at the top: the whole supertile for all its routes, else the route or circuit
  const frameFor = (side: Side): Frame => {
    const f = frameOf(side.n, side.type);
    if (!sel) return f;
    const ends = side.stack[0].passes.flatMap((p) => [p.a, p.b]);
    const b = boxOf(ends);
    const m = 0.08 * Math.max(b.max.x - b.min.x, b.max.y - b.min.y, 1e-9);
    return { ...f, box: { min: { x: b.min.x - m, y: b.min.y - m }, max: { x: b.max.x + m, y: b.max.y + m } } };
  };
  const frames = useMemo(() => (sides && g ? { left: frameFor(sides.left), right: sides.right ? frameFor(sides.right) : null } : null),
    [sides?.left.title, sides?.right?.title, g]); // eslint-disable-line react-hooks/exhaustive-deps
  const setStack = (which: 'left' | 'right') => (stack: readonly Depth[]) =>
    setSides((s) => (s ? { ...s, [which]: { ...(s[which] as Side), stack } } : s));
  const stepBoth = () => {
    if (!g) return;
    const down = (side: Side | null): Side | null => {
      if (!side) return side;
      const top = side.stack[side.stack.length - 1];
      if (top.passes[0]?.level === 0 || subCount(g, top.passes) > MAX_PASSES) return side;
      return { ...side, stack: [...side.stack, { passes: top.passes.flatMap((p) => subPasses(g, p)), label: '' }] };
    };
    setSides((s) => (s ? { left: down(s.left)!, right: down(s.right) } : s));
  };

  const pickCircuit = (c: Closing) => {
    if (circuit && circuit.key === c.key) setSel(null);
    else {
      setSel({ kind: 'circuit', closing: c });
      setHover(null);
    }
  };
  const goLevel = (n: number) => {
    setLevel(n);
    setSel(null);
    setHover(null);
  };
  const showing = level === 0 ? 'routes' : mode;
  const group = groups.find((gr) => gr.includes(shownType)) ?? [shownType];

  return (
    <div className="bu-page">
      <header className="bu-head">
        <h1>Build-up</h1>
        <p className="bu-muted">
          Each supertile is built from its children, one level at a time. A strand entering a supertile at a crossing on its border leaves by another: that is a route, and a type's route table lists them all. A supertile's routes are its children's routes glued end to end where the children meet; a strand that closes up inside instead is a circuit closing at that level.
        </p>
      </header>

      <div className="bu-bar" data-testid="bu-bar">
        <details className="bu-combo">
          <summary>Combination <b>{choice.subset.join('')} · {choice.combo}</b></summary>
          <ComboPicker busy={busy} onAdd={(c) => buildTo(c.level, c)} levels="any" verb="Build" initialLevel={DEFAULT.level} initialCombo={DEFAULT.combo} />
        </details>
        <div className="bu-stepper" role="group" aria-label="Level">
          <button type="button" disabled={level <= 0} onClick={() => goLevel(level - 1)} aria-label="Level down" data-testid="bu-level-down">◀</button>
          <span data-testid="bu-level">{level === 0 ? 'Tiles' : `Level ${level}`}</span>
          <button type="button" disabled={level >= built} onClick={() => goLevel(level + 1)} aria-label="Level up" data-testid="bu-level-up">▶</button>
          <button type="button" className="bu-build" disabled={busy} onClick={() => buildTo(built + 1, undefined, built + 1)} data-testid="bu-next">
            {busy ? `Building level ${built + 1}…` : `Build level ${built + 1}`}
          </button>
        </div>
        <div className="bu-types" role="group" aria-label="Supertile type">
          {groups.map((gr) => (
            <span key={gr.join()} className={`bu-chip${gr.includes(shownType) ? ' is-active' : ''}`} title={gr.length > 1 ? 'These types have the same routes between the same crossings' : undefined}>
              {gr.map((t) => (
                <button key={t} type="button" className={t === shownType ? 'is-on' : ''} style={{ background: tileColor(t) }} onClick={() => { setType(t); setSel(null); setHover(null); }} data-testid={`bu-type-${t}`}>
                  {t}
                </button>
              ))}
            </span>
          ))}
        </div>
        <label className="bu-check">
          <input type="checkbox" checked={differs} onChange={(e) => setDiffers(e.target.checked)} data-testid="bu-differs" />
          What each type adds to the shared routes
        </label>
        <div className="bu-toggle" role="group" aria-label="Drawing">
          <button type="button" aria-pressed={showing === 'passes'} className={showing === 'passes' ? 'is-active' : ''} disabled={level === 0} onClick={() => setMode('passes')} data-testid="bu-mode-children">Built from children</button>
          <button type="button" aria-pressed={showing === 'routes'} className={showing === 'routes' ? 'is-active' : ''} onClick={() => setMode('routes')} data-testid="bu-mode-paths">Strand paths</button>
        </div>
      </div>
      {error && <p className="bu-error">{error}</p>}

      {ready && (
        <div className={`bu-main${showing === 'passes' && compare ? ' is-compare' : ''}`}>
          {showing === 'routes' && routeLines && frame && (
            <Viewer
              frame={frame}
              fitKey={`${choice.combo} ${level} ${shownType}`}
              lines={routeLines}
              marks={routeMarks}
              hovered={hover}
              onHover={setHover}
              onPick={(i) => { if (circuit) return; setSel(i === null ? null : { kind: 'route', from: rs!.from[i] }); }}
              highlight={highlight}
              tooltip={(i) => `Route from crossing ${rs!.from[i]} to ${T!.mate(rs!.from[i])}: ${nf(rs!.tiles[i])} tiles`}
              apiRef={viewer}
              label={`A level-${level} ${shownType} and its routes`}
              className="bu-viewer"
            >
              <div className="bv-legend">
                <span>Tiles</span>
                <i className="bv-ramp" />
                <span>1 to {nf(rs!.tiles[rs!.tiles.length - 1] ?? 1)}</span>
              </div>
            </Viewer>
          )}
          {showing === 'passes' && g && sides && frames && (
            <>
              <PassesPane g={g} frame={frames.left} title={sides.left.title} stack={sides.left.stack} onStack={setStack('left')}
                other={compare ? rightSigs : null} apiRef={leftApi} hovered={hoverL} onHover={setHoverL} testId="bu-passes-left" />
              {compare && (sides.right && frames.right ? (
                <PassesPane g={g} frame={frames.right} title={sides.right.title} stack={sides.right.stack} onStack={setStack('right')}
                  other={leftSigs} apiRef={rightApi} hovered={hoverR} onHover={setHoverR} testId="bu-passes-right" />
              ) : <p className="bu-muted bu-none">Nothing to compare with two levels up or down among the levels built.</p>)}
            </>
          )}

          <aside className="bu-side" data-testid="bu-side">
            {showing === 'passes' ? (
              <>
                <h2>{sides?.left.title ?? ''}</h2>
                <p className="bu-muted">
                  Built from its children's route tables alone, glued at the crossings they share. Each child is filled in its type's colour; each line is one of its routes, straight from where the strand enters the child to where it leaves, and only those making up {sel?.kind === 'circuit' ? 'the circuit' : sel?.kind === 'route' ? 'the route' : 'its routes'} are drawn. Click a line to open it into its own children's routes.
                </p>
                <label className="bu-check">
                  <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} data-testid="bu-compare" />
                  Beside the same two levels up
                </label>
                {compare && <button type="button" onClick={stepBoth} data-testid="bu-step-both">Both one level down</button>}
                {sel && <button type="button" onClick={() => setSel(null)}>Clear the selection</button>}
              </>
            ) : circuit ? (
              <>
                <h2>{nf(circuit.length)}-tile circuit</h2>
                <p className="bu-muted">Closes inside a level-{level} {circuit.circuit.type}, through its children {[...circuit.family].join(', ')}. The routes are faded; the circuit is drawn over them.</p>
                <button type="button" onClick={() => setMode('passes')} data-testid="bu-to-passes">Built from children</button>
                <button type="button" onClick={() => setSel(null)}>Clear</button>
              </>
            ) : selFrom !== null && T && routeInfo ? (
              <>
                <h2>{nf(T.len(selFrom))} tiles</h2>
                <p className="bu-muted">Route from crossing {selFrom} to {T.mate(selFrom)} of a level-{level} {shownType}. It runs through {routeInfo.children.length === 1 ? 'this child' : 'these children, in order'}, entering {routeInfo.children.length === 1 ? 'it' : 'them'} {routeInfo.steps === 1 ? 'once' : `${nf(routeInfo.steps)} times in all`}:</p>
                <div className="bu-kids">
                  {routeInfo.children.map((c) => (
                    <button key={c.slot} type="button" style={{ background: tileColor(c.type) }} onClick={() => viewer.current?.fit(routeInfo.box(c.slot, c.type))} title="Zoom to this child">
                      {c.type} <span>child {c.slot}{c.passes > 1 ? `, ×${c.passes}` : ''}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setMode('passes')} data-testid="bu-to-passes">Built from children</button>
                <button type="button" onClick={() => setSel(null)}>Clear</button>
              </>
            ) : (
              <>
                <h2>{level === 0 ? 'A tile' : `A level-${level} ${shownType}`}</h2>
                <p className="bu-muted">
                  {nf(rs?.from.length ?? 0)} routes{group.length > 1 ? `, the same as in ${group.filter((t) => t !== shownType).join(', ')}` : ''}. Drag to move, scroll or pinch to zoom; point at a route to read it, click to select it.
                </p>
                {extras && core && (
                  <p className="bu-muted" data-testid="bu-extras">
                    <span className="bu-swatch is-danger" /> {shownType}: {nf(extras.length)} {extras.length === 1 ? 'route' : 'routes'} beyond the {nf(core.length)} routes all types but Gamma share{(CORE_TYPES as readonly string[]).includes(shownType) ? '' : ' (Gamma is not one of them)'}; those {nf(core.length)} drawn faint.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
      )}

      <section className="bu-strip" data-testid="bu-circuits">
        <span className="bu-strip-head">Circuits closing at {level === 0 ? 'the tiles' : `level ${level}`}</span>
        {here.length === 0 ? <span className="bu-muted">none</span> : here.map((c) => (
          <button key={c.key} type="button" className={circuit?.key === c.key ? 'is-active' : ''} onClick={() => pickCircuit(c)} title={`Through children ${[...c.family].join(', ')}${c.first < level ? `; also closes at level ${c.first}` : ''}`} data-testid="bu-circuit">
            {nf(c.length)} tiles{c.first < level ? '' : ' · new'}
          </button>
        ))}
      </section>

      <details className="bu-levels-so-far">
        <summary>Levels so far</summary>
        <table className="bu-summary-table" data-testid="bu-every-level">
          <thead><tr><th>Level</th><th className="num">Different route tables</th><th>Circuits closing (tiles)</th></tr></thead>
          <tbody>
            {closings.map((cl, k) => (
              <tr key={k} className={k === level ? 'is-active' : ''} onClick={() => goLevel(k)}>
                <td>{k === 0 ? 'tiles' : k}</td>
                <td className="num">{groupCounts[k] ?? ''}</td>
                <td>{cl.map((c) => nf(c.length)).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
