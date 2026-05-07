import type { TreeNode } from './structureCrmData';

export const PROJECT_TREE: TreeNode[] = [
  {
    name: 'src/',
    type: 'folder',
    description: 'Code source principal',
    children: [
      { name: 'main.tsx', type: 'file', description: 'Point d\'entree React' },
      { name: 'App.tsx', type: 'file', description: 'Routage principal et gestion d\'auth' },
      { name: 'index.css', type: 'file', description: 'Styles globaux Tailwind' },
      { name: 'vite-env.d.ts', type: 'file', description: 'Types Vite' },
      {
        name: 'components/',
        type: 'folder',
        description: 'Composants partages',
        children: [
          { name: 'LoginModal.tsx', type: 'file', description: 'Modal de connexion' },
          { name: 'RegisterModal.tsx', type: 'file', description: 'Modal d\'inscription' },
          {
            name: 'agenda/',
            type: 'folder',
            description: 'Composant agenda reutilisable',
            children: [
              { name: 'AgendaView.tsx', type: 'file', description: 'Vue calendrier partagee' },
            ],
          },
          {
            name: 'chat/',
            type: 'folder',
            description: 'Composant chat reutilisable',
            children: [
              { name: 'ChatView.tsx', type: 'file', description: 'Vue messagerie partagee' },
            ],
          },
        ],
      },
      {
        name: 'contexts/',
        type: 'folder',
        description: 'Contextes React globaux',
        children: [
          { name: 'ThemeContext.tsx', type: 'file', description: 'Gestion du theme clair/sombre' },
        ],
      },
      {
        name: 'lib/',
        type: 'folder',
        description: 'Utilitaires et logique metier',
        children: [
          { name: 'supabase.ts', type: 'file', description: 'Client Supabase singleton' },
          { name: 'themeTokens.ts', type: 'file', description: 'Tokens de design (couleurs, ombres)' },
          { name: 'csvImportPipeline.ts', type: 'file', description: 'Pipeline d\'import CSV pour leads' },
          { name: 'phoneNormalizer.ts', type: 'file', description: 'Normalisation des numeros de telephone' },
          { name: 'fetchTableSchema.ts', type: 'file', description: 'Introspection schema BDD' },
          { name: 'exportDocumentation.ts', type: 'file', description: 'Export JSON de la documentation' },
          { name: 'importDocumentation.ts', type: 'file', description: 'Import JSON de la documentation' },
        ],
      },
      {
        name: 'pages/',
        type: 'folder',
        description: 'Pages de l\'application',
        children: [
          { name: 'Dashboard.tsx', type: 'file', description: 'Routeur de dashboards par role' },
          {
            name: 'admin/',
            type: 'folder',
            description: 'Dashboard administrateur',
            children: [
              { name: 'AdminDashboard.tsx', type: 'file', description: 'Layout principal admin' },
              { name: 'Sidebar.tsx', type: 'file', description: 'Navigation laterale admin' },
              { name: 'TopBar.tsx', type: 'file', description: 'Barre superieure admin' },
              {
                name: 'views/',
                type: 'folder',
                description: 'Vues admin',
                children: [
                  { name: 'VueEnsemble.tsx', type: 'file', description: 'Tableau de bord general' },
                  { name: 'Crm.tsx', type: 'file', description: 'Vue CRM des leads' },
                  { name: 'AjouterLeads.tsx', type: 'file', description: 'Formulaire ajout lead' },
                  { name: 'ImportLeads.tsx', type: 'file', description: 'Import CSV de leads' },
                  { name: 'Statuts.tsx', type: 'file', description: 'Gestion des statuts' },
                  { name: 'ListeVendeurs.tsx', type: 'file', description: 'Liste des vendeurs' },
                  { name: 'AjouterVendeur.tsx', type: 'file', description: 'Ajout vendeur' },
                  { name: 'ChatClient.tsx', type: 'file', description: 'Chat avec clients' },
                  { name: 'ChatVendeur.tsx', type: 'file', description: 'Chat avec vendeurs' },
                  { name: 'PropositionsRdv.tsx', type: 'file', description: 'Propositions de RDV' },
                  { name: 'Agenda.tsx', type: 'file', description: 'Agenda admin' },
                  { name: 'DocumentationCrm.tsx', type: 'file', description: 'Hub documentation CRM' },
                  { name: 'InfoAdmin.tsx', type: 'file', description: 'Informations admin' },
                  { name: 'Inscription.tsx', type: 'file', description: 'Gestion inscriptions' },
                  {
                    name: 'documentation/',
                    type: 'folder',
                    description: 'Sous-vues documentation',
                    children: [
                      { name: 'DocGeneraleView.tsx', type: 'file', description: 'Vue documentation generale' },
                      { name: 'ContextCardsView.tsx', type: 'file', description: 'Cartes de contexte ChatGPT' },
                      { name: 'ContextCardModal.tsx', type: 'file', description: 'Modal edition carte contexte' },
                      { name: 'TechnologiesView.tsx', type: 'file', description: 'Vue technologies utilisees' },
                      { name: 'DatabaseView.tsx', type: 'file', description: 'Vue schema base de donnees' },
                      { name: 'StructureCrmView.tsx', type: 'file', description: 'Vue structure du CRM' },
                      { name: 'ContentBlocksView.tsx', type: 'file', description: 'Blocs de contenu par page' },
                      { name: 'PageChecklistView.tsx', type: 'file', description: 'Checklist par page' },
                      { name: 'PageTasksView.tsx', type: 'file', description: 'Taches par page' },
                      { name: 'ImportExportPanel.tsx', type: 'file', description: 'Import/export documentation' },
                      { name: 'databaseDocumentation.ts', type: 'file', description: 'Donnees statiques schema BDD' },
                    ],
                  },
                  {
                    name: 'ideas/',
                    type: 'folder',
                    description: 'Gestion des idees',
                    children: [
                      { name: 'IdeasView.tsx', type: 'file', description: 'Liste des idees' },
                      { name: 'IdeaModal.tsx', type: 'file', description: 'Modal edition idee' },
                    ],
                  },
                  {
                    name: 'import/',
                    type: 'folder',
                    description: 'UI d\'import CSV',
                    children: [
                      { name: 'ImportModeSelector.tsx', type: 'file', description: 'Selecteur mode import' },
                      { name: 'ImportResult.tsx', type: 'file', description: 'Resultat d\'import' },
                      { name: 'ImportStats.tsx', type: 'file', description: 'Statistiques import' },
                      { name: 'PreviewTable.tsx', type: 'file', description: 'Apercu donnees CSV' },
                    ],
                  },
                  {
                    name: 'notes/',
                    type: 'folder',
                    description: 'Systeme de notes',
                    children: [
                      { name: 'NotesList.tsx', type: 'file', description: 'Liste des notes' },
                      { name: 'NoteModal.tsx', type: 'file', description: 'Modal edition note' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'vendor/',
            type: 'folder',
            description: 'Dashboard vendeur',
            children: [
              { name: 'VendorDashboard.tsx', type: 'file', description: 'Layout principal vendeur' },
              { name: 'VendorSidebar.tsx', type: 'file', description: 'Navigation laterale vendeur' },
              { name: 'VendorTopBar.tsx', type: 'file', description: 'Barre superieure vendeur' },
              {
                name: 'views/',
                type: 'folder',
                description: 'Vues vendeur',
                children: [
                  { name: 'VendorVueEnsemble.tsx', type: 'file', description: 'Tableau de bord vendeur' },
                  { name: 'VendorLeads.tsx', type: 'file', description: 'Leads assignes au vendeur' },
                  { name: 'VendorChatAdmin.tsx', type: 'file', description: 'Chat vendeur-admin' },
                  { name: 'VendorChatClient.tsx', type: 'file', description: 'Chat vendeur-client' },
                  { name: 'VendorPropositionsRdv.tsx', type: 'file', description: 'RDV vendeur' },
                  { name: 'VendorAgenda.tsx', type: 'file', description: 'Agenda vendeur' },
                ],
              },
            ],
          },
          {
            name: 'client/',
            type: 'folder',
            description: 'Dashboard client',
            children: [
              { name: 'ClientDashboard.tsx', type: 'file', description: 'Layout principal client' },
              { name: 'ClientSidebar.tsx', type: 'file', description: 'Navigation laterale client' },
              { name: 'ClientTopBar.tsx', type: 'file', description: 'Barre superieure client' },
              {
                name: 'views/',
                type: 'folder',
                description: 'Vues client',
                children: [
                  { name: 'ClientMessagerie.tsx', type: 'file', description: 'Messagerie client' },
                  { name: 'ClientPropositionsRdv.tsx', type: 'file', description: 'RDV client' },
                  { name: 'ClientAgenda.tsx', type: 'file', description: 'Agenda client' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'supabase/',
    type: 'folder',
    description: 'Configuration et migrations Supabase',
    children: [
      { name: 'config.toml', type: 'file', description: 'Configuration locale Supabase' },
      { name: 'seed.sql', type: 'file', description: 'Donnees de seed initiales' },
      {
        name: 'migrations/',
        type: 'folder',
        description: 'Migrations SQL du schema',
        children: [
          { name: '*.sql', type: 'file', description: 'Fichiers de migration versiones' },
        ],
      },
      {
        name: 'functions/',
        type: 'folder',
        description: 'Edge Functions Supabase',
        children: [
          {
            name: 'create-user/',
            type: 'folder',
            description: 'Creation d\'utilisateur',
            children: [
              { name: 'index.ts', type: 'file', description: 'Edge function creation compte' },
            ],
          },
        ],
      },
    ],
  },
];
