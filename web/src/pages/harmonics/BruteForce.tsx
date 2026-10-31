/**
 * Brute force on the harmonics table (`bruteJob.ts`): past the level built,
 * each chain's next member two levels above its last as a ? cell, found by
 * following strands with routes worked out on demand; a member found opens
 * the cell two levels further. And one strand climbed until it closes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FLOOR, type Chain } from './chains';
import type { BruteResult, ClimbResult, Progress } from './bruteForce';
import { BASE, CLIMB_CAP, CLIMB_ROUTES, createBruteClient, fromBorn, STOPPED, type BruteCombo, type BruteFrom } from './bruteJob';
import type { HarmonicsClient, HarmonicsResult } from './harmonicsJob';

const nf = (n: number) => n.toLocaleString('en-US');
const compact = (n: number) => (n < 1e4 ? nf(n) : n < 1e6 ? `${(n / 1e3).toFixed(0)}k` : `${(n / 1e6).toFixed(1)}M`);
const secs = (s: number) => (s < 1 ? 'under a second' : `${s.toFixed(s < 10 ? 1 : 0)} s`);

type Cell =
  | { readonly state: 'running'; readonly progress: Progress | null }
  | { readonly state: 'done'; readonly result: BruteResult }
  | { readonly state: 'failed'; readonly error: string };

/** What a brute force at a level found, in a sentence. */
function describeResult(r: BruteResult): string {
  const fromLength = r.from.length;
  const f = r.found;
  const through = r.windows === 1 ? `the level-${r.floor + 2} supertile of the ${nf(fromLength)}'s first level-${r.floor} visit` : `the level-${r.floor + 2} supertiles of the ${nf(fromLength)}'s first ${r.windows} level-${r.floor} visits`;
  const work = `${nf(r.tried)} arc${r.tried === 1 ? '' : 's'} followed through ${through}; ${nf(r.work.calls)} routes worked out above level ${BASE}, in ${secs(r.seconds)}.`;
  if (f) {
    const reads = f.limited && f.agreed > r.floor ? `from level ${f.agreed} up, as far down as both were read` : `from level ${f.agreed} up`;
    return `Level ${r.level}: a ${nf(f.length)}-tile circuit of family ${f.family} closes in the ${r.type}, reading as the ${nf(fromLength)} two levels down ${reads}; key ${f.key}. ${work}`;
  }
  const others = r.others.length ? ` Closed there instead: ${r.others.map((o) => `${nf(o.length)} (family ${o.family})`).join(', ')}.` : '';
  const beyond = r.beyond.length ? ` The ${r.open} walks that leave it close at ${r.beyond.map((b) => `level ${b.level} (${nf(b.length)})`).join(', ')}.` : r.open ? ` ${nf(r.open)} walks leave it.` : '';
  return `Level ${r.level}: no circuit reading as the ${nf(fromLength)} closes in the ${r.type}.${others}${beyond} ${work}`;
}

/** The ? cells of the chains past the level built, their brute forces, and a strand climbed. */
export function useBruteForce(harmonics: HarmonicsClient, job: BruteCombo, r: HarmonicsResult | null, chains: readonly Chain[], forceSync = false) {
  const client = useRef(createBruteClient({ forceSync }));
  useEffect(() => () => client.current.dispose(), []);
  const jobKey = `${job.subset.join('')}/${job.combo}`;
  const [cells, setCells] = useState<{ job: string; map: ReadonlyMap<string, Cell> }>({ job: jobKey, map: new Map() });
  const map = cells.job === jobKey ? cells.map : new Map<string, Cell>();
  const [last, setLast] = useState<string | null>(null);
  const [climbed, setClimbed] = useState<{ job: string; c: ClimbResult | null; running: Progress | null; error?: string } | null>(null);
  const running = [...map.values()].some((c) => c.state === 'running') || (climbed?.job === jobKey && climbed.c === null && !climbed.error);
  const put = (key: string, c: Cell | null) =>
    setCells((s) => {
      const m = new Map(s.job === jobKey ? s.map : []);
      if (c) m.set(key, c);
      else m.delete(key);
      return { job: jobKey, map: m };
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
        return [{ key: ch.members.join(' '), top, length: r.circuits[top].length, lastLevel, floor }];
      });
  }, [r, chains]);

  const go = (row: (typeof rows)[number], level: number): void => {
    const key = `${row.key}@${level}`;
    put(key, { state: 'running', progress: null });
    const prev = level === row.lastLevel + 2 ? null : map.get(`${row.key}@${level - 2}`);
    const from: Promise<BruteFrom> =
      prev && prev.state === 'done' && prev.result.found
        ? Promise.resolve({ circuit: prev.result.found, addressed: true, floor: row.floor })
        : harmonics.born(row.top).then((c) => fromBorn(c, row.floor));
    from
      .then((f) => client.current.harmonic(job, f, (p) => put(key, { state: 'running', progress: p })))
      .then((res) => {
        put(key, { state: 'done', result: res });
        setLast(key);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        put(key, msg === STOPPED ? null : { state: 'failed', error: msg });
      });
  };

  const stop = () => client.current.stop();

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

  const beyond = useMemo(() => {
    const out = new Map<string, Map<number, JSX.Element>>();
    let upTo = 0;
    for (const row of rows) {
      const at = new Map<number, JSX.Element>();
      let from = row.length;
      for (let level = row.lastLevel + 2; ; level += 2) {
        const key = `${row.key}@${level}`;
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
        if (c.state === 'failed') {
          at.set(level, <td key={level} className="harm-cell-brute is-failed" title={c.error}>✗ {c.error}</td>);
          break;
        }
        const f = c.result.found;
        const text = describeResult(c.result);
        at.set(
          level,
          <td key={level} className={`harm-cell-brute ${f ? 'is-found' : 'is-failed'}`} title={text} data-testid="harm-brute-done">
            <span className="harm-brute-q">{f ? '✓' : '✗'}</span>
            {f ? nf(f.length) : c.result.beyond.length ? `closes at L${c.result.beyond[0].level}` : 'none'}
          </td>,
        );
        if (!f) break;
        from = f.length;
      }
      out.set(row.key, at);
    }
    return rows.length ? { upTo, cells: out } : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, map, running]);

  const lastCell = last ? map.get(last) : undefined;
  const lastRow = last ? rows.find((row) => last.startsWith(`${row.key}@`)) : undefined;
  const note =
    lastCell?.state === 'done' && lastRow ? (
      <p className="shapes-note" data-testid="harm-brute-note">
        Brute force · {describeResult(lastCell.result)}
      </p>
    ) : null;

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

  return { beyond, note, climbLine };
}
