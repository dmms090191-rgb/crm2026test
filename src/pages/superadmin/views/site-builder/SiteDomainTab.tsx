import { useState } from 'react';
import { Globe, ExternalLink, ShieldCheck, AlertCircle, Clock, Settings2, Link2, CheckCircle2, Info, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import { callManageDomain, VERCEL_DNS_RECORDS } from '../sites/domainTypes';
import CopyButton from '../../../../components/CopyButton';
import { formatRelativeTime } from '../../../../lib/formatRelativeTime';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  verified: { label: 'Verifie', color: '#16a34a', bg: 'rgba(22,163,106,0.08)', border: 'rgba(22,163,106,0.15)' },
  error: { label: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
};

const DNS_RECORDS = VERCEL_DNS_RECORDS;

interface Props {
  page: CompanyHomePage | null;
  onOpenDomainManager: () => void;
  ownerType?: 'super_admin' | 'admin_company';
  onPageRefresh?: () => void;
}

export default function SiteDomainTab({ page, onOpenDomainManager, ownerType = 'super_admin', onPageRefresh }: Props) {
  const t = useThemeTokens();
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = ownerType === 'admin_company';

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
  const domainUrl = hasDomain && page.domain_verified ? `https://${page.custom_domain}` : null;
  const publicUrl = page.slug ? `${window.location.origin}/site/${page.slug}` : null;

  async function handleVerify() {
    if (!page?.custom_domain) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await callManageDomain('verify', page.custom_domain, page.id);
      if (res.error) {
        setVerifyMsg({ type: 'error', text: res.error });
      } else if (res.verified) {
        setVerifyMsg({ type: 'success', text: 'Domaine verifie avec succes !' });
        onPageRefresh?.();
      } else {
        setVerifyMsg({ type: 'error', text: 'DNS pas encore propage. Reessayez dans quelques minutes.' });
      }
    } catch (e) {
      setVerifyMsg({ type: 'error', text: String(e) });
    } finally {
      setVerifying(false);
      setTimeout(() => setVerifyMsg(null), 4000);
    }
  }

  return (
    <div className="space-y-4">
      {/* Internal link card */}
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

      {/* Domain configuration card */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 0 16px rgba(14,165,233,0.3)' }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Domaine personnalise</h3>
            <p className="text-[10px]" style={{ color: t.text.quaternary }}>
              {isAdmin ? 'Gere par votre Super Admin' : 'Optionnel - connectez un domaine plus tard'}
            </p>
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
              <span className="text-xs" style={{ color: t.text.tertiary }}>
                {isAdmin ? 'Aucun domaine attribue' : 'Aucun domaine configure'}
              </span>
            )}
          </div>

          {hasDomain && page.domain_provider && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Fournisseur</span>
              <span className="text-xs font-medium capitalize" style={{ color: t.text.secondary }}>
                {page.domain_provider}
              </span>
            </div>
          )}

          {hasDomain && page.last_domain_check_at && (
            <div className="flex items-center justify-between gap-2">
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
      </div>

      {/* DNS instructions for admin when pending */}
      {isAdmin && isPending && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
            Configuration DNS requise
          </p>
          <div className="space-y-2">
            {DNS_RECORDS.map(r => (
              <div key={r.name} className="rounded-lg px-3 py-2.5" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
                <p className="text-[10px] mb-1.5" style={{ color: t.text.tertiary }}>{r.desc}</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Type</span>
                    <span style={{ color: t.text.primary }}>{r.type}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="min-w-0">
                      <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Nom</span>
                      <span className="font-mono" style={{ color: t.text.primary }}>{r.name}</span>
                    </div>
                    <CopyButton value={r.name} label="Copier le nom" />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="min-w-0 overflow-hidden">
                      <span className="block text-[9px] uppercase font-bold" style={{ color: t.text.quaternary }}>Valeur</span>
                      <span className="font-mono truncate block" style={{ color: t.text.primary }}>{r.value}</span>
                    </div>
                    <CopyButton value={r.value} label="Copier la valeur" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: t.text.tertiary }}>
            La propagation DNS peut prendre jusqu'a 48h.
          </p>
        </div>
      )}

      {/* Verify feedback */}
      {verifyMsg && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{
          background: verifyMsg.type === 'success' ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
          color: verifyMsg.type === 'success' ? '#16a34a' : '#f87171',
        }}>{verifyMsg.text}</p>
      )}

      {/* Admin: verify / re-verify button */}
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
              Votre site fonctionne avec un lien interne Talvex, meme sans domaine personnalise.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
              {isAdmin
                ? 'Le domaine est gere par votre Super Admin. Contactez-le pour tout changement.'
                : 'Quand un domaine sera connecte, il pointera vers ce site deja enregistre. Le contenu et le template resteront les memes.'}
            </p>
          </div>
        </div>
      </div>

      {/* Super Admin: manage button */}
      {!isAdmin && (
        <button
          onClick={onOpenDomainManager}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            color: '#fff',
            boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
          }}
        >
          <Settings2 className="w-4 h-4" />
          Gerer les domaines
        </button>
      )}
    </div>
  );
}
