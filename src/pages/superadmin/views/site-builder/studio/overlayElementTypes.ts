export type OverlayElementType = 'button' | 'text' | 'image';
export type ElementAlign = 'left' | 'center' | 'right';

export interface OverlayButtonConfig {
  type: 'button';
  id: string;
  text: string;
  bgColor: string;
  textColor: string;
  borderRadius: number;
  align: ElementAlign;
  topPercent: number;
  leftPercent: number;
}

export interface OverlayTextConfig {
  type: 'text';
  id: string;
  text: string;
  textColor: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  align: ElementAlign;
  topPercent: number;
  leftPercent: number;
}

export interface OverlayImageConfig {
  type: 'image';
  id: string;
  src: string;
  alt: string;
  align: ElementAlign;
  topPercent: number;
  leftPercent: number;
}

export type OverlayElement = OverlayButtonConfig | OverlayTextConfig | OverlayImageConfig;

let counter = 0;
function uid(): string {
  return `el_${Date.now()}_${++counter}`;
}

export function createDefaultButton(): OverlayButtonConfig {
  return {
    type: 'button',
    id: uid(),
    text: 'Connexion',
    bgColor: '#0ea5e9',
    textColor: '#ffffff',
    borderRadius: 12,
    align: 'center',
    topPercent: 50,
    leftPercent: 50,
  };
}

export function createDefaultText(): OverlayTextConfig {
  return {
    type: 'text',
    id: uid(),
    text: 'Titre de votre site',
    textColor: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    fontFamily: '',
    align: 'center',
    topPercent: 30,
    leftPercent: 50,
  };
}

export function normalizeOverlayElements(raw: unknown): OverlayElement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (el): el is OverlayElement =>
        el && typeof el === 'object' && ('type' in el) && ('id' in el) &&
        (el.type === 'button' || el.type === 'text' || el.type === 'image'),
    )
    .map(el => ({
      ...el,
      leftPercent: typeof el.leftPercent === 'number' ? el.leftPercent : 50,
      ...(el.type === 'text' && typeof (el as Record<string, unknown>).fontFamily !== 'string' ? { fontFamily: '' } : {}),
    }));
}
