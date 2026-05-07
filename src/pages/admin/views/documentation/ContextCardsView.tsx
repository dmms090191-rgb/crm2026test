import { useState, useCallback, useRef } from 'react';
import { Plus, Bot, Pencil, Trash2, Copy, Check, GripVertical } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import ContextCardModal, { ContextCardFormData } from './ContextCardModal';
import ContextDetailModal from './ContextDetailModal';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { formatDate, ACCENT_COLOR, ACCENT_BG, ACCENT_BORDER } from './contextCardsTypes';
import type { ContextCard } from './contextCardsTypes';

export type { ContextCard } from './contextCardsTypes';

interface Props {
  cards: ContextCard[];
  onCardsChange: (cards: ContextCard[]) => void;
}

export default function ContextCardsView({ cards, onCardsChange }: Props) {
  const tokens = useThemeTokens();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContextCard | null>(null);
  const [detailCard, setDetailCard] = useState<ContextCard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const dragIdRef = useRef<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

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
    const text = `${card.title}\n\n${card.content}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

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

    const reordered = [...cards];
    const fromIdx = reordered.findIndex((c) => c.id === fromId);
    const toIdx = reordered.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const withPositions = reordered.map((card, idx) => ({ ...card, position: idx }));
    onCardsChange(withPositions);

    await Promise.all(
      withPositions.map((card) =>
        supabase.from('crm_context_cards').update({ position: card.position }).eq('id', card.id)
      )
    );

    dragIdRef.current = null;
    dragOverIdRef.current = null;
  }, [cards, onCardsChange]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: ACCENT_COLOR }} />
          <h2 className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>Contexte ChatGPT</h2>
          {cards.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: ACCENT_BG, color: ACCENT_COLOR, border: `1px solid ${ACCENT_BORDER}` }}
            >
              {cards.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditingCard(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 self-start sm:self-auto"
          style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_COLOR }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.18)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT_BG; e.currentTarget.style.borderColor = ACCENT_BORDER; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau contexte
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {cards.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${tokens.surface.borderLight}`, minHeight: '200px' }}
          >
            <Bot className="w-6 h-6 mb-3" style={{ color: 'rgba(34,211,238,0.2)' }} />
            <p className="text-sm font-medium" style={{ color: tokens.text.tertiary }}>Aucune carte de contexte</p>
            <p className="text-xs mt-1" style={{ color: tokens.text.quaternary }}>
              Cliquez sur + Nouveau contexte pour commencer
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {cards.map((card) => {
              const isCopied = copiedId === card.id;
              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  onDragOver={(e) => handleDragOver(e, card.id)}
                  onDrop={handleDrop}
                  className="relative cursor-pointer group select-none overflow-hidden pb-11 md:pb-[52px]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${tokens.surface.border}`,
                    borderLeft: `4px solid ${ACCENT_COLOR}`,
                    borderRadius: '6px',
                    minHeight: '120px',
                    transition: 'transform 200ms ease, box-shadow 200ms ease, background 200ms ease, border-color 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tokens.surface.hover;
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)';
                    e.currentTarget.style.borderLeftColor = ACCENT_COLOR;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = tokens.surface.border;
                    e.currentTarget.style.borderLeftColor = ACCENT_COLOR;
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
                      onClick={() => setDetailCard(card)}
                    >
                      <p
                        className="font-semibold leading-snug line-clamp-2 text-[13px] md:text-sm"
                        style={{ color: tokens.modal.title, marginBottom: '6px' }}
                      >
                        {card.title}
                      </p>
                      {card.content && (
                        <p
                          className="line-clamp-2 mb-2 text-[11px]"
                          style={{ color: tokens.text.quaternary, lineHeight: '1.5' }}
                        >
                          {card.content}
                        </p>
                      )}
                      <p className="text-[11px]" style={{ color: tokens.text.quaternary }}>
                        {formatDate(card.created_at)}
                      </p>
                    </div>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3"
                    style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}
                  >
                    <button
                      title={isCopied ? 'Copie !' : 'Copier le contexte'}
                      onClick={(e) => { e.stopPropagation(); handleCopy(card); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-150 flex-shrink-0"
                      style={
                        isCopied
                          ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text, borderRadius: '4px' }
                          : { background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_COLOR, borderRadius: '4px' }
                      }
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copie !' : 'Copier'}</span>
                    </button>

                    <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        title="Modifier"
                        onClick={(e) => { e.stopPropagation(); setEditingCard(card); setModalOpen(true); }}
                        className="p-1.5 transition-all duration-150"
                        style={{ color: 'rgba(34,211,238,0.5)', borderRadius: '4px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT_COLOR; e.currentTarget.style.background = ACCENT_BG; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(34,211,238,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Supprimer"
                        disabled={deletingId === card.id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
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
