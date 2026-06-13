import { useState } from 'react';
import { ShieldPlus, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useSuperAdminsData } from './useSuperAdminsData';
import SASuperAdminsTable from './SASuperAdminsTable';
import SASuperAdminMobileCard from './SASuperAdminMobileCard';
import SASuperAdminCreateModal from './SASuperAdminCreateModal';
import SASuperAdminActionsModal from './SASuperAdminActionsModal';
import DomainManagementModal from '../admins/DomainManagementModal';
import SiteManagerModal from '../site-builder/SiteManagerModal';
import type { CompanySuperAdmin } from './superAdminTypes';

interface Props {
  onConnectAsCompanySuperAdmin?: (sa: CompanySuperAdmin) => void;
}

export default function SASuperAdmins({ onConnectAsCompanySuperAdmin }: Props) {
  const t = useThemeTokens();
  const { list, loading, error, refresh } = useSuperAdminsData();
  const [showCreate, setShowCreate] = useState(false);
  const [actionsSa, setActionsSa] = useState<CompanySuperAdmin | null>(null);
  const [domainSa, setDomainSa] = useState<CompanySuperAdmin | null>(null);
  const [siteSa, setSiteSa] = useState<CompanySuperAdmin | null>(null);

  const handleConnect = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    onConnectAsCompanySuperAdmin?.(sa);
  };

  const handleDomain = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    setDomainSa(sa);
  };

  const handleSite = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    setSiteSa(sa);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: t.text.primary }}>
            Liste Super Admins
          </h1>
          {list.length > 0 && (
            <span className="flex-shrink-0 min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              {list.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={refresh} disabled={loading} className="p-2 rounded-lg transition-colors" style={{ background: t.surface.hover, color: t.text.tertiary }} title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <ShieldPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Creer un Super Admin</span>
            <span className="sm:hidden">Creer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {loading && list.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: t.text.tertiary }} />
        </div>
      ) : list.length === 0 && !error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <Users className="w-8 h-8" style={{ color: '#f59e0b' }} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold" style={{ color: t.text.primary }}>Aucun Super Admin</h2>
              <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
                Les Super Admins sont des comptes de niveau superieur, chacun rattache a sa propre societe. Creez-en un pour commencer.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              <ShieldPlus className="w-4 h-4" />
              Creer un Super Admin
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto">
            <SASuperAdminsTable list={list} tokens={t} onActions={setActionsSa} />
          </div>
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
            {list.map(sa => (
              <SASuperAdminMobileCard key={sa.id} sa={sa} tokens={t} onActions={setActionsSa} />
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <SASuperAdminCreateModal
          tokens={t}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh(); }}
        />
      )}

      {actionsSa && (
        <SASuperAdminActionsModal
          sa={actionsSa}
          tokens={t}
          onClose={() => setActionsSa(null)}
          onConnect={handleConnect}
          onDomain={handleDomain}
          onSite={handleSite}
        />
      )}

      {domainSa && (
        <DomainManagementModal
          companyId={domainSa.company_id}
          companyName={domainSa.company}
          onClose={() => setDomainSa(null)}
          onUpdate={refresh}
          onBack={() => { setDomainSa(null); setActionsSa(domainSa); }}
        />
      )}

      {siteSa && (
        <SiteManagerModal
          ownerType="admin_company"
          title={`Site de ${siteSa.company || [siteSa.first_name, siteSa.last_name].filter(Boolean).join(' ')}`}
          subtitle={`Gestion du site pour la societe ${siteSa.company || siteSa.email}`}
          companyId={siteSa.company_id}
          hideDomainTab
          onClose={() => setSiteSa(null)}
          onBack={() => { setSiteSa(null); setActionsSa(siteSa); }}
        />
      )}
    </div>
  );
}
