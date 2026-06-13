import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { supabase } from '../../lib/supabase';
import type { VCConfig, VCElementType } from './visualCustomizeTypes';
import { styleFor } from './visualCustomizeStyles';
import type { VCContextValue, QuickApplyState, VCProviderProps } from './visualCustomizeContextTypes';

const VCContext = createContext<VCContextValue | null>(null);

const DEFAULT_SCOPE = 'sa_dashboard';

export function VisualCustomizeProvider({ children, scope = DEFAULT_SCOPE }: VCProviderProps) {
  const SCOPE = scope;
  const [enabled, setEnabled] = useState(false);
  const [markersHidden, setMarkersHidden] = useState(false);
  const [configs, setConfigs] = useState<Record<string, VCConfig>>({});
  const [draft, setDraft] = useState<Record<string, VCConfig>>({});
  const [activeSelection, setActiveSelection] = useState<VCActiveSelection | null>(null);
  const [registered, setRegistered] = useState<VCRegisteredElement[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [previewBarVisible, setPreviewBarVisible] = useState(false);
  const [quickApply, setQuickApply] = useState<QuickApplyState>({ active: false, presetConfig: null, presetModalKind: null, presetName: '' });
  const [quickApplyToast, setQuickApplyToast] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('sa_visual_customizations')
      .select('element_id, config')
      .eq('user_id', userId)
      .eq('scope', SCOPE)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, VCConfig> = {};
        for (const row of data) map[row.element_id] = row.config as VCConfig;
        setConfigs(map);
      });
  }, [userId, SCOPE]);

  const registerElement = useCallback((id: string, type: VCElementType, label: string, el: HTMLElement | null) => {
    setRegistered(prev => {
      const existing = prev.find(p => p.id === id);
      if (existing && existing.ref === el) return prev;
      const filtered = prev.filter(p => p.id !== id);
      return [...filtered, { id, type, label, ref: el }];
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    setRegistered(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateDraft = useCallback((id: string, cfg: VCConfig) => {
    setDraft(prev => ({ ...prev, [id]: cfg }));
  }, []);

  const resetDraft = useCallback((id: string) => {
    setDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const commitDraft = useCallback(async (id: string, type: VCElementType) => {
    const cfg = draft[id];
    if (!cfg || !userId) return;
    if (id.includes('__preview_')) {
      setDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    await supabase.from('sa_visual_customizations').upsert({
      user_id: userId,
      scope: SCOPE,
      element_id: id,
      element_type: type,
      config: cfg,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,scope,element_id' });
    setConfigs(prev => ({ ...prev, [id]: cfg }));
    setDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [draft, userId, SCOPE]);

  const quickCommit = useCallback(async (id: string, type: VCElementType, cfg: VCConfig) => {
    if (!userId) return;
    if (!id.includes('__preview_')) {
      await supabase.from('sa_visual_customizations').upsert({
        user_id: userId,
        scope: SCOPE,
        element_id: id,
        element_type: type,
        config: cfg,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,scope,element_id' });
    }
    setConfigs(prev => ({ ...prev, [id]: cfg }));
    setDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [userId, SCOPE]);

  const resetElement = useCallback(async (id: string) => {
    if (!userId) return;
    if (id.includes('__preview_')) {
      setDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    await supabase
      .from('sa_visual_customizations')
      .delete()
      .eq('user_id', userId)
      .eq('scope', SCOPE)
      .eq('element_id', id);
    setConfigs(prev => { const n = { ...prev }; delete n[id]; return n; });
    setDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [userId, SCOPE]);

  const styleForElement = useCallback((id: string, type: VCElementType): CSSProperties | undefined => {
    const cfg = draft[id] ?? configs[id] ?? null;
    return styleFor(type, cfg);
  }, [draft, configs]);

  const getConfigsSnapshot = useCallback(() => {
    const snapshot: Record<string, { type: VCElementType; config: VCConfig }> = {};
    for (const reg of registered) {
      const cfg = configs[reg.id];
      if (cfg) snapshot[reg.id] = { type: reg.type, config: cfg };
    }
    Object.entries(configs).forEach(([id, cfg]) => {
      if (!snapshot[id]) {
        const reg = registered.find(r => r.id === id);
        snapshot[id] = { type: reg?.type ?? 'card', config: cfg };
      }
    });
    return snapshot;
  }, [configs, registered]);

  const applyBulkConfigs = useCallback(async (entries: Record<string, { type: VCElementType; config: VCConfig }>) => {
    if (!userId) return;
    const newMap: Record<string, VCConfig> = {};
    const rows = Object.entries(entries)
      .filter(([id]) => !id.includes('__preview_'))
      .map(([id, { type, config }]) => {
        newMap[id] = config;
        return {
          user_id: userId,
          scope: SCOPE,
          element_id: id,
          element_type: type,
          config,
          updated_at: new Date().toISOString(),
        };
      });
    if (rows.length > 0) {
      await supabase.from('sa_visual_customizations').upsert(rows, { onConflict: 'user_id,scope,element_id' });
    }
    setConfigs(prev => ({ ...prev, ...newMap }));
    setDraft({});
  }, [userId, SCOPE]);

  const replaceAllConfigs = useCallback(async (entries: Record<string, { type: VCElementType; config: VCConfig }>) => {
    if (!userId) return;
    await supabase
      .from('sa_visual_customizations')
      .delete()
      .eq('user_id', userId)
      .eq('scope', SCOPE);
    const newMap: Record<string, VCConfig> = {};
    const rows = Object.entries(entries)
      .filter(([id]) => !id.includes('__preview_'))
      .map(([id, { type, config }]) => {
        newMap[id] = config;
        return {
          user_id: userId,
          scope: SCOPE,
          element_id: id,
          element_type: type,
          config,
          updated_at: new Date().toISOString(),
        };
      });
    if (rows.length > 0) {
      await supabase.from('sa_visual_customizations').upsert(rows, { onConflict: 'user_id,scope,element_id' });
    }
    setConfigs(newMap);
    setDraft({});
  }, [userId, SCOPE]);

  const clearAllConfigs = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('sa_visual_customizations')
      .delete()
      .eq('user_id', userId)
      .eq('scope', SCOPE);
    setConfigs({});
    setDraft({});
  }, [userId, SCOPE]);

  const commitAllDrafts = useCallback(async () => {
    if (!userId) return;
    const entries = Object.entries(draft).filter(([id]) => !id.includes('__preview_'));
    if (entries.length === 0) return;
    const rows = entries.map(([id, cfg]) => {
      const reg = registered.find(r => r.id === id);
      return {
        user_id: userId, scope: SCOPE, element_id: id,
        element_type: reg?.type ?? 'card',
        config: cfg, updated_at: new Date().toISOString(),
      };
    });
    await supabase.from('sa_visual_customizations').upsert(rows, { onConflict: 'user_id,scope,element_id' });
    const newConfigs: Record<string, VCConfig> = {};
    for (const [id, cfg] of entries) newConfigs[id] = cfg;
    setConfigs(prev => ({ ...prev, ...newConfigs }));
    setDraft({});
  }, [userId, SCOPE, draft, registered]);

  const clearAllDrafts = useCallback(() => { setDraft({}); }, []);

  const hasPendingDrafts = Object.keys(draft).filter(id => !id.includes('__preview_')).length > 0;

  const value = useMemo<VCContextValue>(() => ({
    enabled, setEnabled,
    markersHidden, setMarkersHidden,
    previewBarVisible, setPreviewBarVisible,
    getConfigsSnapshot, applyBulkConfigs, replaceAllConfigs, clearAllConfigs,
    configs, draft, activeSelection, setActiveSelection,
    updateDraft, commitDraft, quickCommit, resetDraft, resetElement,
    commitAllDrafts, clearAllDrafts, hasPendingDrafts,
    registerElement, unregisterElement, registered,
    styleFor: styleForElement,
    quickApply, setQuickApply,
    quickApplyToast, setQuickApplyToast,
  }), [enabled, markersHidden, previewBarVisible, getConfigsSnapshot, applyBulkConfigs, replaceAllConfigs, clearAllConfigs, configs, draft, activeSelection, updateDraft, commitDraft, quickCommit, resetDraft, resetElement, commitAllDrafts, clearAllDrafts, hasPendingDrafts, registerElement, unregisterElement, registered, styleForElement, quickApply, quickApplyToast]);

  return <VCContext.Provider value={value}>{children}</VCContext.Provider>;
}

export function useVisualCustomize() {
  const ctx = useContext(VCContext);
  if (!ctx) throw new Error('useVisualCustomize must be used within VisualCustomizeProvider');
  return ctx;
}

export function useVisualCustomizeSafe() {
  return useContext(VCContext);
}
