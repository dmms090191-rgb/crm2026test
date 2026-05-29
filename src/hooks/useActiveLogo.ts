import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LOGO_CHANNEL = 'active-logo-changed';

export function notifyLogoChanged() {
  try {
    const bc = new BroadcastChannel(LOGO_CHANNEL);
    bc.postMessage('changed');
    bc.close();
  } catch {
    // BroadcastChannel not supported — realtime will handle it
  }
  window.dispatchEvent(new CustomEvent(LOGO_CHANNEL));
}

export interface ActiveLogoInfo {
  url: string | null;
  scale: number;
}

export function useActiveLogo(companyId: string | null): ActiveLogoInfo {
  const [info, setInfo] = useState<ActiveLogoInfo>({ url: null, scale: 1 });

  useEffect(() => {
    if (!companyId) { setInfo({ url: null, scale: 1 }); return; }

    let cancelled = false;

    async function fetchLogo() {
      const [logoRes, pageRes] = await Promise.all([
        supabase
          .from('company_logos')
          .select('url')
          .eq('company_id', companyId!)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('company_home_pages')
          .select('logo_scale')
          .eq('company_id', companyId!)
          .limit(1)
          .maybeSingle(),
      ]);
      if (!cancelled) {
        setInfo({
          url: logoRes.data?.url ?? null,
          scale: pageRes.data?.logo_scale ?? 1,
        });
      }
    }

    fetchLogo();

    const handleLocal = () => { fetchLogo(); };
    window.addEventListener(LOGO_CHANNEL, handleLocal);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(LOGO_CHANNEL);
      bc.onmessage = () => { fetchLogo(); };
    } catch {
      // not supported
    }

    const channel = supabase
      .channel(`active-logo-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_logos', filter: `company_id=eq.${companyId}` },
        () => { fetchLogo(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener(LOGO_CHANNEL, handleLocal);
      bc?.close();
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return info;
}
