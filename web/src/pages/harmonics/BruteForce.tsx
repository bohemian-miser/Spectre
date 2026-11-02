/**
 * Brute force on the harmonics table (`bruteJob.ts`): every row ends in ?
 * cells, one at each even level above its last member, within the build
 * and past it, each found by following strands with routes worked out on
 * demand from the highest member found below it, with the gap between
 * them; a member found takes its place in the row, drawn small like the
 * built ones, and any cell done opens one two levels further. Any number of cells can be set going; they run one
 * after another, and the search under way is drawn as it goes
 * (`SearchView.tsx`). And one strand climbed until it closes.
 *
 * The members found are named in the address as `bf=8-734256.10-36701253`:
 * per chain, its last built member (`level-tiles`) and the members found
 * above it in turn, chains apart by commas. A page opened with them finds
 * them again.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FLOOR, type Chain } from './chains';
import type { BruteResult, ClimbResult, Harmonic, KnownWord, Progress } from './bruteForce';
import { BASE, createBruteClient, describeResult, fromBorn, STOPPED, type BruteCombo, type BruteFrom } from './bruteJob';
import { percent, scoreTitle, Thumb, type MemberInfo } from './ChainViews';
import type { Found } from './found';
import type { HarmonicsClient, HarmonicsResult } from './harmonicsJob';
import { ClimbStrip, describePicture, SearchView } from './SearchView';
import type { Scored } from './similarity';
import { TYPES } from './sparseRoutes';

const nf = (n: number) => n.toLocaleString('en-US');
const compact = (n: number) => (n < 1e4 ? nf(n) : n < 1e6 ? `${(n / 1e3).toFixed(0)}k` : `${(n / 1e6).toFixed(1)}M`);
const secs = (s: number) => (s < 1 ? 'under a second' : `${s.toFixed(s < 10 ? 1 : 0)} s`);

type Cell =
  | { readonly state: 'running'; readonly progress: Progress | null }
  | { readonly state: 'done'; readonly result: BruteResult }
  | { readonly state: 'failed'; readonly error: string };

/** A circuit named by its level and tiles, as the address names it. */
export const levelKey = (c: { readonly level: number; readonly length: number }): string => `${c.level}-${c.length}`;

/** A member found: the chain it extends (by its last built member's `levelKey`), and what the brute force found. */
export interface FoundMember {
  readonly anchor: string;
  readonly level: number;
  readonly found: Harmonic;
  readonly result: BruteResult;
}

/** A member found as the harmonics engine takes it. */
export const toFound = (m: FoundMember): Found => ({ level: m.found.level, type: m.found.type, length: m.found.length, family: m.found.family, deep: m.found.deep });

/** The members named in the address (`bf`): per chain, its last built member and the members found above it, in order. */
export function parseFound(bf: string | null): { anchor: string; members: string[] }[] {
  if (!bf) return [];
  return bf
    .split(',')
    .map((e) => e.split('.'))
    .filter((p) => p.length > 1 && p.every((x) => /^\d+-\d+$/.test(x)))
    .map(([anchor, ...members]) => ({ anchor, members }));
}

/** The members found as the address names them. */
export function foundParam(found: readonly FoundMember[]): string {
  const by = new Map<string, string[]>();
  for (const m of [...found].sort((a, b) => a.level - b.level)) (by.get(m.anchor) ?? by.set(m.anchor, []).get(m.anchor)!).push(levelKey(m.found));
  return [...by].map(([a, ms]) => [a, ...ms].join('.')).join(',');
}

/** How the cells of members found are shown: their thumbnails and circuit indices (by `levelKey`), the circuits, the scores of their links, and what is selected. */
export interface FoundLook {
  readonly thumbs: ReadonlyMap<string, Float64Array>;
  /** The built circuits' thumbnails by index, for a member found within the build. */
  readonly builtThumbs: ReadonlyMap<number, Float64Array>;
  readonly index: ReadonlyMap<string, number>;
  readonly circuits: readonly MemberInfo[];
  /** The link into each member found from the member before, by the found one's index. */
  readonly scores: ReadonlyMap<number, Scored>;
  readonly selected: ReadonlySet<number>;
  readonly onPick: (i: number, shift: boolean) => void;
}

/** The ? cells of the rows past the level built, their brute forces and the members found; and a strand climbed. */
export function useBruteForce(
  harmonics: HarmonicsClient,
  job: BruteCombo,
  r: HarmonicsResult | null,
  chains: readonly Chain[],
  opts: { forceSync?: boolean; asked?: string | null; look: FoundLook },
) {
  const client = useRef(createBruteClient({ forceSync: opts.forceSync }));
  useEffect(() => () => client.current.dispose(), []);
  const jobKey = `${job.subset.join('')}/${job.combo}`;
  const [cells, setCells] = useState<{ job: string; map: ReadonlyMap<string, Cell>; order: readonly string[] }>({ job: jobKey, map: new Map(), order: [] });
  const map = cells.job === jobKey ? cells.map : new Map<string, Cell>();
  const order = cells.job === jobKey ? cells.order : [];
  /** The members the address names, still to find, for the combination it names. */
  const [pending, setPending] = useState<{ job: string; list: { anchor: string; members: string[] }[] }>(() => ({ job: jobKey, list: parseFound(opts.asked ?? null) }));
  const [climbed, setClimbed] = useState<{ job: string; c: ClimbResult | null; running: Progress | null; error?: string } | null>(null);
  const [climbFrom, setClimbFrom] = useState<{ type: string; level: number | null }>({ type: 'Delta', level: null });
  const running = [...map.values()].some((c) => c.state === 'running') || (climbed?.job === jobKey && climbed.c === null && !climbed.error);
  /** The cell whose search is drawn: the last set going, or the one picked. */
  const [shown, setShown] = useState<{ job: string; key: string } | null>(null);
  /** The running cell whose turn it is: the first set going; the others wait for it. */
  const active = [...map].find(([, c]) => c.state === 'running')?.[0] ?? null;
  const put = (key: string, c: Cell | null) =>
    setCells((s) => {
      const m = new Map(s.job === jobKey ? s.map : []);
      const o = s.job === jobKey ? s.order.filter((k) => k !== key) : [];
      if (c) m.set(key, c);
      else m.delete(key);
      if (c?.state === 'done' && c.result.found) o.push(key);
      return { job: jobKey, map: m, order: o };
    });

  /**
   * Each row, a chain's or a circuit's alone, from its last built member
   * up: a ? cell at every even level above it, within the build and past
   * it, to two above the level built or two above the row's highest cell.
   * A cell searches from the highest member found below it, else the built
   * one, with the gap between them: a harmonic at two, or a circuit reading
   * as the member with every tile grown into a supertile of `gap` levels.
   * The circuit found must read as the member from the floor its chain's
   * last link reads from, or from `FLOOR` for a circuit alone (lower when
   * it closes below `FLOOR` + 2).
   */
  const rows = useMemo(() => {
    if (!r) return [];
    return chains.flatMap((ch) => {
      const top = ch.members[ch.members.length - 1];
      const lastLevel = r.circuits[top].level;
      if (lastLevel < 2) return [];
      const link = ch.members.length > 1 ? r.links.find((l) => l.b === top && l.a === ch.members[ch.members.length - 2]) : undefined;
      const floor = link ? Math.max(1, link.from) : Math.max(0, Math.min(FLOOR, lastLevel - 2));
      return [{ key: ch.members.join(' '), anchor: levelKey(r.circuits[top]), top, length: r.circuits[top].length, lastLevel, floor }];
    });
  }, [r, chains]);
  type Row = (typeof rows)[number];

  /** A cell's level and the member found in it, when one was. */
  const foundIn = (row: Row, level: number): Harmonic | null => {
    const c = map.get(`${row.anchor}@${level}`);
    return c?.state === 'done' ? c.result.found : null;
  };
  /** The highest level below `level` with a member found in the row, else the built member's level. */
  const fromLevel = (row: Row, level: number): number => {
    for (let l = level - 2; l > row.lastLevel; l -= 2) if (foundIn(row, l)) return l;
    return row.lastLevel;
  };
  /** The highest level the row has a cell at, else its last member's. */
  const topCell = (row: Row): number => {
    let top = row.lastLevel;
    for (const key of map.keys()) if (key.startsWith(`${row.anchor}@`)) top = Math.max(top, Number(key.split('@')[1]));
    return top;
  };
  /** A circuit of the build with this key: a member found within the build is one the table already holds. */
  const builtIndex = (name: string): number => (r ? r.circuits.findIndex((c) => levelKey(c) === name) : -1);

  /** The members found above the build, in the order found; the same array while they are the same. */
  const kept = useRef<FoundMember[]>([]);
  const found = useMemo(() => {
    const out: FoundMember[] = [];
    for (const key of order) {
      const [anchor, at] = key.split('@');
      const c = map.get(key);
      const row = rows.find((x) => x.anchor === anchor);
      if (!row || c?.state !== 'done' || !c.result.found || builtIndex(levelKey(c.result.found)) >= 0) continue;
      out.push({ anchor, level: Number(at), found: c.result.found, result: c.result });
    }
    const was = kept.current;
    if (out.length === was.length && out.every((m, j) => m.result === was[j].result)) return was;
    return (kept.current = out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, map, rows]);

  const go = (row: Row, level: number): void => {
    const key = `${row.anchor}@${level}`;
    put(key, { state: 'running', progress: null });
    setShown({ job: jobKey, key });
    const below = fromLevel(row, level);
    const gap = level - below;
    const prev = below > row.lastLevel ? foundIn(row, below) : null;
    // the circuits known: the build's by word, and every member found so far with a word key
    const foundWords: KnownWord[] = [];
    for (const c of map.values()) if (c.state === 'done' && c.result.found && !c.result.found.key.includes('/')) foundWords.push({ key: c.result.found.key, length: c.result.found.length, level: c.result.found.level });
    const from: Promise<BruteFrom> = Promise.all([
      prev ? Promise.resolve<BruteFrom>({ circuit: prev, addressed: true, floor: row.floor, gap }) : harmonics.born(row.top).then((c) => fromBorn(c, row.floor, gap)),
      harmonics.words(),
    ]).then(([f, words]) => ({ ...f, known: [...words, ...foundWords] }));
    from
      .then((f) => client.current.harmonic(job, f, (p) => put(key, { state: 'running', progress: p })))
      .then((res) => put(key, { state: 'done', result: res }))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        put(key, msg === STOPPED ? null : { state: 'failed', error: msg });
      });
  };

  // the members the address names, found again one at a time, each from the highest found below it
  const todo = pending.job === jobKey ? pending.list : [];
  useEffect(() => {
    if (!r || running || !todo.length) return;
    const [entry, ...rest] = todo;
    const row = rows.find((x) => x.anchor === entry.anchor);
    const drop = () => setPending({ job: jobKey, list: rest });
    if (!row) return drop();
    for (const want of entry.members) {
      const [level, length] = want.split('-').map(Number);
      if (level <= row.lastLevel || level % 2 !== row.lastLevel % 2) return drop();
      const c = map.get(`${row.anchor}@${level}`);
      if (!c) return go(row, level);
      if (c.state !== 'done' || c.result.found?.length !== length) return drop();
    }
    drop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, rows, map, running, todo]);

  const stop = () => {
    setPending({ job: jobKey, list: [] });
    client.current.stop();
  };

  const climbStart = r ? Math.min(climbFrom.level ?? r.level, BASE, r.level) : 0;
  const climb = (): void => {
    if (!r) return;
    setClimbed({ job: jobKey, c: null, running: null });
    client.current
      .climb(job, climbStart, climbFrom.type, (p) => setClimbed({ job: jobKey, c: null, running: p }))
      .then((c) => setClimbed({ job: jobKey, c, running: null }))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setClimbed(msg === STOPPED ? null : { job: jobKey, c: null, running: null, error: msg });
      });
  };

  const { look } = opts;
  const beyond = useMemo(() => {
    const out = new Map<string, Map<number, JSX.Element>>();
    let upTo = 0;
    for (const row of rows) {
      const at = new Map<number, JSX.Element>();
      let chainText = row.key
        .split(' ')
        .map((m) => `${nf(r!.circuits[Number(m)].length)} L${r!.circuits[Number(m)].level}`)
        .join(' → ');
      const last = Math.max(r!.level, topCell(row)) + 2;
      for (let level = row.lastLevel + 2; level <= last; level += 2) {
        const key = `${row.anchor}@${level}`;
        const c = map.get(key);
        upTo = Math.max(upTo, level);
        const isShown = shown?.job === jobKey && shown.key === key;
        if (!c) {
          const below = fromLevel(row, level);
          const from = below > row.lastLevel ? foundIn(row, below)!.length : row.length;
          const gap = level - below;
          at.set(
            level,
            <td
              key={level}
              className="harm-cell-brute"
              title={`${gap === 2 ? `The harmonic of the ${nf(from)} predicted here, two levels up in the same supertile` : `A circuit reading as the ${nf(from)} with every tile grown into a level-${gap} supertile, ${gap} levels up in the same supertile`}${running ? '; set going now, it runs after the ones under way' : ''}`}
            >
              <span className="harm-brute-q">?</span>
              <button type="button" onClick={() => go(row, level)} data-testid="harm-brute" data-gap={gap}>
                Brute force
              </button>
            </td>,
          );
          continue;
        }
        if (c.state === 'running') {
          const p = c.progress;
          at.set(
            level,
            <td key={level} className={`harm-cell-brute is-running${isShown ? ' is-shown' : ''}`} data-testid="harm-brute-running" onClick={() => setShown({ job: jobKey, key })}>
              <span>{active !== key ? 'waiting' : p ? `L${p.level} · ${compact(p.calls)} routes` : 'starting'}</span>
              <button type="button" onClick={stop} title="Stops every brute force under way or waiting">
                Stop
              </button>
            </td>,
          );
          continue;
        }
        const f = c.state === 'done' ? c.result.found : null;
        if (c.state === 'failed' || !f) {
          const text = c.state === 'failed' ? c.error : describeResult(c.result);
          const label = c.state === 'failed' ? `✗ ${c.error}` : c.result.beyond.length ? `✗ closes at L${c.result.beyond[0].level}` : '✗ none';
          at.set(
            level,
            <td key={level} className={`harm-cell-brute is-failed${isShown ? ' is-shown' : ''}`} title={`${text}${c.state === 'done' ? ' Click to see the search.' : ''}`} data-testid="harm-brute-none">
              {label}
              {c.state === 'done' ? (
                <button type="button" onClick={() => setShown({ job: jobKey, key })} data-testid="harm-brute-show">
                  Show
                </button>
              ) : null}
            </td>,
          );
          continue;
        }
        const name = levelKey(f);
        const built = builtIndex(name);
        const i = built >= 0 ? built : look.index.get(name);
        chainText += ` → ${nf(f.length)} L${f.level}`;
        const score = i === undefined || built >= 0 ? undefined : look.scores.get(i);
        if (score)
          at.set(
            level - 1,
            <td key={level - 1} className="harm-cell-link">
              <span title={scoreTitle(score, look.circuits)} data-testid="harm-link-score" data-score={score.score}>
                {percent(score.score)}
              </span>
            </td>,
          );
        at.set(
          level,
          <td key={level}>
            <button
              type="button"
              className={`harm-cell is-found${i !== undefined && look.selected.has(i) ? ' is-selected' : ''}`}
              data-testid="harm-brute-done"
              data-circuit={i}
              data-level={level}
              disabled={i === undefined}
              onClick={(e) => i !== undefined && look.onPick(i, e.shiftKey)}
              title={`${nf(f.length)} tiles, closing at level ${f.level} in a ${f.type}; family ${f.family}; chain ${chainText}. Brute-forced: ${describeResult(c.result)}${built >= 0 ? ' A circuit of the build: it opens with its own row.' : ''} Shift-click to compare with the circuit chosen.`}
            >
              <Thumb pts={built >= 0 ? look.builtThumbs.get(built) : look.thumbs.get(name)} size={44} label={`${nf(f.length)} tiles, brute-forced`} />
              <span>{nf(f.length)}</span>
            </button>
            <button type="button" className="harm-brute-show" onClick={() => setShown({ job: jobKey, key })} title="Show how it was found" data-testid="harm-brute-show">
              search
            </button>
          </td>,
        );
      }
      out.set(row.key, at);
    }
    return rows.length ? { upTo, cells: out } : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, map, running, look, shown, active]);

  /** The search drawn: the cell shown while it runs, or as it ended. */
  const shownCell = shown?.job === jobKey ? map.get(shown.key) : undefined;
  const shownRow = shown ? rows.find((x) => x.anchor === shown.key.split('@')[0]) : undefined;
  const searchView = (() => {
    if (!shownCell || !shown) return null;
    const level = Number(shown.key.split('@')[1]);
    const head = shownRow ? `The ${nf(shownRow.length)} L${shownRow.lastLevel}'s row at level ${level}` : `Level ${level}`;
    if (shownCell.state === 'running') {
      const p = shownCell.progress;
      if (!p?.picture) {
        return (
          <div className="harm-search-panel" data-testid="harm-search-panel">
            <p className="shapes-note">{head}: {active === shown.key ? 'starting' : 'waiting for the brute force under way'}.</p>
          </div>
        );
      }
      return (
        <div className="harm-search-panel" data-testid="harm-search-panel">
          <SearchView picture={p.picture} size={320} caption={`${head}, under way. ${describePicture(p.picture)} ${nf(p.calls)} routes worked out above level ${BASE}.`} />
        </div>
      );
    }
    if (shownCell.state === 'failed') {
      return (
        <div className="harm-search-panel" data-testid="harm-search-panel">
          <p className="shapes-note">{head}: could not brute-force: {shownCell.error}</p>
        </div>
      );
    }
    const res = shownCell.result;
    return (
      <div className="harm-search-panel" data-testid="harm-search-panel">
        <SearchView picture={res.picture} size={320} caption={`${head}. ${describePicture(res.picture)}`} />
        <p className="shapes-note">
          {describeResult(res)}
          {res.climbed.length ? ' The open walks climbed, a level a picture:' : ''}
        </p>
        {res.climbed.length ? <ClimbStrip pictures={res.climbed} size={120} /> : null}
      </div>
    );
  })();

  const c = climbed?.job === jobKey ? climbed : null;
  const climbLevels = r ? Array.from({ length: Math.min(r.level, BASE) }, (_, i) => i + 1) : [];
  const climbLine = r ? (
    <div className="harm-climb" data-testid="harm-climb">
      <p className="shapes-note">
        {c && !c.c && !c.error ? (
          <>
            Climbing: level {c.running?.level ?? climbStart}, {nf(c.running?.calls ?? 0)} routes worked out.{' '}
            <button type="button" onClick={stop}>
              Stop
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={climb} data-testid="harm-climb-go">
              Climb
            </button>{' '}
            the longest arc of a level-
            <select value={climbStart} onChange={(e) => setClimbFrom({ ...climbFrom, level: Number(e.target.value) })} aria-label="Level to climb from" data-testid="harm-climb-level">
              {climbLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>{' '}
            <select value={climbFrom.type} onChange={(e) => setClimbFrom({ ...climbFrom, type: e.target.value })} aria-label="Type to climb from" data-testid="harm-climb-type">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>{' '}
            a level at a time, each supertile a child of its own type, until its strand closes; there is no limit, Stop ends it. Each level climbed is drawn: the arc
            through the supertile above, its two halves from the seam it enters by.
            {c?.c ? (
              <span data-testid="harm-climb-result">
                {' '}
                {c.c.levels.map((l) => `L${l.level} ${nf(l.length)}`).join(' → ')}
                {c.c.closed
                  ? ` → closes at level ${c.c.closed.level} in a ${c.c.closed.type}: ${nf(c.c.closed.length)} tiles, family ${c.c.closed.family}`
                  : c.c.limitedAt
                    ? `, still open; level ${c.c.limitedAt} needs more routes`
                    : ', still open'}
                ; {nf(c.c.work.calls)} routes in {secs(c.c.seconds)}.
              </span>
            ) : null}
            {c?.error ? ` Could not climb: ${c.error}` : null}
          </>
        )}
      </p>
      {c && !c.c && !c.error && c.running?.picture ? (
        <SearchView picture={c.running.picture} size={200} caption={`Level ${c.running.picture.level} ${c.running.picture.type}, being climbed into`} testId="harm-climb-live" />
      ) : null}
      {c?.c ? <ClimbStrip pictures={c.c.pictures} size={120} /> : null}
    </div>
  ) : null;

  /** The members found on each chain (by its rows' key) in level order. */
  const byRow = useMemo(() => {
    const m = new Map<string, FoundMember[]>();
    for (const row of rows) m.set(row.key, found.filter((f) => f.anchor === row.anchor).sort((a, b) => a.level - b.level));
    return m;
  }, [rows, found]);

  return { beyond, climbLine, searchView, found, byRow, param: foundParam(found), restoring: todo.length > 0 };
}
