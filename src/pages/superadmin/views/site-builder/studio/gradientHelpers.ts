import type { GradientConfig } from './studioSectionTypes';

function angleFromPoints(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX;
  const dy = endY - startY;
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI;
  return (deg + 90 + 360) % 360;
}

function computeStops(config: GradientConfig): { start: number; end: number } {
  const bal = Math.max(0, Math.min(100, config.balance ?? 50));
  const str = Math.max(0, Math.min(100, config.strength ?? 50));
  const maxSpread = 50;
  const spread = maxSpread * (1 - str / 100);
  return {
    start: Math.max(0, Math.round(bal - spread)),
    end: Math.min(100, Math.round(bal + spread)),
  };
}

export function gradientToCss(config: GradientConfig): string {
  const angle = angleFromPoints(config.startX, config.startY, config.endX, config.endY);
  const { start, end } = computeStops(config);
  return `linear-gradient(${Math.round(angle)}deg, ${config.color1} ${start}%, ${config.color2} ${end}%)`;
}

export function getCanvasBackground(solidColor: string, gradient: GradientConfig | null): string {
  if (gradient) {
    return gradientToCss(gradient);
  }
  return solidColor;
}
