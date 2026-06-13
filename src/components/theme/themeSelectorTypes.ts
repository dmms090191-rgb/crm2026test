export interface ThemeConfigLite {
  theme_key: string;
  label: string;
  status: string;
  is_recommended: boolean;
  is_favorite: boolean;
  display_order: number;
  category: string;
  owner_user_id: string | null;
  owner_company_id: string | null;
  is_shared: boolean;
}

export interface CustomThemeRow {
  theme_key: string;
  label: string;
  status: string;
  category: string;
  display_order: number;
  created_from_theme: string | null;
  owner_user_id: string | null;
  owner_company_id: string | null;
  is_shared: boolean;
  theme_tokens: {
    zone_overrides?: Record<string, unknown>;
    zone_css?: Record<string, string | null>;
    text_overrides?: Record<string, string>;
    background_image?: string | null;
    background_image_zoom?: number | null;
    background_image_position_x?: number | null;
    background_image_position_y?: number | null;
    background_image_fit?: string | null;
    typography_overrides?: Record<string, string | null> | null;
    panel_palette?: { background: string; surface: string; accent: string } | null;
    button_overrides?: Record<string, unknown> | null;
    card_overrides?: Record<string, unknown> | null;
    vc_overrides?: Record<string, unknown> | null;
  } | null;
}

export interface CategoryLite {
  slug: string;
  name: string;
  sort_order: number;
}

export const CUSTOM_CATEGORY = 'themes-personnalises';
export const FAV_TAB = 'favoris';
export const PERSONAL_TAB = 'personnels';
export const COMMUNITY_TAB = 'communaute';
