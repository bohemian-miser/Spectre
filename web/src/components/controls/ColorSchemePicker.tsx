/**
 * `ColorSchemePicker` — the four ported palettes plus Custom with per-tile
 * colour wells (DESIGN.md §6.4). Custom values feed the `cc` URL param.
 */

import {
  COLOR_SCHEME_IDS,
  leafOrder,
  type ColorSchemeId,
  type TileFamilyId,
} from '../../core';
import { tileColorHex } from '../../lib/palette';

const SCHEME_LABELS: Readonly<Record<ColorSchemeId, string>> = {
  bright: 'Bright',
  fig53: 'Figure 5.3',
  mystics: 'Mystics',
  pride: 'Pride',
  custom: 'Custom',
};

export interface ColorSchemePickerProps {
  readonly family: TileFamilyId;
  readonly colorScheme: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  onColorSchemeChange(scheme: ColorSchemeId): void;
  onCustomColorChange?(tileType: string, hex: string): void;
  readonly className?: string;
}

export function ColorSchemePicker(props: ColorSchemePickerProps): JSX.Element {
  const {
    family,
    colorScheme,
    customColors,
    onColorSchemeChange,
    onCustomColorChange,
    className,
  } = props;

  return (
    <div className={['color-scheme-picker', className ?? ''].filter(Boolean).join(' ')}>
      <label className="control-row">
        <span>Colours</span>
        <select
          value={colorScheme}
          onChange={(e) => onColorSchemeChange(e.target.value as ColorSchemeId)}
        >
          {COLOR_SCHEME_IDS.map((id) => (
            <option key={id} value={id}>
              {SCHEME_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      {colorScheme === 'custom' && onCustomColorChange ? (
        <div className="color-wells">
          {leafOrder(family).map((type) => (
            <label key={type} className="color-well">
              <input
                type="color"
                value={tileColorHex(type, 'custom', customColors)}
                onChange={(e) => onCustomColorChange(type, e.target.value)}
                aria-label={`${type} colour`}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ColorSchemePicker;
