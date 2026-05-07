import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { Idea, IdeaStatus, STATUS_CONFIG, formatDate } from './ideasConstants';

interface IdeaCardProps {
  idea: Idea;
  deletingId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: () => void;
  onOpenDetail: (idea: Idea) => void;
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onStatusChange: (idea: Idea, status: IdeaStatus) => void;
}

export default function IdeaCard({
  idea, deletingId, onDragStart, onDragOver, onDrop,
  onOpenDetail, onEdit, onDelete, onStatusChange,
}: IdeaCardProps) {
  const tokens = useThemeTokens();

  const currentStatus = idea.status ?? 'todo';
  const s = STATUS_CONFIG[currentStatus];
  const nextStatus: IdeaStatus = currentStatus === 'todo' ? 'done' : 'todo';
  const nextCfg = STATUS_CONFIG[nextStatus];

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idea.id)}
      onDragOver={(e) => onDragOver(e, idea.id)}
      onDrop={onDrop}
      className="relative cursor-pointer group select-none overflow-hidden pb-11 md:pb-[52px]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${tokens.surface.border}`,
        borderLeft: `4px solid ${s.color}`,
        borderRadius: '6px',
        minHeight: '120px',
        transition: 'transform 200ms ease, box-shadow 200ms ease, background 200ms ease, border-color 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tokens.surface.hover;
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)';
        e.currentTarget.style.borderLeftColor = s.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = tokens.surface.border;
        e.currentTarget.style.borderLeftColor = s.color;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start gap-2 p-3 md:p-5 pb-0 md:pb-0">
        <div
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing mt-1 hidden sm:block"
          style={{ color: tokens.text.quaternary }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpenDetail(idea)}
        >
          <p
            className="font-semibold leading-snug line-clamp-2 text-[13px] md:text-sm"
            style={{ color: tokens.modal.title, marginBottom: '6px' }}
          >
            {idea.title}
          </p>
          <p className="text-[11px]" style={{ color: tokens.text.quaternary }}>
            {formatDate(idea.idea_date)}
          </p>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3"
        style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}
      >
        <button
          title={`Passer a : ${nextCfg.label}`}
          onClick={(e) => { e.stopPropagation(); onStatusChange(idea, nextStatus); }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-150 flex-shrink-0"
          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: '4px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = nextCfg.bg;
            e.currentTarget.style.borderColor = nextCfg.border;
            e.currentTarget.style.color = nextCfg.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = s.bg;
            e.currentTarget.style.borderColor = s.border;
            e.currentTarget.style.color = s.color;
          }}
        >
          {s.icon}
          <span>{s.label}</span>
        </button>

        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            title="Modifier"
            onClick={(e) => { e.stopPropagation(); onEdit(idea); }}
            className="p-1.5 transition-all duration-150"
            style={{ color: 'rgba(103,232,249,0.5)', borderRadius: '4px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = tokens.accent.text; e.currentTarget.style.background = tokens.accent.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(103,232,249,0.5)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            title="Supprimer"
            disabled={deletingId === idea.id}
            onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
            className="p-1.5 transition-all duration-150"
            style={{ color: 'rgba(248,113,113,0.5)', borderRadius: '4px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = tokens.danger.text; e.currentTarget.style.background = tokens.danger.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.5)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
