import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import VueEnsemble from './views/VueEnsemble';
import InfoAdmin from './views/InfoAdmin';
import Inscription from './views/Inscription';
import ImportLeads from './views/ImportLeads';
import AjouterLeads from './views/AjouterLeads';
import Crm, { type ImpersonatedClient, type ChatLead } from './views/Crm';
import AjouterVendeur from './views/AjouterVendeur';
import ListeVendeurs, { type Vendor } from './views/ListeVendeurs';
import ChatClient from './views/ChatClient';
import ChatVendeur from './views/ChatVendeur';
import Agenda from './views/Agenda';
import PropositionsRdv from './views/PropositionsRdv';
import Statuts from './views/Statuts';
import DocumentationCrm from './views/DocumentationCrm';
import { supabase } from '../../lib/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
  onConnectAsVendor?: (vendor: Vendor) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
}

export type ActiveView =
  | 'vue-ensemble'
  | 'info-admin'
  | 'inscription'
  | 'import-leads'
  | 'ajouter-leads'
  | 'crm'
  | 'ajouter-vendeur'
  | 'liste-vendeurs'
  | 'chat-client'
  | 'chat-vendeur'
  | 'agenda'
  | 'propositions-rdv'
  | 'statuts'
  | 'documentation-crm';

export default function AdminDashboard({ onLogout, onConnectAsVendor, onConnectAsClient }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('vue-ensemble');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminName, setAdminName] = useState('Administrateur');
  const [chatLead, setChatLead] = useState<ChatLead | null>(null);
  const [chatVendor, setChatVendor] = useState<Vendor | null>(null);
  const [chatClientMessageSent, setChatClientMessageSent] = useState(false);
  const [chatVendorMessageSent, setChatVendorMessageSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setAdminName([first_name, last_name].filter(Boolean).join(' '));
        }
      }
    });
  }, []);

  const handleNameChange = useCallback((firstName: string, lastName: string) => {
    setAdminName([firstName, lastName].filter(Boolean).join(' ') || 'Administrateur');
  }, []);

  const handleNavigate = useCallback((view: ActiveView) => {
    if (activeView === 'chat-client' && !chatClientMessageSent) {
      setChatLead(null);
    }
    if (activeView === 'chat-vendeur' && !chatVendorMessageSent) {
      setChatVendor(null);
    }
    setActiveView(view);
  }, [activeView, chatClientMessageSent, chatVendorMessageSent]);

  const renderView = () => {
    switch (activeView) {
      case 'vue-ensemble': return <VueEnsemble />;
      case 'inscription': return <Inscription />;
      case 'import-leads': return <ImportLeads onNavigateToCrm={() => handleNavigate('crm')} />;
      case 'ajouter-leads': return <AjouterLeads />;
      case 'crm': return <Crm onConnectAsClient={onConnectAsClient} onOpenChat={(lead) => { setChatLead(lead); setChatClientMessageSent(false); setActiveView('chat-client'); }} />;
      case 'ajouter-vendeur': return <AjouterVendeur />;
      case 'liste-vendeurs': return <ListeVendeurs onConnectAsVendor={onConnectAsVendor} onOpenChat={(vendor) => { setChatVendor(vendor); setChatVendorMessageSent(false); setActiveView('chat-vendeur'); }} />;
      case 'chat-client': return null;
      case 'chat-vendeur': return null;
      case 'agenda': return <Agenda />;
      case 'propositions-rdv': return <PropositionsRdv />;
      case 'statuts': return <Statuts />;
      case 'documentation-crm': return <DocumentationCrm />;
      default: return <VueEnsemble />;
    }
  };

  const getBreadcrumb = () => {
    const labels: Record<ActiveView, string> = {
      'vue-ensemble': "Vue d'ensemble",
      'info-admin': 'Info admin',
      'inscription': 'Inscription',
      'import-leads': 'Import de leads',
      'ajouter-leads': 'Ajouter leads',
      'crm': 'Crm',
      'ajouter-vendeur': 'Ajouter vendeur',
      'liste-vendeurs': 'Liste vendeurs',
      'chat-client': 'Chat Client',
      'chat-vendeur': 'Chat Vendeur',
      'agenda': 'Agenda',
      'propositions-rdv': 'Propositions RDV',
      'statuts': 'Statuts',
      'documentation-crm': 'Documentation CRM',
    };
    return labels[activeView];
  };

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={onLogout}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb={getBreadcrumb()} adminName={adminName} />
        <main
          className="flex-1 flex flex-col p-6"
          style={{
            minHeight: 0,
            overflow: (activeView === 'chat-client' || activeView === 'chat-vendeur') ? 'hidden' : 'auto',
          }}
        >
          <div style={{ display: activeView === 'info-admin' ? 'block' : 'none' }}>
            <InfoAdmin onNameChange={handleNameChange} />
          </div>
          {activeView === 'chat-client' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <ChatClient initialLead={chatLead} onMessageSent={() => setChatClientMessageSent(true)} />
            </div>
          )}
          {activeView === 'chat-vendeur' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <ChatVendeur key={chatVendor?.id ?? 'no-vendor'} initialVendor={chatVendor} onMessageSent={() => setChatVendorMessageSent(true)} />
            </div>
          )}
          {activeView !== 'info-admin' && activeView !== 'chat-client' && activeView !== 'chat-vendeur' && renderView()}
        </main>
      </div>
    </div>
  );
}
