import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, upsertHomePage } from '../../../../lib/companyHomePages';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../sites/domainTypes';
import DomainModalHeader from './DomainModalHeader';
import DomainModalBody from './DomainModalBody';

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
      let p = await getHomePageByCompanyId(companyId);
      if (!p) {
        p = await upsertHomePage({
          company_id: companyId,
          site_scope: 'company',
          title: companyName || '',
          subtitle: '',
          welcome_message: '',
          is_active: false,
        });
      }
      setPage(p);
      setDomainInput(p?.custom_domain || '');
      if (p?.domain_notes) {
        try {
          const notes = JSON.parse(p.domain_notes);
          if (notes.dns_config?.aRecord || notes.dns_config?.cnameRecord) {
            setDnsConfig(notes.dns_config);
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
  }, [companyId, companyName]);

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

  const inputChanged = cleanDomain(domainInput) !== (page?.custom_domain || '');

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
        <DomainModalHeader companyName={companyName} onClose={onClose} onBack={onBack} />
        <DomainModalBody
          loading={loading} page={page} domainInput={domainInput} setDomainInput={setDomainInput}
          saving={saving} verifying={verifying} removing={removing} testing={testing} autoRechecking={autoRechecking}
          message={message} testResult={testResult} dnsConfig={dnsConfig} inputChanged={inputChanged}
          onSave={handleSave} onVerify={handleVerify} onTest={handleTestAccess} onRemove={handleRemove}
        />
      </div>
    </div>,
    document.body
  );
}
