import { useState, useEffect } from 'react';
import { Trash2, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Comment {
  id: string;
  content: string;
  created_at: string;
}

interface CrmCommentsTabProps {
  leadId: string;
  leadData: Record<string, string>;
  onDataUpdate: (newData: Record<string, string>) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function CrmCommentsTab({ leadId, leadData, onDataUpdate }: CrmCommentsTabProps) {
  const tokens = useThemeTokens();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored: Comment[] = (() => {
      try {
        const raw = (leadData as Record<string, unknown>)['Commentaires'];
        if (Array.isArray(raw)) return raw as Comment[];
      } catch { /* ignore */ }
      return [];
    })();

    const legacy = leadData['Commentaire'];
    if (legacy && stored.length === 0) {
      const legacyComment: Comment = {
        id: 'legacy-comment',
        content: legacy,
        created_at: new Date().toISOString(),
      };
      setComments([legacyComment]);
    } else {
      setComments(stored);
    }
  }, [leadData]);

  async function persist(updated: Comment[]) {
    setSaving(true);
    const newData = { ...leadData, Commentaires: updated as unknown as string };
    await supabase.from('leads').update({ data: newData }).eq('id', leadId);
    onDataUpdate(newData);
    setSaving(false);
  }

  async function addComment() {
    if (!newComment.trim()) return;
    const entry: Comment = {
      id: crypto.randomUUID(),
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [entry, ...comments.filter(c => c.id !== 'legacy-comment')];
    if (comments.find(c => c.id === 'legacy-comment')) {
      updated.push(comments.find(c => c.id === 'legacy-comment')!);
    }
    setComments(updated);
    setNewComment('');
    await persist(updated);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    const updated = comments.filter(c => !selected.has(c.id));
    setComments(updated);
    setSelected(new Set());
    await persist(updated);
  }

  async function deleteAll() {
    setComments([]);
    setSelected(new Set());
    await persist([]);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === comments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(comments.map(c => c.id)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
          placeholder="Ajouter un commentaire..."
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all resize-none"
          style={{
            background: tokens.input.bg,
            border: `1px solid ${tokens.input.border}`,
            color: tokens.input.text,
            borderColor: tokens.input.borderFocus,
          }}
        />
        <button
          onClick={addComment}
          disabled={saving || !newComment.trim()}
          className="px-3 py-2.5 rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5 text-xs font-semibold self-start"
          style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.text.primary }}
        >
          <MessageSquarePlus className="w-4 h-4" style={{ color: tokens.accent.text }} />
        </button>
      </div>

      {comments.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs transition-colors select-none" style={{ color: tokens.label.hint }}>
            <input
              type="checkbox"
              checked={selected.size === comments.length && comments.length > 0}
              onChange={toggleAll}
              className="accent-cyan-500 w-3.5 h-3.5"
            />
            Tout selectionner
          </label>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ color: tokens.danger.text, border: `1px solid ${tokens.danger.border}`, background: tokens.danger.bg }}
              >
                <Trash2 className="w-3 h-3" />
                Supprimer ({selected.size})
              </button>
            )}
            <button
              onClick={deleteAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ color: tokens.label.hint, border: `1px solid ${tokens.surface.border}` }}
            >
              <Trash2 className="w-3 h-3" />
              Supprimer tout
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: tokens.input.placeholder }}>Aucun commentaire</p>
        ) : (
          comments.map(c => (
            <div
              key={c.id}
              onClick={() => toggleSelect(c.id)}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{
                background: selected.has(c.id) ? tokens.accent.bg : tokens.surface.secondary,
                border: `1px solid ${selected.has(c.id) ? tokens.accent.border : tokens.surface.borderLight}`,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleSelect(c.id)}
                onClick={e => e.stopPropagation()}
                className="accent-cyan-500 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm break-words" style={{ color: tokens.text.secondary }}>{c.content}</p>
                <p className="text-[10px] mt-1" style={{ color: tokens.input.placeholder }}>{formatDate(c.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
