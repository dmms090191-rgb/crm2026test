import { supabase } from '../lib/supabase';

export async function wipeEditorSession(scopeKey: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('editor_sessions').upsert({
      user_id: user.id,
      scope_key: scopeKey,
      zone_overrides: {},
      text_overrides: {},
      background_image: null,
      background_image_zoom: null,
      background_image_position_x: null,
      background_image_position_y: null,
      typography_overrides: null,
      button_overrides: null,
      card_overrides: null,
      panel_palette: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,scope_key' });
  } catch { /* ignore */ }
}
