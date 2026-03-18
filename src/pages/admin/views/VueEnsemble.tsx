import { UserPlus, Tag, MessageCircle, MessageSquare, TrendingUp, ArrowUpRight, Activity } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface StatCardProps {
  label: string;
  sublabel: string;
  count: number;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  trend?: string;
}

function StatCard({ label, sublabel, count, icon, accentColor, glowColor, trend }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid rgba(255,255,255,0.06)`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: glowColor }}
      />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-0.5" style={{ color: accentColor }}>{label}</p>
          <p className="text-xs text-slate-600 uppercase tracking-wider">{sublabel}</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${glowColor}18`, color: accentColor, boxShadow: `0 0 16px ${glowColor}30` }}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-4xl font-bold text-white tabular-nums">{count}</p>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium mb-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function isSansStatut(statut: string | null | undefined, knownStatuts: Set<string>): boolean {
  if (!statut || statut === '') return true;
  return !knownStatuts.has(statut);
}

export default function VueEnsemble() {
  const [pendingCount, setPendingCount] = useState(0);
  const [sansStatutCount, setSansStatutCount] = useState(0);
  const [knownStatuts, setKnownStatuts] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(async () => {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, []);

  const fetchSansStatut = useCallback(async () => {
    const { data } = await supabase
      .from('leads_sans_statut_count')
      .select('count')
      .maybeSingle();
    setSansStatutCount(data ? Number(data.count) : 0);
  }, []);

  useEffect(() => {
    fetchPending();
    fetchSansStatut();

    supabase.from('statuts').select('nom').then(({ data }) => {
      setKnownStatuts(new Set((data ?? []).map((s: { nom: string }) => s.nom)));
    });
  }, [fetchPending, fetchSansStatut]);

  useEffect(() => {
    const ts = Date.now();

    const regChannel = supabase
      .channel(`vue-ensemble-reg-${ts}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, (payload) => {
        if ((payload.new as { status: string }).status === 'pending') {
          setPendingCount(prev => prev + 1);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations' }, (payload) => {
        const oldPending = (payload.old as { status: string }).status === 'pending';
        const newPending = (payload.new as { status: string }).status === 'pending';
        if (oldPending && !newPending) setPendingCount(prev => Math.max(0, prev - 1));
        else if (!oldPending && newPending) setPendingCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'registrations' }, (payload) => {
        if ((payload.old as { status: string }).status === 'pending') {
          setPendingCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    const leadsChannel = supabase
      .channel(`vue-ensemble-leads-${ts}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new as { statut?: string | null };
        setKnownStatuts(current => {
          if (isSansStatut(lead.statut, current)) {
            setSansStatutCount(prev => prev + 1);
          }
          return current;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.old as { statut?: string | null };
        setKnownStatuts(current => {
          if (isSansStatut(lead.statut, current)) {
            setSansStatutCount(prev => Math.max(0, prev - 1));
          }
          return current;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const oldLead = payload.old as { statut?: string | null };
        const newLead = payload.new as { statut?: string | null };
        setKnownStatuts(current => {
          const wasWithout = isSansStatut(oldLead.statut, current);
          const isWithout = isSansStatut(newLead.statut, current);
          if (wasWithout && !isWithout) setSansStatutCount(prev => Math.max(0, prev - 1));
          else if (!wasWithout && isWithout) setSansStatutCount(prev => prev + 1);
          return current;
        });
      })
      .subscribe();

    const statutsChannel = supabase
      .channel(`vue-ensemble-statuts-${ts}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuts' }, async () => {
        const { data } = await supabase.from('statuts').select('nom');
        const newSet = new Set((data ?? []).map((s: { nom: string }) => s.nom));
        setKnownStatuts(newSet);
        fetchSansStatut();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(regChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(statutsChannel);
    };
  }, [fetchSansStatut]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Vue d'ensemble</h2>
          <p className="text-slate-600 text-xs mt-0.5">Tableau de bord en temps réel</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-emerald-400 font-medium" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <Activity className="w-3 h-3" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="En attente"
          sublabel="Inscriptions"
          count={pendingCount}
          accentColor="#22d3ee"
          glowColor="#22d3ee"
          icon={<UserPlus className="w-4 h-4" />}
        />
        <StatCard
          label="Sans statut"
          sublabel="Leads actifs"
          count={sansStatutCount}
          accentColor="#2dd4bf"
          glowColor="#2dd4bf"
          icon={<Tag className="w-4 h-4" />}
        />
        <StatCard
          label="Messages reçus"
          sublabel="Chat client"
          count={0}
          accentColor="#60a5fa"
          glowColor="#60a5fa"
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Messages reçus"
          sublabel="Chat vendeur"
          count={0}
          accentColor="#f59e0b"
          glowColor="#f59e0b"
          icon={<MessageSquare className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div
          className="col-span-2 rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-sm font-semibold">Performance mensuelle</h3>
            <TrendingUp className="w-4 h-4 text-cyan-500/40" />
          </div>
          <div className="flex items-end gap-2 h-24">
            {[20, 45, 28, 80, 52, 34, 60, 75, 40, 90, 55, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                <div
                  className="rounded-sm w-full transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    background: i === 11
                      ? 'linear-gradient(180deg, #22d3ee, #0ea5e9)'
                      : 'rgba(255,255,255,0.07)',
                    boxShadow: i === 11 ? '0 0 12px rgba(34,211,238,0.4)' : 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'].map(m => (
              <span key={m} className="text-[9px] text-slate-700 flex-1 text-center">{m}</span>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h3 className="text-white text-sm font-semibold mb-4">Activité rapide</h3>
          <div className="space-y-3">
            {[
              { label: 'Leads qualifiés', val: 0, color: '#22d3ee' },
              { label: 'RDV confirmés', val: 0, color: '#2dd4bf' },
              { label: 'Ventes conclues', val: 0, color: '#34d399' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-xs font-bold text-white">{item.val}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${item.val}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Taux de conversion</p>
            <p className="text-2xl font-bold text-white">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}
