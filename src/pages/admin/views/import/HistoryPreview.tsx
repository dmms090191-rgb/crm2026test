import { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ImportRecord } from './importLeadsTypes';

interface HistoryPreviewProps {
  record: ImportRecord;
  onClose: () => void;
}

export default function HistoryPreview({ record, onClose }: HistoryPreviewProps) {
  const tokens = useThemeTokens();
  const [leads, setLeads] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('leads')
        .select('data, prenom, nom, email, telephone')
        .eq('import_id', record.id)
        .order('imported_at', { ascending: true });

      setLeads((data ?? []).map((d: { data: Record<string, string>; prenom: string | null; nom: string | null; email: string | null; telephone: string | null }) => {
        const row = { ...d.data };
        if (d.prenom) row['Prenom'] = d.prenom;
        if (d.nom) row['Nom'] = d.nom;
        if (d.email) row['Email'] = d.email;
        if (d.telephone) row['Telephone'] = d.telephone;
        return row;
      }));
      setLoading(false);
    })();
  }, [record.id]);

  const cols = record.columns.length > 0 ? record.columns : ['Prenom', 'Nom', 'Email', 'Telephone'];

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ background: tokens.modal.overlayBg }}>
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.surface.secondary, border: tokens.surface.border, maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: tokens.surface.borderLight }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tokens.accent.bg, border: tokens.accent.border }}>
              <FileText className="w-4 h-4" style={{ color: tokens.accent.text }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>{record.file_name}</h3>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs" style={{ color: tokens.text.quaternary }}>{record.lead_count} leads · {new Date(record.imported_at).toLocaleDateString('fr-FR')} {new Date(record.imported_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                {record.import_mode && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: tokens.accent.border }}>
                    {record.import_mode}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {record.new_leads_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: tokens.success.bg, color: tokens.success.text, border: tokens.success.border }}>
                +{record.new_leads_count} nouveaux
              </span>
            )}
            {record.duplicates_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
                {record.duplicates_count} doublons
              </span>
            )}
            {record.errors_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}>
                {record.errors_count} erreurs
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = tokens.surface.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-4 h-4" style={{ color: tokens.text.tertiary }} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: tokens.accent.text }} />
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: tokens.table.headerBorder }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.1em] uppercase w-10" style={{ color: tokens.table.headerText }}>#</th>
                  {cols.map(col => (
                    <th key={col} className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.1em] uppercase whitespace-nowrap" style={{ color: tokens.table.headerText }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((row, i) => (
                  <tr key={i} style={{ borderBottom: tokens.table.rowBorder }} className="transition-colors" onMouseEnter={e => e.currentTarget.style.background = tokens.table.rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-2.5" style={{ color: tokens.label.hint }}>{i + 1}</td>
                    {cols.map(col => (
                      <td key={col} className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: tokens.table.cellText }}>{row[col] || '\u2014'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
