import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { notifyAppIconChanged } from './useAppIcon';

export interface AppConfig {
  id: string;
  owner_type: 'super_admin' | 'company';
  company_id: string | null;
  app_name: string;
  app_icon_url: string | null;
  app_icon_id: string | null;
  logo_url: string | null;
  theme: string | null;
  enabled_modules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface UseAppConfigResult {
  config: AppConfig | null;
  loading: boolean;
  updateConfig: (updates: Partial<Pick<AppConfig, 'app_name' | 'app_icon_url' | 'app_icon_id' | 'logo_url' | 'theme' | 'enabled_modules'>>) => Promise<void>;
  reload: () => Promise<void>;
}

export function useAppConfig(companyId: string | null, ownerType: 'super_admin' | 'company' = 'company'): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (ownerType === 'company' && !companyId) {
      setLoading(false);
      return;
    }

    const query = supabase.from('app_config').select('*');

    if (ownerType === 'super_admin') {
      query.eq('owner_type', 'super_admin').is('company_id', null);
    } else {
      query.eq('owner_type', 'company').eq('company_id', companyId!);
    }

    const { data } = await query.maybeSingle();
    if (data) {
      setConfig(data as AppConfig);
    } else {
      setConfig(null);
    }
    setLoading(false);
  }, [companyId, ownerType]);

  useEffect(() => { load(); }, [load]);

  const updateConfig = useCallback(async (updates: Partial<Pick<AppConfig, 'app_name' | 'app_icon_url' | 'app_icon_id' | 'logo_url' | 'theme' | 'enabled_modules'>>) => {
    const payload = { ...updates, updated_at: new Date().toISOString() };

    if (config) {
      const { data } = await supabase
        .from('app_config')
        .update(payload)
        .eq('id', config.id)
        .select()
        .maybeSingle();
      if (data) setConfig(data as AppConfig);
    } else {
      const insertPayload = {
        owner_type: ownerType,
        company_id: ownerType === 'company' ? companyId : null,
        app_name: '',
        enabled_modules: {},
        ...payload,
      };
      const { data } = await supabase
        .from('app_config')
        .insert(insertPayload)
        .select()
        .maybeSingle();
      if (data) setConfig(data as AppConfig);
    }

    if ('app_icon_url' in updates || 'app_name' in updates) {
      notifyAppIconChanged({
        owner_type: ownerType,
        company_id: ownerType === 'company' ? companyId : null,
        app_icon_url: updates.app_icon_url ?? config?.app_icon_url ?? null,
        app_name: updates.app_name ?? config?.app_name,
      });
    }
  }, [config, companyId, ownerType]);

  return { config, loading, updateConfig, reload: load };
}
