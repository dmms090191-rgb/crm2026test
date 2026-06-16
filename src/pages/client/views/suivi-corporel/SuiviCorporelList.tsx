import { useState, useEffect, useCallback } from 'react';
import { List, Eye, Loader2, CalendarDays, Clock } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import { BodyAssessment } from './types';
import SuiviCorporelDetailModal from './SuiviCorporelDetailModal';

interface Props {
  clientId: string;
  refreshKey: number;
}

export default function SuiviCorporelList({ clientId, refreshKey }: Props) {
  const tokens = useThemeTokens();
  const [assessments, setAssessments] = useState<BodyAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BodyAssessment | null>(null);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_body_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    setAssessments((data as BodyAssessment[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (clientId) fetchAssessments();
  }, [clientId, refreshKey, fetchAssessments]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtVal = (v: number | null, unit?: string) =>
    v != null ? `${v}${unit ? ` ${unit}` : ''}` : '-';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.text.quaternary }} />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div
        className="rounded-2xl border h-full flex flex-col"
        style={{
          background: tokens.card.bg,
          borderColor: tokens.card.border,
          boxShadow: tokens.card.shadow,
        }}
      >
        <ListHeader tokens={tokens} />
        <div className="flex-1 flex items-center justify-center p-8 md:p-14">
          <div className="text-center max-w-xs">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
              }}
            >
              <List className="w-6 h-6" style={{ color: tokens.text.quaternary }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: tokens.text.secondary }}>
              Aucun bilan enregistre pour le moment.
            </p>
            <p className="text-xs" style={{ color: tokens.text.tertiary }}>
              Vos bilans apparaitront ici une fois enregistres.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-2xl border flex flex-col h-full overflow-hidden"
        style={{
          background: tokens.card.bg,
          borderColor: tokens.card.border,
          boxShadow: tokens.card.shadow,
        }}
      >
        <ListHeader tokens={tokens} count={assessments.length} />

        {/* Desktop table */}
        <div className="hidden md:block flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
                {['Date', 'Heure', 'Poids', 'IMC', 'Masse grasse', 'Hydratation', 'Masse musc.', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: tokens.text.quaternary }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {assessments.map((a, i) => (
                <tr
                  key={a.id}
                  className="transition-colors duration-150 cursor-pointer"
                  style={{
                    borderBottom: i < assessments.length - 1 ? `1px solid ${tokens.card.border}` : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = tokens.hover?.bg ?? 'rgba(0,0,0,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setSelected(a)}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: tokens.text.primary }}>
                    {fmtDate(a.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: tokens.text.secondary }}>
                    {fmtTime(a.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#10b981' }}>
                    {fmtVal(a.weight, 'kg')}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: tokens.text.secondary }}>
                    {fmtVal(a.bmi)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: tokens.text.secondary }}>
                    {fmtVal(a.body_fat_percent, '%')}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: tokens.text.secondary }}>
                    {fmtVal(a.water_percent, '%')}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: tokens.text.secondary }}>
                    {fmtVal(a.muscle, 'kg')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(a); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:scale-105"
                      style={{
                        background: 'rgba(59,130,246,0.10)',
                        color: '#3b82f6',
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex-1 overflow-auto p-3 space-y-3">
          {assessments.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full text-left rounded-xl border p-4 transition-all duration-150 active:scale-[0.98]"
              style={{
                background: tokens.card.bg,
                borderColor: tokens.card.border,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
                  <span className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
                    {fmtDate(a.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" style={{ color: tokens.text.quaternary }} />
                  <span className="text-xs" style={{ color: tokens.text.tertiary }}>
                    {fmtTime(a.created_at)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MetricChip label="Poids" value={fmtVal(a.weight, 'kg')} accent="#10b981" tokens={tokens} />
                <MetricChip label="IMC" value={fmtVal(a.bmi)} accent="#3b82f6" tokens={tokens} />
                <MetricChip label="Grasse" value={fmtVal(a.body_fat_percent, '%')} accent="#f59e0b" tokens={tokens} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <SuiviCorporelDetailModal
          assessment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ListHeader({ tokens, count }: { tokens: ReturnType<typeof useThemeTokens>; count?: number }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
      style={{ borderColor: tokens.card.border }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(59,130,246,0.10)' }}
      >
        <List className="w-4 h-4" style={{ color: '#3b82f6' }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>
          Liste des bilans
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: tokens.text.tertiary }}>
          {count != null ? `${count} bilan${count > 1 ? 's' : ''} enregistre${count > 1 ? 's' : ''}` : 'Historique de vos bilans'}
        </p>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  accent,
  tokens,
}: {
  label: string;
  value: string;
  accent: string;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-center"
      style={{ background: `${accent}10` }}
    >
      <p className="text-[10px] font-medium mb-0.5" style={{ color: tokens.text.quaternary }}>
        {label}
      </p>
      <p className="text-xs font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
