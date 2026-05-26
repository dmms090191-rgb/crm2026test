import type { ThemeTokens } from './themeTokensTypes';
import { buildDarkGlassTokens } from './themeTokensGlassDark';
import { buildLightGlassTokens } from './themeTokensGlassLight';

export function buildGlassTokens(accent: string, overlayMode: 'dark' | 'light' = 'dark'): ThemeTokens {
  if (overlayMode === 'light') return buildLightGlassTokens(accent);
  return buildDarkGlassTokens(accent);
}
