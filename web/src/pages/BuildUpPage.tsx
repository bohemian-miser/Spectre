/**
 * Build-up: a combination's supertiles built one level at a time.
 *
 * With no circuit selected, the viewer shows the chosen type's supertile at
 * the chosen level: built from its children's route tables (each child's
 * routes that make up the supertile's routes), or every route as the
 * strand's path. With a circuit selected, each level below the one it
 * closes at shows just the routes it uses there, in the supertiles it runs
 * through, thicker for routes it passes more often (`buildup/circuitRoutes.ts`
 * counts them); beside it, the circuit of the same children two levels up or
 * down. Tables and circuits come from the renormalisation
 * (`shapes/circuitShapes.ts`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { tileColor } from '../lib/palette';
import type { HexType } from '../core';
import type { Box } from '../lib/viewport';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { closingsByLevel, groupsAt, type Closing } from './buildup/buildup';
import { circuitUse, closedUse, joinedRoutes, type LevelUse } from './buildup/circuitRoutes';
import { GroupStrip } from './buildup/GroupStrip';
import { PassesPane, type Frame } from './buildup/PassesPane';
import { Viewer, type Lines, type Mark, type ViewerApi } from './buildup/Viewer';
import { Geometry, IDENTITY, ringOf, chooseStop, circuitPasses, linesPerStop, mapBox, routePasses, routeSet, signature, subPasses, type Pass } from './buildup/viewer';
import '../styles/shapes.css';
import '../styles/buildup.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 6 };
/** Most lines drawn for the part of the supertile in view. */
const BUDGET = 150000;
/** Shades routes are drawn in, by tiles. */
const SHADES = 6;
/** Most passes of a circuit drawn at one level. */
const MAX_PASSES = 250000;

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
const ringBox = (a: Float64Array): Box => {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < a.length; i += 2) out.push({ x: a[i], y: a[i + 1] });
  return boxOf(out);
};
const grow = (b: Box, f: number): Box => {
  const m = f * Math.max(b.max.x - b.min.x, b.max.y - b.min.y, 1e-9);
  return { min: { x: b.min.x - m, y: b.min.y - m }, max: { x: b.max.x + m, y: b.max.y + m } };
};

/** The combination, level and circuit asked for in the address. */
function fromAddress(): { choice: ComboChoice; level: number | null; circuit: number | null } {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const rule = q.get('rule'), combo = q.get('combo');
  const level = Number(q.get('level')) || null, circuit = Number(q.get('circuit')) || null;
  const choice = rule && combo && /^\d+$/.test(rule) && /^[0-9a-z]{9}$/.test(combo)
    ? { subset: [...rule].map(Number), combo, level: Math.max(level ?? 0, DEFAULT.level) }
    : { ...DEFAULT, level: Math.max(level ?? 0, DEFAULT.level) };
  return { choice, level, circuit };
}

/** Routes of every type at a level, once per pair. */
const routesAt = (cs: CircuitShapes, n: number): number =>
  Object.values(cs.levels[n]).reduce((s, T) => s + Array.from(T.crossings()).filter((k) => T.mate(k) > k).length, 0);

export default function BuildUpPage(): JSX.Element {
  const asked = useRef(fromAddress());
  const [choice, setChoice] = useState<ComboChoice>(asked.current.choice);
  const cs = useRef<CircuitShapes | null>(null);
  const [built, setBuilt] = useState(0);
  const [level, setLevel] = useState(1);
  const [type, setType] = useState<HexType>('Delta');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [circ, setCirc] = useState<Closing | null>(null);
  const [routeSel, setRouteSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<'children' | 'paths'>('children');
  const [compare, setCompare] = useState(false);
  const [rest, setRest] = useState(false);
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
          setCirc(null);
          setRouteSel(null);
          setBuilt(1);
          setLevel(1);
          show ??= fresh.level;
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
    const a = asked.current;
    buildTo(a.choice.level, a.choice, a.level ?? a.choice.level);
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

  // the circuit asked for in the address, once its level is built
  useEffect(() => {
    const want = asked.current.circuit;
    if (!want || busy || circ) return;
    for (const cl of closings) {
      const c = cl.find((x) => x.length === want && x.first === x.circuit.level);
      if (c) {
        asked.current.circuit = null;
        setCirc(c);
        return;
      }
    }
  }, [closings, busy, circ]);
  // the address follows what is shown
  useEffect(() => {
    if (!now) return;
    const q = new URLSearchParams({ rule: choice.subset.join(''), combo: choice.combo, level: String(level) });
    if (circ) q.set('circuit', String(circ.length));
    history.replaceState(null, '', `${location.pathname}?${q}`);
  }, [now, choice, level, circ]);

  const shownType: HexType = type;
  const T = ready ? now!.levels[level][shownType] : null;
  const rs = useMemo(() => (ready ? routeSet(now!, level, shownType) : null), [ready, now, level, shownType]);
  const perStop = useMemo(() => (g && rs ? linesPerStop(g, rs) : []), [g, rs]);
  const frame = useMemo(() => (ready && g ? ringBox(ringOf(g, level, shownType).pts) : null), [ready, g, level, shownType]);
  const span = useMemo(() => {
    if (!g) return [] as number[];
    return Array.from({ length: Math.max(1, level) }, (_, s) => {
      const b = g.box(s, 'Delta');
      return Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
    });
  }, [g, level]);
  const logMax = rs && rs.tiles.length ? Math.log(rs.tiles[rs.tiles.length - 1]) : 0;
  const shadeOf = (tiles: number) => (logMax > 0 ? Math.min(SHADES - 1, Math.floor((Math.log(tiles) / logMax) * SHADES)) : SHADES - 1);


  const routeLines: Lines | null = useMemo(() => {
    if (!g || !rs) return null;
    return {
      key: `${choice.combo} ${level} ${shownType}`,
      count: rs.from.length,
      points: (i, stop, view, edge) => g.source(level, shownType, rs.from[i], IDENTITY, stop, view, edge),
      // next to the outline, down to children under two pixels across, as the outline's own crossings are
      edge: (scale) => {
        let s = 0;
        while (s + 1 < span.length && span[s + 1] * scale < 2) s++;
        return s;
      },
      style: (i) => shadeOf(rs.tiles[i]),
      styles: Array.from({ length: SHADES }, (_, s) => ({
        color: '--accent',
        width: 0.7 + (0.9 * s) / (SHADES - 1),
        alpha: 0.32 + (0.68 * s) / (SHADES - 1),
      })),
      stop: (scale, inView) => chooseStop(perStop, Math.min(1, 3 * inView), BUDGET, (s) => scale * span[s]),
    };
  }, [g, rs, perStop, span, choice.combo, level, shownType]); // eslint-disable-line react-hooks/exhaustive-deps
  const routeMarks = useMemo(() => {
    if (!now || !ready) return () => [];
    // the outline through every crossing on the border, as fine as the routes beside it are drawn
    const outline: Mark = { pts: ringOf(g!, level, shownType).pts, color: '--muted', width: 1 };
    return (): Mark[] => [outline];
  }, [now, g, ready, level, shownType]);
  const selRoute = routeSel !== null && rs ? rs.from.indexOf(routeSel) : -1;
  const highlight = useMemo(() => {
    const out: { i: number; color: string; width: number }[] = [];
    if (selRoute >= 0) out.push({ i: selRoute, color: '--danger', width: 3 });
    if (hover !== null && hover !== selRoute) out.push({ i: hover, color: '--text', width: 2.5 });
    return out;
  }, [selRoute, hover]);
  const routeInfo = useMemo(() => {
    if (!g || !T || routeSel === null || level === 0) return null;
    const steps = g.enters(level, shownType, routeSel);
    const kx = g.kidX(level, shownType);
    const seen: { slot: number; type: string; passes: number }[] = [];
    for (const e of steps) {
      const s = seen.find((x) => x.slot === e.slot);
      if (s) s.passes++;
      else seen.push({ slot: e.slot, type: e.type, passes: 1 });
    }
    return { steps: steps.length, children: seen, box: (slot: number, t: string) => mapBox(kx[slot], g.box(level - 1, t)) };
  }, [g, T, routeSel, level, shownType]);

  // every route of the supertile as its children's routes
  const allPasses = useMemo(() => {
    if (!g || !now || !ready || level === 0 || mode !== 'children') return null;
    return Array.from(routeSet(now, level, shownType).from).flatMap((k) => routePasses(g, level, shownType, k));
  }, [g, now, ready, level, shownType, mode]);

  // ---- a selected circuit, level by level ----
  const twin = useMemo(() => {
    if (!circ) return null;
    for (const m of [circ.circuit.level + 2, circ.circuit.level - 2]) {
      const t = (closings[m] ?? []).filter((x) => x.family === circ.family && x.first === m).sort((a, b) => b.length - a.length)[0];
      if (t) return t;
    }
    return null;
  }, [circ, closings]);
  const uses = useRef(new Map<Closing, LevelUse[]>());
  const passCache = useRef(new Map<Closing, (Pass[] | undefined)[]>());
  useEffect(() => { uses.current.clear(); passCache.current.clear(); }, [now]);
  const useOf = (c: Closing): LevelUse[] => {
    let u = uses.current.get(c);
    if (!u) uses.current.set(c, (u = circuitUse(now!, c.circuit)));
    return u;
  };
  /** The circuit's passes at level k (its joins at its own level), or null when too many to draw. */
  const passesOf = (c: Closing, k: number): Pass[] | null => {
    const N = c.circuit.level;
    const at = Math.min(k, N - 1);
    if (at < 0) return null;
    if (useOf(c)[at].passes > MAX_PASSES) return null;
    let list = passCache.current.get(c);
    if (!list) passCache.current.set(c, (list = []));
    if (!list[N - 1]) list[N - 1] = circuitPasses(g!, c.circuit);
    for (let L = N - 1; L > at; L--) if (!list[L - 1]) list[L - 1] = list[L]!.flatMap((p) => subPasses(g!, p));
    return list[at]!;
  };
  const sideOf = (c: Closing, k: number) => {
    const N = c.circuit.level;
    if (k > N || k < 0) return null;
    const passes = passesOf(c, k);
    const u = useOf(c)[Math.min(k, N - 1)];
    const top = passesOf(c, N)!;
    const frame: Frame = { outline: ringOf(g!, N, c.circuit.type).pts, box: grow(boxOf(top.flatMap((p) => [p.a, p.b])), 0.06) };
    const counts = (p: Pass) => {
      const m = now!.levels[p.level][p.type].mate(p.k);
      return useOf(c)[p.level].byType.get(p.type as HexType)?.get(m < 0 ? p.k : Math.min(p.k, m)) ?? 1;
    };
    const line = k === N
      ? `The ${nf(c.length)}-tile circuit closes at level ${N}, joining ${nf(u.passes)} routes of its children`
      : `The ${nf(c.length)}-tile circuit at level ${k}: ${nf(u.routes)} of ${nf(routesAt(now!, k))} routes, ${nf(u.passes)} passes`;
    return { c, k, passes, frame, counts, line };
  };
  const circuitView = circ && ready && level <= circ.circuit.level;
  // routes on circuits closing above the level shown, once per level and build
  const closed = useMemo(() => (ready && level > 0 ? closedUse(now!, level) : null), [ready, now, level, built]); // eslint-disable-line react-hooks/exhaustive-deps
  const joins = useMemo(() => (circ && ready && level === circ.circuit.level ? { types: [circ.circuit.type as HexType], ...joinedRoutes(now!, circ.circuit) } : null), [circ, ready, now, level]);
  const left = useMemo(() => (circuitView && g ? sideOf(circ!, level) : null), [circuitView, g, circ, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => (circuitView && compare && twin && g ? sideOf(twin, level + twin.circuit.level - circ!.circuit.level) : null),
    [circuitView, compare, twin, g, circ, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const matched = useMemo(() => {
    if (!g || !left?.passes || !right?.passes) return { l: null, r: null };
    const sl = left.passes.map((p) => signature(g, p)), sr = right.passes.map((p) => signature(g, p));
    const a = new Set(sl), b = new Set(sr);
    return { l: sl.map((s) => b.has(s)), r: sr.map((s) => a.has(s)) };
  }, [g, left, right]);

  const goLevel = (n: number) => {
    setLevel(n);
    setRouteSel(null);
    setHover(null);
    setHoverL(null);
    setHoverR(null);
  };
  const pickCircuit = (c: Closing) => {
    setCirc(circ && circ.key === c.key && circ.circuit.level === c.circuit.level ? null : c);
    setHoverL(null);
  };
  const group = groups.find((gr) => gr.includes(shownType)) ?? [shownType];
  const showing = level === 0 ? 'paths' : mode;

  const sidePane = (s: NonNullable<typeof left>, hovered: number | null, onHover: (i: number | null) => void, api: typeof leftApi, m: readonly boolean[] | null, testId: string) => (
    <div className="bu-side-by">
      <p className="bu-line" data-testid={`${testId}-line`}>{s.line}</p>
      {s.passes ? (
        <PassesPane g={g!} frame={s.frame} fitKey={`${s.c.key} ${s.c.circuit.level}`} passes={s.passes} passesOf={s.counts} rest={rest} matched={m}
          apiRef={api} hovered={hovered} onHover={onHover} label={s.line} testId={testId} />
      ) : <p className="bu-muted bu-none">Over {nf(MAX_PASSES)} passes at this level: too many to draw. Step up a level.</p>}
    </div>
  );

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
          <ComboPicker busy={busy} onAdd={(c) => buildTo(c.level, c)} levels="any" verb="Build" initialLevel={DEFAULT.level} initialCombo={choice.combo} />
        </details>
        <div className="bu-stepper" role="group" aria-label="Level">
          <button type="button" disabled={level <= 0} onClick={() => goLevel(level - 1)} aria-label="Level down" data-testid="bu-level-down">◀</button>
          <span data-testid="bu-level">{level === 0 ? 'Tiles' : `Level ${level}`}</span>
          <button type="button" disabled={level >= built} onClick={() => goLevel(level + 1)} aria-label="Level up" data-testid="bu-level-up">▶</button>
          <button type="button" className="bu-build" disabled={busy} onClick={() => buildTo(built + 1, undefined, built + 1)} data-testid="bu-next">
            {busy ? `Building level ${built + 1}…` : `Build level ${built + 1}`}
          </button>
        </div>
        {!circuitView && (
          <>
            <div className="bu-toggle" role="group" aria-label="Drawing">
              <button type="button" aria-pressed={showing === 'children'} className={showing === 'children' ? 'is-active' : ''} disabled={level === 0} onClick={() => setMode('children')} data-testid="bu-mode-children">Built from children</button>
              <button type="button" aria-pressed={showing === 'paths'} className={showing === 'paths' ? 'is-active' : ''} onClick={() => setMode('paths')} data-testid="bu-mode-paths">Strand paths</button>
            </div>
          </>
        )}
        {circuitView && (
          <>
            <label className="bu-check">
              <input type="checkbox" checked={rest} onChange={(e) => setRest(e.target.checked)} data-testid="bu-rest" />
              Show the rest, faint
            </label>
            <label className="bu-check">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} disabled={!twin} data-testid="bu-compare" />
              Beside {twin ? `the ${nf(twin.length)}-tile circuit of the same children` : 'a circuit of the same children (none built)'}
            </label>
          </>
        )}
      </div>
      {error && <p className="bu-error">{error}</p>}
      {ready && g && level > 0 && (
        <GroupStrip g={g} level={level} groups={groups} type={shownType} onPick={(t) => { setType(t); setRouteSel(null); setHover(null); }}
          use={circ && level < circ.circuit.level ? useOf(circ)[level] : null} closed={closed} joins={joins} built={built} />
      )}

      <section className="bu-strip" data-testid="bu-circuits">
        {circ && (
          <span className="bu-picked" data-testid="bu-picked">
            Following the {nf(circ.length)}-tile circuit (closes at level {circ.circuit.level})
            <button type="button" onClick={() => setCirc(null)} aria-label="Stop following this circuit">✕</button>
          </span>
        )}
        <span className="bu-strip-head">Circuits closing at {level === 0 ? 'the tiles' : `level ${level}`}</span>
        {here.length === 0 ? <span className="bu-muted">none</span> : here.map((c) => (
          <button key={c.key} type="button" className={circ?.key === c.key && circ.circuit.level === level ? 'is-active' : ''} onClick={() => pickCircuit(c)}
            title={`Through children ${[...c.family].join(', ')}${c.first < level ? `; also closes at level ${c.first}` : ''}`} data-testid="bu-circuit">
            {nf(c.length)} tiles{c.first < level ? '' : ' · new'}
          </button>
        ))}
      </section>

      {ready && (
        <div className={`bu-main${circuitView && right ? ' is-compare' : ''}`}>
          {circuitView && left && sidePane(left, hoverL, setHoverL, leftApi, matched.l, 'bu-passes-left')}
          {circuitView && compare && (right ? sidePane(right, hoverR, setHoverR, rightApi, matched.r, 'bu-passes-right')
            : <p className="bu-muted bu-none">The other circuit has no level {level + (twin ? twin.circuit.level - circ!.circuit.level : 0)}.</p>)}
          {!circuitView && showing === 'children' && allPasses && frame && g && (
            <div className="bu-side-by">
              <p className="bu-line">{`A level-${level} ${shownType}: ${nf(rs?.from.length ?? 0)} routes, made of ${nf(allPasses.length)} routes of its children`}</p>
              <PassesPane g={g} frame={{ outline: ringOf(g, level, shownType).pts, box: frame }} fitKey={`${choice.combo} ${level} ${shownType}`} passes={allPasses}
                apiRef={leftApi} hovered={hoverL} onHover={setHoverL} label={`A level-${level} ${shownType} built from its children's routes`} testId="bu-children" />
            </div>
          )}
          {!circuitView && showing === 'paths' && routeLines && frame && (
            <div className="bu-side-by">
              <p className="bu-line">{`A level-${level} ${shownType}: ${nf(rs?.from.length ?? 0)} routes, each drawn as the strand's path`}</p>
              <Viewer
                frame={frame}
                fitKey={`${choice.combo} ${level} ${shownType}`}
                lines={routeLines}
                marks={routeMarks}
                hovered={hover}
                onHover={setHover}
                onPick={(i) => setRouteSel(i === null ? null : rs!.from[i])}
                highlight={highlight}
                tooltip={(i) => `Route from crossing ${rs!.from[i]} to ${T!.mate(rs!.from[i])}: ${nf(rs!.tiles[i])} tiles`}
                apiRef={viewer}
                label={`A level-${level} ${shownType} and its routes`}
              >
                <div className="bv-legend">
                  <span>Tiles</span>
                  <i className="bv-ramp" />
                  <span>1 to {nf(rs!.tiles[rs!.tiles.length - 1] ?? 1)}</span>
                </div>
              </Viewer>
            </div>
          )}

          <aside className="bu-side" data-testid="bu-side">
            {circuitView ? (
              <>
                <h2>{nf(circ!.length)}-tile circuit</h2>
                <p className="bu-muted">
                  It closes in a level-{circ!.circuit.level} {circ!.circuit.type}. At each level below, it is drawn by the routes it uses there, in the supertiles it runs through: each supertile filled in its type's colour, each route a line from where the strand enters to where it leaves, thicker for a route the circuit passes more often in all. Step down with ◀; click a route to zoom to it.
                </p>
                {compare && right && <p className="bu-muted">Faint: routes whose child types the other circuit also has at its level; bold: the rest.</p>}
              </>
            ) : showing === 'children' ? (
              <>
                <h2>{level === 0 ? 'A tile' : `A level-${level} ${shownType}`}</h2>
                <p className="bu-muted">
                  Built from its children's route tables alone, glued at the crossings they share: each child filled in its type's colour, each line one of its routes, straight from where the strand enters the child to where it leaves. Pick a circuit below to follow it down the levels.
                </p>
                {group.length > 1 && <p className="bu-muted">{shownType} has the same routes as {group.filter((t) => t !== shownType).join(', ')}.</p>}
              </>
            ) : routeSel !== null && T && routeInfo ? (
              <>
                <h2>{nf(T.len(routeSel))} tiles</h2>
                <p className="bu-muted">Route from crossing {routeSel} to {T.mate(routeSel)} of a level-{level} {shownType}. It runs through {routeInfo.children.length === 1 ? 'this child' : 'these children, in order'}, entering {routeInfo.children.length === 1 ? 'it' : 'them'} {routeInfo.steps === 1 ? 'once' : `${nf(routeInfo.steps)} times in all`}:</p>
                <div className="bu-kids">
                  {routeInfo.children.map((c) => (
                    <button key={c.slot} type="button" style={{ background: tileColor(c.type) }} onClick={() => viewer.current?.fit(routeInfo.box(c.slot, c.type))} title="Zoom to this child">
                      {c.type} <span>child {c.slot}{c.passes > 1 ? `, ×${c.passes}` : ''}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setRouteSel(null)}>Clear</button>
              </>
            ) : (
              <>
                <h2>{level === 0 ? 'A tile' : `A level-${level} ${shownType}`}</h2>
                <p className="bu-muted">
                  {group.length > 1 ? `The same routes as ${group.filter((t) => t !== shownType).join(', ')}. ` : ''}Drag to move, scroll or pinch to zoom; point at a route to read it, click to select it.
                </p>
              </>
            )}
          </aside>
        </div>
      )}

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
