import type { Theme } from '../contexts/ThemeContext';
import { darkTokens } from './themeTokensDark';
import { lightTokens } from './themeTokensLight';
import { graphiteTokens } from './themeTokensGraphite';
import { beigeTokens } from './themeTokensBeige';
import { roseTokens } from './themeTokensRose';
import { emeraldTokens } from './themeTokensEmerald';
import { whiteLuxuryTokens } from './themeTokensWhiteLuxury';
import { pinkTokens } from './themeTokensPink';
import { redTokens } from './themeTokensRed';
import { orangeTokens } from './themeTokensOrange';
import { yellowTokens } from './themeTokensYellow';

export type { ThemeTokens } from './themeTokensTypes';

const tokenMap: Record<Theme, typeof darkTokens> = {
  dark: darkTokens,
  light: lightTokens,
  graphite: graphiteTokens,
  beige: beigeTokens,
  rose: roseTokens,
  emerald: emeraldTokens,
  luxury: whiteLuxuryTokens,
  pink: pinkTokens,
  red: redTokens,
  orange: orangeTokens,
  yellow: yellowTokens,
};

export function getThemeTokens(theme: Theme) {
  return tokenMap[theme];
}
