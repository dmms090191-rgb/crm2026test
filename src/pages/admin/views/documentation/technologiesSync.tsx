import {
  Code2, Database, Globe, Box,
  Paintbrush, Server, Lock, Radio, Wrench, Eye
} from 'lucide-react';
import type { TechCategory } from './technologiesData';
import packageJson from '../../../../../package.json';

interface ArchNode {
  label: string;
  color: string;
  icon: React.ReactNode;
}

const deps: Record<string, string> = { ...packageJson.dependencies, ...packageJson.devDependencies };

function getVersion(pkg: string): string {
  const raw = deps[pkg] ?? '';
  return raw.replace(/[\^~>=<]/g, '').split('.')[0] || '';
}

function has(pkg: string): boolean {
  return pkg in deps;
}

export function detectStack(): TechCategory[] {
  const stack: TechCategory[] = [];

  // Frontend
  const frontendItems: TechCategory['items'] = [];
  if (has('react')) frontendItems.push({ name: 'React', description: 'UI library', badge: getVersion('react') });
  if (has('react-dom')) frontendItems.push({ name: 'React DOM', description: 'Rendering', badge: getVersion('react-dom') });
  if (has('vite') || has('@vitejs/plugin-react')) frontendItems.push({ name: 'Vite', description: 'Build tool & dev server', badge: getVersion('vite') });
  if (has('next')) frontendItems.push({ name: 'Next.js', description: 'React framework', badge: getVersion('next') });
  if (has('vue')) frontendItems.push({ name: 'Vue', description: 'UI framework', badge: getVersion('vue') });
  if (frontendItems.length > 0) {
    stack.push({ id: 'frontend', label: 'Frontend', icon: <Globe className="w-4 h-4" />, color: '#38bdf8', items: frontendItems });
  }

  // Languages
  const langItems: TechCategory['items'] = [];
  if (has('typescript')) langItems.push({ name: 'TypeScript', badge: getVersion('typescript') });
  langItems.push({ name: 'JavaScript (ES2020+)' });
  if (has('@supabase/supabase-js') || Object.keys(deps).some((d) => d.includes('sql') || d.includes('postgres'))) {
    langItems.push({ name: 'SQL' });
  }
  langItems.push({ name: 'HTML' });
  langItems.push({ name: 'CSS' });
  if (Object.keys(deps).some((d) => d.includes('python'))) langItems.push({ name: 'Python' });
  stack.push({ id: 'languages', label: 'Languages', icon: <Code2 className="w-4 h-4" />, color: '#fb923c', items: langItems });

  // Styling
  const styleItems: TechCategory['items'] = [];
  if (has('tailwindcss')) styleItems.push({ name: 'Tailwind CSS', description: 'Utility-first CSS', badge: getVersion('tailwindcss') });
  if (has('postcss')) styleItems.push({ name: 'PostCSS', description: 'CSS transforms' });
  if (has('autoprefixer')) styleItems.push({ name: 'Autoprefixer', description: 'Vendor prefixes' });
  if (has('sass') || has('node-sass')) styleItems.push({ name: 'Sass', description: 'CSS preprocessor' });
  if (has('styled-components')) styleItems.push({ name: 'Styled Components', description: 'CSS-in-JS' });
  if (styleItems.length > 0) {
    stack.push({ id: 'styling', label: 'Styling', icon: <Paintbrush className="w-4 h-4" />, color: '#34d399', items: styleItems });
  }

  // UI / Icons
  const uiItems: TechCategory['items'] = [];
  if (has('lucide-react')) uiItems.push({ name: 'Lucide React', description: 'Icones SVG', badge: getVersion('lucide-react') });
  if (has('@heroicons/react')) uiItems.push({ name: 'Heroicons', description: 'Icones SVG' });
  if (has('@radix-ui/react-dialog') || Object.keys(deps).some((d) => d.startsWith('@radix-ui'))) uiItems.push({ name: 'Radix UI', description: 'Primitives headless' });
  if (has('@headlessui/react')) uiItems.push({ name: 'Headless UI', description: 'Composants accessibles' });
  if (uiItems.length > 0) {
    stack.push({ id: 'ui', label: 'UI / Icones', icon: <Eye className="w-4 h-4" />, color: '#e879f9', items: uiItems });
  }

  // Backend / Database
  const backendItems: TechCategory['items'] = [];
  if (has('@supabase/supabase-js')) backendItems.push({ name: 'Supabase', description: 'Backend as a Service', badge: 'BaaS' });
  backendItems.push({ name: 'PostgreSQL', description: 'Base de donnees relationnelle', badge: '15+' });
  if (has('@supabase/supabase-js')) backendItems.push({ name: 'Edge Functions', description: 'Fonctions serverless (Deno)', badge: 'Deno' });
  if (has('express')) backendItems.push({ name: 'Express', description: 'Serveur Node.js', badge: getVersion('express') });
  if (has('prisma') || has('@prisma/client')) backendItems.push({ name: 'Prisma', description: 'ORM TypeScript' });
  if (backendItems.length > 0) {
    stack.push({ id: 'backend', label: 'Backend / Base de donnees', icon: <Server className="w-4 h-4" />, color: '#a78bfa', items: backendItems });
  }

  // Realtime
  const realtimeItems: TechCategory['items'] = [];
  if (has('@supabase/supabase-js')) {
    realtimeItems.push({ name: 'Supabase Realtime', description: 'WebSockets sur PostgreSQL', badge: 'WS' });
    realtimeItems.push({ name: 'Postgres Changes', description: 'Ecoute des mutations en base', badge: 'CDC' });
  }
  if (has('socket.io') || has('socket.io-client')) realtimeItems.push({ name: 'Socket.IO', description: 'WebSockets bidirectionnels' });
  if (realtimeItems.length > 0) {
    stack.push({ id: 'realtime', label: 'Realtime', icon: <Radio className="w-4 h-4" />, color: '#f472b6', items: realtimeItems });
  }

  // Auth
  const authItems: TechCategory['items'] = [];
  if (has('@supabase/supabase-js')) {
    authItems.push({ name: 'Supabase Auth', description: 'Auth email/password + JWT', badge: 'JWT' });
    authItems.push({ name: 'Row Level Security', description: "Controle d'acces au niveau ligne", badge: 'RLS' });
  }
  if (has('next-auth') || has('@auth/core')) authItems.push({ name: 'NextAuth', description: 'Auth multi-provider' });
  if (authItems.length > 0) {
    stack.push({ id: 'auth', label: 'Authentification', icon: <Lock className="w-4 h-4" />, color: '#fbbf24', items: authItems });
  }

  // Build & Quality Tools
  const toolItems: TechCategory['items'] = [];
  if (has('vite')) toolItems.push({ name: 'Vite', description: 'Bundler & HMR' });
  if (has('eslint')) toolItems.push({ name: 'ESLint', description: 'Linter JavaScript/TypeScript' });
  if (has('prettier')) toolItems.push({ name: 'Prettier', description: 'Formatter' });
  if (has('jest') || has('vitest')) toolItems.push({ name: has('vitest') ? 'Vitest' : 'Jest', description: 'Tests unitaires' });
  if (has('@testing-library/react')) toolItems.push({ name: 'Testing Library', description: 'Tests composants' });
  toolItems.push({ name: 'npm', description: 'Gestionnaire de paquets' });
  if (toolItems.length > 0) {
    stack.push({ id: 'tools', label: 'Outils de Build & Qualite', icon: <Wrench className="w-4 h-4" />, color: '#22d3ee', items: toolItems });
  }

  // APIs
  const apiItems: TechCategory['items'] = [];
  if (Object.keys(deps).some((d) => d.includes('audio') || d.includes('howler'))) apiItems.push({ name: 'Web Audio API' });
  apiItems.push({ name: 'LocalStorage API', description: 'Persistence locale' });
  apiItems.push({ name: 'Clipboard API', description: 'Copier/coller' });
  if (apiItems.length > 0) {
    stack.push({ id: 'apis', label: 'APIs Navigateur', icon: <Box className="w-4 h-4" />, color: '#4ade80', items: apiItems });
  }

  return stack;
}

export function detectArchitecture(): ArchNode[] {
  const nodes: ArchNode[] = [];

  if (has('react') || has('vue') || has('next')) {
    nodes.push({ label: 'Frontend (React + Vite)', color: '#38bdf8', icon: <Globe className="w-3 h-3" /> });
  }
  if (has('@supabase/supabase-js')) {
    nodes.push({ label: 'Supabase SDK', color: '#a78bfa', icon: <Database className="w-3 h-3" /> });
    nodes.push({ label: 'PostgreSQL', color: '#34d399', icon: <Database className="w-3 h-3" /> });
    nodes.push({ label: 'Edge Functions', color: '#fb923c', icon: <Server className="w-3 h-3" /> });
    nodes.push({ label: 'Realtime', color: '#f472b6', icon: <Radio className="w-3 h-3" /> });
    nodes.push({ label: 'Auth / RLS', color: '#fbbf24', icon: <Lock className="w-3 h-3" /> });
  }
  if (has('express')) {
    nodes.push({ label: 'Express Server', color: '#fb923c', icon: <Server className="w-3 h-3" /> });
  }

  return nodes;
}
