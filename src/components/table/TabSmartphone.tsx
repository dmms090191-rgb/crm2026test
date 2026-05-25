import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, Lock,
  Sparkles, Wand2,
} from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';
import type { ColumnDef } from './useColumnOrder';
import type { MobileColumnEntry, MobileCardStyle, MobileColumnConfig } from './mobileColumnTypes';
import { autoLayoutMobile } from './mobileColumnTypes';
import SmartphonePreview from './SmartphonePreview';

interface Props {
  columns: ColumnDef[];
  initialOrder: MobileColumnEntry[];
  initialCardStyle: MobileCardStyle;
  onSave: (config: MobileColumnConfig) => void;
  tableKey: string;
  t: ThemeTokens;
}

const STYLE_OPTIONS: { value: MobileCardStyle; label: string; desc: string }[] = [
  { value: 'compact', label: 'Compact', desc: 'Peu de champs, carte petite' },
  { value: 'comfort', label: 'Confort', desc: 'Affichage equilibre' },
  { value: 'detailed', label: 'Detaille', desc: 'Plus d\'infos visibles' },
];

const ROW_H = 'min-h-[48px]';

export default function TabSmartphone({ columns, initialOrder, initialCardStyle, onSave, tableKey, t }: Props) {
  const [entries, setEntries] = useState<MobileColumnEntry[]>(() => [...initialOrder]);
  const [cardStyle, setCardStyle] = useState<MobileCardStyle>(initialCardStyle);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);

  const colMap = useMemo(() => new Map(columns.map(c => [c.key, c])), [columns]);

  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    saveRef.current({ order: entries, cardStyle });
  }, [entries, cardStyle]);

  useEffect(() => {
    const allKeys = columns.map(c => c.key);
    const fieldTypes = new Map(columns.map(c => [c.key, c.fieldType]));
    setEntries(prev => {
      const existingKeys = new Set(prev.map(e => e.key));
      const newKeys = allKeys.filter(k => !existingKeys.has(k));
      if (newKeys.length > 0) {
        const autoNew = autoLayoutMobile(newKeys, fieldTypes);
        return [...prev.filter(e => allKeys.includes(e.key)), ...autoNew];
      }
      const filtered = prev.filter(e => allKeys.includes(e.key));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [columns]);

  const visibleCount = entries.filter(e => e.role === 'visible').length;
  const hiddenCount = entries.length - visibleCount;

  const moveUp = useCallback((key: string) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((key: string) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.key === key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const toggleVisibility = useCallback((key: string) => {
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, role: e.role === 'visible' ? 'hidden' : 'visible' } : e
    ));
  }, []);

  const handleAutoLayout = useCallback(() => {
    const allKeys = columns.map(c => c.key);
    const fieldTypes = new Map(columns.map(c => [c.key, c.fieldType]));
    const fresh = autoLayoutMobile(allKeys, fieldTypes);
    setEntries(fresh);
    setCardStyle('comfort');
    setShowAutoConfirm(false);
  }, [columns]);

  const renderRow = (entry: MobileColumnEntry, idx: number) => {
    const col = colMap.get(entry.key);
    if (!col) return null;
    const isRequired = !!col.required;
    const isHidden = entry.role === 'hidden';

    return (
      <div
        key={entry.key}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-150 group ${ROW_H}`}
        style={{
          background: t.surface.primary,
          border: `1px solid ${t.surface.border}`,
          opacity: isHidden ? 0.45 : 1,
        }}
      >
        {/* Grip + index + label */}
        <GripVertical className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: t.text.tertiary }} />
        <span className="text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
          {idx + 1}
        </span>
        <span className="text-xs font-semibold truncate min-w-0 flex-1" style={{ color: isHidden ? t.text.tertiary : t.text.primary }}>
          {col.label}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isRequired && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <Lock className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Protegee</span>
            </span>
          )}
          {col.isCustom && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
              <Sparkles className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Perso</span>
            </span>
          )}
        </div>

        {/* Visible / Masque toggle */}
        <button
          onClick={() => toggleVisibility(entry.key)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0"
          style={isHidden ? {
            background: 'rgba(156,163,175,0.08)',
            color: '#9ca3af',
            border: '1px solid rgba(156,163,175,0.2)',
          } : {
            background: 'rgba(34,197,94,0.08)',
            color: '#16a34a',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span className="hidden sm:inline">{isHidden ? 'Masque' : 'Visible'}</span>
        </button>

        {/* Arrows */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => moveUp(entry.key)}
            disabled={idx === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
            style={{ color: t.text.secondary }}
            onMouseEnter={e => { if (idx > 0) e.currentTarget.style.background = t.surface.secondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title="Monter"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => moveDown(entry.key)}
            disabled={idx === entries.length - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
            style={{ color: t.text.secondary }}
            onMouseEnter={e => { if (idx < entries.length - 1) e.currentTarget.style.background = t.surface.secondary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title="Descendre"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[11px]" style={{ color: t.text.tertiary }}>
            Choisis les infos visibles sur smartphone et place-les dans l'ordre que tu veux.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <Eye className="w-2.5 h-2.5" />
              {visibleCount}
            </span>
            {hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
                <EyeOff className="w-2.5 h-2.5" />
                {hiddenCount}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAutoConfirm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Organisation automatique
        </button>
      </div>

      {/* Auto-confirm dialog */}
      {showAutoConfirm && (
        <div className="p-4 rounded-xl space-y-3" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
          <p className="text-xs font-semibold" style={{ color: t.accent.text }}>
            Cela va reorganiser automatiquement la carte smartphone. Vos colonnes ne seront pas supprimees.
          </p>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowAutoConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
            >
              Annuler
            </button>
            <button
              onClick={handleAutoLayout}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
            >
              Adapter automatiquement
            </button>
          </div>
        </div>
      )}

      {/* Help text */}
      <p className="text-[10px] italic" style={{ color: t.text.tertiary }}>
        Les premieres infos de la liste apparaissent en haut de la carte mobile.
      </p>

      {/* Card style selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Style de carte :</span>
        {STYLE_OPTIONS.map(opt => {
          const isActive = cardStyle === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setCardStyle(opt.value)}
              className="inline-flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all"
              style={{
                background: isActive ? t.accent.bg : t.surface.primary,
                border: `1px solid ${isActive ? t.accent.border : t.surface.border}`,
              }}
            >
              <span className="text-[11px] font-bold" style={{ color: isActive ? t.accent.text : t.text.primary }}>{opt.label}</span>
              <span className="text-[9px]" style={{ color: t.text.tertiary }}>{opt.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Column list */}
      <div className="space-y-1">
        {entries.map((entry, idx) => renderRow(entry, idx))}
        {entries.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: t.text.tertiary }}>Aucune colonne</p>
        )}
      </div>

      {/* Inline preview */}
      <SmartphonePreview columns={columns} mobileOrder={entries} cardStyle={cardStyle} tableKey={tableKey} t={t} />
    </div>
  );
}
