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
  HistoriqueNotifications,
  ImportLeads, DocumentationCrm, SauvegardeRestauration,
  SystemPage, AdminCerveauIA, AdminApplicationPage, EditeurIA, AdminCalquerLogo, AdminMesLogosRA,
  Boutiques, Cabinets,
} from './adminLazyViews';
import CrmImmoGate from './CrmImmoGate';
import AdminTelechargerView from '../views/AdminTelechargerView';
import type { EtatAcces } from '../../../lib/crmImmoAccess';
import type { ImmoPourDashboard } from '../views/VueEnsemble';
import type { CategorieImmo } from '../../../lib/crmImmoEcheancier';
import { saveConnectReturnContext, saveChatReturnContext } from '../../../lib/connectReturnContext';
import type { ImpersonatedClient } from '../views/Crm';
import type { EntreeHistorique } from '../../../lib/notificationHistory';
import type { Destination } from '../views/historique/notificationDestinations';

/**
 * Tout ce dont la page Historique Notifications a besoin, en UN paquet.
 *
 * Un paquet plutot que huit proprietes : la signature de ce composant est deja longue,
 * et surtout l alimentation et le chargement vivent dans AdminDashboard — appeles UNE
 * SEULE FOIS, comme les alertes CRM Immo. L historique doit se remplir meme quand
 * personne n ouvre l onglet ; s il etait charge par la page, il ne se remplirait qu a
 * l ouverture et la cloche et la page ne diraient pas la meme chose.
 */
export interface PaquetHistorique {
  entrees: EntreeHistorique[];
  chargement: boolean;
  erreur: string | null;
  lectureSeule: boolean;
  onVoir: (d: Destination, e: EntreeHistorique) => void;
  onTraiter: (id: string) => void;
  onArchiver: (id: string, archiver: boolean) => void;
  onSupprimer: (id: string) => void;
}

const lazyFallback = <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

interface Props {
  activeView: ActiveView;
  chatLead: ChatLead | null;
  chatVendor: Vendor | null;
  rdvLead: ChatLead | null;
  effectiveAdminId: string | null;
  impersonatedAdmin?: ImpersonatedAdminInfo | null;
  isSAViewing?: boolean;
  /*
   * Le droit d'ouvrir CRM Immo, calcule UNE SEULE FOIS dans AdminDashboard et
   * descendu aussi a la barre laterale. Deux appels donneraient deux verites.
   * Le case 'crm-immo' existe toujours : c'est CrmImmoGate qui decide.
   */
  crmImmoAcces: EtatAcces;
  onReessayerCrmImmo: () => void;
  docInitialTab?: string;
  unreadClientConversations: number;
  unreadVendorConversations: number;
  /** Identite effective du panel, transmise telle quelle au dashboard Societe. */
  identityName?: string;
  identityEmail?: string;
  companyName?: string;
  rdvCount?: number;
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
  markSuperAdminRead: (superAdminId?: string) => void;
  chatInitialSuperAdminId?: string | null;
  historique: PaquetHistorique;
  /**
   * Les sept compteurs CRM Immo du dashboard, ou null si la Societe n a pas le module.
   *
   * Null fait garder a la Vue d ensemble ses six compteurs generiques, inchanges. La
   * bascule tient donc en une seule valeur, et aucun nom de Societe n intervient.
   */
  immoDashboard?: ImmoPourDashboard | null;
  /** Ouvre la page du module sur la categorie de la carte cliquee. */
  onOuvrirCrmImmo?: (categorie: CategorieImmo) => void;
}

export default function AdminViewRenderer({
  activeView, chatLead, chatVendor, rdvLead, effectiveAdminId, chatInitialSuperAdminId = null,
  impersonatedAdmin, isSAViewing, crmImmoAcces, onReessayerCrmImmo, docInitialTab,
  immoDashboard = null, onOuvrirCrmImmo,
  unreadClientConversations, unreadVendorConversations,
  identityName = '', identityEmail = '', companyName = '', rdvCount = 0,
  pendingScrollRef,
  setChatLead, setChatVendor, setRdvLead,
  setChatClientMessageSent, setChatVendorMessageSent, setDocInitialTab,
  onNameChange, onConnectAsVendor, onConnectAsClient,
  handleNavigate, handleReturnToCrm, setActiveView,
  markClientRead, onVendorViewed, markSuperAdminRead, historique,
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
            <ChatSuperAdmin adminIdOverride={effectiveAdminId} onSuperAdminViewed={markSuperAdminRead} initialSuperAdminId={chatInitialSuperAdminId} />
          </div>
        </Suspense>
      )}
      {activeView !== 'info-admin' && activeView !== 'chat-client' && activeView !== 'chat-vendeur' && activeView !== 'chat-super-admin' && (() => {
        switch (activeView) {
          case 'vue-ensemble': return <Suspense fallback={lazyFallback}><VueEnsemble onNavigate={handleNavigate} immo={immoDashboard} onOuvrirCrmImmo={onOuvrirCrmImmo} unreadClientConversations={unreadClientConversations} unreadVendorConversations={unreadVendorConversations} fullName={identityName} companyName={companyName} email={identityEmail} rdvCount={rdvCount} /></Suspense>;
          case 'site': return <Suspense fallback={lazyFallback}><AdminSite /></Suspense>;
          case 'logo': return <Suspense fallback={lazyFallback}><AdminLogoPage isSAViewing={isSAViewing} /></Suspense>;
          case 'inscription': return <Suspense fallback={lazyFallback}><Inscription /></Suspense>;
          case 'import-leads': return <Suspense fallback={lazyFallback}><ImportLeads onNavigateToCrm={() => handleNavigate('crm')} /></Suspense>;
          case 'ajouter-leads': return <Suspense fallback={lazyFallback}><AjouterLeads /></Suspense>;
          case 'crm': return <Suspense fallback={lazyFallback}><Crm ownerUserId={effectiveAdminId} onConnectAsClient={(client) => { saveConnectReturnContext({ fromRole: 'admin', fromTab: 'crm', leadId: client.id, scrollY: window.scrollY }); onConnectAsClient?.(client); }} onOpenChat={(lead) => { saveChatReturnContext(lead.id, [lead.prenom, lead.nom].filter(Boolean).join(' ') || lead.email); setChatLead(lead); setChatClientMessageSent(false); setActiveView('chat-client'); }} onOpenRdv={(lead) => { setRdvLead(lead); setActiveView('propositions-rdv'); }} /></Suspense>;
          case 'ajouter-vendeur': return <Suspense fallback={lazyFallback}><AjouterVendeur /></Suspense>;
          case 'liste-vendeurs': return <Suspense fallback={lazyFallback}><ListeVendeurs ownerUserId={effectiveAdminId} onConnectAsVendor={(vendor) => { saveConnectReturnContext({ fromRole: 'admin', fromTab: 'liste-vendeurs', vendorId: vendor.id, scrollY: window.scrollY }); onConnectAsVendor?.(vendor); }} onOpenChat={(vendor) => { setChatVendor(vendor); setChatVendorMessageSent(false); setActiveView('chat-vendeur'); }} /></Suspense>;
          case 'agenda': return <Suspense fallback={lazyFallback}><Agenda /></Suspense>;
          case 'agenda-equipe': return <AgendaEquipe />;
          case 'propositions-rdv': return <Suspense fallback={lazyFallback}><PropositionsRdv initialLead={rdvLead} onInitialLeadConsumed={() => setRdvLead(null)} onNavigateToCrm={(leadId?: string) => { if (leadId) pendingScrollRef.current = { leadId, scrollY: 0 }; handleNavigate('crm'); }} /></Suspense>;
          case 'statuts': return <Suspense fallback={lazyFallback}><Statuts /></Suspense>;
          case 'documentation-crm': return <Suspense fallback={lazyFallback}><DocumentationCrm initialTab={docInitialTab} onInitialTabConsumed={() => setDocInitialTab(undefined)} /></Suspense>;
          case 'system': return <Suspense fallback={lazyFallback}><SystemPage /></Suspense>;
          case 'sauvegarde': return <Suspense fallback={lazyFallback}><SauvegardeRestauration /></Suspense>;
          case 'cerveau-ia': return <Suspense fallback={lazyFallback}><AdminCerveauIA /></Suspense>;
          case 'application': return <Suspense fallback={lazyFallback}><AdminApplicationPage /></Suspense>;
          /* Centre de telechargement. Le MEME composant que la page publique /telecharger :
             une seule source pour la liste des versions, donc aucune divergence possible entre
             ce que voit un visiteur et ce que voit une Societe connectee. */
          case 'telecharger': return <AdminTelechargerView />;
          case 'editeur-ia': return <Suspense fallback={lazyFallback}><EditeurIA /></Suspense>;
          case 'calquer-logo': return <Suspense fallback={lazyFallback}><AdminCalquerLogo /></Suspense>;
          case 'mes-logos-ra': return <Suspense fallback={lazyFallback}><AdminMesLogosRA /></Suspense>;
          case 'boutique': return <Suspense fallback={lazyFallback}><Boutiques /></Suspense>;
          case 'cabinet': return <Suspense fallback={lazyFallback}><Cabinets /></Suspense>;
          /*
           * CRM Immo passe par une PORTE, et le case existe dans TOUS les etats du
           * droit. Le rendre conditionnel le ferait retomber dans le `default:`
           * ci-dessous, qui ouvre la Vue d'ensemble : un refus deguise en reussite.
           */
          case 'historique-notifications': return <Suspense fallback={lazyFallback}><HistoriqueNotifications {...historique} /></Suspense>;
          case 'crm-immo': return <CrmImmoGate etat={crmImmoAcces} onReessayer={onReessayerCrmImmo} />;
          case 'tuto': return <div className="p-6"><p className="text-sm" style={{ color: 'inherit' }}>Tuto - Contenu a venir</p></div>;
          default: return <Suspense fallback={lazyFallback}><VueEnsemble immo={immoDashboard} onOuvrirCrmImmo={onOuvrirCrmImmo} unreadClientConversations={unreadClientConversations} unreadVendorConversations={unreadVendorConversations} fullName={identityName} companyName={companyName} email={identityEmail} rdvCount={rdvCount} /></Suspense>;
        }
      })()}
    </>
  );
}
