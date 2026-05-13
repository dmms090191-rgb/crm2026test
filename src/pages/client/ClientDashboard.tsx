import { useState, useEffect, useCallback, useRef } from 'react';
import ClientSidebar from './ClientSidebar';
import ClientTopBar from './ClientTopBar';
import ClientVueEnsemble from './views/ClientVueEnsemble';
import ClientMessagerie from './views/ClientMessagerie';
import ClientAgenda from './views/ClientAgenda';
import ClientPropositionsRdv from './views/ClientPropositionsRdv';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useUnreadAdminMessages } from '../../hooks/useUnreadAdminMessages';
import { useAgendaNotifications } from '../../hooks/useAgendaNotifications';

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
}

export type ClientActiveView = 'vue-ensemble' | 'messagerie' | 'agenda' | 'propositions-rdv';

export default function ClientDashboard({ onLogout, impersonatedClient, onBackToAdmin, backLabel = 'Retour admin' }: ClientDashboardProps) {
  const tokens = useThemeTokens();
  const [activeView, setActiveView] = useState<ClientActiveView>('vue-ensemble');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientName, setClientName] = useState('Client');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAuthId, setClientAuthId] = useState('');
  const { unreadCount: unreadMsgCount, latestAt: unreadLatestAt, markAsRead: markMsgRead } = useUnreadAdminMessages(clientAuthId);
  const { notifications: agendaNotifs, count: agendaCount, markAsSeen: markAgendaSeen } = useAgendaNotifications('client', clientEmail || null);
  const [unseenProposals, setUnseenProposals] = useState<{ id: string; lead_name: string; created_at: string }[]>([]);
  const unseenProposalsRef = useRef<{ id: string; lead_name: string; created_at: string }[]>([]);

  useEffect(() => {
    if (impersonatedClient) {
      setClientName([impersonatedClient.prenom, impersonatedClient.nom].filter(Boolean).join(' ') || 'Client');
      setClientEmail(impersonatedClient.email);
      setClientAuthId(impersonatedClient.id);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setClientAuthId(user.id);
      setClientEmail(user.email ?? '');
      if (user.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setClientName([first_name, last_name].filter(Boolean).join(' '));
        } else if (user.email) {
          setClientName(user.email.split('@')[0]);
        }
      } else if (user.email) {
        setClientName(user.email.split('@')[0]);
      }
    });
  }, [impersonatedClient]);

  useEffect(() => {
    if (!clientEmail) return;
    const fetchUnseen = async () => {
      const { data: byCol } = await supabase
        .from('leads')
        .select('id, vendor_id')
        .eq('email', clientEmail);
      const { data: byJson } = await supabase
        .from('leads')
        .select('id, vendor_id')
        .is('email', null)
        .eq('data->>Email', clientEmail);
      const merged = [...(byCol ?? []), ...(byJson ?? [])];
      const seen = new Set<string>();
      const leads = merged.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
      if (leads.length === 0) {
        setUnseenProposals([]);
        unseenProposalsRef.current = [];
        return;
      }
      const leadIds = leads.map(l => l.id);
      const { data: proposals } = await supabase
        .from('rdv_proposals')
        .select('id, vendor_id, lead_id, lead_name, created_at')
        .in('lead_id', leadIds)
        .eq('seen_by_client', false)
        .eq('status', 'pending');
      if (!proposals) {
        setUnseenProposals([]);
        unseenProposalsRef.current = [];
        return;
      }
      const leadMap = new Map(leads.map(l => [l.id, l.vendor_id]));
      const valid = proposals.filter(p => {
        if (!p.lead_id) return false;
        const leadVendorId = leadMap.get(p.lead_id);
        if (!leadVendorId) return !p.vendor_id;
        return p.vendor_id === leadVendorId;
      });
      const entries = valid.map(p => ({ id: p.id, lead_name: p.lead_name || '', created_at: p.created_at }));
      setUnseenProposals(entries);
      unseenProposalsRef.current = entries;
    };
    fetchUnseen();
    const ch = supabase
      .channel(`client-proposals-unseen-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_proposals' }, fetchUnseen)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientEmail]);

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

  const handleProposalNotifClick = useCallback((proposalId: string) => {
    supabase
      .from('rdv_proposals')
      .update({ seen_by_client: true })
      .eq('id', proposalId)
      .then(() => {
        setUnseenProposals(prev => prev.filter(p => p.id !== proposalId));
        unseenProposalsRef.current = unseenProposalsRef.current.filter(p => p.id !== proposalId);
      });
    setActiveView('propositions-rdv');
  }, []);

  const markProposalsSeen = useCallback(() => {
    const ids = unseenProposalsRef.current.map(p => p.id);
    if (ids.length > 0) {
      supabase
        .from('rdv_proposals')
        .update({ seen_by_client: true })
        .in('id', ids)
        .then(() => {
          setUnseenProposals([]);
          unseenProposalsRef.current = [];
        });
    }
  }, []);

  const getBreadcrumb = useCallback(() => {
    const labels: Record<ClientActiveView, string> = {
      'vue-ensemble': "Vue d'ensemble",
      'messagerie': 'Support',
      'agenda': 'Agenda',
      'propositions-rdv': 'Propositions RDV',
    };
    return labels[activeView];
  }, [activeView]);

  const renderView = () => {
    if (!clientAuthId && activeView !== 'vue-ensemble') return null;
    switch (activeView) {
      case 'vue-ensemble': return <ClientVueEnsemble clientName={clientName} />;
      case 'messagerie': return <ClientMessagerie clientName={clientName} clientAuthId={clientAuthId} isAdmin={!!impersonatedClient} />;
      case 'agenda': return <ClientAgenda clientEmail={clientEmail} />;
      case 'propositions-rdv': return <ClientPropositionsRdv clientEmail={clientEmail} onMount={markProposalsSeen} />;
      default: return <ClientVueEnsemble clientName={clientName} />;
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: tokens.main.bg }}>
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
          <div
            className="flex items-center gap-3 px-5 py-2.5"
            style={{ background: 'rgba(14,165,233,0.06)', borderBottom: '1px solid rgba(14,165,233,0.15)' }}
          >
            <button
              onClick={onBackToAdmin}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9' }}
            >
              <ArrowLeft className="w-3 h-3" />
              {backLabel}
            </button>
            <span className="text-xs" style={{ color: tokens.text.quaternary }}>
              Vue client de <span className="font-medium" style={{ color: tokens.text.secondary }}>{clientName}</span>
            </span>
          </div>
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
          onPropositionEntryClick={handleProposalNotifClick}
        />
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
