import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown, Search, Database, Key, ArrowRightLeft,
  Settings2, FileText, Zap, ShieldCheck, Table2, Eye, Code2, X, GitBranch,
  Clock, RefreshCw, AlertTriangle, CheckCircle2, Copy, CheckCircle,
} from 'lucide-react';
import DATABASE_DOC, { TableDoc, ColumnDoc, PolicyDoc } from './databaseDocumentation';
import { supabase } from '../../../../lib/supabase';

type TabKey = 'summary' | 'columns' | 'relations' | 'config';

type SyncStatus = 'idle' | 'checking' | 'ok' | 'drift' | 'error';

const GROUP_COLORS: Record<string, string> = {
  'Core CRM': '#38bdf8',
  'Chat': '#34d399',
  'Documentation interne': '#fb923c',
};

const TYPE_COLORS: Record<string, string> = {
  uuid: '#a78bfa',
  text: '#38bdf8',
  boolean: '#34d399',
  jsonb: '#f472b6',
  integer: '#fb923c',
  bigint: '#fb923c',
  timestamptz: '#fbbf24',
  date: '#fbbf24',
};

function getTypeColor(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(key)) return color;
  }
  return '#94a3b8';
}

const OPERATION_COLORS: Record<string, string> = {
  SELECT: '#38bdf8',
  INSERT: '#34d399',
  UPDATE: '#fbbf24',
  DELETE: '#f87171',
};

type TechBadgeType = 'trigger' | 'view' | 'function' | 'index' | 'unique-index';

const TECH_BADGE_STYLES: Record<TechBadgeType, { bg: string; color: string; border: string; label: string; icon: React.ReactNode }> = {
  trigger: {
    bg: 'rgba(167,139,250,0.12)',
    color: 'rgba(167,139,250,0.9)',
    border: '1px solid rgba(167,139,250,0.25)',
    label: 'trigger',
    icon: <Zap className="w-3 h-3" />,
  },
  view: {
    bg: 'rgba(56,189,248,0.12)',
    color: 'rgba(56,189,248,0.9)',
    border: '1px solid rgba(56,189,248,0.25)',
    label: 'view',
    icon: <Eye className="w-3 h-3" />,
  },
  function: {
    bg: 'rgba(251,146,60,0.12)',
    color: 'rgba(251,146,60,0.9)',
    border: '1px solid rgba(251,146,60,0.25)',
    label: 'function',
    icon: <Code2 className="w-3 h-3" />,
  },
  index: {
    bg: 'rgba(100,116,139,0.15)',
    color: 'rgba(148,163,184,0.75)',
    border: '1px solid rgba(100,116,139,0.25)',
    label: 'index',
    icon: <Settings2 className="w-3 h-3" />,
  },
  'unique-index': {
    bg: 'rgba(251,191,36,0.12)',
    color: 'rgba(251,191,36,0.9)',
    border: '1px solid rgba(251,191,36,0.28)',
    label: 'unique',
    icon: <Key className="w-3 h-3" />,
  },
};

function TechBadge({ type, label }: { type: TechBadgeType; label?: string }) {
  const s = TECH_BADGE_STYLES[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: s.border, fontSize: '11px', padding: '2px 7px' }}
    >
      {s.icon}
      {label ?? s.label}
    </span>
  );
}

const MAIN_RELATIONS: Array<{ from: string; to: string; description: string }> = [
  { from: 'leads', to: 'vendors', description: 'lead assigné à un commercial' },
  { from: 'leads', to: 'statuts', description: 'qualification du lead' },
  { from: 'leads', to: 'import_history', description: 'traçabilité de l\'import' },
  { from: 'leads', to: 'rdv_proposals', description: 'propositions de rendez-vous' },
  { from: 'leads', to: 'client_messages', description: 'messagerie client directe' },
  { from: 'conversations', to: 'messages', description: 'messagerie interne vendeur-admin' },
  { from: 'vendors', to: 'vendor_admin_messages', description: 'messagerie admin-commercial' },
  { from: 'vendors', to: 'vendor_comments', description: 'notes sur le commercial' },
];

function getGroupForTable(tableName: string): string {
  const t = DATABASE_DOC.tables.find((t) => t.name === tableName);
  return t?.group ?? '';
}

function TypeBadge({ type }: { type: string }) {
  const color = getTypeColor(type);
  return (
    <span
      className="font-mono text-xs px-1.5 py-0.5 rounded"
      style={{
        background: `${color}12`,
        color: `${color}cc`,
        border: `1px solid ${color}25`,
        fontSize: '10px',
        letterSpacing: '0.02em',
      }}
    >
      {type}
    </span>
  );
}

function OperationBadge({ op }: { op: string }) {
  const color = OPERATION_COLORS[op] ?? '#94a3b8';
  return (
    <span
      className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold"
      style={{
        background: `${color}12`,
        color: `${color}cc`,
        border: `1px solid ${color}25`,
        fontSize: '10px',
      }}
    >
      {op}
    </span>
  );
}

function GroupBadge({ group }: { group: string }) {
  const color = GROUP_COLORS[group] ?? '#94a3b8';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: `${color}12`,
        color: `${color}cc`,
        border: `1px solid ${color}20`,
        fontSize: '10px',
      }}
    >
      {group}
    </span>
  );
}

function SummaryTab({ table }: { table: TableDoc }) {
  const color = GROUP_COLORS[table.group] ?? '#94a3b8';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
        {table.description}
      </p>

      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'rgba(148,163,184,0.5)' }}>
          Comprendre rapidement
        </p>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-3">
            <span className="text-xs font-medium flex-shrink-0 w-28" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Role
            </span>
            <span className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
              {table.quickUnderstanding.role}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-medium flex-shrink-0 w-28" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Utilise par
            </span>
            <span className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
              {table.quickUnderstanding.usedBy}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-medium flex-shrink-0 w-28" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Tables liees
            </span>
            <div className="flex flex-wrap gap-1">
              {table.quickUnderstanding.relatedTables.length > 0 ? (
                table.quickUnderstanding.relatedTables.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: `${color}10`,
                      color: `${color}aa`,
                      border: `1px solid ${color}20`,
                      fontSize: '10px',
                    }}
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>Aucune</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: `${color}06`, border: `1px solid ${color}18` }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: `${color}88` }}>
          Exemple concret
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>
          {table.example}
        </p>
      </div>
    </div>
  );
}

function ColumnsTab({ columns }: { columns: ColumnDoc[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Colonne', 'Type', 'Req/Null', 'Default', 'Contraintes'].map((h) => (
              <th
                key={h}
                className="text-left py-2 pr-4 font-semibold tracking-wider uppercase"
                style={{ color: 'rgba(148,163,184,0.4)', fontSize: '10px' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr
              key={col.name}
              className="transition-colors duration-100"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
            >
              <td className="py-2 pr-4">
                <div className="flex items-center gap-1.5">
                  {col.primaryKey && (
                    <Key className="w-3 h-3 flex-shrink-0" style={{ color: '#fbbf24' }} />
                  )}
                  <span
                    className="font-mono"
                    style={{
                      color: col.isSystem ? 'rgba(148,163,184,0.5)' : col.primaryKey ? '#fbbf24' : '#e2e8f0',
                      fontSize: '11px',
                    }}
                  >
                    {col.name}
                  </span>
                  {col.isSystem && !col.primaryKey && (
                    <span className="text-xs" style={{ color: 'rgba(100,116,139,0.6)', fontSize: '9px' }}>sys</span>
                  )}
                </div>
              </td>
              <td className="py-2 pr-4">
                <TypeBadge type={col.type} />
              </td>
              <td className="py-2 pr-4">
                {col.nullable ? (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.1)', color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(100,116,139,0.15)', fontSize: '10px' }}>
                    nullable
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(248,113,113,0.7)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '10px' }}>
                    requis
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">
                {col.default ? (
                  <span
                    className="font-mono"
                    style={{ color: 'rgba(52,211,153,0.65)', fontSize: '10px' }}
                  >
                    {col.default}
                  </span>
                ) : (
                  <span style={{ color: 'rgba(100,116,139,0.4)', fontSize: '10px' }}>—</span>
                )}
              </td>
              <td className="py-2">
                {col.constraints ? (
                  <span className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    {col.constraints}
                  </span>
                ) : (
                  <span style={{ color: 'rgba(100,116,139,0.3)', fontSize: '10px' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelationsTab({ table }: { table: TableDoc }) {
  const outgoing = table.foreignKeys.filter((fk) => fk.direction === 'outgoing');
  const incoming = table.foreignKeys.filter((fk) => fk.direction === 'incoming');

  if (table.foreignKeys.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.35)' }}>Aucune relation — table autonome</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {outgoing.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Cles etrangeres sortantes
          </p>
          <div className="flex flex-col gap-2">
            {outgoing.map((fk, i) => (
              <div
                key={i}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)' }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#38bdf8' }} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs" style={{ color: '#38bdf8' }}>{table.name}.{fk.column}</span>
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>→</span>
                    <span className="font-mono text-xs" style={{ color: '#38bdf8' }}>{fk.referencesTable}.{fk.referencesColumn}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{fk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
            References entrantes
          </p>
          <div className="flex flex-col gap-2">
            {incoming.map((fk, i) => (
              <div
                key={i}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)' }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#34d399' }} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs" style={{ color: '#34d399' }}>{fk.referencesTable}.{fk.referencesColumn}</span>
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>→</span>
                    <span className="font-mono text-xs" style={{ color: '#34d399' }}>{table.name}.{fk.column}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{fk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigTab({ table }: { table: TableDoc }) {
  const byOp = (op: PolicyDoc['operation']) => table.policies.filter((p) => p.operation === op);
  const operations: PolicyDoc['operation'][] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

  return (
    <div className="flex flex-col gap-5">
      {table.indexes.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Index
          </p>
          <div className="flex flex-col gap-1.5">
            {table.indexes.map((idx) => (
              <div
                key={idx.name}
                className="rounded-lg px-3 py-2 flex items-start gap-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <TechBadge type={idx.unique ? 'unique-index' : 'index'} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs" style={{ color: '#e2e8f0', fontSize: '11px' }}>
                    ({idx.columns.join(', ')})
                  </span>
                  {idx.condition && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)', fontStyle: 'italic' }}>
                      {idx.condition}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
          Policies RLS
        </p>
        <div className="flex flex-col gap-2">
          {operations.map((op) => {
            const policies = byOp(op);
            if (policies.length === 0) return null;
            return (
              <div key={op}>
                <div className="flex items-center gap-2 mb-1.5">
                  <OperationBadge op={op} />
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  {policies.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <p className="text-xs font-medium mb-0.5" style={{ color: '#e2e8f0' }}>{p.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                          roles: {p.roles.join(', ')}
                        </span>
                        {p.condition && p.condition !== 'true' && (
                          <span className="font-mono text-xs" style={{ color: 'rgba(52,211,153,0.6)', fontSize: '10px' }}>
                            WHEN {p.condition}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {table.triggers && table.triggers.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Triggers
          </p>
          <div className="flex flex-col gap-1.5">
            {table.triggers.map((trg) => (
              <div
                key={trg.name}
                className="rounded-lg p-3"
                style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TechBadge type="trigger" label={trg.event} />
                  <span className="font-mono text-xs" style={{ color: '#a78bfa', fontSize: '11px' }}>{trg.function}</span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{trg.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableCard({ table }: { table: TableDoc }) {
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
        background: 'rgba(255,255,255,0.02)',
        border: expanded ? `1px solid ${color}28` : '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={(e) => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.border = `1px solid ${color}20`;
      }}
      onMouseLeave={(e) => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.06)';
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}
        >
          <Database className="w-3.5 h-3.5" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              {table.name}
            </span>
            <GroupBadge group={table.group} />
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.65)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px' }}
            >
              <Table2 className="w-2.5 h-2.5" />
              {table.columns.length} col.
            </span>
            {(table.triggers?.length ?? 0) > 0 && <TechBadge type="trigger" />}
            {table.indexes.some((i) => i.unique) && <TechBadge type="unique-index" />}
            {table.indexes.some((i) => !i.unique) && <TechBadge type="index" />}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(148,163,184,0.45)' }}>
            {table.description.substring(0, 90)}…
          </p>
        </div>

        <div className="flex-shrink-0 transition-transform duration-200" style={{ transform: expanded ? 'rotate(0)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-4 h-4" style={{ color: 'rgba(100,116,139,0.6)' }} />
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={
                  activeTab === tab.key
                    ? { background: `${color}15`, color, border: `1px solid ${color}25` }
                    : { color: 'rgba(148,163,184,0.5)', border: '1px solid transparent' }
                }
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key) e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) e.currentTarget.style.color = 'rgba(148,163,184,0.5)';
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="rounded-full px-1.5 py-0.5 font-semibold leading-none"
                    style={{
                      fontSize: '10px',
                      background: activeTab === tab.key ? `${color}20` : 'rgba(255,255,255,0.06)',
                      color: activeTab === tab.key ? color : 'rgba(148,163,184,0.5)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 pt-3">
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

function GlobalSummary() {
  const totalColumns = DATABASE_DOC.tables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalRelations = DATABASE_DOC.tables.reduce((acc, t) => acc + t.foreignKeys.length, 0);
  const totalPolicies = DATABASE_DOC.tables.reduce((acc, t) => acc + t.policies.length, 0);
  const totalTriggers = DATABASE_DOC.tables.reduce((acc, t) => acc + (t.triggers?.length ?? 0), 0);

  const stats = [
    { label: 'Tables', value: DATABASE_DOC.tables.length, icon: <Database className="w-4 h-4" />, color: '#38bdf8' },
    { label: 'Colonnes', value: totalColumns, icon: <Table2 className="w-4 h-4" />, color: '#34d399' },
    { label: 'Relations FK', value: totalRelations, icon: <ArrowRightLeft className="w-4 h-4" />, color: '#fb923c' },
    { label: 'Policies RLS', value: totalPolicies, icon: <ShieldCheck className="w-4 h-4" />, color: '#fbbf24' },
    { label: 'Triggers', value: totalTriggers, icon: <Zap className="w-4 h-4" />, color: '#a78bfa' },
  ];

  const groupCounts = DATABASE_DOC.groups.map((g) => ({
    ...g,
    count: DATABASE_DOC.tables.filter((t) => t.group === g.id).length,
  }));

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.4)' }} />
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.4)', fontSize: '10px' }}>
          Resume global
        </span>
      </div>
      <div className="grid grid-cols-5 gap-3 mb-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-3 flex flex-col gap-1.5"
            style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ color: `${s.color}99` }}>{s.icon}</span>
            </div>
            <span className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</span>
            <span className="text-xs leading-tight" style={{ color: 'rgba(148,163,184,0.55)', fontSize: '10px' }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)', fontSize: '10px' }}>Repartition :</span>
        {groupCounts.map((g, i) => (
          <span key={g.id} className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${g.color}10`, color: `${g.color}cc`, border: `1px solid ${g.color}20`, fontSize: '11px' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: g.color }}
              />
              {g.label} ({g.count})
            </span>
            {i < groupCounts.length - 1 && (
              <span style={{ color: 'rgba(100,116,139,0.3)', fontSize: '10px' }}>·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function MainRelations() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <GitBranch className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
        <span className="text-xs font-semibold tracking-widest uppercase flex-1" style={{ color: 'rgba(148,163,184,0.4)', fontSize: '10px' }}>
          Relations principales
        </span>
        <span
          className="text-xs mr-2 px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(56,189,248,0.08)', color: 'rgba(56,189,248,0.6)', border: '1px solid rgba(56,189,248,0.15)', fontSize: '10px' }}
        >
          {MAIN_RELATIONS.length} liens
        </span>
        <div className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {MAIN_RELATIONS.map((rel, i) => {
              const fromColor = GROUP_COLORS[getGroupForTable(rel.from)] ?? '#94a3b8';
              const toColor = GROUP_COLORS[getGroupForTable(rel.to)] ?? '#94a3b8';
              return (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ background: `${fromColor}10`, color: fromColor, border: `1px solid ${fromColor}20`, fontSize: '11px' }}
                    >
                      {rel.from}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.3)' }} />
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ background: `${toColor}10`, color: toColor, border: `1px solid ${toColor}20`, fontSize: '11px' }}
                    >
                      {rel.to}
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(148,163,184,0.5)', fontSize: '11px' }}>
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

function SyncBanner({
  syncStatus,
  undocumentedTables,
  onCheck,
}: {
  syncStatus: SyncStatus;
  undocumentedTables: string[];
  onCheck: () => void;
}) {
  const [showList, setShowList] = useState(false);

  const statusConfig = {
    idle: { color: 'rgba(148,163,184,0.5)', icon: null, label: null },
    checking: { color: '#38bdf8', icon: <RefreshCw className="w-3 h-3 animate-spin" />, label: 'Verification en cours…' },
    ok: { color: '#34d399', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Documentation a jour' },
    drift: { color: '#fb923c', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: `${undocumentedTables.length} table${undocumentedTables.length > 1 ? 's' : ''} non documentee${undocumentedTables.length > 1 ? 's' : ''}` },
    error: { color: '#f87171', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Erreur de connexion' },
  }[syncStatus];

  return (
    <div
      className="rounded-xl p-3 mb-4 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
        <span className="text-xs flex-1" style={{ color: 'rgba(148,163,184,0.55)' }}>
          Documentation mise a jour le <span style={{ color: 'rgba(148,163,184,0.8)' }}>{DATABASE_DOC.lastSyncedAt}</span>
        </span>
        {statusConfig.label && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              background: `${statusConfig.color}10`,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}25`,
              fontSize: '11px',
              cursor: syncStatus === 'drift' ? 'pointer' : 'default',
            }}
            onClick={() => syncStatus === 'drift' && setShowList((v) => !v)}
          >
            {statusConfig.icon}
            {statusConfig.label}
            {syncStatus === 'drift' && (
              <ChevronDown
                className="w-3 h-3 transition-transform duration-150"
                style={{ transform: showList ? 'rotate(0)' : 'rotate(-90deg)' }}
              />
            )}
          </div>
        )}
        <button
          onClick={onCheck}
          disabled={syncStatus === 'checking'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{
            background: 'rgba(56,189,248,0.08)',
            color: syncStatus === 'checking' ? 'rgba(56,189,248,0.4)' : '#38bdf8',
            border: '1px solid rgba(56,189,248,0.2)',
            cursor: syncStatus === 'checking' ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (syncStatus !== 'checking') {
              e.currentTarget.style.background = 'rgba(56,189,248,0.14)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(56,189,248,0.08)';
          }}
        >
          <RefreshCw className={`w-3 h-3 ${syncStatus === 'checking' ? 'animate-spin' : ''}`} />
          Verifier la synchronisation
        </button>
      </div>

      {syncStatus === 'drift' && showList && undocumentedTables.length > 0 && (
        <div
          className="rounded-lg p-3 mt-1"
          style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.18)' }}
        >
          <p className="text-xs mb-2" style={{ color: 'rgba(251,146,60,0.8)' }}>
            Ces tables existent en base mais ne sont pas encore documentees. Modifier{' '}
            <span className="font-mono" style={{ color: '#fb923c' }}>databaseDocumentation.ts</span> pour les ajouter.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {undocumentedTables.map((t) => (
              <span
                key={t}
                className="font-mono text-xs px-2 py-0.5 rounded"
                style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', fontSize: '11px' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const LINE = '─'.repeat(60);
const THICK_LINE = '═'.repeat(60);

function buildFullDatabaseDocText(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const sections: string[] = [];

  sections.push(THICK_LINE);
  sections.push('  DOCUMENTATION BASE DE DONNÉES — CRM SaaS');
  sections.push(`  Copiée le ${dateStr} à ${timeStr}`);
  sections.push(`  Documentation mise à jour le : ${DATABASE_DOC.lastSyncedAt}`);
  sections.push(THICK_LINE);

  const totalColumns = DATABASE_DOC.tables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalRelations = DATABASE_DOC.tables.reduce((acc, t) => acc + t.foreignKeys.length, 0);
  const totalPolicies = DATABASE_DOC.tables.reduce((acc, t) => acc + t.policies.length, 0);
  const totalTriggers = DATABASE_DOC.tables.reduce((acc, t) => acc + (t.triggers?.length ?? 0), 0);

  sections.push('');
  sections.push('RÉSUMÉ GLOBAL');
  sections.push(LINE);
  sections.push(`  Tables          : ${DATABASE_DOC.tables.length}`);
  sections.push(`  Colonnes totales: ${totalColumns}`);
  sections.push(`  Relations FK    : ${totalRelations}`);
  sections.push(`  Policies RLS    : ${totalPolicies}`);
  sections.push(`  Triggers        : ${totalTriggers}`);
  sections.push('');

  const groupCounts = DATABASE_DOC.groups.map((g) => ({
    label: g.label,
    count: DATABASE_DOC.tables.filter((t) => t.group === g.id).length,
  }));
  sections.push('  Groupes :');
  for (const g of groupCounts) {
    sections.push(`    • ${g.label} (${g.count} tables)`);
  }

  sections.push('');
  sections.push(THICK_LINE);
  sections.push('  RELATIONS PRINCIPALES');
  sections.push(THICK_LINE);
  sections.push('');
  for (const rel of MAIN_RELATIONS) {
    sections.push(`  ${rel.from}  →  ${rel.to}`);
    sections.push(`    ${rel.description}`);
  }

  sections.push('');
  sections.push(THICK_LINE);
  sections.push('  TABLES');
  sections.push(THICK_LINE);

  for (const table of DATABASE_DOC.tables) {
    sections.push('');
    sections.push(LINE);
    sections.push(`  TABLE : ${table.name.toUpperCase()}   [${table.group}]`);
    sections.push(LINE);
    sections.push('');
    sections.push(`  Description`);
    sections.push(`  ${table.description}`);
    sections.push('');

    sections.push(`  Rôle          : ${table.quickUnderstanding.role}`);
    sections.push(`  Utilisé par   : ${table.quickUnderstanding.usedBy}`);
    if (table.quickUnderstanding.relatedTables.length > 0) {
      sections.push(`  Tables liées  : ${table.quickUnderstanding.relatedTables.join(', ')}`);
    }
    sections.push('');

    sections.push(`  Exemple`);
    sections.push(`  ${table.example}`);
    sections.push('');

    sections.push(`  Colonnes (${table.columns.length})`);
    const colNameWidth = Math.max(...table.columns.map((c) => c.name.length), 10);
    const colTypeWidth = Math.max(...table.columns.map((c) => c.type.length), 6);
    for (const col of table.columns) {
      const name = col.name.padEnd(colNameWidth);
      const type = col.type.padEnd(colTypeWidth);
      const required = col.nullable ? 'nullable' : 'requis ';
      const pk = col.primaryKey ? ' [PK]' : '';
      const def = col.default ? `  default: ${col.default}` : '';
      const constraints = col.constraints ? `  → ${col.constraints}` : '';
      sections.push(`    ${name}  ${type}  ${required}${pk}${def}${constraints}`);
    }

    if (table.foreignKeys.length > 0) {
      sections.push('');
      sections.push(`  Relations FK`);
      for (const fk of table.foreignKeys) {
        const arrow = fk.direction === 'outgoing' ? '→' : '←';
        sections.push(`    ${arrow} ${table.name}.${fk.column} — ${fk.referencesTable}.${fk.referencesColumn}`);
        sections.push(`      ${fk.description}`);
      }
    }

    if (table.indexes.length > 0) {
      sections.push('');
      sections.push(`  Index`);
      for (const idx of table.indexes) {
        const unique = idx.unique ? ' [UNIQUE]' : '';
        const condition = idx.condition ? `  (${idx.condition})` : '';
        sections.push(`    (${idx.columns.join(', ')})${unique}${condition}`);
      }
    }

    if (table.policies.length > 0) {
      sections.push('');
      sections.push(`  Policies RLS`);
      const ops = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
      for (const op of ops) {
        const ps = table.policies.filter((p) => p.operation === op);
        for (const p of ps) {
          const cond = p.condition && p.condition !== 'true' ? `  WHEN ${p.condition}` : '';
          sections.push(`    [${op}]  ${p.name}  (${p.roles.join(', ')})${cond}`);
        }
      }
    }

    if (table.triggers && table.triggers.length > 0) {
      sections.push('');
      sections.push(`  Triggers`);
      for (const trg of table.triggers) {
        sections.push(`    [${trg.event}]  ${trg.function}`);
        sections.push(`      ${trg.description}`);
      }
    }
  }

  sections.push('');
  sections.push(THICK_LINE);
  sections.push('  VUES SQL');
  sections.push(THICK_LINE);
  sections.push('');
  for (const v of DATABASE_DOC.views) {
    sections.push(`  ${v.name}  →  ${v.returns}`);
    sections.push(`  ${v.description}`);
    sections.push(`  SQL : ${v.sql}`);
    sections.push('');
  }

  sections.push(THICK_LINE);
  sections.push('  FONCTIONS SQL');
  sections.push(THICK_LINE);
  sections.push('');
  for (const fn of DATABASE_DOC.functions) {
    sections.push(`  ${fn.name}`);
    sections.push(`  ${fn.description}`);
    if (fn.trigger) sections.push(`  Trigger : ${fn.trigger}`);
    sections.push('');
  }

  sections.push(THICK_LINE);
  sections.push('  RÈGLES GLOBALES');
  sections.push(THICK_LINE);
  sections.push('');
  for (const rule of DATABASE_DOC.globalRules) {
    sections.push(`  • ${rule}`);
  }

  sections.push('');
  sections.push(THICK_LINE);

  return sections.join('\n');
}

export default function DatabaseView() {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Toutes');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [undocumentedTables, setUndocumentedTables] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopyDatabaseDoc = useCallback(async () => {
    await navigator.clipboard.writeText(buildFullDatabaseDocText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const groups = ['Toutes', ...DATABASE_DOC.groups.map((g) => g.id)];

  const filtered = useMemo(() => {
    return DATABASE_DOC.tables.filter((t) => {
      const matchSearch = search.trim() === '' || t.name.toLowerCase().includes(search.toLowerCase());
      const matchGroup = activeGroup === 'Toutes' || t.group === activeGroup;
      return matchSearch && matchGroup;
    });
  }, [search, activeGroup]);

  const handleCheckSync = async () => {
    setSyncStatus('checking');
    try {
      const { data, error } = await supabase.rpc('get_public_table_names');

      if (error) throw error;

      const realTables: string[] = (data as Array<{ table_name: string }>).map((r) => r.table_name);
      const documentedNames = new Set(DATABASE_DOC.tables.map((t) => t.name));
      const undoc = realTables.filter((t) => !documentedNames.has(t));

      setUndocumentedTables(undoc);
      setSyncStatus(undoc.length === 0 ? 'ok' : 'drift');
    } catch {
      setSyncStatus('error');
      setUndocumentedTables([]);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0">
        <GlobalSummary />
        <MainRelations />
        <SyncBanner
          syncStatus={syncStatus}
          undocumentedTables={undocumentedTables}
          onCheck={handleCheckSync}
        />
      </div>
      <div className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
        <div
          className="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(100,116,139,0.6)' }} />
          <input
            type="text"
            placeholder="Rechercher une table…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: '#e2e8f0', caretColor: '#22d3ee' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3 h-3" style={{ color: 'rgba(100,116,139,0.5)' }} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {groups.map((g) => {
            const color = g === 'Toutes' ? '#94a3b8' : GROUP_COLORS[g] ?? '#94a3b8';
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all duration-150"
                style={
                  activeGroup === g
                    ? { background: `${color}18`, color, border: `1px solid ${color}30` }
                    : { background: 'rgba(255,255,255,0.02)', color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(255,255,255,0.06)' }
                }
                onMouseEnter={(e) => {
                  if (activeGroup !== g) e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  if (activeGroup !== g) e.currentTarget.style.color = 'rgba(148,163,184,0.5)';
                }}
              >
                {g}
              </button>
            );
          })}
        </div>

        <span className="text-xs flex-shrink-0" style={{ color: 'rgba(100,116,139,0.5)' }}>
          {filtered.length} / {DATABASE_DOC.tables.length} tables
        </span>

        <button
          onClick={handleCopyDatabaseDoc}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex-shrink-0"
          style={
            copied
              ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }
              : { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#67e8f9' }
          }
          onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)'; } }}
          onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; } }}
        >
          {copied
            ? <><CheckCircle className="w-3.5 h-3.5" />Copié !</>
            : <><Copy className="w-3.5 h-3.5" />Copier la documentation</>
          }
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm" style={{ color: 'rgba(148,163,184,0.35)' }}>Aucune table correspondante</p>
            </div>
          ) : (
            filtered.map((table) => <TableCard key={table.name} table={table} />)
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.4)' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.4)' }}>
                Vues SQL
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
                style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.6)', border: '1px solid rgba(52,211,153,0.15)', fontSize: '10px' }}
              >
                {DATABASE_DOC.views.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {DATABASE_DOC.views.map((v) => (
                <div key={v.name} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#38bdf8' }}>{v.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{ background: 'rgba(56,189,248,0.08)', color: 'rgba(56,189,248,0.6)', border: '1px solid rgba(56,189,248,0.15)', fontSize: '9px' }}
                    >
                      {v.returns}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.55)' }}>{v.description}</p>
                  <span className="font-mono text-xs mt-0.5" style={{ color: 'rgba(52,211,153,0.5)', fontSize: '10px' }}>{v.sql}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.4)' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.4)' }}>
                Fonctions SQL
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
                style={{ background: 'rgba(251,146,60,0.08)', color: 'rgba(251,146,60,0.6)', border: '1px solid rgba(251,146,60,0.15)', fontSize: '10px' }}
              >
                {DATABASE_DOC.functions.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {DATABASE_DOC.functions.map((fn) => (
                <div key={fn.name}>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs font-semibold flex-shrink-0" style={{ color: '#a78bfa' }}>{fn.name}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>{fn.description}</p>
                  {fn.trigger && (
                    <span className="font-mono text-xs mt-0.5 block" style={{ color: 'rgba(167,139,250,0.45)', fontSize: '10px' }}>
                      {fn.trigger}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.4)' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.4)' }}>
                Regles importantes
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {DATABASE_DOC.globalRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span
                    className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(251,191,36,0.4)' }}
                  />
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 mb-1">
          <span className="text-xs" style={{ color: 'rgba(100,116,139,0.35)', fontSize: '10px' }}>
            Pour ajouter une table a la documentation, modifier databaseDocumentation.ts
          </span>
        </div>
      </div>
    </div>
  );
}
