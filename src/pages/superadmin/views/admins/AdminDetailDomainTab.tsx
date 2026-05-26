import { useState, useEffect, useCallback } from 'react';
import { Globe, Save, Loader2, Trash2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, type CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain } from '../../../superadmin/views/sites/domainTypes';
import DomainChecklist from '../../../../components/domain/DomainChecklist';

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
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  function cleanDomain(raw: string): string {
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return d;
  }

  async function handleSave() {
    const domain = cleanDomain(domainInput);
    if (!domain) { flash('error', 'Entrez un nom de domaine.'); return; }
    if (!page) { flash('error', 'Aucun site trouve pour cette societe. Creez d\'abord un site.'); return; }

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
        flash('error', res.error);
      } else {
        flash('success', `Domaine ${domain} enregistre et ajoute a Vercel.`);
        onUpdate();
      }
      await loadPage();
    } catch (e) {
      flash('error', String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!page?.custom_domain) return;
    setRemoving(true);
    setMessage(null);
    try {
      const res = await callManageDomain('remove', page.custom_domain, page.id);
      if (res.error) {
        flash('error', res.error);
      } else {
        flash('success', 'Domaine retire.');
        setDomainInput('');
        onUpdate();
      }
      await loadPage();
    } catch (e) {
      flash('error', String(e));
    } finally {
      setRemoving(false);
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

  const hasDomain = !!page.custom_domain;
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

      {/* Feedback message */}
      {message && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{
          background: message.type === 'success' ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
          color: message.type === 'success' ? '#16a34a' : '#f87171',
        }}>{message.text}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {(inputChanged || !hasDomain) && (
          <button onClick={handleSave} disabled={saving || !domainInput.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: t.accent.solid, color: t.text.primary, boxShadow: `0 0 12px ${t.accent.border}` }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Enregistrer
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

      {/* 5-step checklist */}
      {hasDomain && (
        <>
          <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: t.text.quaternary }}>
              Checklist domaine
            </p>
          </div>
          <DomainChecklist
            domain={page.custom_domain}
            domainStatus={page.domain_status as 'not_configured' | 'pending' | 'verified' | 'error'}
            domainVerified={page.domain_verified}
            domainNotes={page.domain_notes || null}
            pageId={page.id}
            onRefresh={loadPage}
          />
        </>
      )}
    </div>
  );
}
