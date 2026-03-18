import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, Phone, Mail } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface RdvProposal {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  proposed_date: string;
  proposed_time: string;
  notes: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)'  },
  confirmed: { label: 'Confirmé',    color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
  cancelled: { label: 'Annulé',      color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  done:      { label: 'Terminé',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const FILTERS = ['Tous', 'En attente', 'Confirmé', 'Annulé', 'Terminé'];
const filterToStatus: Record<string, string> = {
  'En attente': 'pending',
  'Confirmé': 'confirmed',
  'Annulé': 'cancelled',
  'Terminé': 'done',
};

interface ClientPropositionsRdvProps {
  clientEmail: string;
}

export default function ClientPropositionsRdv({ clientEmail }: ClientPropositionsRdvProps) {
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rdv_proposals')
      .select('*')
      .eq('lead_email', clientEmail)
      .order('proposed_date', { ascending: true });
    if (data) setRdvs(data as RdvProposal[]);
    setLoading(false);
  }, [clientEmail]);

  useEffect(() => { load(); }, [load]);

  const filtered = rdvs.filter(r => {
    if (filter === 'Tous') return true;
    return r.status === filterToStatus[filter];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-bold">Propositions RDV</h2>
        <p className="text-slate-600 text-xs mt-0.5">{rdvs.length} proposition{rdvs.length !== 1 ? 's' : ''} au total</p>
      </div>

      {rdvs.length === 0 && !loading && (
        <div
          className="rounded-2xl p-6 flex items-center gap-4"
          style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)' }}
        >
          <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
          <div>
            <p className="text-sm font-semibold text-white">Aucune proposition de rendez-vous</p>
            <p className="text-xs text-slate-500">Votre conseiller vous proposera bientôt des créneaux.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 px-5 py-3.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {FILTERS.map(f => {
            const active = filter === f;
            const statusKey = filterToStatus[f];
            const cfg = statusKey ? statusConfig[statusKey] : null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={active
                  ? { background: cfg ? cfg.bg : 'rgba(255,255,255,0.08)', color: cfg ? cfg.color : '#fff', border: `1px solid ${cfg ? cfg.border : 'rgba(255,255,255,0.15)'}` }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.05)' }
                }
              >
                {f}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <CalendarDays className="w-5 h-5 text-slate-700" />
            </div>
            <p className="text-slate-600 text-sm">Aucune proposition pour ce filtre</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {filtered.map(rdv => {
              const cfg = statusConfig[rdv.status] ?? statusConfig.pending;
              const isPast = rdv.proposed_date < todayStr;
              return (
                <div
                  key={rdv.id}
                  className="flex items-start gap-4 px-5 py-4 transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <CalendarDays className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className={`text-sm font-semibold ${isPast && rdv.status !== 'done' ? 'text-slate-500' : 'text-white'}`}>
                        {rdv.lead_name}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays className="w-3 h-3 text-slate-600" />
                        <span>
                          {new Date(rdv.proposed_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {rdv.proposed_time && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span>{rdv.proposed_time}</span>
                        </div>
                      )}
                    </div>

                    {(rdv.lead_phone || rdv.lead_email) && (
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {rdv.lead_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone className="w-3 h-3" />
                            <span>{rdv.lead_phone}</span>
                          </div>
                        )}
                        {rdv.lead_email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="w-3 h-3" />
                            <span>{rdv.lead_email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {rdv.notes && (
                      <p className="text-xs text-slate-600 mt-1.5 italic">{rdv.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-slate-700">{filtered.length} proposition{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}
