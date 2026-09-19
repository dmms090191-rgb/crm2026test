import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, Globe, Loader2, RefreshCw, RotateCw, ShieldCheck, Unlink } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { DomainSummary } from '../../../../lib/siteWorkspaceModel';
import { connectDomain, disconnectDomain } from '../../../../lib/siteDomainConnect';
import { autoRetryDelay, connectMessage, type ConnectProgress } from '../../../../lib/siteFlowModel';
import { DISCONNECT_CONFIRM, disconnectMessage, type DisconnectResult } from '../../../../lib/siteDomainManageModel';
import { BUTTON_BASE, SITE_ACCENT, SITE_GRADIENT, StatusPill, cardStyle, secondaryButtonStyle, toneStyle } from './SiteUiParts';
import SiteConnectProgress from './SiteConnectProgress';
import { useAutoRetry } from './useAutoRetry';

/*
 * DOMAINE CONNECTE — l'ecran simple demande par David :
 *   le domaine, son etat, et deux actions : changer de domaine, deconnecter le domaine.
 * Aucun jargon technique (ni DNS, ni hebergeur, ni fournisseur) : ces details restent au serveur.
 * La deconnexion demande toujours une confirmation explicite, qui dit ce qui NE change pas :
 * le domaine reste la propriete du client et sa messagerie n'est pas touchee.
 */
interface Props {
  t: ThemeTokens;
  companyId: string;
  summary: DomainSummary;
  onChangeDomain: () => void;
  /* Rechargement des donnees du site apres une deconnexion reussie. */
  onDisconnected: () => void;
  /* Domaine associe mais pas encore actif : sa mise en service peut etre reprise ici. */
  canResume: boolean;
  /* Rechargement apres une reprise reussie. */
  onResumed: () => void;
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const ACTION_BASE = `w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-4 rounded-xl text-[15px] sm:text-sm font-semibold transition-[filter,transform] duration-150 [@media(hover:hover)]:hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${FOCUS_RING}`;
/* Actions secondaires : discretes, mais toujours confortables au doigt (44 px de hauteur touchable). */
const DISCRET_BASE = 'inline-flex items-center justify-center sm:justify-start gap-2 min-h-[44px] px-1 rounded-lg text-sm font-medium underline-offset-4 [@media(hover:hover)]:hover:underline disabled:opacity-60 disabled:cursor-not-allowed';
/* Action principale de l'ecran : « Voir mon site » ou « Reprendre la mise en service ». */
const PRIMARY_ACTION = `mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[42px] px-6 rounded-xl text-[15px] font-semibold transition-[filter,transform] duration-150 [@media(hover:hover)]:hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${FOCUS_RING}`;
const PRIMARY_STYLE = { background: SITE_GRADIENT, color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.25), 0 6px 18px rgba(14,165,233,0.20)' };
const RESUME_PENDING: ConnectProgress = { status: 'pending', step: 'dns', connectionStatus: 'not_started', reason: null, message: null, retryAfterSeconds: null };

export default function SiteDomainConnected({ t, companyId, summary, onChangeDomain, onDisconnected, canResume, onResumed }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<DisconnectResult | null>(null);
  const [resume, setResume] = useState<{ progress: ConnectProgress; auto: boolean } | null>(null);
  const [resuming, setResuming] = useState(false);
  const autoRetry = useAutoRetry();
  const abortRef = useRef<AbortController | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { if (confirming) confirmRef.current?.focus(); }, [confirming]);

  const domain = summary.domain ?? '';

  const disconnect = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setResult(null);
    try {
      const outcome = await disconnectDomain(companyId, domain, controller.signal);
      if (controller.signal.aborted) return;
      setResult(outcome);
      setConfirming(false);
      if (outcome.status === 'ok') window.setTimeout(() => onDisconnected(), 1200);
    } catch {
      // Remplacee par une action plus recente.
    } finally {
      if (abortRef.current === controller) setWorking(false);
    }
  };

  /* Reprise : le raccordement serveur repart la ou il s'est arrete, sur la MEME ligne (aucun doublon). */
  const runResume = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResuming(true);
    setResume(prev => ({ progress: { ...(prev?.progress ?? RESUME_PENDING), status: 'pending', reason: null, retryAfterSeconds: null }, auto: false }));
    try {
      const progress = await connectDomain(companyId, domain, controller.signal);
      if (controller.signal.aborted) return;
      const wait = autoRetryDelay(progress);
      setResume({ progress, auto: wait !== null && autoRetry.schedule(wait, () => void runResume()) });
      if (progress.status === 'ok') window.setTimeout(() => { setResume(null); onResumed(); }, 1400);
    } catch {
      // Remplacee par une action plus recente.
    } finally {
      if (abortRef.current === controller) setResuming(false);
    }
  };
  const resumeNow = () => { autoRetry.reset(); void runResume(); };

  const feedback = result ? disconnectMessage(result) : null;
  const resumeMessage = resume ? connectMessage(resume.progress, resume.auto) : null;

  return (
    <section className="rounded-2xl p-5 sm:p-6" style={cardStyle(t)} data-testid="site-domain-connected" data-domain-state={summary.state}>
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.18)', color: SITE_ACCENT }}>
          <Globe className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>Votre domaine</p>
          <p className="text-xl sm:text-lg font-bold [overflow-wrap:anywhere] leading-tight" style={{ color: t.heading.primary }}>
            {domain}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill t={t} tone={summary.tone} label={summary.state === 'active' ? 'Domaine connecté' : summary.label}
              icon={summary.state === 'active' ? <Check className="w-3 h-3" strokeWidth={3} /> : undefined} />
          </div>
          <p className="text-sm sm:text-xs mt-2 leading-relaxed" style={{ color: t.text.secondary }}>{summary.hint}</p>
        </div>
      </div>

      {!confirming && (
        <>
          {/* Action principale : voir son site. Le reste passe au second plan. */}
          {summary.state === 'active' && domain && (
            <a href={`https://${domain}`} target="_blank" rel="noreferrer" data-testid="site-domain-visit"
              className={PRIMARY_ACTION} style={PRIMARY_STYLE}>
              <ExternalLink className="w-4 h-4" aria-hidden="true" /> Voir mon site
            </a>
          )}
          {/* Mise en service interrompue : on la reprend, au lieu de devoir deconnecter puis reconnecter. */}
          {canResume && !resume && domain && (
            <button type="button" onClick={resumeNow} disabled={working || resuming} data-testid="site-domain-resume"
              className={PRIMARY_ACTION} style={PRIMARY_STYLE}>
              {resuming ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RotateCw className="w-4 h-4" aria-hidden="true" />}
              Reprendre la mise en service
            </button>
          )}
          {resume && resumeMessage && (
            <SiteConnectProgress t={t} title={`Mise en service de ${domain}`} phase={resume.progress.step}
              status={resume.progress.status} tone={resumeMessage.tone} text={resuming ? null : resumeMessage.text}
              canRetry={resumeMessage.canRetry} busy={resuming} onRetry={resumeNow} />
          )}
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button type="button" onClick={onChangeDomain} disabled={working || resuming} data-testid="site-domain-change"
              className={`${DISCRET_BASE} ${FOCUS_RING}`} style={{ color: t.text.secondary }}>
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Changer de domaine
            </button>
            <button type="button" onClick={() => { setResult(null); setConfirming(true); }} disabled={working || resuming}
              data-testid="site-domain-disconnect" className={`${DISCRET_BASE} ${FOCUS_RING}`} style={{ color: t.text.tertiary }}>
              <Unlink className="w-3.5 h-3.5" aria-hidden="true" /> Déconnecter le domaine
            </button>
          </div>
        </>
      )}

      {confirming && (
        <div className="mt-5 rounded-2xl p-4 sm:p-5" style={toneStyle(t, 'danger')} role="alertdialog" aria-labelledby="site-domain-confirm-title"
          data-testid="site-domain-confirm">
          <p id="site-domain-confirm-title" className="text-base sm:text-sm font-bold">
            {DISCONNECT_CONFIRM.title}
          </p>
          <p className="mt-1 text-sm sm:text-xs font-semibold [overflow-wrap:anywhere] opacity-90">{domain}</p>
          <ul className="mt-3 space-y-1.5">
            {DISCONNECT_CONFIRM.points.map(point => (
              <li key={point} className="flex items-start gap-2 text-sm sm:text-xs leading-relaxed opacity-95">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />{point}
              </li>
            ))}
          </ul>
          {/* « Annuler » d'abord : la sortie sans risque est la plus facile a atteindre. */}
          <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2.5">
            <button type="button" onClick={() => setConfirming(false)} disabled={working} className={ACTION_BASE}
              style={secondaryButtonStyle(t)} data-testid="site-domain-confirm-no">
              {DISCONNECT_CONFIRM.cancel}
            </button>
            <button type="button" ref={confirmRef} onClick={() => void disconnect()} disabled={working}
              className={ACTION_BASE} style={{ background: t.danger.text, color: '#fff' }} data-testid="site-domain-confirm-yes">
              {working ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Unlink className="w-4 h-4" aria-hidden="true" />}
              {working ? 'Déconnexion…' : DISCONNECT_CONFIRM.confirm}
            </button>
          </div>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {working ? 'Déconnexion en cours…' : feedback?.text ?? ''}
      </p>

      {feedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3" style={toneStyle(t, feedback.tone)} data-testid="site-domain-disconnect-result">
          {feedback.tone === 'success'
            ? <Check className="w-4 h-4 flex-shrink-0 mt-px" strokeWidth={3} aria-hidden="true" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-xs leading-relaxed">{feedback.text}</p>
            {feedback.canRetry && (
              <button type="button" onClick={() => void disconnect()} disabled={working}
                className={`${BUTTON_BASE} mt-3 w-full sm:w-auto`} style={secondaryButtonStyle(t)} data-testid="site-domain-disconnect-retry">
                Réessayer
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
