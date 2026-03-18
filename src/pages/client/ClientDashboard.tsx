import { useState, useEffect, useCallback } from 'react';
import ClientSidebar from './ClientSidebar';
import ClientTopBar from './ClientTopBar';
import ClientMessagerie from './views/ClientMessagerie';
import ClientAgenda from './views/ClientAgenda';
import ClientPropositionsRdv from './views/ClientPropositionsRdv';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';

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

export type ClientActiveView = 'messagerie' | 'agenda' | 'propositions-rdv';

export default function ClientDashboard({ onLogout, impersonatedClient, onBackToAdmin, backLabel = 'Retour admin' }: ClientDashboardProps) {
  const [activeView, setActiveView] = useState<ClientActiveView>('messagerie');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clientName, setClientName] = useState('Client');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAuthId, setClientAuthId] = useState('');

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

  const getBreadcrumb = useCallback(() => {
    const labels: Record<ClientActiveView, string> = {
      'messagerie': 'Support',
      'agenda': 'Agenda',
      'propositions-rdv': 'Propositions RDV',
    };
    return labels[activeView];
  }, [activeView]);

  const renderView = () => {
    if (!clientAuthId) return null;
    switch (activeView) {
      case 'messagerie': return <ClientMessagerie clientName={clientName} clientAuthId={clientAuthId} />;
      case 'agenda': return <ClientAgenda clientEmail={clientEmail} />;
      case 'propositions-rdv': return <ClientPropositionsRdv clientEmail={clientEmail} />;
      default: return <ClientMessagerie clientName={clientName} clientAuthId={clientAuthId} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <ClientSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={onLogout}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        {impersonatedClient && onBackToAdmin && (
          <div
            className="flex items-center gap-3 px-5 py-2.5"
            style={{ background: 'rgba(52,211,153,0.06)', borderBottom: '1px solid rgba(52,211,153,0.15)' }}
          >
            <button
              onClick={onBackToAdmin}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}
            >
              <ArrowLeft className="w-3 h-3" />
              {backLabel}
            </button>
            <span className="text-xs text-slate-500">
              Vue client de <span className="text-slate-300 font-medium">{clientName}</span>
            </span>
          </div>
        )}
        <ClientTopBar breadcrumb={getBreadcrumb()} clientName={clientName} />
        <main className="flex-1 overflow-auto p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
