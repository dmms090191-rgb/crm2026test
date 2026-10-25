import type { TreeNode, FolderSection } from './structureCrmData';
import { insertIntoTree, sortTree, countFiles, countFolders, renderTreeText } from './structureCrmSyncHelpers';
import { buildFolderSections } from './structureCrmSyncFolders';

// --- La liste des fichiers du projet, etablie au build ---
//
// Ces cinq listes venaient d'import.meta.glob. Seules les CLES etaient utilisees, jamais le
// contenu — mais un glob, meme en eager:false, oblige Vite a emettre un module par fichier
// trouve. Le code source du projet partait donc dans le paquet public, et depuis la creation
// du projet Android, dans l'APK : tout src/, les 218 migrations SQL, les 49 edge functions,
// les 82 scripts. Mesure du 25/10/2026, en ne changeant que ces cinq lignes : 1 190 fichiers
// et 12 Mo dans dist/assets avec les globs, contre 119 fichiers et 5,7 Mo sans.
//
// Retirer le seul query:'?raw' ne suffisait pas : le build ECHOUE alors, Rollup essayant de
// resoudre les .sql et les .toml comme des modules JavaScript.
//
// scripts/structureProjetPlugin.ts ecrit donc la seule chose utile ici — les chemins — dans
// src/generated/structureProjet.json, en reprenant le motif de auditSnapshot.json. Aucun
// contenu de fichier n est lu, donc rien ne peut fuiter. La forme des chemins est identique
// a celle que rendait import.meta.glob, barre oblique de tete comprise, car syncStructure()
// depouille « /supabase/functions/ » pour compter les edge functions.
import structureProjet from '../../../../generated/structureProjet.json';

const SRC_FILES: string[] = structureProjet.src;
const SUPABASE_FUNCTIONS: string[] = structureProjet.supabaseFunctions;
const SUPABASE_MIGRATIONS: string[] = structureProjet.supabaseMigrations;
const SUPABASE_ROOT: string[] = structureProjet.supabaseRoot;
const SCRIPTS_FILES: string[] = structureProjet.scripts;

const ROOT_FILES = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'index.html',
  'eslint.config.js',
  'README.md',
  'SETUP.md',
  '.env.example',
  '.gitignore',
];

// --- Tree building ---

export function buildRealTree(): TreeNode[] {
  const allPaths: string[] = [];

  for (const p of SRC_FILES) allPaths.push(p.replace(/^\//, ''));
  for (const p of SUPABASE_FUNCTIONS) allPaths.push(p.replace(/^\//, ''));
  for (const p of SUPABASE_MIGRATIONS) allPaths.push(p.replace(/^\//, ''));
  for (const p of SUPABASE_ROOT) allPaths.push(p.replace(/^\//, ''));
  for (const p of SCRIPTS_FILES) allPaths.push(p.replace(/^\//, ''));
  for (const f of ROOT_FILES) allPaths.push(f);

  const tree: TreeNode[] = [];
  for (const path of allPaths) {
    const parts = path.split('/');
    insertIntoTree(tree, parts, true);
  }

  return sortTree(tree);
}

// --- Sync result ---

export interface SyncResult {
  tree: TreeNode[];
  folders: FolderSection[];
  stats: {
    totalFiles: number;
    totalFolders: number;
    migrations: number;
    edgeFunctions: number;
  };
}

export function syncStructure(): SyncResult {
  const tree = buildRealTree();

  const migrations = SUPABASE_MIGRATIONS.length;
  const edgeFunctions = new Set(
    SUPABASE_FUNCTIONS.map((p) => p.replace(/^\/supabase\/functions\//, '').split('/')[0])
  ).size;

  const totalFiles = countFiles(tree);
  const totalFolders = countFolders(tree);

  const folders = buildFolderSections(tree, migrations, edgeFunctions);

  return { tree, folders, stats: { totalFiles, totalFolders, migrations, edgeFunctions } };
}

// --- Text export for Copier ---

export function buildSyncedStructureText(result: SyncResult): string {
  const parts: string[] = [];

  parts.push('=== STRUCTURE DU CRM ===');
  parts.push('');
  parts.push(`Fichiers totaux : ${result.stats.totalFiles}`);
  parts.push(`Dossiers totaux : ${result.stats.totalFolders}`);
  parts.push(`Migrations SQL  : ${result.stats.migrations}`);
  parts.push(`Edge Functions  : ${result.stats.edgeFunctions}`);
  parts.push('');

  parts.push('--- ARBORESCENCE COMPLETE ---');
  parts.push('');
  renderTreeText(result.tree, parts, '');
  parts.push('');

  parts.push('--- DETAIL DES DOSSIERS ---');
  parts.push('');
  for (const s of result.folders) {
    parts.push(`## ${s.title}`);
    parts.push(`   ${s.description}`);
    parts.push(`   Role : ${s.role}`);
    parts.push('   Contenu :');
    for (const c of s.contains) {
      parts.push(`     - ${c}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
