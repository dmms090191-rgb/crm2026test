import type { SectionConfig } from './templateSectionsConfig';
import type { OverlayElement } from './overlayElementTypes';

export interface SiteSectionRow {
  id: string;
  home_page_id: string;
  section_key: string;
  position: number;
  is_visible: boolean;
  draft_content: Record<string, string>;
  published_content: Record<string, string> | null;
  draft_styles: Record<string, string>;
  published_styles: Record<string, string> | null;
  animation_preset: string;
  animation_config: Record<string, unknown>;
  published_at: string | null;
  updated_at: string | null;
}

export interface StudioSection extends SectionConfig {
  draftContent: Record<string, string>;
  draftStyles: Record<string, string>;
  dbId: string | null;
}

export type GradientDirection = 'top' | 'bottom' | 'left' | 'right' | 'diagonal-left' | 'diagonal-right';

export interface GradientConfig {
  color1: string;
  color2: string;
  direction: GradientDirection;
  strength: number;
  balance: number;
  showGuideLine: boolean;
  showBalanceLine: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const DIRECTION_POSITIONS: Record<GradientDirection, { startX: number; startY: number; endX: number; endY: number }> = {
  top: { startX: 50, startY: 90, endX: 50, endY: 10 },
  bottom: { startX: 50, startY: 10, endX: 50, endY: 90 },
  left: { startX: 90, startY: 50, endX: 10, endY: 50 },
  right: { startX: 10, startY: 50, endX: 90, endY: 50 },
  'diagonal-left': { startX: 85, startY: 15, endX: 15, endY: 85 },
  'diagonal-right': { startX: 15, startY: 15, endX: 85, endY: 85 },
};

export const DEFAULT_GRADIENT: GradientConfig = {
  color1: '#0ea5e9',
  color2: '#020617',
  direction: 'bottom',
  strength: 50,
  balance: 50,
  showGuideLine: false,
  showBalanceLine: false,
  ...DIRECTION_POSITIONS.bottom,
};

export interface CanvasBg {
  desktop: string | null;
  mobile: string | null;
}

export interface CanvasGradient {
  desktop: GradientConfig | null;
  mobile: GradientConfig | null;
}

export const DESKTOP_WIDTH = 1440;
export const DEFAULT_PAGE_HEIGHT = 900;
export const PAGE_HEIGHT_MIN = 600;
export const PAGE_HEIGHT_MAX = 6000;
export const MOBILE_WIDTH = 390;
export const DEFAULT_MOBILE_HEIGHT = 844;

export interface CanvasPageHeight {
  desktop: number | null;
  mobile: number | null;
}

export interface LocalEdits {
  content: Record<string, Record<string, string>>;
  styles: Record<string, Record<string, string>>;
  order: string[] | null;
  visibility: Record<string, boolean>;
  canvasBg: Partial<CanvasBg> | null;
  canvasGradient: Partial<CanvasGradient> | null;
  canvasPageHeight: Partial<CanvasPageHeight> | null;
  canvasBgMode: Partial<CanvasBgMode> | null;
  overlayElements: OverlayElement[] | null;
}

export const EMPTY_EDITS: LocalEdits = { content: {}, styles: {}, order: null, visibility: {}, canvasBg: null, canvasGradient: null, canvasPageHeight: null, canvasBgMode: null, overlayElements: null };

export const DEFAULT_CANVAS_BG = '#ffffff';

export type BgMode = 'default' | 'solid' | 'gradient';

export interface CanvasBgMode {
  desktop: BgMode;
  mobile: BgMode;
}

export interface UseStudioSectionsReturn {
  sections: StudioSection[];
  sectionOrder: string[];
  visibleSections: Set<string>;
  hasUnsavedChanges: boolean;
  isPublished: boolean;
  loading: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  lastSavedAt: string | null;
  lastPublishedAt: string | null;
  canvasBgDesktop: string;
  canvasBgMobile: string;
  setCanvasBgDesktop: (color: string) => void;
  setCanvasBgMobile: (color: string) => void;
  resetCanvasBg: (mode: 'desktop' | 'mobile') => void;
  gradientDesktop: GradientConfig | null;
  gradientMobile: GradientConfig | null;
  setGradientDesktop: (gradient: GradientConfig | null) => void;
  setGradientMobile: (gradient: GradientConfig | null) => void;
  resetGradient: (mode: 'desktop' | 'mobile') => void;
  bgModeDesktop: BgMode;
  bgModeMobile: BgMode;
  setBgModeDesktop: (mode: BgMode) => void;
  setBgModeMobile: (mode: BgMode) => void;
  pageHeightDesktop: number;
  pageHeightMobile: number;
  setPageHeightDesktop: (h: number) => void;
  setPageHeightMobile: (h: number) => void;
  updateField: (sectionKey: string, fieldKey: string, value: string) => void;
  updateStyle: (sectionKey: string, styleKey: string, value: string) => void;
  reorder: (newOrder: string[]) => void;
  toggleVisibility: (sectionKey: string) => void;
  resetField: (sectionKey: string, fieldKey: string) => void;
  resetSection: (sectionKey: string) => void;
  overlayElements: OverlayElement[];
  setOverlayElements: (elements: OverlayElement[]) => void;
  updateOverlayElement: (id: string, partial: Partial<OverlayElement>) => void;
  removeOverlayElement: (id: string) => void;
  addOverlayElement: (element: OverlayElement) => void;
  saveDraft: () => Promise<boolean>;
  publish: () => Promise<boolean>;
  getEffectiveContent: (sectionKey: string) => Record<string, string>;
  getEffectiveStyles: (sectionKey: string) => Record<string, string>;
}
