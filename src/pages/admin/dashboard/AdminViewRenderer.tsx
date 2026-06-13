import { Suspense, type MutableRefObject } from 'react';
import type { ActiveView } from '../AdminDashboard';
import type { ImpersonatedAdminInfo } from '../AdminDashboard';
import type { ChatLead } from '../views/Crm';
import type { Vendor } from '../views/ListeVendeurs';
import InfoAdmin from '../views/InfoAdmin';
import AgendaEquipe from '../views/AgendaEquipe';
import {
  VueEnsemble, AdminSite, AdminLogoPage, Inscription, AjouterLeads, AjouterVendeur, ListeVendeurs,
  ChatClient, ChatVendeur, ChatSuperAdmin, Agenda, PropositionsRdv, Statuts, Crm,
  ImportLeads, DocumentationCrm, SauvegardeRestauration,
  SystemPage, AdminCerveauIA, AdminApplicationPage, EditeurIA, AdminCalquerLogo,
} from './adminLazyViews';
import { saveConnectReturnContext, saveChatReturnContext } from '../../../lib/connectReturnContext';
import type { ImpersonatedClient } from '../views/Crm';

const lazyFallback = <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

interface Props {
  activeView: ActiveView;
  chatLead: ChatLead | null;
  chatVendor: Vendor | null;
  rdvLead: ChatLead | null;
  effectiveAdminId: string | null;
  impersonatedAdmin?: ImpersonatedAdminInfo | null;
  isSAViewing?: boolean;
  docInitialTab?: string;
  unreadClientConversations: number;
  unreadVendorConversations: number;
  pendingScrollRef: MutableRefObject<{ leadId?: string; vendorId?: string; scrollY: number } | null>;
  setChatLead: (l: ChatLead | null) => void;
  setChatVendor: (v: Vendor | null) => void;
  setRdvLead: (l: ChatLead | null) => void;
  setChatClientMessageSent: (v: boolean) => void;
  setChatVendorMessageSent: (v: boolean) => void;
  setDocInitialTab: (v: string | undefined) => void;
  onNameChange: (first: string, last: string) => void;
  onConnectAsVendor?: (vendor: Vendor) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  handleNavigate: (view: ActiveView, options?: { docTab?: string }) => void;
  handleReturnToCrm: () => void;
  setActiveView: (v: ActiveView) => void;
  markClientRead: (leadId: string) => void;
  onVendorViewed: (vendorId: string) => void;
  markSuperAdminRead: () => void;
}

export default function AdminViewRenderer({
  activeView, chatLead, chatVendor, rdvLead, effectiveAdminId,
  impersonatedAdmin, isSAViewing, docInitialTab,
  unreadClientConversations, unreadVendorConversations,
  pendingScrollRef,
  setChatLead, setChatVendor, setRdvLead,
  setChatClientMessageSent, setChatVendorMessageSent, setDocInitialTab,
  onNameChange, onConnectAsVendor, onConnectAsClient,
  handleNavigate, handleReturnToCrm, setActiveView,
  markClientRead, onVendorViewed, markSuperAdminRead,
}: Props) {
  return (
    <>
      <div style={{ display: activeView === 'info-admin' ? 'block' : 'none' }}>
        <InfoAdmin onNameChange={onNameChange} impersonatedAdmin={impersonatedAdmin} />
      </div>
      {activeView === 'chat-client' && (
        <Suspense fallback={lazyFallback}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <ChatClient initialLead={chatLead} onMessageSent={() => setChatClientMessageSent(true)} onClientViewed={markClientRead} onReturnToCrm={handleReturnToCrm} />
          </div>
        </Suspense>
      )}
      {activeView === 'chat-vendeur' && (
        <Suspense fallback={lazyFallback}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <ChatVendeur key={chatVendor?.id ?? 'no-vendor'} initialVendor={chatVendor} onMessageSent={() => setChatVendorMessageSent(true)} onVendorViewed={onVendorViewed} />
          </div>
        </Suspense>
      )}
      {activeView === 'chat-super-admin' && (
        <Suspense fallback={lazyFallback}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <ChatSuperAdmin adminIdOverride={effectiveAdminId} onSuperAdminViewed={markSuperAdminRead} />
          </div>
        </Suspense>
      )}
      {activeView !== 'info-admin' && activeView !== 'chat-client' && activeView !== 'chat-vendeur' && activeView !== 'chat-super-admin' && (() => {
        switch (activeView) {
          case 'vue-ensemble': return <Suspense fallback={lazyFallback}><VueEnsemble onNavigate={handleNavigate} unreadClientConversations={unreadClientConversations} unreadVendorConversations={unreadVendorConversations} /></Suspense>;
          case 'site': return <Suspense fallback={lazyFallback}><AdminSite /></Suspense>;
          case 'logo': return <Suspense fallback={lazyFallback}><AdminLogoPage isSAViewing={isSAViewing} /></Suspense>;
          case 'inscription': return <Suspense fallback={lazyFallback}><Inscription /></Suspense>;
          case 'import-leads': return <Suspense fallback={lazyFallback}><ImportLeads onNavigateToCrm={() => handleNavigate('crm')} /></Suspense>;
          case 'ajouter-leads': return <Suspense fallback={lazyFallback}><AjouterLeads /></Suspense>;
          case 'crm': return <Suspense fallback={lazyFallback}><Crm onConnectAsClient={(client) => { saveConnectReturnContext({ fromRole: 'admin', fromTab: 'crm', leadId: client.id, scrollY: window.scrollY }); onConnectAsClient?.(client); }} onOpenChat={(lead) => { saveChatReturnContext(lead.id, [lead.prenom, lead.nom].filter(Boolean).join(' ') || lead.email); setChatLead(lead); setChatClientMessageSent(false); setActiveView('chat-client'); }} onOpenRdv={(lead) => { setRdvLead(lead); setActiveView('propositions-rdv'); }} /></Suspense>;
          case 'ajouter-vendeur': return <Suspense fallback={lazyFallback}><AjouterVendeur /></Suspense>;
          case 'liste-vendeurs': return <Suspense fallback={lazyFallback}><ListeVendeurs onConnectAsVendor={(vendor) => { saveConnectReturnContext({ fromRole: 'admin', fromTab: 'liste-vendeurs', vendorId: vendor.id, scrollY: window.scrollY }); onConnectAsVendor?.(vendor); }} onOpenChat={(vendor) => { setChatVendor(vendor); setChatVendorMessageSent(false); setActiveView('chat-vendeur'); }} /></Suspense>;
          case 'agenda': return <Suspense fallback={lazyFallback}><Agenda /></Suspense>;
          case 'agenda-equipe': return <AgendaEquipe />;
          case 'propositions-rdv': return <Suspense fallback={lazyFallback}><PropositionsRdv initialLead={rdvLead} onInitialLeadConsumed={() => setRdvLead(null)} onNavigateToCrm={(leadId?: string) => { if (leadId) pendingScrollRef.current = { leadId, scrollY: 0 }; handleNavigate('crm'); }} /></Suspense>;
          case 'statuts': return <Suspense fallback={lazyFallback}><Statuts /></Suspense>;
          case 'documentation-crm': return <Suspense fallback={lazyFallback}><DocumentationCrm initialTab={docInitialTab} onInitialTabConsumed={() => setDocInitialTab(undefined)} /></Suspense>;
          case 'system': return <Suspense fallback={lazyFallback}><SystemPage /></Suspense>;
          case 'sauvegarde': return <Suspense fallback={lazyFallback}><SauvegardeRestauration /></Suspense>;
          case 'cerveau-ia': return <Suspense fallback={lazyFallback}><AdminCerveauIA /></Suspense>;
          case 'application': return <Suspense fallback={lazyFallback}><AdminApplicationPage /></Suspense>;
          case 'editeur-ia': return <Suspense fallback={lazyFallback}><EditeurIA /></Suspense>;
          case 'calquer-logo': return <Suspense fallback={lazyFallback}><AdminCalquerLogo /></Suspense>;
          case 'tuto': return <div className="p-6"><p className="text-sm" style={{ color: 'inherit' }}>Tuto - Contenu a venir</p></div>;
          default: return <Suspense fallback={lazyFallback}><VueEnsemble unreadClientConversations={unreadClientConversations} unreadVendorConversations={unreadVendorConversations} /></Suspense>;
        }
      })()}
    </>
  );
}
