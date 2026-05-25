import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { THEME_TABS, THEME_MAP, type ThemeTab, type ThemeEntry } from './themeData';

interface Props {
  open: boolean;
  onClose: () => void;
}

function ThemeCard({ entry, active, onSelect, tokens }: {
  entry: ThemeEntry;
  active: boolean;
  onSelect: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
      style={{
        background: active ? `${entry.colors[2]}12` : tokens.surface.hover,
        border: active ? `2px solid ${entry.colors[2]}` : `1px solid ${tokens.surface.border}`,
        boxShadow: active ? `0 0 20px ${entry.colors[2]}20` : 'none',
      }}
    >
      {active && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: entry.colors[2] }}
        >
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div
        className="w-full h-16 rounded-lg overflow-hidden flex items-end"
        style={{ background: `linear-gradient(135deg, ${entry.colors[0]} 0%, ${entry.colors[1]} 100%)` }}
      >
        <div className="flex gap-1 p-2 w-full">
          <div className="h-2 rounded-full flex-1" style={{ background: `${entry.colors[2]}60` }} />
          <div className="h-2 w-5 rounded-full" style={{ background: entry.colors[2] }} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-semibold" style={{ color: active ? entry.colors[2] : tokens.text.primary }}>
          {entry.label}
        </span>
        {active && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${entry.colors[2]}18`, color: entry.colors[2] }}
          >
            Actif
          </span>
        )}
      </div>
    </button>
  );
}

export default function ThemeSelectorModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<ThemeTab>('sombres');
  const { theme, setTheme } = useTheme();
  const tokens = useThemeTokens();

  if (!open) return null;

  const entries = THEME_MAP[tab];

  const findActiveTab = (): ThemeTab | null => {
    for (const [key, list] of Object.entries(THEME_MAP)) {
      if (list.some(e => e.value === theme)) return key as ThemeTab;
    }
    return null;
  };
  const activeTab = findActiveTab();

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[100000]"
      style={{ background: 'rgba(0,0,0,0.12)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-[fadeScaleIn_200ms_ease-out]"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: tokens.heading.primary }}>
              Choisir un theme
            </h2>
            <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary }}>
              Personnalise ton espace Talvex
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {THEME_TABS.map(t => {
            const isActive = tab === t.key;
            const hasCurrentTheme = t.key === activeTab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: isActive ? tokens.accent.bg : 'transparent',
                  border: isActive ? `1px solid ${tokens.accent.border}` : '1px solid transparent',
                  color: isActive ? tokens.accent.text : tokens.text.tertiary,
                }}
              >
                {t.label}
                {hasCurrentTheme && !isActive && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block" style={{ background: tokens.accent.text }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="px-6 pt-4 pb-6 max-h-[55vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entries.map(entry => (
              <ThemeCard
                key={entry.value}
                entry={entry}
                active={theme === entry.value}
                onSelect={() => setTheme(entry.value)}
                tokens={tokens}
              />
            ))}
          </div>
          {entries.length === 0 && (
            <p className="text-center text-xs py-8" style={{ color: tokens.text.quaternary }}>
              Aucun theme disponible dans cette categorie
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
