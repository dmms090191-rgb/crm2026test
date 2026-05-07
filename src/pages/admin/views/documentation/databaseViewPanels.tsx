import { useState, useEffect } from 'react';
import {
  ChevronDown, Database, ArrowRightLeft, ShieldCheck, Table2, GitBranch,
  FileText, Settings2,
} from 'lucide-react';
import DATABASE_DOC, { TableDoc } from './databaseDocumentation';
import { TabKey, GROUP_COLORS, MAIN_RELATIONS, getGroupForTable } from './databaseViewConstants';
import { TechBadge, GroupBadge } from './databaseViewBadges';
import { SummaryTab, ColumnsTab, RelationsTab, ConfigTab } from './databaseViewTabs';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import { Zap } from 'lucide-react';

export function TableCard({ table }: { table: TableDoc }) {
  const tokens = useThemeTokens();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const color = GROUP_COLORS[table.group] ?? '#94a3b8';

  const relCount = table.foreignKeys.length;
  const configCount = table.policies.length + table.indexes.length + (table.triggers?.length ?? 0);

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; count?: number }> = [
    { key: 'summary', label: 'Resume', icon: <FileText className="w-3 h-3" /> },
    { key: 'columns', label: 'Colonnes', icon: <Table2 className="w-3 h-3" />, count: table.columns.length },
    { key: 'relations', label: 'Relations', icon: <ArrowRightLeft className="w-3 h-3" />, count: relCount },
    { key: 'config', label: 'Config.', icon: <Settings2 className="w-3 h-3" />, count: configCount },
  ];

  return (
    <div
      className="rounded-xl transition-all duration-200"
      style={{
        background: tokens.surface.tertiary,
        border: expanded ? `1px solid ${color}28` : `1px solid ${tokens.surface.border}`,
      }}
      onMouseEnter={(e) => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.border = `1px solid ${color}20`;
      }}
      onMouseLeave={(e) => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.border = `1px solid ${tokens.surface.border}`;
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 md:gap-3 p-3 md:p-4 text-left"
      >
        <div
          className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}
        >
          <Database className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <span className="font-mono text-xs md:text-sm font-semibold" style={{ color: tokens.text.secondary }}>
              {table.name}
            </span>
            <GroupBadge group={table.group} />
            <span
              className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-md font-medium text-[10px] md:text-[11px]"
              style={{ background: tokens.surface.hover, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }}
            >
              <Table2 className="w-2.5 h-2.5" />
              {table.columns.length} col.
            </span>
            <span className="hidden sm:contents">
              {(table.triggers?.length ?? 0) > 0 && <TechBadge type="trigger" />}
              {table.indexes.some((i) => i.unique) && <TechBadge type="unique-index" />}
              {table.indexes.some((i) => !i.unique) && <TechBadge type="index" />}
            </span>
          </div>
          <p className="text-[11px] md:text-xs mt-0.5 truncate" style={{ color: tokens.text.quaternary }}>
            {table.description.substring(0, 90)}
          </p>
        </div>

        <div className="flex-shrink-0 transition-transform duration-200" style={{ transform: expanded ? 'rotate(0)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-4 h-4" style={{ color: tokens.label.hint }} />
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
          <div className="flex items-center gap-1 px-3 md:px-4 pt-3 pb-0 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-medium transition-all duration-150"
                style={
                  activeTab === tab.key
                    ? { background: `${color}15`, color, border: `1px solid ${color}25` }
                    : { color: tokens.text.tertiary, border: '1px solid transparent' }
                }
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key) e.currentTarget.style.color = tokens.text.secondary;
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) e.currentTarget.style.color = tokens.text.tertiary;
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="rounded-full px-1.5 py-0.5 font-semibold leading-none"
                    style={{
                      fontSize: '10px',
                      background: activeTab === tab.key ? `${color}20` : tokens.surface.border,
                      color: activeTab === tab.key ? color : tokens.text.tertiary,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-3 md:p-4 pt-3">
            {activeTab === 'summary' && <SummaryTab table={table} />}
            {activeTab === 'columns' && <ColumnsTab columns={table.columns} />}
            {activeTab === 'relations' && <RelationsTab table={table} />}
            {activeTab === 'config' && <ConfigTab table={table} />}
          </div>
        </div>
      )}
    </div>
  );
}

export function GlobalSummary({ tables }: { tables: TableDoc[] }) {
  const tokens = useThemeTokens();

  const [liveStats, setLiveStats] = useState<{ tables: number; colonnes: number; fk: number; policies: number; triggers: number } | null>(null);

  useEffect(() => {
    supabase.rpc('get_database_stats').then(({ data }) => {
      if (data) setLiveStats(data as { tables: number; colonnes: number; fk: number; policies: number; triggers: number });
    });
  }, []);

  const totalTables = liveStats?.tables ?? tables.length;
  const totalColumns = liveStats?.colonnes ?? tables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalRelations = liveStats?.fk ?? tables.reduce((acc, t) => acc + t.foreignKeys.length, 0);
  const totalPolicies = liveStats?.policies ?? tables.reduce((acc, t) => acc + t.policies.length, 0);
  const totalTriggers = liveStats?.triggers ?? tables.reduce((acc, t) => acc + (t.triggers?.length ?? 0), 0);

  const stats = [
    { label: 'Tables', value: totalTables, icon: <Database className="w-4 h-4" />, color: '#38bdf8' },
    { label: 'Colonnes', value: totalColumns, icon: <Table2 className="w-4 h-4" />, color: '#34d399' },
    { label: 'Relations FK', value: totalRelations, icon: <ArrowRightLeft className="w-4 h-4" />, color: '#fb923c' },
    { label: 'Policies RLS', value: totalPolicies, icon: <ShieldCheck className="w-4 h-4" />, color: '#fbbf24' },
    { label: 'Triggers', value: totalTriggers, icon: <Zap className="w-4 h-4" />, color: '#a78bfa' },
  ];

  const allGroups = [...DATABASE_DOC.groups];
  const hasNonClasse = tables.some((t) => t.group === 'Non classe');
  if (hasNonClasse) allGroups.push({ id: 'Non classe', label: 'Non classe', color: '#94a3b8' });

  const groupCounts = allGroups.map((g) => ({
    ...g,
    count: tables.filter((t) => t.group === g.id).length,
  })).filter((g) => g.count > 0);

  return (
    <div
      className="rounded-xl p-3 md:p-4 mb-4"
      style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.card.border}` }}
    >
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <Database className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: tokens.text.quaternary, fontSize: '10px' }}>
          Resume global
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-2.5 md:p-3 flex flex-col gap-1"
            style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ color: `${s.color}99` }}>{s.icon}</span>
            </div>
            <span className="text-xl md:text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[10px] leading-tight" style={{ color: tokens.text.tertiary }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap pt-3" style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
        <span className="text-[10px]" style={{ color: tokens.label.hint }}>Repartition :</span>
        {groupCounts.map((g, i) => (
          <span key={g.id} className="flex items-center gap-1">
            <span
              className="inline-flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${g.color}10`, color: `${g.color}cc`, border: `1px solid ${g.color}20` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: g.color }}
              />
              {g.label} ({g.count})
            </span>
            {i < groupCounts.length - 1 && (
              <span className="hidden md:inline" style={{ color: tokens.text.quaternary, fontSize: '10px' }}>·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MainRelations() {
  const tokens = useThemeTokens();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden transition-all duration-200"
      style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.card.border}` }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <GitBranch className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
        <span className="text-xs font-semibold tracking-widest uppercase flex-1" style={{ color: tokens.text.quaternary, fontSize: '10px' }}>
          Relations principales
        </span>
        <span
          className="text-xs mr-2 px-2 py-0.5 rounded-full font-medium"
          style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}`, fontSize: '10px' }}
        >
          {MAIN_RELATIONS.length} liens
        </span>
        <div className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: tokens.label.hint }} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
          <div className="px-3 md:px-4 py-3 grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MAIN_RELATIONS.map((rel, i) => {
              const fromColor = GROUP_COLORS[getGroupForTable(rel.from)] ?? '#94a3b8';
              const toColor = GROUP_COLORS[getGroupForTable(rel.to)] ?? '#94a3b8';
              return (
                <div
                  key={i}
                  className="rounded-lg p-2.5 md:p-3"
                  style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
                >
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <span
                      className="font-mono font-semibold px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-[11px]"
                      style={{ background: `${fromColor}10`, color: fromColor, border: `1px solid ${fromColor}20` }}
                    >
                      {rel.from}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                    <span
                      className="font-mono font-semibold px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-[11px]"
                      style={{ background: `${toColor}10`, color: toColor, border: `1px solid ${toColor}20` }}
                    >
                      {rel.to}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: tokens.text.tertiary }}>
                    {rel.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

