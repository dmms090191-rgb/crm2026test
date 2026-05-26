import { useState } from 'react';
import { FileText, Phone, Clock, HelpCircle, ShieldAlert, MessagesSquare } from 'lucide-react';
import type { AiCompanyBrain } from './brainTypes';
import BrainConfigCard from './BrainConfigCard';
import BrainSectionModal from './BrainSectionModal';
import { BrainInput, BrainTextarea } from './BrainField';
import BrainScheduleSection from './BrainScheduleSection';
import BrainFaqModalSA from './BrainFaqModalSA';
import BrainToneModal from './BrainToneModal';
import BrainOfficialResponsesModal from './BrainOfficialResponsesModal';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

type ModalKey = null | 'presentation' | 'contact' | 'hours' | 'faq' | 'official' | 'tone';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export default function SACerveauCards({ brain, onChange, onSave, saving }: Props) {
  const t = useThemeTokens();
  const [modal, setModal] = useState<ModalKey>(null);
  const accentColor = '#f59e0b';

  const hoursSummary = formatHoursSummary(brain);
  const contactParts: string[] = [];
  if (brain.phone) contactParts.push(brain.phone);
  if (brain.email) contactParts.push(brain.email);
  const contactSummary = contactParts.length > 0 ? contactParts.join(' | ') : undefined;

  const forbidden = brain.forbidden_actions ?? [];
  const sensitive = brain.sensitive_requests ?? [];
  const toneExtra = [
    brain.tone ? 'ton' : '',
    forbidden.length > 0 ? `${forbidden.length} interdit(s)` : '',
    sensitive.length > 0 ? `${sensitive.length} sensible(s)` : '',
  ].filter(Boolean).join(', ');

  const officialCount = brain.official_responses?.length ?? 0;

  const cards = [
    { id: 'pres', icon: <FileText className="w-5 h-5" />, title: 'Presentation Talvex', description: 'Decrivez Talvex et son fonctionnement.', summary: brain.business_context_text?.trim()?.substring(0, 80) || brain.company_name || undefined, filled: !!(brain.business_context_text?.trim() || brain.company_name), onConfigure: () => setModal('presentation') },
    { id: 'contact', icon: <Phone className="w-5 h-5" />, title: 'Coordonnees support', description: 'Telephone, email et site de contact.', summary: contactSummary, filled: !!(brain.phone || brain.email), onConfigure: () => setModal('contact') },
    { id: 'hours', icon: <Clock className="w-5 h-5" />, title: 'Horaires support', description: 'Quand le support Talvex est disponible.', summary: hoursSummary, filled: !!hoursSummary, onConfigure: () => setModal('hours') },
    { id: 'faq', icon: <HelpCircle className="w-5 h-5" />, title: 'Aide aux admins', description: 'Questions frequentes techniques des admins.', summary: brain.faq?.length ? `${brain.faq.length} question(s)` : undefined, filled: (brain.faq?.length ?? 0) > 0, onConfigure: () => setModal('faq') },
    { id: 'official', icon: <MessagesSquare className="w-5 h-5" />, title: 'Reponses types Talvex', description: 'Reponses officielles prioritaires pour l\'IA.', summary: officialCount > 0 ? `${officialCount} reponse(s) officielle(s)` : undefined, filled: officialCount > 0, onConfigure: () => setModal('official') },
    { id: 'tone', icon: <ShieldAlert className="w-5 h-5" />, title: 'Regles de reponse IA', description: 'Ton, consignes, interdictions et demandes sensibles.', summary: toneExtra || undefined, filled: !!(brain.tone || forbidden.length > 0 || sensitive.length > 0), onConfigure: () => setModal('tone') },
  ];

  async function handleModalSave() {
    await onSave();
    setModal(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map(card => (
          <BrainConfigCard key={card.id} icon={card.icon} title={card.title} description={card.description} summary={card.summary} filled={card.filled} onConfigure={card.onConfigure} />
        ))}
      </div>

      <BrainSectionModal open={modal === 'presentation'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Presentation Talvex" icon={<FileText className="w-4 h-4" />}>
        <BrainTextarea label="Presentation de Talvex" value={brain.business_context_text ?? ''} onChange={v => onChange({ business_context_text: v })} placeholder="Talvex est une plateforme SaaS de gestion client..." rows={6} tokens={t} hint="Ce texte est prioritaire. L'IA l'utilisera en premier pour repondre." />
        <BrainInput label="Nom de la plateforme" value={brain.company_name ?? ''} onChange={v => onChange({ company_name: v })} placeholder="Talvex" tokens={t} />
        <BrainTextarea label="Description" value={brain.company_description ?? ''} onChange={v => onChange({ company_description: v })} placeholder="Description de la plateforme..." rows={3} tokens={t} />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'contact'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Coordonnees support Talvex" icon={<Phone className="w-4 h-4" />}>
        <BrainInput label="Telephone" value={brain.phone ?? ''} onChange={v => onChange({ phone: v })} placeholder="Ex: 0502806189" tokens={t} />
        <BrainInput label="Email" value={brain.email ?? ''} onChange={v => onChange({ email: v })} placeholder="Ex: contact@talvex.fr" type="email" tokens={t} />
        <BrainInput label="Site web" value={brain.website ?? ''} onChange={v => onChange({ website: v })} placeholder="Ex: https://talvex.fr" tokens={t} />
        <div className="grid grid-cols-2 gap-3">
          <BrainInput label="Ville" value={brain.city ?? ''} onChange={v => onChange({ city: v })} placeholder="Lyon" tokens={t} />
          <BrainInput label="Pays" value={brain.country ?? ''} onChange={v => onChange({ country: v })} placeholder="France" tokens={t} />
        </div>
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'hours'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Horaires support Talvex" icon={<Clock className="w-4 h-4" />}>
        <BrainScheduleSection brain={brain} onChange={onChange} tokens={t} embedded />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'faq'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Aide aux admins (FAQ)" icon={<HelpCircle className="w-4 h-4" />}>
        <BrainFaqModalSA brain={brain} onChange={onChange} tokens={t} accentColor={accentColor} />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'official'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Reponses types Talvex" icon={<MessagesSquare className="w-4 h-4" />}>
        <BrainOfficialResponsesModal brain={brain} onChange={onChange} tokens={t} accentColor={accentColor} />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'tone'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Regles de reponse IA" icon={<ShieldAlert className="w-4 h-4" />}>
        <BrainToneModal brain={brain} onChange={onChange} tokens={t} accentColor={accentColor} />
      </BrainSectionModal>
    </>
  );
}

function formatHoursSummary(brain: AiCompanyBrain): string | undefined {
  const h = brain.opening_hours;
  if (!h || typeof h !== 'object') return undefined;
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const open = days.filter(d => h[d] && !h[d].closed);
  if (open.length === 0) return undefined;
  const first = h[open[0]];
  return `${open.length}j/sem | ${first.open}-${first.close}`;
}
