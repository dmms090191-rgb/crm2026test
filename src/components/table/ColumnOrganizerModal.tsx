import { useState, useMemo, useCallback } from 'react';
import { X, Columns3, RotateCcw, Monitor, Smartphone, Users, Check, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { ColumnDef } from './useColumnOrder';
import type { CustomColumnInput, ColumnModalConfig } from './columnModalTypes';
import type { MobileColumnEntry, MobileCardStyle, MobileColumnConfig } from './mobileColumnTypes';
import TabColumns from './TabColumns';
import TabSmartphone from './TabSmartphone';
import TabVendorColumns from './TabVendorColumns';
import type { VendorColumnConfig } from './TabVendorColumns';

type ModalTab = 'desktop' | 'vendors' | 'smartphone';

interface VendorTabConfig {
  columns: ColumnDef[];
  order: string[];
  hidden: string[];
  onSave: (config: VendorColumnConfig) => void;
}

interface Props {
  columns: ColumnDef[];
  orderedKeys: string[];
  hiddenDesktopKeys: string[];
  tableKey: string;
  onSave: (config: ColumnModalConfig) => void;
  onReset: () => void;
  onClose: () => void;
  onCreateCustomColumn?: (col: CustomColumnInput) => Promise<void>;
  onDeleteCustomColumn?: (key: string) => Promise<void>;
  onRenameCustomColumn?: (key: string, newLabel: string) => Promise<void>;
  onRenameLabel?: (key: string, newLabel: string) => void;
  mobileOrder: MobileColumnEntry[];
  mobileCardStyle: MobileCardStyle;
  onSaveMobile: (config: MobileColumnConfig) => void;
  onResetMobile: () => void;
  vendorTab?: VendorTabConfig;
}

const TAB_BASE: { id: ModalTab; label: string; shortLabel: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Colonnes desktop', shortLabel: 'Desktop', icon: Monitor },
  { id: 'vendors', label: 'Colonnes vendeurs', shortLabel: 'Vendeurs', icon: Users },
  { id: 'smartphone', label: 'Colonnes smartphone', shortLabel: 'Mobile', icon: Smartphone },
];

export default function ColumnOrganizerModal({
  columns, orderedKeys, hiddenDesktopKeys, tableKey,
  onSave, onClose, onCreateCustomColumn, onDeleteCustomColumn, onRenameCustomColumn, onRenameLabel,
  mobileOrder, mobileCardStyle, onSaveMobile, onResetMobile,
  vendorTab,
}: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<ModalTab>('desktop');
  const [resetKey, setResetKey] = useState(0);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const tabs = useMemo(() => vendorTab ? TAB_BASE : TAB_BASE.filter(t => t.id !== 'vendors'), [vendorTab]);

  const defaultColumnOrder = useMemo(() => columns.map(c => c.key), [columns]);

  const handleResetDesktop = useCallback(() => {
    onSave({ order: defaultColumnOrder, hiddenDesktop: [] });
    setResetKey(k => k + 1);
  }, [onSave, defaultColumnOrder]);

  const handleResetMobile = useCallback(() => {
    onResetMobile();
    setResetKey(k => k + 1);
  }, [onResetMobile]);

  const handleResetVendor = useCallback(() => {
    if (!vendorTab) return;
    const defaultOrder = vendorTab.columns.map(c => c.key);
    vendorTab.onSave({ order: defaultOrder, hidden: [] });
    setResetKey(k => k + 1);
  }, [vendorTab]);

  const isDesktopDefault = useMemo(() => {
    if (JSON.stringify(orderedKeys) !== JSON.stringify(defaultColumnOrder)) return false;
    return hiddenDesktopKeys.length === 0;
  }, [orderedKeys, defaultColumnOrder, hiddenDesktopKeys]);

  const handleCreateColumn = useCallback(async (col: CustomColumnInput) => {
    if (!onCreateCustomColumn) return;
    await onCreateCustomColumn(col);
  }, [onCreateCustomColumn]);

  const handleDeleteColumn = useCallback(async (key: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.isCustom && onDeleteCustomColumn) await onDeleteCustomColumn(key);
  }, [columns, onDeleteCustomColumn]);

  const handleRenameColumn = useCallback(async (key: string, newLabel: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.isCustom && onRenameCustomColumn) await onRenameCustomColumn(key, newLabel);
    else if (onRenameLabel) onRenameLabel(key, newLabel);
  }, [columns, onRenameCustomColumn, onRenameLabel]);

  const ADMIN_ONLY_KEYS = useMemo(() => new Set(['ia', 'vendeur']), []);

  const handleApplyToVendors = useCallback(async () => {
    if (!vendorTab) return;
    setApplyLoading(true);
    try {
      const vendorOrder = orderedKeys.filter(k => !ADMIN_ONLY_KEYS.has(k));
      const vendorHidden = hiddenDesktopKeys.filter(k => !ADMIN_ONLY_KEYS.has(k));
      vendorTab.onSave({ order: vendorOrder, hidden: vendorHidden });
      setApplySuccess(true);
      setShowApplyConfirm(false);
      setResetKey(k => k + 1);
      setTimeout(() => setApplySuccess(false), 3000);
    } finally {
      setApplyLoading(false);
    }
  }, [vendorTab, orderedKeys, hiddenDesktopKeys, ADMIN_ONLY_KEYS]);

  const handleReset = useCallback(() => {
    if (activeTab === 'desktop') handleResetDesktop();
    else if (activeTab === 'smartphone') handleResetMobile();
    else if (activeTab === 'vendors') handleResetVendor();
  }, [activeTab, handleResetDesktop, handleResetMobile, handleResetVendor]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-3 py-4 md:px-6 md:py-8"
      style={{ background: t.modal.overlayBg, backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-[1050px] rounded-2xl overflow-hidden flex flex-col relative"
        style={{ height: '85vh', maxHeight: '85vh', background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <Columns3 className="w-5 h-5" style={{ color: t.accent.text }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: t.modal.title }}>Personnaliser les colonnes</p>
              <p className="text-[11px] mt-0.5" style={{ color: t.text.tertiary }}>Organise l'affichage de tes tableaux et cartes</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}
            onMouseEnter={e => { e.currentTarget.style.background = t.modal.closeBtnHoverBg; e.currentTarget.style.color = t.modal.closeBtnHoverText; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.modal.closeBtnBg; e.currentTarget.style.color = t.modal.closeBtnText; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 md:px-6 pt-3 pb-0 flex-shrink-0 overflow-x-auto">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-semibold transition-all relative whitespace-nowrap"
                style={{ background: active ? t.accent.bg : 'transparent', color: active ? t.accent.text : t.text.tertiary, borderBottom: active ? `2px solid ${t.accent.text}` : '2px solid transparent' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.surface.secondary; e.currentTarget.style.color = t.text.secondary; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.text.tertiary; } }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <div className="mx-5 md:mx-6" style={{ borderBottom: `1px solid ${t.surface.border}` }} />

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
          {activeTab === 'desktop' && (
            <TabColumns key={resetKey} columns={columns} initialOrder={orderedKeys} initialHidden={hiddenDesktopKeys}
              onCreate={onCreateCustomColumn ? handleCreateColumn : undefined}
              onDelete={onDeleteCustomColumn ? handleDeleteColumn : undefined}
              onRename={handleRenameColumn} onSave={onSave} t={t} />
          )}
          {activeTab === 'vendors' && vendorTab && (
            <TabVendorColumns key={resetKey} vendorColumns={vendorTab.columns}
              initialOrder={vendorTab.order} initialHidden={vendorTab.hidden}
              onSave={vendorTab.onSave} t={t} />
          )}
          {activeTab === 'smartphone' && (
            <TabSmartphone key={resetKey} columns={columns} initialOrder={mobileOrder} initialCardStyle={mobileCardStyle}
              onSave={onSaveMobile} tableKey={tableKey} t={t} />
          )}
        </div>

        {/* Success toast */}
        {applySuccess && (
          <div className="mx-5 md:mx-6 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            Les colonnes des vendeurs ont ete synchronisees avec l'ordre du CRM Admin.
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 flex-shrink-0 gap-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleReset}
              disabled={activeTab === 'desktop' && isDesktopDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
              style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
            >
              <RotateCcw className="w-3 h-3" />Reinitialiser
            </button>
            {vendorTab && activeTab === 'desktop' && (
              <button onClick={() => setShowApplyConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9' }}
              >
                <Users className="w-3.5 h-3.5" />Appliquer aux vendeurs
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >Fermer</button>
        </div>

        {/* Apply to vendors confirm overlay */}
        {showApplyConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-sm mx-4 rounded-xl p-5" style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <p className="text-sm font-bold mb-2" style={{ color: t.heading.primary }}>Appliquer aux vendeurs</p>
              <p className="text-xs leading-relaxed mb-5" style={{ color: t.text.secondary }}>
                Voulez-vous appliquer l'ordre actuel des colonnes CRM desktop a tous les vendeurs de cette societe ?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowApplyConfirm(false)} disabled={applyLoading}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
                >Annuler</button>
                <button onClick={handleApplyToVendors} disabled={applyLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: '#0ea5e9', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}
                >
                  {applyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  Appliquer aux vendeurs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
