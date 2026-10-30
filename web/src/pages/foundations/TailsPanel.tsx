/**
 * Where the tails go, under the account chart: what the tails at a chosen
 * level become as the levels rise (closing into which chain, into nuggets,
 * into unseen circuits, or still open); the back-test, the share of each
 * level's tails that circuits known by then do not explain, with the
 * circuits found at the next level marked; and each level's forecast of the
 * known chains' next members against the build.
 */
import { useMemo, useState } from 'react';
import { backTest, expectedTails, forecastChecks, tailFates, type PageCombo } from './pageData';
import { compact, pct } from './data';

const W = 300;
const H = 110;
const PAD = { l: 34, r: 8, t: 8, b: 20 };

export function TailsPanel(props: { data: PageCombo }): JSX.Element {
  const { data } = props;
  const top = data.tails.length - 1;
  const levels = useMemo(() => data.tails.map((_, n) => n).filter((n) => n >= 3 && n < top && data.tails[n] > 0 && data.tails[n] < 1), [data, top]);
  const [level, setLevel] = useState<number>(() => levels[Math.min(2, levels.length - 1)] ?? 3);
  const L = levels.includes(level) ? level : (levels[0] ?? 3);
  const fates = useMemo(() => tailFates(data, L), [data, L]);
  const bt = useMemo(() => backTest(data), [data]);
  const fc = useMemo(() => forecastChecks(data), [data]);
  const exp = useMemo(() => expectedTails(data), [data]);
  const name = (root: number): string => {
    const f = data.found.find((x) => x[0] === root);
    return f ? `${compact(f[2])}·L${f[1]}` : String(root);
  };
  // the chains shown as columns: the largest at the last row
  const cols = fates.length ? fates[fates.length - 1].chains.slice(0, 3).map((c) => c[0]) : [];
  const x = (lv: number): number => PAD.l + ((lv - 2) / Math.max(1, top - 3)) * (W - PAD.l - PAD.r);
  const y = (v: number): number => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
  return (
    <section className="fd-tails" data-testid="fd-tails">
      <div className="fd-tails-block">
        <h3>
          What the tails at level{' '}
          <select value={L} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Level of the tails followed">
            {levels.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{' '}
          become
        </h3>
        <table className="fd-small fd-fates" data-testid="fd-fates">
          <thead>
            <tr>
              <th>By level</th>
              {cols.map((r) => (
                <th key={r} title="chain: its foundational circuit's tiles and level">
                  {name(r)}
                </th>
              ))}
              <th>Other chains</th>
              <th>Nuggets</th>
              <th>Unseen</th>
              <th>Still open</th>
            </tr>
          </thead>
          <tbody>
            {fates.map((f) => {
              const other = f.chains.filter(([r]) => !cols.includes(r)).reduce((s, [, v]) => s + v, 0);
              return (
                <tr key={f.k}>
                  <td>{L + f.k}</td>
                  {cols.map((r) => (
                    <td key={r}>{pct(f.chains.find((c) => c[0] === r)?.[1] ?? 0)}</td>
                  ))}
                  <td>{pct(other)}</td>
                  <td>{pct(f.nuggets)}</td>
                  <td className={f.unseen > 0 ? 'fd-warn' : undefined}>{pct(f.unseen)}</td>
                  <td>{pct(f.open)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="fd-muted">
          Shares of the chords on tails at level {L}: each row adds up to 100%. Level {top} is built one past the circuits sorted; what closes there is a
          known circuit, a predicted harmonic or unseen.
        </p>
      </div>
      <div className="fd-tails-block">
        <h3>Unexplained tails by level</h3>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Share of each level's tails closing into circuits not known by that level" data-testid="fd-backtest">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="fd-grid" />
              <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" className="fd-axis">
                {t * 100}%
              </text>
            </g>
          ))}
          <polyline className="fd-line" points={bt.map((b) => `${x(b.level)},${y(b.unexplained)}`).join(' ')} />
          {bt.map((b) => (
            <g key={b.level}>
              <circle cx={x(b.level)} cy={y(b.unexplained)} r={b.found.length ? 4 : 2.5} className={b.found.length ? 'fd-dot fd-dot-found' : 'fd-dot'}>
                <title>
                  {`level ${b.level}: ${pct(b.unexplained)} of its tails close into circuits not known by then`}
                  {b.found.length ? `; found at level ${b.level + 1}: ${b.found.map(([r, s]) => `${name(r)} (${pct(s)})`).join(', ')}` : ''}
                </title>
              </circle>
              <text x={x(b.level)} y={H - 6} textAnchor="middle" className="fd-axis">
                {b.level}
              </text>
            </g>
          ))}
        </svg>
        <p className="fd-muted">
          At each level, the share of its tails that close (to level {top}) into circuits whose chain was not known by then; large dots mark a level whose
          next level brings new foundational circuits, which take exactly that drop.
        </p>
        {fc.length ? (
          <table className="fd-small fd-forecast" data-testid="fd-forecast">
            <thead>
              <tr>
                <th>Forecast from</th>
                <th>Next members, forecast</th>
                <th>In the build</th>
              </tr>
            </thead>
            <tbody>
              {fc.map((c) => (
                <tr key={c.level} className={c.forecast > 1.25 * c.actual + 1e-6 ? 'fd-warn' : undefined}>
                  <td>{c.level}</td>
                  <td>{pct(c.forecast)}</td>
                  <td>{pct(c.actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <p className="fd-muted" data-testid="fd-expected">
          Of the {pct(exp.actual)} of chords on tails at level {top}, the known chains&apos; next members are expected to take {pct(exp.expected)}:{' '}
          {pct(exp.actual > 0 ? exp.expected / exp.actual : 0)} of the tails. The other {pct(exp.actual > 0 ? 1 - exp.expected / exp.actual : 0)} is room
          for known circuits closing again in more places, for new circuits and for open strands.
        </p>
      </div>
    </section>
  );
}
