import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, XCircle, RefreshCw, Settings2, Unlink, ExternalLink, Loader2, Globe, ShoppingCart } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { type CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';
import { type DomainOrder, callManageDomain, safeFixed } from './domainTypes';

interface Props {
  t: ReturnType<typeof useThemeTokens>;
  page: CompanyHomePageWithCompany;
  orders: DomainOrder[];
  onAction: () => void;
  onSwitchToBuy?: () => void;
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  verified: { label: 'Verifie', color: '#10b981', icon: CheckCircle2 },
  pending: { label: 'En attente', color: '#f59e0b', icon: Clock },
  purchasing: { label: 'Achat en cours', color: '#f59e0b', icon: Clock },
  completed: { label: 'Achete', color: '#10b981', icon: CheckCircle2 },
  failed: { label: 'Echec', color: '#ef4444', icon: XCircle },
  draft: { label: 'Brouillon', color: '#94a3b8', icon: Clock },
  error: { label: 'Erreur', color: '#ef4444', icon: XCircle },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SADomainsLinkedList({ t, page, orders, onAction, onSwitchToBuy }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const hasCurrentDomain = !!page.custom_domain && page.domain_status !== 'not_configured';
  const isEmpty = !hasCurrentDomain && orders.length === 0;

  const handleDomainAction = async (action: string, domain: string) => {
    setActionLoading(`${action}-${domain}`);
    setMsg('');
    try {
      const result = await callManageDomain(action, domain, page.id);
      if (result.error) {
        setMsg(result.error);
        setMsgType('error');
      } else {
        const labels: Record<string, string> = {
          verify: result.verified ? 'Domaine verifie.' : 'DNS non propage. Reessayez plus tard.',
          'check-config': result.misconfigured ? 'Configuration DNS incorrecte.' : 'Configuration DNS correcte.',
          remove: 'Domaine retire du projet.',
        };
        setMsg(labels[action] ?? 'Operation reussie.');
        setMsgType(result.verified === false || result.misconfigured ? 'error' : 'success');
        onAction();
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
      setMsgType('error');
    } finally {
      setActionLoading(null);
    }
  };

  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-14">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
          <Globe className="w-6 h-6" style={{ color: t.text.tertiary }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: t.text.secondary }}>Aucun domaine lie a cette societe</p>
        <p className="text-[11px] mt-1.5 max-w-xs mx-auto" style={{ color: t.text.tertiary }}>Achetez un domaine pour le lier a cette societe.</p>
        {onSwitchToBuy && (
          <button
            onClick={onSwitchToBuy}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#0ea5e9', boxShadow: '0 2px 10px rgba(14,165,233,0.3)' }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Acheter un domaine
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {msg && (
        <div className="px-3.5 py-2.5 rounded-xl text-[11px] font-medium" style={{
          background: msgType === 'success' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
          color: msgType === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${msgType === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}`,
        }}>
          {msg}
        </div>
      )}

      {hasCurrentDomain && (
        <ActiveDomainCard
          t={t} domain={page.custom_domain!} status={page.domain_status}
          type={page.domain_type ?? 'vercel'} date={page.last_domain_check_at ? formatDate(page.last_domain_check_at) : null}
          slug={page.slug} actionLoading={actionLoading}
          onVerify={() => handleDomainAction('verify', page.custom_domain!)}
          onCheckConfig={() => handleDomainAction('check-config', page.custom_domain!)}
          onRemove={() => handleDomainAction('remove', page.custom_domain!)}
        />
      )}

      {orders.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: t.text.tertiary }}>
            Historique des commandes
          </p>
          <div className="space-y-2">
            {orders.map(order => (
              <OrderCard key={order.id} t={t} order={order} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActiveDomainCard({ t, domain, status, type, date, slug, actionLoading, onVerify, onCheckConfig, onRemove }: {
  t: ReturnType<typeof useThemeTokens>; domain: string; status: string; type: string;
  date: string | null; slug: string | null; actionLoading: string | null;
  onVerify: () => void; onCheckConfig: () => void; onRemove: () => void;
}) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: t.surface.primary }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate" style={{ color: t.text.primary }}>{domain}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: t.card.bg, color: t.text.tertiary, border: `1px solid ${t.surface.borderLight}` }}>
              {type === 'talvex_managed' ? 'Talvex / Vercel' : 'Vercel'}
            </span>
            {date && <span className="text-[9px]" style={{ color: t.text.tertiary }}>{date}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
        <ActionBtn label="Verifier" icon={<RefreshCw className="w-3 h-3" />} color="#f59e0b"
          loading={actionLoading === `verify-${domain}`} disabled={!!actionLoading} onClick={onVerify} />
        <ActionBtn label="Config DNS" icon={<Settings2 className="w-3 h-3" />} color="#64748b"
          loading={actionLoading === `check-config-${domain}`} disabled={!!actionLoading} onClick={onCheckConfig} />
        <ActionBtn label="Retirer" icon={<Unlink className="w-3 h-3" />} color="#ef4444"
          loading={actionLoading === `remove-${domain}`} disabled={!!actionLoading} onClick={onRemove} />
        {slug && (
          <button
            onClick={() => window.open(`/site/${slug}`, '_blank')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold ml-auto transition-all hover:opacity-80"
            style={{ background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.15)' }}
          >
            <ExternalLink className="w-3 h-3" /> Voir la page
          </button>
        )}
      </div>
    </div>
  );
}

function OrderCard({ t, order }: { t: ReturnType<typeof useThemeTokens>; order: DomainOrder }) {
  const cfg = STATUS_CFG[order.vercel_order_status] ?? STATUS_CFG.draft;
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: t.surface.primary, border: `1px solid ${t.surface.borderLight}` }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}10` }}>
        <Icon className="w-3 h-3" style={{ color: cfg.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold truncate" style={{ color: t.text.primary }}>{order.domain_name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="text-[9px] tabular-nums" style={{ color: t.text.tertiary }}>
            {safeFixed(order.purchase_price)} {order.currency} / {order.years} an{order.years > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <span className="text-[9px] flex-shrink-0 tabular-nums" style={{ color: t.text.tertiary }}>
        {formatDate(order.created_at)}
      </span>
    </div>
  );
}

function ActionBtn({ label, icon, color, loading, disabled, onClick }: {
  label: string; icon: React.ReactNode; color: string; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40 hover:opacity-80"
      style={{ background: `${color}0a`, color, border: `1px solid ${color}20` }}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}
