import { X, Pencil, Trash2, User, Zap, FileText, Wrench, Calendar, FolderOpen } from 'lucide-react';
import type { TalvexFonction } from './fonctionsTalvexTypes';
import { ETAT_CONFIG } from './fonctionsTalvexTypes';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  fonction: TalvexFonction;
  categoryLabel?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatTextContent(text: string, t: ReturnType<typeof useThemeTokens>) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return <span className="whitespace-pre-wrap">{text}</span>;

  const cleaned = lines.map(l => l.replace(/^\s*(?:\d+[\.\)]\s*|[-*]\s+)/, '').trim());

  return (
    <ol className="list-none space-y-1.5 m-0 p-0">
      {cleaned.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="font-semibold tabular-nums flex-shrink-0" style={{ color: t.text.tertiary, minWidth: 18, textAlign: 'right' }}>{i + 1}.</span>
          <span>{line}</span>
        </li>
      ))}
    </ol>
  );
}

function Section({ icon, label, children, t, autoNumber }: { icon: React.ReactNode; label: string; children: React.ReactNode; t: ReturnType<typeof useThemeTokens>; autoNumber?: boolean }) {
  if (!children || (typeof children === 'string' && !children.trim())) return null;
  const content = autoNumber && typeof children === 'string' ? formatTextContent(children, t) : children;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color: t.text.tertiary }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>{label}</span>
      </div>
      <div className="text-xs leading-relaxed pl-6" style={{ color: t.text.secondary }}>{content}</div>
    </div>
  );
}

export default function FonctionDetailPanel({ fonction, categoryLabel, onClose, onEdit, onDelete }: Props) {
  const t = useThemeTokens();
  const etat = ETAT_CONFIG[fonction.etat];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="text-sm font-bold truncate" style={{ color: t.text.primary }}>{fonction.titre}</h3>
          <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0" style={{ background: etat.bg, color: etat.color }}>
            {etat.label}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80" style={{ color: '#f59e0b' }} title="Modifier">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80" style={{ color: '#ef4444' }} title="Supprimer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80" style={{ color: t.text.tertiary }} title="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {categoryLabel && (
          <Section icon={<FolderOpen className="w-3.5 h-3.5" />} label="Categorie" t={t}>
            {categoryLabel}
          </Section>
        )}

        <Section icon={<FileText className="w-3.5 h-3.5" />} label="Description courte" t={t} autoNumber>
          {fonction.descriptionCourte}
        </Section>

        <Section icon={<FileText className="w-3.5 h-3.5" />} label="Description detaillee" t={t} autoNumber>
          {fonction.descriptionDetaillee}
        </Section>

        <Section icon={<Zap className="w-3.5 h-3.5" />} label="Role dans Talvex" t={t} autoNumber>
          {fonction.roleTalvex}
        </Section>

        <Section icon={<User className="w-3.5 h-3.5" />} label="Utilisateurs concernes" t={t} autoNumber>
          {fonction.utilisateurs}
        </Section>

        <Section icon={<Wrench className="w-3.5 h-3.5" />} label="Notes techniques" t={t} autoNumber>
          {fonction.notesTechniques}
        </Section>

        <Section icon={<Calendar className="w-3.5 h-3.5" />} label="Derniere modification" t={t}>
          {new Date(fonction.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Section>
      </div>
    </div>
  );
}
