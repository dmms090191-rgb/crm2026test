import { useState } from 'react';
import { Sparkles, Plus, Trash2, ShieldAlert } from 'lucide-react';
import type { AiCompanyBrain } from './brainTypes';
import { BrainTextarea } from './BrainField';

const TONE_PRESETS = [
  { id: 'professional', label: 'Professionnel', text: 'Reponds de maniere professionnelle et structuree. Utilise un langage formel et precis. Sois concis et factuel.' },
  { id: 'warm', label: 'Chaleureux', text: 'Reponds de maniere chaleureuse et bienveillante. Utilise un ton amical et rassurant. Montre de l\'empathie.' },
  { id: 'direct', label: 'Court et direct', text: 'Reponds en 1 a 2 phrases maximum. Va droit au but. Pas de formules de politesse superflues.' },
  { id: 'reassuring', label: 'Rassurant', text: 'Reponds de maniere rassurante et patiente. Confirme que le probleme sera pris en charge. Propose toujours une prochaine etape.' },
  { id: 'technical', label: 'Support technique', text: 'Reponds avec precision technique. Donne des instructions etape par etape si necessaire. Utilise un langage clair et structure.' },
];

const DEFAULT_FORBIDDEN = [
  'Ne jamais inventer un telephone, email, horaire ou prix.',
  'Ne jamais promettre une correction immediate.',
  'Ne jamais modifier un compte sans validation.',
  'Ne jamais donner une information qui n\'est pas dans le Cerveau IA.',
  'Ne jamais repondre a une demande sensible sans transmettre au Super Admin.',
];

const DEFAULT_SENSITIVE = [
  'mot de passe',
  'suppression compte',
  'probleme paiement',
  'bug critique',
  'acces bloque',
  'donnees sensibles',
  'action irreversible',
  'demande juridique',
  'demande que l\'IA ne comprend pas',
];

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: Record<string, any>;
  accentColor: string;
}

export default function BrainToneModal({ brain, onChange, tokens: t, accentColor }: Props) {
  const forbidden = brain.forbidden_actions ?? [];
  const sensitive = brain.sensitive_requests ?? [];
  const [newForbidden, setNewForbidden] = useState('');
  const [newSensitive, setNewSensitive] = useState('');

  function applyPreset(text: string) {
    const current = brain.tone?.trim();
    onChange({ tone: current ? `${current}\n${text}` : text });
  }

  function addForbidden() {
    const v = newForbidden.trim();
    if (!v) return;
    onChange({ forbidden_actions: [...forbidden, v] });
    setNewForbidden('');
  }

  function removeForbidden(idx: number) {
    onChange({ forbidden_actions: forbidden.filter((_: string, i: number) => i !== idx) });
  }

  function addDefaultForbidden() {
    const existing = new Set(forbidden);
    const toAdd = DEFAULT_FORBIDDEN.filter(f => !existing.has(f));
    if (toAdd.length > 0) onChange({ forbidden_actions: [...forbidden, ...toAdd] });
  }

  function addSensitive() {
    const v = newSensitive.trim();
    if (!v) return;
    onChange({ sensitive_requests: [...sensitive, v] });
    setNewSensitive('');
  }

  function removeSensitive(idx: number) {
    onChange({ sensitive_requests: sensitive.filter((_: string, i: number) => i !== idx) });
  }

  function addDefaultSensitive() {
    const existing = new Set(sensitive);
    const toAdd = DEFAULT_SENSITIVE.filter(s => !existing.has(s));
    if (toAdd.length > 0) onChange({ sensitive_requests: [...sensitive, ...toAdd] });
  }

  return (
    <div className="space-y-5">
      {/* Tone section */}
      <div>
        <BrainTextarea label="Instructions de reponse pour l'IA support" value={brain.tone ?? ''} onChange={v => onChange({ tone: v })} placeholder="Sois accueillant, professionnel, et reponds toujours en francais..." rows={4} tokens={t} />
        <p className="text-[10px] font-semibold mt-3 mb-2" style={{ color: t.text.secondary }}>Presets rapides</p>
        <div className="flex flex-wrap gap-1.5">
          {TONE_PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.text)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-105" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20`, color: accentColor }}>
              <Sparkles className="w-3 h-3" />{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forbidden actions */}
      <div className="pt-4" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: '#ef4444' }} />
            <p className="text-[11px] font-bold" style={{ color: t.text.primary }}>Ce que l'IA ne doit jamais faire</p>
          </div>
          <button onClick={addDefaultForbidden} className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all hover:scale-105" style={{ background: '#ef444410', color: '#ef4444', border: '1px solid #ef444420' }}>
            Ajouter exemples
          </button>
        </div>
        <div className="space-y-1.5">
          {forbidden.map((item: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <span className="text-[11px] flex-1" style={{ color: t.text.secondary }}>{item}</span>
              <button onClick={() => removeForbidden(idx)} className="flex-shrink-0 p-0.5" style={{ color: t.text.quaternary }}><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input value={newForbidden} onChange={e => setNewForbidden(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addForbidden(); } }} placeholder="Ajouter une regle..." className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
          <button onClick={addForbidden} disabled={!newForbidden.trim()} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: accentColor }}><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Sensitive requests */}
      <div className="pt-4" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <p className="text-[11px] font-bold" style={{ color: t.text.primary }}>Demandes sensibles a transmettre</p>
          </div>
          <button onClick={addDefaultSensitive} className="text-[9px] font-semibold px-2 py-1 rounded-lg transition-all hover:scale-105" style={{ background: '#f59e0b10', color: '#f59e0b', border: '1px solid #f59e0b20' }}>
            Ajouter exemples
          </button>
        </div>
        <p className="text-[10px] mb-2" style={{ color: t.text.tertiary }}>
          L'IA repondra : "Cette demande necessite une intervention du Super Admin. Votre message a ete transmis."
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sensitive.map((item: string, idx: number) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: '#f59e0b10', border: '1px solid #f59e0b20', color: '#d97706' }}>
              {item}
              <button onClick={() => removeSensitive(idx)} className="ml-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input value={newSensitive} onChange={e => setNewSensitive(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSensitive(); } }} placeholder="Ajouter un mot-cle..." className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
          <button onClick={addSensitive} disabled={!newSensitive.trim()} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: accentColor }}><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
