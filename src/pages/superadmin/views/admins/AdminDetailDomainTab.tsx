import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, ShieldCheck, Clock, AlertCircle, ExternalLink, RefreshCw, Trash2, Save, Loader2, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, type CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../../../superadmin/views/sites/domainTypes';
import { formatRelativeTime } from '../../../../lib/formatRelativeTime';
import AdminDomainDnsPanel from './AdminDomainDnsPanel';

const RECHECK_THRESHOLD_MS = 60 * 60 * 1000;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  pending: { label: 'En attente de verification', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  verified: { label: 'Verifie', color: '#16a34a', bg: 'rgba(22,163,106,0.08)', border: 'rgba(22,163,106,0.15)' },
  error: { label: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
};

interface Props {
  companyId: string;
  onUpdate: () => void;
}

export default function AdminDetailDomainTab({ companyId, onUpdate }: Props) {
  const t = useThemeTokens();
  const [page, setPage] = useState<CompanyHomePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoRechecking, setAutoRechecking] = useState(false);
  const autoRecheckDone = useRef(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getHomePageByCompanyId(companyId);
      setPage(p);
      setDomainInput(p?.custom_domain || '');
    } catch {
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadPage(); }, [loadPage]);

  useEffect(() => {
    if (loading || autoRecheckDone.current || !page?.custom_domain) return;
    if (page.domain_status !== 'verified') return;
    const lastCheck = page.last_domain_check_at ? new Date(page.last_domain_check_at).getTime() : 0;
    if (Date.now() - lastCheck < RECHECK_THRESHOLD_MS) return;
    autoRecheckDone.current = true;
    setAutoRechecking(true);
    callManageDomain('verify', page.custom_domain, page.id)
      .then(res => {
        if (!res.verified) {
          setMessage({ type: 'error', text: 'Le domaine n\'est plus valide. Le DNS a peut-etre ete modifie.' });
          onUpdate();
        }
        return loadPage();
      })
      .catch(() => {})
      .finally(() => setAutoRechecking(false));
  }, [loading, page, loadPage, onUpdate]);

  const clearMsg = () => setTimeout(() => setMessage(null), 4000);

  function cleanDomain(raw: string): string {
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return d;
  }

  async function handleSave() {
    const domain = cleanDomain(domainInput);
    if (!domain) { setMessage({ type: 'error', text: 'Entrez un nom de domaine.' }); clearMsg(); return; }
    if (!page) { setMessage({ type: 'error', text: 'Aucun site trouve pour cette societe. Creez d\'abord un site.' }); clearMsg(); return; }

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
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: `Domaine ${domain} enregistre. Configurez le DNS chez Hostinger puis verifiez.` });
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
      if (res.error) {
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
    try {
      const res = await callManageDomain('remove', page.custom_domain, page.id);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Domaine retire.' });
        setDomainInput('');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#0ea5e9' }} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 px-2 text-center">
        <Globe className="w-8 h-8" style={{ color: t.text.quaternary }} />
        <p className="text-xs" style={{ color: t.text.tertiary }}>
          Aucun site pour cette societe. Creez d'abord un site via l'onglet "Site" avant d'attribuer un domaine.
        </p>
      </div>
    );
  }

  const status = STATUS_MAP[page.domain_status] ?? STATUS_MAP.not_configured;
  const hasDomain = !!page.custom_domain;
  const isVerified = page.domain_verified && page.domain_status === 'verified';
  const isPending = hasDomain && !isVerified;
  const domainUrl = isVerified ? `https://${page.custom_domain}` : null;
  const inputChanged = cleanDomain(domainInput) !== (page.custom_domain || '');

  return (
    <div className="space-y-4">
      {/* Domain input */}
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: t.modal.fieldLabel }}>
          Domaine de la societe
        </label>
        <input
          type="text"
          value={domainInput}
          onChange={e => setDomainInput(e.target.value)}
          placeholder="monsiteclient.fr"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
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

      {isPending && <AdminDomainDnsPanel />}

      {/* Feedback message */}
      {message && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{
          background: message.type === 'success' ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
          color: message.type === 'success' ? '#16a34a' : '#f87171',
        }}>{message.text}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {(inputChanged || !hasDomain) && (
          <button onClick={handleSave} disabled={saving || !domainInput.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: t.accent.solid, color: t.text.primary, boxShadow: `0 0 12px ${t.accent.border}` }}>
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
            {isVerified ? 'Re-verifier' : 'Verifier le domaine'}
          </button>
        )}
        {hasDomain && (
          <button onClick={handleRemove} disabled={removing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
            {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}
