import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Lightbulb, Pencil, Trash2, CheckCircle2, Clock, X, GripVertical } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import IdeaModal, { IdeaFormData } from './IdeaModal';

export type IdeaStatus = 'idea' | 'todo' | 'done';

export interface Idea {
  id: string;
  title: string;
  content: string;
  idea_date: string;
  status: IdeaStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  ideas: Idea[];
  onIdeasChange: (ideas: Idea[]) => void;
}

const STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  idea: {
    label: 'Idée',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
    icon: <Lightbulb className="w-3 h-3" />,
  },
  todo: {
    label: 'À faire',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
    icon: <Clock className="w-3 h-3" />,
  },
  done: {
    label: 'Implémenté',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

const STATUS_CYCLE: IdeaStatus[] = ['idea', 'todo', 'done'];

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function IdeaDetailModal({ idea, onClose, onEdit, onDelete, onStatusChange }: {
  idea: Idea;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: IdeaStatus) => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const s = STATUS_CONFIG[idea.status ?? 'idea'];
  const isDone = (idea.status ?? 'idea') === 'done';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full rounded-2xl flex flex-col"
        style={{
          maxWidth: '76vw',
          maxHeight: '82vh',
          background: 'linear-gradient(160deg, #0d1117 0%, #080d14 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        <div
          className="flex items-start justify-between gap-4 px-8 pt-7 pb-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold leading-tight mb-3"
              style={{ fontSize: '1.25rem', color: '#f1f5f9', letterSpacing: '-0.01em' }}
            >
              {idea.title}
            </h2>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
              >
                {s.icon}
                {s.label}
              </span>
              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
                {formatDate(idea.idea_date)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 flex-shrink-0 transition-all duration-150"
            style={{ color: 'rgba(148,163,184,0.35)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6" style={{ minHeight: 0 }}>
          {idea.content ? (
            <p
              className="whitespace-pre-wrap"
              style={{
                color: '#cbd5e1',
                fontSize: '0.9rem',
                lineHeight: '1.8',
                letterSpacing: '0.01em',
              }}
            >
              {idea.content}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(100,116,139,0.5)' }}>
              Aucune description.
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-8 py-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            {STATUS_CYCLE.map((st) => {
              const cfg = STATUS_CONFIG[st];
              const isActive = (idea.status ?? 'idea') === st;
              return (
                <button
                  key={st}
                  onClick={() => onStatusChange(st)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                    border: isActive ? `1px solid ${cfg.border}` : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? cfg.color : 'rgba(100,116,139,0.6)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(100,116,139,0.6)'; } }}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.14)', color: '#67e8f9' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.06)'; }}
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)', color: '#f87171' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.13)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            >
              <Trash2 className="w-3 h-3" />
              Supprimer
            </button>
            <button
              onClick={() => onStatusChange(isDone ? 'idea' : 'done')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={
                isDone
                  ? { background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }
                  : { background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: 'rgba(74,222,128,0.7)' }
              }
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.15)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.45)'; e.currentTarget.style.color = '#4ade80'; }}
              onMouseLeave={(e) => {
                if (isDone) { e.currentTarget.style.background = 'rgba(74,222,128,0.12)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.35)'; e.currentTarget.style.color = '#4ade80'; }
                else { e.currentTarget.style.background = 'rgba(74,222,128,0.07)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.2)'; e.currentTarget.style.color = 'rgba(74,222,128,0.7)'; }
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isDone ? 'Implemente' : 'Fait'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IdeasView({ ideas, onIdeasChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [detailIdea, setDetailIdea] = useState<Idea | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dragIdRef = useRef<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  const handleSave = useCallback(async (data: IdeaFormData) => {
    if (editingIdea) {
      const { data: updated, error } = await supabase
        .from('crm_ideas')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editingIdea.id)
        .select()
        .single();
      if (!error && updated) {
        const next = ideas.map((i) => (i.id === editingIdea.id ? (updated as Idea) : i));
        onIdeasChange(next);
        if (detailIdea?.id === editingIdea.id) setDetailIdea(updated as Idea);
      }
    } else {
      const maxPos = ideas.reduce((m, i) => Math.max(m, i.position), -1);
      const { data: inserted, error } = await supabase
        .from('crm_ideas')
        .insert({ ...data, position: maxPos + 1 })
        .select()
        .single();
      if (!error && inserted) {
        onIdeasChange([...(ideas), inserted as Idea]);
      }
    }
    setModalOpen(false);
    setEditingIdea(null);
  }, [editingIdea, ideas, onIdeasChange, detailIdea]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    await supabase.from('crm_ideas').delete().eq('id', id);
    onIdeasChange(ideas.filter((i) => i.id !== id));
    setDeletingId(null);
    if (detailIdea?.id === id) setDetailIdea(null);
  }, [ideas, onIdeasChange, detailIdea]);

  const handleStatusChange = useCallback(async (idea: Idea, newStatus: IdeaStatus) => {
    const { data: updated, error } = await supabase
      .from('crm_ideas')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', idea.id)
      .select()
      .single();
    if (!error && updated) {
      onIdeasChange(ideas.map((i) => (i.id === idea.id ? (updated as Idea) : i)));
      if (detailIdea?.id === idea.id) setDetailIdea(updated as Idea);
    }
  }, [ideas, onIdeasChange, detailIdea]);

  const handleDragStart = useCallback((id: string) => {
    dragIdRef.current = id;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverIdRef.current = id;
  }, []);

  const handleDrop = useCallback(async () => {
    const fromId = dragIdRef.current;
    const toId = dragOverIdRef.current;
    if (!fromId || !toId || fromId === toId) return;

    const reordered = [...ideas];
    const fromIdx = reordered.findIndex((i) => i.id === fromId);
    const toIdx = reordered.findIndex((i) => i.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const withPositions = reordered.map((idea, idx) => ({ ...idea, position: idx }));
    onIdeasChange(withPositions);

    await Promise.all(
      withPositions.map((idea) =>
        supabase.from('crm_ideas').update({ position: idea.position }).eq('id', idea.id)
      )
    );

    dragIdRef.current = null;
    dragOverIdRef.current = null;
  }, [ideas, onIdeasChange]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">Idées</h2>
          {ideas.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.15)' }}
            >
              {ideas.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditingIdea(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.18)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle idée
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {ideas.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Lightbulb className="w-6 h-6 mb-3" style={{ color: 'rgba(251,191,36,0.2)' }} />
            <p className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>Aucune idée pour l'instant</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.6)' }}>Cliquez sur + Nouvelle idée pour commencer</p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
          >
            {ideas.map((idea) => {
              const s = STATUS_CONFIG[idea.status ?? 'idea'];
              const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(idea.status ?? 'idea') + 1) % STATUS_CYCLE.length];
              return (
                <div
                  key={idea.id}
                  draggable
                  onDragStart={() => handleDragStart(idea.id)}
                  onDragOver={(e) => handleDragOver(e, idea.id)}
                  onDrop={handleDrop}
                  className="rounded-xl flex flex-col gap-2 p-3 cursor-pointer group transition-all duration-150 select-none"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    minHeight: '110px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing mt-0.5"
                      style={{ color: 'rgba(100,116,139,0.5)' }}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setDetailIdea(idea)}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(251,191,36,0.5)' }} />
                        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#e2e8f0' }}>
                          {idea.title}
                        </p>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
                        {formatDate(idea.idea_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-auto pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button
                      title={`Passer à : ${STATUS_CONFIG[nextStatus].label}`}
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(idea, nextStatus); }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all duration-150 flex-shrink-0"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      {s.icon}
                      <span className="text-xs">{s.label}</span>
                    </button>

                    <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        title="Modifier"
                        onClick={(e) => { e.stopPropagation(); setEditingIdea(idea); setModalOpen(true); }}
                        className="p-1 rounded-lg transition-all duration-150"
                        style={{ color: 'rgba(103,232,249,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#67e8f9'; e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(103,232,249,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        title="Supprimer"
                        disabled={deletingId === idea.id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(idea.id); }}
                        className="p-1 rounded-lg transition-all duration-150"
                        style={{ color: 'rgba(248,113,113,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <IdeaModal
          initial={editingIdea ? { title: editingIdea.title, content: editingIdea.content, idea_date: editingIdea.idea_date, status: editingIdea.status } : undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingIdea(null); }}
        />
      )}

      {detailIdea && (
        <IdeaDetailModal
          idea={detailIdea}
          onClose={() => setDetailIdea(null)}
          onEdit={() => { setEditingIdea(detailIdea); setDetailIdea(null); setModalOpen(true); }}
          onDelete={() => handleDelete(detailIdea.id)}
          onStatusChange={(s) => handleStatusChange(detailIdea, s)}
        />
      )}
    </div>
  );
}
