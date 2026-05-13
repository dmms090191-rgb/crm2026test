import { X, Database, AlertTriangle, Info, Users, MessageCircle, Calendar, Tag, FileText, Layers } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ExportSnapshot } from './useExportCrm';

interface ExportPreviewProps {
  snapshot: ExportSnapshot;
  onClear: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}

interface TableGroup {
  label: string;
  tables: { name: string; count: number }[];
}

export function ExportPreview({ snapshot, onClear, tokens: t }: ExportPreviewProps) {
  const { counts, exportedTables, failedTables, totalRows } = snapshot;

  const exportDate = new Date(snapshot.date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const messageTotal =
    (counts['client_messages'] ?? 0) +
    (counts['vendor_admin_messages'] ?? 0) +
    (counts['messages'] ?? 0);

  const leadsCount = counts['leads'] ?? 0;
  const hasOrphanWarning = messageTotal > 0 && leadsCount === 0;

  const mainStats: StatCard[] = [
    { label: 'Leads', value: counts['leads'] ?? 0, icon: <Users className="w-4 h-4" />, accent: '#3b82f6' },
    { label: 'Vendeurs', value: counts['vendors'] ?? 0, icon: <Users className="w-4 h-4" />, accent: '#10b981' },
    { label: 'Messages', value: messageTotal, icon: <MessageCircle className="w-4 h-4" />, accent: '#f59e0b' },
    { label: 'RDV / propositions', value: counts['rdv_proposals'] ?? 0, icon: <Calendar className="w-4 h-4" />, accent: '#8b5cf6' },
    { label: 'Commentaires', value: counts['vendor_comments'] ?? 0, icon: <MessageCircle className="w-4 h-4" />, accent: '#06b6d4' },
    { label: 'Statuts', value: counts['statuts'] ?? 0, icon: <Tag className="w-4 h-4" />, accent: '#ec4899' },
    { label: 'Ameliorations', value: (counts['crm_ameliorations'] ?? 0) + (counts['crm_amelioration_categories'] ?? 0), icon: <Layers className="w-4 h-4" />, accent: '#14b8a6' },
    { label: 'Notes', value: counts['crm_notes'] ?? 0, icon: <FileText className="w-4 h-4" />, accent: '#64748b' },
    { label: 'Taches', value: (counts['crm_tasks'] ?? 0) + (counts['crm_page_checklist_items'] ?? 0), icon: <FileText className="w-4 h-4" />, accent: '#f97316' },
    { label: 'Tables exportees', value: exportedTables.length, icon: <Database className="w-4 h-4" />, accent: '#6366f1' },
    { label: 'Total lignes', value: totalRows, icon: <Layers className="w-4 h-4" />, accent: '#0ea5e9' },
  ];

  const tableGroups: TableGroup[] = [
    {
      label: 'Core CRM',
      tables: ['leads', 'vendors', 'statuts', 'registrations', 'registration_requests', 'import_history', 'rdv_proposals']
        .filter(n => exportedTables.includes(n))
        .map(n => ({ name: n, count: counts[n] ?? 0 })),
    },
    {
      label: 'Chat',
      tables: ['conversations', 'messages', 'client_messages', 'vendor_admin_messages', 'vendor_comments']
        .filter(n => exportedTables.includes(n))
        .map(n => ({ name: n, count: counts[n] ?? 0 })),
    },
    {
      label: 'Documentation interne',
      tables: ['crm_documentation', 'crm_context_cards', 'crm_ideas', 'crm_notes', 'crm_tasks', 'crm_page_checklist_items', 'content_blocks', 'content_block_infos', 'content_block_tasks', 'doc_tab_labels', 'sidebar_order']
        .filter(n => exportedTables.includes(n))
        .map(n => ({ name: n, count: counts[n] ?? 0 })),
    },
    {
      label: 'Ameliorations',
      tables: ['crm_amelioration_categories', 'crm_ameliorations']
        .filter(n => exportedTables.includes(n))
        .map(n => ({ name: n, count: counts[n] ?? 0 })),
    },
    {
      label: 'Autres',
      tables: ['user_preferences', 'audit_history', 'crm_discovered_tables', 'crm_custom_pages']
        .filter(n => exportedTables.includes(n))
        .map(n => ({ name: n, count: counts[n] ?? 0 })),
    },
  ].filter(g => g.tables.length > 0);

  return (
    <div
      className="rounded-2xl overflow-hidden min-w-0"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
          >
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
              Apercu de l'export CRM
            </h3>
            <p className="text-[11px]" style={{ color: t.text.tertiary }}>
              Source : CRM actuel / Supabase — genere a l'instant de l'export
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 w-full sm:w-auto flex-shrink-0"
          style={{ background: t.surface.secondary, color: t.text.secondary }}
        >
          <X className="w-3.5 h-3.5" />
          Fermer
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span style={{ color: t.text.tertiary }}>Date de l'export</span>
            <p className="font-medium mt-0.5" style={{ color: t.text.primary }}>{exportDate}</p>
          </div>
          <div>
            <span style={{ color: t.text.tertiary }}>Source</span>
            <p className="font-medium mt-0.5" style={{ color: t.text.primary }}>CRM actuel / Supabase</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {mainStats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
              style={{ background: t.surface.secondary }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ color: s.accent }}>{s.icon}</span>
                <span className="text-[11px]" style={{ color: t.text.tertiary }}>{s.label}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: t.text.primary }}>
                {s.value.toLocaleString('fr-FR')}
              </p>
            </div>
          ))}
        </div>

        {/* Detail messages */}
        <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: t.surface.secondary }}>
          <p className="text-xs font-medium" style={{ color: t.text.secondary }}>
            Detail des messages
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] break-all" style={{ color: t.text.tertiary }}>client_messages</span>
              <p className="font-bold mt-0.5" style={{ color: t.text.primary }}>{(counts['client_messages'] ?? 0).toLocaleString('fr-FR')}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] break-all" style={{ color: t.text.tertiary }}>vendor_admin_messages</span>
              <p className="font-bold mt-0.5" style={{ color: t.text.primary }}>{(counts['vendor_admin_messages'] ?? 0).toLocaleString('fr-FR')}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px]" style={{ color: t.text.tertiary }}>messages</span>
              <p className="font-bold mt-0.5" style={{ color: t.text.primary }}>{(counts['messages'] ?? 0).toLocaleString('fr-FR')}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px]" style={{ color: t.text.tertiary }}>conversations</span>
              <p className="font-bold mt-0.5" style={{ color: t.text.primary }}>{(counts['conversations'] ?? 0).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {hasOrphanWarning && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}` }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.warning.text }} />
            <p className="text-xs" style={{ color: t.warning.text }}>
              Attention : des messages existent encore dans les tables de chat alors qu'il n'y a aucun lead.
              Ils seront exportes car ils sont presents dans le CRM actuel.
            </p>
          </div>
        )}

        {!hasOrphanWarning && (counts['client_messages'] ?? 0) > 0 && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.text.tertiary }} />
            <p className="text-xs" style={{ color: t.text.secondary }}>
              Ces messages existent reellement dans Supabase. Ils seront exportes tant qu'ils ne sont pas supprimes definitivement.
            </p>
          </div>
        )}

        {/* Table groups detail */}
        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: t.text.secondary }}>
            Detail par groupe
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tableGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-xl px-3 py-2.5 space-y-1.5"
                style={{ background: t.surface.secondary }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.text.tertiary }}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.tables.map(({ name, count }) => (
                    <div key={name} className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <span className="font-mono text-[10px] sm:text-[11px] break-all min-w-0" style={{ color: t.text.secondary }}>{name}</span>
                      <span className="font-semibold flex-shrink-0" style={{ color: count > 0 ? t.text.primary : t.text.quaternary }}>
                        {count.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {failedTables.length > 0 && (
          <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: t.danger.text }} />
              <span className="text-xs font-medium" style={{ color: t.danger.text }}>
                Tables en echec ({failedTables.length})
              </span>
            </div>
            {failedTables.map((ft) => (
              <div key={ft.table} className="text-xs" style={{ color: t.danger.text }}>
                <span className="font-mono">{ft.table}</span> — {ft.error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
