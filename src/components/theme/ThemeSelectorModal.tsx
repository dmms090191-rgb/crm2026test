import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Search, Paintbrush, Star, Share2 } from 'lucide-react';
import { useTheme, type Theme, type CustomThemeOverrides } from '../../contexts/ThemeContext';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { useVisualCustomizeSafe } from '../visualCustomize/VisualCustomizeContext';
import { type ThemeEntry } from './themeData';
import { ThemeCard } from './ThemeCard';
import GlassPresetsGrid from './GlassPresetsGrid';
import { CUSTOM_CATEGORY, FAV_TAB, PERSONAL_TAB, COMMUNITY_TAB, type CustomThemeRow } from './themeSelectorTypes';
import { SectionHeader, ModalHeader, TabBar, CustomThemeCard } from './ThemeSelectorParts';
import { useThemeSelectorData, useThemeSelectorFilters } from './useThemeSelectorData';

interface Props { open: boolean; onClose: () => void; effectiveUserId?: string | null; }

export default function ThemeSelectorModal({ open, onClose, effectiveUserId }: Props) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const { theme, setTheme, glassConfig, setGlassConfig, customThemeKey, applyCustomTheme, clearCustomTheme } = useTheme();
  const editorCtx = useEditorModeSafe();
  const vc = useVisualCustomizeSafe();

  const {
    configMap, customThemes, personalCustomThemes, sharedCustomThemes,
    userFavorites, toggleFavorite,
    visibleThemes, tabs, recommendedKeys, premiumKeys,
  } = useThemeSelectorData(open, effectiveUserId);

  const { entries, filteredCustomThemes, favoriteStandard, favoriteCustom, totalFavorites } =
    useThemeSelectorFilters(tab, search, visibleThemes, customThemes, configMap, userFavorites);

  const filteredPersonal = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return personalCustomThemes.filter(ct => ct.label.toLowerCase().includes(q));
    }
    if (tab === 'all' || tab === CUSTOM_CATEGORY || tab === PERSONAL_TAB || tab === FAV_TAB) return personalCustomThemes;
    return [];
  }, [tab, search, personalCustomThemes]);

  const filteredShared = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return sharedCustomThemes.filter(ct => ct.label.toLowerCase().includes(q));
    }
    if (tab === 'all' || tab === CUSTOM_CATEGORY || tab === COMMUNITY_TAB || tab === FAV_TAB) return sharedCustomThemes;
    return [];
  }, [tab, search, sharedCustomThemes]);

  const totalCount = visibleThemes.length + customThemes.length;

  if (!open) return null;

  function handleSelect(entry: ThemeEntry) {
    if (entry.isGlassCustom) return;
    editorCtx?.clearAllOverrides();
    vc?.clearAllConfigs();
    clearCustomTheme();
    setTheme(entry.value);
  }

  function handleSelectCustom(ct: CustomThemeRow) {
    applyCustomFromTokens(ct, editorCtx, vc, applyCustomTheme, clearCustomTheme);
  }

  const showFavoritesSection = tab === 'all' && totalFavorites > 0;
  const showPersonalSection = tab === 'all' || tab === CUSTOM_CATEGORY || tab === PERSONAL_TAB;
  const showCommunitySection = tab === 'all' || tab === CUSTOM_CATEGORY || tab === COMMUNITY_TAB;
  const showStandardSection = tab !== CUSTOM_CATEGORY && tab !== FAV_TAB && tab !== PERSONAL_TAB && tab !== COMMUNITY_TAB;
  const isFavTab = tab === FAV_TAB;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="ts-modal w-full sm:max-w-[1100px] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(165deg, #0c101c 0%, #0a0e1a 40%, #080c16 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
          maxHeight: 'min(94vh, 880px)', height: '94vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <ModalHeader search={search} onSearchChange={setSearch} onClose={onClose} themeCount={totalCount} />

        <TabBar
          tab={tab}
          onTab={t => { setTab(t); setSearch(''); }}
          activeTheme={theme}
          themes={visibleThemes}
          tabs={tabs}
          configMap={configMap}
          customThemeCount={customThemes.length}
          customThemeKey={customThemeKey}
          favCount={totalFavorites}
          userFavorites={userFavorites}
          personalCount={personalCustomThemes.length}
          communityCount={sharedCustomThemes.length}
        />

        <div className="mx-5 sm:mx-8 h-px flex-shrink-0 bg-white/[0.06]" />

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 pt-5 sm:pt-6 pb-8">
          {tab === 'glass' && !search.trim() ? (
            <GlassPresetsGrid
              currentGlassConfig={glassConfig}
              isGlassActive={theme === 'glass'}
              onApply={(config) => { editorCtx?.clearAllOverrides(); vc?.clearAllConfigs(); setGlassConfig(config); if (theme !== 'glass') { clearCustomTheme(); setTheme('glass'); } }}
            />
          ) : (
            <>
              {(showFavoritesSection || isFavTab) && (
                <>
                  <SectionHeader icon={<Star className="w-3.5 h-3.5" />} label="Favoris" count={totalFavorites} color="#f59e0b" />
                  {totalFavorites === 0 && isFavTab && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Star className="w-8 h-8 text-white/10" />
                      <p className="text-sm font-medium text-white/25">Aucun theme favori pour le moment</p>
                      <p className="text-[11px] text-white/15">Cliquez sur l'etoile d'un theme pour l'ajouter aux favoris</p>
                    </div>
                  )}
                  {totalFavorites > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                      {favoriteCustom.map(ct => (
                        <CustomThemeCard key={`fav-c-${ct.theme_key}`} ct={ct} active={customThemeKey === ct.theme_key} onSelect={() => handleSelectCustom(ct)} isFavorite onToggleFavorite={() => toggleFavorite(ct.theme_key)} />
                      ))}
                      {favoriteStandard.map(entry => (
                        <ThemeCard key={`fav-s-${entry.value}`} entry={entry} active={!customThemeKey && theme === entry.value} onSelect={() => handleSelect(entry)} isRecommended={recommendedKeys.has(entry.value)} isFavorite isPremium={premiumKeys.has(entry.value)} onToggleFavorite={() => toggleFavorite(entry.value)} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {!isFavTab && showPersonalSection && filteredPersonal.length > 0 && (
                <>
                  <SectionHeader icon={<Paintbrush className="w-3.5 h-3.5" />} label="Themes Personnels" count={filteredPersonal.length} color="#f59e0b" />
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {filteredPersonal.map(ct => (
                      <CustomThemeCard key={ct.theme_key} ct={ct} active={customThemeKey === ct.theme_key} onSelect={() => handleSelectCustom(ct)} isFavorite={userFavorites.has(ct.theme_key)} onToggleFavorite={() => toggleFavorite(ct.theme_key)} />
                    ))}
                  </div>
                </>
              )}

              {!isFavTab && showCommunitySection && filteredShared.length > 0 && (
                <>
                  <SectionHeader icon={<Share2 className="w-3.5 h-3.5" />} label="Themes Communaute" count={filteredShared.length} color="#22d3ee" />
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {filteredShared.map(ct => (
                      <CustomThemeCard key={ct.theme_key} ct={ct} active={customThemeKey === ct.theme_key} onSelect={() => handleSelectCustom(ct)} isFavorite={userFavorites.has(ct.theme_key)} onToggleFavorite={() => toggleFavorite(ct.theme_key)} isShared />
                    ))}
                  </div>
                </>
              )}

              {!isFavTab && showStandardSection && (
                <>
                  {tab === 'all' && (
                    <SectionHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="Themes" count={entries.filter(e => !e.isGlassCustom).length} color="#3b82f6" />
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {entries.filter(e => !e.isGlassCustom || tab !== 'all').map(entry => (
                      <ThemeCard key={entry.value} entry={entry} active={!customThemeKey && theme === entry.value} onSelect={() => handleSelect(entry)} isRecommended={recommendedKeys.has(entry.value)} isFavorite={userFavorites.has(entry.value)} isPremium={premiumKeys.has(entry.value)} onToggleFavorite={() => toggleFavorite(entry.value)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {entries.length === 0 && filteredCustomThemes.length === 0 && !isFavTab && tab !== 'glass' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Search className="w-8 h-8 text-white/15" />
              <p className="text-sm font-medium text-white/30">Aucun theme trouve</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function applyCustomFromTokens(
  ct: CustomThemeRow,
  editorCtx: ReturnType<typeof useEditorModeSafe>,
  vc: ReturnType<typeof useVisualCustomizeSafe>,
  applyCustomTheme: (key: string, base: Theme, overrides: CustomThemeOverrides) => void,
  clearCustomTheme: () => void,
) {
  editorCtx?.clearAllOverrides();
  const baseTheme = (ct.created_from_theme || 'dark') as Theme;
  const tokens = ct.theme_tokens;
  const zoneOvr = (tokens?.zone_overrides ?? {}) as Record<string, { type: string; color?: string; opacity?: number; gradient?: { color1: string; color2: string; direction: number } }>;
  const bgImage = (tokens?.background_image as string) || null;
  const bgImageZoom = typeof tokens?.background_image_zoom === 'number' ? tokens.background_image_zoom : null;
  const bgImagePosX = typeof tokens?.background_image_position_x === 'number' ? tokens.background_image_position_x : null;
  const bgImagePosY = typeof tokens?.background_image_position_y === 'number' ? tokens.background_image_position_y : null;
  const bgImageFit = (tokens?.background_image_fit as 'cover' | 'contain' | 'fill') || null;
  const typo = (tokens?.typography_overrides as Record<string, string | null> | null) || null;
  const palette = (tokens?.panel_palette as { background: string; surface: string; accent: string } | null) || null;
  const btnOverrides = (tokens?.button_overrides as Record<string, { bg?: unknown; textColor?: string; opacityMode?: 'transparent' | 'opaque' }> | null) || null;
  const overrides: CustomThemeOverrides = {
    zone_overrides: zoneOvr as Record<string, unknown>,
    zone_css: (tokens?.zone_css ?? {}) as Record<string, string | null>,
    text_overrides: (tokens?.text_overrides ?? {}) as Record<string, string>,
    background_image: bgImage,
    typography_overrides: typo,
  };
  applyCustomTheme(ct.theme_key, baseTheme, overrides);
  if (editorCtx) {
    const zones = ['zone1', 'zone2', 'zone3', 'zone4'] as const;
    for (const z of zones) {
      const bg = zoneOvr[z];
      if (bg && bg.type) {
        editorCtx.applyZoneBackground(z, bg as import('../../contexts/editorModeTypes').ZoneBackground);
      }
    }
    const textOvr = (tokens?.text_overrides ?? {}) as Record<string, string>;
    Object.entries(textOvr).forEach(([k, v]) => {
      editorCtx.applyTextColor(k, v);
    });
  }
  if (bgImage) editorCtx?.setBackgroundImage(bgImage);
  if (bgImageZoom != null && editorCtx) editorCtx.setBackgroundImageZoom(bgImageZoom);
  if ((bgImagePosX != null || bgImagePosY != null) && editorCtx) {
    editorCtx.setBackgroundImagePosition(bgImagePosX ?? 0, bgImagePosY ?? 0);
  }
  if (bgImageFit && editorCtx) editorCtx.setBackgroundImageFit(bgImageFit);
  if (typo && editorCtx) {
    editorCtx.setTypographyPreview(typo);
    editorCtx.commitTypography();
  }
  if (editorCtx) {
    if (palette) {
      editorCtx.setPanelPalettePreview(palette);
      editorCtx.commitPanelPalette();
    } else {
      editorCtx.resetPanelPalette();
    }
    if (btnOverrides) {
      Object.entries(btnOverrides).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          if (v.bg) editorCtx.applyButtonBg(k, v.bg as import('../../contexts/editorModeTypes').ZoneBackground, v.opacityMode);
          if (v.textColor) editorCtx.applyButtonTextColor(k, v.textColor);
        }
      });
    }
    const cardOvr = (tokens?.card_overrides as Record<string, { bg?: unknown }> | null) || null;
    if (cardOvr) {
      Object.entries(cardOvr).forEach(([k, v]) => {
        if (v && typeof v === 'object' && v.bg) {
          editorCtx.applyCardBg(k, v.bg as import('../../contexts/editorModeTypes').ZoneBackground);
        }
      });
    }
  }
  const vcOvr = tokens?.vc_overrides as Record<string, { type: string; config: unknown }> | null;
  if (vc) {
    if (vcOvr && Object.keys(vcOvr).length > 0) {
      const typed = vcOvr as Parameters<typeof vc.replaceAllConfigs>[0];
      vc.replaceAllConfigs(typed);
    } else {
      vc.clearAllConfigs();
    }
  }
}
