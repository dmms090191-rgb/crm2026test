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
  /** Vrai seulement si le choix s'ecrit dans la preference personnelle de Talvex Administrateur (hors Visu d'une entreprise). */
  personalScope: boolean;
  applyCustomTheme: (key: string, baseTheme: Theme, overrides: CustomThemeOverrides) => void;
  clearCustomTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isSitePage() {
  return document.documentElement.classList.contains('site-page');
}

function applyTheme(t: Theme) {
  if (isSitePage()) return;
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
  /**
   * Vrai UNIQUEMENT sous un tableau de bord connecte (pose par AppShell). La landing publique ne le
   * pose jamais : en portee 'none' sans ce marqueur, tout data-theme residuel est retire de <html>
   * (la landing garde toujours son propre rendu, quel que soit le dernier theme utilise).
   */
  dashboardHost?: boolean;
  /**
   * L'identifiant du compte connecte, quand l'appelant le CONNAIT DEJA (App le lit dans la
   * session avant de rendre le tableau de bord, App.tsx:130). Il sert UNIQUEMENT a la valeur
   * initiale : getSession et onAuthStateChange, plus bas, restent la source qui suit la session.
   *
   * POURQUOI (diagnostic du 19/11/2026, journaux de production). Sans lui, ce fournisseur
   * n'apprenait l'identifiant que par getSession, qui attend le VERROU GLOBAL d'auth-js. Depuis
   * bdc81f0, App rend l'ecran puis lance refreshSession() sans l'attendre : ce rafraichissement
   * tient le verrou pendant tout son aller-retour (81 ms a 46 s mesures, dont un 504). Pendant
   * ce temps la portee valait 'none' : au bout de 600 ms le panel etait revele dans l'etat par
   * defaut 'dark', puis, le verrou libere, <div key={scopeId}> le DEMONTAIT et le REMONTAIT
   * (vue ramenee au Dashboard, lectures en double) avant d'appliquer le vrai theme.
   * Avec l'identifiant connu, la portee est juste des le premier rendu : le cache du theme est
   * applique avant la premiere peinture, et scopeId ne change plus quand la session repond.
   */
  knownUserId?: string | null;
}

export function ThemeProvider({ children, panelRole, effectiveUserId, companyId, dashboardHost = false, knownUserId = null }: ThemeProviderProps) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(knownUserId);
  const [jwtCompanyId, setJwtCompanyId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [glassConfig, setGlassConfigState] = useState<GlassConfig>(DEFAULT_GLASS_CONFIG);
  const [customThemeKey, setCustomThemeKeyState] = useState<string | null>(null);
  const [customThemeOverrides, setCustomThemeOverridesState] = useState<CustomThemeOverrides | null>(null);
  const [ready, setReady] = useState(false);
  /* Les ecritures du theme partent EN FILE : saveScopeData relit puis reecrit toute la carte, donc
     chacune doit voir la precedente. L'ancien delai de 300 ms ne les ordonnait pas : sous le
     verrou d'auth-js, deux ecritures (clearCustomTheme puis setTheme) partaient ensemble et la
     plus ANCIENNE pouvait arriver en dernier, ecrasant le choix en base. */
  const fileEcritures = useRef<Promise<void>>(Promise.resolve());
  /* Vrai des qu'un choix est fait dans CETTE portee (theme, theme personnalise, verre). La lecture
     lancee au montage peut attendre le verrou d'auth-js (jusqu'a 46 s le 19/11/2026) : si elle
     revient APRES ce choix, elle porte l'etat d'avant et ne doit ni le defaire ni le memoriser.
     La base reste l'autorite au montage suivant : l'ecriture du choix, mise en file
     (fileEcritures, ci-dessus), l'y aura rejointe si elle a reussi. */
  const modifieLocalement = useRef(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      /* Une session absente ne fait pas retomber l'identifiant connu : seule une vraie
         deconnexion (SIGNED_OUT, ci-dessous) le retire, et App demonte alors ce tableau de bord. */
      if (!session && knownUserId) return;
      setSessionUserId(session?.user.id ?? null);
      const meta = session?.user.app_metadata as { company_id?: string } | undefined;
      setJwtCompanyId(meta?.company_id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (!session && knownUserId && event !== 'SIGNED_OUT') return;
      setSessionUserId(session?.user.id ?? null);
      const meta = session?.user.app_metadata as { company_id?: string } | undefined;
      setJwtCompanyId(meta?.company_id ?? null);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [knownUserId]);

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
    modifieLocalement.current = false;
    if (scope.kind === 'none') {
      if (isSitePage()) {
        setReady(true);
        revealApp();
        return;
      }
      if (!dashboardHost) {
        // Montage public (landing) : on retire ce que l'anti-flash ou une session precedente a pose.
        document.documentElement.removeAttribute('data-theme');
        document.body.style.background = '#020617';
      }
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
      if (cancelled || !slice || modifieLocalement.current) return;
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
  }, [scopeId, dashboardHost]);

  const canPersist = isOwnAccount || scope.kind === 'company';

  const persist = useCallback(async (partial: { theme?: Theme; glass_config?: GlassConfig; custom_theme_key?: string | null; custom_theme_overrides?: CustomThemeOverrides | null }) => {
    if (!canPersist) return;
    if (scope.kind === 'none') return;
    const tache = fileEcritures.current.then(() => saveScopeData(scope, partial));
    fileEcritures.current = tache.catch(() => { /* une ecriture en echec ne bloque pas les suivantes */ });
    await tache;
  }, [canPersist, scope]);

  const setTheme = useCallback((t: Theme) => {
    modifieLocalement.current = true;
    setThemeState(t);
    applyTheme(t);
    setCustomThemeKeyState(null);
    setCustomThemeOverridesState(null);
    writeCache(scope, { theme: t, ctKey: null, ctOverrides: null });
    void persist({ theme: t, custom_theme_key: null, custom_theme_overrides: null });
  }, [scope, persist]);

  const applyCustomTheme = useCallback((ctKey: string, baseTheme: Theme, overrides: CustomThemeOverrides) => {
    modifieLocalement.current = true;
    setThemeState(baseTheme);
    applyTheme(baseTheme);
    setCustomThemeKeyState(ctKey);
    setCustomThemeOverridesState(overrides);
    writeCache(scope, { theme: baseTheme, ctKey, ctOverrides: overrides });
    void persist({ theme: baseTheme, custom_theme_key: ctKey, custom_theme_overrides: overrides });
  }, [scope, persist]);

  const clearCustomTheme = useCallback(() => {
    modifieLocalement.current = true;
    setCustomThemeKeyState(null);
    setCustomThemeOverridesState(null);
    writeCache(scope, { ctKey: null, ctOverrides: null });
    void persist({ custom_theme_key: null, custom_theme_overrides: null });
  }, [scope, persist]);

  const setGlassConfig = useCallback((config: GlassConfig) => {
    modifieLocalement.current = true;
    setGlassConfigState(config);
    writeCache(scope, { glass: config });
    void persist({ glass_config: config });
  }, [scope, persist]);

  if (!ready) {
    return <div className="min-h-screen" style={{ background: isSitePage() ? '#f8fafb' : 'inherit' }} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, glassConfig, setGlassConfig, customThemeKey, customThemeOverrides, personalScope: scope.kind === 'sa' && canPersist, applyCustomTheme, clearCustomTheme }}>
      <div key={scopeId}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
