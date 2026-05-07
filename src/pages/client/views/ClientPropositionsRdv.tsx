import { useState, useEffect, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import ClientRdvCard from './ClientRdvCard';

interface RdvProposal {
  id: string;
  vendor_id?: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  proposed_date: string;
  proposed_time: string;
  notes: string;
  status: string;
  motif: string;
  description: string;
  created_by_role: string;
  created_by_id?: string | null;
  target_role: string;
  responded_at?: string | null;
  responded_by?: string | null;
  created_at: string;
  appointment_utc?: string | null;
  source_timezone?: string;
  created_by_name?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En attente',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)'  },
  confirmed: { label: 'Confirme',    color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
  cancelled: { label: 'Annule',      color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  done:      { label: 'Termine',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const FILTERS = ['Tous', 'En attente', 'Confirme', 'Annule', 'Termine'];
const filterToStatus: Record<string, string> = {
  'En attente': 'pending',
  'Confirme': 'confirmed',
  'Annule': 'cancelled',
  'Termine': 'done',
};

interface ClientPropositionsRdvProps {
  clientEmail: string;
  onMount?: () => void;
}

export default function ClientPropositionsRdv({ clientEmail, onMount }: ClientPropositionsRdvProps) {
  const tokens = useThemeTokens();
  const { timezone: CLIENT_TZ } = useTimezone();
  const [rdvs, setRdvs] = useState<RdvProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: byCol } = await supabase
      .from('leads')
      .select('id')
      .eq('email', clientEmail);
    const { data: byJson } = await supabase
      .from('leads')
      .select('id')
      .is('email', null)
      .eq('data->>Email', clientEmail);
    const allLeads = [...(byCol ?? []), ...(byJson ?? [])];
    const seenIds = new Set<string>();
    const leadIds = allLeads.filter(l => { if (seenIds.has(l.id)) return false; seenIds.add(l.id); return true; }).map(l => l.id);

    let results: RdvProposal[] = [];
    const { data: byEmail } = await supabase
      .from('rdv_proposals')
      .select('*')
      .eq('lead_email', clientEmail)
      .order('proposed_date', { ascending: true });
    if (byEmail) results = byEmail as RdvProposal[];

    if (leadIds.length > 0) {
      const { data: byLeadId } = await supabase
        .from('rdv_proposals')
        .select('*')
        .in('lead_id', leadIds)
        .order('proposed_date', { ascending: true });
      if (byLeadId) {
        const existingIds = new Set(results.map(r => r.id));
        for (const r of byLeadId as RdvProposal[]) {
          if (!existingIds.has(r.id)) results.push(r);
        }
      }
    }
    results.sort((a, b) => a.proposed_date.localeCompare(b.proposed_date));
    setRdvs(results);
    setLoading(false);
  }, [clientEmail]);

  useEffect(() => { load(); }, [load]);

  const filtered = rdvs.filter(r => {
    if (filter === 'Tous') return true;
    return r.status === filterToStatus[filter];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  async function handleAccept(id: string) {
    const now = new Date().toISOString();
    const rdv = rdvs.find(r => r.id === id);
    let vendorId: string | null = null;
    if (rdv && !rdv.vendor_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('vendor_id')
        .eq('email', clientEmail)
        .maybeSingle();
      if (lead?.vendor_id) vendorId = lead.vendor_id;
    }
    const updatePayload: Record<string, unknown> = { status: 'confirmed', responded_at: now, responded_by: 'client' };
    if (vendorId) updatePayload.vendor_id = vendorId;
    await supabase.from('rdv_proposals').update(updatePayload).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed', responded_at: now, responded_by: 'client', ...(vendorId ? { vendor_id: vendorId } : {}) } : r));
  }

  async function handleRefuse(id: string) {
    const now = new Date().toISOString();
    await supabase.from('rdv_proposals').update({ status: 'cancelled', responded_at: now, responded_by: 'client' }).eq('id', id);
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', responded_at: now, responded_by: 'client' } : r));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Propositions RDV</h2>
        <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>{rdvs.length} proposition{rdvs.length !== 1 ? 's' : ''} au total</p>
      </div>

      {rdvs.length === 0 && !loading && (
        <div
          className="rounded-2xl p-6 flex items-center gap-4"
          style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)' }}
        >
          <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Aucune proposition de rendez-vous</p>
            <p className="text-xs" style={{ color: tokens.text.tertiary }}>Votre conseiller vous proposera bientot des creneaux.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        <div className="flex items-center gap-2 px-5 py-3.5 flex-wrap" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
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
                  ? { background: cfg ? cfg.bg : 'rgba(255,255,255,0.08)', color: cfg ? cfg.color : tokens.text.primary, border: `1px solid ${cfg ? cfg.border : tokens.surface.border}` }
                  : { background: 'transparent', color: tokens.text.tertiary, border: `1px solid ${tokens.surface.borderLight}` }
                }
              >
                {f}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.surface.border, borderTopColor: '#34d399' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.surface.secondary }}>
              <CalendarDays className="w-5 h-5" style={{ color: tokens.text.quaternary }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune proposition pour ce filtre</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: tokens.surface.borderLight }}>
            {filtered.map(rdv => (
              <ClientRdvCard
                key={rdv.id}
                rdv={rdv}
                tokens={tokens}
                timezone={CLIENT_TZ}
                todayStr={todayStr}
                statusConfig={statusConfig}
                onAccept={handleAccept}
                onRefuse={handleRefuse}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>{filtered.length} proposition{filtered.length !== 1 ? 's' : ''} affichee{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}
