import { FileCode, Layers, LayoutGrid as Layout, Users, ShieldCheck, Server } from 'lucide-react';

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  description?: string;
  children?: TreeNode[];
}

export interface FolderSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  role: string;
  contains: string[];
}

export { PROJECT_TREE } from './structureCrmTree';

export const FOLDER_SECTIONS: FolderSection[] = [
  {
    id: 'src',
    title: 'src/ — Code source',
    icon: <FileCode className="w-4 h-4" />,
    color: '#38bdf8',
    description: 'Contient tout le code frontend de l\'application React.',
    role: 'Racine du code applicatif. Tout le TypeScript/React passe par ce dossier.',
    contains: [
      'main.tsx : point d\'entree, initialisation React',
      'App.tsx : routage principal, gestion de l\'authentification, redirection par role',
      'index.css : styles globaux et configuration Tailwind',
    ],
  },
  {
    id: 'lib',
    title: 'src/lib/ — Logique metier et utilitaires',
    icon: <Layers className="w-4 h-4" />,
    color: '#34d399',
    description: 'Fonctions utilitaires, client Supabase, et logique metier partagee.',
    role: 'Separation claire entre la logique metier (lib/) et l\'interface (pages/, components/).',
    contains: [
      'supabase.ts : instance singleton du client Supabase',
      'themeTokens.ts : systeme de design tokens pour theme clair/sombre',
      'csvImportPipeline.ts : pipeline complet d\'import CSV avec validation',
      'phoneNormalizer.ts : normalisation des numeros de telephone',
      'fetchTableSchema.ts : introspection automatique du schema BDD',
      'exportDocumentation.ts / importDocumentation.ts : import/export JSON de la doc',
    ],
  },
  {
    id: 'components',
    title: 'src/components/ — Composants partages',
    icon: <Layout className="w-4 h-4" />,
    color: '#fb923c',
    description: 'Composants reutilisables partages entre les differents dashboards.',
    role: 'Evite la duplication de code. Contient les composants communs a admin, vendeur et client.',
    contains: [
      'LoginModal.tsx / RegisterModal.tsx : authentification',
      'agenda/AgendaView.tsx : vue calendrier utilisee par les 3 roles',
      'chat/ChatView.tsx : vue messagerie utilisee par les 3 roles',
    ],
  },
  {
    id: 'pages-admin',
    title: 'src/pages/admin/ — Dashboard administrateur',
    icon: <ShieldCheck className="w-4 h-4" />,
    color: '#f472b6',
    description: 'Toutes les vues et la logique specifiques a l\'administrateur.',
    role: 'Interface complete d\'administration : gestion des leads, vendeurs, documentation, chat, agenda.',
    contains: [
      'AdminDashboard.tsx : layout avec sidebar + topbar + vue active',
      'views/ : toutes les vues admin (CRM, import, vendeurs, chat, documentation...)',
      'views/documentation/ : sous-systeme de documentation CRM avec sous-onglets',
      'views/ideas/ : gestion des idees avec Kanban',
      'views/import/ : interface d\'import CSV multi-etapes',
      'views/notes/ : systeme de notes avec modal',
    ],
  },
  {
    id: 'pages-vendor',
    title: 'src/pages/vendor/ — Dashboard vendeur',
    icon: <Users className="w-4 h-4" />,
    color: '#a78bfa',
    description: 'Interface dediee aux vendeurs pour gerer leurs leads et communications.',
    role: 'Vue simplifiee centree sur les taches du vendeur : leads assignes, chat, agenda.',
    contains: [
      'VendorDashboard.tsx : layout vendeur',
      'views/VendorLeads.tsx : leads assignes au vendeur',
      'views/VendorChatAdmin.tsx : messagerie avec l\'admin',
      'views/VendorChatClient.tsx : messagerie avec les clients',
      'views/VendorPropositionsRdv.tsx : gestion des RDV',
    ],
  },
  {
    id: 'pages-client',
    title: 'src/pages/client/ — Dashboard client',
    icon: <Users className="w-4 h-4" />,
    color: '#22d3ee',
    description: 'Interface client minimale pour les echanges et rendez-vous.',
    role: 'Vue minimaliste : messagerie et propositions de RDV uniquement.',
    contains: [
      'ClientDashboard.tsx : layout client',
      'views/ClientMessagerie.tsx : messagerie client',
      'views/ClientPropositionsRdv.tsx : propositions de RDV',
      'views/ClientAgenda.tsx : agenda client',
    ],
  },
  {
    id: 'supabase',
    title: 'supabase/ — Backend et base de donnees',
    icon: <Server className="w-4 h-4" />,
    color: '#4ade80',
    description: 'Configuration Supabase, migrations SQL et Edge Functions.',
    role: 'Tout ce qui concerne le backend : schema BDD, securite RLS, et fonctions serveur.',
    contains: [
      'config.toml : configuration du projet Supabase',
      'seed.sql : donnees initiales',
      'migrations/ : fichiers SQL de migration versiones (schema, RLS, triggers)',
      'functions/create-user/ : Edge Function pour creer des comptes utilisateur',
    ],
  },
];
