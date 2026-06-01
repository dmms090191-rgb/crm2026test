import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const APP_ICON_EVENT = 'talvex-app-icon-updated';
const APP_ICON_BC = 'talvex-app-icon-channel';

export interface AppIconChangeDetail {
  owner_type: 'super_admin' | 'company';
  company_id: string | null;
  app_icon_url: string | null;
  app_name?: string;
}

export function notifyAppIconChanged(detail: AppIconChangeDetail) {
  window.dispatchEvent(new CustomEvent(APP_ICON_EVENT, { detail }));
  try {
    const bc = new BroadcastChannel(APP_ICON_BC);
    bc.postMessage(detail);
    bc.close();
  } catch {
    // BroadcastChannel not supported
  }
}

export function useAppIcon(
  companyId: string | null,
  ownerType: 'super_admin' | 'company' = 'company',
): { appIconUrl: string | null; appName: string } {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState('');

  const fetchIcon = useCallback(async () => {
    const query = supabase.from('app_config').select('app_icon_url, app_name');
    if (ownerType === 'super_admin') {
      query.eq('owner_type', 'super_admin').is('company_id', null);
    } else {
      if (!companyId) return;
      query.eq('owner_type', 'company').eq('company_id', companyId);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      setIconUrl(data.app_icon_url ?? null);
      if (data.app_name) setAppName(data.app_name);
    }

    if (!data?.app_icon_url && companyId) {
      const { data: hp } = await supabase
        .from('company_home_pages')
        .select('app_icon_url')
        .eq('company_id', companyId)
        .maybeSingle();
      if (hp?.app_icon_url) setIconUrl(hp.app_icon_url);
    }

    if (!data?.app_icon_url && companyId) {
      const { data: logo } = await supabase
        .from('company_logos')
        .select('url')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (logo?.url) setIconUrl(prev => prev ?? logo.url);
    }
  }, [companyId, ownerType]);

  useEffect(() => {
    fetchIcon();
  }, [fetchIcon]);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent<AppIconChangeDetail>).detail;
      if (!detail) { fetchIcon(); return; }
      const matches = ownerType === 'super_admin'
        ? detail.owner_type === 'super_admin'
        : detail.company_id === companyId;
      if (matches) {
        if (detail.app_icon_url !== undefined) setIconUrl(detail.app_icon_url);
        if (detail.app_name) setAppName(detail.app_name);
      }
    };
    window.addEventListener(APP_ICON_EVENT, handleEvent);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(APP_ICON_BC);
      bc.onmessage = (msg) => {
        const detail = msg.data as AppIconChangeDetail;
        const matches = ownerType === 'super_admin'
          ? detail.owner_type === 'super_admin'
          : detail.company_id === companyId;
        if (matches) {
          if (detail.app_icon_url !== undefined) setIconUrl(detail.app_icon_url);
          if (detail.app_name) setAppName(detail.app_name);
        }
      };
    } catch {
      // not supported
    }

    const filterKey = ownerType === 'super_admin' ? 'owner_type' : 'company_id';
    const filterVal = ownerType === 'super_admin' ? 'super_admin' : companyId;
    const channelName = `app-icon-rt-${ownerType}-${companyId ?? 'global'}`;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (filterVal) {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_config', filter: `${filterKey}=eq.${filterVal}` },
          () => { fetchIcon(); },
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener(APP_ICON_EVENT, handleEvent);
      bc?.close();
      if (channel) supabase.removeChannel(channel);
    };
  }, [companyId, ownerType, fetchIcon]);

  return { appIconUrl: iconUrl, appName };
}
