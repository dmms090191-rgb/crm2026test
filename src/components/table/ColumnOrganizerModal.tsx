import { useState, useMemo, useCallback } from 'react';
import { X, Columns3, RotateCcw, Monitor, Smartphone } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { ColumnDef } from './useColumnOrder';
import type { CustomColumnInput, ColumnModalConfig } from './columnModalTypes';
import type { MobileColumnEntry, MobileCardStyle, MobileColumnConfig } from './mobileColumnTypes';
import TabColumns from './TabColumns';
import TabSmartphone from './TabSmartphone';

type ModalTab = 'desktop' | 'smartphone';

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
}

const TAB_ITEMS: { id: ModalTab; label: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Colonnes desktop', icon: Monitor },
  { id: 'smartphone', label: 'Colonnes smartphone', icon: Smartphone },
];

export default function ColumnOrganizerModal({
  columns,
  orderedKeys,
  hiddenDesktopKeys,
  tableKey,
  onSave,
  onClose,
  onCreateCustomColumn,
  onDeleteCustomColumn,
  onRenameCustomColumn,
  onRenameLabel,
  mobileOrder,
  mobileCardStyle,
  onSaveMobile,
  onResetMobile,
}: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<ModalTab>('desktop');
  const [resetKey, setResetKey] = useState(0);

  const defaultColumnOrder = useMemo(() => columns.map(c => c.key), [columns]);

  const handleResetDesktop = useCallback(() => {
    onSave({ order: defaultColumnOrder, hiddenDesktop: [] });
    setResetKey(k => k + 1);
  }, [onSave, defaultColumnOrder]);

  const handleResetMobile = useCallback(() => {
    onResetMobile();
    setResetKey(k => k + 1);
  }, [onResetMobile]);

  const isDesktopDefault = useMemo(() => {
    if (JSON.stringify(orderedKeys) !== JSON.stringify(defaultColumnOrder)) return false;
    if (hiddenDesktopKeys.length !== 0) return false;
    return true;
  }, [orderedKeys, defaultColumnOrder, hiddenDesktopKeys]);

  const handleCreateColumn = useCallback(async (col: CustomColumnInput) => {
    if (!onCreateCustomColumn) return;
    await onCreateCustomColumn(col);
  }, [onCreateCustomColumn]);

  const handleDeleteColumn = useCallback(async (key: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.isCustom && onDeleteCustomColumn) {
      await onDeleteCustomColumn(key);
    }
  }, [columns, onDeleteCustomColumn]);

  const handleRenameColumn = useCallback(async (key: string, newLabel: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.isCustom && onRenameCustomColumn) {
      await onRenameCustomColumn(key, newLabel);
    } else if (onRenameLabel) {
      onRenameLabel(key, newLabel);
    }
  }, [columns, onRenameCustomColumn, onRenameLabel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-3 py-4 md:px-6 md:py-8"
      style={{ background: t.modal.overlayBg, backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-[1050px] rounded-2xl overflow-hidden flex flex-col"
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}
            onMouseEnter={e => { e.currentTarget.style.background = t.modal.closeBtnHoverBg; e.currentTarget.style.color = t.modal.closeBtnHoverText; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.modal.closeBtnBg; e.currentTarget.style.color = t.modal.closeBtnText; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 md:px-6 pt-3 pb-0 flex-shrink-0">
          {TAB_ITEMS.map(tab => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-semibold transition-all relative"
                style={{
                  background: active ? t.accent.bg : 'transparent',
                  color: active ? t.accent.text : t.text.tertiary,
                  borderBottom: active ? `2px solid ${t.accent.text}` : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.surface.secondary; e.currentTarget.style.color = t.text.secondary; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.text.tertiary; } }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'desktop' ? 'Desktop' : 'Mobile'}</span>
              </button>
            );
          })}
        </div>
        <div className="mx-5 md:mx-6" style={{ borderBottom: `1px solid ${t.surface.border}` }} />

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
          {activeTab === 'desktop' && (
            <TabColumns
              key={resetKey}
              columns={columns}
              initialOrder={orderedKeys}
              initialHidden={hiddenDesktopKeys}
              onCreate={onCreateCustomColumn ? handleCreateColumn : undefined}
              onDelete={onDeleteCustomColumn ? handleDeleteColumn : undefined}
              onRename={handleRenameColumn}
              onSave={onSave}
              t={t}
            />
          )}
          {activeTab === 'smartphone' && (
            <TabSmartphone
              key={resetKey}
              columns={columns}
              initialOrder={mobileOrder}
              initialCardStyle={mobileCardStyle}
              onSave={onSaveMobile}
              tableKey={tableKey}
              t={t}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 flex-shrink-0 gap-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button
            onClick={activeTab === 'desktop' ? handleResetDesktop : handleResetMobile}
            disabled={activeTab === 'desktop' && isDesktopDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >
            <RotateCcw className="w-3 h-3" />
            Reinitialiser
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
