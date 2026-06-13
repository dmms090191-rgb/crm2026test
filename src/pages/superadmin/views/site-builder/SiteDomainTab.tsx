import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, RefreshCw, Loader2, Info } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../sites/domainTypes';
import { ChecklistSection, DnsInstructions } from '../admins/DomainModalParts';
import { STATUS_MAP, RECHECK_THRESHOLD_MS, cleanDomain } from './siteDomainConstants';
import SiteDomainInternalCard from './SiteDomainInternalCard';
import SiteDomainInputCard from './SiteDomainInputCard';
import SiteDomainAdminCard from './SiteDomainAdminCard';
import SiteDomainActions from './SiteDomainActions';

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
        if (notes.dns_config?.aRecord || notes.dns_config?.cnameRecord) { setDnsConfig(notes.dns_config); }
      } catch { /* legacy plain text */ }
    } else { setDnsConfig(null); }
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
      if (!res.verified) setMessage({ type: 'error', text: 'Le domaine n\'est plus valide. Le DNS a peut-etre ete modifie.' });
      onPageRefresh?.();
    } catch { /* silent */ }
    setAutoRechecking(false);
  }, [page, onPageRefresh]);

  useEffect(() => { runAutoRecheck(); }, [runAutoRecheck]);

  const clearMsg = () => setTimeout(() => setMessage(null), 5000);

  async function handleSave() {
    const domain = cleanDomain(domainInput);
    if (!domain) { setMessage({ type: 'error', text: 'Entrez un nom de domaine.' }); clearMsg(); return; }
    if (!page) { setMessage({ type: 'error', text: 'Aucun site actif. Appliquez d\'abord un template.' }); clearMsg(); return; }
    setSaving(true); setMessage(null);
    try {
      if (page.custom_domain && page.custom_domain !== domain) {
        await callManageDomain('remove', page.custom_domain, page.id);
      }
      const res = await callManageDomain('add', domain, page.id, { domain_provider: 'hostinger', domain_type: 'external_connected' });
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (res.error) setMessage({ type: 'error', text: res.error });
      else if (res.vercel_assigned === false) setMessage({ type: 'error', text: 'Domaine enregistre mais non assigne au projet Vercel. Reessayez ou verifiez la configuration Vercel.' });
      else setMessage({ type: 'success', text: `Domaine ${domain} enregistre et assigne au projet Vercel. Configurez le DNS chez Hostinger puis verifiez.` });
      onPageRefresh?.();
    } catch (e) { setMessage({ type: 'error', text: String(e) }); }
    finally { setSaving(false); clearMsg(); }
  }

  async function handleVerify() {
    if (!page?.custom_domain) return;
    setVerifying(true); setMessage(null);
    try {
      const res = await callManageDomain('verify', page.custom_domain, page.id);
      if (res.dns_config) setDnsConfig(res.dns_config);
      if (res.vercel_assigned === false) setMessage({ type: 'error', text: 'Le domaine n\'a pas pu etre assigne au projet Vercel.' });
      else if (res.error) setMessage({ type: 'error', text: res.error });
      else if (res.verified) setMessage({ type: 'success', text: 'Domaine verifie avec succes !' });
      else setMessage({ type: 'error', text: 'DNS pas encore propage. Reessayez dans quelques minutes.' });
      onPageRefresh?.();
    } catch (e) { setMessage({ type: 'error', text: String(e) }); }
    finally { setVerifying(false); clearMsg(); }
  }

  async function handleRemove() {
    if (!page?.custom_domain) return;
    setRemoving(true); setMessage(null); setTestResult(null);
    try {
      const res = await callManageDomain('remove', page.custom_domain, page.id);
      if (res.error && !res.success) setMessage({ type: 'error', text: res.error });
      else { setDomainInput(''); setDnsConfig(null); setMessage({ type: 'success', text: 'Domaine retire avec succes.' }); }
      onPageRefresh?.();
    } catch (e) { setMessage({ type: 'error', text: String(e) }); }
    finally { setRemoving(false); clearMsg(); }
  }

  async function handleTestAccess() {
    if (!page?.custom_domain || !page.domain_verified) return;
    setTesting(true); setTestResult(null);
    try {
      await fetch(`https://${page.custom_domain}`, { method: 'HEAD', mode: 'no-cors' });
      setTestResult({ ok: true, text: 'Le site repond correctement.' });
    } catch { setTestResult({ ok: false, text: 'Impossible d\'atteindre le site. Verifiez le DNS.' }); }
    finally { setTesting(false); setTimeout(() => setTestResult(null), 5000); }
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))', border: '1px solid rgba(14,165,233,0.2)', boxShadow: '0 0 24px rgba(14,165,233,0.1)' }}>
          <Globe className="w-7 h-7" style={{ color: '#0ea5e9' }} />
        </div>
        <p className="text-sm font-medium text-center max-w-xs" style={{ color: t.text.secondary }}>Aucun site actif</p>
        <p className="text-xs mt-2 text-center max-w-xs" style={{ color: t.text.tertiary }}>
          {isAdmin ? 'Aucun site configure. Contactez votre administrateur.' : 'Creez d\'abord un site en appliquant un template avant de configurer un domaine.'}
        </p>
      </div>
    );
  }

  const status = STATUS_MAP[page.domain_status] ?? STATUS_MAP.not_configured;
  const hasDomain = !!page.custom_domain;
  const isVerified = !!(page.domain_verified && page.domain_status === 'verified');
  const isPending = hasDomain && !isVerified;
  const publicUrl = page.slug ? `${window.location.origin}/site/${page.slug}` : null;
  const inputChanged = cleanDomain(domainInput) !== (page.custom_domain || '');

  let vercelAssigned = false;
  if (page.domain_notes) {
    try { vercelAssigned = JSON.parse(page.domain_notes).vercel_assigned === true; } catch { /* legacy */ }
  }

  return (
    <div className="space-y-4">
      <SiteDomainInternalCard page={page} publicUrl={publicUrl} />

      {!isAdmin && (
        <SiteDomainInputCard page={page} domainInput={domainInput} setDomainInput={setDomainInput}
          onSave={handleSave} autoRechecking={autoRechecking} status={status} />
      )}

      {isAdmin && <SiteDomainAdminCard page={page} status={status} />}

      {!isAdmin && (
        <ChecklistSection hasDomain={hasDomain} vercelAssigned={vercelAssigned} isVerified={isVerified}
          isPending={isPending} domainStatus={page.domain_status ?? 'not_configured'} t={t} />
      )}

      {isPending && <DnsInstructions t={t} dnsConfig={dnsConfig} />}

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

      {!isAdmin && (
        <SiteDomainActions hasDomain={hasDomain} isVerified={isVerified} inputChanged={inputChanged}
          domainInput={domainInput} saving={saving} verifying={verifying} testing={testing} removing={removing}
          autoRechecking={autoRechecking} onSave={handleSave} onVerify={handleVerify} onTestAccess={handleTestAccess} onRemove={handleRemove} />
      )}

      {isAdmin && hasDomain && (
        <button onClick={handleVerify} disabled={verifying}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.01] disabled:opacity-50"
          style={isVerified
            ? { background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }
            : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }
          }>
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isVerified ? 'Re-verifier le domaine' : 'Verifier maintenant'}
        </button>
      )}

      <div className="rounded-xl px-4 py-3" style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      }}>
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} />
          <div className="space-y-1">
            <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>
              {isAdmin ? 'Le domaine est gere par votre Super Admin. Contactez-le pour tout changement.'
                : 'Ce domaine est le domaine officiel de la plateforme Talvex. Il est independant des domaines des societes clientes.'}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
              {isAdmin ? 'Votre site fonctionne avec un lien interne Talvex, meme sans domaine personnalise.'
                : 'Les DNS doivent etre configures chez votre registrar (Hostinger). Les valeurs sont fournies par Vercel apres l\'enregistrement du domaine.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
