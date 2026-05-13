import { CheckCircle, AlertCircle, AlertTriangle, Download, X, FileStack, Database } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { RestoreReport as Report } from './useRestoreCrm';

interface Props {
  report: Report;
  onClose: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}

export function RestoreReportPanel({ report, onClose, tokens: t }: Props) {
  const isSimulation = report.mode === 'simulation';
  const hasErrors = report.totalErrors > 0;
  const hasFkWarnings = report.fkWarnings.length > 0;
  const tablesOk = report.tables.filter((tr) => !tr.skipped && tr.errors.length === 0 && tr.rows > 0);
  const tablesWithProblems = report.tables.filter((tr) => tr.errors.length > 0);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${report.mode}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-xl overflow-hidden min-w-0"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4"
        style={{ borderBottom: `1px solid ${t.surface.border}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {hasErrors ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: t.danger.text }} />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: t.success.text }} />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>
              {isSimulation ? 'Simulation terminee' : 'Restauration terminee'}
            </h3>
            {isSimulation && (
              <p className="text-[11px]" style={{ color: t.success.text }}>
                Aucune ecriture en base effectuee
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: t.accent.bg, color: t.accent.solid }}
            title="Telecharger le rapport JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Telecharger</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: t.text.tertiary }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatBox label="Tables dans le fichier" value={report.tablesInFile} tokens={t} />
          <StatBox label="Tables avec donnees" value={report.tablesWithData} tokens={t} />
          <StatBox label="Tables vides" value={report.tablesEmpty.length} tokens={t} muted />
          <StatBox label="Total lignes" value={report.totalRows} tokens={t} />
          <StatBox label="Erreurs" value={report.totalErrors} tokens={t} danger={report.totalErrors > 0} />
        </div>

        {/* Second row of stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatBox label="Tables restaurables" value={report.tablesWithData} tokens={t} accent />
          <StatBox label="Tables OK" value={tablesOk.length} tokens={t} success />
          <StatBox label="Avec probleme" value={tablesWithProblems.length} tokens={t} danger={tablesWithProblems.length > 0} />
          <StatBox label="Warnings FK" value={report.fkWarnings.length} tokens={t} warning={report.fkWarnings.length > 0} />
        </div>

        {/* Tables absentes */}
        {report.tablesAbsent.length > 0 && (
          <InfoSection
            icon={<AlertCircle className="w-3.5 h-3.5" />}
            title={`Tables absentes du fichier (${report.tablesAbsent.length})`}
            variant="warning"
            tokens={t}
          >
            <div className="flex flex-wrap gap-1">
              {report.tablesAbsent.map((table) => (
                <span key={table} className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: t.warning.bg, color: t.warning.text }}>
                  {table}
                </span>
              ))}
            </div>
          </InfoSection>
        )}

        {/* Tables vides */}
        {report.tablesEmpty.length > 0 && (
          <InfoSection
            icon={<FileStack className="w-3.5 h-3.5" />}
            title={`Tables vides ignorees (${report.tablesEmpty.length})`}
            variant="neutral"
            tokens={t}
          >
            <div className="flex flex-wrap gap-1">
              {report.tablesEmpty.map((table) => (
                <span key={table} className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: t.surface.secondary, color: t.text.tertiary }}>
                  {table}
                </span>
              ))}
            </div>
          </InfoSection>
        )}

        {/* FK Warnings */}
        {hasFkWarnings && (
          <InfoSection
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            title={`Incoherences FK (${report.fkWarnings.length})`}
            variant="warning"
            tokens={t}
          >
            <div className="space-y-1">
              {report.fkWarnings.map((w, i) => (
                <p key={i} className="text-[11px] leading-relaxed break-words" style={{ color: t.warning.text }}>
                  <span className="font-mono break-all">{w.table}.{w.column}</span> → <span className="font-mono break-all">{w.referencedTable}</span> :
                  {' '}{w.missingCount} reference(s) manquante(s)
                  {w.sampleValues.length > 0 && (
                    <span className="opacity-70"> (ex: {w.sampleValues.slice(0, 3).join(', ')})</span>
                  )}
                </p>
              ))}
            </div>
          </InfoSection>
        )}

        {/* Detail tables with data */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3.5 h-3.5" style={{ color: t.text.secondary }} />
            <p className="text-xs font-medium" style={{ color: t.text.secondary }}>
              Tables analysees ({tablesOk.length + tablesWithProblems.length})
            </p>
          </div>
          {report.tables
            .filter((tr) => !tr.skipped && tr.rows > 0)
            .map((tr) => (
              <div
                key={tr.table}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg min-w-0"
                style={{ background: t.surface.secondary }}
              >
                {tr.errors.length > 0 ? (
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.danger.text }} />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.success.text }} />
                )}
                <span className="text-xs font-mono flex-1 min-w-0 truncate" style={{ color: t.text.primary }}>{tr.table}</span>
                <span className="text-[11px] flex-shrink-0 whitespace-nowrap" style={{ color: t.text.tertiary }}>
                  {tr.rows.toLocaleString('fr-FR')} ligne{tr.rows > 1 ? 's' : ''}
                </span>
              </div>
            ))}
        </div>

        {/* Errors detail */}
        {report.tables.some((tr) => tr.errors.length > 0) && (
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-medium" style={{ color: t.danger.text }}>Erreurs</p>
            {report.tables
              .filter((tr) => tr.errors.length > 0)
              .map((tr) => (
                <div key={tr.table} className="space-y-0.5 min-w-0">
                  <p className="text-[11px] font-mono font-semibold break-all" style={{ color: t.text.primary }}>
                    {tr.table}
                  </p>
                  {tr.errors.map((err, i) => (
                    <p key={i} className="text-[11px] pl-3 break-words" style={{ color: t.danger.text }}>{err}</p>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tokens: t,
  danger,
  warning,
  success,
  accent,
  muted,
}: {
  label: string;
  value: number;
  tokens: ReturnType<typeof useThemeTokens>;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  let color = t.text.primary;
  if (danger) color = t.danger.text;
  else if (warning) color = t.warning.text;
  else if (success) color = t.success.text;
  else if (accent) color = t.accent.solid;
  else if (muted) color = t.text.tertiary;

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: t.surface.secondary }}>
      <p className="text-[10px] leading-tight" style={{ color: t.text.tertiary }}>{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        {value.toLocaleString('fr-FR')}
      </p>
    </div>
  );
}

function InfoSection({
  icon,
  title,
  variant,
  tokens: t,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  variant: 'warning' | 'neutral';
  tokens: ReturnType<typeof useThemeTokens>;
  children: React.ReactNode;
}) {
  const bg = variant === 'warning' ? t.warning.bg : t.surface.secondary;
  const border = variant === 'warning' ? t.warning.border : t.surface.border;
  const titleColor = variant === 'warning' ? t.warning.text : t.text.secondary;

  return (
    <div className="rounded-lg px-4 py-3 space-y-2" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center gap-2">
        <span style={{ color: titleColor }}>{icon}</span>
        <span className="text-xs font-semibold" style={{ color: titleColor }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
