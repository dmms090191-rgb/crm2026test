export type CleanMethod = 'none' | 'rapide' | 'manuel';

export type MaskTool = 'rectangle' | 'ellipse' | 'line';
export type MaskMode = 'garder' | 'supprimer';

export interface MaskShape {
  id: string;
  tool: MaskTool;
  mode: MaskMode;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  size: number;
  color?: string;
  name?: string;
  folderId?: string;
}

export interface MaskFolder {
  id: string;
  name: string;
  expanded: boolean;
}

export interface MaskState {
  tool: MaskTool;
  mode: MaskMode;
  opacity: number;
  size: number;
  strokeColor: string;
  shapes: MaskShape[];
  selectedId: string | null;
  folders: MaskFolder[];
}

export type BgMode = 'checker' | 'solid' | 'gradient';

export type GradientDirection = 'top' | 'bottom' | 'left' | 'right' | 'diag-left' | 'diag-right';

export interface BgConfig {
  mode: BgMode;
  solidColor: string;
  gradientColor1: string;
  gradientColor2: string;
  gradientDirection: GradientDirection;
}

export const DEFAULT_BG_CONFIG: BgConfig = {
  mode: 'checker',
  solidColor: '#0f172a',
  gradientColor1: '#0f172a',
  gradientColor2: '#1e40af',
  gradientDirection: 'bottom',
};

const DIRECTION_CSS: Record<GradientDirection, string> = {
  top: 'to top',
  bottom: 'to bottom',
  left: 'to left',
  right: 'to right',
  'diag-left': 'to top left',
  'diag-right': 'to top right',
};

export function bgConfigToCss(cfg: BgConfig): string {
  if (cfg.mode === 'checker') return 'checker';
  if (cfg.mode === 'solid') return cfg.solidColor;
  return `linear-gradient(${DIRECTION_CSS[cfg.gradientDirection]}, ${cfg.gradientColor1}, ${cfg.gradientColor2})`;
}
