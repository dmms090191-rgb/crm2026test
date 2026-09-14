import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import BoutiqueStartChoice from './BoutiqueStartChoice';
import BoutiqueTemplateCard from './BoutiqueTemplateCard';
import BoutiqueNameForm from './BoutiqueNameForm';
import { BOUTIQUE_TEMPLATES } from './boutiqueTypes';
import type { BoutiqueTemplate } from './boutiqueTypes';

type Step = 'choice' | 'template' | 'name';

interface Props {
  onClose: () => void;
  onCreate: (name: string, templateKey: string | null) => Promise<{ error: string | null }>;
}

const TITLES: Record<Step, string> = {
  choice: 'Comment souhaitez-vous commencer ?',
  template: 'Choisir un modèle de boutique',
  name: 'Nommer votre boutique',
};

/**
 * Parcours du modal — le formulaire de nom est PARTAGE par les deux chemins :
 *   choix -> « Choisir un modele » -> liste des modeles -> nom -> creee
 *   choix -> « Creer ma boutique » --------------------> nom -> creee
 * Seule difference : `template` vaut un modele, ou null.
 */
export default function BoutiqueCreateModal({ onClose, onCreate }: Props) {
  const t = useThemeTokens();
  const [step, setStep] = useState<Step>('choice');
  const [template, setTemplate] = useState<BoutiqueTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const back = () => {
    setError('');
    if (step === 'name') setStep(template ? 'template' : 'choice');
    else if (step === 'template') setStep('choice');
  };

  const submit = async (name: string) => {
    setSaving(true);
    setError('');
    const res = await onCreate(name, template ? template.key : null);
    setSaving(false);
    if (res.error) setError(res.error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: t.modal.overlayBg }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>

        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div className="flex items-start gap-3 min-w-0">
            {step !== 'choice' && (
              <button type="button" onClick={back} aria-label="Retour"
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
                style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-lg font-bold leading-snug" style={{ color: t.modal.title }}>{TITLES[step]}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {step === 'choice' && (
            <BoutiqueStartChoice
              onChooseTemplate={() => { setTemplate(null); setStep('template'); }}
              onCreateBlank={() => { setTemplate(null); setStep('name'); }}
            />
          )}

          {step === 'template' && (
            <div className="space-y-3">
              {BOUTIQUE_TEMPLATES.map(tpl => (
                <BoutiqueTemplateCard key={tpl.key} template={tpl}
                  onUse={(picked) => { setTemplate(picked); setStep('name'); }} />
              ))}
            </div>
          )}

          {step === 'name' && (
            <BoutiqueNameForm template={template} saving={saving} error={error}
              onCancel={onClose} onSubmit={submit} />
          )}
        </div>
      </div>
    </div>
  );
}
