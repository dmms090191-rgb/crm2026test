import { Eye, X, CheckCircle2, Circle, Brain, Database, BookOpen } from 'lucide-react';
import { useEffect } from 'react';
import { D } from './brainTheme';
import type { AiCompanyBrain, DaySchedule } from './brainTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  brain: AiCompanyBrain;
}

export default function BrainPreviewModal({ open, onClose, brain }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const hours = brain.opening_hours;
  const hasHours = hours && typeof hours === 'object' && Object.values(hours).some((d: DaySchedule) => d && !d.closed);
  const forbidden = brain.forbidden_actions ?? [];
  const sensitive = brain.sensitive_requests ?? [];

  const rows: { label: string; value: string; ok: boolean }[] = [
    { label: 'Nom plateforme', value: brain.company_name || '-', ok: !!brain.company_name },
    { label: 'Telephone', value: brain.phone || '-', ok: !!brain.phone },
    { label: 'Email', value: brain.email || '-', ok: !!brain.email },
    { label: 'Site web', value: brain.website || '-', ok: !!brain.website },
    { label: 'Localisation', value: [brain.city, brain.country].filter(Boolean).join(', ') || '-', ok: !!(brain.city || brain.country) },
    { label: 'Horaires', value: hasHours ? fmtHours(brain) : 'Non configure', ok: !!hasHours },
    { label: 'FAQ', value: brain.faq?.length ? `${brain.faq.length} question(s)` : 'Aucune', ok: (brain.faq?.length ?? 0) > 0 },
    { label: 'Reponses types', value: brain.official_responses?.length ? `${brain.official_responses.length} reponse(s)` : 'Aucune', ok: (brain.official_responses?.length ?? 0) > 0 },
    { label: 'Ton IA', value: brain.tone?.substring(0, 80) || 'Non configure', ok: !!brain.tone },
    { label: 'Interdictions', value: forbidden.length ? `${forbidden.length} regle(s)` : 'Aucune', ok: forbidden.length > 0 },
    { label: 'Sensibles', value: sensitive.length ? `${sensitive.length} mot(s)-cle(s)` : 'Aucun', ok: sensitive.length > 0 },
  ];

  const filledCount = rows.filter(r => r.ok).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center sm:pt-[5vh] px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ background: D.card, maxHeight: '90vh', boxShadow: `0 -4px 60px rgba(0,0,0,0.4), 0 0 0 1px ${D.cardBorder}` }}>
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent 5%, ${D.accent}, transparent 95%)` }} />

        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: D.surfaceBorder }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5" style={{ borderBottom: `1px solid ${D.surfaceBorder}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}` }}>
              <Eye className="w-4 h-4" style={{ color: D.accent }} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: D.text }}>Apercu du Cerveau IA</h2>
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: D.textMuted }}>{filledCount}/{rows.length} informations renseignees</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${D.textDim}10`, color: D.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
          {brain.business_context_text?.trim() && (
            <div className="rounded-xl p-4 overflow-hidden" style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}` }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Brain className="w-3.5 h-3.5" style={{ color: D.accent }} />
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D.accent }}>Contexte principal</p>
              </div>
              <p className="text-[12px] leading-relaxed font-medium" style={{ color: D.textSecondary }}>
                {brain.business_context_text.trim().substring(0, 280)}{brain.business_context_text.trim().length > 280 ? '...' : ''}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5" style={{ color: D.textMuted }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D.textMuted }}>Donnees disponibles</p>
            </div>
            <div className="space-y-1.5">
              {rows.map(row => (
                <div key={row.label} className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg" style={{ background: row.ok ? D.accentBg : `${D.textDim}06`, border: `1px solid ${row.ok ? D.accentBorder : `${D.textDim}10`}` }}>
                  {row.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: D.green }} />
                    : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: D.textDim }} />
                  }
                  <span className="text-[11px] font-bold w-24 flex-shrink-0" style={{ color: D.textMuted }}>{row.label}</span>
                  <span className="text-[11px] truncate font-medium" style={{ color: row.ok ? D.text : D.textMuted }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge sections */}
          {(brain.knowledge_sections ?? []).filter(s => s.content.trim()).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5" style={{ color: D.textMuted }} />
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D.textMuted }}>Base de connaissances ({(brain.knowledge_sections ?? []).filter(s => s.content.trim()).length} sections)</p>
              </div>
              <div className="space-y-1.5">
                {(brain.knowledge_sections ?? []).filter(s => s.content.trim()).map(sec => (
                  <div key={sec.key} className="px-3.5 py-2.5 rounded-lg" style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}` }}>
                    <p className="text-[11px] font-bold mb-1" style={{ color: D.text }}>{sec.title}</p>
                    <p className="text-[10px] font-medium line-clamp-2" style={{ color: D.textSecondary }}>{sec.content.substring(0, 120)}{sec.content.length > 120 ? '...' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-center pt-2 font-medium" style={{ color: D.textDim }}>
            Ces donnees composent le contexte envoye a l'IA pour chaque reponse.
          </p>
        </div>
      </div>
    </div>
  );
}

function fmtHours(brain: AiCompanyBrain): string {
  const h = brain.opening_hours;
  if (!h || typeof h !== 'object') return '';
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const open = days.filter(d => h[d] && !h[d].closed);
  if (open.length === 0) return '';
  const first = h[open[0]];
  return `${open.length}j/sem (${first.open}-${first.close})`;
}
