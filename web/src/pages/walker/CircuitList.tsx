/**
 * The circuits a tree of choices closes on, smallest first, each with where
 * its branch leaves the smaller circuit it shares the most choices with, and
 * the supertile positions that decide that fork.
 */
import { HEX_TYPES } from '../../core';
import type { FirstClosing } from '../buildup/buildup';
import type { Circuit, Found } from './circuits';

const levelWord = (k: number | null): string => (k === null ? 'nothing below the top' : k === 1 ? 'parent' : k === 2 ? 'grandparent' : `level ${k}`);

export function CircuitList({ circuits, onGoto }: { circuits: readonly Circuit[]; onGoto: (node: number) => void }): JSX.Element {
  return (
    <table className="wk__circuits" data-testid="wk-circuits">
      <thead>
        <tr>
          <th>Tiles</th>
          <th>Branches</th>
          <th>Choices</th>
          <th>Leaves the circuit of</th>
          <th>At step</th>
          <th>Lands on, not</th>
          <th>Decided by</th>
        </tr>
      </thead>
      <tbody>
        {circuits.map((c) => {
          const b = c.branching;
          return (
            <tr key={c.key} onClick={() => onGoto(c.nodes[0])} title="Go to the branch with fewest choices">
              <td>{c.tiles}</td>
              <td>{c.nodes.length}</td>
              <td>{c.choices}</td>
              <td>{b ? `${b.fromTiles} tiles` : ''}</td>
              <td>{b?.step ?? ''}</td>
              <td>{b ? `${b.took}, not ${b.other}` : ''}</td>
              <td>{b ? `${levelWord(b.level)}: ${b.cells.join(', ')}` : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Where a circuit first closes, as a list row says it: the level and the child slots it runs through there. */
function closingText(c: FirstClosing | null | undefined, upTo: number): { text: string; title: string } {
  if (c === undefined) return { text: '…', title: 'Building the supertiles up to find where it closes' };
  if (c === null) return { text: `not by level ${upTo}`, title: `Not among the circuits closing in a supertile of level ${upTo} or below` };
  return {
    text: `level ${c.level} · ${c.family}`,
    title: `First closes inside a level-${c.level} supertile (${c.types.length === HEX_TYPES.length ? 'of every type' : c.types.join(', ')}), through its children in slots ${[...c.family].join(', ')}`,
  };
}

/** The circuits a search has found, in the order it found them, in a box that scrolls; each with where it first closes as the supertiles are built up. */
export function FoundList({ found, closings, onGoto, onHover, colour }: {
  found: readonly Found[];
  /** Where each circuit first closes (by key), looked for up to level `upTo`; a key not yet in `of` is still being looked for. */
  closings?: { readonly of: ReadonlyMap<string, FirstClosing | null>; readonly upTo: number };
  /** The colour a circuit has elsewhere (the search map), by its place in the list. */
  colour?: (i: number) => string;
  onGoto: (node: number) => void;
  onHover?: (f: Found | null) => void;
}): JSX.Element {
  return (
    <ol className="wk__found" data-testid="wk-found" data-count={found.length}>
      {found.map((f, i) => {
        const closing = closings ? closingText(closings.of.get(f.key), closings.upTo) : null;
        return (
        <li
          key={f.key}
          onClick={() => onGoto(f.node)}
          onMouseEnter={onHover && (() => onHover(f))}
          onMouseLeave={onHover && (() => onHover(null))}
        >
          <span className="wk__found-n">{colour && <span className="wk__found-swatch" style={{ background: colour(i) }} />}{i + 1}</span>
          <span>{f.tiles} tiles</span>
          <span>{f.choices} {f.choices === 1 ? 'choice' : 'choices'}</span>
          <span>{f.branches > 1 ? `${f.branches} branches` : ''}</span>
          <span className="wk__found-level" title={closing?.title} data-testid="wk-found-level">{closing?.text ?? ''}</span>
          <code className="wk__found-word">{f.key}</code>
        </li>
        );
      })}
    </ol>
  );
}

export default CircuitList;
