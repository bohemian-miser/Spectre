/**
 * `WallView` — a wall built one level at a time: n supertiles of one type,
 * each in the same slot of the next, drawn as nested outlines that all run
 * along the crossed edge, and the supertiles on the far side in a second
 * colour, with the wall between them and the two slot paths side by side.
 */
import { useMemo, useState } from 'react';

import { tileColor } from '../../lib/palette';
import { orientationPath } from './board';
import { MAX_WALL_LEVELS, WALL_PRESETS, buildWall, type Seg } from './wall';

const NEAR = '#2f6fdb';
const FAR = '#e0782f';
/** outline width on screen, in pixels, by level */
const width = (k: number): number => 0.8 + 0.9 * k;

export function WallView(): JSX.Element {
  const [presetIdx, setPresetIdx] = useState(0);
  const [n, setN] = useState(2);
  /** the level the view frames; null follows n */
  const [fit, setFit] = useState<number | null>(null);
  const wall = useMemo(() => buildWall(WALL_PRESETS[presetIdx], n), [presetIdx, n]);
  const p = wall.preset;

  const framed = fit === null ? n : Math.min(fit, n);
  const f = wall.frames[framed];
  const pad = Math.max(1, 0.06 * Math.max(f.maxX - f.minX, f.maxY - f.minY));
  const box = `${f.minX - pad} ${f.minY - pad} ${f.maxX - f.minX + 2 * pad} ${f.maxY - f.minY + 2 * pad}`;
  const cx = (wall.crossed.x1 + wall.crossed.x2) / 2, cy = (wall.crossed.y1 + wall.crossed.y2) / 2;
  const ring = Math.max(0.9, 0.035 * Math.max(f.maxX - f.minX, f.maxY - f.minY));

  const line = (s: Seg, key: string, cls: string, w: number, stroke?: string): JSX.Element => (
    <line key={key} className={cls} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={w} stroke={stroke} vectorEffect="non-scaling-stroke" />
  );
  const nearTile = wall.tiles.find((t) => t.id === wall.nearId)!;
  const farTile = wall.tiles.find((t) => t.id === wall.farId)!;
  return (
    <div className="wall">
      <div className="td__controls">
        <label>Wall
          <select value={presetIdx} onChange={(e) => { setPresetIdx(Number(e.target.value)); e.currentTarget.blur(); }} data-testid="wall-preset">
            {WALL_PRESETS.map((w, i) => <option key={w.label} value={i}>{w.label}</option>)}
          </select>
        </label>
        <span className="wall__n">
          <button type="button" onClick={() => setN((x) => Math.max(1, x - 1))} disabled={n <= 1} data-testid="wall-less">−</button>
          <strong data-testid="wall-n">{n}</strong> {n === 1 ? 'level' : 'levels'} of {p.type} in slot {p.slot} of a {p.type}
          <button type="button" onClick={() => setN((x) => Math.min(MAX_WALL_LEVELS, x + 1))} disabled={n >= MAX_WALL_LEVELS} data-testid="wall-more">+</button>
        </span>
        <span className="wall__fit">
          Frame
          {Array.from({ length: n + 1 }, (_, k) => (
            <button type="button" key={k} className={k === framed ? 'is-on' : undefined} aria-pressed={k === framed}
              onClick={(e) => { setFit(k === n ? null : k); e.currentTarget.blur(); }} data-testid={`wall-fit-${k}`}>
              {k === 0 ? 'the two tiles' : `level ${k}`}
            </button>
          ))}
        </span>
      </div>
      <div className="wall__body">
        <svg className="wall__svg" viewBox={box} data-testid="wall-svg" data-framed={framed} data-tiles={wall.tiles.length} data-wall={wall.wall.length}>
          {wall.tiles.map((t) => (
            <polygon key={`${t.side}-${t.id}`} className={`wall__tile is-${t.side}`} points={t.pts.map((q) => `${q.x},${q.y}`).join(' ')}>
              <title>{t.id}: {t.type}</title>
            </polygon>
          ))}
          {[nearTile, farTile].map((t) => (
            <g key={`key-${t.id}`}>
              <polygon className="wall__key" points={t.pts.map((q) => `${q.x},${q.y}`).join(' ')} fill={tileColor(t.type)} />
              <path d={orientationPath(t.xform)} className="td__flag" />
            </g>
          ))}
          {wall.outlines.near.map((segs, k) => segs.map((s, i) => line(s, `n${k}-${i}`, 'wall__outline', width(k + 1), NEAR)))}
          {wall.outlines.far.map((segs, k) => segs.map((s, i) => line(s, `f${k}-${i}`, 'wall__outline', width(k + 1), FAR)))}
          {wall.wall.map((s, i) => line(s, `w${i}`, 'wall__wall', width(n) + 1))}
          {line(wall.crossed, 'crossed', 'wall__crossed', width(n) + 2)}
          <circle className="wall__ring" cx={cx} cy={cy} r={ring} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="wall__side">
          <p className="wall__legend">
            <span style={{ color: NEAR }}>■</span> the start tile's supertiles, levels 1 to {n}{' '}
            <span style={{ color: FAR }}>■</span> the far tile's supertiles, same levels{' '}
            <span className="wall__legend-wall">■</span> the wall{' '}
            <span className="wall__legend-crossed">○</span> the crossed edge, circled
          </p>
          <table className="td__run wall__table" data-testid="wall-table">
            <thead><tr><th>level</th><th>start tile's slot path</th><th>far tile's slot path</th><th>machine, chain repeated for ever</th></tr></thead>
            <tbody>
              {wall.rungs.map((r) => (
                <tr key={r.level} className={r.machine !== null && r.machine !== r.far ? 'is-bent' : undefined}>
                  <td>{r.level}</td><td>{r.near}</td><td>{r.far}</td><td>{r.machine ?? '—'}</td>
                </tr>
              ))}
              <tr className="wall__closing">
                <td>{n + 1}{wall.closing.length > 1 ? `–${n + wall.closing.length}` : ''}</td>
                <td colSpan={3}>
                  put on top to close the patch: {wall.closing.map((l) => `slot ${l.slot} of a ${l.parent}`).join(', then ')}.
                  The two sides first share a supertile at level {wall.meetLevel}, a {wall.meetType}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default WallView;
