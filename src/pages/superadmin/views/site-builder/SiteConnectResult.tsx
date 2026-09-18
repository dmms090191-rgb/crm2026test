import { AlertTriangle, ArrowRight, Ban, Check, Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { DomainLookup, LookupFeedback } from '../../../../lib/siteFlowModel';
import { SITE_GRADIENT, toneStyle } from './SiteUiParts';

/*
 * Verdict d'une verification de domaine, et action qui en decoule.
 * Le verdict vient du serveur et ne dit JAMAIS a quelle autre entite appartient un domaine deja pris :
 * il se contente de « deja utilise ».
 */
interface Props {
  t: ThemeTokens;
  lookup: DomainLookup;
  feedback: LookupFeedback;
  /* Le bouton d'action est-il propose (domaine libre, ou reprise d'un changement interrompu) ? */
  canChoose: boolean;
  /* Reprise : le domaine est deja associe, sa mise en service doit seulement etre terminee. */
  resumable: boolean;
  isSwitch: boolean;
  busy: boolean;
  onChoose: () => void;
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

export default function SiteConnectResult({ t, lookup, feedback, canChoose, resumable, isSwitch, busy, onChoose }: Props) {
  const icon = feedback.tone === 'success' ? <Check className="w-4 h-4" strokeWidth={3} />
    : feedback.tone === 'danger' ? <Ban className="w-4 h-4" />
      : <AlertTriangle className="w-4 h-4" />;
  const label = busy
    ? (isSwitch ? 'Changement…' : 'Préparation…')
    : resumable ? 'Reprendre la mise en service'
      : isSwitch ? 'Confirmer le changement' : 'Choisir ce domaine';

  return (
    <div className="mt-5 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={toneStyle(t, feedback.tone)} data-testid="site-connect-result" data-status={lookup.status}>
      <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-base sm:text-sm font-semibold [overflow-wrap:anywhere]">
          {feedback.title}{lookup.domain ? ` — ${lookup.domain}` : ''}
        </p>
        <p className="text-sm sm:text-xs mt-0.5 opacity-90 leading-relaxed">
          {resumable ? 'La mise en service de ce domaine a été interrompue : elle peut être reprise.' : feedback.hint}
        </p>
      </div>
      {canChoose && (
        <button type="button" onClick={onChoose} disabled={busy} data-testid="site-connect-choose"
          className={`w-full sm:w-auto h-12 sm:h-11 px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[15px] sm:text-sm font-semibold flex-shrink-0 transition-[filter,transform] duration-150 [@media(hover:hover)]:hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${FOCUS_RING}`}
          style={{ background: SITE_GRADIENT, color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.25), 0 4px 14px rgba(14,165,233,0.18)' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="w-4 h-4" aria-hidden="true" />}
          {label}
        </button>
      )}
    </div>
  );
}
