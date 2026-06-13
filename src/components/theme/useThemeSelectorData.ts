import { useState, useMemo, useEffect, useCallback } from 'react';
import { ALL_THEMES } from './themeData';
import { supabase } from '../../lib/supabase';
import { CUSTOM_CATEGORY, FAV_TAB, PERSONAL_TAB, COMMUNITY_TAB, type ThemeConfigLite, type CustomThemeRow, type CategoryLite } from './themeSelectorTypes';

export function useThemeSelectorData(open: boolean, effectiveUserId?: string | null) {
  const [configMap, setConfigMap] = useState<Map<string, ThemeConfigLite>>(new Map());
  const [dynamicCategories, setDynamicCategories] = useState<CategoryLite[]>([]);
  const [personalCustomThemes, setPersonalCustomThemes] = useState<CustomThemeRow[]>([]);
  const [sharedCustomThemes, setSharedCustomThemes] = useState<CustomThemeRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [configRes, catRes, userRes] = await Promise.all([
        supabase.from('theme_config').select('theme_key, label, status, is_recommended, is_favorite, display_order, category, created_from_theme, theme_tokens, owner_user_id, owner_company_id, is_shared').order('display_order', { ascending: true }),
        supabase.from('theme_categories').select('slug, name, sort_order').order('sort_order', { ascending: true }),
        supabase.auth.getUser().then(async ({ data: { user } }) => {
          if (!user) return null;
          const { data } = await supabase.from('user_preferences').select('favorite_themes').eq('user_id', user.id).maybeSingle();
          return { user, prefs: data };
        }),
      ]);
      if (cancelled) return;

      const authUserId = userRes?.user?.id ?? null;
      const resolvedUserId = effectiveUserId ?? authUserId;
      setCurrentUserId(resolvedUserId);

      if (configRes.data) {
        const map = new Map<string, ThemeConfigLite>();
        const personal: CustomThemeRow[] = [];
        const shared: CustomThemeRow[] = [];
        for (const row of configRes.data) {
          map.set(row.theme_key, row as ThemeConfigLite);
          if (row.category === CUSTOM_CATEGORY && row.status === 'visible') {
            const isOwner = resolvedUserId != null && row.owner_user_id != null && row.owner_user_id === resolvedUserId;
            if (isOwner && !row.is_shared) {
              personal.push(row as CustomThemeRow);
            } else if (row.owner_user_id == null || row.is_shared) {
              shared.push(row as CustomThemeRow);
            }
          }
        }
        setConfigMap(map);
        setPersonalCustomThemes(personal);
        setSharedCustomThemes(shared);
      }
      if (catRes.data) setDynamicCategories(catRes.data as CategoryLite[]);
      if (userRes?.prefs?.favorite_themes && Array.isArray(userRes.prefs.favorite_themes)) {
        setUserFavorites(new Set(userRes.prefs.favorite_themes as string[]));
      } else {
        setUserFavorites(new Set());
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [open, effectiveUserId]);

  const toggleFavorite = useCallback((themeKey: string) => {
    setUserFavorites(prev => {
      const next = new Set(prev);
      if (next.has(themeKey)) next.delete(themeKey);
      else next.add(themeKey);
      const arr = Array.from(next);
      localStorage.setItem('crm_favorite_themes', JSON.stringify(arr));
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('user_preferences')
            .upsert({ user_id: user.id, favorite_themes: arr, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
            .then(() => {});
        }
      });
      return next;
    });
  }, []);

  const allCustomThemes = useMemo(() => [...personalCustomThemes, ...sharedCustomThemes], [personalCustomThemes, sharedCustomThemes]);

  const visibleThemes = useMemo(() => {
    if (!loaded) return [];
    return ALL_THEMES
      .filter(t => {
        const cfg = configMap.get(t.value);
        if (!cfg) return false;
        return cfg.status === 'visible' || cfg.status === 'premium';
      })
      .map(t => {
        const cfg = configMap.get(t.value);
        if (!cfg) return t;
        return { ...t, label: cfg.label || t.label, category: cfg.category as typeof t.category };
      })
      .sort((a, b) => {
        const oA = configMap.get(a.value)?.display_order ?? 999;
        const oB = configMap.get(b.value)?.display_order ?? 999;
        return oA - oB;
      });
  }, [configMap, loaded]);

  const tabs = useMemo(() => {
    const virtualSlugs = new Set(['all', 'recommended', 'rework', 'hidden', 'editor']);
    const cats = dynamicCategories.filter(c => !virtualSlugs.has(c.slug) || c.slug === 'all');
    const base = cats.length === 0
      ? [
          { key: 'all', label: 'Tous' },
          { key: 'dark', label: 'Sombres' },
          { key: 'light', label: 'Clairs' },
          { key: 'premium', label: 'Premium' },
          { key: 'business', label: 'Business' },
          { key: 'glass', label: 'Glass' },
        ]
      : cats.map(c => ({ key: c.slug, label: c.name }));

    const result: { key: string; label: string }[] = [];
    const allTab = base.find(t => t.key === 'all');
    if (allTab) result.push(allTab);
    result.push({ key: FAV_TAB, label: 'Favoris' });
    if (personalCustomThemes.length > 0) result.push({ key: PERSONAL_TAB, label: 'Personnels' });
    if (sharedCustomThemes.length > 0) result.push({ key: COMMUNITY_TAB, label: 'Communaute' });
    for (const t of base) {
      if (t.key !== 'all' && t.key !== CUSTOM_CATEGORY) result.push(t);
    }
    return result;
  }, [dynamicCategories, personalCustomThemes, sharedCustomThemes]);

  const recommendedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, cfg] of configMap) { if (cfg.is_recommended) keys.add(key); }
    return keys;
  }, [configMap]);

  const premiumKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, cfg] of configMap) { if (cfg.status === 'premium') keys.add(key); }
    return keys;
  }, [configMap]);

  return {
    configMap, customThemes: allCustomThemes, personalCustomThemes, sharedCustomThemes,
    userFavorites, toggleFavorite,
    visibleThemes, tabs, recommendedKeys, premiumKeys, currentUserId,
  };
}

export function useThemeSelectorFilters(
  tab: string,
  search: string,
  visibleThemes: ReturnType<typeof useThemeSelectorData>['visibleThemes'],
  customThemes: ReturnType<typeof useThemeSelectorData>['customThemes'],
  configMap: ReturnType<typeof useThemeSelectorData>['configMap'],
  userFavorites: Set<string>,
) {
  const entries = useMemo(() => {
    let list = visibleThemes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q)) ||
        t.category.includes(q),
      );
    } else if (tab !== 'all' && tab !== CUSTOM_CATEGORY && tab !== FAV_TAB && tab !== PERSONAL_TAB && tab !== COMMUNITY_TAB) {
      list = list.filter(t => {
        const cfg = configMap.get(t.value);
        const cat = cfg?.category || t.category;
        return cat === tab;
      });
    }
    return list;
  }, [tab, search, visibleThemes, configMap]);

  const filteredCustomThemes = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return customThemes.filter(ct => ct.label.toLowerCase().includes(q));
    }
    if (tab === 'all' || tab === CUSTOM_CATEGORY || tab === FAV_TAB || tab === PERSONAL_TAB || tab === COMMUNITY_TAB) return customThemes;
    return [];
  }, [tab, search, customThemes]);

  const favoriteStandard = useMemo(() => entries.filter(e => userFavorites.has(e.value)), [entries, userFavorites]);
  const favoriteCustom = useMemo(() => filteredCustomThemes.filter(ct => userFavorites.has(ct.theme_key)), [filteredCustomThemes, userFavorites]);
  const totalFavorites = favoriteStandard.length + favoriteCustom.length;

  return { entries, filteredCustomThemes, favoriteStandard, favoriteCustom, totalFavorites };
}
