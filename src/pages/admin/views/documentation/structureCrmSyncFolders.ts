import type { TreeNode, FolderSection } from './structureCrmData';
import { countFiles, countFolders, getSubtree, listDirectChildren } from './structureCrmSyncHelpers';

export function buildFolderSections(tree: TreeNode[], migrations: number, edgeFunctions: number): FolderSection[] {
  const sections: FolderSection[] = [];

  const srcNode = getSubtree(tree, ['src']);
  if (srcNode) {
    sections.push({
      id: 'src',
      title: `src/ -- Code source (${countFiles(srcNode.children ?? [])} fichiers, ${countFolders(srcNode.children ?? [])} dossiers)`,
      icon: null,
      color: '#38bdf8',
      description: 'Contient tout le code frontend de l\'application React.',
      role: 'Racine du code applicatif.',
      contains: listDirectChildren(srcNode),
    });
  }

  const libNode = getSubtree(tree, ['src', 'lib']);
  if (libNode) {
    sections.push({
      id: 'lib',
      title: `src/lib/ -- Logique metier (${countFiles(libNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#34d399',
      description: 'Fonctions utilitaires, client Supabase, et logique metier partagee.',
      role: 'Separation claire entre la logique metier (lib/) et l\'interface (pages/, components/).',
      contains: listDirectChildren(libNode),
    });
  }

  const hooksNode = getSubtree(tree, ['src', 'hooks']);
  if (hooksNode) {
    sections.push({
      id: 'hooks',
      title: `src/hooks/ -- Hooks personnalises (${countFiles(hooksNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#f59e0b',
      description: 'Hooks React reutilisables a travers l\'application.',
      role: 'Centralise la logique reactive partagee (notifications, theme, messages non lus).',
      contains: listDirectChildren(hooksNode),
    });
  }

  const ctxNode = getSubtree(tree, ['src', 'contexts']);
  if (ctxNode) {
    sections.push({
      id: 'contexts',
      title: `src/contexts/ -- Contextes React (${countFiles(ctxNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#8b5cf6',
      description: 'Contextes React globaux (theme, timezone).',
      role: 'Gestion d\'etat global accessible par tous les composants.',
      contains: listDirectChildren(ctxNode),
    });
  }

  const compNode = getSubtree(tree, ['src', 'components']);
  if (compNode) {
    sections.push({
      id: 'components',
      title: `src/components/ -- Composants partages (${countFiles(compNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#fb923c',
      description: 'Composants reutilisables partages entre les differents dashboards.',
      role: 'Evite la duplication de code entre admin, vendeur et client.',
      contains: listDirectChildren(compNode),
    });
  }

  const adminNode = getSubtree(tree, ['src', 'pages', 'admin']);
  if (adminNode) {
    sections.push({
      id: 'pages-admin',
      title: `src/pages/admin/ -- Dashboard administrateur (${countFiles(adminNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#f472b6',
      description: 'Toutes les vues et la logique specifiques a l\'administrateur.',
      role: 'Interface complete d\'administration.',
      contains: listDirectChildren(adminNode),
    });
  }

  const vendorNode = getSubtree(tree, ['src', 'pages', 'vendor']);
  if (vendorNode) {
    sections.push({
      id: 'pages-vendor',
      title: `src/pages/vendor/ -- Dashboard vendeur (${countFiles(vendorNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#a78bfa',
      description: 'Interface dediee aux vendeurs.',
      role: 'Vue simplifiee centree sur les taches du vendeur.',
      contains: listDirectChildren(vendorNode),
    });
  }

  const clientNode = getSubtree(tree, ['src', 'pages', 'client']);
  if (clientNode) {
    sections.push({
      id: 'pages-client',
      title: `src/pages/client/ -- Dashboard client (${countFiles(clientNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#22d3ee',
      description: 'Interface client minimale.',
      role: 'Vue minimaliste : messagerie et propositions de RDV.',
      contains: listDirectChildren(clientNode),
    });
  }

  const genNode = getSubtree(tree, ['src', 'generated']);
  if (genNode) {
    sections.push({
      id: 'generated',
      title: `src/generated/ -- Fichiers generes (${countFiles(genNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#64748b',
      description: 'Fichiers generes automatiquement (snapshots, types).',
      role: 'Donnees generees par les scripts, ne pas editer manuellement.',
      contains: listDirectChildren(genNode),
    });
  }

  const scriptsNode = getSubtree(tree, ['scripts']);
  if (scriptsNode) {
    sections.push({
      id: 'scripts',
      title: `scripts/ -- Scripts utilitaires (${countFiles(scriptsNode.children ?? [])} fichiers)`,
      icon: null,
      color: '#06b6d4',
      description: 'Scripts de build, analyse et audit.',
      role: 'Automatisation : analyse du code, audit, generation de snapshots.',
      contains: listDirectChildren(scriptsNode),
    });
  }

  const supabaseNode = getSubtree(tree, ['supabase']);
  if (supabaseNode) {
    sections.push({
      id: 'supabase',
      title: `supabase/ -- Backend et base de donnees`,
      icon: null,
      color: '#4ade80',
      description: `${migrations} migrations SQL, ${edgeFunctions} Edge Functions.`,
      role: 'Tout ce qui concerne le backend : schema BDD, securite RLS, et fonctions serveur.',
      contains: listDirectChildren(supabaseNode),
    });
  }

  return sections;
}
