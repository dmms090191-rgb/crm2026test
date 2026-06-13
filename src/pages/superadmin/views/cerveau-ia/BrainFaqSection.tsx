import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import type { AiCompanyBrain, FaqEntry } from './brainTypes';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  embedded?: boolean;
}

export default function BrainFaqSection({ brain, onChange, tokens: t, embedded }: Props) {
  const entries = brain.faq ?? [];

  function updateEntry(idx: number, field: keyof FaqEntry, value: string) {
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ faq: next });
  }

  function add() {
    onChange({ faq: [...entries, { question: '', answer: '' }] });
  }

  function remove(idx: number) {
    onChange({ faq: entries.filter((_, i) => i !== idx) });
  }

  const content = (
    <>
      <div className="flex items-center justify-end mb-3">
        <button onClick={add} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: t.input.placeholder }}>Aucune FAQ. Ajoutez les questions frequentes et leurs reponses.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={idx} className="rounded-xl p-3 space-y-2" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input value={entry.question} onChange={e => updateEntry(idx, 'question', e.target.value)} placeholder="Question..." className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                  <textarea value={entry.answer} onChange={e => updateEntry(idx, 'answer', e.target.value)} placeholder="Reponse..." rows={2} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                </div>
                <button onClick={() => remove(idx)} className="p-1 rounded-lg transition-colors hover:opacity-70 mt-1" style={{ color: t.text.tertiary }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
          <HelpCircle className="w-4 h-4" style={{ color: t.accent.text }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>FAQ</h3>
      </div>
      {content}
    </div>
  );
}
