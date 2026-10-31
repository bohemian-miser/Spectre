/** The X-ray switch and its level slider, over the top of the Explorer's viewport. */

/** Highest supertile level the X-ray shows on the infinite plane (its outline is worked out whole, once). */
export const XRAY_INFINITE_MAX = 6;

export function XrayControl(props: {
  on: boolean;
  level: number;
  lowest: number;
  highest: number;
  busy: boolean;
  note: string | null;
  /** Sit below the infinite view's own tools. */
  belowTools?: boolean;
  onToggle(on: boolean): void;
  onLevel(level: number): void;
}): JSX.Element {
  const { on, level, lowest, highest, busy, note, belowTools, onToggle, onLevel } = props;
  return (
    <div className={belowTools ? 'xray-control is-below-tools' : 'xray-control'} data-testid="xray-control" data-panzoom-ignore="">
      <label title="Outline the supertiles of one level over the tiles; hover one for its type and slot path">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} data-testid="xray-toggle" />
        X-ray
      </label>
      {on ? (
        <>
          <input
            type="range"
            min={lowest}
            max={highest}
            step={1}
            value={level}
            disabled={lowest >= highest}
            onChange={(e) => onLevel(Number(e.target.value))}
            aria-label="Supertile level"
            data-testid="xray-level"
          />
          <span className="xray-level" data-testid="xray-level-label">
            level {level}
            {busy ? '…' : ''}
            {note ? ` · ${note}` : ''}
          </span>
        </>
      ) : null}
    </div>
  );
}
