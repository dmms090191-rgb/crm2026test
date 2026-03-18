import { useState, useEffect, useCallback } from 'react';
import { Tag, MessageCircle, MessageSquare, TrendingUp, ArrowUpRight, Activity, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface StatCardProps {
  label: string;
  sublabel: string;
  count: number | string;
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
        border: '1px solid rgba(255,255,255,0.06)',
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

interface VendorVueEnsembleProps {
  vendorId: string | null;
}

export default function VendorVueEnsemble({ vendorId }: VendorVueEnsembleProps) {
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsGagnes, setLeadsGagnes] = useState(0);
  const [leadsActifs, setLeadsActifs] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!vendorId) {
      setTotalLeads(0);
      setLeadsGagnes(0);
      setLeadsActifs(0);
      return;
    }

    const [totalRes, gagnesRes, actifsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('statut', 'Gagné'),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .neq('actif', false),
    ]);

    setTotalLeads(totalRes.count ?? 0);
    setLeadsGagnes(gagnesRes.count ?? 0);
    setLeadsActifs(actifsRes.count ?? 0);
  }, [vendorId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (!vendorId) return;

    const ts = Date.now();
    const channel = supabase
      .channel(`vendor-ensemble-${vendorId}-${ts}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new as { vendor_id?: string | null; statut?: string | null; actif?: boolean | null };
        if (lead.vendor_id !== vendorId) return;
        setTotalLeads(prev => prev + 1);
        if (lead.actif !== false) setLeadsActifs(prev => prev + 1);
        if (lead.statut === 'Gagné') setLeadsGagnes(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.old as { vendor_id?: string | null; statut?: string | null; actif?: boolean | null };
        if (lead.vendor_id !== vendorId) return;
        setTotalLeads(prev => Math.max(0, prev - 1));
        if (lead.actif !== false) setLeadsActifs(prev => Math.max(0, prev - 1));
        if (lead.statut === 'Gagné') setLeadsGagnes(prev => Math.max(0, prev - 1));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const oldLead = payload.old as { vendor_id?: string | null; statut?: string | null; actif?: boolean | null };
        const newLead = payload.new as { vendor_id?: string | null; statut?: string | null; actif?: boolean | null };

        const wasOurs = oldLead.vendor_id === vendorId;
        const isOurs = newLead.vendor_id === vendorId;

        if (!wasOurs && !isOurs) return;

        if (!wasOurs && isOurs) {
          setTotalLeads(prev => prev + 1);
          if (newLead.actif !== false) setLeadsActifs(prev => prev + 1);
          if (newLead.statut === 'Gagné') setLeadsGagnes(prev => prev + 1);
          return;
        }

        if (wasOurs && !isOurs) {
          setTotalLeads(prev => Math.max(0, prev - 1));
          if (oldLead.actif !== false) setLeadsActifs(prev => Math.max(0, prev - 1));
          if (oldLead.statut === 'Gagné') setLeadsGagnes(prev => Math.max(0, prev - 1));
          return;
        }

        const oldActif = oldLead.actif !== false;
        const newActif = newLead.actif !== false;
        if (oldActif && !newActif) setLeadsActifs(prev => Math.max(0, prev - 1));
        else if (!oldActif && newActif) setLeadsActifs(prev => prev + 1);

        const wasGagne = oldLead.statut === 'Gagné';
        const isGagne = newLead.statut === 'Gagné';
        if (wasGagne && !isGagne) setLeadsGagnes(prev => Math.max(0, prev - 1));
        else if (!wasGagne && isGagne) setLeadsGagnes(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

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
          label="Total"
          sublabel="Leads assignés"
          count={totalLeads}
          accentColor="#22d3ee"
          glowColor="#22d3ee"
          icon={<Tag className="w-4 h-4" />}
        />
        <StatCard
          label="Actifs"
          sublabel="Leads en cours"
          count={leadsActifs}
          accentColor="#2dd4bf"
          glowColor="#2dd4bf"
          icon={<Activity className="w-4 h-4" />}
          trend={leadsActifs > 0 ? '+actif' : undefined}
        />
        <StatCard
          label="Gagnés"
          sublabel="Ventes conclues"
          count={leadsGagnes}
          accentColor="#34d399"
          glowColor="#34d399"
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Messages"
          sublabel="Non lus"
          count={0}
          accentColor="#60a5fa"
          glowColor="#60a5fa"
          icon={<MessageCircle className="w-4 h-4" />}
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
              { label: 'Ventes conclues', val: leadsGagnes, color: '#34d399' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-xs font-bold text-white">{item.val}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(item.val, 100)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Taux de conversion</p>
            <p className="text-2xl font-bold text-white">
              {totalLeads > 0 ? `${Math.round((leadsGagnes / totalLeads) * 100)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(14,165,233,0.03) 100%)',
          border: '1px solid rgba(34,211,238,0.12)',
        }}
      >
        <MessageSquare className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">Besoin d'aide ?</p>
          <p className="text-xs text-slate-500">Utilisez le Chat Admin pour contacter votre responsable.</p>
        </div>
      </div>
    </div>
  );
}
