import type { Theme } from '../contexts/ThemeContext';
import { darkTokens } from './themeTokensDark';
import { lightTokens } from './themeTokensLight';

export type { ThemeTokens } from './themeTokensTypes';

export function getThemeTokens(theme: Theme) {
  return theme === 'dark' ? darkTokens : lightTokens;
}
