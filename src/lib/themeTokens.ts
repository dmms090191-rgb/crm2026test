import type { Theme } from '../contexts/ThemeContext';
import { darkTokens } from './themeTokensDark';
import { lightTokens } from './themeTokensLight';
import { graphiteTokens } from './themeTokensGraphite';
import { beigeTokens } from './themeTokensBeige';
import { roseTokens } from './themeTokensRose';
import { emeraldTokens } from './themeTokensEmerald';
import { whiteLuxuryTokens } from './themeTokensWhiteLuxury';

export type { ThemeTokens } from './themeTokensTypes';

const tokenMap: Record<Theme, typeof darkTokens> = {
  dark: darkTokens,
  light: lightTokens,
  graphite: graphiteTokens,
  beige: beigeTokens,
  rose: roseTokens,
  emerald: emeraldTokens,
  luxury: whiteLuxuryTokens,
};

export function getThemeTokens(theme: Theme) {
  return tokenMap[theme];
}
