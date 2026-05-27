import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe, ShieldCheck, Clock, AlertCircle, ExternalLink,
  RefreshCw, Trash2, Save, Loader2, X, CheckCircle2, Link2, AlertTriangle,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, type CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../sites/domainTypes';
import { NoSiteState, ChecklistSection, DnsInstructions } from './DomainModalParts';
import { formatRelativeTime } from '../../../../lib/formatRelativeTime';

const RECHECK_THRESHOLD_MS = 60 * 60 * 1000;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  pending:        { label: 'En attente de verification DNS', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  verified:       { label: 'Verifie et actif', color: '#16a34a', bg: 'rgba(22,163,106,0.08)', border: 'rgba(22,163,106,0.15)' },
  error:          { label: 'Erreur de verification', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
};

interface Props {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DomainManagementModal({ companyId, companyName, onClose, onUpdate }: Props) {
  const t = useThemeTokens();
  const [page, setPage] = useState<CompanyHomePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dnsConfig, setDnsConfig] = useState<{ aRecord: string; cnameRecord: string } | null>(null);
  const [autoRechecking, setAutoRechecking] = useState(false);
  const autoRecheckDone = useRef(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getHomePageByCompanyId(companyId);
      setPage(p);
      setDomainInput(p?.custom_domain || '');
      if (p?.domain_notes) {
        try {
          const notes = JSON.parse(p.domain_notes);
          if (notes.dns_config?.aRecord || notes.dns_config?.cnameRecord) {
            setDnsConfig(notes.dns_config);
            console.log('[DomainModal] dns_config from domain_notes:', notes.dns_config);
          }
        } catch { /* legacy plain text */ }
      } else {
        setDnsConfig(null);
      }
    } catch {
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadPage(); }, [loadPage]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (loading || autoRecheckDone.current || !page?.custom_domain) return;
    if (page.domain_status !== 'verified') return;
    const lastCheck = page.last_domain_check_at ? new Date(page.last_domain_check_at).getTime() : 0;
    if (Date.now() - lastCheck < RECHECK_THRESHOLD_MS) return;
    autoRecheckDone.current = true;
    setAutoRechecking(true);
    callManageDomain('verify', page.custom_domain, page.id)
      .then(res => {
        if (res.dns_config) setDnsConfig(res.dns_config);
        if (!res.verified) {
          setMessage({ type: 'error', text: 'Le domaine n\'est plus valide. Le DNS a peut-etre ete modifie.' });
          onUpdate();
        }
        return loadPage();
      })
      .catch(() => {})
      .finally(() => setAutoRechecking(false));
  }, [loading, page, loadPage, onUpdate]);

  const clearMsg = () => setTimeout(() => setMessage(null), 5000);

  function cleanDomain(raw: string): string {
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return d;
  }

  async function handleSave() {
    const domain = cleanDomain(domainInput);
    if (!domain) { setMessage({ type: 'error', text: 'Entrez un nom de domaine.' }); clearMsg(); return; }
    if (!page) { setMessage({ type: 'error', text: 'Aucun site pour cette societe. Creez d\'abord un site.' }); clearMsg(); return; }
    setSaving(true);
    setMessage(null);
    try {
      if (page.custom_domain && page.custom_domain !== domain) {
        await callManageDomain('remove', page.custom_domain, page.id);
      }
      const res = await callManageDomain('add', domain, page.id, {
        domain_provider: 'hostinger',
        domain_type: 'external_connected',
      });
      console.log('[DomainModal] add response dns_config:', res.dns_config);
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else if (res.vercel_assigned === false) {
        setMessage({ type: 'error', text: `Domaine enregistre mais non assigne au projet Vercel. Reessayez ou verifiez la configuration Vercel.` });
      } else {
        setMessage({ type: 'success', text: `Domaine ${domain} enregistre et assigne au projet Vercel. Configurez le DNS chez Hostinger puis verifiez.` });
        onUpdate();
      }
      await loadPage();
    } catch (e) {
      setMessage({ type: 'error', text: String(e) });
    } finally {
      setSaving(false);
      clearMsg();
    }
  }

  async function handleVerify() {
    if (!page?.custom_domain) return;
    setVerifying(true);
    setMessage(null);
    try {
      const res = await callManageDomain('verify', page.custom_domain, page.id);
      console.log('[DomainModal] verify response dns_config:', res.dns_config);
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (res.vercel_assigned === false) {
        setMessage({ type: 'error', text: 'Le domaine n\'a pas pu etre assigne au projet Vercel. Verifiez la configuration Vercel ou reessayez.' });
      } else if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else if (res.verified) {
        setMessage({ type: 'success', text: 'Domaine verifie avec succes !' });
        onUpdate();
      } else {
        setMessage({ type: 'error', text: 'DNS pas encore propage. Reessayez dans quelques minutes.' });
      }
      await loadPage();
    } catch (e) {
      setMessage({ type: 'error', text: String(e) });
    } finally {
      setVerifying(false);
      clearMsg();
    }
  }

  async function handleRemove() {
    if (!page?.custom_domain) return;
    setRemoving(true);
    setMessage(null);
    setTestResult(null);
    try {
      const res = await callManageDomain('remove', page.custom_domain, page.id);
      if (res.error && !res.success) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setDomainInput('');
        setMessage({ type: 'success', text: 'Domaine retire avec succes.' });
        onUpdate();
      }
      await loadPage();
    } catch (e) {
      setMessage({ type: 'error', text: String(e) });
    } finally {
      setRemoving(false);
      clearMsg();
    }
  }

  async function handleTestAccess() {
    if (!page?.custom_domain || !page.domain_verified) return;
    setTesting(true);
    setTestResult(null);
    try {
      const url = `https://${page.custom_domain}`;
      const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      void res;
      setTestResult({ ok: true, text: 'Le site repond correctement.' });
    } catch {
      setTestResult({ ok: false, text: 'Impossible d\'atteindre le site. Verifiez le DNS.' });
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  }

  const status = STATUS_MAP[page?.domain_status ?? 'not_configured'] ?? STATUS_MAP.not_configured;
  const hasDomain = !!page?.custom_domain;
  const isVerified = page?.domain_verified && page?.domain_status === 'verified';
  const isPending = hasDomain && !isVerified;
  const domainUrl = isVerified ? `https://${page?.custom_domain}` : null;
  const inputChanged = cleanDomain(domainInput) !== (page?.custom_domain || '');

  let vercelAssigned = false;
  if (page?.domain_notes) {
    try {
      const notes = JSON.parse(page.domain_notes);
      vercelAssigned = notes.vercel_assigned === true;
    } catch { /* legacy plain text notes */ }
  }

  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        zIndex: 99999, background: t.modal.overlayBg,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: t.modal.title }}>Domaine de la societe</p>
            <p className="text-xs truncate" style={{ color: t.modal.subtitle }}>{companyName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#0ea5e9' }} />
            </div>
          ) : !page ? (
            <NoSiteState t={t} />
          ) : (
            <>
              {/* Domain input */}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>
                  Domaine personnalise
                </label>
                <input
                  type="text" value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  placeholder="monsiteclient.fr"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                  style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                />
              </div>

              {/* Status badge */}
              {hasDomain && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Statut</span>
                    <div className="flex items-center gap-2">
                      {autoRechecking && <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#0ea5e9' }} />}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>
                        {isVerified ? <ShieldCheck className="w-3 h-3" /> : page.domain_status === 'error' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {page.last_domain_check_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Derniere verification</span>
                      <span className="text-[11px]" style={{
                        color: (Date.now() - new Date(page.last_domain_check_at).getTime() > STALE_THRESHOLD_MS) ? '#f59e0b' : t.text.tertiary,
                      }}>
                        {(Date.now() - new Date(page.last_domain_check_at).getTime() > STALE_THRESHOLD_MS) && (
                          <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#f59e0b' }} />
                        )}
                        {formatRelativeTime(page.last_domain_check_at)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Verified link + site info */}
              {domainUrl && (
                <a href={domainUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(22,163,106,0.06)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {page.custom_domain}
                </a>
              )}

              {/* Internal link */}
              {page.slug && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                    <span className="text-xs font-mono" style={{ color: t.text.secondary }}>/site/{page.slug}</span>
                  </div>
                  <a href={`${window.location.origin}/site/${page.slug}`} target="_blank" rel="noopener noreferrer"
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                    <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                  </a>
                </div>
              )}

              {/* Checklist */}
              <ChecklistSection hasDomain={hasDomain} vercelAssigned={vercelAssigned} isVerified={!!isVerified} isPending={isPending} domainStatus={page?.domain_status ?? 'not_configured'} t={t} />

              {/* DNS instructions when pending */}
              {isPending && <DnsInstructions t={t} dnsConfig={dnsConfig} />}

              {/* Feedback */}
              {message && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{
                  background: message.type === 'success' ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
                  color: message.type === 'success' ? '#16a34a' : '#f87171',
                }}>{message.text}</p>
              )}
              {testResult && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{
                  background: testResult.ok ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
                  color: testResult.ok ? '#16a34a' : '#f87171',
                }}>{testResult.text}</p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(inputChanged || !hasDomain) && (
                  <button onClick={handleSave} disabled={saving || !domainInput.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: t.accent.solid, color: '#fff', boxShadow: `0 0 12px ${t.accent.border}` }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Enregistrer
                  </button>
                )}
                {hasDomain && (
                  <button onClick={handleVerify} disabled={verifying || autoRechecking}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={isVerified
                      ? { background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }
                      : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }
                    }>
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {isVerified ? 'Re-verifier' : 'Verifier maintenant'}
                  </button>
                )}
                {isVerified && (
                  <button onClick={handleTestAccess} disabled={testing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(22,163,106,0.08)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}>
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Tester l'acces
                  </button>
                )}
                {hasDomain && (
                  <button onClick={handleRemove} disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Retirer le domaine
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
