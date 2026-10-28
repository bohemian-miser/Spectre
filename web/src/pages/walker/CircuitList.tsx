/**
 * The circuits a tree of choices closes on, smallest first, each with where
 * its branch leaves the smaller circuit it shares the most choices with, and
 * the supertile positions that decide that fork.
 */
import type { Circuit } from './circuits';

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

export default CircuitList;
