/**
 * Every circuit of the rule, scored: its symmetry shares, its three-fold
 * polygon fits and the sides they choose, and how much the start matters when
 * the corners are walked round. Runs on request (it loads every class).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { chooseCorners } from './measure';
import { createCornersClient } from './cornersClient';
import { familyLabel, loadClass, type CornerIndex } from './data';
import { SURVEY_SIDES, SURVEY_WALK, type SurveyRow } from './survey';

interface Row extends SurveyRow {
  readonly combo: string;
  readonly pattern: string;
  readonly kind: string;
  readonly index: number;
  readonly family: string;
  readonly label: string;
  readonly level: number;
  readonly length: number;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function Survey(props: { base: string; index: CornerIndex; gain: number; picked: { combo: string; index: number } | null; onPick: (combo: string, index: number) => void; forceSync?: boolean }): JSX.Element {
  const { base, index, gain, picked, onPick } = props;
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const total = index.classes.reduce((s, c) => s + c.circuits.length, 0);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  const run = async () => {
    stop.current?.();
    const client = createCornersClient({ forceSync: props.forceSync });
    let live = true;
    stop.current = () => {
      live = false;
      client.dispose();
    };
    setRows([]);
    setRunning(true);
    for (const cls of index.classes) {
      if (!live) return;
      const circuits = await loadClass(base, cls.combo);
      for (const [i, c] of circuits.entries()) {
        if (!live) return;
        const r = await client.run<SurveyRow>({ kind: 'survey', loop: c.loop, rg: c.rg });
        if (!live) return;
        setRows((prev) => [...prev, { ...r, combo: cls.combo, pattern: cls.pattern, kind: cls.kind, index: i, family: c.family, label: familyLabel(c), level: c.level, length: c.length }]);
      }
    }
    setRunning(false);
    client.dispose();
  };

  const chosen = useMemo(
    () =>
      rows.map((r) => {
        const fits = new Map(SURVEY_SIDES.filter((k) => r.fit[k] !== undefined).map((k) => [k, r.fit[k]]));
        return fits.size ? chooseCorners(fits, gain) : null;
      }),
    [rows, gain],
  );
  // The sides chosen at each level, per class and family.
  const byFamily = useMemo(() => {
    const out = new Map<string, { level: number; k: number | null }[]>();
    rows.forEach((r, i) => {
      const key = `${r.combo}/${r.family}`;
      (out.get(key) ?? out.set(key, []).get(key)!).push({ level: r.level, k: chosen[i] });
    });
    return out;
  }, [rows, chosen]);
  const counts = useMemo(() => {
    const c = new Map<number, number>();
    for (const k of chosen) if (k !== null) c.set(k, (c.get(k) ?? 0) + 1);
    return SURVEY_SIDES.map((k) => [k, c.get(k) ?? 0] as const);
  }, [chosen]);
  const families = [...byFamily.values()];
  const same = (g: readonly { k: number | null }[]) => g.every((x) => x.k === g[0].k);
  const several = families.filter((g) => g.length > 1);
  // Families are often reborn every two levels, so also compare generations two levels apart.
  const apart = families.map((g) => [0, 1].map((p) => g.filter((x) => x.level % 2 === p)).filter((h) => h.length > 1)).filter((hs) => hs.length > 0);

  return (
    <>
      <div className="corners-controls">
        <button type="button" onClick={run} disabled={running} data-testid="corners-survey-run">
          {rows.length ? 'Score again' : 'Score every circuit'}
        </button>
        <span className="corners-note" data-testid="corners-survey-status">
          {running ? `${rows.length} of ${total} circuits…` : rows.length ? `${rows.length} circuits in ${index.classes.length} classes` : `${total} circuits in ${index.classes.length} classes; loads about 4 MB`}
        </span>
      </div>
      {rows.length > 0 && (
        <>
          <p className="corners-note" data-testid="corners-survey-summary">
            Sides chosen at {Math.round(gain * 100)}% a corner: {counts.map(([k, n]) => `${k}: ${n}`).join(' · ')}. Families choosing the same sides at every level they
            appear: {several.filter(same).length} of {several.length}; at levels two apart: {apart.filter((hs) => hs.every(same)).length} of {apart.length}.
          </p>
          <div className="corners-tablewrap corners-survey">
            <table className="corners-table" data-testid="corners-survey">
              <thead>
                <tr>
                  <th>combination</th>
                  <th>class</th>
                  <th>family</th>
                  <th>level</th>
                  <th>tiles</th>
                  <th title="Share beyond the circle on the harmonics a third of a turn allows">thirds</th>
                  <th title="Share beyond the circle on the harmonics a sixth of a turn allows">sixths</th>
                  {SURVEY_SIDES.map((k) => (
                    <th key={k}>{k} sides</th>
                  ))}
                  <th>chosen</th>
                  <th>by level</th>
                  {SURVEY_WALK.map((k) => (
                    <th key={k} title={`(worst − best) ÷ mean, ${k} corners walked round`}>
                      walk {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.combo}-${r.index}`}
                    data-pick
                    className={picked && picked.combo === r.combo && picked.index === r.index ? 'is-on' : undefined}
                    onClick={() => onPick(r.combo, r.index)}
                  >
                    <td>{r.combo}</td>
                    <td>
                      {r.pattern} {r.kind}
                    </td>
                    <td>{r.label}</td>
                    <td>{r.level}</td>
                    <td>{r.length.toLocaleString('en-US')}</td>
                    <td>{pct(r.third)}</td>
                    <td>{pct(r.sixth)}</td>
                    {SURVEY_SIDES.map((k) => (
                      <td key={k} className={chosen[i] === k ? 'is-chosen' : undefined}>
                        {r.fit[k] !== undefined ? r.fit[k].toFixed(4) : '·'}
                      </td>
                    ))}
                    <td className="is-chosen">{chosen[i] ?? '·'}</td>
                    <td>{byFamily.get(`${r.combo}/${r.family}`)!.map((x) => x.k ?? '·').join(' · ')}</td>
                    {SURVEY_WALK.map((k) => (
                      <td key={k}>{r.contrast[k].toFixed(2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
