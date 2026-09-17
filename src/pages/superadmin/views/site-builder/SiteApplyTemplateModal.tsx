import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, LayoutGrid, X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { CompanyHomePage, SiteTemplate } from '../../../../lib/companyHomePages';
import { BUTTON_BASE, PRIMARY_BUTTON_STYLE, SITE_ACCENT, secondaryButtonStyle } from './SiteUiParts';

/* Confirmation avant d'utiliser un template pour le site de l'entreprise ciblee. */
interface Props {
  t: ThemeTokens;
  template: SiteTemplate;
  page: CompanyHomePage | null;
  targetName: string;
  onConfirm: (template: SiteTemplate) => Promise<string | null>;
  onClose: () => void;
  onDone: () => void;
}

export default function SiteApplyTemplateModal({ t, template, page, targetName, onConfirm, onClose, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const message = await onConfirm(template);
    setBusy(false);
    if (message) setError(message);
    else onDone();
  };

  const points = [
    page ? "Votre site prendra l'apparence de ce template." : `Le site de ${targetName} sera créé avec ce template.`,
    'Votre domaine, vos contacts, clients, rendez-vous et boutiques ne changent pas.',
  ];
  if (page && !page.is_active) points.push('Votre site sera remis en ligne.');

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" data-testid="site-apply-modal"
      style={{ zIndex: 100001, background: t.modal.overlayBg, backdropFilter: 'blur(8px)' }} onClick={busy ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Utiliser ${template.name}`}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(14,165,233,0.10)', color: SITE_ACCENT }}>
            <LayoutGrid className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-base font-bold break-words" style={{ color: t.modal.title }}>Utiliser « {template.name} » ?</p>
            <p className="text-sm sm:text-xs mt-0.5" style={{ color: t.modal.subtitle }}>Site de {targetName}</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Fermer"
            className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {points.map(p => (
            <li key={p} className="flex items-start gap-2 text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />{p}
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="mt-4 rounded-xl px-3 py-2 text-sm sm:text-xs"
            style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>{error}</p>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={onClose} disabled={busy} className={BUTTON_BASE} style={secondaryButtonStyle(t)}>Annuler</button>
          <button onClick={confirm} disabled={busy} className={BUTTON_BASE} style={PRIMARY_BUTTON_STYLE} data-testid="site-apply-confirm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Utiliser ce template
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
