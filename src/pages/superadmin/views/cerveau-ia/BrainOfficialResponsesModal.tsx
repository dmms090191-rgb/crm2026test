import { Plus, Trash2, Lightbulb } from 'lucide-react';
import type { AiCompanyBrain, OfficialResponse } from './brainTypes';

const EXAMPLES: OfficialResponse[] = [
  { question: "C'est quoi Talvex ?", answer: "Talvex est une plateforme SaaS de gestion client tout-en-un : CRM, rendez-vous, messagerie, IA et sites web pour les entreprises." },
  { question: "Quels sont les horaires du support ?", answer: "Le support Talvex est disponible du lundi au vendredi de 9h a 18h." },
  { question: "Qui contacter en cas de probleme ?", answer: "Utilisez la messagerie Super Admin ou envoyez un email a support@talvex.fr." },
  { question: "Comment ajouter un vendeur ?", answer: "Allez dans Liste vendeurs > Ajouter un vendeur, remplissez le formulaire et validez." },
  { question: "Comment importer des leads ?", answer: "Allez dans Import leads, deposez votre fichier CSV ou Excel et suivez les etapes." },
  { question: "Comment activer les notifications telephone ?", answer: "Allez dans votre profil > Notifications push et activez-les." },
  { question: "Comment fonctionne l'IA ?", answer: "L'IA Talvex repond aux questions des clients et admins en utilisant les informations configurees dans le Cerveau IA." },
  { question: "Comment creer ou gerer un site ?", answer: "Allez dans Sites > choisissez un template, personnalisez-le et publiez-le." },
];

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: Record<string, any>;
  accentColor: string;
}

export default function BrainOfficialResponsesModal({ brain, onChange, tokens: t, accentColor }: Props) {
  const entries = brain.official_responses ?? [];

  function updateEntry(idx: number, field: keyof OfficialResponse, value: string) {
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ official_responses: next });
  }

  function add() {
    onChange({ official_responses: [...entries, { question: '', answer: '' }] });
  }

  function remove(idx: number) {
    onChange({ official_responses: entries.filter((_: OfficialResponse, i: number) => i !== idx) });
  }

  function addExamples() {
    const existingQs = new Set(entries.map((e: OfficialResponse) => e.question.toLowerCase().trim()));
    const toAdd = EXAMPLES.filter(ex => !existingQs.has(ex.question.toLowerCase().trim()));
    if (toAdd.length > 0) onChange({ official_responses: [...entries, ...toAdd] });
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed font-medium px-1" style={{ color: t.text.tertiary }}>
        Ces reponses officielles sont utilisees en priorite par l'IA quand un admin pose une question correspondante.
      </p>

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
          <p className="text-xs" style={{ color: t.input.placeholder }}>Aucune reponse type. Cliquez sur "Ajouter des exemples" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry: OfficialResponse, idx: number) => (
            <div key={idx} className="rounded-xl p-3 space-y-2" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input value={entry.question} onChange={e => updateEntry(idx, 'question', e.target.value)} placeholder="Question type..." className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                  <textarea value={entry.answer} onChange={e => updateEntry(idx, 'answer', e.target.value)} placeholder="Reponse officielle Talvex..." rows={2} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
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
