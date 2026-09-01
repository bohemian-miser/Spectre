/**
 * Public barrel for the widget layer (DESIGN.md §6). Pages compose from here.
 *
 * Layering: components import from `core/` and `lib/` only — never from the old
 * p5 app files (`sketch.ts`, `tiles.ts`, `analysis.ts`, `state.ts`, `config.ts`).
 */

export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';

export { TileView, default as TileViewDefault } from './TileView';
export type {
  TileViewProps,
  EdgeRef,
  OverlayChord,
  TileInteraction,
} from './TileView';

export { TilePalette } from './TilePalette';
export type { TilePaletteProps } from './TilePalette';

export { SeamView } from './SeamView';
export type { SeamViewProps } from './SeamView';

export { TilingView } from './TilingView';
export type { TilingViewProps } from './TilingView';

export { TilingCanvas } from './TilingCanvas';
export type { TilingCanvasProps } from './TilingCanvas';

export { PanZoom } from './PanZoom';
export type { PanZoomProps, PanZoomApi } from './PanZoom';

export { CircuitLayer } from './CircuitLayer';
export type { CircuitLayerProps } from './CircuitLayer';

export { EdgeClassLegend } from './controls/EdgeClassLegend';
export type { EdgeClassLegendProps } from './controls/EdgeClassLegend';

export { EdgeSubsetPicker } from './controls/EdgeSubsetPicker';
export type { EdgeSubsetPickerProps } from './controls/EdgeSubsetPicker';

export { MatchingSlider, MatchingEditor } from './controls/MatchingSlider';
export type { MatchingSliderProps } from './controls/MatchingSlider';

export { InfoTip } from './controls/InfoTip';
export type { InfoTipProps } from './controls/InfoTip';

export { DisplayToggles } from './controls/DisplayToggles';
export type { DisplayTogglesProps } from './controls/DisplayToggles';

export { ColorSchemePicker } from './controls/ColorSchemePicker';
export type { ColorSchemePickerProps } from './controls/ColorSchemePicker';

export { StatsSummary } from './controls/StatsSummary';
export type { StatsSummaryProps } from './controls/StatsSummary';

export { SharePanel } from './controls/SharePanel';
export type { SharePanelProps } from './controls/SharePanel';

export { ContractSlider, contractToU, uToContract } from './controls/ContractSlider';
export type { ContractSliderProps } from './controls/ContractSlider';

export { StrandRuleControls } from './controls/StrandRuleControls';
export type { StrandRuleControlsProps } from './controls/StrandRuleControls';
export { SeamContractControls } from './controls/SeamContractControls';
export type { SeamContractControlsProps } from './controls/SeamContractControls';
