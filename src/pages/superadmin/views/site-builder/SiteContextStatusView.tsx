import { ArrowLeft, Globe, Loader2, ShieldAlert, X } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { SiteContextStatus } from '../../../../lib/siteContextModel';

interface Props {
  t: ThemeTokens;
  title: string;
  status: SiteContextStatus;
  onClose?: () => void;
  onBack?: () => void;
}

const MESSAGES: Record<Exclude<SiteContextStatus, 'loading' | 'ready'>, { title: string; text: string }> = {
  no_target: {
    title: 'Aucune entreprise ciblée',
    text: "Ce site n'est rattaché à aucune entreprise Talvex. Ouvrez le site depuis le Groupe ou la Société concernée.",
  },
  forbidden: {
    title: 'Accès au site refusé',
    text: "Votre compte ne peut pas gérer le site de cette entreprise.",
  },
  error: {
    title: 'Contexte indisponible',
    text: "Le contexte du site n'a pas pu être chargé. Réessayez dans un instant.",
  },
};

export default function SiteContextStatusView({ t, title, status, onClose, onBack }: Props) {
  const message = status === 'loading' || status === 'ready' ? null : MESSAGES[status];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        {onBack && (
          <button onClick={onBack} aria-label="Retour"
            className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
          <Globe className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-bold truncate flex-1 min-w-0" style={{ color: t.heading.primary }}>{title}</span>
        {onClose && (
          <button onClick={onClose} aria-label="Fermer"
            className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        {message ? (
          <div className="max-w-sm w-full text-center">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3" style={{ color: t.text.secondary }} />
            <p className="text-sm font-bold mb-1" style={{ color: t.heading.primary }}>{message.title}</p>
            <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>{message.text}</p>
          </div>
        ) : (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} />
        )}
      </div>
    </div>
  );
}
