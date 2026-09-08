import VendorVueEnsemble from './views/VendorVueEnsemble';
import VendorLeads from './views/VendorLeads';
import VendorChatAdmin from './views/VendorChatAdmin';
import VendorChatClient from './views/VendorChatClient';
import VendorAgenda from './views/VendorAgenda';
import VendorPropositionsRdv from './views/VendorPropositionsRdv';
import { saveChatReturnContext, saveConnectReturnContext } from '../../lib/connectReturnContext';
import type { VendorActiveView, ImpersonatedVendor, VendorChatLead } from './VendorDashboard';
import type { ImpersonatedClientInfo } from '../client/ClientDashboard';

const LABELS: Record<VendorActiveView, string> = {
  'vue-ensemble': "Vue d'ensemble",
  'leads': 'Leads',
  'chat-admin': 'Chat Administration',
  'chat-client': 'Chat Client',
  'agenda': 'Agenda',
  'propositions-rdv': 'Propositions RDV',
  'tuto': 'Tuto',
};

export function vendorBreadcrumb(activeView: VendorActiveView): string {
  return LABELS[activeView];
}

interface Props {
  activeView: VendorActiveView;
  vendorDbId: string | null;
  vendorName: string;
  unreadClientEntries: unknown[];
  chatLead: VendorChatLead | null;
  rdvLead: VendorChatLead | null;
  impersonatedVendor?: ImpersonatedVendor | null;
  pendingScrollRef: React.MutableRefObject<{ leadId?: string; scrollY: number } | null>;
  setActiveView: (v: VendorActiveView) => void;
  setChatLead: (v: VendorChatLead | null) => void;
  setRdvLead: (v: VendorChatLead | null) => void;
  onConnectAsClient?: (client: ImpersonatedClientInfo) => void;
  markAdminRead: () => void;
  handleClientViewed: (id: string) => void;
  handleReturnToLeads: () => void;
}

/** Commutateur de vues du panel Vendeur. Extrait tel quel, aucun changement. */
export default function VendorViewRenderer({
  activeView, vendorDbId, vendorName, unreadClientEntries, chatLead, rdvLead,
  impersonatedVendor, pendingScrollRef, setActiveView, setChatLead, setRdvLead,
  onConnectAsClient, markAdminRead, handleClientViewed, handleReturnToLeads,
}: Props) {
  switch (activeView) {
    case 'vue-ensemble': return <VendorVueEnsemble vendorId={vendorDbId} unreadConversations={unreadClientEntries.length} />;
    case 'leads': return <VendorLeads vendorId={vendorDbId} onOpenChat={(lead) => { saveChatReturnContext(lead.id, [lead.prenom, lead.nom].filter(Boolean).join(' ') || lead.email); setChatLead(lead); setActiveView('chat-client'); }} onConnectAsClient={(client) => { saveConnectReturnContext({ fromRole: 'vendor', fromTab: 'leads', leadId: client.id, scrollY: window.scrollY }); onConnectAsClient?.(client); }} onOpenRdv={(lead) => { setRdvLead(lead); setActiveView('propositions-rdv'); }} />;
    case 'chat-admin': return <VendorChatAdmin vendorName={vendorName} vendorDbId={vendorDbId} vendorAuthId={impersonatedVendor?.auth_user_id ?? undefined} onAdminMessageViewed={markAdminRead} isAdmin={!!impersonatedVendor} />;
    case 'chat-client': return <VendorChatClient vendorName={vendorName} vendorDbId={vendorDbId} initialLead={chatLead} onClientViewed={handleClientViewed} onReturnToLeads={handleReturnToLeads} isAdmin={!!impersonatedVendor} />;
    case 'agenda': return <VendorAgenda vendorId={vendorDbId} />;
    case 'propositions-rdv': return <VendorPropositionsRdv vendorDbId={vendorDbId} initialLead={rdvLead} onInitialLeadConsumed={() => setRdvLead(null)} onNavigateToLeads={(leadId?: string) => { if (leadId) pendingScrollRef.current = { leadId, scrollY: 0 }; setActiveView('leads'); }} />;
    case 'tuto': return <div className="p-6"><p className="text-sm" style={{ color: 'inherit' }}>Tuto - Contenu a venir</p></div>;
    default: return <VendorVueEnsemble vendorId={vendorDbId} unreadConversations={unreadClientEntries.length} />;
  }
}
