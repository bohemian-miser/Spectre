/**
 * Identify: a strand named by one of its tiles, followed up the tile's
 * ancestors a level at a time until it closes (`identify/identify.ts`).
 * At each level climbed, the strand's piece there (its arc in its ancestor
 * at that level) is set against the circuits the build knows or its chains
 * predict, best first. The piece and its candidate are drawn side by side
 * with the built members of the candidate's chain, over their supertiles
 * and in rows of visits, as the Harmonics page draws a chain
 * (`harmonics/ChainViews.tsx`, `identify/members.ts`); hovering a visit of
 * the strand lights the visit its reading is matched with.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker } from './shapes/ComboPicker';
import { harmonicsHref, loadCombo, nf } from './foundations/data';
import { compareHref, type CircuitRef } from './compare/refs';
import { ChainWorkspace, type ChainSource, type MemberInfo } from './harmonics/ChainViews';
import { FLOOR } from './harmonics/chains';
import { createBruteClient, fromBorn, STOPPED, type BruteFrom } from './harmonics/bruteJob';
import type { Progress } from './harmonics/bruteForce';
import { identifyHref, readIdentify } from './identify/href';
import { startIdentify, type IdentifyRun } from './identify/client';
import { specKey, type MemberSpec } from './identify/members';
import { labelOf, randomOpenStrand, type Candidate, type ChainView, type Named, type Report } from './identify/identify';
import '../styles/shapes.css';
import '../styles/harmonics.css';
import '../styles/identify.css';

interface Target {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly tile: string;
  readonly edge: number;
  readonly level: number;
}

const DEFAULT = { subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 5 };
const DEFAULT_CAP = 10;

const pct = (s: number): string => `${Math.round(100 * s)}%`;
const base = (): string => import.meta.env.BASE_URL;
const same = (a: Named, b: Named): boolean => a.level === b.level && a.length === b.length;

/** An open strand to start from when the address names none. */
function randomTarget(subset: readonly number[], combo: string, level: number): Target | null {
  const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), level, 1, true);
  const r = randomOpenStrand(cs, level);
  return r ? { subset, combo, level, ...r } : null;
}

const named = (subset: readonly number[], combo: string, c: Named): CircuitRef => ({ subset, combo, level: c.level, length: c.length });

/** A circuit of a chain in a few words: `harmonic 2 of the 303, level 8`. */
function placeIn(chain: ChainView, c: Named): string {
  const root = chain.members[0];
  const order = (c.level - root.level) / 2;
  return order === 0 ? `the ${nf(c.length)}, level ${c.level}` : `harmonic ${order} of the ${nf(root.length)}, level ${c.level}`;
}

/** What is compared at a level climbed: the strand's piece, what it is set against, and the members drawn. */
interface Comparison {
  readonly level: number;
  readonly state: 'open' | 'closed' | 'ends';
  readonly tiles: number;
  /** The candidates while open; the one compared. */
  readonly candidates: readonly Candidate[];
  readonly chosen: Candidate | null;
  /** The circuit set against: its chain, and where it closes; its tiles when known. */
  readonly chain: ChainView | null;
  readonly against: { readonly level: number; readonly length: number | null; readonly built: boolean } | null;
  readonly members: readonly { spec: MemberSpec; info: MemberInfo }[];
  /** The highest level the lowest-born member is drawn at: the strand's piece stays below its own level. */
  readonly top: number;
}

/** The chain of the latest build holding a circuit, else the one given. */
const chainOf = (chains: readonly ChainView[], c: Named, fallback: ChainView): ChainView => chains.find((ch) => ch.members.some((m) => same(m, c))) ?? fallback;

function compareAt(report: Report, n: number, pick: number): Comparison {
  const row = report.rows[n - 1];
  const strandInfo = (birth: number): { spec: MemberSpec; info: MemberInfo } => ({
    spec: { kind: 'strand', level: n, birth },
    info: { level: birth, length: row.tiles, label: 'this strand' },
  });
  const built = (c: Named, label?: string): { spec: MemberSpec; info: MemberInfo } => ({ spec: { kind: 'built', level: c.level, length: c.length }, info: { ...c, label } });
  const below = (chain: ChainView, top: number, lowest: number) =>
    chain.members
      .filter((m) => m.level < top && m.level >= lowest)
      .sort((a, b) => b.level - a.level)
      .map((m) => built(m));
  const id = report.identified;
  if (row.state === 'closed' && id?.circuit && id.chain) {
    const c = id.circuit;
    const members = [strandInfo(n), built(c, placeIn(id.chain, c)), ...below(id.chain, c.level, 0)];
    return { level: n, state: 'closed', tiles: row.tiles, candidates: [], chosen: null, chain: id.chain, against: { ...c, built: true }, members, top: Math.min(...members.map((m) => m.info.level)) - 1 };
  }
  const chosen = row.state === 'open' ? (row.candidates[pick] ?? row.candidates[0] ?? null) : null;
  if (!chosen) return { level: n, state: row.state, tiles: row.tiles, candidates: row.candidates, chosen: null, chain: null, against: null, members: [strandInfo(n)], top: n - 1 };
  const B = chosen.level;
  const chain = chainOf(report.chains, chosen.member, chosen.chain);
  const builtThere = chain.members.find((m) => m.level === B) ?? null;
  const label = labelOf(chosen);
  const against = builtThere
    ? built(builtThere, label)
    : { spec: { kind: 'predicted', from: chosen.member, level: B } as MemberSpec, info: { level: B, length: chosen.length ?? 0, label } };
  // the members born too low to read at a level the strand's piece is drawn at are left out
  const members = [strandInfo(B), against, ...below(chain, B, B - n + 1)];
  const lowest = Math.min(...members.map((m) => m.info.level));
  return {
    level: n,
    state: 'open',
    tiles: row.tiles,
    candidates: row.candidates,
    chosen,
    chain,
    against: { level: B, length: builtThere ? builtThere.length : chosen.length, built: !!builtThere },
    members,
    top: n - 1 - B + lowest,
  };
}

/** A brute force of a candidate above the build: running, found, or not. */
type Brute = { readonly key: string; readonly progress: Progress | null; readonly found?: { level: number; length: number } | null; readonly error?: string };

export default function IdentifyPage(props: { forceSync?: boolean }): JSX.Element {
  const asked = useRef(typeof location === 'undefined' ? null : readIdentify(location.search));
  const capAsked = useRef(typeof location === 'undefined' ? null : Number(new URLSearchParams(location.search).get('upto')) || null);
  const [target, setTarget] = useState<Target | null>(asked.current);
  const [cap, setCap] = useState(capAsked.current ?? DEFAULT_CAP);
  const [draft, setDraft] = useState({ tile: asked.current?.tile ?? '', edge: String(asked.current?.edge ?? 0), level: String(asked.current?.level ?? DEFAULT.level) });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [climb, setClimb] = useState<number | null>(null);
  const [pick, setPick] = useState(0);
  const [brute, setBrute] = useState<Brute | null>(null);
  const [run, setRun] = useState<{ n: number; run: IdentifyRun } | null>(null);
  const runRef = useRef<IdentifyRun | null>(null);
  const token = useRef(0);
  const bruteClient = useRef<ReturnType<typeof createBruteClient> | null>(null);

  const go = (t: Target, upTo: number): void => {
    runRef.current?.stop();
    bruteClient.current?.stop();
    const mine = ++token.current;
    setTarget(t);
    setCap(upTo);
    setDraft({ tile: t.tile, edge: String(t.edge), level: String(t.level) });
    setReport(null);
    setError(null);
    setClimb(null);
    setPick(0);
    setBrute(null);
    setRunning(true);
    if (typeof history !== 'undefined') history.replaceState(null, '', `${identifyHref(base(), t)}${upTo !== DEFAULT_CAP ? `&upto=${upTo}` : ''}`);
    loadCombo(base(), t.combo, undefined, t.subset.join(''))
      .catch(() => null)
      .then((known) => {
        if (token.current !== mine) return;
        const r = startIdentify(
          { subset: t.subset, combo: t.combo, tile: t.tile, edge: t.edge, level: t.level, cap: upTo, known },
          (rep) => {
            if (token.current !== mine) return;
            setReport(rep);
            if (rep.done) setRunning(false);
          },
          (m) => {
            if (token.current !== mine) return;
            setError(m);
            setRunning(false);
          },
          { forceSync: props.forceSync },
        );
        runRef.current = r;
        setRun({ n: mine, run: r });
      });
  };

  const random = (subset: readonly number[], combo: string, level: number, upTo: number): void => {
    setError(null);
    setTimeout(() => {
      try {
        const t = randomTarget(subset, combo, level);
        if (t) go(t, upTo);
        else setError(`no open strand found under a level-${level} Delta`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 0);
  };

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (asked.current) go(asked.current, cap);
    else random(DEFAULT.subset, DEFAULT.combo, DEFAULT.level, cap);
    return () => {
      runRef.current?.stop();
      bruteClient.current?.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const n = report ? Math.min(climb ?? report.level, report.level) : 0;
  const cmp = useMemo(() => (report && n ? compareAt(report, n, pick) : null), [report, n, pick]);

  // the members drawn, each numbered once per run so the views know them again
  const registry = useRef<{ n: number; keys: Map<string, number>; specs: MemberSpec[] }>({ n: -1, keys: new Map(), specs: [] });
  if (run && registry.current.n !== run.n) registry.current = { n: run.n, keys: new Map(), specs: [] };
  const bruteFound = brute?.found ?? null;
  const drawn = useMemo(() => {
    if (!cmp) return null;
    const reg = registry.current;
    const circuits: MemberInfo[] = [];
    const members = cmp.members.map(({ spec, info }) => {
      const key = specKey(spec);
      let i = reg.keys.get(key);
      if (i === undefined) {
        i = reg.specs.length;
        reg.keys.set(key, i);
        reg.specs.push(spec);
      }
      const found = spec.kind === 'predicted' && bruteFound && bruteFound.level === spec.level ? bruteFound : null;
      circuits[i] = found ? { ...info, label: `${info.label}: ${nf(found.length)} tiles` } : info;
      return i;
    });
    return { members, circuits };
  }, [cmp, run, bruteFound]); // eslint-disable-line react-hooks/exhaustive-deps

  const source = useMemo<ChainSource | null>(() => {
    if (!run) return null;
    const spec = (i: number) => registry.current.specs[i];
    const m = run.run.members;
    return {
      picture: (ms, k, fold = 'fixpoint') => m.picture(ms.map(spec), k, fold),
      rows: (ms, k, fold = 'fixpoint') => m.rows(ms.map(spec), k, fold),
      detail: (c, level, view, budget) => m.detail(spec(c), level, view, budget),
    };
  }, [run]);

  const subset = target?.subset ?? DEFAULT.subset;
  const combo = target?.combo ?? DEFAULT.combo;
  const rule = subset.join('');
  const rootLevel = Math.max(1, Math.min(12, Number(draft.level) || DEFAULT.level));
  const draftTarget = (s: readonly number[], c: string): Target => ({ subset: s, combo: c, tile: draft.tile.trim(), edge: Number(draft.edge) || 0, level: rootLevel });
  const draftOk = /^[0-7](\.[0-7])*$/.test(draft.tile.trim()) && draft.tile.trim().split('.').length === rootLevel;

  const bruteKey = cmp?.chosen && cmp.against && !cmp.against.built ? `${run?.n} ${specKey({ kind: 'predicted', from: cmp.chosen.member, level: cmp.chosen.level })}` : null;
  const bruteForce = (): void => {
    if (!cmp?.chosen || !run || !bruteKey) return;
    const c = cmp.chosen;
    const key = bruteKey;
    bruteClient.current ??= createBruteClient({ forceSync: props.forceSync });
    const client = bruteClient.current;
    const job = { subset, combo };
    setBrute({ key, progress: null });
    const progress = (p: Progress) => setBrute((b) => (b?.key === key ? { key, progress: p } : b));
    const step = async (): Promise<{ level: number; length: number } | null> => {
      let from: BruteFrom = fromBorn(await run.run.members.born({ kind: 'built', ...c.member }), FLOOR);
      for (let s = 0; s < c.steps; s++) {
        const r = await client.harmonic(job, from, progress);
        if (!r.found) return null;
        from = { circuit: r.found, addressed: true, floor: FLOOR };
      }
      return { level: from.circuit.level, length: from.circuit.length };
    };
    step()
      .then((found) => setBrute((b) => (b?.key === key ? { key, progress: null, found } : b)))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setBrute((b) => (b?.key === key ? (msg === STOPPED ? null : { key, progress: null, error: msg }) : b));
      });
  };
  const bruteHere = brute && brute.key === bruteKey ? brute : null;

  const harmonicsLink = (): string | null => {
    if (!cmp?.chain || !cmp.against) return null;
    const a = cmp.against;
    const c = a.length !== null && a.level <= 9 ? { level: a.level, length: a.length } : cmp.chosen?.member ?? null;
    return c ? harmonicsHref(base(), combo, Math.max(c.level, Math.min(9, report?.level ?? 0)), rule, c) : null;
  };
  const compareLink = (): { href: string; text: string } | null => {
    if (!cmp?.chain || !cmp.against || cmp.against.length === null || cmp.against.level > 12) return null;
    const c = { level: cmp.against.level, length: cmp.against.length };
    const other = cmp.state === 'open' && cmp.chosen ? cmp.chosen.member : [...cmp.chain.members].filter((m) => m.level < c.level).pop() ?? null;
    if (!other || same(other, c)) return null;
    return { href: compareHref(base(), named(subset, combo, other), named(subset, combo, c)), text: `Compare the ${nf(other.length)} with the ${nf(c.length)}` };
  };

  const hl = harmonicsLink();
  const cl = compareLink();
  const row = report && n ? report.rows[n - 1] : null;

  return (
    <div className="shapes-page harm-page identify-page">
      <h1>Identify a strand</h1>
      <p className="shapes-note">A strand named by one of its tiles, followed up its ancestors a level at a time and set against the chains of its combination.</p>
      <ComboPicker
        key={`${rule}-${combo}`}
        busy={false}
        levels="any"
        verb="Identify"
        count={false}
        initialRule={rule}
        initialCombo={combo}
        initialLevel={cap}
        onAdd={(c) => {
          if (draftOk) go(draftTarget(c.subset, c.combo), c.level);
          else setError(`the tile needs ${rootLevel} slots, such as ${Array.from({ length: rootLevel }, () => '1').join('.')}`);
        }}
      >
        <label>
          Tile
          <input value={draft.tile} onChange={(e) => setDraft({ ...draft, tile: e.target.value })} size={14} data-testid="identify-tile" />
        </label>
        <label>
          Edge
          <select value={draft.edge} onChange={(e) => setDraft({ ...draft, edge: e.target.value })} data-testid="identify-edge">
            {[0, 1, 2, 3, 4, 5].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label>
          Root level
          <input type="number" min={1} max={12} value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })} style={{ width: '4.5em' }} data-testid="identify-root" />
        </label>
        <button type="button" onClick={() => random(subset, combo, rootLevel, cap)} data-testid="identify-random">
          Random open strand
        </button>
        {running ? (
          <button
            type="button"
            onClick={() => {
              runRef.current?.halt();
              setRunning(false);
            }}
            data-testid="identify-stop"
          >
            Stop
          </button>
        ) : null}
      </ComboPicker>
      {error ? <p className="identify-error">{error}</p> : null}
      {target ? (
        <p className="shapes-note" data-testid="identify-target">
          {rule} · {combo}, tile {target.tile} under a level-{target.level} Delta, entered by edge {target.edge}
          {report ? ` (a ${report.start.type}, left by edge ${report.start.exit})` : ''}.
        </p>
      ) : null}
      {!report && running ? <p className="shapes-note">Building level 1…</p> : null}
      {report ? (
        <section data-testid="identify-detail">
          <h2 data-testid="identify-verdict">{verdict(report)}</h2>
          <p className="identify-links">
            {running ? <span className="shapes-note">Building level {report.level + 1}…</span> : report.why ? <span className="shapes-note">Done: {report.why}.</span> : null}
            {hl ? (
              <a href={hl} data-testid="identify-harmonics-link">
                Open on Harmonics
              </a>
            ) : null}
            {cl ? (
              <a href={cl.href} data-testid="identify-compare-link">
                {cl.text}
              </a>
            ) : null}
          </p>
          {cmp && row ? (
            <div className="identify-climb">
              <div className="harm-canvas-controls">
                <label className="harm-slider">
                  Strand at level {n}
                  <input
                    type="range"
                    min={1}
                    max={report.level}
                    step={1}
                    value={n}
                    onChange={(e) => {
                      setClimb(Number(e.target.value) >= report.level ? null : Number(e.target.value));
                      setPick(0);
                    }}
                    data-testid="identify-climb"
                  />
                </label>
                <span data-testid="identify-at">
                  {cmp.state === 'open' ? 'open' : cmp.state === 'closed' ? 'closes' : 'ends'}, {nf(cmp.tiles)} tiles
                  {cmp.chosen ? `; ${pct(cmp.chosen.similarity)} of its ${nf(cmp.chosen.tokens)} visits found in ${labelOf(cmp.chosen)}` : ''}
                  {cmp.chosen && cmp.candidates.length > 1 ? `; next ${labelOf(cmp.candidates[pick === 0 ? 1 : 0])}, ${pct(cmp.candidates[pick === 0 ? 1 : 0].similarity)}` : ''}
                  {row.above ? `; above level ${target?.level}, its ancestors taken as a Delta's Delta child` : ''}.
                </span>
              </div>
              {cmp.candidates.length > 1 ? (
                <ol className="identify-candidates" aria-label="Candidates at this level">
                  {cmp.candidates.map((c, i) => (
                    <li key={i}>
                      <button type="button" className={`harm-cell${c === cmp.chosen ? ' is-selected' : ''}`} onClick={() => setPick(i)} data-testid="identify-candidate">
                        <span>{labelOf(c)}</span>
                        <small>
                          {c.length === null ? '' : `${nf(c.length)} tiles · `}
                          {pct(c.similarity)}
                        </small>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
              {bruteKey ? (
                <p className="identify-links">
                  <button type="button" disabled={!!bruteHere && !bruteHere.error && bruteHere.found === undefined} onClick={bruteForce} data-testid="identify-brute">
                    Brute force {labelOf(cmp.chosen!)}
                  </button>
                  {bruteHere ? <span className="shapes-note">{bruteText(bruteHere)}</span> : null}
                </p>
              ) : null}
            </div>
          ) : null}
          {drawn && source && run && cmp ? (
            <ChainWorkspace key={run.n} client={source} level={n} members={drawn.members} circuits={drawn.circuits} top={cmp.top} brief />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function verdict(r: Report): string {
  if (r.found === 'ends') return `Ends inside a tile at level ${r.level}`;
  const id = r.identified;
  if (id) {
    if (!id.circuit || !id.chain) return `Closes at level ${id.level} after ${nf(id.length)} tiles, a circuit the build has no other copy of`;
    return `Closes at level ${id.level}: ${placeIn(id.chain, id.circuit)}${id.chain.members.length > 1 ? ` (${id.chain.members.map((m) => nf(m.length)).join(' → ')})` : ''}`;
  }
  const best = r.candidates[0];
  return `Open at level ${r.level} after ${nf(r.tiles)} tiles${best ? `; most likely ${labelOf(best)}${best.length === null ? '' : `, ${nf(best.length)} tiles`}` : ''}`;
}

function bruteText(b: Brute): string {
  if (b.error) return `Could not brute force: ${b.error}.`;
  if (b.found === undefined) return b.progress ? `Following strands at level ${b.progress.level}…` : 'Starting…';
  return b.found ? `Found: ${nf(b.found.length)} tiles, closing at level ${b.found.level}.` : 'No harmonic closes where predicted.';
}
