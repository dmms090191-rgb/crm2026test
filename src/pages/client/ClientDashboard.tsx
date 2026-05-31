import { useState, useEffect, useCallback } from 'react';
import ClientSidebar from './ClientSidebar';
import ClientTopBar from './ClientTopBar';
import ClientVueEnsemble from './views/ClientVueEnsemble';
import ClientMessagerie from './views/ClientMessagerie';
import ClientAgenda from './views/ClientAgenda';
import ClientPropositionsRdv from './views/ClientPropositionsRdv';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import GlassBackgroundLayer from '../../components/theme/GlassBackgroundLayer';
import { useUnreadAdminMessages } from '../../hooks/useUnreadAdminMessages';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';
import DemoReceiverLayer from '../../components/demo/DemoReceiverLayer';
import { useDemoSessionSafe } from '../../components/demo/DemoSessionContext';
import { useClientUnseenProposals } from './hooks/useClientUnseenProposals';
import ClientImpersonationBanner from './components/ClientImpersonationBanner';

export interface ImpersonatedClientInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface ClientDashboardProps {
  onLogout: () => void;
  impersonatedClient?: ImpersonatedClientInfo | null;
  onBackToAdmin?: () => void;
  backLabel?: string;
  isSAViewing?: boolean;
}

export type ClientActiveView = 'vue-ensemble' | 'messagerie' | 'agenda' | 'propositions-rdv' | 'tuto';

const BREADCRUMB_LABELS: Record<ClientActiveView, string> = {
  'vue-ensemble': "Vue d'ensemble",
  'messagerie': 'Support',
  'agenda': 'Agenda',
  'propositions-rdv': 'Propositions RDV',
  'tuto': 'Tuto',
};

export default function ClientDashboard({ onLogout, impersonatedClient, onBackToAdmin, backLabel = 'Retour admin', isSAViewing }: ClientDashboardProps) {
  const tokens = useThemeTokens();
  const demoCtx = useDemoSessionSafe();
  const demoStatus: 'idle' | 'pending' | 'active' = demoCtx?.session?.status === 'active' ? 'active' : demoCtx?.session?.status === 'pending' ? 'pending' : 'idle';
  const [activeView, setActiveView] = useState<ClientActiveView>('vue-ensemble');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientName, setClientName] = useState('Client');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAuthId, setClientAuthId] = useState('');
  const { unreadCount: unreadMsgCount, latestAt: unreadLatestAt, markAsRead: markMsgRead } = useUnreadAdminMessages(clientAuthId);
  const { notifications: agendaNotifs, count: agendaCount, markAsSeen: markAgendaSeen } = useAgendaNotifications('client', clientEmail || null);
  const { unseenProposals, handleProposalNotifClick, markProposalsSeen } = useClientUnseenProposals(clientEmail);

  useEffect(() => {
    if (impersonatedClient) {
      setClientName([impersonatedClient.prenom, impersonatedClient.nom].filter(Boolean).join(' ') || 'Client');
      setClientEmail(impersonatedClient.email);
      const email = impersonatedClient.email;
      if (email) {
        supabase.from('leads').select('id').eq('email', email).eq('actif', true).limit(1).maybeSingle().then(({ data }) => {
          setClientAuthId(data?.id ?? impersonatedClient.id);
        });
      } else {
        setClientAuthId(impersonatedClient.id);
      }
      return;
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const email = user.email ?? '';
      setClientEmail(email);
      if (user.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setClientName([first_name, last_name].filter(Boolean).join(' '));
        } else if (email) {
          setClientName(email.split('@')[0]);
        }
      } else if (email) {
        setClientName(email.split('@')[0]);
      }
      if (email) {
        const { data: byCol } = await supabase.from('leads').select('id').eq('email', email).eq('actif', true).limit(1).maybeSingle();
        if (byCol) { setClientAuthId(byCol.id); return; }
        const { data: byJson } = await supabase.from('leads').select('id').is('email', null).eq('data->>Email', email).eq('actif', true).limit(1).maybeSingle();
        if (byJson) { setClientAuthId(byJson.id); return; }
      }
      setClientAuthId(user.id);
    });
  }, [impersonatedClient]);

  useEffect(() => {
    if (activeView === 'messagerie') {
      markMsgRead();
    }
  }, [activeView, markMsgRead]);

  const handleMsgNotifClick = useCallback(() => {
    setActiveView('messagerie');
    markMsgRead();
  }, [markMsgRead]);

  const handleAgendaNotifClick = useCallback((rdvId: string) => {
    markAgendaSeen(rdvId);
    setActiveView('agenda');
  }, [markAgendaSeen]);

  const handleProposalClick = useCallback((proposalId: string) => {
    handleProposalNotifClick(proposalId);
    setActiveView('propositions-rdv');
  }, [handleProposalNotifClick]);

  const getBreadcrumb = () => BREADCRUMB_LABELS[activeView];

  const renderView = () => {
    if (!clientAuthId && activeView !== 'vue-ensemble') return null;
    switch (activeView) {
      case 'vue-ensemble': return <ClientVueEnsemble clientName={clientName} clientAuthId={clientAuthId} onNavigate={(v) => setActiveView(v as ClientActiveView)} />;
      case 'messagerie': return <ClientMessagerie clientName={clientName} clientAuthId={clientAuthId} isAdmin={!!impersonatedClient} />;
      case 'agenda': return <ClientAgenda clientEmail={clientEmail} />;
      case 'propositions-rdv': return <ClientPropositionsRdv clientEmail={clientEmail} onMount={markProposalsSeen} />;
      case 'tuto': return <div className="p-6"><p className="text-sm" style={{ color: 'inherit' }}>Tuto - Contenu a venir</p></div>;
      default: return <ClientVueEnsemble clientName={clientName} clientAuthId={clientAuthId} onNavigate={(v) => setActiveView(v as ClientActiveView)} />;
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden relative" style={{ background: tokens.main.bg }}>
      <GlassBackgroundLayer />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: tokens.modal.overlayBg }} onClick={() => setMobileOpen(false)} />
      )}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-[min(300px,calc(100vw-24px))]
          md:relative md:z-auto md:w-auto
          transition-transform duration-300 md:transition-none md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <ClientSidebar
          activeView={activeView}
          onNavigate={(view) => { setActiveView(view); setMobileOpen(false); }}
          collapsed={mobileOpen ? false : sidebarCollapsed}
          onCollapse={() => { if (mobileOpen) setMobileOpen(false); else setSidebarCollapsed(!sidebarCollapsed); }}
          onLogout={onLogout}
        />
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        {impersonatedClient && onBackToAdmin && (
          <ClientImpersonationBanner
            impersonatedClient={impersonatedClient}
            onBackToAdmin={onBackToAdmin}
            backLabel={backLabel}
            isSAViewing={isSAViewing}
            demoStatus={demoStatus}
            clientName={clientName}
            activeView={activeView}
            breadcrumb={getBreadcrumb()}
            tokens={tokens}
          />
        )}
        <ClientTopBar
          breadcrumb={getBreadcrumb()}
          onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
          clientName={clientName}
          unreadMessageCount={unreadMsgCount}
          unreadLatestAt={unreadLatestAt}
          onMessageNotifClick={handleMsgNotifClick}
          agendaCount={agendaCount}
          agendaEntries={agendaNotifs}
          onAgendaEntryClick={handleAgendaNotifClick}
          propositionsCount={unseenProposals.length}
          propositionsEntries={unseenProposals}
          onPropositionEntryClick={handleProposalClick}
        />
        {!isSAViewing && !impersonatedClient && <DemoReceiverLayer userId={clientAuthId || null} onViewChange={(v) => setActiveView(v as ClientActiveView)} />}
        <main
          className={`flex-1 flex flex-col md:p-6 mobile-main-scroll ${activeView === 'messagerie' ? 'p-2 sm:p-3 overflow-hidden' : 'p-3 sm:p-4 overflow-auto'}`}
          style={{ minHeight: 0 }}
        >
          {renderView()}
        </main>
      </div>
    </div>
  );
}
