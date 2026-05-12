import { useState, useEffect, useCallback } from 'react';
import { Tag, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSansStatutStats } from '../../../hooks/useSansStatutStats';
import SansStatutModal from '../../../components/SansStatutModal';
import StatCard from './VendorStatCard';

interface VendorVueEnsembleProps {
  vendorId: string | null;
  unreadConversations?: number;
}

export default function VendorVueEnsemble({ vendorId, unreadConversations = 0 }: VendorVueEnsembleProps) {
  const tokens = useThemeTokens();
  const [totalLeads, setTotalLeads] = useState(0);
  const [sansStatutModalOpen, setSansStatutModalOpen] = useState(false);

  const sansStatut = useSansStatutStats('vendor', vendorId);

  const fetchCounts = useCallback(async () => {
    if (!vendorId) { setTotalLeads(0); return; }
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId);
    setTotalLeads(count ?? 0);
  }, [vendorId]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel(`vendor-ensemble-${vendorId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        if ((payload.new as { vendor_id?: string | null }).vendor_id === vendorId) setTotalLeads(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        if ((payload.old as { vendor_id?: string | null }).vendor_id === vendorId) setTotalLeads(prev => Math.max(0, prev - 1));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const wasOurs = (payload.old as { vendor_id?: string | null }).vendor_id === vendorId;
        const isOurs = (payload.new as { vendor_id?: string | null }).vendor_id === vendorId;
        if (!wasOurs && isOurs) setTotalLeads(prev => prev + 1);
        else if (wasOurs && !isOurs) setTotalLeads(prev => Math.max(0, prev - 1));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  return (
    <div className="space-y-6 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-1 sm:pt-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: tokens.heading.primary }}>Vue d'ensemble</h2>
          <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Tableau de bord en temps réel</p>
        </div>
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Total"
          sublabel="Leads assignés"
          count={totalLeads}
          accentColor="#22d3ee"
          glowColor="#22d3ee"
          icon={<Tag className="w-[18px] h-[18px] sm:w-4 sm:h-4" />}
        />
        <StatCard
          label="Sans statut"
          sublabel="Non traités"
          count={sansStatut.count}
          accentColor="#f59e0b"
          glowColor="#f59e0b"
          icon={<AlertCircle className="w-[18px] h-[18px] sm:w-4 sm:h-4" />}
          onClick={() => setSansStatutModalOpen(true)}
        />
        <StatCard
          label="Messages"
          sublabel="Conversations à ouvrir"
          count={unreadConversations}
          accentColor="#60a5fa"
          glowColor="#60a5fa"
          icon={<MessageCircle className="w-[18px] h-[18px] sm:w-4 sm:h-4" />}
        />
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
