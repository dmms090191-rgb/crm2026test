import { UserPlus, Tag, MessageCircle, Megaphone } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../contexts/ThemeContext';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSansStatutStats } from '../../../hooks/useSansStatutStats';
import SansStatutModal from '../../../components/SansStatutModal';
import { useCompanyId } from '../../../hooks/useCompanyId';
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
    <>
      {/* Mobile card: horizontal layout with left accent */}
      <div
        className={`sm:hidden relative overflow-hidden rounded-xl flex items-center gap-4 p-4 transition-all duration-200 active:scale-[0.98]${onClick ? ' cursor-pointer' : ''}`}
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.15), 0 0 0 1px ${glowColor}08`,
          backdropFilter: 'blur(16px)',
        }}
        onClick={onClick}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: accentColor }}
        />

        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-1"
          style={{
            background: `${glowColor}12`,
            border: `1px solid ${glowColor}20`,
            color: accentColor,
          }}
        >
          {icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: accentColor }}>{label}</p>
          <p className="text-[11px] mt-0.5 leading-tight" style={{ color: tokens.label.muted }}>{sublabel}</p>
        </div>

        {/* Count */}
        <div className="flex-shrink-0 text-right">
          <p className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: tokens.stat.valuePrimary }}>{Math.max(0, count)}</p>
        </div>
      </div>

      {/* Desktop card: vertical layout (unchanged) */}
      <div
        className={`hidden sm:flex relative overflow-hidden rounded-2xl p-4 md:p-5 flex-col justify-between group transition-transform duration-300 hover:-translate-y-0.5${onClick ? ' cursor-pointer' : ''}`}
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

        <p className="text-3xl md:text-4xl font-bold tabular-nums" style={{ color: tokens.stat.valuePrimary }}>{Math.max(0, count)}</p>
      </div>
    </>
  );
}

interface VueEnsembleProps {
  onNavigate?: (view: ActiveView, options?: { docTab?: string }) => void;
  unreadClientConversations?: number;
  unreadVendorConversations?: number;
}

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export default function VueEnsemble({ onNavigate, unreadClientConversations = 0, unreadVendorConversations = 0 }: VueEnsembleProps) {
  const { theme } = useTheme();
  const t = useThemeTokens();
  const [pendingCount, setPendingCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const companyId = useCompanyId();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  const sansStatut = useSansStatutStats('admin');

  const fetchPending = useCallback(async () => {
    if (!companyId) return;
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, [companyId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('admin_announcements')
      .select('id, title, message, created_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAnnouncements(data.filter(a => a.title || a.message));
      });
  }, [companyId]);

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

  const formatAnnouncementDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-1 sm:pt-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: t.heading.primary }}>
            Vue d'ensemble CRM
          </h2>
          <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-0.5" style={{ color: t.label.muted }}>
            Suivi en temps réel
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-semibold flex-shrink-0 mt-0.5"
          style={{ background: t.badge.liveBg, border: `1px solid ${t.badge.liveBorder}`, color: t.badge.liveText }}
        >
          <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: t.badge.liveText }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2" style={{ background: t.badge.liveText }} />
          </span>
          Live
        </div>
      </div>

      {/* Stats grid */}
      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="En attente"
          sublabel="Inscriptions"
          count={pendingCount}
          accentColor={accentEn}
          glowColor={accentEn}
          icon={<UserPlus className="w-[18px] h-[18px] sm:w-4 sm:h-4" />}
          tokens={t}
        />
        <StatCard
          label="Sans statut"
          sublabel="Leads actifs"
          count={sansStatut.count}
          accentColor={accentSans}
          glowColor={accentSans}
          icon={<Tag className="w-[18px] h-[18px] sm:w-4 sm:h-4" />}
          tokens={t}
          onClick={() => setModalOpen(true)}
        />
        <StatCard
          label="Messages"
          sublabel="Conversations à ouvrir"
          count={unreadClientConversations + unreadVendorConversations}
          accentColor="#60a5fa"
          glowColor="#60a5fa"
          icon={<MessageCircle className="w-[18px] h-[18px] sm:w-4 sm:h-4" />}
          tokens={t}
        />
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Megaphone className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: t.heading.primary }}>Annonces</h3>
          </div>
          {announcements.map(a => (
            <div
              key={a.id}
              className="relative overflow-hidden rounded-xl p-4 sm:p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(251,191,36,0.03) 100%)',
                border: '1px solid rgba(245,158,11,0.16)',
              }}
            >
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#f59e0b' }} />
              <div className="relative">
                {a.title && (
                  <p className="text-sm font-bold leading-tight" style={{ color: t.heading.primary }}>{a.title}</p>
                )}
                {a.message && (
                  <p className="text-xs sm:text-sm mt-1.5 leading-relaxed whitespace-pre-line" style={{ color: t.text.secondary }}>{a.message}</p>
                )}
                <p className="text-[10px] mt-2" style={{ color: t.label.hint }}>{formatAnnouncementDate(a.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
