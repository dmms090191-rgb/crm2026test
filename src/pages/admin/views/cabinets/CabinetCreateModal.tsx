import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import CabinetStartChoice from './CabinetStartChoice';
import CabinetTemplateCard from './CabinetTemplateCard';
import CabinetNameForm from './CabinetNameForm';
import { CABINET_TEMPLATES } from './cabinetTypes';
import type { CabinetTemplate } from './cabinetTypes';

type Step = 'choice' | 'template' | 'name';

interface Props {
  onClose: () => void;
  onCreate: (name: string, templateKey: string | null) => Promise<{ error: string | null }>;
}

const TITLES: Record<Step, string> = {
  choice: 'Comment souhaitez-vous commencer ?',
  template: 'Choisir un modèle de cabinet',
  name: 'Nommer votre cabinet',
};

/**
 * Parcours du modal — le formulaire de nom est PARTAGE par les deux chemins :
 *   choix -> « Choisir un modele » -> liste des modeles -> nom -> cree
 *   choix -> « Creer mon cabinet » --------------------> nom -> cree
 * Seule difference : `template` vaut un modele, ou null.
 */
export default function CabinetCreateModal({ onClose, onCreate }: Props) {
  const t = useThemeTokens();
  const [step, setStep] = useState<Step>('choice');
  const [template, setTemplate] = useState<CabinetTemplate | null>(null);
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
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" data-testid="cabinet-create-modal"
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
            <CabinetStartChoice
              onChooseTemplate={() => { setTemplate(null); setStep('template'); }}
              onCreateBlank={() => { setTemplate(null); setStep('name'); }}
            />
          )}

          {/*
            Le catalogue est vide tant qu'aucun modele de cabinet n'a ete concu. L'etape est
            alors inatteignable (la carte de choix est desactivee), mais si elle l'etait un
            jour par un autre chemin, elle doit dire pourquoi elle est vide plutot que de
            n'afficher rien du tout.
          */}
          {step === 'template' && (
            CABINET_TEMPLATES.length === 0 ? (
              <p className="text-sm px-4 py-3 rounded-lg"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
                Aucun modèle de cabinet n’est disponible pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {CABINET_TEMPLATES.map(tpl => (
                  <CabinetTemplateCard key={tpl.key} template={tpl}
                    onUse={(picked) => { setTemplate(picked); setStep('name'); }} />
                ))}
              </div>
            )
          )}

          {step === 'name' && (
            <CabinetNameForm template={template} saving={saving} error={error}
              onCancel={onClose} onSubmit={submit} />
          )}
        </div>
      </div>
    </div>
  );
}
