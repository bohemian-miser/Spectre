/**
 * Two circuits' readings lined up level by level: the first one's level
 * k + offset above the other's level k, each level marked the same or
 * differing, and where they differ the tokens the other reading does not
 * share outlined, after the best rotation and direction. Tokens are chips
 * in their tile's colour. Used by the Harmonics and Compare pages.
 */

import { tileColor } from '../../lib/palette';
import type { CircuitInfo, Comparison } from '../harmonics/harmonicsJob';
import { tokenType } from '../harmonics/readings';

const nf = (n: number) => n.toLocaleString('en-US');
/** Tokens shown of a reading before it is cut short. */
const SHOWN = 80;

/** A token as a chip in its type's colour (grey where the token leaves the type out). */
export function Chip(props: { tok: string; differs: boolean }): JSX.Element {
  const type = tokenType(props.tok);
  const colour = type ? tileColor(type, 'bright') : '#8a8a8a';
  return (
    <span className={props.differs ? 'harm-token harm-chip harm-token-differs' : 'harm-token harm-chip'} style={{ ['--chip' as string]: colour }} title={type ?? 'type not compared at this level'}>
      {props.tok}
    </span>
  );
}

/** A reading's tokens as chips, cut short when long; `matched` marks the ones the other reading shares. */
export function Tokens(props: { tokens: readonly string[]; matched?: readonly boolean[] }): JSX.Element {
  const { tokens, matched } = props;
  const shown = tokens.slice(0, SHOWN);
  return (
    <code className="harm-tokens">
      {shown.map((t, i) => (
        <Chip key={i} tok={t} differs={matched ? !matched[i] : false} />
      ))}
      {tokens.length > SHOWN ? (
        <span className="harm-token harm-more">
          … {nf(tokens.length - SHOWN)} more{matched ? `, ${nf(matched.slice(SHOWN).filter((m) => !m).length)} of them unshared` : ''}
        </span>
      ) : null}
    </code>
  );
}

/**
 * The readings of `b`, every level, and under each the reading of `a` it is
 * lined up with (`a`'s level k under `b`'s level k + offset), with the rows
 * of a comparison when one has been made.
 */
export function ReadingsTable(props: {
  b: CircuitInfo;
  a: CircuitInfo | null;
  rows: Comparison['rows'] | null;
  /** What to call `a` in its rows, after the level: 'of the fundamental', 'of the other', 'of A'. */
  nameA?: string;
  testId?: string;
}): JSX.Element {
  const { a, b, rows } = props;
  const offset = a ? b.level - a.level : 0;
  return (
    <table className="harm-readings" data-testid={props.testId ?? 'harm-readings'}>
      <thead>
        <tr>
          <th>Level</th>
          <th>Visits</th>
          <th>Reading, backtracks cancelled</th>
        </tr>
      </thead>
      <tbody>
        {[...b.readings].reverse().map((r) => {
          const k = r.level - offset;
          const ra = a && k >= 0 ? a.readings.find((x) => x.level === k) ?? null : null;
          const row = rows?.find((x) => x.level === k) ?? null;
          const al = row?.state === 'differs' ? row.alignment ?? null : null;
          const word = !ra ? null : !row ? 'comparing…' : row.state === 'same' ? 'the same' : row.state === 'differs' ? 'differs' : row.state === 'long' ? 'too long to line up' : 'not read';
          return [
            <tr key={`b${r.level}`} className="harm-row-b">
              <td>{r.level}</td>
              <td>
                {nf(r.raw)} → {nf(r.tokens.length)}
              </td>
              <td>
                <Tokens tokens={al ? al.tokensB : r.tokens} matched={al?.matchedB} />
                {al && (al.rotation || al.back) ? <span className="harm-more"> read {al.back ? 'backwards ' : ''}from its token {al.rotation + 1}</span> : null}
              </td>
            </tr>,
            ra ? (
              <tr key={`a${k}`} className="harm-row-a">
                <td>
                  {k} {props.nameA ?? 'of the other'}
                </td>
                <td>
                  {nf(ra.raw)} → {nf(ra.tokens.length)}
                </td>
                <td>
                  <Tokens tokens={ra.tokens} matched={al?.matchedA} />
                  <span className={word === 'the same' ? 'harm-same' : word === 'differs' ? 'harm-differs' : 'harm-more'}>{word}</span>
                </td>
              </tr>
            ) : null,
          ];
        })}
      </tbody>
    </table>
  );
}
