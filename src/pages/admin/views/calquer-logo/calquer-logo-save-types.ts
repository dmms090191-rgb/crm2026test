import type { CleanMethod, BgConfig, MaskShape, MaskFolder, LogoColorConfig } from './calquer-logo-types';

export interface SavedSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SessionEditorState {
  cleanMethod: CleanMethod;
  bgConfig: BgConfig;
  zoom: number;
  panX: number;
  panY: number;
  hasOverlay: boolean;
  overlayOpacity: number;
  inverted: boolean;
  splitView: boolean;
  showTransformed: boolean;
  maskShapes: MaskShape[];
  maskFolders: MaskFolder[];
  iaStep: string;
  improvedSvgContent?: string | null;
  previewBgColor?: string | null;
  logoColorConfig?: LogoColorConfig | null;
}

export interface SessionFullData {
  id: string;
  title: string;
  original_image_data: string | null;
  transformed_image_data: string | null;
  svg_content: string | null;
  current_svg_content: string | null;
  editor_state: SessionEditorState;
}
