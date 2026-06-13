import type { CSSProperties } from 'react';
import type { VCButtonConfig, VCCardConfig, VCConfig, VCElementType, VCTextConfig } from './visualCustomizeTypes';
import { DEFAULT_TEXT } from './visualCustomizeTypes';

function hexWithAlpha(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  if (m.length === 6) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
    return `#${m}${a}`;
  }
  return hex;
}

export function cardStyle(cfg: VCCardConfig): CSSProperties {
  const isGlass = cfg.mode === 'glass';
  const bg = cfg.useGradient && cfg.gradientTo
    ? `linear-gradient(135deg, ${isGlass ? hexWithAlpha(cfg.color, cfg.opacity) : cfg.color}, ${isGlass ? hexWithAlpha(cfg.gradientTo, cfg.opacity) : cfg.gradientTo})`
    : isGlass ? hexWithAlpha(cfg.color, cfg.opacity) : cfg.color;
  return {
    background: bg,
    backgroundColor: bg,
    backgroundImage: cfg.useGradient && cfg.gradientTo ? bg : undefined,
    border: `${cfg.borderWidth}px solid ${cfg.borderColor}`,
    borderRadius: cfg.radius,
    boxShadow: cfg.shadow > 0 ? `0 ${cfg.shadow}px ${cfg.shadow * 2}px rgba(0,0,0,0.25)` : 'none',
    backdropFilter: isGlass ? `blur(${cfg.blur}px) saturate(1.2)` : 'none',
    WebkitBackdropFilter: isGlass ? `blur(${cfg.blur}px) saturate(1.2)` : 'none',
    opacity: 1,
    color: cfg.textColor || undefined,
  };
}

const GRADIENT_ANGLES: Record<string, string> = {
  top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right',
};

export function buttonStyle(cfg: VCButtonConfig): CSSProperties {
  const dir = GRADIENT_ANGLES[cfg.gradientDirection ?? ''] ?? '135deg';
  const bg = cfg.useGradient && cfg.gradientTo
    ? `linear-gradient(${dir}, ${cfg.bg}, ${cfg.gradientTo})`
    : cfg.bg;
  return {
    background: bg,
    color: cfg.text,
    border: `${cfg.borderWidth}px solid ${cfg.borderColor}`,
    borderRadius: cfg.radius,
    boxShadow: cfg.shadow > 0 ? `0 ${cfg.shadow}px ${cfg.shadow * 2}px rgba(0,0,0,0.25)` : 'none',
  };
}

export function textStyle(cfg: VCTextConfig): CSSProperties {
  const s: CSSProperties = { color: cfg.color };
  if (cfg.fontSize !== DEFAULT_TEXT.fontSize) s.fontSize = cfg.fontSize;
  if (cfg.fontWeight !== DEFAULT_TEXT.fontWeight) s.fontWeight = cfg.fontWeight;
  if (cfg.fontFamily && cfg.fontFamily !== DEFAULT_TEXT.fontFamily)
    s.fontFamily = `"${cfg.fontFamily}", system-ui, sans-serif`;
  if (cfg.shadow > 0) s.textShadow = `0 ${cfg.shadow}px ${cfg.shadow * 2}px rgba(0,0,0,0.4)`;
  if (cfg.letterSpacing) s.letterSpacing = `${cfg.letterSpacing}px`;
  if (cfg.opacity !== undefined && cfg.opacity < 1) s.opacity = cfg.opacity;
  if (cfg.useBackground && cfg.background) s.background = cfg.background;
  return s;
}

export function styleFor(type: VCElementType, cfg: VCConfig | null): CSSProperties | undefined {
  if (!cfg) return undefined;
  if ((cfg as VCCardConfig).mode === 'glass' || (cfg as VCCardConfig).mode === 'solid') {
    return cardStyle(cfg as VCCardConfig);
  }
  if (type === 'card') return cardStyle(cfg as VCCardConfig);
  if (type === 'button') return buttonStyle(cfg as VCButtonConfig);
  return textStyle(cfg as VCTextConfig);
}
