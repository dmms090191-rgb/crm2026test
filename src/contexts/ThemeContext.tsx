import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type Theme = 'dark' | 'light' | 'graphite' | 'beige' | 'rose' | 'emerald' | 'luxury' | 'pink' | 'red' | 'orange' | 'yellow';

type PanelRole = 'admin' | 'vendor' | 'client';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function buildLocalKey(panelRole: PanelRole, effectiveId: string, isLeadFallback: boolean): string {
  if (isLeadFallback) {
    return `crm_theme_${panelRole}_lead_${effectiveId}`;
  }
  return `crm_theme_${panelRole}_${effectiveId}`;
}

function isValidTheme(v: unknown): v is Theme {
  return v === 'dark' || v === 'light' || v === 'graphite' || v === 'beige' || v === 'rose' || v === 'emerald' || v === 'luxury' || v === 'pink' || v === 'red' || v === 'orange' || v === 'yellow';
}

interface ThemeProviderProps {
  children: ReactNode;
  panelRole: PanelRole;
  effectiveUserId?: string;
}

export function ThemeProvider({ children, panelRole, effectiveUserId }: ThemeProviderProps) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [ready, setReady] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setSessionUserId(session.user.id);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setSessionUserId(session?.user.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const resolvedId = effectiveUserId || sessionUserId;
  const isOwnAccount = !effectiveUserId || effectiveUserId === sessionUserId;
  const isLeadFallback = panelRole === 'client' && !!effectiveUserId && effectiveUserId !== sessionUserId;

  useEffect(() => {
    if (!resolvedId) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const key = buildLocalKey(panelRole, resolvedId, isLeadFallback);

    async function loadTheme() {
      const cached = localStorage.getItem(key);
      if (isValidTheme(cached)) {
        setThemeState(cached);
        document.documentElement.setAttribute('data-theme', cached);
      }

      if (isOwnAccount && sessionUserId) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', sessionUserId)
          .maybeSingle();

        if (cancelled) return;

        if (!error && data && isValidTheme(data.theme)) {
          setThemeState(data.theme);
          document.documentElement.setAttribute('data-theme', data.theme);
          localStorage.setItem(key, data.theme);
        } else if (!data && !error) {
          const fallback = isValidTheme(cached) ? cached : 'dark';
          setThemeState(fallback as Theme);
          document.documentElement.setAttribute('data-theme', fallback as Theme);
        }
      } else {
        if (!isValidTheme(cached)) {
          setThemeState('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      }

      if (!cancelled) setReady(true);
    }

    loadTheme();

    return () => { cancelled = true; };
  }, [resolvedId, panelRole, isOwnAccount, isLeadFallback, sessionUserId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    if (!resolvedId) return;

    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);

    const key = buildLocalKey(panelRole, resolvedId, isLeadFallback);
    localStorage.setItem(key, t);

    if (isOwnAccount && sessionUserId) {
      if (!savingRef.current) {
        savingRef.current = true;
        supabase
          .from('user_preferences')
          .upsert({ user_id: sessionUserId, theme: t, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          .then(() => { savingRef.current = false; });
      } else {
        setTimeout(() => {
          savingRef.current = true;
          supabase
            .from('user_preferences')
            .upsert({ user_id: sessionUserId, theme: t, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
            .then(() => { savingRef.current = false; });
        }, 300);
      }
    }
  }, [resolvedId, panelRole, isLeadFallback, isOwnAccount, sessionUserId]);

  if (resolvedId && !ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
