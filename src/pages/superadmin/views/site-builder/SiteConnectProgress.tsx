import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { StatusTone } from '../../../../lib/siteWorkspaceModel';
import { DOMAIN_STEPS, domainStepState, type DomainStepGroup, type UiPhase } from '../../../../lib/siteDomainManageModel';

/*
 * Avancement montre au client :
 *   ajouter  : Préparation du domaine -> Connexion -> Sécurisation -> Terminé
 *   changer  : Préparation du nouveau domaine -> Connexion -> Sécurisation -> Activation -> Terminé
 * Volontairement sans jargon : ce qui se passe reellement (zone DNS, hebergement, certificat) reste
 * cote serveur et n'est detaille qu'a Talvex Administrateur, ailleurs.
 */
interface Props {
  t: ThemeTokens;
  title: string;
  /* Liste d'etapes a afficher : DOMAIN_STEPS (ajout) ou SWITCH_STEPS (changement). */
  steps?: DomainStepGroup[];
  /* Phrase rassurante maintenue pendant toute l'operation (ex. l'ancienne adresse fonctionne toujours). */
  reassurance?: string | null;
  phase: UiPhase;
  status: 'ok' | 'pending' | 'blocked' | 'unavailable';
  tone: StatusTone;
  text: string | null;
  canRetry: boolean;
  busy: boolean;
  onRetry?: () => void;
  /* Sortie visible quand l'operation n'a pas abouti : jamais d'impasse. */
  onContinue?: () => void;
  continueLabel?: string;
  /*
   * Succes assorti d'un avertissement (ex. ancienne adresse non detachee) : l'ecran ne doit PAS se
   * refermer tout seul, sinon le client ne lit jamais l'avertissement.
   */
  requireAck?: boolean;
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const SMALL_BUTTON = `inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-sm sm:text-xs font-semibold ${FOCUS_RING}`;

export default function SiteConnectProgress({ t, title, steps, reassurance, phase, status, tone, text, canRetry, busy, onRetry, onContinue, continueLabel, requireAck }: Props) {
  const liste = steps ?? DOMAIN_STEPS;
  return (
    <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ border: `1px solid ${t.surface.border}`, background: t.surface.secondary }}
      data-testid="site-connect-progress" data-connect-status={status} data-connect-phase={phase}>
      <p className="text-base sm:text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: t.heading.primary }}>{title}</p>
      {reassurance && (
        <p className="mt-1.5 text-sm sm:text-xs leading-relaxed" style={{ color: t.success.text }} data-testid="site-connect-reassurance">
          {reassurance}
        </p>
      )}
      <ol className="mt-3 space-y-2">
        {liste.map((group, index) => {
          const state = domainStepState(index, phase, status, liste);
          const color = state === 'done' ? t.success.text
            : state === 'failed' ? t.warning.text
              : state === 'current' ? t.text.primary : t.text.tertiary;
          return (
            <li key={group.key} className="flex items-center gap-2.5 text-sm sm:text-xs" style={{ color }}>
              {state === 'done' ? <Check className="w-4 h-4 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
                : state === 'failed' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  : state === 'current' ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" aria-hidden="true" />
                    : <span className="w-4 h-4 flex-shrink-0 rounded-full" style={{ border: `1.5px solid ${t.surface.border}` }} aria-hidden="true" />}
              {group.label}
            </li>
          );
        })}
      </ol>
      {text && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm sm:text-xs min-w-0 flex-1 leading-relaxed"
            style={{ color: tone === 'success' ? t.success.text : tone === 'danger' ? t.danger.text : t.text.secondary }}>
            {text}
          </p>
          {canRetry && onRetry && (
            <button type="button" onClick={onRetry} disabled={busy} className={SMALL_BUTTON}
              style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}
              data-testid="site-connect-retry">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null} Réessayer
            </button>
          )}
          {onContinue && (status !== 'ok' || requireAck === true) && (
            <button type="button" onClick={onContinue} className={SMALL_BUTTON}
              style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}
              data-testid="site-connect-continue">
              {continueLabel ?? 'Continuer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
