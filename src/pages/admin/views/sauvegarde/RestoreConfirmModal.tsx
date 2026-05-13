import { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Database, FlaskConical } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { RESTORE_ORDER } from './restoreConstants';
import type { ImportedBackup } from './types';

const CONFIRMATION_WORD = 'RESTAURER';

export function RestoreConfirmModal({
  backup,
  onClose,
  onConfirm,
  onSimulate,
  tokens: t,
}: {
  backup: ImportedBackup;
  onClose: () => void;
  onConfirm: () => void;
  onSimulate: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const [inputValue, setInputValue] = useState('');
  const { metadata } = backup;
  const totalRows = Object.values(metadata.counts).reduce((sum, n) => sum + n, 0);
  const isConfirmed = inputValue === CONFIRMATION_WORD;

  const summaryItems = [
    { label: 'Tables', value: metadata.exported_tables.length },
    { label: 'Total lignes', value: totalRows },
    { label: 'Leads', value: metadata.counts['leads'] ?? 0 },
    { label: 'Vendeurs', value: metadata.counts['vendors'] ?? 0 },
    { label: 'Messages', value: (metadata.counts['client_messages'] ?? 0) + (metadata.counts['vendor_admin_messages'] ?? 0) + (metadata.counts['messages'] ?? 0) },
    { label: 'Statuts', value: metadata.counts['statuts'] ?? 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: t.modal.overlayBg }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
      >
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4"
          style={{ borderBottom: `1px solid ${t.surface.border}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: t.danger.bg, color: t.danger.text }}
            >
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold" style={{ color: t.text.primary }}>
              Confirmer la restauration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: t.text.tertiary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: t.danger.text }} />
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={{ color: t.danger.text }}>
                Action irreversible — modification de la base de donnees
              </p>
              <p className="text-xs leading-relaxed" style={{ color: t.danger.text }}>
                La restauration va inserer/mettre a jour les donnees dans les tables existantes.
                La structure de la base (tables, colonnes, policies, triggers) ne sera pas modifiee.
                Seul le contenu est restaure via upsert.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2" style={{ color: t.text.secondary }}>
              Fichier : {backup.filename}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg px-3 py-2"
                  style={{ background: t.surface.secondary }}
                >
                  <p className="text-[11px]" style={{ color: t.text.tertiary }}>{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: t.text.primary }}>
                    {item.value.toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />
              <span className="text-xs font-medium" style={{ color: t.text.secondary }}>
                Ordre de restauration prevu
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {RESTORE_ORDER.filter((table) => metadata.exported_tables.includes(table)).map((table, i) => (
                <span
                  key={table}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: t.surface.secondary, color: t.text.tertiary }}
                >
                  {i + 1}. {table}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs" style={{ color: t.text.primary }}>
              Pour confirmer, ecrivez <span className="font-bold font-mono" style={{ color: t.danger.text }}>{CONFIRMATION_WORD}</span> dans le champ ci-dessous :
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={CONFIRMATION_WORD}
              spellCheck={false}
              autoComplete="off"
              className="w-full px-4 py-2.5 rounded-lg text-sm font-mono tracking-wider outline-none transition-all"
              style={{
                background: t.surface.secondary,
                border: `2px solid ${isConfirmed ? t.success.border : inputValue.length > 0 ? t.danger.border : t.surface.border}`,
                color: t.text.primary,
              }}
            />
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-6 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.surface.border}` }}
        >
          <button
            onClick={onSimulate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: t.accent.bg, color: t.accent.solid, border: `1px solid ${t.accent.solid}` }}
          >
            <FlaskConical className="w-4 h-4" />
            Simuler la restauration
          </button>
          <div className="flex items-center gap-3 sm:ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ background: t.surface.secondary, color: t.text.secondary }}
            >
              Annuler
            </button>
            <button
              disabled={!isConfirmed}
              onClick={onConfirm}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isConfirmed ? t.danger.text : t.surface.secondary,
                color: isConfirmed ? '#ffffff' : t.text.tertiary,
                cursor: isConfirmed ? 'pointer' : 'not-allowed',
                opacity: isConfirmed ? 1 : 0.6,
              }}
            >
              Confirmer la restauration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
