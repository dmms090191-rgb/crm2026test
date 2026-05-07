import { Key, ArrowRightLeft } from 'lucide-react';
import { TableDoc, ColumnDoc } from './databaseDocumentation';
import { GROUP_COLORS } from './databaseViewConstants';
import { TypeBadge } from './databaseViewBadges';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export function SummaryTab({ table }: { table: TableDoc }) {
  const tokens = useThemeTokens();
  const color = GROUP_COLORS[table.group] ?? '#94a3b8';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed" style={{ color: tokens.text.secondary }}>
        {table.description}
      </p>

      <div
        className="rounded-xl p-4"
        style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: tokens.text.tertiary }}>
          Comprendre rapidement
        </p>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-3">
            <span className="text-xs font-medium flex-shrink-0 w-28" style={{ color: tokens.text.tertiary }}>
              Role
            </span>
            <span className="text-xs leading-relaxed" style={{ color: tokens.text.secondary }}>
              {table.quickUnderstanding.role}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-medium flex-shrink-0 w-28" style={{ color: tokens.text.tertiary }}>
              Utilise par
            </span>
            <span className="text-xs leading-relaxed" style={{ color: tokens.text.secondary }}>
              {table.quickUnderstanding.usedBy}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-medium flex-shrink-0 w-28" style={{ color: tokens.text.tertiary }}>
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
                <span className="text-xs" style={{ color: tokens.text.quaternary }}>Aucune</span>
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
        <p className="text-xs leading-relaxed" style={{ color: tokens.text.secondary }}>
          {table.example}
        </p>
      </div>
    </div>
  );
}

export function ColumnsTab({ columns }: { columns: ColumnDoc[] }) {
  const tokens = useThemeTokens();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
            {['Colonne', 'Type', 'Req/Null', 'Default', 'Contraintes'].map((h) => (
              <th
                key={h}
                className="text-left py-2 pr-4 font-semibold tracking-wider uppercase"
                style={{ color: tokens.text.quaternary, fontSize: '10px' }}
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
              style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = tokens.surface.tertiary; }}
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
                      color: col.isSystem ? tokens.text.tertiary : col.primaryKey ? '#fbbf24' : tokens.text.secondary,
                      fontSize: '11px',
                    }}
                  >
                    {col.name}
                  </span>
                  {col.isSystem && !col.primaryKey && (
                    <span className="text-xs" style={{ color: tokens.label.hint, fontSize: '9px' }}>sys</span>
                  )}
                </div>
              </td>
              <td className="py-2 pr-4">
                <TypeBadge type={col.type} />
              </td>
              <td className="py-2 pr-4">
                {col.nullable ? (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.1)', color: tokens.text.tertiary, border: '1px solid rgba(100,116,139,0.15)', fontSize: '10px' }}>
                    nullable
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}`, fontSize: '10px' }}>
                    requis
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">
                {col.default ? (
                  <span
                    className="font-mono"
                    style={{ color: tokens.success.text, fontSize: '10px' }}
                  >
                    {col.default}
                  </span>
                ) : (
                  <span style={{ color: tokens.text.quaternary, fontSize: '10px' }}>—</span>
                )}
              </td>
              <td className="py-2">
                {col.constraints ? (
                  <span className="text-xs leading-relaxed" style={{ color: tokens.text.tertiary }}>
                    {col.constraints}
                  </span>
                ) : (
                  <span style={{ color: tokens.text.quaternary, fontSize: '10px' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RelationsTab({ table }: { table: TableDoc }) {
  const tokens = useThemeTokens();
  const outgoing = table.foreignKeys.filter((fk) => fk.direction === 'outgoing');
  const incoming = table.foreignKeys.filter((fk) => fk.direction === 'incoming');

  if (table.foreignKeys.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune relation — table autonome</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {outgoing.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: tokens.text.quaternary }}>
            Cles etrangeres sortantes
          </p>
          <div className="flex flex-col gap-2">
            {outgoing.map((fk, i) => (
              <div
                key={i}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: tokens.accent.text }} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs" style={{ color: tokens.accent.text }}>{table.name}.{fk.column}</span>
                    <span className="text-xs" style={{ color: tokens.text.quaternary }}>→</span>
                    <span className="font-mono text-xs" style={{ color: tokens.accent.text }}>{fk.referencesTable}.{fk.referencesColumn}</span>
                  </div>
                  <p className="text-xs" style={{ color: tokens.text.tertiary }}>{fk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: tokens.text.quaternary }}>
            References entrantes
          </p>
          <div className="flex flex-col gap-2">
            {incoming.map((fk, i) => (
              <div
                key={i}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}` }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: tokens.success.text }} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs" style={{ color: tokens.success.text }}>{fk.referencesTable}.{fk.referencesColumn}</span>
                    <span className="text-xs" style={{ color: tokens.text.quaternary }}>→</span>
                    <span className="font-mono text-xs" style={{ color: tokens.success.text }}>{table.name}.{fk.column}</span>
                  </div>
                  <p className="text-xs" style={{ color: tokens.text.tertiary }}>{fk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { ConfigTab } from './databaseViewConfigTab';
