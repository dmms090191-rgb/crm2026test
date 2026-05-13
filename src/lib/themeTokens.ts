import type { Theme } from '../contexts/ThemeContext';
import { darkTokens } from './themeTokensDark';
import { lightTokens } from './themeTokensLight';
import { graphiteTokens } from './themeTokensGraphite';
import { beigeTokens } from './themeTokensBeige';

export type { ThemeTokens } from './themeTokensTypes';

const tokenMap: Record<Theme, typeof darkTokens> = {
  dark: darkTokens,
  light: lightTokens,
  graphite: graphiteTokens,
  beige: beigeTokens,
};

export function getThemeTokens(theme: Theme) {
  return tokenMap[theme];
}
