/**
 * Rules & isomorphism: how the valid edge rules of Tile(1,1), the hexagons and
 * Tile(1,1) with hexagon-matching labels line up, and where their combination
 * spaces agree. Every number is computed on load by `ruleCorrespondences`
 * (core/isomorphism.ts), which also documents the two places they differ.
 */

import { useMemo } from 'react';
import { ruleCorrespondences, type RuleCorrespondence } from '../core';
import { navHref, navItem } from '../lib/siteNav';
import '../styles/rules.css';

const fmt = (n: number) => n.toLocaleString('en-US');

function defaultBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

export interface RulesPageProps {
  readonly base?: string;
}

export default function RulesPage(props: RulesPageProps = {}): JSX.Element {
  const base = props.base ?? defaultBase();
  const rows = useMemo(() => ruleCorrespondences(), []);
  const cls = navItem('classifications');
  const classificationsHref = (family: string, rule: string) =>
    cls ? `${navHref(cls, base)}#/classifications?r=${family}-${rule}` : '#';

  return (
    <article className="rules-page">
      <header>
        <h1>Rules &amp; isomorphism</h1>
        <p className="muted">
          The same edge rule can be read on three labellings: Tile(1,1), the hexagons, and
          Tile(1,1) with its seams numbered to match the hexagons seam for seam (&ldquo;iso&rdquo;).
          Their combination counts differ, and the differences come from exactly two places in the
          tiling.
        </p>
      </header>

      <section aria-labelledby="rules-counts-h">
        <h2 id="rules-counts-h">Combination counts, lined up by rule</h2>
        <p>
          Rules are written in iso labels. The hexagons have no class 7, which only exists inside the
          Mystic, and Tile(1,1) has no class 4 in any valid rule. Click a count to see that
          rule&rsquo;s combinations on the Classifications page. The hexagon and iso full rules are
          not there, because they mostly repeat Tile(1,1).
        </p>
        <div className="rules-table-box">
          <table className="rules-table">
            <thead>
              <tr>
                <th scope="col">Rule (iso labels)</th>
                <th scope="col">Tile(1,1)</th>
                <th scope="col">Hexagons</th>
                <th scope="col">Iso</th>
                <th scope="col" className="rules-rel">Relationship</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.iso} data-testid={`rules-row-${r.iso}`}>
                  <th scope="row" className="mono">
                    {r.iso}
                  </th>
                  <CountCell family="spectre" rule={r.spectre} iso={r.iso} n={r.counts.spectre} href={classificationsHref} />
                  <CountCell family="hex" rule={r.hex} iso={r.iso} n={r.counts.hex} href={classificationsHref} />
                  <CountCell family="spectre-iso" rule={r.iso} iso={r.iso} n={r.counts.iso} href={classificationsHref} />
                  <td className="rules-rel">{relationship(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="rules-split-h">
        <h2 id="rules-split-h">Where the combinations match</h2>
        <p>
          For rules with class 6, each combination falls into one of these groups. Hexagon
          combinations are either the same pattern as an iso combination or need something iso
          can&rsquo;t do. Iso combinations are either a hexagon pattern, a Tile(1,1) pattern with
          small extra loops, or neither.
        </p>
        <div className="rules-table-box">
          <table className="rules-table">
            <thead>
              <tr>
                <th scope="col">Rule (iso labels)</th>
                <th scope="col">Hexagons = iso</th>
                <th scope="col">Hexagons only</th>
                <th scope="col">Tile(1,1) inside iso</th>
                <th scope="col">Iso only</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => !r.identical)
                .map((r) => (
                  <tr key={r.iso}>
                    <th scope="row" className="mono">
                      {r.iso}
                    </th>
                    <td>{fmt(r.hexAndIso)}</td>
                    <td>{fmt(r.hexOnly)}</td>
                    <td>{fmt(r.tileImage)}</td>
                    <td>{fmt(r.isoOnly)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="rules-why-h">
        <h2 id="rules-why-h">The two differences</h2>
        <h3>The Mystic: one tile or two</h3>
        <p>
          A hexagon Gamma is a single tile, so any non-crossing pairing of its crossings is allowed.
          The iso Mystic is two tiles, Gamma1 and Gamma2, joined by the class-7 seam, and that seam
          carries one crossing, so at most one strand passes between the halves. Composing the two
          halves&rsquo; pairings through that crossing gives a hexagon Gamma pairing exactly when
          Gamma2&rsquo;s side-by-side <span className="mono">6</span> and{' '}
          <span className="mono">-6</span> crossings are joined. Those two crossings stand in for the
          hexagons&rsquo; Delta&ndash;Sigma edge.
        </p>
        <ul>
          <li>
            <b>Hexagons only:</b> Gamma pairings that need two or more strands through the class-7
            seam.
          </li>
          <li>
            <b>Iso only:</b> a strand that comes into Gamma2 from the Delta side and leaves by another
            seam, a route the hexagons don&rsquo;t have.
          </li>
        </ul>
        <h3>Sigma&rsquo;s class-4 seam: whole or split</h3>
        <p>
          Tile(1,1) gives Sigma one four-edge class-4 seam (and Gamma2 the matching{' '}
          <span className="mono">-4</span>). Iso splits it into a <span className="mono">6</span> half and
          a <span className="mono">4</span> half, which is why Tile(1,1)&rsquo;s{' '}
          <span className="mono">0136</span> is iso&rsquo;s <span className="mono">01346</span>. Every
          Tile(1,1) combination becomes an iso combination by joining the two new crossings to each
          other, in Sigma and in Gamma2. That adds a closed loop of two segments at every
          Sigma&ndash;Gamma2 contact and changes nothing else. That joining leaves Gamma2&rsquo;s{' '}
          <span className="mono">6</span> and <span className="mono">-6</span> apart, so for rules with
          class 6 the Tile(1,1) patterns and the hexagon patterns never coincide. They are related
          only through iso.
        </p>
        <p className="muted">
          The Mystic comparison is exact: every pair of Gamma1 and Gamma2 pairings is composed. The
          Tile(1,1) embedding was checked on a sample of every rule with class 6, and strand lengths
          matched exactly apart from the two-segment loops. Scripts:{' '}
          <span className="mono">web/circuit-classes/mystic-map.ts</span> and{' '}
          <span className="mono">iso-embed.ts</span>.
        </p>
      </section>

      <section aria-labelledby="rules-one-h">
        <h2 id="rules-one-h">Towards one rule space</h2>
        <p>
          Iso labels contain both of the others. Take them as the one set of rules, and let a seam
          carry more than one crossing, starting with the class-7 seam inside the Mystic. Each family
          is then a view of the same space:
        </p>
        <ul>
          <li>
            <b>Hexagons:</b> Gamma2&rsquo;s <span className="mono">6</span>|<span className="mono">-6</span>{' '}
            joined, and any number of strands through the class-7 seam.
          </li>
          <li>
            <b>Tile(1,1):</b> the Sigma and Gamma2 two-segment loops, collapsed away when drawn.
          </li>
          <li>
            <b>Iso as it is now:</b> at most one strand through the class-7 seam.
          </li>
        </ul>
        <p>
          Which rules are valid depends only on how many crossings each tile has, mod 2, so the
          parity algebra stays the same.
        </p>
      </section>
    </article>
  );
}

function CountCell(props: {
  family: string;
  rule: string;
  iso: string;
  n: number;
  href: (family: string, rule: string) => string;
}): JSX.Element {
  if (!props.rule) return <td className="is-none">—</td>;
  // The hexagon and iso full rules were not swept (they mostly repeat Tile(1,1)).
  const swept = props.family === 'spectre' || props.iso !== '012345678';
  return (
    <td>
      {swept ? (
        <a href={props.href(props.family, props.rule)}>{fmt(props.n)}</a>
      ) : (
        <span title="Not on the Classifications page">{fmt(props.n)}</span>
      )}
      {props.rule !== props.iso && <span className="rules-alias mono">{props.rule}</span>}
    </td>
  );
}

function relationship(r: RuleCorrespondence): string {
  if (r.identical) return 'Identical in all three, combination for combination.';
  const parts = [`${fmt(r.hexAndIso)} shared by hexagons and iso`];
  if (r.hexOnly) parts.push(`${fmt(r.hexOnly)} hexagon-only`);
  parts.push(`Tile(1,1) sits inside iso (${fmt(r.tileImage)})`);
  return `${parts.join('; ')}.`;
}
