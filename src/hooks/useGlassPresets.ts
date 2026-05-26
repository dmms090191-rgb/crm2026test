import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_GLASS_CONFIG, type GlassConfig } from '../contexts/ThemeContext';

export interface GlassPreset {
  id: string;
  user_id: string;
  name: string;
  image_storage_path: string;
  image_public_url: string;
  config: Omit<GlassConfig, 'imageUrl'>;
  position: number;
  created_at: string;
  updated_at: string;
}

function parseConfig(raw: unknown): Omit<GlassConfig, 'imageUrl'> {
  const base = { ...DEFAULT_GLASS_CONFIG };
  delete (base as Record<string, unknown>).imageUrl;
  if (raw && typeof raw === 'object') return { ...base, ...(raw as Record<string, unknown>) } as Omit<GlassConfig, 'imageUrl'>;
  return base;
}

export function presetToGlassConfig(preset: GlassPreset): GlassConfig {
  return { ...DEFAULT_GLASS_CONFIG, ...preset.config, imageUrl: preset.image_public_url };
}

export function useGlassPresets() {
  const [presets, setPresets] = useState<GlassPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('glass_presets')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPresets(data.map(r => ({ ...r, config: parseConfig(r.config) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = useCallback(async (file: File): Promise<GlassPreset | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `${user.id}/glass-preset-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('theme-backgrounds')
      .upload(storagePath, file, { upsert: false });
    if (upErr) return null;

    const { data: urlData } = supabase.storage
      .from('theme-backgrounds')
      .getPublicUrl(storagePath);

    const { blur, cardTransparency, overlayMode, accentColor, overlayOpacity, brightness, saturation, backgroundBlur } = DEFAULT_GLASS_CONFIG;
    const config = { blur, cardTransparency, overlayMode, accentColor, overlayOpacity, brightness, saturation, backgroundBlur };

    const { data: row, error: insertErr } = await supabase
      .from('glass_presets')
      .insert({
        user_id: user.id,
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Glass personnalise',
        image_storage_path: storagePath,
        image_public_url: urlData.publicUrl,
        config,
        position: presets.length,
      })
      .select()
      .maybeSingle();

    if (insertErr || !row) return null;

    const preset = { ...row, config: parseConfig(row.config) } as GlassPreset;
    setPresets(prev => [...prev, preset]);
    return preset;
  }, [presets.length]);

  const updatePreset = useCallback(async (id: string, updates: { name?: string; config?: Omit<GlassConfig, 'imageUrl'> }) => {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.config !== undefined) payload.config = updates.config;

    const { error } = await supabase
      .from('glass_presets')
      .update(payload)
      .eq('id', id);

    if (!error) {
      setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: payload.updated_at as string } : p));
    }
  }, []);

  const deletePreset = useCallback(async (preset: GlassPreset) => {
    await supabase.storage.from('theme-backgrounds').remove([preset.image_storage_path]);
    await supabase.from('glass_presets').delete().eq('id', preset.id);
    setPresets(prev => prev.filter(p => p.id !== preset.id));
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    await updatePreset(id, { name });
  }, [updatePreset]);

  return { presets, loading, upload, updatePreset, deletePreset, rename, reload: load };
}
