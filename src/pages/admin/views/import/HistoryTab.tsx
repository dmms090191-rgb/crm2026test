import { Clock, FileText, Download, Calendar, Users, ChevronRight } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ImportRecord } from './importLeadsTypes';

interface HistoryTabProps {
  history: ImportRecord[];
  historyLoading: boolean;
  onPreview: (record: ImportRecord) => void;
}

export default function HistoryTab({ history, historyLoading, onPreview }: HistoryTabProps) {
  const tokens = useThemeTokens();

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: tokens.card.border }}>
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: tokens.table.headerBorder }}>
        <Clock className="w-4 h-4" style={{ color: tokens.accent.text }} />
        <h3 className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Historique des imports</h3>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold ml-auto" style={{ background: tokens.accent.bg, color: tokens.accent.text }}>
          {history.length}
        </span>
      </div>

      {historyLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: tokens.accent.text }} />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tokens.surface.tertiary }}>
            <Download className="w-5 h-5" style={{ color: tokens.text.quaternary }} />
          </div>
          <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun import effectue</p>
        </div>
      ) : (
        <div>
          {history.map((record, idx) => (
            <div
              key={record.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer group"
              style={{ borderBottom: idx < history.length - 1 ? tokens.table.rowBorder : 'none' }}
              onClick={() => onPreview(record)}
              onMouseEnter={e => e.currentTarget.style.background = tokens.table.rowHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tokens.accent.bg, border: tokens.accent.border }}>
                <FileText className="w-4 h-4" style={{ color: tokens.accent.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: tokens.text.secondary }}>{record.file_name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: tokens.text.quaternary }}>
                    <Calendar className="w-3 h-3" />
                    {new Date(record.imported_at).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: tokens.text.quaternary }}>
                    <Clock className="w-3 h-3" />
                    {new Date(record.imported_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {record.import_mode && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary, border: tokens.surface.borderLight }}>
                      {record.import_mode}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {record.new_leads_count > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: tokens.success.bg, color: tokens.success.text, border: tokens.success.border }}>
                    <Users className="w-2.5 h-2.5" />
                    +{record.new_leads_count}
                  </span>
                )}
                {record.duplicates_count > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
                    {record.duplicates_count} doublons
                  </span>
                )}
                {record.errors_count > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}>
                    {record.errors_count} erreurs
                  </span>
                )}
                <ChevronRight className="w-4 h-4 transition-colors" style={{ color: tokens.label.hint }} onMouseEnter={e => e.currentTarget.style.color = tokens.text.tertiary} onMouseLeave={e => e.currentTarget.style.color = tokens.label.hint} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
