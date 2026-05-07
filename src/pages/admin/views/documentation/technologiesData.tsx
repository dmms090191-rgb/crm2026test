import {
  Code2, Database, Globe, Box,
  Paintbrush, Server, Lock, Radio
} from 'lucide-react';

export interface TechItem {
  name: string;
  description?: string;
  badge?: string;
}

export interface TechCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: TechItem[];
}

export const DEFAULT_STACK: TechCategory[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    icon: <Globe className="w-4 h-4" />,
    color: '#38bdf8',
    items: [
      { name: 'React', description: 'UI library', badge: '18' },
      { name: 'TypeScript', description: 'Typage statique', badge: '5.x' },
      { name: 'Vite', description: 'Build tool & dev server', badge: '5.x' },
    ],
  },
  {
    id: 'styling',
    label: 'Styling',
    icon: <Paintbrush className="w-4 h-4" />,
    color: '#34d399',
    items: [
      { name: 'Tailwind CSS', description: 'Utility-first CSS framework', badge: '3.x' },
      { name: 'Lucide React', description: 'Icônes SVG', badge: '0.344' },
    ],
  },
  {
    id: 'languages',
    label: 'Langages',
    icon: <Code2 className="w-4 h-4" />,
    color: '#fb923c',
    items: [
      { name: 'TypeScript' },
      { name: 'JavaScript' },
      { name: 'SQL' },
      { name: 'HTML' },
      { name: 'CSS' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend / Base de données',
    icon: <Server className="w-4 h-4" />,
    color: '#a78bfa',
    items: [
      { name: 'Supabase', description: 'Backend as a Service', badge: 'BaaS' },
      { name: 'PostgreSQL', description: 'Base de données relationnelle', badge: '15+' },
      { name: 'Edge Functions', description: 'Fonctions serverless (Deno)', badge: 'Deno' },
    ],
  },
  {
    id: 'realtime',
    label: 'Realtime',
    icon: <Radio className="w-4 h-4" />,
    color: '#f472b6',
    items: [
      { name: 'Supabase Realtime', description: 'WebSockets sur PostgreSQL', badge: 'WS' },
      { name: 'Postgres Changes', description: 'Écoute des mutations en base', badge: 'CDC' },
    ],
  },
  {
    id: 'auth',
    label: 'Authentification',
    icon: <Lock className="w-4 h-4" />,
    color: '#fbbf24',
    items: [
      { name: 'Supabase Auth', description: 'Auth email/password + JWT', badge: 'JWT' },
      { name: 'Row Level Security', description: 'Contrôle d\'accès au niveau ligne', badge: 'RLS' },
    ],
  },
];

export function parseTextToStack(text: string): TechCategory[] {
  const lines = text.split('\n');
  const categories: TechCategory[] = [];
  let current: TechCategory | null = null;
  const colorPalette = ['#38bdf8', '#34d399', '#fb923c', '#a78bfa', '#f472b6', '#fbbf24', '#e879f9', '#4ade80'];
  const iconMap: Record<string, React.ReactNode> = {
    frontend: <Globe className="w-4 h-4" />,
    styling: <Paintbrush className="w-4 h-4" />,
    langages: <Code2 className="w-4 h-4" />,
    'languages': <Code2 className="w-4 h-4" />,
    backend: <Server className="w-4 h-4" />,
    'base de données': <Database className="w-4 h-4" />,
    realtime: <Radio className="w-4 h-4" />,
    'authentification': <Lock className="w-4 h-4" />,
    auth: <Lock className="w-4 h-4" />,
  };

  let colorIdx = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith(':') && !trimmed.startsWith('-')) {
      const label = trimmed.slice(0, -1);
      const key = label.toLowerCase();
      const icon = Object.entries(iconMap).find(([k]) => key.includes(k))?.[1] ?? <Box className="w-4 h-4" />;
      current = {
        id: key.replace(/\s+/g, '-'),
        label,
        icon,
        color: colorPalette[colorIdx % colorPalette.length],
        items: [],
      };
      colorIdx++;
      categories.push(current);
    } else if (trimmed.startsWith('-') && current) {
      const content = trimmed.slice(1).trim();
      const parts = content.split(' : ');
      if (parts.length === 2) {
        current.items.push({ name: parts[0].trim(), description: parts[1].trim() });
      } else {
        current.items.push({ name: content });
      }
    }
  }
  return categories.length > 0 ? categories : DEFAULT_STACK;
}

export function stackToText(stack: TechCategory[]): string {
  return stack.map((cat) => {
    const items = cat.items.map((item) =>
      item.description ? `- ${item.name} : ${item.description}` : `- ${item.name}`
    );
    return `${cat.label} :\n${items.join('\n')}`;
  }).join('\n\n');
}
