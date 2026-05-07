import { useState } from 'react';
import { FileCode2, ChevronDown, Clock, Copy, Check } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { auditSnapshot } from './auditMockData';

const THRESHOLD = 300;

function shortPath(fullPath: string): string {
  const parts = fullPath.replace(/^src\//, '').split('/');
  if (parts.length <= 2) return parts.join('/');
  return parts.slice(-2).join('/');
}

function overflowColor(overflow: number): { text: string; bg: string; bar: string } {
  if (overflow > 300) return { text: '#f87171', bg: 'rgba(248,113,113,0.08)', bar: '#f87171' };
  if (overflow > 100) return { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', bar: '#fbbf24' };
  return { text: '#34d399', bg: 'rgba(52,211,153,0.08)', bar: '#34d399' };
}

function pctColor(pct: number, tokens: ReturnType<typeof useThemeTokens>) {
  if (pct > 20) return tokens.danger.text;
  if (pct > 10) return tokens.warning.text;
  return tokens.success.text;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function FileSizeMetricsBlock() {
  const tokens = useThemeTokens();

  const largeFiles = auditSnapshot.largeFiles ?? [];
  const totalFiles = auditSnapshot.totalFilesAnalyzed ?? 0;
  const totalLines = auditSnapshot.totalLinesAnalyzed ?? 0;
  const totalOverflow = auditSnapshot.totalOverflowLines ?? 0;
  const largeCount = auditSnapshot.largeFileCount ?? largeFiles.length;

  const pctFiles = totalFiles > 0 ? Math.round((largeCount / totalFiles) * 100) : 0;
  const pctOverflow = totalLines > 0 ? ((totalOverflow / totalLines) * 100).toFixed(1) : '0';

  const sorted = [...largeFiles].sort((a, b) => a.lines - b.lines);
  const maxLines = sorted.length > 0 ? sorted[sorted.length - 1].lines : THRESHOLD;

  const defaultOpen = sorted.length <= 10;
  const [listOpen, setListOpen] = useState(defaultOpen);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const maxOverflow = sorted.length > 0 ? (sorted[sorted.length - 1].overflow ?? (sorted[sorted.length - 1].lines - THRESHOLD)) : 0;

  function severityEmoji(overflow: number): string {
    if (overflow > 300) return '\uD83D\uDD34';
    if (overflow > 100) return '\uD83D\uDFE1';
    return '\uD83D\uDFE2';
  }

  function textBar(overflow: number): string {
    if (maxOverflow <= 0) return '\u2588';
    const ratio = Math.max(overflow / maxOverflow, 0.05);
    const len = Math.round(ratio * 8);
    return '\u2588'.repeat(Math.max(len, 1));
  }

  function buildReportText(): string {
    const lines: string[] = [
      'Audit technique \u2014 Taille des fichiers',
      `Dernier analyze : ${formatDate(auditSnapshot.generatedAt)}`,
      `Seuil : ${THRESHOLD} lignes`,
      '',
      `Fichiers analys\u00E9s : ${totalFiles}`,
      `Fichiers au-dessus de ${THRESHOLD} lignes : ${largeCount}`,
      `% des fichiers au-dessus de ${THRESHOLD} lignes : ${pctFiles}%`,
      `Lignes totales : ${totalLines}`,
      `Lignes au-dessus du seuil : ${totalOverflow}`,
      `% du code au-dessus du seuil : ${pctOverflow}%`,
      '',
      'Fichiers en d\u00E9passement :',
    ];
    for (const f of sorted) {
      const ov = f.overflow ?? (f.lines - THRESHOLD);
      lines.push(`- ${shortPath(f.file)} \u2014 ${f.lines} lignes (+${ov}) ${severityEmoji(ov)} ${textBar(ov)}`);
    }
    return lines.join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  }

  const kpis = [
    { label: 'Fichiers analyses', value: totalFiles.toLocaleString('fr-FR'), color: tokens.text.primary },
    { label: `Fichiers au-dessus de ${THRESHOLD} lignes`, value: largeCount.toString(), color: largeCount > 0 ? tokens.warning.text : tokens.success.text },
    { label: `% des fichiers au-dessus de ${THRESHOLD} lignes`, value: `${pctFiles}%`, color: pctColor(pctFiles, tokens) },
    { label: 'Lignes totales', value: totalLines.toLocaleString('fr-FR'), color: tokens.text.primary },
    { label: 'Lignes au-dessus du seuil', value: totalOverflow.toLocaleString('fr-FR'), color: totalOverflow > 0 ? tokens.warning.text : tokens.success.text },
    { label: '% du code au-dessus du seuil', value: `${pctOverflow}%`, color: pctColor(parseFloat(String(pctOverflow)), tokens) },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
    >
      <div className="px-3 md:px-5 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(56,189,248,0.10)', color: '#38bdf8' }}
          >
            <FileCode2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
            Taille des fichiers
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-md font-medium"
            style={{ background: tokens.surface.hover, color: tokens.text.quaternary }}
          >
            Seuil : {THRESHOLD} lignes
          </span>
          <button
            onClick={handleCopy}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200"
            style={{
              background: copyState === 'copied' ? 'rgba(52,211,153,0.10)' : copyState === 'error' ? 'rgba(248,113,113,0.10)' : tokens.surface.hover,
              color: copyState === 'copied' ? '#34d399' : copyState === 'error' ? '#f87171' : tokens.text.quaternary,
            }}
            title="Copier le rapport"
          >
            {copyState === 'copied' ? (
              <><Check className="w-3 h-3" /><span>Copie</span></>
            ) : copyState === 'error' ? (
              <span>Erreur</span>
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg px-2.5 md:px-3 py-2 md:py-2.5"
              style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}
            >
              <div className="text-base md:text-lg font-bold tabular-nums leading-tight" style={{ color: kpi.color }}>
                {kpi.value}
              </div>
              <div className="text-[10px] md:text-xs mt-0.5 leading-snug" style={{ color: tokens.text.quaternary }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="px-3 md:px-5 pb-4">
          <button
            onClick={() => setListOpen((v) => !v)}
            className="w-full flex items-center gap-2 py-2 text-left transition-colors duration-150"
          >
            <ChevronDown
              className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
              style={{ color: tokens.text.quaternary, transform: listOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
            <span className="text-xs font-medium" style={{ color: tokens.text.tertiary }}>
              {sorted.length} fichier{sorted.length > 1 ? 's' : ''} en depassement
            </span>
          </button>

          {listOpen && (
            <div className="flex flex-col gap-1.5 mt-1 max-h-[400px] overflow-y-auto pr-1">
              {sorted.map((f) => {
                const ov = f.overflow ?? (f.lines - THRESHOLD);
                const colors = overflowColor(ov);
                const barWidth = Math.min(100, ((f.lines - THRESHOLD) / (maxLines - THRESHOLD)) * 100) || 5;

                return (
                  <div
                    key={f.file}
                    className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg"
                    style={{ background: colors.bg, border: `1px solid ${tokens.surface.borderLight}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] md:text-xs font-medium truncate"
                          style={{ color: tokens.text.secondary }}
                          title={f.file}
                        >
                          {shortPath(f.file)}
                        </span>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                          <span className="text-[11px] md:text-xs tabular-nums" style={{ color: tokens.text.tertiary }}>
                            {f.lines}l
                          </span>
                          <span className="text-[11px] md:text-xs font-semibold tabular-nums" style={{ color: colors.text }}>
                            +{ov}
                          </span>
                        </div>
                      </div>
                      <div
                        className="h-1 rounded-full mt-1.5 overflow-hidden"
                        style={{ background: tokens.surface.hover }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%`, background: colors.bar }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        className="px-3 md:px-5 py-2.5 flex items-center gap-1.5 border-t"
        style={{ borderColor: tokens.surface.borderLight }}
      >
        <Clock className="w-3 h-3 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
        <span className="text-[10px] md:text-xs" style={{ color: tokens.text.quaternary }}>
          Donnees calculees lors du dernier analyze ({formatDate(auditSnapshot.generatedAt)})
        </span>
      </div>
    </div>
  );
}
