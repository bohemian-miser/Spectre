/**
 * Circuits: a rule's circuit types, as a first draft of a periodic table.
 *
 * The rule's pairings are sorted into boundary classes (pairings that route
 * every strand leaving a supertile the same way, so they draw the same thing
 * at every larger scale). Each class is run up the substitution without
 * building any patch (`web/circuit-classes/circuit-atlas.ts`), which gives
 * every circuit born at every level to 9 or 10: its families (circuits that
 * run through the same children of the supertile they are born in), how fast
 * the biggest grow, the dimension that implies, and silhouettes of circuits
 * far too big to render tile by tile.
 */

import { useEffect, useMemo, useState } from 'react';
import { PanZoom } from '../components/PanZoom';
import { explorerHref } from './centremap/parts';
import {
  ATLASES,
  KIND_BLURB,
  KIND_LABEL,
  KIND_ORDER,
  loadAtlas,
  shapePath,
  shapeSpan,
  type Atlas,
  type AtlasClass,
  type AtlasShape,
} from './circuits/data';
import '../styles/circuits.css';

const VIEW = { min: { x: 0, y: 0 }, max: { x: 4095, y: 4095 } };
const fmt = (n: number) => n.toLocaleString('en-US');

function Silhouette(props: { shape: AtlasShape; size: number; label?: string }): JSX.Element {
  const { shape, size, label } = props;
  return (
    <svg className="circuits-silhouette" width={size} height={size} viewBox="-60 -60 4215 4215" role="img" aria-label={label ?? shape.what}>
      <path d={shapePath(shape)} />
    </svg>
  );
}

export default function CircuitsPage(): JSX.Element {
  const [which, setWhich] = useState(0);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    const a = ATLASES[which];
    setAtlas(null);
    setError(null);
    setPicked(null);
    loadAtlas(import.meta.env.BASE_URL, a.family, a.rule, abort.signal)
      .then(setAtlas)
      .catch((e: unknown) => {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => abort.abort();
  }, [which]);

  const byKind = useMemo(() => {
    const out = new Map<string, { c: AtlasClass; i: number }[]>();
    atlas?.classes.forEach((c, i) => (out.get(c.kind) ?? out.set(c.kind, []).get(c.kind)!).push({ c, i }));
    for (const list of out.values()) list.sort((a, b) => (b.c.dimension ?? 0) - (a.c.dimension ?? 0) || b.c.members.length - a.c.members.length);
    return out;
  }, [atlas]);

  return (
    <article className="circuits-page">
      <header>
        <h1>Circuits</h1>
        <p className="muted">
          A first draft of a periodic table of circuits. A rule&rsquo;s pairings are sorted into <b>classes</b>: pairings that send every strand
          leaving a supertile the same way, so they draw the same picture at every larger scale and differ only by small loops. Each class is
          then run up the substitution without building any patch, which finds every circuit born at every level up to 9 or 10, hundreds of
          millions of tiles. Its circuits fall into <b>families</b> (circuits running through the same children of the supertile they are born
          in), each reborn bigger every one or two levels. How fast the biggest grow gives a <b>dimension</b>: about 1.45 for the common
          triangle and bow-tie fractals, about 2 for circuits that fill the area they span. Silhouettes are drawn straight from the hierarchy,
          so even million-tile circuits show their whole shape.
        </p>
      </header>

      <div className="circuits-controls">
        <label>
          Rule
          <select value={which} onChange={(e) => setWhich(Number(e.target.value))} data-testid="circuits-atlas">
            {ATLASES.map((a, i) => (
              <option key={a.label} value={i}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {atlas && (
          <span className="muted" data-testid="circuits-summary">
            {fmt(atlas.classes.reduce((s, c) => s + c.members.length, 0))} pairings in {atlas.classes.length} classes · computed {atlas.generated}
          </span>
        )}
      </div>
      {error && <p className="muted">The atlas isn&rsquo;t available ({error}).</p>}
      {!atlas && !error && <p className="muted">Loading…</p>}

      {atlas &&
        KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => (
          <section key={kind} className="circuits-kind" aria-labelledby={`circuits-${kind}`}>
            <h2 id={`circuits-${kind}`}>
              {KIND_LABEL[kind]} <span className="muted">· {byKind.get(kind)!.length} classes</span>
            </h2>
            <p className="muted circuits-note">{KIND_BLURB[kind]}</p>
            <div className="circuits-grid">
              {byKind.get(kind)!.map(({ c, i }) => (
                <button
                  key={i}
                  type="button"
                  className={`circuits-card${picked === i ? ' is-on' : ''}`}
                  onClick={() => setPicked(picked === i ? null : i)}
                  data-testid="circuits-card"
                >
                  {c.shapes[0] ? <Silhouette shape={c.shapes[0]} size={150} /> : <span className="circuits-empty">no circuit</span>}
                  <span className="mono">{c.pattern}</span>
                  <span className="muted">
                    {c.members.length} pairing{c.members.length === 1 ? '' : 's'}
                    {c.dimension !== null ? ` · D ${c.dimension.toFixed(2)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

      {atlas && picked !== null && <ClassDetail atlas={atlas} c={atlas.classes[picked]} onClose={() => setPicked(null)} />}
    </article>
  );
}

function ClassDetail(props: { atlas: Atlas; c: AtlasClass; onClose: () => void }): JSX.Element {
  const { atlas, c, onClose } = props;
  const [shown, setShown] = useState(0);
  useEffect(() => setShown(0), [c]);
  const shape = c.shapes[shown];
  const subset = [...atlas.rule].map(Number);
  const levels = c.longest.map((_, i) => i + 1);
  return (
    <section className="circuits-detail" aria-labelledby="circuits-detail-h" data-testid="circuits-detail">
      <h2 id="circuits-detail-h">
        <span className="mono">
          {atlas.rule} · {c.pattern}
        </span>
        <span className="muted">
          {KIND_LABEL[c.kind]}
          {c.dimension !== null ? ` · dimension ${c.dimension.toFixed(2)}` : ''}
          {c.growth !== null ? ` · biggest circuit ×${c.growth.toFixed(1)} per two levels` : ''}
        </span>
        <button type="button" className="circuits-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </h2>
      <p className="circuits-members">
        {c.members.map((m) => (
          <a key={m} className="mono" href={explorerHref(atlas.family, subset, m, 5)} title="Open in the Explorer at level 5">
            {m}
          </a>
        ))}
      </p>

      <div className="circuits-detail-body">
        <div>
          {shape ? (
            <>
              <div className="circuits-shape-tabs" role="group" aria-label="Silhouette">
                {c.shapes.map((s, k) => (
                  <button key={k} type="button" className={k === shown ? 'is-on' : undefined} aria-pressed={k === shown} onClick={() => setShown(k)} data-testid="circuits-shape-tab">
                    {s.closed ? `${fmt(s.length)} tiles` : `open strand, ${fmt(s.length)}+`}
                  </button>
                ))}
              </div>
              <PanZoom className="circuits-zoom" fitBounds={VIEW} padding={8} maxScale={40} showControls ariaLabel="Silhouette: wheel or pinch to zoom, drag to pan">
                {(api) => (
                  <svg className="circuits-big" data-testid="circuits-big">
                    <g transform={`translate(${api.camera.x} ${api.camera.y}) scale(${api.camera.scale || 1})`}>
                      <path d={shapePath(shape)} strokeWidth={1.2 / (api.camera.scale || 1)} />
                    </g>
                  </svg>
                )}
              </PanZoom>
              <p className="muted circuits-note" data-testid="circuits-caption">
                {shape.closed
                  ? `A ${fmt(shape.length)}-tile circuit born in a level-${shape.level} supertile (${shape.what}), about ${fmt(Math.round(shapeSpan(shape)))} tiles across.`
                  : `The longest strand through a level-${shape.level} Delta supertile, ${fmt(shape.length)} tiles and still open: a circuit of a later generation, or a line that never closes.`}{' '}
                {shape.stop > 0 ? `Drawn from the level-${shape.stop} supertiles, each stretch inside one drawn as a straight chord.` : 'Drawn tile by tile.'}
              </p>
            </>
          ) : (
            <p className="muted">No circuit or long strand to draw by level {c.depth}.</p>
          )}
        </div>
        <div>
          <h3>By level (Delta supertile)</h3>
          <table className="circuits-table">
            <thead>
              <tr>
                <th>level</th>
                {levels.map((l) => (
                  <th key={l}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>longest circuit born</th>
                {c.longest.map((v, k) => (
                  <td key={k}>{v ? fmt(v) : '·'}</td>
                ))}
              </tr>
              <tr>
                <th>longest open strand</th>
                {c.openArc.map((v, k) => (
                  <td key={k}>{fmt(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <h3>Families</h3>
          <p className="muted circuits-note">
            Circuits grouped by the children of their supertile they run through (slots 0–7), in every supertile type; the sizes born per level, biggest first.
          </p>
          <table className="circuits-table" data-testid="circuits-families">
            <thead>
              <tr>
                <th>children</th>
                <th>from</th>
                <th>sizes born, by level</th>
                <th>×/2 levels</th>
              </tr>
            </thead>
            <tbody>
              {c.families.map((f) => (
                <tr key={f.slots}>
                  <td className="mono">{f.slots}</td>
                  <td>L{f.firstLevel}</td>
                  <td className="circuits-sizes">
                    {f.lengths
                      .map((ls, k) => (ls.length ? `L${k + 1}: ${ls.map(fmt).join(' / ')}` : ''))
                      .filter(Boolean)
                      .slice(-4)
                      .join(' · ')}
                  </td>
                  <td>{f.growth !== null ? f.growth.toFixed(1) : '·'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
