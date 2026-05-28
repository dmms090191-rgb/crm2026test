import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, ShieldCheck, Clock, AlertCircle, ExternalLink,
  RefreshCw, Trash2, Save, Loader2, CheckCircle2, Link2, AlertTriangle, Info,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../sites/domainTypes';
import { ChecklistSection, DnsInstructions } from '../admins/DomainModalParts';
import CopyButton from '../../../../components/CopyButton';
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
  page: CompanyHomePage | null;
  onOpenDomainManager: () => void;
  ownerType?: 'super_admin' | 'admin_company';
  onPageRefresh?: () => void;
}

export default function SiteDomainTab({ page, ownerType = 'super_admin', onPageRefresh }: Props) {
  const t = useThemeTokens();
  const isAdmin = ownerType === 'admin_company';

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

  useEffect(() => {
    setDomainInput(page?.custom_domain || '');
    if (page?.domain_notes) {
      try {
        const notes = JSON.parse(page.domain_notes);
        if (notes.dns_config?.aRecord || notes.dns_config?.cnameRecord) {
          setDnsConfig(notes.dns_config);
        }
      } catch { /* legacy plain text */ }
    } else {
      setDnsConfig(null);
    }
  }, [page]);

  const runAutoRecheck = useCallback(async () => {
    if (autoRecheckDone.current || !page?.custom_domain || !page.id) return;
    if (page.domain_status !== 'verified') return;
    const lastCheck = page.last_domain_check_at ? new Date(page.last_domain_check_at).getTime() : 0;
    if (Date.now() - lastCheck < RECHECK_THRESHOLD_MS) return;
    autoRecheckDone.current = true;
    setAutoRechecking(true);
    try {
      const res = await callManageDomain('verify', page.custom_domain, page.id);
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (!res.verified) {
        setMessage({ type: 'error', text: 'Le domaine n\'est plus valide. Le DNS a peut-etre ete modifie.' });
      }
      onPageRefresh?.();
    } catch { /* silent */ }
    setAutoRechecking(false);
  }, [page, onPageRefresh]);

  useEffect(() => { runAutoRecheck(); }, [runAutoRecheck]);

  const clearMsg = () => setTimeout(() => setMessage(null), 5000);

  function cleanDomain(raw: string): string {
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return d;
  }

  async function handleSave() {
    const domain = cleanDomain(domainInput);
    if (!domain) { setMessage({ type: 'error', text: 'Entrez un nom de domaine.' }); clearMsg(); return; }
    if (!page) { setMessage({ type: 'error', text: 'Aucun site actif. Appliquez d\'abord un template.' }); clearMsg(); return; }
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
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else if (res.vercel_assigned === false) {
        setMessage({ type: 'error', text: 'Domaine enregistre mais non assigne au projet Vercel. Reessayez ou verifiez la configuration Vercel.' });
      } else {
        setMessage({ type: 'success', text: `Domaine ${domain} enregistre et assigne au projet Vercel. Configurez le DNS chez Hostinger puis verifiez.` });
      }
      onPageRefresh?.();
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
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (res.vercel_assigned === false) {
        setMessage({ type: 'error', text: 'Le domaine n\'a pas pu etre assigne au projet Vercel. Verifiez la configuration Vercel ou reessayez.' });
      } else if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else if (res.verified) {
        setMessage({ type: 'success', text: 'Domaine verifie avec succes !' });
      } else {
        setMessage({ type: 'error', text: 'DNS pas encore propage. Reessayez dans quelques minutes.' });
      }
      onPageRefresh?.();
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
        setDnsConfig(null);
        setMessage({ type: 'success', text: 'Domaine retire avec succes.' });
      }
      onPageRefresh?.();
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

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.2)',
            boxShadow: '0 0 24px rgba(14,165,233,0.1)',
          }}
        >
          <Globe className="w-7 h-7" style={{ color: '#0ea5e9' }} />
        </div>
        <p className="text-sm font-medium text-center max-w-xs" style={{ color: t.text.secondary }}>
          Aucun site actif
        </p>
        <p className="text-xs mt-2 text-center max-w-xs" style={{ color: t.text.tertiary }}>
          {isAdmin
            ? 'Aucun site configure. Contactez votre administrateur.'
            : 'Creez d\'abord un site en appliquant un template avant de configurer un domaine.'}
        </p>
      </div>
    );
  }

  const status = STATUS_MAP[page.domain_status] ?? STATUS_MAP.not_configured;
  const hasDomain = !!page.custom_domain;
  const isVerified = page.domain_verified && page.domain_status === 'verified';
  const isPending = hasDomain && !isVerified;
  const domainUrl = isVerified ? `https://${page.custom_domain}` : null;
  const publicUrl = page.slug ? `${window.location.origin}/site/${page.slug}` : null;
  const inputChanged = cleanDomain(domainInput) !== (page.custom_domain || '');

  let vercelAssigned = false;
  if (page.domain_notes) {
    try {
      const notes = JSON.parse(page.domain_notes);
      vercelAssigned = notes.vercel_assigned === true;
    } catch { /* legacy plain text notes */ }
  }

  return (
    <div className="space-y-4">
      {/* Internal link card */}
      <InternalLinkCard page={page} publicUrl={publicUrl} t={t} />

      {/* Domain input section */}
      {!isAdmin && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaine officiel Talvex</h3>
              <p className="text-[10px]" style={{ color: t.text.quaternary }}>Domaine de la plateforme - gere par le Super Admin</p>
            </div>
          </div>

          <div className="pt-2 space-y-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.text.quaternary }}>
                Domaine personnalise
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                placeholder="talvex.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.text.primary }}
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
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}
                    >
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

                {hasDomain && page.domain_provider && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Fournisseur</span>
                    <span className="text-xs font-medium capitalize" style={{ color: t.text.secondary }}>
                      {page.domain_provider}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Verified link */}
            {domainUrl && (
              <a href={domainUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(22,163,106,0.06)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}>
                <ExternalLink className="w-3.5 h-3.5" />
                {page.custom_domain}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Admin: read-only domain status */}
      {isAdmin && <AdminDomainStatusCard page={page} status={status} t={t} />}

      {/* Checklist */}
      {!isAdmin && (
        <ChecklistSection
          hasDomain={hasDomain}
          vercelAssigned={vercelAssigned}
          isVerified={!!isVerified}
          isPending={isPending}
          domainStatus={page.domain_status ?? 'not_configured'}
          t={t}
        />
      )}

      {/* DNS instructions when pending */}
      {isPending && <DnsInstructions t={t} dnsConfig={dnsConfig} />}

      {/* Feedback messages */}
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

      {/* Action buttons */}
      {!isAdmin && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(inputChanged || !hasDomain) && (
            <button onClick={handleSave} disabled={saving || !domainInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.3)' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer le domaine
            </button>
          )}
          {hasDomain && (
            <button onClick={handleVerify} disabled={verifying || autoRechecking}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
              style={{ background: 'rgba(22,163,106,0.08)', border: '1px solid rgba(22,163,106,0.15)', color: '#16a34a' }}>
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Tester l'acces
            </button>
          )}
          {hasDomain && (
            <button onClick={handleRemove} disabled={removing}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Retirer le domaine
            </button>
          )}
        </div>
      )}

      {/* Admin: verify button */}
      {isAdmin && hasDomain && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.01] disabled:opacity-50"
          style={isVerified
            ? { background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }
            : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }
          }
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isVerified ? 'Re-verifier le domaine' : 'Verifier maintenant'}
        </button>
      )}

      {/* Info card */}
      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} />
          <div className="space-y-1">
            <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>
              {isAdmin
                ? 'Le domaine est gere par votre Super Admin. Contactez-le pour tout changement.'
                : 'Ce domaine est le domaine officiel de la plateforme Talvex. Il est independant des domaines des societes clientes.'}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
              {isAdmin
                ? 'Votre site fonctionne avec un lien interne Talvex, meme sans domaine personnalise.'
                : 'Les DNS doivent etre configures chez votre registrar (Hostinger). Les valeurs sont fournies par Vercel apres l\'enregistrement du domaine.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InternalLinkCard({ page, publicUrl, t }: { page: CompanyHomePage; publicUrl: string | null; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 16px rgba(22,163,106,0.3)' }}>
          <Link2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Lien interne Talvex</h3>
          <p className="text-[10px]" style={{ color: t.text.quaternary }}>Accessible sans domaine personnalise</p>
        </div>
      </div>
      <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Site interne actif</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: page.is_active ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${page.is_active ? 'rgba(22,163,106,0.15)' : 'rgba(239,68,68,0.15)'}`,
              color: page.is_active ? '#16a34a' : '#ef4444',
            }}
          >
            {page.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {page.is_active ? 'Oui' : 'Non'}
          </span>
        </div>
        {page.slug && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Lien interne</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: t.text.secondary }}>/site/{page.slug}</span>
              <CopyButton value={`/site/${page.slug}`} />
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                  <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDomainStatusCard({ page, status, t }: { page: CompanyHomePage; status: { label: string; color: string; bg: string; border: string }; t: ReturnType<typeof useThemeTokens> }) {
  const hasDomain = !!page.custom_domain;
  const isVerified = page.domain_verified && page.domain_status === 'verified';
  const domainUrl = isVerified ? `https://${page.custom_domain}` : null;

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaine personnalise</h3>
          <p className="text-[10px]" style={{ color: t.text.quaternary }}>Gere par votre Super Admin</p>
        </div>
      </div>
      <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Statut</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}
          >
            {page.domain_status === 'verified' ? <ShieldCheck className="w-3 h-3" /> :
             page.domain_status === 'error' ? <AlertCircle className="w-3 h-3" /> :
             <Clock className="w-3 h-3" />}
            {status.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Domaine</span>
          {hasDomain ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: t.text.primary }}>{page.custom_domain}</span>
              {domainUrl && (
                <a href={domainUrl} target="_blank" rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                  <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                </a>
              )}
            </div>
          ) : (
            <span className="text-xs" style={{ color: t.text.tertiary }}>Aucun domaine attribue</span>
          )}
        </div>
      </div>
    </div>
  );
}
