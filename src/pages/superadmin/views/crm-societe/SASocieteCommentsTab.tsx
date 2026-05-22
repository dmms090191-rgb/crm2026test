import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { checkboxStyle } from './types';
import SASocieteCommentDeleteModal from './SASocieteCommentDeleteModal';

interface Comment {
  id: string;
  content: string;
  created_at: string;
}

interface Props {
  societeId: string;
}

export default function SASocieteCommentsTab({ societeId }: Props) {
  const t = useThemeTokens();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sa_crm_societe_comments')
      .select('id, content, created_at')
      .eq('societe_id', societeId)
      .order('created_at', { ascending: false });
    setComments((data ?? []) as Comment[]);
    setLoading(false);
  }, [societeId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newComment.trim() || saving) return;
    setSaving(true);
    await supabase.from('sa_crm_societe_comments').insert({ societe_id: societeId, content: newComment.trim() });
    setNewComment('');
    setSaving(false);
    load();
  };

  const handleDeleteOne = async (id: string) => {
    await supabase.from('sa_crm_societe_comments').delete().eq('id', id);
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    load();
  };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    await supabase.from('sa_crm_societe_comments').delete().in('id', [...selected]);
    setSelected(new Set());
    setDeleteModal(false);
    load();
  };

  const toggleSel = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleAll = () => setSelected(prev =>
    prev.size === comments.length && comments.length > 0 ? new Set() : new Set(comments.map(c => c.id))
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Ecrire un commentaire..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
        />
        <button
          onClick={handleAdd}
          disabled={!newComment.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: `1px solid rgba(239,68,68,0.15)` }}>
          <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
            {selected.size} selectionne{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setDeleteModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
          >
            <Trash2 className="w-3 h-3" />
            Supprimer la selection
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs" style={{ color: t.text.tertiary }}>Aucun commentaire pour cette societe.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Select all */}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div style={checkboxStyle(selected.size === comments.length && comments.length > 0, t.surface.border)} onClick={toggleAll}>
              {selected.size === comments.length && comments.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-[10px] font-medium" style={{ color: t.text.tertiary }}>Tout selectionner</span>
          </div>

          {comments.map(c => (
            <div
              key={c.id}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors group"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}` }}
            >
              <div className="pt-0.5">
                <div style={checkboxStyle(selected.has(c.id), t.surface.border)} onClick={() => toggleSel(c.id)}>
                  {selected.has(c.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: t.text.primary }}>{c.content}</p>
                <p className="text-[10px] mt-1" style={{ color: t.text.quaternary }}>{formatDate(c.created_at)}</p>
              </div>
              <button
                onClick={() => handleDeleteOne(c.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteModal && (
        <SASocieteCommentDeleteModal
          count={selected.size}
          onConfirm={handleDeleteSelected}
          onClose={() => setDeleteModal(false)}
        />
      )}
    </div>
  );
}
