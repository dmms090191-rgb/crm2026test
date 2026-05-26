import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type Theme = 'dark' | 'light' | 'graphite' | 'beige' | 'rose' | 'emerald' | 'luxury' | 'pink' | 'red' | 'orange' | 'yellow' | 'highlevel_light' | 'highlevel_dark' | 'highlevel_emerald' | 'glass';

export interface GlassConfig {
  imageUrl: string;
  blur: 'low' | 'medium' | 'high';
  cardTransparency: 'low' | 'medium' | 'high';
  overlayMode: 'dark' | 'light';
  accentColor: string;
  overlayOpacity: number;
  brightness: number;
  saturation: number;
  backgroundBlur: number;
}

export const DEFAULT_GLASS_CONFIG: GlassConfig = {
  imageUrl: '',
  blur: 'medium',
  cardTransparency: 'medium',
  overlayMode: 'dark',
  accentColor: '#f97316',
  overlayOpacity: 0.65,
  brightness: 0.55,
  saturation: 0.6,
  backgroundBlur: 3,
};

type PanelRole = 'admin' | 'vendor' | 'client' | 'super_admin';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  glassConfig: GlassConfig;
  setGlassConfig: (config: GlassConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function buildLocalKey(panelRole: PanelRole, effectiveId: string, isLeadFallback: boolean): string {
  if (isLeadFallback) return `crm_theme_${panelRole}_lead_${effectiveId}`;
  return `crm_theme_${panelRole}_${effectiveId}`;
}

function isValidTheme(v: unknown): v is Theme {
  return typeof v === 'string' && [
    'dark', 'light', 'graphite', 'beige', 'rose', 'emerald', 'luxury',
    'pink', 'red', 'orange', 'yellow', 'highlevel_light', 'highlevel_dark',
    'highlevel_emerald', 'glass',
  ].includes(v);
}

const THEME_BG: Record<Theme, string> = {
  dark: '#050810',
  light: '#080C16',
  graphite: '#1e2024',
  beige: '#14100A',
  rose: '#120A16',
  emerald: '#06130D',
  luxury: '#12100B',
  pink: '#120810',
  red: '#100808',
  orange: '#100A06',
  yellow: '#0E0C06',
  highlevel_light: '#f4f7fb',
  highlevel_dark: '#f3f6fb',
  highlevel_emerald: '#f8fafc',
  glass: '#0a0a14',
};

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  document.body.style.background = THEME_BG[t] || '#020617';
}

interface ThemeProviderProps {
  children: ReactNode;
  panelRole: PanelRole;
  effectiveUserId?: string;
}

function readCurrentTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (isValidTheme(attr)) return attr;
  return 'dark';
}

function loadGlassFromLocal(): GlassConfig {
  try {
    const raw = localStorage.getItem('crm_glass_config');
    if (raw) return { ...DEFAULT_GLASS_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_GLASS_CONFIG;
}

export function ThemeProvider({ children, panelRole, effectiveUserId }: ThemeProviderProps) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>(readCurrentTheme);
  const [glassConfig, setGlassConfigState] = useState<GlassConfig>(loadGlassFromLocal);
  const [ready, setReady] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) setSessionUserId(session.user.id);
    }
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setSessionUserId(session?.user.id ?? null);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('glass-blur-low', 'glass-blur-high');
    if (theme === 'glass' && glassConfig.blur === 'low') el.classList.add('glass-blur-low');
    if (theme === 'glass' && glassConfig.blur === 'high') el.classList.add('glass-blur-high');
  }, [theme, glassConfig.blur]);

  const resolvedId = effectiveUserId || sessionUserId;
  const isOwnAccount = !effectiveUserId || effectiveUserId === sessionUserId;
  const isLeadFallback = panelRole === 'client' && !!effectiveUserId && effectiveUserId !== sessionUserId;

  useEffect(() => {
    if (!resolvedId) { setReady(false); return; }
    let cancelled = false;
    const key = buildLocalKey(panelRole, resolvedId, isLeadFallback);

    async function loadTheme() {
      const cached = localStorage.getItem(key);
      if (isValidTheme(cached)) {
        setThemeState(cached);
        applyTheme(cached);
        localStorage.setItem('crm_theme_last', cached);
      }

      if (isOwnAccount && sessionUserId) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme, glass_config')
          .eq('user_id', sessionUserId)
          .maybeSingle();

        if (cancelled) return;

        if (!error && data) {
          if (isValidTheme(data.theme)) {
            setThemeState(data.theme);
            applyTheme(data.theme);
            localStorage.setItem(key, data.theme);
            localStorage.setItem('crm_theme_last', data.theme);
          }
          if (data.glass_config) {
            const gc = { ...DEFAULT_GLASS_CONFIG, ...data.glass_config } as GlassConfig;
            setGlassConfigState(gc);
            localStorage.setItem('crm_glass_config', JSON.stringify(gc));
          }
        } else if (!data && !error) {
          const fallback = (isValidTheme(cached) ? cached : 'dark') as Theme;
          setThemeState(fallback);
          applyTheme(fallback);
          localStorage.setItem('crm_theme_last', fallback);
        }
      } else {
        if (!isValidTheme(cached)) {
          setThemeState('dark');
          applyTheme('dark');
        }
      }
      if (!cancelled) setReady(true);
    }

    loadTheme();
    return () => { cancelled = true; };
  }, [resolvedId, panelRole, isOwnAccount, isLeadFallback, sessionUserId]);

  const setTheme = useCallback((t: Theme) => {
    if (!resolvedId) return;
    setThemeState(t);
    applyTheme(t);
    const key = buildLocalKey(panelRole, resolvedId, isLeadFallback);
    localStorage.setItem(key, t);
    localStorage.setItem('crm_theme_last', t);

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

  const setGlassConfig = useCallback((config: GlassConfig) => {
    setGlassConfigState(config);
    localStorage.setItem('crm_glass_config', JSON.stringify(config));
    if (isOwnAccount && sessionUserId) {
      supabase
        .from('user_preferences')
        .upsert(
          { user_id: sessionUserId, glass_config: config, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .then(() => {});
    }
  }, [isOwnAccount, sessionUserId]);

  if (resolvedId && !ready) {
    return <div className="min-h-screen" style={{ background: THEME_BG[theme] || '#020617' }} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, glassConfig, setGlassConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
