import { useTheme } from '../contexts/ThemeContext';
import { getThemeTokens } from '../lib/themeTokens';
import type { ThemeTokens } from '../lib/themeTokensTypes';

export function useThemeTokens(): ThemeTokens {
  const { theme, glassConfig } = useTheme();
  return getThemeTokens(
    theme,
    theme === 'glass' ? glassConfig.accentColor : undefined,
    theme === 'glass' ? glassConfig.overlayMode : undefined,
  );
}
