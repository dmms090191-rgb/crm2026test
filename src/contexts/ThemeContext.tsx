import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  type Theme,
  type GlassConfig,
  type CustomThemeOverrides,
  DEFAULT_GLASS_CONFIG,
  THEME_BG,
} from './themeTypes';
import {
  type PanelRole,
  type ThemeScope,
  isValidTheme,
  resolveScope,
  scopeCacheKey,
  scopeKey as makeScopeKey,
  loadScopeData,
  saveScopeData,
} from './themeScope';

export type { Theme, GlassConfig, CustomThemeOverrides };
export { DEFAULT_GLASS_CONFIG };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  glassConfig: GlassConfig;
  setGlassConfig: (config: GlassConfig) => void;
  customThemeKey: string | null;
  customThemeOverrides: CustomThemeOverrides | null;
  applyCustomTheme: (key: string, baseTheme: Theme, overrides: CustomThemeOverrides) => void;
  clearCustomTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  document.body.style.background = THEME_BG[t] || '#020617';
  try { localStorage.setItem('crm_theme_last', t); } catch { /* ignore */ }
}

function revealApp() {
  document.getElementById('root')?.classList.add('app-ready');
}

function readCachedTheme(scope: ThemeScope): Theme | null {
  const key = scopeCacheKey(scope, 'theme');
  if (!key) return null;
  try {
    const v = localStorage.getItem(key);
    return isValidTheme(v) ? v : null;
  } catch { return null; }
}

function readCachedGlass(scope: ThemeScope): GlassConfig | null {
  const key = scopeCacheKey(scope, 'glass');
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...DEFAULT_GLASS_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return null;
}

function readCachedCustomKey(scope: ThemeScope): string | null {
  const key = scopeCacheKey(scope, 'ct_key');
  if (!key) return null;
  try { return localStorage.getItem(key) || null; } catch { return null; }
}

function readCachedCustomOverrides(scope: ThemeScope): CustomThemeOverrides | null {
  const key = scopeCacheKey(scope, 'ct_overrides');
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function writeCache(scope: ThemeScope, slice: { theme?: Theme; glass?: GlassConfig; ctKey?: string | null; ctOverrides?: CustomThemeOverrides | null }) {
  const keys = {
    theme: scopeCacheKey(scope, 'theme'),
    glass: scopeCacheKey(scope, 'glass'),
    ctKey: scopeCacheKey(scope, 'ct_key'),
    ctOv: scopeCacheKey(scope, 'ct_overrides'),
  };
  try {
    if (slice.theme && keys.theme) localStorage.setItem(keys.theme, slice.theme);
    if (slice.glass && keys.glass) localStorage.setItem(keys.glass, JSON.stringify(slice.glass));
    if (keys.ctKey) {
      if (slice.ctKey) localStorage.setItem(keys.ctKey, slice.ctKey);
      else if (slice.ctKey === null) localStorage.removeItem(keys.ctKey);
    }
    if (keys.ctOv) {
      if (slice.ctOverrides) localStorage.setItem(keys.ctOv, JSON.stringify(slice.ctOverrides));
      else if (slice.ctOverrides === null) localStorage.removeItem(keys.ctOv);
    }
  } catch { /* ignore */ }
}

interface ThemeProviderProps {
  children: ReactNode;
  panelRole: PanelRole;
  effectiveUserId?: string;
  companyId?: string | null;
}

export function ThemeProvider({ children, panelRole, effectiveUserId, companyId }: ThemeProviderProps) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [jwtCompanyId, setJwtCompanyId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [glassConfig, setGlassConfigState] = useState<GlassConfig>(DEFAULT_GLASS_CONFIG);
  const [customThemeKey, setCustomThemeKeyState] = useState<string | null>(null);
  const [customThemeOverrides, setCustomThemeOverridesState] = useState<CustomThemeOverrides | null>(null);
  const [ready, setReady] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSessionUserId(session?.user.id ?? null);
      const meta = session?.user.app_metadata as { company_id?: string } | undefined;
      setJwtCompanyId(meta?.company_id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSessionUserId(session?.user.id ?? null);
      const meta = session?.user.app_metadata as { company_id?: string } | undefined;
      setJwtCompanyId(meta?.company_id ?? null);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const effectiveCompanyId = companyId ?? (panelRole !== 'super_admin' ? jwtCompanyId : null);
  const scope = useMemo<ThemeScope>(
    () => resolveScope(panelRole, sessionUserId, effectiveCompanyId),
    [panelRole, sessionUserId, effectiveCompanyId]
  );
  const scopeId = makeScopeKey(scope);
  const isOwnAccount = !effectiveUserId || effectiveUserId === sessionUserId;

  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.remove('glass-blur-low', 'glass-blur-high');
    if (theme === 'glass' && glassConfig.blur === 'low') el.classList.add('glass-blur-low');
    if (theme === 'glass' && glassConfig.blur === 'high') el.classList.add('glass-blur-high');
  }, [theme, glassConfig.blur]);

  useLayoutEffect(() => {
    if (scope.kind === 'none') {
      setReady(false);
      const t = setTimeout(() => { setReady(true); revealApp(); }, 600);
      return () => clearTimeout(t);
    }

    const cachedTheme = readCachedTheme(scope);
    const cachedGlass = readCachedGlass(scope);
    const cachedCtKey = readCachedCustomKey(scope);
    const cachedCtOv = readCachedCustomOverrides(scope);

    const initialTheme: Theme = cachedTheme ?? 'dark';
    applyTheme(initialTheme);
    setThemeState(initialTheme);
    setGlassConfigState(cachedGlass ?? DEFAULT_GLASS_CONFIG);
    setCustomThemeKeyState(cachedCtKey);
    setCustomThemeOverridesState(cachedCtOv);
    setReady(true);
    revealApp();

    let cancelled = false;
    loadScopeData(scope).then(slice => {
      if (cancelled || !slice) return;
      if (isValidTheme(slice.theme) && slice.theme !== initialTheme) {
        setThemeState(slice.theme);
        applyTheme(slice.theme);
      }
      if (slice.glass_config) {
        setGlassConfigState({ ...DEFAULT_GLASS_CONFIG, ...slice.glass_config });
      }
      if (slice.custom_theme_key && slice.custom_theme_overrides) {
        setCustomThemeKeyState(slice.custom_theme_key);
        setCustomThemeOverridesState(slice.custom_theme_overrides);
      } else {
        setCustomThemeKeyState(null);
        setCustomThemeOverridesState(null);
      }
      writeCache(scope, {
        theme: isValidTheme(slice.theme) ? slice.theme : undefined,
        glass: slice.glass_config ? { ...DEFAULT_GLASS_CONFIG, ...slice.glass_config } : undefined,
        ctKey: slice.custom_theme_key ?? null,
        ctOverrides: slice.custom_theme_overrides ?? null,
      });
    }).catch(() => { /* ignore */ });

    return () => { cancelled = true; };
  }, [scopeId]);

  const persist = useCallback(async (partial: { theme?: Theme; glass_config?: GlassConfig; custom_theme_key?: string | null; custom_theme_overrides?: CustomThemeOverrides | null }) => {
    if (!isOwnAccount) return;
    if (scope.kind === 'none') return;
    const run = async () => {
      savingRef.current = true;
      try { await saveScopeData(scope, partial); } finally { savingRef.current = false; }
    };
    if (!savingRef.current) await run();
    else setTimeout(run, 300);
  }, [isOwnAccount, scope]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    setCustomThemeKeyState(null);
    setCustomThemeOverridesState(null);
    writeCache(scope, { theme: t, ctKey: null, ctOverrides: null });
    void persist({ theme: t, custom_theme_key: null, custom_theme_overrides: null });
  }, [scope, persist]);

  const applyCustomTheme = useCallback((ctKey: string, baseTheme: Theme, overrides: CustomThemeOverrides) => {
    setThemeState(baseTheme);
    applyTheme(baseTheme);
    setCustomThemeKeyState(ctKey);
    setCustomThemeOverridesState(overrides);
    writeCache(scope, { theme: baseTheme, ctKey, ctOverrides: overrides });
    void persist({ theme: baseTheme, custom_theme_key: ctKey, custom_theme_overrides: overrides });
  }, [scope, persist]);

  const clearCustomTheme = useCallback(() => {
    setCustomThemeKeyState(null);
    setCustomThemeOverridesState(null);
    writeCache(scope, { ctKey: null, ctOverrides: null });
    void persist({ custom_theme_key: null, custom_theme_overrides: null });
  }, [scope, persist]);

  const setGlassConfig = useCallback((config: GlassConfig) => {
    setGlassConfigState(config);
    writeCache(scope, { glass: config });
    void persist({ glass_config: config });
  }, [scope, persist]);

  if (!ready) {
    return <div className="min-h-screen" style={{ background: 'inherit' }} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, glassConfig, setGlassConfig, customThemeKey, customThemeOverrides, applyCustomTheme, clearCustomTheme }}>
      <div key={scopeId}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
