export type CleanMethod = 'none' | 'rapide' | 'manuel' | 'couleur-isolation';

export interface ColorIsolationState {
  pickedColor: [number, number, number] | null;
  tolerance: number;
  selectionMask: number[] | null;
  inverted: boolean;
}

export type MaskTool = 'rectangle' | 'ellipse' | 'line' | 'lasso' | 'arc' | 'bezier' | 'polygon' | 'eraser';
export type MaskMode = 'garder' | 'supprimer';
export type FillMode = 'stroke' | 'fill';

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
  fillMode: FillMode;
  rotation: number;
  locked: boolean;
  points?: { x: number; y: number }[];
  arcStart?: number;
  arcEnd?: number;
  cornerRadius?: number;
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

export type LogoColorMode = 'none' | 'solid' | 'gradient';

export interface LogoColorConfig {
  mode: LogoColorMode;
  solidColor: string;
  gradientColor1: string;
  gradientColor2: string;
  gradientDirection: GradientDirection;
}

export const DEFAULT_LOGO_COLOR: LogoColorConfig = {
  mode: 'none',
  solidColor: '#000000',
  gradientColor1: '#000000',
  gradientColor2: '#3b82f6',
  gradientDirection: 'bottom',
};

export const TOOL_LABELS: Record<MaskTool, string> = {
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Ligne',
  lasso: 'Lasso',
  arc: 'Arc',
  bezier: 'Courbe',
  polygon: 'Polygone',
  eraser: 'Gomme',
};

export function createDefaultShape(tool: MaskTool, mode: MaskMode, opts: Partial<MaskShape> = {}): MaskShape {
  return {
    id: '', tool, mode,
    x: 0, y: 0, w: 0, h: 0,
    opacity: 60, size: 20,
    fillMode: 'stroke',
    rotation: 0,
    locked: false,
    ...opts,
  };
}
