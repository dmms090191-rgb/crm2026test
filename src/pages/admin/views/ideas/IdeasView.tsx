import { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Lightbulb } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import IdeaModal, { IdeaFormData } from './IdeaModal';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { Idea, IdeaStatus, STATUS_CONFIG, STATUS_CYCLE } from './ideasConstants';
import IdeaDetailModal from './IdeaDetailModal';
import IdeaCard from './IdeaCard';

export type { IdeaStatus, Idea } from './ideasConstants';

interface Props {
  ideas: Idea[];
  onIdeasChange: (ideas: Idea[]) => void;
}

export default function IdeasView({ ideas, onIdeasChange }: Props) {
  const tokens = useThemeTokens();

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

  const statusCounts = useMemo(() => {
    const counts: Record<IdeaStatus, number> = { todo: 0, done: 0 };
    ideas.forEach((i) => { counts[i.status ?? 'todo']++; });
    return counts;
  }, [ideas]);

  const [filterStatus, setFilterStatus] = useState<IdeaStatus | null>(null);

  const filteredIdeas = useMemo(() => {
    if (!filterStatus) return ideas;
    return ideas.filter((i) => (i.status ?? 'todo') === filterStatus);
  }, [ideas, filterStatus]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>Idees</h2>
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 self-start sm:self-auto"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.18)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle idee
        </button>
      </div>

      {ideas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setFilterStatus(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: filterStatus === null ? 'rgba(148,163,184,0.1)' : 'rgba(255,255,255,0.025)',
              border: filterStatus === null ? '1px solid rgba(148,163,184,0.25)' : `1px solid ${tokens.surface.borderLight}`,
              color: filterStatus === null ? tokens.text.secondary : tokens.text.quaternary,
            }}
            onMouseEnter={(e) => { if (filterStatus !== null) { e.currentTarget.style.background = 'rgba(148,163,184,0.1)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.25)'; e.currentTarget.style.color = tokens.text.secondary; } }}
            onMouseLeave={(e) => { if (filterStatus !== null) { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = tokens.surface.borderLight; e.currentTarget.style.color = tokens.text.quaternary; } }}
          >
            <span>Tout</span>
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold"
              style={{
                background: ideas.length > 0 ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.04)',
                color: ideas.length > 0 ? tokens.text.tertiary : tokens.text.quaternary,
              }}
            >
              {ideas.length}
            </span>
          </button>
          {STATUS_CYCLE.map((st) => {
            const cfg = STATUS_CONFIG[st];
            const count = statusCounts[st];
            const isActive = filterStatus === st;
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(isActive ? null : st)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: isActive ? cfg.bg : 'rgba(255,255,255,0.025)',
                  border: isActive ? `1px solid ${cfg.border}` : `1px solid ${tokens.surface.borderLight}`,
                  color: isActive ? cfg.color : tokens.text.quaternary,
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.borderColor = cfg.border; e.currentTarget.style.color = cfg.color; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = tokens.surface.borderLight; e.currentTarget.style.color = tokens.text.quaternary; } }}
              >
                {cfg.icon}
                <span>{cfg.label}</span>
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: count > 0 ? `${cfg.color}18` : 'rgba(255,255,255,0.04)',
                    color: count > 0 ? cfg.color : tokens.text.quaternary,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {ideas.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${tokens.surface.borderLight}` }}
          >
            <Lightbulb className="w-6 h-6 mb-3" style={{ color: 'rgba(251,191,36,0.2)' }} />
            <p className="text-sm font-medium" style={{ color: tokens.text.tertiary }}>Aucune idee pour l'instant</p>
            <p className="text-xs mt-1" style={{ color: tokens.text.quaternary }}>Cliquez sur + Nouvelle idee pour commencer</p>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${tokens.surface.borderLight}` }}
          >
            <p className="text-sm font-medium" style={{ color: tokens.text.tertiary }}>Aucune idee avec ce statut</p>
            <button
              onClick={() => setFilterStatus(null)}
              className="text-xs mt-2 transition-colors duration-150"
              style={{ color: 'rgba(56,189,248,0.6)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(56,189,248,0.6)'; }}
            >
              Voir toutes les idees
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                deletingId={deletingId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onOpenDetail={setDetailIdea}
                onEdit={(i) => { setEditingIdea(i); setModalOpen(true); }}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
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
