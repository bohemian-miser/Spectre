/**
 * The Classifications page's explanations: the grouped metric dropdowns with
 * a note on the current choice, how the classifier decides, and a glossary of
 * every measurement with its typical values per class.
 *
 * Everything here reads `meta.fields` and `meta.thresholds`, so it follows the
 * data rather than a copy of it.
 */

import { useMemo } from 'react';
import {
  classQuartiles,
  fieldValue,
  formatValue,
  groupFields,
  type ClassificationData,
  type FieldInfo,
  type Quartiles,
} from './data';
import {
  THRESHOLD_NAMES,
  classifierThresholds,
  classify,
  type ClassifierInputs,
  type ThresholdName,
} from './classifier';

const CLASSIFIER_KEYS: readonly (keyof ClassifierInputs)[] = [
  'gC',
  'gO',
  'fo',
  'cFill',
  'cFat',
  'cTri',
  'oFill',
  'oElong',
];

export function fieldAnchor(key: string): string {
  return `cls-field-${key}`;
}

/** "Level 6", "Levels 4 → 6". */
export function levelText(f: FieldInfo): string | null {
  if (!f.level) return null;
  return /→/.test(f.level) ? `Levels ${f.level}` : `Level ${f.level}`;
}

export function FieldSelect(props: {
  readonly fields: readonly FieldInfo[];
  readonly value: number;
  readonly onChange: (i: number) => void;
  readonly label: string;
  readonly ariaLabel: string;
  readonly testId: string;
}): JSX.Element {
  const groups = useMemo(() => groupFields(props.fields), [props.fields]);
  const f = props.fields[props.value];
  const helpId = `${props.testId}-help`;
  return (
    <label className="cls-field">
      <span>{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        aria-label={props.ariaLabel}
        aria-describedby={helpId}
        data-testid={props.testId}
      >
        {groups.map((g) => (
          <optgroup key={g.name} label={g.name}>
            {g.fields.map((i) => (
              <option key={props.fields[i].key} value={i} title={props.fields[i].description}>
                {props.fields[i].label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <small className="cls-field-help" id={helpId} data-testid={helpId}>
        {levelText(f) && <b>{levelText(f)}. </b>}
        {firstSentence(f.description)}{' '}
        <a href={`#${fieldAnchor(f.key)}`} onClick={(e) => scrollToAnchor(e, fieldAnchor(f.key))}>
          More
        </a>
      </small>
    </label>
  );
}

/** The description's first sentence, for the short note under a select. */
export function firstSentence(text: string): string {
  const m = /^.*?[.!?](?=\s+[A-Z0-9(])/.exec(text);
  return m ? m[0] : text;
}

/** In-page links without touching the hash, which holds the page state. */
export function scrollToAnchor(e: { preventDefault: () => void }, id: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

/** Which rule decided a row's class, replayed from its stored (rounded) values. */
export function decidingStep(data: ClassificationData, row: number): { cls: string; step: number } | null {
  const idx = CLASSIFIER_KEYS.map((k) => data.meta.fields.findIndex((f) => f.key === k));
  if (idx.some((i) => i < 0)) return null;
  const inputs = Object.fromEntries(
    CLASSIFIER_KEYS.map((k, j) => [k, fieldValue(data, row, idx[j])]),
  ) as unknown as ClassifierInputs;
  return classify(inputs, classifierThresholds(data.meta));
}

const n = (v: number) => String(v);

export function MethodSection(props: { readonly data: ClassificationData }): JSX.Element {
  const t = classifierThresholds(props.data.meta);
  const v = (k: ThresholdName) => n(t[k].value);
  const fromMeta = !!props.data.meta.thresholds;
  return (
    <section className="cls-method" aria-labelledby="cls-method-h" id="cls-method">
      <h2 id="cls-method-h">How a class is decided</h2>
      <p>
        Every combination is drawn at levels 4, 5 and 6. From level 4 to level 6 the patch holds about
        62 times as many tiles (N), so it is about 8 times as wide. The classifier asks two
        questions: do the strands keep growing as the patch grows, and what shape is the biggest
        one? It uses these measurements.
      </p>
      <dl className="cls-method-terms">
        <dt>
          Growth <span className="mono">gC</span> and <span className="mono">gO</span>
        </dt>
        <dd>
          <span className="mono">gC = log(Lc₆ / Lc₄) / log(N₆ / N₄)</span>, where Lc is the length
          of the longest circuit in segments (counted as 1 when there is none). It is the exponent a
          in &ldquo;length ∝ N^a&rdquo;. <span className="mono">gO</span> is the same for the longest
          open strand, one with an end on the patch edge. The window spans two levels because
          triangle circuits grow on alternate levels: one-level steps flicker between almost 0 and
          about 1.4.
        </dd>
        <dt>
          Share on open strands <span className="mono">fo</span>
        </dt>
        <dd>Segments on open strands over all segments, at level 6.</dd>
        <dt>
          Fill <span className="mono">cFill</span>, <span className="mono">oFill</span>
        </dt>
        <dd>
          A strand&rsquo;s segments over the number its convex hull would hold at the patch&rsquo;s
          average density. About 1 for a strand that covers the area it spans, near 0 for an outline
          or a thread. <span className="mono">cFill</span> is for the biggest circuit,{' '}
          <span className="mono">oFill</span> for the longest open strand, both at level 6.
        </dd>
        <dt>
          Enclosed share <span className="mono">cFat</span>
        </dt>
        <dd>
          The area inside the biggest circuit (shoelace formula) over its convex hull area. A
          triangle outline encloses most of its hull; a thin, doubled-back thread encloses little.
        </dd>
        <dt>
          Triangularity <span className="mono">cTri</span>
        </dt>
        <dd>
          The hull&rsquo;s area over the smallest equilateral triangle that contains it, trying every
          rotation. 1 for a triangle, 0.67 for a regular hexagon, 0.6 for a disk.
        </dd>
        <dt>
          Elongation <span className="mono">oElong</span>
        </dt>
        <dd>
          The square root of the ratio of the two principal moments of the longest open strand&rsquo;s
          points. Slivers cut off along the patch edge score high.
        </dd>
      </dl>
      <p>
        In short, the circuits <b>grow</b> when <span className="mono">gC ≥ {v('GROW')}</span>.
        The open strand is <b>line-like</b> when{' '}
        <span className="mono">
          gO ≥ {v('LINE_G')}, fo ≥ {v('LINE_FO')}, oElong &lt; {v('SLIVER')} and oFill ≥ {v('OFILL')}
        </span>
        . The rules are tried in this order and the first that matches decides.
      </p>
      <ol className="cls-rules" data-testid="cls-rules">
        <li>
          Circuits do not grow and <span className="mono">gO &lt; {v('STATIC')}</span>:{' '}
          <ClassRef id="bounded" data={props.data} />.
        </li>
        <li>
          Circuits do not grow and the open strand is line-like: <ClassRef id="line" data={props.data} />.
        </li>
        <li>
          Circuits grow and the open strand is line-like: <ClassRef id="mixed" data={props.data} />.
        </li>
        <li>
          Circuits grow and <span className="mono">cFill ≥ {v('FILL')}</span>:{' '}
          <ClassRef id="mixed" data={props.data} /> if <span className="mono">cTri ≥ {v('TRI')}</span>,
          otherwise <ClassRef id="blob" data={props.data} />.
        </li>
        <li>
          Circuits grow and the biggest one passes through a junction, so it has no enclosed area:{' '}
          <ClassRef id="triangle" data={props.data} /> if <span className="mono">cTri ≥ {v('TRI')}</span>,
          otherwise <ClassRef id="unclear" data={props.data} />. No swept combination has such
          junctions.
        </li>
        <li>
          Circuits grow, <span className="mono">cTri ≥ {v('TRI')}</span> and{' '}
          <span className="mono">cFat ≥ {v('FAT')}</span>: <ClassRef id="triangle" data={props.data} />.
        </li>
        <li>
          Circuits grow and <span className="mono">cFat &lt; {v('THIN')}</span>:{' '}
          <ClassRef id="thin" data={props.data} />.
        </li>
        <li>
          Anything else: <ClassRef id="unclear" data={props.data} />. This includes a strand that is
          still growing a little (<span className="mono">gO ≥ {v('STATIC')}</span>) without being
          line-like.
        </li>
      </ol>
      <details className="cls-thresholds">
        <summary>The thresholds</summary>
        <table className="cls-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Value</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {THRESHOLD_NAMES.map((k) => (
              <tr key={k}>
                <td className="mono">{k}</td>
                <td>{n(t[k].value)}</td>
                <td className="cls-wrap">{t[k].meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          {fromMeta
            ? 'Read from the data file, which the classifier wrote, so they are the values actually used.'
            : 'This data file predates stored thresholds; these are the values in classify.py.'}
        </p>
      </details>
      <h3>Fractal dimension</h3>
      <p>
        A patch of N tiles is about √N tiles wide. A curve of fractal dimension d that spans the patch
        is then about (√N)^d = N^(d/2) segments long, so d ≈ 2 × gC. That is the{' '}
        <b>dimension from growth</b>. The <b>mass-radius dimension</b> compares the biggest
        circuit&rsquo;s length with its own radius of gyration instead of the patch&rsquo;s size:{' '}
        <span className="mono">log(Lc₆ / Lc₄) / log(Rg₆ / Rg₄)</span>. The two agree when the circuit
        spans a fixed share of the patch. Triangle fractals come out near 1.4, thin circuits near 1.9
        and space-filling ones near 2.
      </p>
      <p className="muted">
        Treat both as estimates. They come from a two-level window at finite size: one pair of patch
        sizes, about 8 times apart in width, not a fit over many scales. The biggest circuit at level
        4 and the one at level 6 are different circuits. The patch edge cuts open circuits that would
        otherwise be the biggest, which can push gC above 1 and the dimension from growth above 2.
        Such values mean the window was too small, not a dimension above 2. The mass-radius estimate is left
        at 0 when the circuit&rsquo;s radius grows by less than 1.5 times, since a bounded circuit has no
        dimension to read.
      </p>
    </section>
  );
}

function ClassRef(props: { readonly id: string; readonly data: ClassificationData }): JSX.Element {
  const c = props.data.meta.classes.find((k) => k.id === props.id);
  return (
    <span className="cls-name">
      <i style={{ background: `var(--cls-${props.id})` }} aria-hidden="true" />
      <b>{c?.label ?? props.id}</b>
    </span>
  );
}

function quartileText(f: FieldInfo, q: Quartiles): string {
  const [a, m, b] = q;
  if (formatValue(f, a) === formatValue(f, b)) return formatValue(f, m);
  return `${formatValue(f, m)} (${formatValue(f, a)} to ${formatValue(f, b)})`;
}

export function Glossary(props: {
  readonly data: ClassificationData;
  readonly classTotals: readonly number[];
}): JSX.Element {
  const { data, classTotals } = props;
  const { meta } = data;
  const groups = useMemo(() => groupFields(meta.fields), [meta.fields]);
  const quartiles = useMemo(() => classQuartiles(data), [data]);
  return (
    <section className="cls-glossary" aria-labelledby="cls-glossary-h" id="cls-glossary">
      <h2 id="cls-glossary-h">Every measurement</h2>
      <p className="muted">
        What each axis option measures, the level it is measured at, and its typical value in each
        class: the median, with the middle half of the class between the two numbers in brackets.
        Values are stored rounded to one of 256 steps of each range, so they are approximate.
      </p>
      {groups.map((g) => (
        <div key={g.name} className="cls-gloss-group">
          <h3>{g.name}</h3>
          <div className="cls-gloss-list">
            {g.fields.map((fi) => {
              const f = meta.fields[fi];
              return (
                <article key={f.key} className="cls-gloss-item" id={fieldAnchor(f.key)} data-testid={fieldAnchor(f.key)}>
                  <h4>
                    {f.label} <span className="mono muted">{f.key}</span>
                  </h4>
                  <p className="cls-gloss-meta">
                    {levelText(f) && <span>{levelText(f)}</span>}
                    {f.formula && <span className="mono">{f.formula}</span>}
                    {f.scale === 'log2' && <span>plotted on a log scale</span>}
                  </p>
                  <p>{f.description}</p>
                  <ul className="cls-gloss-typical" aria-label={`Typical ${f.label} per class`}>
                    {meta.classes.map((c, ci) => {
                      const q = quartiles[fi][ci];
                      if (!q || !classTotals[ci]) return null;
                      return (
                        <li key={c.id}>
                          <i style={{ background: `var(--cls-${c.id})` }} aria-hidden="true" />
                          <span>{c.label}</span>
                          <b>{quartileText(f, q)}</b>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/** The pinned combination's values, grouped as in the dropdowns. */
export function GroupedValues(props: { readonly data: ClassificationData; readonly row: number }): JSX.Element {
  const { data, row } = props;
  const groups = useMemo(() => groupFields(data.meta.fields), [data.meta.fields]);
  return (
    <div className="cls-values-groups">
      {groups.map((g) => (
        <div key={g.name}>
          <h3>{g.name}</h3>
          <dl className="cls-values">
            {g.fields.map((i) => {
              const f = data.meta.fields[i];
              return (
                <div key={f.key} title={`${f.description}${f.level ? ` (level ${f.level})` : ''}`}>
                  <dt>{f.label}</dt>
                  <dd>≈ {formatValue(f, fieldValue(data, row, i))}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

