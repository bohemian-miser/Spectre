/**
 * Identify: a strand named by one of its tiles, followed up the tile's
 * ancestors a level at a time until it closes (`identify/identify.ts`).
 * Each level built shows the strand so far beside the nearest circuit the
 * build knows or its chains predict, their readings lined up.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker } from './shapes/ComboPicker';
import { harmonicsHref, loadCombo, nf } from './foundations/data';
import { compareHref, type CircuitRef } from './compare/refs';
import { identifyHref, readIdentify } from './identify/href';
import { startIdentify, type IdentifyRun } from './identify/client';
import { labelOf, randomOpenStrand, type Candidate, type Drawn, type Report, type View } from './identify/identify';
import '../styles/shapes.css';
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
const PANEL = 360;

const pct = (s: number): string => `${Math.round(100 * s)}%`;
const base = (): string => import.meta.env.BASE_URL;

/** An open strand to start from when the address names none. */
function randomTarget(subset: readonly number[], combo: string, level: number): Target | null {
  const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), level, 1, true);
  const r = randomOpenStrand(cs, level);
  return r ? { subset, combo, level, ...r } : null;
}

const pathOf = (xy: Float64Array, close = false): string => {
  let d = '';
  for (let i = 0; i < xy.length; i += 2) d += `${i ? 'L' : 'M'}${xy[i].toFixed(3)} ${(-xy[i + 1]).toFixed(3)}`;
  return close ? `${d}Z` : d;
};

type Box = [number, number, number, number];

function boxOf(lines: readonly Float64Array[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const xy of lines)
    for (let i = 0; i < xy.length; i += 2) {
      x0 = Math.min(x0, xy[i]); x1 = Math.max(x1, xy[i]);
      y0 = Math.min(y0, xy[i + 1]); y1 = Math.max(y1, xy[i + 1]);
    }
  const m = 0.03 * Math.max(x1 - x0, y1 - y0, 1e-9);
  return [x0 - m, y0 - m, x1 + m, y1 + m];
}

/** One picture: supertile outlines (matched ones shaded), the strand or circuit, and optionally the frame and the start tile. */
function Picture(props: { drawn: Drawn; box: Box; frame?: Float64Array; chord?: readonly number[]; label: string; testId: string }): JSX.Element {
  const [x0, y0, x1, y1] = props.box;
  const w = x1 - x0, h = y1 - y0;
  const side = Math.max(w, h);
  const vb = `${x0 - (side - w) / 2} ${-y1 - (side - h) / 2} ${side} ${side}`;
  const dot = side / 70;
  return (
    <svg className="identify-svg" viewBox={vb} width={PANEL} height={PANEL} role="img" aria-label={props.label} data-testid={props.testId}>
      {props.frame && <path d={pathOf(props.frame, true)} className="identify-frame" vectorEffect="non-scaling-stroke" />}
      {props.drawn.outlines.map((o, i) => (
        <path key={i} d={pathOf(o, true)} className={props.drawn.matched[i] ? 'identify-st is-matched' : 'identify-st'} vectorEffect="non-scaling-stroke" />
      ))}
      <path d={pathOf(props.drawn.line)} className="identify-line" vectorEffect="non-scaling-stroke" />
      {props.chord && (
        <>
          <path d={`M${props.chord[0]} ${-props.chord[1]}L${props.chord[2]} ${-props.chord[3]}`} className="identify-chord" vectorEffect="non-scaling-stroke" />
          <circle cx={(props.chord[0] + props.chord[2]) / 2} cy={-(props.chord[1] + props.chord[3]) / 2} r={dot} className="identify-start" />
        </>
      )}
    </svg>
  );
}

/** A reading as a row of visits, the matched ones marked; long rows cut round the first match. */
function ReadingRow(props: { tokens: readonly string[]; matched: readonly boolean[]; label: string }): JSX.Element {
  const MAX = 60;
  const { tokens, matched } = props;
  const first = Math.max(0, matched.indexOf(true));
  const from = tokens.length <= MAX ? 0 : Math.min(Math.max(0, first - 10), tokens.length - MAX);
  const shown = tokens.slice(from, from + MAX);
  return (
    <div className="identify-reading">
      <span className="identify-reading-label">{props.label}</span>
      <span className="identify-tokens">
        {from > 0 && <span className="identify-more">… </span>}
        {shown.map((t, i) => (
          <span key={i} className={matched[from + i] ? 'identify-tok is-matched' : 'identify-tok'}>
            {t}
          </span>
        ))}
        {from + MAX < tokens.length && <span className="identify-more"> … {nf(tokens.length - from - MAX)} more</span>}
      </span>
    </div>
  );
}

const named = (subset: readonly number[], combo: string, c: { level: number; length: number }): CircuitRef => ({ subset, combo, level: c.level, length: c.length });

function Links(props: { target: Target; report: Report }): JSX.Element | null {
  const { target, report } = props;
  const rule = target.subset.join('');
  const id = report.identified;
  const best = report.candidates[0];
  if (id?.circuit) {
    const c = id.circuit;
    const members = id.chain?.members ?? [];
    const at = members.findIndex((m) => m.level === c.level && m.length === c.length);
    const other = members[at - 1] ?? members[at + 1] ?? null;
    return (
      <p className="identify-links">
        <a href={harmonicsHref(base(), target.combo, Math.max(report.level, other?.level ?? 0), rule, c)}>Harmonics</a>
        {other && <a href={compareHref(base(), named(target.subset, target.combo, other.level < c.level ? other : c), named(target.subset, target.combo, other.level < c.level ? c : other))}>Compare with the {nf(other.length)}</a>}
      </p>
    );
  }
  if (!best) return null;
  return (
    <p className="identify-links">
      <a href={harmonicsHref(base(), target.combo, Math.min(9, Math.max(report.level, best.member.level)), rule, best.member)}>Harmonics</a>
      {best.length !== null && best.level <= 12 && (
        <a href={compareHref(base(), named(target.subset, target.combo, best.member), named(target.subset, target.combo, { level: best.level, length: best.length }))}>
          Compare the {nf(best.member.length)} with the {nf(best.length)}
        </a>
      )}
    </p>
  );
}

const chainText = (members: readonly { length: number }[]): string => members.map((m) => nf(m.length)).join(' → ');

function lengthText(c: Candidate): string {
  if (c.length === null) return '';
  return c.lengthFrom === 'data' ? `, ${nf(c.length)} tiles` : `, ${nf(c.length)} tiles as predicted from the build`;
}

function Verdict(props: { report: Report; running: boolean }): JSX.Element {
  const r = props.report;
  if (r.found === 'ends') return <p className="identify-verdict">The strand ends inside a tile at level {r.level}.</p>;
  if (r.identified) {
    const id = r.identified;
    if (!id.circuit) return <p className="identify-verdict">Closes at level {id.level} after {nf(id.length)} tiles, a circuit the build has no other copy of.</p>;
    const root = id.chain?.members[0];
    return (
      <div className="identify-verdict">
        <p>
          Closes at level {id.level}: the <strong>{nf(id.circuit.length)}</strong>
          {id.circuit.level < id.level ? `, which first closes at level ${id.circuit.level}` : ''}.{' '}
          {id.order === 0 ? 'It starts its chain' : `Harmonic ${id.order} of the ${nf(root!.length)}`}
          {id.chain && id.chain.members.length > 1 ? ` (${chainText(id.chain.members)})` : ''}.
        </p>
        {id.known && (
          <p className="shapes-note">
            The precomputed analysis of this combination {id.known.order === id.order && id.known.root.length === root?.length ? 'agrees' : 'differs'}:{' '}
            {id.known.order === 0 ? 'a foundational circuit' : `harmonic ${id.known.order} of the ${nf(id.known.root.length)}`}.
          </p>
        )}
      </div>
    );
  }
  const [best, next] = r.candidates;
  return (
    <div className="identify-verdict">
      <p>
        {props.running ? 'Open' : 'Still open'} at level {r.level} after {nf(r.tiles)} tiles.
        {best ? (
          <>
            {' '}Most likely <strong>{labelOf(best)}</strong>
            {lengthText(best)}.
          </>
        ) : (
          ' Too short to compare yet.'
        )}
      </p>
      {best && (
        <p className="shapes-note">
          Its reading accounts for {pct(best.similarity)} of the strand&apos;s {nf(best.tokens)} visits at level{best.levels.length > 1 ? 's' : ''} {best.levels.join(', ')}
          {next ? `; next best ${labelOf(next)}, ${pct(next.similarity)}` : '; no other chain compares'}.
        </p>
      )}
    </div>
  );
}

function Comparison(props: { view: View; report: Report }): JSX.Element {
  const { view, report } = props;
  const [whole, setWhole] = useState(false);
  // the strand and the supertiles it runs through, with the frame only when the strand reaches its border
  const leftBox = useMemo(() => boxOf(report.found === 'open' ? [view.frame, view.left.line] : [view.left.line, ...view.left.outlines]), [view, report.found]);
  const rightBox = useMemo(() => (view.right ? (whole ? boxOf([view.right.line, ...view.right.outlines]) : leftBox) : leftBox), [view, whole, leftBox]);
  const best = report.candidates[0];
  const nearName = report.identified?.circuit ? `the ${nf(report.identified.circuit.length)} as the build has it` : best ? `${labelOf(best)}, read as the ${nf(best.member.length)} ${best.steps === 1 ? 'two levels' : `${2 * best.steps} levels`} up and drawn through the middles of its supertiles` : '';
  return (
    <section className="identify-compare">
      <div className="identify-pair">
        <figure>
          <Picture drawn={view.left} box={leftBox} frame={view.frame} chord={view.chord} label="The strand over its supertiles" testId="identify-left" />
          <figcaption>
            The strand in its level-{report.level} supertile, over the level-{view.level} supertiles it runs through. The dot is its tile.
          </figcaption>
        </figure>
        <figure>
          {view.right ? (
            <Picture drawn={view.right} box={rightBox} label="The nearest circuit" testId="identify-right" />
          ) : (
            <div className="identify-empty" style={{ width: PANEL, height: PANEL }}>Nothing to compare yet</div>
          )}
          <figcaption>
            {nearName ? `Nearest: ${nearName}, ` : ''}moved onto the strand where their readings match{view.mirrored ? ' (mirrored)' : ''}.{' '}
            {view.right && (
              <label className="shapes-check">
                <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} /> whole
              </label>
            )}
          </figcaption>
        </figure>
      </div>
      <div className="identify-readings" data-testid="identify-readings">
        <ReadingRow tokens={view.tokens.arc} matched={view.tokens.arcMatched} label="strand" />
        {view.tokens.near.length > 0 && <ReadingRow tokens={view.tokens.near} matched={view.tokens.nearMatched} label="nearest" />}
        <p className="shapes-note">
          Level {view.level}: each visit is a supertile&apos;s type, its slot and its parent&apos;s type; shaded visits are in both, in order.
        </p>
      </div>
    </section>
  );
}

function LevelTable(props: { report: Report; root: number; running: boolean }): JSX.Element {
  const { report } = props;
  const above = report.rows.some((r) => r.above);
  return (
    <section>
      <div className="shapes-tablewrap">
        <table className="shapes-table identify-table" data-testid="identify-levels">
          <thead>
            <tr>
              <th>Level</th>
              <th>Tiles</th>
              <th>Strand</th>
              <th>Most likely</th>
              <th>Similarity</th>
              <th>Over visits</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.level}>
                <td>
                  {r.level}
                  {r.above ? '*' : ''}
                </td>
                <td>{nf(r.tiles)}</td>
                <td>{r.state === 'open' ? 'open' : r.state === 'closed' ? 'closes' : 'ends'}</td>
                <td className="identify-best">{r.best ?? '–'}</td>
                <td>{r.similarity === null ? '–' : pct(r.similarity)}</td>
                <td>{r.visits === null ? '–' : nf(r.visits)}</td>
              </tr>
            ))}
            {props.running && (
              <tr>
                <td>{report.level + 1}</td>
                <td colSpan={5} className="identify-best">
                  building…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {above && <p className="shapes-note">* Above level {props.root} the supertile of the address is taken as slot 1 of a Delta, which every Delta has.</p>}
      {report.why && !props.running && <p className="shapes-note">Done: {report.why}.</p>}
    </section>
  );
}

export default function IdentifyPage(): JSX.Element {
  const asked = useRef(typeof location === 'undefined' ? null : readIdentify(location.search));
  const capAsked = useRef(typeof location === 'undefined' ? null : Number(new URLSearchParams(location.search).get('upto')) || null);
  const [target, setTarget] = useState<Target | null>(asked.current);
  const [cap, setCap] = useState(capAsked.current ?? DEFAULT_CAP);
  const [draft, setDraft] = useState({ tile: asked.current?.tile ?? '', edge: String(asked.current?.edge ?? 0), level: String(asked.current?.level ?? DEFAULT.level) });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const runRef = useRef<IdentifyRun | null>(null);
  const token = useRef(0);

  const go = (t: Target, upTo: number): void => {
    runRef.current?.stop();
    const mine = ++token.current;
    setTarget(t);
    setCap(upTo);
    setDraft({ tile: t.tile, edge: String(t.edge), level: String(t.level) });
    setReport(null);
    setError(null);
    setRunning(true);
    const href = identifyHref(base(), t);
    history.replaceState(null, '', `${href}${upTo !== DEFAULT_CAP ? `&upto=${upTo}` : ''}`);
    const rule = t.subset.join('');
    loadCombo(base(), t.combo, undefined, rule)
      .catch(() => null)
      .then((known) => {
        if (token.current !== mine) return;
        runRef.current = startIdentify(
          { subset: t.subset, combo: t.combo, tile: t.tile, edge: t.edge, level: t.level, cap: upTo, known },
          (r) => {
            if (token.current !== mine) return;
            setReport(r);
            if (r.done) setRunning(false);
          },
          (m) => {
            if (token.current !== mine) return;
            setError(m);
            setRunning(false);
          },
        );
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
    return () => runRef.current?.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subset = target?.subset ?? DEFAULT.subset;
  const combo = target?.combo ?? DEFAULT.combo;
  const rootLevel = Math.max(1, Math.min(12, Number(draft.level) || DEFAULT.level));
  const draftTarget = (s: readonly number[], c: string): Target => ({ subset: s, combo: c, tile: draft.tile.trim(), edge: Number(draft.edge) || 0, level: rootLevel });
  const draftOk = /^[0-7](\.[0-7])*$/.test(draft.tile.trim()) && draft.tile.trim().split('.').length === rootLevel;

  return (
    <div className="shapes-page identify-page">
      <div>
        <h1>Identify a strand</h1>
        <p className="shapes-note">
          A strand named by one of its tiles: its slot path under a Delta and the edge it enters by. Each level up, the strand is followed through its supertile until it
          closes; while it is open, its reading is set against every chain of the combination carried above the build.
        </p>
      </div>
      <section className="identify-controls">
        <ComboPicker
          key={`${subset.join('')}-${combo}`}
          busy={false}
          levels="any"
          verb="Identify"
          initialRule={subset.join('')}
          initialCombo={combo}
          initialLevel={cap}
          onAdd={(c) => {
            if (draftOk) go(draftTarget(c.subset, c.combo), c.level);
            else setError(`the tile needs ${rootLevel} slots, such as ${Array.from({ length: rootLevel }, () => '1').join('.')}`);
          }}
        />
        <div className="shapes-controls">
          <label>
            Tile
            <input value={draft.tile} onChange={(e) => setDraft({ ...draft, tile: e.target.value })} size={18} data-testid="identify-tile" />
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
          {running && (
            <button
              type="button"
              onClick={() => {
                runRef.current?.stop();
                token.current++;
                setRunning(false);
              }}
            >
              Stop
            </button>
          )}
        </div>
      </section>
      {error && <p className="identify-error">{error}</p>}
      {target && (
        <p className="shapes-note" data-testid="identify-target">
          {target.subset.join('')} · {target.combo}, tile {target.tile} under a level-{target.level} Delta, entered by edge {target.edge}
          {report ? ` (a ${report.start.type}, left by edge ${report.start.exit})` : ''}.
        </p>
      )}
      {report && <Verdict report={report} running={running} />}
      {report && target && <Links target={target} report={report} />}
      {report?.view && <Comparison view={report.view} report={report} />}
      {report && <LevelTable report={report} root={target?.level ?? 0} running={running} />}
      {!report && running && <p className="shapes-note">Building level 1…</p>}
      {report && report.candidates.length > 1 && (
        <section>
          <h2>Candidates</h2>
          <div className="shapes-tablewrap">
            <table className="shapes-table identify-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Chain</th>
                  <th>Tiles</th>
                  <th>Similarity</th>
                </tr>
              </thead>
              <tbody>
                {report.candidates.map((c, i) => (
                  <tr key={i}>
                    <td className="identify-best">{labelOf(c)}</td>
                    <td>{chainText(c.chain.members)}</td>
                    <td>{c.length === null ? '–' : nf(c.length)}</td>
                    <td>{pct(c.similarity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
