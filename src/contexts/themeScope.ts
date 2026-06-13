import { supabase } from '../lib/supabase';
import type { Theme, GlassConfig, CustomThemeOverrides } from './themeTypes';

export type PanelRole = 'admin' | 'vendor' | 'client' | 'super_admin' | 'company_super_admin';

export type ThemeScope =
  | { kind: 'sa'; userId: string }
  | { kind: 'company'; companyId: string }
  | { kind: 'none' };

export interface ThemeSliceData {
  theme?: Theme;
  glass_config?: GlassConfig;
  custom_theme_key?: string | null;
  custom_theme_overrides?: CustomThemeOverrides | null;
}

const VALID_THEMES: Theme[] = [
  'dark', 'light', 'graphite', 'beige', 'rose', 'emerald', 'luxury',
  'pink', 'red', 'orange', 'yellow', 'highlevel_light', 'highlevel_dark',
  'highlevel_emerald', 'glass',
];

export function isValidTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (VALID_THEMES as string[]).includes(v);
}

export function resolveScope(panelRole: PanelRole, sessionUserId: string | null, companyId: string | null): ThemeScope {
  if (panelRole === 'super_admin') {
    return sessionUserId ? { kind: 'sa', userId: sessionUserId } : { kind: 'none' };
  }
  if (panelRole === 'company_super_admin' && companyId) {
    return { kind: 'company', companyId };
  }
  if (companyId) return { kind: 'company', companyId };
  return { kind: 'none' };
}

export function scopeCacheKey(scope: ThemeScope, field: 'theme' | 'glass' | 'ct_key' | 'ct_overrides'): string | null {
  if (scope.kind === 'sa') return `tlx_${field}_sa_${scope.userId}`;
  if (scope.kind === 'company') return `tlx_${field}_co_${scope.companyId}`;
  return null;
}

export async function loadScopeData(scope: ThemeScope): Promise<ThemeSliceData | null> {
  if (scope.kind === 'sa') {
    const { data } = await supabase
      .from('user_preferences')
      .select('theme_by_role')
      .eq('user_id', scope.userId)
      .maybeSingle();
    const map = (data?.theme_by_role && typeof data.theme_by_role === 'object')
      ? (data.theme_by_role as Record<string, ThemeSliceData>)
      : {};
    return map.super_admin ?? null;
  }
  if (scope.kind === 'company') {
    const { data } = await supabase
      .from('companies')
      .select('theme_config')
      .eq('id', scope.companyId)
      .maybeSingle();
    if (!data?.theme_config || typeof data.theme_config !== 'object') return null;
    return data.theme_config as ThemeSliceData;
  }
  return null;
}

export async function saveScopeData(scope: ThemeScope, partial: ThemeSliceData): Promise<void> {
  if (scope.kind === 'sa') {
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('theme_by_role')
      .eq('user_id', scope.userId)
      .maybeSingle();
    const map = (existing?.theme_by_role && typeof existing.theme_by_role === 'object')
      ? { ...(existing.theme_by_role as Record<string, ThemeSliceData>) }
      : {};
    map.super_admin = { ...(map.super_admin ?? {}), ...partial };
    await supabase.from('user_preferences').upsert({
      user_id: scope.userId,
      updated_at: new Date().toISOString(),
      theme_by_role: map,
    }, { onConflict: 'user_id' });
    return;
  }
  if (scope.kind === 'company') {
    const { data: existing } = await supabase
      .from('companies')
      .select('theme_config')
      .eq('id', scope.companyId)
      .maybeSingle();
    const current = (existing?.theme_config && typeof existing.theme_config === 'object')
      ? (existing.theme_config as ThemeSliceData)
      : {};
    const merged = { ...current, ...partial };
    await supabase.from('companies').update({ theme_config: merged }).eq('id', scope.companyId);
  }
}

export function scopeKey(scope: ThemeScope): string {
  if (scope.kind === 'sa') return `sa:${scope.userId}`;
  if (scope.kind === 'company') return `co:${scope.companyId}`;
  return 'none';
}
