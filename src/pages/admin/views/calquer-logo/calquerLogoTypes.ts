export interface SvgShape {
  id: string;
  tag: string;
  label: string;
  visible: boolean;
  color: string;
  opacity: number;
  pathLength: number;
  area: number;
  element: string;
}

export interface DecomposeState {
  shapes: SvgShape[];
  selectedId: string | null;
  decomposed: boolean;
}

export interface DecomposeResult {
  shapes: SvgShape[];
  svgWidth: number;
  svgHeight: number;
  viewBox: string;
}

export interface ImproveStats {
  removedShapes: number;
  simplifiedPoints: number;
  totalBefore: number;
  totalAfter: number;
}
