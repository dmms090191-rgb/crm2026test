import { useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Database, Layers, Settings2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { CRM_BACKUP_TABLES, CRM_TABLE_NAMES, SCHEMA_VERSION } from './restoreConstants';

interface VerifyResult {
  present: string[];
  missing: string[];
  extra: string[];
  checkedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Donnees principales',
  chat: 'Messagerie',
  crm: 'CRM & documentation',
  config: 'Configuration',
};

export function BackupConfigSection({ tokens: t }: { tokens: ReturnType<typeof useThemeTokens> }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [showTables, setShowTables] = useState(false);

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setResult(null);

    const present: string[] = [];
    const missing: string[] = [];

    const checks = await Promise.allSettled(
      CRM_TABLE_NAMES.map(async (table) => {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        return { table, error };
      })
    );

    for (const check of checks) {
      if (check.status === 'fulfilled') {
        const { table, error } = check.value;
        if (error) {
          missing.push(table);
        } else {
          present.push(table);
        }
      } else {
        missing.push('unknown');
      }
    }

    setResult({ present, missing, extra: [], checkedAt: new Date().toISOString() });
    setVerifying(false);
  }, []);

  const grouped = CRM_BACKUP_TABLES.reduce<Record<string, typeof CRM_BACKUP_TABLES>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div
      className="rounded-xl overflow-hidden min-w-0"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.accent.bg, color: t.accent.solid }}
          >
            <Settings2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Configuration de sauvegarde</h3>
            <p className="text-[11px] truncate" style={{ color: t.text.tertiary }}>
              {CRM_TABLE_NAMES.length} tables configurees — Schema v{SCHEMA_VERSION}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatPill icon={<Database className="w-3.5 h-3.5" />} label="Tables" value={CRM_TABLE_NAMES.length} tokens={t} />
          <StatPill icon={<Layers className="w-3.5 h-3.5" />} label="Core" value={grouped['core']?.length ?? 0} tokens={t} />
          <StatPill icon={<Layers className="w-3.5 h-3.5" />} label="Chat" value={grouped['chat']?.length ?? 0} tokens={t} />
          <StatPill icon={<Layers className="w-3.5 h-3.5" />} label="CRM" value={grouped['crm']?.length ?? 0} tokens={t} />
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 w-full sm:w-auto"
            style={{ background: t.accent.bg, color: t.accent.solid, border: `1px solid ${t.accent.solid}`, opacity: verifying ? 0.6 : 1 }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verification...' : 'Verifier la configuration'}
          </button>
          <button
            onClick={() => setShowTables((p) => !p)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 w-full sm:w-auto"
            style={{ background: t.surface.secondary, color: t.text.secondary }}
          >
            <Database className="w-3.5 h-3.5" />
            {showTables ? 'Masquer les tables' : 'Voir les tables'}
          </button>
        </div>

        {result && (
          <div
            className="rounded-lg px-4 py-3 space-y-2"
            style={{
              background: result.missing.length === 0 ? t.success.bg : t.warning.bg,
              border: `1px solid ${result.missing.length === 0 ? t.success.border : t.warning.border}`,
            }}
          >
            <div className="flex items-center gap-2">
              {result.missing.length === 0 ? (
                <CheckCircle className="w-4 h-4" style={{ color: t.success.text }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: t.warning.text }} />
              )}
              <span
                className="text-xs font-semibold"
                style={{ color: result.missing.length === 0 ? t.success.text : t.warning.text }}
              >
                {result.missing.length === 0
                  ? `Toutes les ${result.present.length} tables sont accessibles`
                  : `${result.present.length} tables presentes, ${result.missing.length} manquante(s)`}
              </span>
            </div>
            {result.missing.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {result.missing.map((table) => (
                  <span
                    key={table}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                    style={{ background: t.danger.bg, color: t.danger.text }}
                  >
                    {table}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px]" style={{ color: t.text.tertiary }}>
              Verifie le {new Date(result.checkedAt).toLocaleString('fr-FR')}
            </p>
          </div>
        )}

        {showTables && (
          <div className="space-y-3">
            {Object.entries(grouped).map(([category, tables]) => (
              <div key={category}>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: t.text.secondary }}>
                  {CATEGORY_LABELS[category] ?? category} ({tables.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {tables.map((table) => {
                    const isPresent = !result || result.present.includes(table.name);
                    const isMissing = result?.missing.includes(table.name);
                    return (
                      <span
                        key={table.name}
                        className="px-2 py-0.5 rounded text-[10px] font-mono"
                        style={{
                          background: isMissing ? t.danger.bg : t.surface.secondary,
                          color: isMissing ? t.danger.text : isPresent ? t.text.primary : t.text.tertiary,
                        }}
                        title={table.label}
                      >
                        {table.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  tokens: t,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: t.surface.secondary }}>
      <span style={{ color: t.text.tertiary }}>{icon}</span>
      <div>
        <p className="text-[10px]" style={{ color: t.text.tertiary }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: t.text.primary }}>{value}</p>
      </div>
    </div>
  );
}
