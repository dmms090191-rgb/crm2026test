import { useState, useEffect, useCallback } from 'react';
import { Trash2, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { VendorComment } from './vendeurTypes';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function CommentsTab({ vendorId }: { vendorId: string }) {
  const tokens = useThemeTokens();
  const [comments, setComments] = useState<VendorComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('vendor_comments')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  }, [vendorId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function addComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    await supabase.from('vendor_comments').insert({ vendor_id: vendorId, content: newComment.trim() });
    setNewComment('');
    await fetchComments();
    setLoading(false);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    await supabase.from('vendor_comments').delete().in('id', Array.from(selected));
    setSelected(new Set());
    await fetchComments();
  }

  async function deleteAll() {
    await supabase.from('vendor_comments').delete().eq('vendor_id', vendorId);
    setSelected(new Set());
    await fetchComments();
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
            borderColor: tokens.input.borderFocus
          }}
        />
        <button
          onClick={addComment}
          disabled={loading || !newComment.trim()}
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
            Tout sélectionner
          </label>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ color: tokens.danger.text, border: `1px solid ${tokens.danger.border}`, background: tokens.danger.bg }}
              >
                <Trash2 className="w-3 h-3" />
                Supprimer la sélection ({selected.size})
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

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
