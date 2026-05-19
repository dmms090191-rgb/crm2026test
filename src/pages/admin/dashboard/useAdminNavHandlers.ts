import { useCallback, MutableRefObject } from 'react';
import type { ActiveView } from '../AdminDashboard';
import type { ImpersonatedClient, ChatLead } from '../views/Crm';
import type { Vendor } from '../views/ListeVendeurs';
import type { VendorNotifEntry } from '../TopBar';
import { consumeChatReturnContext } from '../../../lib/connectReturnContext';

interface NavHandlersDeps {
  activeView: ActiveView;
  chatClientMessageSent: boolean;
  chatVendorMessageSent: boolean;
  setChatLead: (lead: ChatLead | null) => void;
  setChatVendor: (vendor: Vendor | null) => void;
  setChatClientMessageSent: (v: boolean) => void;
  setChatVendorMessageSent: (v: boolean) => void;
  setActiveView: (v: ActiveView) => void;
  setDocInitialTab: (v: string | undefined) => void;
  markClientRead: (clientAuthId: string) => void;
  markVendorRead: (vendorId: string) => void;
  markAgendaSeen: (rdvId: string, type?: 'starting' | 'untreated') => void;
  markAgendaEquipeSeen: (rdvId: string, type?: 'starting' | 'untreated') => void;
  pendingScrollRef: MutableRefObject<{ leadId?: string; vendorId?: string; scrollY: number } | null>;
}

export function useAdminNavHandlers(deps: NavHandlersDeps) {
  const {
    activeView, chatClientMessageSent, chatVendorMessageSent,
    setChatLead, setChatVendor, setChatClientMessageSent, setChatVendorMessageSent,
    setActiveView, setDocInitialTab,
    markClientRead, markVendorRead, markAgendaSeen, markAgendaEquipeSeen,
    pendingScrollRef,
  } = deps;

  const handleClientEntryClick = useCallback((entry: { leadId: string; nom: string; prenom: string; email: string; clientAuthId: string }) => {
    setChatLead({ id: entry.leadId, nom: entry.nom, prenom: entry.prenom, email: entry.email });
    setChatClientMessageSent(false);
    setActiveView('chat-client');
    markClientRead(entry.clientAuthId);
  }, [markClientRead, setChatLead, setChatClientMessageSent, setActiveView]);

  const handleVendorEntryClick = useCallback((entry: VendorNotifEntry) => {
    const v: Vendor = { id: entry.vendorId, first_name: entry.firstName, last_name: entry.lastName, email: entry.email, auth_user_id: null, password: '', phone: '', created_at: '' };
    setChatVendor(v);
    setChatVendorMessageSent(false);
    setActiveView('chat-vendeur');
    markVendorRead(entry.vendorId);
  }, [markVendorRead, setChatVendor, setChatVendorMessageSent, setActiveView]);

  const handleVendorViewed = useCallback((vendorId: string) => {
    markVendorRead(vendorId);
  }, [markVendorRead]);

  const handleAgendaPersoClick = useCallback((rdvId: string, type?: 'starting' | 'untreated') => {
    markAgendaSeen(rdvId, type);
    setActiveView('agenda');
  }, [markAgendaSeen, setActiveView]);

  const handleAgendaEquipeClick = useCallback((rdvId: string, type?: 'starting' | 'untreated') => {
    markAgendaEquipeSeen(rdvId, type);
    setActiveView('agenda-equipe');
  }, [markAgendaEquipeSeen, setActiveView]);

  const handleNavigate = useCallback((view: ActiveView, options?: { docTab?: string }) => {
    if (activeView === 'chat-client' && !chatClientMessageSent) setChatLead(null);
    if (activeView === 'chat-vendeur' && !chatVendorMessageSent) setChatVendor(null);
    if (view === 'chat-client') sessionStorage.removeItem('crm_chat_return_context');
    setDocInitialTab(view === 'documentation-crm' && options?.docTab ? options.docTab : undefined);
    setActiveView(view);
  }, [activeView, chatClientMessageSent, chatVendorMessageSent, setChatLead, setChatVendor, setDocInitialTab, setActiveView]);

  const handleReturnToCrm = useCallback(() => {
    const ctx = consumeChatReturnContext();
    setChatLead(null);
    setActiveView('crm');
    if (ctx) pendingScrollRef.current = { leadId: ctx.leadId, scrollY: 0 };
  }, [setChatLead, setActiveView, pendingScrollRef]);

  return {
    handleClientEntryClick,
    handleVendorEntryClick,
    handleVendorViewed,
    handleAgendaPersoClick,
    handleAgendaEquipeClick,
    handleNavigate,
    handleReturnToCrm,
  };
}
