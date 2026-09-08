import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { cacheKey, readCache, writeCache } from '../../lib/hiddenTabsCache';

export const PROTECTED_TAB_IDS = ['dashboard', 'mon-compte', 'system'];
const PROTECTED_TABS = new Set(PROTECTED_TAB_IDS);

export function isProtectedTab(id: string): boolean {
  return PROTECTED_TABS.has(id);
}

function sanitize(list: string[]): Set<string> {
  return new Set(list.filter(t => !PROTECTED_TABS.has(t)));
}

export function useSAHiddenTabs(userId: string | null) {
  const lsKey = cacheKey('super_admin', null, userId ?? null);

  const [state, setState] = useState(() => {
    const c = readCache(lsKey);
    return { key: lsKey, tabs: sanitize(c ?? []), loaded: c !== null };
  });

  // userId vient de supabase.auth.getUser() : il est null au premier render.
  // Relecture du cache pendant le render quand la cle change — pas de flash.
  if (state.key !== lsKey) {
    const c = readCache(lsKey);
    setState({ key: lsKey, tabs: sanitize(c ?? []), loaded: c !== null });
  }

  const hiddenTabs = state.tabs;
  const loaded = state.loaded;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('sa_hidden_tabs')
        .eq('user_id', userId)
        .maybeSingle();
      const resolved: string[] = (data?.sa_hidden_tabs && Array.isArray(data.sa_hidden_tabs))
        ? (data.sa_hidden_tabs as string[])
        : [];
      const key = cacheKey('super_admin', null, userId);
      writeCache(key, resolved);
      setState({ key, tabs: sanitize(resolved), loaded: true });
    })();
  }, [userId]);

  const persist = useCallback(async (next: Set<string>) => {
    if (!userId) return;
    const arr = Array.from(next);
    await supabase.from('user_preferences').upsert(
      { user_id: userId, sa_hidden_tabs: arr, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  }, [userId]);

  const toggle = useCallback((tabId: string) => {
    if (PROTECTED_TABS.has(tabId)) return;
    setState(prev => {
      const next = new Set(prev.tabs);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      writeCache(prev.key, Array.from(next));
      persist(next);
      return { ...prev, tabs: next };
    });
  }, [persist]);

  return { hiddenTabs, loaded, toggle };
}
