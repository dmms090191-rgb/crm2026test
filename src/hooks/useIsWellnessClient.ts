import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useIsWellnessClient(clientEmail: string): boolean {
  const [isWellness, setIsWellness] = useState(false);

  useEffect(() => {
    if (!clientEmail) { setIsWellness(false); return; }
    let cancelled = false;

    supabase.rpc('is_wellness_client_by_email', { p_email: clientEmail })
      .then(({ data }) => {
        if (!cancelled) setIsWellness(data === true);
      });

    return () => { cancelled = true; };
  }, [clientEmail]);

  return isWellness;
}
