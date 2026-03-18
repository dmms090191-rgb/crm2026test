import { useState } from 'react';
import {
  Code2, Database, Zap, Shield, Layers, Globe, Box, GitBranch,
  Cpu, FileCode, Paintbrush, Server, Lock, Radio, Pencil, X, CheckCircle
} from 'lucide-react';

interface TechItem {
  name: string;
  description?: string;
  badge?: string;
}

interface TechCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: TechItem[];
}

const DEFAULT_STACK: TechCategory[] = [
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

function parseTextToStack(text: string): TechCategory[] {
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

function stackToText(stack: TechCategory[]): string {
  return stack.map((cat) => {
    const items = cat.items.map((item) =>
      item.description ? `- ${item.name} : ${item.description}` : `- ${item.name}`
    );
    return `${cat.label} :\n${items.join('\n')}`;
  }).join('\n\n');
}

interface Props {
  content: string;
  onChange: (value: string) => void;
}

export default function TechnologiesView({ content, onChange }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState('');

  const stack = content.trim() ? parseTextToStack(content) : DEFAULT_STACK;

  const handleEdit = () => {
    setDraft(content.trim() ? content : stackToText(DEFAULT_STACK));
    setEditMode(true);
  };

  const handleSave = () => {
    onChange(draft);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditMode(false);
    setDraft('');
  };

  if (editMode) {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-500">
            Format : <code className="text-cyan-400/70">Categorie :</code> puis <code className="text-cyan-400/70">- Nom : description</code>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Enregistrer
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        </div>
        <textarea
          className="flex-1 min-h-0 w-full resize-none text-sm leading-relaxed font-mono outline-none"
          style={{
            background: 'rgba(34,211,238,0.02)',
            border: '1px solid rgba(34,211,238,0.25)',
            borderRadius: '10px',
            padding: '16px 18px',
            color: '#e2e8f0',
            caretColor: '#22d3ee',
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-end mb-4 flex-shrink-0">
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.18)'; e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Modifier
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {stack.map((category) => (
            <div
              key={category.id}
              className="rounded-xl p-4 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${category.color}22`;
                (e.currentTarget as HTMLDivElement).style.background = `${category.color}05`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${category.color}15`, color: category.color }}
                >
                  {category.icon}
                </div>
                <span
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: category.color, letterSpacing: '0.08em' }}
                >
                  {category.label}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {category.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: `${category.color}60` }}
                      />
                      <div className="min-w-0">
                        <span
                          className="text-sm font-medium leading-tight block"
                          style={{ color: '#e2e8f0' }}
                        >
                          {item.name}
                        </span>
                        {item.description && (
                          <span
                            className="text-xs leading-tight block mt-0.5"
                            style={{ color: 'rgba(148,163,184,0.55)' }}
                          >
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 mt-0.5"
                        style={{
                          background: `${category.color}12`,
                          color: `${category.color}cc`,
                          border: `1px solid ${category.color}20`,
                          fontSize: '10px',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-5 rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.4)' }} />
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(148,163,184,0.4)' }}
            >
              Architecture
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Frontend', color: '#38bdf8', icon: <Layers className="w-3 h-3" /> },
              { label: '↓', color: 'rgba(100,116,139,0.4)', icon: null },
              { label: 'Supabase SDK', color: '#a78bfa', icon: <Zap className="w-3 h-3" /> },
              { label: '↓', color: 'rgba(100,116,139,0.4)', icon: null },
              { label: 'PostgreSQL', color: '#34d399', icon: <Database className="w-3 h-3" /> },
              { label: '+', color: 'rgba(100,116,139,0.4)', icon: null },
              { label: 'Edge Functions', color: '#fb923c', icon: <FileCode className="w-3 h-3" /> },
              { label: '+', color: 'rgba(100,116,139,0.4)', icon: null },
              { label: 'Realtime', color: '#f472b6', icon: <Radio className="w-3 h-3" /> },
              { label: '+', color: 'rgba(100,116,139,0.4)', icon: null },
              { label: 'Auth / RLS', color: '#fbbf24', icon: <Shield className="w-3 h-3" /> },
            ].map((node, i) =>
              node.icon ? (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{
                    background: `${node.color}10`,
                    border: `1px solid ${node.color}20`,
                    color: node.color,
                  }}
                >
                  {node.icon}
                  <span className="text-xs font-medium">{node.label}</span>
                </div>
              ) : (
                <span key={i} className="text-xs font-medium" style={{ color: node.color }}>
                  {node.label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
