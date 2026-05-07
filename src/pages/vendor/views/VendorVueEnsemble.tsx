import { useState, useEffect, useCallback } from 'react';
import { Tag, MessageCircle, MessageSquare, TrendingUp, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSansStatutStats } from '../../../hooks/useSansStatutStats';
import SansStatutModal from '../../../components/SansStatutModal';
import StatCard from './VendorStatCard';

interface VendorVueEnsembleProps {
  vendorId: string | null;
}

export default function VendorVueEnsemble({ vendorId }: VendorVueEnsembleProps) {
  const tokens = useThemeTokens();
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsGagnes, setLeadsGagnes] = useState(0);
  const [leadsActifs, setLeadsActifs] = useState(0);
  const [sansStatutModalOpen, setSansStatutModalOpen] = useState(false);

  const sansStatut = useSansStatutStats('vendor', vendorId);

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
          <h2 className="text-xl font-bold" style={{ color: tokens.heading.primary }}>Vue d'ensemble</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Tableau de bord en temps réel</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: tokens.badge.liveBg, border: `1px solid ${tokens.badge.liveBorder}`, color: tokens.badge.liveText }}>
          <Activity className="w-3 h-3" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total"
          sublabel="Leads assignés"
          count={totalLeads}
          accentColor="#22d3ee"
          glowColor="#22d3ee"
          icon={<Tag className="w-4 h-4" />}
        />
        <StatCard
          label="Sans statut"
          sublabel="Non traités"
          count={sansStatut.count}
          accentColor="#f59e0b"
          glowColor="#f59e0b"
          icon={<AlertCircle className="w-4 h-4" />}
          onClick={() => setSansStatutModalOpen(true)}
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
            background: tokens.card.bg,
            border: `1px solid ${tokens.card.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: tokens.heading.secondary }}>Performance mensuelle</h3>
            <TrendingUp className="w-4 h-4" style={{ color: `${tokens.accent.text}66` }} />
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
                      : tokens.surface.hover,
                    boxShadow: i === 11 ? `0 0 12px ${tokens.accent.text}66` : 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'].map(m => (
              <span key={m} className="text-[9px] flex-1 text-center" style={{ color: tokens.table.footerText }}>{m}</span>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{
            background: tokens.card.bg,
            border: `1px solid ${tokens.card.border}`,
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: tokens.heading.secondary }}>Activité rapide</h3>
          <div className="space-y-3">
            {[
              { label: 'Leads qualifiés', val: 0, color: '#22d3ee' },
              { label: 'RDV confirmés', val: 0, color: '#2dd4bf' },
              { label: 'Ventes conclues', val: leadsGagnes, color: '#34d399' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs" style={{ color: tokens.text.tertiary }}>{item.label}</span>
                  <span className="text-xs font-bold" style={{ color: tokens.text.primary }}>{item.val}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: tokens.surface.borderLight }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(item.val, 100)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${tokens.card.border}` }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: tokens.text.quaternary }}>Taux de conversion</p>
            <p className="text-2xl font-bold" style={{ color: tokens.text.primary }}>
              {totalLeads > 0 ? `${Math.round((leadsGagnes / totalLeads) * 100)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: tokens.accent.bg,
          border: `1px solid ${tokens.accent.border}`,
        }}
      >
        <MessageSquare className="w-5 h-5 flex-shrink-0" style={{ color: tokens.accent.text }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Besoin d'aide ?</p>
          <p className="text-xs" style={{ color: tokens.text.tertiary }}>Utilisez le Chat Admin pour contacter votre responsable.</p>
        </div>
      </div>

      <SansStatutModal
        open={sansStatutModalOpen}
        onClose={() => setSansStatutModalOpen(false)}
        role="vendor"
        count={sansStatut.count}
        leads={sansStatut.leads}
        loading={sansStatut.loading}
      />
    </div>
  );
}
