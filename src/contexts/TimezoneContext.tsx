import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getUserTimezone, setUserTimezone, getTzCountryLabel, getTzCountryCode } from '../lib/timezone';

type PanelRole = 'admin' | 'vendor' | 'client' | 'super_admin';

export interface TimezoneContextValue {
  timezone: string;
  tzLabel: string;
  tzCode: string;
  setTimezone: (tz: string) => void;
  userRole: PanelRole;
  userName: string;
}

export const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
  panelRole: PanelRole;
}

export function TimezoneProvider({ children, panelRole }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>(() => getUserTimezone(panelRole));
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const user = session.user;
      setUserId(user.id);

      const meta = user.user_metadata;
      const name = [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || '';
      setUserName(name);

      const specificKey = `crm_user_timezone_${panelRole}_${user.id}`;
      const hasSpecific = !!localStorage.getItem(specificKey);

      if (hasSpecific) {
        if (!cancelled) setTimezoneState(localStorage.getItem(specificKey)!);
        return;
      }

      let seedTz: string | null = null;

      if (panelRole === 'admin') {
        seedTz = meta?.timezone || null;
      } else if (panelRole === 'vendor' && user.app_metadata?.role === 'vendor') {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('timezone')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        seedTz = vendor?.timezone || null;
      }

      if (seedTz) {
        setUserTimezone(seedTz, panelRole, user.id);
        if (!cancelled) setTimezoneState(seedTz);
      } else {
        const current = getUserTimezone(panelRole);
        setUserTimezone(current, panelRole, user.id);
      }
    })();

    return () => { cancelled = true; };
  }, [panelRole]);

  const setTimezone = useCallback(async (tz: string) => {
    setTimezoneState(tz);

    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || userId;

    setUserTimezone(tz, panelRole, uid);

    if (!session) return;

    if (panelRole === 'admin') {
      await supabase.auth.updateUser({ data: { timezone: tz } });
    } else if (panelRole === 'vendor' && session.user.app_metadata?.role === 'vendor') {
      await supabase
        .from('vendors')
        .update({ timezone: tz })
        .eq('auth_user_id', session.user.id);
    }
  }, [panelRole, userId]);

  const tzLabel = getTzCountryLabel(timezone);
  const tzCode = getTzCountryCode(timezone);

  return (
    <TimezoneContext.Provider value={{ timezone, tzLabel, tzCode, setTimezone, userRole: panelRole, userName }}>
      {children}
    </TimezoneContext.Provider>
  );
}

