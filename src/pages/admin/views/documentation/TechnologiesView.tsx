import { useState } from 'react';
import {
  GitBranch, Pencil, X, CheckCircle, RefreshCw, Copy
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { DEFAULT_STACK, TechCategory, parseTextToStack, stackToText } from './technologiesData';
import { detectStack, detectArchitecture } from './technologiesSync';

interface Props {
  content: string;
  onChange: (value: string) => void;
}

export default function TechnologiesView({ content, onChange }: Props) {
  const tokens = useThemeTokens();
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [synced, setSynced] = useState(false);
  const [syncedStack, setSyncedStack] = useState<TechCategory[] | null>(null);
  const [copied, setCopied] = useState(false);

  const stack = syncedStack ?? (content.trim() ? parseTextToStack(content) : DEFAULT_STACK);
  const archNodes = detectArchitecture();

  const handleEdit = () => {
    setDraft(content.trim() ? content : stackToText(stack));
    setEditMode(true);
  };

  const handleSave = () => {
    onChange(draft);
    setSyncedStack(null);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditMode(false);
    setDraft('');
  };

  const handleSync = () => {
    const detected = detectStack();
    setSyncedStack(detected);
    onChange(stackToText(detected));
    setSynced(true);
    setTimeout(() => setSynced(false), 2500);
  };

  const handleCopy = async () => {
    const lines: string[] = [];
    lines.push('=== TECHNOLOGIES ===\n');
    for (const cat of stack) {
      lines.push(`${cat.label.toUpperCase()}`);
      for (const item of cat.items) {
        const badge = item.badge ? ` [${item.badge}]` : '';
        const desc = item.description ? ` — ${item.description}` : '';
        lines.push(`  - ${item.name}${badge}${desc}`);
      }
      lines.push('');
    }
    lines.push('=== ARCHITECTURE ===\n');
    lines.push(archNodes.map((n) => n.label).join('  →  '));
    lines.push('');
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (editMode) {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-xs" style={{ color: tokens.text.quaternary }}>
            Format : <code style={{ color: tokens.accent.text }}>Categorie :</code> puis <code style={{ color: tokens.accent.text }}>- Nom : description</code>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.success.bg; }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Enregistrer
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.danger.bg; }}
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        </div>
        <textarea
          className="flex-1 min-h-0 w-full resize-none text-sm leading-relaxed font-mono outline-none"
          style={{
            background: tokens.accent.bg,
            border: `1px solid ${tokens.accent.border}`,
            borderRadius: '10px',
            padding: '16px 18px',
            color: tokens.input.text,
            caretColor: tokens.accent.solid,
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
      <div className="flex items-center justify-end mb-4 flex-shrink-0 gap-2">
        <button
          onClick={handleSync}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
          style={
            synced
              ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }
              : { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }
          }
          onMouseEnter={(e) => {
            if (!synced) {
              e.currentTarget.style.background = 'rgba(56,189,248,0.14)';
              e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (!synced) {
              e.currentTarget.style.background = tokens.accent.bg;
              e.currentTarget.style.borderColor = tokens.accent.border;
            }
          }}
        >
          {synced ? <CheckCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {synced ? 'Synchronise !' : 'Synchroniser'}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={
            copied
              ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }
              : { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }
          }
          onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)'; } }}
          onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.borderColor = tokens.accent.border; } }}
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copie !' : 'Copier'}
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: tokens.text.tertiary }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.18)'; e.currentTarget.style.color = tokens.text.secondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.1)'; e.currentTarget.style.color = tokens.text.tertiary; }}
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
                background: tokens.surface.tertiary,
                border: `1px solid ${tokens.surface.border}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${category.color}22`;
                (e.currentTarget as HTMLDivElement).style.background = `${category.color}05`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${tokens.surface.border}`;
                (e.currentTarget as HTMLDivElement).style.background = tokens.surface.tertiary;
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
                          style={{ color: tokens.text.secondary }}
                        >
                          {item.name}
                        </span>
                        {item.description && (
                          <span
                            className="text-xs leading-tight block mt-0.5"
                            style={{ color: tokens.text.tertiary }}
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
            background: tokens.surface.tertiary,
            border: `1px solid ${tokens.surface.borderLight}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} />
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: tokens.text.tertiary }}
            >
              Architecture
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {archNodes.map((node, i) => (
              <span key={i} className="contents">
                {i > 0 && (
                  <span className="text-xs font-medium" style={{ color: 'rgba(100,116,139,0.4)' }}>
                    {i === 1 ? '\u2192' : '+'}
                  </span>
                )}
                <div
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
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
