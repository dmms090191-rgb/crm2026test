import { useState } from 'react';
import { Users, UserCheck, Palette, MessageSquare, Calendar, MessageCircle, Eye, Database, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { LeadsTab, VendeursTab, StatutsTab, MessagesTab, RdvTab, CommentairesTab } from './SimulationPreviewTabs';
import type { SimulationData } from '../../../../contexts/SimulationContext';

type Tab = 'leads' | 'vendeurs' | 'statuts' | 'messages' | 'rdv' | 'commentaires';

const TABS: { key: Tab; label: string; icon: typeof Users; tableKeys: string[] }[] = [
  { key: 'leads', label: 'Leads', icon: Users, tableKeys: ['leads'] },
  { key: 'vendeurs', label: 'Vendeurs', icon: UserCheck, tableKeys: ['vendors'] },
  { key: 'statuts', label: 'Statuts', icon: Palette, tableKeys: ['statuts'] },
  { key: 'messages', label: 'Messages', icon: MessageSquare, tableKeys: ['vendor_admin_messages', 'client_messages'] },
  { key: 'rdv', label: 'RDV', icon: Calendar, tableKeys: ['rdv_proposals'] },
  { key: 'commentaires', label: 'Commentaires', icon: MessageCircle, tableKeys: ['vendor_comments'] },
];

interface SimulationPreviewProps {
  data?: SimulationData | null;
}

export function SimulationPreview({ data }: SimulationPreviewProps) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<Tab>('leads');

  if (!data) return null;

  const currentTabDef = TABS.find((tab) => tab.key === activeTab)!;
  const rows = currentTabDef.tableKeys.flatMap(k => (data.tables[k] ?? []) as Record<string, unknown>[]);
  const totalRows = Object.values(data.tables).reduce((sum, arr) => sum + (arr as unknown[]).length, 0);

  const stats = [
    { label: 'Leads', value: ((data.tables['leads'] ?? []) as unknown[]).length, icon: Users },
    { label: 'Vendeurs', value: ((data.tables['vendors'] ?? []) as unknown[]).length, icon: UserCheck },
    { label: 'Messages', value: (((data.tables['vendor_admin_messages'] ?? []) as unknown[]).length + ((data.tables['client_messages'] ?? []) as unknown[]).length), icon: MessageSquare },
    { label: 'RDV', value: ((data.tables['rdv_proposals'] ?? []) as unknown[]).length, icon: Calendar },
    { label: 'Total', value: totalRows, icon: Database },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden min-w-0"
      style={{
        background: t.card.bg,
        border: `1px solid ${t.accent.border}`,
        boxShadow: t.card.shadow,
      }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-3 sm:py-4"
        style={{ borderBottom: `1px solid ${t.surface.border}`, background: t.surface.tertiary }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, boxShadow: `0 0 20px rgba(6,182,212,0.15)` }}
            >
              <Eye className="w-4 h-4" style={{ color: t.accent.text }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight" style={{ color: t.heading.primary }}>
                Apercu du fichier JSON importe
              </h3>
              <p className="text-[10px] sm:text-[11px] mt-0.5 truncate" style={{ color: t.text.tertiary }}>
                Source : fichier {data.filename} — {data.exportDate ? new Date(data.exportDate).toLocaleDateString('fr-FR') : ''}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full self-start sm:self-auto flex-shrink-0"
            style={{ background: t.success.bg, border: `1px solid ${t.success.border}` }}
          >
            <ShieldCheck className="w-3 h-3" style={{ color: t.success.text }} />
            <span className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap" style={{ color: t.success.text }}>
              Lecture seule
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.accent.solid }} />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold leading-none" style={{ color: t.stat.valuePrimary }}>{s.value}</p>
                  <p className="text-[9px] mt-0.5 truncate" style={{ color: t.text.tertiary }}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex flex-wrap px-3 sm:px-4 py-2 sm:py-2.5 gap-1.5"
        style={{ borderBottom: `1px solid ${t.surface.border}`, background: t.surface.tertiary }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.tableKeys.reduce((sum, k) => sum + ((data.tables[k] ?? []) as unknown[]).length, 0);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200"
              style={{
                background: isActive ? t.tab.activeBg : 'transparent',
                color: isActive ? t.tab.activeText : t.tab.inactiveText,
                border: isActive ? `1px solid ${t.tab.activeBorder}` : '1px solid transparent',
                boxShadow: isActive ? `0 0 12px rgba(6,182,212,0.12)` : 'none',
              }}
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: isActive ? t.tab.activeIcon : t.tab.inactiveIcon }} />
              {tab.label}
              <span
                className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md"
                style={{
                  background: isActive ? 'rgba(6,182,212,0.20)' : t.surface.secondary,
                  color: isActive ? t.accent.text : t.text.tertiary,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stale data warning */}
      <div className="flex items-start gap-2.5 mx-3 sm:mx-5 mt-3 sm:mt-4 rounded-xl px-4 py-2.5" style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}` }}>
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: t.warning.text }} />
        <p className="text-[11px]" style={{ color: t.warning.text }}>
          Cet apercu provient d'un fichier JSON charge. Il ne reflete pas forcement l'etat actuel de Supabase.
        </p>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}
            >
              <Database className="w-5 h-5" style={{ color: t.accent.text }} />
            </div>
            <p className="text-sm font-medium" style={{ color: t.text.secondary }}>
              Aucune donnee pour cette table
            </p>
            <p className="text-xs" style={{ color: t.text.tertiary }}>
              La sauvegarde ne contient aucune entree dans cette categorie.
            </p>
          </div>
        ) : (
          <TabContent tab={activeTab} rows={rows} tokens={t} allTables={data.tables} />
        )}
      </div>
    </div>
  );
}

function TabContent({
  tab,
  rows,
  tokens,
  allTables,
}: {
  tab: Tab;
  rows: Record<string, unknown>[];
  tokens: ReturnType<typeof useThemeTokens>;
  allTables: Record<string, unknown[]>;
}) {
  switch (tab) {
    case 'leads': return <LeadsTab rows={rows} tokens={tokens} allTables={allTables} />;
    case 'vendeurs': return <VendeursTab rows={rows} tokens={tokens} />;
    case 'statuts': return <StatutsTab rows={rows} tokens={tokens} />;
    case 'messages': return <MessagesTab rows={rows} tokens={tokens} />;
    case 'rdv': return <RdvTab rows={rows} tokens={tokens} />;
    case 'commentaires': return <CommentairesTab rows={rows} tokens={tokens} />;
    default: return null;
  }
}
