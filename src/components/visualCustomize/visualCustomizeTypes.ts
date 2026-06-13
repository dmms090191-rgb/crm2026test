export type VCElementType = 'card' | 'button' | 'text';

export interface VCCardConfig {
  mode: 'glass' | 'solid';
  color: string;
  gradientTo?: string;
  useGradient?: boolean;
  opacity: number;
  blur: number;
  borderColor: string;
  borderWidth: number;
  shadow: number;
  radius: number;
  textColor?: string;
}

export type VCGradientDirection = 'top' | 'bottom' | 'left' | 'right';

export interface VCButtonConfig {
  bg: string;
  bgHover: string;
  bgActive: string;
  text: string;
  borderColor: string;
  borderWidth: number;
  shadow: number;
  radius: number;
  useGradient?: boolean;
  gradientTo?: string;
  gradientDirection?: VCGradientDirection;
}

export interface VCTextConfig {
  color: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  shadow: number;
  letterSpacing: number;
  opacity?: number;
  background?: string;
  useBackground?: boolean;
}

export type VCConfig = VCCardConfig | VCButtonConfig | VCTextConfig;

export interface VCElement {
  id: string;
  type: VCElementType;
  label: string;
  config: VCConfig | null;
}

export const DEFAULT_CARD: VCCardConfig = {
  mode: 'glass',
  color: '#1e293b',
  gradientTo: '#0f172a',
  useGradient: false,
  opacity: 0.5,
  blur: 8,
  borderColor: '#ffffff20',
  borderWidth: 1,
  shadow: 8,
  radius: 16,
};

export const DEFAULT_BUTTON: VCButtonConfig = {
  bg: '#2563eb',
  bgHover: '#1d4ed8',
  bgActive: '#1e40af',
  text: '#ffffff',
  borderColor: '#ffffff20',
  borderWidth: 1,
  shadow: 4,
  radius: 12,
  useGradient: false,
  gradientTo: '#1d4ed8',
};

export const DEFAULT_TEXT: VCTextConfig = {
  color: '#f1f5f9',
  fontSize: 18,
  fontWeight: 700,
  fontFamily: 'system-ui',
  shadow: 0,
  letterSpacing: 0,
  opacity: 1,
  background: '#22c55e20',
  useBackground: false,
};

export function defaultFor(type: VCElementType): VCConfig {
  if (type === 'card') return { ...DEFAULT_CARD };
  if (type === 'button') return { ...DEFAULT_BUTTON };
  return { ...DEFAULT_TEXT };
}
