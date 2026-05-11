import { UserPlus, Tag, Activity, MessageCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../contexts/ThemeContext';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSansStatutStats } from '../../../hooks/useSansStatutStats';
import SansStatutModal from '../../../components/SansStatutModal';
import AuditSummaryCard from './AuditSummaryCard';
import type { ActiveView } from '../AdminDashboard';

interface StatCardProps {
  label: string;
  sublabel: string;
  count: number;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  tokens: ReturnType<typeof useThemeTokens>;
  onClick?: () => void;
}

function StatCard({ label, sublabel, count, icon, accentColor, glowColor, tokens, onClick }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 md:p-5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5${onClick ? ' cursor-pointer' : ''}`}
      style={{
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        boxShadow: tokens.card.shadow,
      }}
      onClick={onClick}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: glowColor, opacity: tokens.stat.glowOpacity }}
      />

      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="min-w-0 flex-1 mr-2">
          <p className="text-[9px] md:text-[10px] font-bold tracking-[0.12em] md:tracking-[0.15em] uppercase mb-0.5" style={{ color: accentColor }}>{label}</p>
          <p className="text-[10px] md:text-xs leading-tight uppercase tracking-wide md:tracking-wider whitespace-nowrap" style={{ color: tokens.label.muted }}>{sublabel}</p>
        </div>
        <div
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${glowColor}18`, color: accentColor, boxShadow: `0 0 16px ${glowColor}30` }}
        >
          {icon}
        </div>
      </div>

      <p className="text-3xl md:text-4xl font-bold tabular-nums" style={{ color: tokens.stat.valuePrimary }}>{count}</p>
    </div>
  );
}

interface VueEnsembleProps {
  onNavigate?: (view: ActiveView, options?: { docTab?: string }) => void;
  unreadClientConversations?: number;
  unreadVendorConversations?: number;
}

export default function VueEnsemble({ onNavigate, unreadClientConversations = 0, unreadVendorConversations = 0 }: VueEnsembleProps) {
  const { theme } = useTheme();
  const t = useThemeTokens();
  const [pendingCount, setPendingCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const sansStatut = useSansStatutStats('admin');

  const fetchPending = useCallback(async () => {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

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

    return () => { supabase.removeChannel(regChannel); };
  }, []);

  const accentEn = theme === 'dark' ? '#22d3ee' : '#0284c7';
  const accentSans = theme === 'dark' ? '#2dd4bf' : '#0891b2';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: t.heading.primary }}>Vue d'ensemble CRM</h2>
          <p className="text-xs mt-0.5" style={{ color: t.label.muted }}>Suivi en temps réel</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: t.badge.liveBg, border: `1px solid ${t.badge.liveBorder}`, color: t.badge.liveText }}
        >
          <Activity className="w-3 h-3" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="En attente"
          sublabel="Inscriptions"
          count={pendingCount}
          accentColor={accentEn}
          glowColor={accentEn}
          icon={<UserPlus className="w-4 h-4" />}
          tokens={t}
        />
        <StatCard
          label="Sans statut"
          sublabel="Leads actifs"
          count={sansStatut.count}
          accentColor={accentSans}
          glowColor={accentSans}
          icon={<Tag className="w-4 h-4" />}
          tokens={t}
          onClick={() => setModalOpen(true)}
        />
        <StatCard
          label="Messages"
          sublabel="Conversations à ouvrir"
          count={unreadClientConversations + unreadVendorConversations}
          accentColor="#60a5fa"
          glowColor="#60a5fa"
          icon={<MessageCircle className="w-4 h-4" />}
          tokens={t}
        />
      </div>

      <AuditSummaryCard
        onNavigateToAudit={onNavigate ? () => onNavigate('documentation-crm', { docTab: 'audit-technique' }) : undefined}
      />

      <SansStatutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        role="admin"
        count={sansStatut.count}
        adminCount={sansStatut.adminCount}
        byVendor={sansStatut.byVendor}
        leads={sansStatut.leads}
        vendors={sansStatut.vendors}
        loading={sansStatut.loading}
      />
    </div>
  );
}
