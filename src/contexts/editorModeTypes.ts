import type { MutableRefObject } from 'react';
import type { EditorPanelThemeId, CustomPanelPalette } from '../components/editor/editorPanelTheme';

export type EditorZone = 'zone1' | 'zone2' | 'zone3' | 'zone4';

export interface ZoneBackground {
  type: 'solid' | 'gradient';
  color?: string;
  opacity?: number;
  gradient?: {
    color1: string;
    color2: string;
    direction: number;
  };
}

export type EditorTab = 'fonds' | 'image' | 'texte';

export interface ButtonTargetDef {
  id: string;
  label: string;
}

export interface ButtonOverride {
  bg?: ZoneBackground | null;
  textColor?: string | null;
  opacityMode?: 'transparent' | 'opaque';
}

export type ButtonSubTarget = 'fond' | 'texte';

export type CardTarget = 'allCards' | 'enterprises' | 'healthProject';

export interface CardOverride {
  bg?: ZoneBackground | null;
}

export interface CardTargetDef {
  id: CardTarget;
  label: string;
}

export const CARD_TARGETS: CardTargetDef[] = [
  { id: 'allCards', label: 'Toutes les cartes' },
  { id: 'enterprises', label: 'Carte Entreprises' },
  { id: 'healthProject', label: 'Carte Sante du projet' },
];

export type TextTarget =
  | { kind: 'category'; categoryTitle: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'all-categories' }
  | { kind: 'all-items' };

export interface EditorModeContextValue {
  visualReady: boolean;
  markVisualReady: () => void;
  editorOpen: boolean;
  openEditor: () => void;
  closeEditor: () => void;

  editorTab: EditorTab;
  setEditorTab: (tab: EditorTab) => void;

  activeZone: EditorZone | null;
  setActiveZone: (zone: EditorZone | null) => void;
  zoneOverrides: Record<EditorZone, ZoneBackground | null>;
  applyZoneBackground: (zone: EditorZone, bg: ZoneBackground) => void;
  clearZoneBackground: (zone: EditorZone) => void;
  clearAllOverrides: () => void;
  getAllOverrides: () => Record<EditorZone, ZoneBackground | null>;
  getOverridesWithPreview: () => Record<EditorZone, ZoneBackground | null>;
  preview: { zone: EditorZone; bg: ZoneBackground } | null;
  setPreview: (zone: EditorZone, bg: ZoneBackground) => void;
  clearPreview: () => void;
  commitPreview: () => void;

  textTarget: TextTarget | null;
  setTextTarget: (target: TextTarget | null) => void;
  textOverrides: Record<string, string>;
  applyTextColor: (key: string, color: string) => void;
  clearTextColor: (key: string) => void;
  getAllTextOverrides: () => Record<string, string>;
  getTextOverridesWithPreview: () => Record<string, string>;
  textPreview: Record<string, string>;
  setTextPreview: (keys: string[], color: string) => void;
  clearTextPreview: () => void;
  commitTextPreview: () => void;

  unifiedDrag: boolean;
  toggleUnifiedDrag: () => void;
  dragBroadcast: MutableRefObject<((dx: number, dy: number, sourceId: string) => void)[]>;
  dragPanelRects: MutableRefObject<(() => DOMRect | null)[]>;

  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
  backgroundImageZoom: number;
  setBackgroundImageZoom: (zoom: number) => void;
  backgroundImagePositionX: number;
  backgroundImagePositionY: number;
  setBackgroundImagePosition: (x: number, y: number) => void;
  backgroundImageFit: BgImageFitMode;
  setBackgroundImageFit: (fit: BgImageFitMode) => void;

  editingThemeKey: string | null;
  loadCustomTheme: (themeKey: string, zones: Record<EditorZone, ZoneBackground | null>, texts: Record<string, string>, bgImage?: string | null, typo?: TypographyOverrides | null, palette?: CustomPanelPalette | null, btnOverrides?: Record<string, ButtonOverride> | null, bgImageZoom?: number | null, bgImagePosX?: number | null, bgImagePosY?: number | null, cardOvr?: Record<string, CardOverride> | null) => void;
  clearEditingTheme: () => void;

  panelTheme: EditorPanelThemeId;
  setPanelTheme: (id: EditorPanelThemeId) => void;

  customPanelPalette: CustomPanelPalette | null;
  panelPalettePreview: CustomPanelPalette | null;
  setPanelPalettePreview: (palette: CustomPanelPalette | null) => void;
  commitPanelPalette: () => void;
  resetPanelPalette: () => void;

  typographyOverrides: TypographyOverrides;
  typographyPreview: TypographyOverrides;
  setTypographyPreview: (overrides: TypographyOverrides) => void;
  commitTypography: () => void;
  clearTypographyPreview: () => void;
  resetTypography: (target: 'categories' | 'items' | 'rdr' | 'all') => void;

  typoTarget: 'categories' | 'items' | 'rdr' | null;
  setTypoTarget: (target: 'categories' | 'items' | 'rdr' | null) => void;

  activeButtonTarget: string | null;
  setActiveButtonTarget: (id: string | null) => void;
  buttonSubTarget: ButtonSubTarget;
  setButtonSubTarget: (sub: ButtonSubTarget) => void;
  buttonOverrides: Record<string, ButtonOverride>;
  buttonPreview: Record<string, ButtonOverride>;
  setButtonBgPreview: (id: string, bg: ZoneBackground, opacityMode?: 'transparent' | 'opaque') => void;
  setButtonTextPreview: (id: string, color: string) => void;
  clearButtonPreview: () => void;
  applyButtonBg: (id: string, bg: ZoneBackground, opacityMode?: 'transparent' | 'opaque') => void;
  applyButtonTextColor: (id: string, color: string) => void;
  getButtonOverridesWithPreview: () => Record<string, ButtonOverride>;

  highlightedButtonId: string | null;
  locateButton: (id: string) => void;
  registerLocateHandler: (handler: ((id: string) => void) | null) => void;

  buttonBgSyncSignal: { bg: ZoneBackground; seq: number } | null;
  syncButtonBgFromSaved: (bg: ZoneBackground) => void;

  activeCardTarget: CardTarget | null;
  setActiveCardTarget: (target: CardTarget | null) => void;
  cardOverrides: Record<string, CardOverride>;
  cardPreview: Record<string, CardOverride>;
  setCardBgPreview: (target: CardTarget, bg: ZoneBackground) => void;
  clearCardPreview: () => void;
  applyCardBg: (target: CardTarget, bg: ZoneBackground) => void;
  getCardOverridesWithPreview: () => Record<string, CardOverride>;
}

export interface TypographyOverrides {
  categoryFont?: string | null;
  itemFont?: string | null;
  rdrFont?: string | null;
}

export type BgImageFitMode = 'cover' | 'contain' | 'fill';

export const EMPTY_TYPOGRAPHY: TypographyOverrides = {};

export const EMPTY_OVERRIDES: Record<EditorZone, ZoneBackground | null> = {
  zone1: null,
  zone2: null,
  zone3: null,
  zone4: null,
};
