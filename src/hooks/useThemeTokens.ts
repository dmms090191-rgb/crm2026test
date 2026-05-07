import { useTheme } from '../contexts/ThemeContext';
import { getThemeTokens } from '../lib/themeTokens';
import type { ThemeTokens } from '../lib/themeTokensTypes';

export function useThemeTokens(): ThemeTokens {
  const { theme } = useTheme();
  return getThemeTokens(theme);
}
