import type { TreeNode, FolderSection } from './structureCrmData';
import { insertIntoTree, sortTree, countFiles, countFolders, renderTreeText } from './structureCrmSyncHelpers';
import { buildFolderSections } from './structureCrmSyncFolders';

// --- Glob all project files at build time ---
const SRC_FILES = Object.keys(import.meta.glob('/src/**/*.{ts,tsx,css,json}', { eager: false }));
const SUPABASE_FUNCTIONS = Object.keys(import.meta.glob('/supabase/functions/**/*.ts', { eager: false, query: '?raw' }));
const SUPABASE_MIGRATIONS = Object.keys(import.meta.glob('/supabase/migrations/**/*.sql', { eager: false, query: '?raw' }));
const SUPABASE_ROOT = Object.keys(import.meta.glob('/supabase/*.{toml,sql}', { eager: false, query: '?raw' }));
const SCRIPTS_FILES = Object.keys(import.meta.glob('/scripts/**/*.{ts,js}', { eager: false, query: '?raw' }));

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
