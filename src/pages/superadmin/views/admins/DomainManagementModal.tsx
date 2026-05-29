import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Loader2, X, ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, type CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../sites/domainTypes';
import { NoSiteState, ChecklistSection, DnsInstructions, DomainLinkBlock, DomainActionButtons, DomainStatusBadge, FeedbackMessage, DOMAIN_DOMAIN_STATUS_MAP } from './DomainModalParts';
const RECHECK_THRESHOLD_MS = 60 * 60 * 1000;

interface Props {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onUpdate: () => void;
  onBack?: () => void;
}

export default function DomainManagementModal({ companyId, companyName, onClose, onUpdate, onBack }: Props) {
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
  const cleanDomain = (raw: string) => raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

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

  const status = DOMAIN_STATUS_MAP[page?.domain_status ?? 'not_configured'] ?? DOMAIN_STATUS_MAP.not_configured;
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
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: t.modal.title }}>Domaine de la societe</p>
            <p className="text-xs truncate" style={{ color: t.modal.subtitle }}>{companyName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
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

              {hasDomain && (
                <DomainStatusBadge
                  isVerified={!!isVerified} domainStatus={page.domain_status ?? 'not_configured'}
                  lastCheckAt={page.last_domain_check_at} autoRechecking={autoRechecking}
                  statusLabel={status.label} statusColor={status.color} statusBg={status.bg} statusBorder={status.border}
                  t={t}
                />
              )}

              <DomainLinkBlock domainUrl={domainUrl} customDomain={page.custom_domain ?? undefined} hasDomain={hasDomain} t={t} />

              {/* Checklist */}
              <ChecklistSection hasDomain={hasDomain} vercelAssigned={vercelAssigned} isVerified={!!isVerified} isPending={isPending} domainStatus={page?.domain_status ?? 'not_configured'} t={t} />

              {/* DNS instructions when pending */}
              {isPending && <DnsInstructions t={t} dnsConfig={dnsConfig} />}

              {message && <FeedbackMessage type={message.type} text={message.text} />}
              {testResult && <FeedbackMessage type={testResult.ok ? 'success' : 'error'} text={testResult.text} />}

              <DomainActionButtons
                inputChanged={inputChanged} hasDomain={hasDomain} isVerified={!!isVerified} domainInput={domainInput}
                saving={saving} verifying={verifying} removing={removing} testing={testing} autoRechecking={autoRechecking}
                onSave={handleSave} onVerify={handleVerify} onTest={handleTestAccess} onRemove={handleRemove} t={t}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
