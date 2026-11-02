/**
 * Build-up: a combination's supertiles built one level at a time.
 *
 * The levels built so far run down the left (`buildup/Ladder.tsx`), each
 * with the circuits closing at it; the chosen level's types sit in a row
 * above the viewer, and what the viewer shows is listed beside it. A line
 * at the top says what is followed and kept, each undone with its ✕.
 *
 * With no circuit selected, the viewer shows the chosen type's supertile at
 * the chosen level: built from its children's route tables (each child's
 * routes that make up the supertile's routes), or every route as the
 * strand's path. With a circuit selected, each level below the one it
 * closes at shows just the routes it uses there, in the supertiles it runs
 * through, thicker for routes it passes more often (`buildup/circuitRoutes.ts`
 * counts them); beside it, the circuit of the same children two levels up or
 * down. The routes it uses at a level can be kept and the levels above built
 * from them alone (`buildup/kept.ts`): each level then shows the routes
 * that survive and the circuits closing from them. Tables and circuits come
 * from the renormalisation (`shapes/circuitShapes.ts`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { tileColor } from '../lib/palette';
import type { HexType } from '../core';
import type { Box } from '../lib/viewport';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { closingsByLevel, groupsAt, type Closing } from './buildup/buildup';
import { circuitUse, closedUse, joinedRoutes, type LevelUse } from './buildup/circuitRoutes';
import { DeepPane } from './buildup/DeepPane';
import { closesFromKept, keptLevels, type KeptLevel } from './buildup/kept';
import { GroupStrip } from './buildup/GroupStrip';
import { Ladder, type ChipState, type Rung } from './buildup/Ladder';
import { PassesPane, type Frame } from './buildup/PassesPane';
import { Viewer, type Lines, type Mark, type ViewerApi } from './buildup/Viewer';
import { Geometry, IDENTITY, ringOf, chooseStop, circuitPasses, linesPerStop, mapBox, routePasses, routeSet, signature, subPasses, type Pass, type RouteSet } from './buildup/viewer';
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
/** Most routes of a table drawn: the longest. */
const MAX_ROUTES = 30000;
/** Most dropped routes drawn faint behind the kept ones. */
const MAX_DROPPED = 60000;
/** Most points a followed circuit is drawn with over the kept routes. */
const MAX_SHAPE = 20000;

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

/** The combination, level and circuit asked for in the address, and the level whose routes of that circuit are kept. */
function fromAddress(): { choice: ComboChoice; level: number | null; circuit: number | null; keep: number | null; follow: number | null } {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const rule = q.get('rule'), combo = q.get('combo');
  const level = Number(q.get('level')) || null, circuit = Number(q.get('circuit')) || null;
  const keep = q.has('keep') && /^\d+$/.test(q.get('keep')!) ? Number(q.get('keep')) : null;
  // a circuit followed while another's routes are kept
  const follow = Number(q.get('follow')) || null;
  const choice = rule && combo && /^\d+$/.test(rule) && /^[0-9a-z]{9}$/.test(combo)
    ? { subset: [...rule].map(Number), combo, level: Math.max(level ?? 0, DEFAULT.level) }
    : { ...DEFAULT, level: Math.max(level ?? 0, DEFAULT.level) };
  return { choice, level, circuit, keep, follow };
}

/** A circuit whose routes at one level are kept, the levels above built from them alone. */
interface Kept {
  readonly circuit: Closing;
  readonly from: number;
}

/** Routes of every type at a level, once per pair. */
const routesAt = (cs: CircuitShapes, n: number): number =>
  Object.values(cs.levels[n]).reduce((s, T) => s + T.routes(), 0);

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
  const [kept, setKept] = useState<Kept | null>(null);
  const [routeSel, setRouteSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<'children' | 'paths'>('children');
  const [compare, setCompare] = useState(false);
  const [rest, setRest] = useState(false);
  const [hoverL, setHoverL] = useState<number | null>(null);
  const [hoverR, setHoverR] = useState<number | null>(null);
  const [deepOpen, setDeepOpen] = useState(false);
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
          setKept(null);
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

  const routeCounts = useMemo(() => (now ? Array.from({ length: built + 1 }, (_, k) => routesAt(now, k)) : []), [now, built]);

  // the circuit asked for in the address, once its level is built, and the level its routes are kept at
  useEffect(() => {
    const want = asked.current.circuit;
    if (!want || busy || circ) return;
    for (const cl of closings) {
      const c = cl.find((x) => x.length === want && x.first === x.circuit.level);
      if (c) {
        asked.current.circuit = null;
        setCirc(c);
        const keep = asked.current.keep;
        asked.current.keep = null;
        if (keep !== null && keep < c.circuit.level) {
          setKept({ circuit: c, from: keep });
          const follow = asked.current.follow;
          const f = follow ? closings.flat().find((x) => x.length === follow && x.first === x.circuit.level) : undefined;
          if (f) {
            setCirc(f);
            setType(f.circuit.type as HexType);
          }
        }
        return;
      }
    }
  }, [closings, busy, circ]);
  // the address follows what is shown
  useEffect(() => {
    if (!now) return;
    const q = new URLSearchParams({ rule: choice.subset.join(''), combo: choice.combo, level: String(level) });
    if (kept) {
      q.set('circuit', String(kept.circuit.length));
      q.set('keep', String(kept.from));
      if (circ && circ.key !== kept.circuit.key) q.set('follow', String(circ.length));
    } else if (circ) q.set('circuit', String(circ.length));
    history.replaceState(null, '', `${location.pathname}?${q}`);
  }, [now, choice, level, circ, kept]);

  const shownType: HexType = type;
  const T = ready ? now!.levels[level][shownType] : null;
  const uses = useRef(new Map<Closing, LevelUse[]>());
  const passCache = useRef(new Map<Closing, (Pass[] | undefined)[]>());
  useEffect(() => { uses.current.clear(); passCache.current.clear(); }, [now]);
  const useOf = (c: Closing): LevelUse[] => {
    let u = uses.current.get(c);
    if (!u) uses.current.set(c, (u = circuitUse(now!, c.circuit)));
    return u;
  };

  // ---- the routes kept at a level, and the levels built from them alone ----
  // a built level never changes, so each level's kept routes are worked out once per kept circuit
  const keptCache = useRef<{ kept: Kept | null; levels: KeptLevel[] }>({ kept: null, levels: [] });
  const keptAt = useMemo((): KeptLevel[] => {
    if (!kept || !now) return [];
    if (keptCache.current.kept !== kept) keptCache.current = { kept, levels: [] };
    keptCache.current.levels = keptLevels(now, useOf(kept.circuit)[kept.from], built, keptCache.current.levels);
    return keptCache.current.levels;
  }, [kept, now, built]); // eslint-disable-line react-hooks/exhaustive-deps
  const keptView = kept !== null && ready && level >= kept.from && keptAt[level] !== undefined;
  /** Per level above the kept one, the circuits closing there from the kept routes alone. */
  const keptClosings = useMemo((): (Closing[] | undefined)[] => {
    if (!kept || !now) return [];
    return closings.map((cl, k) => (k > kept.from && keptAt[k - 1] ? cl.filter((c) => closesFromKept(now, c.circuit, keptAt[k - 1])) : undefined));
  }, [kept, now, closings, keptAt]);
  const fromKept = keptView && level > kept!.from ? keptClosings[level] ?? null : null;

  /** The routes drawn: every kept route (the longest `MAX_ROUTES`) over the dropped ones, faint, when the kept routes are shown; else the longest routes of the table. */
  const rs = useMemo((): (RouteSet & { cls: Uint8Array | null; keptTotal: number }) | null => {
    if (!ready) return null;
    const all = routeSet(now!, level, shownType, keptView ? Infinity : MAX_ROUTES);
    if (!keptView) return { ...all, cls: null, keptTotal: 0 };
    const K = keptAt[level].byType.get(shownType);
    const own = circ && level < circ.circuit.level ? useOf(circ)[level].byType.get(shownType) : undefined;
    const keptI: number[] = [], dropI: number[] = [];
    all.from.forEach((k, i) => (K?.has(k) ? keptI : dropI).push(i));
    const order = [...dropI.slice(Math.max(0, dropI.length - (rest ? MAX_DROPPED : 0))), ...keptI.slice(Math.max(0, keptI.length - MAX_ROUTES))];
    const cls = Uint8Array.from(order, (i) => (K?.has(all.from[i]) ? (own?.has(all.from[i]) ? 2 : 0) : 1));
    return { level, type: shownType, from: Int32Array.from(order, (i) => all.from[i]), tiles: Float64Array.from(order, (i) => all.tiles[i]), total: all.total, cls, keptTotal: keptI.length };
  }, [ready, now, level, shownType, keptView, keptAt, circ, rest]); // eslint-disable-line react-hooks/exhaustive-deps
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
      // the shades by tiles, then a dropped route, faint, and a route on the followed circuit
      style: (i) => (rs.cls && rs.cls[i] ? SHADES - 1 + rs.cls[i] : shadeOf(rs.tiles[i])),
      styles: [
        ...Array.from({ length: SHADES }, (_, s) => ({
          color: '--accent',
          width: 0.7 + (0.9 * s) / (SHADES - 1),
          alpha: 0.32 + (0.68 * s) / (SHADES - 1),
        })),
        { color: '--muted', width: 0.7, alpha: 0.18 },
        { color: '--danger', width: 1.8, alpha: 1 },
      ],
      stop: (scale, inView) => chooseStop(perStop, Math.min(1, 3 * inView), BUDGET, (s) => scale * span[s]),
    };
  }, [g, rs, perStop, span, choice.combo, level, shownType]); // eslint-disable-line react-hooks/exhaustive-deps
  // the followed circuit where it closes, over the kept routes, drawn down to the lowest level with few enough passes
  const circuitMark = useMemo((): Mark | null => {
    if (!keptView || !circ || level !== circ.circuit.level || shownType !== circ.circuit.type) return null;
    const u = useOf(circ);
    let stop = level - 1;
    while (stop > 0 && u[stop - 1].passes <= MAX_SHAPE) stop--;
    const pts = now!.shape(circ.circuit, stop);
    const out = new Float64Array(2 * pts.length + 2);
    pts.forEach((p, i) => { out[2 * i] = p.x; out[2 * i + 1] = p.y; });
    out[2 * pts.length] = pts[0].x;
    out[2 * pts.length + 1] = pts[0].y;
    return { pts: out, color: '--danger', width: 2 };
  }, [keptView, circ, level, shownType, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const routeMarks = useMemo(() => {
    if (!now || !ready) return () => [];
    // the outline through every crossing on the border, as fine as the routes beside it are drawn
    const outline: Mark = { pts: ringOf(g!, level, shownType).pts, color: '--muted', width: 1 };
    return (): Mark[] => (circuitMark ? [outline, circuitMark] : [outline]);
  }, [now, g, ready, level, shownType, circuitMark]);
  const selRoute = routeSel !== null && rs ? rs.from.indexOf(routeSel) : -1;
  const highlight = useMemo(() => {
    const out: { i: number; color: string; width: number }[] = [];
    if (selRoute >= 0) out.push({ i: selRoute, color: '--danger', width: 3 });
    if (hover !== null && hover !== selRoute) out.push({ i: hover, color: '--text', width: 2.5 });
    return out;
  }, [selRoute, hover]);
  // at the deep levels only the longest routes are drawn
  const routesLine = !rs ? ''
    : keptView ? `${nf(rs.keptTotal)} of ${nf(rs.total)} routes kept${rs.keptTotal > MAX_ROUTES ? `, the longest ${nf(MAX_ROUTES)} drawn` : ''}`
    : rs.total > rs.from.length ? `${nf(rs.total)} routes, the longest ${nf(rs.from.length)} drawn` : `${nf(rs.total)} routes`;
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
    if (!g || !now || !ready || level === 0 || mode !== 'children' || keptView) return null;
    return Array.from(rs!.from).flatMap((k) => routePasses(g, level, shownType, k));
  }, [g, now, ready, level, shownType, mode, rs, keptView]);

  // ---- a selected circuit, level by level ----
  const twin = useMemo(() => {
    if (!circ) return null;
    for (const m of [circ.circuit.level + 2, circ.circuit.level - 2]) {
      const t = (closings[m] ?? []).filter((x) => x.family === circ.family && x.first === m).sort((a, b) => b.length - a.length)[0];
      if (t) return t;
    }
    return null;
  }, [circ, closings]);
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
  const circuitView = circ && ready && level <= circ.circuit.level && !keptView;
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
  const same = (a: Closing | null, b: Closing | null) => a !== null && b !== null && a.key === b.key && a.circuit.level === b.circuit.level;
  const pickCircuit = (c: Closing, at: number) => {
    const again = same(circ, c);
    setCirc(again ? null : c);
    if (!again) {
      if (level !== at) goLevel(at);
      // over the kept routes a circuit is drawn in the supertile it closes in
      if (kept) {
        setType(c.circuit.type as HexType);
        setRouteSel(null);
        setHover(null);
      }
    }
    setHoverL(null);
  };
  /** Keeps a circuit's routes at level k and opens the level above, the first built from them alone. */
  const keepAt = (c: Closing, k: number) => {
    setKept({ circuit: c, from: k });
    goLevel(Math.min(k + 1, built));
  };
  const group = groups.find((gr) => gr.includes(shownType)) ?? [shownType];
  const showing = level === 0 || keptView ? 'paths' : mode;

  const sidePane = (s: NonNullable<typeof left>, hovered: number | null, onHover: (i: number | null) => void, api: typeof leftApi, m: readonly boolean[] | null, testId: string) => (
    <div className="bu-side-by">
      <p className="bu-line" data-testid={`${testId}-line`}>{s.line}</p>
      {s.passes ? (
        <PassesPane g={g!} frame={s.frame} fitKey={`${s.c.key} ${s.c.circuit.level}`} passes={s.passes} passesOf={s.counts} rest={rest} matched={m}
          apiRef={api} hovered={hovered} onHover={onHover} label={s.line} testId={testId} />
      ) : <p className="bu-muted bu-none">Over {nf(MAX_PASSES)} passes at this level: too many to draw. Pick a higher level.</p>}
    </div>
  );

  // ---- the levels, as the ladder lists them ----
  const rungs: Rung[] = closings.map((cl, k) => {
    const N = circ?.circuit.level ?? -1;
    const keptHere = kept && keptAt[k];
    const meta = keptHere ? `${nf(keptHere.routes)} of ${nf(keptHere.of)} routes kept`
      : circ && k < N ? `uses ${nf(useOf(circ)[k].routes)} of ${nf(routeCounts[k] ?? 0)} routes`
      : `${nf(routeCounts[k] ?? 0)} routes${groupCounts[k] ? ` · ${groupCounts[k]} tables` : ''}`;
    const metaTitle = keptHere ? (k === kept!.from ? 'The routes kept' : `Routes glued from the routes kept at level ${kept!.from} alone`)
      : circ && k < N ? `Routes the ${nf(circ.length)}-tile circuit passes through at this level` : 'Routes of every type, and how many different route tables';
    const made = kept && k > kept.from ? keptClosings[k] : undefined;
    return {
      level: k, meta, metaTitle,
      tag: kept && k === kept.from ? 'kept here' : undefined,
      dim: kept !== null && k < kept.from,
      circuits: cl.map((c) => {
        const state: ChipState = same(circ, c) ? 'followed' : made ? (made.includes(c) ? 'made' : 'dropped') : null;
        const title = `${nf(c.length)} tiles, through children ${[...c.family].join(', ')}${c.first < k ? `; also closes at level ${c.first}` : '; new at this level'}`
          + (made ? (made.includes(c) ? '; made of the kept routes' : '; not made of the kept routes') : '')
          + (same(circ, c) ? '. Click to stop following it' : '. Click to follow it');
        return { c, isNew: c.first === k, state, title };
      }),
    };
  });
  const hint = kept ? `Bold circuits close from the routes kept at level ${kept.from}; struck ones need routes that were dropped.`
    : circ ? 'Pick a level to see the circuit there, or another circuit to follow it.'
    : 'Pick a circuit to follow it down the levels. Dotted: new at that level.';

  // ---- what the inspector lists ----
  const facts: [string, string][] = [];
  if (ready) {
    const Tn = now!.levels[level][shownType];
    facts.push(['Routes', `${nf(Tn.routes())}${group.length > 1 ? `, as ${group.filter((t) => t !== shownType).join(', ')}` : ''}`]);
    if (!keptView && !circuitView && showing === 'children' && allPasses) facts.push(['Made of', `${nf(allPasses.length)} routes of its children`]);
    facts.push(['Circuits closing', here.length ? here.map((c) => nf(c.length)).join(', ') : 'none']);
  }
  const keptFacts: [string, string][] = [];
  if (keptView) {
    const K = keptAt[kept!.from];
    keptFacts.push([`Kept at level ${kept!.from}`, `${nf(K.routes)} of ${nf(K.of)} routes, from the ${nf(kept!.circuit.length)}-tile circuit`]);
    if (level > kept!.from) {
      keptFacts.push(['Kept here', `${nf(keptAt[level].routes)} of ${nf(keptAt[level].of)} routes; this ${shownType}: ${nf(rs?.keptTotal ?? 0)}`]);
      keptFacts.push(['Circuits from them', fromKept && fromKept.length ? `${nf(fromKept.length)} of ${nf(here.length)}: ${fromKept.map((c) => nf(c.length)).join(', ')}` : `none of ${nf(here.length)}`]);
    }
  }
  const circuitFacts: [string, string][] = [];
  if (circ) {
    const N = circ.circuit.level;
    circuitFacts.push(['Closes in', `a level-${N} ${circ.circuit.type}`]);
    if (level < N) {
      const u = useOf(circ)[level];
      circuitFacts.push([`At level ${level}`, `${nf(u.routes)} of ${nf(routesAt(now!, level))} routes, ${nf(u.passes)} passes${u.byType.has(shownType) ? '' : `; none in a ${shownType}, it runs through ${[...u.byType.keys()].join(', ')}`}`]);
    } else if (level === N && !keptView) circuitFacts.push(['Here', `joins ${nf(useOf(circ)[N - 1].passes)} routes of its children`]);
    else if (level > N) circuitFacts.push(['Here', `closed already, at level ${N}`]);
  }
  const dl = (rows: [string, string][], testId?: string) => (
    <dl className="bu-facts" data-testid={testId}>
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
  const keepButtons = circ && circ.circuit.level > 0 && (
    <div className="bu-keep-at">
      <span>Keep its routes at level</span>
      <div className="bu-keep-levels" role="group" aria-label="Keep its routes at level">
        {Array.from({ length: circ.circuit.level }, (_, k) => {
          const on = kept !== null && same(kept.circuit, circ) && kept.from === k;
          return (
            <button key={k} type="button" className={on ? 'is-active' : ''} aria-pressed={on} onClick={() => (on ? setKept(null) : keepAt(circ, k))} data-testid="bu-keep"
              title={on ? 'Stop keeping these routes' : `Keep the routes the circuit uses at ${k === 0 ? 'the tiles' : `level ${k}`}, drop the rest, and build the levels above from them alone`}>
              {k === 0 ? 'tiles' : k}
            </button>
          );
        })}
      </div>
    </div>
  );
  const restBox = (circuitView || keptView) && (
    <label className="bu-check">
      <input type="checkbox" checked={rest} onChange={(e) => setRest(e.target.checked)} data-testid="bu-rest" />
      Show the rest, faint
    </label>
  );

  // ---- what is followed and kept, each undone with its ✕ ----
  const crumb = (text: string, cls: string, undo: () => void, label: string, testId: string) => (
    <span className={`bu-crumb ${cls}`} data-testid={testId}>
      <span>{text}</span>
      <button type="button" onClick={undo} aria-label={label} title={label}>✕</button>
    </span>
  );
  const keptWithCirc = kept !== null && same(kept.circuit, circ);
  const crumbs: JSX.Element[] = [];
  if (circ) crumbs.push(crumb(`Following the ${nf(circ.length)}-tile circuit`, 'is-circuit', () => setCirc(null), 'Stop following this circuit', 'bu-picked'));
  if (kept) {
    const text = keptWithCirc ? `Keeping its ${kept.from === 0 ? 'tile' : `level-${kept.from}`} routes` : `Keeping the ${kept.from === 0 ? 'tile' : `level-${kept.from}`} routes of the ${nf(kept.circuit.length)}-tile circuit`;
    const el = crumb(text, 'is-kept', () => setKept(null), 'Stop keeping these routes', 'bu-kept');
    if (keptWithCirc) crumbs.push(el);
    else crumbs.unshift(el);
  }

  return (
    <div className="bu-page">
      <header className="bu-head">
        <h1>Build-up</h1>
        <details className="bu-about">
          <summary>Routes, circuits and how a level is built</summary>
          <p className="bu-muted">
            Each supertile is built from its children, one level at a time. A strand entering a supertile at a crossing on its border leaves by another: that is a route, and a type's route table lists them all. A supertile's routes are its children's routes glued end to end where the children meet; a strand that closes up inside instead is a circuit closing at that level.
          </p>
          <p className="bu-muted">
            Following a circuit shows the routes it uses at each level below the one it closes at. Keeping its routes at one of those levels drops every other route there; the levels above are then built from the kept routes alone, and the ladder shows which circuits still close.
          </p>
        </details>
      </header>

      <nav className="bu-path" aria-label="What is shown" data-testid="bu-bar">
        <details className="bu-combo">
          <summary>Combination <b>{choice.subset.join('')} · {choice.combo}</b></summary>
          <ComboPicker busy={busy} onAdd={(c) => buildTo(c.level, c)} levels="any" verb="Build" initialLevel={DEFAULT.level} initialCombo={choice.combo} />
        </details>
        {crumbs.map((c, i) => <span key={i} className="bu-path-step"><span className="bu-path-sep" aria-hidden="true">›</span>{c}</span>)}
        {crumbs.length === 0 && <span className="bu-muted bu-path-hint">Pick a circuit on the left to follow it.</span>}
        <span className="bu-path-level" data-testid="bu-level">{level === 0 ? 'Tiles' : `Level ${level}`}</span>
      </nav>
      {error && <p className="bu-error">{error}</p>}

      <div className="bu-work">
        <Ladder rungs={rungs} level={level} onLevel={goLevel} onCircuit={pickCircuit} hint={hint}
          build={{ label: busy ? `Building level ${built + 1}…` : `Build level ${built + 1}`, disabled: busy, onClick: () => buildTo(built + 1, undefined, built + 1) }} />

        <div className="bu-center">
          {ready && g && level > 0 && (
            <GroupStrip g={g} level={level} groups={groups} type={shownType} onPick={(t) => { setType(t); setRouteSel(null); setHover(null); }}
              use={circ && level < circ.circuit.level ? useOf(circ)[level] : null} closed={closed} joins={keptView ? null : joins} built={built}
              kept={keptView ? { at: keptAt[level], from: kept!.from } : null} />
          )}
          {ready && (
            <div className={`bu-main${circuitView && right ? ' is-compare' : ''}`}>
              {circuitView && left && sidePane(left, hoverL, setHoverL, leftApi, matched.l, 'bu-passes-left')}
              {circuitView && compare && (right ? sidePane(right, hoverR, setHoverR, rightApi, matched.r, 'bu-passes-right')
                : <p className="bu-muted bu-none">The other circuit has no level {level + (twin ? twin.circuit.level - circ!.circuit.level : 0)}.</p>)}
              {!circuitView && showing === 'children' && allPasses && frame && g && (
                <div className="bu-side-by">
                  <p className="bu-line">{`A level-${level} ${shownType}, built from its children's routes`}</p>
                  <PassesPane g={g} frame={{ outline: ringOf(g, level, shownType).pts, box: frame }} fitKey={`${choice.combo} ${level} ${shownType}`} passes={allPasses}
                    apiRef={leftApi} hovered={hoverL} onHover={setHoverL} label={`A level-${level} ${shownType} built from its children's routes`} testId="bu-children" />
                </div>
              )}
              {!circuitView && showing === 'paths' && routeLines && frame && (
                <div className="bu-side-by">
                  <p className="bu-line">{level === 0 ? 'A tile' : `A level-${level} ${shownType}`}: {routesLine}</p>
                  <Viewer
                    frame={frame}
                    fitKey={`${choice.combo} ${level} ${shownType}`}
                    lines={routeLines}
                    marks={routeMarks}
                    hovered={hover}
                    onHover={setHover}
                    onPick={(i) => setRouteSel(i === null ? null : rs!.from[i])}
                    highlight={highlight}
                    tooltip={(i) => `Route from crossing ${rs!.from[i]} to ${T!.mate(rs!.from[i])}: ${nf(rs!.tiles[i])} tiles${rs!.cls ? [' · kept', ' · dropped', ' · kept, on the followed circuit'][rs!.cls[i]] : ''}`}
                    apiRef={viewer}
                    label={`A level-${level} ${shownType} and its routes`}
                  >
                    <div className="bv-legend">
                      {keptView ? (
                        <>
                          <span className="bu-key"><i style={{ background: 'var(--accent)' }} />kept</span>
                          {circ && level <= circ.circuit.level && <span className="bu-key"><i style={{ background: 'var(--danger)' }} />the {nf(circ.length)}-tile circuit</span>}
                          {rest && <span className="bu-key"><i style={{ background: 'var(--muted)', opacity: 0.4 }} />dropped</span>}
                        </>
                      ) : (
                        <>
                          <span>Tiles</span>
                          <i className="bv-ramp" />
                          <span>1 to {nf(rs!.tiles[rs!.tiles.length - 1] ?? 1)}</span>
                        </>
                      )}
                    </div>
                  </Viewer>
                </div>
              )}
            </div>
          )}
        </div>

        {ready && (
          <aside className="bu-side" data-testid="bu-side">
            <h2>{level === 0 ? 'A tile' : `Level ${level} · ${shownType}`}</h2>
            {dl(facts, 'bu-facts')}

            {!circuitView && !keptView && level > 0 && (
              <section className="bu-side-part">
                <h3>Drawing</h3>
                <div className="bu-toggle" role="group" aria-label="Drawing">
                  <button type="button" aria-pressed={showing === 'children'} className={showing === 'children' ? 'is-active' : ''} onClick={() => setMode('children')} data-testid="bu-mode-children">Built from children</button>
                  <button type="button" aria-pressed={showing === 'paths'} className={showing === 'paths' ? 'is-active' : ''} onClick={() => setMode('paths')} data-testid="bu-mode-paths">Strand paths</button>
                </div>
                <p className="bu-muted">
                  {showing === 'children' ? "Each child filled in its type's colour; each line one of its routes, from where the strand enters the child to where it leaves." : 'Each route drawn as the strand runs, darker for longer routes. Point at one to read it, click to select it.'}
                </p>
              </section>
            )}

            {keptView && (
              <section className="bu-side-part is-kept">
                <h3>Built from the kept routes</h3>
                {dl(keptFacts, 'bu-kept-facts')}
                <p className="bu-muted">{level === kept!.from ? 'Pick a higher level on the left to see what these routes build.' : 'A route here is kept when every route it is glued from is.'}</p>
                {restBox}
              </section>
            )}

            {circ && (
              <section className="bu-side-part is-circuit">
                <h3>The {nf(circ.length)}-tile circuit</h3>
                {dl(circuitFacts, 'bu-circuit-facts')}
                {circuitView && (
                  <>
                    <p className="bu-muted">Drawn by the routes it uses at this level, coloured by child type; thicker for a route it passes more often. Click a route to zoom to it.</p>
                    {restBox}
                    <label className="bu-check">
                      <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} disabled={!twin} data-testid="bu-compare" />
                      Beside {twin ? `the ${nf(twin.length)}-tile circuit of the same children` : 'a circuit of the same children (none built)'}
                    </label>
                    {compare && right && <p className="bu-muted">Faint: routes whose child types the other circuit also has at its level; bold: the rest.</p>}
                  </>
                )}
                {circuitMark && (
                  <button type="button" onClick={() => {
                    const pts: { x: number; y: number }[] = [];
                    for (let i = 0; i < circuitMark.pts.length; i += 2) pts.push({ x: circuitMark.pts[i], y: circuitMark.pts[i + 1] });
                    viewer.current?.fit(grow(boxOf(pts), 0.15));
                  }} data-testid="bu-zoom-circuit">Zoom to it</button>
                )}
                {keepButtons}
              </section>
            )}

            {showing === 'paths' && !circuitView && routeSel !== null && T && routeInfo && (
              <section className="bu-side-part">
                <h3>Route of {nf(T.len(routeSel))} tiles</h3>
                <p className="bu-muted">From crossing {routeSel} to {T.mate(routeSel)}. It runs through {routeInfo.children.length === 1 ? 'this child' : 'these children, in order'}, entering {routeInfo.children.length === 1 ? 'it' : 'them'} {routeInfo.steps === 1 ? 'once' : `${nf(routeInfo.steps)} times in all`}:</p>
                <div className="bu-kids">
                  {routeInfo.children.map((c) => (
                    <button key={c.slot} type="button" style={{ background: tileColor(c.type) }} onClick={() => viewer.current?.fit(routeInfo.box(c.slot, c.type))} title="Zoom to this child">
                      {c.type} <span>child {c.slot}{c.passes > 1 ? `, ×${c.passes}` : ''}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setRouteSel(null)}>Clear</button>
              </section>
            )}
          </aside>
        )}
      </div>

      <details className="bu-levels-so-far" onToggle={(e) => setDeepOpen((e.target as HTMLDetailsElement).open)} data-testid="bu-deep-open">
        <summary>Levels {built + 1} to 30, from the counts and the chains</summary>
        {deepOpen && now && !busy && <DeepPane cs={now} built={built} closings={closings} />}
      </details>
    </div>
  );
}
