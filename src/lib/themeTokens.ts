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
import { highLevelLightTokens } from './themeTokensHighLevelLight';
import { highLevelDarkTokens } from './themeTokensHighLevelDark';
import { highLevelEmeraldTokens } from './themeTokensHighLevelEmerald';
import { buildGlassTokens } from './themeTokensGlass';

export type { ThemeTokens } from './themeTokensTypes';

const tokenMap: Record<Exclude<Theme, 'glass'>, typeof darkTokens> = {
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
  highlevel_light: highLevelLightTokens,
  highlevel_dark: highLevelDarkTokens,
  highlevel_emerald: highLevelEmeraldTokens,
};

export function getThemeTokens(theme: Theme, accentColor?: string, glassOverlayMode?: 'dark' | 'light') {
  if (theme === 'glass') return buildGlassTokens(accentColor || '#f97316', glassOverlayMode || 'dark');
  return tokenMap[theme];
}
