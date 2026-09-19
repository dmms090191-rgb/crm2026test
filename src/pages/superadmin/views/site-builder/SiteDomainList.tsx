import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { AlertTriangle, Check, Copy, Globe, ListX, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { getRegisteredDomains, hideAllRegisteredDomains, hideRegisteredDomain } from '../../../../lib/siteDomains';
import {
  COPIED_MS, copyAnnouncement, copyLabel, hideAllConfirm, hideAllMessage, hideConfirm, hideMessage, hideableCount,
  parseRegisteredDomains, toHideAllOutcome, toHideOutcome, type CopyState, type CurrentDomain, type HideAllOutcome,
  type HideOutcome, type ListFeedback,
} from '../../../../lib/siteDomainListModel';
import { BUTTON_BASE, PRIMARY_BUTTON_STYLE, SITE_ACCENT, StatusPill, cardStyle, secondaryButtonStyle, toneStyle } from './SiteUiParts';

/*
 * MES DOMAINES ENREGISTRES — les domaines deja enregistres par l'entite ciblee (ou visualisee).
 *   « Copier »         : copie le nom du domaine, rien d'autre (aucun appel serveur).
 *   « Supprimer »      : retire le domaine de CETTE liste, apres confirmation. Il n'est jamais deconnecte.
 *   « Tout supprimer » : retire tous les domaines hors service ; le domaine en service reste affiche.
 * Le domaine en service n'a jamais de bouton « Supprimer » (et le serveur refuse de le masquer).
 */
interface Props {
  t: ThemeTokens;
  /* Entite reellement ciblee : le serveur reverifie le droit a chaque appel. */
  companyId: string;
  /* Domaine affiche par le panneau au-dessus : toujours present dans la liste, protege, meme etat. */
  current?: CurrentDomain | null;
  /* Change quand le domaine connecte change : la liste se relit. */
  refreshKey?: string;
}

type Confirming = { kind: 'one'; name: string } | { kind: 'all' } | null;

/* Copie du texte seul : presse-papiers du navigateur, avec repli pour les contextes sans permission. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* repli ci-dessous */ }
  try {
    const area = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function SiteDomainList({ t, companyId, current = null, refreshKey = '' }: Props) {
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [copied, setCopied] = useState<{ name: string; state: CopyState } | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<ListFeedback | null>(null);
  const [announce, setAnnounce] = useState('');
  const requestRef = useRef(0);
  const companyRef = useRef(companyId);
  const copyTimer = useRef<number | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  // Bouton qui a ouvert la confirmation : il retrouve le focus a la fermeture.
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const load = useCallback(async () => {
    const id = ++requestRef.current;
    setLoading(true);
    try {
      const next = await getRegisteredDomains(companyId);
      if (id !== requestRef.current) return;
      setRows(next);
      setLoadFailed(false);
    } catch {
      if (id === requestRef.current) setLoadFailed(true);
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [companyId]);

  // Autre entite (changement de cible ou de Visu) : on repart de zero, sans rien garder de la precedente.
  useEffect(() => {
    companyRef.current = companyId;
    setRows(null);
    setConfirming(null);
    setFeedback(null);
    setAnnounce('');
    setLoadFailed(false);
    setWorking(false);
  }, [companyId]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => () => { requestRef.current += 1; window.clearTimeout(copyTimer.current); }, []);

  const ask = (e: MouseEvent<HTMLButtonElement>, next: Confirming) => {
    openerRef.current = e.currentTarget;
    setFeedback(null);
    setConfirming(next);
  };

  const copy = async (name: string) => {
    const ok = await copyText(name);
    window.clearTimeout(copyTimer.current);
    setCopied({ name, state: ok ? 'copied' : 'failed' });
    setAnnounce(copyAnnouncement(name, ok));
    copyTimer.current = window.setTimeout(() => setCopied(null), COPIED_MS);
  };

  /* Fin d'un masquage : message, relecture, puis focus sur le titre (la ligne retiree n'existe plus). */
  const settle = async (target: string, message: ListFeedback, reload: boolean) => {
    if (companyRef.current !== target) return;
    setWorking(false);
    setConfirming(null);
    setFeedback(message);
    setAnnounce(message.text);
    if (!reload) return;
    await load();
    if (companyRef.current === target) headingRef.current?.focus();
  };

  const hideOne = async (name: string) => {
    const target = companyId;
    setWorking(true);
    setFeedback(null);
    let outcome: HideOutcome = 'error';
    try {
      outcome = toHideOutcome(await hideRegisteredDomain(target, name));
    } catch {
      outcome = 'error';
    }
    await settle(target, hideMessage(outcome, name), outcome !== 'error' && outcome !== 'forbidden');
  };

  const hideAll = async () => {
    const target = companyId;
    setWorking(true);
    setFeedback(null);
    let outcome: HideAllOutcome = 'error';
    try {
      outcome = toHideAllOutcome(await hideAllRegisteredDomains(target));
    } catch {
      outcome = 'error';
    }
    await settle(target, hideAllMessage(outcome), typeof outcome === 'number');
  };

  if (rows === null) {
    // Premier chargement : rien a l'ecran (la section n'existe peut-etre pas). Seul l'echec est montre.
    if (!loadFailed) return null;
    return (
      <section className="rounded-2xl p-5 sm:p-6" style={cardStyle(t)} data-testid="site-domain-list" data-list-state="error">
        <h3 className="text-base sm:text-sm font-bold" style={{ color: t.heading.primary }}>Mes domaines enregistrés</h3>
        <ReloadNotice t={t} text="Impossible d'afficher vos domaines pour le moment." loading={loading} onRetry={() => void load()} />
      </section>
    );
  }

  const list = parseRegisteredDomains(rows, current);
  // Aucun domaine enregistre : la section n'apparait pas (sauf juste apres « Tout supprimer », pour le message).
  if (list.length === 0 && !feedback) return null;

  const hideable = hideableCount(list);
  const allConfirm = hideAllConfirm(list);
  // Une confirmation dont la cible a disparu (ou n'est plus retirable) est simplement ignoree : rien ne reste bloque.
  const open = confirming?.kind === 'all'
    ? (hideable > 0 ? confirming : null)
    : confirming && list.some(d => d.name === confirming.name && d.canHide) ? confirming : null;

  return (
    <section className="rounded-2xl p-5 sm:p-6" style={cardStyle(t)} aria-labelledby={titleId} data-testid="site-domain-list" data-list-state="ready">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 id={titleId} ref={headingRef} tabIndex={-1} className="text-base sm:text-sm font-bold outline-none" style={{ color: t.heading.primary }}>
          Mes domaines enregistrés
        </h3>
        {list.length > 0 && (
          <button type="button" onClick={e => ask(e, { kind: 'all' })}
            disabled={working || hideable === 0 || open !== null} data-testid="site-domain-list-hide-all"
            title={hideable === 0 ? 'Un domaine en service reste toujours affiché.' : undefined}
            className={`${BUTTON_BASE} w-full sm:w-auto`} style={secondaryButtonStyle(t)}>
            <ListX className="w-4 h-4" aria-hidden="true" /> Tout supprimer
          </button>
        )}
      </div>

      {open?.kind === 'all' && (
        <ConfirmBox t={t} title={allConfirm.title} text={allConfirm.text} confirmLabel={allConfirm.confirm} cancelLabel={allConfirm.cancel}
          working={working} returnTo={openerRef} onCancel={() => setConfirming(null)} onConfirm={() => void hideAll()} />
      )}

      {loadFailed && <ReloadNotice t={t} text="La liste n'a pas pu être mise à jour." loading={loading} onRetry={() => void load()} />}

      {list.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {list.map(d => {
            const copyState = copied?.name === d.name ? copied.state : 'idle';
            const one = hideConfirm(d.name);
            return (
              <li key={d.name} data-testid="site-domain-list-item" data-domain={d.name} data-active={d.active ? 'true' : 'false'}
                className="rounded-xl px-3 py-3 sm:px-4" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                    <Globe className="w-4 h-4 flex-shrink-0" style={{ color: SITE_ACCENT }} aria-hidden="true" />
                    <span className="text-[15px] sm:text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: t.text.primary }}>{d.name}</span>
                    {d.badge && (
                      <StatusPill t={t} tone={d.badge.tone} label={d.badge.label}
                        icon={d.active ? <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" /> : undefined} />
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0">
                    <button type="button" onClick={() => void copy(d.name)} aria-label={`${copyLabel(copyState)} ${d.name}`}
                      data-testid="site-domain-list-copy" className={`${BUTTON_BASE} flex-1 sm:flex-none`} style={secondaryButtonStyle(t)}>
                      {copyState === 'copied' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                      {copyLabel(copyState)}
                    </button>
                    {d.canHide && (
                      <button type="button" onClick={e => ask(e, { kind: 'one', name: d.name })}
                        disabled={working || open !== null} aria-label={`Supprimer ${d.name} de la liste`} data-testid="site-domain-list-hide"
                        className={`${BUTTON_BASE} flex-1 sm:flex-none`} style={{ ...secondaryButtonStyle(t), color: t.danger.text }}>
                        <Trash2 className="w-4 h-4" aria-hidden="true" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
                {open?.kind === 'one' && open.name === d.name && (
                  <ConfirmBox t={t} title={one.title} text={one.text} confirmLabel={one.confirm} cancelLabel={one.cancel}
                    working={working} returnTo={openerRef} onCancel={() => setConfirming(null)} onConfirm={() => void hideOne(d.name)} />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm sm:text-xs leading-relaxed" style={{ color: t.text.secondary }}>
          La liste est vide. Un domaine enregistré à nouveau y reviendra automatiquement.
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">{working ? 'Mise à jour de la liste…' : announce}</p>

      {feedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3" style={toneStyle(t, feedback.tone)} data-testid="site-domain-list-result">
          {feedback.tone === 'danger'
            ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
            : <Check className="w-4 h-4 flex-shrink-0 mt-px" strokeWidth={3} aria-hidden="true" />}
          <p className="min-w-0 text-sm sm:text-xs leading-relaxed [overflow-wrap:anywhere]">{feedback.text}</p>
        </div>
      )}
    </section>
  );
}

/* Lecture ratee : message discret et « Reessayer » (desactive, avec indicateur, pendant la nouvelle tentative). */
function ReloadNotice({ t, text, loading, onRetry }: { t: ThemeTokens; text: string; loading: boolean; onRetry: () => void }) {
  return (
    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="site-domain-list-reload">
      <p className="text-sm sm:text-xs flex-1" style={{ color: t.text.secondary }}>{text}</p>
      <button type="button" onClick={onRetry} disabled={loading} className={`${BUTTON_BASE} w-full sm:w-auto`}
        style={secondaryButtonStyle(t)} data-testid="site-domain-list-retry">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Réessayer
      </button>
    </div>
  );
}

/* Confirmation en ligne : « Annuler » d'abord, Echap ferme, le focus revient ensuite au bouton d'origine. */
function ConfirmBox({ t, title, text, confirmLabel, cancelLabel, working, returnTo, onCancel, onConfirm }: {
  t: ThemeTokens; title: string; text: string; confirmLabel: string; cancelLabel: string;
  working: boolean; returnTo: RefObject<HTMLElement | null>; onCancel: () => void; onConfirm: () => void;
}) {
  const id = useId();
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const opener = returnTo.current;
    confirmRef.current?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [returnTo]);
  return (
    <div className="mt-3 rounded-2xl p-4" style={toneStyle(t, 'warning')} role="alertdialog" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`} data-testid="site-domain-list-confirm"
      onKeyDown={e => { if (e.key === 'Escape' && !working) onCancel(); }}>
      <p id={`${id}-title`} className="text-base sm:text-sm font-bold [overflow-wrap:anywhere]">{title}</p>
      <p id={`${id}-text`} className="mt-1.5 flex items-start gap-2 text-sm sm:text-xs leading-relaxed opacity-95">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />{text}
      </p>
      <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2.5">
        <button type="button" onClick={onCancel} disabled={working} className={`${BUTTON_BASE} w-full sm:w-auto`}
          style={secondaryButtonStyle(t)} data-testid="site-domain-list-confirm-no">
          {cancelLabel}
        </button>
        <button type="button" ref={confirmRef} onClick={onConfirm} disabled={working} className={`${BUTTON_BASE} w-full sm:w-auto`}
          style={PRIMARY_BUTTON_STYLE} data-testid="site-domain-list-confirm-yes">
          {working && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
