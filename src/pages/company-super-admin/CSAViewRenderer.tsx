import { Suspense, lazy } from 'react';
import CSAOverview from './CSAOverview';
import CSAAdminsList from './CSAAdminsList';
import CSAStatuts from './CSAStatuts';
import CSAInfoPage from './CSAInfoPage';
import CSAApplicationPage from './CSAApplicationPage';
import SiteManagerShell from '../superadmin/views/site-builder/SiteManagerShell';
import type { CSAView } from './CSASidebar';
import type { CSAAdminUser } from './CSAAdminsList';
import type { ImpersonatedCompanySuperAdmin } from '../../App';
import type { AdminUser } from '../superadmin/views/SAAdmins';

const SAchatAdmin = lazy(() => import('../superadmin/views/SAchatAdmin'));
import CSATalvexGate from './CSATalvexGate';

interface Props {
  activeView: CSAView;
  /** Talvex en Visu Groupe : seul habilite a masquer des actions. */
  canHideTabs?: boolean;
  impersonated: ImpersonatedCompanySuperAdmin;
  currentImpersonated: ImpersonatedCompanySuperAdmin;
  fullName: string;
  onConnectAsAdmin: (admin: CSAAdminUser) => void;
  handleMessageSociete: (admin: CSAAdminUser) => void;
  handleNameUpdated: (first: string, last: string) => void;
  chatInitialAdmin: { id: string; email: string; first_name: string; last_name: string } | null;
  setChatInitialAdmin: (v: null) => void;
  markAdminMsgRead: (adminId: string) => void;
  chatCachedAdmins: AdminUser[];
  /** Vrai uniquement quand on arrive par un clic sur une notification Talvex. */
  talvexAutoOpen?: boolean;
  onTalvexAutoOpenConsumed?: () => void;
}

/** Commutateur de vues du panel Groupe. Extrait tel quel : aucun changement de rendu. */
export default function CSAViewRenderer({
  activeView, canHideTabs = false, impersonated, currentImpersonated, fullName,
  onConnectAsAdmin, handleMessageSociete, handleNameUpdated,
  chatInitialAdmin, setChatInitialAdmin, markAdminMsgRead, chatCachedAdmins,
  talvexAutoOpen, onTalvexAutoOpenConsumed,
}: Props) {
  return (
    <>
          {activeView === 'overview' && <CSAOverview impersonated={currentImpersonated} fullName={fullName} />}
          {activeView === 'admins' && <CSAAdminsList companyId={impersonated.company_id} csaAuthId={impersonated.id} canHideTabs={canHideTabs} onConnectAsAdmin={onConnectAsAdmin} onMessageAdmin={handleMessageSociete} />}
          {activeView === 'statuts' && <CSAStatuts groupCompanyId={impersonated.company_id} />}
          {activeView === 'info' && <CSAInfoPage impersonated={currentImpersonated} onNameUpdated={handleNameUpdated} />}
          {activeView === 'chat-admin' && (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <div className="h-full flex flex-col">
                <SAchatAdmin
                  initialAdmin={chatInitialAdmin ? { id: chatInitialAdmin.id, email: chatInitialAdmin.email, first_name: chatInitialAdmin.first_name, last_name: chatInitialAdmin.last_name, phone: '', company: '', company_id: '', role: 'admin', pin: '', created_at: '', last_sign_in_at: null, access_enabled: true, ai_enabled: false } : null}
                  onAdminViewed={(adminId) => { markAdminMsgRead(adminId); setChatInitialAdmin(null); }}
                  /* Identite METIER = le Groupe, jamais le JWT. En Visu Talvex -> Groupe,
                     sans cet override le message partirait dans la conversation de Talvex
                     et le vrai Groupe ne le verrait jamais. */
                  superAdminIdOverride={impersonated.id}
                  cachedAdmins={chatCachedAdmins}
                />
              </div>
            </Suspense>
          )}
          {activeView === 'chat-rois-admin' && (
            <div className="h-full flex flex-col">
              <CSATalvexGate csaAuthId={impersonated.id} autoOpen={talvexAutoOpen} onAutoOpenConsumed={onTalvexAutoOpenConsumed} />
            </div>
          )}
          {activeView === 'application' && <CSAApplicationPage companyId={impersonated.company_id} />}
          {activeView === 'site' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0 flex flex-col">
                <SiteManagerShell
                  ownerType="admin_company"
                  title="Site"
                  subtitle="Gerez le site public de votre societe"
                  companyId={impersonated.company_id}
                  companyName={impersonated.company}
                />
              </div>
            </div>
          )}
    </>
  );
}
