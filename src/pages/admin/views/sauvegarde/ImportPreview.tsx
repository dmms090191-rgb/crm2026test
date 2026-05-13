import { X, FileJson, Database, AlertTriangle, RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ImportedBackup } from './types';

export function ImportPreview({
  backup,
  onClear,
  tokens: t,
}: {
  backup: ImportedBackup;
  onClear: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const { metadata, data } = backup;
  const totalRows = Object.values(metadata.counts).reduce((sum, n) => sum + n, 0);

  const stats: { label: string; value: number | string }[] = [
    { label: 'Tables exportees', value: metadata.exported_tables.length },
    { label: 'Tables en erreur', value: metadata.failed_tables.length },
    { label: 'Leads', value: metadata.counts['leads'] ?? 0 },
    { label: 'Vendeurs', value: metadata.counts['vendors'] ?? 0 },
    { label: 'Messages client', value: metadata.counts['client_messages'] ?? 0 },
    { label: 'Messages vendeur/admin', value: metadata.counts['vendor_admin_messages'] ?? 0 },
    { label: 'Conversations', value: metadata.counts['conversations'] ?? 0 },
    { label: 'Commentaires', value: metadata.counts['vendor_comments'] ?? 0 },
    { label: 'RDV (agenda)', value: (data['messages'] ? (data['messages'] as unknown[]).length : metadata.counts['messages'] ?? 0) },
    { label: 'Propositions RDV', value: metadata.counts['rdv_proposals'] ?? 0 },
    { label: 'Statuts', value: metadata.counts['statuts'] ?? 0 },
    { label: 'Total lignes', value: totalRows },
  ];

  const exportDate = metadata.date_export
    ? new Date(metadata.date_export).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Inconnue';

  return (
    <div
      className="rounded-2xl overflow-hidden min-w-0"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: t.accent.bg, color: t.accent.solid }}
          >
            <FileJson className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
              Apercu du fichier JSON importe
            </h3>
            <p className="text-[11px]" style={{ color: t.text.tertiary }}>
              Source : fichier JSON selectionne — lecture seule
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: t.text.secondary }}>
              {backup.filename}
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 w-full sm:w-auto flex-shrink-0"
          style={{ background: t.surface.secondary, color: t.text.secondary }}
        >
          <X className="w-3.5 h-3.5" />
          Retirer
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
          <div>
            <span style={{ color: t.text.tertiary }}>Date d'export</span>
            <p className="font-medium mt-0.5" style={{ color: t.text.primary }}>{exportDate}</p>
          </div>
          <div>
            <span style={{ color: t.text.tertiary }}>Version CRM</span>
            <p className="font-medium mt-0.5" style={{ color: t.text.primary }}>{metadata.version_crm || '—'}</p>
          </div>
          <div>
            <span style={{ color: t.text.tertiary }}>Version schema</span>
            <p className="font-medium mt-0.5" style={{ color: t.text.primary }}>{metadata.version_schema || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-2.5"
              style={{ background: t.surface.secondary }}
            >
              <p className="text-xs" style={{ color: t.text.tertiary }}>{s.label}</p>
              <p className="text-base font-bold mt-0.5" style={{ color: t.text.primary }}>
                {typeof s.value === 'number' ? s.value.toLocaleString('fr-FR') : s.value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />
            <span className="text-xs font-medium" style={{ color: t.text.secondary }}>
              Tables presentes ({metadata.exported_tables.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metadata.exported_tables.map((table) => (
              <span
                key={table}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono"
                style={{ background: t.surface.secondary, color: t.text.secondary }}
              >
                {table}
              </span>
            ))}
          </div>
        </div>

        {metadata.failed_tables.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: t.warning.text }} />
              <span className="text-xs font-medium" style={{ color: t.warning.text }}>
                Tables en echec ({metadata.failed_tables.length})
              </span>
            </div>
            <div className="space-y-1">
              {metadata.failed_tables.map((ft) => (
                <div
                  key={ft.table}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-lg text-xs min-w-0"
                  style={{ background: t.warning.bg }}
                >
                  <span className="font-mono font-medium break-all" style={{ color: t.warning.text }}>{ft.table}</span>
                  <span className="break-words" style={{ color: t.text.tertiary }}>— {ft.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex items-start sm:items-center gap-2 rounded-lg px-3 sm:px-4 py-3 min-w-0"
          style={{ background: t.surface.tertiary, border: `1px dashed ${t.surface.borderLight}` }}
        >
          <RotateCcw className="w-4 h-4 flex-shrink-0" style={{ color: t.text.tertiary }} />
          <p className="text-xs break-words" style={{ color: t.text.tertiary }}>
            Restauration bientot disponible. L'apercu est en lecture seule.
          </p>
        </div>
      </div>
    </div>
  );
}
