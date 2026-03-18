import { useState, useCallback, useEffect } from 'react';
import { Plus, Bot, Pencil, Trash2, Copy, Check, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import ContextCardModal, { ContextCardFormData } from './ContextCardModal';

export interface ContextCard {
  id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ContextDetailModal({
  card,
  onClose,
  onEdit,
  onDelete,
}: {
  card: ContextCard;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleCopy() {
    navigator.clipboard.writeText(card.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(34,211,238,0.6)' }} />
              <h2
                className="font-semibold leading-tight"
                style={{ fontSize: '1.25rem', color: '#f1f5f9', letterSpacing: '-0.01em' }}
              >
                {card.title}
              </h2>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(100,116,139,0.7)' }}>
              {formatDate(card.created_at)}
            </p>
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
          {card.content ? (
            <p
              className="whitespace-pre-wrap"
              style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.8', letterSpacing: '0.01em' }}
            >
              {card.content}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(100,116,139,0.5)' }}>
              Aucun contenu.
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-8 py-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
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
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              copied
                ? { background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }
                : { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }
            }
            onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(34,211,238,0.15)'; } }}
            onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; } }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copie !' : 'Copier le contexte'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  cards: ContextCard[];
  onCardsChange: (cards: ContextCard[]) => void;
}

export default function ContextCardsView({ cards, onCardsChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContextCard | null>(null);
  const [detailCard, setDetailCard] = useState<ContextCard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSave = useCallback(async (data: ContextCardFormData) => {
    if (editingCard) {
      const { data: updated, error } = await supabase
        .from('crm_context_cards')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editingCard.id)
        .select()
        .single();
      if (!error && updated) {
        const next = cards.map((c) => (c.id === editingCard.id ? (updated as ContextCard) : c));
        onCardsChange(next);
        if (detailCard?.id === editingCard.id) setDetailCard(updated as ContextCard);
      }
    } else {
      const maxPos = cards.reduce((m, c) => Math.max(m, c.position), -1);
      const { data: inserted, error } = await supabase
        .from('crm_context_cards')
        .insert({ ...data, position: maxPos + 1 })
        .select()
        .single();
      if (!error && inserted) {
        onCardsChange([...cards, inserted as ContextCard]);
      }
    }
    setModalOpen(false);
    setEditingCard(null);
  }, [editingCard, cards, onCardsChange, detailCard]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    await supabase.from('crm_context_cards').delete().eq('id', id);
    onCardsChange(cards.filter((c) => c.id !== id));
    setDeletingId(null);
    if (detailCard?.id === id) setDetailCard(null);
  }, [cards, onCardsChange, detailCard]);

  const handleCopy = useCallback((card: ContextCard) => {
    navigator.clipboard.writeText(card.content).then(() => {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: '#22d3ee' }} />
          <h2 className="text-sm font-semibold text-slate-200">Contexte ChatGPT</h2>
          {cards.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(34,211,238,0.1)', color: 'rgba(34,211,238,0.7)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              {cards.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditingCard(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.15)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau contexte
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {cards.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', minHeight: '200px' }}
          >
            <Bot className="w-6 h-6 mb-3" style={{ color: 'rgba(34,211,238,0.2)' }} />
            <p className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>Aucune carte de contexte</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.6)' }}>
              Cliquez sur + Nouveau contexte pour commencer
            </p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
          >
            {cards.map((card) => {
              const isCopied = copiedId === card.id;
              return (
                <div
                  key={card.id}
                  className="rounded-xl flex flex-col gap-2 p-3 cursor-pointer group transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    minHeight: '110px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setDetailCard(card)}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(34,211,238,0.5)' }} />
                      <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#e2e8f0' }}>
                        {card.title}
                      </p>
                    </div>
                    {card.content && (
                      <p
                        className="text-xs line-clamp-2 mb-1.5"
                        style={{ color: 'rgba(100,116,139,0.7)', lineHeight: '1.5' }}
                      >
                        {card.content}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      {formatDate(card.created_at)}
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-1 mt-auto pt-1"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <button
                      title={isCopied ? 'Copie !' : 'Copier le contexte'}
                      onClick={(e) => { e.stopPropagation(); handleCopy(card); }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all duration-150 flex-shrink-0"
                      style={
                        isCopied
                          ? { background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }
                          : { background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', color: 'rgba(34,211,238,0.7)' }
                      }
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span className="text-xs">{isCopied ? 'Copie !' : 'Copier'}</span>
                    </button>

                    <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        title="Modifier"
                        onClick={(e) => { e.stopPropagation(); setEditingCard(card); setModalOpen(true); }}
                        className="p-1 rounded-lg transition-all duration-150"
                        style={{ color: 'rgba(103,232,249,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#67e8f9'; e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(103,232,249,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        title="Supprimer"
                        disabled={deletingId === card.id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
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
        <ContextCardModal
          initial={editingCard ? { title: editingCard.title, content: editingCard.content } : undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingCard(null); }}
        />
      )}

      {detailCard && (
        <ContextDetailModal
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onEdit={() => { setEditingCard(detailCard); setDetailCard(null); setModalOpen(true); }}
          onDelete={() => handleDelete(detailCard.id)}
        />
      )}
    </div>
  );
}
