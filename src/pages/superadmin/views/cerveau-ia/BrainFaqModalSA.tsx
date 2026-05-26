import { Plus, Trash2, Lightbulb } from 'lucide-react';
import type { AiCompanyBrain, FaqEntry } from './brainTypes';

const FAQ_EXAMPLES: FaqEntry[] = [
  { question: 'Comment ajouter un vendeur ?', answer: 'Allez dans l\'onglet "Liste vendeurs" et cliquez sur "Ajouter un vendeur".' },
  { question: 'Comment importer des leads ?', answer: 'Allez dans "Import leads", selectionnez votre fichier CSV ou Excel et suivez les etapes.' },
  { question: 'Comment activer les notifications telephone ?', answer: 'Allez dans les parametres de votre profil et activez les notifications push.' },
  { question: 'Comment contacter le support Talvex ?', answer: 'Utilisez la messagerie "Chat Super Admin" ou envoyez un email au support.' },
  { question: 'Comment connecter un domaine ?', answer: 'Allez dans "Sites" > "Domaines" et suivez les instructions de configuration DNS.' },
  { question: 'Comment gerer les rendez-vous ?', answer: 'Utilisez l\'onglet "Propositions RDV" pour creer, modifier ou valider des rendez-vous.' },
  { question: 'Comment ajouter un client ?', answer: 'Allez dans le CRM et cliquez sur "Ajouter un lead" pour creer un nouveau contact.' },
];

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: Record<string, any>;
  accentColor: string;
}

export default function BrainFaqModalSA({ brain, onChange, tokens: t, accentColor }: Props) {
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
    onChange({ faq: entries.filter((_: FaqEntry, i: number) => i !== idx) });
  }

  function addExamples() {
    const existingQs = new Set(entries.map((e: FaqEntry) => e.question.toLowerCase().trim()));
    const toAdd = FAQ_EXAMPLES.filter(ex => !existingQs.has(ex.question.toLowerCase().trim()));
    if (toAdd.length > 0) onChange({ faq: [...entries, ...toAdd] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={addExamples} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-105" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20`, color: accentColor }}>
          <Lightbulb className="w-3 h-3" />Ajouter des exemples
        </button>
        <button onClick={add} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <Plus className="w-3 h-3" />Ajouter
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs" style={{ color: t.input.placeholder }}>Aucune FAQ. Cliquez sur "Ajouter des exemples" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry: FaqEntry, idx: number) => (
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
    </div>
  );
}
