import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const PROTECTED_TABS = new Set(['dashboard', 'mon-compte', 'system']);

export function isProtectedTab(id: string): boolean {
  return PROTECTED_TABS.has(id);
}

export function useSAHiddenTabs(userId: string | null) {
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('sa_hidden_tabs')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.sa_hidden_tabs && Array.isArray(data.sa_hidden_tabs)) {
        setHiddenTabs(new Set(data.sa_hidden_tabs.filter((t: string) => !PROTECTED_TABS.has(t))));
      }
      setLoaded(true);
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
    setHiddenTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      persist(next);
      return next;
    });
  }, [persist]);

  return { hiddenTabs, loaded, toggle };
}
