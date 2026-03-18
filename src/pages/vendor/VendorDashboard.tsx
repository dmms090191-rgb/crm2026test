import { useState, useEffect, useCallback } from 'react';
import VendorSidebar from './VendorSidebar';
import VendorTopBar from './VendorTopBar';
import VendorVueEnsemble from './views/VendorVueEnsemble';
import VendorLeads from './views/VendorLeads';
import VendorChatAdmin from './views/VendorChatAdmin';
import VendorChatClient from './views/VendorChatClient';
import VendorAgenda from './views/VendorAgenda';
import VendorPropositionsRdv from './views/VendorPropositionsRdv';
import { supabase } from '../../lib/supabase';
import type { ImpersonatedClientInfo } from '../client/ClientDashboard';

export interface ImpersonatedVendor {
  id: string;
  first_name: string;
  last_name: string;
  auth_user_id?: string | null;
}

interface VendorDashboardProps {
  onLogout: () => void;
  impersonatedVendor?: ImpersonatedVendor;
  onBackToAdmin?: () => void;
  onConnectAsClient?: (client: ImpersonatedClientInfo) => void;
}

export type VendorActiveView = 'vue-ensemble' | 'leads' | 'chat-admin' | 'chat-client' | 'agenda' | 'propositions-rdv';

export interface VendorChatLead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel?: string;
}

export default function VendorDashboard({ onLogout, impersonatedVendor, onBackToAdmin, onConnectAsClient }: VendorDashboardProps) {
  const [activeView, setActiveView] = useState<VendorActiveView>('vue-ensemble');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [vendorName, setVendorName] = useState('Vendeur');
  const [vendorDbId, setVendorDbId] = useState<string | null>(null);
  const [chatLead, setChatLead] = useState<VendorChatLead | null>(null);

  useEffect(() => {
    if (impersonatedVendor) {
      setVendorName([impersonatedVendor.first_name, impersonatedVendor.last_name].filter(Boolean).join(' ') || 'Vendeur');
      setVendorDbId(impersonatedVendor.id);
      return;
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      if (user?.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setVendorName([first_name, last_name].filter(Boolean).join(' '));
        }
      }
      const { data: vendorRow } = await supabase
        .from('vendors')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (vendorRow) setVendorDbId(vendorRow.id);
    });
  }, [impersonatedVendor]);

  const getBreadcrumb = useCallback(() => {
    const labels: Record<VendorActiveView, string> = {
      'vue-ensemble': "Vue d'ensemble",
      'leads': 'Leads',
      'chat-admin': 'Chat Admin',
      'chat-client': 'Chat Client',
      'agenda': 'Agenda',
      'propositions-rdv': 'Propositions RDV',
    };
    return labels[activeView];
  }, [activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'vue-ensemble': return <VendorVueEnsemble vendorId={vendorDbId} />;
      case 'leads': return <VendorLeads vendorId={vendorDbId} onOpenChat={(lead) => { setChatLead(lead); setActiveView('chat-client'); }} onConnectAsClient={onConnectAsClient} />;
      case 'chat-admin': return <VendorChatAdmin vendorName={vendorName} vendorDbId={vendorDbId} vendorAuthId={impersonatedVendor?.auth_user_id ?? undefined} />;
      case 'chat-client': return <VendorChatClient vendorName={vendorName} vendorDbId={vendorDbId} initialLead={chatLead} />;
      case 'agenda': return <VendorAgenda />;
      case 'propositions-rdv': return <VendorPropositionsRdv />;
      default: return <VendorVueEnsemble vendorId={vendorDbId} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <VendorSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={onLogout}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <VendorTopBar breadcrumb={getBreadcrumb()} vendorName={vendorName} isImpersonating={!!impersonatedVendor} onBackToAdmin={onBackToAdmin} />
        <main className="flex-1 overflow-auto p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
