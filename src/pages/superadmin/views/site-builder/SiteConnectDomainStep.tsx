import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AlertTriangle, Globe, Loader2, RefreshCw, Search } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { StatusTone } from '../../../../lib/siteWorkspaceModel';
import { attachDomain, connectDomain, lookupDomain, switchDomain } from '../../../../lib/siteDomainConnect';
import {
  attachMessage, autoRetryDelay, connectMessage, lookupFeedback, precheckDomainInput,
  type DomainLookup,
} from '../../../../lib/siteFlowModel';
import { DOMAIN_STEPS, SWITCH_STEPS, switchMessage, switchPhase, type UiPhase } from '../../../../lib/siteDomainManageModel';
import { SITE_ACCENT, SITE_GRADIENT, cardStyle, toneStyle } from './SiteUiParts';
import SiteConnectProgress from './SiteConnectProgress';
import SiteConnectResult from './SiteConnectResult';
import { needsSecuring, useSecuringPoll } from './useSecuringPoll';
import { useAutoRetry } from './useAutoRetry';

/*
 * CONNECTER SON DOMAINE — et, avec mode="switch", EN CHANGER. Le serveur verifie UN domaine precis (portefeuille
 * central, libre pour cette entreprise) : jamais le portefeuille complet, jamais a qui appartient un domaine pris.
 * En changement, une seule action serveur prepare le nouveau domaine, le rend actif, puis detache l'ancien.
 */
interface Props {
  t: ThemeTokens;
  companyId: string;
  targetName: string;
  mode?: 'add' | 'switch';
  /* Mode "switch" : adresse actuelle, affichee pour rassurer (elle reste en service pendant l'operation). */
  currentDomain?: string | null;
  onAttached: (domain: string) => void;
  /* Sortie apres un echec (mode ajout) : retour a l'etat reel, JAMAIS avec un message de succes. */
  onSettled?: () => void;
  onCancel?: () => void;
}

interface Panel {
  title: string;
  phase: UiPhase;
  status: 'ok' | 'pending' | 'blocked' | 'unavailable';
  tone: StatusTone;
  text: string | null;
  canRetry: boolean;
  /* Succes qui laisse un avertissement a lire : la suite demande un clic du client. */
  ack?: boolean;
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const VERIFY_BUTTON_STYLE: CSSProperties = { background: SITE_GRADIENT, color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.25), 0 4px 14px rgba(14,165,233,0.18)' };

export default function SiteConnectDomainStep({ t, companyId, targetName, mode = 'add', currentDomain = null, onAttached, onSettled, onCancel }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<DomainLookup | null>(null);
  /* Raccordement (ou changement) lance juste apres le choix : une seule action pour le client. */
  const [panel, setPanel] = useState<Panel | null>(null);
  const [problem, setProblem] = useState<{ tone: StatusTone; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isSwitch = mode === 'switch';
  const autoRetry = useAutoRetry();
  const securing = useSecuringPoll(companyId, lookup?.domain ?? null, () => { const d = lookup?.domain; if (d) window.setTimeout(() => onAttached(d), 1400); });

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = () => {
    securing.stop();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  };

  const check = async (raw: string) => {
    autoRetry.reset();
    const pre = precheckDomainInput(raw);
    setLookup(null);
    setProblem(null);
    // Nouvelle recherche : l'avancement precedent ne doit plus masquer le resultat.
    setPanel(null);
    if (!pre.ok) {
      setHint(pre.message);
      return;
    }
    setHint(null);
    setValue(pre.value);
    const controller = start();
    setChecking(true);
    try {
      const result = await lookupDomain(companyId, pre.value, controller.signal);
      if (!controller.signal.aborted) setLookup(result);
    } catch {
      // Vérification remplacée par une plus récente.
    } finally {
      if (abortRef.current === controller) setChecking(false);
    }
  };

  /* Changement : une seule action serveur, reprenable. L'ancien domaine n'est detache qu'a la toute fin. */
  const runSwitch = async (domain: string, controller: AbortController) => {
    const outcome = await switchDomain(companyId, domain, controller.signal);
    if (controller.signal.aborted) return;
    const message = switchMessage(outcome);
    // Ancienne adresse non detachee (ou detachee a moitie) : le client doit lire avant qu'on referme.
    const ack = outcome.status === 'ok' && (outcome.previousState === 'kept' || outcome.previousState === 'partial');
    setPanel({
      title: `Changement pour ${domain}`,
      phase: switchPhase(outcome),
      status: outcome.status,
      tone: message.tone,
      text: message.text,
      canRetry: message.canRetry,
      ack,
    });
    if (outcome.status === 'ok' && !ack) window.setTimeout(() => onAttached(domain), 1400);
  };

  /* Ajout : association puis raccordement complet, exactement comme avant. */
  const runConnect = async (domain: string, controller: AbortController) => {
    const outcome = await connectDomain(companyId, domain, controller.signal);
    if (controller.signal.aborted) return;
    const wait = autoRetryDelay(outcome);
    const message = connectMessage(outcome, wait !== null && autoRetry.schedule(wait, () => void retry()));
    setPanel({
      title: `Raccordement de ${domain}`,
      phase: outcome.step,
      status: outcome.status,
      tone: message.tone,
      text: message.text,
      canRetry: message.canRetry,
    });
    if (outcome.status === 'ok' || outcome.reason === 'connect_disabled') {
      window.setTimeout(() => onAttached(domain), 1400);
    }
    if (!isSwitch && needsSecuring(outcome)) securing.start();
  };

  const choose = async () => {
    if (!lookup?.domain) return;
    autoRetry.reset();
    const domain = lookup.domain;
    const controller = start();
    setBusy(true);
    setProblem(null);
    try {
      if (isSwitch) {
        setPanel({ title: `Changement pour ${domain}`, phase: 'attach', status: 'pending', tone: 'neutral', text: null, canRetry: false });
        await runSwitch(domain, controller);
        return;
      }
      const result = await attachDomain(companyId, domain, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status !== 'attached') {
        setProblem(attachMessage(result));
        setLookup(null);
        return;
      }
      setPanel({ title: `Raccordement de ${domain}`, phase: 'dns', status: 'pending', tone: 'neutral', text: null, canRetry: false });
      await runConnect(result.domain ?? domain, controller);
    } catch {
      // Remplacée par une action plus récente.
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  };

  const retry = async () => {
    if (!lookup?.domain) return;
    const controller = start();
    setBusy(true);
    // L'avancement repart d'un etat d'attente : sans cela le client garde l'echec precedent sous les yeux
    // pendant toute la nouvelle tentative, qui peut durer plusieurs dizaines de secondes.
    setPanel(prev => (prev ? { ...prev, status: 'pending', tone: 'neutral', text: null, canRetry: false, ack: false } : prev));
    try {
      if (isSwitch) await runSwitch(lookup.domain, controller);
      else await runConnect(lookup.domain, controller);
    } catch {
      // Remplacée par une action plus récente.
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!checking && !busy) void check(value);
  };

  const feedback = lookup ? lookupFeedback(lookup) : null;
  // Changement interrompu : le nouveau domaine est deja associe (« deja le votre ») ; sans ce rattrapage,
  // le bouton disparaitrait et le client ne pourrait plus rien reprendre.
  const resumable = isSwitch && lookup?.status === 'already_yours';
  const canChoose = feedback !== null && (feedback.canChoose || resumable);

  return (
    <section className="rounded-2xl p-5 sm:p-8" style={cardStyle(t)} data-testid="site-step-domaine" data-mode={mode} aria-labelledby="site-connect-title">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.18)', color: SITE_ACCENT }}>
          {isSwitch ? <RefreshCw className="w-5 h-5" aria-hidden="true" /> : <Globe className="w-5 h-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h3 id="site-connect-title" className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: t.heading.primary }}>
            {isSwitch ? 'Changer de domaine' : 'Connectez votre domaine'}
          </h3>
          <p className="text-sm mt-1.5 leading-relaxed max-w-xl" style={{ color: t.text.secondary }}>
            {isSwitch
              ? <>Entrez la nouvelle adresse du site de {targetName}. {currentDomain ? <>Votre site reste accessible sur <strong>{currentDomain}</strong> tant que la nouvelle adresse n'est pas prête.</> : null}</>
              : <>Entrez le nom de domaine que vous possédez déjà. Il deviendra l'adresse du site de {targetName}.</>}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="relative mt-5 sm:mt-6 flex flex-col gap-2.5" noValidate>
        <label htmlFor="site-connect-domain" className="text-sm sm:text-xs font-semibold" style={{ color: t.text.secondary }}>
          {isSwitch ? 'Votre nouveau nom de domaine' : 'Votre nom de domaine'}
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors"
            style={{ color: focused ? t.text.secondary : t.text.tertiary }} aria-hidden="true" />
          <input
            value={value}
            onChange={event => setValue(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            id="site-connect-domain"
            placeholder="monsite.fr"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="url"
            enterKeyHint="search"
            maxLength={253}
            data-testid="site-connect-input"
            className="w-full h-12 sm:h-14 pl-11 pr-4 sm:pr-40 rounded-xl sm:rounded-2xl text-base sm:text-[15px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[color:var(--dom-placeholder)]"
            style={{
              background: t.input.bg,
              border: `1px solid ${focused ? t.input.borderFocus : t.input.border}`,
              boxShadow: focused ? `0 0 0 3px ${t.accent.bg}` : 'inset 0 1px 2px rgba(0,0,0,0.10)',
              color: t.input.text,
              '--dom-placeholder': t.input.placeholder,
            } as CSSProperties}
          />
        </div>
        {/* Le bouton flotte sur le champ en grand ecran : il doit suivre le champ, pas le libelle. */}
        <button type="submit" disabled={checking || busy} data-testid="site-connect-verify"
          className={`w-full h-12 sm:absolute sm:right-2 sm:top-[2.4rem] sm:h-10 sm:w-auto sm:min-w-[132px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[15px] sm:text-sm font-semibold transition-[filter,transform] duration-150 [@media(hover:hover)]:hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${FOCUS_RING}`}
          style={VERIFY_BUTTON_STYLE}>
          {checking ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
          {checking ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>

      {/* L'operation en cours prime sur le resultat de la recherche : c'est elle que le client attend. */}
      <p role="status" aria-live="polite" className="sr-only">
        {panel?.text ?? problem?.text ?? (checking ? 'Vérification en cours…' : feedback ? `${feedback.title}. ${feedback.hint}` : '')}
      </p>

      {hint && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm sm:text-xs" style={{ color: t.warning.text }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />{hint}
        </p>
      )}

      {problem && (
        <p className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm sm:text-xs" style={toneStyle(t, problem.tone)} data-testid="site-connect-problem">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />{problem.text}
        </p>
      )}

      {panel && lookup?.domain && (
        <SiteConnectProgress t={t} title={panel.title}
          steps={isSwitch ? SWITCH_STEPS : DOMAIN_STEPS}
          reassurance={isSwitch && currentDomain && panel.status !== 'ok'
            ? `Votre site reste accessible sur ${currentDomain} : l'ancienne adresse n'est retirée qu'à la toute fin.`
            : null}
          phase={(securing.view ?? panel).phase} status={(securing.view ?? panel).status} tone={(securing.view ?? panel).tone}
          text={(securing.view ?? panel).text} canRetry={(securing.view ?? panel).canRetry} busy={busy}
          onRetry={securing.view?.retry === 'light' ? () => securing.start(0) : () => { autoRetry.reset(); void retry(); }}
          requireAck={panel.ack === true} retryLabel={securing.view?.retryLabel ?? undefined}
          onContinue={securing.view?.polling ? undefined : panel.ack === true ? () => onAttached(lookup.domain!) : isSwitch ? onCancel : () => { autoRetry.cancel(); onSettled?.(); }}
          continueLabel={panel.ack === true ? "J'ai compris" : isSwitch ? 'Revenir à mon domaine' : 'Continuer'} />
      )}

      {feedback && lookup && !checking && !panel && (
        <SiteConnectResult t={t} lookup={lookup} feedback={feedback} canChoose={canChoose}
          resumable={resumable} isSwitch={isSwitch} busy={busy} onChoose={() => void choose()} />
      )}

      {onCancel && !panel && (
        <button type="button" onClick={onCancel} data-testid="site-connect-cancel"
          className={`mt-4 inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-sm sm:text-xs font-semibold ${FOCUS_RING}`}
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
          Annuler
        </button>
      )}
    </section>
  );
}
