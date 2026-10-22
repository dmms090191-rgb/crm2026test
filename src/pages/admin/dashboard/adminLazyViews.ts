import { lazy } from 'react';

export const VueEnsemble = lazy(() => import('../views/VueEnsemble'));
export const AdminSite = lazy(() => import('../views/AdminSite'));
export const AdminLogoPage = lazy(() => import('../views/AdminLogoPage'));
export const Inscription = lazy(() => import('../views/Inscription'));
export const AjouterLeads = lazy(() => import('../views/AjouterLeads'));
export const AjouterVendeur = lazy(() => import('../views/AjouterVendeur'));
export const ListeVendeurs = lazy(() => import('../views/ListeVendeurs'));
export const ChatClient = lazy(() => import('../views/ChatClient'));
export const ChatVendeur = lazy(() => import('../views/ChatVendeur'));
export const ChatSuperAdmin = lazy(() => import('../views/ChatSuperAdmin'));
export const HistoriqueNotifications = lazy(() => import('../views/HistoriqueNotifications'));
export const Agenda = lazy(() => import('../views/Agenda'));
export const PropositionsRdv = lazy(() => import('../views/PropositionsRdv'));
export const Statuts = lazy(() => import('../views/Statuts'));
export const Crm = lazy(() => import('../views/Crm'));
export const ImportLeads = lazy(() => import('../views/ImportLeads'));
export const importDocumentationCrm = () => import('../views/DocumentationCrm');
export const DocumentationCrm = lazy(importDocumentationCrm);
/**
 * CRM Immo n'a pas de `lazy` ici : sa vue est montee par CrmImmoGate, qui n'ouvre
 * qu'apres la reponse du droit. Mais sa FONCTION D'IMPORT vit ici, avec les autres,
 * pour deux raisons.
 *
 * La premiere est pratique : AdminDashboard la preleve sur un creneau au repos des que
 * le droit est connu — donc bien avant le clic — pour que les 31 fichiers du module ne
 * se telechargent plus pendant que l'utilisateur regarde un spinner.
 *
 * La seconde est que ce fichier n'exporte PAS de composant : la poser dans CrmImmoGate,
 * a cote de son composant par defaut, faisait lever react-refresh/only-export-components
 * — un avertissement de plus, mesure, pour une fonction qui a deja sa maison.
 */
export const importCrmImmo = () => import('../views/CrmImmo');
export const SauvegardeRestauration = lazy(() => import('../views/SauvegardeRestauration'));
export const SystemPage = lazy(() => import('../views/SystemPage'));
export const AdminCerveauIA = lazy(() => import('../views/cerveau-ia/AdminCerveauIA'));
export const AdminApplicationPage = lazy(() => import('../views/AdminApplicationPage'));
export const EditeurIA = lazy(() => import('../views/editeur-ia/EditeurIA'));
export const AdminCalquerLogo = lazy(() => import('../views/AdminCalquerLogo'));
export const AdminMesLogosRA = lazy(() => import('../views/AdminMesLogosRA'));
export const Boutiques = lazy(() => import('../views/Boutiques'));
export const Cabinets = lazy(() => import('../views/Cabinets'));
