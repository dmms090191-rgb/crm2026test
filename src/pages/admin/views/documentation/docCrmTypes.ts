import React from 'react';
import {
  Bot,
  Cpu,
  Database,
  FolderOpen,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export const TABS_DEFAULT = [
  { id: 'contexte-chatgpt', label: 'Contexte ChatGPT', icon: React.createElement(Bot, { className: 'w-4 h-4' }) },
  { id: 'technologies', label: 'Technologies', icon: React.createElement(Cpu, { className: 'w-4 h-4' }) },
  { id: 'base-de-donnees', label: 'Base de données', icon: React.createElement(Database, { className: 'w-4 h-4' }) },
  { id: 'structure-crm', label: 'Structure du CRM', icon: React.createElement(FolderOpen, { className: 'w-4 h-4' }) },
  { id: 'documentation-generale', label: 'Documentation générale', icon: React.createElement(BookOpen, { className: 'w-4 h-4' }) },
  { id: 'ameliorations', label: 'Améliorations', icon: React.createElement(TrendingUp, { className: 'w-4 h-4' }) },
  { id: 'idees', label: 'Idées', icon: React.createElement(Lightbulb, { className: 'w-4 h-4' }) },
  { id: 'audit-technique', label: 'Audit technique', icon: React.createElement(ShieldCheck, { className: 'w-4 h-4' }) },
] as const;

export type TabId = (typeof TABS_DEFAULT)[number]['id'];

export type Tab = { id: TabId; label: string; icon: React.ReactNode };

export const SEPARATOR_ID = '__separator__' as const;
export type SidebarSeparator = { id: typeof SEPARATOR_ID; kind: 'separator' };
export type SidebarItem = Tab | SidebarSeparator;

export function isSeparator(item: SidebarItem): item is SidebarSeparator {
  return item.id === SEPARATOR_ID;
}

export type ActiveSection = { kind: 'doc'; tabId: TabId };

export const CONTEXTE_CHATGPT_INITIAL = `Projet : CRM SaaS en développement

Technologies :
- Frontend : React + TypeScript + Vite
- UI : Tailwind CSS
- Base de données : Supabase (PostgreSQL)
- Realtime : Bolt Realtime
- Auth : Bolt Auth

Architecture générale :
Le CRM possède trois dashboards principaux :
- Admin
- Vendeur
- Client

Fonctionnalités principales :
- gestion complète des leads
- import CSV avec validation et déduplication
- attribution des leads aux vendeurs
- statuts personnalisés
- chat admin / vendeur / client
- agenda et propositions de rendez-vous
- dashboard avec indicateurs et realtime

Base de données principale :
Tables importantes :
- leads
- vendors
- import_history
- statuts
- client_messages
- vendor_admin_messages
- rdv_proposals
- registrations

Fonctionnalités d'import de leads :
- parsing CSV
- détection automatique des colonnes
- validation email / téléphone
- normalisation téléphone
- déduplication fichier et CRM
- historique des imports

Documentation CRM :
Un onglet "Documentation CRM" a été créé dans l'admin pour suivre l'architecture du projet.

Sections actuelles :
- Vue générale
- Structure du CRM
- Technologies
- Base de données
- Rôles et accès
- Contexte projet
- Contexte ChatGPT

Objectif du projet :
Créer un CRM solide et bien structuré qui pourra servir de base pour plusieurs projets SaaS différents.`;

export const PLACEHOLDER: Record<TabId, string> = {
  'structure-crm': `Décrivez la structure du CRM.\n\nEx :\n- Organisation des modules\n- Flux de navigation\n- Hiérarchie des vues`,
  'technologies': `Technologies utilisées :\n\nFrontend :\n- React\n- TypeScript\n- Vite\n\nLanguages :\n- TypeScript\n- JavaScript\n- SQL\n- HTML\n- CSS\n\nStyling :\n- Tailwind CSS\n\nBackend / Base de données :\n- Supabase\n- PostgreSQL\n\nRealtime :\n- Supabase Realtime\n\nAuthentification :\n- Supabase Auth`,
  'base-de-donnees': `Documentez le schéma de base de données.\n\nEx :\n- Tables principales\n- Relations entre tables\n- Politiques RLS en place`,
  'contexte-chatgpt': CONTEXTE_CHATGPT_INITIAL,
  'documentation-generale': `Écrivez ici la documentation générale du projet…`,
  'ameliorations': '',
  'idees': '',
  'audit-technique': '',
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
