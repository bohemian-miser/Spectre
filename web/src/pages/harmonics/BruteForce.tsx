/**
 * Brute force on the harmonics table (`bruteJob.ts`): past the level built,
 * each chain's next member two levels above its last as a ? cell, found by
 * following strands with routes worked out on demand; a member found takes
 * its place in the row, drawn small like the built ones, and opens the cell
 * two levels further. And one strand climbed until it closes.
 *
 * The members found are named in the address as `bf=8-734256.10-36701253`:
 * per chain, its last built member (`level-tiles`) and the members found
 * above it in turn, chains apart by commas. A page opened with them finds
 * them again.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FLOOR, type Chain } from './chains';
import type { BruteResult, ClimbResult, Harmonic, Progress } from './bruteForce';
import { BASE, CLIMB_CAP, CLIMB_ROUTES, createBruteClient, describeResult, fromBorn, STOPPED, type BruteCombo, type BruteFrom } from './bruteJob';
import { percent, scoreTitle, Thumb, type MemberInfo } from './ChainViews';
import type { Found } from './found';
import type { HarmonicsClient, HarmonicsResult } from './harmonicsJob';
import type { Scored } from './similarity';

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
  readonly index: ReadonlyMap<string, number>;
  readonly circuits: readonly MemberInfo[];
  /** The link into each member found from the member before, by the found one's index. */
  readonly scores: ReadonlyMap<number, Scored>;
  readonly selected: ReadonlySet<number>;
  readonly onPick: (i: number, shift: boolean) => void;
}

/** The ? cells of the chains past the level built, their brute forces and the members found; and a strand climbed. */
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
  const running = [...map.values()].some((c) => c.state === 'running') || (climbed?.job === jobKey && climbed.c === null && !climbed.error);
  const put = (key: string, c: Cell | null) =>
    setCells((s) => {
      const m = new Map(s.job === jobKey ? s.map : []);
      const o = s.job === jobKey ? s.order.filter((k) => k !== key) : [];
      if (c) m.set(key, c);
      else m.delete(key);
      if (c?.state === 'done' && c.result.found) o.push(key);
      return { job: jobKey, map: m, order: o };
    });

  /** Each chain past the build: the levels of its next members, two apart, each found one opening the next. */
  const rows = useMemo(() => {
    if (!r) return [];
    return chains
      .filter((ch) => ch.members.length > 1)
      .flatMap((ch) => {
        const top = ch.members[ch.members.length - 1];
        const lastLevel = r.circuits[top].level;
        if (lastLevel + 2 <= r.level) return [];
        const link = r.links.find((l) => l.b === top && l.a === ch.members[ch.members.length - 2]);
        const floor = Math.max(1, link ? link.from : FLOOR);
        return [{ key: ch.members.join(' '), anchor: levelKey(r.circuits[top]), top, length: r.circuits[top].length, lastLevel, floor }];
      });
  }, [r, chains]);
  type Row = (typeof rows)[number];

  /** The members found, in the order found, on the chains past the build; the same array while they are the same. */
  const kept = useRef<FoundMember[]>([]);
  const found = useMemo(() => {
    const out: FoundMember[] = [];
    for (const key of order) {
      const [anchor, at] = key.split('@');
      const c = map.get(key);
      const row = rows.find((x) => x.anchor === anchor);
      if (!row || c?.state !== 'done' || !c.result.found) continue;
      // only a member whose members below it in the row are found too
      let ok = true;
      for (let l = row.lastLevel + 2; l < Number(at); l += 2) {
        const b = map.get(`${anchor}@${l}`);
        if (b?.state !== 'done' || !b.result.found) ok = false;
      }
      if (ok) out.push({ anchor, level: Number(at), found: c.result.found, result: c.result });
    }
    const was = kept.current;
    if (out.length === was.length && out.every((m, j) => m.result === was[j].result)) return was;
    return (kept.current = out);
  }, [order, map, rows]);

  const go = (row: Row, level: number): void => {
    const key = `${row.anchor}@${level}`;
    put(key, { state: 'running', progress: null });
    const prev = level === row.lastLevel + 2 ? null : map.get(`${row.anchor}@${level - 2}`);
    const from: Promise<BruteFrom> =
      prev && prev.state === 'done' && prev.result.found
        ? Promise.resolve({ circuit: prev.result.found, addressed: true, floor: row.floor })
        : harmonics.born(row.top).then((c) => fromBorn(c, row.floor));
    from
      .then((f) => client.current.harmonic(job, f, (p) => put(key, { state: 'running', progress: p })))
      .then((res) => put(key, { state: 'done', result: res }))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        put(key, msg === STOPPED ? null : { state: 'failed', error: msg });
      });
  };

  // the members the address names, found again one at a time
  const todo = pending.job === jobKey ? pending.list : [];
  useEffect(() => {
    if (!r || running || !todo.length) return;
    const [entry, ...rest] = todo;
    const row = rows.find((x) => x.anchor === entry.anchor);
    const drop = () => setPending({ job: jobKey, list: rest });
    if (!row) return drop();
    for (const [q, want] of entry.members.entries()) {
      const level = row.lastLevel + 2 + 2 * q;
      if (Number(want.split('-')[0]) !== level) return drop();
      const c = map.get(`${row.anchor}@${level}`);
      if (!c) return go(row, level);
      if (c.state !== 'done' || !c.result.found) return drop();
    }
    drop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, rows, map, running, todo]);

  const stop = () => {
    setPending({ job: jobKey, list: [] });
    client.current.stop();
  };

  const climb = (): void => {
    if (!r) return;
    setClimbed({ job: jobKey, c: null, running: null });
    client.current
      .climb(job, r.level, (p) => setClimbed({ job: jobKey, c: null, running: p }))
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
      let from = row.length;
      let chainText = row.key
        .split(' ')
        .map((m) => `${nf(r!.circuits[Number(m)].length)} L${r!.circuits[Number(m)].level}`)
        .join(' → ');
      for (let level = row.lastLevel + 2; ; level += 2) {
        const key = `${row.anchor}@${level}`;
        const c = map.get(key);
        upTo = Math.max(upTo, level);
        if (!c) {
          at.set(
            level,
            <td key={level} className="harm-cell-brute" title={`The harmonic of the ${nf(from)} predicted here, two levels up in the same supertile`}>
              <span className="harm-brute-q">?</span>
              <button type="button" disabled={running} onClick={() => go(row, level)} data-testid="harm-brute">
                Brute force
              </button>
            </td>,
          );
          break;
        }
        if (c.state === 'running') {
          const p = c.progress;
          at.set(
            level,
            <td key={level} className="harm-cell-brute is-running" data-testid="harm-brute-running">
              <span>{p ? `L${p.level} · ${compact(p.calls)} routes` : 'starting'}</span>
              <button type="button" onClick={stop}>
                Stop
              </button>
            </td>,
          );
          break;
        }
        const f = c.state === 'done' ? c.result.found : null;
        if (c.state === 'failed' || !f) {
          const text = c.state === 'failed' ? c.error : describeResult(c.result);
          const shown = c.state === 'failed' ? `✗ ${c.error}` : c.result.beyond.length ? `✗ closes at L${c.result.beyond[0].level}` : '✗ none';
          at.set(
            level,
            <td key={level} className="harm-cell-brute is-failed" title={text} data-testid="harm-brute-none">
              {shown}
            </td>,
          );
          break;
        }
        const name = levelKey(f);
        const i = look.index.get(name);
        chainText += ` → ${nf(f.length)} L${f.level}`;
        const score = i === undefined ? undefined : look.scores.get(i);
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
              title={`${nf(f.length)} tiles, closing at level ${f.level} in a ${f.type}; family ${f.family}; chain ${chainText}. Brute-forced: ${describeResult(c.result)} Shift-click to compare with the circuit chosen.`}
            >
              <Thumb pts={look.thumbs.get(name)} size={44} label={`${nf(f.length)} tiles, brute-forced`} />
              <span>{nf(f.length)}</span>
            </button>
          </td>,
        );
        from = f.length;
      }
      out.set(row.key, at);
    }
    return rows.length ? { upTo, cells: out } : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, map, running, look]);

  const c = climbed?.job === jobKey ? climbed : null;
  const start = r ? Math.min(r.level, BASE) : 0;
  const climbLine = r ? (
    <p className="shapes-note harm-climb" data-testid="harm-climb">
      {c && !c.c && !c.error ? (
        <>
          Climbing: level {c.running?.level ?? start}, {nf(c.running?.calls ?? 0)} routes worked out.{' '}
          <button type="button" onClick={stop}>
            Stop
          </button>
        </>
      ) : (
        <>
          <button type="button" disabled={running} onClick={climb} data-testid="harm-climb-go">
            Climb
          </button>{' '}
          the longest arc of a level-{start} Delta a level at a time, each supertile a child of its own type, until its strand closes (at most level {CLIMB_CAP} or{' '}
          {nf(CLIMB_ROUTES / 1e6)} million routes).
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
  ) : null;

  /** The members found on each chain (by its rows' key) in level order. */
  const byRow = useMemo(() => {
    const m = new Map<string, FoundMember[]>();
    for (const row of rows) m.set(row.key, found.filter((f) => f.anchor === row.anchor).sort((a, b) => a.level - b.level));
    return m;
  }, [rows, found]);

  return { beyond, climbLine, found, byRow, param: foundParam(found), restoring: todo.length > 0 };
}
