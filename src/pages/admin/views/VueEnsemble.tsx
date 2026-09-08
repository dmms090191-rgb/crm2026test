import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSansStatutStats } from '../../../hooks/useSansStatutStats';
import SansStatutModal from '../../../components/SansStatutModal';
import SocieteIdentityCard from './SocieteIdentityCard';
import SocieteKpiGrid from './SocieteKpiGrid';
import { useSocieteOverviewCounts } from './useSocieteOverviewCounts';
import type { ActiveView } from '../AdminDashboard';

interface VueEnsembleProps {
  onNavigate?: (view: ActiveView, options?: { docTab?: string }) => void;
  unreadClientConversations?: number;
  unreadVendorConversations?: number;
  /** Identite EFFECTIVE du panel : celle de la Societe visualisee quand on est en Visu. */
  fullName?: string;
  companyName?: string;
  email?: string;
  /** Rendez-vous a traiter : imminents + non traites, perso et equipe. */
  rdvCount?: number;
}

export default function VueEnsemble({
  unreadClientConversations = 0,
  unreadVendorConversations = 0,
  fullName = '',
  companyName = '',
  email = '',
  rdvCount = 0,
}: VueEnsembleProps) {
  const t = useThemeTokens();
  const [modalOpen, setModalOpen] = useState(false);
  const sansStatut = useSansStatutStats('admin');
  const { pendingCount, leadsCount, announcements } = useSocieteOverviewCounts();

  const formatAnnouncementDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Le <main> du panel Societe applique deja son propre padding : on ne le double pas.
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-2xl font-bold" style={{ color: t.text.primary }}>Dashboard Société</h2>
        <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: t.text.tertiary }}>Vue globale de votre société.</p>
      </div>

      <SocieteIdentityCard fullName={fullName} companyName={companyName} email={email} tokens={t} />

      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Vue d'ensemble</h3>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0"
            style={{ background: t.badge.liveBg, border: `1px solid ${t.badge.liveBorder}`, color: t.badge.liveText }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: t.badge.liveText }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: t.badge.liveText }} />
            </span>
            Live
          </div>
        </div>

        <SocieteKpiGrid
          tokens={t}
          onSansStatutClick={() => setModalOpen(true)}
          values={{
            leadsActifs: leadsCount,
            sansStatut: sansStatut.count,
            vendeurs: sansStatut.vendors.length,
            messages: unreadClientConversations + unreadVendorConversations,
            rendezVous: rdvCount,
            enAttente: pendingCount,
          }}
        />
      </div>

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
