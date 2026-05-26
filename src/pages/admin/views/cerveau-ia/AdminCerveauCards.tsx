import { useState } from 'react';
import { Building2, Phone, Clock, Briefcase, HelpCircle, CalendarCheck, MessageCircle } from 'lucide-react';
import type { AiCompanyBrain } from '../../../../lib/brainTypes';
import BrainConfigCard from '../../../superadmin/views/cerveau-ia/BrainConfigCard';
import BrainSectionModal from '../../../superadmin/views/cerveau-ia/BrainSectionModal';
import { BrainInput, BrainTextarea } from '../../../superadmin/views/cerveau-ia/BrainField';
import BrainScheduleSection from '../../../superadmin/views/cerveau-ia/BrainScheduleSection';
import BrainServicesSection from '../../../superadmin/views/cerveau-ia/BrainServicesSection';
import BrainFaqSection from '../../../superadmin/views/cerveau-ia/BrainFaqSection';
import BrainRulesSection from '../../../superadmin/views/cerveau-ia/BrainRulesSection';
import BrainTestChat from '../../../superadmin/views/cerveau-ia/BrainTestChat';

type ModalKey = null | 'identity' | 'contact' | 'hours' | 'services' | 'faq' | 'rdv' | 'tone';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  tokens: Record<string, any>;
  companyId: string;
}

export default function AdminCerveauCards({ brain, onChange, onSave, saving, tokens: t, companyId }: Props) {
  const [modal, setModal] = useState<ModalKey>(null);
  const accent = '#0ea5e9';

  const contactParts: string[] = [];
  if (brain.phone) contactParts.push(brain.phone);
  if (brain.email) contactParts.push(brain.email);
  const contactSummary = contactParts.length > 0 ? contactParts.join(' | ') : undefined;
  const hoursSummary = getHoursSummary(brain);

  const cards = [
    { id: 'identity', icon: <Building2 className="w-5 h-5" />, title: 'Identite de l\'entreprise', description: 'Nom, secteur, description et presentation.', summary: brain.company_name || brain.business_context_text?.trim()?.substring(0, 80) || undefined, filled: !!(brain.company_name || brain.business_context_text?.trim()), onConfigure: () => setModal('identity') },
    { id: 'contact', icon: <Phone className="w-5 h-5" />, title: 'Coordonnees', description: 'Telephone, email, site web et localisation.', summary: contactSummary, filled: !!(brain.phone || brain.email), onConfigure: () => setModal('contact') },
    { id: 'hours', icon: <Clock className="w-5 h-5" />, title: 'Horaires d\'ouverture', description: 'Jours et heures ou l\'entreprise est ouverte.', summary: hoursSummary, filled: !!hoursSummary, onConfigure: () => setModal('hours') },
    { id: 'services', icon: <Briefcase className="w-5 h-5" />, title: 'Services proposes', description: 'Liste des services avec descriptions et prix.', summary: brain.services?.length ? `${brain.services.length} service(s)` : undefined, filled: (brain.services?.length ?? 0) > 0, onConfigure: () => setModal('services') },
    { id: 'faq', icon: <HelpCircle className="w-5 h-5" />, title: 'FAQ', description: 'Questions frequentes et reponses pour vos clients.', summary: brain.faq?.length ? `${brain.faq.length} question(s)` : undefined, filled: (brain.faq?.length ?? 0) > 0, onConfigure: () => setModal('faq') },
    { id: 'rdv', icon: <CalendarCheck className="w-5 h-5" />, title: 'Regles de rendez-vous', description: 'Duree, delai minimum et nombre maximum.', summary: brain.appointment_rules?.duration_minutes ? `${brain.appointment_rules.duration_minutes}min / RDV` : undefined, filled: !!(brain.appointment_rules?.duration_minutes), onConfigure: () => setModal('rdv') },
    { id: 'tone', icon: <MessageCircle className="w-5 h-5" />, title: 'Ton et personnalite', description: 'Comment l\'IA doit communiquer avec vos clients.', summary: brain.tone?.substring(0, 60) || undefined, filled: !!brain.tone, onConfigure: () => setModal('tone') },
  ];

  async function handleModalSave() {
    await onSave();
    setModal(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map(card => (
          <BrainConfigCard key={card.id} icon={card.icon} title={card.title} description={card.description} summary={card.summary} filled={card.filled} accentColor={accent} tokens={t} onConfigure={card.onConfigure} />
        ))}
      </div>

      <BrainTestChat companyId={companyId} tokens={t} accentColor={accent} />

      <BrainSectionModal open={modal === 'identity'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Identite de l'entreprise" icon={<Building2 className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainTextarea label="Presentation de l'entreprise" value={brain.business_context_text ?? ''} onChange={v => onChange({ business_context_text: v })} placeholder="Decrivez votre entreprise, son activite, ses valeurs..." rows={5} tokens={t} hint="Ce texte est prioritaire. L'IA l'utilisera en premier." />
        <BrainInput label="Nom de l'entreprise" value={brain.company_name ?? ''} onChange={v => onChange({ company_name: v })} placeholder="Ex: Mon Entreprise" tokens={t} />
        <BrainInput label="Secteur d'activite" value={brain.business_sector ?? ''} onChange={v => onChange({ business_sector: v })} placeholder="Ex: Energie renouvelable" tokens={t} />
        <BrainTextarea label="Description courte" value={brain.company_description ?? ''} onChange={v => onChange({ company_description: v })} placeholder="Description en quelques lignes..." rows={3} tokens={t} />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'contact'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Coordonnees" icon={<Phone className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainInput label="Telephone" value={brain.phone ?? ''} onChange={v => onChange({ phone: v })} placeholder="Ex: 01 23 45 67 89" tokens={t} />
        <BrainInput label="Email" value={brain.email ?? ''} onChange={v => onChange({ email: v })} placeholder="Ex: contact@entreprise.fr" type="email" tokens={t} />
        <BrainInput label="Site web" value={brain.website ?? ''} onChange={v => onChange({ website: v })} placeholder="Ex: https://entreprise.fr" tokens={t} />
        <div className="grid grid-cols-2 gap-3">
          <BrainInput label="Ville" value={brain.city ?? ''} onChange={v => onChange({ city: v })} placeholder="Paris" tokens={t} />
          <BrainInput label="Pays" value={brain.country ?? ''} onChange={v => onChange({ country: v })} placeholder="France" tokens={t} />
        </div>
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'hours'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Horaires d'ouverture" icon={<Clock className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainScheduleSection brain={brain} onChange={onChange} tokens={t} embedded />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'services'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Services proposes" icon={<Briefcase className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainServicesSection brain={brain} onChange={onChange} tokens={t} embedded />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'faq'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="FAQ" icon={<HelpCircle className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainFaqSection brain={brain} onChange={onChange} tokens={t} embedded />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'rdv'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Regles de rendez-vous" icon={<CalendarCheck className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainRulesSection brain={brain} onChange={onChange} tokens={t} embedded />
      </BrainSectionModal>

      <BrainSectionModal open={modal === 'tone'} onClose={() => setModal(null)} onSave={handleModalSave} saving={saving} title="Ton et personnalite" icon={<MessageCircle className="w-4 h-4" />} accentColor={accent} tokens={t}>
        <BrainTextarea label="Instructions de ton pour l'IA" value={brain.tone ?? ''} onChange={v => onChange({ tone: v })} placeholder="Ex: Sois professionnel, chaleureux et reponds toujours en francais..." rows={4} tokens={t} />
      </BrainSectionModal>
    </>
  );
}

function getHoursSummary(brain: AiCompanyBrain): string | undefined {
  const h = brain.opening_hours;
  if (!h || typeof h !== 'object') return undefined;
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const open = days.filter(d => h[d] && !h[d].closed);
  if (open.length === 0) return undefined;
  const first = h[open[0]];
  return `${open.length}j/sem | ${first.open}-${first.close}`;
}
