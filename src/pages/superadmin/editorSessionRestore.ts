import { supabase } from '../../lib/supabase';
import { type ZoneBackground, type TypographyOverrides } from '../../contexts/EditorModeContext';
import { type EditorPanelThemeId, type CustomPanelPalette } from '../../components/editor/editorPanelTheme';
import {
  persistSolids,
  persistGradients,
  type SavedColor,
} from '../../components/editor/editorSavedStore';

type EditorCtx = ReturnType<typeof import('../../contexts/EditorModeContext').useEditorMode>;

export async function restoreEditorOverrides(
  editorCtx: EditorCtx,
  onSavedChanged: () => void,
  scopeKey: string = 'sa',
): Promise<Record<string, unknown> | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('editor_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('scope_key', scopeKey)
      .maybeSingle();
    if (!data) return null;

    if (data.zone_overrides && typeof data.zone_overrides === 'object') {
      const zo = data.zone_overrides as Record<string, unknown>;
      (['zone1', 'zone2', 'zone3', 'zone4'] as const).forEach(z => {
        if (zo[z]) editorCtx.applyZoneBackground(z, zo[z] as ZoneBackground);
      });
    }

    if (data.text_overrides && typeof data.text_overrides === 'object') {
      const to = data.text_overrides as Record<string, string>;
      Object.entries(to).forEach(([k, v]) => editorCtx.applyTextColor(k, v));
    }

    if (typeof data.background_image === 'string' && data.background_image) {
      editorCtx.setBackgroundImage(data.background_image);
    }

    if (typeof data.background_image_zoom === 'number' && data.background_image_zoom >= 50 && data.background_image_zoom <= 200) {
      editorCtx.setBackgroundImageZoom(data.background_image_zoom);
    }

    if (typeof data.background_image_position_x === 'number' || typeof data.background_image_position_y === 'number') {
      editorCtx.setBackgroundImagePosition(
        typeof data.background_image_position_x === 'number' ? data.background_image_position_x : 0,
        typeof data.background_image_position_y === 'number' ? data.background_image_position_y : 0,
      );
    }


    if (data.typography_overrides && typeof data.typography_overrides === 'object') {
      const typo = data.typography_overrides as TypographyOverrides;
      if (typo.categoryFont || typo.itemFont || typo.rdrFont) {
        editorCtx.setTypographyPreview(typo);
        editorCtx.commitTypography();
      }
    }

    if (data.button_overrides && typeof data.button_overrides === 'object') {
      const bo = data.button_overrides as Record<string, { bg?: unknown; textColor?: string; opacityMode?: 'transparent' | 'opaque' }>;
      Object.entries(bo).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          if (v.bg) editorCtx.applyButtonBg(k, v.bg as import('../../contexts/editorModeTypes').ZoneBackground, v.opacityMode);
          if (v.textColor) editorCtx.applyButtonTextColor(k, v.textColor);
        }
      });
    }

    if (data.card_overrides && typeof data.card_overrides === 'object') {
      const co = data.card_overrides as Record<string, { bg?: unknown }>;
      Object.entries(co).forEach(([k, v]) => {
        if (v && typeof v === 'object' && v.bg) {
          editorCtx.applyCardBg(k as import('../../contexts/editorModeTypes').CardTarget, v.bg as import('../../contexts/editorModeTypes').ZoneBackground);
        }
      });
    }

    if (data.panel_theme && (data.panel_theme === 'noir' || data.panel_theme === 'gris' || data.panel_theme === 'blanc')) {
      editorCtx.setPanelTheme(data.panel_theme as EditorPanelThemeId);
    }

    if (data.panel_palette && typeof data.panel_palette === 'object') {
      const pp = data.panel_palette as Record<string, unknown>;
      if (typeof pp.background === 'string' && typeof pp.surface === 'string' && typeof pp.accent === 'string') {
        editorCtx.setPanelPalettePreview(pp as unknown as CustomPanelPalette);
        editorCtx.commitPanelPalette();
      }
    }

    if (Array.isArray(data.saved_solids) && data.saved_solids.length > 0) {
      persistSolids(data.saved_solids as SavedColor[]);
      onSavedChanged();
    }
    if (Array.isArray(data.saved_gradients) && data.saved_gradients.length > 0) {
      persistGradients(data.saved_gradients as SavedColor[]);
      onSavedChanged();
    }

    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}
