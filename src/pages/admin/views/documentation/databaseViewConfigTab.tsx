import { TableDoc, PolicyDoc } from './databaseDocumentation';
import { TechBadge, OperationBadge } from './databaseViewBadges';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export function ConfigTab({ table }: { table: TableDoc }) {
  const tokens = useThemeTokens();
  const byOp = (op: PolicyDoc['operation']) => table.policies.filter((p) => p.operation === op);
  const operations: PolicyDoc['operation'][] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

  return (
    <div className="flex flex-col gap-5">
      {table.indexes.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: tokens.text.quaternary }}>
            Index
          </p>
          <div className="flex flex-col gap-1.5">
            {table.indexes.map((idx) => (
              <div
                key={idx.name}
                className="rounded-lg px-3 py-2 flex items-start gap-3"
                style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
              >
                <TechBadge type={idx.unique ? 'unique-index' : 'index'} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs" style={{ color: tokens.text.secondary, fontSize: '11px' }}>
                    ({idx.columns.join(', ')})
                  </span>
                  {idx.condition && (
                    <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary, fontStyle: 'italic' }}>
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
        <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: tokens.text.quaternary }}>
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
                      style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}` }}
                    >
                      <p className="text-xs font-medium mb-0.5" style={{ color: tokens.text.secondary }}>{p.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: tokens.text.tertiary }}>
                          roles: {p.roles.join(', ')}
                        </span>
                        {p.condition && p.condition !== 'true' && (
                          <span className="font-mono text-xs" style={{ color: tokens.success.text, fontSize: '10px' }}>
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
          <p className="text-xs font-semibold tracking-widest uppercase mb-2.5" style={{ color: tokens.text.quaternary }}>
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
                <p className="text-xs" style={{ color: tokens.text.tertiary }}>{trg.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
